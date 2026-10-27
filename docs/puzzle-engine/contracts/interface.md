# Interface contract

The new public operations introduced by the puzzle-engine upgrade. Source ADRs:
ADR-0002–0008. Existing operations keep their current signatures.

## 1. `puzzle` — pure dataflow additions

```ts
type PropRunState =
  | "locked"
  | "free"
  | "carried"
  | "placed"
  | "docked"
  | "cleared";

type PuzzleLinkType =
  | ExistingLinkType
  | "unlock"
  | "clear";

type PuzzleEventType =
  | ExistingPuzzleEventType
  | "propReleased"
  | "propCleared"
  | "linkBlocked";

interface PropNode {
  type: "prop";
  id: string;
  entityId: string;
  tags: string[];
  shape: string;
  initial?: "free" | "locked";
  spawn?: { x: number; y: number };
}

interface PuzzleLink {
  from: string;
  to: string;
  type: PuzzleLinkType;
  requires?: string;
  message?: string;
}

interface PuzzleEvent {
  type: PuzzleEventType;
  nodeId: string;
  propId?: string;
  actorId?: string;
  to?: string;
  requires?: string;
  message?: string;
}

class PuzzleRuntime {
  // existing:
  nodeState(nodeId: string): PuzzleNodeRunState | undefined;
  tickResult(snapshot: PuzzleWorldSnapshot): PuzzleTickResult;
  reset(): boolean;
  restore(state: PuzzleRunState): void;
  snapshot(): PuzzleRunState;

  // new convenience queries:
  propState(propId: string): PropRunState | undefined;
  isGateOpen(gateId: string): boolean;
}
```

Semantics:

- `propState` returns the prop node's logical state, or `undefined` if the node
  is missing/not a prop.
- `isGateOpen` is `nodeState(gateId)?.state === "open"`.
- `linkBlocked` sets `to`, `requires`, and optionally `message`; it does not
  change any node.
- A blocked `pulse` does not call the receptor resolver and consumes the normal
  cooldown.
- An `unlock` link changes only `locked` → `free`.
- A `clear` link changes any non-cleared state → `cleared`.

## 2. `world` — bodies and projection

```ts
class RoomPhysics {
  setGateOpen(gateId: string, open: boolean): void;
  gateStates(): Record<string, boolean>;

  setPropState(propId: string, state: PropRunState): boolean;
  releaseProp(propId: string): boolean;
  clearProp(propId: string): boolean;
  resetProp(propId: string, initial?: "free" | "locked"): boolean;
}

interface RoomSimulation {
  // existing fields
  gateStates: Record<string, boolean>;
}
```

Semantics:

- `setGateOpen` creates/removes the static gate body if one is authored;
  otherwise it records only state.
- `gateStates` returns the current logical state for every gate the physics
  layer knows.
- `setPropState` is used for entry/reset/restore synchronization. It sets
  static/gravity/collision/visibility flags for `locked`/`cleared`/`free`.
- `releaseProp` is the world half of a `propReleased` event.
- `clearProp` is the world half of a `propCleared` event.
- `resetProp` restores spawn and the authored initial state; the default is
  `free` for old content.

## 3. `game` — synchronization, prompts, travel

```ts
interface RuntimeOptions {
  // existing
  onLevelChange?: (levelId: string) => void;
}

class GameRuntime {
  travelToSideLevel(levelId: string): boolean;
  debriefPromptList(): DebriefPrompt[];
  // existing finishDebrief, snapshot, exportEvidence, ...
}
```

Semantics:

- `travelToSideLevel` returns `false` and leaves state unchanged when the
  target is missing, not authored, not `side`, not revealed, the current level,
  the machine is not in `level` or `map`, or `returnTo` is already set.
- On success it captures `returnTo`, enters the side level fresh, autosaves,
  notifies `onLevelChange`, and returns `true`.
- `debriefPromptList` returns `level.debrief.prompts` when present, otherwise
  `debriefPrompts(syllabus, level.syllabusObjectiveIds)`.
- Side debrief finish restores `returnTo`, clears it, autosaves, and returns to
  the main level. It records no `pack_completed`.

## 4. `curriculum` — prompt overrides

```ts
function debriefPrompts(
  syllabus: Syllabus,
  objectiveIds: readonly string[],
  overrides?: readonly DebriefPrompt[],
): DebriefPrompt[];
```

Semantics:

- If `overrides` is non-empty, return a copy of the overrides whose
  `objectiveId` is in `objectiveIds`, preserving order.
- If `overrides` is empty/undefined, return the existing derived prompts.
- Do not mutate the override array.

`DebriefPrompt` remains:

```ts
interface DebriefPrompt {
  id: string;
  objectiveId: string;
  prompt: string;
  successCriterion: string;
}
```

## 5. `ui` — map travel view

```ts
interface MapTravelView {
  levelId: string;
  label: string;
  available: boolean;
  reason?: string;
}

interface MapView {
  // existing nodes/edges
  travel: MapTravelView[];
}

interface GameUiCallbacks {
  // existing
  onMapTravel(levelId: string): void;
}
```

Semantics:

- `travel` lists authored, revealed `side` levels while the current level is
  `main`. In a side level it is empty with a reason on the current entry.
- The map overlay renders keyboard-focusable controls for available entries.
- `onMapTravel` calls `GameRuntime.travelToSideLevel`.
- Unavailable entries explain why (not revealed, current, already in a side
  level, no authored level).

## 6. `save` — snapshot additions

```ts
const RUN_SCHEMA_VERSION = "2.1";

interface RunSnapshot {
  // existing fields
  returnTo?: LevelRunSnapshot;
}

type PropRunState = "locked" | "free" | "carried" | "placed" | "docked" | "cleared";
```

Semantics:

- The parser accepts 2.x; a 2.0 snapshot has no `returnTo`.
- `returnTo` is validated structurally before it is restored.
- Restoring a side level with a missing/invalid `returnTo` degrades to the
  current level and a toast; evidence is not lost.
- Save version mismatch still follows ADR-0045.

## 7. `pack` — schema surface

```ts
interface LevelDocument {
  // existing fields
  kind?: "main" | "side";
  debrief?: { prompts: DebriefPrompt[] };
}

interface EntityGateComponent {
  gateId: string;
  openSprite?: AssetId;
  closedSprite?: AssetId;
}

interface EntityBodyComponent {
  dynamic?: boolean;
  width: number;
  height: number;
  mass?: number;
  fixedRotation?: boolean;
  gravity?: boolean;
  friction?: number;
  restitution?: number;
}
```

`parsePuzzle`, `parseLevel`, `parseRoom`, and `validatePack` accept the new
optional fields and reject invalid combinations with coded errors. The parser
does not coerce invalid new values.

## 8. Error surface

| Code | Meaning |
|---|---|
| `PUZZLE_LINK_REQUIRES_UNKNOWN` | `requires` references a missing node |
| `PUZZLE_LINK_REQUIRES_STATE_LINK` | `requires` used on `activate`/`deactivate`/`open`/`close` |
| `PUZZLE_LINK_REQUIRES_TYPE` | `requires` references a non-condition node (`prop`, `pulseSource`) |
| `PUZZLE_LINK_MESSAGE_EMPTY` | `message` is present but blank |
| `PUZZLE_PROP_INITIAL` | prop `initial` is not `free`/`locked` |
| `PUZZLE_UNLOCK_TARGET` | `unlock`/`clear` target is not a prop |
| `LEVEL_DEBRIEF_DUPLICATE` | duplicate prompt ID in a pack |
| `LEVEL_DEBRIEF_OBJECTIVE` | prompt objective not in the level |
| `LEVEL_DEBRIEF_EVIDENCE` | required prompt has no matching evidence rule |
| `LEVEL_SIDE_NEXT` | side level declares `nextLevelIds` |
| `LEVEL_SIDE_ORPHAN` | side level has no map edge from a main level |
| `GATE_BODY_INVALID` | gate body dimensions are missing/invalid |
| `SAVE_RETURN_INVALID` | `returnTo` is structurally invalid |

## 9. Invariants

- `puzzle` APIs never touch Matter/Phaser/DOM/save.
- `world` APIs never evaluate puzzle links or win predicates.
- `game` is the only writer of gate/prop synchronization.
- `ui` never writes puzzle or world state; it calls callbacks.
- `save` never performs content validation.
- `pack` never starts or mutates a run.
