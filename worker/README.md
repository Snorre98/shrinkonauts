# Shrinkonauts room relay (M4.0a)

Cloudflare Worker + one `GameRoom` Durable Object per room. The relay handles
membership, controller slot reservations, WebSocket hibernation, and message
forwarding. It does not run the game.

## Files

- `src/index.ts` — Worker entry and `GameRoom` export.
- `src/router.ts` — `/ws` upgrade, Origin, room-code, and role validation.
- `src/room.ts` — Cloudflare Durable Object and socket adapter.
- `src/room-core.ts` — deterministic membership and relay rules.
- `wrangler.jsonc` — checked-in Worker configuration.

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

The controller page is served at
`/controller.html#room=<code>&slot=<p1|p2>`. Start a phone plan on the host
page, then open that URL on a phone. The hub QR/setup panel arrives in Phase 6;
until then the room code is exposed as `window.__shrinkonauts.controllerRoomCode`
and in the host console in development.

## Verification

```sh
npm run worker:typecheck
npm run worker:dry-run
npm test
npm run test:controller
npm run smoke:controller
```

`worker:dry-run` bundles and validates the configuration without deploying.

## Configuration

`ALLOWED_ORIGINS` is a comma-separated public allowlist. The checked-in default
contains only local development origins. Before deploying, set the deployed
Pages origin in the Cloudflare dashboard or via a Wrangler environment override;
do not add a secret to `wrangler.jsonc`.

The Pages build reads `VITE_NET_URL` and `VITE_BUILD_ID`. When `VITE_NET_URL` is
unset, K/K and solo remain fully local; starting a phone plan shows a
configuration error instead of opening a socket.

`ROOMS` is the Durable Object binding. `GameRoom` uses the declarative `exports`
field with SQLite storage, matching ADR-0057. Room membership and slot bindings
live in WebSocket attachments, so hibernation and wake reconstruct membership
without a game-state database.

## Deployment

Deploy only from an approved branch after the Worker tests and dry-run pass:

```sh
npx wrangler deploy -c worker/wrangler.jsonc
```

The Worker deployment is independent of the GitHub Pages game build. A Worker
deploy disconnects active sockets; clients reconnect or start a new room.
