# M3 Asset Requirements — Shrinkonauts: The Reflex Arc

**Status:** Draft v0.1 · 27 October 2026  
**Owner:** Snorre  
**Scope:** Final 2D art and audio for the M3 vertical slice  
**Target milestone:** M3 — Art/audio pass + capture (4–5 November 2026)  
**Governing decisions:** ADR-0029 (asset provider), ADR-0030 (sprite format), ADR-0031 (layered backgrounds), ADR-0032 (audio cues), ADR-0033 (final asset timing)  
**Related:** [`implementation-plan.md`](../shrinkonauts/base-game/implementation-plan.md) · [`contracts/pack-schema.md`](../shrinkonauts/base-game/contracts/pack-schema.md) · [`level-authoring.md`](../shrinkonauts/base-game/level-authoring.md) · [`DESIGN.md`](../shrinkonauts/DESIGN.md) · [`learning-design-brief.md`](../shrinkonauts/learning-design-brief.md) · [`cards/`](../shrinkonauts/base-game/cards/)

> **The rule for this milestone:** art follows the capture list, not the level list. M3 is not a five-level art production. It is one coherent vertical slice that appears in the 2-minute video, the GDD, and the playtest build.

---

## 0. Summary

| Decision | Value |
|---|---|
| Art scope | `03-nerve-forest` + shared kit |
| Visible images | **20** |
| Audio cues | **11** |
| Total M3 assets | **31** |
| Style | **Dank Anatomy Cartoon** |
| Tool | **Ludo.ai Image Generator / Audio Generator** |
| Ludo plan | **Indie, $20/mo** (Pro only if automation or scope grows) |
| Free-tier use | Six-asset style gate only |
| Animation | **None** — the runtime renders single images |
| UI panels/portraits | **Deferred** — not rendered by the current UI |
| Music | **Deferred** — not played by the current runtime |
| Levels 01, 02, 04, 05, Silicon | **Deferred** — design proposals exist, but the pack content is not implemented |
| Content-freeze dependency | **Puzzle-specific props are blocked until M2 freezes the 03 puzzle** |

> **Content-freeze dependency.** This inventory is based on the current one-level build, which still uses `puzzle-ferry-01` in `03-nerve-forest`. The M2 design package proposes replacing it with **Node Run** and moving the ferry pattern to `04-muscle-effector` ([`docs/m2/nervous-puzzles/03-nerve-forest.md`](../m2/nervous-puzzles/03-nerve-forest.md), [`04-muscle-effector.md`](../m2/nervous-puzzles/04-muscle-effector.md)). If that redesign is implemented, the puzzle-specific props in this document will change. See §2.4 before generating gates, tracers, receptors, or pulse terminals.

---

## 1. Purpose

This document defines exactly what final art and audio the M3 art pass requires, what the visual style is, how each asset is generated in Ludo, and how the result is accepted. It exists to prevent four failure modes:

1. **Scope creep** — trying to art five levels plus a Silicon fixture in two days.
2. **Style drift** — generating 40 assets that do not look like one game.
3. **Engine mismatch** — producing animated spritesheets or UI skin assets the runtime cannot display.
4. **Licensing ambiguity** — shipping AI-generated assets without a clear tool, plan, prompt, and licence record.

This is a production document, not a GDD. The game design source remains [`DESIGN.md`](../shrinkonauts/DESIGN.md); the learning contract remains [`learning-design-brief.md`](../shrinkonauts/learning-design-brief.md); the architecture remains the [`base-game/`](../shrinkonauts/base-game/) docs.

---

## 2. Scope contract

### 2.1 In scope for M3

| Category | Count | Notes |
|---|---:|---|
| Player sprites P1/P2 | 2 | Shared across all levels |
| Visible `03-nerve-forest` entity sprites | 12 | Agent, scans, gate, exit, props, receptors |
| `03-nerve-forest` background layers | 4 | Sky, far, mid, near |
| Shared tile texture | 1 | One 32×32 texture used by the room |
| Badge | 1 | The only UI asset currently rendered |
| **Visible images subtotal** | **20** | |
| SFX cues | 11 | Current theme cue list |
| **M3 total** | **31** | 20 images + 11 audio |

### 2.2 Deliberately out of scope

| Item | Count | Reason |
|---|---:|---|
| `ui.icon.scan`, `ui.icon.map`, `ui.icon.log` | 3 | Declared in the theme but not rendered by the current UI |
| `ui.portrait.neuron` | 1 | Not rendered |
| `ui.panel.dialogue`, `panel.gate`, `panel.debrief`, `panel.map` | 4 | Not rendered |
| `sprite.checkpoint` | 1 | Declared but not referenced by the current room |
| `sprite.gate.nerve` | 1 | Declared but not referenced by the current room |
| Animated sprite sheets / GIF loops | — | The runtime loads sheets but does not create animations |
| Music loop / ambience | — | Music playback is deferred |
| Levels `01-bone-gate`, `02-joint-chamber`, `04-muscle-effector`, `05-reflex-core` | 4 | Design proposals exist in [`docs/m2/nervous-puzzles/`](../m2/nervous-puzzles/), but the pack content is not implemented |
| Silicon fixture | 1 | Design proposal exists; not implemented in the pack |
| Full key rebinding, capture-mode UI, new UI layout | — | Engine/UI tasks, not art-pass tasks |

The deferred UI assets remain declared as placeholders. They will not appear in the build and do not block M3 capture.

### 2.3 Scope rules

1. **One level.** Final art is produced for `03-nerve-forest` only. Other levels get art only after they are authored, pass validation, and appear in the capture list.
2. **No new asset IDs during M3.** If a level needs a new ID, that is a content/engine task with an ADR, not an art-pass improvisation.
3. **No gameplay code changes.** ADR-0033 forbids mixing the art pass with code changes. If an asset requires new rendering behaviour, it becomes an engine/UI task and is scheduled separately.
4. **Static sprites only.** The current `world` adapter uses Phaser images, not animations. Animated sheets would display frame 0 only.
5. **Reuse the shared kit.** Players, tile, badge, and audio cues are shared. Do not generate per-level duplicates.
6. **Placeholders are an acceptable fallback.** A coherent placeholder build is better than a half-finished final build. The validator already supports declared placeholders.
7. **One level, one style anchor.** All assets derive from the approved P1 style anchor and the global style block.

### 2.4 Content-freeze dependency

The current pack still uses the **Signal Ferry** puzzle in `03-nerve-forest`. The M2 design package proposes replacing it with **Node Run** and moving the ferry/receptor pattern to `04-muscle-effector`. That design is documentation only at the time of writing; it is not implemented.

Until the M2 pack is frozen:

| Asset group | Status before freeze | Reason |
|---|---|---|
| Players, tile, badge, sky, far/mid/near | **Safe to generate** | Shared or environment-level; unaffected by puzzle redesign |
| Neuron Keeper, scan targets | **Generate after scan list is frozen** | Concept scans may change with the 03 puzzle |
| `sprite.gate.ferry`, `sprite.prop.tracer`, `sprite.pulse.terminal`, `sprite.receptor.triangle`, `sprite.receptor.circle` | **Blocked** | These belong to the current ferry puzzle; they may move to 04 or be replaced |
| `sprite.exit` | **Safe** | The exit remains even if the gate changes |
| SFX | **Safe** | Cue vocabulary is stable |

**Action:** after M2 content freeze, re-baseline this inventory against the actual `room.json`, `puzzle.json`, and `assets.final.json`. Do not spend M3 credits on puzzle props that the final room does not use.

> **M1.8 material/pattern dependency (proposed).** ADR-0014–0017 introduce
> materials, tile material grids, autotiling, variants, pattern projection, and
> atlas assets. They replace the current one-32×32-tile and single-sprite
> assumptions in this document. Do not generate tile variants, atlases, or
> material patterns until the M1.8 scope is accepted and this inventory is
> re-baselined against the material model.

---

## 3. Runtime constraints that shape the art

These are current implementation facts, not preferences.

| Constraint | Evidence | Consequence for M3 |
|---|---|---|
| Players are displayed at **28×44 px** | `src/world/physics.ts` (`PLAYER_WIDTH`, `PLAYER_HEIGHT`) | Export player textures at a 28:44 aspect ratio. Do not squash a square image into 28×44. |
| Entities are displayed at **36×36 px** | `src/world/room-scene.ts` (`ENTITY_SIZE = 36`) | Export entity textures at 1:1. Design for 36 px readability. |
| The room uses a single **32×32** tile texture | `room.json` (`tileSize: 32`), `room-scene.ts` (`tileset`) | Current runtime uses one tile texture. After M1.8, expect material grids, autotile variants, and atlases; re-baseline this inventory. |
| Background far/mid/near use `fit: "tile"` | `room.json`, `src/world/background.ts` (`TileSprite`) | These layers must tile seamlessly. Avoid unique landmarks that repeat obviously. |
| The sky uses `fit: "cover"` and is scaled ~1.4× | `src/world/background.ts` | Generate a 16:9 sky with safe dark areas for HUD and player silhouettes. |
| Spritesheets are loaded but not animated | `room-scene.ts` loads `type: "sheet"` but creates `this.add.image(...)`; no `this.anims.create(...)` | For M3, use static `sprite` entries and single PNG/WebP images. |
| Only the badge UI asset is rendered | `src/ui/hud.ts` (`styleBadge`) and `src/game/boot.ts` | Generate `ui.icon.badge`; skip the other UI assets. |
| Capture mode is deferred | `IMPLEMENTATION.md` status table | Clean 16:9 capture is an M2/M3 engine task; do not assume `?capture=1` exists. |
| Music playback is deferred | `IMPLEMENTATION.md` status table | Do not generate a music loop for M3. |
| No web font is loaded | `index.html`, `theme.json` | Keep the existing font stack. Font loading is a separate UI task. |

---

## 4. Art direction: “Dank Anatomy Cartoon”

### 4.1 One-line direction

**A hand-drawn, grimy biology cartoon: chunky Isaac-like silhouettes, damp body-horror architecture, deadpan cell characters, and a tiny scuffed astronaut who is very tired of being inside somebody.**

### 4.2 Visual pillars

1. **Hand-drawn 2D cartoon** — thick, slightly wobbly ink outlines in dark teal-brown, not pure black.
2. **Flat but textured** — flat colour fills, one hard shadow shape, one warm highlight, subtle paper grain.
3. **Damp and grimy** — wet membrane sheen, condensation, dust, mineral grit, scuffed suit, discoloured tissue.
4. **Gross-cute, not edgy** — weird, fleshy, and funny; never gory, never shock humour.
5. **Readable at actual size** — 28×44 player, 36×36 entities, 32×32 tile. No fine detail.
6. **Body as a workplace** — cells are tired workers with jobs, not monsters.
7. **Side-view platformer** — characters in side or slight 3/4 view; backgrounds orthographic side view.
8. **Isaac-like silhouette, not Isaac-like content** — big head/helmet, short body, chunky boots, strong outline. No copied characters, no top-down perspective, no religious horror, no gore.

### 4.3 Palette

| Token | Hex | Use |
|---|---|---|
| Deep teal | `#101a20` | Shadows, background depth, ink |
| Bone | `#f2e8d5` | Suit, bone, highlights |
| Bone shadow | `#7a8f8a` | Secondary bone, dust |
| Nerve yellow | `#ffd166` | Signals, key light, pickups |
| Glow | `#fff3b0` | Hot highlights |
| Joint cyan | `#7bdff2` | P1 accents, scan UI, cool rim |
| Muscle pink | `#ef476f` | P2 accents, muscle, danger |
| Sage | `#9db4ad` | Muted tissue, secondary text |

Use only these colours, plus black/white only for tiny alpha edges. Do not introduce purple, neon green, orange, or pure red.

### 4.4 Character rules

- **Player:** bulky retro-futuristic life-support suit; cream/bone shell; dark teal joints; round helmet with warm amber visor; yellow backpack tanks; cyan chest light; scanner gauntlet; short legs; big boots; scuffed, patched, grimy. No visible face. No sleek armour. No shiny plastic.
- **P1/P2 differentiation:** P1 uses joint cyan accents; P2 uses muscle-pink accents. Keep the silhouette identical.
- **Cells:** characters first, diagrams second. Big expressive eyes, simple body, tiny limbs, one job prop, one personality prop. No human faces, no sexualised cells, no gore.
- **Cell colour families:** neuron = nerve yellow/bone; osteocyte = bone/dust; synoviocyte = amber/cyan; muscle effector = muscle pink/rust; reflex core = bone/danger pink; Silicon = graphite/cyan.
- **Props:** strong iconic silhouettes, readable at 36 px, glowing cyan scan rim for scannable objects, nerve-yellow core for interactables.
- **No text on any sprite.** Labels and numbers are UI, not art.

### 4.5 Environment rules

- The body is a **landscape**, not a cutaway textbook diagram. Anatomy is architecture: nerve bundles as trees, myelin as bark, synapses as lanterns, bone as cliffs, cartilage as glass, membranes as wet fabric.
- **Damp, humid, breathing.** Use condensation, sheen, dust motes, membrane folds, and subtle parallax depth.
- **Dark enough for HUD.** Keep the centre and lower third of the sky relatively dark so the yellow/cyan HUD and player silhouettes read.
- **No labels, arrows, or diagram lines.** The scan system supplies meaning.
- **Layered depth:** far = large slow shapes; mid = branching structures; near = dark framing silhouettes with large transparent gaps.
- **Tileable layers:** far/mid/near must repeat without a visible seam or obvious focal object.

### 4.6 Tone guard

**Allowed:** damp, grimy, scuffed, dusty, wry, tired, fussy, weird, fleshy, cosy-catastrophe.

**Not allowed:** blood, open wounds, exposed viscera, gore, dead characters, religious horror, toilet humour, sexual content, swearing in art, shock-value body horror.

The body is a **workplace**, not a slaughterhouse. The humour comes from fussy cells and a tiny astronaut who has had enough, not from gross-out shock.

### 4.7 References and non-references

Internal references, for the team only (not for prompts):

- *The Binding of Isaac* — chunky hand-drawn silhouettes, big heads, darkly funny world, limited palette.
- *Don’t Starve* — scratchy ink, grim handmade texture.
- *Osmosis Jones* — inside-body cartoon premise, but cleaner and more literal than this game.
- *Hollow Knight* — layered atmospheric background depth.
- *The Maw* — gross-cute creature design.

Do not put living artists’ names or copyrighted character names into Ludo prompts. Use the descriptive style block instead.

### 4.8 Do / do not

| Do | Do not |
|---|---|
| Use thick, slightly uneven ink outlines | Use clean vector lines or pixel art |
| Use flat fills with one hard shadow | Use soft gradients, 3D shading, or glossy plastic |
| Make silhouettes readable at 28–36 px | Add fine detail, fingers, lace, or tiny text |
| Use the eight-colour palette | Introduce neon, purple, or pure red |
| Make cells look like tired workers | Make cells look like monsters or gore |
| Use damp membrane texture and grime | Use blood, wounds, or exposed organs |
| Keep the suit scuffed and practical | Make it sleek, shiny, or Iron Man-like |
| Generate on a plain field and remove the background | Ask for a transparent checkerboard |

### 4.9 Per-level colour scripts

These are for future levels. **Do not generate them until the level is authored and in the capture list.**

| Level | Palette shift | Texture/lighting |
|---|---|---|
| `01-bone-gate` | Bone cream, dust, cold cyan | Dry, chalky, dusty, hard shadows |
| `02-joint-chamber` | Synovial amber, wet cyan, brass | Slippery, glossy but not plastic |
| `03-nerve-forest` | Deep teal, nerve yellow, electric cyan | Damp, humid, electrical glow |
| `04-muscle-effector` | Muscle pink, warm rust, bone | Fibrous, warm, taut |
| `05-reflex-core` | Bone white, danger pink, bright yellow | Spinal, bright core, high contrast |
| Silicon fixture | Graphite, cyan, bone | Clean-room, cold, no gore |

---

## 5. Asset inventory

### 5.1 Counts

| Bucket | Count |
|---|---:|
| Visible M3 images | 20 |
| SFX cues | 11 |
| **M3 production total** | **31** |
| Deferred UI images | 8 |
| Optional unused sprites | 2 |
| **Current manifest total** | **41** |

### 5.2 Shared kit

| Asset ID | Type | Display size | Export size | File path | Priority |
|---|---|---:|---:|---|---|
| `sprite.player.p1` | sprite | 28×44 | 112×176 PNG | `shared/sprites/player-p1.png` | P0 |
| `sprite.player.p2` | sprite | 28×44 | 112×176 PNG | `shared/sprites/player-p2.png` | P0 |
| `tileset.anatomy` | image | 32×32 tile | 32×32 PNG (or 128×128 downscaled) | `shared/tilesets/anatomy.png` | P1 |
| `ui.icon.badge` | image | ~32×32 HUD stamp | 512×512 PNG | `shared/ui/badge.png` | P2 |

### 5.3 `03-nerve-forest` visible entities

> **Assumption:** the current `puzzle-ferry-01` layout remains in `03-nerve-forest`. If M2 implements Node Run, the gate/tracer/pulse/receptor rows in this table are provisional and must be replaced with the frozen room’s entities.

| Asset ID | Entity role | Display size | Export size | File path | Priority |
|---|---|---:|---:|---|---|
| `sprite.agent.neuron` | Neuron Keeper | 36×36 | 144×144 PNG | `shared/sprites/agent-neuron.png` | P0 |
| `sprite.scan.neuron` | Scan target | 36×36 | 144×144 PNG | `shared/sprites/scan-neuron.png` | P0 |
| `sprite.scan.synapse` | Scan target | 36×36 | 144×144 PNG | `shared/sprites/scan-synapse.png` | P1 |
| `sprite.scan.pathway` | Scan target | 36×36 | 144×144 PNG | `shared/sprites/scan-pathway.png` | P1 |
| `sprite.scan.muscle` | Scan target | 36×36 | 144×144 PNG | `shared/sprites/scan-muscle.png` | P1 |
| `sprite.scan.reflex` | Scan target | 36×36 | 144×144 PNG | `shared/sprites/scan-reflex.png` | P1 |
| `sprite.gate.ferry` | Puzzle gate | 36×36 | 144×144 PNG | `shared/sprites/gate-ferry.png` | P0 |
| `sprite.exit` | Level exit | 36×36 | 144×144 PNG | `shared/sprites/exit.png` | P1 |
| `sprite.prop.tracer` | Carry prop | 36×36 | 144×144 PNG | `shared/sprites/prop-tracer.png` | P1 |
| `sprite.pulse.terminal` | Pulse source | 36×36 | 144×144 PNG | `shared/sprites/pulse-terminal.png` | P1 |
| `sprite.receptor.triangle` | Receptor A | 36×36 | 144×144 PNG | `shared/sprites/receptor-triangle.png` | P1 |
| `sprite.receptor.circle` | Receptor B | 36×36 | 144×144 PNG | `shared/sprites/receptor-circle.png` | P1 |

### 5.4 Backgrounds

| Asset ID | Ludo type | Export size | File path | Priority |
|---|---|---|---:|---|---|
| `bg.nerve_forest.sky` | Background | 1920×1080 WebP | `shared/backgrounds/nerve-forest-sky.webp` | P0 |
| `bg.nerve_forest.far` | Parallax layer | 1024×512 PNG/WebP, transparent | `shared/backgrounds/nerve-forest-far.webp` | P1 |
| `bg.nerve_forest.mid` | Parallax layer | 1024×512 PNG/WebP, transparent | `shared/backgrounds/nerve-forest-mid.webp` | P0 |
| `bg.nerve_forest.near` | Parallax layer | 1024×512 PNG/WebP, transparent | `shared/backgrounds/nerve-forest-near.webp` | P1 |

### 5.5 Audio cues

| Asset ID | Event | Export |
|---|---|---|
| `audio.cue.boot` | Boot / suit power | OGG or MP3, 0.2–1.2 s |
| `audio.cue.dialogue` | Dialogue advance | OGG or MP3, 0.2–0.8 s |
| `audio.cue.scan` | Scan | OGG or MP3, 0.3–1.0 s |
| `audio.cue.dash` | Dash | OGG or MP3, 0.2–0.7 s |
| `audio.cue.gate` | Gate attempt/solve | OGG or MP3, 0.4–1.2 s |
| `audio.cue.map` | Map open | OGG or MP3, 0.3–0.9 s |
| `audio.cue.debrief` | Debrief open | OGG or MP3, 0.4–1.2 s |
| `audio.cue.checkpoint` | Checkpoint | OGG or MP3, 0.3–0.9 s |
| `audio.cue.unlock` | Ability unlock | OGG or MP3, 0.5–1.2 s |
| `audio.cue.jump` | Jump | OGG or MP3, 0.15–0.5 s |
| `audio.cue.land` | Land | OGG or MP3, 0.15–0.5 s |

### 5.6 Deferred assets

These remain declared placeholders in `assets.final.json`. Do not generate them in M3.

- `ui.icon.scan`
- `ui.icon.map`
- `ui.icon.log`
- `ui.portrait.neuron`
- `ui.panel.dialogue`
- `ui.panel.gate`
- `ui.panel.debrief`
- `ui.panel.map`

Optional only if the room changes to reference them:

- `sprite.checkpoint`
- `sprite.gate.nerve`

### 5.7 File naming

Use lowercase kebab-case, no spaces, no dots in filenames.

| Asset ID | File |
|---|---|
| `sprite.player.p1` | `shared/sprites/player-p1.png` |
| `sprite.agent.neuron` | `shared/sprites/agent-neuron.png` |
| `sprite.scan.neuron` | `shared/sprites/scan-neuron.png` |
| `sprite.gate.ferry` | `shared/sprites/gate-ferry.png` |
| `bg.nerve_forest.sky` | `shared/backgrounds/nerve-forest-sky.webp` |
| `tileset.anatomy` | `shared/tilesets/anatomy.png` |
| `ui.icon.badge` | `shared/ui/badge.png` |
| `audio.cue.scan` | `shared/audio/scan.ogg` |

---

## 6. Technical specifications

### 6.1 Dimensions and formats

| Asset type | Source/export | Runtime display | Format |
|---|---|---|---|
| Player | 112×176 or 224×352 | 28×44 | PNG with alpha |
| Entity | 144×144 or 288×288 | 36×36 | PNG with alpha |
| Background sky | 1920×1080 | cover, ~1.4× scale | WebP |
| Parallax layer | 1024×512 or 2048×1024 | tile | PNG/WebP with alpha |
| Tile | 32×32 (or 128×128 downscaled) | 32×32 | PNG/WebP |
| Badge | 512×512 | ~32×32 HUD stamp | PNG with alpha |
| Audio | 48 kHz | — | OGG or MP3 |

Do not export JPG for sprites or layers with alpha. Do not ship 4K art.

### 6.2 Alpha and trimming

1. Generate on flat magenta `#FF00FF` unless Ludo has a reliable transparent-output option.
2. Remove the background in Ludo or Aseprite.
3. Inspect edges at 400%. Remove magenta fringe; do not leave a 1 px halo.
4. Trim to the alpha bounding box.
5. Pad to a fixed canvas:
   - Player: 28:44 aspect, feet near the bottom, 2–4 px transparent margin.
   - Entity: 1:1, centred, 5–8% margin.
6. Do not bake drop shadows or ground shadows. The engine adds its own shadow/glow.

> **Critical:** the engine sets the whole texture to 28×44 or 36×36. If you export a square player image with a tiny character and lots of transparent padding, the character will be squashed and unreadable. Export the player at 28:44.

### 6.3 Tileability

- Far/mid/near layers must tile horizontally and vertically in Phaser’s `TileSprite`.
- Verify with a 2×2 repeat at 1280×720, not by looking at one image.
- Avoid a single strong landmark that repeats obviously.
- Keep large transparent gaps in the near layer so the room remains playable.
- The tile must tile on all four sides. Avoid a directional top edge unless the room only uses it as a floor.

### 6.4 Anchors and padding

- Player origin is bottom-centre; feet must sit at the bottom of the alpha box.
- Entity origin is bottom-centre; the base of the object must sit at the bottom.
- Keep a consistent baseline across scan targets and receptors.
- Do not add an artificial pedestal or ground line.

### 6.5 Budgets

These are project budgets, not engine limits.

| Asset | Budget |
|---|---|
| Player PNG | ≤ 250 KB each |
| Entity PNG | ≤ 150 KB each |
| Background WebP | ≤ 450 KB each |
| Parallax layer | ≤ 350 KB each |
| Tile | ≤ 80 KB |
| Badge | ≤ 150 KB |
| Audio cue | ≤ 120 KB each |
| Total visual assets | ≤ 10 MB |

If an asset exceeds budget, downscale or re-encode; do not ship a 4K PNG.

### 6.6 Manifest types

Use static types for M3:

| Asset ID pattern | Manifest `type` |
|---|---|
| `sprite.player.*` | `sprite` |
| `sprite.agent.*`, `sprite.scan.*`, `sprite.gate.*`, `sprite.prop.*`, `sprite.pulse.*`, `sprite.receptor.*`, `sprite.exit` | `sprite` |
| `bg.*` | `background` |
| `tileset.*`, `ui.*` | `image` |
| `audio.*` | `audio` |

Do not use `sheet`, `gif`, or `webp` animation types in M3. They are valid formats but the current view layer will not animate them.

---

## 7. Ludo workflow

### 7.1 Tool and plan

- Use **Ludo.ai → Image Generator**, not Sprite Generator, for all M3 images.
- Use **Ludo.ai → Audio Generator** for the 11 SFX.
- Start on the **free tier** for the six-asset style gate.
- Buy **Indie ($20/mo)** for production. Do not buy Pro unless you need API/MCP/CLI or the M2 scope grows beyond this document.
- Do not buy annual billing for a two-day milestone.

### 7.2 Settings

| Setting | Value |
|---|---|
| Asset type | Sprite / Background / Parallax layer / Texture / Icon, as appropriate |
| Style | Closest hand-drawn / dark-comic style; never pixel art |
| Reference | `style-anchor-p1.png` after P1 is approved |
| Variations | 4 per prompt |
| Resolution | 1024 px on the long edge; higher only for the sky if needed |
| Aspect | 1:1 sprites/props/tile/badge; 16:9 sky; 2:1 parallax if available |
| Background | Transparent if reliable; otherwise flat magenta `#FF00FF` |
| Negative prompt | Use the block in §8.3 if the field exists; otherwise append it to the prompt |

If Ludo’s UI labels differ, map to the closest equivalent. The prompt blocks are the source of truth.

### 7.3 Style anchor

1. Generate **P1** first, four variations.
2. Pick the one that reads best at 28×44 and matches the palette.
3. Save it as `style-anchor-p1.png`.
4. Use it as the style/reference image for every later character, prop, and icon.
5. Use the approved **sky** as the style reference for backgrounds if Ludo allows a second reference; otherwise keep the style block identical.
6. Do not use P1 as an image-to-image base for NPCs — it may copy the astronaut. Use it as a style reference only.

### 7.4 Batch order

| Batch | Assets | Purpose |
|---|---|---|
| 0 | P1 | Style anchor |
| 1 | P2, Neuron Keeper, `scan.neuron`, `sprite.exit` | Character/prop style gate |
| 2 | Sky, mid layer | Environment style gate |
| 3 | Remaining scans, tracer, pulse terminal, receptors, gate ferry | Complete visible entity set — only after M2 content freeze |
| 4 | Far, near, tile, badge | Complete environment/UI kit |
| 5 | 11 SFX | Audio pass |

Do not start Batch 3 until Batch 1–2 are signed off.

### 7.5 Free-tier test gate

Generate exactly these six images:

1. `sprite.player.p1`
2. `sprite.agent.neuron`
3. `sprite.scan.neuron`
4. `sprite.exit`
5. `bg.nerve_forest.sky`
6. `bg.nerve_forest.mid`

**Pass criteria**

- Player silhouette reads at 28×44 on a dark teal background.
- NPC and scan target read at 36×36.
- Palette stays within the eight colours.
- Outline thickness is consistent across all six.
- Tone is gross-cute, not gory or shock-humour.
- Sky has dark areas for HUD; mid layer tiles seamlessly in a 2×2 preview.
- Alpha is clean, with no magenta fringe.

If four of six pass, proceed. If not, revise the style block/reference and rerun the six. Do not “fix it later” across 20 assets.

### 7.6 Per-asset loop

1. Assemble prompt: `STYLE + asset prompt + frame block`.
2. Generate four variations.
3. Pick the best; download the full-resolution image.
4. Remove background; inspect alpha at 400%.
5. Trim and pad to the target aspect.
6. Check at actual display size on a dark teal contact sheet.
7. Record the prompt, model/style, date, and chosen file in the prompt log.
8. If it fails, change one variable (prompt phrase or reference), not five.
9. Stop after three attempts; use a placeholder if still failing.

### 7.7 Stop rules

- Maximum **three attempts** per asset on free tier; maximum **two prompt revisions** per asset on paid.
- If a whole category fails, stop and revise the style anchor, not individual assets.
- If an asset needs new rendering behaviour, stop; it is an engine task, not an art task.
- If the style gate fails, ship placeholders. Do not burn M3 on tool fighting.

### 7.8 Review contact sheet

Create a 1280×720 dark teal contact sheet showing:

- P1 and P2 at 28×44.
- Each entity at 36×36.
- Sky at 1280×720.
- Mid layer tiled 3× across.
- Badge at 32×32.

Review at 100% zoom, not on a large preview. If it does not read at actual size, it does not pass.

---

## 8. Copy-paste prompt pack

### 8.1 Assembly formula

```text
FINAL IMAGE PROMPT = STYLE + ASSET PROMPT + FRAME BLOCK
```

If Ludo has separate fields for style, negative prompt, and reference image, use them. Otherwise paste the blocks in order.

### 8.2 STYLE — paste at the start of every image prompt

```text
Hand-drawn 2D dark cartoon game art for a side-view platformer set inside a living human body. Thick, slightly wobbly ink outlines in dark teal-brown; flat muted fills; one hard shadow shape; one warm highlight; subtle paper grain, damp membrane sheen, condensation, dust and grime. Gross-cute biology, wry deadpan tone, weird and fleshy but 12+ friendly: never gory, no shock humor. Palette: deep teal #101a20, bone cream #f2e8d5, bone shadow #7a8f8a, nerve yellow #ffd166, glow #fff3b0, joint cyan #7bdff2, muscle pink #ef476f, sage #9db4ad. Strong readable silhouette, simple shapes, no fine detail. Side view or slight 3/4 view. No text, no logo, no watermark, no border, no UI, no photorealism, no 3D, no pixel art, no anime, no clean vector, no neon cyberpunk, no blood, no gore, no open wounds, no extra limbs, no detailed fingers, no baked drop shadow, no ground shadow.
```

### 8.3 NEGATIVE — use if Ludo has a negative field

```text
text, logo, watermark, border, UI, labels, arrows, diagram, pixel art, 3D render, photorealism, anime, clean vector, neon cyberpunk, purple, neon green, blood, gore, open wound, viscera, exposed organs, extra limbs, detailed fingers, baked shadow, ground shadow, checkerboard transparency, multiple characters, scene background
```

### 8.4 SPRITE FRAME — append to character/prop prompts

```text
Full body, centered, generous margin, feet at the bottom, isolated on a flat solid magenta #FF00FF background, no cast shadow, no ground, no scene, no frame.
```

### 8.5 BACKGROUND FRAME — append to sky prompts

```text
Wide cinematic composition, no characters, no text, no UI, no border, no frame, no logo. Keep the center and lower third dark enough for HUD and player silhouettes.
```

### 8.6 TILE FRAME — append to tile prompts

```text
Seamless tile; edges match on all four sides; flat orthographic view; no text, no border, no unique focal object.
```

### 8.7 P1 — style anchor

```text
[STYLE]

Full-body player character sprite: a tiny Shrinkonaut astronaut in a bulky retro-futuristic life-support suit. Round helmet with a warm amber visor, cream bone-colored suit, dark teal joints, cyan chest light, yellow backpack tanks, scuffed and grimy, short legs, big boots, one scanner gauntlet. Neutral side-view idle pose, facing right, strong silhouette, tall narrow 2:3 proportions.

[SPRITE FRAME]
```

### 8.8 P2 — same character, different accents

```text
[STYLE]

Same Shrinkonaut as the style reference, identical silhouette and pose, swap the cyan accents for muscle-pink #ef476f: pink chest light, pink shoulder pads, pink visor trim. Keep the suit cream, teal joints, yellow tanks, grime and outline style identical.

[SPRITE FRAME]
```

### 8.9 Entity prompts

Prepend `[STYLE]`, append `[SPRITE FRAME]`.

| Asset ID | Prompt |
|---|---|
| `sprite.agent.neuron` | `A friendly frazzled neuron cell character, the Neuron Keeper: plump bone-cream cell body with a dark nucleus-shaped core, big expressive eyes, dendrite hair, a long myelinated axon scarf, tiny hands, holding a glowing yellow signal lantern. Slight 3/4 side view, expressive but readable at 36px.` |
| `sprite.scan.neuron` | `A scannable anatomical landmark prop: a single neuron with branching dendrites, a plump soma, and a long myelinated axon, glowing cyan scan rim, nerve-yellow core, strong iconic silhouette.` |
| `sprite.scan.synapse` | `A scannable anatomical landmark prop: two nerve terminals facing across a wet synaptic cleft, glowing vesicles in the gap, cyan scan rim, nerve-yellow core.` |
| `sprite.scan.pathway` | `A scannable anatomical landmark prop: a forked nerve pathway with a bright signal bead travelling along it, cyan scan rim, nerve-yellow core.` |
| `sprite.scan.muscle` | `A scannable anatomical landmark prop: a bundle of striated muscle fibers with a nerve terminal landing on it, cyan scan rim, muscle-pink and nerve-yellow accents.` |
| `sprite.scan.reflex` | `A scannable anatomical landmark prop: a compact looped reflex arc, sensory and motor nerve branches meeting in a small spinal-cord knot, cyan scan rim, nerve-yellow core.` |
| `sprite.gate.ferry` | `A compact organic puzzle gate: a fleshy synaptic cleft with two receptor sockets, one triangular and one circular, braided nerve tendrils, bone plates, pulsing nerve-yellow core, side view.` |
| `sprite.exit` | `A membrane airlock doorway: a ring of bone and teal tissue, soft warm light beyond, wet folds, no gore, side view.` |
| `sprite.prop.tracer` | `A glowing neurotransmitter orb: soft irregular yellow blob with a cyan rim and tiny tendrils, floating, no face.` |
| `sprite.pulse.terminal` | `A presynaptic nerve terminal: bulbous teal membrane, visible vesicles, cyan pulse emitter, side view.` |
| `sprite.receptor.triangle` | `A receptor lock: a triangular organic socket, bone rim, teal membrane, nerve-yellow inner glow.` |
| `sprite.receptor.circle` | `A receptor lock: a circular organic socket, bone rim, teal membrane, nerve-yellow inner glow.` |

### 8.10 Background prompts

| Asset ID | Ludo type | Prompt |
|---|---|---|
| `bg.nerve_forest.sky` | Background, 16:9 | `[STYLE] Wide 16:9 opaque background plate: the interior of a living body as a damp nerve forest, deep teal darkness, distant branching signal veins, faint yellow glow on the horizon, floating dust, no characters, no text, no UI, no frame, painterly hand-drawn. [BACKGROUND FRAME]` |
| `bg.nerve_forest.far` | Parallax layer, 2:1 | `[STYLE] Seamless horizontally tileable parallax layer, transparent background: distant giant nerve trunks and pale myelin slabs, low contrast cool teal, soft haze, no ground, no characters, no text, edges match.` |
| `bg.nerve_forest.mid` | Parallax layer, 2:1 | `[STYLE] Seamless horizontally tileable parallax layer, transparent background: branching dendrites, synaptic bulbs, hanging membranes, medium contrast, yellow glow accents, no characters, no text, edges match.` |
| `bg.nerve_forest.near` | Parallax layer, 2:1 | `[STYLE] Seamless horizontally tileable foreground parallax layer, transparent background: dark tendon roots, fat globules, membrane folds framing the edges, high contrast, large transparent gaps, occasional yellow glow, no characters, no text, edges match.` |

### 8.11 Tile and badge prompts

| Asset ID | Prompt |
|---|---|
| `tileset.anatomy` | `[STYLE] A seamless 32x32 organic block texture for a side-view platformer: damp bone-and-nerve tissue, deep teal base, bone-cream grit, tiny yellow nerve threads, subtle pores and grime, no directional top edge, no objects, no text. [TILE FRAME]` |
| `ui.icon.badge` | `[STYLE] A circular mission patch icon: a tiny astronaut helmet inside a ring of nerve fibers, bone cream, deep teal, nerve yellow, joint cyan, thick ink outline, flat, simple, readable at 32px, no text, centered, transparent or flat magenta, 1:1.` |

### 8.12 Audio prompts

**AUDIO STYLE — prepend to every cue**

```text
Short diegetic game sound effect, 48 kHz, dry, tactile, sci-fi suit plus wet organic body, no music, no voice, no gore, clean tail, 0.2–1.2 seconds.
```

| Asset ID | Prompt |
|---|---|
| `audio.cue.boot` | `Suit power-up: soft electric hum rising, helmet seal hiss, two tiny confirmation beeps.` |
| `audio.cue.dialogue` | `Cell-speech translator: wet organic chirp, soft radio static blip, short and friendly.` |
| `audio.cue.scan` | `Scanner sweep: high sonar ping, data tick, faint cyan shimmer.` |
| `audio.cue.dash` | `Suit thruster: short air puff, fabric snap, quick whoosh.` |
| `audio.cue.gate` | `Organic lock release: wet squelch, bone clunk, soft yellow chime; not gory.` |
| `audio.cue.map` | `Holographic map unfold: soft digital shimmer, tiny chime, paper-like flap.` |
| `audio.cue.debrief` | `Warm resolution: soft two-note synth chime, suit confirmation click.` |
| `audio.cue.checkpoint` | `Beacon ping: clean cyan pulse, small save confirmation.` |
| `audio.cue.unlock` | `Ability unlock: rising synth, nerve zap, satisfying click.` |
| `audio.cue.jump` | `Suit servo jump: soft pneumatic push, tiny fabric movement.` |
| `audio.cue.land` | `Boots land on wet tissue: soft squelch, suit thud, no gore.` |

---

## 9. Acceptance criteria

### 9.1 Per-category acceptance

| Category | Must pass |
|---|---|
| Players | Reads at 28×44; P1/P2 differ by accent only; helmet, backpack, boots readable; feet at baseline |
| Entities | Reads at 36×36; silhouette distinct from every other entity; no text; no baked shadow |
| Backgrounds | Sky supports HUD contrast; far/mid/near tile without seams at 2×2; near layer does not obscure gameplay |
| Tile | Tiles on all four sides; no obvious repetition artifact; reads as anatomy, not generic stone |
| Badge | Reads at 32×32; no text; central composition; works on dark teal |
| Audio | Short, dry, no long tail; no audio-only cue; no gore; no music |

### 9.2 Style consistency

- Same outline weight across all assets.
- Same palette; no purple/neon drift.
- Same level of detail; no asset is suddenly painterly or 3D.
- Same tone: gross-cute, not edgy.
- Same camera language: side or slight 3/4 for characters; orthographic for backgrounds.
- All assets pass the “same game” test on one contact sheet.

### 9.3 Technical QA

- Correct aspect ratio and export size.
- Alpha is clean at 400%; no magenta fringe.
- No JPG for alpha assets.
- File size within budget.
- File names match the asset register.
- No text, logo, watermark, border, or checkerboard.
- Player/entity origins and paddings are consistent.
- Background layers tile correctly.

### 9.4 Content QA

- No blood, gore, open wounds, viscera, or shock imagery.
- No religious, sexual, or toilet humour.
- No copied characters or copyrighted props.
- No labels or arrows baked into the art.
- The body reads as a place, not a textbook diagram.
- The 12+ audience is respected.

### 9.5 Manifest and validator

- `assets.final.json` has real `src` paths for all 20 visible images and 11 audio cues.
- Each entry has a matching licence label in `licenses.json`.
- `npm run pack:validate` passes.
- `npm run pack:smoke` still passes.
- `?assets=final` loads the final manifest.
- No visible placeholder remains in a capture shot.
- Deferred UI assets remain declared placeholders and are not treated as missing.

### 9.6 Sign-off checklist

- [ ] Six-asset style gate passes.
- [ ] P1 and P2 approved.
- [ ] Neuron Keeper approved.
- [ ] Five scan targets approved.
- [ ] Gate, exit, props, receptors approved.
- [ ] Sky and mid layer approved; far/near approved.
- [ ] Tile and badge approved.
- [ ] 11 SFX approved.
- [ ] All files named and placed.
- [ ] Manifest and licences updated.
- [ ] Contact sheet reviewed at actual size.
- [ ] Capture stills reviewed.
- [ ] Cut-line assets explicitly marked as placeholders.

---

## 10. Manifest and licensing

### 10.1 Example manifest entries

```json
{
  "sprite.player.p1": {
    "type": "sprite",
    "src": "shared/sprites/player-p1.png",
    "license": "Ludo AI Commercial (paid)"
  },
  "sprite.agent.neuron": {
    "type": "sprite",
    "src": "shared/sprites/agent-neuron.png",
    "license": "Ludo AI Commercial (paid)"
  },
  "bg.nerve_forest.sky": {
    "type": "background",
    "src": "shared/backgrounds/nerve-forest-sky.webp",
    "license": "Ludo AI Commercial (paid)"
  },
  "tileset.anatomy": {
    "type": "image",
    "src": "shared/tilesets/anatomy.png",
    "license": "Ludo AI Commercial (paid)"
  },
  "ui.icon.badge": {
    "type": "image",
    "src": "shared/ui/badge.png",
    "license": "Ludo AI Commercial (paid)"
  },
  "audio.cue.scan": {
    "type": "audio",
    "src": "shared/audio/scan.ogg",
    "license": "Ludo AI Commercial (paid)"
  }
}
```

### 10.2 `licenses.json` example

```json
{
  "file": "shared/sprites/player-p1.png",
  "type": "image",
  "source": "Ludo.ai",
  "author": "AI-generated in Ludo.ai; art direction by Snorre",
  "license": "Ludo AI Commercial (paid)",
  "url": "https://ludo.ai/terms-of-service",
  "modified": "Generated 2026-11-04; background removed; trimmed; palette checked",
  "aiGenerated": true
}
```

Use a stable license label across all Ludo-paid assets, for example `Ludo AI Commercial (paid)`, and make the manifest `license` field match the label in `licenses.json`.

### 10.3 Prompt log

Keep a separate spreadsheet or Markdown table with:

| Field | Example |
|---|---|
| Asset ID | `sprite.agent.neuron` |
| Tool | Ludo.ai |
| Plan | Indie |
| Model/style | Ludo image model; hand-drawn dark cartoon |
| Prompt | Full prompt text |
| Reference | `style-anchor-p1.png` |
| Variations | 4 |
| Chosen file | `agent-neuron.png` |
| Date | 2026-11-04 |
| Modifications | Background removed; trimmed; palette checked |
| Verdict | Approved / retry / placeholder |
| Licence | `Ludo AI Commercial (paid)` |

The prompt log is the evidence for the GDD/video asset list and the AI-generated asset record.

### 10.4 Free-tier note

Use the free tier only for the six-asset style gate. Do not ship a free-tier file if it is watermarked or the terms do not cover the intended use. Regenerate the keepers on the paid Indie plan for final assets. If Ludo’s free output is clean and the terms allow it, record that explicitly in the prompt log; otherwise do not use it.

---

## 11. Production plan

### 11.1 Budget

Assumptions:

- 20 images × 4 variations × 0.5 credits = **40 credits**
- 11 SFX × 2 credits = **22 credits**
- Retries, inpainting, and fixes = **~40 credits**
- Total ≈ **102 credits**

Ludo Indie includes **250 credits/month** for **$20**. This is enough. Buy extra credits only if the M2 scope expands or the style gate needs heavy iteration.

**Do not buy Pro ($50/mo) for M3** unless:

- you need API/MCP/CLI automation;
- the M2 content freeze actually adds levels 2–5 + Silicon and the asset count grows beyond ~100 images;
- you decide to produce many animated sheets (after animation playback is implemented).

### 11.2 Schedule

| Time | Work |
|---|---|
| Before M3 (now) | Six-asset free-tier style gate; approve style anchor; prepare prompt sheet |
| M3 Day 1 AM | Regenerate P1/P2, Neuron Keeper, `scan.neuron`, `sprite.exit` on Indie |
| M3 Day 1 PM | Remaining scan targets; puzzle props only after M2 content freeze |
| M3 Day 2 AM | Sky, mid, far, near, tile, badge |
| M3 Day 2 PM | 11 SFX, cleanup, manifest, licences, contact sheet, capture stills |
| Buffer | 4 hours; use placeholders for anything unfinished |

### 11.3 Cut lines

In order:

1. Drop optional `sprite.checkpoint` and `sprite.gate.nerve`.
2. Drop `far` and `near` layers; use tinted placeholder gradients.
3. Drop `badge` and `tile` final art; keep placeholders.
4. Drop SFX polish; use synth fallback.
5. If the style gate fails, ship placeholders and protect the video/GDD deadline.

Never cut P1/P2, Neuron Keeper, the main interactive landmark (gate or exit), or the scan targets if they appear in the video. Those are the visual proof of the game.

### 11.4 Risks

| Risk | Mitigation |
|---|---|
| Style drift across 20 assets | P1 style anchor + global style block + contact sheet |
| Ludo output too “clean” or generic | Add grime/texture words; use reference; reject early |
| Alpha halos on dark background | Magenta background + 400% edge check + Aseprite cleanup |
| Non-tileable parallax layers | 2×2 preview; reject/re-roll; fallback to gradient |
| Player art squashed at 28×44 | Export at 28:44 aspect, not square |
| Scope creep into five levels | Capture-list rule; this document |
| M2 puzzle redesign invalidates prop art | Do not generate gate/tracer/pulse/receptor art until content freeze; re-baseline §5.3 |
| Credits exhausted | Indie 250 is enough; top up 250 rather than upgrade |
| Free-tier watermark | Free tier for look test only; paid Indie for finals |
| Engine can’t animate | Static sprites only; animation is a separate M2/M3 engine task |

---

## 12. Future levels

### 12.1 Level kit template

When a level is authored, validated, and in the capture list, instantiate:

- 4 background layers: sky, far, mid, near
- 1 tile texture
- 1 agent character
- 3–5 scan targets
- 1 gate
- 1 exit
- 1 checkpoint (if used)
- 2–4 props

Reuse the shared players, badge, and audio cues. Do not generate a new player per level.

### 12.2 Color scripts

| Level | Palette shift | Texture/lighting |
|---|---|---|
| `01-bone-gate` | Bone cream, dust, cold cyan | Dry, chalky, dusty |
| `02-joint-chamber` | Synovial amber, wet cyan, brass | Slippery, glossy but not plastic |
| `03-nerve-forest` | Deep teal, nerve yellow, electric cyan | Damp, humid, electrical |
| `04-muscle-effector` | Muscle pink, warm rust, bone | Fibrous, warm, taut |
| `05-reflex-core` | Bone white, danger pink, bright yellow | Spinal, bright core, high contrast |
| Silicon fixture | Graphite, cyan, bone | Clean-room, cold, no gore |

### 12.3 Naming pattern

Use the same ID grammar:

```text
bg.<level>.<layer>
sprite.agent.<cell>
sprite.scan.<concept>
sprite.gate.<level>
sprite.exit
sprite.checkpoint
sprite.prop.<name>
audio.cue.<event>
```

Do not invent new prefixes without updating the asset contract.

### 12.4 Do not start until

- the level exists in `public/packs/anatomy-reflex/levels/`;
- it passes `pack:validate`;
- it is in the capture list or GDD;
- its assets are declared in the pack/level;
- its IDs and file paths are agreed;
- its M2 puzzle design is implemented and frozen — see [`docs/m2/nervous-puzzles/`](../m2/nervous-puzzles/).

---

## 13. Open decisions

- [ ] Confirm M3 art target = `03-nerve-forest` only.
- [ ] Confirm P1 cyan / P2 muscle-pink accents.
- [ ] Confirm no animation work in M3.
- [ ] Confirm Ludo Indie ($20/mo), not Pro.
- [ ] Confirm skip of the eight deferred UI assets.
- [ ] Confirm whether `far`/`near` layers appear in the capture shot; if not, they can be cut.
- [ ] Confirm whether `sprite.checkpoint` or `sprite.gate.nerve` become visible before M3; if yes, add them to the scope.
- [ ] Confirm whether M2 implements Node Run in `03-nerve-forest`; if yes, re-baseline §5.3 before generating any puzzle prop art.

---

## 14. References

- [`base-game/implementation-plan.md`](../shrinkonauts/base-game/implementation-plan.md) — milestones, placeholder-first policy, cut lines.
- [`base-game/adr/0029-asset-provider-abstraction.md`](../shrinkonauts/base-game/adr/0029-asset-provider-abstraction.md) — logical asset IDs and provider chain.
- [`base-game/adr/0030-sprite-animation-format-policy.md`](../shrinkonauts/base-game/adr/0030-sprite-animation-format-policy.md) — format policy.
- [`base-game/adr/0031-layered-background-composition.md`](../shrinkonauts/base-game/adr/0031-layered-background-composition.md) — layered backgrounds.
- [`base-game/adr/0032-audio-cue-abstraction.md`](../shrinkonauts/base-game/adr/0032-audio-cue-abstraction.md) — audio cues.
- [`base-game/adr/0033-final-asset-integration-timing.md`](../shrinkonauts/base-game/adr/0033-final-asset-integration-timing.md) — late art pass, no code changes.
- [`base-game/contracts/pack-schema.md`](../shrinkonauts/base-game/contracts/pack-schema.md) — manifest, theme, licences.
- [`base-game/level-authoring.md`](../shrinkonauts/base-game/level-authoring.md) — level factory and asset rules.
- [`DESIGN.md`](../shrinkonauts/DESIGN.md) — world, suit, cells, tone, landmarks.
- [`learning-design-brief.md`](../shrinkonauts/learning-design-brief.md) — audience, accessibility, session length.
- [`base-game/cards/nervous/NERV-01-neuron-action-potential.md`](../shrinkonauts/base-game/cards/nervous/NERV-01-neuron-action-potential.md) — neuron visual anchors.
- [`base-game/cards/nervous/NERV-02-synapse.md`](../shrinkonauts/base-game/cards/nervous/NERV-02-synapse.md) — synapse visual anchors.
- [`base-game/cards/nervous/NERV-03-stretch-reflex.md`](../shrinkonauts/base-game/cards/nervous/NERV-03-stretch-reflex.md) — reflex arc visual anchors.
- [`docs/m2/nervous-puzzles/README.md`](../m2/nervous-puzzles/README.md) — M2 room matrix and puzzle design status.
- [`docs/m2/nervous-puzzles/03-nerve-forest.md`](../m2/nervous-puzzles/03-nerve-forest.md) — Node Run proposal that may replace the current ferry.
- [`docs/m2/nervous-puzzles/04-muscle-effector.md`](../m2/nervous-puzzles/04-muscle-effector.md) — Endplate Ferry proposal that inherits the ferry pattern.
- [`docs/m2/nervous-puzzles/01-bone-gate.md`](../m2/nervous-puzzles/01-bone-gate.md), [`02-joint-chamber.md`](../m2/nervous-puzzles/02-joint-chamber.md), [`05-reflex-core.md`](../m2/nervous-puzzles/05-reflex-core.md), [`silicon-fixture.md`](../m2/nervous-puzzles/silicon-fixture.md) — future level specs.
- [`assets.final.json`](../../public/packs/anatomy-reflex/assets.final.json) — current manifest.
- [`room.json`](../../public/packs/anatomy-reflex/levels/03-nerve-forest/room.json) — current room layers and entities.
- [`theme.json`](../../public/packs/anatomy-reflex/theme.json) — palette and UI asset IDs.

---

## 15. Change log

| Date | Change |
|---|---|
| 2026-10-27 | Initial M3 asset requirements, style bible, Ludo prompt pack, and scope contract. |

---

**End of document.**
