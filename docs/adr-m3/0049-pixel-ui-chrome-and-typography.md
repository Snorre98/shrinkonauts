# ADR-0049: Pixel UI chrome and typography

- **Status:** Accepted
- **Date:** 2026-10-29
- **Deciders:** Snorre
- **Related:** ADR-0019, ADR-0020, ADR-0027, ADR-0047, ADR-0048

## Context

The UI is a DOM/CSS overlay: HUD, dialogue, gate, map, concept log, debrief, pause, and settings. It currently uses rounded panels, backdrop blur, soft shadows, pill badges, and system fonts. The world is pixel art per ADR-0047, so the UI must share the same visual language.

The UI is text-heavy. Dialogue, gate prompts, map labels, and the debrief need readable body text at different window sizes, and the accessibility baseline (ADR-0020) requires keyboard focus, text scaling, reduced motion, and contrast. A naïve “8-bit” treatment with an all-caps display font everywhere would fail those requirements.

## Decision

Adopt an **8-bit pixel UI** that preserves accessibility:

- Square panels, 2 px hard borders, 3 px hard drop shadow, 1 px inner highlight.
- No border radius, no backdrop blur, no translucent glass, no soft gradients.
- Self-host two OFL 1.1 fonts: **Silkscreen** (display, headings, labels) and **Pixelify Sans** (body, dialogue, long text). No external font CDN.
- Minimum 12 px labels and 15–16 px body text. Dialogue stays mixed case, not all-caps.
- Integer-friendly text scales: 1, 1.25, 1.5, 2.
- Badge: 16×16 source displayed at 32×32 with `image-rendering: pixelated`.
- Focus rings, keyboard navigation, reduced motion, contrast, and text scaling remain first-class.
- Theme tokens remain the only pack-specific colour input; no pack-specific CSS.
- Deferred panels, portraits, and icons use the same pixel language when they are generated: 16×16 or 32×32 icons, 9-slice pixel panels, no anti-aliasing.

## Consequences

**Easier:**

- One visual language across the world and UI.
- Crisp badge and icon rendering at integer scales.
- Theme tokens still drive all pack colours.
- The pixel chrome is simple CSS with no image dependencies for panels.

**Harder:**

- The CSS needs a full restyle of the HUD and every overlay.
- Font files, preloads, and OFL licence records must be added.
- Small text needs careful sizing and contrast testing.
- Existing screenshots and visual references must be regenerated.

**Constrained:**

- No rounded corners, blur, soft shadows, glass panels, or smooth gradients.
- No all-caps body text and no font smaller than 12 px.
- No pack-specific CSS; pixel chrome is a shared UI rule.

## Alternatives considered

- **Keep the modern rounded UI** — rejected: it clashes with the pixel world.
- **Use Press Start 2P everywhere** — rejected: all-caps, dense, and poor for long dialogue.
- **Use system fonts with pixel chrome only** — rejected: weaker 8-bit identity and inconsistent across machines.
- **Render the UI in canvas** — rejected: loses DOM accessibility, text layout, and Playwright testability.
- **Per-pack UI skins** — rejected: violates the theme-token boundary and multiplies maintenance.

## References

- [`docs/m3/asset-requirements.md`](../m3/asset-requirements.md), §7 and §9
- [`src/ui/styles.css`](../../src/ui/styles.css), [`src/ui/hud.ts`](../../src/ui/hud.ts)
- [Silkscreen](https://fonts.google.com/specimen/Silkscreen) — Jason Kottke, SIL Open Font License 1.1
- [Pixelify Sans](https://fonts.google.com/specimen/Pixelify+Sans) — Stefie Justprince, SIL Open Font License 1.1
- [ADR-0019](../shrinkonauts/base-game/adr/0019-canvas-game-dom-overlay.md)
- [ADR-0020](../shrinkonauts/base-game/adr/0020-accessibility-baseline.md)
- [ADR-0047](0047-pixel-art-visual-direction.md)
