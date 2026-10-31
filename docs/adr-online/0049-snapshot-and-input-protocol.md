# ADR-0049: Snapshot and guest-input protocol

- **Status:** Proposed
- **Date:** 2026-10-28
- **Deciders:** Snorre
- **Related:** ADR-0047, ADR-0048, ADR-0050, ADR-0052, ADR-0055

## Context

The host owns the simulation, but the guest needs enough state to render a
consistent world and UI. The existing game already produces two useful shapes:

- `RunSnapshot`: players, bodies, props, puzzles, progression, events,
  conversations, status.
- `RuntimeSnapshot`: world view, players, camera, feedback, puzzle/gate/
  debrief/map/concept views, state, toast, interaction.

The network protocol must avoid re-deriving game logic on the guest, avoid
sending assets/textures, and tolerate variable latency without allowing the
guest to become an authority.

## Decision

### 1. JSON protocol for M4

M4 uses JSON messages with a versioned envelope. Binary encoding is deferred
until measurements show a need.

```ts
type Envelope =
  | { v: 1; t: "hello"; role: "host" | "guest"; room: string;
      buildId: string; packId: string; packVersion: string;
      contentVersion: string; protocol: number }
  | { v: 1; t: "welcome"; role: "host" | "guest"; sessionId: string }
  | { v: 1; t: "run"; run: RunSnapshot; session: SessionConfig }
  | { v: 1; t: "ready" }
  | { v: 1; t: "input"; seq: number; input: NetInput }
  | { v: 1; t: "world"; tick: number; seq: number; world: NetWorld }
  | { v: 1; t: "ui"; tick: number; seq: number; ui: NetUi }
  | { v: 1; t: "action"; action: NetAction }
  | { v: 1; t: "ping"; t0: number }
  | { v: 1; t: "pong"; t0: number }
  | { v: 1; t: "pause"; reason: "guest-left" | "host-hidden" | "resume" }
  | { v: 1; t: "session-end"; reason: string }
  | { v: 1; t: "error"; code: string; message: string };
```

The exact field names may change during implementation, but the boundaries are
fixed: versioned hello, full run on join, sequenced world/UI snapshots, guest
input, and explicit session/pause/end messages.

### 2. Join handshake

1. Host connects as `host`; DO creates the room.
2. Guest connects as `guest`; DO checks the slot.
3. Both send `hello` with build ID, pack ID/version, content version, and
   protocol version.
4. DO/host rejects mismatch before gameplay:
   - different build or pack: “Both players must use the same build”;
   - unsupported protocol: “Update the game and try again.”
5. Host sends `run` (a full `RunSnapshot` or equivalent initial state) and
   `session` config.
6. Guest loads the same pack, applies the run to its remote view, and sends
   `ready`.
7. Host starts/resumes the fixed-step loop.

The guest does not load its own local run. The host’s `run` is the only initial
state. If the host is resuming an existing run, that state is sent; if the host
is starting fresh, `newRun()` state is sent.

### 3. World snapshots

The host sends `world` at **20 Hz** (configurable 15–30 Hz). Each snapshot
contains only render-relevant state:

```ts
interface NetWorld {
  tick: number;
  players: Record<"p1" | "p2", {
    x: number; y: number; vx: number; vy: number;
    facing: -1 | 1; active: boolean; onGround: boolean;
    dashing: boolean; dashTime: number; dashCooldown: number;
    carrying: string | null;
  }>;
  props: Record<string, {
    id: string; x: number; y: number; width: number; height: number;
    state: PropRunState; carriedBy: "p1" | "p2" | null;
  }>;
  camera: { x: number; y: number; width: number; height: number };
  levelId: string;
  roomId: string;
  checkpointId: string | null;
}
```

Rules:

- `tick` is the host fixed-step count; guest uses it for ordering.
- `seq` is monotonic per host connection; guest drops stale/duplicate frames.
- No textures, atlas regions, material definitions, audio, or asset data cross
  the wire. Both clients load the same pack/build.
- Prop state is included so the guest can hide cleared props and show carried/
  placed state.
- Camera is host-authoritative; the guest does not independently follow players.

### 4. UI snapshots

The host sends `ui` at **10 Hz** or immediately after a meaningful state change
(whichever comes first). It contains the host `RuntimeSnapshot` minus
client-local fields:

- remove `settings` and `muted` (guest keeps its own audio/accessibility);
- keep `state`, `level`, `roomId`, `players`, `camera`, `world`, `feedback`,
  `abilities`, `knownConceptIds`, `interaction`, `checkpointId`, `activeP2`,
  `gate`, `debrief`, `map`, `conceptLog`, `puzzle`, `toast`, `saveNotice`,
  `error`, `mode`;
- feedback includes surfaces and effect plans; the guest renders them, never
  re-runs the feedback director;
- gate/debrief/map/concept views are host-owned in M4.0 and read-only on the
  guest.

The guest may also receive `world` and `ui` in one combined message when the
state is small; the 20/10 Hz split is the default budget, not a schema
requirement.

### 5. Guest input

The guest sends `input` at **30–60 Hz**, or only when the input state changes
plus a keepalive at 10 Hz. `NetInput` contains the guest’s P2 intents and
player actions:

```ts
interface NetInput {
  intents: { moveX: -1 | 0 | 1; jump: boolean; dash: boolean };
  actions: {
    interact: boolean; scan: boolean; pulse: boolean;
    carry: boolean; throw: boolean;
    ui: PlayerUiActions;
  };
  clientTick: number;
}
```

Rules:

- The host validates shape, rate, and ownership.
- The host applies input at the next fixed step; no client tick authority.
- Edge-triggered actions are queued, not lost, if several arrive before a step.
- Duplicate/stale `seq` frames are dropped.
- Global actions (`pause`, `map`, `log`, `mute`, `toggleP2`) are host-only in
  M4.0. Guest `mute` is local and never sent.
- Guest `ui` actions are only valid on surfaces owned by P2; host rejects
  owner mismatch.

### 6. Interpolation and loss handling

- Guest buffers world snapshots for **100 ms** and interpolates positions.
- No extrapolation beyond 100 ms; if no snapshot arrives for 500 ms, show a
  “reconnecting” state and freeze the visual world.
- The guest never advances its own authoritative puzzle or physics state to
  hide a gap.
- If the guest misses a `ui` snapshot, the next one is authoritative; UI state
  is not accumulated locally.

### 7. Message limits

- Guest→host messages: 8 KiB cap; 120 input messages/s; 8 action messages/s.
- Host→guest messages: 128 KiB cap; 30 world/s; 15 UI/s.
- Oversize, invalid JSON, unknown type, or unsupported version closes the
  session with a diagnostic code.
- The Worker validates upgrade and route; the DO validates membership and
  relays; the host validates gameplay messages.

## Consequences

**Easier:**

- `RuntimeSnapshot` and `RunSnapshot` are reused instead of inventing a second
  game-state model.
- Guest rendering is read-only and cannot corrupt puzzle state.
- Snapshot loss is recoverable from the next snapshot.
- Assets stay static and cacheable.

**Harder:**

- Full `RuntimeSnapshot` is larger than a hand-written UI delta; 10 Hz plus
  change-triggered sends needs measurement.
- Guest movement is delayed by RTT and interpolation.
- Protocol and snapshot fixtures need versioning.
- Guest UI must ignore host settings/audio fields.

**Constrained:**

- No binary protocol in M4.
- No client tick authority.
- No guest-side feedback/narrative derivation.
- No asset streaming.

## Alternatives considered

- **Send inputs only and run the game on both clients.** Rejected; that is
  lockstep, see ADR-0047.
- **Send full `RuntimeSnapshot` at 60 Hz.** Rejected; unnecessary bandwidth and
  UI churn.
- **Send only deltas from the initial run.** Deferred; snapshot keyframes are
  simpler and more robust for two players.
- **Binary/protobuf/MessagePack.** Deferred until measurement.
- **Guest-side prediction.** Deferred; separate ADR if needed.

## Tests

- Protocol encode/decode and version mismatch.
- `RunSnapshot` initial join and guest application.
- `NetWorld`/`NetUi` schema validation and size caps.
- Sequence ordering, duplicate/stale drop, input coalescing.
- Interpolation buffer and 500 ms freeze behavior.
- Guest settings/audio preservation.
- Host rejects guest actions on non-P2 surfaces and global actions.

## References

- `src/game/runtime.ts` — `snapshot()`, `emit()`, `toRunSnapshot()`
- `src/ui/model.ts` — `RuntimeSnapshot`, `WorldView`
- `src/save/index.ts` — `RunSnapshot`
- ADR-0047, ADR-0050, ADR-0052
