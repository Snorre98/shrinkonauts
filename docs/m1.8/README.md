# M1.8 — Material and Pattern Layer

**Status:** planned
**Scope:** the visual-language foundation for tiles, objects, backgrounds, and UI.
**Source decisions:** [ADR-0014–0017](../puzzle-engine/adr/README.md)
**Implementation plan:**
[`material-pattern-implementation-plan.md`](../puzzle-engine/material-pattern-implementation-plan.md)
**Baseline:** the current room/tile renderer, asset manifest, theme, and 03/04
content.

## 1. Why M1.8 exists

The game needs a shared visual language, not just more individual sprites:

- a bone floor, a nerve wall, and a muscle gate should look like they belong to
  the same body;
- organic and synthetic materials should follow different pattern rules;
- grass/fiber grain should point in a consistent direction;
- tile edges should connect instead of repeating one texture;
- UI panels should share the world's material language;
- a pattern should be able to continue across tile, object, and background
  boundaries;
- hundreds of tile variants should fit in a manifest without exploding into
  hundreds of files.

The current model cannot express that:

- one `tileset` per room;
- `#`/space tile grid only;
- one sprite per entity;
- palette/font-only UI theming;
- no autotiling, variants, materials, patterns, atlas regions, or world/screen
  UV spaces.

M1.8 adds the content and rendering foundation. It is not a final art pass and not
a feedback milestone.

## 2. Milestone boundary

| In scope | Out of scope |
|---|---|
| `materials` module and pack `materials.json` | Final art production |
| Material/pattern definitions and bindings | Lighting, shadows, or full Terraria simulation |
| Tile material grid and autotile rules | Collision changes from materials |
| Variant sets and deterministic selection | Runtime atlas packing |
| Pattern provider with Phaser/CSS parity | Arbitrary content shaders |
| World, object, background, and UI pattern projection | Full UI skin |
| Atlas asset type and manifest metadata | External tilemap editor integration |
| Placeholder materials/patterns for 03/04 | Authoring all levels with final materials |

M1.8 is allowed to be architecture-heavy. The point is to make later art and
level authoring cheap, not to finish the art here.

## 3. Deliverables

### Material model

- [ ] `src/materials/` — types, definitions, resolution, autotile masks, variant
  selection.
- [ ] Pack-level `materials.json` with materials, patterns, and variant sets.
- [ ] `MaterialBinding` on tiles, entities, backgrounds, and UI slots.
- [ ] Theme palette token references instead of raw media paths.

### Tile rendering

- [ ] Optional `tileMaterials` grid and `tileMaterialLegend`.
- [ ] `none`, `edge`, `corner`, `blob47`, `wang`, and `randomVariants` rules.
- [ ] Deterministic variant selection by coordinate + seed.
- [ ] `TileMaterialRenderer` with neighbour masks and fallbacks.
- [ ] Collision remains owned by `layers.tiles`.

### Pattern projection

- [ ] `PatternProvider` with Phaser texture and CSS background outputs.
- [ ] `world`, `screen`, and `local` pattern spaces.
- [ ] World-space pattern continuity across tiles/objects.
- [ ] Object pattern overlays.
- [ ] Background pattern bindings.
- [ ] UI material/pattern slots with CSS parity.
- [ ] Reduced-motion static fallbacks.

### Atlas and validation

- [ ] `atlas` asset type and named regions.
- [ ] `AtlasFrameRef` resolution.
- [ ] `TileVariantSet` with mask/frame maps and fallback.
- [ ] Asset schema `1.1`; old `1.x` manifests remain valid.
- [ ] `pack:validate` coverage for materials, patterns, variants, atlases, and UI.
- [ ] Placeholder-first atlas/material generation.

### Proof content

- [ ] A material-migrated section of 03 and/or 04 demonstrating:
  - at least two materials in one room;
  - autotiled edges/corners;
  - deterministic variants;
  - a shared world-space pattern across a tile and an object;
  - a UI panel using the same material/pattern language.

## 4. Definition of done

M1.8 is done when:

1. A room can mix multiple materials without per-tile entities.
2. Tile edges/corners connect through an autotile rule.
3. Variant selection is deterministic and covered by tests.
4. A pattern can continue across a tile and an object using `world` space.
5. A UI panel can use the same material/pattern source as the world.
6. An atlas-backed variant set resolves without one file per variant.
7. Old rooms without material data render exactly as before.
8. Materials never change collision or puzzle state.
9. Reduced motion removes pattern animation without removing material identity.
10. `npm test`, `npm run pack:validate`, `npm run pack:smoke`,
    `npm run smoke:e2e`, `npm run build`, and `git diff --check` pass.

## 5. Non-goals

- No final art pass and no requirement to generate final textures.
- No lighting engine, normal maps, or dynamic shadows.
- No runtime atlas packer.
- No arbitrary shader code from content.
- No material-driven collision, hazards, or puzzle logic.
- No full Terraria feature parity (walls, paint, wiring, liquids, etc.).
- No UI redesign; only material/pattern hooks in the existing surfaces.
- No replacement of the asset provider or manifest model; atlas extends it.

## 6. Compatibility

- Old rooms use their `tileset`/`sprite` assets unchanged.
- `tileMaterials` is optional; absence preserves the single-texture renderer.
- Old manifests remain valid; `atlas` is additive and `1.x` is accepted.
- Materials/patterns are visual only and add no save fields.
- Existing feedback/effect tile visuals layer on top of the material base.
- The M3 asset inventory must be re-baselined against material variants and
  atlases before final art.

## 7. Risks

| Risk | Mitigation |
|---|---|
| Material layer becomes a second collision engine | Hard rule: `layers.tiles` owns collision |
| Pattern projection is too expensive | Cache pattern resources; one pattern layer; cull off-screen |
| UI and world patterns drift | One `PatternProvider`, one `PatternResource`, CSS/Phaser parity tests |
| Variant atlas authoring is error-prone | Region validation, fallback requirement, placeholder atlases |
| Content model becomes a scripting engine | Closed material families, generators, autotile rules, and pattern spaces |
| Old rooms regress | Optional fields; old-content golden tests |
| Final art invalidates variants | Content model is storage-agnostic; atlas is replaceable |
| Pattern hurts readability | Contrast checks, overlay opacity limits, solid fallback |

## 8. Verification

```sh
npm test
npm run pack:validate
npm run pack:smoke
npm run smoke:e2e
npm run build
git diff --check
```

Manual checks:

- two materials in one room with correct edges/corners;
- grass/fiber direction consistent across tiles;
- pattern continuity across a tile and a gate/prop;
- UI panel using the same pattern source;
- variant determinism across reloads;
- placeholder vs atlas rendering;
- reduced motion with animated patterns;
- old room with no material data unchanged.

## 9. Relationship to other documents

- [`docs/puzzle-engine/adr/0014-material-pattern-vocabulary.md`](../puzzle-engine/adr/0014-material-pattern-vocabulary.md)
- [`docs/puzzle-engine/adr/0015-tile-material-grid-autotiling.md`](../puzzle-engine/adr/0015-tile-material-grid-autotiling.md)
- [`docs/puzzle-engine/adr/0016-pattern-projection-surfaces.md`](../puzzle-engine/adr/0016-pattern-projection-surfaces.md)
- [`docs/puzzle-engine/adr/0017-tile-variant-atlas-manifest.md`](../puzzle-engine/adr/0017-tile-variant-atlas-manifest.md)
- [`docs/puzzle-engine/material-pattern-implementation-plan.md`](../puzzle-engine/material-pattern-implementation-plan.md)
- [`docs/m3/asset-requirements.md`](../m3/asset-requirements.md) — must be
  re-baselined against this layer.
- [`docs/m4/README.md`](../m4/README.md) — proposed online co-op; both clients
  load the same material/atlas content and no textures cross the wire.
