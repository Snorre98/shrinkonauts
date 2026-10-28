Feature: Material and pattern layer

  Scenario: An old room without material data keeps its renderer
    Given a room has no tileMaterials, legend, defaultMaterialId, or material bindings
    When the room is rendered
    Then the existing tileset path draws every solid cell
    And no material or pattern layer is created

  Scenario: A room mixes materials and autotiles them
    Given a room authors tileMaterials and a legend
    When the tile plan is built
    Then each solid cell resolves its material character or default material
    And the neighbour mask is computed from the same material id
    And the chosen variant is deterministic from material, coordinate, and seed
    And layers.tiles still decides collision and passability

  Scenario: A placeholder material renders before final art
    Given a material names palette tokens and an edge style
    When no atlas frame or final texture exists
    Then the renderer generates a deterministic placeholder texture
    And a cosmetic TileVisualState override composes on top

  Scenario: An atlas-backed variant set resolves by mask
    Given a variant set names an atlas and a fallback frame
    When a mask has an authored frame
    Then that atlas region is used
    When a mask has no authored frame
    Then the fallback frame is used
    And region bounds and frame references are validated

  Scenario: A world-space pattern continues across a tile and an object
    Given a tile and an object use the same pattern, scale, rotation, and seed
    When both sample world coordinates
    Then their pattern phases align across the shared boundary

  Scenario: Background patterns follow the authored space
    Given a background layer authors a material and pattern
    When the pattern space is world
    Then it moves with the layer's parallax
    When the pattern space is screen
    Then it stays fixed to the viewport
    When the pattern space is local
    Then it stays fixed to the layer

  Scenario: UI shares the world material language
    Given theme.ui.materials and theme.ui.patterns name valid slots
    When the pack is loaded
    Then panel, dialogue, and debrief surfaces receive material CSS variables
    And the text contrast baseline is preserved
    And a missing pattern falls back to the solid palette style

  Scenario: Materials never change collision or puzzle state
    Given a room is fully materialized
    When it is simulated with and without tileMaterials
    Then collision solids and physics snapshots are identical
    And materials add no save fields

  Scenario: Reduced motion keeps material identity
    Given a pattern has an authored animation
    When reduced motion is enabled
    Then the static frame remains
    And no pattern animation carries gameplay or puzzle timing
