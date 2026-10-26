# Shrinkonauts M0.1 — Implementation Notes

M0.1 is a playable vertical slice of the foundation: one room, two local players,
a shared camera, four parallax background layers, a DOM HUD, and an asset system
that can swap placeholder art for fixtures through a query parameter.

Everything in this milestone is deliberately small. The goal is to prove the
seams — module boundaries, logical asset IDs, the provider chain, and the fixed
step — not to build content.

## Status

| Area | State |
| --- | --- |
| Room boot | Working |
| Two local players, move + jump | Working |
| Shared camera | Working |
| Four parallax layers | Working |
| CSS HUD + theme tokens | Working |
| Asset ID provider chain | Working |
| Fixture hot-swap at boot | Working |
| Audio playback | Not in M0.1 (IDs resolve, nothing plays) |
| Live reload without restart | Not in M0.1 (`invalidate()` exists, not wired) |
| Full pack/syllabus loading | Deferred to M1 |

## Commands

Run from `shrinkonauts/`:

```bash
npm install
npm run dev        # http://127.0.0.1:5173/
npm test           # 24 unit/integration tests
npm run smoke      # room boot + module boundary tests
npm run build      # tsc --noEmit + Vite production build
npm run preview    # serve dist/
```

Asset modes:

```text
http://127.0.0.1:5173/                  # procedural placeholders
http://127.0.0.1:5173/?assets=fixture   # fixture overrides for 3 IDs
http://127.0.0.1:5173/?assets=final     # final manifest (all entries are placeholders in M0.1)
```

Unknown `?assets=` values fall back to `placeholder`, so a typo never produces a
blank screen.

## Architecture

```text
platform ──> game ──> assets
                  ├─> pack
                  ├─> ui
                  └─> world ──> assets, pack
```

| Module | Responsibility | May import |
| --- | --- | --- |
| `core` | `Result`, logger, event bus | — |
| `assets` | Logical IDs, manifests, provider chain, preload plan, validation | `core` |
| `pack` | Room/theme schemas, loaders, asset ID collection | `assets`, `core` |
| `world` | Phaser scene, simulation, rendering, input | `assets`, `core`, `pack` |
| `ui` | DOM HUD, theme-to-CSS variables, fatal/warning display | `assets`, `core`, `pack` |
| `game` | Boot orchestration and asset-mode selection | `assets`, `core`, `pack`, `ui`, `world` |
| `platform` | Browser entry point | `core`, `game`, `ui` |

Two boundary rules are enforced by `tests/boundaries.test.ts`:

1. Phaser imports appear only under `src/world/`.
2. Module imports follow the acyclic graph above. In particular, `ui` must not
   import `game` or `world`, and `assets` must not import Phaser, DOM, or media
   paths.

`game/boot.ts` contains no rendering code. It loads content and manifests,
constructs the asset module, builds the preload plan, updates the HUD, and hands
the scene to `world/createGame.ts`.

## Asset pipeline

### IDs

Content refers to media only through logical IDs. Prefix inference lives in
`src/assets/types.ts`:

| Prefix | Category |
| --- | --- |
| `sprite.` | sprite |
| `bg.`, `ui.`, `tileset.` | image |
| `audio.` | audio |
| `font.` | font |

The ten IDs used by the dev room are:

```text
sprite.player.p1        sprite.player.p2
bg.placeholder.sky      bg.placeholder.far
bg.placeholder.mid      bg.placeholder.near
tileset.placeholder     ui.icon.badge
audio.cue.jump          audio.cue.land
```

### Provider chain

`DefaultAssetsModule` resolves each ID in order:

1. **Final manifest** — shipped art/audio.
2. **Pack/fixture manifest** — current level pack or the M0.1 fixture.
3. **Placeholder provider** — procedural descriptor generated from the theme.

An explicit `"placeholder": true` entry in the final manifest is treated as “no
final file yet”; it does not stop the chain, so a fixture can still override it.
That is how `?assets=fixture` replaces three IDs while the other seven remain
procedural.

The placeholder provider never guesses file paths. It returns typed specs
(`shape`, `gradient`, `tile`, `css`, `font`, `silent`, `synth`). `world` renders
the visual kinds to canvas textures; `ui` renders CSS kinds directly.

`assets.preload(ids)` deduplicates IDs and returns the ordered descriptors plus
lists of placeholders, missing IDs, and warnings. `world/RoomScene.preload()`
loads only descriptors that have a real `src`; placeholders are generated at
render time.

### Validation and failures

- Manifest parsing rejects unknown schema majors, unsupported asset types,
  missing sheet frame metadata, and cross-origin sources.
- `preload()` reports IDs with unknown prefixes as `missing`; boot fails with
  `ASSET_IDS_UNRESOLVED` rather than silently rendering nothing.
- `assets.validate()` returns issue codes such as `ASSET_MANIFEST_INVALID`,
  `ASSET_FILE_MISSING`, and `ASSET_ID_INVALID`.
- A failed file load (for example, a broken fixture) emits a HUD warning and the
  renderer falls back to the procedural placeholder for that ID.

## Content

`public/content/dev/` holds the only content needed to boot:

| File | Purpose |
| --- | --- |
| `room.json` | 60 × 34 tiles at 32 px; tile rows, four background layers, spawns |
| `theme.json` | Palette, fonts, UI tokens, UI asset IDs, audio cue IDs |
| `assets.final.json` | All ten final IDs, each marked `placeholder: true` |
| `assets.fixture.json` | Overrides for both players and `bg.placeholder.near` |
| `fixtures/*.svg` | Test-only art, clearly labeled “not shipped content” |

The background stack uses independent layers with scroll factors 0, 0.08, 0.18,
and 0.32, at depths −100 to −70. Each layer is a separate image, so a production
layer can replace one ID without touching the room document.

## Simulation

`src/world/simulation.ts` is pure TypeScript and has no Phaser dependency, which
is why it is directly testable in Node.

- Fixed step: 1/60 s. The scene accumulates frame time, clamps a frame to 0.25 s,
  and clamps each simulation step to 0.05 s.
- Player body: 28 × 44 px. Move speed 260 px/s, jump 620 px/s, gravity 1900
  px/s², terminal fall 1200 px/s.
- Collision: axis-aligned tile solids from `#` cells; horizontal resolution
  before vertical; ground and ceiling detection.
- Respawn: a player more than 160 px below the room returns to their spawn.
- Camera: target is the average player position (biased 40 px upward), smoothed
  at 8/s and clamped to the room's pixel bounds.
- State is plain data (`PlayerState`, `CameraFrame`) with no engine objects, so a
  future save system can serialise it.

`src/world/input.ts` samples keyboard state into `Intents`; the scene clears jump
after the first fixed step of a frame so a held key cannot queue repeat jumps.

## Rendering

`RoomScene` creates, in order:

1. The layered background (`LayeredBackground`).
2. One image per `#` tile, depth 0.
3. A shadow ellipse and player image per player, depths 9 and 10.

Background layers are anchored around the initial camera view — not the room
centre — and cover with 1.4× bleed. With parallax factors below 1 and a camera
that starts scrolled down, anchoring to the room centre pushed the art out of
view; anchoring to the camera keeps the frame filled while still allowing
independent drift.

Textures are resolved per ID:

1. If a loaded file exists at `asset:<id>`, use it.
2. Otherwise generate the placeholder canvas texture.

SVG fixtures are loaded through Phaser's SVG loader. This keeps fixtures small
and diffable without adding a binary asset pipeline to M0.1.

The HUD is DOM, not canvas, per ADR-0019. `applyTheme()` maps the theme palette
and UI scale to CSS custom properties; components read only tokens. The HUD
reports room ID, mode, placeholder/override counts, each override with its
source, and any warnings. Boot failures replace the play area with a readable
fatal panel instead of a blank canvas.

## Tests

```text
tests/manifest.test.ts     6 tests   manifest parsing, URL resolution, rejection paths
tests/assets.test.ts       7 tests   provider order, placeholder fallback, caching, plans, validation
tests/room-boot.test.ts    7 tests   dev content, full ID coverage, fixture mode, simulation, camera
tests/boundaries.test.ts   4 tests   media-import ban, Phaser confinement, acyclic module graph
```

The boot test reads the real JSON from `public/content/dev/`, so a content or
manifest change that breaks asset resolution fails in CI-shaped `npm test` runs
without launching a browser.

## Screenshots

| File | Mode |
| --- | --- |
| `screenshots/m0.1-placeholder.png` | Default: 10 logical IDs, 10 placeholders |
| `screenshots/m0.1-fixture.png` | `?assets=fixture`: 10 logical IDs, 7 placeholders, 3 overrides |

Both were captured at 1280 × 720 from the Vite dev server.

## Deferred to M0.2 / M1

These are intentional seams, not missing internals:

| Deferred | Seam |
| --- | --- |
| Live asset reload preserving run state | `assets.invalidate()` is implemented and tested; no runtime subscription yet |
| Pack and syllabus loading | `game/boot.ts` loads one dev room directly; `pack` already has room/theme schemas |
| Dialogue, gates, curriculum, concept log | Not started |
| Sprite animation and state machines | Players are single images; manifest already supports `sheet` metadata |
| Audio playback and mixing | Cue IDs resolve to silent/synth placeholder specs; no Web Audio graph |
| Save/load | Simulation state is plain data, but no serialiser or storage adapter |
| Co-op tether, drop-in, capture mode | Not started |
| Validator CLI and full smoke pipeline | Tests cover resolution and boot contracts; no separate content validator binary |
| Final art and audio | `assets.final.json` is complete but every entry is marked placeholder |

## Decisions and deviations

- **`createGame` lives in `world`.** This confines every Phaser import to one
  module and keeps `game` engine-agnostic. `BootResult.game` is typed as the
  return type of `createGame`.
- **Standalone dev room instead of a level pack.** M0.1 needs a runnable room,
  not a syllabus. The room/theme documents use the same schemas a pack will use.
- **Fixture as the “pack” tier.** `?assets=fixture` loads
  `assets.fixture.json` as `packManifest`. This exercises the real middle tier
  instead of adding a special-case override path.
- **`?assets=final` still shows placeholders.** The final manifest exists and is
  complete, but no final files have been delivered.
- **Background anchoring.** Layers are positioned from the initial camera scroll
  with extra cover bleed; without this, a camera that starts low in the room
  pushed non-scrolling layers above the viewport.
- **Screenshots live at `screenshots/`,** never under the `docs/` symlink to the
  vault.
- **Bundle size.** Phaser ships as one chunk; `vite.config.ts` raises the warning
  limit rather than pretending code splitting exists. Splitting is a later
  performance task.

## Verification performed

```text
npx tsc --noEmit                 clean
npm test                         4 files, 24 tests passed
npm run build                    Vite production build succeeded
headless Chrome, default         "10 logical IDs · 10 placeholders", no fatal overlay
headless Chrome, fixture         "10 logical IDs · 7 placeholders · 3 overrides", fixture art visible
```

The repo has no backend, network calls, or save state. `npm run preview` serves
the same static build that would be deployed.
