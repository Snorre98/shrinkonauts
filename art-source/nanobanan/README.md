# Nanobanan concept plates

Source concepts generated on a flat magenta `#ff00ff` field. These are **not**
runtime assets and must never be referenced by a manifest. The keyed review
copies are generated; only the source JPEGs are tracked.

| File | Intended runtime ID | POC status |
|---|---|---|
| `sprite-agent-neuron.jpeg` | `sprite.agent.neuron` | **Alternate only.** The runtime static is now frame 0 of the animated Neuron Keeper sheet; this plate is kept for review. |
| `sprite-scan-neuron.jpeg` | `sprite.scan.neuron` | **Placeholder.** The 1886×1004 plate fits to 16×9; the myelin sleeves, nodes and forked terminals are not legible at 36×36, and the cyan rim is largely lost. |
| `sprite-scan-synapse.jpeg` | `sprite.scan.synapse` | **POC integrated / final approval pending.** Two cells and the cleft read; the cyan rim is partial because the source plate clips the postsynaptic wall. |
| `sprite-scan-pathway.jpeg` | `sprite.scan.pathway` | **Placeholder.** The 1864×740 plate fits to 16×6; the one-way reading, myelin gaps and cyan rim are lost at 36×36. |
| `sprite-scan-muscle.jpeg` | `sprite.scan.muscle` | **POC integrated / final approval pending.** The muscle bundle and nerve contact read; no joint-ramp pixels survived, so the cyan scan rim is missing. |

`sprite.scan.reflex` remains a reserve placeholder. `sprite.gate.nerve` and
`sprite.checkpoint` remain placeholders.

## Background removal

`npm run art:key` decodes the JPEG through ffmpeg, keys the flat magenta by RGB
distance, suppresses magenta spill on the edge pixels, and writes a hard-alpha
PNG. Full-size keyed copies go to `keyed/` (ignored). Review previews go to
`art-source/previews/nanobanan/`.

```bash
npm run art:key -- \
  --in art-source/nanobanan/sprite-scan-neuron.jpeg \
  --out art-source/nanobanan/keyed/sprite-scan-neuron.png \
  --key "#ff00ff" --tolerance 0.18 --despill --trim \
  --preview art-source/previews/nanobanan/sprite-scan-neuron.png \
  --preview-width 512 --background "#101a20"
```

The default `--tolerance 0.18` and `--softness 0.08` are tuned for these JPEGs.
If a plate has a soft or noisy edge, raise `--tolerance` before lowering
`--alpha-threshold`; the latter trades fringe for holes in the subject.

## Entity fit

`npm run art:fit` takes the keyed PNG, crops to alpha bounds, fits the 18×18
cell without stretching, hard-thresholds alpha, quantises to the approved
non-orange ramps, and writes the runtime PNG, previews and a JSON report. The
fit cell, margin, alpha threshold, byte budget, preview scales and per-asset
ramp allowlists live in `art-source/nanobanan/fit.config.json`; the palette
lives in `art-source/nanobanan/palette.json`.

```bash
# Batch: previews + reports only, no runtime writes
npm run art:fit -- \
  --config art-source/nanobanan/fit.config.json --no-write

# Write the readable runtime sprites
npm run art:fit -- \
  --config art-source/nanobanan/fit.config.json \
  --asset sprite.scan.synapse --asset sprite.scan.muscle
```

Outputs:

- runtime PNGs: `public/packs/anatomy-reflex/shared/sprites/scan-synapse.png`
  and `scan-muscle.png`
- previews: `art-source/previews/nanobanan/entities/` (`-2x.png`, `-8x.png`,
  and `-tint-2x.png` for the warm interaction tint)
- reports: `art-source/nanobanan/reports/*.fit.json`

The reports are the evidence for the placeholder decisions: they record the
source trim, fitted size, final margins, palette validation, alpha violations,
ramp histogram and warnings (source edge clipping, small fit, missing cyan rim,
large palette distance).

## Neuron Keeper source

The runtime Neuron Keeper does **not** use the nanobanan agent plate. It uses the
36-frame animated sheet in `art-source/characters/neuron-agent/` via the
character pipeline. See that folder's README for the build command and status.
The nanobanan agent plate remains an alternate review asset only.

## Source limitation

All five plates have opaque pixels touching the 2048×2048 canvas edge. The fit
crops to alpha bounds, so clipped extremities remain clipped; the reports record
this. Final art should be regenerated with a clear margin rather than relying on
the plate crop.

## Provenance

- **Tool:** Nanobanan / Ludo.ai concept generation (record the exact model and
  seed before shipping).
- **Prompt / plan / licence:** TBD. The POC runtime manifests use the shared
  `Ludo.ai source (POC; plan TBD)` label.
- **Status:** `scan.synapse` and `scan.muscle` are POC-integrated; `scan.neuron`
  and `scan.pathway` remain placeholders; the agent plate is an alternate.
  Final art approval is pending.
