# M3 Asset Requirements — Shrinkonauts: The Reflex Arc

**Status:** Draft v0.2 · 29 October 2026  
**Owner:** Snorre  
**Scope:** Final 2D pixel art and audio for the M3 vertical slice  
**Target milestone:** M3 — Art/audio pass + capture (4–5 November 2026)  
**Governing decisions:** ADR-0029 (asset provider), ADR-0030 (sprite format), ADR-0031 (layered backgrounds), ADR-0032 (audio cues), ADR-0033 (final asset timing), ADR-0047 (pixel-art direction), ADR-0048 (2× pixel rendering), ADR-0049 (pixel UI chrome)  
**Related:** [`implementation-plan.md`](../shrinkonauts/base-game/implementation-plan.md) · [`contracts/pack-schema.md`](../shrinkonauts/base-game/contracts/pack-schema.md) · [`level-authoring.md`](../shrinkonauts/base-game/level-authoring.md) · [`DESIGN.md`](../shrinkonauts/DESIGN.md) · [`learning-design-brief.md`](../shrinkonauts/learning-design-brief.md) · [`cards/`](../shrinkonauts/base-game/cards/) · [`adr-m3/`](../adr-m3/README.md)

> **The rule for this milestone:** art follows the capture list, not the level list. M3 is not a five-level art production. It is one coherent vertical slice that appears in the 2-minute video, the GDD, and the playtest build.

> **Visual pivot (2026-10-29).** The project has moved from the hand-drawn “Dank Anatomy Cartoon” direction to **“Dank Anatomy Pixel Art”** across the world and the UI. The tone, palette identity, asset IDs, audio plan, and scope contract are unchanged. §4, §6, §7, §8, and ADR-0047–0049 replace the earlier hand-drawn rendering rules; ADR-0027 remains in force for licensing and audio.

---

## 0. Summary

| Decision | Value |
|---|---|
| Art scope | `03-nerve-forest` + shared kit |
| Visible images | **20** |
| Audio cues | **11** |
| Total M3 assets | **31** |
| Style | **Dank Anatomy Pixel Art** |
| Rendering | **Half-res source, 2× nearest-neighbour display** |
| Tool | **Ludo.ai concepts + Aseprite/Piskel pixel cleanup; Ludo.ai Audio Generator** |
| Ludo plan | **Indie, $20/mo** (Pro only if automation or scope grows) |
| Free-tier use | Six-asset concept/style gate only |
| Animation | **None** — the runtime renders single images |
| UI | **8-bit pixel chrome; Silkscreen + Pixelify Sans; badge is the only rendered UI image** |
| UI panels/portraits | **Deferred** — not rendered by the current UI |
| Music | **Deferred** — not played by the current runtime |
| Levels 01, 02, 04, 05, Silicon | **Deferred** — design proposals exist, but the pack content is not implemented |
| Content-freeze dependency | **Puzzle-specific props are blocked until M2 freezes the 03 puzzle** |

> **Content-freeze dependency.** This inventory is based on the current one-level build, which still uses `puzzle-ferry-01` in `03-nerve-forest`. The M2 design package proposes replacing it with **Node Run** and moving the ferry pattern to `04-muscle-effector` ([`docs/m2/nervous-puzzles/03-nerve-forest.md`](../m2/nervous-puzzles/03-nerve-forest.md), [`04-muscle-effector.md`](../m2/nervous-puzzles/04-muscle-effector.md)). If that redesign is implemented, the puzzle-specific props in this document will change. See §2.4 before generating gates, tracers, receptors, or pulse terminals.

---

## 1. Purpose

This document defines exactly what final pixel art and audio the M3 art pass requires, what the visual style is, how each asset is generated and cleaned up, and how the result is accepted. It exists to prevent six failure modes:

1. **Scope creep** — trying to art five levels plus a Silicon fixture.
2. **Style drift** — producing assets that do not share one pixel grid, palette, and silhouette language.
3. **Engine mismatch** — producing animated spritesheets, fractional scales, or UI skin assets the runtime cannot display cleanly.
4. **Faux-pixel output** — AI images with mixed pixel sizes, anti-aliased edges, or painterly detail pretending to be pixel art.
5. **Licensing ambiguity** — shipping AI-generated assets or fonts without a clear tool, plan, prompt, and licence record.
6. **Readability loss** — chunky pixels that stop reading at 28×44, 36×36, or 16 px UI text.

This is a production document, not a GDD. The game design source remains [`DESIGN.md`](../shrinkonauts/DESIGN.md); the learning contract remains [`learning-design-brief.md`](../shrinkonauts/learning-design-brief.md); the architecture remains the [`base-game/`](../shrinkonauts/base-game/) docs.

---

## 2. Scope contract

### 2.1 In scope for M3

| Category | Count | Notes |
|---|---:|---|
| Player sprites P1/P2 | 2 | Shared across all levels |
| Visible `03-nerve-forest` entity sprites | 12 | Agent, scans, gate, exit, props, receptors |
| `03-nerve-forest` background layers | 4 | Sky, far, mid, near |
| Shared tile texture | 1 | One 16×16 source tile displayed at 32×32 |
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
3. **No gameplay code changes.** ADR-0033 forbids mixing the art pass with gameplay changes. The pixel pivot needs a small, recorded render change (`pixelArt`, `antialias`, `roundPixels`, integer background scaling) under ADR-0048; nothing in `src/game`, `src/puzzle`, or the physics/runtime modules changes.
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

---

## 3. Runtime constraints that shape the art

These are current implementation facts plus the render changes recorded in ADR-0048. Sizes are exact; do not “fix” them in export.

| Constraint | Evidence | Consequence for M3 |
|---|---|---|
| Players are displayed at **28×44 px** | `src/world/physics.ts` (`PLAYER_WIDTH`, `PLAYER_HEIGHT`) | Author at **14×22**, displayed at 2×. Do not export 28×44 or the sprite will lose its chunky grid. |
| Entities are displayed at **36×36 px** | `src/world/room-scene.ts` (`ENTITY_SIZE = 36`) | Author at **18×18**, displayed at 2×. Design for 36 px readability. |
| The room uses a single tile displayed at **32×32** | `room.json` (`tileSize: 32`), `room-scene.ts` (`tileset`) | Author one seamless **16×16** tile, displayed at 2×. Not a tile atlas. |
| Background far/mid/near use `fit: "tile"` | `room.json`, `src/world/background.ts` (`TileSprite`) | Author **1024×512** with a 2×2 minimum cluster grid; tile 1:1. Avoid obvious repeated landmarks. |
| The sky uses `fit: "cover"` | `src/world/background.ts` | Author **640×368**, displayed at an integer 2×. The current `coverScale * 1.4` path must be replaced by integer cover (ADR-0048). |
| The renderer is currently smooth-scaled | `src/world/create-game.ts` (`pixelArt: false`, `antialias: true`) | Target config: `pixelArt: true`, `antialias: false`, `roundPixels: true`. |
| Spritesheets are loaded but not animated | `room-scene.ts` loads `type: "sheet"` but creates `this.add.image(...)`; no `this.anims.create(...)` | Use static `sprite` entries and single PNG/WebP images. |
| Only the badge UI asset is rendered | `src/ui/hud.ts` (`styleBadge`) and `src/game/boot.ts` | Author `ui.icon.badge` at **16×16**, displayed at 32×32. Skip the other UI assets. |
| Capture mode is deferred | `IMPLEMENTATION.md` status table | Clean 16:9 capture is an M2/M3 engine task; do not assume `?capture=1` exists. |
| Music playback is deferred | `IMPLEMENTATION.md` status table | Do not generate a music loop for M3. |
| No web font is loaded today | `index.html`, `theme.json` | The pixel UI pass must bundle **Silkscreen** and **Pixelify Sans** (OFL) and register them through `@font-face`; no external font CDN. |
| The canvas is fixed at **1280×720** and FIT-scaled | `src/world/create-game.ts` (`VIEWPORT`) | Capture at 1280×720. Add `image-rendering: pixelated` to the canvas for larger browser windows. |

---

## 4. Art direction: “Dank Anatomy Pixel Art”

### 4.1 One-line direction

**A grimy, gross-cute pixel-art biology world: chunky 2× pixel clusters, damp membrane dithering, deadpan cell workers, and a tiny scuffed astronaut who is very tired of being inside somebody.**

### 4.2 Visual pillars

1. **Pixel-first 2D** — native pixel grid, hard square pixels, 1px dark teal-brown outlines at source resolution, no anti-aliasing.
2. **Chunky but textured** — three-step colour ramps, 50% dither for damp and grimy surfaces, minimum 2×2 colour blocks at display size.
3. **Damp and grimy** — membrane sheen, condensation, dust, mineral grit, scuffed suit, discoloured tissue; built from dither and palette, never from gradients.
4. **Gross-cute, not edgy** — weird, fleshy, and funny; never gory, never shock humour.
5. **Readable at actual size** — 28×44 player, 36×36 entities, 32×32 tile. Silhouette first; no fine detail.
6. **Body as a workplace** — cells are tired workers with jobs, not monsters.
7. **Side-view platformer** — characters in side or slight 3/4 view; backgrounds orthographic side view.
8. **Chunky silhouette, not copied content** — big head/helmet, short body, chunky boots, strong outline. No copied characters, no top-down perspective, no religious horror, no gore.

### 4.3 Palette

Eight hue families, each with a shadow/base/highlight ramp. Every pixel comes from this table.

| Family | Shadow | Base | Highlight | Use |
|---|---|---|---|---|
| Teal | `#05090b` | `#101a20` | `#1d2f38` | Shadows, background depth, outlines |
| Bone | `#c9b79a` | `#f2e8d5` | `#fff8e8` | Suit, bone, highlights |
| Bone shadow | `#5f736e` | `#7a8f8a` | `#9db4ad` | Secondary bone, dust |
| Nerve | `#b8862b` | `#ffd166` | `#fff3b0` | Signals, key light, pickups |
| Joint | `#3f9fb5` | `#7bdff2` | `#c9f7ff` | P1 accents, scan UI, cool rim |
| Muscle | `#a82a4a` | `#ef476f` | `#ff9fb2` | P2 accents, muscle, danger |
| Sage | `#6f847d` | `#9db4ad` | `#c4d4ce` | Muted tissue, secondary text |
| Ink | `#000000` | `#05090b` | `#2a3f47` | Outlines, deepest shadow |

Rules:

- Use the ramp steps only. Do not introduce purple, neon green, orange, pure red, or intermediate blends.
- Dither with adjacent ramp steps, never with a new colour.
- Black/white only for tiny alpha edges.
- The UI uses the same palette through the theme tokens; no pack-specific CSS.

### 4.4 Character rules

- **Player:** bulky retro-futuristic life-support suit; cream/bone shell; dark teal joints; round helmet with warm amber visor; yellow backpack tanks; cyan chest light; scanner gauntlet; short legs; big boots; scuffed and patched. No visible face. No sleek armour. No shiny plastic.
- **Player pixel build:** 14×22 source grid; 1px outline; helmet 7–8 px across; visor 3–4 px; torso 8–10 px wide; boots 3 px; backpack 4×6 px; scanner gauntlet 2×2 px. The silhouette must read at 28×44.
- **P1/P2 differentiation:** P1 uses joint-cyan accents; P2 uses muscle-pink accents. Keep the silhouette identical.
- **Cells:** characters first, diagrams second. Big expressive eyes built from 2×2 blocks, simple body, tiny 1–2 px limbs, one job prop, one personality prop. No human faces, no sexualised cells, no gore.
- **Cell colour families:** neuron = nerve/bone; osteocyte = bone/dust; synoviocyte = amber/cyan; muscle effector = muscle/rust; reflex core = bone/danger pink; Silicon = graphite/cyan.
- **Props:** 18×18 source grid; strong iconic silhouette; 1px dashed cyan scan rim for scannable objects; nerve-yellow core for interactables.
- **No text on any sprite.** Labels and numbers are UI, not art.

### 4.5 Environment rules

- The body is a **landscape**, not a cutaway textbook diagram. Anatomy is architecture: nerve bundles as trees, myelin as bark, synapses as lanterns, bone as cliffs, cartilage as glass, membranes as wet fabric.
- **Damp, humid, breathing.** Build condensation, sheen, dust, and membrane folds from dither patterns; no smooth gradients.
- **Dark enough for HUD.** Keep the centre and lower third of the sky relatively dark so the yellow/cyan HUD and player silhouettes read.
- **No labels, arrows, or diagram lines.** The scan system supplies meaning.
- **Layered depth:** far = large slow shapes; mid = branching structures; near = dark framing silhouettes with large transparent gaps.
- **Tileable layers:** far/mid/near must repeat without a visible seam or obvious focal object. Author at 1024×512 with 2×2 minimum clusters; the runtime tiles them 1:1.
- **Integer sky:** author at 640×368; the runtime displays it at an exact 2× cover. No fractional scaling.

### 4.6 Tone guard

**Allowed:** damp, grimy, scuffed, dusty, wry, tired, fussy, weird, fleshy, cosy-catastrophe.

**Not allowed:** blood, open wounds, exposed viscera, gore, dead characters, religious horror, toilet humour, sexual content, swearing in art, shock-value body horror.

The body is a **workplace**, not a slaughterhouse. The humour comes from fussy cells and a tiny astronaut who has had enough, not from gross-out shock.

### 4.7 References and non-references

Internal references, for the team only (not for prompts):

- *The Binding of Isaac* — chunky silhouettes, big heads, darkly funny world, limited palette. Silhouette and tone, not rendering.
- *Don’t Starve* — scratchy, grim handmade texture. Translate the grime into dither, not line work.
- *Celeste* — readable silhouettes and disciplined palettes at small sprite sizes.
- *Hyper Light Drifter* — ramp discipline and dithering.
- *Dead Cells* — dense pixel detail; a warning about over-detail, not a target.
- *Osmosis Jones* — inside-body premise, but cleaner and more literal than this game.
- *Hollow Knight* — layered atmospheric background depth.
- *The Maw* — gross-cute creature design.

Do not put living artists’ names or copyrighted character names into Ludo prompts. Use the descriptive style block instead.

### 4.8 Do / do not

| Do | Do not |
|---|---|
| Use 1px source outlines and hard pixel edges | Use anti-aliasing, soft vector lines, or blurry edges |
| Use three-step ramps and 50% dither | Use smooth gradients, 3D shading, or glossy plastic |
| Make silhouettes readable at 28–44 px | Add fine detail, fingers, lace, or tiny text |
| Use the eight ramp families only | Introduce neon, purple, orange, pure red, or mixed pixel sizes |
| Make cells look like tired workers | Make cells look like monsters or gore |
| Use damp membrane dither and grime | Use blood, wounds, or exposed organs |
| Keep the suit scuffed and practical | Make it sleek, shiny, or Iron Man-like |
| Generate on a plain magenta field and remove it | Ask for a transparent checkerboard or a scene background |

### 4.9 Per-level colour scripts

These are for future levels. **Do not generate them until the level is authored and in the capture list.** All shifts use the ramps in §4.3.

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

| Asset ID | Type | Display size | Source/export | File path | Priority |
|---|---|---:|---:|---|---|
| `sprite.player.p1` | sprite | 28×44 | 14×22 PNG | `shared/sprites/player-p1.png` | P0 |
| `sprite.player.p2` | sprite | 28×44 | 14×22 PNG | `shared/sprites/player-p2.png` | P0 |
| `tileset.anatomy` | image | 32×32 tile | 16×16 PNG | `shared/tilesets/anatomy.png` | P1 |
| `ui.icon.badge` | image | 32×32 HUD stamp | 16×16 PNG | `shared/ui/badge.png` | P2 |

> **Pixel rule:** author at the source size shown here. The game displays players, entities, and tiles at exactly 2× with nearest-neighbour scaling. Exporting at the display size produces a finer, inconsistent grid.

### 5.3 `03-nerve-forest` visible entities

> **Assumption:** the current `puzzle-ferry-01` layout remains in `03-nerve-forest`. If M2 implements Node Run, the gate/tracer/pulse/receptor rows in this table are provisional and must be replaced with the frozen room’s entities.

| Asset ID | Entity role | Display size | Source/export | File path | Priority |
|---|---|---:|---:|---|---|
| `sprite.agent.neuron` | Neuron Keeper | 36×36 | 18×18 PNG | `shared/sprites/agent-neuron.png` | P0 |
| `sprite.scan.neuron` | Scan target | 36×36 | 18×18 PNG | `shared/sprites/scan-neuron.png` | P0 |
| `sprite.scan.synapse` | Scan target | 36×36 | 18×18 PNG | `shared/sprites/scan-synapse.png` | P1 |
| `sprite.scan.pathway` | Scan target | 36×36 | 18×18 PNG | `shared/sprites/scan-pathway.png` | P1 |
| `sprite.scan.muscle` | Scan target | 36×36 | 18×18 PNG | `shared/sprites/scan-muscle.png` | P1 |
| `sprite.scan.reflex` | Scan target | 36×36 | 18×18 PNG | `shared/sprites/scan-reflex.png` | P1 |
| `sprite.gate.ferry` | Puzzle gate | 36×36 | 18×18 PNG | `shared/sprites/gate-ferry.png` | P0 |
| `sprite.exit` | Level exit | 36×36 | 18×18 PNG | `shared/sprites/exit.png` | P1 |
| `sprite.prop.tracer` | Carry prop | 36×36 | 18×18 PNG | `shared/sprites/prop-tracer.png` | P1 |
| `sprite.pulse.terminal` | Pulse source | 36×36 | 18×18 PNG | `shared/sprites/pulse-terminal.png` | P1 |
| `sprite.receptor.triangle` | Receptor A | 36×36 | 18×18 PNG | `shared/sprites/receptor-triangle.png` | P1 |
| `sprite.receptor.circle` | Receptor B | 36×36 | 18×18 PNG | `shared/sprites/receptor-circle.png` | P1 |

### 5.4 Backgrounds

| Asset ID | Ludo type | Source/export | File path | Priority |
|---|---|---|---|---|
| `bg.nerve_forest.sky` | Background | 640×368 WebP/PNG, integer 2× cover | `shared/backgrounds/nerve-forest-sky.webp` | P0 |
| `bg.nerve_forest.far` | Parallax layer | 1024×512 PNG/WebP, transparent, 2×2 clusters | `shared/backgrounds/nerve-forest-far.webp` | P1 |
| `bg.nerve_forest.mid` | Parallax layer | 1024×512 PNG/WebP, transparent, 2×2 clusters | `shared/backgrounds/nerve-forest-mid.webp` | P0 |
| `bg.nerve_forest.near` | Parallax layer | 1024×512 PNG/WebP, transparent, 2×2 clusters | `shared/backgrounds/nerve-forest-near.webp` | P1 |

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

These remain declared placeholders in `assets.final.json`. Do not generate them in M3. When they are generated later, they use the pixel UI language in ADR-0049: 16×16 or 32×32 icons, 9-slice pixel panels, no anti-aliasing.

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

| Asset type | Author/source | Runtime display | Scale | Format |
|---|---|---|---|---|
| Player | 14×22 | 28×44 | 2× | PNG with alpha |
| Entity | 18×18 | 36×36 | 2× | PNG with alpha |
| Background sky | 640×368 | 1280×736 cover | 2× | lossless WebP or PNG |
| Parallax layer | 1024×512, 2×2 clusters | tile | 1:1 | lossless WebP or PNG with alpha |
| Tile | 16×16 | 32×32 | 2× | PNG or lossless WebP |
| Badge | 16×16 | 32×32 HUD stamp | 2× | PNG with alpha |
| Audio | 48 kHz | — | — | OGG or MP3 |

Do not export upscaled 2× or 4× versions. The engine performs the 2× nearest-neighbour display. Do not use JPG or lossy WebP for pixel art; lossy compression creates colour noise that breaks the palette.

### 6.2 Alpha and trimming

1. Generate the concept on flat magenta `#FF00FF`.
2. Pixel at the source size in Aseprite, Piskel, or LibreSprite.
3. Remove the background; inspect edges at 400% and remove magenta fringe.
4. Trim to the alpha bounding box.
5. Pad to the fixed source canvas:
   - Player: 14×22, feet at the bottom, 0–1 px transparent margin.
   - Entity: 18×18, centred, 1 px margin.
   - Tile: 16×16, full bleed.
   - Badge: 16×16, centred, 1 px margin.
6. Do not bake drop shadows or ground shadows. The engine adds its own shadow/glow.

> **Critical:** author the player at **14×22**, not 28×44. The engine sets the texture to 28×44, so a 14×22 source displays at exactly 2×. A 28×44 source displays 1:1 and looks half as chunky as the rest of the world.

### 6.3 Pixel grid rules

- One source pixel becomes a **2×2 display block** for players, entities, tiles, the sky, and the badge.
- Parallax layers are authored 1:1, so every colour block must be at least **2×2 pixels** to match the effective density.
- A 1 px source outline becomes a 2 px outline on screen.
- No anti-aliasing, no soft edges, no semi-transparent fringe on sprites. Alpha is 0 or 255 except for intentional UI/engine effects.
- Every pixel comes from the ramps in §4.3. Quantise after any resampling; never resample with bilinear filtering.
- No fractional scaling, rotation, or sub-pixel placement inside an exported asset.
- Do not mix pixel densities within one asset or across the kit.

### 6.4 Tileability

- The tile is a single 16×16 source, displayed at 32×32. It must tile on all four sides.
- Far/mid/near are 1024×512 with 2×2 minimum clusters. They must tile horizontally and vertically in Phaser’s `TileSprite`.
- Verify with a 2×2 repeat at 1280×720, not by looking at one image.
- Avoid a single strong landmark that repeats obviously.
- Keep large transparent gaps in the near layer so the room remains playable.
- The sky is 640×368 and displayed at an exact 2× cover. The 16:9 capture crops the extra 16 px of height.

### 6.5 Anchors and padding

- Player origin is bottom-centre; feet must sit at the bottom of the 14×22 alpha box.
- Entity origin is bottom-centre; the base of the object must sit at the bottom of the 18×18 alpha box.
- Keep a consistent baseline across scan targets and receptors.
- Do not add an artificial pedestal or ground line.

### 6.6 Budgets

These are project budgets, not engine limits. Pixel art compresses well; a larger file usually means the grid or palette is wrong.

| Asset | Budget |
|---|---|
| Player PNG | ≤ 16 KB each |
| Entity PNG | ≤ 16 KB each |
| Background sky | ≤ 300 KB |
| Parallax layer | ≤ 300 KB each |
| Tile | ≤ 8 KB |
| Badge | ≤ 8 KB |
| Audio cue | ≤ 120 KB each |
| Total visual assets | ≤ 6 MB |

If an asset exceeds budget, check the source size and palette first; do not downscale a pixel asset with a smooth filter.

### 6.7 Manifest types

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

## 7. Pixel workflow

### 7.1 Tool split

- **Ludo.ai → Image Generator** for concepts, silhouettes, and reference. Ludo is not the final pixel renderer.
- **Aseprite, Piskel, or LibreSprite** for the final pixel pass at source size.
- **Ludo.ai → Audio Generator** for the 11 SFX.
- Start on the **free tier** for the six-asset concept/style gate.
- Buy **Indie ($20/mo)** for production. Do not buy Pro unless you need API/MCP/CLI or the scope grows beyond this document.
- Do not buy annual billing for a short art pass.

### 7.2 Settings

| Setting | Value |
|---|---|
| Asset type | Sprite / Background / Parallax layer / Texture / Icon, as appropriate |
| Style | Pixel art: hard edges, limited palette, 1px outlines, no anti-aliasing |
| Reference | `style-anchor-p1.png` after P1 is pixel-cleaned |
| Variations | 4 per prompt |
| Resolution | 1024 px on the long edge for concepts; final art authored at source size |
| Aspect | 1:1 sprites/props/tile/badge; wide sky; 2:1 parallax |
| Background | Flat magenta `#FF00FF` |
| Negative prompt | Use the block in §8.3 if the field exists; otherwise append it to the prompt |

If Ludo’s UI labels differ, map to the closest equivalent. The prompt blocks are the source of truth for the concept; the pixel pass is the source of truth for the final asset.

### 7.3 Style anchor

1. Generate **P1** first, four concepts.
2. Pick the one that reads best as a 14×22 silhouette and matches the palette.
3. Pixel-clean it at 14×22 in Aseprite/Piskel.
4. Approve it at 28×44 on a dark teal background.
5. Save it as `style-anchor-p1.png`; keep a 4× nearest-neighbour preview for review.
6. Use it as the style/reference image for every later character, prop, and icon.
7. Use the approved **sky** as the style reference for backgrounds if Ludo allows a second reference; otherwise keep the style block identical.
8. Do not use P1 as an image-to-image base for NPCs — it may copy the astronaut. Use it as a style reference only.

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

Generate and pixel-clean exactly these six assets:

1. `sprite.player.p1`
2. `sprite.agent.neuron`
3. `sprite.scan.neuron`
4. `sprite.exit`
5. `bg.nerve_forest.sky`
6. `bg.nerve_forest.mid`

**Pass criteria**

- Player silhouette reads at 28×44 on a dark teal background; source is 14×22.
- NPC and scan target read at 36×36; source is 18×18.
- Every source pixel is a hard square; no anti-aliasing, blur, or mixed pixel sizes.
- Palette stays within the ramp table; no intermediate blends.
- 1 px source outline is consistent across all six.
- Tone is gross-cute, not gory or shock-humour.
- Sky displays at an exact integer scale and has dark areas for HUD.
- Mid layer tiles seamlessly in a 2×2 preview; every colour block is at least 2×2 px.
- Alpha is clean, with no magenta fringe.

If four of six pass, proceed. If not, revise the style anchor or palette and rerun the six. Do not “fix it later” across 20 assets.

### 7.6 Per-asset loop

1. Copy the complete prompt for the asset from §8. It already contains the style block, the asset text, and the frame block.
2. Generate four concepts.
3. Pick the best; download the full-resolution concept.
4. Pixel the asset at source size in Aseprite/Piskel: 14×22 player, 18×18 entity, 16×16 tile/badge, 640×368 sky, 1024×512 parallax.
5. Quantise to the ramp palette; remove anti-aliasing; enforce the 2×2 cluster rule on 1:1 layers.
6. Export at source size; inspect at 400%.
7. Check at display size on a dark teal contact sheet.
8. Record the prompt, concept file, pixel-cleanup notes, palette, and chosen file in the prompt log.
9. If it fails, change one variable (prompt phrase, reference, or cleanup step), not five.
10. Stop after three attempts; use a placeholder if still failing.

### 7.7 Stop rules

- Maximum **three attempts** per asset on free tier; maximum **two prompt revisions** per asset on paid.
- If a whole category fails, stop and revise the style anchor, not individual assets.
- If the generator cannot produce a usable concept, trace or draw the asset manually at source size. Do not ship faux-pixel output.
- If an asset needs new rendering behaviour, stop; it is an engine task, not an art task (ADR-0048 records the only approved render changes).
- If the style gate fails, ship placeholders.

### 7.8 Review contact sheet

Create a 1280×720 dark teal contact sheet showing:

- P1 and P2 at 28×44.
- Each entity at 36×36.
- Sky at 1280×720.
- Mid layer tiled 3× across.
- Badge at 32×32.

Also inspect the source files at 400% for grid and palette errors. Review at 100% zoom, not on a large preview. If it does not read at actual size, it does not pass.

---

## 8. Copy-paste prompt pack

### 8.1 How to use this prompt pack

Every prompt in §§8.9–8.13 is **complete and self-contained**. It already contains, in this order:

```text
PIXEL STYLE + ASSET PROMPT + FRAME BLOCK
```

Ludo uses the block to generate a **concept**. The final asset is pixel-cleaned at source size in Aseprite, Piskel, or LibreSprite (§7). Copy one block into Ludo exactly as written. Do not assemble a prompt from parts, and never put two assets in one prompt.

Sections 8.2–8.8 hold the canonical wording of the shared blocks. They are reference only: the same text is repeated verbatim inside every prompt below, so each asset section can be used on its own. If a canonical block changes, re-copy it into every prompt that uses it — nothing here syncs automatically.

The NEGATIVE block (§8.3) is the one exception: it is not repeated inside the prompts. Use it only in Ludo’s negative-prompt field, or append it by hand when no negative field exists.

If Ludo provides separate fields for style, negative prompt, and reference image, use those fields instead of pasting the combined block. The blocks are written for a single prompt field.

### 8.2 PIXEL STYLE — canonical block

Repeated verbatim at the start of every image prompt in §§8.9–8.12.

```text
Pixel art for a side-view 2D platformer set inside a living human body. Native pixel grid, hard square pixels, crisp edges, no anti-aliasing, no smoothing, no mixed pixel sizes. 1px dark teal-brown outlines at source resolution; flat fills from three-step colour ramps; 50% dither for damp membrane sheen, condensation, dust and grime. Gross-cute biology, wry deadpan tone, weird and fleshy but 12+ friendly: never gory, no shock humor. Palette ramps: teal #05090b #101a20 #1d2f38; bone #c9b79a #f2e8d5 #fff8e8; bone shadow #5f736e #7a8f8a #9db4ad; nerve #b8862b #ffd166 #fff3b0; joint #3f9fb5 #7bdff2 #c9f7ff; muscle #a82a4a #ef476f #ff9fb2; sage #6f847d #9db4ad #c4d4ce; ink #000000 #05090b #2a3f47. Strong readable shapes; characters and props must read at 28×44 and 36×36. Side view or slight 3/4 view. No text, no logo, no watermark, no border, no UI, no photorealism, no 3D, no painterly rendering, no smooth gradients, no anti-aliasing, no high-res detail, no faux-pixel mixed grids, no blood, no gore, no open wounds, no extra limbs, no detailed fingers, no baked drop shadow, no ground shadow.
```

### 8.3 NEGATIVE — negative-prompt field only

Not included in the prompts below. Paste it into Ludo’s negative-prompt field if one exists.

```text
text, logo, watermark, border, UI, labels, arrows, diagram, anti-aliasing, smooth gradient, painterly, 3D render, photorealism, anime, clean vector, high-res detail, mixed pixel sizes, faux pixel art, blurry edges, neon cyberpunk, purple, neon green, blood, gore, open wound, viscera, exposed organs, extra limbs, detailed fingers, baked shadow, ground shadow, checkerboard transparency, multiple characters, scene background
```

### 8.4 SPRITE FRAME — canonical block

Used by the player prompts (§8.9) and entity prompts (§8.10).

```text
Full subject, centered, generous margin, feet or base at the bottom, isolated on a flat solid magenta #FF00FF background, no cast shadow, no ground, no scene, no frame. Keep every pixel a hard square; no anti-aliasing.
```

### 8.5 BACKGROUND FRAME — canonical block

Used by the sky prompt (§8.11.1).

```text
Wide cinematic composition, no characters, no text, no UI, no border, no frame, no logo. Keep the center and lower third dark enough for HUD and player silhouettes. Hard pixel edges only; no anti-aliasing, no smooth gradients.
```

### 8.6 PARALLAX FRAME — canonical block

Used by the far, mid and near prompts (§8.11.2–8.11.4).

```text
Seamless parallax layer, transparent background, edges match on all four sides, flat orthographic side view, no characters, no text, no border, no unique focal object, no ground line. Every colour block at least 2×2 pixels at export size; hard edges, no anti-aliasing.
```

### 8.7 TILE FRAME — canonical block

Used by the tile prompt (§8.12.1).

```text
Seamless tile; edges match on all four sides; flat orthographic view; no text, no border, no unique focal object; hard pixel edges, no anti-aliasing.
```

### 8.8 ICON FRAME — canonical block

Used by the badge prompt (§8.12.2). `SPRITE FRAME` asks for feet or a base at the bottom, which does not apply to a mission patch.

```text
Centered icon, generous margin, isolated on a solid flat magenta #FF00FF background, no cast shadow, no scene, no frame; hard pixel edges, no anti-aliasing.
```

### 8.9 Player prompts

Shared across every level. P1 is the style anchor: generate it first, pixel-clean it at 14×22, approve it at 28×44, and use the approved file as the style reference for every later asset.

#### 8.9.1 `sprite.player.p1` — style anchor

**Ludo:** Sprite · **Display:** 28×44 px · **Source:** 14×22 PNG, alpha
**File:** `shared/sprites/player-p1.png` · **Batch:** 0 (style anchor)

```text
Pixel art for a side-view 2D platformer set inside a living human body. Native pixel grid, hard square pixels, crisp edges, no anti-aliasing, no smoothing, no mixed pixel sizes. 1px dark teal-brown outlines at source resolution; flat fills from three-step colour ramps; 50% dither for damp membrane sheen, condensation, dust and grime. Gross-cute biology, wry deadpan tone, weird and fleshy but 12+ friendly: never gory, no shock humor. Palette ramps: teal #05090b #101a20 #1d2f38; bone #c9b79a #f2e8d5 #fff8e8; bone shadow #5f736e #7a8f8a #9db4ad; nerve #b8862b #ffd166 #fff3b0; joint #3f9fb5 #7bdff2 #c9f7ff; muscle #a82a4a #ef476f #ff9fb2; sage #6f847d #9db4ad #c4d4ce; ink #000000 #05090b #2a3f47. Strong readable shapes; characters and props must read at 28×44 and 36×36. Side view or slight 3/4 view. No text, no logo, no watermark, no border, no UI, no photorealism, no 3D, no painterly rendering, no smooth gradients, no anti-aliasing, no high-res detail, no faux-pixel mixed grids, no blood, no gore, no open wounds, no extra limbs, no detailed fingers, no baked drop shadow, no ground shadow.

Full-body pixel-art player character sprite designed on a 14×22 source grid: a tiny Shrinkonaut astronaut in a bulky retro-futuristic life-support suit. Round helmet with a warm amber visor, cream bone-colored suit, dark teal joints, cyan chest light, yellow backpack tanks, scuffed and grimy, short legs, big boots, one scanner gauntlet. Neutral side-view idle pose, facing right, strong silhouette. The silhouette must read at 28×44 pixels.

Full subject, centered, generous margin, feet or base at the bottom, isolated on a flat solid magenta #FF00FF background, no cast shadow, no ground, no scene, no frame. Keep every pixel a hard square; no anti-aliasing.
```

#### 8.9.2 `sprite.player.p2` — player 2

**Ludo:** Sprite · **Display:** 28×44 px · **Source:** 14×22 PNG, alpha
**File:** `shared/sprites/player-p2.png` · **Batch:** 1

```text
Pixel art for a side-view 2D platformer set inside a living human body. Native pixel grid, hard square pixels, crisp edges, no anti-aliasing, no smoothing, no mixed pixel sizes. 1px dark teal-brown outlines at source resolution; flat fills from three-step colour ramps; 50% dither for damp membrane sheen, condensation, dust and grime. Gross-cute biology, wry deadpan tone, weird and fleshy but 12+ friendly: never gory, no shock humor. Palette ramps: teal #05090b #101a20 #1d2f38; bone #c9b79a #f2e8d5 #fff8e8; bone shadow #5f736e #7a8f8a #9db4ad; nerve #b8862b #ffd166 #fff3b0; joint #3f9fb5 #7bdff2 #c9f7ff; muscle #a82a4a #ef476f #ff9fb2; sage #6f847d #9db4ad #c4d4ce; ink #000000 #05090b #2a3f47. Strong readable shapes; characters and props must read at 28×44 and 36×36. Side view or slight 3/4 view. No text, no logo, no watermark, no border, no UI, no photorealism, no 3D, no painterly rendering, no smooth gradients, no anti-aliasing, no high-res detail, no faux-pixel mixed grids, no blood, no gore, no open wounds, no extra limbs, no detailed fingers, no baked drop shadow, no ground shadow.

Same Shrinkonaut as the style reference, identical silhouette and pose, swap the cyan accents for muscle-pink #ef476f: pink chest light, pink shoulder pads, pink visor trim. Keep the suit cream, teal joints, yellow tanks, grime and outline style identical. Pixel-art sprite designed on a 14×22 source grid; readable at 28×44.

Full subject, centered, generous margin, feet or base at the bottom, isolated on a flat solid magenta #FF00FF background, no cast shadow, no ground, no scene, no frame. Keep every pixel a hard square; no anti-aliasing.
```

### 8.10 Entity prompts

All `03-nerve-forest` entity sprites display at 36×36 from an 18×18 source. Generate the Batch 1 assets first; the status lines flag the assets that depend on the M2 content freeze (§2.4).

#### 8.10.1 `sprite.agent.neuron` — Neuron Keeper

**Ludo:** Sprite · **Display:** 36×36 px · **Source:** 18×18 PNG, alpha
**File:** `shared/sprites/agent-neuron.png` · **Batch:** 1 · **Status:** Re-check against the frozen scan list before final sign-off.

```text
Pixel art for a side-view 2D platformer set inside a living human body. Native pixel grid, hard square pixels, crisp edges, no anti-aliasing, no smoothing, no mixed pixel sizes. 1px dark teal-brown outlines at source resolution; flat fills from three-step colour ramps; 50% dither for damp membrane sheen, condensation, dust and grime. Gross-cute biology, wry deadpan tone, weird and fleshy but 12+ friendly: never gory, no shock humor. Palette ramps: teal #05090b #101a20 #1d2f38; bone #c9b79a #f2e8d5 #fff8e8; bone shadow #5f736e #7a8f8a #9db4ad; nerve #b8862b #ffd166 #fff3b0; joint #3f9fb5 #7bdff2 #c9f7ff; muscle #a82a4a #ef476f #ff9fb2; sage #6f847d #9db4ad #c4d4ce; ink #000000 #05090b #2a3f47. Strong readable shapes; characters and props must read at 28×44 and 36×36. Side view or slight 3/4 view. No text, no logo, no watermark, no border, no UI, no photorealism, no 3D, no painterly rendering, no smooth gradients, no anti-aliasing, no high-res detail, no faux-pixel mixed grids, no blood, no gore, no open wounds, no extra limbs, no detailed fingers, no baked drop shadow, no ground shadow.

Pixel-art character sprite designed on an 18×18 source grid: a friendly frazzled neuron cell character, the Neuron Keeper: plump bone-cream cell body with a dark nucleus-shaped core, big expressive eyes, dendrite hair, a long myelinated axon scarf, tiny hands, holding a glowing yellow signal lantern. Slight 3/4 side view, expressive but readable at 36px.

Full subject, centered, generous margin, feet or base at the bottom, isolated on a flat solid magenta #FF00FF background, no cast shadow, no ground, no scene, no frame. Keep every pixel a hard square; no anti-aliasing.
```

#### 8.10.2 `sprite.scan.neuron` — scan target: neuron

**Ludo:** Sprite · **Display:** 36×36 px · **Source:** 18×18 PNG, alpha
**File:** `shared/sprites/scan-neuron.png` · **Batch:** 1 · **Status:** Re-check against the frozen scan list before final sign-off.

```text
Pixel art for a side-view 2D platformer set inside a living human body. Native pixel grid, hard square pixels, crisp edges, no anti-aliasing, no smoothing, no mixed pixel sizes. 1px dark teal-brown outlines at source resolution; flat fills from three-step colour ramps; 50% dither for damp membrane sheen, condensation, dust and grime. Gross-cute biology, wry deadpan tone, weird and fleshy but 12+ friendly: never gory, no shock humor. Palette ramps: teal #05090b #101a20 #1d2f38; bone #c9b79a #f2e8d5 #fff8e8; bone shadow #5f736e #7a8f8a #9db4ad; nerve #b8862b #ffd166 #fff3b0; joint #3f9fb5 #7bdff2 #c9f7ff; muscle #a82a4a #ef476f #ff9fb2; sage #6f847d #9db4ad #c4d4ce; ink #000000 #05090b #2a3f47. Strong readable shapes; characters and props must read at 28×44 and 36×36. Side view or slight 3/4 view. No text, no logo, no watermark, no border, no UI, no photorealism, no 3D, no painterly rendering, no smooth gradients, no anti-aliasing, no high-res detail, no faux-pixel mixed grids, no blood, no gore, no open wounds, no extra limbs, no detailed fingers, no baked drop shadow, no ground shadow.

Pixel-art scan-target prop designed on an 18×18 source grid: a single neuron with branching dendrites, a plump soma, and a long myelinated axon, glowing 1px cyan scan rim, nerve-yellow core, strong iconic silhouette.

Full subject, centered, generous margin, feet or base at the bottom, isolated on a flat solid magenta #FF00FF background, no cast shadow, no ground, no scene, no frame. Keep every pixel a hard square; no anti-aliasing.
```

#### 8.10.3 `sprite.scan.synapse` — scan target: synapse

**Ludo:** Sprite · **Display:** 36×36 px · **Source:** 18×18 PNG, alpha
**File:** `shared/sprites/scan-synapse.png` · **Batch:** 3 · **Status:** Blocked until the M2 scan list freezes (§2.4).

```text
Pixel art for a side-view 2D platformer set inside a living human body. Native pixel grid, hard square pixels, crisp edges, no anti-aliasing, no smoothing, no mixed pixel sizes. 1px dark teal-brown outlines at source resolution; flat fills from three-step colour ramps; 50% dither for damp membrane sheen, condensation, dust and grime. Gross-cute biology, wry deadpan tone, weird and fleshy but 12+ friendly: never gory, no shock humor. Palette ramps: teal #05090b #101a20 #1d2f38; bone #c9b79a #f2e8d5 #fff8e8; bone shadow #5f736e #7a8f8a #9db4ad; nerve #b8862b #ffd166 #fff3b0; joint #3f9fb5 #7bdff2 #c9f7ff; muscle #a82a4a #ef476f #ff9fb2; sage #6f847d #9db4ad #c4d4ce; ink #000000 #05090b #2a3f47. Strong readable shapes; characters and props must read at 28×44 and 36×36. Side view or slight 3/4 view. No text, no logo, no watermark, no border, no UI, no photorealism, no 3D, no painterly rendering, no smooth gradients, no anti-aliasing, no high-res detail, no faux-pixel mixed grids, no blood, no gore, no open wounds, no extra limbs, no detailed fingers, no baked drop shadow, no ground shadow.

Pixel-art scan-target prop designed on an 18×18 source grid: two nerve terminals facing across a wet synaptic cleft, glowing vesicles in the gap, 1px cyan scan rim, nerve-yellow core.

Full subject, centered, generous margin, feet or base at the bottom, isolated on a flat solid magenta #FF00FF background, no cast shadow, no ground, no scene, no frame. Keep every pixel a hard square; no anti-aliasing.
```

#### 8.10.4 `sprite.scan.pathway` — scan target: pathway

**Ludo:** Sprite · **Display:** 36×36 px · **Source:** 18×18 PNG, alpha
**File:** `shared/sprites/scan-pathway.png` · **Batch:** 3 · **Status:** Blocked until the M2 scan list freezes (§2.4).

```text
Pixel art for a side-view 2D platformer set inside a living human body. Native pixel grid, hard square pixels, crisp edges, no anti-aliasing, no smoothing, no mixed pixel sizes. 1px dark teal-brown outlines at source resolution; flat fills from three-step colour ramps; 50% dither for damp membrane sheen, condensation, dust and grime. Gross-cute biology, wry deadpan tone, weird and fleshy but 12+ friendly: never gory, no shock humor. Palette ramps: teal #05090b #101a20 #1d2f38; bone #c9b79a #f2e8d5 #fff8e8; bone shadow #5f736e #7a8f8a #9db4ad; nerve #b8862b #ffd166 #fff3b0; joint #3f9fb5 #7bdff2 #c9f7ff; muscle #a82a4a #ef476f #ff9fb2; sage #6f847d #9db4ad #c4d4ce; ink #000000 #05090b #2a3f47. Strong readable shapes; characters and props must read at 28×44 and 36×36. Side view or slight 3/4 view. No text, no logo, no watermark, no border, no UI, no photorealism, no 3D, no painterly rendering, no smooth gradients, no anti-aliasing, no high-res detail, no faux-pixel mixed grids, no blood, no gore, no open wounds, no extra limbs, no detailed fingers, no baked drop shadow, no ground shadow.

Pixel-art scan-target prop designed on an 18×18 source grid: a forked nerve pathway with a bright signal bead travelling along it, 1px cyan scan rim, nerve-yellow core.

Full subject, centered, generous margin, feet or base at the bottom, isolated on a flat solid magenta #FF00FF background, no cast shadow, no ground, no scene, no frame. Keep every pixel a hard square; no anti-aliasing.
```

#### 8.10.5 `sprite.scan.muscle` — scan target: muscle

**Ludo:** Sprite · **Display:** 36×36 px · **Source:** 18×18 PNG, alpha
**File:** `shared/sprites/scan-muscle.png` · **Batch:** 3 · **Status:** Blocked until the M2 scan list freezes (§2.4).

```text
Pixel art for a side-view 2D platformer set inside a living human body. Native pixel grid, hard square pixels, crisp edges, no anti-aliasing, no smoothing, no mixed pixel sizes. 1px dark teal-brown outlines at source resolution; flat fills from three-step colour ramps; 50% dither for damp membrane sheen, condensation, dust and grime. Gross-cute biology, wry deadpan tone, weird and fleshy but 12+ friendly: never gory, no shock humor. Palette ramps: teal #05090b #101a20 #1d2f38; bone #c9b79a #f2e8d5 #fff8e8; bone shadow #5f736e #7a8f8a #9db4ad; nerve #b8862b #ffd166 #fff3b0; joint #3f9fb5 #7bdff2 #c9f7ff; muscle #a82a4a #ef476f #ff9fb2; sage #6f847d #9db4ad #c4d4ce; ink #000000 #05090b #2a3f47. Strong readable shapes; characters and props must read at 28×44 and 36×36. Side view or slight 3/4 view. No text, no logo, no watermark, no border, no UI, no photorealism, no 3D, no painterly rendering, no smooth gradients, no anti-aliasing, no high-res detail, no faux-pixel mixed grids, no blood, no gore, no open wounds, no extra limbs, no detailed fingers, no baked drop shadow, no ground shadow.

Pixel-art scan-target prop designed on an 18×18 source grid: a bundle of striated muscle fibers with a nerve terminal landing on it, 1px cyan scan rim, muscle-pink and nerve-yellow accents.

Full subject, centered, generous margin, feet or base at the bottom, isolated on a flat solid magenta #FF00FF background, no cast shadow, no ground, no scene, no frame. Keep every pixel a hard square; no anti-aliasing.
```

#### 8.10.6 `sprite.scan.reflex` — scan target: reflex arc

**Ludo:** Sprite · **Display:** 36×36 px · **Source:** 18×18 PNG, alpha
**File:** `shared/sprites/scan-reflex.png` · **Batch:** 3 · **Status:** Blocked until the M2 scan list freezes (§2.4).

```text
Pixel art for a side-view 2D platformer set inside a living human body. Native pixel grid, hard square pixels, crisp edges, no anti-aliasing, no smoothing, no mixed pixel sizes. 1px dark teal-brown outlines at source resolution; flat fills from three-step colour ramps; 50% dither for damp membrane sheen, condensation, dust and grime. Gross-cute biology, wry deadpan tone, weird and fleshy but 12+ friendly: never gory, no shock humor. Palette ramps: teal #05090b #101a20 #1d2f38; bone #c9b79a #f2e8d5 #fff8e8; bone shadow #5f736e #7a8f8a #9db4ad; nerve #b8862b #ffd166 #fff3b0; joint #3f9fb5 #7bdff2 #c9f7ff; muscle #a82a4a #ef476f #ff9fb2; sage #6f847d #9db4ad #c4d4ce; ink #000000 #05090b #2a3f47. Strong readable shapes; characters and props must read at 28×44 and 36×36. Side view or slight 3/4 view. No text, no logo, no watermark, no border, no UI, no photorealism, no 3D, no painterly rendering, no smooth gradients, no anti-aliasing, no high-res detail, no faux-pixel mixed grids, no blood, no gore, no open wounds, no extra limbs, no detailed fingers, no baked drop shadow, no ground shadow.

Pixel-art scan-target prop designed on an 18×18 source grid: a compact looped reflex arc, sensory and motor nerve branches meeting in a small spinal-cord knot, 1px cyan scan rim, nerve-yellow core.

Full subject, centered, generous margin, feet or base at the bottom, isolated on a flat solid magenta #FF00FF background, no cast shadow, no ground, no scene, no frame. Keep every pixel a hard square; no anti-aliasing.
```

#### 8.10.7 `sprite.gate.ferry` — puzzle gate

**Ludo:** Sprite · **Display:** 36×36 px · **Source:** 18×18 PNG, alpha
**File:** `shared/sprites/gate-ferry.png` · **Batch:** 3 · **Status:** Blocked until M2 content freeze; may move to `04-muscle-effector` (§2.4).

```text
Pixel art for a side-view 2D platformer set inside a living human body. Native pixel grid, hard square pixels, crisp edges, no anti-aliasing, no smoothing, no mixed pixel sizes. 1px dark teal-brown outlines at source resolution; flat fills from three-step colour ramps; 50% dither for damp membrane sheen, condensation, dust and grime. Gross-cute biology, wry deadpan tone, weird and fleshy but 12+ friendly: never gory, no shock humor. Palette ramps: teal #05090b #101a20 #1d2f38; bone #c9b79a #f2e8d5 #fff8e8; bone shadow #5f736e #7a8f8a #9db4ad; nerve #b8862b #ffd166 #fff3b0; joint #3f9fb5 #7bdff2 #c9f7ff; muscle #a82a4a #ef476f #ff9fb2; sage #6f847d #9db4ad #c4d4ce; ink #000000 #05090b #2a3f47. Strong readable shapes; characters and props must read at 28×44 and 36×36. Side view or slight 3/4 view. No text, no logo, no watermark, no border, no UI, no photorealism, no 3D, no painterly rendering, no smooth gradients, no anti-aliasing, no high-res detail, no faux-pixel mixed grids, no blood, no gore, no open wounds, no extra limbs, no detailed fingers, no baked drop shadow, no ground shadow.

Pixel-art puzzle gate designed on an 18×18 source grid: a compact organic gate with a fleshy synaptic cleft, two receptor sockets, one triangular and one circular, braided nerve tendrils, bone plates, pulsing nerve-yellow core, side view.

Full subject, centered, generous margin, feet or base at the bottom, isolated on a flat solid magenta #FF00FF background, no cast shadow, no ground, no scene, no frame. Keep every pixel a hard square; no anti-aliasing.
```

#### 8.10.8 `sprite.exit` — level exit

**Ludo:** Sprite · **Display:** 36×36 px · **Source:** 18×18 PNG, alpha
**File:** `shared/sprites/exit.png` · **Batch:** 1

```text
Pixel art for a side-view 2D platformer set inside a living human body. Native pixel grid, hard square pixels, crisp edges, no anti-aliasing, no smoothing, no mixed pixel sizes. 1px dark teal-brown outlines at source resolution; flat fills from three-step colour ramps; 50% dither for damp membrane sheen, condensation, dust and grime. Gross-cute biology, wry deadpan tone, weird and fleshy but 12+ friendly: never gory, no shock humor. Palette ramps: teal #05090b #101a20 #1d2f38; bone #c9b79a #f2e8d5 #fff8e8; bone shadow #5f736e #7a8f8a #9db4ad; nerve #b8862b #ffd166 #fff3b0; joint #3f9fb5 #7bdff2 #c9f7ff; muscle #a82a4a #ef476f #ff9fb2; sage #6f847d #9db4ad #c4d4ce; ink #000000 #05090b #2a3f47. Strong readable shapes; characters and props must read at 28×44 and 36×36. Side view or slight 3/4 view. No text, no logo, no watermark, no border, no UI, no photorealism, no 3D, no painterly rendering, no smooth gradients, no anti-aliasing, no high-res detail, no faux-pixel mixed grids, no blood, no gore, no open wounds, no extra limbs, no detailed fingers, no baked drop shadow, no ground shadow.

Pixel-art exit doorway designed on an 18×18 source grid: a membrane airlock, a ring of bone and teal tissue, soft warm light beyond, wet folds, no gore, side view.

Full subject, centered, generous margin, feet or base at the bottom, isolated on a flat solid magenta #FF00FF background, no cast shadow, no ground, no scene, no frame. Keep every pixel a hard square; no anti-aliasing.
```

#### 8.10.9 `sprite.prop.tracer` — carry prop

**Ludo:** Sprite · **Display:** 36×36 px · **Source:** 18×18 PNG, alpha
**File:** `shared/sprites/prop-tracer.png` · **Batch:** 3 · **Status:** Blocked until M2 content freeze; may move to `04-muscle-effector` (§2.4).

```text
Pixel art for a side-view 2D platformer set inside a living human body. Native pixel grid, hard square pixels, crisp edges, no anti-aliasing, no smoothing, no mixed pixel sizes. 1px dark teal-brown outlines at source resolution; flat fills from three-step colour ramps; 50% dither for damp membrane sheen, condensation, dust and grime. Gross-cute biology, wry deadpan tone, weird and fleshy but 12+ friendly: never gory, no shock humor. Palette ramps: teal #05090b #101a20 #1d2f38; bone #c9b79a #f2e8d5 #fff8e8; bone shadow #5f736e #7a8f8a #9db4ad; nerve #b8862b #ffd166 #fff3b0; joint #3f9fb5 #7bdff2 #c9f7ff; muscle #a82a4a #ef476f #ff9fb2; sage #6f847d #9db4ad #c4d4ce; ink #000000 #05090b #2a3f47. Strong readable shapes; characters and props must read at 28×44 and 36×36. Side view or slight 3/4 view. No text, no logo, no watermark, no border, no UI, no photorealism, no 3D, no painterly rendering, no smooth gradients, no anti-aliasing, no high-res detail, no faux-pixel mixed grids, no blood, no gore, no open wounds, no extra limbs, no detailed fingers, no baked drop shadow, no ground shadow.

Pixel-art carry prop designed on an 18×18 source grid: a glowing neurotransmitter orb, a soft irregular yellow blob with a cyan rim and tiny tendrils, floating, no face.

Full subject, centered, generous margin, feet or base at the bottom, isolated on a flat solid magenta #FF00FF background, no cast shadow, no ground, no scene, no frame. Keep every pixel a hard square; no anti-aliasing.
```

#### 8.10.10 `sprite.pulse.terminal` — pulse source

**Ludo:** Sprite · **Display:** 36×36 px · **Source:** 18×18 PNG, alpha
**File:** `shared/sprites/pulse-terminal.png` · **Batch:** 3 · **Status:** Blocked until M2 content freeze; may move to `04-muscle-effector` (§2.4).

```text
Pixel art for a side-view 2D platformer set inside a living human body. Native pixel grid, hard square pixels, crisp edges, no anti-aliasing, no smoothing, no mixed pixel sizes. 1px dark teal-brown outlines at source resolution; flat fills from three-step colour ramps; 50% dither for damp membrane sheen, condensation, dust and grime. Gross-cute biology, wry deadpan tone, weird and fleshy but 12+ friendly: never gory, no shock humor. Palette ramps: teal #05090b #101a20 #1d2f38; bone #c9b79a #f2e8d5 #fff8e8; bone shadow #5f736e #7a8f8a #9db4ad; nerve #b8862b #ffd166 #fff3b0; joint #3f9fb5 #7bdff2 #c9f7ff; muscle #a82a4a #ef476f #ff9fb2; sage #6f847d #9db4ad #c4d4ce; ink #000000 #05090b #2a3f47. Strong readable shapes; characters and props must read at 28×44 and 36×36. Side view or slight 3/4 view. No text, no logo, no watermark, no border, no UI, no photorealism, no 3D, no painterly rendering, no smooth gradients, no anti-aliasing, no high-res detail, no faux-pixel mixed grids, no blood, no gore, no open wounds, no extra limbs, no detailed fingers, no baked drop shadow, no ground shadow.

Pixel-art pulse source designed on an 18×18 source grid: a presynaptic nerve terminal, bulbous teal membrane, visible vesicles, cyan pulse emitter, side view.

Full subject, centered, generous margin, feet or base at the bottom, isolated on a flat solid magenta #FF00FF background, no cast shadow, no ground, no scene, no frame. Keep every pixel a hard square; no anti-aliasing.
```

#### 8.10.11 `sprite.receptor.triangle` — receptor A

**Ludo:** Sprite · **Display:** 36×36 px · **Source:** 18×18 PNG, alpha
**File:** `shared/sprites/receptor-triangle.png` · **Batch:** 3 · **Status:** Blocked until M2 content freeze; may move to `04-muscle-effector` (§2.4).

```text
Pixel art for a side-view 2D platformer set inside a living human body. Native pixel grid, hard square pixels, crisp edges, no anti-aliasing, no smoothing, no mixed pixel sizes. 1px dark teal-brown outlines at source resolution; flat fills from three-step colour ramps; 50% dither for damp membrane sheen, condensation, dust and grime. Gross-cute biology, wry deadpan tone, weird and fleshy but 12+ friendly: never gory, no shock humor. Palette ramps: teal #05090b #101a20 #1d2f38; bone #c9b79a #f2e8d5 #fff8e8; bone shadow #5f736e #7a8f8a #9db4ad; nerve #b8862b #ffd166 #fff3b0; joint #3f9fb5 #7bdff2 #c9f7ff; muscle #a82a4a #ef476f #ff9fb2; sage #6f847d #9db4ad #c4d4ce; ink #000000 #05090b #2a3f47. Strong readable shapes; characters and props must read at 28×44 and 36×36. Side view or slight 3/4 view. No text, no logo, no watermark, no border, no UI, no photorealism, no 3D, no painterly rendering, no smooth gradients, no anti-aliasing, no high-res detail, no faux-pixel mixed grids, no blood, no gore, no open wounds, no extra limbs, no detailed fingers, no baked drop shadow, no ground shadow.

Pixel-art receptor lock designed on an 18×18 source grid: a triangular organic socket, bone rim, teal membrane, nerve-yellow inner glow.

Full subject, centered, generous margin, feet or base at the bottom, isolated on a flat solid magenta #FF00FF background, no cast shadow, no ground, no scene, no frame. Keep every pixel a hard square; no anti-aliasing.
```

#### 8.10.12 `sprite.receptor.circle` — receptor B

**Ludo:** Sprite · **Display:** 36×36 px · **Source:** 18×18 PNG, alpha
**File:** `shared/sprites/receptor-circle.png` · **Batch:** 3 · **Status:** Blocked until M2 content freeze; may move to `04-muscle-effector` (§2.4).

```text
Pixel art for a side-view 2D platformer set inside a living human body. Native pixel grid, hard square pixels, crisp edges, no anti-aliasing, no smoothing, no mixed pixel sizes. 1px dark teal-brown outlines at source resolution; flat fills from three-step colour ramps; 50% dither for damp membrane sheen, condensation, dust and grime. Gross-cute biology, wry deadpan tone, weird and fleshy but 12+ friendly: never gory, no shock humor. Palette ramps: teal #05090b #101a20 #1d2f38; bone #c9b79a #f2e8d5 #fff8e8; bone shadow #5f736e #7a8f8a #9db4ad; nerve #b8862b #ffd166 #fff3b0; joint #3f9fb5 #7bdff2 #c9f7ff; muscle #a82a4a #ef476f #ff9fb2; sage #6f847d #9db4ad #c4d4ce; ink #000000 #05090b #2a3f47. Strong readable shapes; characters and props must read at 28×44 and 36×36. Side view or slight 3/4 view. No text, no logo, no watermark, no border, no UI, no photorealism, no 3D, no painterly rendering, no smooth gradients, no anti-aliasing, no high-res detail, no faux-pixel mixed grids, no blood, no gore, no open wounds, no extra limbs, no detailed fingers, no baked drop shadow, no ground shadow.

Pixel-art receptor lock designed on an 18×18 source grid: a circular organic socket, bone rim, teal membrane, nerve-yellow inner glow.

Full subject, centered, generous margin, feet or base at the bottom, isolated on a flat solid magenta #FF00FF background, no cast shadow, no ground, no scene, no frame. Keep every pixel a hard square; no anti-aliasing.
```

### 8.11 Background prompts

The sky is a 640×368 plate displayed at an exact 2× cover; far, mid and near are 1024×512 transparent, tileable parallax layers drawn with 2×2 minimum clusters. Generate the sky and mid layer first (Batch 2).

#### 8.11.1 `bg.nerve_forest.sky` — sky plate

**Ludo:** Background, wide · **Display:** 1280×736 cover · **Source:** 640×368 WebP/PNG
**File:** `shared/backgrounds/nerve-forest-sky.webp` · **Batch:** 2

```text
Pixel art for a side-view 2D platformer set inside a living human body. Native pixel grid, hard square pixels, crisp edges, no anti-aliasing, no smoothing, no mixed pixel sizes. 1px dark teal-brown outlines at source resolution; flat fills from three-step colour ramps; 50% dither for damp membrane sheen, condensation, dust and grime. Gross-cute biology, wry deadpan tone, weird and fleshy but 12+ friendly: never gory, no shock humor. Palette ramps: teal #05090b #101a20 #1d2f38; bone #c9b79a #f2e8d5 #fff8e8; bone shadow #5f736e #7a8f8a #9db4ad; nerve #b8862b #ffd166 #fff3b0; joint #3f9fb5 #7bdff2 #c9f7ff; muscle #a82a4a #ef476f #ff9fb2; sage #6f847d #9db4ad #c4d4ce; ink #000000 #05090b #2a3f47. Strong readable shapes; characters and props must read at 28×44 and 36×36. Side view or slight 3/4 view. No text, no logo, no watermark, no border, no UI, no photorealism, no 3D, no painterly rendering, no smooth gradients, no anti-aliasing, no high-res detail, no faux-pixel mixed grids, no blood, no gore, no open wounds, no extra limbs, no detailed fingers, no baked drop shadow, no ground shadow.

Pixel-art wide background plate, 640×368 source, designed for an exact 2× display: the interior of a living body as a damp nerve forest, deep teal darkness, distant branching signal veins, faint yellow glow on the horizon, floating dust, no characters, no text, no UI, no frame, hand-built pixel clusters and dither.

Wide cinematic composition, no characters, no text, no UI, no border, no frame, no logo. Keep the center and lower third dark enough for HUD and player silhouettes. Hard pixel edges only; no anti-aliasing, no smooth gradients.
```

#### 8.11.2 `bg.nerve_forest.far` — far parallax layer

**Ludo:** Parallax layer, 2:1 · **Display:** tile · **Source:** 1024×512 PNG/WebP, 2×2 clusters
**File:** `shared/backgrounds/nerve-forest-far.webp` · **Batch:** 4

```text
Pixel art for a side-view 2D platformer set inside a living human body. Native pixel grid, hard square pixels, crisp edges, no anti-aliasing, no smoothing, no mixed pixel sizes. 1px dark teal-brown outlines at source resolution; flat fills from three-step colour ramps; 50% dither for damp membrane sheen, condensation, dust and grime. Gross-cute biology, wry deadpan tone, weird and fleshy but 12+ friendly: never gory, no shock humor. Palette ramps: teal #05090b #101a20 #1d2f38; bone #c9b79a #f2e8d5 #fff8e8; bone shadow #5f736e #7a8f8a #9db4ad; nerve #b8862b #ffd166 #fff3b0; joint #3f9fb5 #7bdff2 #c9f7ff; muscle #a82a4a #ef476f #ff9fb2; sage #6f847d #9db4ad #c4d4ce; ink #000000 #05090b #2a3f47. Strong readable shapes; characters and props must read at 28×44 and 36×36. Side view or slight 3/4 view. No text, no logo, no watermark, no border, no UI, no photorealism, no 3D, no painterly rendering, no smooth gradients, no anti-aliasing, no high-res detail, no faux-pixel mixed grids, no blood, no gore, no open wounds, no extra limbs, no detailed fingers, no baked drop shadow, no ground shadow.

Pixel-art seamless horizontally tileable parallax layer, 1024×512 source, every colour block at least 2×2 pixels, transparent background: distant giant nerve trunks and pale myelin slabs, low contrast cool teal, soft dither haze, no ground, no characters, no text, edges match.

Seamless parallax layer, transparent background, edges match on all four sides, flat orthographic side view, no characters, no text, no border, no unique focal object, no ground line. Every colour block at least 2×2 pixels at export size; hard edges, no anti-aliasing.
```

#### 8.11.3 `bg.nerve_forest.mid` — mid parallax layer

**Ludo:** Parallax layer, 2:1 · **Display:** tile · **Source:** 1024×512 PNG/WebP, 2×2 clusters
**File:** `shared/backgrounds/nerve-forest-mid.webp` · **Batch:** 2

```text
Pixel art for a side-view 2D platformer set inside a living human body. Native pixel grid, hard square pixels, crisp edges, no anti-aliasing, no smoothing, no mixed pixel sizes. 1px dark teal-brown outlines at source resolution; flat fills from three-step colour ramps; 50% dither for damp membrane sheen, condensation, dust and grime. Gross-cute biology, wry deadpan tone, weird and fleshy but 12+ friendly: never gory, no shock humor. Palette ramps: teal #05090b #101a20 #1d2f38; bone #c9b79a #f2e8d5 #fff8e8; bone shadow #5f736e #7a8f8a #9db4ad; nerve #b8862b #ffd166 #fff3b0; joint #3f9fb5 #7bdff2 #c9f7ff; muscle #a82a4a #ef476f #ff9fb2; sage #6f847d #9db4ad #c4d4ce; ink #000000 #05090b #2a3f47. Strong readable shapes; characters and props must read at 28×44 and 36×36. Side view or slight 3/4 view. No text, no logo, no watermark, no border, no UI, no photorealism, no 3D, no painterly rendering, no smooth gradients, no anti-aliasing, no high-res detail, no faux-pixel mixed grids, no blood, no gore, no open wounds, no extra limbs, no detailed fingers, no baked drop shadow, no ground shadow.

Pixel-art seamless horizontally tileable parallax layer, 1024×512 source, every colour block at least 2×2 pixels, transparent background: branching dendrites, synaptic bulbs, hanging membranes, medium contrast, yellow glow accents, no characters, no text, edges match.

Seamless parallax layer, transparent background, edges match on all four sides, flat orthographic side view, no characters, no text, no border, no unique focal object, no ground line. Every colour block at least 2×2 pixels at export size; hard edges, no anti-aliasing.
```

#### 8.11.4 `bg.nerve_forest.near` — near parallax layer

**Ludo:** Parallax layer, 2:1 · **Display:** tile · **Source:** 1024×512 PNG/WebP, 2×2 clusters
**File:** `shared/backgrounds/nerve-forest-near.webp` · **Batch:** 4

```text
Pixel art for a side-view 2D platformer set inside a living human body. Native pixel grid, hard square pixels, crisp edges, no anti-aliasing, no smoothing, no mixed pixel sizes. 1px dark teal-brown outlines at source resolution; flat fills from three-step colour ramps; 50% dither for damp membrane sheen, condensation, dust and grime. Gross-cute biology, wry deadpan tone, weird and fleshy but 12+ friendly: never gory, no shock humor. Palette ramps: teal #05090b #101a20 #1d2f38; bone #c9b79a #f2e8d5 #fff8e8; bone shadow #5f736e #7a8f8a #9db4ad; nerve #b8862b #ffd166 #fff3b0; joint #3f9fb5 #7bdff2 #c9f7ff; muscle #a82a4a #ef476f #ff9fb2; sage #6f847d #9db4ad #c4d4ce; ink #000000 #05090b #2a3f47. Strong readable shapes; characters and props must read at 28×44 and 36×36. Side view or slight 3/4 view. No text, no logo, no watermark, no border, no UI, no photorealism, no 3D, no painterly rendering, no smooth gradients, no anti-aliasing, no high-res detail, no faux-pixel mixed grids, no blood, no gore, no open wounds, no extra limbs, no detailed fingers, no baked drop shadow, no ground shadow.

Pixel-art seamless horizontally tileable foreground parallax layer, 1024×512 source, every colour block at least 2×2 pixels, transparent background: dark tendon roots, fat globules, membrane folds framing the edges, high contrast, large transparent gaps, occasional yellow glow, no characters, no text, edges match.

Seamless parallax layer, transparent background, edges match on all four sides, flat orthographic side view, no characters, no text, no border, no unique focal object, no ground line. Every colour block at least 2×2 pixels at export size; hard edges, no anti-aliasing.
```

### 8.12 Tile and badge prompts

The only two non-background, non-entity images in the M3 kit.

#### 8.12.1 `tileset.anatomy` — tile texture

**Ludo:** Texture · **Display:** 32×32 px tile · **Source:** 16×16 PNG
**File:** `shared/tilesets/anatomy.png` · **Batch:** 4

```text
Pixel art for a side-view 2D platformer set inside a living human body. Native pixel grid, hard square pixels, crisp edges, no anti-aliasing, no smoothing, no mixed pixel sizes. 1px dark teal-brown outlines at source resolution; flat fills from three-step colour ramps; 50% dither for damp membrane sheen, condensation, dust and grime. Gross-cute biology, wry deadpan tone, weird and fleshy but 12+ friendly: never gory, no shock humor. Palette ramps: teal #05090b #101a20 #1d2f38; bone #c9b79a #f2e8d5 #fff8e8; bone shadow #5f736e #7a8f8a #9db4ad; nerve #b8862b #ffd166 #fff3b0; joint #3f9fb5 #7bdff2 #c9f7ff; muscle #a82a4a #ef476f #ff9fb2; sage #6f847d #9db4ad #c4d4ce; ink #000000 #05090b #2a3f47. Strong readable shapes; characters and props must read at 28×44 and 36×36. Side view or slight 3/4 view. No text, no logo, no watermark, no border, no UI, no photorealism, no 3D, no painterly rendering, no smooth gradients, no anti-aliasing, no high-res detail, no faux-pixel mixed grids, no blood, no gore, no open wounds, no extra limbs, no detailed fingers, no baked drop shadow, no ground shadow.

Pixel-art seamless 16×16 organic block texture designed for 2× display: damp bone-and-nerve tissue, deep teal base, bone-cream grit, tiny yellow nerve threads, subtle pores and grime, no directional top edge, no objects, no text.

Seamless tile; edges match on all four sides; flat orthographic view; no text, no border, no unique focal object; hard pixel edges, no anti-aliasing.
```

#### 8.12.2 `ui.icon.badge` — mission badge

**Ludo:** Icon · **Display:** 32×32 px HUD stamp · **Source:** 16×16 PNG
**File:** `shared/ui/badge.png` · **Batch:** 4

```text
Pixel art for a side-view 2D platformer set inside a living human body. Native pixel grid, hard square pixels, crisp edges, no anti-aliasing, no smoothing, no mixed pixel sizes. 1px dark teal-brown outlines at source resolution; flat fills from three-step colour ramps; 50% dither for damp membrane sheen, condensation, dust and grime. Gross-cute biology, wry deadpan tone, weird and fleshy but 12+ friendly: never gory, no shock humor. Palette ramps: teal #05090b #101a20 #1d2f38; bone #c9b79a #f2e8d5 #fff8e8; bone shadow #5f736e #7a8f8a #9db4ad; nerve #b8862b #ffd166 #fff3b0; joint #3f9fb5 #7bdff2 #c9f7ff; muscle #a82a4a #ef476f #ff9fb2; sage #6f847d #9db4ad #c4d4ce; ink #000000 #05090b #2a3f47. Strong readable shapes; characters and props must read at 28×44 and 36×36. Side view or slight 3/4 view. No text, no logo, no watermark, no border, no UI, no photorealism, no 3D, no painterly rendering, no smooth gradients, no anti-aliasing, no high-res detail, no faux-pixel mixed grids, no blood, no gore, no open wounds, no extra limbs, no detailed fingers, no baked drop shadow, no ground shadow.

Pixel-art circular mission patch icon designed on a 16×16 source grid: a tiny astronaut helmet inside a ring of nerve fibers, bone cream, deep teal, nerve yellow, joint cyan, 1px dark outline, flat, simple, readable at 32px, no text, centered, transparent or flat magenta, 1:1.

Centered icon, generous margin, isolated on a solid flat magenta #FF00FF background, no cast shadow, no scene, no frame; hard pixel edges, no anti-aliasing.
```

### 8.13 Audio prompts

Every cue below already contains the audio style line. Generate all cues in Batch 5. Audio is unchanged by the pixel pivot.

**AUDIO STYLE — canonical block.** Repeated verbatim at the start of every cue prompt in this section.

```text
Short diegetic game sound effect, 48 kHz, dry, tactile, sci-fi suit plus wet organic body, no music, no voice, no gore, clean tail, 0.2–1.2 seconds.
```

#### 8.13.1 `audio.cue.boot` — boot / suit power

**Ludo:** Audio · **Export:** OGG or MP3, 48 kHz · **Length:** 0.2–1.2 s
**File:** `shared/audio/boot.ogg` · **Batch:** 5

```text
Short diegetic game sound effect, 48 kHz, dry, tactile, sci-fi suit plus wet organic body, no music, no voice, no gore, clean tail, 0.2–1.2 seconds.

Suit power-up: soft electric hum rising, helmet seal hiss, two tiny confirmation beeps.
```

#### 8.13.2 `audio.cue.dialogue` — dialogue advance

**Ludo:** Audio · **Export:** OGG or MP3, 48 kHz · **Length:** 0.2–0.8 s
**File:** `shared/audio/dialogue.ogg` · **Batch:** 5

```text
Short diegetic game sound effect, 48 kHz, dry, tactile, sci-fi suit plus wet organic body, no music, no voice, no gore, clean tail, 0.2–1.2 seconds.

Cell-speech translator: wet organic chirp, soft radio static blip, short and friendly.
```

#### 8.13.3 `audio.cue.scan` — scan

**Ludo:** Audio · **Export:** OGG or MP3, 48 kHz · **Length:** 0.3–1.0 s
**File:** `shared/audio/scan.ogg` · **Batch:** 5

```text
Short diegetic game sound effect, 48 kHz, dry, tactile, sci-fi suit plus wet organic body, no music, no voice, no gore, clean tail, 0.2–1.2 seconds.

Scanner sweep: high sonar ping, data tick, faint cyan shimmer.
```

#### 8.13.4 `audio.cue.dash` — dash

**Ludo:** Audio · **Export:** OGG or MP3, 48 kHz · **Length:** 0.2–0.7 s
**File:** `shared/audio/dash.ogg` · **Batch:** 5

```text
Short diegetic game sound effect, 48 kHz, dry, tactile, sci-fi suit plus wet organic body, no music, no voice, no gore, clean tail, 0.2–1.2 seconds.

Suit thruster: short air puff, fabric snap, quick whoosh.
```

#### 8.13.5 `audio.cue.gate` — gate attempt / solve

**Ludo:** Audio · **Export:** OGG or MP3, 48 kHz · **Length:** 0.4–1.2 s
**File:** `shared/audio/gate.ogg` · **Batch:** 5

```text
Short diegetic game sound effect, 48 kHz, dry, tactile, sci-fi suit plus wet organic body, no music, no voice, no gore, clean tail, 0.2–1.2 seconds.

Organic lock release: wet squelch, bone clunk, soft yellow chime; not gory.
```

#### 8.13.6 `audio.cue.map` — map open

**Ludo:** Audio · **Export:** OGG or MP3, 48 kHz · **Length:** 0.3–0.9 s
**File:** `shared/audio/map.ogg` · **Batch:** 5

```text
Short diegetic game sound effect, 48 kHz, dry, tactile, sci-fi suit plus wet organic body, no music, no voice, no gore, clean tail, 0.2–1.2 seconds.

Holographic map unfold: soft digital shimmer, tiny chime, paper-like flap.
```

#### 8.13.7 `audio.cue.debrief` — debrief open

**Ludo:** Audio · **Export:** OGG or MP3, 48 kHz · **Length:** 0.4–1.2 s
**File:** `shared/audio/debrief.ogg` · **Batch:** 5

```text
Short diegetic game sound effect, 48 kHz, dry, tactile, sci-fi suit plus wet organic body, no music, no voice, no gore, clean tail, 0.2–1.2 seconds.

Warm resolution: soft two-note synth chime, suit confirmation click.
```

#### 8.13.8 `audio.cue.checkpoint` — checkpoint

**Ludo:** Audio · **Export:** OGG or MP3, 48 kHz · **Length:** 0.3–0.9 s
**File:** `shared/audio/checkpoint.ogg` · **Batch:** 5

```text
Short diegetic game sound effect, 48 kHz, dry, tactile, sci-fi suit plus wet organic body, no music, no voice, no gore, clean tail, 0.2–1.2 seconds.

Beacon ping: clean cyan pulse, small save confirmation.
```

#### 8.13.9 `audio.cue.unlock` — ability unlock

**Ludo:** Audio · **Export:** OGG or MP3, 48 kHz · **Length:** 0.5–1.2 s
**File:** `shared/audio/unlock.ogg` · **Batch:** 5

```text
Short diegetic game sound effect, 48 kHz, dry, tactile, sci-fi suit plus wet organic body, no music, no voice, no gore, clean tail, 0.2–1.2 seconds.

Ability unlock: rising synth, nerve zap, satisfying click.
```

#### 8.13.10 `audio.cue.jump` — jump

**Ludo:** Audio · **Export:** OGG or MP3, 48 kHz · **Length:** 0.15–0.5 s
**File:** `shared/audio/jump.ogg` · **Batch:** 5

```text
Short diegetic game sound effect, 48 kHz, dry, tactile, sci-fi suit plus wet organic body, no music, no voice, no gore, clean tail, 0.2–1.2 seconds.

Suit servo jump: soft pneumatic push, tiny fabric movement.
```

#### 8.13.11 `audio.cue.land` — land

**Ludo:** Audio · **Export:** OGG or MP3, 48 kHz · **Length:** 0.15–0.5 s
**File:** `shared/audio/land.ogg` · **Batch:** 5

```text
Short diegetic game sound effect, 48 kHz, dry, tactile, sci-fi suit plus wet organic body, no music, no voice, no gore, clean tail, 0.2–1.2 seconds.

Boots land on wet tissue: soft squelch, suit thud, no gore.
```

---

## 9. Acceptance criteria

### 9.1 Per-category acceptance

| Category | Must pass |
|---|---|
| Players | Reads at 28×44 from a 14×22 source; P1/P2 differ by accent only; helmet, backpack, boots readable; feet at baseline; 2× grid intact |
| Entities | Reads at 36×36 from an 18×18 source; silhouette distinct from every other entity; palette only; no text; no baked shadow |
| Backgrounds | Sky displays at an exact integer 2× and supports HUD contrast; far/mid/near tile without seams at 2×2; near layer does not obscure gameplay |
| Tile | Seamless on all four sides at 16×16 source / 32×32 display; no obvious repetition artifact; reads as anatomy, not generic stone |
| Badge | 16×16 source reads at 32×32; no text; central composition; works on dark teal |
| UI | Pixel font at integer sizes (12 px labels minimum, 15–16 px body); square chrome; no radius, blur, or soft shadow; focus visible; text scale works |
| Audio | Short, dry, no long tail; no audio-only cue; no gore; no music |

### 9.2 Style consistency

- Same 2× pixel density across players, entities, tile, sky, and badge; parallax uses 2×2 clusters.
- Same 1 px source outline weight; no asset suddenly uses a 2 px or 0 px outline.
- Same ramp palette; no purple/neon drift and no intermediate blends.
- Same level of detail; no asset is suddenly painterly, 3D, or faux-pixel with mixed sizes.
- Same tone: gross-cute, not edgy.
- Same camera language: side or slight 3/4 for characters; orthographic for backgrounds.
- All assets pass the “same game” test on one contact sheet.

### 9.3 Technical QA

- Correct source size: 14×22 player, 18×18 entity, 16×16 tile/badge, 640×368 sky, 1024×512 parallax.
- Display lands on exact 2× for players, entities, tile, sky, and badge; parallax tiles 1:1 with 2×2 clusters.
- No anti-aliasing, blur, or fractional scaling.
- Palette is quantised to the ramp table; no stray colours.
- Alpha is clean at 400%; no magenta fringe; no semi-transparent sprite edges.
- No JPG or lossy WebP for pixel assets.
- File size within budget.
- File names match the asset register.
- No text, logo, watermark, border, or checkerboard.
- Player/entity origins and paddings are consistent.
- Background layers tile correctly; the sky does not shimmer.

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
- Silkscreen and Pixelify Sans are bundled locally (no CDN) and recorded in the licence log.
- `npm run pack:validate` passes.
- `npm run pack:smoke` still passes.
- `?assets=final` loads the final manifest.
- No visible placeholder remains in a capture shot.
- Deferred UI assets remain declared placeholders and are not treated as missing.

### 9.6 Sign-off checklist

- [ ] Six-asset pixel style gate passes.
- [ ] P1 and P2 approved at 28×44 from 14×22 sources.
- [ ] Neuron Keeper approved.
- [ ] Five scan targets approved.
- [ ] Gate, exit, props, receptors approved.
- [ ] Sky and mid layer approved; far/near approved.
- [ ] Tile and badge approved.
- [ ] UI pixel chrome and fonts approved.
- [ ] 11 SFX approved.
- [ ] All files named and placed at source size.
- [ ] Manifest, font licences, and asset licences updated.
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
  "modified": "Generated concept 2026-11-04; pixel-cleaned at 14×22; palette quantised; background removed",
  "aiGenerated": true
}
```

Font files are recorded the same way, with `"type": "font"`:

```json
{
  "file": "fonts/silkscreen-regular.woff2",
  "type": "font",
  "source": "Google Fonts",
  "author": "Jason Kottke",
  "license": "SIL Open Font License 1.1",
  "url": "https://github.com/googlefonts/silkscreen",
  "modified": "Self-hosted WOFF2; unmodified",
  "aiGenerated": false
}
```

Pixelify Sans is by Stefie Justprince and uses the same OFL 1.1 terms. Keep the OFL text beside the font files.

Use a stable license label across all Ludo-paid assets, for example `Ludo AI Commercial (paid)`, and make the manifest `license` field match the label in `licenses.json`.

### 10.3 Prompt log

Keep a separate spreadsheet or Markdown table with:

| Field | Example |
|---|---|
| Asset ID | `sprite.agent.neuron` |
| Tool | Ludo.ai |
| Plan | Indie |
| Model/style | Ludo image model; pixel-art concept |
| Prompt | Full prompt block from §8, pasted verbatim |
| Reference | `style-anchor-p1.png` |
| Variations | 4 |
| Chosen concept | `agent-neuron-concept.png` |
| Pixel cleanup | Aseprite; 18×18 source; palette quantised; anti-aliasing removed |
| Grid check | 2× display; 2×2 clusters where the layer is 1:1 |
| Chosen file | `agent-neuron.png` |
| Date | 2026-11-04 |
| Modifications | Background removed; trimmed; palette checked; grid checked |
| Verdict | Approved / retry / placeholder |
| Licence | `Ludo AI Commercial (paid)` |

The prompt log is the evidence for the GDD/video asset list and the AI-generated asset record.

### 10.4 Free-tier note

Use the free tier only for the six-asset style gate. Do not ship a free-tier file if it is watermarked or the terms do not cover the intended use. Regenerate the keepers on the paid Indie plan for final assets. If Ludo’s free output is clean and the terms allow it, record that explicitly in the prompt log; otherwise do not use it.

---

## 11. Production plan

### 11.1 Budget

Assumptions:

- 20 image concepts × 4 variations × 0.5 credits = **40 credits**
- 11 SFX × 2 credits = **22 credits**
- Retries, inpainting, and fixes = **~40 credits**
- Total ≈ **102 credits**
- Pixel cleanup is manual time in Aseprite/Piskel, not Ludo credits.

Ludo Indie includes **250 credits/month** for **$20**. This is enough. Buy extra credits only if the M2 scope expands or the concept gate needs heavy iteration.

**Do not buy Pro ($50/mo) for M3** unless:

- you need API/MCP/CLI automation;
- the M2 content freeze actually adds levels 2–5 + Silicon and the asset count grows beyond ~100 images;
- you decide to produce many animated sheets (after animation playback is implemented).

### 11.2 Work order

| Stage | Work |
|---|---|
| 1 | Six-asset pixel gate; approve P1 at 14×22 / 28×44; lock palette ramps |
| 2 | Batch 1: P2, Neuron Keeper, `scan.neuron`, exit; pixel-clean each |
| 3 | Batch 2: sky, mid layer; verify integer 2× and tiling |
| 4 | Batch 3: remaining scans, gate, tracer, pulse, receptors after M2 freeze |
| 5 | Batch 4: far, near, tile, badge |
| 6 | Batch 5: 11 SFX |
| 7 | Integrate, manifest, licences, fonts, contact sheet, capture stills |

### 11.3 Cut lines

In order:

1. Drop optional `sprite.checkpoint` and `sprite.gate.nerve`.
2. Drop `far` and `near` layers; use tinted placeholder layers.
3. Drop `badge` and `tile` final art; keep placeholders.
4. Drop SFX polish; use synth fallback.
5. If the pixel style gate fails, ship placeholders.

Never cut P1/P2, Neuron Keeper, the main interactive landmark (gate or exit), or the scan targets if they appear in the video. Those are the visual proof of the game.

### 11.4 Risks

| Risk | Mitigation |
|---|---|
| Ludo concepts are faux-pixel (mixed grids, anti-aliasing) | Treat Ludo as concept only; pixel-clean at source size in Aseprite/Piskel |
| Pixel-grid drift across 20 assets | P1 anchor + fixed source sizes + 400% check + contact sheet |
| Palette drift | Quantise to the ramp table; reject intermediate blends |
| Non-integer sky or background scaling | Integer 2× cover (ADR-0048); test at 1280×720 |
| Parallax seams | 1024×512 with 2×2 clusters; 2×2 repeat check |
| Player reads poorly at 28×44 | 14×22 source; silhouette test; simplify the design |
| UI font readability | Minimum 12/15 px; integer text scales; mixed case for dialogue |
| Alpha halos on dark background | Magenta background + 400% edge check + manual cleanup |
| M2 puzzle redesign invalidates prop art | Do not generate gate/tracer/pulse/receptor art until content freeze; re-baseline §5.3 |
| Credits exhausted | Indie 250 is enough; top up rather than upgrade |
| Free-tier watermark | Free tier for the concept gate only; paid Indie for finals |
| Engine can’t animate | Static sprites only; animation is a separate engine task |

---

## 12. Future levels

### 12.1 Level kit template

When a level is authored, validated, and in the capture list, instantiate:

- 4 background layers: 640×368 sky, 1024×512 far/mid/near with 2×2 clusters
- 1 tile texture: 16×16 source, displayed at 32×32
- 1 agent character: 18×18 source, displayed at 36×36
- 3–5 scan targets: 18×18 source
- 1 gate: 18×18 source
- 1 exit: 18×18 source
- 1 checkpoint (if used): 18×18 source
- 2–4 props: 18×18 source

Reuse the shared players (14×22 source), badge (16×16 source), and audio cues. Do not generate a new player per level. Follow the pixel grid and palette rules in §4 and §6.

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

- [x] Adopt whole-game pixel art (ADR-0047).
- [x] Adopt half-res source with 2× nearest-neighbour display (ADR-0048).
- [x] Adopt pixel UI chrome and fonts (ADR-0049).
- [x] Use three-step palette ramps; the eight hue families stay.
- [x] Use Silkscreen + Pixelify Sans as the bundled UI fonts.
- [ ] Confirm M3 art target = `03-nerve-forest` only.
- [ ] Confirm P1 joint-cyan / P2 muscle-pink accents.
- [ ] Confirm no animation work in M3.
- [ ] Confirm Ludo Indie ($20/mo), not Pro.
- [ ] Confirm skip of the eight deferred UI assets.
- [ ] Confirm whether `far`/`near` layers appear in the capture shot; if not, they can be cut.
- [ ] Confirm whether `sprite.checkpoint` or `sprite.gate.nerve` become visible before M3; if yes, add them to the scope.
- [ ] Confirm whether M2 implements Node Run in `03-nerve-forest`; if yes, re-baseline §5.3 before generating any puzzle prop art.

---

## 14. References

- [`adr-m3/0047-pixel-art-visual-direction.md`](../adr-m3/0047-pixel-art-visual-direction.md) — whole-game pixel-art direction.
- [`adr-m3/0048-half-resolution-pixel-rendering.md`](../adr-m3/0048-half-resolution-pixel-rendering.md) — half-res authoring and 2× display.
- [`adr-m3/0049-pixel-ui-chrome-and-typography.md`](../adr-m3/0049-pixel-ui-chrome-and-typography.md) — pixel UI and fonts.
- [`base-game/adr/0027-art-audio-direction-and-licensing.md`](../shrinkonauts/base-game/adr/0027-art-audio-direction-and-licensing.md) — licensing and audio decisions; visual-style portion superseded by ADR-0047.
- [`base-game/implementation-plan.md`](../shrinkonauts/base-game/implementation-plan.md) — milestones, placeholder-first policy, cut lines.
- [`base-game/adr/0029-asset-provider-abstraction.md`](../shrinkonauts/base-game/adr/0029-asset-provider-abstraction.md) — logical asset IDs and provider chain.
- [`base-game/adr/0030-sprite-animation-format-policy.md`](../shrinkonauts/base-game/adr/0030-sprite-animation-format-policy.md) — format policy.
- [`base-game/adr/0031-layered-background-composition.md`](../shrinkonauts/base-game/adr/0031-layered-background-composition.md) — layered backgrounds.
- [`base-game/adr/0032-audio-cue-abstraction.md`](../shrinkonauts/base-game/adr/0032-audio-cue-abstraction.md) — audio cues.
- [`base-game/adr/0033-final-asset-integration-timing.md`](../shrinkonauts/base-game/adr/0033-final-asset-integration-timing.md) — late art pass; minimal render changes recorded in ADR-0048.
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
- [Silkscreen](https://fonts.google.com/specimen/Silkscreen) — Jason Kottke, SIL Open Font License 1.1.
- [Pixelify Sans](https://fonts.google.com/specimen/Pixelify+Sans) — Stefie Justprince, SIL Open Font License 1.1.
- [Aseprite](https://www.aseprite.org/), [Piskel](https://www.piskelapp.com/), [LibreSprite](https://libresprite.github.io/) — pixel cleanup and palette quantisation.

---

## 15. Change log

| Date | Change |
|---|---|
| 2026-10-27 | Initial M3 asset requirements, style bible, Ludo prompt pack, and scope contract. |
| 2026-10-29 | Inlined STYLE and frame blocks into every prompt; one section per asset; added PARALLAX and ICON frame blocks. |
| 2026-10-29 | Pixel-art pivot: “Dank Anatomy Pixel Art”, half-res 2× rendering, pixel prompt pack, pixel UI chrome, ADR-0047–0049. |

---

**End of document.**
