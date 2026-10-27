# language: en
# Source: ADR-0008
Feature: Schema compatibility
  New capabilities are optional minor-version fields; old content and saves
  keep their behavior. Normative per ADR-0008.

  Scenario: A 1.0 puzzle loads unchanged
    Given a puzzle document has schemaVersion 1.0
    And no initial, requires, unlock, or clear fields
    When it is parsed and run
    Then it behaves exactly as before the upgrade
    And no new event is emitted

  Scenario: A 1.1 puzzle uses the new capabilities
    Given a puzzle document has schemaVersion 1.1
    And valid initial, requires, unlock, or clear fields
    When it is parsed and run
    Then the new behavior applies
    And the validator accepts the document

  Scenario: A 1.0 level loads unchanged
    Given a level has no kind or debrief field
    When it is parsed
    Then kind defaults to main
    And the syllabus-derived debrief prompt is used
    And the level remains playable

  Scenario: A 1.1 level adds a side kind and debrief override
    Given a level has kind side and a debrief override
    When the pack validates
    Then the side/travel and prompt rules apply
    And the level can be authored in JSON only

  Scenario: A 2.0 save loads with defaults
    Given a run snapshot has schemaVersion 2.0
    And no returnTo
    And only free, carried, placed, or docked prop states
    When it loads
    Then it resumes with no side excursion
    And it does not gain new state silently

  Scenario: A 2.1 save round-trips new state
    Given a run snapshot has schemaVersion 2.1
    And locked/cleared props and a returnTo snapshot
    When it is saved and loaded
    Then the snapshot round-trips
    And the side return works

  Scenario: Invalid new values are rejected
    Given a puzzle has an unknown requires node or empty message
    When the pack validates
    Then validation fails with a coded error
    And no runtime starts

  Scenario: Old content tests remain in the suite
    Given the compatibility fixtures include 1.0 puzzle, 1.0 level, and 2.0 save
    When the test suite runs
    Then all compatibility cases pass
    And the upgraded engine does not require a big-bang migration
