# ADR-0063: Build-time animation previews, not runtime GIFs

- **Status:** Accepted
- **Date:** 2026-10-29
- **Deciders:** Snorre
- **Related:** ADR-0060, ADR-0062

## Context

The team needs to review animation loops, speed, and palette variants without
launching the game. GIFs are convenient for documentation, the GDD, and the
capture video, but they are a poor runtime format: limited palette, one-bit
alpha, no animation events, no reliable speed control, and extra decode cost.
If preview timing is authored separately from runtime timing, the two drift.

## Decision

Generate animation previews at build time from the same runtime sheet and
animation descriptor used by the game:

- `scripts/art-preview.ts` reads the runtime sheet plus `*.anim.json`.
- It renders each clip at an integer scale (4× or 8×) with nearest-neighbour
  sampling, using the clip's fps, loop, and frame order.
- It writes GIFs and a labelled contact sheet under `art-source/previews/` or
  `docs/.../previews/`; these are not served from `public/`.
- It can also emit WebM/MP4 for higher-quality review.
- `ffmpeg` (already available on the development machine) or `gifenc` is used;
  no runtime dependency is added.
- The runtime uses Phaser animations only. No GIF loader or GIF plugin is added
  to the game.

The preview generator is part of the art build, not a separate manual step.
Regenerating the runtime sheet also regenerates the previews, so timing and
frame order cannot drift.

## Consequences

**Easier:**

- Review loops and speed without launching the game.
- Share variants and clips with stakeholders.
- Keep preview timing identical to runtime timing.
- Produce GDD/video assets from the same source.

**Harder:**

- Need a preview script and an output convention.
- Previews can go stale if the build is not rerun.
- GIF colour limits may hide palette problems; the contact sheet and source
  review remain authoritative.

**Constrained:**

- No GIFs in `public/`.
- No runtime GIF playback.
- No duplicated fps/frame-order data between preview and game.

## Validation

- Every clip in the descriptor has a matching preview.
- The preview's frame count and duration match the descriptor.
- The preview uses the same palette and pixel scale as the runtime sheet.
- Regenerating from a clean checkout produces identical previews.
- No `.gif` file is referenced by a manifest or served from `public/`.

## Alternatives considered

- **Runtime GIF plugin** — rejected: alpha, colour, speed, events, and
  performance limitations.
- **Hand-recorded GIFs** — rejected: not reproducible and drifts from runtime
  timing.
- **Only in-game review** — rejected: slower feedback and harder to share.
- **Separate preview timing file** — rejected: duplicates the descriptor and
  invites drift.

## References

- ADR-0062 (data-driven animation and runtime state machine)
- ADR-0060 (source/working/runtime layers)
- `ffmpeg`, `gifenc`
