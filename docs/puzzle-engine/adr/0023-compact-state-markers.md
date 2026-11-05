# ADR-0023: Compact state markers and on-demand inspection

Status: Accepted
Date: 2026-11-04
Deciders: Snorre
Related: ADR-0009, ADR-0010, ADR-0011, ADR-0013, ADR-0018, ADR-0020, ADR-0021, ADR-0022

## Context

Persistent puzzle state was rendered as one text card per active node. A level
with ten or eleven nodes produced ten or eleven sticky cards. The cards carried
a `SHARED` header and a full sentence, were anchored above their objects, and
did not avoid one another when their anchors were close. Nodes without a world
anchor — triggers, counters, relays, and early plate/zone nodes — fell back to
the HUD top slot and stacked there.

The result was a play area full of boxes that hid the objects they described.
The shared-feedback toggle removed them, but it was all-or-nothing and did not
improve the default experience.

The original feedback design already called for per-node state icons and
failure-state icons attached to the relevant entity. The missing piece was a
presentation model that separates the compact state indicator from the detailed
text.

## Decision

### 1. Persistent state has a placement and a visual form

`FeedbackSurface` gains:

```ts
type FeedbackPlacement = "world" | "hud" | "hidden";

placement: FeedbackPlacement;
icon?: string;
content: {
  title?: string;
  text?: string;
  ...
};
```

- `world` means a compact marker or progress ring on a physical object.
- `hud` means a compact chip or an existing HUD card.
- `hidden` means the surface stays in the feedback director for its effects but
  is omitted from the runtime snapshot and the DOM.

The default is derived from presentation, anchor, and state:

| Source | Default |
|---|---|
| `stateSwap`, `socketFill`, `outline`, `pathGlow`, `prompt` with a world anchor | `world` marker |
| the same presentations without a world anchor | `hidden` |
| `hudMeter` with a world anchor and a running/complete state | `world` ring |
| `hudMeter` with no world anchor | `hud` chip |
| `hudMeter` in `idle`/`available` | `hidden` until it runs |
| `tracker` | `hud` chip |
| `speechBubble`, `playerCaption` | existing world text |
| `hudStatus`, `banner`, `screenCaption`, `modal`, `anchoredPanel` | existing HUD card |

Level content may override the placement, entity socket, and marker offset per
node. A `world` override requires an entity or rect anchor.

### 2. Markers are small world buttons

A world marker is a 32 px button with:

- a pack blueprint glyph;
- a state badge (`○`, `◇`, `●`, `◐`, `✓`, `!`, `×`, `↺`);
- an optional thin progress bar;
- a hover/focus tooltip with the state sentence;
- an accessible label containing the label, state sentence, and inspect hint.

Markers carry no owner header and no sentence in the resting state. They are
anchored above the object, flip below when the object is near the top safe area,
hide when the object is off-screen, and shift away from overlapping markers,
HUD chips, and the inspect panel.

A running timer or meter with a world anchor is a circular progress ring instead
of a square marker. The ring fraction comes from `content.progress`; the centre
shows the percentage, the counter value, or a terminal badge.

### 3. Logical state is compact, not floating

Triggers and relays without a world anchor are hidden. Counters and unanchored
timers are compact HUD chips at the left edge below the HUD bar. The blueprint,
progress checklist, and chips remain the fallback when a world marker is
off-screen.

### 4. One shared inspect panel

Clicking a marker, ring, or chip sends a `SurfaceAction` of type `inspect`. The
runtime creates one shared `anchoredPanel` surface at the bottom HUD slot:

- title, state sentence, progress meter, and a close button;
- one panel at a time; opening another source replaces it;
- pressing `I` toggles the nearest world marker/ring, or the first HUD chip;
- clicking the same source toggles it closed;
- the panel is not in the surface router and never consumes gameplay keys;
- it refreshes from the source surface each tick and closes when the source
  disappears, the level changes, shared feedback is disabled, or a conversation
  or help surface opens.

The `I` key is a shared host action because the inspected state is shared.

### 5. Effects are independent of visibility

Hidden surfaces remain in the director so their cosmetic effects keep running.
`GameRuntime.feedbackFrame()` filters hidden and shared surfaces from the
snapshot but keeps `frame.effects`. The effect host lifecycle is unchanged.

### 6. The shared-feedback setting still hides everything shared

`showShared` remains the single persisted on/off control. Turning it off hides
markers, rings, chips, beats, help, and the inspect panel. Player-owned cues and
captions remain.

## Consequences

**Easier:**

- The play area is readable by default; objects are no longer covered by cards.
- State is glanceable through a small icon and badge.
- Details remain available through one compact panel.
- Logical nodes no longer produce floating boxes.
- The same model works for anatomy and Silicon because the marker glyph follows
  the level blueprint symbol.

**Harder:**

- Players must learn the icon vocabulary; tooltips and the inspect panel provide
  text alternatives.
- The renderer now has four persistent forms: marker, ring, chip, and card.
- Layout must resolve overlaps across different anchors and between world items
  and HUD items.
- Tests must distinguish hidden surfaces from visible ones while still checking
  effects.

**Constrained:**

- No persistent text card for physical state in the default mode.
- No unanchored floating state marker.
- No second per-category visibility toggle.
- No text-size reduction; the inspect panel uses the normal text scale.
- No change to cue deferral, player captions, or effect timing.

## Alternatives considered

- **Compact text chips and collision avoidance only.** Less new interaction, but
  the play area would still carry many sentences and boxes. Rejected.
- **HUD-only state rail.** Zero play-area occlusion, but loses the spatial link
  between a state and the object it describes. Rejected in favour of world
  markers plus HUD chips for logical state.
- **Proximity-only markers.** Minimal clutter, but state is easy to miss and the
  markers flicker as players move. Rejected.
- **A modal inspect panel.** Clear text, but it interrupts play and breaks the
  co-op shared-screen flow. Rejected.
- **Hide only at the renderer.** Hidden surfaces would still reach the live
  region and input router. Rejected.
- **Remove persistent state entirely.** The world sprites do not yet encode every
  state; the blueprint and progress are not a substitute for object state.
  Rejected.

## References

- [`0009-feedback-ecs-substrate.md`](0009-feedback-ecs-substrate.md)
- [`0010-anchored-feedback-surfaces.md`](0010-anchored-feedback-surfaces.md)
- [`0018-player-attached-feedback-slot.md`](0018-player-attached-feedback-slot.md)
- [`0020-on-demand-transient-feedback.md`](0020-on-demand-transient-feedback.md)
- [`0021-shared-feedback-visibility-toggle.md`](0021-shared-feedback-visibility-toggle.md)
- [`0022-hide-shared-state-and-beats.md`](0022-hide-shared-state-and-beats.md)
