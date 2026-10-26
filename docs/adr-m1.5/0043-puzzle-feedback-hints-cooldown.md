# ADR-0043: Puzzle feedback surfaces for hints and pulse cooldown

- **Status:** Accepted
- **Date:** 2026-10-26
- **Deciders:** Snorre
- **Related:** ADR-0009, ADR-0020, ADR-0034, ADR-0037, ADR-0042

## Context

The puzzle document has an authored `hints` array, and ADR-0037 requires the
HUD to show pulse cooldown, but M1.5 did neither. `hints` was parsed and
validated, then dropped. The HUD showed the ability strip and carry state only.
The concept-gate overlay already has a hint path, but that path is separate from
puzzles.

Hints are authored text. They must not be generated, and they must remain
reachable with the keyboard.

## Decision

### Authored hints

- The pause overlay gets a **Show puzzle hint** button while an unsolved puzzle
  is active.
- Each press reveals the next authored hint. The most recent hint stays visible
  in a dedicated HUD line.
- Pressing the button records a `hint_used` learning event with `puzzleId`,
  `hintIndex`, and the hint text.
- Once all hints are shown, the button is disabled and the last hint stays.
- The hint index is UI state, not save state. It resets on level entry.
- M1.5 uses one hint index for the visible puzzle.

### Pulse cooldown

- `PuzzleView` exposes the first active `pulseSource` node's
  `remainingTicks` and `cooldownTicks`.
- The HUD ability strip shows `Pulse: ready` or the remaining time in seconds.
- The value comes from the existing `PuzzleNodeRunState.remaining` field; no new
  timer or save field is introduced.
- The display is text, not colour alone.

## Consequences

**Easier:**

- Authored hints have a real runtime path.
- Cooldown is legible without guessing from the pulse animation.
- No puzzle document or save schema change is needed.

**Harder:**

- The pause overlay must update while it stays mounted.
- The runtime needs a puzzle view that includes feedback state.
- The hint index is intentionally not restored.

**Constrained:**

- No auto-generated hints.
- No hint index in save v2.
- No mouse-only hint control.
- No new ability or input key.

## Alternatives considered

- **Always show the first hint in the HUD** — removes the option to try without
  a hint and makes the hint strip noisy. Rejected.
- **Auto-reveal after wrong attempts** — couples feedback to diagnostic
  counters and can spoil the receptor choice. Rejected for M1.5.
- **Add a new hint key** — the P2 cluster is already cramped and ADR-0037 keeps
  the key map fixed. Rejected.
- **Derive cooldown from the animation** — not accessible and not testable.
  Rejected.

## References

- [`0034-puzzle-as-data-typed-dataflow.md`](0034-puzzle-as-data-typed-dataflow.md)
- [`0037-per-player-abilities-solo-union.md`](0037-per-player-abilities-solo-union.md)
- [`0042-puzzle-activation-lifecycle.md`](0042-puzzle-activation-lifecycle.md)
