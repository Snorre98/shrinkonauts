# ADR-0065: P2 bone suit and joint-cyan visor

- **Status:** Accepted
- **Date:** 2026-11-01
- **Deciders:** Snorre
- **Supersedes:** ADR-0064
- **Related:** ADR-0047, ADR-0048, ADR-0060, ADR-0061, ADR-0062

## Context

ADR-0064 defined P2 as an orange-suit, bone-visor permutation of P1. The
approved P2 source sheets now use a different concept: a bone suit, a joint-cyan
visor and backpack tank, teal/bone-shadow joints, and a small nerve-amber chest
accent. The P2 walk and jump sheets were generated and approved separately from
P1.

The orange permutation is no longer the approved P2 design. Keeping it in the
requirements would make the art register, palette LUT, tests, and runtime
sprite disagree. The accepted ADR-0064 record stays immutable; this ADR records
the replacement decision.

## Decision

P2 is a **bone suit with a joint-cyan visor and backpack tanks**, a
**nerve-amber accent**, teal/bone-shadow joints, an ink outline, and bone-shadow
grime. The canonical P2 role map is:

| Role | P1 | P2 |
|---|---|---|
| Suit | bone | bone (unchanged) |
| Visor | nerve | joint |
| Tanks | nerve | joint |
| Accent | joint | nerve |
| Joints | teal | teal (unchanged) |
| Outline | ink | ink (unchanged) |
| Grime | bone-shadow | bone-shadow (unchanged) |

P2 is still the same character cell and silhouette as P1: 14×22 source,
28×44 display, bottom-centre origin, same clip names. P2 has its own approved
Ludo walk and jump sheets and, for the POC, those sheets are used directly
rather than deriving P2 from the P1 master. The P1 palette LUT remains available
for future derived variants and is updated to the role map above.

The P1 and P2 walk sources have different frame counts (49 and 36). Runtime
normalizes the walk cycle duration by setting each sheet's fps; it does not
require identical frame counts.

Orange is no longer used on P2. The orange ramp remains in the palette document
as a reserved theme ramp, but it must not appear on P2 or any other sprite.

## Consequences

**Easier:**

- The approved P2 sheets can be used without a lossy Ludo regeneration.
- P1 and P2 remain readable as the same character with a clear visor/tank swap.
- The palette LUT and tests match the approved P2 concept.
- The P2 source sheets keep their own pose and timing detail.

**Harder:**

- P2 has its own source pipeline and clip descriptor.
- P1/P2 walk timing must be normalized because frame counts differ.
- The orange palette entry is now unused on P2 and needs a clear “reserved”
  label so it is not reintroduced by accident.

**Constrained:**

- No orange on P2.
- No new P2 pose or equipment drift.
- No P2 runtime derivation from P1 for the POC; use the approved P2 sheets.
- P2 keeps the same 14×22 cell, origin, and clip names as P1.

## Validation

- P2 reads at 28×44 on `#101a20`; bone suit, cyan visor, cyan tank, and amber
  chest accent are legible.
- The P2 walk and jump sheets are the approved sources and slice cleanly.
- Every P2 pixel is on an approved ramp; no orange or stray muscle pink.
- P1/P2 share the same cell, origin, and clip names.
- Walk cycle duration is comparable even though P1 has 49 frames and P2 has 36.
- P2 does not change silhouette, equipment, or facing conventions.

## Alternatives considered

- **Keep the orange-suit P2 (ADR-0064)** — rejected: the approved P2 concept
  changed.
- **Derive P2 from P1 with the palette LUT** — rejected for the POC: an approved
  P2 source sheet exists and preserves the intended visor/tank treatment.
- **Use P2 poses with P1 colours** — rejected: it would lose the approved
  cyan-visor identity and add an unnecessary remap step.
- **Remove the orange ramp entirely** — rejected: the theme still exposes orange
  tokens; keep the ramp reserved and ban it from P2.

## References

- [`docs/m3/asset-requirements-v01.md`](../m3/asset-requirements-v01.md)
- [`art-source/characters/player-p2/`](../../art-source/characters/player-p2/)
- [`art-source/characters/player-p1/working/palette.json`](../../art-source/characters/player-p1/working/palette.json)
- [ADR-0061](adr-0061-palette-lut-sprite-variants.md)
- [ADR-0062](adr-0062-data-driven-sprite-animation.md)
- [ADR-0064](adr-0064-orange-p2-suit-palette-swap.md)
