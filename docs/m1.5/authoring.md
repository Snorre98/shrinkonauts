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

`activation.mode` is `roomStart`, `zoneEnter`, or `interact`. M1.5 activates
room-start puzzles automatically. `tether` is `normal`, `stretch`, or `off`.

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
