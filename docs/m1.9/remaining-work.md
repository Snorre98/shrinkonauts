# M1.9 — Remaining Work and Sequencing

**Status:** M1.9 core implementation is in place. This document is the single
place that records what is deliberately missing, which milestone owns it, and
when it should be implemented.

Do not implement the M2, M3.5, or M4 items inside the M1.9 hub branch. The hub is
designed so those changes are content/catalog or transport changes, not a hub
rewrite.

## 1. What M1.9 already ships

- `/` boots the bathroom hub; direct boot remains available at
  `/?skipMenu=1&pack=anatomy-reflex`.
- Anatomy cycle is playable through the hub in Solo or Local co-op.
- Silicon is visible as a `coming-soon` cycle; Start is disabled.
- Online co-op is visible as a disabled M4 placeholder; there is no transport,
  room code, or session state yet.
- Launch cinematic, Skip launch, reduced-motion launch, and return-to-bathroom
  work.
- Per-pack saves and the legacy `shrinkonauts.run` migration work.
- Automated verification: 317 unit/integration tests, 7/7 Playwright tests,
  pack validation/smoke, and the production build.

## 2. Missing now: M1.9 manual acceptance

These are verification tasks, not new features. M1.9 should not be called
fully accepted until they are done or explicitly waived.

| Item | When | Why it is still missing | Exit condition |
|---|---|---|---|
| Screen-reader pass over the hub | Before M1.9 sign-off | Automated tests check roles/names but not a real screen reader | NVDA or VoiceOver reads pack cards, modes, online placeholder, Start, settings, and confirm dialog correctly |
| Keyboard-only pass | Before M1.9 sign-off | Automated tests use mouse clicks for some hub paths | Tab/Shift+Tab, arrows, Enter/Space, and Esc work without a mouse |
| Narrow-window and 720p visual pass | Before M1.9 sign-off | Only a 1280×720 headless screenshot has been checked | Hub remains usable and readable at 720p and at the 900px breakpoint |
| Reduced-motion launch playthrough | Before M1.9 sign-off | Automated smoke checks the setting and room entry, not the human experience | No spin/shake/flash; captions and transition are understandable |
| Legacy save migration on a real profile | Before M1.9 sign-off | Unit test uses a synthetic `MemorySaveStorage` | A pre-M1.9 `shrinkonauts.run` save appears as Continue in the correct cycle |
| Placeholder visual review | Before M1.9 sign-off | Procedural bathroom is functional, not final art | The scene reads as a bathroom and the machine/menu relationship is clear at actual size |

## 3. Next content milestone: M2 — Silicon cycle

**When:** after M1.9 acceptance and the M2 content freeze.  
**Owner:** M2.  
**Do not:** add a fake Silicon room or puzzle inside M1.9.

Required work:

- [ ] Create `public/packs/silicon-reflex/` as a separate pack.
- [ ] Add level `01-interrupt-loop` with the M2 Interrupt Loop puzzle.
- [ ] Add the Silicon theme, room, dialogue, gate/puzzle content, mapping, and
  licences.
- [ ] Add a machine-readable syllabus (or document and validate reuse of the
  Anatomy CON-8 objective if that is the chosen M2 decision).
- [ ] Add placeholder/final manifests for the new pack.
- [ ] Add `silicon-reflex` to `pack:validate`, `pack:smoke`, and content tests.
- [ ] Add a hub e2e that starts the Silicon cycle and enters
  `01-interrupt-loop`.
- [ ] Change `public/packs/index.json` Silicon entry from `coming-soon` to
  `available`.
- [ ] Keep `online: false` on Silicon until M4.1.

**M1.9 code changes expected for M2:** none. The catalog status is the switch.
If M2 chooses the in-pack fallback instead of a separate pack, the catalog model
needs a level override; that is a deliberate M2 decision, not an M1.9 change.

## 4. M1.8 dependency: material and pattern layer

**When:** when M1.8 is accepted.  
**Status:** M1.8 is implemented; hub material-token adoption remains a follow-up.

The hub currently uses plain CSS tokens and procedural placeholder art. When
M1.8 lands:

- [ ] Adopt material/pattern tokens in the hub panel and machine where they
  improve parity.
- [ ] Add a shared material/pattern example that spans the hub panel and the
  machine body.
- [ ] Keep all hub behavior and card/menu layout unchanged.

This is a visual-language follow-up, not a functional M1.9 dependency.

## 5. M3.5 — Bathroom hub final art

**When:** after M3, as a small separate art pass. Do not expand the M3
`03-nerve-forest` 20-image scope.

Suggested asset kit:

```text
bg.bathroom.wall / far / mid / near      4 backgrounds or layers
sprite.prop.washer                       1 machine body
sprite.prop.washer.door                  1 door/porthole
sprite.prop.washer.drum                  1 drum
sprite.player.civilian                   1 real-world player
sprite.prop.cartridge.anatomy            1 cycle cartridge
sprite.prop.cartridge.silicon            1 cycle cartridge
audio.cue.hub.click / door / spin /
  shrink / arrive / hum                  6 cues
```

Work:

- [ ] Produce the assets in the existing "Dank Anatomy Cartoon" style.
- [ ] Put the real `src` paths in
  `public/hub/bathroom/assets.final.json`.
- [ ] Add licences and update the prompt/asset log.
- [ ] Keep the existing procedural fallback for placeholder mode.
- [ ] Verify `?assets=final` on the hub and the selected pack.
- [ ] Do not change hub logic, markup, or launch timings.

## 6. M4 — Online co-op lobby

**When:** after M3/M3.5, as part of the Cloudflare online milestone.  
**Status:** M4 is proposed; the hub only reserves the UI slot.

Required work:

- [ ] Implement the Worker, Durable Object, room code, role handshake, and
  heartbeat (ADR-0047–0057).
- [ ] Replace the hub's disabled Online block with Host / Join controls.
- [ ] Host owns the selected cycle; guest sees it read-only.
- [ ] Both clients load the pack and signal ready before host Start.
- [ ] Version/build/pack mismatch is rejected in the hub.
- [ ] Guest save is memory/no-op; Continue is hidden for the guest.
- [ ] Host Start sends the initial run; both clients run the launch locally.
- [ ] Guest disconnect/reconnect, host-left, host-tab-hidden, and session-end
  return to the hub.
- [ ] M4.0 online supports `anatomy-reflex` / `03-nerve-forest` only; Silicon
  online is M4.1.
- [ ] Add the two-browser lobby/online Playwright test.

**M1.9 code expected for M4:** replace the disabled online section with the
session UI and wire the `SessionSetupPort` behind it. Do not add online state to
`GameRuntime`.

## 7. Deliberately not part of M1.9

- Silicon puzzle/room content.
- Any Worker, Durable Object, WebSocket, room code, or online session code.
- Final bathroom art or final audio.
- Free movement or platforming in the bathroom.
- Multiple save profiles per pack.
- Mobile/touch hub controls.
- Pack downloading or a remote catalog.
- Music/ambience loops and full key rebinding.

## 8. M1.9 completion checklist

- [x] Hub default boot and direct-boot fallback.
- [x] Anatomy hub start in Solo and Local co-op.
- [x] Silicon card visible but gated.
- [x] Online card visible but disabled.
- [x] Launch cinematic, skip, reduced motion.
- [x] Per-pack saves and legacy migration.
- [x] Return to bathroom from pause/complete.
- [x] Automated unit/integration/e2e/build checks.
- [ ] Human visual/accessibility acceptance (section 2).
- [ ] M2 Silicon content (section 3).
- [ ] M3.5 hub art (section 5).
- [ ] M4 online lobby (section 6).

## 9. References

- [`README.md`](README.md) — M1.9 scope and design.
- [`../adr-hub/README.md`](../adr-hub/README.md) — ADR-0058–0059.
- [`../m2/nervous-puzzles/silicon-fixture.md`](../m2/nervous-puzzles/silicon-fixture.md)
  — Silicon room/puzzle design.
- [`../m3/asset-requirements.md`](../m3/asset-requirements.md) — M3 scope and the
  M3.5 hub note.
- [`../m4/README.md`](../m4/README.md) — M4 online co-op and lobby phase.
