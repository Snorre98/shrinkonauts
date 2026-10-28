# language: en
# Source: ADR-0012
Feature: Capability feedback coverage
  Coverage is enforced by closed types, exhaustive descriptor tables, validator
  checks, and tests.

  Scenario: A new node type cannot omit feedback silently
    Given a new puzzle node type is added to the union
    When the descriptor table is compiled
    Then a missing NodeFeedbackDescriptor is a type error

  Scenario: A new link type cannot omit feedback silently
    Given a new puzzle link type is added to the union
    When the descriptor table is compiled
    Then a missing LinkFeedbackDescriptor is a type error

  Scenario: Every event is cued or explicitly silent
    Given a puzzle event type is emitted
    When the feedback director ingests it
    Then it resolves to a cue recipe or an explicit silent reason

  Scenario: Gate and timer state stays persistent
    Given a gate is open or a timer is running
    When the sticky surfaces are rebuilt
    Then the gate/timer surface is sticky
    And its text or progress reflects the current state

  Scenario: Rejection carries a reason and copy
    Given a receptor rejects a prop
    When the event is projected
    Then the cue carries a rejection reason
    And the copy names the reason with actor attribution

  Scenario: Authored feedback is validated against injected vocabulary
    Given a level authors a beat, label, effect preset, or tile target
    When the pack is validated without a feedback vocabulary
    Then validation fails with FEEDBACK_VOCABULARY_MISSING
    And pack never imports feedback directly
