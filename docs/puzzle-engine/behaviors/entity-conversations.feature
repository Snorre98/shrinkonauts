# language: en
# Source: ADR-0011
Feature: Entity conversations
  Conversations are owned speech-bubble surfaces anchored to an entity, not a
  global blocking dialogue overlay.

  Scenario: P1 talks while P2 keeps moving
    Given P1 interacts with an agent
    When the conversation surface opens
    Then the game remains in the level state
    And P2 can keep moving and acting

  Scenario: Two players talk to entities at once
    Given P1 starts a conversation with one entity
    When P2 starts a conversation with another entity
    Then two speech-bubble surfaces exist
    And each surface carries its owner and actor attribution

  Scenario: A choice freezes only its owner
    Given a conversation reaches a choice node
    When the owner selects a choice
    Then the choice effect is applied
    And the other player's movement is not frozen

  Scenario: A conversation survives save/restore
    Given an active conversation is saved
    When the run is restored
    Then the conversation session is recreated
    And the dialogue node and owner are preserved

  Scenario: A legacy dialogue save migrates
    Given a 2.x save has a single legacy dialogue field
    When it is loaded
    Then it becomes one P1-owned conversation

  Scenario: A missing restore target closes safely
    Given a saved conversation references a missing entity or dialogue
    When the run is restored
    Then the conversation is not recreated
    And a recovery cue explains the closure
