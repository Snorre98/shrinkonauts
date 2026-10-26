# Shrinkonauts

A two-player co-op platformer about shrinking into the body. This repository is
the **M0.1 placeholder foundation**: one playable room with two local players, a
shared camera, four parallax background layers, and an asset-ID system with a
visible fixture swap.

No final art, audio, story, dialogue, gates, or curriculum content is included
yet. Everything renders from procedural placeholders until real assets arrive.

## Quick start

```bash
npm install
npm run dev
```

Open <http://127.0.0.1:5173/>.

```bash
npm test          # unit + boot/integration tests
npm run smoke     # room boot + boundary tests
npm run build     # type check and production build
npm run preview   # serve the production build
```

## Controls

| Player | Move | Jump |
| --- | --- | --- |
| P1 | `A` / `D` | `W` or `Space` |
| P2 | `←` / `→` | `↑` |

The camera follows both players and stays inside the room bounds. Falling out of
the room respawns that player at their spawn point.

## Asset modes

| URL | Behaviour |
| --- | --- |
| `/` | All ten logical IDs resolve to procedural placeholders |
| `/?assets=fixture` | `sprite.player.p1`, `sprite.player.p2`, and `bg.placeholder.near` use SVG test fixtures |
| `/?assets=final` | Final manifest selected; still placeholders until art is delivered |

Unknown values fall back to placeholder mode. The HUD reports the active mode,
the number of placeholders, and each override with its source.

## Project layout

```text
src/
  core/      Result, logger, event bus
  assets/    Logical IDs, manifests, provider chain, validation
  pack/      Room and theme schemas, loaders, asset-ID collection
  world/     Phaser scene, fixed-step simulation, rendering, input
  ui/        DOM HUD, theme tokens, warnings and fatal errors
  game/      Boot orchestration and asset-mode selection
  platform/  Browser entry point
public/content/dev/
  room.json           60 × 34 tile room, four background layers, spawns
  theme.json          Palette, fonts, UI tokens
  assets.final.json   Complete ID list, currently all placeholders
  assets.fixture.json Three test overrides
  fixtures/           Test-only SVG art
tests/                Manifest, assets, boot, and boundary tests
screenshots/          M0.1 default and fixture captures
```

Only `src/world/` imports Phaser. Gameplay and UI never reference media paths;
they ask `assets` for a logical ID such as `sprite.player.p1`.

## Documentation

See [IMPLEMENTATION.md](IMPLEMENTATION.md) for the architecture, asset provider
chain, simulation constants, deferred M0.2/M1 work, and verification results.

The design source of truth lives in the project vault (ADRs 0001–0033). The
`docs/` entry is a symlink to that vault and is not modified by this codebase.

## Status

M0.1 is complete for the foundation scope. Audio playback, live asset reload,
pack/syllabus loading, save state, dialogue, gates, curriculum integration,
co-op tether/drop-in, capture mode, and final art/audio are intentionally
deferred.
