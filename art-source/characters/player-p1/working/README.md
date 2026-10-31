# Player P1 working notes

This folder is the working layer from ADR-0060. `frames/` and `tmp/` are ignored
by git; `palette.json`, `remaster.json`, `clips.json`, and `master/` are source
data and are tracked.

## Current status

`frames/walk-49f/` and `frames/walk-36f/` contain raw Ludo slices at 264×352 and
342×603. They are **not** cleaned 14×22 masters and must not be shipped.

The pipeline has two stages:

1. `art:remaster` — deterministic first pass from a Ludo sheet to a 14×22
   palette-quantized master, with a false-colour class map and report.
2. `art:variant` — single-pass palette LUT from the P1 master to P2.

No paid editor is required for either stage. Aseprite, LibreSprite, Piskel,
GIMP, or Krita are optional for manual touch-up only.

Do not regenerate P2 through Ludo. The P2 palette is a deterministic LUT of the
cleaned P1 master (ADR-0061 and ADR-0064).

## Automated remaster (preferred)

`remaster.json` is the reusable profile. It defines the 14×22 cell, frame
selection, HSV class ranges, hole filling, shading quantiles, boundary outline,
and optional per-cell overrides. The same profile can be run on the 36f sheet or
future Shrinkonaut sheets.

```bash
npm run art:remaster -- \
  --sheet art-source/characters/player-p1/ludo/walk-49f-2026-10-29/A-complete-full-body-side-view-pixel-art-sprite-of-max-px-frames-49-rows-7-cols-7.png \
  --profile art-source/characters/player-p1/working/remaster.json \
  --palette art-source/characters/player-p1/working/palette.json \
  --frame 0 \
  --out art-source/characters/player-p1/working/master/player-p1-idle-14x22.png \
  --preview art-source/characters/player-p1/working/tmp/player-p1-remaster-8x.png \
  --class-preview art-source/characters/player-p1/working/tmp/player-p1-remaster-classes-8x.png \
  --scale 8 \
  --report art-source/characters/player-p1/working/tmp/player-p1-remaster-report.json
```

What the command does:

1. Slices the requested frame using the Ludo JSON rectangles.
2. Crops to the alpha bounds.
3. Classifies each source pixel into `outline`, `visor`, `accent`, `joint`,
   `grime`, or `suit`.
4. Fills enclosed holes in the visor/tank orange region, so its highlights stay
   in the visor role.
5. Majority-samples each 14×22 cell.
6. Maps the shading quantiles to the role's three-step ramp.
7. Forces a 1px ink boundary outline.
8. Applies any profile overrides.
9. Writes the master, an 8× preview, a false-colour class map, and a report.

Review in this order:

- `class-preview` — check the role segmentation, especially the visor, tanks,
  joints, and chest light.
- `preview` — check the actual P1 palette at 8×.
- `report` — check `lowConfidenceCells`; cells below `lowConfidence` are listed
  with coordinates and the winning class.

If a few cells are wrong, adjust the profile rather than drawing pixels:

- tighten or widen an HSV range in `classes`;
- change `shadingQuantiles` if the palette steps are too dark or too light;
- add a small override, for example:

```json
"overrides": [
  { "class": "visor", "rect": [5, 3, 6, 4] }
]
```

The `rect` is `[x, y, width, height]` in the 14×22 cell. Overrides are applied
after sampling and before the boundary outline.

## Optional manual cleanup

The remaster is a best-effort first pass. If a cell or two needs correction, use
any editor that can save a 14×22 PNG:

- **LibreSprite** — free, Aseprite-like; load `palette.gpl`.
- **Piskel** — free browser editor; add the hex values manually.
- **GIMP / Krita** — free; load the `.gpl` palette and use a 1px pencil.
- **Aseprite** — optional paid option; not required.

Rules for any touch-up:

1. Work at 14×22, feet on the bottom padding line, 0–1 px transparent margin.
2. Use only approved ramp entries; no anti-aliasing; alpha is 0 or 255.
3. Keep the role colours separate: suit bone, visor/tank nerve, accent joint,
   joints teal, outline ink, grime bone-shadow.
4. Re-run `art:normalize` after the edit, then `art:variant`.

Loading `palette.gpl` in an indexed editor is useful, but the remaster output is
already palette-quantized; RGB editing with the same hex values is enough.

## P1 → P2 palette swap

The approved P2 mapping is in `palette.json`:

| Role | P1 | P2 |
|---|---|---|
| suit | bone | orange `#813115 / #e59b34 / #ffd28a` |
| visor | nerve | bone |
| tanks | nerve | bone |
| accent | joint | muscle |
| joints | teal | teal |
| outline | ink | ink |
| grime | bone-shadow | bone-shadow |

`art:variant` applies this as a single-pass LUT. It does not need Ludo or an
indexed editor. `palette-p2.gpl` is only a convenience for manual comparison in
LibreSprite/GIMP/Krita.

## Commands

Generate the P1 master and review files:

```bash
npm run art:remaster -- \
  --sheet art-source/characters/player-p1/ludo/walk-49f-2026-10-29/A-complete-full-body-side-view-pixel-art-sprite-of-max-px-frames-49-rows-7-cols-7.png \
  --profile art-source/characters/player-p1/working/remaster.json \
  --palette art-source/characters/player-p1/working/palette.json \
  --frame 0 \
  --out art-source/characters/player-p1/working/master/player-p1-idle-14x22.png \
  --preview art-source/characters/player-p1/working/tmp/player-p1-remaster-8x.png \
  --class-preview art-source/characters/player-p1/working/tmp/player-p1-remaster-classes-8x.png \
  --scale 8 \
  --report art-source/characters/player-p1/working/tmp/player-p1-remaster-report.json
```

Validate the master is exactly on the approved palette:

```bash
npm run art:normalize -- \
  --in art-source/characters/player-p1/working/master/player-p1-idle-14x22.png \
  --palette art-source/characters/player-p1/working/palette.json \
  --out art-source/characters/player-p1/working/tmp/player-p1-normalized-check.png \
  --scale 2 \
  --report art-source/characters/player-p1/working/tmp/player-p1-normalize-check.json
```

The report should show `sourceOffPalettePixels: 0`, `quantizedPixels: 0`,
`maxDistance: 0`, and `alphaViolations: 0`.

Generate P2:

```bash
npm run art:variant -- \
  --master art-source/characters/player-p1/working/master/player-p1-idle-14x22.png \
  --palette art-source/characters/player-p1/working/palette.json \
  --variant p2 \
  --out art-source/characters/player-p1/working/master/player-p2-idle-14x22.png \
  --preview art-source/characters/player-p1/working/tmp/player-p2-remaster-8x.png \
  --scale 8 \
  --report art-source/characters/player-p1/working/tmp/player-p2-remaster-report.json
```

The variant command fails if the master is not 14×22, has semi-transparent
pixels, contains opaque pixels outside the semantic roles, or produces pixels
outside the target ramps. The report's `changedPixels` must be limited to the
suit, visor/tank, and accent masks.

## Validation checklist

- P1/P2 silhouettes are identical at 28×44.
- Only suit, visor/tank, and accent pixels differ; joints, outline, and grime are
  byte-identical.
- Orange appears only on the P2 suit.
- The bone visor reads as glass through the ink rim; no cyan glint.
- Every pixel is on an approved ramp; alpha is 0 or 255.
- No anti-aliasing or semi-transparent edges.
- Player PNG is ≤16 KB.
- `clips.json` uses the same frame cell, origin, and timing for P1 and P2.

## Runtime integration

Do not add final art to `public/` until the P1/P2 masters are approved. When they
are, replace the placeholder `sprite.player.p1` and `sprite.player.p2` entries
in `public/packs/anatomy-reflex/assets.final.json` with their `src` and licence.
The asset IDs are stable; no gameplay or manifest ID changes.
