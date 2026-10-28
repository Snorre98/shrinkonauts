# ADR-0010: Anchored feedback surfaces, co-op ownership, and input routing

Status: Accepted
Date: 2026-10-28
Deciders: Snorre
Related: ADR-0009, ADR-0016, ADR-0017, ADR-0018, ADR-0020, ADR-0043

## Context

In local co-op, the current modal and toast appear in the same place for both
players. When a feedback message appears, the player cannot tell whether P1 or
P2 caused it.

Two concrete requirements follow:

1. If a player talks to an entity, the feedback should be a speech bubble
   attached to that entity, and the player should be able to answer questions in
   that bubble.
2. If a player triggers a player-specific event whose message would otherwise
   appear in the HUD, the text should appear below that player and follow them
   for a short time.

The current architecture cannot support this cleanly:

- one global `confirm` action;
- one global dialogue overlay that traps focus;
- one `RuntimeSnapshot.dialogue`;
- one `RuntimeSnapshot.toast`;
- no entity/player anchor model;
- no distinction between the event actor, the surface owner, and the audience.

World-space DOM is preferred over Phaser-rendered text because it gives better
text layout, choices, accessibility, focus semantics, and reuse of the existing
UI layer.

## Decision

### 1. Every feedback surface has source, actor, owner, audience, anchor, and interaction policy

```ts
interface FeedbackSurface {
  id: string;

  source: { kind: "entity" | "node" | "system"; id: string };
  actor: PlayerId | null;

  owner: PlayerId | "shared";
  audience: "owner" | "both";

  anchor: FeedbackAnchor;
  presentation: FeedbackPresentation;

  content: {
    speaker?: string;
    text?: string;
    choices?: FeedbackChoice[];
    progress?: { value: number; max: number; unit?: "ticks" | "seconds" };
  };

  state: FeedbackState;
  severity: "neutral" | "positive" | "warning" | "critical";

  lifetime: { sticky: boolean; ttlTicks?: number; fadeTicks?: number };

  interaction: {
    mode: "none" | "acknowledge" | "choice" | "text";
    focus: "soft" | "hard";
    movement: "free" | "freeze-owner" | "freeze-all";
    maxDistance?: number;
  };

  priority: number;
  a11y: { announce: boolean; textAlternative?: string };

  /** Declarative cosmetic effects spawned with this surface. */
  effects?: EffectPlan[];
}
```

`EffectPlan` is the composable effect contract from ADR-0013.

The three concepts are separate:

- `actor`: who caused the event;
- `owner`: who may interact with the surface;
- `audience`: who should see it.

In local co-op, visibility is shared; `audience` controls attachment and
emphasis, not information hiding.

### 2. Anchors and default attribution policy

```ts
type FeedbackAnchor =
  | { kind: "entity"; entityId: string; socket?: string; offset?: Vec2; fallback?: "hud" }
  | { kind: "player"; playerId: PlayerId; socket?: string; offset?: Vec2 }
  | { kind: "node"; nodeId: string; entityId?: string; socket?: string; fallback?: "hud" }
  | { kind: "tile"; layer: string; x: number; y: number }
  | { kind: "tileRegion"; layer: string; x1: number; y1: number; x2: number; y2: number }
  | { kind: "world"; point: Vec2; offset?: Vec2 }
  | { kind: "hud"; slot?: "top" | "bottom" | "left" | "right" }
  | { kind: "screen"; x?: number; y?: number };
```

`FeedbackAnchor` is the surface-side view of the effect `AnchorRef` used by
ADR-0013. Sockets and tile targets are shared vocabulary: a bubble can point at
an entity socket, and an effect can originate from the same socket.

`FeedbackAnchor` is a superset of `AnchorRef`: a surface may also anchor to a
puzzle `node` or the `screen`. Those surface-only anchors resolve to the node's
entity or to the HUD fallback before an effect is spawned; effects use only the
`AnchorRef` subset from ADR-0013.

Default policy:

| Fact | Default anchor | Presentation |
|---|---|---|
| Player talks to an entity | that entity | `speechBubble` above the entity |
| Player action with no entity target | that player | `playerCaption` below the player |
| Puzzle-node state | the node's entity, else HUD | `hudMeter` / `hudStatus` |
| Shared outcome | HUD or screen | `screenCaption` / `hudStatus` |
| Blocked/rejected interaction | the target entity | `speechBubble` / anchor-matched caption |
| Hard question or debrief | none | `modal` |

Rules:

1. Player-caused feedback must carry an `actor`. If it does not, it falls back to
   HUD; it must not silently attach to P1.
2. Entity source beats actor for "talk to" feedback.
3. Actor beats HUD for player-specific action feedback.
4. Shared outcomes go to HUD, not under the last player who happened to act.
5. Every anchor has a fallback. An off-screen entity or inactive player must not
   make feedback disappear.

### 3. World-space DOM layers and projection

Add three DOM layers over the canvas:

```text
#game-root
  canvas
  #world-surface-layer     // pointer-events: none
  #hud-surface-layer
  #modal-layer
```

`WorldView` supplies the data needed for projection:

```ts
interface WorldView {
  camera: CameraView;
  players: Record<PlayerId, PlayerView>;
  entities: Record<string, {
    x: number;
    y: number;
    width: number;
    height: number;
  }>;
  viewport: {
    canvasRect: { x: number; y: number; width: number; height: number };
    gameWidth: number;
    gameHeight: number;
  };
}
```

`ResolveAnchors` converts world coordinates to CSS pixels. `Layout` applies:

- bubble offset above the entity;
- caption offset below the player;
- safe-area clamping outside the HUD;
- stacking for multiple surfaces on one anchor;
- P1/P2 lanes for player captions;
- edge-docking for off-screen conversations;
- HUD fallback for transient cues that cannot be placed.

DOM nodes use `transform: translate3d(...)`. The layer has `pointer-events: none`;
interactive controls opt in with `pointer-events: auto`.

Projection runs on the render frame, not the fixed tick. Resize recalculates the
viewport and repositions surfaces without changing game state.

### 4. Per-player input routing

Replace the global `confirm` action with semantic UI actions per player:

```ts
interface PlayerUiActions {
  confirm: boolean;
  cancel: boolean;
  navigateUp: boolean;
  navigateDown: boolean;
  choose: number | null;
}
```

The surface router:

```ts
interface SurfaceInputRouter {
  route(playerId: PlayerId, actions: PlayerUiActions): boolean;
}
```

Order:

1. **Hard surface** — consumes all input, as the current modal does.
2. **Soft surfaces for that player**, topmost first — consume only that player's
   actions.
3. **Gameplay** — receives the rest.

A soft surface owned by P1 must never consume P2's input. P2 must be able to
move, jump, interact, and open their own surface while P1 is talking.

Focus policy:

- Soft surfaces are driven by game input; they do not steal DOM focus.
- Hard surfaces keep the existing focus trap.
- For screen-reader use, a soft surface can be promoted to hard by its owner's
  confirm action, or the UI can provide focusable controls that do not trap the
  other player.

Movement policy:

- `free`: the owner can move; the surface closes when `maxDistance` is exceeded.
- `freeze-owner`: the owner's movement intents are zeroed while the surface is
  active; the other player continues.
- `freeze-all`: used only for hard/blocking surfaces.

### 5. Speech bubbles and player captions

An entity conversation is a `speechBubble` surface anchored to the entity. It
displays:

- speaker label,
- text,
- choices or a continue action,
- an owner chip (`P1`/`P2`) and accent colour.

A player-specific transient message is a `playerCaption` surface anchored to the
actor. It follows the player, sits below the sprite, carries an owner chip, and
expires by TTL.

Both are the same surface mechanism with different presentation and anchor
policies.

Effects use the same attribution model. An effect emitted by an object on behalf
of P1 is anchored to the object or its socket, but carries `actor: "p1"`,
`owner: "p1"`, and `accent: "p1"`. A shared gate burst carries
`accent: "neutral"`. This keeps co-op causality visible in the effect, not only
in a text surface.

### 6. Default co-op attribution

- P1 talks to the Muscle Effector → bubble on `agent-muscle`, owner P1.
- P2 steps on the terminal plate → caption under P2 for the short "window open"
  message; persistent `hudMeter` for the Ca²⁺ window.
- P1 pulses an empty receptor → bubble on that receptor, owner P1.
- Wrong packet on the wrong socket → bubble on the socket, owner = the player
  who pulsed/placed.
- P1 pulse travels from the terminal to the receptor → orb/beam accent P1,
  anchored to both sockets.
- Shared gate burst → neutral accent, anchored to the gate socket.
- Puzzle solved → shared HUD/screen outcome, not a caption under the last actor.
- Both players act at once → two captions, two anchors, no cross-attribution.

## Consequences

**Easier:**

- Co-op attribution is explicit and testable.
- Entity conversations can happen simultaneously.
- One player can read/answer while the other keeps playing.
- Text and choices use the existing DOM accessibility stack.
- The same model supports HUD meters, captions, bubbles, and modals.
- Directional, path, and tile effects can carry the same actor/owner/accent
  attribution.

**Harder:**

- Input routing must become per-player.
- DOM projection must account for canvas scale, letterboxing, resize, and safe
  areas.
- Layout must handle overlapping surfaces and off-screen anchors.
- Focus and screen-reader policy need deliberate handling for soft surfaces.
- Effects need socket and tile anchor resolution in addition to entity/player
  anchors.
- The old global toast/dialogue paths must be removed, not kept alongside the
  new model.

**Constrained:**

- No player-attributed feedback without an actor.
- No soft surface may consume the other player's input.
- No entity conversation may use the global modal.
- No canvas-rendered text for choices or accessibility-critical content.
- No arbitrary placement: anchors come from the policy, not from ad-hoc UI code.
- No effect may change collision or simulation state.

## Alternatives considered

- **Phaser-rendered speech bubbles.** Simpler projection, but worse text layout,
  choice UI, accessibility, and reuse. Rejected.
- **Global toast with a "P1"/"P2" prefix.** Cheap, but the text still appears in
  one place and does not follow the player or the entity. Rejected.
- **Separate per-player overlays.** Two full-screen overlays would obscure the
  shared camera and break local co-op. Rejected.
- **Keep the modal and add bubbles on top.** Two dialogue systems with different
  input rules; the modal would still steal focus. Rejected.

## References

- [`0009-feedback-ecs-substrate.md`](0009-feedback-ecs-substrate.md)
- [`0013-cosmetic-feedback-effects-accessibility.md`](0013-cosmetic-feedback-effects-accessibility.md)
- [`../../shrinkonauts/base-game/adr/0016-local-coop-p0.md`](../../shrinkonauts/base-game/adr/0016-local-coop-p0.md)
- [`../../shrinkonauts/base-game/adr/0017-coop-camera-tether.md`](../../shrinkonauts/base-game/adr/0017-coop-camera-tether.md)
- [`../../shrinkonauts/base-game/adr/0018-keyboard-first-input-rebinding.md`](../../shrinkonauts/base-game/adr/0018-keyboard-first-input-rebinding.md)
- [`../../shrinkonauts/base-game/adr/0020-accessibility-baseline.md`](../../shrinkonauts/base-game/adr/0020-accessibility-baseline.md)
- [`../../adr-m1.5/0043-puzzle-feedback-hints-cooldown.md`](../../adr-m1.5/0043-puzzle-feedback-hints-cooldown.md)
