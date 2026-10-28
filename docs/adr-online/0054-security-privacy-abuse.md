# ADR-0054: Security, privacy, and abuse boundaries

- **Status:** Proposed
- **Date:** 2026-10-28
- **Deciders:** Snorre
- **Related:** ADR-0048, ADR-0049, ADR-0051, ADR-0053, ADR-0055

## Context

M4 is a public-internet demo with a shareable room code. It has no accounts,
no authentication, no chat, and no persistent user data. The host browser is
authoritative, so a guest can send arbitrary messages but cannot directly write
the host run. The Worker/DO still need basic abuse boundaries and privacy
discipline.

The game records learning evidence. A public guest is not a trusted assessment
subject. M4 must say this plainly rather than implying that host authority is
anti-cheat.

## Decision

### 1. Room code is a bearer token

- The 6-character code grants access to a room while the host is present.
- It is not authentication or identity.
- Codes are not listed, searchable, or exposed through an API.
- A host may regenerate a code before the guest joins.
- Code reuse after an empty room is allowed; no stale state is retained.

### 2. Origin allowlist

- The Worker accepts WebSocket upgrades only from configured origins:
  - the deployed GitHub Pages origin;
  - `http://127.0.0.1:*` / `http://localhost:*` in development.
- A missing or unlisted `Origin` is rejected in production.
- CORS is not relevant to raw WebSockets, but Origin validation is.
- The allowlist is configuration, not hard-coded in the client.

### 3. Membership and roles

- Max two sockets: one host, one guest.
- Third connection, duplicate host, or duplicate guest rejected.
- Role is assigned by the URL/hello and validated by the DO; a guest cannot
  claim host.
- The host is the only authority for game state and save.

### 4. Message validation

- Envelope version, type, room, role, and size are validated at the edge/DO.
- Gameplay payloads are validated by the host:
  - schema and numeric ranges;
  - allowed action set;
  - surface owner;
  - rate and sequence.
- Guest cannot:
  - set P1 input;
  - open host-only modals;
  - write save or evidence;
  - change level, checkpoint, progression, or gate solution directly.
- Invalid messages are dropped or close the session with a diagnostic code.

### 5. Limits

Recommended M4 limits:

| Limit | Value |
|---|---|
| Guest→host message | 8 KiB |
| Host→guest message | 128 KiB |
| Guest input rate | 120/s |
| Guest action rate | 8/s |
| Host world snapshots | 30/s |
| Host UI snapshots | 15/s |
| Room sockets | 2 |
| Room code attempts per IP | modest, DO/Worker-level |
| Heartbeat | 20–30 s |

Exact values are configuration and may be tuned after measurement. The
principle is fixed: no unbounded payloads, rates, or room membership.

### 6. No chat, voice, accounts, or PII

- No free-text chat in M4.
- No voice.
- No accounts, emails, display names, or persistent profiles.
- No analytics/telemetry beyond Cloudflare’s operational logs and minimal
  worker logs (error code, room/session ID, no payload contents).
- Do not log input streams or evidence payloads.

### 7. Evidence trust

- Host-only export is an integrity convenience, not a security guarantee.
- A public guest can send arbitrary valid-looking input; the host records it as
  P2.
- M4 evidence is suitable for consented playtests and demos, not graded
  assessment.
- Any future public/graded deployment needs authentication, server-side
  validation, and a separate ADR.

### 8. Secrets and deployment

- `CLOUDFLARE_API_TOKEN` and account ID live in GitHub Actions secrets, not in
  the repo or client bundle.
- `VITE_NET_URL` is public configuration, not a secret.
- The Worker has no database credentials in M4.
- No `.env` with secrets is committed.

### 9. Abuse response

- Rate-limit connection attempts and room creation at the Worker/DO.
- Close abusive sessions with a reason.
- Expire empty rooms.
- Do not expose stack traces or internal paths to clients.
- Log enough to debug (error code, session ID) but not gameplay payloads.

## Consequences

**Easier:**

- Two-player rooms are cheap to protect with size/rate/role checks.
- No account or privacy compliance scope.
- Origin allowlist and room cap block casual abuse.
- Evidence trust boundary is explicit.

**Harder:**

- A public code can still be shared beyond the intended friend.
- No identity means no ban/blocklist beyond IP/rate controls.
- Host-side validation is the only gameplay validation.
- Logs must be deliberately minimal.

**Constrained:**

- No chat/voice/social features.
- No public matchmaking.
- No trusted assessment.
- No persistent identity or room history.

## Alternatives considered

- **Long random invite token.** More secure but harder to share; short code is
  enough for a private demo. Rejected for M4.
- **Accounts/OAuth.** Rejected: disproportionate, adds PII and persistence.
- **Server-side input validation/anti-cheat.** Rejected for M4: the host is
  authoritative and the game is co-op; a new server authority is a different
  project.
- **No Origin check because WebSockets bypass CORS.** Rejected: Origin is still
  available and useful against casual cross-site connections.
- **Log full messages for debugging.** Rejected: privacy and payload risk.

## Tests

- Unknown/missing Origin rejected in production; localhost allowed in dev.
- Third socket, duplicate host/guest rejected.
- Oversize/unknown/malformed message rejected.
- Guest P1 input, host-only action, save/export attempts rejected.
- Rate limits trigger drop/close.
- No PII is required or logged.
- Evidence trust note appears in docs/export metadata if applicable.

## References

- `docs/puzzle-engine/contracts/failure-semantics.md`
- ADR-0048, ADR-0049, ADR-0051, ADR-0053, ADR-0055
