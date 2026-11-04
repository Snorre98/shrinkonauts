# ADR-0083: Controller thumb-zone layout

- **Status:** Accepted
- **Date:** 2026-11-04
- **Deciders:** Snorre
- **Related:** ADR-0037, ADR-0067, ADR-0068, ADR-0069, ADR-0086, ADR-0087
- **Builds on:** ADR-0066

## Context

The M4.0a controller page was built as a quick touch surface: the left cluster
held left/right movement plus Jump, and the right cluster held Interact, Scan,
Pulse, Carry, Throw, Dash, and a Dialogue toggle. Phone playtesting showed that
this fights the two-thumb model. Jump shares the left thumb with movement, so
moving and jumping at the same time requires an awkward grip. The right thumb
faces six equal targets with no hierarchy, and Dash — a movement ability — has
its own button far from the movement zone.

A phone normally supports two comfortable simultaneous inputs, one per thumb.
The game is a 2D platformer with digital left/right movement, jump, dash, a
primary interact action, and a small set of role/information abilities. The
controller therefore needs one movement zone and one action zone, not a flat
grid of equivalent buttons. Dash is a movement modifier, so it belongs to the
movement zone as a gesture rather than to the action cluster (ADR-0087).

## Decision

### 1. Landscape-only board, split by thumb

The controller remains landscape-only. The board has two functional zones:

- **Left thumb zone:** movement, including the double-tap Dash gesture. A large
  left/right rocker, bottom-left.
- **Right thumb zone:** Jump and actions, bottom-right.

No movement control appears on the right. No jump or action control appears in
the left movement zone. Dash is a movement gesture (ADR-0087), so the left zone
is still movement-only; it does not host an action button.

### 2. Right-thumb hierarchy

From bottom to top, anchored to the bottom-right corner:

1. **Jump** — the largest target, closest to the resting right thumb. Minimum
   80 CSS px; target 88–96 CSS px on a typical 390 px-high landscape viewport.
2. **Interact** — above Jump; the primary non-movement action.
3. **Scan** and the role ability (Pulse or Carry) — above Interact.
4. **Throw** — appears only while carrying; it does not occupy a permanent
   visible slot when unavailable (see ADR-0086).

Dash is not a button. It is triggered by double-tapping the ◀ or ▶ direction
button (ADR-0087). No Dash button is rendered in Phase 6.5; the free space keeps
Jump and Interact large. A player who cannot double-tap can use the existing
keyboard slot fallback.

The layout is stable. Context changes the emphasis and availability of controls;
it does not reorder or relabel them.

### 3. Size, spacing, and reach

- Minimum touch target: 56 CSS px in both dimensions.
- Primary targets (Jump, Interact): 72–96 CSS px.
- Minimum gap between adjacent targets: 10 CSS px; 12 CSS px where practical.
- Buttons stay inside the bottom thumb arcs; avoid the top half and the center
  of the screen.
- Use `env(safe-area-inset-*)`; do not place controls under the home indicator,
  notch, or rounded corners.
- Labels and icons are both present. Do not rely on icon shape or colour alone.
- High contrast and reduced-motion variants follow the existing controller CSS.

### 4. Multi-touch behaviour

- One pointer owns one control at a time.
- Move + Jump must work simultaneously with two thumbs.
- Double-tap Dash must not require a third finger; it is a gesture on the same
  movement thumb. The other thumb remains free for Jump.
- Releasing a pointer releases its control; blur, visibility change, pause, and
  teardown release every control.
- A pointer that starts on a movement button may slide across the midpoint to
  change direction without lifting, if the implementation can do so without
  losing pointer ownership. This is an enhancement, not a requirement.
- Except for the Dash gesture, no action requires a hold, a swipe, or a
  gesture. Dash is gesture-only in Phase 6.5; the keyboard slot is its fallback
  (ADR-0087).

### 5. Dialogue and choice modes

- Dialogue replaces the **action area**, never the movement area.
- In `talk` mode, Continue and Back replace the action row; movement and Jump
  remain available because linear dialogue does not freeze the owner. The Dash
  gesture remains enabled.
- In `choice` mode, the owner is frozen; choice buttons and Back replace the
  action row, Jump is hidden or visibly disabled, and the Dash gesture is
  disabled and reset.
- The layout returns to `explore` when the conversation ends or is cancelled.

### 6. Optional left-handed mirror

A local controller setting may mirror the two zones for left-handed players.
The default is right-thumb Jump. The mirror is a controller-page preference,
not a host setting, and never changes the input protocol.

## Consequences

**Easier:**

- Move + Jump is comfortable with two thumbs.
- Dash stays in the movement zone; it does not consume a right-thumb slot.
- Jump is always in the same place; players build muscle memory.
- The right thumb has a clear primary, secondary, and tertiary target.
- Dialogue can replace the action area without moving movement.
- The layout is testable by geometry and by touch.

**Harder:**

- The controller board DOM and CSS need a full rebuild.
- The touch model needs a movement rocker, a double-tap detector, and
  multi-touch tests.
- Dialogue and ability states add layout variants.
- Small phones need a compact size tier without breaking the target floor.

**Constrained:**

- Landscape only.
- No jump or action in the left movement zone.
- No portrait controller board.
- No context-remapped buttons; context may only highlight.
- No on-phone Dash button in Phase 6.5; Dash is gesture-only, with the keyboard
  slot as the fallback.
- No target below 56 CSS px.

## Alternatives considered

- **Keep the current layout and enlarge buttons.** Rejected: the problem is
  placement and hierarchy, not only size.
- **Virtual joystick on the left.** Rejected for now: the game needs digital
  left/right, and a drag stick adds accidental-input and test complexity without
  a gameplay benefit.
- **Single contextual action button.** Rejected: ADR-0037 rejected context-only
  interactions because several valid targets can be nearby.
- **Dedicated Dash button next to Jump.** Rejected because the user wants a
  double-tap movement gesture and the right cluster is crowded. No on-phone
  button is rendered in Phase 6.5 (ADR-0087).
- **Portrait board.** Rejected: the shared screen is landscape and portrait
  leaves too little thumb space for a platformer.
- **Move jump to the left but add a second jump on the right.** Rejected:
  duplicate controls create ambiguity and double-input risk.

## Tests

- Geometry: on 844×390 and 667×375 viewports, Jump is in the right half,
  movement is in the left half, no target overlaps, and every target meets the
  56 CSS px floor.
- Touch: hold right + tap Jump; double-tap the ◀ or ▶ button to Dash; release
  all on blur and visibility change.
- Layout: no action target appears in the left movement zone; no movement target
  appears in the right action zone; no Dash button is rendered.
- Dialogue: `talk` keeps movement + Jump and the Dash gesture; `choice` disables
  and resets them.
- Accessibility: labels, focus states, high contrast, reduced motion, safe-area
  insets.
- Manual: two-thumb reach test on the target phone in landscape.

## References

- [Microsoft GDK — touch control design guidance](https://learn.microsoft.com/en-us/gaming/gdk/docs/features/common/game-streaming/building-touch-layouts/game-streaming-tak-designers-guide?view=gdk-2604)
- [Game Accessibility Guidelines](https://gameaccessibilityguidelines.com/full-list/)
- ADR-0037 — per-player abilities and fixed verbs
- ADR-0069 — controller latency and input feel
- ADR-0086 — ability disclosure and feedback
- ADR-0087 — controller gesture vocabulary and discoverability
