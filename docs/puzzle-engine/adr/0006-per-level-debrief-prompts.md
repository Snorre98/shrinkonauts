# ADR-0006: Per-level debrief prompts with syllabus fallback

Status: Accepted

## Context

The runtime derives one debrief prompt per objective. 03 and 04 both map to
OBJ-2, so both currently use `prompt-obj-2` with the same generic text. The
intended design has distinct teach-back questions:

- 03: why one input is below threshold and why a third input does not make a
  bigger spike;
- 04: what Ca²⁺ does at the terminal and why ACh needs the nicotinic receptor;
- 05: why the knee moved before the brain consciously felt it;
- Silicon: where the controller/actuator loop maps to hardware.

A shared prompt makes the 04 debrief satisfy EV-7 from the 03 answer and shows
OBJ-2 as met before the NMJ answer is recorded.

## Decision

A level may declare its own debrief prompts in `level.json`:

```json
"debrief": {
  "prompts": [
    {
      "id": "prompt-obj-2-nmj",
      "objectiveId": "OBJ-2",
      "prompt": "What does Ca²⁺ do at the terminal, and why does ACh need the nicotinic receptor?",
      "successCriterion": "Names Ca²⁺-triggered release, ACh crossing the cleft, nicotinic binding, muscle response, and AChE clearance."
    }
  ]
}
```

Rules:

- The field is optional. If absent or empty, the runtime falls back to the
  existing `debriefPrompts(syllabus, level.syllabusObjectiveIds)` behaviour.
- Each prompt has a stable `id`, an `objectiveId` present in the level's
  `syllabusObjectiveIds`, and non-empty `prompt` and `successCriterion` text.
- Prompt IDs are unique within a pack. The level evidence rules must use those
  IDs for `debrief_answered` filters; the validator checks this when overrides
  exist.
- `GameRuntime.debriefPromptList()` returns the level overrides; the debrief UI
  and `submitDebrief` use the same list.
- `finishDebrief` still requires every listed prompt to have a non-empty answer.
- Per-level answers are still cleared on level entry (ADR-0046); no new save
  field is added.
- 03 keeps `prompt-obj-2` and EV-7 in this upgrade. 04 adds
  `prompt-obj-2-nmj` and a new required syllabus rule **EV-9**. The 04 level
  evidence changes to the new prompt. 05 and Silicon can add overrides later.
- Old levels without `debrief` continue to work. The public syllabus remains
  the source of evidence rules; the level supplies prompt text and IDs.

## Consequences

**Easier:**

- Each level can ask the question its puzzle actually assesses.
- 04's debrief no longer inherits the 03 answer or shows OBJ-2 met prematurely.
- Future levels need content-only prompt authoring.

**Harder:**

- Prompt IDs and evidence filters must stay in sync; validation is required.
- A pack can accumulate multiple prompt IDs for one objective, so the evidence
  list must be curated.

**Constrained:**

- No per-level prompt without an evidence rule if the prompt is required.
- No prompt text generated at runtime from arbitrary content.
- No new save field; answers remain per-level UI state.

## Alternatives considered

- **Syllabus prompt variants keyed by level** — couples curriculum text to the
  syllabus and makes level authoring less local. Rejected.
- **A separate debrief file per level** — more files and loader complexity for
  one small array. Rejected.
- **Keep the shared prompt** — leaves the evidence and text mismatch. Rejected.
- **A general prompt/assessment engine** — out of scope for an engine upgrade.
  Rejected.
