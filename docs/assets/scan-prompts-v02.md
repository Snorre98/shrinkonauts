# Scan prompts v02 — 03 Nerve Forest

**Status:** prompt-ready; no source generated
**Scope:** `sprite.scan.neuron`, `sprite.scan.myelin`, `sprite.scan.pathway`
**Replaces:** the whole-cell scan prompts in
[`prompt-library-v01.md`](prompt-library-v01.md) §5.1–§5.3 and the older
whole-cell prompts in
[`../m3/asset-requirements-v01.md`](../m3/asset-requirements-v01.md) §8.18.

## Why this revision exists

The old scan prompts produced a long horizontal neuron with a beaded tail. At
36×36 that plate fits **32×13** and reads as a strip. The old neuron and
pathway prompts were also almost the same image; the pathway added only a small
pulse. The new set is **three different objects with three different jobs**:

| Asset | Card fact | Job | Silhouette |
|---|---|---|---|
| `sprite.scan.neuron` | NERV-01#1 | neuron parts and direction | round cell with a star crown and curled axon |
| `sprite.scan.myelin` | NERV-01#3 | sheath, nodes, speed | capsule with a pinched node |
| `sprite.scan.pathway` | NERV-01#6 | all-or-none, one-way, saltatory | three-bead chain with a terminal fork |

`scan-myelin` now has its own sprite. The pads and terminal are interactable
props, not scans. The Keeper dialogue reveals CON-3, CON-5, and NERV-01#5.

## Generation settings

- **1:1 square canvas**, 1024 px on the long edge (2048 if the model supports it).
- **No reference image.** An image reference pulls the old horizontal layout back in.
- Flat solid magenta `#FF00FF` background.
- Four variations per prompt.
- Key with `npm run art:key`; fit with `npm run art:fit` at 36×36, 2 px margin.
- Do **not** use the old root JPEGs as sources. They are old-prompt outputs.

## Silhouette test first

The concept was checked as flat shapes before writing final art. The review
sheet is at
[`art-source/scan-silhouettes/scan-silhouette-review.png`](../../art-source/scan-silhouettes/scan-silhouette-review.png).
It shows the three proposed silhouettes at 1× in the actual room and at 8× next
to the Keeper, pads, and accepted scans. The first pass failed: the neuron read
as a blob, myelin as two eggs, and pathway as three dots. The current sheet uses
a star-crowned teardrop cell, a continuous capsule with a pinched node, and a
beaded chain with a terminal fork.

Re-run that sheet if the prompts change the silhouette. Do not generate final
art until the round/capsule/chain distinction survives at 1×. The neuron is the
remaining risk: its dendrite crown still reads as a blob in flat white. The
final 1px dark outline, bone/teal separation, and cyan rim must do the work that
the silhouette cannot; check it next to the Keeper after generation.

## Shared blocks

These are the complete shared blocks. Each prompt below already includes them.

### STYLE_SPRITE

```text
Pixel art for a side-view 2D platformer set inside a living human body. Native pixel grid, hard square pixels, crisp edges, no anti-aliasing, no smoothing, no mixed pixel sizes. Bold dark teal-brown outlines, one pixel at final sprite scale; flat fills from three-step ramps; 50% dither for damp membrane sheen, condensation, dust and grime. Gross-cute biology, wry deadpan tone, weird and fleshy but 12+ friendly: never gory, no shock humour. Strong readable shapes; characters and props must read as small sprites. Side view or slight 3/4 view.
```

### PALETTE

```text
Palette ramps: teal #05090b #101a20 #1d2f38; bone #c9b79a #f2e8d5 #fff8e8; bone shadow #5f736e #7a8f8a #9db4ad; nerve #b8862b #ffd166 #fff3b0; joint #3f9fb5 #7bdff2 #c9f7ff; muscle #a82a4a #ef476f #ff9fb2; sage #6f847d #9db4ad #c4d4ce; ink #000000 #05090b #2a3f47. Use only these ramp steps; no intermediate blends, no unapproved orange.
```

### FRAME_ENTITY_SQUARE

```text
Full object, centred inside a 1:1 square composition, with a clear empty margin on all sides; the subject fills about 80% of both the width and height. Isolated on a flat solid magenta #FF00FF background; no ground, no pedestal, no cast shadow, no scene, no frame. Draw the object large and clear; do not draw a pixel grid, a tiny sprite, or a sprite sheet. Hard pixel edges; no anti-aliasing. Do not compose the subject as a long horizontal strip or a wide diagram.
```

### NEGATIVE_SPRITE

```text
text, letters, numbers, logo, watermark, border, UI, labels, arrows, diagram lines, anti-aliasing, smooth gradient, painterly, 3D render, photorealism, anime, clean vector, high-res detail, mixed pixel sizes, faux pixel art, blurry edges, glossy plastic, neon cyberpunk, purple, neon green, orange, pure red, blood, gore, open wound, viscera, exposed organs, extra arms, extra tails, wings, detailed fingers, human face, multiple characters, scene background, ground, floor, pedestal, cast shadow, drop shadow, checkerboard, frame
```

---

## 1. `sprite.scan.neuron`

**Fact:** NERV-01#1 — dendrites, soma, one axon, axon terminals; information
flows dendrite → soma → axon → terminal.
**File:** `shared/sprites/scan-neuron.png` · **Display:** 36×36
**Silhouette target:** round cell, not a strip.

### Prompt

```text
SUBJECT: A single compact diagrammatic scan icon of one nerve cell, designed to read in a square 36×36 cell — not a character. A round bone-cream cell body fills the centre. Five short, stubby, branching dendrites radiate from the top and left of the body, separated from each other and from the body by clear dark gaps. One short cable-like axon leaves the lower right of the body, curves down and to the right as a separate cable outside the body, and ends in a small forked tip. A pale nerve-yellow nucleus glows inside the body. A thin joint-cyan rim traces the silhouette. The composition is roughly circular and fills about 80% of both the width and height of the square.

IN PLAIN SHAPES: the round body is the soma; the five branches are the dendrites; the short curled cable is the single axon; the forked tip is the axon terminals; the yellow glow is the nucleus. No myelin beads — myelin is a separate scan.

No face, eyes, arms, lantern, humanoid pose, labels, arrows, second axon, second cell body, long horizontal strip, or gore.

Pixel art for a side-view 2D platformer set inside a living human body. Native pixel grid, hard square pixels, crisp edges, no anti-aliasing, no smoothing, no mixed pixel sizes. Bold dark teal-brown outlines, one pixel at final sprite scale; flat fills from three-step ramps; 50% dither for damp membrane sheen, condensation, dust and grime. Gross-cute biology, wry deadpan tone, weird and fleshy but 12+ friendly: never gory, no shock humour. Strong readable shapes; characters and props must read as small sprites. Side view or slight 3/4 view.

Palette ramps: teal #05090b #101a20 #1d2f38; bone #c9b79a #f2e8d5 #fff8e8; bone shadow #5f736e #7a8f8a #9db4ad; nerve #b8862b #ffd166 #fff3b0; joint #3f9fb5 #7bdff2 #c9f7ff; muscle #a82a4a #ef476f #ff9fb2; sage #6f847d #9db4ad #c4d4ce; ink #000000 #05090b #2a3f47. Use only these ramp steps; no intermediate blends, no unapproved orange.

Full object, centred inside a 1:1 square composition, with a clear empty margin on all sides; the subject fills about 80% of both the width and height. Isolated on a flat solid magenta #FF00FF background; no ground, no pedestal, no cast shadow, no scene, no frame. Draw the object large and clear; do not draw a pixel grid, a tiny sprite, or a sprite sheet. Hard pixel edges; no anti-aliasing. Do not compose the subject as a long horizontal strip or a wide diagram.
```

### Negative

```text
text, letters, numbers, logo, watermark, border, UI, labels, arrows, diagram lines, anti-aliasing, smooth gradient, painterly, 3D render, photorealism, anime, clean vector, high-res detail, mixed pixel sizes, faux pixel art, blurry edges, glossy plastic, neon cyberpunk, purple, neon green, orange, pure red, blood, gore, open wound, viscera, exposed organs, extra arms, extra tails, wings, detailed fingers, human face, multiple characters, scene background, ground, floor, pedestal, cast shadow, drop shadow, checkerboard, frame, long horizontal strip, wide diagram, full-width tail, myelin beads, character, face, eyes, arms, lantern, humanoid, fur, hair, second axon, second cell body, labels, arrows
```

### Acceptance

- At 36×36 the round soma, five dendrites with clear dark gaps, one curled
  axon, forked terminal, and cyan rim read.
- Fitted subject fills at least 24×24 in the 36×36 cell; trimmed aspect ≤ 1.35.
- At least 300 opaque pixels at 36×36.
- Silhouette is a compact round cell, not a horizontal strip.
- Distinct from `sprite.agent.neuron`; no face, arms, or lantern.
- No text, arrows, or gore.

---

## 2. `sprite.scan.myelin`

**Fact:** NERV-01#3 — myelin is a lipid-rich sheath made by glial cells; gaps
are nodes of Ranvier; myelin speeds conduction.
**File:** `shared/sprites/scan-myelin.png` · **Display:** 36×36
**Silhouette target:** continuous capsule with a pinched node, not two eggs.

### Prompt

```text
SUBJECT: A single compact diagrammatic scan icon of a myelinated axon segment, designed to read in a square 36×36 cell — not a character. A thick dark teal axon cable runs diagonally from the lower left to the upper right. Two large pale bone-cream, bead-like myelin sleeves wrap the cable, with one clear dark node gap between them. Short bare cable stubs show at both ends. A thin joint-cyan rim traces the silhouette. The capsule fills about 80% of both the width and height of the square.

IN PLAIN SHAPES: the thick cable is the axon; the two pale beads are myelin sleeves; the dark gap between them is a node of Ranvier. No cell body, no dendrites, no terminal fork, no pulse.

No face, eyes, arms, lantern, labels, arrows, second cable, long horizontal strip, or gore.

Pixel art for a side-view 2D platformer set inside a living human body. Native pixel grid, hard square pixels, crisp edges, no anti-aliasing, no smoothing, no mixed pixel sizes. Bold dark teal-brown outlines, one pixel at final sprite scale; flat fills from three-step ramps; 50% dither for damp membrane sheen, condensation, dust and grime. Gross-cute biology, wry deadpan tone, weird and fleshy but 12+ friendly: never gory, no shock humour. Strong readable shapes; characters and props must read as small sprites. Side view or slight 3/4 view.

Palette ramps: teal #05090b #101a20 #1d2f38; bone #c9b79a #f2e8d5 #fff8e8; bone shadow #5f736e #7a8f8a #9db4ad; nerve #b8862b #ffd166 #fff3b0; joint #3f9fb5 #7bdff2 #c9f7ff; muscle #a82a4a #ef476f #ff9fb2; sage #6f847d #9db4ad #c4d4ce; ink #000000 #05090b #2a3f47. Use only these ramp steps; no intermediate blends, no unapproved orange.

Full object, centred inside a 1:1 square composition, with a clear empty margin on all sides; the subject fills about 80% of both the width and height. Isolated on a flat solid magenta #FF00FF background; no ground, no pedestal, no cast shadow, no scene, no frame. Draw the object large and clear; do not draw a pixel grid, a tiny sprite, or a sprite sheet. Hard pixel edges; no anti-aliasing. Do not compose the subject as a long horizontal strip or a wide diagram.
```

### Negative

```text
text, letters, numbers, logo, watermark, border, UI, labels, arrows, diagram lines, anti-aliasing, smooth gradient, painterly, 3D render, photorealism, anime, clean vector, high-res detail, mixed pixel sizes, faux pixel art, blurry edges, glossy plastic, neon cyberpunk, purple, neon green, orange, pure red, blood, gore, open wound, viscera, exposed organs, extra arms, extra tails, wings, detailed fingers, human face, multiple characters, scene background, ground, floor, pedestal, cast shadow, drop shadow, checkerboard, frame, cell body, dendrites, terminal fork, pulse, long horizontal strip, second cable, character, face, eyes, arms, lantern, humanoid, labels, arrows
```

### Acceptance

- At 36×36 two sleeves, one node gap, the dark cable stubs, and the cyan rim
  read.
- Fitted subject fills at least 24×24; trimmed aspect ≤ 1.35; ≥300 opaque px.
- Distinct from `sprite.scan.pathway`: capsule vs three-bead chain; no pulse.
- No cell body, dendrites, terminal fork, text, or arrows.

---

## 3. `sprite.scan.pathway`

**Fact:** NERV-01#6 — action potentials are all-or-none; stronger stimuli
increase frequency, not amplitude; the refractory period keeps the signal
one-way; myelinated axons use saltatory conduction.
**File:** `shared/sprites/scan-pathway.png` · **Display:** 36×36
**Silhouette target:** three-bead diagonal chain with a terminal fork.

### Prompt

```text
SUBJECT: A single compact diagrammatic scan icon of one-way conduction along a myelinated axon, designed to read in a square 36×36 cell — not a character. Three pale bone-cream, bead-like myelin sleeves sit in a diagonal chain from the upper left to the lower right, on a dark teal axon cable, with dark node gaps between them. A dim nerve-yellow spark sits at the upper-left node gap; a bright nerve-yellow pulse bursts at the middle node gap; the cable ends in a small forked terminal at the lower right. A thin joint-cyan rim traces the silhouette. The diagonal chain fills about 80% of both the width and height of the square.

IN PLAIN SHAPES: the three beads are myelin sleeves; the dark gaps are nodes of Ranvier; the dim-to-bright sparks are the action potential moving one way; the forked tip is the axon terminal. The pulse is in the node gap, not inside a sleeve.

No cell body, no dendrites, no face, eyes, arms, lantern, labels, arrows, second axon, long horizontal strip, or gore. The one-way reading comes from the dim-to-bright pulse sequence and the forked terminal, not an arrow.

Pixel art for a side-view 2D platformer set inside a living human body. Native pixel grid, hard square pixels, crisp edges, no anti-aliasing, no smoothing, no mixed pixel sizes. Bold dark teal-brown outlines, one pixel at final sprite scale; flat fills from three-step ramps; 50% dither for damp membrane sheen, condensation, dust and grime. Gross-cute biology, wry deadpan tone, weird and fleshy but 12+ friendly: never gory, no shock humour. Strong readable shapes; characters and props must read as small sprites. Side view or slight 3/4 view.

Palette ramps: teal #05090b #101a20 #1d2f38; bone #c9b79a #f2e8d5 #fff8e8; bone shadow #5f736e #7a8f8a #9db4ad; nerve #b8862b #ffd166 #fff3b0; joint #3f9fb5 #7bdff2 #c9f7ff; muscle #a82a4a #ef476f #ff9fb2; sage #6f847d #9db4ad #c4d4ce; ink #000000 #05090b #2a3f47. Use only these ramp steps; no intermediate blends, no unapproved orange.

Full object, centred inside a 1:1 square composition, with a clear empty margin on all sides; the subject fills about 80% of both the width and height. Isolated on a flat solid magenta #FF00FF background; no ground, no pedestal, no cast shadow, no scene, no frame. Draw the object large and clear; do not draw a pixel grid, a tiny sprite, or a sprite sheet. Hard pixel edges; no anti-aliasing. Do not compose the subject as a long horizontal strip or a wide diagram.
```

### Negative

```text
text, letters, numbers, logo, watermark, border, UI, labels, arrows, diagram lines, anti-aliasing, smooth gradient, painterly, 3D render, photorealism, anime, clean vector, high-res detail, mixed pixel sizes, faux pixel art, blurry edges, glossy plastic, neon cyberpunk, purple, neon green, orange, pure red, blood, gore, open wound, viscera, exposed organs, extra arms, extra tails, wings, detailed fingers, human face, multiple characters, scene background, ground, floor, pedestal, cast shadow, drop shadow, checkerboard, frame, cell body, dendrites, arrow, long horizontal strip, static sheath only, second axon, character, face, eyes, arms, lantern, humanoid
```

### Acceptance

- At 36×36 three beads, two node gaps, the dim-to-bright pulse sequence, the
  forked terminal, and the cyan rim read.
- Fitted subject fills at least 24×24; trimmed aspect ≤ 1.35; ≥300 opaque px.
- Pulse is in a node gap, not inside a sleeve.
- Distinct from `sprite.scan.myelin`: chain + terminal vs capsule; distinct
  from `sprite.scan.neuron`: no soma.
- No text, arrows, or gore.

---

## Prompt log template

| Field | Value |
|---|---|
| Prompt version | `scan-v02` |
| Style version | `style-pixel-v2` |
| Asset ID | |
| Fact | |
| Model / seed | |
| Aspect | 1:1 |
| Reference | none |
| Variations | 4 |
| Chosen file | |
| Key / fit report | |
| Fit dimensions / opaque px | |
| Silhouette check | round / capsule / chain |
| In-room 1× check | |
| Reviewer / date | |
| Licence | |

Record failed attempts; do not overwrite history.
