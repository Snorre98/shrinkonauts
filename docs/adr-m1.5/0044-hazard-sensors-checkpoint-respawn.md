# ADR-0044: Hazard sensors and checkpoint respawn

- **Status:** Accepted
- **Date:** 2026-10-26
- **Deciders:** Snorre
- **Related:** ADR-0005, ADR-0015, ADR-0016, ADR-0036, ADR-0040

## Context

ADR-0036 defines a `HAZARD` collision category: a static sensor that only
players collide with. ADR-0040 says a hazard respawns the player at the
checkpoint while puzzle state and prop positions persist. The M1.5 physics layer
declared the category and included it in the player mask, but no hazard bodies
were ever built. The acceptance criteria require a hazard respawn path under
the no-softlock rule.

## Decision

### Authoring

- A room entity of type `hazard` becomes a hazard sensor.
- Size comes from `components.body.width/height` when present; otherwise the
  hazard occupies one room tile.
- Position uses the same tile-to-world rule as other entities: the body's
  bottom edge sits at the entity's tile line.
- Authors must not place a hazard on a checkpoint or spawn tile. A hazard that
  overlaps a respawn point would loop.

### Physics

- Hazard bodies are static and `isSensor: true`.
- Category `HAZARD`, mask `PLAYER`. Solids, props, and other hazards do not
  collide with them.
- The player body keeps `HAZARD` in its mask.
- Detection uses a Matter query after the fixed physics step, not a second
  collision engine or a puzzle-graph sensor.

### Respawn

- If an active player body overlaps a hazard, the player respawns at its current
  checkpoint spawn.
- Velocity, dash time, and dash cooldown reset; puzzle state, evidence, and prop
  positions persist.
- The simulation emits a `hazard` gameplay cue. The runtime plays the checkpoint
  cue, shows "Back to the checkpoint", and autosaves.
- This is a recovery, not a fail state. There is no health, death, damage, or
  score penalty.

### Content

The Signal Ferry does not contain a hazard. The engine path is tested with a
synthetic room entity so M2 content can use hazards without changing the ferry
room design.

## Consequences

**Easier:**

- The no-softlock contract has a real hazard path.
- Hazard authoring is data-only and uses the existing body component.
- M2 rooms can place simple hazard volumes without new entity types.

**Harder:**

- Hazard placement needs an authoring check against checkpoints.
- A sensor landing on a respawn tile can loop; the rule is documented rather
  than silently corrected.

**Constrained:**

- No damage, health, death, or combat.
- No prop-hazard collision.
- No hazard bodies for gates, checkpoints, exits, scan targets, or receptors.

## Alternatives considered

- **Hazard as a puzzle zone** — would couple a world recovery to a specific
  puzzle graph and stop working outside puzzles. Rejected.
- **Hazard as a solid body** — blocks movement instead of respawning. Rejected.
- **Health and death** — explicitly outside the M1.5 non-goals.
- **Teleport to room spawn instead of checkpoint** — violates ADR-0015's
  checkpoint retry contract.
- **Add a hazard to the ferry** — the ferry room has no hazard in its design and
  the puzzle already teaches the intended failure modes. Rejected for M1.5.

## References

- [`../shrinkonauts/base-game/adr/0015-no-fail-state-checkpoint-retry.md`](../shrinkonauts/base-game/adr/0015-no-fail-state-checkpoint-retry.md)
- [`0036-matterjs-physics-boundary.md`](0036-matterjs-physics-boundary.md)
- [`0040-dynamic-prop-state-softlock-contract.md`](0040-dynamic-prop-state-softlock-contract.md)
