# Player P1 working notes

This folder is the working layer from ADR-0060. `frames/` and `tmp/` are ignored
by git; `palette.json` and `clips.json` are source data and are tracked.

## Current status

`frames/walk-49f/` and `frames/walk-36f/` contain raw Ludo slices at 264×352 and
342×603. They are **not** cleaned 14×22 masters and must not be shipped. The
first deliverable is a cleaned static idle at 14×22, feet on the bottom padding
line, using only the approved ramps.

Do not regenerate P2 through Ludo. The P2 palette is a deterministic LUT of the
cleaned P1 master (ADR-0061 and ADR-0064).

## Master cleanup (Aseprite)

1. Open a grounded frame from `frames/walk-49f/` (for example `frame-000.png`)
   as a reference. Work at **14×22**, not at 264×352. The rough
   `tmp/player-p1-idle-14x22-normalized.png` can be used as a block guide, but it
   is not final art.
2. Trace or pixel-clean the silhouette on a transparent 14×22 canvas. Keep the
   feet on the bottom padding line, 0–1 px transparent margin, and a 1 px ink
   outline. Do not bake a shadow, ground, or text.
3. Load `palette.gpl` in Aseprite (**Palette → Load Palette**) so every entry is
   already on an approved ramp. The `*` names in the palette are role hints.
4. Use **Sprite → Color Mode → Indexed** after the palette is loaded. Keep
   semantic index groups:
   - `suit` — bone ramp
   - `visor` — nerve ramp
   - `tanks` — nerve ramp
   - `joints` — teal ramp
   - `accent` — joint ramp
   - `outline` — ink ramp
   - `grime` — bone-shadow ramp
5. Do not use the bone-shadow ramp for suit shading and the bone ramp for grime
   in the same master. A colour that belongs to two roles with different variant
   targets is ambiguous and the LUT tool will reject it.
6. Save the editable master as
   `working/master/player-p1-idle-14x22.aseprite` and export a flattened PNG as
   `working/master/player-p1-idle-14x22.png`.
7. Inspect at 2× (28×44) on `#101a20` and at 400% on the source pixels.

If Aseprite is not available, LibreSprite uses the same indexed-palette workflow.
Piskel can work, but its palette and indexed editing are less precise.

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

In Aseprite, duplicate the master and load `palette-p2.gpl` in the same index
order. The suit, visor/tank, and accent entries change colour; the pixel index
map stays identical. The visor rim stays on the ink indices and gets no cyan
glint.

Export the P2 copy as `working/variants/player-p2-idle-14x22.png`. Do not change
the pose, silhouette, frame cell, baseline, or timing.

## Commands

Normalize and validate the cleaned P1 master:

```bash
npm run art:normalize -- \
  --in art-source/characters/player-p1/working/master/player-p1-idle-14x22.png \
  --palette art-source/characters/player-p1/working/palette.json \
  --out art-source/characters/player-p1/working/master/player-p1-idle-14x22.normalized.png \
  --preview art-source/previews/player-p1-idle-2x.png \
  --scale 2 \
  --report art-source/characters/player-p1/working/tmp/player-p1-normalize.json
```

Generate P2 and its validation report:

```bash
npm run art:variant -- \
  --master art-source/characters/player-p1/working/master/player-p1-idle-14x22.normalized.png \
  --palette art-source/characters/player-p1/working/palette.json \
  --variant p2 \
  --out art-source/characters/player-p1/working/variants/player-p2-idle-14x22.png \
  --preview art-source/previews/player-p2-idle-2x.png \
  --scale 2 \
  --report art-source/characters/player-p1/working/tmp/player-p2-variant.json
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

Do not add final art to `public/` until the P2 sheet is approved. When it is,
replace the placeholder `sprite.player.p2` entry in
`public/packs/anatomy-reflex/assets.final.json` with its `src` and licence. The
asset ID is stable; no gameplay or manifest ID changes.
