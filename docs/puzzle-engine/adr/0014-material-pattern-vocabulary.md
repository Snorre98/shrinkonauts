# ADR-0014: Material and pattern vocabulary

Status: Proposed
Date: 2026-10-28
Deciders: Snorre
Related: ADR-0001, ADR-0029, ADR-0030, ADR-0031, ADR-0033, ADR-0008

## Context

The current visual model is asset-centric and flat:

- a room has one `tileset` asset and a `layers.tiles` grid of `#` and space;
- each entity has one `sprite` asset;
- UI uses palette/font tokens and a small set of `ui.*` asset IDs;
- the asset manifest knows files, frame sizes, anchors, and licences, but
  nothing about materials, patterns, variants, or visual families.

That is enough for placeholders, but not for a coherent visual language. The game
needs to say “this is bone,” “this is nerve,” “this is synthetic,” and have tiles,
objects, backgrounds, and UI share palette, edge treatment, pattern, and
direction. It also needs to support Terraria-like tile variants and a common
organic/non-organic pattern language without hardcoding a new renderer per room.

A single string property such as `material: "bone"` is not sufficient. The
renderer also needs:

- a palette and edge style;
- a pattern source and direction;
- a tile autotile/variant policy;
- a UV space for continuous patterns;
- an atlas/variant resource;
- validation that the IDs resolve.

## Decision

### 1. Add a `materials` module

Add a compact, pure `src/materials` module.

It owns:

- material and pattern IDs and definitions;
- visual family semantics;
- bindings between content and materials/patterns;
- resolution rules (family defaults, palette lookup, direction);
- validation data used by `pack`.

It does not render, import Phaser or the DOM, or decide collision.

Dependency direction:

```text
core
  ↑
assets
  ↑
materials
  ↑
pack
  ↑
world / ui
```

`materials` may import `core` and asset *types*, never Phaser, DOM, world, game,
or UI.

### 2. Material definitions

A material is a named visual role, not a gameplay tag:

```ts
type MaterialId = string;
type PatternId = string;

type MaterialFamily =
  | "organic"
  | "mineral"
  | "synthetic"
  | "energy";

interface MaterialDefinition {
  id: MaterialId;
  family: MaterialFamily;

  /** Theme palette token names, not raw hex. */
  palette: string[];

  edge: "soft" | "hard" | "none";

  /** Optional shared pattern; may be overridden by a binding. */
  patternId?: PatternId;

  /** Default grain direction in radians. 0 = +x, PI/2 = +y (down). */
  direction?: number;

  /** Visual autotile policy; see ADR-0015. */
  autotile?:
    | "none"
    | "edge"
    | "corner"
    | "blob47"
    | "wang"
    | "randomVariants";

  /** Inline variants, or a named variant set. */
  variants?: string[];
  variantSet?: string;

  /** Optional default tint token. */
  tint?: string;
}
```

Rules:

- `family` is a closed semantic set. It controls default generator, edge
  softness, and variation rules, but it is not a gameplay property.
- `palette` entries are theme palette token names (`bone`, `nerve`, `muscle`,
  etc.), not file paths or raw colours. The theme remains the palette authority.
- `direction` is visual only. `0` points right; `PI / 2` points down.
- `variants`/`variantSet` are visual resources; they do not affect collision.
- A material without a pattern is valid; it is a flat material.
- A material without variants is valid; it uses one texture or a generated
  texture.

### 3. Pattern definitions

A pattern is a shared visual field that can be sampled by tiles, objects,
backgrounds, and UI:

```ts
type PatternSpace = "world" | "screen" | "local";

type PatternSource =
  | {
      kind: "procedural";
      generator: "fbm" | "fibers" | "cellular" | "circuit" | "grain";
      seed: number;
    }
  | { kind: "image"; assetId: string }
  | { kind: "atlas"; assetId: string; frame: string };

interface PatternDefinition {
  id: PatternId;
  family: MaterialFamily;
  source: PatternSource;

  /** Default space; a binding may override it. */
  space: PatternSpace;

  scale: number;
  direction?: number;
  contrast?: number;
  blend?: "normal" | "multiply" | "overlay";

  /** Optional visual animation; never gameplay timing. */
  animation?: {
    kind: "scroll" | "pulse" | "flicker";
    speed: number;
  };
}
```

Rules:

- `world` space samples world coordinates, so the pattern continues across tile
  and object boundaries.
- `screen` space samples screen coordinates; used by UI.
- `local` space samples the object's local texture; used by baked sprites or
  UI icons where continuity is not wanted.
- `procedural` generators are a closed vocabulary. A new generator is an engine
  change.
- `image`/`atlas` patterns must resolve through the asset module.
- `animation` is optional and must have a reduced-motion fallback.

### 4. Material bindings

A binding attaches material/pattern data to a content thing:

```ts
interface MaterialBinding {
  materialId: MaterialId;

  /** Optional override of the material's default pattern. */
  patternId?: PatternId;

  /** Optional pattern placement override. */
  pattern?: {
    space?: PatternSpace;
    scale?: number;
    rotation?: number;
    offset?: { x: number; y: number };
    seed?: number;
    opacity?: number;
    blend?: "normal" | "multiply" | "overlay";
  };

  /** Optional tint token override. */
  tint?: string;
}
```

Bindings are valid on:

- room tile material rules (ADR-0015);
- room entities via `components.material`;
- background layers;
- UI theme material slots;
- feedback/effect surfaces where a pattern overlay is cosmetic.

Bindings are visual. They never define collision, interaction, evidence, or
puzzle state.

### 5. Content locations

Material and pattern definitions live in a pack-level `materials.json`:

```text
public/packs/anatomy-reflex/
  materials.json
  theme.json
  levels/...
```

`materials.json`:

```json
{
  "schemaVersion": "1.0",
  "id": "anatomy-reflex.materials",
  "materials": {
    "bone": {
      "family": "mineral",
      "palette": ["bone", "boneShadow"],
      "edge": "hard",
      "patternId": "bone-cortex",
      "autotile": "blob47"
    },
    "nerve": {
      "family": "organic",
      "palette": ["nerve", "joint"],
      "edge": "soft",
      "patternId": "nerve-fibers",
      "direction": 0.35,
      "autotile": "edge"
    },
    "membrane": {
      "family": "organic",
      "palette": ["muted", "bone"],
      "edge": "soft",
      "patternId": "membrane-cells",
      "autotile": "corner"
    }
  },
  "patterns": {
    "bone-cortex": {
      "family": "mineral",
      "source": {
        "kind": "procedural",
        "generator": "cellular",
        "seed": 12
      },
      "space": "world",
      "scale": 0.75,
      "contrast": 0.35
    },
    "nerve-fibers": {
      "family": "organic",
      "source": {
        "kind": "procedural",
        "generator": "fibers",
        "seed": 7
      },
      "space": "world",
      "scale": 0.5,
      "direction": 0.35
    },
    "membrane-cells": {
      "family": "organic",
      "source": {
        "kind": "procedural",
        "generator": "cellular",
        "seed": 21
      },
      "space": "world",
      "scale": 0.6,
      "contrast": 0.2
    }
  }
}
```

`theme.json` may map UI slots to materials:

```json
{
  "ui": {
    "materials": {
      "panel": "bone",
      "dialogue": "nerve",
      "debrief": "membrane"
    }
  }
}
```

Room entities may carry a binding:

```json
{
  "id": "muscle-gate",
  "type": "puzzleGate",
  "sprite": "sprite.gate.muscle",
  "components": {
    "material": {
      "materialId": "muscle",
      "patternId": "muscle-fibers",
      "pattern": { "space": "world", "scale": 0.75 }
    }
  }
}
```

### 6. Resolution rules

- A binding's explicit `pattern`/`patternId` overrides the material default.
- A material's `patternId` overrides the pattern's space/scale only when the
  binding does not specify them.
- A pattern's own defaults apply last.
- Palette entries resolve against `theme.palette`; unknown tokens are validation
  errors.
- Asset/frame references resolve through `assets`; unknown IDs are validation
  errors.
- A missing pattern falls back to the material's flat palette/edge.
- A missing material is a validation error, not a silent placeholder.

### 7. Compatibility

- Existing rooms without `materials.json` use their `tileset` as the default
  material.
- Existing entities without `components.material` use their `sprite` unchanged.
- Existing UI without `ui.materials` uses the current palette/CSS styling.
- New fields are optional; old content keeps validating and rendering.
- Materials are visual-only; no save field is added.

## Consequences

**Easier:**

- Tiles, objects, backgrounds, and UI can share one visual language.
- Organic vs mineral vs synthetic vs energy becomes a first-class content
  concept.
- Directional grain and shared patterns have a home.
- Terrains can be authored by material, not by duplicating tilesets.
- Final art can replace procedural placeholders without changing room logic.
- Palette and edge consistency are enforceable.

**Harder:**

- A new `materials` module and pack document are required.
- Content authors must understand the material/pattern/binding split.
- The renderer must consume materials; adding a property alone is not enough.
- Validation grows: palette tokens, pattern refs, variants, and UI bindings.
- The M3 asset inventory must be re-baselined against materials and variants.

**Constrained:**

- No material affects collision or gameplay.
- No raw media paths in material/pattern definitions.
- No arbitrary shader code from content.
- No per-room material code paths.
- No silent fallback for missing material IDs.
- No pattern animation without a reduced-motion fallback.

## Alternatives considered

- **A single `material` string on tiles/entities.** Easy, but cannot express
  palette, edge, pattern, direction, variants, or UI parity. Rejected.
- **Put material metadata on every asset manifest entry.** Couples visual roles
  to files and makes variant/atlas management worse. Rejected.
- **Hardcode materials per room.** Duplicates the visual language and defeats
  reuse. Rejected.
- **Use only shaders.** Cannot provide CSS/UI parity and makes content
  non-portable. Rejected.
- **Bake everything into final art.** No procedural placeholders, no autotile,
  no variant rules, and no shared UI/world pattern. Rejected.

## References

- [`0001-compact-modules-public-apis.md`](0001-compact-modules-public-apis.md)
- [`0029-asset-provider-abstraction.md`](../../shrinkonauts/base-game/adr/0029-asset-provider-abstraction.md)
- [`0030-sprite-animation-format-policy.md`](../../shrinkonauts/base-game/adr/0030-sprite-animation-format-policy.md)
- [`0031-layered-background-composition.md`](../../shrinkonauts/base-game/adr/0031-layered-background-composition.md)
- [`0033-final-asset-integration-timing.md`](../../shrinkonauts/base-game/adr/0033-final-asset-integration-timing.md)
- [`0008-schema-evolution.md`](0008-schema-evolution.md)
