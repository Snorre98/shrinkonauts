# ADR-0084: Ephemeral controller control-state channel

- **Status:** Accepted
- **Date:** 2026-11-04
- **Deciders:** Snorre
- **Related:** ADR-0049, ADR-0054, ADR-0068, ADR-0069, ADR-0083, ADR-0085,
  ADR-0086, ADR-0087
- **Amends:** ADR-0068 §4 and §6 for the narrow control-descriptor case

## Context

The controller currently receives only connection control (`welcome`, `pong`,
`pause`, `resume`, `session-end`, `error`). It cannot know when the owned
conversation has started, how many choices are on screen, which verbs the slot
has unlocked, whether Dash is cooling down, or whether an action was accepted.

That missing state forces the controller into a fixed, always-visible action
panel. The result is a hidden dialogue mode, dead ability buttons, and no
feedback. Adding a full game-state feed would violate ADR-0068 and reintroduce
the remote-client architecture that ADR-0081 rejects.

The missing information is not game state. It is a small, ephemeral **control
descriptor**: how the phone’s own input surface should be shaped right now. It
contains no narrative text, world positions, puzzle nodes, save data, or
evidence.

## Decision

### 1. Two host→controller messages

Add two host-originated messages, targeted at one controller slot:

```ts
type ControlMode = "explore" | "talk" | "choice";

type ControlVerb =
  | "jump"
  | "dash"
  | "interact"
  | "scan"
  | "pulse"
  | "carry"
  | "throw";

interface ControllerControlMessage {
  v: 2;
  t: "control";
  slot: PlayerSlot;
  mode: ControlMode;
  /** Required for choice mode; 1–5. */
  choices?: number;
  /** Optional 1-based selection highlight. */
  selected?: number;
  /** Verbs this slot can currently use. */
  verbs: ControlVerb[];
  /** Optional contextual emphasis; never a remap. */
  activeVerb?: ControlVerb;
}

type ActionResult = "accepted" | "rejected" | "cooldown";
type ActionReason =
  | "out-of-range"
  | "locked"
  | "empty"
  | "cooldown";

interface ControllerActionMessage {
  v: 2;
  t: "action";
  slot: PlayerSlot;
  verb: ControlVerb;
  result: ActionResult;
  /** Closed set; no free text. */
  reason?: ActionReason;
  /** For cooldown results; the phone may animate locally. */
  retryAfterMs?: number;
}
```

`action` is optional feedback. `control` is the authoritative shape of the
phone’s own input surface. Neither message contains dialogue text, speaker
names, world coordinates, puzzle state, feedback copy, save data, or evidence.

### 2. Targeting and relay

- The host sends `control` and `action` only to the slot that owns the surface
  or action.
- The Durable Object relays a host message to the controller bound to
  `message.slot`; it never broadcasts control state to both controllers.
- A controller cannot send either message. The DO and host reject them as
  host-only.
- Keyboard slots never receive controller messages.

### 3. Update policy

- Send `control` on every meaningful change: conversation start/advance/close,
  choice-count change, ability unlock, dash readiness change, carry state,
  explore/talk/choice transition, reconnect, and resume.
- Send `action` once per accepted/rejected/cooldown action result. Do not resend
  the same result.
- Keep `control` best-effort and idempotent. The next full descriptor corrects
  any missed change.
- On reconnect, the host resends the current descriptor for the reconnecting
  slot before the controller becomes ready.
- The controller may animate a cooldown locally from `action.retryAfterMs`; it
  never simulates gameplay.

### 4. Limits and validation

- Message size: 2 KiB per control/action message.
- Rate: `control` ≤ 10/s per slot; `action` ≤ 20/s per slot.
- `choices` must be an integer 1–5 when `mode` is `choice`; absent otherwise.
- `selected` must be 1–`choices` when present.
- `verbs` must be a subset of the closed `ControlVerb` set, unique, and must
  include `jump`, `interact`, and `scan`.
- `dash` in `verbs` means the Dash gesture is unlocked and available. It does
  not imply a visible Dash button; Phase 6.5 renders no Dash button (ADR-0087).
- Unknown verbs, modes, results, or reasons are rejected as malformed; the
  controller keeps its last valid descriptor.
- The controller never trusts a descriptor to change gameplay; it only changes
  which controls it renders.
- Protocol version becomes 2. Both host and controller must share the build;
  the existing build-ID check rejects stale pages before input.

### 5. Boundary: control descriptors are not game state

The controller still receives no:

- dialogue text, speaker names, or choice labels;
- world, camera, player, prop, puzzle, gate, or checkpoint positions;
- save, evidence, curriculum, or feedback state;
- arbitrary strings or free text.

The allowed data is a closed vocabulary whose only purpose is to shape the
controller’s own input surface. This is the narrow amendment to ADR-0068 §4 and
§6. The trust boundary and the no-snapshot rule are unchanged.

### 6. Failure behaviour

The same WebSocket carries input and control state. If the transport is down,
input is down and the host pauses. On resume/reconnect the host resends the
current descriptor. There is no separate polling or snapshot path.

If a descriptor is malformed, the controller keeps its last valid descriptor
and reports a protocol error only for a build/protocol mismatch. If no
descriptor has ever arrived, the controller uses the stable default explore
layout and the player can still send `interact` (which confirms dialogue on the
host for keyboard parity).

## Consequences

**Easier:**

- The phone can auto-switch to dialogue controls without receiving dialogue
  content.
- Locked abilities can disappear; cooldowns and action results can be shown.
- The controller stays a thin input device.
- The host remains the only authority.

**Harder:**

- Protocol, DO relay, session, controller session, and tests all gain two
  message types.
- The host must compute per-slot control descriptors at the right moments.
- The protocol version and build IDs must move together.
- The boundary between “control descriptor” and “game state” must stay explicit
  in review.

**Constrained:**

- No text, world, puzzle, save, or evidence fields.
- No controller→host control descriptors.
- No snapshots, interpolation, prediction, or second simulation.
- No control messages to keyboard slots.
- No unbounded or high-frequency state stream.

## Alternatives considered

- **No channel; keep fixed controls (D2).** Rejected for the primary experience:
  the hidden dialogue toggle and dead ability buttons remain.
- **Send dialogue text and choice labels to the phone (D3).** Rejected: this is
  game content, splits attention from the shared screen, and reopens the
  snapshot/remote-client boundary.
- **Reuse `pause`/`resume` for mode changes.** Rejected: those messages mean
  simulation pause, not input-surface state.
- **Send a generic state snapshot and let the phone decide.** Rejected: that is
  the M4.0b architecture ADR-0081 removed.
- **Let the controller poll the host.** Rejected: adds a request path and
  latency for no benefit; the host already knows when state changes.

## Tests

- Parse/validate `control` and `action`; reject unknown verbs/modes/results,
  invalid choice counts, oversize messages, and rate violations.
- A controller cannot send `control` or `action`.
- The DO relays only to the bound slot; the other controller receives nothing.
- Reconnect/resume resends the current descriptor.
- Malformed/unknown descriptors do not crash the controller.
- The controller DOM contains no dialogue text or world state after a control
  message.
- The default explore layout works when no descriptor arrives.
- `dash` in `verbs` enables the gesture but does not force a visible button.
- Protocol/build mismatch is rejected before input.

## References

- ADR-0049 — envelope and input protocol
- ADR-0054 — security, size, rate, and Origin limits
- ADR-0068 — controller session and trust boundary
- ADR-0069 — latency and no prediction
- ADR-0081 — same-room boundary
- ADR-0085 — dialogue control and choice presentation
- ADR-0086 — ability disclosure and feedback
- ADR-0087 — controller gesture vocabulary and discoverability
