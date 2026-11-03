# Room and Menu Audio Themes — Requirements and Generation Prompts

> **Status:** Proposed extension · adventure-tone revision · biological cyberpunk + tempo revision · 4 November 2026  
> **Owner:** Snorre  
> **Scope:** Four loopable themes — bathroom hub/menu, `03-nerve-forest`, `04-muscle-effector`, `01-interrupt-loop`  
> **Prompt version:** `audio-themes-2026-11-04.4`  
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

**Tone anchor (2026-11-03).** `DESIGN.md` defines the game as a *wondrous sci-fi puzzle adventure; warm and wry*. In this document, **adventurous** means curious, gross-cute, quirky, forward-moving, and small-scale. It does not mean epic, heroic, or sunny. The four themes are siblings in that adventure: the menu is the **invitation**, `03` is **discovery**, `04` is **teamwork**, and Silicon is **mission**. None is horror or thriller scoring.

**Biological cyberpunk + tempo revision (2026-11-04).** The score uses one shared *The Binding of Isaac*-like dungeon palette: **minor-key, simple triads, plodding or mid-tempo 4/4, slightly detuned piano/organ/mallets, dirty bass, simple drums, short repeating motifs, and dirty lo-fi production.** A **biological cyberpunk** surface adds detuned synth pulses, circuit hum, radio static, relay/servo ticks, and small glitch stutters. The anatomy rooms stay wet and organic; Silicon is dry machine. The cyberpunk is biomechanical grime, not neon synthwave. Detuned timbres and chromatic passing notes are allowed; horror signifiers and bright chip leads are not.

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
| Tone | **Wondrous sci-fi puzzle adventure / biological cyberpunk dungeon**; gross-cute, curious, dirty, lo-fi; not horror, synthwave, sunny, or epic |
| Palette | **Biological cyberpunk dungeon** — minor-key, plodding/mid-tempo 4/4, detuned piano/mallets, dirty bass, simple drums, synth/radio/relay textures, short repeating motifs; dirty, warm, close, lo-fi |
| Tempo | Menu **112**; `03` **104**; `04` **110**; `01` **116** BPM |
| Licensing | Ludo Music (paid) or Stable Audio 2.5; log every theme |

---

## 2. Scope contract

### 2.1 In scope

| Scope | Asset ID | File | Length | Tempo | Priority |
|---|---|---|---:|---:|---:|
| Menu / bathroom hub | `audio.music.menu` | `public/hub/bathroom/shared/audio/theme-menu.ogg` | 45–60 s | 108–116 BPM (112) | P0 |
| `03-nerve-forest` | `audio.music.nerve_forest` | `public/packs/anatomy-reflex/shared/audio/theme-nerve-forest.ogg` | 30–45 s | 100–108 BPM (104) | P0 |
| `04-muscle-effector` | `audio.music.muscle_effector` | `public/packs/anatomy-reflex/shared/audio/theme-muscle-effector.ogg` | 30–45 s | 108–116 BPM (110) | P1 |
| `01-interrupt-loop` | `audio.music.interrupt_loop` | `public/packs/silicon-reflex/shared/audio/theme-interrupt-loop.ogg` | 30–45 s | 112–120 BPM (116) | P1/P2 |

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

### 3.1 Shared identity and adventure roles

The four themes are siblings in one **wondrous sci-fi puzzle adventure**. They share one **biological cyberpunk dungeon** palette, with room-specific emphasis:

| Theme | Adventure role | Room emphasis | Cyberpunk layer | Feel |
|---|---|---|---|---|
| Menu | **Invitation** | Damp domestic dungeon; muted piano/marimba, dirty bass, simple hand drums, wet pipe ticks | Low detuned synth pulse, circuit hum | Mid-tempo 4/4 with a light forward push |
| `03-nerve-forest` | **Discovery** | Wet nerve forest; muted marimba/kalimba, dirty bass, simple hand drums, water-drop percussion | Low synth pulse, radio static | Plodding 4/4 |
| `04-muscle-effector` | **Teamwork** | Muddy muscle workshop; dirty bass, low drums, wet hand-drum thumps, wooden click-clack | Servo/relay ticks | Plodding 4/4, heavier |
| `01-interrupt-loop` | **Mission** | Greasy machine; dirty pulse bass, relay clicks, servo whirr, dry noise | Radio static, small glitch stutters | Mid-tempo 4/4 with a mechanical forward push |

**Motifs**

- **Anatomy signal motif:** a short repeating three-note minor-key figure. `03` and `04` share it; `04` plays it slower and heavier.
- **Silicon relay motif:** a repeating two-note tick with a slight downward bend.
- **Menu home motif:** a short repeating three-note minor-key figure, warm and unresolved.

Rules:

- **One palette, four emphases.** Do not give each room a different harmonic system.
- **Harmony:** minor-key, simple triads, chromatic passing notes allowed. No jazz extensions (minor 7ths/9ths/sus4), no tritone or diminished main motif.
- **Rhythm:** rooms use plodding 4/4; the menu uses mid-tempo 4/4 with a light forward push; Silicon uses mid-tempo 4/4 with a mechanical forward push. Not half-time, not swung 16ths.
- **Timbre:** slightly detuned piano/organ/mallets, dirty bass, simple drums, weird/wet percussion. Add detuned synth pulses, circuit hum, radio static, relay/servo ticks, and small glitch stutters as texture — not as a lead, except in Silicon.
- **Production:** dirty, warm, close, small-room, lightly saturated. Not clean or cavernous.
- **Motif:** short, repeating, two to four notes, low/mid register, texture not lead. State it two to four times per loop.
- **Tone:** gross-cute, curious, friendly; dark but not horror.
- **Adventure:** plodding or mid-tempo groove, simple motif, one small lift. No fanfare, no triumphant cadence.
- **Hard bans:** heartbeat pulse, ticking clock/metronome, jump-scare stingers, horror strings, whispers/choir, music-box/nursery timbres, long cavernous reverb, epic/orchestral bombast, bright chip leads, synthwave, neon arpeggios, gated 80s drums, big saw leads, EDM, dark techno, industrial metal. Detuned timbres and chromatic passing notes are allowed; no tritone or diminished main motif, no minor-2nd ostinato.
- The menu theme is the only theme that may feel warmly domestic. Silicon is a dry machine sibling: no water foley, no organic textures, no slime.
- **Biological cyberpunk means biomechanical grime, not neon synthwave.** The word may appear once in a prompt; after that, specify concrete sounds.

**Reference note.** The touchstone is *The Binding of Isaac*: the simple minor-key motifs and plodding groove of the original soundtrack, with the dirtier, organic texture of the Rebirth/Ridiculon score. The cyberpunk layer should feel like flesh and chrome, not neon. Keep the title out of the prompts; the descriptive palette carries it.

### 3.2 Shared biological cyberpunk style

**`BIOCYBER_MENU` — menu:**

```text
Loopable dark, quirky domestic biological-cyberpunk dungeon game music: minor-key with simple triads, mid-tempo 4/4 with a light forward push, slightly detuned piano/marimba, dirty bass, simple hand drums, wet pipe ticks, a low detuned synth pulse, circuit hum, and a short repeating three-note motif. Dirty, warm, lo-fi and close, with a gross-cute, curious edge. Instrumental; start on the pulse, seamless loop.
```

**`BIOCYBER_ROOMS` — `03`, `04`:**

```text
Loopable dark, quirky biological-cyberpunk dungeon game music: minor-key with simple triads, plodding 4/4, slightly detuned piano/organ and mallets, dirty bass, simple drums, water-drop or wet hand-drum percussion, a low synth pulse, radio static or servo ticks, and a short repeating motif. Dirty, warm, lo-fi and close, with a gross-cute, curious edge. Instrumental; start on the pulse, seamless loop.
```

**`BIOCYBER_MACHINE` — `01`:**

```text
Loopable dark, quirky machine-cyberpunk dungeon game music: minor-key with simple triads, mid-tempo 4/4 with a mechanical forward push, slightly detuned pulse synth, dirty bass, relay clicks, servo whirr, radio static, dry noise, and a short repeating two-note motif. Dirty, warm, lo-fi and close, with a gross-cute, curious machine edge. Instrumental; start on the pulse, seamless loop.
```

### 3.3 Global negative and tool routing

Use this shared core with any tool that exposes a negative prompt. Each theme card below provides the complete negative block already combined with its theme add-ons.

```text
vocals, lyrics, speech, singing, choir, intelligible words, horror, dread, jump scare, continuous ominous drone, heartbeat, ticking clock, alarm, tritone, diminished chords, minor-2nd ostinato, dissonant string clusters, whispers, breathy voices, music box, nursery timbre, gore, screams, pain, epic orchestra, cinematic bombast, heroic brass, triumphant fanfare, sunny major, bright chiptune lead, shiny arpeggios, synthwave, neon arpeggios, gated 80s drums, big saw leads, EDM drop, dubstep, dark techno, heavy metal, industrial metal, industrial grinding, generic NES imitation, thin toy-like chiptune, novelty 8-bit, bitcrushed vocals, long cavernous reverb, long reverb wash, clipping, low quality.
```

| Tool | Positive block | Negative block |
|---|---|---|
| **Ludo Music mode** | Theme Ludo block | **Do not paste** — Ludo has no negative field |
| **Stable Audio 2.5** | Theme Stable block | **Do not paste** — no negative prompt in the current API |
| **Stable Audio 3 Medium / tools with a negative field** | Theme Stable block | Paste the theme negative block |
| **Stable Audio 3 Small SFX** | Not for music | — |

Stable Audio 2.5 has no negative prompt in the current API. The Stable blocks below already include the production tail. If you rebuild one from the shared style, append this positive production suffix:

```text
Purely instrumental, seamless loop, dirty warm lo-fi production, close small-room sound.
```

Do not write a long “no horror / no vocals” list into Stable Audio 2.5. Negative phrasing can prime the very thing it forbids. Describe the dungeon positively instead.

The negative block is intentionally broad. Keep `clipping`; never drop `vocals`, `lyrics`, `speech`, `gore`, `horror`, `heartbeat`, `ticking clock`, `music box`, `long cavernous reverb`, `bright chiptune lead`, `synthwave`, or `industrial metal`.

If a take reads as horror, synthwave, industrial, or cleaner/happier than intended, reject it and rewrite the positive prompt. Do not try to fix it by adding more negatives.

### 3.4 Instrument palette and room emphasis

| Theme | Feel | Core instruments | Cyberpunk layer | Avoid |
|---|---|---|---|---|
| Menu | Mid-tempo, light forward push | **damp domestic dungeon:** muted piano/marimba, dirty bass, simple hand drums, wet pipe ticks, repeating three-note home motif | Low detuned synth pulse, circuit hum | synthwave, bright chip lead, shiny arpeggios, clean/polished, epic, music box, heartbeat, ticking |
| 03 Nerve Forest | Plodding | **wet nerve forest:** muted marimba/kalimba, dirty bass, simple hand drums, water-drop percussion, repeating three-note signal motif | Low synth pulse, radio static | jungle drums, horror strings, synthwave, epic, bright chip lead |
| 04 Muscle Effector | Plodding, heavier | **muddy muscle workshop:** dirty bass, low drums, wet hand-drum thumps, wooden click-clack, repeating three-note signal motif slower/heavier | Servo/relay ticks | heartbeat, ticking, heavy metal, industrial metal, synthwave, epic |
| Silicon | Mid-tempo, mechanical forward push | **greasy machine:** dirty pulse bass, relay clicks, servo whirr, dry noise, repeating two-note relay motif | Radio static, small glitch stutters | bright chip lead, big saw lead, synthwave, organic/water/slime, epic, comedy robot voice |

---

## 4. Theme cards

**How to use a card**

- **Ludo:** Music mode, Loop on, duration set in the UI, no duration in the prompt, prompt expansion off if the UI/API offers it. Paste the Ludo block only; do not paste the negative block.
- **Stable Audio 2.5:** set duration to 60–75 s and trim to the loop; paste the Stable block only; do not paste the negative block. Use a fixed seed when comparing revisions.
- **Stable Audio 3 Medium / tools with a negative field:** paste the Stable block and the theme negative block.
- **Both:** generate 2–4 variations; keep the first that passes the loop, mix, palette, and blind-listen checks. Reject any take that reads as horror, synthwave, industrial, clean/polished, bright/happy, or generic chiptune.
- **Dungeon palette:** keep the assigned emphasis — menu damp domestic, `03` wet nerve forest, `04` muddy workshop, `01` greasy machine. Do not let all four collapse into one generic bright palette.
- **Biological cyberpunk:** use the word once, then specify the synthetic layer. Aim for biomechanical grime, not neon synthwave or industrial.
- **Tempo and bars:** check that tempo × bars lands inside the target length before generating.
- **BPM:** keep it in the prompt because it steers tempo; if the tool ignores it, adjust the result in post or regenerate.

**Copy-paste blocks.** Each Ludo and Stable Audio prompt is fenced and self-contained: theme, tempo, 4/4 feel, instruments, cyberpunk layer, repeating motif, production, loop start, and tone all live inside the block. Copy the contents of the block only; the labels outside the fence are not part of the prompt.

### 4.1 `audio.music.menu` — bathroom hub / main menu

- **Adventure role:** **invitation** — damp domestic dungeon; the lab at rest, a small expedition about to begin.
- **Scope:** bathroom hub, pack selection, mode selection, settings.
- **Length:** 45–60 s, seamless loop.
- **Tempo:** 112 BPM (range 108–116).
- **Structure:** 8-bar A (sparse) → 8-bar B (small lift) → 8-bar A return = 24 bars; loop on a bar boundary. No big intro, no final cadence.
- **Instruments:** muted piano/marimba, dirty bass, simple hand drums, wet pipe ticks, low detuned synth pulse, circuit hum; repeating three-note home motif.
- **Mood:** damp domestic cyberpunk dungeon; mid-tempo with a light forward push; gross-cute, curious and friendly. Not clean, not sunny, not horror.
- **Visual counterpart:** the hub menu; music is background, never informational.

**Ludo — Music mode, Loop on, prompt expansion off:**

```text
Loopable dark, quirky domestic biological-cyberpunk dungeon menu music for a damp retro-futuristic laundry lab, 112 BPM. Minor-key with simple triads, mid-tempo 4/4 with a light forward push and slightly detuned: muted piano and marimba, dirty bass, simple hand drums, wet pipe ticks, a low detuned synth pulse, circuit hum, and a repeating three-note home motif. Dirty, warm, lo-fi and close; gross-cute, curious and friendly. Instrumental; start on the pulse, seamless loop.
```

**Stable Audio 2.5:**

```text
An instrumental dark, quirky domestic biological-cyberpunk dungeon menu loop for a damp retro-futuristic laundry lab, 112 BPM. Minor-key with simple triads, mid-tempo 4/4 with a light forward push and slightly detuned: muted piano and marimba, dirty bass, simple hand drums, wet pipe ticks, a low detuned synth pulse, circuit hum, and a repeating three-note home motif. Dirty, warm, lo-fi and close; gross-cute, curious and friendly. Start on the pulse, seamless loop, instrumental.
```

**Negative — tools with a negative field:**

```text
vocals, lyrics, speech, singing, choir, intelligible words, horror, dread, jump scare, continuous ominous drone, heartbeat, ticking clock, alarm, tritone, diminished chords, minor-2nd ostinato, dissonant string clusters, whispers, breathy voices, music box, nursery timbre, gore, screams, pain, epic orchestra, cinematic bombast, heroic brass, triumphant fanfare, sunny major, bright chiptune lead, shiny arpeggios, synthwave, neon arpeggios, gated 80s drums, big saw leads, EDM drop, dubstep, dark techno, heavy metal, industrial metal, industrial grinding, acoustic jazz drum kit, big band, cartoon sitcom theme, generic NES imitation, thin toy-like chiptune, novelty 8-bit, bitcrushed vocals, long cavernous reverb, long reverb wash, clipping, low quality.
```

**Accept:**

- Reads as a dark, quirky dungeon menu, not clean, sunny, or horror.
- Minor-key, plodding 4/4, slightly detuned; dirty bass and simple hand drums.
- Home motif is short, repeating, and stays in the texture.
- Dirty, warm, lo-fi and close; not polished or cavernous.
- Loops across three consecutive plays without a seam or a reset in energy.
- Sits under the hub click/door/spin/shrink/arrive cues at 0.35 music gain.
- No vocals; no melody that competes with menu text.
- ≤ 1.5 MB; 48 kHz stereo; 45–60 s.

**Reject:**

- A bright chime, shiny arpeggio, or sunny major theme.
- A heartbeat, ticking clock, music-box creepiness, or horror strings.
- A clean, polished, or cinematic production.
- A loud lead that masks the UI click.
- A loop that audibly restarts.

### 4.2 `audio.music.nerve_forest` — `03-nerve-forest`

- **Adventure role:** **discovery** — a wet expedition through a living landscape; gross-cute, curious, not dangerous.
- **Scope:** Node Run, threshold/all-or-none, neuron structure, sensory/motor pathways.
- **Length:** 30–45 s, seamless loop.
- **Tempo:** 104 BPM (range 100–108).
- **Structure:** 8-bar pulse A → 4-bar lift B → 4-bar A return = 16 bars; loop. Keep the lift small; the puzzle should stay readable.
- **Instruments:** muted marimba/kalimba, dirty bass, simple hand drums, water-drop percussion, low synth pulse, radio static; repeating three-note signal motif.
- **Mood:** wet nerve forest; dark, damp, gross-cute, curious. Not jungle, not clean, not horror.
- **Visual counterpart:** the living nerve forest, amber signal path, membrane folds.

**Ludo — Music mode, Loop on, prompt expansion off:**

```text
Loopable dark, quirky biological-cyberpunk dungeon music for a wet living nerve forest, 104 BPM. Minor-key with simple triads, plodding 4/4 and slightly detuned: muted marimba and kalimba, dirty bass, simple hand drums, water-drop percussion, a low synth pulse, radio static, and a repeating three-note signal motif. Dirty, warm, lo-fi and close; gross-cute, curious and friendly. Instrumental; start on the pulse, seamless loop.
```

**Stable Audio 2.5:**

```text
An instrumental dark, quirky biological-cyberpunk dungeon loop for a wet living nerve forest, 104 BPM. Minor-key with simple triads, plodding 4/4 and slightly detuned: muted marimba and kalimba, dirty bass, simple hand drums, water-drop percussion, a low synth pulse, radio static, and a repeating three-note signal motif. Dirty, warm, lo-fi and close; gross-cute, curious and friendly. Start on the pulse, seamless loop, instrumental.
```

**Negative — tools with a negative field:**

```text
vocals, lyrics, speech, singing, choir, intelligible words, horror, dread, jump scare, continuous ominous drone, low membrane drone, heartbeat, ticking clock, alarm, tritone, diminished chords, minor-2nd ostinato, dissonant string clusters, whispers, breathy voices, music box, nursery timbre, gore, screams, pain, epic orchestra, cinematic bombast, heroic brass, triumphant fanfare, sunny major, bright chiptune lead, shiny arpeggios, synthwave, neon arpeggios, gated 80s drums, big saw leads, EDM drop, dubstep, dark techno, heavy metal, industrial metal, industrial grinding, jungle drums, tribal percussion, generic NES imitation, thin toy-like chiptune, novelty 8-bit, bitcrushed vocals, long cavernous reverb, long reverb wash, clipping, low quality.
```

**Accept:**

- Reads as a wet, dark, quirky dungeon, not a jungle or horror level.
- Minor-key, plodding 4/4, slightly detuned; muted marimba/kalimba and dirty bass.
- Signal motif is short, repeating, and stays in the texture.
- Dirty, warm, lo-fi and close; not polished or cavernous.
- The motif does not mask dialogue or scan cues.
- No sudden stingers or drops; the loop is safe to sit under a puzzle.
- ≤ 1.5 MB; 48 kHz stereo; 30–45 s.

**Reject:**

- Tribal/jungle drums.
- Horror strings, low drone, heartbeat, or a jump-scare stinger.
- A bright chip lead or a heroic/epic fanfare.
- A clean, polished, or cavernous production.

### 4.3 `audio.music.muscle_effector` — `04-muscle-effector`

- **Adventure role:** **teamwork** — a muddy work song; effort with a smile, a small step forward, not a fanfare.
- **Scope:** Endplate Ferry, Ca²⁺/ACh, receptor binding, muscle contraction.
- **Length:** 30–45 s, seamless loop.
- **Tempo:** 110 BPM (range 108–116).
- **Structure:** 8-bar effort A → 4-bar lift B → 4-bar release/return A = 16 bars; loop. The release should resolve without ending the loop.
- **Instruments:** dirty bass, low drums, wet hand-drum thumps, wooden click-clack, servo/relay ticks; repeating three-note signal motif, slower and heavier.
- **Mood:** muddy muscle workshop; effortful, gross-cute, curious and friendly. Not aggressive, not metallic, not horror.
- **Visual counterpart:** muscle endplate, ACh ferry, receptor, contraction gate.

**Ludo — Music mode, Loop on, prompt expansion off:**

```text
Loopable dark, quirky biological-cyberpunk dungeon music for a muddy muscle workshop, 110 BPM. Minor-key with simple triads, plodding 4/4 and slightly detuned: dirty bass, low drums, wet hand-drum thumps, wooden click-clack, servo/relay ticks, and a repeating three-note signal motif, slower and heavier. Dirty, warm, lo-fi and close; gross-cute, curious and friendly. Instrumental; start on the pulse, seamless loop.
```

**Stable Audio 2.5:**

```text
An instrumental dark, quirky biological-cyberpunk dungeon loop for a muddy muscle workshop, 110 BPM. Minor-key with simple triads, plodding 4/4 and slightly detuned: dirty bass, low drums, wet hand-drum thumps, wooden click-clack, servo/relay ticks, and a repeating three-note signal motif, slower and heavier. Dirty, warm, lo-fi and close; gross-cute, curious and friendly. Start on the pulse, seamless loop, instrumental.
```

**Negative — tools with a negative field:**

```text
vocals, lyrics, speech, singing, choir, intelligible words, horror, dread, jump scare, thriller, continuous ominous drone, heartbeat, ticking clock, ticking alarm, alarm, tritone, diminished chords, minor-2nd ostinato, dissonant string clusters, whispers, breathy voices, music box, nursery timbre, gore, blood, screams, pain, grunts, heavy metal, industrial metal, industrial grinding, metal impacts, epic orchestra, cinematic bombast, heroic brass, triumphant fanfare, sunny major, bright chiptune lead, shiny arpeggios, synthwave, neon arpeggios, gated 80s drums, big saw leads, EDM drop, dubstep, dark techno, generic NES imitation, thin toy-like chiptune, novelty 8-bit, bitcrushed vocals, long cavernous reverb, long reverb wash, clipping, low quality.
```

**Accept:**

- Reads as a muddy, dark, quirky dungeon work song, not a thriller or a happy march.
- Minor-key, plodding 4/4, slightly detuned; dirty bass and low drums.
- Signal motif is short, repeating, slower and heavier than `03`.
- Dirty, warm, lo-fi and close; not polished or cavernous.
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
- **Tempo:** 116 BPM (range 112–120).
- **Structure:** 8-bar machine pulse A → 4-bar glitch fill → 4-bar B → 4-bar A return = 20 bars; loop. The glitch fill is a texture, not a drop.
- **Instruments:** dirty pulse bass, relay clicks, servo whirr, radio static, dry noise, small glitch stutters; repeating two-note relay motif.
- **Mood:** greasy machine; mid-tempo with a mechanical forward push; dark, quirky, gross-cute and friendly-machine. Not horror, not clean, not severe.
- **Visual counterpart:** graphite/cyan board, relay, sockets, CPU wake, actuator.

**Ludo — Music mode, Loop on, prompt expansion off:**

```text
Loopable dark, quirky machine-cyberpunk dungeon music for a greasy circuit board, 116 BPM. Minor-key with simple triads, mid-tempo 4/4 with a mechanical forward push and slightly detuned: dirty pulse bass, relay clicks, servo whirr, radio static, dry noise, small glitch stutters, and a repeating two-note relay motif. Dirty, warm, lo-fi and close; gross-cute, curious and friendly. Instrumental; start on the pulse, seamless loop.
```

**Stable Audio 2.5:**

```text
An instrumental dark, quirky machine-cyberpunk dungeon loop for a greasy circuit board, 116 BPM. Minor-key with simple triads, mid-tempo 4/4 with a mechanical forward push and slightly detuned: dirty pulse bass, relay clicks, servo whirr, radio static, dry noise, small glitch stutters, and a repeating two-note relay motif. Dirty, warm, lo-fi and close; gross-cute, curious and friendly. Start on the pulse, seamless loop, instrumental.
```

**Negative — tools with a negative field:**

```text
vocals, lyrics, speech, singing, choir, intelligible words, horror, dread, jump scare, continuous ominous drone, heartbeat, ticking clock, alarm, tritone, diminished chords, minor-2nd ostinato, dissonant string clusters, whispers, breathy voices, music box, nursery timbre, gore, screams, epic orchestra, cinematic bombast, heroic brass, triumphant fanfare, sunny major, bright chiptune lead, shiny arpeggios, synthwave, neon arpeggios, gated 80s drums, big saw leads, EDM drop, dubstep, dark techno, heavy metal, industrial metal, industrial grinding, warm analog pads, organic textures, water foley, slime, comedy robot voice, vocoder, long cavernous reverb, long reverb wash, clipping, low quality.
```

**Accept:**

- Reads as a greasy, dark, quirky machine-dungeon, not a generic NES imitation or a horror level.
- Minor-key, plodding 4/4, slightly detuned; dirty pulse bass and dry clicks.
- Relay motif is short, repeating, and stays in the texture.
- Dirty, warm, lo-fi and close; not clean or cavernous.
- Clicks are crisp but not piercing; they do not mask the SFX cues.
- Distinct from the anatomy themes; no water, slime, or organic foley.
- ≤ 1.5 MB; 48 kHz stereo; 30–45 s.

**Reject:**

- A generic NES imitation, bright chiptune lead, or thin toy-like chiptune.
- Warm analog pads, organic textures, water foley, or slime.
- An ominous drone or tension.
- A comedy robot voice or vocoder.
- A drop or a big cinematic ending.

---

## 5. Future room template

Do not generate these until the room is authored. Use the anatomy "signal" motif (short repeating three-note figure) and the biological cyberpunk dungeon palette as the base.

| Future room | Adventure role and direction | Tempo | Length |
|---|---|---:|---:|
| `01-bone-gate` | **Trailhead:** sparse dungeon trailhead, detuned piano, dirty bass, simple drums, low synth pulse, circuit hum, signal motif stated quietly; chalky, open, curious; a sense of entering a cave, not dread | 90–100 BPM | 30–45 s |
| `02-joint-chamber` | **Glide:** fluid dungeon glide, detuned mallets, dirty bass, slow plodding beat, radio static, signal motif stretched; slippery, calm, curious | 88–100 BPM | 30–45 s |
| `05-reflex-core` | **Small resolution:** full dungeon resolution of the signal motif, low synth pulse, circuit hum, confident and warm; the adventure arc completes; still no fanfare | 104–112 BPM | 45–60 s |

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
- Do not use "8-bit" or "chiptune" as the style label. Say "biological-cyberpunk dungeon", then specify minor-key, 4/4 feel, detuned piano/mallets, dirty bass, and synth/radio/relay textures.
- Biological cyberpunk means biomechanical grime, not synthwave. Reject neon arpeggios, gated 80s drums, big saw leads, EDM, dark techno, or industrial metal.
- Keep the tempo/bar math: menu 112/24 bars; `03` 104/16; `04` 110/16; `01` 116/20.
- Ludo may polish or brighten the track, turn it into generic chiptune, or drift into synthwave. Reject it if it is clean, happy, thin, toy-like, neon, or if all four themes sound like the same console.
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
- If Stable brightens or polishes the palette, add detuned piano/mallets, dirty bass, simple drums, a low synth pulse, radio static, and light lo-fi saturation. Do not add more “8-bit” or synthwave.
- Use audio-to-audio to derive `04` from `03` at a moderate strength (roughly 0.35–0.55) while preserving the signal motif. `04` should be slower and heavier — not more horror-like. It must stay a muddy work song, not drift toward Silicon's dry machine palette.
- Use inpainting to fix a bad loop seam or a final cadence.
- Use a fixed seed when comparing prompt revisions.
- Stable Audio 3 Medium supports a negative prompt. Use the Stable block plus the theme negative block there.
- Stable Audio 3 Small SFX is for one-shots, not music. If you need another music model, use Stable Audio 2.5 or Stable Audio 3 Medium.

### 6.3 Remix and variation workflow

1. Generate the **menu theme** first as the production/style anchor (P0). It must read as a damp domestic cyberpunk dungeon invitation to a small expedition.
2. Generate **`03-nerve-forest`** as the anatomy motif anchor (P0). It must read as a wet nerve forest, not jungle or horror.
3. Generate **`04-muscle-effector`** as a variation of `03`: same signal motif, slower and heavier muddy work-song instrumentation. Use Ludo Remix or Stable Audio 2.5 audio-to-audio; do not start from scratch unless the remix loses the motif. Do not make it more horror-like or cleaner; keep it muddy and gross-cute.
4. Generate **`01-interrupt-loop`** last and independently. Do not remix the anatomy theme; Silicon must be the greasy machine sibling, not a recolour and not a severe one.
5. Keep the four dungeon functions distinct: menu damp domestic, `03` wet nerve forest, `04` muddy workshop, `01` greasy machine. Do not let one generic bright or synthwave palette swallow all four.
6. If the menu and `03` feel like different games, revise the menu's instrument palette rather than the motif.
7. Blind-listen every theme with the screen off. If it reads as horror, thriller, dread, sadness, clean/polished, bright/happy, synthwave, industrial, or generic chiptune, reject it and rewrite the positive prompt.

### 6.4 Seeds, variations, and retries

- Generate 2–4 variations per theme.
- Keep the first that passes the loop, mix, identity, dungeon/cyberpunk palette, tempo/bar math, motif-shape, and blind-listen checks.
- Maximum two prompt revisions before changing tool or accepting a placeholder.
- Before generating, read only the fenced prompt. If it does not contain the room, tempo, minor-key/4/4 feel, detuned palette, instruments, cyberpunk layer, repeating motif, dirty lo-fi production, and start-on-pulse loop, fix the block — not the card metadata.
- If a take reads as horror, do not add more negatives; rewrite the positive harmony, pulse, and instrumentation.
- If a take is clean or bright, add detuned piano/mallets, dirty bass, simple drums, a low synth pulse, radio static, and light lo-fi saturation. Do not just add more “8-bit” or synthwave.
- If a take drifts into synthwave or industrial, rewrite the positive prompt; do not add more negatives.
- Record model, seed, duration, BPM, loop points, post-processing, dungeon/cyberpunk check, tempo/bar math, motif shape, adventure check, and licence.
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

**Bar math.** At 4/4, seconds per bar = **240 ÷ BPM**. Current targets: menu **112 BPM × 24 bars = 51.4 s**; `03` **104 × 16 = 36.9 s**; `04` **110 × 16 = 34.9 s**; `01` **116 × 20 = 41.4 s**. If the structure changes, recalculate before generation.

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
| 1 | Menu theme (P0) | 112 BPM, 24 bars; reads as a damp domestic cyberpunk dungeon, not clean/happy or horror/sitcom; loops three times; sits under hub cues; no vocals; approved at 0.35 gain |
| 2 | `03-nerve-forest` (P0) | 104 BPM, 16 bars; signal motif reads on muted marimba/kalimba in the wet nerve forest; not jungle or horror; supports puzzle concentration |
| 3 | `04-muscle-effector` (P1) | 110 BPM, 16 bars; same motif, slower and heavier in the muddy workshop; not thriller or clean; distinct from 03; low end does not mask jump/land |
| 4 | `01-interrupt-loop` (P1/P2) | 116 BPM, 20 bars; greasy machine mission; dry, dirty, not generic NES and no horror drone; distinct from anatomy |
| 5 | Integration | Room/hub transitions, mute, volume, pause, crossfade, licences |

Do not generate all four before the menu/03 pilot passes. The menu is the production anchor; 03 is the anatomy motif anchor. If either pilot reads as clean/polished, bright/happy, horror, synthwave, industrial, or generic chiptune, stop and rewrite the positive prompt before generating the rest.

---

## 9. Post-processing and loop QA

1. Trim to a bar-aligned loop.
2. Resample to 48 kHz stereo.
3. Remove DC offset; high-pass only if it does not remove intended sub-bass.
4. Normalise to −18 to −16 LUFS; true peak ≤ −1 dBTP.
5. Encode to OGG Vorbis q4–q6 (or MP3 fallback).
6. Check the loop seam in an audio editor at sample level.
7. Play three consecutive loops in the browser.
8. Blind-listen with the screen off. The theme must read as **biological cyberpunk dungeon** — minor-key, 4/4, slightly detuned, dirty, lo-fi, gross-cute, curious — not horror, synthwave, industrial, clean/polished, bright/happy, or generic chiptune. If it fails, reject it and rewrite the positive prompt.
9. A/B the theme under the room's SFX cues at 0.35 music gain.
10. Check the crossfade into and out of the room.
11. Record the prompt, model, seed, duration, BPM, loop points, post-processing, dungeon/cyberpunk check, tempo/bar math, motif shape, adventure check, and licence.

### Per-theme acceptance

- [ ] File exists at the exact path; manifest `src` matches.
- [ ] 48 kHz stereo; OGG/MP3; ≤ 1.5 MB.
- [ ] 30–45 s room / 45–60 s menu.
- [ ] Tempo × bars lands inside the target length.
- [ ] Seamless loop; three-loop check passes.
- [ ] −18 to −16 LUFS; true peak ≤ −1 dBTP.
- [ ] No vocals, lyrics, speech, or gore.
- [ ] Fenced prompt is self-contained: room, tempo, 4/4 feel, minor-key/detuned palette, instruments, cyberpunk layer, repeating motif, dirty lo-fi production, start-on-pulse loop, and tone all live inside the block.
- [ ] Reads as **biological cyberpunk dungeon**, not horror, synthwave, industrial, clean/polished, bright/happy, or generic chiptune (blind-listen check).
- [ ] No horror signifiers: continuous ominous drone, heartbeat, ticking clock, tritone/diminished main motif, minor-2nd ostinato, dissonant strings, whispers, music box, long cavernous reverb.
- [ ] No synthwave/industrial signifiers: neon arpeggios, gated 80s drums, big saw leads, dark techno, industrial metal.
- [ ] Positive dungeon markers: minor-key with simple triads, 4/4, slightly detuned piano/mallets, dirty bass, simple drums, synth/radio/relay texture.
- [ ] Motif shape matches the theme: menu/anatomy short repeating three-note figure; Silicon repeating two-note tick.
- [ ] Uses the assigned room emphasis (menu damp domestic, `03` wet nerve forest, `04` muddy workshop, `01` greasy machine).
- [ ] Cyberpunk layer is texture, not lead; Silicon is the machine exception.
- [ ] Dirty, warm, lo-fi and close; not clean, polished, or cavernous.
- [ ] Full-bodied; not thin, toy-like, or a generic NES imitation.
- [ ] Motif present but not masking SFX.
- [ ] Reads as the intended room/menu identity.
- [ ] Distinct from the other themes.
- [ ] Licence and prompt-log rows complete.

### Global acceptance

- [ ] Menu + 03 + 04 + Silicon themes approved, or a recorded placeholder decision.
- [ ] All four themes pass the blind-listen dungeon test: minor-key, 4/4, slightly detuned, dirty, lo-fi, gross-cute, curious; not horror, synthwave, industrial, clean, bright/happy, epic, or generic chiptune.
- [ ] All four themes pass the dungeon-function test: menu damp domestic, `03` wet nerve forest, `04` muddy workshop, `01` greasy machine; no shared generic bright palette.
- [ ] All four themes share the same minor-key/4/4/detuned palette; no room gets a different harmonic system.
- [ ] Detuned timbres and chromatic passing notes are allowed; no tritone/diminished main motif or minor-2nd ostinato. No bright chip lead in any theme.
- [ ] All four loops pass the tempo/bar math: 112×24, 104×16, 110×16, 116×20.
- [ ] Cyberpunk is biomechanical grime, not synthwave or industrial; the synth layer is texture, not lead, except in Silicon.
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

| Asset ID | Tool / model | Seed | Length | BPM | Loop points | Chosen file | Post-processing | Dungeon/cyberpunk / motif check | Verdict | Licence |
|---|---|---|---:|---:|---|---|---|---|---|---|
| `audio.music.menu` | | | | | | | | | | |
| `audio.music.nerve_forest` | | | | | | | | | | |
| `audio.music.muscle_effector` | | | | | | | | | | |
| `audio.music.interrupt_loop` | | | | | | | | | | |

**Minimum fields:** prompt version, asset ID, tool/plan, model/seed, duration, BPM, loop points, bars, tempo/bar math, variations, chosen file, post-processing, runtime check, dungeon/cyberpunk check (biomechanical grime vs synthwave/industrial), motif shape (menu/anatomy short repeating three-note; Silicon repeating two-note), adventure check (gross-cute vs horror), verdict, licence, notes.

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
| 2026-11-04 | Dark quirky dungeon revision (`audio-themes-2026-11-04.3`): simplified the score around one shared *The Binding of Isaac*-like palette — minor-key, plodding 4/4, slightly detuned piano/mallets, dirty bass, simple drums, short repeating motifs, dirty lo-fi production. Collapsed four harmonic systems into one palette with per-room emphasis; cut prompts from ~180 to ~50–60 words; removed Dorian/m7/9/sus4, half-time/swung 16ths, low-passed chip layering, and the long self-containment tail; kept the horror bans and gross-cute tone; updated acceptance and prompt log. |
| 2026-11-04 | Biological cyberpunk + tempo revision (`audio-themes-2026-11-04.4`): added biomechanical cyberpunk texture — detuned synth pulses, circuit hum, radio static, relay/servo ticks, small glitch stutters — while keeping the dirty lo-fi dungeon palette. Set menu **112 BPM / 24 bars = 51.4 s**, `03` **104 / 16 = 36.9 s**, `04` **110 / 16 = 34.9 s**, `01` **116 / 20 = 41.4 s**. Menu changed to mid-tempo with a light forward push; Silicon to mid-tempo with a mechanical forward push; rooms stay plodding. Added synthwave/industrial bans, bar math, and cyberpunk/tempo acceptance checks. |
