# ADR-0002: Physical puzzle gates from authored gate state

Status: Accepted

## Context

Puzzle gates are currently logic and visual state only. `PuzzleRuntime` opens
and closes `gate` nodes, but `RoomPhysics` has no body for a `puzzleGate`
entity. The intended M2 design needs the 04 Ca²⁺ gate to block the cleft
bridge, the 03 threshold/one-way/exit gates to block the axon path, and the
05 ventral/brain/kick gates to control the route.

The gate state belongs to the puzzle graph. The collision body belongs to the
physics world. The upgrade must connect them without letting `puzzle` import
Matter.js or letting `world` own puzzle logic.

## Decision

Physical gate collision is **opt-in per room entity**.

- A `puzzleGate` entity may declare `components.body` with `width` and
  `height`. If it does, `RoomPhysics` creates one static solid body for that
  gate. If it does not, the gate remains visual-only and existing rooms keep
  their current behavior.
- The gate body uses the solid collision category and collides with players and
  props. It is positioned like a hazard: centered on the entity cell, with its
  bottom at the entity's floor line.
- Gate state remains owned by `PuzzleRuntime`. `GameRuntime` synchronizes the
  world after level entry, restore, reset, and each puzzle tick:
  - `open` → the body is removed from the Matter world (or its collision mask
    is disabled);
  - `closed` → the body is present and collidable.
- `RoomPhysics` exposes `setGateOpen(gateId, open)` and `gateStates()`. It does
  not know puzzle node IDs, links, or win predicates.
- `RoomSimulation` exposes `gateStates` for the renderer. Display is a separate
  decision (ADR-0003).
- Latched gates stay open because the puzzle graph never emits a close for
  them. Non-latched gates close when the graph closes them.
- Gate closure does not teleport or respawn a player. If a body is added while
  a player overlaps it, Matter resolves the overlap; authors place closing
  gates behind the player, not on top of them.
- Gate open/closed state needs no new save field. It is already part of the
  puzzle run state and is reapplied on restore.
- One-way gates remain a logical latch/sequence cue. The upgrade does not add
  one-way collision surfaces.

## Consequences

**Easier:**

- 04's Ca²⁺ gate can actually block the bridge; 03/05 gates can block routes.
- Existing rooms remain valid until they opt in.
- Puzzle tests stay pure; physics tests cover gate bodies independently.

**Harder:**

- Every gate needs a body size and a floor-aligned placement decision.
- `GameRuntime` needs a single synchronization point after every state change.
- Closing gates can interact with carried props and player overlap; tests and
  authoring guidance are required.

**Constrained:**

- No gate body may be owned by `puzzle`.
- No dynamic gate dimensions or moving gate platforms in this upgrade.
- No one-way physical collision.
- No new save field for gate bodies.

## Alternatives considered

- **Make every puzzleGate solid automatically** — changes existing 03 behavior
  immediately and forces layout tests before content is ready. Rejected.
- **Use a sensor and teleport the player back** — feels like a fail state and
  violates the no-fail contract. Rejected.
- **Add a new gate/collision node type** — duplicates the existing gate node
  and room entity. Rejected.
- **Let the renderer own gate collision** — mixes presentation with physics and
  breaks headless tests. Rejected.
