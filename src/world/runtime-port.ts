import type { RoomDocument } from "../pack";
import type { GameplayCue, Intents, RoomSimulation } from "./simulation";

/**
 * Structural interface the renderer needs from the game runtime. `world` must
 * not import `game`: the runtime satisfies this port, and boot injects it.
 */

export interface PlayerActionInput {
  interact: boolean;
  scan: boolean;
}

export interface FrameActions {
  p1: PlayerActionInput;
  p2: PlayerActionInput;
  map: boolean;
  log: boolean;
  pause: boolean;
  mute: boolean;
  toggleP2: boolean;
  confirm: boolean;
}

export interface RuntimeInput {
  intents: Intents;
  actions: FrameActions;
}

export interface WorldRuntime {
  readonly roomDocument: RoomDocument;
  readonly simulation: RoomSimulation;
  resize(width: number, height: number): void;
  step(dt: number, input: RuntimeInput): GameplayCue[];
  /** Entity id under the interaction cursor, or null. */
  interactionId(): string | null;
}

export function emptyRuntimeInput(): RuntimeInput {
  return {
    intents: {
      p1: { moveX: 0, jump: false, dash: false },
      p2: { moveX: 0, jump: false, dash: false },
    },
    actions: {
      p1: { interact: false, scan: false },
      p2: { interact: false, scan: false },
      map: false,
      log: false,
      pause: false,
      mute: false,
      toggleP2: false,
      confirm: false,
    },
  };
}
