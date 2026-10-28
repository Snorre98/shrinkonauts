# Failure semantics contract

How the implemented system behaves when a puzzle action, feedback reference,
effect asset, conversation target, or save path is invalid. Source ADRs:
ADR-0004–0013. Deferred M1.5 features are labelled explicitly.

## 1. Retry policy and backoff

This is a local, fixed-step game, not a networked service. “Retries” are player
actions after feedback; there is no automatic background retry.

| Failure class | Player-visible result | Retry | Status |
|---|---|---|---|
| Blocked/rejected action | Attributed cue with reason and copy | Repeat after meeting the condition | Implemented |
| Empty/wrong receptor | Speech bubble plus persistent receptor state | Try the matching prop | Implemented |
| Pulse cooldown | Pulse-source meter/cooldown state | Wait and pulse again | Implemented |
| Cleared prop | Hidden; cannot be picked up | Reset restores the authored state | Implemented |
| Missing optional feedback label/socket | Descriptor/centre fallback | None needed | Implemented |
| Invalid feedback reference/tile target | Pack validation error before boot | Fix JSON | Implemented |
| Missing effect asset/cue | Placeholder/synth/silence; gameplay unchanged | None needed | Implemented |
| Missing feedback vocabulary | Pack validation error before boot | Pass the injected vocabulary | Implemented |
| Conditional link (`requires`) | Accepted target | — | Deferred |
| Locked prop | Accepted target | — | Deferred |
| Invalid side travel | Accepted target | — | Deferred |
| Schema validation error | Pack fails validation before boot | Fix JSON | Implemented |
| Save format/version error | ADR-0045 recovery path | Reload at checkpoint or new run | Implemented |

## 2. Feedback and effect failures

Feedback is presentation, never gameplay authority.

- A missing authored label falls back to the generated node label.
- A missing conventional `muzzle`/`mouth` socket falls back to the entity centre.
- A tile target with a non-tile-path preset is ignored with a validator warning.
- A missing effect asset falls back to the procedural effect layer; a missing
  audio cue falls back to synth or silence.
- A missing feedback recipe is either an explicit silent event or a validator
  error where the event is required to explain state.
- Reduced motion simplifies or removes movement effects; it never removes the
  persistent surface, text, or state distinction.
- Effect failure, asset failure, or audio failure is non-blocking and never
  changes puzzle, world, or collision state.

## 3. Feedback vocabulary failure

`validatePack` is pure and cannot import `feedback`. When content authors a
feedback block, the caller must supply:

```ts
interface FeedbackValidationVocabulary {
  effectPresetIds: readonly string[];
  tilePathPreset: string;
  nodeEffectSockets?: Readonly<Record<string, string | undefined>>;
}
```

If it is absent, validation emits `FEEDBACK_VOCABULARY_MISSING` and fails before
boot. This is a validation failure, not a runtime fallback.

## 4. Unknown audio cue names

Theme cue keys are validated against the known cue vocabulary. An unknown key
emits `AUDIO_CUE_UNKNOWN` and fails pack validation. Asset IDs that do not
resolve to audio emit `AUDIO_CUE_MISSING`. A logical cue with no configured asset
at runtime falls back to synth or silence.

## 5. Gate and prop failures

| Failure | Behavior | Status |
|---|---|---|
| Gate entity missing for a gate node | `PUZZLE_REFERENCE_MISSING` at validation | Implemented |
| Cleared prop pickup | Rejected; state unchanged | Implemented |
| `clear` twice | No-op; no duplicate event | Implemented |
| Clear a docked prop | Allowed; reset restores authored state | Implemented |
| Cleared prop out of bounds | No body; recovery not applicable | Implemented |
| Missing prop entity | `PUZZLE_REFERENCE_MISSING` at validation | Implemented |
| Physical gate body overlap/closure | Accepted target | Deferred |
| Locked prop pickup / unlock | Accepted target | Deferred |

## 6. Debrief and conversation failures

| Failure | Behavior | Status |
|---|---|---|
| No per-level debrief override | Syllabus-derived prompt fallback | Implemented |
| Empty answer | `finishDebrief` refuses; toast; no evidence loss | Implemented |
| 03 answer in 04 | Answers are level-scoped; 04 must answer its own prompt | Implemented |
| Missing conversation entity on restore | Conversation closes with a recovery cue | Implemented |
| Missing conversation dialogue/node on restore | Conversation closes with a recovery cue | Implemented |
| Locked conversation target moved out of range | Owner conversation closes with feedback | Implemented |
| Side-level return snapshot missing | Accepted target | Deferred |

## 7. Error surfacing to the caller

| Outcome | Caller-visible result |
|---|---|
| Invalid content | Pack validation error with code and path; no boot |
| Missing feedback vocabulary | `FEEDBACK_VOCABULARY_MISSING`; no boot |
| Blocked/rejected action | Attributed cue + persistent state |
| Missing save field | Default; load continues |
| Corrupt save | ADR-0045 recovery |
| Missing effect/audio asset | Placeholder/synth/silence; no gameplay change |
| Renderer rebuild failure | Existing fatal error overlay |

## 8. Invariants

- No blocked action removes evidence, health, or a prop permanently.
- No failure closes the main exit or revokes a solved gate.
- Reset is always available before a solve.
- Save/restore never loses global evidence.
- Feedback and effects never mutate puzzle, world, or collision state.
- Invalid content is rejected before runtime; invalid runtime actions degrade
  with feedback, not a dead run.
