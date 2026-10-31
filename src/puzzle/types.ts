/**
 * Pure puzzle-authoring contract.
 *
 * A puzzle is a typed dataflow graph. It never contains executable content:
 * node types, link types, predicates, and reset/evidence/reward fields are a
 * closed vocabulary. The evaluator in `runtime.ts` consumes a small immutable
 * world snapshot and is independent of Matter.js, Phaser, the DOM, and pack
 * loading.
 */

export const PUZZLE_SCHEMA_VERSION = "1.1";

export type TetherPolicy = "normal" | "stretch" | "off";

export type PuzzleNodeType =
  | "prop"
  | "receptor"
  | "pulseSource"
  | "plate"
  | "relay"
  | "gate"
  | "timer"
  | "counter"
  | "zone"
  | "trigger";

export type PuzzleLinkType =
  | "pulse"
  | "bind"
  | "press"
  | "release"
  | "enter"
  | "exit"
  | "increment"
  | "start"
  | "stop"
  | "reset"
  | "elapsed"
  | "reached"
  | "activate"
  | "deactivate"
  | "open"
  | "close"
  | "clear";

export type PuzzleActivationMode = "roomStart" | "zoneEnter" | "interact";

export interface PuzzleRect {
  /** Pixel-space top-left x. */
  x: number;
  /** Pixel-space top-left y. */
  y: number;
  width: number;
  height: number;
}

export interface PuzzlePoint {
  x: number;
  y: number;
}

export interface PuzzleNodeBase {
  id: string;
  type: PuzzleNodeType;
  /** Optional room entity used for rendering and proximity. */
  entityId?: string;
}

export interface PropNode extends PuzzleNodeBase {
  type: "prop";
  entityId: string;
  tags: string[];
  shape: string;
  /** Mock-world spawn used by the headless solution harness. */
  spawn?: PuzzlePoint;
}

export interface ReceptorNode extends PuzzleNodeBase {
  type: "receptor";
  accepts: {
    tag?: string;
    shape?: string;
  };
  rect: PuzzleRect;
  snap: PuzzlePoint;
}

export interface PulseSourceNode extends PuzzleNodeBase {
  type: "pulseSource";
  entityId: string;
  ability: "pulse";
  cooldownTicks: number;
  travelTicks: number;
  range: number;
}

export interface PlateNode extends PuzzleNodeBase {
  type: "plate";
  rect: PuzzleRect;
  detects: Array<"player" | "prop">;
  minimum: number;
  countCarried: boolean;
}

export interface RelayNode extends PuzzleNodeBase {
  type: "relay";
  mode: "allOf" | "anyOf" | "not";
}

export interface GateNode extends PuzzleNodeBase {
  type: "gate";
  entityId?: string;
  initial: "closed" | "open";
  latched: boolean;
}

export interface TimerNode extends PuzzleNodeBase {
  type: "timer";
  durationTicks: number;
  repeat: boolean;
}

export interface CounterNode extends PuzzleNodeBase {
  type: "counter";
  target: number;
  comparison: "==" | ">=";
}

export interface ZoneNode extends PuzzleNodeBase {
  type: "zone";
  rect: PuzzleRect;
  detects: Array<"player" | "prop">;
  minimum: number;
  countCarried: boolean;
}

export interface TriggerNode extends PuzzleNodeBase {
  type: "trigger";
  once: boolean;
}

export type PuzzleNode =
  | PropNode
  | ReceptorNode
  | PulseSourceNode
  | PlateNode
  | RelayNode
  | GateNode
  | TimerNode
  | CounterNode
  | ZoneNode
  | TriggerNode;

export interface PuzzleLink {
  from: string;
  to: string;
  type: PuzzleLinkType;
}

export type PuzzlePredicate =
  | { type: "gateOpen"; gateId: string }
  | { type: "receptorBound"; receptorId: string }
  | { type: "platePressed"; plateId: string }
  | { type: "relayActive"; relayId: string }
  | { type: "timerElapsed"; timerId: string }
  | { type: "counterReached"; counterId: string }
  | { type: "zoneOccupied"; zoneId: string }
  | { type: "propState"; propId: string; state: PropRunState }
  | { type: "flagSet"; flagId: string }
  | { type: "allOf"; of: PuzzlePredicate[] }
  | { type: "anyOf"; of: PuzzlePredicate[] }
  | { type: "not"; of: PuzzlePredicate };

export interface PuzzleRewards {
  abilities?: string[];
  flags?: string[];
  mapNodes?: string[];
}

export interface PuzzleEvidenceConfig {
  onSolve: string[];
  counters: string[];
}

export type PuzzleSolutionAction =
  | { action: "move"; actor: string; x: number; y: number }
  | { action: "pickup"; actor: string; target: string }
  | { action: "drop"; actor: string; target: string }
  | { action: "place"; actor: string; target: string }
  | { action: "throw"; actor: string; target: string }
  | { action: "pulse"; actor: string; target: string }
  | { action: "wait"; ticks: number }
  | { action: "reset" }
  | { action: "scan"; actor: string; target?: string };

export interface PuzzleDocument {
  schemaVersion: string;
  id: string;
  title: string;
  objectiveIds: string[];
  conceptIds: string[];
  activation: {
    mode: PuzzleActivationMode;
    zoneId?: string;
    entityId?: string;
  };
  tether: TetherPolicy;
  nodes: PuzzleNode[];
  links: PuzzleLink[];
  win: PuzzlePredicate;
  reset: {
    props: string[];
    nodes: string[];
  };
  evidence: PuzzleEvidenceConfig;
  rewards: PuzzleRewards;
  solution: PuzzleSolutionAction[];
  hints: string[];
}

export type PropRunState =
  | "free"
  | "carried"
  | "placed"
  | "docked"
  | "cleared";

export interface PuzzleActorSnapshot {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  active: boolean;
}

export interface PuzzlePropSnapshot extends PuzzleActorSnapshot {
  state: PropRunState;
  tags: string[];
  shape: string;
  carriedBy?: string | null;
}

export interface PuzzleWorldSnapshot {
  tick: number;
  players: PuzzleActorSnapshot[];
  props: PuzzlePropSnapshot[];
  flags?: Record<string, boolean>;
}

export type PuzzleEventType =
  | "pulse"
  | "pulseArrived"
  | "receptorBound"
  | "receptorRejected"
  | "platePress"
  | "plateRelease"
  | "zoneEnter"
  | "zoneExit"
  | "triggerFired"
  | "timerElapsed"
  | "counterReached"
  | "gateOpen"
  | "gateClose"
  | "relayActive"
  | "relayInactive"
  | "propCleared"
  | "solved";

export interface PuzzleEvent {
  type: PuzzleEventType;
  nodeId: string;
  propId?: string;
  actorId?: string;
  message?: string;
}

export interface PuzzleTickResult {
  events: PuzzleEvent[];
  solvedNow: boolean;
  rewards: PuzzleRewards;
}

export interface PuzzleNodeRunState {
  state: string;
  active: boolean;
  count: number;
  remaining: number;
  fired: boolean;
  occupiedBy: string | null;
}

export interface PuzzlePulseState {
  sourceId: string;
  remainingTicks: number;
  actorId?: string;
}

/**
 * Serializable graph state. Evidence counters survive an intentional puzzle
 * reset; node state and in-flight pulses do not.
 */
export interface PuzzleRunState {
  puzzleId: string;
  tick: number;
  solved: boolean;
  nodes: Record<string, PuzzleNodeRunState>;
  counters: Record<string, number>;
  pulses: PuzzlePulseState[];
  lastError: string | null;
}

export interface PuzzleValidationIssue {
  code: string;
  message: string;
}

export interface PuzzleValidationResult {
  ok: boolean;
  issues: PuzzleValidationIssue[];
}
