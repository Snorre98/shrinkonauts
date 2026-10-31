# Draft Plan: Player-Held Scanner

**Status:** Draft — not accepted · 31 October 2026

**Owner:** Snorre

**Related:** [`asset-requirements-v01.md`](asset-requirements-v01.md) §4.4, §5.2, §5.6, §8.17, §8.18, §8.23 · ADR-0060–0064 · [`src/world/room-scene.ts`](../../src/world/room-scene.ts) · [`src/world/physics.ts`](../../src/world/physics.ts) · [`src/world/effects.ts`](../../src/world/effects.ts) · [`src/world/simulation.ts`](../../src/world/simulation.ts) · [`src/game/runtime.ts`](../../src/game/runtime.ts)

## Purpose

This plan captures the “scanner as a distinct held tool” idea before it is lost in
the broader M3 art work. The current asset document treats the scanner as a
2×2-pixel detail on the astronaut’s gauntlet, plus an instant `scan` ability.
The mental model is a separate handheld device that the character visibly holds.

The plan exists to answer three questions later:

1. **Is a held scanner possible with the current renderer?**
2. **What is the smallest change that gives the character a visible scanner?**
3. **What would a full equipment/attachment system cost?**

## Justification

A separate scanner would improve three things:

- **Character read.** The scanner becomes a recognisable tool, not a 2×2
  detail that disappears at 28×44.
- **Scan affordance.** The player sees *where* the scan comes from; the existing
  ring effect only marks the target.
- **Art leverage.** The scanner can be authored once and reused by P1/P2 and
  future characters, instead of baking it into every player frame.

It is not free: a separate scanner is a **new asset ID** and a **small renderer
feature**. Under the current M3 rules that is a scope change, so it needs an
explicit decision rather than being smuggled into the player prompt.

## Problem statement

The current player is a single `Phaser.GameObjects.Image`. It has no hand
socket, no held-item layer, and no equipment state. The existing carry system is
a physics convenience for puzzle props, not a hand attachment.

## Current state

| Capability | Current implementation | Consequence |
|---|---|---|
| Player rendering | One image, bottom-centre origin, `setDisplaySize(28, 44)`, `setFlipX` for facing | No hand attachment point |
| Player anchors | `effects.ts` resolves `{kind: "player", socket}` with default centre/top/bottom/left/right anchors | No `hand` socket; anchors position effects, not persistent sprites |
| Puzzle carry | Matter constraint at `{x: ±24, y: -8}`; one carried prop; `carry` ability | Wrong abstraction for permanent equipment; conflicts with the ACh token and co-op roles |
| Scan action | Instant Q/period action; `SCAN_RANGE = 78`; `fx.affordance.ring`; `audio.cue.scan` | No scan mode or scanner pose |
| Scanner art | “Scanner gauntlet” in the P1/P1-walk prompts; 2×2 px at source | No independent scanner asset |
| Scan targets | `sprite.scan.*` prompts and world entities | The scan surface exists, but the tool does not |
| HUD icon | `ui.icon.scan` is declared but deferred | A UI icon, not a held device |

## Goals

- Add a distinct scanner sprite that the player visibly holds.
- Keep it independent of the player texture and the P2 palette LUT.
- Follow the player, flip with facing, and hide when the player is inactive.
- Work with the current static player and remain compatible with a future walk
  sheet.
- Avoid interfering with the puzzle carry system or the scan action.
- Keep the first slice small enough to review and test.

## Non-goals

- Pickup, drop, inventory, or equipment UI.
- Physical collision for the scanner.
- A new scan gameplay mode or targeting reticle.
- Changing scan range, scan targets, or concept-log behaviour.
- Automatically adding the scanner to the current M3 21-image scope.

## Options

| Option | Approach | Code impact | Art impact | Fit |
|---|---|---|---|---|
| **A. Cosmetic hand attachment** | Separate scanner image positioned at a hand socket each frame | Small | New scanner sprite; possibly a holding hand pose | **Recommended** |
| **B. Reuse carry as equipment** | Scanner is a carryable prop with a permanent constraint | Medium | Prop sprite | If pickup/drop is required |
| **C. Full equipment slot** | Add `PlayerState.heldItemId`, equip/unequip actions, attachment renderer | Larger | Scanner sprite + sockets + poses | Future tools/inventory |
| **D. Bake into player frames** | Draw the scanner into P1/P2 and walk frames | None | Redraw player frames | Simplest, least flexible |
| **E. HUD-only scanner** | Scanner is a UI icon/panel; character does not hold it | Small | `ui.icon.scan` | If a held tool is not essential |

## Recommended approach

**Option A: a cosmetic hand attachment.** It gives the character a visible
scanner without turning the scanner into a physics prop or consuming the carry
slot.

### Art

- New asset ID: **`sprite.held.scanner`** (preferred) or
  `sprite.prop.scanner` if the asset register should stay on the existing
  `sprite.prop.*` prefix.
- Source size: roughly **6×8 to 8×10 px**, displayed at **12×16 to 16×20 px**.
  Do not use the existing 18×18 prop size; a 36×36 display scanner would be too
  large next to a 28×44 player.
- Palette: bone/teal body, joint-cyan lens, 1px ink outline, transparent
  background, no baked glow or shadow.
- Pose: the current P1 idle has a scanner gauntlet. Either mount the scanner
  over the gauntlet or redraw the hand as a holding pose. The holding pose is
  clearer but requires a new P1 master and a P2 LUT pass.
- P1/P2: share one scanner texture. If P2 needs a different scanner colour,
  author a separate variant; do not include the scanner in the player accent
  mask.

### Hand socket

Start with a code constant in display space, relative to the player’s
bottom-centre origin:

```ts
// Example only; tune against the approved 14×22 master.
const PLAYER_HAND = { x: 8, y: -18 }; // right-facing
```

At 14×22 source, this is roughly source `(11, 13)`. When the player faces left,
mirror the x offset and flip the scanner.

If the player becomes animated, move the socket into the animation descriptor
and provide a hand point per frame; a fixed offset will drift as the arm moves.

### Runtime rendering

Add a `playerItems` map in `RoomScene`, separate from `playerSprites`:

```ts
// createPlayer()
this.playerItems[id] = this.add
  .image(player.x, player.y, scannerKey)
  .setOrigin(0.5, 0.5)
  .setDepth(10.5)
  .setDisplaySize(12, 16);
```

In `syncPlayers()`:

```ts
const handX =
  player.facing === 1 ? player.x + PLAYER_HAND.x : player.x - PLAYER_HAND.x;
const handY = player.y + PLAYER_HAND.y;

item
  .setPosition(handX, handY)
  .setFlipX(player.facing === -1)
  .setVisible(player.active);
```

Keep the scanner out of `playerSprites` so the existing shadow and effect anchors
still resolve to the player body.

### Scan feedback

The `scan` action is instant; do not invent a scan mode for the first slice.

- On scan, tween the scanner forward/up for about 100–150 ms and flash the lens.
- Keep the existing `fx.affordance.ring` on the target.
- Optional: add a beam effect from
  `{kind: "player", id, socket: "hand"}` to the scanned entity. This is an
  effect-system task, not a Ludo prompt.
- If the scanner is always held, it is part of the silhouette. If it is only
  raised during scan, define the rest/raised states and the tween.

### Animation

For the current static sprite, one hand offset is enough.

For a future walk sheet, the hand moves. Add per-frame hand sockets to the
animation descriptor, for example:

```json
{
  "sockets": {
    "hand": [[10, 13], [11, 13], [12, 13], [11, 13]]
  }
}
```

If that is too much work, bake the scanner into the walk frames instead; a
separate attachment at a fixed offset may visibly detach during the cycle.

### Data and manifest

- Add `sprite.held.scanner` to the pack manifest with a real `src` and licence.
- Add it to the pack’s declared sprite list if the validator requires it.
- Update the asset register with a **held-item size class** and an explicit
  exception to the 18×18 prop rule.
- Add the prompt-log row with source sheet, frame range, and variant fields.
- If `sprite.held.*` is adopted, update the ID grammar in
  `asset-requirements-v01.md` §12.3.

## Implementation phases

| Phase | Work | Exit condition |
|---|---|---|
| 0 | Decide scope: M3, M3.5, M4, or bake-in | Written decision; no silent scope creep |
| 1 | Draw and approve the scanner at 12–16 px display | Reads at 28×44 on `#101a20`; no baked glow |
| 2 | Add the hand socket and scanner overlay | P1/P2 hold it; both facings align; inactive players hide it |
| 3 | Add scan raise/flash feedback | Scan still works; no input block; no physics change |
| 4 | Add tests and screenshots | Both facings, both players, dash, inactive, scan |
| 5 | Update manifest, licence, asset register, prompt log | `pack:validate` passes |
| 6 | Optional beam effect | Visible source-to-target line; no gameplay change |
| 7 | Optional equipment slot | Pickup/drop works without touching the carry slot |

## Acceptance criteria

- The scanner is visible at the player’s hand, not floating at the hip.
- P1 and P2 both hold it; it flips correctly when facing changes.
- It is hidden when the player is inactive and follows dash movement.
- It does not consume the carry slot or require the `carry` ability.
- It does not change scan range, target selection, concept-log behaviour, or
  physics.
- The scanner texture is independent of the player palette LUT; P2’s orange
  suit does not recolour it.
- The scanner reads at 28×44 without dominating the player silhouette.
- The asset is within the pixel-art rules: 1px outline, palette-only colours,
  clean alpha, no anti-aliasing, no baked shadow.
- `npm run pack:validate` and the art validator pass.
- The prompt log, licence, and asset register are updated.

## Risks and open questions

| Risk / question | Mitigation / decision |
|---|---|
| This adds a new asset ID to M3 | Decide scope explicitly; otherwise keep it post-M3 or bake it in |
| Current P1 hand is a gauntlet, not an open grip | Mount over the gauntlet or redraw the hand as a holding pose |
| A 36×36 prop-sized scanner would be too large | Add a held-item size class at 12–20 px display |
| Fixed hand offset drifts during walk animation | Add per-frame hand sockets or bake the scanner into the walk frames |
| P2 palette LUT recolours the scanner | Keep the scanner as a separate texture; do not add it to the accent mask |
| Reusing carry conflicts with the ACh token | Do not use the carry slot; add an equipment slot if pickup/drop is needed |
| Scan is instant, not a mode | Keep the scanner always held or use a short raise/flash tween |
| `ui.icon.scan` is deferred | Decide whether the HUD also needs the icon; it is not the held tool |
| The scanner may obscure the player silhouette | Check at 28×44 on dark teal and with both facings |
| New ID prefix `sprite.held.*` needs contract updates | Either update the grammar or reuse `sprite.prop.scanner` with a documented size exception |

## Decision checklist for catch-up

- [ ] Is the scanner in M3, M3.5, M4, or baked into the player?
- [ ] Is it always held, or only raised during scan?
- [ ] Is the asset ID `sprite.held.scanner` or `sprite.prop.scanner`?
- [ ] Is the holding hand a redraw or a mount over the existing gauntlet?
- [ ] Does P2 share the scanner texture or get a variant?
- [ ] Is a beam effect required, or is the ring + flash enough?
- [ ] Is pickup/drop required, or is the scanner permanent equipment?
- [ ] If animated, are per-frame hand sockets accepted?

## References

- [`docs/m3/asset-requirements-v01.md`](asset-requirements-v01.md) — player
  rules, scanner gauntlet, scan targets, audio cue, deferred UI assets.
- [`docs/adr-art-pipeline/0060-source-work-runtime-asset-layers.md`](../adr-art-pipeline/adr-0060-source-work-runtime-asset-layers.md)
  — source/working/runtime layers.
- [`docs/adr-art-pipeline/0061-palette-lut-sprite-variants.md`](../adr-art-pipeline/adr-0061-palette-lut-sprite-variants.md)
  — palette variants and P2 derivation.
- [`docs/adr-art-pipeline/0064-orange-p2-suit-palette-swap.md`](../adr-art-pipeline/adr-0064-orange-p2-suit-palette-swap.md)
  — P2 orange palette permutation.
- [`src/world/room-scene.ts`](../../src/world/room-scene.ts) — player and entity
  rendering.
- [`src/world/physics.ts`](../../src/world/physics.ts) — carry constraint and
  player body.
- [`src/world/effects.ts`](../../src/world/effects.ts) — player/entity anchors
  and effect positioning.
- [`src/game/runtime.ts`](../../src/game/runtime.ts) — `scan` action, range, and
  feedback cue.
- [`src/world/input.ts`](../../src/world/input.ts) — Q/period scan input.
- [`public/packs/anatomy-reflex/assets.final.json`](../../public/packs/anatomy-reflex/assets.final.json)
  — manifest and deferred `ui.icon.scan` placeholder.
