# Puzzle Engine — ADR log

Accepted decisions for the `puzzle-engine` upgrade. Each record is immutable;
supersede with a new ADR rather than editing an accepted one.

**Implementation status is separate from decision status.** ADR-0009–0013 and
the M1.75 feedback layer are implemented. ADR-0002–0007 are only partially
implemented in this branch: physical gate bodies, `locked`/`unlock`,
`requires`/`message`/`linkBlocked`, per-level debrief overrides, and side-level
travel are deferred. See the status table in
[`../architecture.md`](../architecture.md) before treating an accepted decision
as runtime behavior.

| # | Decision | Status |
|---|---|---|
| [0001](0001-compact-modules-public-apis.md) | Keep compact modules and public APIs as the base model | Accepted |
| [0002](0002-physical-puzzle-gates.md) | Physical puzzle gates from authored gate state | Accepted |
| [0003](0003-gate-prop-presentation.md) | Gate and prop presentation state | Accepted |
| [0004](0004-prop-lifecycle-actions.md) | Prop lifecycle states and unlock/clear actions | Accepted |
| [0005](0005-conditional-links-feedback.md) | Conditional links and blocked-link feedback | Accepted |
| [0006](0006-per-level-debrief-prompts.md) | Per-level debrief prompts with syllabus fallback | Accepted |
| [0007](0007-side-level-map-travel.md) | Side-level map travel with a return snapshot | Accepted |
| [0008](0008-schema-evolution.md) | Backward-compatible schema evolution | Accepted |

## Feedback and effect architecture

| # | Decision | Status |
|---|---|---|
| [0009](0009-feedback-ecs-substrate.md) | Feedback ECS as the generic ECS substrate | Accepted |
| [0010](0010-anchored-feedback-surfaces.md) | Anchored feedback surfaces, co-op ownership, and input routing | Accepted |
| [0011](0011-entity-conversations.md) | Entity conversations replace the global dialogue overlay | Accepted |
| [0012](0012-capability-feedback-coverage.md) | Capability-based feedback defaults and coverage | Accepted |
| [0013](0013-cosmetic-feedback-effects-accessibility.md) | Cosmetic feedback effects, composable effect plans, and accessibility | Accepted |

## Amendments

- ADR-0009 amends ADR-0005's "no new UI surface" constraint.
- ADR-0013 amends ADR-0003's "no animation timelines" and "immediate state
  swaps only" constraints.

The amended records stay immutable; these amendment notes are the index entry,
not edits to ADR-0003 or ADR-0005.

Proposed material and pattern architecture:

| # | Decision | Status |
|---|---|---|
| [0014](0014-material-pattern-vocabulary.md) | Material and pattern vocabulary | Proposed |
| [0015](0015-tile-material-grid-autotiling.md) | Tile material grid, autotiling, and variants | Proposed |
| [0016](0016-pattern-projection-surfaces.md) | Pattern projection across tiles, objects, backgrounds, and UI | Proposed |
| [0017](0017-tile-variant-atlas-manifest.md) | Tile variant atlas and manifest metadata | Proposed |

Related records outside this system:

- [ADR-0034–0045](../../adr-m1.5/README.md) — M1.5 puzzle foundation and
  close-out decisions.
- [ADR-0046](../../adr-m1.5/0046-level-transitions.md) — main-path level
  transitions after the debrief.

## Online co-op architecture

The post-M3 online co-op milestone has its own ADR domain:

- [ADR-0047–0057](../../adr-online/README.md) — host-authoritative thin-client
  authority, session topology, snapshots and input, per-player ownership,
  host-owned save/evidence, composition with M1.75/M1.8/M2/M3, failure and
  reconnect semantics, security, deployment, IaC ownership, and testing.
- [M4 milestone](../../m4/README.md) — one-level online co-op for the M3
  `03-nerve-forest` slice.

These records are **Proposed**. They do not amend the accepted local-only
behaviour; they add an optional online mode whose host browser remains the
single writer of game state.
