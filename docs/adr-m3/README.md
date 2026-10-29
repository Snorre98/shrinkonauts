# M3 Architecture Decision Records

**Status:** Accepted, 29 October 2026  
**Scope:** Pixel-art direction, rendering, and UI for the M3 vertical slice  
**Format:** Nygard-style, matching the ADR set under
`docs/shrinkonauts/base-game/adr/`.

This directory adds new records only. It does not rewrite accepted history.

> **Re-alignment (2026-10-29):** these records were re-aligned with the v0.3 M1.8 asset scope: 21 visible images, two material atlases, 32×32 atlas frames at 1:1 with 2×2 clusters, and `theme.json` schema 1.1 UI material/pattern slots.

## Numbering note

The last accepted record is ADR-0046 in
[`../adr-m1.5/`](../adr-m1.5/README.md). These records continue the global
sequence as **ADR-0047–0049**. They are new records, not amendments.

ADR-0047 supersedes the visual-style portion of ADR-0027. ADR-0027 remains in
force for licensing and audio.

## Index

| # | Decision | Status |
|---|---|---|
| [0047](0047-pixel-art-visual-direction.md) | Pixel-art visual direction for the whole game (21-image M3 scope) | Accepted |
| [0048](0048-half-resolution-pixel-rendering.md) | Half-resolution authoring with 2× nearest-neighbour display, including 32×32 atlas frames | Accepted |
| [0049](0049-pixel-ui-chrome-and-typography.md) | Pixel UI chrome and typography | Accepted |

## Related accepted records

- ADR-0019: Canvas game + DOM overlay
- ADR-0020: Accessibility baseline
- ADR-0027: Art/audio direction + licensing
- ADR-0029: Asset-provider abstraction + placeholder-first
- ADR-0030: Sprite/animation format policy
- ADR-0031: Layered background composition
- ADR-0032: Audio cue abstraction
- ADR-0033: Final asset integration timing
- ADR-0014–0017 (puzzle-engine): material/pattern vocabulary, tile material grid, pattern surfaces, atlas manifest
- [`docs/m1.8/README.md`](../m1.8/README.md): material and pattern layer

## Format

```
# ADR-XXXX: Title

- Status: Proposed | Accepted | Superseded by ADR-YYYY | Deprecated
- Date: YYYY-MM-DD
- Deciders: ...
- Related: ...

## Context
Why is this decision needed? What forces are at play?

## Decision
What is the decision, in one or two sentences?

## Consequences
What becomes easier? What becomes harder? What is now constrained?

## Alternatives considered
- Alternative — why rejected.

## References
Links to contracts, requirements, behaviours, or external sources.
```
