# Audio Requirements and Generation Prompts — M3 / M3.5

> **Status:** Draft v0.5 (partial delivery) · 3 November 2026  
> **Owner:** Snorre  
> **Scope:** All game SFX for the M3 vertical slice and the M3.5 bathroom hub  
> **Prompt version:** `audio-2026-11-03.3`  
> **Primary tool:** Stable Audio 3 Small SFX — **fully local** (fleet daemon `stable-audio-3-small-sfx`, `127.0.0.1:8100`; see §10.2 and `scripts/sfx-generate.ts`)  
> **Fallback tool:** Ludo.ai Audio Generator for a specific hero cue only (2 revisions failed); otherwise the synth placeholder. No cloud pipeline.  
> **Licence:** Stability AI Community License — free for this non-commercial coursework; outputs owned by the generator; `LICENSE.md`/`LICENSE_GEMMA.md`/`NOTICE` retained in the model snapshot.

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
| Current delivery state | **3/18 installed (`scan`, `jump`, `land`); `boot` declared placeholder; remaining 14 pending the mixer/compiler** |
| Next step | Audio mixer/compiler — research, design, implement; boot first |
| Target format | 48 kHz, **MP3 160 kbps mono**, ≤ 120 KB each |
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

### 3.1 Pilot audio installed; batch pending

Three pilot cues are installed and wired in the anatomy and Silicon manifests:
`scan`, `jump`, `land`. Each has `src`, `license`, no `placeholder`, an entry in
`licenses.json`, and an accepted row in the prompt log. `boot` is a declared
placeholder (see §7.1). The remaining 14 cues are still placeholders and await
the mixer/compiler pass.

`public/packs/anatomy-reflex/shared/audio/` and
`public/packs/silicon-reflex/shared/audio/` now contain the three pilot files;
`public/hub/bathroom/shared/audio/` is still empty.

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

### 3.5 `hub.hum` is a one-shot accent (decided v0.5)

`audio.cue.hub.hum` is delivered as a short one-shot room-tone accent. The proposed menu theme (`audio.music.menu`, ADR-0076) owns the ambience bed, so `hub.hum` does not loop underneath it. The manifest schema keeps the generic `loop` field unused for this cue.

### 3.6 Delivery decisions (v0.5)

The v0.5 delivery closes the format and loudness questions:

- final format: **MP3 160 kbps mono at 48 kHz** (this toolchain's ffmpeg has no libvorbis);
- loudness: **−5 dBFS sample peak target**, verified **≤ −1 dBTP** after MP3 encoding;
- **mono** for all one-shots; no positional audio;
- head/tail: **< 20 ms / < 100 ms**.

§5 records the exact chain; §12 records the acceptance checks.

### 3.7 Audio licence records

The three pilot cues have licence records: anatomy and Silicon entries live in `licenses.json`, and the prompt log carries the same Stability AI Community License. The hub records its licence in each manifest entry once the hub cues are delivered. `boot` remains a placeholder and has no licence record until it is delivered.

---

## 4. Sound direction

### 4.1 M3 anatomy style

This is the design intent for the M3 kit and the **Stable Audio** style. Use the Ludo prompts in §7 exactly as written; do not prepend this block to them. It contains delivery specs and negatives that Ludo cannot act on and that dilute the sound description.

```text
Short diegetic game sound effect, 48 kHz, dry, tactile, sci-fi suit plus wet organic body, no music, no voice, no gore, clean tail with no long reverb, no clipping.
```

### 4.2 M3.5 hub style

This is the design intent for the hub and the **Stable Audio** style. Use the Ludo prompts in §8 exactly as written; do not prepend this block to them.

```text
Short diegetic game sound effect, 48 kHz, dry, tactile, retro-futuristic laundry lab, domestic appliance plus soft sci-fi lab, no music, no voice, no gore, clean tail with no long reverb, no clipping.
```

Do not cross-use the styles. `audio.cue.wrong` belongs to the M3 anatomy kit. The hub `arrive` cue may include a tiny boot squelch, but it still uses the hub style.

**Ludo style anchor (optional).** If a Ludo prompt feels bare after editing, append `Close, dry, small-scale, tactile.` Do not add sample-rate, file-size, or negative-prompt language.

### 4.3 Sound palette

| Family | Sounds | Avoid |
|---|---|---|
| Suit | soft servos, pneumatic pushes, fabric snaps, relay clicks, tiny confirmation beeps | heavy armour, gunmetal impacts, mech stomps |
| Biology | wet chirps, soft squelch, bone clunk, membrane thud, damp room tone | gore, blood, tearing meat, screams |
| UI / hub | plastic button clicks, enamel and metal clunks, appliance hum, water slosh, digital shimmer | mouse clicks, keyboard clicks, phone notifications |
| Tone | gross-cute, tactile, small-scale, deadpan | cinematic, horror, epic, 8-bit chiptune SFX, cartoon boings |

### 4.4 Global negative (Stable Audio 3 Small SFX)

Use this as the base negative prompt, then add the cue-specific delta from each card:

```text
music, melody, song, musical bed, vocals, speech, singing, choir, intelligible words, gore, blood, screams, pain, long reverb, echo, clipping, distortion, low quality, muffled.
```

Ludo has no negative-prompt field. Do not append this list to Ludo descriptions. The SFX mode, Loop off, and the positive prompt wording carry the intent; reject takes that add music, voice, or extra layers.

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
- An 8-bit chiptune replacement for any **SFX cue**. The SFX stay diegetic and tactile; the separate music themes use a biological cyberpunk dungeon palette (minor-key, 4/4, detuned piano/mallets, dirty bass, simple drums, synth/radio/relay textures, lo-fi). Do not apply the theme's chip timbres to the SFX.
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
| Format | **MP3 160 kbps mono** (decided v0.5; this machine's ffmpeg has no libvorbis). Do not rename an MP3 to `.ogg`. |
| Encoding | MP3 160 kbps mono, 48 kHz |
| File size | **≤ 120 KB per cue** |
| Head silence | < 20 ms |
| Tail | < 100 ms after the last audible event; no long reverb |
| Loop | Only `audio.cue.hub.hum`, and only if it is kept as the fallback room-tone loop. The proposed menu theme owns the ambience bed. |

The 120 KB budget is easy to meet: a 2 s 48 kHz mono MP3 at 160 kbps is roughly 40 KB. If a cue exceeds 120 KB, check the channel count, sample rate, and tail before reducing quality.

### 5.2 Duration and trimming

1. Generate at the **upper end** of the cue window, not the lower end. For Ludo, use the nearest 0.5 s slider step inside the window (0.5, 1.0, or 2.0 s); trim into the window after generation.
2. Trim leading silence to < 20 ms so the cue feels immediate.
3. Trim the tail to < 100 ms after the last audible event.
4. Apply a **5–20 ms fade-out** to avoid a click.
5. Do not time-stretch or pitch-shift to fit the window; regenerate instead.
6. For `hub.hum`, if it is kept as the fallback room-tone loop, do not fade the loop point; crossfade or generate a seamless loop. If it is a one-shot accent, trim normally.

### 5.3 Loudness and dynamics (delivery target)

The v0.5 delivery uses this chain:

- True peak **≤ −1 dBTP**; normalise to **−5 dBFS sample peak** on one-shots to leave headroom for MP3 overshoot.
- No clipping, no DC offset, no low-frequency rumble below 30 Hz unless it is the intended appliance hum.
- Match perceived loudness by A/B-ing in the browser at the game's default volume (0.7).
- Short clicks and UI cues should sit slightly below the action cues; `land` and `jump` should be quiet because they repeat often.
- Do not compress heavily; these are short, dry one-shots.

### 5.4 Naming and destinations

Use lowercase kebab-case, no spaces, no dots in filenames.

```text
public/packs/anatomy-reflex/
  shared/audio/
    boot.mp3
    dialogue.mp3
    scan.mp3
    dash.mp3
    gate.mp3
    map.mp3
    debrief.mp3
    checkpoint.mp3
    unlock.mp3
    jump.mp3
    land.mp3
    wrong.mp3            # optional

public/packs/silicon-reflex/
  shared/audio/          # copies of the same 12 files if the pack ships

public/hub/bathroom/
  shared/audio/
    hub-click.mp3
    hub-door.mp3
    hub-spin.mp3
    hub-shrink.mp3
    hub-arrive.mp3
    hub-hum.mp3
```

The final format is **MP3 160 kbps mono** (decided v0.5); use `.mp3` consistently and keep the manifest paths in sync. Do not mix `.ogg` and `.mp3` within one pack without a recorded reason.

### 5.5 Manifest entries

For every delivered file, add `src` and `license`, and remove `placeholder`:

```json
"audio.cue.boot": {
  "type": "audio",
  "src": "shared/audio/boot.mp3",
  "license": "Stability AI Community License"
}
```

Keep `placeholder: true` for any cue that is not delivered. The validator accepts declared placeholders, but a final capture should not rely on them.

### 5.6 Licence records

For anatomy and Silicon, add an entry to `licenses.json`:

```json
{
  "file": "shared/audio/boot.mp3",
  "type": "audio",
  "source": "Ludo.ai Audio Generator",
  "author": "AI-generated in Ludo.ai; sound direction by Snorre",
  "license": "Ludo AI Commercial (paid)",
  "url": "https://ludo.ai/terms-of-service",
  "modified": "Generated 2026-11-04; trimmed to 1.1 s; 48 kHz mono; peak-normalised; MP3 160 kbps",
  "aiGenerated": true
}
```

For a Stability AI file, use the exact model and record the licence:

```json
{
  "file": "shared/audio/scan.mp3",
  "type": "audio",
  "source": "Stability AI Stable Audio 3 Small SFX (local)",
  "author": "AI-generated with Stable Audio 3 Small SFX; sound direction by Snorre",
  "license": "Stability AI Community License",
  "url": "https://stability.ai/license",
  "modified": "Generated 2026-11-04; trimmed to 0.8 s; 48 kHz mono; -5 dBFS sample peak / <= -1 dBTP; MP3 160 kbps",
  "aiGenerated": true
}
```

The hub has no `licenses.json`; add a `license` field to each hub manifest entry, or create a hub licence file and link it from the manifest. Do not ship an audio file with an unknown licence.

### 5.7 Loop rules

For the SFX pass:

- **No SFX cue loops.** `audio.cue.hub.hum` is delivered as a one-shot accent (decided v0.5).
- The manifest schema keeps a generic `loop` field, but the audio provider does not read it.
- Music themes loop by design and are covered in [`room-and-menu-themes-v01.md`](room-and-menu-themes-v01.md). The proposed menu theme owns the ambience bed.

---

## 6. Cue register

Three pilot cues (`scan`, `jump`, `land`) are installed; `boot` is a declared placeholder (v0.5); the remaining 14 await the mixer/compiler pass. The visual counterpart column is the no-audio-only check.

| # | Asset ID | Runtime event | Window | File (under `shared/audio/`) | Scope | Visual counterpart |
|---:|---|---|---:|---|---|---|
| 1 | `audio.cue.boot` | Level start / suit power | 0.6–1.2 s | `boot.mp3` | M3 required — **placeholder v0.5** | Loading screen / room reveal |
| 2 | `audio.cue.dialogue` | Conversation opens | 0.2–0.8 s | `dialogue.mp3` | M3 required | Dialogue surface opens |
| 3 | `audio.cue.scan` | Scan / feedback / pulse / place | 0.3–1.0 s | `scan.mp3` | M3 required | Scan beam, concept card, feedback toast |
| 4 | `audio.cue.dash` | Dash starts | 0.2–0.7 s | `dash.mp3` | M3 required | Dash animation |
| 5 | `audio.cue.gate` | Gate panel opens | 0.4–1.2 s | `gate.mp3` | M3 required | Gate panel opens |
| 6 | `audio.cue.map` | Map opens | 0.3–0.9 s | `map.mp3` | M3 required | Map overlay |
| 7 | `audio.cue.debrief` | Level/pack complete | 0.4–1.2 s | `debrief.mp3` | M3 required | Debrief panel |
| 8 | `audio.cue.checkpoint` | Checkpoint / hazard respawn | 0.3–0.9 s | `checkpoint.mp3` | M3 required | "Checkpoint reached" toast / respawn |
| 9 | `audio.cue.unlock` | Gate solved / receptor bound / reward | 0.5–1.2 s | `unlock.mp3` | M3 required | Gate opens / reward toast |
| 10 | `audio.cue.jump` | Jump transition | 0.15–0.5 s | `jump.mp3` | M3 required | Jump animation |
| 11 | `audio.cue.land` | Landing transition | 0.15–0.5 s | `land.mp3` | M3 required | Land animation |
| 12 | `audio.cue.wrong` | Rejected action / wrong gate / blocked exit | 0.2–0.6 s | `wrong.mp3` | M3 optional | Error toast / feedback surface |
| 13 | `audio.cue.hub.click` | Menu selection / start | 0.05–0.15 s | `hub-click.mp3` | M3.5 required | Button pressed state |
| 14 | `audio.cue.hub.door` | Launch: door opens | 0.4–0.8 s | `hub-door.mp3` | M3.5 required | Door opens |
| 15 | `audio.cue.hub.spin` | Launch: drum spins | 1.0–2.0 s | `hub-spin.mp3` | M3.5 required | Drum spins |
| 16 | `audio.cue.hub.shrink` | Launch: shrink beam | 0.5–0.9 s | `hub-shrink.mp3` | M3.5 required | Shrink flash |
| 17 | `audio.cue.hub.arrive` | Launch: arrival | 0.3–0.8 s | `hub-arrive.mp3` | M3.5 required | Tiny astronaut appears |
| 18 | `audio.cue.hub.hum` | Declared; not played | 1.0–2.0 s | `hub-hum.mp3` | M3.5 open | None; ambience only |

---

## 7. M3 anatomy cue cards

Each card gives the cue intent, the Ludo prompt, the Stable Audio prompt, the negative delta, and the acceptance check.

**How to use a card**

- **Ludo:** Sound Effects mode, one event per prompt, up to three tightly related layers, Loop off, duration set by the slider, no duration in the text, prompt expansion off if the UI/API offers it.
- **Stable Audio 3 Small SFX:** prefix `TrackType: SFX,`, set duration 1 s or longer, use the global negative plus the cue delta.
- **Stable Audio 2.5:** omit the negative prompt, append the 2.5 suffix, expect more musical interpretation.
- **Global style:** the Ludo prompts below are complete; do not prepend §4.1. For Stable Audio, use §4.1 plus the global negative; the Stable prompts below already include the production character.

**Copy-paste blocks.** Each Ludo and Stable Audio prompt is fenced. Copy the contents of the block only; the labels outside the fence are not part of the prompt.

### 7.0 Ludo prompt grammar

Ludo works best with one physical event, a named source, a material, a size, and a familiar analogy. The prompts below follow this pattern:

```text
Short game sound effect: [one physical event]. [Dominant layer], like [familiar real-world sound]. [Supporting layer], like [familiar real-world sound]. [Optional third layer]. [Size, material, distance, decay].
```

**Rules**

- **Use an analogy.** “Like a camera flash charging” gives Ludo a target; “suit power-up” does not.
- **Name the source, material, and size.** “Small plastic button”, “hollow enamel”, “wet rubber sheet”.
- **Keep one event per prompt.** Up to three tightly related layers are acceptable. If the result smears, use the layer recipe on the card and mix the layers in post. Do not add a new asset ID.
- **Do not put delivery specs in the prompt.** No 48 kHz, file size, clipping, or negative list. Those are post-processing and acceptance checks.
- **Do not use lore-only labels.** Write “wordless translator device”, not “cell-speech”; “single clean ping”, not “beacon”; “rising power and a padlock click”, not “ability unlock”.
- **Set the duration on the slider.** Do not write seconds in the description.
- **Keep Loop off.** The only exception is `hub.hum` if it is kept as the fallback ambience bed.
- **Turn prompt expansion off** if the UI/API offers it. These prompts are already detailed; expansion is more likely to add music, voice, or unwanted layers. If a take adds them, reject it or remix.
- **Ludo output is MP3.** Resample to 48 kHz and keep MP3 160 kbps mono (the pack format, decided v0.5). Ludo does not expose a seed; record the take URL/ID in the prompt log.

**Ludo duration steps**

| Cue | Window | Ludo slider | Post-trim |
|---|---:|---:|---:|
| `boot` | 0.6–1.2 s | 1.0 s | 1.0 s |
| `dialogue` | 0.2–0.8 s | 0.5 s | 0.5 s |
| `scan` | 0.3–1.0 s | 1.0 s | 1.0 s |
| `dash` | 0.2–0.7 s | 0.5 s | 0.5 s |
| `gate` | 0.4–1.2 s | 1.0 s | 1.0 s |
| `map` | 0.3–0.9 s | 1.0 s | 0.9 s |
| `debrief` | 0.4–1.2 s | 1.0 s | 1.0 s |
| `checkpoint` | 0.3–0.9 s | 0.5 s | 0.5 s |
| `unlock` | 0.5–1.2 s | 1.0 s | 1.0 s |
| `jump` | 0.15–0.5 s | 0.5 s | 0.5 s |
| `land` | 0.15–0.5 s | 0.5 s | 0.5 s |
| `wrong` | 0.2–0.6 s | 0.5 s | 0.5 s |
| `hub.click` | 0.05–0.15 s | 0.5 s | ≤0.15 s |
| `hub.door` | 0.4–0.8 s | 1.0 s | 0.8 s |
| `hub.spin` | 1.0–2.0 s | 2.0 s | 2.0 s |
| `hub.shrink` | 0.5–0.9 s | 1.0 s | 0.9 s |
| `hub.arrive` | 0.3–0.8 s | 0.5 s | 0.5 s |
| `hub.hum` | 1.0–2.0 s | 2.0 s | 2.0 s |

The cue cards repeat the relevant value.

### 7.1 `audio.cue.boot`

- **Event:** level start / suit power (`GameRuntime.playCue("boot")`).
- **Window:** 0.6–1.2 s (the outer §5.5 window is 0.2–1.2 s).
- **Ludo duration:** 1.0 s (slider); post-trim inside 0.6–1.2 s.
- **File:** `shared/audio/boot.mp3`.
- **Visual counterpart:** loading screen / room reveal.

**Ludo (Sound Effects, Loop off):**

```text
Short game sound effect: a small sci-fi space suit switching on. A soft electrical hum rises quickly, like a camera flash charging. A short air hiss, like a scuba mask sealing against a face. Two tiny high beeps, like a digital watch alarm. Close, dry, small plastic and metal parts, short and clean.
```

**Layer recipe if the combined take muddles:**

```text
Layer 1: Soft electrical hum rising quickly, like a camera flash charging, close and dry.
Layer 2: Short air hiss, like a scuba mask sealing, close and dry.
Layer 3: Two tiny high beeps, like a digital watch alarm, close and dry.
```

**Stable Audio 3 Small SFX:**

```text
TrackType: SFX, a very quiet delicate sci-fi suit power-up: a brief soft electric hum gliding upward and fading, a gentle helmet-seal air hiss, and two tiny clean beeps, small and intimate, close-miked, dry and tactile, fast decay, no music, no voice, no clipping, no distortion, no loud sustained tone.
```

- **Negative delta:** `+ music, melody, vocals, speech, long reverb, cinematic boom, clipping.`
- **Accept:** audible attack under 50 ms; ends by 1.2 s; no musical tail; no voice; no long hiss.
- **Reject:** a rising musical note, a cinematic riser, a long helmet hiss, or a chime sequence that sounds like a menu.
- **Delivery status (v0.5): placeholder.** Both the post-trained and `-base` checkpoints collapse this compound prompt into a continuous clipped hum (flat-topped 0 dBFS); seeds and two prompt revisions did not produce a boot sequence. The manifest keeps `placeholder: true`; the layer/compile experiment (hum + hiss + beeps separately, mixed) is the next attempt.

### 7.2 `audio.cue.dialogue`

- **Event:** conversation opens (`startConversation`, `runtime.ts:1533`); not each advance.
- **Window:** 0.2–0.8 s.
- **Ludo duration:** 0.5 s (slider); post-trim inside 0.2–0.8 s.
- **File:** `shared/audio/dialogue.mp3`.
- **Visual counterpart:** dialogue surface opens.

**Ludo (Sound Effects, Loop off):**

```text
Short game sound effect: a wordless alien translator device chirping once. A wet, springy blip, like a drop of water flicked off a rubber sheet, followed by a soft static tick, like a walkie-talkie button being pressed. Small, close, dry, friendly and inquisitive.
```

**Stable Audio 3 Small SFX:**

```text
TrackType: SFX, a short friendly alien cell-speech translator: a wet organic chirp, a soft radio-static blip, close and dry, fast decay, no voice, no intelligible speech.
```

- **Negative delta:** `+ voice, speech, words, robotic dialogue, long reverb.`
- **Accept:** non-verbal; friendly, not comedic; short; no intelligible words.
- **Reject:** a voice line, a robot saying a word, a long radio drama tail.

### 7.3 `audio.cue.scan`

- **Event:** scan, feedback request, pulse, and receptor placement (`runtime.ts` multiple call sites).
- **Window:** 0.3–1.0 s.
- **Ludo duration:** 1.0 s (slider); post-trim inside 0.3–1.0 s.
- **File:** `shared/audio/scan.mp3`.
- **Visual counterpart:** scan beam, concept card, feedback toast.

**Ludo (Sound Effects, Loop off):**

```text
Short game sound effect: a single sci-fi scanner ping. A clean high ping, like a wet finger rubbed around the rim of a wine glass, then a fast tick, like a camera shutter, and a faint sparkle, like tiny glass beads dropped on a saucer. Close, dry, precise, short.
```

**Layer recipe if the combined take muddles:**

```text
Layer 1: Clean high glass ping, like a wet finger rubbed around a wine glass rim, short decay.
Layer 2: Fast camera-shutter tick, very short, close.
Layer 3: Faint sparkle, like tiny glass beads dropped on a saucer, quiet.
```

**Stable Audio 3 Small SFX:**

```text
TrackType: SFX, a sci-fi scanner sweep: a clean high sonar ping with a tiny digital data tick and a faint shimmering tail, close and dry, short decay, no music, no voice.
```

- **Negative delta:** `+ alarm, siren, long reverb, melody.`
- **Accept:** reads as a scan, not an alarm; survives repetition; no musical note sequence.
- **Reject:** a rising siren, a two-note melody, a long sonar tail that overlaps the next cue.

### 7.4 `audio.cue.dash`

- **Event:** dash starts (`stepRoomSimulationWithCues`).
- **Window:** 0.2–0.7 s.
- **Ludo duration:** 0.5 s (slider); post-trim inside 0.2–0.7 s.
- **File:** `shared/audio/dash.mp3`.
- **Visual counterpart:** dash animation.

**Ludo (Sound Effects, Loop off):**

```text
Short game sound effect: a small suited figure dashing forward. A compact air puff, like a bicycle pump pushing once; a fabric snap, like a jacket cuff flicked; and a quick whoosh, like a hand swiping past your ear. Close, dry, fast, short.
```

**Stable Audio 3 Small SFX:**

```text
TrackType: SFX, a short suit-thruster dash: a compact air puff, a fabric snap, and a quick whoosh, close and dry, fast decay, no music, no voice.
```

- **Negative delta:** `+ jet engine roar, explosion, long reverb.`
- **Accept:** fast attack; ends quickly; distinct from jump; no explosion.
- **Reject:** a jet takeoff, a rocket boom, a long whoosh.

### 7.5 `audio.cue.gate`

- **Event:** gate panel opens (`runtime.ts:1879`); solving the gate plays `unlock`.
- **Window:** 0.4–1.2 s.
- **Ludo duration:** 1.0 s (slider); post-trim inside 0.4–1.2 s.
- **File:** `shared/audio/gate.mp3`.
- **Visual counterpart:** gate panel opens.

**Ludo (Sound Effects, Loop off):**

```text
Short game sound effect: a wet, rubbery gate panel sliding open. A wet suction pop, like a rubber suction cup pulling off wet tile; a hollow knock, like a wooden block tapped inside a cardboard box; and a short air slide, like breath through a paper tube. Close, dry, tactile, slightly gross but harmless.
```

**Layer recipe if the combined take muddles:**

```text
Layer 1: Wet suction pop, like a rubber suction cup pulling off wet tile, close.
Layer 2: Hollow knock, like a wooden block tapped inside a cardboard box, close.
Layer 3: Short air slide, like breath through a paper tube, quiet.
```

**Stable Audio 3 Small SFX:**

```text
TrackType: SFX, an organic sci-fi gate panel sliding open: a soft wet suction pop, a hollow wooden knock, and a short air slide, tactile and dry, not gory, fast decay, no music, no voice.
```

- **Negative delta:** `+ gore, blood, meat, scream, long reverb.`
- **Accept:** gross-cute, not gory; the knock is hollow, not a gunshot; the air slide is short; no success chime.
- **Reject:** tearing flesh, a wet gore splat, a gunshot, a success chime that belongs to `unlock`, a long cathedral chime.

### 7.6 `audio.cue.map`

- **Event:** map opens (`toggleMap`).
- **Window:** 0.3–0.9 s.
- **Ludo duration:** 1.0 s (slider); trim to 0.9 s.
- **File:** `shared/audio/map.mp3`.
- **Visual counterpart:** map overlay.

**Ludo (Sound Effects, Loop off):**

```text
Short game sound effect: a small holographic map unfolding. A paper-like flap, like a folded brochure snapped open; a soft projector whir, like a camera lens extending; and a tiny glass chime, like a fork tapped on a wine glass. Close, dry, delicate, short.
```

**Layer recipe if the combined take muddles:**

```text
Layer 1: Paper-like flap, like a folded brochure snapped open, close.
Layer 2: Soft projector whir, like a camera lens extending, short.
Layer 3: Tiny glass chime, like a fork tapped on a wine glass, quiet.
```

**Stable Audio 3 Small SFX:**

```text
TrackType: SFX, a holographic map unfolding: a soft digital shimmer, a tiny glass chime, and a light paper-like flap, close and dry, short decay, no music, no voice.
```

- **Negative delta:** `+ paper crumple, alarm, long reverb, melody.`
- **Accept:** subtle; reads as an unfold; no notification alarm; short.
- **Reject:** a phone notification, a loud paper crumple, a musical arpeggio.

### 7.7 `audio.cue.debrief`

- **Event:** level complete or pack complete (`enterDebrief`, `complete`).
- **Window:** 0.4–1.2 s.
- **Ludo duration:** 1.0 s (slider); post-trim inside 0.4–1.2 s.
- **File:** `shared/audio/debrief.mp3`.
- **Visual counterpart:** debrief panel.

**Ludo (Sound Effects, Loop off):**

```text
Short game sound effect: a warm two-note confirmation. Two soft synth notes, like a gentle doorbell, followed by a quiet plastic click, like a seatbelt buckle. Rounded, friendly, close, dry, exactly two notes.
```

**Layer recipe if the combined take muddles:**

```text
Layer 1: Two soft synth notes, like a gentle doorbell, warm and rounded.
Layer 2: Quiet plastic click, like a seatbelt buckle, close.
```

**Stable Audio 3 Small SFX:**

```text
TrackType: SFX, a warm two-note synth chime resolution with a soft suit confirmation click, gentle and clean, dry, short decay, no music bed, no voice.
```

- **Negative delta:** `+ fanfare, applause, song, long reverb.`
- **Accept:** exactly two notes; short; a resolution, not a fanfare.
- **Reject:** a full chord progression, an applause bed, a victory fanfare, a music loop.

### 7.8 `audio.cue.checkpoint`

- **Event:** checkpoint reached or hazard respawn.
- **Window:** 0.3–0.9 s.
- **Ludo duration:** 0.5 s (slider); post-trim inside 0.3–0.9 s.
- **File:** `shared/audio/checkpoint.mp3`.
- **Visual counterpart:** "Checkpoint reached" toast / respawn.

**Ludo (Sound Effects, Loop off):**

```text
Short game sound effect: a single clean checkpoint ping. One round ceramic ping, like a spoon tapped on a mug, followed by a tiny click, like a chess piece set down. Close, dry, reassuring, short.
```

**Stable Audio 3 Small SFX:**

```text
TrackType: SFX, a checkpoint beacon: a clean single pulse with a small digital save confirmation, close and dry, short decay, no music, no voice.
```

- **Negative delta:** `+ alarm, siren, long reverb, melody.`
- **Accept:** a clean single pulse; no alarm; short.
- **Reject:** a two-tone alarm, a long beacon tail, a musical ping.

### 7.9 `audio.cue.unlock`

- **Event:** gate solved, receptor bound, or reward granted.
- **Window:** 0.5–1.2 s.
- **Ludo duration:** 1.0 s (slider); post-trim inside 0.5–1.2 s.
- **File:** `shared/audio/unlock.mp3`.
- **Visual counterpart:** gate opens / reward toast / ability unlock.

**Ludo (Sound Effects, Loop off):**

```text
Short game sound effect: a small ability unlocking. A short rising synth note, like a power meter charging upward; a quick static zap, like touching a doorknob in winter; and a solid click, like a padlock opening. Close, dry, satisfying, fast.
```

**Layer recipe if the combined take muddles:**

```text
Layer 1: Short rising synth note, like a power meter charging upward.
Layer 2: Quick static zap, like touching a doorknob in winter.
Layer 3: Solid click, like a padlock opening.
```

**Stable Audio 3 Small SFX:**

```text
TrackType: SFX, a satisfying ability unlock: a rising synth tone, a short electric nerve zap, and a clean mechanical click, dry and tactile, fast decay, no music, no voice.
```

- **Negative delta:** `+ fanfare, explosion, long reverb.`
- **Accept:** rising but short; distinct from `debrief`; no fanfare.
- **Reject:** a long riser, a victory theme, an explosion.

### 7.10 `audio.cue.jump`

- **Event:** jump transition.
- **Window:** 0.15–0.5 s.
- **Ludo duration:** 0.5 s (slider); post-trim inside 0.15–0.5 s.
- **File:** `shared/audio/jump.mp3`.
- **Visual counterpart:** jump animation.

**Ludo (Sound Effects, Loop off):**

```text
Short game sound effect: a small suited figure jumping. A soft pneumatic push, like an office chair gas lift; a light fabric rustle, like a sleeve brushing a jacket; and a tiny upward lift, like a short breath of air. Very short, quiet, close, dry.
```

**Stable Audio 3 Small SFX:**

```text
TrackType: SFX, a soft suit-servo jump: a compact pneumatic push and a tiny fabric rustle, close and dry, very fast decay, no music, no voice.
```

- **Negative delta:** `+ spring boing, cartoon bounce, long reverb.`
- **Accept:** very short; quiet; distinct from dash; no cartoon boing.
- **Reject:** a spring, a Mario-style boing, a long whoosh.

### 7.11 `audio.cue.land`

- **Event:** landing transition.
- **Window:** 0.15–0.5 s.
- **Ludo duration:** 0.5 s (slider); post-trim inside 0.15–0.5 s.
- **File:** `shared/audio/land.mp3`.
- **Visual counterpart:** land animation.

**Ludo (Sound Effects, Loop off):**

```text
Short game sound effect: small boots landing on a wet, soft surface. A damp squelch, like a sponge squeezed once; a soft thud, like a book dropped on a carpet. Close, dry, quiet, very short, harmless.
```

**Stable Audio 3 Small SFX:**

```text
TrackType: SFX, a soft landing on wet organic tissue: a gentle squelch and a suit thud, tactile and dry, not gory, very fast decay, no music, no voice.
```

- **Negative delta:** `+ gore, blood, splatter, scream, long reverb.`
- **Accept:** soft; not gory; short; quiet enough to repeat.
- **Reject:** a wet gore splat, a heavy stomp, a pain grunt.

---

## 8. M3.5 hub cue cards

Use the hub style from §4.2 for Stable Audio; the Ludo prompts below are complete and already use the hub character. Do not use the anatomy style for the hub.

### 8.1 `audio.cue.hub.click`

- **Event:** menu selection / start (hub boot calls).
- **Window:** 0.05–0.15 s.
- **Ludo duration:** 0.5 s (minimum slider); trim to ≤0.15 s. If the click lands late in the take, use Stable Audio at 1 s and trim, or record it manually.
- **File:** `shared/audio/hub-click.mp3`.
- **Visual counterpart:** button pressed state.

**Ludo (Sound Effects, Loop off):**

```text
Short game sound effect: one press of a chunky plastic control-panel button. A dry plastic click, like a washing machine start button; a tiny relay tick, like a light switch. Extremely short, close, dry, quiet.
```

**Stable Audio 3 Small SFX:**

```text
TrackType: SFX, a single chunky plastic control-panel button press: a dry tactile click with a tiny relay tick, close and dry, extremely short decay, no music, no voice.
```

- **Negative delta:** `+ mouse click, keyboard, click track, long reverb.`
- **Accept:** very short; quiet; plastic and chunky, not a mouse; the click is near the start of the take.
- **Reject:** a mouse click, a keyboard key, a double click, a long tail.

### 8.2 `audio.cue.hub.door`

- **Event:** launch sequence, door opens (`HubScene.playLaunch`).
- **Window:** 0.4–0.8 s.
- **Ludo duration:** 1.0 s (slider); trim to 0.8 s.
- **File:** `shared/audio/hub-door.mp3`.
- **Visual counterpart:** door opens.

**Ludo (Sound Effects, Loop off):**

```text
Short game sound effect: a heavy round washing-machine door unlatching and swinging open. A metal latch clunk, like a car door latch snapping open; a short air hiss, like a bus door opening; a hollow enamel ring, like a tap on a bathtub. Close, dry, domestic, short.
```

**Layer recipe if the combined take muddles:**

```text
Layer 1: Metal latch clunk, like a car door latch snapping open.
Layer 2: Short air hiss, like a bus door opening.
Layer 3: Hollow enamel ring, like a tap on a bathtub.
```

**Stable Audio 3 Small SFX:**

```text
TrackType: SFX, a heavy retro washing-machine porthole door unlatching and swinging open: a metal latch clunk, a soft pneumatic hiss, and a hollow enamel resonance, close and dry, short decay, no music, no voice.
```

- **Negative delta:** `+ door slam, glass break, long reverb, gore.`
- **Accept:** one door event; metal plus enamel; short; no glass.
- **Reject:** a bank-vault slam, breaking glass, a long industrial echo.

### 8.3 `audio.cue.hub.spin`

- **Event:** launch sequence, drum spins up.
- **Window:** 1.0–2.0 s.
- **Ludo duration:** 2.0 s (slider); post-trim inside 1.0–2.0 s.
- **File:** `shared/audio/hub-spin.mp3`.
- **Visual counterpart:** drum spins.

**Ludo (Sound Effects, Loop off):**

```text
Short game sound effect: a washing-machine drum spinning up. A low electric motor hum, like a fridge compressor waking up, rising in pitch; a small water slosh, like a half-full bottle tipped; a faint metal rattle, like coins in a tin. It spins up and stops within two seconds. Close, dry, domestic, one-shot.
```

**Layer recipe if the combined take muddles:**

```text
Layer 1: Low electric motor hum, like a fridge compressor waking up, rising in pitch.
Layer 2: Small water slosh, like a half-full bottle tipped.
Layer 3: Faint metal rattle, like coins in a tin.
```

**Stable Audio 3 Small SFX:**

```text
TrackType: SFX, a retro washing-machine drum spinning up: a low electric motor hum rising in pitch, a small water slosh, and a faint metal rattle, mechanical and dry, one-shot with a clean stop, no music, no voice.
```

- **Negative delta:** `+ factory, jet engine, long reverb, music.`
- **Accept:** rises and stops within 2 s; domestic scale; no industrial roar.
- **Reject:** a jet turbine, a factory floor, a musical rhythm.

### 8.4 `audio.cue.hub.shrink`

- **Event:** launch sequence, shrink beam fires.
- **Window:** 0.5–0.9 s.
- **Ludo duration:** 1.0 s (slider); trim to 0.9 s.
- **File:** `shared/audio/hub-shrink.mp3`.
- **Visual counterpart:** shrink flash.

**Ludo (Sound Effects, Loop off):**

```text
Short game sound effect: a playful sci-fi shrink ray firing. A descending electric zap, like a toy ray gun; a short power surge, like a fluorescent tube flickering on; a soft flash whoosh, like a camera flash. Close, dry, harmless, fast.
```

**Layer recipe if the combined take muddles:**

```text
Layer 1: Descending electric zap, like a toy ray gun.
Layer 2: Short power surge, like a fluorescent tube flickering on.
Layer 3: Soft flash whoosh, like a camera flash.
```

**Stable Audio 3 Small SFX:**

```text
TrackType: SFX, a sci-fi shrink-beam firing: a descending electric zap, a brief suit power surge, and a soft flash whoosh, playful and not painful, dry, fast decay, no music, no voice, no gore.
```

- **Negative delta:** `+ scream, pain, explosion, long reverb.`
- **Accept:** playful; not painful; short; reads as shrink, not teleport.
- **Reject:** a scream, a painful zap, a big explosion, a long sci-fi riser.

### 8.5 `audio.cue.hub.arrive`

- **Event:** launch sequence, tiny astronaut arrives.
- **Window:** 0.3–0.8 s.
- **Ludo duration:** 0.5 s (slider); post-trim inside 0.3–0.8 s.
- **File:** `shared/audio/hub-arrive.mp3`.
- **Visual counterpart:** tiny astronaut appears.

**Ludo (Sound Effects, Loop off):**

```text
Short game sound effect: a tiny astronaut arriving on a wet bathroom floor. A tiny glass marble dropped on tile; a tiny wet squelch, like a finger pulled off a mirror; a very small damp room tone, like the quiet air in a tiled bathroom heard through a closed door. Close, dry, tiny, short.
```

**Layer recipe if the combined take muddles:**

```text
Layer 1: Tiny glass marble dropped on tile.
Layer 2: Tiny wet squelch, like a finger pulled off a mirror.
Layer 3: Very small damp room tone, like the quiet air in a tiled bathroom heard through a closed door.
```

**Stable Audio 3 Small SFX:**

```text
TrackType: SFX, a tiny astronaut arriving on a wet bathroom floor: a soft high chime, a tiny boot squelch, and a very small damp room tone, close and dry, short decay, no music, no voice.
```

- **Negative delta:** `+ large hall, long reverb, gore, music.`
- **Accept:** tiny scale; no big reverb; short; the room tone is microscopic.
- **Reject:** a cathedral reverb, a normal-sized footstep, a musical sparkle.

### 8.6 `audio.cue.hub.hum`

- **Event:** declared in the hub, never played. Proposed role: a short one-shot room-tone accent; the menu theme (`audio.music.menu`) would own the ambience bed.
- **Window:** 1.0–2.0 s.
- **Ludo duration:** 2.0 s (slider); use Loop off for the one-shot role, Loop on only for the fallback bed.
- **File:** `shared/audio/hub-hum.mp3`.
- **Visual counterpart:** none; it is background texture and carries no information. If the menu theme is accepted, keep it as a one-shot accent or retire it.

**Ludo one-shot (Loop off):**

```text
Short game sound effect: a warm, quiet laundry-room room tone. A steady low hum, like a fish tank filter in a quiet room; a faint pipe tick, like a cooling radiator; one distant water drip into a metal sink. Close, dry, low level, even, one-shot accent.
```

**Ludo loop variant (Loop on, only if kept as the fallback ambience bed):**

```text
Short game sound effect: a warm, quiet laundry-room room tone. A steady low hum, like a fish tank filter in a quiet room; a faint pipe tick, like a cooling radiator; one distant water drip into a metal sink. Close, dry, low level, steady and even, seamless loop.
```

**Stable Audio 3 Small SFX:**

```text
TrackType: SFX, a warm laundry-lab room tone: a steady low appliance hum, a faint pipe tick, and a distant water drip, close and dry, one-shot accent, no music, no voice.
```

- **Negative delta:** `+ melody, loud machinery, silence, long reverb.`
- **Accept:** one-shot: clean tail, no music, low level. Loop variant: seamless, no audible seam.
- **Reject:** a musical pad, a loud engine, a silent room, a one-shot with a long tail.
- **Note:** if the menu theme is not accepted and this becomes the ambience bed, use Loop on and extend to 4–8 s as a recorded spec change. Do not loop it underneath the menu theme.

---

## 9. Optional cue: `audio.cue.wrong`

Add this only if the capture needs explicit wrong-answer feedback. It uses the M3 anatomy character from §4.1 and makes the M3 total 33; the Ludo prompt below is complete.

- **Event:** rejected receptor, wrong gate answer, blocked exit.
- **Window:** 0.2–0.6 s.
- **Ludo duration:** 0.5 s (slider); post-trim inside 0.2–0.6 s.
- **File:** `shared/audio/wrong.mp3`.
- **Visual counterpart:** error toast / feedback surface.

**Ludo (Sound Effects, Loop off):**

```text
Short game sound effect: a gentle error signal. A low dry buzz, like a phone vibrating on a wooden table; a soft click, like a pen cap snapping shut. Close, dry, short, gentle.
```

**Stable Audio 3 Small SFX:**

```text
TrackType: SFX, a short wrong-answer feedback: a dry low buzz and a soft suit click, close and dry, fast decay, no voice, no music.
```

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

### 10.2 Stable Audio 3 Small SFX — local generation (primary)

The model runs **fully locally** as the fleet daemon `stable-audio-3-small-sfx`
(`127.0.0.1:8100`, delegate `serve-sa3.sh` + `tools/sa3-server.py` in
macos-dev-config; provisioning/licence/serving semantics: flaate ADR-0008 and
`SERVING-MANIFEST.md` there). The consumer is **`scripts/sfx-generate.ts` — an
offline asset step; the game runtime never talks to the model server**.

| Setting | Value |
|---|---|
| Model | post-trained `small-sfx` (primary); `small-sfx-base` escalation for hero cues |
| Prompt prefix | `TrackType: SFX,` (the cue cards' Stable prompts already carry it) |
| Duration | generate ≥ 1 s and trim into the window (the script does this) |
| Negative prompt | **no-op on the post-trained checkpoint** (official docs) — the card prompts already fold the key negatives into the positive prompt |
| Seed | fixed per take; echoed in the `X-Seed` header and recorded in the prompt log |
| Steps | 8 (default, post-trained); 50 on the `-base` escalation with cfg 7 |
| Output | 44.1 kHz stereo WAV → post-processed to 48 kHz mono MP3 160 kbps (§12) |
| Licence | Stability AI Community License (non-commercial coursework; outputs owned by the generator) |

Local-generation rules:

- **Negative prompts do not work on the post-trained checkpoint.** The card
  prompts below already end with "no music, no voice" etc. — that is the
  mitigation, not an omission. If a hero cue keeps adding music/voice after two
  prompt revisions, escalate to the `-base` checkpoint
  (`tsx scripts/sfx-generate.ts batch --cues <cue> --model base`), where
  `negative_prompt` (the §4.4 global negative + the cue delta) and `cfg_scale`
  are honored — slower (~50 steps).
- Always resample to 48 kHz in post (the model outputs 44.1 kHz).
- Use a fixed seed when iterating so prompt changes are comparable; the script
  records every seed in `docs/audio/sfx-prompt-log.csv`.
- Sub-second *generation* is possible locally, but generate ≥ 1 s and trim —
  the model develops a sound better with at least a second of context.
- Stable Audio 2.5 (music-focused, API) is no longer part of this pipeline.

**Workflow (the doc's §11 gates, scripted):**

```bash
tsx scripts/sfx-generate.ts status                     # fleet + installed cues
tsx scripts/sfx-generate.ts pilot                      # boot, scan, jump, land × 4 seeds
afplay var/sfx/boot/1.mp3                              # listen (browser A/B at 0.7 volume too)
tsx scripts/sfx-generate.ts takes                      # durations/sizes/flags per take
tsx scripts/sfx-generate.ts adopt --picks boot=3,scan=1,jump=2,land=5
tsx scripts/sfx-generate.ts batch                      # remaining cues (same gates)
```

Raw takes/previews live in `var/sfx/` (git-ignored); `adopt` installs the
chosen take, sets `src`/`license` in the manifests, copies to Silicon
(reuse rule §2.3), appends the licence records, and logs the prompt row.

For cues rendered by cueforge, use the external adapter instead:
[`cueforge-adapter.md`](cueforge-adapter.md) and
`npm run audio:adopt -- --result <render-result.json>`. It consumes the render
result/receipt, validates the cue ID, and performs the same manifest, licence,
Silicon-copy, and prompt-log updates without re-generating audio.

### 10.2a Ludo.ai Audio Generator (fallback for a specific hero cue only)

| Setting | Value |
|---|---|
| Mode | Sound Effects |
| Prompt | One event per prompt, up to three tightly related layers; source, material, action, size, and a familiar analogy; no duration in the text |
| Duration | Slider: 0.5–10 s in 0.5 s steps. Generate 0.5, 1.0, or 2.0 s and trim into the cue window. |
| Loop | Off for every cue. If `hub.hum` is kept as the fallback ambience bed, Loop on for that cue only. |
| Output | MP3 |
| Cost | 2 credits per SFX; 3 per remix |
| Prompt expansion | On by default; turn it off via the API if results drift, or reject results that add music/voice/extra layers |
| Variations | Generate 2–4; use Remix only after a clear direction is chosen |
| Seed | Not exposed; record the take URL/ID instead |

Ludo-specific rules:

- Do not write "0.8 seconds" in the description; set the slider.
- Use a familiar analogy: "like a camera flash charging", not a lore label. Do not use mood as the only description; a character word is fine when it is anchored to a source.
- Name the source, material, and size. "Small plastic button", "hollow enamel", "wet rubber sheet" gives Ludo more than "suit sound".
- Keep one event per prompt. If a compound cue is muddled, generate the layers separately with the card's layer recipe and mix them in post; do not add a new asset ID.
- Do not put delivery specs in the description: no sample rate, file size, clipping, or negative list. Those are post-processing and acceptance checks.
- Do not use lore-only labels. Write "wordless translator device", not "cell-speech"; "single clean ping", not "beacon"; "rising power and a padlock click", not "ability unlock".
- Use Loop only if `hub.hum` is kept as the fallback ambience bed. A looped one-shot will sound wrong in the game.
- Ludo returns MP3; check the sample rate and resample to 48 kHz if needed. Do not rename the extension.
- Ludo's prompt expansion may add music or voice. If it does, remix or turn expansion off.

**Budget (fallback path only):** a hero cue costs 2 credits first-pass, 3 per remix. Ludo Indie includes 250 credits/month.

### 10.3 Model routing

| Cue family | First choice | Fallback |
|---|---|---|
| Every cue | Local Stable Audio 3 Small SFX (post-trained, fixed seed) | `-base` escalation (real negative prompt, cfg 7) after two failed revisions |
| Hero cue still failing after `-base` | Ludo Sound Effects for that cue only | Synth placeholder |
| `hub.click` (very short window) | Local: generate 1 s, trim to ≤0.15 s; prefer takes whose click lands early | Manual click recording |

### 10.4 Variations, seeds/take IDs, and retries

- Generate 2–4 variations per cue.
- Keep the first acceptable file; do not chase perfection on a 0.3 s cue.
- Keep failed rows in the prompt log; do not overwrite history.
- Maximum two prompt revisions per cue before changing tool or accepting a placeholder.
- Record the exact model, duration, and negative prompt for the chosen file. For Stable Audio, record the seed; for Ludo, record the take URL/ID.
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
6. **Normalise** to a −5 dBFS sample peak and verify the decoded true peak is ≤ −1 dBTP.
7. **Encode** to MP3 160 kbps mono at 48 kHz (decided v0.5).
8. **Check** duration, file size, sample rate, channels, and loop seam.
9. **A/B** in the browser at the game's default volume.
10. **Record** the prompt, model, duration, post-processing, and licence in the prompt log. For Stable Audio, include the seed; for Ludo, the take URL/ID.

### 12.2 Per-file acceptance

- [ ] File exists at the exact path; manifest `src` matches; `placeholder` removed.
- [ ] Duration inside the cue window.
- [ ] Audible attack under 50 ms; tail under 100 ms; no long reverb.
- [ ] 48 kHz; mono; MP3 160 kbps.
- [ ] ≤ 120 KB.
- [ ] No clipping; true peak ≤ −1 dBTP; no DC offset.
- [ ] No music, voice, intelligible speech, or gore.
- [ ] For Ludo-generated files: prompt uses a concrete analogy and no lore-only label; the slider value is a valid 0.5 s step and the trimmed file sits inside the cue window.
- [ ] Cue reads as the intended event at browser volume.
- [ ] Cue is distinct from its neighbours (jump vs dash, gate vs unlock, checkpoint vs wrong).
- [ ] `hub.hum` is a one-shot accent; Loop is off.

**Delivery exception (v0.5):** `scan` seed 4 is 0.10 s (window 0.3–1.0 s). The user approved the take by ear; it is installed with a recorded exception. Revisit with the mixer/compiler if a longer in-window scan is needed.

### 12.3 Global acceptance

- [ ] All 11 M3 cues approved, except `boot` as a recorded placeholder (v0.5).
- [ ] All 6 hub cues approved, or a recorded placeholder decision.
- [ ] `wrong` is either delivered or explicitly kept placeholder.
- [ ] Declared placeholder documented: `audio.cue.boot` — the model collapses the compound prompt; synth fallback remains active.
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

The log lives in **[`sfx-prompt-log.csv`](sfx-prompt-log.csv)** — one row per generated take and per adoption, append-only (`scripts/sfx-generate.ts` writes it; do not hand-edit while it is in use). It is the evidence for the AI-generated asset record and the GDD/video asset list.

Columns: `asset_id`, `model` (`stable-audio-3-small-sfx` post-trained / `-base` escalation; Ludo rows record the take URL/ID), `seed`, `requested_duration_s`, `variations`, `chosen_file` (the installed manifest `src`), `post_processing` (the §12.1 chain), `verdict` (`take` → `accepted`/rejected; failed rows are kept), `licence`.

> **2026-11-03 cleanup:** the early rows' `post_processing` field contained unquoted commas; it was normalized to semicolons and the whole log was validated at 9 columns. No take or adoption content changed. New rows are written with CSV escaping.

**Minimum fields for every accepted file:** prompt version, asset ID, tool and plan, model and seed/take ID, duration, variations, chosen file, post-processing, runtime check, verdict, licence, notes.

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
| 1 | Is `hub.hum` ambience or a one-shot? | **Decided (v0.5):** one-shot accent; the proposed menu theme owns the ambience bed. | Snorre |
| 2 | Is `wrong` in the M3 delivery? | **Decided (v0.5):** delivered; the M3 total is 33. | Snorre |
| 3 | OGG or MP3 final? | **Decided (v0.5):** MP3 160 kbps mono at 48 kHz; this toolchain has no libvorbis. | Snorre |
| 4 | Mono or stereo? | **Decided (v0.5):** mono for all one-shots; no positional audio. | Snorre |
| 5 | Loudness target? | **Decided (v0.5):** −5 dBFS sample peak target; verified ≤ −1 dBTP; match by ear at 0.7 volume. | Snorre |
| 6 | Implement the manifest audio provider before or after generation? | **Decided (v0.5):** implemented before generation; file-backed cues are live. | Snorre |
| 7 | Stability AI licence for commercial use? | **Decided (v0.4):** non-commercial coursework — Community License, no registration, outputs owned by the generator; licence recorded per file in `licenses.json` + the prompt log. If commercial release ever happens: register with Stability and add the "Powered by Stability AI" attribution before shipping. | Snorre |
| 8 | Silicon copies? | **Decided (v0.5):** Silicon mirrors the 12 anatomy files and manifest entries. | Snorre |
| 9 | `dialogue` on open or on advance? | **Decided:** keep on open; per-advance would be noisy and needs a code change. | Snorre |
| 10 | `gate` on open and `unlock` on solve? | **Decided:** keep the split; it matches the current runtime. | Snorre |
| 11 | Room/menu themes? | Proposed in ADR-0076/0077 and `room-and-menu-themes-v01.md`; accept before implementation. | Snorre |
| 12 | `boot` after the model collapse? | **Decided (v0.5):** keep `boot` as a declared placeholder; the model collapses hum + hiss + beeps into a continuous clipped tone. Next attempt is a layer/compile pipeline, not another checkpoint. | Snorre |
| 13 | `scan` is shorter than its window? | **Decided (v0.5):** seed 4 is 0.10 s (window 0.3–1.0 s); the user approved the take by ear and it is installed as a recorded exception. Revisit with the mixer/compiler. | Snorre |

---

## 17. Change log

| Date | Change |
|---|---|
| 2026-11-03 | Initial consolidated audio requirement and prompt sheet. Adds the 18-cue register, M3 and M3.5 cue cards, Ludo/Stability tool guide, delivery spec, integration checklist, prompt log, and open decisions. |
| 2026-11-03 | Link the proposed room/menu theme extension (ADR-0076/0077, `room-and-menu-themes-v01.md`); keep the 18-cue SFX scope unchanged. |
| 2026-11-03 | Rewrite the Ludo prompts with concrete analogies and fenced copy-paste blocks; add layer recipes and the Ludo prompt grammar/duration table; correct Ludo durations; separate `gate` from `unlock`; move delivery specs out of the Ludo prompt. |
| 2026-11-03 | **v0.4 — pipeline switch to fully local generation.** Primary tool is now the local Stable Audio 3 Small SFX fleet daemon (`scripts/sfx-generate.ts`, §10.2); Ludo is the hero-cue fallback only. Records the negative-prompt no-op on the post-trained checkpoint, the `-base` escalation, the Stability AI Community License (non-commercial, outputs owned), and the CSV prompt log. |
| 2026-11-03 | **v0.5 — SFX delivery pass (partial).** Pilot `scan`, `jump`, `land` installed and licensed; `boot` declared placeholder after both checkpoints collapsed the compound prompt into a continuous clipped hum; `scan` seed 4 is a recorded 0.10 s exception. MP3 160 kbps mono at 48 kHz; `.ogg` examples swept to `.mp3`; `boot` prompt revised for clipping; true-peak normalisation added to the consumer script. The remaining 14 cues and the `boot` fix await the mixer/compiler work. |
