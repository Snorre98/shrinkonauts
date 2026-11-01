# M3 Background Asset Requirements — Shrinkonauts: The Reflex Arc

**Status:** Draft v0.3 · 1 November 2026 (pretty sky-only runtime; layered stack retained as the future target)
**Owner:** Snorre  
**Scope:** The `03-nerve-forest` background: the pretty sky plate in the current runtime, plus the future sky/far/mid/near layered target<br>
**Supersedes:** The background prompts and background pipeline notes in [`asset-requirements-v01.md`](asset-requirements-v01.md): §5.4 background status note, §6.2/§6.4 background notes, §7.3 background setting, §7.7–§7.8 background checks, §8.7/§8.13/§8.20 and the background rows in §9. The current M3 build wires only the pretty sky; far/mid/near remain the future layered target and are not shipped as runtime layers.<br>
**Governing decisions:** ADR-0031 (layered backgrounds), ADR-0047 (pixel-art direction), ADR-0048 (2× pixel rendering), ADR-0060–0065 (source/working/runtime pipeline, palette variants, previews)  
**Related:** [`asset-requirements-v01.md`](asset-requirements-v01.md) · [`room.json`](../../public/packs/anatomy-reflex/levels/03-nerve-forest/room.json) · [`background.ts`](../../src/world/background.ts) · [`art-key.ts`](../../scripts/art-key.ts) · [`art-source/nanobanan/README.md`](../../art-source/nanobanan/README.md)

> **The rule for backgrounds:** the generator cannot paint alpha. The sky is generated **opaque**. Far, mid and near are generated as **cut-out plates on a flat `#FF00FF` chroma-key field**, then keyed with `npm run art:key`. Never write “transparent” in a background prompt; the generator will paint a checkerboard or an opaque scene.

> **Current M3 status (2026-11-01).** The 03 room wires **only** the pretty `bg.nerve_forest.sky` plate: the tracked 2752×1536 source cropped to 2672×1536, Lanczos-downscaled to **1280×736** and displayed at **1×** cover. The plate is exported as lossless WebP at 978,732 bytes (~956 KiB), is **not palette-quantised**, and intentionally keeps the muscle-pink drapes and bone highlights. It is a recorded exception to the pixel-art palette guard, the half-res 2× sky rule and the ≤300 KB pixel-asset budget. The room has no `nerve-fibers` overlay. `bg.nerve_forest.far`, `.mid` and `.near` are declared placeholders/future work; their runtime WebPs are not shipped. Near's play-band repeat remains unresolved.

---

## 0. Summary

| Decision | Value |
|---|---|
| Background assets | **4 defined** — current runtime: pretty sky only; far/mid/near are placeholders/future work |
| Sky | **1280×736**, opaque, **1× cover**; pretty plate POC integrated; no palette quantisation |
| Parallax layers | **1024×512 target**, hard alpha, 2×2 clusters, tile on both axes; far/mid/near not wired |
| Key colour | **`#FF00FF`** — for the future far/mid/near cut-outs only |
| Key tool | **`npm run art:key`**, full frame, **no `--trim`** — future layers only |
| Near layer | **Sparse overhead clumps**; lower half clear; no continuous frame; future target; play-band repeat unresolved |
| 03 palette | Deep teal, sage, bone-shadow, nerve yellow, joint cyan; **recorded exception:** the pretty sky retains muscle pink |
| Prompt version | **`m3-2026-11-01.1`** (future layered prompts) |
| Style version | **`style-pixel-v2`** |
| Doc version | **v0.3** |

> **Why the older parallax plates failed.** The older `art-source/nanobanan/new/bg-nerve_forest-far.jpeg` and `bg-nerve_forest-mid.jpeg` are fully opaque scenes. The older `bg-nerve_forest-near.jpeg` contains a literal grey/white checkerboard. They are failed references for cut-out layers, not salvageable layers. The older `bg.nerve_forest.sky.jpeg` is a complete scene with foreground trunks and pink drapes; it is not a quiet layered sky, but it is the chosen **pretty single-plate background** for the current runtime.
>
> **What changed.** The current runtime uses the pretty single plate at 1280×736/1×. The layered prompts below describe **one cut-out layer per image**, with a flat chroma-key field, explicit layer separation, coverage and value budgets, and a deterministic keying step. They remain the future target; far/mid/near are not wired.

---

## 1. Scope contract

### 1.1 Asset register

| Asset ID | Type | Source size | Fit | Status | File |
|---|---|---|---|---|---|
| `bg.nerve_forest.sky` | Background | 1280×736, opaque | cover, 1× | **Pretty POC integrated**; final approval pending | `shared/backgrounds/nerve-forest-sky.webp` |
| `bg.nerve_forest.far` | Parallax layer (future) | 1024×512 target, hard alpha | tile both axes | **Placeholder/future**; not wired | — (no runtime file) |
| `bg.nerve_forest.mid` | Parallax layer (future) | 1024×512 target, hard alpha | tile both axes | **Placeholder/future**; not wired | — (no runtime file) |
| `bg.nerve_forest.near` | Parallax layer (future) | 1024×512 target, hard alpha | tile both axes | **Placeholder/future** (play-band repeat unresolved) | — (no runtime file) |

Runtime files live under `public/packs/anatomy-reflex/shared/backgrounds/`. The current `room.json` wires only the pretty sky; far/mid/near sources, key reports and previews remain under `art-source/` for a later pass.

### 1.2 Out of scope

- `bg.muscle_endplate.*` and all `04-muscle-effector` backgrounds — placeholder art in M3.
- Levels `01-bone-gate`, `02-joint-chamber`, `05-reflex-core` and the Silicon fixture.
- Music, ambience and background animation.
- Any engine change beyond the recorded pixel-render settings in ADR-0048.
- Any new background asset ID.

### 1.3 Relationship to the main asset document

This document is the **source of truth for the background prompts and key workflow**. The shared sprite, atlas, badge and audio requirements remain in [`asset-requirements-v01.md`](asset-requirements-v01.md). Where the two documents disagree about how a background plate is generated, this document wins.

The main document remains the source of truth for **current M3 scope and status**: the pretty sky is the only wired 03 background, and far/mid/near are placeholders/future work. If the layered stack is revisited, update the main document's summary, §2.2 and §5.4 in the same change. Do not silently expand the M3 capture scope from this document alone.

---

## 2. Runtime constraints

These facts come from the current pack and renderer. Do not “fix” them in export.

| Constraint | Evidence | Consequence |
|---|---|---|
| The room is **1280×736** (40×23 tiles at 32 px) | `room.json` | The sky must cover 1280×736 before the 16:9 capture crop. |
| The capture viewport is **1280×720** | `src/world/create-game.ts` (`VIEWPORT`) | The 16:9 capture crops 16 px of room height. |
| The sky is displayed by `fit: "cover"` with an integer snap | `background.ts` (`cover` branch), `room.json` | The current 03 sky is **1280×736 → 1×**. The same snap also supports 640×368 → 2×. No fractional scale. |
| Far/mid/near are `TileSprite`s with `fit: "tile"` | `background.ts` | Future target: author **1024×512**; tile on **both axes**. They are not in `room.json` now. |
| Sky parallax is **0.05 / 0.02**, depth −40 | `room.json` | The current pretty sky is almost static. It is the only background layer. |
| Far parallax is **0.20 / 0.10**, depth −30 | future target | Large, slow, low-contrast shapes. |
| Mid parallax is **0.45 / 0.20**, depth −20 | future target | Branching structures and bulbs; medium contrast. |
| Near parallax is **0.75 / 0.35**, depth −10, opacity **0.9** | future target | Dark, sparse overhead clumps; keep the play band clear. |
| The sky currently has **no pattern overlay** | `room.json` | The 0.14 `nerve-fibers` overlay was removed so the detailed plate is not textured twice. |
| The mid receives a **bone-cortex** pattern overlay at 0.12 | future target | Do not bake a bone-cortex texture into a future mid plate. |
| Parallax textures are sampled 1:1 | `background.ts` | Future layers: every colour block must be at least **2×2 pixels**. |
| Pixel mode uses nearest-neighbour sampling | ADR-0048 | The pretty sky is displayed 1:1, so it is unaffected. Future pixel layers use no anti-aliasing, no soft edges, no fractional placement. |
| Alpha is hard 0/255 for pixel assets | ADR-0048, main §6.3 | The sky is opaque. Future parallax layers must have no semi-transparent pixels. |
| Lossy compression creates colour noise | main §6.1 | Final export is lossless WebP or PNG, never JPG. |
| Per-asset budget is ≤300 KB | main §6.6 | Applies to pixel assets and future parallax layers. **Recorded exception:** the pretty 1280×736 sky is 978,732 bytes (~956 KiB) lossless WebP; it is not palette-quantised. |

---

## 3. Layer contract

### 3.1 The four layers

This is the **target contract** for the future layered 03 background stack. The current M3 build wires only the pretty sky; far/mid/near are not wired. Their rows remain the target for a play-band-safe regeneration or a manual tile repair.

| Layer | Fit / parallax | Key field | Painted coverage | Value | Role |
|---|---|---|---:|---|---|
| `sky` | cover 2×; 0.05 / 0.02 | **none — opaque** | full frame, quiet | darkest, low contrast | Future quiet-sky target: distant haze and value base. No foreground shapes. |
| `far` | tile; 0.20 / 0.10 | **`#FF00FF`** | **less than half** | low contrast, 2–3 steps | Distant giant trunks and segmented sheath plates. |
| `mid` | tile; 0.45 / 0.20 | **`#FF00FF`** | **about half** | medium contrast | Branching twigs, hanging bulbs and membrane folds. |
| `near` | tile; 0.75 / 0.35 | **`#FF00FF`** | **at least two-thirds empty** | dark, high contrast, 2 steps | Sparse overhead clumps and edge tendrils; lower half clear. |

> **Current runtime sky exception.** The current 03 sky is the pretty **1280×736** plate at **1×**, not the quiet 640×368/2× sky in this table. The table's sky row describes the future layered target. The pretty plate intentionally contains foreground trunks, pink drapes and bone highlights; it is not a quiet distant sky.

### 3.2 Layer separation

- **Sky (future quiet-sky target):** only distant, low-contrast forms. No foreground trunk, canopy, drape, frame, edge silhouette or object that appears close to the viewer. The current pretty plate is the recorded exception and intentionally contains foreground trunks and drapes.
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

**Measured 2026-11-01 (exact 2× crops):** far 46.0%, mid 50.7%, near 23.9%. All three pass the numeric coverage budget. Near still fails the play-band read because the 1024×512 tile repeats vertically at screen y≈512.

### 3.5 Tiling rules

- Far/mid/near tile **horizontally and vertically** in Phaser's `TileSprite`.
- Verify with a 2×2 repeat at **2048×1024** (native) and at **1280×720** (runtime).
- Avoid a single strong landmark that repeats obviously.
- A clean magenta margin at the canvas edge becomes a transparent gutter at the tile seam. Reject it.
- Do not trim a parallax plate. Keep the 1024×512 canvas so layer registration and tile phase stay fixed.
- The 2026-11-01 pass uses a deterministic **2 px edge weld**: opposite edges receive the same RGBA values (alpha union + palette colour from the denser side), and the whole plate is snapped to a 2×2 cluster grid. This makes the edges pixel-identical, but it does not hand-repaint the composition across the seam. The 2×2 composition repeat remains a visual-review note.
- The sky is not tiled. The current pretty plate uses **1× cover at 1280×736**; the future quiet-sky target uses integer 2× at 640×368.

### 3.6 03 palette guard

> **Recorded exception — current pretty sky.** The single opaque `bg.nerve_forest.sky` plate is used unquantised and intentionally retains the muscle-pink drapes and bone highlights. It is exempt from the 03 background palette guard and from the ≤300 KB pixel-asset budget. Do not run `art:normalize` or `palette.nerve-forest-sky.json` on it. The exception applies **only** to this single plate; far/mid/near (future), sprites, atlases and UI remain under the normal guard.

The 03 colour script is **deep teal, nerve yellow and electric cyan**, supported by sage and bone-shadow. The future layered background stack uses:

- Teal ramp for darkness and depth.
- Sage and bone-shadow ramps for muted tissue and distant structure.
- Nerve ramp for signals and small glow accents.
- Joint ramp for cool edge light.
- Ink for the darkest near silhouettes.

**Not allowed in the future layered background stack:** muscle pink, crimson, purple, neon green, unapproved orange, pure red. The current pretty sky is the sole exception and retains its pink drapes. The far/mid/near layer palette has no `tissue` role, so muscle pink/crimson cannot enter the future cut-out stack.

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

**Current status:** pretty POC integrated; final approval pending. The runtime plate is the tracked 2752×1536 source, cropped to 2672×1536 (40 px each side), Lanczos-downscaled to 1280×736 and exported as lossless WebP at 978,732 bytes (~956 KiB). It is displayed at 1× cover, is not palette-quantised, and intentionally retains the muscle-pink drapes and bone highlights. No pattern overlay is applied. Previews: `nerve-forest-sky-pretty-1280x736.png` and `-1280x720.png`.

**Source:** 1280×736, opaque, 1× cover. **File:** `shared/backgrounds/nerve-forest-sky.webp`. **Export:** §7.5.

**Current acceptance**

- At 1280×720 and 1280×736, HUD text and player silhouettes read.
- The full composition is preserved except the 40 px side crop; the 16:9 capture crops 8 px top/bottom.
- No checkerboard, key field or alpha.
- No additional lossy compression; lossless WebP/PNG only.
- No palette quantisation; the muscle-pink drapes and bone highlights are intentionally retained.
- File size is reported and recorded as the exception: 978,732 bytes (~956 KiB) at the time of writing.
- No `nerve-fibers` overlay.

**Current visual check:** the plate reads as the intended pretty nerve forest. If player silhouettes or HUD readability fail, stop and ask before tinting/darkening or changing engine behaviour.

#### Future quiet-sky prompt (not the current runtime plate)

The prompt below describes the future layered-stack sky (640×368 at 2× cover). It is retained as a target and must not be used to regenerate the current pretty plate.

**Reference:** none; this creates `style-anchor-sky.png`. **Style:** `STYLE_BACKGROUND`. **Frame:** `FRAME_SKY`. **Source:** 640×368, opaque, integer 2× cover. **File:** future only.

```text
SUBJECT: A wide, opaque background plate: the interior of a living body as a damp nerve forest at night, seen from far away. Deep teal darkness; distant, low-contrast cable-like nerve trunks, like giant roots, receding in dither haze; segmented sheath plates, like stacked roof tiles, small and hazy in the distance; a faint nerve-yellow glow low in the distance; floating dust and condensation. Everything here is distant and quiet: no foreground trunk, no canopy, no drape, no framing element, no large dark silhouette at the edges, no object that appears close to the viewer. No characters, no creatures, no labels, no arrows. Orthographic side view, soft atmospheric depth from layered values and dither, no single directional light, no hard horizon line at player height. Use only deep teal, sage, bone-shadow, nerve yellow and joint cyan; no muscle pink, crimson, purple or magenta. Keep the upper corners and lower third dark and low-contrast for HUD and player silhouettes; keep important detail inside the central 70% for the 2× cover crop.

Pixel art for a side-view 2D platformer set inside a living human body. Native pixel grid, hard square pixels, crisp edges, no anti-aliasing, no smoothing. Orthographic side view, landscape scale; atmospheric depth from layered values and dither, not a global gradient; local warm highlights only. Damp membrane sheen, condensation, dust and grime. Gross-cute biology, wry deadpan tone, 12+ friendly: never gory. The body is a landscape, not a textbook cutaway; use cable-like nerves, segmented sheath plates and membrane folds as architecture.

Palette ramps: teal #05090b #101a20 #1d2f38; bone #c9b79a #f2e8d5 #fff8e8; bone shadow #5f736e #7a8f8a #9db4ad; nerve #b8862b #ffd166 #fff3b0; joint #3f9fb5 #7bdff2 #c9f7ff; muscle #a82a4a #ef476f #ff9fb2; sage #6f847d #9db4ad #c4d4ce; ink #000000 #05090b #2a3f47. Use only these ramp steps; no intermediate blends, no unapproved orange.

640×368, wide, opaque, edge-to-edge background plate, no frame. This is the base layer: do not use magenta, a chroma-key field, or a grid of squares. Keep the upper corners and lower third dark and low-contrast; keep important detail inside the central 70% for the 2× cover crop. Hard pixel edges; no anti-aliasing.
```

**Negative:** `NEGATIVE_BACKGROUND` + foreground trunk, canopy, drape, edge silhouette, framing element, magenta key field, checkerboard, transparency grid, bright bone-white highlights, high-contrast centre, muscle pink, crimson.

**Future acceptance**

- At the 1280×720 cover crop, HUD text and player silhouettes read.
- No foreground trunk, canopy, drape, edge silhouette or framing element.
- No hard horizon at player height; no characters, text, labels or arrows; no single focal landmark.
- No magenta, key field, checkerboard or grid.
- Palette restricted to teal, sage, bone-shadow, nerve and joint; no muscle pink or crimson.
- 640×368, opaque, lossless WebP/PNG, ≤300 KB.

**Future visual check:** reads as a quiet, distant backdrop. It must look empty enough to sit behind three more layers.

---

### 6.2 `bg.nerve_forest.far` — far parallax cut-out

**Current status:** placeholder/future; not wired. The processed plate was cropped to 2048×1024 at (432,416), keyed at full resolution, nearest-downscaled to 1024×512, quantised and 2 px edge-welded. Coverage 46.0% keyed / 46.5% final; alpha 0/255; 12 colours. The source, key report and preview are retained for a later layered pass. **Reference:** `style-anchor-sky.png` for style/palette only. **Style:** `STYLE_BACKGROUND`. **Frame:** `FRAME_PARALLAX`. **Source:** 1024×512 target, hard alpha, 2×2 clusters, generated on flat `#FF00FF` and keyed with `npm run art:key` (no trim). **File:** future only (no runtime file).

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

**Current status:** placeholder/future; not wired. The processed plate was cropped to 2048×1024 at (432,208), keyed at full resolution, nearest-downscaled to 1024×512, quantised and 2 px edge-welded. Coverage 50.7% keyed / 51.7% final; alpha 0/255; 16 colours. The future mid keeps the bone-cortex overlay target; it is not in the current room. **Reference:** `style-anchor-sky.png` for style/palette only. **Style:** `STYLE_BACKGROUND`. **Frame:** `FRAME_PARALLAX`. **Source:** 1024×512 target, hard alpha, 2×2 clusters, generated on flat `#FF00FF` and keyed with `npm run art:key` (no trim). **File:** future only (no runtime file).

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

**Current status:** placeholder/future; **deferred**. The processed plate was cropped to 2048×1024 at (432,208), keyed, nearest-downscaled to 1024×512, quantised and 2 px edge-welded. Coverage 23.9%; alpha 0/255; 9 colours; the lower half is clear. It still fails the play-band read: the 1024×512 tile repeats vertically at screen y≈512, so the hanging canopy lands across the player/platform band. Preview: `background-near-over-sky-1280x736.png`. **Reference:** `style-anchor-sky.png` for style/palette only. **Style:** `STYLE_BACKGROUND`. **Frame:** `FRAME_PARALLAX`. **Source:** 1024×512 target, hard alpha, 2×2 clusters, generated on flat `#FF00FF` and keyed with `npm run art:key` (no trim). **File:** future only (no runtime file).

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
3. Confirm the parallax plate is 2:1. If the generator returns 16:9 or square, crop to 2:1 before keying or regenerate; do not squash it to 1024×512. The 2026-11-01 pass uses a **2048×1024 exact-2× window** (centred or phase-adjusted per layer), then nearest-downscales to 1024×512. This keeps the 2×2 cluster grid native and avoids a 2.8125× resample.
4. Do not manually paint a checkerboard or an alpha grid. If the plate has one, reject it.
5. Do not generate a composite of all four layers.

### 7.2 Key the parallax plate

Key at full resolution, before pixel cleanup and quantisation. Keep the full 1024×512 canvas; **do not pass `--trim`**. The example below crops a 2048×1024 exact-2× window first, then keys it at full resolution.

```bash
ffmpeg -y -v error \
  -i art-source/nanobanan/new/bg-nerve_forest-far-updated.jpeg \
  -vf "crop=2048:1024:432:416" \
  art-source/nanobanan/working/tmp/background-far-2048x1024.png

npm run art:key -- \
  --in art-source/nanobanan/working/tmp/background-far-2048x1024.png \
  --out art-source/nanobanan/keyed/background-far-keyed.png \
  --key "#ff00ff" --tolerance 0.18 --softness 0.08 \
  --preview art-source/previews/nanobanan/backgrounds/background-far-keyed.png \
  --preview-width 1024 --background "#101a20" \
  --report art-source/nanobanan/reports/background-far.key.json

ffmpeg -y -v error \
  -i art-source/nanobanan/keyed/background-far-keyed.png \
  -vf "scale=1024:512:flags=neighbor" -pix_fmt rgba \
  art-source/nanobanan/working/tmp/background-far-1024x512.png
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

1. Quantise the keyed plate to the §4.2 ramps with `palette.nerve-forest-layer.json` (no `tissue` role, so no muscle pink/crimson).
2. Enforce the 2×2 minimum cluster grid. The 2026-11-01 pass uses an aligned 2×2 snap; every 2×2 cell becomes one RGBA value.
3. Remove alpha islands smaller than 4 px and stray specks.
4. Weld the four tile edges with a 2 px band: opposite edges receive the same RGBA values (alpha union + palette colour from the denser side). Then re-check the 2×2 grid. The 2026-11-01 pass uses `npm run art:tile-clean` for the 2×2 snap, island removal, edge weld and QA report.
5. Export at 1024×512 with hard alpha as lossless WebP or PNG. If the source is larger, downscale with nearest-neighbour first, then enforce the 2×2 clusters.
6. Do not trim, crop, rotate or resample the **keyed** plate with bilinear filtering. Aspect cropping happens before keying, in §7.1.
7. Build both previews: 2×2 at 2048×1024 and the runtime 1280×720 crop. Inspect the seams at 400%; a pixel-identical weld is necessary but not sufficient if the composition repeat is obvious.
8. Do not ship the raw Ludo JPEG or the keyed review PNG.
9. Keep the key, normalize and clean reports with the asset.

### 7.5 Sky export

The current sky is not keyed and is not quantised. Take the tracked 2752×1536 pretty source, crop to 2672×1536 at `x=40` (40 px each side) for the 1280:736 aspect, Lanczos-downscale to 1280×736, and export lossless WebP:

```bash
mkdir -p art-source/nanobanan/working/tmp
ffmpeg -y -v error \
  -i art-source/nanobanan/new/bg.nerve_forest.sky.jpeg \
  -vf "crop=2672:1536:40:0,scale=1280:736:flags=lanczos" \
  -pix_fmt rgb24 \
  art-source/nanobanan/working/tmp/nerve-forest-sky-pretty-1280x736.png

cwebp -quiet -lossless -q 100 -m 6 \
  art-source/nanobanan/working/tmp/nerve-forest-sky-pretty-1280x736.png \
  -o public/packs/anatomy-reflex/shared/backgrounds/nerve-forest-sky.webp
```

Do not run `art:normalize` or `palette.nerve-forest-sky.json`. Verify the **1280×736 / 1× cover** and the game view at 1280×720. The pretty plate is the recorded palette/budget exception and intentionally retains muscle pink. The old 640×368 + palette recipe is retired for the current sky; it remains the target for a future quiet sky.

---

## 8. Acceptance

### 8.1 Per-asset acceptance

| Asset | Must pass |
|---|---|
| Sky | **Current runtime:** 1280×736 opaque pretty plate at 1× cover; full composition except the 40 px side crop; HUD/player silhouettes read at 1280×720 and 1280×736; no checkerboard/key field/alpha; lossless WebP; no palette quantisation; pink retained; 978,732 bytes (~956 KiB) recorded exception; no pattern overlay. **2026-11-01: pretty plate POC integrated; final approval pending.** |
| Far | **Future target; not wired.** Keyed cut-out; coverage <50%; low contrast, 2–3 value steps; no bone cream/white; distant trunks and sheath plates only; no full-frame wall, bulbs, canopy, ground or horizon; both-axis seam; no magenta fringe; 2×2 clusters; 1024×512; ≤300 KB |
| Mid | **Future target; not wired.** Keyed cut-out; coverage 35–55%; medium contrast; branching twigs, bulbs and folds; no bone-cortex texture; no dark near-canopy silhouettes or full-frame wall; contained glows; both-axis seam; no magenta fringe; 2×2 clusters; 1024×512; ≤300 KB |
| Near | **Future target; not wired.** Keyed cut-out; coverage ≤33%; lower half almost entirely empty; dark teal/ink, two value steps; overhead clumps and edge tendrils; no continuous frame, ring, window or border; no opaque band; both-axis seam; no magenta fringe; 2×2 clusters; 1024×512; ≤300 KB. **2026-11-01: coverage 23.9% and technical checks pass, but the vertical repeat puts the canopy across the play band; deferred.** |

### 8.2 Stack acceptance

- **Current runtime:** one opaque pretty sky plate at 1280×736/1×. Check it at 1280×720 and the 1280×736 room size.
- The four-layer stack (sky + far + mid + near) remains the **future target**; it is not wired.
- When the layered stack is revisited, it must read as three depths: distant haze, far trunks/plates, mid branches/bulbs. Near must not obscure the play band or the player silhouettes; the 2026-11-01 near plate still fails this check (`background-near-over-sky-1280x736.png`).
- In the future stack, no layer's signature content may appear in another layer (no foreground trunk in the sky, no bulbs in the far, no near canopy in the mid).
- No transparent gutters or visible seams at tile boundaries in the future stack.
- The HUD and player remain readable in the current single plate.
- The current pretty plate is the recorded palette exception; the future layered plates use the 03 guard.

### 8.3 Technical QA

- **Current sky:** 1280×736 opaque lossless VP8L WebP; 1× cover; no palette quantisation; no additional lossy compression; no pattern overlay. It intentionally retains muscle pink and is the recorded exception to the 03 palette guard.
- **Future far/mid/near:** keyed before quantisation; no `#FF00FF` remains in the final PNG/WebP; alpha is 0/255; parallax plates are not trimmed; every colour block is at least 2×2 pixels; key/clean reports exist; welded edges are pixel-identical.
- Lossless WebP or PNG; no JPG or lossy WebP.
- No raw Ludo JPEG is referenced by a manifest or served from `public/`.
- The current sky is opaque and contains no key colour.
- The future layered plates respect the 03 palette guard: no muscle pink, crimson, purple or unapproved orange. The layer palette has no `tissue` role.

### 8.4 Content QA

- No blood, gore, open wounds, viscera or shock imagery.
- No religious, sexual or toilet humour.
- No copied characters or copyrighted props.
- No labels, arrows or diagram lines baked into the art.
- The body reads as a place, not a textbook cutaway.
- The 12+ audience is respected.

### 8.5 Sign-off checklist

**Current M3 sign-off:** the pretty sky is the only wired 03 background. It is checked at 1280×720 and 1280×736; final approval is pending. The layered stack (far/mid/near) is future work and is not wired.

- [x] Pretty sky processed and wired at 1280×736/1×; checked at 1280×720 and 1280×736; final approval pending.
- [ ] Far keyed, coverage checked (46.0% keyed / 46.5% final), 2×2 clusters and pixel-identical welded edges. *(processed; placeholder/future; not wired)*
- [ ] Mid keyed, coverage checked (50.7% keyed / 51.7% final), 2×2 clusters and pixel-identical welded edges. *(processed; placeholder/future; not wired)*
- [ ] Near keyed, coverage checked, lower half clear, no continuous frame. *(processed; deferred: play-band repeat)*
- [ ] Four-layer stack approved at 1280×720. *(future)*
- [x] Current sky is opaque lossless WebP with no checkerboard, key field or alpha; it intentionally retains muscle pink.
- [ ] Key reports and prompt log complete. *(future layered pass; model/seed provenance still pending)*
- [x] Licence recorded for the wired pretty sky runtime plate.
- [x] Runtime background folder contains only `nerve-forest-sky.webp`; far/mid/near runtime files removed.
- [x] Raw sources remain in `art-source/` and are not referenced by the manifest.

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
| Aspect and source | 2:1 / 1024×512 for future layers; quiet sky 640×368; current pretty sky 1280×736 |
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

### 9.1 Recorded 2026-11-01 passes

| Asset | Source | Crop | Key report | Coverage | Cleanup | Verdict |
|---|---|---|---|---:|---|---|
| `bg.nerve_forest.sky` | `new/bg.nerve_forest.sky.jpeg` 2752×1536 | 2672×1536 at x=40, Lanczos 1280×736 | none (opaque) | — | no quantisation; lossless WebP | **Wired; pretty plate, final approval pending** |
| `bg.nerve_forest.far` | `new/bg-nerve_forest-far-updated.jpeg` 2912×1440 | 2048×1024 at (432,416), exact 2× | `reports/background-far.key.json` | 46.0% | 2×2 snap, 2 px weld | Placeholder/future; not wired |
| `bg.nerve_forest.mid` | `new/bg-nerve_forest-mid-updated.jpeg` 2912×1440 | 2048×1024 at (432,208), exact 2× | `reports/background-mid.key.json` | 50.7% | 2×2 snap, 2 px weld | Placeholder/future; not wired |
| `bg.nerve_forest.near` | `new/bg-nerve_forest-near-updated.jpeg` 2912×1440 | 2048×1024 at (432,208), exact 2× | `reports/background-near.key.json` | 23.9% | 2×2 snap, 2 px weld | Placeholder/future; vertical repeat covers play band |

The 2026-11-01 layered pass used `#FF00FF`, tolerance 0.18, softness 0.08, no trim, and `palette.nerve-forest-layer.json` for far/mid/near. The current pretty sky does **not** use a key or a palette: it is a 1280×736 lossless WebP, cropped and Lanczos-downscaled from the tracked source. The process report `reports/background-layers.process.json` is historical; the current previews are `previews/nanobanan/backgrounds/nerve-forest-sky-pretty-1280x736.png` and `-1280x720.png`; the in-game review still is `screenshots/m3-nerve-forest-backgrounds.png`.

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
| Pretty sky is too busy or too close | The pretty plate is intentionally busy; validate HUD/player readability at 1280×720 and 1280×736. If it fails, stop and ask before darkening/tinting or changing engine behaviour. |
| Future quiet sky is too busy or too close | Distant-only prompt; no foreground trunk, canopy or drape; approve for quietness, not detail |
| Palette drift or pink drapes | The current pretty sky intentionally retains muscle pink and is the sole exception. Future far/mid/near layers use the 03 guard: no muscle pink/crimson; quantise after keying; check the ramp histogram. Do not quantise the pretty sky. |
| Despill shifts pink/red art | The current sky has no key. For future layers, 03 has no muscle pink; for a future level with strong pinks, switch to a green key and record it. |
| Pretty sky JPEG artifacts | Source compression is baked into the tracked JPEG. Inspect at 400%; if it is objectionable, obtain a lossless master instead of adding another lossy encode. |
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
- **Applied 2026-11-01:** the updated near plate passed the numeric coverage and technical checks but failed the play-band read after vertical tiling. It remains deferred rather than being wired as a broken foreground layer.

---

## 11. Versioning and change log

| Date | Change |
|---|---|
| 2026-11-01 | Initial dedicated background requirements. Supersedes the background prompts in `asset-requirements-v01.md`. Sky is opaque; far/mid/near are `#FF00FF` cut-outs keyed with `art:key`; adds the layer contract, coverage/value budgets, `NEGATIVE_PARALLAX`, key workflow, acceptance checks and prompt log. Prompt version `m3-2026-11-01.1`; style version `style-pixel-v2`; doc v0.1. Does **not** re-baseline the current M3 scope: the sky remains the only wired 03 background, and far/mid/near remain source-only/deferred until regenerated and accepted. |
| 2026-11-01 | Updated cut-out pass and wiring. Updated sky replaced the POC plate (2720×1568 → 2720×1564 crop → 640×368, no-muscle palette). Far (46.0%) and mid (50.7%) were exact-2× cropped, keyed, palette-quantised, 2×2-snapped and 2 px edge-welded, then wired with the specified parallax/depth/material setup. Near (23.9%) passes the technical checks but is deferred because its 1024×512 vertical repeat puts the hanging canopy across the play band. Doc v0.2. |
| 2026-11-01 | **Pretty sky-only runtime.** Replaced the 640×368 quantised sky with the tracked 2752×1536 pretty source: 2672×1536 crop at x=40 → Lanczos 1280×736 → lossless WebP at 978,732 bytes (~956 KiB), 1× cover. Removed palette quantisation and the `nerve-fibers` overlay. Reverted far/mid/near to placeholders, removed them from `room.json`, and deleted their runtime WebPs and far/mid licence entries; sources, key reports and previews remain in `art-source/`. The layered stack is retained as a future target. Doc v0.3. |

---

## 12. References

- [`asset-requirements-v01.md`](asset-requirements-v01.md) — shared sprites, atlases, badge, audio and the main M3 scope.
- [`room.json`](../../public/packs/anatomy-reflex/levels/03-nerve-forest/room.json) — current one-layer pretty sky; fit, parallax and depth.
- [`background.ts`](../../src/world/background.ts) — `cover` and `TileSprite` behaviour, integer sky scale, tile position rounding.
- [`art-key.ts`](../../scripts/art-key.ts) — chroma-key CLI for the future far/mid/near layers; tolerance, softness, despill, report.
- [`art-tile-clean.mjs`](../../scripts/art-tile-clean.mjs) — 2×2 snap, alpha-island removal, 2 px tile edge weld and QA report.
- [`key.ts`](../../scripts/art/key.ts) — RGB-distance key, hard alpha, despill, alpha bounds.
- [`art-source/nanobanan/README.md`](../../art-source/nanobanan/README.md) — concept plates, key/fit workflow and POC status.
- [`art-source/nanobanan/new/`](../../art-source/nanobanan/new/) — the tracked pretty `bg.nerve_forest.sky.jpeg` source, the future `*-updated.jpeg` cut-out plates, and the older failed parallax references. Nothing here is a runtime asset.
- [`art-source/nanobanan/reports/`](../../art-source/nanobanan/reports/) — key and fit reports.
- [`adr-m3/0047-pixel-art-visual-direction.md`](../adr-m3/0047-pixel-art-visual-direction.md) — pixel-art direction.
- [`adr-m3/0048-half-resolution-pixel-rendering.md`](../adr-m3/0048-half-resolution-pixel-rendering.md) — half-res authoring and 2× display.
- [`base-game/adr/0031-layered-background-composition.md`](../shrinkonauts/base-game/adr/0031-layered-background-composition.md) — layered background composition.
- [`adr-art-pipeline/0060-source-work-runtime-asset-layers.md`](../adr-art-pipeline/adr-0060-source-work-runtime-asset-layers.md) — source/working/runtime asset layers.
- [`adr-art-pipeline/0063-build-time-animation-previews.md`](../adr-art-pipeline/adr-0063-build-time-animation-previews.md) — build-time previews.
- [`adr-art-pipeline/0065-p2-bone-suit-joint-visor.md`](../adr-art-pipeline/adr-0065-p2-bone-suit-joint-visor.md) — current palette/role map.

---

**End of document.**
