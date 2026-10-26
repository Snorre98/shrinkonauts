# 01 — Bone Gate: Sheath Gate

**Status:** design proposal
**Level ID:** `01-bone-gate`
**Puzzle ID:** `puzzle-sheath-gate`
**Role:** optional nervous-system reinforcement, recommended after 03
**Objective:** OBJ-1 (optional evidence); primary level objective remains the
existing OBJ-1 bone content
**Concepts:** CON-3 neuron structure
**Card facts:** NERV-01#1, #3, #6 (core)
**Activation:** `interact` at a repair terminal
**Tether:** `off`
**Win:** `gateOpen gate-sheath`

## 1. Learning target

The player can explain, in plain language:

- a neuron carries information one way: dendrite → soma → axon → terminal;
- myelin is a sheath around the axon, with gaps at the nodes of Ranvier;
- myelin speeds conduction; it does not make the action potential bigger.

The puzzle is a short reinforcement of the myelinated axon. It is not the
Bone Gate's primary assessment, and it does not add a bone-innervation fact.

## 2. Why this is optional

The supplied nervous card set has no bone card and no bone-innervation fact. The
Bone Gate is therefore a setting, not an anatomical claim about nerves inside
bone. The side puzzle is recommended after 03, when NERV-01 has been introduced.
It can be cut without breaking the critical path.

**Access:** the repair terminal can be placed behind a short side passage that
opens after 03, or the Osteocyte dialogue can gate the interaction with a
`hasFlag` condition. The puzzle itself uses `interact` activation, so it does
not tick until a player starts it.

## 3. Fiction and setup

The Bone Gate is a load-bearing passage. A service nerve runs through the gate
wall; its myelin has stripped away, so the signal is too slow to reach the
terminal before the gate's repair window closes. The Osteocyte agent explains:

> "This nerve is not part of the bone. It is a service line running through the
> gate. The axon is bare at the gaps, and the signal is losing time. Wrap the
> exposed segments before the window closes."

The line "this nerve is not part of the bone" is deliberate. It keeps the level
fiction from becoming a bone-innervation claim.

## 4. Spatial layout

```text
+--------------------------------------------------------------+
|  Bone Gate wall                                              |
|                                                              |
|  [dendrite plate] --- bare axon --- [gap a] -- [gap b] --    |
|        |                               |        |            |
|        |                          [gap c]       |            |
|        |                               |        |            |
|        +---- conduction timer          +--------+--> [gate]  |
|                                                              |
|  repair terminal (interact)     myelin props on a rack       |
+--------------------------------------------------------------+
```

The room is one screen. The axon is a readable side path, not a maze. The gate
is visible from the repair terminal so the player understands the goal. The
myelin props sit on a rack within reach; no prop starts out of bounds.

## 5. Puzzle rules

### 5.1 Start

1. A player interacts with the repair terminal. The puzzle activates.
2. The HUD shows: "Repair the myelin before the signal window closes."
3. The agent dialogue has already introduced myelin, nodes, and one-way
   conduction. The puzzle does not require the player to recall the dialogue
   verbatim; labels and a scan remain available.

### 5.2 Repair

4. Three **myelin sheath** props are available at the rack.
5. The player carries each sheath to one of the three exposed gaps and drops or
   pushes it onto the gap plate. A gap accepts any sheath; the puzzle is about
   completing the insulation, not about a hidden correct sheath order. The plate
   ignores a carried prop, so the player must release it on the gap.
6. The player may position the sheaths in any order. The axon visual changes from
   bare to insulated at each completed gap.

### 5.3 Conduction window

7. The player steps on the **dendrite plate** to start the conduction timer
   and latch the signal trigger. The timer represents the time the signal takes
   to travel the axon; it is a pacing window, not a measured conduction velocity.
8. If the signal has started, all three gaps are insulated, and the timer has not
   elapsed, the completion relay opens the gate. The gate latches; the puzzle is
   solved.
9. If the timer elapses before all three gaps are insulated, the gate stays
   closed. The HUD says "Signal arrived too late — the axon is still bare at a
   gap." The player can reset the puzzle and try again; props return to the rack
   and the timer/counter state resets.

### 5.4 Win and reset

- **Win:** `gateOpen gate-sheath`.
- **Reset:** all three myelin props return to the rack; the conduction timer and
  relays reset; the gate closes if it was not latched.
- **Softlock prevention:** a prop dropped out of bounds returns to the rack;
  a prop dropped on a gap remains retrievable until the gate is latched; reset
  is always available before the solve.
- **No fail state:** the late window is feedback, not a death or a lost run.

## 6. Feedback and hints

| Trigger | Feedback | Evidence |
|---|---|---|
| Timer elapses with a bare gap | "Signal arrived too late — one gap is still bare." | Reset available; no penalty |
| All gaps insulated before timer | Gate opens; "The signal jumps node to node and reaches the terminal." | `puzzle_solved` (optional) |
| Player scans the axon | Myelin/node labels; NERV-01#3 | Concept log |
| Player tries the terminal before the repair | "The gate is waiting for a complete signal." | Hint |

Authored hints:

1. "Myelin is the wrap; the gaps between wraps are the nodes. Cover the bare
   segments."
2. "The window starts when you step on the dendrite plate. Finish the wraps
   before it closes."
3. "Myelin speeds the signal. It does not make the spike stronger."

## 7. Reference graph

The full node/link shape is in
[`mechanics-and-evidence.md`](mechanics-and-evidence.md) §4.1. Summary:

```text
gap-a/b/c (plates, detect prop) --activate--> myelin-relay (allOf)
dendrite-plate (press) ----------start------> conduction-timer
dendrite-plate (press) ----------press------> signal-trigger (once)
signal-trigger ------------------activate---> complete-relay (allOf)
conduction-timer ----------------activate---> window-relay (not)
myelin-relay -------------------activate---> complete-relay
window-relay -------------------activate---> complete-relay
complete-relay -----------------open-------> gate-sheath (latched)
```

The `not` relay is active while the timer has not elapsed. The completion relay
therefore requires three things: the signal has started, all sheaths are in
position, and the window is still open. The latched gate records the solve.

**M1.5 fit:** `prop`, `plate`, `relay`, `timer`, `gate`; no new nodes or links.

## 8. Evidence and assessment

This puzzle is optional for the level exit. If the level uses it as OBJ-1
evidence, the rule is:

```json
{
  "objectiveId": "OBJ-1",
  "event": "puzzle_solved",
  "filter": { "puzzleId": "puzzle-sheath-gate" },
  "required": false
}
```

The scan of the axon can reveal CON-3 for the concept log. The puzzle does not
replace the bone scan or the Bone Gate's main OBJ-1 evidence.

**Suggested debrief:** "Why does myelin speed conduction without making the
action potential bigger?"

**Model answer:** "Myelin insulates the axon and lets the signal regenerate at
the nodes, so it travels faster. The action potential is all-or-none; the
amplitude at each node is not increased."

## 9. Co-op and solo

- **Co-op:** P1 can hold the dendrite plate to start the window; P2 carries and
  drops/pushes the sheaths onto the gaps. P2 can also start the window and carry;
  either player can interact with the terminal.
- **Solo:** P1 has the solo union. Step on the dendrite plate, then carry and
  drop/push all three sheaths before the timer. The window must be generous
  enough for one body to do this; playtest the duration.
- **No co-op-only route:** a solo player can complete the same repair.

## 10. Rule-to-card ledger

| Rule | Player-visible claim | Card anchor | Depth | Required? |
|---|---|---|---|---|
| R1: place sheaths on bare gaps | Myelin insulates the axon; gaps are nodes | NERV-01#3 | Core | Yes |
| R2: signal travels dendrite → terminal | Neurons carry information one way | NERV-01#1 | Core | Yes |
| R3: the myelinated path arrives in time | Myelin speeds conduction | NERV-01#3, #6 | Core | Yes |
| R4: the late signal is not "weaker" | All-or-none; myelin is not amplification | NERV-01#6 | Core | Yes (feedback/debrief) |
| R5: the bone gate is only a setting | No bone-innervation claim | None | — | Disclaimer |

## 11. Anatomy fidelity notes

- The puzzle is about a **myelinated axon**, not about bone tissue. The Bone Gate
  is a location, not an anatomical structure inside the nerve.
- The player-carried myelin sheath is an abstraction. Real myelin is a
  glial-cell membrane wrap, not a loose object. The dialogue and debrief should
  say "wrap" or "sheath", not "a cell carries myelin by hand."
- The timer is a pacing window, not a measured conduction velocity. Do not claim
  a speed in m/s or a real time.
- Do not say "myelin makes the signal stronger." The card's misconception is
  exactly that; the debrief corrects it.
- Do not add a periosteal receptor, bone-nerve fact, or "bones have nerves" line
  without a new card and source review.

## 12. Acceptance and playtest checks

- [ ] The player can explain one-way flow after the puzzle.
- [ ] The player can identify myelin and a node of Ranvier.
- [ ] The player does not say myelin makes the spike bigger; the debrief
      corrects it if they do.
- [ ] The window is generous enough for solo play but still creates a pace.
- [ ] The repair terminal is reachable after 03 and does not block the level
      exit.
- [ ] The room has no bone-innervation claim.
- [ ] The puzzle passes the M1.5 fit audit; no new mechanic.

## 13. Open questions

- Should the side puzzle be visible before 03 but refuse to start, or hidden
  behind a short side passage? Recommendation: hidden or dialogue-gated, so the
  player meets NERV-01 in 03 first.
- Should the player see the timer as a bar, a pulse animation, or both? The
  accessibility baseline requires a text/non-colour cue.
- Should the optional evidence count toward the OBJ-1 concept log if the player
  skips the bone scan? It can reveal CON-3, but it does not replace the bone
  evidence.
