# M3 — Muscle Endplate and Shared Tile Atlas Asset Prompts v0.1

- **Status:** Draft prompt pack · 3 November 2026
- **Owner:** Snorre
- **Scope:** Additive art pass for `04-muscle-effector` plus the shared 03/04 material atlases
- **Target milestone:** M3 additive pass; does not rewrite the original M3 scope
- **Generator:** Nano Banana / Google Gemini, manual web UI
- **Depends on:** ADR-0014–0017 (materials, patterns, atlases), ADR-0047–0049 and ADR-0070–0075 (pixel direction, presentation, hero scale), ADR-0060–0065 (source/working/runtime pipeline)
- **Related:** [`asset-requirements-v01.md`](asset-requirements-v01.md) · [`background-asset-requirements-v01.md`](background-asset-requirements-v01.md) · [`../m3.5/hub-asset-prompts-v01.md`](../m3.5/hub-asset-prompts-v01.md) · [`../assets/prompt-library-v01.md`](../assets/prompt-library-v01.md) · [`../adr-assets/0078-audio-and-graphics-prompt-libraries.md`](../adr-assets/0078-audio-and-graphics-prompt-libraries.md) · [`../prompts/asset-generation-template.md`](../prompts/asset-generation-template.md) · [`../../public/packs/anatomy-reflex/materials.json`](../../public/packs/anatomy-reflex/materials.json) · [`../../src/materials/autotile.ts`](../../src/materials/autotile.ts) · [`../../src/world/background.ts`](../../src/world/background.ts)

> **The rule:** AI generates raster art only. Manifest wiring, atlas frame assembly, material variant sets, tints and tests stay in code. A generated prompt plate is not a runtime asset until it is processed and wired.

> **Additive-pass rule:** the original M3 document deliberately kept `04-muscle-effector` backgrounds, muscle/membrane tiles and `sprite.gate.nerve` as placeholders. This document is the deliberate expansion of that scope. Do not silently rewrite the M3 status tables; add a pointer to this document instead.

---

## 0. Summary

| Decision | Value |
|---|---|
| 04 background | One pretty sky plate, **1280×720 at 1×**, opaque lossless WebP |
| 04 far/mid/near | Remain declared placeholders; not wired to runtime files |
| Material atlases | Four: `tile.bone.atlas`, `tile.nerve.atlas`, `tile.muscle.atlas`, `tile.membrane.atlas` |
| 03 tiles | Bone and nerve atlases included; do not leave the bone/nerve tiles flat |
| 04 tiles | Muscle and membrane atlases included |
| 04 sprites | `sprite.gate.nerve` and `sprite.exit` prompts plus a wiring plan |
| Atlas assembly | `npm run art:atlas` deterministic assembler; no manual frame-by-frame atlas editing |
| Old atlas | `tile.anatomy.atlas` is removed from the runtime manifest; the SVG stays as a test fixture |
| Interim state | Neutral procedural atlases, a 04 sky stand-in, and 04 gate/exit placeholders are checked in so the pack validates and renders while final art is generated |
| Generation order | 04 sky + muscle atlas first; then membrane, 03 atlases, sprites |
| Out of scope | 04 far/mid/near, 03 scan icons, audio, UI, levels 01/02/05, Silicon |

---

## 1. Why this pass exists

The runtime currently has two distinct placeholder failures:

1. **04 background.** `room.json` declares `bg.muscle_endplate.sky`, `.far`, `.mid`, `.near`. All four entries are `"placeholder": true` with no `src`, so `LayeredBackground` skips them and the room falls back to the procedural gradient.
2. **Tile textures.** `muscle` and `membrane` have no `variantSet`; `bone` has no variant set; `nerve` points at the placeholder `tile.anatomy.atlas`. `MaterialTextureCache` therefore draws flat fills with procedural edge strokes instead of authored tiles. The same gap affects 03 (bone/nerve) and 04 (muscle/membrane).

The fix is a content-and-tooling pass, not an engine rewrite. The engine already supports atlas-backed variant sets, 32×32 frames, `edge` and `blob47` rules, and cover-fit backgrounds.

---

## 2. Runtime constraints

These values are current implementation facts. Do not “fix” them during export.

| Constraint | Value | Consequence |
|---|---|---|
| 03 room | 40×23 tiles at 32 px = **1280×736** | 03 sky is 1280×736 at 1× |
| 04 room | 40×22 tiles at 32 px = **1280×704** | 04 sky must still cover the 1280×720 camera view |
| Viewport | **1280×720** | 04 sky is authored **1280×720 at 1×** |
| Tile frame | **32×32**, 1:1 | Never switch to 16×16 frames |
| Cluster grid | every colour block at least **2×2 px** | Pixel-clean at source, not at runtime |
| Alpha | hard 0/255 for pixel assets | No semi-transparent tile or parallax pixels |
| `edge` rule | 16 canonical masks `0`–`15` | 4×4 atlas, 128×128 |
| `blob47` rule | 47 canonical masks | 8×6 atlas, 256×192; one empty cell |
| 04 membrane legend | currently `corner` | Change to `edge` so the 16-frame membrane atlas is used |
| Tint | `room-scene.ts` tints final atlas frames when `material.tint` or `rule.tint` exists | Interim neutral atlases keep tint; final coloured atlases remove it |
| 04 sky fit | `cover`, parallax 0.05 / 0.02, depth −40 | 1280×720 plate covers the view |
| 04 far/mid/near | `tile`, 1024×512 target, future | Stay placeholders in this pass |

### 2.1 Tint decision

This pass supports two stages:

- **Interim neutral placeholders:** atlases are neutral greyscale; the four materials keep their `tint` tokens. `room-scene.ts` multiplies the neutral texture by the material tint.
- **Final Nano Banana atlases:** author the atlases in final material colours, remove the `tint` fields from `materials.json`, and remove the `placeholder` flags from the atlas entries. Do not double-tint.

Do not mix the two stages in one atlas.

### 2.2 Old atlas replacement

`tile.anatomy.atlas` is removed from `assets.final.json` and from the runtime variant sets. The SVG file `shared/tiles/anatomy-atlas.svg` remains in the repository only as a deterministic test fixture for atlas resolution tests. Tests that need a known-good atlas should use `tile.nerve.atlas` or the fixture.

---

## 3. Prompt pack version and assembly

Prompt pack: `muscle-endplate-2026-11-03.1`

```text
CONCEPT PROMPT = SUBJECT + STYLE_<CATEGORY> + PALETTE + FRAME_<CATEGORY>
NEGATIVE       = NEGATIVE_<CATEGORY> + NEGATIVE_<ASSET>
```

If the tool has a separate negative field, put the negative there. Otherwise append it after `NEGATIVE:`.

### 3.1 Shared style blocks

#### `STYLE_ATLAS`

```text
Pixel-art seamless material texture for a side-view platformer set inside a living human body. Native pixel grid, hard square pixels, every colour block at least 2×2 pixels, no anti-aliasing, no smoothing. Flat fills from three-step ramps; 50% dither. Uniform flat lighting; orthographic surface, seamless material swatch. Gross-cute biology, wry deadpan tone, 12+ friendly. The material reads as one coherent surface; no characters or scene.
```

#### `STYLE_BACKGROUND`

```text
Pixel art for a side-view 2D platformer set inside a living human body. Native pixel grid, hard square pixels, crisp edges, no anti-aliasing, no smoothing. Orthographic side view, landscape scale; atmospheric depth from layered values and dither, not a global gradient; local warm highlights only. Damp membrane sheen, condensation, dust and grime. Gross-cute biology, wry deadpan tone, 12+ friendly: never gory. The body is a landscape, not a textbook cutaway; use striated muscle, tendon plates and membrane folds as architecture.
```

#### `STYLE_SPRITE`

```text
Pixel art for a side-view 2D platformer set inside a living human body. Native pixel grid, hard square pixels, crisp edges, no anti-aliasing, no smoothing, no mixed pixel sizes. Bold dark teal-brown outlines, one pixel at final sprite scale; flat fills from three-step ramps; 50% dither for damp membrane sheen, condensation, dust and grime. Gross-cute biology, wry deadpan tone, weird and fleshy but 12+ friendly: never gory, no shock humour. Strong readable shapes; characters and props must read as small sprites. Side view or slight 3/4 view.
```

#### `PALETTE`

```text
Palette ramps: teal #05090b #101a20 #1d2f38; bone #c9b79a #f2e8d5 #fff8e8; bone shadow #5f736e #7a8f8a #9db4ad; nerve #b8862b #ffd166 #fff3b0; joint #3f9fb5 #7bdff2 #c9f7ff; muscle #a82a4a #ef476f #ff9fb2; sage #6f847d #9db4ad #c4d4ce; ink #000000 #05090b #2a3f47. Use only these ramp steps; no intermediate blends, no unapproved orange.
```

### 3.2 Shared frame blocks

#### `FRAME_ATLAS`

```text
1024×1024 seamless material swatch concept, uniform flat lighting, no grid, no labels, no frame, no directional highlight, no baked edge. Hard pixel edges; every colour block at least 2×2 pixels. Pixel-clean to a 512×512 working swatch; assemble 32×32 frames offline with npm run art:atlas.
```

#### `FRAME_SKY_PRETTY`

```text
16:9 wide composition, 1280×720 source, displayed at 1×. Opaque, edge-to-edge background plate. Keep the upper corners and lower third dark and low-contrast for HUD and player silhouettes; keep important detail inside the central 70%. No frame, no border, no text, no UI, no characters. Hard pixel edges; no anti-aliasing.
```

#### `FRAME_ENTITY`

```text
Full object, centred, with a clear empty margin on all sides, isolated on a flat solid magenta #FF00FF background; no ground, no pedestal, no cast shadow, no scene, no frame. Draw the object large and clear; do not draw a pixel grid, a tiny sprite, or a sprite sheet. Hard pixel edges; no anti-aliasing.
```

### 3.3 Shared negative blocks

#### `NEGATIVE_ATLAS`

```text
text, letters, numbers, logo, watermark, border, UI, labels, arrows, diagram lines, anti-aliasing, smooth gradient, painterly, 3D render, photorealism, anime, clean vector, high-res detail, mixed pixel sizes, faux pixel art, blurry edges, glossy plastic, neon cyberpunk, purple, neon green, orange, pure red, blood, gore, open wound, viscera, exposed organs, grid, tile grid, checkerboard, directional highlight, baked edge shading, bevel, drop shadow, vignette, scene, character, object.
```

#### `NEGATIVE_BACKGROUND`

```text
text, letters, numbers, logo, watermark, border, UI, labels, arrows, diagram lines, anti-aliasing, smooth gradient, painterly, 3D render, photorealism, anime, clean vector, high-res detail, mixed pixel sizes, faux pixel art, blurry edges, glossy plastic, neon cyberpunk, purple, neon green, orange, pure red, blood, gore, open wound, viscera, exposed organs, character, astronaut, creature, figure, face, frame, high-contrast centre, single focal landmark, hard horizon line, flat cartoon outline.
```

#### `NEGATIVE_SPRITE`

```text
text, letters, numbers, logo, watermark, border, UI, labels, arrows, diagram lines, anti-aliasing, smooth gradient, painterly, 3D render, photorealism, anime, clean vector, high-res detail, mixed pixel sizes, faux pixel art, blurry edges, glossy plastic, neon cyberpunk, purple, neon green, orange, pure red, blood, gore, open wound, viscera, exposed organs, extra objects, multiple objects, scene background, ground, floor, pedestal, cast shadow, drop shadow, checkerboard, frame.
```

---

## 4. Asset register

Paths are relative to `public/packs/anatomy-reflex/`.

| Asset ID | Type | Source | Display | Runtime file | Priority |
|---|---|---:|---:|---|---|
| `bg.muscle_endplate.sky` | background | 1280×720 | 1280×720 at 1× | `shared/backgrounds/muscle-endplate-sky.webp` | P0 |
| `tile.muscle.atlas` | atlas | 128×128, 4×4 | 32×32 frames | `shared/tiles/muscle-atlas.png` | P0 |
| `tile.membrane.atlas` | atlas | 128×128, 4×4 | 32×32 frames | `shared/tiles/membrane-atlas.png` | P0 |
| `tile.bone.atlas` | atlas | 256×192, 8×6 | 32×32 frames | `shared/tiles/bone-atlas.png` | P0 |
| `tile.nerve.atlas` | atlas | 128×128, 4×4 | 32×32 frames | `shared/tiles/nerve-atlas.png` | P0 |
| `sprite.gate.nerve` | sprite | 64×64 | 64×64 at 1× | `shared/sprites/gate-nerve.png` | P1 |
| `sprite.exit` | sprite | 64×64 | 64×64 at 1× | `shared/sprites/exit.png` | P1 |

### 4.1 Interim placeholders

The checked-in runtime files for the four atlases, the 04 sky, `sprite.gate.nerve` and `sprite.exit` are **procedural interim placeholders**, not final Nano Banana outputs:

- Atlas placeholders are neutral greyscale and rely on the existing material `tint` tokens.
- The 04 sky is a 1280×720 opaque WebP built from the approved palette; it replaces the gradient, not the final pretty sky.
- The gate and exit are simple 64×64 pixel placeholders with alpha.
- The manifest marks these files as `"placeholder": true` until the final art replaces them.
- Replace them with the outputs from the prompts below, then remove the `placeholder` flags (and the tints for coloured atlases).

---

## 5. 04 pretty sky prompt

**Asset:** `bg.muscle_endplate.sky`
**Style:** `STYLE_BACKGROUND`
**Frame:** `FRAME_SKY_PRETTY`
**Source/export:** 1280×720 PNG/WebP, opaque, 1× cover, lossless WebP.
**File:** `shared/backgrounds/muscle-endplate-sky.webp`

```text
SUBJECT: A wide, opaque pixel-art background plate of the neuromuscular junction as a living landscape, seen from inside the muscle. A deep muscle-pink and warm-rust cavern; thick, taut, striated muscle-fibre pillars rise like tree trunks at the left and right edges; wet membrane folds drape from the top corners like heavy fabric; bone-cream tendon plates form a broken shelf in the middle distance; a distant motor-nerve terminal bulb hangs above the centre, with a small nerve-yellow ACh glow and a few hard-edged joint-cyan synaptic sparks. Floating dust and condensation, damp sheen, scuffed mineral grit. The centre and lower third stay readable and low-contrast behind the player; the upper corners stay dark and quiet for the HUD. No characters, no faces, no labels, no arrows, no text, no gore. Orthographic side view; atmospheric depth from layered values and dither, not a global gradient; no single directional light, no hard horizon line at player height. Use muscle pink, warm rust, bone, bone shadow, nerve yellow, joint cyan, sage and ink; no purple, magenta, orange or pure red.
```

**Negative:** `NEGATIVE_BACKGROUND` + `blood, wound, cut muscle, steak, meat, butcher diagram, exposed organ, anatomical cutaway, textbook labels, bright centre, hard horizon, single focal landmark, purple, magenta, orange.`

**Processing**

1. Keep the full-resolution source under `art-source/nanobanan/new/`.
   The checked-in interim source is
   `art-source/nanobanan/working/muscle-endplate-sky-placeholder-1280x720.png`.
2. Crop/resize to 1280×720 without squashing.
3. Keep the upper corners and lower third low-contrast; check the player silhouette and HUD at 1280×720.
4. Do not add a runtime pattern overlay.
5. Encode the interim/final plate with:

```bash
ffmpeg -y -v error -i art-source/nanobanan/working/muscle-endplate-sky-placeholder-1280x720.png \
  -c:v libwebp -lossless 1 -pix_fmt yuv420p \
  public/packs/anatomy-reflex/shared/backgrounds/muscle-endplate-sky.webp
```

**Acceptance**

- 1280×720, opaque, lossless WebP, 1× cover.
- Reads as a muscle/endplate landscape, not a textbook cutaway.
- Player and HUD remain readable; no busy detail in the lower third or upper corners.
- No characters, text, labels, arrows, gore or exposed organs.
- No purple, magenta, orange or pure red; muscle pink and warm rust are the dominant hues.
- Replaces `bg.muscle_endplate.sky` and removes its `placeholder` flag.
- `bg.muscle_endplate.far`, `.mid` and `.near` stay declared placeholders; do not wire them.

---

## 6. Material atlas prompts

### 6.1 Assembly workflow

Generate one seamless 1024×1024 material swatch concept per material, pixel-clean it to a **512×512 working swatch** with a 2×2 minimum cluster grid, approve the result at 32×32, then assemble the frames with `npm run art:atlas`.

The assembler uses deterministic 32×32 windows from the approved 512×512 swatch and adds edge occlusion only on the sides where the mask bit is absent. It writes the atlas PNG, a JSON region map and a report. Do not ask the generator for a named atlas; it cannot produce one reliably.

### 6.2 `tile.muscle.atlas` — 16-frame `edge`

**Style:** `STYLE_ATLAS` · **Frame:** `FRAME_ATLAS`
**Source/export:** 128×128 PNG, 4×4 grid, 32×32 frames, 2×2 clusters, opaque cells.
**File:** `shared/tiles/muscle-atlas.png`
**Rule:** `edge`, variant set `muscle-edge`
**Working swatch:** `art-source/nanobanan/working/tile-muscle-swatch-neutral-512.png` (interim) or the approved Nano Banana swatch.

```text
SUBJECT: A seamless pixel-art muscle-material texture swatch for a side-view platformer: wet, taut, striated muscle fibres, like bundles of long ropes. Muscle pink, warm rust and bone highlights; fine fibrous grain, subtle pores, damp sheen, broad soft mottling, a few darker striation bands. No large cracks, no embedded objects, no symbols, no labels, no grid, no border, no face, no gore. Uniform flat lighting, no directional highlight, no baked edge shading, no vignette, no bevel, no drop shadow. Orthographic surface; every colour block at least 2×2 pixels; tile seamlessly on all four edges at 32×32. Pixel-clean to a 512×512 working swatch.
```

**Negative:** `NEGATIVE_ATLAS` + `blood, wound, cut meat, steak, butcher diagram, exposed organ, face, eye, teeth, bone chunk, high contrast, directional light.`

**Acceptance**

- Exactly 16 named regions `mask-0` … `mask-15`, 128×128.
- Every frame tiles 2×2 on all four sides; a 3×3 patch shows no seam.
- Striations read as muscle, not steak or fabric; no gore.
- No text, labels, grid lines or baked directional edge.
- Replaces the flat muscle tile; keeps `tint: "muscle"` only while the atlas is neutral.

### 6.3 `tile.membrane.atlas` — 16-frame `edge`

**Style:** `STYLE_ATLAS` · **Frame:** `FRAME_ATLAS`
**Source/export:** 128×128 PNG, 4×4 grid, 32×32 frames, 2×2 clusters, opaque cells.
**File:** `shared/tiles/membrane-atlas.png`
**Rule:** `edge`, variant set `membrane-edge`
**Change:** the 04 room legend changes from `corner` to `edge`.
**Working swatch:** `art-source/nanobanan/working/tile-membrane-swatch-neutral-512.png` (interim).

```text
SUBJECT: A seamless pixel-art membrane-material texture swatch for a side-view platformer: a wet, translucent sheet of living membrane, like damp fabric stretched over cells. Sage, muted bone and cool teal; soft cellular pores, condensation, a faint sheen, broad mottling, a few darker fold lines. No large tears, no holes through the sheet, no embedded objects, no symbols, no labels, no grid, no border, no face, no gore. Uniform flat lighting, no directional highlight, no baked edge shading, no vignette, no bevel, no drop shadow. Orthographic surface; every colour block at least 2×2 pixels; tile seamlessly on all four edges at 32×32. Pixel-clean to a 512×512 working swatch.
```

**Negative:** `NEGATIVE_ATLAS` + `tear, hole, blood, wound, exposed organ, face, eye, teeth, high contrast, directional light, plastic wrap, bubble wrap.`

**Acceptance**

- Exactly 16 named regions `mask-0` … `mask-15`, 128×128.
- Every frame tiles 2×2 on all four sides; a 3×3 patch shows no seam.
- Reads as wet membrane, not plastic wrap or bubble wrap; no gore.
- No text, labels, grid lines or baked directional edge.
- The 04 legend uses `edge`; the old `corner` rule is not kept.

### 6.4 `tile.bone.atlas` — 47-frame `blob47`

**Style:** `STYLE_ATLAS` · **Frame:** `FRAME_ATLAS`
**Source/export:** 256×192 PNG, 8×6 grid, 32×32 frames, 2×2 clusters, opaque cells.
**File:** `shared/tiles/bone-atlas.png`
**Rule:** `blob47`, variant set `bone-blob47`
**Working swatch:** `art-source/nanobanan/working/tile-bone-swatch-neutral-512.png` (interim).

```text
SUBJECT: A seamless pixel-art bone-material texture swatch for a side-view platformer: the hard outer surface of bone, like wet chalky stone. Bone cream and bone shadow, deep teal in the pores, fine mineral grit, subtle pores and grime, broad soft mottling. No large cracks, no embedded objects, no symbols, no labels, no grid, no border. Uniform flat lighting, no directional highlight, no baked edge shading, no vignette, no bevel, no drop shadow. Orthographic surface; every colour block at least 2×2 pixels; tile seamlessly on all four edges at 32×32. Pixel-clean to a 512×512 working swatch.
```

**Negative:** `NEGATIVE_ATLAS` + `skull, skeleton, teeth, skull face, blood, wound, exposed organ, high contrast, directional light, generic stone, brick, rock wall.`

**Atlas assembly**

- Grid: 8 columns × 6 rows, row-major, `x = column × 32`, `y = row × 32`.
- 47 used regions in this order:
  `0, 1, 4, 5, 7, 16, 17, 20, 21, 23, 28, 29, 31, 64, 65, 68, 69, 71, 80, 81, 84, 85, 87, 92, 93, 95, 112, 113, 116, 117, 119, 124, 125, 127, 193, 197, 199, 209, 213, 215, 221, 223, 241, 245, 247, 253, 255`.
- Region names: `mask-<key>`. The last cell (row index 5, column index 7) has no region; fill it with an opaque neutral base colour so the atlas has no transparent holes.
- For each frame, draw edge occlusion only on the sides where the mask bit is absent. Do not bake a single top edge into every frame.
- Keep every 32×32 cell fully opaque and on the 2×2 cluster grid. Do not trim, add gutters or leave transparent seams.

**Acceptance**

- Exactly 47 named regions, coordinates matching the grid; the empty cell has no region.
- Every frame tiles 2×2 on all four sides; a 3×3 patch of any frame shows no seam.
- Mask variants are visually distinct; the edge direction matches the mask.
- No text, labels, grid lines or baked directional edge.
- The swatch reads as wet chalky bone, not generic stone or a diagram.
- 256×192, opaque, 2×2 clusters, ≤80 KB.

### 6.5 `tile.nerve.atlas` — 16-frame `edge`

**Style:** `STYLE_ATLAS` · **Frame:** `FRAME_ATLAS`
**Source/export:** 128×128 PNG, 4×4 grid, 32×32 frames, 2×2 clusters, opaque cells.
**File:** `shared/tiles/nerve-atlas.png`
**Rule:** `edge`, variant set `nerve-edge`
**Working swatch:** `art-source/nanobanan/working/tile-nerve-swatch-neutral-512.png` (interim).

```text
SUBJECT: A seamless pixel-art nerve-material texture swatch for a side-view platformer: bundles of pale wet nerve fibres, like bundled cables or wires. Nerve yellow and sage, joint-cyan edge sheen, fine fibrous grain, subtle pores and grime, broad soft mottling. No large cracks, no embedded objects, no symbols, no labels, no grid, no border. Uniform flat lighting, no directional highlight, no baked edge shading, no vignette, no bevel, no drop shadow. Orthographic surface; every colour block at least 2×2 pixels; tile seamlessly on all four edges at 32×32. Pixel-clean to a 512×512 working swatch.
```

**Negative:** `NEGATIVE_ATLAS` + `spaghetti, rope, cable bundle, wire harness, blood, wound, exposed organ, high contrast, directional light, circuit board.`

**Acceptance**

- Exactly 16 named regions `mask-0` … `mask-15`, 128×128.
- Every frame tiles 2×2 on all four sides; a 3×3 patch shows no seam.
- The soft edge matches the `edge` autotile rule; frames are visually distinct.
- No text, labels, grid lines or baked directional edge.
- The swatch reads as bundles of pale wet cables, not spaghetti or a diagram.
- 128×128, opaque, 2×2 clusters, ≤80 KB.

---

## 7. 04 sprite prompts

### 7.1 `sprite.gate.nerve` — Ca²⁺ channel gate

**Fact anchor:** puzzle abstraction, not a literal ion channel. **Reference:** P1 for style/palette only. **Style:** `STYLE_SPRITE`. **Frame:** `FRAME_ENTITY`.
**Source/export:** 64×64 PNG, alpha, 1:1. **File:** `shared/sprites/gate-nerve.png`.

```text
SUBJECT: A closed organic Ca²⁺ channel gate, flat side view. A thick bone-and-muscle rim around a closed aperture; a taut curtain of wet muscle-membrane tissue stretches across the opening; one nerve-yellow seam runs down the centre; small joint-cyan calcium-channel clasps sit at the hinges; a few bone plates frame the base. Closed state only. No receptor sockets, no keyhole, no mechanical parts, no face, no label. Strong silhouette; base at the bottom.
```

**Negative:** `NEGATIVE_SPRITE` + `receptor socket, keyhole, lock, mechanical hinge, gear, chain, character, face, label, gore.`

**Acceptance**

- Reads as a closed gate at 64×64; no receptor sockets or keyhole.
- Distinct from `sprite.exit` and `sprite.gate.ferry`.
- Works over muscle, membrane and bone backgrounds.
- No text, no baked glow, no gore.

### 7.2 `sprite.exit` — membrane airlock

**Fact anchor:** level fiction; no anatomical claim. **Reference:** P1 for style/palette only. **Style:** `STYLE_SPRITE`. **Frame:** `FRAME_ENTITY`.
**Source/export:** 64×64 PNG, alpha, 1:1. **File:** `shared/sprites/exit.png`.

```text
SUBJECT: A membrane airlock, flat side view. A ring of bone and teal tissue forms a round opening; warm nerve-yellow light glows beyond; wet folds and a few bone struts frame the opening. The opening fills most of the canvas. No character, no face, no label, no gore. Strong silhouette; base at the bottom.
```

**Negative:** `NEGATIVE_SPRITE` + `character, face, label, gore, gate, door handle, mechanical hinge.`

**Acceptance**

- Reads as a destination at 64×64; warm light is visible.
- Distinct from the gate; no character or text.
- Works in both 03 and 04; one shared asset.

---

## 8. Atlas assembler: `npm run art:atlas`

### 8.1 Purpose

`scripts/art-atlas.ts` turns an approved seamless 32×32 or 512×512 swatch into a deterministic atlas. It is a local art tool, not a runtime dependency.

### 8.2 CLI

```bash
npm run art:atlas -- \
  --in art-source/nanobanan/working/tile-muscle-swatch-neutral-512.png \
  --out public/packs/anatomy-reflex/shared/tiles/muscle-atlas.png \
  --rule edge \
  --edge-color "#05090b" \
  --asset-id tile.muscle.atlas \
  --report art-source/nanobanan/reports/tile-muscle-atlas.json \
  --preview art-source/previews/nanobanan/tiles/tile-muscle-atlas-4x.png \
  --preview-scale 4 \
  --background "#101a20"
```

For the bone atlas:

```bash
npm run art:atlas -- \
  --in art-source/nanobanan/working/tile-bone-swatch-neutral-512.png \
  --out public/packs/anatomy-reflex/shared/tiles/bone-atlas.png \
  --rule blob47 \
  --edge-color "#05090b" \
  --fill-color "#c9b79a" \
  --asset-id tile.bone.atlas \
  --report art-source/nanobanan/reports/tile-bone-atlas.json
```

### 8.3 Behaviour

- Accepts a PNG swatch at least 32×32. Larger swatches are sampled through deterministic 32×32 windows; a 512×512 swatch gives 16×16 possible windows.
- `edge` writes 16 frames in a 4×4 grid, keys `0`–`15`.
- `blob47` writes 47 frames in an 8×6 grid using the canonical mask list above.
- Adds edge/corner occlusion only where the mask bit is absent.
- Writes an opaque PNG; every cell is alpha 255.
- Writes a JSON report with the region map and the exact `frames` mapping for `materials.json`.
- Optionally writes a nearest-neighbour preview.
- Warns about 2×2 cluster violations, semi-transparent source pixels, and swatch edges that do not appear to tile; it does not silently repair the source art.

### 8.4 Report contract

```json
{
  "schemaVersion": 1,
  "rule": "edge",
  "frameWidth": 32,
  "columns": 4,
  "rows": 4,
  "regions": {
    "mask-0": { "x": 0, "y": 0, "width": 32, "height": 32 }
  },
  "frames": {
    "0": { "kind": "atlas", "assetId": "tile.muscle.atlas", "frame": "mask-0" }
  },
  "warnings": []
}
```

The report does not edit JSON automatically; copy the generated region/frame maps into the manifest and materials.

---

## 9. Runtime wiring plan

### 9.1 `assets.final.json`

Add the four atlas entries. Atlas entries carry `width`, `height`, `regions` and a licence; they do not carry animation metadata.

```json
"tile.muscle.atlas": {
  "type": "atlas",
  "src": "shared/tiles/muscle-atlas.png",
  "placeholder": true,
  "width": 128,
  "height": 128,
  "license": "Procedural interim (CC0-1.0)",
  "regions": {
    "mask-0": { "x": 0, "y": 0, "width": 32, "height": 32 }
  }
}
```

Repeat for `tile.membrane.atlas` (128×128), `tile.nerve.atlas` (128×128) and `tile.bone.atlas` (256×192, 47 regions plus one empty cell).

Add the 04 sky source:

```json
"bg.muscle_endplate.sky": {
  "type": "background",
  "src": "shared/backgrounds/muscle-endplate-sky.webp",
  "placeholder": true,
  "license": "Procedural interim (CC0-1.0)"
}
```

Keep `bg.muscle_endplate.far`, `.mid` and `.near` as declared placeholders with no `src`.

When final Nano Banana art lands:

- Remove `"placeholder": true` from the four atlas entries and the 04 sky.
- Replace the licence strings with the Nano Banana provenance.
- For coloured atlases, remove the material `tint` values.

### 9.2 `materials.json`

Add three variant sets and repoint the nerve set:

- `bone-blob47`: `rule: "blob47"`, atlas `tile.bone.atlas`, 47 frames, fallback `mask-0`.
- `nerve-edge`: atlas `tile.nerve.atlas`, 16 frames, fallback `mask-0`.
- `muscle-edge`: `rule: "edge"`, atlas `tile.muscle.atlas`, 16 frames, fallback `mask-0`.
- `membrane-edge`: `rule: "edge"`, atlas `tile.membrane.atlas`, 16 frames, fallback `mask-0`.

Set `variantSet` on each material: `bone-blob47`, `nerve-edge`, `muscle-edge`, `membrane-edge`.

For the interim neutral placeholders, keep the existing `tint` values (`bone`, `nerve`, `muscle`, `muted`). For final coloured atlases, remove them.

### 9.3 `room.json`

- `03-nerve-forest`: no tile-grid change. Bone now resolves through `bone-blob47`; nerve resolves through the repointed `nerve-edge`.
- `04-muscle-effector`: change the `e` legend from `"autotile": "corner"` to `"autotile": "edge"`. The background keeps all four layers declared; only the sky resolves.
- Do not change collision: `layers.tiles` remains the sole collision authority.

### 9.4 `licenses.json`

Add one entry per runtime file:

- `shared/tiles/bone-atlas.png`
- `shared/tiles/nerve-atlas.png`
- `shared/tiles/muscle-atlas.png`
- `shared/tiles/membrane-atlas.png`
- `shared/backgrounds/muscle-endplate-sky.webp`

Use `Procedural interim (CC0-1.0)` for the checked-in placeholders and replace with the Nano Banana licence when final art lands. Keep the old `shared/tiles/anatomy-atlas.svg` entry only if the SVG remains a tracked test fixture.

### 9.5 Tests

- Update `tests/materials.test.ts` to expect four variant sets and the new atlas IDs.
- Update `tests/tile-autotile.test.ts` to resolve `tile.nerve.atlas` or `tile.muscle.atlas` instead of `tile.anatomy.atlas`.
- Add `tests/art-atlas.test.ts` for the assembler: 16/47 regions, region bounds, opaque cells, mask direction.
- Extend `tests/background-assets.test.ts` with the 04 sky source and the three declared placeholders.
- `sprite.gate.nerve` and `sprite.exit` are wired as 64×64 procedural placeholders; `tests/entity-sprites.test.ts` validates their files. Replace them with the final Nano Banana sprites and remove the `placeholder` flags when ready.

### 9.6 Documentation updates

- Add a pointer to this document from `docs/m3/asset-requirements-v01.md` and `docs/m3/background-asset-requirements-v01.md`.
- Update `docs/gdd/GDD-MAP.md` and `docs/gdd/CAPTURES.md` after the 04 sky is no longer a gradient.
- Update `public/packs/anatomy-reflex/levels/04-muscle-effector/README.md` room facts and remaining-gap notes.
- Update the top-level `README.md` asset-status summary.
- Regenerate the GDD site with `npm run gdd:site` if the documentation HTML is tracked.

---

## 10. Verification

```text
npm test
npm run pack:validate
npm run pack:smoke
npm run build
npm run smoke:e2e
```

Expected results:

- 03 and 04 no longer warn about unresolved tile textures.
- 04 shows the 04 sky plate instead of the procedural gradient.
- `tile.bone.atlas`, `tile.nerve.atlas`, `tile.muscle.atlas` and `tile.membrane.atlas` resolve all variant frames used by the rooms.
- `tile.anatomy.atlas` is absent from the final runtime manifest.
- `sprite.gate.nerve` and `sprite.exit` render from interim 64×64 procedural placeholders; their final prompts are in §7.
- No duplicate tinting: interim neutral atlases are tinted once; final coloured atlases are not tinted.

---

## 11. Stop rules

- If a swatch does not tile, reject it before assembling; do not hide a seam with a frame border.
- If a generated atlas has a transparent cell, reject it; every cell is opaque.
- If an atlas frame reads as a different mask than its key, reject the atlas.
- If the 04 sky is too busy behind the player or HUD, simplify it; do not add a dark overlay at runtime.
- If the 04 sky fails after two attempts, keep the interim plate and record the failure; do not wire far/mid/near as a rescue.
- If the final coloured atlas requires engine changes, stop; this is an art/content task.

---

## 12. Prompt log template

| Date | Prompt pack | Asset | Generator | Source | Chosen file | Runtime export | Status | Notes |
|---|---|---|---|---|---|---|---|---|
| 2026-11-03 | muscle-endplate-2026-11-03.1 | | Nano Banana | | | | draft | |

Record the exact prompt version, source file, crop, palette, processing command and acceptance result for every generated asset.
