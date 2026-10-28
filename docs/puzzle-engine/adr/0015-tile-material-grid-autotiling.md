# ADR-0015: Tile material grid, autotiling, and variants

Status: Accepted
Date: 2026-10-28
Deciders: Snorre
Related: ADR-0008, ADR-0013, ADR-0014, ADR-0016, ADR-0017, ADR-0029, ADR-0031

## Context

The current room format has one tile layer:

```json
{
  "tileset": "tileset.anatomy",
  "layers": {
    "tiles": [
      "##########",
      "#        #",
      "##########"
    ]
  }
}
```

`#` means solid; space means empty. `RoomScene.createTiles` draws every `#` cell
with the same texture. There is no per-tile material, neighbour awareness,
variant selection, or autotiling.

That cannot produce a Terraria-like result:

- a bone floor and a nerve floor cannot share a room;
- grass/fibers cannot choose an edge or direction;
- the same tile repeats visibly;
- a tile cannot know whether it is a top edge, inner corner, or isolated island;
- tile visuals cannot be varied without creating one entity per tile.

A material property alone is not enough. Tile framing is a renderer concern that
needs a material grid, neighbour masks, variant sets, and deterministic
selection.

## Decision

### 1. Add an optional tile material grid

Extend `RoomDocument` with optional fields:

```ts
interface RoomDocument {
  // existing
  tileset: AssetId;
  layers: { tiles: string[] };

  // new, optional
  tileMaterials?: string[];
  tileMaterialLegend?: Record<string, TileMaterialRule>;
  defaultMaterialId?: string;
  materialSeed?: number;
}
```

Rules:

- `layers.tiles` remains the **collision/occupancy** grid. `#` = solid, space =
  empty. Existing content is unchanged.
- `tileMaterials` is a parallel grid of material characters with the same
  dimensions as `layers.tiles`.
- If `tileMaterials` is absent, every solid tile uses `defaultMaterialId`, or
  the room's `tileset` as a single default material. Existing rooms keep their
  current appearance.
- A material character on an empty `layers.tiles` cell is allowed: it renders a
  non-colliding decorative tile. Collision is still owned by `layers.tiles`.
- A solid `layers.tiles` cell with no material character uses the default
  material.
- `materialSeed` makes variant selection deterministic and reproducible. It
  defaults to a room-derived stable seed.

### 2. Tile material rules

```ts
type AutotileRule =
  | "none"
  | "edge"
  | "corner"
  | "blob47"
  | "wang"
  | "randomVariants";

interface TileMaterialRule {
  materialId: MaterialId;
  autotile: AutotileRule;

  /** Named set of mask/edge variants. */
  variantSet?: string;

  /** Inline variants when no named set is used. */
  variants?: AtlasFrameRef[];

  /** Optional per-rule pattern override. */
  patternId?: PatternId;

  /** Optional per-rule tint token. */
  tint?: string;
}
```

Example:

```json
{
  "tileMaterials": [
    "bbbnnnnnnn",
    "b        n",
    "bbbnnnnnnn"
  ],
  "tileMaterialLegend": {
    "b": { "materialId": "bone", "autotile": "blob47" },
    "n": { "materialId": "nerve", "autotile": "edge" }
  },
  "defaultMaterialId": "bone",
  "materialSeed": 42
}
```

### 3. Autotile rules

The renderer computes an 8-neighbour mask over the material grid:

```text
bit 0: N
bit 1: NE
bit 2: E
bit 3: SE
bit 4: S
bit 5: SW
bit 6: W
bit 7: NW
```

Only neighbours with the same `materialId` count as connected by default. A
future ADR may add material merge groups; do not add them implicitly.

| Rule | Neighbour input | Use |
|---|---|---|
| `none` | none | one texture or one deterministic variant |
| `edge` | 4-neighbour mask (N/E/S/W) | simple edge/corner sets, 16 variants |
| `corner` | 8-neighbour mask | corner-aware sets with a larger variant map |
| `blob47` | 8-neighbour mask mapped to the standard 47-frame blob set | Terraria-like terrain |
| `wang` | edge/corner pairs mapped by a Wang set | authored transition sets |
| `randomVariants` | coordinate hash, no neighbour mask | grass/gravel variation where edges do not need framing |

`variantSet` maps masks (or named edge/corner keys) to variants. It is declared in
`materials.json` and may reference individual asset IDs or atlas frames
(ADR-0017).

If a mask has no entry:

1. use the variant set's `fallback`;
2. otherwise use the material's first variant;
3. otherwise use the material's flat palette/edge placeholder.

A missing fallback is a validation error when `autotile` uses a neighbour mask
(`edge`, `corner`, `blob47`, or `wang`).

### 4. Deterministic variant selection

Variant selection must be deterministic and independent of load order:

```ts
hash(materialId, x, y, materialSeed) % variants.length
```

Rules:

- Same room + same seed + same coordinates = same variant.
- Variants never depend on wall-clock time or `Math.random()`.
- `randomVariants` uses the same hash but does not read neighbours.
- `none` uses one texture; if multiple variants are supplied, it selects by
  hash, not by neighbour mask.
- The selected variant is visual only; it never affects collision.

### 5. Tile renderer responsibilities

`world` owns a `TileMaterialRenderer`:

1. Read `layers.tiles` (collision) and `tileMaterials` (visual).
2. For each cell, resolve the material rule.
3. Compute the neighbour mask from the material grid.
4. Select a variant deterministically.
5. Draw the tile with the material palette/edge/pattern.
6. Apply `TileVisualState` from ADR-0013 on top for tint/overlay/swap effects.
7. Never change collision or puzzle state.

The renderer may use Phaser tilemaps or per-tile images. The content model does
not depend on that choice.

### 6. Collision is separate

Hard rule:

> `layers.tiles` owns collision. `tileMaterials` owns appearance.

Consequences:

- A material character on an empty collision cell is decorative and passable.
- A solid collision cell with no material uses the default material.
- An effect may tint, overlay, swap, or dissolve a tile visually, but it cannot
  make it solid or passable.
- A bridge that becomes walkable is a gate/body or collision-state change, not a
  material or tile effect.

This prevents the visual layer from becoming a second collision engine.

### 7. Background and object consistency

- Background layers may carry a `materialId`/`patternBinding` (ADR-0014/0016)
  so the same visual language extends behind the tile layer.
- Objects use `components.material` and, optionally, a pattern overlay.
- UI uses `theme.ui.materials` and the shared pattern provider (ADR-0016).
- A material can be used by tiles, objects, backgrounds, and UI without
  duplicating definitions.

### 8. Validation

`pack:validate` checks:

- `tileMaterials` width/height match `layers.tiles`;
- every character in `tileMaterialLegend` and `tileMaterials` is known;
- every `materialId`/`patternId`/`variantSet` resolves;
- `autotile` is a known rule;
- every neighbour-mask rule (`edge`, `corner`, `blob47`, `wang`) has a fallback;
- variant IDs/atlas frames exist;
- `materialSeed` is a finite integer when present;
- a material character on an empty collision cell is allowed but reported as
  informational;
- a solid collision cell without a material uses the default and is not an
  error;
- a room with `tileMaterials` but no legend is an error unless all characters
  are the single default material.

### 9. Compatibility

- Old rooms without `tileMaterials` render exactly as before.
- `tileset` remains the default visual source.
- No save field is added; material/variant state is visual and derived.
- Pack schema gains optional fields; old content remains valid.
- If `tileMaterials` is present, `layers.tiles` still has the same collision
  meaning, so existing puzzle/world tests remain meaningful.

## Consequences

**Easier:**

- A room can mix bone, nerve, muscle, membrane, and synthetic materials.
- Tiles connect visually instead of repeating one texture.
- Terraria-like blob/edge/Wang terrain is expressible in data.
- Variants are deterministic and testable.
- Materials remain consistent across tiles, objects, backgrounds, and UI.
- Effects can layer on top without changing the base material.

**Harder:**

- The tile renderer becomes material-aware and neighbour-aware.
- Variant sets/atlases need authoring and validation.
- The content format gains a parallel grid.
- Tile-level tests must cover masks, fallbacks, and determinism.
- The current one-tile assumption in the M3 asset document is no longer valid.

**Constrained:**

- No collision from `tileMaterials`.
- No implicit material merging; merge groups need a later ADR.
- No wall-clock/random variants.
- No per-tile entity workaround.
- No hardcoded material renderer branches.

## Alternatives considered

- **One giant tileset with every variant.** Simple at render time, but no
  material grid, neighbour rules, or per-material palette/pattern. Rejected.
- **Replace `layers.tiles` with material characters.** Cleaner on paper, but
  breaks collision compatibility and conflates visual and physical state.
  Rejected.
- **One entity per tile.** Flexible, but expensive, unmaintainable, and couples
  level authoring to entity code. Rejected.
- **Manual variant selection in the room JSON.** No neighbour logic, huge author
  burden. Rejected.
- **Only random variants.** Handles grass texture but not edges/corners.
  Rejected as the only rule.

## References

- [`0008-schema-evolution.md`](0008-schema-evolution.md)
- [`0013-cosmetic-feedback-effects-accessibility.md`](0013-cosmetic-feedback-effects-accessibility.md)
- [`0014-material-pattern-vocabulary.md`](0014-material-pattern-vocabulary.md)
- [`0016-pattern-projection-surfaces.md`](0016-pattern-projection-surfaces.md)
- [`0017-tile-variant-atlas-manifest.md`](0017-tile-variant-atlas-manifest.md)
- [`0029-asset-provider-abstraction.md`](../../shrinkonauts/base-game/adr/0029-asset-provider-abstraction.md)
- [`0031-layered-background-composition.md`](../../shrinkonauts/base-game/adr/0031-layered-background-composition.md)
