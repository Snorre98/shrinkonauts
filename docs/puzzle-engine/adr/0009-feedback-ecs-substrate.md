# ADR-0009: Feedback ECS as the generic ECS substrate

Status: Proposed
Date: 2026-10-28
Deciders: Snorre
Related: ADR-0001, ADR-0003, ADR-0005, ADR-0034, ADR-0043
Amends: [`architecture.md`](../architecture.md) §4.4 and §8; ADR-0005's
"no new UI surface" constraint

## Context

Feedback is currently spread across four ad-hoc paths:

- `GameRuntime.handlePuzzleEvents` handles only `receptorBound`,
  `receptorRejected`, and `gateOpen`; other puzzle events are dropped.
- `RuntimeSnapshot.puzzle` exposes title, solved, counters, hint, and pulse
  cooldown, but no gate, timer, occupancy, or step state.
- The toast is a single string with a 3-second TTL. Multiple events in one tick
  overwrite each other.
- `RoomScene` renders static entities and has no gate/prop/state projection or
  effect layer.
- Audio uses a fixed cue list with no puzzle-specific cues.

The result is that feedback is neither reliable nor general:

- it cannot describe persistent state;
- it cannot distinguish empty, wrong-shape, blocked, and cooldown outcomes;
- it cannot attribute a cue to player 1 or player 2;
- a new puzzle type requires changing the runtime, HUD, scene, and audio.

The game will add new puzzle types and puzzle classes. Feedback must therefore
be organized around a stable semantic model, not around individual puzzles.

At the same time, the codebase is not ready for a full-game ECS rewrite. The
puzzle engine owns logical state, the world owns physics and rendering, and the
DOM UI owns presentation. A full migration now would mix an engine change with a
feedback change.

## Decision

### 1. Introduce a generic ECS kernel

Add a small, domain-free ECS kernel under `src/ecs`.

```ts
type EntityId = string & { readonly __entity: unique symbol };

interface EcsWorld {
  spawn(id?: EntityId): EntityId;
  despawn(entity: EntityId): void;

  add<T>(entity: EntityId, type: ComponentType<T>, value: T): void;
  get<T>(entity: EntityId, type: ComponentType<T>): T | undefined;
  remove<T>(entity: EntityId, type: ComponentType<T>): void;

  query(...types: ComponentType<unknown>[]): Iterable<EntityId>;

  tick(dt: number, context: TickContext): void;
  frame(context: FrameContext): void;
}
```

Kernel rules:

- Entity IDs are stable strings, not auto-increment numbers. Feedback entities
  reference game entities by ID now; game entities can join the same namespace
  later.
- Component types are typed tokens, not strings.
- Systems have explicit phases: `tick` for deterministic fixed-step logic,
  `frame` for camera/viewport-dependent presentation.
- System order is deterministic within each phase.
- The kernel imports no game, puzzle, UI, world, DOM, Phaser, or feedback code.
- The kernel has no singletons. The world and context are passed explicitly.
- Generic components (`Transform`, `Renderable`, `Lifetime`, `Anchor`) are
  allowed in the kernel; they must make sense for future game entities too.

### 2. Add a feedback bounded context on top of the kernel

Add `src/feedback`, which owns one ECS world for feedback entities.

The feedback world is **ephemeral**. It is not saved. Persistent feedback is
rebuilt from game state; transient cues are recreated only when the relevant
fact occurs.

Feedback components:

| Component | Responsibility |
|---|---|
| `SourceRef` | entity/node/system that caused the feedback |
| `ActorRef` | player who caused it, or `null` |
| `Anchor` | entity, player, node, world point, HUD, or screen anchor |
| `Presentation` | speech bubble, player caption, HUD status, meter, tracker, screen caption, modal, anchored panel |
| `Content` | text, speaker, choices, progress |
| `Ownership` | owner, audience, interaction mode, focus policy, movement policy |
| `Lifetime` | sticky vs TTL, fade |
| `Priority` | ordering, coalescing, eviction |
| `Visual` | severity, icon, palette token |
| `Accessibility` | announce policy, text alternative |
| `WorldEffect` | optional cosmetic effect descriptor |
| `Conversation` | dialogue graph/session binding; only on conversation surfaces |
| `Transform` | generic position/size for future full-game ECS use |
| `Renderable` | generic visibility/depth for future full-game ECS use |

A feedback entity is a surface when it has at least:

```ts
Anchor + Presentation + Content + Ownership + Lifetime
```

A conversation is the same entity plus `Conversation`. A timer meter is the same
entity minus `Conversation`, with `Presentation: "hudMeter"` and
`Lifetime: { sticky: true }`. A player caption is the same entity with a player
anchor and a TTL.

### 3. Split feedback into persistent projection and transient cues

The distinction is mandatory:

- **Persistent**: "What is true now?" Rebuilt from state every tick. Survives
  missed frames and restore.
- **Transient**: "What just happened?" One-shot, sequenced, TTL-bound.

Never infer a transient event from a state diff. Never make a critical state
understandable only through a transient cue.

Sticky surfaces use stable IDs:

```text
fb:meter:ca-timer
fb:barrier:ca-gate
fb:container:nicotinic-receptor
fb:carrier:ach-packet
```

Rebuilding is idempotent. Transient surfaces use a monotonic `seq` plus a
`cause` key for deduplication.

### 4. Systems

Fixed tick:

1. `IngestFacts` — domain facts become feedback entities.
2. `ProjectSticky` — rebuild persistent surfaces from current game/puzzle state.
3. `ConversationTick` — advance conversations resolved by input.
4. `LifetimeTick` — decrement TTL, fade, despawn.
5. `OrderAndDedupe` — priority, coalescing, stable order.

Render frame:

6. `ResolveAnchors` — project entity/player/world positions into screen space.
7. `Layout` — stack, offset, clamp, edge-dock, HUD fallback.
8. `RenderSync` — diff the DOM surface layer against the resolved surfaces.
9. `AccessibilitySync` — live-region announcements and labels.
10. `Effects` — update or emit cosmetic world effects.

Tick systems are deterministic and headless-testable. Frame systems depend on
camera, viewport, and DOM adapters; they must not mutate game simulation.

### 5. `GameRuntime` is the bridge, not the feedback system

`GameRuntime` maps domain facts into `FeedbackFact` and runs the tick systems
after the game update.

```ts
type FeedbackFact =
  | {
      kind: "puzzle.event";
      event: PuzzleEvent;
      actor: PlayerId | null;
      source: SourceRef;
    }
  | {
      kind: "action.outcome";
      actor: PlayerId;
      action: string;
      result: FeedbackResult;
      reason?: RejectionReason;
      target?: SourceRef;
    }
  | {
      kind: "conversation.start";
      actor: PlayerId;
      entityId: string;
      dialogueId: string;
    }
  | {
      kind: "system.outcome";
      outcome: string;
      source: SourceRef;
    };
```

`GameRuntime` exposes a stable view:

```ts
interface FeedbackFrame {
  seq: number;
  tick: number;
  surfaces: FeedbackSurface[];
  effects: WorldEffect[];
}
```

`RuntimeSnapshot.feedback` carries the frame. The UI, world effect adapter, and
audio adapter consume it. None of them read ECS internals or `PuzzleRuntime`
state directly.

### 6. Module boundaries

```text
ecs       → core only
feedback  → ecs, puzzle types, core
game      → feedback
ui        → feedback types
world     → no feedback import; receives effects through a world-effect port
audio     → no feedback import; receives cue IDs through the game audio port
```

`feedback` does not import `world`, `ui`, `game`, `pack`, or Phaser. `world` does
not import `feedback`. `game` translates effects into the world port.

### 7. Full-game ECS migration seam

The feedback world is a bounded context, not the game world. It is designed so
the kernel can later host game entities:

- `TransformProvider` is an interface. It is backed by legacy room/player data
  now and by ECS `Transform` components later.
- Entity IDs are stable and global.
- `AnchorSystem` depends on `TransformProvider`, not on legacy room internals.
- Generic components are not feedback-specific.
- Fact ingestion is an adapter. Later, game systems can emit ECS events or facts
  directly.
- Rendering is behind sinks. Later, the full-game ECS can use the same DOM and
  effect adapters.

The feedback layer must not need a rewrite when gameplay becomes ECS.

## Consequences

**Easier:**

- New puzzle types can add feedback without touching HUD, scene, or audio.
- Persistent state and transient events are separately reliable.
- Co-op attribution and ownership have a place in the model.
- The ECS kernel is proven on a bounded problem before gameplay migrates.
- Feedback can be tested headlessly with deterministic systems.

**Harder:**

- The project gains an ECS kernel, component vocabulary, and system scheduling.
- Feedback is no longer a single `setToast` call; callers must emit facts.
- Frame-phase systems need camera/viewport context.
- Restore must rebuild sticky surfaces idempotently.
- The kernel must stay generic or the future full-game migration becomes
  harder.

**Constrained:**

- No feedback state in save files.
- No DOM, Phaser, or game imports in the ECS kernel.
- No arbitrary feedback components from content.
- No per-puzzle UI systems.
- No global feedback singleton.
- No game-state ownership inside the feedback ECS.

## Alternatives considered

- **UI-only feedback manager.** Keeps the ECS out, but repeats the current
  problem: presentation logic becomes the place where every new puzzle type is
  special-cased. Rejected.
- **Full-game ECS now.** Correct long-term, but mixes gameplay migration with
  feedback architecture and makes both harder to verify. Rejected for this
  decision.
- **Third-party ECS.** Adds a dependency and an API shaped for a different
  problem. The kernel is small enough to own. Rejected.
- **Per-type presenter classes.** Every type touches every channel; violates the
  pure puzzle boundary. Rejected.

## References

- [`0001-compact-modules-public-apis.md`](0001-compact-modules-public-apis.md)
- [`0003-gate-prop-presentation.md`](0003-gate-prop-presentation.md)
- [`0005-conditional-links-feedback.md`](0005-conditional-links-feedback.md)
- [`../../adr-m1.5/0034-puzzle-as-data-typed-dataflow.md`](../../adr-m1.5/0034-puzzle-as-data-typed-dataflow.md)
- [`../../adr-m1.5/0043-puzzle-feedback-hints-cooldown.md`](../../adr-m1.5/0043-puzzle-feedback-hints-cooldown.md)
