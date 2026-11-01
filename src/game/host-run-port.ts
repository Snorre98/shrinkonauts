import type { InputArbiter } from "../world/input-arbiter";
import type {
  InputPlan,
  PlayerSlot,
} from "../world/intent-source";

export type HostRunState =
  | "idle"
  | "connecting"
  | "waiting"
  | "controllers-ready"
  | "active"
  | "paused"
  | "ended";

export type HostRunSlotStatus =
  | "keyboard"
  | "open"
  | "connected"
  | "ready"
  | "closed";

export type HostRunSource = "keyboard" | "controller";

export interface HostRunSlotView {
  status: HostRunSlotStatus;
  source: HostRunSource;
}

export interface HostRunError {
  code: string;
  message: string;
}

export interface HostRunView {
  state: HostRunState;
  pausedReason: string | null;
  missingSlots: PlayerSlot[];
  slots: Record<PlayerSlot, HostRunSlotView>;
  error: HostRunError | null;
}

export interface HostRunFactoryOptions {
  plan: InputPlan;
  room?: string;
  buildId: string;
  autoStart?: boolean;
  onStateChange?: (view: HostRunView) => void;
  onError?: (error: HostRunError) => void;
}

/** Game-owned seam; the net adapter implements this without game importing net. */
export interface HostRunPort {
  readonly room: string;
  readonly view: HostRunView;
  connect(): Promise<void>;
  attachInput(arbiter: InputArbiter): void;
  start(): boolean;
  resume(): boolean;
  fallbackToKeyboard(slot: PlayerSlot): boolean;
  end(reason?: string): void;
  destroy(): void;
}

export type HostRunFactory = (options: HostRunFactoryOptions) => HostRunPort;
