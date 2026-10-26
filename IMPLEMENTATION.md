# Shrinkonauts M1 — Implementation Notes

M1 delivers the runtime and the first vertical slice: the app boots directly
into **03 — Nerve Forest**, loads the `anatomy-reflex` pack and syllabus, and
plays one complete loop — dialogue, scan, concept gate, ability unlock, map and
concept log, exit, debrief, evidence export — with autosave/restore and local
co-op.

The M0.2 foundation is preserved: placeholder-first assets, the provider chain,
the audio cue layer, the fixed-step simulation, the DOM HUD, the pure validator,
and every existing acceptance command. M1 adds content, orchestration, and a
real browser smoke on top of it.

No final art or audio is included. Every anatomy asset ID resolves to a
procedural placeholder, and every cue resolves to a synth or silent fallback.

## Status

| Area | State |
| --- | --- |
| Direct boot into `03-nerve-forest` | Working |
| Pack + syllabus loading from `public/` | Working |
| Dialogue graph (linear nodes, choices, effects) | Working |
| Concept scan and concept log | Working |
| Concept gate (`singleChoice`, `sequence`, `match`) | Working |
| First level uses a `sequence` gate | Working |
| Ability unlock (`signal-dash`) | Working |
| Map reveal and node/edge traversal | Working |
| Debrief, teach-back, evidence export | Working |
| Autosave + restore (`shrinkonauts.run`) | Working |
| Audio + accessibility settings (`shrinkonauts.settings`) | Working |
| Local co-op, tether, checkpoint P2 toggle | Working |
| Pause, text scale, reduced motion, mute, focus management | Working |
| Placeholder asset pipeline (35/35 anatomy IDs) | Working |
| Pure validator with advisory warnings | Working |
| Headless runtime smoke | Working |
| Playwright browser smoke on system Chrome | Working |
| Final art/audio | Deferred |
| Levels 2–5, second core gate, capture mode | Deferred |
| Music and ambience loops | Deferred |
| Full key rebinding | Deferred |
| Conditional dialogue-node skipping | Deferred |

## Commands

Run from `shrinkonauts/`:

```bash
npm install
npm run dev             # http://127.0.0.1:5173/
npm test                # 13 files, 74 unit/integration tests
npm run smoke           # room boot + module boundary tests
npm run build           # tsc --noEmit + Vite production build
npm run pack:validate   # dev fixture + anatomy pack validation
npm run pack:map        # regenerate/check the mapping document
npm run pack:smoke      # dev simulation + headless M1 runtime loop
npm run smoke:e2e       # Playwright, system Chrome, port 4173
npm run preview         # serve dist/
```

`smoke:e2e` starts Vite on port 4173 and launches Playwright with
`channel: "chrome"`. It uses the installed system Chrome and never downloads a
bundled browser.

Asset modes:

```text
/                  # anatomy pack, procedural placeholders
/?assets=fixture   # anatomy fixture manifest if present, else warn + placeholders
/?assets=final     # final manifest (current entries are placeholders)
```

Unknown `?assets=` values fall back to placeholder mode. The M1 app does not
boot `public/content/dev`; that tree remains the regression fixture for scripts
and tests.

## Architecture

```text
platform ──> game ──> audio ──> assets
                  ├─> assets
                  ├─> syllabus
                  ├─> pack
                  ├─> progression
                  ├─> narrative
                  ├─> curriculum
                  ├─> save
                  ├─> ui
                  └─> world ──> assets, pack

pack ──> assets, core, syllabus
progression, narrative ──> pack
curriculum ──> core, pack, syllabus
save ──> curriculum, progression
```

| Module | Responsibility | May import |
| --- | --- | --- |
| `core` | `Result`, logger, event bus, shared event vocabulary | — |
| `syllabus` | Syllabus schema, parser, objective/concept lookups | `core` |
| `assets` | Logical IDs, manifests, providers, preload, placeholder fallback | `core` |
| `pack` | Pack/level/room/dialogue/gate/mapping schemas, parsers, browser loader, pure validator | `assets`, `core`, `syllabus` |
| `progression` | Abilities, flags, gates, map reveal, puzzle evaluation | `pack` |
| `narrative` | Dialogue traversal, choices, effects | `pack` |
| `curriculum` | Learning events, objective progress, debrief, evidence export | `core`, `pack`, `syllabus` |
| `save` | Versioned run slot, audio/accessibility settings | `curriculum`, `progression` |
| `audio` | Cue playback, Web Audio, unlock, mute/volume, providers | `assets`, `core` |
| `ui` | HUD, overlays, theme tokens, focus management, settings controls | `assets`, `core`, `curriculum`, `pack` |
| `world` | Phaser scene, fixed-step simulation, rendering, keyboard input, cues | `assets`, `core`, `pack` |
| `game` | Pure runtime orchestrator and adapter-heavy browser boot | all domain/adapters |
| `platform` | Browser entry point | `core`, `game`, `ui` |

`tests/boundaries.test.ts` enforces the graph: no Phaser outside `world`, no
media paths outside `assets`, no direct media imports in gameplay/UI/audio/
platform, and no upward or cyclic module dependencies.

Two deliberate seams keep the graph acyclic:

- `src/ui/model.ts` is the presentation contract. The runtime produces view
  models; the DOM renderer renders them. `ui` never imports `game`.
- `src/world/runtime-port.ts` defines `WorldRuntime`, `RuntimeInput`, and
  `FrameActions`. `RoomScene` depends on that structural port, not on `game`.

The one documented dependency exception is `pack/validate.ts` importing
`../assets`. Validation must answer the same question the renderer asks — does
this logical ID resolve, and to what? Reusing `createAssets` and the shared ID
constants avoids a second resolver that could drift. The import is pure: no
file, DOM, network, or Phaser APIs are involved, and `fileExists` is injected
by the Node or browser caller (see `src/pack/validate.ts`).

## Runtime lifecycle

`src/game/runtime.ts` is a plain TypeScript orchestrator. It owns run state but
never touches the DOM, Phaser, Web Audio, localStorage, or asset files.

```text
start()
  └─ loadRun(packId, packVersion)
       ├─ valid save  → restoreRun()
       └─ none/invalid → newRun()

newRun()
  ├─ clearRun()
  ├─ abilities = ["scan"]
  ├─ clear curriculum, debrief answers, triggers
  ├─ activeP2 = true
  └─ enterLevel(startLevelId, fresh)

enterLevel()
  ├─ rebuild RoomSimulation
  ├─ place both players at the entry checkpoint (or restore positions)
  ├─ reveal the level's map node
  ├─ record pack_loaded / level_started / room_entered
  ├─ play the boot cue
  └─ autosave

restoreRun()
  ├─ restore progression + learning events + checkpoint
  ├─ restore both player positions
  ├─ status "debrief"  → enterDebrief(false)
  ├─ status "complete" → enterDebrief(false) + finish
  └─ toast "Resumed from checkpoint"
```

`step(dt, input)` advances the simulation, drains one-shot actions, checks
checkpoints/triggers/exits, and returns gameplay cues (`jump`, `land`, `dash`).
Actions are latched by the input source, so an `E` tap is consumed exactly once
by the next fixed step even when several render frames occur first.

### State machine

`src/game/state-machine.ts` defines the only legal transitions:

```text
boot → level
level ↔ dialogue | gate | map | conceptLog | pause
dialogue | gate | map | conceptLog | pause → level
level → debrief → complete
any → error
```

`Esc` is a shared close action: it closes the map, concept log, gate, dialogue,
or debrief-as-pause before toggling the pause overlay. Overlays are blocking:
the scene ignores movement while a non-level state owns input. The runtime emits
a snapshot only when it changes (deduplicated), which keeps DOM updates cheap.

### The vertical slice

`03-nerve-forest` is temporarily both the start and end level. Flow:

```text
spawn (checkpoint-entry)
  → Neuron Keeper dialogue (dlg-neuron-01)
      ├─ correct choice reveals CON-3, CON-4, CON-5 and the map node
      └─ wrong choice loops to the retry node
  → optional scans (CON-3 … CON-7)
  → Signal Gate (gate-nerve-01, sequence)
      └─ solve: record gate_solved, unlock signal-dash, reveal map edge
  → exit-to-muscle (requires the solved gate)
      └─ record level_completed, then debrief
  → debrief for OBJ-2 → record debrief_completed → complete
  → export evidence JSON
```

Correct gate order:
`Receptor → Sensory neuron → Spinal cord → Motor neuron → Muscle`.

`scan` is available from the start. `signal-dash` is granted only by the gate.
The exit is gated by `gate-nerve-01`, and walking into it before solving produces
a throttled warning instead of completing the level. Solo play is the same
level with P2 inactive.

## Pack and syllabus loading

`src/pack/load-pack.ts` is the browser loader. It fetches a pack directory,
resolves referenced JSON files, parses every document, and returns a structured
`PackContent` or a single error.

```text
public/packs/anatomy-reflex/
  pack.json                 start/end level, manifests, assets
  theme.json                palette, fonts, parallax, UI assets
  mapping.json              concept → objective/level coverage
  licenses.json             licence entries
  assets.placeholder.json   placeholder manifest
  assets.final.json         final manifest (currently placeholder entries)
  levels/03-nerve-forest/
    level.json              objectives, concepts, dialogue/gate ids, map, evidence
    room.json               tiles, entities, checkpoints, triggers, exits
    dialogue.json           graph, choices, effects
    gate.json               puzzle, hints, onSolve/onFail effects
public/syllabi/anatomy-reflex.json
```

Parsers reject unsupported schema versions, duplicate IDs, unknown references,
malformed tiles, and cyclic prerequisites with a typed error. `PackContent`
exposes lookups (`levels`, `rooms`, `dialogues`, `gates`) and the parsed
`Syllabus`. The app boots only `anatomy-reflex`; `public/content/dev` is loaded
by `scripts/content-loader.ts` for the M0 regression checks.

The `pack` module also owns mapping generation and drift detection
(`npm run pack:map`) so concept/objective/level coverage stays consistent with
the authored JSON.

## Gate types

All three puzzle types are implemented and evaluated in
`src/progression/index.ts`; the first level uses `sequence`.

| Puzzle | Answer shape | Evaluation |
| --- | --- | --- |
| `singleChoice` | `string` | equals `answerId` |
| `sequence` | `string[]` | exact ordered array equality |
| `match` | `Record<string,string>` | same key set and every value equals |

Gate state types (`ability`, `flag`, `concept`) are also implemented as state
checks, so the contract is complete even though M1 authors a concept gate.
Correct submissions record `gate_solved`, apply `onSolve` effects, and persist;
incorrect submissions record `gate_failed`, apply `onFail`, and show feedback
without closing the gate. Hints are stepped through with a bounded index.

## Input and co-op

`src/world/input.ts` samples P1, P2, and shared keys. Keydown events are latched
into a set; the next fixed step drains each one exactly once. This replaces
`Phaser.Input.Keyboard.JustDown`, which clears on keyup and silently drops taps
shorter than a render frame (including Playwright's instant presses).

| Player | Move | Jump | Interact | Scan | Dash |
| --- | --- | --- | --- | --- | --- |
| P1 | `A` / `D` | `W` or `Space` | `E` | `Q` | `Shift` |
| P2 | `←` / `→` | `↑` | `,` | `.` | `/` |

Shared: `P` join/rest P2 at a checkpoint, `Tab` map, `C` concept log, `Esc`
pause/close, `M` mute. `Tab` is captured so focus cannot leave the game before
the map overlay takes over. `RoomScene` buffers the sampled frame until a fixed
step consumes it, so 120 Hz render loops cannot drop a press either. When a text
field owns focus, `discard()` clears latched actions.

Both players are active at boot. Co-op is not a separate mode: either player can
talk, scan, open the gate, or cross the exit. The tether keeps the pair within
560 px; when they separate further, P2 is pulled toward P1 so the shared camera
cannot lose a player. `P` only changes P2 at a checkpoint, and rejoining places
P2 beside P1 at that checkpoint.

## Save format

`src/save/index.ts` owns both localStorage slots and all persistence.

```text
shrinkonauts.run        one versioned run snapshot
shrinkonauts.settings   audio + accessibility settings
```

```json
{
  "schemaVersion": "1.0",
  "packId": "anatomy-reflex",
  "packVersion": "0.1.0",
  "levelId": "03-nerve-forest",
  "roomId": "room-nerve-forest",
  "checkpointId": "checkpoint-entry",
  "progression": {
    "abilities": ["scan", "signal-dash"],
    "flags": {},
    "solvedGates": ["gate-nerve-01"],
    "revealedNodes": ["map-nerve-forest", "map-muscle-effector"],
    "revealedEdges": ["..."]
  },
  "events": [],
  "elapsed": 0,
  "savedAt": "2026-10-26T12:00:00.000Z",
  "players": {
    "p1": { "x": 144, "y": 640 },
    "p2": { "x": 176, "y": 640 },
    "activeP2": true
  },
  "status": "playing",
  "dialogue": { "dialogueId": "dlg-neuron-01", "nodeId": "check" }
}
```

`status` is `playing`, `debrief`, or `complete`. Loading rejects malformed JSON,
an unsupported schema version, a different pack ID, or a different pack version.
Settings clamp volume to `0..1` and text scale to `0.8..1.6`, and fall back to
defaults on corrupt data. Storage may be unavailable (private mode/no
localStorage); the save module then keeps working in memory.

Autosave runs at level start, checkpoint changes, gate solves, debrief updates,
and the player-2 toggle. It does not run after completion. The audio module
writes through `save.audioStorage`, so muting never invents a second settings
store.

## UI and accessibility

`src/ui/game-ui.ts` mounts a DOM HUD and blocking overlays; Phaser renders only
the room. The HUD shows level, objectives, mode, asset status, audio status, and
autosave state. Overlays cover dialogue, gate, map, concept log, debrief, pause,
completion, and fatal boot errors.

The M1 accessibility baseline is:

- `Esc` pause from gameplay, with a visible pause overlay.
- Text scale presets (90–150%) applied through `--ui-font-scale`.
- Reduced motion: sets `data-reduced-motion="true"` and disables CSS animation.
- Mute toggle (`M`) from gameplay and from every overlay, with HUD status.
- Focus management: overlays are `role="dialog"`, `aria-modal`, labelled,
  autofocus the first meaningful control, trap `Tab`/`Shift+Tab`, and restore
  focus to the previous element on close.
- Live regions for toasts, gate feedback, and debrief status.
- Semantic buttons and labels for gate reordering, choices, and debrief.

Full key rebinding is deferred. Settings changes update the mounted pause
overlay in place, so buttons reflect their new state without recreating the
DOM or losing focus.

## Asset pipeline

M1 preserves placeholder-first IDs. Gameplay, UI, and audio ask for logical IDs
such as `sprite.agent.neuron`, `bg.nerve_forest.mid`, or `audio.cue.scan`; only
`src/assets/` knows media paths.

```text
final manifest → fixture/pack manifest → placeholder provider
```

The anatomy pack declares 35 IDs and resolves all 35 to placeholders, including
the player sprites, tileset, four parallax layers, agent/gate/scene sprites,
checkpoint, exit, and eleven audio cues. `?assets=fixture` looks for an anatomy
fixture manifest; because none is authored for this slice, it warns and keeps
placeholders. The dev fixture still resolves 10/10 placeholders, or 7/10 with
its fixture manifest selected by the scripts.

The preload plan, validation, and boot fail loudly if an ID is unknown or a
referenced file is missing. `applyTheme` maps pack palette/fonts to CSS
variables, so placeholder art still respects the configured theme.

## Audio

Audio remains a replaceable presentation layer. Gameplay never reads audio
state; the runtime emits semantic cues and the boot adapter maps them to asset
IDs. M1 uses short cues only:

```text
boot, dialogue, scan, dash, gate, map, debrief, checkpoint, unlock,
jump, land, wrong
```

Web Audio is unlocked on the first keydown/pointerdown, mute and volume persist
through the save-owned storage seam, and missing/failed media warns and falls
back to a synth or silence. Music and ambience loops are deferred.

## Validation

`src/pack/validate.ts` is pure: filesystem access is injected via `fileExists`.
It checks schema versions, duplicate IDs, missing level/room/dialogue/gate
references, evidence rules, syllabus references, asset IDs and categories,
manifest files, licences for non-placeholder final entries, background layers,
audio/UI asset categories, theme tokens, and mapping drift.

For the one-level slice, forward references are advisory warnings rather than
failures:

- an exit to `04-muscle-effector`;
- the level's `nextLevelIds`;
- map edges to `map-joint-chamber` / `map-muscle-effector`;
- unattempted objectives and concepts.

`npm run pack:validate` currently reports these expected warnings for
`anatomy-reflex`, and passes both dev modes with no issues. `pack:map` checks
generated mapping drift, and `pack:smoke` asserts that all referenced anatomy
IDs resolve.

## Simulation and rendering

`src/world/simulation.ts` is the pure, fixed-step simulation: AABB tile
collision, gravity, jump/land detection, dash, active players, spawn helpers,
camera clamp, and the co-op tether. It has no Phaser dependency and is the same
code exercised by `pack:smoke` and `tests/room-boot.test.ts`.

`src/world/room-scene.ts` owns the Phaser scene: tile and parallax rendering,
placeholder textures, entity sprites, interaction highlights, camera follow,
and forwarding buffered keyboard frames to `WorldRuntime`. Phaser is imported
only under `src/world/`.

The room is 40 × 23 tiles at 32 px, with spawns at P1 `(3,20)` and P2 `(5,20)`,
`checkpoint-entry` at `(4,20)`, and `exit-to-muscle` at `(37,19)`.

## Test matrix

| Suite | What it covers |
| --- | --- |
| `tests/room-boot.test.ts` | Room parsing, simulation spawn/ground/camera/movement, jump/land cues |
| `tests/assets.test.ts` | ID validation, provider precedence, preload, placeholder fallback |
| `tests/manifest.test.ts` | Manifest parsing and malformed entries |
| `tests/audio.test.ts` | Cue playback, mute/volume, unlock, provider fallback |
| `tests/cue-emission.test.ts` | Jump/land cue emission from the simulation |
| `tests/syllabus.test.ts` | Real syllabus parse, lookups, duplicate/cycle/evidence rejection |
| `tests/validate.test.ts` | Dev content validation and failure modes |
| `tests/progression.test.ts` | Abilities, gates, all three puzzles, map traversal |
| `tests/narrative.test.ts` | Linear dialogue, choices, effects, unknown choice |
| `tests/curriculum.test.ts` | Evidence matching, objective progress, debrief, export |
| `tests/save.test.ts` | Settings/run persistence, version/pack rejection, clear |
| `tests/runtime.test.ts` | Boot, full loop, restore, P2 toggle, overlays, dash unlock |
| `tests/boundaries.test.ts` | Media paths, Phaser confinement, acyclic module graph |
| `e2e/m1.spec.ts` | Real browser: boot, dialogue, scan, gate, debrief, export, pause/settings/map/mute |

`npm run smoke` runs the room-boot and boundary suites. `pack:smoke` adds a
headless full-loop runtime run plus the M0 placeholder/fixture simulation
regression. `smoke:e2e` runs two Playwright tests against the dev server using
system Chrome.

## Verification performed

On 26 October 2026, after the M1 changes:

```text
npm test            13 files, 74 tests passed
npm run build       tsc clean + Vite production build
npm run pack:validate  dev placeholder/fixture PASS; anatomy PASS with expected warnings
npm run pack:smoke     dev modes PASS; anatomy runtime loop PASS (35 IDs, 35 placeholders)
npm run smoke:e2e      2/2 passed (system Chrome, port 4173)
npx tsc --noEmit       clean
```

### Screenshots

Captured from the M1 build with system Chrome at 1280 × 720; every asset is a
procedural placeholder:

| Nerve Forest | Dialogue | Signal gate |
| --- | --- | --- |
| ![Nerve Forest](screenshots/m1-nerve-forest.png) | ![Neuron Keeper dialogue](screenshots/m1-dialogue.png) | ![Sequence gate](screenshots/m1-gate.png) |

## Deferred

- Final art and final audio; only procedural placeholders exist.
- The Silicon fixture.
- Levels 2–5 and the second core gate.
- Capture mode.
- Music and ambience loops.
- Full key rebinding.
- Conditional dialogue-node skipping; M1 supports linear nodes, choices, and
  effects only.
- A dedicated pack-select or intro screen (M1 boots straight into the level).

## Decisions and deviations

- **Direct boot.** No PackSelect or Intro in M1; the runtime enters the start
  level immediately.
- **One level as start and end.** `03-nerve-forest` is temporarily both
  `startLevelId` and `endLevelId`, so the debrief and evidence export can be
  exercised end to end without levels 2–5.
- **One gate, no core gate.** The concept gate opens the exit; the exit leads to
  the debrief. A separate core gate is out of scope.
- **Forward references are warnings.** Exit `04-muscle-effector`, the next
  level, and map edges beyond this slice are authored now but reported as
  advisory warnings so the one-level pack still validates.
- **Pure runtime, adapter-heavy boot.** `game/runtime.ts` is testable headlessly;
  `game/boot.ts` is the only place that wires DOM, Phaser, fetch, audio, and
  localStorage.
- **Presentation contract in `ui`.** `src/ui/model.ts` prevents a
  `game → ui → game` cycle while keeping the runtime free of DOM types.
- **Structural world port.** `WorldRuntime` keeps `world` from importing
  `game`.
- **Validator imports `assets`.** Documented exception; see Architecture.
- **Anchored dialogue only.** Dialogue advances on explicit input; there is no
  conditional skipping in M1.
- **Input latching.** Keydown events are latched and drained by fixed steps.
  Phaser's `JustDown` alone dropped short taps and made keyboard tests flaky.
- **Dev fixture retained.** `public/content/dev` is no longer booted by the app
  but is still validated and simulated by scripts/tests, preserving the M0
  regression surface.
- **Vault untouched.** `docs/shrinkonauts` is a symlink into the project vault;
  this implementation does not write through it. Architecture deviations are
  recorded here and in `README.md`.
