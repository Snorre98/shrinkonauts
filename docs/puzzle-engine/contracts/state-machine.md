# State machine contract

Explicit states for gates, props, feedback surfaces/cues, effects, conversations,
and the deferred travel/conditional-link targets. Source ADRs: ADR-0002–0013.

Status labels:

- **Implemented** — present in the current code and covered by tests.
- **Deferred** — accepted target only; do not assume the transitions exist.

## 1. Gate state

The gate's logical state is owned by `PuzzleRuntime`. Physical body state is a
deferred ADR-0002 target; the current room renderer projects the logical gate
through feedback.

| State | Kind | Meaning | Status |
|---|---|---|---|
| `closed` | phase | logical gate closed | Implemented |
| `open` | phase | logical gate open | Implemented |
| body present/absent | phase | physical collision | Deferred |

| From | To | Trigger | Notes |
|---|---|---|---|
| `closed` | `open` | gate `open` applied / `elapsed` event | logical state |
| `open` | `closed` | gate `close` applied on a non-latched gate | logical state |
| `open` | `open` | close on latched gate | ignored |
| `closed` | `closed` | open on already open | ignored |

Invariants:

- A latched gate never closes.
- Gate state survives save/restore through `PuzzleRunState`.
- Gate closure never teleports players; physical overlap behavior is deferred.
- Feedback projects the current logical state persistently.

## 2. Prop lifecycle

| State | Kind | Meaning | Status |
|---|---|---|---|
| `free` | phase | dynamic/pickable | Implemented |
| `carried` | phase | constraint-held | Implemented |
| `placed` | phase | static at receptor/plate, retrievable | Implemented |
| `docked` | terminal | bound to receptor, reset-only | Implemented |
| `cleared` | terminal | hidden/non-collidable, reset-only | Implemented |
| `locked` | phase | visible/static/non-pickable | Deferred |

| From | To | Trigger | Notes | Status |
|---|---|---|---|---|
| (start) | `free` | initial state | current default | Implemented |
| (start) | `locked` | `initial: "locked"` | accepted target | Deferred |
| `locked` | `free` | `unlock` link | accepted target | Deferred |
| `free` | `carried` | pick up | | Implemented |
| `carried` | `free` | drop/throw | | Implemented |
| `carried` | `placed` | place on receptor | | Implemented |
| `placed` | `carried` | pick up | retrievable | Implemented |
| `placed` | `docked` | valid pulse bind | terminal | Implemented |
| any except `cleared` | `cleared` | `clear` link | hidden/non-collidable | Implemented |
| `docked` | `free` | reset | spawn | Implemented |
| `cleared` | `free` | reset | spawn | Implemented |

Invariants:

- `cleared` cannot be picked up; reset is the only recovery.
- `docked` cannot be picked up; reset is the only recovery.
- `clear` is not a fail state.
- A cleared prop has no body; out-of-bounds recovery does not apply.
- Save/restore preserves the exact state.

## 3. Feedback surface lifecycle

| State | Kind | Meaning |
|---|---|---|
| projected | phase | sticky surface rebuilt from puzzle state |
| runtime-owned | phase | conversation or stuck affordance inserted directly |
| removed | terminal | source state no longer projects the surface |

| From | To | Trigger | Notes |
|---|---|---|---|
| (none) | projected | `ProjectSticky` | stable ID `fb:<capability>:<sourceId>` |
| projected | projected | state change | same entity ID is upserted |
| projected | removed | source disappears/state no longer projects | effect instances cancelled |
| (none) | runtime-owned | `putSurface` | conversation/stuck surface |
| runtime-owned | removed | `removeSurface` or conversation close | effect instances cancelled |

Invariants:

- A surface has one stable ID, one owner, one anchor, and non-empty text or an
  accessibility alternative.
- Sticky surfaces never rely on a toast.
- Surface ordering is priority descending, then ID.
- A surface never owns gameplay truth; it only projects state.

## 4. Feedback cue lifecycle

| State | Kind | Meaning |
|---|---|---|
| queued | transient | fact ingested in the current tick |
| announced | transient | visible and eligible for the live region |
| coalesced | transient | same cause replaced by the newest/highest-priority cue |
| expired | terminal | TTL reached; entity despawned |

| From | To | Trigger | Notes |
|---|---|---|---|
| (none) | queued | `ingest`/`ingestAll` | cause key assigned |
| queued | announced | `IngestFacts`/`tick` | seq increments |
| announced | coalesced | same cause | highest priority/newest sequence wins |
| announced | expired | `LifetimeTick` | TTL in fixed ticks |
| announced | removed | `reset` or level transition | all feedback state cleared |

Invariants:

- Cue sequence is monotonic within a runtime.
- A cue is deduplicated by cause, not by text.
- Cues with a player actor carry actor attribution in text and accessibility.
- Cues expire; persistent state does not.

## 5. Effect lifetime

| State | Kind | Meaning |
|---|---|---|
| spawned | transient | resolved from a surface/cue `EffectPlan` |
| running | phase | age advances once per fixed tick |
| persistent | phase | lives until a cancellation policy fires |
| cancelled | terminal | source/target loss or owner removal |
| expired | terminal | one-shot stages reached their end tick |

| From | To | Trigger | Notes |
|---|---|---|---|
| (none) | spawned | `EffectSpawn` | plan signature deduped per owner |
| spawned | running | next tick | visible for at least one frame |
| running | expired | `effectEndTicks` reached | one-shot |
| running | persistent | persistent stage | cancellation policy required |
| persistent | cancelled | `onSourceInactive`/`onTargetGone`/`manual` | owner/source/target state |
| any | cancelled | owner surface removal/reset | no orphan effects |

Invariants:

- Effects never mutate puzzle, world, or collision state.
- Persistent effects always have a cancellation policy.
- Effects inherit `actor`, `owner`, and `accent`.
- Reduced motion simplifies or removes movement without changing surfaces/text.

## 6. Conversation session and ownership

| State | Kind | Meaning |
|---|---|---|
| active-linear | phase | one owner advancing a linear node |
| active-choice | phase | owner selecting a choice; owner movement frozen |
| acknowledgement | phase | free owner movement with max distance |
| closing | transient | dialogue completed or cancelled |
| missing-recovery | terminal | entity/dialogue missing on restore; recovery cue |

| From | To | Trigger | Notes |
|---|---|---|---|
| (none) | active-linear | interact with entity | `conversation:<owner>:<entity>` |
| active-linear | active-choice | choice node | `freeze-owner` |
| active-choice | active-linear | choice applied | effects applied |
| active-linear/choice | closing | final node/cancel | despawn surface |
| closing | (none) | surface removal | conversation removed from map |
| restore | missing-recovery | entity/dialogue missing | close with recovery cue |

Invariants:

- Multiple conversations may be active at once, one per owner/entity pair.
- Soft conversations do not enter a blocking game state.
- P1 and P2 route only their own conversations; shared surfaces accept either.
- A conversation is saved as a session snapshot; its ECS surface is recreated.
- Feedback ECS state is never saved.

## 7. Deferred travel and conditional links

### 7.1 Side-level travel (deferred)

The accepted target is `main → side → returning → main` with one `returnTo`
snapshot. The current runtime has no `travelToSideLevel` and saves no
`returnTo`.

### 7.2 Conditional link outcome (deferred)

| Condition | Target outcome |
|---|---|
| `requires` absent | normal application |
| `requires` active | normal application |
| `requires` inactive | skipped; `linkBlocked`; no target mutation |

A blocked link would not fire a second event, and a blocked pulse would consume
its cooldown. None of these fields/events exist in the current puzzle schema.
