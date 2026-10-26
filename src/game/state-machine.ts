export const GAME_STATES = [
  "boot",
  "level",
  "dialogue",
  "gate",
  "map",
  "conceptLog",
  "debrief",
  "complete",
  "pause",
  "error",
] as const;

export type GameState = (typeof GAME_STATES)[number];

export type GameEventType =
  | "start-level"
  | "open-dialogue"
  | "close-dialogue"
  | "open-gate"
  | "close-gate"
  | "open-map"
  | "close-map"
  | "open-concept-log"
  | "close-concept-log"
  | "level-complete"
  | "finish-debrief"
  | "pause"
  | "resume"
  | "error";

export interface MachineState {
  state: GameState;
  returnTo: GameState | null;
}

export function initialMachine(): MachineState {
  return { state: "boot", returnTo: null };
}

const PAUSABLE: readonly GameState[] = [
  "level",
  "dialogue",
  "gate",
  "map",
  "conceptLog",
  "debrief",
];

const OVERLAYS: readonly GameState[] = ["map", "conceptLog", "pause"];

export function isOverlay(state: GameState): boolean {
  return OVERLAYS.includes(state);
}

export function isPlaying(state: GameState): boolean {
  return state === "level";
}

export function machineIsPaused(machine: MachineState): boolean {
  return machine.state === "pause";
}

export function transition(
  machine: MachineState,
  event: GameEventType,
): MachineState {
  switch (event) {
    case "start-level":
      return { state: "level", returnTo: null };
    case "open-dialogue":
      return machine.state === "level"
        ? { state: "dialogue", returnTo: null }
        : machine;
    case "close-dialogue":
      return machine.state === "dialogue"
        ? { state: "level", returnTo: null }
        : machine;
    case "open-gate":
      return machine.state === "level"
        ? { state: "gate", returnTo: null }
        : machine;
    case "close-gate":
      return machine.state === "gate"
        ? { state: "level", returnTo: null }
        : machine;
    case "open-map":
      return machine.state === "level"
        ? { state: "map", returnTo: "level" }
        : machine;
    case "close-map":
      return machine.state === "map"
        ? { state: machine.returnTo ?? "level", returnTo: null }
        : machine;
    case "open-concept-log":
      return machine.state === "level"
        ? { state: "conceptLog", returnTo: "level" }
        : machine;
    case "close-concept-log":
      return machine.state === "conceptLog"
        ? { state: machine.returnTo ?? "level", returnTo: null }
        : machine;
    case "level-complete":
      return machine.state === "level"
        ? { state: "debrief", returnTo: null }
        : machine;
    case "finish-debrief":
      return machine.state === "debrief"
        ? { state: "complete", returnTo: null }
        : machine;
    case "pause":
      if (machine.state === "pause" || !PAUSABLE.includes(machine.state)) {
        return machine;
      }
      return { state: "pause", returnTo: machine.state };
    case "resume":
      return machine.state === "pause"
        ? { state: machine.returnTo ?? "level", returnTo: null }
        : machine;
    case "error":
      return { state: "error", returnTo: machine.state };
    default:
      return machine;
  }
}


