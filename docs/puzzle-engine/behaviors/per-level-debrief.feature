# language: en
# Source: ADR-0006
Feature: Per-level debrief prompts
  Implementation status: partial. The syllabus-derived fallback is implemented;
  level overrides and EV-9 are deferred.

  A level may override the syllabus-derived debrief prompt.
  Normative per ADR-0006. A prompt is valid when its ID, objective, evidence
  rule, and displayed question agree.

  Scenario: A level override replaces the derived prompt
    Given a level declares debrief.prompts with prompt-obj-2-nmj
    When the player reaches the debrief
    Then the debrief shows the NMJ question and success criterion
    And submitting the answer records prompt-obj-2-nmj
    And EV-9 can be satisfied

  Scenario: A level without an override uses the fallback
    Given a level has no debrief field
    When the player reaches the debrief
    Then the prompt is derived from the level objective
    And its ID is prompt-obj-2
    And EV-7 can be satisfied

  Scenario: The 03 answer cannot satisfy the 04 prompt
    Given the 03 debrief recorded prompt-obj-2
    When the player enters 04
    Then the 04 debrief answers are empty
    And finishing without a new answer is refused
    And the 03 evidence remains in the event log

  Scenario: An empty answer blocks completion
    Given the debrief lists a prompt
    When the player presses Finish level with an empty answer
    Then the state stays in debrief
    And a toast asks for an answer
    And no completion event is recorded

  Scenario: Prompt IDs and evidence rules must match
    Given a level override lists prompt-obj-2-nmj
    And a required debrief_answered evidence rule filters a different prompt
    When the pack validates
    Then validation rejects the mismatch
    And no runtime starts

  Scenario: Prompt text and objectives are validated
    Given a prompt references an objective not in the level
    When the pack validates
    Then validation reports LEVEL_DEBRIEF_OBJECTIVE
    And the pack does not boot
