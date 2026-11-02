# Level 01 — Interrupt Loop (Silicon fixture)

**Status:** `validated` in `level.json`; automated smoke green; human playtest pending
**Pack:** `silicon-reflex`
**Objective:** OBJ-5 — transfer the reflex loop to a new system
**Concepts:** CON-7 reflex arc, CON-8 sensor–controller–actuator loop
**Puzzle:** `puzzle-interrupt-loop`
**Win:** `gateOpen gate-actuator`
**Prerequisite:** [`ADR-0047`](../../../../../docs/adr-m1.5/0047-relay-timer-start-dispatch.md) — relay activation dispatches timer `start` links
**Design source:** [`docs/m2/nervous-puzzles/silicon-fixture.md`](../../../../../docs/m2/nervous-puzzles/silicon-fixture.md)
**Theme:** [`docs/prompts/silicon-theme.md`](../../../../../docs/prompts/silicon-theme.md)

> The pack is authored, validated, and `available` in the catalog. The
> 2026-11-02 Silicon asset pass integrated the sky and 12 entity sprites;
> far/mid/near, the exit, portrait, tileset, atlas PNG, scan-interrupt icon,
> and audio remain placeholders. The catalog entry is `available` with
> `online: false`; the hub/e2e, app-state, and pack-smoke paths are in place.

## Player-facing goal

The player is shrunk into a graphite/cyan circuit board. A sensor is ringing,
but the interrupt line is wired straight to the CPU, so nothing happens. The CPU
Core explains that it is the output side, not the spinal cord: the interrupt
controller is the integration point. The player steps on the sensor pad, carries
the route plug to the controller socket, waits for the controller to wake the
CPU, and watches the actuator respond.

The transfer gate asks: **“Where is the ‘spinal cord’ in this system?”** The
correct answer is **the interrupt controller**, not the CPU.

## Flow

```text
spawn (checkpoint-entry)
  → agent-cpu             dlg-cpu-01
      └─ correct choice reveals CON-7 and CON-8, records concept_revealed,
         and reveals map-interrupt-loop
  → sensor-console        interact activation (puzzle starts)
  → sensor-pad            player press latches sensor-trigger
  → route-plug            carry or push the plug to a socket
  → controller-socket     correct route
  → controller-relay      allOf(sensor-trigger, controller-socket)
  → cpu-timer             60-tick CPU wake delay
  → gate-actuator         latched open; puzzle_solved
  → exit-to-actuator      debrief for OBJ-5
  → transfer-console      optional gate-transfer prompt
```

## Puzzle graph

```text
sensor-pad (plate, player min 1)
  --press--> sensor-trigger (once)
sensor-trigger
  --activate--> controller-relay (allOf)
controller-socket (plate, prop min 1)
  --activate--> controller-relay (allOf)
controller-relay
  --start--> cpu-timer (60 ticks, no repeat)
cpu-timer
  --elapsed--> gate-actuator (closed, latched)
cpu-socket (plate, prop min 1)
  --no link--> controller-relay
```

The `cpu-socket` is a visible decoy. Dropping the plug there does not wake the
CPU. Removing the plug from the controller socket deactivates the relay, but the
latched gate cannot be undone once the timer has opened it.

The authored solution trace is P1-only:

```text
move 480,620; wait 2; move 512,620; pickup route-plug;
move 720,620; drop route-plug; wait 80
```

`replaySolution()` reaches `gateOpen gate-actuator` at tick 67 with the timer
`elapsed` and the gate `open`. The trace is checked by `pack:validate` and
`npm test`.

## Puzzle rules

1. The puzzle is inactive until a player interacts with `sensor-console`.
   Activation applies the `off` tether policy.
2. Stepping on `sensor-pad` presses `sensor-pad`, which fires
   `sensor-trigger` once. The trigger latches, so a solo player can step off
   and route the plug.
3. The player picks up or pushes `route-plug` onto either the controller socket
   or the CPU socket. A carried plug does not count; the player must release it.
4. On the controller socket, the relay receives both the latched sensor trigger
   and the socket input. The relay activates and starts `cpu-timer`.
5. When `cpu-timer` elapses, `gate-actuator` opens and latches. The exit and
   debrief become available; `puzzle_solved` is recorded.
6. On the CPU socket, the relay lacks the controller input. The CPU never wakes;
   the plug remains recoverable and the screen gives the authored “No controller
   signal” feedback. There is no fail state.
7. Reset returns the route plug to its spawn and resets the sensor trigger,
   controller relay, CPU timer, and actuator gate. Evidence counters survive.

## Room facts

| Property | Value |
| --- | --- |
| Room | `room-interrupt-loop`, 40 × 23 tiles at 32 px (1280 × 736) |
| Tileset | `tileset.silicon` (declared placeholder; no final file yet) |
| Materials | `circuit` and `substrate`, `edge` autotiling, 16-frame variant sets on `tile.circuit.atlas` |
| Background | `bg.silicon_board`; sky integrated 2026-11-02; far, mid, near are placeholder layers |
| Spawns | P1 `(3, 20)`, P2 `(5, 20)` |
| Checkpoint | `checkpoint-entry` at `(4, 20)` |
| Agent | `agent-cpu` at `(6, 20)`; dialogue `dlg-cpu-01` |
| Sensor console | `sensor-console` at `(11, 20)`; interact activation |
| Sensor pad | Visible `pad-sensor` at `(14, 20)`; plate rect x 448–512, y 600–648 |
| Route plug | `route-plug` / `body-route-plug` at `(16, 20)` |
| Controller socket | `controller-socket` at `(22, 20)`; plate rect x 704–768 |
| CPU socket | `cpu-socket` at `(27, 20)`; plate rect x 864–928; decoy |
| Actuator gate | `gate-actuator` at `(35, 20)`; `anchors.center` 18,18 |
| Exit | `exit-to-actuator` at `(37, 19)`, locked by `puzzle-interrupt-loop` |
| Transfer console | `transfer-console` at `(38, 19)`; `gate-transfer` |
| Tether | `off`; puzzle geometry spans about 688 × 48 px, inside 1280 × 720 |

The room floor is rows 20–22 with `c` circuit material. The ceiling and side
walls use `s` substrate material. The visible LED/trace path is art/pattern
language, not a separate collision tile.

## Evidence and debrief

- `puzzle_solved` filtered by `puzzle-interrupt-loop`, required for OBJ-5.
- `debrief_answered` filtered by `prompt-obj-5`, required for OBJ-5.
- `gate_solved` filtered by `gate-transfer`, optional evidence for OBJ-5.

The runtime derives the debrief prompt as `prompt-obj-5`. The syllabus EV-5
filter uses `prompt-transfer`; this level records the runtime value and does not
edit the syllabus without a curriculum decision.

The transfer gate is optional. The room does not enforce that it is answered
after the actuator gate, because puzzle gates have no collision bodies. The
dialogue and layout state the intended order; this is a recorded gap.

## Co-op and solo

- **Co-op:** P1 can trigger the sensor and watch the controller; P2 can carry
  and drop the route plug. Either player can interact with the console and scan.
- **Solo:** P1 uses the solo union. Step on the sensor (the trigger latches),
  pick up the plug, drop it on the controller socket, wait for the CPU timer,
  and enter the actuator exit.
- **No co-op-only route:** the same sequence works with one body.
- **Tether:** `off`; the room is one screen and the puzzle geometry fits the
  one-viewport guard.

## Controls

| Player | Move | Jump | Scan | Interact | Carry | Throw |
| --- | --- | --- | --- | --- | --- | --- |
| P1 | `A` / `D` | `W` or `Space` | `Q` | `E` | `G` | `H` |
| P2 | `←` / `→` | `↑` | `.` | `,` | `'` | `;` |

Shared: `P` player 2 at a checkpoint, `Tab` map, `C` concept log, `Esc`
pause/close, `M` mute.

## Asset register

### New Silicon IDs declared in `assets.final.json`

| ID | Type | Runtime file | Status |
| --- | --- | --- | --- |
| `bg.silicon_board.sky` | background | `shared/backgrounds/silicon-board-sky.webp` | integrated 2026-11-02 (POC; final approval pending) |
| `bg.silicon_board.far` | background | none yet | placeholder |
| `bg.silicon_board.mid` | background | none yet | placeholder |
| `bg.silicon_board.near` | background | none yet | placeholder |
| `tile.circuit.atlas` | atlas | `shared/tiles/circuit-atlas.svg` | placeholder (128×128, 16 regions; PNG assembly rejected, SVG retained) |
| `tileset.silicon` | image | none yet | placeholder |
| `sprite.agent.cpu` | sprite | `shared/sprites/agent-cpu.png` | integrated 2026-11-02 (POC) |
| `sprite.prop.route_plug` | sprite | `shared/sprites/prop-route-plug.png` | integrated 2026-11-02 (POC) |
| `sprite.socket.controller` | sprite | `shared/sprites/socket-controller.png` | integrated 2026-11-02 (POC) |
| `sprite.socket.cpu` | sprite | `shared/sprites/socket-cpu.png` | integrated 2026-11-02 (POC) |
| `sprite.gate.actuator` | sprite | `shared/sprites/gate-actuator.png` | integrated; cyan piston lost at 18×18, silhouette reads |
| `sprite.exit.silicon` | sprite | none yet | placeholder |
| `sprite.scan.sensor` | sprite | `shared/sprites/scan-sensor.png` | integrated 2026-11-02 (POC) |
| `sprite.scan.interrupt` | sprite | none yet | placeholder (fit 16×4 all-ink; does not read at 36×36) |
| `sprite.scan.controller` | sprite | `shared/sprites/scan-controller.png` | integrated 2026-11-02 (POC) |
| `sprite.scan.cpu` | sprite | `shared/sprites/scan-cpu.png` | integrated; palette-distance warning 76.8 recorded |
| `sprite.scan.actuator` | sprite | `shared/sprites/scan-actuator.png` | integrated 2026-11-02 (POC) |
| `sprite.pad.sensor` | sprite | `shared/sprites/pad-sensor.png` | integrated 2026-11-02 (POC) |
| `sprite.console.sensor` | sprite | `shared/sprites/console-sensor.png` | integrated 2026-11-02 (POC) |
| `sprite.console.transfer` | sprite | `shared/sprites/console-transfer.png` | integrated 2026-11-02 (POC) |
| `ui.portrait.cpu` | image | none yet | placeholder; referenced by `ui.assets` |
| `ui.icon.badge` | image | none yet | placeholder |
| `ui.icon.scan` | image | none yet | placeholder |
| `ui.icon.map` | image | none yet | placeholder |
| `ui.icon.log` | image | none yet | placeholder |
| `ui.panel.dialogue` | image | none yet | placeholder |
| `ui.panel.gate` | image | none yet | placeholder |
| `ui.panel.debrief` | image | none yet | placeholder |
| `ui.panel.map` | image | none yet | placeholder |
| `audio.cue.*` | audio | none yet | 12 placeholders |

The final atlas contract remains 128×128, 4×4 cells, 16 frames, regions
`mask-0`–`mask-15`. Both `circuit-edge` and `substrate-edge` reference the same
atlas. The 2026-11-02 swatch pass could not produce 16 faithful tileable frames;
the SVG placeholder remains. See
`art-source/nanobanan/reports/silicon/circuit-atlas.report.json`.

### Shared kit copied into this pack

- `sprite.player.p1` + walk/jump/fall/land
- `sprite.player.p2` + walk/jump/fall/land

The 10 PNGs are copied from `anatomy-reflex` and have matching
`licenses.json` entries with the POC Ludo.ai source label. The pack cannot
resolve another pack's files.

### Deliberately not generated

- `sprite.checkpoint` / `sprite.checkpoint.silicon` — the room uses the
  checkpoint data point.
- `sprite.prop.work_token` — optional beat; source processed for review only and
  not added because no puzzle node references it.
- `sprite.scan.reflex` — anatomy-pack reserve.
- `tile.nerve.atlas`, `tile.bone.atlas`, all `bg.nerve_forest.*`, and every
  nerve/neuron/synapse asset ID.
- Music, ambience, remaining final backgrounds (far/mid/near), exit, portrait,
  atlas PNG, scan-interrupt icon, and audio.

## Validation

Run:

```text
npm test
npm run pack:validate
npm run pack:smoke
npm run smoke:e2e
npm run build
git diff --check
```

Automated results (asset pass and catalog phase):

- `npm test`: **49 files, 469 tests passed**.
- `npm run pack:validate`: **PASS** for dev, anatomy, Silicon, catalog, and hub.
  The catalog now reports `silicon-reflex: available`; the previous
  “visible but not installed yet” warning is gone.
- `npm run pack:smoke`: dev placeholder/fixture, anatomy runtime, and Silicon
  runtime **PASS**. The Silicon path boots `01-interrupt-loop` /
  `room-interrupt-loop`, checks spawn/ground/camera/movement/jump/land cues,
  runs the CPU Core conversation and sensor scan, activates the puzzle at the
  sensor console, presses the sensor pad, carries the route plug to the
  controller socket, waits for the 60-tick timer, asserts
  `gateOpen gate-actuator`, exits to the debrief, and restores the save. The
  anatomy path is unchanged.
- `npm run smoke:e2e`: **8 tests passed**, including the Silicon deep-link start
  and HUD title **Interrupt Loop**.
- Silicon: **51 IDs, 28 placeholders**, coverage **1/5 objectives · 2/8 concepts**
  from `pack:validate`; the runtime preload resolves **43 IDs** referenced by
  the room, theme, and players.
- Silicon asset pass: **13 new runtime files** (sky + 12 sprites);
  `sprite.scan.interrupt` and the atlas PNG remain placeholders.
- `npm run pack:map -- --pack silicon-reflex` (asset pass): writes 5 objectives
  and 8 concepts; a second run produces the same SHA-256, so there is no drift.
- `npm run build`: TypeScript and Vite production build pass; the existing
  chunk-size warning remains.
- `git diff --check`: clean.
- `replaySolution()`: reaches `gateOpen gate-actuator` at tick 67.

Expected warnings, recorded rather than suppressed:

- `COVERAGE_OBJECTIVE_UNMAPPED` for OBJ-1, OBJ-2, OBJ-3, OBJ-4.
- `COVERAGE_CONCEPT_UNMAPPED` for CON-1, CON-2, CON-3, CON-4, CON-5, CON-6.
- Anatomy forward-reference warnings are unrelated and remain.

## Deviations and known gaps

- **Engine prerequisite:** the exact `controller-relay -> cpu-timer: start` edge
  did not dispatch before ADR-0047. The runtime now maps `relayActive` to
  `start`; this is an engine change outside the original Phase 1 scope fence,
  approved before implementation.
- **Palette token naming:** the theme prompt says `teal`; the theme schema
  exposes `tealDark`/`tealLight`. Materials use `tealLight` as the graphite
  ramp token and record the mismatch here.
- **Unlocks:** `level.unlocks` is `[]` per the level prompt, even though the
  general authoring contract recommends at least one unlock. This one-level
  fixture has no next level or ability reward.
- **Transfer order:** the transfer console is reachable before the actuator gate
  opens because puzzle gates have no collision. The intended order is authored
  in the dialogue and layout.
- **Debrief prompt id:** runtime uses `prompt-obj-5`; the syllabus EV-5 filter
  says `prompt-transfer`. The pack-smoke asserts the runtime
  `debrief_answered` event for `prompt-obj-5`, not the syllabus `requiredMet`
  flag; the curriculum mismatch is recorded, not edited.
- **Sky export:** the 2026-11-02 pass uses the supplied 2720×1568 plate,
  cropped to 2720×1564 at y=2 and Lanczos-downscaled to **1280×736 at 1×**.
  It is palette-quantised to the six Silicon ramps with a 2×2 Bayer dither and
  exported as a 99,538-byte lossless WebP. This differs from the prompt pack’s
  640×368/2× source target; the 1280×736 export is the task’s cover target.
  Report: `art-source/nanobanan/reports/silicon/silicon-board-sky.report.json`.
- **Atlas fallback:** the supplied 2048×2048 plate is a continuous PCB material
  swatch, not a 4×4 frame atlas. The direct 128×128 downscale loses the traces;
  the 16-crop and mask-edge assemblies are non-tileable and turn the floor into
  a bright cyan patchwork. The coherent SVG placeholder is retained. Report:
  `art-source/nanobanan/reports/silicon/circuit-atlas.report.json`.
- **Gate actuator:** the thin cyan piston does not survive the 18×18 fit. The
  gate still reads as a closed mechanical barrier by silhouette and bone latch.
- **Scan interrupt:** rejected. The 18×18 fit is 16×4 and quantises to 64 ink
  pixels; the cyan trace and rim vanish. The manifest entry stays a placeholder.
- **Scan CPU:** accepted with a recorded `max palette distance 76.8` warning. The
  final PNG is palette-only and reads as a ceramic package with a cyan die, not
  a brain.
- **Work token:** processed for review only; the room does not reference it, so
  it is not in `assets.final.json`.
- **Licences:** the integrated plates keep the POC label
  `Ludo.ai source (POC; plan TBD)`; no commercial licence is claimed.
- **Final art/audio:** far/mid/near, exit, portrait, atlas PNG,
  scan-interrupt icon, and audio remain deferred.
- **Human playtesting:** `playtestedSolo: false`, `playtestedCoop: false`.
- **Catalog/hub/e2e:** the Silicon entry was flipped to `available` with
  `online: false`; the hub/e2e, app-state, and pack-smoke Silicon paths were
  added in the follow-up catalog phase. No engine or runtime modules changed.

## Catalog, hub, and smoke phase — completed 2026-11-02

The follow-up phase is complete. The 2026-11-02 asset pass remains the source
of the art log; this phase changed catalog, tests, and documentation only.

### 1. Catalog — done

- `public/packs/index.json` now marks `silicon-reflex` as `available` with
  `online: false`.
- The description is present tense and describes the one-room sensor →
  interrupt controller → CPU → actuator fixture.
- `anatomy-reflex` is unchanged.

### 2. Hub and app-state — done

- `e2e/hub.spec.ts` expects the Silicon card to be `available`, selects it from
  `/?pack=silicon-reflex`, asserts the input and Start are enabled, starts the
  cycle, and checks the HUD title **Interrupt Loop**.
- `tests/app-state.test.ts` keeps `anatomy-reflex` as the order-10 default and
  asserts `silicon-reflex` is selectable with status `available`.
- The bathroom-hub final-art, online-placeholder, anatomy start, and
  return-to-hub tests remain intact.

### 3. Silicon pack smoke — done

- `scripts/pack-smoke.ts` adds a Silicon runtime path. It resolves the pack
  assets, boots `01-interrupt-loop` / `room-interrupt-loop`, checks
  spawn/ground/camera/movement/jump/land cues, runs the CPU Core conversation
  and sensor scan, activates the puzzle, presses the sensor pad, carries the
  route plug to the controller socket, waits for the 60-tick timer, asserts
  `gateOpen gate-actuator`, exits to the debrief, and restores the save.
- The anatomy path and output are unchanged.

### 4. Validation gate — done

All six commands pass; see “Validation” above.

### 5. Status and captures — done

- This README and prompt-log §19 record the catalog-phase results.
- No capture-list artifact in the repository required a new still. The Silicon
  start path asserts the HUD title **Interrupt Loop**; if a still is needed for
  the video/GDD, capture `screenshots/m3.5-interrupt-loop.png` from that path.

### Still deferred after the catalog flip

- Remaining art: far/mid/near backgrounds, exit, portrait, atlas PNG,
  scan-interrupt icon, and audio.
- Human solo and co-op playtests.
- 05 Reflex Core remains out of scope.
