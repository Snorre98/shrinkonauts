import type { RoomDocument } from "../pack";
import type {
  GameplayCue,
  Intents,
  PlayerId,
  RoomSimulation,
} from "./simulation";

/**
 * Structural interface the renderer needs from the game runtime. `world` must
 * not import `game`: the runtime satisfies this port, and boot injects it.
 */

export interface PlayerUiActions {
  confirm: boolean;
  cancel: boolean;
  navigateUp: boolean;
  navigateDown: boolean;
  /** 1-based choice position, or null. */
  choose: number | null;
}

export function emptyPlayerUiActions(): PlayerUiActions {
  return {
    confirm: false,
    cancel: false,
    navigateUp: false,
    navigateDown: false,
    choose: null,
  };
}

export interface PlayerActionInput {
  interact: boolean;
  scan: boolean;
  pulse: boolean;
  carry: boolean;
  throw: boolean;
  ui?: PlayerUiActions;
}

export interface FrameActions {
  p1: PlayerActionInput;
  p2: PlayerActionInput;
  map: boolean;
  log: boolean;
  pause: boolean;
  mute: boolean;
  toggleP2: boolean;
}

export interface RuntimeInput {
  intents: Intents;
  actions: FrameActions;
}

/**
 * Minimal world-facing effect seam for Phase 4. Phase 6 will extend this with
 * resolved stages/paths; `world` deliberately never imports feedback types.
 */
export interface WorldEffectPlan {
  id: string;
  actor: PlayerId | null;
  owner: PlayerId | "shared";
  accent?: "p1" | "p2" | "neutral";
}

export interface WorldRuntime {
  readonly roomDocument: RoomDocument;
  readonly simulation: RoomSimulation;
  resize(width: number, height: number): void;
  step(dt: number, input: RuntimeInput): GameplayCue[];
  /** Entity id under the interaction cursor, or null. */
  interactionId(): string | null;
  /** Drains newly produced cosmetic effect plans for the scene sink. */
  drainEffects(): readonly WorldEffectPlan[];
}

export function emptyRuntimeInput(): RuntimeInput {
  return {
    intents: {
      p1: { moveX: 0, jump: false, dash: false },
      p2: { moveX: 0, jump: false, dash: false },
    },
    actions: {
      p1: {
        interact: false,
        scan: false,
        pulse: false,
        carry: false,
        throw: false,
        ui: emptyPlayerUiActions(),
      },
      p2: {
        interact: false,
        scan: false,
        pulse: false,
        carry: false,
        throw: false,
        ui: emptyPlayerUiActions(),
      },
      map: false,
      log: false,
      pause: false,
      mute: false,
      toggleP2: false,
    },
  };
}
