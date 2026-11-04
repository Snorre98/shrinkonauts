import type {
  HostRunFactory,
  HostRunFactoryOptions,
  HostRunPauseReason,
  HostRunPort,
  HostRunView,
} from "../game/host-run-port";
import {
  phoneSlotsForPlan,
  type InputPlan,
  type PlayerIntentSource,
  type PlayerSlot,
} from "../world/intent-source";
import { InputArbiter } from "../world/input-arbiter";
import {
  decodeHostServerMessage,
  type HostClientMessage,
  type HostServerMessage,
} from "./protocol";
import { buildRoomSocketUrl, generateRoomCode } from "./room-code";
import { RemotePlayerSource } from "./remote-player-source";
import {
  HostSession,
  type HostSessionSnapshot,
} from "./session";
import {
  WebSocketRoomTransport,
  type RoomTransport,
} from "./transport";

class SessionRemoteHandle implements PlayerIntentSource {
  constructor(readonly source: RemotePlayerSource) {}

  sample() {
    return this.source.sample();
  }

  discard(): void {
    this.source.discard();
  }

  /** The owning host session, not the scene, controls the real lifetime. */
  destroy(): void {}
}

export interface HostRunAdapterOptions extends HostRunFactoryOptions {
  transport: RoomTransport<HostClientMessage, HostServerMessage>;
  now?: () => number;
}

/**
 * Host-side bridge between a RoomSession, the scene arbiter, and the game UI.
 * Keyboard input is always local; remote sources only replace controller slots.
 */
export class HostRunAdapter implements HostRunPort {
  readonly plan: InputPlan;
  readonly phoneSlots: readonly PlayerSlot[];
  readonly session: HostSession;
  private readonly onStateChange?: HostRunFactoryOptions["onStateChange"];
  private readonly onError?: HostRunFactoryOptions["onError"];
  private readonly handles = new Map<PlayerSlot, SessionRemoteHandle>();
  private readonly bound = new Set<PlayerSlot>();
  private arbiter: InputArbiter | null = null;
  private viewValue: HostRunView;
  private viewSignatureValue = "";
  private lastError: string | null = null;

  constructor(options: HostRunAdapterOptions) {
    const phoneSlots = phoneSlotsForPlan(options.plan);
    if (phoneSlots.length === 0) {
      throw new Error("HOST_RUN_NO_CONTROLLERS: phone slots are required");
    }

    this.plan = { ...options.plan };
    this.phoneSlots = phoneSlots;
    this.onStateChange = options.onStateChange;
    this.onError = options.onError;
    this.session = new HostSession({
      transport: options.transport,
      room: options.room ?? generateRoomCode(),
      buildId: options.buildId,
      phoneSlots,
      ...(options.now ? { now: options.now } : {}),
      onChange: (snapshot) => this.handleSnapshot(snapshot),
    });
    this.viewValue = this.buildView(this.session.snapshot());
  }

  get room(): string {
    return this.session.room;
  }

  get view(): HostRunView {
    return this.viewValue;
  }

  async connect(): Promise<void> {
    await this.session.connect();
  }

  attachInput(arbiter: InputArbiter): void {
    this.arbiter = arbiter;
    this.bound.clear();
    for (const handle of this.handles.values()) handle.discard();
    this.syncRemotes();
    for (const [slot, handle] of this.handles) {
      if (this.bound.has(slot)) continue;
      arbiter.setRemote(slot, handle);
      this.bound.add(slot);
    }
  }

  start(): boolean {
    return this.session.start();
  }

  pause(reason: HostRunPauseReason = "host-paused"): boolean {
    return this.session.pause(reason);
  }

  resume(): boolean {
    return this.session.resume();
  }

  fallbackToKeyboard(slot: PlayerSlot): boolean {
    if (!this.session.closeSlot(slot)) return false;
    this.syncRemotes();
    if (this.session.state === "paused") {
      this.session.resume();
    }
    return true;
  }

  end(reason = "host-left"): void {
    this.session.end(reason);
  }

  destroy(): void {
    this.session.destroy();
    this.arbiter = null;
    this.bound.clear();
    this.handles.clear();
  }

  private handleSnapshot(snapshot: HostSessionSnapshot): void {
    this.syncRemotes();
    const view = this.buildView(snapshot);
    this.viewValue = view;
    const signature = JSON.stringify({
      state: view.state,
      pausedReason: view.pausedReason,
      missingSlots: view.missingSlots,
      slots: view.slots,
      error: view.error,
    });
    if (signature !== this.viewSignatureValue) {
      this.viewSignatureValue = signature;
      this.onStateChange?.(view);
    }

    if (snapshot.lastError) {
      const key = `${snapshot.lastError.code}:${snapshot.lastError.message}`;
      if (key !== this.lastError) {
        this.lastError = key;
        this.onError?.({
          code: snapshot.lastError.code,
          message: snapshot.lastError.message,
        });
      }
    }
  }

  private syncRemotes(): void {
    for (const slot of this.phoneSlots) {
      const source = this.session.remoteFor(slot);
      const current = this.handles.get(slot);
      if (!source) {
        if (current) {
          if (this.arbiter && this.bound.has(slot)) {
            this.arbiter.clearRemote(slot);
          }
          this.bound.delete(slot);
          this.handles.delete(slot);
        }
        continue;
      }
      if (current?.source === source) continue;

      if (current && this.arbiter && this.bound.has(slot)) {
        this.arbiter.clearRemote(slot);
        this.bound.delete(slot);
      }
      const handle = new SessionRemoteHandle(source);
      this.handles.set(slot, handle);
      if (this.arbiter) {
        this.arbiter.setRemote(slot, handle);
        this.bound.add(slot);
      }
    }
  }

  private buildView(snapshot: HostSessionSnapshot): HostRunView {
    const slots = {} as HostRunView["slots"];
    for (const slot of ["p1", "p2"] as const) {
      const status = snapshot.slots[slot].status;
      slots[slot] = {
        status,
        source:
          this.plan[slot] === "controller" && status !== "closed"
            ? "controller"
            : "keyboard",
      };
    }
    return {
      state: snapshot.state,
      pausedReason: snapshot.pausedReason,
      missingSlots: this.phoneSlots.filter((slot) => {
        const status = snapshot.slots[slot].status;
        return status !== "ready" && status !== "closed";
      }),
      slots,
      error: snapshot.lastError
        ? {
            code: snapshot.lastError.code,
            message: snapshot.lastError.message,
          }
        : null,
    };
  }
}

export interface HostRunTransportConfig {
  netUrl?: string;
  createTransport?: (
    url: string,
    options: HostRunFactoryOptions,
  ) => RoomTransport<HostClientMessage, HostServerMessage>;
}

export function createHostRunFactory(
  config: HostRunTransportConfig,
): HostRunFactory {
  return (options) => {
    const room = options.room ?? generateRoomCode();
    const urlOptions = {
      ...(options.ticket ? { ticket: options.ticket } : {}),
      ...(options.deviceToken ? { device: options.deviceToken } : {}),
    };
    let transport: RoomTransport<HostClientMessage, HostServerMessage>;
    if (config.createTransport) {
      const url = config.netUrl
        ? buildRoomSocketUrl(config.netUrl, room, "host", urlOptions)
        : "";
      transport = config.createTransport(url, options);
    } else if (config.netUrl) {
      transport = new WebSocketRoomTransport({
        url: buildRoomSocketUrl(config.netUrl, room, "host", urlOptions),
        decode: decodeHostServerMessage,
      });
    } else {
      throw new Error(
        "NET_URL_MISSING: VITE_NET_URL is required for phone controllers",
      );
    }

    return new HostRunAdapter({
      ...options,
      room,
      transport,
    });
  };
}
