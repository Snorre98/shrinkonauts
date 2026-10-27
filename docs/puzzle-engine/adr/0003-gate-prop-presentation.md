# ADR-0003: Gate and prop presentation state

Status: Accepted

## Context

Gate sprites are static, and prop sprites are always visible even when a prop
is docked or should be cleared. The intended design describes a gate opening
onto a bridge, a muscle gate latching, a muscle lever contracting, and ACh
being cleared. Static sprites make those beats invisible; the player sees only
HUD toasts.

The scene already reads the runtime's room document and simulation every frame.
It should not import `PuzzleRuntime` or duplicate puzzle state.

## Decision

Presentation is derived from simulation state, never from puzzle internals.

- `RoomSimulation.gateStates` is a `Record<gateId, boolean>` maintained by
  `RoomPhysics`/`GameRuntime` when gate collision state changes.
- `RoomScene` synchronizes each `puzzleGate` sprite from `gateStates`:
  - optional `components.gate.closedSprite` and `components.gate.openSprite`
    select asset IDs;
  - if an asset ID is absent, the entity's `sprite` is used for both states;
  - the open fallback is a reduced-alpha/tinted version of the same sprite;
  - the closed state is the normal sprite.
- `RoomScene` hides props whose simulation state is `cleared`. `locked` props
  remain visible but are not pickable. Existing `free`, `carried`, `placed`,
  and `docked` rendering is unchanged.
- Presentation updates are immediate state swaps. They do not animate, tween,
  or delay the simulation. Reduced-motion users see the same state changes with
  no motion.
- Placeholder art is sufficient. No new final asset is required; optional
  open/closed sprite IDs can be added in M3.
- No save field is added. Gate state comes from the puzzle snapshot; prop state
  comes from the prop snapshot.

## Consequences

**Easier:**

- Gate open/close and ACh clearance become visible without a new UI surface.
- Art can replace placeholder sprites by adding asset IDs, not code.
- The scene remains a projection of the runtime; tests can assert simulation
  state without Phaser.

**Harder:**

- `RoomScene` needs a gate sync pass and a prop visibility rule.
- Gate sprite state and physical body state must stay synchronized; ADR-0002's
  single sync point is the source of truth.

**Constrained:**

- No animation timelines in this upgrade.
- No hard-coded colors, file paths, or media imports in the scene.
- No save state for presentation.

## Alternatives considered

- **Animate gates inside `puzzle`** — violates module boundaries and makes the
  pure evaluator depend on presentation timing. Rejected.
- **Only show state in the HUD** — leaves the physical world visually
  contradictory. Rejected.
- **Wait for M3 art** — the mechanics would still be invisible. Rejected.
- **Per-entity bespoke scene code** — not data-driven and not reusable.
  Rejected.
