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

/**
 * Minimal effect contract for the feedback domain.
 *
 * Phase 6 (ADR-0013) owns the stage, path, visual, and tile vocabulary. The
 * feedback domain only needs a stable identity and attribution so effects can
 * be carried by surfaces and cues without importing the world.
 */
export interface EffectPlan {
  readonly id: string;
  readonly actor: PlayerId | null;
  readonly owner: FeedbackOwner;
  readonly accent?: "p1" | "p2" | "neutral";
}

/** A running effect handed to the world effect sink in a later phase. */
export interface EffectInstance {
  readonly id: string;
  readonly planId: string;
  readonly startedTick: number;
  readonly remainingTicks?: number;
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
  effects: readonly EffectPlan[];
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
