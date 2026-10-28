# language: en
# Source: ADR-0002
Feature: Physical puzzle gates
  Implementation status: deferred. Logical gate state exists, but physical gate
  bodies are not implemented in this branch.

  A puzzle gate blocks only when it is closed and its room entity authors a body.
  Normative per ADR-0002. A gate is valid when its logical state and body state
  agree after every entry, tick, reset, restore, and return.

  Scenario: A closed authored gate blocks a player
    Given a puzzleGate entity declares components.body
    And its gate node is closed
    When a player walks into the gate from either side
    Then the player is stopped by the static body
    And the puzzle gate state remains closed

  Scenario: An open authored gate lets a player pass
    Given a puzzleGate entity declares components.body
    And its gate node is open
    When a player walks through the gate cell
    Then the player crosses without a solid collision
    And the gate remains open until a close link applies

  Scenario: A latched gate ignores close
    Given a gate node has latched true and is open
    When a close link fires
    Then the gate stays open
    And its body stays absent

  Scenario: A non-latched gate closes and blocks again
    Given a gate node has latched false and is open
    When a close link fires
    Then the gate becomes closed
    And its body is present and collidable

  Scenario: A gate without a body stays visual-only
    Given a puzzleGate entity has no components.body
    And its gate node is closed
    When a player walks through the gate cell
    Then the player is not blocked
    And the logical gate state still opens and closes

  Scenario: Reset and restore resynchronize bodies
    Given a gate was open before reset or save
    When the player resets the puzzle or restores the run
    Then the gate logical state is restored
    And the corresponding body is present or absent to match
    And no player is teleported by the synchronization

  Scenario: Closing on an overlapping player does not fail the run
    Given a player overlaps a gate cell
    When the gate closes
    Then Matter resolves the overlap
    And the player is not respawned solely because of the gate
