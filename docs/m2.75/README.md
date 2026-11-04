# M2.75 — Nerve Forest Concept Rescope

**Status:** scaffold — problem framing and option space only. No solution selected.
**Date:** 2026-11-03
**Owner:** Snorre
**Scope:** `03-nerve-forest` learning design, puzzle abstraction, scan/content model, visual ontology, and the asset brief that follows from them.
**Not in scope:** final puzzle implementation, final art, engine changes, curriculum rewrite, or new runtime features.
**Why this exists:** the current room mixes a cell, a part of a cell, and a process/route as if they were peer objects; it carries more concepts than one small puzzle can assess; and its “inside a neuron” metaphor is very literal. Before more art or content is commissioned, the room needs a focused conceptual redesign.

---

## 0. How to use this document

This is a **decision scaffold**, not a specification.

- It captures the problem, the evidence, the tensions, and several possible directions.
- It does **not** choose a direction.
- The options are prompts for focused work and playtesting, not proposals to implement.
- The output of M2.75 is a short decision record plus a revised level/asset brief, not code or final art.
- If a direction is chosen later, it should be recorded in an ADR and then handed to implementation.

---

## 1. Why M2.75 exists

The current 03 Nerve Forest room was designed as a literal journey through a neuron:

- dendrite input plates;
- a soma/trigger-zone gate;
- an axon catwalk;
- myelin-node platforms;
- a terminal exit gate;
- optional scan markers for “neuron”, “myelin”, and “pathway”.

That produced a coherent-looking room, but the conceptual model underneath it is unstable:

- **Myelin is a part of a neuron**, not a peer of the neuron.
- **“Pathway” is ambiguous**: it can mean one-way conduction along a single axon (a process), or a sensory → spinal cord → motor route (a multi-cell system). The room uses the word for both.
- The room asks the scan system to teach cell structure, a part, a process, a route, and threshold/all-or-none facts as if they were the same kind of thing.
- The required puzzle assesses only a subset of that material; the rest is optional lore or decoration.
- The visual assets inherit the same confusion: a neuron icon, a myelin icon, and a pathway icon become three similar “cell-like” objects when the underlying ideas are an entity, a part, and a process.

The result is not a small art problem. It is a learning-design and representation problem. M2.75 exists to resolve it before the next art, prompt, or room pass.

### 1.1 Milestone boundary

| In scope | Out of scope |
|---|---|
| Problem framing, ontology audit, and option space | Final puzzle implementation |
| A single learning contract for 03 | Final art or prompt generation |
| The CON-3/CON-5 boundary decision | Curriculum rewrite outside 03/05 |
| Paper tests and a playtest plan | Engine or runtime feature work |
| An asset-delta decision | Commissioning new assets |
| An ADR and revised 03 brief | Shipping the redesign |

M2.75 does not supersede M2 wholesale. It may revise the 03 portion and the asset brief that depends on it.

---

## 2. Problem statement

### 2.1 The surface symptom

The player sees several neuron-like objects in one screen:

- the Neuron Keeper;
- two dendrite input plates;
- a neuron scan marker;
- a myelin scan marker;
- a one-way pathway scan marker;
- an axon terminal plate.

The icons and labels ask the player to distinguish entities that are not on the same conceptual level. The current silhouette test can make the *shapes* distinct, but it cannot make the *categories* correct.

### 2.2 The ontology problem: entity, part, process, route

The room currently treats these as peer scan targets:

| Current object | What it actually is | Why the peer-object model fails |
|---|---|---|
| Neuron | A cell/entity | This one is legitimately an object. |
| Myelin | A part of the neuron (a sheath around the axon) | A separate “myelin object” implies myelin exists apart from the cell. The player can scan “myelin” without seeing it as part of the neuron. |
| Pathway | A process (one-way conduction) **or** a route (sensory/motor circuit) | The word hides two different ideas. A process is not an object; a route is not a single cell. |

A more precise vocabulary would separate:

- **Entity:** neuron, glial cell, muscle fibre.
- **Part:** soma, dendrite, axon, myelin sheath, node of Ranvier, axon terminal.
- **Process:** threshold, action potential, all-or-none firing, saltatory conduction, one-way propagation.
- **Route:** receptor → sensory neuron → spinal cord → motor neuron → muscle.
- **Observation:** scan, inspect, trace, measure.

The current room mixes these levels: it turns parts and processes into places, gates, and scan objects. That can be a powerful metaphor, but only if the design is deliberate about which level the player is on.

### 2.3 The load problem: too many ideas for one small puzzle

The current room’s material includes:

| Idea | Current delivery | Is it assessed by the required puzzle? |
|---|---|---|
| Neuron parts (dendrites, soma, axon, terminal) | Keeper dialogue, scan, room layout | Partly, through movement; not formally assessed |
| Threshold | Two input plates, dialogue, debrief | Yes |
| All-or-none | Threshold counter, dialogue, debrief | Yes |
| One-way conduction | Behind gate, route, dialogue | Partly, through movement |
| Myelin speeds conduction | Myelin catwalk, optional scan/debrief | No required action |
| Saltatory conduction | Optional scan/debrief | No |
| Sensory/motor pathway | CON-5 label, optional scans, dialogue claim | No |
| Reflex arc | Reserved for 05 | No |

The required puzzle is essentially a threshold/all-or-none puzzle. The other ideas are exposed but not assessed. That is not automatically wrong — a room can expose more than it tests — but the room currently presents the optional material as if it were equally central. The player is asked to hold too many nouns at once.

### 2.4 The literalism problem

The room is “inside a neuron” and turns anatomy into platforming architecture:

- dendrites become input plates;
- the axon becomes a catwalk;
- myelin becomes stepping stones;
- the terminal becomes a gate;
- the threshold becomes a gate latch.

This is vivid, but it is almost a one-to-one illustration of a diagram. The player may learn the room layout rather than the biology. A more abstract representation might create better transfer: the player should recognize the *pattern* (threshold, all-or-none, one-way flow) in a new context, not memorize the room’s literal body parts.

The unresolved question is not “literal or abstract?” but **which level of abstraction belongs to 03**, and which levels belong to 04/05.

### 2.5 The assessment problem

What does the player actually have to do to prove the learning?

- Press two inputs instead of one.
- Run right along the axon.
- Open the terminal gate.
- Answer a debrief prompt about threshold and all-or-none.

The puzzle does not require the player to use myelin, saltatory conduction, neuron-part vocabulary, or a sensory/motor route. The room’s concept list and scan set overclaim what the required path assesses. This is the gap between **exposure**, **practice**, and **assessment**.

### 2.6 The asset problem

The current asset question — “do we need a neuron, a myelin, and a pathway icon?” — is a symptom of the ontology problem.

If the room teaches **cell structure**, the right visual unit is one cell with inspectable parts, not three peer objects.

If the room teaches **one-way conduction**, the right visual unit is a process/route diagram, not a second cell icon.

If the room teaches **myelin**, myelin should be a highlighted part of the neuron or a close-up of the axon, not a standalone creature.

The asset set should follow the chosen learning model. It should not drive it.

The current three-icon set is provisional. The existing prompts, placeholders, and silhouette test are useful evidence, but they are not a commitment to the current taxonomy.

| Current asset | Ontological category | Current visual form | The mismatch |
|---|---|---|---|
| `sprite.scan.neuron` | Entity (a cell) | Cell icon | Legitimately an object. |
| `sprite.scan.myelin` | Part of a cell | Separate cell-like icon | Implies myelin is a peer of the neuron. |
| `sprite.scan.pathway` | Process (one-way) or route (multi-cell) | Separate cell-like icon | A process/route is drawn as another cell. |
| `sprite.pad.dendrite` | Part / place | 64×64 interactable | A part becomes a platform. |
| `sprite.pad.terminal` | Part / place | 64×64 interactable | A part becomes a destination. |
| `sprite.agent.neuron` | Entity / character | Character sprite | The only unambiguous cell-as-character. |

This table is the shortest version of the problem: the asset set is a taxonomy of unlike things presented as like things.

---

## 3. Current state and evidence

### 3.1 What the room currently does

| Entity | Current role | Current fact/concept |
|---|---|---|
| `agent-neuron` | Neuron Keeper, narrative NPC | CON-3 context |
| `scan-neuron` | Optional scan | NERV-01#1 (neuron parts and direction) |
| `scan-myelin` | Optional scan | NERV-01#3 (myelin sheath, nodes, speed) |
| `scan-pathway` | Optional scan | NERV-01#6 (all-or-none, one-way, saltatory) |
| `pad-input-a/b` | Threshold plates | Interactables; no scan |
| `pad-terminal` | Terminal plate | Interactable; no scan |
| Keeper dialogue | CON-3, CON-5, NERV-01#5 | Narrative + fact |
| Required puzzle | Threshold, all-or-none, one-way route | Evidence/debrief |

### 3.2 What the required puzzle actually assesses

- A stimulus must reach threshold.
- The response is all-or-none.
- The route goes forward from the input side to the terminal.
- Myelin and pathway vocabulary are optional/narrative, not required actions.
- The debrief asks about threshold and all-or-none.

### 3.3 What the documentation currently claims

- The room lists **CON-3 neuron structure** and **CON-5 sensory/motor pathways**.
- The M2 design says the room is “about the neuron, not the whole reflex arc.”
- The Keeper dialogue teaches threshold, all-or-none, one-way, and myelin.
- The scan facts are NERV-01#1, #3, #6; the dialogue covers #5.
- The room’s README describes the pads as interactable props after the fact-model change.
- The asset docs describe three fact-specific icons.

These documents are internally consistent enough to ship a POC, but they do not answer the ontology or assessment questions.

### 3.4 Visual evidence

- The old neuron/pathway plates fit 32×17 and 32×13 at 36×36; they failed the readability gate.
- The new neuron/pathway silhouettes were effectively identical at 36×36 (alpha IoU ~0.99) because the pathway was the neuron plus a small pulse.
- The silhouette test v2 separates **round cell / capsule / chain**, but the neuron still reads as a blob in flat white; final outline/color has to carry it.
- The pads (`pad-dendrite`, `pad-terminal`) are the old scan plates used at 64×64. They are already neuron-like objects in the room.
- The three proposed icons are visually distinguishable in silhouette, but their conceptual relationship is still unresolved.

### 3.5 What is provisional

- The three-icon set.
- The fact model (it is a useful runtime capability, but it currently encodes the contested content model).
- The room layout and entity list.
- The CON-5 presence in 03.
- The number of scans and the scan system’s role in 03.
- The “inside a neuron” metaphor.
- The prompts in `docs/assets/scan-prompts-v02.md`.

---

## 4. Constraints and non-negotiables

### 4.1 Likely non-negotiable

- **OBJ-2** remains the level objective: trace the signal.
- The room is a single-screen 03 room in the current M2 slice.
- The three supplied nervous-system cards and the anatomy-fidelity ledger remain the authority for claims.
- 12+ friendly, gross-cute, non-gory tone.
- One active puzzle per room in the current HUD model.
- The player must still be able to complete the room in solo and local co-op.
- Any curriculum change needs a deliberate content decision, not a side effect.

### 4.2 Revisitable

- Which card facts belong to 03.
- Whether CON-5 is taught, previewed, or deferred.
- Whether the room has scans at all.
- Whether the room is literal, diagrammatic, or abstract.
- The number and kind of entities.
- The room’s spatial metaphor.
- The puzzle verb(s).
- The debrief question.
- The asset set and prompt brief.

### 4.3 Do not assume

- That three icons are required because there are three current scan targets.
- That myelin and pathway must be separate assets.
- That the current room layout should be preserved.
- That the current fact model is the right content model.
- That “more scans” means “more learning.”

---

## 5. Questions the focused work must answer

1. **What is the one learning claim 03 must assess?** Threshold, all-or-none, one-way conduction, neuron structure, myelin, or a route?
2. **What is the unit of the representation?** A cell, a part, a process, a route, or a system?
3. **What is the abstraction level?** Literal inside-the-body, diagrammatic cross-section, signal-as-traveler, network map, or abstract puzzle?
4. **What does the player do that proves the claim?** Not what they read or scan; what action or decision demonstrates understanding?
5. **What is the scan system’s job in 03?** Optional lore, part inspection, process tracing, assessment, or nothing?
6. **What is the minimum asset set** that follows from the chosen model?
7. **What belongs in 03 versus 04/05?** Where does myelin live? Where does the sensory/motor route live?
8. **What is the player fantasy?** Are they the signal, a traveler, a surgeon, an electrician, a cell biologist, or something else?
9. **What does success sound like in the debrief?** One sentence the player should be able to say.
10. **What can be cut without weakening OBJ-2?**

---

## 6. Design tensions

These are not problems to solve by default; they are tensions to hold consciously.

| Tension | One pole | Other pole | Why it matters |
|---|---|---|---|
| Part vs whole | Myelin as a part of the neuron | Myelin as a separate scan object | The current model treats a part as a peer. |
| Structure vs process | Neuron anatomy | One-way conduction / threshold | The room mixes nouns and verbs. |
| Literal vs abstract | Inside-a-neuron platforming | Diagrammatic/pattern puzzle | Literal is vivid but may teach the room, not the biology. |
| Breadth vs depth | Many facts and scans | One claim, one assessment | One small puzzle cannot do everything. |
| Cell vs route | Single-neuron story | Sensory→motor circuit | CON-5 needs a route, not a second cell icon. |
| Icon vs diagram vs place | Three scan icons | One cell with parts, or one route map | The asset form should follow the concept form. |
| Scan vs action | Read a fact | Use the idea to solve | Scans are optional; the puzzle is the assessment. |
| Narrative vs assessment | Keeper explains a lot | Player proves one thing | The room currently over-narrates and under-assesses. |
| Reuse vs distinctness | Reuse the old plates | New distinct icons | Reuse caused the current visual similarity. |

---

## 7. Possible solution directions

These are **directions to explore**, not ranked proposals. Each could be combined with parts of another. None is chosen.

### Direction A — One cell, many inspectable parts

**Core idea:** The room is one neuron. Myelin, nodes, dendrites, and terminal are parts or overlays on that cell, not peer entities. Scanning highlights a part of the same object; the player can inspect parts in place.

**What it fixes:** The part-whole error; the “three peer objects” problem; the asset taxonomy.

**Risks:** Still needs a way to show a process; a single cell can become visually crowded; the scan system may become a part-inspection UI rather than a world interaction.

**Evidence needed:** Can players identify parts on one cell at 36×36? Does highlighting a part teach more than a separate icon?

**Rough effort:** Medium.

### Direction B — One process, one room

**Core idea:** Choose one claim for 03 — for example, threshold/all-or-none **or** one-way conduction — and cut the others from the required path. Myelin and neuron structure become dialogue/debrief context or move to another room.

**What it fixes:** Cognitive overload; assessment ambiguity; the room’s overclaiming.

**Risks:** Cuts content the cards consider core; may weaken the neuron-structure objective; needs a clear home for myelin.

**Evidence needed:** Which single claim best fits OBJ-2 and the current puzzle? What does the debrief actually ask?

**Rough effort:** Small to medium.

### Direction C — Structure room vs route room

**Core idea:** Split the content by representation. 03 teaches **neuron structure / one-way conduction** inside one cell. A later room (05 or a new room) teaches the **sensory→motor route** across multiple cells. CON-5 moves out of 03.

**What it fixes:** The CON-3/CON-5 conflation; the “pathway” ambiguity; the single-cell vs route mismatch.

**Risks:** Curriculum sequencing changes; 03 may lose a concept it currently claims; 05 may become overloaded.

**Evidence needed:** Where does CON-5 first need to be known? Is 03 the right introduction?

**Rough effort:** Medium.

### Direction D — Choose an abstraction level

**Core idea:** Decide whether 03 is literal (inside the body), diagrammatic (a cell map), or abstract (a signal-routing puzzle). Commit to one level and remove the others.

**What it fixes:** The mixed metaphor; the “too literal” feeling; the visual inconsistency.

**Risks:** A literal room is memorable but may not transfer; a diagrammatic room may feel less like a platformer; an abstract room may lose the biology.

**Evidence needed:** Paper-test 2–3 metaphors with players; which one produces the best explanation in the debrief?

**Rough effort:** Medium.

### Direction E — Signal-as-traveler

**Core idea:** The player is the signal, not a visitor inside a cell. Parts of the neuron are landmarks/obstacles on a journey. The room’s mechanics become the signal’s behavior (threshold, all-or-none, one-way, saltatory jumps).

**What it fixes:** The literal “inside a body” tour; gives the player a clear role; makes the mechanics and biology the same thing.

**Risks:** The player may learn the game’s rules rather than the biology; the metaphor may break for myelin or routes; co-op roles need definition.

**Evidence needed:** Can players explain the biology after playing as the signal? Does the metaphor survive 36×36?

**Rough effort:** Medium to large.

### Direction F — Assessment-first redesign

**Core idea:** Start from the debrief sentence and the evidence. Decide what the player must be able to say/do, then design the minimum puzzle and visuals to produce it. Cut everything that does not serve that claim.

**What it fixes:** The exposure/assessment gap; over-narration; asset sprawl.

**Risks:** May produce a thin room if the claim is too narrow; may discard good exploratory content.

**Evidence needed:** What is the one debrief sentence? What action proves it?

**Rough effort:** Small to medium.

### Direction G — Minimal repair of the current room

**Core idea:** Keep the room and puzzle. Reduce the scan set to one or two meaningful objects, remove the peer “myelin/pathway” icons, and use labels/dialogue for the rest. No new metaphor.

**What it fixes:** The immediate visual redundancy and scan no-ops with the least disruption.

**Risks:** Does not solve the ontology or literalism; may leave the room conceptually muddy; may preserve a model the user dislikes.

**Evidence needed:** Does the room still teach the right claim? Does removing scans weaken the learning?

**Rough effort:** Small.

### Direction H — Neuron-as-place, parts-as-terrain

**Core idea:** Keep the “inside a neuron” fantasy, but make it coherent: the cell is the place; myelin is terrain; the axon is the road; the terminal is the exit. Parts are not scan objects; they are the environment. The scan system is removed or repurposed.

**What it fixes:** The part/place confusion; the peer-object problem; the scan clutter.

**Risks:** Terrain can become too literal; the player may not learn part names; the room may become a generic platformer with biology paint.

**Evidence needed:** Do players name the parts after traversing them? Does the environment carry the concept without labels?

**Rough effort:** Medium.

### Direction I — Two-neuron route for CON-5

**Core idea:** If 03 must teach sensory/motor pathways, make the route explicit: receptor → sensory neuron → spinal cord → motor neuron → muscle. This is a different visual unit from a single cell and may belong in 05.

**What it fixes:** The CON-5 mismatch; the “pathway” ambiguity.

**Risks:** Overlaps 05; may be too complex for one screen; requires new art and puzzle logic.

**Evidence needed:** Is CON-5 a 03 concept or a 05 concept? What does the player need before 05?

**Rough effort:** Large.

### Direction J — Remove the scan system from 03

**Core idea:** The room uses dialogue, environment, and the puzzle to teach. Scans are not required to carry the content. If scans remain, they are optional flavor with no peer-object taxonomy.

**What it fixes:** The scan no-op/redundancy problem; the need for three similar icons; the content/asset coupling.

**Risks:** Loses optional exploration; the concept log may feel empty; the Keeper’s “scan the labels” line must change.

**Evidence needed:** Do players still learn the claim without scans? Do they miss the optional lore?

**Rough effort:** Small.

### Direction K — Rebuild as a single “signal journey” with one visual anchor

**Core idea:** One strong visual anchor (a neuron diagram, a signal wave, or a route map) carries the room. The puzzle is a small set of interactions on that anchor. Assets are parts of the anchor, not separate creatures.

**What it fixes:** Visual sprawl; ontology; icon similarity.

**Risks:** Needs a strong art/UX concept; may be expensive; may not fit the platformer room.

**Evidence needed:** Can one anchor carry structure, process, and assessment? Does it read at 1×?

**Rough effort:** Large.

---

## 8. Evaluation criteria for the later decision

Do not score these yet. Use them to compare directions when the focused work is done.

| Criterion | Question |
|---|---|
| Learning focus | Does the room assess one clear claim? |
| Ontology | Does it represent entities, parts, processes, and routes at the right level? |
| Cognitive load | How many new terms/facts must the player hold at once? |
| Abstraction | Is the metaphor deliberate rather than accidental? |
| Assessment | What action or explanation proves the claim? |
| Play | Is there one clear verb and a satisfying solo/co-op loop? |
| Visual | Does it work at 36×36 and in the actual room? |
| Asset cost | What is the minimum asset set? |
| Curriculum | Does it fit the CON sequence and card facts? |
| Scope | Can it fit one room and the current engine? |
| Risk | What breaks if the direction is wrong? |
| Testability | Can it be paper-tested before art/implementation? |

A blank decision matrix can be filled during the focused work:

| Direction | Learning focus | Ontology | Load | Abstraction | Assessment | Play | Visual | Cost | Risk | Notes |
|---|---|---|---|---|---|---|---|---|---|---|
| A | | | | | | | | | | |
| B | | | | | | | | | | |
| ... | | | | | | | | | | |

---

## 9. Focused work plan (for the later session)

This is a suggested shape, not a commitment.

### Phase 0 — Re-read the authority

- Cards: NERV-01, NERV-02, NERV-03.
- Syllabus: CON-3, CON-4, CON-5, CON-7.
- M2 03 design and anatomy-fidelity ledger.
- Current room, dialogue, puzzle, scans, and debrief.
- Current asset/prompt state.

**Exit:** a one-page inventory of every claim the room currently makes and where it is delivered.

### Phase 1 — Build the ontology map

Classify every current element as entity / part / process / route / observation.

- Which level does each element belong to?
- Which elements are peers, and which are parts of another?
- Which are assessed, exposed, or decorative?

**Exit:** a corrected ontology diagram and a list of category errors.

### Phase 2 — Choose the learning claim

Pick one primary claim for 03 and one debrief sentence.

- What must the player be able to say?
- What must they do to prove it?
- What is narrative context only?
- What moves to 04/05?

**Exit:** a one-page learning contract.

### Phase 3 — Generate 3–4 candidate designs

Use the directions in §7 as raw material. Each candidate should specify:

- metaphor/abstraction level;
- player role and verb;
- room beat sheet;
- scan/observation role;
- asset delta;
- assessment;
- what is cut.

**Exit:** 3–4 paper designs, not final answers.

### Phase 4 — Paper-test / playtest

- Test the metaphor and the verb with 2–3 people.
- Ask them to explain the concept after the paper run.
- Check whether the intended claim is the one they remember.
- Check whether the assets are distinguishable at 1×.

**Exit:** evidence for/against each candidate.

### Phase 5 — Decide and record

- Choose a direction, or choose a hybrid.
- Record rejected alternatives and why.
- Write an ADR.
- Rewrite the 03 design brief, fact/scan mapping, and asset delta.

**Exit:** an accepted decision record and updated docs, **not** implementation.

### Phase 6 — Hand off

Only after Phase 5:

- rewrite prompts;
- generate art;
- change room content;
- implement puzzle changes;
- update tests/captures.

---

## 10. Candidate M2.75 deliverables

The milestone should produce a small set of durable artifacts:

- [ ] A one-page **03 learning contract**: one claim, one assessment, one debrief sentence.
- [ ] A **concept/ontology map**: entity, part, process, route, observation.
- [ ] A **metaphor/abstraction decision**: literal, diagrammatic, or abstract.
- [ ] A **room beat sheet**: what the player does, sees, and scans.
- [ ] A **scan/content decision**: keep, reduce, repurpose, or remove.
- [ ] An **asset delta**: keep, cut, overlay, or new; no final prompts yet.
- [ ] A **paper-test/playtest plan** and evidence.
- [ ] An **ADR** recording the chosen direction and rejected alternatives.
- [ ] A list of **what moves to 04/05** (CON-5, myelin, route, etc.).

Not all of these are required. The first three are the minimum.

---

## 11. Definition of done for M2.75

M2.75 is done when:

1. The room has one explicit primary learning claim.
2. Every current element is classified as entity, part, process, route, or observation.
3. The room’s assessment matches the claim; optional exposure is labeled as optional.
4. The CON-3/CON-5 boundary is explicit: what 03 teaches, what it previews, and what moves.
5. The scan system’s job is explicit: assessment, inspection, lore, or none.
6. The asset set follows from the model, not the reverse.
7. A paper test or playtest has tested the metaphor and the assessment.
8. A decision record and revised brief exist.
9. No final art is commissioned before the decision.

---

## 12. Risks and failure modes

| Risk | Why it matters |
|---|---|
| Treating this as an art reskin | The ontology and assessment problems remain. |
| Starting from the current assets | The asset taxonomy is a symptom, not a requirement. |
| Adding more scans/facts | More content does not fix overload. |
| Over-abstracting | The player may learn a generic puzzle, not biology. |
| Curriculum creep | 03 may absorb 04/05 content. |
| Preserving the room by default | The literal layout may be the problem. |
| Choosing a metaphor by asset cost | The cheapest icon may be the wrong concept. |
| No assessment | The room exposes but does not teach. |
| No playtest | The designer’s metaphor may not survive contact with players. |
| Breaking the card authority | The redesign must stay inside the supplied facts. |

---

## 13. Open questions for the user

These are for the focused work, not for immediate answers:

- Is 03 allowed to drop CON-5 entirely, or must it preview the route?
- Is the scan system required in 03, or can the room teach through dialogue/puzzle/environment?
- Is the “inside a neuron” fantasy fixed, or can 03 become a diagram/abstract space?
- Is myelin a required fact in 03, or can it live in the debrief/01/05?
- Is the one-screen constraint fixed?
- Can 03 and 05 swap content or share a route?
- Is the player the signal, a traveler, a surgeon, an electrician, or a cell biologist?
- What is the one sentence the player should say after the room?
- Is the target one concept, one fact, or one process?
- What is the smallest version of 03 that still satisfies OBJ-2?

---

## 14. Related documents

- [`../m2/nervous-puzzles/README.md`](../m2/nervous-puzzles/README.md)
- [`../m2/nervous-puzzles/03-nerve-forest.md`](../m2/nervous-puzzles/03-nerve-forest.md)
- [`../m2/nervous-puzzles/anatomy-fidelity.md`](../m2/nervous-puzzles/anatomy-fidelity.md)
- [`../m2/nervous-puzzles/mechanics-and-evidence.md`](../m2/nervous-puzzles/mechanics-and-evidence.md)
- [`../../public/syllabi/anatomy-reflex.json`](../../public/syllabi/anatomy-reflex.json)
- [`../../public/packs/anatomy-reflex/facts.json`](../../public/packs/anatomy-reflex/facts.json)
- [`../../public/packs/anatomy-reflex/levels/03-nerve-forest/room.json`](../../public/packs/anatomy-reflex/levels/03-nerve-forest/room.json)
- [`../../public/packs/anatomy-reflex/levels/03-nerve-forest/dialogue.json`](../../public/packs/anatomy-reflex/levels/03-nerve-forest/dialogue.json)
- [`../../public/packs/anatomy-reflex/levels/03-nerve-forest/puzzle.json`](../../public/packs/anatomy-reflex/levels/03-nerve-forest/puzzle.json)
- [`../assets/scan-prompts-v02.md`](../assets/scan-prompts-v02.md)
- [`../../art-source/scan-silhouettes/scan-silhouette-review.png`](../../art-source/scan-silhouettes/scan-silhouette-review.png)
- [`../adr-assets/0079-scan-facts.md`](../adr-assets/0079-scan-facts.md)

---

## 15. Decision log

| Date | Decision | Rationale | Status |
|---|---|---|---|
| — | — | — | — |

---

## 16. Next action

Do not implement anything yet. The next focused session should start at **Phase 0–2** of §9 and produce:

1. the ontology map;
2. the one-sentence learning contract;
3. the CON-3/CON-5 boundary.

Only after those three artifacts should the candidate directions be tested.
