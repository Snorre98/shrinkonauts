# ADR-0078: Audio and graphics prompt libraries and placeholder completion

- **Status:** Proposed
- **Date:** 2026-11-03
- **Deciders:** Snorre
- **Related:** ADR-0029, ADR-0033, ADR-0060, ADR-0072, ADR-0075, ADR-0076, ADR-0077
- **Extends:** ADR-0029 (placeholder-first assets), ADR-0033 (final-asset timing), ADR-0060 (source/working/runtime layers)
- **Does not supersede:** the art-pipeline, audio, presentation, or manifest decisions. It indexes and governs their prompt libraries.

## Context

The branch now contains two mature prompt families:

- **Graphics:** [`docs/m3/asset-requirements-v01.md`](../m3/asset-requirements-v01.md),
  [`docs/m3/background-asset-requirements-v01.md`](../m3/background-asset-requirements-v01.md),
  [`docs/m3.5/hub-asset-prompts-v01.md`](../m3.5/hub-asset-prompts-v01.md), and
  [`docs/m3/muscle-endplate-asset-requirements-v01.md`](../m3/muscle-endplate-asset-requirements-v01.md).
- **Audio:** [`docs/audio/audio-requirements-and-prompts-v01.md`](../audio/audio-requirements-and-prompts-v01.md)
  for 18 SFX cues and
  [`docs/audio/room-and-menu-themes-v01.md`](../audio/room-and-menu-themes-v01.md)
  for four music themes.

The documents are individually strong, but there is no single place that answers:

- Which assets are still placeholders?
- Which prompt document owns each asset?
- Which placeholders are visible to the player?
- Which assets are blocked by a runtime or provider gap?
- What order should generation and integration follow?
- What must be true before a prompt output is considered final?

This gap already caused confusion in playtesting. The yellow **NEUR** and cyan
**PATH** blocks in `03-nerve-forest` are procedural `PlaceholderProvider`
sprites for `sprite.scan.neuron` and `sprite.scan.pathway`. They are not tiles.
`scan-myelin` reuses `sprite.scan.neuron`, so the room shows two yellow NEUR
boxes. The gap was recorded in the M3 document, but it was scattered across
several sections and easy to miss.

Audio has a similar discoverability problem. The SFX and theme prompt libraries
exist, but all 18 cues are still placeholders, no audio files exist, and
`ManifestAudioProvider` is still a stub. A developer could reasonably assume
that adding files to `public/` would make them play. It will not.

The branch also has a naming problem: it is called
`add-missing-04-03-assets`, but the remaining gaps span graphics, audio,
runtime playback, and documentation. A single cross-discipline index is needed
so the branch name does not imply a narrower scope than the actual work.

## Decision

### 1. One umbrella prompt library, discipline-specific prompt sources

Create [`docs/assets/prompt-library-v01.md`](../assets/prompt-library-v01.md)
as the single index for asset completion. It does **not** replace or duplicate
the existing full prompt documents. It links them, records the inventory and
status, and contains new prompts only for gaps that have no existing owner.

The precedence rule:

1. A discipline prompt document owns the full prompt text and acceptance checks.
2. The umbrella library owns the cross-discipline inventory, status, order, and
   links.
3. If the two disagree, the discipline document wins on prompt wording; the
   umbrella wins on completion status and routing.

### 2. Every placeholder that can be seen or interacted with has an inventory row

The umbrella library records at least:

- asset ID and type;
- pack/room or hub location;
- runtime status (`final`, `interim`, `placeholder-only`, `reserve`, `deferred`);
- pipeline stage (`prompt-ready`, `source-generated`, `source-accepted`,
  `processed`, `wired`, `accepted`);
- source path and evidence (when a raw plate or processed file exists);
- visible/interactive consequence;
- prompt source and section;
- next action and blocker;
- acceptance gate;
- licence/provenance status.

A placeholder is not “documented” merely because it is declared in a manifest.
It must appear in the umbrella inventory if it can appear in an authored room or
the hub.

### 3. Placeholder-first stays valid; silent placeholder drift does not

ADR-0029 remains in force. Missing assets degrade to the procedural provider,
synth/silence, or a declared reserve. Authored content may reference a
placeholder when that placeholder is inventoried and accepted.

The following are not acceptable:

- a visible placeholder that exists only in a screenshot;
- an unreferenced placeholder that looks like final art;
- adding a new placeholder-bearing entity without an inventory row;
- shipping an audio file while the provider still returns the synth fallback;
- treating a procedural placeholder as final because it has a `src` path.

### 4. Audio has a hard provider prerequisite

The 18 SFX and four themes remain prompt-only until
`ManifestAudioProvider` implements fetch, decode, cache, buffer playback, and
the existing synth/silence fallback. ADR-0077 adds the theme player.

A generated audio file is not “delivered” until:

- the provider plays it;
- the manifest entry has `src` and a licence;
- the cue/theme passes the format and loudness checks in its prompt document;
- the prompt log records the tool, model, prompt version, seed, duration,
  post-processing, and licence.

Do not commit audio files as a speculative drop. A silent file is worse than a
labelled placeholder because it hides the runtime gap.

### 5. Revised prompts for the visible 03 scan placeholders

The umbrella library contains new compact 36×36 prompts for:

- `sprite.scan.neuron` — one cell body, dendrites, one myelinated axon, nodes,
  forked terminal; must read at 36×36 in a square cell;
- `sprite.scan.pathway` — one-way dendrite-to-terminal path with a pulse in a
  node gap; must be visibly distinct from `scan.neuron` at 36×36.

The existing wide prompts in `docs/m3/asset-requirements-v01.md` remain the
source for anatomy wording. The new prompts tighten the square composition so
the Nanobanan source does not collapse to a 16×9 strip.

For v1, `scan-myelin` keeps sharing `sprite.scan.neuron`, because the asset is
already defined as “neuron and myelin scan.” A dedicated `sprite.scan.myelin`
is an optional future asset, listed in the umbrella library but not added to the
manifest without a content decision.

### 6. Graphics completion order

The umbrella library recommends:

1. remove visible placeholder-only sprites from authored rooms (03 scans);
2. replace the interim 04 sky, gate, exit and four atlases with approved final
   art;
3. keep the 03/04 far/mid/near layers deferred until the layered background
   composition is ready;
4. keep the badge, reserve `scan.reflex`, and unauthored-room assets deferred.

“Interim” assets with `src` paths are not final. They must keep
`placeholder: true` until the final prompt output passes acceptance.

### 7. Validation and discoverability

The implementation plan adds a validation warning or test that lists
placeholder-only assets referenced by authored rooms. The current expected list
is:

- `sprite.scan.neuron`
- `sprite.scan.pathway`

`scan-myelin` appears on the same row as `scan.neuron` because it reuses the
same asset. When the list changes, the umbrella library and the warning must be
updated together.

The root README and the 03 room README must explain the placeholder legend:

- colored 48×48 squares are procedural placeholder sprites, not tiles;
- yellow is `palette.nerve`, cyan is `palette.accent`;
- the label is the first four characters of the last asset-ID segment;
- the current visible exceptions are the two 03 scan assets above.

### 8. Prompt versioning and logs

Each discipline prompt document keeps its own prompt version. The umbrella
library records the current version and the last reviewed date.

A prompt log is required for every generated asset:

| Field | Required |
|---|---|
| Asset ID | yes |
| Prompt document + version | yes |
| Tool/model | yes |
| Seed / variation | when the tool exposes it |
| Source file | yes |
| Working file | yes |
| Runtime export | yes |
| Acceptance result | yes |
| Licence | yes |
| Reviewer/date | yes |

Generated sources stay in the source/working layers from ADR-0060. Raw prompt
outputs never go into `public/`.

### 9. Documentation consequences

On acceptance, update:

- [`README.md`](../../README.md) — asset modes, placeholder legend, new docs.
- [`docs/m3/asset-requirements-v01.md`](../m3/asset-requirements-v01.md) —
  link to the umbrella library and the revised scan prompts.
- [`docs/m3/muscle-endplate-asset-requirements-v01.md`](../m3/muscle-endplate-asset-requirements-v01.md)
  — link to the umbrella library; mark its assets as interim until final.
- [`docs/audio/audio-requirements-and-prompts-v01.md`](../audio/audio-requirements-and-prompts-v01.md)
  and [`docs/audio/room-and-menu-themes-v01.md`](../audio/room-and-menu-themes-v01.md)
  — link to the umbrella library and the provider prerequisite.
- [`docs/adr-audio/README.md`](../adr-audio/README.md) and
  [`docs/adr-art-pipeline/README.md`](../adr-art-pipeline/README.md) — note the
  umbrella ADR.
- `public/packs/anatomy-reflex/levels/03-nerve-forest/README.md` — record the
  two scan placeholders and the shared myelin icon.

## Consequences

**Easier:**

- One place answers “what is still missing?” for graphics and audio.
- New contributors can find the owning prompt document without reading the
  whole repository.
- The visible NEUR/PATH placeholders stop looking like unexplained broken tiles.
- Audio work cannot be mistaken for delivered because the provider blocker is
  explicit.
- Placeholder additions become reviewable instead of accidental.

**Harder:**

- The umbrella library must be maintained when statuses change.
- Prompt documents and the inventory can drift if updates are not paired.
- The audio provider implementation becomes a visible prerequisite for audio
  delivery, not an optional cleanup.
- The branch cannot claim “assets complete” while placeholder rows remain.

**Constrained:**

- No duplicate full prompt text in the umbrella library.
- No new asset ID for a placeholder that is already covered by a shared asset.
- No final flag on procedural interim assets.
- No audio files without a working provider and licence record.
- No silent placeholder additions in authored rooms.

## Alternatives considered

- **Keep the status quo: separate discipline documents only** — rejected. The
  NEUR/PATH confusion and audio-provider assumption are exactly the failures of
  a purely discipline-local index.
- **Duplicate all prompts into one giant document** — rejected. The audio SFX
  document alone is 900 lines; duplication would drift immediately.
- **Make the umbrella library the only prompt source** — rejected. It would
  rewrite accepted prompt history and force every discipline to move its
  wording.
- **Hide placeholders or replace them with neutral blank markers** — rejected.
  That hides the gap and weakens the placeholder-first contract.
- **Generate final assets ad hoc without inventory** — rejected. It loses
  provenance, acceptance, and licence traceability.
- **Ship audio files before the provider** — rejected. The files would be
  silent and would hide the runtime gap.
- **Add `sprite.scan.myelin` immediately** — deferred. The shared
  `scan.neuron` asset is already defined as the neuron/myelin scan; a new ID is
  a content decision, not an inventory fix.

## Validation

- The umbrella library lists every placeholder-only asset referenced by an
  authored room or the hub.
- Every remaining placeholder has a prompt source, status, and acceptance gate.
- The visible 03 scan placeholders are documented in the root README and the 03
  room README.
- The audio prompt libraries are linked, and the provider prerequisite is
  explicit.
- `npm test`, `npm run pack:validate`, `npm run pack:smoke`, and
  `npm run build` pass.
- A review of `assets.final.json` shows no `placeholder: true` entry with a
  missing `src` that is not in the umbrella inventory.

## References

- [`../assets/prompt-library-v01.md`](../assets/prompt-library-v01.md) — the
  umbrella inventory and gap prompts.
- [`../m3/asset-requirements-v01.md`](../m3/asset-requirements-v01.md) — M3
  graphics prompts and the original scan-placeholder record.
- [`../m3/background-asset-requirements-v01.md`](../m3/background-asset-requirements-v01.md)
  — 03 background layer contract.
- [`../m3/muscle-endplate-asset-requirements-v01.md`](../m3/muscle-endplate-asset-requirements-v01.md)
  — 04 sky, atlas, gate and exit prompts.
- [`../m3.5/hub-asset-prompts-v01.md`](../m3.5/hub-asset-prompts-v01.md) — hub
  prompts.
- [`../audio/audio-requirements-and-prompts-v01.md`](../audio/audio-requirements-and-prompts-v01.md)
  — 18 SFX prompts.
- [`../audio/room-and-menu-themes-v01.md`](../audio/room-and-menu-themes-v01.md)
  — four theme prompts.
- [`../adr-audio/0076-room-and-menu-audio-themes.md`](../adr-audio/0076-room-and-menu-audio-themes.md)
  and [`0077-audio-theme-playback-and-mixing.md`](../adr-audio/0077-audio-theme-playback-and-mixing.md)
  — audio theme decisions.
- [`../adr-art-pipeline/adr-0060-source-work-runtime-asset-layers.md`](../adr-art-pipeline/adr-0060-source-work-runtime-asset-layers.md)
  — source/working/runtime layers.
- [`../puzzle-engine/contracts/failure-semantics.md`](../puzzle-engine/contracts/failure-semantics.md)
  — placeholder/silence failure semantics.
