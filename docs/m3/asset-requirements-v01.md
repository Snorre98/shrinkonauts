# M3 Asset Requirements — Shrinkonauts: The Reflex Arc

**Status:** Draft v0.10 · 1 November 2026 (P2 re-baseline + POC player/Neuron Keeper animation + nanobanan entity and sky pass)
**Owner:** Snorre  
**Scope:** Final 2D pixel art and audio for the M3 vertical slice  
**Target milestone:** M3 — Art/audio pass + capture (4–5 November 2026)  
**Governing decisions:** ADR-0029 (asset provider), ADR-0030 (sprite format), ADR-0031 (layered backgrounds), ADR-0032 (audio cues), ADR-0033 (final asset timing), ADR-0047 (pixel-art direction), ADR-0048 (2× pixel rendering), ADR-0049 (pixel UI chrome), ADR-0060–0065 (source/working/runtime art pipeline, palette variants, animation, previews, P2 palette)

**Related:** [`implementation-plan.md`](../shrinkonauts/base-game/implementation-plan.md) · [`contracts/pack-schema.md`](../shrinkonauts/base-game/contracts/pack-schema.md) · [`level-authoring.md`](../shrinkonauts/base-game/level-authoring.md) · [`DESIGN.md`](../shrinkonauts/DESIGN.md) · [`learning-design-brief.md`](../shrinkonauts/learning-design-brief.md) · [`cards/`](../shrinkonauts/base-game/cards/) · [`adr-m3/`](../adr-m3/README.md)

> **The rule for this milestone:** art follows the capture list, not the level list. M3 is not a five-level art production. It is one coherent vertical slice that appears in the 2-minute video, the GDD, and the playtest build.

> **Visual pivot (2026-10-29).** The project has moved from the hand-drawn “Dank Anatomy Cartoon” direction to **“Dank Anatomy Pixel Art”** across the world and the UI. This revision keeps the v0.3 M1.8 scope: 21 visible images, two material atlases, 04 authored, and the M1.9/M4 boundaries. §4, §6, §7, §8, §9 and ADR-0047–0049 replace the hand-drawn rendering rules; ADR-0027 remains in force for licensing and audio.
>
> **Pipeline note (2026-11-01).** ADR-0060–0065 define the source/working/runtime asset pipeline, palette variants, data-driven animation, build-time previews, and the P2 palette. Source sheets are captured and sliced offline. A POC player-animation path now ships P1/P2 idle, walk, jump, fall, and land sheets into `03-nerve-forest`; the full ADR-0062 descriptor and generalized animation system remain later work.
>
> **Entity POC note (2026-11-01).** `sprite.agent.neuron` now comes from the
> 36-frame Neuron Keeper idle sheet in
> `art-source/characters/neuron-agent/`; frame 0 is the static fallback and the
> new `sprite.agent.neuron.idle` sheet plays in 03/04. The nanobanan agent plate
> is retained as an alternate review asset, not the runtime static. The four
> scan plates were magenta-keyed and fitted with `npm run art:fit`:
> `sprite.scan.synapse` and `sprite.scan.muscle` are POC-integrated;
> `sprite.scan.neuron` and `sprite.scan.pathway` remain placeholders because
> their 1886×1004 and 1864×740 plates collapse to 16×9 and 16×6 and lose the
> myelin sleeves, terminals and one-way reading at 36×36. The synapse rim is
> partial and the muscle rim is missing. All new art is **POC integrated /
> final art approval pending**; the generalized entity animation system remains
> deferred.
>
> **Nanobanan batch note (2026-11-01).** The new closed gate, ACh tracer, motor
> terminal, and triangle/circle receptor plates are POC-integrated through
> `fit.new.config.json`; final approval is pending. `03-nerve-forest` now wires
> only `bg.nerve_forest.sky` as a 640×368 lossless WebP plate. The supplied
> far/mid/near JPEGs are 16:9 opaque scenes, not 1024×512 transparent tileable
> layers (the near plate has a baked checkerboard), so they remain source-only
> and deferred. The badge and reflex plate remain placeholders after their
> 16×16/36×36 reviews. The bone and nerve JPEGs are material swatches, not
> frame atlases; `tile.anatomy.atlas` stays placeholder.
>
> **Background regeneration spec (2026-11-01).** The corrected chroma-key
> prompts and key workflow for the deferred far/mid/near layers live in
> [`background-asset-requirements-v01.md`](background-asset-requirements-v01.md)
> (prompt version `m3-2026-11-01.1`). This document remains the source of truth
> for current M3 scope: the sky is wired, and far/mid/near stay
> source-only/deferred until regenerated and accepted.
>
> **P2 palette note (2026-11-01).** ADR-0065 supersedes ADR-0064. P2 is now a
> bone suit with a joint-cyan visor and backpack tank, a nerve-amber accent,
> teal/bone-shadow joints, an ink outline, and bone-shadow grime. Orange is no
> longer used on P2; the orange ramp remains reserved but unused.
>
> **Prompt-language note (2026-10-31).** The prompt pack is now subject-first and
> uses a biology-to-shape lexicon (§4.10). Anatomical terms follow a visual noun
> (“fleshy tentacles (dendrites)”), and the export grid is kept out of the Ludo
> concept prompt. This is a wording and ordering change only; the asset scope,
> anatomy facts and runtime constraints are unchanged.

---

## 0. Summary

| Decision | Value |
|---|---|
| Art scope | `03-nerve-forest` environments + shared entity sprites (POC integrated; final approval pending) |
| Visible images | **21 declared** — 18 active (17 referenced by the authored 03/04 rooms + 1 reserve `sprite.scan.reflex`), plus 3 source-only/deferred 03 backgrounds |
| 03 background | **Sky-only POC** — `bg.nerve_forest.sky` is wired; `bg.nerve_forest.far/mid/near` are source-only/deferred. Corrected regeneration prompts: [`background-asset-requirements-v01.md`](background-asset-requirements-v01.md) |
| POC animation sheets | **9** — 8 player clips + 1 Neuron Keeper idle; additional runtime assets outside the 21-image register |
| Audio cues | **11** — M3 scope; the pack also declares `audio.cue.wrong`, which stays placeholder |
| Total M3 assets | **32 declared** — 29 active (18 images + 11 audio), with 3 background layers deferred |
| Style | **Dank Anatomy Pixel Art** |
| Rendering | **Half-res source, 2× nearest-neighbour display** |
| Tool | **Ludo.ai source sheets/concepts + local slice/remaster/normalize/palette-LUT pipeline + optional Aseprite/Piskel/LibreSprite cleanup; Ludo.ai Audio Generator** |
| Ludo plan | **Indie, $20/mo** (Pro only if automation or scope grows) |
| Free-tier use | Six-asset concept/style gate only |
| Animation | **POC player + Neuron Keeper animation** — P1/P2 idle, walk, jump, fall, and land sheets play in `03-nerve-forest`; the Neuron Keeper idle sheet plays in 03/04; other sprites stay static; the full ADR-0062 descriptor is deferred |
| UI | **8-bit pixel chrome; Silkscreen + Pixelify Sans; badge is the only rendered UI image, and stays a CSS placeholder after the 16×16 audit** |
| UI panels/portraits | **Deferred** — not rendered by the current UI |
| Music | **Deferred** — not played by the current runtime |
| Levels 01, 02, 05, Silicon | **Deferred** — design proposals exist, but the pack content is not implemented |
| Level 04 | **Authored**; shares the POC entity sprites and Neuron Keeper idle, but its backgrounds, muscle/membrane tiles and `sprite.gate.nerve` stay placeholder art |
| Material atlases | **2 final atlases**: bone (`blob47`, 47 regions) and nerve (`edge`, 16 regions), authored as 32×32 frames at 1:1 with 2×2 clusters. The current pack still has one `tile.anatomy.atlas` placeholder; the new bone/nerve JPEGs are source swatches only, not frame atlases |
| Prompt version | **`m3-2026-10-31.2`** for sprites/entities/UI; **`m3-2026-11-01.1`** for backgrounds (see the dedicated background doc) |
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
3. **Engine mismatch** — producing runtime-animated spritesheets, fractional scales, or UI skin assets the runtime cannot display cleanly. Source sheets are allowed; they are sliced and normalized offline.
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
| POC animation sheets | 9 | P1/P2 walk/jump/fall/land plus the Neuron Keeper idle; additional runtime assets, outside the 21-image static register |
| Visible shared entity sprites | 12 | 11 referenced by 03/04; `sprite.scan.reflex` is a reserve |
| `03-nerve-forest` background layers | 1 visible | Sky only; far/mid/near are source-only/deferred |
| Final material atlases (bone, nerve) | 2 | 47-frame `blob47` bone atlas; 16-frame `edge` nerve atlas; both still placeholders |
| Badge | 1 | The only UI asset currently rendered; stays placeholder after the 16×16 audit |
| **Visible images subtotal** | **21 declared** | 17 referenced + 1 reserve active; 3 source-only/deferred backgrounds |
| SFX cues | 11 | `audio.cue.wrong` is outside the M3 scope |
| **M3 total** | **32 declared** | 29 active images/audio (18 images + 11 audio); 3 background layers deferred |

The nine POC animation sheets are runtime assets but are not part of the
21-image static register or the 32-asset production total. The Neuron Keeper
idle sheet is a POC entity animation; the generalized entity animation system
remains deferred.

**Pixel authoring.** Players 14×22, entities 18×18, atlas frames 32×32 at 1:1 with 2×2 clusters, sky 640×368, parallax 1024×512 with 2×2 clusters, badge 16×16. See §3 and §6.

### 2.2 Deliberately out of scope or deferred

| Item | Count | Reason |
|---|---:|---|
| `ui.icon.scan`, `ui.icon.map`, `ui.icon.log` | 3 | Declared in the theme but not rendered by the current UI |
| `ui.portrait.neuron` | 1 | Not rendered |
| `ui.panel.dialogue`, `panel.gate`, `panel.debrief`, `panel.map` | 4 | Not rendered |
| `sprite.checkpoint` | 1 | Declared but not referenced by the authored rooms |
| `sprite.gate.nerve` | 1 | Referenced by 04's Ca²⁺ gate, but 04 props stay placeholder art in M3 |
| `bg.nerve_forest.far/mid/near` | 3 | The supplied 16:9 opaque scenes do not meet the 1024×512 transparent tile contract; source-only/deferred |
| `audio.cue.wrong` | 1 | Declared in the theme and manifest; outside the 11-cue M3 scope |
| Generalized runtime animation / GIF loops | — | POC player and Neuron Keeper idle animation is in scope; other entity/background animation, a generalized descriptor, and GIF playback remain deferred |
| Music loop / ambience | — | Music playback is deferred |
| Levels `01-bone-gate`, `02-joint-chamber`, `05-reflex-core` | 3 | Design proposals exist in [`docs/m2/nervous-puzzles/`](../m2/nervous-puzzles/), but the pack content is not implemented |
| Silicon fixture | 1 | Design proposal exists; not implemented in the pack |
| Full key rebinding, capture-mode UI, new UI layout | — | Engine/UI tasks, not art-pass tasks |

The deferred UI assets remain declared as placeholders. They will not appear in the build and do not block M3 capture. `sprite.scan.reflex` is a reserve in the 21-image list: it is not referenced by 03/04 and does not block capture. The 03 room deliberately wires only the sky plate; the far/mid/near layers remain declared and source-only. `ui.icon.badge` remains a CSS placeholder: the new 16×16 fit loses the helmet dome and does not read in the pill/32×32 target.

### 2.3 Scope rules

1. **One environment.** Final environment art is produced for `03-nerve-forest`. The shared entity sprites are POC-integrated because 03/04 reference them; final approval is pending, and unreadable plates stay placeholders. The 03 POC uses only the sky plate; far/mid/near are source-only/deferred. 04 backgrounds, muscle/membrane tiles and `sprite.gate.nerve` stay placeholder. Other levels get art only after they are authored, pass validation, and appear in the capture list.
2. **No new static asset IDs during M3.** If a level needs a new static ID, that is a content/engine task with an ADR, not an art-pass improvisation. POC animation sheets are the recorded exception: the player sheets and `sprite.agent.neuron.idle` are additional runtime animation assets outside the 21-image static register.
3. **No gameplay code changes.** ADR-0033 forbids mixing the art pass with gameplay changes. The pixel pivot needs a small, recorded render change (`pixelArt`, `antialias`, `roundPixels`, integer background scaling) under ADR-0048; nothing in `src/game`, `src/puzzle`, or the physics/runtime modules changes.
4. **POC player and Neuron Keeper animation only.** Players animate in `03-nerve-forest` from generated walk/jump/fall/land sheets. The Neuron Keeper idle sheet plays in 03 and 04; other entity sprites stay static. The full ADR-0062 descriptor and generalized animation system remain a later engine task.
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
| Players, sky | **POC integrated; final approval pending** | The sky is the only visible 03 background; both are unchanged by puzzle content |
| Badge | **Placeholder after audit** | The 16×16 fit loses the helmet dome; keep the CSS placeholder |
| far/mid/near | **Source-only/deferred** | The new plates are 16:9 opaque scenes, not 1024×512 transparent tileable layers; the near plate has a baked checkerboard |
| Material atlases | **Swatches only; wire after the tint decision** | The new bone/nerve JPEGs are material swatches, not frame atlases; the pack still uses one placeholder atlas |
| Neuron Keeper, scan targets | **POC integrated; final approval pending** | Neuron Keeper static + idle are runtime art; `scan.synapse` and `scan.muscle` are POC-integrated; `scan.neuron` and `scan.pathway` remain placeholders after the 36×36 readability check |
| `sprite.gate.ferry`, `sprite.prop.tracer`, `sprite.pulse.terminal`, `sprite.receptor.triangle`, `sprite.receptor.circle` | **POC integrated; final approval pending** | The new batch is wired to the existing IDs in 03/04; the gate mapping is `sprite.gate.ferry` |
| `sprite.exit` | **Placeholder** | The exit remains distinct from the gate and has no new source |
| `sprite.scan.reflex` | **Reserve/placeholder** | The two-cell loop reads, but the roots and muscle spindle do not at 36×36; not referenced by 03/04 |
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
> [`../m1.9/README.md`](../m1.9/README.md) and the
> [M3.5 hub prompt pack](../m3.5/hub-asset-prompts-v01.md).

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
| Background far/mid/near use `fit: "tile"` | `src/world/background.ts` (`TileSprite`), `room.json` | The current 03 room does not wire them. If wired later, author **1024×512** with a 2×2 minimum cluster grid; tile on **both axes**. |
| The sky uses `fit: "cover"` | `src/world/background.ts`, `room.json` | The current 03 room wires only the sky. Author **640×368**, displayed at an integer 2× cover; the runtime snaps cover to an integer scale (ADR-0048). |
| The renderer is currently smooth-scaled | `src/world/create-game.ts` (`pixelArt: false`, `antialias: true`) | Target config: `pixelArt: true`, `antialias: false`, `roundPixels: true`. |
| Player sheets and the Neuron Keeper idle are animated; other entity sprites are static | `room-scene.ts` creates Phaser `Sprite` players and `PlayerAnimator`; entities with `idleAnimation` use `EntityIdleAnimator`, others stay static | Player walk/jump/fall/land and the Neuron Keeper idle sheet are runtime assets; other entity sheets remain static. |
| Only the badge UI asset is rendered | `src/ui/hud.ts` (`styleBadge`, `.hud__stamp--image`) and `src/game/boot.ts` | Author **16×16**; the current HUD displays a ~45×27 CSS px pill with `cover`. The pixel UI target is a 32×32 square stamp. The badge remains a CSS placeholder after the 16×16 audit. |
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

Nine hue families, each with a shadow/base/highlight ramp. Every pixel comes from this table. Orange is reserved and is not used on P2 (ADR-0065).

| Family | Shadow | Base | Highlight | Use |
|---|---|---|---|---|
| Teal | `#05090b` | `#101a20` | `#1d2f38` | Shadows, background depth, outlines |
| Bone | `#c9b79a` | `#f2e8d5` | `#fff8e8` | Suit, bone, highlights |
| Bone shadow | `#5f736e` | `#7a8f8a` | `#9db4ad` | Secondary bone, dust |
| Nerve | `#b8862b` | `#ffd166` | `#fff3b0` | Signals, key light, pickups |
| Joint | `#3f9fb5` | `#7bdff2` | `#c9f7ff` | P1 accents, scan UI, cool rim |
| Muscle | `#a82a4a` | `#ef476f` | `#ff9fb2` | Muscle, danger |
| Orange | `#813115` | `#e59b34` | `#ffd28a` | Reserved; not used on P2 |
| Sage | `#6f847d` | `#9db4ad` | `#c4d4ce` | Muted tissue, secondary text |
| Ink | `#000000` | `#05090b` | `#2a3f47` | Outlines, deepest shadow |

Rules:

- Use the ramp steps only. Do not introduce purple, neon green, unapproved orange, pure red, or intermediate blends.
- Orange is reserved and unused. Do not use it on P2, other sprites, materials, backgrounds, effects, or UI.
- Dither with adjacent ramp steps, never with a new colour.
- Black/white only for tiny alpha edges.
- The UI uses the same palette through the theme tokens; no pack-specific CSS.
- Material patterns use the same ramps. Do not generate a separate material palette.

### 4.4 Character rules

- **Player:** bulky retro-futuristic life-support suit; P1 has a cream/bone shell with an amber visor and nerve-yellow tanks; P2 has a cream/bone shell with a joint-cyan visor and joint-cyan backpack tanks; dark teal joints; chest light; scanner gauntlet; short legs; big boots; scuffed and patched. No visible face. No sleek armour. No shiny plastic.
- **Player pixel build:** 14×22 source grid; 1px outline; helmet 7–8 px across; visor 3–4 px; torso 8–10 px wide; boots 3 px; backpack 4×6 px; scanner gauntlet 2×2 px. The silhouette must read at 28×44.
- **P1/P2 differentiation:** P1 uses a bone suit, amber visor, nerve-yellow tanks, and joint-cyan accents. P2 uses a bone suit, joint-cyan visor and tanks, and a nerve-amber accent. Keep the silhouette, frame cell, origin, and clip names identical. P2 uses its own approved Ludo walk/jump sheets for the POC; the walk sources have different frame counts (49 vs 36), so runtime normalizes cycle duration.
- **P2 visor:** joint-cyan ramp with the ink rim. The chest accent uses the nerve ramp; muscle pink is not part of P2.
- **Held scanner (draft):** a separate held scanner and hand attachment are explored in [`player-scanner-draft-plan.md`](player-scanner-draft-plan.md). It is not part of the current 21-image scope or the scanner-gauntlet baseline.
- **Cells:** characters first, diagrams second. Big expressive eyes built from 2×2 blocks, simple body, tiny 1–2 px limbs, one job prop, one personality prop. No human faces, no sexualised cells, no gore.
- **Neuron visual grammar:** one round jelly-bean cell body; one dark oval nucleus inside it; a crown of 5–7 short, soft, fleshy tentacles with forked tips for dendrites; one long, thin, bare tail for the axon; a small forked twig at the tail tip for the axon terminals. Arms, foot stalk and lantern are character props, not anatomy. Do not draw dendrites as hair or fur. Do not put myelin on the Neuron Keeper character; myelin is a glial sheath shown on the scan icons.
- **Anatomy-to-shape rule:** every anatomical term in a Ludo prompt follows a visual noun: shape first, term second, job third. Example: “short fleshy tentacles (dendrites) that receive the signal.” The full lexicon is §4.10.
- **Cell colour families:** neuron = nerve/bone; osteocyte = bone/dust; synoviocyte = amber/cyan; muscle effector = muscle/rust; reflex core = bone/danger pink; Silicon = graphite/cyan.
- **Props:** 18×18 source grid; strong iconic silhouette; 1px dashed cyan scan rim for scannable objects; nerve-yellow core for interactables.
- **No text on any sprite.** Labels and numbers are UI, not art.

### 4.5 Environment and material rules

- The body is a **landscape**, not a cutaway textbook diagram. Anatomy is architecture: nerve bundles as thick cable-like trees, myelin as pale segmented sheath plates, synapses as lanterns, bone as cliffs, cartilage as glass, membranes as wet fabric.
- **Damp, humid, breathing.** Build condensation, sheen, dust, and membrane folds from dither patterns; no smooth gradients.
- **Dark enough for HUD.** Keep the centre and lower third of the sky relatively dark so the yellow/cyan HUD and player silhouettes read.
- **No labels, arrows, or diagram lines.** The scan system supplies meaning.
- **Layered depth:** far = large slow shapes; mid = branching structures; near = dark framing silhouettes with large transparent gaps.
- **Tileable layers:** far/mid/near must repeat without a visible seam or obvious focal object. Author at 1024×512 with 2×2 minimum clusters; the runtime tiles them 1:1.
- **Integer sky:** author at 640×368; the runtime displays it at an exact 2× cover. No fractional scaling.
- **Material atlases:** keep 32×32 frames at 1:1; author each frame with a 2×2 minimum cluster grid. Bone is hard mineral; nerve is soft fibrous. Do not bake a directional edge; the autotile mask selects the edge. Assemble the 47 bone and 16 nerve frames in Aseprite.
- **Patterns:** world, object, background, and UI patterns use the same ramps and dither. The 03 sky keeps the screen-space nerve-fiber overlay; the deferred mid layer must not bake a competing bone texture if it is later wired.

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
| Use the nine ramp families only | Introduce neon, purple, orange, pure red, or mixed pixel sizes |
| Keep Orange reserved and unused | Use orange on P2, another sprite, material, background, effect, or UI |
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

### 4.10 Biology-to-shape lexicon

Ludo does not reliably parse anatomical terms as visual nouns. “Soma”, “dendrite”, “axon”, “myelin”, “presynaptic” and “nicotinic” are not guarantees of a shape. Every prompt therefore uses **shape → term → job**: a visual noun first, the biological term second, and the function third. The technical term stays in the prompt log, fact anchor and acceptance criteria, so the art remains auditable.

**Accuracy rule.** Accuracy means the parts and their relationships, not literal proportions. The Neuron Keeper can be cute and fictional — eyes, arms, a foot stalk and a lantern are allowed — but it must have one cell body, one nucleus, 5–7 dendrite tentacles, one bare axon tail and forked terminals. It must not have hair, fur, two axons, myelin it made itself, or a humanoid body.

| Biological term | Draw this in Ludo | Accuracy guard / do not draw |
|---|---|---|
| Soma | “plump jelly-bean body” | one cell body; not a head/torso |
| Nucleus | “dark oval stone inside the jelly” | inside the body; not a chest light or a hole |
| Dendrites | “crown of 5–7 short, soft, fleshy tentacles with forked tips, like a sea anemone” | receiving branches; not hair, fur or octopus arms |
| Axon | “one long, thin, bare tail, like a tadpole tail” | exactly one; not furry; no second tail |
| Myelin sheath | “pale bead-like sleeves around the cable” | made by glial cells; not on the Neuron Keeper character |
| Nodes of Ranvier | “small dark gaps between the sleeves” | gaps, not a continuous tube |
| Axon terminals | “small forked twig at the tail tip” | not hands or fingers |
| Synapse / synaptic cleft | “two cells facing a narrow dark gap” | cells do not touch; not a relay switch |
| Synaptic vesicles | “small round bubbles inside the nerve knob” | vesicles stay inside the presynaptic terminal |
| Neurotransmitter | “tiny glowing dots crossing the gap” | not large packets carried by cells |
| Receptors | “socket shapes on the receiving wall” | on the postsynaptic side; not a mechanical keyhole |
| Muscle spindle | “tiny spindle-shaped capsule wrapped in a spiral wire” | stretch sensor in muscle; not a joint capsule or pain receptor |
| Dorsal root / ventral root | “cables entering the back / leaving the front of a short cord segment” | two roots, opposite sides; no brain |
| Neuromuscular junction / ACh | “nerve knob touching a bundle of pink rope-like fibres; a triangular packet with a glowing core” | ACh is a game token; not the only neurotransmitter |
| Bone cortex / nerve fibres | “wet chalky stone with pores”; “bundles of pale wet cables” | material texture; no directional edge |

**Prompt rules.**

1. Start every asset prompt with the subject and its core silhouette. Style, palette and frame come after it.
2. Pair every anatomical term with a visual noun and a job. Do not leave a bare term in the positive prompt.
3. Count the silhouette where it matters. For the Neuron Keeper: one body, one tail, six tentacles, two arms, one foot, one lantern. State the limb budget.
4. Separate anatomy from fiction: “the arms and lantern are props; the body, nucleus, tentacles and tail are anatomy.”
5. Put what to draw in the positive prompt and what to avoid in the negative prompt. Do not write “no extra limbs” in a prompt that also asks for arms, a tail and tentacles.
6. Use analogies that keep the category: sea anemone, tadpole, cable, beads, sockets, bubbles, ropes, lanterns. For cell characters, do not use fur, hair, plant roots, octopus arms or brain shapes; landscape layers may use root-like cables.
7. Say “soft, fleshy tentacles”, not “furry tentacles”. “Furry” adds fur and turns the cell into an animal.
8. Keep export specs out of the Ludo prompt. Ludo draws a large concept; Aseprite applies the 18×18/36×36 grid.
9. Apply the core-silhouette test: if only the first sentence were read, would Ludo draw the right object?

---

## 5. Asset inventory

### 5.1 Counts

| Bucket | Count | Note |
|---|---:|---|
| Visible M3 images | 21 declared | 18 active (17 referenced by authored rooms + 1 reserve `sprite.scan.reflex`); 3 source-only/deferred backgrounds |
| SFX cues | 11 | `audio.cue.wrong` is outside M3 |
| **M3 production total** | **32 declared** | 29 active (18 images + 11 audio); 3 background layers deferred |
| Deferred UI images | 8 | Badge is the only rendered UI image, and stays a CSS placeholder |
| **Current manifest entries** | **56** | Includes 12 audio and 9 POC animation sheets; the final two-atlas layout adds one atlas entry |

### 5.2 Shared kit

| Asset ID | Type | Display size | Source size | File path | Priority |
|---|---|---:|---:|---|---|
| `sprite.player.p1` | sprite | 28×44 | 14×22 PNG | `shared/sprites/player-p1.png` | P0 |
| `sprite.player.p2` | sprite | 28×44 | 14×22 PNG | `shared/sprites/player-p2.png` | P0 |
| `tile.bone.atlas` | atlas | 32×32 frames | 256×192 PNG atlas (8×6 grid; 47 `blob47` frames + 1 empty cell), 1:1 with 2×2 clusters | `shared/tiles/bone-atlas.png` | P1 |
| `tile.nerve.atlas` | atlas | 32×32 frames | 128×128 PNG atlas (4×4 grid; 16 `edge` frames), 1:1 with 2×2 clusters | `shared/tiles/nerve-atlas.png` | P1 |
| `ui.icon.badge` | image | ~45×27 CSS px HUD pill; 32×32 pixel-UI target | 16×16 PNG | `shared/ui/badge.png` (not wired; CSS placeholder retained) | P2 |

> **Pixel rule:** author at the source size shown. Players, entities, and the badge display at exactly 2×; atlas frames stay 32×32 at 1:1 with a 2×2 cluster grid. Do not export at the display size.
>
> **POC animation assets:** the eight `sprite.player.*.walk/jump/fall/land` sheet entries and `sprite.agent.neuron.idle` are additional runtime assets, not part of the 21-image static register. See §5.8.

### 5.3 Shared visible entity sprites

> **Rendered-in column:** this is the actual authored usage. The M3 art scope
> covers the referenced sprites, but only the readable POC sprites are wired;
> `sprite.scan.neuron`, `sprite.scan.pathway`, `sprite.scan.reflex`, and
> `sprite.exit` remain placeholders. 04 shares these sprites even though its
> environment remains placeholder art. The new batch wires the gate, tracer,
> pulse terminal, and both receptors through the existing IDs.

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

**POC entity status (2026-11-01).** The manifest is authoritative: an entry
without `src` is a placeholder. This table records why.

| Asset ID | Status | Notes |
|---|---|---|
| `sprite.agent.neuron` | POC integrated / final approval pending | Static frame 0 from the 36-frame Neuron Keeper sheet; shared by 03 and 04; nanobanan agent plate is an alternate review asset |
| `sprite.agent.neuron.idle` | POC integrated / final approval pending | 36-frame 18×18 idle sheet; 12.5 fps, looping; static fallback when reduced motion is on |
| `sprite.scan.neuron` | **Placeholder — unreadable at 36×36** | 1886×1004 plate fits to 16×9; myelin sleeves, nodes and forked terminals are lost; cyan rim largely lost |
| `sprite.scan.synapse` | POC integrated / final approval pending | Two cells and cleft read; cyan rim is partial because the source plate clips the postsynaptic wall |
| `sprite.scan.pathway` | **Placeholder — unreadable at 36×36** | 1864×740 plate fits to 16×6; the one-way reading and myelin gaps are lost |
| `sprite.scan.muscle` | POC integrated / final approval pending | Muscle bundle and nerve contact read; **no cyan scan rim survived** the fit |
| `sprite.scan.reflex` | **Reserve / placeholder** | The two-cell loop reads, but roots/spindle do not; not referenced by 03/04 |
| `sprite.gate.ferry` | POC integrated / final approval pending | Closed organic gate reads at 36×36; the yellow seam is subdued. Source file `sprite-scan-ferry-v2.jpeg` is the gate, not a scan icon |
| `sprite.exit` | **Placeholder** | No new source; do not substitute the gate |
| `sprite.prop.tracer` | POC integrated / final approval pending | Triangular ACh packet reads; no cyan rim survived |
| `sprite.pulse.terminal` | POC integrated / final approval pending | Round terminal, vesicles and cyan emitter read |
| `sprite.receptor.triangle` | POC integrated / final approval pending | Triangular socket reads; distinct from the circle |
| `sprite.receptor.circle` | POC integrated / final approval pending | Circular socket reads; distinct from the triangle |

The nanobanan fit reports are in `art-source/nanobanan/reports/` and record the
source trim, fitted size, margins, palette validation and warnings for each
plate. The Neuron Keeper build report is in
`art-source/characters/neuron-agent/working/tmp/`.

### 5.4 Backgrounds

| Asset ID | Ludo type | Source size | File path | Status |
|---|---|---|---|---|
| `bg.nerve_forest.sky` | Background | 640×368 lossless WebP, integer 2× cover | `shared/backgrounds/nerve-forest-sky.webp` | POC integrated; final approval pending |
| `bg.nerve_forest.far` | Parallax layer | 1024×512 PNG/WebP, transparent, 2×2 clusters | `shared/backgrounds/nerve-forest-far.webp` | Source-only/deferred; not wired |
| `bg.nerve_forest.mid` | Parallax layer | 1024×512 PNG/WebP, transparent, 2×2 clusters | `shared/backgrounds/nerve-forest-mid.webp` | Source-only/deferred; not wired |
| `bg.nerve_forest.near` | Parallax layer | 1024×512 PNG/WebP, transparent, 2×2 clusters | `shared/backgrounds/nerve-forest-near.webp` | Source-only/deferred; not wired |

The `bg.muscle_endplate.*` layers used by 04 are **not** in this M3 pass; they
stay placeholder. The 03 room wires only the sky; its screen-space nerve-fiber
overlay remains. The supplied far/mid/near plates are 16:9 opaque scenes, not
transparent 2:1 tile sets, and the near plate has a baked checkerboard, so they
must not be wired into the current `fit: "tile"` layers. The corrected
regeneration prompts and `#FF00FF` key workflow are in
[`background-asset-requirements-v01.md`](background-asset-requirements-v01.md).

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

Other placeholders outside or deferred from the current M3 pass:

- `sprite.checkpoint` — declared, not referenced by the authored rooms.
- `sprite.gate.nerve` — 04's Ca²⁺ gate references it, but 04 props remain placeholder art in M3.
- `sprite.exit` — no new source; do not substitute the gate.
- `sprite.scan.reflex` — reserve; the 36×36 loop does not preserve the roots/spindle.
- `ui.icon.badge` — the 16×16 fit does not preserve the helmet; keep the CSS placeholder.
- `audio.cue.wrong` — declared, outside the 11-cue M3 scope.
- `bg.nerve_forest.far/mid/near` — source-only/deferred; the supplied 16:9 opaque scenes do not meet the tile contract.
- `tile.anatomy.atlas` — current single placeholder atlas; keep it until the two final atlases are wired.
- `bg.muscle_endplate.*` — 04 background placeholders.
- `tile.bone.atlas` / `tile.nerve.atlas` — not added; the new source JPEGs are material swatches, not frame atlases.

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

Player animation sheets follow `shared/sprites/player-<p1|p2>-<walk|jump|fall|land>.png`;
the Neuron Keeper idle sheet is `shared/sprites/agent-neuron-idle.png`.

### 5.8 Current completion status (1 November 2026 POC)

| Item | Status | Evidence |
|---|---|---|
| P1 idle 14×22 master | Complete | `art-source/characters/player-p1/working/master/player-p1-idle-14x22.png` |
| P1 walk source (49f) | Complete | `art-source/characters/player-p1/ludo/walk-49f-2026-10-29/` |
| P1 jump source (36f) | Complete | `art-source/characters/player-p1/ludo/walk-36f-2026-10-29/` |
| P2 approved walk/jump sources (36f each) | Complete | `art-source/characters/player-p2/` |
| P1/P2 runtime idle/walk/jump/fall/land sheets | POC complete | `public/packs/anatomy-reflex/shared/sprites/player-*.png` |
| Player animation in `03-nerve-forest` | POC complete | `src/world/player-animator.ts`, `src/world/room-scene.ts` |
| Neuron Keeper idle source (36f) | Complete | `art-source/characters/neuron-agent/sprite-max-px-frames-36-rows-6-cols-6/` |
| Neuron Keeper static + idle sheet | POC complete | `public/packs/anatomy-reflex/shared/sprites/agent-neuron.png`, `agent-neuron-idle.png` |
| Neuron Keeper animation in 03/04 | POC complete | `src/world/room-scene.ts`, `src/world/entity-idle-animator.ts` |
| Background removal tool | Complete | `npm run art:key` |
| Entity fit tool | Complete | `npm run art:fit` |
| Nanobanan keyed review copies | Complete | `art-source/previews/nanobanan/` (full keyed PNGs in ignored `keyed/`) |
| Nanobanan entity sprites | POC integrated / final art approval pending | `scan.synapse.png`, `scan.muscle.png`, `gate-ferry.png`, `prop-tracer.png`, `pulse-terminal.png`, `receptor-triangle.png`, `receptor-circle.png` wired; `scan.neuron`, `scan.pathway`, `scan.reflex`, and `exit` retained as placeholders |
| Nanobanan background | POC integrated / final art approval pending | `shared/backgrounds/nerve-forest-sky.webp`; 03 wires only the sky. far/mid/near source-only/deferred |
| Nanobanan badge | Placeholder after audit | 16×16 fit in `art-source/previews/nanobanan/entities/badge-*`; HUD keeps CSS placeholder |
| Nanobanan material swatches | Source-only/deferred | `tile-bone-atlas.jpeg`, `tile-nerve-atlas.jpeg`; not frame atlases |
| Final art approval / prompt log / licences | Pending | POC licence label recorded; final plan TBD |
| Entity sprite art | POC integrated for the readable IDs; placeholders retained for the wide plates | `art-source/nanobanan/reports/` |
| Background, atlas, badge art | Sky and entity batch POC integrated; atlas and badge deferred | `art-source/nanobanan/reports/` |

Review stills: `screenshots/m3-player-p1-p2-idle.png` and
`screenshots/m3-player-p1-walk.png`. Entity fit previews are in
`art-source/previews/nanobanan/entities/`; the Neuron Keeper idle GIF is
`art-source/previews/poc/downscale/agent-neuron-idle.gif`.

| Asset ID | Frames | fps | Loop | File |
|---|---:|---:|---|---|
| `sprite.player.p1.walk` | 49 | 38 | yes | `shared/sprites/player-p1-walk.png` |
| `sprite.player.p1.jump` | 12 | 30 | no | `shared/sprites/player-p1-jump.png` |
| `sprite.player.p1.fall` | 10 | 15 | yes | `shared/sprites/player-p1-fall.png` |
| `sprite.player.p1.land` | 8 | 30 | no | `shared/sprites/player-p1-land.png` |
| `sprite.player.p2.walk` | 36 | 28 | yes | `shared/sprites/player-p2-walk.png` |
| `sprite.player.p2.jump` | 12 | 30 | no | `shared/sprites/player-p2-jump.png` |
| `sprite.player.p2.fall` | 10 | 15 | yes | `shared/sprites/player-p2-fall.png` |
| `sprite.player.p2.land` | 8 | 30 | no | `shared/sprites/player-p2-land.png` |
| `sprite.agent.neuron.idle` | 36 | 12.5 | yes | `shared/sprites/agent-neuron-idle.png` |

P1 and P2 walk sources have different frame counts (49 vs 36); the runtime
normalizes cycle duration with fps rather than requiring identical frames. The
Neuron Keeper idle is the only animated entity sheet in this POC; its static
fallback is frame 0.

The POC uses a downscale + palette-quantize path for the runtime sheets. The
semantic remaster remains available via `npm run art:build-player -- --sampler
remaster`; the two paths were compared at 8× before choosing the runtime output.

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

The current 03 room wires only the sky. Far/mid/near remain future 1024×512 transparent tile assets; the supplied 16:9 scenes are not runtime backgrounds. The badge remains a placeholder, so the 16×16 row documents the target, not a shipped file.

### 6.2 Alpha and trimming

1. Generate the concept on flat magenta `#FF00FF`.
2. Pixel at the source size in Aseprite, Piskel, or LibreSprite.
3. Remove the background with `npm run art:key` (hard-alpha RGB key + magenta despill); inspect edges at 400% and remove any remaining fringe.
4. Trim to the alpha bounding box.
5. Pad to the fixed source canvas:
   - Player: 14×22, feet on the bottom padding line, 0–1 px transparent margin.
   - Entity: 18×18, base of the lowest visible element on the bottom padding line, 1 px margin.
   - Badge: 16×16, critical detail inside the middle 60% vertical band.
   - Atlas: no padding, no alpha; each 32×32 cell is edge-to-edge and opaque.
6. Do not bake drop shadows, ground shadows, pedestals or glow into any sprite. The engine adds its own shadow, glow and interaction tint.

> **Critical:** author the player at **14×22**, not 28×44, and the entity at **18×18**, not 36×36. The engine sets the texture to 28×44 / 36×36, so the half-res source displays at exactly 2× and matches the atlas and parallax cluster density.
>
> **POC entity path:** for concept plates, `npm run art:fit` performs the trim, aspect-preserving fit, hard alpha threshold, palette quantisation and baseline snap from a keyed PNG. The original batch is in `art-source/nanobanan/fit.config.json`; the 2026-11-01 entity batch is in `fit.new.config.json`. The badge audit uses `fit.badge.config.json` with a 16×16 palette document and remains placeholder-only. These fits are not a substitute for a final 18×18 or 16×16 Aseprite pass.

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
- The sky is 640×368 and displayed at an exact 2× cover. The 16:9 capture crops the extra 16 px of height. The current 03 room wires only this sky; do not add far/mid/near until they are authored as 2:1 transparent tile sets.

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
| Player static PNG | ≤ 16 KB each |
| Animation sheet (player or entity) | ≤ 64 KB per clip (POC; walk sheets are the largest) |
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
| `sprite.player.p1`, `sprite.player.p2` | `sprite` |
| `sprite.player.*.walk/jump/fall/land`, `sprite.agent.neuron.idle` | `sheet` (POC animation) |
| `sprite.agent.neuron`, `sprite.scan.*`, `sprite.gate.*`, `sprite.prop.*`, `sprite.pulse.*`, `sprite.receptor.*`, `sprite.exit` | `sprite` |
| `bg.*` | `background` |
| `tile.*.atlas` | `atlas` |
| `tileset.*`, `ui.*` | `image` |
| `audio.*` | `audio` |

Player animation and the Neuron Keeper idle use `sheet` entries with `frameWidth`, `frameHeight`, `frames`, `fps`, `loop`, and `anchor`. `gif` and `webp` animation types remain banned; GIFs are build-time previews only. The Neuron Keeper idle is the only animated entity sheet; other entity entries stay static `sprite` images. Source sheets are captured in `art-source/` and never referenced by a manifest.

---

## 7. Pixel workflow

### 7.1 Tool, plan, and source of truth

- **Ludo.ai → Image Generator** for concepts, silhouettes, palette studies, material swatches, and source sprite sheets. Ludo is not the final pixel renderer.
- **Local art pipeline** for slicing source sheets (`npm run art:slice`), profile-driven remastering (`npm run art:remaster`), palette validation (`npm run art:normalize`), palette-LUT variants (`npm run art:variant`), character-sheet builds (`npm run art:build-player`, including `--character neuron-agent`), entity fitting (`npm run art:fit`), and background keying (`npm run art:key`) (ADR-0060–0065).
- **Aseprite, Piskel, or LibreSprite** for the final pixel pass at source size, palette quantisation, and atlas assembly.
- **Ludo.ai → Audio Generator** for the 11 SFX.
- The source of truth is this document, the category style blocks in §8, and the prompt version. Do not improvise a new style per asset.
- Start on the **free tier** for the six-asset concept/style gate.
- Buy **Indie ($20/mo)** for production. Do not buy Pro unless you need API/MCP/CLI or the scope grows beyond this document.
- Do not buy annual billing for a short art pass.

### 7.2 What Ludo can and cannot produce

Ludo can produce a concept, a silhouette, a palette study, a seamless material swatch concept, a readable composition, and a source sprite sheet. A source sheet is still a concept plate: it must be sliced, normalized, and quantized offline before it can become a runtime asset.

Ludo cannot reliably produce:

- a named atlas with 47 or 16 mask regions;
- a valid autotile grid;
- a runtime-sized sprite with the correct alpha box;
- a guaranteed transparent cutout;
- a consistent 2×2 pixel grid;
- an exact palette without cleanup;
- a reliable visual interpretation of anatomical jargon such as “soma”, “dendrite”, “myelin” or “presynaptic terminal”.

Treat every Ludo output — including a multi-frame sheet — as a concept. The final asset is authored or cleaned at source size in Aseprite/Piskel, then normalized and packed by the local pipeline. Write prompts with visual nouns first and technical terms second; the lexicon is §4.10.

### 7.3 Settings

| Setting | Value |
|---|---|
| Asset type | Sprite / **Sprite sheet** / Background / Parallax layer / Texture or Pattern / Icon, as appropriate |
| Sprite-sheet mode | One character and one action per sheet; uniform grid; consistent scale, orientation, and baseline in every frame; flat magenta background; no labels or grid lines |
| Style | Pixel art: hard edges, limited palette, 1px outlines, no anti-aliasing |
| Reference | `style-anchor-p1.png` for characters/props; `style-anchor-sky.png` for backgrounds; approved bone/nerve swatch for atlases. Use P1 as a **style/palette reference only**. If Ludo's reference field performs image-to-image, leave it empty for cell characters; otherwise it may copy the astronaut silhouette. |
| Variations | 4 per single-image prompt; one sheet per action |
| Resolution | 1024 px on the long edge for concepts; capture sheets at Ludo's highest usable resolution and resample offline |
| Aspect | 1:1 sprites/props/atlas swatches/badge; wide sky; 2:1 parallax; uniform grid for sheets |
| Background | Flat magenta `#FF00FF` |
| Negative prompt | Use the matching block in §8.6–8.9 plus the asset delta in §8.18–8.22 if the field exists; otherwise append it to the prompt |

If Ludo’s UI labels differ, map to the closest equivalent. The prompt blocks are the source of truth for the concept; the pixel pass is the source of truth for the final asset.

### 7.4 Reference images and approval gates

1. Generate **P1** first: four single-image concepts or one walk source sheet.
2. Pick the best; for a sheet, choose the frame that reads best as a 14×22 idle. It must match the palette.
3. Run `npm run art:remaster` as the deterministic first pass; inspect the class map and 8× preview. If needed, touch up the 14×22 PNG in a free editor, then re-run `npm run art:normalize`. Approve the result at 28×44 on a dark teal background.
4. Save the cleaned 14×22 master under `art-source/characters/player-p1/working/master/` and export `shared/sprites/player-p1.png`; keep `style-anchor-p1.png` as the review reference and a 4× nearest-neighbour preview.
5. Use it as the style reference for every later character, prop, and icon. Do not use it as an image-to-image generation base for NPCs — it may copy the astronaut. For colour variants of the same character, derive from the indexed P1 master with the palette LUT (ADR-0061/0065).
6. Use the approved **P2** walk/jump sheets from `art-source/characters/player-p2/` for the POC. The ADR-0065 role map remains available for future derived variants; do not reintroduce the orange P2 concept.
7. Generate the **sky** next; approve `style-anchor-sky.png` at 1280×720 and use it for far/mid/near.
8. Generate the **bone and nerve swatches**; approve each at 32×32 before assembling the atlas.
9. Approve the **badge** at its current pill crop and at the 32×32 pixel-UI target.

### 7.5 Batch order

| Batch | Assets | Purpose |
|---|---|---|
| 0 | P1 idle + P1 walk/jump source sheets | Pixel style anchor and animation source |
| 1 | P2 (approved source sheets), Neuron Keeper, `scan.neuron`, `sprite.exit` | Character/prop style gate |
| 2 | Sky (POC wired); mid layer deferred | Environment style gate |
| 3 | Bone and nerve material swatches (source-only) | Material style gate |
| 4 | Remaining scans, tracer, pulse terminal, receptors, gate ferry (POC wired) | Complete visible entity set — only after the 03/04 room check |
| 5 | Far, near, badge (deferred/placeholder) | Complete environment/UI kit |
| 6 | 11 SFX and atlas assembly | Audio and atlas finish |

P2 now uses its approved Ludo walk/jump source sheets (ADR-0065). Do not start Batch 4 until Batches 1–3 are signed off. Do not assemble the final atlases until the tint decision in §8.21.1 is made.

### 7.6 How to run a prompt

1. Choose the prompt path:
   - **Single image:** `SUBJECT_<ASSET>` + `STYLE_<CATEGORY>` + `PALETTE` + `FRAME_<CATEGORY>_CONCEPT` (`FRAME_PLAYER_CONCEPT`, `FRAME_ENTITY_CONCEPT`, `FRAME_BADGE_CONCEPT`, `FRAME_SKY`, `FRAME_PARALLAX`, `FRAME_ATLAS`).
   - **Source sheet:** `SUBJECT_PLAYER_P1_WALK` + `STYLE_SPRITE` + `PALETTE` + `FRAME_SHEET_PLAYER`; one character and one action per sheet.
2. Add the matching `NEGATIVE_<CATEGORY>` to Ludo’s negative field, or append it when no field exists. Add the asset’s `NEGATIVE DELTA`; sheet prompts use `NEGATIVE_SPRITE`.
3. Generate four concepts for a single image, or one source sheet per action. Keep the Ludo PNG and JSON together.
4. Pick the best; download the full-resolution concept or sheet.
5. Single image: pixel the asset at source size: 14×22 player, 18×18 entity, 640×368 sky, 1024×512 parallax, 512×512 material swatch, 16×16 badge. The export frames in §8.10a, §8.11a and §8.15a are for this step, not for the Ludo concept prompt.
6. Source sheet: keep the Ludo PNG+JSON, slice with `npm run art:slice`, review the GIF, then run `npm run art:remaster` to normalize the chosen frame to the fixed cell and baseline. Use the class-map preview and report before accepting the master. Do not ship the raw sheet.
7. Quantise to the ramp palette; remove anti-aliasing; enforce the 2×2 cluster rule on 1:1 layers and atlas frames.
8. Export at source size; inspect at 400%; check at display size on a dark teal contact sheet.
9. Record the prompt, source sheet, frame range, variant map, pixel-cleanup notes, palette, and chosen file in the prompt log.
10. If it fails, change one variable (prompt phrase, reference, or cleanup step), not five.
11. Stop after three attempts; use a placeholder if still failing.

### 7.7 Post-processing and export

- **Sprites/entities:** key the concept plate, trim to the alpha bounding box, then run `npm run art:fit` to crop, fit the 18×18 cell with a 1 px transparent margin, hard-threshold alpha, and quantise the approved ramps. Export PNG. The original batch uses `fit.config.json`; the 2026-11-01 batch uses `fit.new.config.json`. The fit report records the source bbox, fitted size, margins, palette validation and alpha violations. The badge audit uses a 16×16 cell in `fit.badge.config.json` and does not write runtime art.
- **Source sheets:** slice with the Ludo JSON, then run `npm run art:build-player` to generate the POC idle/walk/jump/fall/land sheets from `working/clips.json`. For the Neuron Keeper, use `--character neuron-agent --sampler downscale --write-runtime`; the same command writes the static frame 0 and the 36-frame idle sheet. Keep the raw sheet in `art-source/`, never in `public/`. Frame 0 remains the static fallback.
- **Palette variants:** derive from the indexed master with a semantic LUT; do not re-prompt Ludo. P2 uses the approved bone/joint/nerve source sheets for the POC; the ADR-0065 role map remains available for future derived variants.
- **Backgrounds:** the POC sky is cropped to 2672×1536 from the 16:9 source, area-resized to 640×368, quantised with `palette.sky.json`, and encoded as lossless WebP. Far/mid/near remain future 1024×512 hard-alpha tile assets; do not wire the supplied 16:9 scenes. Use the corrected prompts and `#FF00FF` key workflow in [`background-asset-requirements-v01.md`](background-asset-requirements-v01.md).
- **Atlases:** assemble 32×32 cells at 1:1 from the approved swatch; 8×6 bone grid (47 regions + one opaque empty cell), 4×4 nerve grid (16 regions); every cell opaque; export PNG. Do not add gutters or transparent seams. The new bone/nerve JPEGs are swatches only; atlas wiring stays deferred.
- **Badge:** 16×16 source, transparent or magenta-keyed; critical detail inside the middle 60% vertical band; export PNG. The current source fails the 16×16 read and stays placeholder.
- **Palette:** quantise every asset to the §4.3 ramps. No intermediate blends, no stray colours.
- **No anti-aliasing:** no soft edges, no semi-transparent sprite fringe. Alpha is 0 or 255 except for intentional UI/engine effects.
- **No lossy compression:** do not use JPG or lossy WebP for pixel art.

### 7.8 Seam, atlas, and contact-sheet checks

- Parallax: if far/mid/near are wired later, 2×2 repeat at 2048×1024 and at 1280×720; no seam on either axis. The current 03 room uses sky only.
- Material atlas: if wired later, 3×3 patch of every frame; no seam, no directional top edge; each mask variant is distinct.
- Source inspection: every asset at 400%; every pixel on the ramp palette; no anti-aliasing; no mixed pixel sizes.
- Contact sheet at 1280×720: P1/P2 at 28×44, entities at 36×36, sky at 1280×720; no far/mid/near or badge runtime image in the current POC.
- Player animation previews: walk loop, jump/fall/land one-shots, P1/P2 side by side; inspect `art-source/previews/poc/downscale/`.
- Neuron Keeper idle preview: `art-source/previews/poc/downscale/agent-neuron-idle.gif` plus the 8× static preview.
- Entity fit previews: `<stem>-2x.png`, `<stem>-8x.png` and `<stem>-tint-2x.png` under `art-source/previews/nanobanan/entities/`.
- Warm interaction tint check on every entity sprite.
- Review at 100% zoom, not on a large preview. If it does not read at actual size, it does not pass.

### 7.9 Stop rules

- Maximum **three attempts** per asset on free tier; maximum **two prompt revisions** per asset on paid.
- If the output is a furry or humanoid cell, do not iterate on style: fix the subject-first sentence and the negative delta (§4.10).
- If a whole category fails, stop and revise the style anchor, not individual assets.
- If the generator cannot produce a usable concept, trace or draw the asset manually at source size. Do not ship faux-pixel output.
- If an asset needs new rendering behaviour beyond ADR-0048, stop; it is an engine task, not an art task.
- If the style gate fails, ship placeholders. The badge and reflex plate follow this rule; the sky-only background is the recorded exception, not a new runtime mode.

---

## 8. Copy-paste prompt pack

### 8.1 Assembly formula and versioning

```text
CONCEPT PROMPT      = SUBJECT_<ASSET> + STYLE_<CATEGORY> + PALETTE + FRAME_<CATEGORY>_CONCEPT
SHEET PROMPT        = SUBJECT_PLAYER_P1_WALK + STYLE_SPRITE + PALETTE + FRAME_SHEET_PLAYER
EXPORT SPEC         = FRAME_<CATEGORY> (for Aseprite/Piskel; do not paste into Ludo)
NEGATIVE PROMPT     = NEGATIVE_<CATEGORY> + NEGATIVE_<ASSET>
```

- Copy the blocks in the order shown. The subject must be first; the style and palette must not precede it.
- Each single-image prompt in §8.17–8.22 is already assembled in this order; copy the code block directly, or rebuild it from §8.2–8.15 if you are editing the shared style. The P1 walk sheet uses `FRAME_SHEET_PLAYER`.
- `FRAME_<CATEGORY>_CONCEPT` is `FRAME_PLAYER_CONCEPT`, `FRAME_ENTITY_CONCEPT` or `FRAME_BADGE_CONCEPT`; backgrounds use `FRAME_SKY` or `FRAME_PARALLAX`; atlases use `FRAME_ATLAS`.
- If Ludo has one prompt field, paste `SUBJECT`, `STYLE`, `PALETTE`, `FRAME`, then `Negative prompt: ...` on a new line.
- If Ludo has a separate style field, put `STYLE` there and keep `SUBJECT` + `PALETTE` + `FRAME` in the prompt field.
- If Ludo has a separate negative field, use it. Do not repeat the negative text inside the positive prompt.
- Prompt version: `m3-2026-10-31.2`. Increment the suffix on any text change.
- Style version: `style-pixel-v2` for all blocks in this revision. Increment when a style block changes.
- Ludo produces a concept. The final asset is pixel-cleaned at source size in Aseprite/Piskel (§7).
- One single-image prompt produces one asset. Do not ask for a set or grid in a single-image sprite prompt.
- One sheet prompt produces one character and one action. Do not mix actions or characters in a sheet. The sheet is a source plate, not a runtime asset.
- Every prompt starts with a `SUBJECT` line. The first 1–2 sentences must describe the object and its core silhouette. If the first sentence were the only thing Ludo read, it should still draw the right object.

### 8.2 STYLE_SPRITE

```text
Pixel art for a side-view 2D platformer set inside a living human body. Native pixel grid, hard square pixels, crisp edges, no anti-aliasing, no smoothing, no mixed pixel sizes. Bold dark teal-brown outlines, one pixel at final sprite scale; flat fills from three-step ramps; 50% dither for damp membrane sheen, condensation, dust and grime. Gross-cute biology, wry deadpan tone, weird and fleshy but 12+ friendly: never gory, no shock humour. Strong readable shapes; characters and props must read as small sprites. Side view or slight 3/4 view.
```

### 8.2a PALETTE

```text
Palette ramps: teal #05090b #101a20 #1d2f38; bone #c9b79a #f2e8d5 #fff8e8; bone shadow #5f736e #7a8f8a #9db4ad; nerve #b8862b #ffd166 #fff3b0; joint #3f9fb5 #7bdff2 #c9f7ff; muscle #a82a4a #ef476f #ff9fb2; sage #6f847d #9db4ad #c4d4ce; ink #000000 #05090b #2a3f47. Use only these ramp steps; no intermediate blends, no unapproved orange.
```

### 8.3 STYLE_BACKGROUND

```text
Pixel art for a side-view 2D platformer set inside a living human body. Native pixel grid, hard square pixels, crisp edges, no anti-aliasing, no smoothing. Orthographic side view, landscape scale; atmospheric depth from layered values and dither, not a global gradient; local warm highlights only. Damp membrane sheen, condensation, dust and grime. Gross-cute biology, wry deadpan tone, 12+ friendly: never gory. The body is a landscape, not a textbook cutaway; use cable-like nerves, segmented sheath plates and membrane folds as architecture.
```

### 8.4 STYLE_ATLAS

```text
Pixel-art seamless material texture for a side-view platformer set inside a living human body. Native pixel grid, hard square pixels, every colour block at least 2×2 pixels, no anti-aliasing, no smoothing. Flat fills from three-step ramps; 50% dither. Uniform flat lighting; orthographic surface, seamless material swatch. Gross-cute biology, wry deadpan tone, 12+ friendly. The material reads as one coherent surface; no characters or scene.
```

### 8.5 STYLE_BADGE

```text
Pixel-art game emblem for a dark-teal HUD. Native pixel grid, hard square pixels, 1px dark outline, no anti-aliasing, no smoothing. Flat fills from three-step ramps; one hard form shadow; one warm highlight; subtle grime. Gross-cute biology, wry deadpan tone, 12+ friendly. Simple, bold, readable at 32×32 and in a ~45×27 pill crop.
```

### 8.6 NEGATIVE_SPRITE

```text
text, letters, numbers, logo, watermark, border, UI, labels, arrows, diagram lines, anti-aliasing, smooth gradient, painterly, 3D render, photorealism, anime, clean vector, high-res detail, mixed pixel sizes, faux pixel art, blurry edges, glossy plastic, neon cyberpunk, purple, neon green, orange, pure red, blood, gore, open wound, viscera, exposed organs, extra arms, extra tails, wings, detailed fingers, human face, multiple characters, scene background, ground, floor, pedestal, cast shadow, drop shadow, checkerboard, frame
```

### 8.7 NEGATIVE_BACKGROUND

> **Superseded for backgrounds (2026-11-01):** use the updated `NEGATIVE_BACKGROUND` and the new `NEGATIVE_PARALLAX` block in [`background-asset-requirements-v01.md`](background-asset-requirements-v01.md). This block is retained for history.

```text
text, letters, numbers, logo, watermark, border, UI, labels, arrows, diagram, diagram lines, textbook anatomy diagram, cutaway, cross-section, characters, creatures, astronaut, anti-aliasing, smooth gradient, painterly, 3D render, photorealism, anime, clean vector, high-res detail, mixed pixel sizes, faux pixel art, blurry edges, neon cyberpunk, purple, neon green, orange, pure red, blood, gore, viscera, exposed organs, hard horizon line, single focal landmark, high-contrast centre, opaque near-layer centre, obvious repeating object, frame
```

### 8.8 NEGATIVE_ATLAS

```text
text, letters, numbers, labels, grid lines, gutters, border, UI, logo, watermark, characters, scene, perspective, textbook diagram, anatomical label, anti-aliasing, smooth gradient, painterly, 3D render, photorealism, directional light, baked highlight, baked edge, vignette, bevel, drop shadow, single dark top edge, checkerboard, frame, mixed pixel sizes, faux pixel art
```

### 8.9 NEGATIVE_BADGE

```text
text, letters, numbers, logo, watermark, UI, rectangular frame, outer frame line, anti-aliasing, smooth gradient, painterly, 3D render, photorealism, anime, clean vector, high-res detail, mixed pixel sizes, faux pixel art, glossy plastic, neon cyberpunk, purple, neon green, orange, pure red, blood, gore, extra characters, cast shadow, drop shadow, pedestal, scene, checkerboard
```

### 8.10 FRAME_PLAYER_CONCEPT

```text
Full body, standing, facing right, centred horizontally, with a clear empty margin on all sides, isolated on a flat solid magenta #FF00FF background; no ground, no pedestal, no cast shadow, no scene, no frame. Draw the character large and clear; do not draw a pixel grid, a tiny sprite, or a sprite sheet. Hard pixel edges; no anti-aliasing.
```

### 8.10a FRAME_PLAYER (export)

```text
Export spec: 14×22 source, feet on the bottom padding line, centred horizontally, 0–1 px transparent margin; the engine displays it at 28×44. Do not paste this block into Ludo.
```

### 8.10b FRAME_SHEET_PLAYER

```text
Uniform sprite sheet, one character and one action per sheet, consistent character scale, orientation and baseline in every frame, flat solid magenta #FF00FF background, no labels, no grid lines, no frame border, no ground, no cast shadow. Hard pixel edges; no anti-aliasing. The sheet is a source plate; the engine never loads it directly. Slice it with the Ludo JSON, normalize each frame to the player cell, and use frame 0 as the M3 static fallback unless another idle frame is approved.
```

### 8.11 FRAME_ENTITY_CONCEPT

```text
Full object, centred, with a clear empty margin on all sides, isolated on a flat solid magenta #FF00FF background; no ground, no pedestal, no cast shadow, no scene, no frame. Draw the object large and clear; do not draw a pixel grid, a tiny sprite, or a sprite sheet. Hard pixel edges; no anti-aliasing.
```

### 8.11a FRAME_ENTITY (export)

```text
Export spec: 18×18 source, base of the lowest visible element on the bottom padding line, 1 px transparent margin; the engine displays it at 36×36. Do not paste this block into Ludo.
```

### 8.12 FRAME_SKY

> **Superseded for backgrounds (2026-11-01):** use [`background-asset-requirements-v01.md`](background-asset-requirements-v01.md) for the sky prompt and base-layer contract. This block is retained for history.

```text
640×368, wide, opaque, edge-to-edge background plate, no frame. Keep the upper corners and lower third dark and low-contrast; keep important detail inside the central 70% for the 2× cover crop. Hard pixel edges; no anti-aliasing.
```

### 8.13 FRAME_PARALLAX

> **Superseded for backgrounds (2026-11-01):** use [`background-asset-requirements-v01.md`](background-asset-requirements-v01.md) for the `FRAME_PARALLAX` key-field contract. This block is retained for history; its “transparent background” wording is what produced the baked checkerboard.

```text
1024×512, 2:1, transparent background, isolated layer, no frame. Tile seamlessly on all four edges; every colour block at least 2×2 pixels; verify as a 2×2 repeat at native size and at 1280×720. Hard pixel edges; no anti-aliasing.
```

### 8.14 FRAME_ATLAS

```text
1024×1024 seamless material swatch concept, uniform flat lighting, no grid, no labels, no frame, no directional highlight, no baked edge. Hard pixel edges; every colour block at least 2×2 pixels. Pixel-clean to a 512×512 working swatch; assemble 32×32 frames offline.
```

### 8.15 FRAME_BADGE_CONCEPT

```text
Centred emblem, large and clear, flat magenta #FF00FF background, no rectangular frame. Keep the helmet and visor inside the middle 60% vertical band; the outer ring may crop. Hard pixel edges; no anti-aliasing.
```

### 8.15a FRAME_BADGE (export)

```text
Export spec: 16×16 source, 1:1, centred emblem, transparent or flat magenta #FF00FF background, no rectangular frame. Keep the helmet and visor inside the middle 60% vertical band; the current HUD displays a ~45×27 pill crop, the pixel UI target is 32×32. Do not paste this block into Ludo.
```

### 8.16 Reference lock

| Asset group | Reference | Use | Do not |
|---|---|---|---|
| `sprite.player.p1` | None | Creates the pixel character anchor | Do not copy a known character |
| `sprite.player.p1.walk` (source) | `style-anchor-p1.png` | Sheet source; identical character and walk cycle | Do not change suit, gear, silhouette, or timing |
| `sprite.player.p2` | Approved `art-source/characters/player-p2/` walk/jump sheets | Bone suit, joint-cyan visor/tank, nerve accent (ADR-0065) | Do not reintroduce the orange P2 concept |
| Agent, scans, gate, exit, props, receptors | `style-anchor-p1.png` | Pixel style and palette reference only | Do not use as an image-to-image generation base for new cell characters; do not let the astronaut silhouette or suit bleed into a cell. Palette LUTs are allowed for colour variants |
| Sky | Style block; no character reference | Creates the pixel environment anchor | Do not copy the astronaut into the scene |
| Far, mid, near | `style-anchor-sky.png` | Pixel style and palette reference | Do not introduce a new palette |
| Bone atlas | P1 for style/palette only; approved bone swatch for frames | Style reference; self-reference for frames | Do not bake a directional edge or final tint |
| Nerve atlas | P1 for style/palette only; approved nerve swatch for frames | Style reference; self-reference for frames | Do not bake a directional edge or final tint |
| Badge | `style-anchor-p1.png` | Style/palette reference only | Do not include a character scene |

If a reference is missing, do not substitute another character. Either generate the anchor first or use the style block only. A palette LUT is not image-to-image generation: it operates on the indexed P1 master and changes only the mapped palette roles. For cell characters, the `SUBJECT` block is the composition authority; P1 is never the composition reference.

### 8.17 Player prompts

#### `sprite.player.p1` — style anchor

**Reference:** none. **Style:** `STYLE_SPRITE`. **Palette:** `PALETTE`. **Frame:** `FRAME_PLAYER_CONCEPT`. **Negative:** `NEGATIVE_SPRITE`. **Export:** 14×22 PNG; 28×44 display. **File:** `shared/sprites/player-p1.png`.

**COMPLETION STATUS:** `/shrinkonauts/art-source/characters/player-p1`

```text
SUBJECT: A full-body Shrinkonaut astronaut — a human, not a cell creature — facing right in a neutral idle. Round helmet with a warm amber visor and no visible face; cream bone-coloured suit; dark teal joints; joint-cyan chest light; yellow backpack tanks; one scanner gauntlet; short legs; big boots; scuffed, patched and grimy. Chunky readable silhouette, big helmet, short body, strong dark outline, fills the canvas vertically. Flat fills from the ramps; one hard shadow shape; one warm highlight.

Pixel art for a side-view 2D platformer set inside a living human body. Native pixel grid, hard square pixels, crisp edges, no anti-aliasing, no smoothing, no mixed pixel sizes. Bold dark teal-brown outlines, one pixel at final sprite scale; flat fills from three-step ramps; 50% dither for damp membrane sheen, condensation, dust and grime. Gross-cute biology, wry deadpan tone, weird and fleshy but 12+ friendly: never gory, no shock humour. Strong readable shapes; characters and props must read as small sprites. Side view or slight 3/4 view.

Palette ramps: teal #05090b #101a20 #1d2f38; bone #c9b79a #f2e8d5 #fff8e8; bone shadow #5f736e #7a8f8a #9db4ad; nerve #b8862b #ffd166 #fff3b0; joint #3f9fb5 #7bdff2 #c9f7ff; muscle #a82a4a #ef476f #ff9fb2; sage #6f847d #9db4ad #c4d4ce; ink #000000 #05090b #2a3f47. Use only these ramp steps; no intermediate blends, no unapproved orange.

Full body, standing, facing right, centred horizontally, with a clear empty margin on all sides, isolated on a flat solid magenta #FF00FF background; no ground, no pedestal, no cast shadow, no scene, no frame. Draw the character large and clear; do not draw a pixel grid, a tiny sprite, or a sprite sheet. Hard pixel edges; no anti-aliasing.
```

**Acceptance**

- Reads at 28×44 on `#101a20`; helmet, visor, tanks and boots are legible.
- Source is 14×22; feet on the bottom padding line; silhouette fills ~90% of the height.
- The subject reads as a human astronaut, not a cell creature: no tentacles, no tail, no nucleus.
- No visible face, no cast shadow, no ground, no text.
- Hard pixel edges; palette-only colours; alpha clean at 400%; ≤16 KB.
- The approved 14×22 master is saved under `art-source/characters/player-p1/working/` and exported to `shared/sprites/player-p1.png`; `style-anchor-p1.png` is the review reference.

#### `sprite.player.p1.walk` — source sheet (not a runtime asset)

**Reference:** `style-anchor-p1.png` for style and palette only. **Style:** `STYLE_SPRITE`. **Palette:** `PALETTE`. **Frame:** `FRAME_SHEET_PLAYER`. **Negative:** `NEGATIVE_SPRITE`. **Mode:** Ludo sprite-sheet source. **Output:** sheet PNG + JSON; slice with `npm run art:slice`; frame 0 is the static M3 fallback.

**COMPLETION STATUS:** `/shrinkonauts/art-source/characters/player-p1/ludo/`

```text
SUBJECT: The same Shrinkonaut as the approved P1 anchor — a human astronaut, not a cell creature — with identical silhouette, suit, helmet, visor, backpack, boots, scanner gauntlet, palette and outline weight. Full-body side view, facing right, one continuous walk cycle. Uniform sprite-sheet grid, consistent character scale, orientation, baseline and frame spacing in every frame. Flat solid magenta #FF00FF background, no labels, no grid lines, no frame border, no ground, no cast shadow. Do not add equipment, change proportions, or introduce a second character.

Pixel art for a side-view 2D platformer set inside a living human body. Native pixel grid, hard square pixels, crisp edges, no anti-aliasing, no smoothing, no mixed pixel sizes. Bold dark teal-brown outlines, one pixel at final sprite scale; flat fills from three-step ramps; 50% dither for damp membrane sheen, condensation, dust and grime. Gross-cute biology, wry deadpan tone, weird and fleshy but 12+ friendly: never gory, no shock humour. Strong readable shapes; characters and props must read as small sprites. Side view or slight 3/4 view.

Palette ramps: teal #05090b #101a20 #1d2f38; bone #c9b79a #f2e8d5 #fff8e8; bone shadow #5f736e #7a8f8a #9db4ad; nerve #b8862b #ffd166 #fff3b0; joint #3f9fb5 #7bdff2 #c9f7ff; muscle #a82a4a #ef476f #ff9fb2; sage #6f847d #9db4ad #c4d4ce; ink #000000 #05090b #2a3f47. Use only these ramp steps; no intermediate blends, no unapproved orange.

Uniform sprite sheet, one character and one action per sheet, consistent character scale, orientation and baseline in every frame, flat solid magenta #FF00FF background, no labels, no grid lines, no frame border, no ground, no cast shadow. Hard pixel edges; no anti-aliasing. The sheet is a source plate; the engine never loads it directly. Slice it with the Ludo JSON, normalize each frame to the player cell, and use frame 0 as the M3 static fallback unless another idle frame is approved.
```

**Acceptance**

- One character and one walk cycle; identical suit, helmet, visor, backpack, boots, scanner gauntlet, palette and outline weight to P1.
- Uniform grid; consistent scale, orientation, baseline and frame spacing.
- Flat magenta background; no labels, grid lines, frame border, ground, or shadow.
- The Ludo JSON matches the PNG; every frame slices cleanly.
- Frame 0 reads as a neutral idle; no new equipment or pose drift.

#### `sprite.player.p1.jump` — source sheet (not a runtime asset)

**Reference:** `art-source/characters/player-p1/ludo/walk-36f-2026-10-29/`. **Mode:** Ludo sprite-sheet source. **Output:** sheet PNG + JSON; slice with `npm run art:slice`; `npm run art:build-player` maps frames 6–17 to jump, 18–27 to fall, and 28–35 to land.

**Acceptance**

- The sheet is the 36-frame jump take, not a second walk cycle.
- The sequence contains idle, crouch, takeoff, air, landing, and recovery phases.
- Frames 6–35 are usable as jump/fall/land without a standing lead-in.
- The Ludo JSON matches the PNG; every frame slices cleanly.
- The historical folder name `walk-36f-2026-10-29` is retained because the source export is immutable.

#### `sprite.player.p2` — bone suit and joint-cyan visor (approved source sheets)

**Reference:** `art-source/characters/player-p2/`. **Source:** 14×22 PNG; 28×44 display. **File:** `shared/sprites/player-p2.png`.

P2 now uses the approved Ludo walk and jump sheets. For the POC they are used directly, not derived from P1. ADR-0065 supersedes the orange permutation in ADR-0064.

| Role | P1 | P2 |
|---|---|---|
| Suit | bone | bone (unchanged) |
| Visor | nerve/amber | joint/cyan |
| Tanks | nerve/yellow | joint/cyan |
| Accent | joint/cyan | nerve/amber |
| Joints | teal | teal (unchanged) |
| Outline / grime | ink / bone shadow | ink / bone shadow (unchanged) |

**Acceptance**

- At 28×44, the silhouette is indistinguishable from P1; only the approved visor/tank and accent ramps change.
- The suit is bone; the visor and tanks are joint cyan; the chest accent is nerve amber; joints, outline, and grime stay on their approved ramps.
- Orange appears nowhere on P2; no muscle-pink spill.
- The joint-cyan visor reads as glass through the ink rim.
- Source is 14×22; no new gear, no new pose.
- P2 walk and jump sheets slice cleanly and use the same clip names as P1.
- Both players read side by side on the contact sheet.
- No text, no cast shadow, hard pixel edges, alpha clean.

### 8.18 Shared entity prompts

**Common settings:** `SUBJECT` + `STYLE_SPRITE` + `PALETTE` + `FRAME_ENTITY_CONCEPT`; source **18×18 PNG**, display **36×36**; design for 36×36 readability with no fine detail. The export spec in `FRAME_ENTITY` is for Aseprite/Piskel, not Ludo. Filenames are in §5.3.

**Common acceptance:** reads at 36×36 on `#101a20`; silhouette distinct from every other entity; survives the warm interaction tint; hard pixel edges; palette-only colours; no text; alpha clean; ≤16 KB; the `SUBJECT` block is the first text in the prompt and the anatomy in plain shapes is accurate.

**POC note:** the statics from the nanobanan plates are generated with `npm run art:fit`. The Neuron Keeper static is frame 0 of the 36-frame animated source sheet and is built with `npm run art:build-player -- --character neuron-agent --sampler downscale`; the idle sheet is not a single-image Ludo prompt. The 2026-11-01 batch wires the gate, tracer, pulse terminal, and triangle/circle receptors; `sprite.scan.reflex` and `sprite.exit` stay placeholders. The plates that lost their reading at 36×36 stay placeholders (see §5.3).

| Asset ID | Style / negative | Frame | Source | File |
|---|---|---|---|---|
| `sprite.agent.neuron` | `STYLE_SPRITE` / `NEGATIVE_SPRITE` | `FRAME_ENTITY_CONCEPT` | 18×18 PNG | `shared/sprites/agent-neuron.png` |
| `sprite.scan.neuron` | `STYLE_SPRITE` / `NEGATIVE_SPRITE` | `FRAME_ENTITY_CONCEPT` | 18×18 PNG | `shared/sprites/scan-neuron.png` |
| `sprite.scan.synapse` | `STYLE_SPRITE` / `NEGATIVE_SPRITE` | `FRAME_ENTITY_CONCEPT` | 18×18 PNG | `shared/sprites/scan-synapse.png` |
| `sprite.scan.pathway` | `STYLE_SPRITE` / `NEGATIVE_SPRITE` | `FRAME_ENTITY_CONCEPT` | 18×18 PNG | `shared/sprites/scan-pathway.png` |
| `sprite.scan.muscle` | `STYLE_SPRITE` / `NEGATIVE_SPRITE` | `FRAME_ENTITY_CONCEPT` | 18×18 PNG | `shared/sprites/scan-muscle.png` |
| `sprite.scan.reflex` | `STYLE_SPRITE` / `NEGATIVE_SPRITE` | `FRAME_ENTITY_CONCEPT` | 18×18 PNG | `shared/sprites/scan-reflex.png` |
| `sprite.gate.ferry` | `STYLE_SPRITE` / `NEGATIVE_SPRITE` | `FRAME_ENTITY_CONCEPT` | 18×18 PNG | `shared/sprites/gate-ferry.png` |
| `sprite.exit` | `STYLE_SPRITE` / `NEGATIVE_SPRITE` | `FRAME_ENTITY_CONCEPT` | 18×18 PNG | `shared/sprites/exit.png` |

#### `sprite.agent.neuron` — Neuron Keeper

**Fact anchor:** NERV-01#1 (dendrites, soma, one axon, terminals); character fiction. **Reference:** P1 for style/palette only. **Style:** `STYLE_SPRITE`. **Frame:** `FRAME_ENTITY_CONCEPT`.

```text
SUBJECT: One single neuron cell creature — a plump, jelly-bean-shaped body in bone cream, about as tall as it is wide. It is a single rounded body with no separate head, torso, legs, clothes or hood. Two big tired oval eyes sit directly in the body, with heavy lids; no mouth, no nose, no ears. One dark teal oval nucleus shows inside the body, like a stone in a jellybean — this is the nucleus, not a chest light. A crown of six short, soft, fleshy tentacles with forked tips grows from the top and upper sides, like a tiny sea-anemone crown; these are the dendrites, the receiving branches. One long, thin, bare tail trails behind, like a tadpole tail, ending in a small forked tip; this is the single axon and its terminals. Exactly two short, rounded arms, no fingers; one arm holds a tiny round nerve-yellow lantern on a short handle, the other hangs limp. The body rests on one short, fleshy foot stalk at the bottom centre — not two legs. Slight 3/4 side view, facing right; slumped, fussy, tired posture; friendly and weird, not monstrous.

IN PLAIN SHAPES: the round body is the soma; the dark oval inside is the nucleus; the six tentacles are the dendrites; the single tail is the axon; the forked tail tip is the axon terminals; the arms and lantern are character props, not anatomy; the foot stalk is a base, not a leg. The tail is bare and smooth, with no sleeve segments.

Pixel art for a side-view 2D platformer set inside a living human body. Native pixel grid, hard square pixels, crisp edges, no anti-aliasing, no smoothing, no mixed pixel sizes. Bold dark teal-brown outlines, one pixel at final sprite scale; flat fills from three-step ramps; 50% dither for damp membrane sheen, condensation, dust and grime. Gross-cute biology, wry deadpan tone, weird and fleshy but 12+ friendly: never gory, no shock humour. Strong readable shapes; characters and props must read as small sprites. Side view or slight 3/4 view.

Palette ramps: teal #05090b #101a20 #1d2f38; bone #c9b79a #f2e8d5 #fff8e8; bone shadow #5f736e #7a8f8a #9db4ad; nerve #b8862b #ffd166 #fff3b0; joint #3f9fb5 #7bdff2 #c9f7ff; muscle #a82a4a #ef476f #ff9fb2; sage #6f847d #9db4ad #c4d4ce; ink #000000 #05090b #2a3f47. Use only these ramp steps; no intermediate blends, no unapproved orange.

Full object, centred, with a clear empty margin on all sides, isolated on a flat solid magenta #FF00FF background; no ground, no pedestal, no cast shadow, no scene, no frame. Draw the object large and clear; do not draw a pixel grid, a tiny sprite, or a sprite sheet. Hard pixel edges; no anti-aliasing.
```

**Negative:** NEGATIVE_SPRITE + humanoid body, person, keeper, robe, hood, clothes, legs, boots, hands with fingers, fur, hair, fluffy, feathers, scales, brain shape, generic animal cell, organelles, mitochondria, extra arms, extra tails, wings, long octopus arms, extra tentacles beyond the crown, second lantern, second cell body, myelin on the character.

**Acceptance:** Big eyes and lantern read at 36×36; one cell body and one tail; distinct from `scan.neuron`; base contact is clear; no text; no gore.

**Biology check:** one cell body; one nucleus; 5–7 dendrite tentacles; one bare axon; forked terminals; no myelin on the character; arms and lantern are props.

**Visual check:** at 36×36 the round body, tentacle crown, one tail and lantern read; no fur, no humanoid body, no extra limbs.

#### `sprite.scan.neuron` — neuron and myelin scan

**Fact anchor:** NERV-01#1, #3. **Reference:** P1 for style/palette only. **Style:** `STYLE_SPRITE`. **Frame:** `FRAME_ENTITY_CONCEPT`.

```text
SUBJECT: A diagrammatic scan icon of one nerve cell — not a character. A round bone-cream cell body on the left, with a burst of five short, branching tentacles on its left and top; these are the dendrites. One long, thin, cable-like tail runs to the right; this is the single axon. The tail is wrapped in three pale, bead-like sleeves with small dark gaps between them — the myelin sheath and the nodes of Ranvier. The tail ends in a small forked twig — the axon terminals. A bright nerve-yellow glow sits in the cell body; a thin joint-cyan rim traces the silhouette. Flat side view, left-to-right reading. No eyes, no face, no arms, no lantern, no character pose.

IN PLAIN SHAPES: the round body is the soma; the five tentacles are the dendrites; the single cable tail is the axon; the three pale sleeves are myelin; the dark gaps are the nodes of Ranvier; the forked twig is the axon terminals. Myelin is a sheath around the axon, not part of the cell body.

Pixel art for a side-view 2D platformer set inside a living human body. Native pixel grid, hard square pixels, crisp edges, no anti-aliasing, no smoothing, no mixed pixel sizes. Bold dark teal-brown outlines, one pixel at final sprite scale; flat fills from three-step ramps; 50% dither for damp membrane sheen, condensation, dust and grime. Gross-cute biology, wry deadpan tone, weird and fleshy but 12+ friendly: never gory, no shock humour. Strong readable shapes; characters and props must read as small sprites. Side view or slight 3/4 view.

Palette ramps: teal #05090b #101a20 #1d2f38; bone #c9b79a #f2e8d5 #fff8e8; bone shadow #5f736e #7a8f8a #9db4ad; nerve #b8862b #ffd166 #fff3b0; joint #3f9fb5 #7bdff2 #c9f7ff; muscle #a82a4a #ef476f #ff9fb2; sage #6f847d #9db4ad #c4d4ce; ink #000000 #05090b #2a3f47. Use only these ramp steps; no intermediate blends, no unapproved orange.

Full object, centred, with a clear empty margin on all sides, isolated on a flat solid magenta #FF00FF background; no ground, no pedestal, no cast shadow, no scene, no frame. Draw the object large and clear; do not draw a pixel grid, a tiny sprite, or a sprite sheet. Hard pixel edges; no anti-aliasing.
```

**Negative:** NEGATIVE_SPRITE + character, face, eyes, arms, lantern, humanoid, fur, hair, second axon, second cell body, labels, arrows.

**Acceptance:** One axon, dendrites, cell body and myelin gaps read at 36×36; distinct from the agent; the cyan rim reads as scannable; no text; no arrow.

**Biology check:** one cell body; 4–6 dendrites; one axon; 3+ myelin sleeves with gaps; forked terminals; no face, no character pose.

**Visual check:** the silhouette reads as a flat neuron icon, not the Neuron Keeper; the beaded tail and forked tip are visible; no arms or lantern.

#### `sprite.scan.synapse` — synapse and cleft scan

**Fact anchor:** NERV-02#1, #2. **Reference:** P1 for style/palette only. **Style:** `STYLE_SPRITE`. **Frame:** `FRAME_ENTITY_CONCEPT`.

```text
SUBJECT: A diagrammatic scan icon of two cells facing each other across a narrow dark gap, flat side view. A bulbous nerve ending on the left — the presynaptic terminal — faces a thick receiving wall on the right — the postsynaptic membrane. They do not touch: the gap between them is the synaptic cleft. Inside the left bulb are four round bubbles — synaptic vesicles. In the gap are three tiny glowing dots — neurotransmitter. On the right wall are three small socket shapes — receptors. Nerve-yellow glow, thin joint-cyan rim. No brain, no face, no labels, no arrows.

Pixel art for a side-view 2D platformer set inside a living human body. Native pixel grid, hard square pixels, crisp edges, no anti-aliasing, no smoothing, no mixed pixel sizes. Bold dark teal-brown outlines, one pixel at final sprite scale; flat fills from three-step ramps; 50% dither for damp membrane sheen, condensation, dust and grime. Gross-cute biology, wry deadpan tone, weird and fleshy but 12+ friendly: never gory, no shock humour. Strong readable shapes; characters and props must read as small sprites. Side view or slight 3/4 view.

Palette ramps: teal #05090b #101a20 #1d2f38; bone #c9b79a #f2e8d5 #fff8e8; bone shadow #5f736e #7a8f8a #9db4ad; nerve #b8862b #ffd166 #fff3b0; joint #3f9fb5 #7bdff2 #c9f7ff; muscle #a82a4a #ef476f #ff9fb2; sage #6f847d #9db4ad #c4d4ce; ink #000000 #05090b #2a3f47. Use only these ramp steps; no intermediate blends, no unapproved orange.

Full object, centred, with a clear empty margin on all sides, isolated on a flat solid magenta #FF00FF background; no ground, no pedestal, no cast shadow, no scene, no frame. Draw the object large and clear; do not draw a pixel grid, a tiny sprite, or a sprite sheet. Hard pixel edges; no anti-aliasing.
```

**Negative:** NEGATIVE_SPRITE + character, face, eyes, arms, lantern, humanoid, fur, hair, brain, labels, arrows, cells touching.

**Acceptance:** Two cells and the cleft read at 36×36; vesicles are inside the presynaptic terminal, not in the cleft; receptors are on the postsynaptic side; distinct from `pulse.terminal`; no text.

**Biology check:** one presynaptic terminal; one postsynaptic membrane; visible cleft; vesicles inside; transmitter dots in the gap; receptors on the receiving side; the cells do not touch.

**Visual check:** the narrow dark gap is the dominant negative space; the left bulb and right wall are clearly different shapes; no face.

#### `sprite.scan.pathway` — one-way pathway scan

**Fact anchor:** NERV-01#1, #6. **Reference:** P1 for style/palette only. **Style:** `STYLE_SPRITE`. **Frame:** `FRAME_ENTITY_CONCEPT`.

```text
SUBJECT: A diagrammatic scan icon of a one-way nerve path reading left to right — not a character. A burst of five short, branching tentacles at the left; these are the dendrites. A round bone-cream cell body next; this is the soma. One long, thin, cable-like tail runs to the right; this is the single axon. The tail is wrapped in three pale, bead-like sleeves with small dark gaps between them — the myelin sheath and the nodes of Ranvier. The tail ends in a small forked twig — the axon terminals. A bright nerve-yellow pulse sits in one gap; the forked tip points right. Nerve-yellow glow, thin joint-cyan scan rim. Flat side view. No face, no arms, no lantern, no arrow, no labels, no diagram lines.

Pixel art for a side-view 2D platformer set inside a living human body. Native pixel grid, hard square pixels, crisp edges, no anti-aliasing, no smoothing, no mixed pixel sizes. Bold dark teal-brown outlines, one pixel at final sprite scale; flat fills from three-step ramps; 50% dither for damp membrane sheen, condensation, dust and grime. Gross-cute biology, wry deadpan tone, weird and fleshy but 12+ friendly: never gory, no shock humour. Strong readable shapes; characters and props must read as small sprites. Side view or slight 3/4 view.

Palette ramps: teal #05090b #101a20 #1d2f38; bone #c9b79a #f2e8d5 #fff8e8; bone shadow #5f736e #7a8f8a #9db4ad; nerve #b8862b #ffd166 #fff3b0; joint #3f9fb5 #7bdff2 #c9f7ff; muscle #a82a4a #ef476f #ff9fb2; sage #6f847d #9db4ad #c4d4ce; ink #000000 #05090b #2a3f47. Use only these ramp steps; no intermediate blends, no unapproved orange.

Full object, centred, with a clear empty margin on all sides, isolated on a flat solid magenta #FF00FF background; no ground, no pedestal, no cast shadow, no scene, no frame. Draw the object large and clear; do not draw a pixel grid, a tiny sprite, or a sprite sheet. Hard pixel edges; no anti-aliasing.
```

**Negative:** NEGATIVE_SPRITE + character, face, eyes, arms, lantern, humanoid, fur, hair, arrow, labels, second axon.

**Acceptance:** The one-way reading comes from the dendrite-to-terminal shape, not an arrow; one axon; distinct from `scan.neuron`; no text.

**Biology check:** dendrites on the left; one cell body; one myelinated axon; nodes between sleeves; forked terminals on the right; one pulse in a gap.

**Visual check:** the left-to-right taper is obvious at 36×36; no arrow or label; no face.

#### `sprite.scan.muscle` — muscle effector scan

**Fact anchor:** NERV-02#5 (NMJ, ACh, muscle response); NERV-03#3 (muscle contraction). **Reference:** P1 for style/palette only. **Style:** `STYLE_SPRITE`. **Frame:** `FRAME_ENTITY_CONCEPT`.

```text
SUBJECT: A diagrammatic scan icon of a muscle-nerve contact, flat side view. A bundle of three long muscle-pink fibres, like taut ropes, fills the lower half. A thin nerve cable comes from the upper left and ends in a round knob that touches the muscle surface — the motor-nerve terminal. A tiny nerve-yellow spark marks the contact. A thin joint-cyan rim traces the silhouette. No face, no labels, no arrows, no textbook striation diagram, no gore.

Pixel art for a side-view 2D platformer set inside a living human body. Native pixel grid, hard square pixels, crisp edges, no anti-aliasing, no smoothing, no mixed pixel sizes. Bold dark teal-brown outlines, one pixel at final sprite scale; flat fills from three-step ramps; 50% dither for damp membrane sheen, condensation, dust and grime. Gross-cute biology, wry deadpan tone, weird and fleshy but 12+ friendly: never gory, no shock humour. Strong readable shapes; characters and props must read as small sprites. Side view or slight 3/4 view.

Palette ramps: teal #05090b #101a20 #1d2f38; bone #c9b79a #f2e8d5 #fff8e8; bone shadow #5f736e #7a8f8a #9db4ad; nerve #b8862b #ffd166 #fff3b0; joint #3f9fb5 #7bdff2 #c9f7ff; muscle #a82a4a #ef476f #ff9fb2; sage #6f847d #9db4ad #c4d4ce; ink #000000 #05090b #2a3f47. Use only these ramp steps; no intermediate blends, no unapproved orange.

Full object, centred, with a clear empty margin on all sides, isolated on a flat solid magenta #FF00FF background; no ground, no pedestal, no cast shadow, no scene, no frame. Draw the object large and clear; do not draw a pixel grid, a tiny sprite, or a sprite sheet. Hard pixel edges; no anti-aliasing.
```

**Negative:** NEGATIVE_SPRITE + character, face, eyes, humanoid, fur, hair, labels, arrows, textbook striation diagram, gore.

**Acceptance:** Muscle bundle and nerve contact read at 36×36; distinct from `scan.synapse`; no striation textbook diagram; no text; no gore.

**Biology check:** three rope-like muscle fibres; one nerve cable; one round terminal knob touching the surface; one yellow spark at the contact.

**Visual check:** the knob meets the muscle; the fibres read as a bundle, not a steak; no labels.

#### `sprite.scan.reflex` — reflex arc reserve

**Fact anchor:** NERV-03#1–#3, #5. Status: not referenced by 03/04; generate only if 05 is authored or the capture needs it. **Reference:** P1 for style/palette only. **Style:** `STYLE_SPRITE`. **Frame:** `FRAME_ENTITY_CONCEPT`.

```text
SUBJECT: A simple loop-shaped scan icon of a reflex circuit made of flesh — a sensor capsule on the left, a short cord segment in the middle, and a muscle bundle on the right, connected by two thin cables. On the left, a small spindle-shaped capsule wrapped in a spiral wire — the muscle spindle, a stretch sensor. In the middle, a short thick cord segment — the spinal cord. On the right, a pink muscle bundle. One thin cable enters the back of the cord — the sensory axon through the dorsal root. One thin cable leaves the front — the motor axon through the ventral root. The two cables meet at one small junction inside the cord — the single synapse of the reflex. No brain. Nerve-yellow glow, thin joint-cyan rim. No labels, no arrows, no diagram lines.

Pixel art for a side-view 2D platformer set inside a living human body. Native pixel grid, hard square pixels, crisp edges, no anti-aliasing, no smoothing, no mixed pixel sizes. Bold dark teal-brown outlines, one pixel at final sprite scale; flat fills from three-step ramps; 50% dither for damp membrane sheen, condensation, dust and grime. Gross-cute biology, wry deadpan tone, weird and fleshy but 12+ friendly: never gory, no shock humour. Strong readable shapes; characters and props must read as small sprites. Side view or slight 3/4 view.

Palette ramps: teal #05090b #101a20 #1d2f38; bone #c9b79a #f2e8d5 #fff8e8; bone shadow #5f736e #7a8f8a #9db4ad; nerve #b8862b #ffd166 #fff3b0; joint #3f9fb5 #7bdff2 #c9f7ff; muscle #a82a4a #ef476f #ff9fb2; sage #6f847d #9db4ad #c4d4ce; ink #000000 #05090b #2a3f47. Use only these ramp steps; no intermediate blends, no unapproved orange.

Full object, centred, with a clear empty margin on all sides, isolated on a flat solid magenta #FF00FF background; no ground, no pedestal, no cast shadow, no scene, no frame. Draw the object large and clear; do not draw a pixel grid, a tiny sprite, or a sprite sheet. Hard pixel edges; no anti-aliasing.
```

**Negative:** NEGATIVE_SPRITE + character, face, eyes, humanoid, fur, hair, brain, labels, arrows, diagram lines, more than two neurons.

**Acceptance:** If generated, two neurons, the dorsal and ventral roots and the muscle spindle read at 36×36; no brain; no text. If it does not read at 36×36, keep the placeholder and do not force it.

**Biology check:** one spindle sensor; one sensory cable entering the back of the cord; one motor cable leaving the front; one synapse inside the cord; one muscle bundle; no brain.

**Visual check:** the loop reads as a simple two-cell circuit, not a textbook diagram; no labels or arrows.

#### `sprite.gate.ferry` — organic gate

**Fact anchor:** puzzle abstraction, not an anatomical valve. **Reference:** P1 for style/palette only. **Style:** `STYLE_SPRITE`. **Frame:** `FRAME_ENTITY_CONCEPT`.

```text
SUBJECT: A closed organic gate, flat side view. A thick bone-and-membrane frame around a closed opening; a taut curtain of wet teal tissue stretches across it; one nerve-yellow seam runs down the centre. Small bone plates at the hinges. Closed state only. No receptor sockets, no keyhole, no mechanical parts, no face, no label. Strong silhouette; base at the bottom.

Pixel art for a side-view 2D platformer set inside a living human body. Native pixel grid, hard square pixels, crisp edges, no anti-aliasing, no smoothing, no mixed pixel sizes. Bold dark teal-brown outlines, one pixel at final sprite scale; flat fills from three-step ramps; 50% dither for damp membrane sheen, condensation, dust and grime. Gross-cute biology, wry deadpan tone, weird and fleshy but 12+ friendly: never gory, no shock humour. Strong readable shapes; characters and props must read as small sprites. Side view or slight 3/4 view.

Palette ramps: teal #05090b #101a20 #1d2f38; bone #c9b79a #f2e8d5 #fff8e8; bone shadow #5f736e #7a8f8a #9db4ad; nerve #b8862b #ffd166 #fff3b0; joint #3f9fb5 #7bdff2 #c9f7ff; muscle #a82a4a #ef476f #ff9fb2; sage #6f847d #9db4ad #c4d4ce; ink #000000 #05090b #2a3f47. Use only these ramp steps; no intermediate blends, no unapproved orange.

Full object, centred, with a clear empty margin on all sides, isolated on a flat solid magenta #FF00FF background; no ground, no pedestal, no cast shadow, no scene, no frame. Draw the object large and clear; do not draw a pixel grid, a tiny sprite, or a sprite sheet. Hard pixel edges; no anti-aliasing.
```

**Negative:** NEGATIVE_SPRITE + receptor sockets, keyhole, mechanical parts, character, face, label.

**Acceptance:** Reads as a closed gate at 36×36; no receptor sockets; distinct from `sprite.exit`; works over bone, nerve and muscle backgrounds; no text; no baked glow.

**Biology check:** organic frame, wet tissue curtain, one central seam; this is a game gate, not an anatomical valve.

**Visual check:** the closed state is obvious; the bone hinges and tissue curtain read; no keyhole.

#### `sprite.exit` — membrane airlock

**Fact anchor:** level fiction; no anatomical claim. **Reference:** P1 for style/palette only. **Style:** `STYLE_SPRITE`. **Frame:** `FRAME_ENTITY_CONCEPT`.

```text
SUBJECT: A membrane airlock, flat side view. A ring of bone and teal tissue forms a round opening; warm nerve-yellow light glows beyond; wet folds and a few bone struts frame the opening. The opening fills most of the canvas. No character, no face, no label, no gore. Strong silhouette; base at the bottom.

Pixel art for a side-view 2D platformer set inside a living human body. Native pixel grid, hard square pixels, crisp edges, no anti-aliasing, no smoothing, no mixed pixel sizes. Bold dark teal-brown outlines, one pixel at final sprite scale; flat fills from three-step ramps; 50% dither for damp membrane sheen, condensation, dust and grime. Gross-cute biology, wry deadpan tone, weird and fleshy but 12+ friendly: never gory, no shock humour. Strong readable shapes; characters and props must read as small sprites. Side view or slight 3/4 view.

Palette ramps: teal #05090b #101a20 #1d2f38; bone #c9b79a #f2e8d5 #fff8e8; bone shadow #5f736e #7a8f8a #9db4ad; nerve #b8862b #ffd166 #fff3b0; joint #3f9fb5 #7bdff2 #c9f7ff; muscle #a82a4a #ef476f #ff9fb2; sage #6f847d #9db4ad #c4d4ce; ink #000000 #05090b #2a3f47. Use only these ramp steps; no intermediate blends, no unapproved orange.

Full object, centred, with a clear empty margin on all sides, isolated on a flat solid magenta #FF00FF background; no ground, no pedestal, no cast shadow, no scene, no frame. Draw the object large and clear; do not draw a pixel grid, a tiny sprite, or a sprite sheet. Hard pixel edges; no anti-aliasing.
```

**Negative:** NEGATIVE_SPRITE + character, face, label, gore.

**Acceptance:** Reads as a destination at 36×36; warm light is visible; distinct from the gate; no character, no text.

**Biology check:** bone-and-tissue ring, warm light beyond, wet folds; level fiction, no anatomical claim.

**Visual check:** the opening dominates the silhouette; the warm centre reads against the dark frame; no face.

### 8.19 Prop and receptor prompts

**Common settings:** `SUBJECT` + `STYLE_SPRITE` + `PALETTE` + `FRAME_ENTITY_CONCEPT`; source **18×18 PNG**, display **36×36**; design for 36×36 readability. The export spec in `FRAME_ENTITY` is for Aseprite/Piskel, not Ludo.

| Asset ID | Style / negative | Frame | Source | File |
|---|---|---|---|---|
| `sprite.prop.tracer` | `STYLE_SPRITE` / `NEGATIVE_SPRITE` | `FRAME_ENTITY_CONCEPT` | 18×18 PNG | `shared/sprites/prop-tracer.png` |
| `sprite.pulse.terminal` | `STYLE_SPRITE` / `NEGATIVE_SPRITE` | `FRAME_ENTITY_CONCEPT` | 18×18 PNG | `shared/sprites/pulse-terminal.png` |
| `sprite.receptor.triangle` | `STYLE_SPRITE` / `NEGATIVE_SPRITE` | `FRAME_ENTITY_CONCEPT` | 18×18 PNG | `shared/sprites/receptor-triangle.png` |
| `sprite.receptor.circle` | `STYLE_SPRITE` / `NEGATIVE_SPRITE` | `FRAME_ENTITY_CONCEPT` | 18×18 PNG | `shared/sprites/receptor-circle.png` |

**POC note:** all four prop/receptor IDs are POC-integrated from the 2026-11-01 batch. The tracer and circle receptor lose the cyan rim at 18×18; the silhouettes remain distinct and survive the warm interaction tint. Final approval is pending.

#### `sprite.prop.tracer` — ACh packet

**Fact anchor:** NERV-02#1, #2, #5; game token, not a literal vesicle. **Reference:** P1 for style/palette only. **Style:** `STYLE_SPRITE`. **Frame:** `FRAME_ENTITY_CONCEPT`.

```text
SUBJECT: A small triangular signal packet, like a folded envelope made of wet flesh. A glowing nerve-yellow centre, a thin joint-cyan rim, and two tiny fleshy tabs at the back. Clear triangular silhouette. It is a game token for a chemical message (ACh), not a literal vesicle, not a creature. No face, no eyes, no mouth, no labels, no arrows.

Pixel art for a side-view 2D platformer set inside a living human body. Native pixel grid, hard square pixels, crisp edges, no anti-aliasing, no smoothing, no mixed pixel sizes. Bold dark teal-brown outlines, one pixel at final sprite scale; flat fills from three-step ramps; 50% dither for damp membrane sheen, condensation, dust and grime. Gross-cute biology, wry deadpan tone, weird and fleshy but 12+ friendly: never gory, no shock humour. Strong readable shapes; characters and props must read as small sprites. Side view or slight 3/4 view.

Palette ramps: teal #05090b #101a20 #1d2f38; bone #c9b79a #f2e8d5 #fff8e8; bone shadow #5f736e #7a8f8a #9db4ad; nerve #b8862b #ffd166 #fff3b0; joint #3f9fb5 #7bdff2 #c9f7ff; muscle #a82a4a #ef476f #ff9fb2; sage #6f847d #9db4ad #c4d4ce; ink #000000 #05090b #2a3f47. Use only these ramp steps; no intermediate blends, no unapproved orange.

Full object, centred, with a clear empty margin on all sides, isolated on a flat solid magenta #FF00FF background; no ground, no pedestal, no cast shadow, no scene, no frame. Draw the object large and clear; do not draw a pixel grid, a tiny sprite, or a sprite sheet. Hard pixel edges; no anti-aliasing.
```

**Negative:** NEGATIVE_SPRITE + face, eyes, mouth, character, humanoid, fur, hair, label, arrow, second packet.

**Acceptance:** The triangular silhouette reads at 36×36 and matches `sprite.receptor.triangle`; no face; no text; no cast shadow.

**Biology check:** a game token for a chemical message (ACh); triangular silhouette; no literal vesicle anatomy.

**Visual check:** the triangle is unmistakable; the glowing core and two tabs read; no eyes or mouth.

#### `sprite.pulse.terminal` — motor terminal

**Fact anchor:** NERV-02#1, #2. **Reference:** P1 for style/palette only. **Style:** `STYLE_SPRITE`. **Frame:** `FRAME_ENTITY_CONCEPT`.

```text
SUBJECT: A bulbous nerve ending, like a round knob at the end of a short cable, flat side view. A teal membrane bulb with four large round bubbles inside — synaptic vesicles. A small joint-cyan emitter at the mouth; a short cable stub at the back — the axon. One terminal only. No face, no labels, no gore. Base at the bottom.

Pixel art for a side-view 2D platformer set inside a living human body. Native pixel grid, hard square pixels, crisp edges, no anti-aliasing, no smoothing, no mixed pixel sizes. Bold dark teal-brown outlines, one pixel at final sprite scale; flat fills from three-step ramps; 50% dither for damp membrane sheen, condensation, dust and grime. Gross-cute biology, wry deadpan tone, weird and fleshy but 12+ friendly: never gory, no shock humour. Strong readable shapes; characters and props must read as small sprites. Side view or slight 3/4 view.

Palette ramps: teal #05090b #101a20 #1d2f38; bone #c9b79a #f2e8d5 #fff8e8; bone shadow #5f736e #7a8f8a #9db4ad; nerve #b8862b #ffd166 #fff3b0; joint #3f9fb5 #7bdff2 #c9f7ff; muscle #a82a4a #ef476f #ff9fb2; sage #6f847d #9db4ad #c4d4ce; ink #000000 #05090b #2a3f47. Use only these ramp steps; no intermediate blends, no unapproved orange.

Full object, centred, with a clear empty margin on all sides, isolated on a flat solid magenta #FF00FF background; no ground, no pedestal, no cast shadow, no scene, no frame. Draw the object large and clear; do not draw a pixel grid, a tiny sprite, or a sprite sheet. Hard pixel edges; no anti-aliasing.
```

**Negative:** NEGATIVE_SPRITE + face, eyes, character, humanoid, fur, hair, label, gore, multiple terminals.

**Acceptance:** Terminal, vesicles and cyan emitter read at 36×36; distinct from `scan.synapse`; no text; no gore.

**Biology check:** one presynaptic terminal; vesicles inside; emitter at the mouth; short axon stub at the back.

**Visual check:** the knob shape and internal bubbles read; the cyan emitter is at the mouth, not the back; no face.

#### `sprite.receptor.triangle` — nicotinic receptor

**Fact anchor:** NERV-02#5; shape-matching is a game abstraction, not a literal protein structure. **Reference:** P1 for style/palette only. **Style:** `STYLE_SPRITE`. **Frame:** `FRAME_ENTITY_CONCEPT`.

```text
SUBJECT: A triangular socket in a wet membrane rim, like a natural opening in a soft wall — not a mechanical keyhole. A clean triangular opening, a bone-and-teal rim, a nerve-yellow inner glow, and three small organic clasps. This represents a nicotinic receptor, simplified for the game. No label, no key, no lock, no face. Base at the bottom.

Pixel art for a side-view 2D platformer set inside a living human body. Native pixel grid, hard square pixels, crisp edges, no anti-aliasing, no smoothing, no mixed pixel sizes. Bold dark teal-brown outlines, one pixel at final sprite scale; flat fills from three-step ramps; 50% dither for damp membrane sheen, condensation, dust and grime. Gross-cute biology, wry deadpan tone, weird and fleshy but 12+ friendly: never gory, no shock humour. Strong readable shapes; characters and props must read as small sprites. Side view or slight 3/4 view.

Palette ramps: teal #05090b #101a20 #1d2f38; bone #c9b79a #f2e8d5 #fff8e8; bone shadow #5f736e #7a8f8a #9db4ad; nerve #b8862b #ffd166 #fff3b0; joint #3f9fb5 #7bdff2 #c9f7ff; muscle #a82a4a #ef476f #ff9fb2; sage #6f847d #9db4ad #c4d4ce; ink #000000 #05090b #2a3f47. Use only these ramp steps; no intermediate blends, no unapproved orange.

Full object, centred, with a clear empty margin on all sides, isolated on a flat solid magenta #FF00FF background; no ground, no pedestal, no cast shadow, no scene, no frame. Draw the object large and clear; do not draw a pixel grid, a tiny sprite, or a sprite sheet. Hard pixel edges; no anti-aliasing.
```

**Negative:** NEGATIVE_SPRITE + mechanical keyhole, key, lock, label, character, face.

**Acceptance:** Triangular opening reads at 36×36; distinct from the circle receptor; no mechanical key or lock; no text.

**Biology check:** triangular socket in a wet membrane rim; a simplified nicotinic receptor, not a literal protein structure.

**Visual check:** the triangle is the dominant shape; the rim is organic; no keyhole.

#### `sprite.receptor.circle` — wrong receptor

**Fact anchor:** NERV-02#3 is advanced and optional; this is the shape-mismatch socket. **Reference:** P1 for style/palette only. **Style:** `STYLE_SPRITE`. **Frame:** `FRAME_ENTITY_CONCEPT`.

```text
SUBJECT: A circular socket in a wet membrane rim, like a natural opening in a soft wall — not a mechanical keyhole. A clean circular opening, a bone-and-teal rim, a nerve-yellow inner glow, and three small organic clasps. This represents a wrong-receptor socket, simplified for the game. No label, no key, no lock, no face. Base at the bottom.

Pixel art for a side-view 2D platformer set inside a living human body. Native pixel grid, hard square pixels, crisp edges, no anti-aliasing, no smoothing, no mixed pixel sizes. Bold dark teal-brown outlines, one pixel at final sprite scale; flat fills from three-step ramps; 50% dither for damp membrane sheen, condensation, dust and grime. Gross-cute biology, wry deadpan tone, weird and fleshy but 12+ friendly: never gory, no shock humour. Strong readable shapes; characters and props must read as small sprites. Side view or slight 3/4 view.

Palette ramps: teal #05090b #101a20 #1d2f38; bone #c9b79a #f2e8d5 #fff8e8; bone shadow #5f736e #7a8f8a #9db4ad; nerve #b8862b #ffd166 #fff3b0; joint #3f9fb5 #7bdff2 #c9f7ff; muscle #a82a4a #ef476f #ff9fb2; sage #6f847d #9db4ad #c4d4ce; ink #000000 #05090b #2a3f47. Use only these ramp steps; no intermediate blends, no unapproved orange.

Full object, centred, with a clear empty margin on all sides, isolated on a flat solid magenta #FF00FF background; no ground, no pedestal, no cast shadow, no scene, no frame. Draw the object large and clear; do not draw a pixel grid, a tiny sprite, or a sprite sheet. Hard pixel edges; no anti-aliasing.
```

**Negative:** NEGATIVE_SPRITE + mechanical keyhole, key, lock, label, character, face.

**Acceptance:** Circular opening reads at 36×36; distinct from the triangle receptor; no mechanical key or lock; no text.

**Biology check:** circular socket in a wet membrane rim; a wrong-receptor socket, simplified for the game.

**Visual check:** the circle is the dominant shape; the rim is organic; no keyhole.

### 8.20 Background prompts

> **Background prompts superseded (2026-11-01).** The corrected sky/far/mid/near prompts and the `#FF00FF` cut-out workflow are in [`background-asset-requirements-v01.md`](background-asset-requirements-v01.md). The prompts below are retained for history; do not generate any background plate from them.

**POC status:** only `bg.nerve_forest.sky` is wired. The supplied sky is a 16:9 scene cropped to 2672×1536, area-resized to 640×368, and palette-quantised; it is busier than the ideal prompt plate and remains POC/final-approval-pending. The supplied far/mid/near plates are source-only and must not be wired into the current tile layers.

#### `bg.nerve_forest.sky` — sky plate

**Reference:** none; creates `style-anchor-sky.png`. **Style:** `STYLE_BACKGROUND`. **Frame:** `FRAME_SKY`. **Source:** 640×368 WebP/PNG, integer 2× cover. **File:** `shared/backgrounds/nerve-forest-sky.webp`.

```text
SUBJECT: A wide background plate: the interior of a living body as a damp nerve forest at night. Deep teal darkness; distant thick cable-like nerve trunks, like giant roots; pale segmented sheath plates, like stacked bone tiles, receding in dither haze; a faint nerve-yellow glow low in the distance; floating dust and condensation. No characters, no creatures, no labels, no arrows. Orthographic side view, soft atmospheric depth from layered values and dither, no single directional light, no hard horizon line at player height. Keep the upper corners and lower third dark and low-contrast for HUD and player silhouettes; keep important detail inside the central 70% for the 2× cover crop.

Pixel art for a side-view 2D platformer set inside a living human body. Native pixel grid, hard square pixels, crisp edges, no anti-aliasing, no smoothing. Orthographic side view, landscape scale; atmospheric depth from layered values and dither, not a global gradient; local warm highlights only. Damp membrane sheen, condensation, dust and grime. Gross-cute biology, wry deadpan tone, 12+ friendly: never gory. The body is a landscape, not a textbook cutaway; use cable-like nerves, segmented sheath plates and membrane folds as architecture.

Palette ramps: teal #05090b #101a20 #1d2f38; bone #c9b79a #f2e8d5 #fff8e8; bone shadow #5f736e #7a8f8a #9db4ad; nerve #b8862b #ffd166 #fff3b0; joint #3f9fb5 #7bdff2 #c9f7ff; muscle #a82a4a #ef476f #ff9fb2; sage #6f847d #9db4ad #c4d4ce; ink #000000 #05090b #2a3f47. Use only these ramp steps; no intermediate blends, no unapproved orange.

640×368, wide, opaque, edge-to-edge background plate, no frame. Keep the upper corners and lower third dark and low-contrast; keep important detail inside the central 70% for the 2× cover crop. Hard pixel edges; no anti-aliasing.
```

**Negative:** NEGATIVE_BACKGROUND + textbook cutaway, anatomical labels, diagram lines.

**Acceptance:** At 1280×720 cover crop, the HUD text and player silhouettes read; no hard horizon at player height; no characters or text; no obvious focal landmark; ≤300 KB.

**Biology check:** the body reads as a damp nerve landscape, not a textbook cutaway; no bone-innervation claim.

**Visual check:** cable-like trunks and segmented sheath plates read as landscape; no labels or diagram lines.

#### `bg.nerve_forest.far` — far parallax layer

**Reference:** `style-anchor-sky.png` for style/palette only. **Style:** `STYLE_BACKGROUND`. **Frame:** `FRAME_PARALLAX`. **Source:** 1024×512 WebP/PNG, transparent, 2×2 clusters. **File:** `shared/backgrounds/nerve-forest-far.webp`.

```text
SUBJECT: A seamless 2:1 far parallax layer: distant giant cable-like nerve trunks and pale segmented sheath plates, like stacked bone roof tiles, in very low contrast cool teal and sage, with soft dither haze and large slow shapes. No ground line, no characters, no labels, no arrows, no unique focal object. Orthographic side view; tile seamlessly on all four edges; no single directional light, no hard cast shadows.

Pixel art for a side-view 2D platformer set inside a living human body. Native pixel grid, hard square pixels, crisp edges, no anti-aliasing, no smoothing. Orthographic side view, landscape scale; atmospheric depth from layered values and dither, not a global gradient; local warm highlights only. Damp membrane sheen, condensation, dust and grime. Gross-cute biology, wry deadpan tone, 12+ friendly: never gory. The body is a landscape, not a textbook cutaway; use cable-like nerves, segmented sheath plates and membrane folds as architecture.

Palette ramps: teal #05090b #101a20 #1d2f38; bone #c9b79a #f2e8d5 #fff8e8; bone shadow #5f736e #7a8f8a #9db4ad; nerve #b8862b #ffd166 #fff3b0; joint #3f9fb5 #7bdff2 #c9f7ff; muscle #a82a4a #ef476f #ff9fb2; sage #6f847d #9db4ad #c4d4ce; ink #000000 #05090b #2a3f47. Use only these ramp steps; no intermediate blends, no unapproved orange.

1024×512, 2:1, transparent background, isolated layer, no frame. Tile seamlessly on all four edges; every colour block at least 2×2 pixels; verify as a 2×2 repeat at native size and at 1280×720. Hard pixel edges; no anti-aliasing.
```

**Negative:** NEGATIVE_BACKGROUND + textbook cutaway, anatomical labels, diagram lines.

**Acceptance:** Low contrast, large slow shapes; no focal landmark; both-axis seam check passes; no text.

**Biology check:** distant nerve trunks and sheath plates read as landscape architecture, not a diagram.

**Visual check:** no hard horizon; no unique focal object; no labels.

#### `bg.nerve_forest.mid` — mid parallax layer

**Reference:** `style-anchor-sky.png` for style/palette only. **Style:** `STYLE_BACKGROUND`. **Frame:** `FRAME_PARALLAX`. **Source:** 1024×512 WebP/PNG, transparent, 2×2 clusters. **File:** `shared/backgrounds/nerve-forest-mid.webp`.

```text
SUBJECT: A seamless 2:1 mid parallax layer: branching, tentacle-like nerve twigs; round nerve bulbs hanging like lanterns; wet membrane folds like draped fabric. Medium-contrast deep teal and sage, with a few nerve-yellow glow accents. No characters, no faces, no labels, no arrows, no unique focal object, no bone-cortex texture. Orthographic side view; tile on all four edges; soft ambient depth, no single directional light.

Pixel art for a side-view 2D platformer set inside a living human body. Native pixel grid, hard square pixels, crisp edges, no anti-aliasing, no smoothing. Orthographic side view, landscape scale; atmospheric depth from layered values and dither, not a global gradient; local warm highlights only. Damp membrane sheen, condensation, dust and grime. Gross-cute biology, wry deadpan tone, 12+ friendly: never gory. The body is a landscape, not a textbook cutaway; use cable-like nerves, segmented sheath plates and membrane folds as architecture.

Palette ramps: teal #05090b #101a20 #1d2f38; bone #c9b79a #f2e8d5 #fff8e8; bone shadow #5f736e #7a8f8a #9db4ad; nerve #b8862b #ffd166 #fff3b0; joint #3f9fb5 #7bdff2 #c9f7ff; muscle #a82a4a #ef476f #ff9fb2; sage #6f847d #9db4ad #c4d4ce; ink #000000 #05090b #2a3f47. Use only these ramp steps; no intermediate blends, no unapproved orange.

1024×512, 2:1, transparent background, isolated layer, no frame. Tile seamlessly on all four edges; every colour block at least 2×2 pixels; verify as a 2×2 repeat at native size and at 1280×720. Hard pixel edges; no anti-aliasing.
```

**Negative:** NEGATIVE_BACKGROUND + textbook cutaway, anatomical labels, diagram lines, bone-cortex texture.

**Acceptance:** Medium contrast; no obvious repeat; no bone-cortex texture that fights the runtime overlay; both-axis seam check passes; no text.

**Biology check:** branching nerve twigs, nerve bulbs and membrane folds; no labels or diagram lines.

**Visual check:** the layer reads as a damp nerve forest; no faces; no focal landmark.

#### `bg.nerve_forest.near` — near parallax layer

**Reference:** `style-anchor-sky.png` for style/palette only. **Style:** `STYLE_BACKGROUND`. **Frame:** `FRAME_PARALLAX`. **Source:** 1024×512 WebP/PNG, transparent, 2×2 clusters. **File:** `shared/backgrounds/nerve-forest-near.webp`.

```text
SUBJECT: A seamless 2:1 near foreground parallax layer: dark fibrous cable-like roots, wet membrane sacs like balloons, and membrane folds like draped fabric framing the left and right edges and the top; very high contrast deep teal silhouettes, with large fully transparent gaps across the centre and lower third. Occasional nerve-yellow glow. No characters, no faces, no labels, no arrows, no unique focal object, no opaque band across the play area. Orthographic side view; tile on all four edges.

Pixel art for a side-view 2D platformer set inside a living human body. Native pixel grid, hard square pixels, crisp edges, no anti-aliasing, no smoothing. Orthographic side view, landscape scale; atmospheric depth from layered values and dither, not a global gradient; local warm highlights only. Damp membrane sheen, condensation, dust and grime. Gross-cute biology, wry deadpan tone, 12+ friendly: never gory. The body is a landscape, not a textbook cutaway; use cable-like nerves, segmented sheath plates and membrane folds as architecture.

Palette ramps: teal #05090b #101a20 #1d2f38; bone #c9b79a #f2e8d5 #fff8e8; bone shadow #5f736e #7a8f8a #9db4ad; nerve #b8862b #ffd166 #fff3b0; joint #3f9fb5 #7bdff2 #c9f7ff; muscle #a82a4a #ef476f #ff9fb2; sage #6f847d #9db4ad #c4d4ce; ink #000000 #05090b #2a3f47. Use only these ramp steps; no intermediate blends, no unapproved orange.

1024×512, 2:1, transparent background, isolated layer, no frame. Tile seamlessly on all four edges; every colour block at least 2×2 pixels; verify as a 2×2 repeat at native size and at 1280×720. Hard pixel edges; no anti-aliasing.
```

**Negative:** NEGATIVE_BACKGROUND + textbook cutaway, anatomical labels, diagram lines, opaque centre.

**Acceptance:** Centre and lower third stay transparent; the layer does not hide platforms or players; both-axis seam check passes; no text.

**Biology check:** dark cable-like roots, membrane sacs and folds; no diagram lines or labels.

**Visual check:** the centre and lower third are clear; the framing is edge-biased; no faces.

### 8.21 Material atlas prompts

**POC status:** the 2026-11-01 `tile-bone-atlas.jpeg` and `tile-nerve-atlas.jpeg` are material swatches, not 32×32 frame atlases. They remain source-only/deferred; `tile.anatomy.atlas` is still the placeholder and `nerve-edge` still points to it. Do not treat these JPEGs as assembly-ready regions.

Ludo cannot output a named atlas. Generate **one seamless 1024×1024 material swatch concept per material**, pixel-clean it to a **512×512 working swatch** with 2×2 clusters, approve it at 32×32, then assemble the frames in Aseprite. The atlas is a post-process, not a single Ludo output. Keep the frame grid at **32×32**; do not switch to 16×16 frames.

#### `tile.bone.atlas` — 47-frame `blob47`

**Reference:** P1 for style/palette only; use the approved bone swatch for frame assembly after approval. **Style:** `STYLE_ATLAS`. **Frame:** `FRAME_ATLAS`. **Source/export:** 256×192 PNG, 8×6 grid, 32×32 frames, 2×2 clusters, opaque cells. **File:** `shared/tiles/bone-atlas.png`.

```text
SUBJECT: A seamless pixel-art bone-material texture swatch for a side-view platformer: the hard outer surface of bone, like wet chalky stone. Bone cream and bone shadow, deep teal in the pores, fine mineral grit, subtle pores and grime, broad soft mottling. No large cracks, no embedded objects, no symbols, no labels, no grid, no border. Uniform flat lighting, no directional highlight, no baked edge shading, no vignette, no bevel, no drop shadow. Orthographic surface; every colour block at least 2×2 pixels; tile seamlessly on all four edges at 32×32. Pixel-clean to a 512×512 working swatch.

Pixel-art seamless material texture for a side-view platformer set inside a living human body. Native pixel grid, hard square pixels, every colour block at least 2×2 pixels, no anti-aliasing, no smoothing. Flat fills from three-step ramps; 50% dither. Uniform flat lighting; orthographic surface, seamless material swatch. Gross-cute biology, wry deadpan tone, 12+ friendly. The material reads as one coherent surface; no characters or scene.

Palette ramps: teal #05090b #101a20 #1d2f38; bone #c9b79a #f2e8d5 #fff8e8; bone shadow #5f736e #7a8f8a #9db4ad; nerve #b8862b #ffd166 #fff3b0; joint #3f9fb5 #7bdff2 #c9f7ff; muscle #a82a4a #ef476f #ff9fb2; sage #6f847d #9db4ad #c4d4ce; ink #000000 #05090b #2a3f47. Use only these ramp steps; no intermediate blends, no unapproved orange.

1024×1024 seamless material swatch concept, uniform flat lighting, no grid, no labels, no frame, no directional highlight, no baked edge. Hard pixel edges; every colour block at least 2×2 pixels. Pixel-clean to a 512×512 working swatch; assemble 32×32 frames offline.
```

**Negative:** `NEGATIVE_ATLAS`.

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
- The swatch reads as wet chalky bone, not generic stone or a diagram.
- 256×192, opaque, 2×2 clusters, ≤80 KB.
- The runtime tint decision in §8.21.1 is applied and checked.

#### `tile.nerve.atlas` — 16-frame `edge`

**Reference:** P1 for style/palette only; use the approved nerve swatch for frame assembly after approval. **Style:** `STYLE_ATLAS`. **Frame:** `FRAME_ATLAS`. **Source/export:** 128×128 PNG, 4×4 grid, 32×32 frames, 2×2 clusters, opaque cells. **File:** `shared/tiles/nerve-atlas.png`.

```text
SUBJECT: A seamless pixel-art nerve-material texture swatch for a side-view platformer: bundles of pale wet nerve fibres, like bundled cables or wires. Nerve yellow and sage, joint-cyan edge sheen, fine fibrous grain, subtle pores and grime, broad soft mottling. No large cracks, no embedded objects, no symbols, no labels, no grid, no border. Uniform flat lighting, no directional highlight, no baked edge shading, no vignette, no bevel, no drop shadow. Orthographic surface; every colour block at least 2×2 pixels; tile seamlessly on all four edges at 32×32. Pixel-clean to a 512×512 working swatch.

Pixel-art seamless material texture for a side-view platformer set inside a living human body. Native pixel grid, hard square pixels, every colour block at least 2×2 pixels, no anti-aliasing, no smoothing. Flat fills from three-step ramps; 50% dither. Uniform flat lighting; orthographic surface, seamless material swatch. Gross-cute biology, wry deadpan tone, 12+ friendly. The material reads as one coherent surface; no characters or scene.

Palette ramps: teal #05090b #101a20 #1d2f38; bone #c9b79a #f2e8d5 #fff8e8; bone shadow #5f736e #7a8f8a #9db4ad; nerve #b8862b #ffd166 #fff3b0; joint #3f9fb5 #7bdff2 #c9f7ff; muscle #a82a4a #ef476f #ff9fb2; sage #6f847d #9db4ad #c4d4ce; ink #000000 #05090b #2a3f47. Use only these ramp steps; no intermediate blends, no unapproved orange.

1024×1024 seamless material swatch concept, uniform flat lighting, no grid, no labels, no frame, no directional highlight, no baked edge. Hard pixel edges; every colour block at least 2×2 pixels. Pixel-clean to a 512×512 working swatch; assemble 32×32 frames offline.
```

**Negative:** `NEGATIVE_ATLAS`.

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
- The swatch reads as bundles of pale wet cables, not spaghetti or a diagram.
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

**POC status:** the source was keyed and fitted at 16×16 with a 1 px margin (`fit.badge.config.json`). The helmet dome collapses into the ring; only an amber visor block reads. Keep `ui.icon.badge` as the CSS placeholder. Final art requires a dedicated 16×16 pixel pass.

#### `ui.icon.badge`

**Reference:** `style-anchor-p1.png` for style/palette only. **Style:** `STYLE_BADGE`. **Frame:** `FRAME_BADGE_CONCEPT`. **Export:** 16×16 PNG, alpha. **File:** `shared/ui/badge.png`. **Display:** current ~45×27 CSS px pill with `cover`; pixel-UI target 32×32.

```text
SUBJECT: A pixel-art mission-patch emblem: a tiny astronaut helmet with a warm amber visor inside a broken ring of pale cable-like fibres and bone plates. Bone cream, deep teal, nerve yellow and joint cyan; bold shapes; one hard shadow; simple enough to read when small. Centred composition; keep the helmet and visor inside the middle 60% vertical band; the outer ring may crop. No text, no logo, no scene.

Pixel-art game emblem for a dark-teal HUD. Native pixel grid, hard square pixels, 1px dark outline, no anti-aliasing, no smoothing. Flat fills from three-step ramps; one hard form shadow; one warm highlight; subtle grime. Gross-cute biology, wry deadpan tone, 12+ friendly. Simple, bold, readable at 32×32 and in a ~45×27 pill crop.

Palette ramps: teal #05090b #101a20 #1d2f38; bone #c9b79a #f2e8d5 #fff8e8; bone shadow #5f736e #7a8f8a #9db4ad; nerve #b8862b #ffd166 #fff3b0; joint #3f9fb5 #7bdff2 #c9f7ff; muscle #a82a4a #ef476f #ff9fb2; sage #6f847d #9db4ad #c4d4ce; ink #000000 #05090b #2a3f47. Use only these ramp steps; no intermediate blends, no unapproved orange.

Centred emblem, large and clear, flat magenta #FF00FF background, no rectangular frame. Keep the helmet and visor inside the middle 60% vertical band; the outer ring may crop. Hard pixel edges; no anti-aliasing.
```

**Negative:** NEGATIVE_BADGE + character scene, labels, rectangular frame.

**Acceptance**

- At the ~45×27 pill crop, the helmet and amber visor read; the ring may be cropped.
- At the 32×32 pixel-UI target, the emblem reads with hard pixel edges.
- The emblem is a helmet and ring, not a full character; no body or scene.
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

Every generated asset gets a row using the template in §10.3. At minimum record: `promptVersion`, `styleVersion`, asset ID, subject block, anatomy in plain shapes, visual analogy, reference, negative block and negative delta, model/seed, aspect/export, variations, chosen file, pixel cleanup, palette, grid check, runtime check, verdict and licence.

If an asset is retried, keep the failed row and add a new row. Do not overwrite history; the log is the evidence for the AI-generated asset record.

### 8.25 Prompt dependencies and visual do-not-claim guard

Prompts that depend on a decision or missing reference:

- **Atlas prompts** depend on the two-atlas wiring and tint decision in §8.21.1.
- **`sprite.scan.reflex`** has no authored room; it is a reserve and may remain placeholder.
- **04's Muscle Effector agent** reuses `sprite.agent.neuron`; finalizing the Neuron Keeper changes 04's placeholder agent. This is an open decision, not a prompt error.
- **`audio.cue.wrong`** is outside the 32-asset total; adding it makes 33.
- **Badge** depends on accepting the ~45×27 pill crop and the 32×32 pixel-UI target.
- **`sprite.gate.nerve`** is used by 04 but remains placeholder; do not generate it in M3.
- **Vault visual anchors:** `DESIGN.md`, `learning-design-brief.md` and the NERV cards were not readable when this revision was written because `docs/shrinkonauts` points to an unavailable macOS path. The prompts use §4, §4.10 and `anatomy-fidelity.md`; re-check the vault copies before final visual sign-off.

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

**Visual fidelity guard.** Do not draw any of these either:

- a humanoid Neuron Keeper, robe, hood, legs, boots, or human hands;
- dendrites as hair or fur, or a fluffy/furry cell;
- a second axon/tail, or myelin on the Neuron Keeper character;
- a brain-shaped neuron, or a generic animal cell with organelles;
- scan targets with faces, eyes, arms or a lantern;
- a synapse where the two cells touch, or vesicles floating in the cleft;
- a muscle spindle drawn as a joint capsule or a pain receptor;
- a textbook cutaway, labels or diagram lines in a background.

The art can be weird and fleshy, but it must stay inside the fidelity ledger and the 12+ tone guard.

---

## 9. Acceptance criteria

### 9.1 Per-category acceptance

| Category | Must pass |
|---|---|
| Players | 14×22 source, 28×44 display; 2× grid; P1 bone suit/amber visor/yellow tanks/cyan accents; P2 bone suit/cyan visor/cyan tanks/amber accent; P1/P2 share silhouette, cell, origin, and clip names; helmet, backpack and boots readable; feet at baseline; no anti-aliasing; no baked shadow; POC walk/jump/fall/land clips play |
| Entities | 18×18 source, 36×36 display; 2× grid; silhouette distinct from every other entity; base at the bottom padding line; survives the warm interaction tint; no text; no baked shadow; the subject-first prompt and its biology check pass (Neuron Keeper: one cell body, one nucleus, 5–7 dendrite tentacles, one bare axon, forked terminals; scan targets: no face or character pose); the Neuron Keeper idle sheet reads at 36×36 and its static frame 0 remains the reduced-motion fallback |
| Backgrounds | Current POC: sky only, 640×368 displayed at an exact integer 2×, HUD contrast at 1280×720, no checkerboard. If far/mid/near are later wired, they must tile without seams at 2×2 on **both axes**; the near layer must leave the centre and lower third transparent. The body reads as a landscape, not a textbook cutaway; no labels or diagram lines |
| Material atlas | When wired: bone has 47 `blob47` frames, nerve has 16 `edge` frames; every 32×32 frame is authored at 1:1 with a 2×2 cluster grid and tiles on all four sides; mask variants are visually distinct; no text or baked directional edge; tint path checked; the swatch reads as wet chalky bone or bundled wet cables, not a diagram. The current pack keeps the placeholder atlas |
| Badge | Target: 16×16 source reads in the ~45×27 HUD pill and at the 32×32 pixel-UI target; no text; central composition; works on dark teal. The current source remains placeholder after the audit |
| UI | Pixel font at integer sizes (12 px labels minimum, 15–16 px body); square chrome; no radius, blur, or soft shadow; material/pattern slots use the same ramps; focus visible; text scale works |
| Audio | Duration inside the cue window; short, dry, no long tail; no audio-only cue; no gore; no music |

### 9.2 Style consistency

- Same 2× pixel density across players, entities, sky, and badge; parallax and atlas frames use 2×2 minimum clusters.
- Same 1 px source outline weight; no asset suddenly uses a 2 px or 0 px outline.
- Same ramp palette; no purple/neon drift and no intermediate blends.
- Orange is reserved and unused; P2 uses bone, joint cyan, and nerve amber.
- Same level of detail; no asset is suddenly painterly, 3D, or faux-pixel with mixed sizes.
- Same tone: gross-cute, not edgy.
- Same camera language: side or slight 3/4 for characters; orthographic for backgrounds.
- Same prompt language: the first sentence names the subject and core silhouette; every anatomical term follows a visual noun; the limb budget is explicit.
- Neuron characters and scan targets keep the §4.10 grammar: tentacles for dendrites, a bare tail for the axon, sleeves and gaps for myelin, sockets for receptors. No hair, fur, humanoid body or second axon.
- Material frames share the world’s material/pattern language; UI panels use the same ramps and dither.
- All assets pass the “same game” test on one contact sheet.

### 9.3 Technical QA

- Correct source size: 14×22 player, 18×18 entity, 640×368 sky, 1024×512 parallax, 512×512 material swatch, 256×192 or 128×128 atlas, 16×16 badge.
- Display lands on exact 2× for players, entities, sky, and badge; parallax tiles 1:1 with 2×2 clusters; atlas frames 1:1 with 2×2 clusters.
- No anti-aliasing, blur, or fractional scaling.
- Palette is quantised to the ramp table; no stray colours. Orange is unused.
- The P1→P2 pixel diff touches only the visor/tank and accent masks; suit, joints, outline, and grime stay on their approved ramps.
- The P2 joint-cyan visor and tanks read against the bone suit at 28×44.
- Player animation sheets are 14×22 frames, alpha 0/255, and within the per-clip budget.
- The Neuron Keeper idle sheet is 36 frames of 18×18, alpha 0/255, within the per-clip budget, and its manifest frame count/fps/loop match the image.
- The Neuron Keeper static frame 0 is the fallback; reduced motion keeps the static frame and does not start the sheet.
- The walk loop, jump one-shot, fall loop, and land one-shot use the manifest fps/loop values.
- Alpha is clean at 400%; no magenta fringe; no semi-transparent sprite edges.
- No JPG or lossy WebP for pixel assets.
- File size within budget.
- File names match the asset register.
- No raw Ludo sheet is referenced by a manifest or served from `public/`.
- No text, logo, watermark, border, or checkerboard.
- The Ludo prompt starts with `SUBJECT`; style, palette and frame follow it.
- Every anatomical term in a positive prompt has a visual analogue; no bare “soma”, “dendrite”, “myelin” or “presynaptic” appears without one.
- The Ludo concept prompt does not contain the 14×22/18×18 export grid; the export frame is recorded separately.
- Each cell, scan, prop and background asset has a `NEGATIVE DELTA` that covers its likely failure mode (humanoid, fur, extra tail, face on a scan, textbook diagram, and so on).
- Player/entity origins and paddings are consistent.
- The current 03 sky displays at exact 2× cover with no checkerboard; any future far/mid/near layer must pass the both-axis 2×2 seam check.
- If the atlas task is taken, region names and coordinates match §8.21 and every frame passes the 3×3 edge check.
- If the atlas task is taken, the tint path is recorded and matches the rendered result.
- The badge remains the CSS placeholder until a dedicated 16×16 pass reads in the ~45×27 pill and 32×32 target.
- Entity sprites survive the warm interaction tint.
- The prompt log is complete for every accepted asset.

### 9.4 Content QA

- No blood, gore, open wounds, viscera, or shock imagery.
- No religious, sexual, or toilet humour.
- No copied characters or copyrighted props.
- No labels or arrows baked into the art.
- The body reads as a place, not a textbook diagram.
- The Neuron Keeper reads as a single cell creature, not a furry humanoid; scan targets read as flat icons, not characters.
- The 12+ audience is respected.

### 9.5 Manifest and validator

- `assets.final.json` has real `src` paths for all integrated runtime images: players, POC sheets, Neuron Keeper, the readable scan/entity sprites, and the sky. `sprite.scan.reflex` remains a declared reserve; `sprite.exit`, `ui.icon.badge`, `tile.anatomy.atlas`, and the three 03 far/mid/near layers remain declared placeholders/source-only.
- The current placeholder atlas entry declares `type: "atlas"`, intrinsic `width`/`height`, named `regions`, and every current variant-set frame/fallback resolves.
- When the two final atlases are wired, they must use the region maps in §8.21; the bone `blob47` variant set and the nerve `edge` repoint remain future work.
- `materials.json` parses, every palette token exists in `theme.json`, and tile/background/UI/entity references resolve.
- The atlas tint decision in §8.21.1 remains open; no final atlas is double-tinted.
- Each non-placeholder entry has a matching licence label in `licenses.json`.
- Each entity `idleAnimation` resolves to a `sheet` entry with `frames` and `fps`; a placeholder animation produces a validator warning and the runtime stays static.
- `sprite.agent.neuron.idle` has a matching licence entry and is preloaded by `pack:smoke`.
- Silkscreen and Pixelify Sans are bundled locally (no CDN) and recorded in the licence log.
- `npm run pack:validate` passes.
- `npm run pack:smoke` still passes.
- `?assets=final` loads the final manifest.
- No unresolved asset remains in the current POC: 03 wires the sky only, declared reserves (`sprite.scan.reflex`, `sprite.exit`) and the CSS badge placeholder are intentional, 04 environment placeholders remain out of scope, and the deferred far/mid/near layers are not referenced by the room.

### 9.6 Sign-off checklist

- [ ] Six-asset pixel style gate passes.
- [ ] Subject-first prompt gate: Neuron Keeper and `scan.neuron` each pass 4 variations at 36×36 with the §4.10 biology-to-shape grammar.
- [x] P1 idle master and P2 approved source sheets exist; POC runtime masters are 14×22 / 28×44.
- [x] P1/P2 POC idle, walk, jump, fall, and land sheets generated and integrated in `03-nerve-forest`.
- [x] Background keying tool (`npm run art:key`) and nanobanan review copies generated.
- [x] Entity fit tool (`npm run art:fit`) and POC entity fit reports generated.
- [x] Neuron Keeper static + 36-frame idle sheet generated and integrated in 03/04.
- [x] 2026-11-01 nanobanan batch keyed, fitted, and wired for the readable entity IDs; 03 sky-only background integrated. Final art approval remains pending.
- [ ] P1 walk/jump and P2 animation final art approval pending.
- [ ] Neuron Keeper approved (POC static + idle integrated; final art approval pending).
- [ ] Four visible scan targets approved; `sprite.scan.reflex` reserve is optional. (POC integrated: `scan.synapse`, `scan.muscle`; placeholders: `scan.neuron`, `scan.pathway`; final approval pending.)
- [ ] Gate, props and receptors approved. (POC integrated: `gate.ferry`, `prop.tracer`, `pulse.terminal`, both receptors; `sprite.exit` remains placeholder; final approval pending.)
- [ ] Sky approved. (Sky POC integrated in 03; far/mid/near source-only/deferred and not part of the current capture.)
- [ ] Bone and nerve atlases approved; region maps, 2×2 clusters and tint path checked. (Swatches only; atlas deferred.)
- [ ] Badge approved at the pill crop and the 32×32 pixel-UI target. (16×16 audit rejected; CSS placeholder retained.)
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

Player animation entries use `type: "sheet"` with `frameWidth`, `frameHeight`,
`frames`, `fps`, `loop`, and `anchor`; see `assets.final.json` for the POC set.

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
| Prompt version | `m3-2026-10-31.2` |
| Style version | `style-pixel-v2` / `STYLE_SPRITE` |
| Asset ID | `sprite.agent.neuron` |
| Subject block | `SUBJECT: One single neuron cell creature...` |
| Anatomy in plain shapes | `the round body is the soma; the six tentacles are the dendrites; the one tail is the axon` |
| Visual analogy | `sea-anemone crown for dendrites; tadpole tail for axon` |
| Prompt order | `SUBJECT → STYLE → PALETTE → FRAME` |
| Category | sprite / background / parallax / atlas / badge / audio |
| Tool and plan | Ludo.ai / Indie |
| Model and seed | Ludo image model; seed `123456` |
| Reference | `style-anchor-p1.png` for style/palette only |
| Negative block | `NEGATIVE_SPRITE` |
| Negative delta | `humanoid body, fur, hair, extra tails, myelin on the character` |
| Prompt | Full positive prompt text, subject first |
| Frame block | `FRAME_ENTITY_CONCEPT` / `FRAME_SHEET_PLAYER` |
| Export frame | `FRAME_ENTITY` (Aseprite/Piskel only) |
| Source sheet | `art-source/characters/player-p1/ludo/walk-49f.../sheet.png` |
| Frame range | `all` / `0-11` / `frame 0` |
| Variant of | `player-p2` uses its own approved source sheets (ADR-0065); other colour variants may derive from `player-p1` |
| Palette map | `working/palette.json`; `working/variants/p2.json` |
| Aspect and export | 1:1 / 18×18 source; 36×36 display |
| Variations | 4 for a single image; one sheet per action |
| Chosen file | `shared/sprites/agent-neuron.png` |
| Runtime export | `public/packs/.../shared/sprites/player-p1.png` |
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
| m3-2026-10-31.2 | style-pixel-v2 | asset.id | subject-block | anatomy-plain-shapes | visual-analogy | subject→style→palette→frame | category | Ludo/Indie | model/seed | reference | negative-block | negative-delta | prompt | frame-block | export-frame | source-sheet | frame-range | variant-of | palette-map | aspect/export | variations | chosen-file | runtime-export | date | pixel-cleanup | grid-check | post-process | runtime-check | verdict | licence | notes |
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

The two atlas swatches are counted in the 21 images; assembling 47 + 16 frames consumes no image credits. A source-sheet generation counts as one image generation regardless of frame count; record the actual credits in the prompt log. The 21-image assumption covers asset families, not individual sheet frames.

Ludo Indie includes **250 credits/month** for **$20**. This is enough. Buy extra credits only if the scope expands or the concept gate needs heavy iteration.

**Do not buy Pro ($50/mo) for M3** unless:

- you need API/MCP/CLI automation;
- content expands beyond ~100 images;
- you decide to produce many animated sheets beyond the POC player set.

### 11.2 Work order

| Stage | Work |
|---|---|
| 1 | Six-asset pixel gate; approve P1 at 14×22 / 28×44; lock palette ramps |
| 1b | Subject-first prompt pilot: 4 variations of Neuron Keeper and `scan.neuron`; check the §4.10 biology-to-shape grammar and negative delta at 36×36 |
| 2 | Batch 1: P2 (approved sheets), Neuron Keeper, `scan.neuron`, exit; pixel-clean each |
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
| Ludo draws a generic furry/humanoid creature instead of a cell | Use the subject-first prompt + §4.10 lexicon; keep “hair”, “fur” and humanoid role names out of the positive prompt; add the asset negative delta |
| Ludo sheet frames jitter or change proportions | Slice via the Ludo JSON; align every frame to a common baseline/bbox; drop bad frames; resample to 6–10 key frames |
| Source sheet is shipped by mistake | Keep `art-source/` out of `public/`; validate that manifests never reference raw source paths |
| Palette variant drifts from the base | LUT diff test; only the mapped suit/visor/tank/accent masks may change; joints, outline, and grime stay byte-identical |
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
| 04 shows a neuron as the Muscle Effector agent | Accept as an M3 placeholder mismatch or add a 04 agent ID later; do not change the 03 art to compensate. The shared keeper now animates in both rooms. |
| Puzzle prop art invalidated by room changes | Check gate/tracer/pulse/receptor art against the authored rooms; re-baseline §5.3 |
| Credits exhausted | Indie 250 is enough; top up rather than upgrade |
| Free-tier watermark | Free tier for the concept gate only; paid Indie for finals |
| Player animation path is too rough | The POC ships the downscale path; the semantic remaster remains available and the final art approval is still pending |
| Neuron Keeper idle sheet jitters or loses the lantern at 18×18 | Use the same player downscale path; inspect the 8× GIF at 36×36 and keep the static fallback |
| Wide scan plates lose the silhouette or scan rim | Keep the placeholder; the fit report records the fitted size, palette and missing joint-ramp pixels. Do not stretch |
| Entity idle animation grows into a generalized system | The POC is one data-driven idle sheet (`idleAnimation`); ADR-0062 remains deferred |

---

## 12. Future levels

### 12.1 Level kit template

When a level is authored, validated, and in the capture list, instantiate:

- 4 background layers: 640×368 sky, 1024×512 far/mid/near with 2×2 clusters
- 1 material atlas per authored material (32×32 frames at 1:1 with 2×2 clusters, or a shared atlas with named regions)
- 1 agent character: 18×18 source, 36×36 display; use the §4.10 biology-to-shape grammar
- 3–5 scan targets: 18×18 source; flat icons, no faces or character pose
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
- [x] Adopt source/working/runtime asset layers (ADR-0060).
- [x] Adopt palette-LUT colour variants; colour-only changes are not Ludo generations (ADR-0061).
- [x] Adopt data-driven animation and build-time previews as the target architecture (ADR-0062–0063); a POC player and Neuron Keeper idle path is implemented.
- [x] Use three-step palette ramps; the nine families stay, with Orange reserved and unused (ADR-0065).
- [x] Use Silkscreen + Pixelify Sans as the bundled UI fonts.
- [x] Adopt subject-first prompt language and the §4.10 biology-to-shape lexicon (`m3-2026-10-31.2`).
- [x] M3 environment art target = `03-nerve-forest`; 04 environment stays placeholder. Shared entity sprites are POC-integrated because both rooms reference them; final art approval is pending.
- [x] P1 uses a bone suit, amber visor, nerve-yellow tanks, and joint-cyan accents; P2 uses a bone suit, joint-cyan visor/tanks, and nerve-amber accent (ADR-0065).
- [x] P2 uses the approved `art-source/characters/player-p2/` walk/jump sheets for the POC; no orange regeneration.
- [x] POC player animation and the Neuron Keeper idle are implemented; generalized entity animation and the ADR-0062 descriptor remain future work.
- [x] The POC uses animated P1/P2 in `03-nerve-forest`; frame 0 remains the idle fallback.
- [x] Ludo Indie ($20/mo), not Pro.
- [x] Skip the eight deferred UI images; badge only.
- [x] 21 declared images = 18 active (17 referenced by authored rooms + 1 reserve `sprite.scan.reflex`) + 3 source-only/deferred 03 backgrounds.
- [x] 11 M3 audio cues; `audio.cue.wrong` stays placeholder.
- [x] 03 uses a sky-only POC background; far/mid/near remain source-only/deferred because the supplied 16:9 scenes do not meet the tile contract.
- [x] POC-integrate the nanobanan gate, tracer, pulse terminal, and triangle/circle receptors through the existing IDs; final approval pending.
- [x] Keep `sprite.scan.reflex` as a reserve placeholder; the roots/spindle do not read at 36×36.
- [x] Keep `ui.icon.badge` as a CSS placeholder after the 16×16 audit.
- [x] Keep the new bone/nerve material swatches source-only; no atlas wiring.
- [ ] Approve the two final atlas IDs (`tile.bone.atlas`, `tile.nerve.atlas`), the region maps in §8.21, the `bone-blob47` variant set, and the `nerve-edge` repoint.
- [ ] Choose the atlas tint path: remove the bone/nerve `tint` and author final colours, or keep the tint and author neutral-light atlases.
- [ ] Accept 04's Muscle Effector agent reusing `sprite.agent.neuron`, or add a 04-specific agent ID in a later content task. The M3 POC uses the shared static + idle sheet; no 04-specific ID was added.
- [ ] Approve the Neuron Keeper idle sheet and frame 0 as the final static; the nanobanan agent plate is an alternate review asset.
- [ ] Decide whether to redraw `sprite.scan.neuron` and `sprite.scan.pathway` at 18×18 or keep their placeholders.
- [ ] Add `audio.cue.wrong` as a 12th cue (33 total) or keep it placeholder.
- [ ] Approve the final 16×16 badge art when a dedicated pixel pass reads at the pill/32×32 target.
- [x] Confirm `sprite.gate.nerve` and `sprite.checkpoint` remain placeholders.
- [x] Check the authored 03/04 rooms before generating puzzle props; §5.3 is aligned with the current rooms.

---

## 14. References

- [`background-asset-requirements-v01.md`](background-asset-requirements-v01.md) — dedicated sky/far/mid/near prompts, `#FF00FF` key workflow and background acceptance.
- [`adr-m3/0047-pixel-art-visual-direction.md`](../adr-m3/0047-pixel-art-visual-direction.md) — whole-game pixel-art direction.
- [`adr-m3/0048-half-resolution-pixel-rendering.md`](../adr-m3/0048-half-resolution-pixel-rendering.md) — half-res authoring and 2× display.
- [`adr-m3/0049-pixel-ui-chrome-and-typography.md`](../adr-m3/0049-pixel-ui-chrome-and-typography.md) — pixel UI and fonts.
- [`adr-art-pipeline/0060-source-work-runtime-asset-layers.md`](../adr-art-pipeline/adr-0060-source-work-runtime-asset-layers.md) — source/working/runtime layers and normalization.
- [`adr-art-pipeline/0061-palette-lut-sprite-variants.md`](../adr-art-pipeline/adr-0061-palette-lut-sprite-variants.md) — palette-LUT colour variants.
- [`adr-art-pipeline/0062-data-driven-sprite-animation.md`](../adr-art-pipeline/adr-0062-data-driven-sprite-animation.md) — data-driven animation and runtime state machine.
- [`adr-art-pipeline/0063-build-time-animation-previews.md`](../adr-art-pipeline/adr-0063-build-time-animation-previews.md) — build-time GIF/contact-sheet previews.
- [`adr-art-pipeline/0064-orange-p2-suit-palette-swap.md`](../adr-art-pipeline/adr-0064-orange-p2-suit-palette-swap.md) — superseded orange P2 record.
- [`adr-art-pipeline/0065-p2-bone-suit-joint-visor.md`](../adr-art-pipeline/adr-0065-p2-bone-suit-joint-visor.md) — P2 bone suit and joint-cyan visor.
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
| 2026-10-31 | Source-sheet and palette-variant alignment: ADR-0060–0064; sheet prompts and slicing workflow; P2 orange-suit/bone-visor palette permutation; LUT diff checks; prompt-log provenance fields; prompt version `m3-2026-10-31.1`. |
| 2026-10-31 | Subject-first prompt pass and biology-to-shape lexicon: added §4.10; rewrote all visual prompts with visual nouns before anatomical terms; added anatomy-in-plain-shapes lines, negative deltas, biology/visual checks and a visual fidelity guard; split concept and export frames; moved the palette and negatives out of the subject position; prompt/style versions bumped to `m3-2026-10-31.2` / `style-pixel-v2`. |
| 2026-11-01 | P2 re-baseline and POC animation: ADR-0065 supersedes the orange P2 concept; P2 uses bone suit/joint-cyan visor/tank/nerve accent. Added `npm run art:build-player`, `npm run art:key`, P1/P2 walk/jump/fall/land runtime sheets, and the player animator. Added §5.8 completion status and updated the manifest, acceptance, and open-decision sections. |
| 2026-11-01 | Entity POC: added `npm run art:fit` with configurable 18×18 fit, 1 px margin, hard alpha, non-orange palette quantisation, preview/report output, and tests. Fitted the nanobanan scan plates: `scan.synapse` and `scan.muscle` are POC-integrated; `scan.neuron` and `scan.pathway` remain placeholders because the wide plates lose their reading at 36×36. Added the 36-frame Neuron Keeper idle source and `sprite.agent.neuron.idle`, regenerated the static from frame 0, and wired a data-driven entity idle in 03/04. The nanobanan agent plate is an alternate review asset. Status is POC integrated / final art approval pending. |
| 2026-11-01 | Nanobanan batch: POC-integrated `sprite.gate.ferry`, `sprite.prop.tracer`, `sprite.pulse.terminal`, `sprite.receptor.triangle`, and `sprite.receptor.circle` through the existing IDs. Added the sky-only 03 background (`shared/backgrounds/nerve-forest-sky.webp`) and removed far/mid/near from the room; those layers remain source-only/deferred. The badge and reflex plate stay placeholders after review; the bone/nerve swatches are source-only and the atlas task remains deferred. Final approval and the prompt log remain pending. |
| 2026-11-01 | Background regeneration spec: added [`background-asset-requirements-v01.md`](background-asset-requirements-v01.md) with the corrected sky/far/mid/near prompts, flat `#FF00FF` cut-out contract, no-trim key workflow, coverage/value budgets and background acceptance. Current scope unchanged: sky wired; far/mid/near source-only/deferred. Prompt version `m3-2026-11-01.1`. |

---

**End of document.**
