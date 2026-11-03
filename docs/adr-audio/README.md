# Audio — ADR domain

**Status:** Proposed, 2026-11-03  
**Owner:** Snorre  
**Scope:** Room themes, menu theme, music playback, looping, crossfade, and mixing  
**Milestones:** M3 (gameplay rooms), M3.5 (bathroom hub / menu), future rooms

This domain is separate from the M3 pixel-art, hub, online, presentation, and art-pipeline ADR sets. It does not rewrite accepted history. It extends the audio decisions in ADR-0027 and ADR-0032.

## Numbering note

This domain continues the global sequence at **ADR-0076–0077**. The following cross-discipline asset record is **ADR-0078** in `docs/adr-assets/`. They are new records, not amendments.

## Index

| # | Decision | Status |
|---|---|---|
| [0076](0076-room-and-menu-audio-themes.md) | Per-room and menu audio themes | Proposed |
| [0077](0077-audio-theme-playback-and-mixing.md) | Audio theme playback, crossfade, and mixing | Proposed |

## Relationship to other decisions

- **ADR-0027** — original art/audio direction. The vault copy specifies one music loop and eight SFX cues; its licensing rules remain in force.
- **ADR-0032** — audio cue abstraction. Reserves `audio.music.<pack>` and `audio.ambience.<room>`; this domain uses those IDs rather than inventing a new namespace.
- **ADR-0029** — asset-provider abstraction and placeholder-first assets.
- **ADR-0033** — final asset integration timing.
- **ADR-0020** — accessibility baseline; music must never be the only carrier of information.
- **ADR-0058–0059** — hub/app-shell and pack catalog; the menu theme belongs to the hub theme.
- **ADR-0047–0075** — visual direction and presentation; audio must match the same room identities.
- **ADR-0078** — cross-discipline asset prompt-library governance and placeholder completion.

## Scope boundary

This domain adds **four loopable themes**:

- menu / bathroom hub
- `03-nerve-forest`
- `04-muscle-effector`
- `01-interrupt-loop` (Silicon)

It does **not** add a fifth anatomy theme for unauthored rooms. `01-bone-gate`, `02-joint-chamber`, and `05-reflex-core` get themes only when those rooms are authored.

It also does **not** replace the 18 SFX cues in [`../audio/audio-requirements-and-prompts-v01.md`](../audio/audio-requirements-and-prompts-v01.md). The cues stay as they are.

## Acceptance

This domain is accepted when:

- ADR-0076 and ADR-0077 are accepted;
- the four themes pass the prompt/acceptance checks in [`../audio/room-and-menu-themes-v01.md`](../audio/room-and-menu-themes-v01.md);
- room and menu transitions play without a seam or clipped tail;
- mute, volume, pause, and first-gesture unlock behave correctly;
- M3/M3.5/GDD/video docs no longer claim the game has no music;
- every theme has a licence record and prompt-log row.
