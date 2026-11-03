# GDD map — what to use where

This is the bridge between the asset library and the GBL GDD. It follows the
course template: **Learning, Gameplay, UI/Controls and Monetization are
mandatory**; Story, Characters, Level/Environment, Art, Sound & Music and
Accessibility are optional.

> **Read this first:** the committed gameplay screenshots in this pack are
> **placeholder-era**. Use the **gameplay walkthrough** for current captures:
> [`walkthrough.html`](walkthrough.html). It covers hub, launch, 03, 04,
> Silicon, solo/co-op, text scale, reduced motion and key art, with captions
> and metadata. The old screenshots remain the development record.
>
> **Online:** the gallery is at
> <https://snorre98.github.io/shrinkonauts/gdd/>; the walkthrough is at
> `/gdd/walkthrough.html`. Paths beginning `contact-sheets/` or `gdd-picks/`
> refer to the local pack; the web gallery replaces those with searchable
> groups.

---

## 0. Action-shot index

These links resolve in the published gallery (`/gdd/walkthrough.html`); the
local Markdown copy does not contain the generated `walkthrough.html`. The full
catalogue is in [`CAPTURES.md`](CAPTURES.md).

| Need | Action shot |
|---|---|
| Hub / cover | [`hub-default`](walkthrough.html#hub-default) |
| Silicon selection | [`hub-silicon-selected`](walkthrough.html#hub-silicon-selected) |
| Settings / accessibility | [`hub-settings`](walkthrough.html#hub-settings), [`text-scale-125`](walkthrough.html#text-scale-125), [`reduced-motion`](walkthrough.html#reduced-motion) |
| Launch cinematic | [`launch-spin`](walkthrough.html#launch-spin), [`launch-shrink`](walkthrough.html#launch-shrink) |
| 03 core loop | [`03-coop-wide`](walkthrough.html#03-coop-wide) |
| Dialogue | [`03-dialogue-neuron`](walkthrough.html#03-dialogue-neuron) |
| Scan / concept log | [`03-scan-feedback`](walkthrough.html#03-scan-feedback), [`03-concept-log`](walkthrough.html#03-concept-log) |
| Map / debrief | [`03-map`](walkthrough.html#03-map), [`03-debrief-prompt`](walkthrough.html#03-debrief-prompt), [`03-debrief-filled`](walkthrough.html#03-debrief-filled) |
| Node Run | [`03-node-run-input`](walkthrough.html#03-node-run-input), [`03-node-run-threshold`](walkthrough.html#03-node-run-threshold), [`03-node-run-exit-open`](walkthrough.html#03-node-run-exit-open) |
| Gate overlay | [`silicon-concept-gate`](walkthrough.html#silicon-concept-gate) |
| 04 Endplate Ferry | [`04-wide`](walkthrough.html#04-wide), [`04-ferry-active`](walkthrough.html#04-ferry-active), [`04-ach-carry`](walkthrough.html#04-ach-carry), [`04-nicotinic-receptor`](walkthrough.html#04-nicotinic-receptor), [`04-pulse-muscle-wave`](walkthrough.html#04-pulse-muscle-wave) |
| Silicon | [`silicon-wide`](walkthrough.html#silicon-wide), [`silicon-cpu-dialogue`](walkthrough.html#silicon-cpu-dialogue), [`silicon-interrupt-puzzle`](walkthrough.html#silicon-interrupt-puzzle) |
| Solo vs co-op | [`03-solo`](walkthrough.html#03-solo), [`03-coop-wide`](walkthrough.html#03-coop-wide) |
| Final vs placeholder | [`hub-default`](walkthrough.html#hub-default), [`hub-placeholder`](walkthrough.html#hub-placeholder) |

---

## 1. Mandatory sections

### Learning

| Need | Recommended file | Notes |
|---|---|---|
| The teaching loop | No diagram in this pack | Draw the Activate → Model → Practice → Feedback → Explain → Transfer loop from `source/notes/gbl/learning-design-brief.md`; the GDD team owns this diagram. |
| The Neuron Keeper | `final/anatomy/sprites/agent-neuron.png` | Runtime character; the idle sheet is `agent-neuron-idle.png`. |
| Scan / concept discovery | `final/anatomy/sprites/scan-synapse.png`, `scan-muscle.png` | These are the two POC-integrated scan plates. |
| Dialogue | [`03-dialogue-neuron`](walkthrough.html#03-dialogue-neuron) | Current final-art dialogue with the Neuron Keeper. The old `screenshots/placeholder-era/m1-dialogue.png` is historical only. |
| Concept log / debrief | [`03-concept-log`](walkthrough.html#03-concept-log), [`03-debrief-filled`](walkthrough.html#03-debrief-filled), [`04-level-complete`](walkthrough.html#04-level-complete) | Current captures of the concept log, recorded debrief and completion overlay. |
| Theory / lens mapping | `source/notes/m3-asset-requirements-v01.md` | Source notes; no image asset. |

### Gameplay

| Need | Recommended file | Notes |
|---|---|---|
| Core loop / level view | [`03-coop-wide`](walkthrough.html#03-coop-wide) | Current final-art Nerve Forest with the full HUD and co-op feedback. |
| Gate interaction | [`silicon-concept-gate`](walkthrough.html#silicon-concept-gate), [`03-threshold-gate`](walkthrough.html#03-threshold-gate) | The wired concept-gate overlay is Silicon's transfer gate; 03's threshold gate is a world object. |
| Gate object | `final/anatomy/sprites/gate-ferry.png` | Final/POC runtime gate. |
| ACh packet | `final/anatomy/sprites/prop-tracer.png` | Final/POC runtime prop. |
| Input pads | `final/anatomy/sprites/pad-dendrite.png`, `pad-terminal.png` | Runtime pads. |
| Motor terminal | `final/anatomy/sprites/pulse-terminal.png` | Runtime terminal. |
| Receptors | `final/anatomy/sprites/receptor-triangle.png`, `receptor-circle.png` | Nicotinic / wrong receptor. |
| Co-op lineup | `contact-sheets/players-lineup.png` | P1/P2 + Neuron Keeper at review scale. |
| Animation | `contact-sheets/animation-strips.png` | First 8 frames of P1/P2 walk and Neuron Keeper idle. |

### UI / Controls

| Need | Recommended file | Notes |
|---|---|---|
| Full HUD | [`03-coop-wide`](walkthrough.html#03-coop-wide) | HUD, objectives, controls panel and feedback surfaces with final art. |
| Dialogue surface | [`03-dialogue-neuron`](walkthrough.html#03-dialogue-neuron), [`silicon-cpu-dialogue`](walkthrough.html#silicon-cpu-dialogue) | Speech bubbles with the Neuron Keeper and CPU Core. |
| Hub menu | [`hub-default`](walkthrough.html#hub-default), [`hub-silicon-selected`](walkthrough.html#hub-silicon-selected) | Current final hub art + DOM menu in both cycle states. |
| Controls table | No image | Use the controls table from the README / project docs. |
| Map / pause / debrief | [`03-map`](walkthrough.html#03-map), [`text-scale-125`](walkthrough.html#text-scale-125), [`03-debrief-prompt`](walkthrough.html#03-debrief-prompt) | Current captures of the map, pause settings and debrief. |

### Monetization

No art asset is needed. The GDD-ready text is in
`source/notes/monetization.md`. The cartridge sprites
(`final/hub/sprites/cartridge-anatomy.png`, `cartridge-silicon.png`) can
illustrate “new pack = new cartridge”.

---

## 2. Optional sections

### Story

| Need | Recommended file |
|---|---|
| The bathroom / real-world frame | `screenshots/current/m3.5-hub-final.png` |
| The civilian | `final/hub/sprites/civilian.png` |
| The poster / fiction | `final/hub/sprites/poster.png` |
| The tiny astronaut | `final/hub/sprites/tiny-astronaut.png` |
| Cartridges | `final/hub/sprites/cartridge-anatomy.png`, `cartridge-silicon.png` |

### Characters

| Need | Recommended file |
|---|---|
| P1/P2 line-up | `contact-sheets/players-lineup.png` |
| P1 runtime | `final/anatomy/sprites/player-p1.png` (idle) + `player-p1-walk.png` |
| P2 runtime | `final/anatomy/sprites/player-p2.png` (idle) + `player-p2-walk.png` |
| Neuron Keeper runtime | `final/anatomy/sprites/agent-neuron.png` |
| Neuron Keeper idle sheet | `final/anatomy/sprites/agent-neuron-idle.png` |
| All anatomy entities | `contact-sheets/anatomy-entities.png` |
| All Silicon entities | `contact-sheets/silicon-entities.png` |
| Hub props | `contact-sheets/hub-props.png` |

Do **not** use `concepts/anatomy/sprite-agent-neuron.jpg` as the runtime
Neuron Keeper; it is an alternate review plate.

### Level / Environment

| Need | Recommended file |
|---|---|
| Nerve Forest sky | `final/anatomy/backgrounds/nerve-forest-sky.webp` |
| Sky preview | `previews/backgrounds/nerve-forest-sky-pretty-1280x720.png` |
| Layered background review | `previews/backgrounds/background-stack-1280x720.png`, `background-near-over-sky-1280x736.png` |
| Bathroom wall | `final/hub/backgrounds/bathroom-wall.webp` |
| Background contact sheet | `screenshots/current/m3-nerve-forest-backgrounds.png` |
| Silicon board sky | `final/silicon/backgrounds/silicon-board-sky.webp` |

The far/mid/near layers are **not wired**; their processed previews are in
`previews/backgrounds/` and are labelled as future work. The old non-updated
JPEGs are failed references — do not use them.

### Art

| Need | Recommended file |
|---|---|
| Palette, fonts, anchors | `contact-sheets/palette-and-type.png` |
| Source concepts | `contact-sheets/concepts-overview.jpg` |
| Source → keyed → runtime | `contact-sheets/pipeline-comparison.jpg` |
| All concept plates | `concepts/anatomy/`, `concepts/silicon/` |
| Character source sheets | `characters/player-p1/source/`, `player-p2/source/`, `neuron-agent/source/` |
| Style / prompt pack | `source/notes/m3-asset-requirements-v01.md`, `source/notes/m3-muscle-endplate-asset-requirements-v01.md`, `source/notes/m3.5-hub-asset-prompts-v01.md` |

### Sound & Music

No audio files exist — every cue is a placeholder. Cue playback and the
ADR-0077 music bus/theme player are implemented, but the four charted themes are
proposed and no theme files exist, so music is silent. The cue vocabulary is in
`final/anatomy/metadata/theme.json` and
`final/hub/metadata/theme.json`. Use those lists to write the cue table, and
state clearly that the prototype has no shipped music or ambience; the theme
player exists but resolves to silence until files land.

### Accessibility

The shipped accessibility features are keyboard-only input, text scale,
reduced motion, mute, pause, and no audio-only cues. Current captures:
[`hub-settings`](walkthrough.html#hub-settings),
[`text-scale-125`](walkthrough.html#text-scale-125) and
[`reduced-motion`](walkthrough.html#reduced-motion). The latter two show the
settings in context; use them with the written feature list.

---

## 3. Suggested page plan

| Page | Content | Files |
|---|---|---|
| 1. Cover | Title, hub key art, player line-up | `screenshots/current/m3.5-hub-final.png`, `contact-sheets/players-lineup.png` |
| 2. What is Shrinkonauts | Premise, tiny astronaut, civilian, bathroom | hub shot, `civilian.png`, `tiny-astronaut.png` |
| 3. Learning problem | Why recognition vs navigation matters | text + `agent-neuron.png` |
| 4. Learning loop | Activate → model → practice → feedback → explain → transfer | diagram + `scan-synapse.png`, `scan-muscle.png` |
| 5. Core gameplay | Explore → talk → scan → solve → debrief | `03-coop-wide`, `03-dialogue-neuron`, `03-scan-feedback`, `03-debrief-filled` |
| 6. Node Run | Dendrite inputs → threshold → axon → exit | `03-node-run-input`, `03-node-run-threshold`, `03-node-run-exit-open` |
| 7. Endplate Ferry | Motor terminal → Ca²⁺ → ACh → receptor → muscle | `04-ferry-active`, `04-ach-carry`, `04-nicotinic-receptor`, `04-pulse-muscle-wave` |
| 8. Co-op | Two players, shared keyboard, attributed feedback | `03-coop-wide`, `03-solo`, `players-lineup.png` |
| 9. UI / Controls | HUD, dialogue, hub menu | `03-coop-wide`, `03-dialogue-neuron`, `hub-default` |
| 10. Characters | P1/P2/Neuron Keeper/props | `players-lineup.png`, `anatomy-entities.png` |
| 11. Level / environment | Nerve Forest sky + bathroom | `key-art-03`, `key-art-04`, `key-art-silicon`, sky WebP, bathroom wall |
| 12. Art direction | Palette, pixel rules, source-to-runtime pipeline | `palette-and-type.png`, `pipeline-comparison.jpg`, `concepts-overview.jpg` |
| 13. Silicon expansion | Same loop, different system | `silicon-wide`, `silicon-cpu-dialogue`, `silicon-interrupt-puzzle`, `silicon-concept-gate` |
| 14. Monetization | Free prologue → base game → packs → classroom | cartridge sprites + text |
| 15. Sound & accessibility | Cue list, keyboard-only, text scale, reduced motion | `hub-settings`, `text-scale-125`, `reduced-motion` |

---

## 4. What not to use

| Do not use | Why |
|---|---|
| `concepts/anatomy/sprite-agent-neuron.jpg` as the Neuron Keeper | Alternate review plate; runtime uses `agent-neuron.png`. |
| `concepts/anatomy/bg-nerve_forest-far.jpg`, `-mid.jpg`, `-near.jpg` | Failed references; use the `-updated` plates or previews. |
| `concepts/anatomy/scan-neuron.jpg`, `scan-pathway.jpg`, `scan-reflex.jpg` as final | They are placeholders after the 36×36 readability check. |
| `concepts/anatomy/ui-icon-badge.jpg` as final | The badge is a CSS placeholder. |
| `final/hub/sprites/towel.png`, `detergent-bottles.png` as wired scene art | Manifest-only; the scene bakes the detergent bottles and the towel does not read at 2×. |
| Historical screenshots as current art | `screenshots/historical/` and `placeholder-era/` are for the development story only. |

---

## 5. Asset-list requirement

For `C5` / `T-ASSETS`, copy the tables from
[`ASSET-LIST-GBL.md`](ASSET-LIST-GBL.md). It separates:

- **Own** — group-created placeholders, screenshots, contact sheets, docs.
- **AI-generated** — Ludo/Nanobanan art, with the current tool and licence
  labels; prompts/models/seeds are still TBD.
- **Sourced** — the two OFL fonts.

No third-party images or audio are included.

---

## 6. Remaining capture gaps

The Playwright capture pass now produces the hub, 03, 04, Silicon, UI and
accessibility set. These content gaps remain visible in the captures:

1. **03 concept gate** — `gate-nerve-01` is authored but `level.json` has
   `"gateIds": []`; no 03 room entity opens it. The walkthrough uses the 03
   threshold gate as the physical gate and Silicon's `gate-transfer` as the
   concept-gate overlay.
2. **04 muscle background** — the 2026-11-03 additive pass wires an interim
   1280×720 `bg.muscle_endplate.sky` placeholder. A 2752×1536 Nano Banana source
   plate is generated, but it is `source-generated` only; crop/export/acceptance
   is pending. The 04 captions say this. See
   [`../m3/muscle-endplate-asset-requirements-v01.md`](../m3/muscle-endplate-asset-requirements-v01.md)
   and the [completion matrix](../assets/prompt-library-v01.md#40-completion-matrix).

Also still missing: online co-op (M4 placeholder), audio files, and final
concept-gate art for 03 if the gate is wired later. The capture commands are in
[`CAPTURES.md`](CAPTURES.md).
