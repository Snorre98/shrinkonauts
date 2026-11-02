# ADR-0072: Asset fidelity tiers, display sizes, and lossless encoding

- **Status:** Proposed
- **Date:** 2026-11-02
- **Deciders:** Snorre
- **Related:** ADR-0047, ADR-0048, ADR-0049, ADR-0060, ADR-0061, ADR-0065,
  ADR-0070
- **Supersedes:** the fixed entity size rule (`18×18` source / `36×36` display)
  and the `16×16` badge rule in ADR-0048/ADR-0049. The player `14×22` / `28×44`
  anchor, the 2× pixel policy for world characters, and the palette/outline
  rules remain.

## Context

The runtime art is lossless. Sprites are PNG, the sky is lossless VP8L WebP,
and no JPEG or lossy WebP is served from `public/`. Re-encoding at a lower
quality would add artefacts, not fix the current look.

The real fidelity problem is **downscaling**:

| Asset | Source plate | Runtime cell | Opaque pixels |
|---|---:|---:|---:|
| `sprite.gate.ferry` | 1926×1905 | 16×16 content | 206 |
| `sprite.scan.synapse` | 1766×1724 | 16×16 | 200 |
| `sprite.scan.muscle` | 1804×1478 | 16×13 | 118 |
| `sprite.prop.tracer` | 1496×1292 | 16×14 | 127 |

That is roughly 90–120:1 per axis, or 10,000–14,000:1 by area. The fit reports
flag the result (`maxPaletteDistance` 69–91 against a 64 limit), but the assets
are still shipped as `poc-integrated` because the readability gate is only
`minReadablePx: 8`.

The player reads because it is a hand-cleaned 14×22 master. The entities do not
because they are mathematically squeezed concept plates. At 8× the gate is a
blue oval, the scan plates are blobs, and the Neuron Keeper loses its
tentacles, tail, and lantern.

There is also a size-policy problem:

- `ENTITY_DISPLAY_SIZE = 36` is global. Every entity is forced into the same
  footprint regardless of role.
- Complex diagram-like assets (scan plates) need detail, not a larger screen
  footprint.
- The badge was forced from 16×16 into a 32×32 CSS stamp and failed its audit.
  The fix is a 32×32 1:1 source, not a bigger upscale.

Finally, `poc-integrated` currently means both “we ran a fit” and “this is
approved final art”. Those are not the same thing. A mathematical fit is an
interim, not a final asset.

## Decision

Introduce **fidelity classes** and **per-asset display sizes**.

### 1. Display size is asset data

Add an optional `display: { width, height }` to manifest entries. The renderer
uses it for sprites, sheets, and images. Missing `display` preserves the current
size (`28×44` player, `36×36` entity, `36×36` scan, `32×32` atlas/badge).

`ENTITY_DISPLAY_SIZE = 36` becomes a fallback, not a global rule. The display
size is visual only; physics body sizes, collision shapes, and puzzle bounds do
not change.

### 2. Fidelity classes

| Class | Author/source | Display | Use |
|---|---:|---:|---|
| `world-2x` player | 14×22 | 28×44 | P1/P2, player sheets |
| `world-2x` prop | 18×18 | 36×36 | tracer, receptors, simple props |
| `world-2x` entity | 24×24 | 48×48 | gate, pulse terminal, exit, agent |
| `ui-1x` scan | 36×36 | 36×36 | scan plates and diagram-like targets |
| `ui-1x` badge | 32×32 | 32×32 | HUD stamp |
| `atlas` | 32×32 frames | 32×32 frames | bone/nerve material atlases |
| `painted-screen` | 1280×736 | 1280×736 stage | pretty sky, per ADR-0071 |

The important move is that **diagram-like assets become 1:1**, not 2×. A 36×36
scan plate has 1,296 source pixels instead of 256, while keeping the same
36×36 screen footprint. The gate and agent get 24×24 content (576 pixels,
2.25× the current area) and a 48×48 display footprint.

The `world-2x` class keeps the ADR-0048 rule: one source pixel becomes a 2×2
display block. The `ui-1x` class is a recorded exception for scan plates and
the badge, in the same spirit as the existing 1:1 atlas frames. It is not a
licence to mix densities inside one asset.

### 3. Fit config and readability gates

Extend the fit config with a class block and per-asset overrides:

```json
"fidelity": {
  "class": "world-2x",
  "cell": [24, 24],
  "display": [48, 48],
  "minReadablePx": 16,
  "minOpaquePixels": 180,
  "maxPaletteDistance": 32,
  "manualCleanupRequired": true
}
```

Suggested gates:

| Class | `minReadablePx` | `minOpaquePixels` | `maxPaletteDistance` |
|---|---:|---:|---:|
| `world-2x` player | 14 | 300 | 32 |
| `world-2x` prop | 12 | 100 | 32 |
| `world-2x` entity | 16 | 180 | 32 |
| `ui-1x` scan | 24 | 300 | 32 |
| `ui-1x` badge | 24 | 300 | 32 |

A fit that misses a gate may be kept as a preview, but not shipped as final.

### 4. Status split

Replace the single `poc-integrated` status with:

- **`fit-preview`** — the fit tool ran; the asset is an interim. It may ship in
  a POC build only if no better asset exists, and it is visibly marked in the
  report.
- **`hand-cleaned`** — a human has redrawn or cleaned the asset at the target
  cell size, checked the silhouette, palette, and alpha, and approved it.
- **`placeholder`**, **`alternate`**, **`reserve`** remain as today.

Only `hand-cleaned` assets may be marked final.

### 5. Encoding policy

- **Pixel art** (`world-2x`, `ui-1x`, `atlas`): PNG or lossless WebP only. No
  JPEG, no lossy WebP, and no palette quantisation after hand cleanup.
- **Painted plates** (`painted-screen`): lossless WebP. The current 1280×736
  pretty sky is a recorded exception at ~956 KiB; it may stay lossless. If size
  reduction is required, crop to the stage or re-encode losslessly first. A
  high-quality lossy WebP is allowed only with an explicit recorded exception,
  and never for pixel art.
- `image-rendering: pixelated` and nearest sampling apply to pixel classes.
  Painted plates use linear sampling per ADR-0071.
- CI checks dimensions, WebP chunk type (`VP8L` for lossless), alpha, palette,
  and byte budgets. No file under `art-source/` may be referenced by a runtime
  manifest.

### 6. `03-nerve-forest` mapping

| Asset | Current | Target |
|---|---|---|
| `sprite.gate.ferry` | 16×16 / 36×36 | 24×24 / 48×48, hand-cleaned |
| `sprite.pulse.terminal` | 16×16 / 36×36 | 24×24 / 48×48, hand-cleaned |
| `sprite.exit` | placeholder | 24×24 / 48×48 when source exists |
| `sprite.agent.neuron` static + idle | 18×18 / 36×36 | 24×24 / 48×48, static and idle frames |
| `sprite.scan.neuron`, `.pathway` | placeholder | 36×36 / 36×36, hand-cleaned |
| `sprite.scan.synapse`, `.muscle` | 16×16 / 36×36 | 36×36 / 36×36, hand-cleaned |
| `sprite.prop.tracer`, `sprite.receptor.*` | 16×16 / 36×36 | 18×18 / 36×36, hand-cleaned |
| `ui.icon.badge` | 16×16 → 32×32 CSS | 32×32 / 32×32, 1:1 |
| Player | 14×22 / 28×44 | unchanged |
| Atlas frames | 32×32 / 32×32 | unchanged |

Interim re-fit at the larger cell is allowed and encouraged. It is not final
until the hand-clean pass.

## Consequences

**Easier:**

- Scan plates and the badge gain detail without a larger screen footprint.
- The gate, terminal, and Neuron Keeper gain readable silhouettes.
- Per-asset display sizes match the role instead of one global constant.
- Fit reports have clear, enforceable readability gates.
- The encoding policy explicitly protects the pixel palette.
- The player, atlas, and animation anchor stay unchanged.

**Harder:**

- Six to eight assets need re-fit or redraw, plus a new 24×24 Neuron Keeper
  static and idle sheet if the agent moves to the entity class.
- The manifest, renderer, idle animator, world view, and anchors must resolve
  display sizes per asset.
- Props need a visual display size separate from their physics body size.
- Tests and contact sheets must cover the new classes and alpha/palette gates.
- The asset pass costs art time; the current POC build remains shippable.

**Constrained:**

- No direct concept-plate → 16×16 downscale may be marked final.
- No mixed pixel densities within one asset.
- No lossy encoding for pixel art.
- No global cell size bump that makes simple props oversized.
- No fit-preview asset labelled final.

## Validation

- The gate reads as a gate, not an oval, at 1× display.
- The Neuron Keeper reads as one jelly-bean body, one nucleus, 5–7 tentacles,
  one tail, forked terminals, and a lantern at 1× display.
- Scan plates read at 1× on `#101a20`.
- Every final asset passes its class gates and has `maxPaletteDistance ≤ 32`.
- No final asset is `fit-preview`.
- `npm run art:fit` reports the class, cell, display, and gates.
- `npm run pack:validate` resolves every `display` size and every sheet frame.
- No JPEG or lossy WebP is present under `public/`.
- The player is unchanged at 14×22 / 28×44 and the atlas frames remain 32×32.

## Alternatives considered

- **Keep the 18×18 entity cell** — rejected: it is the direct cause of the
  blob-like gate, scan, and agent.
- **Bump every entity to the same larger cell** — rejected: simple props and
  receptors do not need a 48×48 footprint, and a global bump repeats the
  current one-size-fits-all mistake.
- **Make every asset 1:1 high-resolution** — rejected: it breaks the chunky
  pixel style, increases file sizes, and costs the most art time.
- **Lower the compression quality or use lossy WebP** — rejected: the assets
  are already lossless; quality loss would not restore detail.
- **Keep `poc-integrated` as the final status** — rejected: it hides the
  difference between a mathematical fit and approved art.

## References

- [`asset-requirements-v01.md`](../m3/asset-requirements-v01.md) §3, §5, §6
- [`scripts/art-fit.ts`](../../scripts/art-fit.ts)
- [`scripts/art/entity-fit.ts`](../../scripts/art/entity-fit.ts)
- [`art-source/nanobanan/fit.new.config.json`](../../art-source/nanobanan/fit.new.config.json)
- [`src/assets/types.ts`](../../src/assets/types.ts)
- [`src/world/entity-style.ts`](../../src/world/entity-style.ts)
- [`src/world/room-scene.ts`](../../src/world/room-scene.ts)
- [`src/world/entity-idle-animator.ts`](../../src/world/entity-idle-animator.ts)
- [ADR-0047](../adr-m3/0047-pixel-art-visual-direction.md)
- [ADR-0048](../adr-m3/0048-half-resolution-pixel-rendering.md)
- [ADR-0049](../adr-m3/0049-pixel-ui-chrome-and-typography.md)
- [ADR-0060](../adr-art-pipeline/adr-0060-source-work-runtime-asset-layers.md)
- [ADR-0061](../adr-art-pipeline/adr-0061-palette-lut-sprite-variants.md)
