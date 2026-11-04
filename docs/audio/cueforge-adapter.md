# cueforge adoption adapter

`scripts/cueforge-adopt.ts` installs a completed cueforge render into the
Shrinkonauts packs. It is the external adapter described by cueforge ADR-0009.
It does not generate audio; generation and post-processing belong to cueforge.

## Usage

From the repository root:

```bash
# Preview every planned write.
npm run audio:adopt -- --result ../cueforge/var/boot/boot.result.json --audio ../cueforge/var/boot/boot.mp3 --dry-run

# Install.
npm run audio:adopt -- --result ../cueforge/var/boot/boot.result.json --audio ../cueforge/var/boot/boot.mp3

# Replace a target that has a different hash.
npm run audio:adopt -- --result ... --audio ... --overwrite
```

Options:

| Option | Meaning |
|---|---|
| `--result <path>` | cueforge render result JSON. Required. |
| `--audio <path>` | Override the rendered MP3 path. Defaults to `outputs[0].path`. |
| `--receipt <path>` | Override the receipt path. Defaults to `receipt.path`. |
| `--repo-root <path>` | Repository root for tests or alternate checkouts. |
| `--dry-run` | Validate and print the plan; write nothing. |
| `--overwrite` | Allow replacing a target with a different hash. |

`--force` is rejected. `--force` is cueforge's QC exception flag; target
conflicts use `--overwrite`.

## Validation

The adapter checks:

- the render-result and receipt schema versions;
- the receipt hash and rendered-output hash against the actual files;
- the receipt recipe identity against the render result;
- the output is 48 kHz mono MP3, at most 120 KB;
- the export adapter is `shrinkonauts`, the destination is `anatomy` or `hub`,
      and the cue ID already exists in the target manifest;
- every generated source has a known model; unknown provenance is refused.

It never invents a cue ID and never edits an unrelated manifest entry.

## Installs

For an anatomy cue it:

1. copies the MP3 to `public/packs/anatomy-reflex/shared/audio/`;
2. copies the same file to `public/packs/silicon-reflex/shared/audio/`;
3. sets `src` and `license` and removes `placeholder` in both manifests;
4. adds/replaces the licence record in both `licenses.json` files;
5. appends one prompt-log row per generated layer with the cueforge receipt path
   and SHA-256.

For a hub cue it updates the hub manifest and copies the file under
`public/hub/bathroom/shared/audio/`; the hub records the licence in the manifest
entry.

The prompt log keeps its nine columns. The cueforge receipt path/hash and layer
ID are recorded in the `post_processing` field.

## Idempotency and recovery

Re-running with the same output hash is a no-op: audio, manifests, licence files,
and prompt-log rows all compare unchanged. A different target hash is a conflict
unless `--overwrite` is used. Writes use temp files and atomic renames. If a
later write fails, the adapter restores the previous files and reports any path
that could not be restored.
