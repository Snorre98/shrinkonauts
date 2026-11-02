# Source art

This directory is the **source layer** from ADR-0060. It is not served by Vite
and must never be referenced by a runtime manifest.

```
art-source/
  characters/<character>/
    ludo/<action>-<frames>f-<date>/   # immutable Ludo exports + provenance
    working/                          # cleaned masters, palettes, clips.json
  nanobanan/                          # magenta-keyed concept plates
    keyed/                            # generated keyed PNGs (ignored)
  previews/                           # generated GIFs/contact sheets
```

Rules:

- Keep every Ludo PNG and its JSON together.
- Do not edit the original exports. Work on copies in `working/`.
- Record prompt, model, seed, plan, and licence in the folder README.
- Runtime output belongs in `public/`, not here.
- `working/frames/`, `working/tmp/`, and `nanobanan/keyed/` are generated or
  intermediate; keep them out of the shipped bundle.

## Player sources

P1 (`characters/player-p1/ludo/`):

- `walk-49f-2026-10-29/` — 49-frame continuous walk, 264×352 per frame.
  This is the P1 walk and the idle frame-0 source.
- `walk-36f-2026-10-29/` — 36-frame jump take, 342×603 per frame. The folder
  name is historical: it contains the jump phases (idle, crouch, takeoff, air,
  landing, recovery). Runtime clips use frames 6–17 (jump), 18–27 (fall), and
  28–35 (land).

P2 (`characters/player-p2/`):

- `walk/` — 36-frame walk, 248×352 per frame.
- `jump/` — 36-frame jump, 304×528 per frame.

P2 is the approved bone-suit / joint-cyan visor concept from ADR-0065. It
supersedes the orange P2 permutation in ADR-0064.

## Slicing, building, and previews

Slice a Ludo sheet and write a GIF preview:

```bash
npm run art:slice -- \
  --sheet art-source/characters/player-p1/ludo/walk-49f-2026-10-29/<sheet>.png \
  --out art-source/characters/player-p1/working/frames/walk-49f \
  --gif art-source/previews/player-p1-walk-49f.gif
```

Build the POC player sheets from `working/clips.json`:

```bash
npm run art:build-player -- --character all --sampler downscale --write-runtime
```

Use `--sampler both` without `--write-runtime` to compare the semantic remaster
and the downscale + palette-quantize path before choosing runtime output.

`working/frames/` is ignored by git; previews are kept for review. The
profile-driven remaster (`npm run art:remaster`) classifies the source frame
into semantic roles and writes a palette-quantized master. Palette variants are
derived with `npm run art:variant` from the indexed master (ADR-0061 and
ADR-0065). See
[`characters/player-p1/working/README.md`](characters/player-p1/working/README.md)
for the profile, the Aseprite/LibreSprite touch-up path, and the commands.

The canonical P1 palette and P2 role map are defined in
`characters/player-p1/working/palette.json`; the reusable segmentation profile
is `characters/player-p1/working/remaster.json`. Raw Ludo frames are never
resized automatically into final art without an explicit build pass, and the
original exports are never edited.

## Background removal

`art-source/nanobanan/` contains magenta-keyed concept JPEGs. Remove the
background with:

```bash
npm run art:key -- \
  --in art-source/nanobanan/<plate>.jpeg \
  --out art-source/nanobanan/keyed/<plate>.png \
  --despill --trim \
  --preview art-source/previews/nanobanan/<plate>.png
```

The keyed review copies are not runtime assets. See
[`nanobanan/README.md`](nanobanan/README.md) for the plate list and status.
