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
import {
  UI_MATERIAL_SLOTS,
  createMaterialCatalog,
  maskKey,
  resolveMaterialBinding,
  type MaterialCatalog,
  type MaterialsDocument,
  type PatternBinding,
  type PatternSpace,
  type TileMaterialRule,
  type TileVariantSet,
} from "../materials";
import {
  findGateRecoveryHazards,
  replaySolution,
  validatePuzzleDocument,
  type PuzzleDocument,
} from "../puzzle";
import {
  collectMaterialAssetIds,
  collectRoomAssetIds,
  collectRoomMaterialAssetIds,
  collectThemeAssetIds,
} from "./load";
import { buildMapping, mappingDrift } from "./mapping";
import type {
  DialogueDocument,
  LevelDocument,
  LevelFeedbackTileTarget,
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
  | "AUDIO_CUE_UNKNOWN"
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
  | "MAPPING_DRIFT"
  | "FEEDBACK_REFERENCE_MISSING"
  | "FEEDBACK_EFFECT_UNKNOWN"
  | "FEEDBACK_TILE_INVALID"
  | "FEEDBACK_LAYOUT_INVALID"
  | "FEEDBACK_VOCABULARY_MISSING"
  | "MATERIALS_SCHEMA_INVALID"
  | "MATERIAL_REFERENCE_MISSING"
  | "MATERIAL_PALETTE_INVALID"
  | "MATERIAL_PATTERN_INVALID"
  | "MATERIAL_VARIANT_INVALID"
  | "MATERIAL_DEFERRED"
  | "TILE_MATERIAL_INVALID"
  | "BACKGROUND_MATERIAL_INVALID"
  | "UI_MATERIAL_INVALID";

export interface PackIssue {
  code: PackIssueCode;
  id?: AssetId;
  message: string;
}

/**
 * Structural feedback vocabulary supplied by the caller. `pack` must not
 * import `feedback`; scripts and tests build this from the feedback module.
 */
export interface FeedbackValidationVocabulary {
  effectPresetIds: readonly string[];
  tilePathPreset: string;
  /** Conventional node-type socket names; the world uses `center` as fallback. */
  nodeEffectSockets?: Readonly<Record<string, string | undefined>>;
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
  /** Pack materials document for a single-room validation without full content. */
  materials?: MaterialsDocument;
  /** Required when content authors a feedback block. */
  feedbackVocabulary?: FeedbackValidationVocabulary;
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

    if (entry.type === "atlas") {
      if (!entry.regions || Object.keys(entry.regions).length === 0) {
        addIssue(
          "ASSET_MANIFEST_INVALID",
          `${label} atlas "${id}" has no regions`,
          id,
        );
      }
      if (
        entry.frameWidth !== undefined ||
        entry.frameHeight !== undefined ||
        entry.frames !== undefined ||
        entry.fps !== undefined ||
        entry.loop !== undefined
      ) {
        addIssue(
          "ASSET_MANIFEST_INVALID",
          `${label} atlas "${id}" carries animation metadata`,
          id,
        );
      }
      if (entry.width !== undefined && entry.height !== undefined) {
        for (const [name, region] of Object.entries(entry.regions ?? {})) {
          if (
            region.x < 0 ||
            region.y < 0 ||
            region.width <= 0 ||
            region.height <= 0 ||
            region.x + region.width > entry.width ||
            region.y + region.height > entry.height
          ) {
            addIssue(
              "ASSET_MANIFEST_INVALID",
              `${label} atlas "${id}" region "${name}" is outside ${entry.width}×${entry.height}`,
              id,
            );
          }
        }
      }
    } else if (entry.regions !== undefined) {
      addIssue(
        "ASSET_MANIFEST_INVALID",
        `${label} asset "${id}" declares regions but is not an atlas`,
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
      addIssue(
        "AUDIO_CUE_UNKNOWN",
        `theme.audio.cues.${key} is not a known cue name`,
      );
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

function checkFeedbackTileTarget(
  target: LevelFeedbackTileTarget,
  room: RoomDocument,
  label: string,
  addIssue: AddIssue,
): void {
  if (!Object.prototype.hasOwnProperty.call(room.layers, target.layer)) {
    addIssue(
      "FEEDBACK_TILE_INVALID",
      `${label}.layer "${target.layer}" is not authored on room "${room.id}"`,
    );
  }

  if (target.kind === "tile") {
    const outside =
      target.x < 0 ||
      target.y < 0 ||
      target.x >= room.width ||
      target.y >= room.height;
    if (outside) {
      addIssue(
        "FEEDBACK_TILE_INVALID",
        `${label} tile (${target.x}, ${target.y}) is outside room "${room.id}" (${room.width} × ${room.height})`,
      );
    }
    return;
  }

  if (target.x1 > target.x2 || target.y1 > target.y2) {
    addIssue(
      "FEEDBACK_TILE_INVALID",
      `${label} region must be ordered (x1 ≤ x2, y1 ≤ y2)`,
    );
  }
  const outside =
    target.x1 < 0 ||
    target.y1 < 0 ||
    target.x2 < 0 ||
    target.y2 < 0 ||
    target.x2 >= room.width ||
    target.y2 >= room.height;
  if (outside) {
    addIssue(
      "FEEDBACK_TILE_INVALID",
      `${label} region (${target.x1}, ${target.y1})–(${target.x2}, ${target.y2}) is outside room "${room.id}" (${room.width} × ${room.height})`,
    );
  }
}

function checkLevelFeedback(input: {
  level: LevelDocument;
  room: RoomDocument | undefined;
  puzzles: Record<string, PuzzleDocument>;
  vocabulary: FeedbackValidationVocabulary | undefined;
  addIssue: AddIssue;
  addWarning: AddWarning;
}): void {
  const { level, room, puzzles, vocabulary, addIssue, addWarning } = input;
  const feedbackPuzzles = level.feedback?.puzzles;
  if (!feedbackPuzzles) return;

  const authored = Object.values(feedbackPuzzles).some(
    (config) =>
      (config.beats?.length ?? 0) > 0 ||
      Object.keys(config.nodes ?? {}).length > 0,
  );
  if (!authored) return;

  if (!vocabulary) {
    addIssue(
      "FEEDBACK_VOCABULARY_MISSING",
      `level "${level.id}" authors feedback but validatePack received no feedbackVocabulary`,
    );
  }

  const levelPuzzleIds = new Set(level.puzzleIds ?? []);
  for (const [puzzleId, config] of Object.entries(feedbackPuzzles)) {
    const label = `level "${level.id}" feedback.puzzles.${puzzleId}`;
    if (!levelPuzzleIds.has(puzzleId)) {
      addIssue(
        "FEEDBACK_REFERENCE_MISSING",
        `${label} is not one of the level's authored puzzle IDs`,
      );
    }

    const puzzle = puzzles[puzzleId];
    if (!puzzle) {
      addIssue(
        "FEEDBACK_REFERENCE_MISSING",
        `${label} references missing puzzle "${puzzleId}"`,
      );
      continue;
    }

    const nodeIds = new Set(puzzle.nodes.map((node) => node.id));

    for (const [index, beat] of (config.beats ?? []).entries()) {
      for (const nodeId of beat.nodes) {
        if (!nodeIds.has(nodeId)) {
          addIssue(
            "FEEDBACK_REFERENCE_MISSING",
            `${label}.beats[${index}] ("${beat.id}") references missing node "${nodeId}"`,
          );
        }
      }
    }

    for (const [nodeId, override] of Object.entries(config.nodes ?? {})) {
      const nodeLabel = `${label}.nodes.${nodeId}`;
      if (!nodeIds.has(nodeId)) {
        addIssue(
          "FEEDBACK_REFERENCE_MISSING",
          `${nodeLabel} references missing node "${nodeId}"`,
        );
      }
      if (!override.label) {
        addWarning(
          `${nodeLabel} has no authored label; runtime falls back to the generated node label`,
        );
      }

      const effectPreset = override.effectPreset;
      const tilePath =
        effectPreset !== undefined &&
        vocabulary !== undefined &&
        effectPreset === vocabulary.tilePathPreset;
      if (
        effectPreset !== undefined &&
        vocabulary !== undefined &&
        !vocabulary.effectPresetIds.includes(effectPreset)
      ) {
        addIssue(
          "FEEDBACK_EFFECT_UNKNOWN",
          `${nodeLabel}.effectPreset "${effectPreset}" is not a known effect preset`,
        );
      }
      if (tilePath && !override.tileTarget) {
        addIssue(
          "FEEDBACK_LAYOUT_INVALID",
          `${nodeLabel} uses tile-path preset "${effectPreset}" without a tileTarget`,
        );
      } else if (override.tileTarget && !tilePath) {
        addWarning(
          `${nodeLabel} has a tileTarget but does not use the tile-path preset; the target is ignored`,
        );
      }

      if (override.tileTarget && room) {
        checkFeedbackTileTarget(
          override.tileTarget,
          room,
          `${nodeLabel}.tileTarget`,
          addIssue,
        );
      }
    }

    if (room && vocabulary?.nodeEffectSockets) {
      for (const node of puzzle.nodes) {
        if (!node.entityId) continue;
        const socket = vocabulary.nodeEffectSockets[node.type];
        if (!socket || socket === "center") continue;
        const entity = (room.entities ?? []).find(
          (item) => item.id === node.entityId,
        );
        if (!entity) continue;
        if (!entity.components?.anchors?.[socket]) {
          addWarning(
            `puzzle "${puzzle.id}" node "${node.id}" conventionally emits from socket "${socket}" but entity "${entity.id}" does not author it; the centre fallback is used`,
          );
        }
      }
    }
  }
}

function paletteTokenExists(
  theme: ThemeDocument,
  token: string,
): boolean {
  return Object.prototype.hasOwnProperty.call(theme.palette, token);
}

function checkFrameRef(
  ref: { assetId: AssetId; frame?: string },
  assets: ReturnType<typeof createAssets>,
  label: string,
  addIssue: AddIssue,
): void {
  if (!assets.resolveById(ref.assetId)) {
    addIssue(
      "MATERIAL_VARIANT_INVALID",
      `${label} references unknown asset "${ref.assetId}"`,
      ref.assetId,
    );
    return;
  }
  if (ref.frame !== undefined) {
    if (!assets.resolveFrame({ kind: "atlas", assetId: ref.assetId, frame: ref.frame })) {
      addIssue(
        "MATERIAL_VARIANT_INVALID",
        `${label} references missing atlas frame "${ref.assetId}#${ref.frame}"`,
        ref.assetId,
      );
    }
  } else if (!assets.resolveFrame({ kind: "asset", assetId: ref.assetId })) {
    addIssue(
      "MATERIAL_VARIANT_INVALID",
      `${label} does not resolve to a frame`,
      ref.assetId,
    );
  }
}

function checkPatternBinding(
  binding: PatternBinding,
  label: string,
  catalog: MaterialCatalog,
  allowedSpaces: readonly PatternSpace[],
  addIssue: AddIssue,
  addWarning: AddWarning,
): void {
  const pattern = catalog.patterns[binding.patternId];
  if (!pattern) {
    addIssue(
      "MATERIAL_PATTERN_INVALID",
      `${label} references unknown pattern "${binding.patternId}"`,
    );
    return;
  }
  const space = binding.space ?? pattern.space;
  if (!allowedSpaces.includes(space)) {
    addIssue(
      "MATERIAL_PATTERN_INVALID",
      `${label} uses ${space} space; expected ${allowedSpaces.join(", ")}`,
    );
  }
  if (binding.scale !== undefined && !(binding.scale > 0)) {
    addIssue("MATERIAL_PATTERN_INVALID", `${label}.scale must be positive`);
  }
  if (
    binding.opacity !== undefined &&
    (binding.opacity < 0 || binding.opacity > 1)
  ) {
    addIssue("MATERIAL_PATTERN_INVALID", `${label}.opacity must be 0..1`);
  }
  if (pattern.animation) {
    addWarning(
      `${label} declares pattern animation; M1.8 renders the static frame`,
    );
  }
}

function checkPatternDefinition(
  patternId: string,
  catalog: MaterialCatalog,
  assets: ReturnType<typeof createAssets>,
  addIssue: AddIssue,
  addWarning: AddWarning,
): void {
  const pattern = catalog.patterns[patternId];
  if (!pattern) {
    addIssue(
      "MATERIAL_PATTERN_INVALID",
      `pattern "${patternId}" is not defined`,
    );
    return;
  }
  if (!(pattern.scale > 0)) {
    addIssue("MATERIAL_PATTERN_INVALID", `pattern "${patternId}" scale must be positive`);
  }
  if (pattern.source.kind === "image" || pattern.source.kind === "atlas") {
    const asset = assets.resolveById(pattern.source.assetId);
    if (!asset) {
      addIssue(
        "MATERIAL_PATTERN_INVALID",
        `pattern "${patternId}" source "${pattern.source.assetId}" does not resolve`,
        pattern.source.assetId,
      );
    } else if (pattern.source.kind === "image") {
      if (asset.type === "audio" || asset.type === "font") {
        addIssue(
          "MATERIAL_PATTERN_INVALID",
          `pattern "${patternId}" image source "${pattern.source.assetId}" is not visual`,
          pattern.source.assetId,
        );
      }
    } else if (asset.type !== "atlas") {
      addIssue(
        "MATERIAL_PATTERN_INVALID",
        `pattern "${patternId}" atlas source "${pattern.source.assetId}" is not an atlas`,
        pattern.source.assetId,
      );
    } else if (
      !assets.resolveFrame({
        kind: "atlas",
        assetId: pattern.source.assetId,
        frame: pattern.source.frame,
      })
    ) {
      addIssue(
        "MATERIAL_PATTERN_INVALID",
        `pattern "${patternId}" source frame "${pattern.source.assetId}#${pattern.source.frame}" does not resolve`,
        pattern.source.assetId,
      );
    }
  }
  if (pattern.animation) {
    addWarning(
      `pattern "${patternId}" declares animation; M1.8 renders the static frame`,
    );
  }
}

function checkVariantSet(
  setId: string,
  set: TileVariantSet,
  catalog: MaterialCatalog,
  assets: ReturnType<typeof createAssets>,
  addIssue: AddIssue,
  addWarning: AddWarning,
): void {
  const material = catalog.materials[set.materialId];
  if (!material) {
    addIssue(
      "MATERIAL_VARIANT_INVALID",
      `variant set "${setId}" references unknown material "${set.materialId}"`,
    );
  }
  if (set.rule === "wang") {
    addIssue(
      "MATERIAL_DEFERRED",
      `variant set "${setId}" uses wang transitions, deferred in M1.8`,
    );
  }
  const allowedKeys = new Set<string>();
  if (set.rule === "edge") {
    for (let mask = 0; mask < 16; mask += 1) allowedKeys.add(String(mask));
  } else {
    for (let mask = 0; mask < 256; mask += 1) {
      allowedKeys.add(maskKey({ autotile: set.rule }, mask));
    }
  }
  for (const [key, ref] of Object.entries(set.frames)) {
    if (!allowedKeys.has(key)) {
      addIssue(
        "MATERIAL_VARIANT_INVALID",
        `variant set "${setId}" frame key "${key}" is outside the ${set.rule} mask space`,
      );
    }
    checkFrameRef(ref, assets, `variant set "${setId}" frame "${key}"`, addIssue);
  }
  checkFrameRef(set.fallback, assets, `variant set "${setId}" fallback`, addIssue);
  if (set.atlas) {
    const atlas = assets.resolveById(set.atlas);
    if (!atlas || atlas.type !== "atlas") {
      addIssue(
        "MATERIAL_VARIANT_INVALID",
        `variant set "${setId}" atlas "${set.atlas}" is not an atlas asset`,
        set.atlas,
      );
    }
  }
  if (material?.variantSet && material.variantSet !== setId) {
    addWarning(
      `material "${material.id}" also references variant set "${material.variantSet}"; "${setId}" is still validated`,
    );
  }
}

function checkTileMaterialRule(
  rule: TileMaterialRule,
  label: string,
  catalog: MaterialCatalog,
  theme: ThemeDocument,
  assets: ReturnType<typeof createAssets>,
  addIssue: AddIssue,
): void {
  const material = catalog.materials[rule.materialId];
  if (!material) {
    addIssue(
      "MATERIAL_REFERENCE_MISSING",
      `${label} references unknown material "${rule.materialId}"`,
    );
    return;
  }
  if (rule.autotile === "wang") {
    addIssue("MATERIAL_DEFERRED", `${label} uses wang transitions, deferred in M1.8`);
  }
  if (rule.variantSet) {
    const set = catalog.variantSets[rule.variantSet];
    if (!set) {
      addIssue(
        "MATERIAL_VARIANT_INVALID",
        `${label} references unknown variant set "${rule.variantSet}"`,
      );
    } else {
      if (set.materialId !== rule.materialId) {
        addIssue(
          "MATERIAL_VARIANT_INVALID",
          `${label} variant set "${set.id}" belongs to material "${set.materialId}", not "${rule.materialId}"`,
        );
      }
      if (set.rule !== rule.autotile) {
        addIssue(
          "MATERIAL_VARIANT_INVALID",
          `${label} autotile "${rule.autotile}" does not match variant set rule "${set.rule}"`,
        );
      }
    }
  }
  const effectiveSetId = rule.variantSet ?? material.variantSet;
  if (effectiveSetId && !catalog.variantSets[effectiveSetId]) {
    addIssue(
      "MATERIAL_VARIANT_INVALID",
      `${label} material "${material.id}" references unknown variant set "${effectiveSetId}"`,
    );
  } else if (effectiveSetId) {
    const effectiveSet = catalog.variantSets[effectiveSetId];
    if (effectiveSet && effectiveSet.rule !== rule.autotile) {
      addIssue(
        "MATERIAL_VARIANT_INVALID",
        `${label} autotile "${rule.autotile}" does not match material variant set rule "${effectiveSet.rule}"`,
      );
    }
  }
  for (const [index, ref] of (rule.variants ?? []).entries()) {
    checkFrameRef(ref, assets, `${label}.variants[${index}]`, addIssue);
  }
  if (rule.patternId && !catalog.patterns[rule.patternId]) {
    addIssue(
      "MATERIAL_PATTERN_INVALID",
      `${label} references unknown pattern "${rule.patternId}"`,
    );
  }
  if (rule.tint) {
    if (!paletteTokenExists(theme, rule.tint)) {
      addIssue(
        "MATERIAL_PALETTE_INVALID",
        `${label} uses unknown tint token "${rule.tint}"`,
      );
    }
  }
}

function checkRoomMaterials(
  room: RoomDocument,
  catalog: MaterialCatalog,
  theme: ThemeDocument,
  assets: ReturnType<typeof createAssets>,
  addIssue: AddIssue,
  addWarning: AddWarning,
): void {
  const hasTileData =
    room.tileMaterials !== undefined ||
    room.tileMaterialLegend !== undefined ||
    room.defaultMaterialId !== undefined;
  const hasEntityData = (room.entities ?? []).some(
    (entity) => entity.components?.material !== undefined,
  );
  const hasBackgroundData = room.background.layers.some(
    (layer) => layer.materialId !== undefined || layer.pattern !== undefined,
  );
  if (!hasTileData && !hasEntityData && !hasBackgroundData) {
    return;
  }

  if (room.tileMaterials) {
    if (room.tileMaterials.length !== room.height) {
      addIssue(
        "TILE_MATERIAL_INVALID",
        `room "${room.id}" tileMaterials row count does not match height`,
      );
    }
    for (const [rowIndex, row] of room.tileMaterials.entries()) {
      if (row.length !== room.width) {
        addIssue(
          "TILE_MATERIAL_INVALID",
          `room "${room.id}" tileMaterials row ${rowIndex} does not match width`,
        );
      }
    }
  }

  const legend = room.tileMaterialLegend ?? {};
  for (const [character, rule] of Object.entries(legend)) {
    if (character.length !== 1 || character === " ") {
      addIssue(
        "TILE_MATERIAL_INVALID",
        `room "${room.id}" legend key "${character}" must be one non-space character`,
      );
    }
    checkTileMaterialRule(
      rule,
      `room "${room.id}" legend "${character}"`,
      catalog,
      theme,
      assets,
      addIssue,
    );
  }

  if (room.defaultMaterialId && !catalog.materials[room.defaultMaterialId]) {
    addIssue(
      "MATERIAL_REFERENCE_MISSING",
      `room "${room.id}" defaultMaterialId "${room.defaultMaterialId}" does not resolve`,
    );
  }

  if (room.materialSeed !== undefined && !Number.isInteger(room.materialSeed)) {
    addIssue(
      "TILE_MATERIAL_INVALID",
      `room "${room.id}" materialSeed must be an integer`,
    );
  }

  let decorative = 0;
  if (room.tileMaterials) {
    const hasNonSpace = room.tileMaterials.some((row) =>
      [...row].some((character) => character !== " "),
    );
    if (hasNonSpace && Object.keys(legend).length === 0) {
      addIssue(
        "TILE_MATERIAL_INVALID",
        `room "${room.id}" has tileMaterials but no tileMaterialLegend`,
      );
    }
    for (const [y, row] of room.tileMaterials.entries()) {
      for (const [x, character] of [...row].entries()) {
        if (character === " ") continue;
        if (!legend[character]) {
          addIssue(
            "TILE_MATERIAL_INVALID",
            `room "${room.id}" tileMaterials uses unknown legend character "${character}" at (${x}, ${y})`,
          );
        }
        if (room.layers.tiles[y]?.[x] !== "#") {
          decorative += 1;
        }
      }
    }
  }
  if (decorative > 0) {
    addWarning(
      `room "${room.id}" has ${decorative} decorative material cell${decorative === 1 ? "" : "s"} on empty collision cells; they remain passable`,
    );
  }

  for (const entity of room.entities ?? []) {
    const binding = entity.components?.material;
    if (!binding) continue;
    const resolved = resolveMaterialBinding(catalog, binding);
    if (!resolved.ok) {
      addIssue(
        "MATERIAL_REFERENCE_MISSING",
        `room "${room.id}" entity "${entity.id}": ${resolved.error}`,
      );
      continue;
    }
    for (const warning of resolved.value.warnings) addWarning(warning);
    if (resolved.value.pattern) {
      const space = resolved.value.pattern.space;
      if (space === "screen") {
        addIssue(
          "MATERIAL_PATTERN_INVALID",
          `room "${room.id}" entity "${entity.id}" uses screen-space pattern; use world or local`,
        );
      }
      if (resolved.value.pattern.opacity > 0.5) {
        addWarning(
          `room "${room.id}" entity "${entity.id}" pattern opacity ${resolved.value.pattern.opacity} is high for readability`,
        );
      }
    }
    if (
      resolved.value.tint &&
      !paletteTokenExists(theme, resolved.value.tint)
    ) {
      addIssue(
        "MATERIAL_PALETTE_INVALID",
        `room "${room.id}" entity "${entity.id}" uses unknown tint token "${resolved.value.tint}"`,
      );
    }
  }

  for (const [index, layer] of room.background.layers.entries()) {
    if (layer.materialId && !catalog.materials[layer.materialId]) {
      addIssue(
        "BACKGROUND_MATERIAL_INVALID",
        `room "${room.id}" background.layers[${index}] references unknown material "${layer.materialId}"`,
      );
    }
    if (layer.pattern) {
      if (!layer.materialId) {
        addIssue(
          "BACKGROUND_MATERIAL_INVALID",
          `room "${room.id}" background.layers[${index}] has a pattern but no materialId`,
        );
      }
      checkPatternBinding(
        layer.pattern,
        `room "${room.id}" background.layers[${index}].pattern`,
        catalog,
        ["world", "screen", "local"],
        addIssue,
        addWarning,
      );
      if (
        layer.pattern.opacity !== undefined &&
        layer.pattern.opacity > 0.35
      ) {
        addWarning(
          `room "${room.id}" background.layers[${index}] pattern opacity ${layer.pattern.opacity} exceeds the background readability cap of 0.35`,
        );
      }
    }
  }
}

function checkThemeMaterials(
  theme: ThemeDocument,
  catalog: MaterialCatalog,
  assets: ReturnType<typeof createAssets>,
  addIssue: AddIssue,
  addWarning: AddWarning,
): void {
  for (const [materialId, material] of Object.entries(catalog.materials)) {
    for (const token of [...material.palette, ...(material.tint ? [material.tint] : [])]) {
      if (!paletteTokenExists(theme, token)) {
        addIssue(
          "MATERIAL_PALETTE_INVALID",
          `material "${materialId}" uses unknown palette token "${token}"`,
        );
      }
    }
    if (material.patternId && !catalog.patterns[material.patternId]) {
      addIssue(
        "MATERIAL_PATTERN_INVALID",
        `material "${materialId}" references unknown pattern "${material.patternId}"`,
      );
    }
    if (material.autotile === "wang") {
      addIssue(
        "MATERIAL_DEFERRED",
        `material "${materialId}" uses wang autotiling, deferred in M1.8`,
      );
    }
    if (material.variantSet) {
      const set = catalog.variantSets[material.variantSet];
      if (!set) {
        addIssue(
          "MATERIAL_VARIANT_INVALID",
          `material "${materialId}" references unknown variant set "${material.variantSet}"`,
        );
      } else if (set.materialId !== materialId) {
        addIssue(
          "MATERIAL_VARIANT_INVALID",
          `material "${materialId}" references variant set "${set.id}" for "${set.materialId}"`,
        );
      }
    }
    if (material.variantSet && material.variants?.length) {
      addWarning(
        `material "${materialId}" has both variantSet and inline variants; variantSet wins`,
      );
    }
    for (const [index, ref] of (material.variants ?? []).entries()) {
      checkFrameRef(
        ref,
        assets,
        `material "${materialId}" variants[${index}]`,
        addIssue,
      );
    }
  }

  const materials = theme.ui.materials ?? {};
  const patterns = theme.ui.patterns ?? {};
  for (const [slot, materialId] of Object.entries(materials)) {
    if (!UI_MATERIAL_SLOTS.includes(slot as (typeof UI_MATERIAL_SLOTS)[number])) {
      addIssue(
        "UI_MATERIAL_INVALID",
        `theme.ui.materials.${slot} is not a supported slot`,
      );
    }
    if (!catalog.materials[materialId]) {
      addIssue(
        "UI_MATERIAL_INVALID",
        `theme.ui.materials.${slot} references unknown material "${materialId}"`,
      );
    }
  }
  for (const [slot, binding] of Object.entries(patterns)) {
    if (!UI_MATERIAL_SLOTS.includes(slot as (typeof UI_MATERIAL_SLOTS)[number])) {
      addIssue(
        "UI_MATERIAL_INVALID",
        `theme.ui.patterns.${slot} is not a supported slot`,
      );
    }
    checkPatternBinding(
      binding,
      `theme.ui.patterns.${slot}`,
      catalog,
      ["screen", "local"],
      addIssue,
      addWarning,
    );
    const pattern = catalog.patterns[binding.patternId];
    if (pattern && pattern.source.kind !== "procedural") {
      addIssue(
        "UI_MATERIAL_INVALID",
        `theme.ui.patterns.${slot} uses a ${pattern.source.kind} source; M1.8 UI patterns must be procedural`,
      );
    }
    if (binding.opacity !== undefined && binding.opacity > 0.35) {
      addWarning(
        `theme.ui.patterns.${slot} opacity ${binding.opacity} exceeds the UI readability cap of 0.35`,
      );
    }
  }
}

function checkMaterials(input: {
  materials: MaterialsDocument | undefined;
  rooms: readonly RoomDocument[];
  theme: ThemeDocument;
  assets: ReturnType<typeof createAssets>;
  addIssue: AddIssue;
  addWarning: AddWarning;
}): void {
  const { materials, rooms, theme, assets, addIssue, addWarning } = input;
  const hasReferences =
    (theme.ui.materials && Object.keys(theme.ui.materials).length > 0) ||
    (theme.ui.patterns && Object.keys(theme.ui.patterns).length > 0) ||
    rooms.some(
      (room) =>
        room.tileMaterials !== undefined ||
        room.tileMaterialLegend !== undefined ||
        room.defaultMaterialId !== undefined ||
        room.background.layers.some(
          (layer) => layer.materialId !== undefined || layer.pattern !== undefined,
        ) ||
        (room.entities ?? []).some(
          (entity) => entity.components?.material !== undefined,
        ),
    );

  if (!materials) {
    if (hasReferences) {
      addIssue(
        "MATERIALS_SCHEMA_INVALID",
        "content references materials but the pack declares no materials document",
      );
    }
    return;
  }

  const catalog = createMaterialCatalog(materials);
  for (const patternId of Object.keys(catalog.patterns)) {
    checkPatternDefinition(patternId, catalog, assets, addIssue, addWarning);
  }
  for (const [setId, set] of Object.entries(catalog.variantSets)) {
    checkVariantSet(setId, set, catalog, assets, addIssue, addWarning);
  }
  checkThemeMaterials(theme, catalog, assets, addIssue, addWarning);
  const seen = new Set<string>();
  for (const room of rooms) {
    if (seen.has(room.id)) continue;
    seen.add(room.id);
    checkRoomMaterials(room, catalog, theme, assets, addIssue, addWarning);
  }
}

function checkContent(
  content: PackContent,
  finalManifest: AssetManifest | null | undefined,
  packManifest: AssetManifest | null | undefined,
  feedbackVocabulary: FeedbackValidationVocabulary | undefined,
  addIssue: AddIssue,
  addWarning: AddWarning,
): void {
  const { pack, syllabus, mapping, levels, rooms, dialogues, gates, puzzles } = content;
  const levelIds = new Set(pack.levels);
  const levelById = new Map(levels.map((level) => [level.id, level]));
  const mapNodeIds = new Set(levels.map((level) => level.map.nodeId));

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

      if (puzzle.hints.length === 0) {
        addWarning(
          `puzzle "${puzzle.id}" has no hints; the stuck affordance cannot offer one`,
        );
      }

      const validation = validatePuzzleDocument(puzzle, {
        entityPoints: Object.fromEntries(
          (room?.entities ?? []).map((entity) => [
            entity.id,
            {
              x: (entity.x + 0.5) * (room?.tileSize ?? 32),
              y: entity.y * (room?.tileSize ?? 32) -
                (room?.tileSize ?? 32) / 2,
            },
          ]),
        ),
        viewport: { width: 1280, height: 720 },
      });
      for (const issue of validation.issues) {
        addIssue("PUZZLE_INVALID", `${puzzle.id}: ${issue.message}`);
      }
      for (const hazard of findGateRecoveryHazards(puzzle)) {
        addWarning(`puzzle "${puzzle.id}": ${hazard}`);
      }
      if (puzzle.activation.mode === "interact" && puzzle.activation.entityId) {
        const roomEntities = room?.entities ?? [];
        if (
          !roomEntities.some(
            (entity) => entity.id === puzzle.activation.entityId,
          )
        ) {
          addIssue(
            "PUZZLE_REFERENCE_MISSING",
            `puzzle "${puzzle.id}" interact activation references missing entity "${puzzle.activation.entityId}"`,
          );
        }
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

    checkLevelFeedback({
      level,
      room,
      puzzles,
      vocabulary: feedbackVocabulary,
      addIssue,
      addWarning,
    });

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
      if (!mapNodeIds.has(edge.to)) {
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
  const materials = content?.materials ?? input.materials;
  const materialRooms = content ? Object.values(content.rooms) : [room];
  const assets = createAssets({
    finalManifest: finalManifest ?? null,
    packManifest: packManifest ?? null,
    logger: silentLogger,
  });

  const ids = [
    ...new Set([
      ...collectRoomAssetIds(room),
      ...collectRoomMaterialAssetIds(room),
      ...collectThemeAssetIds(theme),
      ...collectMaterialAssetIds(materials),
      ...Object.values(PLAYER_ASSET_IDS),
      ...(content
        ? Object.values(content.rooms).flatMap(collectRoomAssetIds)
        : []),
      ...(content
        ? Object.values(content.rooms).flatMap(collectRoomMaterialAssetIds)
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
  checkAudioAssets(room, theme, assets, addIssue);
  checkMaterials({
    materials,
    rooms: materialRooms,
    theme,
    assets,
    addIssue,
    addWarning,
  });

  if (content) {
    if (content.pack.materials && !content.materials) {
      addIssue(
        "MATERIALS_SCHEMA_INVALID",
        `pack declares materials "${content.pack.materials}" but it did not load`,
      );
    }
    for (const contentRoom of Object.values(content.rooms)) {
      if (contentRoom.id !== room.id) {
        checkBackground(contentRoom, assets, addIssue);
        checkAudioAssets(contentRoom, theme, assets, addIssue);
      }
    }
    checkContent(
      content,
      finalManifest,
      packManifest,
      input.feedbackVocabulary,
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
