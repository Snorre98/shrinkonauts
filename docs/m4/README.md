# M4 — Multiplayer Ladder (Phone Co-op → Online Co-op)

- **Status:** Proposed, 2026-10-28; M4.0a added 2026-11-01
- **Owner:** Snorre
- **Scope:** M4.0a phone-controller same-screen co-op; M4.0b one-level
  host-authoritative online co-op, with an architecture that extends to the M2
  pack
- **Depends on:** M4.0a depends on M1.75 per-player input; M4.0b additionally
  depends on M1.8, M2, and M3
- **ADR domains:** [`../adr-controller/README.md`](../adr-controller/README.md) —
  ADR-0066–0069 (M4.0a); [`../adr-online/README.md`](../adr-online/README.md) —
  ADR-0047–0057 (M4.0b)
- **M4.0a plan:** [`phone-coop-implementation-plan.md`](phone-coop-implementation-plan.md)
- **Baseline:** the M3 final `03-nerve-forest` slice plus the M2 pack for M4.0b;
  the current local co-op slice for M4.0a

## 1. Why M4 exists

M1 through M3 prove the local co-op learning game: one browser, two players,
shared camera and tether, puzzles, feedback, materials, final art, and evidence.
M4 adds multiplayer in two phases:

- **M4.0a — phone co-op (same screen).** One or two players use phones as
  controllers while one host browser owns the world and renders the shared
  screen. The phone sends input only; it receives no game state. Keyboard co-op
  remains the default and the fallback. This is the first phase and the tracer
  bullet for M4.0b.
- **M4.0b — remote co-op (online).** A second browser joins with a room code,
  renders the host world, and sends P2 input. The host remains authoritative.
  This is the existing M4 scope.

M4.0a is content-independent and can ship before M2/M3. M4.0b consumes the
finished layers. M4.1 extends M4.0b to the full M2 pack.

M4.0b adds a second browser without changing the game’s authority model:

- one player hosts the authoritative run;
- one guest joins with a room code;
- the guest is a thin renderer and input source, not a second simulation;
- both players see the same host-owned world, puzzle, feedback, and conversation
  state;
- the host owns save and evidence.

M4.0a deliberately does not render on the phone. It is an input-device phase,
not a second game client. The keyboard path remains a first-class option for
every local co-op session.

M4.0b is deliberately the **last planned core milestone**. It consumes the
finished M1.75, M1.8, M2, and M3 layers. It is not a prerequisite for any of
them and does not change their acceptance criteria. M4.0a is the earlier,
content-independent phase.

The milestone is not a general multiplayer platform. It is a two-player
continuation of the existing local co-op loop, first on one shared screen and
then across two browsers.

Throughout this document, **M4.0a** is the phone-controller phase,
**M4.0b** is the committed remote-co-op scope: one level, host-owned
gate/debrief/pause, no prediction, and no host migration. **M4.1** is a future
extension for the full M2 pack and guest-initiated assessment flow; it is not
part of this milestone’s definition of done.

## 2. Milestone boundary

### 2.1 M4.0a — Phone co-op (first phase)

| In scope | Out of scope |
|---|---|
| One or two phone controllers on one shared screen | Phone-rendered game view or video streaming |
| Per-player input slots: P1/P2 each keyboard or phone | A second game client, world/UI snapshots, or interpolation |
| Keyboard co-op remains the default and fallback | Replacing the keyboard path with phones |
| Host-authoritative `GameRuntime` and `RoomSimulation` | Deterministic lockstep or server-authoritative physics |
| Movement, tether, camera, scan, interact, carry, throw, pulse | New verbs, puzzles, abilities, or content |
| Both players’ entity conversations and feedback | Free-text chat or voice |
| Host-owned save, evidence, and P1/P2 attribution | Controller save/evidence or trusted public assessment |
| QR/code pairing, slot reservation, reconnect, keyboard fallback | Accounts, matchmaking, lobbies, spectators |
| Cloudflare Worker + one Durable Object per room | Cloudflare Containers, server game loop, or paid plan |
| Security, rate limits, Origin allowlist, abuse boundaries | Anti-cheat or public matchmaking |
| Unit, integration, browser touch, latency playtest | Bluetooth, native apps, console, mobile game client |

### 2.2 M4.0b — Remote co-op

| In scope | Out of scope |
|---|---|
| One online level: `03-nerve-forest` with M3 assets | Full M2 pack online; that is M4.1 |
| One host and one guest, room-code join | Matchmaking, accounts, lobbies, spectators |
| Host-authoritative `GameRuntime` and `RoomSimulation` | Deterministic lockstep or server-authoritative physics |
| Guest thin client: remote world + host `RuntimeSnapshot` | Guest-side prediction or rollback |
| P1 host, P2 guest; local key mapping per client | Reassignable player slots |
| Movement, tether, camera, scan, interact, carry, throw, pulse | New verbs, puzzles, abilities, or content |
| Both players’ entity conversations | Free-text chat or voice |
| Host-owned gate, debrief, pause, map, evidence export in M4.0b | Guest-initiated gate/debrief/pause in M4.0b |
| Host save; guest memory/no-op save | Guest save files or guest evidence export |
| Reconnect window, host-visibility pause, version handshake | Host migration or persistent rooms |
| Cloudflare Worker + one Durable Object per room | Cloudflare Containers, server game loop, or paid plan |
| Security, rate limits, Origin allowlist, abuse boundaries | Anti-cheat, public matchmaking, or trusted assessment |
| Unit, integration, two-browser E2E, latency playtest | Mobile game client, console, or native clients |

## 3. Dependency and ordering

```text
M1.75  feedback, effects, entity conversations, per-player input
  │
  ├──────────────► M4.0a  phone co-op (same screen, input only)
  │
  ↓
M1.8   materials, patterns, autotiling, atlases
  ↓
M2     six room puzzles + Silicon design/content
  ↓
M3     final art/audio for the 03 capture slice
  ↓
M4.0b  remote co-op for the M3 slice
  ↓
M4.1   full M2 pack online
```

M4.0a assumes:

- M1.75 Phases 4–8 are complete, especially per-player input, anchored
  feedback surfaces, entity conversations, and co-op attribution.
- The local keyboard co-op path is accepted and regression-tested.
- No M1.8, M2, or M3 content dependency; the phone loads no pack or assets.

M4.0b additionally assumes:

- M1.8 is accepted and implemented: materials, `tileMaterials`, autotiling,
  variants, pattern projection, atlas assets, and UI parity.
- M2 is authored and frozen: the six room puzzles and the Silicon fixture design,
  including multi-level transitions and the M2 content freeze.
- M3 is complete: the final `03-nerve-forest` art/audio, the final manifest, and
  the capture build are frozen.

If any of those milestones changes after M4.0a or M4.0b starts, that phase is
re-baselined. M4 must not become a parallel implementation of feedback,
dialogue, materials, or content. M4.0a must not block on M1.8/M2/M3, and M4.0b
must not absorb M4.0a's controller scope.

## 4. Deliverables

### M4.0a — Phone co-op

- [ ] [ADR-0066–0069](../adr-controller/README.md) accepted and indexed.
- [ ] `docs/adr-controller/` is the durable home for the controller phase.
- [ ] [`phone-coop-implementation-plan.md`](phone-coop-implementation-plan.md) is
  approved as the M4.0a authority.
- [ ] Local co-op exposes `P1: Keyboard | Phone` and `P2: Keyboard | Phone`;
  keyboard/keyboard remains the default.
- [ ] All four plans work from the hub: K/K, K/P, P/K, P/P.
- [ ] The host can be display-only when both slots use phones; the laptop
  keyboard still handles host-only actions.
- [ ] Keyboard co-op remains available and is the fallback when a phone session
  fails.
- [ ] A pure input arbiter samples one active source per player slot; no
  double-sampling and no cross-slot leakage.
- [ ] The controller role claims exactly one slot; a third controller, duplicate
  slot, and unopened slot are rejected.
- [ ] The host creates a room with the phone-enabled slots; controllers join by
  QR or six-character code.
- [ ] The controller page is a separate static entry with no Phaser, pack
  loader, game assets, or game state.
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
- [ ] Unit, integration, browser-touch, and manual tests cover K/K, K/P, P/K,
  P/P, reconnect, fallback, and security.
- [ ] The local-only statements in `architecture.md`, `failure-semantics.md`,
  `concurrency-topology.md`, `module-boundaries.md`, and `interface.md` are
  amended for the optional controller path.

The remaining deliverables in §4 are M4.0b unless explicitly marked.

### Architecture and ADRs

- [ ] ADR-0047–0057 accepted and indexed.
- [ ] `docs/adr-online/` is the durable home for the domain.
- [ ] IaC ownership is explicit: Wrangler owns the Worker/DO; Terraform, if
  present, owns only account-level resources (ADR-0057).
- [ ] Architecture, contracts, and traceability link the online boundary.
- [ ] The local-only statements in `architecture.md`, `failure-semantics.md`,
  and `concurrency-topology.md` are amended for an optional online mode, not
  silently contradicted.
- [ ] M1.9's bathroom hub is the lobby surface. M4.0a adds a local-co-op phone
  setup panel and leaves the disabled online block in place; M4.0b replaces the
  online block rather than duplicating it.

### Session and transport

- [ ] Worker endpoint `/ws` validates upgrade and routes to one Durable Object
  per room code.
- [ ] Host creates a room; guest joins with a 6-character code; third connection
  is rejected.
- [ ] Host/guest roles, protocol version, build ID, pack version, and content
  version are exchanged before start.
- [ ] Heartbeat, reconnect window, host-left handling, and room expiry work.
- [ ] DO uses WebSocket hibernation; no game loop or Matter.js runs in the DO.
- [ ] `worker/wrangler.jsonc` is checked in, pinned, and uses `exports` for the
  `GameRoom` class.
- [ ] `npx wrangler deploy --dry-run` validates the Worker config without
  deploying.

### Bathroom lobby

- [ ] The M1.9 hub's disabled online block is replaced by Host / Join controls.
- [ ] Host selects the cycle and owns the room code; the guest sees the host's
  pack read-only.
- [ ] Both clients load the selected pack and send ready before the host can
  start.
- [ ] The launch cinematic runs locally on both clients after the host's start;
  the host then sends the initial run state.
- [ ] Guest local save remains a memory/no-op slot; Continue is hidden for the
  guest.
- [ ] Host departure or session end returns both clients to the bathroom hub.
- [ ] M4.0b marks only `anatomy-reflex` as online-ready; Silicon online is M4.1.

### Host authority and guest view

- [ ] Host keeps the authoritative `GameRuntime` and `RoomSimulation`.
- [ ] Guest does not step gameplay simulation.
- [ ] Guest renders host world snapshots with interpolation.
- [ ] Guest UI consumes host `RuntimeSnapshot` for world, feedback, puzzle,
  gate, map, concept log, and debrief views.
- [ ] Guest preserves local audio and accessibility settings.
- [ ] Initial join uses a host `RunSnapshot` or equivalent full state.

### Co-op parity

- [ ] Host controls P1; guest controls P2.
- [ ] Each client uses its own local key map; host disables local P2 sampling.
- [ ] Guest input frames are validated, sequenced, and applied by the host at
  the next fixed step.
- [ ] Camera and tether follow host state for both clients.
- [ ] Both players can scan, interact, carry, throw, and pulse.
- [ ] Both players can start and advance their own entity conversations.
- [ ] Feedback surfaces carry `actor`, `owner`, and accent for P1/P2.
- [ ] Host-owned gate, debrief, pause, and map are visible to the guest but not
  guest-controlled in M4.0b.

### Persistence and evidence

- [ ] Host owns `shrinkonauts.run` autosave and restore.
- [ ] Guest uses a memory/no-op save port and never writes the host run.
- [ ] Guest actions are recorded once on the host and attributed as P2.
- [ ] Host export includes both players’ learning events.
- [ ] Guest cannot export evidence or spoof P1/host-only actions.
- [ ] Host departure ends the session; evidence is not recoverable from a guest.

### Failure, security, deployment

- [ ] Guest disconnect pauses the host session; reconnect within the grace
  window restores the same role and state.
- [ ] Host tab hidden pauses the session and tells the guest; visible resumes.
- [ ] Version mismatch, bad Origin, oversize message, rate limit, third player,
  and protocol error produce clear, non-destructive failures.
- [ ] `VITE_NET_URL` configures the Pages build; Worker and DO deploy separately.
- [ ] Worker deploy/rollback and Pages deploy/rollback are documented.
- [ ] Wrangler is pinned; CI uses that version and never a global install.
- [ ] Terraform is either absent or limited to account-level resources; no
  resource is dual-managed.
- [ ] Free-tier usage is measured and documented.

### Verification

- [ ] Unit tests cover protocol, snapshot application, input coalescing,
  ownership, version, save/evidence, and failure mapping.
- [ ] Node integration tests drive host runtime + fake transport + guest adapter
  without DOM or Phaser.
- [ ] Two-browser Playwright test covers host create, guest join, both move,
  conversation, puzzle/gate, debrief, export, reconnect, and version mismatch.
- [ ] Manual latency, host-tab, guest-tab, heartbeat, accessibility, and
  materials/effects checks pass.
- [ ] All existing M1–M3 commands pass.

## 5. Definition of done

### 5.1 M4.0a — Phone co-op

M4.0a is done when:

1. ADR-0066–0069 are accepted and the M4.0a implementation plan is the
   authority for the controller phase.
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
12. Unit, integration, browser-touch, and manual tests pass; the existing
    `npm test`, `npm run pack:validate`, `npm run pack:smoke`,
    `npm run smoke:e2e`, `npm run build`, and `git diff --check` also pass.
13. Docs are updated: controller ADR index, M4 README, architecture/contracts,
    README/IMPLEMENTATION status, and the playtest note.

### 5.2 M4.0b — Remote co-op

M4.0b is done when:

1. The online ADR domain is accepted and the M4.0b plan is the authority for
   remote work.
2. A host can create a room and a guest can join with a code; a third player is
   rejected.
3. Both players control one character each; movement, tether, camera, and
   puzzle interactions match the host’s local co-op behaviour.
4. The guest never runs authoritative gameplay simulation and never diverges
   from host puzzle/gate state.
5. P1/P2 attribution is visible on feedback, effects, and conversations.
6. Host save and evidence are the only durable outputs; guest save is a no-op.
7. Guest actions are recorded once and attributed to P2.
8. Host visibility, guest disconnect/reconnect, host departure, version
   mismatch, and bad input are handled without corrupting the run.
9. All online messages are schema-validated, size-capped, rate-limited, and
   Origin-checked.
10. Local single-player and local co-op behaviour is unchanged.
11. `npm test`, `npm run pack:validate`, `npm run pack:smoke`,
    `npm run smoke:e2e`, `npm run build`, and `git diff --check` pass.
12. The new online test commands pass in CI and a two-browser manual playtest is
    recorded honestly.
13. IaC ownership is explicit and enforced: Wrangler owns the Worker/DO;
    Terraform, if present, owns only account-level resources; no dual-managed
    resource exists.

## 6. Phases and estimates

Focused effort, not calendar time. Part-time work roughly doubles the elapsed
range.

### 6.1 M4.0a — Phone co-op

The detailed plan is
[`phone-coop-implementation-plan.md`](phone-coop-implementation-plan.md). Summary:

| Phase | Focus | Est. | Exit |
|---|---|---:|---|
| 0 | Accept controller ADRs, approve plan, amend local-only contracts | 0.5–1 d | ADRs accepted; plan authoritative |
| 1 | Input contracts and pure arbiter | 1–1.5 d | K/K, K/P, P/K, P/P unit coverage |
| 2 | Protocol, transport seam, remote source, fake transport | 1–1.5 d | Host runs all four plans without a Worker |
| 3 | Worker, DO, room codes, slot reservation, limits | 1.5–2 d | Two controllers join; third/duplicate rejected |
| 4 | Host session wiring, pause, keyboard fallback | 1 d | Real session drives the arbiter |
| 5 | Controller web app, touch layout, reconnect | 1.5–2 d | Phone joins and controls one slot |
| 6 | Hub input setup, QR pairing, start gating | 1–1.5 d | All four plans start from the hub |
| 7 | Latency measurement, coyote/buffer, playtest, docs | 1–1.5 d | DoD met or fallback documented |

**Total:** roughly **8–11 focused days**, including the Worker/DO that M4.0b
will reuse. If the Worker/DO already exists, the incremental controller work is
roughly **5–7 focused days**.

### 6.2 M4.0b — Remote co-op

| Phase | Focus | Est. | Exit |
|---|---|---:|---|
| 0 | Accept online ADRs, freeze baseline, amend local-only contracts | 1 d | ADRs accepted; M4.0b plan authoritative |
| 1 | Worker, DO, wrangler config, room code, roles, version handshake, heartbeat | 2 d | Host/guest connect; third rejected |
| 1.5 | Bathroom lobby: host/join, pack lock, ready/start barrier, guest save | 1.5 d | Hub starts the online session |
| 2 | Host snapshot publisher, guest remote world, guest UI mirror | 3 d | Guest renders host state without simulation |
| 3 | Guest input relay, host merge, P1/P2 movement, tether/camera | 3 d | Both players move and interact |
| 4 | Conversations, feedback/effects, gate/debrief views, host-only modals | 2 d | Co-op surfaces and attribution work |
| 5 | Host save/evidence, guest memory save, security and rate limits | 2 d | Durable outcomes are host-only |
| 6 | Reconnect, visibility, deployment/IaC check, two-browser E2E, playtest, docs | 3 d | Definition of done met |

**Total:** roughly **14–20 focused days**. A **5–8 day M4.0b spike** is possible
if gate/debrief stay host-only, prediction is omitted, and the verification is
limited to a two-browser smoke. That spike is not the full milestone. M4.0a's
Worker/DO is shared infrastructure and is not counted twice if both phases are
built together.

## 7. Compatibility with planned features

| Planned feature | M4 treatment |
|---|---|
| M1.75 per-player input, ownership, surfaces | Both phases reuse the per-player model. Controllers route to the assigned slot; no new attribution model. |
| M1.75 feedback ECS, surfaces, beats | Host computes; M4.0b guest renders host feedback. No guest feedback director. M4.0a has no remote feedback surface. |
| M1.75 entity conversations | Host owns narrative sessions; guest/controller surfaces can be owned by P1 or P2; actions are routed to the host. |
| M1.75 effects and tile visuals | Host computes; M4.0b guest mirrors effect/tile-visual plans; effects remain cosmetic and never collision. |
| M1.8 materials, patterns, autotiling, variants | M4.0b clients load the same pack/build. No textures or atlas data cross the wire. M4.0a phones load no content. |
| M1.8 UI material/pattern parity | M4.0b guest UI uses host `RuntimeSnapshot` and its own local theme/CSS. M4.0a phone UI is controller-only. |
| M1.9 bathroom hub, pack catalog, per-pack saves | Local co-op gains per-slot keyboard/phone input setup. The online block remains for M4.0b. Host save stays host-owned. |
| M2 six room puzzles and Silicon | M4.0b ships `03-nerve-forest` only. Session state is level-scoped; M4.1 extends to the full pack. M4.0a works with any local level. |
| M2 multi-level transitions | Host authority; M4.0b guest follows host `levelId`/`roomId`; guest rebuilds its scene through the existing level-change port. |
| M2 side travel and map | Host-owned in M4.0b; guest sees host map; guest-initiated travel is deferred. |
| M2 conditional dialogue and debrief | Host narrative/curriculum state; M4.0b guest mirrors; host-only answers in M4.0b. |
| M3 final art/audio/manifest | No new asset IDs; M4.0b clients load the same static build; audio is local; no audio streaming. |
| M3 capture mode | Local-only. M4.0b does not add networked capture; host capture is a future local feature. |
| Future key rebinding | Local per client; the protocol carries actions, not physical keys. |
| Future music/ambience | Local playback; no synchronization requirement. |
| Future mobile/touch | M4.0a adds a phone controller page with touch input. A mobile game client/rendering remains out of scope. |
| Future full-pack online | M4.1 or later; requires no authority change, but needs level/session lifecycle tests. |

## 8. Risks

| Risk | Mitigation |
|---|---|
| Phone controller feels laggy | Measure input-to-photon; cloud-first then local relay if needed; coyote/jump buffer; keyboard fallback. No prediction. |
| Wi-Fi AP isolation blocks phone↔laptop | Cloud WSS is the default; local relay is optional; add a connection test and clear error. |
| Touch ergonomics are poor for a platformer | Large fixed targets, contextual verbs, haptics, landscape layout, playtest, keyboard fallback. |
| Phone sleep/lock drops the socket | Wake lock when available; reconnect; pause; explicit screen-lock guidance. |
| Two-slot hub becomes confusing | K/K default; per-slot QR/status; Start gating; "Use keyboard instead" escape. |
| Input ownership bug or stale latch | Pure arbiter tests; discard on every source change; no double sampling. |
| TV/projector display latency dominates | Game/low-latency mode; keyboard baseline; separate display from network in measurements. |
| Controller page is stale after deploy | Build ID check; reload message; no degraded join. |
| Controller spoofs another slot or host action | Slot-bound connection; host allowlist; ownership validation; no global actions from controllers. |
| Controller session creeps into M4.0b | Non-goals: no snapshots, no phone rendering, no prediction; separate phases and ADR domains. |
| Guest input feels laggy | Measure RTT; accept for co-op puzzles; add guest prediction only as a separate ADR/increment. |
| Host tab backgrounded | `visibilitychange` pauses the session and notifies the guest/controllers; no background simulation. |
| Snapshot size or rate | 20 Hz world, 10 Hz UI; compact fields; cap message size; measure. |
| Version skew from GitHub Pages cache | Build ID + pack/content version handshake for M4.0b; build/protocol only for controllers. |
| Guest UI callback surface grows | M4.0b host-only gate/debrief/pause; route only guest-owned conversation and gameplay actions. |
| Save/evidence trust | Host-only save/export; guest memory save; controller is input-only; document that neither is trusted public assessment. |
| Cloudflare free-tier limits | Two-player sessions are small; measure; cap message rate; use hibernation. |
| WebSocket idle timeout | 20–30 s heartbeat; reconnect with backoff. |
| Host departure | No host migration; end cleanly and tell the guest/controllers. |
| Two-browser test flakiness | Deterministic protocol fixtures; local Worker; retries only at the E2E layer. |
| Coupling to unfinished milestones | M4.0a starts after M1.75; M4.0b starts after M3; re-baseline per phase. |
| Wrangler/Terraform dual ownership or drift | ADR-0057 defines one owner per resource; no dual-managed Worker, DO, route, or DNS record. |

## 9. Verification

Automated:

```sh
npm test
npm run pack:validate
npm run pack:smoke
npm run smoke:e2e
npm run build
git diff --check
# M4.0a controller suites, names provisional
npm run test:controller
npm run smoke:controller
# M4.0b online suites, names provisional
npm run test:online
npm run smoke:online
npx wrangler deploy --dry-run
# only if infra/terraform exists
terraform fmt -check
terraform validate
terraform plan
```

Manual — M4.0a:

- keyboard/keyboard starts and behaves exactly as before;
- keyboard/phone, phone/keyboard, and phone/phone each play one full level;
- host display-only with two phones; laptop keyboard still pauses and opens
  menus;
- QR and six-character code both join the correct slot; third/duplicate
  controllers rejected;
- controller disconnect pauses; reconnect within grace restores; keyboard
  fallback resumes that slot;
- host tab hidden/resumed; host leaves; controllers return to the join screen;
- phone screen lock/wake, landscape, multi-touch, wake lock, accessibility;
- latency measurement on 2.4 GHz, 5 GHz, TV/laptop, cloud in-region, with a
  keyboard baseline;
- free-tier usage after a 30-minute phone session.

Manual — M4.0b:

- host creates a room; guest joins; third join rejected;
- both players move, tether, scan, interact, carry, throw, pulse;
- two simultaneous entity conversations with P1/P2 attribution;
- Node Run (the M2 replacement for Signal Ferry) and debrief host flow
  mirrored to guest;
- guest disconnect/reconnect; host tab hidden/resumed; host leaves;
- version mismatch, bad Origin, oversize message, rate limit;
- final M3 assets, M1.8 materials/patterns, reduced motion, text scale;
- latency measurement in-region and cross-region;
- free-tier usage after a 30-minute session.

## 10. Scope cuts

### M4.0a — Must ship

- per-slot input plan: keyboard/phone for P1 and P2;
- keyboard co-op remains the default and fallback;
- host display-only mode with two phones;
- pure input arbiter with no double-sampling;
- controller role, slot reservation, and third/duplicate rejection;
- QR and six-character code pairing;
- controller page with no game assets or game state;
- validated, coalesced controller input applied at the fixed step;
- reconnect, pause, and keyboard fallback;
- host-only actions, save, and evidence;
- latency instrumentation and a recorded playtest;
- coyote time and jump buffering;
- browser-touch smoke and unit/integration coverage;
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
- third player/spectator;
- full M2 pack online (M4.1).

### M4.0a — Do not cut

- keyboard co-op as default and fallback;
- host authority;
- one active source per player slot;
- controller input-only rule and no game state on the phone;
- P1/P2 attribution;
- host-only save/evidence;
- slot ownership validation;
- reconnect/failure UX;
- Origin and rate limits;
- latency measurement.

### M4.0b — Must ship

- host-authoritative thin client;
- room code and two-player cap;
- P1/P2 movement and core puzzle interactions;
- host feedback/conversation/effect mirroring;
- host-only save and evidence;
- version handshake, heartbeat, reconnect, host visibility;
- Origin/rate/size validation;
- checked-in `worker/wrangler.jsonc` with pinned Wrangler and `exports`;
- two-browser smoke and unit/integration coverage;
- deployed Pages + Worker + DO.

### M4.0b — Can defer without invalidating the architecture

- guest-initiated gate, debrief, pause, map, and evidence;
- guest prediction;
- full M2 pack online (M4.1);
- host migration;
- custom domain;
- Terraform account layer (Wrangler-only is enough for M4);
- binary protocol;
- spectator mode;
- display names or chat.

### M4.0b — Do not cut

- host authority;
- guest no-simulation rule;
- P1/P2 attribution;
- host-only save/evidence;
- version handshake;
- Origin and rate limits;
- reconnect/failure UX;
- local co-op regression coverage;
- M4.0a keyboard/controller regression coverage.

## 11. Open decisions

### M4.0a

- Should the hub show one QR per phone slot or one QR with a slot picker?
  Recommendation: one QR per slot; clearer for a demo.
- Should a local relay be built now? Recommendation: no; cloud-first, add only
  if the latency measurements require it.
- Should dialogue text/choices appear on the phone? Recommendation: buttons
  only; keep reading on the shared screen for the social benefit.
- Should keyboard↔phone hot-swap be allowed beyond the disconnect fallback?
  Recommendation: no; use the pause/disconnect fallback only.
- Should the phone be able to pause? Recommendation: no; host-only in M4.0a.
- Should the input plan be remembered across sessions? Recommendation: reset to
  K/K on return; less surprise.
- Should PWA/home-screen installation be required? Recommendation: optional;
  wake lock is best-effort.
- Is p95 ≤ 120 ms the right latency target? Recommendation: yes; revise only
  after the Phase 7 measurement.

### M4.0b

- Should M4.0b allow guest gate/debrief participation, or keep them host-only?
  Recommendation: host-only for M4.0b; route guest answers in M4.1.
- Should M4.0b include guest movement prediction? Recommendation: no; measure
  first.
- Should M4.0b ship one level or the full M2 pack? Recommendation: one level
  (`03-nerve-forest`), with M2 pack tests; full pack is M4.1.
- Should the Worker use `workers.dev` or a custom domain? Recommendation:
  `workers.dev` for M4.
- Should Terraform be introduced in M4? Recommendation: no; Wrangler only for
  M4, with Terraform reserved for a future custom domain/multi-Worker account
  layer.
- What is the guest reconnect grace window? Recommendation: 60 seconds.
- What happens to evidence if the host leaves? Recommendation: session ends and
  evidence is lost; documented, not recovered from the guest.
- Do players get display names? Recommendation: no; “P1”/“P2” only.

## 12. Relationship to other documents

- [`../adr-controller/README.md`](../adr-controller/README.md) — phone
  controller ADR domain index (M4.0a).
- [`phone-coop-implementation-plan.md`](phone-coop-implementation-plan.md) —
  M4.0a implementation plan.
- [`../adr-online/README.md`](../adr-online/README.md) — online ADR domain index
  (M4.0b).
- [`../adr-online/0057-infrastructure-as-code-deployment-ownership.md`](../adr-online/0057-infrastructure-as-code-deployment-ownership.md)
  — Wrangler/Terraform ownership and deployment boundary.
- [`../m1.9/README.md`](../m1.9/README.md) — bathroom hub, pack catalog, and
  per-pack saves; M4.0a adds the local-co-op phone setup.
- [`../m1.75/README.md`](../m1.75/README.md) — feedback, co-op attribution, and
  effect composition.
- [`../m1.8/README.md`](../m1.8/README.md) — material and pattern layer.
- [`../m2/nervous-puzzles/README.md`](../m2/nervous-puzzles/README.md) — six room
  puzzles and Silicon.
- [`../m3/asset-requirements.md`](../m3/asset-requirements.md) — M3 art/audio
  scope.
- [`../puzzle-engine/architecture.md`](../puzzle-engine/architecture.md) —
  local-only deployment statement that M4 amends for the optional controller
  and online modes.
- [`../puzzle-engine/contracts/failure-semantics.md`](../puzzle-engine/contracts/failure-semantics.md)
  and [`../puzzle-engine/contracts/concurrency-topology.md`](../puzzle-engine/contracts/concurrency-topology.md)
  — local-only assumptions that the controller and online ADRs narrow for
  optional remote-input sessions only.
