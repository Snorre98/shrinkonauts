# M4 — Same-room co-op (phone controllers)

- **Status:** M4.0a active, 2026-11-04; Phases 1–6 and Phase 6.5 complete;
  Phase 7 pending; M4.0b/M4.1 not planned (ADR-0081)
- **Owner:** Snorre
- **Scope:** phone-controller, same-room, shared-screen co-op; host-authoritative
  input relay; keyboard remains the default and fallback
- **Depends on:** M1.75 per-player input; M1.8/M2/M3 are content dependencies for
  the final pack, not for M4.0a
- **ADR domain:** [`../adr-controller/README.md`](../adr-controller/README.md) —
  ADR-0066–0069, ADR-0081, ADR-0082, and ADR-0083–0087
- **Plan:** [`phone-coop-implementation-plan.md`](phone-coop-implementation-plan.md)
- **Baseline:** the current local co-op slice; `03-nerve-forest` and the M2 pack
  are the visual/content baseline, not a network dependency

## 1. Why M4 exists

M1 through M3 prove the local co-op learning game: one browser, two players,
shared camera and tether, puzzles, feedback, materials, final art, and evidence.
M4 makes the second input practical without turning the game into a remote
client.

The product is **same-room, shared-screen co-op**:

- one host/display browser owns the simulation and renders the shared screen;
- P1 and P2 are independent input slots;
- each slot is `keyboard` or `phone`;
- the host keyboard may serve one or both slots;
- at most three physical devices are involved: host/display, P1 phone, P2 phone;
- a keyboard slot reduces that count;
- the Cloudflare Worker/Durable Object relays controller input only.

This is the console model: the laptop is the console, and phones are the
controllers. The game does not need a remote guest, a second rendered view, or a
fourth device.

M4.0a is the complete multiplayer scope. M4.0b (remote guest rendering,
snapshots, interpolation, prediction) and M4.1 (full-pack online) are **not
planned**. Their historical design is retained in Appendix A and in
[`../adr-online/`](../adr-online/README.md).

## 2. Milestone boundary

### 2.1 M4.0a — Phone co-op

| In scope | Out of scope |
|---|---|
| One or two phone controllers on one shared screen | Phone-rendered game view or video streaming |
| Per-player input slots: P1/P2 each keyboard or phone | A second game client, world/UI snapshots, or interpolation |
| Keyboard co-op remains the default and fallback | Replacing the keyboard path with phones |
| Host-authoritative `GameRuntime` and `RoomSimulation` | Deterministic lockstep or server-authoritative physics |
| Movement, tether, camera, scan, interact, carry, throw, pulse | New verbs, puzzles, abilities, or content |
| Both players’ entity conversations and feedback | Free-text chat or voice |
| Host-owned save, evidence, and P1/P2 attribution | Controller save/evidence or trusted public assessment |
| QR/code pairing, slot reservation, reconnect, keyboard fallback | Accounts, matchmaking, lobbies, spectators, remote guests |
| Cloudflare Worker + one Durable Object per room | Cloudflare Containers, server game loop, or paid plan |
| Security, rate limits, Origin allowlist, abuse boundaries | Anti-cheat or public matchmaking |
| Unit, integration, browser touch, latency playtest | Bluetooth, native apps, console, mobile game client |
| Removal of the obsolete Online co-op placeholder and `online` catalog flag | Keeping a disabled online mode as a permanent promise |

### 2.2 Not planned — historical remote co-op

M4.0b and M4.1 are retained only for historical precedent. Do not build them.
See Appendix A for the old scope and the decision to retire it.

## 3. Dependency and ordering

```text
M1.75  feedback, effects, entity conversations, per-player input
  │
  ├──────────────► M4.0a  same-room phone co-op
  │                        (complete multiplayer scope)
M1.8   materials, patterns, autotiling, atlases
  ↓
M2     six room puzzles + Silicon design/content
  ↓
M3     final art/audio for the 03 capture slice
```

M4.0a assumes:

- M1.75 Phases 4–8 are complete, especially per-player input, anchored
  feedback surfaces, entity conversations, and co-op attribution.
- The local keyboard co-op path is accepted and regression-tested.
- No M1.8, M2, or M3 content dependency; the phone loads no pack or assets.

M4.0a does not block on M1.8/M2/M3. The finished content layers improve the
shared screen; they do not change the controller architecture.

## 4. Deliverables

### M4.0a — Phone co-op

- [ ] [ADR-0066–0069, ADR-0081, ADR-0082, and ADR-0083–0087](../adr-controller/README.md)
  are the active controller domain.
- [ ] [`phone-coop-implementation-plan.md`](phone-coop-implementation-plan.md) is
  the M4.0a authority.
- [ ] Local co-op exposes `P1: Keyboard | Phone` and `P2: Keyboard | Phone`;
  keyboard/keyboard remains the default.
- [ ] All four plans work from the hub: K/K, K/P, P/K, P/P.
- [ ] Hub Start stays disabled or held paused until every phone slot is ready
  or explicitly downgraded; controller readiness never auto-starts the run.
- [ ] The host can be display-only when both slots use phones; the laptop
  keyboard still handles host-only actions.
- [ ] Keyboard co-op remains available and is the fallback when a phone session
  fails.
- [ ] A pure input arbiter samples one active source per player slot; no
  double-sampling and no cross-slot leakage.
- [ ] The controller role claims exactly one slot; a third controller, duplicate
  slot, and unopened slot are rejected.
- [ ] Signed room tickets gate QR joins at the Worker edge; an invalid, expired,
  or wrong-room ticket never creates or wakes a room Durable Object.
- [ ] The manual six-character code checks the demo gate and never creates a
  room for an inactive code.
- [ ] Server-issued device IDs bind one device per controller slot; the host
  device cannot also be a controller; reconnect is same-device only.
- [ ] The relay admits at most one host and two controllers before accepting a
  socket; a second host, third controller, reserved slot, or unready join is
  rejected without a `101` upgrade.
- [ ] A demo session is capped at 5 minutes, 12,000 room messages, and 20
  controller messages per second; Workers Logs is disabled.
- [ ] The host creates a room with the phone-enabled slots; controllers join by
  QR or six-character code.
- [ ] The controller page is a separate static entry with no Phaser, pack
  loader, game assets, or game state.
- [ ] The phone uses a left-thumb movement zone and a right-thumb Jump/action
  cluster; Jump is the largest bottom-right target.
- [ ] Dash is a double-tap gesture on the ◀ / ▶ buttons with a visible
  ready/cooldown indicator, a one-time coach mark, and a controls-sheet entry;
  no Dash button is rendered.
- [ ] Dialogue auto-switches the owning phone to Continue/Back or numbered
  choices; no dialogue text appears on the phone.
- [ ] The phone shows only unlocked verbs, highlights the contextual verb
  without remapping, and confirms action results.
- [ ] Controller input uses the ADR-0049 `NetInput` subset, is validated for
  shape/rate/sequence/ownership, and preserves edge actions across fixed steps.
- [ ] Controller disconnect pauses the run; reconnect within 60 seconds restores
  the slot; keyboard fallback is explicit and closes the slot.
- [ ] Controllers cannot send host-only actions, save, evidence, or another
  slot’s input.
- [ ] Latency instrumentation and a playtest record exist; p95 input-to-photon
  is measured against the budget.
- [ ] Coyote time and jump buffering are implemented and tested without changing
  keyboard/solo correctness.
- [x] The obsolete Online co-op hub mode/panel, `HubOnlineView`, and the
  `online` pack catalog flag are removed (2026-11-04).
- [ ] Unit, integration, browser-touch, and manual tests cover K/K, K/P, P/K,
  P/P, reconnect, fallback, and security.
- [ ] The local-only statements in `architecture.md`, `failure-semantics.md`,
  `concurrency-topology.md`, `module-boundaries.md`, and `interface.md` are
  amended for the optional controller input path.

## 5. Definition of done

### 5.1 M4.0a — Phone co-op

M4.0a is done when:

1. ADR-0066–0069, ADR-0081, ADR-0082, and ADR-0083–0087 are accepted and the
   M4.0a implementation plan is the authority for the controller phase.
2. Keyboard/keyboard local co-op is unchanged, is the default, and passes the
   existing regression suite.
3. Keyboard/phone, phone/keyboard, and phone/phone each start from the hub and
   play one full local co-op level.
4. The host can be display-only with two phones; the laptop keyboard still
   handles host-only actions.
5. A phone joins by QR or six-character code, is bound to one slot, and receives
   no game state or assets.
6. A third controller, duplicate slot, unopened slot, and wrong version are
   rejected with clear messages.
7. Controller input is applied at the next fixed step; edge actions survive
   coalescing; stale/duplicate frames are dropped; slot ownership is enforced.
8. A controller disconnect pauses the run; reconnect within 60 seconds restores
   the slot; keyboard fallback works; host departure ends cleanly.
9. Controllers cannot send host-only actions, save, evidence, or another slot’s
   input; Origin/size/rate limits are enforced.
10. The latency playtest records a keyboard baseline and phone p50/p95; the
    target is met or the chosen fallback is documented.
11. Coyote time and jump buffering are implemented and tested without changing
    keyboard/solo correctness.
12. The obsolete online mode, panel, and catalog flag are removed; the hub
    advertises Solo and Local co-op only.
13. Unit, integration, browser-touch, and manual tests pass; the existing
    `npm test`, `npm run pack:validate`, `npm run pack:smoke`,
    `npm run smoke:e2e`, `npm run build`, and `git diff --check` also pass.
14. Docs are updated: controller ADR domain, M4 README, architecture/contracts,
    README/IMPLEMENTATION status, and the playtest note.
15. M4.0a is identified as the complete multiplayer scope; no active plan
    promises M4.0b or M4.1.
16. The demo quota guard is enforced and configurable: signed room tickets,
    server-issued device IDs, one host plus two controllers, 5-minute sessions,
    room message and controller rate caps, and Workers Logs disabled
    (ADR-0082).
17. The controller layout, double-tap Dash gesture, dialogue modes, and ability
    affordances meet ADR-0083–0087; the Phase 7 playtest is run against that
    layout.

### 5.2 Not planned

M4.0b and M4.1 are not part of the definition of done. They are historical
records only.

## 6. Phases and estimates

Focused effort, not calendar time. Part-time work roughly doubles the elapsed
range.

| Phase | Focus | Est. | Exit |
|---|---|---:|---|
| 0 | Accept controller ADRs, approve plan, amend local-only contracts | 0.5–1 d | ADRs accepted; plan authoritative |
| 1 | Input contracts and pure arbiter | 1–1.5 d | K/K, K/P, P/K, P/P unit coverage |
| 2 | Protocol, transport seam, remote source, fake transport | 1–1.5 d | Host runs all four plans without a Worker |
| 3 | Worker, DO, room codes, slot reservation, limits | 1.5–2 d | Two controllers join; third/duplicate rejected |
| 3.5 | Demo quota guard, signed tickets, device admission, 5-minute caps | 2–3 d | Random joins never create a room; one host + two devices enforced |
| 4 | Host session wiring, pause, keyboard fallback | 1 d | Real session drives the arbiter |
| 5 | Controller web app, touch layout, reconnect | 1.5–2 d | Phone joins and controls one slot |
| 5.5 | Remove obsolete online placeholder and catalog flag (done 2026-11-04) | 0.25–0.5 d | No online mode/panel/flag remains |
| 6 | Hub input setup, QR pairing, explicit Start gate | 1–1.5 d | All four plans start from the hub only after readiness; no auto-start |
| 6.5 | Controller ergonomics: left movement, right jump/actions, double-tap dash, auto dialogue, progressive abilities (done 2026-11-04) | 4.5–6 d | Jump right; double-tap dash; auto dialogue; only unlocked verbs; keyboard regression clean |
| 7 | Latency measurement, coyote/buffer, playtest, docs | 1–1.5 d | DoD met or fallback documented |

**Total:** roughly **14.5–20 focused days**, including the Worker/DO and the demo
quota guard. If the Worker/DO is already deployed, the incremental controller
work is roughly **9.5–13 focused days**.

## 7. Compatibility with planned features

| Planned feature | M4 treatment |
|---|---|
| M1.75 per-player input, ownership, surfaces | Both phases reuse the per-player model. Controllers route to the assigned slot; no new attribution model. |
| M1.75 feedback ECS, surfaces, beats | Host computes; the controller receives no feedback surface. |
| M1.75 entity conversations | Host owns narrative sessions; P1/P2-owned surfaces route through the controller input subset. |
| M1.75 effects and tile visuals | Host computes; controllers render no game effects. |
| M1.8 materials, patterns, autotiling, variants | Controller loads no content. The shared host screen uses the pack as before. |
| M1.8 UI material/pattern parity | Controller UI is controller-only. |
| M1.9 bathroom hub, pack catalog, per-pack saves | Local co-op gains per-slot keyboard/phone input setup. The obsolete online block is removed. Host save stays host-owned. |
| M2 six room puzzles and Silicon | M4.0a works with any local level. No remote guest. |
| M2 multi-level transitions | Host authority; local transitions unchanged. |
| M2 side travel and map | Host-owned; controller input subset only. |
| M2 conditional dialogue and debrief | Host narrative/curriculum state; controller input subset only. |
| M3 final art/audio/manifest | Controller loads no assets. Host screen uses the normal pack. |
| M3 capture mode | Local-only. |
| Future key rebinding | Local per input source; the protocol carries actions, not physical keys. |
| Future music/ambience | Local playback; no synchronization requirement. |
| Future mobile/touch | The controller page is the touch surface. |
| Future remote online | Not planned (ADR-0081). |

## 8. Risks

| Risk | Mitigation |
|---|---|
| Phone controller feels laggy | Measure input-to-photon; cloud-first then local relay if needed; coyote/jump buffer; keyboard fallback. No prediction. |
| Wi-Fi AP isolation blocks phone↔laptop | Cloud WSS is the default; local relay is optional; add a connection test and clear error. |
| Touch ergonomics are poor for a platformer | Thumb-zone layout, large fixed targets, double-tap dash, progressive verbs, haptics, landscape layout, playtest, keyboard fallback. |
| Double-tap Dash is inaccessible to some players | Documented limitation; the keyboard slot is the fallback; revisit after a wider playtest. |
| Phone sleep/lock drops the socket | Wake lock when available; reconnect; pause; explicit screen-lock guidance. |
| Two-slot hub becomes confusing | K/K default; per-slot QR/status; Start gating; "Use keyboard instead" escape. |
| Input ownership bug or stale latch | Pure arbiter tests; discard on every source change; no double sampling. |
| TV/projector display latency dominates | Game/low-latency mode; keyboard baseline; separate display from network in measurements. |
| Controller page is stale after deploy | Build ID check; reload message; no degraded join. |
| Controller spoofs another slot or host action | Slot-bound connection; host allowlist; ownership validation; no global actions from controllers. |
| Controller session creeps into remote online | ADR-0081: no snapshots, no phone rendering, no remote guest, no prediction. |
| Cloudflare free-tier limits | ADR-0082: daily session/attempt/device budgets, 5-minute sessions, 12k room message cap, 20/s controller rate, signed tickets and device admission, Workers Logs disabled. |
| Evidence trust is overstated | Host-only export; document that controller input is not graded assessment. |
| Keyboard regression | Keyboard-only path stays default; dedicated regression suite at every phase. |

## 9. Verification

Automated:

```sh
npm test
npm run pack:validate
npm run pack:smoke
npm run smoke:e2e
npm run smoke:controller
npm run build
npm run worker:typecheck
npm run worker:dry-run
git diff --check
```

Manual — M4.0a:

- keyboard/keyboard starts and behaves exactly as before;
- keyboard/phone, phone/keyboard, and phone/phone each play one full level;
- host display-only with two phones; laptop keyboard still pauses and opens
  menus;
- QR and six-character code both join the correct slot; third/duplicate
  controllers rejected;
- a random or old QR is rejected at the edge without creating a room; a fourth
  device and a different device on a reserved slot are rejected;
- the device ID is stable across a reconnect and distinct between the two
  phones; the host screen cannot also join as a controller;
- controller disconnect pauses; reconnect within grace restores; keyboard
  fallback resumes that slot;
- host tab hidden/resumed; host leaves; controllers return to the join screen;
- phone screen lock/wake, landscape, multi-touch, wake lock, accessibility;
- phone layout: move + Jump two-thumb test, reach test, Jump on the right;
- dash gesture: double-tap the ◀ / ▶ buttons, single tap does not dash,
  direction matches the tap, first-tap/cooldown/rejection feedback, coach mark,
  controls sheet, keyboard-slot fallback documented;
- dialogue: auto talk/choice, N-to-N choice mapping, no text on phone;
- abilities: locked/unlocked, Dash gesture cooldown, accepted/rejected feedback,
  Throw only while carrying;
- host HUD: phone-slot prompts show action names, not keyboard keys;
- latency measurement on 2.4 GHz, 5 GHz, TV/laptop, cloud in-region, with a
  keyboard baseline;
- free-tier usage after several full 5-minute phone sessions;
- hub shows Solo and Local co-op only; no online mode or host/join panel.

### Deployment

- Static hosting is GitHub Pages, deployed by
  `.github/workflows/deploy-pages.yml`.
- The Worker and both Durable Objects are deployed only by
  `.github/workflows/deploy-worker.yml`.
- The Pages build receives `VITE_NET_URL` and `VITE_BUILD_ID` from CI.
- The Worker is configured by the checked-in `worker/wrangler.jsonc`; its
  `ALLOWED_ORIGINS` includes `https://snorre98.github.io` and local
  development origins only.
- `DEMO_SIGNING_SECRET` is supplied by GitHub Actions, never committed.
- Hash preview origins are not supported for phone pairing. Use the stable
  GitHub Pages URL.

## 10. Scope cuts

### M4.0a — Must ship

- per-slot input plan: keyboard/phone for P1 and P2;
- keyboard co-op remains the default and fallback;
- host display-only mode with two phones;
- pure input arbiter with no double-sampling;
- controller role, slot reservation, and third/duplicate rejection;
- signed room tickets, server-issued device IDs, and the three-device admission
  cap;
- QR and six-character code pairing;
- the demo quota guard, 5-minute session cap, message/rate caps, and Workers
  Logs disabled;
- controller page with no game assets or game state;
- validated, coalesced controller input applied at the fixed step;
- reconnect, pause, and keyboard fallback;
- host-only actions, save, and evidence;
- latency instrumentation and a recorded playtest;
- coyote time and jump buffering;
- browser-touch smoke and unit/integration coverage;
- removal of the online placeholder and catalog flag;
- deployed Pages + Worker + DO;
- docs.

### M4.0a — Can defer without invalidating the architecture

- local relay (only if measurements require it);
- PWA/home-screen installation;
- haptics on iOS (not supported);
- private dialogue choices on the phone;
- mid-run hot-swap beyond the disconnect fallback;
- controller-initiated pause;
- gamepad adapter;
- third player/spectator.

### M4.0a — Do not cut

- keyboard co-op as default and fallback;
- host authority;
- one active source per player slot;
- controller input-only rule and no game state on the phone;
- P1/P2 attribution;
- host-only save/evidence;
- slot ownership validation;
- signed room tickets and server-issued device admission;
- one host plus two controller sockets, enforced before accept;
- reconnect/failure UX;
- Origin and rate limits;
- demo quota guard and Workers Logs disabled;
- latency measurement;
- same-room product boundary (no remote guest).

### Not planned

- M4.0b remote guest rendering, snapshots, interpolation, prediction, guest
  save/evidence, two-browser E2E;
- M4.1 full-pack online;
- remote matchmaking, accounts, lobbies, spectators, chat, voice.

## 11. Open decisions

M4.0a decisions, all with the same recommended direction unless the user
changes them:

- One QR per phone slot; clearer for a demo.
- Reset the input plan to K/K on return to the hub; less surprise.
- Show dialogue buttons on the phone; keep reading on the shared screen.
- Allow keyboard↔phone hot-swap only through the disconnect fallback.
- Do not build a local relay unless measurements require it.
- Do not allow pause from the phone.
- Do not require PWA/home-screen installation.
- Keep p95 ≤ 120 ms as the target; revise only after the Phase 7 measurement.
- Show RTT on the controller.
- Show per-slot connection status in the hub and pause overlay, not as
  gameplay HUD clutter.

The same-room decision is closed: no remote guest, no fourth device.

## 12. Relationship to other documents

- [`../adr-controller/README.md`](../adr-controller/README.md) — active
  controller domain, including ADR-0081, ADR-0082, and ADR-0083–0087.
- [`../adr-controller/0082-demo-quota-guard-and-device-admission.md`](../adr-controller/0082-demo-quota-guard-and-device-admission.md)
  — demo quota guard, signed tickets, device admission, and the three-socket cap.
- [`../adr-controller/0083-controller-thumb-zone-layout.md`](../adr-controller/0083-controller-thumb-zone-layout.md),
  [`0084`](../adr-controller/0084-ephemeral-controller-control-state.md),
  [`0085`](../adr-controller/0085-dialogue-control-and-choice-presentation.md),
  [`0086`](../adr-controller/0086-ability-disclosure-and-feedback.md), and
  [`0087`](../adr-controller/0087-controller-gesture-vocabulary.md) — Phase 6.5
  controller ergonomics, control descriptors, dialogue, abilities, and gestures.
- [`phone-coop-implementation-plan.md`](phone-coop-implementation-plan.md) —
  M4.0a implementation plan.
- [`../adr-online/README.md`](../adr-online/README.md) — historical remote-guest
  domain; not an active plan.
- [`../m1.9/README.md`](../m1.9/README.md) — bathroom hub, pack catalog, and
  per-pack saves; M4.0a adds the local-co-op phone setup.
- [`../m1.75/README.md`](../m1.75/README.md) — feedback, co-op attribution, and
  effect composition.
- [`../m1.8/README.md`](../m1.8/README.md) — material and pattern layer.
- [`../m2/nervous-puzzles/README.md`](../m2/nervous-puzzles/README.md) — six room
  puzzles and Silicon.
- [`../m3/asset-requirements-v01.md`](../m3/asset-requirements-v01.md) — M3 art
  and audio scope.
- [`../puzzle-engine/architecture.md`](../puzzle-engine/architecture.md) —
  local-only deployment statement that M4.0a amends for the optional controller
  input path.

## Appendix A — Remote guest co-op (not planned, historical)

This appendix preserves the previous M4.0b/M4.1 intent for historical precedent.
Do not implement it.

### A.1 Old scope

M4.0b was a one-level remote co-op mode: one host and one guest, room-code join,
host-authoritative `GameRuntime` and `RoomSimulation`, a guest thin client that
renders host world/UI snapshots, guest P2 input, host-owned gate/debrief/pause/
map/evidence, reconnect, version handshake, and a two-browser E2E. M4.1 extended
the same model to the full M2 pack.

### A.2 Old architecture

- Host browser owns the simulation, puzzle, progression, narrative, feedback,
  save, evidence, and authoritative clock.
- Guest browser loads the same build and pack, sends P2 input, and renders host
  state. It does not step gameplay simulation.
- `RunSnapshot` on join; `NetWorld` at ~20 Hz; `NetUi` at ~10 Hz or on change;
  guest input at 30–60 Hz; 100 ms interpolation buffer; freeze after 500 ms.
- No prediction, rollback, lockstep, server simulation, asset streaming, or host
  migration.
- The Worker/DO relays messages and stores membership; it does not run a game
  loop.

### A.3 Why it was retired

ADR-0081 decided the product is same-room and shared-screen. A remote guest adds
a fourth device and a large snapshot/rendering layer with no product need. The
Cloudflare relay remains, but only as an input relay.

### A.4 Historical estimate

The old plan estimated roughly 14–20 focused days for full M4.0b, or a 5–8 day
spike with host-only gate/debrief, no prediction, and a two-browser smoke. That
estimate is historical only; it is not active work.

### A.5 Historical records

- [Online ADR domain](../adr-online/README.md) — ADR-0047–0057, retained with
  historical status.
- ADR-0049 §3–§6 — historical world/UI snapshots, interpolation, input subset.
- ADR-0052 — historical composition with the finished content layers.
- ADR-0055/0057 — deployment and IaC lessons still relevant to the input relay.
