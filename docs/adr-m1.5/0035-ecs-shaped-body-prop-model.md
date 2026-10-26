# ADR-0035: ECS-shaped `body` + `prop` entity model

- **Status:** Accepted
- **Date:** 2026-10-26
- **Deciders:** Snorre
- **Related:** ADR-0005, ADR-0010, ADR-0023, ADR-0036, ADR-0040

## Context

M1 entities are a single object with a `type` and a few optional fields. That
works for agents, scan targets, gates, and checkpoints. It does not work for a
physical object that needs a transform, a collider, mass, friction, rotation,
carry state, and puzzle identity. The tracer must not become a special case in
the physics layer.

The project also wants to move toward a component model without a flag-day
rewrite of every existing behaviour.

## Decision

New physical content uses an **ECS-shaped entity/component model**. The model
is deliberately partial: new behaviours use components, legacy behaviours are
grandfathered.

### `body` entity

A `body` entity is the physics object. It has no sprite and no gameplay
identity. It owns:

- world transform (position, angle);
- `physics` component: dynamic/static/kinematic, gravity, mass, friction,
  restitution, fixed rotation, sleeping;
- `collider` component: width, height, shape, collision category and mask.

### `prop` entity

A `prop` entity is the visual and gameplay identity. It references a body:

```json
{
  "id": "tracer-prop",
  "type": "prop",
  "x": 12,
  "y": 18,
  "sprite": "sprite.prop.tracer",
  "components": {
    "prop": {
      "bodyId": "body-tracer",
      "tags": ["tracer"],
      "shape": "triangle",
      "carryable": true,
      "placeable": true,
      "pushable": true,
      "throwable": true
    }
  }
}
```

A puzzle document references the `prop` id, never the `body` id. The body is an
implementation detail.

### Components

New behaviours expose an optional `components` object. M1.5 defines:

- `body` — physics and collider;
- `prop` — identity, tags, shape, interaction flags;
- `receptor` — accepted tag/shape and snap point;
- `pulseSource` — ability and terminal identity;
- `gate` — logical gate identity for a visual door;
- `plate`, `zone`, `relay`, `timer`, `counter`, `trigger` — optional visual or
  debug components. Data-only puzzle nodes do not need an entity.

Existing `agent`, `movingPlatform`, `hazard`, `pickup`, `trigger`, `gate`,
`checkpoint`, `scanTarget`, and `decor` entities keep their current fields.
They are not rewritten in this milestone.

### Avatar bodies

Players are not `body` entities in the pack. They are runtime-created dynamic
bodies with the same physics API. This avoids requiring every level to author
player bodies and keeps party composition dynamic.

## Consequences

**Easier:**

- The tracer is one prop among many; another level can define a different
  prop with different physics and flags.
- Save, reset, and rendering have one prop path.
- A future full ECS migration can move legacy behaviours incrementally:
  behaviour first, then component split, then data migration.
- Puzzle nodes can be data-only, so a headless fixture needs no room entities.

**Harder:**

- Every physical prop needs two entity ids and a validated reference.
- The renderer must follow a body from its prop rather than owning position.
- Some duplication exists until legacy behaviours are migrated.
- Authors must understand the difference between the body and the prop.

**Constrained:**

- No new legacy-style fields on `RoomEntity` for physical behaviour.
- No prop without a body; no body referenced by two props.
- The puzzle document never references a body id.
- Full ECS is not part of M1.5. It follows this pattern later.

## Alternatives considered

- **A `physics` trait on any entity (O2)** — literal "property of an object",
  but every behaviour's update/render/save path must handle a body. Agents and
  gates could accidentally become rigid bodies. Rejected.
- **A single `prop` behaviour with an embedded physics block (O1)** — simpler,
  but it conflates the physics object with the gameplay object and makes a
  later ECS split harder. Rejected in favour of O3.
- **Full ECS now (O4)** — rewrites the entity model and every existing
  behaviour. Too large for M1.5.
- **Keep the tracer as a special case** — fails the "property of an object"
  requirement. Rejected.

## References

- [`../shrinkonauts/base-game/contracts/pack-schema.md`](../shrinkonauts/base-game/contracts/pack-schema.md)
- [`../shrinkonauts/base-game/adr/0005-fixed-timestep-serializable-state.md`](../shrinkonauts/base-game/adr/0005-fixed-timestep-serializable-state.md)
- [`0036-matterjs-physics-boundary.md`](0036-matterjs-physics-boundary.md)
- [`0040-dynamic-prop-state-softlock-contract.md`](0040-dynamic-prop-state-softlock-contract.md)
