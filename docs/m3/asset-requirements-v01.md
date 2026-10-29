# M3 Asset Requirements — Shrinkonauts: The Reflex Arc

**Status:** Draft v0.4 · 29 October 2026 (M1.8 pixel re-alignment)
**Owner:** Snorre  
**Scope:** Final 2D pixel art and audio for the M3 vertical slice  
**Target milestone:** M3 — Art/audio pass + capture (4–5 November 2026)  
**Governing decisions:** ADR-0029 (asset provider), ADR-0030 (sprite format), ADR-0031 (layered backgrounds), ADR-0032 (audio cues), ADR-0033 (final asset timing), ADR-0047 (pixel-art direction), ADR-0048 (2× pixel rendering), ADR-0049 (pixel UI chrome)  
**Related:** [`implementation-plan.md`](../shrinkonauts/base-game/implementation-plan.md) · [`contracts/pack-schema.md`](../shrinkonauts/base-game/contracts/pack-schema.md) · [`level-authoring.md`](../shrinkonauts/base-game/level-authoring.md) · [`DESIGN.md`](../shrinkonauts/DESIGN.md) · [`learning-design-brief.md`](../shrinkonauts/learning-design-brief.md) · [`cards/`](../shrinkonauts/base-game/cards/) · [`adr-m3/`](../adr-m3/README.md)

> **The rule for this milestone:** art follows the capture list, not the level list. M3 is not a five-level art production. It is one coherent vertical slice that appears in the 2-minute video, the GDD, and the playtest build.

> **Visual pivot (2026-10-29).** The project has moved from the hand-drawn “Dank Anatomy Cartoon” direction to **“Dank Anatomy Pixel Art”** across the world and the UI. This revision keeps the v0.3 M1.8 scope: 21 visible images, two material atlases, 04 authored, and the M1.9/M4 boundaries. §4, §6, §7, §8, §9 and ADR-0047–0049 replace the hand-drawn rendering rules; ADR-0027 remains in force for licensing and audio.

---

## 0. Summary

| Decision | Value |
|---|---|
| Art scope | `03-nerve-forest` environments + shared final entity sprites |
| Visible images | **21** — 20 referenced by the authored 03/04 rooms, plus 1 reserve (`sprite.scan.reflex`) |
| Audio cues | **11** — M3 scope; the pack also declares `audio.cue.wrong`, which stays placeholder |
| Total M3 assets | **32** |
| Style | **Dank Anatomy Pixel Art** |
| Rendering | **Half-res source, 2× nearest-neighbour display** |
| Tool | **Ludo.ai concepts + Aseprite/Piskel pixel cleanup; Ludo.ai Audio Generator** |
| Ludo plan | **Indie, $20/mo** (Pro only if automation or scope grows) |
| Free-tier use | Six-asset concept/style gate only |
| Animation | **None** — the runtime renders single images |
| UI | **8-bit pixel chrome; Silkscreen + Pixelify Sans; badge is the only rendered UI image** |
| UI panels/portraits | **Deferred** — not rendered by the current UI |
| Music | **Deferred** — not played by the current runtime |
| Levels 01, 02, 05, Silicon | **Deferred** — design proposals exist, but the pack content is not implemented |
| Level 04 | **Authored**; shares the final entity sprites, but its backgrounds, muscle/membrane tiles and `sprite.gate.nerve` stay placeholder art |
| Material atlases | **2 final atlases**: bone (`blob47`, 47 regions) and nerve (`edge`, 16 regions), authored as 32×32 frames at 1:1 with 2×2 clusters. The current pack still has one `tile.anatomy.atlas` placeholder |
| Prompt version | **`m3-2026-10-29.2`** (pixel re-alignment) |
| Content dependency | **Puzzle-specific props are checked against the authored 03/04 rooms**; do not generate props the rooms do not reference |

> **Content dependency.** The pack implements Node Run in `03-nerve-forest` and
> Endplate Ferry in `04-muscle-effector`; the earlier Signal Ferry layout is
> retained only as a test fixture. Check every puzzle-specific prop against the
> authored rooms before generation. `sprite.scan.reflex` is declared but not
> referenced by either room and is a reserve, not a capture blocker. See §2.4
> before generating gates, tracers, receptors, or pulse terminals.

---

## 1. Purpose

This document defines exactly what final pixel art and audio the M3 art pass requires, what the visual style is, how each asset is generated and cleaned up, and how the result is accepted. It exists to prevent six failure modes:

1. **Scope creep** — trying to art five levels plus a Silicon fixture.
2. **Style drift** — producing assets that do not share one pixel grid, palette, and silhouette language.
3. **Engine mismatch** — producing animated spritesheets, fractional scales, or UI skin assets the runtime cannot display cleanly.
4. **Faux-pixel output** — AI images with mixed pixel sizes, anti-aliased edges, or painterly detail pretending to be pixel art.
5. **Licensing ambiguity** — shipping AI-generated assets or fonts without a clear tool, plan, prompt, and licence record.
6. **Readability loss** — chunky pixels that stop reading at 28×44, 36×36, 32×32 atlas frames, or 16 px UI text.

This is a production document, not a GDD. The game design source remains [`DESIGN.md`](../shrinkonauts/DESIGN.md); the learning contract remains [`learning-design-brief.md`](../shrinkonauts/learning-design-brief.md); the architecture remains the [`base-game/`](../shrinkonauts/base-game/) docs.

---

## 2. Scope contract

### 2.1 In scope for M3

| Category | Count | Notes |
|---|---:|---|
| Player sprites P1/P2 | 2 | Shared across all levels |
| Visible shared entity sprites | 12 | 11 referenced by 03/04; `sprite.scan.reflex` is a reserve |
| `03-nerve-forest` background layers | 4 | Sky, far, mid, near |
| Final material atlases (bone, nerve) | 2 | 47-frame `blob47` bone atlas; 16-frame `edge` nerve atlas |
| Badge | 1 | The only UI asset currently rendered |
| **Visible images subtotal** | **21** | 20 referenced + 1 reserve |
| SFX cues | 11 | `audio.cue.wrong` is outside the M3 scope |
| **M3 total** | **32** | 21 images + 11 audio |

**Pixel authoring.** Players 14×22, entities 18×18, atlas frames 32×32 at 1:1 with 2×2 clusters, sky 640×368, parallax 1024×512 with 2×2 clusters, badge 16×16. See §3 and §6.

### 2.2 Deliberately out of scope

| Item | Count | Reason |
|---|---:|---|
| `ui.icon.scan`, `ui.icon.map`, `ui.icon.log` | 3 | Declared in the theme but not rendered by the current UI |
| `ui.portrait.neuron` | 1 | Not rendered |
| `ui.panel.dialogue`, `panel.gate`, `panel.debrief`, `panel.map` | 4 | Not rendered |
| `sprite.checkpoint` | 1 | Declared but not referenced by the authored rooms |
| `sprite.gate.nerve` | 1 | Referenced by 04's Ca²⁺ gate, but 04 props stay placeholder art in M3 |
| `audio.cue.wrong` | 1 | Declared in the theme and manifest; outside the 11-cue M3 scope |
| Animated sprite sheets / GIF loops | — | The runtime loads sheets but does not create animations |
| Music loop / ambience | — | Music playback is deferred |
| Levels `01-bone-gate`, `02-joint-chamber`, `05-reflex-core` | 3 | Design proposals exist in [`docs/m2/nervous-puzzles/`](../m2/nervous-puzzles/), but the pack content is not implemented |
| Silicon fixture | 1 | Design proposal exists; not implemented in the pack |
| Full key rebinding, capture-mode UI, new UI layout | — | Engine/UI tasks, not art-pass tasks |

The deferred UI assets remain declared as placeholders. They will not appear in the build and do not block M3 capture. `sprite.scan.reflex` is a reserve in the 21-image list: it is not referenced by 03/04 and does not block capture.

### 2.3 Scope rules

1. **One environment.** Final environment art is produced for `03-nerve-forest`. The shared entity sprites are final because 03/04 reference them; 04 backgrounds, muscle/membrane tiles and `sprite.gate.nerve` stay placeholder. Other levels get art only after they are authored, pass validation, and appear in the capture list.
2. **No new asset IDs during M3.** If a level needs a new ID, that is a content/engine task with an ADR, not an art-pass improvisation.
3. **No gameplay code changes.** ADR-0033 forbids mixing the art pass with gameplay changes. The pixel pivot needs a small, recorded render change (`pixelArt`, `antialias`, `roundPixels`, integer background scaling) under ADR-0048; nothing in `src/game`, `src/puzzle`, or the physics/runtime modules changes.
4. **Static sprites only.** The current `world` adapter uses Phaser images, not animations. Animated sheets would display frame 0 only.
5. **Reuse the shared kit.** Players, material atlases, badge, and audio cues are shared. Do not generate per-level duplicates.
6. **Placeholders are an acceptable fallback.** A coherent placeholder build is better than a half-finished final build. The validator already supports declared placeholders.
7. **Three pixel anchors.** Characters and props derive from the approved P1 pixel anchor; backgrounds derive from the approved sky; atlases derive from approved material swatches. The category style blocks in §8 are the same for every asset in a category, and every source pixel is placed on the 2× grid.

### 2.4 Content dependency

The pack now implements **Node Run** in `03-nerve-forest` and **Endplate
Ferry** in `04-muscle-effector`. The earlier Signal Ferry layout remains only
as a test fixture. Re-check this inventory against the authored rooms before
generating puzzle-specific props.

| Asset group | Status | Reason |
|---|---|---|
| Players, badge, sky, far/mid/near | **Safe to generate** | Shared or environment-level; unaffected by puzzle changes |
| Material atlases | **Generate the swatches now; wire after the tint decision** | The region maps are fixed in §8.21; the pack still uses one placeholder atlas |
| Neuron Keeper, scan targets | **Generate after the scan list is checked** | `scan.neuron` and `scan.pathway` are used in 03; `scan.synapse` and `scan.muscle` are used in 04 |
| `sprite.gate.ferry`, `sprite.prop.tracer`, `sprite.pulse.terminal`, `sprite.receptor.triangle`, `sprite.receptor.circle` | **Check the authored 03/04 rooms** | These props are referenced by the current Node Run/Endplate Ferry content |
| `sprite.exit` | **Safe** | The exit remains even if the gate changes |
| `sprite.scan.reflex` | **Reserve only** | Not referenced by 03/04; generate only if 05 is authored or the capture needs it |
| `sprite.gate.nerve` | **Placeholder only** | 04's Ca²⁺ gate references it, but 04 props are outside M3 final art |
| SFX | **Safe** | Cue vocabulary is stable; `audio.cue.wrong` is outside M3 |

**Action:** keep this inventory aligned with the actual `room.json`,
`puzzle.json`, and `assets.final.json`. Do not spend M3 credits on props the
authored rooms do not use.

> **M1.8 material/pattern re-baseline.** ADR-0014–0017 ship material grids,
> autotiling, variants, world/object/background pattern projection, atlas
> assets, and UI material slots. The M1.8 placeholder proof materializes both
> 03 and 04. M3 final environment art remains scoped to 03: provide bone and
> nerve material atlases for 03; 04 muscle/membrane tiles remain placeholders.
> The final art target is two atlases (`tile.bone.atlas`, `tile.nerve.atlas`),
> but the current pack still has one `tile.anatomy.atlas` and maps
> `nerve-edge` to it. Repointing the pack is a content task, not an art task.
> The bone material also has no variant set yet; the final bone atlas needs a
> `bone-blob47` variant set before it can render.
>
> **Pixel atlas authoring.** Keep the 32×32 material frame size so the
> autotile/variant grid does not change. Author each frame at 1:1 with a 2×2
> minimum cluster grid; assemble the 256×192 bone and 128×128 nerve atlases in
> Aseprite. The runtime tint decision in §8.21.1 still applies.

> **M4 online co-op dependency (proposed).** M4 adds no new M3 asset IDs. Both
> host and guest load the same static manifest; audio remains local; capture
> mode remains local-only. Do not add per-client art or streamed textures for
> online play. See [`../m4/README.md`](../m4/README.md) and
> [`../adr-online/0052-composition-with-planned-milestones.md`](../adr-online/0052-composition-with-planned-milestones.md).

> **M1.9 bathroom hub dependency.** The bathroom hub is a separate content root
> with its own IDs and placeholder manifests (`public/hub/bathroom/`). Those
> assets are **not** part of this 21-image M3 scope. Final hub art belongs to a
> small M3.5 pass; the hub ships with coherent placeholders in the meantime. See
> [`../m1.9/README.md`](../m1.9/README.md).

---

## 3. Runtime constraints that shape the art

These are current implementation facts plus the render changes recorded in ADR-0048. Sizes are exact; do not “fix” them in export.

| Constraint | Evidence | Consequence for M3 |
|---|---|---|
| Players are displayed at **28×44 px** | `src/world/physics.ts` (`PLAYER_WIDTH`, `PLAYER_HEIGHT`) | Author at **14×22**, displayed at 2×. Do not export 28×44 or the sprite will lose its chunky grid. |
| Entities are displayed at **36×36 px** | `src/world/room-scene.ts` (`ENTITY_SIZE = 36`) | Author at **18×18**, displayed at 2×. Design for 36 px readability. |
| The room uses **material grids and atlases** (`tileSize: 32`) | `room.json` (`tileMaterials`), `materials.json`, `room-scene.ts` | 03 needs bone/nerve atlas frames; 04 muscle/membrane tiles stay placeholder. |
| Atlas frames are **32×32** and the frame grid is fixed | `materials.json`, `room-scene.ts` | Keep **32×32 frames at 1:1**, authored with a 2×2 minimum cluster grid. Do not change the frame size to 16×16. |
| The current pack has **one placeholder atlas** | `assets.final.json` (`tile.anatomy.atlas`), `materials.json` (`nerve-edge`) | Final art targets two atlases; the pack mapping is a separate content task. |
| Final atlas frames are **tinted by the material** | `room-scene.ts` (`materialTint`) | Either author neutral atlases and keep `tint`, or remove the bone/nerve `tint` when final coloured atlases land. Do not double-tint. |
| Background far/mid/near use `fit: "tile"` | `room.json`, `src/world/background.ts` (`TileSprite`) | Author **1024×512** with a 2×2 minimum cluster grid; tile on **both axes**. |
| The sky uses `fit: "cover"` | `src/world/background.ts` | Author **640×368**, displayed at an integer 2× cover. The current `coverScale * 1.4` path must be replaced by integer cover (ADR-0048). |
| The renderer is currently smooth-scaled | `src/world/create-game.ts` (`pixelArt: false`, `antialias: true`) | Target config: `pixelArt: true`, `antialias: false`, `roundPixels: true`. |
| Spritesheets are loaded but not animated | `room-scene.ts` loads `type: "sheet"` but creates `this.add.image(...)`; no `this.anims.create(...)` | Use static `sprite` entries and single PNG/WebP images. |
| Only the badge UI asset is rendered | `src/ui/hud.ts` (`styleBadge`, `.hud__stamp--image`) and `src/game/boot.ts` | Author **16×16**; the current HUD displays a ~45×27 CSS px pill with `cover`. The pixel UI target is a 32×32 square stamp. |
| Entity sprites are briefly tinted on interaction | `room-scene.ts` (`applyInteractionHighlight`, `0xffe08a`) | Check every entity sprite under a warm tint; cyan/yellow details must survive. |
| Capture mode is deferred | `IMPLEMENTATION.md` status table | Clean 16:9 capture is an M2/M3 engine task; do not assume `?capture=1` exists. |
| Music playback is deferred | `IMPLEMENTATION.md` status table | Do not generate a music loop for M3. |
| No web font is loaded today | `index.html`, `theme.json` | The pixel UI pass must bundle **Silkscreen** and **Pixelify Sans** (OFL) and register them through `@font-face`; no external font CDN. |

---

## 4. Art direction: “Dank Anatomy Pixel Art”

### 4.1 One-line direction

**A grimy, gross-cute pixel-art biology world: chunky 2× pixel clusters, damp membrane dithering, deadpan cell workers, and a tiny scuffed astronaut who is very tired of being inside somebody.**

### 4.2 Visual pillars

1. **Pixel-first 2D** — native pixel grid, hard square pixels, 1px dark teal-brown outlines at source resolution, no anti-aliasing.
2. **Chunky but textured** — three-step colour ramps, 50% dither for damp and grimy surfaces, minimum 2×2 colour blocks at display size.
3. **Damp and grimy** — membrane sheen, condensation, dust, mineral grit, scuffed suit, discoloured tissue; built from dither and palette, never from gradients.
4. **Gross-cute, not edgy** — weird, fleshy, and funny; never gory, never shock humour.
5. **Readable at actual size** — 28×44 player, 36×36 entities, 32×32 atlas frames. Silhouette first; no fine detail.
6. **Body as a workplace** — cells are tired workers with jobs, not monsters.
7. **Side-view platformer** — characters in side or slight 3/4 view; backgrounds orthographic side view.
8. **Chunky silhouette, not copied content** — big head/helmet, short body, chunky boots, strong outline. No copied characters, no top-down perspective, no religious horror, no gore.
9. **Shared material language** — tiles, objects, backgrounds, and UI panels use the same material and pattern vocabulary; bone, nerve, muscle, and membrane must feel like one body.

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
- Material patterns use the same ramps. Do not generate a separate material palette.

### 4.4 Character rules

- **Player:** bulky retro-futuristic life-support suit; cream/bone shell; dark teal joints; round helmet with warm amber visor; yellow backpack tanks; cyan chest light; scanner gauntlet; short legs; big boots; scuffed and patched. No visible face. No sleek armour. No shiny plastic.
- **Player pixel build:** 14×22 source grid; 1px outline; helmet 7–8 px across; visor 3–4 px; torso 8–10 px wide; boots 3 px; backpack 4×6 px; scanner gauntlet 2×2 px. The silhouette must read at 28×44.
- **P1/P2 differentiation:** P1 uses joint-cyan accents; P2 uses muscle-pink accents. Keep the silhouette identical.
- **Cells:** characters first, diagrams second. Big expressive eyes built from 2×2 blocks, simple body, tiny 1–2 px limbs, one job prop, one personality prop. No human faces, no sexualised cells, no gore.
- **Cell colour families:** neuron = nerve/bone; osteocyte = bone/dust; synoviocyte = amber/cyan; muscle effector = muscle/rust; reflex core = bone/danger pink; Silicon = graphite/cyan.
- **Props:** 18×18 source grid; strong iconic silhouette; 1px dashed cyan scan rim for scannable objects; nerve-yellow core for interactables.
- **No text on any sprite.** Labels and numbers are UI, not art.

### 4.5 Environment and material rules

- The body is a **landscape**, not a cutaway textbook diagram. Anatomy is architecture: nerve bundles as trees, myelin as bark, synapses as lanterns, bone as cliffs, cartilage as glass, membranes as wet fabric.
- **Damp, humid, breathing.** Build condensation, sheen, dust, and membrane folds from dither patterns; no smooth gradients.
- **Dark enough for HUD.** Keep the centre and lower third of the sky relatively dark so the yellow/cyan HUD and player silhouettes read.
- **No labels, arrows, or diagram lines.** The scan system supplies meaning.
- **Layered depth:** far = large slow shapes; mid = branching structures; near = dark framing silhouettes with large transparent gaps.
- **Tileable layers:** far/mid/near must repeat without a visible seam or obvious focal object. Author at 1024×512 with 2×2 minimum clusters; the runtime tiles them 1:1.
- **Integer sky:** author at 640×368; the runtime displays it at an exact 2× cover. No fractional scaling.
- **Material atlases:** keep 32×32 frames at 1:1; author each frame with a 2×2 minimum cluster grid. Bone is hard mineral; nerve is soft fibrous. Do not bake a directional edge; the autotile mask selects the edge. Assemble the 47 bone and 16 nerve frames in Aseprite.
- **Patterns:** world, object, background, and UI patterns use the same ramps and dither. The runtime bone-cortex overlay on the 03 mid layer means the mid art must not bake a competing bone texture.

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
| Keep atlas frames neutral and tileable | Bake a single directional edge or a final tint into every frame |

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

| Bucket | Count | Note |
|---|---:|---|
| Visible M3 images | 21 | 20 referenced by authored rooms + 1 reserve (`sprite.scan.reflex`) |
| SFX cues | 11 | `audio.cue.wrong` is outside M3 |
| **M3 production total** | **32** | 21 images + 11 audio |
| Deferred UI images | 8 | Badge is the only rendered UI image |
| **Current manifest entries** | **47** | Includes 12 audio; the final two-atlas layout adds one atlas entry |

### 5.2 Shared kit

| Asset ID | Type | Display size | Source size | File path | Priority |
|---|---|---:|---:|---|---|
| `sprite.player.p1` | sprite | 28×44 | 14×22 PNG | `shared/sprites/player-p1.png` | P0 |
| `sprite.player.p2` | sprite | 28×44 | 14×22 PNG | `shared/sprites/player-p2.png` | P0 |
| `tile.bone.atlas` | atlas | 32×32 frames | 256×192 PNG atlas (8×6 grid; 47 `blob47` frames + 1 empty cell), 1:1 with 2×2 clusters | `shared/tiles/bone-atlas.png` | P1 |
| `tile.nerve.atlas` | atlas | 32×32 frames | 128×128 PNG atlas (4×4 grid; 16 `edge` frames), 1:1 with 2×2 clusters | `shared/tiles/nerve-atlas.png` | P1 |
| `ui.icon.badge` | image | ~45×27 CSS px HUD pill; 32×32 pixel-UI target | 16×16 PNG | `shared/ui/badge.png` | P2 |

> **Pixel rule:** author at the source size shown. Players, entities, and the badge display at exactly 2×; atlas frames stay 32×32 at 1:1 with a 2×2 cluster grid. Do not export at the display size.

### 5.3 Shared visible entity sprites

> **Rendered-in column:** this is the actual authored usage. The M3 final-art
> scope covers the 11 referenced sprites and keeps `sprite.scan.reflex` as a
> reserve. 04 shares these sprites even though its environment remains
> placeholder art.

| Asset ID | Entity role | Rendered in | Display / source | File path | Priority |
|---|---|---|---:|---|---|
| `sprite.agent.neuron` | Neuron Keeper; 04's Muscle Effector agent currently reuses this ID | 03, 04 | 36×36 / 18×18 PNG | `shared/sprites/agent-neuron.png` | P0 |
| `sprite.scan.neuron` | Neuron, myelin sheath and dendrite input pads | 03 | 36×36 / 18×18 PNG | `shared/sprites/scan-neuron.png` | P0 |
| `sprite.scan.synapse` | Terminal plate, synaptic cleft and receptor scans | 04 | 36×36 / 18×18 PNG | `shared/sprites/scan-synapse.png` | P1 |
| `sprite.scan.pathway` | One-way pathway and axon terminal | 03 | 36×36 / 18×18 PNG | `shared/sprites/scan-pathway.png` | P1 |
| `sprite.scan.muscle` | Muscle effector scan | 04 | 36×36 / 18×18 PNG | `shared/sprites/scan-muscle.png` | P1 |
| `sprite.scan.reflex` | Reflex-arc scan, reserve | — | 36×36 / 18×18 PNG | `shared/sprites/scan-reflex.png` | P2 |
| `sprite.gate.ferry` | Threshold, one-way, exit and muscle gate | 03, 04 | 36×36 / 18×18 PNG | `shared/sprites/gate-ferry.png` | P0 |
| `sprite.exit` | Level exit and muscle lever | 03, 04 | 36×36 / 18×18 PNG | `shared/sprites/exit.png` | P1 |
| `sprite.prop.tracer` | ACh packet | 04 | 36×36 / 18×18 PNG | `shared/sprites/prop-tracer.png` | P1 |
| `sprite.pulse.terminal` | Motor terminal | 04 | 36×36 / 18×18 PNG | `shared/sprites/pulse-terminal.png` | P1 |
| `sprite.receptor.triangle` | Nicotinic receptor | 04 | 36×36 / 18×18 PNG | `shared/sprites/receptor-triangle.png` | P1 |
| `sprite.receptor.circle` | Wrong receptor | 04 | 36×36 / 18×18 PNG | `shared/sprites/receptor-circle.png` | P1 |

### 5.4 Backgrounds

| Asset ID | Ludo type | Source size | File path | Priority |
|---|---|---|---:|---|---|
| `bg.nerve_forest.sky` | Background | 640×368 WebP/PNG, integer 2× cover | `shared/backgrounds/nerve-forest-sky.webp` | P0 |
| `bg.nerve_forest.far` | Parallax layer | 1024×512 PNG/WebP, transparent, 2×2 clusters | `shared/backgrounds/nerve-forest-far.webp` | P1 |
| `bg.nerve_forest.mid` | Parallax layer | 1024×512 PNG/WebP, transparent, 2×2 clusters | `shared/backgrounds/nerve-forest-mid.webp` | P0 |
| `bg.nerve_forest.near` | Parallax layer | 1024×512 PNG/WebP, transparent, 2×2 clusters | `shared/backgrounds/nerve-forest-near.webp` | P1 |

The `bg.muscle_endplate.*` layers used by 04 are **not** in this M3 pass; they
stay placeholder. The 03 mid layer receives a runtime bone-cortex pattern
overlay at low opacity, so the mid art must not bake a competing bone texture.

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

`theme.json` and `assets.final.json` also declare `audio.cue.wrong`. It is not
part of the 11-cue M3 pass and stays placeholder; if the capture needs it, add
it as a 12th cue and change the total to 33.

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

Other placeholders outside the 21-image M3 pass:

- `sprite.checkpoint` — declared, not referenced by the authored rooms.
- `sprite.gate.nerve` — 04's Ca²⁺ gate references it, but 04 props remain placeholder art in M3.
- `audio.cue.wrong` — declared, outside the 11-cue M3 scope.
- `tile.anatomy.atlas` — current single placeholder atlas; keep it until the two final atlases are wired.
- `bg.muscle_endplate.*` — 04 background placeholders.

### 5.7 File naming

Use lowercase kebab-case, no spaces, no dots in filenames.

| Asset ID | File |
|---|---|
| `sprite.player.p1` | `shared/sprites/player-p1.png` |
| `sprite.agent.neuron` | `shared/sprites/agent-neuron.png` |
| `sprite.scan.neuron` | `shared/sprites/scan-neuron.png` |
| `sprite.gate.ferry` | `shared/sprites/gate-ferry.png` |
| `bg.nerve_forest.sky` | `shared/backgrounds/nerve-forest-sky.webp` |
| `tile.bone.atlas` | `shared/tiles/bone-atlas.png` |
| `tile.nerve.atlas` | `shared/tiles/nerve-atlas.png` |
| `ui.icon.badge` | `shared/ui/badge.png` |
| `audio.cue.scan` | `shared/audio/scan.ogg` |

---

## 6. Technical specifications

### 6.1 Dimensions and formats

| Asset type | Author/source | Runtime display | Scale | Format |
|---|---|---|---|---|
| Player | 14×22 | 28×44 | 2× | PNG with alpha |
| Entity | 18×18 | 36×36 | 2× | PNG with alpha |
| Background sky | 640×368 | 1280×736 cover | 2× | lossless WebP or PNG, opaque |
| Parallax layer | 1024×512, 2×2 clusters | tile on both axes | 1:1 | lossless WebP or PNG with alpha |
| Material atlas — bone | 256×192 PNG, 8×6 grid of **32×32 frames**, 2×2 clusters | 32×32 frames | 1:1 | PNG, opaque cells; 47 `mask-*` regions + 1 empty cell |
| Material atlas — nerve | 128×128 PNG, 4×4 grid of **32×32 frames**, 2×2 clusters | 32×32 frames | 1:1 | PNG, opaque cells; 16 `mask-*` regions |
| Badge | 16×16 | 32×32 pixel-UI target; current ~45×27 CSS pill | 2× | PNG with alpha |
| Audio | 48 kHz | — | — | OGG or MP3 |

Do not export upscaled 2× or 4× versions. The engine performs the 2× nearest-neighbour display for players, entities, and the badge. Do not use JPG or lossy WebP for pixel art; lossy compression creates colour noise that breaks the palette.

### 6.2 Alpha and trimming

1. Generate the concept on flat magenta `#FF00FF`.
2. Pixel at the source size in Aseprite, Piskel, or LibreSprite.
3. Remove the background; inspect edges at 400% and remove magenta fringe.
4. Trim to the alpha bounding box.
5. Pad to the fixed source canvas:
   - Player: 14×22, feet on the bottom padding line, 0–1 px transparent margin.
   - Entity: 18×18, base of the lowest visible element on the bottom padding line, 1 px margin.
   - Badge: 16×16, critical detail inside the middle 60% vertical band.
   - Atlas: no padding, no alpha; each 32×32 cell is edge-to-edge and opaque.
6. Do not bake drop shadows, ground shadows, pedestals or glow into any sprite. The engine adds its own shadow, glow and interaction tint.

> **Critical:** author the player at **14×22**, not 28×44, and the entity at **18×18**, not 36×36. The engine sets the texture to 28×44 / 36×36, so the half-res source displays at exactly 2× and matches the atlas and parallax cluster density.

### 6.3 Tileability and pixel grid

- One source pixel becomes a **2×2 display block** for players, entities, the sky, and the badge.
- Parallax layers are authored 1:1, so every colour block must be at least **2×2 pixels** to match the effective density.
- Atlas frames are authored 1:1 at 32×32, so every colour block must also be at least **2×2 pixels**. Keep the 32×32 frame size; do not switch to 16×16 frames.
- A 1 px source outline becomes a 2 px outline on screen for 2× sprites; atlas frames use 1 px source outlines at 1:1.
- No anti-aliasing, no soft edges, no semi-transparent fringe on sprites. Alpha is 0 or 255 except for intentional UI/engine effects.
- Every pixel comes from the ramps in §4.3. Quantise after any resampling; never resample with bilinear filtering.
- No fractional scaling, rotation, or sub-pixel placement inside an exported asset.
- Do not mix pixel densities within one asset or across the kit.

### 6.4 Background and atlas tiling

- Far/mid/near must tile **horizontally and vertically** in Phaser’s `TileSprite`.
- Verify with a 2×2 repeat at 2048×1024 (native) and at 1280×720 (runtime), not by looking at one image.
- Avoid a single strong landmark that repeats obviously.
- Keep large transparent gaps in the near layer so the room remains playable; no opaque band across the centre or lower third.
- The material atlas frames must tile on all four sides at 32×32. Autotile edges are drawn by the frame selected from the material mask; do not bake a single directional top edge into every frame.
- Ludo does not output a named atlas. Generate one seamless 1024×1024 material swatch concept, pixel-clean it to a 512×512 working swatch with 2×2 clusters, then assemble the 47 bone frames or 16 nerve frames in Aseprite. Apply edge occlusion only on the sides where the mask bit is absent.
- The sky is 640×368 and displayed at an exact 2× cover. The 16:9 capture crops the extra 16 px of height.

### 6.5 Anchors and padding

- Player origin is bottom-centre; feet must sit on the bottom padding line of the 14×22 alpha box.
- Entity origin is bottom-centre; the base of the lowest visible element must sit on the bottom padding line of the 18×18 alpha box. For floating scan icons or props, the lowest point still defines the baseline.
- Keep a consistent baseline across scan targets, gates, exits, props and receptors.
- Do not add an artificial pedestal or ground line.
- The engine flips player sprites horizontally; do not bake a one-sided asymmetric detail that breaks the character when mirrored.

### 6.6 Budgets

These are project budgets, not engine limits. Pixel art compresses well; a larger file usually means the grid or palette is wrong.

| Asset | Budget |
|---|---|
| Player PNG | ≤ 16 KB each |
| Entity PNG | ≤ 16 KB each |
| Background sky | ≤ 300 KB |
| Parallax layer | ≤ 300 KB each |
| Bone atlas PNG | ≤ 80 KB |
| Nerve atlas PNG | ≤ 80 KB |
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
| `tile.*.atlas` | `atlas` |
| `tileset.*`, `ui.*` | `image` |
| `audio.*` | `audio` |

Do not use `sheet`, `gif`, or `webp` animation types in M3. They are valid formats but the current view layer will not animate them.

---

## 7. Pixel workflow

### 7.1 Tool, plan, and source of truth

- **Ludo.ai → Image Generator** for concepts, silhouettes, palette studies, and material swatches. Ludo is not the final pixel renderer.
- **Aseprite, Piskel, or LibreSprite** for the final pixel pass at source size, palette quantisation, and atlas assembly.
- **Ludo.ai → Audio Generator** for the 11 SFX.
- The source of truth is this document, the category style blocks in §8, and the prompt version. Do not improvise a new style per asset.
- Start on the **free tier** for the six-asset concept/style gate.
- Buy **Indie ($20/mo)** for production. Do not buy Pro unless you need API/MCP/CLI or the scope grows beyond this document.
- Do not buy annual billing for a short art pass.

### 7.2 What Ludo can and cannot produce

Ludo can produce a concept, a silhouette, a palette study, a seamless material swatch concept, and a readable composition.

Ludo cannot reliably produce:

- a named atlas with 47 or 16 mask regions;
- a valid autotile grid;
- a runtime-sized sprite with the correct alpha box;
- a guaranteed transparent cutout;
- a consistent 2×2 pixel grid;
- an exact palette without cleanup.

Treat every Ludo output as a concept. The final asset is authored or cleaned at source size in Aseprite/Piskel.

### 7.3 Settings

| Setting | Value |
|---|---|
| Asset type | Sprite / Background / Parallax layer / Texture or Pattern / Icon, as appropriate |
| Style | Pixel art: hard edges, limited palette, 1px outlines, no anti-aliasing |
| Reference | `style-anchor-p1.png` for characters/props; `style-anchor-sky.png` for backgrounds; approved bone/nerve swatch for atlases |
| Variations | 4 per prompt |
| Resolution | 1024 px on the long edge for concepts; final art authored at source size |
| Aspect | 1:1 sprites/props/atlas swatches/badge; wide sky; 2:1 parallax |
| Background | Flat magenta `#FF00FF` |
| Negative prompt | Use the matching block in §8.6–8.9 if the field exists; otherwise append it to the prompt |

If Ludo’s UI labels differ, map to the closest equivalent. The prompt blocks are the source of truth for the concept; the pixel pass is the source of truth for the final asset.

### 7.4 Reference images and approval gates

1. Generate **P1** first, four concepts.
2. Pick the one that reads best as a 14×22 silhouette and matches the palette.
3. Pixel-clean it at 14×22; approve it at 28×44 on a dark teal background.
4. Save it as `style-anchor-p1.png`; keep a 4× nearest-neighbour preview for review.
5. Use it as the style reference for every later character, prop, and icon. Do not use it as an image-to-image base for NPCs — it may copy the astronaut.
6. Generate the **sky** next; approve `style-anchor-sky.png` at 1280×720 and use it for far/mid/near.
7. Generate the **bone and nerve swatches**; approve each at 32×32 before assembling the atlas.
8. Approve the **badge** at its current pill crop and at the 32×32 pixel-UI target.

### 7.5 Batch order

| Batch | Assets | Purpose |
|---|---|---|
| 0 | P1 | Pixel style anchor |
| 1 | P2, Neuron Keeper, `scan.neuron`, `sprite.exit` | Character/prop style gate |
| 2 | Sky, mid layer | Environment style gate |
| 3 | Bone and nerve material swatches | Material style gate |
| 4 | Remaining scans, tracer, pulse terminal, receptors, gate ferry | Complete visible entity set — only after the 03/04 room check |
| 5 | Far, near, badge | Complete environment/UI kit |
| 6 | 11 SFX and atlas assembly | Audio and atlas finish |

Do not start Batch 4 until Batches 1–3 are signed off. Do not assemble the final atlases until the tint decision in §8.21.1 is made.

### 7.6 How to run a prompt

1. Copy the complete prompt for the asset from §8: `STYLE_<CATEGORY>` + asset prompt + `FRAME_<CATEGORY>`.
2. Add the matching `NEGATIVE_<CATEGORY>` to Ludo’s negative field, or append it when no field exists.
3. Generate four concepts.
4. Pick the best; download the full-resolution concept.
5. Pixel the asset at source size: 14×22 player, 18×18 entity, 640×368 sky, 1024×512 parallax, 512×512 material swatch, 16×16 badge.
6. Quantise to the ramp palette; remove anti-aliasing; enforce the 2×2 cluster rule on 1:1 layers and atlas frames.
7. Export at source size; inspect at 400%; check at display size on a dark teal contact sheet.
8. Record the prompt, concept file, pixel-cleanup notes, palette, and chosen file in the prompt log.
9. If it fails, change one variable (prompt phrase, reference, or cleanup step), not five.
10. Stop after three attempts; use a placeholder if still failing.

### 7.7 Post-processing and export

- **Sprites/entities:** trim to the alpha bounding box, pad to 14×22 or 18×18, feet/base on the bottom line; export PNG.
- **Backgrounds:** sky 640×368 opaque; far/mid/near 1024×512 with alpha and 2×2 clusters; export lossless WebP or PNG.
- **Atlases:** assemble 32×32 cells at 1:1 from the approved swatch; 8×6 bone grid (47 regions + one opaque empty cell), 4×4 nerve grid (16 regions); every cell opaque; export PNG. Do not add gutters or transparent seams.
- **Badge:** 16×16 source, transparent or magenta-keyed; critical detail inside the middle 60% vertical band; export PNG.
- **Palette:** quantise every asset to the §4.3 ramps. No intermediate blends, no stray colours.
- **No anti-aliasing:** no soft edges, no semi-transparent sprite fringe. Alpha is 0 or 255 except for intentional UI/engine effects.
- **No lossy compression:** do not use JPG or lossy WebP for pixel art.

### 7.8 Seam, atlas, and contact-sheet checks

- Parallax: 2×2 repeat at 2048×1024 and at 1280×720; no seam on either axis.
- Material atlas: 3×3 patch of every frame; no seam, no directional top edge; each mask variant is distinct.
- Source inspection: every asset at 400%; every pixel on the ramp palette; no anti-aliasing; no mixed pixel sizes.
- Contact sheet at 1280×720: P1/P2 at 28×44, entities at 36×36, sky at 1280×720, mid tiled 3×, badge at 32×32 and in the pill crop.
- Warm interaction tint check on every entity sprite.
- Review at 100% zoom, not on a large preview. If it does not read at actual size, it does not pass.

### 7.9 Stop rules

- Maximum **three attempts** per asset on free tier; maximum **two prompt revisions** per asset on paid.
- If a whole category fails, stop and revise the style anchor, not individual assets.
- If the generator cannot produce a usable concept, trace or draw the asset manually at source size. Do not ship faux-pixel output.
- If an asset needs new rendering behaviour beyond ADR-0048, stop; it is an engine task, not an art task.
- If the style gate fails, ship placeholders.

---

## 8. Copy-paste prompt pack

### 8.1 Assembly formula and versioning

```text
FINAL IMAGE PROMPT = STYLE_<CATEGORY> + ASSET PROMPT + FRAME_<CATEGORY>
NEGATIVE PROMPT     = NEGATIVE_<CATEGORY> (+ any asset delta)
```

- Copy the three blocks exactly. Do not paste the headings or the backticks.
- If Ludo has one prompt field, paste style, asset, frame, then `Negative prompt: ...` on a new line.
- If Ludo has a separate negative field, use it. Do not repeat the negative text inside the positive prompt.
- Prompt version: `m3-2026-10-29.2`. Increment the suffix on any text change.
- Style version: `style-pixel-v1` for all blocks in this revision. Increment when a style block changes.
- Ludo produces a concept. The final asset is pixel-cleaned at source size in Aseprite/Piskel (§7).
- One prompt produces one asset. Do not ask for a set, a grid, or a contact sheet in a sprite prompt.

### 8.2 STYLE_SPRITE

```text
Pixel art for a side-view 2D platformer set inside a living human body. Native pixel grid, hard square pixels, crisp edges, no anti-aliasing, no smoothing, no mixed pixel sizes. 1px dark teal-brown outlines at source resolution; flat fills from three-step ramps; 50% dither for damp membrane sheen, condensation, dust and grime. Gross-cute biology, wry deadpan tone, weird and fleshy but 12+ friendly: never gory, no shock humour. Palette ramps: teal #05090b #101a20 #1d2f38; bone #c9b79a #f2e8d5 #fff8e8; bone shadow #5f736e #7a8f8a #9db4ad; nerve #b8862b #ffd166 #fff3b0; joint #3f9fb5 #7bdff2 #c9f7ff; muscle #a82a4a #ef476f #ff9fb2; sage #6f847d #9db4ad #c4d4ce; ink #000000 #05090b #2a3f47. Strong readable shapes; characters and props must read at 28×44 and 36×36. Side view or slight 3/4 view. No text, no logo, no watermark, no border, no UI, no photorealism, no 3D, no painterly rendering, no smooth gradients, no anti-aliasing, no high-res detail, no faux-pixel mixed grids, no blood, no gore, no open wounds, no extra limbs, no detailed fingers, no baked drop shadow, no ground shadow.
```

### 8.3 STYLE_BACKGROUND

```text
Pixel art for a side-view 2D platformer set inside a living human body. Native pixel grid, hard square pixels, crisp edges, no anti-aliasing, no smoothing. Orthographic side view, landscape scale; atmospheric depth from layered values and dither, not a global gradient; local warm highlights only. Damp membrane sheen, condensation, dust and grime. Gross-cute biology, wry deadpan tone, 12+ friendly: never gory. Palette ramps: teal #05090b #101a20 #1d2f38; bone #c9b79a #f2e8d5 #fff8e8; bone shadow #5f736e #7a8f8a #9db4ad; nerve #b8862b #ffd166 #fff3b0; joint #3f9fb5 #7bdff2 #c9f7ff; muscle #a82a4a #ef476f #ff9fb2; sage #6f847d #9db4ad #c4d4ce; ink #000000 #05090b #2a3f47. No single directional light, no hard cast shadows, no god rays, no text, no logo, no watermark, no border, no UI, no labels, no arrows, no photorealism, no 3D, no painterly rendering, no smooth gradients, no anti-aliasing, no high-res detail, no faux-pixel mixed grids.
```

### 8.4 STYLE_ATLAS

```text
Pixel-art seamless material texture for a side-view platformer set inside a living human body. Native pixel grid, hard square pixels, every colour block at least 2×2 pixels, no anti-aliasing, no smoothing. Flat fills from three-step ramps; 50% dither; no smooth gradients. Uniform flat lighting; no directional highlight, no vignette, no baked edge shading, no bevel, no drop shadow, no grid. Orthographic surface, seamless material swatch. Palette ramps: teal #05090b #101a20 #1d2f38; bone #c9b79a #f2e8d5 #fff8e8; bone shadow #5f736e #7a8f8a #9db4ad; nerve #b8862b #ffd166 #fff3b0; joint #3f9fb5 #7bdff2 #c9f7ff; muscle #a82a4a #ef476f #ff9fb2; sage #6f847d #9db4ad #c4d4ce; ink #000000 #05090b #2a3f47. Gross-cute biology, wry deadpan tone, 12+ friendly. No text, no logo, no watermark, no border, no UI, no characters, no scene, no perspective, no 3D, no photorealism, no baked directional edge.
```

### 8.5 STYLE_BADGE

```text
Pixel-art game emblem for a dark-teal HUD. Native pixel grid, hard square pixels, 1px dark outline, no anti-aliasing, no smoothing. Flat fills from three-step ramps; one hard form shadow; one warm highlight; subtle grime. Gross-cute biology, wry deadpan tone, 12+ friendly. Palette ramps: teal #05090b #101a20 #1d2f38; bone #c9b79a #f2e8d5 #fff8e8; bone shadow #5f736e #7a8f8a #9db4ad; nerve #b8862b #ffd166 #fff3b0; joint #3f9fb5 #7bdff2 #c9f7ff; muscle #a82a4a #ef476f #ff9fb2; sage #6f847d #9db4ad #c4d4ce; ink #000000 #05090b #2a3f47. Simple, bold, readable at 32×32 and in a ~45×27 pill crop. No text, no logo, no watermark, no UI, no rectangular frame, no photorealism, no 3D, no painterly rendering, no smooth gradients, no high-res detail.
```

### 8.6 NEGATIVE_SPRITE

```text
text, letters, numbers, logo, watermark, border, UI, labels, arrows, diagram lines, anti-aliasing, smooth gradient, painterly, 3D render, photorealism, anime, clean vector, high-res detail, mixed pixel sizes, faux pixel art, blurry edges, glossy plastic, neon cyberpunk, purple, neon green, orange, pure red, blood, gore, open wound, viscera, exposed organs, extra limbs, detailed fingers, human face, multiple characters, scene background, ground, floor, pedestal, cast shadow, drop shadow, checkerboard, frame
```

### 8.7 NEGATIVE_BACKGROUND

```text
text, letters, numbers, logo, watermark, border, UI, labels, arrows, diagram, characters, creatures, astronaut, anti-aliasing, smooth gradient, painterly, 3D render, photorealism, anime, clean vector, high-res detail, mixed pixel sizes, faux pixel art, blurry edges, neon cyberpunk, purple, neon green, orange, pure red, blood, gore, viscera, exposed organs, hard horizon line, single focal landmark, high-contrast centre, opaque near-layer centre, obvious repeating object, frame
```

### 8.8 NEGATIVE_ATLAS

```text
text, letters, numbers, labels, grid lines, gutters, border, UI, logo, watermark, characters, scene, perspective, anti-aliasing, smooth gradient, painterly, 3D render, photorealism, directional light, baked highlight, baked edge, vignette, bevel, drop shadow, single dark top edge, checkerboard, frame, mixed pixel sizes, faux pixel art
```

### 8.9 NEGATIVE_BADGE

```text
text, letters, numbers, logo, watermark, UI, rectangular frame, outer frame line, anti-aliasing, smooth gradient, painterly, 3D render, photorealism, anime, clean vector, high-res detail, mixed pixel sizes, faux pixel art, glossy plastic, neon cyberpunk, purple, neon green, orange, pure red, blood, gore, extra characters, cast shadow, drop shadow, pedestal, scene, checkerboard
```

### 8.10 FRAME_PLAYER

```text
Full body, standing, facing right, feet on the bottom padding line, centred horizontally, 0–1 px transparent margin on a 14×22 canvas, isolated on a flat solid magenta #FF00FF background, no ground, no pedestal, no cast shadow, no scene, no frame. Hard pixel edges; no anti-aliasing. The engine displays the 14×22 source at 28×44.
```

### 8.11 FRAME_ENTITY

```text
Full object, centred, base of the lowest visible element on the bottom padding line, 1 px transparent margin on an 18×18 canvas, isolated on a flat solid magenta #FF00FF background, no ground, no pedestal, no cast shadow, no scene, no frame. Hard pixel edges; no anti-aliasing. The engine displays the 18×18 source at 36×36.
```

### 8.12 FRAME_SKY

```text
640×368, wide, opaque, edge-to-edge background plate, no frame. Keep the upper corners and lower third dark and low-contrast; keep important detail inside the central 70% for the 2× cover crop. Hard pixel edges; no anti-aliasing.
```

### 8.13 FRAME_PARALLAX

```text
1024×512, 2:1, transparent background, isolated layer, no frame. Tile seamlessly on all four edges; every colour block at least 2×2 pixels; verify as a 2×2 repeat at native size and at 1280×720. Hard pixel edges; no anti-aliasing.
```

### 8.14 FRAME_ATLAS

```text
1024×1024 seamless material swatch concept, uniform flat lighting, no grid, no labels, no frame, no directional highlight, no baked edge. Hard pixel edges; every colour block at least 2×2 pixels. Pixel-clean to a 512×512 working swatch; assemble 32×32 frames offline.
```

### 8.15 FRAME_BADGE

```text
16×16, 1:1, centred emblem, transparent or flat magenta #FF00FF background, no rectangular frame. Keep the helmet and visor inside the middle 60% vertical band; the current HUD displays a ~45×27 pill crop, the pixel UI target is 32×32. Hard pixel edges; no anti-aliasing.
```

### 8.16 Reference lock

| Asset group | Reference | Use | Do not |
|---|---|---|---|
| `sprite.player.p1` | None | Creates the pixel character anchor | Do not copy a known character |
| `sprite.player.p2` | `style-anchor-p1.png` | Image reference; accent-only change | Do not prompt a new character or pose |
| Agent, scans, gate, exit, props, receptors | `style-anchor-p1.png` | Pixel style reference | Do not use as an image-to-image base for cells |
| Sky | Style block; optional P1 at low strength | Creates the pixel environment anchor | Do not copy the astronaut into the scene |
| Far, mid, near | `style-anchor-sky.png` | Pixel style and palette reference | Do not introduce a new palette |
| Bone atlas | P1 for palette/line; approved bone swatch for frames | Style reference; self-reference for frames | Do not bake a directional edge or final tint |
| Nerve atlas | P1 for palette/line; approved nerve swatch for frames | Style reference; self-reference for frames | Do not bake a directional edge or final tint |
| Badge | `style-anchor-p1.png` | Style reference | Do not include a character scene |

If a reference is missing, do not substitute another character. Either generate the anchor first or use the style block only.

### 8.17 Player prompts

#### `sprite.player.p1` — style anchor

**Reference:** none. **Style:** `STYLE_SPRITE`. **Frame:** `FRAME_PLAYER`. **Source:** 14×22 PNG; 28×44 display. **File:** `shared/sprites/player-p1.png`.

```text
Pixel art for a side-view 2D platformer set inside a living human body. Native pixel grid, hard square pixels, crisp edges, no anti-aliasing, no smoothing, no mixed pixel sizes. 1px dark teal-brown outlines at source resolution; flat fills from three-step ramps; 50% dither for damp membrane sheen, condensation, dust and grime. Gross-cute biology, wry deadpan tone, weird and fleshy but 12+ friendly: never gory, no shock humour. Palette ramps: teal #05090b #101a20 #1d2f38; bone #c9b79a #f2e8d5 #fff8e8; bone shadow #5f736e #7a8f8a #9db4ad; nerve #b8862b #ffd166 #fff3b0; joint #3f9fb5 #7bdff2 #c9f7ff; muscle #a82a4a #ef476f #ff9fb2; sage #6f847d #9db4ad #c4d4ce; ink #000000 #05090b #2a3f47. Strong readable shapes; characters and props must read at 28×44 and 36×36. Side view or slight 3/4 view. No text, no logo, no watermark, no border, no UI, no photorealism, no 3D, no painterly rendering, no smooth gradients, no anti-aliasing, no high-res detail, no faux-pixel mixed grids, no blood, no gore, no open wounds, no extra limbs, no detailed fingers, no baked drop shadow, no ground shadow.

Pixel-art player character sprite designed on a 14×22 source grid: full-body Shrinkonaut astronaut, facing right in a neutral idle. Round helmet with a warm amber visor and no visible face; cream bone-coloured suit; dark teal joints; joint-cyan chest light; yellow backpack tanks; one scanner gauntlet; short legs; big boots; scuffed, patched and grimy. Chunky readable silhouette, big helmet, short body, strong 1px outline, fills the canvas vertically. Flat fills from the ramps; one hard shadow shape; one warm highlight. The silhouette must read at 28×44.

Full body, standing, facing right, feet on the bottom padding line, centred horizontally, 0–1 px transparent margin on a 14×22 canvas, isolated on a flat solid magenta #FF00FF background, no ground, no pedestal, no cast shadow, no scene, no frame. Hard pixel edges; no anti-aliasing. The engine displays the 14×22 source at 28×44.
```

**Acceptance**

- Reads at 28×44 on `#101a20`; helmet, visor, tanks and boots are legible.
- Source is 14×22; feet on the bottom padding line; silhouette fills ~90% of the height.
- No visible face, no cast shadow, no ground, no text.
- Hard pixel edges; palette-only colours; alpha clean at 400%; ≤16 KB.
- The approved file is saved as `style-anchor-p1.png` and used for every later sprite.

#### `sprite.player.p2` — accent variant

**Reference:** `style-anchor-p1.png` as an image reference. **Style:** `STYLE_SPRITE`. **Frame:** `FRAME_PLAYER`. **Source:** 14×22 PNG; 28×44 display. **File:** `shared/sprites/player-p2.png`.

```text
Pixel art for a side-view 2D platformer set inside a living human body. Native pixel grid, hard square pixels, crisp edges, no anti-aliasing, no smoothing, no mixed pixel sizes. 1px dark teal-brown outlines at source resolution; flat fills from three-step ramps; 50% dither for damp membrane sheen, condensation, dust and grime. Gross-cute biology, wry deadpan tone, weird and fleshy but 12+ friendly: never gory, no shock humour. Palette ramps: teal #05090b #101a20 #1d2f38; bone #c9b79a #f2e8d5 #fff8e8; bone shadow #5f736e #7a8f8a #9db4ad; nerve #b8862b #ffd166 #fff3b0; joint #3f9fb5 #7bdff2 #c9f7ff; muscle #a82a4a #ef476f #ff9fb2; sage #6f847d #9db4ad #c4d4ce; ink #000000 #05090b #2a3f47. Strong readable shapes; characters and props must read at 28×44 and 36×36. Side view or slight 3/4 view. No text, no logo, no watermark, no border, no UI, no photorealism, no 3D, no painterly rendering, no smooth gradients, no anti-aliasing, no high-res detail, no faux-pixel mixed grids, no blood, no gore, no open wounds, no extra limbs, no detailed fingers, no baked drop shadow, no ground shadow.

Same Shrinkonaut as the reference image: identical silhouette, proportions, pose, helmet, backpack, boots and outline weight. Change only the accent colour: muscle-pink #ef476f chest light, shoulder trim and visor trim replace the joint-cyan accents. Keep the suit bone cream, joints dark teal, tanks nerve yellow, grime and outline identical. No new equipment, no new shape, no extra detail. Pixel-art sprite designed on a 14×22 source grid; readable at 28×44.

Full body, standing, facing right, feet on the bottom padding line, centred horizontally, 0–1 px transparent margin on a 14×22 canvas, isolated on a flat solid magenta #FF00FF background, no ground, no pedestal, no cast shadow, no scene, no frame. Hard pixel edges; no anti-aliasing. The engine displays the 14×22 source at 28×44.
```

**Acceptance**

- At 28×44, the silhouette is indistinguishable from P1; only the accent hue changes.
- Source is 14×22; no pink spill onto the suit, no new gear, no new pose.
- Both players read side by side on the contact sheet.
- No text, no cast shadow, hard pixel edges, alpha clean; ≤16 KB.

### 8.18 Shared entity prompts

**Common settings:** `STYLE_SPRITE` + `FRAME_ENTITY`; source **18×18 PNG**, display **36×36**; design for 36×36 readability with no fine detail; base of the lowest visible element on the bottom padding line; 1 px margin; no baked shadow or glow. Filenames are in §5.3.

**Common acceptance:** reads at 36×36 on `#101a20`; silhouette distinct from every other entity; survives the warm interaction tint; hard pixel edges; palette-only colours; no text; alpha clean; ≤16 KB.

| Asset ID | Style / negative | Frame | Source | File |
|---|---|---|---|---|
| `sprite.agent.neuron` | `STYLE_SPRITE` / `NEGATIVE_SPRITE` | `FRAME_ENTITY` | 18×18 PNG | `shared/sprites/agent-neuron.png` |
| `sprite.scan.neuron` | `STYLE_SPRITE` / `NEGATIVE_SPRITE` | `FRAME_ENTITY` | 18×18 PNG | `shared/sprites/scan-neuron.png` |
| `sprite.scan.synapse` | `STYLE_SPRITE` / `NEGATIVE_SPRITE` | `FRAME_ENTITY` | 18×18 PNG | `shared/sprites/scan-synapse.png` |
| `sprite.scan.pathway` | `STYLE_SPRITE` / `NEGATIVE_SPRITE` | `FRAME_ENTITY` | 18×18 PNG | `shared/sprites/scan-pathway.png` |
| `sprite.scan.muscle` | `STYLE_SPRITE` / `NEGATIVE_SPRITE` | `FRAME_ENTITY` | 18×18 PNG | `shared/sprites/scan-muscle.png` |
| `sprite.scan.reflex` | `STYLE_SPRITE` / `NEGATIVE_SPRITE` | `FRAME_ENTITY` | 18×18 PNG | `shared/sprites/scan-reflex.png` |
| `sprite.gate.ferry` | `STYLE_SPRITE` / `NEGATIVE_SPRITE` | `FRAME_ENTITY` | 18×18 PNG | `shared/sprites/gate-ferry.png` |
| `sprite.exit` | `STYLE_SPRITE` / `NEGATIVE_SPRITE` | `FRAME_ENTITY` | 18×18 PNG | `shared/sprites/exit.png` |

#### `sprite.agent.neuron` — Neuron Keeper

**Fact anchor:** NERV-01#1 (dendrites, soma, one axon, terminals); character fiction. **Reference:** P1. **Style:** `STYLE_SPRITE`. **Frame:** `FRAME_ENTITY`.

```text
Pixel art for a side-view 2D platformer set inside a living human body. Native pixel grid, hard square pixels, crisp edges, no anti-aliasing, no smoothing, no mixed pixel sizes. 1px dark teal-brown outlines at source resolution; flat fills from three-step ramps; 50% dither for damp membrane sheen, condensation, dust and grime. Gross-cute biology, wry deadpan tone, weird and fleshy but 12+ friendly: never gory, no shock humour. Palette ramps: teal #05090b #101a20 #1d2f38; bone #c9b79a #f2e8d5 #fff8e8; bone shadow #5f736e #7a8f8a #9db4ad; nerve #b8862b #ffd166 #fff3b0; joint #3f9fb5 #7bdff2 #c9f7ff; muscle #a82a4a #ef476f #ff9fb2; sage #6f847d #9db4ad #c4d4ce; ink #000000 #05090b #2a3f47. Strong readable shapes; characters and props must read at 28×44 and 36×36. Side view or slight 3/4 view. No text, no logo, no watermark, no border, no UI, no photorealism, no 3D, no painterly rendering, no smooth gradients, no anti-aliasing, no high-res detail, no faux-pixel mixed grids, no blood, no gore, no open wounds, no extra limbs, no detailed fingers, no baked drop shadow, no ground shadow.

Pixel-art character sprite designed on an 18×18 source grid: full-body cell character, the Neuron Keeper — a plump bone-cream neuron soma with a dark teal central core, big tired expressive eyes, short dendrite hair, one long axon-like tail trailing behind, two tiny arms, and a small glowing nerve-yellow signal lantern. Slight 3/4 side view, standing on a small root-like foot, fussy tired posture, friendly and weird, not monstrous. One soma, one axon, no extra limbs, no human face.

Full object, centred, base of the lowest visible element on the bottom padding line, 1 px transparent margin on an 18×18 canvas, isolated on a flat solid magenta #FF00FF background, no ground, no pedestal, no cast shadow, no scene, no frame. Hard pixel edges; no anti-aliasing. The engine displays the 18×18 source at 36×36.
```

**Acceptance:** Big eyes and lantern read at 36×36; one soma and one axon; distinct from `scan.neuron`; base contact is clear; no text; no gore.

#### `sprite.scan.neuron` — neuron and myelin scan

**Fact anchor:** NERV-01#1, #3. **Reference:** P1. **Style:** `STYLE_SPRITE`. **Frame:** `FRAME_ENTITY`.

```text
Pixel art for a side-view 2D platformer set inside a living human body. Native pixel grid, hard square pixels, crisp edges, no anti-aliasing, no smoothing, no mixed pixel sizes. 1px dark teal-brown outlines at source resolution; flat fills from three-step ramps; 50% dither for damp membrane sheen, condensation, dust and grime. Gross-cute biology, wry deadpan tone, weird and fleshy but 12+ friendly: never gory, no shock humour. Palette ramps: teal #05090b #101a20 #1d2f38; bone #c9b79a #f2e8d5 #fff8e8; bone shadow #5f736e #7a8f8a #9db4ad; nerve #b8862b #ffd166 #fff3b0; joint #3f9fb5 #7bdff2 #c9f7ff; muscle #a82a4a #ef476f #ff9fb2; sage #6f847d #9db4ad #c4d4ce; ink #000000 #05090b #2a3f47. Strong readable shapes; characters and props must read at 28×44 and 36×36. Side view or slight 3/4 view. No text, no logo, no watermark, no border, no UI, no photorealism, no 3D, no painterly rendering, no smooth gradients, no anti-aliasing, no high-res detail, no faux-pixel mixed grids, no blood, no gore, no open wounds, no extra limbs, no detailed fingers, no baked drop shadow, no ground shadow.

Pixel-art scan-target prop designed on an 18×18 source grid: a single neuron with many branching dendrites, one plump bone-cream soma, one long myelinated axon with visible node gaps, and branching axon terminals. Nerve-yellow core, thin joint-cyan scan rim, strong iconic silhouette, slight 3/4 side view. One axon only, no face, no labels.

Full object, centred, base of the lowest visible element on the bottom padding line, 1 px transparent margin on an 18×18 canvas, isolated on a flat solid magenta #FF00FF background, no ground, no pedestal, no cast shadow, no scene, no frame. Hard pixel edges; no anti-aliasing. The engine displays the 18×18 source at 36×36.
```

**Acceptance:** One axon, dendrites, soma and myelin nodes read at 36×36; distinct from the agent; the cyan rim reads as scannable; no text; no arrow.

#### `sprite.scan.synapse` — synapse and cleft scan

**Fact anchor:** NERV-02#1, #2. **Reference:** P1. **Style:** `STYLE_SPRITE`. **Frame:** `FRAME_ENTITY`.

```text
Pixel art for a side-view 2D platformer set inside a living human body. Native pixel grid, hard square pixels, crisp edges, no anti-aliasing, no smoothing, no mixed pixel sizes. 1px dark teal-brown outlines at source resolution; flat fills from three-step ramps; 50% dither for damp membrane sheen, condensation, dust and grime. Gross-cute biology, wry deadpan tone, weird and fleshy but 12+ friendly: never gory, no shock humour. Palette ramps: teal #05090b #101a20 #1d2f38; bone #c9b79a #f2e8d5 #fff8e8; bone shadow #5f736e #7a8f8a #9db4ad; nerve #b8862b #ffd166 #fff3b0; joint #3f9fb5 #7bdff2 #c9f7ff; muscle #a82a4a #ef476f #ff9fb2; sage #6f847d #9db4ad #c4d4ce; ink #000000 #05090b #2a3f47. Strong readable shapes; characters and props must read at 28×44 and 36×36. Side view or slight 3/4 view. No text, no logo, no watermark, no border, no UI, no photorealism, no 3D, no painterly rendering, no smooth gradients, no anti-aliasing, no high-res detail, no faux-pixel mixed grids, no blood, no gore, no open wounds, no extra limbs, no detailed fingers, no baked drop shadow, no ground shadow.

Pixel-art scan-target prop designed on an 18×18 source grid: a presynaptic nerve terminal on the left and a postsynaptic membrane on the right, separated by a visible synaptic cleft. A few round vesicles sit inside the presynaptic terminal; a few small transmitter dots cross the cleft; small receptor shapes sit on the postsynaptic membrane. Nerve-yellow core, thin joint-cyan scan rim, side view. No labels, no arrows, no gore.

Full object, centred, base of the lowest visible element on the bottom padding line, 1 px transparent margin on an 18×18 canvas, isolated on a flat solid magenta #FF00FF background, no ground, no pedestal, no cast shadow, no scene, no frame. Hard pixel edges; no anti-aliasing. The engine displays the 18×18 source at 36×36.
```

**Acceptance:** Two membranes and the cleft read at 36×36; vesicles are inside the presynaptic terminal, not in the cleft; receptors are on the postsynaptic side; distinct from `pulse.terminal`; no text.

#### `sprite.scan.pathway` — one-way pathway scan

**Fact anchor:** NERV-01#1, #6. **Reference:** P1. **Style:** `STYLE_SPRITE`. **Frame:** `FRAME_ENTITY`.

```text
Pixel art for a side-view 2D platformer set inside a living human body. Native pixel grid, hard square pixels, crisp edges, no anti-aliasing, no smoothing, no mixed pixel sizes. 1px dark teal-brown outlines at source resolution; flat fills from three-step ramps; 50% dither for damp membrane sheen, condensation, dust and grime. Gross-cute biology, wry deadpan tone, weird and fleshy but 12+ friendly: never gory, no shock humour. Palette ramps: teal #05090b #101a20 #1d2f38; bone #c9b79a #f2e8d5 #fff8e8; bone shadow #5f736e #7a8f8a #9db4ad; nerve #b8862b #ffd166 #fff3b0; joint #3f9fb5 #7bdff2 #c9f7ff; muscle #a82a4a #ef476f #ff9fb2; sage #6f847d #9db4ad #c4d4ce; ink #000000 #05090b #2a3f47. Strong readable shapes; characters and props must read at 28×44 and 36×36. Side view or slight 3/4 view. No text, no logo, no watermark, no border, no UI, no photorealism, no 3D, no painterly rendering, no smooth gradients, no anti-aliasing, no high-res detail, no faux-pixel mixed grids, no blood, no gore, no open wounds, no extra limbs, no detailed fingers, no baked drop shadow, no ground shadow.

Pixel-art scan-target prop designed on an 18×18 source grid: one one-way nerve pathway reading left to right — branching dendrites at the left, a plump soma, one long myelinated axon with node gaps, and branching terminals at the right. A bright nerve-yellow pulse sits at one node; the terminals taper toward the right. Nerve-yellow core, thin joint-cyan scan rim, side view. No arrow, no labels, no diagram lines.

Full object, centred, base of the lowest visible element on the bottom padding line, 1 px transparent margin on an 18×18 canvas, isolated on a flat solid magenta #FF00FF background, no ground, no pedestal, no cast shadow, no scene, no frame. Hard pixel edges; no anti-aliasing. The engine displays the 18×18 source at 36×36.
```

**Acceptance:** The one-way reading comes from the dendrite-to-terminal shape, not an arrow; one axon; distinct from `scan.neuron`; no text.

#### `sprite.scan.muscle` — muscle effector scan

**Fact anchor:** NERV-02#5 (NMJ, ACh, muscle response); NERV-03#3 (muscle contraction). **Reference:** P1. **Style:** `STYLE_SPRITE`. **Frame:** `FRAME_ENTITY`.

```text
Pixel art for a side-view 2D platformer set inside a living human body. Native pixel grid, hard square pixels, crisp edges, no anti-aliasing, no smoothing, no mixed pixel sizes. 1px dark teal-brown outlines at source resolution; flat fills from three-step ramps; 50% dither for damp membrane sheen, condensation, dust and grime. Gross-cute biology, wry deadpan tone, weird and fleshy but 12+ friendly: never gory, no shock humour. Palette ramps: teal #05090b #101a20 #1d2f38; bone #c9b79a #f2e8d5 #fff8e8; bone shadow #5f736e #7a8f8a #9db4ad; nerve #b8862b #ffd166 #fff3b0; joint #3f9fb5 #7bdff2 #c9f7ff; muscle #a82a4a #ef476f #ff9fb2; sage #6f847d #9db4ad #c4d4ce; ink #000000 #05090b #2a3f47. Strong readable shapes; characters and props must read at 28×44 and 36×36. Side view or slight 3/4 view. No text, no logo, no watermark, no border, no UI, no photorealism, no 3D, no painterly rendering, no smooth gradients, no anti-aliasing, no high-res detail, no faux-pixel mixed grids, no blood, no gore, no open wounds, no extra limbs, no detailed fingers, no baked drop shadow, no ground shadow.

Pixel-art scan-target prop designed on an 18×18 source grid: a bundle of muscle tissue in muscle-pink with bone-shadow shading, with one motor-nerve terminal landing close to it. A small nerve-yellow junction dot marks the contact; the terminal sits just above the muscle surface. Thin joint-cyan scan rim, side view. No labels, no arrows, no gore, no textbook diagram.

Full object, centred, base of the lowest visible element on the bottom padding line, 1 px transparent margin on an 18×18 canvas, isolated on a flat solid magenta #FF00FF background, no ground, no pedestal, no cast shadow, no scene, no frame. Hard pixel edges; no anti-aliasing. The engine displays the 18×18 source at 36×36.
```

**Acceptance:** Muscle bundle and nerve contact read at 36×36; distinct from `scan.synapse`; no striation textbook diagram; no text; no gore.

#### `sprite.scan.reflex` — reflex arc reserve

**Fact anchor:** NERV-03#1–#3, #5. Status: not referenced by 03/04; generate only if 05 is authored or the capture needs it. **Reference:** P1. **Style:** `STYLE_SPRITE`. **Frame:** `FRAME_ENTITY`.

```text
Pixel art for a side-view 2D platformer set inside a living human body. Native pixel grid, hard square pixels, crisp edges, no anti-aliasing, no smoothing, no mixed pixel sizes. 1px dark teal-brown outlines at source resolution; flat fills from three-step ramps; 50% dither for damp membrane sheen, condensation, dust and grime. Gross-cute biology, wry deadpan tone, weird and fleshy but 12+ friendly: never gory, no shock humour. Palette ramps: teal #05090b #101a20 #1d2f38; bone #c9b79a #f2e8d5 #fff8e8; bone shadow #5f736e #7a8f8a #9db4ad; nerve #b8862b #ffd166 #fff3b0; joint #3f9fb5 #7bdff2 #c9f7ff; muscle #a82a4a #ef476f #ff9fb2; sage #6f847d #9db4ad #c4d4ce; ink #000000 #05090b #2a3f47. Strong readable shapes; characters and props must read at 28×44 and 36×36. Side view or slight 3/4 view. No text, no logo, no watermark, no border, no UI, no photorealism, no 3D, no painterly rendering, no smooth gradients, no anti-aliasing, no high-res detail, no faux-pixel mixed grids, no blood, no gore, no open wounds, no extra limbs, no detailed fingers, no baked drop shadow, no ground shadow.

Pixel-art scan-target prop designed on an 18×18 source grid: a compact two-neuron stretch-reflex loop. A muscle spindle sits at the left; a sensory axon enters a small spinal-cord segment through the dorsal root and synapses directly on a motor neuron; a motor axon leaves through the ventral root to a muscle bundle at the right. Do not include a brain in the icon; show the two-neuron arc only. No labels, no arrows, no diagram lines. Nerve-yellow core, thin joint-cyan scan rim.

Full object, centred, base of the lowest visible element on the bottom padding line, 1 px transparent margin on an 18×18 canvas, isolated on a flat solid magenta #FF00FF background, no ground, no pedestal, no cast shadow, no scene, no frame. Hard pixel edges; no anti-aliasing. The engine displays the 18×18 source at 36×36.
```

**Acceptance:** If generated, two neurons, the dorsal and ventral roots and the muscle spindle read at 36×36; no brain; no text. If it does not read at 36×36, keep the placeholder and do not force it.

#### `sprite.gate.ferry` — organic gate

**Fact anchor:** puzzle abstraction, not an anatomical valve. **Reference:** P1. **Style:** `STYLE_SPRITE`. **Frame:** `FRAME_ENTITY`.

```text
Pixel art for a side-view 2D platformer set inside a living human body. Native pixel grid, hard square pixels, crisp edges, no anti-aliasing, no smoothing, no mixed pixel sizes. 1px dark teal-brown outlines at source resolution; flat fills from three-step ramps; 50% dither for damp membrane sheen, condensation, dust and grime. Gross-cute biology, wry deadpan tone, weird and fleshy but 12+ friendly: never gory, no shock humour. Palette ramps: teal #05090b #101a20 #1d2f38; bone #c9b79a #f2e8d5 #fff8e8; bone shadow #5f736e #7a8f8a #9db4ad; nerve #b8862b #ffd166 #fff3b0; joint #3f9fb5 #7bdff2 #c9f7ff; muscle #a82a4a #ef476f #ff9fb2; sage #6f847d #9db4ad #c4d4ce; ink #000000 #05090b #2a3f47. Strong readable shapes; characters and props must read at 28×44 and 36×36. Side view or slight 3/4 view. No text, no logo, no watermark, no border, no UI, no photorealism, no 3D, no painterly rendering, no smooth gradients, no anti-aliasing, no high-res detail, no faux-pixel mixed grids, no blood, no gore, no open wounds, no extra limbs, no detailed fingers, no baked drop shadow, no ground shadow.

Pixel-art puzzle gate designed on an 18×18 source grid: a compact organic gate, side view — a thick bone-and-membrane frame around a closed aperture, with a taut curtain of wet teal tissue stretched across the opening and one nerve-yellow seam down the centre. Small bone plates at the hinges, damp sheen, no receptor sockets, no keyhole, no mechanical parts. Closed state only, strong silhouette, base at the bottom.

Full object, centred, base of the lowest visible element on the bottom padding line, 1 px transparent margin on an 18×18 canvas, isolated on a flat solid magenta #FF00FF background, no ground, no pedestal, no cast shadow, no scene, no frame. Hard pixel edges; no anti-aliasing. The engine displays the 18×18 source at 36×36.
```

**Acceptance:** Reads as a closed gate at 36×36; no receptor sockets; distinct from `sprite.exit`; works over bone, nerve and muscle backgrounds; no text; no baked glow.

#### `sprite.exit` — membrane airlock

**Fact anchor:** level fiction; no anatomical claim. **Reference:** P1. **Style:** `STYLE_SPRITE`. **Frame:** `FRAME_ENTITY`.

```text
Pixel art for a side-view 2D platformer set inside a living human body. Native pixel grid, hard square pixels, crisp edges, no anti-aliasing, no smoothing, no mixed pixel sizes. 1px dark teal-brown outlines at source resolution; flat fills from three-step ramps; 50% dither for damp membrane sheen, condensation, dust and grime. Gross-cute biology, wry deadpan tone, weird and fleshy but 12+ friendly: never gory, no shock humour. Palette ramps: teal #05090b #101a20 #1d2f38; bone #c9b79a #f2e8d5 #fff8e8; bone shadow #5f736e #7a8f8a #9db4ad; nerve #b8862b #ffd166 #fff3b0; joint #3f9fb5 #7bdff2 #c9f7ff; muscle #a82a4a #ef476f #ff9fb2; sage #6f847d #9db4ad #c4d4ce; ink #000000 #05090b #2a3f47. Strong readable shapes; characters and props must read at 28×44 and 36×36. Side view or slight 3/4 view. No text, no logo, no watermark, no border, no UI, no photorealism, no 3D, no painterly rendering, no smooth gradients, no anti-aliasing, no high-res detail, no faux-pixel mixed grids, no blood, no gore, no open wounds, no extra limbs, no detailed fingers, no baked drop shadow, no ground shadow.

Pixel-art exit doorway designed on an 18×18 source grid: a membrane airlock, side view — a ring of bone and teal tissue forming an opening, soft warm nerve-yellow light beyond, wet folds, a few bone struts, no gore. The opening fills most of the square; no characters, no labels. Base at the bottom.

Full object, centred, base of the lowest visible element on the bottom padding line, 1 px transparent margin on an 18×18 canvas, isolated on a flat solid magenta #FF00FF background, no ground, no pedestal, no cast shadow, no scene, no frame. Hard pixel edges; no anti-aliasing. The engine displays the 18×18 source at 36×36.
```

**Acceptance:** Reads as a destination at 36×36; warm light is visible; distinct from the gate; no character, no text.

### 8.19 Prop and receptor prompts

**Common settings:** `STYLE_SPRITE` + `FRAME_ENTITY`; source **18×18 PNG**, display **36×36**; design for 36×36 readability; base on the bottom padding line; 1 px margin; no baked shadow.

| Asset ID | Style / negative | Frame | Source | File |
|---|---|---|---|---|
| `sprite.prop.tracer` | `STYLE_SPRITE` / `NEGATIVE_SPRITE` | `FRAME_ENTITY` | 18×18 PNG | `shared/sprites/prop-tracer.png` |
| `sprite.pulse.terminal` | `STYLE_SPRITE` / `NEGATIVE_SPRITE` | `FRAME_ENTITY` | 18×18 PNG | `shared/sprites/pulse-terminal.png` |
| `sprite.receptor.triangle` | `STYLE_SPRITE` / `NEGATIVE_SPRITE` | `FRAME_ENTITY` | 18×18 PNG | `shared/sprites/receptor-triangle.png` |
| `sprite.receptor.circle` | `STYLE_SPRITE` / `NEGATIVE_SPRITE` | `FRAME_ENTITY` | 18×18 PNG | `shared/sprites/receptor-circle.png` |

#### `sprite.prop.tracer` — ACh packet

**Fact anchor:** NERV-02#1, #2, #5; game token, not a literal vesicle. **Reference:** P1. **Style:** `STYLE_SPRITE`. **Frame:** `FRAME_ENTITY`.

```text
Pixel art for a side-view 2D platformer set inside a living human body. Native pixel grid, hard square pixels, crisp edges, no anti-aliasing, no smoothing, no mixed pixel sizes. 1px dark teal-brown outlines at source resolution; flat fills from three-step ramps; 50% dither for damp membrane sheen, condensation, dust and grime. Gross-cute biology, wry deadpan tone, weird and fleshy but 12+ friendly: never gory, no shock humour. Palette ramps: teal #05090b #101a20 #1d2f38; bone #c9b79a #f2e8d5 #fff8e8; bone shadow #5f736e #7a8f8a #9db4ad; nerve #b8862b #ffd166 #fff3b0; joint #3f9fb5 #7bdff2 #c9f7ff; muscle #a82a4a #ef476f #ff9fb2; sage #6f847d #9db4ad #c4d4ce; ink #000000 #05090b #2a3f47. Strong readable shapes; characters and props must read at 28×44 and 36×36. Side view or slight 3/4 view. No text, no logo, no watermark, no border, no UI, no photorealism, no 3D, no painterly rendering, no smooth gradients, no anti-aliasing, no high-res detail, no faux-pixel mixed grids, no blood, no gore, no open wounds, no extra limbs, no detailed fingers, no baked drop shadow, no ground shadow.

Pixel-art carry prop designed on an 18×18 source grid: a stylized ACh signal token — a small triangular chemical-message packet with a soft wet sheen, nerve-yellow core, thin joint-cyan rim and two tiny tendrils. Clearly triangular silhouette, no face, no label, no arrow. A game token, not a literal vesicle.

Full object, centred, base of the lowest visible element on the bottom padding line, 1 px transparent margin on an 18×18 canvas, isolated on a flat solid magenta #FF00FF background, no ground, no pedestal, no cast shadow, no scene, no frame. Hard pixel edges; no anti-aliasing. The engine displays the 18×18 source at 36×36.
```

**Acceptance:** The triangular silhouette reads at 36×36 and matches `sprite.receptor.triangle`; no face; no text; no cast shadow.

#### `sprite.pulse.terminal` — motor terminal

**Fact anchor:** NERV-02#1, #2. **Reference:** P1. **Style:** `STYLE_SPRITE`. **Frame:** `FRAME_ENTITY`.

```text
Pixel art for a side-view 2D platformer set inside a living human body. Native pixel grid, hard square pixels, crisp edges, no anti-aliasing, no smoothing, no mixed pixel sizes. 1px dark teal-brown outlines at source resolution; flat fills from three-step ramps; 50% dither for damp membrane sheen, condensation, dust and grime. Gross-cute biology, wry deadpan tone, weird and fleshy but 12+ friendly: never gory, no shock humour. Palette ramps: teal #05090b #101a20 #1d2f38; bone #c9b79a #f2e8d5 #fff8e8; bone shadow #5f736e #7a8f8a #9db4ad; nerve #b8862b #ffd166 #fff3b0; joint #3f9fb5 #7bdff2 #c9f7ff; muscle #a82a4a #ef476f #ff9fb2; sage #6f847d #9db4ad #c4d4ce; ink #000000 #05090b #2a3f47. Strong readable shapes; characters and props must read at 28×44 and 36×36. Side view or slight 3/4 view. No text, no logo, no watermark, no border, no UI, no photorealism, no 3D, no painterly rendering, no smooth gradients, no anti-aliasing, no high-res detail, no faux-pixel mixed grids, no blood, no gore, no open wounds, no extra limbs, no detailed fingers, no baked drop shadow, no ground shadow.

Pixel-art pulse source designed on an 18×18 source grid: a presynaptic motor-nerve terminal, side view — a bulbous teal membrane terminal with a few large round vesicles inside, a small joint-cyan pulse emitter at the mouth, and a short axon stub at the back. Wet sheen, one terminal only, no labels, no gore. Base at the bottom.

Full object, centred, base of the lowest visible element on the bottom padding line, 1 px transparent margin on an 18×18 canvas, isolated on a flat solid magenta #FF00FF background, no ground, no pedestal, no cast shadow, no scene, no frame. Hard pixel edges; no anti-aliasing. The engine displays the 18×18 source at 36×36.
```

**Acceptance:** Terminal, vesicles and cyan emitter read at 36×36; distinct from `scan.synapse`; no text; no gore.

#### `sprite.receptor.triangle` — nicotinic receptor

**Fact anchor:** NERV-02#5; shape-matching is a game abstraction, not a literal protein structure. **Reference:** P1. **Style:** `STYLE_SPRITE`. **Frame:** `FRAME_ENTITY`.

```text
Pixel art for a side-view 2D platformer set inside a living human body. Native pixel grid, hard square pixels, crisp edges, no anti-aliasing, no smoothing, no mixed pixel sizes. 1px dark teal-brown outlines at source resolution; flat fills from three-step ramps; 50% dither for damp membrane sheen, condensation, dust and grime. Gross-cute biology, wry deadpan tone, weird and fleshy but 12+ friendly: never gory, no shock humour. Palette ramps: teal #05090b #101a20 #1d2f38; bone #c9b79a #f2e8d5 #fff8e8; bone shadow #5f736e #7a8f8a #9db4ad; nerve #b8862b #ffd166 #fff3b0; joint #3f9fb5 #7bdff2 #c9f7ff; muscle #a82a4a #ef476f #ff9fb2; sage #6f847d #9db4ad #c4d4ce; ink #000000 #05090b #2a3f47. Strong readable shapes; characters and props must read at 28×44 and 36×36. Side view or slight 3/4 view. No text, no logo, no watermark, no border, no UI, no photorealism, no 3D, no painterly rendering, no smooth gradients, no anti-aliasing, no high-res detail, no faux-pixel mixed grids, no blood, no gore, no open wounds, no extra limbs, no detailed fingers, no baked drop shadow, no ground shadow.

Pixel-art receptor lock designed on an 18×18 source grid: a stylized nicotinic receptor socket, side view — a triangular opening in a bone-and-teal membrane rim, with a nerve-yellow inner glow and small organic clasps. The triangular opening is the dominant shape; no mechanical keyhole, no label. Base at the bottom.

Full object, centred, base of the lowest visible element on the bottom padding line, 1 px transparent margin on an 18×18 canvas, isolated on a flat solid magenta #FF00FF background, no ground, no pedestal, no cast shadow, no scene, no frame. Hard pixel edges; no anti-aliasing. The engine displays the 18×18 source at 36×36.
```

**Acceptance:** Triangular opening reads at 36×36; distinct from the circle receptor; no mechanical key or lock; no text.

#### `sprite.receptor.circle` — wrong receptor

**Fact anchor:** NERV-02#3 is advanced and optional; this is the shape-mismatch socket. **Reference:** P1. **Style:** `STYLE_SPRITE`. **Frame:** `FRAME_ENTITY`.

```text
Pixel art for a side-view 2D platformer set inside a living human body. Native pixel grid, hard square pixels, crisp edges, no anti-aliasing, no smoothing, no mixed pixel sizes. 1px dark teal-brown outlines at source resolution; flat fills from three-step ramps; 50% dither for damp membrane sheen, condensation, dust and grime. Gross-cute biology, wry deadpan tone, weird and fleshy but 12+ friendly: never gory, no shock humour. Palette ramps: teal #05090b #101a20 #1d2f38; bone #c9b79a #f2e8d5 #fff8e8; bone shadow #5f736e #7a8f8a #9db4ad; nerve #b8862b #ffd166 #fff3b0; joint #3f9fb5 #7bdff2 #c9f7ff; muscle #a82a4a #ef476f #ff9fb2; sage #6f847d #9db4ad #c4d4ce; ink #000000 #05090b #2a3f47. Strong readable shapes; characters and props must read at 28×44 and 36×36. Side view or slight 3/4 view. No text, no logo, no watermark, no border, no UI, no photorealism, no 3D, no painterly rendering, no smooth gradients, no anti-aliasing, no high-res detail, no faux-pixel mixed grids, no blood, no gore, no open wounds, no extra limbs, no detailed fingers, no baked drop shadow, no ground shadow.

Pixel-art receptor lock designed on an 18×18 source grid: a stylized wrong-receptor socket, side view — a circular opening in a bone-and-teal membrane rim, with a nerve-yellow inner glow and small organic clasps. The circular opening is the dominant shape; no mechanical keyhole, no label. Base at the bottom.

Full object, centred, base of the lowest visible element on the bottom padding line, 1 px transparent margin on an 18×18 canvas, isolated on a flat solid magenta #FF00FF background, no ground, no pedestal, no cast shadow, no scene, no frame. Hard pixel edges; no anti-aliasing. The engine displays the 18×18 source at 36×36.
```

**Acceptance:** Circular opening reads at 36×36; distinct from the triangle receptor; no mechanical key or lock; no text.

### 8.20 Background prompts

#### `bg.nerve_forest.sky` — sky plate

**Style:** `STYLE_BACKGROUND`. **Frame:** `FRAME_SKY`. **Source:** 640×368 WebP/PNG, integer 2× cover. **File:** `shared/backgrounds/nerve-forest-sky.webp`.

```text
Pixel art for a side-view 2D platformer set inside a living human body. Native pixel grid, hard square pixels, crisp edges, no anti-aliasing, no smoothing. Orthographic side view, landscape scale; atmospheric depth from layered values and dither, not a global gradient; local warm highlights only. Damp membrane sheen, condensation, dust and grime. Gross-cute biology, wry deadpan tone, 12+ friendly: never gory. Palette ramps: teal #05090b #101a20 #1d2f38; bone #c9b79a #f2e8d5 #fff8e8; bone shadow #5f736e #7a8f8a #9db4ad; nerve #b8862b #ffd166 #fff3b0; joint #3f9fb5 #7bdff2 #c9f7ff; muscle #a82a4a #ef476f #ff9fb2; sage #6f847d #9db4ad #c4d4ce; ink #000000 #05090b #2a3f47. No single directional light, no hard cast shadows, no god rays, no text, no logo, no watermark, no border, no UI, no labels, no arrows, no photorealism, no 3D, no painterly rendering, no smooth gradients, no anti-aliasing, no high-res detail, no faux-pixel mixed grids.

Pixel-art wide background plate, 640×368 source, designed for an exact 2× cover: the interior of a living body as a damp nerve forest at night. Deep teal darkness, distant branching nerve trunks and pale myelin slabs receding in dither haze, a faint nerve-yellow glow low in the distance, floating dust and condensation. No characters, no creatures, no labels, no arrows. Orthographic side view, soft atmospheric depth from layered values and dither, no single directional light, no hard horizon line at player height. Keep the upper corners and lower third dark and low-contrast for HUD and player silhouettes; keep important detail inside the central 70% for the 2× cover crop.

640×368, wide, opaque, edge-to-edge background plate, no frame. Keep the upper corners and lower third dark and low-contrast; keep important detail inside the central 70% for the 2× cover crop. Hard pixel edges; no anti-aliasing.
```

**Acceptance:** At 1280×720 cover crop, the HUD text and player silhouettes read; no hard horizon at player height; no characters or text; no obvious focal landmark; ≤300 KB.

#### `bg.nerve_forest.far` — far parallax layer

**Style:** `STYLE_BACKGROUND`. **Frame:** `FRAME_PARALLAX`. **Source:** 1024×512 WebP/PNG, transparent, 2×2 clusters. **File:** `shared/backgrounds/nerve-forest-far.webp`.

```text
Pixel art for a side-view 2D platformer set inside a living human body. Native pixel grid, hard square pixels, crisp edges, no anti-aliasing, no smoothing. Orthographic side view, landscape scale; atmospheric depth from layered values and dither, not a global gradient; local warm highlights only. Damp membrane sheen, condensation, dust and grime. Gross-cute biology, wry deadpan tone, 12+ friendly: never gory. Palette ramps: teal #05090b #101a20 #1d2f38; bone #c9b79a #f2e8d5 #fff8e8; bone shadow #5f736e #7a8f8a #9db4ad; nerve #b8862b #ffd166 #fff3b0; joint #3f9fb5 #7bdff2 #c9f7ff; muscle #a82a4a #ef476f #ff9fb2; sage #6f847d #9db4ad #c4d4ce; ink #000000 #05090b #2a3f47. No single directional light, no hard cast shadows, no god rays, no text, no logo, no watermark, no border, no UI, no labels, no arrows, no photorealism, no 3D, no painterly rendering, no smooth gradients, no anti-aliasing, no high-res detail, no faux-pixel mixed grids.

Pixel-art seamless 2:1 far parallax layer, 1024×512 source, every colour block at least 2×2 pixels: distant giant nerve trunks and pale myelin slabs, very low contrast cool teal and sage, soft dither haze, large slow shapes. No ground line, no characters, no labels, no arrows, no unique focal object. Orthographic side view; tile seamlessly on all four edges; no single directional light, no hard cast shadows.

1024×512, 2:1, transparent background, isolated layer, no frame. Tile seamlessly on all four edges; every colour block at least 2×2 pixels; verify as a 2×2 repeat at native size and at 1280×720. Hard pixel edges; no anti-aliasing.
```

**Acceptance:** Low contrast, large slow shapes; no focal landmark; both-axis seam check passes; no text.

#### `bg.nerve_forest.mid` — mid parallax layer

**Style:** `STYLE_BACKGROUND`. **Frame:** `FRAME_PARALLAX`. **Source:** 1024×512 WebP/PNG, transparent, 2×2 clusters. **File:** `shared/backgrounds/nerve-forest-mid.webp`.

```text
Pixel art for a side-view 2D platformer set inside a living human body. Native pixel grid, hard square pixels, crisp edges, no anti-aliasing, no smoothing. Orthographic side view, landscape scale; atmospheric depth from layered values and dither, not a global gradient; local warm highlights only. Damp membrane sheen, condensation, dust and grime. Gross-cute biology, wry deadpan tone, 12+ friendly: never gory. Palette ramps: teal #05090b #101a20 #1d2f38; bone #c9b79a #f2e8d5 #fff8e8; bone shadow #5f736e #7a8f8a #9db4ad; nerve #b8862b #ffd166 #fff3b0; joint #3f9fb5 #7bdff2 #c9f7ff; muscle #a82a4a #ef476f #ff9fb2; sage #6f847d #9db4ad #c4d4ce; ink #000000 #05090b #2a3f47. No single directional light, no hard cast shadows, no god rays, no text, no logo, no watermark, no border, no UI, no labels, no arrows, no photorealism, no 3D, no painterly rendering, no smooth gradients, no anti-aliasing, no high-res detail, no faux-pixel mixed grids.

Pixel-art seamless 2:1 mid parallax layer, 1024×512 source, every colour block at least 2×2 pixels: branching dendrites, synaptic bulbs and hanging membranes in medium-contrast deep teal and sage, with a few nerve-yellow glow accents. No characters, no labels, no arrows, no unique focal object, no bone-cortex texture. Orthographic side view; tile on all four edges; soft ambient depth, no single directional light.

1024×512, 2:1, transparent background, isolated layer, no frame. Tile seamlessly on all four edges; every colour block at least 2×2 pixels; verify as a 2×2 repeat at native size and at 1280×720. Hard pixel edges; no anti-aliasing.
```

**Acceptance:** Medium contrast; no obvious repeat; no bone-cortex texture that fights the runtime overlay; both-axis seam check passes; no text.

#### `bg.nerve_forest.near` — near parallax layer

**Style:** `STYLE_BACKGROUND`. **Frame:** `FRAME_PARALLAX`. **Source:** 1024×512 WebP/PNG, transparent, 2×2 clusters. **File:** `shared/backgrounds/nerve-forest-near.webp`.

```text
Pixel art for a side-view 2D platformer set inside a living human body. Native pixel grid, hard square pixels, crisp edges, no anti-aliasing, no smoothing. Orthographic side view, landscape scale; atmospheric depth from layered values and dither, not a global gradient; local warm highlights only. Damp membrane sheen, condensation, dust and grime. Gross-cute biology, wry deadpan tone, 12+ friendly: never gory. Palette ramps: teal #05090b #101a20 #1d2f38; bone #c9b79a #f2e8d5 #fff8e8; bone shadow #5f736e #7a8f8a #9db4ad; nerve #b8862b #ffd166 #fff3b0; joint #3f9fb5 #7bdff2 #c9f7ff; muscle #a82a4a #ef476f #ff9fb2; sage #6f847d #9db4ad #c4d4ce; ink #000000 #05090b #2a3f47. No single directional light, no hard cast shadows, no god rays, no text, no logo, no watermark, no border, no UI, no labels, no arrows, no photorealism, no 3D, no painterly rendering, no smooth gradients, no anti-aliasing, no high-res detail, no faux-pixel mixed grids.

Pixel-art seamless 2:1 near foreground parallax layer, 1024×512 source, every colour block at least 2×2 pixels: dark fibrous roots, membrane bulbs and membrane folds framing the left and right edges and the top, very high contrast deep teal silhouettes, with large fully transparent gaps across the centre and lower third. Occasional nerve-yellow glow. No characters, no labels, no arrows, no unique focal object, no opaque band across the play area. Orthographic side view; tile on all four edges.

1024×512, 2:1, transparent background, isolated layer, no frame. Tile seamlessly on all four edges; every colour block at least 2×2 pixels; verify as a 2×2 repeat at native size and at 1280×720. Hard pixel edges; no anti-aliasing.
```

**Acceptance:** Centre and lower third stay transparent; the layer does not hide platforms or players; both-axis seam check passes; no text.

### 8.21 Material atlas prompts

Ludo cannot output a named atlas. Generate **one seamless 1024×1024 material swatch concept per material**, pixel-clean it to a **512×512 working swatch** with 2×2 clusters, approve it at 32×32, then assemble the frames in Aseprite. The atlas is a post-process, not a single Ludo output. Keep the frame grid at **32×32**; do not switch to 16×16 frames.

#### `tile.bone.atlas` — 47-frame `blob47`

**Reference:** P1 for palette/line; approved bone swatch for frames. **Style:** `STYLE_ATLAS`. **Frame:** `FRAME_ATLAS`. **Source/export:** 256×192 PNG, 8×6 grid, 32×32 frames, 2×2 clusters, opaque cells. **File:** `shared/tiles/bone-atlas.png`.

```text
Pixel-art seamless material texture for a side-view platformer set inside a living human body. Native pixel grid, hard square pixels, every colour block at least 2×2 pixels, no anti-aliasing, no smoothing. Flat fills from three-step ramps; 50% dither; no smooth gradients. Uniform flat lighting; no directional highlight, no vignette, no baked edge shading, no bevel, no drop shadow, no grid. Orthographic surface, seamless material swatch. Palette ramps: teal #05090b #101a20 #1d2f38; bone #c9b79a #f2e8d5 #fff8e8; bone shadow #5f736e #7a8f8a #9db4ad; nerve #b8862b #ffd166 #fff3b0; joint #3f9fb5 #7bdff2 #c9f7ff; muscle #a82a4a #ef476f #ff9fb2; sage #6f847d #9db4ad #c4d4ce; ink #000000 #05090b #2a3f47. Gross-cute biology, wry deadpan tone, 12+ friendly. No text, no logo, no watermark, no border, no UI, no characters, no scene, no perspective, no 3D, no photorealism, no baked directional edge.

Seamless pixel-art bone-material texture swatch for a side-view platformer: damp bone cortex in bone cream and bone shadow, deep teal in the pores, fine mineral grit, subtle pores and grime, broad soft mottling. No large cracks, no embedded objects, no symbols, no labels, no grid, no border. Uniform flat lighting, no directional highlight, no baked edge shading, no vignette, no bevel, no drop shadow. Orthographic surface; every colour block at least 2×2 pixels; tile seamlessly on all four edges at 32×32. Pixel-clean to a 512×512 working swatch.

1024×1024 seamless material swatch concept, uniform flat lighting, no grid, no labels, no frame, no directional highlight, no baked edge. Hard pixel edges; every colour block at least 2×2 pixels. Pixel-clean to a 512×512 working swatch; assemble 32×32 frames offline.
```

**Bone delta:** restrict the palette to bone cream, bone shadow, deep teal and a little sage. Do not introduce muscle pink or nerve yellow. The material edge is hard and mineral, not a soft membrane rim.

**Atlas assembly**

- Grid: 8 columns × 6 rows, row-major, `x = column × 32`, `y = row × 32`.
- 47 used regions in this order:
  `0, 1, 4, 5, 7, 16, 17, 20, 21, 23, 28, 29, 31, 64, 65, 68, 69, 71, 80, 81, 84, 85, 87, 92, 93, 95, 112, 113, 116, 117, 119, 124, 125, 127, 193, 197, 199, 209, 213, 215, 221, 223, 241, 245, 247, 253, 255`.
- Region names: `mask-<key>`. The last cell (row index 5, column index 7) has no region; fill it with an opaque neutral bone colour so the atlas has no transparent holes.
- Example: `mask-85` is row index 2, column index 5, so `x = 160`, `y = 64`; `mask-255` is row index 5, column index 6, so `x = 192`, `y = 160`.
- For each frame, draw edge occlusion only on the sides where the mask bit is **absent**. Do not bake a single top edge into every frame. The frame must read correctly when tiled with its neighbours.
- Keep every 32×32 cell fully opaque and on the 2×2 cluster grid. Do not trim, add gutters or leave transparent seams.

**Acceptance**

- Exactly 47 named regions, coordinates matching the grid; the empty cell has no region.
- Every frame tiles 2×2 on all four sides; a 3×3 patch of any frame shows no seam.
- Mask variants are visually distinct; the edge direction matches the mask.
- No text, labels, grid lines or baked directional edge.
- 256×192, opaque, 2×2 clusters, ≤80 KB.
- The runtime tint decision in §8.21.1 is applied and checked.

#### `tile.nerve.atlas` — 16-frame `edge`

**Reference:** P1 for palette/line; approved nerve swatch for frames. **Style:** `STYLE_ATLAS`. **Frame:** `FRAME_ATLAS`. **Source/export:** 128×128 PNG, 4×4 grid, 32×32 frames, 2×2 clusters, opaque cells. **File:** `shared/tiles/nerve-atlas.png`.

```text
Pixel-art seamless material texture for a side-view platformer set inside a living human body. Native pixel grid, hard square pixels, every colour block at least 2×2 pixels, no anti-aliasing, no smoothing. Flat fills from three-step ramps; 50% dither; no smooth gradients. Uniform flat lighting; no directional highlight, no vignette, no baked edge shading, no bevel, no drop shadow, no grid. Orthographic surface, seamless material swatch. Palette ramps: teal #05090b #101a20 #1d2f38; bone #c9b79a #f2e8d5 #fff8e8; bone shadow #5f736e #7a8f8a #9db4ad; nerve #b8862b #ffd166 #fff3b0; joint #3f9fb5 #7bdff2 #c9f7ff; muscle #a82a4a #ef476f #ff9fb2; sage #6f847d #9db4ad #c4d4ce; ink #000000 #05090b #2a3f47. Gross-cute biology, wry deadpan tone, 12+ friendly. No text, no logo, no watermark, no border, no UI, no characters, no scene, no perspective, no 3D, no photorealism, no baked directional edge.

Seamless pixel-art nerve-material texture swatch for a side-view platformer: damp nerve fibres in nerve yellow and sage, joint-cyan edge sheen, fine fibrous grain, subtle pores and grime, broad soft mottling. No large cracks, no embedded objects, no symbols, no labels, no grid, no border. Uniform flat lighting, no directional highlight, no baked edge shading, no vignette, no bevel, no drop shadow. Orthographic surface; every colour block at least 2×2 pixels; tile seamlessly on all four edges at 32×32. Pixel-clean to a 512×512 working swatch.

1024×1024 seamless material swatch concept, uniform flat lighting, no grid, no labels, no frame, no directional highlight, no baked edge. Hard pixel edges; every colour block at least 2×2 pixels. Pixel-clean to a 512×512 working swatch; assemble 32×32 frames offline.
```

**Nerve delta:** restrict the palette to nerve yellow, sage, joint cyan and deep teal. Do not introduce muscle pink. The material edge is soft and fibrous, not a hard mineral rim.

**Atlas assembly**

- Grid: 4 columns × 4 rows, row-major, `x = column × 32`, `y = row × 32`.
- 16 used regions in this order: `0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15`.
- Region names: `mask-0` … `mask-15`.
- For each frame, draw the soft nerve edge only on the sides where the cardinal mask bit is absent. Do not bake a single top edge.
- Keep every 32×32 cell fully opaque and on the 2×2 cluster grid; no gutters or transparent seams.

**Acceptance**

- Exactly 16 named regions `mask-0` … `mask-15`, coordinates matching the grid.
- Every frame tiles 2×2 on all four sides; a 3×3 patch shows no seam.
- The soft edge matches the `edge` autotile rule; frames are visually distinct.
- No text, labels, grid lines or baked directional edge.
- 128×128, opaque, 2×2 clusters, ≤80 KB.
- The runtime tint decision in §8.21.1 is applied and checked.

#### 8.21.1 Pack integration and tint decision

The current pack does **not** match the final atlas IDs:

- `assets.final.json` has one `tile.anatomy.atlas` (`192×128`, 20 regions).
- `materials.json` maps `nerve-edge` to `tile.anatomy.atlas`.
- The bone material uses procedural `blob47` and has no variant set.
- `room-scene.ts` applies `material.tint` to final atlas frames. Bone tint is `bone`; nerve tint is `nerve`.

Before final atlas files can render, a content task must:

1. Add `tile.bone.atlas` and `tile.nerve.atlas` to the manifest with the region maps above.
2. Add a `bone-blob47` variant set with the 47 frames and set `bone.variantSet`.
   - Frame keys are the canonical mask strings (`"0"`, `"1"`, `"4"`, …), not the region names.
   - Each frame ref is `{ "kind": "atlas", "assetId": "tile.bone.atlas", "frame": "mask-<key>" }`; fallback is `mask-0`.
3. Repoint `nerve-edge` to `tile.nerve.atlas`.
   - Keys stay `"0"`…`"15"`; frame refs become `mask-0`…`mask-15`.
4. Decide the tint path:
   - **Recommended:** remove the bone and nerve `tint` values, author the atlases in final colours, and render them as authored.
   - **Fallback:** keep the tint and author neutral-light atlases, then accept the runtime hue.

Do not mix the two. If this decision is not made, generate the swatches only and do not ship a final atlas. The pixel pass does **not** change the 32×32 frame size or the region maps; it only changes the pixel density inside each frame.

### 8.22 Badge prompt

#### `ui.icon.badge`

**Reference:** `style-anchor-p1.png`. **Style:** `STYLE_BADGE`. **Frame:** `FRAME_BADGE`. **Source:** 16×16 PNG, alpha. **File:** `shared/ui/badge.png`. **Display:** current ~45×27 CSS px pill with `cover`; pixel-UI target 32×32.

```text
Pixel-art game emblem for a dark-teal HUD. Native pixel grid, hard square pixels, 1px dark outline, no anti-aliasing, no smoothing. Flat fills from three-step ramps; one hard form shadow; one warm highlight; subtle grime. Gross-cute biology, wry deadpan tone, 12+ friendly. Palette ramps: teal #05090b #101a20 #1d2f38; bone #c9b79a #f2e8d5 #fff8e8; bone shadow #5f736e #7a8f8a #9db4ad; nerve #b8862b #ffd166 #fff3b0; joint #3f9fb5 #7bdff2 #c9f7ff; muscle #a82a4a #ef476f #ff9fb2; sage #6f847d #9db4ad #c4d4ce; ink #000000 #05090b #2a3f47. Simple, bold, readable at 32×32 and in a ~45×27 pill crop. No text, no logo, no watermark, no UI, no rectangular frame, no photorealism, no 3D, no painterly rendering, no smooth gradients, no high-res detail.

Pixel-art mission-patch emblem designed on a 16×16 source grid: a tiny astronaut helmet with a warm amber visor inside a broken ring of nerve fibres and bone plates. Bone cream, deep teal, nerve yellow and joint cyan; 1px dark outline; flat fills from the ramps; one hard shadow shape; simple bold shapes that read when small. Centred composition; keep the helmet and visor inside the middle 60% vertical band; the outer ring may crop. No text, no logo.

16×16, 1:1, centred emblem, transparent or flat magenta #FF00FF background, no rectangular frame. Keep the helmet and visor inside the middle 60% vertical band; the current HUD displays a ~45×27 pill crop, the pixel UI target is 32×32. Hard pixel edges; no anti-aliasing.
```

**Acceptance**

- At the ~45×27 pill crop, the helmet and amber visor read; the ring may be cropped.
- At the 32×32 pixel-UI target, the emblem reads with hard pixel edges.
- No text, logo, watermark or rectangular frame.
- Works on the dark teal HUD; alpha clean; ≤8 KB.

### 8.23 Audio prompts

**AUDIO_STYLE — prepend to every cue**

```text
Short diegetic game sound effect, 48 kHz, dry, tactile, sci-fi suit plus wet organic body, no music, no voice, no gore, clean tail with no long reverb, no clipping.
```

| Asset ID | Prompt | Duration | File |
|---|---|---|---|
| `audio.cue.boot` | `Suit power-up: soft electric hum rising, helmet seal hiss, two tiny confirmation beeps.` | 0.6–1.2 s | `shared/audio/boot.ogg` |
| `audio.cue.dialogue` | `Cell-speech translator: wet organic chirp, soft radio static blip, short and friendly.` | 0.2–0.8 s | `shared/audio/dialogue.ogg` |
| `audio.cue.scan` | `Scanner sweep: high sonar ping, data tick, faint shimmer.` | 0.3–1.0 s | `shared/audio/scan.ogg` |
| `audio.cue.dash` | `Suit thruster: short air puff, fabric snap, quick whoosh.` | 0.2–0.7 s | `shared/audio/dash.ogg` |
| `audio.cue.gate` | `Organic lock release: wet squelch, bone clunk, soft chime; not gory.` | 0.4–1.2 s | `shared/audio/gate.ogg` |
| `audio.cue.map` | `Holographic map unfold: soft digital shimmer, tiny chime, paper-like flap.` | 0.3–0.9 s | `shared/audio/map.ogg` |
| `audio.cue.debrief` | `Warm resolution: soft two-note synth chime, suit confirmation click.` | 0.4–1.2 s | `shared/audio/debrief.ogg` |
| `audio.cue.checkpoint` | `Beacon ping: clean pulse, small save confirmation.` | 0.3–0.9 s | `shared/audio/checkpoint.ogg` |
| `audio.cue.unlock` | `Ability unlock: rising synth, nerve zap, satisfying click.` | 0.5–1.2 s | `shared/audio/unlock.ogg` |
| `audio.cue.jump` | `Suit servo jump: soft pneumatic push, tiny fabric movement.` | 0.15–0.5 s | `shared/audio/jump.ogg` |
| `audio.cue.land` | `Boots land on wet tissue: soft squelch, suit thud, no gore.` | 0.15–0.5 s | `shared/audio/land.ogg` |

`audio.cue.wrong` is declared in the theme and manifest but is outside the 11-cue M3 pass. If it is added, use: `Wrong-answer feedback: short dry buzz, soft suit click, no voice.` Duration 0.2–0.6 s; file `shared/audio/wrong.ogg`; total becomes 33.

**Audio acceptance:** duration inside the cue window; dry, no long tail; no music or voice; no gore; ≤120 KB; OGG or MP3; file name matches the table.

### 8.24 Prompt log

Every generated asset gets a row using the template in §10.3. At minimum record: `promptVersion`, `styleVersion`, asset ID, reference, negative block, model/seed, aspect/export, variations, chosen file, pixel cleanup, palette, grid check, runtime check, verdict and licence.

If an asset is retried, keep the failed row and add a new row. Do not overwrite history; the log is the evidence for the AI-generated asset record.

### 8.25 Prompt dependencies and visual do-not-claim guard

Prompts that depend on a decision or missing reference:

- **Atlas prompts** depend on the two-atlas wiring and tint decision in §8.21.1.
- **`sprite.scan.reflex`** has no authored room; it is a reserve and may remain placeholder.
- **04's Muscle Effector agent** reuses `sprite.agent.neuron`; finalizing the Neuron Keeper changes 04's placeholder agent. This is an open decision, not a prompt error.
- **`audio.cue.wrong`** is outside the 32-asset total; adding it makes 33.
- **Badge** depends on accepting the ~45×27 pill crop and the 32×32 pixel-UI target.
- **`sprite.gate.nerve`** is used by 04 but remains placeholder; do not generate it in M3.
- **Vault visual anchors:** `DESIGN.md`, `learning-design-brief.md` and the NERV cards were not readable when this revision was written because `docs/shrinkonauts` points to an unavailable macOS path. The prompts use §4 and `anatomy-fidelity.md`; re-check the vault copies before final visual sign-off.

Visual do-not-claim guard. Do not draw any of these:

- bone tissue innervated by the nerve in 01, or a nerve inside bone;
- the joint capsule as the stretch receptor;
- a brain sending the knee-jerk signal, or a claim that the brain is absent from the person or feels nothing;
- a larger spike for a stronger or third stimulus;
- myelin as an amplifier, or myelin made by the neuron character;
- ACh as the only neurotransmitter, or every receptor as nicotinic;
- a synapse as a simple relay with no postsynaptic response;
- EPSP/IPSP summation as core content;
- a one-neuron reflex arc;
- hamstring reciprocal inhibition as required for the core kick;
- a CPU as a brain, or an interrupt controller as a literal spinal cord;
- text, labels, arrows, diagram lines, or a medical-textbook cutaway.

The art can be weird and fleshy, but it must stay inside the fidelity ledger and the 12+ tone guard.

---

## 9. Acceptance criteria

### 9.1 Per-category acceptance

| Category | Must pass |
|---|---|
| Players | 14×22 source, 28×44 display; 2× grid; P1/P2 differ by accent only; helmet, backpack and boots readable; feet at baseline; no anti-aliasing; no baked shadow |
| Entities | 18×18 source, 36×36 display; 2× grid; silhouette distinct from every other entity; base at the bottom padding line; survives the warm interaction tint; no text; no baked shadow |
| Backgrounds | Sky 640×368 displayed at an exact integer 2×; supports HUD contrast at 1280×720; far/mid/near tile without seams at 2×2 on **both axes**; near layer leaves the centre and lower third transparent |
| Material atlas | Bone has 47 `blob47` frames, nerve has 16 `edge` frames; every 32×32 frame is authored at 1:1 with a 2×2 cluster grid and tiles on all four sides; mask variants are visually distinct; no text or baked directional edge; tint path checked |
| Badge | 16×16 source reads in the ~45×27 HUD pill and at the 32×32 pixel-UI target; no text; central composition; works on dark teal |
| UI | Pixel font at integer sizes (12 px labels minimum, 15–16 px body); square chrome; no radius, blur, or soft shadow; material/pattern slots use the same ramps; focus visible; text scale works |
| Audio | Duration inside the cue window; short, dry, no long tail; no audio-only cue; no gore; no music |

### 9.2 Style consistency

- Same 2× pixel density across players, entities, sky, and badge; parallax and atlas frames use 2×2 minimum clusters.
- Same 1 px source outline weight; no asset suddenly uses a 2 px or 0 px outline.
- Same ramp palette; no purple/neon drift and no intermediate blends.
- Same level of detail; no asset is suddenly painterly, 3D, or faux-pixel with mixed sizes.
- Same tone: gross-cute, not edgy.
- Same camera language: side or slight 3/4 for characters; orthographic for backgrounds.
- Material frames share the world’s material/pattern language; UI panels use the same ramps and dither.
- All assets pass the “same game” test on one contact sheet.

### 9.3 Technical QA

- Correct source size: 14×22 player, 18×18 entity, 640×368 sky, 1024×512 parallax, 512×512 material swatch, 256×192 or 128×128 atlas, 16×16 badge.
- Display lands on exact 2× for players, entities, sky, and badge; parallax tiles 1:1 with 2×2 clusters; atlas frames 1:1 with 2×2 clusters.
- No anti-aliasing, blur, or fractional scaling.
- Palette is quantised to the ramp table; no stray colours.
- Alpha is clean at 400%; no magenta fringe; no semi-transparent sprite edges.
- No JPG or lossy WebP for pixel assets.
- File size within budget.
- File names match the asset register.
- No text, logo, watermark, border, or checkerboard.
- Player/entity origins and paddings are consistent.
- Background layers tile on both axes; the 2×2 check passes at native and runtime size.
- Atlas region names and coordinates match §8.21; every frame passes the 3×3 edge check.
- The atlas tint path is recorded and matches the rendered result.
- The badge passes the ~45×27 pill crop and the 32×32 target.
- Entity sprites survive the warm interaction tint.
- The prompt log is complete for every accepted asset.

### 9.4 Content QA

- No blood, gore, open wounds, viscera, or shock imagery.
- No religious, sexual, or toilet humour.
- No copied characters or copyrighted props.
- No labels or arrows baked into the art.
- The body reads as a place, not a textbook diagram.
- The 12+ audience is respected.

### 9.5 Manifest and validator

- `assets.final.json` has real `src` paths for all 20 referenced visible images and 11 audio cues. `sprite.scan.reflex` may remain a declared reserve, giving 21 declared images.
- Each atlas entry declares `type: "atlas"`, intrinsic `width`/`height`, and named `regions`; every variant-set frame and fallback resolves.
- The two final atlases use the region maps in §8.21; the bone `blob47` variant set exists and the nerve `edge` variant set points at the final nerve atlas.
- `materials.json` parses, every palette token exists in `theme.json`, and tile/background/UI/entity references resolve.
- The atlas tint decision in §8.21.1 is applied consistently; final atlases are not double-tinted.
- Each entry has a matching licence label in `licenses.json`.
- Silkscreen and Pixelify Sans are bundled locally (no CDN) and recorded in the licence log.
- `npm run pack:validate` passes.
- `npm run pack:smoke` still passes.
- `?assets=final` loads the final manifest.
- No visible placeholder remains in a capture shot. Declared reserves (`sprite.scan.reflex`), 04 environment placeholders and the eight deferred UI images do not count as missing.

### 9.6 Sign-off checklist

- [ ] Six-asset pixel style gate passes.
- [ ] P1 and P2 approved at 28×44 from 14×22 sources.
- [ ] Neuron Keeper approved.
- [ ] Four visible scan targets approved; `sprite.scan.reflex` reserve is optional.
- [ ] Gate, exit, props, receptors approved.
- [ ] Sky and mid layer approved; far/near approved.
- [ ] Bone and nerve atlases approved; region maps, 2×2 clusters and tint path checked.
- [ ] Badge approved at the pill crop and the 32×32 pixel-UI target.
- [ ] UI pixel chrome, fonts, material/pattern slots approved.
- [ ] 11 SFX approved.
- [ ] All files named and placed at source size.
- [ ] Manifest, materials, font licences, and asset licences updated.
- [ ] Prompt log complete.
- [ ] Contact sheet reviewed at actual size.
- [ ] Capture stills reviewed.
- [ ] Cut-line assets and reserves explicitly marked as placeholders.

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
  "tile.bone.atlas": {
    "type": "atlas",
    "src": "shared/tiles/bone-atlas.png",
    "width": 256,
    "height": 192,
    "regions": {
      "mask-0": { "x": 0, "y": 0, "width": 32, "height": 32 },
      "mask-85": { "x": 160, "y": 64, "width": 32, "height": 32 },
      "mask-255": { "x": 192, "y": 160, "width": 32, "height": 32 }
    },
    "license": "Ludo AI Commercial (paid)"
  },
  "tile.nerve.atlas": {
    "type": "atlas",
    "src": "shared/tiles/nerve-atlas.png",
    "width": 128,
    "height": 128,
    "regions": {
      "mask-0": { "x": 0, "y": 0, "width": 32, "height": 32 },
      "mask-15": { "x": 96, "y": 96, "width": 32, "height": 32 }
    },
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
  "modified": "Generated concept 2026-11-04; pixel-cleaned at 14×22; palette quantised; background removed; grid checked",
  "aiGenerated": true
}
```

Use a stable license label across all Ludo-paid assets, for example `Ludo AI Commercial (paid)`, and make the manifest `license` field match the label in `licenses.json`.

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

### 10.3 Prompt log

Keep a separate spreadsheet or Markdown table with:

| Field | Example |
|---|---|
| Prompt version | `m3-2026-10-29.2` |
| Style version | `style-pixel-v1` / `STYLE_SPRITE` |
| Asset ID | `sprite.agent.neuron` |
| Category | sprite / background / parallax / atlas / badge / audio |
| Tool and plan | Ludo.ai / Indie |
| Model and seed | Ludo image model; seed `123456` |
| Reference | `style-anchor-p1.png` |
| Negative block | `NEGATIVE_SPRITE` |
| Prompt | Full positive prompt text |
| Frame block | `FRAME_ENTITY` |
| Aspect and export | 1:1 / 18×18 source; 36×36 display |
| Variations | 4 |
| Chosen file | `shared/sprites/agent-neuron.png` |
| Date | 2026-11-04 |
| Pixel cleanup | Aseprite; 18×18; palette quantised; anti-aliasing removed |
| Grid check | 2× display; 2×2 clusters where the layer is 1:1 |
| Post-processing | Magenta keyed; 400% edge check; trimmed; 1 px pad; palette quantised; no anti-aliasing |
| Runtime check | Reads at 36×36; warm tint check; contact sheet |
| Verdict | Approved / retry / placeholder |
| Licence | `Ludo AI Commercial (paid)` |
| Notes | One variable changed; reason for retry |

Copy-paste row template:

```text
| m3-2026-10-29.2 | style-pixel-v1 | asset.id | category | Ludo/Indie | model/seed | reference | negative | prompt | frame | aspect/export | 4 | chosen-file | date | pixel-cleanup | grid-check | post-process | runtime-check | verdict | licence | notes |
```

The prompt log is the evidence for the GDD/video asset list and the AI-generated asset record. Keep failed rows; add a new row for each retry.

### 10.4 Free-tier note

Use the free tier only for the six-asset style gate. Do not ship a free-tier file if it is watermarked or the terms do not cover the intended use. Regenerate the keepers on the paid Indie plan for final assets. If Ludo’s free output is clean and the terms allow it, record that explicitly in the prompt log; otherwise do not use it.

---

## 11. Production plan

### 11.1 Budget

Assumptions:

- 21 image concepts × 4 variations × 0.5 credits = **42 credits**
- 11 SFX × 2 credits = **22 credits**
- Retries, inpainting, and fixes = **~40 credits**
- Total ≈ **104 credits**
- Pixel cleanup and atlas assembly are manual time in Aseprite/Piskel, not Ludo credits.

The two atlas swatches are counted in the 21 images; assembling 47 + 16 frames consumes no image credits.

Ludo Indie includes **250 credits/month** for **$20**. This is enough. Buy extra credits only if the scope expands or the concept gate needs heavy iteration.

**Do not buy Pro ($50/mo) for M3** unless:

- you need API/MCP/CLI automation;
- content expands beyond ~100 images;
- you decide to produce many animated sheets (after animation playback is implemented).

### 11.2 Work order

| Stage | Work |
|---|---|
| 1 | Six-asset pixel gate; approve P1 at 14×22 / 28×44; lock palette ramps |
| 2 | Batch 1: P2, Neuron Keeper, `scan.neuron`, exit; pixel-clean each |
| 3 | Batch 2: sky, mid; verify integer 2× and both-axis tiling |
| 4 | Batch 3: bone and nerve swatches; approve 32×32 frames; assemble atlases after the tint decision |
| 5 | Batch 4: remaining scans, gate, tracer, pulse, receptors after the 03/04 room check |
| 6 | Batch 5: far, near, badge |
| 7 | Integrate, manifest, materials, licences, fonts, prompt log, contact sheet, capture stills |

### 11.3 Cut lines

In order:

1. Drop the reserve `sprite.scan.reflex` and the placeholder `sprite.checkpoint` / `sprite.gate.nerve`.
2. Drop `far` and `near` layers; use tinted placeholder layers.
3. Drop the final bone/nerve atlases; keep placeholders.
4. Drop `badge` polish; keep the placeholder.
5. Drop SFX polish; use synth fallback.
6. If the pixel style gate fails, ship placeholders.

Never cut P1/P2, Neuron Keeper, the main interactive landmark (gate or exit), or the scan targets if they appear in the video. If the atlas wiring or tint decision is unresolved, cut the final atlases, not the sprites.

### 11.4 Risks

| Risk | Mitigation |
|---|---|
| Ludo concepts are faux-pixel (mixed grids, anti-aliasing) | Treat Ludo as concept only; pixel-clean at source size in Aseprite/Piskel |
| Pixel-grid drift across 21 assets | P1 anchor + fixed source sizes + 400% check + contact sheet |
| Palette drift | Quantise to the ramp table; reject intermediate blends |
| Non-integer sky or background scaling | Integer 2× cover (ADR-0048); test at 1280×720 |
| Parallax seams | 1024×512 with 2×2 clusters; both-axis 2×2 check |
| Player reads poorly at 28×44 | 14×22 source; silhouette test; simplify the design |
| Atlas cannot be authored by Ludo | Generate a seamless swatch; assemble 47/16 frames in Aseprite; validate region maps |
| Atlas double-tinted or too dark | Decide the tint path before generation; preview with the material tint; do not mix approaches |
| Atlas frame grid drifts | Keep 32×32 frames at 1:1; author with 2×2 clusters; do not change frame size |
| Badge cropped badly in the HUD pill | Keep the helmet and visor in the middle 60% vertical band; check at ~45×27 and 32×32 |
| UI font readability | Minimum 12/15 px; integer text scales; mixed case for dialogue |
| Alpha halos on dark background | Magenta background + 400% edge check + manual cleanup |
| 04 shows a neuron as the Muscle Effector agent | Accept as an M3 placeholder mismatch or add a 04 agent ID later; do not change the 03 art to compensate |
| Puzzle prop art invalidated by room changes | Check gate/tracer/pulse/receptor art against the authored rooms; re-baseline §5.3 |
| Credits exhausted | Indie 250 is enough; top up rather than upgrade |
| Free-tier watermark | Free tier for the concept gate only; paid Indie for finals |
| Engine can’t animate | Static sprites only; animation is a separate engine task |

---

## 12. Future levels

### 12.1 Level kit template

When a level is authored, validated, and in the capture list, instantiate:

- 4 background layers: 640×368 sky, 1024×512 far/mid/near with 2×2 clusters
- 1 material atlas per authored material (32×32 frames at 1:1 with 2×2 clusters, or a shared atlas with named regions)
- 1 agent character: 18×18 source, 36×36 display
- 3–5 scan targets: 18×18 source
- 1 gate: 18×18 source
- 1 exit: 18×18 source
- 1 checkpoint (if used): 18×18 source
- 2–4 props: 18×18 source

Reuse the shared players (14×22 source), badge (16×16 source), and audio cues. Do not generate a new player per level. Follow the pixel grid, palette, and atlas rules in §4 and §6.

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
- its M2 puzzle design is implemented and validated — see [`docs/m2/nervous-puzzles/`](../m2/nervous-puzzles/).

---

## 13. Open decisions

- [x] Adopt whole-game pixel art (ADR-0047).
- [x] Adopt half-res source with 2× nearest-neighbour display (ADR-0048).
- [x] Adopt pixel UI chrome and fonts (ADR-0049).
- [x] Use three-step palette ramps; the eight hue families stay.
- [x] Use Silkscreen + Pixelify Sans as the bundled UI fonts.
- [x] M3 environment art target = `03-nerve-forest`; 04 environment stays placeholder. Shared entity sprites are final because both rooms reference them.
- [x] P1 uses joint cyan; P2 uses muscle-pink; silhouette identical.
- [x] No animation work in M3.
- [x] Ludo Indie ($20/mo), not Pro.
- [x] Skip the eight deferred UI images; badge only.
- [x] 21 declared images = 20 referenced by authored rooms + 1 reserve (`sprite.scan.reflex`).
- [x] 11 M3 audio cues; `audio.cue.wrong` stays placeholder.
- [ ] Approve the two final atlas IDs (`tile.bone.atlas`, `tile.nerve.atlas`), the region maps in §8.21, the `bone-blob47` variant set, and the `nerve-edge` repoint.
- [ ] Choose the atlas tint path: remove the bone/nerve `tint` and author final colours, or keep the tint and author neutral-light atlases.
- [ ] Keep `sprite.scan.reflex` as a reserve or drop it from the 21-image list (which would make 20 images / 31 total).
- [ ] Accept 04's Muscle Effector agent reusing `sprite.agent.neuron`, or add a 04-specific agent ID in a later content task.
- [ ] Add `audio.cue.wrong` as a 12th cue (33 total) or keep it placeholder.
- [ ] Confirm the badge is a 16×16 source shown in the ~45×27 pill and/or the 32×32 pixel-UI target, rather than a 2:1 export.
- [ ] Confirm whether `far`/`near` appear in the capture shot; if not, cut them first.
- [ ] Confirm `sprite.gate.nerve` and `sprite.checkpoint` remain placeholders.
- [ ] Check the authored 03/04 rooms before generating puzzle props; re-baseline §5.3 if they change.

---

## 14. References

- [`adr-m3/0047-pixel-art-visual-direction.md`](../adr-m3/0047-pixel-art-visual-direction.md) — whole-game pixel-art direction.
- [`adr-m3/0048-half-resolution-pixel-rendering.md`](../adr-m3/0048-half-resolution-pixel-rendering.md) — half-res authoring and 2× display.
- [`adr-m3/0049-pixel-ui-chrome-and-typography.md`](../adr-m3/0049-pixel-ui-chrome-and-typography.md) — pixel UI and fonts.
- [`base-game/adr/0027-art-audio-direction-and-licensing.md`](../shrinkonauts/base-game/adr/0027-art-audio-direction-and-licensing.md) — licensing and audio decisions; visual-style portion superseded by ADR-0047.
- [`m1.8/README.md`](../m1.8/README.md) — material and pattern layer, autotiling, variants, atlas regions, UI slots.
- [`puzzle-engine/adr/0014-material-pattern-vocabulary.md`](../puzzle-engine/adr/0014-material-pattern-vocabulary.md), [`0015-tile-material-grid-autotiling.md`](../puzzle-engine/adr/0015-tile-material-grid-autotiling.md), [`0016-pattern-projection-surfaces.md`](../puzzle-engine/adr/0016-pattern-projection-surfaces.md), [`0017-tile-variant-atlas-manifest.md`](../puzzle-engine/adr/0017-tile-variant-atlas-manifest.md) — material/pattern decisions.
- [`puzzle-engine/material-pattern-implementation-plan.md`](../puzzle-engine/material-pattern-implementation-plan.md) — M1.8 implementation plan.
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
- [`docs/m2/nervous-puzzles/anatomy-fidelity.md`](../m2/nervous-puzzles/anatomy-fidelity.md) — fact/depth/claim ledger used by the prompts.
- [`docs/m2/nervous-puzzles/03-nerve-forest.md`](../m2/nervous-puzzles/03-nerve-forest.md) — Node Run design, implemented in `03-nerve-forest`.
- [`docs/m2/nervous-puzzles/04-muscle-effector.md`](../m2/nervous-puzzles/04-muscle-effector.md) — Endplate Ferry proposal that inherits the ferry pattern.
- [`docs/m2/nervous-puzzles/01-bone-gate.md`](../m2/nervous-puzzles/01-bone-gate.md), [`02-joint-chamber.md`](../m2/nervous-puzzles/02-joint-chamber.md), [`05-reflex-core.md`](../m2/nervous-puzzles/05-reflex-core.md), [`silicon-fixture.md`](../m2/nervous-puzzles/silicon-fixture.md) — future level specs.
- [`assets.final.json`](../../public/packs/anatomy-reflex/assets.final.json) — current manifest.
- [`materials.json`](../../public/packs/anatomy-reflex/materials.json) — current material and variant mapping.
- [`room.json`](../../public/packs/anatomy-reflex/levels/03-nerve-forest/room.json) — current room layers and entities.
- [`theme.json`](../../public/packs/anatomy-reflex/theme.json) — palette and UI asset IDs.
- [Silkscreen](https://fonts.google.com/specimen/Silkscreen) — Jason Kottke, SIL Open Font License 1.1.
- [Pixelify Sans](https://fonts.google.com/specimen/Pixelify+Sans) — Stefie Justprince, SIL Open Font License 1.1.
- [Aseprite](https://www.aseprite.org/), [Piskel](https://www.piskelapp.com/), [LibreSprite](https://libresprite.github.io/) — pixel cleanup, palette quantisation, and atlas assembly.

---

## 15. Change log

| Date | Change |
|---|---|
| 2026-10-27 | Initial M3 asset requirements, style bible, Ludo prompt pack, and scope contract. |
| 2026-10-28 | Cross-link the proposed M4 online co-op boundary; M4 adds no M3 asset IDs. |
| 2026-10-29 | M1.8 re-baseline: 21 visible images / 32 total; two material atlases replace the single tile; materials, variants, backgrounds, and UI slots added; 04 remains placeholder. |
| 2026-10-29 | Prompt-pack revision: §7–8 rewritten with category style/negative/frame blocks, per-asset prompts, reference workflow, atlas region maps, badge pill crop, audio durations, and prompt-log template. Scope reconciled to 20 referenced images + 1 reserve, 11 M3 cues, and 04 placeholder boundaries. |
| 2026-10-29 | Pixel re-alignment: v0.3 M1.8 scope preserved (21 images, two atlases, 04 authored); half-res 2× rendering; 21 pixel prompts; atlas frames 32×32 at 1:1 with 2×2 clusters; pixel UI and material/pattern slots; ADR-0047–0049. |

---

**End of document.**
