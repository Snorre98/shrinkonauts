# Asset generation prompt — template

**Status:** Draft v0.1 · 1 November 2026  
**Use:** Copy the prompt blocks into the asset-generation workflow (Ludo.ai
Image Generator for concepts, Aseprite/Piskel/LibreSprite for the final pixel
pass, and the local pipeline for keying, fitting, normalisation, and previews).
For the Silicon instance, use
[`levels/01-interrupt-loop-assets.md`](levels/01-interrupt-loop-assets.md).

> **Ludo is a concept tool, not a pixel renderer.** Every output is a concept
> plate. The final asset is pixel-cleaned at source size, palette-quantised,
> and exported by the local pipeline. Do not ship faux-pixel output.

---

## 1. What this template produces

- A set of concept prompts for one level’s backgrounds, material swatch,
  agent, scans, props, sockets, gates, exit, and optional UI portrait.
- Export specifications for the pixel pass.
- Negative prompts that keep the output in the game’s style and, for Silicon,
  out of the nerve theme.
- A prompt log and acceptance checklist.

It does not generate a runtime spritesheet or a named atlas directly. The atlas
is assembled offline from an approved swatch.

---

## 2. Settings

| Setting | Value |
|---|---|
| Tool | Ludo.ai Image Generator |
| Plan | Indie ($20/mo) for production; free tier only for the style gate |
| Asset type | Sprite, Sprite sheet, Background, Parallax layer, Texture/Pattern, Icon |
| Resolution | 1024 px on the long edge for concepts; capture sheets at the highest usable resolution |
| Aspect | 1:1 sprites/props/atlas swatches; wide sky; 2:1 parallax |
| Background | Flat solid magenta `#FF00FF` |
| Variations | 4 per single-image prompt; one sheet per action |
| Reference | `style-anchor-p1.png` for pixel/palette only; approved swatch for atlas frames |
| Negative | Use the matching block below; add the asset delta |
| Export | PNG with alpha; source size; no upscaled 2×/4× exports |

If Ludo’s UI labels differ, map to the closest equivalent. The prompt blocks
are the source of truth for the concept; the pixel pass is the source of truth
for the final asset.

---

## 3. Shared palette block

Copy this into every prompt after the style block.

```text
Palette ramps: teal #05090b #101a20 #1d2f38; bone #c9b79a #f2e8d5 #fff8e8; bone shadow #5f736e #7a8f8a #9db4ad; nerve #b8862b #ffd166 #fff3b0; joint #3f9fb5 #7bdff2 #c9f7ff; muscle #a82a4a #ef476f #ff9fb2; sage #6f847d #9db4ad #c4d4ce; ink #000000 #05090b #2a3f47. Use only these ramp steps; no intermediate blends, no unapproved orange. For the Silicon theme, nerve amber and muscle pink are not used in world art; map signal to joint cyan, graphite to teal/ink, ceramic to bone, dust to bone shadow/sage.
```

The shared palette table is in
[`../m3/asset-requirements-v01.md`](../m3/asset-requirements-v01.md) §4.3. The
Silicon role mapping is in
[`silicon-theme.md`](silicon-theme.md) §4.

---

## 4. Tech style blocks

These are the **Silicon tech** blocks. For an organic anatomy level, replace
them with `STYLE_SPRITE`, `STYLE_BACKGROUND`, `STYLE_ATLAS` and the matching
negatives from
[`../m3/asset-requirements-v01.md`](../m3/asset-requirements-v01.md) §8.2–8.9.
Do not mix tech and organic blocks in one asset.

### 4.1 `STYLE_SPRITE_TECH`

```text
Pixel art for a side-view 2D platformer set inside a circuit board. Native pixel grid, hard square pixels, crisp edges, no anti-aliasing, no smoothing, no mixed pixel sizes. Bold dark graphite-teal outlines, one pixel at final sprite scale; flat fills from three-step ramps; 50% dither for solder-mask grain, copper wear, flux dust and cold condensation. Clean-room hardware, wry deadpan tone, weird and fussy but 12+ friendly: never gory, no biology, no shock humour. Strong readable shapes; characters and props must read as small sprites. Side view or slight 3/4 view. Orthogonal hardware geometry, not organic curves.
```

### 4.2 `STYLE_BACKGROUND_TECH`

```text
Pixel art for a side-view 2D platformer set inside a circuit board. Native pixel grid, hard square pixels, crisp edges, no anti-aliasing, no smoothing. Orthographic side view, macro circuit-board scale; atmospheric depth from layered values and dither, not a global gradient; cold cyan edge light and graphite shadows, no warm key light. Solder-mask grain, copper wear, ceramic packages, via holes, ribbon cables, flux dust and cold condensation. Clean-room hardware, wry deadpan tone, 12+ friendly: never gory, no biology. The board is a landscape, not a textbook diagram; use orthogonal traces, chip sockets, pin rows and actuator arms as architecture.
```

### 4.3 `STYLE_ATLAS_TECH`

```text
Pixel-art seamless material texture for a side-view platformer set inside a circuit board. Native pixel grid, hard square pixels, every colour block at least 2×2 pixels, no anti-aliasing, no smoothing. Flat fills from three-step ramps; 50% dither. Uniform flat lighting; orthographic surface, seamless material swatch. Clean-room hardware, wry deadpan tone, 12+ friendly. The material reads as one coherent PCB surface: solder mask, copper traces, ceramic pads, via rings and fine grain. No characters, no scene, no text.
```

### 4.4 `STYLE_ICON_TECH`

```text
Pixel-art scan icon for a dark graphite HUD. Native pixel grid, hard square pixels, 1px dark outline, no anti-aliasing, no smoothing. Flat fills from three-step ramps; one hard form shadow; one cold cyan highlight; subtle grime. Clean-room hardware, wry deadpan tone, 12+ friendly. Flat diagrammatic icon, no face, no character pose, no text, no arrow. Simple, bold, readable at 36×36.
```

---

## 5. Frame blocks

### 5.1 `FRAME_ENTITY_CONCEPT`

```text
Full object, centred, with a clear empty margin on all sides, isolated on a flat solid magenta #FF00FF background; no ground, no pedestal, no cast shadow, no scene, no frame. Draw the object large and clear; do not draw a pixel grid, a tiny sprite, or a sprite sheet. Hard pixel edges; no anti-aliasing.
```

### 5.2 `FRAME_ENTITY` (export; do not paste into Ludo)

```text
Export spec: 18×18 source, base of the lowest visible element on the bottom padding line, 1 px transparent margin; the engine displays it at 36×36. Do not paste this block into Ludo.
```

### 5.3 `FRAME_SKY`

```text
640×368, wide, opaque, edge-to-edge background plate, no frame. Keep the upper corners and lower third dark and low-contrast; keep important detail inside the central 70% for the 2× cover crop. Hard pixel edges; no anti-aliasing.
```

### 5.4 `FRAME_PARALLAX`

```text
1024×512, 2:1, transparent background, isolated layer, no frame. Tile seamlessly on all four edges; every colour block at least 2×2 pixels; verify as a 2×2 repeat at native size and at 1280×720. Hard pixel edges; no anti-aliasing.
```

### 5.5 `FRAME_ATLAS`

```text
1024×1024 seamless material swatch concept, uniform flat lighting, no grid, no labels, no frame, no directional highlight, no baked edge. Hard pixel edges; every colour block at least 2×2 pixels. Pixel-clean to a 512×512 working swatch; assemble 32×32 frames offline.
```

### 5.6 `FRAME_PORTRAIT`

```text
Square bust portrait, centred, with a clear empty margin, isolated on a flat solid magenta #FF00FF background; no frame, no text, no scene. Draw the character large and clear; do not draw a pixel grid or a sprite sheet. Hard pixel edges; no anti-aliasing.
```

---

## 6. Negative blocks

### 6.1 `NEGATIVE_TECH`

```text
text, letters, numbers, logo, watermark, border, UI, labels, arrows, diagram lines, anti-aliasing, smooth gradient, painterly, 3D render, photorealism, anime, clean vector, high-res detail, mixed pixel sizes, faux pixel art, blurry edges, glossy plastic, neon cyberpunk, purple, neon green, orange, pure red, blood, gore, open wound, viscera, exposed organs, fur, hair, feathers, scales, human face, extra arms, extra legs, multiple characters, scene background, ground, floor, pedestal, cast shadow, drop shadow, checkerboard, frame, nerve, neuron, dendrite, axon, synapse, myelin, membrane, bone tissue, skeletal bone, muscle tissue, forest, roots, organic curves, teal fog, amber glow, warm key light, brain, spinal cord
```

### 6.2 `NEGATIVE_BACKGROUND_TECH`

```text
text, letters, numbers, logo, watermark, border, UI, labels, arrows, diagram, diagram lines, textbook diagram, cutaway, cross-section, characters, creatures, astronaut, anti-aliasing, smooth gradient, painterly, 3D render, photorealism, anime, clean vector, high-res detail, mixed pixel sizes, faux pixel art, blurry edges, neon cyberpunk, purple, neon green, orange, pure red, blood, gore, viscera, exposed organs, hard horizon line, single focal landmark, high-contrast centre, opaque near-layer centre, obvious repeating object, frame, nerve, neuron, dendrite, axon, synapse, myelin, membrane, bone tissue, skeletal bone, muscle tissue, forest, roots, organic curves, teal fog, amber glow, warm key light, brain, spinal cord
```

### 6.3 `NEGATIVE_ATLAS_TECH`

```text
text, letters, numbers, labels, grid lines, gutters, border, UI, logo, watermark, characters, scene, perspective, textbook diagram, anatomical label, anti-aliasing, smooth gradient, painterly, 3D render, photorealism, directional light, baked highlight, baked edge, vignette, bevel, drop shadow, single dark top edge, checkerboard, frame, mixed pixel sizes, faux pixel art, nerve, neuron, dendrite, axon, synapse, myelin, membrane, bone tissue, skeletal bone, muscle tissue, forest, roots, organic curves, teal fog, amber glow, warm key light
```

### 6.4 Asset negative delta

Add the likely failure mode:

- Backgrounds: `single focal landmark, obvious repeat, opaque centre, warm glow, nerve trunks, organic roots`.
- Agent: `humanoid body, brain shape, face, extra arms, extra legs, neuron, dendrite, axon, text`.
- Scans: `face, eyes, character pose, arrow, label, 3D bevel`.
- Props: `face, eyes, character, scene, text, organic curve`.
- Sockets/gates: `keyhole, lock, mechanical key, face, text, organic valve`.
- Atlas: `directional edge, grid lines, characters, scene, nerve, bone tissue, skeletal bone, muscle tissue`.
- Portrait: `full body, scene, text, frame, brain, humanoid robot`.

---

## 7. Meta-prompt for an asset-generation agent

Use this when an agent is orchestrating the asset workflow. It is not a Ludo
prompt; it tells the agent how to produce and check the Ludo prompts.

```text
ROLE
You are producing the asset prompt pack for one Shrinkonauts level. You do not
ship raw Ludo output. You produce copy-paste concept prompts, then a pixel-pass
plan at source size, then export and acceptance notes.

CONTEXT
Read:
- docs/prompts/silicon-theme.md
- docs/prompts/levels/01-interrupt-loop-assets.md
- docs/m3/asset-requirements-v01.md §4, §6, §7, §8, §9
- docs/m2/nervous-puzzles/silicon-fixture.md
- public/packs/anatomy-reflex/assets.final.json
- public/packs/index.json

TASK
For each asset in the register:
1. Write a subject-first positive prompt: SUBJECT + STYLE_TECH + PALETTE +
   FRAME.
2. Write the matching negative block plus asset delta.
3. Record the source/display size, file path, priority, and acceptance checks.
4. State what the pixel pass must do in Aseprite/Piskel.
5. State the runtime check at actual size.

RULES
- The first 1–2 sentences of every prompt describe the object and its core
  silhouette.
- Every anatomical term follows a visual noun. For Silicon, use hardware nouns:
  chip package, pin row, socket, trace, via, actuator arm.
- Do not use living-artist names or copyrighted character names.
- Do not ask Ludo for a named atlas, a grid, labels, or a transparent
  checkerboard.
- Do not paste the 18×18/36×36 export grid into the Ludo prompt.
- Do not put text in the image.
- For Silicon, the negative block must ban nerve, neuron, dendrite, axon,
  synapse, myelin, membrane, bone tissue, skeletal bone, muscle tissue, forest, roots, organic curves, teal
  fog, amber glow, warm key light, brain, and spinal cord.
- If Ludo draws a neuron, a brain, a fleshy cable, or a teal forest, do not
  iterate on style; fix the subject-first sentence and the negative delta.
- Stop after three attempts per asset; use a placeholder if it still fails.

OUTPUT
A table row per asset with: prompt version, style version, asset ID, subject,
negative, frame, export, chosen file, pixel cleanup, runtime check, verdict,
licence, notes.
```

---

## 8. Workflow

1. Generate four concepts for a single image, or one source sheet per action.
2. Keep the Ludo PNG and JSON together.
3. Pick the best concept. Download the full-resolution plate.
4. Key the magenta background (`npm run art:key`), inspect edges at 400%.
5. Fit the object to the source cell (`npm run art:fit` for entities) or pixel
   it at source size in Aseprite/Piskel.
6. Quantise to the ramp palette; remove anti-aliasing; enforce 2×2 clusters on
   1:1 layers and atlas frames.
7. Export at source size; inspect at 400%; check at display size on a dark
   graphite contact sheet.
8. For atlases: pixel-clean to a 512×512 working swatch; assemble 32×32 frames
   in Aseprite; keep every cell opaque.
9. Record the prompt, source, frame range, palette, cleanup, and chosen file in
   the prompt log.
10. Integrate the file into `assets.final.json` and `licenses.json`.
11. Run `pack:validate` and `pack:smoke`; inspect the runtime still.

---

## 9. Per-asset prompt template

```text
SUBJECT: <one or two sentences naming the object and its core silhouette>

<STYLE_TECH>

<PALETTE>

<FRAME>

Negative prompt: <NEGATIVE_TECH> + <asset delta>

Export: <source size> source; <display size> runtime; <file path>. Do not paste
this export line into Ludo.
```

The subject must be first. The style, palette, and frame follow it. If Ludo has
a separate style field, put the style block there and keep the subject +
palette + frame in the prompt field. If Ludo has a separate negative field, use
it; do not repeat the negative text in the positive prompt.

---

## 10. Prompt log template

| Field | Example |
|---|---|
| Prompt version | `silicon-2026-11-01.1` |
| Style version | `style-silicon-v1` |
| Asset ID | `sprite.agent.cpu` |
| Subject block | `SUBJECT: One small CPU Core creature...` |
| Fidelity guard | `CPU is output side; not a brain` |
| Visual analogy | `boxy ceramic chip with pin legs` |
| Prompt order | `SUBJECT → STYLE_TECH → PALETTE → FRAME` |
| Category | sprite / background / parallax / atlas / icon |
| Tool and plan | Ludo.ai / Indie |
| Model and seed | Ludo image model; seed |
| Reference | `style-anchor-p1.png` for pixel/palette only |
| Negative block | `NEGATIVE_TECH` |
| Negative delta | `brain, neuron, organic cable, text` |
| Prompt | Full positive prompt |
| Frame block | `FRAME_ENTITY_CONCEPT` |
| Export frame | `FRAME_ENTITY` (Aseprite/Piskel only) |
| Aspect and export | 1:1 / 18×18 source; 36×36 display |
| Variations | 4 for a single image; one sheet per action |
| Chosen file | `shared/sprites/agent-cpu.png` |
| Runtime export | `public/packs/silicon-reflex/shared/sprites/agent-cpu.png` |
| Date | 2026-11-01 |
| Pixel cleanup | Aseprite; 18×18; palette quantised; anti-aliasing removed |
| Grid check | 2× display; 2×2 clusters where 1:1 |
| Post-processing | Magenta keyed; 400% edge check; trimmed; 1 px pad |
| Runtime check | 36×36; warm tint check; contact sheet |
| Verdict | Approved / retry / placeholder |
| Licence | Ludo AI Commercial (paid) or POC label |
| Notes | One variable changed; reason for retry |

---

## 11. Integration and acceptance

### 11.1 Integration

- Add the final entry to `assets.final.json` with `src` and `license`.
- Add the file to `licenses.json` with source, author, licence, URL, modified,
  and `aiGenerated`.
- For sheets, include `frameWidth`, `frameHeight`, `frames`, `fps`, `loop`,
  `anchor`.
- For atlases, include `width`, `height`, and every named region.
- Do not reference raw Ludo sheets or `art-source/` from a manifest.
- Do not use lossy JPG or lossy WebP for pixel art.

### 11.2 Acceptance

- [ ] Correct source size: 14×22 player, 18×18 entity, 640×368 sky,
  1024×512 parallax, 128×128 atlas, 16×16 or 32×32 icon.
- [ ] Display lands on exact 2× for players/entities/icons; parallax and atlas
  frames are 1:1 with 2×2 clusters.
- [ ] No anti-aliasing, blur, or fractional scaling.
- [ ] Palette quantised to the ramps; no stray colours.
- [ ] Alpha is 0 or 255; no magenta fringe; edges clean at 400%.
- [ ] No text, logo, watermark, border, or checkerboard.
- [ ] File size within budget.
- [ ] Filename matches the asset register.
- [ ] The asset reads at actual size on a dark graphite contact sheet.
- [ ] The asset survives the warm interaction tint.
- [ ] The asset passes the visual-difference contract: no nerve motif, no
  organic curves, no amber world glow.
- [ ] Prompt log complete.

---

## 12. Cut lines

If the asset pass slips, in order:

1. Defer the optional portrait and work token.
2. Defer the five scans and the sensor pad; keep the level playable with
   placeholders.
3. Defer the exit; reuse a shared exit placeholder.
4. Keep the four backgrounds, the material atlas, the CPU agent, the route
   plug, the sockets, and the actuator gate. Those carry the puzzle’s meaning.

Never ship faux-pixel output. A coherent placeholder is better than a broken
final asset.
