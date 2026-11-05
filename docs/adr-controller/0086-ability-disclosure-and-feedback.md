# ADR-0086: Ability disclosure and feedback on the controller

- **Status:** Accepted
- **Date:** 2026-11-04
- **Deciders:** Snorre
- **Related:** ADR-0037, ADR-0069, ADR-0083, ADR-0084, ADR-0085, ADR-0087

## Context

The controller renders Interact, Scan, Pulse, Carry, Throw, and Dash for every
slot at all times. The runtime’s ability model is narrower:

| Ability | P1 co-op | P2 co-op | Solo |
|---|---|---|---|
| `scan` | yes | yes | yes |
| `signal-dash` | after unlock | after unlock | after unlock |
| `pulse` | yes | no | yes |
| `carry` | no | yes | yes |
| `throw` | no | while carrying | while carrying |

Showing every verb makes locked abilities look usable, gives P2 a Pulse button
that does nothing, gives P1 a Carry button that does nothing, and provides no
cooldown or result feedback. Dash is a movement ability but currently occupies a
separate button far from the movement zone, while the right cluster is already
crowded.

ADR-0037 rejected replacing the verb set with one contextual action because
several valid targets can be nearby. The controller therefore needs **stable
verb positions with progressive disclosure and contextual emphasis**, not
contextual remapping.

## Decision

### 1. Stable verb slots

Keep the layout stable. Verbs occupy fixed positions within the right-thumb
cluster:

- Jump — bottom-right primary.
- Interact — above Jump.
- Scan — above Interact.
- Role verb — Pulse (P1) or Carry (P2) beside Scan.
- Throw — reserved slot that appears only while carrying.

Dash is not a rendered verb. It is the double-tap movement gesture (ADR-0087).
`verbs` includes `dash` only to signal unlock and availability. No Dash button
is rendered in Phase 6.5; the keyboard slot is the fallback for a player who
cannot double-tap.

### 2. Progressive disclosure

Render only the verbs the slot can currently use:

- Always: Jump, Interact, Scan.
- Dash gesture: enabled only after `signal-dash` unlocks. No Dash button.
- P1 co-op: Pulse. P2 co-op: Carry. Solo: both.
- Throw: only while the player is carrying; hidden otherwise.
- Interact remains the primary action and already performs pickup/place/drop
  when applicable (ADR-0037).
- When P2 leaves and P1 receives the solo union, the new verbs appear in their
  reserved slots; when P2 joins, the union collapses again.

### 3. Contextual emphasis, not remapping

- The host may send `activeVerb` for the nearest actionable target: an agent,
  gate, prop, receptor, pulse source, scan target, or puzzle activation.
- The phone outlines/pulses that button and may fire a short haptic.
- For `dash`, the emphasis is applied to the movement zone and the Dash gesture
  indicator, not to a right-thumb button.
- The button never changes position or label.
- If no verb is active, nothing is highlighted.
- ADR-0037’s fixed-verb routing is preserved.

### 4. Action feedback

- The host sends `action` with `accepted`, `rejected`, or `cooldown`.
- Rejections use the closed reasons `out-of-range`, `locked`, `empty`, or
  `cooldown`.
- The phone shows a short visual result: accepted = brief positive flash;
  rejected = brief negative flash; cooldown = dimmed button with a ring.
- The phone maps reason codes to its own short local copy (for example
  “Too far”, “Recharging”, “Nothing to throw”). No host text is displayed.
- A `retryAfterMs` value may animate a cooldown ring locally for Dash or Pulse.
  For Dash, the ring is shown on the movement-zone Dash indicator.
- Feedback is best-effort and never changes gameplay.

### 5. Haptics

- Keep the immediate press haptic.
- Add distinct short patterns for accepted and rejected results where the
  browser supports `navigator.vibrate`.
- Provide a local haptics toggle on the controller page, persisted in
  `localStorage`.
- Never rely on haptics alone; visual pressed/result states are mandatory.
- iOS ignores vibration; the visual path must remain complete.

### 6. Shared-screen input awareness

- The HUD control cards and contextual prompt show the active input source:
  keyboard keys for keyboard slots, action names for phone slots.
- When P2 is on a phone, the prompt shows `P2 · Interact` rather than `,`.
- Locked abilities remain dimmed for keyboard slots, as today.
- The phone is never used to display progress, puzzle state, or dialogue text.

### 7. No balance changes

This ADR changes presentation and feedback only. It does not change Dash
distance, duration, cooldowns, Pulse range, carry rules, throw physics, puzzle
state, or save data. The one simulation-adjacent fix is deterministic dash
direction: when a dash edge and a movement direction arrive in the same step,
the host resolves facing from that direction before applying the dash. This
makes double-tap direction reliable and matches player expectation; it does not
change dash speed, duration, or cooldown.

## Consequences

**Easier:**

- Each player sees only the verbs they can actually use.
- Dash lives in the movement zone without consuming a right-thumb slot.
- Ability unlocks are visible and teach the new control or gesture.
- Players get confirmation that an action was accepted or why it failed.
- Stable positions preserve muscle memory and respect ADR-0037.

**Harder:**

- The host must compute per-slot verb sets and contextual emphasis.
- Ability unlocks, carry transitions, and P2 join/leave must resend control
  descriptors.
- The controller needs cooldown and result animations.
- The HUD needs input-plan-aware copy.

**Constrained:**

- No new verbs or abilities.
- No contextual remapping or single “do everything” button.
- No radial menu or additional gesture vocabulary. Dash is the one gesture-only
  control, with the keyboard slot as its fallback.
- No phone-side gameplay prediction.
- No host text on the phone.

## Alternatives considered

- **Keep all six verbs visible (A3).** Rejected: dead buttons and missing
  feedback remain.
- **One contextual action button (A2).** Rejected by ADR-0037: a room can
  contain several valid targets at once.
- **Radial ability wheel.** Rejected: requires a hold, obscures the scene, and is
  slow during platforming.
- **Swipe or multi-tap shortcuts for other abilities.** Rejected: poor
  discoverability, accessibility, and conflict with movement. Dash is the one
  deliberate double-tap exception (ADR-0087).
- **Show locked verbs as dimmed instead of hiding them.** Rejected for the
  controller: the small screen cannot afford permanent dead targets. The shared
  HUD may keep its dimmed keyboard legend.

## Tests

- P1 co-op shows Jump, Interact, Scan, Pulse; no Carry; Dash gesture enabled
  only after unlock.
- P2 co-op shows Jump, Interact, Scan, Carry; no Pulse; Dash gesture enabled
  only after unlock.
- Solo shows the union.
- No Dash button is rendered; only the double-tap gesture triggers Dash.
- Throw appears only while carrying.
- `activeVerb` highlights but never moves or relabels a button.
- Accepted/rejected/cooldown results produce the expected visual state.
- Cooldown ring animates from `retryAfterMs`; it does not bypass cooldown.
- Haptics toggle persists and disables vibration only.
- HUD prompts show the active input source.
- Keyboard/solo regression is unchanged.
- No game state or host text appears on the phone.

## References

- ADR-0037 — per-player abilities and the solo union
- ADR-0069 — input feel, buffers, and latency
- ADR-0083 — controller thumb-zone layout
- ADR-0084 — control-state channel
- ADR-0085 — dialogue control and choice presentation
- ADR-0087 — controller gesture vocabulary and discoverability
