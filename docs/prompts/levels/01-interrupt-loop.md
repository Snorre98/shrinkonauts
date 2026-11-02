# Silicon Interrupt Loop — level implementation prompt

**Status:** Draft v0.1 · 1 November 2026  
**Pack:** `silicon-reflex` (new, separate pack)  
**Level:** `01-interrupt-loop`  
**Puzzle:** `puzzle-interrupt-loop`  
**Objective:** OBJ-5 transfer  
**Concepts:** CON-7 reflex arc, CON-8 sensor–controller–actuator loop  
**Design source:** [`docs/m2/nervous-puzzles/silicon-fixture.md`](../../m2/nervous-puzzles/silicon-fixture.md)  
**Theme:** [`docs/prompts/silicon-theme.md`](../silicon-theme.md)

> **Scope:** implement the separate `silicon-reflex` pack and one level. This is
> data content. Do not change engine code. If a new mechanic is needed, stop and
> write an ADR proposal.

---

## 1. Copy-paste prompt

```text
ROLE
You are implementing the Silicon Interrupt Loop, a one-room transfer fixture
for Shrinkonauts. You are working in the repository at
/Volumes/Ex-SSD/Documents/Studies/game-it3021-gamified-learning/shrinkonauts.

This is DATA CONTENT, not engine code. You may edit pack data, themes,
materials, manifests, licences, catalog metadata, tests, and validation scripts.
You may NOT edit src/game, src/puzzle, src/world, src/physics, or any gameplay
or runtime module. If the level needs a new node, link, entity behaviour, gate
type, verb, UI surface, or save field, STOP and write an ADR proposal.

TASK
Create the separate `silicon-reflex` pack and the `01-interrupt-loop` level.
The pack is a one-room transfer fixture: a sensor detects a change, an
interrupt line is routed to the interrupt controller, the controller wakes the
CPU, and the CPU opens the actuator gate. The CPU is NOT the brain and is NOT
the integration point. The interrupt controller is the "spinal cord" analogue.

READ BEFORE EDITING
1. docs/m2/nervous-puzzles/silicon-fixture.md
2. docs/m2/nervous-puzzles/anatomy-fidelity.md
3. docs/m1.5/authoring.md
4. docs/shrinkonauts/base-game/level-authoring.md
5. docs/shrinkonauts/base-game/contracts/pack-schema.md
6. docs/m1.9/README.md
7. docs/prompts/silicon-theme.md
8. docs/prompts/asset-generation-template.md (for the placeholder asset list)
9. docs/prompts/levels/01-interrupt-loop-assets.md (for the final asset list)
10. The current exemplars:
    public/packs/anatomy-reflex/pack.json
    public/packs/anatomy-reflex/theme.json
    public/packs/anatomy-reflex/materials.json
    public/packs/anatomy-reflex/assets.final.json
    public/packs/anatomy-reflex/licenses.json
    public/packs/anatomy-reflex/levels/03-nerve-forest/level.json
    public/packs/anatomy-reflex/levels/03-nerve-forest/room.json
    public/packs/anatomy-reflex/levels/03-nerve-forest/puzzle.json
    public/packs/anatomy-reflex/levels/04-muscle-effector/level.json
    public/packs/anatomy-reflex/levels/04-muscle-effector/room.json
    public/packs/anatomy-reflex/levels/04-muscle-effector/puzzle.json
    public/packs/anatomy-reflex/levels/04-muscle-effector/dialogue.json
11. The schema authority:
    src/pack/types.ts
    src/pack/parse-content.ts
    src/pack/parse-materials.ts
    src/puzzle/types.ts
    src/puzzle/validate.ts
    src/pack/validate.ts
12. The tooling:
    scripts/pack-validate.ts
    scripts/pack-smoke.ts
    scripts/pack-map.ts
    tests/app-state.test.ts
    e2e/hub.spec.ts

If any file has changed since this prompt was written, the actual file wins.

FILES TO CREATE
public/packs/silicon-reflex/
  pack.json
  theme.json
  materials.json
  mapping.json
  licenses.json
  assets.placeholder.json
  assets.final.json
  levels/01-interrupt-loop/
    README.md
    level.json
    room.json
    puzzle.json
    dialogue.json
    gate.json
  shared/
    sprites/       (copy the POC player assets from anatomy-reflex)
    backgrounds/
    tiles/
    ui/
    audio/

PACK
- id: silicon-reflex
- title: Silicon: Interrupt Loop
- domain: computer-science
- version: 0.1.0
- syllabusId: anatomy-reflex
- startLevelId: 01-interrupt-loop
- endLevelId: 01-interrupt-loop
- levels: ["01-interrupt-loop"]
- theme: theme.json
- mapping: mapping.json
- licenses: licenses.json
- materials: materials.json
- assetManifests: placeholder assets.placeholder.json, final assets.final.json
- ageRating: 12+
- description: A one-room transfer fixture: sensor, interrupt line, interrupt
  controller, CPU, actuator.

LEVEL
- id: 01-interrupt-loop
- title: Interrupt Loop
- order: 1
- status: draft (set validated only after validation)
- syllabusObjectiveIds: ["OBJ-5"]
- conceptIds: ["CON-7", "CON-8"]
- roomId: room-interrupt-loop
- backgroundId: bg.silicon_board
- dialogueIds: ["dlg-cpu-01"]
- gateIds: ["gate-transfer"]
- puzzleIds: ["puzzle-interrupt-loop"]
- map.nodeId: map-interrupt-loop
- map.label: Interrupt Loop
- map.x / map.y: 0 / 0
- map.edges: []
- nextLevelIds: []
- unlocks: []
- evidence:
  - puzzle_solved, filter { puzzleId: "puzzle-interrupt-loop" }, required true
  - debrief_answered, filter { promptId: "prompt-obj-5" }, required true
  - gate_solved, filter { gateId: "gate-transfer" }, required false
- coop.supported: true
- coop.notes: P1 can solo the whole loop; P2 can carry the route plug and either
  player can scan. The sensor trigger latches so no second body is required.
- authoring: levelSpec README.md; playtestedSolo false; playtestedCoop false.
- feedback: include five beats — detect (sensor-pad, sensor-trigger), route
  (route-plug, controller-socket, cpu-socket), integrate (controller-relay),
  wake (cpu-timer), actuate (gate-actuator) — and the node labels/text from
  §2.5 of this document. If the feedback layer cannot show a conditional
  wrong-route message for the decoy, put that message in the authored hint and
  record the deviation.

PUZZLE
- id: puzzle-interrupt-loop
- title: Interrupt Loop
- objectiveIds: ["OBJ-5"]
- conceptIds: ["CON-7", "CON-8"]
- activation: interact at entity sensor-console
- tether: off
- Win: gateOpen gate-actuator
- Nodes:
  - sensor-pad: plate, rect x 448 y 600 w 64 h 48, detects player, minimum 1,
    countCarried false
  - sensor-trigger: trigger, once true
  - route-plug: prop, entityId route-plug, tags ["route"], shape "plug",
    spawn x 512 y 620
  - controller-socket: plate, rect x 704 y 600 w 64 h 48, detects prop,
    minimum 1, countCarried false
  - cpu-socket: plate, rect x 864 y 600 w 64 h 48, detects prop, minimum 1,
    countCarried false (decoy; no link)
  - controller-relay: relay, allOf
  - cpu-timer: timer, durationTicks 60, repeat false
  - gate-actuator: gate, entityId gate-actuator, initial closed, latched true
- Links:
  - sensor-pad -> sensor-trigger: press
  - sensor-trigger -> controller-relay: activate
  - controller-socket -> controller-relay: activate
  - controller-relay -> cpu-timer: start
  - cpu-timer -> gate-actuator: elapsed
  - No link from cpu-socket.
- Reset props: ["route-plug"]
- Reset nodes: sensor-pad, sensor-trigger, route-plug, controller-socket,
  cpu-socket, controller-relay, cpu-timer, gate-actuator
- Evidence: onSolve ["puzzle_solved"]; counters ["pickups", "drops",
  "resets"]
- Rewards: abilities [], flags [], mapNodes []
- Solution: p1 move 480,620; wait 2; move 512,620; pickup route-plug;
  move 720,620; drop route-plug; wait 80
- Hints:
  1. "The sensor does not shout directly at the CPU. Route the interrupt line
     to the controller."
  2. "The controller socket is the integration point. The CPU socket is the
     decoy."
  3. "The CPU is the output side. The controller wakes it, then the actuator
     responds."

ROOM
- id: room-interrupt-loop
- width 40, height 23, tileSize 32
- tileset: tileset.silicon
- tileMaterials: 23 rows × 40 columns; legend c = circuit, s = substrate;
  floor rows 20-22 are c; walls and upper structure are s; defaultMaterialId
  substrate; materialSeed 3
- background: bg.silicon_board with four layers:
  - bg.silicon_board.sky, depth -40, parallax 0.05/0.02, fit cover
  - bg.silicon_board.far, depth -30, parallax 0.2/0.1, fit tile
  - bg.silicon_board.mid, depth -20, parallax 0.45/0.2, fit tile
  - bg.silicon_board.near, depth -10, parallax 0.75/0.35, fit tile, opacity 0.9
- spawns: player1 (3,20), player2 (5,20)
- checkpoint: checkpoint-entry at (4,20)
- entities:
  - agent-cpu: agent, (6,20), sprite.agent.cpu, dialogueId dlg-cpu-01,
    label "CPU Core"
  - sensor-console: decor, (11,20), sprite.console.sensor,
    label "Sensor console" (puzzle activation entity)
  - pad-sensor: decor, (14,20), sprite.pad.sensor, label "Sensor pad"
  - body-route-plug: body, (16,20), components.body width 20 height 20
    dynamic true mass 0.2 fixedRotation true friction 0.4
  - route-plug: prop, (16,20), sprite.prop.route_plug, label "Route plug",
    components.prop bodyId body-route-plug tags ["route"] shape "plug"
    carryable true placeable true pushable true throwable true
  - controller-socket: decor, (22,20), sprite.socket.controller,
    label "Controller socket"
  - scan-controller: scanTarget, (22,17), sprite.scan.controller,
    conceptId CON-8, label "Interrupt controller"
  - scan-interrupt: scanTarget, (18,18), sprite.scan.interrupt,
    conceptId CON-8, label "Interrupt line"
  - cpu-socket: decor, (27,20), sprite.socket.cpu, label "CPU socket (decoy)"
  - scan-cpu: scanTarget, (30,18), sprite.scan.cpu, conceptId CON-8,
    label "CPU"
  - scan-sensor: scanTarget, (12,18), sprite.scan.sensor, conceptId CON-8,
    label "Sensor"
  - scan-actuator: scanTarget, (35,18), sprite.scan.actuator,
    conceptId CON-8, label "Actuator"
  - gate-actuator: puzzleGate, (35,20), sprite.gate.actuator,
    label "Actuator gate", components.gate gateId gate-actuator,
    anchors.center {x:18,y:18}
  - exit-silicon: decor, (37,19), sprite.exit.silicon, label "Actuator exit"
  - transfer-console: gate, (38,19), gateId gate-transfer,
    sprite.console.transfer, label "Transfer console"
- exits: exit-to-actuator at (37,19) width 1 height 1 toLevelId
  01-interrupt-loop, puzzleId puzzle-interrupt-loop
- triggers: []

DIALOGUE
- id: dlg-cpu-01
- speaker: CPU Core
- portrait: cpu
- start: intro
- Nodes: intro, problem, clue, check, retry, right, handoff.
- The CPU says it is the output side, not the spinal cord. The controller is the
  integration point. The check question asks which part is the integration
  point; the correct answer is the interrupt controller.
- On the correct answer: revealConcept CON-7, revealConcept CON-8,
  recordEvidence concept_revealed CON-8, revealMap map-interrupt-loop.
- Hand-off: start at the sensor console, step on the sensor pad, carry the route
  plug to the controller socket, wait for the CPU wake, then the actuator
  responds.

GATE
- id: gate-transfer
- type: concept
- objectiveId: OBJ-5
- conceptIds: ["CON-7", "CON-8"]
- prompt: "Where is the 'spinal cord' in this system?"
- puzzle: singleChoice
  options: sensor, interrupt line, interrupt controller, CPU, actuator
  answerId: controller
- hints:
  1. "The sensor is the input; the CPU is the output side."
  2. "The integration point is between them."
  3. "The interrupt controller is the 'spinal cord' analogue."
- onSolve: setFlag transfer-known true; revealMap map-interrupt-loop
- onFail: recordEvidence gate_failed gateId gate-transfer

THEME
- id: silicon-reflex-theme
- Use the shared palette tokens. Map nerve/nerveGlow/nerveDark to the joint
  cyan ramp for UI; the world uses graphite, cyan, ceramic, sage. Do not use
  nerve amber in the world.
- ui.materials: panel substrate, dialogue circuit, debrief substrate
- ui.patterns: panel solder-mask, dialogue circuit-traces, debrief solder-mask
- ui.assets: badge ui.icon.badge; icon.scan ui.icon.scan; icon.map ui.icon.map;
  icon.log ui.icon.log; portrait.cpu ui.portrait.cpu; panel.dialogue
  ui.panel.dialogue; panel.gate ui.panel.gate; panel.debrief ui.panel.debrief;
  panel.map ui.panel.map
- audio.cues: reuse the 11 shared cue IDs plus audio.cue.wrong as a placeholder;
  no new music.

MATERIALS
- materials:
  circuit: family synthetic, palette ["joint","teal"], edge hard, patternId
  circuit-traces, autotile edge, variantSet circuit-edge, tint joint
  substrate: family synthetic, palette ["boneShadow","teal"], edge hard,
  patternId solder-mask, autotile edge, variantSet substrate-edge, tint
  boneShadow
- patterns:
  circuit-traces: fibers, world, scale 0.5, direction 0, contrast 0.35
  solder-mask: cellular, world, scale 0.6, contrast 0.25
- variantSets:
  circuit-edge and substrate-edge: 16 frames, keys "0".."15", atlas
  tile.circuit.atlas, frames mask-0..mask-15, fallback mask-0

ASSETS
- Add these IDs to assets.final.json as declared placeholders:
  bg.silicon_board.sky/far/mid/near
  tile.circuit.atlas (128x128, 16 regions mask-0..mask-15)
  sprite.agent.cpu
  sprite.prop.route_plug
  sprite.socket.controller
  sprite.socket.cpu
  sprite.gate.actuator
  sprite.exit.silicon
  sprite.scan.sensor
  sprite.scan.interrupt
  sprite.scan.controller
  sprite.scan.cpu
  sprite.scan.actuator
  sprite.pad.sensor
  sprite.console.sensor
  sprite.console.transfer
  ui.portrait.cpu
  tileset.silicon
  audio.cue.boot/dialogue/scan/dash/gate/map/debrief/checkpoint/unlock/wrong/jump/land
- Optional, only if the room references them: sprite.prop.work_token.
- Copy the shared P1/P2 player assets into the Silicon pack's shared/sprites/
  folder and add matching licenses.json entries. The pack cannot reference the
  anatomy pack's files.
- Create a simple 128x128 placeholder atlas SVG at
  shared/tiles/circuit-atlas.svg with 16 32x32 cells and the mask-0..mask-15
  regions, plus a CC0 placeholder licence entry. The final asset pass replaces
  it with shared/tiles/circuit-atlas.png.
- Do not reference art-source/ in any manifest.
- Do not add a checkpoint sprite; the room uses the checkpoint data point.
- Do not use any nerve asset ID: no sprite.agent.neuron, sprite.scan.neuron,
  sprite.scan.pathway, sprite.gate.ferry, tile.nerve.atlas, or
  bg.nerve_forest.*.

CATALOG AND TESTS
- public/packs/index.json: change the existing silicon-reflex entry to
  status "available"; keep online false, order 20, title "Silicon: Interrupt
  Loop".
- npm run pack:map -- --pack silicon-reflex.
- scripts/pack-validate.ts currently validates anatomy-reflex only. Extend it
  minimally to load and validate silicon-reflex too. Do not duplicate the
  validation logic.
- scripts/pack-smoke.ts is anatomy-specific. Add a Silicon runtime path that
  boots the pack, activates the puzzle at sensor-console, solves it, asserts the
  actuator gate and evidence, and finishes the debrief. Keep the anatomy path
  unchanged.
- tests/app-state.test.ts currently expects silicon-reflex selection to be
  ignored. Update it to expect the pack is selectable and available.
- e2e/hub.spec.ts currently expects Silicon to be coming-soon and disabled.
  Update the assertions to available and startable, and keep coverage of the
  Silicon start path.
- tests/catalog.test.ts uses a local parser fixture; it may keep its
  coming-soon example, but do not let it mask the real catalog change.
- Do not delete coverage. Do not change unrelated tests.

VALIDATION
Run and fix every error:
  npm test
  npm run pack:validate
  npm run pack:smoke
  npm run pack:map -- --pack silicon-reflex
  npm run build
  git diff --check
  npm run smoke:e2e
Expected warnings:
  COVERAGE_OBJECTIVE_UNMAPPED for OBJ-1..OBJ-4
  COVERAGE_CONCEPT_UNMAPPED for CON-1..CON-6
Record them; do not duplicate anatomy content to silence them.

MANUAL CHECKS
- The pack loads with ?pack=silicon-reflex and starts at 01-interrupt-loop.
- The puzzle activates at the sensor console, solves solo, resets, and does not
  softlock if the plug is dropped on the CPU socket.
- The debrief opens and finishes; puzzle_solved and debrief_answered are
  recorded.
- The transfer gate is reachable and optional.
- The room reads at 1280x720 with the HUD; the player silhouettes read against
  the board.
- The Silicon still is visibly different from the Nerve Forest still: graphite/
  cyan, orthogonal PCB, no nerve trunks, no amber ambient glow, no neuron
  character.

STOP CONDITIONS
Stop and report if:
- the level needs a new node, link, entity, gate, verb, UI surface, or save
  field;
- pack:validate or pack:smoke cannot support the second pack without engine
  code;
- the puzzle solution trace cannot reach the win predicate;
- an asset ID cannot resolve or a required licence is missing;
- the visual theme cannot be made distinct without a new palette family/ADR;
- two source documents contradict each other in a way that changes the level;
- an unrelated test fails.

DELIVERABLES
- The Silicon pack and level files.
- The level README with the actual puzzle graph, room facts, evidence,
  co-op/solo, asset register, and validation results.
- The catalog/mapping/manifest/theme/materials updates.
- The validation/smoke/test updates.
- A short report: files changed, commands run, warnings, deviations, open
  questions.
```

---

## 2. Level spec

### 2.1 Learning target

The player can map:

```text
Body:     receptor → sensory neuron → spinal cord → motor neuron → muscle
Hardware: sensor   → interrupt line → interrupt controller → CPU → actuator
```

and answer: **“Where is the ‘spinal cord’ in this system?”** The correct answer
is the **interrupt controller**, not the CPU. The CPU is the output side of the
loop.

### 2.2 Fiction

The player shrinks into a circuit board. A sensor is detecting a change, but the
interrupt line is routed straight to the CPU, so nothing happens. The CPU Core
agent explains:

> “A sensor does not shout directly at the CPU. The interrupt line rings the
> controller. The controller decides what I should do. I am the output side, not
> the spinal cord. Find the controller.”

### 2.3 Spatial layout

```text
+------------------------------------------------------------------+
|  Interrupt board                                                 |
|                                                                  |
|  [CPU Core]  [sensor console]  [sensor pad]  [route plug]        |
|                                            |                     |
|                                            v                     |
|                              [controller socket]   [CPU socket]  |
|                                      |                  (decoy)  |
|                                      v                           |
|                              [interrupt controller]              |
|                                      |                           |
|                                      v                           |
|                              [CPU wake timer]                    |
|                                      |                           |
|                                      v                           |
|                              [actuator gate] --> [exit]          |
|                                                       [transfer] |
+------------------------------------------------------------------+
```

- One screen; `off` tether.
- The CPU socket is a visible decoy; it does not open the actuator.
- The controller socket is the integration point.
- The transfer console is behind the actuator; the engine does not enforce the
  order, so record that gap (like 04’s Ca²⁺ gate). The player can answer the
  transfer prompt before the solve; the evidence is optional.

### 2.4 Puzzle rules

1. A player interacts with the **sensor console**. The puzzle activates.
2. A player steps on the **sensor pad**. The sensor trigger fires once and
   latches. The HUD says: “Sensor triggered — route the interrupt line.”
3. The player picks up the **route plug** and drops or pushes it onto either
   the **controller socket** or the **CPU socket**. The sockets ignore a
   carried plug; the player must release it.
4. If the plug is on the controller socket, the controller relay receives both
   the sensor trigger and the socket input; the relay activates.
5. The relay starts the **CPU timer**. When it elapses, the **actuator gate**
   opens and latches. The actuator responds; the exit/debrief opens.
6. If the plug is on the CPU socket, the controller relay lacks the socket
   input; the CPU does not wake. The HUD says: “No controller signal — the CPU
   never woke.” The player can move the plug; no fail state.
7. Reset returns the route plug to spawn; the sensor trigger, controller relay,
   CPU timer, and actuator gate reset. Players stay where they are.

### 2.5 Feedback and hints

| Trigger | Feedback | Evidence |
|---|---|---|
| Sensor pad pressed | “Sensor triggered — route the interrupt line.” | Progression |
| Plug on CPU socket | “No controller signal — the CPU never woke.” | Hint; no penalty |
| Plug on controller socket | “Controller active — CPU wake signal sent.” | Progression |
| CPU timer elapses | “Actuator responds.” | `puzzle_solved` |
| Transfer prompt wrong | “That is the sensor/line/CPU/actuator, not the integration point.” | Optional gate feedback |

Authored hints:

1. “The sensor does not shout directly at the CPU. Route the interrupt line to
   the controller.”
2. “The controller socket is the integration point. The CPU socket is the
   decoy.”
3. “The CPU is the output side. The controller wakes it, then the actuator
   responds.”

### 2.6 Evidence

| Objective | Event | Filter | Required |
|---|---|---|---|
| OBJ-5 | `puzzle_solved` | `{ puzzleId: "puzzle-interrupt-loop" }` | yes |
| OBJ-5 | `debrief_answered` | `{ promptId: "prompt-obj-5" }` | yes |
| OBJ-5 | `gate_solved` | `{ gateId: "gate-transfer" }` | no |

The runtime derives the debrief prompt as `prompt-obj-5`. The syllabus EV-5
filter uses `prompt-transfer`; record the mismatch. Do not edit the syllabus
without a curriculum decision.

### 2.7 Co-op and solo

- **Co-op:** P1 triggers the sensor and can watch the controller; P2 carries
  and drops the route plug. Either player can interact with the console and
  scan. Optional work token: one player can carry it to the actuator plate as a
  visual beat.
- **Solo:** P1 uses the solo union. Step on the sensor (trigger latches), pick
  up the route plug, drop it on the controller socket, wait for the CPU timer,
  enter the actuator.
- **No co-op-only route:** the same sequence works with one body.
- **Tether:** `off`; the puzzle geometry fits 1280 × 720.

### 2.8 Scope

In:

- one room, one spatial puzzle, one optional transfer gate;
- one new pack, one theme, one material atlas, one agent, scans, props, gates,
  exit, and a placeholder manifest;
- shared players, badge, UI, and audio cues.

Out:

- engine changes, new mechanics, new node/link/entity/gate types;
- new music or ambience;
- the anatomy pack’s nerve assets;
- 05 Reflex Core (separate future level);
- online co-op (M4).

---

## 3. Puzzle graph

### 3.1 Expected `puzzle.json`

```json
{
  "schemaVersion": "1.1",
  "id": "puzzle-interrupt-loop",
  "title": "Interrupt Loop",
  "objectiveIds": ["OBJ-5"],
  "conceptIds": ["CON-7", "CON-8"],
  "activation": { "mode": "interact", "entityId": "sensor-console" },
  "tether": "off",
  "nodes": [
    {
      "id": "sensor-pad",
      "type": "plate",
      "rect": { "x": 448, "y": 600, "width": 64, "height": 48 },
      "detects": ["player"],
      "minimum": 1,
      "countCarried": false
    },
    {
      "id": "sensor-trigger",
      "type": "trigger",
      "once": true
    },
    {
      "id": "route-plug",
      "type": "prop",
      "entityId": "route-plug",
      "tags": ["route"],
      "shape": "plug",
      "spawn": { "x": 512, "y": 620 }
    },
    {
      "id": "controller-socket",
      "type": "plate",
      "rect": { "x": 704, "y": 600, "width": 64, "height": 48 },
      "detects": ["prop"],
      "minimum": 1,
      "countCarried": false
    },
    {
      "id": "cpu-socket",
      "type": "plate",
      "rect": { "x": 864, "y": 600, "width": 64, "height": 48 },
      "detects": ["prop"],
      "minimum": 1,
      "countCarried": false
    },
    {
      "id": "controller-relay",
      "type": "relay",
      "mode": "allOf"
    },
    {
      "id": "cpu-timer",
      "type": "timer",
      "durationTicks": 60,
      "repeat": false
    },
    {
      "id": "gate-actuator",
      "type": "gate",
      "entityId": "gate-actuator",
      "initial": "closed",
      "latched": true
    }
  ],
  "links": [
    { "from": "sensor-pad", "to": "sensor-trigger", "type": "press" },
    { "from": "sensor-trigger", "to": "controller-relay", "type": "activate" },
    { "from": "controller-socket", "to": "controller-relay", "type": "activate" },
    { "from": "controller-relay", "to": "cpu-timer", "type": "start" },
    { "from": "cpu-timer", "to": "gate-actuator", "type": "elapsed" }
  ],
  "win": { "type": "gateOpen", "gateId": "gate-actuator" },
  "reset": {
    "props": ["route-plug"],
    "nodes": [
      "sensor-pad",
      "sensor-trigger",
      "route-plug",
      "controller-socket",
      "cpu-socket",
      "controller-relay",
      "cpu-timer",
      "gate-actuator"
    ]
  },
  "evidence": {
    "onSolve": ["puzzle_solved"],
    "counters": ["pickups", "drops", "resets"]
  },
  "rewards": { "abilities": [], "flags": [], "mapNodes": [] },
  "solution": [
    { "action": "move", "actor": "p1", "x": 480, "y": 620 },
    { "action": "wait", "ticks": 2 },
    { "action": "move", "actor": "p1", "x": 512, "y": 620 },
    { "action": "pickup", "actor": "p1", "target": "route-plug" },
    { "action": "move", "actor": "p1", "x": 720, "y": 620 },
    { "action": "drop", "actor": "p1", "target": "route-plug" },
    { "action": "wait", "ticks": 80 }
  ],
  "hints": [
    "The sensor does not shout directly at the CPU. Route the interrupt line to the controller.",
    "The controller socket is the integration point. The CPU socket is the decoy.",
    "The CPU is the output side. The controller wakes it, then the actuator responds."
  ]
}
```

### 3.2 Graph checks

- `sensor-pad` → `sensor-trigger`: `press` is a valid plate → trigger link.
- `sensor-trigger` → `controller-relay`: `activate` is a valid trigger → relay
  link.
- `controller-socket` → `controller-relay`: `activate` is a valid plate → relay
  link.
- `controller-relay` → `cpu-timer`: `start` is a valid relay → timer link.
- `cpu-timer` → `gate-actuator`: `elapsed` is a valid timer → gate link.
- No link leaves `cpu-socket`; it is a decoy.
- The relay is `allOf`; it needs both the sensor trigger and the controller
  socket.
- The gate is latched; the timer cannot undo the solve.
- The solution trace uses P1 only; the replay harness must reach the win.
- Reset includes every node whose state changes.

If the solution trace fails, adjust the coordinates, not the graph semantics.
If the graph needs a new link type, stop and write an ADR.

---

## 4. Room layout

### 4.1 Tile grid

- 40 × 23 tiles at 32 px.
- Row 0 is ceiling/wall; columns 0 and 39 are walls; rows 20–22 are floor.
- `layers.tiles`: `#` for solid, space for empty.
- `tileMaterials`: `s` for substrate walls/upper structure; `c` for circuit
  floor.
- `defaultMaterialId`: `substrate`; `materialSeed`: 3.

### 4.2 Entity table

| Entity ID | Type | x,y | Sprite | Notes |
|---|---|---:|---|---|
| player1 spawn | spawn | 3,20 | — | On the floor |
| player2 spawn | spawn | 5,20 | — | On the floor |
| checkpoint-entry | checkpoint | 4,20 | — | On the floor |
| agent-cpu | agent | 6,20 | `sprite.agent.cpu` | `dialogueId: dlg-cpu-01` |
| sensor-console | decor | 11,20 | `sprite.console.sensor` | Puzzle activation entity |
| scan-sensor | scanTarget | 12,18 | `sprite.scan.sensor` | CON-8 |
| pad-sensor | decor | 14,20 | `sprite.pad.sensor` | Aligns with sensor plate |
| body-route-plug | body | 16,20 | — | Dynamic prop body |
| route-plug | prop | 16,20 | `sprite.prop.route_plug` | Tags `route`, shape `plug` |
| scan-interrupt | scanTarget | 18,18 | `sprite.scan.interrupt` | CON-8 |
| controller-socket | decor | 22,20 | `sprite.socket.controller` | Aligns with controller plate |
| scan-controller | scanTarget | 22,17 | `sprite.scan.controller` | CON-8 |
| cpu-socket | decor | 27,20 | `sprite.socket.cpu` | Decoy socket |
| scan-cpu | scanTarget | 30,18 | `sprite.scan.cpu` | CON-8 |
| scan-actuator | scanTarget | 35,18 | `sprite.scan.actuator` | CON-8 |
| gate-actuator | puzzleGate | 35,20 | `sprite.gate.actuator` | `gateId: gate-actuator` |
| exit-silicon | decor | 37,19 | `sprite.exit.silicon` | Exit visual |
| transfer-console | gate | 38,19 | `sprite.console.transfer` | `gateId: gate-transfer` |

### 4.3 Alignment

- `sensor-pad` plate rect `x=448, y=600, w=64, h=48` covers tiles 14–15 on the
  floor. The plate is two tiles wide for a forgiving landing; the visible
  `pad-sensor` is one tile at tile 14.
- `controller-socket` plate rect `x=704, y=600, w=64, h=48` covers tiles 22–23.
  The visible socket is at tile 22; the plug drop at x=720 is the socket centre.
- `cpu-socket` plate rect `x=864, y=600, w=64, h=48` covers tiles 27–28. The
  visible decoy socket is at tile 27.
- The `off` tether span is under 1280 × 720: the sensor pad starts at x=448,
  the actuator gate entity is at x=1120; the width is under 700 px. The
  controller/CPU rects are between.
- The exit is at (37,19); the transfer console is at (38,19). The right wall is
  at x=39.

### 4.4 Optional work token

The work token is optional. Include it only if you add all of:

- `body-work-token` and `work-token` prop at (31,20);
- `work-plate` plate at (31,20), detects prop, no link to the relay or gate;
- the work token and work plate in the puzzle nodes/reset;
- a feedback label.

It must not open the actuator gate or bypass the controller. If it complicates
the solve, omit it and leave `sprite.prop.work_token` out of the pack manifest.
The asset prompt still provides the art prompt for a later pass.

---

## 5. Dialogue and gate copy

### 5.1 `dlg-cpu-01`

Suggested copy:

- **intro:** “You are on the interrupt board. The sensor is ringing, but the
  line is wired straight to me. Nothing happens.”
- **problem:** “A sensor does not shout directly at the CPU. The interrupt line
  rings the controller. The controller decides what I should do. I am the output
  side, not the spinal cord.”
- **clue:** “Find the controller socket. Route the interrupt line to the
  controller, not to me. The controller is the integration point.”
- **check:** “Which part is the integration point?”  
  - “The CPU” → retry.  
  - “The interrupt controller” → right.
- **retry:** “No. I am the output side. The controller is the integration
  point.”
- **right:** “Exactly. The controller maps to the spinal cord in this analogy.
  It integrates the sensor’s interrupt and wakes me. I am the output side.”  
  Effects: reveal CON-7, reveal CON-8, record `concept_revealed` for CON-8,
  reveal `map-interrupt-loop`.
- **handoff:** “Start the loop at the sensor console. Step on the sensor pad,
  carry the route plug to the controller socket, and wait for the controller to
  wake me. Then the actuator responds.”

Do not write “the CPU is the brain,” “the CPU decides,” or “the CPU is the
spinal cord.”

### 5.2 `gate-transfer`

```json
{
  "schemaVersion": "1.0",
  "id": "gate-transfer",
  "type": "concept",
  "objectiveId": "OBJ-5",
  "conceptIds": ["CON-7", "CON-8"],
  "prompt": "Where is the 'spinal cord' in this system?",
  "puzzle": {
    "type": "singleChoice",
    "options": [
      { "id": "sensor", "text": "The sensor" },
      { "id": "line", "text": "The interrupt line" },
      { "id": "controller", "text": "The interrupt controller" },
      { "id": "cpu", "text": "The CPU" },
      { "id": "actuator", "text": "The actuator" }
    ],
    "answerId": "controller"
  },
  "hints": [
    "The sensor is the input; the CPU is the output side.",
    "The integration point is between them.",
    "The interrupt controller is the 'spinal cord' analogue."
  ],
  "onSolve": [
    { "type": "setFlag", "flagId": "transfer-known", "value": true },
    { "type": "revealMap", "nodeId": "map-interrupt-loop" }
  ],
  "onFail": [
    { "type": "recordEvidence", "event": "gate_failed", "gateId": "gate-transfer" }
  ]
}
```

The room `transfer-console` is a `gate` entity with `gateId: "gate-transfer"`.
The gate is optional evidence; the puzzle solve and debrief are required.

---

## 6. Pack, theme, materials, and assets

### 6.1 `pack.json`

```json
{
  "schemaVersion": "1.1",
  "id": "silicon-reflex",
  "title": "Silicon: Interrupt Loop",
  "domain": "computer-science",
  "version": "0.1.0",
  "syllabusId": "anatomy-reflex",
  "startLevelId": "01-interrupt-loop",
  "endLevelId": "01-interrupt-loop",
  "levels": ["01-interrupt-loop"],
  "theme": "theme.json",
  "mapping": "mapping.json",
  "licenses": "licenses.json",
  "materials": "materials.json",
  "assetManifests": {
    "placeholder": "assets.placeholder.json",
    "final": "assets.final.json"
  },
  "assets": {
    "tilesets": ["tileset.silicon"],
    "sprites": [
      "sprite.player.p1",
      "sprite.player.p2",
      "sprite.agent.cpu",
      "sprite.prop.route_plug",
      "sprite.socket.controller",
      "sprite.socket.cpu",
      "sprite.gate.actuator",
      "sprite.exit.silicon",
      "sprite.scan.sensor",
      "sprite.scan.interrupt",
      "sprite.scan.controller",
      "sprite.scan.cpu",
      "sprite.scan.actuator",
      "sprite.pad.sensor",
      "sprite.console.sensor",
      "sprite.console.transfer"
    ],
    "audio": [
      "audio.cue.boot",
      "audio.cue.dialogue",
      "audio.cue.scan",
      "audio.cue.dash",
      "audio.cue.gate",
      "audio.cue.map",
      "audio.cue.debrief",
      "audio.cue.checkpoint",
      "audio.cue.unlock",
      "audio.cue.wrong",
      "audio.cue.jump",
      "audio.cue.land"
    ]
  },
  "ageRating": "12+",
  "description": "A one-room transfer fixture: sensor, interrupt line, interrupt controller, CPU, actuator.",
  "metadata": {
    "author": "Snorre",
    "created": "2026-11-01",
    "updated": "2026-11-01",
    "stage": "M2 Silicon fixture"
  }
}
```

### 6.2 `theme.json`

Use the anatomy theme as the structural template. Required changes:

- `id`: `silicon-reflex-theme`.
- Palette: graphite/cyan role mapping; `nerve`, `nerveGlow`, `nerveDark` map
  to the joint cyan ramp for UI; `orange` remains reserved/unused.
- `ui.materials`: `panel: substrate`, `dialogue: circuit`,
  `debrief: substrate`.
- `ui.patterns`: `panel: solder-mask`, `dialogue: circuit-traces`,
  `debrief: solder-mask`.
- `ui.assets`: badge, icon.scan, icon.map, icon.log, portrait.cpu,
  panel.dialogue, panel.gate, panel.debrief, panel.map.
- `audio.cues`: the 11 shared cues plus `wrong`.
- Fonts: Silkscreen + Pixelify Sans; no CDN.

### 6.3 `materials.json`

Use the plan in §10 of the theme doc. Key validation points:

- Every palette token exists in `theme.json`.
- Every `patternId` exists in `patterns`.
- Every variant set frame key is in the `edge` mask space `"0"`–`"15"`.
- Every frame ref resolves to `tile.circuit.atlas` and `mask-0`–`mask-15`.
- `circuit-edge` belongs to `circuit`; `substrate-edge` belongs to `substrate`.
- The atlas is 128×128 with 16 regions; every cell opaque; 2×2 clusters.

### 6.4 Assets

Add placeholders first. The final asset pass is in
[`01-interrupt-loop-assets.md`](01-interrupt-loop-assets.md). The placeholder
manifest must resolve every ID referenced by the room, theme, and pack.

Copy these shared files into the Silicon pack and add licence entries:

- `shared/sprites/player-p1.png`
- `shared/sprites/player-p1-walk.png`
- `shared/sprites/player-p1-jump.png`
- `shared/sprites/player-p1-fall.png`
- `shared/sprites/player-p1-land.png`
- `shared/sprites/player-p2.png`
- `shared/sprites/player-p2-walk.png`
- `shared/sprites/player-p2-jump.png`
- `shared/sprites/player-p2-fall.png`
- `shared/sprites/player-p2-land.png`

Do not copy the nerve agent, nerve scans, nerve gates, or nerve backgrounds.

Create `shared/tiles/circuit-atlas.svg` as a 128×128 placeholder with 16 32×32
cells and regions `mask-0`–`mask-15`; add a CC0 placeholder licence entry. The
final atlas replaces it with `circuit-atlas.png`.

### 6.5 Catalog and tests

- `public/packs/index.json`: Silicon status `available`, online `false`,
  order `20`, title `Silicon: Interrupt Loop`.
- `scripts/pack-validate.ts`: validate the Silicon pack too.
- `scripts/pack-smoke.ts`: add the Silicon runtime path.
- `tests/app-state.test.ts`: Silicon is selectable.
- `e2e/hub.spec.ts`: Silicon is available and startable.
- `tests/catalog.test.ts`: keep the local parser fixture; do not let it mask
  the real catalog change.

---

## 7. Validation and acceptance

### 7.1 Commands

```text
npm test
npm run pack:validate
npm run pack:smoke
npm run pack:map -- --pack silicon-reflex
npm run build
git diff --check
npm run smoke:e2e
```

### 7.2 Expected warnings

- `COVERAGE_OBJECTIVE_UNMAPPED` for OBJ-1–OBJ-4.
- `COVERAGE_CONCEPT_UNMAPPED` for CON-1–CON-6.

Record them. Do not duplicate anatomy content to silence them.

### 7.3 Manual checks

- [ ] `?pack=silicon-reflex` loads and starts at `01-interrupt-loop`.
- [ ] The sensor console activates the puzzle; the sensor pad triggers once.
- [ ] The route plug can be carried, dropped, pushed, and recovered.
- [ ] The controller socket solves; the CPU socket gives feedback and does not
  solve.
- [ ] The actuator gate latches; the debrief opens and finishes.
- [ ] `puzzle_solved` and `debrief_answered` are recorded; the transfer gate is
  optional.
- [ ] The room reads at 1280×720; the player silhouettes read against the
  board.
- [ ] The Silicon still is visibly different from the Nerve Forest still.
- [ ] No nerve asset ID or motif appears in the pack.

### 7.4 Known deviations

- The transfer console is reachable before the actuator gate opens because
  puzzle gates have no collision. The dialogue and layout state the intended
  order; record the gap.
- The runtime requires a debrief answer to finish the level; the level records
  `debrief_answered` as required for the Silicon pack. The anatomy pack still
  treats OBJ-5 as optional/stretch.
- The syllabus EV-5 filter uses `prompt-transfer`; the runtime derives
  `prompt-obj-5`. Use `prompt-obj-5` for runtime evidence and record the
  mismatch.
- The work token is optional. If it is not wired, do not add its asset ID to
  the pack manifest.
- The `sprite.checkpoint` / `sprite.checkpoint.silicon` asset is not generated;
  the room uses the checkpoint data point.

---

## 8. Definition of done

- [ ] The pack/level files exist and parse.
- [ ] The pack loads from the hub and starts.
- [ ] The puzzle solves solo; co-op is additive; no fail state.
- [ ] The actuator gate latches; the debrief records evidence.
- [ ] The transfer gate is optional and records its own evidence.
- [ ] All required asset IDs resolve or are declared placeholders.
- [ ] The shared player assets are copied and licensed.
- [ ] The catalog/mapping/manifests/theme/materials are consistent.
- [ ] `npm test`, `pack:validate`, `pack:smoke`, `pack:map`, `build`,
  `git diff --check`, and `smoke:e2e` pass.
- [ ] The Silicon still passes the visual-difference check.
