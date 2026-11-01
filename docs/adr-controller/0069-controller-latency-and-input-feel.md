# ADR-0069: Controller latency budget and input-feel policy

- **Status:** Accepted
- **Date:** 2026-11-01
- **Deciders:** Snorre
- **Related:** ADR-0049, ADR-0053, ADR-0056, ADR-0066, ADR-0067, ADR-0068

## Context

Same-screen co-op raises the latency bar. Both players watch the same display,
so a delayed P2 response is visible to everyone, not just the phone player. The
game runs a fixed 60 Hz step in `RoomScene` and currently has no explicit coyote
time or jump buffer; the jump only fires when `onGround` is true at the step
that receives it. That makes precise platforming sensitive to input timing.

A phone controller has no world view and therefore cannot predict the shared
world locally. Predictions and rollback would require sending the phone enough
state to simulate, which is the M4.0b snapshot architecture and is explicitly
out of scope for M4.0a.

Latency has several contributors, and the network is not always the largest:

| Link | Typical | Notes |
|---|---:|---|
| Touch sampling | 8–16 ms | 60–120 Hz touch displays |
| Wi-Fi RTT with a local relay | 2–10 ms | 5 GHz, good signal |
| Cloud RTT, in-region | 20–80 ms | 50–150 ms cross-region/cellular |
| Wait for next fixed step | 0–17 ms | 60 Hz, average ~8 ms |
| Simulation → render | 0–17 ms | average ~8 ms |
| TV/projector display | 20–100+ ms | game mode matters |

Bluetooth HID would be in the 5–15 ms class, but it is not available to a
browser-based phone controller (ADR-0066). A local Wi-Fi relay is in the same
class and is the realistic low-latency option.

## Decision

### 1. Measurable budget

M4.0a targets **p95 input-to-photon ≤ 120 ms** on the target demo Wi-Fi and
display, with a p50 target of **≤ 80 ms**. The keyboard baseline is measured on
the same display so display latency is not misattributed to the network.

If the target is not met, the response is measurement and transport/display
optimization, not prediction. The fallback is a local relay or keyboard play.

### 2. No prediction and no second authority

- The phone never simulates the game, predicts the world, or rolls back.
- The host applies controller input at the next fixed step.
- `clientTick` is diagnostic; the host clock and fixed step are authoritative.
- The phone may render its own button state and connection state only.

### 3. Event-driven input, not fixed-rate batching

- Button edges (`jump`, `dash`, `interact`, `scan`, `pulse`, `carry`, `throw`,
  UI confirm/cancel/navigate/choose) are sent immediately on
  `pointerdown`/`pointerup`.
- Held movement is sent on change plus a 10 Hz keepalive.
- The controller does not wait for a 30 Hz or 60 Hz send timer to transmit a
  tap.
- Network messages remain rate-limited and size-capped.

### 4. Host coalescing preserves every edge

- The host queues edge-triggered actions in arrival order.
- Multiple movement frames between fixed steps collapse to the latest `moveX`.
- Multiple action frames before a step are OR-ed or queued so a tap is never
  lost.
- Stale/duplicate sequence numbers are dropped.
- Input is discarded on ownership changes, pause, and text-field focus, as in
  the existing keyboard path.

### 5. Immediate input echo on the phone

- The controller page shows a pressed state immediately and uses haptics where
  available (Android Chrome; iOS ignores `navigator.vibrate`).
- This is input echo, not game prediction. It reduces perceived latency without
  claiming the character has moved.
- The shared screen remains the authoritative view.

### 6. Game-feel tolerances for all input modes

Add, behind tests:

- **Coyote time:** ~100 ms after leaving a ledge during which a jump still
  fires.
- **Jump buffer:** ~100–150 ms before landing during which a jump press is
  remembered and fires on touchdown.
- **Optional dash buffer:** a short window so a dash press just before cooldown
  ends is not lost.

These apply to keyboard and controller equally, improve the existing local
game, and make a 100 ms network path feel substantially better. They must not
introduce double jumps, fire after respawn/teleport, or survive a level change.

### 7. Display and transport discipline

- The demo display must use game/low-latency mode. A TV's cinema mode can add
  more delay than the network path.
- Cloud WSS is the default transport. A local relay is permitted only if
  measurements show the cloud path cannot meet the budget; it uses the same
  protocol and is not a second architecture.
- 5 GHz Wi-Fi is preferred; 2.4 GHz is measured and documented.
- The host tab must remain visible; background throttling is not a supported
  latency condition.

### 8. Instrumentation and evidence

- Controller: RTT display from `ping`/`pong`, connection state, reconnect count.
- Host: input receipt time, fixed-step wait, and render time for a debug HUD.
- Playtest: p50/p95 input-to-photon on the target hardware, cloud in-region,
  2.4 GHz and 5 GHz, TV and laptop display, keyboard baseline.
- Record the results in the M4.0a playtest note; do not claim a target that was
  not measured.

## Consequences

**Easier:**

- A clear, testable quality target instead of "it feels laggy."
- No netcode complexity: no prediction, rollback, or second simulation.
- Coyote time and jump buffering improve every input mode.
- The keyboard fallback remains a credible low-latency path.
- Display latency is separated from network latency.

**Harder:**

- The team must measure on the real demo hardware and Wi-Fi.
- The simulation needs careful coyote/buffer tests and respawn/level resets.
- A local relay may be needed as a fallback, adding a deployment path.
- Touch input still has no tactile feedback; layout and haptics only mitigate.

**Constrained:**

- No prediction or rollback.
- No 120 Hz simulation as a latency fix.
- No Bluetooth/native controller.
- No promise that cloud latency meets the target on every network.
- No gameplay design that depends on frame-perfect timing.

## Alternatives considered

- **Client-side prediction on the phone.** Rejected: the phone has no world
  state; giving it enough state to predict is M4.0b, not M4.0a.
- **Server-authoritative simulation.** Rejected: adds a game loop and network
  authority for no benefit to a co-op puzzle game.
- **Run the host simulation at 120 Hz.** Rejected: not justified; rendering and
  network latency dominate, and it changes the fixed-step contract.
- **Batch input at 30 Hz for simplicity.** Rejected: adds up to 33 ms for every
  button press; event-driven edges are cheap.
- **Accept unmeasured latency.** Rejected: the budget and playtest are part of
  acceptance.
- **Use Bluetooth HID.** Rejected: not browser-accessible on iOS; native app out
  of scope.
- **Make a local relay the only transport.** Rejected as default because of AP
  isolation and HTTPS/wake-lock constraints; kept as a measured fallback.

## Tests

- Instrumented RTT and fixed-step wait are visible in the debug HUD.
- Playtest records p50/p95 input-to-photon for cloud and local paths, 2.4/5 GHz,
  TV/laptop, with a keyboard baseline.
- A jump tap shorter than one fixed step is not lost.
- Multiple action frames before a step preserve all edges in order.
- Coyote time fires within the window and not after it.
- Jump buffer fires on landing within the window and clears on respawn, hazard,
  and level change.
- Dash buffer does not bypass cooldown.
- Existing keyboard and co-op tests remain unchanged.
- Controller disconnect/pause also drains queued input rather than applying it
  after resume.

## References

- [`../../src/world/room-scene.ts`](../../src/world/room-scene.ts) — fixed 60 Hz
  step and input sampling
- [`../../src/world/physics.ts`](../../src/world/physics.ts) — jump and dash
  application
- ADR-0049 — input protocol and coalescing
- ADR-0053 — pause/reconnect semantics
- ADR-0056 — testing and observability
- ADR-0066, ADR-0067, ADR-0068 — phase scope, slots, session
- [`../m4/phone-coop-implementation-plan.md`](../m4/phone-coop-implementation-plan.md)
