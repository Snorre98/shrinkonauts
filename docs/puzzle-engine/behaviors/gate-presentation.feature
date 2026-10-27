# language: en
# Source: ADR-0003
Feature: Gate and prop presentation state
  The room scene projects simulation state without owning puzzle logic.
  Normative per ADR-0003. A presentation is valid when it matches the current
  gate/prop state and adds no simulation delay.

  Scenario: A closed gate uses its closed presentation
    Given a puzzleGate has a closedSprite asset ID
    And the gate is closed
    When the room is rendered
    Then the sprite uses the closed texture
    And the body state is closed

  Scenario: An open gate uses its open presentation
    Given a puzzleGate has an openSprite asset ID
    And the gate is open
    When the room is rendered
    Then the sprite uses the open texture
    And the body state is absent

  Scenario: Missing open/closed art falls back to the base sprite
    Given a puzzleGate has no openSprite or closedSprite
    And the gate opens
    When the room is rendered
    Then the base sprite remains visible with the open fallback alpha/tint
    And no missing-asset error is raised

  Scenario: A cleared prop is hidden
    Given a prop state is cleared
    When the room is rendered
    Then the prop sprite is hidden
    And the prop has no collision body

  Scenario: A locked prop remains visible
    Given a prop state is locked
    When the room is rendered
    Then the prop sprite is visible
    And the prop cannot be picked up

  Scenario: Reduced motion uses immediate state swaps
    Given reduced motion is enabled
    When a gate opens or a prop clears
    Then the visual state changes without a tween or timed animation
    And the simulation state is not delayed
