# M3.5 — Bathroom Hub Art Pass

- **Status:** Prompt pack drafted · 1 November 2026
- **Scope:** Final raster art and audio for the M1.9 bathroom hub / main menu
- **Depends on:** M1.9 hub, M3 art direction, ADR-0047–0049, ADR-0060–0065
- **Feeds:** Hub final manifest, GDD/video capture, playtest build

This is a separate art pass. It does not change the M3 21-image gameplay
register, the M3 `03-nerve-forest` environment scope, or the 04 placeholder
boundary.

## Documents

- [`hub-asset-prompts-v01.md`](hub-asset-prompts-v01.md) — full prompt pack,
  asset register, generation order, acceptance criteria, integration notes, and
  prompt log.
- [`../m1.9/remaining-work.md`](../m1.9/remaining-work.md) §5 — original M3.5
  hub art kit.
- [`../m3/asset-requirements-v01.md`](../m3/asset-requirements-v01.md) — M3
  style, palette, and pipeline source.

## Locked direction

- Existing bathroom hub, full layout redesign.
- Machine left, civilian centre, DOM menu panel right as a wall terminal, logo
  top-left.
- **640×360 source at 2× = 1280×720 display.**
- Retro-futuristic laundry lab inside a domestic bathroom.
- Tired adult sci-fi fan in a hoodie and pajama pants.
- Nano Banana first, with reference images; Ludo.ai fallback.
- Locked game ramps plus a hub-only cool appliance-grey ramp.
- Keep the current launch path; add a six-frame civilian walk cycle.
- Separate poster, cartridges, toy astronaut, neuron plush, detergent bottles,
  laundry basket, and towel.
- Full AI wordmark, with a Silkscreen CSS fallback.
- Six Ludo Audio cues; no music.

## Scope boundary

**AI generates raster art only.** The DOM panel, cards, buttons, focus states,
text, settings, confirmation dialog, and layout chrome stay in CSS/DOM. The only
AI-generated text asset is the SHRINKONAUTS wordmark; poster text is overlaid at
runtime.

## Next step

Run **Batch 0 — the bathroom scene style anchor** and judge it at 1280×720 with
the DOM panel over the right third. If that gate passes, the rest of the pack
should stay coherent.

## Integration status (2026-11-02)

The delivered `new-main-menu` batch is wired into the bathroom hub. The scene
plate is shifted 138 display px left (296 source px crop plus a matching
right-side dark pad) to align the baked alcove with the locked machine; the
scene keeps the single Phase-1 background layer and is exempt from palette
quantisation. The machine, door, drum, civilian idle, poster, cartridges,
cycle-card icons, basket, plush, and P1 tiny astronaut are wired. The logo
remains a Silkscreen fallback because the delivered plate has a washer baked
behind the wordmark.

Deferred or manifest-only: civilian walk sheet (not delivered), toy astronaut
(not delivered), audio (not delivered), detergent bottles (baked shelf bottles
already exist), and the towel (the cleaned 11×32 source does not read at 2×).
See [`../../art-source/nanobanan/README.md`](../../art-source/nanobanan/README.md)
for the processing commands, composition deviations, and licence note, and
[`../../screenshots/m3.5-hub-final.png`](../../screenshots/m3.5-hub-final.png)
for the 1280×720 contact sheet.
