import type {
  PuzzleDocument,
  PuzzleEvent,
  PuzzleEventType,
  PuzzleLink,
  PuzzleLinkType,
  PuzzleNode,
  PuzzleNodeRunState,
  PuzzleRunState,
} from "../puzzle";

export type PlayerId = "p1" | "p2";

export type SurfaceId = string;

export type FeedbackOwner = PlayerId | "shared";

export type FeedbackAudience = "owner" | "both";

export type FeedbackSeverity = "neutral" | "positive" | "warning" | "critical";

/** Closed semantic vocabulary from ADR-0012. */
export type FeedbackCapability =
  | "affordance"
  | "binary"
  | "meter"
  | "counter"
  | "container"
  | "carrier"
  | "barrier"
  | "conductor"
  | "outcome";

/** Closed state vocabulary; engine strings map into this set. */
export type FeedbackState =
  | "idle"
  | "available"
  | "active"
  | "progress"
  | "complete"
  | "blocked"
  | "expired"
  | "reset";

export type FeedbackPresentation =
  | "prompt"
  | "banner"
  | "stateSwap"
  | "hudMeter"
  | "hudStatus"
  | "tracker"
  | "socketFill"
  | "outline"
  | "pathGlow"
  | "screenCaption"
  | "speechBubble"
  | "playerCaption"
  | "modal"
  | "anchoredPanel";

export type RejectionReason =
  | "empty"
  | "wrong-shape"
  | "wrong-tag"
  | "condition-unmet"
  | "cooldown"
  | "out-of-range"
  | "locked"
  | "cleared";

export type FeedbackResult =
  | "accepted"
  | "rejected"
  | "blocked"
  | "completed"
  | "started";

export interface Vec2 {
  x: number;
  y: number;
}

export type FeedbackAnchor =
  | {
      kind: "entity";
      entityId: string;
      socket?: string;
      offset?: Vec2;
      fallback?: "hud";
    }
  | { kind: "player"; playerId: PlayerId; socket?: string; offset?: Vec2 }
  | {
      kind: "node";
      nodeId: string;
      entityId?: string;
      socket?: string;
      fallback?: "hud";
    }
  | { kind: "tile"; layer: string; x: number; y: number }
  | {
      kind: "tileRegion";
      layer: string;
      x1: number;
      y1: number;
      x2: number;
      y2: number;
    }
  | { kind: "world"; point: Vec2; offset?: Vec2 }
  | { kind: "hud"; slot?: "top" | "bottom" | "left" | "right" }
  | { kind: "screen"; x?: number; y?: number };

export type FeedbackSourceKind = "entity" | "node" | "system";

export interface SourceRef {
  kind: FeedbackSourceKind;
  id: string;
}

export interface FeedbackChoice {
  id: string;
  label: string;
}

export interface FeedbackProgress {
  value: number;
  max: number;
  unit?: "ticks" | "seconds";
}

export interface FeedbackContent {
  speaker?: string;
  text?: string;
  choices?: readonly FeedbackChoice[];
  selectedChoiceId?: string;
  progress?: FeedbackProgress;
}

export interface FeedbackLifetime {
  sticky: boolean;
  ttlTicks?: number;
  fadeTicks?: number;
}

export type FeedbackInteractionMode = "none" | "acknowledge" | "choice" | "text";

export type FeedbackFocus = "soft" | "hard";

export type FeedbackMovement = "free" | "freeze-owner" | "freeze-all";

export interface FeedbackInteraction {
  mode: FeedbackInteractionMode;
  focus: FeedbackFocus;
  movement: FeedbackMovement;
  maxDistance?: number;
}

export interface FeedbackAccessibility {
  announce: boolean;
  textAlternative?: string;
}

export interface FeedbackVisual {
  severity: FeedbackSeverity;
  icon?: string;
  paletteToken?: string;
}

export interface FeedbackOwnership {
  owner: FeedbackOwner;
  audience: FeedbackAudience;
  interaction: FeedbackInteraction;
}

export interface FeedbackLabels {
  subject?: string;
  target?: string;
  actor?: string;
}

export type EffectCancelPolicy =
  | "onSourceInactive"
  | "onTargetGone"
  | "manual";

export type EffectLayer =
  | "background"
  | "tiles"
  | "entities"
  | "foreground"
  | "hud";

export type EffectEasing = "linear" | "easeIn" | "easeOut" | "easeInOut";

export type AnchorRef =
  | { kind: "entity"; id: string; socket?: string }
  | { kind: "player"; id: PlayerId; socket?: string }
  | { kind: "tile"; layer: string; x: number; y: number }
  | {
      kind: "tileRegion";
      layer: string;
      x1: number;
      y1: number;
      x2: number;
      y2: number;
    }
  | { kind: "world"; x: number; y: number }
  | { kind: "hud"; slot?: "top" | "bottom" | "left" | "right" };

export type TileTarget =
  | { kind: "tile"; layer: string; x: number; y: number }
  | {
      kind: "tileRegion";
      layer: string;
      x1: number;
      y1: number;
      x2: number;
      y2: number;
    };

/**
 * World-facing tile appearance operation. Feedback only defines the closed
 * shape; `game` maps the resolved stage into the world port.
 */
export interface TileVisualOp {
  target: TileTarget;
  op: "swap" | "tint" | "alpha" | "overlay" | "sequence";
  value: string | number;
  revert: boolean;
  ttlTicks?: number;
}

export type Direction =
  | { kind: "angle"; radians: number }
  | { kind: "vector"; x: number; y: number }
  | { kind: "toward"; target: AnchorRef }
  | { kind: "facing"; entityId: string };

export interface EffectSource {
  anchor: AnchorRef;
  offset?: Vec2;
  direction?: Direction;
  spreadRadians?: number;
  space?: "world" | "local";
  followFacing?: boolean;
}

export type EffectPath =
  | { kind: "point" }
  | { kind: "segment"; from: AnchorRef; to: AnchorRef; curve?: number }
  | { kind: "polyline"; points: AnchorRef[]; curve?: number }
  | {
      kind: "arc";
      center: AnchorRef;
      radius: number;
      startAngle: number;
      endAngle: number;
    }
  | {
      kind: "ray";
      from: AnchorRef;
      direction: Direction;
      length: number;
      spread?: number;
    }
  | { kind: "radial"; from: AnchorRef; radius: number; count?: number };

export type EffectVisual =
  | { kind: "orb"; assetId?: string; trail?: boolean; size?: number }
  | { kind: "beam"; assetId?: string; width?: number; pulse?: boolean }
  | { kind: "ring"; assetId?: string; radius?: number }
  | {
      kind: "particleBurst";
      assetId?: string;
      count?: number;
      speed?: number;
    }
  | {
      kind: "particleStream";
      assetId?: string;
      rate?: number;
      length?: number;
    }
  | { kind: "spriteSwap"; target: AnchorRef; assetId: string }
  | { kind: "tint"; target: AnchorRef; color: string; fadeTicks?: number }
  | { kind: "dissolve"; target: AnchorRef; assetId?: string }
  | { kind: "tileSwap"; target: TileTarget; tile: string; revert?: boolean }
  | { kind: "tileTint"; target: TileTarget; color: string; revert?: boolean }
  | {
      kind: "tileOverlay";
      target: TileTarget;
      assetId: string;
      revert?: boolean;
    }
  | { kind: "tileAlpha"; target: TileTarget; alpha: number; revert?: boolean }
  | {
      kind: "tileSequence";
      target: TileTarget;
      frames: string[];
      fps?: number;
      revert?: boolean;
    }
  | { kind: "decal"; target: AnchorRef; assetId: string };

export type EffectOperator = EffectVisual["kind"];

export type EffectPathKind = EffectPath["kind"];

export interface EffectTiming {
  delayTicks?: number;
  durationTicks?: number;
  repeat?: number;
  easing?: EffectEasing;
  stagger?: { kind: "none" | "fromSource" | "byIndex"; ticks: number };
}

export type EffectLifetime =
  | { kind: "oneShot" }
  | {
      kind: "persistent";
      until: "sourceInactive" | "targetGone" | "manual";
    };

export interface EffectBinding {
  /** Re-resolve moving anchors every render frame. */
  follow?: boolean;
  /** Ride a moving object instead of the stage source. */
  attachTo?: AnchorRef;
  space?: "world" | "local";
}

export interface EffectStage {
  visual: EffectVisual;
  source?: EffectSource;
  path?: EffectPath;
  targets?: readonly AnchorRef[];
  timing: EffectTiming;
  lifetime?: EffectLifetime;
  binding: EffectBinding;
  layer: EffectLayer;
}

/** Declarative cosmetic effect plan from ADR-0013. */
export interface EffectPlan {
  readonly id: string;
  readonly actor: PlayerId | null;
  readonly owner: FeedbackOwner;
  readonly accent?: "p1" | "p2" | "neutral";
  readonly stages: readonly EffectStage[];
  readonly cancel?: EffectCancelPolicy;
}

/**
 * A running effect handed to the world effect sink.
 *
 * Stages keep logical anchors; the world renderer resolves them every frame.
 * Feedback owns timing and cancellation, not pixels.
 */
export interface EffectInstance {
  readonly id: string;
  readonly planId: string;
  readonly ownerSurfaceId: string;
  readonly actor: PlayerId | null;
  readonly owner: FeedbackOwner;
  readonly accent?: "p1" | "p2" | "neutral";
  readonly startedTick: number;
  readonly ageTicks: number;
  readonly remainingTicks?: number;
  readonly stages: readonly EffectStage[];
  readonly cancel?: EffectCancelPolicy;
}

export interface Conversation {
  dialogueId: string;
  nodeId: string;
  owner: PlayerId;
  entityId: string;
  maxDistance?: number;
  freezeOwner: boolean;
}

export interface FeedbackSurface {
  id: string;
  source: SourceRef;
  actor: PlayerId | null;
  owner: FeedbackOwner;
  audience: FeedbackAudience;
  anchor: FeedbackAnchor;
  presentation: FeedbackPresentation;
  content: FeedbackContent;
  state: FeedbackState;
  reason?: RejectionReason;
  severity: FeedbackSeverity;
  lifetime: FeedbackLifetime;
  interaction: FeedbackInteraction;
  priority: number;
  a11y: FeedbackAccessibility;
  effects?: readonly EffectPlan[];
  conversation?: Conversation;
}

export interface FeedbackCue {
  id: string;
  seq: number;
  cause: string;
  source: SourceRef;
  actor: PlayerId | null;
  owner: FeedbackOwner;
  audience: FeedbackAudience;
  anchor: FeedbackAnchor;
  presentation: FeedbackPresentation;
  content: FeedbackContent;
  state: FeedbackState;
  reason?: RejectionReason;
  severity: FeedbackSeverity;
  priority: number;
  ttlTicks: number;
  remainingTicks: number;
  a11y: FeedbackAccessibility;
  effects?: readonly EffectPlan[];
}

export type FeedbackBeatState = "pending" | "active" | "done";

export interface FeedbackBeat {
  id: string;
  label: string;
  state: FeedbackBeatState;
  nodes: readonly string[];
}

export interface BeatSpec {
  id: string;
  label: string;
  nodes: readonly string[];
}

export interface FeedbackView {
  surfaces: readonly FeedbackSurface[];
  cues: readonly FeedbackCue[];
  beats: readonly FeedbackBeat[];
}

export interface FeedbackFrame extends FeedbackView {
  /** Monotonic frame sequence; increments once per director tick. */
  seq: number;
  tick: number;
  /** Running resolved effects; plans stay on surfaces and cues. */
  effects: readonly EffectInstance[];
}

export interface FeedbackSignal {
  source: SourceRef;
  actor?: PlayerId | null;
  owner?: FeedbackOwner;
  anchor: FeedbackAnchor;
  capability: FeedbackCapability;
  state: FeedbackState;
  content: FeedbackContent;
  presentation?: FeedbackPresentation;
  reason?: RejectionReason;
  severity?: FeedbackSeverity;
  priority?: number;
  lifetime?: FeedbackLifetime;
  interaction?: FeedbackInteraction;
  a11y?: FeedbackAccessibility;
  effects?: readonly EffectPlan[];
}

export interface FeedbackSurfaceSpec {
  id?: string;
  capability: FeedbackCapability;
  source: SourceRef;
  actor?: PlayerId | null;
  owner?: FeedbackOwner;
  audience?: FeedbackAudience;
  anchor: FeedbackAnchor;
  presentation: FeedbackPresentation;
  content: FeedbackContent;
  state: FeedbackState;
  reason?: RejectionReason;
  severity?: FeedbackSeverity;
  lifetime?: FeedbackLifetime;
  interaction?: FeedbackInteraction;
  priority?: number;
  a11y?: FeedbackAccessibility;
  effects?: readonly EffectPlan[];
  conversation?: Conversation;
}

export interface FeedbackCueSpec {
  cause: string;
  source: SourceRef;
  actor?: PlayerId | null;
  owner?: FeedbackOwner;
  audience?: FeedbackAudience;
  anchor: FeedbackAnchor;
  presentation: FeedbackPresentation;
  content: FeedbackContent;
  state: FeedbackState;
  reason?: RejectionReason;
  severity?: FeedbackSeverity;
  priority?: number;
  ttlTicks?: number;
  a11y?: FeedbackAccessibility;
  effects?: readonly EffectPlan[];
}

export interface CueRecipe {
  capability: FeedbackCapability;
  state?: FeedbackState;
  reason?: RejectionReason;
  cause?: string;
  owner?: FeedbackOwner;
  audience?: FeedbackAudience;
  text?: string;
  presentation?: FeedbackPresentation;
  severity?: FeedbackSeverity;
  priority?: number;
  ttlTicks?: number;
  anchor?: FeedbackAnchor;
  interaction?: FeedbackInteraction;
  a11y?: FeedbackAccessibility;
  labels?: FeedbackLabels;
  /** Named cosmetic effect preset (ADR-0013). */
  effectPreset?: string;
}

export type EventCoverage =
  | { kind: "cue"; recipe: CueRecipe }
  | { kind: "silent"; reason: string };

export interface FeedbackProjectionContext {
  anchor: FeedbackAnchor;
  label: string;
  text?: string;
  effectPreset?: string;
}

export interface NodeFeedbackDescriptor<N extends PuzzleNode = PuzzleNode> {
  capabilities: readonly FeedbackCapability[];
  project(
    node: N,
    state: PuzzleNodeRunState,
    context?: FeedbackProjectionContext,
  ): FeedbackSurfaceSpec[];
  effects?(
    node: N,
    state: PuzzleNodeRunState,
    context?: FeedbackProjectionContext,
  ): EffectPlan[];
  cues?: Partial<Record<PuzzleEventType, CueRecipe>>;
}

export interface LinkFeedbackDescriptor {
  capabilities: readonly FeedbackCapability[];
  effects?(link: PuzzleLink): EffectPlan[];
  cues?: Partial<Record<PuzzleLinkType, CueRecipe>>;
}

export interface FeedbackNodeOverride {
  label?: string;
  text?: string;
  effectPreset?: string;
}

export interface FeedbackProjection {
  document: PuzzleDocument;
  state: PuzzleRunState;
  beats?: readonly BeatSpec[];
  overrides?: Readonly<Record<string, FeedbackNodeOverride>>;
}

export type FeedbackFact =
  | {
      kind: "puzzle.event";
      /** Optional owner puzzle, used when a level has more than one puzzle. */
      puzzleId?: string;
      event: PuzzleEvent;
      actor: PlayerId | null;
      source: SourceRef;
    }
  | {
      kind: "action.outcome";
      actor: PlayerId;
      action: string;
      result: FeedbackResult;
      reason?: RejectionReason;
      target?: SourceRef;
      /** Optional authored/custom copy. */
      text?: string;
    }
  | {
      kind: "conversation.start";
      actor: PlayerId;
      entityId: string;
      dialogueId: string;
    }
  | {
      kind: "system.outcome";
      outcome: string;
      source: SourceRef;
      /** Optional authored/custom copy. */
      text?: string;
      severity?: FeedbackSeverity;
    };

export interface FeedbackDirectorOptions {
  /** TTL applied to transient cues when a recipe does not specify one. */
  defaultCueTtlTicks?: number;
  /**
   * Optional liveness predicate for logical anchors. The game injects this so
   * feedback can cancel `onTargetGone` effects without importing world state.
   */
  isAnchorAlive?: (anchor: AnchorRef) => boolean;
}

export interface FeedbackDirector {
  /** Queues a fact for the next `tick`. */
  ingest(fact: FeedbackFact): void;
  ingestAll(facts: readonly FeedbackFact[]): void;
  /** Queues a persistent projection for the next `tick`. */
  projectSticky(input: FeedbackProjection): void;
  /**
   * Create or replace a runtime-owned persistent surface (for example a
   * conversation or the stuck hint affordance). This writes immediately so a
   * direct interaction can be observed before the next fixed tick.
   */
  putSurface(spec: FeedbackSurfaceSpec & { id: string }): void;
  /** Remove a runtime-owned surface. */
  removeSurface(surfaceId: SurfaceId): void;
  /** Runs the Phase 3 tick systems in deterministic order. */
  tick(dt: number): void;
  /** Returns the current ordered view without creating a frame. */
  view(): FeedbackView;
  /** Runs the frame systems and returns the snapshot-safe frame. */
  frame(): FeedbackFrame;
  /** Despawns all feedback entities and resets sequence counters. */
  reset(): void;
}

/** Internal cue bookkeeping stored alongside the surface components. */
export interface CueState {
  seq: number;
  cause: string;
  ttlTicks: number;
  remainingTicks: number;
}
