# language: en
# Source: ADR-0009, ADR-0010, ADR-0012
Feature: Feedback surfaces and cues
  Feedback projects puzzle/world state into persistent surfaces and sequences
  transient cues. It never becomes a second puzzle engine.

  Scenario: Persistent state is visible without a toast
    Given a puzzle node has a persistent capability
    When the puzzle state changes
    Then the sticky surface for that node is rebuilt from state
    And its text or accessibility alternative is non-empty
    And no transient cue is required to read the current state

  Scenario: A cause produces an attributed cue
    Given P2 rejects a prop at a receptor
    When the runtime ingests the puzzle event
    Then one cue is created for that cause
    And the cue carries actor p2, owner p2, a rejection reason, and copy
    And the live region text includes the actor attribution

  Scenario: Same-cause cues coalesce and expire
    Given two cues share a cause key
    When the director ticks
    Then the newest/highest-priority cue replaces the older one
    And the cue expires after its TTL in fixed ticks
    And persistent surfaces remain

  Scenario: Soft surfaces only consume their owner's input
    Given P1 and P2 each own a choice conversation
    When P2 confirms
    Then only the P2 conversation advances
    And the P1 conversation remains active

  Scenario: An off-screen surface falls back inside the safe area
    Given a surface anchor is outside the camera
    When the surface layer lays out the frame
    Then the surface is docked inside the safe area
    And its text and owner remain visible

  Scenario: A level without feedback content remains valid
    Given a level has no feedback block
    When it is parsed and validated without a feedback vocabulary
    Then it remains valid
    And runtime surfaces use capability defaults
