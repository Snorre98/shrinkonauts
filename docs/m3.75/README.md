# M3.75 — In-Room HUD: Compact Blueprint, Progress, and Player Cards

**Status:** implemented — automated validation complete; CSS placeholder symbols; human playtest pending
**Date:** 2026-11-04
**Owner:** Snorre
**Depends on:** M1.75 feedback beats, M3 art direction, ADR-0049, ADR-0072, ADR-0073
**Feeds:** final HUD, GDD/video capture, playtest build, M4 online HUD

M3.75 is a focused HUD milestone. It does not add puzzle mechanics, levels, or
final world art. It turns the in-room HUD from a set of disconnected panels into
a persistent planning surface: **where am I, what is the goal, what is the next
step, and how do I act?**

---

## 1. Why M3.75 exists

The current in-room HUD has five separate surfaces:

| Surface | Current behaviour | Problem |
|---|---|---|
| Header | Title, objectives, abilities, badges | No map; hint text is hidden unless a hint has already been requested |
| Map | `Tab` opens a modal system-map node graph | Not persistent; it answers "where am I in the pack", not "what is the puzzle solution" |
| Progress | Bottom-left `.feedback-beats` list | Covers P1's spawn; disconnected from the map |
| Controls | Top-right `.hud__help` panel | One dense list for both players; no player colour |
| Hint | Buried in the pause/settings overlay | Hard to discover; no count or history |

Player-coded feedback is also inconsistent: P1 is currently joint-cyan and P2 is
muscle-pink, which does not match the player suits.

M3.75 fixes the information architecture, not just the styling.

---

## 2. Locked direction

| Decision | Choice |
|---|---|
| Header layout | Single three-zone band: identity left, compact blueprint centre, checklist right; hint/status strip below |
| Header height | Compact by default (roughly 130–160 px at 1280×720); expandable through the `Tab` popup |
| Map purpose | A compact **visual abstraction** of the current puzzle, not a room or system map |
| Blueprint size | 2–10 components, target 2–4; each component groups one or more beats |
| Blueprint text | Icons only in the header blueprint; labels live in the `Tab` popup and hover/focus tooltips |
| Blueprint progress | All components visible with done/active/pending states; the last component is the goal |
| Room-to-room context | Not in the header; lives in the `Tab` popup together with the expanded blueprint |
| `Tab` popup | Expanded blueprint + room-to-room context + legend + hint history |
| Checklist | Current puzzle beats only; vertical compact list in header right |
| Hint | Header button + text + count; cycles; highlights the active blueprint component |
| Bottom cards | P1 bottom-left, P2 bottom-right; full per-player controls; shared controls in pause |
| Player colours | P1 orange `#e59b34`, P2 blue/cyan `#7bdff2`, applied across HUD and feedback |

### 2.1 The blueprint mental model

The blueprint is **not** a mini system map and **not** a one-node-per-beat
stepper. It is a compact visual summary of the room puzzle:

- 2–10 authored components, normally 2–4;
- each component is an abstract nanobanana icon plus CSS/SVG connectors;
- each component groups one or more checklist beats;
- no text in the header blueprint; labels live in the `Tab` popup and
  hover/focus tooltips;
- the detailed beats stay in the checklist;
- the room-to-room context is secondary and only appears in the `Tab` popup.

For example, 03 Node Run has five checklist beats but four blueprint components:

```text
[two inputs] → [threshold] → [one-way flow] → [terminal/exit]
```

The player sees the shape of the puzzle without a labelled walkthrough. The
checklist explains the individual tasks; the blueprint explains the causal
shape.

---

## 3. Milestone boundary

### In scope

- In-room (level) HUD only.
- Three-zone header, header checklist, header hint strip, bottom player cards.
- Compact component-based blueprint and expanded `Tab` popup.
- Authored blueprint data for `03-nerve-forest` and `04-muscle-effector`.
- Blueprint symbol asset brief and nanobanana prompt pack.
- Player colour tokens and migration of player-coded feedback.
- Safe-area integration so prompts, toasts, and feedback surfaces do not render
  under the new HUD.
- Responsive/density states, text-scale behaviour, reduced motion, screen-reader
  labels, and automated tests.
- Documentation and capture updates.

### Out of scope

- Bathroom hub UI, gate overlay, debrief, concept log, or pause redesign beyond
  removing the puzzle hint section.
- New puzzle mechanics, new levels, or a curriculum rewrite.
- Final world art, final audio, or a general HUD skin.
- Online co-op, phone controller, key rebinding, mobile touch controls, or
  localization.
- A full replacement of the system-map data model. The existing `MapView`
  remains the source for the room-to-room context in the `Tab` popup.

---

## 4. HUD layout

At 1280×720, full density:

```text
┌──────────────────────────────────────────────────────────────────────────────┐
│ M1 · 03-NERVE-FOREST                                                         │
│ NERVE FOREST                    ┌───────────────────────────────┐  PROGRESS  │
│ Objectives: OBJ-2 · co-op       │                               │  ✓ Input   │
│ P1: scan · dash · pulse         │  ◇ ── ● ── ○ ── ◇             │  ● Thresh. │
│ P2: scan · carry                │  (icons only, no labels)      │  ○ Axon    │
│                                 │                               │  ○ Terminal│
│                                 └───────────────────────────────┘  ○ Exit    │
├──────────────────────────────────────────────────────────────────────────────┤
│ [Hint 1/3] One input is below threshold…        [FINAL] [AUDIO] [AUTOSAVED]  │
└──────────────────────────────────────────────────────────────────────────────┘

┌ P1 ─────────────────────────────┐        ┌ P2 ─────────────────────────────┐
│ A D move  W/Space jump  Shift   │        │ ← → move  ↑ jump  / dash        │
│ E interact  Q scan  F pulse     │        │ , interact  . scan  ' carry     │
│ G carry  H throw  1–5 choose    │        │ ; throw  Delete cancel          │
└─────────────────────────────────┘        └─────────────────────────────────┘
```

The header no longer shows a room-to-room context chain. The blueprint centre is
a short icon strip, not a labelled diagram. The `Tab` popup carries the labels,
legend, hint history, and room context.

### 4.1 Header zones

- **Identity (left):** eyebrow, level title, objectives, per-player ability
  summary. It keeps the current information but loses the hint row.
- **Blueprint (centre):** 2–4 abstract components connected left to right, with
  no text in the header blueprint. The active component is highlighted;
  completed components are inked; pending components are faint. Hover/focus
  shows a short tooltip. Clicking the blueprint opens the `Tab` popup.
- **Checklist (right):** puzzle beats with done/active/pending states and a
  `done/total` count. The active beat highlights its corresponding component.
- **Lower strip:** hint button, `Hint n/total`, current hint text, and status
  badges (`FINAL ASSETS`, `AUDIO ON`, `AUTOSAVED`).

### 4.2 Bottom player cards

- P1 card bottom-left, orange; P2 card bottom-right, blue/cyan.
- Cards are slim, low-contrast, and `pointer-events: none`.
- They list all per-player controls; abilities that are not currently available
  are dimmed. The header still carries the live ability summary.
- The P2 card is hidden in solo mode; a small "solo union" note remains in the
  header.
- Shared controls (`P`, `Tab`, `C`, `Esc`, `M`) stay in the pause menu.
- The interaction prompt stays bottom-centre, above the cards.

### 4.3 Density states

| State | Trigger | Behaviour |
|---|---|---|
| `full` | width ≥ 1100 px and text scale < 1.5 | All three zones, full labels, both cards |
| `compact` | width 720–1099 px or text scale 1.5 | Smaller identity, checklist shows active + count, blueprint keeps 2–4 icons, cards shrink |
| `minimal` | width < 720 px or text scale 2 | Title + active beat + hint button; blueprint collapses to a button; cards hidden; full detail in the `Tab` popup and pause |

The state is exposed as `data-hud-density` on the HUD root. The full information
must always remain reachable through the expanded blueprint or pause menu.

### 4.4 Safe area

The HUD measures the actual header and bottom-card insets and passes them to the
feedback layout. Prompts, toasts, and anchored feedback surfaces must not render
under the header or the player cards. Measurements are cached and refreshed by
`ResizeObserver`/`window.resize`, not on every game tick.

---

## 5. Blueprint specification

### 5.1 Purpose

The blueprint is a **compact visual abstraction of the room puzzle**. It is not
a top-down room map and not the pack-level system map. It answers:

- What is the shape of the puzzle?
- Which part is done?
- Which part is active?
- Which player acts?

It deliberately does **not** show every beat or every visual detail. The
checklist carries the granular tasks; the blueprint carries the causal shape.

### 5.2 Component model

- A blueprint has **2–10 components**, normally 2–4.
- Each component groups one or more checklist beats via `beatIds`.
- Each component has an abstract symbol, an optional label (popup/tooltip only),
  a state, and an actor.
- The last component is the goal. There is no separate goal anchor.
- Components are ordered left to right; `x`/`order` is a column index, not a
  world coordinate.
- The header renders only the icons and connectors. Labels appear in the `Tab`
  popup and on hover/focus.
- The header may group components visually if there are more than four, but the
  target is 2–4.

### 5.3 Visual grammar

- Horizontal left-to-right causal chain.
- Each component is an abstract glyph from the nanobanana kit plus CSS/SVG
  connectors.
- States:
  - `done` — inked, with a check stamp.
  - `active` — player-coloured ring and actor marker.
  - `pending` — faint/low-contrast, still visible.
- All components are visible from the start. The abstraction is the spoiler
  control, not hidden nodes.
- The active component is highlighted; its label can appear in the hint strip or
  as a tooltip.
- The `Tab` popup shows the expanded component strip with labels, the
  room-to-room context chain, the legend, and the hint history.
- After solving, every component is inked as a recap.

### 5.4 Progress model

1. All components are visible from the start.
2. A component is `done` when all of its linked beats are done.
3. The first non-done component is `active`; if a beat inside a later component
   is active, that component becomes active.
4. Other components are `pending`.
5. The active component's actor marker shows P1, P2, both, or shared.
6. A hint highlights the active component and shows its text in the header.
7. When the puzzle is solved, every component is done.

This replaces the earlier "next node only" model. The blueprint is a simplified
shape, not a step-by-step reveal.

### 5.5 Authored data

The blueprint is presentation data and lives with the beats and node labels in
`level.json`:

```json
"feedback": {
  "puzzles": {
    "puzzle-node-run": {
      "beats": [ ... ],
      "blueprint": {
        "title": "Signal route",
        "components": [
          {
            "id": "inputs",
            "symbol": "ui.blueprint.symbol.input-pair",
            "label": "Two inputs",
            "beatIds": ["input"],
            "x": 0
          },
          {
            "id": "threshold",
            "symbol": "ui.blueprint.symbol.threshold-gauge",
            "label": "Threshold",
            "beatIds": ["threshold"],
            "x": 1
          },
          {
            "id": "axon",
            "symbol": "ui.blueprint.symbol.axon-flow",
            "label": "One-way flow",
            "beatIds": ["axon"],
            "x": 2
          },
          {
            "id": "exit",
            "symbol": "ui.blueprint.symbol.exit-gate",
            "label": "Terminal / exit",
            "beatIds": ["terminal", "exit"],
            "x": 3
          }
        ],
        "edges": [
          { "from": "inputs", "to": "threshold", "type": "flow" },
          { "from": "threshold", "to": "axon", "type": "oneWay" },
          { "from": "axon", "to": "exit", "type": "oneWay" }
        ],
        "steps": [
          { "componentId": "inputs", "actor": "both" },
          { "componentId": "threshold", "actor": "both" },
          { "componentId": "axon", "actor": "p1" },
          { "componentId": "exit", "actor": "shared" }
        ]
      }
    }
  }
}
```

Rules:

- `x` is a column/order, not world coordinates.
- `actor` is `p1`, `p2`, `both`, or `shared`.
- `beatIds` links a component to one or more checklist beats.
- `edges` are optional; the fallback derives a chain from component order.
- The last component is the goal; no `goalGroupId` is needed.
- Symbols are logical asset IDs; the UI falls back to a CSS placeholder when an
  asset is not resolved.

### 5.6 Component mappings

#### 03 Nerve Forest — 4 components

| Component | Groups beats | Symbol |
|---|---|---|
| Two inputs | `input` | `ui.blueprint.symbol.input-pair` |
| Threshold | `threshold` | `ui.blueprint.symbol.threshold-gauge` |
| One-way flow | `axon` | `ui.blueprint.symbol.axon-flow` |
| Terminal / exit | `terminal`, `exit` | `ui.blueprint.symbol.exit-gate` |

#### 04 Muscle Effector — 4 components

| Component | Groups beats | Symbol |
|---|---|---|
| Trigger + Ca²⁺ window | `trigger`, `release` | `ui.blueprint.symbol.ca-window` |
| Carry ACh | `carry` | `ui.blueprint.symbol.ach-carry` |
| Bind receptor | `bind` | `ui.blueprint.symbol.receptor-bind` |
| Response + clearance | `respond`, `clear` | `ui.blueprint.symbol.response-clear` |

#### 01 Interrupt Loop — 4 components

| Component | Groups beats | Symbol |
|---|---|---|
| Detect change | `detect` | `ui.blueprint.symbol.sensor-detect` |
| Route + integrate | `route`, `integrate` | `ui.blueprint.symbol.route-integrate` |
| Wake CPU | `wake` | `ui.blueprint.symbol.cpu-wake` |
| Actuate response | `actuate` | `ui.blueprint.symbol.actuator-gate` |

These groupings keep the learning-critical concepts while reducing 5–6 beats to
four visual components.

### 5.7 Fallback derivation

When a puzzle has no authored blueprint:

- Derive components from the authored beats (or the win-graph fallback beats).
- If there are 2–4 beats, use one component per beat.
- If there are more than 4 beats, group adjacent beats into four components.
- Assign generic symbols by the puzzle node types in each component.
- Derive actors from the puzzle `solution` actions where possible.
- The last component is the goal.

The fallback is a safety net, not the target quality. Every shipped puzzle
should have authored blueprint data.

### 5.8 Validation

`pack:validate` must reject or warn on:

- duplicate component IDs;
- a `beatIds` entry that does not exist;
- an edge that references an unknown component;
- a step that references an unknown component;
- a component with no symbol;
- a component count outside 2–10 (error);
- a component count above 4 (warning, because 2–4 is the target);
- a beat that is not covered by any component (warning).

### 5.9 Asset kit

The nanobanana symbol kit is specified in
[`blueprint-symbol-asset-brief-v01.md`](blueprint-symbol-asset-brief-v01.md).
Standalone prompts live in
[`blueprint-symbol-prompts-v02.md`](blueprint-symbol-prompts-v02.md). The v02
set has 12 puzzle-specific symbols: four for 03, four for 04, and four for
Silicon. No glyph is reused across puzzles. The short version:

- 32×32 `ui-1x` pixel-art glyphs, transparent PNG, locked theme palette.
- Abstract circuit/process symbols, no literal anatomy, no text.
- Atlas with named regions, or individual PNGs if atlas generation is unreliable.
- CSS/SVG connectors and state overlays; the kit supplies base glyphs, not every
  state variant.
- Placeholder manifest first; final art replaces it after the readability gate.

---

## 6. Checklist, hint, and player colours

### 6.1 Checklist

- Move beat rendering out of `feedback-renderer.ts` into the HUD.
- Keep the `.feedback-beats__item` class names for tests and continuity.
- Render as an `<ol>` with `aria-current="step"` on the active beat.
- Show `done/total` next to the "Progress" heading.
- Done items are struck/checked; active items are highlighted; pending items are
  dimmed.
- The active beat highlights its blueprint component.
- Hovering/focusing a beat may highlight its component, but this is not required
  for keyboard operation.

### 6.2 Hint

- The header lower strip owns the hint button, count, and current hint text.
- The hint text is announced with `aria-live="polite"`.
- The button cycles hints and is disabled when no hints remain or the puzzle is
  solved.
- The pause overlay no longer owns the puzzle hint section.
- The `Tab` popup shows the hint history and a `Next hint` button.
- Keyboard access is via `Tab` → expanded blueprint → hint button. No new
  gameplay key is added.

### 6.3 Player colours

Add dedicated tokens:

```css
--color-player-p1: var(--color-orange);
--color-player-p2: var(--color-joint);
```

Apply them to:

- feedback surface borders and owner chips;
- blueprint actor markers and active rings;
- bottom player cards;
- the per-player ability summary in the header.

Colour is never the only cue: every player-coded element also carries a `P1` or
`P2` label or icon.

---

## 7. Runtime and view model

Add to `RuntimeSnapshot`:

```ts
blueprint: BlueprintView | null;
```

Add to `PuzzleView`:

```ts
hintIndex: number;
hintsTotal: number;
revealedHints: string[];
```

Add to `src/ui/model.ts`:

```ts
export interface BlueprintComponentView {
  id: string;
  symbol: string;
  label?: string; // popup/tooltip only
  state: "done" | "active" | "pending";
  actor: "p1" | "p2" | "both" | "shared" | null;
  beatIds: string[];
}

export interface BlueprintEdgeView {
  id: string;
  from: string;
  to: string;
  type: "flow" | "oneWay";
  state: "done" | "active" | "pending";
}

export interface BlueprintView {
  puzzleId: string;
  title: string; // popup only
  components: BlueprintComponentView[];
  edges: BlueprintEdgeView[];
}
```

`MapView` remains the source for the room-to-room context in the `Tab` popup.
It is not part of the compact header blueprint.

The pure builder lives in `src/game/blueprint.ts`. It takes the level, puzzle
document, puzzle run state, feedback beats, and active mode. The pack-level
`MapView` remains popup-only room context and is not passed to the compact
builder. It does not touch the DOM, Phaser, or storage.

The UI component lives in `src/ui/blueprint.ts`. It renders the compact and
expanded variants, resolves symbol assets through a callback, and exposes an
`update(view)` method.

---

## 8. Work packages

| Phase | Deliverable |
|---|---|
| 0 | Accept ADR-0080; write M3.75 docs; capture baseline HUD screenshots and tests |
| 1 | Add `BlueprintView`, hint count/history, player tokens, and measured safe-area plumbing |
| 2 | Rebuild the header: three zones, relocated checklist, header hint strip, bottom control cards |
| 3 | Build the compact component blueprint, tooltips, and expanded `Tab` popup with room context |
| 4 | Author blueprints for `03-nerve-forest` and `04-muscle-effector`; add validation + fallback |
| 5 | Write the nanobanana symbol brief/prompt pack; integrate placeholder and final symbol manifests |
| 6 | Automated tests, text-scale/responsive captures, human playtest, docs update |

Each phase must leave the game playable and the test suite green.

### 8.1 Implementation notes

- `src/game/blueprint.ts` is the pure authored/fallback builder used by
  `GameRuntime.snapshot()`.
- `src/ui/blueprint.ts` renders the compact icon strip and the expanded popup;
  `src/ui/hud-progress.ts` owns the header checklist and keeps
  `.feedback-beats__item` and `aria-current="step"`.
- `src/ui/game-ui.ts` owns the three-zone header, hint strip, player cards,
  density state, and measured safe-area plumbing.
- The 03/04/01 blueprints are authored in their `level.json` feedback blocks
  and validated by `src/pack/validate.ts`.
- The 12 puzzle-specific symbol prompts are in
  [`blueprint-symbol-prompts-v02.md`](blueprint-symbol-prompts-v02.md), with a
  puzzle-to-component coverage matrix. The v01 prompt files are superseded. All
  12 prompts now have source plates; the sources still need key/fit/cleanup.
- Silicon uses its own four IDs (`sensor-detect`, `route-integrate`, `cpu-wake`,
  `actuator-gate`) and graphite/ceramic/signal-cyan art; it does not reuse
  anatomy glyphs.
- Blueprint symbols resolve through the asset provider; unresolved IDs render
  the CSS code glyph. `assets.placeholder.json` carries the placeholder entries.
  Final nanobanana art is not fabricated in this milestone.

---

## 9. Definition of done

1. The level HUD uses the three-zone header, hint strip, and bottom player cards.
2. The blueprint is a compact 2–4-component visual abstraction by default (up to
   10 allowed), always visible in the level, with done/active/pending states.
3. The checklist is in the header right; the bottom-left progress panel is gone.
4. The hint button/text/count are in the header; pause no longer owns the puzzle
   hint.
5. P1/P2 cards are correctly coloured and positioned; P2 hides in solo.
6. All player-coded feedback uses the same orange/blue tokens.
7. `Tab` opens the expanded blueprint with labels, room-to-room context, legend,
   and hint history; clicking the compact blueprint opens the same popup.
8. Feedback surfaces and prompts respect the new HUD safe area.
9. Text scales 1/1.25/1.5/2 and 720 px width have no clipping or unreachable
   content.
10. Authored blueprints for 03/04/01 validate; fallback works for a puzzle without
    authored data.
11. The nanobanana symbol kit meets readability, palette, and transparency gates.
12. `npm test`, `npm run pack:validate`, `npm run pack:smoke`,
    `npm run smoke:e2e`, `npm run build`, and `git diff --check` pass.
13. Human playtest confirms the header is understandable and does not hide the
    players.

---

## 10. Verification

### Unit

- Blueprint fallback derivation from beats, node types, and solution actions.
- Authored blueprint normalisation and component states.
- Component grouping and beat coverage.
- Hint index/count/history in `PuzzleView`.
- Parser and validator coverage for authored blueprint data.
- Room-context rendering is popup-only; the compact view does not consume
  `MapView`.

### Browser

- Header shows the compact blueprint, checklist, hint strip, and badges.
- Checklist is in the header and the old bottom-left panel is gone.
- Blueprint shows 2–4 icons with done/active/pending states and no context chain.
- Hover/focus shows a component tooltip.
- Hint cycles, updates the count, and highlights the active component.
- `Tab` opens the expanded blueprint with labels, room context, legend, and hint
  history; `Esc` closes it.
- Clicking the compact blueprint opens the same popup.
- P1/P2 cards are bottom-left/right with the correct colours; P2 hides in solo.
- Player-coded feedback uses the same colours.
- Text scales and 720 px width enter the compact/minimal density states without
  clipping.
- Prompts/toasts do not overlap the header or player cards.
- Existing level flow still passes end to end.

### Visual

- 1280×720, 1440×900, 1920×1080.
- Text scale 100%, 125%, 150%, 200%.
- 720 px viewport width.
- P1 spawn visible at level start; bottom cards do not cover the players.
- Blueprint icons readable at 1× display, transparent, pixel-crisp.
- Player colours meet contrast requirements and are paired with labels.

### Human playtest

- Can a new player state the goal and the next step from the header?
- Does the compact blueprint communicate the puzzle shape without becoming a
  labelled walkthrough?
- Is the header too dense or distracting?
- Are the bottom cards useful, or do they cover the action?
- Is the hint discoverable and understandable?
- Does the `Tab` popup's room context help without competing with the blueprint?
- Does co-op attribution read correctly?

---

## 11. Risks and mitigations

| Risk | Mitigation |
|---|---|
| Header becomes too tall at 720p | Compact icons-only blueprint, density states, safe-area plumbing |
| Blueprint spoils the puzzle | 2–4 abstract components, no header text, detailed beats stay in the checklist |
| Component grouping is too coarse to be useful | Authored per puzzle; playtest the 03/04 mappings; fallback only as a safety net |
| Nanobanana glyphs do not read at 32×32 | Placeholder-first, readability gate, CSS/SVG fallback |
| Authoring burden grows with every puzzle | Authored + fallback; validator; component template in the asset brief |
| Moving beats breaks feedback announcements | Keep `.feedback-beats__item`, preserve the live region, add e2e coverage |
| Player colour migration changes existing visuals | Dedicated tokens, paired labels, contrast checks, capture review |
| `Tab` popup and old map tests drift | Rename user-facing text to "Blueprint", keep the `map` state key for compatibility, update tests |

---

## 12. References

- [`../adr-presentation/0080-hud-blueprint-and-player-colors.md`](../adr-presentation/0080-hud-blueprint-and-player-colors.md)
- [`blueprint-symbol-asset-brief-v01.md`](blueprint-symbol-asset-brief-v01.md)
- [`../adr-presentation/0073-hud-density-and-canvas-scaling.md`](../adr-presentation/0073-hud-density-and-canvas-scaling.md)
- [`../adr-m3/0049-pixel-ui-chrome-and-typography.md`](../adr-m3/0049-pixel-ui-chrome-and-typography.md)
- [`../adr-presentation/0072-asset-fidelity-tiers-and-encoding.md`](../adr-presentation/0072-asset-fidelity-tiers-and-encoding.md)
- [`../m1.75/README.md`](../m1.75/README.md)
- [`../m2.75/README.md`](../m2.75/README.md)
- [`../../src/ui/game-ui.ts`](../../src/ui/game-ui.ts)
- [`../../src/feedback/beats.ts`](../../src/feedback/beats.ts)
