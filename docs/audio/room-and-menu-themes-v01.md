# Room and Menu Audio Themes — Requirements and Generation Prompts

> **Status:** Proposed extension · adventure-tone revision · 3 November 2026  
> **Owner:** Snorre  
> **Scope:** Four loopable themes — bathroom hub/menu, `03-nerve-forest`, `04-muscle-effector`, `01-interrupt-loop`  
> **Prompt version:** `audio-themes-2026-11-03.2`  
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

**Tone anchor (2026-11-03).** `DESIGN.md` defines the game as a *wondrous sci-fi puzzle adventure; warm and wry*. In this document, **adventurous** means curious, bright-eyed, forward-moving, playful, and small-scale. It does not mean epic, heroic, dangerous, or dark. The four themes are siblings in that adventure: the menu is the **invitation**, `03` is **discovery**, `04` is **teamwork**, and Silicon is **mission**. None is horror or thriller scoring.

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
| Tone | **Wondrous sci-fi puzzle adventure**; every theme is adventurous, not horror, thriller, or epic |
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
| Menu | **Invitation** | The lab at rest, a small expedition about to begin; warm, curious, optimistic |
| `03-nerve-forest` | **Discovery** | A nimble expedition through a living landscape; bright-eyed wonder, not danger |
| `04-muscle-effector` | **Teamwork** | A sturdy work song; effort, determination, a small hard-won triumph |
| `01-interrupt-loop` | **Mission** | A tiny robot's relay race; precision, playful momentum, a sense of mission |

| Identity | Motif | Use |
|---|---|---|
| Anatomy | **Signal motif** — a three-note rising “setting out” figure | `03` states it as a plucked nerve-fiber motif; `04` states it slower and sturdier on a warm analog synth; `05` resolves it when authored |
| Silicon | **Relay motif** — a two-note alternating tick | `01` states it as a playful ready-set relay figure; not a variation of the anatomy motif |
| Menu | **Home motif** — a three-note rising warm chime | The hub's own identity; a welcome and an invitation, not a danger signal |

Rules:

- Keep the motif in the low/mid register. It is a texture, not a hook, and not a heroic lead.
- State the motif two to four times per loop.
- Never put the motif in a frequency range that masks dialogue, scan, gate, or UI cues.
- The room theme is a variation on its cycle motif, not a new melody per room.
- Adventure is carried by bright harmony, a clear pulse, and playful percussion — never by epic brass, a low ominous drone, a heartbeat, or a ticking clock.
- The menu theme is the only theme that may feel warmly domestic. Silicon must not use amber/warm anatomy instruments; it stays crisp and friendly-machine, not cold or severe.

### 3.2 Global music style

**`ADVENTURE_STYLE_ANATOMY` — menu, `03`, `04`:**

```text
Wondrous small-scale sci-fi puzzle-adventure game music, intimate and tactile, warm and a little wry, with a sense of discovery and gentle forward momentum. Bright major or open modal harmony, rounded low end, tactile wooden and soft organic textures, uncluttered arrangement with space for dialogue and UI cues. Curious and optimistic, never epic, never ominous.
```

**`ADVENTURE_STYLE_SILICON` — `01`:**

```text
Wondrous small-scale sci-fi puzzle-adventure game music, crisp and tactile, playful and mission-driven, with a sense of forward motion. Bright modal harmony, rounded low end, graphite and circuit-board textures, uncluttered arrangement with space for dialogue and UI cues. Curious and friendly-machine, never epic, never ominous.
```

### 3.3 Global negative and tool routing

Use this shared core with any tool that exposes a negative prompt. Each theme card below provides the complete negative block already combined with its theme add-ons.

```text
vocals, lyrics, speech, singing, choir, intelligible words, horror, dread, jump scare, ominous drone, minor-key ostinato, heartbeat, ticking clock, alarm, screaming strings, gore, screams, pain, epic orchestra, cinematic bombast, heroic brass, EDM drop, dubstep, heavy metal, industrial grinding, long reverb wash, clipping, distortion, low quality.
```

| Tool | Positive block | Negative block |
|---|---|---|
| **Ludo Music mode** | Theme Ludo block | **Do not paste** — Ludo has no negative field |
| **Stable Audio 2.5** | Theme Stable block | **Do not paste** — no negative prompt in the current API |
| **Stable Audio 3 Medium / tools with a negative field** | Theme Stable block | Paste the theme negative block |
| **Stable Audio 3 Small SFX** | Not for music | — |

Stable Audio 2.5 has no negative prompt in the current API. The Stable blocks below already include the production tail. If you rebuild one from the shared style, append this positive production suffix:

```text
Purely instrumental and wordless, seamless loop, dry small-room production, clean loop seam, uncluttered mix with space for game sound effects.
```

Do not write a long “no horror / no vocals” list into Stable Audio 2.5. Negative phrasing can prime the very thing it forbids. Describe the adventure positively instead.

The negative block is intentionally broad. Keep `clipping`. For the Silicon glitch fill only, drop `distortion`; never drop `vocals`, `lyrics`, `speech`, `gore`, `horror`, `heartbeat`, `ticking clock`, or `clipping`.

If a take reads as horror or thriller, reject it and rewrite the positive prompt. Do not try to fix it by adding more negatives.

### 3.4 Instrument palette

| Theme | Core instruments | Avoid |
|---|---|---|
| Menu | gentle rhythmic washing-machine motor hum, brushed hand percussion, muted analog bass, warm electric piano/marimba, pipe ticks, water drips, rising three-note home chime | drum kit, big band, cartoon sitcom theme, chiptune lead, ominous drone |
| 03 Nerve Forest | rising three-note plucked nerve-fiber motif on marimba/kalimba, soft hand percussion, warm analog pad, gentle sub-bass pulse, tiny electrical sparkles, soft water-drop percussion, amber chime | jungle drums, tribal percussion, horror strings, low membrane drone, heroic brass |
| 04 Muscle Effector | soft round low drum thumps, supple membrane percussion like soft hand drums, bouncy analog bass, rounded analog synth swells, playful wooden click-clack percussion, bright rising chime | heavy metal, industrial grinding, heartbeat, ticking alarm, pain sounds, heroic brass |
| Silicon | soft low graphite hum that breathes with the pulse, light relay clicks, servo whirrs, digital ticks, rounded cyan synth pulse, toy-like mechanical percussion, small glitch stutters | chiptune lead, warm analog pads, organic textures, ominous drone, comedy robot voice |

---

## 4. Theme cards

**How to use a card**

- **Ludo:** Music mode, Loop on, duration set in the UI, no duration in the prompt, prompt expansion off if the UI/API offers it. Paste the Ludo block only; do not paste the negative block.
- **Stable Audio 2.5:** set duration to 60–75 s and trim to the loop; paste the Stable block only; do not paste the negative block. Use a fixed seed when comparing revisions.
- **Stable Audio 3 Medium / tools with a negative field:** paste the Stable block and the theme negative block.
- **Both:** generate 2–4 variations; keep the first that passes the loop, mix, and blind-listen adventure checks. Reject any take that reads as horror, thriller, or dread.
- **BPM:** keep it in the prompt because it steers tempo; if the tool ignores it, adjust the result in post or regenerate.

**Copy-paste blocks.** Each Ludo and Stable Audio prompt is fenced. Copy the contents of the block only; the labels outside the fence are not part of the prompt.

### 4.1 `audio.music.menu` — bathroom hub / main menu

- **Adventure role:** **invitation** — the launchpad for a small expedition.
- **Scope:** bathroom hub, pack selection, mode selection, settings.
- **Length:** 45–60 s, seamless loop.
- **Tempo:** 104 BPM (range 100–108).
- **Structure:** 16-bar A (sparse) → 8-bar B (gentle lift) → 8-bar A return; loop on a bar boundary. No big intro, no final cadence.
- **Instruments:** gentle rhythmic washing-machine motor hum, brushed hand percussion, muted analog bass, warm electric piano or marimba, tiny pipe ticks, distant water drips, rising three-note home chime.
- **Mood:** warm, curious, optimistic; the laundry lab at rest, with the journey ahead. Not cartoonish, not epic.
- **Visual counterpart:** the hub menu; music is background, never informational.

**Ludo — Music mode, Loop on, prompt expansion off:**

```text
Loopable game music for a cozy retro-futuristic laundry-lab menu in a wondrous sci-fi puzzle adventure, like the launchpad for a small expedition, 104 BPM. Warm, curious and inviting, with bright major harmony, a gentle forward sway and a sense of possibility. A soft rhythmic washing-machine motor hum under brushed hand percussion, muted analog bass, warm electric piano and marimba, tiny pipe ticks, distant water drips, and a rising three-note home chime woven into the texture. A light lift in the middle, then a warm return; intimate, tactile and uncluttered, with space for menu sounds. Purely instrumental and wordless, seamless loop.
```

**Stable Audio 2.5:**

```text
An instrumental game menu loop for a cozy retro-futuristic laundry-lab menu in a wondrous sci-fi puzzle adventure, like the launchpad for a small expedition, 104 BPM. Warm, curious and inviting, with bright major harmony, a gentle forward sway and a sense of possibility. A soft rhythmic washing-machine motor hum under brushed hand percussion, muted analog bass, warm electric piano and marimba, tiny pipe ticks, distant water drips, and a rising three-note home chime woven into the texture. A sparse opening, a light lift, then a warm return; intimate, tactile, small-scale and uncluttered, with space for menu sounds. Seamless loop, dry small-room production, purely instrumental and wordless.
```

**Negative — tools with a negative field:**

```text
vocals, lyrics, speech, singing, choir, intelligible words, horror, dread, jump scare, ominous drone, minor-key ostinato, heartbeat, ticking clock, alarm, screaming strings, gore, screams, pain, epic orchestra, cinematic bombast, heroic brass, EDM drop, dubstep, heavy metal, industrial grinding, cartoon sitcom theme, big band, drum kit, chiptune lead, 8-bit melody, long reverb wash, clipping, distortion, low quality.
```

**Accept:**

- Reads as a warm invitation to a small expedition, not a sitcom or a horror menu.
- Loops across three consecutive plays without a seam or a reset in energy.
- Sits under the hub click/door/spin/shrink/arrive cues at 0.35 music gain.
- No vocals; no melody that competes with menu text.
- ≤ 1.5 MB; 48 kHz stereo; 45–60 s.

**Reject:**

- A song with a verse/chorus and a final cadence.
- A cartoonish or sitcom theme.
- A low drone, ticking clock, or ominous minor ostinato.
- A loud lead that masks the UI click.
- A loop that audibly restarts.

### 4.2 `audio.music.nerve_forest` — `03-nerve-forest`

- **Adventure role:** **discovery** — a nimble expedition through a living landscape.
- **Scope:** Node Run, threshold/all-or-none, neuron structure, sensory/motor pathways.
- **Length:** 30–45 s, seamless loop.
- **Tempo:** 100 BPM (range 92–104).
- **Structure:** 8-bar pulse A → 8-bar lift B → 8-bar A return; loop. Keep the lift subtle; the puzzle should stay readable.
- **Instruments:** rising three-note plucked nerve-fiber motif on marimba/kalimba, soft hand percussion, warm analog pad, gentle sub-bass pulse, tiny electrical sparkles, soft water-drop percussion, amber chime.
- **Mood:** curious, bright-eyed, open, alive; wonder around the next bend, not danger or jungle adventure.
- **Visual counterpart:** the living nerve forest, amber signal path, membrane folds.

**Ludo — Music mode, Loop on, prompt expansion off:**

```text
Loopable game music for a curious expedition through a living nerve forest in a wondrous sci-fi puzzle adventure, 100 BPM. Nimble, bright-eyed and open, with bright modal harmony, a flowing forward pulse and a sense of discovery. A rising three-note nerve-fiber motif on marimba and kalimba, woven into the texture rather than played as a lead; soft hand percussion, a warm analog pad, a gentle sub-bass pulse, tiny electrical sparkles, soft water-drop percussion and an amber chime. A small lift in the middle, then a warm return; intimate, tactile and uncluttered, with space for dialogue and scan cues. Purely instrumental and wordless, seamless loop.
```

**Stable Audio 2.5:**

```text
An instrumental game loop for a curious expedition through a living nerve forest in a wondrous sci-fi puzzle adventure, 100 BPM. Nimble, bright-eyed and open, with bright modal harmony, a flowing forward pulse and a sense of discovery. A rising three-note nerve-fiber motif on marimba and kalimba, woven into the texture rather than played as a lead; soft hand percussion, a warm analog pad, a gentle sub-bass pulse, tiny electrical sparkles, soft water-drop percussion and an amber chime. A small lift, then a warm return; intimate, tactile, small-scale and uncluttered, with space for dialogue and scan cues. Seamless loop, dry close production, purely instrumental and wordless.
```

**Negative — tools with a negative field:**

```text
vocals, lyrics, speech, singing, choir, intelligible words, horror, dread, jump scare, ominous drone, low membrane drone, minor-key ostinato, heartbeat, ticking clock, alarm, screaming strings, gore, screams, pain, epic orchestra, cinematic bombast, heroic brass, EDM drop, dubstep, heavy metal, industrial grinding, jungle drums, tribal percussion, chiptune, 8-bit melody, long reverb wash, clipping, distortion, low quality.
```

**Accept:**

- Reads as a curious living landscape, not a jungle or a horror level.
- Bright-eyed and forward-moving; supports puzzle concentration.
- The motif is present but does not mask dialogue or scan cues.
- No sudden stingers or drops; the loop is safe to sit under a puzzle.
- ≤ 1.5 MB; 48 kHz stereo; 30–45 s.

**Reject:**

- Tribal/jungle drums.
- Horror strings, low drone, heartbeat, or a jump-scare stinger.
- A heroic or epic fanfare that makes the room feel like a different game.
- A long reverb wash that smears the loop seam.

### 4.3 `audio.music.muscle_effector` — `04-muscle-effector`

- **Adventure role:** **teamwork** — a sturdy work song; effort with a smile, a small hard-won triumph.
- **Scope:** Endplate Ferry, Ca²⁺/ACh, receptor binding, muscle contraction.
- **Length:** 30–45 s, seamless loop.
- **Tempo:** 110 BPM (range 100–116).
- **Structure:** 8-bar effort A → 8-bar lift B → 8-bar release/return A; loop. The release should resolve without ending the loop.
- **Instruments:** soft round low drum thumps, supple membrane percussion like soft hand drums, bouncy analog bass, rounded analog synth swells, playful wooden click-clack percussion, bright rising chime at the phrase turn.
- **Mood:** effortful but buoyant, warm, friendly, quietly triumphant; a small team pulling together. Not aggressive, not metallic, not ominous.
- **Visual counterpart:** muscle endplate, ACh ferry, receptor, contraction gate.

**Ludo — Music mode, Loop on, prompt expansion off:**

```text
Loopable game music for a busy, friendly muscle workshop in a wondrous sci-fi puzzle adventure, 110 BPM. Effortful but buoyant and quietly triumphant, warm and friendly, like a small team pulling together. Warm major harmony and a sturdy working groove; the same rising three-note signal motif, played slower and sturdier on a warm analog synth and woven into the texture rather than a heroic lead. Soft round low drum thumps, like a hand on a big wooden drum; supple membrane percussion, like soft hand drums; bouncy analog bass; rounded analog synth swells; playful wooden click-clack percussion; and a bright rising chime at the phrase turn. A small lift in the middle, then a warm return; intimate, tactile and uncluttered, with space for jump, land and dash cues. Purely instrumental and wordless, seamless loop.
```

**Stable Audio 2.5:**

```text
An instrumental game loop for a busy, friendly muscle workshop in a wondrous sci-fi puzzle adventure, 110 BPM. Effortful but buoyant and quietly triumphant, warm and friendly, like a small team pulling together. Warm major harmony and a sturdy working groove; the same rising three-note signal motif, played slower and sturdier on a warm analog synth and woven into the texture rather than a heroic lead. Soft round low drum thumps, like a hand on a big wooden drum; supple membrane percussion, like soft hand drums; bouncy analog bass; rounded analog synth swells; playful wooden click-clack percussion; and a bright rising chime at the phrase turn. A small lift, then a warm return; intimate, tactile, small-scale and uncluttered, with space for jump, land and dash cues. Seamless loop, dry close production, purely instrumental and wordless.
```

**Negative — tools with a negative field:**

```text
vocals, lyrics, speech, singing, choir, intelligible words, horror, dread, jump scare, thriller, ominous drone, minor-key ostinato, heartbeat, ticking clock, ticking alarm, alarm, screaming strings, gore, blood, screams, pain, grunts, heavy metal, industrial grinding, metal impacts, epic orchestra, cinematic bombast, heroic brass, EDM drop, dubstep, long reverb wash, clipping, distortion, low quality.
```

**Accept:**

- Reads as sturdy, upbeat teamwork, not a thriller.
- Effortful but buoyant; the release feels like a small triumph, not a threat.
- The low end does not mask jump/land/dash cues.
- Distinct from `03`; the shared motif is slower and sturdier, not darker.
- ≤ 1.5 MB; 48 kHz stereo; 30–45 s.

**Reject:**

- Horror/thriller: heartbeat, ticking alarm, low drone, dissonant strings.
- Heavy metal or industrial grinding.
- Pain grunts, screams, or gore.
- Heroic epic brass.
- A generic action loop.

### 4.4 `audio.music.interrupt_loop` — `01-interrupt-loop` (Silicon)

- **Adventure role:** **mission** — a tiny robot's relay race.
- **Scope:** sensor → interrupt controller → CPU → actuator; transfer gate.
- **Length:** 30–45 s, seamless loop.
- **Tempo:** 116 BPM (range 110–124).
- **Structure:** 8-bar machine pulse A → 4-bar glitch fill → 8-bar B → 8-bar A return; loop. The glitch fill is a texture, not a drop.
- **Instruments:** soft low graphite hum that breathes with the pulse, light relay clicks, servo whirrs, digital ticks, rounded cyan synth pulse, toy-like mechanical percussion, small glitch stutters.
- **Mood:** crisp, nimble, playful, mission-driven; friendly-machine, not cold or severe.
- **Visual counterpart:** graphite/cyan board, relay, sockets, CPU wake, actuator.

**Ludo — Music mode, Loop on, prompt expansion off:**

```text
Loopable game music for a tiny robot on a circuit-board mission in a wondrous sci-fi puzzle adventure, 116 BPM, like a playful relay race. Crisp, nimble and playful, with bright modal harmony, a bouncy machine pulse and a sense of mission. A two-note alternating relay tick as the motif, woven into the rhythm rather than played as a lead; a soft low graphite hum that breathes with the pulse, light relay clicks, servo whirrs, digital ticks, a rounded cyan synth pulse, toy-like mechanical percussion and small glitch stutters used as rhythmic texture. Steady forward motion with a light four-bar glitch fill and a bright return; clean, tactile and uncluttered, with space for UI and scan cues. Purely instrumental and wordless, seamless loop.
```

**Stable Audio 2.5:**

```text
An instrumental game loop for a tiny robot's journey across a graphite circuit board in a wondrous sci-fi puzzle adventure, 116 BPM, like a playful relay race. Crisp, nimble and playful, with bright modal harmony, a bouncy machine pulse and a sense of mission. A two-note alternating relay tick as the motif, woven into the rhythm rather than played as a lead; a soft low graphite hum that breathes with the pulse, light relay clicks, servo whirrs, digital ticks, a rounded cyan synth pulse, toy-like mechanical percussion and small glitch stutters used as rhythmic texture. Steady forward motion, a light four-bar glitch fill, then a bright return; clean, tactile, small-scale and uncluttered, with space for UI and scan cues. Seamless loop, dry close production, purely instrumental and wordless.
```

**Negative — tools with a negative field:**

```text
vocals, lyrics, speech, singing, choir, intelligible words, horror, dread, ominous drone, minor-key ostinato, heartbeat, ticking clock, alarm, screaming strings, gore, screams, epic orchestra, cinematic bombast, heroic brass, EDM drop, dubstep, heavy metal, industrial grinding, chiptune lead, 8-bit melody, retro console music, warm analog pads, organic textures, comedy robot voice, vocoder, long reverb wash, clipping, low quality.
```

**Accept:**

- Reads as a playful machine mission, not an 8-bit console or a horror level.
- No amber/warm anatomy instruments.
- Clicks are crisp but not piercing; they do not mask the SFX cues.
- Distinct from the anatomy themes; the relay motif is present.
- Forward motion, light glitch fill, bright return.
- ≤ 1.5 MB; 48 kHz stereo; 30–45 s.

**Reject:**

- A chiptune lead or a full 8-bit melody.
- Warm analog pads or organic textures.
- An ominous drone or tension.
- A comedy robot voice or vocoder.
- A drop or a big cinematic ending.

---

## 5. Future room template

Do not generate these until the room is authored. Use the anatomy "signal" motif as the base.

| Future room | Adventure role and direction | Tempo | Length |
|---|---|---:|---:|
| `01-bone-gate` | **Trailhead:** sparse bone percussion, low sine, signal motif stated quietly; chalky, open, curious; a sense of entering a cave, not dread | 90–100 BPM | 30–45 s |
| `02-joint-chamber` | **Glide:** fluid synth, joint-cyan shimmer, slow pulse, signal motif stretched; slippery, calm, wondrous | 88–100 BPM | 30–45 s |
| `05-reflex-core` | **Small triumph:** full signal-motif resolution, confident and warm; the adventure arc completes | 104–112 BPM | 45–60 s |

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
- Use audio-to-audio to derive `04` from `03` at a moderate strength (roughly 0.35–0.55) while preserving the signal motif. `04` should be slower, sturdier, and warmer — not darker.
- Use inpainting to fix a bad loop seam or a final cadence.
- Use a fixed seed when comparing prompt revisions.
- Stable Audio 3 Medium supports a negative prompt. Use the Stable block plus the theme negative block there.
- Stable Audio 3 Small SFX is for one-shots, not music. If you need another music model, use Stable Audio 2.5 or Stable Audio 3 Medium.

### 6.3 Remix and variation workflow

1. Generate the **menu theme** first as the production/style anchor (P0). It must read as an invitation to a small expedition.
2. Generate **`03-nerve-forest`** as the anatomy motif anchor (P0). It must read as bright-eyed discovery, not jungle or horror.
3. Generate **`04-muscle-effector`** as a variation of `03`: same signal motif, slower and sturdier instrumentation, warmer teamwork. Use Ludo Remix or Stable Audio 2.5 audio-to-audio; do not start from scratch unless the remix loses the motif. Do not make it darker or heavier.
4. Generate **`01-interrupt-loop`** independently. Do not remix the anatomy theme; Silicon must be a crisp, friendly-machine sibling, not a recolour and not a severe one.
5. If the menu and `03` feel like different games, revise the menu's instrument palette rather than the motif.
6. Blind-listen every theme with the screen off. If it reads as horror, thriller, dread, or sadness, reject it and rewrite the positive prompt.

### 6.4 Seeds, variations, and retries

- Generate 2–4 variations per theme.
- Keep the first that passes the loop, mix, identity, and blind-listen adventure checks.
- Maximum two prompt revisions before changing tool or accepting a placeholder.
- If a take reads as horror, do not add more negatives; rewrite the positive harmony, pulse, and instrumentation.
- Record model, seed, duration, BPM, loop points, post-processing, adventure check, and licence.
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
| 1 | Menu theme (P0) | Reads as a warm invitation to a small expedition, not horror or sitcom; loops three times; sits under hub cues; no vocals; approved at 0.35 gain |
| 2 | `03-nerve-forest` (P0) | Anatomy motif reads; bright-eyed discovery, no horror/jungle clichés; supports puzzle concentration |
| 3 | `04-muscle-effector` (P1) | Same motif, slower and sturdier; upbeat teamwork, not horror; distinct from 03; low end does not mask jump/land |
| 4 | `01-interrupt-loop` (P1/P2) | Crisp and playful mission; no chiptune lead and no horror drone; distinct from anatomy |
| 5 | Integration | Room/hub transitions, mute, volume, pause, crossfade, licences |

Do not generate all four before the menu/03 pilot passes. The menu is the production anchor; 03 is the anatomy motif anchor. If either pilot reads as horror or thriller, stop and rewrite the positive prompt before generating the rest.

---

## 9. Post-processing and loop QA

1. Trim to a bar-aligned loop.
2. Resample to 48 kHz stereo.
3. Remove DC offset; high-pass only if it does not remove intended sub-bass.
4. Normalise to −18 to −16 LUFS; true peak ≤ −1 dBTP.
5. Encode to OGG Vorbis q4–q6 (or MP3 fallback).
6. Check the loop seam in an audio editor at sample level.
7. Play three consecutive loops in the browser.
8. Blind-listen with the screen off. The theme must read as wondrous puzzle adventure, not horror, thriller, dread, or sadness. If it fails, reject it and rewrite the positive prompt.
9. A/B the theme under the room's SFX cues at 0.35 music gain.
10. Check the crossfade into and out of the room.
11. Record the prompt, model, seed, duration, BPM, loop points, post-processing, adventure check, and licence.

### Per-theme acceptance

- [ ] File exists at the exact path; manifest `src` matches.
- [ ] 48 kHz stereo; OGG/MP3; ≤ 1.5 MB.
- [ ] 30–45 s room / 45–60 s menu.
- [ ] Seamless loop; three-loop check passes.
- [ ] −18 to −16 LUFS; true peak ≤ −1 dBTP.
- [ ] No vocals, lyrics, speech, or gore.
- [ ] Reads as **wondrous puzzle adventure**, not horror, thriller, dread, or sadness (blind-listen check).
- [ ] No horror signifiers: low drone, heartbeat, ticking clock, minor-key ostinato, dissonant strings.
- [ ] Positive adventure markers: rising motif, clear pulse, bright harmony, playful percussion.
- [ ] Motif present but not masking SFX.
- [ ] Reads as the intended room/menu identity.
- [ ] Distinct from the other themes.
- [ ] Licence and prompt-log rows complete.

### Global acceptance

- [ ] Menu + 03 + 04 + Silicon themes approved, or a recorded placeholder decision.
- [ ] All four themes pass the blind-listen adventure test: wondrous, curious, forward-moving; not horror, thriller, dread, or epic.
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

| Asset ID | Tool / model | Seed | Length | BPM | Loop points | Chosen file | Post-processing | Adventure check | Verdict | Licence |
|---|---|---|---:|---:|---|---|---|---|---|---|
| `audio.music.menu` | | | | | | | | | | |
| `audio.music.nerve_forest` | | | | | | | | | | |
| `audio.music.muscle_effector` | | | | | | | | | | |
| `audio.music.interrupt_loop` | | | | | | | | | | |

**Minimum fields:** prompt version, asset ID, tool/plan, model/seed, duration, BPM, loop points, variations, chosen file, post-processing, runtime check, adventure check (blind-listen: adventure vs horror), verdict, licence, notes.

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
