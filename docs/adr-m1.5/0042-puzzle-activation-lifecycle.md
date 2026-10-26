# ADR-0042: Puzzle activation lifecycle and scoped tether resolution

- **Status:** Accepted
- **Date:** 2026-10-26
- **Deciders:** Snorre
- **Related:** ADR-0005, ADR-0034, ADR-0038, ADR-0040, ADR-0041

## Context

ADR-0034 gives every puzzle document an `activation.mode` of `roomStart`,
`zoneEnter`, or `interact`, and ADR-0038 makes the tether policy puzzle-scoped.
The M1.5 implementation parsed and validated all three modes, but the game
runtime ignored them: every level puzzle was constructed, ticked, saved, and
exposed in the HUD from room entry. The tether override was therefore applied
before any puzzle had actually started, and the `off` one-screen rule existed
only in prose.

That is not a cosmetic gap. An `interact` or `zoneEnter` puzzle must not consume
input, cooldowns, evidence counters, or save state before the player starts it.
It also must not apply a tether policy the player has not reached yet.

## Decision

Activation is a **runtime lifecycle gate** owned by `GameRuntime`. The puzzle
document remains declarative; `src/puzzle` stays a pure graph evaluator.

### Modes

| Mode | Activation point | Required reference |
|---|---|---|
| `roomStart` | When the level is entered | None |
| `zoneEnter` | After a fixed world step, when an active player AABB overlaps the named zone node's rect | `activation.zoneId`, pointing at a `zone` node in the same document |
| `interact` | When an active player presses that player's interact key within `INTERACT_RANGE` of a room entity | `activation.entityId`, pointing at a room entity |

Rules:

- A puzzle activates at most once per level entry. Reset does not deactivate it.
- Interact activation takes precedence over dialogue, gate, and carry actions on
  that press, so the prompt and the action agree.
- Only activated puzzles tick, reset, save, and appear in `puzzleView`.
- Puzzle prop interactions (pickup, placement, pulse) are routed only to active
  puzzles.
- Activation autosaves. A puzzle is restored as active when its run state is
  present in the save; no new `activated` save field is introduced.
- Entering a level starts each `roomStart` puzzle immediately.

### Tether resolution

- The room default is `normal`.
- The first activated puzzle in level order supplies its authored policy
  (`normal | stretch | off`) for the whole room.
- The policy is not changed by puzzle phase. A solved puzzle keeps its policy.
- M1.5 shows one active puzzle at a time in the HUD. Multiple active puzzles are
  allowed by the data model but only the first is visible; a level that needs
  different simultaneous policies needs a new ADR.

### `off` one-screen guard

`tether: "off"` is valid only when the bounding box of all puzzle geometry fits
inside the 1280 × 720 authoring viewport. Geometry means:

- room entity anchors referenced by puzzle nodes;
- receptor, plate, and zone rects;
- receptor snap points and prop spawn points.

The pure validator accepts an optional `{ entityPoints, viewport }` context.
`validatePack` supplies the room's entity points. A puzzle without measurable
geometry skips the guard.

A room-size check is deliberately **not** used: `03-nerve-forest` is
1280 × 736 px at 32 px tiles, so a room-size rule would reject the accepted
ferry even though its puzzle geometry spans about 864 × 96 px.

## Consequences

**Easier:**

- A puzzle can be authored as a discoverable zone or a terminal interaction
  without changing engine code.
- Inactive puzzles cannot leak cooldowns or counters into evidence.
- Tether policy changes only when the player reaches the puzzle.
- Save/restore needs no new field.

**Harder:**

- The runtime must know room entity positions and active player AABBs.
- Authors must give `zoneEnter` a zone node and `interact` a real entity.
- A level with multiple simultaneous active puzzles has one visible puzzle and
  one tether policy in M1.5.

**Constrained:**

- No per-puzzle scripting or callbacks.
- No dynamic tether change mid-solve.
- No new save schema field for activation.
- No room-size interpretation of the `off` guard.

## Alternatives considered

- **Tick every level puzzle from room entry** — the pre-close-out behaviour;
  leaks input and evidence and applies tether too early. Rejected.
- **Activate through room triggers only** — would duplicate the puzzle's own
  zone grammar and split authoring between two files. Rejected.
- **Save an explicit activated flag** — adds state that can drift from the
  puzzle snapshot; presence of a saved run is enough. Rejected.
- **Room-size guard for `off`** — rejects the accepted ferry. Rejected.
- **Dynamic tether per phase** — already rejected by ADR-0038.

## References

- [`0034-puzzle-as-data-typed-dataflow.md`](0034-puzzle-as-data-typed-dataflow.md)
- [`0038-puzzle-scoped-tether-policy.md`](0038-puzzle-scoped-tether-policy.md)
- [`0040-dynamic-prop-state-softlock-contract.md`](0040-dynamic-prop-state-softlock-contract.md)
- [`0041-save-schema-v2.md`](0041-save-schema-v2.md)
