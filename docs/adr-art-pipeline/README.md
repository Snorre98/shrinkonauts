# Art Pipeline — ADR domain

**Status:** Accepted, 29 October 2026

**Scope:** source-art layout, sprite-sheet normalization, palette variants,
runtime animation, and preview generation

**Applies to:** M3 and later art passes; the pipeline supports static shipping
by emitting a one-frame clip

**Format:** Nygard-style, matching `docs/adr-m3/` and `docs/adr-m1.5/`

This domain adds records for the art-content pipeline. It does not rewrite
accepted history.

## Numbering note

The repository currently has domain-local numbering collisions: M3 uses
ADR-0047–0049, the online domain uses ADR-0047–0057, and the hub domain uses
ADR-0058–0059. This domain starts at **ADR-0060** to avoid adding another
collision. If the project later reconciles a single global sequence, renumber
these records before acceptance; accepted records are immutable.

## Index

| # | Decision | Status |
|---|---|---|
| [0060](adr-0060-source-work-runtime-asset-layers.md) | Source, working, and runtime asset layers | Accepted |
| [0061](adr-0061-palette-lut-sprite-variants.md) | Palette-LUT sprite variants | Accepted |
| [0062](adr-0062-data-driven-sprite-animation.md) | Data-driven sprite animation and runtime state machine | Accepted |
| [0063](adr-0063-build-time-animation-previews.md) | Build-time animation previews, not runtime GIFs | Accepted |
| [0064](adr-0064-orange-p2-suit-palette-swap.md) | Orange P2 suit and visor palette swap | Accepted |

## Implementation status

- **ADR-0060:** the source layer exists at `art-source/`; the first Ludo slicer
  is `scripts/art-slice.ts`.
- **ADR-0063:** `npm run art:slice` writes frame PNGs and a GIF preview.
- **ADR-0061 / ADR-0064:** `scripts/art-normalize.ts` validates and quantizes a
  cleaned cell to the semantic ramps; `scripts/art-variant.ts` applies the
  single-pass palette LUT. The canonical P2 palette swap is defined in
  `art-source/characters/player-p1/working/palette.json`.
- **ADR-0062:** not implemented yet. `working/clips.json` is a static scaffold;
  animation playback and the clips validator remain a later slice.

## Relationship to existing decisions

- ADR-0029: asset-provider abstraction and placeholder-first loading.
- ADR-0030: sprite and animation format policy.
- ADR-0033: final-asset integration timing.
- ADR-0047: pixel-art visual direction.
- ADR-0048: half-resolution authoring with 2× nearest-neighbour display.
- ADR-0049: pixel UI chrome and typography.
- `docs/m3/asset-requirements-v01.md`: asset register, palette, source sizes,
  and acceptance criteria.

## Acceptance

This domain is accepted when:

1. Each ADR has a decision, consequences, alternatives, and validation.
2. The M3 asset requirements and the pack manifests reference the accepted
   decisions rather than duplicating them.
3. The runtime can regenerate every shipped sheet from `art-source/`.
4. No raw Ludo export is served from `public/`.
5. The static M3 path remains possible without adopting animation playback.

## Status vocabulary

- **Proposed:** drafted, not yet accepted.
- **Accepted:** reviewed and approved; implementation may proceed.
- **Superseded:** replaced by a later ADR; kept immutable.
- **Rejected:** considered and not adopted.

All records in this domain start as **Proposed**. ADR-0060–0063 were accepted
on 29 October 2026; ADR-0064 was accepted on 31 October 2026.
