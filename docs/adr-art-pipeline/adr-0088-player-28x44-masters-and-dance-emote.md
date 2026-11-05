# ADR-0088: 28×44 player masters and the dance emote

- **Status:** Accepted
- **Date:** 2026-11-05
- **Deciders:** Snorre
- **Related:** ADR-0048, ADR-0062, ADR-0063, ADR-0072, ADR-0075,
  ADR-0087

## Context

The player character was authored at a 14×22 master cell and displayed at
28×44 via 2× nearest-neighbour scaling. That preserved a chunky pixel grid, but
it discarded most of the source detail. The new 64-frame P1 and P2 dance sheets
make the loss obvious: the wide poses are squeezed into a narrow 14×22 cell and
lose limb and visor readability.

The existing animation pipeline already handles one-shot jump/land clips and
looping walk/fall clips. The dance is a presentation-only emote and does not
affect physics, abilities, or puzzle state.

## Decision

### 1. Player master cell

- P1/P2 runtime sheets use a **28×44 master cell**.
- The display size remains **28×44**, so the sprite is rendered 1:1.
- The physics body remains 28×44. No camera, collision, level-layout, or save
  format change is required.
- All existing player clips (idle, walk, jump, fall, land) are rebuilt at 28×44
  from their original sources. The old 14×22 masters remain only as historical
  working files.
- The hub tiny astronaut remains 14×22 and is produced by downscaling the
  28×44 idle, because the hub layout expects the smaller asset.

### 2. Dance emote

- `sprite.player.p1.dance` and `sprite.player.p2.dance` are 64-frame,
  30 fps, non-looping sheets.
- The dance is a one-shot emote. It is triggered by P1 `T` or P2 `L`, and by a
  `Dance` button on the phone controller.
- The player must be active, grounded, and stationary to start it. Walking,
  jumping, or falling interrupts it.
- The input is a presentation-only `dance` boolean. The runtime simulation
  ignores it; `RoomScene` passes the input edge to `PlayerAnimator` and the
  animator state machine owns the clip.
- The wire field is optional on read (`missing` means `false`) so an older
  controller cannot be rejected for omitting it.

## Consequences

- Player sprites keep more source detail without changing their on-screen
  footprint or the level geometry.
- PNG sheets are larger than the old 14×22 64 KB guideline; animation previews
  and manifest metadata remain the review gate.
- The dance asset is additive. Packs that do not declare it fall back to idle.
- The controller gains one always-available emote button outside the
  ability-gated verb set. Dialogue and choice modes still hide the action
  panel.

## Alternatives considered

- **Keep 14×22 and only enlarge the display.** Rejected: this makes the pixels
  chunkier without recovering detail.
- **Use 28×44 masters and enlarge the display/physics.** Rejected: it changes
  level geometry and camera composition.
- **Treat dance as a gameplay ability or control verb.** Rejected: it would
  add cooldown, feedback, and protocol surface for a purely cosmetic emote.
- **Loop the dance while held.** Rejected: the source is a choreographed
  one-shot, and a tap-to-play emote is simpler on both keyboard and touch.

## Validation

- P1/P2 render correctly at 28×44 in idle, walk, jump, fall, land, and dance.
- Dance plays one full cycle, returns to idle, and is interrupted by movement
  or leaving the ground.
- Keyboard and phone-controller dance both reach the owning player.
- A missing dance sheet or missing wire field degrades to idle/false without
  an error.
- `npm test`, `npm run build`, and `npm run pack:validate` pass.
