# Licence notes

This is a provenance/status note, not legal advice. It records what the
repository currently says. Do not replace a “TBD” with a guessed licence.

## 1. Current labels

| Scope | Current licence string | Source of record |
|---|---|---|
| P1, P2, Neuron Keeper, anatomy entities, Nerve Forest sky, Silicon art | `Ludo.ai source (POC; plan TBD)` | `final/anatomy/metadata/licenses.json`, `final/silicon/metadata/licenses.json`, `assets.final.json` |
| Bathroom hub art | `Nano Banana / Google Gemini (plan TBD)` | `final/hub/metadata/assets.final.json` |
| In-repo placeholder atlases | `CC0-1.0` | `final/anatomy/metadata/licenses.json`, `final/silicon/metadata/licenses.json` |
| Silkscreen, Pixelify Sans | `SIL OFL 1.1` | `final/shared/fonts/OFL-*.txt`, `NOTICES.md` |
| Screenshots / contact sheets / docs | Group work; contains AI-generated art | This pack |

The exact per-file entries are in `manifest.json` and
`ASSET-INDEX.md`. The original licence snapshots are copied into each pack’s
`metadata/` folder.

---

## 2. What is covered

### Anatomy

`final/anatomy/metadata/licenses.json` covers:

- P1 and P2 static + animation sheets
- Neuron Keeper static + idle
- `scan.synapse`, `scan.muscle`
- `pad.dendrite`, `pad.terminal`
- `gate.ferry`, `prop.tracer`, `pulse.terminal`
- both receptors
- `bg.nerve_forest.sky`
- `bg.muscle_endplate.sky` (procedural interim)
- `tile.bone.atlas`, `tile.nerve.atlas`, `tile.muscle.atlas`,
  `tile.membrane.atlas` (procedural interim, CC0-1.0)
- `tile.anatomy.atlas` (CC0 test fixture; no longer wired)
- `sprite.gate.nerve`, `sprite.exit` (procedural interim)

It does **not** list the seven 2026-11-03 Nano Banana source plates in
`art-source/nanobanan/new/muscle-endplate-2026-11-03/`. They are
`source-generated` only, have no runtime `src`, and still need licence entries
when processed and wired.

It does **not** yet list every new entity (for example `scan.neuron`,
`scan.pathway`, `scan.reflex`, the badge, the deferred UI panels or audio).
Those are placeholders without final art, so the missing entries should be added
before any of them becomes final.

### Silicon

`final/silicon/metadata/licenses.json` covers the Silicon sprites, the board
sky and the placeholder circuit atlas. P1/P2 entries are repeated because the
pack shares the player IDs.

### Hub

There is **no** `public/hub/bathroom/licenses.json`. The licence strings are
embedded in `assets.final.json`:

- `Nano Banana / Google Gemini (plan TBD)` for the scene, washer parts,
  civilian, poster, cartridges, cycle icons, plush, basket, towel and detergent.
- `Ludo.ai source (POC; plan TBD)` for the reused P1 tiny astronaut.
- `Placeholder: Silkscreen wordmark fallback...` for the logo.
- `Placeholder until a toy astronaut plate is delivered` for the toy astronaut.

---

## 3. Fonts

Silkscreen and Pixelify Sans are distributed under the **SIL Open Font
License 1.1**. The licence texts are copied next to the font files:

```text
final/shared/fonts/
  OFL-Silkscreen.txt
  OFL-PixelifySans.txt
  NOTICES.md
```

Keep the OFL text with any redistribution of the font files. The GDD itself
does not need to embed the font file; it only needs the attribution/licence
note if the font is redistributed.

---

## 4. Gaps to resolve before submission

1. **Ludo/Nano Banana plan and terms URL.** The current labels say “plan TBD”.
   Record the actual plan and terms URL, or keep the POC wording and state that
   the assets are prototype-only.
2. **Prompt/model/seed log.** The M3 prompt pack has a log template but no
   filled rows. Add a row per accepted asset (tool, prompt version, model,
   seed, date, plan/terms URL, chosen file).
3. **Anatomy `licenses.json` completeness.** Add the new entity IDs if they are
   going to be described as final. The current POC build can keep the
   placeholder wording.
4. **Hub licences file.** Consider adding `public/hub/bathroom/licenses.json`
   for parity with the packs, or keep the embedded strings and say so in the
   report.
5. **Raw hub source batch.** The ignored `new-main-menu/` batch is absent; the
   processed exports/reports are the only record. Do not claim the hub is fully
   reproducible from source.
6. **Final approval.** POC-integrated sprites and the pretty sky are not final
   approved. The GDD/video should say “POC integrated; final approval pending”
   where that distinction matters.
7. **Placeholders and source-generated art.** The badge, `scan.neuron`,
   `scan.pathway`, `scan.reflex`, `sprite.exit`, `sprite.gate.nerve`, the four
   atlases, the toy astronaut, the logo, and all audio are placeholders. The
   2026-11-03 04 batch adds raw source plates for the sky, four swatches, gate,
   and exit; these are **not** final runtime assets. Do not present either the
   placeholders or the raw sources as final.

---

## 5. Suggested report wording

> The visual assets are AI-generated in Ludo.ai / Nanobanan (Google Gemini)
> under the group’s art direction, then keyed, fitted, palette-quantised and
> packed locally. The current repository labels them as POC assets with the
> final plan/terms still TBD. The two typefaces are Silkscreen and Pixelify
> Sans, both under the SIL Open Font License 1.1. The in-repo placeholder
> atlases are CC0-1.0. No third-party images or audio are included.

Do not write “all assets are original” without also saying that the art is
AI-generated and that the final commercial plan is unresolved.
