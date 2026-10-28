# ADR-0011: Entity conversations replace the global dialogue overlay

Status: Proposed
Date: 2026-10-28
Deciders: Snorre
Related: ADR-0009, ADR-0010, ADR-0014, ADR-0043
Amends: the presentation side of ADR-0014; the dialogue data model is unchanged

## Context

Dialogue is currently a global game state and a single overlay:

- `GameState` includes `"dialogue"`;
- `GameRuntime` holds one `dialogueSession` and one `dialogueDocument`;
- `RuntimeSnapshot` has one `dialogue` view;
- the overlay traps focus and blocks all gameplay input.

That is incompatible with the co-op requirement. When P1 talks to an entity, P2
should not be forced into a modal, and the bubble should be attached to the
entity so it is obvious who is speaking and who triggered the conversation.

The `narrative` module already models dialogue as data and a session. The graph,
choices, effects, and conditions do not need to change. The presentation and
ownership do.

## Decision

### 1. Retire `dialogue` as a global game state and overlay

`narrative` remains the owner of dialogue graphs and sessions.

Entity conversations become feedback surfaces with a `Conversation` component:

```ts
interface Conversation {
  dialogueId: string;
  nodeId: string;
  owner: PlayerId;
  entityId: string;
  maxDistance?: number;
  freezeOwner: boolean;
}
```

`GameRuntime` holds:

```ts
conversations: Map<SurfaceId, DialogueSession>
```

not a single `dialogueSession`.

### 2. Conversation lifecycle

1. A player interacts with an entity.
2. The runtime creates a `speechBubble` surface anchored to that entity.
3. The surface gets a `Conversation` component bound to a `DialogueSession`.
4. The owner advances or chooses through the surface.
5. Dialogue effects are applied exactly as today.
6. When the dialogue ends, the surface is despawned. No modal appears.

Multiple conversations may be active at once, one per owner/entity pair. If both
players talk to the same entity, two surfaces are created with IDs keyed by
owner:

```text
conversation:p1:agent-muscle
conversation:p2:agent-muscle
```

### 3. Presentation

An entity conversation uses:

- `presentation: "speechBubble"`;
- `anchor: { kind: "entity", entityId }`;
- `owner: actor`;
- `audience: "both"` for local co-op;
- an owner chip and accent colour;
- choices rendered as buttons and driven by the owner's UI actions;
- `freeze-owner` by default for choice conversations;
- `free` plus `maxDistance` for acknowledgement bubbles.

The bubble follows the entity. If the entity moves or the camera scrolls, the
bubble stays anchored.

### 4. Input and state machine

- Soft conversations do not change the global game state.
- `GameState.dialogue` is removed.
- Blocking modes (`pause`, `map`, `conceptLog`, `debrief`, `complete`, `gate`)
  remain explicit states.
- Entity conversations are routed through the per-player surface input router
  from ADR-0010.
- P1 can answer while P2 keeps playing.
- If the owner cancels, the conversation closes and the entity remains
  available.

Free-text answers are not entity conversations. They remain in the debrief or
another hard surface with a real text field and focus management. Choice and
acknowledgement conversations are soft surfaces.

### 5. Runtime snapshot and UI callbacks

`RuntimeSnapshot.dialogue` is removed. Feedback surfaces are exposed through
`RuntimeSnapshot.feedback`.

The UI no longer has `renderDialogue` as a special overlay. It has a
`speechBubble` renderer in the generic surface renderer.

Callbacks become surface-scoped:

```ts
interface GameUiCallbacks {
  onSurfaceAction(surfaceId: string, action: SurfaceAction): void;
  // existing modal callbacks remain for gate/debrief/pause/map/log
}

type SurfaceAction =
  | { type: "confirm" }
  | { type: "cancel" }
  | { type: "choose"; choiceId: string };
```

`onAdvanceDialogue()` and `onChooseDialogue(choiceId)` are removed or become
thin adapters during migration; the target contract is surface-scoped.

### 6. Save and restore

Conversation progress is run state, not feedback ECS state. The save gains an
optional conversation list:

```ts
interface ConversationSnapshot {
  surfaceId: string;
  dialogueId: string;
  nodeId: string;
  owner: PlayerId;
  entityId: string;
}
```

`RunSnapshot.conversations?: ConversationSnapshot[]`.

On restore:

- recreate one conversation surface per snapshot;
- rebuild the `DialogueSession`;
- if `maxDistance` is exceeded or the entity is missing, close the conversation
  and emit a recovery cue;
- old saves with a single `dialogue` field migrate to one P1-owned conversation;
- feedback ECS entities themselves are never serialized.

### 7. Gates and other blocking UI

Entity conversations replace the global dialogue overlay, not every blocking
surface.

- Concept gates may remain `modal` or become `anchoredPanel` later.
- Debrief, pause, map, and concept log remain explicit modal/blocking states.
- The surface model supports `anchoredPanel`; using it for a gate is a separate
  decision.

## Consequences

**Easier:**

- Co-op conversations are natural and attributable.
- Two players can talk to different entities at once.
- The dialogue graph/session code is reused unchanged.
- Entity bubbles can contain choices without a modal.
- The UI gains one generic surface renderer instead of a dialogue special case.

**Harder:**

- Multiple dialogue sessions must be tracked.
- Input routing must distinguish owners.
- Save/restore must recreate conversation surfaces.
- The old `dialogue` state and UI paths must be removed, not left as parallel
  paths.
- Conversation close rules need explicit policy (`cancel`, distance, entity
  removal).

**Constrained:**

- No global `dialogue` state.
- No single global dialogue session.
- No focus-trapping modal for entity conversations.
- No world-space free-text input.
- No duplicate dialogue path alongside the surface path.

## Alternatives considered

- **Keep the global modal but prefix it with P1/P2.** Still one shared position,
  still blocks the other player, still ambiguous. Rejected.
- **Per-player full-screen dialogue overlays.** Obscures the shared camera and
  breaks co-op. Rejected.
- **Render dialogue in Phaser.** Worse text, choices, and accessibility.
  Rejected.
- **Keep `dialogue` state and add bubbles as a second path.** Two systems with
  different input and save rules. Rejected.

## References

- [`0009-feedback-ecs-substrate.md`](0009-feedback-ecs-substrate.md)
- [`0010-anchored-feedback-surfaces.md`](0010-anchored-feedback-surfaces.md)
- [`../../shrinkonauts/base-game/adr/0014-dialogue-as-data.md`](../../shrinkonauts/base-game/adr/0014-dialogue-as-data.md)
- [`../../adr-m1.5/0043-puzzle-feedback-hints-cooldown.md`](../../adr-m1.5/0043-puzzle-feedback-hints-cooldown.md)
