# M3.75 — Blueprint Symbol Asset Brief and Prompt Pack v01

**Status:** proposed asset brief — no final art generated yet
**Date:** 2026-11-04
**Scope:** the abstract symbol kit used by the in-room puzzle blueprint
**Depends on:** M3 palette, ADR-0049, ADR-0072, ADR-0073, ADR-0080
**Related:** [`README.md`](README.md)

This brief defines the visual grammar, symbol register, nanobanana prompt pack,
atlas layout, manifest wiring, and acceptance gates for the M3.75 blueprint.

The kit is intentionally **abstract and conceptual**. It should read as a
technical/biological schematic, not as a miniature room map and not as literal
anatomy. The player should understand *what kind of step* a component represents
and *how the signal flows*, without the diagram spelling out the puzzle.

---

## 1. Design constraints

| Constraint | Value |
|---|---|
| Source size | 32×32 px per glyph |
| Display size | 32×32 px (`ui-1x`, 1:1) |
| Format | PNG, transparent background, lossless |
| Palette | Bone `#f2e8d5`, bone shadow `#7a8f8a`, teal dark `#05090b`, nerve `#ffd166`, joint `#7bdff2`, orange `#e59b34` |
| Stroke | 1–2 px, consistent across the set |
| Text | None in the raster glyphs; labels are DOM text in the popup/tooltips |
| Frames | None; DOM supplies component frames and labels |
| Readability | Must read at 32×32 on the dark HUD panel |
| State variants | Base glyph plus CSS state treatments; generate only a few state glyphs |

The palette is the locked M3 palette. Do not introduce new hues except for the
P1 orange and P2 joint-cyan markers.

---

## 2. Visual grammar

### 2.1 Components

The blueprint is a compact left-to-right causal chain of **2–10 components**,
normally **2–4**. Each component is a conceptual station, not a room object:

- **Input / source** — something the player activates.
- **Accumulator / threshold** — a quantity that must reach a condition.
- **Flow / conductor** — a one-way path or signal.
- **Gate / barrier** — something that opens or blocks.
- **Terminal / target** — a destination or socket.
- **Relay / junction** — a combination or hand-off.
- **Timer / window** — a time-limited opportunity.
- **Carry / packet** — an object that must be transported.
- **Receptor / bind** — a specific fit between two things.
- **Pulse / wave** — an emitted signal.
- **Goal / beacon** — an optional glyph for a final component.
- **Player markers** — P1 orange, P2 blue/cyan.

A component groups one or more checklist beats. The header shows **icons only**;
the popup and hover/focus tooltips carry the labels. All components are visible
from the start with `done`, `active`, or `pending` states. There is no separate
goal anchor; the last component is the goal.

### 2.2 Connectors

Connectors are CSS/SVG, not raster:

- solid line = completed flow;
- low-contrast line = pending flow;
- arrowhead = one-way;
- active connector = player-coloured or nerve-coloured highlight;
- reduced motion removes pulse animation but keeps the highlight.

### 2.3 State overlays

Use CSS/DOM for states to avoid multiplying the asset count:

- `done`: inked glyph + a small check stamp (CSS or a generated `check` glyph).
- `active`: player-coloured ring/outline around the glyph.
- `pending`: low-opacity glyph with a low-contrast connector.
- `locked`: optional dashed outline for an unavailable/future component.

Only the base glyphs and a `check`/`lock`/`unknown` glyph are required from
nanobanana. The rings, dashes, and opacity are CSS.

---

## 3. Symbol register

Logical IDs follow the asset manifest. The UI falls back to a CSS placeholder if
an ID is unresolved.

### 3.1 Core glyphs

| Logical ID | Concept | Visual description | Used by |
|---|---|---|---|
| `ui.blueprint.symbol.inputs` | Two inputs | Two small circles feeding a single line; asymmetric spacing | 03 "Two inputs" |
| `ui.blueprint.symbol.threshold` | Threshold / accumulator | A vertical gauge with a fill line and a notch; reads as "enough" | 03 "Threshold" |
| `ui.blueprint.symbol.flow` | One-way flow | A short conduit with a bead and a forward arrow; no cell body | 03 "One-way flow", generic flow |
| `ui.blueprint.symbol.terminal` | Terminal / destination | A forked end or socket receiving a line | Optional 03 terminal |
| `ui.blueprint.symbol.gate` | Gate / exit | A barrier that has opened into an arch; not a door illustration | 03 "Terminal / exit", 01 "Actuate response" |
| `ui.blueprint.symbol.relay` | Relay / junction | Two lines merging into one, with a small switch node | 04 "Response + clearance", 01 "Route + integrate" |
| `ui.blueprint.symbol.timer` | Timer / window | A partial arc with a tick mark; suggests a window, not a clock face | 04 "Trigger + Ca²⁺ window", 01 "Wake CPU" |
| `ui.blueprint.symbol.carry` | Carry / packet | A capsule or packet with a motion trail | 04 "Carry ACh" |
| `ui.blueprint.symbol.receptor` | Receptor / bind | A socket with a matching key/capsule shape | 04 "Bind receptor" |
| `ui.blueprint.symbol.pulse` | Pulse / wave | A compact spark or wave emitted from a point | 01 "Detect change" |
| `ui.blueprint.symbol.clear` | Clearance / decay | A fading particle or broken line returning to neutral | Optional 04 clearance |
| `ui.blueprint.symbol.goal` | Goal / beacon | A small beacon or flag with radiating ticks | Optional final component |

### 3.2 Markers and utility glyphs

| Logical ID | Concept | Visual description |
|---|---|---|
| `ui.blueprint.symbol.marker.p1` | P1 marker | Orange chevron/helmet dot; readable at 16–32 px |
| `ui.blueprint.symbol.marker.p2` | P2 marker | Joint-cyan chevron/helmet dot; same silhouette as P1 |
| `ui.blueprint.symbol.check` | Done | Simple pixel check mark |
| `ui.blueprint.symbol.lock` | Locked/unknown | Small padlock or dashed square |
| `ui.blueprint.symbol.unknown` | Unknown step | Question-mark-like notch or dashed node |

### 3.3 Optional variants

Do **not** generate separate `active`/`done`/`pending` versions of every glyph.
Generate base glyphs only. If a glyph needs a distinct silhouette for a state,
add it as a separate logical ID with a clear name.

---

## 4. Component mappings

These are the authored target mappings. They reduce 5–6 checklist beats to four
visual components.

### 4.1 03 Nerve Forest — 4 components

| Component | Groups beats | Symbol |
|---|---|---|
| Two inputs | `input` | `ui.blueprint.symbol.inputs` |
| Threshold | `threshold` | `ui.blueprint.symbol.threshold` |
| One-way flow | `axon` | `ui.blueprint.symbol.flow` |
| Terminal / exit | `terminal`, `exit` | `ui.blueprint.symbol.gate` |

### 4.2 04 Muscle Effector — 4 components

| Component | Groups beats | Symbol |
|---|---|---|
| Trigger + Ca²⁺ window | `trigger`, `release` | `ui.blueprint.symbol.timer` |
| Carry ACh | `carry` | `ui.blueprint.symbol.carry` |
| Bind receptor | `bind` | `ui.blueprint.symbol.receptor` |
| Response + clearance | `respond`, `clear` | `ui.blueprint.symbol.relay` |

### 4.3 01 Interrupt Loop — 4 components

| Component | Groups beats | Symbol |
|---|---|---|
| Detect change | `detect` | `ui.blueprint.symbol.pulse` |
| Route + integrate | `route`, `integrate` | `ui.blueprint.symbol.relay` |
| Wake CPU | `wake` | `ui.blueprint.symbol.timer` |
| Actuate response | `actuate` | `ui.blueprint.symbol.gate` |

The `goal`, `clear`, and `terminal` glyphs remain optional alternatives for
future puzzles or for a final component that needs a stronger destination read.

---

## 5. Prompt pack

The standalone copy/paste prompts for the nine symbols used by the three current
puzzles are in
[`blueprint-symbol-prompts-v01.md`](blueprint-symbol-prompts-v01.md). That file
contains the full positive and negative prompt for each symbol plus the
puzzle-to-component coverage matrix. The template and register below remain the
design contract for future symbols.

### 5.1 Base prompt template

Use the existing nanobanana style block and palette block, then add:

```text
A single 32×32 pixel-art glyph for a technical biological blueprint.
Subject: {SYMBOL_DESCRIPTION}.
Style: abstract circuit/process symbol, 1-bit bone line art with a subtle teal
shadow, 2 px maximum stroke, centered in a 32×32 cell, transparent background,
no text, no letters, no numbers, no frame, no border, no literal anatomy, no
organs, no cells, no room objects, no perspective, no shading gradient.
Readable at 32×32 when displayed 1:1 on a dark #101a20 panel.
Palette: bone #f2e8d5, bone shadow #7a8f8a, teal dark #05090b, optional nerve
#ffd166 and joint #7bdff2 accents.
Pixel grid: crisp, no anti-aliasing, no blur, no noise.
```

### 5.2 Negative prompt

```text
text, letters, numbers, labels, captions, frame, border, card, panel, background,
gradient, drop shadow, glow, blur, anti-aliasing, 3D, perspective, photorealistic,
literal anatomy, organ, cell, neuron, muscle, room, platform, character, UI
chrome, multiple glyphs, sprite sheet, grid lines
```

### 5.3 Batch order

Generate in this order so the visual language settles before the long tail:

1. `inputs`, `threshold`, `flow` — the core 03 vocabulary.
2. `gate`, `terminal`, `goal` — the 03 destination/final-component vocabulary.
3. `timer`, `carry`, `receptor` — the 04 transport/binding vocabulary.
4. `relay`, `pulse`, `clear` — the 04 response/clearance vocabulary.
5. `marker.p1`, `marker.p2`, `check`, `lock`, `unknown` — utility glyphs.

Generate four variations per symbol and choose one. Do not mix stroke weights
across batches; if a later batch looks heavier, regenerate the earlier batch or
normalise the stroke during cleanup.

### 5.4 Variation and review

For each symbol, review at 1× on `#101a20`:

- Does it read without its label?
- Is the silhouette distinct from its neighbours?
- Is the stroke weight consistent with the rest of the set?
- Does it avoid literal anatomy or room-object shapes?
- Is the transparent background clean?
- Is the glyph centered and within the 32×32 safe area?

Reject any glyph that only reads at 4× or that needs its label to be understood.

---

## 6. Pipeline

1. Generate the symbol at high resolution with nanobanana.
2. Remove the background with `npm run art:key` (or the existing key workflow).
3. Fit to 32×32 with `npm run art:fit` using the `ui-1x` class and a 32×32 cell.
4. Slice or assemble the atlas with `npm run art:slice` / `npm run art:atlas`.
5. Hand-clean the 32×32 master if the fit loses the silhouette.
6. Add the final entry to `assets.final.json` and the placeholder entry to
   `assets.placeholder.json`.
7. Run `npm run pack:validate` and `npm run pack:smoke`.
8. Capture the header at 1280×720 and review the blueprint at 1×.

### 6.1 Atlas layout

Preferred: one atlas `ui.blueprint.symbols` at 256×128 px, 8 columns × 4 rows of
32×32 cells. Named regions:

```json
{
  "type": "atlas",
  "src": "shared/ui/blueprint-symbols.png",
  "width": 256,
  "height": 128,
  "fidelity": "ui-1x",
  "display": { "width": 32, "height": 32 },
  "regions": {
    "inputs":    { "x": 0,   "y": 0,  "width": 32, "height": 32 },
    "threshold": { "x": 32,  "y": 0,  "width": 32, "height": 32 },
    "flow":      { "x": 64,  "y": 0,  "width": 32, "height": 32 },
    "terminal":  { "x": 96,  "y": 0,  "width": 32, "height": 32 },
    "gate":      { "x": 128, "y": 0,  "width": 32, "height": 32 },
    "goal":      { "x": 160, "y": 0,  "width": 32, "height": 32 }
  }
}
```

The exact region map is finalised when the sheet is sliced. If atlas generation
is unreliable, ship individual PNGs with the same logical IDs and 32×32 display.

### 6.2 Manifest and theme wiring

- Add placeholder entries to `public/packs/anatomy-reflex/assets.placeholder.json`
  with CSS placeholder specs (a short label and a simple shape).
- Add final entries to `assets.final.json` when art is accepted.
- The blueprint data references logical IDs such as
  `ui.blueprint.symbol.inputs`.
- The UI resolves them through the asset provider. If unresolved, it renders a
  CSS fallback glyph with the component's short label.

---

## 7. Acceptance gates

### 7.1 Per-glyph

- [ ] 32×32 source, 32×32 display, 1:1.
- [ ] Transparent background; no halo or fringe.
- [ ] Readable at 1× on `#101a20`.
- [ ] Distinct silhouette from every other glyph in the set.
- [ ] No text, letters, numbers, frame, or border.
- [ ] No literal anatomy, organ, cell, room, or character shapes.
- [ ] Stroke weight consistent with the set.
- [ ] Palette distance within the M3 limit (max 32 against the locked palette).
- [ ] Opaque pixel count meets the `ui-1x` glyph readability gate (target ≥ 180).

### 7.2 Set-level

- [ ] The 03 chain reads as inputs → threshold → one-way flow → terminal/exit.
- [ ] The 04 chain reads as trigger/window → carry → bind → response/clear.
- [ ] P1/P2 markers are distinguishable by shape and colour.
- [ ] The final-component glyph is distinct from the generic gate/flow glyphs.
- [ ] The set works at 32×32 without labels; labels improve, not rescue, it.
- [ ] The set does not look like a minimap or a literal anatomical diagram.

### 7.3 Integration

- [ ] `pack:validate` passes with the new manifest entries.
- [ ] `pack:smoke` passes.
- [ ] The compact header blueprint renders 2–4 icons at 1280×720 and 1920×1080.
- [ ] The expanded `Tab` popup uses the same glyphs with labels and the system
  chain.
- [ ] Text scale 150%/200% does not blur or crop the glyphs.
- [ ] Reduced motion does not remove state information.

---

## 8. Placeholder-first policy

The HUD must ship before the final symbols exist. The placeholder strategy:

- The UI renders a 32×32 CSS tile with a short code (for example `IN`, `TH`,
  `FL`, `TE`, `GT`) and a state ring.
- The placeholder uses the player/nerve colours, not a generic grey.
- The placeholder is clearly a placeholder in debug/capture mode, but readable
  in normal play.
- The final asset replaces the placeholder without changing the blueprint data
  or layout.

This keeps M3.75 unblocked and makes the asset acceptance gate independent of
the HUD implementation.

---

## 9. Open questions

1. Atlas vs individual PNGs: the atlas is preferred, but the final decision
   depends on how cleanly nanobanana can produce a sheet.
2. Should the P1/P2 markers be full tiny astronaut helmets or abstract chevrons?
   The brief recommends abstract chevrons so they read at 16–32 px.
3. Should the final 03 component use the `gate` glyph or the `goal` glyph? The
   current mapping uses `gate`; the `goal` glyph is an optional alternative.
4. Should the 04 "clearance" step share the relay glyph or use the dedicated
   `clear` glyph? The current mapping groups response + clearance under `relay`;
   `clear` remains available if the combined glyph is too busy.

---

## 10. References

- [`README.md`](README.md) — M3.75 milestone.
- [`../adr-presentation/0080-hud-blueprint-and-player-colors.md`](../adr-presentation/0080-hud-blueprint-and-player-colors.md)
- [`../adr-presentation/0072-asset-fidelity-tiers-and-encoding.md`](../adr-presentation/0072-asset-fidelity-tiers-and-encoding.md)
- [`../m3/asset-requirements-v01.md`](../m3/asset-requirements-v01.md)
- [`../assets/prompt-library-v01.md`](../assets/prompt-library-v01.md)
- [`../../scripts/art-fit.ts`](../../scripts/art-fit.ts)
- [`../../scripts/art-atlas.ts`](../../scripts/art-atlas.ts)
- [`../../public/packs/anatomy-reflex/assets.placeholder.json`](../../public/packs/anatomy-reflex/assets.placeholder.json)
- [`../../public/packs/anatomy-reflex/assets.final.json`](../../public/packs/anatomy-reflex/assets.final.json)
