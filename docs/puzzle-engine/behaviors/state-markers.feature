# language: en
# Source: ADR-0023
Feature: Compact shared state markers and inspection

  Persistent shared state is a small world marker or progress ring instead of a
  text card. One shared inspect panel shows the full label, state, and progress.

  Scenario: Physical state projects as a world marker
    Given a persistent surface with a physical presentation and an entity or rect anchor
    Then its placement is "world"
    And its visual form is a marker

  Scenario: Unanchored logical state is hidden
    Given a persistent surface with a physical presentation and no world anchor
    Then its placement is "hidden"
    And it is omitted from the runtime snapshot
    And its cosmetic effects keep running

  Scenario: Timers and counters use compact readouts
    Given a running timer with a world anchor
    Then its placement is "world"
    And its visual form is a progress ring
    And an idle timer is hidden until it starts
    And a counter without a world anchor is a HUD chip

  Scenario: Clicking a marker opens one shared inspect panel
    Given a visible marker, ring, or chip
    When the player clicks it
    Then one inspect panel opens at the bottom HUD slot
    And the panel shows the label, state sentence, progress, and a close button
    And opening another source replaces the panel

  Scenario: I toggles the nearest inspect source
    Given the player is in the level
    When the player presses I
    Then the nearest world marker or ring within range opens
    And if none is in range, the first HUD chip opens
    When the player presses I again
    Then the panel closes

  Scenario: Inspect does not consume gameplay input
    Given the inspect panel is open
    Then it is not registered as an interactive surface
    And player movement and actions continue

  Scenario: Hidden surfaces keep their effects
    Given a persistent surface is hidden by placement or shared feedback is off
    Then its text and marker are omitted from the runtime snapshot
    And its effect plans still reach the world effect sink

  Scenario: Shared feedback off hides markers and the panel
    Given an inspect panel is open
    When shared feedback is turned off
    Then the panel closes
    And markers, rings, chips, beats, and help are hidden
    And player-owned cues and captions remain

  Scenario: Level content controls marker placement
    Given a level feedback node override
    Then it may choose placement "world", "hud", or "hidden"
    And it may choose an entity socket and pixel offset for a world marker
