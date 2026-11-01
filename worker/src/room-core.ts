import {
  HEARTBEAT_SECONDS,
  MAX_CONTROLLER_MESSAGE_BYTES,
  MAX_INPUT_MESSAGES_PER_SECOND,
  PROTOCOL_VERSION,
  decodeMessage,
  isControllerClientMessage,
  isHostClientMessage,
  isPlayerSlot,
  type ControllerClientMessage,
  type ControllerServerMessage,
  type ErrorCode,
  type HostClientMessage,
  type HostServerMessage,
  type PlayerSlot,
  type ProtocolError,
  type ServerMessage,
} from "../../src/net/protocol";
import { normalizeRoomCode } from "../../src/net/room-code";

export type RoomSocketRole = "host" | "controller";

export interface HostAttachment {
  role: "host";
  hello: boolean;
  phoneSlots: PlayerSlot[];
  protocol: number;
  buildId: string;
  sessionId: string;
}

export interface ControllerAttachment {
  role: "controller";
  slot: PlayerSlot | null;
  ready: boolean;
  rateStartedAt: number;
  rateCount: number;
}

export type ConnectionAttachment = HostAttachment | ControllerAttachment;

export interface RoomSocket {
  getAttachment(): unknown;
  setAttachment(value: ConnectionAttachment): void;
  send(message: ServerMessage): void;
  close(code?: number, reason?: string): void;
}

export interface RoomCoreOptions {
  room?: string;
  now?: () => number;
  newSessionId?: () => string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isHostAttachment(value: unknown): value is HostAttachment {
  if (!isRecord(value) || value.role !== "host") return false;
  if (typeof value.hello !== "boolean") return false;
  if (!Array.isArray(value.phoneSlots)) return false;
  if (!value.phoneSlots.every(isPlayerSlot)) return false;
  if (new Set(value.phoneSlots).size !== value.phoneSlots.length) return false;
  if (
    !Number.isInteger(value.protocol) ||
    (value.protocol as number) < 0
  ) {
    return false;
  }
  return (
    typeof value.buildId === "string" &&
    typeof value.sessionId === "string"
  );
}

function isControllerAttachment(
  value: unknown,
): value is ControllerAttachment {
  if (!isRecord(value) || value.role !== "controller") return false;
  if (value.slot !== null && !isPlayerSlot(value.slot)) return false;
  if (typeof value.ready !== "boolean") return false;
  if (
    typeof value.rateStartedAt !== "number" ||
    !Number.isFinite(value.rateStartedAt) ||
    value.rateStartedAt < 0
  ) {
    return false;
  }
  return Number.isInteger(value.rateCount) && (value.rateCount as number) >= 0;
}

function isAttachment(value: unknown): value is ConnectionAttachment {
  return isHostAttachment(value) || isControllerAttachment(value);
}

const EMPTY_HOST_ATTACHMENT: HostAttachment = {
  role: "host",
  hello: false,
  phoneSlots: [],
  protocol: 0,
  buildId: "",
  sessionId: "",
};

const EMPTY_CONTROLLER_ATTACHMENT: ControllerAttachment = {
  role: "controller",
  slot: null,
  ready: false,
  rateStartedAt: 0,
  rateCount: 0,
};

/**
 * Membership and relay rules for one controller room.
 *
 * The Durable Object wrapper owns Cloudflare sockets. This core only sees the
 * socket port, so it can be rebuilt from serialized attachments after
 * hibernation and tested without Workers or WebSocket globals.
 */
export class RoomCore {
  private host: RoomSocket | null = null;
  private readonly controllers = new Set<RoomSocket>();
  private room: string;
  private readonly now: () => number;
  private readonly newSessionId: () => string;

  constructor(options: RoomCoreOptions = {}) {
    this.now = options.now ?? Date.now;
    this.newSessionId = options.newSessionId ?? (() => crypto.randomUUID());
    if (options.room !== undefined) {
      const room = normalizeRoomCode(options.room);
      if (!room.ok) throw new Error(room.error.message);
      this.room = room.value;
    } else {
      this.room = "";
    }
  }

  get roomCode(): string {
    return this.room;
  }

  get hasHost(): boolean {
    return this.host !== null;
  }

  get controllerCount(): number {
    return this.controllers.size;
  }

  setRoom(room: string): boolean {
    const normalized = normalizeRoomCode(room);
    if (!normalized.ok) return false;
    this.room = normalized.value;
    return true;
  }

  restore(socket: RoomSocket): void {
    const attachment = this.attachment(socket);
    if (!attachment) {
      this.reject(
        socket,
        "PROTOCOL_ERROR",
        "Socket has no valid room attachment",
      );
      return;
    }

    if (attachment.role === "host") {
      if (this.host) {
        this.reject(socket, "ROOM_FULL", "Host slot is already occupied");
        return;
      }
      this.host = socket;
      return;
    }

    if (
      this.controllers.size >= 2 ||
      (attachment.slot !== null &&
        this.controllerForSlot(attachment.slot) !== null)
    ) {
      this.reject(socket, "ROOM_FULL", "Controller slot is already occupied");
      return;
    }
    this.controllers.add(socket);
  }

  onConnect(socket: RoomSocket, role: RoomSocketRole): boolean {
    if (role === "host") {
      if (this.host) {
        this.reject(socket, "ROOM_FULL", "Host slot is already occupied");
        return false;
      }
      this.host = socket;
      this.setAttachment(socket, { ...EMPTY_HOST_ATTACHMENT });
      return true;
    }

    if (!this.host) {
      this.reject(
        socket,
        "SLOT_UNAVAILABLE",
        "The host is not connected",
      );
      return false;
    }
    if (!this.hostAttachment()?.hello) {
      this.reject(
        socket,
        "SLOT_UNAVAILABLE",
        "The host has not opened a controller room",
      );
      return false;
    }
    if (this.controllers.size >= 2) {
      this.reject(socket, "ROOM_FULL", "Both controller slots are occupied");
      return false;
    }
    this.controllers.add(socket);
    this.setAttachment(socket, { ...EMPTY_CONTROLLER_ATTACHMENT });
    return true;
  }

  onMessage(socket: RoomSocket, raw: string): void {
    const decoded = decodeMessage(raw, MAX_CONTROLLER_MESSAGE_BYTES);
    if (!decoded.ok) {
      this.rejectWith(socket, decoded.error);
      return;
    }

    const attachment = this.attachment(socket);
    if (!attachment) {
      this.reject(
        socket,
        "PROTOCOL_ERROR",
        "Socket has no valid room attachment",
      );
      return;
    }

    if (attachment.role === "host") {
      if (!isHostClientMessage(decoded.value)) {
        this.reject(socket, "BAD_MESSAGE", "Expected a host message");
        return;
      }
      this.handleHost(socket, attachment, decoded.value);
      return;
    }

    if (!isControllerClientMessage(decoded.value)) {
      this.reject(socket, "BAD_MESSAGE", "Expected a controller message");
      return;
    }
    this.handleController(socket, attachment, decoded.value);
  }

  onClose(socket: RoomSocket): void {
    if (socket === this.host) {
      this.host = null;
      this.endControllers("host-left");
      return;
    }

    if (this.controllers.delete(socket)) {
      this.notifyRoomState();
    }
  }

  private handleHost(
    socket: RoomSocket,
    attachment: HostAttachment,
    message: HostClientMessage,
  ): void {
    switch (message.t) {
      case "host-hello": {
        if (attachment.hello) {
          this.reject(
            socket,
            "PROTOCOL_ERROR",
            "Host hello has already been received",
          );
          return;
        }
        if (message.protocol !== PROTOCOL_VERSION) {
          this.reject(
            socket,
            "VERSION_MISMATCH",
            "Unsupported host protocol version",
          );
          return;
        }
        const room = normalizeRoomCode(message.room);
        if (!room.ok || (this.room && room.value !== this.room)) {
          this.reject(socket, "ROOM_INVALID", "Host room does not match");
          return;
        }
        this.room = room.value;
        this.setAttachment(socket, {
          role: "host",
          hello: true,
          phoneSlots: [...message.phoneSlots],
          protocol: message.protocol,
          buildId: message.buildId,
          sessionId: this.newSessionId(),
        });
        this.notifyRoomState();
        return;
      }

      case "close-slot": {
        if (!attachment.hello) {
          this.reject(
            socket,
            "PROTOCOL_ERROR",
            "Host hello is required before close-slot",
          );
          return;
        }
        if (!attachment.phoneSlots.includes(message.slot)) {
          return;
        }
        this.setAttachment(socket, {
          ...attachment,
          phoneSlots: attachment.phoneSlots.filter(
            (slot) => slot !== message.slot,
          ),
        });
        const controller = this.controllerForSlot(message.slot);
        if (controller) {
          this.send(controller, {
            v: PROTOCOL_VERSION,
            t: "session-end",
            reason: "slot-closed",
          });
          controller.close(1000, "slot-closed");
          this.controllers.delete(controller);
        }
        this.notifyRoomState();
        return;
      }

      case "pong": {
        const controller = this.controllerForSlot(message.slot);
        if (controller) {
          this.send(controller, {
            v: PROTOCOL_VERSION,
            t: "pong",
            t0: message.t0,
          });
        }
        return;
      }

      case "pause": {
        this.broadcastControllers({
          v: PROTOCOL_VERSION,
          t: "pause",
          reason: message.reason,
        });
        return;
      }

      case "resume": {
        this.broadcastControllers({
          v: PROTOCOL_VERSION,
          t: "resume",
          ...(message.reason !== undefined ? { reason: message.reason } : {}),
        });
        return;
      }

      case "session-end": {
        this.endRoom(message.reason);
        return;
      }
    }
  }

  private handleController(
    socket: RoomSocket,
    attachment: ControllerAttachment,
    message: ControllerClientMessage,
  ): void {
    if (!this.host) {
      this.reject(socket, "HOST_LEFT", "The host has left the session");
      return;
    }

    switch (message.t) {
      case "hello": {
        if (attachment.slot !== null) {
          this.reject(
            socket,
            "PROTOCOL_ERROR",
            "Controller hello has already been received",
          );
          return;
        }
        const host = this.hostAttachment();
        if (!host?.hello) {
          this.reject(
            socket,
            "SLOT_UNAVAILABLE",
            "The host has not opened a controller room",
          );
          return;
        }
        if (
          message.protocol !== host.protocol ||
          message.buildId !== host.buildId
        ) {
          this.reject(
            socket,
            "VERSION_MISMATCH",
            "Both players must use the same build",
          );
          return;
        }
        if (!host.phoneSlots.includes(message.slot)) {
          this.reject(
            socket,
            "SLOT_UNAVAILABLE",
            "The requested controller slot is not open",
          );
          return;
        }
        if (this.controllerForSlot(message.slot) !== null) {
          this.reject(
            socket,
            "SLOT_UNAVAILABLE",
            "The requested controller slot is already bound",
          );
          return;
        }

        this.setAttachment(socket, {
          ...attachment,
          slot: message.slot,
          ready: false,
          rateStartedAt: 0,
          rateCount: 0,
        });
        this.send(socket, {
          v: PROTOCOL_VERSION,
          t: "welcome",
          sessionId: host.sessionId,
          slot: message.slot,
          heartbeatSeconds: HEARTBEAT_SECONDS,
        });
        this.notifyRoomState();
        return;
      }

      case "ready": {
        if (attachment.slot === null) {
          this.reject(
            socket,
            "PROTOCOL_ERROR",
            "Controller hello is required before ready",
          );
          return;
        }
        this.setAttachment(socket, { ...attachment, ready: true });
        this.notifyRoomState();
        return;
      }

      case "input": {
        if (attachment.slot === null || !attachment.ready) {
          this.reject(
            socket,
            "BAD_MESSAGE",
            "Controller input requires a ready, bound slot",
          );
          return;
        }
        const now = this.now();
        let startedAt = attachment.rateStartedAt;
        let count = attachment.rateCount;
        if (now < startedAt || now - startedAt >= 1000) {
          startedAt = now;
          count = 0;
        }
        if (count >= MAX_INPUT_MESSAGES_PER_SECOND) {
          this.reject(
            socket,
            "BAD_MESSAGE",
            "Controller input rate limit exceeded",
          );
          return;
        }
        this.setAttachment(socket, {
          ...attachment,
          rateStartedAt: startedAt,
          rateCount: count + 1,
        });
        this.sendHost({
          v: PROTOCOL_VERSION,
          t: "input",
          slot: attachment.slot,
          seq: message.seq,
          input: message.input,
        });
        return;
      }

      case "ping": {
        if (attachment.slot === null) {
          this.reject(
            socket,
            "PROTOCOL_ERROR",
            "Controller hello is required before ping",
          );
          return;
        }
        this.sendHost({
          v: PROTOCOL_VERSION,
          t: "ping",
          slot: attachment.slot,
          t0: message.t0,
        });
        return;
      }
    }
  }

  private notifyRoomState(): void {
    const host = this.hostAttachment();
    if (!host?.hello || !this.host) return;
    const slots = host.phoneSlots.map((slot) => {
      const controller = this.controllerForSlot(slot);
      const attachment = controller
        ? this.attachment(controller)
        : null;
      return {
        slot,
        connected: controller !== null,
        ready:
          attachment?.role === "controller" ? attachment.ready : false,
      };
    });
    this.sendHost({ v: PROTOCOL_VERSION, t: "room-state", slots });
  }

  private endControllers(reason: string): void {
    const controllers = [...this.controllers];
    this.controllers.clear();
    for (const controller of controllers) {
      this.send(controller, {
        v: PROTOCOL_VERSION,
        t: "session-end",
        reason,
      });
      controller.close(1000, reason);
    }
  }

  private endRoom(reason: string): void {
    this.endControllers(reason);
    const host = this.host;
    this.host = null;
    host?.close(1000, reason);
  }

  private broadcastControllers(message: ControllerServerMessage): void {
    for (const controller of this.controllers) {
      this.send(controller, message);
    }
  }

  private sendHost(message: HostServerMessage): void {
    if (this.host) this.send(this.host, message);
  }

  private send(socket: RoomSocket, message: ServerMessage): void {
    try {
      socket.send(message);
    } catch {
      // The socket close handler performs the membership cleanup.
    }
  }

  private rejectWith(socket: RoomSocket, error: ProtocolError): void {
    this.reject(socket, error.code, error.message);
  }

  private reject(socket: RoomSocket, code: ErrorCode, message: string): void {
    const attachment = this.attachment(socket);
    if (attachment?.role === "controller") {
      if (this.controllers.delete(socket)) this.notifyRoomState();
    } else if (attachment?.role === "host" && socket === this.host) {
      this.host = null;
      this.endControllers("host-left");
    }
    this.send(socket, {
      v: PROTOCOL_VERSION,
      t: "error",
      code,
      message,
    });
    socket.close(1008, code);
  }

  private setAttachment(
    socket: RoomSocket,
    attachment: ConnectionAttachment,
  ): void {
    socket.setAttachment(attachment);
  }

  private attachment(socket: RoomSocket): ConnectionAttachment | null {
    const value = socket.getAttachment();
    return isAttachment(value) ? value : null;
  }

  private hostAttachment(): HostAttachment | null {
    if (!this.host) return null;
    const value = this.host.getAttachment();
    return isHostAttachment(value) ? value : null;
  }

  private controllerForSlot(slot: PlayerSlot): RoomSocket | null {
    for (const controller of this.controllers) {
      const attachment = this.attachment(controller);
      if (
        attachment?.role === "controller" &&
        attachment.slot === slot
      ) {
        return controller;
      }
    }
    return null;
  }
}
