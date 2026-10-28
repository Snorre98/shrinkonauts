# Feedback and Effect Layer — Implementation Plan (M1.75)

**Status:** accepted plan; Phase 0 complete, Phase 1 complete, Phase 2 complete, Phases 3–8 planned
**Milestone:** [M1.75](../m1.75/README.md)
**Source decisions:** [ADR-0009–0013](adr/README.md)
**Contracts:** [module boundaries](contracts/module-boundaries.md),
[data model](contracts/data-model.md), [interface](contracts/interface.md),
[failure semantics](contracts/failure-semantics.md)
**Depends on:** the M1.5 puzzle runtime, save v2, the 03/04 content, and the
existing UI/world seams.

The plan is deliberately ordered so every phase leaves the existing 03 → 04 flow
playable. Correctness comes before feedback; feedback comes before content
migration; effects come after the surface model is stable.

| Phase | Status |
|---|---|
| 0 — accept and freeze | Complete (2026-10-28) |
| 1 — correctness gate | Complete (`464ca63` + stable-state reachability) |
| 2 — generic ECS kernel | Complete (`src/ecs/` + `tests/ecs.test.ts`) |
| 3–8 | Planned |

---

## 1. Ground rules

1. **Correctness before presentation.** The Endplate Ferry dispatch and timer
   defects must be fixed before feedback describes them.
2. **Puzzle owns logical state.** Feedback projects state; it never becomes a
   second puzzle engine.
3. **Persistent vs transient is mandatory.** Persistent answers “what is true
   now?” and is rebuilt from state. Transient answers “what just happened?” and
   is sequenced and deduplicated.
4. **Effects are cosmetic.** Effects never mutate puzzle/world state, never
   delay input, and never change collision.
5. **No per-type UI.** A new puzzle type adds a descriptor, not a HUD/scene/audio
   branch.
6. **Co-op ownership is explicit.** Every player-caused surface/effect carries
   `actor`, `owner`, and `audience`/`accent`.
7. **The kernel is generic.** The ECS kernel must be usable by future game
   entities, even though only feedback uses it now.
8. **Old content and saves keep working.** Optional fields default to current
   behaviour.

---

## 2. What exists and what changes

| Area | Current | Target |
|---|---|---|
| Puzzle event handling | Three event types handled in `GameRuntime` | Every event type mapped to a feedback recipe or explicit silence |
| Feedback transport | One `toast` string, 3 s TTL | Persistent surfaces + sequenced transient cues |
| Puzzle view | Title/solved/counters/hint/pulse | Capability-based elements: timers, gates, sockets, carriers, beats |
| UI | Global DOM overlays | World-space surfaces + HUD + modals, anchored and attributed |
| Dialogue | One global state and overlay | Entity conversations as owned feedback surfaces |
| Scene | Static entity sprites | State projection + effect layer + tile visual state |
| Effects | Fixed/none | Composable plans: sockets, directions, paths, tile targets |
| Input | One global confirm; overlay traps focus | Per-player UI actions; soft surfaces consume only their owner |
| Save | Dialogue node state | Optional conversation list; feedback is ephemeral |

---

## 3. Phase 0 — Accept and freeze the design

**Status:** complete (2026-10-28).

**Goal:** make ADR-0009–0013 and this plan the authority before further code
changes.

Tasks:

1. Review and accept ADR-0009–0013. **Done.**
2. Confirm the feedback/surface/effect contracts in ADR-0009–0013. **Done.**
3. Record the non-goals: no full-game ECS migration, no new puzzle types, no
   final art/audio, no conditional links or side travel. **Done.**
4. Freeze the Endplate Ferry softlock as a regression fixture and record the
   intended sequence. **Done**; see the record below.
5. Confirm the 03 → 04 flow is the regression baseline. **Done.**

Exit criteria:

- ADRs accepted and indexed. **Met.**
- The softlock baseline is frozen. The reported pre-fix sequence is documented
  and the historical dead state is seeded in
  `tests/endplate-ferry.test.ts`; the current engine recovers from it. Natural
  reproduction of the pre-fix behaviour requires reverting `464ca63`.
- No unresolved decision remains in this plan. **Met.**

### 3.1 Phase 0 record

- **ADR acceptance:** ADR-0009–0013 are Accepted and indexed in the ADR log,
  architecture table, and the feedback traceability table.
- **AChE semantics:** the `ache-timer → ca-gate` `close` link is retained.
  `evaluateGates` evaluates `open` before `close`, so an elapsed Ca²⁺ timer
  always wins and AChE cannot hold the gate shut. After AChE resets the Ca²⁺
  timer, the gate closes as the clearance beat; the next plate press reopens it.
- **Softlock baseline:** commit `464ca63` fixes event dispatch, timer re-arming,
  and the level-triggered Ca²⁺ gate. The reported sequence was replayed
  headlessly and now solves; the historical dead state remains the seeded
  regression state.
- **Recoverability:** `tests/recoverability.test.ts` exhaustively explores
  reachable stable decision states, then checks reverse reachability from solved
  transitions. It reports no dead states for 03, 04, and the two puzzle fixtures;
  03 has 26 reachable states and 04 has 15.
- **Baseline commands:** `npm test`, `npm run pack:validate`,
  `npm run pack:smoke`, `npm run smoke:e2e`, `npm run build`, and
  `git diff --check` pass on the 03 → 04 flow.

---

## 4. Phase 1 — Correctness gate

**Status:** complete. The correctness fixes landed in `464ca63`; the exhaustive
stable-state reachability guard is in `tests/recoverability.test.ts`.

**Goal:** make the facts that feedback will describe true.

### 4.1 Event → link dispatch

Files:

- `src/puzzle/runtime.ts`
- `tests/endplate-ferry.test.ts`
- new `tests/puzzle-dispatch.test.ts`

Tasks:

- Replace `EVENT_EXCLUDED` with an explicit
  `Record<PuzzleEventType, readonly PuzzleLinkType[]>` dispatch table.
- Derive the table from the event type union so a new event type forces a
  decision.
- Apply links only when the event type is allowed for the link type.
- Keep `pulse`, `activate`, `deactivate`, `open`, and `close` out of the
  event-driven table.
- Add table-driven tests for every event/link pair.

Expected semantics:

| Event | Allowed links |
|---|---|
| `platePress` | `press`, `start` |
| `plateRelease` | `release`, `stop` |
| `zoneEnter` | `enter`, `start` |
| `zoneExit` | `exit`, `stop` |
| `timerElapsed` | `elapsed`, `reset` |
| `counterReached` | `reached` |
| `triggerFired` | `increment`, `start` |
| `receptorBound` | `bind` |
| `receptorRejected` | none by default |
| `relayActive` / `relayInactive` | none |
| `gateOpen` / `gateClose` | none |

### 4.2 Restartable one-shot timers

Files:

- `src/puzzle/runtime.ts`
- `tests/endplate-ferry.test.ts`

Tasks:

- `applyTimerAction` blocks only `running`, not `elapsed` or `stopped`.
- A plate press can always re-arm the Ca²⁺ window.
- Add a regression: `bind → AChE elapsed → plate press` solves. The seated
  sequence is covered by “reopens the Ca²⁺ gate after AChE has cleared an
  earlier response”.

### 4.3 Level-triggered Ca²⁺ gate

Files:

- `public/packs/anatomy-reflex/levels/04-muscle-effector/puzzle.json`
- `src/puzzle/runtime.ts`
- `tests/endplate-ferry.test.ts`

Tasks:

- Change the Ca²⁺ gate open source from the edge `elapsed` link to the
  level-triggered `open` link:
  `ca-timer → ca-gate` type `open`.
- Keep AChE’s `reset` link to `ca-timer`.
- Keep the `ache-timer → ca-gate` `close` link for the clearance beat. The
  recovery invariant is evaluation order: `evaluateGates` checks `open` before
  `close`, so an elapsed Ca²⁺ timer always opens the gate even while AChE is
  active. AChE only closes the gate once the Ca²⁺ timer has been reset.
- Confirm `evaluateGates` still evaluates `open` before `close`; add a comment
  naming that order as the recovery invariant.

### 4.4 Recoverability test

Files:

- `tests/recoverability.test.ts`
- `tests/helpers/recoverability.ts`

Tasks:

- Enumerate reachable **stable decision states** with
  `PuzzleRuntime.snapshot()` / `restore()` over a small action alphabet:
  - plate/zone occupied on/off;
  - prop free/placed;
  - pulse attempt.
- From each state, apply one action, tick once, then settle until no timer is
  running, no pulse is in flight, and no pulse source is on cooldown. Solved
  transitions are terminal.
- Deduplicate by node state, counter counts, in-flight pulses, and world
  sensor/placement. Exclude the absolute tick and evidence counters.
- Build the state graph and run reverse reachability from solved transitions.
  Any reachable unsolved state that cannot reach solved is a dead state.
- Cap the state and settle budgets. Hitting a cap is **inconclusive** and fails
  the test; it is never treated as a pass.
- Add a synthetic negative control (a non-latched gate with an edge-triggered
  open and a permanent close) and assert that the search reports a dead state.
- Run for 03 Node Run, 04 Endplate Ferry, and the two puzzle fixtures. Keep the
  test deterministic and fast.

This is exhaustive over the authored action alphabet at stable decision points,
not over every intermediate tick. Waiting only advances timers, pulses, and
cooldowns; the static gate-recovery validator separately warns on gates that can
close permanently without a level-triggered open. A literal tick-level search is
not tractable: 04 exceeded 300,000 states before the cap. Future repeat-timer or
sub-timer-window puzzles need an explicit timed extension.

Exit criteria:

- `npm test` passes with the dispatch, timer, gate, and reachability tests.
- The historical Endplate Ferry dead state recovers, and the reported sequence
  no longer deadlocks.
- The exhaustive stable-state search completes without a cap and finds no dead
  state for 03, 04, or the fixtures.
- `pack:validate` passes without introducing new warnings for 04.

---

## 5. Phase 2 — Generic ECS kernel

**Status:** complete (2026-10-28).

**Goal:** prove the ECS substrate on a bounded problem.

Files:

- new `src/ecs/types.ts`
- new `src/ecs/world.ts`
- new `src/ecs/index.ts`
- new `tests/ecs.test.ts`
- `tests/boundaries.test.ts`

Tasks:

- Define `EntityId` as a branded stable string.
- Define `ComponentType<T>` tokens.
- Implement `createEcsWorld`:
  - `spawn`, `despawn`;
  - `add`, `get`, `remove`;
  - `query`;
  - deterministic `tick(dt, context)` and `frame(context)`.
- Define `System`, `SystemPhase`, `TickContext`, `FrameContext`.
- Keep the kernel free of game, puzzle, feedback, DOM, Phaser, and Matter
  imports.
- Iterate entities in insertion order for deterministic tests.
- Add boundary coverage: `ecs` has no upward dependencies.

Exit criteria:

- Kernel tests cover spawn/despawn, query, system order, and determinism.
- Boundary tests pass.
- No production code uses the kernel yet.

---

## 6. Phase 3 — Feedback domain

**Goal:** turn facts and state into a stable feedback view, without DOM.

### 6.1 Types and components

Files:

- new `src/feedback/types.ts`
- new `src/feedback/components.ts`
- new `src/feedback/index.ts`

Tasks:

- Define `FeedbackCapability`, `FeedbackState`, `FeedbackPresentation`,
  `FeedbackSurface`, `FeedbackCue`, `FeedbackFact`, `FeedbackView`,
  `FeedbackFrame`.
- Define components: `SourceRef`, `ActorRef`, `Anchor`, `Presentation`,
  `Content`, `Ownership`, `Lifetime`, `Priority`, `Visual`, `Accessibility`,
  `EffectPlan`, `EffectInstance`, `Conversation`.
- Define `RejectionReason` and the closed semantic state mapping.
- Keep the feedback module free of DOM, Phaser, Matter, `game`, `ui`, and
  `world`.

### 6.2 Facts and director

Files:

- new `src/feedback/facts.ts`
- new `src/feedback/director.ts`

Tasks:

- Ingest:
  - `PuzzleEvent` with `actor` and `source`;
  - action outcomes (accepted, rejected, blocked);
  - conversation starts;
  - system outcomes.
- Stable IDs for sticky surfaces:
  `fb:<capability>:<sourceId>`.
- Transient cues: monotonic `seq`, `cause` key, priority, TTL, coalescing.
- `ProjectSticky` rebuilds persistent surfaces from puzzle/world state.
- `OrderAndDedupe` produces stable frame order.
- `FeedbackFrame` carries `seq`, `tick`, `surfaces`, `beats`, `effects`.
- Feedback entities are ephemeral; no save state.

### 6.3 Descriptors, lexicon, beats

Files:

- new `src/feedback/descriptors.ts`
- new `src/feedback/lexicon.ts`
- new `src/feedback/beats.ts`

Tasks:

- `NODE_FEEDBACK` and `LINK_FEEDBACK` tables with
  `satisfies Record<PuzzleNodeType, ...>` / `Record<PuzzleLinkType, ...>`.
- Capabilities to default presentation/anchor/effect recipes.
- Map node/run states into `FeedbackState`.
- Lexicon maps `kind + reason + labels` to text, icon, and audio cue ID.
- Beat tracker derives `pending/active/done` from authored beats or the win
  graph.
- Content overrides are limited to labels, copy, beats, and named effect
  presets in M1.75; arbitrary effect graphs are not exposed in the pack schema.

### 6.4 Tests

Files:

- new `tests/feedback.test.ts`
- new `tests/feedback-coverage.test.ts`
- new `tests/feedback-beats.test.ts`

Tasks:

- Table-driven event coverage: every `PuzzleEventType` maps to a recipe or an
  explicit silent reason.
- No-silent-event test.
- Persistent projection goldens for 03/04.
- Cue seq, priority, TTL, dedupe, coalescing.
- Beat state derivation.
- New-type test: a dummy descriptor gets affordance, ack, progress, outcome, and
  a persistent element without touching UI/world/audio.

Exit criteria:

- Feedback tests pass headlessly.
- `puzzle` and `feedback` boundaries are clean.
- No UI/scene code consumes feedback yet.

---

## 7. Phase 4 — Runtime integration, surfaces, and input

**Goal:** wire the feedback domain to the game and the DOM without exposing
puzzle internals.

### 7.1 Runtime facts and view

Files:

- `src/game/runtime.ts`
- `src/ui/model.ts`
- `tests/runtime.test.ts`

Tasks:

- Emit `FeedbackFact`s from:
  - every puzzle event in `handlePuzzleEvents`;
  - puzzle activation/reset/hint/solve;
  - carry/pickup/place/drop/throw/pulse outcomes;
  - gate/dialogue/scan/debrief outcomes where they are player feedback.
- Remove hardcoded puzzle toast strings from `runtime.ts`.
- Add `RuntimeSnapshot.feedback` with:
  - persistent surfaces;
  - transient cues;
  - beat progress.
- Remove `RuntimeSnapshot.dialogue` only in Phase 5; until then keep the old
  path behind the migration.
- Add `GameRuntime.drainEffects(): WorldEffectPlan[]` for the scene.
- Ensure snapshot dedupe includes feedback `seq` so cues are not lost.

### 7.2 World view, anchors, sockets

Files:

- `src/pack/types.ts`
- `src/pack/parse-content.ts`
- `src/game/runtime.ts`
- `src/ui/anchors.ts`
- `tests/room-boot.test.ts`
- new `tests/anchors.test.ts`

Tasks:

- Add optional `components.anchors` to room entities:
  `Record<string, { x: number; y: number; direction?: number }>`.
- Provide defaults (`center`, `top`, `bottom`, `left`, `right`).
- Extend the runtime view with:
  - camera;
  - players;
  - entities and props with bounds;
  - resolved socket positions.
- Implement pure projection:
  `worldToScreen(anchor, camera, viewport)`.
- Handle canvas scale, letterboxing, resize, clamping, and edge docking.
- Add tests for two players, off-screen entities, resize, and sockets.

### 7.3 DOM surface layers and layout

Files:

- new `src/ui/feedback-renderer.ts`
- new `src/ui/layout.ts`
- `src/ui/styles.css`
- `src/ui/game-ui.ts`

Tasks:

- Add layers:
  `#world-surface-layer`, `#hud-surface-layer`, `#modal-layer`.
- Render surfaces by `presentation`, not by puzzle type.
- Diff DOM nodes by stable surface ID; do not rebuild the layer every tick.
- Layout:
  - bubble above entity;
  - caption below player;
  - P1/P2 lanes for overlapping captions;
  - stacking for multiple surfaces on one anchor;
  - safe-area clamp and HUD fallback.
- Keep interactive controls keyboard reachable; pointer events only on controls.
- Add tests for layout/overlap in pure functions where possible.

### 7.4 Per-player input routing

Files:

- `src/world/input.ts`
- `src/world/runtime-port.ts`
- `src/game/runtime.ts`
- `src/ui/game-ui.ts`
- `tests/runtime.test.ts`

Tasks:

- Add per-player UI actions:
  `confirm`, `cancel`, `navigateUp`, `navigateDown`, `choose`.
- Add `SurfaceInputRouter`:
  - hard surface consumes all;
  - soft surface consumes only its owner;
  - otherwise gameplay.
- Soft surfaces do not steal DOM focus.
- Hard surfaces keep the existing focus trap.
- Add P1/P2 simultaneous-input tests.
- Add solo fallback: P1 owns all soft surfaces.

### 7.5 Player captions and speech bubbles

Files:

- `src/ui/feedback-renderer.ts`
- `src/game/runtime.ts`

Tasks:

- `playerCaption` anchored to the actor, TTL, follows the player.
- `speechBubble` anchored to an entity, owner chip, choices/continue.
- Multiple simultaneous surfaces; no global toast for player-attributed events.
- Effects inherit `actor`/`owner`/`accent`.

### 7.6 Stuck safety net

Files:

- `src/game/runtime.ts`
- `src/feedback/director.ts`
- `tests/runtime.test.ts`

Tasks:

- Detect no puzzle-state change for a bounded tick count while unsolved.
- Surface an inline “Show hint / Reset puzzle” affordance; do not auto-reveal.
- Record a diagnostic counter or learning event; do not make it evidence.
- Reset remains available before solve.

Exit criteria:

- 03/04 feedback appears on state and events.
- P1/P2 attribution works in co-op.
- No puzzle state is read directly by `ui` or `world`.
- Runtime tests cover two simultaneous surfaces.

---

## 8. Phase 5 — Entity conversations replace dialogue

**Goal:** remove the global dialogue modal and make conversations owned surfaces.

Files:

- `src/game/runtime.ts`
- `src/game/state-machine.ts`
- `src/game/boot.ts`
- `src/ui/model.ts`
- `src/ui/game-ui.ts`
- `src/save/index.ts`
- `tests/runtime.test.ts`
- `tests/save.test.ts`
- `e2e/m1.spec.ts`

Tasks:

- Add `ConversationState` and `GameRuntime.conversations:
  Map<SurfaceId, ConversationState>`.
- Start a conversation on entity interact:
  - create `speechBubble` surface;
  - owner = actor;
  - anchor = entity;
  - `freeze-owner` for choices, `free` plus `maxDistance` for acknowledgements.
- Support:
  - `advance` for linear nodes;
  - `choose` for choices;
  - `cancel` by owner;
  - multiple concurrent conversations;
  - dialogue effects unchanged.
- Remove `dialogue` from `GameState`; soft conversations do not change the
  blocking state.
- Keep `gate`, `debrief`, `pause`, `map`, `conceptLog`, and `complete` as
  explicit blocking modes.
- Remove `RuntimeSnapshot.dialogue` and `renderDialogue`.
- Replace `onAdvanceDialogue` / `onChooseDialogue` with
  `onSurfaceAction(surfaceId, action)`.
- Save optional `conversations`:
  - `surfaceId`, `dialogueId`, `nodeId`, `owner`, `entityId`;
  - migrate old `dialogue` to one P1-owned conversation;
  - feedback ECS entities are recreated from the saved sessions.
- If an entity/target is missing on restore, close the conversation with a
  recovery cue.

Exit criteria:

- P1 and P2 can talk to different entities at once.
- P1 can answer while P2 moves.
- Old saves with a single dialogue still load.
- No global dialogue overlay remains.

---

## 9. Phase 6 — Effects and tile visuals

**Goal:** make directional, A→B, and tile effects real without per-puzzle code.

Files:

- `src/feedback/effects.ts`
- `src/feedback/effect-presets.ts`
- `src/world/effects.ts`
- new `src/world/tile-visuals.ts`
- `src/world/room-scene.ts`
- `src/world/runtime-port.ts`
- `src/game/runtime.ts`
- `tests/feedback-effects.test.ts`
- new `tests/tile-visuals.test.ts`

Tasks:

- Define `EffectPlan`, `EffectStage`, `EffectSource`, `Direction`,
  `EffectPath`, `EffectVisual`, `AnchorRef`, `TileTarget`, `TileVisualOp`.
- Define `WorldEffectPlan`/`TileVisualOp` in `world` public types; `game` maps
  feedback plans into the world ports.
- Add `WorldEffectPort` and `TileVisualPort`.
- Effect systems:
  - `EffectSpawn`;
  - `EffectTick`;
  - `EffectRender`.
- Implement:
  - directional burst from a socket (ray/cone);
  - A→B orb/beam/trail with follow binding;
  - persistent beam with cancellation;
  - tile tint/swap/overlay/sequence with revert;
  - stagger by source distance/index.
- `RoomScene` effect layer:
  - spawn/cancel visual instances;
  - apply tile visuals to tile images;
  - restore on revert;
  - reduced-motion path.
- `TileVisualState` store:
  - keyed by layer/x/y;
  - apply/revert;
  - no collision changes;
  - testable headlessly.
- Default effect recipes per capability from ADR-0012.
- Content can select a named preset in M1.75; arbitrary plan authoring remains
  behind validator support and is not required for 03/04.

Exit criteria:

- Directional emission, A→B, and tile effects work from capability defaults.
- Effects never mutate puzzle/world state or collision.
- Follow/cancel/reduced-motion tests pass.

---

## 10. Phase 7 — Content migration for 03 and 04

**Goal:** prove the feedback layer on the existing puzzles.

Files:

- `public/packs/anatomy-reflex/levels/03-nerve-forest/*`
- `public/packs/anatomy-reflex/levels/04-muscle-effector/*`
- level READMEs
- `public/packs/anatomy-reflex/theme.json` / cues
- `public/syllabi/anatomy-reflex.json` only if evidence text changes

Tasks:

- Add labels and optional beats to both puzzles.
- Add entity sockets/anchors where effects emit:
  - terminal muzzle;
  - receptor mouth;
  - gate centre;
  - muscle gate centre.
- Replace hardcoded toast text with feedback recipes:
  - plate press/release;
  - timer start/elapsed;
  - gate open/close;
  - pulse fired/travel/impact;
  - empty receptor, wrong shape, bind;
  - pickup/place/drop/clear;
  - solve/reset.
- Add persistent feedback:
  - Ca²⁺ timer meter;
  - gate open/closed state;
  - receptor occupied/bound;
  - packet carried/placed/cleared;
  - step tracker.
- Add effects:
  - pulse orb + impact ring;
  - gate burst;
  - tile path lighting;
  - ACh dissolve;
  - muscle wave;
  - exit ping.
- Add audio cue IDs as needed; missing cues fall back to synth/silence.
- Update level READMEs to remove stale “no feedback/clear” deviations.
- Keep the AChE gate-close link; document that open-before-close is the recovery
  invariant and that AChE closes the gate only as the clearance beat.

Exit criteria:

- 03 and 04 are playable with the new feedback.
- Endplate Ferry shows the intended sequence and failure reasons.
- `pack:validate` and `pack:smoke` pass.

---

## 11. Phase 8 — Validation, accessibility, docs, playtest

**Goal:** make coverage enforceable and close the milestone.

### 11.1 Validation

Files:

- `src/pack/validate.ts`
- `tests/validate.test.ts`

Rules to add:

- interactive node/link with no label or copy;
- timer/gate that gates the win but has no persistent element;
- gate with no open/closed presentation;
- receptor with no accept/reject reason;
- empty authored message;
- unknown audio cue;
- beat referencing an unknown node;
- puzzle with no hints or solved cue;
- feedback override using an unknown component/presentation;
- effect target/socket missing;
- tile layer missing or region outside room bounds;
- unknown effect operator/path kind;
- persistent effect without cancellation;
- player-caused effect without actor;
- effect declaring collision change;
- movement-only effect without reduced-motion fallback.

### 11.2 Boundary and accessibility tests

Files:

- `tests/boundaries.test.ts`
- new `tests/feedback-accessibility.test.ts`
- `tests/room-boot.test.ts`

Checks:

- `ecs` imports no game/puzzle/UI/DOM/Phaser.
- `feedback` imports no DOM/Phaser/world/game.
- `world` imports no feedback.
- `ui` imports feedback types, not puzzle internals.
- Every surface/effect has a text/state alternative.
- Reduced motion keeps surfaces/text and removes effects.
- Live-region announcements include actor attribution.
- Soft surfaces do not steal the other player’s input.

### 11.3 Documentation

- Verify ADR-0009–0013 are accepted and indexed (Phase 0).
- Update `architecture.md` §2, §4 (strategy item 4), §6.1, §6.5, §8, and §9 to
  remove the old “feedback is a toast / no new UI surface” constraints.
- Update `contracts/interface.md`, `contracts/module-boundaries.md`,
  `contracts/data-model.md`, and `contracts/state-machine.md` for `ecs`,
  `feedback`, surfaces, effects, conversations, and save fields.
- Update `traceability.md` for the new ADRs and behaviors.
- Update `README.md` and `IMPLEMENTATION.md` for the new runtime/UI flow.
- Update the M1.75 milestone doc from “planned” to “complete”.

### 11.4 Playtest

- Solo: terminal → Ca²⁺ → carry → place → pulse.
- Co-op: P1 terminal/pulse, P2 packet; distinct attribution.
- Empty receptor, wrong receptor, plate release, AChE timing.
- Two simultaneous conversations.
- Off-screen bubble fallback.
- Reduced motion.
- Tile visual revert with no collision change.
- Stuck state shows hint/reset, not a dead run.

Exit criteria:

- All automated commands pass.
- Manual checks pass.
- No remaining softlock path.
- `playtestedSolo` / `playtestedCoop` recorded honestly.

---

## 12. Dependency order

| Step | Depends on |
|---|---|
| 1. Correctness gate | Phase 0 |
| 2. ECS kernel | Phase 0 |
| 3. Feedback domain | 2 |
| 4. Runtime view + DOM surfaces | 2, 3 |
| 5. Per-player input | 4 |
| 6. Entity conversations | 4, 5 |
| 7. Effects + tile visuals | 3, 4 |
| 8. Content migration | 1, 3–7 |
| 9. Validation/accessibility/docs/playtest | 8 |

Do not merge the correctness gate into the feedback layer. A feedback system on
top of wrong link dispatch is worse than no feedback.

---

## 13. Test matrix

| Suite | Covers |
|---|---|
| `tests/puzzle-dispatch.test.ts` | event → link dispatch table |
| `tests/recoverability.test.ts` | exhaustive stable-state reachability |
| `tests/helpers/recoverability.ts` | action alphabet, settling, state graph, reverse reachability |
| `tests/endplate-ferry.test.ts` | timer restart, gate order, AChE clearance |
| `tests/ecs.test.ts` | spawn/despawn/query/system order/determinism |
| `tests/feedback.test.ts` | facts, projection, cue queue, dedupe, TTL |
| `tests/feedback-coverage.test.ts` | every event mapped or explicitly silent |
| `tests/feedback-beats.test.ts` | beat state derivation |
| `tests/feedback-effects.test.ts` | direction, path, follow, cancel, attribution |
| `tests/tile-visuals.test.ts` | apply/revert, no collision change |
| `tests/anchors.test.ts` | projection, sockets, resize, off-screen fallback |
| `tests/runtime.test.ts` | facts, surfaces, co-op input, conversations, stuck state |
| `tests/save.test.ts` | conversation save/restore and old dialogue migration |
| `tests/boundaries.test.ts` | module graph and no feedback in world |
| `e2e/m1.spec.ts` | browser flow, conversations, reduced motion |

---

## 14. Compatibility and migration

- **Old puzzle content:** optional labels/beats/anchors/effects default to
  capability feedback. Existing 1.0 documents remain valid.
- **Old saves:** `dialogue` is read and migrated to one P1-owned conversation;
  new `conversations` is optional.
- **Feedback state:** never saved; sticky surfaces are rebuilt from puzzle/world
  state on restore.
- **UI snapshot:** `dialogue` is removed; `feedback` is added. Existing tests
  and boot wiring update in one pass.
- **World:** no feedback import. Effects and tile visuals enter through ports.
- **Audio:** cue IDs remain logical; missing cues fall back to synth/silence.

---

## 15. Scope cuts

Must ship:

- correctness gate and recoverability tests;
- ECS kernel;
- feedback domain with persistent/transient split;
- co-op surfaces and per-player input;
- entity conversations;
- 03/04 feedback migration;
- validation and accessibility checks.

Can defer without invalidating the architecture:

- content-authored arbitrary `EffectPlan`s (named presets are enough for 03/04);
- persistent beams beyond the examples;
- advanced tile sequences;
- effect asset polish;
- full-game ECS migration.

Do not cut:

- actor attribution;
- persistent state projection;
- per-player input ownership;
- the removal of the global dialogue overlay;
- the separation between tile visuals and collision.

---

## 16. Suggested commit sequence

1. `fix(puzzle): dispatch links by event type`
2. `fix(puzzle): restart elapsed timers and level-trigger the Ca gate`
3. `test(puzzle): exhaustively search stable reachability`

Items 1–3 landed: items 1–2 in `464ca63`, item 3 with the stable-state
reachability guard.

4. `feat(ecs): add generic deterministic ECS kernel`
5. `feat(feedback): add components, facts, director, and descriptors`
6. `feat(ui): add anchored feedback surfaces and per-player input routing`
7. `feat(game): replace global dialogue with entity conversations`
8. `feat(effects): add composable effect plans and tile visual state`
9. `feat(content): migrate 03/04 feedback and effects`
10. `chore(validation): add feedback/effect coverage and accessibility checks`
11. `docs(m1.75): close the milestone and update contracts/traceability`

Each commit should leave the pack valid and the existing 03 → 04 flow playable.

---

## 17. Acceptance summary

M1.75 is complete when:

- The Endplate Ferry softlock is unreachable and covered by tests.
- Every reachable stable state has a path to solved under the exhaustive
  stable-state reachability test.
- Every puzzle event is mapped to feedback or explicitly silent.
- Persistent state is always visible without relying on a toast.
- P1/P2 feedback and effects are attributable.
- Entity conversations replace the global dialogue overlay.
- Directional emission, A→B effects, and tile visuals use one composable model.
- A new node type requires one descriptor; missing coverage fails the build or a
  test.
- Effects never mutate state or collision; reduced motion preserves meaning.
- The full verification suite passes and the ADRs/contracts/traceability are
  updated.

## 18. Out of scope

- Full-game ECS migration.
- New puzzle types or puzzle classes.
- Conditional links, side travel, or unrelated puzzle-engine upgrade work.
- Final art, final audio, capture mode, or UI skin.
- World-space free-text input.
- Arbitrary effect scripting or content callbacks.
- Backtracking, per-level caches, or multiple simultaneous tether policies.

## References

- [`../m1.75/README.md`](../m1.75/README.md)
- [`adr/0009-feedback-ecs-substrate.md`](adr/0009-feedback-ecs-substrate.md)
- [`adr/0010-anchored-feedback-surfaces.md`](adr/0010-anchored-feedback-surfaces.md)
- [`adr/0011-entity-conversations.md`](adr/0011-entity-conversations.md)
- [`adr/0012-capability-feedback-coverage.md`](adr/0012-capability-feedback-coverage.md)
- [`adr/0013-cosmetic-feedback-effects-accessibility.md`](adr/0013-cosmetic-feedback-effects-accessibility.md)
- [`architecture.md`](architecture.md)
- [`implementation-plan.md`](implementation-plan.md)
- [`endplate-ferry-feedback-and-softlock.md`](endplate-ferry-feedback-and-softlock.md)
