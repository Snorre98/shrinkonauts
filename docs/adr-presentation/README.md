# Presentation — ADR domain

**Status:** Proposed, 2–4 November 2026<br>
**Scope:** Stage and camera framing, background composition, asset fidelity and
encoding, HUD density, canvas scaling, and the in-room HUD information
architecture<br>
**Applies to:** M3 and later; `03-nerve-forest` is the first adopter<br>
**Format:** Nygard-style, matching `docs/adr-m3/` and
`docs/adr-art-pipeline/`

This directory adds new records only. It does not rewrite accepted history.

## Why this domain exists

The current M3 capture exposes two presentation problems that are independent
of gameplay and of file compression:

1. **The world is framed as one fixed screen.** `03-nerve-forest` is 40×23
   tiles at 32 px = 1280×736, and the viewport is 1280×720. The camera is
   effectively pinned, the player is 28×44 (6% of screen height), the play band
   is 5–6 tiles at the bottom, and the sky fills the remaining 74%.
2. **The entity art is detail-crushed.** The shipped runtime art is lossless,
   but complex concept plates are fitted into 16×16 content cells. The gate is a
   blue oval, the scan plates are blobs, and the Neuron Keeper loses its
   tentacles and tail. The problem is target size and cleanup, not WebP quality.

These records define a configuration contract for framing, backgrounds, asset
fidelity, and the HUD. Every new field is optional and defaults to current
behaviour, so existing packs and rooms keep booting unchanged.

## Numbering note

The repository still has domain-local numbering collisions: M3 uses
ADR-0047–0049, online uses ADR-0047–0057, hub uses ADR-0058–0059, art pipeline
uses ADR-0060–0065, and controller uses ADR-0066–0069.

The highest record in the repository was **ADR-0069** before this domain. This
domain continues at **ADR-0070**, and ADR-0074 follows it. ADR-0075 lives in the
art-pipeline domain but continues the same global sequence. ADR-0080 returns to
this domain for the M3.75 in-room HUD. ADR-0088 lives in the art-pipeline domain;
ADR-0089 returns here for the installable PWA shell. These are new records, not
amendments. If the project later reconciles one global sequence, renumber before
acceptance; accepted records are immutable.

## Index

| # | Decision | Status |
|---|---|---|
| [0070](0070-stage-bands-and-play-band-camera.md) | Stage bands and play-band camera framing | Proposed |
| [0071](0071-background-space-and-composition.md) | Background space, sampling, and composition | Proposed |
| [0072](0072-asset-fidelity-tiers-and-encoding.md) | Asset fidelity tiers, display sizes, and lossless encoding | Proposed |
| [0073](0073-hud-density-and-canvas-scaling.md) | HUD density presets and integer canvas scaling | Proposed |
| [0074](0074-hero-scale-npcs-and-interactables.md) | Hero-scale NPCs and interactables | Proposed |
| [0080](0080-hud-blueprint-and-player-colors.md) | Compact HUD blueprint, player colours, and the in-room HUD layout | Proposed |
| [0089](0089-pwa-offline-shell-and-update-lifecycle.md) | Installable PWA shell, offline runtime, and prompt-based updates | Proposed |

## Relationship to accepted decisions

- **ADR-0019:** canvas game + DOM overlay. ADR-0070 and ADR-0073 keep the DOM
  overlay but give it explicit stage bands.
- **ADR-0020:** accessibility baseline. ADR-0073 keeps text scaling, focus,
  contrast, and reduced motion first-class.
- **ADR-0031:** layered background composition. ADR-0071 extends the layer
  contract with screen/world space and composition controls.
- **ADR-0033:** final asset integration timing. ADR-0072 does not change the
  timing rule; it changes the fidelity and encoding contract for assets that
  are integrated.
- **ADR-0047:** pixel-art visual direction. ADR-0072 keeps the palette, outline,
  and 2× cluster rules for world-2x assets.
- **ADR-0048:** half-resolution authoring with 2× display. ADR-0070 adds camera
  framing, and ADR-0072 supersedes the fixed entity/badge size portions while
  keeping the 2× policy for characters. ADR-0074 adds the recorded `hero-1x`
  exception for NPCs, interactables, and props.
- **ADR-0049:** pixel UI chrome and typography. ADR-0073 extends the UI with
  density presets and stage-aware safe areas. ADR-0080 builds the in-room HUD
  information architecture on the same DOM/CSS chrome, including the compact
  component blueprint and the `Tab` popup.
- **ADR-0060–0065:** art pipeline. ADR-0072 adds fidelity tiers, display sizes,
  readability gates, and the fit-preview/hand-cleaned status split. ADR-0075
  adds per-class fit cells and hero-asset treatments. ADR-0080 adds the
  blueprint symbol kit and the `ui-1x` glyph contract.

## Acceptance

This domain is accepted when:

1. Each record has a decision, consequences, alternatives, validation, and
   references.
2. `pack.json`, `room.json`, `theme.json`, and the asset manifest can express
   the decisions as optional configuration.
3. Missing configuration produces the existing behaviour; no existing room
   needs a content migration to keep booting.
4. The 03 preset can be applied without changing physics, collision, puzzle
   logic, or level geometry.
5. The M3 asset requirements and background requirements reference these
   records rather than duplicating them.
6. `npm test`, `npm run pack:validate`, and the 1280×720 capture review pass.

## Status vocabulary

- **Proposed:** drafted, not yet accepted.
- **Accepted:** reviewed and approved; implementation may proceed.
- **Superseded:** replaced by a later ADR; kept immutable.
- **Rejected:** considered and not adopted.

All records in this domain start as **Proposed**.
