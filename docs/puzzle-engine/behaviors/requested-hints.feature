# language: en
# Source: ADR-0019
Feature: Request-gated shared help
  Shared help/tips appear only when a player deliberately requests information
  with the scan action inside an authored info area. They never appear from an
  idle, stuck, or proximity timer.

  Scenario: Scan inside an info area requests shared help
    Given an active unsolved puzzle has an authored info area
    And a player is inside that info area
    When the player presses scan and no unrevealed scan target is in range
    Then the shared help surface appears
    And it offers "Show hint" and "Reset puzzle"
    And it carries owner shared and audience both

  Scenario: Shared help is temporary
    Given the shared help surface is visible
    When its TTL expires in fixed ticks
    Then the surface is removed
    And it does not reappear automatically
    And pressing scan inside the info area requests it again

  Scenario: Scan target precedence
    Given a player is inside an info area
    And an unrevealed scan target is in range
    When the player presses scan
    Then the concept scan wins
    And the shared help surface does not appear

  Scenario: Help requires an info area
    Given a player is outside every authored info area
    When the player presses scan and no scan target is in range
    Then no shared help surface appears
    And the normal "Nothing to scan here" feedback is emitted

  Scenario: Either player can request and use shared help
    Given P1 and P2 are inside an info area
    When either player presses scan
    Then the shared help surface appears
    And either player may choose a hint or reset

  Scenario: Solving or resetting dismisses shared help
    Given the shared help surface is visible
    When the puzzle is solved or reset
    Then the help surface is dismissed immediately
