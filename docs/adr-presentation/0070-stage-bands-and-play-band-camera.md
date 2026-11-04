# ADR-0070: Stage bands and play-band camera framing

- **Status:** Proposed
- **Date:** 2026-11-02
- **Deciders:** Snorre
- **Related:** ADR-0019, ADR-0020, ADR-0031, ADR-0033, ADR-0048, ADR-0071,
  ADR-0073
- **Supersedes:** the “room is one screen (or a small fixed camera area)”
  assumption in [`pack-schema.md`](../shrinkonauts/base-game/contracts/pack-schema.md)
  §4. The room data shape and collision grid remain unchanged.

## Context

`03-nerve-forest` is 40×23 tiles at 32 px = **1280×736** and the capture
viewport is **1280×720**. `cameraTarget()` clamps the room to the viewport, so
the camera can move only 16 px vertically. It is effectively a fixed screen.

That framing produces three problems:

- The player is **28×44**, or 6.1% of screen height and 0.13% of screen area.
- The playable band is rows 18–22 (5 tiles, 160 px) — about 22% of the room
  height. Rows 1–17 (74%) are empty air.
- The sky is 100% of the screen and is the most detailed, highest-contrast
  layer. The HUD then overlays the spawn: player 1 spawns around
  `(112, 640)`, under the bottom-left progress/feedback panel in the current
  capture.

The problem is not the level size or the 32 px tile size. It is that the
camera has no way to frame a declared play band and no way to use the vertical
space occupied by the HUD.

A camera zoom alone would enlarge everything but would still leave the HUD
covering the play band. Reducing the room height would fix only one room and
would discard the background composition. A single global scale constant would
not cover rooms with different play-band heights.

## Decision

Add an optional **presentation** contract with two levels:

- **Pack-level defaults** in `pack.json` (stage, camera defaults, canvas
  defaults).
- **Room-level overrides** in `room.json` (play band, camera framing,
  background overrides).

The game renders into an explicit **stage rect**. The HUD owns the bands above
and below the stage. The camera frames a declared **play band**, not the whole
room, and picks the largest integer zoom that fits.

```json
// pack.json
"presentation": {
  "stage": { "x": 0, "y": 96, "width": 1280, "height": 504 },
  "camera": { "maxZoom": 2, "padding": 8 }
}
```

```json
// levels/03-nerve-forest/room.json
"presentation": {
  "playBand": { "x": 0, "y": 17, "width": 40, "height": 6 },
  "camera": {
    "framing": "fit-play-band",
    "zoom": "auto",
    "followX": "players",
    "followY": "play-band",
    "snap": true
  }
}
```

Rules:

1. **Stage rect.** `presentation.stage` is expressed in logical canvas pixels
   (the 1280×720 capture space). It defines where the game camera renders. The
   remaining top/bottom bands belong to the DOM HUD. The stage defaults to the
   full viewport.
2. **Play band.** `presentation.playBand` is a tile-space rect. It declares the
   vertical slice the player must see. It defaults to the room’s solid-tile
   bounds.
3. **Auto zoom.** `camera.zoom: "auto"` chooses the largest integer `z` such
   that `playBand.height × tileSize × z` fits inside the stage with the
   configured `padding`, capped by `camera.maxZoom`. An explicit integer `zoom`
   overrides auto selection.
4. **Integer only.** Camera zoom is an integer. Fractional zoom is not allowed
   for pixel art; it produces uneven pixels even with nearest-neighbour
   sampling.
5. **Horizontal follow, vertical lock.** `followX: "players"` keeps the
   midpoint of active players in view. `followY: "play-band"` locks the camera
   vertically to the play band so jumps do not bob the horizon. Rooms with
   vertical exploration can set `followY: "players"` and a dead zone.
6. **Snap.** `camera.snap: true` rounds the final scroll to whole pixels.
7. **Tether cap.** Auto zoom must satisfy
   `stage.width / zoom >= maxTetherLength + margin` for the room’s tether
   policy. Normal tether is 560 px, so zoom 2 is the practical maximum at a
   1280-wide stage; stretch tether (1150 px) requires zoom 1.
8. **Defaults.** Missing `presentation` means the existing behaviour: full
   viewport, zoom 1, follow players on both axes. No room is forced to migrate.

For `03-nerve-forest`, the starting preset is:

| Value | Result |
|---|---|
| Stage | 1280×504 (96 px top band, 120 px bottom band) |
| Play band | 6 tiles (192 px world) |
| Auto zoom | 2 (384 px screen, 76% of stage) |
| Player on screen | 56×88 (17.5% of stage height) |
| Camera | horizontal follow, vertical play-band lock |

The 192 px play band is 6 tiles: one tile of headroom above the 5-tile
floor/platform band. The camera scrolls horizontally across the 40-tile room
instead of pinning the whole room.

## Consequences

**Easier:**

- Per-room framing becomes content data, not code.
- The player and play band become readable without changing physics, collision,
  tile size, or puzzle logic.
- The HUD can stop covering the spawn because the stage and HUD bands are
  explicit.
- The same contract covers rooms with different play-band heights and future
  levels.
- The sky is automatically reduced to the strip above the play band.

**Harder:**

- Camera math must be zoom-aware: `cameraTarget()` must use the world view
  (`stage / zoom`), not the screen viewport.
- World-to-screen anchors and effects must account for the stage offset and
  zoom. `src/ui/anchors.ts`, `src/world/effects.ts`, and `src/world/background.ts`
  currently assume zoom 1 and a full-canvas camera.
- The DOM HUD must align to the stage bands at different window sizes.
- Tests and screenshots must cover zoom, stage offset, and tether limits.

**Constrained:**

- No fractional camera zoom.
- No gameplay, physics, collision, puzzle, or level-geometry changes in the
  framing pass.
- The play band must fit inside the stage at the chosen zoom.
- The camera must not show outside the room bounds or through the HUD bands.

## Validation

- At 1280×720, the 03 preset produces a 1280×504 stage.
- The play band is at least **70%** of stage height (384 / 504 = 76%).
- The player is at least **15%** of stage height (88 / 504 = 17.5%) and is fully
  visible at spawn.
- The HUD panels do not overlap the play band.
- The camera scrolls horizontally across the room and never shows a gap at the
  room edges.
- `camera.zoom` is an integer; `camera.zoom: 2` passes the normal-tether check
  and fails the stretch-tether check.
- A room without `presentation` still boots at zoom 1 with the current camera.
- `npm test`, `npm run pack:validate`, and the 1280×720 capture review pass.

## Alternatives considered

- **Keep the fixed one-screen room** — rejected: it is the source of the
  28×44 player and 22%-high play band.
- **Global camera zoom only** — rejected: it enlarges the world but leaves the
  HUD covering the play band.
- **True low-res virtual canvas (640×360 or 320×180)** — rejected for now: it
  requires migrating room scale, physics, UI anchors, and tests. It remains a
  possible later step.
- **Reduce the room height** — rejected as the general solution: it fixes one
  room, removes the background composition, and does not scale to future
  levels. It remains a content option for a specific room.
- **Hardcoded per-room camera constants** — rejected: not config-oriented and
  not reviewable by content authors.
- **Fractional zoom** — rejected: breaks the pixel grid.

## References

- [`03-nerve-forest/room.json`](../../public/packs/anatomy-reflex/levels/03-nerve-forest/room.json)
- [`src/world/simulation.ts`](../../src/world/simulation.ts) (`cameraTarget`)
- [`src/world/room-scene.ts`](../../src/world/room-scene.ts) (camera setup)
- [`src/world/effects.ts`](../../src/world/effects.ts) (world anchors)
- [`src/ui/anchors.ts`](../../src/ui/anchors.ts) (world → screen projection)
- [`src/ui/layout.ts`](../../src/ui/layout.ts) (safe area)
- [`src/world/create-game.ts`](../../src/world/create-game.ts) (viewport)
- [`pack-schema.md`](../shrinkonauts/base-game/contracts/pack-schema.md) §4
- [ADR-0019](../shrinkonauts/base-game/adr/0019-canvas-game-dom-overlay.md)
- [ADR-0020](../shrinkonauts/base-game/adr/0020-accessibility-baseline.md)
- [ADR-0033](../shrinkonauts/base-game/adr/0033-final-asset-integration-timing.md)
- [ADR-0048](../adr-m3/0048-half-resolution-pixel-rendering.md)
- [ADR-0071](0071-background-space-and-composition.md)
- [ADR-0073](0073-hud-density-and-canvas-scaling.md)
