# M1.5 Architecture Decision Records

**Status:** Accepted, 26 October 2026
**Scope:** M1.5 puzzle-authoring foundation and the Signal Ferry proof  
**Format:** Nygard-style, matching the ADR set under
`docs/shrinkonauts/base-game/adr/`.

This directory exists outside the Obsidian vault symlink. It adds only new
records; it does not rewrite the accepted ADR history.

## Numbering note

The M1.5 design handoff proposed ADR-0030–0037. Those numbers are already
occupied by accepted records:

- ADR-0030: sprite/animation format policy
- ADR-0031: layered background composition
- ADR-0032: audio cue abstraction
- ADR-0033: final asset integration timing

The M1.5 decisions are therefore recorded as **ADR-0034–0041**. They are new
records, not amendments or edits to the existing files.

## Index

| # | Decision | Status |
|---|---|---|
| [0034](0034-puzzle-as-data-typed-dataflow.md) | Puzzle as a first-class typed dataflow document | Accepted |
| [0035](0035-ecs-shaped-body-prop-model.md) | ECS-shaped `body` + `prop` entity model | Accepted |
| [0036](0036-matterjs-physics-boundary.md) | Matter.js physics boundary and full-physics players | Accepted |
| [0037](0037-per-player-abilities-solo-union.md) | Per-player abilities with a solo union | Accepted |
| [0038](0038-puzzle-scoped-tether-policy.md) | Puzzle-scoped tether policy | Accepted |
| [0039](0039-puzzle-as-assessment-source.md) | Puzzle as the assessment source | Accepted |
| [0040](0040-dynamic-prop-state-softlock-contract.md) | Dynamic prop state and softlock contract | Accepted |
| [0041](0041-save-schema-v2.md) | Save schema v2 | Accepted |
| [0042](0042-puzzle-activation-lifecycle.md) | Puzzle activation lifecycle and scoped tether resolution | Accepted |
| [0043](0043-puzzle-feedback-hints-cooldown.md) | Puzzle feedback surfaces for hints and pulse cooldown | Accepted |
| [0044](0044-hazard-sensors-checkpoint-respawn.md) | Hazard sensors and checkpoint respawn | Accepted |
| [0045](0045-recoverable-save-version-mismatch.md) | Recoverable save version mismatch | Accepted |

ADR-0034–0041 are unchanged close-out records from the original M1.5 pass.
ADR-0042–0045 record the decisions made while closing the verified gaps.

## Related accepted records

- ADR-0005: fixed timestep and serialisable state
- ADR-0009: fixed verbs and themed abilities
- ADR-0010: behaviour registry, no pack scripting
- ADR-0011: concept gates and knowledge progression
- ADR-0015: no fail state, checkpoint retry
- ADR-0016: local co-op is P0
- ADR-0017: co-op camera and tether
- ADR-0023: test contracts and validation
- ADR-0025: scope and non-goals

The new records extend those decisions. Where they narrow an existing rule,
the newer record wins for M1.5.
