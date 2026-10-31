# Source art

This directory is the **source layer** from ADR-0060. It is not served by Vite
and must never be referenced by a runtime manifest.

```
art-source/
  characters/<character>/
    ludo/<action>-<frames>f-<date>/   # immutable Ludo exports + provenance
    working/                          # cleaned masters, palettes, clips.json
  previews/                           # generated GIFs/contact sheets
```

Rules:

- Keep every Ludo PNG and its JSON together.
- Do not edit the original exports. Work on copies in `working/`.
- Record prompt, model, seed, plan, and licence in the folder README.
- Runtime output belongs in `public/`, not here.
- `working/` and `previews/` are generated or intermediate; keep them out of
  the shipped bundle.

The first source set is `characters/player-p1/ludo/`:

- `walk-36f-2026-10-29/` — 36-frame alternate take, 342×603 per frame.
- `walk-49f-2026-10-29/` — 49-frame continuous walk, 264×352 per frame.

The 49-frame take is the preferred base for the static P1 idle and the future
walk clip. The 36-frame take is kept as a pose reference.

## Slicing and previews

The first pipeline step slices a Ludo sheet and writes a GIF preview:

```bash
npm run art:slice -- \
  --sheet art-source/characters/player-p1/ludo/walk-49f-2026-10-29/<sheet>.png \
  --out art-source/characters/player-p1/working/frames/walk-49f \
  --gif art-source/previews/player-p1-walk-49f.gif
```

`working/frames/` is ignored by git; previews are kept for review. The next
step is a profile-driven remaster (`npm run art:remaster`) that classifies the
source frame into semantic roles, samples a cleaned cell, and writes a
palette-quantized P1 master. Palette variants are then derived with
`npm run art:variant` from the indexed master (ADR-0061 and ADR-0064). See
[`characters/player-p1/working/README.md`](characters/player-p1/working/README.md)
for the profile, the Aseprite/LibreSprite touch-up path, and the commands.

The canonical P1/P2 palette swap is defined in
`characters/player-p1/working/palette.json`; the reusable segmentation profile is
`characters/player-p1/working/remaster.json`. Raw Ludo frames are never resized
automatically into final art without the profile pass, and the original exports
are never edited.
