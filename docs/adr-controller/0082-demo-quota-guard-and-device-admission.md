# ADR-0082: Demo quota guard and device admission

- **Status:** Accepted
- **Date:** 2026-11-04
- **Deciders:** Snorre
- **Related:** ADR-0066–0069, ADR-0081, ADR-0054 (historical), ADR-0055

## Context

The controller relay is a public-internet demo on the Cloudflare Workers Free
plan. The relevant free-tier limits are:

- Workers: 100,000 requests per day.
- Durable Objects: 100,000 requests per day. Incoming WebSocket messages are
  billed at a 20:1 ratio; outgoing messages and protocol pings are free.
- Durable Objects duration: 13,000 GB-s per day.
- Workers Logs: 200,000 observability events per day.

The relay is input-only and the host browser is authoritative. The product is
same-room and shared-screen only (ADR-0081): one host/display and up to two
phone controllers, with no remote guest and no fourth device.

The initial relay had four gaps that made accidental or deliberate misuse
expensive:

1. A controller upgrade for any well-formed room code was routed to
   `ROOMS.getByName(code)` before the relay knew the room existed. A random or
   stale code created or woke a room Durable Object.
2. `GameRoom.fetch()` accepted the WebSocket before `RoomCore.onConnect()`
   finished validating it. A controller could connect before the host had sent
   `host-hello`, and a controller could occupy a slot without completing
   `hello` or `ready`.
3. Workers Logs was enabled with default invocation logs. At the controller's
   10 Hz input rate, two controllers generate 72,000 WebSocket events per hour
   before pings. Invocation logs alone could exhaust the 200,000/day allowance
   in under three hours.
4. The input rate cap was 120 messages per second per controller. Combined with
   a long session, a malicious controller could consume a large share of the
   daily Durable Object request budget even though the game only needs 10 Hz.

The demo needs a guard that is simple to operate, hard to trip accidentally,
and configurable without a code change. It does not need accounts,
authentication, anti-cheat, or a general abuse platform.

## Decision

### 1. Scope

- The relay remains an input-only controller relay for same-room play.
- A room has exactly one host socket and at most two controller sockets.
- There is no guest role, no spectator, no fourth device, and no remote
  rendering.
- The guard protects the Cloudflare free quota and the integrity of one demo
  session. It does not promise availability against a determined attacker.

### 2. One global demo gate

A singleton `DemoGate` Durable Object owns the daily budget and the active-room
registry. It is not a room and never sees input or game state.

The gate stores, per UTC day:

- `sessions`: admitted sessions;
- `attempts`: host admissions and manual-code controller lookups;
- `deviceIssues`: issued device tokens;
- `active`: room code to host device ID and session expiry.

It enforces:

| Limit | Default |
|---|---:|
| Sessions per UTC day | 50 |
| Concurrent active rooms | 2 |
| WebSocket admission attempts per UTC day | 5,000 |
| Device-token issues per UTC day | 500 |

A host device owns at most one active session. Creating a new session with the
same host device supersedes that device's previous active room; this prevents a
hub plan change or a host refresh from producing a false concurrency denial.
The daily session count is still incremented.

Every limit is a Worker var. The gate fails closed: if it is unavailable, a new
session or manual-code join is rejected rather than admitted without a budget.

### 3. Signed room ticket

A session is admitted by `POST /session` before the host WebSocket opens. The
Worker:

1. verifies the host device token;
2. asks the gate to admit the room;
3. signs a stateless room ticket containing the normalized room code and the
   session expiry.

The ticket is `HMAC-SHA256` over `room:<room>:<expiresAt>` and is returned to
the host. The host puts it in each controller QR fragment:

```text
controller.html#room=ABC234&slot=p1&ticket=v1.ABC234.<exp>.<sig>
```

The controller upgrade is verified at the Worker edge. A forged, expired, or
wrong-room ticket is rejected before any room Durable Object is created or
woken. The host upgrade also verifies the ticket and confirms that the gate
still considers the room active. The ticket is a bearer value for room access;
it is not identity.

The Worker forwards the verified device ID and expiry to the room Durable
Object in internal `x-demo-device` and `x-demo-expires` headers. The Durable
Object is not publicly reachable, so it can trust those headers.

### 4. Manual six-character code

The six-character room code remains the fallback when a phone cannot scan the
QR.

- The controller sends `role=controller`, the room code, the slot, and its
  device token, with no room ticket.
- The Worker asks the gate whether that room is active.
- Inactive room: `404` at the edge, no room Durable Object.
- Active room: route to the room Durable Object, where the normal device and
  slot checks still apply.

The manual code is a bearer token for the room. The device token prevents a
forged device identity, and the slot cap prevents a third controller. The QR
ticket is the stronger path because a guessed code is useless without it.

### 5. Server-issued device identity

Every browser obtains a server-issued device token from `POST /device`.

- The Worker generates a random 128-bit device ID and signs
  `device:<deviceId>:<expiresAt>` with HMAC-SHA256.
- The token is valid for 24 hours by default and is cached in `localStorage`.
- The host and controller pages share the same origin, so they share one device
  identity. A host screen cannot also claim a controller slot.
- A device cannot occupy both controller slots.
- A controller slot is bound to one device for the session. On disconnect the
  slot remains reserved for that device; a different device is rejected until
  the host closes the slot or ends the session.
- `close-slot` blocks the removed device for the rest of the session.
- The Durable Object stores device IDs only in WebSocket attachments for the
  life of the room. No device ID is logged and no PII is collected.

Clearing site data, using a private window, or using a different browser
profile creates a new device ID. The server cannot prevent that. The three-
socket cap still makes more than one host and two controllers impossible; the
device ID prevents one stored identity from taking multiple slots.

### 6. Three-socket admission

Admission happens before `acceptWebSocket()`, not after it.

The room Durable Object checks, in order:

1. a device identity and a future session expiry are present;
2. the host slot is free (host role) or the host is ready and the slot is open
   (controller role);
3. the controller count is below two;
4. the requested slot is in the host's `phoneSlots` and is not already bound;
5. the slot is not reserved for a different device;
6. the device is not the host device (unless explicitly allowed for testing);
7. the device is not blocked and is not bound to the other slot;
8. the room has not reached its join cap.

Only then does the Durable Object accept the socket. Rejections return `409`,
`403`, or `410` without a `101` upgrade. Membership is rebuilt from attachments
after hibernation and re-checked for the controller cap, duplicate slot, and
duplicate device.

A controller connects with `slot=p1|p2` in the WebSocket URL. The slot is bound
at admission; the later `hello` validates the protocol, build, and slot but
does not reserve anything.

Handshake and readiness are bounded:

- a controller that does not send `hello` within 10 seconds is closed with
  `join-timeout`;
- a controller that does not send `ready` within 15 seconds of `hello` is
  closed with `ready-timeout`;
- a room admits at most 20 controller joins (including reconnects) per session.

### 7. Session and message limits

- A session starts when `POST /session` admits it and runs for 5 minutes of
  wall-clock time. Setup time counts. A Durable Object alarm ends the room with
  `session-end` reason `demo-time-limit`, closes all three sockets, and releases
  the gate lease.
- A room-wide message cap of 12,000 inbound WebSocket messages ends the room
  with reason `demo-message-limit`.
- Controller messages are limited to 20 per second across `input`, `ping`,
  `ready`, and `hello`. The controller normally sends input at 10 Hz.
- Host messages are limited to 60 per second.
- The existing 8 KiB message-size cap remains.
- The room alarm is scheduled only when a deadline changes, not on every input
  message, so the guard does not add a storage write per frame.

The message cap is the hard backstop. With the default 50 sessions, the worst
case is 50 × 12,000 ÷ 20 = 30,000 Durable Object requests from input, plus the
gate and connection requests. That leaves roughly 2.5× headroom against the
100,000/day limit.

### 8. Observability

Workers Logs is disabled for the deployed demo:

```jsonc
"observability": {
  "enabled": false
}
```

The Worker does not call `console.log` in the request or message paths. Live
debugging uses `wrangler tail`, which does not write Workers Logs events. If a
future deployment needs stored errors, it must use
`logs.invocation_logs: false` and a small `head_sampling_rate`; leaving
invocation logs on is incompatible with a 10 Hz WebSocket relay on the free
plan.

### 9. Client behavior

- The controller stops sending input while the page is hidden and sends one
  empty frame on hide to release held controls.
- The controller gives up after 5 reconnect attempts, in addition to the
  60-second reconnect window.
- The host releases its gate lease on explicit end and on hub teardown through
  a best-effort `POST /session/release`; the room Durable Object also releases
  the lease when it closes.
- The host shows the 5-minute limit and handles `demo-time-limit` as a normal
  session end, not a crash.

### 10. Configuration and secrets

All limits are plain Worker vars in `worker/wrangler.jsonc`. The defaults are
listed in the appendix. Values are parsed with safe clamps in
`worker/src/demo-config.ts`.

`DEMO_SIGNING_SECRET` is a Worker secret, not a checked-in var. Local
development and unit tests use a documented development fallback. A deployed
Worker must set the secret with `wrangler secret put DEMO_SIGNING_SECRET`.
`ALLOWED_ORIGINS` must include the deployed Pages origin; the checked-in
default contains only local development origins.

### 11. Fail closed

- Missing or invalid device token: reject.
- Missing or invalid room ticket: reject.
- Gate unavailable or over budget: reject with a clear message and
  `Retry-After`.
- Room Durable Object unavailable: reject.
- An expired session: reject at the edge and end the room at the alarm.

The demo may become unavailable for the rest of the UTC day if the daily budget
is exhausted. That is preferable to exceeding the Cloudflare free limits.

## Threat model and non-goals

**Protected:**

- the Cloudflare free-tier request, duration, and observability budgets;
- the three-device product boundary;
- one session's slots from being silently taken by a different device;
- accidental old-QR and random-code traffic.

**Not protected:**

- a determined attacker can exhaust the daily demo capacity, making the demo
  unavailable until 00:00 UTC;
- a device that clears its storage or uses a new profile can obtain a new device
  ID;
- a holder of a valid QR can attempt to take an open slot; the host can close
  the slot;
- a true layer-7 flood is Cloudflare DDoS/WAF territory, not application code;
- controller input is not trusted assessment and the host remains the only
  authority.

## Consequences

**Easier:**

- The free-tier worst case is bounded by configuration, not by trust.
- Random and stale joins never create room Durable Objects.
- The host plus two phones is a logical maximum, not a convention.
- Reconnect is tied to the same device, so a slot cannot be stolen during the
  grace window.
- The same guard is reusable for any future local controller page.

**Harder / accepted trade-offs:**

- The relay now has a global singleton Durable Object and two HTTP admission
  endpoints.
- A host refresh or plan change may consume another daily session; the daily
  cap of 50 is deliberately generous for a demo.
- Device identity is per browser storage, not per physical device.
- The 5-minute wall-clock limit includes setup time.
- The demo can be intentionally exhausted for a day.

## Alternatives considered

- **Only per-room limits, no global gate.** Rejected: an attacker can create
  many rooms, each individually bounded, and still exceed the daily budget.
- **Gate-only without tickets.** Rejected: every random or stale join would
  wake the gate, and a guessed active room code would be enough to attempt a
  slot.
- **Client-generated device IDs.** Rejected: forgeable and not server-issued.
- **No device IDs.** Rejected: one browser could take both controller slots and
  a different phone could steal a reconnect slot.
- **Long invite token instead of a six-character code.** The QR ticket already
  provides the strong path; the short code remains a deliberate demo fallback.
- **Cloudflare Turnstile or a WAF rate rule.** Deferred: a useful future layer,
  but not required for the same-room demo and not a substitute for the quota
  guard.
- **Paid plan.** Out of scope; the demo is designed to fit the free plan.

## Tests

- Gate: daily session, concurrent-room, attempt, and device-issue caps; UTC
  reset; same-device supersede; release; restore.
- Ticket: sign/verify, expiry, tampering, wrong room, wrong secret.
- Device token: issue, expiry, tampering, wrong secret.
- Worker edge: `/device`, `/session`, `/session/release`; CORS; invalid and
  expired tokens; host and controller ticket checks; manual-code active-room
  lookup; rejected joins never call `ROOMS`.
- Room: admission before accept; host before controller; second host; third
  controller; duplicate slot; unopened slot; host-device rejection; same device
  in both slots; slot reservation and same-device reconnect; blocked device;
  session alarm; handshake/ready timeout; message cap; all-message rate limit;
  hibernation restore.
- Client: device token cache and refresh; room session creation; release;
  reconnect-attempt cap; hidden-tab input stop.
- Configuration: defaults, clamps, observability disabled, gate binding and
  export present in `wrangler.jsonc`.
- Browser: two-phone controller smoke with separate browser contexts (distinct
  device IDs), reconnect, keyboard fallback, and end.

## Relationship to prior ADRs

- ADR-0081 defines the same-room, three-device product boundary that this
  record makes enforceable.
- ADR-0068 defines the controller role, pairing, and trust boundary; this
  record adds quota and device admission around it.
- ADR-0054 (historical) describes the relay's original Origin, size, rate, and
  membership limits; this record replaces its "modest, DO-level" approach with
  explicit budgets and edge admission.
- ADR-0055 (historical) remains the deployment and rollback reference. This
  record adds `DEMO_SIGNING_SECRET` to the deployment secret list.
- ADR-0057 remains the Wrangler/Terraform ownership rule; the gate is another
  Wrangler-owned Durable Object.

## Appendix: defaults

| Var | Default |
|---|---:|
| `DEMO_MAX_SESSIONS_PER_DAY` | 50 |
| `DEMO_MAX_CONCURRENT_ROOMS` | 2 |
| `DEMO_MAX_WS_ATTEMPTS_PER_DAY` | 5,000 |
| `DEMO_MAX_DEVICE_ISSUES_PER_DAY` | 500 |
| `DEMO_MAX_SESSION_MINUTES` | 5 |
| `DEMO_MAX_MESSAGES_PER_ROOM` | 12,000 |
| `DEMO_MAX_CONTROLLER_MESSAGES_PER_SECOND` | 20 |
| `DEMO_MAX_HOST_MESSAGES_PER_SECOND` | 60 |
| `DEMO_MAX_JOINS_PER_ROOM` | 20 |
| `DEMO_RECONNECT_GRACE_SECONDS` | 60 |
| `DEMO_HANDSHAKE_TIMEOUT_SECONDS` | 10 |
| `DEMO_READY_TIMEOUT_SECONDS` | 15 |
| `DEMO_DEVICE_TOKEN_TTL_HOURS` | 24 |
| `DEMO_IP_WS_ATTEMPTS_PER_MINUTE` | 30 |
| `DEMO_IP_SESSION_ATTEMPTS_PER_MINUTE` | 10 |
| `DEMO_IP_DEVICE_ISSUES_PER_MINUTE` | 10 |
| `DEMO_ALLOW_HOST_DEVICE_AS_CONTROLLER` | false |
| `observability.enabled` | false |
