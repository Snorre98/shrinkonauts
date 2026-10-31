# Online Co-op — ADR domain

**Status:** Proposed, 2026-10-28  
**Owner:** Snorre  
**Scope:** authority, session, protocol, ownership, persistence, failure,
security, deployment, and verification for M4 online co-op  
**Milestone:** [`../m4/README.md`](../m4/README.md) — M4  
**Format:** Nygard-style, matching `docs/adr-m1.5/` and
`docs/puzzle-engine/adr/`.

This domain is deliberately separate from the puzzle-engine and M1.5 ADR sets.
It does not rewrite accepted records. It adds the decisions needed to run the
existing local co-op game across two browsers.

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
| Failure, security, deployment, and tests | Anti-cheat, chat/voice, mobile/touch |

## Index

| # | Decision | Status |
|---|---|---|
| [0047](0047-host-authoritative-thin-client.md) | Host-authoritative thin-client online co-op | Proposed |
| [0048](0048-session-topology-room-lifecycle.md) | Two-player session topology and room lifecycle | Proposed |
| [0049](0049-snapshot-and-input-protocol.md) | Snapshot and guest-input protocol | Proposed |
| [0050](0050-per-player-ownership-and-ui-routing.md) | Per-player ownership, input routing, and interaction parity | Proposed |
| [0051](0051-host-owned-save-evidence-identity.md) | Host-owned save, evidence, and ephemeral identity | Proposed |
| [0052](0052-composition-with-planned-milestones.md) | Composition with feedback, materials, multi-level content, and art | Proposed |
| [0053](0053-failure-reconnect-host-lifecycle.md) | Failure semantics, reconnect, and host lifecycle | Proposed |
| [0054](0054-security-privacy-abuse.md) | Security, privacy, and abuse boundaries | Proposed |
| [0055](0055-deployment-versioning-rollback.md) | Deployment, versioning, and rollback | Proposed |
| [0056](0056-testing-observability-acceptance.md) | Testing, observability, and acceptance evidence | Proposed |
| [0057](0057-infrastructure-as-code-deployment-ownership.md) | Infrastructure-as-code and deployment ownership | Proposed |

## Relationship to existing decisions

- ADR-0005, ADR-0016, ADR-0017: fixed-step local co-op, co-op camera/tether.
- ADR-0009–0013: feedback ECS, anchored surfaces, entity conversations,
  capability coverage, cosmetic effects.
- ADR-0014–0017: materials, autotiling, pattern projection, atlas variants.
- ADR-0034–0046: puzzle dataflow, Matter.js boundary, per-player abilities,
  tether policy, assessment, save v2, activation, feedback hints, hazards,
  save-version recovery, level transitions.
- `architecture.md` §7 and `failure-semantics.md` / `concurrency-topology.md`:
  local-only assumptions. M4 narrows them for an optional online session; local
  single-player and local co-op remain unchanged.

## Acceptance

M4 Phase 0 accepts this domain when:

1. Each ADR has a decision, consequences, alternatives, and tests.
2. The M4 milestone references every ADR.
3. The local-only contracts are amended rather than silently violated.
4. No accepted ADR is edited; amendments are new records.
5. The domain explicitly excludes lockstep, server authority, and host
   migration so they cannot creep into M4.

## Status vocabulary

- **Proposed:** drafted, not yet accepted.
- **Accepted:** M4 Phase 0 approved; implementation may proceed.
- **Superseded:** replaced by a later ADR; kept immutable.
- **Rejected:** considered and not adopted.

All records in this domain start as **Proposed**.
