import {
  PROTOCOL_VERSION,
  type ControllerClientMessage,
  type ControllerServerMessage,
  type ErrorCode,
  type NetInput,
  type PauseReason,
  type PlayerSlot,
  type ProtocolError,
} from "../net/protocol";
import { normalizeRoomCode } from "../net/room-code";
import type { RoomTransport } from "../net/transport";

export const RECONNECT_WINDOW_MS = 60_000;
export const RECONNECT_BASE_DELAY_MS = 500;
export const RECONNECT_MAX_DELAY_MS = 5_000;
export const PING_INTERVAL_MS = 5_000;
export const PING_TIMEOUT_MS = 10_000;

export type ControllerSessionState =
  | "idle"
  | "connecting"
  | "connected"
  | "ready"
  | "paused"
  | "reconnecting"
  | "ended"
  | "error";

export interface ControllerSessionView {
  state: ControllerSessionState;
  room: string;
  slot: PlayerSlot;
  pausedReason: PauseReason | null;
  reconnectAttempt: number;
  rttMs: number | null;
  endReason: string | null;
  error: ProtocolError | null;
}

export interface ControllerSessionOptions {
  room: string;
  slot: PlayerSlot;
  buildId: string;
  createTransport: () => RoomTransport<
    ControllerClientMessage,
    ControllerServerMessage
  >;
  now?: () => number;
  onChange?: (view: ControllerSessionView) => void;
}

const FATAL_ERRORS: ReadonlySet<ErrorCode> = new Set<ErrorCode>([
  "BAD_MESSAGE",
  "UNSUPPORTED_PROTOCOL",
  "UNKNOWN_TYPE",
  "VERSION_MISMATCH",
  "PROTOCOL_ERROR",
]);

/**
 * Controller-side connection state.
 *
 * The host is authoritative. This class only joins one slot, reports
 * connection state, sends input frames, and reconnects after an unexpected
 * close. It never receives or stores game state.
 */
export class ControllerSession {
  private readonly roomValue: string;
  private readonly slotValue: PlayerSlot;
  private readonly buildId: string;
  private readonly createTransport: ControllerSessionOptions["createTransport"];
  private readonly now: () => number;
  private readonly onChange?: (view: ControllerSessionView) => void;

  private transport: RoomTransport<
    ControllerClientMessage,
    ControllerServerMessage
  > | null = null;
  private unsubscribe: (() => void) | null = null;
  private sessionState: ControllerSessionState = "idle";
  private pausedReason: PauseReason | null = null;
  private endReason: string | null = null;
  private lastError: ProtocolError | null = null;
  private reconnectAttempt = 0;
  private firstDisconnectAt: number | null = null;
  private nextReconnectAt = 0;
  private rttMs: number | null = null;
  private pingSentAt: number | null = null;
  private lastPingAt = 0;
  private uiReady = false;
  private readySent = false;
  private sequence = 0;
  private clientTick = 0;
  private attempting = false;
  private destroyed = false;

  constructor(options: ControllerSessionOptions) {
    const room = normalizeRoomCode(options.room);
    if (!room.ok) throw new Error(room.error.message);
    if (options.buildId.trim().length === 0) {
      throw new Error("CONTROLLER_BUILD_ID: buildId must not be empty");
    }
    this.roomValue = room.value;
    this.slotValue = options.slot;
    this.buildId = options.buildId;
    this.createTransport = options.createTransport;
    this.now = options.now ?? (() => performance.now());
    this.onChange = options.onChange;
  }

  get room(): string {
    return this.roomValue;
  }

  get slot(): PlayerSlot {
    return this.slotValue;
  }

  get state(): ControllerSessionState {
    return this.sessionState;
  }

  get view(): ControllerSessionView {
    return {
      state: this.sessionState,
      room: this.roomValue,
      slot: this.slotValue,
      pausedReason: this.pausedReason,
      reconnectAttempt: this.reconnectAttempt,
      rttMs: this.rttMs,
      endReason: this.endReason,
      error: this.lastError ? { ...this.lastError } : null,
    };
  }

  async connect(): Promise<void> {
    if (this.destroyed) {
      throw new Error("CONTROLLER_CONNECT: session has been destroyed");
    }
    if (this.sessionState !== "idle") {
      throw new Error("CONTROLLER_CONNECT: session has already started");
    }
    this.sessionState = "connecting";
    this.notify();
    await this.openAttempt();
  }

  /** Called once the touch board is mounted and interactive. */
  markUiReady(): void {
    if (this.destroyed || this.uiReady) return;
    this.uiReady = true;
    if (this.sessionState === "connected") {
      this.sendReady();
    }
  }

  /**
   * Sends one input frame. Returns false when the session is not active or the
   * frame could not be written; the caller can keep its own pressed state.
   */
  sendInput(input: NetInput): boolean {
    if (this.destroyed || this.sessionState !== "ready") return false;
    const frame: NetInput = {
      intents: { ...input.intents },
      actions: {
        interact: input.actions.interact,
        scan: input.actions.scan,
        pulse: input.actions.pulse,
        carry: input.actions.carry,
        throw: input.actions.throw,
        ui: { ...input.actions.ui },
      },
      clientTick: this.clientTick,
    };
    const sent = this.send({
      v: PROTOCOL_VERSION,
      t: "input",
      seq: this.sequence,
      input: frame,
    });
    if (!sent) {
      this.handleTransportLoss(this.now());
      return false;
    }
    this.sequence += 1;
    this.clientTick += 1;
    return true;
  }

  /**
   * Drives reconnect backoff and RTT pings. The entry point calls this on a
   * short interval; it never advances gameplay state.
   */
  async tick(now = this.now()): Promise<void> {
    if (this.destroyed) return;

    if (this.sessionState === "reconnecting") {
      if (
        this.firstDisconnectAt !== null &&
        now - this.firstDisconnectAt >= RECONNECT_WINDOW_MS
      ) {
        this.finish("reconnect-timeout");
        return;
      }
      if (!this.attempting && now >= this.nextReconnectAt) {
        await this.attemptReconnect();
      }
      return;
    }

    if (
      this.transport &&
      this.transport.state === "closed" &&
      !this.attempting
    ) {
      this.handleTransportLoss(now);
      return;
    }

    if (
      this.pingSentAt !== null &&
      now - this.pingSentAt >= PING_TIMEOUT_MS
    ) {
      this.handleTransportLoss(now);
      return;
    }

    if (
      (this.sessionState === "ready" || this.sessionState === "paused") &&
      this.pingSentAt === null &&
      now - this.lastPingAt >= PING_INTERVAL_MS
    ) {
      this.lastPingAt = now;
      this.pingSentAt = now;
      const sent = this.send({
        v: PROTOCOL_VERSION,
        t: "ping",
        t0: now,
      });
      if (!sent) {
        this.pingSentAt = null;
        this.handleTransportLoss(now);
      }
    }
  }

  /** A malformed host message is fatal; the page should ask for a reload. */
  reportProtocolError(error: ProtocolError): void {
    if (this.destroyed) return;
    if (this.sessionState === "ended" || this.sessionState === "error") {
      return;
    }
    this.fail(error);
  }

  destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;
    this.attempting = false;
    this.unsubscribe?.();
    this.unsubscribe = null;
    const transport = this.transport;
    this.transport = null;
    if (transport && transport.state !== "closed") {
      transport.close("controller-closed");
    }
  }

  private async attemptReconnect(): Promise<void> {
    if (
      this.destroyed ||
      this.attempting ||
      this.sessionState !== "reconnecting"
    ) {
      return;
    }
    await this.openAttempt();
  }

  private async openAttempt(): Promise<void> {
    if (this.destroyed || this.attempting) return;
    this.attempting = true;

    let transport: RoomTransport<
      ControllerClientMessage,
      ControllerServerMessage
    >;
    try {
      transport = this.createTransport();
    } catch {
      this.attempting = false;
      this.handleTransportLoss(this.now());
      return;
    }

    this.transport = transport;
    this.unsubscribe?.();
    this.unsubscribe = transport.onMessage((message) => {
      if (this.transport === transport) this.onMessage(message);
    });

    try {
      await transport.connect();
    } catch {
      if (this.transport === transport) {
        this.attempting = false;
        this.handleTransportLoss(this.now());
      }
      return;
    }

    if (this.destroyed || this.transport !== transport) return;
    this.attempting = false;
    if (transport.state !== "open") {
      this.handleTransportLoss(this.now());
      return;
    }

    this.readySent = false;
    const sent = this.send({
      v: PROTOCOL_VERSION,
      t: "hello",
      role: "controller",
      slot: this.slotValue,
      protocol: PROTOCOL_VERSION,
      buildId: this.buildId,
    });
    if (!sent) {
      this.handleTransportLoss(this.now());
    }
  }

  private onMessage(message: ControllerServerMessage): void {
    if (this.destroyed) return;
    switch (message.t) {
      case "welcome":
        if (message.slot !== this.slotValue) {
          this.fail({
            code: "PROTOCOL_ERROR",
            message: "The host accepted a different controller slot",
          });
          return;
        }
        this.reconnectAttempt = 0;
        this.firstDisconnectAt = null;
        this.nextReconnectAt = 0;
        this.rttMs = null;
        this.lastError = null;
        this.pausedReason = null;
        if (this.uiReady) {
          this.sendReady();
        } else {
          this.setState("connected");
        }
        return;

      case "pause":
        this.pausedReason = message.reason;
        if (
          this.sessionState === "ready" ||
          this.sessionState === "connected" ||
          this.sessionState === "paused"
        ) {
          this.setState("paused");
        }
        return;

      case "resume":
        this.pausedReason = null;
        if (this.sessionState === "paused") {
          this.setState(this.readySent ? "ready" : "connected");
          this.lastPingAt = this.now();
        }
        return;

      case "pong":
        if (this.pingSentAt !== null) {
          this.rttMs = Math.max(
            0,
            Math.round(this.now() - this.pingSentAt),
          );
          this.pingSentAt = null;
          this.notify();
        }
        return;

      case "session-end":
        this.finish(message.reason);
        return;

      case "error":
        this.handleError(message);
        return;
    }
  }

  private sendReady(): void {
    if (this.destroyed || this.readySent) return;
    this.readySent = true;
    const sent = this.send({
      v: PROTOCOL_VERSION,
      t: "ready",
    });
    if (!sent) {
      this.handleTransportLoss(this.now());
      return;
    }
    this.lastPingAt = this.now();
    this.setState("ready");
  }

  private handleError(message: { code: ErrorCode; message: string }): void {
    if (FATAL_ERRORS.has(message.code)) {
      this.fail({ code: message.code, message: message.message });
      return;
    }
    this.lastError = { code: message.code, message: message.message };
    this.finish(message.message);
  }

  private handleTransportLoss(now: number): void {
    if (this.destroyed) return;
    if (
      this.sessionState === "idle" ||
      this.sessionState === "ended" ||
      this.sessionState === "error"
    ) {
      return;
    }

    this.attempting = false;
    const transport = this.transport;
    this.transport = null;
    this.unsubscribe?.();
    this.unsubscribe = null;
    if (transport && transport.state !== "closed") {
      try {
        transport.close("reconnecting");
      } catch {
        // The close handler is best-effort; membership cleanup is server-side.
      }
    }

    this.readySent = false;
    this.pausedReason = null;
    this.pingSentAt = null;
    this.rttMs = null;
    if (this.firstDisconnectAt === null) {
      this.firstDisconnectAt = now;
    }
    this.reconnectAttempt += 1;
    const delay = Math.min(
      RECONNECT_BASE_DELAY_MS * 2 ** (this.reconnectAttempt - 1),
      RECONNECT_MAX_DELAY_MS,
    );
    this.nextReconnectAt = now + delay;
    this.setState("reconnecting");
  }

  private finish(reason: string): void {
    if (
      this.sessionState === "ended" ||
      this.sessionState === "error"
    ) {
      return;
    }
    this.sessionState = "ended";
    this.endReason = reason;
    this.pausedReason = null;
    this.attempting = false;
    const transport = this.transport;
    this.transport = null;
    this.unsubscribe?.();
    this.unsubscribe = null;
    if (transport && transport.state !== "closed") {
      transport.close(reason);
    }
    this.notify();
  }

  private fail(error: ProtocolError): void {
    if (this.sessionState === "error" || this.sessionState === "ended") {
      return;
    }
    this.sessionState = "error";
    this.lastError = { ...error };
    this.pausedReason = null;
    this.attempting = false;
    const transport = this.transport;
    this.transport = null;
    this.unsubscribe?.();
    this.unsubscribe = null;
    if (transport && transport.state !== "closed") {
      transport.close(error.code);
    }
    this.notify();
  }

  private send(message: ControllerClientMessage): boolean {
    const transport = this.transport;
    if (!transport || transport.state !== "open") return false;
    try {
      transport.send(message);
      return true;
    } catch {
      return false;
    }
  }

  private setState(state: ControllerSessionState): void {
    this.sessionState = state;
    this.notify();
  }

  private notify(): void {
    this.onChange?.(this.view);
  }
}
