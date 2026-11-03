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

## 2. Immediate queue — 04 source batch

Seven Nano Banana source plates are in
`art-source/nanobanan/new/muscle-endplate-2026-11-03/`.
The runtime still loads the interim procedural files.

| Asset | Where | Runtime | Stage | What remains | Gate |
|---|---|---|---|---|---|
| `bg.muscle_endplate.sky` | 04 | `interim` | `source-generated` | Crop/resize 2752×1536 → 1280×720; lossless WebP; replace interim `src`; licence; remove `placeholder` | 04 sky acceptance in [muscle-endplate §5](../m3/muscle-endplate-asset-requirements-v01.md) |
| `tile.muscle.atlas` | 04 | `interim` | `source-generated` | Crop 512×512 swatch; check 3×3 tiling and 2×2 clusters; assemble 128×128 4×4; report; remove tint | [muscle-endplate §6.2](../m3/muscle-endplate-asset-requirements-v01.md) |
| `tile.membrane.atlas` | 04 | `interim` | `source-generated` | Same as muscle; assemble 128×128 4×4; remove tint | [muscle-endplate §6.3](../m3/muscle-endplate-asset-requirements-v01.md) |
| `tile.bone.atlas` | 03/04 | `interim` | `source-generated` | Crop 512×512 swatch; tiling/pixel check; assemble 256×192 8×6 `blob47`; report; remove tint | [muscle-endplate §6.4](../m3/muscle-endplate-asset-requirements-v01.md) |
| `tile.nerve.atlas` | 03/04 | `interim` | `source-generated` | Crop 512×512 swatch; tiling/pixel check; assemble 128×128 4×4; remove tint | [muscle-endplate §6.5](../m3/muscle-endplate-asset-requirements-v01.md) |
| `sprite.gate.nerve` | 04 | `interim` | `source-generated` | `art:key` the flat `#FF00FF` source; fit 64×64; palette/alpha acceptance; manifest `src`/licence; remove `placeholder` | [muscle-endplate §7.1](../m3/muscle-endplate-asset-requirements-v01.md) |
| `sprite.exit` | 03/04 | `interim` | `source-generated` | `art:key` the flat `#FF00FF` source; fit 64×64; palette/alpha acceptance; manifest `src`/licence; remove `placeholder` | [muscle-endplate §7.2](../m3/muscle-endplate-asset-requirements-v01.md) |

**Next command family:** `npm run art:key`, `npm run art:fit`, `npm run art:atlas`,
then `npm test`, `npm run pack:validate`, `npm run pack:smoke`, `npm run build`.

---

## 3. Immediate queue — visible placeholders outside 04

| Asset | Where | Runtime | Stage | What remains | Prompt source |
|---|---|---|---|---|---|
| `sprite.scan.neuron` | 03 (`scan-neuron`, `scan-myelin`) | `placeholder-only` | `prompt-ready` | Assemble the revised 36×36 prompt with `STYLE_SPRITE` + `PALETTE` + `FRAME_ENTITY_CONCEPT`; generate; key/fit; wire; remove placeholder | [prompt-library §5.1](prompt-library-v01.md) |
| `sprite.scan.pathway` | 03 | `placeholder-only` | `prompt-ready` | Same as neuron; keep the one-way read without an arrow | [prompt-library §5.2](prompt-library-v01.md) |
| `sprite.scan.interrupt` | Silicon | `placeholder-only` | `prompt-ready` | Generate/process/wire the Silicon interrupt scan, or explicitly reuse another scan; no placeholder-only ID in a final pack | [Silicon assets §8.2](../prompts/levels/01-interrupt-loop-assets.md) |
| `sprite.exit.silicon` | Silicon | `placeholder-only` | `prompt-ready` | Decide reuse `sprite.exit` or generate the Silicon-specific exit; wire and licence | [Silicon assets §12.2](../prompts/levels/01-interrupt-loop-assets.md) |
| `ui.logo.shrinkonauts` | Hub | `placeholder-only` | `prompt-ready` | Generate the wordmark and accept it, or formally approve the Silkscreen CSS fallback; the delivered plate has a washer baked behind the letters | [Hub §8.5](../m3.5/hub-asset-prompts-v01.md) |
| `sprite.prop.toy.astronaut` | Hub | `placeholder-only` | `prompt-ready` | Generate and wire, or cut the prop from the hub scene | [Hub §9.6](../m3.5/hub-asset-prompts-v01.md) |
| `ui.icon.badge` | HUD | `placeholder-only` | `prompt-ready` | Dedicated 16×16 pixel pass that reads in the ~45×27 pill; the current audit loses the helmet dome | [M3 §8.22](../m3/asset-requirements-v01.md) |

---

## 4. Audio

Playback code is implemented: file-backed cues, music bus, theme loop,
crossfade, unlock queue, pause/resume, mute, and warn-once silence. The remaining
work is content and licensing, not engine wiring.

| Group | Runtime | Stage | What remains |
|---|---|---|---|
| 18 SFX cues — anatomy 11 + `wrong` + hub 6 | `placeholder-only` | in progress (local scratch) | Select approved takes from the local `var/sfx/` scratch; install into `public/packs/anatomy-reflex/shared/audio/` and `public/hub/bathroom/shared/audio/`; add manifest `src`; remove placeholders; complete the prompt log and licence entries |
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
| `sprite.scan.myelin` | not declared | `prompt-ready` | Optional dedicated myelin icon; only add if the shared neuron icon is rejected |
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

- Audio provider and ADR-0077 theme playback are implemented.
- The 04 Nano Banana source batch is generated (7 plates).
- The hub scene, machine, civilian, poster, cartridges, cycle icons, and main props are integrated.
- POC player animations, Neuron Keeper idle, readable scans, entities, and the pretty 03 sky are wired.
- Four neutral procedural atlases and interim 04 gate/exit/sky files keep the pack playable while final art is processed.

---

## 8. Update protocol

1. Update the per-asset evidence and status in
   [`prompt-library-v01.md`](prompt-library-v01.md#40-completion-matrix).
2. Update the corresponding discipline prompt document’s status line.
3. Update this file’s “Immediate queue” or “Deferred” table.
4. Record the prompt/processing row in the relevant prompt log.
5. Re-run the completion gates in §6.
