# M3 Asset Requirements — Shrinkonauts: The Reflex Arc

**Status:** Draft v0.3 · 29 October 2026 (M1.8 prompt-pack revision)
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
| Art scope | `03-nerve-forest` environments + shared final entity sprites |
| Visible images | **21** — 20 referenced by the authored 03/04 rooms, plus 1 reserve (`sprite.scan.reflex`) |
| Audio cues | **11** — M3 scope; the pack also declares `audio.cue.wrong`, which stays placeholder |
| Total M3 assets | **32** |
| Style | **Dank Anatomy Cartoon** |
| Tool | **Ludo.ai Image Generator / Audio Generator** |
| Ludo plan | **Indie, $20/mo** (Pro only if automation or scope grows) |
| Free-tier use | Six-asset style gate only |
| Animation | **None** — the runtime renders single images |
| UI panels/portraits | **Deferred** — not rendered by the current UI; badge only |
| Music | **Deferred** — not played by the current runtime |
| Levels 01, 02, 05, Silicon | **Deferred** — design proposals exist, but the pack content is not implemented |
| Level 04 | **Authored**; shares the final entity sprites, but its backgrounds, muscle/membrane tiles and `sprite.gate.nerve` stay placeholder art |
| Material atlases | **2 final atlases**: bone (`blob47`, 47 regions) and nerve (`edge`, 16 regions). The current pack still has one `tile.anatomy.atlas` placeholder |
| Content dependency | **Puzzle-specific props are checked against the authored 03/04 rooms**; do not generate props the rooms do not reference |

> **Content dependency.** The pack implements Node Run in `03-nerve-forest` and
> Endplate Ferry in `04-muscle-effector`; the earlier Signal Ferry layout is
> retained only as a test fixture. Check every puzzle-specific prop against the
> authored rooms before generation. `sprite.scan.reflex` is declared but not
> referenced by either room and is a reserve, not a capture blocker. See §2.4
> before generating gates, tracers, receptors, or pulse terminals.

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
| Visible shared entity sprites | 12 | 11 referenced by 03/04; `sprite.scan.reflex` is a reserve |
| `03-nerve-forest` background layers | 4 | Sky, far, mid, near |
| Final material atlases (bone, nerve) | 2 | 47-frame `blob47` bone atlas; 16-frame `edge` nerve atlas |
| Badge | 1 | The only UI asset currently rendered |
| **Visible images subtotal** | **21** | 20 referenced + 1 reserve |
| SFX cues | 11 | `audio.cue.wrong` is outside the M3 scope |
| **M3 total** | **32** | 21 images + 11 audio |

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
3. **No gameplay code changes.** ADR-0033 forbids mixing the art pass with code changes. If an asset requires new rendering behaviour, it becomes an engine/UI task and is scheduled separately.
4. **Static sprites only.** The current `world` adapter uses Phaser images, not animations. Animated sheets would display frame 0 only.
5. **Reuse the shared kit.** Players, material atlases, badge, and audio cues are shared. Do not generate per-level duplicates.
6. **Placeholders are an acceptable fallback.** A coherent placeholder build is better than a half-finished final build. The validator already supports declared placeholders.
7. **Two style anchors.** Characters and props derive from the approved P1 anchor; backgrounds derive from the approved sky; atlases derive from approved material swatches. The style blocks in §8 are the same for every asset in a category.

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

These are current implementation facts, not preferences.

| Constraint | Evidence | Consequence for M3 |
|---|---|---|
| Players are displayed at **28×44 px** | `src/world/physics.ts` (`PLAYER_WIDTH`, `PLAYER_HEIGHT`) | Export player textures at 112×176 (7:11). Do not squash a square image into 28×44. |
| Entities are displayed at **36×36 px** | `src/world/room-scene.ts` (`ENTITY_SIZE = 36`) | Export entity textures at 144×144. Design for 36 px readability. |
| The room uses **material grids and atlases** (`tileSize: 32`) | `room.json` (`tileMaterials`), `materials.json`, `room-scene.ts` | 03 needs bone/nerve atlas frames; 04 muscle/membrane tiles stay placeholder |
| The current pack has **one placeholder atlas** | `assets.final.json` (`tile.anatomy.atlas`), `materials.json` (`nerve-edge`) | Final art targets two atlases; the pack mapping is a separate content task |
| Final atlas frames are **tinted by the material** | `room-scene.ts` (`materialTint`) | Either author neutral atlases and keep `tint`, or remove the bone/nerve `tint` when final colored atlases land |
| Background far/mid/near use `fit: "tile"` | `room.json`, `src/world/background.ts` (`TileSprite`) | These layers must tile on **both axes**. Avoid unique landmarks that repeat obviously. |
| The sky uses `fit: "cover"` and is scaled ~1.4× | `src/world/background.ts` | Generate a 16:9 sky with safe dark areas for HUD and silhouettes; keep detail inside the central 70%. |
| Spritesheets are loaded but not animated | `room-scene.ts` loads `type: "sheet"` but creates `this.add.image(...)`; no `this.anims.create(...)` | For M3, use static `sprite` entries and single PNG/WebP images. |
| Only the badge UI asset is rendered | `src/ui/hud.ts` (`styleBadge`, `.hud__stamp--image`) and `src/game/boot.ts` | Generate `ui.icon.badge`; skip the other UI images. The badge renders as a ~45×27 CSS px pill with `cover`, not a square icon. |
| Entity sprites are briefly tinted on interaction | `room-scene.ts` (`applyInteractionHighlight`, `0xffe08a`) | Check every entity sprite under a warm tint; cyan/yellow details must survive. |
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

| Bucket | Count | Note |
|---|---:|---|
| Visible M3 images | 21 | 20 referenced by authored rooms + 1 reserve (`sprite.scan.reflex`) |
| SFX cues | 11 | `audio.cue.wrong` is outside M3 |
| **M3 production total** | **32** | 21 images + 11 audio |
| Deferred UI images | 8 | Badge is the only rendered UI image |
| **Current manifest entries** | **47** | Includes 12 audio; the final two-atlas layout adds one atlas entry |

### 5.2 Shared kit

| Asset ID | Type | Display size | Export size | File path | Priority |
|---|---|---:|---:|---|---|
| `sprite.player.p1` | sprite | 28×44 | 112×176 PNG | `shared/sprites/player-p1.png` | P0 |
| `sprite.player.p2` | sprite | 28×44 | 112×176 PNG | `shared/sprites/player-p2.png` | P0 |
| `tile.bone.atlas` | atlas | 32×32 frames | 256×192 PNG atlas (8×6 grid; 47 `blob47` frames + 1 empty cell) | `shared/tiles/bone-atlas.png` | P1 |
| `tile.nerve.atlas` | atlas | 32×32 frames | 128×128 PNG atlas (4×4 grid; 16 `edge` frames) | `shared/tiles/nerve-atlas.png` | P1 |
| `ui.icon.badge` | image | ~45×27 CSS px HUD pill | 512×512 PNG | `shared/ui/badge.png` | P2 |

### 5.3 Shared visible entity sprites

> **Rendered-in column:** this is the actual authored usage. The M3 final-art
> scope covers the 11 referenced sprites and keeps `sprite.scan.reflex` as a
> reserve. 04 shares these sprites even though its environment remains
> placeholder art.

| Asset ID | Entity role | Rendered in | Display / export | File path | Priority |
|---|---|---|---:|---|---|
| `sprite.agent.neuron` | Neuron Keeper; 04's Muscle Effector agent currently reuses this ID | 03, 04 | 36×36 / 144×144 PNG | `shared/sprites/agent-neuron.png` | P0 |
| `sprite.scan.neuron` | Neuron, myelin sheath and dendrite input pads | 03 | 36×36 / 144×144 PNG | `shared/sprites/scan-neuron.png` | P0 |
| `sprite.scan.synapse` | Terminal plate, synaptic cleft and receptor scans | 04 | 36×36 / 144×144 PNG | `shared/sprites/scan-synapse.png` | P1 |
| `sprite.scan.pathway` | One-way pathway and axon terminal | 03 | 36×36 / 144×144 PNG | `shared/sprites/scan-pathway.png` | P1 |
| `sprite.scan.muscle` | Muscle effector scan | 04 | 36×36 / 144×144 PNG | `shared/sprites/scan-muscle.png` | P1 |
| `sprite.scan.reflex` | Reflex-arc scan, reserve | — | 36×36 / 144×144 PNG | `shared/sprites/scan-reflex.png` | P2 |
| `sprite.gate.ferry` | Threshold, one-way, exit and muscle gate | 03, 04 | 36×36 / 144×144 PNG | `shared/sprites/gate-ferry.png` | P0 |
| `sprite.exit` | Level exit and muscle lever | 03, 04 | 36×36 / 144×144 PNG | `shared/sprites/exit.png` | P1 |
| `sprite.prop.tracer` | ACh packet | 04 | 36×36 / 144×144 PNG | `shared/sprites/prop-tracer.png` | P1 |
| `sprite.pulse.terminal` | Motor terminal | 04 | 36×36 / 144×144 PNG | `shared/sprites/pulse-terminal.png` | P1 |
| `sprite.receptor.triangle` | Nicotinic receptor | 04 | 36×36 / 144×144 PNG | `shared/sprites/receptor-triangle.png` | P1 |
| `sprite.receptor.circle` | Wrong receptor | 04 | 36×36 / 144×144 PNG | `shared/sprites/receptor-circle.png` | P1 |

### 5.4 Backgrounds

| Asset ID | Ludo type | Export size | File path | Priority |
|---|---|---|---:|---|---|
| `bg.nerve_forest.sky` | Background | 1920×1080 WebP, opaque | `shared/backgrounds/nerve-forest-sky.webp` | P0 |
| `bg.nerve_forest.far` | Parallax layer | 1024×512 PNG/WebP, transparent | `shared/backgrounds/nerve-forest-far.webp` | P1 |
| `bg.nerve_forest.mid` | Parallax layer | 1024×512 PNG/WebP, transparent | `shared/backgrounds/nerve-forest-mid.webp` | P0 |
| `bg.nerve_forest.near` | Parallax layer | 1024×512 PNG/WebP, transparent | `shared/backgrounds/nerve-forest-near.webp` | P1 |

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

| Asset type | Source/export | Runtime display | Format |
|---|---|---|---|
| Player | 112×176 (7:11) or 224×352 | 28×44 | PNG with alpha |
| Entity | 144×144 or 288×288 | 36×36 | PNG with alpha |
| Background sky | 1920×1080 | cover, ~1.4× scale | WebP, opaque |
| Parallax layer | 1024×512 or 2048×1024 | tile on both axes | PNG/WebP with alpha |
| Material atlas — bone | 256×192 PNG, 8×6 grid of 32×32 frames | 32×32 | PNG, opaque cells; 47 named `mask-*` regions + 1 empty cell |
| Material atlas — nerve | 128×128 PNG, 4×4 grid of 32×32 frames | 32×32 | PNG, opaque cells; 16 named `mask-*` regions |
| Badge | 512×512 | ~45×27 CSS px HUD pill, `cover` crop | PNG with alpha |
| Audio | 48 kHz | — | OGG or MP3 |

Do not export JPG for sprites or layers with alpha. Do not ship 4K art.

### 6.2 Alpha and trimming

1. Generate on flat magenta `#FF00FF` unless Ludo has a reliable transparent-output option.
2. Remove the background in Ludo or Aseprite.
3. Inspect edges at 400%. Remove magenta fringe; do not leave a 1 px halo.
4. Trim to the alpha bounding box.
5. Pad to a fixed canvas:
   - Player: 112×176 (7:11), feet on the bottom padding line, 4 px transparent margin.
   - Entity: 144×144, base of the lowest visible element on the bottom padding line, 8 px transparent margin.
   - Badge: 512×512, critical detail inside the middle 60% vertical band.
   - Atlas: no padding, no alpha; each 32×32 cell is edge-to-edge and opaque.
6. Do not bake drop shadows, ground shadows, pedestals or glow into any sprite. The engine adds its own shadow, glow and interaction tint.

> **Critical:** the engine sets the whole texture to 28×44 or 36×36. If you export a square player image with a tiny character and lots of transparent padding, the character will be squashed and unreadable. Export the player at 112×176, not a square.

### 6.3 Tileability

- Far/mid/near layers must tile **horizontally and vertically** in Phaser’s `TileSprite`.
- Verify with a 2×2 repeat at 2048×1024 (native) and at 1280×720 (runtime), not by looking at one image.
- Avoid a single strong landmark that repeats obviously.
- Keep large transparent gaps in the near layer so the room remains playable; no opaque band across the centre or lower third.
- The material atlas frames must tile on all four sides at 32×32. Autotile edges are drawn by the frame selected from the material mask; do not bake a single directional top edge into every frame.
- Ludo does not output a named atlas. Generate one seamless 1024×1024 material swatch, then assemble the 47 bone frames or 16 nerve frames in Aseprite. Apply edge occlusion only on the sides where the mask bit is absent.

### 6.4 Anchors and padding

- Player origin is bottom-centre; feet must sit on the bottom padding line of the alpha box.
- Entity origin is bottom-centre; the base of the lowest visible element must sit on the bottom padding line. For floating scan icons or props, the lowest point still defines the baseline.
- Keep a consistent baseline across scan targets, gates, exits, props and receptors.
- Do not add an artificial pedestal or ground line.
- The engine flips player sprites horizontally; do not bake a one-sided asymmetric detail that breaks the character when mirrored.

### 6.5 Budgets

These are project budgets, not engine limits.

| Asset | Budget |
|---|---|
| Player PNG | ≤ 250 KB each |
| Entity PNG | ≤ 150 KB each |
| Background WebP | ≤ 450 KB each |
| Parallax layer | ≤ 350 KB each |
| Bone atlas PNG | ≤ 80 KB |
| Nerve atlas PNG | ≤ 80 KB |
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
| `tile.*.atlas` | `atlas` |
| `tileset.*`, `ui.*` | `image` |
| `audio.*` | `audio` |

Do not use `sheet`, `gif`, or `webp` animation types in M3. They are valid formats but the current view layer will not animate them.

---

## 7. Ludo workflow

### 7.1 Tool, plan, and source of truth

- Use **Ludo.ai → Image Generator** for all M3 images, not Sprite Generator. Sprite Generator produces sheets and animation frames the runtime will not display.
- Use **Ludo.ai → Audio Generator** for the 11 M3 cues.
- Start on the **free tier** for the six-asset style gate. Buy **Indie ($20/mo)** for production. Do not buy Pro or annual billing for this milestone.
- The prompt pack is §8. The asset register is §5. The art direction is §4. The anatomy authority is the M2 fidelity ledger [`anatomy-fidelity.md`](../m2/nervous-puzzles/anatomy-fidelity.md), not plausible prose.
- Do not put living artists’ names, game titles, or copyrighted character names into prompts. Use the descriptive style blocks.

### 7.2 What Ludo can and cannot produce

Ludo outputs a single image. It does not output a named atlas, a valid autotile grid, a runtime-sized sprite, or a guaranteed transparent cutout.

| Output | What Ludo gives you | What you must do |
|---|---|---|
| Sprite | A 1024 px source image | Key/trim/pad, then downscale to 112×176 or 144×144 |
| Background | A 16:9 or 2:1 source plate | Crop/scale to 1920×1080 or 1024×512; never stretch a background to a different aspect |
| Parallax layer | A single layer on a flat field | Key alpha, clean edges, verify a 2×2 repeat on both axes |
| Material atlas | One seamless material swatch | Assemble the 47 bone or 16 nerve frames in Aseprite; Ludo cannot author named mask regions |
| Badge | A square emblem | Keep critical detail in the middle 60% vertical band; the HUD crops it to a wide pill |
| Text | The model may add labels, signatures, numbers or UI | Reject any output containing text, logos or watermarks |

Other limits:

- **Alpha:** use Ludo’s transparent output only if it is clean at 400%. Otherwise generate on flat magenta `#FF00FF`.
- **Pixel grid:** the model will not hit exact 32×32 tile boundaries. Atlas assembly and downscaling are manual.
- **Upscaling:** do not AI-upscale. Downscale from a larger source with a clean filter.
- **Resolution:** do not ship 4K art. The export sizes in §6 are the targets.

### 7.3 Settings

| Setting | Value |
|---|---|
| Asset type | Sprite for players/entities/props; Background for sky; Texture or Pattern for parallax and atlas swatches; Icon for badge |
| Style | Closest hand-drawn dark-comic style; never pixel art |
| Reference | See §7.4 and §8.16 |
| Variations | 4 per prompt |
| Resolution | 1024 px on the long edge for sprites, parallax and atlas swatches; 1920×1080 for sky; 512×512 for badge |
| Aspect | 1:1 for sprites, props, atlas swatches and badge; 16:9 for sky; 2:1 for parallax |
| Background | Transparent if reliable; otherwise flat magenta `#FF00FF` |
| Negative prompt | Use the category block in §8.6–§8.9. If the field is absent, append it after the frame block |
| Seed/model | Record the model name and seed in the prompt log |
| Post-process | Aseprite; no baked shadow, glow, pedestal or text |

If Ludo’s UI labels differ, map to the closest equivalent. The blocks in §8 are the source of truth.

### 7.4 Reference images and approval gates

Reference images are production inputs, not decoration. Approve each anchor before generating the assets that depend on it.

| Gate | Asset | Reference | Pass condition |
|---|---|---|---|
| 0 | `sprite.player.p1` | None; this creates the character anchor | Reads at 28×44 on `#101a20`; palette and outline are correct |
| 1 | `sprite.player.p2` | `style-anchor-p1.png` as an image reference | Identical silhouette at 28×44; accent colour only |
| 1 | Agent, scans, gate, exit, props, receptors | `style-anchor-p1.png` as a style reference | Same outline weight and palette; reads at 36×36 |
| 2 | `bg.nerve_forest.sky` | Style block, optionally P1 at low strength | HUD contrast at 1280×720; no hard horizon at player height |
| 2 | `bg.nerve_forest.mid` | `style-anchor-sky.png` | Tiles 2×2; medium contrast; no obvious repeat |
| 3 | Remaining sprites | P1 style reference | Content checked against the authored 03/04 rooms |
| 4 | `bg.nerve_forest.far`, `.near` | `style-anchor-sky.png` | Tiles 2×2 on both axes |
| 4 | Bone and nerve swatches | P1 for palette/line only | Seamless at 32×32; uniform lighting; no baked edge |
| 4 | `ui.icon.badge` | P1 style reference | Reads in the ~45×27 HUD pill |

Reference preparation:

1. Crop to the subject and remove the background. Do not upload a screenshot with UI or text.
2. Export sRGB PNG at 1024 px on the long edge.
3. Do not upload copyrighted or reference-only images to Ludo.
4. If Ludo allows only one reference, prefer the asset-specific anchor: P1 for sprites, the sky for backgrounds, the material swatch for atlas frames.
5. Do not use P1 as an image-to-image base for NPCs; it may copy the astronaut. **P2 is the exception**: use P1 as an image reference so the silhouette matches.

### 7.5 Batch order

| Batch | Assets | Purpose |
|---|---|---|
| 0 | P1 | Character/style anchor |
| 1 | P2, `agent.neuron`, `scan.neuron`, `sprite.exit` | Character/prop style gate |
| 2 | Sky, mid layer | Environment style gate |
| 3 | `scan.synapse`, `scan.pathway`, `scan.muscle`, `gate.ferry`, `prop.tracer`, `pulse.terminal`, receptors | Complete the shared entity set after checking 03/04 usage |
| 4 | Far, near, bone swatch, nerve swatch, badge | Complete the environment/UI kit |
| 5 | Atlas assembly | 47 bone frames, 16 nerve frames in Aseprite |
| 6 | 11 SFX | Audio pass |
| Reserve | `sprite.scan.reflex` | Only if 05 is authored or the capture needs it |

Do not start Batch 3 until Batch 1–2 are signed off. Do not generate `sprite.gate.nerve`, `sprite.checkpoint`, or the 04 background layers; they remain placeholders.

**Free-tier six-asset gate:** P1, `agent.neuron`, `scan.neuron`, `sprite.exit`, sky, mid. If four of six pass, proceed. If not, revise the style block/reference and rerun the six. Do not “fix it later” across 21 assets.

### 7.6 How to run a prompt

1. Open the asset card in §8.17–§8.23. Note its style block, frame block, negative block, reference and export.
2. Set Ludo per §7.3. Use the exact aspect and resolution for that asset category.
3. Attach the reference from §8.16. If the reference is wrong or missing, stop; do not substitute a different character.
4. Paste in this order: `STYLE_*` → asset prompt → `FRAME_*`. Put `NEGATIVE_*` in the negative field. If there is no negative field, append it after the frame block.
5. Generate four variations. Do not change the style block and the asset prompt at the same time.
6. Pick the best variation, download the full-resolution image, and record the prompt version, model and seed.
7. Post-process per §7.7. Do not judge the asset from the 1024 px preview.
8. Check at runtime size and on the contact sheet per §7.8.
9. Log the result per §10.3. Mark it approved, retry, or placeholder.
10. Stop after three attempts on free tier or two prompt revisions on paid. Change one variable per retry.

### 7.7 Post-processing and export

1. Remove the background with a 0-tolerance magenta key or Ludo’s alpha output.
2. Inspect edges at 400%. Remove magenta fringe; no 1 px halo.
3. Trim to the alpha bounding box.
4. Pad to the exact canvas:
   - Player: 112×176, feet on the bottom padding line, 4 px margin.
   - Entity: 144×144, base of the lowest visible element on the bottom padding line, 8 px margin.
   - Sky: 1920×1080, opaque.
   - Parallax: 1024×512, alpha.
   - Bone atlas: 256×192 PNG, 8×6 grid, opaque cells.
   - Nerve atlas: 128×128 PNG, 4×4 grid, opaque cells.
   - Badge: 512×512 PNG, alpha, critical detail in the middle 60% vertical band.
5. Downscale with a clean filter. Do not squash a square source into a 7:11 player or a 1:1 entity.
6. Re-encode to the budget in §6.5. Do not ship a 4K PNG.
7. Check the sprite under the engine’s warm interaction tint (`0xffe08a`) and on a dark teal background.
8. For atlases, preview with the material tint decision in §8.21.1. If the atlas is authored in final colours, the bone/nerve `tint` must be removed at integration; if the tint stays, author neutral-light values.

### 7.8 Seam, atlas and contact-sheet checks

**Parallax:** assemble four copies in a 2048×1024 canvas and in a 1280×720 viewport. Reject any visible horizontal or vertical seam. Check that no single landmark repeats obviously.

**Atlas:** for each frame, place a 3×3 patch of the same frame and inspect all four edges. Then place a 3×3 patch of the intended neighbour masks and confirm the edge treatment matches the mask. A frame that only looks correct with a top edge is a reject.

**Contact sheet:** create a 1280×720 dark teal (`#101a20`) sheet with:

- P1 and P2 at 28×44.
- Every final entity at 36×36.
- Sky at 1280×720.
- Mid tiled three times across.
- Near over sky and mid.
- Badge at ~45×27.
- Atlas frames at 32×32 in a 3×3 patch per mask family.

Review at 100% zoom, not on a large preview. If it does not read at actual size, it does not pass.

### 7.9 Stop rules

- Maximum **three attempts** per asset on free tier; maximum **two prompt revisions** per asset on paid.
- If a whole category fails, stop and revise the style anchor or category style block, not individual assets.
- If an asset needs new rendering behaviour, stop; it is an engine task, not an art task.
- If the style gate fails, ship placeholders. Do not burn M3 on tool fighting.
- Do not generate a reserve or placeholder asset just to fill the count.
- If the atlas wiring or tint decision is not agreed, generate the swatches only and do not ship a final atlas.

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
- Prompt version: `m3-2026-10-29.1`. Increment the suffix on any text change.
- Style version: `style-v1` for all blocks in this revision. Increment when a style block changes.
- One prompt produces one asset. Do not ask for a set, a grid, or a contact sheet in a sprite prompt.

### 8.2 STYLE_SPRITE

```text
Hand-drawn 2D dark cartoon game art for a side-view platformer set inside a living human body. Thick, slightly wobbly ink outlines in dark teal-brown, not pure black; flat muted fills; one hard form shadow inside the silhouette; one warm highlight; subtle paper grain, damp membrane sheen, condensation, dust and grime. Gross-cute biology, wry deadpan tone, weird and fleshy but 12+ friendly: never gory, no shock humour. Palette only: deep teal #101a20, bone cream #f2e8d5, bone shadow #7a8f8a, nerve yellow #ffd166, glow #fff3b0, joint cyan #7bdff2, muscle pink #ef476f, sage #9db4ad. Strong readable silhouette, simple shapes, no fine detail, side view or slight 3/4 view. No text, no logo, no watermark, no border, no UI.
```

### 8.3 STYLE_BACKGROUND

```text
Hand-drawn 2D dark cartoon game art for a side-view platformer set inside a living human body. Thick, slightly wobbly ink outlines in dark teal-brown, not pure black; flat muted fills; soft atmospheric depth built from overlapping shapes and values, not a global gradient; local warm highlights only; subtle paper grain, damp membrane sheen, condensation, dust and grime. Gross-cute biology, wry deadpan tone, weird and fleshy but 12+ friendly: never gory, no shock humour. Palette only: deep teal #101a20, bone cream #f2e8d5, bone shadow #7a8f8a, nerve yellow #ffd166, glow #fff3b0, joint cyan #7bdff2, muscle pink #ef476f, sage #9db4ad. Orthographic side view, landscape scale, no single directional light, no hard cast shadows, no god rays. No text, no logo, no watermark, no border, no UI, no labels, no arrows.
```

### 8.4 STYLE_ATLAS

```text
Hand-drawn 2D dark cartoon material texture for a side-view platformer set inside a living human body. Thick, slightly wobbly ink in dark teal-brown, not pure black; flat muted fills; subtle paper grain, damp sheen, condensation, dust and grime. Gross-cute biology, wry deadpan tone, 12+ friendly: never gory. Palette only: deep teal #101a20, bone cream #f2e8d5, bone shadow #7a8f8a, nerve yellow #ffd166, glow #fff3b0, joint cyan #7bdff2, muscle pink #ef476f, sage #9db4ad. Uniform flat lighting, no directional highlight, no vignette, no baked edge shading, no bevel, no drop shadow, no grid. Orthographic surface, seamless material swatch. No text, no logo, no watermark, no border, no UI.
```

### 8.5 STYLE_BADGE

```text
Hand-drawn 2D dark cartoon game emblem for a dark-teal HUD. Thick, slightly wobbly ink outlines in dark teal-brown, not pure black; flat muted fills; one hard form shadow; one warm highlight; subtle paper grain and grime. Gross-cute biology, wry deadpan tone, 12+ friendly. Palette only: deep teal #101a20, bone cream #f2e8d5, bone shadow #7a8f8a, nerve yellow #ffd166, glow #fff3b0, joint cyan #7bdff2, muscle pink #ef476f, sage #9db4ad. Simple, bold, readable when small. No text, no logo, no watermark, no UI.
```

### 8.6 NEGATIVE_SPRITE

```text
text, letters, numbers, logo, watermark, border, UI, labels, arrows, diagram lines, pixel art, 3D render, photorealism, anime, clean vector, glossy plastic, neon cyberpunk, purple, neon green, orange, pure red, blood, gore, open wound, viscera, exposed organs, extra limbs, detailed fingers, human face, multiple characters, scene background, ground, floor, pedestal, cast shadow, drop shadow, checkerboard, frame
```

### 8.7 NEGATIVE_BACKGROUND

```text
text, letters, numbers, logo, watermark, border, UI, labels, arrows, diagram, characters, creatures, astronaut, pixel art, 3D render, photorealism, anime, clean vector, neon cyberpunk, purple, neon green, orange, pure red, blood, gore, viscera, exposed organs, hard horizon line, single focal landmark, high-contrast centre, opaque near-layer centre, obvious repeating object, frame
```

### 8.8 NEGATIVE_ATLAS

```text
text, letters, numbers, labels, grid lines, gutters, border, UI, logo, watermark, characters, scene, perspective, 3D render, photorealism, directional light, baked highlight, baked edge, vignette, bevel, drop shadow, single dark top edge, checkerboard, frame
```

### 8.9 NEGATIVE_BADGE

```text
text, letters, numbers, logo, watermark, UI, rectangular frame, outer frame line, pixel art, 3D render, photorealism, anime, clean vector, glossy plastic, neon cyberpunk, purple, neon green, orange, pure red, blood, gore, extra characters, cast shadow, drop shadow, pedestal, scene, checkerboard
```

### 8.10 FRAME_PLAYER

```text
Full body, standing, facing right, feet on the bottom padding line, centred horizontally, 4 px transparent margin on a 112×176 canvas, isolated on a flat solid magenta #FF00FF background, no ground, no pedestal, no cast shadow, no scene, no frame.
```

### 8.11 FRAME_ENTITY

```text
Full object, centred, base of the lowest visible element on the bottom padding line, 8 px transparent margin on a 144×144 canvas, isolated on a flat solid magenta #FF00FF background, no ground, no pedestal, no cast shadow, no scene, no frame.
```

### 8.12 FRAME_SKY

```text
1920×1080, 16:9, opaque, edge-to-edge background plate, no frame. Keep the upper corners and lower third dark and low-contrast; keep important detail inside the central 70% for the 1.4× cover crop.
```

### 8.13 FRAME_PARALLAX

```text
1024×512, 2:1, transparent background, isolated layer, no frame. Tile seamlessly on all four edges; verify as a 2×2 repeat at native size and at 1280×720.
```

### 8.14 FRAME_ATLAS

```text
1024×1024 seamless material swatch, uniform flat lighting, no grid, no labels, no frame. Downscale to 32×32 for the seam check; assemble the final atlas offline.
```

### 8.15 FRAME_BADGE

```text
512×512, 1:1, centred emblem inside the middle 60% vertical band, transparent background, no rectangular frame. The badge is displayed as a wide rounded HUD pill, so the top and bottom of the ring may crop.
```

### 8.16 Reference lock

| Asset group | Reference | Use | Do not |
|---|---|---|---|
| `sprite.player.p1` | None | Creates the character anchor | Do not copy a known character |
| `sprite.player.p2` | `style-anchor-p1.png` | Image reference; accent-only change | Do not prompt a new character or pose |
| Agent, scans, gate, exit, props, receptors | `style-anchor-p1.png` | Style reference | Do not use as an image-to-image base for cells |
| Sky | Style block; optional P1 at low strength | Creates the environment anchor | Do not copy the astronaut into the scene |
| Far, mid, near | `style-anchor-sky.png` | Style and palette reference | Do not introduce a new palette |
| Bone atlas | P1 for palette/line; approved bone swatch for frames | Style reference; self-reference for frames | Do not bake a directional edge or final tint |
| Nerve atlas | P1 for palette/line; approved nerve swatch for frames | Style reference; self-reference for frames | Do not bake a directional edge or final tint |
| Badge | `style-anchor-p1.png` | Style reference | Do not include a character scene |

If a reference is missing, do not substitute another character. Either generate the anchor first or use the style block only.

### 8.17 Player prompts

#### `sprite.player.p1` — style anchor

**Reference:** none. **Style:** `STYLE_SPRITE`. **Frame:** `FRAME_PLAYER`. **Export:** 112×176 PNG, 28×44 display. **File:** `shared/sprites/player-p1.png`.

```text
Full-body player character sprite, facing right in a neutral idle: a tiny Shrinkonaut astronaut in a bulky retro-futuristic life-support suit. Round helmet with a warm amber visor and no visible face; cream bone-coloured suit; dark teal joints; joint-cyan chest light; yellow backpack tanks; one scanner gauntlet; short legs; big boots; scuffed, patched and grimy. Chunky readable silhouette, big helmet, short body, strong outline, fills the canvas vertically. Flat colours, one hard form shadow, one warm highlight.
```

**Acceptance**

- Reads at 28×44 on `#101a20`; helmet, visor, tanks and boots are legible.
- Feet sit on the bottom padding line; silhouette fills ~90% of the height.
- No visible face, no cast shadow, no ground, no text.
- Alpha is clean at 400%; no magenta fringe; ≤250 KB.
- The approved file is saved as `style-anchor-p1.png` and used for every later sprite.

#### `sprite.player.p2` — accent variant

**Reference:** `style-anchor-p1.png` as an image reference. **Style:** `STYLE_SPRITE`. **Frame:** `FRAME_PLAYER`. **Export:** 112×176 PNG, 28×44 display. **File:** `shared/sprites/player-p2.png`.

```text
Same Shrinkonaut as the reference image: identical silhouette, proportions, pose, helmet, backpack, boots and line weight. Change only the accent colour: muscle-pink #ef476f chest light, shoulder trim and visor trim replace the joint-cyan accents. Keep the suit bone cream, joints dark teal, tanks nerve yellow, grime and outline identical. No new equipment, no new shape, no extra detail.
```

**Acceptance**

- At 28×44, the silhouette is indistinguishable from P1; only the accent hue changes.
- No pink spill onto the suit, no new gear, no new pose.
- Both players read side by side on the contact sheet.
- No text, no cast shadow, alpha clean; ≤250 KB.

### 8.18 Shared entity prompts

**Common settings:** `STYLE_SPRITE` + `FRAME_ENTITY`; export 144×144 PNG, display 36×36; design for 36×36 readability with no fine detail; base of the lowest visible element on the bottom padding line; 8 px margin; no baked shadow or glow. Filenames are in §5.3.

**Common acceptance:** reads at 36×36 on `#101a20`; silhouette distinct from every other entity; survives the warm interaction tint; no text; alpha clean; ≤150 KB.

| Asset ID | Style / negative | Frame | Export | File |
|---|---|---|---|---|
| `sprite.agent.neuron` | `STYLE_SPRITE` / `NEGATIVE_SPRITE` | `FRAME_ENTITY` | 144×144 PNG | `shared/sprites/agent-neuron.png` |
| `sprite.scan.neuron` | `STYLE_SPRITE` / `NEGATIVE_SPRITE` | `FRAME_ENTITY` | 144×144 PNG | `shared/sprites/scan-neuron.png` |
| `sprite.scan.synapse` | `STYLE_SPRITE` / `NEGATIVE_SPRITE` | `FRAME_ENTITY` | 144×144 PNG | `shared/sprites/scan-synapse.png` |
| `sprite.scan.pathway` | `STYLE_SPRITE` / `NEGATIVE_SPRITE` | `FRAME_ENTITY` | 144×144 PNG | `shared/sprites/scan-pathway.png` |
| `sprite.scan.muscle` | `STYLE_SPRITE` / `NEGATIVE_SPRITE` | `FRAME_ENTITY` | 144×144 PNG | `shared/sprites/scan-muscle.png` |
| `sprite.scan.reflex` | `STYLE_SPRITE` / `NEGATIVE_SPRITE` | `FRAME_ENTITY` | 144×144 PNG | `shared/sprites/scan-reflex.png` |
| `sprite.gate.ferry` | `STYLE_SPRITE` / `NEGATIVE_SPRITE` | `FRAME_ENTITY` | 144×144 PNG | `shared/sprites/gate-ferry.png` |
| `sprite.exit` | `STYLE_SPRITE` / `NEGATIVE_SPRITE` | `FRAME_ENTITY` | 144×144 PNG | `shared/sprites/exit.png` |

#### `sprite.agent.neuron` — Neuron Keeper

**Fact anchor:** NERV-01#1 (dendrites, soma, one axon, terminals); character fiction. **Reference:** P1.

```text
Full-body cell character, the Neuron Keeper: a plump bone-cream neuron soma with a dark teal central core, big tired expressive eyes, short dendrite hair, one long axon-like tail trailing behind, two tiny arms, and a small glowing nerve-yellow signal lantern. Slight 3/4 side view, standing on a small root-like foot, fussy tired posture, friendly and weird, not monstrous. One soma, one axon, no extra limbs, no human face.
```

**Acceptance:** big eyes and lantern read at 36×36; one soma and one axon; distinct from `scan.neuron`; base contact is clear; no text; no gore.

#### `sprite.scan.neuron` — neuron and myelin scan

**Fact anchor:** NERV-01#1, #3. **Reference:** P1.

```text
Scannable anatomical landmark icon: a single neuron with many branching dendrites, one plump bone-cream soma, one long myelinated axon with visible node gaps, and branching axon terminals. Nerve-yellow core, thin joint-cyan scan rim, strong iconic silhouette, slight 3/4 side view. One axon only, no face, no labels.
```

**Acceptance:** one axon, dendrites, soma and myelin nodes read at 36×36; distinct from the agent; the cyan rim reads as scannable; no text; no arrow.

#### `sprite.scan.synapse` — synapse and cleft scan

**Fact anchor:** NERV-02#1, #2. **Reference:** P1.

```text
Scannable anatomical landmark icon: a presynaptic nerve terminal on the left and a postsynaptic membrane on the right, separated by a visible synaptic cleft. A few round vesicles sit inside the presynaptic terminal; a few small transmitter dots cross the cleft; small receptor shapes sit on the postsynaptic membrane. Nerve-yellow core, thin joint-cyan scan rim, side view. No labels, no arrows, no gore.
```

**Negative delta:** vesicles floating in the cleft, labels, arrows.

**Acceptance:** two membranes and the cleft read at 36×36; vesicles are inside the presynaptic terminal, not in the cleft; receptors are on the postsynaptic side; distinct from `pulse.terminal`; no text.

#### `sprite.scan.pathway` — one-way pathway scan

**Fact anchor:** NERV-01#1, #6. **Reference:** P1.

```text
Scannable anatomical landmark icon: one one-way nerve pathway reading left to right: branching dendrites at the left, a plump soma, one long myelinated axon with node gaps, and branching terminals at the right. A bright nerve-yellow pulse sits at one node; the terminals taper toward the right. Nerve-yellow core, thin joint-cyan scan rim, side view. No arrow, no labels, no diagram lines.
```

**Acceptance:** the one-way reading comes from the dendrite-to-terminal shape, not an arrow; one axon; distinct from `scan.neuron`; no text.

#### `sprite.scan.muscle` — muscle effector scan

**Fact anchor:** NERV-02#5 (NMJ, ACh, muscle response); NERV-03#3 (muscle contraction). **Reference:** P1.

```text
Scannable anatomical landmark icon: a bundle of muscle tissue in muscle-pink with bone-shadow shading, with one motor-nerve terminal landing close to it. A small nerve-yellow junction dot marks the contact; the terminal sits just above the muscle surface. Thin joint-cyan scan rim, side view. No labels, no arrows, no gore, no textbook diagram.
```

**Negative delta:** textbook striation diagram, labels, arrows.

**Acceptance:** muscle bundle and nerve contact read at 36×36; distinct from `scan.synapse`; no striation textbook diagram; no text; no gore.

#### `sprite.scan.reflex` — reserve

**Fact anchor:** NERV-03#1–#3, #5. **Reference:** P1. **Status:** not referenced by 03/04; generate only if 05 is authored or the capture needs it.

```text
Scannable anatomical landmark icon, reserve for a reflex-arc scan: a compact two-neuron stretch-reflex loop. A muscle spindle sits at the left; a sensory axon enters a small spinal-cord segment through the dorsal root and synapses directly on a motor neuron; a motor axon leaves through the ventral root to a muscle bundle at the right. Do not include a brain in the icon; show the two-neuron arc only. No labels, no arrows, no diagram lines. Nerve-yellow core, thin joint-cyan scan rim.
```

**Acceptance:** if generated, two neurons, the dorsal and ventral roots and the muscle spindle read at 36×36; no brain; no text. If it does not read at 36×36, keep the placeholder and do not force it.

#### `sprite.gate.ferry` — organic gate

**Fact anchor:** puzzle abstraction, not an anatomical valve. **Reference:** P1.

```text
Compact organic puzzle gate, side view: a thick bone-and-membrane frame around a closed aperture, with a taut curtain of wet teal tissue stretched across the opening and one nerve-yellow seam down the centre. Small bone plates at the hinges, damp sheen, no receptor sockets, no keyhole, no mechanical parts. Closed state only, strong silhouette, base at the bottom.
```

**Negative delta:** receptor sockets, keyhole, mechanical lock, open gate, two leaves.

**Acceptance:** reads as a closed gate at 36×36; no receptor sockets; distinct from `sprite.exit`; works over bone, nerve and muscle backgrounds; no text; no baked glow.

#### `sprite.exit` — membrane airlock

**Fact anchor:** level fiction; no anatomical claim. **Reference:** P1.

```text
Membrane airlock doorway, side view: a ring of bone and teal tissue forming an opening, soft warm nerve-yellow light beyond, wet folds, a few bone struts, no gore. The opening fills most of the square; no characters, no labels. Base at the bottom.
```

**Negative delta:** closed gate, character, text.

**Acceptance:** reads as a destination at 36×36; warm light is visible; distinct from the gate; no character, no text.

### 8.19 Prop and receptor prompts

**Common settings:** `STYLE_SPRITE` + `FRAME_ENTITY`; 144×144 PNG, 36×36 display; design for 36×36 readability; base on the bottom padding line; 8 px margin; no baked shadow.

| Asset ID | Style / negative | Frame | Export | File |
|---|---|---|---|---|
| `sprite.prop.tracer` | `STYLE_SPRITE` / `NEGATIVE_SPRITE` | `FRAME_ENTITY` | 144×144 PNG | `shared/sprites/prop-tracer.png` |
| `sprite.pulse.terminal` | `STYLE_SPRITE` / `NEGATIVE_SPRITE` | `FRAME_ENTITY` | 144×144 PNG | `shared/sprites/pulse-terminal.png` |
| `sprite.receptor.triangle` | `STYLE_SPRITE` / `NEGATIVE_SPRITE` | `FRAME_ENTITY` | 144×144 PNG | `shared/sprites/receptor-triangle.png` |
| `sprite.receptor.circle` | `STYLE_SPRITE` / `NEGATIVE_SPRITE` | `FRAME_ENTITY` | 144×144 PNG | `shared/sprites/receptor-circle.png` |

#### `sprite.prop.tracer` — ACh packet

**Fact anchor:** NERV-02#1, #2, #5; game token, not a literal vesicle. **Reference:** P1.

```text
Stylized ACh signal token: a small triangular chemical-message packet with a soft wet sheen, nerve-yellow core, thin joint-cyan rim and two tiny tendrils. Clearly triangular silhouette, no face, no label, no arrow. A game token, not a literal vesicle.
```

**Negative delta:** round orb, ball, blob, face.

**Acceptance:** the triangular silhouette reads at 36×36 and matches `sprite.receptor.triangle`; no face; no text; no cast shadow.

#### `sprite.pulse.terminal` — motor terminal

**Fact anchor:** NERV-02#1, #2. **Reference:** P1.

```text
Presynaptic motor-nerve terminal, side view: a bulbous teal membrane terminal with a few large round vesicles inside, a small joint-cyan pulse emitter at the mouth, and a short axon stub at the back. Wet sheen, one terminal only, no labels, no gore. Base at the bottom.
```

**Acceptance:** terminal, vesicles and cyan emitter read at 36×36; distinct from `scan.synapse`; no text; no gore.

#### `sprite.receptor.triangle` — nicotinic receptor

**Fact anchor:** NERV-02#5; shape-matching is a game abstraction, not a literal protein structure. **Reference:** P1.

```text
Stylized nicotinic receptor socket, side view: a triangular opening in a bone-and-teal membrane rim, with a nerve-yellow inner glow and small organic clasps. The triangular opening is the dominant shape; no mechanical keyhole, no label. Base at the bottom.
```

**Acceptance:** triangular opening reads at 36×36; distinct from the circle receptor; no mechanical key or lock; no text.

#### `sprite.receptor.circle` — wrong receptor

**Fact anchor:** NERV-02#3 is advanced and optional; this is the shape-mismatch socket. **Reference:** P1.

```text
Stylized wrong-receptor socket, side view: a circular opening in a bone-and-teal membrane rim, with a nerve-yellow inner glow and small organic clasps. The circular opening is the dominant shape; no mechanical keyhole, no label. Base at the bottom.
```

**Acceptance:** circular opening reads at 36×36; distinct from the triangle receptor; no mechanical key or lock; no text.

### 8.20 Background prompts

**Common acceptance for far/mid/near:** 1024×512, 2:1, alpha; 2×2 repeat at 2048×1024 and 1280×720 shows no seam on either axis; the centre and lower third do not become a high-contrast band behind the player; no text; no characters; ≤350 KB each.

#### `bg.nerve_forest.sky`

**Reference:** style block; optional P1 at low strength. **Style:** `STYLE_BACKGROUND`. **Frame:** `FRAME_SKY`. **Export:** 1920×1080 WebP, opaque. **File:** `shared/backgrounds/nerve-forest-sky.webp`.

```text
Wide 16:9 opaque sky plate behind all parallax layers: the interior of a living body as a damp nerve forest at night. Deep teal darkness, distant branching nerve trunks and pale myelin slabs receding in haze, a faint nerve-yellow glow low in the distance, floating dust and condensation. No characters, no creatures, no labels, no arrows. Orthographic side view, soft atmospheric depth, no single directional light, no hard horizon line at player height. Keep the upper corners and lower third dark and low-contrast for HUD and player silhouettes; keep important detail inside the central 70% for the 1.4× cover crop.
```

**Acceptance:** at 1280×720 cover crop, the HUD text and player silhouettes read; no hard horizon at player height; no characters or text; no obvious focal landmark; ≤450 KB.

#### `bg.nerve_forest.far`

**Reference:** `style-anchor-sky.png`. **Style:** `STYLE_BACKGROUND`. **Frame:** `FRAME_PARALLAX`. **Export:** 1024×512 WebP, alpha. **File:** `shared/backgrounds/nerve-forest-far.webp`.

```text
Seamless 2:1 far parallax layer, slow and low-contrast, transparent background: distant giant nerve trunks and pale myelin slabs, very low contrast cool teal and sage, soft haze, large slow shapes. No ground line, no characters, no labels, no arrows, no unique focal object. Orthographic side view; tile seamlessly on all four edges; no single directional light, no hard cast shadows.
```

**Acceptance:** low contrast, large slow shapes; no focal landmark; both-axis seam check passes; no text.

#### `bg.nerve_forest.mid`

**Reference:** `style-anchor-sky.png`. **Style:** `STYLE_BACKGROUND`. **Frame:** `FRAME_PARALLAX`. **Export:** 1024×512 WebP, alpha. **File:** `shared/backgrounds/nerve-forest-mid.webp`.

```text
Seamless 2:1 mid parallax layer, medium depth and contrast, transparent background: branching dendrites, synaptic bulbs and hanging membranes in medium-contrast deep teal and sage, with a few nerve-yellow glow accents. No characters, no labels, no arrows, no unique focal object, no bone-cortex texture. Orthographic side view; tile on all four edges; soft ambient depth, no single directional light.
```

**Acceptance:** medium contrast; no obvious repeat; no bone-cortex texture that fights the runtime overlay; both-axis seam check passes; no text.

#### `bg.nerve_forest.near`

**Reference:** `style-anchor-sky.png`. **Style:** `STYLE_BACKGROUND`. **Frame:** `FRAME_PARALLAX`. **Export:** 1024×512 WebP, alpha. **File:** `shared/backgrounds/nerve-forest-near.webp`.

```text
Seamless 2:1 near foreground parallax layer, fast and high-contrast, transparent background: dark fibrous roots, membrane bulbs and membrane folds framing the left and right edges and the top, very high contrast deep teal silhouettes, with large fully transparent gaps across the centre and lower third. Occasional nerve-yellow glow. No characters, no labels, no arrows, no unique focal object, no opaque band across the play area. Orthographic side view; tile on all four edges.
```

**Acceptance:** centre and lower third stay transparent; the layer does not hide platforms or players; both-axis seam check passes; no text.

### 8.21 Material atlas prompts

Ludo cannot output a named atlas. Generate **one seamless 1024×1024 material swatch per material**, approve it at 32×32, then assemble the frames in Aseprite. The atlas is a post-process, not a single Ludo output.

#### `tile.bone.atlas` — 47-frame `blob47`

**Reference:** P1 for palette/line; approved bone swatch for frames. **Style:** `STYLE_ATLAS`. **Frame:** `FRAME_ATLAS`. **Export:** 256×192 PNG, 8×6 grid, 32×32 frames, opaque cells. **File:** `shared/tiles/bone-atlas.png`.

**Ludo swatch prompt**

```text
Seamless bone-material texture swatch for a side-view platformer: damp bone cortex in bone cream and bone shadow, deep teal in the pores, fine mineral grit, subtle pores and grime, broad soft mottling. No large cracks, no embedded objects, no symbols, no labels, no grid, no border. Uniform flat lighting, no directional highlight, no baked edge shading, no vignette, no bevel, no drop shadow. Orthographic surface; tile seamlessly on all four edges at 32×32.
```

**Bone delta:** restrict the palette to bone cream, bone shadow, deep teal and a little sage. Do not introduce muscle pink or nerve yellow. The material edge is hard and mineral, not a soft membrane rim.

**Atlas assembly**

- Grid: 8 columns × 6 rows, row-major, `x = column × 32`, `y = row × 32`.
- 47 used regions in this order:
  `0, 1, 4, 5, 7, 16, 17, 20, 21, 23, 28, 29, 31, 64, 65, 68, 69, 71, 80, 81, 84, 85, 87, 92, 93, 95, 112, 113, 116, 117, 119, 124, 125, 127, 193, 197, 199, 209, 213, 215, 221, 223, 241, 245, 247, 253, 255`.
- Region names: `mask-<key>`. The last cell (row index 5, column index 7) has no region; fill it with an opaque neutral bone colour so the atlas has no transparent holes.
- Example: `mask-85` is row index 2, column index 5, so `x = 160`, `y = 64`; `mask-255` is row index 5, column index 6, so `x = 192`, `y = 160`.
- For each frame, draw edge occlusion only on the sides where the mask bit is **absent**. Do not bake a single top edge into every frame. The frame must read correctly when tiled with its neighbours.
- Keep every cell fully opaque. Do not trim, add gutters or leave transparent seams.

**Acceptance**

- Exactly 47 named regions, coordinates matching the grid; the empty cell has no region.
- Every frame tiles 2×2 on all four sides; a 3×3 patch of any frame shows no seam.
- Mask variants are visually distinct; the edge direction matches the mask.
- No text, labels, grid lines or baked directional edge.
- 256×192, opaque, ≤80 KB.
- The runtime tint decision in §8.21.1 is applied and checked.

#### `tile.nerve.atlas` — 16-frame `edge`

**Reference:** P1 for palette/line; approved nerve swatch for frames. **Style:** `STYLE_ATLAS`. **Frame:** `FRAME_ATLAS`. **Export:** 128×128 PNG, 4×4 grid, 32×32 frames, opaque cells. **File:** `shared/tiles/nerve-atlas.png`.

**Ludo swatch prompt**

```text
Seamless nerve-material texture swatch for a side-view platformer: damp nerve fibres in nerve yellow and sage, joint-cyan edge sheen, fine fibrous grain, subtle pores and grime, broad soft mottling. No large cracks, no embedded objects, no symbols, no labels, no grid, no border. Uniform flat lighting, no directional highlight, no baked edge shading, no vignette, no bevel, no drop shadow. Orthographic surface; tile seamlessly on all four edges at 32×32.
```

**Nerve delta:** restrict the palette to nerve yellow, sage, joint cyan and deep teal. Do not introduce muscle pink. The material edge is soft and fibrous, not a hard mineral rim.

**Atlas assembly**

- Grid: 4 columns × 4 rows, row-major, `x = column × 32`, `y = row × 32`.
- 16 used regions in this order: `0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15`.
- Region names: `mask-0` … `mask-15`.
- For each frame, draw the soft nerve edge only on the sides where the cardinal mask bit is absent. Do not bake a single top edge.
- Keep every cell fully opaque; no gutters or transparent seams.

**Acceptance**

- Exactly 16 named regions `mask-0` … `mask-15`, coordinates matching the grid.
- Every frame tiles 2×2 on all four sides; a 3×3 patch shows no seam.
- The soft edge matches the `edge` autotile rule; frames are visually distinct.
- No text, labels, grid lines or baked directional edge.
- 128×128, opaque, ≤80 KB.
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

Do not mix the two. If this decision is not made, generate the swatches only and do not ship a final atlas.

### 8.22 Badge prompt

#### `ui.icon.badge`

**Reference:** `style-anchor-p1.png`. **Style:** `STYLE_BADGE`. **Frame:** `FRAME_BADGE`. **Export:** 512×512 PNG, alpha. **File:** `shared/ui/badge.png`. **Display:** ~45×27 CSS px pill with `cover` crop.

```text
Compact mission-patch emblem for a dark-teal HUD: a tiny astronaut helmet with a warm amber visor inside a broken ring of nerve fibres and bone plates. Bone cream, deep teal, nerve yellow and joint cyan; thick ink outline; flat fills; one hard form shadow; simple bold shapes that read when small. Centred composition; keep the helmet and visor inside the middle 60% vertical band; the outer ring may crop. No text, no logo.
```

**Acceptance**

- At the ~45×27 pill crop, the helmet and amber visor read; the ring may be cropped.
- No text, logo, watermark or rectangular frame.
- Works on the dark teal HUD; alpha clean; ≤150 KB.

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

Every generated asset gets a row using the template in §10.3. At minimum record: `promptVersion`, `styleVersion`, asset ID, reference, negative block, model/seed, aspect/export, variations, chosen file, post-processing, runtime check, verdict and licence.

If an asset is retried, keep the failed row and add a new row. Do not overwrite history; the log is the evidence for the AI-generated asset record.

### 8.25 Prompt dependencies and visual do-not-claim guard

Prompts that depend on a decision or missing reference:

- **Atlas prompts** depend on the two-atlas wiring and tint decision in §8.21.1.
- **`sprite.scan.reflex`** has no authored room; it is a reserve and may remain placeholder.
- **04's Muscle Effector agent** reuses `sprite.agent.neuron`; finalizing the Neuron Keeper changes 04's placeholder agent. This is an open decision, not a prompt error.
- **`audio.cue.wrong`** is outside the 32-asset total; adding it makes 33.
- **Badge** depends on accepting the ~45×27 pill crop of a 512×512 patch.
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
| Players | 112×176 export; reads at 28×44; P1/P2 differ by accent only; helmet, backpack and boots readable; feet at baseline; no baked shadow |
| Entities | 144×144 export; reads at 36×36; silhouette distinct from every other entity; base at the bottom padding line; survives the warm interaction tint; no text; no baked shadow |
| Backgrounds | Sky supports HUD contrast at 1280×720; far/mid/near tile without seams at 2×2 on **both axes**; near layer leaves the centre and lower third transparent |
| Material atlas | Bone has 47 `blob47` frames, nerve has 16 `edge` frames; every 32×32 frame tiles on all four sides; mask variants are visually distinct; no text or baked directional edge; tint path checked |
| Badge | Reads in the ~45×27 HUD pill; no text; central composition; works on dark teal |
| Audio | Duration inside the cue window; short, dry, no long tail; no audio-only cue; no gore; no music |

### 9.2 Style consistency

- Same outline weight across all assets.
- Same palette; no purple/neon drift.
- Same level of detail; no asset is suddenly painterly or 3D.
- Same tone: gross-cute, not edgy.
- Same camera language: side or slight 3/4 for characters; orthographic for backgrounds.
- All assets pass the “same game” test on one contact sheet.

### 9.3 Technical QA

- Correct aspect ratio and export size; players are 112×176, entities 144×144, parallax 1024×512, sky 1920×1080, atlas 256×192 or 128×128, badge 512×512.
- Alpha is clean at 400%; no magenta fringe.
- No JPG for alpha assets.
- File size within budget.
- File names match the asset register.
- No text, logo, watermark, border, or checkerboard.
- Player/entity origins and paddings are consistent.
- Background layers tile on both axes; the 2×2 check passes at native and runtime size.
- Atlas region names and coordinates match §8.21; every frame passes the 3×3 edge check.
- The atlas tint path is recorded and matches the rendered result.
- The badge passes the ~45×27 pill crop.
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

- `assets.final.json` has real `src` paths for all 20 referenced visible images and 11 audio cues. `sprite.scan.reflex` may remain a declared reserve.
- Each atlas entry declares `type: "atlas"`, intrinsic `width`/`height`, and named `regions`; every variant-set frame and fallback resolves.
- The two final atlases use the region maps in §8.21; the bone `blob47` variant set exists and the nerve `edge` variant set points at the final nerve atlas.
- `materials.json` parses, every palette token exists in `theme.json`, and tile/background/UI/entity references resolve.
- The atlas tint decision in §8.21.1 is applied consistently; final atlases are not double-tinted.
- Each entry has a matching licence label in `licenses.json`.
- `npm run pack:validate` passes.
- `npm run pack:smoke` still passes.
- `?assets=final` loads the final manifest.
- No visible placeholder remains in a capture shot. Declared reserves (`sprite.scan.reflex`), 04 environment placeholders and the eight deferred UI images do not count as missing.

### 9.6 Sign-off checklist

- [ ] Six-asset style gate passes.
- [ ] P1 and P2 approved.
- [ ] Neuron Keeper approved.
- [ ] Four visible scan targets approved; `sprite.scan.reflex` reserve is optional.
- [ ] Gate, exit, props, receptors approved.
- [ ] Sky and mid layer approved; far/near approved.
- [ ] Bone and nerve atlases approved; region maps and tint path checked.
- [ ] Badge approved at the ~45×27 pill crop.
- [ ] 11 SFX approved.
- [ ] All files named and placed.
- [ ] Manifest, materials and licences updated.
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
  "modified": "Generated 2026-11-04; background removed; trimmed; palette checked",
  "aiGenerated": true
}
```

Use a stable license label across all Ludo-paid assets, for example `Ludo AI Commercial (paid)`, and make the manifest `license` field match the label in `licenses.json`.

### 10.3 Prompt log

Keep a separate spreadsheet or Markdown table with:

| Field | Example |
|---|---|
| Prompt version | `m3-2026-10-29.1` |
| Style version | `style-v1` / `STYLE_SPRITE` |
| Asset ID | `sprite.agent.neuron` |
| Category | sprite / background / parallax / atlas / badge / audio |
| Tool and plan | Ludo.ai / Indie |
| Model and seed | Ludo image model; seed `123456` |
| Reference | `style-anchor-p1.png` |
| Negative block | `NEGATIVE_SPRITE` |
| Prompt | Full positive prompt text |
| Frame block | `FRAME_ENTITY` |
| Aspect and export | 1:1 / 144×144 |
| Variations | 4 |
| Chosen file | `shared/sprites/agent-neuron.png` |
| Date | 2026-11-04 |
| Post-processing | Magenta keyed; 400% edge check; trimmed; 8 px pad; downscaled |
| Runtime check | Reads at 36×36; warm tint check; contact sheet |
| Verdict | Approved / retry / placeholder |
| Licence | `Ludo AI Commercial (paid)` |
| Notes | One variable changed; reason for retry |

Copy-paste row template:

```text
| m3-2026-10-29.1 | style-v1 | asset.id | category | Ludo/Indie | model/seed | reference | negative | prompt | frame | aspect/export | 4 | chosen-file | date | post-process | runtime-check | verdict | licence | notes |
```

The prompt log is the evidence for the GDD/video asset list and the AI-generated asset record. Keep failed rows; add a new row for each retry.

### 10.4 Free-tier note

Use the free tier only for the six-asset style gate. Do not ship a free-tier file if it is watermarked or the terms do not cover the intended use. Regenerate the keepers on the paid Indie plan for final assets. If Ludo’s free output is clean and the terms allow it, record that explicitly in the prompt log; otherwise do not use it.

---

## 11. Production plan

### 11.1 Budget

Assumptions:

- 21 images × 4 variations × 0.5 credits = **42 credits**
- 11 SFX × 2 credits = **22 credits**
- Retries, inpainting, and fixes = **~40 credits**
- Total ≈ **104 credits**

The two atlas swatches are counted in the 21 images; assembling 47 + 16 frames is manual and consumes no image credits.

Ludo Indie includes **250 credits/month** for **$20**. This is enough. Buy extra credits only if the M2 scope expands or the style gate needs heavy iteration.

**Do not buy Pro ($50/mo) for M3** unless:

- you need API/MCP/CLI automation;
- M2 content expands to levels 2–5 + Silicon and the asset count grows beyond ~100 images;
- you decide to produce many animated sheets (after animation playback is implemented).

### 11.2 Schedule

| Time | Work |
|---|---|
| Before M3 (now) | Six-asset free-tier style gate; approve style anchor; prepare prompt sheet |
| M3 Day 1 AM | Regenerate P1/P2, Neuron Keeper, `scan.neuron`, `sprite.exit` on Indie |
| M3 Day 1 PM | Remaining scan targets; puzzle props after the 03/04 room check |
| M3 Day 2 AM | Sky, mid, far, near, bone/nerve swatches, badge |
| M3 Day 2 PM | Atlas assembly, 11 SFX, cleanup, manifest, licences, contact sheet, capture stills |
| Buffer | 4 hours; use placeholders for anything unfinished |

### 11.3 Cut lines

In order:

1. Drop the reserve `sprite.scan.reflex` and the placeholder `sprite.checkpoint` / `sprite.gate.nerve`.
2. Drop `far` and `near` layers; use tinted placeholder gradients.
3. Drop `badge` and the final bone/nerve atlases; keep placeholders.
4. Drop SFX polish; use synth fallback.
5. If the style gate fails, ship placeholders and protect the video/GDD deadline.

Never cut P1/P2, Neuron Keeper, the main interactive landmark (gate or exit), or the scan targets if they appear in the video. Those are the visual proof of the game. If the atlas wiring or tint decision is unresolved, cut the final atlases, not the sprites.

### 11.4 Risks

| Risk | Mitigation |
|---|---|
| Style drift across 21 assets | P1 style anchor + category style blocks + contact sheet |
| Ludo output too “clean” or generic | Add grime/texture words; use reference; reject early |
| Alpha halos on dark background | Magenta background + 400% edge check + Aseprite cleanup |
| Non-tileable parallax layers | 2×2 check on both axes at native and 1280×720; reject/re-roll; fallback to gradient |
| Player art squashed at 28×44 | Export at 112×176 (7:11), not square |
| Atlas cannot be authored by Ludo | Generate a seamless swatch; assemble 47/16 frames in Aseprite; validate region map |
| Atlas double-tinted or too dark | Decide tint path before generation; preview with the material tint; do not mix approaches |
| Badge cropped badly in the HUD pill | Keep the helmet and visor in the middle 60% vertical band; check at ~45×27 |
| 04 shows a neuron as the Muscle Effector agent | Accept as an M3 placeholder mismatch or add a 04 agent ID later; do not change the 03 art to compensate |
| Scope creep into five levels | Capture-list rule; this document |
| Puzzle prop art invalidated by room changes | Check gate/tracer/pulse/receptor art against the authored rooms; re-baseline §5.3 |
| Credits exhausted | Indie 250 is enough; top up 250 rather than upgrade |
| Free-tier watermark | Free tier for look test only; paid Indie for finals |
| Engine can’t animate | Static sprites only; animation is a separate M2/M3 engine task |

---

## 12. Future levels

### 12.1 Level kit template

When a level is authored, validated, and in the capture list, instantiate:

- 4 background layers: sky, far, mid, near
- 1 material atlas per authored material (or a shared atlas with named regions)
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
- its M2 puzzle design is implemented and validated — see [`docs/m2/nervous-puzzles/`](../m2/nervous-puzzles/).

---

## 13. Open decisions

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
- [ ] Confirm the badge is a 512×512 patch cropped to the ~45×27 HUD pill, rather than a 2:1 export.
- [ ] Confirm whether `far`/`near` appear in the capture shot; if not, cut them first.
- [ ] Confirm `sprite.gate.nerve` and `sprite.checkpoint` remain placeholders.
- [ ] Check the authored 03/04 rooms before generating puzzle props; re-baseline §5.3 if they change.

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
- [`docs/m2/nervous-puzzles/anatomy-fidelity.md`](../m2/nervous-puzzles/anatomy-fidelity.md) — fact/depth/claim ledger used by the prompts.
- [`docs/m2/nervous-puzzles/03-nerve-forest.md`](../m2/nervous-puzzles/03-nerve-forest.md) — Node Run design, implemented in `03-nerve-forest`.
- [`docs/m2/nervous-puzzles/04-muscle-effector.md`](../m2/nervous-puzzles/04-muscle-effector.md) — Endplate Ferry proposal that inherits the ferry pattern.
- [`docs/m2/nervous-puzzles/01-bone-gate.md`](../m2/nervous-puzzles/01-bone-gate.md), [`02-joint-chamber.md`](../m2/nervous-puzzles/02-joint-chamber.md), [`05-reflex-core.md`](../m2/nervous-puzzles/05-reflex-core.md), [`silicon-fixture.md`](../m2/nervous-puzzles/silicon-fixture.md) — future level specs.
- [`assets.final.json`](../../public/packs/anatomy-reflex/assets.final.json) — current manifest.
- [`materials.json`](../../public/packs/anatomy-reflex/materials.json) — current material and variant mapping.
- [`room.json`](../../public/packs/anatomy-reflex/levels/03-nerve-forest/room.json) — current room layers and entities.
- [`theme.json`](../../public/packs/anatomy-reflex/theme.json) — palette and UI asset IDs.

---

## 15. Change log

| Date | Change |
|---|---|
| 2026-10-27 | Initial M3 asset requirements, style bible, Ludo prompt pack, and scope contract. |
| 2026-10-28 | Cross-link the proposed M4 online co-op boundary; M4 adds no M3 asset IDs. |
| 2026-10-29 | M1.8 re-baseline: 21 visible images / 32 total; two material atlases replace the single tile; materials, variants, backgrounds, and UI slots added; 04 remains placeholder. |
| 2026-10-29 | Prompt-pack revision: §7–8 rewritten with category style/negative/frame blocks, per-asset prompts, reference workflow, atlas region maps, badge pill crop, audio durations, and prompt-log template. Scope reconciled to 20 referenced images + 1 reserve, 11 M3 cues, and 04 placeholder boundaries. |

---

**End of document.**
