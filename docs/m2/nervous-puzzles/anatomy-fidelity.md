# Anatomy fidelity ledger

**Status:** design proposal, 2026-10-27
**Purpose:** keep every puzzle rule inside the supplied card facts and the VG2
depth boundary.
**Companion:** [`README.md`](README.md) · [`mechanics-and-evidence.md`](mechanics-and-evidence.md)

## 1. Authority and scope

The three draft cards in `docs/shrinkonauts/base-game/cards/nervous/` are the
anatomy authority for this package:

- `NERV-01` — neuron structure and action potential
- `NERV-02` — synapse and neurotransmitter transmission
- `NERV-03` — stretch reflex arc (knee-jerk)

The card index, `cards/README.md`, and the cards' `Depth` sections define the
core/advanced split. The syllabus defines the objectives and the CON-8 transfer
frame. This package does not add facts.

The cards are marked `status: draft`. They are treated as the supplied design
authority, not as a claim that they are final medical content. If a card changes,
the affected rule and claim must be rechecked.

The package does **not** use a bone or joint innervation card. No such card
exists in the supplied directory, and the card README says the bone/joint cards
are pending the volume-1 source. Levels 01 and 02 therefore do not make claims
about nerves inside bone or joint capsules.

## 2. Card facts and depth

### 2.1 NERV-01 — neuron structure and action potential

| Fact | Depth | Canonical claim | Puzzle use |
|---|---|---|---|
| #1 | Core | A neuron has dendrites, a soma, one axon, and axon terminals; information flows dendrite → soma → axon → terminal. | 01 Sheath Gate; 03 Node Run |
| #2 | Advanced | The axon begins at the axon hillock/initial segment, where the action potential is generated. | Visual landmark only; not required |
| #3 | Core | Myelin is a lipid-rich sheath made by glial cells; gaps are nodes of Ranvier; myelin speeds conduction. | 01 Sheath Gate; 03 optional scan/debrief |
| #4 | Advanced | Resting potential is about −70 mV; Na⁺ is higher outside, K⁺ higher inside; the Na⁺/K⁺ pump maintains gradients. | Not used in required content |
| #5 | Core | A stimulus opens Na⁺ channels; at threshold (about −55 mV) voltage-gated Na⁺ channels open and an action potential fires; it peaks about +30 mV, then K⁺ efflux repolarises. | 03 threshold phase |
| #6 | Core | Action potentials are all-or-none; stronger stimuli increase frequency, not amplitude; the refractory period keeps the signal one-way; myelinated axons use saltatory conduction, unmyelinated axons continuous conduction. | 01 myelin; 03 all-or-none/one-way |

**Core:** #1, #3, #5, #6. **Advanced:** #2, #4.

**Source notes carried from the card:** the book uses −70/−55/+30 mV as typical
values; exact values vary by cell. The book says "one, and only one, axon" but
notes anaxonic exceptions; the card uses the standard model. If the game shows
numbers, it must say "about" and must not imply that the values are universal.

### 2.2 NERV-02 — synapse and neurotransmitter transmission

| Fact | Depth | Canonical claim | Puzzle use |
|---|---|---|---|
| #1 | Core | A chemical synapse has a presynaptic axon terminal, synaptic vesicles, a synaptic cleft, postsynaptic receptors, and a postsynaptic cell. | 04 Endplate Ferry |
| #2 | Core | An action potential opens voltage-gated Ca²⁺ channels; Ca²⁺ enters the terminal and triggers vesicle fusion and neurotransmitter release into the cleft. | 04 Ca²⁺ gate/release step |
| #3 | Advanced | The neurotransmitter binds specific receptors; the effect depends on the receptor, not the transmitter alone. Ionotropic receptors are ligand-gated channels: Na⁺/Ca²⁺ entry gives an EPSP; K⁺ exit or Cl⁻ entry gives an IPSP. | Optional 04 debrief; not required |
| #4 | Advanced | Graded potentials summate spatially and temporally; if the sum reaches threshold at the initial segment, an action potential fires. | Not used in required content |
| #5 | Core | At the neuromuscular junction, ACh binds nicotinic receptors and depolarises the muscle; acetylcholinesterase breaks down ACh to end the signal. | 04 required solve and debrief |
| #6 | Advanced | Neurotransmitters are cleared by enzymatic degradation, neuronal reuptake, or glial reuptake; electrical synapses exist via gap junctions. | Optional 04 debrief; not required |

**Core:** #1, #2, #5. **Advanced:** #3, #4, #6.

**Source notes carried from the card:** the book's statement that a
neurotransmitter "will not bind to receptors for other neurotransmitters" is a
useful simplification; some cross-reactivity exists. The card limits itself to
ACh and the general receptor rule. The NMJ is described in the muscle chapter;
the card uses it only as the canonical example. The game must not generalise
from ACh/nicotinic to every synapse.

### 2.3 NERV-03 — stretch reflex arc (knee-jerk)

| Fact | Depth | Canonical claim | Puzzle use |
|---|---|---|---|
| #1 | Core | A tap on the patellar ligament stretches the quadriceps; the receptor is the muscle spindle. | 02 Stretch Gate; 05 Reflex Core |
| #2 | Core | The spindle's sensory axon enters the spinal cord through the dorsal root and synapses directly on the motor neuron that returns to the quadriceps; a two-neuron, monosynaptic arc. | 02 sensory leg; 05 spinal relay |
| #3 | Core | The motor axon leaves through the ventral root and signals the quadriceps; the muscle contracts and the lower leg extends. | 05 kick payoff |
| #4 | Advanced | A collateral inhibits the antagonist (hamstrings), so the leg can extend; standard physiology puts an inhibitory interneuron in this path. | Optional 05 brake/debrief; never required |
| #5 | Core | The brain is not required for the response; conscious perception is a separate, slower pathway. | 05 brain-later gate and debrief |

**Core:** #1, #2, #3, #5. **Advanced:** #4.

**Source notes carried from the card:** §14.3 describes the stretch reflex in
one paragraph; it does not use "monosynaptic" or name the inhibitory
interneuron. The direct connection is stated as "the axon from this receptor
structure will cause direct contraction." There is no dedicated stretch-reflex
figure. "Brain feels it after" is a teaching gloss supported by §12.3, not a
sentence in §14.3. The game should use "conscious perception is separate and
slower", not a measured latency.

### 2.4 Silicon transfer

Silicon has no nervous-system card. It uses the syllabus's `CON-8`
sensor–controller–actuator concept:

```text
Body:    receptor → sensory neuron → spinal cord → motor neuron → muscle
Hardware: sensor   → interrupt line → interrupt controller → CPU → actuator
```

The hardware labels are an analogy from the syllabus, not claims from a nervous
card. The biological side of the analogy is supported by NERV-03#5 (the brain is
not required for the response) and by the reflex sequence; it is not a claim
that a computer has a brain, a spinal cord, or a nervous system.

## 3. Cross-room claim ledger

Each row is a player-visible rule or feedback claim. The "card anchor" column
is the only source that may be cited in implementation.

| ID | Room / rule | Player-visible claim | Card anchor | Depth | Required? |
|---|---|---|---|---|---|
| SG-1 | 01 Sheath Gate: place sheaths on exposed axon gaps | Myelin is a sheath around an axon; gaps in the sheath are nodes. | NERV-01#3 | Core | Yes |
| SG-2 | 01: the signal travels from the dendrite side to the terminal side | Neurons carry information one way: dendrite → soma → axon → terminal. | NERV-01#1 | Core | Yes |
| SG-3 | 01: a myelinated path reaches the gate in time; the signal is not made larger | Myelin speeds conduction; the action potential is all-or-none. | NERV-01#3, #6 | Core | Yes |
| SG-4 | 01: the bone gate is a location, not a bone-innervation claim | No card fact says bone tissue is innervated. | None | — | Disclaimer |
| ST-1 | 02 Stretch Gate: tap the patellar ligament | A tap on the patellar ligament stretches the quadriceps. | NERV-03#1 | Core | Yes |
| ST-2 | 02: the spindle, not pain, is the stretch receptor | The receptor is the muscle spindle. | NERV-03#1 | Core | Yes |
| ST-3 | 02: sensory signal enters through the dorsal root | The spindle's sensory axon enters the spinal cord through the dorsal root. | NERV-03#2 | Core | Yes |
| ST-4 | 02: the puzzle stops at the spinal cord | The sensory neuron synapses directly on the motor neuron; the motor leg is shown later. | NERV-03#2 | Core | Yes |
| NR-1 | 03 Node Run: one input is below threshold | A stimulus must reach threshold for an action potential. | NERV-01#5 | Core | Yes |
| NR-2 | 03: two inputs trigger the spike | A game abstraction for reaching threshold; not a claim that two neurons are required. | NERV-01#5 | Core | Yes |
| NR-3 | 03: once triggered, the spike is full-size and latches | Action potentials are all-or-none; stronger stimuli increase frequency, not amplitude. | NERV-01#6 | Core | Yes |
| NR-4 | 03: extra inputs do not make a bigger spike | All-or-none. | NERV-01#6 | Core | Yes |
| NR-5 | 03: the axon is one-way | Information flows dendrite → soma → axon → terminal; the refractory period keeps it one-way. | NERV-01#1, #6 | Core | Yes |
| NR-6 | 03 debrief: myelin speeds conduction | Myelin speeds conduction; myelinated axons use saltatory conduction. | NERV-01#3, #6 | Core | Yes (debrief) |
| EF-1 | 04 Endplate Ferry: the terminal must fire before release | An action potential opens voltage-gated Ca²⁺ channels; Ca²⁺ triggers vesicle fusion and release. | NERV-02#2 | Core | Yes |
| EF-2 | 04: the signal crosses a cleft | A chemical synapse has a synaptic cleft between the terminal and the postsynaptic cell. | NERV-02#1 | Core | Yes |
| EF-3 | 04: the ACh packet fits the nicotinic receptor | At the NMJ, ACh binds nicotinic receptors. | NERV-02#5 | Core | Yes |
| EF-4 | 04: the muscle responds after the receptor binds | ACh binding depolarises the muscle; the muscle contracts. | NERV-02#5 | Core | Yes |
| EF-5 | 04: the signal ends when ACh is cleared | Acetylcholinesterase breaks down ACh to end the signal. | NERV-02#5 | Core | Yes |
| EF-6 | 04 optional debrief: a wrong receptor does not respond | The effect depends on the receptor, not the transmitter alone. | NERV-02#3 | Advanced | No |
| RC-1 | 05 Reflex Core: tap stretches the quadriceps | A tap on the patellar ligament stretches the quadriceps. | NERV-03#1 | Core | Yes |
| RC-2 | 05: the spindle is the sensor | The receptor is the muscle spindle. | NERV-03#1 | Core | Yes |
| RC-3 | 05: the sensory signal enters the dorsal root | The sensory axon enters through the dorsal root. | NERV-03#2 | Core | Yes |
| RC-4 | 05: the sensory neuron synapses directly on the motor neuron | Two-neuron, monosynaptic arc. | NERV-03#2 | Core | Yes |
| RC-5 | 05: the motor signal leaves the ventral root | The motor axon leaves through the ventral root and signals the quadriceps. | NERV-03#3 | Core | Yes |
| RC-6 | 05: the quadriceps contracts and the leg extends | The muscle contracts and the lower leg extends. | NERV-03#3 | Core | Yes |
| RC-7 | 05: the brain is not needed for the kick; it perceives later | The brain is not required for the response; conscious perception is separate and slower. | NERV-03#5 | Core | Yes |
| RC-8 | 05 optional brake: the antagonist is inhibited | A collateral inhibits the antagonist; standard physiology uses an inhibitory interneuron. | NERV-03#4 | Advanced | No |
| LC-1 | 05 Lesion Console: block the sensory neuron, motor neuron, spinal cord, or muscle | The arc has those components; a block prevents the response at or after the block. | NERV-03#2, #3, #5 | Core | Optional |
| SI-1 | Silicon: sensor → interrupt line → interrupt controller → CPU → actuator | The syllabus's CON-8 mapping. | CON-8 (syllabus) | Core | Yes |
| SI-2 | Silicon: the interrupt controller is the integration point, not the CPU | The controller is the "spinal cord" analogue in the syllabus mapping. | CON-8 (syllabus) | Core | Yes |
| SI-3 | Silicon: the reflex response can happen without a brain | The brain is not required for the reflex; use the loop, not a brain switch. | NERV-03#5 | Core | Yes |
| SI-4 | Silicon: CPU is not the brain | The syllabus maps the CPU to the motor output side, not to a brain. | None | — | Disclaimer |

## 4. Depth boundary

The rule is the existing syllabus rule: **VG2 required gates and debriefs use
core facts only**. Advanced facts may appear in optional scan targets or an
optional "deeper look" debrief, but they are not required for completion.

| Room | Required core facts | Optional advanced facts | Do not require |
|---|---|---|---|
| 01 Sheath Gate | NERV-01#1, #3, #6 | — | #2 axon hillock, #4 resting potential |
| 02 Stretch Gate | NERV-03#1, #2 | — | #4 reciprocal inhibition |
| 03 Node Run | NERV-01#1, #5, #6; #3 in debrief | — | #2, #4 |
| 04 Endplate Ferry | NERV-02#1, #2, #5 | #3 receptor specificity; #6 clearance routes | #4 summation |
| 05 Reflex Core | NERV-03#1, #2, #3, #5 | #4 reciprocal inhibition | #4 in the core solve |
| 05 Lesion Console | NERV-03#2, #3, #5 | #4 | — |
| Silicon | CON-8; NERV-03#5 analogy | — | Any nervous claim not in the cards |

### 4.1 Specific boundary calls

- **03 does not test summation.** The two-input threshold is a game
  abstraction. Spatial/temporal summation is NERV-02#4, an advanced synapse
  fact; do not use that term in the required 03 dialogue or debrief.
- **04 does not require the general receptor rule.** The required solve uses
  ACh/nicotinic from NERV-02#5 (core). The general "the receptor determines the
  effect" claim is #3 (advanced) and belongs only in an optional debrief.
- **05 does not require reciprocal inhibition.** The hamstring brake is
  optional; the core arc is the two-neuron monosynaptic path from #2. Do not
  make the kick fail without the optional brake.
- **01/02 do not introduce new bone/joint facts.** They reinforce NERV-01/03
  inside bone/joint rooms. The bone/joint objectives remain the main level's
  responsibility.

## 5. Misconceptions and where the design addresses them

| Misconception | Card | Puzzle beat | Debrief / feedback |
|---|---|---|---|
| "The signal travels both ways along the neuron." | NERV-01 | 03 one-way path; 01 dendrite-to-terminal route | "Dendrites receive; the axon conducts away; the refractory period keeps it one-way." |
| "A stronger stimulus makes a bigger action potential." | NERV-01 | 03 threshold gate and latched all-or-none spike | "Stronger stimuli increase frequency, not amplitude." |
| "Myelin makes the signal stronger." | NERV-01 | 01 myelin repair; 03 myelin scan/debrief | "Myelin speeds conduction; the spike is regenerated, not amplified." |
| "Neurons touch directly." | NERV-02 | 04 visible cleft; the packet must cross | "There is a synaptic cleft; chemical transmission crosses it." |
| "The neurotransmitter determines excitatory versus inhibitory." | NERV-02 | 04 optional wrong-receptor feedback | "The receptor determines the effect." (advanced, optional) |
| "A synapse is a simple relay." | NERV-02 | 04 required release/clearance sequence; optional debrief | "The postsynaptic cell must respond; summation is advanced/optional." |
| "The brain sends the reflex signal." | NERV-03 | 05 brain gate is locked until after the kick | "The spinal cord integrates the reflex; the brain perceives it later." |
| "The receptor is pain." | NERV-03 | 02/05 spindle is the stretch sensor | "A muscle spindle detects stretch; it is not a pain receptor." |
| "The reflex is one neuron." | NERV-03 | 05 two-neuron sensory/motor arc | "Two neurons and a synapse; the antagonist path is optional." |
| "Biology and technology have nothing in common." | CON-8 | Silicon controller route and transfer prompt | "Both are sensor → controller → actuator loops." |

The bone/joint misconceptions ("bones are dead scaffolding", "bones move
themselves") are addressed by the existing bone/joint level content, not by
these nervous puzzles. 01/02 must not claim to replace that content.

## 6. Representations and simplifications

The game is a simplified model. The following abstractions are intentional and
must be named in dialogue or debrief where they could otherwise mislead.

| Representation | What it stands for | What must not be claimed |
|---|---|---|
| Player-carried "signal token" | A propagating signal or a chemical message, depending on the room | That a literal action potential or vesicle is carried by a tiny astronaut |
| Removable myelin props | Myelin sheath segments on an axon | That myelin is a loose object a cell places by hand; that myelin amplifies the spike |
| "ACh packet" carried across the cleft | Vesicle release, diffusion, and receptor binding | That vesicles are carried across the cleft by motile cells; that ACh is the only neurotransmitter |
| Ca²⁺ gate | Voltage-gated Ca²⁺ entry triggering release | That Ca²⁺ is a physical gate the player opens; that Ca²⁺ is the only trigger |
| AChE timer | Enzymatic breakdown of ACh ending the signal | A measured half-life or a precise time course |
| Brain gate with a delay | Conscious perception is separate and slower | A measured reaction time; that the brain is absent or feels nothing |
| Two-input threshold | Reaching threshold | Spatial/temporal summation of EPSPs/IPSPs (advanced NERV-02#4) |
| Spinal relay | Direct sensory-to-motor synapse in the stretch reflex | A brain decision; a polysynaptic chain; a general spinal-cord model |
| Gates, plates, relays, timers | Game logic for anatomical events | Anatomical valves or literal neural circuits |
| Silicon controller/CPU/actuator | A control-loop analogy | That a computer has a brain, spinal cord, or nervous system |
| One-screen scale | A readable game space | Actual cell size, conduction distance, or response latency |

### 6.1 The 01 "nerve in the Bone Gate" disclaimer

The Bone Gate is a level landmark. The nerve bundle in Sheath Gate is a
level-fiction service corridor, not a statement that bone tissue is innervated.
The player-visible claim is limited to a myelinated axon. Do not add a bone-nerve
fact, a periosteal receptor, or a "bones have nerves" line without a new context
card and a source review.

### 6.2 The 02 "spindle in the Joint Chamber" disclaimer

The muscle spindle is in the quadriceps, not in the joint capsule. The Joint
Chamber can show the knee, patellar ligament, quadriceps, and a spindle in the
muscle. Do not say "the joint senses stretch" or "the joint capsule is the
receptor." The room is the setting; the sensor is the muscle spindle
(NERV-03#1).

### 6.3 The 05 "brain later" claim

The card says the brain is not required for the response and conscious
perception is a separate, slower pathway. The game can show a brain-side gate
that opens after the kick. It must not claim:

- that the brain is completely inactive during the reflex;
- that the brain feels nothing;
- a specific delay in milliseconds;
- that the brain is "the villain" or "asleep".

The safe wording is: "The spinal cord can complete the response before conscious
perception catches up."

## 7. Do-not-claim list

Do not put any of these in dialogue, gates, scans, debriefs, or marketing copy
for this slice:

- Bone tissue is innervated by the nerve in 01.
- The joint capsule is the stretch receptor in 02.
- The brain sends the knee-jerk signal.
- The brain is absent from the reflex or feels nothing.
- A stronger stimulus makes a bigger action potential.
- Myelin makes the action potential stronger.
- Myelin is made by neurons.
- ACh is the only neurotransmitter, or every receptor is nicotinic.
- The synapse is a simple relay with no postsynaptic response.
- EPSP/IPSP summation is part of the VG2 core.
- The reflex arc is one neuron.
- The hamstring reciprocal inhibition is required for the core kick.
- The CPU is the brain, or the interrupt controller is literally a spinal cord.
- The game is a medical simulator, diagnostic tool, or full nervous-system
  curriculum.
- The playtest proves exam-score improvement.

## 8. Source notes and conflicts

### 8.1 Card source notes

- NERV-01 uses OpenStax A&P §12.2 and §12.4. The exact mV values vary by cell;
  the card uses typical values. The "one axon" rule has anaxonic exceptions;
  the card uses the standard model.
- NERV-02 uses §12.5. The card's neurotransmitter/receptor specificity is a
  deliberate simplification; it limits itself to ACh and the general receptor
  rule. The NMJ is a muscle-chapter example, not a full muscle-contraction
  model.
- NERV-03 uses §14.3, §13.4, and §12.3. §14.3 describes the stretch reflex in
  one paragraph and does not use "monosynaptic" or name the inhibitory
  interneuron; the card's source notes mark these as standard terminology or
  standard physiology. There is no dedicated stretch-reflex figure.
- Silicon has no card. CON-8 comes from the syllabus, not from OpenStax.

### 8.2 Documentation conflicts

1. **EV-5 numbering.** `syllabus.md` §7 uses EV-5 for playtest observation and
   EV-6 for co-op talk. The machine-readable syllabus and `traceability.md` use
   EV-5 for the Silicon transfer. This package uses event/objective references
   for Silicon and does not choose a winner. See `README.md` §9.1.
2. **EV-2 prose.** Some prose still says "gate attempts and answers", while
   ADR-0039 and M1.5 use the puzzle as the assessment source. This package
   follows the newer authority and does not re-audit M1.5.
3. **Silicon level vs pack.** Traceability lists `silicon-fixture` as a level;
   architecture/requirements describe the fixture as proof of the pack boundary.
   The puzzle rules are pack-agnostic; placement is an open M2 decision.

### 8.3 Non-English text

No non-English source text is quoted in this package. The underlying card
sources are English. If a later edit cites the Norwegian Udir competence aims,
quote them verbatim and keep the existing working translations separate.

## 9. Fidelity review checklist

Before a room is marked ready:

- [ ] Every required rule cites at least one core card fact.
- [ ] Every advanced fact is optional and labelled.
- [ ] No claim goes beyond the cited fact or the CON-8 syllabus frame.
- [ ] Every abstraction in the room appears in §6 with a "do not claim" note.
- [ ] The room's misconception is surfaced before or during the puzzle, not only
      in a post-hoc text.
- [ ] The debrief asks for an explanation or prediction, not a label.
- [ ] The room does not imply bone/joint innervation unless a new card exists.
- [ ] The Silicon room does not imply CPU-as-brain.
- [ ] The 01/02 optional puzzles do not lock the critical path.
- [ ] The implementation does not add a mechanic that is absent from the
      M1.5 audit.
