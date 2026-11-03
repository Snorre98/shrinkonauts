# Remaining Work — Assets and Integration

- **Status:** Working checklist
- **Last updated:** 2026-11-03
- **Owner:** Snorre
- **Purpose:** the single “what do I do next?” view across graphics, audio, and asset integration.
- **Detailed status/evidence:** [`prompt-library-v01.md`](prompt-library-v01.md#40-completion-matrix)

> **How to use this file.** This is the consolidated checklist. The prompt
> library remains the detailed inventory and evidence matrix. When an asset
> moves, update the prompt-library matrix and this file in the same change.
> Discipline prompt documents own the prompt text and acceptance detail; this
> file does not duplicate them.

## 1. Status vocabulary

**Runtime status** describes what the game currently loads:

| Status | Meaning |
|---|---|
| `final` | Accepted runtime file; `placeholder` removed; licence and prompt log complete |
| `interim` | Runtime file exists but is procedural/interim; `placeholder: true` remains |
| `placeholder-only` | No runtime file; `PlaceholderProvider`, CSS, or synth fallback renders |
| `reserve` | Declared but not referenced by authored content |
| `deferred` | Deliberately outside the current pass |

**Pipeline stage** describes how far an asset has moved:

`prompt-ready → source-generated → source-accepted → processed → wired → accepted`

A source plate is not a runtime asset. “Generated” never means “final”.

---

## 2. Completed — 04 source batch

All seven Nano Banana source plates in
`art-source/nanobanan/new/muscle-endplate-2026-11-03/` are processed, wired and
accepted. Material tints and `placeholder` flags are removed.

| Asset | Where | Runtime | Stage | Evidence |
|---|---|---|---|---|
| `bg.muscle_endplate.sky` | 04 | `final` | `accepted` | 2720×1530 crop → 1280×720 lossless VP8L, 669,798 bytes; [process report](../../art-source/nanobanan/reports/muscle-endplate-sky.process.json) |
| `tile.muscle.atlas` | 04 | `final` | `accepted` | 512 swatch → 128×128 4×4 edge atlas; palette/2×2/edge checks |
| `tile.membrane.atlas` | 04 | `final` | `accepted` | 512 swatch → 128×128 4×4 edge atlas |
| `tile.bone.atlas` | 03/04 | `final` | `accepted` | 512 swatch → 256×192 8×6 `blob47` |
| `tile.nerve.atlas` | 03/04 | `final` | `accepted` | 512 swatch → 128×128 4×4 edge atlas |
| `sprite.gate.nerve` | 04 | `final` | `accepted` | key/trim; 60×60 in 64×64; 5,444 bytes |
| `sprite.exit` | 03/04 | `final` | `accepted` | key/trim; 59×60 in 64×64; 6,043 bytes |

Detailed evidence is in
[muscle-endplate §12](../m3/muscle-endplate-asset-requirements-v01.md#12-prompt-log-template).
The accepted command family was `art:key`, `art:normalize`, `art:tile-clean`,
`art:fit`, `art:atlas`, then the test/pack/build gates.

---

## 3. Remaining placeholder decisions outside 04

> **03 scan art is on hold (2026-11-03):** the 03 concept and asset taxonomy are
> under [M2.75](../m2.75/README.md) review. Do not generate the three scan sources
> until that milestone chooses the model.

| Asset | Where | Runtime | Stage | Decision / what remains | Prompt source |
|---|---|---|---|---|---|
| `sprite.scan.neuron` | 03 (`scan-neuron`) | `placeholder-only` | `processed (rejected)` | Keep placeholder. Old plate fits 32×17 and fails; compact-cell prompt ready, needs a new source. | [scan-prompts v02 §1](scan-prompts-v02.md) |
| `sprite.scan.myelin` | 03 (`scan-myelin`) | `placeholder-only` | `prompt-ready` | Keep placeholder. Dedicated sheath prompt ready, needs a new source; shared neuron/myelin icon retired. | [scan-prompts v02 §2](scan-prompts-v02.md) |
| `sprite.scan.pathway` | 03 (`scan-pathway`) | `placeholder-only` | `processed (rejected)` | Keep placeholder. Old plate fits 32×13 and fails; one-way chain prompt ready, needs a new source. | [scan-prompts v02 §3](scan-prompts-v02.md) |
| `sprite.scan.interrupt` | Silicon | `placeholder-only` | `processed (rejected)` | Keep placeholder. Old plate fits 32×7/220 px and fails; needs a square recomposition. | [Silicon assets §8.2](../prompts/levels/01-interrupt-loop-assets.md) |
| `sprite.exit.silicon` | Silicon | `placeholder-only` | `prompt-ready` | Keep placeholder. Reusing the anatomy exit is rejected: organic/warm art fails the Silicon tech style. Needs a Silicon-specific source. | [Silicon assets §12.2](../prompts/levels/01-interrupt-loop-assets.md) |
| `ui.logo.shrinkonauts` | Hub | `placeholder-only` | `deferred` | **CSS Silkscreen fallback approved.** Delivered plate rejected because a washer is baked behind the letters. | [Hub §8.5](../m3.5/hub-asset-prompts-v01.md) |
| `ui.icon.badge` | HUD | `placeholder-only` | `processed (rejected)` | **CSS fallback retained.** 14×14 fit loses the helmet dome; dedicated 16×16 redraw deferred. | [M3 §8.22](../m3/asset-requirements-v01.md) |

**Cut:** `sprite.prop.toy.astronaut` is removed from the hub manifest. It had no
source and was not referenced by `hub.json`.

---

## 4. Audio

Playback code is implemented: file-backed cues, music bus, theme loop,
crossfade, unlock queue, pause/resume, mute, and warn-once silence. The remaining
work is content and licensing, not engine wiring.

| Group | Runtime | Stage | What remains |
|---|---|---|---|
| 18 SFX cues — anatomy 11 + `wrong` + hub 6 | 3 final / 15 `placeholder-only` | in progress | `scan`, `jump` and `land` are installed in the Anatomy and Silicon packs with licences and prompt-log rows. The remaining 15 cues (including all six hub cues) need approved takes, manifest `src`, licence and prompt-log rows. |
| 4 music themes — menu, nerve forest, muscle effector, interrupt loop | `placeholder-only` | `prompt-ready` | Generate, loop-QA three consecutive plays, wire `room.music` / `theme.audio.music`, add licences and prompt-log rows; runtime IDs are already wired and currently resolve to silence |
| Separate ambience loop | `deferred` | — | Not in v1; the room/menu theme owns the ambient texture |

Audio prompt sources:
[`audio-requirements-and-prompts-v01.md`](../audio/audio-requirements-and-prompts-v01.md) and
[`room-and-menu-themes-v01.md`](../audio/room-and-menu-themes-v01.md).
Local SFX scratch and the prompt log are not runtime assets.

---

## 5. Deferred and future work

| Item | Runtime | Stage | What remains / decision |
|---|---|---|---|
| 03 far/mid/near backgrounds | `deferred` | `prompt-ready` | Layered plates are future work; near's play-band repeat is unresolved. The pretty sky is the only 03 background |
| 04 far/mid/near backgrounds | `deferred` | `prompt-ready` | Not in the 04 source batch; keep as declared placeholders |
| Silicon far/mid/near backgrounds | `deferred` | `prompt-ready` | Not shipped; revisit only if the Silicon layered pass is scheduled |
| UI panels, portraits, scan/map/log icons | `deferred` | `prompt-ready` | Not rendered by the current UI; no need to generate until the UI consumes them |
| `sprite.scan.reflex` | `reserve` | `prompt-ready` | Not referenced by 03/04; keep as reserve |
| `sprite.checkpoint` | `reserve` | `deferred` | Declared but not referenced; the checkpoint data point is used instead |
| Hub towel and detergent bottles | `deferred`/manifest-only | processed | Decide whether to wire or remove; the scene already has baked bottles and the towel does not read at 2× |
| Final approval of POC art | `interim` | `source-accepted` | Players, Neuron Keeper, scans, entities, and the 03 sky are POC-integrated; final approval and prompt-log completion remain |
| GDD/video captures | current | — | Refresh captures after visible art changes so the GDD does not show superseded placeholders |
| Online co-op, controller, levels 01/02/05 | `deferred` | — | Outside the asset pass; tracked in their milestone docs |

---

## 6. Cross-cutting completion gates

Every final asset must satisfy all of these before its row is `accepted`:

- [ ] Source is recorded under `art-source/` and the source path is in the prompt log.
- [ ] Processing evidence exists: key/fit/atlas report or preview.
- [ ] Runtime file is under `public/` and the manifest entry has `src`.
- [ ] Manifest no longer has `placeholder: true` for the accepted asset.
- [ ] Licence entry exists, or the asset is explicitly CC0/group work.
- [ ] Prompt-log row has tool, model/seed if available, prompt version, source, processing, and verdict.
- [ ] Palette, alpha, grid, budget, and display-size acceptance checks pass.
- [ ] The asset reads at its in-game size and does not hide UI, dialogue, or puzzle feedback.
- [ ] `npm test`, `npm run pack:validate`, `npm run pack:smoke`, and `npm run build` pass.
- [ ] The prompt-library matrix and this file are updated together.

---

## 7. Already done

- Audio provider and ADR-0077 theme playback are implemented; three pilot SFX are installed.
- The 04 Nano Banana batch is processed, wired and accepted (7 assets).
- The hub scene, machine, civilian, poster, cartridges, cycle icons, and main props are integrated.
- POC player animations, Neuron Keeper idle, readable scans, entities, and the pretty 03 sky are wired.
- The four coloured material atlases, final 04 sky, gate and exit replace the neutral/interim files; tints are removed.

---

## 8. Update protocol

1. Update the per-asset evidence and status in
   [`prompt-library-v01.md`](prompt-library-v01.md#40-completion-matrix).
2. Update the corresponding discipline prompt document’s status line.
3. Update this file’s “Immediate queue” or “Deferred” table.
4. Record the prompt/processing row in the relevant prompt log.
5. Re-run the completion gates in §6.
