# Mechanics and evidence

**Status:** design proposal, 2026-10-27
**Purpose:** show that the six room puzzles fit the accepted M1.5 contract, and
state what evidence each room produces.
**Companion:** [`anatomy-fidelity.md`](anatomy-fidelity.md) · [`README.md`](README.md)

## 1. Authority

The implementation contract is the accepted M1.5 set:

- [`../../m1.5/authoring.md`](../../m1.5/authoring.md)
- ADR-0034 — puzzle as a typed dataflow document
- ADR-0035 — body + prop model
- ADR-0036 — Matter.js boundary
- ADR-0037 — per-player abilities and solo union
- ADR-0038 — puzzle-scoped tether
- ADR-0039 — puzzle as the assessment source
- ADR-0040 — dynamic prop state and softlock contract
- ADR-0041 — save schema v2
- ADR-0042 — activation lifecycle
- ADR-0043 — hints and pulse cooldown
- ADR-0044 — hazard sensors and checkpoint respawn
- ADR-0045 — recoverable save-version mismatch

The older `architecture.md` and `pack-schema.md` gate descriptions are not the
authority for the M2 puzzles where they conflict with M1.5. In particular,
ADR-0039 replaces the 03 quiz door with a spatial puzzle plus debrief, and
ADR-0036 supersedes the older "no physics-dependent puzzle solutions" sentence.

## 2. M1.5 vocabulary used

### 2.1 Nodes

| Node | Use in this package |
|---|---|
| `prop` | Myelin sheaths, sensory signal token, ACh packet, motor token, route plug |
| `receptor` | Nicotinic receptor in 04; optional lesion socket in 05 if a spatial variant is used |
| `pulseSource` | Motor-terminal pulse in 04; optional visual cue elsewhere |
| `plate` | Axon gaps, input plates, brace/tap plates, spinal/muscle plates, sensor pad, sockets |
| `zone` | Entry/exit zones, one-way checkpoint, route gates, optional occupancy checks |
| `relay` | Threshold completion, myelin completion, joint alignment, controller integration |
| `gate` | Physical locks and feedback doors |
| `timer` | Conduction window, Ca²⁺ window, brain-later delay, CPU wake delay |
| `counter` | Threshold input count |
| `trigger` | One-shot events for feedback, resets, and timers |

### 2.2 Links

| Link | Valid source → target | Use |
|---|---|---|
| `pulse` | `pulseSource` → `receptor` | 04 terminal-to-receptor binding |
| `bind` | `receptor` → gate/relay/timer/counter/trigger | 04 receptor opens muscle gate |
| `press` | `plate` → gate/relay/timer/counter/trigger | 01/02/03/05 plate events |
| `enter` | `zone`/`trigger` → gate/relay/timer/counter/trigger | Route and one-way events |
| `exit` | `zone` → gate/relay/timer/counter/trigger | Optional exit feedback |
| `increment` | plate/zone/trigger/receptor/timer/counter/relay → counter | 03 threshold count |
| `start` | plate/zone/trigger/receptor/timer/counter/relay → timer | Conduction, Ca²⁺, brain, CPU windows |
| `stop` / `reset` | same as `start` → timer; `reset` also counter | Retry and reset |
| `elapsed` | `timer` → gate/relay/counter/trigger | Timed gates |
| `reached` | `counter` → gate/relay/trigger | 03 threshold gate |
| `activate` / `deactivate` | any → relay | Boolean relay inputs |
| `open` / `close` | any → gate | Gate state links |

**Relay note:** M1.5 relays combine `activate`/`deactivate` links only. A plate
does not feed a relay with `press`; use `plate → relay: activate`. The references
below follow that rule.

**Plate vs receptor note:** the `place` solution action targets a `receptor`
socket, not a `plate`. Plate sockets in 01, 02, 05, and Silicon detect a prop
that is dropped or pushed into their rect; set `countCarried: false` so a carried
prop does not count before release. Only 04's nicotinic receptor uses the
`place` action. Author plate sockets as shallow, stable recesses and use a
fixed-rotation prop for the myelin, sensory, motor, and route tokens; playtest
that a dropped token does not bounce or roll out.

### 2.3 Win predicates

`gateOpen`, `receptorBound`, `platePressed`, `relayActive`, `timerElapsed`,
`counterReached`, `zoneOccupied`, `propState`, `flagSet`, and `allOf`/`anyOf`/
`not`. Every room below uses `gateOpen` or a small `allOf` of already-solved
states; no new predicate is needed.

## 3. Activation, tether, and room limits

| Room | Activation | Tether | Why |
|---|---|---|---|
| 01 Sheath Gate | `interact` at a repair terminal | `off` | Optional side puzzle; one-screen repair bay |
| 02 Stretch Gate | `interact` at the joint console | `off` | Optional side puzzle; knee + dorsal-root bay |
| 03 Node Run | `roomStart` | `off` | Required main puzzle; one-screen axon |
| 04 Endplate Ferry | `interact` at the motor terminal | `off` | Required main puzzle; one-screen cleft |
| 05 Reflex Core | `interact` at the patellar ligament | `stretch` | Required core; knee, spinal cord, and brain side route |
| Silicon Interrupt Loop | `interact` at the sensor console | `off` | Transfer fixture; one-screen board |

No room needs two simultaneously active puzzles. That avoids the M1.5
single-visible-puzzle and single-tether-policy limits. The optional 05 Lesion
Console is a **concept gate**, not a second spatial puzzle; it can run after the
core puzzle is solved.

`off` must pass the M1.5 1280 × 720 geometry guard. If 05 does not fit, it uses
`stretch`; no new policy is introduced. If 01/02 side puzzles are placed in
rooms with other puzzle content, they must still be the only active puzzle in
that room at a time.

## 4. Per-room M1.5 fit

The graphs below are reference shapes, not implementation JSON. Entity IDs and
pixel coordinates are deliberately not fixed; room authoring will supply them.

### 4.1 01 Sheath Gate

**Intended flow:** the player aligns the joint-independent repair bay, places
three myelin sheaths on exposed gaps before the conduction window closes, and
opens the gate. The signal travels dendrite → terminal.

Reference nodes:

- `myelin-a`, `myelin-b`, `myelin-c` — `prop`
- `gap-a`, `gap-b`, `gap-c` — `plate`, `detects: ["prop"]`, `minimum: 1`
- `dendrite-plate` — `plate`, `detects: ["player"]`
- `signal-trigger` — `trigger`, `once: true`
- `conduction-timer` — `timer`, duration for the repair window
- `myelin-relay` — `relay`, `allOf`
- `window-relay` — `relay`, `not`
- `complete-relay` — `relay`, `allOf`
- `gate-sheath` — `gate`, `initial: "closed"`, `latched: true`

Reference links:

- each gap plate → `myelin-relay`: `activate`
- `dendrite-plate` → `conduction-timer`: `start`
- `dendrite-plate` → `signal-trigger`: `press` (latch that the signal started)
- `signal-trigger` → `complete-relay`: `activate`
- `conduction-timer` → `window-relay`: `activate`
- `myelin-relay` → `complete-relay`: `activate`
- `window-relay` → `complete-relay`: `activate`
- `complete-relay` → `gate-sheath`: `open`

Win: `gateOpen gate-sheath`.

The `not` relay is active while the timer has not elapsed. Completing all three
myelin plates before the window closes makes `complete-relay` active and opens
the latched gate. The signal trigger prevents a player from pre-wrapping the
axon and opening the gate without starting a signal. If the window closes first,
the gate stays closed; the puzzle resets the timer/counter and the props remain
recoverable. This is a pacing window, not a measured conduction velocity.

**Fit:** props, plates, relays, timer, gate. No new node/link. The room must
provide three prop entities plus bodies per ADR-0035, and the reset list must
include all three.

**Optional status:** `required: false`; no exit lock; evidence is optional.

### 4.2 02 Stretch Gate

**Intended flow:** one player braces the knee; the other taps the patellar
ligament. The spindle gate opens, releasing the sensory token. The carrier takes
the token through the dorsal root and drops or pushes it onto the dorsal plate;
the sensory gate opens. The circuit stops at the spinal cord.

Reference nodes:

- `brace-plate` — `plate`, `detects: ["player"]`
- `brace-trigger` — `trigger`, `once: true`
- `tap-plate` — `plate`, `detects: ["player"]`
- `stretch-relay` — `relay`, `allOf`
- `spindle-gate` — `gate`, `initial: "closed"`, `latched: true`
- `sensory-token` — `prop`
- `dorsal-plate` — `plate`, `detects: ["prop"]`, `minimum: 1`
- `dorsal-gate` — `gate`, `initial: "closed"`, `latched: true`

Reference links:

- `brace-plate` → `brace-trigger`: `press` (latch the brace)
- `brace-trigger` → `stretch-relay`: `activate`
- `tap-plate` → `stretch-relay`: `activate`
- `stretch-relay` → `spindle-gate`: `open`
- `dorsal-plate` → `dorsal-gate`: `open`

Win: `gateOpen dorsal-gate`.

The brace plate represents the joint being held in a position where the tap can
stretch the quadriceps. The brace trigger latches so one player can set the brace
and then tap; co-op can split the actions. The dorsal plate detects a dropped or
pushed sensory token; the token is an abstraction for the sensory signal. The
room does not show a motor neuron, muscle contraction, or brain route; that is
reserved for 05.

**Fit:** plates, relay, gate, prop. No new node/link. The token uses the current
prop/carry contract; reset returns it to the spindle.

**Optional status:** `required: false`; no exit lock; evidence is optional.

### 4.3 03 Node Run

**Intended flow:** two inputs raise the stimulus counter to threshold; the
trigger gate opens and latches; the player enters the axon; the entry gate closes
behind; the terminal zone opens the exit gate. The spike is all-or-none and
one-way.

Reference nodes:

- `input-a`, `input-b` — `plate`, `detects: ["player"]`
- `stimulus-counter` — `counter`, `target: 2`, `comparison: ">="`
- `threshold-gate` — `gate`, `initial: "closed"`, `latched: true`
- `axon-entry` — `zone`, `detects: ["player"]`, `minimum: 1`
- `behind-gate` — `gate`, `initial: "open"`, `latched: false`
- `terminal-zone` — `zone`, `detects: ["player"]`, `minimum: 1`
- `exit-gate` — `gate`, `initial: "closed"`, `latched: true`

Reference links:

- `input-a` → `stimulus-counter`: `increment`
- `input-b` → `stimulus-counter`: `increment`
- `stimulus-counter` → `threshold-gate`: `reached`
- `axon-entry` → `behind-gate`: `close`
- `terminal-zone` → `exit-gate`: `open`

Win: `gateOpen exit-gate`.

The two inputs can be two presses by one player or one press by each player.
That is a game abstraction for reaching threshold, not a claim about spatial or
temporal summation. Once the counter reaches 2, the gate latches; later presses
do not create a bigger response. The behind gate is a one-way spatial cue and
must not trap a player who has not reached the exit; the layout keeps the axon
path forward-only after entry.

**Fit:** plates, counter, relay-free threshold, zones, gates. No new node/link.
The `counter` emits `counterReached`; the gate opens from `reached`. The
behind-gate is a non-latched door and is reset by the puzzle reset.

**Required:** yes. Win evidence: `puzzle_solved` + debrief.

### 4.4 04 Endplate Ferry

**Intended flow:** the terminal plate is the action potential beat; it starts
the Ca²⁺ window and opens the cleft gate. The carrier takes the ACh packet
across the cleft and places it on the nicotinic receptor. The terminal pulse
binds the receptor and opens the muscle gate. The AChE timer clears the signal
after the response; the muscle gate stays latched.

Reference nodes:

- `terminal-plate` — `plate`, `detects: ["player"]`
- `ca-timer` — `timer`, short release window
- `ca-gate` — `gate`, `initial: "closed"`, `latched: false`
- `ache-timer` — `timer`, visual clearance delay
- `ach-packet` — `prop`
- `nicotinic-receptor` — `receptor`, accepts the ACh tag/shape
- `pulse-terminal` — `pulseSource`
- `muscle-gate` — `gate`, `initial: "closed"`, `latched: true`

Reference links:

- `terminal-plate` → `ca-timer`: `start`
- `ca-timer` → `ca-gate`: `elapsed` (opens; the gate is non-latched)
- `pulse-terminal` → `nicotinic-receptor`: `pulse`
- `nicotinic-receptor` → `muscle-gate`: `bind` (opens)
- `nicotinic-receptor` → `ache-timer`: `bind` (starts the clearance timer)
- `ache-timer` → `ca-gate`: `close` (optional visual reset)

Win: `gateOpen muscle-gate`.

The terminal plate and the pulse are two beats of the same abstraction: the
plate starts the Ca²⁺/release window, and the pulse is the ability action that
binds the receptor after the packet is placed. The implementation may instead
use the pulse as the visual cue and the plate as the timing input; it must not
claim that a pulse alone releases ACh without the Ca²⁺ step. The ACh packet is
not a literal vesicle; it stands for the released chemical message. The wrong
receptor is optional feedback: if the packet is placed there, the pulse rejects
it and `wrongReceptor` increments; the packet remains retrievable.

**Fit:** plate, timer, gate, prop, receptor, pulseSource. All are M1.5 nodes.
The pulse cooldown must be short enough that the player can fire after placing
the packet; the HUD shows the cooldown per ADR-0043.

**Required:** yes. Win evidence: `puzzle_solved` + debrief.

### 4.5 05 Reflex Core

**Intended flow:** interact at the patellar ligament to tap it; the sensory token is
available at the spindle; it travels through the dorsal root to the spinal plate;
the ventral gate opens; the motor token travels through the ventral root to the
muscle plate; the kick trigger opens the kick gate. The brain side gate is closed
until a delayed timer starts from the kick. The core does not require the brain or
the optional antagonist.

Reference nodes:

- `sensory-token` — `prop`
- `dorsal-zone` — `zone`, `detects: ["prop", "player"]`
- `spinal-plate` — `plate`, `detects: ["prop"]`
- `ventral-gate` — `gate`, `initial: "closed"`, `latched: true`
- `motor-token` — `prop`
- `ventral-zone` — `zone`, `detects: ["prop", "player"]`
- `muscle-plate` — `plate`, `detects: ["prop"]`
- `kick-trigger` — `trigger`, `once: true`
- `kick-gate` — `gate`, `initial: "closed"`, `latched: true`
- `brain-gate` — `gate`, `initial: "closed"`, `latched: false`
- `consciousness-timer` — `timer`, delay after kick
- `brain-zone` — optional `zone` behind the brain gate

Reference links:

- `spinal-plate` → `ventral-gate`: `open`
- `muscle-plate` → `kick-trigger`: `press`
- `kick-trigger` → `kick-gate`: `open`
- `kick-trigger` → `consciousness-timer`: `start`
- `consciousness-timer` → `brain-gate`: `elapsed` (opens)
- optional `brain-zone` → a debrief trigger/map reveal

Win: `gateOpen kick-gate`.

The sensory and motor tokens represent the two neurons and the synapse between
them. The player does not need to place the token on a `receptor`; the spinal
plate is the direct synapse/integration point. The brain gate is a side route,
not the exit. The p1/p2 roles: one player interacts with the ligament and
operates the spinal/brain side; the other carries. Solo can do both sequentially
because the sensory and motor tokens are available in order and the plates latch.

**Fit:** plates, zones, gates, timer, props. No new node/link. The optional
lesion challenge is a `concept` gate with `singleChoice` or `match`, which is
existing engine surface. If a spatial lesion overlay is wanted later, it needs a
separate puzzle/ADR; this package does not assume it.

**Required:** yes. Win evidence: `puzzle_solved` + OBJ-3 debrief; optional
lesion gate evidence.

### 4.6 Silicon Interrupt Loop

**Intended flow:** the sensor detects the probe; the interrupt line is routed to
the interrupt controller, not directly to the CPU; the controller wakes the CPU;
the CPU opens the actuator gate. The optional work token is a visual completion
beat, not part of the win.

Reference nodes:

- `sensor-plate` — `plate`, `detects: ["player", "prop"]`
- `route-plug` — `prop`
- `controller-socket` — `plate`, `detects: ["prop"]`
- `cpu-socket` — `plate`, `detects: ["prop"]` (decoy)
- `controller-relay` — `relay`, `allOf`
- `cpu-timer` — `timer`
- `actuator-gate` — `gate`, `initial: "closed"`, `latched: true`
- `work-token` — `prop` (optional visual beat)
- `work-plate` — `plate`, `detects: ["prop"]` (optional visual only)

Reference links:

- `sensor-plate` → `controller-relay`: `activate`
- `controller-socket` → `controller-relay`: `activate`
- `controller-relay` → `cpu-timer`: `start`
- `cpu-timer` → `actuator-gate`: `elapsed`

Win: `gateOpen actuator-gate`.

If the route plug is placed on `cpu-socket`, the controller relay lacks the
second input; the CPU does not wake. The player gets a "wrong route" hint and
can move the plug. The CPU socket is not a second win path. The optional work
token/plate is a visual completion beat only; it must not open the actuator gate
or bypass the controller.

**Fit:** plates, relay, timer, gate, props. No new node/link. The optional work
token adds a visual co-op beat but no new mechanic and no second win path.

**Required:** playable fixture; evidence optional per OBJ-5.

### 4.7 Reference solution sketches

These are design-intent action sequences, not coordinate-validated traces. They
show that each room is solo-reachable with the existing action vocabulary.
Coordinates and exact entity IDs belong to M2 authoring.

| Room | Sequence after activation |
|---|---|
| 01 Sheath Gate | P2: pick myelin-a/b/c and drop each on its gap; P1: move to the dendrite plate; wait for the gate |
| 02 Stretch Gate | P1: move to the brace plate; P2: move to the tap plate; P2: pick the sensory token, move to the dorsal plate, drop; wait |
| 03 Node Run | P1: move to input-a, step off, move to input-b (or press input-a twice); move through the axon to the terminal; wait |
| 04 Endplate Ferry | P1: move to the terminal plate; wait for the Ca²⁺ gate; P2: pick the ACh packet, move to the nicotinic receptor, place; P1: pulse the terminal; wait |
| 05 Reflex Core | Interact at the ligament; P2: pick the sensory token, move to the spinal plate, drop; pick the motor token, move to the muscle plate, drop; wait; optional: move to the brain side after the timer |
| Silicon Interrupt Loop | Interact at the console; move to the sensor pad; pick the route plug, move to the controller socket, drop; wait for the CPU timer; optional: work token |

The 01/02 rows are optional side puzzles. The 03/04/05/Silicon rows are the
critical path. A solo player uses the P1 solo union; the P2 labels above show the
intended co-op role split, not a requirement for two bodies.

## 5. Evidence and assessment

| Room | Required evidence | Optional evidence | Debrief / prompt |
|---|---|---|---|
| 01 Sheath Gate | None for exit; optional `puzzle_solved` | Concept log for CON-3; scan | "Why does myelin speed conduction without making the spike bigger?" |
| 02 Stretch Gate | None for exit; optional `puzzle_solved` | Concept log for CON-5; scan | "What senses the stretch, and which root carries the signal in?" |
| 03 Node Run | `puzzle_solved` (puzzle ID) + `debrief_answered` (OBJ-2 prompt) | `hint_used`; scan of myelin | "Why is a single input below threshold, and why does a second input not make a bigger spike?" |
| 04 Endplate Ferry | `puzzle_solved` + `debrief_answered` (OBJ-2 prompt) | `wrongReceptor`, `hint_used`, optional advanced receptor prompt | "What does Ca²⁺ do, and why does ACh need the right receptor?" |
| 05 Reflex Core | `puzzle_solved` + `debrief_answered` (OBJ-3 prompt) | optional lesion gate/debrief (OBJ-4); `hint_used` | "Why did the knee move before the brain?" |
| Silicon Interrupt Loop | Optional `puzzle_solved` / `debrief_answered` (OBJ-5) | transfer prompt observation | "Where is the spinal cord in this system?" |

The evidence rules follow ADR-0039:

- the puzzle is the performance evidence;
- the debrief is the explanation evidence;
- the solve event carries puzzle, objective, concept, mode, and diagnostic
  counters;
- the debrief records the raw answer; the game does not auto-grade it.

### 5.1 Diagnostic counters

Use the counters that M1.5 already emits where possible:

- `pickups`, `drops`, `placements`, `throws` for prop handling;
- `pulses` for 04;
- `wrongReceptor` for 04's wrong socket;
- `wrongSide` for a dropped token with no receptor (not a direction judgement);
- `resets` for puzzle reset;
- `hint_used` as a separate learning event, not a puzzle counter.

Do **not** claim a new counter such as `subthreshold` or `brainFirst` is
exported unless the evidence plumbing is added. The puzzle state and narrative
feedback can still show those mistakes; they are not required evidence. If M2
wants those counters, add them as an evidence-plumbing change with tests before
using them in a claim.

### 5.2 Objective mapping

| Objective | Evidence source | Puzzle role |
|---|---|---|
| OBJ-1 Identify structures | Existing bone/joint scans + optional 01/02 scan/solve | 01/02 are reinforcement, not the primary OBJ-1 assessment |
| OBJ-2 Trace the signal | 03 solve + 04 solve + debriefs | Performance evidence for the pathway and synapse |
| OBJ-3 Explain the bypass | 05 solve + debrief | Core explanation evidence |
| OBJ-4 Predict a lesion | Optional 05 Lesion Console + debrief | Optional challenge; not required for completion |
| OBJ-5 Transfer | Silicon fixture + transfer prompt | Optional per syllabus; fixture remains playable |

OBJ-1 still needs the bone/joint scans and dialogue from 01/02; the nervous
side puzzles do not replace them. OBJ-2's evidence now comes from two puzzles
(03 and 04) rather than one over-broad puzzle, which is a stronger alignment.

## 6. ADR audit

### 6.1 Conclusion

**No new mechanic is required.** No new ADR is proposed by this package.

The design uses only the ten M1.5 node types, the existing link vocabulary, the
existing win predicates, the existing activation modes, the existing tether
policies, and the existing concept-gate engine for the optional lesion check.

### 6.2 What would force an ADR

Stop and write a new ADR proposal if implementation needs any of the following:

- a new movement verb or ability;
- a new entity behaviour or node type;
- a new link type or a relay input semantics change;
- a new gate/puzzle type (for example, a spatial lesion overlay);
- a new dialogue condition/effect;
- a new UI surface;
- a new save field or save schema change;
- multi-puzzle simultaneous tether policies;
- dynamic tether changes mid-solve.

A spatially simulated lesion overlay would need a new design decision because
M1.5 has no conditional-path node that can remove a component and preserve a
clean win/debrief flow. The package therefore uses the existing concept-gate
engine for OBJ-4. That is not a compromise in the learning claim: the lesion
question is a knowledge check after the spatial core, not a replacement for it.

### 6.3 Existing decisions respected

| Decision | How this package respects it |
|---|---|
| ADR-0034 | Puzzles are declarative dataflow; no scripts/callbacks |
| ADR-0035 | Props use body + prop; puzzle references prop IDs |
| ADR-0036 | Physics is in `world`; puzzle graph stays pure |
| ADR-0037 | Co-op roles are additive; solo union completes every puzzle |
| ADR-0038 | One static tether policy per room/puzzle; no mid-solve changes |
| ADR-0039 | Puzzle is the assessment source; debrief is separate |
| ADR-0040 | Props are recoverable; reset is always available; no fail state |
| ADR-0041/0045 | Save/restore can handle puzzle state; no new fields |
| ADR-0042 | `interact`/`roomStart` activation is respected; one active puzzle |
| ADR-0043 | Authored hints and pulse cooldown are used |
| ADR-0044 | No hazard is required; checkpoint respawn remains available |

## 7. Sequence, density, and implementation priority

| Priority | Room | Why |
|---|---|---|
| 1 | 03 Node Run | Replaces the current 03 assessment; unblocks the critical path |
| 2 | 04 Endplate Ferry | Reuses the validated ferry pattern; covers synapse/NMJ |
| 3 | 05 Reflex Core | Core explanation objective and emotional payoff |
| 4 | Silicon Interrupt Loop | Transfer/proof of pack boundary; short fixture |
| 5 | 01 Sheath Gate | Optional reinforcement; can be cut without breaking the slice |
| 6 | 02 Stretch Gate | Optional bridge; can be cut without breaking the slice |

The 05 Lesion Console is an optional gate/debrief after the core; it can ship
after the four critical-path puzzles. The package defines it now so the room
does not need a redesign later.

## 8. Verification plan

After the documentation is written:

1. Re-read each room's rule-to-card ledger against the card facts and depth.
2. Check every node/link in the reference graphs against the M1.5 validator
   vocabulary; no unknown types or illegal pairs.
3. Run `git diff --check`.
4. Run `npm test`; expect the baseline 116 tests to remain green.
5. Run `npm run pack:validate`; expect PASS with the same one-level warnings.
6. Confirm `git status` shows only the new `docs/m2/nervous-puzzles/` files.
7. Confirm no file under `docs/shrinkonauts`, `public/packs`, `src`, or `tests`
   changed.

### 8.1 Baseline expectations

The current baseline is:

```text
npm test                 15 files, 116 tests passed
npm run pack:validate    PASS; anatomy-reflex 1/5 objectives, 5/8 concepts
                         expected forward-reference/coverage warnings
git diff --check         clean
```

A documentation-only change must not alter those results. The warnings are
expected because only `03-nerve-forest` is authored; they are not introduced by
this package.

### 8.2 Untracked-file check

`git diff --check` only checks tracked changes. Because this is a new docs
directory, also check the new files directly for trailing whitespace and CRLF
inconsistency before reporting verification. No staging is required.

## 9. Proposed traceability updates (not applied)

The following are recommendations for the vault owner. They are not edits made
by this package.

| Document | Proposed update |
|---|---|
| `base-game/traceability.md` | Replace the single `03-nerve-forest` "signal dash" row with the 03 Node Run and 04 Endplate Ferry split; keep 05 Reflex Core; add the optional 01/02 reinforcement rows; keep Silicon as OBJ-5 |
| `base-game/syllabus.md` §8 | Note that one concept per level is applied by splitting 03 (neuron) and 04 (synapse/NMJ) |
| `base-game/syllabus.md` §7 | Resolve the EV-5/EV-6 numbering conflict before changing evidence labels |
| `base-game/level-authoring.md` | Add the M2 examples for `interact` activation, timer windows, and one-puzzle-per-room density |
| `learning-design-brief.md` §5.2 | Update "Nerve Forest / Synapse Gap" to 03 Node Run and 04 Endplate Ferry |
| `base-game/README.md` | Note that Silicon is a one-room transfer fixture; pack placement is still open |

These updates are intentionally outside this task because `docs/shrinkonauts`
is a symlink into the Obsidian vault and the task forbids writing through it.

## 10. Residual risks

| Risk | Likelihood | Mitigation |
|---|---|---|
| 03 threshold puzzle feels too simple | Medium | The debrief carries all-or-none/myelin; optional myelin scan; playtest |
| 04 terminal plate + pulse is read as two action potentials | Medium | Dialogue says the plate is the terminal beat and the pulse is the binding/ability cue; debrief clarifies Ca²⁺ release |
| 05 brain gate opens before the player finishes | Low | Timer starts on the kick, not the tap; it can only open after the response |
| 05 room does not fit one screen | Medium | Use `stretch`; target one-screen layout; no new tether policy |
| 01/02 optional puzzles are skipped | Medium | They are optional by design; the critical path still covers the cards |
| Card content changes | Low–medium | Recheck the claim ledger; cards are draft |
| Silicon pack placement delays M2 | Medium | Ship as anatomy-pack fixture fallback; the puzzle rules do not change |
| Custom counters are expected but not exported | Low | Use only existing counters; add evidence plumbing later if needed |
