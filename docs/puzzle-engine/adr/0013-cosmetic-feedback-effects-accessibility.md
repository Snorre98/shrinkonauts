# ADR-0013: Cosmetic feedback effects and accessibility

Status: Proposed
Date: 2026-10-28
Deciders: Snorre
Related: ADR-0003, ADR-0020, ADR-0030, ADR-0032, ADR-0033
Amends: ADR-0003's "no animation timelines" and "immediate state swaps only"
constraints

## Context

The desired feedback includes motion and consequence:

- a pulse travelling across the cleft;
- a gate opening with a burst;
- a plate depressing;
- a socket shaking on rejection;
- a packet dissolving when ACh is cleared;
- a muscle contraction wave;
- a lever visibly pulling;
- an exit pinging when unlocked.

ADR-0003 currently says:

- presentation updates are immediate state swaps;
- they do not animate, tween, or delay the simulation;
- there are no animation timelines.

That constraint was correct when feedback was a late visual polish. It is now too
strong: motion is part of causal legibility, especially for a co-op game where a
shared screen must show who caused what.

At the same time, feedback must remain accessible. Reduced motion,
colour-blind safety, screen readers, and keyboard-only play are existing
requirements.

## Decision

### 1. Effects are cosmetic, data-driven, and non-blocking

Feedback effects:

- never mutate puzzle or world simulation state;
- never delay input or simulation;
- never carry information that is unavailable in persistent state or text;
- are emitted by the feedback ECS as `WorldEffect` components;
- are consumed by a world effect sink;
- are skipped or reduced under reduced motion.

The state change is immediate. The effect interpolates over render time; it is not
part of the logical tick.

### 2. Closed effect vocabulary

```ts
type WorldEffect =
  | { kind: "pulseTravel"; from: Point; to: Point; ticks: number }
  | { kind: "impact"; entityId: string; result: "bind" | "reject" | "empty" }
  | { kind: "gateSwap"; entityId: string; open: boolean }
  | { kind: "socketBounce"; entityId: string }
  | { kind: "propDissolve"; entityId: string }
  | { kind: "plateDepress"; entityId: string }
  | { kind: "leverPull"; entityId: string }
  | { kind: "muscleWave"; entityId: string }
  | { kind: "exitPing"; entityId: string };
```

Effects are keyed by kind, not by puzzle. A new puzzle type reuses an existing
effect or requires a deliberate engine addition.

### 3. Presentation layers

- **World effects** are rendered by the Phaser/world effect layer.
- **Persistent state swaps** are rendered from feedback surfaces/elements, not
  from effects.
- **Speech bubbles, captions, meters, and trackers** are DOM surfaces.
- **Modals** remain DOM and blocking where required.

A gate opening therefore has:

- an immediate logical state change;
- an immediate DOM/scene state swap;
- an optional cosmetic burst;
- a text/state label available at all times.

### 4. Accessibility rules

Every feedback surface must satisfy:

- a text or state label exists;
- critical state is persistent, not only animated;
- colour is never the only distinction; shape, icon, or text must also differ;
- audio is never the only channel;
- reduced motion removes or simplifies effects without removing information;
- live-region announcements include the actor where attribution matters
  ("P2: Ca²⁺ window open");
- interactive surfaces have a keyboard path and an owner-aware input route.

### 5. Reduced motion

Under reduced motion:

- pulse travel becomes an immediate impact marker or a static line;
- gate bursts become a state swap;
- dissolves become immediate visibility changes;
- shakes and waves are omitted;
- follow smoothing becomes an immediate position update;
- DOM surfaces remain in the same place and retain the same text.

Reduced motion must be testable by asserting that the feedback surface/state is
identical while effects are absent.

### 6. Asset policy

Effects are procedural or use logical asset IDs. The puzzle runtime and feedback
systems never reference media paths.

Final animation assets are optional. A static state swap plus text is the minimum
valid presentation. Sprite sheets, GIF/WebP loops, and other formats remain
governed by the existing asset ADRs.

## Consequences

**Easier:**

- Motion can communicate causality without becoming the only signal.
- Gate, timer, pulse, socket, and clearance beats become legible.
- Effects are reusable across puzzle types.
- Accessibility is designed into the feedback model rather than patched later.
- The art pass can replace procedural effects without touching puzzle logic.

**Harder:**

- The world needs a generic effect layer and effect lifecycle.
- Effects must be tested for non-blocking behaviour and reduced motion.
- Every effect needs a non-motion fallback.
- The ADR-0003 constraint must be explicitly amended; leaving both in force
  creates contradictory guidance.

**Constrained:**

- No effect may mutate simulation state.
- No effect may delay or block input.
- No information may be available only through motion, colour, or audio.
- No media paths in feedback or puzzle code.
- No arbitrary animation scripting from content.

## Alternatives considered

- **Keep ADR-0003 and ship static state swaps only.** Legible only if every state
  has a persistent element and text; misses the causal "signal travelling" beat.
  Rejected as the only option.
- **Sprite-sheet animation in the puzzle runtime.** Violates the pure boundary
  and delays state. Rejected.
- **CSS-only effects for everything.** Insufficient for world-space pulse travel
  and gate impacts. Rejected.
- **Animation as the primary feedback channel.** Inaccessible and unreliable.
  Rejected.

## References

- [`0003-gate-prop-presentation.md`](0003-gate-prop-presentation.md)
- [`../../shrinkonauts/base-game/adr/0020-accessibility-baseline.md`](../../shrinkonauts/base-game/adr/0020-accessibility-baseline.md)
- [`../../shrinkonauts/base-game/adr/0030-sprite-animation-format-policy.md`](../../shrinkonauts/base-game/adr/0030-sprite-animation-format-policy.md)
- [`../../shrinkonauts/base-game/adr/0032-audio-cue-abstraction.md`](../../shrinkonauts/base-game/adr/0032-audio-cue-abstraction.md)
- [`../../shrinkonauts/base-game/adr/0033-final-asset-integration-timing.md`](../../shrinkonauts/base-game/adr/0033-final-asset-integration-timing.md)
