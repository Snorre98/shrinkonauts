# Learning design brief — Shrinkonauts: The Reflex Arc

**Status:** v0.1 · 26 October 2026  
**Owner:** Snorre (design) · Henrik and Hanna (theory) · Johannes and Marie (GDD)  
**Source of truth for:** learner profile, instructional sequence, scaffolding/fading, assessment validity, classroom integration, limitations.  
**Learning contract:** [`syllabus.md`](base-game/syllabus.md)  
**Curriculum alignment:** [`curriculum-alignment.md`](curriculum-alignment.md)  
**Theory:** [`theory-brief.md`](theory-brief.md)  
**Course compliance:** [`gbl-course-requirements.md`](gbl-course-requirements.md)

> This is the pedagogy layer between the syllabus and the GDD/theory/video. The GDD’s **Learning** section, the theory section, and the video must translate this brief, not invent a parallel design.

---

## 1. Purpose and status

The base-game docs answer “how is the engine built?” and “what does the syllabus cover?” This brief answers:

- **Who** is learning?
- **What** do they already know, and what do they get wrong?
- **How** does the game sequence the learning?
- **How** does it scaffold and then fade support?
- **How** do we know they understood, not just completed?
- **How** does it fit a classroom?
- **What** does it deliberately not claim?

It is a **design brief**, not the theory section. The theory section explains how the design applies the course readings; this brief defines the design that the theory explains.

---

## 2. Audience and learner profile

| Dimension | Decision |
|---|---|
| **Primary audience** | Norwegian upper-secondary **VG2**, Biologi 1 (BIO01-02) |
| **Secondary audience** | VG3 revision; first-year anatomy & physiology bridge — note only, no formal curriculum claim |
| **Age** | 16–19 |
| **Prior knowledge** | Basic cell/organ systems; “neurons carry electrical signals”; can label a simple diagram |
| **Not assumed** | A causal reflex-arc model; synapse transmission; the spinal bypass; lesion prediction |
| **Reading level** | Plain English, short sentences, glossary terms; avoid college-textbook prose |
| **Context** | Classroom (teacher-led or pair work) or home (self-directed) |
| **Session length** | Slice: 5–8 minutes; classroom lesson: 15–30 minutes; full pack: 15–30 minutes |
| **Device** | Desktop/laptop browser, keyboard, 16:9 |
| **Players** | Solo or two-player local co-op on one keyboard |
| **Accessibility** | Keyboard-only, remappable, text size, colour-blind-safe, reduced motion, pause, no audio-only cues |
| **Language** | English; Norwegian localisation is future work |

**Design implication:** the game must not assume the player has read the textbook. The first agent dialogue must surface the misconception and give the player a reason to care; the debrief must use everyday language before the technical terms.

---

## 3. Learning problem

**Problem statement:** students can label a reflex-arc diagram but cannot explain why the knee jerks before the brain feels it, trace the signal through the spinal cord, or predict the effect of a component failure.

**Status:** this is a **design assumption**, not a cited prevalence claim. It is grounded in the standard misconception literature and the card’s “brain in the loop” misconception, but the GBL report should not claim “most students” without a source. Validate it with the playtest/teacher review.

**Why a game?**

| Alternative | What it does well | What it misses |
|---|---|---|
| Textbook diagram | Names the parts | Static; no causal run; no prediction |
| Label quiz | Tests recognition | No system behaviour; no explanation |
| Video | Shows the sequence | Passive; no decision; no feedback |
| Worksheet | Practice | No exploration; no consequence |
| **Game** | Exploration, causal gates, feedback, map, debrief, co-op explanation | Still a simplification; needs a teacher/debrief |

The game is not better than a teacher or a lab. It is a **guided practice environment** for the causal model that a diagram cannot provide.

---

## 4. Curriculum alignment summary

The formal anchor is **Biologi 1 (VG2)**. The slice aligns to a **part** of:

- **A1** — anatomy/physiology and life processes.
- **A2** — cell structure/function and membrane communication (synapse; partial).
- **A3** — regulatory mechanisms/homeostasis (reflex as one mechanism; partial).

It does **not** cover A4 (laboratory investigation) or the full Biologi 1 course. See [`curriculum-alignment.md`](curriculum-alignment.md) for exact Udir quotes, the alignment table, and the non-coverage list.

**Claim:** “aligned to a slice of Biologi 1 A1/A2, with a partial link to A3.”  
**Non-claim:** “covers the Biologi 1 curriculum” or “improves exam scores.”

---

## 5. Instructional sequence

### 5.1 Mystery-first

The player meets the mystery before the mechanism:

```
Hook: “Why did the knee jerk before the brain knew?”
  → surface the “brain is in the loop” misconception
  → NERV-01 neuron (one-way signal)
  → NERV-02 synapse (chemical gap, receptor-dependent effect)
  → NERV-03 reflex arc (spinal bypass; lesion prediction)
  → debrief (explain the bypass)
  → Silicon transfer (sensor → controller → actuator)
```

The cards’ `prerequisites` are **content dependencies**, not play order. The player can explore in a different order, but the reflex core requires the neuron/synapse concepts.

### 5.2 Level sequence

| Stage | Card(s) | Level (back-pocket name) | Player does | Evidence |
|---|---|---|---|---|
| 0. Hook | NERV-03 | Intro/Reflex mystery | Answers “what do you think happens?”; sees the misconception | Pre-game choice / observation |
| 1. Context | Bone/joint cards (pending) | Bone Gate / Joint Chamber | Explores the bone/joint scaffold; scans structures | Concept log |
| 2. Signal | NERV-01 | Nerve Forest | Traces the one-way neuron; orders dendrite → soma → axon → terminal | Sequence gate |
| 3. Gap | NERV-02 | Nerve Forest / Synapse Gap | Crosses the cleft; matches transmitter/receptor/effect (core: cleft, release, NMJ) | Match/sequence gate |
| 4. Reflex | NERV-03 | Reflex Core | Routes sensory → spinal → motor → muscle; predicts a lesion; sees the kick | Core gate + debrief |
| 5. Transfer | NERV-03#5 | Silicon fixture | Maps sensor → interrupt → CPU → actuator | Optional transfer prompt |

### 5.3 Activate → model → practice → feedback → explain → transfer

| Phase | Design |
|---|---|
| **Activate** | Hook question; “what do you think happens?”; surface the misconception. |
| **Model** | Agent dialogue explains its job with a visual; the scan labels the structure. |
| **Practice** | Concept gate: sequence/match/predict; the player applies, not recalls. |
| **Feedback** | Wrong answer: agent feedback + hint; no fail state; evidence recorded. |
| **Explain** | Debrief: one-sentence teach-back; model answer; 0–2 rubric for playtest. |
| **Transfer** | Silicon teaser/prompt: same loop, different system. |

---

## 6. Scaffolding and fading

| Support | When | Fades when |
|---|---|---|
| Agent hints | First attempts/wrong answers | Player solves without hint; hint use is evidence |
| Scan labels | First two levels | Later gates ask without labels; core gate is anatomy-only |
| HUD objective | Always (accessibility) | Optional “clean HUD” for challenge |
| Concept log | Always | Player can review; not a hint in the gate |
| Gate feedback | Every attempt | Correct answer + explanation |
| Co-op partner | Optional | Peer explanation; not required |

**HUD vs anatomy decision:** scan labels are a **scaffold**, not a permanent answer key. The first two levels can label structures; the reflex core asks the player to route the signal without labels. Assist mode keeps labels available. The debrief asks for an explanation without the HUD. This resolves the `LEARNING-DESIGN.md` tension “HUD vs anatomy.”

**No fail state:** hazards reset to the checkpoint; gates retry; hints are unlimited. The challenge is understanding, not survival.

---

## 7. Assessment and evidence

| Objective | In-game evidence | Playtest evidence | Rubric |
|---|---|---|---|
| OBJ-1 Identify | Concept log; scan; dialogue completion | Pre/post Q1 | 0–2: 0 = few parts; 1 = some; 2 = all core parts |
| OBJ-2 Trace | Nerve gate sequence; attempts/hints | Pre/post Q2 + game export | 0–2: 0 = wrong order; 1 = partial; 2 = correct direction |
| OBJ-3 Explain | Debrief free text + model answer | Pre/post Q3 + debrief | 0 = labels only; 1 = partial bypass; 2 = correct spinal bypass + brain later |
| OBJ-4 Predict | Optional lesion challenge/debrief | Pre/post Q4 | 0 = no effect; 1 = effect without reason; 2 = effect + reason |
| OBJ-5 Transfer | Optional Silicon prompt | Observation | Optional; not part of the core claim |

**Debrief rubric (0–2):**

- **0** — labels only / no bypass.
- **1** — partial: mentions the spinal cord but not that the brain perceives it later.
- **2** — correct: sensory → spinal cord → motor → muscle, and the brain feels it after.

**Rules:**

- The game records the debrief answer and shows a model answer; it does **not** auto-grade.
- The facilitator scores the playtest answers with the rubric; two raters where possible.
- The pre/post is 4 short questions, not a grade.
- No exam-score claim; no inferential statistics; 3 players/pairs is formative.

---

## 8. Classroom integration

**15–30 minute lesson (teacher-led):**

1. **Hook (3 min):** “Why does the knee jerk before the brain feels it?” Collect predictions; do not correct yet.
2. **Play (8–12 min):** pairs on one keyboard; one drives, one reads the agent; swap at the reflex core; teacher circulates.
3. **Debrief (5–8 min):** pairs explain the bypass; teacher uses the model answer; connect to the Udir aim and the textbook diagram.
4. **Transfer (3 min):** show the Silicon teaser; “where is the spinal cord in a computer?”
5. **Exit ticket (2 min):** one-sentence explanation or the pre/post Q3.

**Teacher role:** not to teach during play; to set the hook, observe, and run the debrief. The game is a **guided practice**, not a replacement for the lesson.

**Home/self-directed:** the game + debrief is a 5–8 minute review; the model answer and concept log support independent use.

**Accessibility:** keyboard-only, text size, colour-blind-safe, reduced motion, pause, no audio-only cues; pairs can share one keyboard.

---

## 9. Theory summary

**Four core lenses + Kiili supporting:**

- **Malone** — intrinsic fantasy, curiosity, control, challenge.
- **SDT** — autonomy, competence, relatedness (co-op).
- **Cognitive load** — segmenting, signalling, dual coding, spatial contiguity.
- **Constructive alignment** — objectives → mechanics → evidence.
- **Kiili/GameFlow** — experience → reflection → feedback loop (supporting).

The full selection, course-reading mapping, claims/non-claims, and word budget are in [`theory-brief.md`](theory-brief.md). The GDD’s Learning section and the theory section must use the same lens names and features.

**Intrinsic vs extrinsic fantasy:** Kjøpesmart’s cozy home is an extrinsic fantasy around the shopping task; Shrinkonauts’ body/system is the level and the knowledge is the key, so its fantasy is intrinsic. This is a cross-report consistency point.

---

## 10. Depth boundary

| Card | Core for VG2 | Advanced/optional |
|---|---|---|
| NERV-01 Neuron | Parts/one-way, myelin, threshold, all-or-none | Axon hillock, resting potential/Na⁺–K⁺ pump |
| NERV-02 Synapse | Cleft, Ca²⁺-triggered release, NMJ/ACh | EPSP/IPSP, summation, clearance/electrical synapses |
| NERV-03 Reflex | Spindle, dorsal root, ventral root, brain later | Reciprocal inhibition |

**Rule:** VG2 gates use core facts only. Advanced facts are optional scan/debrief/first-year bridge. The cards have a `Depth` section; `index.json` records `core`/`advanced` fact IDs.

---

## 11. Limitations and non-claims

- The game is a **simplified model**, not a medical simulator.
- It covers a **slice** of Biologi 1 A1/A2, partial A3; not A4 or the full course.
- The content cards are sourced from OpenStax *A&P* (college-level); the VG2 core is a simplification, not a textbook replacement.
- The playtest is **3 external players/pairs**, formative; it is not an efficacy study.
- No claim of exam-score improvement, clinical competence, or full curriculum coverage.
- The video/GBL report should say “designed to support” and “formative playtest,” not “proven to improve learning.”
- A teacher/curriculum review is recommended but may not be possible before 9 November.

---

## 12. QA gates and sign-off

| Gate | Question | Owner | Status |
|---|---|---|---|
| **QA-1 Curriculum** | Is the slice aligned to named Udir aims, with non-coverage stated? | Snorre + Henrik/Hanna | Drafted in `curriculum-alignment.md` |
| **QA-2 Learner** | Is the prior knowledge/misconception/reading level explicit? | Snorre | This brief |
| **QA-3 Sequence** | Is the activate → model → practice → feedback → explain → transfer sequence explicit? | Snorre + Johannes/Marie | This brief |
| **QA-4 Assessment** | Do the gates test application, and is the debrief rubric defined? | Snorre + Henrik/Hanna | This brief |
| **QA-5 Theory** | Are 4 core + Kiili selected, applied, and cited? | Henrik/Hanna | `theory-brief.md` |
| **QA-6 Course** | Does the GBL submission meet the brief/template/checklist? | Snorre + group | `gbl-course-requirements.md` |
| **QA-7 Playtest** | Are 3 external players/pairs tested and evidence recorded? | Snorre | M3/M4 |
| **QA-8 Consistency** | Do GDD/theory/video use the same claims/IDs? | Group | Before submission |

---

## 13. Open questions

| Question | Owner | Status |
|---|---|---|
| Do we have a Biologi 1 teacher for a 15-minute sanity check? | Group | Open |
| Is the hook question asked in-game or by the teacher? | Snorre | Open — recommend both (in-game + teacher) |
| Do we show the exact Udir quotes in the GDD appendix? | Johannes/Marie | Open — recommend yes |
| Is the Silicon transfer assessed or only shown? | Snorre | Open — recommend shown/optional |
| Do we need a Norwegian-language version for the classroom? | Group | Open — recommend English for GBL, note localisation as future work |

---

## 14. Change log

| Date | Version | Change |
|---|---|---|
| 2026-10-26 | 0.1 | Created as the pedagogy layer for the GBL submission: learner profile, sequence, scaffolding, assessment, classroom, limitations. |
