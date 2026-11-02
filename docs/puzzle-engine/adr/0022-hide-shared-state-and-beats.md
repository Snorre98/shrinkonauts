# ADR-0022: Hide shared state surfaces and progress with shared feedback

Status: Accepted
Date: 2026-11-02
Deciders: Snorre
Related: ADR-0009, ADR-0018, ADR-0019, ADR-0020, ADR-0021
Amends: ADR-0021 §2's exclusion of persistent state surfaces and §4's
"state remains readable" scope

## Context

ADR-0021 added a persisted global visibility toggle for shared transient cues
and the requested help surface. It deliberately left persistent shared state
surfaces and the beat tracker visible: gate state, timer meters, socket
occupancy, input readiness, and puzzle progress.

In play, those boxes and the beat tracker read as shared feedback too. Turning
the setting off still left the play area full of boxes whose owner header says
"Shared", so the control appeared not to work. The player wants one switch that
hides shared feedback boxes and progress while keeping player-specific feedback
and cosmetic world effects.

## Decision

### 1. The shared-feedback toggle also hides shared state and beats

While `feedback.showShared` is off:

- shared-owned persistent surfaces are removed from the runtime feedback
  snapshot, including gate state, timers, sockets, occupancy, and input
  readiness;
- the beat tracker is removed from the snapshot;
- shared transient cues remain dropped at ingest;
- the requested shared help surface remains unavailable;
- player-owned cues, captions, and the pause-menu hint/reset fallback are
  unchanged.

### 2. Filtering happens at the runtime presentation projection

`GameRuntime` filters the feedback frame it exposes in `RuntimeSnapshot`:

- surfaces with `owner: "shared"` are omitted;
- `beats` is empty.

The director keeps projecting persistent state and beats. This matters because
cosmetic effects are attached to those projected surfaces. `drainEffects()`
continues to read the unfiltered effect list, so world effects keep running
while their text boxes are hidden.

The same filter is applied to surfaces offered to `SurfaceInputRouter`, so a
hidden shared surface cannot consume input even if it later becomes interactive.

Transient shared cues still use the director's `setSharedFeedbackEnabled`
enforcement; they are never buffered, rendered, or announced while off.

### 3. Re-enabling restores current state

Persistent surfaces and beats describe current state rather than events. Turning
the setting back on restores the current state projection and beat progress
immediately. Transient shared cues that were dropped or cleared are still not
replayed.

Cosmetic effects are never retroactively restored or replayed; they keep their
normal immediate lifecycle throughout.

## Consequences

**Easier:**

- One switch now removes the shared boxes and progress display the player
  actually sees.
- The control matches its label and no longer looks broken.
- State truth remains in the puzzle/world layers and is reprojected when the
  setting returns.

**Harder:**

- Players who turn it off lose the persistent textual state explanations and
  beaten-path progress; they must rely on the world, HUD, and pause menu.
- Hidden state surfaces still exist in the director, so tests must check the
  runtime snapshot rather than only the director view.
- Effects may remain visible with no accompanying shared text. This is
  intentional: effects are world response, not boxes.

**Constrained:**

- No player-owned cue or caption is hidden.
- No director-level deletion of persistent state surfaces; their effects must
  keep running.
- No replay of dropped transient cues after re-enabling.
- No second per-category toggle.
- No new keyboard shortcut.

## Alternatives considered

- **Hide the state surfaces inside the director.** Cleaner frame, but it would
  also remove the effects attached to those surfaces. Rejected because world
  effects must keep running.
- **Hide only in the DOM renderer.** Keeps hidden surfaces in the snapshot, live
  region, and input routing. Rejected.
- **Separate toggles for messages, state boxes, and beats.** More UI and more
  combinations than the player asked for. Rejected.
- **Keep persistent state visible and rename the control.** The player explicitly
  wants the state boxes and beat tracker hidden by the same switch. Rejected.

## References

- [`0009-feedback-ecs-substrate.md`](0009-feedback-ecs-substrate.md)
- [`0018-player-attached-feedback-slot.md`](0018-player-attached-feedback-slot.md)
- [`0019-request-gated-shared-help.md`](0019-request-gated-shared-help.md)
- [`0020-on-demand-transient-feedback.md`](0020-on-demand-transient-feedback.md)
- [`0021-shared-feedback-visibility-toggle.md`](0021-shared-feedback-visibility-toggle.md)
