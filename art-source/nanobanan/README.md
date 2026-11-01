# Nanobanan concept plates

Source concepts generated on a flat magenta `#ff00ff` field. These are **not**
runtime assets and must never be referenced by a manifest. Raw source JPEGs and
lightweight review previews/reports are tracked; full keyed PNGs live in
`art-source/nanobanan/keyed/` (ignored). Only the runtime PNG/WebP exports are
referenced by the pack.

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
| `new/bg-nerve_forest-sky-updated.jpeg` | `bg.nerve_forest.sky` | **Updated POC integrated / final approval pending.** 2720×1568 → 2720×1564 crop → 640×368 lossless WebP with the no-muscle sky palette. |
| `new/bg-nerve_forest-far-updated.jpeg` | `bg.nerve_forest.far` | **POC integrated / seam review pending.** 2048×1024 exact-2× crop, keyed, 1024×512, 46.0% coverage. |
| `new/bg-nerve_forest-mid-updated.jpeg` | `bg.nerve_forest.mid` | **POC integrated / seam review pending.** 2048×1024 exact-2× crop, keyed, 1024×512, 50.7% coverage. |
| `new/bg-nerve_forest-near-updated.jpeg` | `bg.nerve_forest.near` | **Processed / deferred.** 1024×512, 23.9% coverage, but the vertical repeat lands across the play band. |
| `new/bg-nerve_forest-far.jpeg`, `-mid.jpeg`, `-near.jpeg`, `bg.nerve_forest.sky.jpeg` | — | **Failed references; do not use.** The older non-updated JPEGs are opaque scenes or contain a baked checkerboard. |
| `new/tile-bone-atlas.jpeg` | `tile.bone.atlas` source | **Source-only/deferred.** Material swatch, not a 256×192 47-frame atlas. |
| `new/tile-nerve-atlas.jpeg` | `tile.nerve.atlas` source | **Source-only/deferred.** Material swatch, not a 128×128 16-frame atlas. |

The 03 room wires `bg.nerve_forest.sky`, `bg.nerve_forest.far` and
`bg.nerve_forest.mid`. `bg.nerve_forest.near` is processed and previewed but
deferred because its 1024×512 tile repeats vertically at screen y≈512 and the
hanging canopy lands across the play band. Do not wire the material swatches.
`sprite.exit`, `sprite.gate.nerve`, and `sprite.checkpoint` also remain
placeholders.

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

`npm run art:fit` takes the keyed PNG, crops to alpha bounds, fits the 18×18
cell without stretching, hard-thresholds alpha, quantises to the approved
non-orange ramps, and writes the runtime PNG, previews and a JSON report.

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

The updated sky source is 2720×1568. The runtime plate is generated with a
2720×1564 crop (2 px top/bottom, no stretching), an area resize to 640×368, the
no-muscle sky palette, and lossless WebP encoding:

```bash
mkdir -p art-source/nanobanan/working/tmp
ffmpeg -y -v error \
  -i art-source/nanobanan/new/bg-nerve_forest-sky-updated.jpeg \
  -vf "crop=2720:1564:0:2,scale=640:368:flags=area" \
  art-source/nanobanan/working/tmp/nerve-forest-sky-640x368.png

npm run art:normalize -- \
  --in art-source/nanobanan/working/tmp/nerve-forest-sky-640x368.png \
  --palette art-source/nanobanan/palette.nerve-forest-sky.json \
  --out art-source/nanobanan/working/tmp/nerve-forest-sky-updated-quantized.png \
  --preview art-source/previews/nanobanan/backgrounds/nerve-forest-sky-updated-2x.png \
  --scale 2 --background "#101a20" \
  --report art-source/nanobanan/reports/nerve-forest-sky-updated.normalize.json

cwebp -quiet -lossless -q 100 -m 6 \
  art-source/nanobanan/working/tmp/nerve-forest-sky-updated-quantized.png \
  -o public/packs/anatomy-reflex/shared/backgrounds/nerve-forest-sky.webp
```

The result is a 640×368 VP8L WebP under 300 KB. Inspect
`art-source/previews/nanobanan/backgrounds/nerve-forest-sky-updated-2x.png` at
1280×736 and in the game at 1280×720. The updated plate removes the previous
sky's pink drapes and is calmer; its dark framing trunks remain a visual-review
note. The old `nerve-forest-sky-2x.png` preview is retained for comparison.

## Parallax layers

The updated far/mid/near plates are flat `#FF00FF` cut-outs. Each is cropped to
an exact 2048×1024 window (far: `x=432,y=416`; mid/near: `x=432,y=208`), keyed
at full resolution, nearest-downscaled to 1024×512, quantised with
`palette.nerve-forest-layer.json` (no `tissue` role), 2×2-snapped and 2 px
edge-welded. The weld makes opposite edges pixel-identical; it does not hand-
repaint the composition across the seam.

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

Measured coverage: far 46.0%, mid 50.7%, near 23.9%. Far and mid are wired.
Near is processed and previewed but deferred: the 1024×512 tile repeats
vertically at screen y≈512 and the hanging canopy lands across the play band
(`background-near-over-sky-1280x736.png`). The process report is
`reports/background-layers.process.json`; previews are in
`previews/nanobanan/backgrounds/`.

## Deferred near layer and atlas plates

The updated near plate is a usable 1024×512 cut-out, but its vertical repeat
lands across the play band; it stays deferred until that read is resolved. The
older non-updated far/mid/near JPEGs are failed references and must not be
wired.

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
- **Status:** final art approval is pending for the integrated sky, far, mid,
  gate, tracer, pulse terminal, and receptors. Near is processed but deferred
  (play-band repeat). Badge, reflex, and the atlases remain
  placeholders/source-only.
