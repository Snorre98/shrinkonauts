# 03 — Nerve Forest: Node Run

**Status:** design proposal; replaces the M1.5 Signal Ferry
**Level ID:** `03-nerve-forest`
**Puzzle ID:** `puzzle-node-run`
**Role:** required, core OBJ-2 puzzle
**Objective:** OBJ-2 trace the signal
**Concepts:** CON-3 neuron structure, CON-5 sensory/motor pathway
**Card facts:** NERV-01#1, #5, #6 (core); #3 in debrief
**Activation:** `roomStart`
**Tether:** `off`
**Win:** `gateOpen gate-exit`

## 1. Learning target

The player can explain:

- a stimulus must reach threshold before an action potential fires;
- an action potential is all-or-none; a stronger or repeated stimulus after
  threshold does not make a bigger spike;
- the signal travels one way along the neuron: dendrite → soma/trigger zone →
  axon → terminal;
- myelin speeds conduction by letting the signal regenerate at the nodes; it does
  not amplify the spike.

The puzzle is about the neuron, not the whole reflex arc. The reflex arc is
reserved for 05.

## 2. Why this replaces the Signal Ferry

The current `puzzle-ferry-01` is a useful M1.5 proof, but it is not a good
assessment for `03-nerve-forest`:

- It lists CON-3, CON-4, CON-5, CON-6, and CON-7 at once.
- The player carries a shape-coded tracer to a matching receptor; that is a
  receptor/chemical-synapse idea, not one-way action-potential propagation.
- It does not ask the player to use threshold, all-or-none, myelin, or the
  reflex arc.

Node Run replaces it at 03. The ferry pattern is re-specified for 04, where
chemical transmission and the NMJ make it meaningful. No existing puzzle file is
edited by this design; the M2 implementation supersedes it deliberately.

## 3. Fiction and setup

The player is inside a neuron. The signal is stuck below threshold, so the exit
to the terminal is closed. The Neuron Keeper explains:

> "A neuron does not fire for every nudge. The input has to reach threshold.
> Once it does, the spike is full-size and goes one way. Two inputs are enough
> here; one is not. Do not expect a bigger spike from a third."

The player sees a dendrite input bay, a trigger zone, an axon path, myelin
nodes, and the terminal gate. The room is one screen.

## 4. Spatial layout

```text
+--------------------------------------------------------------+
|  Neuron interior                                             |
|                                                              |
|  [input a]  [input b]                                        |
|       \        /                                             |
|        \      /                                              |
|      [stimulus counter] --threshold--> [trigger gate]        |
|                                              |               |
|                                     [axon entry zone]       |
|                                              |               |
|                                   [behind gate / one-way]    |
|                                              |               |
|                                   [myelin-node platforms]   |
|                                              |               |
|                                     [terminal zone]         |
|                                              |               |
|                                        [exit gate]           |
+--------------------------------------------------------------+
```

The two input plates are near the dendrite. The trigger gate is the threshold
checkpoint. The axon is a forward path; the behind gate closes after entry so the
player cannot backtrack through the trigger zone. Myelin nodes are visible
platforms/labels; they are optional scan/debrief content, not a required timing
contest.

## 5. Puzzle rules

### 5.1 Below threshold

1. The puzzle activates at room start. The exit gate is closed.
2. The player can press **input a** or **input b**. Each press increments the
   stimulus counter.
3. With one press, the counter is below threshold. The trigger gate stays closed.
   The HUD/agent feedback says: "Below threshold — no spike." The player may
   press the other input or press the same plate again (step off and on).
4. The two inputs are a game abstraction. They are not a claim that a real neuron
   needs exactly two inputs; they represent graded input reaching threshold.

### 5.2 Threshold and all-or-none

5. When the counter reaches 2, the counter fires `reached`, the trigger gate opens,
   and the gate latches. The spike has fired.
6. Extra input presses after threshold do nothing. The counter is already active;
   the gate stays open. The signal does not become "bigger." This is the
   all-or-none rule.
7. The player enters the axon through the trigger gate. The **axon entry zone**
   closes the behind gate; the axon is now one-way. The player cannot return
   through the trigger zone, but the only required route is forward to the
   terminal.

### 5.3 Terminal

8. The player reaches the **terminal zone**. The exit gate opens and latches.
   The puzzle is solved.
9. The terminal gate is the level exit to 04. The player can backtrack after the
   solve if the level graph allows it, but the puzzle itself is complete.

### 5.4 Win and reset

- **Win:** `gateOpen gate-exit`.
- **Reset:** the stimulus counter resets to 0; the trigger gate closes; the behind
  gate returns to open; the exit gate closes if not latched; the player respawns
  at the checkpoint. The puzzle reset is available before the solve.
- **No fail state:** being below threshold or going the wrong way gives feedback;
  it does not remove evidence or health.
- **Softlock prevention:** the behind gate only closes after the player has
  entered the forward axon; the forward path always leads to the terminal. A
  reset is always available.

## 6. Feedback and hints

| Trigger | Feedback | Evidence |
|---|---|---|
| One input | "Below threshold — no spike. Add another input." | Hint; no penalty |
| Second input | "Threshold reached — the spike fires all-or-none." | Progression |
| Extra input after threshold | "The spike is already full-size. More input does not make it bigger." | Misconception feedback |
| Wrong direction / behind gate | "The axon conducts away from the soma; the signal is one-way." | Hint; no penalty |
| Terminal reached | "The signal reaches the terminal." | `puzzle_solved` |

Authored hints:

1. "One input is below threshold. The trigger gate needs a second input."
2. "Once threshold is crossed, the spike is all-or-none. Extra presses do not
   increase it."
3. "The axon is one-way: dendrite → trigger zone → axon → terminal."

## 7. Reference graph

The full node/link shape is in
[`mechanics-and-evidence.md`](mechanics-and-evidence.md) §4.3. Summary:

```text
input-a (press) --increment--> stimulus-counter (target 2, >=)
input-b (press) --increment--> stimulus-counter
stimulus-counter --reached--> threshold-gate (latched, open)
axon-entry (zone) --close--> behind-gate (non-latched)
terminal-zone (zone) --open--> exit-gate (latched)
```

The counter is the threshold check. The gate latch is the all-or-none rule. The
behind gate is the one-way spatial cue.

**M1.5 fit:** plates, counter, zones, gates. No new nodes or links. The level
keeps the current puzzle-driven evidence model and does not load the old
`gate-nerve-01` quiz door.

## 8. Evidence and assessment

Required evidence:

```json
[
  {
    "objectiveId": "OBJ-2",
    "event": "puzzle_solved",
    "filter": { "puzzleId": "puzzle-node-run" },
    "required": true
  },
  {
    "objectiveId": "OBJ-2",
    "event": "debrief_answered",
    "filter": { "promptId": "prompt-obj-2-threshold" },
    "required": true
  }
]
```

The solve event records the puzzle ID, objective/concept IDs, mode, and the
existing diagnostic counters. Hint use is a separate `hint_used` event.

**Suggested debrief:** "Why does one input fail, and why does a third input not
make a bigger spike?"

**Model answer:** "The first input is below threshold, so no action potential
fires. Once threshold is reached, the action potential is all-or-none; more
input increases the frequency of spikes, not the amplitude of one spike."

**Optional myelin debrief:** "Why does myelin speed conduction?" Model: "It
insulates the axon and the signal regenerates at the nodes, so it jumps from node
to node instead of travelling continuously."

## 9. Co-op and solo

- **Co-op:** P1 and P2 can each press one input; the two inputs reach threshold.
  One player can then run the axon while the other follows or scans. The puzzle
  does not require two simultaneous bodies; either player can press both inputs
  in sequence.
- **Solo:** press input a, step off, press input b (or press the same plate
  twice), then run the axon. The counter and gate latch make this possible.
- **No co-op-only route:** solo completes the same puzzle.
- **Tether:** `off` because the room is one screen. The behind gate and terminal
  are within the same camera frame.

## 10. Rule-to-card ledger

| Rule | Player-visible claim | Card anchor | Depth | Required? |
|---|---|---|---|---|
| R1: one input is below threshold | A stimulus must reach threshold | NERV-01#5 | Core | Yes |
| R2: two inputs reach threshold | Game abstraction for threshold; not a neuron-count claim | NERV-01#5 | Core | Yes |
| R3: the gate latches once threshold is reached | Action potentials are all-or-none | NERV-01#6 | Core | Yes |
| R4: extra inputs do not make a bigger spike | Stronger stimuli increase frequency, not amplitude | NERV-01#6 | Core | Yes |
| R5: the axon is one-way | Information flows dendrite → soma → axon → terminal; refractory period keeps it one-way | NERV-01#1, #6 | Core | Yes |
| R6: myelin speeds conduction | Myelin enables saltatory conduction | NERV-01#3, #6 | Core | Debrief |
| R7: the trigger zone is a landmark | The axon begins at the hillock/initial segment | NERV-01#2 | Advanced | No |

Do not use the terms "spatial summation" or "temporal summation" in the required
dialogue or debrief. Those belong to NERV-02#4 (advanced).

## 11. Anatomy fidelity notes

- The two-input threshold is an abstraction. It is not a claim that a neuron
  needs two presynaptic inputs, and it is not a summation lesson.
- The spike is all-or-none. Do not show a larger visual spike for a third input.
  If the game uses a pulse animation, keep the amplitude constant and, if
  anything, increase the frequency only in optional advanced content.
- The one-way rule is supported by NERV-01#1 and the refractory period (#6). The
  physical gate is a game abstraction, not a literal anatomical valve.
- Myelin is a core fact, but the puzzle's required action is threshold/one-way.
  The myelin claim is in the debrief/scan so it does not overload the puzzle.
- Do not show exact mV values unless the UI explains that they are typical; the
  card's values are about −70/−55/+30 mV and vary by cell.
- Do not claim that the signal is "electricity in a wire" or that the spike
  travels unchanged; the action potential is regenerated.

## 12. Acceptance and playtest checks

- [ ] The player can explain why one input is not enough and why a third input
      does not make a bigger spike.
- [ ] The player can order dendrite → trigger zone → axon → terminal.
- [ ] The player does not describe the signal as bidirectional.
- [ ] The player can explain one effect of myelin after the debrief.
- [ ] Solo play works without two simultaneous bodies.
- [ ] The exit is puzzle-locked and the debrief is separate evidence.
- [ ] The old Signal Ferry is not loaded at 03.
- [ ] The puzzle passes the M1.5 fit audit; no new mechanic.

## 13. Open questions

- Should the two inputs be separate plates, or one plate pressed twice? Separate
  plates show the "two inputs" abstraction more clearly; one plate is simpler
  for solo. Recommendation: two plates, because co-op can split them and solo
  can still press both.
- Should the trigger zone be named "axon hillock" in the HUD? The name is
  NERV-01#2 (advanced), so use "trigger zone" in the required path and put the
  name in an optional scan/debrief.
- Should the player see a myelin node scan in this room, or only the debrief? A
  scan is optional; the debrief is required if myelin is part of the OBJ-2
  claim.
