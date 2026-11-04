# M3.75 — Blueprint Symbol Prompts v01

**Status:** superseded — use [`blueprint-symbol-prompts-v02.md`](blueprint-symbol-prompts-v02.md) for the current puzzle-specific set; magenta-key output, no final art generated yet
**Date:** 2026-11-04
**Scope:** the nine blueprint symbols used by the three current puzzles
**Contract:** [`blueprint-symbol-asset-brief-v01.md`](blueprint-symbol-asset-brief-v01.md)
**Related:** [`README.md`](README.md), ADR-0049, ADR-0072, ADR-0080

This file contains one standalone positive and negative prompt per symbol. Copy
the whole block; no style macros or external prompt fragments are required.

All nine glyphs share the same output contract:

- 32×32 source and 32×32 display (`ui-1x`, 1:1);
- PNG, lossless, generated on a flat solid magenta `#FF00FF` chroma-key field;
  the field is removed to transparency with `npm run art:key` after generation;
- the entire surrounding margin and every interior gap that should be
  transparent must be the same flat `#FF00FF` magenta; Nano Banana does not
  generate alpha, so never ask it for a transparent background or checkerboard;
- bone `#f2e8d5`, bone shadow `#7a8f8a`, teal dark `#05090b`, optional nerve
  `#ffd166` and joint `#7bdff2` accents;
- no text, letters, numbers, frame, border, literal anatomy, or room objects;
- readable at 1× on a dark `#101a20` panel;
- four generated variations, then one reviewed master per symbol;
- the magenta field keys cleanly with no halo, fringe, checkerboard, or scene
  remnant.

Suggested source path:
`art-source/nanobanan/new/blueprint-symbols/<symbol>-v01.png`.

---

## BP-01 — `ui.blueprint.symbol.inputs`

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
#FF00FF background,
no text, no letters, no numbers, no frame, no border, no literal anatomy, no
organs, no cells, no room objects, no perspective, no shading gradient.
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
background, uneven magenta, 3D, perspective, photorealistic,
literal anatomy, organ, cell, neuron, muscle, room, platform, character, UI
chrome, multiple glyphs, sprite sheet, grid lines, dendrite, axon, synapse,
biological tissue, circuit board, PCB, chip, socket, pin row, wiring diagram
```

**Acceptance:** the two terminal circles read as separate inputs; the junction
reads as one combined signal; no third input or decorative circuitry.

---

## BP-02 — `ui.blueprint.symbol.threshold`

**Used by:** 03 Nerve Forest — Threshold (`threshold`).
**Output:** 32×32 PNG on flat solid magenta `#FF00FF`.
**Variations:** 4.

**Positive prompt**

```text
A single 32×32 pixel-art glyph for a technical biological blueprint.
Subject: A vertical gauge with a horizontal fill line near the top and one
notch cut into the right edge. The fill stops exactly at the notch. Read as
"enough" or "threshold reached", not as a counter or thermometer.
Style: abstract circuit/process symbol, 1-bit bone line art with a subtle teal
shadow, 2 px maximum stroke, centered in a 32×32 cell, flat solid magenta
#FF00FF background,
no text, no letters, no numbers, no frame, no border, no literal anatomy, no
organs, no cells, no room objects, no perspective, no shading gradient.
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
background, uneven magenta, 3D, perspective, photorealistic,
literal anatomy, organ, cell, neuron, muscle, room, platform, character, UI
chrome, multiple glyphs, sprite sheet, grid lines, thermometer, speedometer,
numeric scale, counter display, circuit board, PCB, chip, socket, pin row
```

**Acceptance:** the fill/notch relationship is visible at 1×; no numbers or
tick labels; the glyph reads as a condition being met.

---

## BP-03 — `ui.blueprint.symbol.flow`

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
#FF00FF background,
no text, no letters, no numbers, no frame, no border, no literal anatomy, no
organs, no cells, no room objects, no perspective, no shading gradient.
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
background, uneven magenta, 3D, perspective, photorealistic,
literal anatomy, organ, cell, neuron, muscle, room, platform, character, UI
chrome, multiple glyphs, sprite sheet, grid lines, axon, dendrite, myelin,
biological tissue, road, pipe, tube, circuit board, PCB, trace, wiring diagram
```

**Acceptance:** one bead, one conduit, one arrowhead; direction is unambiguous;
no branch or second path.

---

## BP-04 — `ui.blueprint.symbol.gate`

**Used by:** 03 Nerve Forest — Terminal / exit (`terminal`, `exit`); 01 Interrupt
Loop — Actuate response (`actuate`).
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
#FF00FF background,
no text, no letters, no numbers, no frame, no border, no literal anatomy, no
organs, no cells, no room objects, no perspective, no shading gradient.
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
background, uneven magenta, 3D, perspective, photorealistic,
literal anatomy, organ, cell, neuron, muscle, room, platform, character, UI
chrome, multiple glyphs, sprite sheet, grid lines, door, doorway, exit sign,
archway building, circuit board, PCB, chip, socket, actuator arm, hardware
```

**Acceptance:** the opening is central and obvious; the side posts read as a
barrier that has moved aside; no architectural door detail.

---

## BP-05 — `ui.blueprint.symbol.timer`

**Used by:** 04 Muscle Effector — Trigger + Ca²⁺ window (`trigger`, `release`);
01 Interrupt Loop — Wake CPU (`wake`).
**Output:** 32×32 PNG on flat solid magenta `#FF00FF`.
**Variations:** 4.

**Positive prompt**

```text
A single 32×32 pixel-art glyph for a technical biological blueprint.
Subject: A partial circular arc, open at the lower right, with one short tick
mark at the open end and one small radial hand. Read as a timed window or a
brief opportunity, not as a clock face.
Style: abstract circuit/process symbol, 1-bit bone line art with a subtle teal
shadow, 2 px maximum stroke, centered in a 32×32 cell, flat solid magenta
#FF00FF background,
no text, no letters, no numbers, no frame, no border, no literal anatomy, no
organs, no cells, no room objects, no perspective, no shading gradient.
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
background, uneven magenta, 3D, perspective, photorealistic,
literal anatomy, organ, cell, neuron, muscle, room, platform, character, UI
chrome, multiple glyphs, sprite sheet, grid lines, clock face, watch, hour marks,
stopwatch, countdown numerals, circuit board, PCB, chip, timer IC, hardware
```

**Acceptance:** the arc and single tick read as a window; no numerals or clock
face; the open end suggests a limited interval.

---

## BP-06 — `ui.blueprint.symbol.carry`

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
#FF00FF background,
no text, no letters, no numbers, no frame, no border, no literal anatomy, no
organs, no cells, no room objects, no perspective, no shading gradient.
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
background, uneven magenta, 3D, perspective, photorealistic,
literal anatomy, organ, cell, neuron, muscle, room, platform, character, UI
chrome, multiple glyphs, sprite sheet, grid lines, molecule, chemical formula,
ACh, acetylcholine, neurotransmitter, pill bottle, package label, circuit board,
PCB, chip, socket, hardware
```

**Acceptance:** the capsule and motion dashes read as transport at 1×; no
letters, molecular bonds, or package markings.

---

## BP-07 — `ui.blueprint.symbol.receptor`

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
#FF00FF background,
no text, no letters, no numbers, no frame, no border, no literal anatomy, no
organs, no cells, no room objects, no perspective, no shading gradient.
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
background, uneven magenta, 3D, perspective, photorealistic,
literal anatomy, organ, cell, neuron, muscle, room, platform, character, UI
chrome, multiple glyphs, sprite sheet, grid lines, protein, membrane, receptor
protein, lock and key, padlock, circuit board, PCB, chip, socket, pin row,
hardware port
```

**Acceptance:** socket and key are distinct silhouettes with one obvious fit;
no gap that reads as unbound; no lock iconography.

---

## BP-08 — `ui.blueprint.symbol.relay`

**Used by:** 04 Muscle Effector — Response + clearance (`respond`, `clear`);
01 Interrupt Loop — Route + integrate (`route`, `integrate`).
**Output:** 32×32 PNG on flat solid magenta `#FF00FF`.
**Variations:** 4.

**Positive prompt**

```text
A single 32×32 pixel-art glyph for a technical biological blueprint.
Subject: Two lines entering from the left merge into one line exiting on the
right, with a small switch node at the junction. Read as a relay, junction, or
hand-off, not as a brain, controller chip, or wiring diagram.
Style: abstract circuit/process symbol, 1-bit bone line art with a subtle teal
shadow, 2 px maximum stroke, centered in a 32×32 cell, flat solid magenta
#FF00FF background,
no text, no letters, no numbers, no frame, no border, no literal anatomy, no
organs, no cells, no room objects, no perspective, no shading gradient.
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
background, uneven magenta, 3D, perspective, photorealistic,
literal anatomy, organ, cell, neuron, muscle, room, platform, character, UI
chrome, multiple glyphs, sprite sheet, grid lines, brain, controller chip,
microchip, circuit board, PCB, socket, pin row, wiring diagram, merge arrow,
flowchart
```

**Acceptance:** two inputs and one output are clear; the switch node is visible
at 1×; no controller, brain, or chip silhouette.

---

## BP-09 — `ui.blueprint.symbol.pulse`

**Used by:** 01 Interrupt Loop — Detect change (`detect`).
**Output:** 32×32 PNG on flat solid magenta `#FF00FF`.
**Variations:** 4.

**Positive prompt**

```text
A single 32×32 pixel-art glyph for a technical biological blueprint.
Subject: A compact spark or wave emitted from one point, made of three short
radiating ticks and one small forward bead. Read as "a change was detected",
not as a lightning bolt or a biological signal.
Style: abstract circuit/process symbol, 1-bit bone line art with a subtle teal
shadow, 2 px maximum stroke, centered in a 32×32 cell, flat solid magenta
#FF00FF background,
no text, no letters, no numbers, no frame, no border, no literal anatomy, no
organs, no cells, no room objects, no perspective, no shading gradient.
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
background, uneven magenta, 3D, perspective, photorealistic,
literal anatomy, organ, cell, neuron, muscle, room, platform, character, UI
chrome, multiple glyphs, sprite sheet, grid lines, lightning bolt, electricity
symbol, radio tower, wifi, biological signal, circuit board, PCB, chip, socket,
sensor, hardware
```

**Acceptance:** the pulse originates from one point; three ticks and one bead
read at 1×; no lightning-bolt or wifi silhouette.

---

## Puzzle coverage matrix

| Puzzle | Component | Beats | Symbol | Prompt |
|---|---|---|---|---|
| 03 Nerve Forest | Two inputs | `input` | `inputs` | BP-01 |
| 03 Nerve Forest | Threshold | `threshold` | `threshold` | BP-02 |
| 03 Nerve Forest | One-way flow | `axon` | `flow` | BP-03 |
| 03 Nerve Forest | Terminal / exit | `terminal`, `exit` | `gate` | BP-04 |
| 04 Muscle Effector | Trigger + Ca²⁺ window | `trigger`, `release` | `timer` | BP-05 |
| 04 Muscle Effector | Carry ACh | `carry` | `carry` | BP-06 |
| 04 Muscle Effector | Bind receptor | `bind` | `receptor` | BP-07 |
| 04 Muscle Effector | Response + clearance | `respond`, `clear` | `relay` | BP-08 |
| 01 Interrupt Loop | Detect change | `detect` | `pulse` | BP-09 |
| 01 Interrupt Loop | Route + integrate | `route`, `integrate` | `relay` | BP-08 |
| 01 Interrupt Loop | Wake CPU | `wake` | `timer` | BP-05 |
| 01 Interrupt Loop | Actuate response | `actuate` | `gate` | BP-04 |

## Generation and review order

1. BP-01 `inputs`, BP-02 `threshold`, BP-03 `flow` — the 03 core.
2. BP-04 `gate`, BP-05 `timer` — destination and window.
3. BP-06 `carry`, BP-07 `receptor`, BP-08 `relay` — 04 transport and response.
4. BP-09 `pulse` — Silicon detection.

Generate four variations per symbol. Review at 1× on `#101a20`; reject any glyph
that only reads at 4× or needs its label. Then run the key, fit, hand-clean,
manifest, validation, smoke, and 1280×720 header-capture steps in the asset
brief.
