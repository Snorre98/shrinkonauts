import type { DebriefPrompt, ObjectiveProgress } from "../curriculum";
import type { GateDocument } from "../pack";

/**
 * Presentation contract between `game` and `ui`. The runtime produces these
 * plain view models; the UI adapter renders them. Keeping the contract in `ui`
 * means the DOM layer never imports the runtime, so `game` and `ui` stay
 * acyclic (runtime → view contract ← DOM renderer).
 */

export type PlayerId = "p1" | "p2";

export interface PlayerView {
  id: PlayerId;
  x: number;
  y: number;
  facing: -1 | 1;
  active: boolean;
  dashing: boolean;
  dashReady: boolean;
  abilities: string[];
  carrying: string | null;
}

export interface CameraView {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface InteractionView {
  kind: "dialogue" | "gate" | "prop" | "pulse" | "puzzle";
  id: string;
  label: string;
  key?: string;
}

export interface DialogueChoiceView {
  id: string;
  text: string;
}

export interface DialogueView {
  id: string;
  speaker: string;
  text: string;
  portrait?: string;
  nodeId: string;
  choices: DialogueChoiceView[];
  atEnd: boolean;
}

export interface GateFeedbackView {
  correct: boolean;
  message: string;
}

export interface GateView {
  id: string;
  prompt: string;
  puzzle: GateDocument["puzzle"];
  hints: string[];
  hintIndex: number;
  feedback: GateFeedbackView | null;
  solved: boolean;
}

export interface DebriefView {
  prompts: DebriefPrompt[];
  answers: Record<string, string>;
  objectives: ObjectiveProgress[];
}

export interface MapNodeView {
  id: string;
  label: string;
  x: number;
  y: number;
  current: boolean;
  visited: boolean;
}

export interface MapEdgeView {
  id: string;
  from: string;
  to: string;
  type: string;
  revealed: boolean;
}

export interface MapView {
  nodes: MapNodeView[];
  edges: MapEdgeView[];
}

export interface ConceptRelationshipView {
  type: string;
  target: string;
  targetTerm: string;
}

export interface ConceptView {
  id: string;
  term: string;
  definition: string;
  relationships: ConceptRelationshipView[];
  misconceptions: string[];
  discovered: boolean;
}

export interface PuzzleView {
  id: string;
  title: string;
  solved: boolean;
  canReset: boolean;
  tether: string;
  counters: Record<string, number>;
  hint: string | null;
  canHint: boolean;
  pulse: {
    nodeId: string;
    remainingTicks: number;
    cooldownTicks: number;
  } | null;
}

export interface SettingsView {
  audio: { muted: boolean; volume: number };
  accessibility: { textScale: number; reducedMotion: boolean };
}

export interface RuntimeSnapshot {
  state:
    | "boot"
    | "level"
    | "dialogue"
    | "gate"
    | "map"
    | "conceptLog"
    | "debrief"
    | "complete"
    | "pause"
    | "error";
  paused: boolean;
  level: { id: string; title: string; objectiveIds: string[] };
  roomId: string;
  players: Record<PlayerId, PlayerView>;
  camera: CameraView;
  abilities: string[];
  knownConceptIds: string[];
  interaction: InteractionView | null;
  checkpointId: string | null;
  activeP2: boolean;
  dialogue: DialogueView | null;
  gate: GateView | null;
  debrief: DebriefView | null;
  map: MapView;
  conceptLog: ConceptView[];
  puzzle: PuzzleView | null;
  toast: string | null;
  muted: boolean;
  settings: SettingsView;
  saveNotice: string | null;
  error: string | null;
  mode: "solo" | "co-op";
}
