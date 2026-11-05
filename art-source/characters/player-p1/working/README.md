# Player P1 working notes

This folder is the working layer from ADR-0060. `frames/` and `tmp/` are ignored
by git; `palette.json`, `remaster.json`, `clips.json`, and `master/` are source
data and are tracked.

## Current status

`frames/walk-49f/` and `frames/walk-36f/` contain raw Ludo slices at 264×352 and
342×603. They are **not** cleaned 14×22 masters and must not be shipped.

The POC runtime sheets are built and integrated at a **28×44 master cell**,
displayed at 28×44 (1:1). The earlier 14×22 masters are retained only as
history; the runtime is no longer built from them.

- P1 idle, walk, jump, fall, land, and dance are in
  `public/packs/anatomy-reflex/shared/sprites/`.
- `clips.json` is schema v2 and maps the walk-49, jump-36, and dance-64
  sources to the six clips.
- P2 uses its own approved walk/jump/dance sheets under
  `art-source/characters/player-p2/`; it is not derived from P1 for the POC.
- The `art:remaster` path still describes the old 14×22 semantic masters and is
  kept for comparison. Runtime builds use `--sampler downscale`.

The pipeline stages:

1. `art:remaster` — deterministic semantic pass from a Ludo sheet to a 14×22
   palette-quantized master, with a false-colour class map and report.
2. `art:variant` — single-pass palette LUT for derived colour variants.
3. `art:build-player` — packs the clip ranges into runtime sheets and writes
   build-time GIF/contact-strip previews.

No paid editor is required for any stage. Aseprite, LibreSprite, Piskel, GIMP,
or Krita are optional for manual touch-up only.

ADR-0065 supersedes the orange P2 concept. P2 is bone suit, joint-cyan visor
and tanks, nerve-amber accent. The palette LUT role map is kept for future
derived variants, but the approved P2 source sheets are used directly.

## Automated remaster (semantic path)

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

The P2 role map in `palette.json` is kept for future derived variants:

| Role | P1 | P2 |
|---|---|---|
| suit | bone | bone |
| visor | nerve | joint |
| tanks | nerve | joint |
| accent | joint | nerve |
| joints | teal | teal |
| outline | ink | ink |
| grime | bone-shadow | bone-shadow |

The POC uses the approved P2 source sheets directly, not the LUT. `art:variant`
still applies the role map as a single-pass LUT for other colour variants.
`palette-p2.gpl` is a convenience for manual comparison in
LibreSprite/GIMP/Krita; it matches the ADR-0065 role map, while the POC runtime
uses the approved P2 source sheets directly.

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

Build the POC player sheets and previews:

```bash
npm run art:build-player -- --character all --sampler downscale --write-runtime
```

Use `--sampler both` without `--write-runtime` to compare the semantic remaster
and the downscale + palette-quantize path before choosing runtime output.

Generate a derived P2 variant (optional; the POC uses the approved P2 sheets):

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
visor/tank and accent masks; the suit, joints, outline, and grime stay unchanged.

## Validation checklist

- P1/P2 share the 28×44 master cell, 28×44 display, bottom-centre origin, and
  clip names.
- P1 uses bone/amber/nerve/joint; P2 uses bone/joint/joint/nerve (ADR-0065).
- Orange appears nowhere on P2.
- Every pixel is on an approved ramp; alpha is 0 or 255.
- No anti-aliasing or semi-transparent edges.
- Runtime sheets are allowed to exceed the old 14×22 64 KB guideline because
  the master cell is larger; previews are still generated for review.
- `clips.json` uses the same cell, origin, and clip names for P1 and P2. P1 and
  P2 walk sources have different frame counts (49 vs 36); cycle duration is
  normalized by fps.

## Runtime integration

The POC runtime assets are already in
`public/packs/anatomy-reflex/shared/sprites/` and declared in
`public/packs/anatomy-reflex/assets.final.json`:

- `sprite.player.p1` / `sprite.player.p2` — static idle at 28×44.
- `sprite.player.p1.walk/jump/fall/land/dance` — `sheet` entries.
- `sprite.player.p2.walk/jump/fall/land/dance` — `sheet` entries.

The asset IDs are stable. The full ADR-0062 descriptor and generalized animation
system remain future work; the POC reads frame count, fps, and loop from the
manifest sheet metadata.
