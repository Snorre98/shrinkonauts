# GDD map — what to use where

This is the bridge between the asset library and the GBL GDD. It follows the
course template: **Learning, Gameplay, UI/Controls and Monetization are
mandatory**; Story, Characters, Level/Environment, Art, Sound & Music and
Accessibility are optional.

> **Read this first:** the gameplay screenshots in this pack are
> **placeholder-era**. The hub shot and the art contact sheets are current. Do
> not caption a placeholder screenshot as final art.
>
> **Online:** use the gallery filters at
> <https://snorre98.github.io/shrinkonauts/gdd/>. Paths beginning
> `contact-sheets/` or `gdd-picks/` refer to the local pack; the web gallery
> replaces those with searchable groups.

---

## 1. Mandatory sections

### Learning

| Need | Recommended file | Notes |
|---|---|---|
| The teaching loop | No diagram in this pack | Draw the Activate → Model → Practice → Feedback → Explain → Transfer loop from `source/notes/gbl/learning-design-brief.md`; the GDD team owns this diagram. |
| The Neuron Keeper | `final/anatomy/sprites/agent-neuron.png` | Runtime character; the idle sheet is `agent-neuron-idle.png`. |
| Scan / concept discovery | `final/anatomy/sprites/scan-synapse.png`, `scan-muscle.png` | These are the two POC-integrated scan plates. |
| Dialogue | `screenshots/placeholder-era/m1-dialogue.png` | Placeholder-era; the dialogue system and Neuron Keeper are visible, but the art is not final. |
| Concept log / debrief | **Missing capture** | No screenshot of the in-game concept log or debrief. Use a diagram or capture them later. |
| Theory / lens mapping | `source/notes/m3-asset-requirements-v01.md` | Source notes; no image asset. |

### Gameplay

| Need | Recommended file | Notes |
|---|---|---|
| Core loop / level view | `screenshots/placeholder-era/m1-nerve-forest.png` | Placeholder art; useful for layout and HUD, not final style. |
| Gate interaction | `screenshots/placeholder-era/m1-gate.png` | Placeholder-era gate overlay. |
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
| Full HUD | `screenshots/placeholder-era/m1-nerve-forest.png` | HUD, objectives, controls panel and feedback surfaces. Placeholder art. |
| Dialogue surface | `screenshots/placeholder-era/m1-dialogue.png` | Dialogue card + continue affordance. |
| Hub menu | `screenshots/current/m3.5-hub-final.png` | Current final hub art + DOM menu. |
| Controls table | No image | Use the controls table from the README / project docs. |
| Map / pause / debrief | **Missing capture** | The map, concept log, pause menu, debrief and settings are DOM overlays; no current screenshot. |

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
| Style / prompt pack | `source/notes/m3-asset-requirements-v01.md`, `source/notes/m3.5-hub-asset-prompts-v01.md` |

### Sound & Music

No audio files exist — every cue is a placeholder. The cue vocabulary is in
`final/anatomy/metadata/theme.json` and
`final/hub/metadata/theme.json`. Use those lists to write the cue table, and
state clearly that the prototype has no music or ambience.

### Accessibility

No current settings screenshot. The shipped accessibility features are
keyboard-only input, text scale, reduced motion, mute, pause, and no
audio-only cues. The GDD page should describe them and label the missing
visual as a planned capture.

---

## 3. Suggested page plan

| Page | Content | Files |
|---|---|---|
| 1. Cover | Title, hub key art, player line-up | `screenshots/current/m3.5-hub-final.png`, `contact-sheets/players-lineup.png` |
| 2. What is Shrinkonauts | Premise, tiny astronaut, civilian, bathroom | hub shot, `civilian.png`, `tiny-astronaut.png` |
| 3. Learning problem | Why recognition vs navigation matters | text + `agent-neuron.png` |
| 4. Learning loop | Activate → model → practice → feedback → explain → transfer | diagram + `scan-synapse.png`, `scan-muscle.png` |
| 5. Core gameplay | Explore → talk → scan → solve → debrief | `m1-nerve-forest.png`, `m1-dialogue.png`, `gate-ferry.png` |
| 6. Node Run | Dendrite inputs → threshold → axon → exit | `pad-dendrite.png`, `pad-terminal.png`, `gate-ferry.png` |
| 7. Endplate Ferry | Motor terminal → Ca²⁺ → ACh → receptor → muscle | `pulse-terminal.png`, `prop-tracer.png`, `receptor-triangle.png`, `receptor-circle.png` |
| 8. Co-op | Two players, shared keyboard, attributed feedback | `players-lineup.png`, hub shot |
| 9. UI / Controls | HUD, dialogue, hub menu | `m1-nerve-forest.png`, `m1-dialogue.png`, hub shot |
| 10. Characters | P1/P2/Neuron Keeper/props | `players-lineup.png`, `anatomy-entities.png` |
| 11. Level / environment | Nerve Forest sky + bathroom | sky WebP, background contact sheet, bathroom wall |
| 12. Art direction | Palette, pixel rules, source-to-runtime pipeline | `palette-and-type.png`, `pipeline-comparison.jpg`, `concepts-overview.jpg` |
| 13. Silicon expansion | Same loop, different system | `silicon-entities.png`, silicon sky |
| 14. Monetization | Free prologue → base game → packs → classroom | cartridge sprites + text |
| 15. Sound & accessibility | Cue list, keyboard-only, text scale, reduced motion | text + hub screenshot |

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

## 6. Missing captures / future work

These would make the GDD materially stronger:

1. Hub: default, Silicon selected, settings open.
2. 03: final-art gameplay, dialogue, scan, concept log, map, gate, Node Run,
   debrief.
3. 04: final-art gameplay, ferry active, carrying ACh, pulse, debrief, level
   complete.
4. Silicon: gameplay and puzzle.
5. UI: pause, text scale, reduced motion.
6. A final-vs-placeholder comparison shot.

A single Playwright capture pass can produce all of these; the existing e2e
specs already drive the same states. They were deliberately **not** captured in
this pack because the current scope was “reuse existing screenshots”.
