# Art pipeline — how the assets were created and processed

This is the short, asset-pack-facing version of the pipeline. The authoritative
records are in `source/notes/`:

- `source/notes/art-source-README.md` — source/working/runtime layers.
- `source/notes/nanobanan-README.md` — plate list, keying, fit and background commands.
- `source/notes/m3-asset-requirements-v01.md` — full M3 prompt pack and acceptance criteria.
- `source/notes/m3.5-hub-asset-prompts-v01.md` — bathroom hub prompt pack.
- `source/notes/adr/` — ADR-0060, 0061, 0062, 0063 and 0075.

The governing idea is **three layers** (ADR-0060):

```text
source (immutable)  ->  working (clean masters, palettes, clips)  ->  runtime (public/)
art-source/              art-source/.../working/                      public/...
```

Source art is never served and never referenced by a runtime manifest. Runtime
files are the only files the game loads.

---

## 1. Player and NPC character pipeline (Ludo sheets)

Used for P1, P2 and the Neuron Keeper.

```text
Ludo PNG + JSON atlas
  -> slice frames using the JSON rectangles (not a guessed grid)
  -> crop to alpha bounds
  -> fit / remaster to the character cell
  -> quantise to the approved palette
  -> pack runtime sheets from clips.json
  -> write GIF/contact-strip previews
```

### P1 sources

| Source | Contents | Runtime clips |
|---|---|---|
| `art-source/characters/player-p1/ludo/walk-49f-2026-10-29/` | 49-frame walk, 264×352 per frame | `sprite.player.p1` (frame 0), `.walk` (0–48) |
| `art-source/characters/player-p1/ludo/walk-36f-2026-10-29/` | 36-frame jump take, 342×603 per frame | `.jump` (6–17), `.fall` (18–27), `.land` (28–35) |

The folder name `walk-36f` is historical: it contains the jump phases.

### P2 sources

| Source | Contents | Runtime clips |
|---|---|---|
| `art-source/characters/player-p2/walk/` | 36-frame walk, 248×352 per frame | `sprite.player.p2` (frame 0), `.walk` |
| `art-source/characters/player-p2/jump/` | 36-frame jump, 304×528 per frame | `.jump` (6–17), `.fall` (18–27), `.land` (28–35) |

P2 uses the approved bone-suit / joint-cyan visor sheets (ADR-0065), not a
palette swap of P1. The P1→P2 LUT remains available for other colour variants.

### Neuron Keeper

| Source | Contents | Runtime clips |
|---|---|---|
| `art-source/characters/neuron-agent/sprite-max-px-frames-36-rows-6-cols-6/` | 36-frame idle, 267×264 per frame | `sprite.agent.neuron` (frame 0), `.idle` (0–35, 12.5 fps) |

The runtime sheet is 3456×96 at a 96×96 cell (`hero-1x`). This is a POC
animation; the full ADR-0062 descriptor remains future work.

### Commands

Slice a Ludo sheet and write a GIF preview:

```bash
npm run art:slice -- \
  --sheet art-source/characters/player-p1/ludo/walk-49f-2026-10-29/<sheet>.png \
  --out art-source/characters/player-p1/working/frames/walk-49f \
  --gif art-source/previews/player-p1-walk-49f.gif
```

Build the POC player/Neuron Keeper sheets from `working/clips.json`:

```bash
npm run art:build-player -- --character all --sampler downscale --write-runtime
```

Build only the Neuron Keeper:

```bash
npm run art:build-player -- \
  --character neuron-agent \
  --sampler downscale \
  --write-runtime
```

The semantic remaster path (optional; the POC uses the downscale + palette path):

```bash
npm run art:remaster -- \
  --sheet art-source/characters/player-p1/ludo/walk-49f-2026-10-29/<sheet>.png \
  --profile art-source/characters/player-p1/working/remaster.json \
  --palette art-source/characters/player-p1/working/palette.json \
  --frame 0 \
  --out art-source/characters/player-p1/working/master/player-p1-idle-14x22.png \
  --preview art-source/characters/player-p1/working/tmp/player-p1-remaster-8x.png \
  --class-preview art-source/characters/player-p1/working/tmp/player-p1-remaster-classes-8x.png \
  --scale 8
```

Validate a master against the palette:

```bash
npm run art:normalize -- \
  --in art-source/characters/player-p1/working/master/player-p1-idle-14x22.png \
  --palette art-source/characters/player-p1/working/palette.json \
  --out art-source/characters/player-p1/working/tmp/player-p1-normalized-check.png \
  --scale 2
```

Generate a derived colour variant (optional):

```bash
npm run art:variant -- \
  --master art-source/characters/player-p1/working/master/player-p1-idle-14x22.png \
  --palette art-source/characters/player-p1/working/palette.json \
  --variant p2 \
  --out art-source/characters/player-p1/working/master/player-p2-idle-14x22.png \
  --preview art-source/characters/player-p1/working/tmp/player-p2-remaster-8x.png \
  --scale 8
```

Rules: hard alpha (0/255), no anti-aliasing, every pixel on an approved ramp,
feet on the bottom padding line, no baked shadow/glow.

---

## 2. Entity and prop pipeline (Nanobanan concept plates)

Used for scans, gates, pads, receptors, tracers, terminals and all Silicon
entities.

```text
Nanobanan JPEG (flat magenta #ff00ff)
  -> art:key       hard-alpha key, despill, trim
  -> art:fit       crop to alpha bounds, fit a class cell, hard alpha,
                   quantise to the approved palette, write previews/reports
  -> runtime PNG
```

The two steps are deliberately separate: keying stays in one tool and the fit
step expects an alpha PNG.

```bash
# 1. Remove the magenta background. Full-size keyed files are ignored.
npm run art:key -- \
  --in art-source/nanobanan/new/sprite-scan-ferry-v2.jpeg \
  --out art-source/nanobanan/keyed/gate-ferry.png \
  --key "#ff00ff" --tolerance 0.18 --softness 0.08 --despill --trim \
  --preview art-source/previews/nanobanan/entities/gate-ferry-key.png \
  --preview-width 512 --background "#101a20"

# 2. Fit, quantise and write the runtime sprite plus previews/reports.
npm run art:fit -- \
  --config art-source/nanobanan/fit.new.config.json \
  --asset sprite.gate.ferry \
  --asset sprite.prop.tracer \
  --asset sprite.pulse.terminal \
  --asset sprite.receptor.triangle \
  --asset sprite.receptor.circle
```

Audit without writing runtime files:

```bash
npm run art:fit -- --config art-source/nanobanan/fit.new.config.json --no-write
```

Configs:

| Config | Covers |
|---|---|
| `fit.config.json` | Original scan batch |
| `fit.new.config.json` | 2026-11-01 batch: gate, tracer, pulse, receptors, reflex audit |
| `fit.silicon.config.json` | Silicon batch |
| `fit.badge.config.json` | Badge audit only; not wired |

ADR-0075 introduced per-class cells and gates:

| Class | Cell | Display |
|---|---|---|
| `hero-npc` | 96×96 | 96×96 |
| `hero-interactable` | 64×64 | 64×64 |
| `hero-prop` | 48×48 | 48×48 |
| `ui-1x` scan | 36×36 | 36×36 |
| `world-2x` player | 14×22 | 28×44 |
| `world-2x` decor | 18×18 | 36×36 |

The fit reports in `source/reports/` record source trim, fitted size, margins,
palette validation, alpha violations, ramp histogram and warnings. They are
the evidence for placeholder decisions and final approval.

---

## 3. Bathroom hub pipeline

The hub is a separate content root. Its source batch
(`art-source/nanobanan/new-main-menu/`) is **ignored and absent** from this
machine; the processed exports and reports are the available record.

```text
hub JPEG plates
  -> art:key       magenta key (same defaults)
  -> art:hub       crop/mask, fit hub cells, quantise sprites,
                   export the scene plate, write previews/reports
  -> public/hub/bathroom/shared/
```

```bash
# Key one plate; repeat per source. Full-size keyed files are ignored.
npm run art:key -- \
  --in art-source/nanobanan/new-main-menu/sprite-prop-washer.jpeg \
  --out art-source/nanobanan/keyed/hub-washer.png \
  --key "#ff00ff" --tolerance 0.18 --softness 0.08 --despill --trim \
  --preview art-source/previews/nanobanan/hub/hub-washer-key.png \
  --preview-width 512 --background "#101a20"

# Fit, mask, quantise and export every runtime asset plus the scene WebP.
npm run art:hub

# Review one asset without writing the runtime file.
npm run art:hub -- --asset sprite.prop.washer --no-write
```

Hub composition decisions:

- The scene plate is cropped 296 source px on the left and padded 296 px on
  the right with `#1b2b2c`, then Lanczos-downscaled to 640×360. This moves the
  baked alcove under the locked machine and the baked poster out from under the
  DOM panel.
- The scene is **not** palette-quantised (recorded scene-plate exception).
- Sprites are quantised to `palette.hub.json`.
- The washer body is 180×240 (content 180×221), displayed at 2× (360×442).
- The separate poster is rendered at the baked poster footprint so the scene
  does not show two posters.
- The logo plate has a washer baked behind the wordmark; it is not shipped as
  alpha art, and the Silkscreen wordmark fallback remains.

Reports are in `source/reports/hub/`; previews in `previews/hub/`.

---

## 4. Backgrounds

### Nerve Forest sky

The current sky is the pretty 2752×1536 source. It is the only wired 03
background and a recorded exception to the palette/quantisation rules: it keeps
the muscle-pink drapes and is not palette-quantised.

```bash
mkdir -p art-source/nanobanan/working/tmp
ffmpeg -y -v error \
  -i art-source/nanobanan/new/bg.nerve_forest.sky.jpeg \
  -vf "crop=2672:1536:40:0,scale=1280:736:flags=lanczos" \
  -pix_fmt rgb24 \
  art-source/nanobanan/working/tmp/nerve-forest-sky-pretty-1280x736.png

cwebp -quiet -lossless -q 100 -m 6 \
  art-source/nanobanan/working/tmp/nerve-forest-sky-pretty-1280x736.png \
  -o public/packs/anatomy-reflex/shared/backgrounds/nerve-forest-sky.webp
```

The runtime file is a 1280×736 lossless WebP (~956 KiB). The 1280×720 preview
drops the 8 px top/bottom that the 720-high viewport crops.

### Silicon board sky

The Silicon sky is cropped 2720×1564 at y=2, Lanczos-downscaled to 1280×736,
given a six-ramp Bayer dither, and exported lossless. See
`source/reports/silicon/silicon-board-sky.report.json`.

### Far / mid / near (deferred)

The far/mid/near plates are future layered work and are **not wired**. The
process is:

```text
crop exact 2× window -> art:key -> nearest 1024×512 -> art:normalize
-> art:tile-clean (2×2 snap, 2 px edge weld) -> lossless WebP
```

The old non-updated JPEGs are failed references. The `-updated` plates and
process previews are retained for a later pass. Near’s vertical repeat lands
across the play band, so it is not ready to wire.

---

## 5. Atlases, UI and fonts

- `tile.anatomy.atlas` and `tile.circuit.atlas` are **placeholder SVG** atlases
  authored in-repo (CC0-1.0). The final target is a 256×192 bone `blob47` atlas
  and a 128×128 nerve `edge` atlas, assembled from 32×32 frames in Aseprite.
  The bone/nerve JPEGs in `concepts/` are material swatches, not frame atlases.
- The UI is CSS/DOM, not raster art. The only UI image assets are the two hub
  cycle icons (final) and the badge (placeholder).
- Fonts are Silkscreen and Pixelify Sans, both SIL OFL 1.1. The runtime loads
  the WOFF2 files from `public/fonts/`; the OFL texts and `NOTICES.md` are
  copied into `final/shared/fonts/`.
- Audio is not implemented: every cue is a placeholder in the manifests and
  theme files. No audio files are included in this pack.

---

## 6. Screenshots and contact sheets

- `screenshots/` copies the 17 committed PNGs, split into `current/`,
  `placeholder-era/` and `historical/`. No new game captures were made for this
  pack.
- `contact-sheets/` is generated with ImageMagick:
  - `players-lineup.png`, `animation-strips.png` — player/NPC review.
  - `anatomy-entities.png`, `silicon-entities.png`, `hub-props.png` — asset line-ups.
  - `concepts-overview.jpg` — all 38 source plates.
  - `screenshots-overview.jpg` — all committed screenshots with labels.
  - `palette-and-type.png` — palette ramps, fonts and player anchors.
  - `pipeline-comparison.jpg` — source → keyed/processed → runtime for three assets.
- `gallery.html` is generated from `manifest.json`; it is a local file browser,
  not a web app.

---

## 7. What this pack does to the source files

- Copies runtime files byte-for-byte into `final/`.
- Copies previews byte-for-byte into `previews/`.
- Resizes concept JPEGs to a 1280 px long edge (q86) into `concepts/`.
- Resizes character source sheets to an 1800 px long edge into `characters/`.
- Copies the Ludo JSON atlases, working masters, palettes, `clips.json` and
  source READMEs.
- Copies fit/key/normalize reports and fit configs into `source/`.
- Copies the source notes and ADRs into `source/notes/`.
- Generates `manifest.json`, `ASSET-INDEX.md`, `gallery.html` and the contact
  sheets.

No runtime manifest, game code or `public/` file is modified by the pack.

---

## 8. Provenance gaps

The pipeline is documented, but the generation provenance is incomplete:

- Ludo/Nanobanan plan, prompt, model and seed are **TBD** for most assets.
- The prompt log in `m3-asset-requirements-v01.md` is a template, not a filled
  log.
- The raw hub batch is not in the repository.
- The anatomy `licenses.json` is missing entries for several new entities; the
  hub has no separate licences file.
- Final art approval is pending for the POC-integrated sprites and the sky.

See `LICENCE-NOTES.md` for the current labels and the exact gaps.
