# M3 Architecture Decision Records

**Status:** Accepted, 29 October 2026  
**Scope:** Pixel-art direction, rendering, and UI for the M3 vertical slice  
**Format:** Nygard-style, matching the ADR set under
`docs/shrinkonauts/base-game/adr/`.

This directory adds new records only. It does not rewrite accepted history.

## Numbering note

The last accepted record is ADR-0046 in
[`../adr-m1.5/`](../adr-m1.5/README.md). These records continue the global
sequence as **ADR-0047–0049**. They are new records, not amendments.

ADR-0047 supersedes the visual-style portion of ADR-0027. ADR-0027 remains in
force for licensing and audio.

## Index

| # | Decision | Status |
|---|---|---|
| [0047](0047-pixel-art-visual-direction.md) | Pixel-art visual direction for the whole game | Accepted |
| [0048](0048-half-resolution-pixel-rendering.md) | Half-resolution authoring with 2× nearest-neighbour display | Accepted |
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
