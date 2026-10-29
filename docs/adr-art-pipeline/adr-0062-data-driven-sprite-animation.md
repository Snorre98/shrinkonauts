# ADR-0062: Data-driven sprite animation and runtime state machine

- **Status:** Accepted
- **Date:** 2026-10-29
- **Deciders:** Snorre
- **Related:** ADR-0030, ADR-0048, ADR-0060, ADR-0061, ADR-0063

## Context

Ludo exports are flat frame grids with no clip names, no loop points, and no
game-state mapping. The current runtime loads `type: "sheet"` textures but
creates `this.add.image(...)` for players and entities; it never calls
`anims.create`, so a sheet would display frame 0 only. The player simulation
already exposes the state needed for animation: `onGround`, `vy`, `vx`,
`facing`, `dashTime`, and the `jump`/`land`/`dash` gameplay cues.

Hardcoding frame ranges, fps, and transitions in `room-scene.ts` will not scale
to multiple characters, variants, and actions. The animation system must be
data-driven, testable, and independent of the palette-variant pipeline.

## Decision

Define animation clips in a portable descriptor per character or shared clip
set, for example `player.anim.json`:

```json
{
  "texture": "sprite.player.p1",
  "frameWidth": 14,
  "frameHeight": 22,
  "origin": [0.5, 1],
  "animations": {
    "idle": { "frames": [0, 1, 2, 3], "fps": 6, "loop": true },
    "walk": {
      "frames": [4, 5, 6, 7, 8, 9],
      "fps": 10,
      "loop": true,
      "speedFromVelocity": true,
      "events": { "2": "footstep", "5": "footstep" }
    },
    "jump": { "frames": [10, 11], "fps": 12, "loop": false },
    "fall": { "frames": [12, 13], "fps": 10, "loop": true },
    "land": { "frames": [14, 15], "fps": 12, "loop": false, "next": "idle" }
  }
}
```

The runtime creates Phaser animations once, using the sheet texture:

```ts
this.anims.create({
  key: `${textureKey}:walk`,
  frames: this.anims.generateFrameNumbers(textureKey, { start: 4, end: 9 }),
  frameRate: 10,
  repeat: -1,
});
```

A small `PlayerAnimator` state machine selects the clip:

```ts
function chooseState(player: PlayerState, oneShot: string | null) {
  if (oneShot) return oneShot;
  if (player.dashTime > 0) return "dash";
  if (!player.onGround) return player.vy < 0 ? "jump" : "fall";
  if (Math.abs(player.vx) > 20) return "walk";
  return "idle";
}
```

Rules:

- Priority: one-shot action (land, scan, hurt) > dash > air (jump/fall) >
  ground locomotion (walk/idle).
- Play only when the state changes, with `sprite.play(key, true)` so a running
  loop is not restarted every frame.
- One-shot clips use `loop: false`; return to the locomotion state on
  `animationcomplete`, or use the descriptor's `next`.
- Facing uses `sprite.setFlipX(player.facing === -1)`. Do not bake left-facing
  frames.
- Walk/run speed uses `sprite.anims.timeScale`, clamped from velocity, to reduce
  foot sliding.
- Transitions are immediate by default. The installed Phaser 4.2.1 types do not
  expose the old `crossFade` play option; if a fade is required, use a short
  alpha tween or a dual-sprite blend. `chain()` remains available for sequences.
- Reduced motion pauses or slows the animator globally.
- Frame events emit visual cues such as footsteps and dust. Gameplay audio and
  effects continue to use the existing `jump`/`land`/`dash` cues.
- Palette variants share the same clip set; the animator binds it to the
  variant's texture.

The descriptor is the source of truth. The asset manifest may reference it or
the loader may resolve it by asset ID; either way, frame ranges and fps are not
hardcoded in the scene.

## Consequences

**Easier:**

- Add or tune clips without editing the scene.
- Share one clip set between P1 and P2.
- Unit-test state selection and clip validation.
- Control speed, looping, one-shots, and events consistently.
- Keep the static path by shipping a one-frame clip.

**Harder:**

- Need a descriptor schema, parser, and validator.
- `room-scene.ts` must create sprites and animations, not images.
- Animation lifecycle and one-shot completion need tests.

**Constrained:**

- No hardcoded frame ranges in scene code.
- No per-frame texture swaps or manual frame indices.
- No GIF playback at runtime (ADR-0063).
- No transition matrix for every pair; state priority plus optional fades is
  enough.

## Validation

- The descriptor parser rejects missing clips, out-of-range frames, invalid fps,
  and unknown `next` targets.
- Unit tests cover idle/walk/jump/fall/land/dash selection and one-shot return.
- P1/P2 share the same clip names and frame counts.
- A running loop is not restarted while the state is unchanged.
- Playwright screenshots cover idle, walk, jump, dash, and landing.
- `prefers-reduced-motion` pauses or slows the animation.

## Alternatives considered

- **Hardcode animations in `room-scene.ts`** — rejected: does not scale and
  mixes content with rendering.
- **One sheet per clip with a single manifest fps** — rejected: cannot express
  multiple clips per character and creates too many textures.
- **Aseprite tags as the only format** — rejected as the sole mechanism: it
  locks the pipeline to one tool; Aseprite can still be an import source.
- **GIF textures** — rejected: no reliable speed control, events, alpha, or
  performance.
- **Full transition matrix** — rejected: overkill; state priority plus optional
  fades covers the game.

## References

- Phaser 4.2.1 animation manager (`anims.create`, `generateFrameNumbers`,
  `play`, `chain`, `animationcomplete`, `timeScale`)
- [`src/world/room-scene.ts`](../../src/world/room-scene.ts)
- [`src/world/physics.ts`](../../src/world/physics.ts)
- ADR-0030 (sprite/animation format policy)
- ADR-0048 (half-resolution rendering)
- ADR-0060 (asset layers), ADR-0061 (palette variants), ADR-0063 (previews)
