# ADR-0064: Orange P2 suit and visor palette swap

- **Status:** Accepted
- **Date:** 2026-10-31
- **Deciders:** Snorre
- **Related:** ADR-0047, ADR-0048, ADR-0060, ADR-0061, ADR-0062
- **Amends:** the P2 palette rule in `docs/m3/asset-requirements-v01.md` §4.4 and §8.17

## Context

The M3 pixel direction defines P2 as an accent-only variant of P1: the same bone
suit, amber visor, nerve-yellow tanks, and a muscle-pink accent swap. That keeps
the silhouette identical but gives P2 a weak identity at 28×44.

A suit-colour variant is already supported by ADR-0061, but the approved suit
targets are bone, sage, joint, muscle, and teal. None of them is orange. Orange
was explicitly banned in §4.3 because generic hue drift produced muddy edges and
unintended colours.

A straight orange suit would also put the suit close to the amber visor and
nerve-yellow tanks, reducing helmet and backpack readability. The requested
direction is therefore a **palette swap**, not a one-ramp recolour:

- the visor's orange moves to the suit;
- the suit's bone moves to the visor and backpack tanks;
- the joint-cyan accents move to muscle pink.

The orange used here is not invented: `#e59b34` is the dominant visor orange in
the approved Ludo source frame, with `#813115` as its dark edge.

## Decision

Approve a ninth three-step ramp, **Orange**, used only on the P2 suit:

| Family | Shadow | Base | Highlight | Use |
|---|---|---|---|---|
| Orange | `#813115` | `#e59b34` | `#ffd28a` | P2 suit only |

Canonical P2 becomes a deterministic palette permutation of P1:

- `suit.bone → orange`
- `visor.nerve → bone`
- `tanks.nerve → bone`
- `accent.joint → muscle`
- joints, outline, and grime stay unchanged.

The visor and tanks use the bone ramp and keep their ink rim. There is no cyan
glint. Muscle pink remains the P2 accent on the chest light and shoulder trim,
so P1/P2 feedback attribution does not change.

The variant is derived from the cleaned, indexed 14×22 P1 master with a
single-pass palette LUT. It is not regenerated through Ludo. P2 shares P1's
silhouette, frame cell, baseline, and clip timing. The runtime asset ID stays
`sprite.player.p2`.

Orange is not a general-purpose colour. It must not appear in other sprites,
materials, backgrounds, effects, or UI chrome. A future asset that needs orange
requires another palette decision.

## Consequences

**Easier:**

- P2 reads immediately at 28×44 without changing the silhouette.
- The visor and tanks stay legible because they move to bone while the suit
  becomes orange.
- The swap is reproducible and testable with a three-ramp LUT.
- P1/P2 attribution remains muscle pink versus joint cyan.

**Harder:**

- The palette now has a documented exception to the orange ban.
- The P2 prompt, negative prompt, acceptance criteria, and contact sheet must be
  updated.
- The base must be semantically indexed: suit, visor, tanks, accent, joints,
  outline, and grime need distinct palette roles.
- The visor loses its warm amber focal point and must read through the ink rim
  and the bone ramp alone.

**Constrained:**

- No orange outside the P2 suit.
- No orange-on-orange visor or tanks.
- No new equipment, pose, or silhouette change for P2.
- No global hue rotation or per-pixel manual recolour.
- No Ludo regeneration for the colour-only variant.

## Validation

- P1/P2 silhouettes are identical at 28×44.
- The pixel diff is limited to the suit, visor/tank, and accent masks; joints,
  outline, and grime are byte-identical.
- Every pixel is on an approved ramp; orange appears only on the P2 suit.
- The bone visor and tanks read against the orange suit at 28×44.
- No anti-aliasing or semi-transparent edges; source is 14×22.
- The player PNG stays within the 16 KB budget.
- `npm run art:variant` emits a report with zero changed pixels outside the
  mapped roles.

## Alternatives considered

- **Accent-only P2 (current M3 rule)** — rejected: too little differentiation at
  gameplay size.
- **Orange suit with amber visor and yellow tanks** — rejected: warm-on-warm,
  losing the helmet and backpack silhouettes.
- **Bone suit with a blue/joint visor** — rejected: blue is already the P1 accent
  and the cool rim language; it does not give P2 a distinct identity.
- **Reuse the nerve ramp for the suit** — rejected: the tanks would merge with
  the suit and the result is amber-yellow, not orange.
- **Global hue rotation** — rejected: shifts outline, grime, visor, and tanks
  together.
- **Re-prompt Ludo for P2** — rejected: pose, proportion, and timing drift.

## References

- [`docs/m3/asset-requirements-v01.md`](../m3/asset-requirements-v01.md), §4.3,
  §4.4, §8.17, §9
- [ADR-0061](adr-0061-palette-lut-sprite-variants.md)
- [ADR-0060](adr-0060-source-work-runtime-asset-layers.md)
- [ADR-0062](adr-0062-data-driven-sprite-animation.md)
- [`art-source/characters/player-p1/working/README.md`](../../art-source/characters/player-p1/working/README.md)
