# ADR-0017: Tile variant atlas and manifest metadata

Status: Proposed
Date: 2026-10-28
Deciders: Snorre
Related: ADR-0008, ADR-0014, ADR-0015, ADR-0016, ADR-0029, ADR-0030, ADR-0033

## Context

Terraria-like terrain needs many tile frames:

- 47 blob frames for one material;
- edge/corner variants;
- random grass/gravel variants;
- transition frames between materials;
- pattern frames for procedural fallbacks.

If every variant is a separate asset ID and file, a single multi-material room can
require hundreds of manifest entries. That is hard to author, preload, validate,
and replace during the final art pass.

The current asset manifest supports `sprite`, `sheet`, `gif`, `webp`, `image`,
`background`, `audio`, and `font`. `sheet` is an animation format: frame width,
height, frames, fps, loop. It is not a named-region atlas. Reusing it for tile
variants would blur animation and atlas semantics.

A future-proof tile system needs a named atlas and variant-set model that can
scale from placeholder generated frames to final art without changing room
content.

## Decision

### 1. Add an `atlas` asset type

Extend `AssetType` with `"atlas"`:

```ts
type AssetType =
  | "sprite"
  | "sheet"
  | "gif"
  | "webp"
  | "image"
  | "background"
  | "atlas"
  | "audio"
  | "font";
```

An atlas is a static image with named rectangular regions. It is not an
animation.

Manifest entry:

```ts
interface ManifestAssetEntry {
  type: AssetType;
  src?: string;

  /** Existing sheet fields remain for animation. */
  frameWidth?: number;
  frameHeight?: number;
  frames?: number;
  fps?: number;
  loop?: boolean;

  /** Atlas-only: named regions. */
  regions?: Record<string, AtlasRegion>;

  anchor?: [number, number];
  placeholder?: boolean;
  license?: string;
}

interface AtlasRegion {
  x: number;
  y: number;
  width: number;
  height: number;
}
```

Example:

```json
{
  "tile.bone.atlas": {
    "type": "atlas",
    "src": "shared/tiles/bone-atlas.png",
    "regions": {
      "blob-0": { "x": 0, "y": 0, "width": 32, "height": 32 },
      "blob-1": { "x": 32, "y": 0, "width": 32, "height": 32 },
      "blob-46": { "x": 0, "y": 1472, "width": 32, "height": 32 }
    },
    "license": "Ludo AI Commercial (paid)"
  }
}
```

### 2. Atlas frame references

Add a renderer-agnostic reference:

```ts
type AtlasFrameRef =
  | { kind: "asset"; assetId: AssetId }
  | { kind: "atlas"; assetId: AssetId; frame: string };
```

`assets` resolves an `AtlasFrameRef` to:

```ts
interface ResolvedFrame {
  textureKey: string;
  frame?: string;
  width: number;
  height: number;
  source: AssetSource;
}
```

`world` uses `Phaser.Textures.Frame`; `ui` uses CSS `background-position` and
`background-size` when the atlas is also used by DOM surfaces.

### 3. Tile variant sets

Variant sets are content data, not manifest entries:

```ts
interface TileVariantSet {
  id: string;
  materialId: MaterialId;
  rule: "edge" | "corner" | "blob47" | "wang";

  /** Atlas or per-variant asset list. */
  atlas?: AssetId;
  frames: Record<string, AtlasFrameRef>;

  /** Required when a mask has no exact frame. */
  fallback: AtlasFrameRef;
}
```

Example:

```json
{
  "variantSets": {
    "bone-blob47": {
      "id": "bone-blob47",
      "materialId": "bone",
      "rule": "blob47",
      "atlas": "tile.bone.atlas",
      "frames": {
        "0": { "kind": "atlas", "assetId": "tile.bone.atlas", "frame": "blob-0" },
        "1": { "kind": "atlas", "assetId": "tile.bone.atlas", "frame": "blob-1" },
        "46": { "kind": "atlas", "assetId": "tile.bone.atlas", "frame": "blob-46" }
      },
      "fallback": { "kind": "atlas", "assetId": "tile.bone.atlas", "frame": "blob-0" }
    }
  }
}
```

`variantSets` live in `materials.json` beside materials/patterns. A material may
reference `variantSet` by ID; a tile rule may override it.

### 4. Asset schema version

Bump `ASSET_SCHEMA_VERSION` from `1.0` to `1.1`.

Compatibility:

- parser accepts `1.x`;
- old manifests without `atlas` entries are valid;
- `sheets` keep animation semantics;
- `atlas` entries require `regions`;
- an atlas region must be inside the image bounds when dimensions are available;
- region names are unique within an atlas;
- `TileVariantSet` refs must resolve.

The manifest schema version is independent of the pack content version.

### 5. Preloading and memory

- Preload an atlas once per material family, not per tile.
- A room preload plan includes atlases referenced by its tile rules.
- `assets` caches decoded atlas textures and frame lookups.
- A variant set referencing a missing atlas/frame is a validation error.
- Placeholder atlases may be generated procedurally at runtime; final atlases
  replace them by manifest/file swap.

### 6. Placeholder-first

- A material without an atlas can use procedural placeholders:
  - edge/centre generated at runtime;
  - flat palette + edge style;
  - deterministic variant jitter.
- A final atlas can replace the placeholder without changing room content.
- The atlas is optional; `TileVariantSet.frames` may reference individual asset
  IDs instead of atlas frames.
- The content model is storage-agnostic: `AtlasFrameRef` hides whether a frame
  is a standalone image or an atlas region.

### 7. Validation

`pack:validate` checks:

- `atlas` entries have `regions`;
- region names are unique and non-empty;
- region dimensions are positive integers;
- regions fit inside the atlas image when dimensions are known;
- `TileVariantSet.frames` keys match the autotile rule's mask/key space;
- every frame/fallback resolves;
- `variantSet.materialId` matches the material that references it;
- a material's `variantSet` and inline `variants` are not both required; if both
  exist, `variantSet` wins;
- atlas file exists and has a licence for final assets;
- a placeholder atlas is allowed without a file.

### 8. Non-goals

- No runtime atlas packing.
- No arbitrary frame scripting.
- No per-tile unique atlas allocation.
- No animation semantics on `atlas`.
- No asset path in room/material content; only logical IDs.

## Consequences

**Easier:**

- A 47-frame material is one manifest entry, not 47 files.
- Variant sets can grow without duplicating room content.
- Final art can replace a placeholder atlas without touching rooms.
- Atlas frames work for tiles and UI patterns.
- Validation catches missing masks/fallbacks before boot.

**Harder:**

- The asset parser, schema version, validator, preload plan, and cache grow.
- Atlas authoring needs a region map and consistent frame sizes.
- World and UI must both understand atlas frame references.
- Placeholder generation must match the final atlas key space.

**Constrained:**

- `atlas` is not an animation format.
- No runtime packing.
- No hardcoded frame rectangles in world/UI code.
- No silent fallback for a missing non-placeholder atlas frame.
- Atlas regions cannot exceed the image bounds.

## Alternatives considered

- **Use `sheet` for tile variants.** Reuses the parser, but conflates animation
  timing with named regions and makes UI CSS mapping awkward. Rejected.
- **One asset ID per variant.** Simple initially, but explodes the manifest and
  preload plan at Terraria-scale. Rejected as the general solution.
- **Runtime atlas generation from separate files.** Extra runtime work and no
  authoring clarity; can be a fallback, not the content model. Rejected.
- **A tilemap editor format with embedded variants.** Couples content to a
  specific editor and bypasses the asset/manifest contract. Rejected.

## References

- [`0008-schema-evolution.md`](0008-schema-evolution.md)
- [`0014-material-pattern-vocabulary.md`](0014-material-pattern-vocabulary.md)
- [`0015-tile-material-grid-autotiling.md`](0015-tile-material-grid-autotiling.md)
- [`0016-pattern-projection-surfaces.md`](0016-pattern-projection-surfaces.md)
- [`0029-asset-provider-abstraction.md`](../../shrinkonauts/base-game/adr/0029-asset-provider-abstraction.md)
- [`0030-sprite-animation-format-policy.md`](../../shrinkonauts/base-game/adr/0030-sprite-animation-format-policy.md)
- [`0033-final-asset-integration-timing.md`](../../shrinkonauts/base-game/adr/0033-final-asset-integration-timing.md)
