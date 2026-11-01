import type { PlayerActionInput, RuntimeInput } from "./runtime-port";
import type { PlayerId, PlayerIntent } from "./simulation";

/** The two player slots. The name is independent of who hosts or renders. */
export type PlayerSlot = PlayerId;
export type InputSourceKind = "keyboard" | "controller";
export type InputPlan = Record<PlayerSlot, InputSourceKind>;

export interface PlayerFrameInput {
  intent: PlayerIntent;
  actions: PlayerActionInput;
}

export interface HostActions {
  map: boolean;
  log: boolean;
  pause: boolean;
  mute: boolean;
  toggleP2: boolean;
}

export interface IntentSource {
  sample(): RuntimeInput;
  discard(): void;
  destroy?(): void;
}

export interface PlayerIntentSource {
  sample(): PlayerFrameInput;
  discard(): void;
  destroy?(): void;
}

export interface LocalIntentSource {
  samplePlayer(id: PlayerSlot): PlayerFrameInput;
  sampleHost(): HostActions;
  discard(): void;
}
