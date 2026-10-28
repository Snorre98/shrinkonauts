# Failure semantics contract

How the upgrade behaves when a condition, prop, gate, prompt, travel target, or
save path is invalid. Source ADRs: ADR-0002, ADR-0004, ADR-0005, ADR-0006,
ADR-0007, ADR-0008.

## 1. Retry policy and backoff

This is a local, fixed-step game, not a networked service. “Retries” are player
actions after feedback; there is no automatic background retry.

| Failure class | Player-visible result | Retry |
|---|---|---|
| Blocked conditional link | Authored feedback message; no state change | Player repeats the action after meeting the condition |
| Blocked pulse | No bind; normal cooldown | Wait for cooldown, pulse again |
| Closed physical gate | Movement is blocked by collision | Open the gate or use reset |
| Locked prop | Pickup rejected; “locked” state remains | Unlock it, or reset |
| Cleared prop | Hidden; cannot be picked up | Reset restores the initial state |
| Invalid map travel | Map explains why; state unchanged | Choose an eligible level or return |
| Missing side return snapshot | Toast; remain in side/complete fallback | Restart/return via save recovery |
| Schema validation error | Pack fails validation before boot | Fix JSON |
| Save format/version error | Existing ADR-0045 recovery path | Reload at checkpoint or new run |

## 2. Blocked links

- A link with `requires` inactive is not applied.
- `linkBlocked` is emitted once per trigger occurrence.
- If `message` is authored, `GameRuntime` emits a feedback fact; until Phase 4
  the existing toast adapter displays it. ADR-0009 and ADR-0010 define the
  target surface transport.
- The blocked link does not emit a normal target event, counter increment, gate
  open, timer start, or receptor bind.
- A blocked pulse is consumed; the cooldown starts as normal.

## 3. Gate body failures

| Failure | Behavior |
|---|---|
| `puzzleGate` without `components.body` | No collision; logical gate state still applies |
| Invalid body dimensions | `GATE_BODY_INVALID` at pack validation; pack does not boot |
| Gate entity missing for a gate node | `PUZZLE_REFERENCE_MISSING` at validation |
| Player overlaps a closing gate | Matter resolves the overlap; no teleport, no fail state |
| Gate body not added on restore | `GameRuntime` synchronizes from puzzle state after restore |

## 4. Prop lifecycle failures

| Failure | Behavior |
|---|---|
| Pickup of `locked`/`cleared` | Rejected; state unchanged |
| `unlock` on non-locked | No-op; no event |
| `clear` twice | No-op; no duplicate event |
| Clear a docked prop | Allowed; reset restores initial state |
| Cleared prop out of bounds | No body; recovery not applicable |
| Missing prop entity | `PUZZLE_REFERENCE_MISSING` at validation |
| Old save with old state | Loads; new states default off |

## 5. Debrief prompt failures

| Failure | Behavior |
|---|---|
| No `debrief` override | Syllabus-derived prompt fallback |
| Prompt objective not in level | `LEVEL_DEBRIEF_OBJECTIVE` |
| Duplicate prompt ID | `LEVEL_DEBRIEF_DUPLICATE` |
| Required prompt has no evidence rule | `LEVEL_DEBRIEF_EVIDENCE` |
| Empty answer | `finishDebrief` refuses; toast; no evidence loss |
| 03 answer in 04 | Cleared on level entry; 04 must answer its own prompt |

## 6. Side-travel failures

| Failure | Behavior |
|---|---|
| Target missing/not authored | Travel returns false; no state change |
| Target not `side` | Rejected; map reason |
| Target not revealed | Rejected; map reason |
| Current level is side | Rejected; finish/return first |
| `returnTo` already set | Rejected; one excursion at a time |
| Missing/invalid `returnTo` on side finish | Toast; fall back to the current level or complete menu; evidence preserved |
| Save in side | `returnTo` saved and restored; finish returns |
| Pack completion during side | Not possible; side levels never record `pack_completed` |

## 7. Error surfacing to the caller

| Outcome | Caller-visible result |
|---|---|
| Invalid content | Pack validation error with code and path; no boot |
| Invalid travel | Map reason string; no state change |
| Blocked link | Authored feedback message |
| Blocked pulse | Cooldown HUD + feedback cue |
| Missing save field | Default; load continues |
| Corrupt save | Existing ADR-0045 recovery |
| Renderer rebuild failure | Existing fatal error overlay |

## 8. Invariants

- No blocked action removes evidence, health, or a prop permanently.
- No failure closes the main exit or revokes a solved gate.
- Reset is always available before a solve.
- Save/restore never loses global evidence.
- Invalid content is rejected before runtime; invalid runtime actions degrade
  with feedback, not a dead run.
