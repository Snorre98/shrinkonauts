# ADR-0068: Controller session, pairing, and trust boundary

- **Status:** Accepted
- **Date:** 2026-11-01
- **Deciders:** Snorre
- **Related:** ADR-0048, ADR-0049, ADR-0050, ADR-0053, ADR-0054, ADR-0055,
  ADR-0056, ADR-0066, ADR-0067, ADR-0081
- **Later decision (2026-11-04):** ADR-0081 makes M4.0a the complete multiplayer
  scope; M4.0b/M4.1 are not planned. The controller session and trust decisions
  remain accepted.

## Context

A phone controller needs a session that is trivial to join and cheap to operate.
The game has no accounts, matchmaking, or persistent profiles. The host browser
is authoritative; the phone is an untrusted input device. The shared screen
already renders all game content, so the network only needs to carry input and
connection control.

The existing online domain already defines a room code, one Durable Object per
room, WebSocket hibernation, heartbeat, reconnect, Origin allowlists, and rate
limits. M4.0a should reuse those boundaries rather than invent a second
networking stack. It must not, however, inherit the guest's world/UI snapshot
obligations or the host = P1 assumption.

Pairing must work on a phone with minimal typing. A QR code is the primary
path; a short room code is the fallback. The controller page is served from the
same static deployment as the game, so it shares the build identity but loads
no pack or game assets.

## Decision

### 1. Roles and slots

The Worker/DO accepts three roles for a controller session:

| Role | Count | Authority |
|---|---:|---|
| `host` | 1 | Authoritative game, save, evidence, host actions |
| `controller` | 0–2 | Input for exactly one slot (`p1` or `p2`) |

A controller `hello` carries `role: "controller"` and `slot: "p1" | "p2"`.
The DO binds the socket to that slot. A room accepts at most one controller per
slot and at most two controllers total. Duplicate slots, a third controller,
and unknown roles are rejected.

A controller room does not accept a `guest` in M4.0a. The guest role remains
part of M4.0b. A room cannot assign a controller and a guest to the same slot.

### 2. Slot reservation

- The host creates the room with the phone-enabled slots from its input plan,
  for example `phoneSlots: ["p2"]` or `["p1", "p2"]`.
- The DO stores the open slots for the room and rejects a controller for a slot
  that was not opened.
- Keyboard slots are never opened to controllers.
- The host may close an empty slot before the run starts by recreating the room
  or sending an explicit slot-close message.
- Once a controller is bound to a slot, only that connection (or a reconnect
  with the same slot within the grace window) can use it.

### 3. Room lifecycle

The controller phase uses the online room lifecycle with a smaller client set:

```text
created → waiting-for-controllers → controllers-ready → active
                                             ↘ paused
                                             ↘ ended
```

- `created`: host socket connected; phone slots recorded.
- `waiting-for-controllers`: QR/code is shareable; controllers may join.
- `controllers-ready`: every phone-enabled slot has a connected, ready
  controller; the host may start.
- `active`: the run is playing; controllers send input.
- `paused`: a controller disconnected, the host tab is hidden, or the host
  paused.
- `ended`: host left/ended, version rejected, grace expired without fallback,
  or an unrecoverable protocol error.

The host starts the run. Controllers do not receive a launch cinematic, pack
state, or initial run snapshot; they only change from "connected" to "active".

### 4. Protocol subset

M4.0a uses the ADR-0049 envelope and the `NetInput` shape, but only the
controller-relevant messages:

| Direction | Message | Payload / purpose |
|---|---|---|
| controller → host | `hello` | role, slot, protocol, build ID |
| host → controller | `welcome` | session ID, slot, heartbeat interval |
| controller → host | `ready` | page loaded and touch UI initialized |
| controller → host | `input` | `seq`, `clientTick`, `NetInput` |
| controller → host | `ping` | `t0` for RTT display |
| host → controller | `pong` | echo `t0` |
| host → controller | `pause` / `resume` | reason and state |
| host → controller | `session-end` | reason (host left, slot closed, grace expired) |
| either | `error` | code and human-readable message |

Explicitly absent: `run`, `world`, `ui`, snapshot interpolation, pack/content
versions, and texture/asset data. A controller must never receive game state.

`NetInput` is the ADR-0049 §5 shape for one player:

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

The host validates shape, ranges, action set, rate, sequence, and slot ownership.
It queues edge-triggered actions, coalesces multiple frames before a fixed step,
and drops stale or duplicate sequence numbers. `clientTick` is diagnostic only;
the host clock is authoritative.

### 5. Pairing

- The host hub shows one QR per phone-enabled slot, labelled `P1` and `P2`.
  A single QR with a slot picker is an acceptable fallback but not the default.
- The QR encodes the deployed controller URL with a fragment:
  `https://<pages>/controller.html#room=<code>&slot=<p1|p2>`.
- The room code is also shown as six characters for manual entry.
- The QR never contains a secret, API token, or Worker credential.
- The controller page shows the slot it is claiming, the connection state, and
  a short control legend. It does not show game state.
- The host can revoke a controller before start by closing the slot; the
  controller returns to the join screen.

### 6. Controller page boundary

- The controller page is a separate static entry (`controller.html` plus a
  small TypeScript/CSS bundle). It does not import Phaser, the game runtime, the
  pack loader, or game assets.
- It loads no pack or content and therefore needs no pack/content version
  handshake. It checks the protocol version and build ID only.
- It is designed for a phone browser in landscape: fixed, large touch targets;
  no text input; no world view.
- It may display connection status, RTT, battery/visibility hints, and a
  reconnect action. It must not display puzzle, dialogue, feedback, save, or
  evidence state.
- The page is installable as a PWA/home-screen shortcut only if it remains
  static and cache-safe; installation is optional for M4.0a.

### 7. Cloud-first transport, optional local relay

- Primary: WSS to the Worker, one Durable Object per room, WebSocket
  hibernation, no game loop in the DO.
- The Worker validates the upgrade and route; the DO validates membership,
  slot reservations, envelope size, and relay permissions.
- A local relay on the host laptop is allowed only behind the same protocol if
  measurements show the cloud path cannot meet the latency budget. It is not
  the default because AP client isolation, HTTPS contexts, and wake lock make
  it less reliable in classrooms and guest networks.
- Bluetooth and native apps remain out of scope (ADR-0066).

### 8. Failure and reconnect

- Controller disconnect: the host pauses, tells the other controller, and shows
  which slot is missing.
- Reconnect within 60 seconds restores the same slot and session; the host
  resumes from its current state.
- Reconnect beyond the window ends that slot. The host may continue with the
  keyboard for that slot, or end the session.
- Host tab hidden: the host pauses and notifies controllers; visible resumes.
- Host leaves or ends: controllers receive `session-end` and return to the join
  screen. There is no host migration.
- Keyboard fallback closes the controller slot explicitly; the phone cannot
  silently reclaim it.

### 9. Versioning

- `PROTOCOL_VERSION` covers the controller message set.
- `BUILD_ID` is the same static build identity used by the host page.
- A protocol or build mismatch is rejected during `hello`, before input flows.
- No pack, content, or asset version is required for a controller.
- A controller from an old cached build shows "Reload the controller page" and
  does not join in a degraded state.

### 10. Security and trust boundary

- The controller is untrusted input. It cannot send:
  - P1 input on a P2 slot, or any other slot's input;
  - host-only actions (`pause`, `map`, `log`, `mute`, `toggleP2`);
  - save, evidence, level, checkpoint, progression, puzzle, or gate changes;
  - chat, display names, or arbitrary text.
- The host enforces slot ownership and action allowlists. The DO enforces
  membership, slot reservations, Origin, size, and rate.
- The room code is a bearer token for room access, not identity or
  authentication.
- Origin allowlist includes the deployed Pages origin and localhost in
  development.
- Limits follow ADR-0054: 8 KiB controller messages, ~120 input messages/s,
  heartbeat 20–30 s, at most two controllers.
- No input payloads, evidence, or PII are logged.
- Host-only save and export remain an integrity convenience, not a security
  guarantee. Controller input is suitable for consented demos and playtests,
  not graded assessment.

## Consequences

**Easier:**

- One transport and room lifecycle serve M4.0a and later M4.0b.
- QR pairing needs no accounts or typing.
- The controller page is cheap to host and load.
- Least-privilege controllers cannot corrupt the run.
- Reconnect and keyboard fallback are explicit and testable.
- Any local co-op level works without content changes.

**Harder:**

- The DO and host must track slots in addition to roles.
- Two phone slots add pairing and readiness states to the hub.
- A controller session needs its own protocol fixtures and browser tests.
- Cloud latency and Wi-Fi conditions must be measured.
- A cached controller page can be stale; build checking is mandatory.

**Constrained:**

- No game state on the phone.
- No guest renderer in the same room.
- No accounts, matchmaking, chat, voice, or spectators.
- No native/Bluetooth controller.
- No trusted public assessment.
- No pack/content handshake for controllers.

## Alternatives considered

- **Reuse the guest role for phones.** Rejected: it would force world/UI
  snapshots and a second renderer onto a client that needs neither.
- **Host + guest + controller in one room.** Rejected for M4.0a; two player
  slots are the cap and a guest/controller mix adds lifecycle ambiguity.
- **Long random invite token instead of a 6-character code.** More secure but
  worse to share; the short code is accepted for a private demo with rate and
  Origin controls.
- **WebRTC/PeerJS instead of WSS.** Lower latency after setup, but signaling,
  TURN, and failure modes are more complex; deferred unless measurements prove
  WSS inadequate.
- **Local-only relay.** Best latency but blocked by AP isolation and HTTPS
  constraints; retained as a measured fallback.
- **QR with an embedded room secret.** Rejected: the QR is public on a shared
  screen; the code is already a bearer token.
- **Send a minimal game HUD to the phone.** Rejected: splits attention and
  reintroduces state replication for no gameplay need.
- **Bluetooth/native controller.** Rejected in ADR-0066.

## Tests

- Host + one controller and host + two controllers join; a third and duplicate
  slot are rejected.
- A controller cannot claim an unopened or already-bound slot.
- QR URL and manual code both reach the correct slot.
- `hello` rejects protocol/build mismatch before input.
- Input is applied to the correct slot; P1/P2 never swap.
- Edge actions survive coalescing; stale/duplicate sequences are dropped.
- Controller cannot send host-only actions, save, evidence, or another slot's
  input.
- Oversize, malformed, rate-limited, and wrong-Origin messages are rejected.
- Disconnect pauses; reconnect within grace restores; keyboard fallback closes
  the slot; grace expiry ends cleanly.
- Host hidden/visible pauses/resumes; host departure ends the session.
- No `run`/`world`/`ui` message is ever sent to a controller.
- Controller page loads no game assets and works with any local level/pack.
- DO hibernation/wake preserves membership and slot bindings.

## References

- ADR-0048 — room lifecycle and DO membership
- ADR-0049 — envelope and `NetInput`; §3–§4 and §6 are deferred
- ADR-0050 — ownership and input routing
- ADR-0053 — failure, reconnect, host lifecycle
- ADR-0054 — security, privacy, abuse
- ADR-0055 — deployment and versioning
- ADR-0056 — testing and observability
- ADR-0066 — phase scope
- ADR-0067 — per-player slots
- [`../m4/phone-coop-implementation-plan.md`](../m4/phone-coop-implementation-plan.md)
