# Online Co-op — ADR domain (historical)

- **Status:** Historical / not planned, 2026-11-04; drafted 2026-10-28
- **Owner:** Snorre
- **Scope:** historical design exploration for remote M4.0b guest co-op
- **Milestone:** none active; see ADR-0081
- **Format:** Nygard-style, matching `docs/adr-m1.5/` and
  `docs/puzzle-engine/adr/`.

These records were design exploration for running the game across two browsers
with a host-authoritative thin client. They are retained for historical
precedent and **are not an active plan**.

ADR-0081 (2026-11-04) decided that multiplayer is same-room, shared-screen only:
one host/display and P1/P2 keyboard-or-phone input slots, with no remote guest
and no fourth device. The Cloudflare Worker/Durable Object remains as an
input-only relay for phone controllers; it does not carry game state.

The guest-rendering, snapshot, interpolation, and prediction portions of this
domain are **not planned**. The transport, room lifecycle, input relay, failure,
security, deployment, and testing lessons remain useful historical context for
the input relay. Do not build new online-guest features from this domain.

## Numbering

This domain reserves **ADR-0047–0057**. ADR-0046 is the latest accepted record
in the repository. If a future domain claims the same numbers, this domain is
renumbered before acceptance; accepted records are immutable.

## Domain boundary

| In scope | Out of scope |
|---|---|
| Host-authoritative, thin-client online co-op | Deterministic lockstep or rollback netcode |
| Two players, one host and one guest, room code | Matchmaking, accounts, lobbies, spectators |
| Host `GameRuntime` / `RoomSimulation` authority | Server-side Matter.js simulation |
| Host `RuntimeSnapshot` replication | Full game-state replication at 60 Hz |
| Guest input relay and host application | Guest prediction or client authority |
| Host-owned save, evidence, and attribution | Guest save/evidence or trusted public assessment |
| Online composition with M1.75, M1.8, M2, M3 | New content, art, audio, puzzle types, or save fields |
| Worker + one Durable Object per room | Cloudflare Containers or paid-only infrastructure |
| Wrangler-owned Worker/DO config; optional Terraform account layer | Terraform-owned Worker code or dual-managed resources |
| Failure, security, deployment, and tests | Anti-cheat, chat/voice, mobile game client |

## Index

| # | Decision | Status |
|---|---|---|
| [0047](0047-host-authoritative-thin-client.md) | Host-authoritative thin-client online co-op | Historical; guest-rendering scope superseded by ADR-0081 |
| [0048](0048-session-topology-room-lifecycle.md) | Two-player session topology and room lifecycle | Historical; room/relay lessons retained |
| [0049](0049-snapshot-and-input-protocol.md) | Snapshot and guest-input protocol | Partially superseded; input subset retained, snapshots historical |
| [0050](0050-per-player-ownership-and-ui-routing.md) | Per-player ownership, input routing, and interaction parity | Partially superseded; ownership retained, guest UI historical |
| [0051](0051-host-owned-save-evidence-identity.md) | Host-owned save, evidence, and ephemeral identity | Historical; host authority retained |
| [0052](0052-composition-with-planned-milestones.md) | Composition with feedback, materials, multi-level content, and art | Historical; superseded by ADR-0081 |
| [0053](0053-failure-reconnect-host-lifecycle.md) | Failure semantics, reconnect, and host lifecycle | Historical; reconnect lessons retained |
| [0054](0054-security-privacy-abuse.md) | Security, privacy, and abuse boundaries | Historical; relay security retained |
| [0055](0055-deployment-versioning-rollback.md) | Deployment, versioning, and rollback | Historical; relay deployment retained |
| [0056](0056-testing-observability-acceptance.md) | Testing, observability, and acceptance evidence | Historical; relay testing retained |
| [0057](0057-infrastructure-as-code-deployment-ownership.md) | Infrastructure-as-code and deployment ownership | Historical; Worker/DO ownership retained |

## Relationship to existing decisions

- ADR-0005, ADR-0016, ADR-0017: fixed-step local co-op, co-op camera/tether.
- ADR-0009–0013: feedback ECS, anchored surfaces, entity conversations,
  capability coverage, cosmetic effects.
- ADR-0014–0017: materials, autotiling, pattern projection, atlas variants.
- ADR-0034–0046: puzzle dataflow, Matter.js boundary, per-player abilities,
  tether policy, assessment, save v2, activation, feedback hints, hazards,
  save-version recovery, level transitions.
- `architecture.md` §7 and `failure-semantics.md` / `concurrency-topology.md`:
  local-only assumptions. The input-only controller relay narrows them for an
  optional network session; local single-player and local co-op remain unchanged.
- ADR-0066–0069 (controller domain): M4.0a phone-controller co-op reuses the
  transport, room, and input subset; it does not use this domain's snapshots,
  interpolation, or guest renderer.
- ADR-0081 (controller domain): the same-room product decision that supersedes
  the remote-guest scope.

## Acceptance

This domain is not awaiting acceptance. It is historical.

1. The records remain available for historical precedent.
2. No active milestone references them as required work.
3. Guest rendering, snapshots, interpolation, prediction, and M4.1 remain
   explicitly not planned.
4. ADR-0081 is the active multiplayer product decision.

## Status vocabulary

- **Proposed:** drafted, not yet accepted.
- **Accepted:** implementation may proceed.
- **Superseded:** replaced by a later ADR; kept immutable.
- **Rejected:** considered and not adopted.
- **Historical:** retained for precedent; not an active plan.

All records in this domain are **historical** after ADR-0081.
