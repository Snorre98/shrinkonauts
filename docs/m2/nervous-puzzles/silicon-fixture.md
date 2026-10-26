# Silicon fixture: Interrupt Loop

**Status:** design proposal
**Fixture ID (traceability):** `silicon-fixture`
**Recommended pack:** `silicon-reflex`; level ID `01-interrupt-loop`
**Puzzle ID:** `puzzle-interrupt-loop`
**Role:** playable transfer fixture, OBJ-5
**Objective:** OBJ-5 transfer to a new system
**Concepts:** CON-8 sensor–controller–actuator loop
**Sources:** the syllabus CON-8 mapping; NERV-03#5 as the biological analogy
**Activation:** `interact` at the sensor console
**Tether:** `off`
**Win:** `gateOpen gate-actuator`

## 1. Learning target

The player can map:

```text
Body:     receptor → sensory neuron → spinal cord → motor neuron → muscle
Hardware: sensor   → interrupt line → interrupt controller → CPU → actuator
```

and answer the transfer question:

> "Where is the 'spinal cord' in this system?"

The correct answer is the **interrupt controller**, not the CPU. The controller is
the integration point; the CPU is on the output side of the syllabus mapping.
The fixture is an analogy, not a claim that a computer has a brain or a nervous
system.

## 2. Why this is a fixture, not new anatomy

There is no nervous-system card for Silicon. The biological side of the analogy
comes from the reflex arc; the hardware side comes from CON-8. The fixture must
not add hardware facts beyond the syllabus mapping, and it must not add brain
anatomy.

The fixture is one room, one gate, and a short transfer prompt. It is the proof
that the engine is pack-agnostic and the teaser for the series claim "Every
system is a puzzle."

## 3. Pack placement

The requirements and architecture describe the Silicon fixture as proof of the
pack boundary, so the recommended implementation is a separate one-level
`silicon-reflex` pack with a circuit theme. If M2 time forces a shortcut, the
same room can ship as a fixture level in `anatomy-reflex`.

The puzzle spec is deliberately pack-agnostic:

- it uses the same M1.5 puzzle document and node vocabulary;
- it uses CON-8 from the anatomy syllabus as the transfer frame;
- it does not depend on which pack manifest owns the room.

The placement decision is recorded as open in the package README.

## 4. Fiction and setup

The player shrinks into a circuit board. A sensor is detecting a signal, but the
interrupt line is routed to the CPU and nothing happens. The CPU Core agent
explains:

> "A sensor does not shout directly at the CPU. The interrupt line rings the
> controller. The controller decides what the CPU should do. I am the output
> side, not the spinal cord. Find the controller."

The player sees a sensor pad, an interrupt line with a route socket, an interrupt
controller, a CPU, and an actuator arm. The controller is the integration point.

## 5. Spatial layout

```text
+--------------------------------------------------------------+
|  Circuit board                                               |
|                                                              |
|  [sensor pad] ---> [interrupt line] ---> [controller socket] |
|                                              |               |
|                                        [interrupt controller]|
|                                              |               |
|                                         [CPU timer]          |
|                                              |               |
|  [CPU socket] (decoy)                  [actuator gate]       |
|                                              |               |
|                                        [actuator / exit]    |
+--------------------------------------------------------------+
```

The sensor pad and route plug are reachable without a second body. The CPU socket
is a visible decoy; it does not open the actuator. The controller socket is the
correct route. The actuator gate is the win.

## 6. Puzzle rules

### 6.1 Detect

1. A player interacts with the sensor console. The puzzle activates.
2. A player steps on the **sensor pad**. The sensor trigger fires once and
   latches. The HUD says: "Sensor triggered — route the interrupt line."
3. The sensor trigger stays active, so a solo player can step off and route the
   line. Co-op can split the actions, but solo is the baseline.

### 6.2 Route

4. The player picks up the **route plug** and drops or pushes it onto either the
   **controller socket** or the **CPU socket**. The sockets ignore a carried
   plug; the player must release it.
5. If the plug is on the controller socket, the controller relay receives both
   the sensor trigger and the socket input; the relay activates. The CPU timer
   starts.
6. If the plug is on the CPU socket, the controller relay lacks the socket
   input; the CPU does not wake. The HUD says: "No controller signal — the CPU
   never woke." The player can move the plug; no fail state.

### 6.3 Actuate

7. When the CPU timer elapses, the actuator gate opens and latches. The actuator
   arm moves; the exit/teaser opens.
8. Optional second beat: a **work token** can be dropped or pushed onto the
   actuator plate to show the response completing. It is a visual beat only; it
   must not open the actuator gate or bypass the controller. Keep the fixture
   30–60 seconds.

### 6.4 Transfer prompt

9. After the actuator gate opens, a transfer prompt asks: "Where is the spinal
    cord in this system?" Options:
   - sensor;
   - interrupt line;
   - interrupt controller;
   - CPU;
   - actuator.
10. Correct: **interrupt controller**. Feedback: "The controller is the
    integration point. The CPU is the output side, not the brain."
11. The prompt is optional evidence for OBJ-5. The room is playable even if the
    player skips the prompt.

### 6.5 Win and reset

- **Win:** `gateOpen gate-actuator`.
- **Reset:** the route plug returns to its spawn; the sensor trigger, controller
  relay, CPU timer, and actuator gate reset; the sensor pad/probe resets.
- **Softlock prevention:** a dropped route plug returns to spawn; the wrong CPU
  socket remains selectable; reset is always available before the solve.
- **No fail state:** a wrong route gives feedback, not a lost run.

## 7. Feedback and hints

| Trigger | Feedback | Evidence |
|---|---|---|
| Sensor pad pressed | "Sensor triggered — route the interrupt line." | Progression |
| Plug on CPU socket | "No controller signal — the CPU never woke." | Hint; no penalty |
| Plug on controller socket | "Controller active — CPU wake signal sent." | Progression |
| CPU timer elapses | "Actuator responds." | `puzzle_solved` (optional) |
| Transfer prompt wrong | "That is the sensor/line/CPU/actuator, not the integration point." | Optional debrief |

Authored hints:

1. "The sensor rings the interrupt controller, not the CPU directly."
2. "The controller socket is the integration point."
3. "The CPU is the output side of this loop; the controller is the 'spinal
   cord' analogue."

## 8. Reference graph

The full node/link shape is in
[`mechanics-and-evidence.md`](mechanics-and-evidence.md) §4.6. Summary:

```text
sensor-pad (press) --fire--> sensor-trigger (once)
sensor-trigger --activate--> controller-relay (allOf)
controller-socket (plate, detects prop) --activate--> controller-relay
controller-relay --start--> cpu-timer
cpu-timer --elapsed--> actuator-gate (latched)
cpu-socket (decoy) --no link to controller-relay
```

The controller relay is the integration point. The CPU timer is the wake/process
delay. The actuator gate is the response. The decoy socket is a route error, not
a second solution.

**M1.5 fit:** plates, trigger, relay, timer, gate, prop. No new nodes or links.
The sensor trigger latch makes solo play possible.

## 9. Evidence and assessment

OBJ-5 is optional/stretch in the syllabus. Suggested evidence:

```json
{
  "objectiveId": "OBJ-5",
  "event": "debrief_answered",
  "filter": { "promptId": "prompt-transfer-silicon" },
  "required": false
}
```

or the equivalent `puzzle_solved` filtered by `puzzle-interrupt-loop` if the
fixture is assessed. Do not make OBJ-5 required for the anatomy pack completion.

**Transfer prompt:** "Where is the spinal cord in this system?"

**Model answer:** "The interrupt controller. It integrates the sensor's interrupt
and wakes the CPU; the CPU is the output side, not the brain."

## 10. Co-op and solo

- **Co-op:** P1 triggers the sensor and can watch the controller; P2 drops or
  pushes the route plug and optionally the work token. Either player can interact
  with the console.
- **Solo:** step on the sensor (trigger latches), pick up the route plug, drop or
  push it onto the controller socket, wait for the CPU timer, and enter the
  actuator. The sensor trigger latch is essential; do not require a player to
  hold the sensor and release the plug simultaneously.
- **No co-op-only route:** the same sequence works with one body.
- **Tether:** `off`; the board is one screen.

## 11. Rule-to-source ledger

| Rule | Player-visible claim | Source | Required? |
|---|---|---|---|
| R1: sensor detects a change | A sensor detects a change | CON-8 | Yes |
| R2: interrupt line carries the signal | The interrupt line is the input path | CON-8 | Yes |
| R3: controller is the integration point | The interrupt controller processes the signal | CON-8 | Yes |
| R4: CPU wakes after the controller | The CPU is on the output side of the loop | CON-8 | Yes |
| R5: actuator responds | The actuator is the output | CON-8 | Yes |
| R6: controller, not CPU, is the "spinal cord" analogue | The reflex integration point maps to the controller | CON-8; NERV-03#5 analogy | Yes |
| R7: the brain is not required for the reflex | The spinal cord can answer without the brain | NERV-03#5 | Yes (analogy) |
| R8: CPU is not the brain | The syllabus maps the CPU to motor output, not a brain | CON-8; no brain claim | Disclaimer |

## 12. Anatomy and hardware fidelity notes

- The hardware side is a syllabus analogy. Do not add electrical-engineering
  details (voltage levels, bus protocols, interrupt priorities) beyond the
  one-room metaphor.
- The CPU is **not** the brain. The syllabus mapping puts the interrupt
  controller at the integration point and the CPU on the output side. Do not say
  "the CPU decides" or "the CPU is the brain."
- The sensor is not a receptor in a biological sense; it is the hardware analogue
  of the receptor. Use "sensor" and "receptor" carefully.
- The fixture does not claim that computers have a nervous system, a spinal cord,
  or consciousness.
- The biological side of the transfer uses NERV-03#5: the reflex response can
  happen without the brain; conscious perception is separate. Do not overstate
  this as "no brain involvement at all."

## 13. Acceptance and playtest checks

- [ ] The player can map sensor → interrupt line → controller → CPU → actuator.
- [ ] The player chooses the interrupt controller as the "spinal cord" analogue.
- [ ] The player does not choose the CPU as the brain/integration point.
- [ ] Solo play works because the sensor trigger latches.
- [ ] The wrong CPU socket gives feedback and does not softlock.
- [ ] The fixture is 30–60 seconds and one screen.
- [ ] The fixture loads without engine changes, or the docs flag any needed ADR.
- [ ] OBJ-5 remains optional/stretch.

## 14. Open questions

- Should the Silicon fixture ship as a separate `silicon-reflex` pack or as an
  `anatomy-reflex` fixture level? Recommended: separate pack for the
  pack-agnostic proof; fallback in-pack if M2 time is tight.
- Should the transfer prompt be a concept gate or a debrief? A concept gate is
  faster and uses existing schema; a debrief gives richer evidence. The syllabus
  recommends optional/shown, so a singleChoice gate plus optional debrief is
  enough.
- Should the work token be required? No; it adds a second beat but risks making
  the fixture longer than 60 seconds. Keep it optional.
