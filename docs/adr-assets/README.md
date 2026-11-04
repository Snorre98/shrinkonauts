# Asset Prompt Libraries — ADR domain

**Status:** Proposed, 3 November 2026  
**Owner:** Snorre  
**Scope:** Audio and graphics asset prompt libraries, placeholder completion, and asset-status tracking  
**Milestones:** M3, M3.5, and later asset passes

This domain is separate from the art-pipeline, audio, presentation, hub, online,
and puzzle-engine ADR sets. It does not rewrite accepted history. It provides
the cross-discipline index and governance for the asset prompt libraries those
domains own.

## Numbering note

The highest existing record before this domain was **ADR-0077**
(`docs/adr-audio/`). This domain continues the global sequence at **ADR-0078**.

## Index

| # | Decision | Status |
|---|---|---|
| [0078](0078-audio-and-graphics-prompt-libraries.md) | Audio and graphics prompt libraries and placeholder completion | Proposed |
| [0079](0079-scan-facts.md) | Scan targets reveal card facts, not shared concepts | Accepted |

## Relationship to other decisions

- **ADR-0029** — asset-provider abstraction and placeholder-first loading.
- **ADR-0033** — final-asset integration timing.
- **ADR-0060** — source, working, and runtime asset layers.
- **ADR-0072** — asset fidelity tiers and encoding.
- **ADR-0075** — hero-asset treatment profiles and per-class fit pipeline.
- **ADR-0076–0077** — room/menu audio themes and theme playback.
- **ADR-0047–0075** — visual direction and presentation.

## Scope boundary

The umbrella inventory is [`docs/assets/prompt-library-v01.md`](../assets/prompt-library-v01.md).
This domain does **not** define the visual style, audio style, runtime playback,
or manifest schema. Those remain in their existing documents and ADRs. It
defines:

- the single index for every remaining placeholder;
- where each asset’s prompt lives;
- the completion order and acceptance gates;
- the rule that a visible/interactive placeholder must be discoverable from the
  index rather than only from a screenshot;
- the requirement that audio files are not shipped before the audio provider
  can play them.

## Acceptance

This domain is accepted when:

- ADR-0078 is accepted;
- the umbrella library lists every remaining placeholder by asset ID and status;
- every prompt source has a version and a prompt-log template;
- the visible 03 scan placeholders and the audio-provider blocker are recorded;
- `npm test`, `npm run pack:validate`, and `npm run pack:smoke` continue to pass.

## Status vocabulary

- **Proposed:** drafted, not yet accepted.
- **Accepted:** reviewed and approved; implementation may proceed.
- **Superseded:** replaced by a later ADR; kept immutable.
- **Rejected:** considered and not adopted.

All records in this domain start as **Proposed**.
