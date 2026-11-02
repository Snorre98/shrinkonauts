# Silicon Interrupt Loop — asset prompt pack

**Status:** Draft v0.1 · 1 November 2026  
**Pack:** `silicon-reflex`  
**Level:** `01-interrupt-loop`  
**Theme:** [`docs/prompts/silicon-theme.md`](../silicon-theme.md)  
**Template:** [`docs/prompts/asset-generation-template.md`](../asset-generation-template.md)  
**Design:** [`docs/m2/nervous-puzzles/silicon-fixture.md`](../../m2/nervous-puzzles/silicon-fixture.md)

> **The requirement:** this is a graphite/cyan clean-room circuit board, not the
> nerve forest. No nerve trunks, myelin beads, synaptic bulbs, membrane folds,
> neuron characters, amber ambient glow, or damp teal fog. The shared elements
> are the pixel grid, the nine ramps, the outline weight, the astronaut
> players, the HUD, and the audio cue IDs.

---

## 1. Scope

| Bucket | Count | Notes |
|---|---:|---|
| Backgrounds | 4 | Sky, far, mid, near; 640×368 + three 1024×512 |
| Material atlas | 1 | 128×128, 4×4, 16 edge frames |
| Agent | 1 | CPU Core |
| Scans | 5 | Sensor, interrupt, controller, CPU, actuator |
| Pads and consoles | 3 | Sensor pad, sensor console, transfer console |
| Props | 2 | Route plug, optional work token |
| Sockets | 2 | Controller socket, CPU socket decoy |
| Gate and exit | 2 | Actuator gate, Silicon exit |
| UI portrait | 1 | Optional CPU portrait |
| **New Silicon images** | **21** | 19 P0/P1 + 2 optional; excludes shared players/badge/audio |
| Shared kit | — | P1/P2 players, badge, UI chrome, 12 cue IDs |

The optional work token and portrait do not block the level. The P0 kit is the
minimum playable set.

---

## 2. Assembly formula

```text
CONCEPT PROMPT = SUBJECT_<ASSET> + STYLE_<CATEGORY>_TECH + PALETTE + FRAME_<CATEGORY>
NEGATIVE       = NEGATIVE_<CATEGORY>_TECH + NEGATIVE_DELTA_<ASSET>
EXPORT SPEC    = FRAME_<CATEGORY> (for Aseprite/Piskel; do not paste into Ludo)
```

- The subject is always first.
- The style, palette, and frame follow it.
- If Ludo has a separate style field, put the style block there and keep the
  subject + palette + frame in the prompt field.
- If Ludo has a separate negative field, use it; do not repeat the negative in
  the positive prompt.
- Do not paste the 18×18/36×36 export spec into the Ludo prompt.
- Ludo produces a concept; the final asset is pixel-cleaned at source size.

Prompt version: `silicon-2026-11-01.1`.  
Style version: `style-silicon-v1`.

---

## 3. Shared blocks

### 3.1 `PALETTE`

```text
Palette ramps: teal #05090b #101a20 #1d2f38; bone #c9b79a #f2e8d5 #fff8e8; bone shadow #5f736e #7a8f8a #9db4ad; nerve #b8862b #ffd166 #fff3b0; joint #3f9fb5 #7bdff2 #c9f7ff; muscle #a82a4a #ef476f #ff9fb2; sage #6f847d #9db4ad #c4d4ce; ink #000000 #05090b #2a3f47. Use only these ramp steps; no intermediate blends, no unapproved orange. Silicon world mapping: graphite = teal/ink, ceramic = bone, dust = bone shadow/sage, signal = joint cyan. Nerve amber and muscle pink are not used in world art.
```

### 3.2 `STYLE_SPRITE_TECH`

```text
Pixel art for a side-view 2D platformer set inside a circuit board. Native pixel grid, hard square pixels, crisp edges, no anti-aliasing, no smoothing, no mixed pixel sizes. Bold dark graphite-teal outlines, one pixel at final sprite scale; flat fills from three-step ramps; 50% dither for solder-mask grain, copper wear, flux dust and cold condensation. Clean-room hardware, wry deadpan tone, weird and fussy but 12+ friendly: never gory, no biology, no shock humour. Strong readable shapes; characters and props must read as small sprites. Side view or slight 3/4 view. Orthogonal hardware geometry, not organic curves.
```

### 3.3 `STYLE_BACKGROUND_TECH`

```text
Pixel art for a side-view 2D platformer set inside a circuit board. Native pixel grid, hard square pixels, crisp edges, no anti-aliasing, no smoothing. Orthographic side view, macro circuit-board scale; atmospheric depth from layered values and dither, not a global gradient; cold cyan edge light and graphite shadows, no warm key light. Solder-mask grain, copper wear, ceramic packages, via holes, ribbon cables, flux dust and cold condensation. Clean-room hardware, wry deadpan tone, 12+ friendly: never gory, no biology. The board is a landscape, not a textbook diagram; use orthogonal traces, chip sockets, pin rows and actuator arms as architecture.
```

### 3.4 `STYLE_ATLAS_TECH`

```text
Pixel-art seamless material texture for a side-view platformer set inside a circuit board. Native pixel grid, hard square pixels, every colour block at least 2×2 pixels, no anti-aliasing, no smoothing. Flat fills from three-step ramps; 50% dither. Uniform flat lighting; orthographic surface, seamless material swatch. Clean-room hardware, wry deadpan tone, 12+ friendly. The material reads as one coherent PCB surface: solder mask, copper traces, ceramic pads, via rings and fine grain. No characters, no scene, no text.
```

### 3.5 `STYLE_ICON_TECH`

```text
Pixel-art scan icon for a dark graphite HUD. Native pixel grid, hard square pixels, 1px dark outline, no anti-aliasing, no smoothing. Flat fills from three-step ramps; one hard form shadow; one cold cyan highlight; subtle grime. Clean-room hardware, wry deadpan tone, 12+ friendly. Flat diagrammatic icon, no face, no character pose, no text, no arrow. Simple, bold, readable at 36×36.
```

### 3.6 `FRAME_ENTITY_CONCEPT`

```text
Full object, centred, with a clear empty margin on all sides, isolated on a flat solid magenta #FF00FF background; no ground, no pedestal, no cast shadow, no scene, no frame. Draw the object large and clear; do not draw a pixel grid, a tiny sprite, or a sprite sheet. Hard pixel edges; no anti-aliasing.
```

### 3.7 `FRAME_ENTITY` (export only)

```text
Export spec: 18×18 source, base of the lowest visible element on the bottom padding line, 1 px transparent margin; the engine displays it at 36×36. Do not paste this block into Ludo.
```

### 3.8 `FRAME_SKY`

```text
640×368, wide, opaque, edge-to-edge background plate, no frame. Keep the upper corners and lower third dark and low-contrast; keep important detail inside the central 70% for the 2× cover crop. Hard pixel edges; no anti-aliasing.
```

### 3.9 `FRAME_PARALLAX`

```text
1024×512, 2:1, transparent background, isolated layer, no frame. Tile seamlessly on all four edges; every colour block at least 2×2 pixels; verify as a 2×2 repeat at native size and at 1280×720. Hard pixel edges; no anti-aliasing.
```

### 3.10 `FRAME_ATLAS`

```text
1024×1024 seamless material swatch concept, uniform flat lighting, no grid, no labels, no frame, no directional highlight, no baked edge. Hard pixel edges; every colour block at least 2×2 pixels. Pixel-clean to a 512×512 working swatch; assemble 32×32 frames offline.
```

### 3.11 `FRAME_PORTRAIT`

```text
Square bust portrait, centred, with a clear empty margin, isolated on a flat solid magenta #FF00FF background; no frame, no text, no scene. Draw the character large and clear; do not draw a pixel grid or a sprite sheet. Hard pixel edges; no anti-aliasing.
```

### 3.12 `NEGATIVE_TECH`

```text
text, letters, numbers, logo, watermark, border, UI, labels, arrows, diagram lines, anti-aliasing, smooth gradient, painterly, 3D render, photorealism, anime, clean vector, high-res detail, mixed pixel sizes, faux pixel art, blurry edges, glossy plastic, neon cyberpunk, purple, neon green, orange, pure red, blood, gore, open wound, viscera, exposed organs, fur, hair, feathers, scales, human face, extra arms, extra legs, multiple characters, scene background, ground, floor, pedestal, cast shadow, drop shadow, checkerboard, frame, nerve, neuron, dendrite, axon, synapse, myelin, membrane, bone tissue, skeletal bone, muscle tissue, forest, roots, organic curves, teal fog, amber glow, warm key light, brain, spinal cord
```

### 3.13 `NEGATIVE_BACKGROUND_TECH`

```text
text, letters, numbers, logo, watermark, border, UI, labels, arrows, diagram, diagram lines, textbook diagram, cutaway, cross-section, characters, creatures, astronaut, anti-aliasing, smooth gradient, painterly, 3D render, photorealism, anime, clean vector, high-res detail, mixed pixel sizes, faux pixel art, blurry edges, neon cyberpunk, purple, neon green, orange, pure red, blood, gore, viscera, exposed organs, hard horizon line, single focal landmark, high-contrast centre, opaque near-layer centre, obvious repeating object, frame, nerve, neuron, dendrite, axon, synapse, myelin, membrane, bone tissue, skeletal bone, muscle tissue, forest, roots, organic curves, teal fog, amber glow, warm key light, brain, spinal cord
```

### 3.14 `NEGATIVE_ATLAS_TECH`

```text
text, letters, numbers, labels, grid lines, gutters, border, UI, logo, watermark, characters, scene, perspective, textbook diagram, anatomical label, anti-aliasing, smooth gradient, painterly, 3D render, photorealism, directional light, baked highlight, baked edge, vignette, bevel, drop shadow, single dark top edge, checkerboard, frame, mixed pixel sizes, faux pixel art, nerve, neuron, dendrite, axon, synapse, myelin, membrane, bone tissue, skeletal bone, muscle tissue, forest, roots, organic curves, teal fog, amber glow, warm key light
```

---

## 4. Asset inventory

| Priority | ID | Type | Source / display | File | Used by |
|---|---|---|---:|---|---|
| P0 | `bg.silicon_board.sky` | background | 640×368 / 1280×736 cover | `shared/backgrounds/silicon-board-sky.webp` | room sky |
| P0 | `bg.silicon_board.far` | background | 1024×512 / tile | `shared/backgrounds/silicon-board-far.webp` | room far |
| P0 | `bg.silicon_board.mid` | background | 1024×512 / tile | `shared/backgrounds/silicon-board-mid.webp` | room mid |
| P0 | `bg.silicon_board.near` | background | 1024×512 / tile | `shared/backgrounds/silicon-board-near.webp` | room near |
| P0 | `tile.circuit.atlas` | atlas | 128×128, 4×4, 16 edge frames | `shared/tiles/circuit-atlas.png` | `circuit-edge`, `substrate-edge` |
| P0 | `sprite.agent.cpu` | sprite | 18×18 / 36×36 | `shared/sprites/agent-cpu.png` | agent |
| P0 | `sprite.prop.route_plug` | sprite | 18×18 / 36×36 | `shared/sprites/prop-route-plug.png` | route plug |
| P0 | `sprite.socket.controller` | sprite | 18×18 / 36×36 | `shared/sprites/socket-controller.png` | controller socket |
| P0 | `sprite.socket.cpu` | sprite | 18×18 / 36×36 | `shared/sprites/socket-cpu.png` | CPU socket decoy |
| P0 | `sprite.gate.actuator` | sprite | 18×18 / 36×36 | `shared/sprites/gate-actuator.png` | actuator gate |
| P0 | `sprite.exit.silicon` | sprite | 18×18 / 36×36 | `shared/sprites/exit-silicon.png` | exit |
| P1 | `sprite.scan.sensor` | sprite | 18×18 / 36×36 | `shared/sprites/scan-sensor.png` | scan |
| P1 | `sprite.scan.interrupt` | sprite | 18×18 / 36×36 | `shared/sprites/scan-interrupt.png` | scan |
| P1 | `sprite.scan.controller` | sprite | 18×18 / 36×36 | `shared/sprites/scan-controller.png` | scan |
| P1 | `sprite.scan.cpu` | sprite | 18×18 / 36×36 | `shared/sprites/scan-cpu.png` | scan |
| P1 | `sprite.scan.actuator` | sprite | 18×18 / 36×36 | `shared/sprites/scan-actuator.png` | scan |
| P1 | `sprite.pad.sensor` | sprite | 18×18 / 36×36 | `shared/sprites/pad-sensor.png` | sensor pad |
| P1 | `sprite.console.sensor` | sprite | 18×18 / 36×36 | `shared/sprites/console-sensor.png` | puzzle activation |
| P1 | `sprite.console.transfer` | sprite | 18×18 / 36×36 | `shared/sprites/console-transfer.png` | transfer gate |
| P2 | `sprite.prop.work_token` | sprite | 18×18 / 36×36 | `shared/sprites/prop-work-token.png` | optional beat |
| P2 | `ui.portrait.cpu` | image | 32×32 target | `shared/ui/portrait-cpu.png` | deferred portrait |

Shared kit copied into the Silicon pack:

- `sprite.player.p1` + walk/jump/fall/land
- `sprite.player.p2` + walk/jump/fall/land
- `ui.icon.badge` (placeholder until the UI pass)
- `audio.cue.*` (12 placeholders)

Not generated: `sprite.checkpoint`, `sprite.checkpoint.silicon`,
`sprite.scan.reflex`, `tile.nerve.atlas`, `tile.bone.atlas`,
`sprite.agent.neuron`, `sprite.scan.neuron`, `sprite.scan.pathway`,
`sprite.gate.ferry`, and all `bg.nerve_forest.*`.

---

## 5. Background prompts

### 5.1 `bg.silicon_board.sky` [DONE]

**Style:** `STYLE_BACKGROUND_TECH`. **Frame:** `FRAME_SKY`. **Source:** 640×368
WebP/PNG, integer 2× cover. **File:**
`shared/backgrounds/silicon-board-sky.webp`.

```text
SUBJECT: A wide background plate of a macro circuit board clean-room at night. A graphite solder-mask field with cold cyan copper traces; ceramic chip packages and via rings recede into a thin cold haze; a single low-contrast cyan interrupt trace runs through the middle distance; dark upper corners and a dark lower third; no characters, no text, no labels. Orthographic side view, atmospheric depth from layered values and dither, no warm key light, no hard horizon at player height.

Pixel art for a side-view 2D platformer set inside a circuit board. Native pixel grid, hard square pixels, crisp edges, no anti-aliasing, no smoothing. Orthographic side view, macro circuit-board scale; atmospheric depth from layered values and dither, not a global gradient; cold cyan edge light and graphite shadows, no warm key light. Solder-mask grain, copper wear, ceramic packages, via holes, ribbon cables, flux dust and cold condensation. Clean-room hardware, wry deadpan tone, 12+ friendly: never gory, no biology. The board is a landscape, not a textbook diagram; use orthogonal traces, chip sockets, pin rows and actuator arms as architecture.

Palette ramps: teal #05090b #101a20 #1d2f38; bone #c9b79a #f2e8d5 #fff8e8; bone shadow #5f736e #7a8f8a #9db4ad; nerve #b8862b #ffd166 #fff3b0; joint #3f9fb5 #7bdff2 #c9f7ff; muscle #a82a4a #ef476f #ff9fb2; sage #6f847d #9db4ad #c4d4ce; ink #000000 #05090b #2a3f47. Use only these ramp steps; no intermediate blends, no unapproved orange. Silicon world mapping: graphite = teal/ink, ceramic = bone, dust = bone shadow/sage, signal = joint cyan. Nerve amber and muscle pink are not used in world art.

640×368, wide, opaque, edge-to-edge background plate, no frame. Keep the upper corners and lower third dark and low-contrast; keep important detail inside the central 70% for the 2× cover crop. Hard pixel edges; no anti-aliasing.
```

**Negative:** `NEGATIVE_BACKGROUND_TECH` + `single focal landmark, obvious repeat, warm glow, nerve trunks, organic roots`.

**Acceptance:** At 1280×720 cover crop, the HUD and player silhouettes read; no hard horizon at player height; no characters or text; no obvious focal landmark; ≤300 KB.

**Runtime (2026-11-02):** the supplied 2720×1568 plate was cropped to 2720×1564 at y=2, Lanczos-downscaled to **1280×736 at 1×**, palette-quantised to the six Silicon ramps with a 2×2 Bayer dither, and exported as a 99,538-byte lossless WebP. This deviates from the 640×368/2× source target above. Report: `art-source/nanobanan/reports/silicon/silicon-board-sky.report.json`.

### 5.2 `bg.silicon_board.far` [NOT DONE, DEFFERED]

**Style:** `STYLE_BACKGROUND_TECH`. **Frame:** `FRAME_PARALLAX`. **Source:**
1024×512, transparent. **File:** `shared/backgrounds/silicon-board-far.webp`.

```text
SUBJECT: A seamless 2:1 far parallax layer: distant chip arrays and trace grids in very low-contrast graphite and muted cyan, large slow shapes, no focal object, no ground line, no characters, no labels. Orthographic side view; every colour block at least 2×2 pixels; tile seamlessly on all four edges.

Pixel art for a side-view 2D platformer set inside a circuit board. Native pixel grid, hard square pixels, crisp edges, no anti-aliasing, no smoothing. Orthographic side view, macro circuit-board scale; atmospheric depth from layered values and dither, not a global gradient; cold cyan edge light and graphite shadows, no warm key light. Solder-mask grain, copper wear, ceramic packages, via holes, ribbon cables, flux dust and cold condensation. Clean-room hardware, wry deadpan tone, 12+ friendly: never gory, no biology. The board is a landscape, not a textbook diagram; use orthogonal traces, chip sockets, pin rows and actuator arms as architecture.

Palette ramps: teal #05090b #101a20 #1d2f38; bone #c9b79a #f2e8d5 #fff8e8; bone shadow #5f736e #7a8f8a #9db4ad; nerve #b8862b #ffd166 #fff3b0; joint #3f9fb5 #7bdff2 #c9f7ff; muscle #a82a4a #ef476f #ff9fb2; sage #6f847d #9db4ad #c4d4ce; ink #000000 #05090b #2a3f47. Use only these ramp steps; no intermediate blends, no unapproved orange. Silicon world mapping: graphite = teal/ink, ceramic = bone, dust = bone shadow/sage, signal = joint cyan. Nerve amber and muscle pink are not used in world art.

1024×512, 2:1, transparent background, isolated layer, no frame. Tile seamlessly on all four edges; every colour block at least 2×2 pixels; verify as a 2×2 repeat at native size and at 1280×720. Hard pixel edges; no anti-aliasing.
```

**Negative:** `NEGATIVE_BACKGROUND_TECH` + `single focal landmark, obvious repeat, warm glow, nerve trunks, organic roots`.

**Acceptance:** Low contrast, large slow shapes; no focal landmark; both-axis seam check passes; no text; ≤300 KB.

### 5.3 `bg.silicon_board.mid` [NOT DONE, DEFFERED]

**Style:** `STYLE_BACKGROUND_TECH`. **Frame:** `FRAME_PARALLAX`. **Source:**
1024×512, transparent. **File:** `shared/backgrounds/silicon-board-mid.webp`.

```text
SUBJECT: A seamless 2:1 mid parallax layer: socketed controller and CPU chips, ribbon cables, ceramic capacitors, via rings, and cold cyan traces; medium contrast; no focal object, no characters, no faces, no labels. Orthographic side view; every colour block at least 2×2 pixels; tile seamlessly on all four edges.

Pixel art for a side-view 2D platformer set inside a circuit board. Native pixel grid, hard square pixels, crisp edges, no anti-aliasing, no smoothing. Orthographic side view, macro circuit-board scale; atmospheric depth from layered values and dither, not a global gradient; cold cyan edge light and graphite shadows, no warm key light. Solder-mask grain, copper wear, ceramic packages, via holes, ribbon cables, flux dust and cold condensation. Clean-room hardware, wry deadpan tone, 12+ friendly: never gory, no biology. The board is a landscape, not a textbook diagram; use orthogonal traces, chip sockets, pin rows and actuator arms as architecture.

Palette ramps: teal #05090b #101a20 #1d2f38; bone #c9b79a #f2e8d5 #fff8e8; bone shadow #5f736e #7a8f8a #9db4ad; nerve #b8862b #ffd166 #fff3b0; joint #3f9fb5 #7bdff2 #c9f7ff; muscle #a82a4a #ef476f #ff9fb2; sage #6f847d #9db4ad #c4d4ce; ink #000000 #05090b #2a3f47. Use only these ramp steps; no intermediate blends, no unapproved orange. Silicon world mapping: graphite = teal/ink, ceramic = bone, dust = bone shadow/sage, signal = joint cyan. Nerve amber and muscle pink are not used in world art.

1024×512, 2:1, transparent background, isolated layer, no frame. Tile seamlessly on all four edges; every colour block at least 2×2 pixels; verify as a 2×2 repeat at native size and at 1280×720. Hard pixel edges; no anti-aliasing.
```

**Negative:** `NEGATIVE_BACKGROUND_TECH` + `single focal landmark, obvious repeat, warm glow, nerve trunks, organic roots`.

**Acceptance:** Medium contrast; no obvious repeat; no nerve motifs; both-axis seam check passes; no text; ≤300 KB.

### 5.4 `bg.silicon_board.near` [NOT DONE, DEFFERED]

**Style:** `STYLE_BACKGROUND_TECH`. **Frame:** `FRAME_PARALLAX`. **Source:**
1024×512, transparent. **File:** `shared/backgrounds/silicon-board-near.webp`.

```text
SUBJECT: A seamless 2:1 near foreground parallax layer: dark graphite chip legs, connector pins, and cable ribbons framing the left and right edges and the top; large fully transparent gaps across the centre and lower third; very high contrast graphite silhouettes; no characters, no faces, no labels, no opaque band across the play area. Orthographic side view; tile seamlessly on all four edges.

Pixel art for a side-view 2D platformer set inside a circuit board. Native pixel grid, hard square pixels, crisp edges, no anti-aliasing, no smoothing. Orthographic side view, macro circuit-board scale; atmospheric depth from layered values and dither, not a global gradient; cold cyan edge light and graphite shadows, no warm key light. Solder-mask grain, copper wear, ceramic packages, via holes, ribbon cables, flux dust and cold condensation. Clean-room hardware, wry deadpan tone, 12+ friendly: never gory, no biology. The board is a landscape, not a textbook diagram; use orthogonal traces, chip sockets, pin rows and actuator arms as architecture.

Palette ramps: teal #05090b #101a20 #1d2f38; bone #c9b79a #f2e8d5 #fff8e8; bone shadow #5f736e #7a8f8a #9db4ad; nerve #b8862b #ffd166 #fff3b0; joint #3f9fb5 #7bdff2 #c9f7ff; muscle #a82a4a #ef476f #ff9fb2; sage #6f847d #9db4ad #c4d4ce; ink #000000 #05090b #2a3f47. Use only these ramp steps; no intermediate blends, no unapproved orange. Silicon world mapping: graphite = teal/ink, ceramic = bone, dust = bone shadow/sage, signal = joint cyan. Nerve amber and muscle pink are not used in world art.

1024×512, 2:1, transparent background, isolated layer, no frame. Tile seamlessly on all four edges; every colour block at least 2×2 pixels; verify as a 2×2 repeat at native size and at 1280×720. Hard pixel edges; no anti-aliasing.
```

**Negative:** `NEGATIVE_BACKGROUND_TECH` + `opaque centre, warm glow, nerve trunks, organic roots`.

**Acceptance:** Centre and lower third stay transparent; the layer does not hide platforms or players; both-axis seam check passes; no text; ≤300 KB.

---

## 6. Material atlas prompt

### 6.1 `tile.circuit.atlas` [DONE]

**Style:** `STYLE_ATLAS_TECH`. **Frame:** `FRAME_ATLAS`. **Source/export:**
128×128 PNG, 4×4 grid, 32×32 frames, 2×2 clusters, opaque cells. **File:**
`shared/tiles/circuit-atlas.png`.

```text
SUBJECT: A seamless pixel-art PCB material swatch for a side-view platformer: graphite solder mask with cold cyan copper traces, bone-white ceramic pads, via rings, fine solder grain, subtle flux dust, and broad soft mottling. No large cracks, no embedded objects, no symbols, no labels, no grid, no border. Uniform flat lighting, no directional highlight, no baked edge shading, no vignette, no bevel, no drop shadow. Orthographic surface; every colour block at least 2×2 pixels; tile seamlessly on all four edges at 32×32. Pixel-clean to a 512×512 working swatch.

Pixel-art seamless material texture for a side-view platformer set inside a circuit board. Native pixel grid, hard square pixels, every colour block at least 2×2 pixels, no anti-aliasing, no smoothing. Flat fills from three-step ramps; 50% dither. Uniform flat lighting; orthographic surface, seamless material swatch. Clean-room hardware, wry deadpan tone, 12+ friendly. The material reads as one coherent PCB surface: solder mask, copper traces, ceramic pads, via rings and fine grain. No characters, no scene, no text.

Palette ramps: teal #05090b #101a20 #1d2f38; bone #c9b79a #f2e8d5 #fff8e8; bone shadow #5f736e #7a8f8a #9db4ad; nerve #b8862b #ffd166 #fff3b0; joint #3f9fb5 #7bdff2 #c9f7ff; muscle #a82a4a #ef476f #ff9fb2; sage #6f847d #9db4ad #c4d4ce; ink #000000 #05090b #2a3f47. Use only these ramp steps; no intermediate blends, no unapproved orange. Silicon world mapping: graphite = teal/ink, ceramic = bone, dust = bone shadow/sage, signal = joint cyan. Nerve amber and muscle pink are not used in world art.

1024×1024 seamless material swatch concept, uniform flat lighting, no grid, no labels, no frame, no directional highlight, no baked edge. Hard pixel edges; every colour block at least 2×2 pixels. Pixel-clean to a 512×512 working swatch; assemble 32×32 frames offline.
```

**Negative:** `NEGATIVE_ATLAS_TECH` + `directional edge, grid lines, characters, scene, nerve, bone tissue, skeletal bone, muscle tissue`.

**Atlas assembly:**

- 4 columns × 4 rows, row-major; `x = column × 32`, `y = row × 32`.
- 16 regions `mask-0` … `mask-15`.
- For each frame, draw the hard PCB edge only on sides where the cardinal mask
  bit is absent. Do not bake a single top edge.
- Every cell opaque; no gutters or transparent seams.
- The same atlas serves `circuit-edge` and `substrate-edge`; the material tint
  differentiates them. Do not bake a final tint.

**Acceptance:** 128×128; 16 regions; each frame tiles 3×3; no seam; variants
distinct; no text; ≤80 KB.

**Runtime (2026-11-02):** placeholder retained. The supplied plate is a
continuous 2048×2048 PCB material swatch, not a 4×4 frame atlas. The direct
downscale destroys the traces; the 16-crop and mask-edge assemblies are
non-tileable and too bright in the room. See
`art-source/nanobanan/reports/silicon/circuit-atlas.report.json`.

---

## 7. Agent prompt

### 7.1 `sprite.agent.cpu` [DONE]

**Style:** `STYLE_SPRITE_TECH`. **Frame:** `FRAME_ENTITY_CONCEPT`. **Source:**
18×18 PNG; 36×36 display. **File:** `shared/sprites/agent-cpu.png`.

```text
SUBJECT: One small CPU Core worker — a square ceramic chip package with two rows of metal pins for legs, a cold cyan status visor, two tiny arms, and a small hard hat/headset; one hand holds a tiny repair tool. The body is boxy and ceramic, slightly scuffed; the visor is one cyan bar, not a human face. Tired, fussy, deadpan posture; the output side of the loop, not a brain, not a boss. Strong silhouette at small size; no text, no logo, no organic curves.

Pixel art for a side-view 2D platformer set inside a circuit board. Native pixel grid, hard square pixels, crisp edges, no anti-aliasing, no smoothing, no mixed pixel sizes. Bold dark graphite-teal outlines, one pixel at final sprite scale; flat fills from three-step ramps; 50% dither for solder-mask grain, copper wear, flux dust and cold condensation. Clean-room hardware, wry deadpan tone, weird and fussy but 12+ friendly: never gory, no biology, no shock humour. Strong readable shapes; characters and props must read as small sprites. Side view or slight 3/4 view. Orthogonal hardware geometry, not organic curves.

Palette ramps: teal #05090b #101a20 #1d2f38; bone #c9b79a #f2e8d5 #fff8e8; bone shadow #5f736e #7a8f8a #9db4ad; nerve #b8862b #ffd166 #fff3b0; joint #3f9fb5 #7bdff2 #c9f7ff; muscle #a82a4a #ef476f #ff9fb2; sage #6f847d #9db4ad #c4d4ce; ink #000000 #05090b #2a3f47. Use only these ramp steps; no intermediate blends, no unapproved orange. Silicon world mapping: graphite = teal/ink, ceramic = bone, dust = bone shadow/sage, signal = joint cyan. Nerve amber and muscle pink are not used in world art.

Full object, centred, with a clear empty margin on all sides, isolated on a flat solid magenta #FF00FF background; no ground, no pedestal, no cast shadow, no scene, no frame. Draw the object large and clear; do not draw a pixel grid, a tiny sprite, or a sprite sheet. Hard pixel edges; no anti-aliasing.
```

**Negative:** `NEGATIVE_TECH` + `humanoid body, brain shape, face, extra arms, extra legs, neuron, dendrite, axon, text`.

**Pixel pass:** 18×18; feet on the bottom padding line; 1 px margin; palette
quantised; no anti-aliasing; static only. Do not add an idle sheet in this pass.

**Acceptance:** Reads at 36×36 on a graphite contact sheet; the pin legs, cyan
visor, and hard hat read; distinct from the sockets and scans; survives the warm
interaction tint; no text; ≤16 KB.

---

## 8. Scan prompts

All scans use `STYLE_ICON_TECH`, `FRAME_ENTITY_CONCEPT`, 18×18 source / 36×36
display, and `NEGATIVE_TECH` + `face, eyes, character pose, arrow, label, 3D bevel`.
Each is a flat icon with a thin cyan scan rim, no face.

### 8.1 `sprite.scan.sensor` [DONE]

```text
SUBJECT: A flat diagrammatic scan icon of a sensor pad: a graphite plate with a cold cyan sensing eye, two small contact pins, and a short waveform dash; a thin cyan scan rim. No face, no character pose, no text, no arrow.
```

**File:** `shared/sprites/scan-sensor.png`.

### 8.2 `sprite.scan.interrupt` [DONE]

```text
SUBJECT: A flat diagrammatic scan icon of an interrupt line: a bright cyan trace running left to right, a connector pin at each end, and a small branch/diode mark; a thin cyan scan rim. No face, no character pose, no text, no arrow.
```

**File:** `shared/sprites/scan-interrupt.png`.

**Runtime (2026-11-02):** placeholder retained. The 18×18 fit is 16×4 and
quantises to 64 ink pixels; the cyan trace and scan rim vanish and the icon
does not read at 36×36. Report:
`art-source/nanobanan/reports/silicon/scan-interrupt.fit.json`.

### 8.3 `sprite.scan.controller` [DONE]

```text
SUBJECT: A flat diagrammatic scan icon of an interrupt controller: a socketed chip with a cyan-lit slot, a simple logic-gate mark, and two pin rows; a thin cyan scan rim. No face, no character pose, no text.
```

**File:** `shared/sprites/scan-controller.png`.

### 8.4 `sprite.scan.cpu` [DONE]

```text
SUBJECT: A flat diagrammatic scan icon of a CPU: a square ceramic package with two pin rows and a cyan die window; a thin cyan scan rim. No face, no character pose, no text.
```

**File:** `shared/sprites/scan-cpu.png`.

### 8.5 `sprite.scan.actuator` [DONE]

```text
SUBJECT: A flat diagrammatic scan icon of an actuator: a mechanical arm with a cyan piston, a hinge, and a ceramic mount; a thin cyan scan rim. No face, no character pose, no text, no arrow.
```

**File:** `shared/sprites/scan-actuator.png`.

**Scan acceptance:** Each reads at 36×36; the five silhouettes are distinct;
no face; no text; the cyan rim survives; ≤16 KB.

---

## 9. Pads and consoles

### 9.1 `sprite.pad.sensor` [DONE]

**Style:** `STYLE_SPRITE_TECH`. **Frame:** `FRAME_ENTITY_CONCEPT`. **File:**
`shared/sprites/pad-sensor.png`.

```text
SUBJECT: A floor sensor pad: a graphite plate with a cold cyan sensing eye, four corner bolts, and two worn contact strips; slightly scuffed; strong flat silhouette. No face, no character, no text, no organic curves.
```

**Negative:** `NEGATIVE_TECH` + `face, character, scene, text, organic curve`.

### 9.2 `sprite.console.sensor` [DONE]

**Style:** `STYLE_SPRITE_TECH`. **Frame:** `FRAME_ENTITY_CONCEPT`. **File:**
`shared/sprites/console-sensor.png`.

```text
SUBJECT: A small sensor console: a graphite box with a cold cyan screen, one dial, a short probe antenna, and a cable stub; a bone-white ceramic bezel; slightly worn. No face, no character, no text, no organic curves.
```

**Negative:** `NEGATIVE_TECH` + `face, character, scene, text, organic curve`.

### 9.3 `sprite.console.transfer` [DONE]

**Style:** `STYLE_SPRITE_TECH`. **Frame:** `FRAME_ENTITY_CONCEPT`. **File:**
`shared/sprites/console-transfer.png`.

```text
SUBJECT: A small transfer console: a graphite terminal with a cold cyan screen, a card slot, and two ceramic buttons; a bone-white bezel; slightly worn. No face, no character, no text, no organic curves.
```

**Negative:** `NEGATIVE_TECH` + `face, character, scene, text, organic curve`.

**Acceptance:** Reads at 36×36; the pad and the two consoles are distinct;
base at the bottom padding line; warm tint check; no text; ≤16 KB each.

---

## 10. Props

### 10.1 `sprite.prop.route_plug` [DONE]

**Style:** `STYLE_SPRITE_TECH`. **Frame:** `FRAME_ENTITY_CONCEPT`. **File:**
`shared/sprites/prop-route-plug.png`.

```text
SUBJECT: A small cyan route plug: a jumper connector with two metal pins, a thumb tab, and a short cable stub; a bone-white ceramic collar; strong triangular silhouette. No face, no eyes, no character, no text, no organic curve.
```

**Negative:** `NEGATIVE_TECH` + `face, eyes, character, scene, text, organic curve`.

### 10.2 `sprite.prop.work_token` (optional) [DONE]

**Style:** `STYLE_SPRITE_TECH`. **Frame:** `FRAME_ENTITY_CONCEPT`. **File:**
`shared/sprites/prop-work-token.png`.

```text
SUBJECT: A small work token: a graphite gear with a cold cyan core and a bone-white ceramic rim; strong circular silhouette; worn teeth. No face, no eyes, no character, no text, no organic curve.
```

**Negative:** `NEGATIVE_TECH` + `face, eyes, character, scene, text, organic curve`.

**Acceptance:** Route plug reads at 36×36 and matches the triangular socket
language; work token reads as a gear, not a coin; warm tint check; no text;
≤16 KB each. The work token is optional; do not add it to the manifest unless
the room references it.

**Runtime (2026-11-02):** not wired. The room does not reference it; the source
was processed for review only. Preview:
`art-source/previews/nanobanan/silicon/prop-work-token-8x.png`.

---

## 11. Sockets

### 11.1 `sprite.socket.controller` [DONE]

**Style:** `STYLE_SPRITE_TECH`. **Frame:** `FRAME_ENTITY_CONCEPT`. **File:**
`shared/sprites/socket-controller.png`.

```text
SUBJECT: A controller socket: a bone-white ceramic frame around an open, cold cyan-lit slot, two guide rails, and a small logic-gate notch; the opening is the dominant shape; slightly worn. No face, no keyhole, no lock, no text, no organic valve.
```

**Negative:** `NEGATIVE_TECH` + `keyhole, lock, mechanical key, face, text, organic valve`.

### 11.2 `sprite.socket.cpu` [DONE]

**Style:** `STYLE_SPRITE_TECH`. **Frame:** `FRAME_ENTITY_CONCEPT`. **File:**
`shared/sprites/socket-cpu.png`.

```text
SUBJECT: A decoy CPU socket: a graphite frame around a blank, closed slot, two guide rails, and a dull status dot; visibly different from the controller socket; the closed slot is the dominant shape; slightly worn. No face, no keyhole, no lock, no text, no organic valve.
```

**Negative:** `NEGATIVE_TECH` + `keyhole, lock, mechanical key, face, text, organic valve`.

**Acceptance:** The controller socket reads as open and inviting; the CPU socket
reads as closed and wrong; both read at 36×36; distinct silhouettes; warm tint
check; no text; ≤16 KB each.

---

## 12. Gate and exit

### 12.1 `sprite.gate.actuator` [DONE]

**Style:** `STYLE_SPRITE_TECH`. **Frame:** `FRAME_ENTITY_CONCEPT`. **File:**
`shared/sprites/gate-actuator.png`.

```text
SUBJECT: A closed actuator gate: a heavy graphite barrier with a cold cyan piston, a hinge, and a bone-white ceramic latch; mechanical, closed, strong silhouette; base at the bottom. No face, no keyhole, no lock, no text, no organic valve.
```

**Negative:** `NEGATIVE_TECH` + `keyhole, lock, mechanical key, face, text, organic valve`.

**Acceptance:** Reads as a closed mechanical gate at 36×36; distinct from the
exit; works over circuit and substrate backgrounds; no baked glow; no text;
≤16 KB.

### 12.2 `sprite.exit.silicon`

**Style:** `STYLE_SPRITE_TECH`. **Frame:** `FRAME_ENTITY_CONCEPT`. **File:**
`shared/sprites/exit-silicon.png`.

```text
SUBJECT: A Silicon exit port: a graphite ring with a cold cyan-lit interior, two bone-white ceramic clamps, and a hard cold light beyond; the opening fills most of the canvas; destination, not a door. No face, no character, no text, no organic valve.
```

**Negative:** `NEGATIVE_TECH` + `face, character, text, organic valve, gore`.

**Acceptance:** Reads as a destination at 36×36; cold light is visible; distinct
from the actuator gate; no character; no text; ≤16 KB.

---

## 13. Optional CPU portrait

### 13.1 `ui.portrait.cpu`

**Style:** `STYLE_ICON_TECH`. **Frame:** `FRAME_PORTRAIT`. **Source:** 32×32
target; the UI portrait surface is deferred. **File:**
`shared/ui/portrait-cpu.png`.

```text
SUBJECT: A square bust portrait of the CPU Core worker: a boxy ceramic chip head with a cold cyan status visor, pin-row shoulders, and a small hard hat/headset; tired, fussy, deadpan; the output side of the loop, not a brain. No human face, no brain, no text, no scene, no frame.
```

**Negative:** `NEGATIVE_TECH` + `full body, scene, text, frame, brain, humanoid robot, face`.

**Acceptance:** Reads at 32×32 and 2×; the cyan visor and pin shoulders read; no
text; optional, does not block the level.

---

## 14. Export and acceptance

### 14.1 Dimensions

| Type | Source | Runtime | Format |
|---|---|---|---|
| Entity / scan / prop / socket / gate / exit | 18×18 | 36×36 at 2× | PNG with alpha |
| Background sky | 640×368 | 1280×736 cover at 2× | lossless WebP/PNG |
| Parallax | 1024×512 | tile 1:1, 2×2 clusters | lossless WebP/PNG with alpha |
| Atlas | 128×128 | 32×32 frames at 1:1 | PNG, opaque cells |
| Portrait | 32×32 | UI deferred | PNG with alpha |

### 14.2 Alpha and trimming

1. Generate on flat magenta `#FF00FF`.
2. Key the background (`npm run art:key`); inspect edges at 400%.
3. Trim to the alpha bounding box; pad to the source cell.
4. Entity: base of the lowest visible element on the bottom padding line, 1 px
   margin.
5. No baked drop shadow, ground shadow, pedestal, or glow.
6. Alpha is 0 or 255; no semi-transparent fringe.

### 14.3 Pixel grid

- Every pixel from the nine ramps.
- 1 px source outline; no anti-aliasing.
- 2×2 minimum colour blocks on parallax and atlas frames.
- No fractional scaling, rotation, or sub-pixel placement.
- No JPG or lossy WebP.

### 14.4 Budgets

| Asset | Budget |
|---|---|
| Entity PNG | ≤16 KB each |
| Background sky | ≤300 KB |
| Parallax layer | ≤300 KB each |
| Atlas | ≤80 KB |
| Portrait | ≤8 KB |
| Audio cue | ≤120 KB each (reused placeholders) |
| Total Silicon visual assets | ≤3 MB |

---

## 15. Integration

### 15.1 Manifest

Add final entries to `public/packs/silicon-reflex/assets.final.json`:

```json
{
  "schemaVersion": "1.1",
  "id": "silicon-reflex.final",
  "assets": {
    "sprite.agent.cpu": {
      "type": "sprite",
      "src": "shared/sprites/agent-cpu.png",
      "license": "Ludo AI Commercial (paid)"
    },
    "tile.circuit.atlas": {
      "type": "atlas",
      "src": "shared/tiles/circuit-atlas.png",
      "width": 128,
      "height": 128,
      "regions": {
        "mask-0": { "x": 0, "y": 0, "width": 32, "height": 32 },
        "mask-15": { "x": 96, "y": 96, "width": 32, "height": 32 }
      },
      "license": "Ludo AI Commercial (paid)"
    }
  }
}
```

Include every region `mask-0`–`mask-15`; the example is abbreviated.

### 15.2 Licences

Add a `licenses.json` entry for every final file:

```json
{
  "file": "shared/sprites/agent-cpu.png",
  "type": "image",
  "source": "Ludo.ai",
  "author": "AI-generated in Ludo.ai; art direction by Snorre",
  "license": "Ludo AI Commercial (paid)",
  "url": "https://ludo.ai/terms-of-service",
  "modified": "Generated concept 2026-11-01; pixel-cleaned at 18×18; palette quantised; background removed; grid checked",
  "aiGenerated": true
}
```

The manifest `license` must match the licence label. Placeholder atlas entries
can keep the CC0 placeholder label until the final atlas replaces them.

### 15.3 Files

| Asset | Final file |
|---|---|
| Sky | `shared/backgrounds/silicon-board-sky.webp` |
| Far | `shared/backgrounds/silicon-board-far.webp` |
| Mid | `shared/backgrounds/silicon-board-mid.webp` |
| Near | `shared/backgrounds/silicon-board-near.webp` |
| Atlas | `shared/tiles/circuit-atlas.png` |
| Agent | `shared/sprites/agent-cpu.png` |
| Route plug | `shared/sprites/prop-route-plug.png` |
| Work token | `shared/sprites/prop-work-token.png` |
| Controller socket | `shared/sprites/socket-controller.png` |
| CPU socket | `shared/sprites/socket-cpu.png` |
| Sensor pad | `shared/sprites/pad-sensor.png` |
| Sensor console | `shared/sprites/console-sensor.png` |
| Transfer console | `shared/sprites/console-transfer.png` |
| Actuator gate | `shared/sprites/gate-actuator.png` |
| Exit | `shared/sprites/exit-silicon.png` |
| Scans | `shared/sprites/scan-sensor.png`, `scan-interrupt.png`, `scan-controller.png`, `scan-cpu.png`, `scan-actuator.png` |
| Portrait | `shared/ui/portrait-cpu.png` |

### 15.4 Validation

```text
npm run pack:validate
npm run pack:smoke
npm test
npm run build
git diff --check
```

Check that every final ID resolves, the atlas regions exist, the variant sets
point at the final atlas, and no placeholder remains in a capture shot.

---

## 16. Visual review

### 16.1 Contact sheet

- 1280×720 dark graphite background.
- P1/P2 at 28×44.
- Entities at 36×36.
- Sky at 1280×720 cover.
- Mid tiled 3×.
- Badge at 32×32 and in the pill crop.
- Side-by-side with a `03-nerve-forest` still.

### 16.2 Checks

- [ ] The Silicon still reads as graphite/cyan, not teal/amber.
- [ ] No nerve trunks, myelin beads, synaptic bulbs, membrane folds, or neuron
  characters.
- [ ] The CPU Core reads as a chip worker, not a brain.
- [ ] The controller socket is visibly the integration point; the CPU socket is
  visibly the decoy.
- [ ] The actuator gate and exit are distinct.
- [ ] The scans read at 36×36; no faces.
- [ ] The atlas tiles 3×3; no seams; no directional top edge.
- [ ] The parallax tiles 2×2 on both axes at native and 1280×720.
- [ ] The HUD and player silhouettes read against the sky.
- [ ] The warm interaction tint does not destroy cyan details.
- [ ] No text, labels, arrows, or diagram lines.
- [ ] The “same game, different world” test passes.

If the Silicon still reads as a nerve forest recolour, stop and fix the theme,
not the individual asset.

---

## 17. Cut lines

In order:

1. Defer `ui.portrait.cpu` and `sprite.prop.work_token`.
2. Defer the five scans and `sprite.pad.sensor`; keep the visible pads as
   placeholders.
3. Defer `sprite.exit.silicon`; reuse `sprite.exit`.
4. Keep the four backgrounds, the material atlas, the CPU agent, the route
   plug, the controller/CPU sockets, and the actuator gate. Those carry the
   puzzle’s meaning.

Never ship faux-pixel output. A coherent placeholder is better than a broken
final asset.

---

## 18. Definition of done

- [ ] Every new Silicon asset has a prompt row and a chosen file or a declared
  placeholder.
- [ ] The P0 kit is complete; P1/P2 may remain placeholders.
- [ ] The atlas is assembled with 16 regions and validated.
- [ ] The manifest and licences resolve every final file.
- [ ] The contact sheet passes the visual-difference check.
- [ ] The runtime still passes `pack:validate`, `pack:smoke`, `npm test`,
  `npm run build`, and `git diff --check`.
- [ ] Prompt log complete; failed rows retained.

---

## 19. Asset pass log — 2026-11-02

**Status:** 13 files integrated (sky + 12 entity sprites). `sprite.scan.interrupt`
and `tile.circuit.atlas` remain placeholders. `sprite.prop.work_token` was
processed for review only and is not in the manifest.

**Next phase:** the exact catalog-flip, hub/e2e, pack-smoke, validation, and
capture steps are documented in
`public/packs/silicon-reflex/levels/01-interrupt-loop/README.md` under
“Next steps — catalog flip, hub/e2e, pack:smoke”. Do not perform them in the
asset pass.

**Source folder:** `art-source/nanobanan/new-silicon/`.

**Palette:** `art-source/nanobanan/palette.json`; Silicon ramps only:
`teal`, `bone`, `boneShadow`, `joint`, `sage`, `ink`. Nerve amber and muscle
pink were excluded from the quantiser.

**Key settings:** `npm run art:key`; `#ff00ff`, tolerance `0.18`, softness
`0.08`, alpha threshold `0.5`, despill on, **no `--trim`**; 512 px previews on
`#101a20`.

**Fit settings:** `npm run art:fit -- --config
art-source/nanobanan/fit.silicon.config.json`; cell 18×18, margin 1, alpha
threshold 128, max bytes 16384, min readable 8 px, max palette distance 64;
previews at 2× and 8× on `#101a20`; tint preview at 2×.

**Sky cleanup:** 2720×1568 source → crop 2720×1564 at y=2 → Lanczos
1280×736 → six-ramp palette with 2×2 Bayer dither (`bayer_scale=1`) → lossless
WebP, 99,538 bytes. No keying, no lossy WebP.

**Atlas cleanup:** direct 2048→128 area downscale, 16-crop sampling, and
16-crop + mask-edge assemblies were tested with exact palette quantisation and
2×2 snap. All passed palette/alpha/2×2 checks, but the direct downscale lost the
traces and the 16-crop assemblies were non-tileable and too bright in a
1280×736 room simulation. The SVG placeholder is retained; no runtime PNG was
written.

### 19.1 Per-asset log

| Asset | Source | Key report | Fit/report | Verdict | Licence |
|---|---|---|---|---|---|
| `bg.silicon_board.sky` | `bg-silicon_board-sky.jpeg` | — (opaque) | `reports/silicon/silicon-board-sky.report.json` | integrated 2026-11-02 | `Ludo.ai source (POC; plan TBD)` |
| `sprite.agent.cpu` | `sprite-agent-cpu.jpeg` | `reports/silicon/agent-cpu.key.json` | `reports/silicon/agent-cpu.fit.json` | integrated 2026-11-02 | `Ludo.ai source (POC; plan TBD)` |
| `sprite.console.sensor` | `sprite-console-sensor.jpeg` | `reports/silicon/console-sensor.key.json` | `reports/silicon/console-sensor.fit.json` | integrated 2026-11-02 | `Ludo.ai source (POC; plan TBD)` |
| `sprite.console.transfer` | `sprite-console-transfer.jpeg` | `reports/silicon/console-transfer.key.json` | `reports/silicon/console-transfer.fit.json` | integrated 2026-11-02 | `Ludo.ai source (POC; plan TBD)` |
| `sprite.gate.actuator` | `sprite-gate-actuator.jpeg` | `reports/silicon/gate-actuator.key.json` | `reports/silicon/gate-actuator.fit.json` | integrated; cyan piston lost at 18×18 | `Ludo.ai source (POC; plan TBD)` |
| `sprite.pad.sensor` | `sprite-pad-sensor.jpeg` | `reports/silicon/pad-sensor.key.json` | `reports/silicon/pad-sensor.fit.json` | integrated 2026-11-02 | `Ludo.ai source (POC; plan TBD)` |
| `sprite.prop.route_plug` | `sprite-prop-route_plug.jpeg` | `reports/silicon/prop-route-plug.key.json` | `reports/silicon/prop-route-plug.fit.json` | integrated 2026-11-02 | `Ludo.ai source (POC; plan TBD)` |
| `sprite.scan.actuator` | `sprite-scan-actuator.jpeg` | `reports/silicon/scan-actuator.key.json` | `reports/silicon/scan-actuator.fit.json` | integrated 2026-11-02 | `Ludo.ai source (POC; plan TBD)` |
| `sprite.scan.controller` | `sprite-scan-controller.jpeg` | `reports/silicon/scan-controller.key.json` | `reports/silicon/scan-controller.fit.json` | integrated 2026-11-02 | `Ludo.ai source (POC; plan TBD)` |
| `sprite.scan.cpu` | `sprite-scan-cpu.jpeg` | `reports/silicon/scan-cpu.key.json` | `reports/silicon/scan-cpu.fit.json` | integrated; palette-distance warning 76.8 | `Ludo.ai source (POC; plan TBD)` |
| `sprite.scan.interrupt` | `sprite-scan-interrupt.jpeg` | `reports/silicon/scan-interrupt.key.json` | `reports/silicon/scan-interrupt.fit.json` | placeholder; 16×4 all-ink | POC label, not wired |
| `sprite.scan.sensor` | `sprite-scan-sensor.jpeg` | `reports/silicon/scan-sensor.key.json` | `reports/silicon/scan-sensor.fit.json` | integrated 2026-11-02 | `Ludo.ai source (POC; plan TBD)` |
| `sprite.socket.controller` | `sprite-socket-controller.jpeg` | `reports/silicon/socket-controller.key.json` | `reports/silicon/socket-controller.fit.json` | integrated 2026-11-02 | `Ludo.ai source (POC; plan TBD)` |
| `sprite.socket.cpu` | `sprite-socket-cpu.jpeg` | `reports/silicon/socket-cpu.key.json` | `reports/silicon/socket-cpu.fit.json` | integrated 2026-11-02 | `Ludo.ai source (POC; plan TBD)` |
| `sprite.prop.work_token` | `sprite-prop-work_token.jpeg` | `reports/silicon/prop-work-token.key.json` | `reports/silicon/prop-work-token.fit.json` | review only; not wired | POC label, not wired |
| `tile.circuit.atlas` | `tile-circuit-atlas.jpeg` | — | `reports/silicon/circuit-atlas.report.json` | placeholder; SVG retained | `CC0-1.0` (SVG placeholder) |

Report paths are relative to `art-source/nanobanan/`. Runtime previews are in
`art-source/previews/nanobanan/silicon/`; the 2× and 8× contact sheets are
`contact-2x.png` and `contact-8x.png`. The atlas attempts are
`circuit-atlas-128-direct-4x.png`, `circuit-atlas-16crop-4x.png`,
`circuit-atlas-mask-edge-4x.png`, and `circuit-atlas-room-sim.png`.
