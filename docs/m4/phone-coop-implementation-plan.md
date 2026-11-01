# Phone Controller Co-op — Implementation Plan (M4.0a)

**Status:** Draft for review, 2026-11-01
**Owner:** Snorre
**Source decisions:** [ADR-0066–0069](../adr-controller/README.md)
**Milestone:** [M4](../m4/README.md) — M4.0a, the first phase of complete
multiplayer
**Format:** phased plan matching
[`../puzzle-engine/implementation-plan.md`](../puzzle-engine/implementation-plan.md)
and [`../puzzle-engine/feedback-implementation-plan.md`](../puzzle-engine/feedback-implementation-plan.md)

This plan is the authority for M4.0a. **No production code is written until
Phase 0 accepts ADR-0066–0069 and approves this plan.** Phase 1 may begin only
after that gate.

M4.0b (remote guest with world/UI snapshots) remains described by the existing
[M4 README](../m4/README.md) and
[online ADR domain](../adr-online/README.md). M4.0a is not a replacement for
M4.0b; it is the smaller, earlier tracer bullet that proves the transport and
input boundary.

### Review gate

- [ ] Accept [ADR-0066](../adr-controller/0066-phone-controller-first-multiplayer-phase.md)
  (phase ladder and scope).
- [ ] Accept [ADR-0067](../adr-controller/0067-per-player-input-slots-and-device-arbitration.md)
  (host is not a player; per-slot input).
- [ ] Accept [ADR-0068](../adr-controller/0068-controller-session-pairing-and-trust.md)
  (controller role, pairing, trust).
- [ ] Accept [ADR-0069](../adr-controller/0069-controller-latency-and-input-feel.md)
  (latency budget and no prediction).
- [ ] Resolve or defer the open decisions in §13.
- [ ] Approve this plan as the M4.0a authority.

No production code is written before this gate is complete.

---

## 1. Goal and non-goals

### Goal

Let one or two players use phones — or a mix of keyboard and phone — as
controllers for same-screen co-op while the host browser remains authoritative
and the shared screen renders the game.

The milestone must support all four input plans from the first implementation:

| P1 | P2 | Meaning |
|---|---|---|
| Keyboard | Keyboard | Existing local co-op; default |
| Keyboard | Phone | One phone, P1 at the laptop |
| Phone | Keyboard | One phone, P2 at the laptop |
| Phone | Phone | Display-only host; two phones |

Keyboard co-op remains available at all times and is the fallback when a phone
session fails.

### Non-goals

- Remote co-op with a second rendered game view; that is M4.0b.
- World, UI, puzzle, dialogue, camera, feedback, or save state on the phone.
- Phone-side prediction, rollback, or a second simulation.
- Bluetooth, native iOS/Android apps, or a phone as a Bluetooth HID device.
- Accounts, matchmaking, lobbies, spectators, chat, voice, or profiles.
- A third player.
- New puzzles, levels, abilities, assets, or save fields.
- Trusted graded assessment from a public controller.
- Full M2 pack online; that is M4.1.

---

## 2. Success criteria

A successful M4.0a demo looks like this:

1. The hub offers Local co-op with `P1: Keyboard | Phone` and
   `P2: Keyboard | Phone`. Keyboard/keyboard is the default and behaves exactly
   as today.
2. Choosing a phone for a slot shows a QR (and a six-character fallback code).
   The phone opens a small controller page, joins that slot, and shows
   "Connected as P1" or "Connected as P2".
3. The host can start only when every phone slot is ready, unless it explicitly
   chooses to use the keyboard for that slot instead.
4. Both players play the same local co-op level on the shared screen. P1 and P2
   movement, jump, dash, scan, interact, carry, throw, pulse, conversations, and
   feedback work as they do locally.
5. The host can be display-only when both slots use phones; the laptop keyboard
   still handles start, pause, map, log, mute, and menus.
6. A phone disconnect pauses the run and shows which slot is missing. The host
   can wait for reconnect or continue that slot on the keyboard.
7. The phone receives no game state and loads no game assets. It is a controller,
   not a second game client.
8. The latency playtest records a keyboard baseline and phone p50/p95
   input-to-photon on the demo Wi-Fi and display. The target is p95 ≤ 120 ms; if
   it is not met, the fallback is a local relay or keyboard, not prediction.
9. Existing local co-op, solo, save, feedback, materials, and pack tests still
   pass.

---

## 3. Baseline and assumptions

### What exists today

- Local co-op on one keyboard: `KeyboardIntentSource` in
  [`../../src/world/input.ts`](../../src/world/input.ts).
- A fixed 60 Hz step: `RoomScene.update()` samples one `RuntimeInput` per render
  frame and calls `runtime.step(FIXED_STEP, input)` in
  [`../../src/world/room-scene.ts`](../../src/world/room-scene.ts).
- Plain-data input contracts: `RuntimeInput`, `PlayerActionInput`,
  `PlayerUiActions` in
  [`../../src/world/runtime-port.ts`](../../src/world/runtime-port.ts).
- P1/P2 ownership, surface routing, tether, camera, feedback, save, and
  evidence are already host-local.
- The bathroom hub exposes Solo, Local co-op, and a disabled Online co-op block
  ([`../../src/ui/hub-ui.ts`](../../src/ui/hub-ui.ts),
  [`../../src/game/boot.ts`](../../src/game/boot.ts)).
- No `worker/` directory or network client exists yet. The online ADRs describe
  it, but M4.0a is the first implementation of it.

### Assumptions

- The host runs in a modern desktop browser with a keyboard.
- Phones run a modern browser (iOS Safari or Android Chrome) on the same network
  or on cellular; cloud WSS is the default path.
- The host page and controller page are served from the same static GitHub Pages
  deployment, so they share a build ID.
- The game remains a 60 Hz fixed-step, single-writer simulation.
- The phone has no game assets and no pack knowledge.
- The 60-second reconnect window from ADR-0053 is reused.
- Any local co-op level/pack is acceptable; M4.0a is content-independent.

---

## 4. Architecture

```text
┌──────────────────────────────┐
│ Phone P1                     │
│ controller.html              │──┐
│ buttons → NetInput           │  │
└──────────────────────────────┘  │
                                  │  WSS
┌──────────────────────────────┐  │
│ Phone P2                     │  │
│ controller.html              │──┤
│ buttons → NetInput           │  │
└──────────────────────────────┘  │
                                  ▼
                       ┌─────────────────────┐
                       │ Cloudflare Worker    │
                       │ /ws?room=...         │
                       └──────────┬──────────┘
                                  │
                       ┌──────────▼──────────┐
                       │ Durable Object       │
                       │ room membership      │
                       │ slot reservations    │
                       │ input relay          │
                       │ no game loop         │
                       └──────────┬──────────┘
                                  │ input frames
┌─────────────────────────────────▼─────────────────────────────┐
│ Host laptop: authority + shared display                       │
│                                                               │
│  GameRuntime / RoomSimulation / PuzzleRuntime / Feedback      │
│  InputArbiter                                                 │
│    ├─ P1 source: keyboard or RemotePlayerSource               │
│    ├─ P2 source: keyboard or RemotePlayerSource               │
│    └─ host actions: local keyboard only                       │
│  Hub + shared screen (Phaser)                                 │
└───────────────────────────────────────────────────────────────┘
```

There is no arrow from the host to the phone carrying game state. The host only
sends connection control (`welcome`, `pause`, `resume`, `session-end`, `error`,
`pong`).

### Authority

- The host is the only writer of game, puzzle, physics, feedback, save, and
  evidence state.
- The DO is a relay and membership store, not a game loop or state store.
- The phone is an untrusted input source for one slot.
- The host applies input at the next fixed step; `clientTick` is diagnostic.

---

## 5. Contracts

### 5.1 Input plan and slots

```ts
type PlayerSlot = "p1" | "p2";
type InputSourceKind = "keyboard" | "controller";
type InputPlan = Record<PlayerSlot, InputSourceKind>;

const DEFAULT_INPUT_PLAN: InputPlan = {
  p1: "keyboard",
  p2: "keyboard",
};
```

Rules:

- Exactly one active source per slot.
- The host role is independent of P1/P2.
- A keyboard slot is local and needs no network.
- A controller slot is reserved in the room and must be ready before start, or
  explicitly downgraded to keyboard before start.
- A slot cannot be both keyboard and controller.
- `guest` is not an M4.0a source.

### 5.2 Input source and arbiter

Pure types:

```ts
interface PlayerFrameInput {
  intent: PlayerIntent;
  actions: PlayerActionInput;
}

interface HostActions {
  map: boolean;
  log: boolean;
  pause: boolean;
  mute: boolean;
  toggleP2: boolean;
}

interface IntentSource {
  sample(): RuntimeInput;
  discard(): void;
  destroy?(): void;
}

interface PlayerIntentSource {
  sample(): PlayerFrameInput;
  discard(): void;
  destroy?(): void;
}

interface LocalIntentSource {
  samplePlayer(id: PlayerSlot): PlayerFrameInput;
  sampleHost(): HostActions;
  discard(): void;
}
```

`InputArbiter`:

- owns the local source and an optional remote source per slot;
- samples each slot from its active source;
- always samples host actions from the local source;
- exposes `activeSource(id)` for hub/HUD diagnostics;
- discards latched input on attach/detach and on pause;
- destroys remote sources on scene/session teardown.

`RemotePlayerSource`:

- receives validated `NetInput` frames from the session;
- keeps the latest movement intent;
- latches/queues edge actions so a tap between fixed steps is not lost;
- drops stale/duplicate `seq` values;
- returns `empty` input when disconnected;
- never samples another slot.

### 5.3 Protocol

The envelope and `NetInput` are reused from
[ADR-0049](../adr-online/0049-snapshot-and-input-protocol.md) §5. The controller
subset is:

| Direction | Message | Fields / purpose |
|---|---|---|
| controller → host | `hello` | `role: "controller"`, `slot`, `protocol`, `buildId` |
| host → controller | `welcome` | `sessionId`, `slot`, `heartbeatSeconds` |
| controller → host | `ready` | page and touch UI initialized |
| controller → host | `input` | `seq`, `clientTick`, `NetInput` |
| controller → host | `ping` | `t0` |
| host → controller | `pong` | `t0` |
| host → controller | `pause` / `resume` | `reason`, state |
| host → controller | `session-end` | `reason` |
| either | `error` | `code`, `message` |

Host ↔ DO control messages:

| Direction | Message | Purpose |
|---|---|---|
| host → DO | `host-hello` | room, build, `phoneSlots: PlayerSlot[]` |
| DO → host | `room-state` | slot bindings and ready state |
| controller → DO | `hello` | claim a reserved slot |
| DO → controller | `welcome` | slot accepted; relay begins |
| host → DO | `close-slot` | keyboard fallback or host revocation |
| host → DO | `session-end` | end the room cleanly |

Explicitly absent: `run`, `world`, `ui`, `session` pack config, snapshot
interpolation, pack/content versions, and asset data.

`NetInput` for one player:

```ts
interface NetInput {
  intents: { moveX: -1 | 0 | 1; jump: boolean; dash: boolean };
  actions: {
    interact: boolean;
    scan: boolean;
    pulse: boolean;
    carry: boolean;
    throw: boolean;
    ui: PlayerUiActions;
  };
  clientTick: number;
}
```

Limits:

- controller → host message: 8 KiB;
- input rate: 120/s;
- heartbeat: 20–30 s;
- room sockets: host + at most two controllers;
- invalid/oversize/rate-limited messages are dropped and counted; repeated abuse
  closes the connection.

### 5.4 Session state machine

```text
created
  │ host hello with phoneSlots
  ▼
waiting-for-controllers
  │ all phone slots bound and ready
  ▼
controllers-ready
  │ host starts the run
  ▼
active ── controller lost / host hidden / host pause ──▶ paused
  │                                                      │
  │                                                      │ reconnect or
  │                                                      │ keyboard fallback
  └──────────────── host end / unrecoverable error ─────▶ ended
```

- Keyboard slots do not affect the network state; they are always ready.
- The host may start with a phone slot downgraded to keyboard; that slot is
  closed to controllers for the session.
- `paused` does not advance the simulation.
- `ended` returns the phone to the join screen and the host to the hub/pause
  flow.

### 5.5 Ownership and failure matrix

| Event | Host | Phone | Recovery |
|---|---|---|---|
| Controller joins reserved slot | Bind, show connected | `welcome` | Wait for `ready` |
| Controller sends `ready` | Mark slot ready; enable Start | Connected | Start when all ready |
| Duplicate slot | Reject second connection | Error | Use the other slot |
| Third controller | Reject | Error | Room is full |
| Controller disconnect | Pause, highlight slot | Reconnect screen | Reconnect within 60 s |
| Grace expires | Offer keyboard/end | `session-end` | Keyboard or end |
| Host chooses keyboard | Close slot, discard input, resume | `session-end` | Keyboard controls slot |
| Host tab hidden | Pause, notify phones | "Host paused" | Visible resumes |
| Host leaves/ends | End session, return to hub | `session-end` | None |
| Version/build mismatch | Reject before input | Reload message | Update/reload |
| Bad input | Drop/count or close | Error | Retry/reload |
| Wrong Origin | Reject upgrade | Error | Use deployed page |
| Oversize/rate | Reject | Error | Backoff |
| Phone sleep/lock | Pause | Reconnect on wake | Reconnect/fallback |

---

## 6. Phases

### Phase 0 — Accept ADRs, freeze scope, amend contracts

**Estimate:** 0.5–1 focused day.
**Gate:** no production code before this phase exits.

Tasks:

1. Review and accept ADR-0066–0069.
2. Approve this plan as the M4.0a authority.
3. Update the M4 README to show the M4.0a → M4.0b → M4.1 ladder, scope table,
   deliverables, DoD, risks, verification, and open decisions.
4. Update the online ADR domain's scope/relationship notes: controller sessions
   reuse its transport but not its snapshots. Do not rewrite accepted records.
5. Amend the local-only contracts for the optional controller input path:
   - [`../puzzle-engine/architecture.md`](../puzzle-engine/architecture.md) §7;
   - [`../puzzle-engine/contracts/failure-semantics.md`](../puzzle-engine/contracts/failure-semantics.md);
   - [`../puzzle-engine/contracts/concurrency-topology.md`](../puzzle-engine/contracts/concurrency-topology.md);
   - [`../puzzle-engine/contracts/module-boundaries.md`](../puzzle-engine/contracts/module-boundaries.md);
   - [`../puzzle-engine/contracts/interface.md`](../puzzle-engine/contracts/interface.md).
6. Update the hub-domain relationship note so Local co-op has a phone-input
   setup panel; the disabled Online block remains for M4.0b.
7. Record the open decisions in §13 as resolved or explicitly deferred.

Exit criteria:

- ADRs accepted and indexed; plan approved.
- M4.0a scope and non-goals are explicit.
- Keyboard co-op is named as the default and fallback.
- No unresolved decision blocks Phase 1.

---

### Phase 1 — Input contracts and pure arbitration

**Estimate:** 1–1.5 focused days.

Goal: make P1 and P2 independent input slots without touching the network.

Files:

- `src/world/intent-source.ts` (new, pure types)
- `src/world/input-arbiter.ts` (new, pure)
- `src/world/input.ts` (per-slot and host sampling)
- `src/world/room-scene.ts` (inject `IntentSource`)
- `src/world/runtime-port.ts` (only if shared types need to move)
- `src/world/index.ts`
- `tests/input-arbiter.test.ts`

Tasks:

1. Define `PlayerSlot`, `InputSourceKind`, `InputPlan`, `PlayerFrameInput`,
   `HostActions`, `IntentSource`, `PlayerIntentSource`, `LocalIntentSource`.
2. Split keyboard sampling into `samplePlayer(id)` and `sampleHost()` while
   keeping the existing `sample()` behavior for compatibility.
3. Implement `InputArbiter`:
   - `setRemote(id, source)`, `clearRemote(id)`, `hasRemote(id)`,
     `activeSource(id)`;
   - `sample()` merges slot sources and host actions;
   - `discard()` clears all sources;
   - `destroy()` tears down remotes.
4. Add `input?: (scene) => IntentSource` to `RoomSceneConfig`; default to a
   keyboard-only arbiter. Keep the current behavior identical.
5. Ensure scene shutdown destroys the arbiter's remote sources.
6. Unit tests: K/K, K/P, P/K, P/P, host-only actions, source switching, latch
   discard, destroy, no cross-slot leakage.
7. Run the existing suite; keyboard/solo behavior must be unchanged.

Exit criteria:

- The pure arbiter is covered for all four plans.
- The scene can accept an injected source.
- No network, DOM, or UI changes are required for this phase.
- Existing tests pass.

---

### Phase 2 — Protocol, transport seam, and remote source

**Estimate:** 1–1.5 focused days.

Goal: a deterministic, Node-testable controller protocol and host-side remote
input source, without a real Worker.

Files:

- `src/net/protocol.ts` (new)
- `src/net/transport.ts` (new)
- `src/net/room-code.ts` (new)
- `src/net/remote-player-source.ts` (new)
- `src/net/session.ts` (new, host-side session)
- `tests/net/protocol.test.ts`
- `tests/net/remote-player-source.test.ts`
- `tests/net/session.test.ts`
- `tests/helpers/fake-transport.ts` (new or shared)

Tasks:

1. Define the versioned envelope, controller message union, error codes, size
   and rate caps, and schema validators.
2. Define `RoomTransport`:
   `connect`, `send`, `onMessage`, `close`, `state`; provide a WebSocket
   implementation and an in-memory fake with explicit queues.
3. Implement `RemotePlayerSource`:
   - ingest validated `NetInput`;
   - latest `moveX`;
   - latch/queue edge actions in arrival order;
   - drop stale/duplicate `seq`;
   - expose connection state;
   - `discard()` clears queues and latches.
4. Implement the host-side `RoomSession`:
   - connect as host;
   - send `host-hello` with `phoneSlots`;
   - track slot bindings and ready state;
   - heartbeat and RTT;
   - pause/resume;
   - close-slot for keyboard fallback;
   - graceful `session-end`.
5. Implement room code generation/normalization and QR URL fragment build/parse.
6. Tests:
   - protocol fixtures and invalid/oversize/rate cases;
   - all four input plans through fake transport;
   - edge coalescing across 1–3 fixed steps;
   - stale/duplicate/dropped frames;
   - slot ownership and cross-slot rejection;
   - reconnect and keyboard fallback;
   - assert no `run`/`world`/`ui` message is ever produced for a controller.

Exit criteria:

- A host runtime can be driven by fake controllers for K/P, P/K, and P/P.
- Reconnect/fallback logic is deterministic and covered without a browser.
- The transport seam is ready for the real Worker.

---

### Phase 3 — Worker and Durable Object

**Estimate:** 1.5–2 focused days. This phase is shared with M4.0b and should be
built once.

Goal: a real cloud relay with controller roles and slot reservations.

Files:

- `worker/src/index.ts`
- `worker/src/room.ts`
- `worker/wrangler.jsonc`
- `package.json` (pinned `wrangler` dev dependency)
- `worker/README.md`
- `tests/worker/*` or a local integration harness

Tasks:

1. Worker `/ws` upgrade validation, Origin allowlist, room-code normalization,
   and `env.ROOMS.getByName(code)` routing.
2. `GameRoom` Durable Object:
   - host and controller membership;
   - slot reservations from `host-hello.phoneSlots`;
   - bind one controller per slot;
   - reject duplicate slots, third controllers, and unopened slots;
   - relay `input`/`ping` to the host and control messages to controllers;
   - WebSocket hibernation and attachment-based membership;
   - size/rate limits;
   - no game loop, Matter.js, snapshot store, save, or evidence.
3. `wrangler.jsonc` with the `GameRoom` export and SQLite-backed DO; pinned
   Wrangler; `workers_dev` for M4.
4. `npx wrangler deploy --dry-run` must pass.
5. Tests:
   - host + one/two controllers;
   - duplicate slot/third controller/unopened slot rejected;
   - reconnect within grace;
   - close-slot and session-end;
   - Origin/size/rate failures;
   - hibernation/wake preserves bindings;
   - no controller game-state messages.

Exit criteria:

- A deployed or local Worker accepts two controllers in one room and rejects
  invalid membership.
- The DO contains no gameplay simulation.
- Config validation passes.

---

### Phase 4 — Host session wiring

**Estimate:** 1 focused day.

Goal: connect the real session and arbiter to the host run without changing
keyboard behavior.

Files:

- `src/game/boot.ts`
- `src/game/app-state.ts` or a new `src/game/run-session.ts`
- `src/world/room-scene.ts`
- `src/net/session.ts`
- `src/net/remote-player-source.ts`

Tasks:

1. Carry the `InputPlan` into the run start path.
2. Create the host session and remote sources for phone slots before the scene
   starts; attach them to the arbiter.
3. Wire slot readiness to the hub Start gate.
4. On controller disconnect:
   - pause the runtime;
   - show which slot is missing;
   - keep the simulation frozen;
   - allow reconnect, keyboard fallback, or end.
5. On keyboard fallback:
   - discard remote input;
   - clear the remote source from the arbiter;
   - close the slot in the session;
   - resume with keyboard for that slot.
6. On return to hub or session end:
   - close the transport;
   - destroy remote sources;
   - clear session state.
7. Keep solo and keyboard/keyboard paths free of network construction.
8. Integration tests with fake transport:
   - K/P, P/K, P/P;
   - pause/resume;
   - fallback;
   - scene teardown;
   - no P1/P2 leakage.

Exit criteria:

- The host runs all four plans with fake controllers.
- Keyboard-only and solo paths are unchanged.
- Session teardown leaves no listeners or timers.

---

### Phase 5 — Controller web app

**Estimate:** 1.5–2 focused days.

Goal: a small, usable phone controller page that joins by QR/code and sends
input only.

Files:

- `controller.html`
- `src/controller/main.ts`
- `src/controller/controller-ui.ts`
- `src/controller/touch-layout.ts`
- `src/controller/controller.css`
- `vite.config.ts` (multi-entry build)
- `tests/controller/*` or Playwright touch tests

Tasks:

1. Add a separate Vite entry that imports no Phaser, game runtime, pack loader,
   or assets.
2. Join flow:
   - parse `#room=...&slot=...`;
   - manual six-character code fallback;
   - slot label and connection status;
   - `ready` after the touch UI initializes.
3. Touch layout:
   - left thumb: left/right + jump;
   - right thumb: interact, scan, pulse, carry, throw, dash;
   - a secondary dialogue panel for confirm/cancel/navigate/choose;
   - large fixed targets, no text input, landscape prompt.
4. Input transport:
   - pointer events with capture and multi-touch;
   - send button edges immediately;
   - send movement on change plus 10 Hz keepalive;
   - `touch-action: none`, no zoom/scroll, safe-area insets;
   - wake lock when available; fallback guidance when not.
5. Connection UX:
   - reconnect screen and attempt count;
   - `pause`/`resume`/`session-end` messages;
   - RTT display;
   - no game state anywhere in the DOM.
6. Optional haptics via `navigator.vibrate` where supported.
7. Tests:
   - URL/code parsing;
   - touch events produce correct `NetInput` edges;
   - reconnect;
   - bundle contains no game assets/Phaser;
   - Playwright touch emulation for a two-phone session.

Exit criteria:

- A phone can join either slot by QR/code and control its player.
- The page loads no pack/game assets and renders no game state.
- Reconnect and session-end are clear and non-destructive.

---

### Phase 6 — Hub setup and pairing

**Estimate:** 1–1.5 focused days.

Goal: make the four input plans selectable and startable from the bathroom hub.

Files:

- `src/ui/hub-ui.ts`
- `src/ui/hub-model.ts`
- `src/ui/styles.css`
- `src/ui/qr.ts` (new)
- `src/game/boot.ts`
- `src/game/app-state.ts`

Tasks:

1. Add per-slot input selectors under Local co-op:
   `P1: Keyboard | Phone`, `P2: Keyboard | Phone`; default K/K.
2. When a phone is selected, show a setup panel:
   - one QR per phone slot, labelled P1/P2;
   - manual code fallback;
   - status: waiting, connected, ready, error;
   - "Use keyboard instead" per slot.
3. Gate Start:
   - K/K starts immediately;
   - phone slots must be ready, or explicitly downgraded before start.
4. On start, launch locally; controllers only transition to active.
5. Add the pause/disconnect overlay:
   - "P2 disconnected";
   - Wait for reconnect;
   - Continue with keyboard;
   - End session.
6. On return to hub, close the session and reset the plan to K/K (see open
   decision).
7. Keep the disabled Online co-op block for M4.0b; do not conflate it with phone
   setup.
8. Tests:
   - hub renders K/K by default;
   - phone setup states;
   - Start gating;
   - fallback;
   - keyboard/keyboard regression;
   - QR/code UI.

Exit criteria:

- A user can start all four plans from the hub.
- The keyboard default requires no network or QR.
- The disabled online block remains for M4.0b.

---

### Phase 7 — Latency, game feel, playtest, and close-out

**Estimate:** 1–1.5 focused days.

Goal: prove the feel is acceptable and close the milestone honestly.

Files:

- `src/net/latency.ts` or a debug HUD module
- `src/world/physics.ts` (coyote/buffer)
- `tests/physics.test.ts` or new input-feel tests
- `docs/m4/playtest-m4.0a.md` (new)
- M4 README and contract amendments

Tasks:

1. Add instrumentation:
   - controller RTT (`ping`/`pong`);
   - host input receipt, fixed-step wait, render time;
   - debug HUD, dev-only or hidden.
2. Add game-feel tolerances:
   - ~100 ms coyote time;
   - ~100–150 ms jump buffer;
   - optional dash buffer;
   - clear on respawn, hazard, and level change.
3. Run the latency playtest:
   - cloud in-region;
   - 2.4 GHz and 5 GHz;
   - TV/projector in game mode and laptop display;
   - keyboard baseline on the same display;
   - record p50/p95 input-to-photon.
4. Run the manual matrix:
   - K/K, K/P, P/K, P/P;
   - two phones, one phone, keyboard fallback;
   - disconnect/reconnect, host hidden, host leaves;
   - wake lock/screen lock, orientation, accessibility;
   - free-tier usage over a 30-minute session.
5. Update docs:
   - ADR statuses;
   - M4 README ladder and DoD;
   - architecture/failure/concurrency/module-boundary/interface amendments;
   - README/IMPLEMENTATION status after acceptance;
   - playtest note with measurements and known limitations.
6. Close-out: run all existing suites and the new controller suites.

Exit criteria:

- p95 ≤ 120 ms, or the miss is documented with the chosen fallback (local relay
  or keyboard).
- Coyote/buffer tests pass without double jumps or post-respawn fires.
- The manual matrix is recorded honestly.
- The definition of done in §12 is met.

---

## 7. Test matrix

| Area | Unit | Integration | Browser | Manual |
|---|---|---|---|---|
| K/K regression | Existing keyboard tests | Host runtime | Existing E2E | Yes |
| K/P | Arbiter | Fake transport | Touch context | Yes |
| P/K | Arbiter | Fake transport | Touch context | Yes |
| P/P | Arbiter | Fake transport | Two touch contexts | Yes |
| Slot ownership | Yes | Yes | Yes | — |
| Edge coalescing | Yes | Yes | — | — |
| Protocol/version | Yes | Yes | Yes | — |
| QR/code join | URL parser | Session | Yes | Yes |
| Disconnect/reconnect | — | Yes | Yes | Yes |
| Keyboard fallback | — | Yes | Yes | Yes |
| Host hidden/visible | — | Yes | Yes | Yes |
| Host leaves | — | Yes | Yes | Yes |
| Security/rate/Origin | Yes | Yes | Yes | — |
| No game state on phone | — | Yes | DOM/bundle check | Yes |
| Latency/feel | Physics tests | — | Instrumented | Yes |
| Existing suites | `npm test` | — | `smoke:e2e` | — |

New provisional commands:

```sh
npm run test:controller
npm run smoke:controller
```

Names are provisional; keep them separate from the existing suites until Phase 3.

---

## 8. Latency measurement plan

### Instrumentation

- Controller: RTT from `ping`/`pong`, reconnect count, connection state.
- Host: `receivedAt`, fixed-step wait, `appliedAt`, `renderedAt` for a debug HUD.
- Playtest: a high-frame-rate camera or screen recording can measure
  input-to-photon end to end; at minimum record RTT + step wait + render + known
  display latency.

### Conditions

| Condition | Why |
|---|---|
| Cloud WSS, in-region | Default architecture |
| Cloud WSS, cross-region/cellular | Honest remote/fallback behavior |
| 5 GHz Wi-Fi | Preferred local condition |
| 2.4 GHz Wi-Fi | Worst common local condition |
| TV/projector game mode | Shared-screen display |
| Laptop display | Low-latency baseline |
| Keyboard baseline | Isolates display latency from the network |
| Local relay (if implemented) | Compare against cloud |

### Decision rule

- p95 ≤ 120 ms: proceed with cloud WSS.
- p95 > 120 ms but local relay meets it: keep cloud as default, document local
  relay as the demo path.
- Neither meets it: keep keyboard co-op as the supported demo path and document
  the limitation. Do not add prediction or a second simulation.

---

## 9. Security and trust checklist

- [ ] Controller input is bound to one slot and cannot supply the other.
- [ ] Controller cannot send `pause`, `map`, `log`, `mute`, or `toggleP2`.
- [ ] Controller cannot write save, evidence, level, checkpoint, progression,
      puzzle, or gate state.
- [ ] Controller receives no `run`, `world`, `ui`, or asset data.
- [ ] Controller page loads no game content.
- [ ] Origin allowlist includes Pages and localhost only.
- [ ] Message size, input rate, and room membership are capped.
- [ ] Room code is a bearer token, not identity.
- [ ] No input payloads, evidence, or PII are logged.
- [ ] Evidence export remains host-only; controller input is not treated as
      trusted assessment.
- [ ] Version/build mismatch rejects before input.
- [ ] Reconnect restores the same slot only within the grace window.

---

## 10. Documentation updates

| Document | Change |
|---|---|
| `docs/adr-controller/README.md` | New domain index and scope |
| ADR-0066–0069 | New proposed records |
| `docs/m4/README.md` | M4.0a ladder, scope, deliverables, DoD, risks, verification |
| `docs/adr-online/README.md` | Cross-reference the controller phase; no rewrite of accepted records |
| `docs/adr-hub/README.md` | Local co-op phone setup; online block remains M4.0b |
| `docs/puzzle-engine/architecture.md` | Optional controller input path; authority unchanged |
| `docs/puzzle-engine/contracts/failure-semantics.md` | Controller disconnect/fallback |
| `docs/puzzle-engine/contracts/concurrency-topology.md` | Input arbiter and controller relay; single writer unchanged |
| `docs/puzzle-engine/contracts/module-boundaries.md` | `net` module and controller entry boundaries |
| `docs/puzzle-engine/contracts/interface.md` | Input-source contracts and controller page boundary |
| `README.md`, `IMPLEMENTATION.md` | Status after implementation |
| `docs/m4/playtest-m4.0a.md` | Latency and manual evidence |

---

## 11. Risks and mitigations

| Risk | Mitigation |
|---|---|
| Wi-Fi AP client isolation blocks phone↔laptop | Cloud WSS is the default; local relay is optional; add a connection test |
| Cloud latency is noticeable | Measure; use local relay if needed; keep keyboard fallback; add coyote/buffer |
| Touch ergonomics are poor for platforming | Large fixed targets, contextual verbs, haptics, playtest, allow keyboard fallback |
| Phone screen sleeps and drops the socket | Wake lock when available; reconnect; pause; clear guidance |
| Two-slot hub is confusing | K/K default, per-slot QR/status, explicit ready/error copy, "use keyboard" escape |
| Input ownership bugs | Pure arbiter tests; discard on every source change; no double sampling |
| TV/projector display latency dominates | Game mode; keyboard baseline; separate display from network in measurements |
| Scope creeps into M4.0b | Non-goals: no snapshots, no phone rendering, no prediction |
| Controller can spoof actions | Slot-bound connection; host allowlist; ownership validation |
| Controller page is stale after deploy | Build ID check; reload message; no degraded join |
| Worker/DO deployment fails | `wrangler deploy --dry-run`; local Worker tests; no game loop in DO |
| Free-tier limits | Input-only traffic; heartbeat; measure a 30-minute session |
| Evidence trust is overstated | Host-only export; document that controller input is not graded assessment |
| Keyboard regression | Keyboard-only path stays default; dedicated regression suite at every phase |
| Phase 1/2 code becomes framework-coupled | Pure TS contracts; no Phaser/DOM in arbiter/protocol; fake transport tests |

---

## 12. Definition of done

M4.0a is done when:

1. ADR-0066–0069 are accepted and indexed; this plan is approved.
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
8. A controller disconnect pauses the run; reconnect within 60 s restores the
   slot; keyboard fallback works; host departure ends cleanly.
9. Controllers cannot send host-only actions, save, evidence, or another
   slot's input; Origin/size/rate limits are enforced.
10. The latency playtest records keyboard baseline and phone p50/p95; the
    target is met or the chosen fallback is documented.
11. Coyote time and jump buffer are implemented and tested without changing
    keyboard/solo correctness.
12. Unit, integration, browser, and manual tests pass, including the existing
    `npm test`, pack validation/smoke, `smoke:e2e`, build, and `git diff --check`.
13. Docs are updated: controller ADR index, M4 README, architecture/contracts,
    README/IMPLEMENTATION status, playtest note.
14. The multiplayer ladder is explicit: M4.0a complete; M4.0b and M4.1 remain
    future phases.

---

## 13. Open decisions

| # | Decision | Recommendation |
|---|---|---|
| 1 | QR per phone slot or one QR plus a slot picker? | One QR per slot; clearer for a demo |
| 2 | Remember the last input plan or reset to K/K on return? | Reset to K/K; less surprise |
| 3 | Show dialogue choices on the phone or keep them on the shared screen? | Buttons only on the phone; shared screen for reading |
| 4 | Allow mid-run keyboard↔phone hot-swap beyond disconnect fallback? | No; only the pause/disconnect fallback |
| 5 | Build a local relay now? | No; cloud-first, add only if measurements require it |
| 6 | Allow pause from the phone? | No; host-only in M4.0a |
| 7 | Require PWA/home-screen installation? | No; optional, wake lock best-effort |
| 8 | Accept p95 ≤ 120 ms as the target? | Yes; adjust only after the Phase 7 measurement |
| 9 | Should the controller page show RTT? | Yes, dev/optional; useful evidence and support |
| 10 | Should the host show a per-slot "connected" HUD? | Yes, in the hub and pause overlay; no gameplay HUD clutter |

---

## 14. Traceability

| Decision | ADR | Phases | Verification |
|---|---|---|---|
| Phone controller is phase 1 of M4 | 0066 | 0, 7 | Scope/DoD review; no snapshot messages |
| Keyboard co-op remains default | 0066, 0067 | 1, 4, 6 | Existing suite; K/K regression |
| P1/P2 are independent input slots | 0067 | 1, 4, 6 | Arbiter unit tests; four-plan integration |
| Host is authority/display, not a player | 0067 | 1, 4, 6 | P/P session with host keyboard only for host actions |
| Controller role and slot reservation | 0068 | 2, 3, 5, 6 | Protocol/Worker tests; duplicate/third rejection |
| QR/code pairing | 0068 | 2, 5, 6 | URL parser; browser touch test |
| No game state on the phone | 0066, 0068 | 2, 5 | Message assertions; DOM/bundle check |
| Controller trust boundary | 0068 | 2, 4, 6 | Security tests; host-only action rejection |
| Reconnect and keyboard fallback | 0067, 0068 | 2, 4, 6 | Failure tests; manual matrix |
| Latency budget and no prediction | 0069 | 7 | Playtest p50/p95; physics tests |
| Coyote time and jump buffer | 0069 | 7 | Physics/input-feel tests |
| Cloud-first, local relay optional | 0066, 0068, 0069 | 0, 3, 7 | Deployment check; measurement decision |

---

## 15. Out of scope

- M4.0b guest renderer, world/UI snapshots, interpolation, guest save/evidence.
- M4.1 full-pack online and guest gate/debrief.
- Phone-rendered game view, video streaming, spectator view.
- Bluetooth, native apps, or a phone as a Bluetooth HID device.
- Accounts, matchmaking, lobbies, chat, voice, profiles, PII.
- Third player, spectators, or a controller+guest mix for one slot.
- Trusted graded assessment.
- New content, puzzles, levels, abilities, art, audio, or save fields.
- Gamepad support (the input seam may accept it later, but it is not M4.0a).

---

## 16. First action after approval

Phase 1 starts with the pure input contract and arbiter only:

- no `worker/` directory;
- no network client;
- no hub UI;
- no controller page;
- no gameplay behavior change.

The first reviewable increment is a keyboard-only regression that passes
unchanged, plus pure arbiter tests for K/K, K/P, P/K, and P/P. If that increment
cannot keep keyboard behavior identical, stop and fix the seam before adding
transport.
