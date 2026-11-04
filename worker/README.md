# Shrinkonauts room relay (M4.0a)

Cloudflare Worker + Durable Objects for the same-room, input-only phone
controller relay. One `GameRoom` Durable Object owns membership and message
forwarding; one singleton `DemoGate` Durable Object owns the demo's daily budget
and active-room registry. The relay does not run the game.

## Files

- `src/index.ts` — Worker entry, `GameRoom` and `DemoGate` exports.
- `src/router.ts` — `/device`, `/session`, `/session/release`, `/ws`; Origin,
  ticket, device, CORS, and per-IP edge checks.
- `src/ticket.ts` — HMAC-signed room tickets and device tokens.
- `src/gate-core.ts` — pure daily budget and active-room rules.
- `src/gate.ts` — `DemoGate` Durable Object storage wrapper.
- `src/room.ts` — `GameRoom` Durable Object, admission-before-accept, alarms,
  and gate release.
- `src/room-core.ts` — deterministic membership, device/slot binding, relay,
  message and rate limits.
- `src/demo-config.ts` — config parsing, defaults, and clamps.
- `wrangler.jsonc` — checked-in Worker configuration.

## Admission flow

1. Each browser calls `POST /device` and caches the server-issued device token.
2. The host calls `POST /session` with the room code and its device token. The
   gate admits the session and the Worker returns a signed room ticket.
3. The host opens `/ws?role=host&room=...&ticket=...&device=...`.
4. The host shows a QR per phone slot containing the room, slot, and ticket.
5. A controller calls `POST /device`, then opens
   `/ws?role=controller&room=...&slot=p1&ticket=...&device=...`.
6. The manual six-character fallback omits the ticket; the Worker checks the
   gate's active-room registry instead of creating a room.
7. A host can release early with `POST /session/release`; the room also releases
   the gate lease when it ends.

The Worker rejects an invalid ticket, invalid device token, inactive manual
code, expired session, or gate denial **before** `ROOMS.getByName()`. Random and
stale joins therefore do not create or wake a room Durable Object.

## Three-device admission

A room has exactly one host socket and at most two controller sockets. The
`GameRoom` checks all of this before `acceptWebSocket()`:

- host present and ready before controllers;
- controller count below two;
- slot in the host's `phoneSlots` and not already bound;
- slot not reserved for another device;
- device is not the host device;
- device is not blocked and is not bound to the other slot;
- room join cap not reached.

The slot is bound from the WebSocket URL. A disconnected controller's slot stays
reserved for the same device; a different device is rejected until the host
closes the slot or ends the session. `close-slot` blocks the removed device for
the session.

## Limits

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

The gate resets at 00:00 UTC. The 5-minute session clock starts when
`POST /session` admits the session; setup time counts.

Worst case with the defaults:

- 50 sessions × 12,000 messages ÷ 20 = 30,000 Durable Object requests from
  input, plus gate/connection requests and alarms — under 100,000/day.
- Workers requests are dominated by the 5,000 admission-attempt cap.
- Workers Logs is disabled, so observability events stay at zero.

## Configuration and secrets

`ALLOWED_ORIGINS` is a comma-separated public allowlist. The checked-in default
contains only local development origins. Before deploying, set the deployed
Pages origin in the Cloudflare dashboard or via a Wrangler environment override.

`DEMO_SIGNING_SECRET` is a Worker secret used for room tickets and device
tokens. Set it before deploying:

```sh
npx wrangler secret put DEMO_SIGNING_SECRET -c worker/wrangler.jsonc
```

Local development and unit tests use a documented development fallback. Do not
put the secret in `wrangler.jsonc`.

Workers Logs is deliberately disabled in `wrangler.jsonc`. Use `wrangler tail`
for live debugging. Do not add `console.log` to request or message paths: with
a 10 Hz controller relay, invocation logs alone can exhaust the free daily
observability allowance.

## Local development

From the repository root:

```sh
npm run worker:dev
```

The Worker listens on `127.0.0.1:8787` and accepts local Vite origins by
default. Start Vite with the relay URL:

```sh
VITE_NET_URL=ws://127.0.0.1:8787 npm run dev
```

The host page obtains its device token automatically. A phone that scans the
host's QR obtains its own token. The host laptop and a controller tab on the
same browser profile share a device identity, so the host cannot also be a
controller; use a separate browser profile or phone to test both roles.

## Verification

```sh
npm run worker:typecheck
npm run worker:dry-run
npm test
npm run test:controller
npm run smoke:controller
```

`worker:dry-run` bundles and validates the configuration without deploying.
`smoke:controller` runs the real local Worker and Vite with separate browser
contexts for the host and each phone, so each has a distinct device ID.

## Deployment

Deploy only from an approved branch after the Worker tests and dry-run pass:

```sh
npx wrangler deploy -c worker/wrangler.jsonc
```

The Worker deployment is independent of the GitHub Pages game build. A Worker
deploy disconnects active sockets; clients reconnect or start a new room.
