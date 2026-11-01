import { normalizeRoomCode } from "./room-code";
import {
  MAX_INPUT_MESSAGES_PER_SECOND,
  PROTOCOL_VERSION,
  protocolErrorFromUnknown,
  type HostClientMessage,
  type HostServerMessage,
  type NetInput,
  type PauseReason,
  type ProtocolError,
} from "./protocol";
import { RemotePlayerSource } from "./remote-player-source";
import type { RoomTransport } from "./transport";
import type { PlayerSlot } from "../world/intent-source";

const PLAYER_SLOTS: readonly PlayerSlot[] = ["p1", "p2"];

export type HostSessionState =
  | "idle"
  | "connecting"
  | "waiting"
  | "controllers-ready"
  | "active"
  | "paused"
  | "ended";

export type HostSlotStatus =
  | "keyboard"
  | "open"
  | "connected"
  | "ready"
  | "closed";

export interface HostSlotSnapshot {
  status: HostSlotStatus;
  remote: RemotePlayerSource | null;
}

export interface HostSessionSnapshot {
  state: HostSessionState;
  pausedReason: PauseReason | null;
  lastError: ProtocolError | null;
  slots: Record<PlayerSlot, HostSlotSnapshot>;
  droppedInputs: number;
  rateLimitedInputs: number;
}

export interface HostSessionOptions {
  transport: RoomTransport<HostClientMessage, HostServerMessage>;
  room: string;
  buildId: string;
  phoneSlots: readonly PlayerSlot[];
  now?: () => number;
  onChange?: (snapshot: HostSessionSnapshot) => void;
}

interface SlotRecord {
  status: HostSlotStatus;
  remote: RemotePlayerSource | null;
}

interface RateBucket {
  startedAt: number;
  count: number;
}

export class HostSession {
  private readonly transport: RoomTransport<
    HostClientMessage,
    HostServerMessage
  >;
  private readonly now: () => number;
  private readonly onChange?: (snapshot: HostSessionSnapshot) => void;
  private readonly phoneSlotList: PlayerSlot[];
  private readonly slots = new Map<PlayerSlot, SlotRecord>();
  private readonly rateBuckets = new Map<PlayerSlot, RateBucket>();
  private readonly pingTimes = new Map<PlayerSlot, number>();
  private sessionState: HostSessionState = "idle";
  private pausedReason: PauseReason | null = null;
  private lastError: ProtocolError | null = null;
  private droppedInputs = 0;
  private rateLimitedInputs = 0;
  private unsubscribe: (() => void) | null = null;
  readonly room: string;
  readonly buildId: string;

  constructor(options: HostSessionOptions) {
    const room = normalizeRoomCode(options.room);
    if (!room.ok) throw new Error(room.error.message);
    if (options.buildId.trim().length === 0) {
      throw new Error("SESSION_BUILD_ID: buildId must not be empty");
    }
    if (new Set(options.phoneSlots).size !== options.phoneSlots.length) {
      throw new Error("SESSION_SLOTS: phoneSlots must be unique");
    }
    if (
      options.phoneSlots.length === 0 ||
      options.phoneSlots.length > PLAYER_SLOTS.length
    ) {
      throw new Error(
        "SESSION_SLOTS: a controller session needs one or two phone slots",
      );
    }

    this.transport = options.transport;
    this.room = room.value;
    this.buildId = options.buildId;
    this.phoneSlotList = [...options.phoneSlots];
    this.now = options.now ?? Date.now;
    this.onChange = options.onChange;

    for (const slot of PLAYER_SLOTS) {
      this.slots.set(slot, {
        status: this.phoneSlotList.includes(slot) ? "open" : "keyboard",
        remote: null,
      });
    }
  }

  get state(): HostSessionState {
    return this.sessionState;
  }

  get paused(): PauseReason | null {
    return this.pausedReason;
  }

  get error(): ProtocolError | null {
    return this.lastError;
  }

  get phoneSlots(): readonly PlayerSlot[] {
    return this.phoneSlotList;
  }

  get droppedInputCount(): number {
    return this.droppedInputs;
  }

  get rateLimitedInputCount(): number {
    return this.rateLimitedInputs;
  }

  slotStatus(slot: PlayerSlot): HostSlotStatus {
    return this.slots.get(slot)?.status ?? "closed";
  }

  remoteFor(slot: PlayerSlot): RemotePlayerSource | null {
    return this.slots.get(slot)?.remote ?? null;
  }

  lastPingAt(slot: PlayerSlot): number | null {
    return this.pingTimes.get(slot) ?? null;
  }

  async connect(): Promise<void> {
    if (this.sessionState !== "idle") {
      throw new Error("SESSION_CONNECT: session has already started");
    }

    this.sessionState = "connecting";
    this.notify();
    this.unsubscribe = this.transport.onMessage((message) => {
      this.onMessage(message);
    });

    try {
      await this.transport.connect();
    } catch (error) {
      this.sessionState = "ended";
      this.lastError = protocolErrorFromUnknown(error);
      this.unsubscribe?.();
      this.unsubscribe = null;
      this.notify();
      throw error;
    }

    if (this.transport.state !== "open") {
      this.sessionState = "ended";
      this.lastError = {
        code: "PROTOCOL_ERROR",
        message: "Transport did not open",
      };
      this.unsubscribe?.();
      this.unsubscribe = null;
      this.notify();
      return;
    }

    this.sessionState = "waiting";
    this.notify();
    this.transport.send({
      v: PROTOCOL_VERSION,
      t: "host-hello",
      room: this.room,
      buildId: this.buildId,
      protocol: PROTOCOL_VERSION,
      phoneSlots: [...this.phoneSlotList],
    });
    this.updateReadiness();
    this.notify();
  }

  start(): boolean {
    if (this.sessionState !== "controllers-ready") return false;
    this.sessionState = "active";
    this.pausedReason = null;
    this.discardRemotes();
    this.send({
      v: PROTOCOL_VERSION,
      t: "resume",
      reason: "run-start",
    });
    this.notify();
    return true;
  }

  pause(reason: PauseReason = "host-paused"): boolean {
    if (this.sessionState !== "active") return false;
    this.sessionState = "paused";
    this.pausedReason = reason;
    this.discardRemotes();
    this.send({ v: PROTOCOL_VERSION, t: "pause", reason });
    this.notify();
    return true;
  }

  resume(reason = "resume"): boolean {
    if (this.sessionState !== "paused") return false;
    if (!this.allSlotsResolved()) return false;
    this.sessionState = "active";
    this.pausedReason = null;
    this.discardRemotes();
    this.send({ v: PROTOCOL_VERSION, t: "resume", reason });
    this.notify();
    return true;
  }

  closeSlot(slot: PlayerSlot, reason = "keyboard-fallback"): boolean {
    const record = this.phoneRecord(slot);
    if (!record || record.status === "closed") return false;

    record.remote?.discard();
    record.remote?.destroy();
    record.remote = null;
    record.status = "closed";
    this.rateBuckets.delete(slot);
    this.pingTimes.delete(slot);
    this.send({
      v: PROTOCOL_VERSION,
      t: "close-slot",
      slot,
      reason,
    });
    this.updateReadiness();
    this.notify();
    return true;
  }

  end(reason = "host-left"): void {
    if (this.sessionState === "ended") return;
    this.send({ v: PROTOCOL_VERSION, t: "session-end", reason });
    this.finish(reason);
  }

  destroy(): void {
    if (this.sessionState === "ended") return;
    this.finish("destroyed");
  }

  snapshot(): HostSessionSnapshot {
    const slots = {} as Record<PlayerSlot, HostSlotSnapshot>;
    for (const slot of PLAYER_SLOTS) {
      const record = this.slots.get(slot);
      slots[slot] = {
        status: record?.status ?? "closed",
        remote: record?.remote ?? null,
      };
    }
    return {
      state: this.sessionState,
      pausedReason: this.pausedReason,
      lastError: this.lastError,
      slots,
      droppedInputs: this.droppedInputs,
      rateLimitedInputs: this.rateLimitedInputs,
    };
  }

  private onMessage(message: HostServerMessage): void {
    if (this.sessionState === "ended") return;
    switch (message.t) {
      case "room-state":
        this.applyRoomState(message.slots);
        return;
      case "ready":
        this.applyReady(message.slot);
        return;
      case "input":
        this.applyInput(message.slot, message.seq, message.input);
        return;
      case "ping":
        this.applyPing(message.slot, message.t0);
        return;
      case "error":
        this.lastError = {
          code: message.code,
          message: message.message,
        };
        this.notify();
        return;
      case "session-end":
        this.finish(message.reason);
        return;
    }
  }

  private applyRoomState(
    states: readonly {
      slot: PlayerSlot;
      connected: boolean;
      ready: boolean;
    }[],
  ): void {
    for (const state of states) {
      const record = this.phoneRecord(state.slot);
      if (!record || record.status === "closed") continue;

      if (!state.connected) {
        const wasConnected = record.status !== "open";
        record.remote?.disconnect();
        record.status = "open";
        if (wasConnected && this.sessionState === "active") {
          this.pause("controller-left");
        }
        continue;
      }

      if (!record.remote) {
        record.remote = new RemotePlayerSource(state.slot);
      }
      if (record.remote.state === "disconnected") {
        record.remote.connect();
        this.rateBuckets.delete(state.slot);
      }
      record.status = state.ready ? "ready" : "connected";
    }

    this.updateReadiness();
    this.notify();
  }

  private applyReady(slot: PlayerSlot): void {
    const record = this.phoneRecord(slot);
    if (!record || record.status === "closed") return;

    if (!record.remote) {
      record.remote = new RemotePlayerSource(slot);
      record.remote.connect();
      this.rateBuckets.delete(slot);
    } else if (record.remote.state === "disconnected") {
      record.remote.connect();
      this.rateBuckets.delete(slot);
    }
    record.status = "ready";
    this.updateReadiness();
    this.notify();
  }

  private applyInput(slot: PlayerSlot, seq: number, input: NetInput): void {
    const record = this.phoneRecord(slot);
    if (
      !record ||
      record.status !== "ready" ||
      !record.remote ||
      this.sessionState !== "active"
    ) {
      this.droppedInputs += 1;
      return;
    }

    if (!this.allowInput(slot)) {
      this.rateLimitedInputs += 1;
      this.droppedInputs += 1;
      this.notify();
      return;
    }

    if (!record.remote.ingest(seq, input)) {
      this.droppedInputs += 1;
      this.notify();
    }
  }

  private applyPing(slot: PlayerSlot, t0: number): void {
    const record = this.phoneRecord(slot);
    if (!record || record.status === "closed") return;
    this.pingTimes.set(slot, this.now());
    this.send({ v: PROTOCOL_VERSION, t: "pong", slot, t0 });
    this.notify();
  }

  private updateReadiness(): void {
    const ready = this.allSlotsResolved();
    if (this.sessionState === "waiting" && ready) {
      this.sessionState = "controllers-ready";
    } else if (this.sessionState === "controllers-ready" && !ready) {
      this.sessionState = "waiting";
    }
  }

  private allSlotsResolved(): boolean {
    return this.phoneSlotList.every((slot) => {
      const status = this.slots.get(slot)?.status;
      return status === "ready" || status === "closed";
    });
  }

  private discardRemotes(): void {
    for (const record of this.slots.values()) {
      record.remote?.discard();
    }
  }

  private allowInput(slot: PlayerSlot): boolean {
    const now = this.now();
    const bucket = this.rateBuckets.get(slot);
    if (!bucket || now < bucket.startedAt || now - bucket.startedAt >= 1000) {
      this.rateBuckets.set(slot, { startedAt: now, count: 1 });
      return true;
    }
    if (bucket.count >= MAX_INPUT_MESSAGES_PER_SECOND) return false;
    bucket.count += 1;
    return true;
  }

  private phoneRecord(slot: PlayerSlot): SlotRecord | null {
    const record = this.slots.get(slot);
    return record && record.status !== "keyboard" ? record : null;
  }

  private send(message: HostClientMessage): void {
    if (this.transport.state === "open") {
      this.transport.send(message);
    }
  }

  private finish(reason: string): void {
    this.sessionState = "ended";
    this.pausedReason = null;
    for (const record of this.slots.values()) {
      record.remote?.destroy();
      record.remote = null;
    }
    this.unsubscribe?.();
    this.unsubscribe = null;
    if (this.transport.state !== "idle") {
      this.transport.close(reason);
    }
    this.notify();
  }

  private notify(): void {
    this.onChange?.(this.snapshot());
  }
}
