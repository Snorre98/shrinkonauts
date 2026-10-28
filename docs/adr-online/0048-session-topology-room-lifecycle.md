# ADR-0048: Two-player session topology and room lifecycle

- **Status:** Proposed
- **Date:** 2026-10-28
- **Deciders:** Snorre
- **Related:** ADR-0047, ADR-0049, ADR-0053, ADR-0054, ADR-0055

## Context

M4 needs a join mechanism that is trivial to share and cheap to operate. The
game has no accounts, matchmaking, or persistent profiles. The host is a
browser, not a server. The free-tier target is GitHub Pages + Cloudflare
Workers + Durable Objects.

A room code is a bearer token: anyone with the code can attempt to join. M4
only needs two players and a short-lived session, so a persistent room service
would be overbuilt.

## Decision

### 1. One Durable Object per room code

The Worker exposes:

```text
GET /ws?room=<code>&role=host|guest
```

It validates the WebSocket upgrade, normalizes the 6-character code, and routes
to:

```ts
env.ROOMS.getByName(code)
```

One DO instance owns the membership and message relay for that room. The DO
uses WebSocket hibernation (`ctx.acceptWebSocket`) and `serializeAttachment` for
the role, not a persistent room database.

### 2. Membership

The DO accepts:

- at most one `host`;
- at most one `guest`;
- no spectators and no third player.

A second host, second guest, or unknown role is rejected with a close code and
a human-readable reason. The host creates the code; the guest joins it. The
host may regenerate a code before the guest joins.

### 3. Session states

```text
created → waiting-for-guest → handshake → active
                                      ↘ paused
                                      ↘ ended
```

- `created`: host socket connected; no guest.
- `waiting-for-guest`: code is shareable; host sees a waiting state.
- `handshake`: roles exchanged; build/pack/protocol versions validated.
- `active`: host has sent the initial run state and guest is ready.
- `paused`: guest lost or host tab hidden; host simulation is frozen.
- `ended`: host left, host ended, version rejected, or unrecoverable protocol
  error.

The host starts the run only after the guest is ready. The host may remain in a
waiting lobby indefinitely; empty rooms hibernate, and no persistent room state
survives.

### 4. Host and guest departure

- **Guest disconnect:** the host pauses the simulation and shows “P2
  disconnected.” The guest may rejoin the same room with the same role within
  the grace window (recommended 60 s). After the window, M4.0 ends the session;
  continuing with a closed guest slot is a future option.
- **Host disconnect:** the session ends. The guest sees “host left.” There is no
  host migration.
- **Host ends:** the guest receives a clean `session-end` message and returns to
  the local menu/boot state.
- **Worker deploy/runtime restart:** sockets disconnect. The host page loses its
  session; the guest sees host-left. Clients may retry a new room, not resume
  the old authority.

### 5. Room-code rules

- 6 characters from an unambiguous alphabet; no profanity filtering needed for
  a private demo.
- Code is not identity, authentication, or authorization beyond room access.
- A room code may be reused after the DO is empty and evicted; there is no
  persistent history.
- The Worker/DO do not expose a room list or code enumeration endpoint.

### 6. No persistence in the DO

The DO stores only ephemeral membership and role attachments. It does not store
the run, evidence, or game state. The host can resend the initial state after a
guest reconnect. If the DO hibernates, it wakes on the next message; membership
is reconstructed from attachments and active sockets.

## Consequences

**Easier:**

- One shareable code; no accounts or lobby UI.
- One DO per room gives a single message-ordering point.
- Hibernation keeps idle rooms cheap.
- Third-player and role-conflict behavior is explicit.

**Harder:**

- The host must stay connected; a refresh ends the session.
- Reconnect must restore the guest role and re-send state.
- A public code is guessable; security is rate/origin based, not secret-based.
- Empty-room cleanup and code reuse need tests.

**Constrained:**

- Exactly two players; no spectators.
- No host migration.
- No persistent rooms or match history.
- No room discovery.

## Alternatives considered

- **One global room.** Simpler, but any third player collides and there is no
  isolation. Rejected.
- **Worker-only relay without a DO.** A Worker cannot coordinate multiple
  sockets; rejected.
- **A database-backed room service.** Overbuilt for two players and introduces
  storage/privacy scope. Rejected.
- **Random long invite token instead of a short code.** More secure but harder
  to share; M4 uses a short code and accepts the bearer-token risk.
- **Host as a WebRTC peer with Worker signaling.** Deferred; see ADR-0047.
- **Persistent room list.** Rejected; no matchmaking in M4.

## Tests

- Host creates, guest joins, session becomes active.
- Second host/second guest/third player rejected.
- Guest disconnect pauses host; rejoin within grace restores role.
- Guest disconnect beyond grace ends the session cleanly.
- Host disconnect ends session; guest returns to local state.
- Invalid/oversize/missing room code rejected.
- DO hibernation and wake do not lose membership.
- Empty room can be reused without stale state.

## References

- `docs/puzzle-engine/architecture.md` §7
- `docs/puzzle-engine/contracts/failure-semantics.md`
- ADR-0047, ADR-0049, ADR-0053, ADR-0054
