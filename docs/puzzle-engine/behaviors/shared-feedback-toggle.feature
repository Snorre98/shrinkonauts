# language: en
# Source: ADR-0021
Feature: Shared feedback visibility
  Shared-owned transient feedback can be turned off globally. Persistent state,
  player-specific feedback, and cosmetic effects keep working.

  Scenario: Shared feedback is on by default
    Given a player has no saved shared-feedback preference
    When settings are loaded
    Then shared feedback is enabled

  Scenario: Turning shared feedback off drops new shared cues
    Given shared feedback is off
    When a shared cue is ingested
    Then it is not buffered in either player's inbox
    And it is not rendered
    And it is not announced
    And its cosmetic effects still run immediately

  Scenario: Turning shared feedback off clears pending shared copies
    Given a shared cue is pending for both players
    When shared feedback is turned off
    Then both pending copies are removed
    And the older player-specific cue is not restored

  Scenario: Turning shared feedback off removes visible shared cues
    Given a shared cue is visible
    When shared feedback is turned off
    Then the shared cue is removed immediately
    And persistent state surfaces and beats remain visible

  Scenario: Turning shared feedback off removes shared help
    Given the requested shared help surface is visible
    When shared feedback is turned off
    Then the help surface is removed immediately

  Scenario: Scan skips shared help while off
    Given shared feedback is off
    And a player is inside an authored info area
    When the player presses scan and no player feedback or scan target is pending
    Then no shared help surface appears
    And the help-request counter does not increase
    And the normal "Nothing to scan here" feedback is revealed

  Scenario: Player-specific feedback is unaffected
    Given shared feedback is off
    When a player action produces a player-owned cue
    Then the cue is buffered for that player
    And scan reveals it with its P1 or P2 attribution

  Scenario: Re-enabling affects only future shared cues
    Given shared feedback was turned off
    And shared cues were dropped or cleared
    When shared feedback is turned back on
    Then those cues do not reappear
    And the next shared cue is buffered normally

  Scenario: The preference persists
    Given shared feedback is turned off in the pause settings
    When the game is reloaded
    Then shared feedback is still off

  Scenario: Persistent state and effects keep working while off
    Given shared feedback is off
    Then gate state, timers, socket occupancy, and beats remain visible
    And existing cosmetic effects keep running
