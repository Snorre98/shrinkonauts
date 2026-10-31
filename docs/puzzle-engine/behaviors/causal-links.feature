# language: en
# Source: ADR-0005
Feature: Conditional links and blocked feedback
  Implementation status: deferred. `requires`, authored messages, and
  `linkBlocked` are accepted targets but are not in the current schema.

  A link with requires applies only when the referenced node is active.
  Normative per ADR-0005. A blocked link is feedback, not a fail state, and
  never mutates its target.

  Scenario: A blocked pulse does not bind
    Given a pulse link requires the Ca gate
    And the Ca gate is closed
    When the player pulses the terminal
    Then the pulse is consumed
    And the receptor does not bind
    And a linkBlocked event carries the authored message
    And the normal pulse cooldown starts

  Scenario: An active condition lets the pulse bind
    Given a pulse link requires the Ca gate
    And the Ca gate is open
    And the ACh packet is on the matching receptor
    When the player pulses the terminal
    Then the receptor binds
    And the receptor state becomes bound
    And the win predicate can evaluate

  Scenario: A blocked increment does not count
    Given an increment link requires a relay
    And the relay is inactive
    When the source event fires
    Then the counter does not increment
    And linkBlocked is emitted

  Scenario: A blocked link without a message is silent
    Given a conditional link has no message
    And its condition is false
    When the source event fires
    Then the target is not mutated
    And no toast is shown

  Scenario: A link without requires keeps old behavior
    Given a link has no requires field
    When its source event fires
    Then it applies exactly as before the upgrade

  Scenario: Conditional state links are rejected
    Given a link uses requires on open, close, activate, or deactivate
    When the pack validates
    Then validation rejects the link with a coded error
