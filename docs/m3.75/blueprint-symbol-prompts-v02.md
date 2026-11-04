# M3.75 — Blueprint Symbol Prompts v02

**Status:** canonical prompt-ready set — magenta-key output, no final art generated yet
**Date:** 2026-11-04
**Scope:** the 12 puzzle-specific blueprint symbols used by 03, 04, and 01
**Contract:** [`blueprint-symbol-asset-brief-v01.md`](blueprint-symbol-asset-brief-v01.md)
**Supersedes:** [`blueprint-symbol-prompts-v01.md`](blueprint-symbol-prompts-v01.md) and
[`blueprint-symbol-prompts-silicon-v01.md`](blueprint-symbol-prompts-silicon-v01.md)
**Related:** [`README.md`](README.md), [`../prompts/silicon-theme.md`](../prompts/silicon-theme.md),
ADR-0049, ADR-0072, ADR-0080

This is the canonical prompt set for the three current puzzles. Every component
gets its own symbol; no glyph is reused across puzzles.

All 12 prompts share the same output contract:

- 32×32 source and 32×32 display (`ui-1x`, 1:1);
- PNG, lossless, generated on a flat solid magenta `#FF00FF` chroma-key field;
- the field is removed with `npm run art:key` after generation;
- the surrounding margin and every interior gap that should be transparent must
  be the same flat `#FF00FF` magenta;
- Nano Banana does not generate alpha: never ask for a transparent background,
  alpha checkerboard, or transparency grid;
- no text, letters, numbers, frames, literal anatomy, literal PCB components,
  room objects, or UI chrome;
- readable at 1× on a dark `#101a20` panel;
- four generated variations, then one reviewed master per symbol;
- the magenta field keys cleanly with no halo, fringe, checkerboard, or scene
  remnant.

Suggested source paths:

- anatomy: `art-source/nanobanan/new/blueprint-symbols/v02/<symbol>-v02.png`;
- Silicon: `art-source/nanobanan/new/blueprint-symbols/v02/silicon/<symbol>-v02.png`.

---

## BPV2-01 — `ui.blueprint.symbol.input-pair`

**Used by:** 03 Nerve Forest — Two inputs (`input`).
**Output:** 32×32 PNG on flat solid magenta `#FF00FF`.
**Variations:** 4.

**Positive prompt**

```text
A single 32×32 pixel-art glyph for a technical biological blueprint.
Subject: Two small circular terminals, one lower-left and one slightly
higher-right, asymmetrically spaced, feeding one horizontal line into a shared
junction. Read as "two inputs combine into one signal".
Style: abstract circuit/process symbol, 1-bit bone line art with a subtle teal
shadow, 2 px maximum stroke, centered in a 32×32 cell, flat solid magenta
#FF00FF background, no text, no letters, no numbers, no frame, no border, no
literal anatomy, no organs, no cells, no room objects, no perspective, no
shading gradient.
All non-glyph areas, including the surrounding margin and every interior gap that
should be transparent, use the same flat solid magenta #FF00FF. Nano Banana must
not draw a checkerboard, alpha grid, or scene background.
Readable at 32×32 when displayed 1:1 on a dark #101a20 panel.
Palette: bone #f2e8d5, bone shadow #7a8f8a, teal dark #05090b, optional nerve
#ffd166 and joint #7bdff2 accents.
Pixel grid: crisp, no anti-aliasing, no blur, no noise.
```

**Negative prompt**

```text
text, letters, numbers, labels, captions, frame, border, card, panel, scene
background, gradient, drop shadow, glow, blur, anti-aliasing, checkerboard,
alpha checkerboard, transparency grid, non-magenta background, off-magenta
background, uneven magenta, 3D, perspective, photorealistic, literal anatomy,
organ, cell, neuron, muscle, room, platform, character, UI chrome, multiple
glyphs, sprite sheet, grid lines, dendrite, axon, synapse, biological tissue,
circuit board, PCB, chip, socket, pin row, wiring diagram
```

**Acceptance:** the two terminals read as separate inputs; the junction reads as
one combined signal; no third input or decorative circuitry.

---

## BPV2-02 — `ui.blueprint.symbol.threshold-gauge`

**Used by:** 03 Nerve Forest — Threshold (`threshold`).
**Output:** 32×32 PNG on flat solid magenta `#FF00FF`.
**Variations:** 4.

**Positive prompt**

```text
A single 32×32 pixel-art glyph for a technical biological blueprint.
Subject: A vertical gauge with a horizontal fill line near the top and one notch
cut into the right edge. The fill stops exactly at the notch. Read as "enough"
or "threshold reached", not as a counter or thermometer.
Style: abstract circuit/process symbol, 1-bit bone line art with a subtle teal
shadow, 2 px maximum stroke, centered in a 32×32 cell, flat solid magenta
#FF00FF background, no text, no letters, no numbers, no frame, no border, no
literal anatomy, no organs, no cells, no room objects, no perspective, no
shading gradient.
All non-glyph areas, including the surrounding margin and every interior gap that
should be transparent, use the same flat solid magenta #FF00FF. Nano Banana must
not draw a checkerboard, alpha grid, or scene background.
Readable at 32×32 when displayed 1:1 on a dark #101a20 panel.
Palette: bone #f2e8d5, bone shadow #7a8f8a, teal dark #05090b, optional nerve
#ffd166 and joint #7bdff2 accents.
Pixel grid: crisp, no anti-aliasing, no blur, no noise.
```

**Negative prompt**

```text
text, letters, numbers, labels, captions, frame, border, card, panel, scene
background, gradient, drop shadow, glow, blur, anti-aliasing, checkerboard,
alpha checkerboard, transparency grid, non-magenta background, off-magenta
background, uneven magenta, 3D, perspective, photorealistic, literal anatomy,
organ, cell, neuron, muscle, room, platform, character, UI chrome, multiple
glyphs, sprite sheet, grid lines, thermometer, speedometer, numeric scale,
counter display, circuit board, PCB, chip, socket, pin row, wiring diagram
```

**Acceptance:** the fill/notch relationship is visible at 1×; no numbers or tick
labels; the glyph reads as a condition being met.

---

## BPV2-03 — `ui.blueprint.symbol.axon-flow`

**Used by:** 03 Nerve Forest — One-way flow (`axon`).
**Output:** 32×32 PNG on flat solid magenta `#FF00FF`.
**Variations:** 4.

**Positive prompt**

```text
A single 32×32 pixel-art glyph for a technical biological blueprint.
Subject: A short horizontal conduit containing one bead and ending in a single
forward arrowhead. The conduit is continuous and one-way. Read as "flow in one
direction", not as a cell body or a road.
Style: abstract circuit/process symbol, 1-bit bone line art with a subtle teal
shadow, 2 px maximum stroke, centered in a 32×32 cell, flat solid magenta
#FF00FF background, no text, no letters, no numbers, no frame, no border, no
literal anatomy, no organs, no cells, no room objects, no perspective, no
shading gradient.
All non-glyph areas, including the surrounding margin and every interior gap that
should be transparent, use the same flat solid magenta #FF00FF. Nano Banana must
not draw a checkerboard, alpha grid, or scene background.
Readable at 32×32 when displayed 1:1 on a dark #101a20 panel.
Palette: bone #f2e8d5, bone shadow #7a8f8a, teal dark #05090b, optional nerve
#ffd166 and joint #7bdff2 accents.
Pixel grid: crisp, no anti-aliasing, no blur, no noise.
```

**Negative prompt**

```text
text, letters, numbers, labels, captions, frame, border, card, panel, scene
background, gradient, drop shadow, glow, blur, anti-aliasing, checkerboard,
alpha checkerboard, transparency grid, non-magenta background, off-magenta
background, uneven magenta, 3D, perspective, photorealistic, literal anatomy,
organ, cell, neuron, muscle, room, platform, character, UI chrome, multiple
glyphs, sprite sheet, grid lines, axon, dendrite, myelin, biological tissue,
road, pipe, tube, circuit board, PCB, trace, wiring diagram
```

**Acceptance:** one bead, one conduit, one arrowhead; direction is unambiguous;
no branch or second path.

---

## BPV2-04 — `ui.blueprint.symbol.exit-gate`

**Used by:** 03 Nerve Forest — Terminal / exit (`terminal`, `exit`).
**Output:** 32×32 PNG on flat solid magenta `#FF00FF`.
**Variations:** 4.

**Positive prompt**

```text
A single 32×32 pixel-art glyph for a technical biological blueprint.
Subject: A barrier that has lifted into an open arch, with a clear central
opening between two side posts. Read as "a gate that has opened", not as a door,
a doorway, or an exit sign.
Style: abstract circuit/process symbol, 1-bit bone line art with a subtle teal
shadow, 2 px maximum stroke, centered in a 32×32 cell, flat solid magenta
#FF00FF background, no text, no letters, no numbers, no frame, no border, no
literal anatomy, no organs, no cells, no room objects, no perspective, no
shading gradient.
All non-glyph areas, including the surrounding margin and every interior gap that
should be transparent, use the same flat solid magenta #FF00FF. Nano Banana must
not draw a checkerboard, alpha grid, or scene background.
Readable at 32×32 when displayed 1:1 on a dark #101a20 panel.
Palette: bone #f2e8d5, bone shadow #7a8f8a, teal dark #05090b, optional nerve
#ffd166 and joint #7bdff2 accents.
Pixel grid: crisp, no anti-aliasing, no blur, no noise.
```

**Negative prompt**

```text
text, letters, numbers, labels, captions, frame, border, card, panel, scene
background, gradient, drop shadow, glow, blur, anti-aliasing, checkerboard,
alpha checkerboard, transparency grid, non-magenta background, off-magenta
background, uneven magenta, 3D, perspective, photorealistic, literal anatomy,
organ, cell, neuron, muscle, room, platform, character, UI chrome, multiple
glyphs, sprite sheet, grid lines, door, doorway, exit sign, archway building,
circuit board, PCB, chip, socket, actuator arm, hardware
```

**Acceptance:** the opening is central and obvious; the side posts read as a
barrier that has moved aside; no architectural door detail.

---

## BPV2-05 — `ui.blueprint.symbol.ca-window`

**Used by:** 04 Muscle Effector — Trigger + Ca²⁺ window (`trigger`, `release`).
**Output:** 32×32 PNG on flat solid magenta `#FF00FF`.
**Variations:** 4.

**Positive prompt**

```text
A single 32×32 pixel-art glyph for a technical biological blueprint.
Subject: A small trigger pulse entering a partial circular arc that is open at
the lower right, with one short tick at the open end. Read as "a trigger opens a
brief window", not as a clock face or a timer dial.
Style: abstract circuit/process symbol, 1-bit bone line art with a subtle teal
shadow, 2 px maximum stroke, centered in a 32×32 cell, flat solid magenta
#FF00FF background, no text, no letters, no numbers, no frame, no border, no
literal anatomy, no organs, no cells, no room objects, no perspective, no
shading gradient.
All non-glyph areas, including the surrounding margin and every interior gap that
should be transparent, use the same flat solid magenta #FF00FF. Nano Banana must
not draw a checkerboard, alpha grid, or scene background.
Readable at 32×32 when displayed 1:1 on a dark #101a20 panel.
Palette: bone #f2e8d5, bone shadow #7a8f8a, teal dark #05090b, optional nerve
#ffd166 and joint #7bdff2 accents.
Pixel grid: crisp, no anti-aliasing, no blur, no noise.
```

**Negative prompt**

```text
text, letters, numbers, labels, captions, frame, border, card, panel, scene
background, gradient, drop shadow, glow, blur, anti-aliasing, checkerboard,
alpha checkerboard, transparency grid, non-magenta background, off-magenta
background, uneven magenta, 3D, perspective, photorealistic, literal anatomy,
organ, cell, neuron, muscle, room, platform, character, UI chrome, multiple
glyphs, sprite sheet, grid lines, clock face, watch, hour marks, stopwatch,
countdown numerals, calcium channel, membrane, circuit board, PCB, chip, socket
```

**Acceptance:** the trigger and arc read together as a short window; no clock
face, numerals, or literal channel.

---

## BPV2-06 — `ui.blueprint.symbol.ach-carry`

**Used by:** 04 Muscle Effector — Carry ACh (`carry`).
**Output:** 32×32 PNG on flat solid magenta `#FF00FF`.
**Variations:** 4.

**Positive prompt**

```text
A single 32×32 pixel-art glyph for a technical biological blueprint.
Subject: A small rounded capsule or packet with two short motion-trail dashes
behind it. Read as "an object being transported", not as a molecule, letter, or
container with a label.
Style: abstract circuit/process symbol, 1-bit bone line art with a subtle teal
shadow, 2 px maximum stroke, centered in a 32×32 cell, flat solid magenta
#FF00FF background, no text, no letters, no numbers, no frame, no border, no
literal anatomy, no organs, no cells, no room objects, no perspective, no
shading gradient.
All non-glyph areas, including the surrounding margin and every interior gap that
should be transparent, use the same flat solid magenta #FF00FF. Nano Banana must
not draw a checkerboard, alpha grid, or scene background.
Readable at 32×32 when displayed 1:1 on a dark #101a20 panel.
Palette: bone #f2e8d5, bone shadow #7a8f8a, teal dark #05090b, optional nerve
#ffd166 and joint #7bdff2 accents.
Pixel grid: crisp, no anti-aliasing, no blur, no noise.
```

**Negative prompt**

```text
text, letters, numbers, labels, captions, frame, border, card, panel, scene
background, gradient, drop shadow, glow, blur, anti-aliasing, checkerboard,
alpha checkerboard, transparency grid, non-magenta background, off-magenta
background, uneven magenta, 3D, perspective, photorealistic, literal anatomy,
organ, cell, neuron, muscle, room, platform, character, UI chrome, multiple
glyphs, sprite sheet, grid lines, molecule, chemical formula, ACh,
acetylcholine, neurotransmitter, pill bottle, package label, circuit board, PCB,
chip, socket, hardware
```

**Acceptance:** the capsule and motion dashes read as transport at 1×; no
letters, molecular bonds, or package markings.

---

## BPV2-07 — `ui.blueprint.symbol.receptor-bind`

**Used by:** 04 Muscle Effector — Bind receptor (`bind`).
**Output:** 32×32 PNG on flat solid magenta `#FF00FF`.
**Variations:** 4.

**Positive prompt**

```text
A single 32×32 pixel-art glyph for a technical biological blueprint.
Subject: A U-shaped socket with a matching capsule or key shape hovering at its
opening. The two shapes fit exactly. Read as "bind" or "specific fit", not as a
biological receptor or a lock-and-key illustration.
Style: abstract circuit/process symbol, 1-bit bone line art with a subtle teal
shadow, 2 px maximum stroke, centered in a 32×32 cell, flat solid magenta
#FF00FF background, no text, no letters, no numbers, no frame, no border, no
literal anatomy, no organs, no cells, no room objects, no perspective, no
shading gradient.
All non-glyph areas, including the surrounding margin and every interior gap that
should be transparent, use the same flat solid magenta #FF00FF. Nano Banana must
not draw a checkerboard, alpha grid, or scene background.
Readable at 32×32 when displayed 1:1 on a dark #101a20 panel.
Palette: bone #f2e8d5, bone shadow #7a8f8a, teal dark #05090b, optional nerve
#ffd166 and joint #7bdff2 accents.
Pixel grid: crisp, no anti-aliasing, no blur, no noise.
```

**Negative prompt**

```text
text, letters, numbers, labels, captions, frame, border, card, panel, scene
background, gradient, drop shadow, glow, blur, anti-aliasing, checkerboard,
alpha checkerboard, transparency grid, non-magenta background, off-magenta
background, uneven magenta, 3D, perspective, photorealistic, literal anatomy,
organ, cell, neuron, muscle, room, platform, character, UI chrome, multiple
glyphs, sprite sheet, grid lines, protein, membrane, receptor protein, lock and
key, padlock, circuit board, PCB, chip, socket, pin row, hardware port
```

**Acceptance:** socket and key are distinct silhouettes with one obvious fit; no
gap that reads as unbound; no lock iconography.

---

## BPV2-08 — `ui.blueprint.symbol.response-clear`

**Used by:** 04 Muscle Effector — Response + clearance (`respond`, `clear`).
**Output:** 32×32 PNG on flat solid magenta `#FF00FF`.
**Variations:** 4.

**Positive prompt**

```text
A single 32×32 pixel-art glyph for a technical biological blueprint.
Subject: Two lines entering from the left merge into one solid response line on
the right, while a short dashed tail breaks away and fades from the junction.
Read as "response then clearance", not as a brain, a switchboard, or a wiring
diagram.
Style: abstract circuit/process symbol, 1-bit bone line art with a subtle teal
shadow, 2 px maximum stroke, centered in a 32×32 cell, flat solid magenta
#FF00FF background, no text, no letters, no numbers, no frame, no border, no
literal anatomy, no organs, no cells, no room objects, no perspective, no
shading gradient.
All non-glyph areas, including the surrounding margin and every interior gap that
should be transparent, use the same flat solid magenta #FF00FF. Nano Banana must
not draw a checkerboard, alpha grid, or scene background.
Readable at 32×32 when displayed 1:1 on a dark #101a20 panel.
Palette: bone #f2e8d5, bone shadow #7a8f8a, teal dark #05090b, optional nerve
#ffd166 and joint #7bdff2 accents.
Pixel grid: crisp, no anti-aliasing, no blur, no noise.
```

**Negative prompt**

```text
text, letters, numbers, labels, captions, frame, border, card, panel, scene
background, gradient, drop shadow, glow, blur, anti-aliasing, checkerboard,
alpha checkerboard, transparency grid, non-magenta background, off-magenta
background, uneven magenta, 3D, perspective, photorealistic, literal anatomy,
organ, cell, neuron, muscle, room, platform, character, UI chrome, multiple
glyphs, sprite sheet, grid lines, brain, controller chip, microchip, circuit
board, PCB, socket, pin row, wiring diagram, merge arrow, flowchart, enzyme,
clearance cloud
```

**Acceptance:** the solid response line and dashed fading tail are both visible
at 1×; the glyph shows response and clearance without a second icon.

---

## BPV2-09 — `ui.blueprint.symbol.sensor-detect`

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

## BPV2-10 — `ui.blueprint.symbol.route-integrate`

**Used by:** 01 Interrupt Loop — Route + integrate (`route`, `integrate`).
**Output:** 32×32 PNG on flat solid magenta `#FF00FF`.
**Variations:** 4.

**Positive prompt**

```text
A single 32×32 pixel-art glyph for a technical hardware/process blueprint.
Subject: One trace entering from the left forks at a small switch node; one
branch continues as a signal-cyan output trace on the right and the other branch
stops at the node. Read as "route the signal and integrate it", not as a literal
socket, chip, wiring diagram, or biological junction.
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

## BPV2-11 — `ui.blueprint.symbol.cpu-wake`

**Used by:** 01 Interrupt Loop — Wake CPU (`wake`).
**Output:** 32×32 PNG on flat solid magenta `#FF00FF`.
**Variations:** 4.

**Positive prompt**

```text
A single 32×32 pixel-art glyph for a technical hardware/process blueprint.
Subject: A small square die window with a signal-cyan arc rising above it and one
short vertical wake tick. Read as "the CPU is waking", not as a clock face, a
literal chip, or a biological signal.
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

**Acceptance:** the square window and rising cyan arc read as a wake event at
1×; no numerals, clock face, or literal chip detail.

---

## BPV2-12 — `ui.blueprint.symbol.actuator-gate`

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
exit sign, architectural archway, literal actuator arm, piston assembly, machine
part, hardware photograph, circuit board, PCB, chip package, pin row, socket,
nerve amber, orange, muscle pink
```

**Acceptance:** the opening is central and obvious; the diagonal strut reads as
the actuating response; no architectural door or literal machine detail.

---

## Puzzle coverage matrix

| Puzzle | Component | Beats | Symbol | Prompt |
|---|---|---|---|---|
| 03 Nerve Forest | Two inputs | `input` | `input-pair` | BPV2-01 |
| 03 Nerve Forest | Threshold | `threshold` | `threshold-gauge` | BPV2-02 |
| 03 Nerve Forest | One-way flow | `axon` | `axon-flow` | BPV2-03 |
| 03 Nerve Forest | Terminal / exit | `terminal`, `exit` | `exit-gate` | BPV2-04 |
| 04 Muscle Effector | Trigger + Ca²⁺ window | `trigger`, `release` | `ca-window` | BPV2-05 |
| 04 Muscle Effector | Carry ACh | `carry` | `ach-carry` | BPV2-06 |
| 04 Muscle Effector | Bind receptor | `bind` | `receptor-bind` | BPV2-07 |
| 04 Muscle Effector | Response + clearance | `respond`, `clear` | `response-clear` | BPV2-08 |
| 01 Interrupt Loop | Detect change | `detect` | `sensor-detect` | BPV2-09 |
| 01 Interrupt Loop | Route + integrate | `route`, `integrate` | `route-integrate` | BPV2-10 |
| 01 Interrupt Loop | Wake CPU | `wake` | `cpu-wake` | BPV2-11 |
| 01 Interrupt Loop | Actuate response | `actuate` | `actuator-gate` | BPV2-12 |

## Generation and review order

1. BPV2-01 `input-pair`, BPV2-02 `threshold-gauge`, BPV2-03 `axon-flow`.
2. BPV2-04 `exit-gate`, BPV2-05 `ca-window`, BPV2-06 `ach-carry`.
3. BPV2-07 `receptor-bind`, BPV2-08 `response-clear`.
4. BPV2-09 `sensor-detect`, BPV2-10 `route-integrate`, BPV2-11 `cpu-wake`,
   BPV2-12 `actuator-gate`.

Generate four variations per symbol. Reject any result that reads as anatomy,
literal hardware, a labelled diagram, or an icon that only works at 4×. Then key,
fit, hand-clean, validate, smoke, and capture the 03, 04, and 01 headers.
