# Asset Prompt Library — Audio and Graphics v0.2

- **Status:** Draft
- **Last updated:** 2026-11-03
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
| Current graphics state | Final 04 batch, POC-integrated earlier art, and the deliberate placeholder/fallback assets listed in §3.1 and §4.3 coexist |
| Current 04 source batch | **7 source plates processed, wired and accepted** (`2026-11-03`) |
| Current audio state | 3 of 18 SFX cues installed; 15 cues and four themes remain placeholders |
| Visible placeholder-only sprites | `sprite.scan.neuron`, `sprite.scan.myelin`, `sprite.scan.pathway`, `sprite.scan.interrupt`, `sprite.exit.silicon` |
| Audio delivery | File-backed cue and theme playback implemented; three pilot SFX files exist, themes are silent |
| Prompt versioning | Per-discipline document version plus the umbrella version above |
| Canonical status | §4.0 completion matrix |
| Generation order | 04 source processing ✅ → remaining visible placeholders (blocked on new sources) → SFX → themes |

**The one-line rule:** every visible placeholder must be in the inventory; every generated asset must have a prompt source, a source file, an acceptance result, and a licence.

---

## 2. Current branch state

The branch now contains:

1. **04 graphics batch accepted** (`2026-11-03`):
   - Seven Nano Banana source plates under
     `art-source/nanobanan/new/muscle-endplate-2026-11-03/`.
   - Processed 04 sky, four coloured material atlases, `sprite.gate.nerve` and
     `sprite.exit`; manifest `src`, licences, prompt log and tests complete.
   - Material tints removed; `placeholder` removed from the seven entries.
   - The atlas assembler has an explicit `--weld-edges` pass and a
     `--selection single` mode that reuses one source window across all masks;
     `art:normalize` accepts a `--ramps` subset for material swatches.
2. **Earlier POC graphics integrated**:
   - P1/P2 players, Neuron Keeper static + 36-frame idle.
   - Readable scans/entities, the 03 pretty sky and the hub M3.5 art.
3. **Remaining placeholder decisions**:
   - The three 03 scans (`scan.neuron`, `scan.myelin`, `scan.pathway`) remain
     placeholder-only; the old neuron/pathway plates fail the 36×36 read and no
     new source exists. The new fact-specific prompts are in
     [`scan-prompts-v02.md`](scan-prompts-v02.md).
   - Silicon scan interrupt and Silicon exit remain placeholder-only.
   - The hub logo uses the approved Silkscreen CSS fallback; the toy astronaut
     is cut; the HUD badge keeps its CSS fallback.
4. **Audio partially delivered** (`278d687`):
   - Three SFX cues (`scan`, `jump`, `land`) are installed in both packs.
   - 15 cues and all four themes remain placeholders.
   - File-backed cue playback and ADR-0077 theme playback are implemented;
     missing files resolve to the synth or silence.

### 2.1 Status vocabulary

**Runtime status** describes what the game currently loads:

| Status | Meaning |
|---|---|
| `final` | Approved runtime file; `placeholder` removed; licence and prompt log exist |
| `interim` | Runtime file exists but is procedural/interim; `placeholder: true` remains |
| `placeholder-only` | No runtime file; `PlaceholderProvider` or synth fallback renders |
| `reserve` | Declared but not referenced by authored content |
| `deferred` | Deliberately outside the current pass; prompt may exist or be future work |

**Pipeline stage** describes how far an asset has moved through the art
pipeline. Record the stage separately from the runtime status; a file can be
`source-generated` while the game still loads an `interim` placeholder.

| Stage | Evidence required |
|---|---|
| `prompt-ready` | Prompt exists in a discipline document |
| `source-generated` | Raw generator plate exists under `art-source/` |
| `source-accepted` | Source passes composition, background, silhouette and readability checks |
| `processed` | Keyed/cropped/fitted/palette-checked/atlas-assembled, with previews and reports |
| `wired` | Runtime file exists, manifest has `src`, licence exists, and relevant tests pass |
| `accepted` | `placeholder` removed and every acceptance/prompt-log gate passes |

**Rules**

- Update this document’s [completion matrix](#40-completion-matrix) first, then
  update the discipline document’s summary line.
- A stage is checked only when its evidence exists. A prompt is not a source; a
  source is not a processed asset; a processed file is not accepted until it is
  wired and reviewed.
- Never call a generated JPEG “final”. Raw source plates are not runtime assets.
- A blocked asset keeps its current stage and records the blocker in the matrix.

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
  - `sprite.scan.myelin` → **MYEL**
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
| `sprite.scan.neuron` | yellow **NEUR** | `03-nerve-forest`: `scan-neuron` | Old plate fits 32×17; new compact-cell prompt is ready, no new source |
| `sprite.scan.myelin` | cyan **MYEL** | `03-nerve-forest`: `scan-myelin` | New dedicated sleeve prompt; no source yet |
| `sprite.scan.pathway` | cyan **PATH** | `03-nerve-forest`: `scan-pathway` | Old plate fits 32×13; new node-chain prompt is ready, no new source |
| `sprite.scan.interrupt` | cyan **INTE** | `01-interrupt-loop`: `scan-interrupt` | Old plate fits 32×7, 220 opaque pixels; square scan read and rim lost |
| `sprite.exit.silicon` | yellow **SILI** | `01-interrupt-loop`: `exit-silicon` | No Silicon source; reuse of the organic/warm anatomy exit rejected; placeholder retained |

The three 03 scan targets now have separate assets and separate card facts:
`scan-neuron` (NERV-01#1), `scan-myelin` (NERV-01#3), and `scan-pathway`
(NERV-01#6). `scan-myelin` no longer reuses `sprite.scan.neuron`. The pads and
terminal are interactable props, not scans.

---

## 4. Graphics inventory

### 4.0 Completion matrix

**Last updated:** 2026-11-03

This is the single source of truth for graphics evidence and per-asset status.
For the consolidated “what do I do next?” checklist across graphics, audio, and
integration, see [`remaining-work.md`](remaining-work.md). “Runtime” uses the
status vocabulary in §2.1; “Stage” uses the pipeline stages in §2.1.

| Asset | Priority | Runtime | Stage | Source / evidence | Next action | Blocker / pending |
|---|---|---|---|---|---|---|
| `bg.muscle_endplate.sky` | P0 | `final` | `accepted` | `.../bg.muscle_endplate.sky.jpeg` (2752×1536) → 2720×1530 crop → 1280×720 lossless VP8L, 669,798 bytes | — | — |
| `tile.muscle.atlas` | P0 | `final` | `accepted` | `.../tile.muscle.atlas.jpeg` → 512 swatch → 128×128 4×4 edge atlas; palette/2×2/edge checks | — | — |
| `tile.membrane.atlas` | P0 | `final` | `accepted` | `.../tile.membrane.atlas.jpeg` → 512 swatch → 128×128 4×4 edge atlas | — | — |
| `tile.bone.atlas` | P0 | `final` | `accepted` | `.../tile.bone.atlas.jpeg` → 512 swatch → 256×192 8×6 `blob47` | — | — |
| `tile.nerve.atlas` | P0 | `final` | `accepted` | `.../tile.nerve.atlas.jpeg` → 512 swatch → 128×128 4×4 edge atlas | — | — |
| `sprite.gate.nerve` | P1 | `final` | `accepted` | `.../sprite.gate.nerve.jpeg` → key/trim → 60×60 in 64×64; 5,444 bytes | — | — |
| `sprite.exit` | P1 | `final` | `accepted` | `.../sprite.exit.jpeg` → key/trim → 59×60 in 64×64; 6,043 bytes | — | — |

The full source folder is
`art-source/nanobanan/new/muscle-endplate-2026-11-03/`. Evidence paths are in
[muscle-endplate §12](../m3/muscle-endplate-asset-requirements-v01.md#12-prompt-log-template)
and the licence entries.

**Current counts:** 7 source-generated; 7 source-accepted; 7 processed; 7 wired;
7 accepted. The interim procedural files and material tints are gone from the
runtime.

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

There are no `interim` graphics left in the authored packs. The 04 batch moved
from `interim` to `final`/`accepted`; the neutral procedural atlases, 04 sky
stand-in, gate and exit placeholders are retained only as historical working
files and are not referenced by a manifest.

The Silicon `tile.circuit.atlas` remains a manifest-only placeholder SVG; it is
outside this pass and is not a visible placeholder.

### 4.3 Placeholder-only graphics

| Asset | Scope | Prompt source | Decision / next action |
|---|---|---|---|
| `sprite.scan.neuron` | 03, `scan-neuron` | [`scan-prompts-v02.md`](scan-prompts-v02.md) §1 | Keep placeholder. Old plate fits 32×17 and fails; new compact-cell prompt is ready, no new source. |
| `sprite.scan.myelin` | 03, `scan-myelin` | [`scan-prompts-v02.md`](scan-prompts-v02.md) §2 | Keep placeholder. New dedicated sleeve prompt; shared neuron/myelin icon retired. |
| `sprite.scan.pathway` | 03, `scan-pathway` | [`scan-prompts-v02.md`](scan-prompts-v02.md) §3 | Keep placeholder. Old plate fits 32×13 and fails; new node-chain prompt is ready, no new source. |
| `sprite.scan.interrupt` | Silicon | `docs/prompts/levels/01-interrupt-loop-assets.md` §8.2 | Keep placeholder. Old plate fits 32×7/220 px and fails; needs a square recomposition. |
| `sprite.exit.silicon` | Silicon | `docs/prompts/levels/01-interrupt-loop-assets.md` §12.2 | Keep placeholder. Reuse of the organic/warm anatomy exit is rejected for the Silicon tech style. |
| `sprite.scan.reflex` | reserve, not referenced | M3 | Keep reserve; not rendered. |
| `sprite.checkpoint` | reserve, not rendered | M3 | Keep reserve; data point is used instead. |
| `ui.icon.badge` | HUD | M3 §8.22 | Keep the CSS fallback. 14×14 fit loses the helmet dome; dedicated 16×16 redraw deferred. |
| `ui.icon.scan/map/log` | UI | M3 | Deferred; UI does not render them. |
| `ui.portrait.neuron`, UI panels | UI | M3 | Deferred; UI does not render them. |
| `bg.nerve_forest.far/mid/near` | 03 deferred | background requirements | Deferred layered pass. |
| `bg.muscle_endplate.far/mid/near` | 04 deferred | muscle-endplate / future | Declared placeholders; not wired. |
| `bg.silicon_board.far/mid/near` | Silicon deferred | Silicon prompt pack | Deferred. |
| `ui.logo.shrinkonauts` | Hub | M3.5 hub prompts | CSS Silkscreen fallback approved; delivered plate rejected (washer baked behind letters). |
| `sprite.prop.toy.astronaut` | Hub | M3.5 hub prompts | **Cut.** No source and not referenced by `hub.json`. |

`tileset.anatomy` and `tileset.silicon` remain declared placeholder entries but
are not used when the material grid resolves; they are not visible placeholders.

---

## 5. New graphics gap prompts

> **On hold (2026-11-03):** the 03 scan taxonomy is under
> [M2.75](../m2.75/README.md) review. Do not generate final scan sources until
> M2.75 chooses whether myelin and pathway are separate objects, parts, or
> process overlays. The prompts below are review-ready, not commissioned.

The 03 scan set is now three fact-specific icons, not two shared whole-cell
diagrams. The full copy-paste prompts are in
[`scan-prompts-v02.md`](scan-prompts-v02.md). Use `STYLE_SPRITE`, `PALETTE`, and
`FRAME_ENTITY_SQUARE`; do **not** use the old `FRAME_ENTITY_CONCEPT` block for
these icons.

| Asset | Card fact | Silhouette | Status |
|---|---|---|---|
| `sprite.scan.neuron` | NERV-01#1 — neuron parts and direction | round cell, curled axon | prompt-ready, no new source |
| `sprite.scan.myelin` | NERV-01#3 — sheath, nodes, speed | capsule with a pinched node | prompt-ready, no new source |
| `sprite.scan.pathway` | NERV-01#6 — all-or-none, one-way, saltatory | three-bead chain + terminal fork | prompt-ready, no new source |

The reasons for the change:

- The old neuron and pathway plates fit **32×17** and **32×13**; the new art
  must fit at least **24×24** in the 36×36 cell.
- The old pathway was the neuron icon plus a small pulse. At 36×36 the two
  silhouettes were effectively identical (alpha IoU ~0.99). The new pathway
  drops the soma and dendrites and becomes a node chain.
- `scan-myelin` now has its own sprite. The shared neuron/myelin icon is retired.
- The pads and terminal are interactable props, not scans. The Keeper dialogue
  reveals CON-3, CON-5, and NERV-01#5; the three scans reveal NERV-01#1, #3,
  and #6.
- The old root JPEGs (`sprite-scan-neuron.jpeg`, `sprite-scan-pathway.jpeg`) are
  old-prompt outputs. They are reference only; they are not sources for the new
  concepts.

### 5.1 `sprite.scan.neuron` — compact cell structure

See [`scan-prompts-v02.md`](scan-prompts-v02.md#1-spritescanneuron) for the full
prompt. The icon is a round soma with a five-branch dendrite crown and a short
curled axon ending in a fork. No myelin beads; no face, arms, or lantern.

### 5.2 `sprite.scan.pathway` — one-way conduction chain

See [`scan-prompts-v02.md`](scan-prompts-v02.md#3-spritescanpathway) for the full
prompt. The icon is a diagonal chain of three myelin beads with a dim-to-bright
pulse in the node gaps and a forked terminal. No soma or dendrites; the pulse is
in a node gap, not inside a sleeve.

### 5.3 `sprite.scan.myelin` — dedicated sheath icon

See [`scan-prompts-v02.md`](scan-prompts-v02.md#2-spritescanmyelin) for the full
prompt. The icon is a diagonal capsule with two pale sleeves and one dark node.
No cell body, dendrites, terminal fork, or pulse. This is now required; it is no
longer an optional future asset.

---

## 6. Graphics prompt sources

| Asset family | Prompt source | Notes |
|---|---|---|
| Shared sprites, scans, gates, props, receptors, badge | [`docs/m3/asset-requirements-v01.md`](../m3/asset-requirements-v01.md) | M3 style blocks, per-asset prompts, atlas maps, prompt log |
| 03 background layers | [`docs/m3/background-asset-requirements-v01.md`](../m3/background-asset-requirements-v01.md) | Current 03 sky wired; far/mid/near future |
| 04 sky, four atlases, gate, exit | [`docs/m3/muscle-endplate-asset-requirements-v01.md`](../m3/muscle-endplate-asset-requirements-v01.md) | Accepted 2026-11-03; evidence in §12 |
| Hub scene/props/UI | [`docs/m3.5/hub-asset-prompts-v01.md`](../m3.5/hub-asset-prompts-v01.md) | Nano Banana first, Ludo fallback |
| Silicon entities/theme | [`docs/prompts/silicon-theme.md`](../prompts/silicon-theme.md) and [`docs/prompts/levels/01-interrupt-loop-assets.md`](../prompts/levels/01-interrupt-loop-assets.md) | Final Silicon entities; interrupt/exit gaps |
| 03 scan gaps | [`scan-prompts-v02.md`](scan-prompts-v02.md) | Three fact-specific square prompts |

---

## 7. Audio inventory

### 7.1 Current state

- **18 SFX cues** are declared across the anatomy, Silicon and hub manifests.
- **3 cues are installed** (`scan`, `jump`, `land`) from the 2026-11-03 pilot;
  **15 remain placeholders with no `src`**.
- **Four themes** are proposed in ADR-0076; no files exist.
- `ManifestAudioProvider` is implemented: it fetches, decodes, caches and plays
  file-backed cues, keeping the synth fallback for missing or failed files.
  ADR-0077 theme playback is also implemented; missing themes resolve to
  silence.
- Licence records exist for the three installed SFX; no theme licences exist.

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

### P0 — remaining visible placeholders

1. `sprite.scan.neuron` — compact-cell prompt in
   [`scan-prompts-v02.md`](scan-prompts-v02.md) §1; needs a new source.
2. `sprite.scan.myelin` — dedicated sheath prompt in
   [`scan-prompts-v02.md`](scan-prompts-v02.md) §2; needs a new source.
3. `sprite.scan.pathway` — one-way chain prompt in
   [`scan-prompts-v02.md`](scan-prompts-v02.md) §3; needs a new source.
4. `sprite.scan.interrupt` — needs a square recomposition/new source.
5. `sprite.exit.silicon` — needs a Silicon-specific source; anatomy reuse
   rejected.

### P1 — 04 source processing ✅

The seven source plates are processed, wired and accepted:

5. `bg.muscle_endplate.sky` — crop/resize, export, accept.
6. Four atlas swatches — bone, nerve, muscle, membrane; tile/pixel checks, then
   atlas assembly and tint removal.
7. `sprite.gate.nerve`, `sprite.exit` — magenta key, 64×64 fit, palette/alpha
   acceptance.
8. Manifest `src`/licence entries wired; `placeholder` and material tints
   removed.

### P2 — audio

8. ~~Implement `ManifestAudioProvider` and theme playback.~~ Done.
9. Generate and wire the 18 SFX cues. **3/18 installed; 15 remain.**
10. Generate and wire the four themes.

### P3 — deferred graphics

11. 03/04/Silicon far/mid/near layers.
12. UI badge, portraits, panels.
13. Hub logo fallback approved; toy astronaut cut; optional props deferred.
14. Reserve `scan.reflex` and `checkpoint`.

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
- **Tint:** the 04 atlases are final coloured art; their material tints are
  removed. A future neutral atlas must keep a tint, never both.

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

- Dedicated `sprite.scan.myelin`: **now required**. The facts model gives
  `scan-myelin` its own NERV-01#3 card, so it no longer shares
  `sprite.scan.neuron`. The shared icon is retired.
- 03 scan content: **facts model**. The Keeper dialogue reveals CON-3, CON-5,
  and NERV-01#5; the three scans reveal NERV-01#1, #3, and #6. The pads and
  terminal are interactable props, not scans.
- Reuse `sprite.exit` for Silicon: **rejected**. The organic/warm anatomy exit
  does not meet the Silicon tech style; keep the Silicon placeholder until a
  dedicated source exists.
- `ManifestAudioProvider`: **done**; three pilot SFX are installed.
- Placeholder inventory warning in `pack:validate`: still a follow-up.
- 03/04/Silicon far/mid/near layers: deferred for this milestone.
- Hub logo: **CSS Silkscreen fallback approved**. Toy astronaut: **cut**.
