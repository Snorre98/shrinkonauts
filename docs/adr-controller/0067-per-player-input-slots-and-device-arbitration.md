# ADR-0067: Per-player input slots and device arbitration

- **Status:** Proposed
- **Date:** 2026-11-01
- **Deciders:** Snorre
- **Related:** ADR-0010, ADR-0037, ADR-0043, ADR-0047, ADR-0050, ADR-0053,
  ADR-0066, ADR-0068

## Context

Local co-op currently samples two keyboard mappings from one keyboard:
`KeyboardIntentSource` produces P1 and P2 intents plus host-global actions in a
single `RuntimeInput` object. The runtime already treats P1 and P2 as separate
players for movement, abilities, tether, feedback ownership, conversations, and
attribution.

The online ADRs assume a specific topology: host = P1 and guest = P2. That is
appropriate for a remote guest that renders the host world, but it is the wrong
model for phone controllers:

- the host may own no player at all if both players use phones;
- either player may use the keyboard;
- either player may use a phone;
- a phone may be assigned to P1 or P2;
- a disconnected phone may hand its slot back to the keyboard.

Hardcoding "controller = P2" would force a second room, a second protocol, or a
hub that cannot express P1-phone sessions. The input model must be independent
of the host/guest topology.

## Decision

### 1. Two player slots, one active source per slot

A run has exactly two player slots, `p1` and `p2`. Each slot is owned by exactly
one input source at a time:

```ts
type PlayerSlot = "p1" | "p2";
type InputSourceKind = "keyboard" | "controller";
type InputPlan = Record<PlayerSlot, InputSourceKind>;
```

`guest` is reserved for M4.0b and is not an M4.0a source. A slot never samples
two sources simultaneously.

### 2. The host is not a player

The host role means "authority and display", not "P1". The host may own:

- both slots on the local keyboard;
- one slot on the keyboard and one on a phone;
- neither slot (both players on phones).

The host laptop's keyboard remains available for host-only actions regardless
of the input plan: start, pause, map, log, mute, and `toggleP2` in solo. These
actions are never delegated to a controller in M4.0a.

### 3. A pure input arbiter sits between the scene and the sources

The runtime consumes one `IntentSource` per fixed step:

```ts
interface IntentSource {
  sample(): RuntimeInput;
  discard(): void;
  destroy?(): void;
}

interface PlayerIntentSource {
  sample(): PlayerFrameInput;
  discard(): void;
  destroy?(): void;
}

interface PlayerFrameInput {
  intent: PlayerIntent;
  actions: PlayerActionInput;
}
```

The arbiter:

- samples each slot from its active source;
- always samples host-global actions from the local keyboard;
- exposes which source owns each slot for UI/diagnostics;
- never lets a remote source supply another slot;
- discards latched input when a slot changes ownership.

The keyboard implementation exposes per-slot sampling (`samplePlayer(id)`) and
host sampling (`sampleHost()`). It is not recreated per slot.

### 4. Default remains keyboard/keyboard

`InputPlan` defaults to:

```ts
{ p1: "keyboard", p2: "keyboard" }
```

Phone input is opt-in in the local-co-op setup. Selecting a phone for a slot:

1. opens that slot for pairing;
2. waits for the controller to connect and signal ready;
3. disables the local keyboard mapping for that slot;
4. starts the run only when every phone slot is ready, or the host explicitly
   chooses to start that slot on keyboard instead.

### 5. Ownership changes are explicit and discard stale input

- Attaching a controller to a slot calls `discard()` on the local source before
  the slot changes hands.
- Detaching a controller calls `discard()` on the remote source and on the local
  source before the keyboard takes over.
- A held key or a latched tap from the previous owner must never fire after the
  switch.
- The host UI shows the active source per slot: `P1 Keyboard`, `P2 Phone`,
  `P1 Phone waiting`, and so on.

### 6. Disconnect pauses; fallback is a host decision

- Controller disconnect pauses the run and shows which slot is missing.
- The host may wait for reconnect within the 60-second grace window, or choose
  **Continue with keyboard** for that slot.
- Choosing keyboard closes the controller slot for the rest of the session; the
  phone receives `session-end` and cannot reclaim it silently.
- Reconnecting within the grace window restores the same slot and resumes.
- No input is fabricated for an absent player.

### 7. Attribution, camera, tether, and save are unchanged

- Controller actions are recorded once on the host and attributed to the slot
  that produced them.
- P1/P2 feedback ownership, conversation ownership, and accents continue to use
  the existing surface model.
- Camera and tether remain host-owned and do not follow a phone view.
- Save and evidence remain host-owned. A controller never receives or writes
  them.

### 8. M4.0b guest remains separate

The remote guest in M4.0b still renders the host world and is host = P1,
guest = P2. The controller slot model is for input-only clients. A room cannot
assign both a guest and a controller to the same player slot in the same phase.

## Consequences

**Easier:**

- The hub expresses all four input plans without special cases.
- The host can be a console/display with two phones.
- Keyboard fallback is a source swap, not a new game mode.
- The arbiter is pure and testable without Phaser, DOM, or network.
- P1/P2 ownership and attribution stay exactly as they are.
- M4.0b can reuse the transport without inheriting the controller UI model.

**Harder:**

- The hub needs a per-slot input selector and pairing state.
- The session must reserve and validate slots, not just host/guest roles.
- The disconnect flow has a per-slot decision instead of one guest pause.
- More combinations require a matrix of tests.
- The host keyboard still needs to work for menus when no slot is local.

**Constrained:**

- Exactly two player slots.
- One source per slot; no keyboard + phone redundancy for the same player.
- No guest + controller mix for one slot in M4.0a.
- No third player or spectator.
- No controller access to host-only actions.

## Alternatives considered

- **Hardcode host = P1, controller = P2.** Rejected: cannot support P1-phone or
  two-phone sessions cleanly, and bakes the online guest topology into local
  co-op.
- **Use two separate rooms for one-phone and two-phone sessions.** Rejected:
  duplicates lifecycle, pairing, and tests for no benefit.
- **Let keyboard and phone both drive the same slot.** Rejected: double input,
  ambiguous ownership, and impossible to attribute cleanly.
- **Make the host always P1.** Rejected: a display-only host is a valid and
  desirable setup for a classroom or living-room screen.
- **Fold controllers into the M4.0b guest role.** Rejected: the guest's
  rendering and snapshot obligations are exactly what M4.0a is avoiding.
- **Switch sources without discarding latches.** Rejected: a held jump or a
  stale UI confirm could fire after the handoff.

## Tests

- Unit: arbiter returns keyboard P1 + keyboard P2 in the default plan.
- Unit: keyboard P1 + remote P2, remote P1 + keyboard P2, and remote P1 +
  remote P2; the inactive keyboard slot is not sampled.
- Unit: host-global actions always come from the local keyboard.
- Unit: attaching or detaching a remote source discards latches on both sides.
- Unit: a remote source cannot supply the other slot; stale sequence frames are
  dropped by the remote source.
- Integration: each plan routes movement and actions to the correct player;
  no P1/P2 leakage.
- Browser: keyboard/phone and phone/phone sessions start and play.
- Failure: disconnect pauses, keyboard fallback resumes, reconnect restores the
  same slot.
- Regression: keyboard/keyboard and solo behavior are unchanged.

## References

- ADR-0010 — per-player soft-surface routing
- ADR-0037, ADR-0043 — abilities, tether, and camera
- ADR-0047 — host-authoritative thin client (host = P1 assumption)
- ADR-0050 — per-player ownership and input routing
- ADR-0053 — failure and reconnect
- ADR-0066 — phone-controller phase scope
- ADR-0068 — controller session and pairing
