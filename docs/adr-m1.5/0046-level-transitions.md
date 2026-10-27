# ADR-0046: Level transitions after the debrief

- **Status:** Accepted
- **Date:** 2026-10-27
- **Deciders:** Snorre
- **Related:** ADR-0003, ADR-0008, ADR-0011, ADR-0012, ADR-0039, ADR-0041, ADR-0042, ADR-0045

## Context

The M1.5 runtime records `level_completed` and opens a debrief whenever a player
reaches a room exit. `finishDebrief()` then moves to `complete`. The level
manifest's `nextLevelIds` and the room exit's `toLevelId` were parsed and
validated, but the runtime never used them to load another level.

That was harmless while the pack had one authored level. M2 now splits OBJ-2
across `03-nerve-forest` and `04-muscle-effector`. A data-only 04 package can
pass the validator's graph reachability and a standalone smoke boot, but a
player cannot walk from 03 into 04. FR-11 requires level transitions, so this
is an engine gap, not a content omission.

There is a second gap behind it: `RoomScene` builds its tiles, background,
entities, and prop sprites from `runtime.roomDocument` once in `createWorld()`.
Swapping `GameRuntime.room` without rebuilding the scene would leave the 03
visuals on screen while the runtime simulated 04. A runtime-only transition is
not playable.

## Decision

### Transition point

The room exit remains the level-completion trigger, and each level keeps its own
debrief. The transition happens only after the player finishes that debrief, so
the level's teach-back evidence is recorded before the next level starts.

`finishDebrief()`:

1. Validates that every prompt has a non-empty answer (existing behaviour).
2. Records `debrief_completed` for the current level.
3. Resolves the next level:
   - If the current level is `pack.endLevelId`, enter `complete` and record
     `pack_completed` once.
   - Otherwise take the first `nextLevelIds` entry that exists in
     `content.levels` and is not the current level, and enter it with
     `enterLevel(nextId, undefined, { fresh: false })`.
   - If no authored next level exists, enter `complete` without recording
     `pack_completed` and show an "end of authored content" toast. This is a
     graceful fallback; the validator reports the missing forward reference.
4. Autosaves the new level through the existing `enterLevel` path.

`nextLevelIds` is authoritative for progression. The room exit's `toLevelId`
remains a map/forward hint and is not used to choose the level. Linear
progression is the M2 scope; branching exits or multiple next levels need a new
ADR.

### Entering the next level

`enterLevel` already rebuilds the room simulation and puzzle runtimes. For a
transition it also:

- preserves progression, curriculum events, `activeP2`, and settings;
- resets level-scoped runtime state: activated puzzles, hint index, dialogue,
  gate, fired triggers, exit-warning timer, and `debriefAnswers`;
- sets `checkpointId` to the new room's first checkpoint and places both
  players there;
- records `level_started` and `room_entered`;
- reveals the new level's map node;
- re-resolves the room's tether policy from the new level's active puzzle;
- autosaves with the new `levelId`.

Resetting `debriefAnswers` is required because debrief prompts are derived from
the objective id. 03 and 04 share `prompt-obj-2`, so without the reset the 04
debrief would inherit 03's answer and could be finished without a second
teach-back. Evidence events are not reset.

### Room-scene rebuild

The runtime stays DOM/Phaser-free. `GameRuntime` gets an optional
`onLevelChange(levelId)` port, called after any level entry that can happen
after boot (transition, restart, new run). Initial boot enters its level before
the scene exists and does not need the notification.

`platform/boot` wires the port to restart the room scene. The restarted scene
reads the runtime's new `roomDocument`, rebuilds tiles, background, entities,
props, and players, and resets its per-room display maps. Pack assets are
already preloaded for every authored room, so no per-level `AssetLoad` state is
introduced. The boot's `onReady` writes `canvas.dataset.roomId` so the browser
test can prove that the canvas rebuilt for the new room.

### Save and restore

No save field is added. The run already stores `levelId`, `roomId`,
`checkpointId`, progression, events, bodies, props, and active puzzle state.

- A transition autosaves the new level; reloading resumes that level.
- A save taken in a non-final debrief reopens that debrief; finishing it
  transitions.
- A save taken at `complete` reopens the complete state.
- Version mismatches keep the existing ADR-0045 recovery path.

### End of pack

`pack_completed` moves from the final exit to the successful finish of the final
level's debrief. The pack is complete when the last teach-back has been
recorded, not when the player merely reaches the exit. `level_completed` stays
at the exit.

### Feedback copy

The same implementation pass makes two scoped feedback corrections that are
needed by the Endplate Ferry but do not add a mechanic or schema:

- A pulse that reaches an empty receptor no longer shows "The receptor rejects
  that shape". Only a rejection with an actual prop on the receptor is surfaced.
  This prevents a correct pulse from being contradicted by an empty decoy
  receptor.
- Prop prompts and toasts use the room entity's authored `label` when one
  exists, so the ACh packet is described as "ACh packet (signal token)" rather
  than the generic "tracer".

## Consequences

**Easier:**

- 03 → 04 is playable through the existing debrief and autosave.
- OBJ-2 can require performance evidence from both halves of the pathway.
- The room scene has one rebuild path and no page reload.
- No save schema migration or new progression state.

**Harder:**

- A level transition must rebuild the renderer as well as the runtime.
- Per-level debrief answers must be cleared even when the prompt id is shared.
- `finishDebrief` now has two exits: next level or pack complete.

**Constrained:**

- Linear `nextLevelIds` progression; no branching exits.
- No page reload and no second Phaser game instance.
- No per-level asset-loading state.
- No new save fields.

## Alternatives considered

- **Auto-transition at the room exit** — skips the level debrief and its
  evidence. Rejected.
- **Transition from the room exit's `toLevelId`** — ambiguous with multiple
  exits and duplicates the level graph. `nextLevelIds` is the level-level
  source of truth. Rejected for M2.
- **Reload the page after saving** — works around the renderer but loses the
  in-memory overlay flow and feels like a crash. Rejected.
- **Add a `currentLevel` or transition save field** — duplicates `levelId` and
  can drift. Rejected.
- **Create a second Phaser game per level** — heavier and breaks the single
  canvas/UI lifecycle. Rejected.
- **Add per-level debrief prompt overrides** — would solve the shared
  `prompt-obj-2` caveat but needs a curriculum/schema decision. Deferred; M2
  uses the shared prompt and documents the partial 03 display.

## Tests

- Runtime: 03 debrief → 04 level, map/checkpoint/co-op state, fresh 04 debrief
  answers, transition autosave/restore, final debrief → complete +
  `pack_completed`, `onLevelChange` notifications.
- Content: Endplate Ferry puzzle validation, solution replay, Ca²⁺ gate
  requirement, wrong receptor recovery, AChE latch, reset.
- Browser: 03 → 04 transition, canvas `data-room-id` changes, 04 co-op solve,
  debrief, evidence export.
- Pack smoke: full 03 → 04 → complete flow and OBJ-2 required evidence.

## References

- [`../shrinkonauts/base-game/requirements.md`](../shrinkonauts/base-game/requirements.md) FR-11
- [`../shrinkonauts/base-game/contracts/state-machine.md`](../shrinkonauts/base-game/contracts/state-machine.md)
- [`0039-puzzle-as-assessment-source.md`](0039-puzzle-as-assessment-source.md)
- [`0040-dynamic-prop-state-softlock-contract.md`](0040-dynamic-prop-state-softlock-contract.md)
- [`0042-puzzle-activation-lifecycle.md`](0042-puzzle-activation-lifecycle.md)
- [`0045-recoverable-save-version-mismatch.md`](0045-recoverable-save-version-mismatch.md)
