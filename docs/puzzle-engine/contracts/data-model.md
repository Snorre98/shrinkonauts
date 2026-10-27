# Data model contract

Precise spec for the durable and content formats changed by the engine upgrade.
Source ADRs: ADR-0002–0008.

## 1. Puzzle document 1.1

The document remains a declarative typed dataflow. New fields are optional;
existing 1.0 documents parse and behave as before.

### 1.1 New / changed nodes

#### `prop`

| Field | Type | Required | Notes |
|---|---|---|---|
| `id` | string | yes | node ID |
| `type` | `"prop"` | yes | |
| `entityId` | string | yes | room `prop` entity |
| `tags` | string[] | yes | non-empty |
| `shape` | string | yes | non-empty |
| `initial` | `"free" \| "locked"` | no | default `free`; applied on level entry |
| `spawn` | `{x,y}` | no | headless replay spawn |

#### `gate`

| Field | Type | Required | Notes |
|---|---|---|---|
| `id` | string | yes | node ID |
| `type` | `"gate"` | yes | |
| `entityId` | string | no | room `puzzleGate` entity |
| `initial` | `"closed" \| "open"` | no | default `closed` |
| `latched` | boolean | no | default `true` |

The gate's physical body and sprites are room-entity data, not puzzle-document
data.

### 1.2 New / changed links

```json
{
  "from": "pulse-terminal",
  "to": "nicotinic-receptor",
  "type": "pulse",
  "requires": "ca-gate",
  "message": "The terminal has not released yet. Trigger the terminal first."
}
```

| Field | Type | Required | Notes |
|---|---|---|---|
| `from` | string | yes | source node |
| `to` | string | yes | target node |
| `type` | link type | yes | existing plus `unlock`, `clear` |
| `requires` | string | no | node ID; link applies only when that node is active |
| `message` | string | no | non-empty authored feedback for a blocked link |

`requires` is legal only on event links: `pulse`, `press`, `release` (the
plate-release event link), `enter`, `exit`, `increment`, `start`, `stop`,
`reset`, `elapsed`, `reached`, `bind`, `unlock`, `clear`. It is illegal on
`activate`, `deactivate`, `open`, `close`. The referenced node must be a
condition node: `gate`, `timer`, `counter`, `relay`, `receptor`, `plate`,
`zone`, or `trigger`; `prop` and `pulseSource` are rejected.
The validator rejects unknown nodes and empty messages.

### 1.3 Link actions `unlock` and `clear`

| Link | Source | Target | Effect |
|---|---|---|---|
| `unlock` | gate, relay, timer, receptor, trigger, plate, zone, counter | `prop` | `locked` → `free`; emits `propReleased`; no-op otherwise |
| `clear` | gate, relay, timer, receptor, trigger, plate, zone, counter | `prop` | any non-cleared → `cleared`; emits `propCleared`; no-op if already cleared |

### 1.4 Events

| Event | Payload | Meaning |
|---|---|---|
| `propReleased` | `nodeId`, `propId` | Locked prop became free |
| `propCleared` | `nodeId`, `propId` | Prop became cleared |
| `linkBlocked` | `nodeId`, `to`, `type`, `requires`, `message?` | Conditional link skipped |

Existing event types are unchanged.

### 1.5 Prop run states

`"locked" | "free" | "carried" | "placed" | "docked" | "cleared"`.

`locked` is visible/static/non-pickable. `cleared` is hidden/non-collidable.
`free`/`carried`/`placed`/`docked` retain their existing meanings.

### 1.6 Invariants

- `unlock` only affects a `locked` prop.
- `clear` affects any state except `cleared`.
- A `requires` condition is evaluated against `nodeState(requires).active`.
- A blocked link never mutates its target or emits a normal state event.
- A pulse blocked by `requires` is consumed; cooldown applies.
- `PuzzleRuntime` remains deterministic and Phaser/Matter-free.

## 2. Level document 1.1

### 2.1 New fields

| Field | Type | Required | Notes |
|---|---|---|---|
| `debrief` | `{ prompts: DebriefPrompt[] }` | no | overrides syllabus-derived prompts |
| `kind` | `"main" \| "side"` | no | default `main` |
| `nextLevelIds` | string[] | no | main progression only; side levels use `[]` |

`DebriefPrompt`:

| Field | Type | Required | Notes |
|---|---|---|---|
| `id` | string | yes | stable prompt ID |
| `objectiveId` | string | yes | must be in `syllabusObjectiveIds` |
| `prompt` | string | yes | non-empty |
| `successCriterion` | string | yes | non-empty |

### 2.2 Validation

- Prompt IDs are unique within the pack.
- `debrief_answered` level evidence rules must filter one of the override IDs
  when `debrief.prompts` exists.
- A `side` level has no `nextLevelIds`, is not `pack.endLevelId`, and has a map
  edge from a revealed main level.
- A level without `debrief` falls back to `prompt-${objectiveId.toLowerCase()}`.

## 3. Room document additions

### 3.1 `puzzleGate` entity

| Field | Type | Required | Notes |
|---|---|---|---|
| `components.body` | `{ width:number, height:number, dynamic:false }` | no | opt-in physical collision; static |
| `components.gate.gateId` | string | yes for a puzzle gate | maps to a puzzle `gate` node |
| `components.gate.openSprite` | asset ID | no | optional open texture |
| `components.gate.closedSprite` | asset ID | no | optional closed texture |

If `body` is absent, the gate is visual-only. If sprite IDs are absent, the
entity's `sprite` is used with a presentation fallback (ADR-0003).

## 4. Run snapshot 2.1

### 4.1 Added field

```ts
interface RunSnapshot {
  // existing fields unchanged
  returnTo?: LevelRunSnapshot;
}

interface LevelRunSnapshot {
  levelId: string;
  roomId: string;
  checkpointId: string | null;
  elapsed: number;
  players: {
    activeP2: boolean;
    bodies: Record<"p1" | "p2", BodySnapshot>;
  };
  world: {
    bodies: Record<string, BodySnapshot>;
    props: Record<string, PropSnapshot>;
    puzzles: Record<string, PuzzleRunState>;
  };
}
```

`returnTo` is present only while the current level is a side excursion. The run
level fields (`levelId`, `roomId`, `checkpointId`, `players`, `world`) describe
the current side level. Progression, curriculum events, audio, and settings
remain run-level.

### 4.2 Prop snapshot

`PropSnapshot.state` accepts `locked` and `cleared` in addition to the existing
states.

### 4.3 Invariants

- `returnTo` is absent in a main level and after pack completion.
- Entering a side level captures exactly one `returnTo`.
- Returning restores the snapshot and clears `returnTo`.
- Old 2.0 snapshots without `returnTo` load with no side excursion.
- Old snapshots never contain `locked`/`cleared`; the parser accepts both old
  and new values.
- No gate or debrief-prompt state is duplicated in the save.

## 5. Syllabus evidence additions

- `EV-9` (new): `debrief_answered` filtered by `prompt-obj-2-nmj`, required,
  OBJ-2. This is the 04 NMJ teach-back.
- 03 keeps EV-7 filtered by `prompt-obj-2`.
- 05/Silicon may add their own prompt/evidence pairs later.
- Prompt text lives in the level override; the syllabus owns the evidence rule
  and weight.

## 6. Versioning

| Format | Version | Old input |
|---|---|---|
| Puzzle | 1.1 | 1.0 accepted; new fields absent |
| Level | 1.1 | 1.0 accepted; `kind` main, no `debrief` |
| Run | 2.1 | 2.0 accepted; no `returnTo`; old prop states |
| Pack | content version bump on migration | ADR-0045 recovery |

## 7. Invariants

- New fields are optional and default to old behavior.
- New enum values are additive.
- Invalid new values are schema errors, not silent coercions.
- `puzzle` remains the only owner of logical gate/prop/condition state.
- The save is a projection of runtime state, never a second puzzle graph.
