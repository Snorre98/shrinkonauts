# language: en
# Source: ADR-0020
Feature: On-demand transient feedback
  Transient feedback boxes never appear automatically. The player presses scan to
  reveal the newest pending message. Persistent state and cosmetic effects remain
  immediate.

  Scenario: Transient cues stay pending until requested
    Given a player action or puzzle event produces a transient cue
    When the director ticks
    Then the cue is stored in the player's inbox
    And it is not in the rendered frame
    And it is not announced in the live region

  Scenario: Latest pending message wins
    Given a player has a pending message
    When a newer message is produced for that player
    Then the older pending message is replaced
    And only the newest message can be requested

  Scenario: Shared cues are available to both players
    Given a shared cue is produced
    When it is ingested in deferred mode
    Then both players receive a pending copy
    And either player can request it
    And revealing it consumes both copies

  Scenario: Scan reveals pending feedback first
    Given a player has pending feedback
    When the player presses scan
    Then the pending message is revealed and consumed
    And no new concept scan or help surface is started in that press

  Scenario: A scan result is revealed immediately
    Given a player has no pending feedback
    And an unrevealed scan target is in range
    When the player presses scan
    Then the concept is scanned
    And the resulting cue is revealed immediately

  Scenario: Requested cues remain temporary
    Given a pending cue is requested
    When its TTL expires
    Then the visible cue is removed
    And it does not return automatically

  Scenario: Cosmetic effects are not deferred
    Given a deferred cue carries cosmetic effect plans
    When the cue is ingested
    Then its effects start immediately from a hidden host
    And revealing the cue later shows text only

  Scenario: Player captions are compact chips
    Given a player caption is requested
    Then its owner header row is not rendered
    And its text carries the P1 or P2 prefix
    And its body text keeps the normal size
