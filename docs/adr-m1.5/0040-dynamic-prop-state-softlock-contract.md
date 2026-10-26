# ADR-0040: Dynamic prop state and softlock contract

- **Status:** Accepted
- **Date:** 2026-10-26
- **Deciders:** Snorre
- **Related:** ADR-0015, ADR-0016, ADR-0035, ADR-0036, ADR-0038, ADR-0041

## Context

A carried object can be dropped in a pit, thrown out of the room, left on the
wrong receptor, or stranded when a co-op partner leaves. A physics puzzle
without a recovery contract will softlock. The M1 no-fail-state rule applies:
the player must always be able to retry without reloading or losing evidence.

## Decision

Props have an explicit lifecycle and a recovery contract.

### States

| State | Meaning |
|---|---|
| `free` | Dynamic body, gravity on, normal collision |
| `carried` | Constraint-held by a player, gravity off, player-prop collision off, world collision on |
| `placed` | Static at a receptor snap point, still retrievable |
| `docked` | Bound to a matching receptor after a valid pulse; puzzle state latched |

### Carry

- Hold point: player body centre plus `facing * 24 px`, vertical `-8 px`.
- Constraint: length 0, stiffness 0.9, damping 0.1.
- While carried: gravity off; player-prop collision off; solid/prop collision
  stays on. A prop cannot be carried through a wall.
- Mass remains physical; a heavy prop can pull on the player through the
  constraint. The ferry tracer uses mass 0.2.
- Fixed rotation for the tracer; other props may rotate.

### Transitions

- Pick up: create constraint, disable player-prop collision, set `carriedBy`.
- Drop: remove constraint, restore gravity and collision, leave at current
  position.
- Place: remove constraint, restore collision, set body static at the receptor
  snap point, record `placedOn`.
- Throw: remove constraint, restore gravity and collision, apply an impulse.
- P2 leaves while carrying: drop at the current position. No ownership
  transfer.
- Reset: remove constraints, return props to spawn, restore dynamic state,
  clear receptor bindings.
- Checkpoint/respawn: props are not teleported with the player; the puzzle
  reset is the recovery path.

### Softlock prevention

1. A prop that leaves the room bounds or falls below the room is returned to
   its spawn after a short delay, with a toast. This is a recovery, not a fail
   state.
2. A prop placed on a wrong receptor remains retrievable. The receptor rejects
   the pulse but does not consume the prop.
3. A prop placed on the correct receptor but not yet pulsed is retrievable.
4. The pause menu exposes **Reset puzzle** while a puzzle is active. Reset is
   always available after activation.
5. A solved puzzle is latched. Removing or resetting the prop does not close
   the exit or revoke rewards.
6. Hazards respawn the player at the checkpoint; the puzzle state and prop
   positions persist unless the player chooses reset.
7. The exit is a flag gate; it cannot be entered by a prop or a physics glitch.
   Only an active player body can trigger it.

### Evidence

Counters include `pickups`, `drops`, `placements`, `throws`, `pulses`,
`wrongReceptor`, `wrongSide`, and `resets`. Counters survive reset so the
export shows the process. They are not used to fail the player.

## Consequences

**Easier:**

- Every failure has a recovery path.
- The player can experiment with the wrong receptor without losing the tracer.
- P2 leaving cannot delete a prop from the world.
- Save/restore has a small, explicit prop state model.

**Harder:**

- The world needs out-of-bounds detection and a return timer.
- Reset must coordinate the physics world, puzzle graph, and UI.
- The "placed" state must remain retrievable while locking the body in place.
- Carrying a prop through a narrow gap needs collision tuning.

**Constrained:**

- No destructible props in M1.5.
- No prop ownership transfer.
- No hidden fail state on a bad placement.
- No solved-gate rollback.

## Alternatives considered

- **Carry as a kinematic attachment** — stable but no weight or swing; not
  full physics. Rejected.
- **Weld the prop to the player** — snag-prone and can push the player through
  geometry. Rejected.
- **Velocity-matching carry** — laggy and hard to tune. Rejected.
- **No out-of-bounds recovery** — softlock risk. Rejected.
- **Reset only on room re-entry** — too slow and loses evidence. Rejected.
- **Consume the prop on the wrong receptor** — a fail state in disguise.
  Rejected.

## References

- [`../shrinkonauts/base-game/adr/0015-no-fail-state-checkpoint-retry.md`](../shrinkonauts/base-game/adr/0015-no-fail-state-checkpoint-retry.md)
- [`../shrinkonauts/base-game/adr/0016-local-coop-p0.md`](../shrinkonauts/base-game/adr/0016-local-coop-p0.md)
- [`0035-ecs-shaped-body-prop-model.md`](0035-ecs-shaped-body-prop-model.md)
- [`0036-matterjs-physics-boundary.md`](0036-matterjs-physics-boundary.md)
- [`0041-save-schema-v2.md`](0041-save-schema-v2.md)
