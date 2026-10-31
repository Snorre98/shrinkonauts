# ADR-0047: Host-authoritative thin-client online co-op

- **Status:** Proposed
- **Date:** 2026-10-28
- **Deciders:** Snorre
- **Related:** ADR-0005, ADR-0016, ADR-0017, ADR-0036, ADR-0046, ADR-0048–0057

## Context

The current game is local-only. `GameRuntime` owns the fixed-step simulation,
`RoomSimulation` owns Matter.js bodies, and `RoomScene` renders the local
simulation. `RuntimeSnapshot` is already a complete view contract for the UI,
and `RunSnapshot` already serializes the run.

Online co-op can be built in three broad ways:

1. **Host-authoritative snapshots.** One player's browser owns the simulation;
   the other renders the host state and sends input.
2. **Deterministic lockstep.** Both browsers run the same simulation and
   exchange inputs.
3. **Server-authoritative simulation.** A Cloudflare Worker/Durable Object or
   container runs the simulation.

The game is a two-player co-op puzzle platformer, not a competitive shooter.
For two players, snapshot bandwidth is small; determinism and server game loops
are the expensive parts. The existing architecture already separates the pure
runtime from the Phaser scene and exposes `RuntimeSnapshot` as a view contract.

## Decision

### 1. Host browser is authoritative

The host is one player's browser. It owns:

- `GameRuntime`, including puzzle, progression, curriculum, feedback, and
  narrative state;
- `RoomSimulation` and Matter.js bodies;
- autosave and evidence;
- level transitions, gate/debrief/pause state in M4.0;
- the authoritative clock and fixed-step tick.

The guest is a **thin client**. It:

- loads the same static build and pack;
- sends input frames for P2;
- renders host world snapshots with interpolation;
- renders host `RuntimeSnapshot` for UI;
- never steps authoritative gameplay simulation;
- never writes the host run.

### 2. One Durable Object per room, no game loop

A Cloudflare Worker routes a WebSocket upgrade to one Durable Object keyed by
room code. The DO relays messages and stores membership/role attachments. It
does not run `GameRuntime`, Matter.js, or a 60 Hz loop.

### 3. No lockstep and no server authority in M4

M4 explicitly rejects:

- deterministic lockstep;
- rollback or guest prediction;
- server-side physics;
- host migration.

These may be separate future ADRs. They are not implementation details of M4.

### 4. Player slots

M4 fixes host = P1 and guest = P2. Local key mapping is per client. The host
disables local P2 sampling while online.

### 5. Guest latency is accepted in M4.0

The guest's own movement is delayed by the host round trip. M4.0 measures and
documents this rather than adding prediction. Prediction is a later increment
that must not change the authority model.

## Consequences

**Easier:**

- `GameRuntime`, `PuzzleRuntime`, `FeedbackDirector`, `RunSnapshot`, and
  `RuntimeSnapshot` are reused.
- No cross-browser deterministic physics requirement.
- No server game loop, CPU budget, or container.
- The guest can be implemented as a remote `WorldRuntime` adapter plus the
  existing UI.
- Two players fit comfortably within Cloudflare free-tier message limits.

**Harder:**

- Guest input feels remote; RTT is visible on the guest's own character.
- The host tab must stay active; background throttling must pause the session.
- The guest needs a remote scene path that does not step physics.
- Host departure ends the session.
- The online mode needs a version handshake and failure UX that local play does
  not have.

**Constrained:**

- No guest authority over save, evidence, gate, debrief, or pause in M4.0.
- No spectators, matchmaking, accounts, or more than two players.
- No server-side validation of physics or anti-cheat.
- A public guest is not trusted assessment evidence.

## Alternatives considered

- **Deterministic lockstep.** Attractive because the runtime is pure and
  fixed-step, and a 1,200-tick same-engine test produced identical body
  snapshots. Rejected for M4 because cross-browser `Math` differences, local
  wall-clock stepping, and desync recovery are not proven, and snapshot
  bandwidth is negligible for two players.
- **Server-authoritative Matter.js.** Rejected: Cloudflare Workers are not a
  60 Hz game host; a DO game loop is expensive, stateful, and operationally
  wrong for this milestone.
- **WebRTC peer-to-peer with Cloudflare signaling.** Rejected for M4: lower
  latency is attractive, but NAT/TURN, signaling, and connection lifecycle add
  scope without changing the authority model. A WebSocket relay is enough for
  a co-op puzzle demo.
- **Third-party multiplayer service.** Rejected: adds a vendor and a state model
  that would have to be reconciled with `GameRuntime`.
- **Guest runs a local copy of the game and reconciles.** Rejected for M4: that
  is prediction/rollback in disguise and needs a separate ADR.

## Tests

- Host and guest load the same build and pack; guest does not instantiate an
  authoritative `GameRuntime`.
- Guest renders host player/prop/camera state without running Matter.js.
- Host applies guest input at a fixed step and ignores stale/duplicate frames.
- Host departure ends the session; guest cannot continue as authority.
- Local single-player and local co-op are unchanged.

## References

- `docs/puzzle-engine/architecture.md` §7 (local-only deployment)
- `docs/puzzle-engine/contracts/concurrency-topology.md`
- `src/game/runtime.ts`
- `src/world/simulation.ts`
- `src/world/room-scene.ts`
- `src/ui/model.ts`
