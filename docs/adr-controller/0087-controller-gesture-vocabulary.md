# ADR-0087: Controller gesture vocabulary and discoverability

- **Status:** Accepted
- **Date:** 2026-11-04
- **Deciders:** Snorre
- **Related:** ADR-0037, ADR-0069, ADR-0083, ADR-0086

## Context

Dash is a movement ability. The current controller gives it a dedicated button,
but the right-thumb cluster is crowded and the user wants Dash on a double-tap
of the movement direction. Double-tap-to-dash is a familiar mobile platformer
pattern: the movement thumb already knows the direction, and the right thumb
stays free for Jump and actions.

Gestures are easy to add and hard to discover. A second gesture (long-press,
swipe, triple-tap, double-tap on another button) would create a hidden control
language. Each gesture needs a clear trigger, a visible affordance, feedback
when it is recognized, a cooldown/disabled state, and an alternative for players
who cannot perform timed repeated inputs.

This ADR defines a small, closed gesture vocabulary and the visual language for
communicating it. Phase 6.5 ships exactly one gesture: double-tap Dash.

## Decision

### 1. Closed gesture set for Phase 6.5

The only gesture is:

| Gesture | Zone | Action | When |
|---|---|---|---|
| Double-tap ◀ or ▶ | The same direction button twice | Dash in that direction | Dash unlocked, not paused, not in choice mode |

No long-press, swipe, triple-tap, or double-tap on Jump/Interact is added in
this phase. A future gesture requires an ADR update, a coach mark, a controls
legend entry, and a documented accessibility fallback.

### 2. Client-side double-tap detection

The controller page detects the gesture locally and sends the existing
`NetInput.intents.dash` edge. The host protocol does not gain a new input field.

Definitions:

- **Tap:** one pointer down and up on the same direction button, with pointer
  duration ≤ 220 ms and movement ≤ 12 CSS px.
- **Double-tap:** a second pointer-down on the same direction button within
  300 ms of the first tap’s pointer-up. The second tap is recognized on
  pointer-down so the dash edge is sent immediately; it does not need to finish
  before the dash.
- The second tap decides the direction. Both taps must be on the same button.
- Listen only on the ◀ / ▶ button hit area, including its padded hit box; taps
  in the surrounding movement zone do not count.
- Only one pointer may participate. A second finger cancels the candidate.
- A pointer that leaves the button or moves beyond the slop threshold is not a
  tap.
- The gesture is disabled when Dash is locked, the game is paused, the phone is
  in `choice` dialogue mode, or the board is disabled.
- Reset the detector on blur, visibility change, pause, mode change, reconnect,
  and slot close.
- On recognition, send one snapshot with `moveX` set to the tapped direction and
  `dash: true`; clear the dash pulse after that send.
- A single tap still moves normally. Movement is a hold; repeated tapping is not
  a movement mode.

The detector is a pure module (`src/controller/touch-gestures.ts`) with an
injected clock, so the timing rules are unit-testable without DOM timers.

### 3. Direction semantics

The host must resolve dash direction from the movement direction when both
arrive in the same step. Before applying a dash, if `intent.moveX !== 0`, set
`player.facing = intent.moveX`. Then dash in that direction.

This makes a double-tap left dash left even if the player was facing right, and
it matches the expectation set by the gesture. It does not change dash speed,
duration, cooldown, or collision. Keyboard dash while holding a direction gains
the same deterministic behaviour.

### 4. Visual language

Every gesture has four visible states and one onboarding moment.

**Dash indicator**

Place a small `» DASH` chip in the movement zone, between or above the
left/right buttons. It is informational, not a tap target; only the ◀ / ▶
button hit areas accept the gesture. The chip is the gesture’s status and
reminder.

| State | Indicator | Movement zone | Feedback |
|---|---|---|---|
| Locked | hidden | normal movement | none |
| Ready | accent `» DASH`; subtle idle shimmer | normal | press haptic |
| First tap | `2×` hint pulses for 300 ms | tapped direction briefly highlights | light haptic |
| Recognized | fast flash / short trail | direction button flash | double pulse |
| Cooling down | radial fill; label dims | normal movement | reject pulse on attempt |
| Rejected | ring/shake | normal movement | single pulse |
| Disabled | hidden or dimmed | normal movement | none |

**Coach mark**

When `dash` first appears in `verbs`, show a one-time, non-blocking coach mark
over the movement zone:

> Double-tap ◀ or ▶ to dash

Use an animated two-tap finger and a `»` glyph. Dismiss on the first successful
dash, after 4–5 seconds, or when the player opens the controls sheet. Do not
show it again after a successful dash unless the player requests help.

**Controls sheet**

Add a small `?` button to the top bar. It opens a modal/sheet listing every
control, including the gesture:

```text
Move      Hold ◀ / ▶
Jump      Tap Jump
Dash      Double-tap ◀ or ▶
Interact  Tap Interact
Scan      Tap Scan
Pulse     Tap Pulse (P1)
Carry     Tap Carry (P2)
Throw     Tap Throw while carrying
Dance     Tap Dance
Dialogue  Continue / Back / 1–N
```

The sheet is the canonical reference. It must be reachable with the same touch
input as gameplay and must not require a gesture to open.

**Persistent hint**

When Dash is unlocked, replace the bottom board hint with:

> Hold to move · Double-tap to dash

When Dash is locked, keep the movement hint simple. Do not permanently label
every button with its gesture.

**Consistency**

Use the double-chevron `»` glyph only for double-tap. Do not reuse it for
cooldown, direction, or “next”. Use text plus icon; never colour alone.

### 5. Multiple-gesture rules

These rules keep the vocabulary learnable:

1. One gesture per control. Do not stack double-tap, long-press, and swipe on
   the same button.
2. No timing ladders (double-tap vs triple-tap).
3. No gesture on Jump, Interact, Scan, or the role verb in this phase. Those
   are primary actions; repeated taps there are ambiguous.
4. Dash is deliberately gesture-only on the phone; the existing keyboard slot
   is its fallback. No other gesture-only required action is allowed in this
   phase.
5. A future gesture must not be the only way to perform a required action unless
   the product explicitly accepts and documents an accessibility fallback, as
   with Dash and the keyboard slot.
6. Gestures are disabled during `choice` dialogue, pause, and any host hold.
7. A gesture must have a coach mark on unlock and a permanent controls-sheet
   entry.
8. A gesture must not require more than two fingers or precise timing.
9. If a gesture is misrecognized twice in a session, show the controls-sheet
   hint and remind the player that the host can switch the slot to keyboard.

### 5a. Future gesture candidates

No other gestures are planned. If one is added, prefer a movement-zone modifier
with its own glyph and a unique zone; do not add a second gesture to ◀/▶ because
double-tap is already taken. Primary action buttons (Jump, Interact, Scan, role)
stay gesture-free. A future gesture must define its trigger, visual states,
coach mark, controls-sheet entry, and documented fallback before implementation.

### 6. Accessibility and fallback

- Phase 6.5 is gesture-only by product decision. There is no on-phone Dash
  button and no Dash-input setting.
- Known limitation: a player who cannot double-tap must use the keyboard slot
  (host keyboard fallback) or have the host reassign that slot. This is accepted
  for the current demo, but must be revisited if the playtest includes players
  with motor impairments.
- Keep the double-tap window at 300 ms and make the ◀ / ▶ targets generous; do
  not require faster tapping.
- Visual feedback is mandatory; haptics are optional and respect the haptics
  toggle.
- The controls sheet is accessible by touch and by screen reader.
- If a future phase adds an on-phone Dash button, it should be a local setting
  and should disable double-tap to avoid duplicate dashes.

### 7. No gameplay changes

Dash speed, duration, cooldown, collision, and ability unlock rules are
unchanged. The only simulation touch is the direction-resolution order described
in §3. No new dash charges, air dashes, or cancel windows are added.

## Consequences

**Easier:**

- The right thumb keeps only Jump and actions; the cluster is less crowded.
- Dash direction matches the movement thumb’s intent.
- One gesture with one clear visual language is learnable.
- The controls sheet and coach mark make the gesture discoverable.
- The right-thumb cluster has no Dash button competing with Jump and actions.

**Harder:**

- The controller needs a pure gesture detector and timing tests.
- The host needs deterministic dash-direction resolution.
- The controller needs indicator, coach-mark, cooldown, and rejection states.
- A running player must briefly lift the movement thumb to double-tap; this may
  feel less smooth than a dedicated dash button. Playtest it before extending
  the vocabulary.
- The gesture-only decision leaves a known accessibility gap; the keyboard slot
  is the only fallback.
- Every future gesture now needs an ADR, coach mark, legend entry, and fallback.

**Constrained:**

- Exactly one gesture in Phase 6.5: double-tap Dash on the ◀ / ▶ buttons.
- No gesture on primary action buttons.
- No triple-tap, long-press, or swipe vocabulary.
- Dash is gesture-only on the phone; the keyboard slot is the fallback.
- No gesture during choice dialogue, pause, or host hold.
- No change to dash balance.

## Alternatives considered

- **Keep a dedicated Dash button next to Jump.** Rejected: the user wants
  double-tap, the right cluster is crowded, and the decision is gesture-only.
  The keyboard slot remains the fallback.
- **Double-tap the whole movement zone.** Rejected: the user chose the direction
  buttons only, so taps in the surrounding zone do not dash.
- **Double-tap Jump to dash.** Rejected: Jump is a primary action; repeated taps
  there are ambiguous and conflict with jump buffering.
- **Double-tap anywhere on screen.** Rejected: accidental dashes while tapping
  actions or dialogue choices.
- **Swipe to dash.** Rejected: direction ambiguity, poor discoverability, and
  conflict with movement.
- **Long-press to dash.** Rejected: slower than a tap, conflicts with held
  movement, and is hard for players with limited dexterity.
- **Triple-tap or timing ladders.** Rejected: hidden, hard to discover, and
  inaccessible.
- **No visual indicator; rely on the shared HUD.** Rejected: the phone player
  needs to know the gesture exists and whether it is ready.

## Tests

- Unit: a tap shorter than 220 ms and under 12 px is a tap; a longer press or a
  larger move is not.
- Unit: two taps on the same direction button within 300 ms produce one dash
  edge on the second pointer-down; one tap on ◀ and one on ▶ do not.
- Unit: a second finger cancels the candidate; pointer cancel/blur resets it.
- Unit: only one dash edge is emitted per recognized double-tap; the pulse is
  cleared after the next snapshot.
- Unit: locked/paused/choice/disabled states suppress recognition.
- Integration: double-tap the ◀ button sends `moveX: -1` + `dash`; the host
  dashes left even when facing right. The ▶ button mirrors it.
- Integration: a single tap does not dash; holding movement does not dash.
- Browser: no Dash button exists in the controller DOM.
- Browser: first-tap hint, recognized flash, cooldown ring, rejection feedback,
  coach mark, and controls sheet.
- Accessibility: controls sheet is reachable by touch and screen reader; haptics
  toggle works; no colour-only state; keyboard-slot fallback is documented.
- Regression: keyboard dash, jump, and existing controller input are unchanged.

## References

- [Microsoft GDK — touch control design guidance](https://learn.microsoft.com/en-us/gaming/gdk/docs/features/common/game-streaming/building-touch-layouts/game-streaming-tak-designers-guide?view=gdk-2604)
- [Game Accessibility Guidelines](https://gameaccessibilityguidelines.com/full-list/)
- ADR-0037 — per-player abilities and fixed verbs
- ADR-0069 — input feel, buffers, and latency
- ADR-0083 — controller thumb-zone layout
- ADR-0086 — ability disclosure and feedback
