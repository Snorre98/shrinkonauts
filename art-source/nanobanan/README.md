# Nanobanan concept plates

Source concepts generated on a flat magenta `#ff00ff` field. These are **not**
runtime assets and must never be referenced by a manifest. The keyed review
copies are generated; only the source JPEGs are tracked.

| File | Intended runtime ID | Notes |
|---|---|---|
| `sprite-agent-neuron.jpeg` | `sprite.agent.neuron` | Neuron Keeper character |
| `sprite-scan-neuron.jpeg` | `sprite.scan.neuron` | Neuron/myelin scan icon |
| `sprite-scan-synapse.jpeg` | `sprite.scan.synapse` | Synapse/cleft scan icon |
| `sprite-scan-pathway.jpeg` | `sprite.scan.pathway` | One-way pathway scan icon |
| `sprite-scan-muscle.jpeg` | `sprite.scan.muscle` | Muscle effector scan icon |

The intended IDs are provisional: the plates have not been trimmed, scaled to
18×18, palette-quantized, or wired into `assets.final.json`.

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

## Provenance

- **Tool:** Nanobanan / Ludo.ai concept generation (record the exact model and
  seed before shipping).
- **Prompt / plan / licence:** TBD.
- **Status:** background removal only; not final art, not runtime-integrated.
