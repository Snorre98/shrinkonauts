# Silicon theme bible — Graphite/Cyan Clean-Room

**Status:** Draft v0.1 · 1 November 2026  
**Pack:** `silicon-reflex`  
**Level:** `01-interrupt-loop`  
**Purpose:** the visual contract for the Silicon asset pack and the level prompt.

> **The one requirement:** Silicon must not read as the nerve theme. It is a
> different world with a different palette dominance, architecture, lighting,
> texture, cast, and parallax language. It is not a teal recolour of
> `03-nerve-forest`.

---

## 1. One-line direction

**A cold, grimy pixel-art circuit board as a workplace: graphite solder mask,
cyan traces, ceramic chip packages, tired hardware workers, and a tiny scuffed
astronaut who has been shrunk into the machine.**

The body was damp, organic, and warm-dark. Silicon is dry, geometric, cold, and
high-contrast. The humour still comes from fussy workers and a tired astronaut,
not from gore or shock.

---

## 2. Why this is not Nerve Forest

| Dimension | Silicon | Nerve Forest |
|---|---|---|
| Dominant colour | Graphite/ink, cyan traces, bone-white ceramic | Deep teal, nerve amber, electric cyan |
| Secondary colour | Muted sage, cold cyan highlights | Amber signal glow, damp teal haze |
| Architecture | Orthogonal PCB traces, chip sockets, vias, chip legs, actuator arm | Organic cable trees, branching trunks, membrane folds |
| Lighting | Cold cyan edge light, hard clean-room contrast | Damp dither haze, distributed amber glow |
| Texture | Solder mask grain, copper wear, ceramic, brushed metal | Wet membrane, condensation, myelin beads |
| Cast | CPU Core: boxy chip with pins and a cyan status visor | Neuron Keeper: jelly-bean cell with dendrites and axon |
| Parallax | Chip arrays, ribbon cables, via holes, trace grids | Nerve twigs, synaptic lanterns, root-like cables |
| Motion language | Servo, piston, signal pulse, relay click | Breathing membrane, drifting spores, electrical flicker |
| Forbidden | Any nerve/neuron/biology motif, amber ambient glow, organic curves | — |

The shared elements are the pixel grid, the nine ramps, the 1px outline weight,
the astronaut players, the HUD, and the shared audio cue vocabulary. That is what keeps it
the same game.

---

## 3. Visual pillars

1. **Pixel-first 2D.** Native pixel grid, hard square pixels, 1px source
   outlines, no anti-aliasing, no mixed pixel sizes.
2. **Chunky hardware.** Three-step ramps, 50% dither for solder mask and copper
   wear, minimum 2×2 colour blocks at display size.
3. **Cold and clean, but grimy.** Solder flux, dust, scuffed ceramic, worn
   copper, fingerprint smudges; built from dither and palette, never gradients.
4. **Gross-cute hardware, not edgy.** Tired chips, fussy sockets, deadpan
   consoles; never gory, never shock humour.
5. **Readable at actual size.** 28×44 player, 36×36 entities, 32×32 atlas
   frames; silhouette first, no fine detail.
6. **The board is a workplace.** The controller, CPU, sockets, and actuator are
   workers with jobs, not monsters.
7. **Side-view platformer.** Characters in side or slight 3/4 view; backgrounds
   orthographic side view.
8. **Orthogonal, not organic.** Use straight traces, chamfered chip corners,
   pin rows, via rings, and socket slots. Avoid vines, roots, tentacles, and
   membrane curves.
9. **One material language.** Tiles, props, backgrounds, and UI use the same
   graphite/cyan/ceramic vocabulary.

---

## 4. Palette

The nine ramp families from `docs/m3/asset-requirements-v01.md` remain the only
source colours. Silicon changes the **role mapping** and the **dominance**, not
the palette table.

### 4.1 Role mapping

| Role | Ramp | Hex steps | Silicon use |
|---|---|---|---|
| Outline / deepest shadow | Ink | `#000000` `#05090b` `#2a3f47` | 1px outlines, chip gaps, deep board shadow |
| Graphite shadow | Teal | `#05090b` `#101a20` `#1d2f38` | Solder-mask field, background depth, chip bodies |
| Ceramic | Bone | `#c9b79a` `#f2e8d5` `#fff8e8` | Chip packages, ceramic capacitors, pads |
| Ceramic shadow / dust | Bone shadow | `#5f736e` `#7a8f8a` `#9db4ad` | Solder joints, grime, worn edges |
| Signal cyan | Joint | `#3f9fb5` `#7bdff2` `#c9f7ff` | Copper traces, status lights, scan rim, active signal |
| Muted label / secondary | Sage | `#6f847d` `#9db4ad` `#c4d4ce` | Secondary UI, silkscreen dashes, dust |
| Error / danger | Muscle | `#a82a4a` `#ef476f` `#ff9fb2` | UI error only; not used as a world material |
| Reserved | Nerve | `#b8862b` `#ffd166` `#fff3b0` | **Not used in the Silicon world.** Reserved for the anatomy pack |
| Reserved | Orange | `#813115` `#e59b34` `#ffd28a` | **Not used anywhere.** Reserved |

### 4.2 Dominance

Target at 100% of a frame or room:

- **Graphite/ink: 50–60%** — the board field, shadows, chip bodies.
- **Ceramic/bone: 15–20%** — chip packages, pads, ceramic parts.
- **Signal cyan: 20–25%** — traces, status lights, the active signal path.
- **Sage/muted: 5%** — labels, dust, secondary structure.
- **Muscle/danger: 0% in world art; UI error only.**
- **Nerve amber: 0%.** Do not use it for signal, light, warning, or pickups.
- **Orange: 0%.**

If a frame reads as “teal with amber dots,” it has failed.

### 4.3 Rules

- Use the ramp steps only. No intermediate blends.
- Dither with adjacent ramp steps, never with a new colour.
- Black/white only for tiny alpha edges.
- No smooth gradients, no 3D shading, no glossy plastic.
- No purple, neon green, unapproved orange, or pure red.
- No warm key light. The only warm colour is the player's suit accent; the
  world stays cold.

---

## 5. Architecture and composition

### 5.1 The board is a landscape

- **Far:** chip arrays and trace grids, large slow shapes, low contrast.
- **Mid:** socketed controller and CPU chips, ribbon cables, ceramic capacitors,
  via holes, cyan traces; medium contrast.
- **Near:** dark graphite chip legs, connector pins, and cable ribbons framing
  the left/right edges and top; large transparent gaps across the centre and
  lower third.
- **Sky:** a wide macro board plate; dark upper corners and lower third; the
  focal cyan trace inside the central 70%.

### 5.2 Landmarks

- **The interrupt line:** a bright cyan trace that runs from the sensor region
  to the controller socket. It is the readable path, not a label.
- **The controller socket:** a socketed chip with a cyan-lit slot, visually
  different from the CPU socket.
- **The CPU:** a larger ceramic package with a cyan die window; the CPU Core
  agent is its personification, not a brain.
- **The actuator:** a mechanical arm/piston at the far end; the response.
- **The transfer console:** a small terminal with a cyan screen; the optional
  transfer prompt.

### 5.3 Do not draw

- Nerve trunks, branching cables that look like roots, myelin beads, synaptic
  bulbs, membrane folds, villi, alveoli, or any organic tissue.
- A brain, a spinal cord, a literal nervous system, or a human body.
- A CPU with a face that reads as a brain; a CPU on a throne; a “boss” pose.
- Text, labels, arrows, diagram lines, or readable silkscreen words.
- Gore, blood, exposed organs, or shock imagery.

---

## 6. Lighting and texture

### 6.1 Lighting

- **Key:** cold cyan edge light from the active trace or a overhead clean-room
  strip.
- **Fill:** graphite bounce; no warm fill.
- **Shadow:** hard, dark, high-contrast; use ink/teal ramp.
- **Focal:** the controller socket and the active trace are the brightest
  elements. The CPU die is second.
- **Background:** keep the centre and lower third low-contrast enough for the
  HUD and player silhouettes.

### 6.2 Texture

- Solder mask: fine grain, tiny pits, flux residue, 50% dither.
- Copper: worn edges, slight tarnish, cyan highlight.
- Ceramic: chalky matte, chipped corners, dust in the seams.
- Metal pins: cold highlight, dark socket shadow.
- Silkscreen: abstract dashes and blocks only; no readable text.

No wet membrane, no condensation, no damp fog, no organic sheen.

---

## 7. Cast and prop language

### 7.1 CPU Core agent

- A small, boxy ceramic chip package.
- Two rows of metal pins for legs; two tiny arms.
- A cyan status visor or single cyan eye bar; no human face.
- A hard hat, headset, or repair tool as a character prop.
- Tired, fussy, deadpan; the output side of the loop, not the brain.
- Strong silhouette at 36×36; no fine text or tiny pins that vanish.

### 7.2 Controller

- A socketed chip, not a character.
- A cyan-lit slot and a simple logic-gate mark.
- Visually heavier and more central than the CPU socket.
- The integration point; the “spinal cord” analogue.

### 7.3 Sockets and pads

- Controller socket: open, cyan-lit, inviting.
- CPU socket: closed, blank, slightly wrong; a visible decoy.
- Sensor pad: a floor pad with a cyan sensor eye and dashes.
- Route plug: a small cyan jumper/connector with two pins and a handle.
- Work token: a small gear/screw with a cyan core; optional visual beat.

### 7.4 Scans

- Flat diagrammatic icons, no faces, no character pose.
- Thin cyan scan rim.
- Strong single silhouette: sensor, trace, controller, CPU, actuator.
- No text, arrows, or labels.

### 7.5 Gates and exit

- Actuator gate: a mechanical barrier with a cyan piston/arm; closed state.
- Exit: a graphite ring/port with cold cyan light; a destination, not a door.
- No organic valves, no membrane airlocks.

---

## 8. UI and audio

### 8.1 UI

- Same Silkscreen + Pixelify Sans fonts; same 8-bit pixel chrome.
- Palette tokens: graphite panels, cyan accents, bone text, sage muted.
- `ui.materials`: panel `substrate`, dialogue `circuit`, debrief `substrate`.
- `ui.patterns`: `solder-mask` on panels, `circuit-traces` on dialogue,
  `solder-mask` on debrief.
- No new fonts, no pack-specific CSS, no new UI layout.
- Badge: reuse the shared astronaut badge; it is the game's badge, not a level
  theme asset.

### 8.2 Audio

- Reuse the shared cue IDs (the 11 M3 cues plus the wrong placeholder): boot,
  dialogue, scan, dash, gate, map, debrief, checkpoint, unlock, wrong, jump,
  land.
- No new music, no ambience loop, no new cue IDs.
- The Silicon mix should feel cold and clicky; that is an audio-pass decision,
  not a new cue.
- `audio.cue.wrong` remains outside the 11-cue scope unless a later pass adds
  it.

---

## 9. Asset register

### 9.1 New Silicon assets

| ID | Type | Source / display | File | Priority | Used by |
|---|---|---|---:|---|---|
| `bg.silicon_board.sky` | background | 640×368 / 1280×736 cover | `shared/backgrounds/silicon-board-sky.webp` | P0 | room background |
| `bg.silicon_board.far` | background | 1024×512 / tile | `shared/backgrounds/silicon-board-far.webp` | P0 | room background |
| `bg.silicon_board.mid` | background | 1024×512 / tile | `shared/backgrounds/silicon-board-mid.webp` | P0 | room background |
| `bg.silicon_board.near` | background | 1024×512 / tile | `shared/backgrounds/silicon-board-near.webp` | P0 | room background |
| `tile.circuit.atlas` | atlas | 128×128, 4×4, 16 edge frames | `shared/tiles/circuit-atlas.png` | P0 | `circuit-edge`, `substrate-edge` |
| `sprite.agent.cpu` | sprite | 18×18 / 36×36 | `shared/sprites/agent-cpu.png` | P0 | agent |
| `sprite.prop.route_plug` | sprite | 18×18 / 36×36 | `shared/sprites/prop-route-plug.png` | P0 | route plug |
| `sprite.socket.controller` | sprite | 18×18 / 36×36 | `shared/sprites/socket-controller.png` | P0 | controller socket |
| `sprite.socket.cpu` | sprite | 18×18 / 36×36 | `shared/sprites/socket-cpu.png` | P0 | CPU socket decoy |
| `sprite.gate.actuator` | sprite | 18×18 / 36×36 | `shared/sprites/gate-actuator.png` | P0 | actuator gate |
| `sprite.exit.silicon` | sprite | 18×18 / 36×36 | `shared/sprites/exit-silicon.png` | P0 | exit |
| `sprite.scan.sensor` | sprite | 18×18 / 36×36 | `shared/sprites/scan-sensor.png` | P1 | scan target |
| `sprite.scan.interrupt` | sprite | 18×18 / 36×36 | `shared/sprites/scan-interrupt.png` | P1 | scan target |
| `sprite.scan.controller` | sprite | 18×18 / 36×36 | `shared/sprites/scan-controller.png` | P1 | scan target |
| `sprite.scan.cpu` | sprite | 18×18 / 36×36 | `shared/sprites/scan-cpu.png` | P1 | scan target |
| `sprite.scan.actuator` | sprite | 18×18 / 36×36 | `shared/sprites/scan-actuator.png` | P1 | scan target |
| `sprite.pad.sensor` | sprite | 18×18 / 36×36 | `shared/sprites/pad-sensor.png` | P1 | sensor pad |
| `sprite.console.sensor` | sprite | 18×18 / 36×36 | `shared/sprites/console-sensor.png` | P1 | puzzle activation |
| `sprite.console.transfer` | sprite | 18×18 / 36×36 | `shared/sprites/console-transfer.png` | P1 | transfer gate |
| `sprite.prop.work_token` | sprite | 18×18 / 36×36 | `shared/sprites/prop-work-token.png` | P2 | optional beat |
| `ui.portrait.cpu` | image | 32×32 target | `shared/ui/portrait-cpu.png` | P2 | deferred portrait |

### 9.2 Reused shared assets

| ID | Type | Notes |
|---|---|---|
| `sprite.player.p1` | sprite | Copy the POC file into the Silicon pack |
| `sprite.player.p1.walk/jump/fall/land` | sheet | Copy the POC sheets |
| `sprite.player.p2` | sprite | Copy the POC file |
| `sprite.player.p2.walk/jump/fall/land` | sheet | Copy the POC sheets |
| `ui.icon.badge` | image | Shared badge; placeholder until the UI pass |
| `audio.cue.*` | audio | Reuse the 11 cue IDs as placeholders |
| `ui.icon.scan/map/log` | image | Deferred placeholders |
| `ui.panel.dialogue/gate/debrief/map` | image | Deferred placeholders |

### 9.3 Not generated

| ID | Why |
|---|---|
| `sprite.checkpoint` / `sprite.checkpoint.silicon` | The room uses the checkpoint data point; no authored room renders a checkpoint sprite. Do not add an unused asset. |
| `sprite.scan.reflex` | Anatomy-pack reserve; not used in Silicon. |
| `tile.nerve.atlas`, `tile.bone.atlas` | Nerve/bone material atlases belong to the anatomy pack. |
| `sprite.agent.neuron`, `sprite.scan.neuron`, `sprite.scan.pathway`, `sprite.gate.ferry` | Nerve-pack casts; forbidden in Silicon. |
| Music / ambience | The runtime does not play music yet. |

---

## 10. Material and pattern plan

### 10.1 Materials

| Material ID | Family | Palette | Edge | Autotile | Pattern | Tint |
|---|---|---|---|---|---|---|
| `circuit` | synthetic | `joint`, `teal` | hard | `edge` | `circuit-traces` | `joint` |
| `substrate` | synthetic | `boneShadow`, `teal` | hard | `edge` | `solder-mask` | `boneShadow` |

### 10.2 Pattern definitions

| Pattern ID | Generator | Space | Scale | Direction | Contrast |
|---|---|---|---:|---:|---:|
| `circuit-traces` | `fibers` | `world` | 0.5 | 0 | 0.35 |
| `solder-mask` | `cellular` | `world` | 0.6 | — | 0.25 |

### 10.3 Variant sets

- `circuit-edge`: 16 frames, keys `"0"`–`"15"`, atlas `tile.circuit.atlas`,
  frames `mask-0`–`mask-15`, fallback `mask-0`.
- `substrate-edge`: 16 frames, same atlas and frame keys, materialId
  `substrate`, fallback `mask-0`.

The atlas frames are authored neutral and tinted by the material. Do not bake a
directional edge. Do not double-tint.

### 10.4 Room tile grid

- 40×23 tiles at 32 px.
- `c` = circuit, `s` = substrate.
- Floor rows 20–22 are `c`; walls and upper structure are `s`.
- The interrupt trace is a visual path in the art/pattern, not a separate
  collision tile.

---

## 11. Fidelity guard

### 11.1 Anatomy and hardware

- The Silicon room is a **transfer fixture**, not new anatomy.
- The biological source is CON-8 and NERV-03#5 as an analogy.
- The hardware side is the syllabus mapping:
  `sensor → interrupt line → interrupt controller → CPU → actuator`.
- The CPU is **not** the brain. It is the output side of the loop.
- The interrupt controller is the integration point, the “spinal cord”
  analogue.
- The sensor is the hardware analogue of a receptor; do not call it a receptor
  in this room.
- Do not add voltage levels, bus protocols, interrupt priorities, or other
  electrical-engineering details.
- Do not claim that a computer has a nervous system, a spinal cord, or
  consciousness.

### 11.2 Visual do-not-claim

Do not draw:

- a CPU as a brain, a brain inside a chip, or a CPU on a throne;
- a literal spinal cord or a nervous system inside the board;
- a sensor as a biological receptor or a nerve ending;
- a controller as a brain;
- a computer with a face, a heartbeat, or flesh;
- text, labels, arrows, or diagram lines;
- gore, blood, exposed organs, or shock imagery.

### 11.3 Tone guard

Allowed: cold, grimy, scuffed, fussy, tired, deadpan, weird, dry, wry.

Not allowed: gore, open wounds, viscera, religious horror, toilet humour,
sexual content, shock-value body horror.

The board is a **workplace**, not a slaughterhouse.

---

## 12. Same-game / different-world checklist

A Silicon asset passes when:

- [ ] It uses only the nine ramp families and the Silicon role mapping.
- [ ] Graphite/cyan/ceramic dominate; nerve amber is absent.
- [ ] It uses orthogonal PCB geometry, not organic curves.
- [ ] It reads as cold/clean-room, not damp/humid.
- [ ] It has no nerve, neuron, myelin, membrane, bone, or muscle motif.
- [ ] It reads at actual size: 28×44 player, 36×36 entity, 32×32 atlas frame.
- [ ] It shares the pixel grid, outline weight, and HUD language with the rest
  of the game.
- [ ] It does not read as a teal recolour of `03-nerve-forest`.
- [ ] It has no text, labels, arrows, or diagram lines.
- [ ] It passes the 12+ tone guard.

A Silicon asset fails when:

- [ ] It contains a nerve trunk, branching root, myelin bead, synaptic bulb, or
  membrane fold.
- [ ] It uses amber as the dominant signal colour.
- [ ] It uses a neuron/cell character.
- [ ] It uses a warm key light or a damp fog.
- [ ] It reads as biology with a circuit texture pasted on.

---

## 13. Prompt log fields

Every generated asset records:

| Field | Example |
|---|---|
| Prompt version | `silicon-2026-11-01.1` |
| Style version | `style-silicon-v1` |
| Asset ID | `sprite.agent.cpu` |
| Subject block | `SUBJECT: One small CPU Core creature...` |
| Fidelity guard | `CPU is output side; not a brain` |
| Visual analogy | `boxy ceramic chip with pin legs` |
| Prompt order | `SUBJECT → STYLE_TECH → PALETTE → FRAME` |
| Tool and plan | Ludo.ai / Indie |
| Model and seed | Ludo image model; seed |
| Reference | `style-anchor-p1.png` for pixel/palette only |
| Negative block | `NEGATIVE_TECH` + asset delta |
| Prompt | Full positive prompt |
| Frame block | `FRAME_ENTITY_CONCEPT` |
| Export frame | `FRAME_ENTITY` (Aseprite/Piskel only) |
| Chosen file | `shared/sprites/agent-cpu.png` |
| Pixel cleanup | Aseprite; 18×18; palette quantised |
| Runtime check | 36×36; warm tint check; contact sheet |
| Verdict | Approved / retry / placeholder |
| Licence | Ludo AI Commercial (paid) or POC label |
| Notes | One variable changed; reason for retry |

Keep failed rows. The prompt log is the evidence for the AI-generated asset
record.

---

## 14. References

- [`../m2/nervous-puzzles/silicon-fixture.md`](../m2/nervous-puzzles/silicon-fixture.md)
- [`../m2/nervous-puzzles/anatomy-fidelity.md`](../m2/nervous-puzzles/anatomy-fidelity.md)
- [`../m3/asset-requirements-v01.md`](../m3/asset-requirements-v01.md)
- [`../m1.9/README.md`](../m1.9/README.md)
- [`../shrinkonauts/base-game/contracts/pack-schema.md`](../shrinkonauts/base-game/contracts/pack-schema.md)
- [`../../public/packs/anatomy-reflex/materials.json`](../../public/packs/anatomy-reflex/materials.json)
- [`../../public/packs/index.json`](../../public/packs/index.json)
