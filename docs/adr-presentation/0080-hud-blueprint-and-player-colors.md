# ADR-0080: Compact HUD blueprint, player colours, and the in-room HUD layout

- **Status:** Proposed
- **Date:** 2026-11-04
- **Deciders:** Snorre
- **Related:** ADR-0019, ADR-0020, ADR-0049, ADR-0070, ADR-0072, ADR-0073
- **Milestone:** M3.75

## Context

The in-room HUD has grown by accretion:

- the header carries the level title, objectives, abilities, hint text, and
  status badges;
- the system map is a `Tab` modal showing pack-level nodes and edges;
- the puzzle-progress beats are a bottom-left panel that covers P1's spawn;
- the controls are a dense top-right panel listing both players;
- the puzzle hint is buried in the pause/settings overlay;
- player-coded feedback uses P1 joint-cyan and P2 muscle-pink, which does not
  match the player suits.

The result is a HUD that reports state but does not answer the player's basic
planning questions: *What is the goal? What is the next step? Which player acts?
How do I do it?*

ADR-0073 already identifies the density and safe-area problem but leaves the
information architecture unchanged. M3.75 needs an explicit decision about the
map's purpose, the header composition, the progress/hint placement, and player
colour tokens before implementation.

## Decision

### 1. The in-room HUD is a three-zone header

The level HUD uses one persistent header band:

- **identity** on the left: eyebrow, level title, objectives, per-player ability
  summary;
- **blueprint** in the centre: a compact 2–4-component visual abstraction of the
  current puzzle;
- **checklist** on the right: the current puzzle's beats with done/active/pending
  states and a `done/total` count;
- **hint/status strip** below: hint button, hint count, current hint text, and
  the existing mode/audio/autosave badges.

The header is compact by default (roughly 130–160 px at 1280×720). A density
state (`full`/`compact`/`minimal`) collapses the header at narrow widths or large
text scales. The full information remains reachable through the `Tab` popup or
pause menu.

The bottom-left progress panel is removed. The top-right Controls panel is
removed from gameplay; the pause menu keeps the full shared and per-player
control list.

### 2. The map becomes a compact puzzle blueprint

The map's purpose changes from a pack-level system map to a **compact visual
abstraction of the current room puzzle**.

- The blueprint is a left-to-right chain of **2–10 components**, normally
  **2–4**. Each component is a conceptual station, not a room object.
- Each component groups one or more checklist beats.
- The header shows **icons only**, with no text in the blueprint. Labels appear
  in the `Tab` popup and on hover/focus.
- All components are visible from the start with `done`, `active`, or `pending`
  states. There is no separate goal anchor; the last component is the goal.
- The detailed beats stay in the header checklist. The blueprint is the
  simplified causal shape, not a second checklist.
- The active component is highlighted with the acting player's colour.
- Hints annotate the active component and do not reveal extra detail.

The room-to-room context is **not** part of the compact header blueprint. It
moves to the `Tab` popup, which shows:

- the expanded blueprint with component labels;
- the system chain (`03 NERVE FOREST → 04 MUSCLE EFFECTOR → 05 ?`);
- a symbol/state legend;
- the hint history and a `Next hint` button.

Clicking the compact header blueprint opens the same popup. The internal `map`
game state key is retained for compatibility; the user-facing name is
"Blueprint".

### 3. Blueprint data is authored with a fallback

Each puzzle may author a `blueprint` block under
`level.feedback.puzzles[puzzleId]`:

- optional `title`;
- ordered `components` with `id`, `label`, `symbol`, `beatIds`, and `x`;
- optional `edges` with `from`, `to`, and `type`;
- optional `steps` with `componentId` and `actor` (`p1`, `p2`, `both`,
  `shared`).

The last component is the goal; there is no `goalGroupId`. If a puzzle has no
authored blueprint, the runtime derives one from the beats, puzzle node types,
and solution actions. The fallback groups beats into at most four components.

`pack:validate` checks component/beat/edge/step references, requires 2–10
components, warns above 4, and warns when a beat is not covered by a component.

### 4. Player colours become first-class tokens

Add dedicated CSS tokens:

```css
--color-player-p1: var(--color-orange);
--color-player-p2: var(--color-joint);
```

They apply to feedback borders, owner chips, blueprint actor markers, the active
blueprint ring, the bottom player cards, and the per-player ability summary.
Colour is always paired with a `P1`/`P2` label or icon so it is never the only
cue.

### 5. Bottom player cards replace the shared Controls panel

- P1 card bottom-left, orange; P2 card bottom-right, blue/cyan.
- Cards are slim, low-contrast, and `pointer-events: none`.
- They list all per-player controls; unavailable abilities are dimmed.
- The P2 card is hidden in solo mode.
- Shared controls remain in the pause menu.
- The interaction prompt stays bottom-centre above the cards.

### 6. The HUD measures and reserves its own safe area

The header and bottom-card insets are measured with `ResizeObserver` and
`window.resize`, cached, and passed to the feedback layout. Prompts, toasts, and
anchored surfaces must not render under the HUD. Measurements are not taken on
every game tick.

### 7. Blueprint symbols are an abstract nanobanana kit

The symbol kit is 32×32 `ui-1x` pixel art, transparent, palette-locked, and
abstract: input, threshold, flow, terminal, gate, relay, timer, carry, receptor,
pulse, clear, optional goal, player markers, check/lock/unknown. CSS/SVG supplies
connectors and state rings. Placeholder glyphs ship first; final art is accepted
against a readability gate. The full brief is
[`docs/m3.75/blueprint-symbol-asset-brief-v01.md`](../m3.75/blueprint-symbol-asset-brief-v01.md).

## Consequences

### Easier

- The player can see the shape of the puzzle, the active part, and the acting
  player without opening a modal.
- The progress checklist no longer covers P1's spawn.
- Hints are discoverable and countable.
- Player attribution is consistent across the HUD and feedback.
- The component model can support future puzzle types without new UI code.
- The safe-area plumbing prevents the HUD and feedback layers from fighting.

### Harder

- The header is denser; 720p and 200% text need explicit density states.
- Authored blueprint data adds a small content burden per puzzle.
- The old system-map overlay and its tests must be migrated.
- Moving beats out of the feedback renderer requires care with live
  announcements and e2e selectors.
- Player-colour migration changes existing screenshots and visual expectations.
- Nanobanana glyph quality is a risk at 32×32; the placeholder-first policy and
  readability gate mitigate it.

### Constrained

- No blueprint component may show literal room coordinates or a labelled
  walkthrough in the compact header.
- No player-coded element may rely on colour alone.
- No HUD panel may cover the prompt/toast safe area.
- No new gameplay key is introduced for hints; keyboard access is through the
  expanded blueprint popup.
- The `map` state key may remain for compatibility, but the user-facing copy is
  "Blueprint".

## Validation

- At 1280×720, the header shows identity, 2–4 blueprint icons, checklist, and
  hint strip; P1 spawn is visible and the bottom cards do not cover the players.
- The blueprint shows all components from the start with done/active/pending
  states; the last component reads as the goal.
- A hint updates the header count/text and highlights the active component.
- `Tab` opens the expanded blueprint with labels, system chain, legend, and hint
  history; `Esc` closes it and restores focus.
- Clicking the compact blueprint opens the same popup.
- P1/P2 cards are bottom-left/right with the correct colours; P2 hides in solo.
- Player-coded feedback uses the same tokens and retains text/icon cues.
- Text scales 1/1.25/1.5/2 and 720 px width enter the defined density states
  without clipping or unreachable content.
- Feedback surfaces and prompts never render under the header or cards.
- `npm test`, `npm run pack:validate`, `npm run pack:smoke`,
  `npm run smoke:e2e`, `npm run build`, and `git diff --check` pass.

## Alternatives considered

- **Keep the system map and add a separate blueprint.** Rejected: two maps
  compete for the same question and the header has no room for both. The system
  map moves into the `Tab` popup as room-to-room context.
- **Show one node per beat.** Rejected: the blueprint would duplicate the
  checklist instead of simplifying it. Components group beats.
- **Show the full labelled solution in the header.** Rejected: it spoils the
  puzzle and makes the header unreadable at 720p.
- **Derive the blueprint entirely from the puzzle graph.** Rejected as the
  primary path: the graph does not know conceptual grouping, co-op actor intent,
  or the desired visual language. Kept as a fallback.
- **Keep the bottom-left progress panel.** Rejected: it covers P1's spawn and
  duplicates the blueprint's progress story.
- **Keep hints in pause only.** Rejected: hints are a core planning action and
  should be visible during play.
- **Use the existing P1-cyan/P2-pink feedback colours.** Rejected: they do not
  match the suits and make player attribution inconsistent.
- **Generate every state as a separate raster glyph.** Rejected: it multiplies
  the asset count; CSS state rings/dashes are sufficient.
- **Render the HUD in canvas.** Rejected for the same reasons as ADR-0049:
  accessibility, text layout, and Playwright testability.

## References

- [`../m3.75/README.md`](../m3.75/README.md)
- [`../m3.75/blueprint-symbol-asset-brief-v01.md`](../m3.75/blueprint-symbol-asset-brief-v01.md)
- [`0073-hud-density-and-canvas-scaling.md`](0073-hud-density-and-canvas-scaling.md)
- [`0072-asset-fidelity-tiers-and-encoding.md`](0072-asset-fidelity-tiers-and-encoding.md)
- [`../../src/ui/game-ui.ts`](../../src/ui/game-ui.ts)
- [`../../src/ui/model.ts`](../../src/ui/model.ts)
- [`../../src/feedback/beats.ts`](../../src/feedback/beats.ts)
- [`../../src/ui/layout.ts`](../../src/ui/layout.ts)
- [`../../public/packs/anatomy-reflex/levels/03-nerve-forest/level.json`](../../public/packs/anatomy-reflex/levels/03-nerve-forest/level.json)
- [`../../public/packs/anatomy-reflex/levels/04-muscle-effector/level.json`](../../public/packs/anatomy-reflex/levels/04-muscle-effector/level.json)
