# ADR-0048: Half-resolution authoring with 2× nearest-neighbour display

- **Status:** Accepted
- **Date:** 2026-10-29
- **Deciders:** Snorre
- **Related:** ADR-0033, ADR-0047, ADR-0049

## Context

The runtime display sizes are fixed:

- players 28×44 (`PLAYER_WIDTH`, `PLAYER_HEIGHT`)
- entities 36×36 (`ENTITY_SIZE`)
- tile 32×32 (`tileSize`)
- badge 32×32 HUD stamp

The renderer is currently smooth-scaled (`pixelArt: false`, `antialias: true`), and the sky uses `coverScale * 1.4`, which is a fractional scale. Both produce blurred or uneven pixels. Changing the display sizes would change physics, collision, camera framing, and the level layout.

The chosen look needs a chunky 2× grid without touching gameplay or room geometry.

## Decision

Author pixel art at **half the display size** and let Phaser upscale it by exactly 2× with nearest-neighbour filtering.

| Asset | Author/source | Display |
|---|---|---|
| Player | 14×22 | 28×44 |
| Entity | 18×18 | 36×36 |
| Material atlas frame | 32×32, 2×2 clusters | 32×32 |
| Badge | 16×16 | 32×32 |
| Sky | 640×368 | 1280×736 cover |
| Parallax | 1024×512, 2×2 clusters | tile 1:1 |

Render and background rules:

- `pixelArt: true`, `antialias: false`, `roundPixels: true`.
- Round the sky's cover scale to an integer; remove the fractional `1.4` bleed for pixel mode.
- Parallax layers stay 1:1 and use a 2×2 minimum cluster grid so their effective density matches the sprites.
- Material atlas frames keep the engine’s existing **32×32 frame size** and use a 2×2 minimum cluster grid. Do not change the frame grid to 16×16; only the pixel density inside each frame changes.
- Add `image-rendering: pixelated` to the canvas and UI images.
- These are the only approved render changes under ADR-0033. No gameplay, physics, puzzle, or level-layout code changes.

## Consequences

**Easier:**

- Crisp pixels at the 1280×720 capture size.
- No physics or layout changes.
- Small source files and exact 2× math.
- The same rule applies to every future level and pack.

**Harder:**

- Background scaling must be integer-safe; the current `coverScale * 1.4` path must change.
- Assets must be authored at source size, not exported at display size.
- UI images need explicit pixelated rendering.
- Review must check both the 400% source view and the 2× display view.

**Constrained:**

- No fractional scale, no 1.5× or 3× art, no smooth filtering.
- No 28×44 player exports, no 36×36 entity exports, no 32×32 tile exports.
- No mixed pixel densities within one asset or across the kit.

## Alternatives considered

- **Native 1× at display size** — rejected: less chunky, and the 2× grid is harder to enforce.
- **True low-res virtual canvas (320×180 or 426×240)** — rejected: requires redesigning room scale, camera, physics, and UI.
- **Full-res authoring with 2×2 clusters** — rejected: larger files, easier to drift off-grid, and the runtime grid is not enforced.
- **Keep the smooth renderer** — rejected: blurs pixel art and produces uneven pixels on FIT scaling.

## References

- [`docs/m3/asset-requirements-v01.md`](../m3/asset-requirements-v01.md), §3 and §6
- [`src/world/create-game.ts`](../../src/world/create-game.ts), [`src/world/background.ts`](../../src/world/background.ts), [`src/world/physics.ts`](../../src/world/physics.ts), [`src/world/room-scene.ts`](../../src/world/room-scene.ts)
- [ADR-0033](../shrinkonauts/base-game/adr/0033-final-asset-integration-timing.md)
- [ADR-0047](0047-pixel-art-visual-direction.md)
