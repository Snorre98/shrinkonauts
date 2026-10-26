# 02 — Joint Chamber: Stretch Gate

**Status:** design proposal
**Level ID:** `02-joint-chamber`
**Puzzle ID:** `puzzle-stretch-gate`
**Role:** optional nervous-system bridge, recommended after 04
**Objective:** OBJ-1 (optional evidence); primary level objective remains the
existing OBJ-1 joint content
**Concepts:** CON-5 sensory and motor pathways
**Card facts:** NERV-03#1, #2 (core)
**Activation:** `interact` at the joint console
**Tether:** `off`
**Win:** `gateOpen gate-dorsal`

## 1. Learning target

The player can explain:

- a tap on the patellar ligament stretches the quadriceps;
- the **muscle spindle** is the stretch receptor, not a pain receptor;
- the spindle's sensory axon enters the spinal cord through the **dorsal root**;
- this puzzle stops at the spinal cord; the motor leg and the bypass come in 05.

The puzzle is a sensory-path bridge between the joint room and the reflex core.
It does not teach the full reflex and does not require the brain or a motor
neuron.

## 2. Why this is optional

NERV-03 builds on NERV-01 and NERV-02. A required reflex puzzle in 02 would run
ahead of the card sequence. The side puzzle is recommended after 04, when the
player has met the neuron and synapse. It reinforces the sensory half of the arc
before 05 integrates it.

The Joint Chamber is a knee/hinge setting. The spindle is in the quadriceps, not
in the joint capsule; the room must show that distinction.

**Access:** a side alcove or a Synoviocyte dialogue condition can open after 04.
The puzzle is `interact`-activated and optional for the level exit.

## 3. Fiction and setup

The joint is locked in a test rig. The Synoviocyte agent explains:

> "The hinge moves, but the sensor is not in the joint. The muscle spindle sits
> in the quadriceps and reports stretch. Tap the patellar ligament, then follow
> the sensory line through the dorsal root. Stop at the spinal cord — the motor
> answer is another room."

The player sees the patella, quadriceps, patellar ligament, a spindle in the
muscle belly, and a dorsal-root door. There is no brain door and no muscle
contraction in this room.

## 4. Spatial layout

```text
+--------------------------------------------------------------+
|  Joint Chamber                                               |
|                                                              |
|   [quadriceps]                                                |
|       |  (muscle spindle)                                     |
|       |        [spindle gate] --> [sensory token]             |
|       |                                                       |
|  [patella] -- [patellar ligament] -- [tap plate]             |
|       |                                                       |
|  [brace plate]                     [dorsal plate] <-- token  |
|       |                                   |                  |
|       +---- joint console                 +--> [dorsal gate]  |
+--------------------------------------------------------------+
```

The brace and tap plates are close enough to read as one test rig but not so
close that the player can stand on both. The spindle gate releases a sensory
token; the token path leads to the dorsal plate. The dorsal gate is the win and
the visual "spinal cord entrance" — not the full spinal cord room.

## 5. Puzzle rules

### 5.1 Align and tap

1. A player interacts with the joint console. The puzzle activates.
2. A player steps on the **brace plate** to set the knee in the test position.
   The brace trigger latches once; the player does not have to keep standing on
   the plate.
3. A player steps on the **tap plate** to tap the patellar ligament. If the
   brace trigger is set, the stretch relay opens the spindle gate. If not, the
   tap gives "The knee is not braced — the tap cannot stretch the quadriceps."
4. The spindle gate latches open. The sensory token is now reachable.

The brace is a game abstraction for holding the joint in a position where the
tap transmits stretch. It is not a claim that the knee must be physically
clamped for a real reflex.

### 5.2 Carry the sensory signal

5. The carrier picks up the **sensory token** at the spindle.
6. The carrier takes it through the dorsal-root passage and drops or pushes it
   onto the **dorsal plate**. The plate ignores a carried token, so the carrier
   must release it on the plate. The token represents the sensory signal, not a
   literal action potential.
7. When the dorsal plate detects the token, the dorsal gate opens and latches.
   The puzzle is solved.

### 5.3 Win and reset

- **Win:** `gateOpen gate-dorsal`.
- **Reset:** the token returns to the spindle; the brace trigger, stretch relay,
  spindle gate, and dorsal gate reset; the tap/brace plates reset.
- **Softlock prevention:** a dropped token out of bounds returns to the spindle;
  the token remains retrievable if the player carries it away from the dorsal
  plate; reset is always available before the solve.
- **No fail state:** a bad tap or a dropped token gives feedback, not a lost
  run.

## 6. Feedback and hints

| Trigger | Feedback | Evidence |
|---|---|---|
| Tap without brace | "The knee is not braced; the tap cannot stretch the quadriceps." | Hint; no penalty |
| Tap with brace | Spindle gate opens; "The spindle fires." | Progression |
| Token reaches dorsal plate | Dorsal gate opens; "The sensory signal reaches the spinal cord." | `puzzle_solved` (optional) |
| Player tries to find the brain in this room | Agent: "Not here. The motor answer is in the reflex core." | Scope hint |

Authored hints:

1. "The receptor is the muscle spindle in the quadriceps, not the joint
   capsule."
2. "Set the brace first, then tap the patellar ligament."
3. "The dorsal root is the sensory entrance. Carry the signal there."

## 7. Reference graph

The full node/link shape is in
[`mechanics-and-evidence.md`](mechanics-and-evidence.md) §4.2. Summary:

```text
brace-plate (press) ---> brace-trigger (once) ---activate--+
                                                          |
tap-plate (held) -------------------------------activate-+--> stretch-relay (allOf)
                                                                  |
                                                                  open
                                                                  v
                                                            spindle-gate (latched)
                                                                  |
                                                          releases sensory-token
                                                                  |
dorsal-plate (detects prop) ---------------------------open------> dorsal-gate (latched)
```

The brace trigger is deliberately latched so solo play is possible: one player
can set the brace, step off, and tap. Co-op can split the two actions, but does
not get a different solution.

**M1.5 fit:** plates, trigger, relay, gates, prop. No new nodes or links.

## 8. Evidence and assessment

Optional OBJ-1 evidence:

```json
{
  "objectiveId": "OBJ-1",
  "event": "puzzle_solved",
  "filter": { "puzzleId": "puzzle-stretch-gate" },
  "required": false
}
```

The scan of the spindle and dorsal root can reveal CON-5 for the concept log. The
puzzle does not replace the joint scan or the Joint Chamber's main OBJ-1
evidence.

**Suggested debrief:** "What senses the stretch, and which root carries the
signal into the spinal cord?"

**Model answer:** "The muscle spindle in the quadriceps senses the stretch. Its
sensory axon enters the spinal cord through the dorsal root."

Do **not** ask "what does the brain do?" in this room; that belongs to 05.

## 9. Co-op and solo

- **Co-op:** P1 can set the brace; P2 taps and carries the token. Either player
  can interact with the console.
- **Solo:** set the brace (latched trigger), step off, tap the plate, pick up the
  token, and carry it to the dorsal plate. The latched trigger is essential; do
  not require a player to hold two plates at once.
- **No co-op-only route:** the same sequence works with one body.

## 10. Rule-to-card ledger

| Rule | Player-visible claim | Card anchor | Depth | Required? |
|---|---|---|---|---|
| R1: tap the patellar ligament | A tap stretches the quadriceps | NERV-03#1 | Core | Yes |
| R2: the spindle is the receptor | The muscle spindle detects stretch; it is not pain | NERV-03#1 | Core | Yes |
| R3: the sensory axon enters the dorsal root | The spindle's sensory axon enters through the dorsal root | NERV-03#2 | Core | Yes |
| R4: the puzzle stops at the spinal cord | The sensory neuron synapses directly on the motor neuron; the motor leg is later | NERV-03#2 | Core | Yes |
| R5: the joint is the setting, not the sensor | The spindle is in the quadriceps, not the joint capsule | NERV-03#1 | Core | Disclaimer |

## 11. Anatomy fidelity notes

- The receptor is a **muscle spindle** in the quadriceps. Do not label the joint
  capsule, patella, or ligament as the receptor.
- The patellar ligament is the stimulus site, not the sensor.
- The dorsal root is sensory. The ventral root is motor; it is not shown here.
- The player-carried "sensory token" is an abstraction for the sensory signal.
  Do not say a literal action potential is a physical object.
- Do not claim the brain is uninvolved; this room simply stops before the
  motor/brain part. The full claim belongs to 05.
- Do not add a joint-innervation fact without a new card and source review.

## 12. Acceptance and playtest checks

- [ ] The player points to the quadriceps/spindle, not the joint capsule, as the
      receptor.
- [ ] The player says the dorsal root is sensory.
- [ ] The player does not expect the leg to kick in this room; the scope is
      clear.
- [ ] Solo play works because the brace trigger latches.
- [ ] The puzzle is optional and does not block the Joint Chamber exit.
- [ ] The room has no joint-innervation claim.
- [ ] The puzzle passes the M1.5 fit audit; no new mechanic.

## 13. Open questions

- Should the brace be a physical lever prop or a plate? A plate is enough for the
  M1.5 fit; a lever prop would add physicality without a new mechanic.
- Should the sensory token be a glowing "signal" or a named "stretch signal"?
  Label it as an abstraction in the UI.
- Should the puzzle be available only after 04, or also as a preview? Recommended:
  after 04, so the card prerequisites are met.
