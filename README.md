# Shrinkonauts

A two-player co-op platformer about shrinking into the body. This repository
contains the **M1.9 bathroom hub** on top of the M1.75 feedback/effect layer and
the `03-nerve-forest → 04-muscle-effector` vertical slice: pack/syllabus
loading, entity conversations, scanning, Node Run, Endplate Ferry, debrief,
save/load, co-op attribution, anchored feedback surfaces, cosmetic effects,
content validation, and evidence export.

The app boots into a real-world bathroom hub. The washing machine menu selects
the Anatomy cycle or shows Silicon as a gated M2 cycle, chooses Solo or Local
co-op, and starts a launch cinematic into the selected pack. Direct boot remains
available with `?skipMenu=1&pack=anatomy-reflex`.

## Quick start

```bash
npm install
npm run dev
```

Open <http://127.0.0.1:5173/>.

```bash
npm test               # 32 files, 317 unit/integration tests
npm run smoke          # room boot + module boundary tests
npm run build          # type check and production build
npm run pack:validate  # dev fixture + anatomy + catalog/hub validation
npm run pack:map       # regenerate the mapping document
npm run pack:smoke     # dev simulation + headless runtime loop
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

| Player | Move | Jump | Interact | Scan | Dash | Pulse | Carry | Throw |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| P1 | `A` / `D` | `W` or `Space` | `E` | `Q` | `Shift` | `F` | `G` | `H` |
| P2 | `←` / `→` | `↑` | `,` | `.` | `/` | — | `'` | `;` |

Hub: `Tab` / `Shift+Tab` move focus, `Enter` / `Space` activate, `M` mute,
`Esc` / `Space` / `Enter` skip the launch cinematic.

Shared: `P` join/rest P2 at a checkpoint, `Tab` map, `C` concept log, `Esc`
pause/close, `M` mute. P1 confirms soft surfaces with `E`/`Enter`; P2 uses `,`.
Conversation choices are owned by the player who started the conversation and do
not block the other player.

Both players are active at boot. The co-op tether keeps them within 560 px of
each other. `signal-dash` unlocks after Node Run; `scan` is available from the
start. Input latches keydown events so a tap shorter than one render frame is
never lost.

## The M1.9 bathroom hub

1. **Bathroom.** The player stands in front of a washing machine. The machine's
   control panel is the DOM menu, anchored over the bathroom scene.
2. **Cycle.** Anatomy is available. Silicon is visible but gated until its M2
   pack exists. Each cycle has its own save slot.
3. **Players.** Solo starts with P2 inactive; Local co-op starts both players.
   Online co-op is visible but disabled with the M4 Cloudflare explanation.
4. **Start.** Continue resumes the selected cycle; New cycle asks for
   confirmation. Start plays the climb-in, spin, shrink, and tiny-astronaut
   transition, which can be skipped or reduced.
5. **Return.** Pause and completion both offer "Leave to bathroom"; the selected
   cycle's progress remains available.

The hub loads only `public/packs/index.json` and `public/hub/bathroom/`. Pack
content and assets load when a cycle starts; a failure returns to the hub with
the error and a working Start button.

## The M1.75 slice

1. **03 — Nerve Forest (`puzzle-node-run`).** Talk to the Neuron Keeper, scan
   the pathway concepts, press both dendrite inputs, reach threshold, run the
   axon, and open the exit. The feedback layer shows persistent counter/gate
   state, attributed cues, beat progress, and a tile-path effect.
2. **04 — Endplate Ferry (`puzzle-endplate-ferry`).** Interact at the motor
   terminal, trigger the plate to open the Ca²⁺ window, carry the ACh packet to
   the nicotinic receptor, and pulse from the terminal. The AChE clearance beat,
   rejected-receptor reasons, Ca²⁺/gate state, and muscle wave are visible.
3. **Debrief and evidence.** Answer the teach-back prompt, finish the level, and
   export the evidence JSON.

Autosave runs at level start, checkpoint changes, puzzle events, conversation
updates, and debrief updates. Run state lives in `shrinkonauts.run`; audio and
accessibility settings live in `shrinkonauts.settings`. Feedback ECS entities are
ephemeral and are rebuilt from puzzle/world state after restore.

### Current deviations

- Default boot is the bathroom hub; direct boot remains available with
  `?skipMenu=1&pack=anatomy-reflex`.
- Silicon is a visible `coming-soon` cycle until the M2 pack exists.
- Online co-op is a disabled M4 placeholder; no Worker/DO client is wired yet.
- Two authored levels; `05-reflex-core` and later map nodes are forward
  references reported as warnings.
- Audio is limited to short cues (no music or ambience loops).
- Full key rebinding is deferred.
- Final art/audio, the bathroom hub art pass (M3.5), and the M1.8
  material/pattern layer are deferred.
- Physical puzzle-gate bodies, `locked`/`unlock` props, conditional links,
  per-level debrief overrides, and side-level travel are accepted ADR targets but
  are **not implemented** in this branch. See
  [`docs/puzzle-engine/architecture.md`](docs/puzzle-engine/architecture.md).

## Content and asset modes

The app loads:

```text
public/packs/index.json          cycle catalog
public/hub/bathroom/             hub document, theme, placeholder/final manifests
public/packs/anatomy-reflex/     pack, theme, level, room, dialogue, gate, puzzle,
                                 feedback content, mapping, licences
public/syllabi/anatomy-reflex.json
```

The selected pack loads when a cycle starts. `public/content/dev/` remains the
M0 regression fixture. It is exercised by `pack:validate`, `pack:smoke`, and the
room/boot tests, but the app does not boot it.

| URL | Behaviour |
| --- | --- |
| `/` | Bathroom hub; Anatomy available, Silicon gated, online placeholder |
| `/?skipMenu=1&pack=anatomy-reflex` | Direct boot into the selected pack |
| `/?pack=silicon-reflex` | Preselects the gated Silicon cycle in the hub; Start is disabled |
| `/?assets=fixture` | Loads an `assets.fixture.json` if present; otherwise warns and keeps placeholders |
| `/?assets=final` | Selects the final manifests; shipped entries are still placeholders |

The bathroom hub resolves 15 IDs as placeholders. Anatomy resolves 44/44
placeholders. The dev fixture still resolves 10/10 placeholders, or 7/10 with
its fixture manifest selected by the scripts. Unknown `?assets=` values fall back
to placeholder mode.

## Project layout

```text
src/
  core/          Result, logger, event bus, shared learning-event vocabulary
  ecs/           Deterministic entity/component/system kernel
  feedback/      Facts, director, descriptors, lexicon, beats, effect presets
  syllabus/      Syllabus schema, parser, lookups
  assets/        Logical IDs, manifests, provider chain, preload, validation
  pack/          Pack/level/room/dialogue/gate/puzzle schemas, parsers,
                 browser loader, mapping generation, pure validator
  progression/   Abilities, gates, revealed map nodes/edges
  narrative/     Dialogue graph traversal, choices, effects
  curriculum/    Evidence, objective progress, debrief, evidence export
  save/          Per-pack run slots, conversations, settings
  audio/         Cue playback, Web Audio, mute/volume, providers
  hub/           Bathroom hub document, loader, validation
  world/         Phaser scenes, fixed-step simulation, effects, tile visuals
  ui/            HUD, bathroom menu, anchored feedback surfaces, overlays
  game/          App shell, pack runtime orchestrator, surface router, boot
  platform/      Browser entry point
scripts/
  pack-validate.ts   Dev fixture + anatomy + catalog/hub validation
  pack-map.ts        Mapping generation/drift check
  pack-smoke.ts      Dev simulation + headless runtime loop
e2e/
  hub.spec.ts        Bathroom → cycle → launch skip → level → return
  m1.spec.ts         System-Chrome smoke: 03 → 04, conversations, reduced motion
public/content/dev/  M0 regression fixture (not booted by the app)
public/hub/bathroom/ Bathroom scene, theme, manifests
public/packs/index.json  Cycle catalog
public/packs/anatomy-reflex/
public/syllabi/
```

Only `src/world/` imports Phaser, and only `src/world/` imports Matter.js. Only
`src/assets/` knows media file paths; gameplay, audio, UI, and feedback ask for
logical IDs. `game/runtime.ts` is pure TypeScript and never touches the DOM,
Phaser, Web Audio, or storage, which is why `pack:smoke` can drive the complete
loop headlessly.

`pack` never imports `feedback`; `validatePack` receives an injected structural
feedback vocabulary. `world` never imports `feedback`; effects enter through
`WorldEffectPlan` and tile visual ports.

## Documentation

- [`IMPLEMENTATION.md`](IMPLEMENTATION.md) — runtime lifecycle, module graph,
  validation, save format, accessibility, test matrix, and verification.
- [`docs/puzzle-engine/README.md`](docs/puzzle-engine/README.md) — engine
  upgrade index, implementation status, and reading order.
- [`docs/m1.75/README.md`](docs/m1.75/README.md) — milestone status, definition
  of done, and remaining playtest checks.
- [`docs/m1.9/README.md`](docs/m1.9/README.md) — bathroom hub, pack catalog,
  per-pack saves, and launch transition.
- [`docs/m1.9/remaining-work.md`](docs/m1.9/remaining-work.md) — what is
  deliberately missing and which milestone owns it.
- [`docs/adr-hub/README.md`](docs/adr-hub/README.md) — ADR-0058–0059 for the
  pre-game shell and save/catalog model.

`docs/puzzle-engine/` and `docs/adr-m1.5/` are maintained in this repository.
`docs/shrinkonauts` is a symlink into the read-only Obsidian vault and is not
modified by this codebase.

## Status

M1.9's bathroom hub is **core implementation complete; manual visual and
accessibility playtest pending**. The automated suite passes (32 files / 317
tests), pack validation/smoke pass, and the browser smoke passes 7/7. The hub
starts Anatomy in Solo or Local co-op, returns to the bathroom, and preserves
per-pack saves. Silicon and online co-op remain gated by M2 and M4.

M1.75 remains **implementation complete; manual solo/co-op playtest pending**.
`authoring.playtestedSolo` and `authoring.playtestedCoop` remain `false` until a
human performs the checks in the M1.75 milestone document.

Final art and audio, the Silicon fixture, levels 5+, capture mode, music/ambience
loops, the M3.5 hub art pass, full key rebinding, and the deferred puzzle-engine
ADR features remain out of scope for this branch.
