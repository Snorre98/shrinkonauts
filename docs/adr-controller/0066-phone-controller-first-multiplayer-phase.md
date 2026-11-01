# ADR-0066: Phone controller as the first multiplayer phase

- **Status:** Accepted
- **Date:** 2026-11-01
- **Deciders:** Snorre
- **Related:** ADR-0047, ADR-0048, ADR-0049, ADR-0050, ADR-0051, ADR-0052,
  ADR-0054, ADR-0055, ADR-0056, ADR-0067, ADR-0068, ADR-0069

## Context

The game already supports local co-op on one keyboard: P1 uses WASD, P2 uses
the arrow keys. The shared screen makes the co-op social and easy to observe,
but two players on one keyboard is ergonomically awkward. A second laptop would
solve the input problem, but it turns the session into remote online co-op and
loses the shared-screen social benefit.

M4 as proposed is a host-authoritative thin client with a second browser that
renders the host world. That is the right architecture for remote play, but it
is a large milestone: world/UI snapshots, interpolation, guest rendering,
guest save rules, two-browser tests, and a dependency on the finished M2/M3
content. It is also more than the current problem requires.

A phone can act as an input device from its browser. The shared screen already
shows the world, dialogue, puzzle state, and feedback, so the phone does not
need a game view. This makes a phone controller a much smaller client than the
M4 guest: it sends input and receives only connection state.

Bluetooth was considered because it promises lower latency than Wi-Fi. It is
not viable for this project:

- iOS Safari does not expose Web Bluetooth; every iOS browser uses WebKit, so
  Chrome and Edge on iPhone inherit the gap.
- Web Bluetooth is central-role only. No browser can advertise a GATT server or
  act as a Bluetooth HID peripheral, so two browsers cannot connect phone to
  laptop over Bluetooth.
- A native app could act as a BLE HID device, but that adds platform-specific
  code, signing, store distribution, and a worse pairing flow. It is out of
  scope.
- A local Wi-Fi relay is already in the same latency class as Bluetooth HID.

The design therefore uses a phone web app over the existing WebSocket
transport, with the keyboard remaining a first-class input option.

## Decision

### 1. M4 is a ladder, not a single deliverable

| Phase | Scope | Status |
|---|---|---|
| **M4.0a** | Phone-controller same-screen co-op; input only | This ADR set |
| **M4.0b** | Remote co-op with a guest thin client; world/UI snapshots | ADR-0047–0057 |
| **M4.1** | Full M2 pack online, guest gate/debrief | Existing M4.1 |

M4.0a is the first phase and the tracer bullet for M4.0b. It proves the
transport, room lifecycle, role handshake, input coalescing, reconnect, and
security boundary with a much smaller client. It does not replace M4.0b and it
does not claim to deliver remote play.

### 2. Same screen, host authority, input only

- The host browser keeps the authoritative `GameRuntime`, `RoomSimulation`,
  puzzle state, feedback, save, and evidence.
- The shared screen renders the world for both players.
- A phone controller sends input for exactly one player slot and receives no
  world, UI, puzzle, dialogue, camera, or feedback state.
- The phone never runs gameplay simulation and never writes save or evidence.
- No textures, atlas data, pack content, audio, or level data are sent to the
  phone.

### 3. Keyboard co-op remains a peer option

- Local keyboard co-op remains the default and must not regress.
- Phone input is opt-in per player slot: P1 and P2 can each use keyboard or
  phone.
- The host laptop is not required to be a player. When both slots use phones,
  the laptop is authority and display, and its keyboard remains available for
  host-only actions (start, pause, map, log, mute).
- A failed phone session must be recoverable by returning the affected slot to
  the keyboard.

### 4. One or two phones from the start

The input model is slot-based, not host/guest-based. The following plans are
first-class from the first implementation:

| P1 | P2 |
|---|---|
| Keyboard | Keyboard (existing) |
| Keyboard | Phone |
| Phone | Keyboard |
| Phone | Phone |

Supporting only "P1 keyboard, P2 phone" and adding P1 later is rejected: it
would bake the host/guest assumption into the hub, protocol, and session
lifecycle, which is exactly the assumption this phase needs to remove.

### 5. Cloud-first transport, optional local relay

- The primary transport is the existing Cloudflare Worker + one Durable Object
  per room, reached over WSS.
- QR pairing points at the deployed controller page; a 6-character room code is
  the fallback.
- Cloud-first is chosen because it works on locked-down Wi-Fi, provides HTTPS
  and wake-lock contexts, and reuses the M4.0b transport.
- A local relay on the host laptop may be added behind the same protocol if
  latency measurements require it. It is an optimization, not the initial
  architecture.
- Bluetooth and native apps are not part of this project.

### 6. No prediction, no second simulation

- The host applies controller input at the next fixed step.
- Edge-triggered actions are queued and coalesced so a tap between steps is
  never lost.
- There is no client prediction or rollback. A phone has no world view, so it
  cannot predict the shared world; adding one would require the very snapshot
  protocol M4.0a avoids.
- Latency is addressed by measurement, transport choice, and game-feel
  tolerances, not by a second authority.

### 7. Content independence

M4.0a works with any local co-op level or pack because the phone loads no
content. Unlike M4.0b, it has no M2 pack or M3 asset dependency. This makes it
safe to build before the final content freeze.

## Consequences

**Easier:**

- A phone client is small: no pack, no Phaser, no assets, no world snapshots.
- The same transport and input protocol feed M4.0b later.
- Keyboard, phone, and mixed sessions share one input path.
- The social benefit of a shared screen is preserved.
- M4.0a can ship without waiting for M2/M3 content.
- The failure mode is simple: fall back to the keyboard.

**Harder:**

- Two phone slots need a clear hub setup and pairing flow.
- Touch ergonomics for a platformer with many verbs need careful layout and
  playtesting.
- Wi-Fi latency, screen sleep, and AP client isolation need explicit handling.
- The controller page must be maintained as a second front-end entry.
- The host remains a single point of failure.

**Constrained:**

- No phone-rendered game view in M4.0a.
- No remote play until M4.0b.
- No Bluetooth or native app.
- No prediction or rollback.
- No matchmaking, accounts, chat, or spectators.
- No trusted public assessment; controller input is attributed P2 on the host.
- No new puzzle, level, asset, or save fields.

## Alternatives considered

- **Bluetooth HID from the phone.** Rejected: iOS Safari has no Web Bluetooth,
  browsers cannot be peripherals, and native apps are out of scope.
- **Two gamepads.** Best ergonomics and lowest latency, but not an option for
  this project because the required hardware is unavailable. The input-source
  seam may accept a Gamepad API adapter later without changing the session.
- **Replace keyboard co-op with phones.** Rejected: keyboard is the reliable
  default and the fallback when Wi-Fi fails.
- **Build full M4.0b first.** Rejected: much larger, later, and it does not
  address the same-screen social goal.
- **Phone as a second screen/streaming client.** Rejected: video streaming and
  a second renderer are expensive, split attention, and undermine the shared
  screen.
- **Local-only relay.** Rejected as the default because of AP isolation, HTTPS
  and wake-lock constraints; retained as a measured fallback.
- **One controller role hardcoded to P2.** Rejected; see decision 4.

## Tests

- Scope tests confirm M4.0a sends no world/UI/pack messages to a controller.
- Keyboard/keyboard starts and plays without any network connection.
- Keyboard/phone, phone/keyboard, and phone/phone start from the hub and play.
- The host can be display-only with both slots on phones.
- Any local co-op level loads with the same controller page.
- Controller disconnect returns the slot to the keyboard on request.
- No controller can write save, evidence, or host-only actions.
- Existing M1–M3 tests and local co-op regressions remain unchanged.

## References

- [`../m4/README.md`](../m4/README.md) — M4 milestone and phase ladder
- [`../m4/phone-coop-implementation-plan.md`](../m4/phone-coop-implementation-plan.md)
  — M4.0a implementation plan
- [`../adr-online/README.md`](../adr-online/README.md) — remote guest domain
- ADR-0047, ADR-0048, ADR-0049, ADR-0050 — authority, session, protocol,
  ownership
- ADR-0053, ADR-0054, ADR-0056 — failure, security, testing
- ADR-0010, ADR-0037, ADR-0043 — per-player input, abilities, tether, camera
