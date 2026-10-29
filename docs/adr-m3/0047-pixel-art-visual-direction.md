# ADR-0047: Pixel-art visual direction

- **Status:** Accepted
- **Date:** 2026-10-29
- **Deciders:** Snorre
- **Related:** ADR-0027, ADR-0029, ADR-0030, ADR-0031, ADR-0032, ADR-0033, ADR-0048, ADR-0049
- **Supersedes:** the visual-style portion of ADR-0027. ADR-0027's licensing and audio decisions remain in force.

## Context

The M3 art direction was **“Dank Anatomy Cartoon”**, a hand-drawn style with wobbly ink outlines, paper grain, and painted texture. The game is a 2D exploration platformer with a DOM UI, so the world and the interface must share one visual language. The project direction is now a chunky 8-bit/pixel look rather than a painted look.

AI image generators can produce concepts but not reliable final pixel art. They mix pixel sizes, anti-alias edges, add high-resolution detail, and drift off-palette. A production-ready direction therefore needs a native pixel grid, a limited ramp palette, a fixed set of source sizes, and a manual cleanup step.

The existing asset architecture is unaffected: logical IDs, the placeholder-first provider chain, late asset integration, and the licence record all stay.

## Decision

Adopt **“Dank Anatomy Pixel Art”** for the whole game: world sprites, backgrounds, tile, badge, and UI chrome.

- Native pixel grid; 1 px dark teal-brown source outlines; no anti-aliasing.
- Three-step ramps per hue; 50% dither for damp, grimy texture; no smooth gradients.
- Minimum 2×2 colour blocks at display size.
- Keep the tone, palette identity, characters, asset IDs, and scope from `DESIGN.md` and the M3 asset brief.
- Use Ludo.ai for concepts and reference only. Final pixels are cleaned at source size in Aseprite, Piskel, or LibreSprite.
- The visual-style portion of ADR-0027 is superseded. Licensing and audio decisions in ADR-0027 remain.

## Consequences

**Easier:**

- One visual language across the world and UI.
- Crisp output at the 1280×720 capture size.
- Small files, a constrained palette, and clear acceptance checks (grid, palette, no anti-aliasing).
- Pixel art is cheap to iterate and easy to diff.

**Harder:**

- Manual pixel cleanup for 20 images.
- No soft gradients, painterly texture, or high-resolution detail.
- The UI and fonts must be redone in pixel style (ADR-0049).
- AI concepts need disciplined simplification; the generator cannot be the final renderer.

**Constrained:**

- No anti-aliasing, fractional scaling, mixed pixel sizes, or off-palette colours.
- No hand-drawn or painterly assets in M3.
- No per-asset style improvisation: the P1 anchor and the ramp palette are the source of truth.

## Alternatives considered

- **Keep hand-drawn “Dank Anatomy Cartoon”** — rejected: the project wants a pixel look, and a hand-drawn world with an 8-bit UI would be inconsistent.
- **Pixel UI only, hand-drawn world** — rejected: the decision is whole-game pixel art, not an overlay skin.
- **Strict NES constraints** — rejected: a 256×240 virtual canvas and 8×8 tiles would require redesigning the room, camera, physics, and UI.
- **AI-only pixel output** — rejected: generators produce faux-pixel grids with mixed pixel sizes and anti-aliased edges.
- **Hand-pixel every asset without concepts** — possible, but slower and less consistent; concepts plus cleanup is the chosen pipeline.

## References

- [`docs/m3/asset-requirements.md`](../m3/asset-requirements.md)
- [ADR-0027](../shrinkonauts/base-game/adr/0027-art-audio-direction-and-licensing.md)
- [ADR-0048](0048-half-resolution-pixel-rendering.md)
- [ADR-0049](0049-pixel-ui-chrome-and-typography.md)
- [`DESIGN.md`](../shrinkonauts/DESIGN.md)
