# M3 Background Asset Requirements — Shrinkonauts: The Reflex Arc

**Status:** Draft v0.1 · 1 November 2026 (background chroma-key layering; sky POC wired, far/mid/near regeneration spec)
**Owner:** Snorre  
**Scope:** The four `03-nerve-forest` background plates: sky, far, mid and near  
**Supersedes:** The background prompts and background pipeline notes in [`asset-requirements-v01.md`](asset-requirements-v01.md): §5.4 background status note, §6.2/§6.4 background notes, §7.3 background setting, §7.7–§7.8 background checks, §8.7/§8.13/§8.20 and the background rows in §9. It does **not** re-baseline the current M3 scope: the build still wires only the sky, and far/mid/near remain source-only/deferred until regenerated and accepted.  
**Governing decisions:** ADR-0031 (layered backgrounds), ADR-0047 (pixel-art direction), ADR-0048 (2× pixel rendering), ADR-0060–0065 (source/working/runtime pipeline, palette variants, previews)  
**Related:** [`asset-requirements-v01.md`](asset-requirements-v01.md) · [`room.json`](../../public/packs/anatomy-reflex/levels/03-nerve-forest/room.json) · [`background.ts`](../../src/world/background.ts) · [`art-key.ts`](../../scripts/art-key.ts) · [`art-source/nanobanan/README.md`](../../art-source/nanobanan/README.md)

> **The rule for backgrounds:** the generator cannot paint alpha. The sky is generated **opaque**. Far, mid and near are generated as **cut-out plates on a flat `#FF00FF` chroma-key field**, then keyed with `npm run art:key`. Never write “transparent” in a background prompt; the generator will paint a checkerboard or an opaque scene.

> **Current M3 status (2026-11-01).** `bg.nerve_forest.sky` is POC-integrated and is the only 03 background wired by `room.json`. The supplied far/mid/near JPEGs are **source-only/deferred** because they are opaque 16:9 scenes and the near plate has a baked checkerboard. This document defines the corrected prompts and key workflow for those three layers; bringing them into the runtime requires a scope re-baseline in the main asset document (§0, §2.2 and §5.4).

---

## 0. Summary

| Decision | Value |
|---|---|
| Background assets | **4 defined** — sky wired; far/mid/near source-only/deferred |
| Sky | **640×368**, opaque, integer 2× cover; POC integrated |
| Parallax layers | **1024×512**, hard alpha, 2×2 clusters, tile on both axes; deferred until regenerated |
| Key colour | **`#FF00FF`** — pure magenta, not generic “bright pink” |
| Key tool | **`npm run art:key`**, full frame, **no `--trim`** |
| Near layer | **Sparse overhead clumps**; lower half clear; no continuous frame |
| 03 palette | Deep teal, sage, bone-shadow, nerve yellow, joint cyan; **no muscle pink or crimson** |
| Prompt version | **`m3-2026-11-01.1`** |
| Style version | **`style-pixel-v2`** |
| Doc version | **v0.1** |

> **Why the previous plates failed.** `art-source/nanobanan/new/bg-nerve_forest-far.jpeg` and `bg-nerve_forest-mid.jpeg` are fully opaque scenes. `bg-nerve_forest-near.jpeg` contains a literal grey/white checkerboard. `bg.nerve_forest.sky.jpeg` is a complete scene with foreground trunks and pink drapes. They are failed references, not salvageable layers.
>
> **What changed.** The prompts now describe **one cut-out layer per image**, with a flat chroma-key field, explicit layer separation, coverage and value budgets, and a deterministic keying step. The sky remains the only opaque plate.

---

## 1. Scope contract

### 1.1 Asset register

| Asset ID | Type | Source size | Fit | Status | File |
|---|---|---|---|---|---|
| `bg.nerve_forest.sky` | Background | 640×368, opaque | cover, integer 2× | **POC integrated**; final approval pending | `shared/backgrounds/nerve-forest-sky.webp` |
| `bg.nerve_forest.far` | Parallax layer | 1024×512, hard alpha | tile both axes | **Source-only/deferred**; regenerate with this spec | `shared/backgrounds/nerve-forest-far.webp` |
| `bg.nerve_forest.mid` | Parallax layer | 1024×512, hard alpha | tile both axes | **Source-only/deferred**; regenerate with this spec | `shared/backgrounds/nerve-forest-mid.webp` |
| `bg.nerve_forest.near` | Parallax layer | 1024×512, hard alpha | tile both axes | **Source-only/deferred**; regenerate with this spec | `shared/backgrounds/nerve-forest-near.webp` |

Runtime files live under `public/packs/anatomy-reflex/shared/backgrounds/`. The current `room.json` wires only the sky.

### 1.2 Out of scope

- `bg.muscle_endplate.*` and all `04-muscle-effector` backgrounds — placeholder art in M3.
- Levels `01-bone-gate`, `02-joint-chamber`, `05-reflex-core` and the Silicon fixture.
- Music, ambience and background animation.
- Any engine change beyond the recorded pixel-render settings in ADR-0048.
- Any new background asset ID.

### 1.3 Relationship to the main asset document

This document is the **source of truth for the background prompts and key workflow**. The shared sprite, atlas, badge and audio requirements remain in [`asset-requirements-v01.md`](asset-requirements-v01.md). Where the two documents disagree about how a background plate is generated, this document wins.

The main document remains the source of truth for **current M3 scope and status**: the sky is wired, and far/mid/near are source-only/deferred. If the three parallax layers are regenerated and accepted, update the main document's summary, §2.2 and §5.4 in the same change. Do not silently expand the M3 capture scope from this document alone.

---

## 2. Runtime constraints

These facts come from the current pack and renderer. Do not “fix” them in export.

| Constraint | Evidence | Consequence |
|---|---|---|
| The room is **1280×736** (40×23 tiles at 32 px) | `room.json` | The sky must cover 1280×736 before the 16:9 capture crop. |
| The capture viewport is **1280×720** | `src/world/create-game.ts` (`VIEWPORT`) | The 16:9 capture crops 16 px of room height. |
| The sky is displayed by `fit: "cover"` at an integer **2×** | `background.ts` (`cover` branch), `room.json` | Author **640×368**; 2× gives 1280×736. No fractional scale. |
| Far/mid/near are `TileSprite`s with `fit: "tile"` | `room.json`, `background.ts` | Author **1024×512**; tile on **both axes**. |
| Sky parallax is **0.05 / 0.02**, depth −40 | `room.json` | The sky is almost static; it must be quiet and distant. |
| Far parallax is **0.20 / 0.10**, depth −30 | `room.json` | Large, slow, low-contrast shapes. |
| Mid parallax is **0.45 / 0.20**, depth −20 | `room.json` | Branching structures and bulbs; medium contrast. |
| Near parallax is **0.75 / 0.35**, depth −10, opacity **0.9** | `room.json` | Dark, sparse overhead clumps; keep the play band clear. |
| The sky receives a **nerve-fibres** pattern overlay at 0.14 | `room.json` | Do not bake a competing full-frame fibre texture into the sky. |
| The mid receives a **bone-cortex** pattern overlay at 0.12 | `room.json` | Do not bake a bone-cortex texture into the mid plate. |
| Parallax textures are sampled 1:1 | `background.ts` | Every colour block must be at least **2×2 pixels**. |
| Pixel mode uses nearest-neighbour sampling | ADR-0048 | No anti-aliasing, no soft edges, no fractional placement. |
| Alpha is hard 0/255 for pixel assets | ADR-0048, main §6.3 | No semi-transparent pixels in the final PNG/WebP. |
| Lossy compression creates colour noise | main §6.1 | Final export is lossless WebP or PNG, never JPG. |
| Per-asset budget is ≤300 KB | main §6.6 | A larger file usually means the grid or palette is wrong. |

---

## 3. Layer contract

### 3.1 The four layers

This is the **target contract** for the full 03 background stack. The current M3 build wires only the sky; the far/mid/near rows describe the deferred layers when they are regenerated.

| Layer | Fit / parallax | Key field | Painted coverage | Value | Role |
|---|---|---|---:|---|---|
| `sky` | cover 2×; 0.05 / 0.02 | **none — opaque** | full frame, quiet | darkest, low contrast | Distant haze and value base. No foreground shapes. |
| `far` | tile; 0.20 / 0.10 | **`#FF00FF`** | **less than half** | low contrast, 2–3 steps | Distant giant trunks and segmented sheath plates. |
| `mid` | tile; 0.45 / 0.20 | **`#FF00FF`** | **about half** | medium contrast | Branching twigs, hanging bulbs and membrane folds. |
| `near` | tile; 0.75 / 0.35 | **`#FF00FF`** | **at least two-thirds empty** | dark, high contrast, 2 steps | Sparse overhead clumps and edge tendrils; lower half clear. |

### 3.2 Layer separation

- **Sky:** only distant, low-contrast forms. No foreground trunk, canopy, drape, frame, edge silhouette or object that appears close to the viewer.
- **Far:** only distant trunks and sheath plates. No hanging bulbs, no canopy, no foreground roots, no ground line.
- **Mid:** branching twigs, bulbs and folds. No dark near-canopy silhouettes, no foreground roots, no ground line.
- **Near:** only dark overhead clumps and edge tendrils. No distant haze, no mid-layer bulbs, no continuous frame.
- Every layer must read alone on `#101a20` and in the stack. No layer may rely on another layer's pixels to read.

### 3.3 Key-field rules — far, mid and near only

The empty space is **one flat, uniform `#FF00FF` field to every edge**:

- No checkerboard, no grey/white transparency grid, no alpha pattern, no grid of squares.
- No gradient, vignette, background lighting, texture or cast shadow.
- The painted shapes are opaque, hard-edged and clearly separated from the field.
- No feathering, no soft glow, no semi-transparent haze.
- No floating dust, specks or bubbles outside a painted shape.
- No magenta or pink inside the shapes: no rim light, no highlight, no shadow tint.
- Do not inset the composition or reserve a clean margin. Shapes may meet any edge and must continue across it when tiled.
- The painted shapes **and the magenta gaps** must both tile seamlessly on all four edges.
- The magenta field is temporary. It is removed before export and is never part of the palette.

> **Why exact `#FF00FF`:** the key tool defaults to it. A generic hot pink such as `#FF69B4` normalises about 0.29 from the key, outside the default `0.18 + 0.08` band, and will not key cleanly. The prompt must state the hex, not “bright pink”.

### 3.4 Coverage budgets

Coverage is the fraction of the 1024×512 canvas that is painted (opaque after keying). Measure it from the key report:

```text
coverage = keptPixels / (keyedPixels + keptPixels)
```

| Layer | Target coverage | Reject if |
|---|---:|---|
| Far | less than 50% | more than 60% — that is an opaque scene, not a cut-out |
| Mid | 35–55% | more than 65% — the gaps are too small |
| Near | 33% or less | more than 45% — the play band is at risk |

A plate with a flat field and a full-frame scene will report 80–100% coverage. That is the main failure this document exists to prevent.

### 3.5 Tiling rules

- Far/mid/near tile **horizontally and vertically** in Phaser's `TileSprite`.
- Verify with a 2×2 repeat at **2048×1024** (native) and at **1280×720** (runtime).
- Avoid a single strong landmark that repeats obviously.
- A clean magenta margin at the canvas edge becomes a transparent gutter at the tile seam. Reject it.
- Do not trim a parallax plate. Keep the 1024×512 canvas so layer registration and tile phase stay fixed.
- The sky is not tiled; it uses integer 2× cover.

### 3.6 03 palette guard

The 03 colour script is **deep teal, nerve yellow and electric cyan**, supported by sage and bone-shadow. The background stack uses:

- Teal ramp for darkness and depth.
- Sage and bone-shadow ramps for muted tissue and distant structure.
- Nerve ramp for signals and small glow accents.
- Joint ramp for cool edge light.
- Ink for the darkest near silhouettes.

**Not allowed in the 03 background stack:** muscle pink, crimson, purple, neon green, unapproved orange, pure red. The generated sky and near plates used pink drapes; those are out of script and must not be reproduced in a regenerated plate.

---

## 4. Style and palette

The blocks below are repeated so each assembled prompt is copy-pasteable.

### 4.1 `STYLE_BACKGROUND`

```text
Pixel art for a side-view 2D platformer set inside a living human body. Native pixel grid, hard square pixels, crisp edges, no anti-aliasing, no smoothing. Orthographic side view, landscape scale; atmospheric depth from layered values and dither, not a global gradient; local warm highlights only. Damp membrane sheen, condensation, dust and grime. Gross-cute biology, wry deadpan tone, 12+ friendly: never gory. The body is a landscape, not a textbook cutaway; use cable-like nerves, segmented sheath plates and membrane folds as architecture.
```

### 4.2 `PALETTE`

```text
Palette ramps: teal #05090b #101a20 #1d2f38; bone #c9b79a #f2e8d5 #fff8e8; bone shadow #5f736e #7a8f8a #9db4ad; nerve #b8862b #ffd166 #fff3b0; joint #3f9fb5 #7bdff2 #c9f7ff; muscle #a82a4a #ef476f #ff9fb2; sage #6f847d #9db4ad #c4d4ce; ink #000000 #05090b #2a3f47. Use only these ramp steps; no intermediate blends, no unapproved orange.
```

The `PALETTE` block lists all nine families because it is shared with other categories. The 03 subject and negative blocks restrict the background stack to teal, sage, bone-shadow, nerve and joint.

### 4.3 Do / do not

| Do | Do not |
|---|---|
| Generate the sky opaque and quiet | Put foreground trunks, drapes or a frame in the sky |
| Generate far/mid/near on flat `#FF00FF` | Write “transparent” or ask for a checkerboard |
| Paint one layer per image | Ask for a composited four-layer stack or a contact sheet |
| Let shapes run off the canvas edges | Reserve a clean margin or inset the composition |
| Keep the magenta field flat and uniform | Shade the field, cast shadows on it, or use a gradient |
| Keep glows inside a hard-edged dithered shape | Let glow bleed into the magenta |
| Keep the lower half of the near layer empty | Draw a continuous frame, ring or window |
| Key at full resolution with `art:key` | Trim the parallax canvas or key after downscaling |
| Quantise after keying | Quantise before keying or ship the raw JPEG |
| Use teal, sage, bone-shadow, nerve, joint and ink | Use muscle pink, crimson, purple or magenta inside the art |

---

## 5. Prompt pack

### 5.1 Assembly formula

```text
SKY PROMPT        = SUBJECT_SKY + STYLE_BACKGROUND + PALETTE + FRAME_SKY
PARALLAX PROMPT   = SUBJECT_<FAR|MID|NEAR> + STYLE_BACKGROUND + PALETTE + FRAME_PARALLAX
NEGATIVE PROMPT   = NEGATIVE_BACKGROUND + [NEGATIVE_PARALLAX for far/mid/near] + NEGATIVE_<ASSET>
```

Rules:

1. One layer per image. Never generate all four in one image.
2. The sky is the only opaque background prompt.
3. Far/mid/near must contain the exact string `flat solid chroma-key magenta #FF00FF`.
4. Never write “transparent”, “alpha”, “checkerboard” or “transparency grid” in a positive background prompt. The word “transparent” is what produced the baked checkerboard.
5. Do not add a pixel-grid or cell-size instruction to the prompt; the 640×368 / 1024×512 sizes are composition and aspect constraints for the plate, not sprite cells.
6. Use the negative field when Ludo provides one; otherwise append the negative text after the positive prompt.
7. Keep the Ludo source JPEG in `art-source/`; it is never a runtime asset.

### 5.2 `FRAME_SKY`

```text
640×368, wide, opaque, edge-to-edge background plate, no frame. This is the base layer: do not use magenta, a chroma-key field, or a grid of squares. Keep the upper corners and lower third dark and low-contrast; keep important detail inside the central 70% for the 2× cover crop. Hard pixel edges; no anti-aliasing.
```

### 5.3 `FRAME_PARALLAX`

```text
1024×512, 2:1, one isolated cut-out parallax layer on a flat solid chroma-key magenta #FF00FF field, no frame. The magenta is empty space that will be cut away; it is not part of the artwork. Keep the field one uniform colour to every edge: no grid of squares, no patterned field, no gradient, no vignette, no texture, no lighting, no cast shadow. Every painted shape is opaque and hard-edged, clearly separated from the field; no feathering, no soft glow, no soft haze, and no floating dust, specks or bubbles outside a painted shape. Do not inset the composition or reserve a clean margin: shapes may meet any edge and must continue across it when tiled; the painted shapes and the magenta gaps must both tile seamlessly on all four edges. No magenta or pink inside the painted shapes: no rim light, no highlight, no shadow tint. Every colour block at least 2×2 pixels. Hard pixel edges; no anti-aliasing.
```

### 5.4 `NEGATIVE_BACKGROUND`

```text
text, letters, numbers, logo, watermark, border, UI, labels, arrows, diagram, diagram lines, textbook anatomy diagram, cutaway, cross-section, characters, creatures, astronaut, anti-aliasing, smooth gradient, painterly, 3D render, photorealism, anime, clean vector, high-res detail, mixed pixel sizes, faux pixel art, blurry edges, neon cyberpunk, purple, neon green, orange, pure red, blood, gore, viscera, exposed organs, hard horizon line, single focal landmark, high-contrast centre, opaque near-layer centre, obvious repeating object, checkerboard, transparency grid, alpha checker, magenta spill, pink fringe, magenta inside the shapes, frame
```

### 5.5 `NEGATIVE_PARALLAX`

```text
checkerboard, transparency grid, grey and white check pattern, alpha checker, white background, grey background, backdrop colour other than pure #FF00FF, gradient background, vignette, background lighting, textured background, shadow on the background, magenta spill, pink fringe, magenta rim light, magenta inside the shapes, soft feathered edge, semi-transparent edge, fog crossing the cut-out, glow bleeding into the background, floating dust outside the shapes, opaque full-frame plate, painted sky, painted ground, horizon, scene, frame, border, inset margin, gutter
```

---

## 6. Background prompts

### 6.1 `bg.nerve_forest.sky` — opaque sky plate

**Current status:** POC integrated; final approval pending. The current plate is the only 03 background wired by `room.json`, but it is busier than the target (foreground drapes/trunk). Regenerate with this prompt for final approval, or record a formal exception if the POC plate is kept.

**Reference:** none; this creates `style-anchor-sky.png`. **Style:** `STYLE_BACKGROUND`. **Frame:** `FRAME_SKY`. **Source:** 640×368, opaque, integer 2× cover. **File:** `shared/backgrounds/nerve-forest-sky.webp`.

```text
SUBJECT: A wide, opaque background plate: the interior of a living body as a damp nerve forest at night, seen from far away. Deep teal darkness; distant, low-contrast cable-like nerve trunks, like giant roots, receding in dither haze; segmented sheath plates, like stacked roof tiles, small and hazy in the distance; a faint nerve-yellow glow low in the distance; floating dust and condensation. Everything here is distant and quiet: no foreground trunk, no canopy, no drape, no framing element, no large dark silhouette at the edges, no object that appears close to the viewer. No characters, no creatures, no labels, no arrows. Orthographic side view, soft atmospheric depth from layered values and dither, no single directional light, no hard horizon line at player height. Use only deep teal, sage, bone-shadow, nerve yellow and joint cyan; no muscle pink, crimson, purple or magenta. Keep the upper corners and lower third dark and low-contrast for HUD and player silhouettes; keep important detail inside the central 70% for the 2× cover crop.

Pixel art for a side-view 2D platformer set inside a living human body. Native pixel grid, hard square pixels, crisp edges, no anti-aliasing, no smoothing. Orthographic side view, landscape scale; atmospheric depth from layered values and dither, not a global gradient; local warm highlights only. Damp membrane sheen, condensation, dust and grime. Gross-cute biology, wry deadpan tone, 12+ friendly: never gory. The body is a landscape, not a textbook cutaway; use cable-like nerves, segmented sheath plates and membrane folds as architecture.

Palette ramps: teal #05090b #101a20 #1d2f38; bone #c9b79a #f2e8d5 #fff8e8; bone shadow #5f736e #7a8f8a #9db4ad; nerve #b8862b #ffd166 #fff3b0; joint #3f9fb5 #7bdff2 #c9f7ff; muscle #a82a4a #ef476f #ff9fb2; sage #6f847d #9db4ad #c4d4ce; ink #000000 #05090b #2a3f47. Use only these ramp steps; no intermediate blends, no unapproved orange.

640×368, wide, opaque, edge-to-edge background plate, no frame. This is the base layer: do not use magenta, a chroma-key field, or a grid of squares. Keep the upper corners and lower third dark and low-contrast; keep important detail inside the central 70% for the 2× cover crop. Hard pixel edges; no anti-aliasing.
```

**Negative:** `NEGATIVE_BACKGROUND` + foreground trunk, canopy, drape, edge silhouette, framing element, magenta key field, checkerboard, transparency grid, bright bone-white highlights, high-contrast centre, muscle pink, crimson.

**Acceptance**

- At the 1280×720 cover crop, HUD text and player silhouettes read.
- No foreground trunk, canopy, drape, edge silhouette or framing element.
- No hard horizon at player height; no characters, text, labels or arrows; no single focal landmark.
- No magenta, key field, checkerboard or grid.
- Palette restricted to teal, sage, bone-shadow, nerve and joint; no muscle pink or crimson.
- 640×368, opaque, lossless WebP/PNG, ≤300 KB.

**Visual check:** reads as a quiet, distant backdrop. It must look empty enough to sit behind three more layers.

---

### 6.2 `bg.nerve_forest.far` — far parallax cut-out

**Reference:** `style-anchor-sky.png` for style/palette only. **Style:** `STYLE_BACKGROUND`. **Frame:** `FRAME_PARALLAX`. **Source:** 1024×512, hard alpha, 2×2 clusters, generated on flat `#FF00FF` and keyed with `npm run art:key` (no trim). **File:** `shared/backgrounds/nerve-forest-far.webp`.

```text
SUBJECT: A seamless 2:1 far parallax cut-out layer: distant giant cable-like nerve trunks and segmented sheath plates, like stacked roof tiles, seen far away in cool teal and sage haze. Large, slow, simple shapes; two or three flat value steps; low contrast; no bone cream or white. The layer is sparse and airy: less than half the canvas is painted, the rest is flat magenta #FF00FF empty space. The painted clusters are separate, irregular masses that may meet any canvas edge; they do not form a continuous wall, a frame, a ring, a horizon or a ground line. No hanging bulbs, no canopy, no foreground roots, no characters, no labels, no arrows, no unique focal object, no bright highlights. Orthographic side view; the painted shapes and the magenta gaps must both tile seamlessly on all four edges; no single directional light, no hard cast shadows. Use only deep teal, sage, bone-shadow, nerve yellow and joint cyan; no muscle pink, crimson, purple or magenta inside the shapes.

Pixel art for a side-view 2D platformer set inside a living human body. Native pixel grid, hard square pixels, crisp edges, no anti-aliasing, no smoothing. Orthographic side view, landscape scale; atmospheric depth from layered values and dither, not a global gradient; local warm highlights only. Damp membrane sheen, condensation, dust and grime. Gross-cute biology, wry deadpan tone, 12+ friendly: never gory. The body is a landscape, not a textbook cutaway; use cable-like nerves, segmented sheath plates and membrane folds as architecture.

Palette ramps: teal #05090b #101a20 #1d2f38; bone #c9b79a #f2e8d5 #fff8e8; bone shadow #5f736e #7a8f8a #9db4ad; nerve #b8862b #ffd166 #fff3b0; joint #3f9fb5 #7bdff2 #c9f7ff; muscle #a82a4a #ef476f #ff9fb2; sage #6f847d #9db4ad #c4d4ce; ink #000000 #05090b #2a3f47. Use only these ramp steps; no intermediate blends, no unapproved orange.

1024×512, 2:1, one isolated cut-out parallax layer on a flat solid chroma-key magenta #FF00FF field, no frame. The magenta is empty space that will be cut away; it is not part of the artwork. Keep the field one uniform colour to every edge: no grid of squares, no patterned field, no gradient, no vignette, no texture, no lighting, no cast shadow. Every painted shape is opaque and hard-edged, clearly separated from the field; no feathering, no soft glow, no soft haze, and no floating dust, specks or bubbles outside a painted shape. Do not inset the composition or reserve a clean margin: shapes may meet any edge and must continue across it when tiled; the painted shapes and the magenta gaps must both tile seamlessly on all four edges. No magenta or pink inside the painted shapes: no rim light, no highlight, no shadow tint. Every colour block at least 2×2 pixels. Hard pixel edges; no anti-aliasing.
```

**Negative:** `NEGATIVE_BACKGROUND` + `NEGATIVE_PARALLAX` + opaque plate, full-frame wall, bright bone white, high contrast, foreground silhouette, detailed bark, hanging bulbs, canopy, ground, horizon, focal landmark, clean margin, muscle pink, crimson.

**Acceptance**

- Keyed cut-out, not an opaque plate; coverage less than 50%.
- Low contrast, 2–3 value steps; no bone cream or white.
- Distant trunks and sheath plates only; no bulbs, canopy, foreground roots, ground line or horizon.
- No full-frame wall, frame, ring or focal landmark.
- Both-axis 2×2 seam check passes at 2048×1024 and 1280×720.
- No magenta fringe or key colour in the final PNG/WebP; 2×2 clusters; 1024×512; ≤300 KB.

**Visual check:** the painted shapes read as distant trunks; the magenta gaps are large and irregular. A plate that looks like a complete landscape is a failure.

---

### 6.3 `bg.nerve_forest.mid` — mid parallax cut-out

**Reference:** `style-anchor-sky.png` for style/palette only. **Style:** `STYLE_BACKGROUND`. **Frame:** `FRAME_PARALLAX`. **Source:** 1024×512, hard alpha, 2×2 clusters, generated on flat `#FF00FF` and keyed with `npm run art:key` (no trim). **File:** `shared/backgrounds/nerve-forest-mid.webp`.

```text
SUBJECT: A seamless 2:1 mid parallax cut-out layer: branching, tentacle-like nerve twigs; round nerve bulbs hanging like lanterns; wet membrane folds like draped fabric. Medium-contrast deep teal and sage, with a few small nerve-yellow glow accents. The layer is airy: about half the canvas is painted, the rest is flat magenta #FF00FF empty space. The painted clusters are separate, irregular masses that may meet any canvas edge; they do not form a continuous wall, a frame, a ring, a horizon or a ground line. Every glow is a hard-edged dithered halo fully inside a painted shape; no soft bloom into the magenta. No dark near-canopy silhouettes, no foreground roots, no characters, no faces, no labels, no arrows, no unique focal object, no bone-cortex texture. Orthographic side view; the painted shapes and the magenta gaps must both tile on all four edges; soft ambient depth, no single directional light. Use only deep teal, sage, bone-shadow, nerve yellow and joint cyan; no muscle pink, crimson, purple or magenta inside the shapes.

Pixel art for a side-view 2D platformer set inside a living human body. Native pixel grid, hard square pixels, crisp edges, no anti-aliasing, no smoothing. Orthographic side view, landscape scale; atmospheric depth from layered values and dither, not a global gradient; local warm highlights only. Damp membrane sheen, condensation, dust and grime. Gross-cute biology, wry deadpan tone, 12+ friendly: never gory. The body is a landscape, not a textbook cutaway; use cable-like nerves, segmented sheath plates and membrane folds as architecture.

Palette ramps: teal #05090b #101a20 #1d2f38; bone #c9b79a #f2e8d5 #fff8e8; bone shadow #5f736e #7a8f8a #9db4ad; nerve #b8862b #ffd166 #fff3b0; joint #3f9fb5 #7bdff2 #c9f7ff; muscle #a82a4a #ef476f #ff9fb2; sage #6f847d #9db4ad #c4d4ce; ink #000000 #05090b #2a3f47. Use only these ramp steps; no intermediate blends, no unapproved orange.

1024×512, 2:1, one isolated cut-out parallax layer on a flat solid chroma-key magenta #FF00FF field, no frame. The magenta is empty space that will be cut away; it is not part of the artwork. Keep the field one uniform colour to every edge: no grid of squares, no patterned field, no gradient, no vignette, no texture, no lighting, no cast shadow. Every painted shape is opaque and hard-edged, clearly separated from the field; no feathering, no soft glow, no soft haze, and no floating dust, specks or bubbles outside a painted shape. Do not inset the composition or reserve a clean margin: shapes may meet any edge and must continue across it when tiled; the painted shapes and the magenta gaps must both tile seamlessly on all four edges. No magenta or pink inside the painted shapes: no rim light, no highlight, no shadow tint. Every colour block at least 2×2 pixels. Hard pixel edges; no anti-aliasing.
```

**Negative:** `NEGATIVE_BACKGROUND` + `NEGATIVE_PARALLAX` + opaque plate, full-frame wall, bone-cortex texture, foreground canopy, ground, horizon, focal landmark, clean margin, muscle pink, crimson.

**Acceptance**

- Keyed cut-out; coverage 35–55%.
- Medium contrast; branching twigs, bulbs and folds read.
- No bone-cortex texture that fights the runtime overlay.
- No dark near-canopy silhouettes, full-frame wall or ground line.
- Glows are contained; no bloom into the magenta.
- Both-axis 2×2 seam check passes; no magenta fringe; 2×2 clusters; 1024×512; ≤300 KB.

**Visual check:** the layer reads as a damp nerve forest; the gaps are large enough to see the far and sky through it.

---

### 6.4 `bg.nerve_forest.near` — near parallax cut-out

**Reference:** `style-anchor-sky.png` for style/palette only. **Style:** `STYLE_BACKGROUND`. **Frame:** `FRAME_PARALLAX`. **Source:** 1024×512, hard alpha, 2×2 clusters, generated on flat `#FF00FF` and keyed with `npm run art:key` (no trim). **File:** `shared/backgrounds/nerve-forest-near.webp`.

```text
SUBJECT: A seamless 2:1 near parallax cut-out layer: a sparse overhead canopy of dark fibrous cable-like roots, wet membrane sacs like balloons, and membrane folds like draped fabric. The clusters hang from the top edge and upper corners, with a few disconnected clumps at the left and right edges and short hanging tendrils. Deep teal and ink silhouettes only; two value steps; high contrast; occasional small nerve-yellow glow fully inside a shape. Keep at least two-thirds of the canvas flat magenta #FF00FF empty space, with the lower half almost entirely empty, so the player and platforms stay visible. The painted clusters are disconnected; do not connect them into a continuous frame, ring, window or border around the empty centre. No distant haze, no mid-layer bulbs, no characters, no faces, no labels, no arrows, no unique focal object, no opaque band across the play area. Orthographic side view; the painted shapes and the magenta gaps must both tile on all four edges. Use only deep teal, sage, bone-shadow, nerve yellow and ink; no muscle pink, crimson, purple or magenta inside the shapes.

Pixel art for a side-view 2D platformer set inside a living human body. Native pixel grid, hard square pixels, crisp edges, no anti-aliasing, no smoothing. Orthographic side view, landscape scale; atmospheric depth from layered values and dither, not a global gradient; local warm highlights only. Damp membrane sheen, condensation, dust and grime. Gross-cute biology, wry deadpan tone, 12+ friendly: never gory. The body is a landscape, not a textbook cutaway; use cable-like nerves, segmented sheath plates and membrane folds as architecture.

Palette ramps: teal #05090b #101a20 #1d2f38; bone #c9b79a #f2e8d5 #fff8e8; bone shadow #5f736e #7a8f8a #9db4ad; nerve #b8862b #ffd166 #fff3b0; joint #3f9fb5 #7bdff2 #c9f7ff; muscle #a82a4a #ef476f #ff9fb2; sage #6f847d #9db4ad #c4d4ce; ink #000000 #05090b #2a3f47. Use only these ramp steps; no intermediate blends, no unapproved orange.

1024×512, 2:1, one isolated cut-out parallax layer on a flat solid chroma-key magenta #FF00FF field, no frame. The magenta is empty space that will be cut away; it is not part of the artwork. Keep the field one uniform colour to every edge: no grid of squares, no patterned field, no gradient, no vignette, no texture, no lighting, no cast shadow. Every painted shape is opaque and hard-edged, clearly separated from the field; no feathering, no soft glow, no soft haze, and no floating dust, specks or bubbles outside a painted shape. Do not inset the composition or reserve a clean margin: shapes may meet any edge and must continue across it when tiled; the painted shapes and the magenta gaps must both tile seamlessly on all four edges. No magenta or pink inside the painted shapes: no rim light, no highlight, no shadow tint. Every colour block at least 2×2 pixels. Hard pixel edges; no anti-aliasing.
```

**Negative:** `NEGATIVE_BACKGROUND` + `NEGATIVE_PARALLAX` + continuous frame, ring, window, border, opaque centre, opaque band, bottom-heavy canopy, mid-layer bulbs, distant haze, clean margin, muscle pink, crimson.

**Acceptance**

- Keyed cut-out; coverage 33% or less; the lower half is almost entirely empty.
- Dark teal and ink silhouettes; two value steps; high contrast.
- Overhead clumps and edge tendrils only; disconnected; no continuous frame, ring, window or border.
- No distant haze, mid-layer bulbs or opaque band across the play area.
- Both-axis 2×2 seam check passes; no magenta fringe; 2×2 clusters; 1024×512; ≤300 KB.

**Visual check:** the clusters read as an overhead canopy, not a picture frame. The lower half of the canvas is clear enough that the player and platforms remain visible.

---

## 7. Key workflow

### 7.1 Generate

1. Generate the plate at the requested aspect (2:1 for parallax; wide for sky).
2. Keep the full-resolution JPEG/PNG in `art-source/nanobanan/new/`.
3. Confirm the parallax plate is 2:1. If the generator returns 16:9 or square, crop to 2:1 before keying or regenerate; do not squash it to 1024×512.
4. Do not manually paint a checkerboard or an alpha grid. If the plate has one, reject it.
5. Do not generate a composite of all four layers.

### 7.2 Key the parallax plate

Key at full resolution, before pixel cleanup and quantisation. Keep the full 1024×512 canvas; **do not pass `--trim`**. The example path below assumes a generated 2:1 plate.

```bash
npm run art:key -- \
  --in art-source/nanobanan/new/bg-nerve_forest-far-2x1.jpeg \
  --out art-source/nanobanan/keyed/bg-nerve_forest-far.png \
  --key "#ff00ff" --tolerance 0.18 --softness 0.08 \
  --preview art-source/previews/nanobanan/backgrounds/bg-nerve_forest-far-keyed.png \
  --preview-width 1024 --background "#101a20" \
  --report art-source/nanobanan/reports/bg-nerve_forest-far.key.json
```

The defaults are tuned for the generated JPEGs: tolerance 0.18, softness 0.08, alpha threshold 0.5, despill on. If the plate has a soft or noisy edge, raise `--tolerance` before lowering `--alpha-threshold`; the latter trades fringe for holes in the painted shapes.

### 7.3 Inspect

- Open the keyed PNG at 400% on `#101a20` and over the approved sky.
- The magenta field must be fully transparent; no pink fringe, no dark magenta halo.
- The painted shapes must be hard-edged; no semi-transparent pixels.
- The key report's keyed/kept counts must give the expected coverage (far <50%, mid 35–55%, near ≤33%).
- Coverage of 80–100% means the plate was opaque; reject it.
- A high `edgePixels` or `despilledPixels` count means the plate had soft edges or magenta spill; inspect and reject if the fringe survives.

### 7.4 Pixel cleanup and export

1. Quantise the keyed plate to the §4.2 ramps.
2. Enforce the 2×2 minimum cluster grid.
3. Remove 1 px alpha islands and stray specks.
4. Export at 1024×512 with hard alpha as lossless WebP or PNG. If the source is larger, downscale with nearest-neighbour first, then enforce the 2×2 clusters.
5. Do not trim, crop, rotate or resample the **keyed** plate with bilinear filtering. Aspect cropping happens before keying, in §7.1.
6. Do not ship the raw Ludo JPEG or the keyed review PNG.
7. Keep the key report with the asset.

### 7.5 Sky export

The sky is not keyed. The generator may return 16:9; crop to the 640×368 aspect (about 1.74:1), then resize to 640×368 rather than stretching. Export opaque, lossless WebP or PNG, then verify the integer 2× cover at 1280×736 and the 16:9 crop at 1280×720. It must contain no magenta and no checkerboard.

---

## 8. Acceptance

### 8.1 Per-asset acceptance

| Asset | Must pass |
|---|---|
| Sky | 640×368 opaque; quiet distant haze; no foreground trunk, canopy, drape, edge silhouette or frame; HUD and player silhouettes read at 1280×720; no hard horizon at player height; no magenta/checkerboard; 03 palette only; ≤300 KB |
| Far | Keyed cut-out; coverage <50%; low contrast, 2–3 value steps; no bone cream/white; distant trunks and sheath plates only; no full-frame wall, bulbs, canopy, ground or horizon; both-axis seam; no magenta fringe; 2×2 clusters; 1024×512; ≤300 KB |
| Mid | Keyed cut-out; coverage 35–55%; medium contrast; branching twigs, bulbs and folds; no bone-cortex texture; no dark near-canopy silhouettes or full-frame wall; contained glows; both-axis seam; no magenta fringe; 2×2 clusters; 1024×512; ≤300 KB |
| Near | Keyed cut-out; coverage ≤33%; lower half almost entirely empty; dark teal/ink, two value steps; overhead clumps and edge tendrils; no continuous frame, ring, window or border; no opaque band; both-axis seam; no magenta fringe; 2×2 clusters; 1024×512; ≤300 KB |

### 8.2 Stack acceptance

- Composite sky + far + mid + near at 1280×720 and at the 1280×736 room size.
- The stack reads as four depths: distant haze, far trunks, mid branches/bulbs, near overhead clumps.
- The near layer does not obscure the play band or the player silhouettes.
- No layer's signature content appears in another layer (no foreground trunk in the sky, no bulbs in the far, no near canopy in the mid).
- No transparent gutters or visible seams at tile boundaries.
- The HUD and player remain readable.
- The palette is consistent across the four plates.

### 8.3 Technical QA

- Keyed before quantisation; no `#FF00FF` remains in the final PNG/WebP.
- Alpha is 0/255; no semi-transparent pixels.
- Parallax plates are not trimmed; the 1024×512 canvas is intact.
- Every colour block is at least 2×2 pixels.
- Lossless WebP or PNG; no JPG or lossy WebP.
- No raw Ludo JPEG is referenced by a manifest or served from `public/`.
- Key reports exist for far/mid/near and record source size, key, tolerance and edge/despill counts; coverage is derived from the keyed/kept counts.
- Two-axis 2×2 repeat passes at 2048×1024 and 1280×720.
- The sky is opaque and contains no key colour.
- The 03 palette guard is respected: no muscle pink, crimson, purple or unapproved orange.

### 8.4 Content QA

- No blood, gore, open wounds, viscera or shock imagery.
- No religious, sexual or toilet humour.
- No copied characters or copyrighted props.
- No labels, arrows or diagram lines baked into the art.
- The body reads as a place, not a textbook cutaway.
- The 12+ audience is respected.

### 8.5 Sign-off checklist

**Current M3 sign-off:** only the sky line is a current capture blocker. The far/mid/near lines apply when the deferred layers are regenerated and brought into scope.

- [ ] Sky approved at 1280×720 and 1280×736 cover. *(current)*
- [ ] Far keyed, coverage checked, both-axis seam checked. *(deferred)*
- [ ] Mid keyed, coverage checked, both-axis seam checked; runtime bone-cortex overlay checked. *(deferred)*
- [ ] Near keyed, coverage checked, lower half clear, no continuous frame. *(deferred)*
- [ ] Four-layer stack approved at 1280×720. *(future)*
- [ ] No checkerboard or magenta fringe in any plate; no semi-transparent alpha in the parallax layers.
- [ ] Key reports and prompt log complete.
- [ ] Licences recorded.
- [ ] Files exported to `public/packs/anatomy-reflex/shared/backgrounds/`.
- [ ] Raw sources remain in `art-source/` and are not referenced by the manifest.

---

## 9. Prompt log

Record every background generation attempt. Keep failed rows; add a new row for each retry.

| Field | Example |
|---|---|
| Prompt version | `m3-2026-11-01.1` |
| Style version | `style-pixel-v2` |
| Asset ID | `bg.nerve_forest.far` |
| Layer role | far; low contrast; <50% coverage |
| Subject block | `SUBJECT: A seamless 2:1 far parallax cut-out layer...` |
| Key field | `#FF00FF` |
| Key report | `art-source/nanobanan/reports/bg-nerve_forest-far.key.json` |
| Prompt order | `SUBJECT → STYLE_BACKGROUND → PALETTE → FRAME_PARALLAX` |
| Tool and plan | Ludo.ai / Indie |
| Model and seed | Ludo image model; seed `...` |
| Reference | `style-anchor-sky.png` for style/palette only |
| Negative block | `NEGATIVE_BACKGROUND + NEGATIVE_PARALLAX` |
| Negative delta | `opaque plate, full-frame wall, hanging bulbs, muscle pink, crimson` |
| Prompt | Full positive prompt text |
| Frame block | `FRAME_PARALLAX` / `FRAME_SKY` |
| Aspect and source | 2:1 / 1024×512; sky 640×368 |
| Variations | 4 |
| Chosen file | `shared/backgrounds/nerve-forest-far.webp` |
| Runtime export | `public/packs/anatomy-reflex/shared/backgrounds/nerve-forest-far.webp` |
| Date | 2026-11-04 |
| Keying | Keyed full-frame with `art:key`; no trim; coverage `...%`; edge/despill counts `...` |
| Pixel cleanup | Quantised; 2×2 clusters; alpha islands removed |
| Grid check | 2×2 repeat at 2048×1024 and 1280×720 |
| Stack check | Four-layer composite at 1280×720 |
| Verdict | Approved / retry / placeholder |
| Licence | `Ludo AI Commercial (paid)` |
| Notes | Reason for retry; one variable changed |

Copy-paste row template:

```text
| m3-2026-11-01.1 | style-pixel-v2 | asset.id | layer-role | subject-block | #FF00FF | key-report | subject→style→palette→frame | Ludo/Indie | model/seed | reference | negative-block | negative-delta | prompt | frame-block | aspect/source | variations | chosen-file | runtime-export | date | keying | pixel-cleanup | grid-check | stack-check | verdict | licence | notes |
```

---

## 10. Risks and stop rules

### 10.1 Risks

| Risk | Mitigation |
|---|---|
| Generator paints a checkerboard or an opaque scene | Use the flat `#FF00FF` cut-out prompt; never write “transparent”; reject the plate; key before cleanup |
| Magenta fringe or pink spill | Key at full resolution with despill; inspect 400% on `#101a20` and over the sky; reject soft-glow plates; manual cleanup |
| Key field is gradient or shaded | Demand one flat uniform field; a gradient is not deterministically keyable; reject and regenerate |
| Near layer repeats as a window | Sparse overhead clumps, disconnected, lower half clear, no continuous frame; 2×2 check at 1280×720 |
| Transparent gutter at tile seam | No clean margin; shapes cross edges; the magenta gaps tile too; inspect the 2×2 repeat |
| Sky is too busy or too close | Distant-only prompt; no foreground trunk, canopy or drape; approve for quietness, not detail |
| Palette drift or pink drapes | 03 guard: no muscle pink/crimson; quantise after keying; check the ramp histogram |
| Despill shifts pink/red art | 03 has no muscle pink; for a future level with strong pinks, switch to a green key and record it |
| Layers generated as one composite | One prompt per layer; no contact sheet; reject any plate that contains another layer's signature content |
| Key report shows 80–100% coverage | The plate is opaque; reject it before pixel cleanup |
| Raw JPEG shipped | Keep `art-source/` out of `public/`; validate that manifests never reference raw sources |
| 04 backgrounds accidentally included | 04 backgrounds are out of scope; keep `bg.muscle_endplate.*` placeholder |

### 10.2 Stop rules

- Maximum **three attempts** per plate on the free tier; **two prompt revisions** on paid.
- If a plate comes back opaque or checkerboarded, fix the prompt to use `FRAME_PARALLAX` and the layer contract. Do not iterate on the art.
- If the fringe survives keying, reject the plate; do not ship a magenta halo.
- If the near layer keeps producing a window frame, reduce it to fewer, more scattered clumps.
- If the sky stays busy after two attempts, simplify it; the layers cannot fix a foreground-heavy sky.
- If the style gate fails, ship the placeholder layers. A coherent placeholder stack is better than a broken final stack.
- If a background needs new renderer behaviour, stop; it is an engine task, not an art task.

---

## 11. Versioning and change log

| Date | Change |
|---|---|
| 2026-11-01 | Initial dedicated background requirements. Supersedes the background prompts in `asset-requirements-v01.md`. Sky is opaque; far/mid/near are `#FF00FF` cut-outs keyed with `art:key`; adds the layer contract, coverage/value budgets, `NEGATIVE_PARALLAX`, key workflow, acceptance checks and prompt log. Prompt version `m3-2026-11-01.1`; style version `style-pixel-v2`; doc v0.1. Does **not** re-baseline the current M3 scope: the sky remains the only wired 03 background, and far/mid/near remain source-only/deferred until regenerated and accepted. |

---

## 12. References

- [`asset-requirements-v01.md`](asset-requirements-v01.md) — shared sprites, atlases, badge, audio and the main M3 scope.
- [`room.json`](../../public/packs/anatomy-reflex/levels/03-nerve-forest/room.json) — background layer order, fit, parallax, depth and overlays.
- [`background.ts`](../../src/world/background.ts) — `cover` and `TileSprite` behaviour, integer sky scale, tile position rounding.
- [`art-key.ts`](../../scripts/art-key.ts) — chroma-key CLI, tolerance, softness, despill, report.
- [`key.ts`](../../scripts/art/key.ts) — RGB-distance key, hard alpha, despill, alpha bounds.
- [`art-source/nanobanan/README.md`](../../art-source/nanobanan/README.md) — concept plates, key/fit workflow and POC status.
- [`art-source/nanobanan/new/`](../../art-source/nanobanan/new/) — the failed background plates; reference only, never ship.
- [`art-source/nanobanan/reports/`](../../art-source/nanobanan/reports/) — key and fit reports.
- [`adr-m3/0047-pixel-art-visual-direction.md`](../adr-m3/0047-pixel-art-visual-direction.md) — pixel-art direction.
- [`adr-m3/0048-half-resolution-pixel-rendering.md`](../adr-m3/0048-half-resolution-pixel-rendering.md) — half-res authoring and 2× display.
- [`base-game/adr/0031-layered-background-composition.md`](../shrinkonauts/base-game/adr/0031-layered-background-composition.md) — layered background composition.
- [`adr-art-pipeline/0060-source-work-runtime-asset-layers.md`](../adr-art-pipeline/adr-0060-source-work-runtime-asset-layers.md) — source/working/runtime asset layers.
- [`adr-art-pipeline/0063-build-time-animation-previews.md`](../adr-art-pipeline/adr-0063-build-time-animation-previews.md) — build-time previews.
- [`adr-art-pipeline/0065-p2-bone-suit-joint-visor.md`](../adr-art-pipeline/adr-0065-p2-bone-suit-joint-visor.md) — current palette/role map.

---

**End of document.**
