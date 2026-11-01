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
| `new/bg.nerve_forest.sky.jpeg` | `bg.nerve_forest.sky` | **POC integrated / final approval pending.** Cropped/resized 640×368 lossless WebP; the only visible 03 background. |
| `new/bg-nerve_forest-far.jpeg` | `bg.nerve_forest.far` | **Source-only/deferred.** 16:9 opaque scene, not a 1024×512 transparent tileable layer. |
| `new/bg-nerve_forest-mid.jpeg` | `bg.nerve_forest.mid` | **Source-only/deferred.** Same contract mismatch. |
| `new/bg-nerve_forest-near.jpeg` | `bg.nerve_forest.near` | **Source-only/deferred.** Same mismatch, plus a baked checkerboard. |
| `new/tile-bone-atlas.jpeg` | `tile.bone.atlas` source | **Source-only/deferred.** Material swatch, not a 256×192 47-frame atlas. |
| `new/tile-nerve-atlas.jpeg` | `tile.nerve.atlas` source | **Source-only/deferred.** Material swatch, not a 128×128 16-frame atlas. |

The 03 room deliberately wires only `bg.nerve_forest.sky`. Do not wire the
far/mid/near JPEGs or the material swatches. `sprite.exit`, `sprite.gate.nerve`,
and `sprite.checkpoint` also remain placeholders.

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

The sky source is a 2752×1536 16:9 scene. The runtime plate is generated with a
centered 2672×1536 crop (40 px each side, no stretching), an area resize to
640×368, palette quantisation, and lossless WebP encoding:

```bash
mkdir -p art-source/nanobanan/working/tmp
ffmpeg -y -v error \
  -i art-source/nanobanan/new/bg.nerve_forest.sky.jpeg \
  -vf "crop=2672:1536:40:0,scale=640:368:flags=area" \
  art-source/nanobanan/working/tmp/nerve-forest-sky-640x368.png

npm run art:normalize -- \
  --in art-source/nanobanan/working/tmp/nerve-forest-sky-640x368.png \
  --palette art-source/nanobanan/palette.sky.json \
  --out art-source/nanobanan/working/tmp/nerve-forest-sky-quantized.png \
  --preview art-source/previews/nanobanan/nerve-forest-sky-2x.png \
  --scale 2 --background "#101a20" \
  --report art-source/nanobanan/reports/nerve-forest-sky.normalize.json

cwebp -quiet -lossless -q 100 -m 6 \
  art-source/nanobanan/working/tmp/nerve-forest-sky-quantized.png \
  -o public/packs/anatomy-reflex/shared/backgrounds/nerve-forest-sky.webp
```

The result is a 640×368 VP8L WebP under 300 KB. Inspect
`art-source/previews/nanobanan/nerve-forest-sky-2x.png` at 1280×736 and in the
game at 1280×720. The sky is busier than the ideal prompt plate (it has a strong
bone arch and pink canopy), so final approval remains pending.

## Deferred background and atlas plates

The far/mid/near sources are full 16:9 scenes, not 1024×512 transparent
tileable layers, and the near plate has a baked checkerboard. They must not be
wired into `fit: "tile"` layers.

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
- **Status:** final art approval is pending for the integrated sky, gate,
  tracer, pulse terminal, and receptors. Badge, reflex, far/mid/near, and the
  atlases remain placeholders/source-only.
