# Shrinkonauts

A two-player co-op platformer about shrinking into the body. This repository now
contains the **M1 runtime and first vertical slice**: one complete placeholder
loop through `03-nerve-forest` with pack/syllabus loading, dialogue, scanning, a
concept gate, an ability unlock, map and concept log, debrief, save/load, co-op,
content validation, and evidence export.

The app boots directly into the Nerve Forest. There is no pack select or intro
in M1, and no second core gate: the concept gate opens the exit, and the exit
leads to the debrief.

## Quick start

```bash
npm install
npm run dev
```

Open <http://127.0.0.1:5173/>.

```bash
npm test               # 13 files, 74 unit/integration tests
npm run smoke          # room boot + module boundary tests
npm run build          # type check and production build
npm run pack:validate  # dev fixture + anatomy pack validation
npm run pack:map       # regenerate the mapping document
npm run pack:smoke     # dev simulation + headless M1 runtime loop
npm run smoke:e2e      # Playwright browser smoke using system Chrome
npm run preview        # serve the production build
```

`smoke:e2e` starts Vite on port 4173 and launches the installed Chrome through
Playwright's `channel: "chrome"`. It never downloads a bundled browser.

## CI and deployment

| Workflow | Trigger | What it does |
| --- | --- | --- |
| `.github/workflows/ci.yml` | pull requests, manual dispatch, called by deploy | Type check + build, unit tests, pack validation, committed-mapping drift check, Playwright smoke |
| `.github/workflows/deploy-pages.yml` | push to `main`, manual dispatch | Runs CI, then publishes the tested `dist/` artifact to GitHub Pages |

Live build: <https://snorre98.github.io/shrinkonauts/>

The Vite `base` is `./` and the runtime resolves content from
`import.meta.env.BASE_URL`, so the same build works from the project subpath
without a `/shrinkonauts/` base override.

### First-time setup

Pages must be switched to the GitHub Actions source once per repository:

```bash
./scripts/bootstrap-pages.sh
```

The script is idempotent, enables Pages with `build_type=workflow`, and points
the repository homepage at the deployed URL. It requires an authenticated
`gh` CLI. Alternatively, set **Settings → Pages → Source** to **GitHub Actions**.

Recommended hardening: require the **Verify** and **E2E smoke** checks on
`main` under **Settings → Rules**, so only tested commits are deployed.

### Rollback

Re-run the last known-good **Deploy to GitHub Pages** workflow run from the
Actions tab (or `gh run rerun <run-id>`). Reverting a commit on `main` also
triggers a fresh deploy.

CI runs on Node 24 (pinned by `.nvmrc`) and installs with `npm ci`, so
`package-lock.json` must stay in sync with `package.json`.

## Controls

| Player | Move | Jump | Interact | Scan | Dash |
| --- | --- | --- | --- | --- | --- |
| P1 | `A` / `D` | `W` or `Space` | `E` | `Q` | `Shift` |
| P2 | `←` / `→` | `↑` | `,` | `.` | `/` |

Shared: `P` join/rest P2 at a checkpoint, `Tab` map, `C` concept log, `Esc`
pause/close, `M` mute.

Both players are active at boot. The co-op tether keeps them within 560 px of
each other. `signal-dash` unlocks after the Nerve Forest gate; `scan` is
available from the start. Input latches keydown events so a tap shorter than one
render frame is never lost.

## The M1 slice

`03-nerve-forest` is the only authored level in `anatomy-reflex` for now:

1. Talk to the **Neuron Keeper** (`dlg-neuron-01`) and answer the neuron-direction
   check. The correct answer reveals CON-3, CON-4, and CON-5.
2. Scan the glowing structures for the remaining concepts (CON-3 through CON-7).
3. Open **Signal Gate** (`gate-nerve-01`), a `sequence` puzzle. The answer is
   `Receptor → Sensory neuron → Spinal cord → Motor neuron → Muscle`.
4. Solving the gate unlocks `signal-dash`, reveals the muscle-effector map node,
   and records the OBJ-2 gate evidence.
5. Walk into the exit together. The debrief asks for a teach-back answer; finish
   it to record `debrief_completed`, then export the evidence JSON.

Autosave runs at level start, checkpoint changes, gate solves, and debrief
updates. Run state lives in `shrinkonauts.run`; audio and accessibility settings
live in `shrinkonauts.settings`. Both are owned by the `save` module.

### Screenshots

All three are placeholder assets from the M1 build:

| Nerve Forest | Dialogue | Signal gate |
| --- | --- | --- |
| ![Nerve Forest](screenshots/m1-nerve-forest.png) | ![Neuron Keeper dialogue](screenshots/m1-dialogue.png) | ![Sequence gate](screenshots/m1-gate.png) |

The earlier M0.1/M0.2 captures remain in `screenshots/` for comparison.

### M1 deviations

- Direct boot; no PackSelect or Intro.
- One level used as both start and end; no second core gate.
- Audio is limited to short cues (no music or ambience loops).
- Full key rebinding is deferred; pause, text scale, reduced motion, mute, and
  focus management are implemented.
- Forward references to `04-muscle-effector` and later map nodes are warnings in
  `pack:validate`, not failures.
- Unattempted objectives/concepts produce advisory coverage warnings.

## Content and asset modes

The runtime loads:

```text
public/packs/anatomy-reflex/     pack, theme, level, room, dialogue, gate, mapping, licences
public/syllabi/anatomy-reflex.json
```

`public/content/dev/` remains the M0 regression fixture. It is exercised by
`pack:validate`, `pack:smoke`, and the room/boot tests, but the M1 app no longer
boots it.

| URL | Behaviour |
| --- | --- |
| `/` | Anatomy pack; every logical ID resolves to a procedural placeholder |
| `/?assets=fixture` | Loads an anatomy `assets.fixture.json` if present; otherwise warns and keeps placeholders |
| `/?assets=final` | Selects the final manifest; shipped entries are still placeholders |

All 35 anatomy IDs resolve as placeholders (35/35). The dev fixture still
resolves 10/10 placeholders, or 7/10 with its fixture manifest selected by the
scripts. Unknown `?assets=` values fall back to placeholder mode.

## Project layout

```text
src/
  core/          Result, logger, event bus, shared learning-event vocabulary
  syllabus/      Syllabus schema, parser, lookups
  assets/        Logical IDs, manifests, provider chain, preload, validation
  pack/          Pack/level/room/dialogue/gate/mapping schemas, parsers,
                 browser loader, mapping generation, pure validator
  progression/   Abilities, gates, revealed map nodes/edges
  narrative/     Dialogue graph traversal, choices, effects
  curriculum/    Evidence, objective progress, debrief, evidence export
  save/          Versioned run slot + audio/accessibility settings
  audio/         Cue playback, Web Audio, mute/volume, providers
  world/         Phaser scene, fixed-step simulation, rendering, keyboard input
  ui/            HUD, dialogue/gate/map/log/debrief/pause overlays, theme tokens
  game/          Pure runtime orchestrator + adapter-heavy browser boot
  platform/      Browser entry point
scripts/
  pack-validate.ts   Dev fixture + anatomy pack validation
  pack-map.ts        Mapping generation/drift check
  pack-smoke.ts      Dev simulation + headless M1 runtime loop
e2e/
  m1.spec.ts         System-Chrome smoke: boot → dialogue → scan → gate → debrief
public/content/dev/  M0 regression fixture (not booted by the app)
public/packs/anatomy-reflex/
public/syllabi/
```

Only `src/world/` imports Phaser. Only `src/assets/` knows media file paths;
gameplay, audio, and UI ask for logical IDs such as `sprite.agent.neuron` or
`audio.cue.scan`. `game/runtime.ts` is pure TypeScript and never touches the DOM,
Phaser, Web Audio, or storage, which is why `pack:smoke` can drive the complete
loop headlessly.

## Documentation

See [IMPLEMENTATION.md](IMPLEMENTATION.md) for the runtime lifecycle, module
graph, pack/validation model, save format, accessibility baseline, test matrix,
and documented deviations.

The design source of truth lives in the project vault (ADRs 0001–0033). The
`docs/` entry is a symlink to that vault and is not modified by this codebase.

## Status

M1 is complete for the one-level vertical slice. Still deferred: final art and
audio, the Silicon fixture, levels 2–5, capture mode, a separate core gate,
music/ambience loops, full key rebinding, and conditional dialogue-node skipping.
