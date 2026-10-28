# M2 nervous-system puzzle design

**Status:** design proposal, 2026-10-27
**Scope:** the five anatomy-reflex rooms plus the Silicon fixture
**Deliverable:** Markdown design and anatomy-fidelity documentation only
**Authority:** the three supplied nervous-system cards, the syllabus, and the
accepted M1.5 puzzle contract
**Not implemented:** no code, pack content, schema, engine, or vault changes

## 1. What this package decides

This package defines one room-scale puzzle for each of the six rooms in the M2
scope. It specifies the rules, spatial intent, M1.5 data shape, evidence,
co-op/solo split, and the card facts each rule relies on.

The package deliberately separates three things:

1. **What the player does** — the spatial puzzle rules.
2. **What the player learns** — the card facts and depth band.
3. **What the game claims** — the anatomical fidelity ledger, including what is
   simplified and what must not be claimed.

The design is constructive-aligned to the existing syllabus. It does not add a
new objective, concept, card, ability, verb, entity behaviour, gate type, UI
surface, or save field.

## 2. Room matrix

| Room | Puzzle | Role | Objective | Concepts | Card facts | Depth |
|---|---|---|---|---|---|---|
| `01-bone-gate` | **Sheath Gate** | Optional reinforcement, recommended after 03 | OBJ-1 | CON-3 | NERV-01#1, #3, #6 | Core |
| `02-joint-chamber` | **Stretch Gate** | Optional bridge, recommended after 04 | OBJ-1 | CON-5 | NERV-03#1, #2 | Core |
| `03-nerve-forest` | **Node Run** | Required; replaces the Signal Ferry | OBJ-2 | CON-3, CON-5 | NERV-01#1, #5, #6; #3 in debrief | Core |
| `04-muscle-effector` | **Endplate Ferry** | Required; inherits the ferry pattern | OBJ-2 | CON-4, CON-6 | NERV-02#1, #2, #5; #3 optional debrief | Core + optional advanced |
| `05-reflex-core` | **Reflex Core** | Required core | OBJ-3 | CON-5, CON-7 | NERV-03#1, #2, #3, #5; #4 optional | Core + optional advanced |
| `05-reflex-core` | **Lesion Console** | Optional post-core gate/debrief | OBJ-4 | CON-3–CON-7 | NERV-03#2, #3, #5; #4 optional | Core |
| `silicon-fixture` | **Interrupt Loop** | Transfer fixture | OBJ-5 | CON-8 | CON-8 mapping, NERV-03#5 as analogy | Core |

The total is **six room puzzles** and one optional post-core knowledge check.
The critical path is 03 → 04 → 05 → Silicon. The 01 and 02 puzzles are optional
reinforcement, not new anatomy and not prerequisites for the critical path.

## 3. Density and sequence

The sequence follows the existing mystery-first design:

```text
01 Bone Gate        bone/joint context; optional Sheath Gate after 03
02 Joint Chamber    joint context; optional Stretch Gate after 04
03 Nerve Forest     required Node Run: one-way, threshold, all-or-none
04 Muscle Effector  required Endplate Ferry: Ca2+ release, ACh, NMJ
05 Reflex Core      required Reflex Core: spindle -> spinal cord -> muscle
                    optional Lesion Console: predict a blocked component
Silicon fixture     required playable transfer: sensor -> controller -> actuator
```

The target play time for the four critical-path puzzles is roughly 10–15
minutes, leaving time for dialogue and the debrief inside the existing
15–30-minute session target. The optional 01/02 puzzles add about 1–2 minutes
each when the player backtracks.

One puzzle per room is intentional:

- M1.5 shows one active puzzle at a time in the HUD.
- The first activated puzzle supplies the room's tether policy; multiple
  simultaneous puzzles with different policies need a new ADR.
- The M2 schedule is three days. Six small, single-purpose puzzles are safer
  than nested puzzle chains.
- Optional reinforcement keeps the bone/joint rooms from carrying nervous
  content they do not have cards for.

## 4. Core decisions

### 4.1 Signal Ferry: replace at 03, inherit at 04

The current `puzzle-ferry-01` is a valid M1.5 proof of the puzzle dataflow, but
it is not a valid assessment of the `03-nerve-forest` objective:

- It lists `CON-3`, `CON-4`, `CON-5`, `CON-6`, and `CON-7` at once.
- Its core move is carrying a shape-coded tracer to a matching receptor. That
  is a receptor/chemical-synapse idea, not one-way action-potential propagation.
- It does not ask the player to use threshold, all-or-none, myelin, or the
  reflex arc.

The design therefore **replaces** it at 03 with **Node Run**, and **moves the
carry/receptor/pulse pattern to 04** as **Endplate Ferry**, where the
neuromuscular junction makes the chemistry meaningful.

No existing file is edited by this package. The current puzzle remains in the
repository until M2 implementation deliberately supersedes it.

### 4.2 Levels 01 and 02

The supplied card set has no nervous-system card for bone or joint. The
repository also has no `BONE-01`/`BONE-02` cards; the card README says they are
pending the volume-1 source. This package does not invent bone or joint
innervation.

Instead:

- The main OBJ-1 bone/joint content remains the existing scan/dialogue/gate
  content for those rooms.
- **Sheath Gate** is an optional side puzzle that reinforces NERV-01's
  myelinated axon. It is recommended after 03, when the card has been
  introduced.
- **Stretch Gate** is an optional side puzzle that reinforces NERV-03's muscle
  spindle and dorsal root. It is recommended after 04, when its prerequisites
  have been introduced.
- Neither side puzzle locks the level exit or carries required evidence.
- Neither claims that bone tissue or the joint capsule is innervated. The room
  is the setting; the nervous claim is limited to the named card facts.

If the implementation can only ship the critical path, the pack still teaches
the full nervous-system slice. The optional puzzles can be added later without
changing the core sequence.

### 4.3 Silicon fixture

The Silicon room is a **transfer fixture**, not new anatomy. Its biological
source is the syllabus's CON-8 sensor–controller–actuator mapping and
NERV-03#5's "brain is not required for the response" idea. The hardware labels
are an analogy, not card facts.

Recommended placement is a separate one-level `silicon-reflex` pack, because
the requirements and architecture describe the fixture as proof of the pack
boundary. If M2 time forces a shortcut, the same room can ship as a fixture
level in `anatomy-reflex`; the puzzle rules do not depend on that choice. The
pack-placement decision is recorded as open in §9.

### 4.4 Mechanics

The current design fits the accepted M1.5 vocabulary. No new node, link, verb,
entity type, gate type, UI surface, or save field is required.

`mechanics-and-evidence.md` contains the per-rule audit. The conclusion is:

> **No ADR proposal is required for this design.**

If implementation discovers a rule that cannot be expressed with the M1.5
vocabulary, the implementer must stop and write a new ADR proposal before
building it. A level hack is not an acceptable fallback.

## 5. Design rules shared by all rooms

1. **One concept per puzzle.** A required puzzle uses one card's core facts plus
   the minimum contextual fact needed to make the action meaningful.
2. **Introduce before testing.** The agent dialogue or scan introduces the fact
   before the player is asked to act on it.
3. **Core facts only in required checks.** Advanced facts are optional
   scan/debrief content.
4. **No fail state.** Wrong routes, late timing, and blocked components give
   feedback and reset the local puzzle; they do not remove evidence or health.
5. **Solo is complete.** Co-op adds a parallel role; it never gates the solve.
   The solo union gives P1 the needed pulse and carry actions.
6. **One screen.** Each room targets a single camera frame. `off` is used only
   when the puzzle geometry fits 1280 × 720; otherwise `stretch`. No new tether
   policy.
7. **Recoverable props.** Every carried token returns on reset or out-of-bounds;
   the player cannot permanently lose a puzzle object.
8. **Evidence is process, not a score.** Solve, debrief, resets, and hint use are
   recorded; attempts are not punitive.
9. **Explicit abstraction.** A signal token, myelin prop, ACh packet, or brain
   timer is labelled as a game representation in the fidelity ledger.
10. **No invented anatomy.** If a card fact is missing, the design says
    "not specified" or uses the syllabus transfer frame; it does not fill the
    gap with plausible prose.

## 6. Reading order

1. [`anatomy-fidelity.md`](anatomy-fidelity.md) — the fact/depth/claim ledger.
2. [`mechanics-and-evidence.md`](mechanics-and-evidence.md) — the M1.5 fit,
   evidence, and ADR audit.
3. The room specs in level order:
   - [`01-bone-gate.md`](01-bone-gate.md)
   - [`02-joint-chamber.md`](02-joint-chamber.md)
   - [`03-nerve-forest.md`](03-nerve-forest.md)
   - [`04-muscle-effector.md`](04-muscle-effector.md)
   - [`05-reflex-core.md`](05-reflex-core.md)
   - [`silicon-fixture.md`](silicon-fixture.md)

Each room spec is self-contained, but the card facts and depth bands are
defined in [`anatomy-fidelity.md`](anatomy-fidelity.md).

## 7. Source map

These links are read-only references into the existing repository. This package
does not write through `docs/shrinkonauts`.

| Source | Link |
|---|---|
| NERV-01 | [`../../shrinkonauts/base-game/cards/nervous/NERV-01-neuron-action-potential.md`](../../shrinkonauts/base-game/cards/nervous/NERV-01-neuron-action-potential.md) |
| NERV-02 | [`../../shrinkonauts/base-game/cards/nervous/NERV-02-synapse.md`](../../shrinkonauts/base-game/cards/nervous/NERV-02-synapse.md) |
| NERV-03 | [`../../shrinkonauts/base-game/cards/nervous/NERV-03-stretch-reflex.md`](../../shrinkonauts/base-game/cards/nervous/NERV-03-stretch-reflex.md) |
| Card index | [`../../shrinkonauts/base-game/cards/index.json`](../../shrinkonauts/base-game/cards/index.json) |
| Syllabus | [`../../shrinkonauts/base-game/syllabus.md`](../../shrinkonauts/base-game/syllabus.md) |
| Learning design | [`../../shrinkonauts/learning-design-brief.md`](../../shrinkonauts/learning-design-brief.md) |
| Level authoring | [`../../shrinkonauts/base-game/level-authoring.md`](../../shrinkonauts/base-game/level-authoring.md) |
| Traceability | [`../../shrinkonauts/base-game/traceability.md`](../../shrinkonauts/base-game/traceability.md) |
| M1.5 authoring | [`../../m1.5/authoring.md`](../../m1.5/authoring.md) |
| M1.5 ADR index | [`../../adr-m1.5/README.md`](../../adr-m1.5/README.md) |

## 8. Acceptance trace

| Requirement | Where it is answered |
|---|---|
| Puzzle rules for all five levels plus Silicon | The six room specs |
| Each rule connected to the supplied nervous cards | Per-room "Rule-to-card ledger" and `anatomy-fidelity.md` |
| Core/advanced boundary respected | `anatomy-fidelity.md` §4; each room's depth table |
| New mechanics only through ADRs | `mechanics-and-evidence.md` §6; conclusion: none required |
| Signal Ferry may be revised or replaced | `03-nerve-forest.md` §2 and `04-muscle-effector.md` §2 |
| Markdown documentation only | This package; no code/pack/vault edits |
| `git diff --check`, `npm test`, `npm run pack:validate` | Verification section of `mechanics-and-evidence.md` |

## 9. Source issues and open questions

### 9.1 EV-5 numbering conflict

`syllabus.md` §7 labels EV-5 as "playtest observation" and EV-6 as "co-op
talk". The machine-readable `syllabi/anatomy-reflex.json` and `traceability.md`
use EV-5 for the Silicon transfer and EV-6 for co-op observation. This package
does not silently choose a winner. It refers to the Silicon evidence by event
and objective (`debrief_answered`, OBJ-5), and records the numbering conflict
for the vault owner.

### 9.2 Stale EV-2 prose

Some prose still describes EV-2 as "gate attempts and answers", while
ADR-0039 and the M1.5 authoring contract make the puzzle the assessment source
for 03. This package follows ADR-0039 and M1.5 as the newer authority. It does
not re-audit M1.5.

### 9.3 Draft cards

The cards are marked `status: draft`. This package treats them as the supplied
authority for the design, but if the cards change, the claim ledger and the
affected puzzle rules must be rechecked before implementation.

### 9.4 Open choices for M2 implementation

- Should 01/02 side puzzles be required for 100% completion, or remain optional?
  This package recommends optional.
- Should Silicon ship as a separate `silicon-reflex` pack or as an
  `anatomy-reflex` fixture level? This package recommends separate, but the
  rules are pack-agnostic.
- Should the 05 lesion challenge be a concept gate or a spatial overlay? This
  package uses the existing concept-gate engine to avoid new mechanics.
- Should the 05 brain gate use `stretch` or `off`? The layout targets one
  screen; `stretch` is the fallback if the geometry exceeds 1280 × 720.

## 10. What this package does not do

- It does not implement levels, rooms, dialogue, gates, puzzles, assets, or
  tests.
- It does not change `public/packs/`, `src/`, `tests/`, `docs/adr-m1.5/`, or any
  accepted ADR.
- It does not edit `docs/shrinkonauts`, which is a symlink into the Obsidian
  vault.
- It does not add nervous cards for bone, joint, or Silicon. Missing content is
  handled by optional reinforcement and the CON-8 transfer frame.
- It does not claim full nervous-system, skeletal, muscular, or hardware
  coverage.

## 11. Relationship to M4 online co-op (proposed)

M4 consumes the frozen M2 content; it does not change any puzzle rule, gate
type, verb, entity behaviour, UI surface, or save field. The online session is
host-authoritative and level-scoped. M4.0 runs the `03-nerve-forest` Node Run
online; the full pack is M4.1. See [`../../m4/README.md`](../../m4/README.md)
and
[`../../adr-online/0052-composition-with-planned-milestones.md`](../../adr-online/0052-composition-with-planned-milestones.md).

## 12. Change log

| Date | Change |
|---|---|
| 2026-10-27 | Initial M2 nervous-system puzzle design package. |
| 2026-10-28 | Cross-link the proposed M4 online co-op boundary; no content change. |
