# ADR-0053: Failure semantics, reconnect, and host lifecycle

- **Status:** Proposed
- **Date:** 2026-10-28
- **Deciders:** Snorre
- **Related:** ADR-0047, ADR-0048, ADR-0049, ADR-0051, ADR-0054

## Context

Online co-op has failure modes that local play does not:

- WebSocket idle timeouts and Cloudflare runtime deploys;
- guest tab sleep, network loss, or browser refresh;
- host tab background throttling;
- version skew between two GitHub Pages clients;
- a host who closes the laptop;
- a DO that hibernates and wakes.

The game is a co-op learning session, not a competitive service. M4 favors a
clean, explicit pause/end over silent divergence or false recovery.

## Decision

### 1. Heartbeat and idle timeout

- Both sides send an application-level heartbeat every **20–30 seconds**.
- The DO may use WebSocket auto-response for the heartbeat without waking the
  hibernated object.
- Cloudflare’s edge may close idle WebSockets after roughly 100 seconds; the
  heartbeat stays well below that.
- Heartbeat failure marks the peer “unstable” and starts the reconnect path.

### 2. Guest disconnect

1. Host detects socket close or heartbeat timeout.
2. Host pauses the fixed-step simulation and shows “P2 disconnected — waiting
   for reconnect.”
3. Guest reconnects with the same room code/role within **60 seconds**.
4. Host validates the handshake and sends a fresh `run`/`world`/`ui` state.
5. Session resumes from the host’s current state.
6. If the window expires, host ends the session and returns to local play/menu.

No gameplay is simulated while the guest is absent. No P2 input is fabricated.

### 3. Host disconnect

1. Guest receives `session-end` or detects close.
2. Guest shows “Host left” and returns to local boot/menu.
3. There is no host migration. The guest cannot take authority.
4. The host’s local save remains on the host; the guest cannot resume it.

### 4. Host tab visibility

- On `visibilitychange` to hidden, host pauses the session, sends `pause`, and
  stops advancing the simulation.
- On visible, host resumes and sends a fresh state/snapshot.
- The guest shows “Host paused” rather than a frozen world with no explanation.
- The host must not rely on background timers or `setInterval` simulation.

### 5. Version and protocol mismatch

- Checked during `hello`, before any run state is sent.
- Mismatch reasons:
  - different build ID;
  - different pack/content version;
  - unsupported protocol version;
  - missing/invalid `hello`.
- The client shows a clear message and a reload/update action. The host does not
  start the guest in a degraded state.

### 6. Message and rate failures

- Invalid JSON, unknown message type, missing fields, oversize payload, or
  owner mismatch are rejected.
- Transient invalid input is dropped and counted; repeated abuse closes the
  session.
- A malformed host snapshot causes the guest to freeze and request a full
  resync; it does not partially apply.
- The DO does not inspect gameplay payloads beyond envelope size/type; the host
  validates gameplay.

### 7. Deploy and runtime restart

- Cloudflare Workers deploy/runtime restart disconnects WebSockets.
- The host page cannot preserve authority across a full page reload; the online
  session ends.
- The guest sees host-left, not a silent freeze.
- A future reconnectable host process would need a new ADR.

### 8. DO hibernation

- The DO may hibernate while sockets remain open.
- Membership/role is restored from socket attachments and `getWebSockets()`.
- The DO does not hold authoritative game state; the host resends state after a
  guest reconnect.
- No `setInterval` or game loop keeps the DO awake.

### 9. Error taxonomy

| Code | Meaning | Recovery |
|---|---|---|
| `ROOM_FULL` | host/guest slot occupied | guest picks another code |
| `ROOM_INVALID` | malformed/missing code | host regenerates |
| `VERSION_MISMATCH` | build/pack/protocol mismatch | reload/update |
| `ORIGIN_REJECTED` | disallowed Origin | use the deployed client |
| `BAD_MESSAGE` | schema/size/rate failure | drop or close |
| `PEER_TIMEOUT` | heartbeat missed | reconnect window |
| `HOST_LEFT` | host ended/disconnected | session over |
| `GUEST_LEFT` | guest ended/disconnected | host pauses |
| `HOST_HIDDEN` | host tab hidden | pause/resume |
| `PROTOCOL_ERROR` | unrecoverable sequence/state | session over |

## Consequences

**Easier:**

- Explicit pause/end states are easier to reason about than silent drift.
- Host authority remains intact through reconnects.
- The guest can recover from transient network loss.
- Version skew is caught before play.

**Harder:**

- Reconnect requires a fresh full-state resend.
- Host visibility handling is mandatory.
- The host is a single point of failure.
- Deployment and runtime restarts are session-ending events.

**Constrained:**

- No host migration.
- No server-held game state.
- No background host simulation.
- No silent auto-recovery from a host refresh.

## Alternatives considered

- **Let the guest keep simulating during a host outage.** Rejected: diverges
  from authority and creates conflicting save/evidence.
- **Host migration via DO state.** Rejected for M4: needs a full state transfer,
  new authority election, and anti-cheat; a new ADR.
- **Keep the host simulation running in a background tab.** Rejected: browser
  throttling makes it unreliable.
- **Reconnect by replaying inputs.** Rejected; full host state resend is simpler
  and more robust.
- **Ignore host visibility.** Rejected: guest freezes without explanation.

## Tests

- Guest disconnect → host pause → reconnect within grace → resume.
- Guest disconnect beyond grace → clean end.
- Host disconnect → guest end state.
- Host tab hidden/visible → pause/resume messages.
- Heartbeat timeout detection.
- Version mismatch rejection before run.
- Malformed/oversize/rate-limited messages.
- DO hibernation/wake preserves membership.
- Worker deploy disconnect produces host-left, not silent freeze.

## References

- `docs/puzzle-engine/contracts/failure-semantics.md`
- `docs/puzzle-engine/contracts/concurrency-topology.md`
- ADR-0047, ADR-0048, ADR-0049, ADR-0054
