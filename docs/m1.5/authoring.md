# Puzzle authoring (M1.5)

A puzzle is a JSON dataflow document loaded with a level package. It contains
no scripts and no callbacks. The engine evaluates typed nodes and links against
a pure world snapshot.

## Level wiring

```json
{
  "puzzleIds": ["puzzle-ferry-01"]
}
```

Room exits can lock on a puzzle:

```json
{
  "id": "exit-to-muscle",
  "x": 37,
  "y": 19,
  "toLevelId": "04-muscle-effector",
  "puzzleId": "puzzle-ferry-01"
}
```

Map edges use the same optional `puzzleId`.

## Puzzle document

A minimal shape:

```json
{
  "schemaVersion": "1.0",
  "id": "puzzle-ferry-01",
  "title": "Signal Ferry",
  "objectiveIds": ["OBJ-2"],
  "conceptIds": ["CON-3"],
  "activation": { "mode": "roomStart" },
  "tether": "off",
  "nodes": [],
  "links": [],
  "win": { "type": "gateOpen", "gateId": "gate-ferry" },
  "reset": { "props": [], "nodes": [] },
  "evidence": { "onSolve": ["puzzle_solved"], "counters": [] },
  "rewards": { "abilities": [], "flags": [], "mapNodes": [] },
  "solution": [],
  "hints": []
}
```

`activation.mode` is `roomStart`, `zoneEnter`, or `interact`.

- `roomStart` activates when the level loads.
- `zoneEnter` needs `activation.zoneId` naming a `zone` node in the same
  document; it activates when an active player enters that rect.
- `interact` needs `activation.entityId` naming a room entity; it activates
  when an active player uses E or `,` within interaction range.

Only activated puzzles tick, save, reset, and appear in the HUD. Activation
autosaves. `tether` is `normal`, `stretch`, or `off`; the first activated puzzle
supplies the room's tether policy. `off` is valid only when the puzzle geometry
fits inside one 1280 × 720 viewport.

```json
{ "activation": { "mode": "zoneEnter", "zoneId": "entry-zone" } }
```

```json
{ "activation": { "mode": "interact", "entityId": "pulse-terminal" } }
```

`zoneId` must name a `zone` node in the same document. `entityId` must name a
room entity. An `interact` puzzle shows `Start <title>` in the interaction
prompt and activates on E or `,` before dialogue or carry actions.

The `off` guard measures the bounding box of referenced entity anchors,
receptor/plate/zone rects, snap points, and prop spawns. A room-size check is not
used because `03-nerve-forest` is 1280 × 736 px at 32 px tiles.

## Nodes

| Type | Required fields | Notes |
|---|---|---|
| `prop` | `entityId`, `tags`, `shape` | References a room `prop` entity; optional `spawn` for headless replay. |
| `receptor` | `entityId`, `accepts`, `rect`, `snap` | `accepts.tag` and/or `accepts.shape`; `rect` is pixel-space top-left. |
| `pulseSource` | `entityId`, `ability: "pulse"`, `cooldownTicks`, `travelTicks`, `range` | Proximity and ability routing live in the game runtime. |
| `plate` | `rect`, `detects`, `minimum` | AABB pressure sensor. Optional `countCarried`. |
| `zone` | `rect`, `detects`, `minimum` | Presence sensor. |
| `relay` | `mode` | `allOf`, `anyOf`, or `not`. |
| `gate` | `entityId`, `initial`, `latched` | The visual gate is a `puzzleGate` entity. |
| `timer` | `durationTicks` | Optional `repeat`. |
| `counter` | `target` | Optional `comparison` (`==` or `>=`). |
| `trigger` | none | Optional `once` (default `true`). |

## Links

`pulse`, `bind`, `press`, `release`, `enter`, `exit`, `increment`, `start`,
`stop`, `reset`, `elapsed`, `reached`, `activate`, `deactivate`, `open`,
`close`.

State links (`activate`, `deactivate`, `open`, `close`) are evaluated every
tick from source node activity. Event links fire when their source emits the
matching event. The validator rejects illegal source/target pairs and relay
cycles.

## Solution trace

The `solution` array is a deterministic reachability check, not a recording:

```json
[
  { "action": "move", "actor": "p2", "x": 400, "y": 600 },
  { "action": "pickup", "actor": "p2", "target": "tracer-prop" },
  { "action": "place", "actor": "p2", "target": "receptor-a" },
  { "action": "pulse", "actor": "p1", "target": "pulse-terminal" },
  { "action": "wait", "ticks": 22 }
]
```

`npm test` replays it through `replaySolution()` and fails if the win predicate
is not reached.

## Room components

Props use two entities:

```json
{
  "id": "body-tracer",
  "type": "body",
  "x": 12,
  "y": 19,
  "components": {
    "body": {
      "width": 20,
      "height": 20,
      "dynamic": true,
      "mass": 0.2,
      "fixedRotation": true
    }
  }
},
{
  "id": "tracer-prop",
  "type": "prop",
  "x": 12,
  "y": 19,
  "sprite": "sprite.prop.tracer",
  "components": {
    "prop": {
      "bodyId": "body-tracer",
      "tags": ["tracer"],
      "shape": "triangle",
      "carryable": true,
      "placeable": true,
      "pushable": true,
      "throwable": true
    }
  }
}
```

Other new entity types: `receptor` (`components.receptor`), `pulseSource`
(`components.pulseSource`), and `puzzleGate` (`components.gate`). The puzzle
document references the **prop entity id**, never the body id.

## Hints and cooldown

`hints` are authored text, revealed one at a time by the pause-menu
**Show puzzle hint** button. The latest hint stays in the HUD and each use
records `hint_used` with `puzzleId` and `hintIndex`. The hint index is UI state;
it is not saved.

The HUD also shows the first active `pulseSource` cooldown as `Pulse: ready` or
a remaining time in seconds.

## Hazards

A hazard is a static sensor that respawns a player at the checkpoint:

```json
{
  "id": "hazard-cleft",
  "type": "hazard",
  "x": 18,
  "y": 20,
  "components": {
    "body": { "width": 32, "height": 24 }
  }
}
```

The body component is optional; without it the hazard is one tile. Hazards use
the `HAZARD` collision category and only collide with players. Props and solids
pass through. Puzzle state, evidence, and prop positions persist after a hazard
respawn. Do not place a hazard on a checkpoint or spawn tile.

## Evidence

A solve records `puzzle_solved` with `puzzleId`, objective/concept ids, mode,
and diagnostic counters. A level evidence rule filters on `puzzleId`:

```json
{
  "objectiveId": "OBJ-2",
  "event": "puzzle_solved",
  "filter": { "puzzleId": "puzzle-ferry-01" },
  "required": true
}
```

The debrief remains a separate `debrief_answered` rule. Diagnostic counters
(`wrongReceptor`, `wrongSide`, `resets`, etc.) are process evidence, not a
correctness score.
