# ADR-0007: Side-level map travel with a return snapshot

Status: Accepted

## Context

ADR-0046 makes the main path linear: finish a level debrief, load the next
`nextLevelIds` entry. The M2 design also has optional 01 and 02 reinforcement
levels, recommended after 03 and 04. The map already shows revealed nodes and
edges but cannot enter them. Full backtracking to completed main levels would
require a per-level state cache and a larger save migration.

## Decision

Map travel is limited to **side-level excursions** from a main level.

### Level kinds

- `level.kind` is optional: `"main"` (default) or `"side"`.
- Main levels use ADR-0046 linear progression.
- Side levels have no `nextLevelIds` and are not `pack.endLevelId`. They are
  entered only from the map.
- A side level must have a map edge from a revealed main level. The validator
  reports an orphan side level as a warning/issue.

### Travel and return

`GameRuntime.travelToSideLevel(levelId)` is the only new travel operation.

- Allowed only while the machine is in `level` or `map` (the map overlay) and
  the current level is `main`. Travel closes the map overlay before loading
  the side level.
- The target must be an authored `side` level, revealed on the map, and not the
  current level.
- Before entering, the runtime captures the current main level's
  `LevelRunSnapshot`: level ID, room ID, checkpoint, elapsed time, active P2,
  player bodies, prop bodies/props, and puzzle run states.
- The snapshot is stored as `RunSnapshot.returnTo`, saved, and the side level is
  entered fresh.
- On finishing the side level's debrief, the runtime records
  `debrief_completed`, restores the return snapshot exactly, clears
  `returnTo`, autosaves, and returns to the main level.
- The side level records its own `level_completed`; it never records
  `pack_completed`. Its evidence events remain in the global curriculum.
- If the player saves while in a side level, the save has the side level as
  current and the main level in `returnTo`. Restoring resumes the side; finish
  returns to the main snapshot.
- `returnTo` is cleared on a new run, pack completion, or entry to a main level.
  A side level cannot start another side excursion; it must return first.
- A side level is re-entered fresh after returning. Its puzzle state is not
  cached; its evidence and map reveal persist.
- No full backtracking into completed main levels in this upgrade.

### Map UI

- `MapView` exposes `travel` entries for eligible side levels: level ID, label,
  availability, and reason when unavailable.
- The map overlay renders keyboard-focusable travel controls. Selection calls
  `onMapTravel(levelId)`.
- The map remains informational for main levels. It does not replace the
  post-debrief next-level transition.
- Travel is disabled while the current level is a side level; the map explains
  that the player must finish and return first.

### Save

`RunSnapshot.returnTo` is the only new durable field. It is optional and
backward compatible; old saves have no side excursion. `LevelRunSnapshot` holds
only level-scoped state; progression, curriculum events, settings, and audio
state stay at the run level. Save schema 2.1 is defined by ADR-0008.

## Consequences

**Easier:**

- Optional 01/02 become real playable excursions without breaking the main
  path.
- Returning restores solved main-level state, positions, props, and puzzles.
- One side excursion has a bounded save shape; no per-level cache.

**Harder:**

- The runtime needs capture/restore of a level-scoped snapshot and two save
  branches.
- The map becomes an interactive surface with keyboard focus and availability
  rules.
- A side level cannot nest another excursion; that is a deliberate limit.

**Constrained:**

- No free map travel or main-level backtracking.
- No side-level chaining.
- No new evidence semantics; side-level evidence remains per level.
- No new persistent state beyond `returnTo`.

## Alternatives considered

- **Full per-level state cache** — supports full backtracking but requires a
  larger save schema and cache invalidation. Rejected for this upgrade.
- **Level select only after the run** — does not support the “recommended after
  03/04” in-run excursions. Rejected.
- **Replay main levels on return** — forces re-solving solved content and
  breaks the no-fail/flow promise. Rejected.
- **Defer map travel entirely** — leaves optional levels unreachable. Rejected.
