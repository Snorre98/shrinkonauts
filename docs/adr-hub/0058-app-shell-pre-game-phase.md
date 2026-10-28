# ADR-0058: Pre-game bathroom hub as an app-shell phase

- **Status:** Proposed
- **Date:** 2026-10-28
- **Deciders:** Snorre
- **Related:** ADR-0009–0017, ADR-0034–0046, ADR-0047–0056

## Context

M1 boots directly into `03-nerve-forest`. The runtime is pack-scoped and
level-scoped: it requires loaded package content, a room document, and a
simulation before it can start. The game now needs a pre-game screen that owns
pack selection, player mode, the launch cinematic, and (later) the online lobby.

Putting that screen inside `GameRuntime` would force the runtime to exist before
a pack is selected. It would also mix menu transitions with the gameplay state
machine that currently guarantees overlay and debrief behavior.

## Decision

### 1. Add an outer application shell

`AppController` owns the pre-game lifecycle:

```text
boot → hub → loading-pack → launching → playing
                    ↘ hub + error
                    playing → hub
```

`GameRuntime` remains a pack/level runtime. It gains only two start options
(`resume` and `activeP2`); it does not gain menu, pack-select, or lobby states.

### 2. The hub is a separate content root

`public/hub/bathroom/` contains `hub.json`, a theme, and asset manifests. A
`HubDocument` describes background layers, machine anchors, the player path,
intro timings, and hub audio IDs. `HubScene` renders it with Phaser and the
existing asset pipeline.

The hub does not reuse `RoomSimulation`. It is a bounded menu scene with
idle motion and a launch timeline, not a playable room.

### 3. One Phaser game at a time

The hub game is destroyed after its launch timeline; the room game is created
with the selected pack. This avoids texture-key collisions between packs and
keeps the hub and gameplay asset sets independent. A black DOM curtain covers
the swap.

### 4. Direct boot remains available

`/?skipMenu=1&pack=anatomy-reflex` preserves the M1 direct-boot path for
debugging and existing browser tests. `/` is the hub.

### 5. Launch is skippable and reduced-motion-aware

The launch timeline is local presentation. It is skippable with a visible
button or `Esc`/`Space`/`Enter`, and the reduced-motion variant is a short
crossfade with the same narrative beats. Pack loading runs in parallel with
the timeline; a load failure returns to the hub with an error.

## Consequences

**Easier:**

- Pack selection exists before a runtime is constructed.
- M4 can add the online lobby in the same shell without rewriting boot.
- Existing headless runtime tests and direct-boot tests remain valid.
- Hub and gameplay assets cannot collide in Phaser's texture cache.

**Harder:**

- Boot is now a two-phase process with explicit error recovery to the hub.
- The app shell must dispose and recreate audio, UI, and Phaser instances.
- Hub content and pack content need separate validation paths.

**Constrained:**

- No gameplay logic in the hub.
- No pack content loads until the player starts a cycle (catalog/hub assets are
  the only prefetch).
- Only one Phaser game is alive at a time.

## Alternatives considered

- **Add `menu`/`lobby` states to `GameRuntime`.** Rejected: the runtime needs a
  pack before it can exist.
- **Use a DOM-only menu.** Rejected: the requested bathroom/machine scene is
  part of the game's visual language and needs the same renderer.
- **Render the menu entirely in Phaser.** Rejected for accessibility; the
  controls, focus, text scaling, and screen-reader labels belong in DOM.
- **Keep the hub game alive behind the room game.** Rejected: texture-key
  collisions and extra memory/context cost.

## Tests

- App-state transitions: hub → loading → launching → playing → hub.
- Direct boot still enters `03-nerve-forest`.
- Hub start enters the selected pack; failure returns to the hub.
- Returning to the hub preserves the selected mode and save state.
- Launch skip and reduced-motion paths reach the same room state.
- Only one `room` or `hub` Phaser scene is active at a time.

## References

- `src/game/app-state.ts`
- `src/game/boot.ts`
- `src/world/hub-scene.ts`
- `src/ui/hub-model.ts`
- `src/ui/hub-ui.ts`
- `public/hub/bathroom/hub.json`
- ADR-0059
