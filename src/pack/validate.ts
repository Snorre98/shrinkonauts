/**
 * VALIDATOR DEPENDENCY EXCEPTION (documented in IMPLEMENTATION.md).
 *
 * `pack` is a domain module, while `assets` is normally an adapter. Validation
 * must answer the same question the renderer will ask ("does this logical ID
 * resolve, and to what?"), so it reuses `createAssets` and the shared ID
 * constants rather than maintaining a second, drifting resolver. The import is
 * pure: no file, DOM, network, or Phaser APIs are involved, and `fileExists`
 * is injected by the Node/browser caller.
 */
import {
  ASSET_TYPES,
  createAssets,
  inferCategory,
  PLAYER_ASSET_IDS,
  supportsVisualCategory,
  type AssetId,
  type AssetManifest,
  type ManifestAssetEntry,
} from "../assets";
import { silentLogger } from "../core/logger";
import { replaySolution, validatePuzzleDocument } from "../puzzle";
import { collectRoomAssetIds, collectThemeAssetIds } from "./load";
import { buildMapping, mappingDrift } from "./mapping";
import type {
  DialogueDocument,
  PackContent,
  RoomDocument,
  ThemeDocument,
} from "./types";

export type PackIssueCode =
  | "ASSET_ID_INVALID"
  | "ASSET_ID_MISSING"
  | "ASSET_FILE_MISSING"
  | "ASSET_FORMAT_UNSUPPORTED"
  | "ASSET_MANIFEST_INVALID"
  | "ASSET_MANIFEST_MISSING"
  | "LICENSE_MISSING"
  | "LICENCE_INVALID"
  | "BACKGROUND_LAYER_INVALID"
  | "AUDIO_CUE_MISSING"
  | "UI_ASSET_MISSING"
  | "PACK_SCHEMA_VERSION"
  | "PACK_DUPLICATE_ID"
  | "LEVEL_MISSING"
  | "LEVEL_SCHEMA_VERSION"
  | "LEVEL_REFERENCE_MISSING"
  | "LEVEL_EVIDENCE_MISSING"
  | "PUZZLE_INVALID"
  | "PUZZLE_REFERENCE_MISSING"
  | "SYLLABUS_REFERENCE_MISSING"
  | "COVERAGE_OBJECTIVE_UNMAPPED"
  | "COVERAGE_CONCEPT_UNMAPPED"
  | "COVERAGE_GATE_ORPHAN"
  | "COVERAGE_DIALOGUE_ORPHAN"
  | "COVERAGE_LEVEL_ORPHAN"
  | "COVERAGE_PUZZLE_ORPHAN"
  | "REACHABILITY_DEAD_END"
  | "THEME_TOKEN_INVALID"
  | "MAPPING_DRIFT";

export interface PackIssue {
  code: PackIssueCode;
  id?: AssetId;
  message: string;
}

export interface PackValidationInput {
  room: RoomDocument;
  theme: ThemeDocument;
  finalManifest?: AssetManifest | null;
  packManifest?: AssetManifest | null;
  /** Receives absolute URLs from parsed manifests. */
  fileExists: (src: string) => boolean;
  /**
   * Full pack content. When present, structural, coverage, reachability,
   * mapping, licence, and multi-room asset checks run as well.
   */
  content?: PackContent;
}

export interface PackValidationResult {
  ok: boolean;
  issues: PackIssue[];
  /** Non-fatal coverage gaps (for example objectives not authored yet). */
  warnings: string[];
  ids: AssetId[];
  placeholders: AssetId[];
}

const FIT_MODES = new Set(["cover", "tile", "stretch", "contain"]);
const BLEND_MODES = new Set(["normal", "add", "multiply", "screen"]);
const HEX_COLOR = /^#[0-9a-fA-F]{6}$/;
const KNOWN_CUE_NAMES = new Set([
  "boot",
  "dialogue",
  "scan",
  "dash",
  "gate",
  "map",
  "kick",
  "debrief",
  "jump",
  "land",
  "mute",
  "unmute",
  "checkpoint",
  "unlock",
  "wrong",
]);

type AddIssue = (
  code: PackIssueCode,
  message: string,
  id?: AssetId,
) => void;
type AddWarning = (message: string) => void;

function checkManifest(
  manifest: AssetManifest | null | undefined,
  label: string,
  isFinal: boolean,
  fileExists: (src: string) => boolean,
  addIssue: AddIssue,
): void {
  if (!manifest) {
    return;
  }

  for (const [id, entry] of Object.entries(manifest.assets) as Array<
    [AssetId, ManifestAssetEntry]
  >) {
    const category = inferCategory(id);

    if (!category) {
      addIssue(
        "ASSET_ID_INVALID",
        `${label} manifest entry "${id}" uses an unknown asset ID prefix`,
        id,
      );
    }

    if (!ASSET_TYPES.includes(entry.type)) {
      addIssue(
        "ASSET_FORMAT_UNSUPPORTED",
        `${label} manifest entry "${id}" has unsupported type "${String(entry.type)}"`,
        id,
      );
    } else if (category && !supportsVisualCategory(category, entry.type)) {
      addIssue(
        "ASSET_FORMAT_UNSUPPORTED",
        `${label} manifest entry "${id}" has type "${entry.type}" but the ID implies "${category}"`,
        id,
      );
    }

    if (entry.src) {
      let exists = false;
      try {
        exists = fileExists(entry.src);
      } catch {
        exists = false;
      }
      if (!exists) {
        addIssue(
          "ASSET_FILE_MISSING",
          `${label} manifest file does not exist: ${entry.src}`,
          id,
        );
      }
    } else if (entry.placeholder !== true) {
      addIssue(
        "ASSET_FILE_MISSING",
        `${label} manifest entry "${id}" has no src and is not a declared placeholder`,
        id,
      );
    }

    if (
      isFinal &&
      entry.placeholder !== true &&
      (!entry.license || entry.license.trim() === "")
    ) {
      addIssue("LICENSE_MISSING", `final asset "${id}" has no licence`, id);
    }

    if (
      entry.type === "sheet" &&
      (entry.frameWidth === undefined ||
        entry.frameHeight === undefined ||
        entry.frames === undefined)
    ) {
      addIssue(
        "ASSET_MANIFEST_INVALID",
        `${label} manifest entry "${id}" is a sheet without frame metadata`,
        id,
      );
    }
  }
}

function checkBackground(
  room: RoomDocument,
  assets: ReturnType<typeof createAssets>,
  addIssue: AddIssue,
): void {
  if (inferCategory(room.tileset) !== "image") {
    addIssue(
      "ASSET_ID_INVALID",
      `room "${room.id}" tileset "${room.tileset}" must use an image asset ID prefix`,
      room.tileset,
    );
  }

  for (const [index, layer] of room.background.layers.entries()) {
    const prefix = `room "${room.id}" background.layers[${index}]`;

    if (inferCategory(layer.assetId) !== "image") {
      addIssue(
        "BACKGROUND_LAYER_INVALID",
        `${prefix} asset "${layer.assetId}" must use an image asset ID prefix`,
        layer.assetId,
      );
    } else {
      try {
        const resolved = assets.image(layer.assetId);
        if (!resolved || !supportsVisualCategory("image", resolved.type)) {
          addIssue(
            "BACKGROUND_LAYER_INVALID",
            `${prefix} asset "${layer.assetId}" does not resolve to a visual asset`,
            layer.assetId,
          );
        }
      } catch {
        addIssue(
          "BACKGROUND_LAYER_INVALID",
          `${prefix} asset "${layer.assetId}" could not be resolved`,
          layer.assetId,
        );
      }
    }

    if (!Number.isFinite(layer.depth)) {
      addIssue("BACKGROUND_LAYER_INVALID", `${prefix} depth must be numeric`);
    }
    if (
      !Number.isFinite(layer.parallaxX) ||
      !Number.isFinite(layer.parallaxY)
    ) {
      addIssue(
        "BACKGROUND_LAYER_INVALID",
        `${prefix} parallaxX/parallaxY must be numeric`,
      );
    }
    if (!FIT_MODES.has(layer.fit)) {
      addIssue(
        "BACKGROUND_LAYER_INVALID",
        `${prefix} fit "${String(layer.fit)}" is not supported`,
      );
    }
    if (
      layer.opacity !== undefined &&
      (!Number.isFinite(layer.opacity) ||
        layer.opacity < 0 ||
        layer.opacity > 1)
    ) {
      addIssue(
        "BACKGROUND_LAYER_INVALID",
        `${prefix} opacity must be between 0 and 1`,
      );
    }
    if (layer.tint !== undefined && !HEX_COLOR.test(layer.tint)) {
      addIssue(
        "BACKGROUND_LAYER_INVALID",
        `${prefix} tint must be a six-digit hex colour`,
      );
    }
    if (layer.blend !== undefined && !BLEND_MODES.has(layer.blend)) {
      addIssue(
        "BACKGROUND_LAYER_INVALID",
        `${prefix} blend "${String(layer.blend)}" is not supported`,
      );
    }
  }

  for (const entity of room.entities ?? []) {
    if (!entity.sprite) continue;
    const category = inferCategory(entity.sprite);
    if (category !== "sprite" && category !== "image") {
      addIssue(
        "ASSET_ID_INVALID",
        `room "${room.id}" entity "${entity.id}" sprite "${entity.sprite}" must use a sprite/image prefix`,
        entity.sprite,
      );
    }
  }
}

function checkUiAssets(
  theme: ThemeDocument,
  assets: ReturnType<typeof createAssets>,
  addIssue: AddIssue,
): void {
  for (const [key, id] of Object.entries(theme.ui.assets)) {
    try {
      const resolved = assets.resolveById(id);
      if (!resolved || !supportsVisualCategory("image", resolved.type)) {
        addIssue(
          "UI_ASSET_MISSING",
          `theme.ui.assets.${key} ("${id}") does not resolve to a visual asset`,
          id,
        );
      }
    } catch {
      addIssue(
        "UI_ASSET_MISSING",
        `theme.ui.assets.${key} ("${id}") could not be resolved`,
        id,
      );
    }
  }
}

function checkAudioAssets(
  room: RoomDocument,
  theme: ThemeDocument,
  assets: ReturnType<typeof createAssets>,
  addIssue: AddIssue,
  addWarning: AddWarning,
): void {
  const audioIds: Array<[string, AssetId]> = [];

  if (room.music) {
    audioIds.push(["room.music", room.music]);
  }
  if (room.ambience) {
    audioIds.push(["room.ambience", room.ambience]);
  }
  if (theme.audio?.music) {
    audioIds.push(["theme.audio.music", theme.audio.music]);
  }
  for (const [key, id] of Object.entries(theme.audio?.cues ?? {})) {
    if (!KNOWN_CUE_NAMES.has(key)) {
      addWarning(`theme.audio.cues.${key} is not a known cue name; it is ignored`);
    }
    audioIds.push([`theme.audio.cues.${key}`, id]);
  }

  for (const [label, id] of audioIds) {
    if (inferCategory(id) !== "audio") {
      addIssue(
        "AUDIO_CUE_MISSING",
        `${label} ("${id}") must use an audio asset ID prefix`,
        id,
      );
      continue;
    }

    try {
      const resolved = assets.audio(id);
      if (!resolved || resolved.type !== "audio") {
        addIssue(
          "AUDIO_CUE_MISSING",
          `${label} ("${id}") does not resolve to an audio asset`,
          id,
        );
      }
    } catch {
      addIssue(
        "AUDIO_CUE_MISSING",
        `${label} ("${id}") could not be resolved`,
        id,
      );
    }
  }
}

function checkLicences(
  content: PackContent,
  finalManifest: AssetManifest | null | undefined,
  addIssue: AddIssue,
): void {
  const seen = new Set<string>();
  const licenceNames = new Set<string>();
  for (const entry of content.licenses.assets) {
    if (seen.has(entry.file)) {
      addIssue(
        "LICENCE_INVALID",
        `licenses.json contains a duplicate entry for "${entry.file}"`,
      );
    }
    seen.add(entry.file);
    licenceNames.add(entry.license);
    if (
      entry.source.trim() === "" ||
      entry.author.trim() === "" ||
      entry.license.trim() === ""
    ) {
      addIssue(
        "LICENCE_INVALID",
        `licence for "${entry.file}" needs source, author, and license`,
      );
    }
    if (entry.aiGenerated === true && !entry.modified) {
      addIssue(
        "LICENCE_INVALID",
        `AI-generated asset "${entry.file}" needs a tool/terms note in modified`,
      );
    }
  }

  for (const [id, entry] of Object.entries(finalManifest?.assets ?? {})) {
    if (entry.placeholder === true || !entry.src) continue;
    if (entry.license && !licenceNames.has(entry.license)) {
      addIssue(
        "LICENSE_MISSING",
        `final asset "${id}" cites licence "${entry.license}" that is not in licenses.json`,
        id,
      );
    }
  }
}

function dialogueRevealsConcept(
  dialogue: DialogueDocument,
  conceptId: string,
): boolean {
  return Object.values(dialogue.nodes).some((node) =>
    (node.effects ?? []).some(
      (effect) =>
        effect.type === "revealConcept" && effect.conceptId === conceptId,
    ),
  );
}

function checkContent(
  content: PackContent,
  finalManifest: AssetManifest | null | undefined,
  packManifest: AssetManifest | null | undefined,
  addIssue: AddIssue,
  addWarning: AddWarning,
): void {
  const { pack, syllabus, mapping, levels, rooms, dialogues, gates, puzzles } = content;
  const levelIds = new Set(pack.levels);
  const levelById = new Map(levels.map((level) => [level.id, level]));

  if (pack.assetManifests.final && !finalManifest) {
    addIssue(
      "ASSET_MANIFEST_MISSING",
      `pack declares final manifest "${pack.assetManifests.final}" but it did not load`,
    );
  }
  if (pack.assetManifests.placeholder && !packManifest) {
    addIssue(
      "ASSET_MANIFEST_MISSING",
      `pack declares placeholder manifest "${pack.assetManifests.placeholder}" but it did not load`,
    );
  }

  for (const levelId of pack.levels) {
    if (!levelById.has(levelId)) {
      addIssue("LEVEL_MISSING", `pack level "${levelId}" has no level.json`);
    }
  }
  for (const level of levels) {
    if (!levelIds.has(level.id)) {
      addIssue(
        "LEVEL_REFERENCE_MISSING",
        `level "${level.id}" is not listed in pack.levels`,
      );
    }
  }

  const referencedDialogues = new Set<string>();
  const referencedGates = new Set<string>();
  const referencedPuzzles = new Set<string>();
  const scenarioDialogues = new Set<string>();

  for (const room of Object.values(rooms)) {
    for (const trigger of room.triggers ?? []) {
      if (trigger.dialogueId) scenarioDialogues.add(trigger.dialogueId);
      if (trigger.gateId) referencedGates.add(trigger.gateId);
    }
    for (const entity of room.entities ?? []) {
      if (entity.dialogueId) scenarioDialogues.add(entity.dialogueId);
      if (entity.gateId) referencedGates.add(entity.gateId);
      if (entity.type === "puzzleGate" && entity.components?.gate?.gateId) {
        referencedPuzzles.add(entity.components.gate.gateId);
      }
    }
  }
  for (const exit of Object.values(rooms).flatMap((room) => room.exits ?? [])) {
    if (exit.gateId) referencedGates.add(exit.gateId);
    if (exit.puzzleId) referencedPuzzles.add(exit.puzzleId);
    if (!levelIds.has(exit.toLevelId)) {
      // The M1 vertical slice ships only one level. Forward exits are kept in
      // the data so later slices need no schema change; they are reported but
      // not treated as broken references yet.
      addWarning(
        `LEVEL_REFERENCE_FORWARD: room exit "${exit.id}" targets level "${exit.toLevelId}" which is not authored in this slice`,
      );
    }
  }

  const mappedObjectives = new Set<string>();
  const mappedConcepts = new Set<string>();

  for (const level of levels) {
    const room = rooms[level.roomId];
    if (!room) {
      addIssue(
        "LEVEL_REFERENCE_MISSING",
        `level "${level.id}" references missing room "${level.roomId}"`,
      );
    }

    if (level.syllabusObjectiveIds.length === 0) {
      addIssue(
        "COVERAGE_LEVEL_ORPHAN",
        `level "${level.id}" maps to no syllabus objective`,
      );
    }
    for (const objectiveId of level.syllabusObjectiveIds) {
      mappedObjectives.add(objectiveId);
      if (!syllabus.objectives.some((item) => item.id === objectiveId)) {
        addIssue(
          "SYLLABUS_REFERENCE_MISSING",
          `level "${level.id}" references unknown objective "${objectiveId}"`,
          objectiveId,
        );
      }
      const evidence = level.evidence.some(
        (rule) => rule.objectiveId === objectiveId,
      );
      if (!evidence) {
        addIssue(
          "LEVEL_EVIDENCE_MISSING",
          `level "${level.id}" has no evidence rule for ${objectiveId}`,
          objectiveId,
        );
      }
    }
    for (const conceptId of level.conceptIds) {
      mappedConcepts.add(conceptId);
      if (!syllabus.concepts.some((item) => item.id === conceptId)) {
        addIssue(
          "SYLLABUS_REFERENCE_MISSING",
          `level "${level.id}" references unknown concept "${conceptId}"`,
          conceptId,
        );
      }
    }

    for (const dialogueId of level.dialogueIds) {
      referencedDialogues.add(dialogueId);
      if (!dialogues[dialogueId]) {
        addIssue(
          "LEVEL_REFERENCE_MISSING",
          `level "${level.id}" references missing dialogue "${dialogueId}"`,
        );
      }
    }
    for (const gateId of level.gateIds) {
      referencedGates.add(gateId);
      if (!gates[gateId]) {
        addIssue(
          "LEVEL_REFERENCE_MISSING",
          `level "${level.id}" references missing gate "${gateId}"`,
        );
      }
    }

    for (const puzzleId of level.puzzleIds ?? []) {
      referencedPuzzles.add(puzzleId);
      const puzzle = puzzles[puzzleId];
      if (!puzzle) {
        addIssue(
          "PUZZLE_REFERENCE_MISSING",
          `level "${level.id}" references missing puzzle "${puzzleId}"`,
        );
        continue;
      }

      const validation = validatePuzzleDocument(puzzle);
      for (const issue of validation.issues) {
        addIssue("PUZZLE_INVALID", `${puzzle.id}: ${issue.message}`);
      }
      const replay = replaySolution(puzzle);
      if (!replay.ok) {
        addIssue(
          "PUZZLE_INVALID",
          `${puzzle.id}: solution trace does not reach the win predicate${
            replay.error ? ` (${replay.error})` : ""
          }`,
        );
      }
      for (const objectiveId of puzzle.objectiveIds) {
        if (!syllabus.objectives.some((item) => item.id === objectiveId)) {
          addIssue(
            "SYLLABUS_REFERENCE_MISSING",
            `puzzle "${puzzle.id}" references unknown objective "${objectiveId}"`,
            objectiveId,
          );
        }
      }
      for (const conceptId of puzzle.conceptIds) {
        if (!syllabus.concepts.some((item) => item.id === conceptId)) {
          addIssue(
            "SYLLABUS_REFERENCE_MISSING",
            `puzzle "${puzzle.id}" references unknown concept "${conceptId}"`,
            conceptId,
          );
        }
      }

      const roomEntities = room?.entities ?? [];
      for (const node of puzzle.nodes) {
        if (!node.entityId) continue;
        const entity = roomEntities.find((item) => item.id === node.entityId);
        if (!entity) {
          addIssue(
            "PUZZLE_REFERENCE_MISSING",
            `puzzle "${puzzle.id}" node "${node.id}" references missing entity "${node.entityId}"`,
          );
          continue;
        }
        const expected: Record<string, string> = {
          prop: "prop",
          receptor: "receptor",
          pulseSource: "pulseSource",
          gate: "puzzleGate",
        };
        const wanted = expected[node.type];
        if (wanted && entity.type !== wanted) {
          addIssue(
            "PUZZLE_REFERENCE_MISSING",
            `puzzle "${puzzle.id}" node "${node.id}" expects entity type "${wanted}" but "${entity.id}" is "${entity.type}"`,
          );
        }
      }
    }

    for (const edge of level.map.edges) {
      if (edge.puzzleId) referencedPuzzles.add(edge.puzzleId);
    }

    for (const next of level.nextLevelIds) {
      if (!levelIds.has(next)) {
        addWarning(
          `LEVEL_REFERENCE_FORWARD: level "${level.id}" next level "${next}" is not authored in this slice`,
        );
      }
    }

    for (const edge of level.map.edges) {
      if (!levelIds.has(edge.to)) {
        // Map edges point at map nodes, which may belong to a future level.
        addWarning(
          `REACHABILITY_FORWARD: level "${level.id}" map edge targets map node "${edge.to}" which is not authored in this slice`,
        );
      }
    }
  }

  for (const gate of Object.values(gates)) {
    if (!referencedGates.has(gate.id)) {
      addIssue(
        "COVERAGE_GATE_ORPHAN",
        `gate "${gate.id}" is not referenced by any level, room, or exit`,
      );
    }
    if (!syllabus.objectives.some((item) => item.id === gate.objectiveId)) {
      addIssue(
        "SYLLABUS_REFERENCE_MISSING",
        `gate "${gate.id}" references unknown objective "${gate.objectiveId}"`,
        gate.objectiveId,
      );
    }
    for (const conceptId of gate.conceptIds) {
      if (!syllabus.concepts.some((item) => item.id === conceptId)) {
        addIssue(
          "SYLLABUS_REFERENCE_MISSING",
          `gate "${gate.id}" references unknown concept "${conceptId}"`,
          conceptId,
        );
      }
    }
  }

  for (const puzzle of Object.values(puzzles)) {
    if (!referencedPuzzles.has(puzzle.id)) {
      addIssue(
        "COVERAGE_PUZZLE_ORPHAN",
        `puzzle "${puzzle.id}" is not referenced by any level, room, or exit`,
      );
    }
  }

  for (const dialogue of Object.values(dialogues)) {
    if (!referencedDialogues.has(dialogue.id) && !scenarioDialogues.has(dialogue.id)) {
      addIssue(
        "COVERAGE_DIALOGUE_ORPHAN",
        `dialogue "${dialogue.id}" is not referenced by any level or room`,
      );
    }
  }

  // Coverage of the whole syllabus is advisory during the M1 vertical slice:
  // only one of the five levels exists yet. Missing content is reported so the
  // gap stays visible, but authored content still has to be valid.
  for (const objective of syllabus.objectives) {
    if (!mappedObjectives.has(objective.id)) {
      addWarning(
        `COVERAGE_OBJECTIVE_UNMAPPED: ${objective.id} is not authored in this pack yet`,
      );
    }
  }

  const scanConcepts = new Set(
    Object.values(rooms)
      .flatMap((room) => room.entities ?? [])
      .filter((entity) => entity.type === "scanTarget" && entity.conceptId)
      .map((entity) => entity.conceptId as string),
  );
  for (const concept of syllabus.concepts) {
    const authored =
      mappedConcepts.has(concept.id) ||
      scanConcepts.has(concept.id) ||
      Object.values(gates).some((gate) => gate.conceptIds.includes(concept.id)) ||
      Object.values(puzzles).some((puzzle) =>
        puzzle.conceptIds.includes(concept.id),
      ) ||
      Object.values(dialogues).some((dialogue) =>
        dialogueRevealsConcept(dialogue, concept.id),
      );
    if (!authored) {
      addWarning(
        `COVERAGE_CONCEPT_UNMAPPED: ${concept.id} is not authored in this pack yet`,
      );
    }
  }

  const adjacency = new Map<string, Set<string>>();
  for (const id of pack.levels) adjacency.set(id, new Set());
  for (const level of levels) {
    for (const next of level.nextLevelIds) {
      adjacency.get(level.id)?.add(next);
    }
    for (const edge of level.map.edges) {
      adjacency.get(level.id)?.add(edge.to);
    }
  }
  const reached = new Set<string>();
  const queue = [pack.startLevelId];
  while (queue.length > 0) {
    const id = queue.shift();
    if (id === undefined || reached.has(id)) continue;
    reached.add(id);
    for (const next of adjacency.get(id) ?? []) {
      if (levelIds.has(next) && !reached.has(next)) queue.push(next);
    }
  }
  if (!reached.has(pack.endLevelId)) {
    addIssue(
      "REACHABILITY_DEAD_END",
      `end level "${pack.endLevelId}" is not reachable from "${pack.startLevelId}" (graph: ${[
        ...reached,
      ].join(" → ")})`,
    );
  }

  if (mapping) {
    if (mapping.packId !== pack.id) {
      addIssue(
        "MAPPING_DRIFT",
        `mapping.packId "${mapping.packId}" does not match pack "${pack.id}"`,
      );
    }
    if (mapping.syllabusId !== syllabus.id) {
      addIssue(
        "MAPPING_DRIFT",
        `mapping.syllabusId "${mapping.syllabusId}" does not match syllabus "${syllabus.id}"`,
      );
    }
    const expected = buildMapping({
      pack,
      syllabus,
      levels,
      rooms,
      dialogues,
      gates,
    });
    const drift = mappingDrift(expected, mapping);
    if (drift.length > 0) {
      addIssue(
        "MAPPING_DRIFT",
        `mapping.json is out of date; run npm run pack:map (${drift.slice(0, 5).join("; ")})`,
      );
    }
  }

  checkLicences(content, finalManifest, addIssue);
}

/**
 * Pure content validation: no `fs`, fetch, DOM, or Phaser. The scripts provide
 * `fileExists`; unit tests can pass a predicate over the parsed manifests.
 */
export function validatePack(
  input: PackValidationInput,
): PackValidationResult {
  const issues: PackIssue[] = [];
  const warnings: string[] = [];
  const seen = new Set<string>();

  const addIssue: AddIssue = (code, message, id) => {
    const key = `${code}:${id ?? ""}:${message}`;
    if (seen.has(key)) {
      return;
    }
    seen.add(key);
    issues.push(id === undefined ? { code, message } : { code, id, message });
  };
  const addWarning: AddWarning = (message) => {
    if (!warnings.includes(message)) warnings.push(message);
  };

  const { room, theme, finalManifest, packManifest, fileExists, content } =
    input;
  const assets = createAssets({
    finalManifest: finalManifest ?? null,
    packManifest: packManifest ?? null,
    logger: silentLogger,
  });

  const ids = [
    ...new Set([
      ...collectRoomAssetIds(room),
      ...collectThemeAssetIds(theme),
      ...Object.values(PLAYER_ASSET_IDS),
      ...(content
        ? Object.values(content.rooms).flatMap(collectRoomAssetIds)
        : []),
    ]),
  ];

  let placeholders: AssetId[] = [];

  try {
    const plan = assets.preload(ids);
    placeholders = plan.placeholders;

    for (const id of plan.missing) {
      addIssue(
        "ASSET_ID_INVALID",
        `referenced asset ID "${id}" does not use a recognised prefix`,
        id,
      );
    }
  } catch (error) {
    addIssue(
      "ASSET_MANIFEST_INVALID",
      `asset resolution failed: ${error instanceof Error ? error.message : String(error)}`,
    );
  }

  checkManifest(finalManifest, "final", true, fileExists, addIssue);
  checkManifest(packManifest, "pack", false, fileExists, addIssue);
  checkBackground(room, assets, addIssue);
  checkUiAssets(theme, assets, addIssue);
  checkAudioAssets(room, theme, assets, addIssue, addWarning);

  if (content) {
    for (const contentRoom of Object.values(content.rooms)) {
      if (contentRoom.id !== room.id) {
        checkBackground(contentRoom, assets, addIssue);
        checkAudioAssets(
          contentRoom,
          theme,
          assets,
          addIssue,
          addWarning,
        );
      }
    }
    checkContent(
      content,
      finalManifest,
      packManifest,
      addIssue,
      addWarning,
    );
  }

  return {
    ok: issues.length === 0,
    issues,
    warnings,
    ids,
    placeholders,
  };
}
