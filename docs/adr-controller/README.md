# Phone Controller Co-op — ADR domain

**Status:** Proposed, 2026-11-01
**Owner:** Snorre
**Scope:** phone-as-controller for same-screen co-op (M4.0a), per-player
input slots, pairing and trust, and controller latency policy
**Milestone:** [`../m4/README.md`](../m4/README.md) — M4.0a
**Format:** Nygard-style, matching `docs/adr-online/`, `docs/adr-hub/`,
`docs/adr-m3/`, and `docs/puzzle-engine/adr/`.

This domain records the first phase of the multiplayer ladder: a phone acts as
a controller while the game remains host-authoritative on one shared screen. It
does not duplicate the remote-guest decisions in
[`../adr-online/`](../adr-online/README.md); it consumes the same transport and
input protocol for a smaller client role.

## Numbering

The repository currently has domain-local numbering collisions: the online
domain uses ADR-0047–0057, the hub domain uses ADR-0058–0059, and the art
pipeline uses ADR-0060–0065. This domain starts at **ADR-0066** to avoid adding
another collision. If the project later reconciles a single global sequence,
renumber these records before acceptance; accepted records are immutable.

## Domain boundary

| In scope | Out of scope |
|---|---|
| Same-screen co-op with one or two phone controllers | Remote second-screen rendering (online domain, M4.0b) |
| Per-player input slots: keyboard or phone for P1/P2 | Matchmaking, accounts, lobbies, spectators |
| Host-authoritative input application | Server-side simulation or deterministic lockstep |
| Controller role, slot reservation, QR/code pairing | A second `GameRuntime` or `PuzzleRuntime` |
| Controller input protocol subset and validation | World/UI snapshots, interpolation, guest rendering |
| Reconnect, pause, keyboard fallback | Phone-side prediction or rollback |
| Latency budget, measurement, and input-feel policy | Bluetooth or native mobile apps |
| Controller page with no game assets | Chat, voice, profiles, PII |
| Host-owned save, evidence, and P1/P2 attribution | Trusted public assessment |

## Index

| # | Decision | Status |
|---|---|---|
| [0066](0066-phone-controller-first-multiplayer-phase.md) | Phone controller as the first multiplayer phase | Proposed |
| [0067](0067-per-player-input-slots-and-device-arbitration.md) | Per-player input slots and device arbitration | Proposed |
| [0068](0068-controller-session-pairing-and-trust.md) | Controller session, pairing, and trust boundary | Proposed |
| [0069](0069-controller-latency-and-input-feel.md) | Controller latency budget and input-feel policy | Proposed |

## Relationship to other decisions

- **ADR-0047–0057 (online domain):** define the host-authoritative session,
  room lifecycle, input protocol, ownership, failure, security, deployment, and
  test strategy. M4.0a reuses the transport, room code, heartbeat, and
  `NetInput` subset; it does not adopt world/UI snapshots or guest rendering.
- **ADR-0047 / ADR-0050 (online domain):** assume host = P1 and guest = P2. The
  controller phase generalizes this: the host is authority/display, and P1/P2
  are independent input slots. The remote guest remains host = P1 in M4.0b.
- **ADR-0058–0059 (hub domain):** the bathroom hub is the pre-game surface. M4.0a
  adds a local-co-op input setup panel; the disabled online block remains for
  M4.0b.
- **ADR-0010 (puzzle-engine):** per-player soft-surface input and ownership. The
  controller arbiter preserves the existing P1/P2 routing.
- **ADR-0037, ADR-0043 (puzzle-engine):** per-player abilities, tether, and
  camera. These remain host-owned and unchanged.

## Acceptance

M4.0a Phase 0 accepts this domain when:

1. Each ADR has a context, decision, consequences, alternatives, and tests.
2. The M4 milestone references every controller ADR and the implementation
   plan.
3. The keyboard co-op path remains the default and is explicitly protected.
4. The controller role is input-only: no world state, save, or evidence crosses
   the wire.
5. The latency budget and the fallback path are explicit.
6. No accepted online ADR is rewritten; the controller phase is an additive
   record set.

## Status vocabulary

- **Proposed:** drafted, not yet accepted.
- **Accepted:** M4.0a Phase 0 approved; implementation may proceed.
- **Superseded:** replaced by a later ADR; kept immutable.
- **Rejected:** considered and not adopted.

All records in this domain start as **Proposed**.
