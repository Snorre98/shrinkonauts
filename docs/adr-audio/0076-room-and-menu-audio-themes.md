# ADR-0076: Per-room and menu audio themes

- **Status:** Proposed
- **Date:** 2026-11-03
- **Deciders:** Snorre
- **Related:** ADR-0020, ADR-0027, ADR-0029, ADR-0032, ADR-0033, ADR-0058, ADR-0059, ADR-0078
- **Extends:** ADR-0027 (art/audio direction) and ADR-0032 (audio cue abstraction)
- **Supersedes on acceptance:** the "music deferred" clauses in [`docs/m3/asset-requirements-v01.md`](../m3/asset-requirements-v01.md) §2.2 and [`docs/m3.5/hub-asset-prompts-v01.md`](../m3.5/hub-asset-prompts-v01.md) §0; the "prototype has no music" statement in [`docs/gdd/ASSET-LIST-GBL.md`](../gdd/ASSET-LIST-GBL.md) §5; the "no music or ambience" note in [`docs/gdd/GDD-MAP.md`](../gdd/GDD-MAP.md) §Sound & Music.

## Context

The current build has 18 short SFX cues and no music. All cues are placeholders, and the room/theme data already has the fields needed to select audio by room:

- `room.music?: AssetId` and `room.ambience?: AssetId` in `src/pack/types.ts`.
- `theme.audio.music?: AssetId` in `src/pack/types.ts`.
- `HubDocument.audio` for hub cues, and the hub's `ThemeDocument` already supports `audio.music`.

The current docs say music is deferred:

- M3 §2.2: "Music loop / ambience — Music playback is deferred."
- M3.5 §0: "Six Ludo Audio cues; no music."
- GDD asset list: "Prototype has no music or ambience."
- Video storyboard: "the current build has no music or ambience."

But the original design did not exclude music. The vault copies of the earlier ADRs and contracts say:

- **ADR-0027:** "one music loop + eight SFX cues."
- **ADR-0032:** cue IDs `audio.music.<pack>` and `audio.ambience.<room>`.
- **Pack schema:** `room.music` and `room.ambience`; example IDs `audio.music.nerve_forest` and `audio.ambience.nerve_hum`.
- **Requirements CR-8:** "one music loop" per pack.
- **Video storyboard:** a 100–112 BPM, playful/tactile, warm, slightly "lab" track, with forest ambience and a low electrical hum.

The game now has three authored rooms with distinct identities:

| Room | Identity |
|---|---|
| `03-nerve-forest` | Damp organic nerve forest, amber signal, threshold/all-or-none, curious and alive |
| `04-muscle-effector` | Muscle endplate, Ca²⁺/ACh ferry, physical effort, tension and release |
| `01-interrupt-loop` | Cold graphite/cyan circuit board, relay clicks, sensor→controller→CPU→actuator |
| Bathroom hub / menu | Warm retro-futuristic laundry lab, domestic appliance plus soft sci-fi |

A single pack loop cannot carry those four identities. A per-room theme is the smallest change that gives each room its own musical character while keeping the shared cue kit.

## Decision

### 1. Scope

Add **four loopable themes** for the authored content:

| Scope | Asset ID | File | Length |
|---|---|---|---:|
| Menu / bathroom hub | `audio.music.menu` | `public/hub/bathroom/shared/audio/theme-menu.ogg` | 45–60 s |
| `03-nerve-forest` | `audio.music.nerve_forest` | `public/packs/anatomy-reflex/shared/audio/theme-nerve-forest.ogg` | 30–45 s |
| `04-muscle-effector` | `audio.music.muscle_effector` | `public/packs/anatomy-reflex/shared/audio/theme-muscle-effector.ogg` | 30–45 s |
| `01-interrupt-loop` | `audio.music.interrupt_loop` | `public/packs/silicon-reflex/shared/audio/theme-interrupt-loop.ogg` | 30–45 s |

`01-bone-gate`, `02-joint-chamber`, and `05-reflex-core` are **not** in this pass. They get themes when they are authored, using the template in the prompt pack.

### 2. Content model and precedence

- A room selects a theme with `room.music`.
- A pack may set `theme.audio.music` as a fallback for rooms without a theme.
- The hub selects the menu theme with `theme.audio.music` in `public/hub/bathroom/theme.json`. No new hub document field is needed.
- Resolution order:
  1. `room.music`
  2. `theme.audio.music`
  3. silence
- A missing theme is silent and warned; it is not a validation failure unless the final/capture mode explicitly requires it.

### 3. One theme per room; no separate ambience file in v1

- Each room gets one loop. The loop may include ambient textures, room tone, drips, hums, and mechanical beds.
- `room.ambience` stays reserved but is not populated in v1. A separate ambience layer is a later decision, not part of this scope.
- The menu theme includes the laundry-lab room tone. It replaces the ambience role of `audio.cue.hub.hum`.
- `audio.cue.hub.hum` may remain as a short one-shot room-tone accent, or be retired. It must **not** loop underneath the menu theme.

This resolves the open M3.5 question "is `hub.hum` ambience or one-shot?" in favour of the menu theme owning the bed.

### 4. Shared motif and cycle identity

The four themes are siblings, not four unrelated tracks:

- **Anatomy "signal" motif:** a short repeating three-note minor-key figure. `03` states it on muted marimba/kalimba; `04` states it slower and heavier. `05`, when authored, resolves it.
- **Silicon "relay" motif:** a repeating two-note tick with a slight downward bend. It is a dry pulse figure, not a bright 8-bit bleep and not a variation of the anatomy motif. It must not use water foley or organic textures.
- **Menu "home" motif:** a short repeating three-note minor-key figure, warm and unresolved. It can hint at the anatomy motif but is its own identity, because the hub is the real-world frame.
- The motif is low/mid register, short and repeating, and never mixed as a lead over the SFX cues.
- The themes use one **biological cyberpunk dungeon palette**: minor-key, 4/4, slightly detuned piano/organ/mallets, dirty bass, simple drums, short repeating motifs, and dirty lo-fi production, with detuned synth pulses, circuit hum, radio static, relay/servo ticks, and small glitch stutters. The menu and Silicon use a mid-tempo forward push; the anatomy rooms use plodding 4/4. Cyberpunk means biomechanical grime, not neon synthwave. Gross-cute, curious, and friendly; dark, but not horror.

### 5. Format and budget

| Field | Requirement |
|---|---|
| Sample rate | 48 kHz |
| Channels | Stereo |
| Format | OGG Vorbis q4–q6; MP3 fallback |
| Length | 30–45 s rooms; 45–60 s menu |
| File size | ≤ 1.5 MB per theme |
| Total theme budget | ≤ 5 MB target |
| Loudness | −18 to −16 LUFS integrated; true peak ≤ −1 dBTP |
| Loop | Seamless; bar-aligned; no fade at the seam; three consecutive loops must pass |
| Mix | Music bus at roughly 0.30–0.35 of master; cues sit above it |

The 120 KB cue budget does not apply to themes. Themes are long, stereo, and compressed at a music-appropriate bitrate.

### 6. Accessibility and failure

- Music is background. It never carries information that is unavailable visually.
- The master mute silences music and cues.
- The master volume applies to both; a separate music slider is deferred.
- A missing or failed theme is silent and warned; it does not crash the game.
- No audio-only cues are introduced.

### 7. Licensing and provenance

- Use Ludo.ai **Music** mode or Stability AI **Stable Audio 2.5** for generation.
- Every theme gets a `licenses.json`/manifest licence entry with tool, model, prompt version, seed, duration, post-processing, and licence.
- Ludo's paid plan is the documented commercial path. Stability AI's Community License may require a separate commercial licence; record the terms before shipping.
- Do not use the video's external track as a game theme. The video track is a separate asset with its own licence.

### 8. Documentation consequences

On acceptance, update the claims that the prototype has no music:

- [`docs/m3/asset-requirements-v01.md`](../m3/asset-requirements-v01.md) §2.2.
- [`docs/m3.5/hub-asset-prompts-v01.md`](../m3.5/hub-asset-prompts-v01.md) §0 and §11.
- [`docs/gdd/ASSET-LIST-GBL.md`](../gdd/ASSET-LIST-GBL.md) §5.
- [`docs/gdd/GDD-MAP.md`](../gdd/GDD-MAP.md) §Sound & Music.
- [`docs/m4/README.md`](../m4/README.md) and the video storyboard note that says the game has no music.
- The root `README.md` and `IMPLEMENTATION.md` "music/ambience deferred" rows.

The SFX cue document remains the source for the 18 cues; this ADR and its prompt pack are the source for the four themes.

## Consequences

**Easier:**

- Each room gets a distinct musical identity without changing the cue kit.
- The menu feels like a place rather than a silent menu.
- The GDD/video can use a coherent in-game soundtrack.
- The existing `room.music` and `theme.audio.music` fields are used instead of inventing a new namespace.
- The `hub.hum` ambience decision is resolved by the menu theme.

**Harder:**

- Four loops need composition, loop editing, and three-loop QA.
- The runtime needs a theme player, crossfade, queue-until-unlock, and a music bus.
- Decoded stereo themes consume memory (roughly 11–23 MB each at 48 kHz).
- The M3/M3.5/GDD/video docs and the "no music" claims must be updated.
- The M3 capture timeline grows; themes are a scope increase, not a free swap.

**Constrained:**

- No adaptive music layers in v1.
- No streamed music; themes are fetched and decoded locally.
- No per-concept tracks; concept identity comes from the shared motif and room variation.
- No themes for unauthored rooms.
- No separate ambience file in v1.

## Alternatives considered

- **One pack loop only** — rejected: it cannot distinguish the nerve forest, muscle end effector, Silicon board, and menu.
- **Per-concept tracks only** — rejected: concepts cut across rooms, and the room is the player-facing unit.
- **Ambience beds only** — rejected: a room tone gives atmosphere but not identity; the request is for an audio theme.
- **Keep the no-music status quo** — rejected by the request; it also contradicts the original ADR-0027/0032 intent.
- **Adaptive stems in v1** — rejected: three layers per room plus state-driven crossfades is a much larger runtime and content scope.
- **Separate music and ambience files per room** — deferred: it doubles the asset count; the theme can carry ambient texture in one loop.

## References

- [`../audio/room-and-menu-themes-v01.md`](../audio/room-and-menu-themes-v01.md) — theme prompts and acceptance.
- [`../audio/audio-requirements-and-prompts-v01.md`](../audio/audio-requirements-and-prompts-v01.md) — 18 SFX cues.
- [`../adr-audio/0077-audio-theme-playback-and-mixing.md`](0077-audio-theme-playback-and-mixing.md) — playback and mixing.
- [`../shrinkonauts/base-game/adr/0027-art-audio-direction-and-licensing.md`](../shrinkonauts/base-game/adr/0027-art-audio-direction-and-licensing.md) — original one-loop direction.
- [`../shrinkonauts/base-game/adr/0032-audio-cue-abstraction.md`](../shrinkonauts/base-game/adr/0032-audio-cue-abstraction.md) — cue abstraction and reserved music/ambience IDs.
- [`../shrinkonauts/base-game/contracts/pack-schema.md`](../shrinkonauts/base-game/contracts/pack-schema.md) — `room.music`/`room.ambience` example.
- [`../m3/asset-requirements-v01.md`](../m3/asset-requirements-v01.md) — M3 SFX scope.
- [`../m3.5/hub-asset-prompts-v01.md`](../m3.5/hub-asset-prompts-v01.md) — hub audio cues and `hub.hum` open decision.
- [`../gdd/gbl/gbl-course-requirements.md`](../gdd/gbl/gbl-course-requirements.md) — video music/SFX requirement.
