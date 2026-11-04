import type { DebriefPrompt, ObjectiveProgress } from "../curriculum";
import type { FeedbackFrame } from "../feedback";
import type { GateDocument, PresentationRect } from "../pack";

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
  width: number;
  height: number;
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

export interface BlueprintComponentView {
  id: string;
  symbol: string;
  label?: string;
  state: "done" | "active" | "pending";
  actor: "p1" | "p2" | "both" | "shared" | null;
  beatIds: string[];
}

export interface BlueprintEdgeView {
  id: string;
  from: string;
  to: string;
  type: "flow" | "oneWay";
  state: "done" | "active" | "pending";
}

export interface BlueprintView {
  puzzleId: string;
  title: string;
  components: BlueprintComponentView[];
  edges: BlueprintEdgeView[];
}

export interface ConceptRelationshipView {
  type: string;
  target: string;
  targetTerm: string;
}

export interface ConceptFactView {
  id: string;
  title: string;
  claim: string;
  discovered: boolean;
}

export interface ConceptView {
  id: string;
  term: string;
  definition: string;
  relationships: ConceptRelationshipView[];
  misconceptions: string[];
  facts: ConceptFactView[];
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
  hintIndex: number;
  hintsTotal: number;
  revealedHints: string[];
  pulse: {
    nodeId: string;
    remainingTicks: number;
    cooldownTicks: number;
  } | null;
}

export interface SettingsView {
  audio: { muted: boolean; volume: number };
  accessibility: { textScale: number; reducedMotion: boolean };
  feedback: { showShared: boolean };
}

export interface WorldAnchorPoint {
  x: number;
  y: number;
  direction?: number;
}

export interface WorldEntityView {
  id: string;
  /** World pixels, centre-bottom, matching the room renderer. */
  x: number;
  y: number;
  width: number;
  height: number;
  anchors: Record<string, WorldAnchorPoint>;
}

export interface WorldView {
  camera: CameraView;
  /** Logical game resolution; the canvas may be scaled/letterboxed. */
  viewport: { width: number; height: number };
  /** Stage rect in logical canvas pixels. */
  stage: PresentationRect;
  /** Integer camera zoom applied inside the stage. */
  zoom: number;
  tileSize: number;
  players: Record<PlayerId, PlayerView>;
  entities: Record<string, WorldEntityView>;
  props: Record<string, WorldEntityView>;
}

export type SurfaceAction =
  | { type: "confirm" }
  | { type: "cancel" }
  | { type: "choose"; choiceId: string };

export interface RuntimeSnapshot {
  state:
    | "boot"
    | "level"
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
  world: WorldView;
  feedback: FeedbackFrame;
  blueprint: BlueprintView | null;
  abilities: string[];
  knownConceptIds: string[];
  knownFactIds: string[];
  interaction: InteractionView | null;
  checkpointId: string | null;
  activeP2: boolean;
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
