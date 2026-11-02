# Prompt pack — new levels, rooms, puzzles, and assets

**Status:** Draft v0.1 · 1 November 2026  
**Owner:** Snorre  
**Scope:** Copy-paste prompts for implementing one new level package and its asset kit.  
**Concrete instance:** `01-interrupt-loop` in the separate `silicon-reflex` pack.  
**Design source:** [`docs/m2/nervous-puzzles/silicon-fixture.md`](../m2/nervous-puzzles/silicon-fixture.md)  
**Asset source:** [`docs/m3/asset-requirements-v01.md`](../m3/asset-requirements-v01.md) (shared style, palette, frame and export rules)  
**Authoring contracts:** [`docs/shrinkonauts/base-game/level-authoring.md`](../shrinkonauts/base-game/level-authoring.md), [`docs/m1.5/authoring.md`](../m1.5/authoring.md), [`docs/shrinkonauts/base-game/contracts/pack-schema.md`](../shrinkonauts/base-game/contracts/pack-schema.md)  
**Pack-boundary context:** [`docs/m1.9/README.md`](../m1.9/README.md)

> **The rule:** the prompt implements content, not engine behaviour. If a new
> node, link, entity, gate, verb, UI surface, or save field is needed, stop and
> write an ADR proposal. A level hack is not an acceptable fallback.

---

## 1. What is in this pack

| File | Use | Audience |
|---|---|---|
| [`silicon-theme.md`](silicon-theme.md) | Graphite/cyan theme bible, palette dominance, forbidden nerve motifs, asset register, fidelity guard | Both |
| [`level-implementation-template.md`](level-implementation-template.md) | Reusable prompt for any new level/room/puzzle | Coding agent |
| [`levels/01-interrupt-loop.md`](levels/01-interrupt-loop.md) | Filled Silicon level prompt: pack, level, room, puzzle, dialogue, gate, catalog, tests, validation | Coding agent |
| [`asset-generation-template.md`](asset-generation-template.md) | Reusable Ludo/nanobanan prompt system: tech style blocks, palette, frame, negative, export, acceptance | Asset agent / human |
| [`levels/01-interrupt-loop-assets.md`](levels/01-interrupt-loop-assets.md) | Filled Silicon asset prompts and per-asset acceptance criteria | Asset agent / human |

The Silicon instance is deliberately complete. The templates are the reusable
part: copy them for the next level, replace the theme contract and asset
register, and keep the guardrails.

---

## 2. Run order

1. **Read the theme and the design.** Read `silicon-theme.md`, the Silicon
   fixture design, the level-authoring contract, and the M1.5 puzzle contract.
2. **Run the level prompt.** Give
   [`levels/01-interrupt-loop.md`](levels/01-interrupt-loop.md) to a coding
   agent working in this repository. It creates the pack, level, room, puzzle,
   dialogue, gate, manifests, catalog entry, and validation path.
3. **Run the asset prompt.** Give
   [`levels/01-interrupt-loop-assets.md`](levels/01-interrupt-loop-assets.md)
   to the asset-generation workflow. It produces concepts, then source-size
   pixel art, then the runtime files.
4. **Integrate final assets.** Replace placeholder manifest entries with real
   `src` paths and add matching `licenses.json` entries.
5. **Validate and capture.** Run the commands in §5 and review the contact sheet
   at actual size.

The level can ship with placeholders before the asset pass. Do not block the
level on final art.

---

## 3. Non-negotiables

### 3.1 Content only

- The level prompt may edit pack data, themes, materials, manifests, licences,
  catalog metadata, tests, and validation scripts.
- It may **not** change `src/game`, `src/puzzle`, `src/world`, `src/physics`, or
  any gameplay/runtime module.
- If the design needs a new node, link, entity behaviour, gate type, verb, UI
  surface, or save field, stop and write an ADR proposal.

### 3.2 Use the actual repo schema versions

The older contract examples show `schemaVersion: "1.0"`. The current pack files
are the authority:

| File | Current version |
|---|---|
| `pack.json` | `1.1` |
| `level.json` | `1.1` |
| `room.json` | `1.1` |
| `puzzle.json` | `1.1` |
| `theme.json` | `1.1` |
| `dialogue.json` | `1.0` |
| `gate.json` | `1.0` (parser accepts `1.x`) |
| `materials.json` | `1.0` |
| `mapping.json` | `1.0` |
| `licenses.json` | `1.0` |
| asset manifests | `1.1` |

Read the real files before editing. Do not “fix” versions to match an old doc.

### 3.3 Asset IDs only

- Level, room, dialogue, gate, and theme data use logical asset IDs, never file
  paths.
- Source sheets stay in `art-source/`; they are never referenced by a manifest
  or served from `public/`.
- Add every new ID to `assets.final.json` as a placeholder before generating
  final art.
- Do not add unused IDs. A declared-but-never-referenced sprite is not free.

### 3.4 Placeholder-first

- The level must be playable with the placeholder provider.
- Final art and audio may arrive after the level is validated.
- A coherent placeholder build is better than a half-finished final build.

### 3.5 Shared kit

- Reuse the P1/P2 players, the badge, the UI chrome, and the shared audio cue
  vocabulary (the 11 M3 cues plus the wrong placeholder).
- A separate pack cannot resolve another pack's files. Copy the shared player
  assets into the new pack's `shared/` folder and add matching licence entries.
- Do not generate per-level duplicate players, badges, or music.

### 3.6 Solo-completable, co-op additive

- The puzzle must be solvable by one player using the P1 solo union.
- Co-op adds a parallel role; it never gates the solve.
- No fail state: wrong routes and early attempts give feedback and reset the
  local puzzle.

### 3.7 Visual difference contract

For any level in the anatomy pack, the new level must not reuse the nerve
forest's background, atlas, agent, or motif set. The Silicon pack is the extreme
case: it is a different world, not a recolour.

The Silicon theme is **graphite/cyan clean-room circuit board**. The nerve
theme is **deep teal, damp nerve forest, amber glow**. The shared elements are
the pixel grid, the nine ramps, the outline weight, the astronaut players, and
the HUD.

### 3.8 Fidelity guard

- The CPU is not the brain. It is the output side of the loop.
- The interrupt controller is the integration point, the “spinal cord” analogue.
- The sensor is the hardware analogue of a receptor; do not call it a receptor
  in the Silicon room.
- Do not add hardware facts beyond CON-8 (no voltage levels, bus protocols, or
  interrupt priorities).
- Do not claim that a computer has a nervous system, a spinal cord, or
  consciousness.
- No text, labels, arrows, or diagram lines baked into the art.

---

## 4. Known source mismatches

These are real mismatches in the repo. The prompts record them; they do not
silently fix unrelated docs.

| Mismatch | What to do |
|---|---|
| Old contracts show schema `1.0`; actual level/room/puzzle files use `1.1` | Use the actual files as authority; record the doc mismatch |
| The syllabus EV-5 filter uses `prompt-transfer`, but the runtime derives `prompt-obj-5` | Use `prompt-obj-5` for runtime evidence; record the syllabus mismatch; do not edit the syllabus without a curriculum decision |
| `scripts/pack-validate.ts` and `scripts/pack-smoke.ts` are hardcoded to `anatomy-reflex` | Extend the scripts minimally and test the Silicon pack; do not skip validation |
| `tests/app-state.test.ts` and `e2e/hub.spec.ts` encode Silicon as `coming-soon` | Update the tests when the catalog flips to `available` |
| The M3 asset document is scoped to `03-nerve-forest` | Use this prompt pack's Silicon theme and asset register; do not reuse the nerve prompts |
| `sprite.checkpoint` is declared but not referenced by authored rooms | Do not add an unused checkpoint sprite; the room uses the checkpoint data point |
| `sprite.scan.reflex` is a reserve for the anatomy pack | Do not use it in Silicon |
| The 05 Reflex Core level is not implemented | It is out of scope for this pack; the templates remain reusable for it |

If a source mismatch blocks the implementation, stop and report it. Do not guess.

---

## 5. Definition of done

### Level

- [ ] The Silicon pack loads from the hub and starts.
- [ ] The puzzle activates at the sensor console and is solvable solo.
- [ ] The route plug is recoverable; the wrong CPU socket does not softlock.
- [ ] The actuator gate latches; the level debrief opens and finishes.
- [ ] The transfer gate is optional and records its own evidence.
- [ ] No new engine code or mechanics.
- [ ] `npm test` passes.
- [ ] `npm run pack:validate` passes (expected coverage warnings recorded).
- [ ] `npm run pack:smoke` passes (including the Silicon path).
- [ ] `npm run pack:map -- --pack silicon-reflex` produces no drift.
- [ ] `npm run build` and `git diff --check` pass.
- [ ] `npm run smoke:e2e` passes if the hub/catalog/e2e changed.

### Assets

- [ ] Every new asset ID resolves in `assets.final.json` or is a declared
  placeholder.
- [ ] Final files are source-size, palette-quantised, alpha-clean, and within
  budget.
- [ ] Every final file has a `licenses.json` entry.
- [ ] The contact sheet passes the “same game, different world” test.
- [ ] No nerve forest asset ID or motif appears in the Silicon pack.
- [ ] Prompt log is complete for every accepted asset.

### Capture

- [ ] A clean 16:9 still of the puzzle, gate, and transfer console.
- [ ] The still reads at actual size without HUD collision.
- [ ] The Silicon still is visibly different from the Nerve Forest still.

---

## 6. Reusing the templates for another level

1. Copy `silicon-theme.md` to a new theme doc. Replace the palette dominance,
   architecture, lighting, texture, cast, and forbidden motifs. If the new level
   is organic rather than tech, replace the tech style blocks in
   `asset-generation-template.md` with the M3 organic blocks
   (`STYLE_SPRITE`, `STYLE_BACKGROUND`, `STYLE_ATLAS` and their negatives).
2. Copy `levels/01-interrupt-loop.md` to a new level prompt. Replace the pack,
   level, puzzle, room, dialogue, gate, and asset register.
3. Keep the non-negotiables in §3 and the source-mismatch discipline in §4.
4. If the new level is in the `anatomy-reflex` pack, it must still be visually
   distinct from `03-nerve-forest`. Do not reuse the nerve forest backgrounds,
   atlas, agent, or motifs.
5. If the new level needs a new mechanic, stop and write an ADR before writing
   the prompt.
6. If the new level has no design doc, write one first using the M2 room-spec
   format in [`docs/m2/nervous-puzzles/01-bone-gate.md`](../m2/nervous-puzzles/01-bone-gate.md).
   Do not start from a cool room idea.

---

## 7. Quick command reference

```text
npm test
npm run pack:validate
npm run pack:smoke
npm run pack:map -- --pack silicon-reflex
npm run build
git diff --check
npm run smoke:e2e
```

Expected Silicon warnings:

- `COVERAGE_OBJECTIVE_UNMAPPED` for OBJ-1–OBJ-4.
- `COVERAGE_CONCEPT_UNMAPPED` for CON-1–CON-6.

These are expected because the Silicon pack authors only OBJ-5/CON-7/CON-8.
Record them; do not suppress them by duplicating anatomy content.

---

## 8. Related documents

- [`../m2/nervous-puzzles/silicon-fixture.md`](../m2/nervous-puzzles/silicon-fixture.md)
- [`../m2/nervous-puzzles/anatomy-fidelity.md`](../m2/nervous-puzzles/anatomy-fidelity.md)
- [`../m3/asset-requirements-v01.md`](../m3/asset-requirements-v01.md)
- [`../m3.5/hub-asset-prompts-v01.md`](../m3.5/hub-asset-prompts-v01.md) — M3.5 bathroom hub prompt pack
- [`../m1.5/authoring.md`](../m1.5/authoring.md)
- [`../m1.9/README.md`](../m1.9/README.md)
- [`../shrinkonauts/base-game/level-authoring.md`](../shrinkonauts/base-game/level-authoring.md)
- [`../shrinkonauts/base-game/contracts/pack-schema.md`](../shrinkonauts/base-game/contracts/pack-schema.md)
- [`../../public/packs/index.json`](../../public/packs/index.json)
- [`../../public/packs/anatomy-reflex/assets.final.json`](../../public/packs/anatomy-reflex/assets.final.json)
- [`../../public/packs/anatomy-reflex/materials.json`](../../public/packs/anatomy-reflex/materials.json)
