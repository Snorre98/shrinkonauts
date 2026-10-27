# language: en
# Source: ADR-0004
Feature: Prop lifecycle
  Props can be locked until an unlock link fires and cleared after use.
  Normative per ADR-0004. A prop is valid when its logical state, body, and
  visibility agree and reset restores its authored initial state.

  Scenario: A locked prop cannot be picked up
    Given a prop node has initial locked
    When a player presses carry near the prop
    Then the pickup is rejected
    And the prop remains visible and locked

  Scenario: An unlock link makes a locked prop free
    Given a prop is locked
    When an unlock link fires from its source
    Then the prop becomes free
    And the body becomes dynamic and pickable
    And a propReleased event is emitted

  Scenario: A clear link hides a prop
    Given a prop is free, placed, or docked
    When a clear link fires
    Then the prop becomes cleared
    And its body is hidden and non-collidable
    And a propCleared event is emitted

  Scenario: Clear is idempotent
    Given a prop is already cleared
    When a clear link fires again
    Then no second propCleared event is emitted
    And the prop remains cleared

  Scenario: Reset restores the initial prop state
    Given a prop was cleared or unlocked
    When the player resets the puzzle
    Then the prop returns to its spawn
    And its state becomes its authored initial state
    And the gate/timer/receptor state resets

  Scenario: Save and restore preserve locked and cleared states
    Given a prop is locked or cleared
    When the run is saved and restored
    Then the prop state is restored
    And its body/visibility matches the restored state
    And no old save gains a new state by default

  Scenario: Out-of-bounds recovery applies only to free or carried props
    Given a prop is locked or cleared
    When its position is outside the room bounds
    Then no out-of-bounds recovery is attempted
    And reset remains the recovery path
