# ADR-0039: Puzzle as the assessment source

- **Status:** Accepted
- **Date:** 2026-10-26
- **Deciders:** Snorre
- **Related:** ADR-0011, ADR-0012, ADR-0015, ADR-0023, ADR-0034

## Context

The M1 Nerve Forest level assesses OBJ-2 in three places: dialogue dialogue
checks, a sequence gate at the exit, and a debrief. The gate is a quiz door in
front of the level exit. It interrupts spatial play, duplicates the debrief,
and makes the main path a reading test rather than a world-interaction test.

The learning design says the assessment should be the puzzle itself, with a
debrief that asks for explanation. The concept-gate engine remains useful for
objectives that are genuinely knowledge checks and for M2 content.

## Decision

For M1.5, the Signal Ferry puzzle is the **assessment source** for OBJ-2.

### Evidence

- The puzzle emits `puzzle_solved` with `puzzleId`, objective ids, concept ids,
  mode, and attempt counters.
- The debrief emits `debrief_answered` with the prompt id, answer, and
  objective ids.
- The exit is a **flag gate**: it opens when the puzzle's win predicate is
  latched, not when a quiz answer is submitted.
- The level's evidence rule changes from `gate_solved` filtered by
  `gate-nerve-01` to `puzzle_solved` filtered by `puzzle-ferry-01`.
- `EV-2` in the syllabus changes from "Gate attempts and answers" to "Signal
  Ferry solve and diagnostic counters".
- `debrief_answered` remains a separate evidence rule for the explanation
  objective.

### Removed from this level

- The `gate-nerve-01` quiz door is removed from the level's `gateIds`, room
  gate entity, trigger, exit gate, map edge, and rewards.
- The gate document may remain in the repository as an M2 example, but it is
  not loaded or validated as part of M1.5 content.
- The level's `signal-dash` and map-reveal rewards move from the gate's
  `onSolve` to the puzzle document's `rewards`.

### Kept for M2

The concept-gate engine, gate schema, gate UI, and gate evidence remain in the
codebase. They are not deleted. Later levels can use a concept gate for a
non-spatial objective, but not as a substitute for a spatial puzzle on the main
path.

### Debrief

The debrief remains free text and keeps the rubric:

- 0 = labels only;
- 1 = partial explanation;
- 2 = one-way transmission plus receptor specificity and the spinal bypass.

The puzzle's diagnostic counters (wrong receptor, wrong side, resets) are
exported as process evidence, not as a correctness score.

## Consequences

**Easier:**

- The main path is spatial play, not a quiz door.
- The puzzle and debrief provide complementary evidence: performance and
  explanation.
- The level exit can be a simple flag gate; no UI overlay interrupts the
  solve.
- Diagnostic counters show how the player explored, not only the final answer.

**Harder:**

- The puzzle must be a valid assessment, not just a mechanical demo. The
  receptor choice and pulse direction must be legible.
- Evidence coverage and mapping must be regenerated.
- The old gate tests and level expectations are obsolete and must be rewritten.
- A failed solve has no quiz fallback; the puzzle must be resettable and
  softlock-free.

**Constrained:**

- No quiz gate on the main path of 03-nerve-forest.
- No double assessment: the puzzle is the performance evidence; the debrief is
  the explanation evidence.
- No automatic grading of free text in M1.5; the rubric is for the teacher and
  the export includes the raw answer.

## Alternatives considered

- **Keep the quiz gate and add the puzzle before it** — two assessments, longer
  path, same problem. Rejected.
- **Keep the quiz as an optional side interaction** — still signals that the
  world is not enough. Rejected for this level.
- **Replace the debrief with the puzzle only** — loses the explanation
  evidence. Rejected.
- **Delete the gate engine** — throws away a valid tool for M2 and other
  objectives. Rejected.
- **Auto-grade the debrief** — brittle and pedagogically weak. Rejected.

## References

- [`../shrinkonauts/learning-design-brief.md`](../shrinkonauts/learning-design-brief.md) §7
- [`../shrinkonauts/base-game/adr/0011-concept-gates-knowledge-progression.md`](../shrinkonauts/base-game/adr/0011-concept-gates-knowledge-progression.md)
- [`../shrinkonauts/base-game/adr/0012-curriculum-runtime-event-observer.md`](../shrinkonauts/base-game/adr/0012-curriculum-runtime-event-observer.md)
- [`0034-puzzle-as-data-typed-dataflow.md`](0034-puzzle-as-data-typed-dataflow.md)
