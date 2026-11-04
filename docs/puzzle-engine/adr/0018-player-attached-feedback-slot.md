# ADR-0018: Player-attached feedback slots and compact world surfaces

Status: Accepted
Date: 2026-11-02
Deciders: Snorre
Related: ADR-0009, ADR-0010, ADR-0012, ADR-0013
Amends: ADR-0010 §3's stacking rule for player-attached captions

## Context

The feedback layer turns every fact into a cue. Cues are coalesced only when two
share the same `cause`, so different actions and puzzle events create different
cues even when they concern the same player.

Most player-specific events are anchored to the acting player. Examples include
plate presses and releases, zone entry and exit, relay activity, rejected
actions, and action outcomes without an entity target. ADR-0010 §3 also asks the
layout to stack multiple surfaces on one anchor.

The result is that a player who moves and interacts accumulates several
`playerCaption` boxes. They follow the player, obscure play, and make co-op
attribution noisy even though every individual cue is correct.

ADR-0010's stacking rule is still needed for entity conversations: P1 and P2
must be able to talk to the same entity at the same time. The fix must therefore
be specific to player-attached feedback, not a global one-surface rule.

Player captions are also larger than they need to be. They use the full panel
padding and a separate owner-chip row, which adds height without adding
information.

## Decision

### 1. One transient player-attached caption slot per player

A transient cue whose anchor is `{ kind: "player" }` occupies a single slot for
that player:

```text
player:p1
player:p2
```

Rules:

- At most one player-anchored cue may exist for a player at a time.
- A newly ingested player-anchored cue always evicts the current occupant.
- Newest wins, regardless of priority or severity. Cues are transient; the
  newest cause is the most useful explanation of what just happened.
- The evicted cue's effects are cancelled with it.
- The slot is keyed by the anchor, not by `owner`. A `shared`-owned cue attached
  to a player still uses that player's slot.

Entity-anchored speech bubbles, HUD surfaces, screen captions, and sticky
surfaces are outside the slot. Two players may still talk to the same entity and
see two bubbles.

### 2. Enforcement belongs to the feedback director

The slot is enforced in the cue-add path of the feedback director, before the
frame is built. It is not a renderer or layout filter.

- Cause-based deduplication remains unchanged.
- Layout stacking remains available for entity and HUD anchors.
- Hiding duplicate nodes in the renderer is not sufficient: hidden cues would
  still exist in the ECS view, in the live region, and in effect ownership.
- The director is headless-testable, so the invariant is covered without a
  browser.

### 3. World feedback uses compact chrome

All world-space feedback surfaces use compact geometry:

- reduced padding;
- a lower maximum width;
- tighter header spacing for speech bubbles;
- the player-caption owner chip and text share one row.

Body text keeps its normal size. Borders, contrast, owner accents, text scaling,
and reduced-motion behaviour are unchanged. HUD, screen, and modal surfaces keep
their existing panel geometry.

## Consequences

**Easier:**

- A player has one readable caption instead of a trailing stack.
- Co-op attribution stays visible without dominating the play area.
- Entity conversations keep their intentional ability to stack.
- The invariant is testable in the feedback director.

**Harder:**

- A rapid sequence of player actions replaces earlier captions before their TTL
  expires. Important state must remain visible through persistent surfaces,
  which is already required by ADR-0009.
- Effects attached to an evicted caption are cancelled early. Effects are
  cosmetic and the new cue brings its own effects.

**Constrained:**

- No more than one player-anchored transient cue per player.
- No layout-only hiding of duplicate cues.
- No text-size reduction as a way to make boxes smaller.
- No global one-surface-per-anchor rule; entity conversations must still stack.

## Alternatives considered

- **Make every player cue share one cause prefix.** Cheap, but it overloads the
  cause key and breaks cause-specific deduplication and tests. Rejected.
- **Suppress duplicates in the renderer.** Leaves hidden cues in the ECS view,
  live region, and effect ownership. Rejected.
- **Let priority decide which caption stays.** A critical cue could suppress all
  newer feedback until it expires, making the game feel unresponsive. Rejected.
- **Remove stacking for every anchor.** Breaks simultaneous conversations on the
  same entity. Rejected.
- **Shrink all feedback text.** Hurts readability and violates the accessibility
  baseline. Rejected.

## References

- [`0009-feedback-ecs-substrate.md`](0009-feedback-ecs-substrate.md)
- [`0010-anchored-feedback-surfaces.md`](0010-anchored-feedback-surfaces.md)
- [`0012-capability-feedback-coverage.md`](0012-capability-feedback-coverage.md)
- [`0013-cosmetic-feedback-effects-accessibility.md`](0013-cosmetic-feedback-effects-accessibility.md)
