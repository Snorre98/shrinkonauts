# ADR-0020: On-demand transient feedback via scan

Status: Accepted
Date: 2026-11-02
Deciders: Snorre
Related: ADR-0009, ADR-0010, ADR-0018, ADR-0019
Amends: ADR-0009 §3 (immediate transient cue presentation) and ADR-0018 §3
(player-caption chrome)

## Context

ADR-0018 reduced player-attached captions to one slot and ADR-0019 made the
shared help surface request-only. Transient cues still appeared automatically:
a plate press, gate event, rejection, system outcome, or solve produced a box
without the player asking for it.

That is still too intrusive. The game is readable through persistent surfaces,
beat progress, the HUD, and the world itself. Transient text should answer a
question the player chose to ask, not interrupt the play area.

`scan` is already the information verb. It handles unrevealed scan targets and,
inside an authored info area, the shared help surface. It is the natural place
to request the latest deferred message.

## Decision

### 1. Runtime uses deferred transient cues

`GameRuntime` creates the feedback director with deferred cues enabled. Every
transient cue is stored in an inbox instead of becoming visible:

- player-owned cues go to that player's inbox;
- shared cues are copied to both players' inboxes;
- only the **latest** cue per player is kept; a newer cue replaces the older
  pending one;
- pending cues are not in `FeedbackFrame.cues`, are not rendered, and are not
  announced in the live region.

Persistent surfaces, beat progress, the HUD, and the shared help surface are
unchanged. They still describe current state or respond to an explicit help
request.

### 2. Scan reveals the latest pending cue

The scan precedence is:

1. If the player has pending feedback, reveal and consume the latest cue.
2. Otherwise, if an unrevealed scan target is in range, scan it and reveal the
   resulting cue.
3. Otherwise, if the player is inside an info area, open the shared help surface.
4. Otherwise, emit and reveal the normal “Nothing to scan here” cue.

A scan result is revealed immediately because pressing the button is the request.
Pending feedback always takes precedence, so the first scan after an event shows
that event’s message and the next scan performs a concept scan or opens help.

### 3. Requested cues keep existing semantics

A requested cue is spawned through the normal cue path:

- cause deduplication still applies;
- a player-anchored cue still occupies the one caption slot from ADR-0018;
- TTL starts when the cue is revealed;
- the live region announces only the requested cue;
- re-requesting after it expires does not restore it because the pending copy was
  consumed.

### 4. Effects are not deferred

Cosmetic effects are part of the world response, not text boxes. A deferred cue
with effect plans spawns a hidden effect host immediately:

- the effects run with their normal timing and attribution;
- the host expires after the longest finite effect stage;
- persistent effects use a bounded host lifetime and are cancelled on expiry;
- revealing the cue later shows text only and does not duplicate its effects.

### 5. Player captions are compact text-only chips

Player captions no longer render an owner header row:

- the text carries the `P1:` / `P2:` prefix;
- the owner accent remains on the border;
- padding and max width are reduced further;
- the drop shadow is removed for captions;
- body text size, contrast, and text scaling are unchanged.

Other world-space boxes receive a smaller padding and width pass. HUD and modal
surfaces keep their existing geometry.

## Consequences

**Easier:**

- Transient text no longer interrupts play or obscures the world.
- The player controls when to read a message.
- The live region and visible frame contain only information the player asked
  for.
- Cosmetic effects still communicate causality immediately.
- The one-caption slot and help request continue to compose with the new inbox.

**Harder:**

- Only the latest pending cue per player survives; older messages are lost.
- Players must press scan to learn about rejected actions or shared outcomes.
- The director now has two presentation modes: immediate for headless/default
  use and deferred for the game runtime.
- Effects and text have separate lifecycles for deferred cues.
- Tests must distinguish pending from visible cues.

**Constrained:**

- No automatic transient cue box.
- No pending cue in the rendered frame or live region.
- No pending cue in save state.
- No deferred cosmetic effects; effects remain immediate.
- No owner header row on player captions.
- No text-size reduction to make boxes smaller.

## Alternatives considered

- **Gate only player captions.** Shared event boxes would still interrupt and
  the user asked for all transient cues. Rejected.
- **Hide cues in the renderer only.** Hidden cues would still be in the frame,
  live region, and effect ownership. Rejected.
- **Show a full feedback log.** More information, but a larger UI and a different
  interaction model. Rejected in favour of the latest temporary message.
- **Keep all pending messages in a queue.** The user chose latest; a queue adds
  hidden state and cycling controls. Rejected.
- **Defer effects with the text.** The world would stop responding visually until
  the player asked for a text message. Rejected.
- **Use a new feedback key.** Scan is already the information verb and the P2
  control cluster is crowded. Rejected.

## References

- [`0009-feedback-ecs-substrate.md`](0009-feedback-ecs-substrate.md)
- [`0010-anchored-feedback-surfaces.md`](0010-anchored-feedback-surfaces.md)
- [`0018-player-attached-feedback-slot.md`](0018-player-attached-feedback-slot.md)
- [`0019-request-gated-shared-help.md`](0019-request-gated-shared-help.md)
