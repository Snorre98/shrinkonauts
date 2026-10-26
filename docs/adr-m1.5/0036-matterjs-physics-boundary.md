# ADR-0036: Matter.js physics boundary and full-physics players

- **Status:** Accepted
- **Date:** 2026-10-26
- **Deciders:** Snorre
- **Related:** ADR-0004, ADR-0005, ADR-0015, ADR-0016, ADR-0017, ADR-0023, ADR-0035, ADR-0038, ADR-0040, ADR-0041

## Context

The M1 world is a custom kinematic simulation. Players are axis-aligned boxes;
collisions are resolved by hand; the tether is a horizontal position clamp.
M1.5 needs pushing, carrying, placing, standing on props, object-object
collision, rotation, and a physical tether. Extending the hand-rolled resolver
would recreate a rigid-body engine inside the project.

The runtime boundary must survive. `src/game/runtime.ts` is pure and testable
without Phaser or a browser. It cannot import Matter.js.

## Decision

Use **Matter.js directly in `src/world`** as the physics engine. Phaser remains
a renderer.

### Boundary

- `src/world/physics.ts` owns the Matter engine, bodies, constraints, collision
  filters, fixed step, and body snapshots.
- `src/world/simulation.ts` adapts player intents to the character controller,
  builds/restores bodies, and returns a pure `WorldSnapshot` plus cues.
- `src/game/runtime.ts` consumes the snapshot and never imports Matter or
  Phaser.
- `src/puzzle` consumes an even narrower pure snapshot; it never imports the
  physics module.

### Full-physics players

Players are dynamic bodies, not kinematic boxes.

- Body: 28 × 44, fixed rotation, zero friction at the feet, dynamic.
- Controller: **force-based** (PC2). Movement is acceleration toward a target
  speed, not direct velocity assignment.
- Movement target: 260 px/s; ground acceleration reaches target in ~0.08 s;
  ground deceleration stops in ~0.06 s.
- Jump: 620 px/s impulse, gravity 1900 px/s², maximum fall 1200 px/s.
- Dash: 620 px/s for 0.16 s, 0.6 s cooldown.
- External pushes are not cancelled. Movement force applies only up to the
  target speed in the input direction; anything faster is left to Matter and
  friction.
- Ground detection uses a foot query against solids, not a guess from vertical
  velocity.

Props can push players, players can push props, players can stand on props.

### Collision layers

Four categories:

| Layer | Category | Mask |
|---|---|---|
| `SOLID` | static terrain | `PLAYER \| PROP` |
| `PLAYER` | player bodies | `SOLID \| PROP \| HAZARD` |
| `PROP` | prop bodies | `SOLID \| PLAYER \| PROP` |
| `HAZARD` | sensor volumes | `PLAYER` |

Players pass through each other. Props collide with solids, players, and other
props. Hazards are sensors. Gates, checkpoints, exits, scan targets, and
receptors stay runtime proximity checks; they do not become bodies.

### Fixed step and determinism

- Physics advances at 1/60 s with a bounded accumulator.
- The runtime tick order is: input → actions → puzzle graph from the previous
  snapshot → world commands → fixed physics step → world snapshot/events →
  puzzle win/evidence → proximity checks → UI/cues.
- Save stores body transforms, velocities, angles, and sleeping state; restore
  rebuilds bodies rather than serialising Matter internals.

### Tether and carry

Both are Matter constraints, not position clamps:

- tether: soft distance constraint, policy-driven length (ADR-0038);
- carry: stiff zero-length constraint from the player's hold point to the
  prop, with gravity and player-prop collision disabled while carried
  (ADR-0040).

### Performance

Static tiles are merged into horizontal solid runs. A 40 × 23 room with two
players, a handful of props, and one tether must hold 60 fps. Rotation and
stacking are enabled but not required by the ferry content.

## Consequences

**Easier:**

- Rigid-body behaviour is delegated to a mature engine.
- The tether, carry, and pushing become physical rather than scripted.
- Headless tests can construct a Matter world without Phaser.
- The pure runtime and puzzle graph stay engine-agnostic.

**Harder:**

- Every M1 movement behaviour must be re-baselined.
- The player controller must be tuned against Matter's units.
- Saves must capture body state, and restore must be idempotent.
- Debugging spans two coordinate conventions (feet vs body centre).

**Constrained:**

- No Matter import in `src/game`, `src/puzzle`, `src/ui`, or `src/pack`.
- No per-level physics engine choice.
- No kinematic player shortcut for content that needs pushing or standing on
  props.
- Physics runs on a fixed step; render interpolation is a later concern.

## Alternatives considered

- **Phaser Matter plugin (E2)** — easier rendering, but physics lives inside
  the scene and the headless boundary weakens. Rejected.
- **Planck.js (E3)** — capable, but more integration work and less familiar.
  Rejected.
- **Custom rigid-body engine (E4)** — full control, but rotation, stacking,
  constraints, and object-object collision are a large implementation.
  Rejected.
- **Kinematic players with dynamic props (hybrid)** — protects M1 movement but
  cannot deliver the chosen full-physics contract. Rejected.
- **Velocity-driven controller (PC1)** — preserves feel, but the chosen
  contract is force-based. Rejected.
- **Post-step tether clamp** — fights Matter and is not a constraint.
  Rejected.

## References

- [`../shrinkonauts/base-game/adr/0004-engine-agnostic-core-phaser-adapter.md`](../shrinkonauts/base-game/adr/0004-engine-agnostic-core-phaser-adapter.md)
- [`../shrinkonauts/base-game/adr/0005-fixed-timestep-serializable-state.md`](../shrinkonauts/base-game/adr/0005-fixed-timestep-serializable-state.md)
- [`../shrinkonauts/base-game/adr/0017-coop-camera-tether.md`](../shrinkonauts/base-game/adr/0017-coop-camera-tether.md)
- [`0038-puzzle-scoped-tether-policy.md`](0038-puzzle-scoped-tether-policy.md)
- [`0040-dynamic-prop-state-softlock-contract.md`](0040-dynamic-prop-state-softlock-contract.md)
- [`0041-save-schema-v2.md`](0041-save-schema-v2.md)
