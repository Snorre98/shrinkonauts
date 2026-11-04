# ADR-0085: Dialogue control and choice presentation

- **Status:** Accepted
- **Date:** 2026-11-04
- **Deciders:** Snorre
- **Related:** ADR-0011, ADR-0083, ADR-0084, ADR-0086, ADR-0087
- **Builds on:** ADR-0068

## Context

Entity conversations are per-owner soft surfaces (ADR-0011). The owner can talk
while the other player keeps playing. Choice conversations freeze the owner and
render choice buttons in the shared speech bubble. Keyboard players use 1–5,
Enter to confirm, and Backspace/Delete to cancel.

The phone currently has a manual “Dialogue” toggle that opens a panel with Up,
Down, Confirm, Cancel, and five numbered choice buttons. The panel does not know
when a conversation starts, how many choices exist, or which choice is selected.
The player must find the toggle, read the choice labels on the shared screen,
and map a number back to the phone. This is slow, error-prone, and visually
crowded.

The shared screen is the right place for narrative text: it keeps both players
in the same scene and avoids turning the phone into a second story screen. The
phone only needs to know how to shape its own input surface.

## Decision

### 1. Remove the manual Dialogue toggle

The controller no longer has a “Dialogue” button or a persistent dialogue
panel. Dialogue controls appear and disappear with the owned conversation,
driven by the `control` message from ADR-0084.

### 2. Two phone dialogue modes

The host sends `mode: "talk"` for linear/acknowledge nodes and
`mode: "choice"` for nodes with choices, only to the owner slot.

**Talk mode**

- Replace the action row with a large **Continue** button and a smaller
  **Back** button.
- Keep movement and Jump available. Linear dialogue does not freeze the owner;
  moving out of range closes the conversation as today. The Dash gesture
  remains enabled.
- `interact` also confirms, preserving keyboard parity.
- Back cancels the conversation.

**Choice mode**

- Replace the action area with `choiceCount` large buttons labelled `1`–`N`,
  plus Back.
- The owner is frozen by the runtime, so Jump is hidden or visibly disabled and
  the Dash gesture is disabled and reset.
- Tapping `N` sends the existing `ui.choose = N` field. The host resolves it
  against the current node.
- No speaker, text, or choice labels appear on the phone.
- Back cancels the conversation.

### 3. Shared-screen choice presentation

- Show a visible number badge (`1`–`N`) on each shared-screen choice button.
- Show the owner chip and a clear selected state.
- Make it obvious which player is choosing; the other player cannot choose
  that surface.
- Do not auto-advance or time out. Players read at their own pace.
- Keep the existing live-region announcement for accessibility.

### 4. Keyboard parity and routing

- Keyboard 1–5, Enter, Backspace/Delete, and interact/confirm keep working.
- The phone’s `ui.confirm`, `ui.cancel`, and `ui.choose` continue to route
  through `SurfaceInputRouter`.
- Only the owner slot receives the dialogue control descriptor.
- `ui.choose` remains 1-based and bounded to 1–5.
- `interact` remains a confirm alias; this is existing behaviour and is kept.

### 5. Lifecycle and reconnect

- Send the descriptor when a conversation starts, advances, changes choice
  count, closes, restores from save, or the controller reconnects.
- On close/cancel/completion, send `mode: "explore"` and restore the action row.
- If the descriptor is missed, the host still accepts `interact` as confirm;
  the shared screen remains the authority for reading and selection.
- Conversation restore (ADR-0011) rebuilds the surface and resends the
  descriptor.

### 6. Accessibility

- Phone buttons use explicit labels: “Continue”, “Back”, “Choose 1”, etc.
- Choice buttons are at least 56 CSS px and use both number and text-free
  accessible names.
- The shared screen keeps the full text and announces it through the existing
  live region.
- Do not rely on colour alone; use number badges, borders, and selected states.
- Reduced motion removes pulse/scale animations but keeps pressed/selected
  states.

A phone-only screen-reader user cannot hear the choice labels because the text
stays on the shared screen. That is a known limitation of the shared-reading
model. A future full dialogue mirror is a separate accessibility decision, not
part of this ADR.

## Consequences

**Easier:**

- Dialogue controls appear exactly when needed; no hidden toggle.
- Fewer, larger buttons; fewer mis-taps.
- Choice count always matches the shared screen.
- Co-op ownership is visible to both players.
- No narrative text crosses the network.

**Harder:**

- The host must send dialogue-mode descriptors from the conversation lifecycle.
- The shared-screen choice renderer needs number badges and stronger selected
  styling.
- The controller page needs two new layout states.
- Browser tests must assert that dialogue text never appears on the phone.

**Constrained:**

- No dialogue text, speaker, or choice labels on the phone.
- No global dialogue modal.
- No timeout or auto-advance.
- No phone-only conversation state.
- No more than five choices, matching the existing `ui.choose` range.

## Alternatives considered

- **Keep the manual toggle and panel.** Rejected: it is the main source of the
  reported friction.
- **Always show a dialogue strip.** Rejected: it clutters the action area and
  still does not know the choice count.
- **Full dialogue mirror on the phone.** Rejected for M4.0a: it sends content,
  splits attention, and reopens the second-screen boundary. Keep it as a future
  accessibility option.
- **Auto-open the panel on any `interact` press.** Rejected: the phone cannot
  know whether a conversation actually started; this would guess.
- **Rely on shared-screen numbers only.** Rejected: it leaves the phone with the
  old nine-button panel and no automatic mode.

## Tests

- Host sends `talk` for a linear node and `choice` for a choice node; only the
  owner receives it.
- Phone shows Continue/Back in talk mode and exactly N choice buttons in choice
  mode.
- Tapping choice N selects the Nth choice; selection and owner badge update on
  the shared screen.
- Back cancels; completion returns the phone to explore mode.
- Reconnect and save/restore resend the current mode.
- Keyboard 1–5/Enter/Backspace still work.
- No dialogue text appears in the controller DOM.
- Solo and co-op both work; the other player can keep playing during a talk
  conversation.
- The Dash gesture is disabled and reset in choice mode; it is not triggered by
  the choice taps.

## References

- ADR-0011 — entity conversations
- ADR-0083 — controller thumb-zone layout
- ADR-0084 — control-state channel
- ADR-0086 — ability disclosure and feedback
- ADR-0087 — controller gesture vocabulary and discoverability
