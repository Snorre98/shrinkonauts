# Data model contract

Precise spec for the durable and content formats changed by the engine upgrade.
Source ADRs: ADR-0002–0013. The implementation status table in
[`architecture.md`](../architecture.md) is authoritative where an accepted ADR
target is deferred.

## 1. Puzzle document 1.1

The document remains a declarative typed dataflow. New fields are optional;
existing 1.0 documents parse and behave as before.

### 1.1 Implemented nodes and links

| Item | Status | Notes |
|---|---|---|
| `prop` nodes | Implemented | `free`, `carried`, `placed`, `docked`, `cleared` |
| `gate`, `timer`, `counter`, `zone`, `trigger`, `relay`, `plate`, `receptor`, `pulseSource` | Implemented | Existing typed nodes |
| `clear` link | Implemented | Any non-cleared prop becomes `cleared`; emits `propCleared` |
| `unlock` link | Deferred | Accepted ADR-0004 target |
| `requires` / `message` on links | Deferred | Accepted ADR-0005 target |
| `propReleased` / `linkBlocked` events | Deferred | Accepted ADR-0004/0005 target |
| `locked` prop state | Deferred | Accepted ADR-0004 target |

Implemented prop states:

```text
free | carried | placed | docked | cleared
```

`cleared` is hidden/non-collidable and reset restores the authored state. A
cleared prop has no body. `locked` is not part of the current type or parser.

Implemented link/event behavior:

- a `clear` link changes any non-cleared prop to `cleared`;
- a second `clear` is a no-op and emits no duplicate event;
- `propCleared` carries `nodeId` and `propId`;
- reset restores the prop to its authored state.

Deferred conditional-link semantics:

- `requires` would apply only when the referenced node is active;
- `linkBlocked` would be emitted once per blocked occurrence;
- a blocked link would not mutate its target;
- a blocked pulse would consume its cooldown;
- authored `message` would be surfaced through feedback, not evidence.

## 2. Level document 1.1

The current schema accepts `1.x`. Levels `03-nerve-forest` and
`04-muscle-effector` declare `1.1` because they use the feedback block. A 1.0
level without feedback remains valid and uses capability defaults.

### 2.1 Implemented fields

| Field | Type | Required | Notes |
|---|---|---|---|
| `puzzleIds` | string[] | no | authored puzzles; `feedback.puzzles` keys must be in this list |
| `nextLevelIds` | string[] | no | next authored main-path levels |
| `coop` | `{ supported: boolean; notes?: string }` | yes | co-op metadata |
| `authoring` | object | no | level spec/playtest notes |
| `feedback` | `LevelFeedback` | no | optional labels, beats, effects, tile targets |
| `unlocks` | `LevelUnlock[]` | yes | parsed content metadata; progression use is deferred |

### 2.2 Feedback block

```ts
interface LevelFeedback {
  puzzles?: Record<string, LevelFeedbackPuzzle>;
}

interface LevelFeedbackPuzzle {
  beats?: Array<{ id: string; label: string; nodes: string[] }>;
  nodes?: Record<string, LevelFeedbackNodeOverride>;
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

Rules:

- every `feedback.puzzles` key is one of the level's authored `puzzleIds`;
- beat and node-override IDs must exist in the referenced puzzle;
- `effectPreset` must be a known named preset from the injected vocabulary;
- the tile layer must exist on the level room, and tile coordinates/regions must
  be ordered and inside the room;
- `fx.tile.path` requires a `tileTarget`; a tile target with another preset is a
  warning and is ignored;
- labels are optional on nodes without an override; an override without a label
  is a warning and uses the generated node label;
- conventional `muzzle`/`mouth` sockets are warnings when absent; `center` is
  the silent fallback;
- a puzzle with no hints produces a warning, not a validation failure.

Feedback is ephemeral: it is never written to a save. Sticky surfaces are rebuilt
from puzzle/world state after restore.

### 2.3 Deferred level fields

The accepted target also described `kind: "main" | "side"` and
`debrief: { prompts }`. Neither is present in the current parser. The current
runtime derives debrief prompts from the syllabus and transitions directly to
the next authored level.

## 3. Room document additions

### 3.1 `puzzleGate` entity

| Field | Type | Required | Notes |
|---|---|---|---|
| `components.gate.gateId` | string | yes for a puzzle gate | maps to a puzzle `gate` node |
| `components.anchors` | Record<string, {x,y,direction?}> | no | effect/surface sockets; defaults include centre/top/bottom/left/right |
| `components.body` | body component | no | parsed; physical puzzle-gate-body synchronization is deferred |
| `openSprite` / `closedSprite` | asset ID | no | deferred presentation target |

If `body` is absent, the gate is visual-only. Logical gate state is implemented;
physical gate bodies and sprite-swap presentation remain deferred.

### 3.2 Room material fields

| Field | Type | Required | Notes |
|---|---|---|---|
| `tileMaterials` | `string[]` | no | Parallel visual grid; same dimensions as `layers.tiles` |
| `tileMaterialLegend` | `Record<string, TileMaterialRule>` | no | Single-character material rules |
| `defaultMaterialId` | string | no | Used for solid cells without a material character |
| `materialSeed` | integer | no | Deterministic variant selection; defaults to a room-derived seed |
| `background.layers[].materialId` | string | no | Background material palette |
| `background.layers[].pattern` | `PatternBinding` | no | Background pattern source and placement |
| `entities[].components.material` | `MaterialBinding` | no | Object palette/pattern overlay |

`layers.tiles` remains the collision grid. A material character on an empty
collision cell is decorative and passable. No material field adds a save field.

### 3.3 Materials document 1.0

`materials.json` is optional and declared by `pack.json`:

```ts
interface MaterialsDocument {
  schemaVersion: "1.x";
  id: string;
  materials: Record<string, MaterialDefinition>;
  patterns?: Record<string, PatternDefinition>;
  variantSets?: Record<string, TileVariantSet>;
}
```

Material fields: `family`, `palette` (theme token names), `edge`, optional
`patternId`, `direction`, `autotile`, `variants` (`AtlasFrameRef[]`),
`variantSet`, `tint`.

Pattern fields: `family`, `source` (`procedural` generator+seed, `image`, or
`atlas` frame), `space`, `scale`, optional `direction`, `contrast`, `blend`,
`animation`.

Variant sets: `id`, `materialId`, `rule` (`edge`/`corner`/`blob47`/`wang`),
optional `atlas`, `frames` keyed by the rule mask space, and a required
`fallback`. `wang` and pattern animation are accepted schema targets but are
deferred in M1.8; authored use is reported as deferred.

### 3.4 Atlas manifest metadata

`assets` gains `type: "atlas"` and `ManifestAssetEntry.regions` plus optional
intrinsic `width`/`height`. Regions are non-empty named rectangles with integer
bounds. `atlas` is not an animation format. A declared placeholder atlas may
omit `src` while retaining regions.

`AtlasFrameRef` is storage-agnostic:

```ts
type AtlasFrameRef =
  | { kind: "asset"; assetId: AssetId }
  | { kind: "atlas"; assetId: AssetId; frame: string };
```

### 3.5 Asset and content versions

The asset manifest schema is `1.1`; parsers accept all `1.x`. The materials
document is `1.0`. Room `1.1` adds the optional material grid; theme `1.1` adds
`ui.materials`/`ui.patterns`; pack `1.1` adds the optional `materials` path. Old
1.0 documents remain valid.

## 4. Run snapshot 2.1

### 4.1 Implemented fields

```ts
interface ConversationSnapshot {
  surfaceId: string;
  dialogueId: string;
  nodeId: string;
  owner: PlayerId;
  entityId: string;
}

interface RunSnapshot {
  schemaVersion: string; // 2.1
  packId: string;
  packVersion: string;
  contentVersion: string;
  levelId: string;
  roomId: string;
  checkpointId: string | null;
  progression: ProgressionSnapshot;
  events: LearningEvent[];
  elapsed: number;
  savedAt: string;
  status: "playing" | "debrief" | "complete";
  players: { activeP2: boolean; bodies: Record<"p1" | "p2", BodySnapshot> };
  world: {
    bodies: Record<string, BodySnapshot>;
    props: Record<string, PropSnapshot>;
    puzzles: Record<string, PuzzleRunState>;
  };
  audio: { muted: boolean };
  conversations?: ConversationSnapshot[];
  /** Legacy single-dialogue save; migrated to one P1-owned conversation. */
  dialogue?: { dialogueId: string; nodeId: string };
}
```

Rules:

- old 2.0 saves without `conversations` load;
- a legacy `dialogue` field migrates to one P1-owned conversation;
- malformed conversation snapshots reject the save structurally;
- a missing entity/dialogue on restore closes the conversation with a recovery
  cue;
- feedback ECS state is never serialized.

`PropSnapshot.state` accepts `cleared` in addition to the existing states.
`locked` is deferred.

### 4.2 Deferred fields

`RunSnapshot.returnTo` and `LevelRunSnapshot` are accepted ADR-0007 targets but
are not present in the current parser or runtime. No side-excursion state is
saved.

## 5. Syllabus evidence

The syllabus owns evidence rules and weight. The current `04` level uses the
syllabus-derived `prompt-obj-2`/`EV-7` teach-back. The proposed per-level
`prompt-obj-2-nmj`/`EV-9` override is deferred with the level debrief override.

## 6. Versioning

| Format | Current version | Old input |
|---|---|---|
| Puzzle | 1.1 | 1.0 accepted; new fields absent |
| Level | 1.1 | 1.0 accepted; feedback absent |
| Room | 1.1 | 1.0 accepted; material fields absent |
| Theme | 1.1 | 1.0 accepted; UI material slots absent |
| Pack | 1.1 | 1.0 accepted; materials path absent |
| Materials | 1.0 | no older document |
| Asset manifest | 1.1 | all 1.x accepted; `atlas` additive |
| Run | 2.1 | 2.0 accepted; no conversations/legacy dialogue defaults |
| Settings | 2.0 | separate storage slot |

## 7. Invariants

- New fields are optional and default to old behavior.
- Invalid new values are schema errors, not silent coercions.
- `puzzle` remains the only owner of logical puzzle state.
- The save is a projection of runtime state, never a second puzzle graph.
- Feedback surfaces, cues, effects, and ECS entities are ephemeral.
- Effects and tile visuals never carry collision authority.
- Materials, patterns, variants, and atlases never carry collision, puzzle,
  interaction, or save authority.
- `clear`/`cleared` are implemented; `locked`/`unlock`/`requires`/`message`/
  `linkBlocked` are deferred.
