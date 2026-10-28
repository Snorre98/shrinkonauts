# Puzzle Engine Upgrade — Implementation Plan

**Status:** plan only; no engine code is changed by this document
**Source decisions:** [ADR-0001–0008](adr/); the feedback layer is
[ADR-0009–0013](adr/) in [`feedback-implementation-plan.md`](feedback-implementation-plan.md)
**Contracts:** [module boundaries](contracts/module-boundaries.md),
[data model](contracts/data-model.md), [interface](contracts/interface.md),
[state machine](contracts/state-machine.md),
[failure semantics](contracts/failure-semantics.md),
[concurrency](contracts/concurrency-topology.md)
**Behaviors:** [behaviors/](behaviors/)
**Traceability:** [traceability.md](traceability.md)

The plan is deliberately phased so each phase leaves the pack valid and the
existing 03/04 flow playable. Do not merge phases 1–4 into one change.

> The feedback and effect layer from ADR-0009–0013 is accepted separately in
> [`feedback-implementation-plan.md`](feedback-implementation-plan.md). Phase 0
> is complete and the Phase 1 correctness fixes and stable-state reachability
> guard are in place; the feedback layer remains a prerequisite for
> feedback-dependent content migration, not an optional polish pass.
>
> The material and pattern layer from ADR-0014–0017 is planned separately in
> [`material-pattern-implementation-plan.md`](material-pattern-implementation-plan.md).
> It is the visual-language foundation and must precede final tile/UI art.

---

## Phase 0 — Accept and freeze the design

**Goal:** make this documentation set the authority for the upgrade before
touching code.

Tasks:

1. Review and accept ADR-0001–0008.
2. Confirm the data-model/interface/state-machine contracts.
3. Record the chosen map-travel model (side excursions with `returnTo`) and the
   non-goals (no full backtracking, no per-level cache, no scripting).
4. Record the migration sequence for 03/04 and future 01/02/05/Silicon.
5. Keep ADR-0046 as the authoritative main-path transition decision.

Exit criteria:

- ADRs accepted and indexed in the architecture.
- No unresolved decision remains in this plan.
- The existing 03 → 04 flow is explicitly the regression baseline.

---

## Phase 1 — Schema, types, parsers, and validators

**Goal:** the content format can express the new capabilities while old content
continues to validate and run.

### 1.1 `puzzle` types

Files:

- `src/puzzle/types.ts`
- `src/puzzle/validate.ts`

Tasks:

- Add `locked` and `cleared` to `PropRunState`.
- Add `initial?: "free" | "locked"` to `PropNode`.
- Add `requires?: string` and `message?: string` to `PuzzleLink`.
- Add `unlock` and `clear` to `PuzzleLinkType` with source/target tables.
- Add `propReleased`, `propCleared`, `linkBlocked` to `PuzzleEventType`.
- Add the new event payload fields (`to`, `requires`, `message`).
- Add validator errors for unknown `requires`, `requires` on state links or
  non-condition nodes, empty `message`, invalid prop initial, and unlock/clear
  target types.
- Update `PUZZLE_SCHEMA_VERSION` to `1.1` while accepting `1.x`.

Tests:

- `tests/puzzle.test.ts` or a new `tests/puzzle-schema-v11.test.ts`:
  - valid `initial`, `requires`, `message`, `unlock`, `clear`;
  - invalid requires node, state-link requires, empty message;
  - unlock/clear target must be a prop;
  - old 1.0 fixtures still validate.

### 1.2 `pack` parsers

Files:

- `src/pack/parse-puzzle.ts`
- `src/pack/parse-content.ts`
- `src/pack/types.ts`
- `src/pack/validate.ts`

Tasks:

- Parse the new puzzle fields.
- Parse `level.kind` and `level.debrief.prompts`.
- Parse `puzzleGate` `components.body`, `openSprite`, `closedSprite`.
- Validate prompt IDs/objectives/evidence matches.
- Validate side levels: no `nextLevelIds`, not end level, map edge from a main
  level.
- Validate gate body dimensions and `puzzleGate`/gate-node references.
- Keep unknown-field behavior consistent with the existing parser.

Tests:

- `tests/validate.test.ts`: new level/prompt/side/gate cases.
- `tests/room-boot.test.ts` or a new parser test: gate body entity parsing.
- Compatibility fixtures: a 1.0 level, 1.0 puzzle, 1.1 level, 1.1 puzzle.

### 1.3 `save` types

Files:

- `src/save/index.ts`

Tasks:

- Add `locked`/`cleared` to `PropSnapshot`/`PropRunState` validation.
- Add optional `returnTo: LevelRunSnapshot` to `RunSnapshot`.
- Validate `returnTo` structurally; missing means no side excursion.
- Set `RUN_SCHEMA_VERSION = "2.1"`; accept `2.x`.
- Keep ADR-0045 version-mismatch recovery unchanged.

Tests:

- `tests/save.test.ts`: 2.0 round-trip, 2.1 round-trip, invalid `returnTo`,
  locked/cleared prop states, old save defaults.

### 1.4 `level`/mapping/syllabus

Files:

- `src/pack/parse-content.ts`
- `scripts/pack-map.ts` / `src/pack/mapping.ts`
- `public/syllabi/anatomy-reflex.json` (when content migration begins)

Tasks:

- Keep the mapping generated from levels; prompt text is level-local.
- Add EV-9 when the 04 content migrates (phase 5).
- Do not change EV-2/EV-7 semantics until phase 5.

**Phase 1 exit criteria:** `npm test` and `pack:validate` pass with old content;
new schema fixtures validate; no runtime behavior change yet.

---

## Phase 2 — Pure puzzle runtime

**Goal:** the graph evaluates the new states, actions, and conditions
deterministically.

Files:

- `src/puzzle/runtime.ts`
- `src/puzzle/solution.ts`
- `src/puzzle/types.ts`

Tasks:

1. **Prop lifecycle**
   - Initialize prop nodes from `initial` (default `free`).
   - Apply `unlock`/`clear` link actions; emit `propReleased`/`propCleared`.
   - Keep `updatePropNode` in sync with world prop states.
   - Ensure `resetToInitial` restores prop node initial state.
2. **Conditional links**
   - Evaluate `requires` for event links; emit `linkBlocked` without applying
     the target.
   - For pulse links, skip receptor resolution when blocked; keep the pulse
     cooldown.
   - Do not evaluate `requires` on state links; the validator rejects them.
3. **Replay**
   - Mock props start at their authored initial state.
   - Apply prop lifecycle events to mock props during ticks.
   - Keep the existing solution trace contract.
4. **Events/order**
   - Keep the existing timer/sensor/pulse/relay/gate order.
   - Ensure a blocked link does not duplicate events for one occurrence.
5. **Gate/prop queries**
   - Add `propState` and `isGateOpen` convenience queries if the runtime or
     tests need them; otherwise use `nodeState`.

Tests:

- New `tests/puzzle-lifecycle.test.ts` or extend `tests/endplate-ferry.test.ts`:
  - locked prop initial; unlock; clear; reset; idempotent clear.
  - blocked pulse before Ca gate; active pulse after; cooldown.
  - blocked increment/start; linkBlocked payload.
  - old relay/plate/timer behavior unchanged.
  - replay with a locked prop + unlock event.
- `tests/node-run.test.ts` remains green.

**Phase 2 exit criteria:** pure runtime tests pass; no world/Phaser change; old
content behavior unchanged.

---

## Phase 3 — World bodies and presentation

**Goal:** gates and props are physical/visible projections of puzzle state.

### 3.1 Gate bodies

Files:

- `src/world/physics.ts`
- `src/world/simulation.ts`
- `src/pack/types.ts` (gate component fields)
- `src/world/room-scene.ts`

Tasks:

- Build static gate bodies for `puzzleGate` entities with `components.body`.
- Add `setGateOpen`, `gateStates`, and `RoomSimulation.gateStates`.
- Add gate sprite open/closed state resolution with fallback alpha/tint.
- Sync gate state from `GameRuntime` after entry/restore/reset/tick (phase 4
  wires the orchestrator; phase 3 provides the operations).
- Keep gates without body components visual-only.

Tests:

- `tests/physics.test.ts`: closed body blocks player/prop; open passes; latch;
  no-body gate; reset/restore body presence.
- `tests/room-boot.test.ts`: gate body entity parsing and placement.
- Headless gate scenario if a room fixture is needed.

### 3.2 Prop lifecycle world

Files:

- `src/world/physics.ts`
- `src/world/simulation.ts`
- `src/world/room-scene.ts`

Tasks:

- Add `setPropState`, `releaseProp`, `clearProp`, `resetProp(initial)`.
- Block pickup for locked/cleared; hide cleared sprites; static locked bodies.
- Preserve old free/carried/placed/docked behavior.
- Update scene prop visibility per frame.

Tests:

- `tests/physics.test.ts`: locked not pickable; unlock dynamic; clear hidden;
  reset initial; docked behavior unchanged; out-of-bounds only free/carried.

**Phase 3 exit criteria:** world tests pass; existing rooms with no gate bodies
and no new prop states behave exactly as before.

---

## Phase 4 — Game orchestration

**Goal:** the runtime synchronizes, gives feedback, selects prompts, and travels
to side levels.

### 4.1 Synchronization and feedback

> Feedback transport for blocked links is superseded by ADR-0009–0013. The
> immediate toast remains the M1.5 adapter until the feedback plan's Phase 4;
> see [`feedback-implementation-plan.md`](feedback-implementation-plan.md) §7.1.

Files:

- `src/game/runtime.ts`

Tasks:

- Add `syncWorldFromPuzzles()` after entry, restore, reset, puzzle events, and
  side return:
  - gates → `setGateOpen` from `nodeState(gate).state === "open"`;
  - props → `setPropState`/unlock/clear from node state.
- Handle `propReleased`/`propCleared` by applying world operations.
- Handle `linkBlocked` by showing `message` through the toast; no evidence.
- Ensure initial locked props are applied even before puzzle activation.
- Ensure reset restores prop initial state and gate bodies.

### 4.2 Per-level debrief prompts

Files:

- `src/game/runtime.ts`
- `src/curriculum/index.ts`

Tasks:

- `debriefPromptList()` uses `level.debrief.prompts` or the fallback.
- `debriefPrompts` accepts optional overrides.
- `submitDebrief`/`finishDebrief` use the same list.
- Keep `debriefAnswers` reset on level entry (ADR-0046).

### 4.3 Side-level travel

Files:

- `src/game/runtime.ts`
- `src/save/index.ts`
- `src/ui/model.ts`
- `src/ui/game-ui.ts`
- `src/game/boot.ts` (callback wiring)

Tasks:

- Add `travelToSideLevel(levelId)` and `returnTo` capture/restore.
- Add `MapTravelView` to snapshots and `onMapTravel` UI callback.
- Render keyboard-focusable travel controls in the map overlay.
- On side debrief finish, restore the main snapshot and clear `returnTo`.
- Clear `returnTo` on new run/pack completion.
- Save/restore both current side and `returnTo`.
- Keep ADR-0046 main transitions unchanged.

Tests:

- `tests/runtime.test.ts`: gate/prop sync; blocked feedback; prompt override;
  side travel/return; save during side; invalid travel; main path unchanged.
- `tests/endplate-ferry.test.ts`: integrate the new Ca gate/physical pulse
  ordering when content migrates (phase 5).
- `tests/save.test.ts`: returnTo round-trip.

**Phase 4 exit criteria:** headless runtime tests pass; 03/04 still complete;
side travel works with a fixture; no UI regression.

---

## Phase 5 — Content migration

**Goal:** the intended design uses the new capabilities, with explicit opt-ins.

### 5.1 04 Endplate Ferry

Files:

- `public/packs/anatomy-reflex/levels/04-muscle-effector/room.json`
- `.../puzzle.json`
- `.../level.json`
- `public/syllabi/anatomy-reflex.json`
- `.../README.md`

Tasks:

- Add `components.body` to `ca-gate` and `muscle-gate`; add optional gate
  sprite IDs/fallback.
- Add `requires: "ca-gate"` + message to both pulse links.
- Add `clear` link from `ache-timer` to `ach-packet`.
- Add `debrief.prompts` with `prompt-obj-2-nmj`; update level evidence to that
  prompt; add EV-9 to OBJ-2; keep EV-7 for 03.
- Update the README deviations (physical gate, ACh clear, NMJ prompt).
- Keep `puzzle-endplate-ferry` and the win predicate.

### 5.2 03 Node Run

Files:

- `.../03-nerve-forest/room.json`
- `.../03-nerve-forest/README.md`

Tasks:

- Opt the threshold/behind/exit gates into bodies where the layout supports it;
  test the one-way/behind closure and the exit gate.
- Keep the existing threshold/terminal logic; add bodies only if the geometry
  and tests remain safe.
- Optionally add a 03 debrief override later; this plan keeps EV-7/prompt-obj-2.

### 5.3 Future 05/Silicon/01/02

- 05: ventral/brain/kick gate bodies; motor token unlock/clear; `stretch`
  tether if needed; OBJ-3 prompt.
- Silicon: actuator gate body; controller/CPU relay; work token optional.
- 01/02: side-level `kind`, map edges, prop unlock/clear, optional evidence.
- Add only when those levels are authored; do not pre-implement content.

### 5.4 Mapping and versions

- Regenerate `mapping.json`.
- Bump pack content version after migration.
- Update READMEs and traceability notes for the new capabilities.
- Keep the public syllabus as the runtime source; do not write the vault.

**Phase 5 exit criteria:** 04 uses physical Ca/muscle gates, blocked-pulse
feedback, ACh clear, NMJ prompt/EV-9; 03 remains playable; pack validation
passes with expected forward warnings.

---

## Phase 6 — Verification, playtest, close-out

Run:

```text
npm test
npm run pack:validate
npm run pack:smoke -- --level 04-muscle-effector
npm run pack:map
npm run build
git diff --check
npm run smoke:e2e
```

Add tests:

- Gate body visual + collision e2e (closed blocks, open passes).
- 04 early pulse toast and no bind; after Ca gate, pulse binds.
- ACh packet hidden after AChE clear.
- 04 debrief shows the NMJ prompt; EV-9; 03 EV-7.
- Side excursion e2e with a fixture: enter, solve/return, main state exact.
- Old 1.0/2.0 compatibility fixtures.

Playtest:

- Human solo and co-op for 03 → 04 with physical gates and blocked feedback.
- Verify the player can explain Ca²⁺/ACh and does not read the blocked pulse as
  a failure.
- Verify one-screen gate/camera geometry and no softlock on gate closure.
- Record honest `playtestedSolo`/`playtestedCoop` flags.

Close-out:

- Update traceability and READMEs.
- Record any deviation (for example, no full backtracking).
- No commit unless requested.

---

## Dependency order

| Step | Depends on |
|---|---|
| 1.1 puzzle types | Phase 0 |
| 1.2 pack parsers | 1.1 |
| 1.3 save types | 1.1 |
| 2 pure runtime | 1.1 |
| 3 world gates/props | 1.1, 2 |
| 4.1 sync/feedback | 2, 3 |
| 4.2 prompts | 1.2, 1.3 |
| 4.3 side travel | 1.3, 4.2 |
| 5 content migration | 4.1–4.3 |
| 6 verification | 5 |

## Compatibility matrix

| Input | Phase 1 | Phase 5 |
|---|---|---|
| 1.0 puzzle without new fields | valid, old behavior | unchanged |
| 1.1 puzzle with new fields | valid | migrated content uses it |
| 1.0 level without kind/debrief | valid, main + fallback prompt | 03 unchanged |
| 1.1 level with side/debrief | valid | 04/side content uses it |
| 2.0 save | loads, no returnTo | old runs still load |
| 2.1 save | round-trips new state | side excursions use it |

## Out of scope

- Full per-level state cache or free backtracking into completed main levels.
- Side-level chaining.
- New movement verbs or abilities.
- General scripting, event language, or arbitrary expressions.
- Multi-puzzle rooms or multiple simultaneous tether policies.
- A spatial lesion overlay; the 05 lesion remains a concept gate.
- Final art/audio; placeholder gate/prop visuals suffice.
- M3 capture and M4/M5 deliverables.
- Vault writes; `docs/shrinkonauts` remains read-only.

## Acceptance summary

The upgrade is done when:

- ADR-0001–0008 are accepted and traceable.
- Old 1.0/2.0 content and saves load with old behavior.
- Physical gates block/open and stay synchronized after reset/restore.
- Locked/cleared props unlock/clear and survive save/restore.
- Conditional links enforce the 04 Ca²⁺ ordering and show authored feedback.
- 04 uses its NMJ debrief prompt and EV-9; 03 keeps EV-7.
- A side excursion returns to the exact main snapshot.
- `npm test`, `pack:validate`, `pack:smoke`, `pack:map`, `build`, `git diff
  --check`, and `smoke:e2e` pass.
- Human playtest status is recorded honestly.
