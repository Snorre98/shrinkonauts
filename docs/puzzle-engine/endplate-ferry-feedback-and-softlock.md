# Endplate Ferry — feedback gaps and softlock analysis

**Date:** 2026-10-28
**Level:** `04-muscle-effector` (`puzzle-endplate-ferry`)
**Pack:** `anatomy-reflex` v0.3.0
**Reported state:** packet bound, `Endplate Ferry` in the HUD without ✓, player unable to finish
**Recovery used:** refresh / reset puzzle state, then complete the intended order

> **Resolution status (2026-10-28):** the engine defects in §2.3 are fixed in
> commit `464ca63`. This document preserves the pre-fix analysis and fix plan;
> see §2.8 for the frozen baseline and current behaviour. The remaining work in
> this document is feedback presentation, tracked in M1.75 Phases 4–7.

This document covers two things:

1. The feedback graphics that would have made the puzzle legible while it was working normally.
2. The softlock that was actually hit, its root causes, and a fix plan that addresses the class of bugs rather than only this instance.

---

## 1. Feedback graphics

### 1.1 What the player gets today

| Channel | Current behaviour |
| --- | --- |
| HUD meta | `Objectives: OBJ-2 · co-op · Endplate Ferry` and `Endplate Ferry ✓` only on solve (`src/ui/game-ui.ts`, `updateHud`) |
| HUD abilities | Player ability lists, `(carrying)` marker, pulse cooldown seconds (`Pulse: 1.2s` / `Pulse: ready`) |
| Hints | Authored hints in the pause menu and a persistent hint row after use |
| Toasts | 3-second toasts (`TOAST_SECONDS = 3`) for pulse sent, packet picked up, packet placed, receptor bind, receptor rejection, “Signal restored”, etc. |
| Audio | `scan`, `unlock`, `wrong`, `gate`, `checkpoint`, `debrief`, `boot`, `dialogue`, `map` cues |
| Scene | Static placeholder sprites only. Plate/zone sensor rectangles are not rendered; puzzle gates are not animated; the AChE clear has no prop-clear action |

`RuntimeSnapshot.puzzle` (`src/ui/model.ts`) exposes only:

```ts
id, title, solved, canReset, tether, counters, hint, canHint, pulse
```

There is no node state, no timer remaining time, and no one-shot event stream, so the renderer currently cannot draw plate, timer, gate, receptor or clearance feedback even if the sprites existed.

### 1.2 Missing feedback by puzzle beat

| Beat | Current feedback | Desired feedback |
| --- | --- | --- |
| Terminal plate press | None (sensor invisible) | Plate depresses/glows on contact; a **72-tick radial or bar** labelled “Ca²⁺ window” drains to zero |
| Ca²⁺ timer running | None | Timer ring/bar above the plate or gate; colour shift as it completes |
| Ca²⁺ gate opening | None (logic only, no animation, no collision) | Visible bridge/beam that opens with a Ca²⁺ particle burst; red → green state; shimmer while the window is running |
| Pulse fire | “Signal pulse sent” toast, cooldown text | Cooldown ring on the terminal; muzzle/charge animation |
| Pulse travel | None | Traveling orb/wave across the cleft (6 ticks) with a trail |
| Pulse impact | Rejection toast only when a mismatched packet is on a socket | Impact flash on every receptor; faint neutral ripple for an empty socket |
| Receptor empty | Intentionally suppressed | “Pulse reached an empty receptor” ripple, distinct from rejection |
| Receptor wrong shape | “The receptor rejects that shape” toast | Socket shakes, red outline, packet bounces back, packet highlighted as retrievable |
| Receptor occupied (unbound) | Only the “placed in the receptor” toast | Dim socket fill/glow, clearly different from bound |
| Receptor bound | “ACh packet locks into the matching receptor” toast | Bright lock ring, snap animation, click |
| ACh packet carry | `(carrying)` text | Outline/glow, drop shadow, socket highlight when in range, snap on placement |
| AChE clearance | Text only; the packet sprite never clears | Packet fade/dissolve, enzyme sweep, “ACh cleared — signal ends” for ~2 s |
| Muscle gate / lever / exit | None | Gate opens with a burst, lever visibly pulls, muscle contraction wave, exit arrow lights, map node pings |
| Puzzle progress | Final ✓ only | Persistent step tracker (Trigger → Plate → ACh → Receptor → Pulse) or per-node state icons |
| Failure states | Toast only | Explicit icons for “window closed”, “empty receptor”, “wrong socket”, “pulse recharging” attached to the relevant entity |

### 1.3 Implementation approach

1. **Expose node state to the renderer.** Extend `PuzzleView` with something like:

   ```ts
   nodes: Record<string, {
     type: PuzzleNode["type"];
     state: string;
     active: boolean;
     remaining: number;
     occupiedBy: string | null;
   }>;
   ```

   Or add a dedicated `feedback` view so the UI does not depend on raw engine states.

2. **Publish one-shot events.** `handlePuzzleEvents` already receives `platePress`, `plateRelease`, `timerElapsed`, `gateOpen`, `gateClose`, `receptorBound`, `receptorRejected`, `pulseFired`/`pulseArrived`. Forward them to the room scene (event bus or a one-frame `effects` array in the snapshot) so animations do not have to be inferred from state diffs.

3. **Render sensor rectangles.** Draw the plate/zone rects (or a sprite aligned to them) so the interaction area is visible. The level README explicitly records that this is missing.

4. **Make the Ca²⁺ window persistent.** The single highest-value addition: a timer ring/bar plus open/closed state. It directly addresses the confusion that produced this report.

5. **Persistent vs transient feedback.** Use toasts for events, but keep critical state (window, socket occupancy, gate state, step progress) visible continuously.

6. **Accessibility.** Respect the existing reduced-motion setting; pair every animation with a text/shape cue; keep colour-blind-safe distinctions (shape + label, not red/green alone).

### 1.4 Priority order

1. Ca²⁺ timer ring + gate open/closed state.
2. Plate press animation and visible sensor area.
3. Pulse travel/impact and cooldown ring.
4. Receptor occupied vs bound, wrong-socket bounce.
5. AChE dissolve/clear.
6. Muscle gate/lever/exit consequence.
7. Step tracker and failure-state icons.

---

## 2. The softlock

### 2.1 Observed state

Browser console:

```js
const rt = __shrinkonauts.runtime;
for (const [id, p] of rt.puzzles) {
  console.log(id, {
    solved: p.isSolved(),
    caTimer: p.nodeState("ca-timer"),
    caGate: p.nodeState("ca-gate"),
    receptor: p.nodeState("nicotinic-receptor"),
    muscleGate: p.nodeState("muscle-gate"),
    packet: p.nodeState("ach-packet"),
  });
}
```

Result:

```text
puzzle-endplate-ferry
  solved: false
  caTimer:    { state: "elapsed", active: true,  remaining: 0 }
  caGate:     { state: "closed",  active: false }
  receptor:   { state: "bound",   active: true,  occupiedBy: "ach-packet" }
  muscleGate: { state: "closed",  active: false }
  packet:     { state: "docked",  active: true }
```

The puzzle is unsolvable from this state:

- `ca-timer` is `elapsed`, and `applyTimerAction` refuses to start a timer that is already `elapsed`, so a plate press does nothing.
- `ache-timer` is `elapsed` and stays `active`, so `evaluateGates` force-closes `ca-gate` every tick.
- `response-relay` requires `ca-gate.active && receptor.active`; the receptor is bound, but the gate can never stay open.
- `muscle-gate` is non-latched until it opens, so the win predicate never becomes true.

### 2.2 Reproduction

The deadlock is reachable through ordinary play. A deterministic sequence produced by a seeded search against the real `PuzzleRuntime`:

```text
t=  8  plate pressed, packet in        -> ca timer running
t= 10  pulse fired, packet in
t= 12  packet removed (picked up)
t= 16  pulse arrives at empty receptor -> AChE timer starts (bug)
t= 80  ca timer elapsed                -> ca gate opens; receptor empty, no solve
t=166  AChE elapsed                    -> resets ca timer to idle, closes gate
t=181  plate released                  -> start link fires on release (bug), timer runs
t=253  ca timer elapsed                -> AChE active, gate closed again
t=269  pulse with packet placed        -> receptor binds, but gate is closed
       final: timer=elapsed gate=closed receptor=bound muscle=closed solved=false
```

Randomized search geometry: 4000 runs × 400 ticks, action alphabet `{plate on/off, packet placed/free, pulse}`; the target state was found in run 6. This confirms it is not an exotic hand-crafted state.

### 2.3 Root causes

#### Bug 1 — links are dispatched by source only, not by event type

`src/puzzle/runtime.ts`, `drainEvents` (around lines 523–544):

```ts
for (const link of this.document.links) {
  if (link.from !== event.nodeId) continue;
  if (EVENT_EXCLUDED.has(link.type)) continue;
  this.applyLink(link, events);
}
```

The event type is never compared with the link type. Every outgoing link whose type is not in `EVENT_EXCLUDED` fires for *any* event from that node.

Consequences:

- `receptorRejected` fires the `bind` link → **pulsing an empty or wrong receptor starts the AChE timer**.
- `plateRelease` fires the `start` link → **stepping off the terminal plate starts the timer**.
- The same pattern will affect any future link added to a node.

#### Bug 2 — an elapsed timer can never be restarted

`src/puzzle/runtime.ts`, `applyTimerAction` (around lines 582–606):

```ts
if (state.state === "running" || state.state === "elapsed") {
  return;
}
```

Only `running` should block a re-start. Blocking `elapsed` means that after a one-shot reset (AChE) and a subsequent completion, a plate press is ignored forever.

#### Bug 3 — gate open/close semantics are asymmetric

`public/packs/anatomy-reflex/levels/04-muscle-effector/puzzle.json`:

```json
{ "from": "ca-timer",   "to": "ca-gate", "type": "elapsed" },
{ "from": "ache-timer", "to": "ca-gate", "type": "close" }
```

- Open is an **edge**: the `timerElapsed` event applies the `elapsed` link once.
- Close is **level-triggered**: `evaluateGates` checks `ache-timer.active` every tick.
- `ache-timer` is `repeat: false` and remains `active: true` after it elapses.

So AChE can force the gate closed indefinitely, while reopening depends on an edge that can no longer fire.

### 2.4 Why this is a class of bugs, not one bug

The engine allows a link's action to run on events that have nothing to do with it (Bug 1), and it has no restart/recovery invariant for one-shot timers (Bug 2), and it mixes edge- and level-triggered gate sources (Bug 3). Any puzzle that combines a plate or zone, a one-shot timer, a receptor and a gate can produce the same dead state. The fix must therefore cover dispatch semantics, timer restart rules, and an automated recoverability check.

### 2.5 Fix plan

#### Fix 1 — explicit event → link dispatch table (core fix) — **done**

Replace the `EVENT_EXCLUDED` filter with an explicit mapping, for example:

| Event | Link types allowed to fire |
| --- | --- |
| `platePress` | `press`, `start` |
| `plateRelease` | `release`, `stop` |
| `zoneEnter` | `enter`, `start` |
| `zoneExit` | `exit`, `stop` |
| `timerElapsed` | `elapsed`, `reset` |
| `counterReached` | `reached` |
| `triggerFired` | `increment`, `start` |
| `receptorBound` | `bind` |
| `receptorRejected` | *(none by default)* |
| `relayActive` / `relayInactive` | *(none; gates are evaluated from link sources)* |
| `gateOpen` / `gateClose` | *(none)* |

Notes:

- `pulse`, `activate`, `deactivate`, `open`, `close` are not event-driven and stay out of the table.
- Node Run uses `input-a:press->input-a-trigger` and `input-b:press->input-b-trigger`; after the change they fire on press only, which is the intended semantics.
- Keep the mapping in one place and derive it from `PuzzleEvent["type"]` so a new event type forces an explicit decision.

#### Fix 2 — allow restart from `elapsed` and `stopped` — **done**

```ts
if (state.state === "running") return;
```

This is the recovery invariant: a plate press must always be able to re-arm the Ca²⁺ window.

#### Fix 3 — make the Ca²⁺ gate open level-triggered — **done**

Prefer the content change:

```json
{ "from": "ca-timer", "to": "ca-gate", "type": "open" }
```

`evaluateGates` already evaluates `open` before `close`, so:

- while the Ca timer is elapsed → gate open;
- AChE's `reset` link puts the timer back to `idle` → gate closes (the intended clearance beat);
- if the player presses the plate again, the timer runs and reopens the gate, and AChE can no longer keep it shut.

Alternative engine-level change: make `evaluateGates` treat `elapsed` links as open sources. The content change is smaller and testable; the engine change is more general but blurs link semantics.

#### Fix 4 — do not let AChE close a prerequisite before the response — **retained, open-first**

Two options were considered:

- Treat AChE clearance as visual-only until conditional links (ADR-0005) exist; remove the `close` link.
- Keep the close link but condition it on `muscle-gate` being open (requires conditional links).

Resolution for M1.75: keep the close link. `evaluateGates` checks `open` before
`close`, so an elapsed Ca²⁺ timer always wins and AChE cannot hold the gate shut.
After AChE resets the Ca²⁺ timer, the gate closes as the intended clearance beat;
the next plate press reopens it. Conditional closure remains out of scope.

#### Fix 5 — regression tests — **done**

Add to `tests/endplate-ferry.test.ts`:

1. Pulsing an empty receptor does **not** start `ache-timer`.
2. Pulsing the wrong receptor with a mismatched packet does **not** start `ache-timer`.
3. `plateRelease` does not start `ca-timer`.
4. `bind → AChE elapsed → plate press` solves.
5. Existing: `bind → wait AChE → plate press` solves.
6. Existing: `plate → elapsed → place → pulse` solves.

Add a unit test for dispatch:

- for each event type, only the allowed link types apply (table-driven).

#### Fix 6 — recoverability property test (class-level guard) — **done as stable-state BFS**

Enumerate reachable states with `PuzzleRuntime.snapshot()` / `restore()` over a small action alphabet:

- plate/zone occupied on/off for each plate/zone node;
- prop free/placed on each receptor;
- pulse attempt.

Assert that every reachable unsolved **stable decision state** has a path to
`solved: true`. Apply one action, settle timers/pulses/cooldowns, deduplicate by
node state, counter counts, in-flight pulses, and world placement, then run
reverse reachability from solved transitions. Cap the state count; a cap hit is
inconclusive, not a pass. The landed guard lives in `tests/helpers/recoverability.ts`
and `tests/recoverability.test.ts`.

#### Fix 7 — static validation in `pack:validate` — **done**

Warn when a non-latched gate has:

- an edge-triggered open source (`elapsed` link), and
- a level-triggered close source whose source node can stay active (non-repeating timer),

because that gate can close before it can reopen. Also warn on `bind` links whose source can emit `receptorRejected`.

#### Fix 8 — UX safety net — **deferred to M1.75 Phase 4.6**

If the active puzzle is unsolved and no node state changes for ~10 seconds while the player is in the room, surface “Show hint / Reset puzzle” inline. Pause already has both, but the reset button was easy to miss, and refreshing the page should not be the recovery path.

Optional follow-up: put the reset control in the HUD while a puzzle is active, and log a `puzzle_stuck` diagnostic event (counters already track `resets`).

### 2.6 Verification checklist

- [x] `npm test` — dispatch, timer, gate, and stable-state reachability tests pass.
- [x] `npm run pack:validate` — static gate-recovery warning does not fire for `puzzle-endplate-ferry`.
- [x] `npm run pack:smoke` — full loop.
- [x] `npm run smoke:e2e` — browser flow still passes.
- [x] Re-run the stable-state reachability search; no reachable dead state.
- [ ] Manual: pulse an empty receptor, step off the plate, wait past AChE, then complete via plate → place → pulse.

### 2.7 Suggested commit breakdown

1. `fix(puzzle): dispatch links by event type` + tests. **Landed.**
2. `fix(puzzle): allow restarting elapsed and stopped timers` + tests. **Landed.**
3. `fix(pack): open the Ca gate from the timer state` + softlock regression test. **Landed.**
4. `test(puzzle): exhaustively enumerate stable reachability`. **Landed.**
5. `feat(ui): expose puzzle node state and effects` (feedback graphics; M1.75 Phases 4–7).

### 2.8 Resolution baseline

- **Commit:** `464ca63` fixes event→link dispatch, restartable one-shot timers,
  and the level-triggered Ca²⁺ gate open.
- **Historical dead state:** seeded in `tests/endplate-ferry.test.ts`
  (“recovers from the reported dead state by re-arming the Ca²⁺ window”).
- **Reported sequence:** replayed headlessly; the current engine reaches
  `solved: true`. Natural reproduction of the pre-fix deadlock now requires
  reverting `464ca63`.
- **AChE:** the `close` link is retained. `evaluateGates` checks `open` before
  `close`, so AChE cannot hold the gate shut while the Ca²⁺ timer is elapsed.
- **Baseline commands:** `npm test`, `npm run pack:validate`,
  `npm run pack:smoke`, `npm run smoke:e2e`, `npm run build`, and
  `git diff --check` pass.
- **Remaining:** the visual/feedback gaps in §1 are tracked by M1.75 Phases 4–7.

---

## 3. One-paragraph summary

The level was solvable, but three engine defects combined to produce a permanent dead state: links fired on unrelated events (empty-receptor pulses started the AChE timer; plate releases restarted the Ca timer), an elapsed timer could never be restarted, and the Ca gate opened on an edge while AChE closed it every tick forever. A player could reach that state by pulsing before placing the packet and moving on and off the plate. The fix is an explicit event→link dispatch table, restartable one-shot timers, a level-triggered Ca gate open, regression tests for the exact sequence, and an exhaustive stable-state reachability test across all puzzles. Separately, the puzzle still lacks most visual feedback: the plate, Ca timer, gate, pulse travel, socket states and AChE clear are invisible; a persistent Ca²⁺ window indicator and node-state-driven animations would make the correct sequence obvious and the failure legible.
