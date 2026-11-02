# ADR-0071: Background space, sampling, and composition

- **Status:** Proposed
- **Date:** 2026-11-02
- **Deciders:** Snorre
- **Related:** ADR-0031, ADR-0047, ADR-0048, ADR-0070, ADR-0072
- **Extends:** ADR-0031 (layered background composition)
- **Supersedes:** the “sky is `fit: "cover"`, scaled from the room, displayed
  1×” portion of the M3 background rules where it conflicts with stage-space
  framing. The current pretty-sky asset and its licence remain in force.

## Context

The current `03-nerve-forest` background is a single **1280×736** painted WebP,
displayed at **1× cover** over a 1280×736 room. It is the most detailed layer
on screen and fills the entire viewport. The play band is a thin strip at the
bottom, so the sky dominates the composition.

The background renderer currently has one behaviour:

- image layers are anchored around the initial camera view,
- `fit: "cover"` computes its scale from the **room** size,
- the layer is positioned with scroll factors and rendered in world space,
- every texture uses the global nearest-neighbour sampling.

That works while the camera is pinned at zoom 1. It does not work when the
camera zooms or when the game renders into a stage band:

- A world-space 1280×736 painted plate at camera zoom 2 is nearest-upscaled to
  2×, exposing blocky pixels that do not match the sprite grid.
- A `cover` scale computed from the room ignores the stage aspect. The sky may
  be cropped in the wrong place or show too much of its busiest area.
- There is no per-layer way to crop, scale, anchor, sample, or quiet a
  background. The only lever is `tint`/`opacity`, and the M3 document removed
  the `nerve-fibers` overlay rather than solving the composition.

The future layered target is different: a quiet **640×368** sky at 2× display
plus **1024×512** far/mid/near pixel layers tiled in world space. Those layers
belong on the pixel grid and should scale with the camera. The pretty plate is
a painted exception and should not.

There is also a contract drift: `pack-schema.md` documents `offset` and `anchor`
on background layers, but `parseBackgroundLayer` does not parse either field.
This ADR aligns the documented contract with the data model.

## Decision

Extend `RoomBackgroundLayer` with an optional composition block:

```json
{
  "assetId": "bg.nerve_forest.sky",
  "depth": -40,
  "parallaxX": 0.02,
  "parallaxY": 0,
  "fit": "cover",
  "space": "screen",
  "scale": 1,
  "anchor": "bottom",
  "focus": { "x": 0.5, "y": 0.62 },
  "sampling": "linear",
  "opacity": 0.92,
  "tint": "#c9d4cf"
}
```

Rules:

1. **`space: "screen" | "world"`.** `world` is the current behaviour: the layer
   is positioned in world coordinates and scales with camera zoom. `screen`
   anchors to the **stage rect** from ADR-0070 and ignores camera zoom; it is
   for painted plates that must stay at 1× display. Default: `world`.
2. **`fit: "cover"` uses the stage rect** for `screen` layers and the room for
   `world` layers. `focus` (`x`/`y`, 0..1) selects the crop point for cover.
   `anchor` (`top`/`center`/`bottom` or `{x,y}`) controls the alignment.
3. **`scale`.** `screen` layers may use a fractional scale only when
   `sampling: "linear"`. `world` pixel layers must use an integer scale and
   `sampling: "nearest"`. Default: `1`.
4. **`sampling`.** `linear` for painted plates; `nearest` for pixel art. The
   renderer sets the texture filter per layer rather than relying on the global
   `pixelArt` setting. Default: `nearest`.
5. **`quietZone` (optional).** A config-only dither scrim behind the play band,
   used when crop/tint/opacity are not enough. It is a stage overlay, not a new
   asset ID:

   ```json
   "quietZone": { "top": 0.55, "bottom": 0.92, "opacity": 0.18, "dither": "bayer2" }
   ```

6. **`offset`/`anchor` become real.** Parse and validate the fields already
   documented in `pack-schema.md`. Missing fields default to the current
   centre/zero behaviour.
7. **No new asset IDs.** The pretty sky remains `bg.nerve_forest.sky`. Far,
   mid, and near remain the future layered target; this ADR does not wire them.
8. **No gameplay changes.** Background composition is presentation only.

For `03-nerve-forest`, the pretty sky becomes a **screen-space painted plate**:

- it covers the 1280×504 stage,
- `focus.y: 0.62` crops toward the roots/lower forest and away from the bright
  pink canopy,
- a small `scale`/`anchor` adjustment removes the busiest edge,
- `sampling: "linear"` keeps the painted detail at 1×,
- `opacity`/`tint` reduce its contrast behind the play band.

The future quiet sky and far/mid/near layers remain `world` space with
`sampling: "nearest"` and integer scaling, as already specified in the M3
background requirements.

## Consequences

**Easier:**

- The painted pretty sky survives the camera-framing change without being
  nearest-upscaled.
- The sky can be cropped and quieted per room with JSON, not new art.
- The future pixel-layer stack has a clear `world`/`nearest` path.
- The documented `offset`/`anchor` fields stop being dead contract.
- Background composition can be reviewed independently from gameplay.

**Harder:**

- `LayeredBackground` must handle two spaces, stage-relative cover, per-layer
  sampling, and focus/anchor.
- Camera-relative anchoring must use the camera’s world view rather than the
  old `camera.width / 2 + scroll` math.
- Tests must cover screen/world space, stage crop, sampling, and both-axis
  tiling for future layers.
- A screen-space plate can look detached if parallax is too strong; keep the
  sky’s parallax low.

**Constrained:**

- Pixel layers must use integer scale and nearest sampling.
- Painted layers may use linear sampling and fractional scale, but must not be
  palette-quantised or converted to lossy formats for size.
- No busy background detail behind the play band in the 03 preset.
- No new background IDs and no wiring of far/mid/near in this pass.

## Validation

- At 1280×720, the 03 sky covers the 1280×504 stage with no gaps and no
  nearest-upscale blocks.
- The pink canopy is cropped or dimmed enough that the player and HUD remain
  readable; the play band has a quiet background.
- `screen` layers ignore camera zoom; `world` layers scale with it.
- `focus`, `anchor`, `scale`, `opacity`, and `tint` are parsed and validated.
- A pixel layer with `sampling: "nearest"` and a non-integer scale is rejected.
- Future far/mid/near still pass the both-axis 2×2 seam check at 2048×1024 and
  1280×720 when they are wired.
- `npm test`, `npm run pack:validate`, and the 1280×720 capture review pass.

## Alternatives considered

- **Keep the sky world-space at 1×** — rejected: camera zoom would nearest-upscale
  the painted plate 2× and expose the mismatch.
- **Re-author the pretty sky at 640×368** — rejected for now: it would lose the
  painted detail the current direction deliberately keeps. The 640×368 quiet
  sky remains the future layered target.
- **Use a separate background camera** — deferred: it can achieve the same
  result, but adds a second camera and more render-order complexity. The
  `space` field gives the same control with less code.
- **Add a new overlay asset** — rejected: no new asset IDs; `quietZone` is a
  config-only dither scrim.
- **Keep only `tint`/`opacity`** — rejected: it dims the whole plate but cannot
  crop the busy canopy or keep the plate at screen scale.

## References

- [`background-asset-requirements-v01.md`](../m3/background-asset-requirements-v01.md)
- [`asset-requirements-v01.md`](../m3/asset-requirements-v01.md) §3, §4.5, §6
- [`src/world/background.ts`](../../src/world/background.ts)
- [`src/world/room-scene.ts`](../../src/world/room-scene.ts)
- [`03-nerve-forest/room.json`](../../public/packs/anatomy-reflex/levels/03-nerve-forest/room.json)
- [`pack-schema.md`](../shrinkonauts/base-game/contracts/pack-schema.md) §4
- [ADR-0031](../shrinkonauts/base-game/adr/0031-layered-background-composition.md)
- [ADR-0047](../adr-m3/0047-pixel-art-visual-direction.md)
- [ADR-0048](../adr-m3/0048-half-resolution-pixel-rendering.md)
- [ADR-0070](0070-stage-bands-and-play-band-camera.md)
