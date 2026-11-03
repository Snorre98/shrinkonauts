# Asset Prompt Library — Audio and Graphics v0.1

- **Status:** Draft
- **Date:** 2026-11-03
- **Owner:** Snorre
- **Scope:** Cross-discipline inventory and prompt routing for graphics and audio assets across the authored packs and the bathroom hub
- **Prompt version:** `assets-2026-11-03.1`
- **Governing ADR:** [`docs/adr-assets/0078-audio-and-graphics-prompt-libraries.md`](../adr-assets/0078-audio-and-graphics-prompt-libraries.md)
- **Related:** [`docs/m3/asset-requirements-v01.md`](../m3/asset-requirements-v01.md) · [`docs/m3/background-asset-requirements-v01.md`](../m3/background-asset-requirements-v01.md) · [`docs/m3/muscle-endplate-asset-requirements-v01.md`](../m3/muscle-endplate-asset-requirements-v01.md) · [`docs/m3.5/hub-asset-prompts-v01.md`](../m3.5/hub-asset-prompts-v01.md) · [`docs/audio/audio-requirements-and-prompts-v01.md`](../audio/audio-requirements-and-prompts-v01.md) · [`docs/audio/room-and-menu-themes-v01.md`](../audio/room-and-menu-themes-v01.md)

> **The rule:** this document is the index, not a duplicate prompt bible. The discipline documents own the full prompt text and acceptance checks. This library owns the cross-discipline inventory, status, generation order, and the gap prompts that have no other owner.

---

## 1. Summary

| Decision | Value |
|---|---|
| Graphics prompt sources | M3, background, muscle-endplate, M3.5 hub, Silicon level packs |
| Audio prompt sources | 18 SFX cues; four music themes |
| Current graphics state | Final, interim, and placeholder assets coexist |
| Current audio state | All 18 SFX cues are placeholders; four themes are proposed, no files |
| Visible placeholder-only sprites | `sprite.scan.neuron`, `sprite.scan.pathway`, `sprite.scan.interrupt`, `sprite.exit.silicon` |
| Audio delivery | File-backed cue and theme playback implemented; no audio files exist yet |
| Prompt versioning | Per-discipline document version plus the umbrella version above |
| Generation order | Visible placeholders → final 04 replacements → SFX → themes |

**The one-line rule:** every visible placeholder must be in the inventory; every generated asset must have a prompt source, a source file, an acceptance result, and a licence.

---

## 2. Current branch state

The branch has two committed/documentation streams:

1. **Audio documentation committed** (`f36ac08`):
   - `docs/audio/audio-requirements-and-prompts-v01.md` — 18 SFX prompts.
   - `docs/audio/room-and-menu-themes-v01.md` — four theme prompts.
   - `docs/adr-audio/0076-room-and-menu-audio-themes.md`.
   - `docs/adr-audio/0077-audio-theme-playback-and-mixing.md`.
2. **Graphics pass in the working tree:**
   - `docs/m3/muscle-endplate-asset-requirements-v01.md` — 04 sky, four atlases, gate and exit prompts.
   - `scripts/art-atlas.ts` and `npm run art:atlas`.
   - Four neutral procedural interim atlases.
   - Interim 04 sky, gate and exit files.
   - Manifest, materials, room, licence, test and README wiring.

The branch does **not** yet have final audio files. File-backed cue playback and
ADR-0077 theme playback are implemented; missing files resolve to the synth or
silence. The graphics intermediates are playable but are not final Nano Banana
outputs.

### 2.1 Status vocabulary

| Status | Meaning |
|---|---|
| `final` | Approved runtime file; `placeholder` removed; licence and prompt log exist |
| `interim` | Runtime file exists but is procedural/interim; `placeholder: true` remains |
| `placeholder-only` | No runtime file; `PlaceholderProvider` or synth fallback renders |
| `reserve` | Declared but not referenced by authored content |
| `deferred` | Deliberately outside the current pass; prompt may exist or be future work |

---

## 3. Placeholder legend

The bright cyan/yellow squares in the game are **not tiles**. They are the
procedural placeholder provider’s entity sprites:

- `src/assets/placeholder-provider.ts` `shapeSpec()` draws a 48×48 rounded
  square with a 2 px dark stroke and a 4-character label.
- Fill is deterministic by asset-ID hash:
  - `hashString(id) % 2 === 0` → `palette.nerve` (`#ffd166`, yellow)
  - otherwise → `palette.accent` (`#7bdff2`, cyan)
- The label is the first four characters of the last asset-ID segment:
  - `sprite.scan.neuron` → **NEUR**
  - `sprite.scan.pathway` → **PATH**
  - `sprite.scan.synapse` → **SYNA**
  - `sprite.scan.muscle` → **MUSC**
  - `sprite.scan.reflex` → **REFL**
  - `sprite.scan.interrupt` → **INTE**
  - `sprite.exit.silicon` → **SILI**

The provider is reached only when a manifest entry has no `src`. An entry with
`src` and `placeholder: true` renders the file and is therefore “interim”, not
a colored box.

### 3.1 Current visible placeholders

| Asset | Color/label | Where | Why |
|---|---|---|---|
| `sprite.scan.neuron` | yellow **NEUR** | `03-nerve-forest`: `scan-neuron`, `scan-myelin` | Source plate lost myelin/node detail at 36×36; shared icon for neuron and myelin |
| `sprite.scan.pathway` | cyan **PATH** | `03-nerve-forest`: `scan-pathway` | Source plate collapsed to a wide 16×6 strip; one-way reading lost |
| `sprite.scan.interrupt` | cyan **INTE** | `01-interrupt-loop`: `scan-interrupt` | Silicon prompt packed as an all-ink 16×4 strip; not wired |
| `sprite.exit.silicon` | yellow **SILI** | `01-interrupt-loop`: `exit-silicon` | Deferred; existing docs suggest reusing `sprite.exit` |

The two NEUR boxes in 03 are `scan-neuron` and `scan-myelin`; both reference
`sprite.scan.neuron`. That is intentional reuse, not a duplicate entity bug.

---

## 4. Graphics inventory

### 4.1 Final runtime graphics

These are approved or POC-integrated and have `src` paths:

- P1/P2 static and animation sheets.
- Neuron Keeper static + 36-frame idle.
- `sprite.scan.synapse`, `sprite.scan.muscle`.
- `sprite.pad.dendrite`, `sprite.pad.terminal`.
- `sprite.gate.ferry`, `sprite.prop.tracer`, `sprite.pulse.terminal`.
- `sprite.receptor.triangle`, `sprite.receptor.circle`.
- `bg.nerve_forest.sky`.
- Silicon final sprites and `bg.silicon_board.sky`.
- Hub final scene/props/sprites listed in `docs/m3.5/hub-asset-prompts-v01.md`.

### 4.2 Interim graphics

These have runtime files but keep `placeholder: true`:

| Asset | File | Source document | Replace with |
|---|---|---|---|
| `bg.muscle_endplate.sky` | `shared/backgrounds/muscle-endplate-sky.webp` | muscle-endplate §5 | Nano Banana pretty sky |
| `tile.bone.atlas` | `shared/tiles/bone-atlas.png` | muscle-endplate §6.4 | Nano Banana bone swatch |
| `tile.nerve.atlas` | `shared/tiles/nerve-atlas.png` | muscle-endplate §6.5 | Nano Banana nerve swatch |
| `tile.muscle.atlas` | `shared/tiles/muscle-atlas.png` | muscle-endplate §6.2 | Nano Banana muscle swatch |
| `tile.membrane.atlas` | `shared/tiles/membrane-atlas.png` | muscle-endplate §6.3 | Nano Banana membrane swatch |
| `sprite.gate.nerve` | `shared/sprites/gate-nerve.png` | muscle-endplate §7.1 | Nano Banana gate |
| `sprite.exit` | `shared/sprites/exit.png` | muscle-endplate §7.2 | Nano Banana airlock |

The checked-in atlas files are neutral greyscale and rely on the material
`tint` tokens. Final coloured atlases remove the tints and the `placeholder`
flags.

### 4.3 Placeholder-only graphics

| Asset | Scope | Prompt source | Priority |
|---|---|---|---|
| `sprite.scan.neuron` | 03, two entities | §5.1 below + M3 §8 | P0 |
| `sprite.scan.pathway` | 03 | §5.2 below + M3 §8 | P0 |
| `sprite.scan.interrupt` | Silicon | `docs/prompts/levels/01-interrupt-loop-assets.md` §8.2 | P1 |
| `sprite.exit.silicon` | Silicon | `docs/prompts/levels/01-interrupt-loop-assets.md` §12.2; decide reuse `sprite.exit` | P1 |
| `sprite.scan.reflex` | reserve, not referenced | M3 | P2 |
| `sprite.checkpoint` | reserve, not rendered | M3 | P2 |
| `ui.icon.badge` | HUD | M3 §8.22 | P2 |
| `ui.icon.scan/map/log` | UI | M3 | P2 |
| `ui.portrait.neuron`, UI panels | UI | M3 | P2 |
| `bg.nerve_forest.far/mid/near` | 03 deferred | background requirements | P3 |
| `bg.muscle_endplate.far/mid/near` | 04 deferred | muscle-endplate / future | P3 |
| `bg.silicon_board.far/mid/near` | Silicon deferred | Silicon prompt pack | P3 |
| Hub logo, toy astronaut, optional props | Hub | M3.5 hub prompts | P3 |

`tileset.anatomy` and `tileset.silicon` remain declared placeholder entries but
are not used when the material grid resolves; they are not visible placeholders.

---

## 5. New graphics gap prompts

The M3 prompts for `sprite.scan.neuron` and `sprite.scan.pathway` exist, but the
generated plates were wide diagrams. These revised prompts target a **square
36×36 cell** and simplify the silhouette. Use `STYLE_SPRITE`, `PALETTE`, and
`FRAME_ENTITY` from `docs/m3/asset-requirements-v01.md` §7–8.

### 5.1 `sprite.scan.neuron` — compact neuron/myelin scan

**File:** `shared/sprites/scan-neuron.png` · **Display:** 36×36 · **Status:** placeholder-only

```text
SUBJECT: A compact diagrammatic scan icon of one nerve cell, designed to read in a square 36×36 cell — not a character. A round bone-cream cell body on the left with five short branching dendrites; one bold cable-like axon runs to the right; three pale bead-like myelin sleeves with dark node gaps; a small forked terminal at the right. A nerve-yellow glow sits in the cell body; a thin joint-cyan rim traces the silhouette. The silhouette fills about 80% of the square, with clear dark gaps between shapes. Flat side view, left-to-right reading. No face, eyes, arms, lantern, labels, arrows, second axon, second cell body, or gore.
```

**Negative:** `NEGATIVE_SPRITE` + `character, face, eyes, arms, lantern, humanoid, fur, hair, second axon, second cell body, long horizontal strip, wide diagram, tiny detail, labels, arrows.`

**Acceptance**

- At 36×36, the soma, dendrites, one axon, three myelin beads/nodes, forked terminal, and cyan rim read.
- The silhouette is a compact square icon, not a wide 16×9 strip.
- Distinct from `sprite.agent.neuron`; no face, arms, or lantern.
- No text, arrows, or gore.

### 5.2 `sprite.scan.pathway` — compact one-way pathway scan

**File:** `shared/sprites/scan-pathway.png` · **Display:** 36×36 · **Status:** placeholder-only

```text
SUBJECT: A compact diagrammatic scan icon of a one-way nerve path, designed to read in a square 36×36 cell — not a character. A small bone-cream soma sits at the far left with five short dendrites; one bold axon crosses the square to the right; three pale bead-like myelin sleeves with dark node gaps; a bright nerve-yellow pulse sits in one gap; the axon ends in a forked terminal pointing right. A thin joint-cyan rim traces the silhouette. The left-to-right taper and the pulse are the dominant shapes. No face, eyes, arms, lantern, labels, arrows, diagram lines, second axon, or gore.
```

**Negative:** `NEGATIVE_SPRITE` + `character, face, eyes, arms, lantern, humanoid, fur, hair, arrow, labels, second axon, wide diagram, long horizontal strip, tiny detail.`

**Acceptance**

- At 36×36, the soma, one axon, myelin beads/nodes, pulse in a gap, and forked rightward terminal read.
- The one-way reading comes from the shape, not an arrow.
- Visibly distinct from `scan.neuron` at 36×36; no face or labels.
- No text, arrows, or gore.

### 5.3 Optional `sprite.scan.myelin` — dedicated myelin icon

**Status:** proposed, not in the manifest. Use only if playtest/review rejects
the shared neuron/myelin icon.

```text
SUBJECT: A compact diagrammatic scan icon of one myelinated axon segment, designed to read in a square 36×36 cell. One dark teal cable runs horizontally; three pale bone-cream bead-like sleeves wrap it; two dark node gaps; a faint nerve-yellow pulse in one gap; a thin joint-cyan rim traces the silhouette. No cell body, no face, no labels, no arrows, no gore.
```

**Negative:** `NEGATIVE_SPRITE` + `character, face, cell body, dendrites, lantern, labels, arrows, second axon, wide diagram.`

**Acceptance:** three sleeves, two nodes, one cable, one pulse, and cyan rim read
at 36×36; distinct from `scan.neuron`; no text.

---

## 6. Graphics prompt sources

| Asset family | Prompt source | Notes |
|---|---|---|
| Shared sprites, scans, gates, props, receptors, badge | [`docs/m3/asset-requirements-v01.md`](../m3/asset-requirements-v01.md) | M3 style blocks, per-asset prompts, atlas maps, prompt log |
| 03 background layers | [`docs/m3/background-asset-requirements-v01.md`](../m3/background-asset-requirements-v01.md) | Current 03 sky wired; far/mid/near future |
| 04 sky, four atlases, gate, exit | [`docs/m3/muscle-endplate-asset-requirements-v01.md`](../m3/muscle-endplate-asset-requirements-v01.md) | Interim files wired; final Nano Banana prompts |
| Hub scene/props/UI | [`docs/m3.5/hub-asset-prompts-v01.md`](../m3.5/hub-asset-prompts-v01.md) | Nano Banana first, Ludo fallback |
| Silicon entities/theme | [`docs/prompts/silicon-theme.md`](../prompts/silicon-theme.md) and [`docs/prompts/levels/01-interrupt-loop-assets.md`](../prompts/levels/01-interrupt-loop-assets.md) | Final Silicon entities; interrupt/exit gaps |
| 03 scan gaps | §5 above | Revised square 36×36 prompts |

---

## 7. Audio inventory

### 7.1 Current state

- **18 SFX cues** are declared across the anatomy, Silicon and hub manifests.
- **All 18 are placeholders with no `src`.** No audio files exist.
- **Four themes** are proposed in ADR-0076; no files exist.
- `ManifestAudioProvider` is implemented: it fetches, decodes, caches and plays
  file-backed cues, keeping the synth fallback for missing or failed files.
  ADR-0077 theme playback is also implemented. No audio files exist yet, so
  cues still resolve to placeholders and themes resolve to silence.
- No audio licence records exist.

### 7.2 SFX index

Full prompts, durations, negative prompts and acceptance: [`docs/audio/audio-requirements-and-prompts-v01.md`](../audio/audio-requirements-and-prompts-v01.md).

| Group | Asset IDs | Prompt sections |
|---|---|---|
| M3 anatomy (11) | `audio.cue.boot`, `dialogue`, `scan`, `dash`, `gate`, `map`, `debrief`, `checkpoint`, `unlock`, `jump`, `land` | §7.1–7.11 |
| M3 optional (1) | `audio.cue.wrong` | §9 |
| M3.5 hub (6) | `audio.cue.hub.click`, `hub.door`, `hub.spin`, `hub.shrink`, `hub.arrive`, `hub.hum` | §8.1–8.6 |

Shared anatomy style block: §4.1. Hub style block: §4.2. Global negative: §4.4.
Format, loudness, trimming and QA: §5 and §12.

### 7.3 Theme index

Full prompts, motif, lengths and loop checks: [`docs/audio/room-and-menu-themes-v01.md`](../audio/room-and-menu-themes-v01.md).

| Scope | Asset ID | Prompt section | Status |
|---|---|---|---|
| Menu / hub | `audio.music.menu` | §4.1 | Proposed, no file |
| `03-nerve-forest` | `audio.music.nerve_forest` | §4.2 | Proposed, no file |
| `04-muscle-effector` | `audio.music.muscle_effector` | §4.3 | Proposed, no file |
| `01-interrupt-loop` | `audio.music.interrupt_loop` | §4.4 | Proposed, no file |

### 7.4 Audio completion gates

A final audio asset is not delivered until all of these are true:

1. `ManifestAudioProvider` fetches, decodes, caches and plays the file.
2. ADR-0077 theme playback is implemented for themes.
3. The manifest entry has `src` and `license`; `placeholder` is removed.
4. The cue/theme passes the prompt document’s format, loudness and duration checks.
5. The prompt log records tool, model, prompt version, seed, source, working file,
   runtime export, post-processing, licence and reviewer.
6. The browser smoke confirms the first-gesture unlock and a room/menu theme
   starts.
7. Manual three-loop QA passes for themes; no seam or clipped tail.

Do not commit audio files before gate 1. A silent file hides the provider gap.

---

## 8. Generation order

### P0 — visible placeholders

1. `sprite.scan.neuron` — revised square prompt §5.1.
2. `sprite.scan.pathway` — revised square prompt §5.2.
3. `sprite.scan.interrupt` and `sprite.exit.silicon` — Silicon prompt pack; decide
   whether to reuse `sprite.exit` before generating a new exit.

### P1 — final 04 replacements

4. `bg.muscle_endplate.sky` — final pretty sky.
5. Four atlas swatches — bone, nerve, muscle, membrane.
6. `sprite.gate.nerve`, `sprite.exit` — final 64×64 sprites.
7. Remove `placeholder: true` from the replaced entries; remove material tints
   when coloured atlases land.

### P2 — audio

8. ~~Implement `ManifestAudioProvider` and theme playback.~~ Done in this branch.
9. Generate and wire the 18 SFX cues.
10. Generate and wire the four themes.

### P3 — deferred graphics

11. 03/04/Silicon far/mid/near layers.
12. UI badge, portraits, panels.
13. Hub logo, toy astronaut, optional props.
14. Reserve `scan.reflex`, `checkpoint`, optional `scan.myelin`.

---

## 9. Shared rules

- **Source/working/runtime:** follow ADR-0060. Raw prompt outputs live under
  `art-source/`; runtime files live under `public/`.
- **No raw files in `public/`:** manifests reference only processed runtime files.
- **Naming:** lowercase kebab-case; asset IDs stay stable.
- **Graphics format:** 32×32 atlas frames at 1:1; 36×36 scans at 1:1; 64×64
  interactables at 1:1; hard alpha; 2×2 clusters; lossless WebP/PNG for pixel
  assets.
- **Audio format:** 48 kHz; cue budget ≤120 KB; themes ≤1.5 MB; OGG q4–q6 with
  MP3 fallback; themes −18 to −16 LUFS, true peak ≤ −1 dBTP.
- **Licensing:** every non-placeholder entry needs a licence record and prompt log.
- **Placeholder flags:** remove `placeholder` only when the final asset passes
  acceptance. Interim files keep the flag.
- **Tint:** neutral interim atlases keep material tints; final coloured atlases
  remove them.

---

## 10. Validation

```text
npm test
npm run pack:validate
npm run pack:smoke
npm run build
npm run smoke:e2e
npm run gdd:site
```

Expected:

- Every placeholder-only asset referenced by an authored room appears in §3.1
  or §4.3.
- The 03 scan prompts produce square 36×36 runtime PNGs, not wide strips.
- Audio files are not committed while the provider is a stub.
- Final replacements remove `placeholder` and keep licence/prompt-log entries.
- The umbrella library, discipline prompt documents and manifests agree.

---

## 11. Prompt log template

| Field | Value |
|---|---|
| Asset ID | |
| Prompt document + version | |
| Tool/model | |
| Seed / variation | |
| Source file | |
| Working file | |
| Runtime export | |
| Acceptance result | |
| Licence | |
| Reviewer/date | |
| Notes | |

---

## 12. Open decisions

- Dedicated `sprite.scan.myelin`, or keep the shared `scan.neuron` icon?
- Reuse `sprite.exit` for Silicon, or generate `sprite.exit.silicon`?
- Implement `ManifestAudioProvider` before or alongside SFX generation?
- Add the placeholder inventory warning to `pack:validate` now or as a follow-up?
- Are 03/04/Silicon far/mid/near layers in scope for this milestone?
- Are hub logo/toy astronaut final assets in scope or deferred?
