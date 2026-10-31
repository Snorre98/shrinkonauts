# Interface contract

Public operations introduced or changed by the puzzle-engine, M1.75 feedback, and
M1.8 material/pattern work. Source ADRs: ADR-0001–0017. Existing operations keep
their current signatures.

## Implementation status

| Area | Status |
|---|---|
| ECS kernel public API | Implemented |
| Feedback director, surfaces, cues, descriptors, effects | Implemented |
| World effect/tile visual ports | Implemented |
| Entity conversations and per-player surface routing | Implemented |
| Level `feedback` content block | Implemented |
| Feedback validation vocabulary injection | Implemented |
| Material/pattern catalog, tile grids, autotiling, variants | Implemented; `wang` deferred |
| Atlas assets, regions, frame refs, tile variant sets | Implemented |
| World/object/background pattern projection and UI material parity | Implemented; animation and image/atlas UI patterns deferred |
| `clear` link and `propCleared` | Implemented |
| `locked`, `unlock`, `requires`, `message`, `linkBlocked` | Deferred |
| Physical gate-body operations | Deferred |
| Per-level debrief prompt overrides | Deferred |
| Side-level travel and `returnTo` | Deferred |

Deferred entries describe accepted target contracts. They are not callable in
the current code.

## 1. `pack` — content and validation

```ts
interface LevelDocument {
  schemaVersion: string; // 1.x; 1.1 introduces `feedback`
  // existing fields
  feedback?: LevelFeedback;
}

interface LevelFeedback {
  puzzles?: Record<string, LevelFeedbackPuzzle>;
}

interface LevelFeedbackPuzzle {
  beats?: LevelFeedbackBeat[];
  nodes?: Record<string, LevelFeedbackNodeOverride>;
}

interface LevelFeedbackBeat {
  id: string;
  label: string;
  nodes: string[];
}

interface LevelFeedbackNodeOverride {
  label?: string;
  text?: string;
  effectPreset?: string;
  tileTarget?: LevelTileTarget;
}

type LevelTileTarget =
  | { kind: "tile"; layer: string; x: number; y: number }
  | {
      kind: "tileRegion";
      layer: string;
      x1: number;
      y1: number;
      x2: number;
      y2: number;
    };
```

All feedback fields are optional. A level without `feedback` parses and runs
with capability defaults.

```ts
interface FeedbackValidationVocabulary {
  effectPresetIds: readonly string[];
  tilePathPreset: string;
  nodeEffectSockets?: Readonly<Record<string, string | undefined>>;
}

interface PackValidationInput {
  room: RoomDocument;
  theme: ThemeDocument;
  finalManifest?: AssetManifest | null;
  packManifest?: AssetManifest | null;
  fileExists: (src: string) => boolean;
  content?: PackContent;
  feedbackVocabulary?: FeedbackValidationVocabulary;
}

function validatePack(input: PackValidationInput): PackValidationResult;
```

`validatePack` is pure and never imports `feedback`. Scripts and tests build the
vocabulary from feedback exports:

```ts
const feedbackVocabulary = {
  effectPresetIds: effectPresetIds(),
  tilePathPreset: "fx.tile.path",
  nodeEffectSockets: NODE_EFFECT_SOCKETS,
};
```

If content authors feedback and no vocabulary is supplied, validation reports
`FEEDBACK_VOCABULARY_MISSING` rather than silently skipping enforcement.

## 1a. `materials`, `assets`, and room/theme bindings

```ts
function createMaterialCatalog(document?: MaterialsDocument): MaterialCatalog;
function materialById(catalog: MaterialCatalog, id: string): MaterialDefinition | undefined;
function patternById(catalog: MaterialCatalog, id: string): PatternDefinition | undefined;
function resolveMaterialBinding(
  catalog: MaterialCatalog,
  binding: MaterialBinding,
): Result<ResolvedMaterialBinding, string>;
function autotileMask(
  grid: MaterialGrid,
  x: number,
  y: number,
  materialId: string,
): number;
function selectVariant(
  rule: Pick<TileMaterialRule, "materialId">,
  mask: number,
  x: number,
  y: number,
  seed: number,
  variants: readonly AtlasFrameRef[] | undefined,
): AtlasFrameRef | null;
function createPatternProvider(options?: PatternProviderOptions): PatternProvider;

interface AssetsModule {
  resolveFrame(ref: AtlasFrameRef): ResolvedFrame | null;
  atlasRegion(assetId: AssetId, frame: string): AtlasRegion | null;
}
```

`PatternProvider.resolve(definition, overrides)` returns a cached
`PatternResource` with a procedural bitmap/CSS data URL or an image/atlas
reference. It is pure and renderer-agnostic.

`RoomSceneConfig` gains optional `materials` and `patterns`; `ui` gains
`resolveUiMaterialStyles`, `applyUiMaterialStyles`, and
`clearUiMaterialStyles`. `parseMaterials` is the pack parser for
`materials.json`.

Background bindings use `RoomBackgroundLayer.materialId` and
`.pattern`. A background `world` pattern samples the layer's parallax space;
`screen` is viewport-fixed and `local` is layer-local.

## 2. `ecs` — deterministic kernel

```ts
type EntityId = string & { readonly [entityBrand]: never };
function createEntityId(value: string): EntityId;

interface ComponentType<T> {
  readonly name: string;
  readonly [componentBrand]: T;
}
function defineComponent<T>(name: string): ComponentType<T>;

type SystemPhase = "tick" | "frame";

interface EcsWorld {
  spawn(id?: EntityId): EntityId;
  despawn(entity: EntityId): void;
  add<T>(entity: EntityId, type: ComponentType<T>, value: T): void;
  get<T>(entity: EntityId, type: ComponentType<T>): T | undefined;
  remove<T>(entity: EntityId, type: ComponentType<T>): void;
  query(...types: ComponentType<unknown>[]): EntityId[];
  addSystem(system: System): void;
  tick(dt: number, context?: Record<string, unknown>): void;
  frame(context?: FrameContext): void;
}

function createEcsWorld(): EcsWorld;
```

Systems run in registration order. Entities and components iterate in insertion
order. The kernel imports no game, puzzle, feedback, DOM, Phaser, or Matter code.

## 3. `feedback` — surfaces, cues, descriptors, effects

### 3.1 Closed vocabularies

```ts
type FeedbackCapability =
  | "affordance" | "binary" | "meter" | "counter" | "container"
  | "carrier" | "barrier" | "conductor" | "outcome";

type FeedbackState =
  | "idle" | "available" | "active" | "progress"
  | "complete" | "blocked" | "expired" | "reset";

type FeedbackPresentation =
  | "prompt" | "banner" | "stateSwap" | "hudMeter" | "hudStatus"
  | "tracker" | "socketFill" | "outline" | "pathGlow" | "screenCaption"
  | "speechBubble" | "playerCaption" | "modal" | "anchoredPanel";

type RejectionReason =
  | "empty" | "wrong-shape" | "wrong-tag" | "condition-unmet"
  | "cooldown" | "out-of-range" | "locked" | "cleared";
```

### 3.2 Surface, cue, and frame

```ts
interface FeedbackFrame extends FeedbackView {
  seq: number;
  tick: number;
  surfaces: readonly FeedbackSurface[];
  cues: readonly FeedbackCue[];
  beats: readonly FeedbackBeat[];
  effects: readonly EffectInstance[];
}

interface FeedbackSurface {
  id: string;
  source: SourceRef;
  actor: PlayerId | null;
  owner: PlayerId | "shared";
  audience: "owner" | "both";
  anchor: FeedbackAnchor;
  presentation: FeedbackPresentation;
  content: FeedbackContent;
  state: FeedbackState;
  reason?: RejectionReason;
  severity: "neutral" | "positive" | "warning" | "critical";
  lifetime: { sticky: boolean; ttlTicks?: number; fadeTicks?: number };
  interaction: FeedbackInteraction;
  priority: number;
  a11y: { announce: boolean; textAlternative?: string };
  effects?: readonly EffectPlan[];
  conversation?: Conversation;
}
```

`FeedbackCue` adds `seq`, `cause`, `ttlTicks`, and `remainingTicks`. A persistent
surface answers “what is true now?”; a cue answers “what just happened?” and is
deduplicated by cause.

### 3.3 Director

```ts
interface FeedbackDirector {
  ingest(fact: FeedbackFact): void;
  ingestAll(facts: readonly FeedbackFact[]): void;
  projectSticky(input: FeedbackProjection): void;
  putSurface(spec: FeedbackSurfaceSpec & { id: string }): void;
  removeSurface(surfaceId: string): void;
  tick(dt: number): void;
  view(): FeedbackView;
  frame(): FeedbackFrame;
  reset(): void;
}

function createFeedbackDirector(
  options?: FeedbackDirectorOptions,
): FeedbackDirector;
```

The runtime ticks the director once per fixed step and calls `frame()` to obtain
the snapshot-safe view.

### 3.4 Descriptors and coverage

```ts
interface NodeFeedbackDescriptor<N extends PuzzleNode = PuzzleNode> {
  capabilities: readonly FeedbackCapability[];
  project(
    node: N,
    state: PuzzleNodeRunState,
    context?: FeedbackProjectionContext,
  ): FeedbackSurfaceSpec[];
  effects?(...): EffectPlan[];
  cues?: Partial<Record<PuzzleEventType, CueRecipe>>;
}

interface LinkFeedbackDescriptor {
  capabilities: readonly FeedbackCapability[];
  effects?(link: PuzzleLink): EffectPlan[];
  cues?: Partial<Record<PuzzleLinkType, CueRecipe>>;
}

const NODE_FEEDBACK: Record<PuzzleNodeType, NodeFeedbackDescriptor>;
const LINK_FEEDBACK: Record<PuzzleLinkType, LinkFeedbackDescriptor>;
const CAPABILITY_DEFAULTS: Record<FeedbackCapability, CapabilityDefaults>;
```

Adding a node or link type without a descriptor is a compile-time error.
`EVENT_COVERAGE` maps every event type to a cue recipe or an explicit silent
reason.

### 3.5 Effects

```ts
interface EffectPlan {
  id: string;
  actor: PlayerId | null;
  owner: PlayerId | "shared";
  accent?: "p1" | "p2" | "neutral";
  stages: readonly EffectStage[];
  cancel?: "onSourceInactive" | "onTargetGone" | "manual";
}

interface EffectStage {
  visual: EffectVisual;
  source?: EffectSource;
  path?: EffectPath;
  targets?: readonly AnchorRef[];
  timing: EffectTiming;
  lifetime?:
    | { kind: "oneShot" }
    | { kind: "persistent"; until: "sourceInactive" | "targetGone" | "manual" };
  binding: EffectBinding;
  layer: "background" | "tiles" | "entities" | "foreground" | "hud";
}

const EFFECT_PRESETS: Record<string, EffectPreset>;
function effectPresetIds(): EffectPresetId[];
function resolveEffectPreset(
  id: string,
  context: EffectPresetContext,
): EffectPlan | null;
const NODE_EFFECT_SOCKETS: Readonly<
  Partial<Record<PuzzleNodeType, string>>
>;
```

Content may select a named preset only; arbitrary effect graphs are not part of
the level schema in M1.75.

## 4. `world` — effect and tile ports

```ts
interface WorldEffectPort {
  spawn(plan: WorldEffectPlan): string;
  cancel(effectId: string): void;
}

interface TileVisualPort {
  apply(op: TileVisualOp): string;
  revert(opId: string): void;
}

function simplifyForReducedMotion(
  plan: WorldEffectPlan,
): WorldEffectPlan;

class RoomPhysics {
  // implemented
  clearProp(propId: string): boolean;
  resetProp(propId: string): boolean;
  propStates(): Record<string, PropState>;

  // deferred target (not callable)
  setGateOpen?(gateId: string, open: boolean): void;
  gateStates?(): Record<string, boolean>;
  setPropState?(propId: string, state: PropRunState): boolean;
  releaseProp?(propId: string): boolean;
}
```

`WorldEffectPlan` is the resolved, world-facing projection of an `EffectInstance`.
It carries logical anchors, timing, attribution, and cancellation — never
feedback components or `PuzzleRuntime` state. The world never imports feedback.

## 5. `game` — runtime, conversations, input, effects

```ts
class GameRuntime {
  readonly conversations: Map<SurfaceId, ConversationState>;
  startConversation(dialogueId: string, owner: PlayerId, entityId: string): void;
  surfaceAction(surfaceId: string, action: SurfaceAction): void;
  drainEffects(): readonly WorldEffectPlan[];
  debriefPromptList(): DebriefPrompt[];
  // existing snapshot/step/save/evidence methods
}

function routeSurfaceInput(
  context: SurfaceRouteContext,
  playerId: PlayerId,
  actions: PlayerUiActions,
): SurfaceRoute;

function toWorldEffectPlan(instance: EffectInstance): WorldEffectPlan;
```

`RuntimeSnapshot` exposes `feedback: FeedbackFrame`; the old `dialogue` view is
not present. Soft conversations do not enter a blocking state. Hard overlays
(gate, pause, map, concept log, debrief, complete) remain explicit.

Deferred: `travelToSideLevel(levelId)` and the `returnTo` snapshot.

## 6. `ui` — surfaces and input

```ts
interface FeedbackSurfaceRenderer {
  update(frame: FeedbackFrame, world: WorldView, canvasRect: CanvasRect): void;
  clear(): void;
}

interface GameUiCallbacks {
  onSurfaceAction(surfaceId: string, action: SurfaceAction): void;
  // existing modal callbacks for gate/debrief/pause/map/log
}
```

The renderer owns DOM diffing, anchoring, safe-area layout, the `.feedback-live`
region, and keyboard-reachable controls. It does not import puzzle internals.
`WorldView` is the canvas-to-UI projection contract. Map travel view/callback is
deferred.

## 7. `save` — conversations and legacy dialogue

```ts
interface ConversationSnapshot {
  surfaceId: string;
  dialogueId: string;
  nodeId: string;
  owner: PlayerId;
  entityId: string;
}

interface RunSnapshot {
  // existing fields; current schema is 2.1
  conversations?: ConversationSnapshot[];
  /** Legacy single-dialogue save; migrated to one P1-owned conversation on load. */
  dialogue?: { dialogueId: string; nodeId: string };
  // returnTo?: LevelRunSnapshot; — deferred
}
```

Feedback ECS state is ephemeral and never saved. Conversation sessions are run
state and are recreated as surfaces after restore. If the entity or dialogue is
missing, restore closes the conversation with a recovery cue.

## 8. `puzzle` — implemented and deferred

Implemented:

```ts
type PuzzleLinkType = ExistingLinkType | "clear";

interface PuzzleEvent {
  type: PuzzleEventType; // includes propCleared
  nodeId: string;
  propId?: string;
  actorId?: string;
}

type PropRunState =
  | "free" | "carried" | "placed" | "docked" | "cleared";
```

Deferred target (not present in the current type or parser):

```ts
type DeferredPropRunState = PropRunState | "locked";
type DeferredLinkType = PuzzleLinkType | "unlock";

interface DeferredPuzzleLink {
  requires?: string;
  message?: string;
}

type DeferredPuzzleEvent = "propReleased" | "linkBlocked";
```

`unlock`, `locked`, `requires`, authored `message`, and `linkBlocked` are
accepted ADR targets but are not implemented.

## 9. Error surface

| Code | Meaning |
|---|---|
| `FEEDBACK_REFERENCE_MISSING` | feedback puzzle/beat/node reference is missing |
| `FEEDBACK_EFFECT_UNKNOWN` | named effect preset is outside the injected vocabulary |
| `FEEDBACK_TILE_INVALID` | tile layer is missing or target is outside the room |
| `FEEDBACK_LAYOUT_INVALID` | tile-path preset has no tile target |
| `FEEDBACK_VOCABULARY_MISSING` | content authors feedback but validation has no vocabulary |
| `AUDIO_CUE_UNKNOWN` | theme declares an unknown cue name |
| `AUDIO_CUE_MISSING` | cue asset ID does not resolve to audio |
| `PUZZLE_REFERENCE_MISSING` | puzzle node/entity reference is missing |
| `SAVE_RETURN_INVALID` | deferred `returnTo` target validation |

## 10. Invariants

- `puzzle` APIs never touch Matter/Phaser/DOM/save/feedback.
- `ecs` APIs carry no game or feedback types.
- `feedback` APIs never touch DOM/Phaser/Matter/world/game/pack.
- `world` APIs never evaluate puzzle links or win predicates and never import
  feedback.
- `pack` never imports feedback; vocabulary is injected.
- `game` is the only writer of gate/prop synchronization and feedback facts.
- `ui` never writes puzzle or world state; it calls callbacks.
- `save` never performs content validation and never saves feedback ECS state.
- Effects never mutate puzzle, world, or collision state.
