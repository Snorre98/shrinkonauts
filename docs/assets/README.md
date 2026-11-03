# Assets — cross-discipline index

**Status:** Draft, 3 November 2026  
**Owner:** Snorre  
**Scope:** Graphics and audio asset inventory, prompt routing, placeholder status, and completion order

This directory holds the cross-discipline asset index. The full prompt text
remains in the discipline documents:

- Graphics: [`../m3/asset-requirements-v01.md`](../m3/asset-requirements-v01.md),
  [`../m3/background-asset-requirements-v01.md`](../m3/background-asset-requirements-v01.md),
  [`../m3/muscle-endplate-asset-requirements-v01.md`](../m3/muscle-endplate-asset-requirements-v01.md),
  [`../m3.5/hub-asset-prompts-v01.md`](../m3.5/hub-asset-prompts-v01.md),
  [`../prompts/silicon-theme.md`](../prompts/silicon-theme.md).
- Audio: [`../audio/audio-requirements-and-prompts-v01.md`](../audio/audio-requirements-and-prompts-v01.md)
  and [`../audio/room-and-menu-themes-v01.md`](../audio/room-and-menu-themes-v01.md).

## Index

| Document | Purpose |
|---|---|
| [`prompt-library-v01.md`](prompt-library-v01.md) | Placeholder inventory, prompt routing, gap prompts, generation order, and completion gates |
| [`../adr-assets/0078-audio-and-graphics-prompt-libraries.md`](../adr-assets/0078-audio-and-graphics-prompt-libraries.md) | ADR for prompt-library governance and placeholder completion |

## Rule

Every visible or interactive placeholder must appear in
[`prompt-library-v01.md`](prompt-library-v01.md). A placeholder that exists only
in a screenshot is not documented.
