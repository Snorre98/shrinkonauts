# Audio Requirements and Generation Prompts — M3 / M3.5

> **Status:** Draft v0.2 · 3 November 2026  
> **Owner:** Snorre  
> **Scope:** All game SFX for the M3 vertical slice and the M3.5 bathroom hub  
> **Prompt version:** `audio-2026-11-03.1`  
> **Primary tool:** Ludo.ai Audio Generator (Sound Effects mode)  
> **Fallback tool:** Stability AI Stable Audio 3 Small SFX / Stable Audio 2.5

> **Scope note (2026-11-03).** This document covers the **18 SFX cues** only. Room and menu music themes are a separate **proposed extension** in [`room-and-menu-themes-v01.md`](room-and-menu-themes-v01.md) and [ADR-0076](../adr-audio/0076-room-and-menu-audio-themes.md)/[ADR-0077](../adr-audio/0077-audio-theme-playback-and-mixing.md). They are not part of the current M3/M3.5 SFX scope. The cross-discipline placeholder inventory and completion gates are in [`../assets/prompt-library-v01.md`](../assets/prompt-library-v01.md) under ADR-0078.

**Sources of truth**

- [`../m3/asset-requirements-v01.md`](../m3/asset-requirements-v01.md) — §2.1, §5.5, §6.1, §6.6, §8.23, §9.1, §10.2–10.3
- [`../m3.5/hub-asset-prompts-v01.md`](../m3.5/hub-asset-prompts-v01.md) — §3, §11, §13–14
- [`../m4/README.md`](../m4/README.md) and [`../adr-online/0052-composition-with-planned-milestones.md`](../adr-online/0052-composition-with-planned-milestones.md)
- [`../gdd/ASSET-LIST-GBL.md`](../gdd/ASSET-LIST-GBL.md) — §5
- Runtime: [`../../src/game/runtime.ts`](../../src/game/runtime.ts), [`../../src/world/hub-scene.ts`](../../src/world/hub-scene.ts), [`../../src/audio/`](../../src/audio/), [`../../src/assets/`](../../src/assets/)
- Manifests and themes: `public/packs/anatomy-reflex/`, `public/packs/silicon-reflex/`, `public/hub/bathroom/`

**Precedence.** This document consolidates the audio requirements and turns them into copy-paste prompts. It does not change scope. If this document and a milestone document disagree, the milestone document wins on scope, and this document wins on prompt wording and delivery checks.

---

## 1. Summary

| Decision | Value |
|---|---|
| Unique audio files | **18** |
| M3 anatomy cues | **11** — shared by `03-nerve-forest` and `04-muscle-effector`; Silicon reuses them |
| M3.5 hub cues | **6** — bathroom hub launch and menu |
| Optional cue | **1** — `audio.cue.wrong`; adding it makes the M3 total 33 |
| Music | **Not in this document** — the SFX pass has no music. Room/menu themes are proposed separately. |
| Themes | **4 proposed** — menu, `03`, `04`, Silicon; see [`room-and-menu-themes-v01.md`](room-and-menu-themes-v01.md) |
| Ambience | Only `audio.cue.hub.hum`, a short room-tone cue; the proposed menu theme would own the ambience bed |
| Current delivery state | **All 18 are placeholders; no audio files exist** |
| Target format | 48 kHz, OGG or MP3, mono preferred, ≤ 120 KB each |
| Target tone | Diegetic, dry, tactile, gross-cute, small-scale; sci-fi suit plus wet organic body (M3); retro laundry lab plus soft sci-fi (M3.5) |

**The one-line rule:** every cue is a short, dry, close one-shot that reads instantly in a 1280×720 browser game and never turns into music, voice, or gore.

---

## 2. Scope contract

### 2.1 In scope

| Group | Count | Asset IDs | Destination |
|---|---:|---|---|
| M3 anatomy SFX | 11 | `audio.cue.boot`, `dialogue`, `scan`, `dash`, `gate`, `map`, `debrief`, `checkpoint`, `unlock`, `jump`, `land` | `public/packs/anatomy-reflex/shared/audio/` |
| M3 optional SFX | 1 | `audio.cue.wrong` | `public/packs/anatomy-reflex/shared/audio/` |
| M3.5 hub SFX | 6 | `audio.cue.hub.click`, `hub.door`, `hub.spin`, `hub.shrink`, `hub.arrive`, `hub.hum` | `public/hub/bathroom/shared/audio/` |

### 2.2 Out of scope

| Item | Reason |
|---|---|
| Trailer music bed | The 2-minute GDD video needs music/SFX, but that is a separate licensed deliverable, not part of this SFX pass |
| Ambience bed | No separate ambience file in the SFX pass. The proposed room/menu themes may include ambient texture; `hub.hum` is a short room-tone cue. |
| Voice, speech, singing, vocal textures | All cues are non-verbal; `dialogue` is a translator blip, not a voice |
| Gore, blood, screams, pain | 12+ gross-cute tone, never horror or shock |
| Per-level duplicates | The kit is shared; 03/04/Silicon reuse the same cue IDs |
| Silicon-specific mixes | Silicon reuses the anatomy cues; the proposed `audio.music.interrupt_loop` theme carries its cold/clicky identity |
| New cue IDs | The theme vocabulary is closed; do not add `audio.cue.hazard`, `audio.cue.propReturned`, `audio.cue.footstep`, etc. |
| Footstep loops | The simulation emits jump/land/dash, not footsteps; no footstep ID exists |

### 2.3 Reuse rules

1. **One kit, many levels.** Generate the 11 M3 cues once. Do not regenerate them per level.
2. **Silicon reuses the anatomy kit.** If the Silicon pack ships, copy the same files into `public/packs/silicon-reflex/shared/audio/` and add `src` entries. Do not generate a Silicon variant.
3. **M4 audio is local.** Host and guest each play their own cues; no audio is streamed or synchronized. No new audio IDs are added for online play.
4. **No new IDs during the audio pass.** If a level needs a new sound, it is a content/engine task with an ADR, not an audio-pass improvisation.
5. **No audio-only cues.** Every cue must have a visible counterpart (see the register in §6).

---

## 3. Current state and blockers

### 3.1 No audio files exist

All 18 unique cues are placeholders across the three manifests:

- `public/packs/anatomy-reflex/assets.final.json` — 12 audio entries (11 M3 + `wrong`)
- `public/packs/silicon-reflex/assets.final.json` — 12 audio entries (reused IDs)
- `public/hub/bathroom/assets.final.json` — 6 audio entries

Every entry is `placeholder: true` with no `src`.

Only `public/packs/silicon-reflex/shared/audio/` exists, and it contains `.gitkeep` only. The anatomy and hub `shared/audio/` directories do not exist yet.

The M3 checklist item `[x] 11 M3 audio cues` is a **scope decision**, not proof of delivery. The status table still says final art/audio is deferred.

### 3.2 Final file playback is implemented

[`../../src/audio/providers.ts`](../../src/audio/providers.ts) now implements `ManifestAudioProvider`:

1. Fetch `asset.src`.
2. Decode via `context.decodeAudioData`.
3. Cache the decoded `AudioBuffer` per asset ID.
4. Play a buffer source through a per-cue volume gain.
5. Keep the synth/silent fallback for missing or failed files.

The first uncached play uses the placeholder cue while the file loads in the
background; later plays use the decoded file. Fetch/decode failures warn once
and keep the placeholder path. Dropping files into `public/` and adding `src`
entries to the manifests now makes them play.

ADR-0077 theme playback is also implemented in `src/audio/audio.ts`: the music
bus, looped buffers, crossfade, pending-until-unlock queue, pause/resume, and
warn-once silence. The four theme files are still missing, so the wired
`room.music` / `theme.audio.music` IDs currently resolve to silence.

### 3.3 First pack cue may be silent

`installAudioUnlock()` unlocks `this.activeAudio` on the first keydown/pointerdown. The hub audio is created before that gesture, but the pack audio is created after the start click. The first `boot` cue can therefore play before the pack audio context is unlocked, and `play()` returns silently. Verify this in the browser; if it happens, unlock the newly created pack audio inside the same start gesture before playing `boot`.

### 3.4 Cue labels drift from the runtime

| Cue | Document label | Actual runtime trigger |
|---|---|---|
| `dialogue` | Dialogue advance | Conversation **open** (`startConversation`, `runtime.ts:1533`); advancing a node does not play a cue |
| `gate` | Gate attempt/solve | Gate **panel opens** (`runtime.ts:1879`); solving the gate plays `unlock` |
| `scan` | Scan | Scan, feedback request, pulse, and receptor placement all reuse `scan` |
| `checkpoint` | Checkpoint | Checkpoint reached **and** hazard respawn (`runtime.ts:722`, `2357`) |
| `wrong` | Wrong answer | Wrong gate answer, rejected receptor, and blocked exit |

Decide whether these are acceptable semantic groupings. If not, they are code/content changes, not new assets.

### 3.5 `hub.hum` is an open decision

M3.5 asks whether `audio.cue.hub.hum` is an ambient loop or a one-shot. It is declared in the hub document, theme, and manifest, but `HubScene` never plays it. The manifest schema has a generic `loop` field, but the audio provider does not read it; looping requires a runtime change.

**Recommendation:** keep `hub.hum` as a short one-shot room-tone accent. The proposed menu theme (`audio.music.menu`, ADR-0076) would own the ambience bed, so `hub.hum` should not loop underneath it. If the menu theme is not accepted, the original loop-or-one-shot decision returns.

### 3.6 No loudness, mono, or format decision

The docs specify 48 kHz, OGG/MP3, ≤ 120 KB, dry, no clipping. They do not specify:

- integrated loudness or true-peak target;
- mono vs stereo;
- OGG vs MP3 as the final extension;
- head/tail silence limits.

§5 supplies recommended defaults. Treat them as production recommendations, not existing repo requirements.

### 3.7 No audio licence records

`public/packs/anatomy-reflex/licenses.json` and `public/packs/silicon-reflex/licenses.json` contain zero audio entries. The hub has no `licenses.json`; it records licences in each manifest entry. Every accepted audio file needs a licence record before it ships.

---

## 4. Sound direction

### 4.1 M3 anatomy style

Prepend this to every M3 cue:

```text
Short diegetic game sound effect, 48 kHz, dry, tactile, sci-fi suit plus wet organic body, no music, no voice, no gore, clean tail with no long reverb, no clipping.
```

### 4.2 M3.5 hub style

Prepend this to every hub cue:

```text
Short diegetic game sound effect, 48 kHz, dry, tactile, retro-futuristic laundry lab, domestic appliance plus soft sci-fi lab, no music, no voice, no gore, clean tail with no long reverb, no clipping.
```

Do not cross-use the styles. `audio.cue.wrong` belongs to the M3 anatomy kit. The hub `arrive` cue may include a tiny boot squelch, but it still uses the hub style.

### 4.3 Sound palette

| Family | Sounds | Avoid |
|---|---|---|
| Suit | soft servos, pneumatic pushes, fabric snaps, relay clicks, tiny confirmation beeps | heavy armour, gunmetal impacts, mech stomps |
| Biology | wet chirps, soft squelch, bone clunk, membrane thud, damp room tone | gore, blood, tearing meat, screams |
| UI / hub | plastic button clicks, enamel and metal clunks, appliance hum, water slosh, digital shimmer | mouse clicks, keyboard clicks, phone notifications |
| Tone | gross-cute, tactile, small-scale, deadpan | cinematic, horror, epic, 8-bit chiptune, cartoon boings |

### 4.4 Global negative (Stable Audio 3 Small SFX)

Use this as the base negative prompt, then add the cue-specific delta from each card:

```text
music, melody, song, musical bed, vocals, speech, singing, choir, intelligible words, gore, blood, screams, pain, long reverb, echo, clipping, distortion, low quality, muffled.
```

Ludo has no negative-prompt field. The global style carries the negatives; do not append the whole list to Ludo descriptions.

Stable Audio 2.5 has no negative prompt in the current API. Append this to the positive prompt instead:

```text
No music, no vocals, no speech, dry, short decay.
```

The global negative is intentionally broad. For tonal cues (`boot`, `debrief`, `unlock`, `checkpoint`), drop `melody` and `musical bed` if the generator refuses the intended two-note motif. For `wrong`, `shrink`, and `unlock`, drop `distortion` if the cue needs a distorted buzz or zap. Never drop `vocals`, `speech`, `gore`, or `clipping`.

### 4.5 Do not generate

- A music loop, soundtrack, or ambience bed **in this SFX pass**. Room/menu themes are specified separately in [`room-and-menu-themes-v01.md`](room-and-menu-themes-v01.md).
- A voice, whisper, vocal texture, or intelligible speech.
- Gore, blood, screams, pain, or body horror.
- A realistic gunshot, explosion, horror stinger, or cinematic boom.
- An 8-bit chiptune replacement for any cue. The visuals are pixel art; the audio direction is diegetic and tactile, not chiptune.
- Footsteps, hazard sounds, or `propReturned` sounds. Those cues are emitted by the simulation but are not mapped in the theme.
- Per-level, per-player, or Silicon-specific variants.
- A new cue ID.

---

## 5. Technical delivery specification

### 5.1 Format and size

| Field | Requirement |
|---|---|
| Sample rate | **48 kHz** |
| Channels | **Mono preferred**; stereo acceptable only if the width is intentional. The game has no positional audio. |
| Format | **OGG Vorbis preferred**; MP3 acceptable. Do not rename an MP3 to `.ogg`. |
| Encoding | OGG q4–q6 mono; MP3 128–192 kbps mono |
| File size | **≤ 120 KB per cue** |
| Head silence | < 20 ms |
| Tail | < 100 ms after the last audible event; no long reverb |
| Loop | Only `audio.cue.hub.hum`, and only if it is kept as the fallback room-tone loop. The proposed menu theme owns the ambience bed. |

The 120 KB budget is easy to meet: a 2 s 48 kHz mono OGG at q5 is roughly 20–30 KB. If a cue exceeds 120 KB, check the channel count, sample rate, and tail before reducing quality.

### 5.2 Duration and trimming

1. Generate at the **upper end** of the cue window, not the lower end.
2. Trim leading silence to < 20 ms so the cue feels immediate.
3. Trim the tail to < 100 ms after the last audible event.
4. Apply a **5–20 ms fade-out** to avoid a click.
5. Do not time-stretch or pitch-shift to fit the window; regenerate instead.
6. For `hub.hum`, if it is kept as the fallback room-tone loop, do not fade the loop point; crossfade or generate a seamless loop. If it is a one-shot accent, trim normally.

### 5.3 Loudness and dynamics (recommended)

The repo has no loudness spec. Use this as a consistent default:

- True peak **≤ −1 dBTP**; aim for **−3 dBFS** on one-shots.
- No clipping, no DC offset, no low-frequency rumble below 30 Hz unless it is the intended appliance hum.
- Match perceived loudness by A/B-ing in the browser at the game's default volume (0.7).
- Short clicks and UI cues should sit slightly below the action cues; `land` and `jump` should be quiet because they repeat often.
- Do not compress heavily; these are short, dry one-shots.

### 5.4 Naming and destinations

Use lowercase kebab-case, no spaces, no dots in filenames.

```text
public/packs/anatomy-reflex/
  shared/audio/
    boot.ogg
    dialogue.ogg
    scan.ogg
    dash.ogg
    gate.ogg
    map.ogg
    debrief.ogg
    checkpoint.ogg
    unlock.ogg
    jump.ogg
    land.ogg
    wrong.ogg            # optional

public/packs/silicon-reflex/
  shared/audio/          # copies of the same 12 files if the pack ships

public/hub/bathroom/
  shared/audio/
    hub-click.ogg
    hub-door.ogg
    hub-spin.ogg
    hub-shrink.ogg
    hub-arrive.ogg
    hub-hum.ogg
```

If the final format is MP3, use `.mp3` consistently and update the manifest paths. Do not mix `.ogg` and `.mp3` within one pack without a recorded reason.

### 5.5 Manifest entries

For every delivered file, add `src` and `license`, and remove `placeholder`:

```json
"audio.cue.boot": {
  "type": "audio",
  "src": "shared/audio/boot.ogg",
  "license": "Ludo AI Commercial (paid)"
}
```

Keep `placeholder: true` for any cue that is not delivered. The validator accepts declared placeholders, but a final capture should not rely on them.

### 5.6 Licence records

For anatomy and Silicon, add an entry to `licenses.json`:

```json
{
  "file": "shared/audio/boot.ogg",
  "type": "audio",
  "source": "Ludo.ai Audio Generator",
  "author": "AI-generated in Ludo.ai; sound direction by Snorre",
  "license": "Ludo AI Commercial (paid)",
  "url": "https://ludo.ai/terms-of-service",
  "modified": "Generated 2026-11-04; trimmed to 1.1 s; 48 kHz mono; peak-normalised; OGG Vorbis",
  "aiGenerated": true
}
```

For a Stability AI file, use the exact model and record the licence:

```json
{
  "file": "shared/audio/scan.ogg",
  "type": "audio",
  "source": "Stability AI Stable Audio 3 Small SFX",
  "author": "AI-generated in Stable Audio; sound direction by Snorre",
  "license": "Stability AI Community License (commercial terms pending)",
  "url": "https://stability.ai/license",
  "modified": "Generated 2026-11-04; trimmed to 0.8 s; 48 kHz mono; peak-normalised; OGG Vorbis",
  "aiGenerated": true
}
```

The hub has no `licenses.json`; add a `license` field to each hub manifest entry, or create a hub licence file and link it from the manifest. Do not ship an audio file with an unknown licence.

### 5.7 Loop rules

For the SFX pass:

- Only `audio.cue.hub.hum` may loop, and only if it is kept as a room-tone loop.
- The manifest schema has a generic `loop` field, but the audio provider does not read it; the runtime must implement looping.
- Generate a 2.0 s loop first. If the menu theme is accepted, `hub.hum` becomes a one-shot accent instead.
- Check the loop with the browser player, not only in the generator preview.
- Music themes loop by design and are covered in [`room-and-menu-themes-v01.md`](room-and-menu-themes-v01.md).

---

## 6. Cue register

All 18 files are placeholders today. The visual counterpart column is the no-audio-only check.

| # | Asset ID | Runtime event | Window | File (under `shared/audio/`) | Scope | Visual counterpart |
|---:|---|---|---:|---|---|---|
| 1 | `audio.cue.boot` | Level start / suit power | 0.6–1.2 s | `boot.ogg` | M3 required | Loading screen / room reveal |
| 2 | `audio.cue.dialogue` | Conversation opens | 0.2–0.8 s | `dialogue.ogg` | M3 required | Dialogue surface opens |
| 3 | `audio.cue.scan` | Scan / feedback / pulse / place | 0.3–1.0 s | `scan.ogg` | M3 required | Scan beam, concept card, feedback toast |
| 4 | `audio.cue.dash` | Dash starts | 0.2–0.7 s | `dash.ogg` | M3 required | Dash animation |
| 5 | `audio.cue.gate` | Gate panel opens | 0.4–1.2 s | `gate.ogg` | M3 required | Gate panel opens |
| 6 | `audio.cue.map` | Map opens | 0.3–0.9 s | `map.ogg` | M3 required | Map overlay |
| 7 | `audio.cue.debrief` | Level/pack complete | 0.4–1.2 s | `debrief.ogg` | M3 required | Debrief panel |
| 8 | `audio.cue.checkpoint` | Checkpoint / hazard respawn | 0.3–0.9 s | `checkpoint.ogg` | M3 required | "Checkpoint reached" toast / respawn |
| 9 | `audio.cue.unlock` | Gate solved / receptor bound / reward | 0.5–1.2 s | `unlock.ogg` | M3 required | Gate opens / reward toast |
| 10 | `audio.cue.jump` | Jump transition | 0.15–0.5 s | `jump.ogg` | M3 required | Jump animation |
| 11 | `audio.cue.land` | Landing transition | 0.15–0.5 s | `land.ogg` | M3 required | Land animation |
| 12 | `audio.cue.wrong` | Rejected action / wrong gate / blocked exit | 0.2–0.6 s | `wrong.ogg` | M3 optional | Error toast / feedback surface |
| 13 | `audio.cue.hub.click` | Menu selection / start | 0.05–0.15 s | `hub-click.ogg` | M3.5 required | Button pressed state |
| 14 | `audio.cue.hub.door` | Launch: door opens | 0.4–0.8 s | `hub-door.ogg` | M3.5 required | Door opens |
| 15 | `audio.cue.hub.spin` | Launch: drum spins | 1.0–2.0 s | `hub-spin.ogg` | M3.5 required | Drum spins |
| 16 | `audio.cue.hub.shrink` | Launch: shrink beam | 0.5–0.9 s | `hub-shrink.ogg` | M3.5 required | Shrink flash |
| 17 | `audio.cue.hub.arrive` | Launch: arrival | 0.3–0.8 s | `hub-arrive.ogg` | M3.5 required | Tiny astronaut appears |
| 18 | `audio.cue.hub.hum` | Declared; not played | 1.0–2.0 s | `hub-hum.ogg` | M3.5 open | None; ambience only |

---

## 7. M3 anatomy cue cards

Each card gives the cue intent, the Ludo prompt, the Stable Audio prompt, the negative delta, and the acceptance check.

**How to use a card**

- **Ludo:** Sound Effects mode, one event per prompt, Loop off, duration set by the slider, no duration in the text, prompt expansion off if the UI/API offers it.
- **Stable Audio 3 Small SFX:** prefix `TrackType: SFX,`, set duration 1 s or longer, use the global negative plus the cue delta.
- **Stable Audio 2.5:** omit the negative prompt, append the 2.5 suffix, expect more musical interpretation.
- **Global style:** prepend the M3 anatomy style from §4.1 to every Ludo prompt. The Stable prompts below already include the production character, but you may still prepend the style if the model drifts.

### 7.1 `audio.cue.boot`

- **Event:** level start / suit power (`GameRuntime.playCue("boot")`).
- **Window:** 0.6–1.2 s (the outer §5.5 window is 0.2–1.2 s).
- **Generate at:** 1.2 s.
- **File:** `shared/audio/boot.ogg`.
- **Visual counterpart:** loading screen / room reveal.
- **Ludo (Sound Effects, Loop off):**
  > Suit power-up: a soft electric hum rises, a short helmet-seal hiss, two tiny confirmation beeps. Close, dry, tactile.
- **Stable Audio 3 Small SFX:**
  > TrackType: SFX, a close-miked sci-fi suit boot sequence: a soft electric hum rising in pitch, a short helmet-seal pneumatic hiss, and two tiny confirmation beeps, dry and tactile, fast decay, no music, no voice.
- **Negative delta:** `+ music, melody, vocals, speech, long reverb, cinematic boom, clipping.`
- **Accept:** audible attack under 50 ms; ends by 1.2 s; no musical tail; no voice; no long hiss.
- **Reject:** a rising musical note, a cinematic riser, a long helmet hiss, or a chime sequence that sounds like a menu.

### 7.2 `audio.cue.dialogue`

- **Event:** conversation opens (`startConversation`, `runtime.ts:1533`); not each advance.
- **Window:** 0.2–0.8 s.
- **Generate at:** 0.8 s.
- **File:** `shared/audio/dialogue.ogg`.
- **Visual counterpart:** dialogue surface opens.
- **Ludo:**
  > A friendly cell-speech translator blip: a wet organic chirp followed by a soft radio static tick. Close, dry, very short.
- **Stable Audio 3 Small SFX:**
  > TrackType: SFX, a short friendly alien cell-speech translator: a wet organic chirp, a soft radio-static blip, close and dry, fast decay, no voice, no intelligible speech.
- **Negative delta:** `+ voice, speech, words, robotic dialogue, long reverb.`
- **Accept:** non-verbal; friendly, not comedic; short; no intelligible words.
- **Reject:** a voice line, a robot saying a word, a long radio drama tail.

### 7.3 `audio.cue.scan`

- **Event:** scan, feedback request, pulse, and receptor placement (`runtime.ts` multiple call sites).
- **Window:** 0.3–1.0 s.
- **Generate at:** 1.0 s.
- **File:** `shared/audio/scan.ogg`.
- **Visual counterpart:** scan beam, concept card, feedback toast.
- **Ludo:**
  > A scanner sweep: a high sonar ping, a tiny data tick, and a faint shimmer. Close, dry, clean.
- **Stable Audio 3 Small SFX:**
  > TrackType: SFX, a sci-fi scanner sweep: a clean high sonar ping with a tiny digital data tick and a faint shimmering tail, close and dry, short decay, no music, no voice.
- **Negative delta:** `+ alarm, siren, long reverb, melody.`
- **Accept:** reads as a scan, not an alarm; survives repetition; no musical note sequence.
- **Reject:** a rising siren, a two-note melody, a long sonar tail that overlaps the next cue.

### 7.4 `audio.cue.dash`

- **Event:** dash starts (`stepRoomSimulationWithCues`).
- **Window:** 0.2–0.7 s.
- **Generate at:** 0.7 s.
- **File:** `shared/audio/dash.ogg`.
- **Visual counterpart:** dash animation.
- **Ludo:**
  > A suit thruster dash: a short air puff, a fabric snap, and a quick whoosh. Close, dry.
- **Stable Audio 3 Small SFX:**
  > TrackType: SFX, a short suit-thruster dash: a compact air puff, a fabric snap, and a quick whoosh, close and dry, fast decay, no music, no voice.
- **Negative delta:** `+ jet engine roar, explosion, long reverb.`
- **Accept:** fast attack; ends quickly; distinct from jump; no explosion.
- **Reject:** a jet takeoff, a rocket boom, a long whoosh.

### 7.5 `audio.cue.gate`

- **Event:** gate panel opens (`runtime.ts:1879`); solving the gate plays `unlock`.
- **Window:** 0.4–1.2 s.
- **Generate at:** 1.2 s.
- **File:** `shared/audio/gate.ogg`.
- **Visual counterpart:** gate panel opens.
- **Ludo:**
  > An organic lock release: a wet squelch, a bone clunk, and a soft chime; not gory. Close, dry.
- **Stable Audio 3 Small SFX:**
  > TrackType: SFX, an organic sci-fi lock release: a soft wet squelch, a hollow bone clunk, and a small clean chime, tactile and dry, not gory, fast decay, no music, no voice.
- **Negative delta:** `+ gore, blood, meat, scream, long reverb.`
- **Accept:** gross-cute, not gory; the bone clunk is hollow, not a gunshot; the chime is short.
- **Reject:** tearing flesh, a wet gore splat, a gunshot, a long cathedral chime.

### 7.6 `audio.cue.map`

- **Event:** map opens (`toggleMap`).
- **Window:** 0.3–0.9 s.
- **Generate at:** 0.9 s.
- **File:** `shared/audio/map.ogg`.
- **Visual counterpart:** map overlay.
- **Ludo:**
  > A holographic map unfolds: a soft digital shimmer, a tiny chime, and a paper-like flap. Close, dry.
- **Stable Audio 3 Small SFX:**
  > TrackType: SFX, a holographic map unfolding: a soft digital shimmer, a tiny glass chime, and a light paper-like flap, close and dry, short decay, no music, no voice.
- **Negative delta:** `+ paper crumple, alarm, long reverb, melody.`
- **Accept:** subtle; reads as an unfold; no notification alarm; short.
- **Reject:** a phone notification, a loud paper crumple, a musical arpeggio.

### 7.7 `audio.cue.debrief`

- **Event:** level complete or pack complete (`enterDebrief`, `complete`).
- **Window:** 0.4–1.2 s.
- **Generate at:** 1.2 s.
- **File:** `shared/audio/debrief.ogg`.
- **Visual counterpart:** debrief panel.
- **Ludo:**
  > A warm two-note synth chime with a soft suit confirmation click. Close, dry.
- **Stable Audio 3 Small SFX:**
  > TrackType: SFX, a warm two-note synth chime resolution with a soft suit confirmation click, gentle and clean, dry, short decay, no music bed, no voice.
- **Negative delta:** `+ fanfare, applause, song, long reverb.`
- **Accept:** exactly two notes; short; a resolution, not a fanfare.
- **Reject:** a full chord progression, an applause bed, a victory fanfare, a music loop.

### 7.8 `audio.cue.checkpoint`

- **Event:** checkpoint reached or hazard respawn.
- **Window:** 0.3–0.9 s.
- **Generate at:** 0.9 s.
- **File:** `shared/audio/checkpoint.ogg`.
- **Visual counterpart:** "Checkpoint reached" toast / respawn.
- **Ludo:**
  > A beacon ping: a clean pulse and a small save confirmation. Close, dry.
- **Stable Audio 3 Small SFX:**
  > TrackType: SFX, a checkpoint beacon: a clean single pulse with a small digital save confirmation, close and dry, short decay, no music, no voice.
- **Negative delta:** `+ alarm, siren, long reverb, melody.`
- **Accept:** a clean single pulse; no alarm; short.
- **Reject:** a two-tone alarm, a long beacon tail, a musical ping.

### 7.9 `audio.cue.unlock`

- **Event:** gate solved, receptor bound, or reward granted.
- **Window:** 0.5–1.2 s.
- **Generate at:** 1.2 s.
- **File:** `shared/audio/unlock.ogg`.
- **Visual counterpart:** gate opens / reward toast / ability unlock.
- **Ludo:**
  > An ability unlock: a rising synth, a short nerve zap, and a satisfying click. Close, dry.
- **Stable Audio 3 Small SFX:**
  > TrackType: SFX, a satisfying ability unlock: a rising synth tone, a short electric nerve zap, and a clean mechanical click, dry and tactile, fast decay, no music, no voice.
- **Negative delta:** `+ fanfare, explosion, long reverb.`
- **Accept:** rising but short; distinct from `debrief`; no fanfare.
- **Reject:** a long riser, a victory theme, an explosion.

### 7.10 `audio.cue.jump`

- **Event:** jump transition.
- **Window:** 0.15–0.5 s.
- **Generate at:** 0.5 s.
- **File:** `shared/audio/jump.ogg`.
- **Visual counterpart:** jump animation.
- **Ludo:**
  > A suit servo jump: a soft pneumatic push and a tiny fabric movement. Close, dry, very short.
- **Stable Audio 3 Small SFX:**
  > TrackType: SFX, a soft suit-servo jump: a compact pneumatic push and a tiny fabric rustle, close and dry, very fast decay, no music, no voice.
- **Negative delta:** `+ spring boing, cartoon bounce, long reverb.`
- **Accept:** very short; quiet; distinct from dash; no cartoon boing.
- **Reject:** a spring, a Mario-style boing, a long whoosh.

### 7.11 `audio.cue.land`

- **Event:** landing transition.
- **Window:** 0.15–0.5 s.
- **Generate at:** 0.5 s.
- **File:** `shared/audio/land.ogg`.
- **Visual counterpart:** land animation.
- **Ludo:**
  > Boots land on wet tissue: a soft squelch and a suit thud, no gore. Close, dry, very short.
- **Stable Audio 3 Small SFX:**
  > TrackType: SFX, a soft landing on wet organic tissue: a gentle squelch and a suit thud, tactile and dry, not gory, very fast decay, no music, no voice.
- **Negative delta:** `+ gore, blood, splatter, scream, long reverb.`
- **Accept:** soft; not gory; short; quiet enough to repeat.
- **Reject:** a wet gore splat, a heavy stomp, a pain grunt.

---

## 8. M3.5 hub cue cards

Use the hub style from §4.2, not the anatomy style.

### 8.1 `audio.cue.hub.click`

- **Event:** menu selection / start (hub boot calls).
- **Window:** 0.05–0.15 s.
- **Generate at:** 0.1 s (Ludo shortest setting); Stable Audio 1 s then trim.
- **File:** `shared/audio/hub-click.ogg`.
- **Visual counterpart:** button pressed state.
- **Ludo:**
  > A single chunky plastic control-panel button press: a dry tactile click and a tiny relay tick, very short. Close.
- **Stable Audio 3 Small SFX:**
  > TrackType: SFX, a single chunky plastic control-panel button press: a dry tactile click with a tiny relay tick, close and dry, extremely short decay, no music, no voice.
- **Negative delta:** `+ mouse click, keyboard, click track, long reverb.`
- **Accept:** very short; quiet; plastic and chunky, not a mouse.
- **Reject:** a mouse click, a keyboard key, a double click, a long tail.

### 8.2 `audio.cue.hub.door`

- **Event:** launch sequence, door opens (`HubScene.playLaunch`).
- **Window:** 0.4–0.8 s.
- **Generate at:** 0.8 s.
- **File:** `shared/audio/hub-door.ogg`.
- **Visual counterpart:** door opens.
- **Ludo:**
  > A heavy washing-machine porthole door unlatches and swings open: a metal latch clunk, a soft pneumatic hiss, and a hollow enamel resonance. Close, dry.
- **Stable Audio 3 Small SFX:**
  > TrackType: SFX, a heavy retro washing-machine porthole door unlatching and swinging open: a metal latch clunk, a soft pneumatic hiss, and a hollow enamel resonance, close and dry, short decay, no music, no voice.
- **Negative delta:** `+ door slam, glass break, long reverb, gore.`
- **Accept:** one door event; metal plus enamel; short; no glass.
- **Reject:** a bank-vault slam, breaking glass, a long industrial echo.

### 8.3 `audio.cue.hub.spin`

- **Event:** launch sequence, drum spins up.
- **Window:** 1.0–2.0 s.
- **Generate at:** 2.0 s.
- **File:** `shared/audio/hub-spin.ogg`.
- **Visual counterpart:** drum spins.
- **Ludo:**
  > A retro washing-machine drum spins up: a low electric motor hum rising, water slosh, and a faint metal rattle, one-shot. Close, dry.
- **Stable Audio 3 Small SFX:**
  > TrackType: SFX, a retro washing-machine drum spinning up: a low electric motor hum rising in pitch, a small water slosh, and a faint metal rattle, mechanical and dry, one-shot with a clean stop, no music, no voice.
- **Negative delta:** `+ factory, jet engine, long reverb, music.`
- **Accept:** rises and stops within 2 s; domestic scale; no industrial roar.
- **Reject:** a jet turbine, a factory floor, a musical rhythm.

### 8.4 `audio.cue.hub.shrink`

- **Event:** launch sequence, shrink beam fires.
- **Window:** 0.5–0.9 s.
- **Generate at:** 0.9 s.
- **File:** `shared/audio/hub-shrink.ogg`.
- **Visual counterpart:** shrink flash.
- **Ludo:**
  > A sci-fi shrink beam fires: a descending electric zap, a suit power surge, and a soft flash whoosh, not painful. Close, dry.
- **Stable Audio 3 Small SFX:**
  > TrackType: SFX, a sci-fi shrink-beam firing: a descending electric zap, a brief suit power surge, and a soft flash whoosh, playful and not painful, dry, fast decay, no music, no voice, no gore.
- **Negative delta:** `+ scream, pain, explosion, long reverb.`
- **Accept:** playful; not painful; short; reads as shrink, not teleport.
- **Reject:** a scream, a painful zap, a big explosion, a long sci-fi riser.

### 8.5 `audio.cue.hub.arrive`

- **Event:** launch sequence, tiny astronaut arrives.
- **Window:** 0.3–0.8 s.
- **Generate at:** 0.8 s.
- **File:** `shared/audio/hub-arrive.ogg`.
- **Visual counterpart:** tiny astronaut appears.
- **Ludo:**
  > A tiny astronaut arrives on a wet bathroom floor: a soft high chime, a tiny boot squelch, and a microscopic room tone. Close, dry.
- **Stable Audio 3 Small SFX:**
  > TrackType: SFX, a tiny astronaut arriving on a wet bathroom floor: a soft high chime, a tiny boot squelch, and a very small damp room tone, close and dry, short decay, no music, no voice.
- **Negative delta:** `+ large hall, long reverb, gore, music.`
- **Accept:** tiny scale; no big reverb; short; the room tone is microscopic.
- **Reject:** a cathedral reverb, a normal-sized footstep, a musical sparkle.

### 8.6 `audio.cue.hub.hum`

- **Event:** declared in the hub, never played. Proposed role: a short one-shot room-tone accent; the menu theme (`audio.music.menu`) would own the ambience bed.
- **Window:** 1.0–2.0 s.
- **Generate at:** 2.0 s (one-shot) or 2.0 s loop if it is kept as the fallback ambience bed.
- **File:** `shared/audio/hub-hum.ogg`.
- **Visual counterpart:** none; it is background texture and carries no information. If the menu theme is accepted, keep it as a one-shot accent or retire it.
- **Ludo (Loop off for the one-shot role; Loop on only for the fallback bed):**
  > A warm laundry-lab room tone: a low appliance hum, a faint pipe tick, and a distant water drip, close and dry. One-shot accent.
- **Stable Audio 3 Small SFX:**
  > TrackType: SFX, a warm laundry-lab room tone: a steady low appliance hum, a faint pipe tick, and a distant water drip, close and dry, one-shot accent, no music, no voice.
- **Negative delta:** `+ melody, loud machinery, silence, long reverb.`
- **Accept:** one-shot: clean tail, no music, low level. Loop variant: seamless, no audible seam.
- **Reject:** a musical pad, a loud engine, a silent room, a one-shot with a long tail.
- **Note:** if the menu theme is not accepted and this becomes the ambience bed, use Loop on and extend to 4–8 s as a recorded spec change. Do not loop it underneath the menu theme.

---

## 9. Optional cue: `audio.cue.wrong`

Add this only if the capture needs explicit wrong-answer feedback. It uses the M3 anatomy style from §4.1 and makes the M3 total 33.

- **Event:** rejected receptor, wrong gate answer, blocked exit.
- **Window:** 0.2–0.6 s.
- **Generate at:** 0.6 s.
- **File:** `shared/audio/wrong.ogg`.
- **Visual counterpart:** error toast / feedback surface.
- **Ludo:**
  > A wrong-answer feedback: a short dry buzz and a soft suit click. Close, dry.
- **Stable Audio 3 Small SFX:**
  > TrackType: SFX, a short wrong-answer feedback: a dry low buzz and a soft suit click, close and dry, fast decay, no voice, no music.
- **Negative delta:** `+ voice, speech, harsh alarm, long reverb.`
- **Accept:** short; dry; not harsh; no voice; distinct from `checkpoint`.
- **Reject:** a game-show buzzer, a harsh alarm, a voice saying "wrong".

---

## 10. Tool guide

**Tool references**

- Ludo Audio Generator docs: <https://ludo.ai/docs/audio-generator>
- Ludo sound-effects guide: <https://ludo.ai/docs/audio-generator/sound-effects>
- Stable Audio 3 prompt guide: <https://kb.stability.ai/knowledge-base/stable-audio-3-prompt-guide>
- Stable Audio 2.5 prompt guide: <https://kb.stability.ai/knowledge-base/stable-audio-2.5-prompt-guide>

### 10.1 Ludo.ai Audio Generator

| Setting | Value |
|---|---|
| Mode | Sound Effects |
| Prompt | One event per prompt; source, material, action, space; no duration in the text |
| Duration | Use the slider; do not write the duration in the prompt |
| Loop | Off for every cue. If `hub.hum` is kept as the fallback ambience bed, Loop on for that cue only. |
| Output | MP3 |
| Cost | 2 credits per SFX; 3 per remix |
| Prompt expansion | On by default; turn it off via the API if results drift, or reject results that add music/voice |
| Variations | Generate 2–4; use Remix only after a clear direction is chosen |

Ludo-specific rules:

- Do not write "0.8 seconds" in the description; set the slider.
- Do not use emotional metaphors such as "a sad sound"; describe the source and action.
- Keep one event per prompt. If a compound cue is muddled, generate the layers separately and mix them in post; do not add a new asset ID.
- Use Loop only if `hub.hum` is kept as the fallback ambience bed. A looped one-shot will sound wrong in the game.
- Ludo returns MP3; check the sample rate and resample to 48 kHz if needed. Do not rename the extension.
- Ludo's prompt expansion may add music or voice. If it does, remix or turn expansion off.

**Budget:** 18 first-pass SFX × 2 credits = **36 credits** (11 M3 + 6 hub + 1 optional). Remixes cost 3 credits each. Ludo Indie includes 250 credits/month, so the full pass is comfortably within budget.

### 10.2 Stability AI Stable Audio 3 Small SFX

| Setting | Value |
|---|---|
| Model | `stable-audio-3-small-sfx` (preferred for SFX) |
| Prompt prefix | `TrackType: SFX,` |
| Duration | 1–120 s; generate at least 1 s, then trim |
| Negative prompt | Use the global negative plus the cue delta |
| Prompt expansion | Off by default; keep it off for repeatable SFX |
| Output | WAV or MP3 depending on the provider; confirm the delivered sample rate and resample to 48 kHz |
| Licence | Stability AI Community License; commercial use may require a separate licence |

Stable-specific rules:

- Always resample to 48 kHz. Stability models commonly output 44.1 kHz; confirm the exact provider output.
- Use the negative prompt; it is the main advantage over Ludo for keeping music and voice out.
- Stable Audio's minimum is 1 s, so generate 1 s for every cue whose window ends below 1 s and trim. For `hub.click`, use Ludo if the Stable model places the click too late.
- Use a fixed seed when iterating so you can compare prompt changes, not random variation.
- Stable Audio 2.5 is music-focused. Use it only for the tonal cues (`boot`, `scan`, `map`, `debrief`, `checkpoint`, `unlock`, `shrink`, `arrive`, `wrong`) if Small SFX sounds too literal. It has no negative prompt in the current API; append the 2.5 suffix.

### 10.3 Model routing

| Cue family | First choice | Fallback |
|---|---|---|
| Foley: dash, gate, jump, land, hub click, door, spin, hum | Ludo Sound Effects or Stable Audio 3 Small SFX | The other tool |
| Tonal: boot, scan, map, debrief, checkpoint, unlock, shrink, arrive, wrong | Ludo Sound Effects | Stable Audio 2.5 if more musicality is wanted |
| Very short: hub click, jump, land | Ludo (duration slider) | Stable Audio 3 Small SFX, generate 1 s and trim |
| Room tone: hub hum | Ludo one-shot (Loop off) | Stable Audio 3 Small SFX one-shot; use Loop on only for the fallback ambience bed |

### 10.4 Variations, seeds, and retries

- Generate 2–4 variations per cue.
- Keep the first acceptable file; do not chase perfection on a 0.3 s cue.
- Keep failed rows in the prompt log; do not overwrite history.
- Maximum two prompt revisions per cue before changing tool or accepting a placeholder.
- Record the exact model, seed, duration, and negative prompt for the chosen file.
- If a cue cannot be approved after two revisions, use the synth fallback and mark it as a placeholder. A coherent placeholder build is better than a half-finished final build.

---

## 11. Generation order and approval gates

| Stage | Generate | Gate |
|---|---|---|
| 0 | Implement or verify the manifest audio provider | A test file with `src` plays; no `AUDIO_FILE_PROVIDER_STUB` warning |
| 1 | Pilot: `boot`, `scan`, `jump`, `land` | Approve the timbre, level, and tail in the browser at 0.7 volume |
| 2 | Remaining M3: `dash`, `gate`, `dialogue`, `unlock`, `debrief`, `checkpoint`, `map` | Each cue passes duration, size, and no-music/no-voice checks |
| 3 | Hub: `click`, `door`, `spin`, `shrink`, `arrive`, `hum` | Launch sequence reads as one coherent event; hum loops if wired |
| 4 | Optional: `wrong` | Only if the capture needs explicit failure feedback |
| 5 | Integration | Manifest, licences, mute/volume, first-gesture unlock, no audio-only cues |

Do not batch all 18 before the pilot is approved. The pilot is the audio style anchor.

---

## 12. Post-processing and QA

### 12.1 Required steps

1. **Trim** the head to < 20 ms and the tail to < 100 ms after the last audible event.
2. **Resample** to 48 kHz.
3. **Downmix** to mono unless stereo width is intentional.
4. **Remove DC offset** and, if needed, high-pass at 30–40 Hz. Do not remove an intended appliance hum.
5. **Fade out** over 5–20 ms to avoid a click.
6. **Normalise** to a true peak of −1 dBTP or lower; aim for −3 dBFS on one-shots.
7. **Encode** to OGG Vorbis q4–q6 mono, or MP3 128–192 kbps mono.
8. **Check** duration, file size, sample rate, channels, and loop seam.
9. **A/B** in the browser at the game's default volume.
10. **Record** the prompt, model, seed, duration, post-processing, and licence in the prompt log.

### 12.2 Per-file acceptance

- [ ] File exists at the exact path; manifest `src` matches; `placeholder` removed.
- [ ] Duration inside the cue window.
- [ ] Audible attack under 50 ms; tail under 100 ms; no long reverb.
- [ ] 48 kHz; mono or intentional stereo; OGG or MP3.
- [ ] ≤ 120 KB.
- [ ] No clipping; true peak ≤ −1 dBTP; no DC offset.
- [ ] No music, voice, intelligible speech, or gore.
- [ ] Cue reads as the intended event at browser volume.
- [ ] Cue is distinct from its neighbours (jump vs dash, gate vs unlock, checkpoint vs wrong).
- [ ] `hub.hum` loops seamlessly if looped; otherwise Loop is off.

### 12.3 Global acceptance

- [ ] All 11 M3 cues approved, or a recorded placeholder decision.
- [ ] All 6 hub cues approved, or a recorded placeholder decision.
- [ ] `wrong` is either delivered or explicitly kept placeholder.
- [ ] No music or ambience bed was added as part of the **SFX pass**; the proposed themes are tracked separately.
- [ ] No new cue IDs were added.
- [ ] Silicon reuses the anatomy files if the pack ships.
- [ ] Every cue has a visual counterpart; mute does not remove meaning.
- [ ] Prompt log complete for every accepted file.
- [ ] Licence record exists for every accepted file.

---

## 13. Integration checklist

### 13.1 Runtime

- [x] Implement `ManifestAudioProvider`: fetch, decode, cache, play; keep the synth fallback.
- [x] Add a test that a manifest audio asset with `src` plays a buffer and does not emit `AUDIO_FILE_PROVIDER_STUB`.
- [ ] Verify the first `boot` cue after pack start. If it is silent, unlock the new pack audio inside the start gesture.
- [ ] Verify mute and volume apply to hub and pack audio.
- [ ] Verify mute/volume persist across reload (`shrinkonauts.audio` and settings).
- [ ] Verify a missing file falls back to the synth without crashing.
- [ ] Verify no audio-only cue: play the game muted and confirm every event has a visual.
- [ ] Verify co-op: each client plays its own local cues; no audio is streamed.

### 13.2 Content

- [ ] Add `src` and `license` to `public/packs/anatomy-reflex/assets.final.json` for delivered cues.
- [ ] Add `src` and `license` to `public/hub/bathroom/assets.final.json` for delivered hub cues.
- [ ] If Silicon ships, copy the anatomy files to `public/packs/silicon-reflex/shared/audio/` and add `src` entries.
- [ ] Add audio entries to `public/packs/anatomy-reflex/licenses.json` and `public/packs/silicon-reflex/licenses.json`.
- [ ] Add hub licence records (manifest `license` field or a hub `licenses.json`).
- [ ] Keep `placeholder: true` for any cue not delivered.
- [ ] Keep `hub.hum` as a one-shot accent if the menu theme is accepted; otherwise decide loop vs one-shot.
- [ ] Decide `wrong`: deliver it or keep it placeholder.

### 13.3 Verification commands

Run from the repository root:

```bash
npm run pack:validate
npm run pack:smoke
npm run build
npm run smoke:e2e
```

Then run the browser smoke and listen manually. The automated tests cannot judge whether a cue sounds right.

---

## 14. Prompt log

Keep a separate spreadsheet or this table. Do not overwrite failed rows; add a new row for each retry. The log is the evidence for the AI-generated asset record and the GDD/video asset list.

| Asset ID | Tool / model | Seed | Duration | Variations | Chosen file | Post-processing | Runtime check | Verdict | Licence |
|---|---|---|---:|---:|---|---|---|---|---|
| `audio.cue.boot` | | | | | | | | | |
| `audio.cue.dialogue` | | | | | | | | | |
| `audio.cue.scan` | | | | | | | | | |
| `audio.cue.dash` | | | | | | | | | |
| `audio.cue.gate` | | | | | | | | | |
| `audio.cue.map` | | | | | | | | | |
| `audio.cue.debrief` | | | | | | | | | |
| `audio.cue.checkpoint` | | | | | | | | | |
| `audio.cue.unlock` | | | | | | | | | |
| `audio.cue.jump` | | | | | | | | | |
| `audio.cue.land` | | | | | | | | | |
| `audio.cue.wrong` | | | | | | | | | |
| `audio.cue.hub.click` | | | | | | | | | |
| `audio.cue.hub.door` | | | | | | | | | |
| `audio.cue.hub.spin` | | | | | | | | | |
| `audio.cue.hub.shrink` | | | | | | | | | |
| `audio.cue.hub.arrive` | | | | | | | | | |
| `audio.cue.hub.hum` | | | | | | | | | |

**Minimum fields for every accepted file:** prompt version, asset ID, tool and plan, model/seed, duration, variations, chosen file, post-processing, runtime check, verdict, licence, notes.

---

## 15. Traceability

| Requirement | Source |
|---|---|
| 11 M3 cue IDs and events | `docs/m3/asset-requirements-v01.md` §2.1, §5.5, §8.23 |
| M3 durations | `docs/m3/asset-requirements-v01.md` §8.23 |
| M3 48 kHz / OGG or MP3 | `docs/m3/asset-requirements-v01.md` §6.1 |
| M3 ≤ 120 KB per cue | `docs/m3/asset-requirements-v01.md` §6.6 |
| M3 dry / no music / no voice / no gore | `docs/m3/asset-requirements-v01.md` §8.23 |
| M3 no audio-only cue | `docs/m3/asset-requirements-v01.md` §9.1 |
| M3 licence and prompt log | `docs/m3/asset-requirements-v01.md` §10.2–10.3 |
| M3 credit budget (11 × 2 = 22) | `docs/m3/asset-requirements-v01.md` §11.1 |
| 6 hub cue IDs, durations, paths | `docs/m3.5/hub-asset-prompts-v01.md` §3, §11 |
| Hub ≤ 120 KB per cue | `docs/m3.5/hub-asset-prompts-v01.md` §14 |
| Hub licence and prompt log | `docs/m3.5/hub-asset-prompts-v01.md` §14–15 |
| `hub.hum` open decision | `docs/m3.5/hub-asset-prompts-v01.md` §1, §16 |
| Runtime cue triggers | `src/game/runtime.ts`, `src/world/hub-scene.ts` |
| Manifest audio provider stub | `src/audio/providers.ts` |
| Placeholder synth specs | `src/assets/placeholder-provider.ts` |
| M4 local audio / no streaming | `docs/m4/README.md`, `docs/adr-online/0052-composition-with-planned-milestones.md` |
| GDD "no music or ambience" | `docs/gdd/ASSET-LIST-GBL.md` §5 |
| GDD video music/SFX requirement | `docs/gdd/gbl/gbl-course-requirements.md` L-V3 |
| Room/menu themes (proposed) | `docs/adr-audio/0076-room-and-menu-audio-themes.md`, `docs/adr-audio/0077-audio-theme-playback-and-mixing.md`, `docs/audio/room-and-menu-themes-v01.md` |

---

## 16. Open decisions

| # | Decision | Recommendation | Owner |
|---:|---|---|---|
| 1 | Is `hub.hum` ambience or a one-shot? | Keep it as a one-shot accent; the proposed menu theme owns the ambience bed | Snorre |
| 2 | Is `wrong` in the M3 delivery? | Deliver it; it completes the feedback vocabulary and makes the total 33 | Snorre |
| 3 | OGG or MP3 final? | OGG Vorbis mono 48 kHz; if Ludo returns MP3, keep MP3 and update paths | Snorre |
| 4 | Mono or stereo? | Mono for all one-shots; no positional audio | Snorre |
| 5 | Loudness target? | True peak ≤ −1 dBTP, aim −3 dBFS, match by ear at 0.7 volume | Snorre |
| 6 | Implement the manifest audio provider before or after generation? | Before integration; generation can proceed in parallel | Snorre |
| 7 | Stability AI licence for commercial use? | Use Ludo Indie for the documented paid path; record Stability terms before shipping | Snorre |
| 8 | Silicon copies? | Copy the 12 anatomy files into the Silicon pack if it ships | Snorre |
| 9 | `dialogue` on open or on advance? | Keep on open; per-advance would be noisy and needs a code change | Snorre |
| 10 | `gate` on open and `unlock` on solve? | Keep the split; it matches the current runtime | Snorre |
| 11 | Room/menu themes? | Proposed in ADR-0076/0077 and `room-and-menu-themes-v01.md`; accept before implementation | Snorre |

---

## 17. Change log

| Date | Change |
|---|---|
| 2026-11-03 | Initial consolidated audio requirement and prompt sheet. Adds the 18-cue register, M3 and M3.5 cue cards, Ludo/Stability tool guide, delivery spec, integration checklist, prompt log, and open decisions. |
| 2026-11-03 | Link the proposed room/menu theme extension (ADR-0076/0077, `room-and-menu-themes-v01.md`); keep the 18-cue SFX scope unchanged. |
