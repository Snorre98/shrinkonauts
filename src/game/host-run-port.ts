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

export type HostRunPauseReason = "host-paused" | "host-hidden";

/** Ephemeral controller affordance; never game content. */
export type HostControlMode = "explore" | "talk" | "choice";

export type HostControlVerb =
  | "jump"
  | "dash"
  | "interact"
  | "scan"
  | "pulse"
  | "carry"
  | "throw";

export interface HostControlDescriptor {
  mode: HostControlMode;
  /** Required for choice mode; 1-5. */
  choices?: number;
  /** 1-based selected choice, when known. */
  selected?: number;
  verbs: HostControlVerb[];
  activeVerb?: HostControlVerb;
  dashReady: boolean;
}

export type HostActionResult = "accepted" | "rejected" | "cooldown";

export type HostActionReason =
  | "out-of-range"
  | "locked"
  | "empty"
  | "cooldown";

export interface HostActionFeedback {
  verb: HostControlVerb;
  result: HostActionResult;
  reason?: HostActionReason;
  retryAfterMs?: number;
}

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
  ticket?: string;
  deviceToken?: string;
  onStateChange?: (view: HostRunView) => void;
  onError?: (error: HostRunError) => void;
}

/** Game-owned seam; the net adapter implements this without game importing net. */
export interface HostRunPort {
  readonly room: string;
  readonly phoneSlots: readonly PlayerSlot[];
  readonly view: HostRunView;
  connect(): Promise<void>;
  attachInput(arbiter: InputArbiter): void;
  start(): boolean;
  pause(reason?: HostRunPauseReason): boolean;
  resume(): boolean;
  fallbackToKeyboard(slot: PlayerSlot): boolean;
  sendControl(slot: PlayerSlot, control: HostControlDescriptor): void;
  sendAction(slot: PlayerSlot, feedback: HostActionFeedback): void;
  end(reason?: string): void;
  destroy(): void;
}

export type HostRunFactory = (options: HostRunFactoryOptions) => HostRunPort;
