# Art Pipeline — ADR domain

**Status:** Accepted, 29 October 2026

**Scope:** source-art layout, sprite-sheet normalization, palette variants,
runtime animation, and preview generation

**Applies to:** M3 and later art passes; the pipeline supports static shipping
and the POC player-animation path

**Format:** Nygard-style, matching `docs/adr-m3/` and `docs/adr-m1.5/`

This domain adds records for the art-content pipeline. It does not rewrite
accepted history.

## Numbering note

The repository currently has domain-local numbering collisions: M3 uses
ADR-0047–0049, the online domain uses ADR-0047–0057, the hub domain uses
ADR-0058–0059, the controller domain uses ADR-0066–0069, and the presentation
domain uses ADR-0070–0074. This domain starts at **ADR-0060**. ADR-0075 and ADR-0088 are the
records in this domain; ADR-0076–0077 are audio records, ADR-0078 is the
cross-discipline asset prompt-library record in `docs/adr-assets/`, and
ADR-0087 belongs to the controller domain. If the
project later reconciles a single global sequence, renumber these records
before acceptance; accepted records are immutable.

## Index

| # | Decision | Status |
|---|---|---|
| [0060](adr-0060-source-work-runtime-asset-layers.md) | Source, working, and runtime asset layers | Accepted |
| [0061](adr-0061-palette-lut-sprite-variants.md) | Palette-LUT sprite variants | Accepted |
| [0062](adr-0062-data-driven-sprite-animation.md) | Data-driven sprite animation and runtime state machine | Accepted |
| [0063](adr-0063-build-time-animation-previews.md) | Build-time animation previews, not runtime GIFs | Accepted |
| [0064](adr-0064-orange-p2-suit-palette-swap.md) | Orange P2 suit and visor palette swap | Superseded by 0065 |
| [0065](adr-0065-p2-bone-suit-joint-visor.md) | P2 bone suit and joint-cyan visor | Accepted |
| [0075](adr-0075-hero-asset-treatment.md) | Hero-asset treatment profiles and per-class fit pipeline | Proposed |
| [0088](adr-0088-player-28x44-masters-and-dance-emote.md) | 28×44 player masters and the dance emote | Accepted |

## Implementation status

- **ADR-0060:** the source layer exists at `art-source/`; the first Ludo slicer
  is `scripts/art-slice.ts`.
- **ADR-0063:** `npm run art:slice` writes frame PNGs and a GIF preview.
- **ADR-0061 / ADR-0065:** `scripts/art-remaster.ts` makes a deterministic
  14×22 master from a Ludo sheet using a reusable segmentation profile
  (`working/remaster.json`); `scripts/art-normalize.ts` validates the palette;
  `scripts/art-variant.ts` applies the single-pass palette LUT. P2 now uses the
  approved bone-suit/joint-cyan source sheets; the palette LUT role map is in
  `art-source/characters/player-p1/working/palette.json`.
- **ADR-0062 / ADR-0088:** POC implemented. `scripts/art-build-player.ts`
  reads `working/clips.json`, writes runtime walk/jump/fall/land/dance sheets
  at a 28×44 master cell, and `src/world/player-animator.ts` plays them from
  manifest sheet metadata. The full generalized descriptor/state machine
  remains future work.
- **ADR-0063:** `npm run art:build-player` writes build-time GIF and contact
  strip previews from the same runtime sheets and clip timing.
- **Background keying:** `npm run art:key` removes flat magenta backgrounds from
  concept JPEGs with a hard-alpha RGB key and magenta despill.
- **ADR-0075:** proposed. It adds per-class fit cells, the `hero-1x` treatment,
  source-scale gates, and stage-scale contact sheets. The hero configs
  (`fit.new.config.json`, `fit.silicon.config.json`) are schema 2; the legacy
  `fit.config.json` and badge config remain schema 1.

## Relationship to existing decisions

- ADR-0029: asset-provider abstraction and placeholder-first loading.
- ADR-0030: sprite and animation format policy.
- ADR-0033: final-asset integration timing.
- ADR-0047: pixel-art visual direction.
- ADR-0048: half-resolution authoring with 2× nearest-neighbour display.
- ADR-0049: pixel UI chrome and typography.
- ADR-0071: background space, sampling, and composition (proposed). Adds
  screen/world space and per-layer composition to the background pipeline.
- ADR-0072: asset fidelity tiers, display sizes, and lossless encoding
  (proposed). Adds readability gates, per-asset display sizes, and the
  `fit-preview` / `hand-cleaned` status split.
- ADR-0075: hero-asset treatment profiles and per-class fit pipeline
  (proposed). Adds per-class cells, source-scale gates, and the `hero-1x`
  treatment.
- ADR-0078: cross-discipline asset prompt-library governance and placeholder
  completion. The umbrella inventory lives at
  `docs/assets/prompt-library-v01.md`.
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
on 29 October 2026; ADR-0064 was accepted on 31 October 2026 and superseded by
ADR-0065 on 1 November 2026.
