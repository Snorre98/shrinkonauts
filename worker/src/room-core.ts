import {
  HEARTBEAT_SECONDS,
  MAX_CONTROLLER_MESSAGE_BYTES,
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

export interface RoomSocketMetadata {
  deviceId: string;
  expiresAt: number;
  slot: PlayerSlot | null;
}

export interface HostAttachment {
  role: "host";
  hello: boolean;
  phoneSlots: PlayerSlot[];
  protocol: number;
  buildId: string;
  sessionId: string;
  deviceId: string;
  expiresAt: number;
  messages: number;
  joins: number;
  slotDevices: Partial<Record<PlayerSlot, string>>;
  blockedDevices: string[];
  rateStartedAt: number;
  rateCount: number;
  helloAt: number | null;
}

export interface ControllerAttachment {
  role: "controller";
  slot: PlayerSlot | null;
  deviceId: string;
  ready: boolean;
  connectedAt: number;
  helloAt: number | null;
  readyAt: number | null;
  rateStartedAt: number;
  rateCount: number;
}

export type ConnectionAttachment = HostAttachment | ControllerAttachment;

export interface RoomSocket {
  readonly metadata: RoomSocketMetadata;
  getAttachment(): unknown;
  setAttachment(value: ConnectionAttachment): void;
  send(message: ServerMessage): void;
  close(code?: number, reason?: string): void;
}

export interface RoomCoreOptions {
  room?: string;
  now?: () => number;
  newSessionId?: () => string;
  maxMessagesPerRoom?: number;
  maxControllerMessagesPerSecond?: number;
  maxHostMessagesPerSecond?: number;
  maxJoinsPerRoom?: number;
  handshakeTimeoutMs?: number;
  readyTimeoutMs?: number;
  allowHostDeviceAsController?: boolean;
  onRoomEnd?: (reason: string, expiresAt: number | null) => void;
}

export type RoomConnectionDecision =
  | { ok: true }
  | {
      ok: false;
      code: ErrorCode;
      message: string;
      status: number;
    };

const DEFAULT_MAX_MESSAGES_PER_ROOM = 12_000;
const DEFAULT_MAX_CONTROLLER_MESSAGES_PER_SECOND = 20;
const DEFAULT_MAX_HOST_MESSAGES_PER_SECOND = 60;
const DEFAULT_MAX_JOINS_PER_ROOM = 20;
const DEFAULT_HANDSHAKE_TIMEOUT_MS = 10_000;
const DEFAULT_READY_TIMEOUT_MS = 15_000;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isFiniteNonNegative(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0;
}

function isNullableFinite(value: unknown): value is number | null {
  return value === null || isFiniteNonNegative(value);
}

function isSlotDevices(
  value: unknown,
): value is Partial<Record<PlayerSlot, string>> {
  if (!isRecord(value)) return false;
  for (const [key, deviceId] of Object.entries(value)) {
    if (key !== "p1" && key !== "p2") return false;
    if (typeof deviceId !== "string" || deviceId.length === 0) return false;
  }
  return true;
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
  if (
    typeof value.buildId !== "string" ||
    typeof value.sessionId !== "string" ||
    typeof value.deviceId !== "string"
  ) {
    return false;
  }
  if (!isFiniteNonNegative(value.expiresAt)) return false;
  if (!isFiniteNonNegative(value.messages)) return false;
  if (!isFiniteNonNegative(value.joins)) return false;
  if (!isSlotDevices(value.slotDevices)) return false;
  if (
    !Array.isArray(value.blockedDevices) ||
    !value.blockedDevices.every((entry) => typeof entry === "string")
  ) {
    return false;
  }
  if (!isFiniteNonNegative(value.rateStartedAt)) return false;
  if (!isFiniteNonNegative(value.rateCount)) return false;
  return isNullableFinite(value.helloAt);
}

function isControllerAttachment(
  value: unknown,
): value is ControllerAttachment {
  if (!isRecord(value) || value.role !== "controller") return false;
  if (value.slot !== null && !isPlayerSlot(value.slot)) return false;
  if (typeof value.deviceId !== "string") return false;
  if (typeof value.ready !== "boolean") return false;
  if (!isFiniteNonNegative(value.connectedAt)) return false;
  if (!isNullableFinite(value.helloAt)) return false;
  if (!isNullableFinite(value.readyAt)) return false;
  if (!isFiniteNonNegative(value.rateStartedAt)) return false;
  return isFiniteNonNegative(value.rateCount);
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
  deviceId: "",
  expiresAt: 0,
  messages: 0,
  joins: 0,
  slotDevices: {},
  blockedDevices: [],
  rateStartedAt: 0,
  rateCount: 0,
  helloAt: null,
};

const EMPTY_CONTROLLER_ATTACHMENT: ControllerAttachment = {
  role: "controller",
  slot: null,
  deviceId: "",
  ready: false,
  connectedAt: 0,
  helloAt: null,
  readyAt: null,
  rateStartedAt: 0,
  rateCount: 0,
};

/**
 * Membership and relay rules for one controller room.
 *
 * The Durable Object wrapper owns Cloudflare sockets. This core only sees the
 * socket port, so it can be rebuilt from serialized attachments after
 * hibernation and tested without Workers or WebSocket globals.
 *
 * Admission is deliberately decided before the wrapper accepts a WebSocket:
 * the host plus at most two controllers is a three-socket room, and a
 * controller slot is bound to one server-issued device identity for the whole
 * session.
 */
export class RoomCore {
  private host: RoomSocket | null = null;
  private readonly controllers = new Set<RoomSocket>();
  private room: string;
  private ended = false;
  private readonly now: () => number;
  private readonly newSessionId: () => string;
  private readonly maxMessagesPerRoom: number;
  private readonly maxControllerMessagesPerSecond: number;
  private readonly maxHostMessagesPerSecond: number;
  private readonly maxJoinsPerRoom: number;
  private readonly handshakeTimeoutMs: number;
  private readonly readyTimeoutMs: number;
  private readonly allowHostDeviceAsController: boolean;
  private readonly onRoomEnd?: (
    reason: string,
    expiresAt: number | null,
  ) => void;

  constructor(options: RoomCoreOptions = {}) {
    this.now = options.now ?? Date.now;
    this.newSessionId = options.newSessionId ?? (() => crypto.randomUUID());
    this.maxMessagesPerRoom =
      options.maxMessagesPerRoom ?? DEFAULT_MAX_MESSAGES_PER_ROOM;
    this.maxControllerMessagesPerSecond =
      options.maxControllerMessagesPerSecond ??
      DEFAULT_MAX_CONTROLLER_MESSAGES_PER_SECOND;
    this.maxHostMessagesPerSecond =
      options.maxHostMessagesPerSecond ?? DEFAULT_MAX_HOST_MESSAGES_PER_SECOND;
    this.maxJoinsPerRoom =
      options.maxJoinsPerRoom ?? DEFAULT_MAX_JOINS_PER_ROOM;
    this.handshakeTimeoutMs =
      options.handshakeTimeoutMs ?? DEFAULT_HANDSHAKE_TIMEOUT_MS;
    this.readyTimeoutMs = options.readyTimeoutMs ?? DEFAULT_READY_TIMEOUT_MS;
    this.allowHostDeviceAsController =
      options.allowHostDeviceAsController ?? false;
    this.onRoomEnd = options.onRoomEnd;
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

  get hostReady(): boolean {
    return this.hostAttachment()?.hello === true;
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

  /**
   * Pure admission check. The wrapper calls this before accepting a socket so
   * rejected joins never receive a 101 upgrade.
   */
  canConnect(
    role: RoomSocketRole,
    metadata: RoomSocketMetadata,
  ): RoomConnectionDecision {
    const now = this.now();
    if (!metadata.deviceId) {
      return {
        ok: false,
        code: "DEVICE_REJECTED",
        message: "A device identity is required.",
        status: 401,
      };
    }
    if (!Number.isFinite(metadata.expiresAt) || metadata.expiresAt <= now) {
      return {
        ok: false,
        code: "SESSION_EXPIRED",
        message: "This demo session has expired.",
        status: 410,
      };
    }

    if (role === "host") {
      if (this.host) {
        return {
          ok: false,
          code: "ROOM_FULL",
          message: "Host slot is already occupied",
          status: 409,
        };
      }
      return { ok: true };
    }

    const host = this.hostAttachment();
    if (!this.host) {
      return {
        ok: false,
        code: "SLOT_UNAVAILABLE",
        message: "Host is not connected",
        status: 409,
      };
    }
    if (!host?.hello) {
      return {
        ok: false,
        code: "SLOT_UNAVAILABLE",
        message: "The host has not opened a controller room",
        status: 409,
      };
    }
    const slot = metadata.slot;
    if (!slot) {
      return {
        ok: false,
        code: "PROTOCOL_ERROR",
        message: "A controller slot is required",
        status: 400,
      };
    }
    if (this.controllers.size >= 2) {
      return {
        ok: false,
        code: "ROOM_FULL",
        message: "Both controller slots are occupied",
        status: 409,
      };
    }
    if (!host.phoneSlots.includes(slot)) {
      return {
        ok: false,
        code: "SLOT_UNAVAILABLE",
        message: "The requested controller slot is not open",
        status: 409,
      };
    }
    if (this.controllerForSlot(slot)) {
      return {
        ok: false,
        code: "SLOT_UNAVAILABLE",
        message: "The requested controller slot is already bound",
        status: 409,
      };
    }
    const boundDevice = host.slotDevices[slot];
    if (boundDevice && boundDevice !== metadata.deviceId) {
      return {
        ok: false,
        code: "SLOT_RESERVED",
        message: "This controller slot is reserved for another device",
        status: 409,
      };
    }
    if (
      !this.allowHostDeviceAsController &&
      host.deviceId === metadata.deviceId
    ) {
      return {
        ok: false,
        code: "DEVICE_REJECTED",
        message: "The host screen cannot also be a controller",
        status: 403,
      };
    }
    if (host.blockedDevices.includes(metadata.deviceId)) {
      return {
        ok: false,
        code: "DEVICE_REJECTED",
        message: "This device was removed from the session",
        status: 403,
      };
    }
    if (this.deviceReservedInOtherSlot(host, slot, metadata.deviceId)) {
      return {
        ok: false,
        code: "DEVICE_REJECTED",
        message: "This device is already bound to the other slot",
        status: 403,
      };
    }
    if (this.deviceInOtherSlot(slot, metadata.deviceId)) {
      return {
        ok: false,
        code: "DEVICE_REJECTED",
        message: "This device is already bound to the other slot",
        status: 403,
      };
    }
    if (host.joins >= this.maxJoinsPerRoom) {
      return {
        ok: false,
        code: "ROOM_FULL",
        message: "The join limit for this session has been reached",
        status: 429,
      };
    }
    return { ok: true };
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
      this.ended = false;
      return;
    }

    if (
      this.controllers.size >= 2 ||
      attachment.slot === null ||
      this.controllerForSlot(attachment.slot) !== null ||
      this.deviceInOtherSlot(attachment.slot, attachment.deviceId)
    ) {
      this.reject(socket, "ROOM_FULL", "Controller slot is already occupied");
      return;
    }
    this.controllers.add(socket);
  }

  onConnect(socket: RoomSocket, role: RoomSocketRole): boolean {
    const decision = this.canConnect(role, socket.metadata);
    if (!decision.ok) {
      this.reject(socket, decision.code, decision.message);
      return false;
    }

    if (role === "host") {
      this.host = socket;
      this.ended = false;
      this.setAttachment(socket, {
        ...EMPTY_HOST_ATTACHMENT,
        deviceId: socket.metadata.deviceId,
        expiresAt: socket.metadata.expiresAt,
      });
      return true;
    }

    const host = this.hostAttachment();
    const slot = socket.metadata.slot;
    if (!host || !slot) {
      this.reject(
        socket,
        "SLOT_UNAVAILABLE",
        "The host is not ready for this controller",
      );
      return false;
    }

    this.setAttachment(this.host!, {
      ...host,
      joins: host.joins + 1,
      slotDevices: {
        ...host.slotDevices,
        [slot]: socket.metadata.deviceId,
      },
    });
    this.controllers.add(socket);
    this.setAttachment(socket, {
      ...EMPTY_CONTROLLER_ATTACHMENT,
      slot,
      deviceId: socket.metadata.deviceId,
      connectedAt: this.now(),
    });
    this.notifyRoomState();
    return true;
  }

  onMessage(socket: RoomSocket, raw: string): void {
    if (this.ended) return;
    if (!this.consumeRoomMessage()) return;

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
      const host = this.hostAttachment();
      if (!host) {
        this.reject(socket, "PROTOCOL_ERROR", "Host attachment is missing");
        return;
      }
      const limited = this.allowHostMessage(socket, host);
      if (!limited) return;
      this.handleHost(socket, limited, decoded.value);
      return;
    }

    if (!isControllerClientMessage(decoded.value)) {
      this.reject(socket, "BAD_MESSAGE", "Expected a controller message");
      return;
    }
    const limited = this.allowControllerMessage(socket, attachment);
    if (!limited) return;
    this.handleController(socket, limited, decoded.value);
  }

  onClose(socket: RoomSocket): void {
    if (socket === this.host) {
      this.endRoom("host-left");
      return;
    }

    if (this.controllers.delete(socket)) {
      this.notifyRoomState();
    }
  }

  /**
   * Close sockets whose handshake or ready phase timed out, or end the room
   * when the wall-clock session limit is reached.
   */
  onAlarm(now = this.now()): void {
    if (this.ended) return;
    const host = this.hostAttachment();
    if (!host) return;
    if (host.expiresAt <= now) {
      this.endRoom("demo-time-limit");
      return;
    }

    for (const controller of [...this.controllers]) {
      const attachment = this.attachment(controller);
      if (attachment?.role !== "controller") continue;
      if (
        attachment.helloAt === null &&
        attachment.connectedAt + this.handshakeTimeoutMs <= now
      ) {
        this.closeController(controller, "join-timeout");
        continue;
      }
      if (
        attachment.helloAt !== null &&
        attachment.readyAt === null &&
        attachment.helloAt + this.readyTimeoutMs <= now
      ) {
        this.closeController(controller, "ready-timeout");
      }
    }
  }

  /** The next DO alarm deadline, or null when nothing is pending. */
  nextAlarmAt(now = this.now()): number | null {
    if (this.ended) return null;
    const host = this.hostAttachment();
    if (!host) return null;
    const deadlines: number[] = [host.expiresAt];
    for (const controller of this.controllers) {
      const attachment = this.attachment(controller);
      if (attachment?.role !== "controller") continue;
      if (attachment.helloAt === null) {
        deadlines.push(attachment.connectedAt + this.handshakeTimeoutMs);
      } else if (attachment.readyAt === null) {
        deadlines.push(attachment.helloAt + this.readyTimeoutMs);
      }
    }
    const future = deadlines.filter((deadline) => deadline > now);
    return future.length > 0 ? Math.min(...future) : null;
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
          ...attachment,
          hello: true,
          phoneSlots: [...message.phoneSlots],
          protocol: message.protocol,
          buildId: message.buildId,
          sessionId: this.newSessionId(),
          helloAt: this.now(),
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
        const controller = this.controllerForSlot(message.slot);
        const controllerAttachment = controller
          ? this.attachment(controller)
          : null;
        const deviceId =
          controllerAttachment?.role === "controller"
            ? controllerAttachment.deviceId
            : attachment.slotDevices[message.slot];
        const slotDevices = { ...attachment.slotDevices };
        delete slotDevices[message.slot];
        const blockedDevices =
          deviceId && !attachment.blockedDevices.includes(deviceId)
            ? [...attachment.blockedDevices, deviceId]
            : attachment.blockedDevices;
        this.setAttachment(socket, {
          ...attachment,
          phoneSlots: attachment.phoneSlots.filter(
            (slot) => slot !== message.slot,
          ),
          slotDevices,
          blockedDevices,
        });
        if (controller) {
          this.closeController(controller, "slot-closed");
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
        if (attachment.helloAt !== null) {
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
        if (
          !attachment.slot ||
          !host.phoneSlots.includes(attachment.slot)
        ) {
          this.reject(
            socket,
            "SLOT_UNAVAILABLE",
            "The requested controller slot is not open",
          );
          return;
        }
        if (message.slot !== attachment.slot) {
          this.reject(
            socket,
            "PROTOCOL_ERROR",
            "Controller slot does not match the admitted connection",
          );
          return;
        }
        if (host.slotDevices[attachment.slot] !== attachment.deviceId) {
          this.reject(
            socket,
            "DEVICE_REJECTED",
            "This device is not bound to the requested slot",
          );
          return;
        }

        this.setAttachment(socket, {
          ...attachment,
          helloAt: this.now(),
        });
        this.send(socket, {
          v: PROTOCOL_VERSION,
          t: "welcome",
          sessionId: host.sessionId,
          slot: attachment.slot,
          heartbeatSeconds: HEARTBEAT_SECONDS,
        });
        this.notifyRoomState();
        return;
      }

      case "ready": {
        if (attachment.slot === null || attachment.helloAt === null) {
          this.reject(
            socket,
            "PROTOCOL_ERROR",
            "Controller hello is required before ready",
          );
          return;
        }
        this.setAttachment(socket, {
          ...attachment,
          ready: true,
          readyAt: this.now(),
        });
        this.notifyRoomState();
        return;
      }

      case "input": {
        if (
          attachment.slot === null ||
          attachment.helloAt === null ||
          !attachment.ready
        ) {
          this.reject(
            socket,
            "BAD_MESSAGE",
            "Controller input requires a ready, bound slot",
          );
          return;
        }
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
        if (attachment.slot === null || attachment.helloAt === null) {
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

  private consumeRoomMessage(): boolean {
    const host = this.hostAttachment();
    if (!host) return true;
    if (host.messages >= this.maxMessagesPerRoom) {
      this.endRoom("demo-message-limit");
      return false;
    }
    this.setAttachment(this.host!, {
      ...host,
      messages: host.messages + 1,
    });
    return true;
  }

  private allowHostMessage(
    socket: RoomSocket,
    attachment: HostAttachment,
  ): HostAttachment | null {
    const now = this.now();
    let startedAt = attachment.rateStartedAt;
    let count = attachment.rateCount;
    if (now < startedAt || now - startedAt >= 1000) {
      startedAt = now;
      count = 0;
    }
    if (count >= this.maxHostMessagesPerSecond) {
      this.reject(socket, "BAD_MESSAGE", "Host message rate limit exceeded");
      return null;
    }
    const next = {
      ...attachment,
      rateStartedAt: startedAt,
      rateCount: count + 1,
    };
    this.setAttachment(socket, next);
    return next;
  }

  private allowControllerMessage(
    socket: RoomSocket,
    attachment: ControllerAttachment,
  ): ControllerAttachment | null {
    const now = this.now();
    let startedAt = attachment.rateStartedAt;
    let count = attachment.rateCount;
    if (now < startedAt || now - startedAt >= 1000) {
      startedAt = now;
      count = 0;
    }
    if (count >= this.maxControllerMessagesPerSecond) {
      this.reject(
        socket,
        "BAD_MESSAGE",
        "Controller message rate limit exceeded",
      );
      return null;
    }
    const next = {
      ...attachment,
      rateStartedAt: startedAt,
      rateCount: count + 1,
    };
    this.setAttachment(socket, next);
    return next;
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

  private closeController(socket: RoomSocket, reason: string): void {
    this.send(socket, {
      v: PROTOCOL_VERSION,
      t: "session-end",
      reason,
    });
    socket.close(1000, reason);
    if (this.controllers.delete(socket)) this.notifyRoomState();
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
    if (this.ended) return;
    this.ended = true;
    const hostAttachment = this.hostAttachment();
    const expiresAt =
      hostAttachment && hostAttachment.expiresAt > 0
        ? hostAttachment.expiresAt
        : null;
    this.endControllers(reason);
    const host = this.host;
    this.host = null;
    host?.close(1000, reason);
    this.onRoomEnd?.(reason, expiresAt);
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
      this.send(socket, {
        v: PROTOCOL_VERSION,
        t: "error",
        code,
        message,
      });
      this.endRoom("host-left");
      return;
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

  private deviceInOtherSlot(slot: PlayerSlot, deviceId: string): boolean {
    for (const controller of this.controllers) {
      const attachment = this.attachment(controller);
      if (
        attachment?.role === "controller" &&
        attachment.slot !== slot &&
        attachment.deviceId === deviceId
      ) {
        return true;
      }
    }
    return false;
  }

  private deviceReservedInOtherSlot(
    host: HostAttachment,
    slot: PlayerSlot,
    deviceId: string,
  ): boolean {
    return Object.entries(host.slotDevices).some(
      ([otherSlot, otherDevice]) =>
        otherSlot !== slot && otherDevice === deviceId,
    );
  }
}
