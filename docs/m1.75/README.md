# M1.75 — Feedback, Co-op Attribution, and Effect Composition

**Status:** accepted; Phase 0 complete, Phase 1 complete, Phase 2 complete, Phase 3 complete, Phases 4–8 planned
**Scope:** the feedback/effect layer between the M1.5 puzzle foundation and the
next content/engine milestone.
**Source decisions:** [ADR-0009–0013](../puzzle-engine/adr/README.md)
**Implementation plan:**
[`feedback-implementation-plan.md`](../puzzle-engine/feedback-implementation-plan.md)
**Baseline:** M1.5 runtime, puzzle dataflow, save v2, and the 03/04 content.

| Phase | Focus | Status |
|---|---|---|
| 0 | Accept ADRs and capture the softlock baseline | Complete |
| 1 | Correctness gate | Complete (`464ca63` + stable-state reachability) |
| 2 | Generic ECS kernel | Complete (`src/ecs/`, `tests/ecs.test.ts`) |
| 3 | Feedback domain | Complete (`src/feedback/`, feedback tests) |
| 4–8 | Surfaces, conversations, effects, content, validation | Planned |

## 1. Why M1.75 exists

The gameplay loop is implemented, but feedback is still an ad-hoc side effect:

- `GameRuntime` understands only three puzzle events;
- one toast string overwrites concurrent outcomes;
- puzzle state is not exposed to the UI;
- the scene does not project gate, prop, plate, timer, or tile state;
- co-op feedback appears in one place for both players;
- dialogue is one global modal that blocks both players;
- effects are static or absent.

That is not a cosmetic gap. It prevents the game from explaining cause and
effect, attributing actions to P1 or P2, and adding new puzzle types without
editing every presentation channel.

M1.75 makes feedback a first-class subsystem before more puzzle types and
content depend on the current behaviour.

## 2. Milestone boundary

| In scope | Out of scope |
|---|---|
| Correctness fixes that make feedback truthful | New puzzle types or classes |
| Generic ECS kernel, feedback-only tenant | Full-game ECS migration |
| Feedback surfaces, persistent state, transient cues | Final UI skin or final art |
| Co-op ownership, world-space DOM, per-player input | Full key rebinding |
| Entity conversations replacing the global dialogue overlay | Free-text world-space input |
| Composable effects: direction, A→B, tile visuals | Arbitrary effect scripting |
| Content migration for 03 and 04 to prove the layer | Authoring 01/02/05/Silicon |
| Validation, coverage tests, accessibility | Conditional links, side travel, or unrelated M2 engine work |

M1.75 is not a content milestone. The 03/04 migration exists to prove that the
feedback architecture works on real puzzles, not to expand the level count.

## 3. Deliverables

### Engine and runtime

- [x] `src/ecs/` — generic ECS kernel with deterministic tick/frame systems.
- [x] `src/feedback/` — feedback components, facts, director, descriptors,
  lexicon, beats, and effect plans.
- [ ] `GameRuntime` emits facts instead of hardcoded toast strings.
- [x] Every puzzle event type is either mapped to feedback or explicitly
  silenced.
- [x] Persistent surfaces are rebuilt from state; transient cues are sequenced
  and deduplicated.
- [ ] `RuntimeSnapshot.feedback` carries surfaces and beats; the world drains
  effects through a narrow port.

### Co-op feedback

- [ ] Entity conversations are speech bubbles anchored to the entity.
- [ ] Player-specific messages are captions anchored to the actor and follow the
  player for their TTL.
- [ ] P1 and P2 can hold simultaneous surfaces without stealing each other's
  input.
- [ ] Effects carry `actor`, `owner`, and `accent` attribution.
- [ ] The global `dialogue` state and overlay are retired for entity
  conversations.

### Effects

- [ ] `EffectPlan` / `EffectStage` composition with closed operators.
- [ ] Entity/player sockets, directions, rays, cones, segments, polylines, arcs,
  and radial paths.
- [ ] Tile/tile-region visual targets and revert rules.
- [ ] Persistent effects cancel on source/target loss.
- [ ] Tile effects never change collision.
- [ ] Reduced motion removes effects without removing information.

### Content and verification

- [ ] 03 Node Run and 04 Endplate Ferry migrated to the feedback layer.
- [ ] Ca²⁺ window, gate state, receptor occupancy, ACh clearance, and step
  progress are visible.
- [x] The Endplate Ferry softlock is unreachable.
- [ ] `pack:validate` checks feedback/effect coverage.
- [ ] Solo and co-op playtests confirm attribution and recoverability.

## 4. Definition of done

M1.75 is done when:

1. The Endplate Ferry dispatch, timer, and gate-causality defects are fixed and
   covered by regression tests.
2. Every reachable unsolved stable state has a path to solved under the bounded
   stable-state reachability test.
3. The ECS kernel and feedback domain are independent of DOM, Phaser, Matter, and
   `game`.
4. A new puzzle node type requires one descriptor and fails the build if the
   descriptor is missing.
5. Entity conversations work for both players simultaneously.
6. P1/P2 attribution is visible on surfaces and effects.
7. Directional emission, A→B transfer, and tile visual changes work without new
   per-puzzle UI code.
8. `npm test`, `npm run pack:validate`, `npm run pack:smoke`,
   `npm run smoke:e2e`, `npm run build`, and `git diff --check` pass.
9. The ADRs are accepted and the architecture/contracts/traceability docs point
   at the implementation.

## 5. Non-goals

- No full-game ECS migration. The kernel must be capable of it, but gameplay
  stays in its current modules.
- No new puzzle types or classes in this milestone. The point is to make adding
  them safe.
- No conditional links, side-level travel, or unrelated puzzle-engine upgrade
  work.
- No final art/audio, capture mode, or UI skin.
- No arbitrary content-authored effects or callbacks.
- No world-space free-text input.
- No change to puzzle logical semantics except the documented correctness fixes.

## 6. Compatibility

- Old puzzle documents without labels, beats, anchors, or effects continue to
  validate and run with capability defaults.
- Old saves continue to load. The legacy single `dialogue` field migrates to one
  P1-owned conversation; new `conversations` is optional.
- Feedback ECS entities are ephemeral and are never saved.
- The existing `RuntimeSnapshot` consumers are migrated in one pass; the
  `dialogue` view is removed, not kept as a parallel path.
- The existing 03 → 04 flow remains the regression baseline.

## 7. Risks

| Risk | Mitigation |
|---|---|
| ECS kernel becomes a game-engine rewrite | Keep it generic, small, and feedback-only; no gameplay migration |
| Feedback becomes a second source of truth | Persistent projection from state; effects never mutate state |
| Co-op input routing breaks solo | Per-player router with explicit fallback; solo uses P1 path |
| DOM projection drifts from the canvas | Single `WorldView` projection contract; resize tests |
| Entity conversations create two dialogue paths | Remove the global `dialogue` state and overlay |
| Effects become gameplay logic | Tile visuals cannot change collision; effects are cosmetic |
| New puzzle types still need UI work | Compile-time descriptor coverage and new-type test |
| Feedback coverage drifts | Table-driven event coverage and validator rules |

## 8. Verification

```sh
npm test
npm run pack:validate
npm run pack:smoke
npm run smoke:e2e
npm run build
git diff --check
```

Manual checks:

- solo Endplate Ferry: plate → Ca²⁺ window → carry → place → pulse;
- co-op Endplate Ferry: P1 terminal/pulse, P2 packet, distinct attribution;
- empty receptor, wrong receptor, plate release, and AChE timing;
- two simultaneous entity conversations;
- off-screen entity bubble fallback;
- reduced motion with effects enabled/disabled;
- tile visual revert with collision unchanged.

## 9. Relationship to other documents

- [`docs/puzzle-engine/adr/0009-feedback-ecs-substrate.md`](../puzzle-engine/adr/0009-feedback-ecs-substrate.md)
- [`docs/puzzle-engine/adr/0010-anchored-feedback-surfaces.md`](../puzzle-engine/adr/0010-anchored-feedback-surfaces.md)
- [`docs/puzzle-engine/adr/0011-entity-conversations.md`](../puzzle-engine/adr/0011-entity-conversations.md)
- [`docs/puzzle-engine/adr/0012-capability-feedback-coverage.md`](../puzzle-engine/adr/0012-capability-feedback-coverage.md)
- [`docs/puzzle-engine/adr/0013-cosmetic-feedback-effects-accessibility.md`](../puzzle-engine/adr/0013-cosmetic-feedback-effects-accessibility.md)
- [`docs/puzzle-engine/feedback-implementation-plan.md`](../puzzle-engine/feedback-implementation-plan.md)
