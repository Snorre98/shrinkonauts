# M3 — Muscle Endplate and Shared Tile Atlas Asset Prompts v0.2

- **Status:** Draft prompt pack · 3 November 2026 · 04 batch accepted
- **Owner:** Snorre
- **Scope:** Additive art pass for `04-muscle-effector` plus the shared 03/04 material atlases
- **Target milestone:** M3 additive pass; does not rewrite the original M3 scope
- **Generator:** Nano Banana / Google Gemini, manual web UI
- **Depends on:** ADR-0014–0017 (materials, patterns, atlases), ADR-0047–0049 and ADR-0070–0075 (pixel direction, presentation, hero scale), ADR-0060–0065 (source/working/runtime pipeline)
- **Related:** [`asset-requirements-v01.md`](asset-requirements-v01.md) · [`background-asset-requirements-v01.md`](background-asset-requirements-v01.md) · [`../m3.5/hub-asset-prompts-v01.md`](../m3.5/hub-asset-prompts-v01.md) · [`../assets/prompt-library-v01.md`](../assets/prompt-library-v01.md) · [`../adr-assets/0078-audio-and-graphics-prompt-libraries.md`](../adr-assets/0078-audio-and-graphics-prompt-libraries.md) · [`../prompts/asset-generation-template.md`](../prompts/asset-generation-template.md) · [`../../public/packs/anatomy-reflex/materials.json`](../../public/packs/anatomy-reflex/materials.json) · [`../../src/materials/autotile.ts`](../../src/materials/autotile.ts) · [`../../src/world/background.ts`](../../src/world/background.ts)

> **The rule:** AI generates raster art only. Manifest wiring, atlas frame assembly, material variant sets, tints and tests stay in code. A generated prompt plate is not a runtime asset until it is processed and wired.

> **Additive-pass rule:** the original M3 document deliberately kept `04-muscle-effector` backgrounds, muscle/membrane tiles and `sprite.gate.nerve` as placeholders. This document is the deliberate expansion of that scope. Do not silently rewrite the M3 status tables; add a pointer to this document instead.

> **Completion status (2026-11-03):** all seven Nano Banana source plates are
> **processed, wired, and accepted** from
> `art-source/nanobanan/new/muscle-endplate-2026-11-03/`. The 04 sky, four
> material atlases, `sprite.gate.nerve` and `sprite.exit` now load their final
> runtime files with `placeholder` removed; the four material tints are removed
> because the atlases are coloured. §4.2 is historical. The canonical
> cross-discipline status is the
> [completion matrix](../assets/prompt-library-v01.md#40-completion-matrix).
> Evidence is in the reports/previews under `art-source/nanobanan/` and the
> prompt log in §12.

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
| Final state | The processed 04 sky, four coloured atlases, gate and exit are wired; the interim procedural files and material tints are removed |
| Source state | **7 Nano Banana source JPEGs processed and accepted** in `art-source/nanobanan/new/muscle-endplate-2026-11-03/` |
| Generation order | Complete. Sky, four atlases, gate and exit were processed, wired and accepted on 2026-11-03 |
| Out of scope | 04 far/mid/near, 03 scan icons, audio, UI, levels 01/02/05, Silicon |

---

## 1. Why this pass exists

The pass started from two distinct placeholder failures, both now resolved:

1. **04 background.** `room.json` declares `bg.muscle_endplate.sky`, `.far`,
   `.mid`, `.near`. At the start all four entries were `"placeholder": true`
   with no `src`. The sky is now final; far/mid/near remain declared
   placeholders/future work.
2. **Tile textures.** `muscle` and `membrane` had no `variantSet`; `bone` had no
   variant set; `nerve` pointed at the placeholder `tile.anatomy.atlas`. The
   four final atlases now resolve `bone-blob47`, `nerve-edge`, `muscle-edge`
   and `membrane-edge` in 03 and 04.

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

This pass has landed the final stage:

- **Final Nano Banana atlases:** the atlases are authored in final material
  colours; the four `tint` fields are removed from `materials.json`; the
  `placeholder` flags are removed from the atlas entries. `room-scene.ts` does
  not tint them.
- **Historical interim state:** the neutral greyscale atlases and tints were a
  temporary stage. They are retained for comparison only and must not be
  reintroduced alongside the coloured atlases.

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

### 4.1 Processed and accepted batch (2026-11-03)

Source paths in this table are repository paths, not paths inside
`public/packs/`. All rows are `accepted`: the source is recorded, the runtime
file exists, the manifest has `src`, the licence exists, the relevant tests
pass, and `placeholder`/material tints are removed.

| Asset | Source file | Source size | Processing evidence | Runtime |
|---|---|---:|---|---|
| `bg.muscle_endplate.sky` | `art-source/nanobanan/new/muscle-endplate-2026-11-03/bg.muscle_endplate.sky.jpeg` | 2752×1536 | 2720×1530 crop at (16,3); Lanczos to 1280×720; lossless VP8L; 669,798 bytes; `reports/muscle-endplate-sky.process.json` | `shared/backgrounds/muscle-endplate-sky.webp` |
| `tile.muscle.atlas` | `.../tile.muscle.atlas.jpeg` | 2048×2048 | nearest 512 swatch; palette quantise; 2×2 snap/weld; 128×128 4×4 edge atlas; `reports/tile-muscle-*` | `shared/tiles/muscle-atlas.png` |
| `tile.membrane.atlas` | `.../tile.membrane.atlas.jpeg` | 2048×2048 | nearest 512 swatch; palette quantise; 2×2 snap/weld; 128×128 4×4 edge atlas; `reports/tile-membrane-*` | `shared/tiles/membrane-atlas.png` |
| `tile.bone.atlas` | `.../tile.bone.atlas.jpeg` | 2048×2048 | nearest 512 swatch; palette quantise; 2×2 snap/weld; 256×192 8×6 `blob47`; `reports/tile-bone-*` | `shared/tiles/bone-atlas.png` |
| `tile.nerve.atlas` | `.../tile.nerve.atlas.jpeg` | 2048×2048 | nearest 512 swatch; palette quantise; 2×2 snap/weld; 128×128 4×4 edge atlas; `reports/tile-nerve-*` | `shared/tiles/nerve-atlas.png` |
| `sprite.gate.nerve` | `.../sprite.gate.nerve.jpeg` | 2048×2048 | `#FF00FF` key; trim; 60×60 fit in 64×64; `reports/gate-nerve.*` | `shared/sprites/gate-nerve.png` |
| `sprite.exit` | `.../sprite.exit.jpeg` | 2048×2048 | `#FF00FF` key; trim; 59×60 fit in 64×64; `reports/exit.*` | `shared/sprites/exit.png` |

Both sprite sources have a flat `#FF00FF` background and used the normal
`npm run art:key` workflow. The atlases are source textures; they were
downscaled, quantised, snapped and welded before the assembler, never passed in
as raw 2048×2048 JPEGs.

### 4.2 Interim runtime placeholders (historical)

The prior neutral procedural atlases, 04 sky stand-in, gate and exit were
interim files. They are superseded by the accepted outputs in §4.1. The old
working `tile-*-swatch-neutral-512.png` files and their reports are retained for
comparison only; they are not referenced by the manifest.

---

## 5. 04 pretty sky prompt

**Asset:** `bg.muscle_endplate.sky`
**Style:** `STYLE_BACKGROUND`
**Frame:** `FRAME_SKY_PRETTY`
**Source/export:** 1280×720 PNG/WebP, opaque, 1× cover, lossless WebP.
**File:** `shared/backgrounds/muscle-endplate-sky.webp`
**Completion:** prompt ✅ · source ✅ `art-source/nanobanan/new/muscle-endplate-2026-11-03/bg.muscle_endplate.sky.jpeg` · source accepted ✅ · processed ✅ · wired ✅ · final ✅
**Evidence:** `reports/muscle-endplate-sky.process.json`; preview `previews/nanobanan/backgrounds/muscle-endplate-sky-1280x720.png`.

```text
SUBJECT: A wide, opaque pixel-art background plate of the neuromuscular junction as a living landscape, seen from inside the muscle. A deep muscle-pink and warm-rust cavern; thick, taut, striated muscle-fibre pillars rise like tree trunks at the left and right edges; wet membrane folds drape from the top corners like heavy fabric; bone-cream tendon plates form a broken shelf in the middle distance; a distant motor-nerve terminal bulb hangs above the centre, with a small nerve-yellow ACh glow and a few hard-edged joint-cyan synaptic sparks. Floating dust and condensation, damp sheen, scuffed mineral grit. The centre and lower third stay readable and low-contrast behind the player; the upper corners stay dark and quiet for the HUD. No characters, no faces, no labels, no arrows, no text, no gore. Orthographic side view; atmospheric depth from layered values and dither, not a global gradient; no single directional light, no hard horizon line at player height. Use muscle pink, warm rust, bone, bone shadow, nerve yellow, joint cyan, sage and ink; no purple, magenta, orange or pure red.
```

**Negative:** `NEGATIVE_BACKGROUND` + `blood, wound, cut muscle, steak, meat, butcher diagram, exposed organ, anatomical cutaway, textbook labels, bright centre, hard horizon, single focal landmark, purple, magenta, orange.`

**Processing**

1. Keep the full-resolution source under
   `art-source/nanobanan/new/muscle-endplate-2026-11-03/`.
2. Crop to an exact 16:9 window and scale without squashing:
   `crop=2720:1530:16:3`, then Lanczos to 1280×720 (2.125×).
3. Keep the upper corners and lower third low-contrast; check the player
   silhouette and HUD at 1280×720.
4. Do not add a runtime pattern overlay and do not palette-quantise this opaque
   scene plate.
5. Encode the accepted plate with:

```bash
ffmpeg -y -v error \
  -i art-source/nanobanan/new/muscle-endplate-2026-11-03/bg.muscle_endplate.sky.jpeg \
  -vf "crop=2720:1530:16:3,scale=1280:720:flags=lanczos" -pix_fmt rgb24 \
  art-source/nanobanan/working/tmp/muscle-endplate-sky-1280x720.png

cwebp -quiet -lossless -q 100 -m 6 \
  art-source/nanobanan/working/tmp/muscle-endplate-sky-1280x720.png \
  -o public/packs/anatomy-reflex/shared/backgrounds/muscle-endplate-sky.webp
```

The accepted runtime file is 669,798 bytes. This is a recorded opaque
scene-plate exception to the ≤300 KB pixel-asset budget, matching the 03
pretty-sky precedent.

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

Generate one seamless 2048×2048 material swatch concept per material. Downscale
the full plate to **512×512** with nearest-neighbour sampling (this preserves the
source pixel blocks and the seamless edges); do not crop an interior 512 window,
which would break the swatch seam. Quantise to the material ramps with
`npm run art:normalize -- --palette art-source/nanobanan/palette.atlas.json
--ramps ...`, then snap to the 2×2 grid and weld the swatch edges with
`npm run art:tile-clean -- --snap2x2 --weld-x union --weld-y union`. Approve the
result at 32×32, then assemble the frames with
`npm run art:atlas -- --selection single --weld-edges`.

The assembler uses deterministic 32×32 windows from the approved 512×512 swatch
and adds edge occlusion only on the sides where the mask bit is absent. The
`--selection single` pass scores every aligned window and reuses the
best-scoring, least-busy detailed window for every frame, so all masks show the
same source texture instead of a per-mask patchwork. The accepted trade-off is a 32 px
repeat. The explicit `--weld-edges` pass then makes that frame's opposite edges
pixel-identical before occlusion, so the fully connected interior frame repeats
without a seam. Use `--selection tileable` only when per-mask grain variation is
wanted more than uniformity.
It writes the atlas PNG, a JSON region map and a report. Do not ask the generator
for a named atlas; it cannot produce one reliably.

### 6.2 `tile.muscle.atlas` — 16-frame `edge`

**Style:** `STYLE_ATLAS` · **Frame:** `FRAME_ATLAS`
**Source/export:** 128×128 PNG, 4×4 grid, 32×32 frames, 2×2 clusters, opaque cells.
**File:** `shared/tiles/muscle-atlas.png`
**Rule:** `edge`, variant set `muscle-edge`
**Working swatch:** `art-source/nanobanan/working/tile-muscle-swatch-nano-clean-512.png`
**Completion:** prompt ✅ · source ✅ `art-source/nanobanan/new/muscle-endplate-2026-11-03/tile.muscle.atlas.jpeg` · source accepted ✅ · processed ✅ · wired ✅ · final ✅
**Evidence:** `reports/tile-muscle-swatch.normalize.json`, `reports/tile-muscle-swatch.clean.json`, `reports/tile-muscle-atlas.json`; tint removed.

```text
SUBJECT: A seamless pixel-art muscle-material texture swatch for a side-view platformer: wet, taut, striated muscle fibres, like bundles of long ropes. Muscle pink, warm rust and bone highlights; fine fibrous grain, subtle pores, damp sheen, broad soft mottling, a few darker striation bands. No large cracks, no embedded objects, no symbols, no labels, no grid, no border, no face, no gore. Uniform flat lighting, no directional highlight, no baked edge shading, no vignette, no bevel, no drop shadow. Orthographic surface; every colour block at least 2×2 pixels; tile seamlessly on all four edges at 32×32. Pixel-clean to a 512×512 working swatch.
```

**Negative:** `NEGATIVE_ATLAS` + `blood, wound, cut meat, steak, butcher diagram, exposed organ, face, eye, teeth, bone chunk, high contrast, directional light.`

**Acceptance**

- Exactly 16 named regions `mask-0` … `mask-15`, 128×128.
- Interior frames (fully connected, and any frame with both opposite sides connected) tile without a seam; exposed sides keep their occlusion band.
- Striations read as muscle, not steak or fabric; no gore.
- No text, labels, grid lines or baked directional edge.
- Replaces the flat muscle tile; no material tint is applied because the atlas is coloured.

### 6.3 `tile.membrane.atlas` — 16-frame `edge`

**Style:** `STYLE_ATLAS` · **Frame:** `FRAME_ATLAS`
**Source/export:** 128×128 PNG, 4×4 grid, 32×32 frames, 2×2 clusters, opaque cells.
**File:** `shared/tiles/membrane-atlas.png`
**Rule:** `edge`, variant set `membrane-edge`
**Change:** the 04 room legend changes from `corner` to `edge`.
**Working swatch:** `art-source/nanobanan/working/tile-membrane-swatch-nano-clean-512.png`
**Completion:** prompt ✅ · source ✅ `art-source/nanobanan/new/muscle-endplate-2026-11-03/tile.membrane.atlas.jpeg` · source accepted ✅ · processed ✅ · wired ✅ · final ✅
**Evidence:** `reports/tile-membrane-swatch.normalize.json`, `reports/tile-membrane-swatch.clean.json`, `reports/tile-membrane-atlas.json`; tint removed.

```text
SUBJECT: A seamless pixel-art membrane-material texture swatch for a side-view platformer: a wet, translucent sheet of living membrane, like damp fabric stretched over cells. Sage, muted bone and cool teal; soft cellular pores, condensation, a faint sheen, broad mottling, a few darker fold lines. No large tears, no holes through the sheet, no embedded objects, no symbols, no labels, no grid, no border, no face, no gore. Uniform flat lighting, no directional highlight, no baked edge shading, no vignette, no bevel, no drop shadow. Orthographic surface; every colour block at least 2×2 pixels; tile seamlessly on all four edges at 32×32. Pixel-clean to a 512×512 working swatch.
```

**Negative:** `NEGATIVE_ATLAS` + `tear, hole, blood, wound, exposed organ, face, eye, teeth, high contrast, directional light, plastic wrap, bubble wrap.`

**Acceptance**

- Exactly 16 named regions `mask-0` … `mask-15`, 128×128.
- Interior frames (fully connected, and any frame with both opposite sides connected) tile without a seam; exposed sides keep their occlusion band.
- Reads as wet membrane, not plastic wrap or bubble wrap; no gore.
- No text, labels, grid lines or baked directional edge.
- The 04 legend uses `edge`; the old `corner` rule is not kept.

### 6.4 `tile.bone.atlas` — 47-frame `blob47`

**Style:** `STYLE_ATLAS` · **Frame:** `FRAME_ATLAS`
**Source/export:** 256×192 PNG, 8×6 grid, 32×32 frames, 2×2 clusters, opaque cells.
**File:** `shared/tiles/bone-atlas.png`
**Rule:** `blob47`, variant set `bone-blob47`
**Working swatch:** `art-source/nanobanan/working/tile-bone-swatch-nano-clean-512.png`
**Completion:** prompt ✅ · source ✅ `art-source/nanobanan/new/muscle-endplate-2026-11-03/tile.bone.atlas.jpeg` · source accepted ✅ · processed ✅ · wired ✅ · final ✅
**Evidence:** `reports/tile-bone-swatch.normalize.json`, `reports/tile-bone-swatch.clean.json`, `reports/tile-bone-atlas.json`; tint removed.

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
- Interior frames (fully connected, and any frame with both opposite sides connected) tile without a seam; exposed sides keep their occlusion band.
- Mask variants are visually distinct; the edge direction matches the mask.
- No text, labels, grid lines or baked directional edge.
- The swatch reads as wet chalky bone, not generic stone or a diagram.
- 256×192, opaque, 2×2 clusters, ≤80 KB.

### 6.5 `tile.nerve.atlas` — 16-frame `edge`

**Style:** `STYLE_ATLAS` · **Frame:** `FRAME_ATLAS`
**Source/export:** 128×128 PNG, 4×4 grid, 32×32 frames, 2×2 clusters, opaque cells.
**File:** `shared/tiles/nerve-atlas.png`
**Rule:** `edge`, variant set `nerve-edge`
**Working swatch:** `art-source/nanobanan/working/tile-nerve-swatch-nano-clean-512.png`
**Completion:** prompt ✅ · source ✅ `art-source/nanobanan/new/muscle-endplate-2026-11-03/tile.nerve.atlas.jpeg` · source accepted ✅ · processed ✅ · wired ✅ · final ✅
**Evidence:** `reports/tile-nerve-swatch.normalize.json`, `reports/tile-nerve-swatch.clean.json`, `reports/tile-nerve-atlas.json`; tint removed.

```text
SUBJECT: A seamless pixel-art nerve-material texture swatch for a side-view platformer: bundles of pale wet nerve fibres, like bundled cables or wires. Nerve yellow and sage, joint-cyan edge sheen, fine fibrous grain, subtle pores and grime, broad soft mottling. No large cracks, no embedded objects, no symbols, no labels, no grid, no border. Uniform flat lighting, no directional highlight, no baked edge shading, no vignette, no bevel, no drop shadow. Orthographic surface; every colour block at least 2×2 pixels; tile seamlessly on all four edges at 32×32. Pixel-clean to a 512×512 working swatch.
```

**Negative:** `NEGATIVE_ATLAS` + `spaghetti, rope, cable bundle, wire harness, blood, wound, exposed organ, high contrast, directional light, circuit board.`

**Acceptance**

- Exactly 16 named regions `mask-0` … `mask-15`, 128×128.
- Interior frames (fully connected, and any frame with both opposite sides connected) tile without a seam; exposed sides keep their occlusion band.
- The soft edge matches the `edge` autotile rule; frames are visually distinct.
- No text, labels, grid lines or baked directional edge.
- The swatch reads as bundles of pale wet cables, not spaghetti or a diagram.
- 128×128, opaque, 2×2 clusters, ≤80 KB.

---

## 7. 04 sprite prompts

### 7.1 `sprite.gate.nerve` — Ca²⁺ channel gate

**Fact anchor:** puzzle abstraction, not a literal ion channel. **Reference:** P1 for style/palette only. **Style:** `STYLE_SPRITE`. **Frame:** `FRAME_ENTITY`.
**Source/export:** 64×64 PNG, alpha, 1:1. **File:** `shared/sprites/gate-nerve.png`.
**Completion:** prompt ✅ · source ✅ `art-source/nanobanan/new/muscle-endplate-2026-11-03/sprite.gate.nerve.jpeg` (flat `#FF00FF`) · source accepted ✅ · processed ✅ · wired ✅ · final ✅
**Evidence:** `reports/gate-nerve.key.json`, `reports/gate-nerve.fit.json`; 60×60 content in 64×64; 5,444 bytes; palette/alpha clean. The source-to-fit and palette-distance warnings are recorded and accepted because the silhouette reads.

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
**Completion:** prompt ✅ · source ✅ `art-source/nanobanan/new/muscle-endplate-2026-11-03/sprite.exit.jpeg` (flat `#FF00FF`) · source accepted ✅ · processed ✅ · wired ✅ · final ✅
**Evidence:** `reports/exit.key.json`, `reports/exit.fit.json`; 59×60 content in 64×64; 6,043 bytes; palette/alpha clean. The exit has no joint-ramp pixels; the warm destination light is the read, not a cyan rim.

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

The CLI examples below use the **accepted Nano Banana swatches** from the
2026-11-03 batch. The full 2048×2048 plate is nearest-downscaled to 512,
quantised, 2×2-snapped and edge-welded before `--in`. Do not feed the raw
2048×2048 JPEG to the assembler.

### 8.2 CLI

```bash
npm run art:atlas -- \
  --in art-source/nanobanan/working/tile-muscle-swatch-nano-clean-512.png \
  --out public/packs/anatomy-reflex/shared/tiles/muscle-atlas.png \
  --rule edge \
  --edge-color "#05090b" \
  --asset-id tile.muscle.atlas \
  --seed 1 \
  --selection single \
  --weld-edges \
  --report art-source/nanobanan/reports/tile-muscle-atlas.json \
  --preview art-source/previews/nanobanan/tiles/tile-muscle-atlas-4x.png \
  --preview-scale 4 \
  --background "#101a20"
```

For the bone atlas:

```bash
npm run art:atlas -- \
  --in art-source/nanobanan/working/tile-bone-swatch-nano-clean-512.png \
  --out public/packs/anatomy-reflex/shared/tiles/bone-atlas.png \
  --rule blob47 \
  --edge-color "#05090b" \
  --fill-color "#c9b79a" \
  --asset-id tile.bone.atlas \
  --seed 1 \
  --selection single \
  --weld-edges \
  --report art-source/nanobanan/reports/tile-bone-atlas.json
```

### 8.3 Behaviour

- Accepts a PNG swatch at least 32×32. Larger swatches are sampled through deterministic 32×32 windows; a 512×512 swatch gives 16×16 possible windows.
- `edge` writes 16 frames in a 4×4 grid, keys `0`–`15`.
- `blob47` writes 47 frames in an 8×6 grid using the canonical mask list above.
- Adds edge/corner occlusion only where the mask bit is absent.
- With `--selection single`, scores every aligned 32×32 window by opposite-edge
  difference and reuses the best-scoring, least-busy detailed window for every
  frame. This is reported as `selection: "single"`; the `windows` map is
  identical for every mask. The accepted trade-off is a 32 px repeat.
- With `--selection tileable`, scores every aligned 32×32 window by opposite-edge
  difference and chooses different windows per mask from the lowest-scoring
  detailed windows. Interior frames use the best window. This is reported as
  `selection: "tileable"` plus a per-mask `windows` map.
- With `--weld-edges`, copies each frame's left/top 2×2 blocks to its right/bottom
  edges before occlusion. This is an explicit seam closure, not a silent repair;
  it is reported as `weldEdges: true` and is required for `mask-15`/`mask-255`
  interior tiles to repeat without a texture seam.
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
  "weldEdges": true,
  "selection": "single",
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
  "width": 128,
  "height": 128,
  "license": "Nano Banana / Google Gemini (plan TBD)",
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
  "license": "Nano Banana / Google Gemini (plan TBD)"
}
```

Keep `bg.muscle_endplate.far`, `.mid` and `.near` as declared placeholders with no `src`.

The accepted state (2026-11-03):

- `"placeholder": true` is removed from the four atlas entries, the 04 sky,
  `sprite.gate.nerve` and `sprite.exit`.
- The licence strings are the Nano Banana provenance.
- The four material `tint` values are removed because the atlases are coloured.

### 9.2 `materials.json`

Add three variant sets and repoint the nerve set:

- `bone-blob47`: `rule: "blob47"`, atlas `tile.bone.atlas`, 47 frames, fallback `mask-0`.
- `nerve-edge`: atlas `tile.nerve.atlas`, 16 frames, fallback `mask-0`.
- `muscle-edge`: `rule: "edge"`, atlas `tile.muscle.atlas`, 16 frames, fallback `mask-0`.
- `membrane-edge`: `rule: "edge"`, atlas `tile.membrane.atlas`, 16 frames, fallback `mask-0`.

Set `variantSet` on each material: `bone-blob47`, `nerve-edge`, `muscle-edge`, `membrane-edge`.

The final coloured atlases have **no `tint` values**: `bone`, `nerve`, `muscle`
and `membrane` resolve their colour directly from the atlas texture. Do not
reintroduce a tint without reverting to a neutral atlas.

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

Use `Nano Banana / Google Gemini (plan TBD)` for the seven accepted runtime
files and record the source/runtime hashes in each entry. Keep the old
`shared/tiles/anatomy-atlas.svg` entry only because the SVG remains a tracked
test fixture.

### 9.5 Tests

- `tests/materials.test.ts` expects four variant sets, the new atlas IDs, and no
  default material tints.
- `tests/tile-autotile.test.ts` resolves `tile.nerve.atlas` or
  `tile.muscle.atlas` instead of `tile.anatomy.atlas`.
- `tests/art-atlas.test.ts` covers 16/47 regions, region bounds, opaque cells,
  mask direction, and the explicit `--weld-edges` seam closure.
- `tests/background-assets.test.ts` covers the final 04 sky, the three declared
  04 placeholders, and the matching licence.
- `tests/tile-atlases.test.ts` covers final/no-placeholder state, palette and
  alpha, 2×2 clustering, connected-edge continuity, licences and variant frames.
- `tests/entity-sprites.test.ts` covers the final 64×64 `sprite.gate.nerve` and
  `sprite.exit`, palette/alpha/margins and licences.

### 9.6 Documentation updates

- Add a pointer to this document from `docs/m3/asset-requirements-v01.md` and `docs/m3/background-asset-requirements-v01.md`.
- Update `docs/gdd/GDD-MAP.md` and `docs/gdd/CAPTURES.md` with the accepted 04
  sky/atlas/gate/exit state.
- Update `public/packs/anatomy-reflex/levels/04-muscle-effector/README.md` room
  facts and remaining-gap notes.
- Update the top-level `README.md`, `IMPLEMENTATION.md` and the graphics status
  lines in `docs/gdd/`.
- Regenerate the GDD site with `npm run gdd:site`.

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
- `sprite.gate.nerve` and `sprite.exit` render from the accepted 64×64
  Nano Banana sprites with `placeholder` removed.
- The seven source plates remain under
  `art-source/nanobanan/new/muscle-endplate-2026-11-03/` and are wired through
  the accepted runtime files in §4.1.
- No duplicate tinting: the coloured atlases are not tinted at runtime.

---

## 11. Stop rules

- A generated source plate is not a runtime asset. Do not mark any row `processed`, `wired`, or `final` without the matching report, file, manifest entry, licence, and test.
- If a sprite source does not have a removable flat background, stop and regenerate; do not key a vignette or paint a mask by hand without recording the method.
- If a swatch does not tile, reject it before assembling; do not hide a seam with a frame border.
- Do not crop an interior 512 window from a seamless 2048 plate; downscale the full plate, then 2×2-snap and weld.
- If a fully connected frame's opposite edges differ, run the explicit `--weld-edges` pass or reject the atlas; do not hide the seam with a border.
- If a generated atlas has a transparent cell, reject it; every cell is opaque.
- If an atlas frame reads as a different mask than its key, reject the atlas.
- If the 04 sky is too busy behind the player or HUD, simplify it; do not add a dark overlay at runtime.
- If the 04 sky fails after two attempts, keep the interim plate and record the failure; do not wire far/mid/near as a rescue.
- If the final coloured atlas requires engine changes, stop; this is an art/content task.

---

## 12. Prompt log template

| Date | Prompt pack | Asset | Generator | Source | Chosen file | Runtime export | Status | Notes |
|---|---|---|---|---|---|---|---|---|
| 2026-11-03 | muscle-endplate-2026-11-03.1 | `bg.muscle_endplate.sky` | Nano Banana / Google Gemini (manual web UI; model/seed not recorded) | `art-source/nanobanan/new/muscle-endplate-2026-11-03/bg.muscle_endplate.sky.jpeg` | same | `shared/backgrounds/muscle-endplate-sky.webp` | accepted | 2720×1530 crop at (16,3); Lanczos to 1280×720; lossless VP8L; 669,798 bytes; `reports/muscle-endplate-sky.process.json` |
| 2026-11-03 | muscle-endplate-2026-11-03.1 | `tile.muscle.atlas` | Nano Banana / Google Gemini | `.../tile.muscle.atlas.jpeg` | `working/tile-muscle-swatch-nano-clean-512.png` | `shared/tiles/muscle-atlas.png` | accepted | nearest 512; ramps muscle/bone/boneShadow/teal/ink/sage; max distance 66.51; 2×2 clean; single-window selection + edge weld; `reports/tile-muscle-*` |
| 2026-11-03 | muscle-endplate-2026-11-03.1 | `tile.membrane.atlas` | Nano Banana / Google Gemini | `.../tile.membrane.atlas.jpeg` | `working/tile-membrane-swatch-nano-clean-512.png` | `shared/tiles/membrane-atlas.png` | accepted | nearest 512; ramps sage/bone/boneShadow/teal/ink/joint; max distance 56.05; 2×2 clean; single-window selection + edge weld; `reports/tile-membrane-*` |
| 2026-11-03 | muscle-endplate-2026-11-03.1 | `tile.bone.atlas` | Nano Banana / Google Gemini | `.../tile.bone.atlas.jpeg` | `working/tile-bone-swatch-nano-clean-512.png` | `shared/tiles/bone-atlas.png` | accepted | nearest 512; ramps bone/boneShadow/teal/ink/sage; max distance 74.23; 2×2 clean; single-window selection + edge weld; `reports/tile-bone-*` |
| 2026-11-03 | muscle-endplate-2026-11-03.1 | `tile.nerve.atlas` | Nano Banana / Google Gemini | `.../tile.nerve.atlas.jpeg` | `working/tile-nerve-swatch-nano-clean-512.png` | `shared/tiles/nerve-atlas.png` | accepted | nearest 512; ramps nerve/sage/joint/boneShadow/teal/ink/bone; max distance 62.20; 2×2 clean; single-window selection + edge weld; `reports/tile-nerve-*` |
| 2026-11-03 | muscle-endplate-2026-11-03.1 | `sprite.gate.nerve` | Nano Banana / Google Gemini | `.../sprite.gate.nerve.jpeg` | `keyed/gate-nerve.png` (ignored) | `shared/sprites/gate-nerve.png` | accepted | flat `#FF00FF`; key 0.18/0.08 despill trim; 60×60 fit in 64×64; 5,444 bytes; palette/alpha clean; sourceScale 31.2 and maxDistance 52.7 warnings reviewed |
| 2026-11-03 | muscle-endplate-2026-11-03.1 | `sprite.exit` | Nano Banana / Google Gemini | `.../sprite.exit.jpeg` | `keyed/exit.png` (ignored) | `shared/sprites/exit.png` | accepted | flat `#FF00FF`; key 0.18/0.08 despill trim; 59×60 fit in 64×64; 6,043 bytes; palette/alpha clean; sourceScale 30.1, maxDistance 63.6 and no-joint-ramp warnings reviewed |

Processing evidence:

| Asset | Key/report | Fit/atlas report | Preview |
|---|---|---|---|
| `bg.muscle_endplate.sky` | `reports/muscle-endplate-sky.process.json` | — | `previews/nanobanan/backgrounds/muscle-endplate-sky-1280x720.png` |
| `tile.muscle.atlas` | `reports/tile-muscle-swatch.normalize.json`, `.clean.json` | `reports/tile-muscle-atlas.json` | `previews/nanobanan/tiles/tile-muscle-atlas-4x.png` |
| `tile.membrane.atlas` | `reports/tile-membrane-swatch.normalize.json`, `.clean.json` | `reports/tile-membrane-atlas.json` | `previews/nanobanan/tiles/tile-membrane-atlas-4x.png` |
| `tile.bone.atlas` | `reports/tile-bone-swatch.normalize.json`, `.clean.json` | `reports/tile-bone-atlas.json` | `previews/nanobanan/tiles/tile-bone-atlas-4x.png` |
| `tile.nerve.atlas` | `reports/tile-nerve-swatch.normalize.json`, `.clean.json` | `reports/tile-nerve-atlas.json` | `previews/nanobanan/tiles/tile-nerve-atlas-4x.png` |
| `sprite.gate.nerve` | `reports/gate-nerve.key.json` | `reports/gate-nerve.fit.json` | `previews/nanobanan/entities/gate-nerve-2x.png` |
| `sprite.exit` | `reports/exit.key.json` | `reports/exit.fit.json` | `previews/nanobanan/entities/exit-2x.png` |

Record the exact prompt version, source file, crop, palette, processing command
and acceptance result for every generated asset. “Accepted” here means the
runtime file, manifest `src`, licence, prompt-log row and relevant tests all
exist; the generator model/seed remain unrecorded.
