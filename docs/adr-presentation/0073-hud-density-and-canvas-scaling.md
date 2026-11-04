# ADR-0073: HUD density presets and integer canvas scaling

- **Status:** Proposed
- **Date:** 2026-11-02
- **Deciders:** Snorre
- **Related:** ADR-0019, ADR-0020, ADR-0048, ADR-0049, ADR-0070
- **Extends:** ADR-0019 (canvas + DOM overlay), ADR-0020 (accessibility),
  ADR-0049 (pixel UI chrome)

## Context

The HUD is a DOM overlay over the full 1280×720 canvas. It currently includes a
full-width top bar, a Controls panel, progress/feedback surfaces, prompts, and
toasts. In the M3 capture the top bar and Controls panel cover the sky, and the
bottom-left progress panel covers the player spawn. Player 1 spawns around
`(112, 640)`; the progress panel occupies that area, so the players are not
visible at start.

The existing safe-area logic in `src/ui/layout.ts` protects the feedback
surfaces (default 96 px top, 84 px bottom), but it does not reserve space for
the main HUD panels or the play band. The HUD and the feedback layer can still
overlap each other and the spawn.

The canvas is also scaled with `Phaser.Scale.FIT`. On a 1440×900 or 1920×1080
window, a 1280×720 canvas is scaled by a fractional factor (1.25× or 1.5×).
`image-rendering: pixelated` prevents blur, but fractional scaling still makes
some source pixels wider than others. That is visible as uneven block sizes and
is easy to mistake for compression.

A full HUD hide would fix the overlap but remove the objective, feedback, and
controls the player needs. The fix is density, not absence.

## Decision

### 1. Density presets

Add `theme.ui.layout.density` with three presets:

```json
"ui": {
  "layout": {
    "density": "compact",
    "safeArea": { "top": 8, "right": 8, "bottom": 8, "left": 8 }
  }
}
```

| Preset | Behaviour |
|---|---|
| `standard` | Current HUD: title bar, Controls panel, progress/feedback, prompts. |
| `compact` | Title/objective bar stays; Controls collapses behind a toggle; progress becomes a slim bottom-band element; feedback stays inside the stage safe area. |
| `capture` | Title/objective and the active prompt only; Controls, progress, and non-essential feedback hidden. |

Default: `standard`, so existing screens behave as today.

### 2. Stage-aware safe area

The `safeArea` is relative to the **stage rect** from ADR-0070, not the full
canvas. The HUD and feedback renderer share it:

- the HUD top band owns `stage.y` and above;
- the HUD bottom band owns `stage.y + stage.height` and below;
- the stage safe area keeps prompts/toasts away from the stage edges;
- no HUD panel may overlap the play band in `compact` or `capture`.

The top and bottom bands are derived from `pack.presentation.stage`. The UI
uses the canvas rect and the stage fraction so the bands stay aligned when the
canvas is CSS-scaled.

### 3. Canvas scaling mode

Add an optional canvas mode:

```json
"presentation": {
  "canvas": { "mode": "fit", "maxIntegerScale": 3 }
}
```

- `fit` — current `Phaser.Scale.FIT` behaviour. Default.
- `integer` — choose the largest integer CSS scale that fits the window and
  letterbox the remainder with the theme background. Pixel blocks stay square.
- Capture and screenshot jobs always use 1×.

`integer` is optional because at a 1920×1080 window the largest integer scale
for a 1280×720 canvas is 1×, which leaves large bars. Most desktop play should
stay on `fit`; capture and pixel-review builds should use `integer` or 1×.

### 4. Accessibility is unchanged

Density presets must preserve:

- text scaling at 1, 1.25, 1.5, 2;
- keyboard focus order and visible focus rings;
- contrast ratios;
- reduced-motion behaviour;
- screen-reader labels and live regions.

`compact` may collapse Controls, but the same information must remain reachable
by keyboard and by a visible toggle. `capture` is a capture preset, not an
accessibility mode; it must not be the only way to play.

## Consequences

**Easier:**

- The spawn and play band stay clear in the default 03 capture.
- The HUD has a small, explicit set of layouts instead of ad-hoc absolute
  panels.
- Capture screenshots hide non-essential UI without changing the game.
- Integer scaling gives crisp pixel blocks for review and capture.

**Harder:**

- The HUD DOM and CSS need a density state, a Controls toggle, and stage-aware
  positioning.
- `layout.ts` must use the stage rect, not the full viewport.
- Canvas resize in integer mode needs a custom handler and letterbox styling.
- Tests must cover the three presets at 1280×720, 1440×900, and 1920×1080.
- Text scaling and focus must be rechecked after the layout changes.

**Constrained:**

- No pack-specific CSS; density presets are shared UI rules.
- No HUD panel over the play band in `compact` or `capture`.
- No fractional pixel art in `integer` mode.
- No removal of keyboard access to Controls, objectives, or feedback.

## Validation

- At 1280×720 with `compact`, both players are visible at spawn and the play
  band is unobstructed.
- `capture` hides Controls, progress, and non-essential feedback; the title,
  objective, and active prompt remain.
- `standard` preserves the current layout and all current screens.
- Text scaling at 1, 1.25, 1.5, and 2 does not push HUD panels into the play
  band.
- Keyboard focus order, focus rings, contrast, and reduced motion still pass
  the accessibility baseline.
- `integer` canvas mode produces equal pixel blocks at 1280×720 and letterboxes
  at 1440×900/1920×1080; capture remains 1×.
- `npm test`, `npm run pack:validate`, and the 1280×720 capture review pass.

## Alternatives considered

- **Keep the full HUD overlay** — rejected: it covers the spawn and play band.
- **Hide the HUD entirely** — rejected: objectives, feedback, and controls are
  part of the game and the learning loop.
- **CSS-only density without a stage contract** — rejected: it cannot guarantee
  that the play band stays clear.
- **Always integer scale** — rejected: large letterbox bars on common desktop
  windows; optional mode is enough.
- **Render the HUD in canvas** — rejected: loses DOM accessibility, text
  layout, and Playwright testability (same reasoning as ADR-0049).

## References

- [`src/ui/game-ui.ts`](../../src/ui/game-ui.ts)
- [`src/ui/styles.css`](../../src/ui/styles.css)
- [`src/ui/layout.ts`](../../src/ui/layout.ts)
- [`src/ui/anchors.ts`](../../src/ui/anchors.ts)
- [`src/world/create-game.ts`](../../src/world/create-game.ts)
- [`theme.json`](../../public/packs/anatomy-reflex/theme.json)
- [ADR-0019](../shrinkonauts/base-game/adr/0019-canvas-game-dom-overlay.md)
- [ADR-0020](../shrinkonauts/base-game/adr/0020-accessibility-baseline.md)
- [ADR-0048](../adr-m3/0048-half-resolution-pixel-rendering.md)
- [ADR-0049](../adr-m3/0049-pixel-ui-chrome-and-typography.md)
- [ADR-0070](0070-stage-bands-and-play-band-camera.md)
