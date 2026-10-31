import { isLearningEventType } from "../core/learning-events";
import { err, ok, type Result } from "../core/result";
import {
  isRecord,
  isSchemaVersionSupported,
  parseJsonUrl,
  readBoolean,
  readInteger,
  readNonEmptyString,
  readNumber,
  readOptionalString,
  readOptionalStringArray,
  readScalarRecord,
  readStringArray,
  type UnknownRecord,
} from "./parse-common";
import type {
  ConceptMapping,
  DialogueChoice,
  DialogueCondition,
  DialogueDocument,
  DialogueEffect,
  DialogueNode,
  GateDocument,
  GateEffect,
  GatePuzzle,
  GateType,
  LevelDocument,
  LevelEvidenceRule,
  LevelFeedback,
  LevelFeedbackBeat,
  LevelFeedbackNodeOverride,
  LevelFeedbackPuzzle,
  LevelFeedbackTileTarget,
  LevelMapEdge,
  LevelUnlock,
  LevelUnlockType,
  LicenceDocument,
  LicenceEntry,
  MapEdgeType,
  MappingDocument,
  ObjectiveMapping,
  PackDocument,
  RecordEvidenceEffect,
  RoomPropertyValue,
} from "./types";

const PACK_CODE = "PACK_SCHEMA_INVALID";
const LEVEL_CODE = "LEVEL_SCHEMA_INVALID";
const DIALOGUE_CODE = "DIALOGUE_SCHEMA_INVALID";
const GATE_CODE = "GATE_SCHEMA_INVALID";
const MAPPING_CODE = "MAPPING_SCHEMA_INVALID";
const LICENCE_CODE = "LICENCES_SCHEMA_INVALID";

const MAP_EDGE_TYPES: readonly MapEdgeType[] = [
  "door",
  "gate",
  "shortcut",
  "secret",
];
const GATE_TYPES: readonly GateType[] = ["ability", "concept", "flag"];
const UNLOCK_TYPES: readonly LevelUnlockType[] = [
  "ability",
  "flag",
  "map",
  "item",
];
const LEVEL_STATUSES = ["draft", "validated", "playtested", "done"] as const;

function readRecordStringMap(
  value: unknown,
  code: string,
  label: string,
): Result<Record<string, string>> {
  if (!isRecord(value)) {
    return err(`${code}: ${label} must be an object`);
  }
  const result: Record<string, string> = {};
  for (const [key, entry] of Object.entries(value)) {
    if (typeof entry !== "string" || entry.trim() === "") {
      return err(`${code}: ${label}.${key} must be a non-empty string`);
    }
    result[key] = entry;
  }
  return ok(result);
}

/* ------------------------------------------------------------------ */
/* Pack                                                                */
/* ------------------------------------------------------------------ */

export function parsePack(value: unknown): Result<PackDocument> {
  if (!isRecord(value)) {
    return err(`${PACK_CODE}: pack must be an object`);
  }
  if (!isSchemaVersionSupported(value.schemaVersion)) {
    return err(
      `PACK_SCHEMA_VERSION: expected 1.x, got ${String(value.schemaVersion)}`,
    );
  }

  const id = readNonEmptyString(value, "id", PACK_CODE);
  if (!id.ok) return err(id.error);
  const title = readNonEmptyString(value, "title", PACK_CODE);
  if (!title.ok) return err(title.error);
  const domain = readNonEmptyString(value, "domain", PACK_CODE);
  if (!domain.ok) return err(domain.error);
  const version = readNonEmptyString(value, "version", PACK_CODE);
  if (!version.ok) return err(version.error);
  const syllabusId = readNonEmptyString(value, "syllabusId", PACK_CODE);
  if (!syllabusId.ok) return err(syllabusId.error);
  const startLevelId = readNonEmptyString(value, "startLevelId", PACK_CODE);
  if (!startLevelId.ok) return err(startLevelId.error);
  const endLevelId = readNonEmptyString(value, "endLevelId", PACK_CODE);
  if (!endLevelId.ok) return err(endLevelId.error);
  const levels = readStringArray(value, "levels", PACK_CODE);
  if (!levels.ok) return err(levels.error);

  if (!levels.value.includes(startLevelId.value)) {
    return err(`${PACK_CODE}: startLevelId "${startLevelId.value}" is not in levels`);
  }
  if (!levels.value.includes(endLevelId.value)) {
    return err(`${PACK_CODE}: endLevelId "${endLevelId.value}" is not in levels`);
  }
  if (new Set(levels.value).size !== levels.value.length) {
    return err("PACK_DUPLICATE_ID: levels contains a duplicate level ID");
  }

  const theme = readNonEmptyString(value, "theme", PACK_CODE);
  if (!theme.ok) return err(theme.error);
  const mapping = readNonEmptyString(value, "mapping", PACK_CODE);
  if (!mapping.ok) return err(mapping.error);
  const licenses = readNonEmptyString(value, "licenses", PACK_CODE);
  if (!licenses.ok) return err(licenses.error);
  const materials = readOptionalString(value, "materials", PACK_CODE);
  if (!materials.ok) return err(materials.error);

  if (!isRecord(value.assetManifests)) {
    return err(`${PACK_CODE}: assetManifests must be an object`);
  }
  const placeholder = readOptionalString(
    value.assetManifests,
    "placeholder",
    PACK_CODE,
    "assetManifests.placeholder",
  );
  if (!placeholder.ok) return err(placeholder.error);
  const final = readOptionalString(
    value.assetManifests,
    "final",
    PACK_CODE,
    "assetManifests.final",
  );
  if (!final.ok) return err(final.error);

  let assets: PackDocument["assets"];
  if (value.assets !== undefined) {
    if (!isRecord(value.assets)) {
      return err(`${PACK_CODE}: assets must be an object`);
    }
    const tilesets = readStringArray(value.assets, "tilesets", PACK_CODE, "assets.tilesets", {
      allowEmpty: true,
    });
    if (!tilesets.ok) return err(tilesets.error);
    const sprites = readStringArray(value.assets, "sprites", PACK_CODE, "assets.sprites", {
      allowEmpty: true,
    });
    if (!sprites.ok) return err(sprites.error);
    const audio = readStringArray(value.assets, "audio", PACK_CODE, "assets.audio", {
      allowEmpty: true,
    });
    if (!audio.ok) return err(audio.error);
    assets = {
      tilesets: tilesets.value,
      sprites: sprites.value,
      audio: audio.value,
    };
  }

  const ageRating = readOptionalString(value, "ageRating", PACK_CODE);
  if (!ageRating.ok) return err(ageRating.error);
  const description = readOptionalString(value, "description", PACK_CODE);
  if (!description.ok) return err(description.error);
  if (value.metadata !== undefined && !isRecord(value.metadata)) {
    return err(`${PACK_CODE}: metadata must be an object`);
  }

  return ok({
    schemaVersion: value.schemaVersion,
    id: id.value,
    title: title.value,
    domain: domain.value,
    version: version.value,
    syllabusId: syllabusId.value,
    startLevelId: startLevelId.value,
    endLevelId: endLevelId.value,
    levels: levels.value,
    theme: theme.value,
    mapping: mapping.value,
    licenses: licenses.value,
    ...(materials.value ? { materials: materials.value } : {}),
    assetManifests: {
      ...(placeholder.value ? { placeholder: placeholder.value } : {}),
      ...(final.value ? { final: final.value } : {}),
    },
    ...(assets ? { assets } : {}),
    ...(ageRating.value ? { ageRating: ageRating.value } : {}),
    ...(description.value ? { description: description.value } : {}),
    ...(isRecord(value.metadata) ? { metadata: { ...value.metadata } } : {}),
  });
}

/* ------------------------------------------------------------------ */
/* Level                                                               */
/* ------------------------------------------------------------------ */

function parseMapEdge(
  value: unknown,
  index: number,
): Result<LevelMapEdge> {
  if (!isRecord(value)) {
    return err(`${LEVEL_CODE}: map.edges[${index}] must be an object`);
  }
  const to = readNonEmptyString(value, "to", LEVEL_CODE, `map.edges[${index}].to`);
  if (!to.ok) return err(to.error);
  const type = readNonEmptyString(value, "type", LEVEL_CODE, `map.edges[${index}].type`);
  if (!type.ok) return err(type.error);
  if (!MAP_EDGE_TYPES.includes(type.value as MapEdgeType)) {
    return err(`${LEVEL_CODE}: map.edges[${index}].type "${type.value}" is not supported`);
  }
  const edge: LevelMapEdge = { to: to.value, type: type.value as MapEdgeType };
  if (value.gateId !== undefined) {
    const gateId = readNonEmptyString(value, "gateId", LEVEL_CODE, `map.edges[${index}].gateId`);
    if (!gateId.ok) return err(gateId.error);
    edge.gateId = gateId.value;
  }
  if (value.puzzleId !== undefined) {
    const puzzleId = readNonEmptyString(value, "puzzleId", LEVEL_CODE, `map.edges[${index}].puzzleId`);
    if (!puzzleId.ok) return err(puzzleId.error);
    edge.puzzleId = puzzleId.value;
  }
  return ok(edge);
}

function parseLevelEvidence(
  value: unknown,
  index: number,
): Result<LevelEvidenceRule> {
  if (!isRecord(value)) {
    return err(`${LEVEL_CODE}: evidence[${index}] must be an object`);
  }
  const objectiveId = readNonEmptyString(value, "objectiveId", LEVEL_CODE, `evidence[${index}].objectiveId`);
  if (!objectiveId.ok) return err(objectiveId.error);
  const event = readNonEmptyString(value, "event", LEVEL_CODE, `evidence[${index}].event`);
  if (!event.ok) return err(event.error);
  if (!isLearningEventType(event.value)) {
    return err(`${LEVEL_CODE}: evidence[${index}].event "${event.value}" is not a learning event`);
  }
  const filter = readScalarRecord(value.filter, LEVEL_CODE, `evidence[${index}].filter`);
  if (!filter.ok) return err(filter.error);
  const required = value.required === undefined
    ? ok(true)
    : readBoolean(value, "required", LEVEL_CODE, `evidence[${index}].required`);
  if (!required.ok) return err(required.error);
  return ok({
    objectiveId: objectiveId.value,
    event: event.value,
    filter: filter.value,
    required: required.value,
  });
}

function parseLevelUnlock(
  value: unknown,
  index: number,
): Result<LevelUnlock> {
  if (!isRecord(value)) {
    return err(`${LEVEL_CODE}: unlocks[${index}] must be an object`);
  }
  const type = readNonEmptyString(value, "type", LEVEL_CODE, `unlocks[${index}].type`);
  if (!type.ok) return err(type.error);
  if (!UNLOCK_TYPES.includes(type.value as LevelUnlockType)) {
    return err(`${LEVEL_CODE}: unlocks[${index}].type "${type.value}" is not supported`);
  }
  const id = readNonEmptyString(value, "id", LEVEL_CODE, `unlocks[${index}].id`);
  if (!id.ok) return err(id.error);
  return ok({ type: type.value as LevelUnlockType, id: id.value });
}

function rejectUnknownKeys(
  value: UnknownRecord,
  allowed: readonly string[],
  code: string,
  label: string,
): Result<undefined> {
  const allowedKeys = new Set(allowed);
  for (const key of Object.keys(value)) {
    if (!allowedKeys.has(key)) {
      return err(`${code}: ${label}.${key} is not supported`);
    }
  }
  return ok(undefined);
}

function parseFeedbackTileTarget(
  value: unknown,
  label: string,
): Result<LevelFeedbackTileTarget> {
  if (!isRecord(value)) {
    return err(`${LEVEL_CODE}: ${label} must be an object`);
  }
  const kind = readNonEmptyString(value, "kind", LEVEL_CODE, `${label}.kind`);
  if (!kind.ok) return err(kind.error);
  if (kind.value !== "tile" && kind.value !== "tileRegion") {
    return err(`${LEVEL_CODE}: ${label}.kind "${kind.value}" is not supported`);
  }
  const allowed =
    kind.value === "tile"
      ? ["kind", "layer", "x", "y"]
      : ["kind", "layer", "x1", "y1", "x2", "y2"];
  const keys = rejectUnknownKeys(value, allowed, LEVEL_CODE, label);
  if (!keys.ok) return err(keys.error);
  const layer = readNonEmptyString(value, "layer", LEVEL_CODE, `${label}.layer`);
  if (!layer.ok) return err(layer.error);

  if (kind.value === "tile") {
    const x = readInteger(value, "x", LEVEL_CODE, `${label}.x`);
    if (!x.ok) return err(x.error);
    const y = readInteger(value, "y", LEVEL_CODE, `${label}.y`);
    if (!y.ok) return err(y.error);
    if (x.value < 0 || y.value < 0) {
      return err(`${LEVEL_CODE}: ${label} coordinates must be non-negative`);
    }
    return ok({ kind: "tile", layer: layer.value, x: x.value, y: y.value });
  }

  const x1 = readInteger(value, "x1", LEVEL_CODE, `${label}.x1`);
  if (!x1.ok) return err(x1.error);
  const y1 = readInteger(value, "y1", LEVEL_CODE, `${label}.y1`);
  if (!y1.ok) return err(y1.error);
  const x2 = readInteger(value, "x2", LEVEL_CODE, `${label}.x2`);
  if (!x2.ok) return err(x2.error);
  const y2 = readInteger(value, "y2", LEVEL_CODE, `${label}.y2`);
  if (!y2.ok) return err(y2.error);
  if (x1.value < 0 || y1.value < 0 || x2.value < 0 || y2.value < 0) {
    return err(`${LEVEL_CODE}: ${label} coordinates must be non-negative`);
  }
  if (x1.value > x2.value || y1.value > y2.value) {
    return err(`${LEVEL_CODE}: ${label} region must be ordered`);
  }
  return ok({
    kind: "tileRegion",
    layer: layer.value,
    x1: x1.value,
    y1: y1.value,
    x2: x2.value,
    y2: y2.value,
  });
}

function parseFeedbackNodeOverride(
  value: unknown,
  label: string,
): Result<LevelFeedbackNodeOverride> {
  if (!isRecord(value)) {
    return err(`${LEVEL_CODE}: ${label} must be an object`);
  }
  const keys = rejectUnknownKeys(
    value,
    ["label", "text", "effectPreset", "tileTarget"],
    LEVEL_CODE,
    label,
  );
  if (!keys.ok) return err(keys.error);

  const labelValue = readOptionalString(value, "label", LEVEL_CODE, `${label}.label`);
  if (!labelValue.ok) return err(labelValue.error);
  const text = readOptionalString(value, "text", LEVEL_CODE, `${label}.text`);
  if (!text.ok) return err(text.error);
  const effectPreset = readOptionalString(
    value,
    "effectPreset",
    LEVEL_CODE,
    `${label}.effectPreset`,
  );
  if (!effectPreset.ok) return err(effectPreset.error);

  let tileTarget: LevelFeedbackTileTarget | undefined;
  if (value.tileTarget !== undefined) {
    const parsed = parseFeedbackTileTarget(value.tileTarget, `${label}.tileTarget`);
    if (!parsed.ok) return err(parsed.error);
    tileTarget = parsed.value;
  }

  return ok({
    ...(labelValue.value ? { label: labelValue.value } : {}),
    ...(text.value ? { text: text.value } : {}),
    ...(effectPreset.value ? { effectPreset: effectPreset.value } : {}),
    ...(tileTarget ? { tileTarget } : {}),
  });
}

function parseFeedbackPuzzle(
  value: unknown,
  label: string,
): Result<LevelFeedbackPuzzle> {
  if (!isRecord(value)) {
    return err(`${LEVEL_CODE}: ${label} must be an object`);
  }
  const keys = rejectUnknownKeys(value, ["beats", "nodes"], LEVEL_CODE, label);
  if (!keys.ok) return err(keys.error);

  let beats: LevelFeedbackBeat[] | undefined;
  if (value.beats !== undefined) {
    if (!Array.isArray(value.beats)) {
      return err(`${LEVEL_CODE}: ${label}.beats must be an array`);
    }
    beats = [];
    const seen = new Set<string>();
    for (const [index, raw] of value.beats.entries()) {
      const beatLabel = `${label}.beats[${index}]`;
      if (!isRecord(raw)) {
        return err(`${LEVEL_CODE}: ${beatLabel} must be an object`);
      }
      const beatKeys = rejectUnknownKeys(
        raw,
        ["id", "label", "nodes"],
        LEVEL_CODE,
        beatLabel,
      );
      if (!beatKeys.ok) return err(beatKeys.error);
      const id = readNonEmptyString(raw, "id", LEVEL_CODE, `${beatLabel}.id`);
      if (!id.ok) return err(id.error);
      if (seen.has(id.value)) {
        return err(`${LEVEL_CODE}: ${beatLabel}.id "${id.value}" is duplicated`);
      }
      seen.add(id.value);
      const beatText = readNonEmptyString(
        raw,
        "label",
        LEVEL_CODE,
        `${beatLabel}.label`,
      );
      if (!beatText.ok) return err(beatText.error);
      const nodes = readStringArray(raw, "nodes", LEVEL_CODE, `${beatLabel}.nodes`);
      if (!nodes.ok) return err(nodes.error);
      beats.push({ id: id.value, label: beatText.value, nodes: nodes.value });
    }
  }

  let nodes: Record<string, LevelFeedbackNodeOverride> | undefined;
  if (value.nodes !== undefined) {
    if (!isRecord(value.nodes)) {
      return err(`${LEVEL_CODE}: ${label}.nodes must be an object`);
    }
    nodes = {};
    for (const [nodeId, raw] of Object.entries(value.nodes)) {
      if (nodeId.trim() === "") {
        return err(`${LEVEL_CODE}: ${label}.nodes keys must be non-empty`);
      }
      const parsed = parseFeedbackNodeOverride(
        raw,
        `${label}.nodes.${nodeId}`,
      );
      if (!parsed.ok) return err(parsed.error);
      nodes[nodeId] = parsed.value;
    }
  }

  return ok({
    ...(beats ? { beats } : {}),
    ...(nodes ? { nodes } : {}),
  });
}

function parseLevelFeedback(value: unknown): Result<LevelFeedback> {
  if (!isRecord(value)) {
    return err(`${LEVEL_CODE}: feedback must be an object`);
  }
  const keys = rejectUnknownKeys(value, ["puzzles"], LEVEL_CODE, "feedback");
  if (!keys.ok) return err(keys.error);

  let puzzles: Record<string, LevelFeedbackPuzzle> | undefined;
  if (value.puzzles !== undefined) {
    if (!isRecord(value.puzzles)) {
      return err(`${LEVEL_CODE}: feedback.puzzles must be an object`);
    }
    puzzles = {};
    for (const [puzzleId, raw] of Object.entries(value.puzzles)) {
      if (puzzleId.trim() === "") {
        return err(`${LEVEL_CODE}: feedback.puzzles keys must be non-empty`);
      }
      const parsed = parseFeedbackPuzzle(
        raw,
        `feedback.puzzles.${puzzleId}`,
      );
      if (!parsed.ok) return err(parsed.error);
      puzzles[puzzleId] = parsed.value;
    }
  }

  return ok({ ...(puzzles ? { puzzles } : {}) });
}

export function parseLevel(value: unknown): Result<LevelDocument> {
  if (!isRecord(value)) {
    return err(`${LEVEL_CODE}: level must be an object`);
  }
  if (!isSchemaVersionSupported(value.schemaVersion)) {
    return err(
      `LEVEL_SCHEMA_VERSION: expected 1.x, got ${String(value.schemaVersion)}`,
    );
  }

  const id = readNonEmptyString(value, "id", LEVEL_CODE);
  if (!id.ok) return err(id.error);
  const title = readNonEmptyString(value, "title", LEVEL_CODE);
  if (!title.ok) return err(title.error);
  const order = readInteger(value, "order", LEVEL_CODE);
  if (!order.ok) return err(order.error);
  const status = readNonEmptyString(value, "status", LEVEL_CODE);
  if (!status.ok) return err(status.error);
  if (!LEVEL_STATUSES.includes(status.value as (typeof LEVEL_STATUSES)[number])) {
    return err(`${LEVEL_CODE}: status "${status.value}" is not supported`);
  }
  const syllabusObjectiveIds = readStringArray(value, "syllabusObjectiveIds", LEVEL_CODE);
  if (!syllabusObjectiveIds.ok) return err(syllabusObjectiveIds.error);
  const conceptIds = readStringArray(value, "conceptIds", LEVEL_CODE);
  if (!conceptIds.ok) return err(conceptIds.error);
  const roomId = readNonEmptyString(value, "roomId", LEVEL_CODE);
  if (!roomId.ok) return err(roomId.error);
  const backgroundId = readOptionalString(value, "backgroundId", LEVEL_CODE);
  if (!backgroundId.ok) return err(backgroundId.error);
  const dialogueIds = readStringArray(value, "dialogueIds", LEVEL_CODE);
  if (!dialogueIds.ok) return err(dialogueIds.error);
  const gateIds = readStringArray(value, "gateIds", LEVEL_CODE, "gateIds", {
    allowEmpty: true,
  });
  if (!gateIds.ok) return err(gateIds.error);
  const puzzleIds = readOptionalStringArray(
    value,
    "puzzleIds",
    LEVEL_CODE,
    "puzzleIds",
  );
  if (!puzzleIds.ok) return err(puzzleIds.error);

  const feedback = value.feedback === undefined
    ? ok(undefined)
    : parseLevelFeedback(value.feedback);
  if (!feedback.ok) return err(feedback.error);

  if (!isRecord(value.map)) {
    return err(`${LEVEL_CODE}: map must be an object`);
  }
  const nodeId = readNonEmptyString(value.map, "nodeId", LEVEL_CODE, "map.nodeId");
  if (!nodeId.ok) return err(nodeId.error);
  const label = readNonEmptyString(value.map, "label", LEVEL_CODE, "map.label");
  if (!label.ok) return err(label.error);
  const mapX = readNumber(value.map, "x", LEVEL_CODE, "map.x");
  if (!mapX.ok) return err(mapX.error);
  const mapY = readNumber(value.map, "y", LEVEL_CODE, "map.y");
  if (!mapY.ok) return err(mapY.error);
  if (!Array.isArray(value.map.edges)) {
    return err(`${LEVEL_CODE}: map.edges must be an array`);
  }
  const edges: LevelMapEdge[] = [];
  for (const [index, raw] of value.map.edges.entries()) {
    const edge = parseMapEdge(raw, index);
    if (!edge.ok) return err(edge.error);
    edges.push(edge.value);
  }

  if (!Array.isArray(value.evidence) || value.evidence.length === 0) {
    return err(`${LEVEL_CODE}: evidence must be a non-empty array`);
  }
  const evidence: LevelEvidenceRule[] = [];
  for (const [index, raw] of value.evidence.entries()) {
    const rule = parseLevelEvidence(raw, index);
    if (!rule.ok) return err(rule.error);
    evidence.push(rule.value);
  }

  if (!Array.isArray(value.unlocks)) {
    return err(`${LEVEL_CODE}: unlocks must be an array`);
  }
  const unlocks: LevelUnlock[] = [];
  for (const [index, raw] of value.unlocks.entries()) {
    const unlock = parseLevelUnlock(raw, index);
    if (!unlock.ok) return err(unlock.error);
    unlocks.push(unlock.value);
  }

  const nextLevelIds = value.nextLevelIds === undefined
    ? ok([])
    : readStringArray(value, "nextLevelIds", LEVEL_CODE, "nextLevelIds", { allowEmpty: true });
  if (!nextLevelIds.ok) return err(nextLevelIds.error);

  if (!isRecord(value.coop) || typeof value.coop.supported !== "boolean") {
    return err(`${LEVEL_CODE}: coop.supported must be boolean`);
  }
  const coopNotes = readOptionalString(value.coop, "notes", LEVEL_CODE, "coop.notes");
  if (!coopNotes.ok) return err(coopNotes.error);

  let authoring: LevelDocument["authoring"];
  if (value.authoring !== undefined) {
    if (!isRecord(value.authoring)) {
      return err(`${LEVEL_CODE}: authoring must be an object`);
    }
    const levelSpec = readOptionalString(value.authoring, "levelSpec", LEVEL_CODE, "authoring.levelSpec");
    if (!levelSpec.ok) return err(levelSpec.error);
    const playtestedSolo = value.authoring.playtestedSolo === undefined
      ? ok(undefined)
      : readBoolean(value.authoring, "playtestedSolo", LEVEL_CODE, "authoring.playtestedSolo");
    if (!playtestedSolo.ok) return err(playtestedSolo.error);
    const playtestedCoop = value.authoring.playtestedCoop === undefined
      ? ok(undefined)
      : readBoolean(value.authoring, "playtestedCoop", LEVEL_CODE, "authoring.playtestedCoop");
    if (!playtestedCoop.ok) return err(playtestedCoop.error);
    const notes = readOptionalString(value.authoring, "notes", LEVEL_CODE, "authoring.notes");
    if (!notes.ok) return err(notes.error);
    authoring = {
      ...(levelSpec.value ? { levelSpec: levelSpec.value } : {}),
      ...(playtestedSolo.value !== undefined ? { playtestedSolo: playtestedSolo.value } : {}),
      ...(playtestedCoop.value !== undefined ? { playtestedCoop: playtestedCoop.value } : {}),
      ...(notes.value ? { notes: notes.value } : {}),
    };
  }

  return ok({
    schemaVersion: value.schemaVersion,
    id: id.value,
    title: title.value,
    order: order.value,
    status: status.value as (typeof LEVEL_STATUSES)[number],
    syllabusObjectiveIds: syllabusObjectiveIds.value,
    conceptIds: conceptIds.value,
    roomId: roomId.value,
    ...(backgroundId.value ? { backgroundId: backgroundId.value } : {}),
    dialogueIds: dialogueIds.value,
    gateIds: gateIds.value,
    puzzleIds: puzzleIds.value ?? [],
    map: {
      nodeId: nodeId.value,
      label: label.value,
      x: mapX.value,
      y: mapY.value,
      edges,
    },
    evidence,
    unlocks,
    nextLevelIds: nextLevelIds.value,
    coop: {
      supported: value.coop.supported,
      ...(coopNotes.value ? { notes: coopNotes.value } : {}),
    },
    ...(authoring ? { authoring } : {}),
    ...(feedback.value ? { feedback: feedback.value } : {}),
  });
}

/* ------------------------------------------------------------------ */
/* Effects                                                             */
/* ------------------------------------------------------------------ */

function parseRecordEvidenceEffect(
  value: UnknownRecord,
  code: string,
  label: string,
): Result<RecordEvidenceEffect> {
  const event = readNonEmptyString(value, "event", code, `${label}.event`);
  if (!event.ok) return err(event.error);
  if (!isLearningEventType(event.value)) {
    return err(`${code}: ${label}.event "${event.value}" is not a learning event`);
  }
  const effect: RecordEvidenceEffect = {
    type: "recordEvidence",
    event: event.value,
  };
  for (const key of ["gateId", "conceptId", "promptId", "objectiveId"] as const) {
    if (value[key] === undefined) continue;
    const field = readNonEmptyString(value, key, code, `${label}.${key}`);
    if (!field.ok) return err(field.error);
    effect[key] = field.value;
  }
  if (value.answer !== undefined) {
    if (typeof value.answer !== "string") {
      return err(`${code}: ${label}.answer must be a string`);
    }
    effect.answer = value.answer;
  }
  if (value.correct !== undefined) {
    if (typeof value.correct !== "boolean") {
      return err(`${code}: ${label}.correct must be boolean`);
    }
    effect.correct = value.correct;
  }
  return ok(effect);
}

function parseEffect(
  value: unknown,
  code: string,
  label: string,
): Result<DialogueEffect> {
  if (!isRecord(value)) {
    return err(`${code}: ${label} must be an object`);
  }
  const type = readNonEmptyString(value, "type", code, `${label}.type`);
  if (!type.ok) return err(type.error);

  switch (type.value) {
    case "setFlag": {
      const flagId = readNonEmptyString(value, "flagId", code, `${label}.flagId`);
      if (!flagId.ok) return err(flagId.error);
      const flagValue = readBoolean(value, "value", code, `${label}.value`);
      if (!flagValue.ok) return err(flagValue.error);
      return ok({ type: "setFlag", flagId: flagId.value, value: flagValue.value });
    }
    case "revealConcept": {
      const conceptId = readNonEmptyString(value, "conceptId", code, `${label}.conceptId`);
      if (!conceptId.ok) return err(conceptId.error);
      return ok({ type: "revealConcept", conceptId: conceptId.value });
    }
    case "unlockAbility": {
      const id = readNonEmptyString(value, "id", code, `${label}.id`);
      if (!id.ok) return err(id.error);
      return ok({ type: "unlockAbility", id: id.value });
    }
    case "startGate": {
      const gateId = readNonEmptyString(value, "gateId", code, `${label}.gateId`);
      if (!gateId.ok) return err(gateId.error);
      return ok({ type: "startGate", gateId: gateId.value });
    }
    case "revealMap": {
      const nodeId = readNonEmptyString(value, "nodeId", code, `${label}.nodeId`);
      if (!nodeId.ok) return err(nodeId.error);
      return ok({ type: "revealMap", nodeId: nodeId.value });
    }
    case "playCue": {
      const cue = readNonEmptyString(value, "cue", code, `${label}.cue`);
      if (!cue.ok) return err(cue.error);
      return ok({ type: "playCue", cue: cue.value });
    }
    case "recordEvidence":
      return parseRecordEvidenceEffect(value, code, label);
    default:
      return err(`${code}: ${label}.type "${type.value}" is not supported`);
  }
}

function parseEffects(
  value: unknown,
  code: string,
  label: string,
): Result<DialogueEffect[] | undefined> {
  if (value === undefined) {
    return ok(undefined);
  }
  if (!Array.isArray(value)) {
    return err(`${code}: ${label} must be an array`);
  }
  const effects: DialogueEffect[] = [];
  for (const [index, raw] of value.entries()) {
    const effect = parseEffect(raw, code, `${label}[${index}]`);
    if (!effect.ok) return err(effect.error);
    effects.push(effect.value);
  }
  return ok(effects);
}

function parseCondition(
  value: unknown,
  code: string,
  label: string,
): Result<DialogueCondition | undefined> {
  if (value === undefined) {
    return ok(undefined);
  }
  if (!isRecord(value)) {
    return err(`${code}: ${label} must be an object`);
  }
  const type = readNonEmptyString(value, "type", code, `${label}.type`);
  if (!type.ok) return err(type.error);
  switch (type.value) {
    case "hasAbility":
    case "hasFlag":
    case "conceptKnown": {
      const id = readNonEmptyString(value, "id", code, `${label}.id`);
      if (!id.ok) return err(id.error);
      return ok({ type: type.value, id: id.value });
    }
    case "playerCount": {
      const count = readInteger(value, "value", code, `${label}.value`);
      if (!count.ok) return err(count.error);
      return ok({ type: "playerCount", value: count.value });
    }
    default:
      return err(`${code}: ${label}.type "${type.value}" is not supported`);
  }
}

/* ------------------------------------------------------------------ */
/* Dialogue                                                            */
/* ------------------------------------------------------------------ */

function parseChoice(
  value: unknown,
  code: string,
  label: string,
): Result<DialogueChoice> {
  if (!isRecord(value)) {
    return err(`${code}: ${label} must be an object`);
  }
  const id = readNonEmptyString(value, "id", code, `${label}.id`);
  if (!id.ok) return err(id.error);
  const text = readNonEmptyString(value, "text", code, `${label}.text`);
  if (!text.ok) return err(text.error);
  let next: string | null = null;
  if (value.next !== null && value.next !== undefined) {
    if (typeof value.next !== "string" || value.next.trim() === "") {
      return err(`${code}: ${label}.next must be a node ID or null`);
    }
    next = value.next;
  }
  return ok({ id: id.value, text: text.value, next });
}

function parseDialogueNode(
  value: unknown,
  id: string,
  code: string,
): Result<DialogueNode> {
  if (!isRecord(value)) {
    return err(`${code}: nodes.${id} must be an object`);
  }
  const text = readNonEmptyString(value, "text", code, `nodes.${id}.text`);
  if (!text.ok) return err(text.error);
  const speaker = readOptionalString(value, "speaker", code, `nodes.${id}.speaker`);
  if (!speaker.ok) return err(speaker.error);
  const portrait = readOptionalString(value, "portrait", code, `nodes.${id}.portrait`);
  if (!portrait.ok) return err(portrait.error);

  let next: string | null | undefined;
  if (value.next === null) {
    next = null;
  } else if (value.next !== undefined) {
    if (typeof value.next !== "string" || value.next.trim() === "") {
      return err(`${code}: nodes.${id}.next must be a node ID or null`);
    }
    next = value.next;
  }

  let choices: DialogueChoice[] | undefined;
  if (value.choices !== undefined) {
    if (!Array.isArray(value.choices) || value.choices.length === 0) {
      return err(`${code}: nodes.${id}.choices must be a non-empty array`);
    }
    choices = [];
    for (const [index, raw] of value.choices.entries()) {
      const choice = parseChoice(raw, code, `nodes.${id}.choices[${index}]`);
      if (!choice.ok) return err(choice.error);
      choices.push(choice.value);
    }
    const choiceIds = new Set(choices.map((choice) => choice.id));
    if (choiceIds.size !== choices.length) {
      return err(`${code}: nodes.${id}.choices has duplicate IDs`);
    }
  }

  const effects = parseEffects(value.effects, code, `nodes.${id}.effects`);
  if (!effects.ok) return err(effects.error);
  const condition = parseCondition(value.condition, code, `nodes.${id}.condition`);
  if (!condition.ok) return err(condition.error);

  return ok({
    text: text.value,
    ...(speaker.value ? { speaker: speaker.value } : {}),
    ...(portrait.value ? { portrait: portrait.value } : {}),
    ...(next !== undefined ? { next } : {}),
    ...(choices ? { choices } : {}),
    ...(effects.value ? { effects: effects.value } : {}),
    ...(condition.value ? { condition: condition.value } : {}),
  });
}

export function parseDialogue(value: unknown): Result<DialogueDocument> {
  if (!isRecord(value)) {
    return err(`${DIALOGUE_CODE}: dialogue must be an object`);
  }
  if (!isSchemaVersionSupported(value.schemaVersion)) {
    return err(
      `DIALOGUE_SCHEMA_VERSION: expected 1.x, got ${String(value.schemaVersion)}`,
    );
  }
  const id = readNonEmptyString(value, "id", DIALOGUE_CODE);
  if (!id.ok) return err(id.error);
  const speaker = readNonEmptyString(value, "speaker", DIALOGUE_CODE);
  if (!speaker.ok) return err(speaker.error);
  const portrait = readOptionalString(value, "portrait", DIALOGUE_CODE);
  if (!portrait.ok) return err(portrait.error);
  const start = readNonEmptyString(value, "start", DIALOGUE_CODE);
  if (!start.ok) return err(start.error);

  if (!isRecord(value.nodes) || Object.keys(value.nodes).length === 0) {
    return err(`${DIALOGUE_CODE}: nodes must be a non-empty object`);
  }

  const nodes: Record<string, DialogueNode> = {};
  for (const [nodeId, raw] of Object.entries(value.nodes)) {
    const node = parseDialogueNode(raw, nodeId, DIALOGUE_CODE);
    if (!node.ok) return err(node.error);
    nodes[nodeId] = node.value;
  }

  const nodeIds = new Set(Object.keys(nodes));
  if (!nodeIds.has(start.value)) {
    return err(`${DIALOGUE_CODE}: start "${start.value}" is not a node`);
  }
  for (const [nodeId, node] of Object.entries(nodes)) {
    if (typeof node.next === "string" && !nodeIds.has(node.next)) {
      return err(`${DIALOGUE_CODE}: nodes.${nodeId}.next "${node.next}" is missing`);
    }
    for (const choice of node.choices ?? []) {
      if (choice.next !== null && !nodeIds.has(choice.next)) {
        return err(
          `${DIALOGUE_CODE}: nodes.${nodeId} choice "${choice.id}" targets missing node "${choice.next}"`,
        );
      }
    }
  }

  return ok({
    schemaVersion: value.schemaVersion,
    id: id.value,
    speaker: speaker.value,
    ...(portrait.value ? { portrait: portrait.value } : {}),
    start: start.value,
    nodes,
  });
}

/* ------------------------------------------------------------------ */
/* Gate                                                                */
/* ------------------------------------------------------------------ */

function parseSingleChoicePuzzle(value: UnknownRecord): Result<GatePuzzle> {
  if (!Array.isArray(value.options) || value.options.length === 0) {
    return err(`${GATE_CODE}: puzzle.options must be a non-empty array`);
  }
  const options: Array<{ id: string; text: string }> = [];
  for (const [index, raw] of value.options.entries()) {
    if (!isRecord(raw)) {
      return err(`${GATE_CODE}: puzzle.options[${index}] must be an object`);
    }
    const id = readNonEmptyString(raw, "id", GATE_CODE, `puzzle.options[${index}].id`);
    if (!id.ok) return err(id.error);
    const text = readNonEmptyString(raw, "text", GATE_CODE, `puzzle.options[${index}].text`);
    if (!text.ok) return err(text.error);
    options.push({ id: id.value, text: text.value });
  }
  const answerId = readNonEmptyString(value, "answerId", GATE_CODE, "puzzle.answerId");
  if (!answerId.ok) return err(answerId.error);
  if (!options.some((option) => option.id === answerId.value)) {
    return err(`${GATE_CODE}: puzzle.answerId "${answerId.value}" is not an option`);
  }
  return ok({ type: "singleChoice", options, answerId: answerId.value });
}

function parseSequencePuzzle(value: UnknownRecord): Result<GatePuzzle> {
  const items = readStringArray(value, "items", GATE_CODE, "puzzle.items");
  if (!items.ok) return err(items.error);
  const answer = readStringArray(value, "answer", GATE_CODE, "puzzle.answer");
  if (!answer.ok) return err(answer.error);
  if (items.value.length !== answer.value.length) {
    return err(`${GATE_CODE}: puzzle.answer must contain every item exactly once`);
  }
  const itemSet = new Set(items.value);
  if (itemSet.size !== items.value.length) {
    return err(`${GATE_CODE}: puzzle.items must be unique`);
  }
  if (
    answer.value.length !== new Set(answer.value).size ||
    answer.value.some((item) => !itemSet.has(item))
  ) {
    return err(`${GATE_CODE}: puzzle.answer must be a permutation of puzzle.items`);
  }
  return ok({ type: "sequence", items: items.value, answer: answer.value });
}

function parseMatchPuzzle(value: UnknownRecord): Result<GatePuzzle> {
  const left = readStringArray(value, "left", GATE_CODE, "puzzle.left");
  if (!left.ok) return err(left.error);
  const right = readStringArray(value, "right", GATE_CODE, "puzzle.right");
  if (!right.ok) return err(right.error);
  if (new Set(left.value).size !== left.value.length) {
    return err(`${GATE_CODE}: puzzle.left must be unique`);
  }
  if (new Set(right.value).size !== right.value.length) {
    return err(`${GATE_CODE}: puzzle.right must be unique`);
  }
  const answer = readRecordStringMap(value.answer, GATE_CODE, "puzzle.answer");
  if (!answer.ok) return err(answer.error);
  const answerKeys = Object.keys(answer.value);
  if (answerKeys.length !== left.value.length) {
    return err(`${GATE_CODE}: puzzle.answer must map every left item`);
  }
  const rightSet = new Set(right.value);
  for (const leftItem of left.value) {
    const match = answer.value[leftItem];
    if (!match || !rightSet.has(match)) {
      return err(
        `${GATE_CODE}: puzzle.answer["${leftItem}"] must reference a right item`,
      );
    }
  }
  return ok({ type: "match", left: left.value, right: right.value, answer: answer.value });
}

function parsePuzzle(value: unknown): Result<GatePuzzle> {
  if (!isRecord(value)) {
    return err(`${GATE_CODE}: puzzle must be an object`);
  }
  const type = readNonEmptyString(value, "type", GATE_CODE, "puzzle.type");
  if (!type.ok) return err(type.error);
  switch (type.value) {
    case "singleChoice":
      return parseSingleChoicePuzzle(value);
    case "sequence":
      return parseSequencePuzzle(value);
    case "match":
      return parseMatchPuzzle(value);
    default:
      return err(`${GATE_CODE}: puzzle.type "${type.value}" is not supported`);
  }
}

export function parseGate(value: unknown): Result<GateDocument> {
  if (!isRecord(value)) {
    return err(`${GATE_CODE}: gate must be an object`);
  }
  if (!isSchemaVersionSupported(value.schemaVersion)) {
    return err(
      `GATE_SCHEMA_VERSION: expected 1.x, got ${String(value.schemaVersion)}`,
    );
  }
  const id = readNonEmptyString(value, "id", GATE_CODE);
  if (!id.ok) return err(id.error);
  const type = readNonEmptyString(value, "type", GATE_CODE);
  if (!type.ok) return err(type.error);
  if (!GATE_TYPES.includes(type.value as GateType)) {
    return err(`${GATE_CODE}: type "${type.value}" is not supported`);
  }
  const objectiveId = readNonEmptyString(value, "objectiveId", GATE_CODE);
  if (!objectiveId.ok) return err(objectiveId.error);
  const conceptIds = readStringArray(value, "conceptIds", GATE_CODE, "conceptIds", {
    allowEmpty: true,
  });
  if (!conceptIds.ok) return err(conceptIds.error);
  const prompt = readNonEmptyString(value, "prompt", GATE_CODE);
  if (!prompt.ok) return err(prompt.error);

  let puzzle: GatePuzzle | undefined;
  if (type.value === "concept") {
    const parsed = parsePuzzle(value.puzzle);
    if (!parsed.ok) return err(parsed.error);
    puzzle = parsed.value;
  } else if (value.puzzle !== undefined) {
    const parsed = parsePuzzle(value.puzzle);
    if (!parsed.ok) return err(parsed.error);
    puzzle = parsed.value;
  }

  const hints = value.hints === undefined
    ? ok([])
    : readStringArray(value, "hints", GATE_CODE, "hints", { allowEmpty: true });
  if (!hints.ok) return err(hints.error);

  const onSolve = parseEffects(value.onSolve, GATE_CODE, "onSolve");
  if (!onSolve.ok) return err(onSolve.error);
  const onFail = parseEffects(value.onFail, GATE_CODE, "onFail");
  if (!onFail.ok) return err(onFail.error);

  return ok({
    schemaVersion: value.schemaVersion,
    id: id.value,
    type: type.value as GateType,
    objectiveId: objectiveId.value,
    conceptIds: conceptIds.value,
    prompt: prompt.value,
    ...(puzzle ? { puzzle } : {}),
    hints: hints.value,
    onSolve: (onSolve.value ?? []) as GateEffect[],
    onFail: (onFail.value ?? []) as GateEffect[],
  });
}

/* ------------------------------------------------------------------ */
/* Mapping                                                             */
/* ------------------------------------------------------------------ */

function parseObjectiveMapping(
  value: unknown,
  objectiveId: string,
): Result<ObjectiveMapping> {
  if (!isRecord(value)) {
    return err(`${MAPPING_CODE}: objectives.${objectiveId} must be an object`);
  }
  const levels = readStringArray(value, "levels", MAPPING_CODE, `objectives.${objectiveId}.levels`, {
    allowEmpty: true,
  });
  if (!levels.ok) return err(levels.error);
  const dialogues = readStringArray(value, "dialogues", MAPPING_CODE, `objectives.${objectiveId}.dialogues`, {
    allowEmpty: true,
  });
  if (!dialogues.ok) return err(dialogues.error);
  const gates = readStringArray(value, "gates", MAPPING_CODE, `objectives.${objectiveId}.gates`, {
    allowEmpty: true,
  });
  if (!gates.ok) return err(gates.error);
  const evidence = readStringArray(value, "evidence", MAPPING_CODE, `objectives.${objectiveId}.evidence`, {
    allowEmpty: true,
  });
  if (!evidence.ok) return err(evidence.error);
  const debrief = readOptionalString(value, "debrief", MAPPING_CODE, `objectives.${objectiveId}.debrief`);
  if (!debrief.ok) return err(debrief.error);
  return ok({
    levels: levels.value,
    dialogues: dialogues.value,
    gates: gates.value,
    evidence: evidence.value,
    ...(debrief.value ? { debrief: debrief.value } : {}),
  });
}

function parseConceptMapping(
  value: unknown,
  conceptId: string,
): Result<ConceptMapping> {
  if (!isRecord(value)) {
    return err(`${MAPPING_CODE}: concepts.${conceptId} must be an object`);
  }
  const levels = readStringArray(value, "levels", MAPPING_CODE, `concepts.${conceptId}.levels`, {
    allowEmpty: true,
  });
  if (!levels.ok) return err(levels.error);
  const dialogues = readStringArray(value, "dialogues", MAPPING_CODE, `concepts.${conceptId}.dialogues`, {
    allowEmpty: true,
  });
  if (!dialogues.ok) return err(dialogues.error);
  const scanTargets = readStringArray(value, "scanTargets", MAPPING_CODE, `concepts.${conceptId}.scanTargets`, {
    allowEmpty: true,
  });
  if (!scanTargets.ok) return err(scanTargets.error);
  const mapLabels = readStringArray(value, "mapLabels", MAPPING_CODE, `concepts.${conceptId}.mapLabels`, {
    allowEmpty: true,
  });
  if (!mapLabels.ok) return err(mapLabels.error);
  return ok({
    levels: levels.value,
    dialogues: dialogues.value,
    scanTargets: scanTargets.value,
    mapLabels: mapLabels.value,
  });
}

export function parseMapping(value: unknown): Result<MappingDocument> {
  if (!isRecord(value)) {
    return err(`${MAPPING_CODE}: mapping must be an object`);
  }
  if (!isSchemaVersionSupported(value.schemaVersion)) {
    return err(
      `MAPPING_SCHEMA_VERSION: expected 1.x, got ${String(value.schemaVersion)}`,
    );
  }
  const syllabusId = readNonEmptyString(value, "syllabusId", MAPPING_CODE);
  if (!syllabusId.ok) return err(syllabusId.error);
  const packId = readNonEmptyString(value, "packId", MAPPING_CODE);
  if (!packId.ok) return err(packId.error);
  if (!isRecord(value.objectives)) {
    return err(`${MAPPING_CODE}: objectives must be an object`);
  }
  if (!isRecord(value.concepts)) {
    return err(`${MAPPING_CODE}: concepts must be an object`);
  }

  const objectives: Record<string, ObjectiveMapping> = {};
  for (const [objectiveId, raw] of Object.entries(value.objectives)) {
    const mapping = parseObjectiveMapping(raw, objectiveId);
    if (!mapping.ok) return err(mapping.error);
    objectives[objectiveId] = mapping.value;
  }
  const concepts: Record<string, ConceptMapping> = {};
  for (const [conceptId, raw] of Object.entries(value.concepts)) {
    const mapping = parseConceptMapping(raw, conceptId);
    if (!mapping.ok) return err(mapping.error);
    concepts[conceptId] = mapping.value;
  }

  return ok({
    schemaVersion: value.schemaVersion,
    syllabusId: syllabusId.value,
    packId: packId.value,
    objectives,
    concepts,
  });
}

/* ------------------------------------------------------------------ */
/* Licences                                                            */
/* ------------------------------------------------------------------ */

function parseLicenceEntry(
  value: unknown,
  index: number,
): Result<LicenceEntry> {
  if (!isRecord(value)) {
    return err(`${LICENCE_CODE}: assets[${index}] must be an object`);
  }
  const file = readNonEmptyString(value, "file", LICENCE_CODE, `assets[${index}].file`);
  if (!file.ok) return err(file.error);
  const type = readNonEmptyString(value, "type", LICENCE_CODE, `assets[${index}].type`);
  if (!type.ok) return err(type.error);
  const source = readNonEmptyString(value, "source", LICENCE_CODE, `assets[${index}].source`);
  if (!source.ok) return err(source.error);
  const author = readNonEmptyString(value, "author", LICENCE_CODE, `assets[${index}].author`);
  if (!author.ok) return err(author.error);
  const license = readNonEmptyString(value, "license", LICENCE_CODE, `assets[${index}].license`);
  if (!license.ok) return err(license.error);
  const url = readOptionalString(value, "url", LICENCE_CODE, `assets[${index}].url`);
  if (!url.ok) return err(url.error);
  const modified = readOptionalString(value, "modified", LICENCE_CODE, `assets[${index}].modified`);
  if (!modified.ok) return err(modified.error);
  const aiGenerated = value.aiGenerated === undefined
    ? ok(undefined)
    : readBoolean(value, "aiGenerated", LICENCE_CODE, `assets[${index}].aiGenerated`);
  if (!aiGenerated.ok) return err(aiGenerated.error);
  return ok({
    file: file.value,
    type: type.value,
    source: source.value,
    author: author.value,
    license: license.value,
    ...(url.value ? { url: url.value } : {}),
    ...(modified.value ? { modified: modified.value } : {}),
    ...(aiGenerated.value !== undefined ? { aiGenerated: aiGenerated.value } : {}),
  });
}

export function parseLicences(value: unknown): Result<LicenceDocument> {
  if (!isRecord(value)) {
    return err(`${LICENCE_CODE}: licences must be an object`);
  }
  if (!isSchemaVersionSupported(value.schemaVersion)) {
    return err(
      `LICENCES_SCHEMA_VERSION: expected 1.x, got ${String(value.schemaVersion)}`,
    );
  }
  if (!Array.isArray(value.assets)) {
    return err(`${LICENCE_CODE}: assets must be an array`);
  }
  const assets: LicenceEntry[] = [];
  for (const [index, raw] of value.assets.entries()) {
    const entry = parseLicenceEntry(raw, index);
    if (!entry.ok) return err(entry.error);
    assets.push(entry.value);
  }
  return ok({ schemaVersion: value.schemaVersion, assets });
}

/* ------------------------------------------------------------------ */
/* URL loaders                                                         */
/* ------------------------------------------------------------------ */

export async function loadPack(
  url: string,
  fetchImpl: typeof fetch = fetch,
): Promise<Result<PackDocument>> {
  const data = await parseJsonUrl(url, fetchImpl);
  if (!data.ok) return err(data.error);
  return parsePack(data.value);
}

export async function loadLevel(
  url: string,
  fetchImpl: typeof fetch = fetch,
): Promise<Result<LevelDocument>> {
  const data = await parseJsonUrl(url, fetchImpl);
  if (!data.ok) return err(data.error);
  return parseLevel(data.value);
}

export async function loadDialogue(
  url: string,
  fetchImpl: typeof fetch = fetch,
): Promise<Result<DialogueDocument>> {
  const data = await parseJsonUrl(url, fetchImpl);
  if (!data.ok) return err(data.error);
  return parseDialogue(data.value);
}

export async function loadGate(
  url: string,
  fetchImpl: typeof fetch = fetch,
): Promise<Result<GateDocument>> {
  const data = await parseJsonUrl(url, fetchImpl);
  if (!data.ok) return err(data.error);
  return parseGate(data.value);
}

export async function loadMapping(
  url: string,
  fetchImpl: typeof fetch = fetch,
): Promise<Result<MappingDocument>> {
  const data = await parseJsonUrl(url, fetchImpl);
  if (!data.ok) return err(data.error);
  return parseMapping(data.value);
}

export async function loadLicences(
  url: string,
  fetchImpl: typeof fetch = fetch,
): Promise<Result<LicenceDocument>> {
  const data = await parseJsonUrl(url, fetchImpl);
  if (!data.ok) return err(data.error);
  return parseLicences(data.value);
}

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

export function collectDialogueAssetIds(
  _dialogue: DialogueDocument,
): string[] {
  // Dialogue portraits are theme-level UI IDs (`ui.portrait.*`), not content
  // paths, so a dialogue document contributes no asset IDs of its own yet.
  return [];
}

export function collectGateAssetIds(_gate: GateDocument): string[] {
  return [];
}

/** Used by the runtime when applying a property bag to gameplay. */
export function entityConcepts(
  properties: Record<string, RoomPropertyValue> | undefined,
): string[] {
  const concepts = properties?.conceptIds;
  return Array.isArray(concepts) ? concepts : [];
}
