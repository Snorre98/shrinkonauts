# Room and Menu Audio Themes — Requirements and Generation Prompts

> **Status:** Proposed extension · 3 November 2026  
> **Owner:** Snorre  
> **Scope:** Four loopable themes — bathroom hub/menu, `03-nerve-forest`, `04-muscle-effector`, `01-interrupt-loop`  
> **Prompt version:** `audio-themes-2026-11-03.1`  
> **Depends on:** [ADR-0076](../adr-audio/0076-room-and-menu-audio-themes.md), [ADR-0077](../adr-audio/0077-audio-theme-playback-and-mixing.md)  
> **Related:** [`audio-requirements-and-prompts-v01.md`](audio-requirements-and-prompts-v01.md) — the 18 SFX cues  
> **Primary tool:** Ludo.ai Audio Generator (Music mode)  
> **Fallback tool:** Stability AI Stable Audio 2.5

**Sources**

- [`../adr-audio/0076-room-and-menu-audio-themes.md`](../adr-audio/0076-room-and-menu-audio-themes.md)
- [`../adr-audio/0077-audio-theme-playback-and-mixing.md`](../adr-audio/0077-audio-theme-playback-and-mixing.md)
- [`../audio/audio-requirements-and-prompts-v01.md`](audio-requirements-and-prompts-v01.md)
- [`../m3/asset-requirements-v01.md`](../m3/asset-requirements-v01.md)
- [`../m3.5/hub-asset-prompts-v01.md`](../m3.5/hub-asset-prompts-v01.md)
- [`../shrinkonauts/base-game/adr/0027-art-audio-direction-and-licensing.md`](../shrinkonauts/base-game/adr/0027-art-audio-direction-and-licensing.md)
- [`../shrinkonauts/base-game/adr/0032-audio-cue-abstraction.md`](../shrinkonauts/base-game/adr/0032-audio-cue-abstraction.md)
- [`../shrinkonauts/base-game/contracts/pack-schema.md`](../shrinkonauts/base-game/contracts/pack-schema.md)
- [`../shrinkonauts/video/storyboard-prompt-library.md`](../shrinkonauts/video/storyboard-prompt-library.md) — video track direction

**Precedence.** This is a proposed extension. It does not change the M3/M3.5 SFX scope until ADR-0076 and ADR-0077 are accepted. If this document and a milestone document disagree, the milestone document wins on current scope; this document wins on theme prompts and delivery once accepted.

---

## 1. Summary

| Decision | Value |
|---|---|
| Themes in v1 | **4** — menu, nerve forest, muscle effector, interrupt loop |
| Menu theme | `audio.music.menu` — 45–60 s loop |
| Room themes | `audio.music.nerve_forest`, `audio.music.muscle_effector`, `audio.music.interrupt_loop` — 30–45 s loops |
| Future themes | `01-bone-gate`, `02-joint-chamber`, `05-reflex-core` only when authored |
| Separate ambience | **None in v1**; the theme includes ambient texture. `room.ambience` stays reserved. |
| Format | 48 kHz stereo OGG Vorbis; MP3 fallback |
| File budget | ≤ 1.5 MB per theme; ≤ 5 MB total target |
| Mix | Music bus at ~0.30–0.35 of master; SFX cues above |
| Music slider | **Deferred**; master mute/volume only in v1 |
| `hub.hum` | The menu theme owns the ambience bed; `hub.hum` becomes a one-shot or is retired |
| Licensing | Ludo Music (paid) or Stable Audio 2.5; log every theme |

---

## 2. Scope contract

### 2.1 In scope

| Scope | Asset ID | File | Length | Tempo | Priority |
|---|---|---|---:|---:|---:|
| Menu / bathroom hub | `audio.music.menu` | `public/hub/bathroom/shared/audio/theme-menu.ogg` | 45–60 s | 100–108 BPM | P0 |
| `03-nerve-forest` | `audio.music.nerve_forest` | `public/packs/anatomy-reflex/shared/audio/theme-nerve-forest.ogg` | 30–45 s | 92–104 BPM | P0 |
| `04-muscle-effector` | `audio.music.muscle_effector` | `public/packs/anatomy-reflex/shared/audio/theme-muscle-effector.ogg` | 30–45 s | 100–116 BPM | P1 |
| `01-interrupt-loop` | `audio.music.interrupt_loop` | `public/packs/silicon-reflex/shared/audio/theme-interrupt-loop.ogg` | 30–45 s | 110–124 BPM | P1/P2 |

### 2.2 Out of scope

- A separate ambience file per room; the theme carries ambient texture.
- Adaptive stems or layers driven by puzzle state.
- Music for unauthored rooms (`01-bone-gate`, `02-joint-chamber`, `05-reflex-core`).
- A per-concept track that is not tied to a room.
- A music-volume slider or a new settings schema.
- Streamed music; themes are fetched and decoded locally.
- Replacing the 18 SFX cues.
- Trailer music for the 2-minute video; that remains a separate licensed asset.

### 2.3 Content model and precedence

- A room selects a theme with `room.music`.
- A pack may set `theme.audio.music` as a fallback for rooms without a theme.
- The hub selects the menu theme with `theme.audio.music` in `public/hub/bathroom/theme.json`.
- Resolution order:
  1. `room.music`
  2. `theme.audio.music`
  3. silence

No new asset namespace is introduced. The theme IDs follow the existing `audio.music.<name>` convention from ADR-0032.

---

## 3. Sound direction

### 3.1 Shared motif and cycle identity

The four themes are siblings, not four unrelated tracks.

| Identity | Motif | Use |
|---|---|---|
| Anatomy | **Signal motif** — a three-note ascending figure | `03` states it as a plucked nerve-fiber motif; `04` states it slower and heavier as a low brass/synth swell; `05` resolves it when authored |
| Silicon | **Relay motif** — a two-note alternating tick | `01` states it as a cold relay/clock figure; not a variation of the anatomy motif |
| Menu | **Home motif** — a three-note warm chime | The hub's own identity; it may hint at the anatomy motif but is not the same figure |

Rules:

- Keep the motif in the low/mid register. It is a texture, not a hook.
- State the motif two to four times per loop.
- Never put the motif in a frequency range that masks dialogue, scan, gate, or UI cues.
- The room theme is a variation on its cycle motif, not a new melody per room.
- The menu theme is the only theme that may feel warmly domestic. Silicon must not use amber/warm anatomy instruments.

### 3.2 Global music style

**Anatomy / menu:**

```text
Loopable diegetic game music, 48 kHz, instrumental, small-scale, tactile, warm-dark, organic and domestic textures, no vocals, no lyrics, no intelligible speech, no gore, no cinematic bombast, clean loop seam, no clipping.
```

**Silicon:**

```text
Loopable diegetic game music, 48 kHz, instrumental, cold, precise, clicky, graphite and cyan circuit-board textures, no vocals, no lyrics, no intelligible speech, no gore, no cinematic bombast, clean loop seam, no clipping.
```

### 3.3 Global negative (Stable Audio 3 / tools that support negatives)

```text
vocals, lyrics, speech, singing, choir, intelligible words, epic orchestra, cinematic bombast, EDM drop, dubstep, heavy metal, horror strings, gore, screams, long reverb wash, clipping, distortion, low quality.
```

Theme-specific deltas are in each card.

Stable Audio 2.5 has no negative prompt in the current API. Append this to the positive prompt instead:

```text
Instrumental, no vocals, no lyrics, no speech, seamless loop, dry small-room production.
```

The global negative is intentionally broad. Drop `distortion` only if a Silicon texture needs a deliberate glitch; never drop `vocals`, `lyrics`, `speech`, `gore`, or `clipping`.

### 3.4 Instrument palette

| Theme | Core instruments | Avoid |
|---|---|---|
| Menu | soft washing-machine motor hum, brushed percussion, muted analog bass, gentle electric piano/mallet, pipe ticks, water drips, small chime | drum kit, big band, cartoon pizzicato, chiptune lead |
| 03 Nerve Forest | low membrane drone, plucked nerve-fiber motif, electrical ticks, wet drips, amber chime, sub-bass pulse | jungle drums, tribal percussion, horror strings, heroic brass |
| 04 Muscle Effector | deep soft contraction thumps, wet membrane textures, low analog brass/synth swell, ticking timer, shimmering release | heavy metal, industrial grinding, pain sounds, heroic brass |
| Silicon | graphite low hum, relay clicks, servo whirr, digital ticks, muted cyan synth pulse, glitch stutters | chiptune lead, warm analog pads, organic textures, amber bells |

---

## 4. Theme cards

**How to use a card**

- **Ludo:** Music mode, Loop on, duration set in the UI, no duration in the prompt, prompt expansion off if the UI/API offers it.
- **Stable Audio 2.5:** set duration to the target length (or 60–75 s and trim), append the 2.5 suffix, use a fixed seed when comparing revisions.
- **Both:** generate 2–4 variations; keep the first that passes the loop and mix checks.
- **BPM:** keep it in the prompt because it steers tempo; if the tool ignores it, adjust the result in post or regenerate.

### 4.1 `audio.music.menu` — bathroom hub / main menu

- **Scope:** bathroom hub, pack selection, mode selection, settings.
- **Length:** 45–60 s, seamless loop.
- **Tempo:** 100–108 BPM.
- **Structure:** 16-bar A (sparse) → 8-bar B (gentle lift) → 8-bar A return; loop on a bar boundary. No big intro, no final cadence.
- **Instruments:** soft washing-machine motor hum, brushed percussion, muted analog bass, gentle electric piano or mallet, tiny pipe ticks, distant water drips, three-note home chime.
- **Mood:** warm, domestic, slightly sci-fi, inviting, low-key playful; the laundry lab at rest.
- **Visual counterpart:** the hub menu; music is background, never informational.

**Ludo — Music mode, Loop on:**

> Warm retro-futuristic laundry-lab menu loop, 104 BPM, soft washing-machine motor hum, brushed percussion, muted analog bass, gentle electric piano, tiny pipe ticks and water drips, a three-note home chime, playful and inviting, not cartoonish, instrumental, seamless loop, no vocals.

**Stable Audio 2.5:**

> An instrumental game menu loop for a cozy retro-futuristic laundry lab, 104 BPM, warm and tactile, featuring a soft washing-machine motor hum, brushed percussion, muted analog bass, gentle electric piano, tiny pipe ticks, distant water drips, and a three-note home chime. Sparse, inviting, slightly playful, not cartoonish. Seamless loop, dry small-room production, no vocals, no lyrics, no epic orchestra, no EDM drop.

**Negative delta:** `+ vocals, lyrics, speech, choir, epic orchestra, EDM drop, chiptune lead, horror, gore, long reverb, clipping.`

**Accept:**

- Loops across three consecutive plays without a seam or a reset in energy.
- Sits under the hub click/door/spin/shrink/arrive cues at 0.35 music gain.
- No vocals; no melody that competes with menu text.
- ≤ 1.5 MB; 48 kHz stereo; 45–60 s.

**Reject:**

- A song with a verse/chorus and a final cadence.
- A cartoonish or sitcom theme.
- A loud lead that masks the UI click.
- A loop that audibly restarts.

### 4.2 `audio.music.nerve_forest` — `03-nerve-forest`

- **Scope:** Node Run, threshold/all-or-none, neuron structure, sensory/motor pathways.
- **Length:** 30–45 s, seamless loop.
- **Tempo:** 92–104 BPM.
- **Structure:** 8-bar pulse A → 8-bar lift B → 8-bar A return; loop. Keep the lift subtle; the puzzle should stay readable.
- **Instruments:** low membrane drone, plucked three-note nerve-fiber motif, soft electrical ticks, wet drips, amber chime, subtle sub-bass pulse.
- **Mood:** curious, damp, alive, slightly mysterious; not scary, not jungle adventure.
- **Visual counterpart:** damp nerve forest, amber signal path, membrane folds.

**Ludo — Music mode, Loop on:**

> Curious damp organic nerve-forest game loop, 98 BPM, low membrane drone, plucked nerve-fiber motif, soft electrical ticks, wet drips, amber chime, subtle sub-bass pulse, alive and mysterious but not scary, instrumental, seamless loop, no vocals.

**Stable Audio 2.5:**

> An instrumental game loop for a nerve forest inside a human body, 98 BPM, damp, organic and curious, featuring a low membrane drone, a plucked three-note nerve-fiber motif, soft electrical ticks, wet drips, amber chimes, and a subtle sub-bass pulse. Warm-dark, tactile, small-scale, alive but not scary. Seamless loop, dry close production with a small room tail, no vocals, no lyrics, no jungle drums, no horror strings, no epic orchestra.

**Negative delta:** `+ jungle drums, tribal percussion, horror strings, vocals, epic orchestra, EDM, chiptune, gore, long reverb, clipping.`

**Accept:**

- Reads as a living nerve forest, not a jungle or a horror level.
- The motif is present but does not mask dialogue or scan cues.
- No sudden stingers or drops; the loop is safe to sit under a puzzle.
- ≤ 1.5 MB; 48 kHz stereo; 30–45 s.

**Reject:**

- Tribal/jungle drums.
- Horror strings or a jump-scare stinger.
- A heroic melody that makes the room feel like an adventure.
- A long reverb wash that smears the loop seam.

### 4.3 `audio.music.muscle_effector` — `04-muscle-effector`

- **Scope:** Endplate Ferry, Ca²⁺/ACh, receptor binding, muscle contraction.
- **Length:** 30–45 s, seamless loop.
- **Tempo:** 100–116 BPM.
- **Structure:** 8-bar effort A → 8-bar tension B → 8-bar release/return A; loop. The release should resolve without ending the loop.
- **Instruments:** deep soft contraction thumps, wet membrane textures, low analog brass/synth swell, subtle ticking Ca²⁺ timer, shimmering ACh release.
- **Mood:** effortful, rhythmic, warm, tense but not aggressive; the muscle working.
- **Visual counterpart:** muscle endplate, ACh ferry, receptor, contraction gate.

**Ludo — Music mode, Loop on:**

> Effortful warm muscle-endplate game loop, 108 BPM, deep soft contraction thumps, wet membrane textures, low analog brass swell, ticking calcium timer, shimmering acetylcholine release, tense but not aggressive, instrumental, seamless loop, no vocals.

**Stable Audio 2.5:**

> An instrumental game loop for a muscle endplate inside a human body, 108 BPM, effortful, warm and tense but not aggressive, featuring deep soft contraction thumps, wet membrane textures, a low analog brass swell, a subtle ticking calcium timer, and a shimmering acetylcholine release. Tactile, small-scale, physical. Seamless loop, dry close production, no vocals, no lyrics, no heavy metal, no industrial grinding, no gore, no epic orchestra.

**Negative delta:** `+ heavy metal, industrial grinding, gore, screams, vocals, epic orchestra, EDM drop, clipping.`

**Accept:**

- Feels physical and effortful, not angry or metallic.
- The ticking timer is subtle enough not to become an alarm.
- The low end does not mask jump/land/dash cues.
- Distinct from `03`; the shared motif is slower and heavier.
- ≤ 1.5 MB; 48 kHz stereo; 30–45 s.

**Reject:**

- Heavy metal or industrial grinding.
- Pain grunts, screams, or gore.
- A ticking clock that dominates the mix.
- A generic action loop.

### 4.4 `audio.music.interrupt_loop` — `01-interrupt-loop` (Silicon)

- **Scope:** sensor → interrupt controller → CPU → actuator; transfer gate.
- **Length:** 30–45 s, seamless loop.
- **Tempo:** 110–124 BPM.
- **Structure:** 8-bar machine pulse A → 4-bar glitch fill → 8-bar B → 8-bar A return; loop. The glitch fill is a texture, not a drop.
- **Instruments:** graphite low hum, relay clicks, servo whirr, digital ticks, muted cyan synth pulse, small glitch stutters.
- **Mood:** cold, precise, clicky, playful, slightly tense; a circuit-board workplace.
- **Visual counterpart:** graphite/cyan board, relay, sockets, CPU wake, actuator.

**Ludo — Music mode, Loop on:**

> Cold precise circuit-board game loop, 116 BPM, graphite low hum, relay clicks, servo whirr, digital ticks, muted cyan synth pulse, glitch stutters, playful and tense, not chiptune, instrumental, seamless loop, no vocals.

**Stable Audio 2.5:**

> An instrumental game loop for a cold graphite circuit board inside a machine, 116 BPM, precise, clicky and playful, featuring a low graphite hum, relay clicks, servo whirr, digital ticks, a muted cyan synth pulse, and small glitch stutters. Clean-room tension, not retro chiptune, no warm analog pads, no organic textures. Seamless loop, dry close production, no vocals, no lyrics, no epic orchestra, no EDM drop.

**Negative delta:** `+ chiptune lead, 8-bit melody, warm analog pads, organic textures, jazz, vocals, epic orchestra, EDM, gore, clipping.`

**Accept:**

- Reads as cold hardware, not an 8-bit console.
- No amber/warm anatomy instruments.
- Clicks are crisp but not piercing; they do not mask the SFX cues.
- Distinct from the anatomy themes; the relay motif is present.
- ≤ 1.5 MB; 48 kHz stereo; 30–45 s.

**Reject:**

- A chiptune lead or a full 8-bit melody.
- Warm analog pads or organic textures.
- A comedy robot voice or vocoder.
- A drop or a big cinematic ending.

---

## 5. Future room template

Do not generate these until the room is authored. Use the anatomy "signal" motif as the base.

| Future room | Direction | Tempo | Length |
|---|---|---:|---:|
| `01-bone-gate` | Sparse bone percussion, low sine, signal motif stated quietly; chalky, hollow, curious | 90–100 BPM | 30–45 s |
| `02-joint-chamber` | Fluid synth, joint-cyan shimmer, slow pulse, signal motif stretched; slippery and calm | 88–100 BPM | 30–45 s |
| `05-reflex-core` | Full signal-motif resolution, confident and warm; the arc completes | 104–112 BPM | 45–60 s |

Asset IDs would be `audio.music.bone_gate`, `audio.music.joint_chamber`, `audio.music.reflex_core`, in the anatomy pack.

---

## 6. Tool guide

**Tool references**

- Ludo Audio Generator docs: <https://ludo.ai/docs/audio-generator>
- Ludo sound-effects guide: <https://ludo.ai/docs/audio-generator/sound-effects>
- Stable Audio 2.5 prompt guide: <https://kb.stability.ai/knowledge-base/stable-audio-2.5-prompt-guide>
- Stable Audio 3 prompt guide: <https://kb.stability.ai/knowledge-base/stable-audio-3-prompt-guide>

### 6.1 Ludo.ai — Music mode

| Setting | Value |
|---|---|
| Mode | Music |
| Prompt | Genre/style, instruments, BPM, mood, structure; no duration in the text |
| Duration | Set in the UI; at least the target loop length. If the UI caps below 45 s, generate the longest section and assemble/loop in a DAW. |
| Loop | On for every theme |
| Output | MP3 |
| Cost | Record the actual credit cost; music may differ from the 2-credit SFX rate |
| Prompt expansion | On by default; turn it off via the API if results drift, or reject results that add vocals |
| Variations | 2–4; use Remix for a variation after a clear direction is chosen |

Ludo-specific rules:

- Do not write "45 seconds" in the prompt; set the duration in the UI.
- Ask for a seamless loop, but verify it. A generated "song" may still have an intro/outro; edit to a bar-aligned loop in a DAW.
- Do not use a vocal mode. Music mode only.
- If prompt expansion adds vocals or a pop structure, remix or turn expansion off.
- Ludo returns MP3; resample to 48 kHz if needed.

### 6.2 Stability AI — Stable Audio 2.5

| Setting | Value |
|---|---|
| Model | `stable-audio-2.5` (music-focused) |
| Duration | 1–190 s; generate 60–75 s and trim to the loop |
| Negative prompt | Not exposed in the current API; append the 2.5 suffix to the positive prompt |
| Prompt expansion | Not the primary control; use a detailed prompt |
| Output | Confirm the provider; commonly 44.1 kHz stereo. Resample to 48 kHz. |
| Licence | Stability AI Community License; commercial use may require a separate licence |

Stable-specific rules:

- Generate longer than the target loop, then trim to a bar-aligned section.
- Use audio-to-audio to derive `04` from `03` at a moderate strength (roughly 0.35–0.55) while preserving the signal motif.
- Use inpainting to fix a bad loop seam or a final cadence.
- Use a fixed seed when comparing prompt revisions.
- Stable Audio 3 Small SFX is for one-shots, not music. If you need another music model, use Stable Audio 2.5 or Stable Audio 3 Medium.

### 6.3 Remix and variation workflow

1. Generate the **menu theme** first as the production/style anchor (P0).
2. Generate **`03-nerve-forest`** as the anatomy motif anchor (P0).
3. Generate **`04-muscle-effector`** as a variation of `03`: same signal motif, slower/heavier instrumentation. Use Ludo Remix or Stable Audio 2.5 audio-to-audio; do not start from scratch unless the remix loses the motif.
4. Generate **`01-interrupt-loop`** independently. Do not remix the anatomy theme; Silicon must be a cold sibling, not a recolour.
5. If the menu and `03` feel like different games, revise the menu's instrument palette rather than the motif.

### 6.4 Seeds, variations, and retries

- Generate 2–4 variations per theme.
- Keep the first that passes the loop, mix, and identity checks.
- Maximum two prompt revisions before changing tool or accepting a placeholder.
- Record model, seed, duration, BPM, loop points, post-processing, and licence.
- Keep failed rows in the prompt log; do not overwrite history.

---

## 7. Technical delivery specification

### 7.1 Format and size

| Field | Requirement |
|---|---|
| Sample rate | **48 kHz** |
| Channels | **Stereo** |
| Format | **OGG Vorbis q4–q6**; MP3 fallback |
| Length | 30–45 s rooms; 45–60 s menu |
| File size | **≤ 1.5 MB per theme** |
| Total theme budget | **≤ 5 MB target** |
| Loudness | **−18 to −16 LUFS integrated**; true peak **≤ −1 dBTP** |
| Loop | Seamless, bar-aligned, no fade at the seam |
| Music bus | 0.30–0.35 of master; SFX cues above |
| Head/tail | No leading silence beyond the first downbeat; no long tail across the loop |

### 7.2 Loop rules

1. Compose in 4/8-bar phrases.
2. End the file at a bar boundary that matches the start rhythmically and harmonically.
3. Do not fade out at the end; the loop must be continuous.
4. Do not let a long reverb tail cross the seam; print/adjust the tail before the loop point.
5. Check three consecutive loops in the browser and in an audio editor.
6. If the generated track has a final cadence, trim before it and re-loop; do not use the whole song.

### 7.3 File naming and destinations

```text
public/hub/bathroom/
  shared/audio/theme-menu.ogg

public/packs/anatomy-reflex/
  shared/audio/theme-nerve-forest.ogg
  shared/audio/theme-muscle-effector.ogg

public/packs/silicon-reflex/
  shared/audio/theme-interrupt-loop.ogg
```

Use lowercase kebab-case, no spaces, no dots in filenames. If the final format is MP3, use `.mp3` consistently and update the manifest paths.

### 7.4 Manifest entries

```json
"audio.music.menu": {
  "type": "audio",
  "src": "shared/audio/theme-menu.ogg",
  "license": "Ludo AI Commercial (paid)"
}
```

Room documents:

```json
"music": "audio.music.nerve_forest"
```

Hub theme:

```json
"audio": {
  "music": "audio.music.menu",
  "cues": { "...": "..." }
}
```

### 7.5 Licence records

Add a `licenses.json` entry for each theme:

```json
{
  "file": "shared/audio/theme-menu.ogg",
  "type": "audio",
  "source": "Ludo.ai Audio Generator (Music mode)",
  "author": "AI-generated in Ludo.ai; sound direction by Snorre",
  "license": "Ludo AI Commercial (paid)",
  "url": "https://ludo.ai/terms-of-service",
  "modified": "Generated 2026-11-04; trimmed to 52 s; 48 kHz stereo; loop-checked; OGG Vorbis",
  "aiGenerated": true
}
```

The hub has no `licenses.json`; add the `license` field to the hub manifest entry, or create a hub licence file.

---

## 8. Generation order and approval gates

| Stage | Generate | Gate |
|---|---|---|
| 0 | Confirm ADR-0076/0077 and implement the theme player | A test theme loops and crossfades; no `AUDIO_FILE_PROVIDER_STUB` |
| 1 | Menu theme (P0) | Loops three times; sits under hub cues; no vocals; approved at 0.35 gain |
| 2 | `03-nerve-forest` (P0) | Anatomy motif reads; no horror/jungle clichés; supports puzzle concentration |
| 3 | `04-muscle-effector` (P1) | Same motif, heavier; distinct from 03; low end does not mask jump/land |
| 4 | `01-interrupt-loop` (P1/P2) | Cold/clicky; no chiptune lead; distinct from anatomy |
| 5 | Integration | Room/hub transitions, mute, volume, pause, crossfade, licences |

Do not generate all four before the menu/03 pilot passes. The menu is the production anchor; 03 is the anatomy motif anchor.

---

## 9. Post-processing and loop QA

1. Trim to a bar-aligned loop.
2. Resample to 48 kHz stereo.
3. Remove DC offset; high-pass only if it does not remove intended sub-bass.
4. Normalise to −18 to −16 LUFS; true peak ≤ −1 dBTP.
5. Encode to OGG Vorbis q4–q6 (or MP3 fallback).
6. Check the loop seam in an audio editor at sample level.
7. Play three consecutive loops in the browser.
8. A/B the theme under the room's SFX cues at 0.35 music gain.
9. Check the crossfade into and out of the room.
10. Record the prompt, model, seed, duration, BPM, loop points, post-processing, and licence.

### Per-theme acceptance

- [ ] File exists at the exact path; manifest `src` matches.
- [ ] 48 kHz stereo; OGG/MP3; ≤ 1.5 MB.
- [ ] 30–45 s room / 45–60 s menu.
- [ ] Seamless loop; three-loop check passes.
- [ ] −18 to −16 LUFS; true peak ≤ −1 dBTP.
- [ ] No vocals, lyrics, speech, gore, or horror.
- [ ] Motif present but not masking SFX.
- [ ] Reads as the intended room/menu identity.
- [ ] Distinct from the other themes.
- [ ] Licence and prompt-log rows complete.

### Global acceptance

- [ ] Menu + 03 + 04 + Silicon themes approved, or a recorded placeholder decision.
- [ ] `room.music` is wired for 03, 04, and 01; hub theme `audio.music` is wired.
- [ ] `theme.audio.music` fallback behaviour is documented and tested.
- [ ] Menu theme replaces the `hub.hum` ambience role; `hub.hum` is not looped underneath.
- [ ] No separate ambience file was added.
- [ ] Music is never the only carrier of information.
- [ ] Master mute/volume, pause/resume, and first-gesture unlock pass.
- [ ] Hub → pack and pack → hub transitions fade cleanly.
- [ ] M3/M3.5/GDD/video docs no longer claim the game has no music.

---

## 10. Integration checklist

### 10.1 Runtime

- [ ] Implement `ManifestAudioProvider` (fetch, decode, cache, play); it is still a stub.
- [ ] Add `playTheme`/`stopTheme`/`pauseTheme`/`resumeTheme` to `AudioModule` and `AudioPort`.
- [ ] Add the music gain bus at 0.30–0.35.
- [ ] Queue the theme until the first gesture; start the menu theme on first interaction.
- [ ] Crossfade room themes over 800–1500 ms; fade hub → pack and pack → hub.
- [ ] Pause/resume music without restarting the loop.
- [ ] Missing/failed theme is silent + warned; no synth music fallback.
- [ ] Add unit tests and a browser smoke check.

### 10.2 Content

- [ ] Add `audio.music.menu` to `public/hub/bathroom/assets.final.json` and `theme.json`.
- [ ] Add `audio.music.nerve_forest` to `03-nerve-forest/room.json` + anatomy manifest.
- [ ] Add `audio.music.muscle_effector` to `04-muscle-effector/room.json` + anatomy manifest.
- [ ] Add `audio.music.interrupt_loop` to `01-interrupt-loop/room.json` + Silicon manifest.
- [ ] Add licence entries for every theme.
- [ ] Do not add `room.ambience` in v1.
- [ ] Decide `hub.hum`: one-shot or retire.

### 10.3 Documentation

- [ ] Update M3 §2.2 and M3.5 §0/§11 “no music” claims.
- [ ] Update `docs/gdd/ASSET-LIST-GBL.md` §5 and `docs/gdd/GDD-MAP.md`.
- [ ] Update the video storyboard note that says the game has no music.
- [ ] Update root `README.md` and `IMPLEMENTATION.md` deferred rows.
- [ ] Link this document from the SFX audio document and ADR-0076.

### 10.4 Verification

```bash
npm test
npm run pack:validate
npm run pack:smoke
npm run build
npm run smoke:e2e
```

Then manually listen to the menu theme, each room theme, the three-loop seam, the room transitions, mute, volume, and pause.

---

## 11. Prompt log

| Asset ID | Tool / model | Seed | Length | BPM | Loop points | Chosen file | Post-processing | Verdict | Licence |
|---|---|---|---:|---:|---|---|---|---|---|
| `audio.music.menu` | | | | | | | | | |
| `audio.music.nerve_forest` | | | | | | | | | |
| `audio.music.muscle_effector` | | | | | | | | | |
| `audio.music.interrupt_loop` | | | | | | | | | |

**Minimum fields:** prompt version, asset ID, tool/plan, model/seed, duration, BPM, loop points, variations, chosen file, post-processing, runtime check, verdict, licence, notes.

---

## 12. Open decisions

| # | Decision | Recommendation | Owner |
|---:|---|---|---|
| 1 | Scope: menu + three authored rooms, or all five Anatomy rooms + menu? | Menu + authored rooms; future rooms when authored | Snorre |
| 2 | One theme per room, or a theme + separate ambience layer? | One theme; the theme carries ambient texture | Snorre |
| 3 | `hub.hum`: one-shot accent or retire? | Keep as a one-shot accent, not a bed; the menu theme owns the ambience | Snorre |
| 4 | Music volume: fixed bus or separate slider? | Fixed 0.30–0.35 bus in v1; slider later | Snorre |
| 5 | Stable Audio licence for commercial use? | Ludo paid is the documented path; record Stability terms before shipping | Snorre |
| 6 | Adaptive stems per room? | Defer; one loop per room in v1 | Snorre |
| 7 | Merge this document into the SFX audio document? | Keep separate while Proposed; merge/link after acceptance | Snorre |

---

## 13. Change log

| Date | Change |
|---|---|
| 2026-11-03 | Initial proposed room/menu theme prompt pack. Adds four theme cards, motif rules, tool guide, loop QA, integration checklist, prompt log, and open decisions. |
