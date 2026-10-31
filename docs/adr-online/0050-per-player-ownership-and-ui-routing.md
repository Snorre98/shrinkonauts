# ADR-0050: Per-player ownership, input routing, and interaction parity

- **Status:** Proposed
- **Date:** 2026-10-28
- **Deciders:** Snorre
- **Related:** ADR-0010, ADR-0011, ADR-0037, ADR-0043, ADR-0047, ADR-0049

## Context

Local co-op already has P1 and P2, a shared camera/tether, per-player abilities,
and (after M1.75) anchored feedback surfaces and entity conversations with
owner attribution. `SurfaceInputRouter` already distinguishes hard surfaces
(consume all) from soft surfaces (consume only the owner).

Online co-op adds a new problem: the guest is not at the host's keyboard, but
the host still owns the simulation and UI state. Guest input must be routed as
P2 without giving the guest authority over host-only state.

## Decision

### 1. Player slots and local key maps

- Host = P1; guest = P2.
- Each client uses its own local key map for its own character. In M4.0 the
  guest may use the existing P1/WASD map locally; the host translates it to P2.
- The host disables local P2 sampling while online. The guest never samples a
  local P2 keyboard pair.
- Key rebinding remains local and future; the protocol carries actions, not
  physical keys.

### 2. Host applies all guest input

The guest sends `NetInput` for its own player. The host:

1. validates shape, rate, sequence, and owner;
2. queues edge-triggered actions;
3. applies movement/jump/dash at the next fixed step;
4. applies player actions (`scan`, `interact`, `carry`, `throw`, `pulse`) in the
   existing `GameRuntime` order;
5. ignores stale/duplicate frames.

The guest does not run `GameRuntime.step` or `stepRoomSimulation`.

### 3. Surface ownership

M4 reuses the M1.75 surface model:

- every surface has an `owner` (P1/P2) and optional `audience`;
- soft surfaces consume only the owner’s input;
- hard surfaces consume all input;
- `SurfaceInputRouter` remains host-side authority;
- the guest may act only on surfaces owned by P2;
- owner mismatch is rejected with a non-destructive feedback cue.

Guest `ui` actions are sent as `action` messages:

```ts
type NetAction =
  | { type: "surface"; surfaceId: string; action: "confirm" | "cancel" }
  | { type: "surface"; surfaceId: string; action: "choose"; choiceId: string }
  | { type: "gate"; answer: string }
  | { type: "debrief"; promptId: string; answer: string }
  | { type: "debrief-finish" }
  | { type: "reset-puzzle" }
  | { type: "hint" };
```

The host validates the action against current state and ownership before
applying it. Guest actions never mutate save/evidence directly.

### 4. M4.0 interaction parity

Both players can:

- move, jump, dash;
- scan entities;
- interact with props and puzzle nodes;
- carry, throw, and pulse where the existing solo/co-op union allows;
- start and advance their own entity conversations;
- see P1/P2 attribution on surfaces and effects.

M4.0 keeps these **host-owned**:

- gate modal and gate answer submission;
- debrief answers and finish;
- pause;
- map/concept-log modal toggles;
- new run/reset;
- evidence export.

The guest sees host gate/debrief/pause/map state through `RuntimeSnapshot`, but
its UI hides or disables host-only controls. This is a deliberate scope cut:
the guest remains a full second player in the world and in conversations, not a
second owner of the assessment flow.

M4.1 may route guest gate/debrief actions through the same `NetAction` path; the
protocol is designed for it, but the UI and validation are not in M4.0.

### 5. Attribution

- Host actions are recorded as P1.
- Guest actions are recorded as P2 on the host.
- Feedback surfaces/effects carry `actor`, `owner`, and accent.
- The guest sees P1 feedback with host accent and P2 feedback with guest accent.
- Audio is local; each client plays its own cues. No audio is streamed.

### 6. Two simultaneous conversations

M1.75 allows one conversation per owner/entity pair. Online must preserve that:

- host can talk to entity A while guest talks to entity B;
- both surfaces are host-owned narrative sessions;
- each surface has a distinct owner/surface ID;
- the host applies both owners’ actions;
- a hard modal opened by the host still consumes all input, as in local co-op.

### 7. Pause and focus

- Host pause is global; it pauses simulation and sends a `pause` state.
- Guest pause request is rejected in M4.0.
- Guest local focus loss does not pause the host; the guest shows a reconnect
  overlay if its socket drops.
- Host tab hidden pauses the entire session (ADR-0053).

## Consequences

**Easier:**

- Reuses the existing per-player input and surface router.
- Guest is a full participant in world interactions and conversations.
- P1/P2 attribution remains coherent.
- No guest authority over assessment or save.

**Harder:**

- Guest UI needs a local “read-only” mode for host-owned modals.
- Guest input must be translated into `RuntimeInput` without local P2 sampling.
- Actions can arrive while the host is in a different state; validation must
  reject safely.
- Two conversations plus two players need deterministic surface IDs and tests.

**Constrained:**

- No guest gate/debrief/pause in M4.0.
- No guest key rebinding UI.
- No host migration of ownership.
- No guest evidence export.

## Alternatives considered

- **Guest controls P1 and host controls P2.** Arbitrary; rejected. Host = P1
  matches the host’s local view and save.
- **Both clients control both players.** Confusing and duplicates authority.
  Rejected.
- **Guest runs its own UI state and only syncs world.** Rejected; gate/debrief/
  feedback would drift.
- **Guest gets full gate/debrief parity in M4.0.** Deferred; increases UI and
  evidence validation scope without proving the core online loop.
- **Send physical key events.** Rejected; key maps and accessibility are local.

## Tests

- Host P1 + guest P2 movement, jump, dash, tether, camera.
- Host local P2 input is disabled online.
- Guest scan/interact/carry/throw/pulse applied by host.
- Guest surface action on P2 surface accepted; on P1 surface rejected.
- Two simultaneous entity conversations with distinct owners.
- Host-owned gate/debrief/pause/map controls disabled for guest.
- P1/P2 attribution on feedback and effects.
- Local co-op tests unchanged.

## References

- `src/world/input.ts`
- `src/game/surface-router.ts`
- `src/game/runtime.ts` — `step()`, `applyRoutedSurfaceAction()`
- `docs/puzzle-engine/adr/0010-anchored-feedback-surfaces.md`
- `docs/puzzle-engine/adr/0011-entity-conversations.md`
- ADR-0037, ADR-0043
