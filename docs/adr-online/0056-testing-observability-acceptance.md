# ADR-0056: Testing, observability, and acceptance evidence

- **Status:** Proposed
- **Date:** 2026-10-28
- **Deciders:** Snorre
- **Related:** ADR-0047–0055

## Context

Online co-op adds asynchronous, two-client behavior that is hard to test with
the existing single-browser suites. The repository already has:

- Vitest unit/integration tests;
- `pack:validate`, `pack:smoke`, and `smoke:e2e`;
- Playwright with system Chrome;
- headless runtime tests that do not touch DOM/Phaser.

M4 needs deterministic tests for protocol and state application, plus a
two-browser smoke for the real WebSocket path. It also needs observability that
does not leak inputs or evidence.

## Decision

### 1. Test layers

| Layer | Scope | Environment |
|---|---|---|
| Unit | protocol codec, version, snapshot application, input coalescing, ownership, error mapping | Vitest, no network |
| Integration | host runtime + fake transport + guest adapter; initial run, snapshots, actions, save/evidence | Vitest, no DOM/Phaser |
| Browser | host + guest in two contexts, real WebSocket relay, scene/UI, reconnect | Playwright, local Worker or mock relay |
| Manual | latency, host tab, final art/materials, accessibility, free-tier usage | Two browsers, deployed/preview |

### 2. Deterministic transport seam

- The client uses a `RoomTransport` interface:

```ts
interface RoomTransport {
  connect(): Promise<void>;
  send(message: ClientMessage): void;
  onMessage(handler: (message: ServerMessage) => void): () => void;
  close(reason?: string): void;
  readonly state: "idle" | "connecting" | "open" | "closed";
}
```

- Production uses the WebSocket implementation.
- Tests use an in-memory transport with explicit queues and tick control.
- The host session and guest session depend on the interface, not the DOM or
  `WebSocket` global.

### 3. Snapshot fixtures

- Golden fixtures for `RunSnapshot` and `NetWorld`/`NetUi` from `03-nerve-forest`.
- A fixture can be replayed into a guest adapter without Phaser.
- Fixtures are versioned with the protocol; mismatches fail loudly.
- The M2 multi-level fixture verifies that `levelId`/`roomId` changes rebuild the
  guest scene state.

### 4. Two-browser E2E

The Playwright test:

1. starts a local Worker/DO (or an in-memory relay with the same protocol);
2. boots host in context A and creates a room;
3. boots guest in context B and joins with the code;
4. moves both players; verifies tether/camera and P1/P2 positions;
5. starts a P1 conversation and a P2 conversation; verifies distinct surfaces;
6. solves the M2 03 puzzle (Node Run) on the host; verifies guest puzzle
   state;
7. finishes the host debrief; verifies guest snapshot and host export;
8. disconnects/reconnects the guest; verifies host pause/resume;
9. rejects a version-mismatched guest;
10. ends the session and verifies both clients return cleanly.

The test must not depend on a fixed wall-clock delay; use protocol events and
bounded polling.

### 5. Failure injection

Test at least:

- dropped/duplicate/out-of-order guest input;
- dropped world/UI snapshots;
- heartbeat timeout;
- guest reconnect within/beyond grace;
- host visibility hidden/visible;
- malformed/oversize/rate-limited messages;
- wrong Origin;
- version mismatch;
- third player;
- DO hibernation/wake;
- host disconnect.

### 6. Observability

Client diagnostics (dev-only or a hidden debug panel):

- connection state and role;
- RTT;
- last host tick and snapshot age;
- reconnect count;
- dropped/stale input count;
- build/pack/protocol version.

Worker/DO logs:

- session ID, error code, message counts, room code or hash;
- no input payloads, no evidence, no PII;
- no full stack traces to clients.

Metrics:

- active rooms/sessions (if available from Cloudflare analytics);
- request/DO usage;
- deployment/build version;
- error rates by code.

### 7. Acceptance evidence

M4 closes with:

- unit/integration/browser test results;
- a two-browser manual playtest record (solo host + guest);
- latency measurements in-region and cross-region;
- free-tier usage after a 30-minute session;
- known limitations: guest input latency, host single point of failure, public
  evidence trust, one-level scope;
- updated ADR index, architecture/contracts, README, and deployment docs.

### 8. What is not tested

- Full anti-cheat or adversarial guests.
- Cross-browser determinism (not applicable to thin client).
- Mobile/touch.
- Host migration.
- Full M2 pack online (M4.1).
- Network conditions beyond a simulated delay/loss profile.

## Consequences

**Easier:**

- Most logic is testable without a browser.
- The transport seam makes reconnect and failure tests deterministic.
- The two-browser smoke proves the real path without making every test E2E.
- Observability stays privacy-preserving.

**Harder:**

- Two test harnesses (in-memory and real WebSocket) must stay aligned.
- Playwright two-context tests are slower and flakier than unit tests.
- Snapshot fixtures must be updated with protocol/view changes.
- Cloudflare local `wrangler dev` adds a test dependency.

**Constrained:**

- No load/performance testing beyond two players.
- No adversarial security testing.
- No full-pack online coverage in M4.0.

## Alternatives considered

- **Only E2E tests.** Rejected: slow, flaky, and poor failure localization.
- **Only Node tests with mocks.** Rejected: does not prove the real WebSocket,
  Phaser scene, or Worker route.
- **Record/replay production traffic.** Rejected: privacy and complexity.
- **Use a third-party relay for tests.** Rejected: the Worker/DO is part of the
  contract and must be exercised.

## Tests

- Protocol codec/version/error mapping.
- Snapshot application and interpolation.
- Input coalescing/duplicate/stale/owner mismatch.
- Save/evidence host-only and P2 attribution.
- Failure injection list above.
- Two-browser E2E list above.
- M2 multi-level fixture and M3 final manifest.
- Existing M1–M3 suites unchanged.

## References

- `vitest.config.ts`, `playwright.config.ts`
- `tests/`, `e2e/m1.spec.ts`
- `scripts/pack-validate.ts`, `scripts/pack-smoke.ts`
- ADR-0047–0055
