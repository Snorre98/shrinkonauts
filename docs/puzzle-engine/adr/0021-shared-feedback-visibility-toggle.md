# ADR-0021: Shared feedback visibility toggle

Status: Accepted
Date: 2026-11-02
Deciders: Snorre
Related: ADR-0009, ADR-0010, ADR-0018, ADR-0019, ADR-0020
Amends: ADR-0019 §1's unconditional shared-help request and ADR-0020 §1's
shared transient-cue scope

## Context

ADR-0020 made transient cues request-only: players press scan to read the newest
pending message. Shared cues from gate open/close, solves, and system outcomes
are copied to both players' inboxes, and the requested help surface appears in
the shared HUD band.

On-demand presentation removes automatic interruptions, but some players still
do not want shared transient boxes at all. They may prefer to read persistent
state, beat progress, and the HUD, and to rely on the pause-menu hint/reset
fallback. This is a display preference, not a gameplay choice: shared cues never
carry puzzle authority.

Player-specific feedback is different. A rejected action or a pickup belongs to
the player who acted, and hiding it would remove attribution the player needs.
The control must therefore affect only feedback owned by `shared`.

## Decision

### 1. Shared feedback visibility is a persisted global setting

`GameSettings.feedback.showShared` is a global boolean:

- default `true`;
- stored in the existing settings slot, separately from run state;
- missing or malformed values default to `true`;
- the run snapshot exposes the current value through `SettingsView`;
- the pause/settings overlay provides an accessible on/off control;
- no keyboard shortcut is added, because the shared control map is already
  crowded and no free key is documented for this preference.

### 2. Scope is shared-owned transient feedback

While `showShared` is off:

- shared transient cues are not buffered, rendered, or announced;
- pending shared copies are removed from both players' inboxes;
- visible shared cues are despawned immediately;
- the requested shared help surface (`fb:help:*`) is not opened, and an existing
  one is dismissed immediately;
- scan precedence skips the shared-help step and continues to a scan target or
  the normal fallback copy.

The setting does not affect:

- player-owned transient cues and their `P1:` / `P2:` captions;
- persistent state surfaces such as gate open/closed, timer meters,
  receptor/socket occupancy, and the beat tracker;
- the pause-menu hint and reset controls, which remain the fallback for help;
- cosmetic effects.

Effects keep ADR-0020's semantics: they are part of the world response, not text
boxes. A shared cue dropped because the setting is off still starts its effect
plans from a hidden effect host. Removing an already-visible shared cue follows
the normal despawn path, which cancels effects attached to that cue.

### 3. Enforcement belongs to the feedback director

The director owns a mutable `setSharedFeedbackEnabled` operation. When disabled
it:

- drops shared cue specs before they enter either inbox in deferred mode;
- drops shared cue specs before spawning in immediate mode;
- clears pending shared copies;
- despawns visible cues whose owner is `shared`;
- leaves persistent surfaces, beats, and player-owned cues untouched.

The runtime also refuses the help request and dismisses the runtime-owned help
surface. The director check is the invariant; the runtime check prevents the
request from being counted or briefly mounted.

Re-enabling changes only future behaviour. Dropped cues and cleared pending
copies are not replayed, and an older player cue that was replaced by a shared
cue is not restored.

### 4. State remains readable without shared transient text

The game must remain playable while the setting is off. Progress, gate state,
meters, sockets, and beats remain persistent surfaces. The pause menu still
offers the authored puzzle hint and reset. Turning shared feedback off is a
presentation preference, never a soft-lock or a loss of required information.

## Consequences

**Easier:**

- Players who dislike shared transient boxes can remove them without losing
  player-specific feedback or help fallbacks.
- The preference persists across reloads and sessions.
- The director owns one explicit, headless-testable visibility invariant.
- Persistent state remains the source of truth, as ADR-0009 and ADR-0020
  require.

**Harder:**

- The setting has two enforcement points: the director for cues and the runtime
  for the help surface.
- Shared-style outcomes that players expect to see on request no longer appear
  while off; players must re-enable the setting to read future shared cues.
- Toggling off necessarily discards pending shared messages that have not been
  read.

**Constrained:**

- No per-player shared-feedback toggle.
- No renderer-only hiding of shared cues.
- No replay of dropped or cleared shared cues after re-enabling.
- No removal of persistent state surfaces, beats, player cues, or pause-menu
  hint/reset.
- No new keyboard shortcut for the setting.
- No changes to cue dedupe, player captions, cue TTL, or effect timing.

## Alternatives considered

- **Per-player shared visibility.** Shared ownership is global by definition;
  two different views of the same shared cue would complicate inbox clearing,
  help ownership, and co-op expectations. Rejected.
- **Hide shared cues in the renderer only.** Pending cues would still enter
  inboxes, scan, the live region, and effect ownership. Rejected.
- **Drop shared effects along with text.** Effects are world response, not text
  boxes, and ADR-0020 deliberately keeps them immediate. Rejected.
- **Default the setting off.** Changes existing behaviour and removes shared
  explanations players rely on. Rejected.
- **Add a dedicated keyboard shortcut.** The shared cluster is crowded and no
  free key is documented for this preference. Rejected.
- **Put the toggle in the hub only.** Players need the control while playing and
  while paused, next to the other settings. Rejected.

## References

- [`0009-feedback-ecs-substrate.md`](0009-feedback-ecs-substrate.md)
- [`0010-anchored-feedback-surfaces.md`](0010-anchored-feedback-surfaces.md)
- [`0018-player-attached-feedback-slot.md`](0018-player-attached-feedback-slot.md)
- [`0019-request-gated-shared-help.md`](0019-request-gated-shared-help.md)
- [`0020-on-demand-transient-feedback.md`](0020-on-demand-transient-feedback.md)
