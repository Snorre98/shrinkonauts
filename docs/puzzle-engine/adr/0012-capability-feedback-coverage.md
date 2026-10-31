# ADR-0012: Capability-based feedback defaults and coverage

Status: Accepted
Date: 2026-10-28
Deciders: Snorre
Related: ADR-0009, ADR-0010, ADR-0034

## Context

The feedback ECS from ADR-0009 is a substrate. It does not by itself guarantee
that a new puzzle type gets useful feedback.

If each puzzle type or puzzle class emits its own arbitrary surfaces, feedback
language drifts, coverage is unenforceable, and every new type can silently omit
an affordance, a progress indicator, or a rejection explanation.

The architecture needs two things at once:

- good default feedback derived from the kind of thing a node is;
- an escape hatch for a genuinely unique beat.

## Decision

### 1. Closed capability vocabulary

Every puzzle node/link type declares one or more capabilities from a closed set:

```ts
type FeedbackCapability =
  | "affordance"
  | "binary"
  | "meter"
  | "counter"
  | "container"
  | "carrier"
  | "barrier"
  | "conductor"
  | "outcome";
```

Meanings:

| Capability | Player-facing meaning |
|---|---|
| `affordance` | "I can interact with this." |
| `binary` | pressed/released, ready/pulled, on/off |
| `meter` | timer, cooldown, charge, hold |
| `counter` | threshold, count, pips |
| `container` | receptor/socket/zone occupancy |
| `carrier` | prop carried/placed/dropped/cleared |
| `barrier` | gate/door open/closed |
| `conductor` | relay/trigger/path active/inactive |
| `outcome` | solved, reward, exit |

These are semantic, not visual. The renderer knows how to display a `meter`; it
does not know what a `ca-timer` is.

### 2. Closed semantic state set

Engine state strings are mapped into:

```ts
type FeedbackState =
  | "idle"
  | "available"
  | "active"
  | "progress"
  | "complete"
  | "blocked"
  | "expired"
  | "reset";
```

The UI renders this set. A new puzzle type maps its private states into these
values. If it cannot, that is a deliberate extension of the semantic model, not
permission to leak a new string into the DOM.

### 3. Two factories, one component vocabulary

**A: default projectors**

```ts
interface NodeFeedbackDescriptor<N extends PuzzleNode = PuzzleNode> {
  capabilities: readonly FeedbackCapability[];
  project(node: N, state: PuzzleNodeRunState): FeedbackSurfaceSpec[];
  effects?(node: N, state: PuzzleNodeRunState): EffectPlan[];
  cues?: Partial<Record<PuzzleEventType, CueRecipe>>;
}

interface LinkFeedbackDescriptor {
  capabilities: readonly FeedbackCapability[];
  effects?(link: PuzzleLink): EffectPlan[];
  cues?: Partial<Record<PuzzleLinkType, CueRecipe>>;
}
```

The descriptor tables are exhaustive:

```ts
const NODE_FEEDBACK = {
  plate: { ... },
  timer: { ... },
  gate: { ... },
  receptor: { ... },
  prop: { ... },
  relay: { ... },
  counter: { ... },
  zone: { ... },
  trigger: { ... },
  pulseSource: { ... },
} satisfies Record<PuzzleNodeType, NodeFeedbackDescriptor>;
```

Adding a node type without a descriptor fails the build.

**B: custom signals**

A unique beat emits a semantic signal. The signal is converted to the same
feedback entity components:

```ts
function projectSignal(signal: FeedbackSignal): FeedbackSurfaceSpec {
  return {
    anchor: signal.anchorHint ?? defaultAnchorFor(signal),
    presentation: signal.presentation ?? "playerCaption",
    content: { text: signal.text },
    lifetime: { sticky: false, ttlTicks: signal.ttlTicks ?? 180 },
    // ownership, priority, accessibility...
  };
}
```

A and B are not alternatives to C. **C is the ECS runtime; A and B are the two
ways surfaces are created.** Effects follow the same two paths: a descriptor
supplies a default effect recipe, or a signal supplies a custom `EffectPlan`.

### 4. Default anchor and presentation policy

The capability determines the default surface:

| Capability | Default presentation | Default anchor |
|---|---|---|
| `affordance` | prompt / banner | entity |
| `binary` | state swap + optional caption | entity |
| `meter` | HUD meter / ring | entity or HUD |
| `counter` | HUD pips / counter | entity or HUD |
| `container` | socket fill / occupancy | entity |
| `carrier` | outline/glow + carry state | entity/player |
| `barrier` | open/closed state swap | entity |
| `conductor` | path glow | entity |
| `outcome` | screen caption / HUD status | HUD/screen |

Content may override label, anchor, presentation, and copy through a validated
`feedback` block. It may not introduce new component or presentation kinds.

### 4.1 Default effect recipes

Effects use the composable operators from ADR-0013. The capability supplies a
default recipe; a new puzzle type inherits it unless the descriptor overrides it.

| Capability | Default effect recipes |
|---|---|
| `affordance` | interact ring, idle glow |
| `binary` | plate depress, lever pull, state swap |
| `meter` | timer ring, cooldown sweep, orb travel |
| `counter` | pip pop, threshold burst |
| `container` | socket fill, rejection bounce |
| `carrier` | pickup glow, drop trail, dissolve |
| `barrier` | gate burst, bridge tile reveal |
| `conductor` | path beam, tile wave |
| `outcome` | screen flash, exit ping |

Content may select an effect preset or provide a validated `EffectPlan` built
from the closed operators. It may not introduce a new operator or a new path
kind.

### 5. Reasons, not prose

Rejected and blocked feedback must carry a reason code:

```ts
type RejectionReason =
  | "empty"
  | "wrong-shape"
  | "wrong-tag"
  | "condition-unmet"
  | "cooldown"
  | "out-of-range"
  | "locked"
  | "cleared";
```

A lexicon maps `kind + reason + labels` to text, icon, and audio. Levels can
override copy. `runtime.ts` stops hardcoding sentences such as "The receptor
rejects that shape."

### 6. Beats and puzzle classes

Puzzle classes/archetypes can define a learning beat sequence:

```ts
interface PuzzleArchetype {
  id: string;
  beats: readonly BeatSpec[];
  defaultSurfaces: readonly DefaultSurfaceSpec[];
  defaultAnchors: Readonly<Record<string, FeedbackAnchor>>;
}
```

The beat tracker is generic:

```json
"beats": [
  { "id": "trigger", "label": "Trigger the terminal", "nodes": ["terminal-plate"] },
  { "id": "release", "label": "Open the Ca²⁺ window", "nodes": ["ca-timer", "ca-gate"] },
  { "id": "carry",   "label": "Carry ACh across the cleft", "nodes": ["ach-packet"] },
  { "id": "bind",    "label": "Bind the nicotinic receptor", "nodes": ["nicotinic-receptor"] },
  { "id": "respond", "label": "Muscle responds", "nodes": ["muscle-gate"] }
]
```

A new class provides beats and default surfaces; it does not provide UI
components.

### 7. Coverage is enforced, not reviewed

Compile-time:

- `satisfies Record<PuzzleNodeType, NodeFeedbackDescriptor>`;
- `satisfies Record<PuzzleLinkType, LinkFeedbackDescriptor>`;
- closed `FeedbackCapability`, `FeedbackState`, `Presentation`,
  `RejectionReason`, `EffectOperator`, `EffectPathKind`, `TileVisualOp`.

Validator:

- interactive node/link with no label or copy;
- timer/gate that gates the win but has no persistent element;
- gate with no open/closed presentation;
- receptor with no accept/reject reason;
- empty authored message;
- unknown audio cue;
- beat referencing an unknown node;
- puzzle with no hints or no solved cue;
- feedback override using an unknown component or presentation;
- effect target or socket that does not exist;
- tile layer missing or tile region outside the room bounds;
- unknown effect operator or path kind;
- persistent effect with no cancellation source;
- player-caused effect with no actor;
- effect that declares a collision change;
- movement-only effect with no reduced-motion alternative.

Tests:

- every `PuzzleEventType` maps to a recipe or an explicit silent reason;
- every emitted event produces at least one cue;
- every critical state has a persistent element;
- projection goldens for each fixture;
- cue ordering, dedupe, priority, TTL, multi-step delivery;
- directional effects start at the named socket and respect direction/spread;
- A→B effect endpoints match resolved anchors and follow moving anchors;
- tile visuals apply and revert while collision state is unchanged;
- effect plans do not mutate simulation state;
- P1/P2 effect attribution does not cross;
- reduced motion changes effects but not state or text;
- **new-type test:** add a dummy type and verify it gets affordance, ack,
  progress, outcome, a persistent element, and a default effect without touching
  `ui/`, `world/`, or `audio/`.

## Consequences

**Easier:**

- New puzzle types inherit good feedback from capabilities.
- Feedback language stays consistent across puzzles.
- Coverage is enforceable at compile time, validation time, and test time.
- Unique mechanics still have an escape hatch via signals.
- Puzzle classes can define beats without defining UI.
- Directional, path, and tile effects are covered by the same capability table.

**Harder:**

- The capability set must be designed carefully.
- A genuinely novel interaction may need a new capability and one generic
  renderer.
- Descriptors are code, not content, so adding a type still requires an engine
  change.
- Effect presets need anchor/socket/tile validation.
- Content overrides must be validated against a closed vocabulary.

**Constrained:**

- No per-type UI components.
- No arbitrary feedback components from content.
- No arbitrary effect operators or path kinds from content.
- No raw engine state strings in the UI.
- No silent events.
- No effect may change collision or simulation state.
- No feedback without a label or reason where the player needs one.

## Alternatives considered

- **B only.** Maximum expressiveness, but no automatic coverage and easy drift.
  Rejected as the default.
- **Per-type presenters.** O(types × channels), violates the pure puzzle
  boundary. Rejected.
- **Fully authored feedback per node.** Consistent only if every author is
  disciplined; too much duplication and no defaults. Rejected.
- **No capability model.** Every type emits arbitrary surfaces; the ECS becomes
  a UI engine. Rejected.

## References

- [`0009-feedback-ecs-substrate.md`](0009-feedback-ecs-substrate.md)
- [`0010-anchored-feedback-surfaces.md`](0010-anchored-feedback-surfaces.md)
- [`0013-cosmetic-feedback-effects-accessibility.md`](0013-cosmetic-feedback-effects-accessibility.md)
- [`../../adr-m1.5/0034-puzzle-as-data-typed-dataflow.md`](../../adr-m1.5/0034-puzzle-as-data-typed-dataflow.md)
