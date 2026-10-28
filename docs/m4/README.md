# M4 — Online Co-op (Host-Authoritative Thin Client)

**Status:** Proposed, 2026-10-28  
**Owner:** Snorre  
**Scope:** one-level online co-op for the M3 capture slice, with an architecture
that extends to the M2 pack  
**Depends on:** M1.75, M1.8, M2, M3  
**ADR domain:** [`../adr-online/README.md`](../adr-online/README.md) — ADR-0047–0057  
**Baseline:** the M3 final `03-nerve-forest` slice plus the M2 pack.

## 1. Why M4 exists

M1 through M3 prove the local co-op learning game: one browser, two players,
shared camera and tether, puzzles, feedback, materials, final art, and evidence.
M4 adds a second browser without changing the game’s authority model:

- one player hosts the authoritative run;
- one guest joins with a room code;
- the guest is a thin renderer and input source, not a second simulation;
- both players see the same host-owned world, puzzle, feedback, and conversation
  state;
- the host owns save and evidence.

M4 is deliberately the **last planned core milestone**. It consumes the finished
M1.75, M1.8, M2, and M3 layers. It is not a prerequisite for any of them and
does not change their acceptance criteria.

The milestone is not a general multiplayer platform. It is a two-player online
continuation of the existing local co-op loop.

Throughout this document, **M4.0** is the committed scope: one level, host-owned
gate/debrief/pause, no prediction, and no host migration. **M4.1** is a future
extension for the full M2 pack and guest-initiated assessment flow; it is not
part of this milestone’s definition of done.

## 2. Milestone boundary

| In scope | Out of scope |
|---|---|
| One online level: `03-nerve-forest` with M3 assets | Full M2 pack online; that is M4.1 |
| One host and one guest, room-code join | Matchmaking, accounts, lobbies, spectators |
| Host-authoritative `GameRuntime` and `RoomSimulation` | Deterministic lockstep or server-authoritative physics |
| Guest thin client: remote world + host `RuntimeSnapshot` | Guest-side prediction or rollback |
| P1 host, P2 guest; local key mapping per client | Reassignable player slots |
| Movement, tether, camera, scan, interact, carry, throw, pulse | New verbs, puzzles, abilities, or content |
| Both players’ entity conversations | Free-text chat or voice |
| Host-owned gate, debrief, pause, map, evidence export in M4.0 | Guest-initiated gate/debrief/pause in M4.0 |
| Host save; guest memory/no-op save | Guest save files or guest evidence export |
| Reconnect window, host-visibility pause, version handshake | Host migration or persistent rooms |
| Cloudflare Worker + one Durable Object per room | Cloudflare Containers, server game loop, or paid plan requirement |
| Security, rate limits, Origin allowlist, abuse boundaries | Anti-cheat, public matchmaking, or trusted assessment |
| Unit, integration, two-browser E2E, latency playtest | Mobile/touch support, console, or native clients |

## 3. Dependency and ordering

```text
M1.75  feedback, effects, entity conversations, content migration
  ↓
M1.8   materials, patterns, autotiling, atlases
  ↓
M2     six room puzzles + Silicon design/content
  ↓
M3     final art/audio for the 03 capture slice
  ↓
M4     online co-op for the M3 slice
```

M4 assumes:

- M1.75 Phases 4–8 are complete: runtime feedback, anchored surfaces, per-player
  input, entity conversations, effects, tile visuals, content migration,
  validation, accessibility, and playtest.
- M1.8 is accepted and implemented: materials, `tileMaterials`, autotiling,
  variants, pattern projection, atlas assets, and UI parity.
- M2 is authored and frozen: the six room puzzles and the Silicon fixture design,
  including multi-level transitions and the M2 content freeze.
- M3 is complete: the final `03-nerve-forest` art/audio, the final manifest, and
  the capture build are frozen.

If any of those milestones changes after M4 starts, M4 is re-baselined. M4 must
not become a parallel implementation of feedback, dialogue, materials, or
content.

## 4. Deliverables

### Architecture and ADRs

- [ ] ADR-0047–0057 accepted and indexed.
- [ ] `docs/adr-online/` is the durable home for the domain.
- [ ] IaC ownership is explicit: Wrangler owns the Worker/DO; Terraform, if
  present, owns only account-level resources (ADR-0057).
- [ ] Architecture, contracts, and traceability link the online boundary.
- [ ] The local-only statements in `architecture.md`, `failure-semantics.md`,
  and `concurrency-topology.md` are amended for an optional online mode, not
  silently contradicted.

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
  guest-controlled in M4.0.

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

M4 is done when:

1. The ADR domain is accepted and the M4 plan is the authority for online work.
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

| Phase | Focus | Est. | Exit |
|---|---|---:|---|
| 0 | Accept ADRs, freeze baseline, amend local-only contracts | 1 d | ADRs accepted; M4 plan authoritative |
| 1 | Worker, DO, wrangler config, room code, roles, version handshake, heartbeat | 2 d | Host/guest connect; third rejected |
| 2 | Host snapshot publisher, guest remote world, guest UI mirror | 3 d | Guest renders host state without simulation |
| 3 | Guest input relay, host merge, P1/P2 movement, tether/camera | 3 d | Both players move and interact |
| 4 | Conversations, feedback/effects, gate/debrief views, host-only modals | 2 d | Co-op surfaces and attribution work |
| 5 | Host save/evidence, guest memory save, security and rate limits | 2 d | Durable outcomes are host-only |
| 6 | Reconnect, visibility, deployment/IaC check, two-browser E2E, playtest, docs | 3 d | Definition of done met |

**Total:** roughly **12–18 focused days**. A **5–8 day M4.0 spike** is possible
if gate/debrief stay host-only, prediction is omitted, and the verification is
limited to a two-browser smoke. That spike is not the full milestone.

## 7. Compatibility with planned features

| Planned feature | M4 treatment |
|---|---|
| M1.75 feedback ECS, surfaces, beats | Host computes; guest renders host feedback. No guest feedback director. |
| M1.75 entity conversations | Host owns narrative sessions; guest surfaces can be owned by P1 or P2; guest actions are routed to host. |
| M1.75 effects and tile visuals | Host computes; guest mirrors effect/tile-visual plans; effects remain cosmetic and never collision. |
| M1.8 materials, patterns, autotiling, variants | Both clients load the same pack/build. No textures or atlas data cross the wire. Host tile visuals layer on the material base. |
| M1.8 UI material/pattern parity | Guest UI uses host `RuntimeSnapshot` and its own local theme/CSS. Pattern animation remains local and reduced-motion-aware. |
| M2 six room puzzles and Silicon | M4.0 ships `03-nerve-forest` only. Session state is level-scoped; M4.1 extends to the full pack. No new puzzle types. |
| M2 multi-level transitions | Host authority; guest follows host `levelId`/`roomId`; guest rebuilds its scene through the existing level-change port. |
| M2 side travel and map | Host-owned in M4.0; guest sees host map; guest-initiated travel is deferred. |
| M2 conditional dialogue and debrief | Host narrative/curriculum state; guest mirrors; host-only answers in M4.0. |
| M3 final art/audio/manifest | No new asset IDs; both clients load the same static build; audio is local; no audio streaming. |
| M3 capture mode | Local-only. M4 does not add networked capture; host capture is a future local feature. |
| Future key rebinding | Local per client; the protocol carries actions, not physical keys. |
| Future music/ambience | Local playback; no synchronization requirement. |
| Future mobile/touch | Out of scope; the protocol is input-agnostic but no touch UI is added. |
| Future full-pack online | M4.1 or later; requires no authority change, but needs level/session lifecycle tests. |

## 8. Risks

| Risk | Mitigation |
|---|---|
| Guest input feels laggy | Measure RTT; accept for co-op puzzles; add guest prediction only as a separate ADR/increment. |
| Host tab backgrounded | `visibilitychange` pauses the session and notifies the guest; no background simulation. |
| Snapshot size or rate | 20 Hz world, 10 Hz UI; compact fields; cap message size; measure. |
| Version skew from GitHub Pages cache | Build ID + pack/content version handshake; reject before start. |
| Guest UI callback surface grows | M4.0 host-only gate/debrief/pause; route only guest-owned conversation and gameplay actions. |
| Save/evidence trust | Host-only save/export; guest memory save; document that a public guest is not trusted assessment evidence. |
| Cloudflare free-tier limits | Two-player sessions are small; measure; cap message rate; use hibernation. |
| WebSocket idle timeout | 20–30 s heartbeat; reconnect with backoff. |
| Host departure | No host migration; end cleanly and tell the guest. |
| Two-browser test flakiness | Deterministic protocol fixtures; local Worker; retries only at the E2E layer. |
| Coupling to unfinished milestones | M4 starts only after M3; re-baseline if M1.75/M1.8/M2/M3 change. |
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
# new online suites, names provisional
npm run test:online
npm run smoke:online
npx wrangler deploy --dry-run
# only if infra/terraform exists
terraform fmt -check
terraform validate
terraform plan
```

Manual:

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

### Must ship

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

### Can defer without invalidating the architecture

- guest-initiated gate, debrief, pause, map, and evidence;
- guest prediction;
- full M2 pack online (M4.1);
- host migration;
- custom domain;
- Terraform account layer (Wrangler-only is enough for M4);
- binary protocol;
- spectator mode;
- display names or chat;
- mobile/touch.

### Do not cut

- host authority;
- guest no-simulation rule;
- P1/P2 attribution;
- host-only save/evidence;
- version handshake;
- Origin and rate limits;
- reconnect/failure UX;
- local co-op regression coverage.

## 11. Open decisions

- Should M4.0 allow guest gate/debrief participation, or keep them host-only?
  Recommendation: host-only for M4.0; route guest answers in M4.1.
- Should M4.0 include guest movement prediction? Recommendation: no; measure
  first.
- Should M4.0 ship one level or the full M2 pack? Recommendation: one level
  (`03-nerve-forest`), with M2 pack tests; full pack is M4.1.
- Should the Worker use `workers.dev` or a custom domain? Recommendation:
  `workers.dev` for M4.0.
- Should Terraform be introduced in M4? Recommendation: no; Wrangler only for
  M4, with Terraform reserved for a future custom domain/multi-Worker account
  layer.
- What is the guest reconnect grace window? Recommendation: 60 seconds.
- What happens to evidence if the host leaves? Recommendation: session ends and
  evidence is lost; documented, not recovered from the guest.
- Do players get display names? Recommendation: no; “P1”/“P2” only.

## 12. Relationship to other documents

- [`../adr-online/README.md`](../adr-online/README.md) — online ADR domain index.
- [`../adr-online/0057-infrastructure-as-code-deployment-ownership.md`](../adr-online/0057-infrastructure-as-code-deployment-ownership.md)
  — Wrangler/Terraform ownership and deployment boundary.
- [`../m1.75/README.md`](../m1.75/README.md) — feedback, co-op attribution, and
  effect composition.
- [`../m1.8/README.md`](../m1.8/README.md) — material and pattern layer.
- [`../m2/nervous-puzzles/README.md`](../m2/nervous-puzzles/README.md) — six room
  puzzles and Silicon.
- [`../m3/asset-requirements.md`](../m3/asset-requirements.md) — M3 art/audio
  scope.
- [`../puzzle-engine/architecture.md`](../puzzle-engine/architecture.md) —
  local-only deployment statement that M4 amends for the optional online mode.
- [`../puzzle-engine/contracts/failure-semantics.md`](../puzzle-engine/contracts/failure-semantics.md)
  and [`../puzzle-engine/contracts/concurrency-topology.md`](../puzzle-engine/contracts/concurrency-topology.md)
  — local-only assumptions that the online ADRs narrow for online sessions only.
