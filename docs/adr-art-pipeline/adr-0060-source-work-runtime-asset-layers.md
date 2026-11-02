# ADR-0060: Source, working, and runtime asset layers

- **Status:** Accepted
- **Date:** 2026-10-29
- **Deciders:** Snorre
- **Related:** ADR-0029, ADR-0030, ADR-0033, ADR-0047, ADR-0048, ADR-0061, ADR-0062, ADR-0063

## Context

Ludo.ai exports are source plates, not runtime assets. A character may arrive
as several large sheets — one per action, or one long cycle — with tens of
thousands of unique colours, inconsistent frame padding, and no clip metadata.
Regenerating a sheet in Ludo is slow, costs credits, and changes pose and
proportions. The project needs to keep exporting sheets while deriving
normalized runtime assets, colour variants, and animation metadata locally.

The repository has no source-art layer today. Runtime art lives under
`public/packs/.../shared/`, asset-provider code lives under `src/assets/`, and
there is no rule for where raw Ludo exports, working files, or generated
previews belong. Without a layer boundary, multi-megabyte sheets risk being
shipped, and replacing one action can force re-exporting or re-packing
unrelated art.

## Decision

Adopt three asset layers:

1. **Source** — `art-source/characters/<character>/ludo/<action>-<frames>f-<date>/`
   holds the immutable Ludo PNG, JSON, and prompt/provenance record. It is not
   served and is never edited.
2. **Working** — `art-source/characters/<character>/working/` holds the cleaned
   master, palette map, and `clips.json`. It is not served. `clips.json` is the
   source of truth for clip names, frame ranges, fps, loop, one-shot `next`,
   frame events, and variant palettes.
3. **Runtime** — `public/packs/<pack>/shared/sprites/` (or
   `public/shared/sprites/` for cross-pack assets) holds only the normalized,
   packed sheet and the animation descriptor. These are the only files the game
   loads.

A build script (`scripts/art-import.ts`) reads the source layer and writes the
runtime layer:

- Slice frames from the Ludo JSON's frame rectangles, not from a guessed grid.
- Trim each frame to its alpha bounding box.
- Align every frame to a common baseline and horizontal anchor; pad to a fixed
  cell.
- Quantize to the project palette; no anti-aliasing or intermediate blends.
- Optionally resample long cycles to 6–10 key frames per clip.
- Pack frames into a uniform runtime grid.
- Write the animation descriptor (ADR-0062) and a preview report (ADR-0063).

Asset IDs remain stable and independent of source filenames. Source filenames
may be descriptive and immutable; runtime filenames use lowercase kebab-case.
Shared assets are promoted to `public/shared/` rather than duplicated per pack.
Raw Ludo exports are never placed in `public/` or `src/assets/`.

The pipeline supports the current static M3 scope by emitting a one-frame
clip. It does not by itself change the M3 animation scope.

## Consequences

**Easier:**

- Replace one action without re-exporting the whole character.
- Derive variants and animation metadata from one cleaned master.
- Keep provenance, prompts, and licensing with the source.
- Validate and review generated runtime assets deterministically.
- Keep runtime payloads small.

**Harder:**

- The project must maintain an import script and a clip manifest.
- Source and runtime can drift if the build is not rerun.
- Artists must work in the working layer, not directly on runtime files.

**Constrained:**

- No raw Ludo PNGs in `public/`.
- No hand-edited runtime files that are not reproducible from source.
- No per-asset ad hoc paths; runtime paths come from the register and build
  output.
- No unnormalized frame sizes, baselines, or palettes.

## Validation

- A clean checkout can regenerate every runtime sheet from `art-source/` and
  `clips.json`.
- Every runtime frame has the same cell size, baseline, and palette.
- No raw source file is referenced by a manifest.
- `npm run pack:validate` and the art validator pass.
- Replacing one source action changes only that clip's output.

## Alternatives considered

- **Put Ludo exports directly in `public/`** — rejected: ships multi-megabyte
  faux-pixel sheets and loses normalization.
- **One folder per character with all actions mixed together** — rejected:
  replacing one action forces a full re-export/repack and makes review harder.
- **Keep only runtime files, no source** — rejected: loses provenance, future
  variants, and the ability to regenerate.
- **Use Aseprite tags as the only source of truth** — rejected as the sole
  mechanism: it locks the pipeline to one tool and still needs a portable
  runtime descriptor; Aseprite can remain an import source.
- **Hand-edit runtime sheets** — rejected: not reproducible and drifts from
  source.

## References

- [`docs/m3/asset-requirements-v01.md`](../m3/asset-requirements-v01.md)
- ADR-0029 (asset-provider abstraction), ADR-0030 (sprite/animation format),
  ADR-0033 (final asset timing)
- ADR-0047 (pixel-art direction), ADR-0048 (half-resolution rendering)
- [`public/packs/anatomy-reflex/assets.final.json`](../../public/packs/anatomy-reflex/assets.final.json)
