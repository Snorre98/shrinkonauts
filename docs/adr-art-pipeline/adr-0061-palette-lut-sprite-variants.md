# ADR-0061: Palette-LUT sprite variants

- **Status:** Accepted
- **Date:** 2026-10-29
- **Deciders:** Snorre
- **Related:** ADR-0047, ADR-0060, ADR-0062

## Context

The game needs colour variants of the same character: P2's accent swap, hub
civilians, NPC factions, damage flashes, and future palette scripts. Re-prompting
Ludo for each variant changes the silhouette, pose, proportions, and frame
timing, and it spends credits for a colour-only change. The M3 direction already
fixes P1/P2 as the same silhouette with different accents, so variants must be
derived rather than regenerated.

Raw Ludo sheets are not indexed. They contain roughly 46k–66k unique colours
and faux-pixel noise. A global hue rotation shifts the visor, tanks, outline,
and grime along with the suit, producing muddy edges and unintended colours.
Nearest-colour quantization without semantic masks can also map orange/brown
details to the muscle ramp.

## Decision

Clean and quantize the base sprite to an indexed palette before generating any
variant. Define a semantic palette map in
`art-source/characters/<character>/working/palette.json` with named ramps:

- `suit` — bone ramp by default.
- `joints` — dark teal ramp.
- `visor` — nerve/amber ramp.
- `tanks` — nerve-yellow ramp.
- `accent` — joint-cyan for P1, muscle-pink for P2.
- `outline` — ink/teal ramp.
- `shadow` / `grime` — bone-shadow or sage ramp.

Variants are deterministic lookup-table (LUT) transforms of the indexed base:

- P2 is an **accent-only** swap: `accent.joint → accent.muscle`. Suit, joints,
  tanks, outline, and grime stay byte-identical.
- Suit variants map `suit.bone` to another approved ramp (sage, joint, muscle,
  or teal) while keeping visor, tanks, joints, and outline fixed.
- Transient effects such as a damage flash may use a runtime tint, but final
  colour variants are baked PNGs.
- Every variant shares the base clip set and frame timing (ADR-0062).

No Ludo regeneration is used for a colour-only change. A new hue family is a
palette decision, not an ad hoc per-asset edit.

## Consequences

**Easier:**

- Exact silhouette and frame parity across variants.
- Cheap, reproducible, and testable variants.
- P2 and future NPCs derive from one master.
- Pixel-diff QA can prove that only the intended mask changed.

**Harder:**

- The base must be cleaned and indexed first.
- Palette maps and masks need maintenance.
- Adding a new hue requires an approved palette extension.

**Constrained:**

- No raw hue rotation on unquantized sheets.
- No variant that changes shape, props, or pose.
- No off-palette intermediate blends.
- No per-variant regeneration through Ludo.

## Validation

- The P1/P2 pixel diff is limited to the accent mask; every other pixel is
  identical.
- The contact sheet at 28×44 shows an identical silhouette.
- Every pixel belongs to an approved ramp.
- No anti-aliased or semi-transparent edge pixels.
- The variant's file size stays inside the player/entity budget.

## Alternatives considered

- **Re-prompt Ludo for each variant** — rejected: pose drift, cost, and
  inconsistent silhouettes.
- **Global hue rotation** — rejected: bleeds into visor, tanks, and outline.
- **Per-pixel manual recolour** — rejected: slow and error-prone across frames.
- **Runtime tint only** — rejected for final variants: a tint affects every
  pixel and cannot isolate suit versus accent; it remains acceptable for
  transient effects.
- **Separate hand-drawn variants** — rejected: unnecessary duplication and
  drift.

## References

- [`docs/m3/asset-requirements-v01.md`](../m3/asset-requirements-v01.md), §4.3
  (palette), §4.4 (character rules), §8.17 (P1/P2 prompts)
- ADR-0047 (pixel-art direction)
- ADR-0060 (source/working/runtime layers)
- ADR-0062 (animation clips)
