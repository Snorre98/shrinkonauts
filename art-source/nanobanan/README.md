# Nanobanan concept plates

Most source concepts are generated on a flat magenta `#ff00ff` field; the sky
is opaque. These are **not** runtime assets and must never be referenced by a
manifest. Raw source JPEGs and lightweight review previews/reports are tracked;
full keyed PNGs live in `art-source/nanobanan/keyed/` (ignored). Only the
runtime PNG/WebP exports are referenced by the pack.

## Batch status

| File | Intended runtime ID | Status |
|---|---|---|
| `sprite-agent-neuron.jpeg` | `sprite.agent.neuron` | **Alternate only.** The runtime static is frame 0 of the animated Neuron Keeper sheet; this plate is kept for review. |
| `sprite-scan-neuron.jpeg` | `sprite.scan.neuron` | **Placeholder.** The 1886×1004 plate fits to 16×9; the myelin sleeves, nodes and forked terminals are not legible at 36×36. |
| `sprite-scan-synapse.jpeg` | `sprite.scan.synapse` | **POC integrated / final approval pending.** Two cells and the cleft read; the cyan rim is partial. |
| `sprite-scan-pathway.jpeg` | `sprite.scan.pathway` | **Placeholder.** The 1864×740 plate fits to 16×6; the one-way reading and myelin gaps are lost. |
| `sprite-scan-muscle.jpeg` | `sprite.scan.muscle` | **POC integrated / final approval pending.** The muscle bundle and nerve contact read; the cyan rim is missing. |
| `new/sprite-scan-ferry-v2.jpeg` | `sprite.gate.ferry` | **POC integrated / final approval pending.** A closed organic gate, not a scan icon. It maps to `sprite.gate.ferry`, used by all 03 gates and 04’s `muscle-gate`. The yellow seam is subdued at 18×18. |
| `new/sprite-prop-tracer.jpeg` | `sprite.prop.tracer` | **POC integrated / final approval pending.** Triangular ACh packet; the cyan rim does not survive. |
| `new/sprite-puls-terminal.jpeg` | `sprite.pulse.terminal` | **POC integrated / final approval pending.** Round motor terminal with vesicles and cyan emitter. |
| `new/sprite-receptor-triangle.jpeg` | `sprite.receptor.triangle` | **POC integrated / final approval pending.** Triangular socket reads; distinct from the circle. |
| `new/sprite-receptor-circle.jpeg` | `sprite.receptor.circle` | **POC integrated / final approval pending.** Circular socket reads; distinct from the triangle. |
| `new/sprite-scan-reflex.jpeg` | `sprite.scan.reflex` | **Placeholder.** The loop reads, but the dorsal/ventral roots and spindle do not at 36×36. Not referenced by 03/04. |
| `new/ui-icon-badge.jpeg` | `ui.icon.badge` | **Placeholder.** The 16×16 fit collapses the helmet dome into the ring; the CSS HUD placeholder stays. |
| `new/bg.nerve_forest.sky.jpeg` | `bg.nerve_forest.sky` | **POC integrated / final approval pending.** Pretty 2752×1536 source; 2672×1536 crop at x=40; Lanczos downscale to 1280×736; lossless WebP; no palette quantisation; muscle-pink drapes retained. |
| `new/bg-nerve_forest-sky-updated.jpeg` | — | **Previous sky source; superseded.** 2720×1568 → 2720×1564 crop → 640×368 lossless WebP with the no-muscle sky palette. Retained for comparison. |
| `new/bg-nerve_forest-far-updated.jpeg` | `bg.nerve_forest.far` | **Placeholder/future.** 2048×1024 exact-2× crop, keyed, 1024×512, 46.0% coverage; not wired. |
| `new/bg-nerve_forest-mid-updated.jpeg` | `bg.nerve_forest.mid` | **Placeholder/future.** 2048×1024 exact-2× crop, keyed, 1024×512, 50.7% coverage; not wired. |
| `new/bg-nerve_forest-near-updated.jpeg` | `bg.nerve_forest.near` | **Placeholder/future.** 1024×512, 23.9% coverage; the vertical repeat lands across the play band; not wired. |
| `new/bg-nerve_forest-far.jpeg`, `-mid.jpeg`, `-near.jpeg` | — | **Failed references; do not use.** The older non-updated parallax JPEGs are opaque scenes or contain a baked checkerboard. |
| `new/tile-bone-atlas.jpeg` | `tile.bone.atlas` source | **Source-only/deferred.** Material swatch, not a 256×192 47-frame atlas. |
| `new/tile-nerve-atlas.jpeg` | `tile.nerve.atlas` source | **Source-only/deferred.** Material swatch, not a 128×128 16-frame atlas. |

The 03 room wires only `bg.nerve_forest.sky` (the pretty 1280×736 plate).
`bg.nerve_forest.far`, `.mid` and `.near` are declared placeholders: their
sources, key reports and previews are retained for a later layered pass, but
the runtime WebPs are not shipped and the layers are not wired. Do not wire the
material swatches. `sprite.exit`, `sprite.gate.nerve`, and `sprite.checkpoint`
also remain placeholders.

## M3.5 bathroom hub batch (2026-11-02)

Source folder: `art-source/nanobanan/new-main-menu/` (14 JPEGs, 2752×1536,
flat magenta except the opaque scene plate). The raw batch is ignored and is
not committed; only the processed runtime exports, previews, reports, and this
note are tracked.

**Wired final art:** `bg.bathroom.wall`, `sprite.prop.washer`,
`sprite.prop.washer.door`, `sprite.prop.washer.drum`,
`sprite.player.civilian`, `sprite.prop.poster`,
`sprite.prop.cartridge.anatomy`, `sprite.prop.cartridge.silicon`,
`ui.icon.cycle.anatomy`, `ui.icon.cycle.silicon`,
`sprite.prop.plush.neuron`, `sprite.prop.laundry.basket`, and the reused P1
tiny astronaut (`sprite.player.p1`). The separate
`sprite.prop.detergent.bottles` asset is processed and declared but is
manifest-only: the scene already bakes detergent bottles on the shelf.

**Composition decisions:** the scene plate is cropped 296 source px on the
left and padded 296 px on the right with `#1b2b2c` before a Lanczos
downscale to 640×360. This moves the baked alcove under the locked machine
position and moves the baked poster out from under the DOM panel. The scene is
**not** palette-quantised: this is the recorded scene-plate exception, matching
the M3 sky precedent, because the warm lamp and wall grime survive better at
2×. Sprites are quantised to `palette.hub.json` (the shared ramps plus the
hub-only appliance ramp).

The delivered machine body is 0.814 aspect and fits the 180×240 cell as
180×221 content, so its visible body is 360×442. The machine keeps x=340,
y=720 and scale=2; the door/drum anchors move to `(340,503)` and the screen /
nameplate rects in `hub.json` describe the delivered body. The separate poster
is rendered at the baked poster footprint (`627,312`, scale 3.1) so the scene
does not show two posters. The logo plate has a washing machine baked behind
the wordmark; it is not shipped as alpha art and the Silkscreen wordmark
fallback remains.

**Deferred / missing:** no civilian walk sheet (single-frame idle only), no
toy astronaut, and no audio. The towel was cleaned with a pink-removal pass
plus a silhouette polygon mask, but the remaining 11×32 source collapses to a
narrow strip that does not read as a towel at 2×; the processed asset is
manifest-only and is not wired. The detergent bottles are also manifest-only
for the reason above.

**Commands:**

```bash
# Key a magenta plate; repeat per source. Full-size keyed files are ignored.
npm run art:key -- \
  --in art-source/nanobanan/new-main-menu/sprite-prop-washer.jpeg \
  --out art-source/nanobanan/keyed/hub-washer.png \
  --key "#ff00ff" --tolerance 0.18 --softness 0.08 --despill --trim \
  --preview art-source/previews/nanobanan/hub/hub-washer-key.png \
  --preview-width 512 --background "#101a20"

# Fit, mask, quantise and export every runtime asset plus the scene WebP.
npm run art:hub

# Review a single asset without writing the runtime file.
npm run art:hub -- --asset sprite.prop.washer --no-write
```

The fit/mask/quantisation reports are in `reports/hub/`; 2× and 4× previews are
in `previews/nanobanan/hub/`. Runtime files live under
`public/hub/bathroom/shared/`. The final contact sheets are
`screenshots/m3.5-hub-final.png`, `screenshots/m3.5-hub-final-720p.png`, and
`screenshots/m3.5-hub-placeholder.png`.

**Licence:** all new hub runtime assets use
`Nano Banana / Google Gemini (plan TBD)`. The reused P1 tiny astronaut retains
`Ludo.ai source (POC; plan TBD)`. The source batch has no seed/prompt/licence
log; this note is the provenance record until that log exists.

## Background removal

`npm run art:key` decodes the JPEG through ffmpeg, keys the flat magenta by RGB
distance, suppresses magenta spill on the edge pixels, and writes a hard-alpha
PNG. Full-size keyed copies go to `keyed/` (ignored). Review previews go to
`art-source/previews/nanobanan/`.

```bash
npm run art:key -- \
  --in art-source/nanobanan/new/sprite-scan-ferry-v2.jpeg \
  --out art-source/nanobanan/keyed/gate-ferry.png \
  --key "#ff00ff" --tolerance 0.18 --despill --trim \
  --preview art-source/previews/nanobanan/gate-ferry-key.png \
  --preview-width 512 --background "#101a20"
```

The default `--tolerance 0.18` and `--softness 0.08` are tuned for these JPEGs.
If a plate has a soft or noisy edge, raise `--tolerance` before lowering
`--alpha-threshold`; the latter trades fringe for holes in the subject.

> The keyed copies are pre-trimmed, so the fit report’s “source content touches
> the image border” warning is expected and does not mean the original plate was
> clipped. Check the keyed preview when in doubt.

## Entity fit

`npm run art:fit` takes the keyed PNG, crops to alpha bounds, fits the
configured cell without stretching, hard-thresholds alpha, quantises to the
approved non-orange ramps, and writes the runtime PNG, previews and a JSON
report.

**Hero pass (2026-11-02, ADR-0075).** The hero configs (`fit.new.config.json`
and `fit.silicon.config.json`) are schema 2 and declare per-class cells:
`hero-npc` 96×96, `hero-interactable` 64×64, `hero-prop` 48×48, `ui-1x`
36×36. The older `fit.config.json` and `fit.badge.config.json` remain schema 1
for legacy 18×18 / badge review. The palette cell is advisory; the fit cell
wins. The reports record the class, display, treatment, source scale and gates.
The 2026-11-02 pass re-fitted the Keeper sheet, CPU, gates, consoles, sockets,
receptors, pads and props as `fit-preview`; hand cleaning is still required
before any hero asset is marked final. The Keeper sheet is now 3456×96
(36 frames at 96×96) and the CPU static is 96×96.

The original scan batch is in `fit.config.json`. The 2026-11-01 batch is in
`fit.new.config.json`; it includes the accepted gate, tracer, pulse terminal,
and both receptors plus the placeholder-only reflex audit. The badge has its
own 16×16 palette and config (`palette.badge.json`,
`fit.badge.config.json`) and is not wired.

```bash
# Previews + reports only, no runtime writes
npm run art:fit -- \
  --config art-source/nanobanan/fit.new.config.json --no-write

# Write the accepted 2026-11-01 entity sprites
npm run art:fit -- \
  --config art-source/nanobanan/fit.new.config.json \
  --asset sprite.gate.ferry \
  --asset sprite.prop.tracer \
  --asset sprite.pulse.terminal \
  --asset sprite.receptor.triangle \
  --asset sprite.receptor.circle

# Badge audit only; no runtime output
npm run art:fit -- \
  --config art-source/nanobanan/fit.badge.config.json --no-write
```

Outputs:

- runtime PNGs: `public/packs/anatomy-reflex/shared/sprites/gate-ferry.png`,
  `prop-tracer.png`, `pulse-terminal.png`, `receptor-triangle.png`,
  `receptor-circle.png`
- previews: `art-source/previews/nanobanan/entities/` (`-2x.png`, `-8x.png`,
  and `-tint-2x.png` for the warm interaction tint)
- reports: `art-source/nanobanan/reports/*.fit.json`

The reports are the evidence for the placeholder decisions: they record the
source trim, fitted size, final margins, palette validation, alpha violations,
ramp histogram and warnings (small fit, missing cyan rim, large palette
distance). The accepted sprites are palette-only and hard-alpha, but the
quantiser reports max-distance warnings above 64; this matches the existing
`scan.muscle` POC precedent. Final approval is pending.

## Sky

The current sky is the pretty 2752×1536 source. It is the only wired 03
background and the recorded exception to the pixel-art palette/quantisation
rules: it keeps the muscle-pink drapes and is not palette-quantised. The
runtime plate is a 2672×1536 side crop (40 px each side) that matches the
1280:736 room aspect, Lanczos-downscaled to 1280×736 and exported as lossless
WebP:

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

The result is a 1280×736 VP8L WebP of 978,732 bytes (~956 KiB). No `art:normalize` pass and
no `palette.nerve-forest-sky.json` are used. The previews are
`previews/nanobanan/backgrounds/nerve-forest-sky-pretty-1280x736.png` and
`-1280x720.png`; the 1280×720 preview drops the 8 px top/bottom that the
720-high viewport crops. The earlier 640×368 quantised sky and its
`nerve-forest-sky-updated-2x.png` preview are retained for comparison only.

## Parallax layers

The far/mid/near plates are flat `#FF00FF` cut-outs retained for a future
layered pass. Each is cropped to an exact 2048×1024 window (far:
`x=432,y=416`; mid/near: `x=432,y=208`), keyed at full resolution,
nearest-downscaled to 1024×512, quantised with
`palette.nerve-forest-layer.json` (no `tissue` role), 2×2-snapped and 2 px
edge-welded. The weld makes opposite edges pixel-identical; it does not hand-
repaint the composition across the seam. These layers are **not wired** in the
current 03 runtime.

```bash
# Far; use x=432,y=208 for mid/near
ffmpeg -y -v error \
  -i art-source/nanobanan/new/bg-nerve_forest-far-updated.jpeg \
  -vf "crop=2048:1024:432:416" \
  art-source/nanobanan/working/tmp/background-far-2048x1024.png

npm run art:key -- \
  --in art-source/nanobanan/working/tmp/background-far-2048x1024.png \
  --out art-source/nanobanan/keyed/background-far-keyed.png \
  --key "#ff00ff" --tolerance 0.18 --softness 0.08 \
  --preview art-source/previews/nanobanan/backgrounds/background-far-keyed.png \
  --preview-width 1024 --background "#101a20" \
  --report art-source/nanobanan/reports/background-far.key.json

ffmpeg -y -v error \
  -i art-source/nanobanan/keyed/background-far-keyed.png \
  -vf "scale=1024:512:flags=neighbor" -pix_fmt rgba \
  art-source/nanobanan/working/tmp/background-far-1024x512.png

npm run art:normalize -- \
  --in art-source/nanobanan/working/tmp/background-far-1024x512.png \
  --palette art-source/nanobanan/palette.nerve-forest-layer.json \
  --out art-source/nanobanan/working/tmp/background-far-quantized.png \
  --preview art-source/previews/nanobanan/backgrounds/background-far-quantized.png \
  --scale 1 --background "#101a20" \
  --report art-source/nanobanan/reports/background-far.normalize.json

npm run art:tile-clean -- \
  --in art-source/nanobanan/working/tmp/background-far-quantized.png \
  --out art-source/nanobanan/working/tmp/background-far-clean.png \
  --band 2 --min-component 4 --snap2x2 \
  --weld-x union --weld-y union \
  --report art-source/nanobanan/reports/background-far.clean.json

cwebp -quiet -lossless -q 100 -m 6 \
  art-source/nanobanan/working/tmp/background-far-clean.png \
  -o public/packs/anatomy-reflex/shared/backgrounds/nerve-forest-far.webp
```

Measured coverage: far 46.0%, mid 50.7%, near 23.9%. All three are
placeholders/future work; the current room wires only the pretty sky. Near's
1024×512 tile repeats vertically at screen y≈512 and the hanging canopy lands
across the play band (`background-near-over-sky-1280x736.png`), so it is not
ready to wire as-is. The process report is
`reports/background-layers.process.json`; previews are in
`previews/nanobanan/backgrounds/`.

## Deferred layered plates and atlas plates

Far, mid and near are placeholders/future work. The updated plates remain
usable sources for a later layered pass, but the current 03 room wires only the
pretty sky. Near's vertical repeat still lands across the play band, so it is
not ready to wire as-is. The older non-updated far/mid/near JPEGs are failed
references and must not be wired.

The bone/nerve JPEGs are material swatches, not frame atlases. The runtime needs
32×32 frames, named region maps, a `bone-blob47` variant set, and the nerve-edge
repoint per §8.21. Until that task is taken, keep `tile.anatomy.atlas` and the
`materials.json` mapping as placeholders.

## Neuron Keeper source

The runtime Neuron Keeper does **not** use the nanobanan agent plate. It uses the
36-frame animated sheet in `art-source/characters/neuron-agent/` via the
character pipeline. See that folder’s README for the build command and status.
The nanobanan agent plate remains an alternate review asset only.

## Provenance

- **Tool:** Nanobanan / Ludo.ai concept generation (record the exact model and
  seed before shipping).
- **Prompt / plan / licence:** TBD. The POC runtime manifests use the shared
  `Ludo.ai source (POC; plan TBD)` label.
- **Status:** final art approval is pending for the integrated pretty sky,
  gate, tracer, pulse terminal, and receptors. Far/mid/near are
  placeholders/future work. Badge, reflex, and the atlases remain
  placeholders/source-only.
