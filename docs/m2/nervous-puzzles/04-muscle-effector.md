# 04 — Muscle Effector: Endplate Ferry

**Status:** design proposal; inherits the Signal Ferry pattern
**Level ID:** `04-muscle-effector`
**Puzzle ID:** `puzzle-endplate-ferry`
**Role:** required, core OBJ-2 puzzle
**Objective:** OBJ-2 trace the signal
**Concepts:** CON-4 synapse, CON-6 muscle effector
**Card facts:** NERV-02#1, #2, #5 (core); #3 optional advanced debrief
**Activation:** `interact` at the motor terminal
**Tether:** `off`
**Win:** `gateOpen gate-muscle`

## 1. Learning target

The player can explain:

- an action potential at the motor-terminal end opens voltage-gated Ca²⁺ channels;
- Ca²⁺ triggers vesicle fusion and release of neurotransmitter into the synaptic
  cleft;
- at the neuromuscular junction, ACh binds nicotinic receptors on the muscle;
- acetylcholinesterase breaks down ACh to end the signal;
- the muscle contracts only after the receptor binds.

The required puzzle uses NERV-02#1, #2, and #5. The general "the receptor
determines the effect" fact (#3) is advanced and only appears in an optional
debrief.

## 2. Relation to the Signal Ferry

The M1.5 Signal Ferry already has the right co-op grammar: one player pulses a
presynaptic terminal, the other carries and places a tracer on a matching
receptor. Its anatomy is a better fit for the neuromuscular junction than for
the neuron-direction objective:

- a presynaptic terminal releases a chemical message;
- the message crosses a cleft;
- a specific postsynaptic receptor accepts it;
- the muscle responds.

Endplate Ferry therefore **inherits the ferry pattern** and revises its labels,
evidence, and objective. The current 03 puzzle is replaced by Node Run; this
puzzle takes over the ferry at 04.

## 3. Fiction and setup

The player is at the motor end plate. The muscle is waiting for a signal, but the
release window is closed and the ACh packet is stuck at the vesicle dock. The
Muscle Effector agent explains:

> "The nerve does not touch the muscle. The terminal fires, calcium goes in,
> and the vesicle releases its chemical message across the cleft. ACh binds the
> nicotinic receptor here, and the muscle responds. Then the enzyme clears the
> ACh so the signal can end."

The ACh packet is labelled **"ACh packet (signal token)"** in the HUD. It is an
abstraction, not a literal vesicle carried by the player.

## 4. Spatial layout

```text
+--------------------------------------------------------------+
|  Motor end plate                                              |
|                                                              |
|  [motor terminal]                                             |
|    [terminal plate] ---> [Ca2+ window timer] ---> [Ca2+ gate]|
|         |                                             |       |
|    [pulse terminal]                                  |       |
|         |                                     [cleft bridge] |
|         |                                             |       |
|         +----------------------[nicotinic receptor]---+       |
|                                      |                       |
|                              [wrong receptor] (optional)      |
|                                      |                       |
|                              [muscle gate]                   |
|                                      |                       |
|                              [muscle lever / exit]            |
+--------------------------------------------------------------+
```

The cleft is visible. The Ca²⁺ gate blocks the bridge until the terminal beat.
The nicotinic receptor is on the muscle side; the wrong receptor is a nearby
socket that rejects the ACh packet. The muscle gate is the exit to 05.

## 5. Puzzle rules

### 5.1 Release window

1. A player interacts with the motor terminal. The puzzle activates.
2. P1 steps on the **terminal plate**. This is the action-potential beat in the
   game abstraction. It starts the **Ca²⁺ window timer**.
3. When the timer elapses, the Ca²⁺ gate opens onto the cleft bridge. The gate is
   non-latched; it represents the Ca²⁺-dependent release window.
4. P2 picks up the **ACh packet** from the vesicle dock.

If P2 reaches the bridge before the Ca²⁺ gate opens, the gate blocks passage.
The agent says: "The terminal has not released yet. Trigger the terminal first."

### 5.2 Cross the cleft and bind

5. P2 carries the ACh packet across the cleft bridge.
6. P2 places the packet on the **nicotinic receptor**. The receptor is the
   matching socket; a nearby wrong receptor rejects the packet.
7. P1 pulses the terminal. The pulse is the release/receptor activation beat:
   it binds the packet to the receptor and opens the muscle gate. In the fiction,
   the pulse is the terminal signal that completes the release-to-binding event;
   it is not a second action potential in the biology, and the dialogue should
   not say it is.
8. The muscle gate opens and latches. The muscle lever contracts; the exit to 05
   opens.

### 5.3 ACh clearance

9. When the receptor binds, the **AChE timer** starts. After a short delay, the
   ACh packet is visually cleared and the HUD says "ACh cleared — the signal
   ends." The muscle gate stays latched; the contraction already happened.
10. The clearance is a visual/debrief beat. The player does not have to beat the
    timer to win; the response is already complete. This avoids a fail state
    while still teaching that ACh is broken down.

### 5.4 Win and reset

- **Win:** `gateOpen gate-muscle`.
- **Reset:** the ACh packet returns to the vesicle dock; the Ca²⁺ timer, Ca²⁺
  gate, receptor, AChE timer, and muscle gate reset; the terminal plate resets.
- **Softlock prevention:** a packet dropped out of bounds returns to the dock;
  a packet placed on the wrong receptor remains retrievable; reset is always
  available before the solve.
- **No fail state:** a late or wrong placement gives feedback, not a lost run.

## 6. Feedback and hints

| Trigger | Feedback | Evidence |
|---|---|---|
| P2 reaches the cleft before the Ca²⁺ window | "The terminal has not released yet." | Hint |
| Packet placed on the wrong receptor | "That receptor does not match the ACh packet." | `wrongReceptor` if supported; packet retrievable |
| Packet placed on the nicotinic receptor | "The receptor accepts ACh." | Progression |
| Terminal pulse binds the receptor | "The muscle membrane responds." | Progression |
| AChE timer elapses | "ACh is cleared; the signal ends." | Debrief |
| Player asks why the muscle does not move before binding | "The muscle responds only after the motor signal reaches the end plate." | Misconception feedback |

Authored hints:

1. "Trigger the terminal first; the Ca²⁺ window opens the cleft bridge."
2. "The ACh packet fits the nicotinic receptor, not the wrong socket."
3. "ACh is cleared after the response. The muscle has already contracted."

## 7. Reference graph

The full node/link shape is in
[`mechanics-and-evidence.md`](mechanics-and-evidence.md) §4.4. Summary:

```text
terminal-plate (player) --start--> ca-timer
ca-timer --elapsed--> ca-gate (non-latched, opens the bridge)
ach-packet (prop) --carried/placed--> nicotinic-receptor
pulse-terminal (pulseSource) --pulse--> nicotinic-receptor
nicotinic-receptor --bind--> muscle-gate (latched)
nicotinic-receptor --bind--> ache-timer (visual clearance)
```

The terminal plate is the action-potential beat; the pulse is the player action
that completes the release-to-receptor event. The Ca²⁺ window and the pulse are
two beats of the same puzzle, not two biological action potentials.

**M1.5 fit:** plate, timer, gate, prop, receptor, pulseSource. The `pulseSource`
must be within range of the terminal plate; the pulse cooldown must allow the
sequence. The HUD shows the cooldown per ADR-0043.

## 8. Evidence and assessment

Required evidence:

```json
[
  {
    "objectiveId": "OBJ-2",
    "event": "puzzle_solved",
    "filter": { "puzzleId": "puzzle-endplate-ferry" },
    "required": true
  },
  {
    "objectiveId": "OBJ-2",
    "event": "debrief_answered",
    "filter": { "promptId": "prompt-obj-2-nmj" },
    "required": true
  }
]
```

**Suggested debrief:** "What does Ca²⁺ do at the terminal, and why does ACh need
the nicotinic receptor?"

**Model answer:** "The action potential opens Ca²⁺ channels; Ca²⁺ triggers
vesicle release. ACh crosses the cleft and binds nicotinic receptors on the
muscle, which depolarises the muscle and causes contraction. AChE breaks down ACh
to end the signal."

**Optional advanced debrief:** "Why can the same neurotransmitter excite one
cell and inhibit another?" This is NERV-02#3 (advanced) and must not be required.

## 9. Co-op and solo

- **Co-op:** P1 operates the terminal plate and pulse; P2 carries and places the
  ACh packet. The roles are additive and match the current ferry.
- **Solo:** P1 uses the solo union. Step on the terminal plate, wait for the
  Ca²⁺ gate, carry the packet across, place it, then pulse the terminal. The
  pulse cooldown and the Ca²⁺ window must be authored so this sequence is
  comfortable.
- **No co-op-only route:** solo completes the same puzzle.
- **Tether:** `off`; the room is one screen around the cleft. The current ferry
  geometry already passes the one-screen guard; keep the new geometry similarly
  compact.

## 10. Rule-to-card ledger

| Rule | Player-visible claim | Card anchor | Depth | Required? |
|---|---|---|---|---|
| R1: terminal plate starts the release window | An action potential opens voltage-gated Ca²⁺ channels | NERV-02#2 | Core | Yes |
| R2: Ca²⁺ gate opens the cleft | Ca²⁺ enters and triggers vesicle fusion/release | NERV-02#2 | Core | Yes |
| R3: ACh packet crosses the cleft | A chemical synapse has a synaptic cleft | NERV-02#1 | Core | Yes |
| R4: ACh binds the nicotinic receptor | At the NMJ, ACh binds nicotinic receptors | NERV-02#5 | Core | Yes |
| R5: muscle responds after binding | ACh depolarises the muscle; contraction follows | NERV-02#5 | Core | Yes |
| R6: AChE clears ACh | Acetylcholinesterase breaks down ACh to end the signal | NERV-02#5 | Core | Yes |
| R7: wrong receptor rejects the packet | The effect depends on the receptor, not the transmitter alone | NERV-02#3 | Advanced | No |
| R8: clearance routes (reuptake, glial) | Neurotransmitters are cleared by several routes | NERV-02#6 | Advanced | No |

## 11. Anatomy fidelity notes

- The ACh packet is an **abstraction** for the released chemical message. The
  player carrying it across the cleft is not a literal vesicle transport. The
  dialogue should say "the packet stands for the ACh released from the vesicle."
- The terminal plate and pulse are **game beats**, not two action potentials.
  The card's order is: action potential → Ca²⁺ entry → vesicle fusion → ACh
  release → receptor binding. The puzzle preserves that order in its feedback.
- The receptor is **nicotinic** because the card's NMJ example uses nicotinic
  receptors. Do not generalise to all synapses or all ACh receptors.
- Do not use EPSP/IPSP or summation in the required dialogue or debrief. Those
  are NERV-02#3/#4 advanced.
- Do not claim ACh is the only neurotransmitter. The card limits itself to ACh
  and the general receptor rule.
- The AChE timer is illustrative; it is not a measured half-life.
- The muscle lever is a visual consequence; the level does not teach muscle
  contraction biochemistry (future `MUSC-02`, per the card).

## 12. Acceptance and playtest checks

- [ ] The player can order terminal → Ca²⁺ → release → cleft → receptor →
      muscle.
- [ ] The player says the muscle responds after the receptor binds, not before.
- [ ] The player can explain why ACh is cleared.
- [ ] Solo play works with the terminal plate, carry, place, and pulse sequence.
- [ ] The pulse cooldown is legible and does not stall the sequence.
- [ ] The wrong receptor is optional feedback, not a required advanced concept.
- [ ] The puzzle passes the M1.5 fit audit; no new mechanic.

## 13. Open questions

- Should the Ca²⁺ gate be a physical bridge gate or a visible channel opening? A
  bridge gate is more readable for co-op; a channel visual is more anatomical.
  Recommendation: channel visual plus a bridge gate for collision.
- Should the AChE timer actually close the Ca²⁺ gate, or only clear the packet?
  Keep it visual; the response is already complete. If it closes the gate after
  the solve, it must not close the muscle gate.
- Should the wrong receptor be a labelled "non-nicotinic receptor" or just a
  shape mismatch? Use a generic wrong socket to avoid teaching receptor subtypes
  beyond the card.
