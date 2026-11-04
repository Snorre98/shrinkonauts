# ADR-0075: Hero-asset treatment profiles and per-class fit pipeline

- **Status:** Proposed
- **Date:** 2026-11-02
- **Deciders:** Snorre
- **Related:** ADR-0047, ADR-0048, ADR-0060, ADR-0061, ADR-0062, ADR-0063,
  ADR-0065, ADR-0072, ADR-0074
- **Extends:** ADR-0060–0065 (source/work/runtime layers, palette LUTs,
  animation, previews) and ADR-0072 §3–5 (fidelity classes, readability gates,
  and encoding).
- **Supersedes:** the single global `cell` in the fit configuration, the fixed
  palette-cell match, and the 18×18 entity / 24×24 prop target rows in
  ADR-0072.

## Context

The current fit pipeline assumes one cell for every sprite:

- `scripts/art-fit.ts` reads one top-level `cell`, one `margin`, and one set of
  gates for every asset.
- `scripts/art/palette.ts` and `scripts/art-build-player.ts` require the
  palette's `cell` to match the fit cell.
- `fit.new.config.json` and `fit.silicon.config.json` are both 18×18.
- The Neuron Keeper source is 267×264 per frame; 18×18 is a 14.8:1 downscale.
  The concept plates are 2048×2048 or larger; the current fit is often
  90–120:1 per axis.

ADR-0074 introduces three hero roles with 1:1 display: `npc` at 96×96,
`interactable` at 64×64, and `prop` at 48×48. Those sizes cannot share a single
18×18 cell or a single palette cell. The pipeline also needs a treatment record:
a mathematical fit is not the same as a hand-cleaned hero asset, and a
2048→96 blind squeeze is not an acceptable final.

The runtime stays lossless. "Less compressed" here means **less source-to-cell
downscaling**, not lower WebP quality.

## Decision

### 1. Classes and gates

Add per-class cells and gates. A config declares a `classes` map; each asset
selects one class and may override `cell`, `display`, or `treatment`.

| Class | Cell | Display | `minReadablePx` | `minOpaquePixels` | `maxPaletteDistance` | `maxDownscale` |
|---|---:|---:|---:|---:|---:|---:|
| `hero-npc` | 96×96 | 96×96 | 72 | 3500 | 24 | 4:1 |
| `hero-interactable` | 64×64 | 64×64 | 48 | 1400 | 24 | 10:1 |
| `hero-prop` | 48×48 | 48×48 | 32 | 600 | 24 | 12:1 |
| `ui-1x scan` | 36×36 | 36×36 | 24 | 300 | 24 | 10:1 |
| `world-2x player` | 14×22 | 28×44 | 14 | 300 | 32 | 8:1 |
| `world-2x decor` | 18×18 | 36×36 | 8 | 100 | 32 | 16:1 |

`maxDownscale` is the ratio between the cropped source content bounds and the
fitted content, measured per axis. The Keeper at 267→96 is 2.8:1 and passes.
A 2048×2048 CPU plate with a 1200 px subject at 96 px is 12.5:1 and fails; that
is intentional. The asset must be cropped, redrawn, or hand-cleaned rather than
mechanically squeezed.

The gates are warnings for `fit-preview` and hard gates for `hand-cleaned`
final assets. A recorded exception is required to ship a final asset outside a
gate.

### 2. Treatment profiles

The fit tool records a `treatment` and the artist works to it:

- **`hero-npc`** — silhouette-first; 1 px ink outline; minimum 2×2 colour
  clusters at display size; one warm nerve accent (lantern/nucleus) and one
  joint-cyan accent; hand-cleaned; stable baseline across frames; static frame
  retained for reduced motion.
- **`hero-interactable`** — 1 px outline; a joint-cyan functional accent on the
  edge the player uses; hand-cleaned; readable at 64 px; no interior detail
  smaller than 2×2 display pixels.
- **`hero-prop`** — 1 px outline; accent only when carried or active;
  hand-cleaned; readable at 48 px.
- **`ui-1x scan`** — existing diagram treatment; high contrast on `#101a20`;
  2×2 clusters; no world-scale upscale.
- **`world-2x player`** — unchanged; 14×22 master, 28×44 display.
- **`world-2x decor`** — unchanged; 18×18 master, 36×36 display.

A hero asset may use the existing three-step ramps. Detail comes from
silhouette, dither, outline, and accent placement, not from adding colours. No
new off-palette colours and no anti-aliasing.

### 3. Configuration

The fit config moves to schema version 2:

```json
{
  "schemaVersion": 2,
  "palette": "art-source/nanobanan/palette.json",
  "classes": {
    "hero-npc": {
      "cell": [96, 96],
      "display": [96, 96],
      "margin": 2,
      "minReadablePx": 72,
      "minOpaquePixels": 3500,
      "maxPaletteDistance": 24,
      "maxDownscale": 4,
      "treatment": "hero-npc"
    },
    "hero-interactable": {
      "cell": [64, 64],
      "display": [64, 64],
      "margin": 2,
      "minReadablePx": 48,
      "minOpaquePixels": 1400,
      "maxPaletteDistance": 24,
      "maxDownscale": 10,
      "treatment": "hero-interactable"
    }
  },
  "assets": [
    {
      "id": "sprite.agent.neuron",
      "class": "hero-npc",
      "status": "fit-preview",
      "source": "art-source/nanobanan/keyed/agent-neuron.png",
      "output": "public/packs/anatomy-reflex/shared/sprites/agent-neuron.png",
      "runtime": true,
      "ramps": ["teal", "bone", "boneShadow", "nerve", "joint", "sage", "ink"]
    }
  ]
}
```

Rules:

1. `classes` is required in schema 2. A per-asset `cell`, `display`,
   `margin`, `minReadablePx`, `minOpaquePixels`, `maxPaletteDistance`,
   `maxDownscale`, or `treatment` overrides the class value.
2. The palette document's `cell` becomes optional. When present it is
   advisory; the fit cell wins. This is required because P1/P2, the Keeper,
   and hero objects use different cells.
3. `schemaVersion: 1` configs remain readable and keep the current 18×18
   behaviour until migrated.
4. The report records `class`, `cell`, `display`, `fidelity`, `treatment`,
   `sourceScale`, the gates, and the status for every asset.

### 4. Previews and contact sheets

The current 2×/8× preview is not enough to judge the hierarchy:

- 1× display preview: the actual runtime size.
- 2× display preview: pixel inspection.
- 4× inspection preview: cleanup review.
- Stage-scale preview: crop at 1280×504, camera zoom 2, with a 28×44 player
  silhouette and the actual background swatch behind the asset.
- Pack contact sheet: every role side by side with the player silhouette.

The stage-scale preview is the acceptance surface for "astronauts look small"
and "objects stand out". It is generated from the runtime export, not from the
untouched source plate.

### 5. Animation

`art-source/characters/neuron-agent/working/clips.json` moves to a 96×96 cell
and a 96×96 display. The existing 36-frame idle loop becomes a 3456×96 sheet.

- The static frame remains frame 0.
- The idle loop remains 0–35 at 12.5 fps.
- Reduced motion keeps the static frame.
- Hero animation previews use 2× and 4×, not the player's 8×; the sheet GIF is
  not rendered at 8×.
- `sprite.agent.cpu` ships as a 96×96 static until an idle sheet exists.

### 6. Encoding and budgets

The encoding policy from ADR-0072 is unchanged:

- Pixel art: PNG or lossless WebP only.
- No JPEG, no lossy WebP, no palette quantisation after hand cleanup.
- Alpha is hard 0 or 255; no magenta fringe; no anti-aliasing.

Starting byte budgets, to be rebaselined after the first export:

| Class | Budget |
|---|---:|
| `hero-npc` static | ≤ 32 KiB |
| `hero-npc` idle sheet (36 frames) | ≤ 512 KiB |
| `hero-interactable` | ≤ 16 KiB |
| `hero-prop` | ≤ 8 KiB |
| `ui-1x scan` | ≤ 16 KiB |
| `world-2x player` sheet | existing budget |

### 7. Status and gates

ADR-0072's status split remains: `fit-preview`, `hand-cleaned`, `placeholder`,
`alternate`, `reserve`.

- A blind fit may ship as `fit-preview` in a POC build.
- Only a `hand-cleaned` asset may be final.
- A hero asset that misses `minReadablePx`, `minOpaquePixels`,
  `maxPaletteDistance`, or `maxDownscale` is visibly marked in the report.
- No `fit-preview` asset is labelled final.

### 8. Asset mapping

| Asset | Current | Target |
|---|---|---|
| `sprite.agent.neuron` static + idle | 18×18 / 36×36 | 96×96 / 96×96, `hero-npc`, sheet 96 |
| `sprite.agent.cpu` | 18×18 / 36×36 | 96×96 / 96×96, `hero-npc` |
| `sprite.gate.ferry`, `sprite.gate.actuator` | 18×18 / 36×36 | 64×64 / 64×64, `hero-interactable` |
| `sprite.pulse.terminal`, `sprite.console.*`, `sprite.socket.*`, `sprite.exit*` | 18×18 / 36×36 | 64×64 / 64×64, `hero-interactable` |
| `sprite.prop.tracer`, `sprite.prop.route_plug` | 18×18 / 36×36 | 48×48 / 48×48, `hero-prop` |
| `sprite.receptor.*` | 18×18 / 36×36 | 64×64 / 64×64, `hero-interactable` |
| `sprite.scan.*` | 16×16 / 36×36 | 36×36 / 36×36, `ui-1x` |
| `sprite.pad.dendrite`, `sprite.pad.terminal` | new | 64×64 / 64×64, `hero-interactable` |
| `sprite.pad.sensor` | 18×18 / 36×36 | 64×64 / 64×64, `hero-interactable` |
| Players | 14×22 / 28×44 | unchanged |
| Decor | 18×18 / 36×36 | unchanged |

The floating scan plates and the physical world pads must be separate asset IDs.
Reusing a 36×36 scan plate at 64×64 would upscale it and break the 1:1 rule.

## Consequences

**Easier:**

- Each role gets the cell and gates that match its job.
- The Keeper and interactables can be hand-cleaned at their real display size.
- The report records whether an asset is a fit or a final.
- The stage-scale contact sheet makes the size hierarchy reviewable.
- P1/P2, decor, atlas, and encoding rules stay stable.

**Harder:**

- The fit config and palette parsing need a schema migration.
- The Keeper sheet grows from 648×18 to 3456×96; preview and byte budgets must
  be rechecked.
- Every hero asset needs a hand-clean pass; a blind fit is not final.
- The CPU plate fails the 4:1 gate on a blind fit and needs a crop/redraw.
- Reports, contact sheets, and tests must understand classes and treatments.
- The pipeline must keep per-asset cells from leaking into unrelated assets.

**Constrained:**

- No single global cell for all assets.
- No 1:1 upscale of a smaller source.
- No hero asset marked final while it is `fit-preview`.
- No lossy encoding or post-clean quantisation.
- No mixing of pixel densities inside one asset.
- No raw `art-source/` file referenced by a runtime manifest.

## Validation

- `npm run art:fit -- --config <config> --no-write` reports the class, cell,
  display, source scale, gates, and status for every asset.
- The Keeper's fit reports a source scale of approximately 2.8:1 and passes the
  `hero-npc` gates after hand cleaning.
- A 2048×2048 CPU plate either passes the 4:1 gate after cropping or is marked
  `fit-preview` with the failure visible.
- Every final hero asset has `maxPaletteDistance ≤ 24`, hard alpha, no magenta
  fringe, and 2×2 clusters at display size.
- The stage-scale contact sheet shows the player at 28×44 and the NPC at 96×96
  in the same 1280×504 crop.
- `npm test`, `npm run pack:validate`, `npm run art:build-player`, and the
  1280×720 capture review pass.
- No JPEG or lossy WebP is present under `public/`.
- A schema-1 config still runs with the legacy 18×18 behaviour.

## Alternatives considered

- **Keep the global 18×18 cell** — rejected: it is the direct cause of the
  detail loss and cannot express the hero roles.
- **Use one 96×96 cell for everything** — rejected: simple props and decor
  would become oversized and expensive.
- **Use a single 1:1 cell and scale every asset** — rejected: it breaks the
  world-2x actors and inflates file sizes.
- **Lower WebP quality** — rejected: the runtime is lossless; quality loss does
  not restore detail.
- **Keep `poc-integrated` as the final status** — rejected: it hides the
  difference between a mathematical fit and approved art.
- **Generate hero art only with the fit tool** — rejected: a blind squeeze from
  a 2048 px plate will not produce a readable 96 px character.

## References

- [`scripts/art-fit.ts`](../../scripts/art-fit.ts)
- [`scripts/art/entity-fit.ts`](../../scripts/art/entity-fit.ts)
- [`scripts/art/palette.ts`](../../scripts/art/palette.ts)
- [`scripts/art-build-player.ts`](../../scripts/art-build-player.ts)
- [`scripts/art/player-clips.ts`](../../scripts/art/player-clips.ts)
- [`art-source/nanobanan/fit.new.config.json`](../../art-source/nanobanan/fit.new.config.json)
- [`art-source/nanobanan/fit.silicon.config.json`](../../art-source/nanobanan/fit.silicon.config.json)
- [`art-source/characters/neuron-agent/working/clips.json`](../../art-source/characters/neuron-agent/working/clips.json)
- [`src/assets/types.ts`](../../src/assets/types.ts)
- [ADR-0047](../adr-m3/0047-pixel-art-visual-direction.md)
- [ADR-0048](../adr-m3/0048-half-resolution-pixel-rendering.md)
- [ADR-0060](adr-0060-source-work-runtime-asset-layers.md)
- [ADR-0061](adr-0061-palette-lut-sprite-variants.md)
- [ADR-0062](adr-0062-data-driven-sprite-animation.md)
- [ADR-0063](adr-0063-build-time-animation-previews.md)
- [ADR-0065](adr-0065-p2-bone-suit-joint-visor.md)
- [ADR-0072](../adr-presentation/0072-asset-fidelity-tiers-and-encoding.md)
- [ADR-0074](../adr-presentation/0074-hero-scale-npcs-and-interactables.md)
