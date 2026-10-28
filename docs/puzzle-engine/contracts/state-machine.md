# State machine contract

Explicit states for gate bodies, prop lifecycle, and side-level travel. Source
ADRs: ADR-0002, ADR-0004, ADR-0007.

## 1. Gate state

The gate's **logical** state is owned by `PuzzleRuntime`; its **body** state is
derived in `RoomPhysics`.

| State | Kind | Meaning |
|---|---|---|
| `closed` | phase | body present and collidable |
| `open` | phase | body absent and passable |

| From | To | Trigger | Notes |
|---|---|---|---|
| `closed` | `open` | gate `open` applied / `elapsed` event | body removed |
| `open` | `closed` | gate `close` applied on a non-latched gate | body added |
| `open` | `open` | close on latched gate | ignored |
| `closed` | `closed` | open on already open | ignored |

Invariants:

- A gate with no authored `components.body` has no body, but its logical state
  is still readable.
- A latched gate never closes.
- Gate state survives save/restore through `PuzzleRunState`.
- Gate closure does not teleport players; Matter resolves overlap.

## 2. Prop lifecycle

| State | Kind | Meaning |
|---|---|---|
| `locked` | phase | visible/static/non-pickable |
| `free` | phase | dynamic/pickable |
| `carried` | phase | constraint-held |
| `placed` | phase | static at receptor/plate, retrievable |
| `docked` | terminal | bound to receptor, reset-only |
| `cleared` | terminal | hidden/non-collidable, reset-only |

| From | To | Trigger | Notes |
|---|---|---|---|
| (start) | `free` | `initial` absent or `free` | default |
| (start) | `locked` | `initial: "locked"` | applied on level entry |
| `locked` | `free` | `unlock` link | becomes dynamic |
| `free` | `carried` | pick up | |
| `carried` | `free` | drop/throw | |
| `carried` | `placed` | place on receptor | |
| `placed` | `carried` | pick up | retrievable |
| `placed` | `docked` | valid pulse bind | terminal |
| any except `cleared` | `cleared` | `clear` link | hidden/non-collidable |
| `docked` | `free` | reset | spawn + initial |
| `cleared` | `free`/`locked` | reset | spawn + initial |
| `free` | `free` | unlock when not locked | no-op |
| `cleared` | `cleared` | clear again | no-op |

Invariants:

- `locked` and `cleared` cannot be picked up.
- `docked` cannot be picked up; reset is the only recovery.
- `clear` is not a fail state; reset recovers.
- A cleared prop has no body; out-of-bounds recovery does not apply.
- Save/restore preserves the exact state.

## 3. Side-level travel

| State | Kind | Meaning |
|---|---|---|
| `main` | phase | current level is main; travel allowed |
| `side` | phase | current level is side; travel disabled |
| `returning` | transient | restoring the main snapshot |

| From | To | Trigger | Notes |
|---|---|---|---|
| `main` | `side` | `travelToSideLevel(sideId)` | capture `returnTo`, enter side fresh |
| `side` | `returning` | side debrief finish | restore snapshot |
| `returning` | `main` | restore complete | clear `returnTo`, autosave |
| `main` | `main` | invalid travel | no state change; reason surfaced |
| `side` | `side` | travel attempt | rejected; finish/return first |

Invariants:

- At most one `returnTo` exists.
- `returnTo` is absent in `main`.
- A side level never records `pack_completed`.
- A side level cannot chain another side excursion.
- Global progression/curriculum events are never rolled back by return.

## 4. Conditional link outcome

| Condition | Link outcome |
|---|---|
| `requires` absent | normal application |
| `requires` active | normal application |
| `requires` inactive | skipped; `linkBlocked` emitted; no target mutation |

Invariants:

- A blocked link does not fire a second event for the same occurrence.
- A blocked pulse consumes its cooldown.
- Authored `message` is surfaced through the feedback layer (toast adapter until
  Phase 4), not evidence.
