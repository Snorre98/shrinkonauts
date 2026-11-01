# Level implementation prompt — template

**Status:** Draft v0.1 · 1 November 2026  
**Use:** Copy the prompt block in §3 into a coding agent working in this
repository. Fill the variables in §2 first. For the Silicon instance, use
[`levels/01-interrupt-loop.md`](levels/01-interrupt-loop.md) instead.

> **Scope:** this prompt implements one new level package and its content
> wiring. It does not implement engine features. If a new mechanic is needed,
> stop and write an ADR proposal.

---

## 1. What this prompt produces

For a **new pack**:

```text
public/packs/<pack-id>/
  pack.json
  theme.json
  materials.json
  mapping.json
  licenses.json
  assets.placeholder.json
  assets.final.json
  levels/<level-id>/
    README.md
    level.json
    room.json
    puzzle.json
    dialogue.json
    gate.json          # only if the level uses a concept gate
  shared/
    sprites/
    backgrounds/
    tiles/
    ui/
    audio/
```

For a **new level in an existing pack**, omit the pack/theme/materials scaffold
and add only the level directory, level-specific assets, and the pack wiring.

The prompt also updates:

- `public/packs/index.json` if the pack is new or the catalog status changes
- `scripts/pack-validate.ts` and `scripts/pack-smoke.ts` if they hardcode the
  existing pack
- tests/e2e that encode the old catalog or level status
- `mapping.json` through `npm run pack:map -- --pack <pack-id>`

It does **not** modify `src/game`, `src/puzzle`, `src/world`, `src/physics`, or
any gameplay/runtime module.

---

## 2. Variables

Fill these before pasting the prompt.

| Variable | Meaning | Example |
|---|---|---|
| `{{PACK_ID}}` | New pack id, kebab-case | `silicon-reflex` |
| `{{PACK_TITLE}}` | Pack title; must match the catalog title exactly | `Silicon: Interrupt Loop` |
| `{{PACK_PATH}}` | Repo path | `public/packs/silicon-reflex/` |
| `{{LEVEL_ID}}` | Level id | `01-interrupt-loop` |
| `{{LEVEL_TITLE}}` | Level title | `Interrupt Loop` |
| `{{LEVEL_ORDER}}` | Order within the pack | `1` |
| `{{OBJECTIVE_IDS}}` | Syllabus objectives | `OBJ-5` |
| `{{CONCEPT_IDS}}` | Syllabus concepts | `CON-7`, `CON-8` |
| `{{PUZZLE_ID}}` | Puzzle id | `puzzle-interrupt-loop` |
| `{{DIALOGUE_ID}}` | Dialogue id | `dlg-cpu-01` |
| `{{GATE_ID}}` | Optional concept gate id | `gate-transfer` |
| `{{DESIGN_DOC}}` | Level design doc | `docs/m2/nervous-puzzles/silicon-fixture.md` |
| `{{THEME_DOC}}` | Theme contract | `docs/prompts/silicon-theme.md` |
| `{{ASSET_REGISTER}}` | Asset register section | `docs/prompts/silicon-theme.md` §9 |
| `{{ROOM_WIDTH}}` / `{{ROOM_HEIGHT}}` | Room size in tiles | `40` / `23` |
| `{{START_LEVEL_ID}}` / `{{END_LEVEL_ID}}` | Pack start/end | same level for a one-level pack |
| `{{AUDIO_SCOPE}}` | Audio decision | `reuse the shared cue IDs (11 M3 cues plus wrong placeholder); no new music` |

If there is no design doc yet, write one first. Use the M2 room-spec format in
[`docs/m2/nervous-puzzles/01-bone-gate.md`](../m2/nervous-puzzles/01-bone-gate.md):
learning target, fiction, spatial layout, puzzle rules, feedback, evidence,
co-op/solo, scope, and acceptance. Do not start implementation from a cool room
idea.

---

## 3. Copy-paste prompt

```text
ROLE
You are implementing one new level package for Shrinkonauts, a 2D pixel-art
learning platformer. You are working in the repository at
/Volumes/Ex-SSD/Documents/Studies/game-it3021-gamified-learning/shrinkonauts.

The work is DATA CONTENT, not engine code. You may edit pack data, themes,
materials, manifests, licences, catalog metadata, tests, and validation scripts.
You may NOT edit src/game, src/puzzle, src/world, src/physics, or any gameplay
or runtime module. If the level needs a new node, link, entity behaviour, gate
type, verb, UI surface, or save field, STOP and write an ADR proposal instead.

CONTEXT TO READ BEFORE EDITING
1. docs/m2/nervous-puzzles/README.md
2. {{DESIGN_DOC}}
3. docs/m2/nervous-puzzles/anatomy-fidelity.md
4. docs/m1.5/authoring.md
5. docs/shrinkonauts/base-game/level-authoring.md
6. docs/shrinkonauts/base-game/contracts/pack-schema.md
7. docs/m1.9/README.md
8. {{THEME_DOC}}
9. {{ASSET_REGISTER}}
10. The current exemplars:
    - public/packs/anatomy-reflex/pack.json
    - public/packs/anatomy-reflex/theme.json
    - public/packs/anatomy-reflex/materials.json
    - public/packs/anatomy-reflex/levels/03-nerve-forest/level.json
    - public/packs/anatomy-reflex/levels/03-nerve-forest/room.json
    - public/packs/anatomy-reflex/levels/03-nerve-forest/puzzle.json
    - public/packs/anatomy-reflex/levels/04-muscle-effector/level.json
    - public/packs/anatomy-reflex/levels/04-muscle-effector/room.json
    - public/packs/anatomy-reflex/levels/04-muscle-effector/puzzle.json
    - public/packs/anatomy-reflex/levels/04-muscle-effector/dialogue.json
11. The schema authority:
    - src/pack/types.ts
    - src/pack/parse-content.ts
    - src/pack/parse-materials.ts
    - src/puzzle/types.ts
    - src/puzzle/validate.ts
    - src/pack/validate.ts
12. The tooling:
    - scripts/pack-validate.ts
    - scripts/pack-smoke.ts
    - scripts/pack-map.ts
    - tests/app-state.test.ts
    - e2e/hub.spec.ts

If any of these files has changed since this prompt was written, the actual
file wins. Do not implement from stale examples.

INPUTS
- Pack: {{PACK_ID}} — {{PACK_TITLE}}
- Pack path: {{PACK_PATH}}
- Level: {{LEVEL_ID}} — {{LEVEL_TITLE}}
- Level order: {{LEVEL_ORDER}}
- Objectives: {{OBJECTIVE_IDS}}
- Concepts: {{CONCEPT_IDS}}
- Puzzle: {{PUZZLE_ID}}
- Dialogue: {{DIALOGUE_ID}}
- Optional concept gate: {{GATE_ID}}
- Room: {{ROOM_WIDTH}} × {{ROOM_HEIGHT}} tiles at 32 px
- Start level: {{START_LEVEL_ID}}
- End level: {{END_LEVEL_ID}}
- Audio: {{AUDIO_SCOPE}}

TASK
1. Create the pack/level directory structure.
2. Write the level spec README from the design doc. It must include:
   learning target, fiction, spatial layout, puzzle rules, feedback and hints,
   evidence, co-op/solo, scope, visual theme, asset register, acceptance.
3. Author level.json, room.json, puzzle.json, dialogue.json, and gate.json
   (if used).
4. Add the pack, theme, materials, mapping, licences, and asset manifests.
5. Add every new asset ID to assets.final.json as a declared placeholder.
6. Wire the catalog, mapping, and any required validation/smoke/test paths.
7. Run the validation commands in this prompt. Fix every error. Record every
   warning and why it is expected.
8. Update the level spec with the actual file paths, puzzle graph, room facts,
   and validation results.

SCHEMA AND ID RULES
- Use the actual repo schema versions:
  pack.json 1.1, level.json 1.1, room.json 1.1, puzzle.json 1.1,
  theme.json 1.1, dialogue.json 1.0, gate.json 1.0 (parser accepts 1.x),
  materials.json 1.0, mapping.json 1.0, licenses.json 1.0,
  asset manifests 1.1.
- Read src/pack/types.ts and src/puzzle/types.ts as the field authority.
- Use kebab-case IDs. File names follow the pack contract.
- Use asset IDs in level/room/dialogue/gate/theme data. Never use file paths.
- Do not add unused asset IDs.
- Do not add a new prefix or entity type.
- Do not add a new node, link, win predicate, activation mode, tether policy,
  gate type, or puzzle type.

LEVEL.JSON RULES
- status starts as "draft"; set "validated" only after pack:validate and the
  tests pass.
- syllabusObjectiveIds and conceptIds must exist in the syllabus.
- roomId, dialogueIds, gateIds, puzzleIds must resolve.
- map.nodeId must be unique; map.edges may be empty for a one-level pack.
- evidence must include at least one required rule per objective authored in
  the level. Optional evidence is allowed.
- unlocks must reference known abilities/flags/map nodes, or be empty.
- nextLevelIds must reference authored levels, or be empty for the end level.
- coop.supported and coop.notes must state the solo and co-op paths.
- authoring must record playtestedSolo, playtestedCoop, and notes.
- feedback is optional; if used, every node id must exist in the puzzle and
  every effectPreset must be in the feedback vocabulary.

ROOM.JSON RULES
- width × height × tileSize must match the tile rows and columns.
- layers.tiles uses "#" for solid and space for empty.
- tileMaterials, if used, must match the room dimensions and have a legend.
- background.layers must be ordered sky → far → mid → near.
- spawns.player1 and spawns.player2 must be on solid ground.
- checkpoints must be reachable and not on a hazard.
- exits must reference authored levels. For a one-level pack, the exit may
  point to the same level; the runtime uses pack.endLevelId to complete.
- entities must use the registry types:
  agent, movingPlatform, hazard, pickup, trigger, gate, checkpoint,
  scanTarget, decor, body, prop, receptor, pulseSource, puzzleGate.
- puzzleGate entities must have components.gate.gateId matching the puzzle
  gate node.
- prop entities need a matching body entity; the puzzle references the prop
  entity id, never the body id.
- receptor entities need components.receptor.acceptsTag/acceptsShape and snap.
- pulseSource entities need components.pulseSource and anchors.muzzle.
- scanTarget entities need a conceptId and label.
- An interact-activated puzzle needs an entityId that exists in the room. The
  entity may be a decor, scanTarget, agent, or gate; the activation check is
  distance-based, and the interaction prompt is "Start <title>".
- Do not add a checkpoint sprite unless an authored room actually renders one.
- Do not place a hazard on a spawn or checkpoint.

PUZZLE.JSON RULES
- schemaVersion 1.1.
- activation.mode is roomStart, zoneEnter, or interact.
  - zoneEnter needs activation.zoneId naming a zone node in the same document.
  - interact needs activation.entityId naming a room entity.
- tether is normal, stretch, or off. "off" is valid only when the puzzle
  geometry fits one 1280 × 720 viewport. The validator checks the bounding box
  of referenced entity points, plate/zone/receptor rects, snap points, and prop
  spawns.
- Nodes must use only:
  prop, receptor, pulseSource, plate, relay, gate, timer, counter, zone,
  trigger.
- Links must use only:
  pulse, bind, press, release, enter, exit, increment, start, stop, reset,
  elapsed, reached, activate, deactivate, open, close, clear.
- The validator rejects illegal source/target pairs and relay cycles. Read
  src/puzzle/validate.ts for the exact table.
- win must use an existing predicate:
  gateOpen, receptorBound, platePressed, relayActive, timerElapsed,
  counterReached, zoneOccupied, propState, flagSet, allOf, anyOf, not.
- reset.props must name prop nodes; reset.nodes must name existing nodes.
- evidence.onSolve and evidence.counters must use the existing vocabulary.
- rewards.abilities/flags/mapNodes must be known.
- solution is a deterministic replay trace, not a recording. It must reach the
  win predicate in replaySolution. Prefer a P1-only trace to prove solo.
- hints must be authored, one at a time, scaffolding not solving.
- Do not use a "place" action on a plate; "place" targets receptors only.
  For plates, use pickup → move → drop (or push) so the prop is released on the
  plate.
- Do not use a pulseSource unless the level also grants the pulse ability or
  the solo union provides it.

DIALOGUE AND GATE RULES
- dialogue.json schemaVersion 1.0. The agent introduces the concept before the
  puzzle tests it: meet, problem, clue, check, hand-off.
- Conditions and effects must use the allowed vocabulary in
  src/pack/types.ts. Do not invent a new effect.
- The dialogue must not give the gate answer verbatim; it gives the
  understanding.
- A concept gate uses gate.json with type "concept", objectiveId, conceptIds,
  prompt, one of singleChoice/sequence/match, hints, onSolve, onFail.
- The gate must be referenced by level.gateIds and by a room gate entity with
  gateId matching.
- No fail state: wrong answers give feedback and can be retried.
- If the level uses a debrief, the runtime derives the prompt id as
  "prompt-<objective-id-lowercase>" (for example prompt-obj-5). Do not assume a
  syllabus filter id such as "prompt-transfer" is the runtime prompt id; record
  the mismatch if one exists.

PACK, THEME, MATERIALS, AND ASSETS
- pack.json: id and title must match the catalog entry. startLevelId and
  endLevelId must be in levels. levels must list every authored level.
  theme, mapping, licenses, materials, and assetManifests must resolve.
- theme.json: use the shared palette tokens and the pack's material/pattern
  slots. Do not add pack-specific CSS. Use the bundled Silkscreen and Pixelify
  Sans families.
- materials.json: every material palette token must exist in the theme; every
  pattern and variant set must resolve; variant set frame keys must be in the
  autotile mask space.
- assets.final.json: add every new ID as a declared placeholder first. A
  placeholder has no src and no licence requirement. A final asset has src and
  a matching licenses.json entry.
- A new pack cannot reference another pack's files. Copy the shared player
  assets into the new pack's shared/ folder and add matching licence entries.
  Copy the badge only if a final badge file exists; otherwise declare the badge
  placeholder.
- Do not reference art-source/ from a manifest or serve raw source sheets.
- Do not add audio cue IDs unless the runtime already plays them. Reuse the
  shared 11 cues.

CATALOG, MAPPING, AND TESTS
- If the pack is new or its status changes, update public/packs/index.json.
  Keep id, path, title, order, status, and online consistent with pack.json.
- Run npm run pack:map -- --pack <pack-id> after the level/dialogue/gate data
  is final. Do not hand-edit mapping.json unless the generator cannot run.
- If scripts/pack-validate.ts or scripts/pack-smoke.ts hardcode the existing
  pack, extend them minimally so the new pack is actually validated. Do not
  skip validation because the script is hardcoded.
- If tests or e2e encode the old catalog status, update the expectations to
  the new status. Do not delete coverage.
- Do not change unrelated tests or docs.

VALIDATION
Run, in this order, and fix every error:
  npm test
  npm run pack:validate
  npm run pack:smoke
  npm run pack:map -- --pack {{PACK_ID}}
  npm run build
  git diff --check
  npm run smoke:e2e        (if the hub/catalog/e2e changed)

Expected warnings for a one-level pack:
  COVERAGE_OBJECTIVE_UNMAPPED for objectives not authored in the pack.
  COVERAGE_CONCEPT_UNMAPPED for concepts not authored in the pack.
Record them. Do not duplicate other packs' content to silence them.

Also verify manually:
- The pack loads with ?pack={{PACK_ID}} and starts at {{START_LEVEL_ID}}.
- The puzzle activates, solves solo, and resets without softlock.
- The wrong route gives feedback and remains recoverable.
- The debrief opens and finishes; evidence is recorded.
- Every new asset ID resolves or is a declared placeholder.
- The room reads at 1280 × 720 with the HUD.

STOP CONDITIONS
Stop and report instead of guessing if:
- the design needs a new node, link, entity, gate, verb, UI surface, or save
  field;
- the validator or smoke script cannot support a second pack without engine
  code;
- the puzzle solution trace cannot reach the win predicate;
- an asset ID cannot be resolved or a required licence is missing;
- the visual theme cannot be made distinct from Nerve Forest without a new
  palette family or ADR;
- two source documents contradict each other in a way that changes the level;
- an unrelated test fails.

DELIVERABLES
- The pack/level files.
- The level spec README with the actual puzzle graph, room facts, evidence,
  co-op/solo, asset register, and validation results.
- The catalog/mapping/manifest/theme/materials updates.
- The validation/smoke/test updates.
- A short report: files changed, commands run, warnings, deviations, and open
  questions.
```

---

## 4. Field reference

### 4.1 `level.json`

Required fields:

```json
{
  "schemaVersion": "1.1",
  "id": "01-example",
  "title": "Example",
  "order": 1,
  "status": "draft",
  "syllabusObjectiveIds": ["OBJ-1"],
  "conceptIds": ["CON-1"],
  "roomId": "room-example",
  "backgroundId": "bg.example",
  "dialogueIds": ["dlg-example"],
  "gateIds": [],
  "puzzleIds": ["puzzle-example"],
  "map": {
    "nodeId": "map-example",
    "label": "Example",
    "x": 0,
    "y": 0,
    "edges": []
  },
  "evidence": [
    {
      "objectiveId": "OBJ-1",
      "event": "puzzle_solved",
      "filter": { "puzzleId": "puzzle-example" },
      "required": true
    }
  ],
  "unlocks": [],
  "nextLevelIds": [],
  "coop": { "supported": true, "notes": "Solo completes; co-op adds a role." },
  "authoring": {
    "levelSpec": "README.md",
    "playtestedSolo": false,
    "playtestedCoop": false,
    "notes": ""
  }
}
```

### 4.2 `room.json`

The exact interface is in `src/pack/types.ts`. Key rules:

- `schemaVersion` 1.1.
- `width`, `height`, `tileSize`; `layers.tiles` rows match height/width.
- `tileset` is an asset ID, even for material rooms.
- `tileMaterials` and `tileMaterialLegend` are optional but must match.
- `background.layers` ordered sky → far → mid → near.
- `spawns.player1` and `spawns.player2`.
- `checkpoints`, `exits`, `entities`, `triggers`.
- Entity types are a closed registry; read `RoomEntityType`.
- `components` are `body`, `prop`, `receptor`, `pulseSource`, `gate`,
  `anchors`, `material`.

### 4.3 `puzzle.json`

The exact interface is in `src/puzzle/types.ts`. Key rules:

- `schemaVersion` 1.1.
- `activation` mode and optional `zoneId`/`entityId`.
- `tether` normal/stretch/off.
- `nodes` use the ten node types.
- `links` use the allowed source/target table in `src/puzzle/validate.ts`.
- `win` uses a supported predicate.
- `reset` props/nodes.
- `evidence` onSolve/counters.
- `rewards` abilities/flags/mapNodes.
- `solution` action trace.
- `hints`.

### 4.4 `dialogue.json` and `gate.json`

- `dialogue.json` 1.0; `speaker`, `portrait`, `start`, `nodes`.
- Node text, next, choices, effects, condition.
- `gate.json` 1.0; `type`, `objectiveId`, `conceptIds`, `prompt`, `puzzle`,
  `hints`, `onSolve`, `onFail`.
- Concept gates require a `puzzle` of type singleChoice, sequence, or match.

### 4.5 Asset manifests

- `assets.placeholder.json` may be empty.
- `assets.final.json` maps every referenced ID to a descriptor.
- Placeholder: `{ "type": "sprite", "placeholder": true }`.
- Final: `{ "type": "sprite", "src": "shared/sprites/example.png", "license": "..." }`.
- Sheets: `frameWidth`, `frameHeight`, `frames`, `fps`, `loop`, `anchor`.
- Atlases: `width`, `height`, `regions`.

---

## 5. Pre-flight checklist

- [ ] The design doc exists and is current.
- [ ] The objective/concepts exist in the syllabus.
- [ ] The level does not need a new mechanic.
- [ ] The theme contract is written and distinct.
- [ ] The asset register is written.
- [ ] The room size and tether policy fit 1280 × 720.
- [ ] The solo and co-op paths are described.
- [ ] The evidence and debrief plan is described.
- [ ] The pack/catalog status decision is made.

## 6. Post-flight checklist

- [ ] All required files exist and parse.
- [ ] `pack:validate` passes; expected warnings recorded.
- [ ] `pack:smoke` passes for the new pack.
- [ ] `npm test` passes.
- [ ] `pack:map` produces no drift.
- [ ] `npm run build` passes.
- [ ] `git diff --check` is clean.
- [ ] The hub/e2e path works if the catalog changed.
- [ ] The level README records the actual room facts and puzzle graph.
- [ ] The level status is `validated`, not `done`; playtesting is still false.
- [ ] No engine code changed.
- [ ] No unrelated docs changed.

---

## 7. Reuse notes

- For a new level in an existing pack, skip the pack/theme/materials scaffold
  and add only the level directory and level-specific assets.
- For a one-level pack, `startLevelId` and `endLevelId` are the same. The room
  exit may point to the same level; the runtime completes at `endLevelId` after
  the debrief.
- For a level with no concept gate, omit `gate.json` and `gateIds`.
- For a level with no new audio, reuse the shared cue IDs and do not add cue
  entries.
- For a level with no new materials, reuse the pack's material atlases and do
  not add a theme/material entry.
- For a level that needs a new palette family, stop: that is an ADR/theme
  decision, not a level prompt.
