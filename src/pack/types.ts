import type { AssetId } from "../assets";
import type {
  MaterialBinding,
  MaterialId,
  MaterialsDocument,
  PatternBinding,
  TileMaterialRule,
} from "../materials";
import type { PuzzleDocument } from "../puzzle";
import type { Syllabus } from "../syllabus";

export type BackgroundFit = "cover" | "tile" | "stretch" | "contain";

export type BackgroundBlend = "normal" | "add" | "multiply" | "screen";

export interface RoomBackgroundLayer {
  assetId: AssetId;
  depth: number;
  parallaxX: number;
  parallaxY: number;
  fit: BackgroundFit;
  tint?: string;
  opacity?: number;
  blend?: BackgroundBlend;
  materialId?: MaterialId;
  pattern?: PatternBinding;
}

export interface RoomSpawn {
  x: number;
  y: number;
}

export type RoomEntityType =
  | "agent"
  | "movingPlatform"
  | "hazard"
  | "pickup"
  | "trigger"
  | "gate"
  | "checkpoint"
  | "scanTarget"
  | "decor"
  | "body"
  | "prop"
  | "receptor"
  | "pulseSource"
  | "puzzleGate";

export type RoomPropertyValue = string | number | boolean | string[];

export interface EntityBodyComponent {
  dynamic?: boolean;
  width: number;
  height: number;
  mass?: number;
  fixedRotation?: boolean;
  gravity?: boolean;
  friction?: number;
  restitution?: number;
}

export interface EntityPropComponent {
  bodyId: string;
  tags: string[];
  shape: string;
  carryable: boolean;
  placeable: boolean;
  pushable?: boolean;
  throwable?: boolean;
}

export interface EntityReceptorComponent {
  acceptsTag?: string;
  acceptsShape?: string;
  snap?: RoomSpawn;
}

export interface EntityPulseSourceComponent {
  ability: "pulse";
}

export interface EntityGateComponent {
  gateId: string;
}

export interface EntityAnchorPoint {
  x: number;
  y: number;
  /** Direction in radians; used by Phase 6 effect emitters. */
  direction?: number;
}

export interface RoomEntityComponents {
  body?: EntityBodyComponent;
  prop?: EntityPropComponent;
  receptor?: EntityReceptorComponent;
  pulseSource?: EntityPulseSourceComponent;
  gate?: EntityGateComponent;
  anchors?: Record<string, EntityAnchorPoint>;
  material?: MaterialBinding;
}

export interface RoomEntity {
  id: string;
  type: RoomEntityType;
  /** Tile-space position; the entity's feet sit at this cell's top edge. */
  x: number;
  y: number;
  sprite?: AssetId;
  dialogueId?: string;
  gateId?: string;
  conceptId?: string;
  label?: string;
  properties?: Record<string, RoomPropertyValue>;
  components?: RoomEntityComponents;
}

export interface RoomCheckpoint {
  id: string;
  x: number;
  y: number;
}

export interface RoomExit {
  id: string;
  x: number;
  y: number;
  width?: number;
  height?: number;
  toLevelId: string;
  gateId?: string;
  puzzleId?: string;
}

export interface RoomTrigger {
  id: string;
  type: "enter";
  x: number;
  y: number;
  width: number;
  height: number;
  dialogueId?: string;
  gateId?: string;
  event?: string;
}

export interface RoomDocument {
  schemaVersion: string;
  id: string;
  title: string;
  width: number;
  height: number;
  tileSize: number;
  tileset: AssetId;
  layers: {
    tiles: string[];
  };
  /** Optional visual material grid; `layers.tiles` still owns collision. */
  tileMaterials?: string[];
  tileMaterialLegend?: Record<string, TileMaterialRule>;
  defaultMaterialId?: MaterialId;
  materialSeed?: number;
  background: {
    id: AssetId;
    layers: RoomBackgroundLayer[];
  };
  spawns: {
    player1: RoomSpawn;
    player2: RoomSpawn;
  };
  checkpoints?: RoomCheckpoint[];
  exits?: RoomExit[];
  entities?: RoomEntity[];
  triggers?: RoomTrigger[];
  music?: AssetId;
  ambience?: AssetId;
}

export interface ThemePalette {
  bg: string;
  bone: string;
  boneShadow: string;
  nerve: string;
  nerveGlow: string;
  joint: string;
  muscle: string;
  text: string;
  muted: string;
  accent: string;
  danger: string;
  /** Optional pixel ramp tokens (theme schema 1.1). */
  tealDark?: string;
  tealLight?: string;
  boneDark?: string;
  boneLight?: string;
  nerveDark?: string;
  jointDark?: string;
  jointLight?: string;
  muscleDark?: string;
  muscleLight?: string;
}

export interface ThemeFonts {
  ui: string;
  display: string;
}

export interface ThemeDocument {
  schemaVersion: string;
  id: string;
  palette: ThemePalette;
  fonts: ThemeFonts;
  ui: {
    radius: number;
    border: number;
    fontScale: number;
    reducedMotion: boolean;
    assets: Record<string, AssetId>;
    materials?: Record<string, MaterialId>;
    patterns?: Record<string, PatternBinding>;
  };
  audio?: {
    music?: AssetId;
    cues?: Record<string, AssetId>;
  };
}

/* ------------------------------------------------------------------ */
/* Pack manifest                                                       */
/* ------------------------------------------------------------------ */

export interface PackAssetIndex {
  tilesets?: string[];
  sprites?: string[];
  audio?: string[];
}

export interface PackAssetManifests {
  placeholder?: string;
  final?: string;
}

export interface PackDocument {
  schemaVersion: string;
  id: string;
  title: string;
  domain: string;
  version: string;
  syllabusId: string;
  startLevelId: string;
  endLevelId: string;
  levels: string[];
  theme: string;
  mapping: string;
  licenses: string;
  /** Optional pack-level materials document path. */
  materials?: string;
  assetManifests: PackAssetManifests;
  assets?: PackAssetIndex;
  ageRating?: string;
  description?: string;
  metadata?: Record<string, unknown>;
}

/* ------------------------------------------------------------------ */
/* Level package                                                       */
/* ------------------------------------------------------------------ */

export type MapEdgeType = "door" | "gate" | "shortcut" | "secret";

export interface LevelMapEdge {
  to: string;
  type: MapEdgeType;
  gateId?: string;
  puzzleId?: string;
}

export interface LevelMapNode {
  nodeId: string;
  label: string;
  x: number;
  y: number;
  edges: LevelMapEdge[];
}

export interface LevelEvidenceRule {
  objectiveId: string;
  event: string;
  filter: Record<string, string | number | boolean | null>;
  required: boolean;
}

export type LevelUnlockType = "ability" | "flag" | "map" | "item";

export interface LevelUnlock {
  type: LevelUnlockType;
  id: string;
}

export interface LevelCoop {
  supported: boolean;
  notes?: string;
}

export interface LevelAuthoring {
  levelSpec?: string;
  playtestedSolo?: boolean;
  playtestedCoop?: boolean;
  notes?: string;
}

export type LevelFeedbackTileTarget =
  | { kind: "tile"; layer: string; x: number; y: number }
  | {
      kind: "tileRegion";
      layer: string;
      x1: number;
      y1: number;
      x2: number;
      y2: number;
    };

export interface LevelFeedbackBeat {
  id: string;
  label: string;
  nodes: string[];
}

export interface LevelFeedbackNodeOverride {
  label?: string;
  text?: string;
  effectPreset?: string;
  tileTarget?: LevelFeedbackTileTarget;
}

export interface LevelFeedbackPuzzle {
  beats?: LevelFeedbackBeat[];
  nodes?: Record<string, LevelFeedbackNodeOverride>;
}

export interface LevelFeedback {
  puzzles?: Record<string, LevelFeedbackPuzzle>;
}

export interface LevelDocument {
  schemaVersion: string;
  id: string;
  title: string;
  order: number;
  status: "draft" | "validated" | "playtested" | "done";
  syllabusObjectiveIds: string[];
  conceptIds: string[];
  roomId: string;
  backgroundId?: string;
  dialogueIds: string[];
  gateIds: string[];
  puzzleIds?: string[];
  map: LevelMapNode;
  evidence: LevelEvidenceRule[];
  unlocks: LevelUnlock[];
  nextLevelIds: string[];
  coop: LevelCoop;
  authoring?: LevelAuthoring;
  feedback?: LevelFeedback;
}

/* ------------------------------------------------------------------ */
/* Dialogue                                                            */
/* ------------------------------------------------------------------ */

export type DialogueCondition =
  | { type: "hasAbility"; id: string }
  | { type: "hasFlag"; id: string }
  | { type: "conceptKnown"; id: string }
  | { type: "playerCount"; value: number };

export interface RecordEvidenceEffect {
  type: "recordEvidence";
  event: string;
  gateId?: string;
  conceptId?: string;
  promptId?: string;
  objectiveId?: string;
  answer?: string;
  correct?: boolean;
}

export type DialogueEffect =
  | { type: "setFlag"; flagId: string; value: boolean }
  | { type: "revealConcept"; conceptId: string }
  | { type: "unlockAbility"; id: string }
  | { type: "startGate"; gateId: string }
  | { type: "revealMap"; nodeId: string }
  | { type: "playCue"; cue: string }
  | RecordEvidenceEffect;

export type GateEffect = DialogueEffect;

export interface DialogueChoice {
  id: string;
  text: string;
  next: string | null;
}

export interface DialogueNode {
  text: string;
  speaker?: string;
  portrait?: string;
  next?: string | null;
  choices?: DialogueChoice[];
  effects?: DialogueEffect[];
  condition?: DialogueCondition;
}

export interface DialogueDocument {
  schemaVersion: string;
  id: string;
  speaker: string;
  portrait?: string;
  start: string;
  nodes: Record<string, DialogueNode>;
}

/* ------------------------------------------------------------------ */
/* Gate                                                                */
/* ------------------------------------------------------------------ */

export type GateType = "ability" | "concept" | "flag";

export interface SingleChoicePuzzle {
  type: "singleChoice";
  options: Array<{ id: string; text: string }>;
  answerId: string;
}

export interface SequencePuzzle {
  type: "sequence";
  items: string[];
  answer: string[];
}

export interface MatchPuzzle {
  type: "match";
  left: string[];
  right: string[];
  answer: Record<string, string>;
}

export type GatePuzzle = SingleChoicePuzzle | SequencePuzzle | MatchPuzzle;

export interface GateDocument {
  schemaVersion: string;
  id: string;
  type: GateType;
  objectiveId: string;
  conceptIds: string[];
  prompt: string;
  puzzle?: GatePuzzle;
  hints: string[];
  onSolve: GateEffect[];
  onFail: GateEffect[];
}

export type GateAnswer =
  | string
  | string[]
  | Record<string, string>
  | null;

export interface GateEvaluation {
  correct: boolean;
  reason?: string;
  expected?: GateAnswer;
}

/* ------------------------------------------------------------------ */
/* Mapping and licences                                                */
/* ------------------------------------------------------------------ */

export interface ObjectiveMapping {
  levels: string[];
  dialogues: string[];
  gates: string[];
  evidence: string[];
  debrief?: string;
}

export interface ConceptMapping {
  levels: string[];
  dialogues: string[];
  scanTargets: string[];
  mapLabels: string[];
}

export interface MappingDocument {
  schemaVersion: string;
  syllabusId: string;
  packId: string;
  objectives: Record<string, ObjectiveMapping>;
  concepts: Record<string, ConceptMapping>;
}

export interface LicenceEntry {
  file: string;
  type: string;
  source: string;
  author: string;
  license: string;
  url?: string;
  modified?: string;
  aiGenerated?: boolean;
}

export interface LicenceDocument {
  schemaVersion: string;
  assets: LicenceEntry[];
}

/* ------------------------------------------------------------------ */
/* Loaded content bundle                                               */
/* ------------------------------------------------------------------ */

export interface PackContent {
  pack: PackDocument;
  syllabus: Syllabus;
  theme: ThemeDocument;
  mapping: MappingDocument;
  licenses: LicenceDocument;
  levels: LevelDocument[];
  rooms: Record<string, RoomDocument>;
  dialogues: Record<string, DialogueDocument>;
  gates: Record<string, GateDocument>;
  puzzles: Record<string, PuzzleDocument>;
  materials?: MaterialsDocument;
}

export interface LevelBundle {
  level: LevelDocument;
  room: RoomDocument;
  dialogues: DialogueDocument[];
  gates: GateDocument[];
  puzzles: PuzzleDocument[];
}
