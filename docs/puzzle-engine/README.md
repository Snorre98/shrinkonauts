# Puzzle Engine Upgrade

**Status:** accepted design; implementation not started
**Scope:** the engine capabilities required by the intended M2 nervous-system
puzzle design (`03`–`05`, Silicon, optional `01`/`02`)
**Authority:** accepted ADR-0001–0008 in [`adr/`](adr/)
**Implementation:** phased plan in [`implementation-plan.md`](implementation-plan.md)

This documentation set turns the engine gaps found during the M2 level work
into explicit, testable capabilities. It is not a new game and not a scripting
engine. It keeps the existing compact modules, declarative puzzle dataflow,
fixed-step simulation, and v2 save model.

## Why this exists

The intended design needs behavior that the current engine cannot express or
enforce:

| Intended beat | Current gap | Upgrade |
|---|---|---|
| 04 Ca²⁺ gate blocks the cleft bridge | Puzzle gates are logic/visual only | Physical gate bodies (ADR-0002) |
| 04 gate opens/latches visibly; ACh is cleared | Static gate sprites; always-visible props | Gate/prop presentation state (ADR-0003) |
| 02 spindle releases a token; 04 AChE clears ACh | No locked/cleared states or unlock/clear actions | Prop lifecycle actions (ADR-0004) |
| 04 “pulse only after Ca²⁺” and “not released yet” | Conjunction only; no ordered condition or feedback | Conditional links + blocked feedback (ADR-0005) |
| 03 threshold vs 04 NMJ vs 05 bypass prompts | One prompt per objective | Per-level debrief prompts (ADR-0006) |
| Optional 01/02 from the map | Main path is linear after the debrief | Side-level map travel with return snapshot (ADR-0007) |
| Old content/saves keep working | New fields could break 03/04 | Minor-version compatibility (ADR-0008) |

## Decision summary

- **Physical gates are opt-in.** Only a `puzzleGate` with `components.body`
  gets collision. Existing 03 gates remain visual-only until migrated.
- **Gate and prop state stay in `puzzle`.** `world` derives bodies and sprites;
  `GameRuntime` is the single synchronizer.
- **Props gain `locked` and `cleared`** plus `unlock`/`clear` event links and
  optional initial state.
- **Event links can carry `requires` + `message`.** A blocked link is skipped,
  emits `linkBlocked`, and shows the authored toast; it is not evidence or a
  fail state.
- **A level can override its debrief prompts.** 04 adds
  `prompt-obj-2-nmj`/EV-9; 03 keeps `prompt-obj-2`/EV-7.
- **Map travel is a side excursion.** Main progression stays linear; optional
  01/02 return to a saved main snapshot. No full per-level cache.
- **Schemas move by minor version:** puzzle 1.1, level 1.1, run 2.1. Old content
  and saves default to old behavior.

## Field reports

- [`endplate-ferry-feedback-and-softlock.md`](endplate-ferry-feedback-and-softlock.md)
  — 2026-10-28 analysis of a reachable Endplate Ferry deadlock, its three
  engine causes, the missing puzzle feedback, and a fix plan with tests.

## Reading order

1. [`architecture.md`](architecture.md) — arc42 + C4, quality goals, runtime
   views, risks.
2. [`adr/`](adr/) — one decision per capability, including the base model.
3. [`contracts/module-boundaries.md`](contracts/module-boundaries.md) — modules,
   public APIs, dependency graph.
4. [`contracts/data-model.md`](contracts/data-model.md) — puzzle/level/save
   fields and invariants.
5. [`contracts/interface.md`](contracts/interface.md) — precise new signatures.
6. [`contracts/state-machine.md`](contracts/state-machine.md) — gates, props,
   side travel, conditional links.
7. [`contracts/failure-semantics.md`](contracts/failure-semantics.md) and
   [`contracts/concurrency-topology.md`](contracts/concurrency-topology.md).
8. [`behaviors/`](behaviors/) — Gherkin scenarios.
9. [`traceability.md`](traceability.md) — ADR → arc42 → behavior → contract.
10. [`implementation-plan.md`](implementation-plan.md) — phased changes, tests,
    migration, acceptance.

## Relationship to existing decisions

- ADR-0046 remains the main-path transition decision (debrief → next level,
  scene rebuild). This upgrade keeps it linear and adds side excursions around
  it.
- ADR-0034 (typed dataflow), ADR-0035 (body + prop), ADR-0036 (Matter
  boundary), ADR-0037 (solo union), ADR-0038 (tether), ADR-0039 (puzzle as
  assessment), ADR-0040 (prop softlock), ADR-0041 (save v2), ADR-0042
  (activation), ADR-0043 (hints/cooldown), ADR-0044 (hazards/checkpoints),
  ADR-0045 (save mismatch), and ADR-0046 remain in force.
- The M2 design package in [`../m2/nervous-puzzles/`](../m2/nervous-puzzles/) is
  the content authority. This set is the engine authority.
- The Obsidian vault under `docs/shrinkonauts` is read-only for this work.

## Explicit non-goals

- Full free map travel or a per-level state cache.
- Side-level chaining.
- New verbs, abilities, puzzle node types, or a scripting layer.
- Multi-puzzle rooms or multiple simultaneous tether policies.
- A spatial lesion overlay; the 05 lesion remains a concept gate.
- Final art/audio. Placeholder gate/prop states are sufficient.
- M3 capture, M4/M5 deliverables, or vault edits.

## Status of implementation

This is a design/plan artifact. No engine code is changed by this document set.
The implementation plan starts with schema/types/validators and keeps the
existing 03 → 04 pack as the regression baseline.
