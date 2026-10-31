# ADR-0055: Deployment, versioning, and rollback

- **Status:** Proposed
- **Date:** 2026-10-28
- **Deciders:** Snorre
- **Related:** ADR-0048, ADR-0049, ADR-0053, ADR-0054, ADR-0057

## Context

The current client deploys to GitHub Pages from `.github/workflows/deploy-pages.yml`.
M4 adds a Cloudflare Worker and one Durable Object class. The two deployments
must stay compatible, and a mismatch must fail before gameplay rather than
producing divergent state.

The free-tier target is non-negotiable for M4: GitHub Pages + Workers Free +
Durable Objects Free (SQLite-backed). No paid plan is required for a two-player
demo.

ADR-0057 defines the IaC ownership boundary: Wrangler is canonical for Worker
code, bindings, and Durable Object class lifecycle; Terraform is optional and
account-scoped. This ADR covers the Worker deployment mechanics, versioning, and
rollback within that boundary.

## Decision

### 1. Client hosting stays on GitHub Pages

- The existing Vite build and `deploy-pages.yml` remain.
- `VITE_NET_URL` is supplied at build time (repository/environment variable).
- The client opens `wss://<worker>/ws?room=...&role=...`.
- The Pages origin is added to the Worker `ALLOWED_ORIGINS`.

A future migration to one Worker with static assets is allowed but not part of
M4; it would replace the Pages deployment rather than duplicate it.

### 2. Worker and DO deploy separately

- New `worker/` directory:
  - `src/index.ts` — upgrade validation, route to DO;
  - `src/room.ts` — `GameRoom` Durable Object;
  - `wrangler.jsonc` — name, main, compatibility date, DO binding, `exports`.
- Wrangler is pinned in `package.json`; CI uses that version. No global
  Wrangler install is assumed.
- New `.github/workflows/deploy-worker.yml`:
  - runs the online tests;
  - runs `npx wrangler deploy --dry-run` for config validation;
  - deploys with `cloudflare/wrangler-action` using the pinned version;
  - requires `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` secrets.
- `deploy-pages.yml` stays independent; either deployment can be rerun alone.
- Terraform is not required for M4. If account-level infrastructure is added,
  it follows ADR-0057 and does not own the Worker script or DO class.

### 3. Durable Object configuration

- One `GameRoom` class, SQLite-backed (required on Free).
- Binding: `ROOMS`.
- New Worker uses the declarative `exports` field, not the legacy `migrations`
  array:

```jsonc
{
  "durable_objects": {
    "bindings": [{ "name": "ROOMS", "class_name": "GameRoom" }]
  },
  "exports": {
    "GameRoom": { "type": "durable-object", "storage": "sqlite" }
  }
}
```

- `exports` and `migrations` are mutually exclusive. A new M4 Worker uses
  `exports`; legacy Workers with migration history keep `migrations`.
- WebSocket hibernation API (`ctx.acceptWebSocket`, `getWebSockets`,
  `serializeAttachment`).
- No alarms or background game loop required.
- `workers_dev = true` for M4; custom domain is optional.

### 4. Build and content versioning

- `BUILD_ID` = git commit SHA (or a Vite-injected equivalent).
- `PACK_ID`, `PACK_VERSION`, `CONTENT_VERSION` from the loaded pack.
- `PROTOCOL_VERSION` in the online module.
- The `hello` handshake compares all of them before sending the run.
- A mismatch shows: “Both players must use the same build. Reload and try
  again.”
- Vite hashed assets plus the build ID cover stale GitHub Pages caches; the
  handshake is the final guard.

### 5. Configuration

- `VITE_NET_URL` — public Worker WebSocket origin.
- `ALLOWED_ORIGINS` — Worker environment variable, comma-separated.
- `ROOM_CODE_LENGTH` — default 6.
- `MAX_ROOM_SOCKETS` — 2, not configurable in M4.
- `HEARTBEAT_SECONDS` — 25.
- `GUEST_RECONNECT_SECONDS` — 60.
- No secrets in the client bundle.

### 6. Local development

- `npx wrangler dev` on `127.0.0.1:8787`.
- Vite on `127.0.0.1:5173`.
- `VITE_NET_URL=ws://127.0.0.1:8787`.
- `ALLOWED_ORIGINS=http://127.0.0.1:5173,http://localhost:5173`.
- A two-browser smoke can run against local Wrangler or a mock relay.

### 7. Rollback

- Pages: rerun the last known-good `Deploy to GitHub Pages` workflow or revert
  `main`.
- Worker: rerun the last known-good `Deploy Worker` workflow or `wrangler
  rollback`.
- Because Worker deploy disconnects WebSockets, rollback ends active online
  sessions. Clients reconnect to a new room; they do not resume authority.
- A protocol/build mismatch after rollback is rejected by the handshake.

### 8. Free-tier accounting

M4 documents:

- Workers Free: 100,000 requests/day; static assets on Pages are separate.
- WebSocket upgrade = one request.
- Worker-routed WebSocket messages do not count as requests.
- DO incoming messages are billed at 20:1; outgoing and protocol pings are free.
- DO Free: 100,000 requests/day, 13,000 GB-s/day, 5 GB SQLite.
- 100-second edge idle timeout; heartbeat 25 s.
- A two-player session at 20 Hz snapshots + 60 Hz input is small; measure after
  a 30-minute session.
- If a session approaches limits, cap snapshots/inputs; do not upgrade to Paid
  for M4.

### 9. Observability

- Worker/DO logs: error code, session ID, room code (or a hash), message counts.
- No gameplay payloads, inputs, or evidence in logs.
- Client diagnostics: connection state, RTT, last tick, snapshot age.
- Cloudflare analytics are the source of truth for request/DO usage.

### 10. Infrastructure-as-code boundary

- Wrangler is the canonical owner of the Worker script, bindings, `exports`,
  `workers_dev`, Worker-scoped routes, vars, limits, and observability.
- Terraform, if used, owns only account/zone resources such as DNS, custom
  domains, zone-level routes, WAF/rate limits, and future shared storage.
- No resource is owned by both tools. A custom domain is either declared in
  `wrangler.jsonc` or Terraform, not both.
- Terraform state, if introduced, is remote and locked; it never contains
  runtime secrets.
- The presence of Terraform does not change the rollback model: Worker code is
  rolled back with Wrangler; account infrastructure is rolled back with
  Terraform.
- See ADR-0057 for the full ownership matrix and migration path.

## Consequences

**Easier:**

- Pages remains the static host; no migration.
- Worker/DO can be rolled back independently.
- Version mismatch is caught before state transfer.
- Free-tier fit is explicit.
- Wrangler-only deployment is sufficient for M4; Terraform can be added at the
  account layer without changing Worker code.

**Harder:**

- Two deployments must be coordinated.
- Worker deploy disconnects sessions.
- Build ID must be injected consistently into Pages builds.
- `workers.dev` Origin allowlisting needs the exact Pages origin.
- A future Terraform layer adds a second credential/state/rollback path.

**Constrained:**

- No paid plan requirement.
- No single-Worker static hosting in M4.
- No persistent DO storage.
- No zero-downtime online deploy in M4.
- No Terraform ownership of the M4 Worker or DO class.
- No dual-managed DNS/routes/resources.

## Alternatives considered

- **Serve the client from the Worker too.** Cleaner same-origin, but replaces
  the existing Pages deploy and adds migration scope. Deferred.
- **Cloudflare Pages Functions + DO.** Similar, but Workers static assets is the
  current path; Pages is already working. Rejected for M4.
- **One combined workflow.** Rejected: a Worker failure should not block a
  client deploy, and vice versa.
- **Custom domain.** Optional; `workers.dev` is enough for M4.
- **Paid DO plan for always-on rooms.** Rejected: two-player demo fits Free.
- **Terraform-only Worker/DO deployment.** Rejected for M4: Durable Object
  class lifecycle and first-apply ordering are awkward, iteration is slower,
  and Wrangler is still required for local dev/bundling. See ADR-0057.
- **Cloudflare dashboard configuration.** Rejected: not reproducible, not
  reviewable, and prone to drift.
- **Terraform owning Worker code while Wrangler builds it.** Rejected: two
  owners for one artifact and unclear version semantics.

## Tests

- Pages build receives `VITE_NET_URL` and `BUILD_ID`.
- Worker upgrade validation, Origin allowlist, DO route.
- `worker/wrangler.jsonc` validates against the pinned schema.
- `npx wrangler deploy --dry-run` succeeds.
- `hello` rejects build/pack/protocol mismatch.
- Local `wrangler dev` + Vite two-browser smoke.
- Worker deploy smoke; rollback smoke.
- Free-tier usage recorded after a 30-minute session.
- No secret appears in the client bundle or `wrangler.jsonc`.
- If Terraform exists: `terraform fmt -check`, `validate`, and `plan` pass; no
  duplicate Worker/route ownership.

## References

- `.github/workflows/deploy-pages.yml`
- `.github/workflows/ci.yml`
- `vite.config.ts`
- `docs/puzzle-engine/architecture.md` §7
- ADR-0048, ADR-0049, ADR-0053, ADR-0054
- [ADR-0057](0057-infrastructure-as-code-deployment-ownership.md) — IaC and
  deployment ownership
