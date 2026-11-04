# Asset list — GBL submission (own vs sourced)

Companion to `C5` / `T-ASSETS`: “List all assets; separate own vs. sourced.”
This list covers the visual/audio assets used by the GDD, report, video and
playtest build. It follows the project convention that **AI-generated work is
logged as own work**, with the tool, prompt/reference, date and terms URL named
where known; third-party work is **sourced** with its licence.

> **Status:** working draft for the GBL submission. Several AI provenance
> fields are still TBD. Do not invent a licence or a prompt that is not
> recorded in the repository.

---

## 1. Summary

| Category | Count | Status |
|---|---:|---|
| Runtime sprite/background/UI images | 62 manifest entries (some shared P1/P2 files repeated) | POC integrated / final approval pending |
| Concept plates | 38 | Source/review only |
| 04 Nano Banana source batch | 7 JPEGs | Source-generated only; not processed/wired |
| Character source sheets | 3 characters, 5 sheets | Immutable source |
| Screenshots | 17 | Mixed: current hub, placeholder-era gameplay, historical |
| Contact sheets | 10 | Generated for this pack |
| Fonts | 2 families | Sourced, SIL OFL 1.1 |
| Audio | 0 files; 12 anatomy + 6 hub cues declared | All placeholders |
| Third-party images | 0 | — |
| Third-party audio | 0 | — |

The authoritative runtime licences are in:

- `final/anatomy/metadata/licenses.json`
- `final/silicon/metadata/licenses.json`
- `final/hub/metadata/assets.final.json` (hub has no separate licences file)

---

## 2. Own work

“Own” here means created by the group for this project, including code-authored
placeholders and derived review material.

| Asset | What it is | Licence / note |
|---|---|---|
| `final/anatomy/tiles/bone-atlas.png`, `nerve-atlas.png`, `muscle-atlas.png`, `membrane-atlas.png` | Final coloured material atlases | Nano Banana / Google Gemini (plan TBD); processed 2×2-welded atlases |
| `art-source/nanobanan/new/muscle-endplate-2026-11-03/*.jpeg` (repo, not the GDD pack) | 04 raw source batch: sky, four swatches, gate, exit | Nano Banana; prompt pack `muscle-endplate-2026-11-03.1`; accepted source, not runtime |
| `final/anatomy/tiles/anatomy-atlas.svg` | In-repo placeholder atlas retained as a test fixture | CC0-1.0; no longer wired |
| `final/silicon/tiles/circuit-atlas.svg` | In-repo placeholder circuit atlas | CC0-1.0; replace with final atlas |
| `screenshots/current/*` | Project screenshots / contact sheets | Group work; contains AI-generated art |
| `screenshots/placeholder-era/*` | Project screenshots of the placeholder build | Group work |
| `screenshots/historical/*` | Milestone screenshots | Group work |
| `contact-sheets/*` | Generated overview boards | Group work; derived from the assets above |
| `gdd-assets/README.md`, `ASSET-INDEX.md`, `GDD-MAP.md`, `PIPELINE.md`, `ASSET-LIST-GBL.md`, `LICENCE-NOTES.md`, `manifest.json`, `gallery.html` | Documentation and index | Group work |
| `tools/build.mjs` | Local pack-generation script | Group work |
| Game code and UI (not shipped as art) | HUD, dialogue, map, concept log, debrief, menu | Group work; CSS/DOM, not raster assets |

The screenshots and contact sheets contain AI-generated art; the underlying art
is logged in §3, not re-licensed by the screenshot.

---

## 3. AI-generated art (logged as own, with tool provenance)

All runtime art in this pack is AI-generated from Ludo.ai / Nanobanan
(Google Gemini) sources, with art direction and local processing by Snorre.
The current licence labels are:

- `Ludo.ai source (POC; plan TBD)` — player, Neuron Keeper, scans, entities, sky, Silicon.
- `Nano Banana / Google Gemini (plan TBD)` — bathroom hub art.

| Asset family | Files / IDs | Tool | Current licence | Provenance |
|---|---|---|---|---|
| P1 player | `player-p1.png`, `player-p1-walk.png`, `.jump`, `.fall`, `.land` | Ludo.ai sprite sheet | Ludo.ai POC; plan TBD | Prompt/model/seed TBD; source sheet + JSON in `characters/player-p1/` |
| P2 player | `player-p2.png`, `player-p2-walk.png`, `.jump`, `.fall`, `.land` | Ludo.ai sprite sheet | Ludo.ai POC; plan TBD | Approved ADR-0065 sheets; prompt/model/seed TBD |
| Neuron Keeper | `agent-neuron.png`, `agent-neuron-idle.png` | Ludo.ai sprite sheet | Ludo.ai POC; plan TBD | 36-frame source in `characters/neuron-agent/`; prompt/model/seed TBD |
| Anatomy scans | `scan-synapse.png`, `scan-muscle.png` | Ludo/Nanobanan concept + local key/fit | Ludo.ai POC; plan TBD | `scan-neuron` and `scan-pathway` are placeholders |
| Anatomy interactables | `gate-ferry.png`, `prop-tracer.png`, `pulse-terminal.png`, `receptor-triangle.png`, `receptor-circle.png`, `pad-dendrite.png`, `pad-terminal.png`, `gate-nerve.png`, `exit.png` | Ludo/Nanobanan concept + local key/fit | Ludo.ai POC / Nano Banana; plan TBD | Fit reports in `source/reports/`; `gate-nerve` and `exit` are the final 04 batch |
| Anatomy material atlases | `bone-atlas.png`, `nerve-atlas.png`, `muscle-atlas.png`, `membrane-atlas.png` | Nano Banana / Google Gemini + local swatch/atlas pipeline | Nano Banana; plan TBD | Final coloured atlases; 32×32 frames; tints removed |
| Muscle Endplate sky | `muscle-endplate-sky.webp` | Nano Banana / Google Gemini + local crop/Lanczos | Nano Banana; plan TBD | 2752×1536 source → 1280×720 lossless VP8L; recorded no-quantise exception |
| Nerve Forest sky | `nerve-forest-sky.webp` | Ludo/Nanobanan concept | Ludo.ai POC; plan TBD | 2752×1536 source; crop/Lanczos/WebP; recorded no-quantise exception |
| Bathroom scene | `bathroom-wall.webp` | Nano Banana / Google Gemini | Nano Banana; plan TBD | 640×360 scene plate; crop/pad/downscale; no palette quantisation |
| Hub props | washer, door, drum, civilian, poster, cartridges, plush, basket, towel, detergent, cycle icons | Nano Banana / Google Gemini | Nano Banana; plan TBD | Source batch absent; reports in `source/reports/hub/` |
| Silicon sprites | CPU, consoles, sockets, gate, pad, plug, scans | Ludo/Nanobanan concept + local key/fit | Ludo.ai POC; plan TBD | `fit.silicon.config.json`; reports in `source/reports/silicon/` |
| Silicon sky | `silicon-board-sky.webp` | Ludo/Nanobanan concept | Ludo.ai POC; plan TBD | Crop/dither/WebP; report in `source/reports/silicon/` |
| 04 source batch | `bg.muscle_endplate.sky`, four `tile.*.atlas`, `sprite.gate.nerve`, `sprite.exit` | Nano Banana / Google Gemini | Nano Banana; plan TBD | 7 raw JPEGs in repo `art-source/nanobanan/new/muscle-endplate-2026-11-03/`; processed and wired runtime files |
| Concept plates | 38 JPEGs in `concepts/` | Nanobanan / Ludo.ai | Same as the intended runtime asset | Review/source only; not runtime |

**Log line template for the report:**

```text
AI-gen — Ludo.ai / Nanobanan (Google Gemini), <prompt version / asset card>,
<date>, <plan/terms URL>; art direction: Snorre; processed locally with
art-key/art-fit/art-build-player.
```

The exact prompt, model and seed are **not** recorded for most assets. The
prompt packs in `source/notes/m3-asset-requirements-v01.md` and
`source/notes/m3.5-hub-asset-prompts-v01.md` are the closest available record.

---

## 4. Sourced material

| Asset | Source | Licence | Files |
|---|---|---|---|
| Silkscreen | Google Fonts / SIL Open Font License | SIL OFL 1.1 | `final/shared/fonts/silkscreen-400.woff2`, `silkscreen-700.woff2`, `OFL-Silkscreen.txt` |
| Pixelify Sans | Google Fonts / SIL Open Font License | SIL OFL 1.1 | `final/shared/fonts/pixelify-sans-400-700.woff2`, `OFL-PixelifySans.txt` |

No third-party images, sprites, music or sound effects are included. The game
audio cues are placeholders with no files.

---

## 5. Audio cue list (all placeholder)

Anatomy declares 12 cues; the M3 scope covers 11 (`audio.cue.wrong` stays
placeholder). The hub adds 6 cues. None have files.

| Pack | Cue IDs |
|---|---|
| Anatomy | `boot`, `dialogue`, `scan`, `dash`, `gate`, `map`, `debrief`, `checkpoint`, `unlock`, `wrong`, `jump`, `land` |
| Hub | `click`, `door`, `spin`, `shrink`, `arrive`, `hum` |

In the GDD Sound & Music page, state: **“The cue vocabulary is implemented
with shipped audio. Cue/theme playback is implemented, the menu and three room
themes are installed, and there is no separate ambience loop.”**

---

## 6. Known licence/provenance gaps

1. **Ludo/Nano Banana plan and terms** are TBD. The current labels say “POC;
   plan TBD”.
2. **Prompt, model and seed** are TBD for most assets. The prompt packs exist,
   but the per-asset log is a template.
3. **Anatomy `licenses.json`** does not list every new entity (pads, gate,
   tracer, pulse, receptors); it does list the scans and sky.
4. **Hub** has no separate `licenses.json`; licence strings live in
   `assets.final.json`.
5. **Raw hub source batch** is absent, so the hub’s source-to-runtime chain is
   documented but not fully reproducible.
6. **Final art approval** is pending for POC-integrated sprites and the sky.
7. **Placeholders** must not be described as final: badge, `scan.neuron`,
   `scan.pathway`, `scan.reflex`, the Silicon interrupt/exit, the 03/04
   far/mid/near layers, the Silicon circuit atlas, and the hub logo CSS
   fallback. The toy astronaut is cut.
8. **04 source batch** is processed and wired; the final files and licences are
   in the runtime manifest. Do not list the raw JPEGs as runtime assets.

See `LICENCE-NOTES.md` for the exact labels and the files they apply to.
