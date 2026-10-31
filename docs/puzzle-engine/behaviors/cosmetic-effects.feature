# language: en
# Source: ADR-0013
Feature: Cosmetic feedback effects
  Effects communicate causality without owning state or collision.

  Scenario: A pulse travels from socket to socket
    Given a pulse source emits from the muzzle socket
    When the pulse event is projected
    Then the effect starts at the source anchor
    And the path ends at the receptor anchor
    And follow binding re-resolves moving anchors

  Scenario: A persistent effect cancels
    Given a persistent beam is attached to a source
    When the source becomes inactive
    Then the effect instance is cancelled

  Scenario: Tile visuals revert
    Given a tile region is tinted
    When the effect ends
    Then the authored tile appearance is restored
    And collision solids and bodies are unchanged

  Scenario: Effects never mutate state
    Given an effect plan is produced
    When the plan is mapped to the world port
    Then puzzle state is unchanged
    And physics bodies are unchanged
    And collision geometry is unchanged

  Scenario: Reduced motion preserves meaning
    Given reduced motion is enabled
    When an effect plan is simplified
    Then travel, bursts, streams, and dissolves become static markers or are omitted
    And surfaces and text remain unchanged
    And actor/owner attribution remains

  Scenario: Missing effect assets degrade
    Given an effect references a missing visual or audio asset
    When the scene renders
    Then the procedural/placeholder fallback is used
    And gameplay is not blocked or changed
