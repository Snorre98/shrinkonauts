# ADR-0041: Save schema v2

- **Status:** Accepted
- **Date:** 2026-10-26
- **Deciders:** Snorre
- **Related:** ADR-0005, ADR-0015, ADR-0034, ADR-0035, ADR-0036, ADR-0038, ADR-0040

## Context

The M1 save stores progression, learning events, checkpoint id, active P2, and
two player positions. That is enough for a kinematic world. It cannot restore
a dynamic prop mid-carry, a puzzle graph mid-solve, or a body with velocity and
angle. Restoring from a checkpoint alone would lose a mid-puzzle solve and feel
like a reset.

M1.5 changes the room geometry and the entity/save model. Old saves are not
compatible and cannot be migrated reliably: the old positions may be inside a
new wall, and old gate evidence no longer matches the level.

## Decision

Adopt **save schema v2**. V1 saves reset the level with a toast.

### Shape

```ts
interface RunSnapshotV2 {
  schemaVersion: "2.0";
  packId: string;
  packVersion: string;
  contentVersion: string;
  levelId: string;
  roomId: string;
  status: "playing" | "debrief" | "complete";
  checkpointId: string | null;
  players: {
    activeP2: boolean;
    bodies: Record<"p1" | "p2", BodySnapshot>;
  };
  progression: {
    abilities: string[];
    flags: Record<string, boolean>;
    solvedGates: string[];
    revealedNodes: string[];
    revealedEdges: string[];
  };
  curriculum: { events: LearningEvent[] };
  world: {
    bodies: Record<string, BodySnapshot>;
    props: Record<string, PropState>;
    puzzles: Record<string, PuzzleRunState>;
  };
  audio: { muted: boolean };
  savedAt: string;
}
```

`BodySnapshot` contains position, velocity, angle, angular velocity, and
sleeping. `PropState` contains `free | carried | placed | docked`,
`carriedBy`, `placedOn`, and the body id. `PuzzleRunState` contains node
states, counters, timers, pulse queue, latched solved flag, and evidence
counters.

### Rules

- Save is best-effort and must never interrupt play.
- `contentVersion` changes reset to the level checkpoint, not to a new run.
- V1 or unknown schema versions reset the level with a toast; settings are
  preserved.
- Tether policy is derived from room and active puzzle, not saved.
- Restore rebuilds Matter bodies from snapshots; it never trusts serialised
  engine internals.
- Restore is idempotent: loading the same save twice produces the same world
  and puzzle state.
- Mid-carry saves restore the constraint and `carriedBy`; if the carrier is
  inactive, the prop drops at its saved position.
- Mid-air and mid-dash saves restore body velocity and cooldown timers.
- A solved puzzle restores latched; the exit stays open.
- Debrief status restores the debrief overlay; complete status restores the
  completion state.

### Migration

- V1 → V2: reset the current level, keep settings, show
  "Save format updated — level restarted".
- Pack version mismatch: reset to checkpoint, not a new run.
- Unknown/ corrupt save: new run, keep settings.
- Content version mismatch: reset to checkpoint and keep progression/evidence.

## Consequences

**Easier:**

- A player can quit mid-puzzle and resume.
- Physics and puzzle state have one explicit serialisation contract.
- Version drift is visible and recoverable.
- The headless harness can save and restore without a browser.

**Harder:**

- The save file is larger and must be validated field by field.
- Every new body or prop must have a stable id.
- Restore must rebuild constraints and collision filters, not just positions.
- Tests need fixtures for mid-carry, placed, docked, and mid-air states.

**Constrained:**

- No save schema v1 compatibility beyond reset.
- No serialised Matter world.
- No per-player ability state.
- No tether policy in the save.

## Alternatives considered

- **Checkpoint-only save** — loses mid-puzzle progress and feels punitive.
  Rejected.
- **Replay input** — fragile across content changes and physics tuning.
  Rejected.
- **Best-effort V1 migration** — old positions and evidence no longer match
  the reworked room. Rejected.
- **Save only positions, rebuild props from spawn** — loses carry/place state
  and can duplicate or delete the tracer. Rejected.

## References

- [`../shrinkonauts/base-game/adr/0005-fixed-timestep-serializable-state.md`](../shrinkonauts/base-game/adr/0005-fixed-timestep-serializable-state.md)
- [`../shrinkonauts/base-game/contracts/pack-schema.md`](../shrinkonauts/base-game/contracts/pack-schema.md)
- [`0035-ecs-shaped-body-prop-model.md`](0035-ecs-shaped-body-prop-model.md)
- [`0036-matterjs-physics-boundary.md`](0036-matterjs-physics-boundary.md)
- [`0038-puzzle-scoped-tether-policy.md`](0038-puzzle-scoped-tether-policy.md)
- [`0040-dynamic-prop-state-softlock-contract.md`](0040-dynamic-prop-state-softlock-contract.md)
