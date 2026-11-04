# ADR-0081: Same-room, shared-screen multiplayer

- **Status:** Accepted
- **Date:** 2026-11-04
- **Deciders:** Snorre
- **Related:** ADR-0047–0057 (historical online domain), ADR-0058–0059,
  ADR-0066–0069

## Context

M4.0a proved phone-controller, same-screen co-op end to end: the host browser
owns the simulation and shared display, P1 and P2 are independent input slots,
and a Cloudflare Worker/Durable Object relays controller input only.

The remaining M4.0b design was a remote guest: a second browser that joins with
a room code, receives host world/UI snapshots, interpolates them, and sends P2
input. That design adds a fourth device to the product, plus a snapshot
publisher, a remote renderer path, guest UI mirroring, interpolation, guest
reconnect/save handling, and a second browser E2E surface.

The intended product is played by people in the same room, looking at one shared
screen, like a console with detachable controllers. The host/display is the
console; P1 and P2 are local input slots, each either the host keyboard or a
phone. A remote guest is not a product requirement.

## Decision

### 1. Multiplayer is same-room and shared-screen

- One host/display browser owns the simulation, rendering, audio, save, and
  evidence.
- P1 and P2 are input slots. Each slot is `keyboard` or `phone`.
- The host keyboard may serve one or both slots. When both slots use phones, the
  host is display-only.
- At most three physical devices are involved: the host/display, the P1 phone,
  and the P2 phone. A keyboard slot may reduce that count.
- There is no remote guest client, no fourth device, and no second rendered game
  view.

### 2. The network carries input only

- The Cloudflare Worker/Durable Object remains the controller relay.
- Controller messages are limited to the M4.0a input/control subset.
- No game state, `RunSnapshot`, world snapshot, UI snapshot, pack data, assets,
  save, evidence, chat, or host action crosses the wire to a controller.
- The host applies controller input at the next fixed step and remains the only
  writer of gameplay, puzzle, progression, narrative, feedback, save, and
  evidence state.

### 3. M4.0a is the complete multiplayer scope

- M4.0b (remote guest rendering, snapshots, interpolation, prediction) is **not
  planned**.
- M4.1 (full-pack online) is **not planned**.
- The active M4 work is limited to M4.0a Phases 5.5–7: remove the obsolete
  online placeholder, complete hub pairing/start gating, and finish latency and
  input-feel work.

### 4. Remove the online placeholder

The bathroom hub advertises Solo and Local co-op only. The following are
removed:

- the `online` hub mode;
- the disabled “Online co-op” radio and “Multiplayer” panel with Host/Join
  buttons;
- `HubOnlineView`, `HubPackView.online`, and `onlineAvailable`;
- `PackCatalogEntry.online` and the `online` flags in `public/packs/index.json`;
- related styles, tests, and active documentation instructions.

The Worker, Durable Object, controller page, input arbiter, host session, and
phone input plan remain.

## Consequences

**Easier:**

- One authority model and one render path.
- No snapshot publisher, guest renderer, interpolation buffer, or prediction.
- No guest save/evidence or guest UI callback surface.
- A smaller trust boundary: controllers cannot receive game state and cannot
  send host actions.
- The free-tier relay remains small because it carries input only.
- The product statement is unambiguous: same-room console-style co-op.

**Harder / accepted trade-offs:**

- Remote play is not supported.
- The host/display must be physically present with the players.
- Phone input still depends on network RTT. Phase 7 measures it and adds
  coyote/jump buffering rather than prediction.
- Local Wi-Fi alone is not the default transport because AP isolation and HTTPS
  constraints make a cloud relay more reliable. A local relay remains an
  optional measured fallback.

**Constrained:**

- No remote guest, spectators, matchmaking, accounts, chat, or voice.
- No four-device topology.
- No guest rendering, snapshots, interpolation, prediction, rollback, or host
  migration.
- Controller input is suitable for consented same-room demos, not trusted graded
  assessment.

## Relationship to prior ADRs

- ADR-0047–0052 described remote guest co-op. Their guest-rendering and snapshot
  scope is superseded by this record. They remain in the repository for
  historical precedent.
- ADR-0048/0049 input-relay details, ADR-0053 failure/reconnect, ADR-0054
  security, ADR-0055 deployment, ADR-0056 testing, and ADR-0057 IaC remain
  useful historical context for the input-only relay.
- ADR-0066–0069 remain accepted. ADR-0066’s framing of the phone phase as the
  first phase of a remote-online ladder is narrowed: the phone phase is the
  complete multiplayer scope.
- ADR-0058–0059 remain unchanged; the hub now advertises Solo and Local co-op
  only.

## Alternatives considered

- **Remote guest with snapshots and interpolation.** Rejected: adds a fourth
  device and a large state-replication layer with no product need.
- **Deterministic lockstep with two full simulations.** Rejected: cross-browser
  determinism, desync recovery, and content versioning add complexity without a
  product requirement.
- **Server-authoritative simulation.** Rejected: a Durable Object is a relay,
  not a 60 Hz game host.
- **Phone as a second rendered client.** Rejected: splits attention and
  reintroduces game-state replication for no gameplay benefit.
- **Remove the Cloudflare relay and use only local Wi-Fi.** Rejected as the
  default because AP client isolation, HTTPS contexts, and wake-lock behaviour
  are unreliable in classrooms and guest networks. A local relay remains a
  measured fallback, not a second architecture.

## Tests

- The hub exposes only Solo and Local co-op; no online mode or Host/Join panel.
- The pack catalog has no `online` field.
- K/K local co-op remains the default and starts without a network session.
- One-phone and two-phone same-room sessions work through the relay.
- A controller receives input/control messages only.
- A controller cannot send host actions, save, evidence, or another slot’s
  input.
- Reconnect, keyboard fallback, and clean session end still work.
- No remote guest, snapshot, interpolation, or prediction code exists in the
  active test matrix.
