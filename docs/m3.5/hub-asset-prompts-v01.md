# M3.5 — Bathroom Hub Asset Prompts v0.1

- **Status:** Draft prompt pack · 1 November 2026
- **Owner:** Snorre
- **Scope:** Final raster art and audio prompts for the M1.9 bathroom hub / main menu
- **Target milestone:** M3.5 — bathroom hub art pass
- **Depends on:** M1.9 hub, M3 art direction, ADR-0047–0049, ADR-0060–0065
- **Related:** [`../m1.9/README.md`](../m1.9/README.md) · [`../m1.9/remaining-work.md`](../m1.9/remaining-work.md) · [`../m3/asset-requirements-v01.md`](../m3/asset-requirements-v01.md) · [`../m3/background-asset-requirements-v01.md`](../m3/background-asset-requirements-v01.md) · [`../prompts/asset-generation-template.md`](../prompts/asset-generation-template.md) · [`../adr-hub/README.md`](../adr-hub/README.md) · [`../../screenshots/m1.9-hub.png`](../../screenshots/m1.9-hub.png)

> **The rule:** AI generates raster art only. The DOM panel, cards, buttons, focus states, text, settings, confirmation dialog, and layout chrome stay in CSS/DOM. The only AI-generated text asset is the SHRINKONAUTS wordmark; the poster text is overlaid at runtime.

> **Scope boundary:** This is a separate M3.5 pass. It does not change the M3 21-image gameplay register, the M3 `03-nerve-forest` environment scope, or the 04 placeholder boundary.

---

## 0. Summary

| Decision | Value |
|---|---|
| Screen | Existing bathroom hub at `/` |
| Quality target | Final M3.5 hub art, ready for video/GDD/playtest |
| Layout | Full hub redesign |
| Composition | Machine left, civilian centre, DOM panel right as a wall terminal, logo top-left |
| Source/display scale | **640×360 source at 2× = 1280×720 display** |
| Style | Retro-futuristic laundry lab inside a domestic bathroom |
| Palette | Locked game ramps + hub-only cool appliance-grey ramp |
| Civilian | Tired adult sci-fi fan in hoodie + pajama pants |
| Generator | Nano Banana first, Ludo.ai fallback |
| Motion | Keep the current launch beats; add a six-frame civilian walk cycle; use a hard alpha/flash instead of fractional scaling |
| Logo | Full AI wordmark, with a CSS wordmark fallback |
| Separate props | Poster, cartridges, toy astronaut, neuron plush, detergent bottles, basket, towel |
| Audio | Six Ludo Audio cues; no music |

**Why one background plate instead of four parallax layers:** the hub camera does not scroll. Four far/mid/near layers would cost four generations and add no visible depth. One 640×360 scene plate is the right scope. If the hub later gains camera drift, split the approved plate into layers.

---

## 1. Decisions locked

- [x] Existing bathroom hub, not a separate title screen.
- [x] M3.5 final-quality art pass.
- [x] Full hub layout redesign.
- [x] Machine left, civilian centre, DOM panel right, logo top-left.
- [x] 640×360 source at 2× display.
- [x] Retro-futuristic laundry lab.
- [x] Tired sci-fi-fan lab tech in a hoodie and pajama pants.
- [x] Nano Banana first, with reference images and 16:9 where supported.
- [x] Hub-only cool appliance-grey ramp.
- [x] Keep the current launch beats and add a civilian walk cycle; replace the fractional civilian scale with a hard alpha/flash so the pixel art stays sharp.
- [x] Poster, cartridges, toy astronaut, neuron plush, detergent bottles, basket, and towel are separate assets.
- [x] Full AI wordmark, with a fallback plan.
- [x] Six hub audio cues.

### Open decisions

- [ ] Civilian skin tone: keep the stylized bone/sage/muscle face, or add a hub-only skin ramp?
- [ ] Logo fallback: is a Silkscreen CSS wordmark + small AI emblem acceptable if the AI wordmark fails?
- [ ] P1 prop scope: keep all five small props, or cut them if time is tight?
- [ ] Panel information architecture: keep the current sections and restyle, or simplify the panel?
- [ ] Tiny astronaut: reuse the existing P1 sprite at 1×, or generate a dedicated menu pose?
- [ ] `audio.cue.hub.hum`: ambient loop, or one-shot cue?

---

## 2. What Nano Banana should and should not generate

### Generate with AI

| Asset | Why it is worth generating |
|---|---|
| `bg.bathroom.wall` | The hero scene plate: room, tiles, pipes, shelf, lighting, grime. Hard to build convincingly in CSS. |
| `sprite.prop.washer` | The Shrink-O-Matic body: a unique hero prop with lab modifications. |
| `sprite.prop.washer.door` | Circular porthole door with glass, rim, handle, hinges. |
| `sprite.prop.washer.drum` | Rotating drum interior with towels and a sock. |
| `sprite.player.civilian` | The real-world lab tech; a character sprite with a specific outfit. |
| `sprite.player.civilian.walk` | Six-frame walk cycle; a source sheet. |
| `ui.logo.shrinkonauts` | The game wordmark; the only AI-generated text asset. |
| `sprite.prop.poster` | In-world safety poster graphic; text is overlaid. |
| `sprite.prop.cartridge.anatomy` | Anatomy cycle cartridge identity. |
| `sprite.prop.cartridge.silicon` | Silicon cycle cartridge identity. |
| `sprite.prop.toy.astronaut` | Shelf prop; ties the real world to the game. |
| `sprite.prop.plush.neuron` | Shelf prop; ties the real world to the body. |
| `sprite.prop.detergent.bottles` | Retro lab-reagent detergent bottles. |
| `sprite.prop.laundry.basket` | Basket with towels and a sock. |
| `sprite.prop.towel` | Hanging damp towel. |

### Keep in CSS / DOM / code

| Element | Why not AI |
|---|---|
| Menu panel, cards, radios, buttons | Accessibility, text scaling, focus, responsive layout. |
| Text labels, headings, status, settings | Must stay crisp and editable. |
| Cycle card icons | Derive from the approved cartridges; no separate AI generation. |
| Panel frame, scanlines, screws, cable | CSS can do this crisply and responsively. |
| Hover, focus, selected, disabled states | CSS. |
| Loading spinner, skip button, confirm dialog | DOM. |
| Bubbles, glow pulses, screen blink | Phaser tweens/particles. |
| The tiny astronaut | Reuse the existing P1 runtime sprite at 1×. |
| Audio playback, mute, volume | Runtime code. |

---

## 3. Asset register

Paths are relative to `public/hub/bathroom/assets.final.json`, so `src` values resolve under `public/hub/bathroom/`.

| Asset ID | Type | Source | Display | Manifest `src` | Priority |
|---|---|---:|---:|---|---|
| `bg.bathroom.wall` | background | 640×360 | 1280×720 | `shared/backgrounds/bathroom-wall.webp` | P0 |
| `sprite.prop.washer` | sprite | 180×240 | 360×480 | `shared/sprites/washer.png` | P0 |
| `sprite.prop.washer.door` | sprite | 88×88 | 176×176 | `shared/sprites/washer-door.png` | P0 |
| `sprite.prop.washer.drum` | sprite | 80×80 | 160×160 | `shared/sprites/washer-drum.png` | P0 |
| `sprite.player.civilian` | sprite | 32×64 | 64×128 | `shared/sprites/civilian.png` | P0 |
| `sprite.player.civilian.walk` | sheet | 6 × 32×64 | 6 × 64×128 | `shared/sprites/civilian-walk.png` | P0 |
| `ui.logo.shrinkonauts` | image | 200×48 | 400×96 | `shared/ui/logo-shrinkonauts.png` | P0 |
| `sprite.prop.poster` | sprite | 48×64 | 96×128 | `shared/sprites/poster.png` | P0 |
| `sprite.prop.cartridge.anatomy` | sprite | 24×32 | 48×64 | `shared/sprites/cartridge-anatomy.png` | P0 |
| `sprite.prop.cartridge.silicon` | sprite | 24×32 | 48×64 | `shared/sprites/cartridge-silicon.png` | P0 |
| `ui.icon.cycle.anatomy` | image | 16×16 | 32×32 | `shared/ui/icon-cycle-anatomy.png` | P0 |
| `ui.icon.cycle.silicon` | image | 16×16 | 32×32 | `shared/ui/icon-cycle-silicon.png` | P0 |
| `sprite.prop.toy.astronaut` | sprite | 16×24 | 32×48 | `shared/sprites/toy-astronaut.png` | P1 |
| `sprite.prop.plush.neuron` | sprite | 24×24 | 48×48 | `shared/sprites/plush-neuron.png` | P1 |
| `sprite.prop.detergent.bottles` | sprite | 32×32 | 64×64 | `shared/sprites/detergent-bottles.png` | P1 |
| `sprite.prop.laundry.basket` | sprite | 32×24 | 64×48 | `shared/sprites/laundry-basket.png` | P1 |
| `sprite.prop.towel` | sprite | 16×32 | 32×64 | `shared/sprites/towel.png` | P1 |
| `audio.cue.hub.click` | audio | 48 kHz | — | `shared/audio/hub-click.ogg` | P1 |
| `audio.cue.hub.door` | audio | 48 kHz | — | `shared/audio/hub-door.ogg` | P1 |
| `audio.cue.hub.spin` | audio | 48 kHz | — | `shared/audio/hub-spin.ogg` | P1 |
| `audio.cue.hub.shrink` | audio | 48 kHz | — | `shared/audio/hub-shrink.ogg` | P1 |
| `audio.cue.hub.arrive` | audio | 48 kHz | — | `shared/audio/hub-arrive.ogg` | P1 |
| `audio.cue.hub.hum` | audio | 48 kHz | — | `shared/audio/hub-hum.ogg` | P1 |

### File naming

Use lowercase kebab-case, no spaces, no dots in filenames. Keep the hub content root separate from pack content.

```text
public/hub/bathroom/
  assets.final.json
  shared/
    backgrounds/bathroom-wall.webp
    sprites/washer.png
    sprites/washer-door.png
    sprites/washer-drum.png
    sprites/civilian.png
    sprites/civilian-walk.png
    sprites/poster.png
    sprites/cartridge-anatomy.png
    sprites/cartridge-silicon.png
    sprites/toy-astronaut.png
    sprites/plush-neuron.png
    sprites/detergent-bottles.png
    sprites/laundry-basket.png
    sprites/towel.png
    ui/logo-shrinkonauts.png
    ui/icon-cycle-anatomy.png
    ui/icon-cycle-silicon.png
    audio/hub-click.ogg
    audio/hub-door.ogg
    audio/hub-spin.ogg
    audio/hub-shrink.ogg
    audio/hub-arrive.ogg
    audio/hub-hum.ogg
```

---

## 4. Composition target

The hub displays at 1280×720. The DOM menu stays on the right; the machine and civilian must be visible to its left.

```text
1280×720 display = 640×360 source at 2×

┌──────────────────────────────────────────────────────────────┐
│  [SHRINKONAUTS emblem + wordmark]           ┌─────────────┐  │
│                                             │  DOM menu   │  │
│      ┌────────────────┐      🧑‍🔬           │  panel as   │  │
│      │  SHRINK-O-     │     lab tech        │  wall       │  │
│      │  MATIC         │     + basket        │  terminal   │  │
│      │   (porthole)   │                     │  (right)    │  │
│      └────────────────┘                     └─────────────┘  │
│   tiled wall · pipes · shelf · poster · warm bulb + cyan glow │
└──────────────────────────────────────────────────────────────┘
```

### Proposed display coordinates

```text
machine.x = 340
machine.y = 720
machine.scale = 2
machine.doorAnchor = (340, 540)
machine.drumAnchor = (340, 540)
machine.screen = (230, 300, 220, 50)

player.idle = (640, 700)
player.entry = (340, 700)
player.exit = (180, 700)
player.scale = 2
player.tinyScale = 1

logo = (48, 40), 400×96 display
poster = (600, 260), 96×128 display
panel = roughly x=760–1240, y=48–672
```

### Safe zones

- **Top-left 30%:** quiet wall/pipes for the logo overlay.
- **Right third:** low-contrast and uncluttered; the DOM panel covers it.
- **Left-centre:** empty appliance alcove with a floor shadow, framed by a power socket and coiled cable.
- **Centre:** room for the civilian, basket, and poster.
- **Bottom:** floor detail, drain, bath mat; no opaque band across the play/view area.

---

## 5. Tool settings and reference workflow

### Tool settings

| Setting | Nano Banana | Ludo.ai fallback |
|---|---|---|
| Scene aspect | 16:9 wide | Background / 16:9 |
| Prop aspect | 1:1 or 4:5, flat magenta | Sprite / 1:1 |
| Logo aspect | Wide horizontal, flat magenta | Icon / logo / 1:1–16:9 |
| Resolution | Largest usable output; downscale offline | 1024 px long edge |
| Variations | 4 for hero assets; 2 for small props | 4 per prompt |
| Reference | Scene, machine, civilian, cartridges | Same references if supported |
| Negative | Separate field if available; otherwise append | Separate negative field |
| Background | Flat magenta `#FF00FF` for props/characters/logo | Flat magenta |
| Pixel grid | Do **not** ask for a grid or a tiny sprite | Do **not** ask for a grid |

**Important:** every Nano Banana output is a concept plate. It is not a final 640×360 pixel-perfect asset. The final asset is downscaled, quantised, keyed, and cleaned offline.

### Reference workflow

1. Generate `bg.bathroom.wall` first. Approve it at 640×360 and at 1280×720 with the DOM panel over the right third.
2. Use the approved scene as the reference for the machine body, civilian, poster, cartridges, and props.
3. Use the approved machine body as the reference for the door and drum.
4. Use the approved civilian idle as the reference for the walk sheet.
5. Use the approved cartridges to derive the cycle card icons.
6. Use the P1 anchor only for the logo palette and outline weight; do not put the astronaut in the logo.

| Asset | Reference | Use | Do not |
|---|---|---|---|
| `bg.bathroom.wall` | None | Creates the hub style anchor | Do not copy a known game scene |
| `sprite.prop.washer` | `bg.bathroom.wall` | Palette, lighting, pixel density | Do not copy the room composition |
| `sprite.prop.washer.door` | `sprite.prop.washer` | Rim width, palette, outline weight | Do not copy the body |
| `sprite.prop.washer.drum` | `sprite.prop.washer` | Porthole fit, palette | Do not copy the body |
| `sprite.player.civilian` | `bg.bathroom.wall` | Palette, lighting, pixel density | Do not copy the room |
| `sprite.player.civilian.walk` | `sprite.player.civilian` | Character identity, outfit, proportions | Do not change the outfit or palette |
| `ui.logo.shrinkonauts` | P1 style anchor | Palette and outline weight only | Do not include the astronaut |
| `sprite.prop.poster` | `bg.bathroom.wall` | Palette and lighting | Do not copy the scene |
| `sprite.prop.cartridge.*` | `sprite.prop.washer` + scene | Palette and pixel density | Do not copy the machine |
| Small props | `bg.bathroom.wall` + machine | Palette and material language | Do not copy the composition |
| Card icons | Approved cartridges | Crop the motifs | Do not generate a new style |

**P1 reference path:** `public/packs/anatomy-reflex/shared/sprites/player-p1.png` or `art-source/previews/player-p1-idle-8x.png`.

---

## 6. Prompt pack version and assembly

```text
Prompt pack: hub-2026-11-01.1
Style version: hub-pixel-v1
Target: M3.5 bathroom hub
Tool: Nano Banana (Gemini) first; Ludo.ai fallback
Source/display: 640×360 at 2× = 1280×720
Reference anchor: approved bathroom scene
```

### Assembly formula

```text
CONCEPT PROMPT = SUBJECT + STYLE_<CATEGORY> + PALETTE_HUB + FRAME_<CATEGORY>
NEGATIVE       = NEGATIVE_<CATEGORY> + NEGATIVE_<ASSET>
```

If the tool has a separate negative field, put the negative there. Otherwise, append it after `NEGATIVE:`.

---

## 7. Shared prompt blocks

### `STYLE_HUB_SCENE`

```text
Pixel art for a 2D game, native pixel grid, hard square pixels, crisp edges, no anti-aliasing, no smoothing, no mixed pixel sizes. Limited palette, three-step ramps, 50% dither for damp tile, condensation, dust and grime. Retro-futuristic domestic laundry lab: wry, tired, lived-in, gross-cute biology-adjacent but real-world, 12+ friendly, never gory, no shock humour. Orthographic front/side elevation, strong readable shapes, no tiny detail, no text, no labels, no arrows, no UI.
```

### `STYLE_HUB_PROP`

```text
Pixel art, native pixel grid, hard square pixels, crisp edges, no anti-aliasing, no smoothing, no mixed pixel sizes. Limited palette, three-step ramps, 50% dither for grime and wear. Retro-futuristic domestic laundry lab prop: chunky, practical, scuffed, gross-cute biology-adjacent but real-world, 12+ friendly, never gory. Strong iconic silhouette, readable at small size, no fine detail, no text, no labels, no logo.
```

### `STYLE_HUB_CHARACTER`

```text
Pixel art, native pixel grid, hard square pixels, crisp edges, no anti-aliasing, no smoothing, no mixed pixel sizes. Limited palette, three-step ramps, 50% dither for fabric and grime. A real-world human, not a cell creature: tired, friendly, chunky readable silhouette, side view, no fine detail. Retro-futuristic domestic laundry lab tone, 12+ friendly, never gory. No text, no labels, no logo.
```

### `STYLE_HUB_LOGO`

```text
Pixel-art game logo, native pixel grid, hard square pixels, crisp edges, no anti-aliasing, no smoothing, no mixed pixel sizes. Limited palette, three-step ramps, flat fills, hard outline, no gradient, no 3D bevel, no glossy plastic. Retro-futuristic laundry-lab sci-fi tone, 12+ friendly, bold and readable at small size.
```

### `PALETTE_HUB`

```text
Palette ramps: teal #05090b #101a20 #1d2f38; bone #c9b79a #f2e8d5 #fff8e8; bone shadow #5f736e #7a8f8a #9db4ad; nerve #b8862b #ffd166 #fff3b0; joint #3f9fb5 #7bdff2 #c9f7ff; muscle #a82a4a #ef476f #ff9fb2; sage #6f847d #9db4ad #c4d4ce; ink #000000 #05090b #2a3f47; appliance #263236 #5f7378 #9fb0ae (hub-only cool metal). Use only these ramp steps; no intermediate blends, no unapproved orange.
```

**Palette note:** the appliance ramp is a hub-only extension. Do not use it in M3 gameplay assets. The M3 nine-family palette remains the gameplay palette.

### `FRAME_HUB_SCENE`

```text
16:9 wide composition, 640×360 source, displayed at 2× (1280×720). Opaque, edge-to-edge background plate. Keep the top-left third visually quiet for a logo overlay; keep the right third low-contrast and uncluttered for a UI panel; leave a large empty appliance alcove on the left-centre. No frame, no border, no text, no UI, no characters, no appliances. Hard pixel edges; no anti-aliasing.
```

### `FRAME_HUB_PROP`

```text
Isolated object, centred, with a clear empty margin on all sides, on a flat solid magenta #FF00FF background; no ground, no pedestal, no cast shadow, no scene, no frame. Draw the object large and clear; do not draw a pixel grid, a tiny sprite, or a sprite sheet. Hard pixel edges; no anti-aliasing.
```

### `FRAME_HUB_CHARACTER`

```text
Full body, side view facing left, centred horizontally, with a clear empty margin on all sides, isolated on a flat solid magenta #FF00FF background; no ground, no pedestal, no cast shadow, no scene, no frame. Draw the character large and clear; do not draw a pixel grid, a tiny sprite, or a sprite sheet. Hard pixel edges; no anti-aliasing.
```

### `FRAME_HUB_SHEET`

```text
Uniform sprite sheet, one character and one action per sheet, consistent scale, orientation and baseline in every frame, six equal frames in a single row, flat solid magenta #FF00FF background, no labels, no grid lines, no frame border, no ground, no cast shadow. Hard pixel edges; no anti-aliasing.
```

### `FRAME_HUB_LOGO`

```text
Wide horizontal logo lockup, centred, with generous empty margin, on a flat solid magenta #FF00FF background; no rectangular frame, no scene, no extra text. Draw the logo large and clear; do not draw a pixel grid or a tiny sprite. Hard pixel edges; no anti-aliasing.
```

### `NEGATIVE_HUB_SCENE`

```text
text, letters, numbers, logo, watermark, border, UI, labels, arrows, diagram lines, washing machine, washer, dryer, appliance, character, person, astronaut, creature, anti-aliasing, smooth gradient, painterly, 3D render, photorealism, anime, clean vector, high-res detail, mixed pixel sizes, faux pixel art, blurry edges, glossy plastic, neon cyberpunk, purple, neon green, orange, pure red, blood, gore, open wound, viscera, exposed organs, toilet, toilet humour, hard horizon line, single focal landmark, high-contrast centre, frame.
```

### `NEGATIVE_HUB_PROP`

```text
text, letters, numbers, logo, watermark, border, UI, labels, arrows, diagram lines, anti-aliasing, smooth gradient, painterly, 3D render, photorealism, anime, clean vector, high-res detail, mixed pixel sizes, faux pixel art, blurry edges, glossy plastic, neon cyberpunk, purple, neon green, orange, pure red, blood, gore, open wound, viscera, exposed organs, extra objects, multiple objects, scene background, ground, floor, pedestal, cast shadow, drop shadow, checkerboard, frame.
```

### `NEGATIVE_HUB_CHARACTER`

```text
text, letters, numbers, logo, watermark, border, UI, labels, anti-aliasing, smooth gradient, painterly, 3D render, photorealism, anime, clean vector, high-res detail, mixed pixel sizes, faux pixel art, blurry edges, glossy plastic, neon cyberpunk, purple, neon green, orange, pure red, blood, gore, extra limbs, extra characters, humanoid monster, furry, cell creature, tentacles, tail, nucleus, detailed face, realistic face, scene background, ground, floor, pedestal, cast shadow, drop shadow, checkerboard, frame.
```

### `NEGATIVE_HUB_LOGO`

```text
misspelling, wrong letters, missing letters, extra letters, lowercase, multiple words, slogan, subtitle, numbers, watermark, border, rectangular frame, UI, scene background, 3D bevel, glossy plastic, gradient, anti-aliasing, mixed pixel sizes, orange, purple, neon green, pure red, blood, gore, extra characters, cast shadow, drop shadow, checkerboard.
```

---

## 8. Hero prompts — fully assembled

These are the three prompts to run first. Generate four variations each, pick one, and use it as the reference for the rest.

### 8.1 Bathroom scene plate — `bg.bathroom.wall`

```text
SUBJECT: A wide pixel-art background plate of a cramped retro-futuristic laundry lab inside a domestic bathroom at night, empty of people and appliances. Flat front elevation with a slight 3/4 read from the props only; no vanishing point, no perspective floor. Chipped bone-cream wall tiles with sage grout; exposed appliance-grey pipes; a sliver of a utility sink and a cracked mirror at the far left edge; a heavy metal shelf with brackets above a large empty appliance alcove on the left-centre; a faded rectangular patch and a single nail on the wall where a poster hangs; a floor drain, a damp bath mat, a mop and bucket on the right; a single warm caged bulb on the left; a cool joint-cyan glow leaking from the alcove and a wall conduit on the right. The alcove is framed by a power socket, a coiled cable and a dark floor shadow; it is empty and ready for a separate washing-machine sprite. Damp grime, condensation, dust, scuffed enamel, small stains. Keep the top-left third visually quiet for a logo overlay. Keep the right third low-contrast and uncluttered for a UI panel. Strong readable shapes, no tiny detail.

STYLE: Pixel art for a 2D game, native pixel grid, hard square pixels, crisp edges, no anti-aliasing, no smoothing, no mixed pixel sizes. Limited palette, three-step ramps, 50% dither for damp tile, condensation, dust and grime. Retro-futuristic domestic laundry lab: wry, tired, lived-in, gross-cute biology-adjacent but real-world, 12+ friendly, never gory, no shock humour. Orthographic front/side elevation, strong readable shapes, no tiny detail, no text, no labels, no arrows, no UI.

PALETTE: teal #05090b #101a20 #1d2f38; bone #c9b79a #f2e8d5 #fff8e8; bone shadow #5f736e #7a8f8a #9db4ad; nerve #b8862b #ffd166 #fff3b0; joint #3f9fb5 #7bdff2 #c9f7ff; muscle #a82a4a #ef476f #ff9fb2; sage #6f847d #9db4ad #c4d4ce; ink #000000 #05090b #2a3f47; appliance #263236 #5f7378 #9fb0ae (hub-only cool metal). Use only these ramp steps; no intermediate blends, no unapproved orange.

FRAME: 16:9 wide composition, 640×360 source, displayed at 2× (1280×720). Opaque, edge-to-edge background plate. Keep the top-left third visually quiet for a logo overlay; keep the right third low-contrast and uncluttered for a UI panel; leave a large empty appliance alcove on the left-centre. No frame, no border, no text, no UI, no characters, no appliances. Hard pixel edges; no anti-aliasing.

NEGATIVE: text, letters, numbers, logo, watermark, border, UI, labels, arrows, diagram lines, washing machine, washer, dryer, appliance, character, person, astronaut, creature, anti-aliasing, smooth gradient, painterly, 3D render, photorealism, anime, clean vector, high-res detail, mixed pixel sizes, faux pixel art, blurry edges, glossy plastic, neon cyberpunk, purple, neon green, orange, pure red, blood, gore, open wound, viscera, exposed organs, toilet, toilet humour, hard horizon line, single focal landmark, high-contrast centre, frame.
```

**Acceptance:** reads at 1280×720 with the DOM panel on the right; top-left quiet enough for the logo; no text/UI/characters/appliances; palette-only colours; no magenta; no obvious focal object; 640×360 source.

---

### 8.2 Shrink-O-Matic body — `sprite.prop.washer`

**Reference:** use the approved bathroom scene for palette, lighting, and pixel density only. Do not copy the composition.

```text
SUBJECT: A booth-sized retro-futuristic front-loading washing machine, the Shrink-O-Matic, isolated on flat magenta. Front view, straight-on, with a slight 3/4 read from the side panel only; the porthole face must be a perfect circle, not an ellipse. A tall rounded-cube body in scuffed bone-cream enamel with appliance-grey trim, teal shadows and a heavy dark-teal outline. A huge circular porthole in the centre with a thick appliance-grey rim and a dark empty opening, ready for a separate drum and door. Across the top: a blank dark control screen (no text), a chunky dial, a row of small bone buttons, a glowing joint-cyan cartridge slot with a nerve-yellow seam, a vent grille, and a small antenna/sensor. A small output hatch on the lower left, sized for a tiny astronaut. A coiled power cable and a heavy plug at the base. Bolted lab modifications, warning stripes, and a blank nameplate across the top of the body. It reads as a domestic appliance rebuilt into a shrink booth: practical, scuffed, weird, not sleek. Strong silhouette, no fine detail.

STYLE: Pixel art, native pixel grid, hard square pixels, crisp edges, no anti-aliasing, no smoothing, no mixed pixel sizes. Limited palette, three-step ramps, 50% dither for grime and wear. Retro-futuristic domestic laundry lab prop: chunky, practical, scuffed, gross-cute biology-adjacent but real-world, 12+ friendly, never gory. Strong iconic silhouette, readable at small size, no fine detail, no text, no labels, no logo.

PALETTE: teal #05090b #101a20 #1d2f38; bone #c9b79a #f2e8d5 #fff8e8; bone shadow #5f736e #7a8f8a #9db4ad; nerve #b8862b #ffd166 #fff3b0; joint #3f9fb5 #7bdff2 #c9f7ff; muscle #a82a4a #ef476f #ff9fb2; sage #6f847d #9db4ad #c4d4ce; ink #000000 #05090b #2a3f47; appliance #263236 #5f7378 #9fb0ae (hub-only cool metal). Use only these ramp steps; no intermediate blends, no unapproved orange.

FRAME: Isolated object, centred, with a clear empty margin on all sides, on a flat solid magenta #FF00FF background; no ground, no pedestal, no cast shadow, no scene, no frame. Draw the object large and clear; do not draw a pixel grid, a tiny sprite, or a sprite sheet. Hard pixel edges; no anti-aliasing.

NEGATIVE: text, letters, numbers, logo, watermark, border, UI, labels, arrows, diagram lines, anti-aliasing, smooth gradient, painterly, 3D render, photorealism, anime, clean vector, high-res detail, mixed pixel sizes, faux pixel art, blurry edges, glossy plastic, neon cyberpunk, purple, neon green, orange, pure red, blood, gore, open wound, viscera, exposed organs, extra objects, multiple objects, scene background, ground, floor, pedestal, cast shadow, drop shadow, checkerboard, frame, nameplate text, screen text, door, drum, glass, elliptical porthole, oval porthole.
```

**Acceptance:** reads at 360×480 display; porthole face is a clean circle, not an ellipse; screen area is blank; no text; the body fits the scene’s empty alcove; no door/drum/glass baked in.

---

### 8.3 Civilian idle — `sprite.player.civilian`

**Reference:** use the approved bathroom scene for palette, lighting, and pixel density only. Do not copy the composition.

```text
SUBJECT: A tired adult sci-fi fan in a worn oversized hoodie and patterned pajama pants, full body, side view facing left, standing in a slight slouch, isolated on flat magenta. The hoodie is bone-cream with teal shadows and a small faded joint-cyan rocket patch on the chest (no text); the pajama pants are sage with tiny nerve-yellow star/neuron motifs; fluffy muscle-pink slippers; joint-cyan headphones around the neck; messy dark-teal hair; pale bone-cream skin with sage shadows and a muscle-pink nose/cheek accent; a nerve-yellow coffee mug in one hand; the other hand in the hoodie pocket. Big readable shapes, tired friendly expression, two dark pixel eyes, a simple nose and mouth; no fine face detail. The character reads at 64×128 display (32×64 source). No scene, no ground, no shadow.

STYLE: Pixel art, native pixel grid, hard square pixels, crisp edges, no anti-aliasing, no smoothing, no mixed pixel sizes. Limited palette, three-step ramps, 50% dither for fabric and grime. A real-world human, not a cell creature: tired, friendly, chunky readable silhouette, side view, no fine detail. Retro-futuristic domestic laundry lab tone, 12+ friendly, never gory. No text, no labels, no logo.

PALETTE: teal #05090b #101a20 #1d2f38; bone #c9b79a #f2e8d5 #fff8e8; bone shadow #5f736e #7a8f8a #9db4ad; nerve #b8862b #ffd166 #fff3b0; joint #3f9fb5 #7bdff2 #c9f7ff; muscle #a82a4a #ef476f #ff9fb2; sage #6f847d #9db4ad #c4d4ce; ink #000000 #05090b #2a3f47; appliance #263236 #5f7378 #9fb0ae (hub-only cool metal). Use only these ramp steps; no intermediate blends, no unapproved orange.

FRAME: Full body, side view facing left, centred horizontally, with a clear empty margin on all sides, isolated on a flat solid magenta #FF00FF background; no ground, no pedestal, no cast shadow, no scene, no frame. Draw the character large and clear; do not draw a pixel grid, a tiny sprite, or a sprite sheet. Hard pixel edges; no anti-aliasing.

NEGATIVE: text, letters, numbers, logo, watermark, border, UI, labels, anti-aliasing, smooth gradient, painterly, 3D render, photorealism, anime, clean vector, high-res detail, mixed pixel sizes, faux pixel art, blurry edges, glossy plastic, neon cyberpunk, purple, neon green, orange, pure red, blood, gore, extra limbs, extra characters, humanoid monster, furry, cell creature, tentacles, tail, nucleus, detailed face, realistic face, scene background, ground, floor, pedestal, cast shadow, drop shadow, checkerboard, frame.
```

**Acceptance:** reads at 64×128; side view facing left; hoodie/pajama/headphones/mug read; face is simple; no cell features; no ground/shadow; palette-only.

---

### 8.4 Civilian walk sheet — `sprite.player.civilian.walk`

**Reference:** use the approved civilian idle for character identity, outfit, proportions, and palette. Keep the same character; only add the six-frame walk.

```text
SUBJECT: The same tired adult sci-fi fan from the approved civilian idle — same bone-cream oversized hoodie with the joint-cyan rocket patch, same sage pajama pants with nerve-yellow star/neuron motifs, same muscle-pink slippers, joint-cyan headphones, messy dark-teal hair, pale bone-cream skin, nerve-yellow coffee mug — in a six-frame side-view walk cycle facing left. A tired, casual shuffle: shoulders slouched, mug held steady, feet low, no heroic stride. Uniform six-frame row, consistent character scale, orientation and baseline in every frame. Flat solid magenta #FF00FF background, no labels, no grid lines, no frame border, no ground, no cast shadow. No new equipment, no second character.

STYLE: Pixel art, native pixel grid, hard square pixels, crisp edges, no anti-aliasing, no smoothing, no mixed pixel sizes. Limited palette, three-step ramps, 50% dither for fabric and grime. A real-world human, not a cell creature: tired, friendly, chunky readable silhouette, side view, no fine detail. Retro-futuristic domestic laundry lab tone, 12+ friendly, never gory. No text, no labels, no logo.

PALETTE: teal #05090b #101a20 #1d2f38; bone #c9b79a #f2e8d5 #fff8e8; bone shadow #5f736e #7a8f8a #9db4ad; nerve #b8862b #ffd166 #fff3b0; joint #3f9fb5 #7bdff2 #c9f7ff; muscle #a82a4a #ef476f #ff9fb2; sage #6f847d #9db4ad #c4d4ce; ink #000000 #05090b #2a3f47; appliance #263236 #5f7378 #9fb0ae (hub-only cool metal). Use only these ramp steps; no intermediate blends, no unapproved orange.

FRAME: Uniform sprite sheet, one character and one action per sheet, consistent scale, orientation and baseline in every frame, six equal frames in a single row, flat solid magenta #FF00FF background, no labels, no grid lines, no frame border, no ground, no cast shadow. Hard pixel edges; no anti-aliasing.

NEGATIVE: text, letters, numbers, logo, watermark, border, UI, labels, anti-aliasing, smooth gradient, painterly, 3D render, photorealism, anime, clean vector, high-res detail, mixed pixel sizes, faux pixel art, blurry edges, glossy plastic, neon cyberpunk, purple, neon green, orange, pure red, blood, gore, extra limbs, extra characters, humanoid monster, furry, cell creature, tentacles, tail, nucleus, detailed face, realistic face, scene background, ground, floor, pedestal, cast shadow, drop shadow, checkerboard, frame, missing frames, extra frames, inconsistent character, changing outfit, changing size, motion blur.
```

**Acceptance:** six usable frames; same character/outfit/palette; consistent scale and baseline; no size drift; walk reads at 64×128; loops at 8–10 fps.

---

### 8.5 Logo wordmark — `ui.logo.shrinkonauts`

**Reference:** use the P1 style anchor only for palette and outline weight. Do not include the astronaut in the logo.

```text
SUBJECT: A horizontal pixel-art wordmark logo for the game SHRINKONAUTS, isolated on flat magenta. The word "SHRINKONAUTS" in chunky uppercase pixel letters, spelled exactly S-H-R-I-N-K-O-N-A-U-T-S, bone-cream letters with a dark teal outline and a hard bone-highlight top edge. To the left of the word, a small joint-cyan astronaut helmet/porthole emblem with a nerve-yellow visor glint and three tiny shrink rings. The letters are uniform in height and spacing, no overlapping, no 3D bevel, no gradient. Wide horizontal lockup, centred, generous margin. No other text, no subtitle, no numbers, no watermark.

STYLE: Pixel-art game logo, native pixel grid, hard square pixels, crisp edges, no anti-aliasing, no smoothing, no mixed pixel sizes. Limited palette, three-step ramps, flat fills, hard outline, no gradient, no 3D bevel, no glossy plastic. Retro-futuristic laundry-lab sci-fi tone, 12+ friendly, bold and readable at small size.

PALETTE: teal #05090b #101a20 #1d2f38; bone #c9b79a #f2e8d5 #fff8e8; bone shadow #5f736e #7a8f8a #9db4ad; nerve #b8862b #ffd166 #fff3b0; joint #3f9fb5 #7bdff2 #c9f7ff; muscle #a82a4a #ef476f #ff9fb2; sage #6f847d #9db4ad #c4d4ce; ink #000000 #05090b #2a3f47; appliance #263236 #5f7378 #9fb0ae (hub-only cool metal). Use only these ramp steps; no intermediate blends, no unapproved orange.

FRAME: Wide horizontal logo lockup, centred, with generous empty margin, on a flat solid magenta #FF00FF background; no rectangular frame, no scene, no extra text. Draw the logo large and clear; do not draw a pixel grid or a tiny sprite. Hard pixel edges; no anti-aliasing.

NEGATIVE: misspelling, wrong letters, missing letters, extra letters, lowercase, multiple words, slogan, subtitle, numbers, watermark, border, rectangular frame, UI, scene background, 3D bevel, glossy plastic, gradient, anti-aliasing, mixed pixel sizes, orange, purple, neon green, pure red, blood, gore, extra characters, cast shadow, drop shadow, checkerboard.
```

**Acceptance:** every letter of **SHRINKONAUTS** is correct; reads at 400×96 and at 200×48; no extra words; magenta-keyed to alpha with no fringe; no frame.

**Logo risk:** this is the highest-risk asset. Generate four variations, check spelling letter by letter, and keep the best. If more than two letters are wrong, fall back to a Silkscreen CSS wordmark plus a **text-free** helmet/porthole emblem generated separately. Do not spend more than two paid attempts repairing a broken wordmark.

---

## 9. Remaining asset prompts

These are modular. Assemble each with the matching shared style, palette, and frame blocks from §7. Append the negative delta to the category negative.

### 9.1 Porthole door — `sprite.prop.washer.door`

**Reference:** approved Shrink-O-Matic body. Match rim width, palette, outline weight, and pixel density. Do not copy the body.

```text
SUBJECT: A circular porthole door for the Shrink-O-Matic washing machine, isolated on flat magenta, perfectly circular and centred. A thick appliance-grey metal ring with bone-cream highlights and teal shadows; a dark teal glass centre with a hard joint-cyan reflection and a faint nerve-yellow glint; a chunky bone handle on the right edge; two small hinge tabs on the left. The door is slightly smaller than the machine's porthole rim so it fits inside it. Front view. No text, no logo, no scene, no machine body.
```

- **Style:** `STYLE_HUB_PROP`
- **Palette:** `PALETTE_HUB`
- **Frame:** `FRAME_HUB_PROP`
- **Negative:** `NEGATIVE_HUB_PROP` + `machine body, drum, washing machine, text, labels, scene, ground, shadow, frame, extra handles, extra hinges.`

### 9.2 Drum interior — `sprite.prop.washer.drum`

**Reference:** approved Shrink-O-Matic body. Match the porthole rim and palette.

```text
SUBJECT: A circular washing-machine drum interior for the Shrink-O-Matic, isolated on flat magenta, perfectly circular and centred. A deep metal drum with appliance-grey ribs, bone-cream highlights and teal shadows; a few damp towels and a sock tumbling inside in muscle-pink, joint-cyan and sage; a faint nerve-yellow glow at the back; the area outside the circle is flat magenta #FF00FF. Front view, slightly 3/4 into the drum. No text, no logo, no face, no character, no machine body.
```

- **Style:** `STYLE_HUB_PROP`
- **Palette:** `PALETTE_HUB`
- **Frame:** `FRAME_HUB_PROP`
- **Negative:** `NEGATIVE_HUB_PROP` + `machine body, door, glass, text, labels, scene, ground, shadow, frame, face, character, extra drums.`

### 9.3 Poster — `sprite.prop.poster`

**Reference:** approved bathroom scene for palette and lighting only.

```text
SUBJECT: A vertical retro safety poster for the Shrink-O-Matic, isolated on flat magenta. A worn bone-cream paper poster with torn edges, a faded teal border, and a simple graphic: a tiny astronaut silhouette inside a circular washing-machine porthole, three concentric joint-cyan shrink rings pulling inward, a muscle-pink warning stripe along the bottom, and a blank bone-cream label area at the top. No text, no letters, no numbers, no logo, no arrows, no diagram lines, no frame. Slight tears, scuffs and damp stains, but readable at 96×128 display (48×64 source). Front view, no perspective.
```

- **Style:** `STYLE_HUB_PROP`
- **Palette:** `PALETTE_HUB`
- **Frame:** `FRAME_HUB_PROP`
- **Negative:** `NEGATIVE_HUB_PROP` + `text, letters, numbers, logo, arrows, diagram lines, brain, gore, toilet humour, scene, wall, ground, shadow, frame, extra posters.`

### 9.4 Anatomy cartridge — `sprite.prop.cartridge.anatomy`

**Reference:** approved machine body and scene for palette and pixel density.

```text
SUBJECT: A single retro-futuristic game cartridge for the Anatomy cycle, isolated on flat magenta, front view with a slight 3/4 turn. A chunky rectangular cartridge with a rounded grip, a bone-cream shell, appliance-grey trim, a blank label area (no text), a simple nerve-yellow neuron motif (one round body, three short tentacles, one tail), a joint-cyan edge light, a small muscle-pink stripe, and a chunky connector at the bottom. It reads as a lab sample cartridge, not a weapon or ammunition. Strong silhouette, no fine detail.
```

- **Style:** `STYLE_HUB_PROP`
- **Palette:** `PALETTE_HUB`
- **Frame:** `FRAME_HUB_PROP`
- **Negative:** `NEGATIVE_HUB_PROP` + `text, letters, numbers, labels, logo, scene, ground, shadow, frame, weapon, bullet, ammunition, gore, extra cartridges.`

### 9.5 Silicon cartridge — `sprite.prop.cartridge.silicon`

```text
SUBJECT: A single retro-futuristic game cartridge for the Silicon cycle, isolated on flat magenta, front view with a slight 3/4 turn. A chunky rectangular cartridge with a rounded grip, a graphite/appliance-grey shell, bone-cream trim, a blank label area (no text), a simple joint-cyan circuit/chip motif, a nerve-yellow edge light, and a chunky connector at the bottom. It reads as a lab sample cartridge, not a weapon or ammunition. Strong silhouette, no fine detail.
```

- **Style:** `STYLE_HUB_PROP`
- **Palette:** `PALETTE_HUB`
- **Frame:** `FRAME_HUB_PROP`
- **Negative:** `NEGATIVE_HUB_PROP` + `text, letters, numbers, labels, logo, scene, ground, shadow, frame, weapon, bullet, ammunition, gore, extra cartridges.`

### 9.6 Toy astronaut — `sprite.prop.toy.astronaut`

**Reference:** P1 style anchor for suit and palette only. Do not copy the exact character proportions.

```text
SUBJECT: A tiny toy astronaut figurine on a small round base, isolated on flat magenta. A simplified Shrinkonaut toy: bone-cream suit, joint-cyan visor, nerve-yellow backpack tanks, dark teal joints, one scanner gauntlet, chunky boots, neutral standing pose, facing slightly right. It should read as a cheap collectible toy, not the real character: simplified shapes, a visible seam at the waist, a small peg base. No text, no logo, no scene, no ground shadow.
```

- **Style:** `STYLE_HUB_PROP`
- **Palette:** `PALETTE_HUB`
- **Frame:** `FRAME_HUB_PROP`
- **Negative:** `NEGATIVE_HUB_PROP` + `real astronaut, detailed suit, text, labels, scene, ground, cast shadow, frame, extra characters.`

### 9.7 Neuron plush — `sprite.prop.plush.neuron`

```text
SUBJECT: A small round neuron plush toy, isolated on flat magenta. A plump jelly-bean body in bone-cream fabric with visible stitched seams; a dark teal oval nucleus embroidered on the front; six short, soft plush tentacles with forked tips around the top and sides; one long thin plush tail with a forked tip; two big stitched tired eyes; no mouth. It sits upright with a slight slouch. It is a toy, not the Neuron Keeper character: no arms, no lantern, no foot stalk, no myelin. Source 24×24, display 48×48.
```

- **Style:** `STYLE_HUB_PROP`
- **Palette:** `PALETTE_HUB`
- **Frame:** `FRAME_HUB_PROP`
- **Negative:** `NEGATIVE_HUB_PROP` + `character, arms, lantern, foot stalk, myelin, hair, fur, humanoid, text, labels, scene, ground, shadow, frame, extra tails, extra tentacles.`

### 9.8 Detergent bottles — `sprite.prop.detergent.bottles`

```text
SUBJECT: A group of three retro-futuristic laundry detergent bottles, isolated on flat magenta, standing side by side with a small gap. Each bottle is shaped like a lab reagent bottle with a chunky screw cap and a blank label area: one bone-cream bottle with a nerve-yellow cap and a joint-cyan label band; one sage bottle with a muscle-pink cap and a bone label band; one appliance-grey bottle with a joint-cyan cap and a nerve-yellow label band. No text, no letters, no numbers, no logo. Slight grime and drips, but clean silhouettes.
```

- **Style:** `STYLE_HUB_PROP`
- **Palette:** `PALETTE_HUB`
- **Frame:** `FRAME_HUB_PROP`
- **Negative:** `NEGATIVE_HUB_PROP` + `text, letters, numbers, label writing, logo, scene, ground, shadow, frame, extra bottles, gore.`

### 9.9 Laundry basket — `sprite.prop.laundry.basket`

```text
SUBJECT: A woven laundry basket overflowing with damp towels, isolated on flat magenta. The basket is bone-cream and sage wicker with teal shadows and a chunky rim; inside are folded muscle-pink, joint-cyan and sage towels, and one sock hanging over the edge. A small blank tag on the rim (no text). Front view, slight 3/4. Strong silhouette, no fine detail.
```

- **Style:** `STYLE_HUB_PROP`
- **Palette:** `PALETTE_HUB`
- **Frame:** `FRAME_HUB_PROP`
- **Negative:** `NEGATIVE_HUB_PROP` + `text, letters, numbers, logo, scene, ground, shadow, frame, gore, extra baskets.`

### 9.10 Hanging towel — `sprite.prop.towel`

```text
SUBJECT: A damp towel hanging over a simple hook, isolated on flat magenta. The towel is sage with a bone-cream stripe and a muscle-pink hem, slightly twisted and dripping a single pixel of water; the hook is appliance-grey. No text, no logo, no scene, no wall.
```

- **Style:** `STYLE_HUB_PROP`
- **Palette:** `PALETTE_HUB`
- **Frame:** `FRAME_HUB_PROP`
- **Negative:** `NEGATIVE_HUB_PROP` + `text, labels, scene, wall, ground, shadow, frame, gore.`

---

## 10. Cycle card icons

Do **not** generate `ui.icon.cycle.anatomy` and `ui.icon.cycle.silicon` separately first. Crop the neuron motif and the chip motif from the approved cartridges, fit each to 16×16 source, quantise, and export at 32×32 display. This keeps the cards and the physical cartridges visually identical.

If the crop is too busy at 16×16, simplify it in Aseprite: one clear silhouette, no label text, no tiny detail.

Optional AI prompt if a separate icon generation is required:

```text
SUBJECT: Two square game icons side by side on flat magenta, equal size, no overlap. Left: Anatomy cycle icon — a simple bone-cream neuron with a nerve-yellow body and joint-cyan rim on a dark teal square tile. Right: Silicon cycle icon — a simple joint-cyan microchip with bone-cream pins and a nerve-yellow trace on a graphite square tile. Flat, bold, readable at 32×32; no text, no letters, no numbers, no logo.
```

- **Style:** `STYLE_HUB_PROP`
- **Palette:** `PALETTE_HUB`
- **Frame:** `FRAME_HUB_PROP`
- **Negative:** `NEGATIVE_HUB_PROP` + `text, letters, numbers, logo, scene, ground, shadow, frame, extra icons, detailed circuit, realistic chip.`

---

## 11. Audio prompts — Ludo Audio

Use the shared audio style, then the cue-specific prompt.

**AUDIO_STYLE**

```text
Short diegetic game sound effect, 48 kHz, dry, tactile, retro-futuristic laundry lab, domestic appliance plus soft sci-fi lab, no music, no voice, no gore, clean tail with no long reverb, no clipping.
```

| Asset ID | Prompt | Duration | File |
|---|---|---|---|
| `audio.cue.hub.click` | `A single chunky plastic control-panel button press: dry tactile click, tiny relay tick, very short.` | 0.05–0.15 s | `shared/audio/hub-click.ogg` |
| `audio.cue.hub.door` | `A heavy washing-machine porthole door unlatches and swings open: metal latch clunk, soft pneumatic hiss, bone-cream enamel resonance, no gore.` | 0.4–0.8 s | `shared/audio/hub-door.ogg` |
| `audio.cue.hub.spin` | `A retro washing machine drum spins up: low electric motor hum rising, water slosh, faint metal rattle, one-shot, no music.` | 1.0–2.0 s | `shared/audio/hub-spin.ogg` |
| `audio.cue.hub.shrink` | `A sci-fi shrink beam fires: descending electric zap, suit power surge, soft flash whoosh, not painful, no voice, no gore.` | 0.5–0.9 s | `shared/audio/hub-shrink.ogg` |
| `audio.cue.hub.arrive` | `A tiny astronaut arrives on a wet bathroom floor: soft high chime, tiny boot squelch, microscopic room tone.` | 0.3–0.8 s | `shared/audio/hub-arrive.ogg` |
| `audio.cue.hub.hum` | `A warm laundry-lab room tone: low appliance hum, faint pipe tick, distant water drip, loopable, no music, no voice.` | 1.0–2.0 s | `shared/audio/hub-hum.ogg` |

**Acceptance:** duration inside the cue window; dry; no music/voice; no gore; ≤120 KB; OGG or MP3; filename matches the table.

**Note:** `audio.cue.hub.hum` is declared in the hub but is not currently played as an ambient loop. If it should be background ambience, that is a small audio/runtime change, not just an asset drop.

---

## 12. Generation order and approval gates

| Batch | Generate | Gate |
|---|---|---|
| 0 | Bathroom scene plate | Approve at 640×360 and 1280×720; lock palette and safe zones. |
| 1 | Shrink-O-Matic body | Fits the alcove; porthole diameter matches door/drum; no text. |
| 2 | Door + drum | Circular, fit the porthole, no background; test rotation. |
| 3 | Civilian idle | Reads at 64×128; side view facing left; no cell features. |
| 4 | Civilian walk sheet | Six frames, consistent baseline, loops at 8–10 fps. |
| 5 | Logo wordmark | Exact spelling; reads at 400×96 and 200×48. |
| 6 | Poster + cartridges | Read at 96×128 and 48×64; distinct cycle identity. |
| 7 | Small props | Read at 32–64 px; no magenta fringe; consistent palette. |
| 8 | Card icons | Derived from cartridges; read at 32×32. |
| 9 | Audio | Duration, dry, no music/voice, ≤120 KB. |
| 10 | Integration | Contact sheet at 1280×720 with the DOM panel; 720p check. |

Do not generate props before the scene and machine are approved. The scene is the hub’s style anchor; the machine is the prop anchor.

### Stop rules

- Maximum three attempts per asset on a free tier; maximum two prompt revisions on a paid plan.
- If the scene fails the style gate, stop and revise the scene prompt, not the props.
- If the logo misspells more than two letters after two attempts, use the CSS fallback.
- If a small prop does not read at its target size after two attempts, bake it into the scene or cut it.
- If Nano Banana cannot produce a usable 16:9 scene, generate a 1:1/4:3 plate and crop, or switch to Ludo for the scene.

---

## 13. Post-processing and acceptance

### Required pipeline steps

1. **Key** magenta plates with `npm run art:key`.
2. **Trim** to the alpha bounding box.
3. **Downscale** to the target source size. For the scene, 640×360; for props/characters, the sizes in §3.
4. **Quantise** to the hub palette. The appliance ramp is allowed; no intermediate blends.
5. **Hard-threshold alpha** to 0 or 255; remove magenta fringe.
6. **Inspect at 400%**, then at display size on `#101a20`.
7. **Check the 2× display**: every source pixel becomes a 2×2 display block; no mixed pixel sizes.
8. **Check the DOM panel over the scene** at 1280×720 and at 720p/narrow width.
9. **Record** prompt, reference, model/seed, variations, chosen file, cleanup, palette, and licence.

**Keying note:** the scene is opaque and is not keyed. Isolated props, characters, and the logo use flat magenta `#FF00FF` and are keyed in post. Do not write “transparent” in a generator prompt; the generator cannot paint alpha. Use flat magenta and key it with `npm run art:key`.

### Acceptance table

| Category | Must pass |
|---|---|
| Scene | 640×360; 1280×720 preview; top-left quiet for logo; right third low-contrast; no text/UI/characters/appliances; palette-only. |
| Machine | 360×480 display; clean circular porthole; blank screen/nameplate; no door/drum/glass; no text. |
| Door/drum | Circular; fits porthole; flat magenta outside, keyed to alpha; drum rotates without a seam or face. |
| Civilian | 64×128 display; side view facing left; hoodie/pajama/headphones/mug read; simple face; no cell features. |
| Walk | Six frames; same character/outfit; consistent baseline; no size drift; 8–10 fps loop. |
| Logo | Exact **SHRINKONAUTS** spelling; 400×96 and 200×48; no extra text; magenta-keyed to alpha. |
| Poster | 96×128; blank label area; no text; no arrows/diagram lines; readable at size. |
| Cartridges | 48×64; blank labels; distinct Anatomy/Silicon motifs; not weapon-like. |
| Props | Target sizes; strong silhouettes; no text; alpha clean; palette-only. |
| Audio | Duration inside the cue window; dry; no music/voice; ≤120 KB; OGG/MP3. |

### Budgets

| Asset | Budget |
|---|---|
| Scene plate | ≤300 KB |
| Machine body | ≤32 KB |
| Door/drum | ≤16 KB each |
| Civilian | ≤16 KB |
| Walk sheet | ≤64 KB |
| Logo | ≤16 KB |
| Props | ≤8 KB each |
| Audio | ≤120 KB each |
| Total hub visual | ≤1.5 MB |

### Acceptance checklist

- [ ] Scene approved at 640×360 and 1280×720.
- [ ] Scene has no text, UI, characters, or appliances.
- [ ] Machine body fits the alcove; porthole diameter matches door/drum.
- [ ] Door and drum fit the porthole; drum rotates cleanly.
- [ ] Civilian idle reads at 64×128 and has no cell features.
- [ ] Walk sheet has six usable frames and a consistent baseline.
- [ ] Logo spells SHRINKONAUTS exactly; reads at 400×96 and 200×48.
- [ ] Poster reads at 96×128; blank label area for the runtime text.
- [ ] Cartridges are distinct, readable, and not weapon-like.
- [ ] Card icons are derived from the cartridges and read at 32×32.
- [ ] Small props read at target size; no magenta fringe.
- [ ] Six audio cues pass duration/file-size checks.
- [ ] Contact sheet reviewed at 1280×720 with the DOM panel.
- [ ] Contact sheet reviewed at 720p/narrow width.
- [ ] Manifest, theme, and licences updated.
- [ ] `pack:validate`, `pack:smoke`, `smoke:e2e`, and `build` pass.
- [ ] Prompt log complete for every accepted asset.

---

## 14. Prompt log

Keep a separate spreadsheet or Markdown table. Keep failed rows; add a new row for each retry. The log is the evidence for the AI-generated asset record and the GDD/video asset list.

| Field | Example |
|---|---|
| Prompt version | `hub-2026-11-01.1` |
| Style version | `hub-pixel-v1` |
| Asset ID | `sprite.prop.washer` |
| Subject block | `SUBJECT: A booth-sized retro-futuristic front-loading washing machine...` |
| Category | scene / prop / character / logo / poster / cartridge / audio |
| Tool and plan | Nano Banana / Gemini; record plan; Ludo fallback |
| Model and seed | record exact model/version and seed |
| Reference | `bg.bathroom.wall` for palette/lighting only |
| Negative block | `NEGATIVE_HUB_PROP` |
| Negative delta | `text, labels, door, drum, glass, nameplate text` |
| Prompt | full positive prompt text |
| Frame block | `FRAME_HUB_PROP` / `FRAME_HUB_CHARACTER` / `FRAME_HUB_SHEET` / `FRAME_HUB_LOGO` |
| Aspect and export | 16:9 / 1:1 / wide; 180×240 source; 360×480 display |
| Variations | 4 hero / 2 small prop |
| Chosen file | `public/hub/bathroom/shared/sprites/washer.png` |
| Date | 2026-11-01 |
| Pixel cleanup | keyed; trimmed; downscaled; palette quantised; anti-aliasing removed |
| Grid check | 2× display; no mixed pixel sizes |
| Post-processing | magenta key; 400% edge check; hard alpha; palette check |
| Runtime check | reads at target size; panel overlap check; contact sheet |
| Verdict | approved / retry / placeholder / cut |
| Licence | Nano Banana / Google Gemini plan; Ludo Audio plan |
| Notes | one variable changed; reason for retry |

Copy-paste row template:

```text
| hub-2026-11-01.1 | hub-pixel-v1 | asset.id | subject-block | category | tool/plan | model/seed | reference | negative-block | negative-delta | prompt | frame-block | aspect/export | variations | chosen-file | date | pixel-cleanup | grid-check | post-process | runtime-check | verdict | licence | notes |
```

---

## 15. Integration notes

These are not prompt tasks, but they determine whether the assets actually appear.

### `hub.json` layout

Proposed display coordinates for 1280×720:

```text
machine.x = 340
machine.y = 720
machine.scale = 2
machine.doorAnchor = (340, 540)
machine.drumAnchor = (340, 540)
machine.screen = (230, 300, 220, 50)

player.idle = (640, 700)
player.entry = (340, 700)
player.exit = (180, 700)
player.scale = 2
player.tinyScale = 1
```

The machine body is 360×480 display, top at y=240. The logo sits top-left at roughly `(48, 40)`, 400×96 display. The poster sits around `(600, 260)`, 96×128 display. The panel occupies roughly x=760–1240, y=48–672.

### `HubScene` changes

- When the final machine body exists, **stop drawing** the procedural body, start button, vent, and pipework. Keep only the screen glow and cycle label.
- Move the `SHRINK-O-MATIC` nameplate text onto the blank nameplate across the top of the machine body, or just above it. Keep the screen label inside the blank screen rect. Do not let either overlap the porthole.
- Add the logo image at top-left.
- Add the poster image and keep the “STAY SMALL” text overlay.
- Add the cartridges at the machine’s cartridge slot; swap Anatomy/Silicon in `setSelection`.
- Add the shelf/laundry props at fixed positions.
- Support the civilian walk sheet as a Phaser sprite sheet; play it during the launch walk, then stop at the entry point.
- Replace the fractional `scaleX/scaleY 0.65` shrink with a hard alpha fade or flash, so the civilian does not blur.
- Move/remove the procedural bubbles so they do not sit under the DOM panel.

### `hub.json` background

Use one final layer:

```json
{
  "assetId": "bg.bathroom.wall",
  "depth": -40,
  "parallaxX": 0,
  "parallaxY": 0,
  "fit": "cover"
}
```

Remove `far`, `mid`, and `near` from the final hub, or keep them as declared placeholders for a future parallax pass. Do not let placeholder gradients overlay the final scene.

### `theme.json`

Align the hub theme with the M3 ramps and add the appliance tokens:

```json
{
  "bg": "#101a20",
  "bone": "#f2e8d5",
  "boneShadow": "#7a8f8a",
  "nerve": "#ffd166",
  "nerveGlow": "#fff3b0",
  "joint": "#7bdff2",
  "muscle": "#ef476f",
  "text": "#fff8e8",
  "muted": "#9db4ad",
  "accent": "#7bdff2",
  "danger": "#ef476f",
  "appliance": "#5f7378",
  "applianceShadow": "#263236",
  "applianceHighlight": "#9fb0ae"
}
```

This keeps the DOM panel and the scene art on the same palette. Add the cycle icons to `theme.ui.assets` or extend the hub document with a small `dressing` array so the logo, poster, cartridges, and props are preloaded. `collectHubAssetIds` currently only collects background, machine, player, and audio IDs.

### DOM panel restyle

Keep the existing information architecture unless you want to simplify it:

- eyebrow: “Real world · laundry lab”
- title: “The Shrink-O-Matic”
- cycle cards with 32×32 icons
- players row
- multiplayer placeholder
- start cycle
- settings / controls
- placeholder/final footer

The panel should read as a wall-mounted terminal: square chrome, 2px border, hard shadow, scanlines, screws, a short cable at the bottom. All CSS.

### Manifest and licences

- Add real `src` paths and types for every asset.
- `sprite.player.civilian.walk` must be `type: "sheet"` with `frameWidth: 32`, `frameHeight: 64`, `frames: 6`, `fps: 8`, `loop: true`.
- `ui.logo.shrinkonauts`, `ui.icon.cycle.*` use `type: "image"`.
- Record the Nano Banana / Google Gemini plan and terms, and the Ludo Audio plan, in `licenses.json`.
- Run `pack:validate`, `pack:smoke`, `smoke:e2e`, and `build`.
- Check `?assets=final` on the hub.

---

## 16. Risks and open questions

| Risk | Mitigation |
|---|---|
| Logo wordmark is misspelled | Four variations; letter-by-letter check; fallback to Silkscreen CSS wordmark + AI emblem. |
| Civilian skin tone needs a specific value | Current prompt uses bone/sage/muscle. If a specific skin tone is needed, add a hub-only skin ramp; do not improvise with orange. |
| AI produces faux-pixel mixed sizes | Treat every output as a concept; downscale and quantise; clean in Aseprite. |
| Scene includes an unwanted washing machine | Negative prompt says no appliance; if it still appears, use Nano Banana’s edit to remove it or cover it with the final machine. |
| Door/drum do not fit the porthole | Generate them from an edited version of the approved machine, or crop them from a closed/open pair. |
| Walk frames drift in size or baseline | Slice the best six, normalize to 32×64, align the feet to the baseline. |
| Small props feel like a different game | Use the approved scene and machine as references; keep the palette and outline weight. |
| P1 prop scope grows | Cut line: drop the five small props first; keep scene, machine, civilian, walk, logo, poster, cartridges. |
| Panel IA changes expand scope | Keep the existing sections and restyle only. |
| Hum loop is not wired | Treat `audio.cue.hub.hum` as a loopable asset; add the ambient loop as a separate small task. |
| Licence unclear | Do not ship final assets until the Nano Banana and Ludo plans/terms are recorded. |

### Decisions still open

1. **Civilian skin tone:** keep the stylized bone/sage/muscle face, or add a hub-only skin ramp?
2. **Logo fallback:** if the AI wordmark fails, is a Silkscreen CSS wordmark + small AI emblem acceptable?
3. **P1 props:** keep all five small props, or cut them if time is tight?
4. **Panel IA:** keep the current sections and restyle, or simplify the panel for the full redesign?
5. **Tiny astronaut:** reuse the existing P1 sprite at 1×, or generate a dedicated menu pose?
6. **Hum loop:** is `audio.cue.hub.hum` meant to be ambient background, or just a one-shot cue?

---

## 17. Change log

| Date | Change |
|---|---|
| 2026-11-01 | Initial M3.5 hub prompt pack. Locks the existing bathroom hub, full layout redesign, 640×360/2× scale, retro-futuristic laundry lab, hoodie/pajama civilian, Nano Banana first, appliance-grey ramp, walk cycle, separate props, full AI wordmark, and six audio cues. |
