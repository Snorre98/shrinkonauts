# Shrinkonauts — GDD asset pack

Local, **gitignored** copies of the art, concepts, screenshots and review sheets
for the Game Design Document. Built from the current working tree on
**2026-11-02**.

This folder is for the GDD/video/playtest work. It is not served by the game
and nothing here is referenced by a runtime manifest. The originals remain in
`public/`, `art-source/` and `screenshots/`.

> **Online gallery:** the same library is published at
> <https://snorre98.github.io/shrinkonauts/gdd/> with search and filters. The
> web version is generated from the tracked sources in CI; the local-only
> `gdd-picks/` and `contact-sheets/` folders are not published.

**Size:** about 26 MB (28 MB on disk; `gdd-picks/` is hard-linked to the library
where possible). **Files:** 565, including 62 runtime manifest entries (58
runtime, 2 placeholder, 2 manifest-only), 38 concept plates, 214 review
previews, 25 character-source files, 17 screenshots and 10 contact sheets.

---

## Start here

| If you need… | Open |
|---|---|
| A small, page-ready selection | [`gdd-picks/`](gdd-picks/) — organised by GDD section |
| An overview of the art | [`contact-sheets/`](contact-sheets/) — players, entities, hub props, concepts, screenshots, palette, pipeline |
| The full library | [`final/`](final/), [`previews/`](previews/), [`concepts/`](concepts/), [`screenshots/`](screenshots/) |
| A file-by-file index | [`ASSET-INDEX.md`](ASSET-INDEX.md) |
| What to put on each GDD page | [`GDD-MAP.md`](GDD-MAP.md) |
| How the art was created and processed | [`PIPELINE.md`](PIPELINE.md) |
| The course asset list (own vs sourced) | [`ASSET-LIST-GBL.md`](ASSET-LIST-GBL.md) |
| GBL requirements / learning-design brief | [`source/notes/gbl/`](source/notes/gbl/) |
| Licence status and known gaps | [`LICENCE-NOTES.md`](LICENCE-NOTES.md) |
| A local thumbnail browser | [`gallery.html`](gallery.html) — open in a browser |

---

## Folder map

```text
gdd-assets/
  README.md                  this file
  ASSET-INDEX.md             generated per-file index
  GDD-MAP.md                 GDD section -> recommended files
  PIPELINE.md                creation/processing chains and commands
  ASSET-LIST-GBL.md          own vs sourced vs AI-generated
  LICENCE-NOTES.md           current labels and TBDs
  manifest.json              machine-readable index with hashes/dimensions
  gallery.html               local thumbnail browser

  final/                     shipped runtime art, by pack
    hub/                     bathroom hub art, UI icons, metadata
    anatomy/                 P1/P2, Neuron Keeper, entities, sky, atlas placeholder
    silicon/                 Silicon fixture art, sky, atlas placeholder
    shared/fonts/            Silkscreen + Pixelify Sans, OFL texts
  previews/                  review previews (1x/2x/4x/8x), keyed plates,
                             background process stages, player animation strips
  concepts/                  all 38 Nanobanan source plates, 1280 px web copies
  characters/                P1/P2/Neuron Keeper Ludo sheets, JSON, working data
  screenshots/               current / placeholder-era / historical
  contact-sheets/            generated overview boards
  gdd-picks/                 small copies by GDD section
  source/
    notes/                   original art READMEs, ADRs, prompt packs
    config/                  fit configs and palette documents
    reports/                 key/fit/normalize JSON reports
  tools/build.mjs            local regeneration script
```

---

## Status key

| Status | Meaning |
|---|---|
| **runtime** | Shipped runtime art. Some assets are still labelled “POC integrated / final approval pending” in the source docs. |
| **placeholder** | Declared in the manifest but no final art yet. The copy is a placeholder, an audit plate, or a placeholder atlas. |
| **manifest-only** | Processed and declared, but not wired into the current scene (e.g. towel, detergent bottles, cycle icons are manifest-only in the hub). |
| **source-only / alternate / superseded** | Concept plates that are not runtime assets. Do not present them as final. |
| **historical** | Old milestone screenshots, kept for the development/reflection story. |

---

## What is actually final

- **Bathroom hub:** the scene plate, washer body/door/drum, civilian, poster,
  cartridges, plush, basket, cycle icons and the reused P1 tiny astronaut are
  wired final art. Towel and detergent bottles are manifest-only; the logo and
  toy astronaut are still placeholders.
- **Anatomy:** P1/P2 idle + walk/jump/fall/land sheets, Neuron Keeper static +
  36-frame idle, `scan.synapse`, `scan.muscle`, `pad.dendrite`,
  `pad.terminal`, `gate.ferry`, `prop.tracer`, `pulse.terminal`, both
  receptors, and the pretty nerve-forest sky are runtime art. The
  `tile.anatomy.atlas` is still a placeholder SVG.
- **Silicon:** all listed sprites and the board sky are runtime art. The
  circuit atlas is still a placeholder SVG.
- **Audio:** every cue is a placeholder; no audio files exist in this pack.
- **UI:** the game HUD, dialogue, map, concept log, debrief and pause menu are
  CSS/DOM, not raster assets. They are only visible in screenshots.

---

## Using these files in Canva / the PDF

1. Start with `gdd-picks/` for the page you are building. The full library is
   there if you need a different crop or a larger version.
2. Prefer **PNG with alpha** for sprites and **WebP** for backgrounds. If Canva
   will not accept a WebP, convert it to PNG first (the source WebP is lossless).
3. Pixel art is provided at **1x, 2x, 4x and 8x** in `previews/`. Use 4x/8x for
   page illustrations; use 1x/2x only when you want to show actual size.
4. Do not upscale a 1x sprite in Canva. Use the 4x/8x preview instead.
5. Label placeholder-era screenshots as **“prototype — placeholder art”**. Do
   not imply they show final art.
6. Do not use `concepts/anatomy/sprite-agent-neuron.jpg` as the Neuron Keeper;
   the runtime character is `final/anatomy/sprites/agent-neuron.png` (and the
   idle sheet `agent-neuron-idle.png`). The concept plate is an alternate.
7. Do not use the failed parallax references
   (`bg-nerve_forest-far.jpg`, `-mid.jpg`, `-near.jpg`); use the `-updated`
   plates or the background previews.

### Screenshot limitation

The committed screenshots are mostly **placeholder-era**. They cover the hub,
early gameplay, dialogue and a gate, but there is **no current capture of the
in-game map, concept log, debrief, settings, or final-art gameplay**. The GDD
checklist asks for map, HUD and debrief illustrations; the HUD and hub are
covered, but map/debrief/concept-log still need a small capture pass or a
redrawn diagram. See [`GDD-MAP.md`](GDD-MAP.md) §6.

---

## How the pack was made

- `final/` is copied from the `assets.final.json` manifests. `assets.final.json`,
  `licenses.json`, `theme.json`, `pack.json`/`hub.json`, `mapping.json`,
  `materials.json` and level JSONs are copied into each pack's `metadata/`.
- `previews/` is copied from `art-source/previews/`. No new game captures were
  made.
- `concepts/` contains every Nanobanan JPEG resized to a 1280 px long edge
  (JPEG q86). The originals remain in `art-source/nanobanan/`.
- `characters/` contains the Ludo source sheets (resized to 1800 px long edge),
  their JSON atlases, the working masters, palettes and `clips.json`.
- `contact-sheets/` is generated with ImageMagick from the copied files.
- `ASSET-INDEX.md`, `manifest.json` and `gallery.html` are generated from the
  manifests, source reports and the copied files.
- `source/notes/gbl/` contains copies of the GBL requirements, learning-design
  brief, curriculum alignment, theory brief and GBL README when the Obsidian
  vault is present.
- `gdd-picks/` is a small, page-oriented selection; it is hard-linked where the
  filesystem allows it.

The detailed commands and the source-to-runtime chain are in
[`PIPELINE.md`](PIPELINE.md).

---

## Regenerating

From the repository root:

```bash
node gdd-assets/tools/build.mjs
```

Requires Node 24 and ImageMagick 7 (`magick`). The script resets the generated
folders (`final/`, `previews/`, `concepts/`, `characters/`, `screenshots/`,
`contact-sheets/`, `source/`, `gdd-picks/`, `manifest.json`, `ASSET-INDEX.md`,
`gallery.html`) and rebuilds them. It does not delete this README or the other
hand-written docs.

It reads the **current working tree**, so uncommitted art changes are included.
The manifest records the commit hash and whether the tree was dirty.

**Not regenerable from a clean checkout:** the raw hub batch
`art-source/nanobanan/new-main-menu/` is ignored and absent on this machine.
Only the processed hub exports, previews and reports are available. The full
Ludo source sheets are in `art-source/characters/`, so those are reproducible.

---

## Provenance and licences

Short version:

- **AI-generated:** all runtime sprites/backgrounds and the concept plates were
  generated in Ludo.ai / Nanobanan (Google Gemini) with art direction by Snorre.
  The current licence labels are `Ludo.ai source (POC; plan TBD)` and
  `Nano Banana / Google Gemini (plan TBD)`.
- **Own:** the in-repo placeholder atlases are CC0-1.0. Screenshots, contact
  sheets, this pack and its docs are group work.
- **Sourced:** Silkscreen and Pixelify Sans, both SIL OFL 1.1. The OFL texts
  and `NOTICES.md` are in `final/shared/fonts/`.
- **No third-party images or audio** are included.
- **Gaps:** prompt/model/seed logs, the Ludo/Nano Banana plan, and some
  `licenses.json` entries are still missing. See
  [`LICENCE-NOTES.md`](LICENCE-NOTES.md) and
  [`ASSET-LIST-GBL.md`](ASSET-LIST-GBL.md).

---

## Known gaps

1. No current final-art gameplay/map/concept-log/debrief/settings screenshots.
2. Ludo/Nano Banana plan, prompt, model, seed and final licence are TBD.
3. Anatomy `licenses.json` does not cover every new entity; the hub has no
   separate licences file.
4. The raw hub source batch is not in the repository.
5. Audio is placeholder only.
6. The anatomy and Silicon atlases are placeholder SVGs, not final 32x32
   material atlases.
7. Some assets are declared but unused: `sprite.scan.reflex`, `sprite.exit`,
   `sprite.gate.nerve`, `sprite.prop.toy.astronaut`, the towel and the
   detergent bottles (the latter two are manifest-only).
