# Player P2 working notes

P2 is the approved bone-suit / joint-cyan visor concept from ADR-0065.

- `palette.json` — P2 semantic role map: suit bone, visor/tanks joint,
  accent nerve, joints teal, outline ink, grime bone-shadow.
- `remaster.json` — P2 segmentation profile for the semantic path.
- `clips.json` — schema v2 source/clip map. Frames 6–17 jump, 18–27 fall, and
  28–35 land.
- `tmp/` — generated reports and previews; ignored by git.

Build the POC runtime sheets from the repository root:

```bash
npm run art:build-player -- --character p2 --sampler downscale --write-runtime
```

The POC uses the downscale + palette-quantize path. The semantic remaster is
available with `--sampler remaster`; compare both with `--sampler both` before
changing the runtime output.
