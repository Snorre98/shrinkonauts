# ADR-0016: Pattern projection across tiles, objects, backgrounds, and UI

Status: Proposed
Date: 2026-10-28
Deciders: Snorre
Related: ADR-0013, ADR-0014, ADR-0015, ADR-0020, ADR-0030, ADR-0031

## Context

Materials (ADR-0014) and tile variants (ADR-0015) can make tiles, objects, and UI
share palette, edge style, and variant language. They do not by themselves make a
pattern **continue** across boundaries.

Examples of the missing behaviour:

- a grass/fiber grain that points in the same direction on every tile;
- a bony cellular pattern that flows across a floor and the wall above it;
- a muscle fiber pattern that continues from a tile floor onto a gate sprite;
- a membrane pattern shared by the world and a dialogue panel;
- a synthetic circuit grain that aligns across tiles, props, and UI.

Each tile/sprite currently samples its own local texture. Even if every object
uses the same image, the pattern repeats from the object origin and does not
continue across boundaries.

The UI is DOM/CSS; the world is Phaser. A shared pattern must be representable in
both, or the “same pattern” claim is false.

## Decision

### 1. Pattern binding selects a space

```ts
type PatternSpace = "world" | "screen" | "local";

interface PatternBinding {
  patternId: PatternId;
  space?: PatternSpace;
  scale?: number;
  rotation?: number;
  offset?: { x: number; y: number };
  seed?: number;
  opacity?: number;
  blend?: "normal" | "multiply" | "overlay";
}
```

| Space | Sampling coordinate | Use |
|---|---|---|
| `world` | room/world pixels | continuous patterns across tiles, objects, backgrounds |
| `screen` | viewport pixels | UI surfaces and screen-space overlays |
| `local` | object/texture-local pixels | baked sprites, icons, objects that should not share phase |

Rules:

- `world` is the default for terrain, walls, and world objects that should feel
  like one material.
- `screen` is the default for UI.
- `local` is an explicit opt-out from continuity.
- `world` patterns require the same `patternId`, `scale`, `rotation`, and
  `seed` to align. `offset` may be used to deliberately shift a region.
- `screen` patterns do not share world coordinates; they share the pattern
  source, scale, and visual language.

### 2. Pattern provider

`assets` owns a pattern provider that resolves a `PatternDefinition` into a
renderer-agnostic resource:

```ts
interface PatternResource {
  /** Phaser texture key, when a texture is available. */
  textureKey?: string;

  /** CSS background-image value, when CSS can represent the pattern. */
  cssBackground?: string;

  /** Optional procedural sample for tests or custom renderers. */
  sample?(x: number, y: number): number;

  /** Repeats/tiling metadata. */
  tileSize?: { width: number; height: number };
}
```

The provider must produce consistent output for the world and UI:

- procedural patterns are generated once into a tileable texture and cached;
- image patterns return the asset texture and a CSS `url(...)`;
- atlas patterns return an atlas frame and a CSS crop/position;
- animated patterns expose a static frame for reduced motion.

A shader-only pattern is not sufficient because the DOM UI cannot share it. If a
shader is used for a world effect, a generated still/tileable fallback must exist
for UI parity.

### 3. World projection

`world` owns a `PatternLayer`:

- samples `world`-space patterns using world coordinates;
- renders tile pattern overlays after the tile base and before entities;
- renders object pattern overlays attached to entities/props;
- renders background pattern layers where authored;
- clips to the target bounds or a mask;
- does not change collision or simulation state.

For a tile at `(x, y)` with tile size `32`, a world-space pattern uses:

```text
u = (x * 32 + localX) / patternScale
v = (y * 32 + localY) / patternScale
```

For an object, the sampler uses the object's world position plus its local
offset. Two adjacent tiles and an object with the same binding therefore sample
one continuous field.

### 4. Object projection

Objects can carry:

```json
{
  "components": {
    "material": {
      "materialId": "muscle",
      "patternId": "muscle-fibers",
      "pattern": {
        "space": "world",
        "scale": 0.75,
        "blend": "overlay",
        "opacity": 0.35
      }
    }
  }
}
```

Two rendering modes:

1. **Baked material** — the sprite already contains the final material. The
   binding supplies palette/edge metadata and optional tint; no continuous
   overlay.
2. **Projected pattern** — a cosmetic pattern overlay is composited over the
   sprite. This is how a floor pattern can continue onto a gate or prop.

Projected patterns are cosmetic. They never change hitboxes, collision, or
puzzle state. A pattern overlay may be disabled for small/UI-critical objects if
it harms readability.

### 5. Background projection

`RoomBackgroundLayer` may gain optional `materialId`/`patternBinding`. The
pattern is sampled in that layer's space:

- `world` for a continuous environmental field;
- `screen` for a fixed atmospheric texture;
- `local` for a baked background layer.

Background patterns never create collision.

### 6. UI projection

`theme.ui.materials` maps UI slots to material IDs:

```json
{
  "ui": {
    "materials": {
      "panel": "bone",
      "dialogue": "nerve",
      "debrief": "membrane"
    },
    "patterns": {
      "panel": { "patternId": "bone-cortex", "space": "screen", "scale": 0.5 }
    }
  }
}
```

The UI material adapter:

- resolves the material/pattern through `materials` + `assets`;
- writes CSS custom properties or inline styles:
  `--material-panel-background`, `--material-panel-tint`,
  `--material-panel-pattern`;
- uses `background-image`, `background-size`, `background-position`, and
  `background-blend-mode` for the pattern;
- keeps text contrast and accessibility independent of the pattern.

UI patterns are `screen` or `local` by default. A UI panel cannot share world
coordinates, but it can share the same pattern source, scale, seed, and palette.

### 7. Direction and organic/synthetic behaviour

- `direction` rotates the pattern field. It applies consistently to all
  `world`-space bindings with the same pattern.
- `family: "organic"` may use irregular fibers/cellular generators and softer
  edges.
- `family: "mineral"` may use granular/cellular generators and harder edges.
- `family: "synthetic"` may use circuit/grid generators and aligned directions.
- `family: "energy"` may use flow/pulse patterns and additive blending.
- Family is a default, not a hard restriction; a material may explicitly
  override its pattern/direction.

### 8. Animation

Pattern animation is optional and cosmetic:

```ts
animation?: {
  kind: "scroll" | "pulse" | "flicker";
  speed: number;
};
```

Rules:

- Animation never carries gameplay timing.
- Reduced motion uses a static frame or zero-speed sample.
- Pattern animation cannot be the only signal for a puzzle state.
- Animated UI patterns must respect the existing reduced-motion setting.
- Pattern animation must not reflow text or move interactive targets.

### 9. Performance and caching

- Generate procedural patterns once; cache by
  `patternId + scale + seed + frame`.
- Use atlases for variant-heavy patterns (ADR-0017).
- Prefer one `PatternLayer`/mask over one shader per object.
- Cull off-screen pattern overlays.
- Reuse the same `PatternResource` across world and UI.
- Cap pattern texture size; use tileable textures, not full-screen unique
  textures.
- Do not create a new texture per tile or per entity instance.

### 10. Validation

`pack:validate` checks:

- `patternId`/`materialId` resolve;
- `space` is known;
- `scale > 0`;
- `rotation`/`direction` are finite;
- `opacity` is in `[0, 1]`;
- source image/atlas asset exists;
- atlas frame exists;
- UI material/pattern slots resolve;
- every UI pattern has a CSS-compatible resource;
- animated patterns have a reduced-motion fallback;
- pattern overlays target a valid entity/background/tile region.

### 11. Accessibility and readability

- Material/pattern changes must not reduce text contrast below the existing
  accessibility baseline.
- Pattern overlays must not obscure interactive highlights, puzzle state, or
  surface text.
- UI panels keep a solid/high-contrast fallback if the pattern fails to load.
- Reduced motion disables pattern animation.
- Colour is not the only material distinction; edge, pattern, or label must
  differ too.

## Consequences

**Easier:**

- A single pattern can visibly connect tiles, objects, backgrounds, and UI.
- Grass/fiber direction is consistent without per-tile bespoke art.
- Organic vs synthetic visual language is data-driven.
- UI looks like part of the same world, not a separate skin.
- Procedural placeholders can later be replaced by image/atlas patterns without
  changing content bindings.

**Harder:**

- A shared pattern provider must support both Phaser and CSS.
- World-space sampling and object overlays add rendering complexity.
- UI contrast and readability need explicit testing.
- Caching and atlas management become part of the asset pipeline.
- Pattern animation needs reduced-motion and performance budgets.

**Constrained:**

- No shader-only pattern that UI cannot represent.
- No gameplay or collision from patterns.
- No per-object unique pattern textures.
- No pattern animation without a static fallback.
- No raw media paths in material/pattern bindings.

## Alternatives considered

- **Bake patterns into every sprite/tile.** Consistent only per asset; no
  continuity, no UI parity, no procedural placeholders. Rejected as the general
  solution.
- **Shader-only world patterns.** Visually strong, but UI cannot share them and
  content becomes renderer-specific. Rejected.
- **One global full-screen pattern overlay.** Continuous, but cannot respect
  material boundaries, object masks, or UI surfaces. Rejected.
- **Separate UI and world pattern assets.** Guarantees drift. Rejected.
- **Only local-space patterns.** Simple, but no continuity across tiles or
  objects. Rejected as the only mode.

## References

- [`0013-cosmetic-feedback-effects-accessibility.md`](0013-cosmetic-feedback-effects-accessibility.md)
- [`0014-material-pattern-vocabulary.md`](0014-material-pattern-vocabulary.md)
- [`0015-tile-material-grid-autotiling.md`](0015-tile-material-grid-autotiling.md)
- [`0017-tile-variant-atlas-manifest.md`](0017-tile-variant-atlas-manifest.md)
- [`../../shrinkonauts/base-game/adr/0020-accessibility-baseline.md`](../../shrinkonauts/base-game/adr/0020-accessibility-baseline.md)
- [`../../shrinkonauts/base-game/adr/0030-sprite-animation-format-policy.md`](../../shrinkonauts/base-game/adr/0030-sprite-animation-format-policy.md)
- [`../../shrinkonauts/base-game/adr/0031-layered-background-composition.md`](../../shrinkonauts/base-game/adr/0031-layered-background-composition.md)
