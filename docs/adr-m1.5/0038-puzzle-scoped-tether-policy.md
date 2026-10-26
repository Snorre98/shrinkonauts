# ADR-0038: Puzzle-scoped tether policy

- **Status:** Accepted
- **Date:** 2026-10-26
- **Deciders:** Snorre
- **Related:** ADR-0016, ADR-0017, ADR-0036, ADR-0041

## Context

The M1 tether is a 560 px horizontal position clamp. It keeps the co-op camera
from losing a player, but it prevents the Signal Ferry's core spatial move:
one player carries the tracer across the cleft while the other stays at the
pulse terminal. A global tether change would break every other room; a dynamic
per-phase tether would add save complexity and unpredictable puzzle state.

## Decision

The tether is a **static, puzzle-scoped policy** with a room default and an
optional puzzle override.

### Policy

- Room default: `normal` unless authored otherwise.
- Puzzle override: `normal | stretch | off`.
- `normal`: length 560 px.
- `stretch`: length 1150 px.
- `off`: constraint disabled.
- No other values. The validator rejects unknown policies.
- The policy is resolved when the room/puzzle activates and is not mutated by
  puzzle phase. A puzzle that needs a different policy must end and another
  begin.

### Physical model

- Soft Matter distance constraint between the two player bodies.
- Stiffness 0.05–0.15; damping 0.1.
- The constraint acts only when the distance exceeds the policy length; it
  does not push players apart when they are closer.
- Disabled when P2 is inactive.
- Created on P2 join, destroyed on P2 leave, recreated on restore from the
  resolved policy.

### Scope guard

`off` is allowed only when the puzzle is confined to one screen (a 1280 × 720
viewport at the current camera). The co-op camera must still frame both
players. If players separate near opposite room edges and the camera cannot
frame them, the puzzle is invalid; author it as a smaller area or use
`stretch`.

### Save

The policy is **derived**, not saved. Save stores positions and body state; on
restore the room default and the active puzzle id are enough to recreate the
constraint. This avoids a save field that can drift from content.

## Consequences

**Easier:**

- A puzzle can separate players without changing the co-op tether globally.
- The policy is visible in content and validated.
- Save/restore is simpler: no dynamic tether state.
- The camera contract stays predictable.

**Harder:**

- A puzzle cannot tighten or release the tether mid-solve.
- `off` needs a one-screen authoring discipline.
- Restoring a mid-puzzle save must recreate the constraint from content, not
  from the snapshot.

**Constrained:**

- No per-phase tether animation or scripted tether events.
- No tether policy outside the enum.
- No tether save field.

## Alternatives considered

- **Room-only policy** — cannot separate the ferry while keeping the room's
  default. Rejected.
- **Dynamic per-phase policy** — expressive, but more state, more save fields,
  and unclear failure modes. Rejected.
- **Global tether change** — breaks M1 co-op and other rooms. Rejected.
- **Hard constraint** — yanks players and breaks platforming. Rejected.
- **Camera-only tether** — players separate freely everywhere; not the current
  contract. Rejected.
- **Position clamp** — fights Matter and is not a physical constraint.
  Rejected.

## References

- [`../shrinkonauts/base-game/adr/0017-coop-camera-tether.md`](../shrinkonauts/base-game/adr/0017-coop-camera-tether.md)
- [`../shrinkonauts/base-game/adr/0005-fixed-timestep-serializable-state.md`](../shrinkonauts/base-game/adr/0005-fixed-timestep-serializable-state.md)
- [`0036-matterjs-physics-boundary.md`](0036-matterjs-physics-boundary.md)
- [`0041-save-schema-v2.md`](0041-save-schema-v2.md)
