# ADR-0013: Cosmetic feedback effects, composable effect plans, and accessibility

Status: Accepted
Date: 2026-10-28
Deciders: Snorre
Related: ADR-0003, ADR-0009, ADR-0010, ADR-0012, ADR-0020, ADR-0030, ADR-0032, ADR-0033
Amends: ADR-0003's "no animation timelines" and "immediate state swaps only"
constraints

## Context

The desired feedback includes motion and consequence:

- a pulse travelling across the cleft from a specific terminal socket;
- a gate opening with a directional burst;
- a plate depressing;
- a socket shaking on rejection;
- a packet dissolving when ACh is cleared;
- a muscle contraction wave travelling along the effector;
- a lever visibly pulling;
- tiles lighting up along a nerve path;
- an exit pinging when unlocked;
- a persistent beam between two connected things.

ADR-0003 currently says:

- presentation updates are immediate state swaps;
- they do not animate, tween, or delay the simulation;
- there are no animation timelines.

That constraint was correct when feedback was a late visual polish. It is now too
strong: motion is part of causal legibility, especially for a co-op game where a
shared screen must show who caused what.

A flat list of finished effects is also insufficient. It cannot express:

- emission from a named socket on an object in a direction or cone;
- arbitrary A to B, A to B to C, or arc paths;
- persistent connections between moving anchors;
- visual changes to tiles or tile regions;
- composition of a burst, a path, a tile change, and an impact as one beat.

At the same time, feedback must remain accessible. Reduced motion,
colour-blind safety, screen readers, and keyboard-only play are existing
requirements.

## Decision

### 1. Effects are cosmetic, data-driven, and non-blocking

Feedback effects:

- never mutate puzzle or world simulation state;
- never delay input or simulation;
- never carry information that is unavailable in persistent state or text;
- are emitted by the feedback ECS as `EffectPlan` components;
- are consumed by a world effect sink;
- are skipped or reduced under reduced motion.

The state change is immediate. The effect interpolates over render time; it is not
part of the logical tick.

### 2. Closed operators, open composition

An effect is not a single named kind. It is a **plan** composed of **stages**.
The operators are closed; the composition is open data.

```ts
interface EffectPlan {
  id: string;

  // Attribution, same as feedback surfaces.
  actor: PlayerId | null;
  owner: PlayerId | "shared";
  accent?: "p1" | "p2" | "neutral";

  stages: EffectStage[];

  cancel?: "onSourceInactive" | "onTargetGone" | "manual";
}

interface EffectStage {
  visual: EffectVisual;
  source?: EffectSource;
  path?: EffectPath;
  targets?: AnchorRef[];

  timing: {
    delayTicks?: number;
    durationTicks?: number;
    repeat?: number;
    easing?: "linear" | "easeIn" | "easeOut" | "easeInOut";
    stagger?: { kind: "none" | "fromSource" | "byIndex"; ticks: number };
  };

  lifetime?:
    | { kind: "oneShot" }
    | { kind: "persistent"; until: "sourceInactive" | "targetGone" | "manual" };

  binding: {
    follow?: boolean;       // re-resolve moving anchors every frame
    attachTo?: AnchorRef;   // ride a moving object
    space?: "world" | "local";
  };

  layer: "background" | "tiles" | "entities" | "foreground" | "hud";
}
```

A stage answers five questions:

1. **What is drawn?** `EffectVisual`.
2. **Where does it start?** `EffectSource`.
3. **Where does it go?** `EffectPath` / `targets`.
4. **When does it happen?** `timing` / `lifetime`.
5. **What does it follow or attach to?** `binding`.

A new effect that uses existing operators is data, not engine code. A new
operator is an engine change with an ADR.

### 3. Anchors and sockets

```ts
type AnchorRef =
  | { kind: "entity"; id: string; socket?: string }
  | { kind: "player"; id: PlayerId; socket?: string }
  | { kind: "tile"; layer: string; x: number; y: number }
  | { kind: "tileRegion"; layer: string; x1: number; y1: number; x2: number; y2: number }
  | { kind: "world"; x: number; y: number }
  | { kind: "hud"; slot?: "top" | "bottom" | "left" | "right" };
```

A socket is a named point on an entity or player:

```json
{
  "id": "motor-terminal",
  "components": {
    "anchors": {
      "muzzle": { "x": 18, "y": 8, "direction": 0 },
      "center": { "x": 18, "y": 18 }
    }
  }
}
```

Defaults exist (`center`, `top`, `bottom`, `left`, `right`) so an entity without
authored sockets still works. Sockets are how an effect emits from a specific
part of a thing rather than its centre.

### 4. Direction and emission

```ts
interface EffectSource {
  anchor: AnchorRef;
  offset?: Vec2;
  direction?: Direction;
  spreadRadians?: number;
  space?: "world" | "local";
  followFacing?: boolean;
}

type Direction =
  | { kind: "angle"; radians: number }
  | { kind: "vector"; x: number; y: number }
  | { kind: "toward"; target: AnchorRef }
  | { kind: "facing"; entityId: string };
```

This covers:

- fixed direction: `angle` or `vector`;
- aimed at a target: `toward`;
- player/entity facing: `facing`;
- cone/stream: `spreadRadians`;
- local or world space;
- following the emitter's facing.

### 5. Paths

```ts
type EffectPath =
  | { kind: "point" }
  | { kind: "segment"; from: AnchorRef; to: AnchorRef; curve?: number }
  | { kind: "polyline"; points: AnchorRef[]; curve?: number }
  | { kind: "arc"; center: AnchorRef; radius: number; startAngle: number; endAngle: number }
  | { kind: "ray"; from: AnchorRef; direction: Direction; length: number; spread?: number }
  | { kind: "radial"; from: AnchorRef; radius: number; count?: number };
```

This covers:

- A to B: `segment`;
- A to B with arc/curve: `segment` with `curve`, or `arc`;
- A to B to C: `polyline`;
- object emits forward in a cone: `ray`;
- object emits in all directions: `radial`;
- persistent connection between moving things: `segment` with `binding.follow`;
- one point impact: `point`.

If a source or target moves, `follow` re-resolves the anchor every frame. If
either disappears, the effect is cancelled according to its cancellation policy.

### 6. Visual operators

```ts
type EffectVisual =
  | { kind: "orb"; assetId?: string; trail?: boolean; size?: number }
  | { kind: "beam"; assetId?: string; width?: number; pulse?: boolean }
  | { kind: "ring"; assetId?: string; radius?: number }
  | { kind: "particleBurst"; assetId?: string; count?: number; speed?: number }
  | { kind: "particleStream"; assetId?: string; rate?: number; length?: number }
  | { kind: "spriteSwap"; target: AnchorRef; assetId: string }
  | { kind: "tint"; target: AnchorRef; color: string; fadeTicks?: number }
  | { kind: "dissolve"; target: AnchorRef; assetId?: string }
  | { kind: "tileSwap"; target: TileTarget; tile: string; revert?: boolean }
  | { kind: "tileTint"; target: TileTarget; color: string; revert?: boolean }
  | { kind: "tileOverlay"; target: TileTarget; assetId: string; revert?: boolean }
  | { kind: "tileAlpha"; target: TileTarget; alpha: number; revert?: boolean }
  | { kind: "tileSequence"; target: TileTarget; frames: string[]; fps?: number; revert?: boolean }
  | { kind: "decal"; target: AnchorRef; assetId: string };

type EffectOperator = EffectVisual["kind"];
type EffectPathKind = EffectPath["kind"];
```

Tile visuals are first-class targets, not entity effects with a special case.

### 7. Timing, binding, layers, and attribution

- `delayTicks` and `durationTicks` are fixed-tick values; visual interpolation
  happens in the renderer.
- `repeat` repeats a one-shot stage; infinite repetition is expressed as a
  persistent stage, not a magic `repeat` value.
- `stagger` distributes a region effect (tile wave, multi-target burst) by source
  distance or target index.
- `binding.follow` keeps a path attached to moving anchors.
- `binding.attachTo` makes an effect ride a moving entity or player.
- `layer` controls render order: background, tiles, entities, foreground, HUD.

Effects inherit attribution from the fact or surface that spawned them:

- `actor` is the player who caused it;
- `owner` is the interacting player or `shared`;
- `accent` is `p1`, `p2`, or `neutral`.

An effect emitted by an object on behalf of P1 is anchored to the object but
attributed to P1. That keeps co-op causality visible in the effect itself, not
only in the text surface.

### 8. Tile visuals are not collision

```ts
type TileTarget =
  | { kind: "tile"; layer: string; x: number; y: number }
  | { kind: "tileRegion"; layer: string; x1: number; y1: number; x2: number; y2: number };

interface TileVisualOp {
  target: TileTarget;
  op: "swap" | "tint" | "alpha" | "overlay" | "sequence";
  value: string | number;
  revert: boolean;
  ttlTicks?: number;
}
```

`RoomScene` maintains a `TileVisualState` store keyed by tile layer and
coordinate. `TileVisualOp` applies a temporary or persistent visual override.
`revert: true` restores the authored tile when the effect ends.

Hard rule:

> Tile effects change appearance only. They never change collision. A walkable
> bridge is a gate/body state, not a tile effect.

Persistent tile changes that express state (a bridge visible while a gate is
open) are driven by state projection, not by an infinite effect. The effect adds
the transient burst or wave; the projection owns the lasting visual.

### 9. Persistent vs transient

| Need | Mechanism |
|---|---|
| Gate is open, socket is occupied, timer is running | Persistent feedback surface / state projection |
| Gate bursts, socket shakes, orb travels, tiles flash | Transient effect plan |
| Beam remains while two things are connected | Persistent effect with a cancellation policy |
| Bridge tiles remain visible while a gate is open | State projection, not an infinite effect |

A persistent effect is cancelled by `onSourceInactive`, `onTargetGone`, or
`manual`. It must not be used to encode gameplay truth that belongs in puzzle or
world state.

### 10. Examples

#### A. Pulse from terminal socket to receptor socket

```json
{
  "id": "fx.pulse.terminal.to.receptor",
  "actor": "p1",
  "owner": "p1",
  "accent": "p1",
  "stages": [
    {
      "visual": { "kind": "orb", "assetId": "fx.signal.orb", "trail": true },
      "source": {
        "anchor": { "kind": "entity", "id": "motor-terminal", "socket": "muzzle" },
        "direction": {
          "kind": "toward",
          "target": { "kind": "entity", "id": "nicotinic-receptor", "socket": "mouth" }
        }
      },
      "path": {
        "kind": "segment",
        "from": { "kind": "entity", "id": "motor-terminal", "socket": "muzzle" },
        "to": { "kind": "entity", "id": "nicotinic-receptor", "socket": "mouth" },
        "curve": 0.15
      },
      "timing": { "durationTicks": 6 },
      "lifetime": { "kind": "oneShot" },
      "binding": { "follow": true },
      "layer": "entities"
    },
    {
      "visual": { "kind": "ring", "assetId": "fx.impact.ring" },
      "targets": [
        { "kind": "entity", "id": "nicotinic-receptor", "socket": "mouth" }
      ],
      "timing": { "delayTicks": 6, "durationTicks": 8 },
      "lifetime": { "kind": "oneShot" },
      "binding": { "follow": true },
      "layer": "entities"
    }
  ]
}
```

#### B. Gate opens and emits a directional burst

```json
{
  "id": "fx.gate.open.burst",
  "actor": "p1",
  "owner": "shared",
  "accent": "neutral",
  "stages": [
    {
      "visual": { "kind": "particleBurst", "assetId": "fx.gate.burst", "count": 18 },
      "source": {
        "anchor": { "kind": "entity", "id": "ca-gate", "socket": "center" },
        "direction": { "kind": "angle", "radians": -1.57 },
        "spreadRadians": 1.2,
        "space": "world"
      },
      "path": {
        "kind": "ray",
        "from": { "kind": "entity", "id": "ca-gate", "socket": "center" },
        "direction": { "kind": "angle", "radians": -1.57 },
        "length": 48,
        "spread": 1.2
      },
      "timing": { "durationTicks": 10 },
      "lifetime": { "kind": "oneShot" },
      "binding": { "follow": true },
      "layer": "foreground"
    },
    {
      "visual": { "kind": "ring", "assetId": "fx.gate.ring" },
      "targets": [{ "kind": "entity", "id": "ca-gate", "socket": "center" }],
      "timing": { "durationTicks": 8 },
      "lifetime": { "kind": "oneShot" },
      "binding": { "follow": true },
      "layer": "entities"
    }
  ]
}
```

#### C. Tile path lights up from a source

```json
{
  "id": "fx.axon.path.light",
  "actor": null,
  "owner": "shared",
  "accent": "neutral",
  "stages": [
    {
      "visual": {
        "kind": "tileTint",
        "target": { "kind": "tileRegion", "layer": "tiles", "x1": 10, "y1": 18, "x2": 20, "y2": 19 },
        "color": "#ffd166",
        "revert": true
      },
      "source": { "anchor": { "kind": "entity", "id": "pulse-terminal" } },
      "timing": {
        "durationTicks": 30,
        "stagger": { "kind": "fromSource", "ticks": 1 }
      },
      "lifetime": { "kind": "oneShot" },
      "binding": { "follow": false },
      "layer": "tiles"
    }
  ]
}
```

#### D. Persistent beam between a player and a receptor

```json
{
  "id": "fx.connection.beam",
  "actor": "p1",
  "owner": "p1",
  "accent": "p1",
  "cancel": "onSourceInactive",
  "stages": [
    {
      "visual": { "kind": "beam", "assetId": "fx.connection.beam", "pulse": true },
      "path": {
        "kind": "segment",
        "from": { "kind": "player", "id": "p1", "socket": "hand" },
        "to": { "kind": "entity", "id": "nicotinic-receptor", "socket": "mouth" }
      },
      "timing": {},
      "lifetime": { "kind": "persistent", "until": "sourceInactive" },
      "binding": { "follow": true },
      "layer": "entities"
    }
  ]
}
```

#### E. Muscle contraction wave

```json
{
  "id": "fx.muscle.contraction",
  "actor": "p1",
  "owner": "shared",
  "accent": "neutral",
  "stages": [
    {
      "visual": { "kind": "particleStream", "assetId": "fx.muscle.wave", "rate": 12, "length": 24 },
      "source": {
        "anchor": { "kind": "entity", "id": "muscle-gate", "socket": "center" },
        "direction": { "kind": "vector", "x": 1, "y": 0 },
        "spreadRadians": 0.25
      },
      "path": {
        "kind": "ray",
        "from": { "kind": "entity", "id": "muscle-gate", "socket": "center" },
        "direction": { "kind": "vector", "x": 1, "y": 0 },
        "length": 64
      },
      "timing": { "durationTicks": 20 },
      "lifetime": { "kind": "oneShot" },
      "binding": { "follow": true },
      "layer": "foreground"
    },
    {
      "visual": {
        "kind": "tileTint",
        "target": { "kind": "tileRegion", "layer": "tiles", "x1": 30, "y1": 19, "x2": 34, "y2": 20 },
        "color": "#ef476f",
        "revert": true
      },
      "timing": {
        "durationTicks": 20,
        "stagger": { "kind": "fromSource", "ticks": 2 }
      },
      "lifetime": { "kind": "oneShot" },
      "binding": { "follow": false },
      "layer": "tiles"
    }
  ]
}
```

### 11. Accessibility rules

Every feedback surface and effect must satisfy:

- a text or state label exists;
- critical state is persistent, not only animated;
- colour is never the only distinction; shape, icon, or text must also differ;
- audio is never the only channel;
- reduced motion removes or simplifies effects without removing information;
- live-region announcements include the actor where attribution matters
  ("P2: Ca²⁺ window open");
- interactive surfaces have a keyboard path and an owner-aware input route.

### 12. Reduced motion

Under reduced motion:

- pulse travel becomes an immediate impact marker or a static line;
- gate bursts become a state swap;
- dissolves become immediate visibility changes;
- shakes and waves are omitted;
- tile waves become an immediate tile state change or are omitted;
- follow smoothing becomes an immediate position update;
- DOM surfaces remain in the same place and retain the same text.

Reduced motion must be testable by asserting that the feedback surface/state is
identical while effects are absent.

### 13. Asset policy

Effects are procedural or use logical asset IDs. The puzzle runtime and feedback
systems never reference media paths.

Final animation assets are optional. A static state swap plus text is the minimum
valid presentation. Sprite sheets, GIF/WebP loops, and other formats remain
governed by the existing asset ADRs.

### 14. World ports

`world` exposes narrow visual ports; it never imports `feedback`.

```ts
interface WorldEffectPort {
  spawn(plan: WorldEffectPlan): string;
  cancel(effectId: string): void;
}

interface TileVisualPort {
  apply(op: TileVisualOp): string;
  revert(opId: string): void;
}
```

`WorldEffectPlan` is the resolved, world-facing projection of a feedback
`EffectInstance`: it carries resolved anchors, timing, and attribution, not
feedback components or `PuzzleRuntime` state. `GameRuntime` performs that
projection. `RoomScene` and the tile visual store implement the ports. The ports
carry no gameplay authority.

### 15. Validation and tests

Validator:

- effect target exists, including entity sockets and tile layers;
- tile region is inside the room bounds;
- unknown effect operator or path kind is rejected;
- persistent effect has a cancellation policy;
- player-caused effect carries an actor;
- no effect declares a collision change;
- reduced-motion alternative exists for a movement-only effect.

Tests:

- directional emission starts at the named socket and respects direction/spread;
- A to B path endpoints match resolved anchors;
- follow binding updates when a player or entity moves;
- tile visual applies and reverts, and collision state is unchanged;
- persistent effect cancels on source/target loss;
- P1/P2 accent attribution does not cross;
- simulation state is identical with effects enabled and disabled;
- reduced motion removes effects but preserves surfaces and text.

## Consequences

**Easier:**

- Motion can communicate causality without becoming the only signal.
- Gate, timer, pulse, socket, clearance, tile, and connection beats become
  legible.
- Effects are reusable across puzzle types.
- Directional emission, A to B transfer, and tile visuals share one model.
- Accessibility is designed into the feedback model rather than patched later.
- The art pass can replace procedural effects without touching puzzle logic.

**Harder:**

- The world needs a generic effect layer, effect lifecycle, and tile visual
  state.
- Effects must be tested for non-blocking behaviour, attribution, and reduced
  motion.
- Every effect needs a non-motion fallback.
- The ADR-0003 constraint must be explicitly amended; leaving both in force
  creates contradictory guidance.
- Effect plans become another data surface that must be validated.

**Constrained:**

- No effect may mutate simulation state.
- No effect may delay or block input.
- No effect may change collision.
- No information may be available only through motion, colour, or audio.
- No media paths in feedback or puzzle code.
- No arbitrary animation scripting from content.
- No new operator without an engine change and tests.

## Alternatives considered

- **Keep ADR-0003 and ship static state swaps only.** Legible only if every state
  has a persistent element and text; misses the causal "signal travelling" beat.
  Rejected as the only option.
- **Sprite-sheet animation in the puzzle runtime.** Violates the pure boundary
  and delays state. Rejected.
- **CSS-only effects for everything.** Insufficient for world-space pulse travel,
  tile regions, and gate impacts. Rejected.
- **A flat list of named effects.** Simple for the first five effects, but every
  new direction, target, or tile case adds engine code. Rejected.
- **Arbitrary effect scripting from content.** Becomes a presentation engine and
  cannot be validated. Rejected.
- **Animation as the primary feedback channel.** Inaccessible and unreliable.
  Rejected.

## References

- [`0003-gate-prop-presentation.md`](0003-gate-prop-presentation.md)
- [`0009-feedback-ecs-substrate.md`](0009-feedback-ecs-substrate.md)
- [`0010-anchored-feedback-surfaces.md`](0010-anchored-feedback-surfaces.md)
- [`0012-capability-feedback-coverage.md`](0012-capability-feedback-coverage.md)
- [`../../shrinkonauts/base-game/adr/0020-accessibility-baseline.md`](../../shrinkonauts/base-game/adr/0020-accessibility-baseline.md)
- [`../../shrinkonauts/base-game/adr/0030-sprite-animation-format-policy.md`](../../shrinkonauts/base-game/adr/0030-sprite-animation-format-policy.md)
- [`../../shrinkonauts/base-game/adr/0032-audio-cue-abstraction.md`](../../shrinkonauts/base-game/adr/0032-audio-cue-abstraction.md)
- [`../../shrinkonauts/base-game/adr/0033-final-asset-integration-timing.md`](../../shrinkonauts/base-game/adr/0033-final-asset-integration-timing.md)
