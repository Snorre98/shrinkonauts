# M3.75 — Silicon Blueprint Symbol Prompts v01

**Status:** prompt-ready — magenta-key output, no final art generated yet
**Date:** 2026-11-04
**Scope:** the four blueprint symbols used by `01-interrupt-loop`
**Contract:** [`blueprint-symbol-asset-brief-v01.md`](blueprint-symbol-asset-brief-v01.md)
**Related:** [`blueprint-symbol-prompts-v01.md`](blueprint-symbol-prompts-v01.md),
[`../prompts/silicon-theme.md`](../prompts/silicon-theme.md), ADR-0049,
ADR-0072, ADR-0080

The anatomy prompt pack in
[`blueprint-symbol-prompts-v01.md`](blueprint-symbol-prompts-v01.md) is not the
Silicon art direction. Silicon is graphite, ceramic, and cold signal cyan; it
does not use nerve amber, orange, muscle pink, biological tissue, or the
"technical biological blueprint" language.

The Silicon pack reuses four logical IDs so the blueprint data and runtime stay
unchanged. The Silicon manifest resolves those IDs to the separate Silicon
masters generated from these prompts:

- `ui.blueprint.symbol.pulse` — Detect change
- `ui.blueprint.symbol.relay` — Route + integrate
- `ui.blueprint.symbol.timer` — Wake CPU
- `ui.blueprint.symbol.gate` — Actuate response

This file contains one standalone prompt per symbol. Copy the whole block; no
style macros or external prompt fragments are required.

## Shared output contract

- 32×32 source and 32×32 display (`ui-1x`, 1:1);
- PNG, lossless, generated on a flat solid magenta `#FF00FF` chroma-key field;
- the key field is removed with `npm run art:key` after generation;
- the surrounding margin and every interior gap that should be transparent must
  be the same flat `#FF00FF` magenta;
- Nano Banana does not generate alpha: never ask for a transparent background,
  alpha checkerboard, or transparency grid;
- Silicon palette only:
  - graphite/ink `#05090b #101a20 #1d2f38`;
  - ceramic `#c9b79a #f2e8d5 #fff8e8`;
  - ceramic shadow/dust `#5f736e #7a8f8a #9db4ad`;
  - signal cyan `#3f9fb5 #7bdff2 #c9f7ff`;
  - sage `#6f847d #9db4ad #c4d4ce`;
- do not use nerve amber `#ffd166`, orange `#e59b34`, or muscle pink
  `#ef476f`;
- no text, letters, numbers, frames, literal anatomy, literal PCB components,
  room objects, or UI chrome;
- readable at 1× on a dark `#101a20` panel;
- four generated variations, then one reviewed master per symbol;
- the magenta field keys cleanly with no halo, fringe, checkerboard, or scene
  remnant.

Suggested source path:
`art-source/nanobanan/new/blueprint-symbols/silicon/<symbol>-v01.png`.

---

## SBP-01 — `ui.blueprint.symbol.pulse`

**Used by:** 01 Interrupt Loop — Detect change (`detect`).
**Output:** 32×32 PNG on flat solid magenta `#FF00FF`.
**Variations:** 4.

**Positive prompt**

```text
A single 32×32 pixel-art glyph for a technical hardware/process blueprint.
Subject: A single circular node with a small signal-cyan core, emitting three
short radiating cyan ticks and one forward bead. Read as "a change was
detected", not as a lightning bolt, wifi symbol, biological signal, or literal
sensor component.
Style: abstract circuit/process symbol, ceramic bone line art with graphite/ink
shadow and signal-cyan accents, 2 px maximum stroke, centered in a 32×32 cell,
flat solid magenta #FF00FF background, no text, no letters, no numbers, no
frame, no border, no literal anatomy, no organs, no cells, no room objects, no
perspective, no shading gradient.
All non-glyph areas, including the surrounding margin and every interior gap that
should be transparent, use the same flat solid magenta #FF00FF. Nano Banana must
not draw a checkerboard, alpha grid, or scene background.
Readable at 32×32 when displayed 1:1 on a dark #101a20 panel.
Palette: ceramic #c9b79a #f2e8d5 #fff8e8, ceramic shadow #5f736e #7a8f8a
#9db4ad, graphite #05090b #101a20 #1d2f38, signal cyan #3f9fb5 #7bdff2 #c9f7ff,
sage #6f847d #9db4ad #c4d4ce. Do not use nerve amber, orange, or muscle pink.
Pixel grid: crisp, no anti-aliasing, no blur, no noise.
```

**Negative prompt**

```text
text, letters, numbers, labels, captions, frame, border, card, panel, scene
background, gradient, drop shadow, glow, blur, anti-aliasing, checkerboard,
alpha checkerboard, transparency grid, non-magenta background, off-magenta
background, uneven magenta, 3D, perspective, photorealistic, literal anatomy,
organ, cell, neuron, nerve, membrane, muscle, biological tissue, room, platform,
character, UI chrome, multiple glyphs, sprite sheet, grid lines, lightning bolt,
electricity symbol, radio tower, wifi, literal sensor, hardware photograph,
circuit board, PCB, chip package, pin row, socket, wiring diagram, nerve amber,
orange, muscle pink
```

**Acceptance:** the pulse originates from one point; three ticks and one bead
read at 1×; the glyph reads as a detected change without a literal sensor or
lightning-bolt silhouette.

---

## SBP-02 — `ui.blueprint.symbol.relay`

**Used by:** 01 Interrupt Loop — Route + integrate (`route`, `integrate`).
**Output:** 32×32 PNG on flat solid magenta `#FF00FF`.
**Variations:** 4.

**Positive prompt**

```text
A single 32×32 pixel-art glyph for a technical hardware/process blueprint.
Subject: One trace entering from the left forks at a small switch node; one
branch continues as a signal-cyan output trace on the right and the other branch
stops at the node. Read as "route the signal and integrate it", not as a literal
socket, chip, wiring diagram, or a biological junction.
Style: abstract circuit/process symbol, ceramic bone line art with graphite/ink
shadow and signal-cyan accents, 2 px maximum stroke, centered in a 32×32 cell,
flat solid magenta #FF00FF background, no text, no letters, no numbers, no
frame, no border, no literal anatomy, no organs, no cells, no room objects, no
perspective, no shading gradient.
All non-glyph areas, including the surrounding margin and every interior gap that
should be transparent, use the same flat solid magenta #FF00FF. Nano Banana must
not draw a checkerboard, alpha grid, or scene background.
Readable at 32×32 when displayed 1:1 on a dark #101a20 panel.
Palette: ceramic #c9b79a #f2e8d5 #fff8e8, ceramic shadow #5f736e #7a8f8a
#9db4ad, graphite #05090b #101a20 #1d2f38, signal cyan #3f9fb5 #7bdff2 #c9f7ff,
sage #6f847d #9db4ad #c4d4ce. Do not use nerve amber, orange, or muscle pink.
Pixel grid: crisp, no anti-aliasing, no blur, no noise.
```

**Negative prompt**

```text
text, letters, numbers, labels, captions, frame, border, card, panel, scene
background, gradient, drop shadow, glow, blur, anti-aliasing, checkerboard,
alpha checkerboard, transparency grid, non-magenta background, off-magenta
background, uneven magenta, 3D, perspective, photorealistic, literal anatomy,
organ, cell, neuron, nerve, membrane, muscle, biological tissue, room, platform,
character, UI chrome, multiple glyphs, sprite sheet, grid lines, brain,
controller chip, microchip, literal circuit board, PCB, chip package, pin row,
socket, connector photograph, wiring diagram, flowchart, merge arrow, nerve
amber, orange, muscle pink
```

**Acceptance:** one input, one switch node, one selected output; the rejected
branch is visibly terminated; the glyph reads as routing/integration without a
literal chip or socket.

---

## SBP-03 — `ui.blueprint.symbol.timer`

**Used by:** 01 Interrupt Loop — Wake CPU (`wake`).
**Output:** 32×32 PNG on flat solid magenta `#FF00FF`.
**Variations:** 4.

**Positive prompt**

```text
A single 32×32 pixel-art glyph for a technical hardware/process blueprint.
Subject: A partial circular arc, open at the lower right, with one short tick
mark at the open end and one small radial hand. Read as a timed wake window or a
brief opportunity, not as a clock face or a literal timer chip.
Style: abstract circuit/process symbol, ceramic bone line art with graphite/ink
shadow and signal-cyan accents, 2 px maximum stroke, centered in a 32×32 cell,
flat solid magenta #FF00FF background, no text, no letters, no numbers, no
frame, no border, no literal anatomy, no organs, no cells, no room objects, no
perspective, no shading gradient.
All non-glyph areas, including the surrounding margin and every interior gap that
should be transparent, use the same flat solid magenta #FF00FF. Nano Banana must
not draw a checkerboard, alpha grid, or scene background.
Readable at 32×32 when displayed 1:1 on a dark #101a20 panel.
Palette: ceramic #c9b79a #f2e8d5 #fff8e8, ceramic shadow #5f736e #7a8f8a
#9db4ad, graphite #05090b #101a20 #1d2f38, signal cyan #3f9fb5 #7bdff2 #c9f7ff,
sage #6f847d #9db4ad #c4d4ce. Do not use nerve amber, orange, or muscle pink.
Pixel grid: crisp, no anti-aliasing, no blur, no noise.
```

**Negative prompt**

```text
text, letters, numbers, labels, captions, frame, border, card, panel, scene
background, gradient, drop shadow, glow, blur, anti-aliasing, checkerboard,
alpha checkerboard, transparency grid, non-magenta background, off-magenta
background, uneven magenta, 3D, perspective, photorealistic, literal anatomy,
organ, cell, neuron, nerve, membrane, muscle, biological tissue, room, platform,
character, UI chrome, multiple glyphs, sprite sheet, grid lines, clock face,
watch, hour marks, stopwatch, countdown numerals, literal timer chip, circuit
board, PCB, chip package, pin row, socket, hardware photograph, nerve amber,
orange, muscle pink
```

**Acceptance:** the arc and single tick read as a window at 1×; no numerals,
clock face, or literal timer component.

---

## SBP-04 — `ui.blueprint.symbol.gate`

**Used by:** 01 Interrupt Loop — Actuate response (`actuate`).
**Output:** 32×32 PNG on flat solid magenta `#FF00FF`.
**Variations:** 4.

**Positive prompt**

```text
A single 32×32 pixel-art glyph for a technical hardware/process blueprint.
Subject: A barrier lifted into an open arch by a short diagonal signal-cyan
strut, with a clear central opening between two side posts. Read as "the
response has been actuated", not as a door, doorway, exit sign, or literal
machine part.
Style: abstract circuit/process symbol, ceramic bone line art with graphite/ink
shadow and signal-cyan accents, 2 px maximum stroke, centered in a 32×32 cell,
flat solid magenta #FF00FF background, no text, no letters, no numbers, no
frame, no border, no literal anatomy, no organs, no cells, no room objects, no
perspective, no shading gradient.
All non-glyph areas, including the surrounding margin and every interior gap that
should be transparent, use the same flat solid magenta #FF00FF. Nano Banana must
not draw a checkerboard, alpha grid, or scene background.
Readable at 32×32 when displayed 1:1 on a dark #101a20 panel.
Palette: ceramic #c9b79a #f2e8d5 #fff8e8, ceramic shadow #5f736e #7a8f8a
#9db4ad, graphite #05090b #101a20 #1d2f38, signal cyan #3f9fb5 #7bdff2 #c9f7ff,
sage #6f847d #9db4ad #c4d4ce. Do not use nerve amber, orange, or muscle pink.
Pixel grid: crisp, no anti-aliasing, no blur, no noise.
```

**Negative prompt**

```text
text, letters, numbers, labels, captions, frame, border, card, panel, scene
background, gradient, drop shadow, glow, blur, anti-aliasing, checkerboard,
alpha checkerboard, transparency grid, non-magenta background, off-magenta
background, uneven magenta, 3D, perspective, photorealistic, literal anatomy,
organ, cell, neuron, nerve, membrane, muscle, biological tissue, room, platform,
character, UI chrome, multiple glyphs, sprite sheet, grid lines, door, doorway,
exit sign, architectural archway, literal actuator arm, piston assembly,
machine part, hardware photograph, circuit board, PCB, chip package, pin row,
socket, nerve amber, orange, muscle pink
```

**Acceptance:** the opening is central and obvious; the diagonal strut reads as
the actuating response; no architectural door or literal machine detail.

---

## Puzzle coverage matrix

| Puzzle | Component | Beats | Symbol | Prompt |
|---|---|---|---|---|
| 01 Interrupt Loop | Detect change | `detect` | `pulse` | SBP-01 |
| 01 Interrupt Loop | Route + integrate | `route`, `integrate` | `relay` | SBP-02 |
| 01 Interrupt Loop | Wake CPU | `wake` | `timer` | SBP-03 |
| 01 Interrupt Loop | Actuate response | `actuate` | `gate` | SBP-04 |

## Pack wiring

The four logical IDs already exist in the Silicon blueprint and placeholder
manifest. When the Silicon masters pass review:

1. Add final Silicon entries to `public/packs/silicon-reflex/assets.final.json`.
2. Point them at the Silicon-specific PNGs or the Silicon atlas regions.
3. Keep the anatomy pack pointing at the anatomy set.
4. Do not change the Silicon blueprint component IDs.
5. Verify the Silicon HUD at 1280×720 and the 1× glyph readability on `#101a20`.

## Generation and review order

1. SBP-01 `pulse`.
2. SBP-02 `relay`.
3. SBP-03 `timer`.
4. SBP-04 `gate`.

Generate four variations per symbol. Reject any result that reads as anatomy,
literal hardware, a labelled diagram, or an icon that only works at 4×. Then key,
fit, hand-clean, validate, smoke, and capture the Silicon header.
