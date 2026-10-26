# 05 — Reflex Core: Reflex Core

**Status:** design proposal
**Level ID:** `05-reflex-core`
**Puzzle ID:** `puzzle-reflex-core`
**Role:** required core; OBJ-3 and optional OBJ-4
**Objective:** OBJ-3 explain the spinal bypass; optional OBJ-4 predict a lesion
**Concepts:** CON-5 sensory/motor pathway, CON-7 reflex arc
**Card facts:** NERV-03#1, #2, #3, #5 (core); #4 optional advanced
**Activation:** `interact` at the patellar ligament
**Tether:** `stretch` (target one screen; `off` if the geometry fits)
**Win:** `gateOpen gate-kick`

## 1. Learning target

The player can explain:

- a tap on the patellar ligament stretches the quadriceps;
- the muscle spindle is the stretch receptor;
- the sensory axon enters the spinal cord through the dorsal root and synapses
  directly on the motor neuron;
- the motor axon leaves through the ventral root and signals the quadriceps;
- the quadriceps contracts and the lower leg extends;
- the brain is not required for the response; conscious perception is a separate,
  slower pathway.

The core puzzle does **not** require reciprocal inhibition (NERV-03#4,
advanced). The hamstring brake is optional scan/debrief content.

## 2. Fiction and setup

The player reaches the reflex core. The knee is ready, but the arc is broken into
two halves: the sensory half stops at the spinal cord, and the motor half is
locked. The Bug explains:

> "The knee jerks before the brain knows because the spinal cord can answer
> directly. Tap the ligament, carry the stretch signal through the dorsal root,
> and hand it to the motor neuron. The brain is a side door, not the switch. It
> opens later."

The player sees the knee, quadriceps, patellar ligament, dorsal root, spinal
cord hub, ventral root, muscle plate, and a brain side route. The room is the
emotional payoff of the pack.

## 3. Spatial layout

```text
+--------------------------------------------------------------+
|  Reflex Core                                                 |
|                                                              |
|   [brain side route] <---- [brain gate] <-- timer            |
|         ^                                      ^             |
|         |                                      |             |
|   [spinal cord hub] ---- [ventral gate] ---- [ventral root]  |
|         ^                                      |             |
|         |                                      v             |
|   [dorsal root]                             [muscle plate]   |
|         ^                                      |             |
|         |                                      v             |
|   [spindle / sensory token]                [kick gate]        |
|         ^                                      |             |
|   [patellar ligament / tap]                [leg extends]      |
+--------------------------------------------------------------+
```

The brain side is visible but visibly locked. The spinal path is the main route.
The knee and leg are on the lower left; the spinal cord hub is center; the brain
side is above. The room may use `stretch` so co-op can frame both carriers.

## 4. Puzzle rules

### 4.1 Tap and sensory leg

1. A player interacts with the patellar ligament. This **is** the tap; the
   puzzle activates. The sensory token becomes interactable at the spindle.
2. The sensory token is released at the spindle. The HUD says: "Carry the stretch
   signal through the dorsal root to the spinal cord."
3. The carrier takes the token through the dorsal-root passage and drops or
   pushes it onto the **spinal plate** at the spinal cord hub. The plate ignores
   a carried token; the carrier must release it on the plate.
4. When the spinal plate detects the token, the **ventral gate** opens and
   latches. The sensory half is complete.

The tap is the activation; there is no separate tap plate. The spindle is the
sensory receptor, and the token represents the sensory signal, not a literal
action potential object.

### 4.2 Motor leg and kick

5. A **motor token** is now available behind the ventral gate. It represents the
   motor neuron's signal, not a second sensory signal.
6. The carrier takes the motor token through the ventral-root passage and drops
   or pushes it onto the **muscle plate** at the quadriceps. The plate ignores a
   carried token; the carrier must release it on the plate.
7. The muscle plate fires a one-shot **kick trigger**. The kick gate opens and
   latches; the lower leg extends. The core response is complete.

### 4.3 Brain later

8. The kick trigger also starts the **consciousness timer**. The brain gate is
   closed while the timer runs.
9. If a player reaches the brain gate before the kick, the gate is locked. The
   feedback is: "The brain is a late listener, not the switch. Complete the
   spinal response first."
10. When the timer elapses **after the kick**, the brain gate opens. The brain
    side route becomes available for a short debrief/scan: "Conscious perception
    catches up after the response." The brain gate is not the level exit and is
    not required for the core win.

The timer starts from the kick, not from the tap, so the brain cannot open before
the response. The delay is illustrative, not a measured reaction time.

### 4.4 Win and reset

- **Win:** `gateOpen gate-kick`.
- **Reset:** sensory and motor tokens return to their spawns; the ventral gate,
  kick gate, brain gate, and timers reset; the player respawns at the checkpoint.
- **Softlock prevention:** a dropped token returns to its spawn; a token dropped
  on the wrong plate remains retrievable; reset is always available before the
  solve.
- **No fail state:** a wrong route or early brain attempt gives feedback, not a
  lost run.

## 5. Feedback and hints

| Trigger | Feedback | Evidence |
|---|---|---|
| Player tries the brain before the kick | "The brain is a late listener, not the switch." | Hint; no penalty |
| Sensory token dropped at spinal plate | "The sensory signal reaches the spinal cord." | Progression |
| Motor token dropped at muscle plate | "The quadriceps contracts; the leg extends." | `puzzle_solved` |
| Brain gate opens after the kick | "Conscious perception catches up." | Optional debrief/scan |
| Player asks why the brain is not needed | "The spinal cord can complete the response before conscious perception." | Misconception feedback |

Authored hints:

1. "The dorsal root is sensory; the ventral root is motor."
2. "The spinal cord can answer directly. The brain is a side route."
3. "The brain gate opens after the kick, not before."

## 6. Reference graph

The full node/link shape is in
[`mechanics-and-evidence.md`](mechanics-and-evidence.md) §4.5. Summary:

```text
interact at patellar ligament -> puzzle activates; sensory-token available
sensory-token --carried/dropped--> spinal-plate
spinal-plate (detects prop) --open--> ventral-gate (latched)
motor-token --carried/dropped--> muscle-plate
muscle-plate (detects prop) --press--> kick-trigger
kick-trigger --open--> kick-gate (latched)
kick-trigger --start--> consciousness-timer
consciousness-timer --elapsed--> brain-gate (non-latched)
```

The two tokens are the two neurons; the spinal plate is the direct synapse. The
brain gate is a side route, not the win.

**M1.5 fit:** plates, zones, gates, trigger, timer, props. No new nodes or links.
The brain gate is non-latched; the kick gate is latched. The optional lesion
console is a concept gate, not a second spatial puzzle.

## 7. Evidence and assessment

Required core evidence:

```json
[
  {
    "objectiveId": "OBJ-3",
    "event": "puzzle_solved",
    "filter": { "puzzleId": "puzzle-reflex-core" },
    "required": true
  },
  {
    "objectiveId": "OBJ-3",
    "event": "debrief_answered",
    "filter": { "promptId": "prompt-obj-3" },
    "required": true
  }
]
```

**Core debrief:** "Why did the knee move before the brain?"

**Model answer:** "The sensory neuron synapses directly on the motor neuron in
the spinal cord, so the quadriceps contracts before the brain's conscious
perception catches up."

The debrief rubric from the learning design still applies:

- 0 = labels only / no bypass;
- 1 = partial, mentions the spinal cord but not that the brain perceives later;
- 2 = correct spinal bypass plus the brain later.

## 8. Optional Lesion Console (OBJ-4)

After the core solve, a console becomes available. It is a **concept gate** using
the existing `singleChoice` or `match` type; it is not a second spatial puzzle.

### 8.1 Prompt

> "A lesion blocks one part of the arc. Which prediction is correct?"

### 8.2 Item set

Use one of the following, not all at once:

| Lesion | Correct prediction | Why |
|---|---|---|
| Sensory neuron | No stretch signal reaches the spinal cord; no kick | The afferent limb is broken |
| Spinal cord relay | The sensory signal arrives but cannot drive the motor neuron; no kick | The integration point is broken |
| Motor neuron | The sensory signal and spinal cord are intact, but the quadriceps does not receive the command; no kick | The efferent limb is broken |
| Muscle | The motor command arrives, but the quadriceps cannot contract; no kick | The effector is broken |

The correct answer must include the effect **and** the reason. The gate gives
feedback for each wrong option; it does not auto-grade a free-text explanation.
A follow-up debrief prompt records the player's explanation.

### 8.3 Evidence

```json
{
  "objectiveId": "OBJ-4",
  "event": "debrief_answered",
  "filter": { "promptId": "prompt-obj-4" },
  "required": false
}
```

or the equivalent `gate_solved` filtered by `gate-reflex-lesion`, if the concept
gate is used. OBJ-4 remains optional/stretch; it is not required for the core
completion.

### 8.4 Why this is a gate, not a spatial puzzle

A spatial lesion overlay would need a way to remove a component from the arc and
still preserve a clean reset/win/debrief flow. M1.5 has no conditional-path node
for that. Adding one would require an ADR. The concept gate tests the prediction
without inventing a mechanic.

## 9. Optional advanced content

- **Reciprocal inhibition (NERV-03#4):** an optional scan of a hamstring
  collateral and an optional "deeper look" debrief. Do not make the core kick
  fail without it. The card's source note says the inhibitory interneuron is
  standard physiology but not named in §14.3.
- **Monosynaptic terminology:** the card uses "monosynaptic" as the standard
  term; the source note says §14.3 implies the direct connection. Use the term in
  the debrief, but keep the player-facing explanation plain.
- **Brain side route:** optional; it should not become a second exit or a required
  walk. The core win is the kick.

## 10. Co-op and solo

- **Co-op:** P1 can tap the ligament and operate the spinal/brain side; P2 carries
  the sensory and motor tokens. Either player can interact with the patellar
  ligament; the tap activates the puzzle for both.
- **Solo:** P1 has the solo union. Interact with the patellar ligament, carry the
  sensory token to the spinal plate, pick up the motor token, carry it to the
  muscle plate, and watch the kick. The token spawns and the plates are reachable
  without a second body.
- **No co-op-only route:** the same sequence works with one body.
- **Tether:** `stretch` is the default because the room includes the knee, spinal
  cord, and brain side. If the layout fits within 1280 × 720, `off` is allowed.
  No new tether policy.

## 11. Rule-to-card ledger

| Rule | Player-visible claim | Card anchor | Depth | Required? |
|---|---|---|---|---|
| R1: interact at the patellar ligament = tap | A tap stretches the quadriceps | NERV-03#1 | Core | Yes |
| R2: spindle releases the sensory token | The muscle spindle is the receptor | NERV-03#1 | Core | Yes |
| R3: sensory token enters the dorsal root | The sensory axon enters through the dorsal root | NERV-03#2 | Core | Yes |
| R4: spinal plate is the direct synapse | The sensory neuron synapses directly on the motor neuron | NERV-03#2 | Core | Yes |
| R5: ventral gate releases the motor token | The motor axon leaves through the ventral root | NERV-03#3 | Core | Yes |
| R6: muscle plate causes the kick | The quadriceps contracts and the lower leg extends | NERV-03#3 | Core | Yes |
| R7: brain gate opens after the kick | The brain is not required; conscious perception is separate and slower | NERV-03#5 | Core | Yes |
| R8: optional hamstring brake | A collateral inhibits the antagonist; standard physiology uses an inhibitory interneuron | NERV-03#4 | Advanced | No |
| R9: optional lesion prediction | A block in the sensory neuron, spinal cord, motor neuron, or muscle prevents the response | NERV-03#2, #3, #5 | Core | Optional |

## 12. Anatomy fidelity notes

- The two tokens are the two neurons; the spinal plate is the direct
  sensory-to-motor synapse. Do not show a chain of interneurons in the core path.
- The brain gate is a side route. Do not make it the source of the kick or a
  required step. The card's claim is that the brain is not required, not that it is
  absent.
- The timer is illustrative. Do not put a millisecond value on it or claim a
  measured reaction time.
- The hamstring brake is advanced/optional. Do not fail the core kick if the
  player skips it. If it is shown, label the antagonist (hamstrings) and the
  inhibitory interneuron as optional advanced content.
- The lesion console is a prediction check, not a diagnosis. Do not use
  "patient", "injury", or clinical advice.
- The player can be wrong about the brain and still solve the spatial puzzle; the
  debrief is where the misconception is corrected.

## 13. Acceptance and playtest checks

- [ ] The player can order tap → spindle → dorsal root → spinal cord → ventral
      root → quadriceps → kick.
- [ ] The player can explain the brain bypass in one sentence.
- [ ] The player does not say the brain sends the kick.
- [ ] The brain gate cannot open before the kick.
- [ ] Solo play works with two token carries and no second body.
- [ ] The core puzzle does not require the hamstring brake.
- [ ] The optional lesion console records an explanation, not just a click.
- [ ] The room fits `stretch` or `off` without a new tether policy.
- [ ] The puzzle passes the M1.5 fit audit; no new mechanic.

## 14. Open questions

- Should the brain side route be a short walk with a debrief prompt, or a scan
  target only? A short walk gives the "late listener" idea spatial meaning;
  a scan is cheaper. Recommendation: short side route with a debrief prompt.
- Should the lesion console be singleChoice or match? Match (lesion → effect) is
  richer but heavier; singleChoice is faster. Recommendation: singleChoice for
  M2, match as optional.
- Should the hamstring brake be visible in the room even though it is optional?
  A visible optional side path can motivate the advanced fact without requiring
  it. Recommendation: visible but optional, labelled as a "deeper look."
- Should the core win wait for the brain gate to open? No. The win is the kick;
  the brain side is a reflection beat, not a gate.
