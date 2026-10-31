# M1.9 — Bathroom Hub and Launch

**Status:** core implementation complete; manual visual/accessibility playtest
pending  
**Scope:** pre-game bathroom, pack selection, player mode, launch cinematic,
per-pack saves, and the reserved online lobby slot  
**Depends on:** M1.75; M1.8 for the material layer (placeholders remain
acceptable)  
**Feeds:** M2 (Silicon card flips), M3.5 (hub art), M4 (online lobby)  
**ADRs:** [`../adr-hub/`](../adr-hub/) — ADR-0058–0059

**Remaining work:** [`remaining-work.md`](remaining-work.md) records what is
missing and which milestone owns each item.

## 1. Why M1.9 exists

M1 boots directly into `03-nerve-forest` and hardcodes the `anatomy-reflex`
pack. That was the right shortcut for the one-level slice, but it leaves no
place for:

- choosing between the Anatomy and Silicon cycles;
- choosing Solo, Local co-op, or Online co-op;
- showing the planned Cloudflare multiplayer setup;
- a diegetic launch from the real world into the body;
- keeping separate progress for separate packs.

M1.9 adds the pre-game shell without changing the gameplay runtime's
responsibilities.

## 2. Scope

| In scope | Out of scope |
|---|---|
| Bathroom hub scene rendered with Phaser | Free movement or platforming in the hub |
| Washing-machine DOM menu anchored over the scene | Final bathroom art |
| Anatomy cycle available; Silicon visible but gated | Silicon pack content (M2) |
| Solo and Local co-op | Real online host/join/ready flow (M4) |
| Continue / New cycle with per-pack saves | Multiple save profiles per pack |
| Launch cinematic with skip and reduced motion | Synchronized online launch |
| Return to the bathroom from pause/complete | Guest save/evidence |
| Direct-boot query for tests/debugging | A general pack-download system |

## 3. Deliverables

### App shell

- [x] `src/game/app-state.ts` — outer phases, selection, start eligibility.
- [x] `AppController` in `src/game/boot.ts` — catalog, hub, pack load, launch,
      scene/UI/audio handoff, return-to-hub, error recovery.
- [x] Default `/` boots the hub.
- [x] `/?skipMenu=1&pack=anatomy-reflex` preserves direct boot.
- [x] One Phaser game at a time; hub and room never share a texture cache.

### Content

- [x] `public/packs/index.json` catalog with `available` / `coming-soon` /
      `online` metadata.
- [x] `public/hub/bathroom/hub.json`, `theme.json`, placeholder/final manifests.
- [x] Placeholder bathroom, washing machine, civilian, and tiny astronaut
      rendering; final art hooks use the same asset IDs.
- [x] Hub audio cues: click, door, spin, shrink, arrive, hum.

### Menu

- [x] Pack cards with status and save indicator.
- [x] Solo / Local co-op / Online co-op modes; online is disabled with an M4
      explanation.
- [x] Start / Continue / New cycle with inline confirmation.
- [x] Settings: sound, text scale, reduced motion.
- [x] Controls reference.
- [x] Keyboard focus, native radio semantics, live status, and error alert.

### Launch and gameplay handoff

- [x] Door open, climb in, door close, drum spin, shrink flash, tiny astronaut
      exit, room transition.
- [x] Visible Skip launch control and Esc/Space/Enter skip.
- [x] Reduced-motion crossfade.
- [x] Pack load failure returns to the hub with an error.

### Saves and runtime

- [x] Per-pack run slots: `shrinkonauts.run.<packId>`.
- [x] Legacy `shrinkonauts.run` migration.
- [x] `GameRuntime.start({ resume, activeP2 })`.
- [x] Solo starts P2 inactive; local co-op starts both.
- [x] Return to hub preserves save and settings.

### Tests and validation

- [x] Catalog, hub content, app-state, save, and runtime tests.
- [x] Hub browser smoke: bathroom → Solo → launch skip → Nerve Forest → pause →
      return to hub.
- [x] Existing M1 e2e uses the direct-boot URL.
- [x] `pack:validate` checks the catalog and hub.
- [x] `pack:smoke` uses the per-pack save key.

## 4. Definition of done

M1.9 is done when:

1. `/` shows the bathroom hub.
2. Anatomy starts end-to-end; Silicon is visible but disabled.
3. Solo starts with P2 inactive; local co-op starts with both players.
4. The launch cinematic is skippable and has a reduced-motion variant.
5. Pack load failure returns to the hub without corrupting the active save.
6. Per-pack saves are isolated and the legacy save migrates once.
7. Return-to-hub works from pause and completion.
8. The menu is keyboard and screen-reader accessible.
9. The existing M1/M1.75 gameplay tests pass through direct boot.
10. `npm test`, `pack:validate`, `pack:smoke`, `smoke:e2e`, `build`, and
    `git diff --check` pass.

Items 1–7 and 9–10 are implemented. Item 8 has automated role/label coverage
and a manual screen-reader pass is still recommended.

## 5. Implementation map

```text
src/game/app-state.ts       outer phases and selection rules
src/game/boot.ts            AppController and adapters
src/pack/catalog.ts         catalog parser/loader
src/hub/                    hub document, loader, validation
src/world/hub-scene.ts      bathroom, machine, launch timeline
src/ui/hub-model.ts         hub presentation contract
src/ui/hub-ui.ts            accessible washing-machine menu
src/save/index.ts           per-pack slots + legacy migration
src/game/runtime.ts         start options and solo/local mode
public/packs/index.json     cycle catalog
public/hub/bathroom/        hub content + manifests
e2e/hub.spec.ts             hub browser smoke
```

## 6. Phases and estimates

| Phase | Focus | Est. |
|---|---|---:|
| 0 | ADRs, app-shell contract, catalog/save design | 1 d |
| 1 | Catalog, hub content, bathroom scene, theme | 2 d |
| 2 | Menu UI, pack selection, Solo/Local, Continue/New | 2 d |
| 3 | Launch cinematic, skip, reduced motion, scene swap | 1.5 d |
| 4 | Online placeholder, return-to-hub, accessibility polish | 1 d |
| 5 | Tests, validation, docs, screenshots | 1 d |

**Total:** roughly **7–9 focused days**.

## 7. Later milestones

- **M2:** implement `silicon-reflex`; change the catalog entry to `available`.
  No hub code change is required.
- **M3:** unchanged; keep the 20-image `03-nerve-forest` scope.
- **M3.5:** optional hub art pass. Hub IDs exist now, so the art pass can
  replace placeholders without changing the menu or scene structure.
- **M4:** replace the disabled online block with the real lobby:
  - host/join and room code;
  - host's pack read-only to the guest;
  - both ready before start;
  - version/pack handshake in the hub;
  - host save, guest memory/no-op save;
  - host departure returns the guest to the hub;
  - M4.0 online is `03-nerve-forest` only; Silicon online is M4.1.

## 8. Verification

Automated verification on 2026-10-28:

```text
npm test              32 files / 317 tests passed
npm run build         tsc clean + Vite production build
npm run pack:validate PASS — dev, anatomy, catalog, bathroom hub
npm run pack:smoke    PASS — dev modes + anatomy runtime loop
npx playwright test   7/7 passed (system Chrome, port 4173)
```

Manual checks still recommended:

- screen reader pass over pack cards, mode radios, online placeholder, and
  start/confirm controls;
- 720p and narrow-window layout;
- reduced-motion launch start to finish;
- skip immediately and skip after the spin begins;
- visual pass on the bathroom placeholder and final-art hookup;
- save migration from a real pre-M1.9 browser profile.

## 9. Risks

| Risk | Mitigation |
|---|---|
| Silicon content slips | Card stays `coming-soon`; catalog is the switch. |
| Save migration loses progress | Legacy key is copied, then removed; mismatched packs are not migrated; tests cover both. |
| Hub and pack textures collide | One Phaser game at a time; unique hub IDs. |
| Launch blocks the menu too long | Skip control and reduced-motion variant; pack load runs in parallel. |
| Online placeholder grows | It is deliberately stateless; M4 owns the lobby. |
| Hub art expands M3 | Separate M3.5 pass. |
| App shell recovery leaves a dead screen | Every start failure returns to the hub with an error and a working Start button. |

## 10. Relationship to other documents

- [`remaining-work.md`](remaining-work.md) — missing work and sequencing.
- [`../adr-hub/README.md`](../adr-hub/README.md)
- [`../m1.75/README.md`](../m1.75/README.md)
- [`../m1.8/README.md`](../m1.8/README.md)
- [`../m2/nervous-puzzles/README.md`](../m2/nervous-puzzles/README.md)
- [`../m3/asset-requirements.md`](../m3/asset-requirements.md)
- [`../m4/README.md`](../m4/README.md)
