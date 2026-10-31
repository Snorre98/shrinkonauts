# Level 03 — Nerve Forest (M2 Node Run)

**Status:** M2 implementation (`validated` in `level.json`; human playtest pending)
**Pack:** `anatomy-reflex`
**Objective:** OBJ-2 — trace the signal from the sensory receptor through the pathway
**Concepts:** CON-3 neuron structure, CON-5 sensory/motor pathways
**Card facts:** NERV-01#1, #5, #6 (core); #3 in the optional myelin scan/debrief
**Puzzle:** `puzzle-node-run`
**Win:** `gateOpen gate-exit`

> **Cross-level update (2026-10-27):** `04-muscle-effector` is now authored as
> Endplate Ferry under [`ADR-0046`](../../../../../docs/adr-m1.5/0046-level-transitions.md).
> OBJ-2 now also requires **EV-8** (`puzzle_solved` for
> `puzzle-endplate-ferry`), so 03 alone no longer meets the objective and the
> 03 debrief shows it as partial until 04 is solved. The 03-only evidence text
> below is the historical chunk record; the 03 → 04 transition and the
> remaining 04→05 warnings are current.

## Player-facing goal

The signal is stuck below threshold, so the exit to the terminal is closed. Talk
to the Neuron Keeper, press both dendrite inputs to reach threshold, then run the
axon to the terminal. The threshold gate latches; the terminal relay opens the
exit to the Muscle Effector.

This level replaces the M1.5 Signal Ferry at 03. The ferry pattern moved to
`04-muscle-effector` in the approved M2 design and is authored there; the 03
exit still gates the 03 → 04 transition.

## Flow

```text
spawn (checkpoint-entry)
  → agent-neuron          dlg-neuron-01 (threshold, all-or-none, one-way, myelin)
      └─ correct choice reveals CON-3, CON-5 and map-nerve-forest
  → pad-input-a/b         one input is below threshold; two reach it
  → gate-threshold        opens and latches when the counter reaches 2
  → axon-entry            the behind gate closes as a one-way cue
  → pad-terminal          terminal zone reached
  → gate-exit             threshold + terminal relay opens the gate
  → exit-to-muscle        debrief for OBJ-2 → evidence export
```

## Puzzle rules

1. The puzzle activates at room start. `gate-exit` is closed.
2. Each dendrite pad can fire once. Its one-shot trigger increments
   `stimulus-counter`.
3. One pad is below threshold. The threshold gate stays closed.
4. Both pads reach threshold. The threshold gate opens and latches. Extra
   touches do not create a larger response.
5. Entering `axon-entry` closes the non-latched `behind-gate` as a one-way cue.
6. Entering `terminal-zone` is necessary but not sufficient: the `spike-relay`
   also needs the threshold counter.
7. When both inputs are active, the relay opens `gate-exit` and the puzzle
   solves.
8. Reset clears the counter, triggers, and gates. The player remains at their
   current position; this is the existing M1.5 reset behavior.

The relay is an implementation safeguard. The current engine's puzzle gates are
logic/visual state, not collision bodies, so the relay makes the threshold
requirement real rather than relying on a physical threshold door.

## Feedback and effects

`level.json` owns the player-facing labels and the five-step beat tracker:
press a dendrite input, reach threshold, run the axon, reach the terminal, open
the exit. Persistent surfaces show plate, counter, gate, zone and relay state
without relying on a toast.

The feedback layer also drives the cosmetic effect coverage:

- plate press and release rings;
- a counter burst at threshold;
- gate bursts anchored to the gate centres;
- the `fx.tile.path` tint along the axon tiles when the relay activates;
- the shared solved exit ping.

The gates remain logic/visual state only. They have no collision body, so the
relay and exit gate are the authoritative puzzle conditions and the gate
bursts are presentation, not physical doors.

## Room facts

| Property | Value |
| --- | --- |
| Room | `room-nerve-forest`, 40 × 23 tiles at 32 px |
| Background | `bg.nerve_forest`, four parallax layers |
| Spawns | P1 `(3, 20)`, P2 `(5, 20)` |
| Checkpoint | `checkpoint-entry` at `(4, 20)` |
| Inputs | `input-a` at x 224–288, `input-b` at x 320–384, floor row 20 |
| Axon entry | zone at x 544–672, y 552–656; the bridge is the axon |
| Terminal | zone at x 1088–1184, floor row 20; `pad-terminal` at `(34, 20)` |
| Gates | `gate-threshold` at `(14, 20)`, `gate-behind` at `(18, 18)`, `gate-exit` at `(36, 20)` |
| Exit | `exit-to-muscle` at `(37, 19)`, locked by `puzzle-node-run` |
| Tether | `off`; puzzle geometry fits inside the 1280 × 720 viewport |

Visible pads (`pad-input-a`, `pad-input-b`, `pad-terminal`) are `scanTarget`
entities aligned with the plate/zone rects. The engine does not render puzzle
sensor rects, so these pads are the player-facing surface. They are also scans
for CON-3/CON-5.

## Evidence and debrief

- `puzzle_solved` filtered by `puzzle-node-run`, required for OBJ-2.
- `debrief_answered` filtered by `prompt-obj-2`, required for OBJ-2.
- Solve counters: `resets`. Hint use is a separate `hint_used` learning event.
- Optional scans: `scan-neuron` and `scan-myelin` (CON-3), `scan-pathway` and
  `pad-terminal` (CON-5).

Suggested debrief for the playtest: "Why does one input fail, and why does a
third input not make a bigger spike?" Model answer: "The first input is below
threshold, so no action potential fires. Once threshold is reached, the action
potential is all-or-none; more input increases the frequency of spikes, not the
amplitude of one spike."

The runtime UI uses the syllabus-derived `prompt-obj-2` prompt. A per-puzzle
`prompt-obj-2-threshold` would need a curriculum/debrief engine change and is not
authored in this chunk.

## Co-op and solo

- **Co-op:** P1 and P2 can each stand on one dendrite input; the two plate events
  raise the counter. Either player can scan and run the axon.
- **Solo:** P1 presses input A, steps to input B, then runs the axon. The plates
  latch their events, so a second body is never required.
- **Tether:** `off`; the room's puzzle geometry fits one screen. The room is
  1280 × 736 px, but the `off` guard measures the puzzle geometry, not the room.

## Controls

| Player | Move | Jump | Scan | Interact | Dash |
| --- | --- | --- | --- | --- | --- |
| P1 | `A` / `D` | `W` or `Space` | `Q` | `E` | `Shift` |
| P2 | `←` / `→` | `↑` | `.` | `,` | `/` |
| Solo | `A` / `D` | `W` or `Space` | `Q` | `E` | `Shift` |

Shared: `P` player 2 at a checkpoint, `Tab` map, `C` concept log, `Esc`
pause/close, `M` mute.

## Authoring notes and deviations

- `puzzle-node-run` remains a 1.0 puzzle document. The engine feedback layer is
  content-driven by the `feedback` block in `level.json`; no per-level runtime
  branch was added.
- The threshold/behind gates are logic and visual cues. The engine does not give
  puzzle gates collision bodies. Gate state now projects to persistent surfaces
  and cosmetic gate bursts; the `spike-relay` still enforces the threshold +
  terminal combination.
- Persistent counter, plate, zone, gate and relay surfaces carry the current
  state. Authored hints and dialogue still explain why one input is below
  threshold; there is no separate "below threshold" toast.
- The current plate event model emits both press and release transitions. Each
  dendrite pad therefore feeds a one-shot trigger before the counter. The
  two-plate path is required; pressing the same pad twice does not increment the
  counter a second time. Supporting a same-pad-twice route would need a
  press-only event or an engine change/ADR.
- The old `gate-nerve-01` is still not loaded. The old ferry puzzle remains only
  as a test fixture (`tests/fixtures/puzzles/signal-ferry.json`) until 04.
- Validation warns about `04-muscle-effector`, the two future map edges, and the
  unauthored objectives/concepts. These are expected for the one-level chunk.
- Human solo/co-op playtesting has not been performed. `level.json` records
  `playtestedSolo: false` and `playtestedCoop: false`.

## M1.8 material proof

The room is fully materialized for M1.8: bone walls/floor use `blob47`
placeholder variants, the central platform uses `edge` autotiling backed by the
`nerve-edge` atlas variant set, and the tile material grid never changes
collision. The sky uses a screen-space nerve pattern and the mid background
layer uses a world-space bone pattern. See `materials.json` and `theme.json` for
the shared world/UI definitions. Human visual review is pending.

## Remaining implementation gaps (M2 chunk boundary)

- Full M2 is not implemented. `05-reflex-core`, the Silicon fixture,
  `01-bone-gate`, and `02-joint-chamber` are still unauthored. `04-muscle-effector`
  is authored; the 04 exit and map-edge references to `05-reflex-core` are the
  expected forward-reference warnings.
- The ferry runtime integration tests now cover the authored 04 flow, including
  the ACh clearance beat. `tests/puzzle.test.ts` and `tests/physics.test.ts`
  continue to cover the generic prop lifecycle.
- Documentation outside this chunk is stale: the top-level `README.md` and
  `IMPLEMENTATION.md` still describe the older M1 concept-gate slice, and the
  untracked `docs/m3/asset-requirements.md` still assumes the ferry assets.
  Those files were not edited. The `docs/shrinkonauts` vault was not written
  through; its syllabus and EV-5/EV-6 numbering conflict remain for the vault
  owner. The public `public/syllabi/anatomy-reflex.json` is the runtime source
  and was updated for Node Run EV-2/EV-7 and the OBJ-2 success criterion.
- `npm run pack:smoke -- --level ...` accepts the flag but the script still runs
  the whole anatomy pack. The command was run as specified.
- The room spec uses `gate-exit`; the mechanics summary calls the same node
  `exit-gate`. The implementation follows the room spec's `gate-exit` name.

## Verification

```text
npm test
npm run pack:validate
npm run pack:smoke -- --level 03-nerve-forest
npm run pack:map
npm run build
git diff --check
```

`pack:validate` is expected to report 1/5 objectives and 2/8 concepts (CON-3 and
CON-5), plus the 04/map forward references. Those are not failures.
