# language: en
# Source: ADR-0007
Feature: Side-level map travel
  Implementation status: deferred. The current runtime has no side-level travel
  or `returnTo` snapshot.

  A main level can enter a revealed side level and return to the exact captured
  main state. Normative per ADR-0007.

  Scenario: Enter a revealed side level from the map
    Given the current level is main
    And a revealed authored side level exists
    When the player selects it on the map
    Then the side level loads fresh
    And the current main level is captured in returnTo
    And the side level is autosaved as current
    And the room scene rebuilds for the side room

  Scenario: Finish a side level and return
    Given the player is in a side level with a returnTo snapshot
    When the side debrief finishes
    Then the main level snapshot is restored exactly
    And returnTo is cleared
    And the side level records level_completed and its debrief evidence
    And no pack_completed event is recorded

  Scenario: Save and restore during a side excursion
    Given the player saves while in a side level
    When the run is loaded
    Then the side level is restored
    And returnTo is restored
    And finishing the side returns to the saved main state

  Scenario: Invalid travel is rejected
    Given the target is missing, not side, not revealed, or the current level
    When the player attempts travel
    Then travel returns false
    And the current level and returnTo are unchanged
    And the map shows an availability reason

  Scenario: A side level cannot chain another side level
    Given the current level is side
    When the player opens the map and selects another side level
    Then travel is rejected
    And the player is told to finish and return first

  Scenario: Main progression remains linear
    Given the player is in a main level
    When the main debrief finishes
    Then ADR-0046 nextLevelIds/endLevelId behavior applies
    And map travel does not replace the main transition

  Scenario: Side evidence never completes the pack
    Given a side level has optional evidence
    When its debrief finishes
    Then its evidence is exported
    And the pack is not marked complete
