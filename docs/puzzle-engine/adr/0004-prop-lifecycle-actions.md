# ADR-0004: Prop lifecycle states and unlock/clear actions

Status: Accepted

## Context

Props currently move through `free`, `carried`, `placed`, and `docked`. The
intended design needs two additional beats:

- 02's spindle gate releases a sensory token that the player can then pick up;
- 04's AChE timer clears the ACh packet after the muscle response;
- 05 may release or consume sensory/motor tokens as the route advances.

Physical gates alone can hide a token behind an alcove, but the design also
needs a dataflow beat for clearance and for token release. There is no
prop-clear or prop-release action today.

## Decision

Extend the prop lifecycle with two explicit states and two dataflow actions.

### States

| State | Meaning |
|---|---|
| `locked` | Present and visible, static, not pickable |
| `free` | Dynamic, gravity on, pickable |
| `carried` | Constraint-held |
| `placed` | Static at a receptor snap or plate socket, retrievable |
| `docked` | Bound to a receptor after a valid pulse; terminal until reset |
| `cleared` | Hidden from interaction and rendering; not collidable |

A `prop` node may declare `initial: "free" | "locked"`; the default is `free`.
A prop's initial state is applied on level entry, even when its puzzle is not
yet activated, so a locked token cannot be picked up before activation.

### Link actions

Two link types are added:

- `unlock` — source may be a gate, relay, timer, receptor, trigger, plate,
  zone, or counter; target must be a prop. It changes `locked` to `free` and makes the
  body dynamic. It is a no-op for other states. The link type is `unlock`, not
  `release`, because `release` already names the plate-release event link.
- `clear` — source may be a gate, relay, timer, receptor, trigger, plate,
  zone, or counter; target must be a prop. It changes any non-cleared state to
  `cleared`, hides the body, and disables collision. It is a no-op when already
  cleared.

`PuzzleRuntime` emits `propReleased` or `propCleared`. `GameRuntime` applies
the event to `RoomPhysics`, which owns the body. Puzzle state and world state
therefore change in one orchestrated step, not in two independent writers.

### World behavior

- `RoomPhysics` adds `releaseProp`, `clearProp`, and
  `setPropState(propId, state)` for entry/reset/restore synchronization.
- `pickUp` rejects `locked` and `cleared`; `placeProp`/`throwProp` reject
  `cleared`.
- A cleared prop is removed from the display list and from collision. A locked
  prop is static, gravity-off, and may be hidden behind a physical gate.
- Reset restores the prop's initial state (`free` or `locked`) and its spawn.
  A cleared prop becomes its initial state again.
- Out-of-bounds recovery applies only to `free`/`carried` props; cleared props
  have no body to recover.

### Persistence and replay

- `PropSnapshot.state` accepts `locked` and `cleared`; older snapshots remain
  valid. This is save schema 2.1 (ADR-0008).
- `replaySolution` applies `propReleased`/`propCleared` events to its mock
  props so an authored trace can wait for a timer or trigger.
- No new evidence counter is required. Unlock/clear are process state, not a
  score.

## Consequences

**Easier:**

- The spindle release and AChE clearance are explicit dataflow beats.
- A token can exist before it is available without a bespoke engine branch.
- Reset and save/restore have one lifecycle model.

**Harder:**

- More prop states mean more transition tests and save compatibility cases.
- A locked prop must be visible but not pickable; the scene and physics must
  agree on that state.

**Constrained:**

- No arbitrary prop spawning or destruction.
- No prop ownership transfer.
- No cleared prop recovery; reset is the recovery path.
- No new prop state without a new ADR.

## Alternatives considered

- **Physical gate/alcove release only** — works for 02 but cannot clear ACh or
  express a dataflow release. Rejected as the only mechanism.
- **Clear only; no locked state** — leaves spindle release as a spatial hack and
  cannot keep a token unavailable before activation. Rejected.
- **Use `docked` for locked** — conflates receptor binding with pre-release
  availability and breaks reset semantics. Rejected.
- **Delete props from the save when cleared** — loses reset/restore state and
  makes replay nondeterministic. Rejected.
