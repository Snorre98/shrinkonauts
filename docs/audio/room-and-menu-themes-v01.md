# Room and Menu Audio Themes — Requirements and Generation Prompts

> **Status:** Proposed extension · adventure-tone revision · gross-cute murk revision · 4 November 2026  
> **Owner:** Snorre  
> **Scope:** Four loopable themes — bathroom hub/menu, `03-nerve-forest`, `04-muscle-effector`, `01-interrupt-loop`  
> **Prompt version:** `audio-themes-2026-11-04.2`  
> **Depends on:** [ADR-0076](../adr-audio/0076-room-and-menu-audio-themes.md), [ADR-0077](../adr-audio/0077-audio-theme-playback-and-mixing.md)  
> **Related:** [`audio-requirements-and-prompts-v01.md`](audio-requirements-and-prompts-v01.md) — the 18 SFX cues · [`../assets/prompt-library-v01.md`](../assets/prompt-library-v01.md) — cross-discipline inventory and completion gates
> **Primary tool:** Ludo.ai Audio Generator (Music mode)  
> **Fallback tool:** Stability AI Stable Audio 2.5

**Sources**

- [`../adr-audio/0076-room-and-menu-audio-themes.md`](../adr-audio/0076-room-and-menu-audio-themes.md)
- [`../adr-audio/0077-audio-theme-playback-and-mixing.md`](../adr-audio/0077-audio-theme-playback-and-mixing.md)
- [`../audio/audio-requirements-and-prompts-v01.md`](audio-requirements-and-prompts-v01.md)
- [`../m3/asset-requirements-v01.md`](../m3/asset-requirements-v01.md)
- [`../m3.5/hub-asset-prompts-v01.md`](../m3.5/hub-asset-prompts-v01.md)
- [`../shrinkonauts/DESIGN.md`](../shrinkonauts/DESIGN.md) — “wondrous sci-fi puzzle adventure; warm and wry” tone anchor
- [`../shrinkonauts/base-game/adr/0027-art-audio-direction-and-licensing.md`](../shrinkonauts/base-game/adr/0027-art-audio-direction-and-licensing.md)
- [`../shrinkonauts/base-game/adr/0032-audio-cue-abstraction.md`](../shrinkonauts/base-game/adr/0032-audio-cue-abstraction.md)
- [`../shrinkonauts/base-game/contracts/pack-schema.md`](../shrinkonauts/base-game/contracts/pack-schema.md)
- [`../shrinkonauts/video/storyboard-prompt-library.md`](../shrinkonauts/video/storyboard-prompt-library.md) — video track direction

**Precedence.** This is a proposed extension. It does not change the M3/M3.5 SFX scope until ADR-0076 and ADR-0077 are accepted. If this document and a milestone document disagree, the milestone document wins on current scope; this document wins on theme prompts and delivery once accepted.

**Tone anchor (2026-11-03).** `DESIGN.md` defines the game as a *wondrous sci-fi puzzle adventure; warm and wry*. In this document, **adventurous** means curious, gross-cute, forward-moving, playful, and small-scale. It does not mean epic, heroic, or sunny. The four themes are siblings in that adventure: the menu is the **invitation**, `03` is **discovery**, `04` is **teamwork**, and Silicon is **mission**. None is horror or thriller scoring.

**Gross-cute murk revision (2026-11-04).** The score is **dark, wet, muddy, biological, and low — but not horror, not sad, not sunny**. It uses Dorian harmony with minor 7ths, 9ths, and sus4; swampy half-time grooves with swung 16ths; narrow legato motifs with portamento; a wet organic foreground; and a low-passed chip low end. The darkness is textural, not threatening. Adventure comes from pulse, groove, motif, and a brief IV-major lift — not a fanfare.

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
| Tone | **Wondrous sci-fi puzzle adventure / gross-cute murk**; adventurous, dark, wet, biological; not horror, thriller, sunny, or epic |
| Palette | **Gross-cute murk** — wet organic foreground, low-passed chip low end; dark, muddy, biological, close; not horror, not sunny |
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

### 3.1 Shared motif and adventure identity

The four themes are siblings in one **wondrous sci-fi puzzle adventure**, not four unrelated tracks. Each has an adventure role:

| Theme | Adventure role | What “adventurous” means here |
|---|---|---|
| Menu | **Invitation** | The lab at rest, a small expedition about to begin; damp, curious, quietly optimistic |
| `03-nerve-forest` | **Discovery** | A slow, wet expedition through a living landscape; gross-cute wonder, not danger |
| `04-muscle-effector` | **Teamwork** | A muddy work song; effort, determination, a small hard-won step, not a fanfare |
| `01-interrupt-loop` | **Mission** | A tiny robot's greasy relay race; precision, playful momentum, a sense of mission |

| Theme | Function | Foreground | Low end / chip layer |
|---|---|---|---|
| Menu | **Damp domestic murk** | Muted marimba/electric piano, wet pipe ticks, soft hand-drum percussion | Low washing-machine hum, low-passed triangle/pulse bass |
| `03-nerve-forest` | **Wet biological discovery** | Wet membrane hand drums, water-drop percussion, muted marimba/kalimba, breathy pad | Portamento triangle bass, low-passed pulse |
| `04-muscle-effector` | **Muddy biological work song** | Low skin drums, soft wet hand-drum thumps, wooden click-clack, low tom | Detuned triangle bass, short low-passed pulse stabs |
| `01-interrupt-loop` | **Greasy oxidized machine** | Relay clicks, servo whirr, oil/dust foley, dry noise | Low-passed pulse arpeggios, triangle bass, glitch |

| Identity | Motif | Use |
|---|---|---|
| Anatomy | **Signal motif** — root → minor 3rd → perfect 4th, slide into the 3rd, ends open | `03` states it on muted marimba/kalimba with a slide; `04` states it slower on low mallet/pulse; `05` resolves it when authored |
| Silicon | **Relay motif** — muted two-note tick with a slight downward bend | `01` states it on a low-passed pulse; not a variation of the anatomy motif |
| Menu | **Home motif** — muted three-note rise ending on the 6th or 9th, with a slide | The hub's own identity; a damp welcome, not a shiny fanfare |

Rules:

- Keep the motif in the low/mid register, narrow and legato. It is a texture, not a hook, and not a heroic lead.
- State the motif two to four times per loop.
- Never put the motif in a frequency range that masks dialogue, scan, gate, or UI cues.
- The room theme is a variation on its cycle motif, not a new melody per room.
- **Harmony:** Dorian with minor 7ths, 9ths, and sus4. Use a brief IV major for the middle-section lift; no Phrygian, tritone, diminished, or semitone ostinato.
- **Rhythm:** swampy half-time, swung 16ths, bass slightly behind the beat, clear pulse. Keep the current BPMs.
- **Timbre:** wet organic foreground; low-passed triangle/pulse bass and noise ticks underneath; no bright chip lead.
- **Space:** close, pressurized, low-passed highs, short early reflections, light tape saturation. No long cavernous reverb.
- **Density:** sparse low-mid arrangement, three to five elements, clear centre for dialogue and UI cues.
- **Emotion:** gross-cute wonder, roughly 50/50 gross/cute. Dark is texture, not threat: not horror, not sad, not sunny.
- **Adventure:** pulse, groove, motif, and one subtle registral/IV-major lift. No fanfare, no triumphant cadence.
- **Hard bans:** heartbeat pulse, ticking clock/metronome alarm, tritone/diminished/semitone ostinato, dissonant string clusters, whispers/choir/breathy voices, jump-scare stingers, long cavernous reverb, music-box/nursery timbres. Low filtered sustain is allowed; continuous ominous drone is not.
- The menu theme is the only theme that may feel warmly domestic. Silicon is a grimy machine sibling: no organic textures, no water foley, no slime.

### 3.2 Global murk style

**`MURK_ANATOMY` — menu, `03`, `04`:**

```text
Wondrous small-scale sci-fi puzzle-adventure game music in a gross-cute murk palette: Dorian mode with minor 7ths, 9ths, and sus4; swampy half-time groove with swung 16ths and the bass slightly behind the beat; narrow legato motifs with portamento. Wet organic foreground — skin and membrane hand drums, water-drop percussion, muted marimba/kalimba, soft mallets, breathy pad — over a low-passed triangle/pulse bass and noise-channel ticks. Close, pressurized, low-passed production with short early reflections and light tape saturation; sparse low-mid arrangement with a clear centre for dialogue and UI cues. Dark, damp, biological, and muddy, but curious and gross-cute; not horror, not sad, not sunny, never epic.
```

**`MURK_SILICON` — `01`:**

```text
Wondrous small-scale sci-fi puzzle-adventure game music in a greasy-machine murk palette: Dorian/modal harmony with minor 7ths, 9ths, and sus4; swampy half-time groove with swung 16ths and a heavy, behind-the-beat pulse; narrow legato motifs with slight pitch bends. Dry machine foreground — relay clicks, servo whirr, oil/dust foley, low-passed noise — over low-passed pulse arpeggios, triangle bass, and small glitch stutters. Close, pressurized, low-passed production with short early reflections and light tape saturation; sparse low-mid arrangement with a clear centre for UI and scan cues. Grimy and oxidized, but curious and mission-driven; not horror, not sad, not sunny, never epic.
```

### 3.3 Global negative and tool routing

Use this shared core with any tool that exposes a negative prompt. Each theme card below provides the complete negative block already combined with its theme add-ons.

```text
vocals, lyrics, speech, singing, choir, intelligible words, horror, dread, jump scare, continuous ominous drone, minor-key ostinato, tritone, diminished chords, semitone ostinato, dissonant string clusters, whispers, breathy voices, music box, nursery timbre, heartbeat, ticking clock, alarm, screaming strings, gore, screams, pain, epic orchestra, cinematic bombast, heroic brass, triumphant fanfare, sunny major, bright chiptune lead, shiny arpeggios, EDM drop, dubstep, heavy metal, industrial grinding, generic NES imitation, thin toy-like chiptune, novelty 8-bit, bitcrushed vocals, long cavernous reverb, long reverb wash, clipping, distortion, low quality.
```

| Tool | Positive block | Negative block |
|---|---|---|
| **Ludo Music mode** | Theme Ludo block | **Do not paste** — Ludo has no negative field |
| **Stable Audio 2.5** | Theme Stable block | **Do not paste** — no negative prompt in the current API |
| **Stable Audio 3 Medium / tools with a negative field** | Theme Stable block | Paste the theme negative block |
| **Stable Audio 3 Small SFX** | Not for music | — |

Stable Audio 2.5 has no negative prompt in the current API. The Stable blocks below already include the production tail. If you rebuild one from the shared style, append this positive production suffix:

```text
Purely instrumental and wordless, seamless loop, close pressurized production, short early reflections, low-passed highs, clean loop seam, uncluttered mix with space for game sound effects.
```

Do not write a long “no horror / no vocals” list into Stable Audio 2.5. Negative phrasing can prime the very thing it forbids. Describe the adventure positively instead.

The negative block is intentionally broad. Keep `clipping`. For the Silicon glitch fill only, drop `distortion`; never drop `vocals`, `lyrics`, `speech`, `gore`, `horror`, `heartbeat`, `ticking clock`, `tritone`, `diminished chords`, `dissonant string clusters`, `music box`, `long cavernous reverb`, `bright chiptune lead`, `triumphant fanfare`, or `clipping`.

If a take reads as horror or thriller, reject it and rewrite the positive prompt. Do not try to fix it by adding more negatives.

### 3.4 Instrument palette and murk functions

| Theme | Core instruments | Avoid |
|---|---|---|
| Menu | **damp domestic murk:** muted marimba/electric piano, wet pipe ticks, soft hand-drum percussion, low washing-machine hum, low-passed triangle/pulse bass | bright chime, shiny arpeggios, sunny major, acoustic jazz kit, big band, generic NES, continuous ominous drone |
| 03 Nerve Forest | **wet biological discovery:** wet membrane hand drums, water-drop percussion, muted marimba/kalimba, breathy pad, portamento triangle bass, low-passed pulse | jungle drums, tribal percussion, horror strings, bright chip lead, heroic brass, low membrane drone |
| 04 Muscle Effector | **muddy work song:** low skin drums, soft wet hand-drum thumps, wooden click-clack, low tom, detuned triangle bass, short low-passed pulse stabs | heartbeat, ticking alarm, heavy metal, industrial grinding, heroic brass, bright chip lead |
| Silicon | **greasy oxidized machine:** relay clicks, servo whirr, oil/dust foley, dry noise, low-passed pulse arpeggios, triangle bass, glitch stutters | bright chiptune lead, shiny arpeggios, organic textures, water foley, slime, comedy robot voice |

---

## 4. Theme cards

**How to use a card**

- **Ludo:** Music mode, Loop on, duration set in the UI, no duration in the prompt, prompt expansion off if the UI/API offers it. Paste the Ludo block only; do not paste the negative block.
- **Stable Audio 2.5:** set duration to 60–75 s and trim to the loop; paste the Stable block only; do not paste the negative block. Use a fixed seed when comparing revisions.
- **Stable Audio 3 Medium / tools with a negative field:** paste the Stable block and the theme negative block.
- **Both:** generate 2–4 variations; keep the first that passes the loop, mix, murk, motif-shape, and blind-listen adventure checks. Reject any take that reads as horror, thriller, dread, bright/happy, or thin novelty chiptune.
- **Murk palette:** keep the assigned function — menu damp domestic, `03` wet biological, `04` muddy work song, `01` greasy machine. Do not let all four collapse into one generic bright palette.
- **BPM:** keep it in the prompt because it steers tempo; if the tool ignores it, adjust the result in post or regenerate.

**Copy-paste blocks.** Each Ludo and Stable Audio prompt is fenced and self-contained: theme, tempo, harmony, groove, motif instrument/recurrence, production, loop start, and emotional guardrail all live inside the block. Copy the contents of the block only; the labels outside the fence are not part of the prompt.

### 4.1 `audio.music.menu` — bathroom hub / main menu

- **Adventure role:** **invitation** — damp domestic murk; the lab at rest, a small expedition about to begin.
- **Scope:** bathroom hub, pack selection, mode selection, settings.
- **Length:** 45–60 s, seamless loop.
- **Tempo:** 104 BPM (range 100–108).
- **Structure:** 16-bar A (sparse) → 8-bar B (subtle registral lift + IV major) → 8-bar A return; loop on a bar boundary. No big intro, no final cadence.
- **Instruments:** muted marimba/electric piano, wet pipe ticks, soft hand-drum percussion, low washing-machine hum, low-passed triangle/pulse bass. Home motif on a muted mallet with a slide, ending on the 6th or 9th.
- **Mood:** damp domestic murk; warm but dim, safe but strange, gross-cute wonder. Not sunny, not cartoonish, not horror.
- **Visual counterpart:** the hub menu; music is background, never informational.

**Ludo — Music mode, Loop on, prompt expansion off:**

```text
Loopable gross-cute murk game music for a damp retro-futuristic laundry-lab menu in a wondrous sci-fi puzzle adventure, like the launchpad for a small expedition, 104 BPM. Dorian mode with minor 7ths, 9ths, and sus4; swampy half-time groove with swung 16ths and the bass slightly behind the beat. Wet organic foreground: muted marimba and electric piano, soft hand-drum percussion, wet pipe ticks, and a low washing-machine hum; state the home motif two to four times on a muted mallet: a three-note rise ending on the 6th or 9th, with a slide. A low-passed triangle/pulse bass and noise ticks sit underneath. A small registral lift with a brief IV major in the middle, then a muddy return. Close, pressurized, low-passed production with short early reflections and light tape saturation; sparse low-mid arrangement with a clear centre for menu sounds. Keep the lead soft, mid-register and low-passed; the chip layer stays under the bass and percussion. Start on the pulse and return to the opening groove for a seamless loop; the mood is curious, gross-cute wonder — strange, alive, and friendly. Purely instrumental and wordless, seamless loop.
```

**Stable Audio 2.5:**

```text
An instrumental gross-cute murk game menu loop for a damp retro-futuristic laundry-lab menu in a wondrous sci-fi puzzle adventure, like the launchpad for a small expedition, 104 BPM. Dorian mode with minor 7ths, 9ths, and sus4; swampy half-time groove with swung 16ths and the bass slightly behind the beat. Wet organic foreground: muted marimba and electric piano, soft hand-drum percussion, wet pipe ticks, and a low washing-machine hum; state the home motif two to four times on a muted mallet: a three-note rise ending on the 6th or 9th, with a slide. A low-passed triangle/pulse bass and noise ticks sit underneath. A sparse opening, a small registral lift with a brief IV major, then a muddy return. Close, pressurized, low-passed production with short early reflections and light tape saturation; sparse low-mid arrangement with a clear centre for menu sounds. Keep the lead soft, mid-register and low-passed; the chip layer stays under the bass and percussion. Start on the pulse and return to the opening groove for a seamless loop; the mood is curious, gross-cute wonder — strange, alive, and friendly. Seamless loop, purely instrumental and wordless.
```

**Negative — tools with a negative field:**

```text
vocals, lyrics, speech, singing, choir, intelligible words, horror, dread, jump scare, continuous ominous drone, minor-key ostinato, tritone, diminished chords, semitone ostinato, dissonant string clusters, whispers, breathy voices, music box, nursery timbre, heartbeat, ticking clock, alarm, screaming strings, gore, screams, pain, epic orchestra, cinematic bombast, heroic brass, triumphant fanfare, sunny major, bright chiptune lead, shiny arpeggios, EDM drop, dubstep, heavy metal, industrial grinding, acoustic jazz drum kit, big band, cartoon sitcom theme, generic NES imitation, thin toy-like chiptune, novelty 8-bit, bitcrushed vocals, long cavernous reverb, long reverb wash, clipping, distortion, low quality.
```

**Accept:**

- Reads as damp domestic murk and gross-cute wonder, not sunny or horror.
- Wet organic foreground over a low-passed chip low end; no bright chip lead.
- Home motif is narrow, muted, and ends open on the 6th or 9th.
- Loops across three consecutive plays without a seam or a reset in energy.
- Sits under the hub click/door/spin/shrink/arrive cues at 0.35 music gain.
- No vocals; no melody that competes with menu text.
- ≤ 1.5 MB; 48 kHz stereo; 45–60 s.

**Reject:**

- A bright chime, shiny arpeggio, or sunny major theme.
- A heartbeat, ticking clock, tritone, dissonant strings, or music-box creepiness.
- A cartoonish or sitcom theme.
- A loud lead that masks the UI click.
- A loop that audibly restarts.

### 4.2 `audio.music.nerve_forest` — `03-nerve-forest`

- **Adventure role:** **discovery** — a slow, wet expedition through a living landscape; gross-cute wonder, not danger.
- **Scope:** Node Run, threshold/all-or-none, neuron structure, sensory/motor pathways.
- **Length:** 30–45 s, seamless loop.
- **Tempo:** 100 BPM (range 92–104).
- **Structure:** 8-bar pulse A → 8-bar lift B → 8-bar A return; loop. Keep the lift subtle; the puzzle should stay readable.
- **Instruments:** wet membrane hand drums, water-drop percussion, muted marimba/kalimba, breathy pad, portamento triangle bass, low-passed pulse. Signal motif on muted marimba/kalimba with a slide.
- **Mood:** wet biological discovery; dark, damp, biological, gross-cute; wonder around the next bend, not danger or jungle adventure.
- **Visual counterpart:** the living nerve forest, amber signal path, membrane folds.

**Ludo — Music mode, Loop on, prompt expansion off:**

```text
Loopable gross-cute murk game music for a slow, wet expedition through a living nerve forest in a wondrous sci-fi puzzle adventure, 100 BPM. Dorian mode with minor 7ths, 9ths, and sus4; swampy half-time groove with swung 16ths and the bass slightly behind the beat. Wet organic foreground: wet membrane hand drums, soft water-drop percussion, muted marimba and kalimba, and a breathy pad; state the signal motif two to four times on muted marimba and kalimba: root–minor third–perfect fourth, with a slide into the third, ending open. A portamento triangle bass and low-passed pulse sit underneath. A small registral lift with a brief IV major in the middle, then a muddy return. Close, pressurized, low-passed production with short early reflections and light tape saturation; sparse low-mid arrangement with a clear centre for dialogue and scan cues. Keep the lead soft, mid-register and low-passed; the chip layer stays under the bass and percussion. Start on the pulse and return to the opening groove for a seamless loop; the mood is curious, gross-cute wonder — strange, wet, and friendly. Purely instrumental and wordless, seamless loop.
```

**Stable Audio 2.5:**

```text
An instrumental gross-cute murk game loop for a slow, wet expedition through a living nerve forest in a wondrous sci-fi puzzle adventure, 100 BPM. Dorian mode with minor 7ths, 9ths, and sus4; swampy half-time groove with swung 16ths and the bass slightly behind the beat. Wet organic foreground: wet membrane hand drums, soft water-drop percussion, muted marimba and kalimba, and a breathy pad; state the signal motif two to four times on muted marimba and kalimba: root–minor third–perfect fourth, with a slide into the third, ending open. A portamento triangle bass and low-passed pulse sit underneath. A small registral lift with a brief IV major, then a muddy return. Close, pressurized, low-passed production with short early reflections and light tape saturation; sparse low-mid arrangement with a clear centre for dialogue and scan cues. Keep the lead soft, mid-register and low-passed; the chip layer stays under the bass and percussion. Start on the pulse and return to the opening groove for a seamless loop; the mood is curious, gross-cute wonder — strange, wet, and friendly. Seamless loop, purely instrumental and wordless.
```

**Negative — tools with a negative field:**

```text
vocals, lyrics, speech, singing, choir, intelligible words, horror, dread, jump scare, continuous ominous drone, low membrane drone, minor-key ostinato, tritone, diminished chords, semitone ostinato, dissonant string clusters, whispers, breathy voices, music box, nursery timbre, heartbeat, ticking clock, alarm, screaming strings, gore, screams, pain, epic orchestra, cinematic bombast, heroic brass, triumphant fanfare, sunny major, bright chiptune lead, shiny arpeggios, EDM drop, dubstep, heavy metal, industrial grinding, jungle drums, tribal percussion, generic NES imitation, thin toy-like chiptune, novelty 8-bit, bitcrushed vocals, long cavernous reverb, long reverb wash, clipping, distortion, low quality.
```

**Accept:**

- Reads as wet biological discovery and gross-cute wonder, not a jungle or horror level.
- Wet organic foreground over a low-passed chip low end; no bright chip lead.
- Signal motif is narrow, legato, slides into the minor third, and ends open.
- The motif is present but does not mask dialogue or scan cues.
- No sudden stingers or drops; the loop is safe to sit under a puzzle.
- ≤ 1.5 MB; 48 kHz stereo; 30–45 s.

**Reject:**

- Tribal/jungle drums.
- Horror strings, low drone, heartbeat, or a jump-scare stinger.
- A bright chip lead or a heroic/epic fanfare.
- A long cavernous reverb that smears the loop seam.

### 4.3 `audio.music.muscle_effector` — `04-muscle-effector`

- **Adventure role:** **teamwork** — a muddy biological work song; effort with a smile, a small hard-won step, not a fanfare.
- **Scope:** Endplate Ferry, Ca²⁺/ACh, receptor binding, muscle contraction.
- **Length:** 30–45 s, seamless loop.
- **Tempo:** 110 BPM (range 100–116).
- **Structure:** 8-bar effort A → 8-bar lift B (subtle registral lift + IV major) → 8-bar release/return A; loop. The release should resolve without ending the loop.
- **Instruments:** low skin drums, soft wet hand-drum thumps, wooden click-clack, low tom, detuned triangle bass, short low-passed pulse stabs. Signal motif slower on low mallet/pulse.
- **Mood:** muddy, biological, effortful but not triumphant; gross-cute wonder, a small team pulling together. Not aggressive, not metallic, not ominous, not sunny.
- **Visual counterpart:** muscle endplate, ACh ferry, receptor, contraction gate.

**Ludo — Music mode, Loop on, prompt expansion off:**

```text
Loopable gross-cute murk game music for a muddy biological muscle workshop in a wondrous sci-fi puzzle adventure, 110 BPM. Dorian mode with minor 7ths, 9ths, and sus4; swampy half-time groove with swung 16ths and the bass slightly behind the beat. Wet organic foreground: low skin drums, soft wet hand-drum thumps, wooden click-clack, and a low tom; state the signal motif two to four times on a muted low mallet: root–minor third–perfect fourth, with a slide into the third, slower and sturdier, ending open. A detuned triangle bass and short low-passed pulse stabs sit underneath. A small registral lift with a brief IV major in the middle, then a muddy return. Close, pressurized, low-passed production with short early reflections and light tape saturation; sparse low-mid arrangement with a clear centre for jump, land and dash cues. Keep the lead soft, mid-register and low-passed; the chip layer stays under the bass and percussion. Start on the pulse and return to the opening groove for a seamless loop; the mood is curious, gross-cute wonder — strange, muddy, and friendly. Purely instrumental and wordless, seamless loop.
```

**Stable Audio 2.5:**

```text
An instrumental gross-cute murk game loop for a muddy biological muscle workshop in a wondrous sci-fi puzzle adventure, 110 BPM. Dorian mode with minor 7ths, 9ths, and sus4; swampy half-time groove with swung 16ths and the bass slightly behind the beat. Wet organic foreground: low skin drums, soft wet hand-drum thumps, wooden click-clack, and a low tom; state the signal motif two to four times on a muted low mallet: root–minor third–perfect fourth, with a slide into the third, slower and sturdier, ending open. A detuned triangle bass and short low-passed pulse stabs sit underneath. A small registral lift with a brief IV major, then a muddy return. Close, pressurized, low-passed production with short early reflections and light tape saturation; sparse low-mid arrangement with a clear centre for jump, land and dash cues. Keep the lead soft, mid-register and low-passed; the chip layer stays under the bass and percussion. Start on the pulse and return to the opening groove for a seamless loop; the mood is curious, gross-cute wonder — strange, muddy, and friendly. Seamless loop, purely instrumental and wordless.
```

**Negative — tools with a negative field:**

```text
vocals, lyrics, speech, singing, choir, intelligible words, horror, dread, jump scare, thriller, continuous ominous drone, minor-key ostinato, tritone, diminished chords, semitone ostinato, dissonant string clusters, whispers, breathy voices, music box, nursery timbre, heartbeat, ticking clock, ticking alarm, alarm, screaming strings, gore, blood, screams, pain, grunts, heavy metal, industrial grinding, metal impacts, epic orchestra, cinematic bombast, heroic brass, triumphant fanfare, sunny major, bright chiptune lead, shiny arpeggios, EDM drop, dubstep, generic NES imitation, thin toy-like chiptune, novelty 8-bit, bitcrushed vocals, long cavernous reverb, long reverb wash, clipping, distortion, low quality.
```

**Accept:**

- Reads as a muddy biological work song and gross-cute wonder, not a thriller or a happy march.
- Wet organic foreground over a low-passed chip low end; no bright chip lead.
- Signal motif is slower, sturdier, slides into the minor third, and ends open.
- The low end does not mask jump/land/dash cues.
- Distinct from `03`; the shared motif is slower and muddier, not darker.
- ≤ 1.5 MB; 48 kHz stereo; 30–45 s.

**Reject:**

- Horror/thriller: heartbeat, ticking alarm, low drone, dissonant strings.
- Heavy metal or industrial grinding.
- Pain grunts, screams, or gore.
- Bright chip lead, heroic brass, or a triumphant cadence.
- A generic action loop.

### 4.4 `audio.music.interrupt_loop` — `01-interrupt-loop` (Silicon)

- **Adventure role:** **mission** — a tiny robot's greasy relay race.
- **Scope:** sensor → interrupt controller → CPU → actuator; transfer gate.
- **Length:** 30–45 s, seamless loop.
- **Tempo:** 116 BPM (range 110–124).
- **Structure:** 8-bar machine pulse A → 4-bar glitch fill → 8-bar B → 8-bar A return; loop. The glitch fill is a texture, not a drop.
- **Instruments:** relay clicks, servo whirr, oil/dust foley, dry noise, low-passed pulse arpeggios, triangle bass, glitch stutters. Relay motif is a muted two-note tick with a slight downward bend.
- **Mood:** greasy oxidized machine; grimy, patient, mission-driven, gross-cute machine. Not horror, not sunny, not severe.
- **Visual counterpart:** graphite/cyan board, relay, sockets, CPU wake, actuator.

**Ludo — Music mode, Loop on, prompt expansion off:**

```text
Loopable greasy-machine murk game music for a tiny robot on a circuit-board mission in a wondrous sci-fi puzzle adventure, 116 BPM, like a slow, sticky relay race. Dorian/modal harmony with minor 7ths, 9ths, and sus4; swampy half-time groove with swung 16ths and a heavy, behind-the-beat pulse. Dry machine foreground: relay clicks, servo whirr, oil/dust foley, low-passed noise; state the relay motif two to four times on a low-passed pulse: a muted two-note tick with a slight downward bend, woven into the rhythm. Low-passed pulse arpeggios, triangle bass, and small glitch stutters sit underneath. A small registral lift with a brief IV major, then a greasy return. Close, pressurized, low-passed production with short early reflections and light tape saturation; sparse low-mid arrangement with a clear centre for UI and scan cues. Keep the lead soft, mid-register and low-passed; the chip layer stays under the bass and percussion. Start on the pulse and return to the opening groove for a seamless loop; the mood is curious, gross-cute machine wonder — strange, grimy, and friendly-machine. Purely instrumental and wordless, seamless loop.
```

**Stable Audio 2.5:**

```text
An instrumental greasy-machine murk game loop for a tiny robot's journey across a graphite circuit board in a wondrous sci-fi puzzle adventure, 116 BPM, like a slow, sticky relay race. Dorian/modal harmony with minor 7ths, 9ths, and sus4; swampy half-time groove with swung 16ths and a heavy, behind-the-beat pulse. Dry machine foreground: relay clicks, servo whirr, oil/dust foley, low-passed noise; state the relay motif two to four times on a low-passed pulse: a muted two-note tick with a slight downward bend, woven into the rhythm. Low-passed pulse arpeggios, triangle bass, and small glitch stutters sit underneath. A small registral lift with a brief IV major, then a greasy return. Close, pressurized, low-passed production with short early reflections and light tape saturation; sparse low-mid arrangement with a clear centre for UI and scan cues. Keep the lead soft, mid-register and low-passed; the chip layer stays under the bass and percussion. Start on the pulse and return to the opening groove for a seamless loop; the mood is curious, gross-cute machine wonder — strange, grimy, and friendly-machine. Seamless loop, purely instrumental and wordless.
```

**Negative — tools with a negative field:**

```text
vocals, lyrics, speech, singing, choir, intelligible words, horror, dread, jump scare, continuous ominous drone, minor-key ostinato, tritone, diminished chords, semitone ostinato, dissonant string clusters, whispers, breathy voices, music box, nursery timbre, heartbeat, ticking clock, alarm, screaming strings, gore, screams, epic orchestra, cinematic bombast, heroic brass, triumphant fanfare, sunny major, bright chiptune lead, shiny arpeggios, EDM drop, dubstep, heavy metal, industrial grinding, warm analog pads, organic textures, water foley, slime, comedy robot voice, vocoder, long cavernous reverb, long reverb wash, clipping, low quality.
```

**Accept:**

- Reads as a greasy oxidized machine mission and gross-cute wonder, not a generic NES imitation or a horror level.
- Dry machine foreground over a low-passed chip low end; no bright chip lead.
- Relay motif is a muted two-note tick with a slight downward bend.
- Clicks are crisp but not piercing; they do not mask the SFX cues.
- Distinct from the anatomy themes; no water, slime, or organic foley.
- Forward motion, light glitch fill, greasy return.
- ≤ 1.5 MB; 48 kHz stereo; 30–45 s.

**Reject:**

- A generic NES imitation, bright chiptune lead, or thin toy-like chiptune.
- Warm analog pads, organic textures, water foley, or slime.
- An ominous drone or tension.
- A comedy robot voice or vocoder.
- A drop or a big cinematic ending.

---

## 5. Future room template

Do not generate these until the room is authored. Use the anatomy "signal" motif (root → minor 3rd → perfect 4th, slide into the 3rd) and the gross-cute murk palette as the base.

| Future room | Adventure role and direction | Tempo | Length |
|---|---|---:|---:|
| `01-bone-gate` | **Trailhead:** sparse murk trailhead, bone percussion, low triangle sine, signal motif stated quietly on a muted mallet; chalky, damp, open, curious; a sense of entering a cave, not dread | 90–100 BPM | 30–45 s |
| `02-joint-chamber` | **Glide:** fluid murk glide, wet mallet, low-passed pulse, slow triangle pulse, signal motif stretched; slippery, calm, wondrous | 88–100 BPM | 30–45 s |
| `05-reflex-core` | **Small resolution:** full murk resolution of the signal motif, confident and warm; the adventure arc completes; still no fanfare | 104–112 BPM | 45–60 s |

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
| Prompt | Paste the assembled Ludo block from the theme card; no duration in the text, no negative list |
| Duration | Set in the UI; at least the target loop length. If the UI caps below 45 s, generate the longest section and assemble/loop in a DAW. |
| Loop | On for every theme |
| Output | MP3 |
| Cost | Record the actual credit cost; music may differ from the 2-credit SFX rate |
| Prompt expansion | **Off** for this pack if the UI/API offers it; expansion tends to add vocals, pop structure, or epic strings |
| Variations | 2–4; use Remix for a variation after a clear direction is chosen |

Ludo-specific rules:

- Do not write "45 seconds" in the prompt; set the duration in the UI.
- Do not paste the negative block; Ludo has no negative field. The Ludo block is already positively framed for adventure.
- Do not use "8-bit" or "chiptune" as the style label. Say "gross-cute murk", "Dorian", "swampy half-time", "wet organic foreground", and "low-passed chip low end".
- Ludo may brighten the harmony, add a shiny chip lead, or turn it into generic chiptune. Reject it if it is bright, happy, thin, toy-like, or if all four themes sound like the same console.
- Ask for a seamless loop, but verify it. A generated "song" may still have an intro/outro; edit to a bar-aligned loop in a DAW.
- Do not use a vocal mode. Music mode only.
- If prompt expansion adds vocals, epic strings, a pop structure, or a horror mood, reject the take or remix with expansion off.
- Ludo returns MP3; resample to 48 kHz if needed.

### 6.2 Stability AI — Stable Audio 2.5

| Setting | Value |
|---|---|
| Model | `stable-audio-2.5` (music-focused) |
| Duration | 1–190 s; generate 60–75 s and trim to the loop |
| Negative prompt | **Not exposed in the current API.** Use the Stable block as-is; do not append a long negative list |
| Prompt expansion | Not the primary control; use the detailed Stable block |
| Output | Confirm the provider; commonly 44.1 kHz stereo. Resample to 48 kHz. |
| Licence | Stability AI Community License; commercial use may require a separate licence |

Stable-specific rules:

- Generate longer than the target loop, then trim to a bar-aligned section.
- Do not paste the negative block into Stable Audio 2.5. “No horror / no vocals” lists can prime the very qualities they forbid; the Stable block is already positively framed.
- If Stable brightens or thins the palette, add wet organic foreground (muted mallets, skin/membrane percussion) and a low-passed triangle bass. Do not add more “8-bit”.
- Use audio-to-audio to derive `04` from `03` at a moderate strength (roughly 0.35–0.55) while preserving the signal motif. `04` should be slower, sturdier, and muddier — not more horror-like. It must stay a muddy work song, not drift toward Silicon's dry machine palette.
- Use inpainting to fix a bad loop seam or a final cadence.
- Use a fixed seed when comparing prompt revisions.
- Stable Audio 3 Medium supports a negative prompt. Use the Stable block plus the theme negative block there.
- Stable Audio 3 Small SFX is for one-shots, not music. If you need another music model, use Stable Audio 2.5 or Stable Audio 3 Medium.

### 6.3 Remix and variation workflow

1. Generate the **menu theme** first as the production/style anchor (P0). It must read as a damp domestic murk invitation to a small expedition.
2. Generate **`03-nerve-forest`** as the anatomy motif anchor (P0). It must read as wet biological discovery, not jungle or horror.
3. Generate **`04-muscle-effector`** as a variation of `03`: same signal motif, slower and sturdier muddy work-song instrumentation. Use Ludo Remix or Stable Audio 2.5 audio-to-audio; do not start from scratch unless the remix loses the motif. Do not make it more horror-like or heavier; keep it muddy and gross-cute.
4. Generate **`01-interrupt-loop`** last and independently. Do not remix the anatomy theme; Silicon must be the greasy machine sibling, not a recolour and not a severe one.
5. Keep the four murk functions distinct: menu damp domestic, `03` wet biological, `04` muddy work song, `01` greasy machine. Do not let one generic bright palette swallow all four.
6. If the menu and `03` feel like different games, revise the menu's instrument palette rather than the motif.
7. Blind-listen every theme with the screen off. If it reads as horror, thriller, dread, sadness, bright/happy, or thin novelty chiptune, reject it and rewrite the positive prompt.

### 6.4 Seeds, variations, and retries

- Generate 2–4 variations per theme.
- Keep the first that passes the loop, mix, identity, murk, motif-shape, and blind-listen adventure checks.
- Maximum two prompt revisions before changing tool or accepting a placeholder.
- Before generating, read only the fenced prompt. If it does not contain the motif instrument/recurrence, lead rule, start-on-pulse, and friendly framing, fix the block — not the card metadata.
- If a take reads as horror, do not add more negatives; rewrite the positive harmony, pulse, and instrumentation.
- If a take is bright/happy, reduce high sparkle and major colours. If it is thin, add wet organic foreground and a low-passed low end. Do not just add more “8-bit”.
- Record model, seed, duration, BPM, loop points, post-processing, murk check, motif shape, adventure check, and licence.
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
| 1 | Menu theme (P0) | Reads as damp domestic murk and gross-cute wonder, not bright/happy or horror/sitcom; loops three times; sits under hub cues; no vocals; approved at 0.35 gain |
| 2 | `03-nerve-forest` (P0) | Signal motif reads on muted marimba/kalimba in the wet biological palette; gross-cute discovery, no horror/jungle clichés; supports puzzle concentration |
| 3 | `04-muscle-effector` (P1) | Same motif, slower and sturdier in the muddy work-song palette; effortful but not triumphant or thriller; distinct from 03; low end does not mask jump/land |
| 4 | `01-interrupt-loop` (P1/P2) | Greasy machine mission; low-passed chip, not bright generic NES and no horror drone; distinct from anatomy |
| 5 | Integration | Room/hub transitions, mute, volume, pause, crossfade, licences |

Do not generate all four before the menu/03 pilot passes. The menu is the production anchor; 03 is the anatomy motif anchor. If either pilot reads as bright/happy, horror, or thin novelty chiptune, stop and rewrite the positive prompt before generating the rest.

---

## 9. Post-processing and loop QA

1. Trim to a bar-aligned loop.
2. Resample to 48 kHz stereo.
3. Remove DC offset; high-pass only if it does not remove intended sub-bass.
4. Normalise to −18 to −16 LUFS; true peak ≤ −1 dBTP.
5. Encode to OGG Vorbis q4–q6 (or MP3 fallback).
6. Check the loop seam in an audio editor at sample level.
7. Play three consecutive loops in the browser.
8. Blind-listen with the screen off. The theme must read as **gross-cute murk** — dark, wet, muddy, biological, curious — not horror, thriller, dread, sadness, bright/happy, or thin novelty chiptune. If it fails, reject it and rewrite the positive prompt.
9. A/B the theme under the room's SFX cues at 0.35 music gain.
10. Check the crossfade into and out of the room.
11. Record the prompt, model, seed, duration, BPM, loop points, post-processing, murk check, motif shape, adventure check, and licence.

### Per-theme acceptance

- [ ] File exists at the exact path; manifest `src` matches.
- [ ] 48 kHz stereo; OGG/MP3; ≤ 1.5 MB.
- [ ] 30–45 s room / 45–60 s menu.
- [ ] Seamless loop; three-loop check passes.
- [ ] −18 to −16 LUFS; true peak ≤ −1 dBTP.
- [ ] No vocals, lyrics, speech, or gore.
- [ ] Fenced prompt is self-contained: theme, tempo, harmony, groove, motif instrument/recurrence, lead rule, start-on-pulse, friendly framing, production, and loop all live inside the block.
- [ ] Reads as **gross-cute murk**, not horror, thriller, dread, sadness, or bright/happy (blind-listen check).
- [ ] No horror signifiers: continuous ominous drone, heartbeat, ticking clock, tritone, diminished chords, semitone ostinato, dissonant strings, whispers, music box, long cavernous reverb.
- [ ] Positive murk markers: Dorian with minor 7ths/9ths/sus4, swampy half-time, low-passed chip low end, narrow legato motif.
- [ ] Motif shape matches the theme: menu rise ending on 6th/9th; anatomy root–minor 3rd–perfect 4th with slide; Silicon two-note tick with downward bend.
- [ ] Wet organic foreground on menu/`03`/`04`, or dry machine foreground on `01`; no bright chip lead.
- [ ] Full-bodied; not thin, toy-like, or a generic NES imitation.
- [ ] Uses the assigned function (menu damp domestic, `03` wet biological, `04` muddy work song, `01` greasy machine).
- [ ] Highs are softened and the arrangement has a clear centre; it does not mask SFX.
- [ ] Motif present but not masking SFX.
- [ ] Reads as the intended room/menu identity.
- [ ] Distinct from the other themes.
- [ ] Licence and prompt-log rows complete.

### Global acceptance

- [ ] Menu + 03 + 04 + Silicon themes approved, or a recorded placeholder decision.
- [ ] All four themes pass the blind-listen adventure test: dark, wet, muddy, biological, gross-cute, curious, forward-moving; not horror, thriller, dread, sad, bright/happy, epic, or thin novelty chiptune.
- [ ] All four themes pass the murk-function test: menu damp domestic, `03` wet biological, `04` muddy work song, `01` greasy machine; no shared generic bright palette.
- [ ] Menu/`03`/`04` carry a wet organic foreground; `01` carries a dry machine foreground. No bright chip lead in any theme.
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

| Asset ID | Tool / model | Seed | Length | BPM | Loop points | Chosen file | Post-processing | Murk / motif check | Verdict | Licence |
|---|---|---|---:|---:|---|---|---|---|---|---|
| `audio.music.menu` | | | | | | | | | | |
| `audio.music.nerve_forest` | | | | | | | | | | |
| `audio.music.muscle_effector` | | | | | | | | | | |
| `audio.music.interrupt_loop` | | | | | | | | | | |

**Minimum fields:** prompt version, asset ID, tool/plan, model/seed, duration, BPM, loop points, variations, chosen file, post-processing, runtime check, murk check (dark/wet/muddy vs bright/happy), motif shape (menu 6th/9th rise; anatomy root–minor 3rd–perfect 4th slide; Silicon downward tick), adventure check (gross-cute wonder vs horror), verdict, licence, notes.

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
| 2026-11-03 | Adventure-tone rewrite (`audio-themes-2026-11-03.2`): anchored the direction to `DESIGN.md` “wondrous sci-fi puzzle adventure; warm and wry”; added adventure roles (invitation, discovery, teamwork, mission); replaced `warm-dark`, `tense`, `mysterious`, drone, heartbeat, ticking-timer, low-brass, and wet-membrane language with bright harmony, rising motifs, playful percussion, and forward motion; fully assembled Ludo and Stable Audio 2.5 prompts; complete per-theme negative blocks; added the blind-listen adventure check and removed the old “adventure is the reject reason” wording. |
| 2026-11-03 | Retro-hybrid revision (`audio-themes-2026-11-03.3`): added a retro chip-adventure palette with four distinct chip dialects — warm 16-bit menu, airy 16-bit `03`, sturdy 16-bit `04`, crisp 8-bit Silicon. Added pulse-wave, triangle-bass, noise-channel, and arpeggio instrumentation; removed the old chiptune/8-bit negative bans and replaced them with generic-NES, thin-toy, novelty-8-bit, and bitcrushed-vocal guards; kept the warm sampled/organic low end, adventure roles, and horror/epic rejections; added retro-dialect acceptance and prompt-log fields. |
| 2026-11-04 | Gross-cute murk revision (`audio-themes-2026-11-04.1`): replaced the bright retro surface with a dark, wet, muddy, biological palette. Added Dorian with minor 7ths/9ths/sus4; swampy half-time grooves with swung 16ths; a wet organic foreground over a low-passed chip low end; narrow legato motifs with portamento (menu rise ending 6th/9th, anatomy root–minor 3rd–perfect 4th, Silicon downward tick); close/pressurized production; and a hard-ban list for horror signifiers. Kept the four adventure roles and the gross-cute wonder tone; added murk/motif acceptance and prompt-log fields. |
| 2026-11-04 | Prompt self-containment pass (`audio-themes-2026-11-04.2`): added the motif instrument and “state it two to four times” to every fenced prompt; added the positive lead rule (“soft, mid-register and low-passed; chip layer under the bass and percussion”); added “start on the pulse” and return-to-opening-groove loop language; added per-theme friendly/gross-cute framing (menu alive, `03` wet, `04` muddy, `01` grimy/friendly-machine); added a prompt self-containment acceptance checkbox and a pre-generation check. |
