# ADR-0019: Request-gated shared help surfaces and authored info areas

Status: Accepted
Date: 2026-11-02
Deciders: Snorre
Related: ADR-0009, ADR-0010, ADR-0012, ADR-0043
Amends: ADR-0009 §7.6's automatic stuck-affordance trigger

## Context

The M1.75 feedback layer added a stuck safety net. After a bounded period with
no puzzle-state change, the runtime surfaced a shared `hudStatus` affordance:

> Need a nudge? Show hint / Reset puzzle

The intent was to keep a stuck run recoverable without requiring a page reload.
In practice the surface appears without the player asking for help. It can
interrupt play, competes with event feedback, and stays visible until the player
acts.

A trigger-area dwell rule was considered and rejected: it is still passive, and
players who are not stuck can trip it accidentally. The player should decide
when shared help appears.

At the same time, `scan` already means "inspect and learn". Both players have it
in solo and co-op. Reusing it avoids adding a key to an already crowded control
map.

## Decision

### 1. Shared help is request-only

The shared help affordance is never surfaced by an idle, stuck, or proximity
timer. It appears only after a deliberate information request.

- The request verb is the existing `scan` action (`Q` for P1, `.` for P2).
- No new input key or action is introduced.
- The old automatic stuck threshold and its timer are removed.
- The pause-menu hint and reset controls remain available as the fallback.

Scan precedence:

1. A scan target with an unrevealed concept in range is scanned.
2. Otherwise, if the requesting player is inside an authored info area and the
   active puzzle is unsolved, the shared help surface is requested.
3. Otherwise, the existing "Nothing to scan here" or "Already in your concept
   log" feedback is emitted.

A known scan target does not block the help request: the player may stand near
an already-relevant scan target and still ask for help.

### 2. Info areas are authored room data

An info area is a rectangular relevance zone in the room document:

```ts
interface RoomInfoArea {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  puzzleId?: string;
  ttlTicks?: number;
}
```

Rules:

- coordinates use tile units, matching room triggers and entities;
- `puzzleId` is optional and defaults to the active puzzle;
- `ttlTicks` is optional and overrides the default help-surface lifetime;
- areas are invisible relevance zones, not collision and not save state;
- areas must lie inside the room and reference a puzzle authored by the level.

The area decides relevance. A player outside an info area cannot request the
shared help surface.

### 3. The help surface is shared and temporary

The requested surface is the existing shared help affordance:

- `owner: "shared"`;
- `audience: "both"`;
- HUD bottom anchor;
- choices for "Show hint" and "Reset puzzle";
- soft focus and free movement.

It is transient:

- `sticky: false`;
- default TTL of 300 fixed ticks (5 seconds at 60 Hz);
- requesting again refreshes the TTL;
- choosing a hint or reset, cancelling, solving the puzzle, starting a
  conversation, entering the debrief, or changing levels dismisses it;
- when it expires, it does not reappear automatically.

Both players may request the surface, and either player may operate it. Each
successful request increments the puzzle's `helpRequests` diagnostic counter; it
is not a learning-evidence event.

### 4. Surface TTL is honoured by the feedback director

The feedback lifetime contract already distinguishes sticky from transient
surfaces. The director now enforces it for runtime-owned surfaces:

- a non-sticky surface receives TTL bookkeeping at upsert time;
- the lifetime system decrements the TTL in fixed ticks;
- expiry despawns the surface and cancels its effects;
- sticky projected surfaces are unaffected.

Cues keep their existing cause-based deduplication and TTL behaviour.

### 5. The revealed hint keeps ADR-0043 semantics

The affordance is temporary. Choosing "Show hint" still reveals the next
authored hint in the dedicated HUD line, and the most recent hint stays visible
as decided by ADR-0043. The information request changes when the affordance is
shown, not how hints are authored or recorded.

## Consequences

**Easier:**

- Players control when shared help appears.
- The play area is not interrupted by an automatic "Need a nudge?" panel.
- Info-area placement is data-driven and validatable.
- `scan` remains the single information verb.
- Surface TTL is now a real director invariant rather than unused metadata.

**Harder:**

- Content authors must place info areas around puzzle interaction bands.
- Scan now has two outcomes; precedence must stay explicit and tested.
- The help surface can expire before a player selects a choice. Pressing scan
  again refreshes it.
- The old stuck timer, tests, and documentation must be removed rather than
  kept alongside the new path.

**Constrained:**

- No automatic shared help from idle, stuck, or proximity.
- No new input key for information requests.
- No permanent help surface.
- No info area outside the room bounds or referencing an unknown puzzle.
- No information request without a player inside an info area.

## Alternatives considered

- **Keep the automatic stuck affordance.** Reliable but interruptive and exactly
  the passive behaviour this decision removes. Rejected.
- **Trigger help by standing in an area for a dwell time.** Still passive and
  easy to trigger accidentally. Rejected.
- **Add a dedicated help key.** The P2 cluster is crowded and ADR-0043 rejected a
  new hint key for the same reason. Rejected.
- **Show the hint text immediately on request.** Removes the player's choice
  between a hint and a reset, and makes accidental scans costly. Rejected.
- **Runtime-only TTL timer.** Duplicates the feedback lifetime model and leaves
  surface lifetime inconsistent with cues. Rejected.
- **No info areas; request from anywhere.** Makes the request context-free and
  lets players pull help before they have engaged with the puzzle. Rejected.

## References

- [`0009-feedback-ecs-substrate.md`](0009-feedback-ecs-substrate.md)
- [`0010-anchored-feedback-surfaces.md`](0010-anchored-feedback-surfaces.md)
- [`0012-capability-feedback-coverage.md`](0012-capability-feedback-coverage.md)
- [`../../adr-m1.5/0043-puzzle-feedback-hints-cooldown.md`](../../adr-m1.5/0043-puzzle-feedback-hints-cooldown.md)
