import type { AssetId } from "../assets";
import { err, ok, type Result } from "../core/result";
import {
  isAssetId,
  isFiniteNumber,
  isHexColor,
  isRecord,
  isSchemaVersionSupported,
  parseJsonUrl,
  readAssetId,
  readBoolean,
  readInteger,
  readNonEmptyString,
  readNumber,
  readOptionalAssetId,
  readOptionalString,
  readStringArray,
  type UnknownRecord,
} from "./parse-common";
import type {
  BackgroundBlend,
  BackgroundFit,
  EntityAnchorPoint,
  EntityBodyComponent,
  EntityGateComponent,
  EntityPropComponent,
  EntityPulseSourceComponent,
  EntityReceptorComponent,
  RoomBackgroundLayer,
  RoomCheckpoint,
  RoomDocument,
  RoomEntity,
  RoomEntityComponents,
  RoomEntityType,
  RoomExit,
  RoomPropertyValue,
  RoomSpawn,
  RoomTrigger,
  ThemeDocument,
  ThemeFonts,
  ThemePalette,
} from "./types";
import {
  parseMaterialBinding,
  parsePatternBinding,
  parseTileMaterialRule,
} from "./parse-materials";
import type {
  MaterialId,
  MaterialsDocument,
  PatternBinding,
  TileMaterialRule,
} from "../materials";

export { isAssetId } from "./parse-common";

const PALETTE_KEYS: readonly (keyof ThemePalette)[] = [
  "bg",
  "bone",
  "boneShadow",
  "nerve",
  "nerveGlow",
  "joint",
  "muscle",
  "text",
  "muted",
  "accent",
  "danger",
];

const PALETTE_RAMP_KEYS: readonly (keyof ThemePalette)[] = [
  "tealDark",
  "tealLight",
  "boneDark",
  "boneLight",
  "nerveDark",
  "jointDark",
  "jointLight",
  "muscleDark",
  "muscleLight",
  "orange",
  "orangeDark",
  "orangeLight",
];

const FIT_MODES: readonly BackgroundFit[] = [
  "cover",
  "tile",
  "stretch",
  "contain",
];

const BLEND_MODES: readonly BackgroundBlend[] = [
  "normal",
  "add",
  "multiply",
  "screen",
];

const ENTITY_TYPES: readonly RoomEntityType[] = [
  "agent",
  "movingPlatform",
  "hazard",
  "pickup",
  "trigger",
  "gate",
  "checkpoint",
  "scanTarget",
  "decor",
  "body",
  "prop",
  "receptor",
  "pulseSource",
  "puzzleGate",
];

function parseSpawn(
  value: unknown,
  label: string,
  code: string,
): Result<RoomSpawn> {
  if (!isRecord(value)) {
    return err(`${code}: spawns.${label} must be an object`);
  }
  if (!isFiniteNumber(value.x) || !isFiniteNumber(value.y)) {
    return err(`${code}: spawns.${label} needs numeric x/y`);
  }
  return ok({ x: value.x, y: value.y });
}

export function parseBackgroundLayer(
  value: unknown,
  index: number,
  code: string,
): Result<RoomBackgroundLayer> {
  if (!isRecord(value)) {
    return err(`${code}: background.layers[${index}] must be an object`);
  }

  const assetId = readAssetId(
    value,
    "assetId",
    code,
    `background.layers[${index}].assetId`,
  );
  if (!assetId.ok) {
    return err(assetId.error);
  }

  if (!isFiniteNumber(value.depth)) {
    return err(`${code}: background.layers[${index}].depth must be numeric`);
  }
  if (!isFiniteNumber(value.parallaxX) || !isFiniteNumber(value.parallaxY)) {
    return err(`${code}: background.layers[${index}] needs numeric parallaxX/Y`);
  }
  if (!FIT_MODES.includes(value.fit as BackgroundFit)) {
    return err(`${code}: background.layers[${index}] has invalid fit mode`);
  }

  const layer: RoomBackgroundLayer = {
    assetId: assetId.value,
    depth: value.depth,
    parallaxX: value.parallaxX,
    parallaxY: value.parallaxY,
    fit: value.fit as BackgroundFit,
  };

  if (value.tint !== undefined) {
    if (!isHexColor(value.tint)) {
      return err(`${code}: background.layers[${index}].tint must be hex`);
    }
    layer.tint = value.tint;
  }

  if (value.opacity !== undefined) {
    if (
      !isFiniteNumber(value.opacity) ||
      value.opacity < 0 ||
      value.opacity > 1
    ) {
      return err(`${code}: background.layers[${index}].opacity must be 0..1`);
    }
    layer.opacity = value.opacity;
  }

  if (value.blend !== undefined) {
    if (!BLEND_MODES.includes(value.blend as BackgroundBlend)) {
      return err(`${code}: background.layers[${index}] has invalid blend mode`);
    }
    layer.blend = value.blend as BackgroundBlend;
  }

  if (value.materialId !== undefined) {
    const materialId = readNonEmptyString(
      value,
      "materialId",
      code,
      `background.layers[${index}].materialId`,
    );
    if (!materialId.ok) return err(materialId.error);
    layer.materialId = materialId.value;
  }

  if (value.pattern !== undefined) {
    const pattern = parsePatternBinding(
      value.pattern,
      `background.layers[${index}].pattern`,
    );
    if (!pattern.ok) return err(pattern.error);
    layer.pattern = pattern.value;
  }

  return ok(layer);
}

function parseCheckpoint(
  value: unknown,
  index: number,
  code: string,
): Result<RoomCheckpoint> {
  if (!isRecord(value)) {
    return err(`${code}: checkpoints[${index}] must be an object`);
  }
  const id = readNonEmptyString(value, "id", code, `checkpoints[${index}].id`);
  if (!id.ok) return err(id.error);
  const x = readNumber(value, "x", code, `checkpoints[${index}].x`);
  if (!x.ok) return err(x.error);
  const y = readNumber(value, "y", code, `checkpoints[${index}].y`);
  if (!y.ok) return err(y.error);
  return ok({ id: id.value, x: x.value, y: y.value });
}

function parseExit(
  value: unknown,
  index: number,
  code: string,
): Result<RoomExit> {
  if (!isRecord(value)) {
    return err(`${code}: exits[${index}] must be an object`);
  }
  const id = readNonEmptyString(value, "id", code, `exits[${index}].id`);
  if (!id.ok) return err(id.error);
  const x = readNumber(value, "x", code, `exits[${index}].x`);
  if (!x.ok) return err(x.error);
  const y = readNumber(value, "y", code, `exits[${index}].y`);
  if (!y.ok) return err(y.error);
  const toLevelId = readNonEmptyString(
    value,
    "toLevelId",
    code,
    `exits[${index}].toLevelId`,
  );
  if (!toLevelId.ok) return err(toLevelId.error);

  const exit: RoomExit = {
    id: id.value,
    x: x.value,
    y: y.value,
    toLevelId: toLevelId.value,
  };

  if (value.width !== undefined) {
    const width = readNumber(value, "width", code, `exits[${index}].width`);
    if (!width.ok) return err(width.error);
    exit.width = width.value;
  }
  if (value.height !== undefined) {
    const height = readNumber(value, "height", code, `exits[${index}].height`);
    if (!height.ok) return err(height.error);
    exit.height = height.value;
  }
  if (value.gateId !== undefined) {
    const gateId = readNonEmptyString(
      value,
      "gateId",
      code,
      `exits[${index}].gateId`,
    );
    if (!gateId.ok) return err(gateId.error);
    exit.gateId = gateId.value;
  }
  if (value.puzzleId !== undefined) {
    const puzzleId = readNonEmptyString(
      value,
      "puzzleId",
      code,
      `exits[${index}].puzzleId`,
    );
    if (!puzzleId.ok) return err(puzzleId.error);
    exit.puzzleId = puzzleId.value;
  }
  return ok(exit);
}

function parseTrigger(
  value: unknown,
  index: number,
  code: string,
): Result<RoomTrigger> {
  if (!isRecord(value)) {
    return err(`${code}: triggers[${index}] must be an object`);
  }
  const id = readNonEmptyString(value, "id", code, `triggers[${index}].id`);
  if (!id.ok) return err(id.error);
  if (value.type !== "enter") {
    return err(`${code}: triggers[${index}].type must be "enter"`);
  }
  const x = readNumber(value, "x", code, `triggers[${index}].x`);
  if (!x.ok) return err(x.error);
  const y = readNumber(value, "y", code, `triggers[${index}].y`);
  if (!y.ok) return err(y.error);
  const width = readNumber(value, "width", code, `triggers[${index}].width`);
  if (!width.ok) return err(width.error);
  const height = readNumber(value, "height", code, `triggers[${index}].height`);
  if (!height.ok) return err(height.error);

  const trigger: RoomTrigger = {
    id: id.value,
    type: "enter",
    x: x.value,
    y: y.value,
    width: width.value,
    height: height.value,
  };

  if (value.dialogueId !== undefined) {
    const dialogueId = readNonEmptyString(
      value,
      "dialogueId",
      code,
      `triggers[${index}].dialogueId`,
    );
    if (!dialogueId.ok) return err(dialogueId.error);
    trigger.dialogueId = dialogueId.value;
  }
  if (value.gateId !== undefined) {
    const gateId = readNonEmptyString(
      value,
      "gateId",
      code,
      `triggers[${index}].gateId`,
    );
    if (!gateId.ok) return err(gateId.error);
    trigger.gateId = gateId.value;
  }
  if (value.event !== undefined) {
    const event = readNonEmptyString(
      value,
      "event",
      code,
      `triggers[${index}].event`,
    );
    if (!event.ok) return err(event.error);
    trigger.event = event.value;
  }
  return ok(trigger);
}

function parseEntityProperties(
  value: unknown,
  index: number,
  code: string,
): Result<Record<string, RoomPropertyValue> | undefined> {
  if (value === undefined) {
    return ok(undefined);
  }
  if (!isRecord(value)) {
    return err(`${code}: entities[${index}].properties must be an object`);
  }
  const properties: Record<string, RoomPropertyValue> = {};
  for (const [key, entry] of Object.entries(value)) {
    if (
      typeof entry === "string" ||
      typeof entry === "number" ||
      typeof entry === "boolean"
    ) {
      properties[key] = entry;
      continue;
    }
    if (Array.isArray(entry) && entry.every((item) => typeof item === "string")) {
      properties[key] = entry as string[];
      continue;
    }
    return err(
      `${code}: entities[${index}].properties.${key} must be a scalar or string array`,
    );
  }
  return ok(properties);
}

function parseBodyComponent(
  value: unknown,
  index: number,
  code: string,
): Result<EntityBodyComponent> {
  if (!isRecord(value)) {
    return err(`${code}: entities[${index}].components.body must be an object`);
  }
  const width = readNumber(value, "width", code, `entities[${index}].components.body.width`);
  if (!width.ok) return err(width.error);
  const height = readNumber(value, "height", code, `entities[${index}].components.body.height`);
  if (!height.ok) return err(height.error);
  if (width.value <= 0 || height.value <= 0) {
    return err(`${code}: entities[${index}].components.body width/height must be positive`);
  }

  const body: EntityBodyComponent = {
    width: width.value,
    height: height.value,
  };
  if (value.dynamic !== undefined) {
    const dynamic = readBoolean(value, "dynamic", code, `entities[${index}].components.body.dynamic`);
    if (!dynamic.ok) return err(dynamic.error);
    body.dynamic = dynamic.value;
  }
  if (value.mass !== undefined) {
    const mass = readNumber(value, "mass", code, `entities[${index}].components.body.mass`);
    if (!mass.ok) return err(mass.error);
    if (mass.value <= 0) {
      return err(`${code}: entities[${index}].components.body.mass must be positive`);
    }
    body.mass = mass.value;
  }
  if (value.fixedRotation !== undefined) {
    const fixed = readBoolean(value, "fixedRotation", code, `entities[${index}].components.body.fixedRotation`);
    if (!fixed.ok) return err(fixed.error);
    body.fixedRotation = fixed.value;
  }
  if (value.gravity !== undefined) {
    const gravity = readBoolean(value, "gravity", code, `entities[${index}].components.body.gravity`);
    if (!gravity.ok) return err(gravity.error);
    body.gravity = gravity.value;
  }
  for (const key of ["friction", "restitution"] as const) {
    if (value[key] === undefined) continue;
    const number = readNumber(value, key, code, `entities[${index}].components.body.${key}`);
    if (!number.ok) return err(number.error);
    body[key] = number.value;
  }
  return ok(body);
}

function parsePropComponent(
  value: unknown,
  index: number,
  code: string,
): Result<EntityPropComponent> {
  if (!isRecord(value)) {
    return err(`${code}: entities[${index}].components.prop must be an object`);
  }
  const bodyId = readNonEmptyString(value, "bodyId", code, `entities[${index}].components.prop.bodyId`);
  if (!bodyId.ok) return err(bodyId.error);
  const tags = readStringArray(value, "tags", code, `entities[${index}].components.prop.tags`);
  if (!tags.ok) return err(tags.error);
  const shape = readNonEmptyString(value, "shape", code, `entities[${index}].components.prop.shape`);
  if (!shape.ok) return err(shape.error);

  const prop: EntityPropComponent = {
    bodyId: bodyId.value,
    tags: tags.value,
    shape: shape.value,
    carryable: true,
    placeable: true,
  };
  for (const key of ["carryable", "placeable", "pushable", "throwable"] as const) {
    if (value[key] === undefined) continue;
    const boolean = readBoolean(value, key, code, `entities[${index}].components.prop.${key}`);
    if (!boolean.ok) return err(boolean.error);
    prop[key] = boolean.value;
  }
  return ok(prop);
}

function parseReceptorComponent(
  value: unknown,
  index: number,
  code: string,
): Result<EntityReceptorComponent> {
  if (!isRecord(value)) {
    return err(`${code}: entities[${index}].components.receptor must be an object`);
  }
  const receptor: EntityReceptorComponent = {};
  const acceptsTag = readOptionalString(value, "acceptsTag", code, `entities[${index}].components.receptor.acceptsTag`);
  if (!acceptsTag.ok) return err(acceptsTag.error);
  if (acceptsTag.value) receptor.acceptsTag = acceptsTag.value;
  const acceptsShape = readOptionalString(value, "acceptsShape", code, `entities[${index}].components.receptor.acceptsShape`);
  if (!acceptsShape.ok) return err(acceptsShape.error);
  if (acceptsShape.value) receptor.acceptsShape = acceptsShape.value;
  if (!receptor.acceptsTag && !receptor.acceptsShape) {
    return err(`${code}: entities[${index}].components.receptor needs acceptsTag or acceptsShape`);
  }
  if (value.snap !== undefined) {
    const snap = parseSpawn(value.snap, "snap", code);
    if (!snap.ok) return err(snap.error);
    receptor.snap = snap.value;
  }
  return ok(receptor);
}

function parseAnchors(
  value: unknown,
  index: number,
  code: string,
): Result<Record<string, EntityAnchorPoint>> {
  if (!isRecord(value)) {
    return err(`${code}: entities[${index}].components.anchors must be an object`);
  }
  const anchors: Record<string, EntityAnchorPoint> = {};
  for (const [name, raw] of Object.entries(value)) {
    if (!name) {
      return err(`${code}: entities[${index}].components.anchors needs non-empty names`);
    }
    if (!isRecord(raw)) {
      return err(
        `${code}: entities[${index}].components.anchors.${name} must be an object`,
      );
    }
    const x = readNumber(
      raw,
      "x",
      code,
      `entities[${index}].components.anchors.${name}.x`,
    );
    if (!x.ok) return err(x.error);
    const y = readNumber(
      raw,
      "y",
      code,
      `entities[${index}].components.anchors.${name}.y`,
    );
    if (!y.ok) return err(y.error);
    const anchor: EntityAnchorPoint = { x: x.value, y: y.value };
    if (raw.direction !== undefined) {
      const direction = readNumber(
        raw,
        "direction",
        code,
        `entities[${index}].components.anchors.${name}.direction`,
      );
      if (!direction.ok) return err(direction.error);
      anchor.direction = direction.value;
    }
    anchors[name] = anchor;
  }
  return ok(anchors);
}

function parseEntityComponents(
  value: unknown,
  index: number,
  code: string,
): Result<RoomEntityComponents | undefined> {
  if (value === undefined) return ok(undefined);
  if (!isRecord(value)) {
    return err(`${code}: entities[${index}].components must be an object`);
  }

  const known = new Set([
    "body",
    "prop",
    "receptor",
    "pulseSource",
    "gate",
    "anchors",
    "material",
  ]);
  for (const key of Object.keys(value)) {
    if (!known.has(key)) {
      return err(
        `${code}: entities[${index}].components.${key} is not supported`,
      );
    }
  }

  const components: RoomEntityComponents = {};
  if (value.body !== undefined) {
    const body = parseBodyComponent(value.body, index, code);
    if (!body.ok) return err(body.error);
    components.body = body.value;
  }
  if (value.prop !== undefined) {
    const prop = parsePropComponent(value.prop, index, code);
    if (!prop.ok) return err(prop.error);
    components.prop = prop.value;
  }
  if (value.receptor !== undefined) {
    const receptor = parseReceptorComponent(value.receptor, index, code);
    if (!receptor.ok) return err(receptor.error);
    components.receptor = receptor.value;
  }
  if (value.pulseSource !== undefined) {
    if (!isRecord(value.pulseSource)) {
      return err(`${code}: entities[${index}].components.pulseSource must be an object`);
    }
    if (value.pulseSource.ability !== "pulse") {
      return err(`${code}: entities[${index}].components.pulseSource.ability must be "pulse"`);
    }
    const pulseSource: EntityPulseSourceComponent = { ability: "pulse" };
    components.pulseSource = pulseSource;
  }
  if (value.gate !== undefined) {
    if (!isRecord(value.gate)) {
      return err(`${code}: entities[${index}].components.gate must be an object`);
    }
    const gateId = readNonEmptyString(value.gate, "gateId", code, `entities[${index}].components.gate.gateId`);
    if (!gateId.ok) return err(gateId.error);
    const gate: EntityGateComponent = { gateId: gateId.value };
    components.gate = gate;
  }
  if (value.anchors !== undefined) {
    const anchors = parseAnchors(value.anchors, index, code);
    if (!anchors.ok) return err(anchors.error);
    components.anchors = anchors.value;
  }
  if (value.material !== undefined) {
    const material = parseMaterialBinding(
      value.material,
      `entities[${index}].components.material`,
    );
    if (!material.ok) return err(material.error);
    components.material = material.value;
  }
  return ok(components);
}

function parseEntity(
  value: unknown,
  index: number,
  code: string,
): Result<RoomEntity> {
  if (!isRecord(value)) {
    return err(`${code}: entities[${index}] must be an object`);
  }
  const id = readNonEmptyString(value, "id", code, `entities[${index}].id`);
  if (!id.ok) return err(id.error);
  const type = readNonEmptyString(value, "type", code, `entities[${index}].type`);
  if (!type.ok) return err(type.error);
  if (!ENTITY_TYPES.includes(type.value as RoomEntityType)) {
    return err(`${code}: entities[${index}].type "${type.value}" is not supported`);
  }
  const x = readNumber(value, "x", code, `entities[${index}].x`);
  if (!x.ok) return err(x.error);
  const y = readNumber(value, "y", code, `entities[${index}].y`);
  if (!y.ok) return err(y.error);

  const entity: RoomEntity = {
    id: id.value,
    type: type.value as RoomEntityType,
    x: x.value,
    y: y.value,
  };

  const sprite = readOptionalAssetId(
    value,
    "sprite",
    code,
    `entities[${index}].sprite`,
  );
  if (!sprite.ok) return err(sprite.error);
  if (sprite.value) entity.sprite = sprite.value;

  for (const key of ["dialogueId", "gateId", "conceptId", "label"] as const) {
    if (value[key] === undefined) continue;
    const field = readNonEmptyString(
      value,
      key,
      code,
      `entities[${index}].${key}`,
    );
    if (!field.ok) return err(field.error);
    entity[key] = field.value;
  }

  const properties = parseEntityProperties(
    value.properties,
    index,
    code,
  );
  if (!properties.ok) return err(properties.error);
  if (properties.value) entity.properties = properties.value;

  const components = parseEntityComponents(value.components, index, code);
  if (!components.ok) return err(components.error);
  if (components.value) entity.components = components.value;

  if (entity.type === "agent" && !entity.dialogueId) {
    return err(`${code}: entities[${index}] agent needs a dialogueId`);
  }
  if (entity.type === "gate" && !entity.gateId) {
    return err(`${code}: entities[${index}] gate needs a gateId`);
  }
  if (entity.type === "scanTarget" && !entity.conceptId) {
    return err(`${code}: entities[${index}] scanTarget needs a conceptId`);
  }
  if ((entity.type === "agent" || entity.type === "gate") && !entity.sprite) {
    return err(`${code}: entities[${index}] ${entity.type} needs a sprite asset ID`);
  }
  if (entity.type === "body" && !entity.components?.body) {
    return err(`${code}: entities[${index}] body needs components.body`);
  }
  if (entity.type === "prop" && !entity.components?.prop) {
    return err(`${code}: entities[${index}] prop needs components.prop`);
  }
  if (entity.type === "receptor" && !entity.components?.receptor) {
    return err(`${code}: entities[${index}] receptor needs components.receptor`);
  }
  if (entity.type === "pulseSource" && !entity.components?.pulseSource) {
    return err(`${code}: entities[${index}] pulseSource needs components.pulseSource`);
  }
  if (entity.type === "puzzleGate" && !entity.components?.gate) {
    return err(`${code}: entities[${index}] puzzleGate needs components.gate`);
  }

  return ok(entity);
}

export function parseRoom(value: unknown): Result<RoomDocument> {
  const code = "ROOM_SCHEMA_INVALID";

  if (!isRecord(value)) {
    return err(`${code}: room must be an object`);
  }
  if (!isSchemaVersionSupported(value.schemaVersion)) {
    return err(`${code}: unsupported schemaVersion ${String(value.schemaVersion)}`);
  }

  const id = readNonEmptyString(value, "id", code);
  if (!id.ok) return err(id.error);

  const title = readNonEmptyString(value, "title", code);
  if (!title.ok) return err(title.error);

  if (
    !isFiniteNumber(value.width) ||
    !isFiniteNumber(value.height) ||
    !isFiniteNumber(value.tileSize) ||
    value.width <= 0 ||
    value.height <= 0 ||
    value.tileSize <= 0
  ) {
    return err(`${code}: width, height, and tileSize must be positive numbers`);
  }

  const tileset = readAssetId(value, "tileset", code);
  if (!tileset.ok) return err(tileset.error);

  if (!isRecord(value.layers) || !Array.isArray(value.layers.tiles)) {
    return err(`${code}: layers.tiles must be an array of strings`);
  }

  if (value.layers.tiles.length !== value.height) {
    return err(`${code}: tile row count must equal height`);
  }

  const tiles: string[] = [];
  for (const [rowIndex, row] of value.layers.tiles.entries()) {
    if (typeof row !== "string" || row.length !== value.width) {
      return err(`${code}: tile row ${rowIndex} must be ${value.width} characters`);
    }
    tiles.push(row);
  }

  let tileMaterials: string[] | undefined;
  if (value.tileMaterials !== undefined) {
    if (!Array.isArray(value.tileMaterials)) {
      return err(`${code}: tileMaterials must be an array of strings`);
    }
    if (value.tileMaterials.length !== value.height) {
      return err(`${code}: tileMaterials row count must equal height`);
    }
    tileMaterials = [];
    for (const [rowIndex, row] of value.tileMaterials.entries()) {
      if (typeof row !== "string" || row.length !== value.width) {
        return err(
          `${code}: tileMaterials row ${rowIndex} must be ${value.width} characters`,
        );
      }
      tileMaterials.push(row);
    }
  }

  let tileMaterialLegend: Record<string, TileMaterialRule> | undefined;
  if (value.tileMaterialLegend !== undefined) {
    if (!isRecord(value.tileMaterialLegend)) {
      return err(`${code}: tileMaterialLegend must be an object`);
    }
    tileMaterialLegend = {};
    for (const [character, raw] of Object.entries(value.tileMaterialLegend)) {
      if (character.length !== 1 || character === " ") {
        return err(
          `${code}: tileMaterialLegend keys must be single non-space characters`,
        );
      }
      const rule = parseTileMaterialRule(
        raw,
        `tileMaterialLegend.${character}`,
      );
      if (!rule.ok) return err(rule.error);
      tileMaterialLegend[character] = rule.value;
    }
  }

  let defaultMaterialId: MaterialId | undefined;
  if (value.defaultMaterialId !== undefined) {
    const parsed = readNonEmptyString(value, "defaultMaterialId", code);
    if (!parsed.ok) return err(parsed.error);
    defaultMaterialId = parsed.value;
  }

  let materialSeed: number | undefined;
  if (value.materialSeed !== undefined) {
    const parsed = readInteger(value, "materialSeed", code);
    if (!parsed.ok) return err(parsed.error);
    materialSeed = parsed.value;
  }

  if (!isRecord(value.background)) {
    return err(`${code}: background must be an object`);
  }

  const backgroundId = readAssetId(value.background, "id", code);
  if (!backgroundId.ok) return err(backgroundId.error);

  if (!Array.isArray(value.background.layers) || value.background.layers.length === 0) {
    return err(`${code}: background.layers must be a non-empty array`);
  }

  const layers: RoomBackgroundLayer[] = [];
  for (const [index, rawLayer] of value.background.layers.entries()) {
    const layer = parseBackgroundLayer(rawLayer, index, code);
    if (!layer.ok) return err(layer.error);
    layers.push(layer.value);
  }

  if (!isRecord(value.spawns)) {
    return err(`${code}: spawns must be an object`);
  }

  const player1 = parseSpawn(value.spawns.player1, "player1", code);
  if (!player1.ok) return err(player1.error);
  const player2 = parseSpawn(value.spawns.player2, "player2", code);
  if (!player2.ok) return err(player2.error);

  const room: RoomDocument = {
    schemaVersion: value.schemaVersion,
    id: id.value,
    title: title.value,
    width: value.width,
    height: value.height,
    tileSize: value.tileSize,
    tileset: tileset.value,
    layers: { tiles },
    ...(tileMaterials ? { tileMaterials } : {}),
    ...(tileMaterialLegend ? { tileMaterialLegend } : {}),
    ...(defaultMaterialId ? { defaultMaterialId } : {}),
    ...(materialSeed !== undefined ? { materialSeed } : {}),
    background: { id: backgroundId.value, layers },
    spawns: { player1: player1.value, player2: player2.value },
  };

  if (value.checkpoints !== undefined) {
    if (!Array.isArray(value.checkpoints)) {
      return err(`${code}: checkpoints must be an array`);
    }
    const checkpoints: RoomCheckpoint[] = [];
    for (const [index, raw] of value.checkpoints.entries()) {
      const parsed = parseCheckpoint(raw, index, code);
      if (!parsed.ok) return err(parsed.error);
      checkpoints.push(parsed.value);
    }
    room.checkpoints = checkpoints;
  }

  if (value.exits !== undefined) {
    if (!Array.isArray(value.exits)) {
      return err(`${code}: exits must be an array`);
    }
    const exits: RoomExit[] = [];
    for (const [index, raw] of value.exits.entries()) {
      const parsed = parseExit(raw, index, code);
      if (!parsed.ok) return err(parsed.error);
      exits.push(parsed.value);
    }
    room.exits = exits;
  }

  if (value.entities !== undefined) {
    if (!Array.isArray(value.entities)) {
      return err(`${code}: entities must be an array`);
    }
    const entities: RoomEntity[] = [];
    for (const [index, raw] of value.entities.entries()) {
      const parsed = parseEntity(raw, index, code);
      if (!parsed.ok) return err(parsed.error);
      entities.push(parsed.value);
    }
    room.entities = entities;

    const bodies = new Map(
      entities
        .filter((entity) => entity.type === "body")
        .map((entity) => [entity.id, entity]),
    );
    const usedBodies = new Set<string>();
    for (const entity of entities) {
      if (entity.type !== "prop" || !entity.components?.prop) continue;
      const bodyId = entity.components.prop.bodyId;
      if (!bodies.has(bodyId)) {
        return err(
          `${code}: prop "${entity.id}" references missing body "${bodyId}"`,
        );
      }
      if (usedBodies.has(bodyId)) {
        return err(
          `${code}: body "${bodyId}" is referenced by more than one prop`,
        );
      }
      usedBodies.add(bodyId);
    }
  }

  if (value.triggers !== undefined) {
    if (!Array.isArray(value.triggers)) {
      return err(`${code}: triggers must be an array`);
    }
    const triggers: RoomTrigger[] = [];
    for (const [index, raw] of value.triggers.entries()) {
      const parsed = parseTrigger(raw, index, code);
      if (!parsed.ok) return err(parsed.error);
      triggers.push(parsed.value);
    }
    room.triggers = triggers;
  }

  if (value.music !== undefined) {
    const music = readAssetId(value, "music", code);
    if (!music.ok) return err(music.error);
    room.music = music.value;
  }

  if (value.ambience !== undefined) {
    const ambience = readAssetId(value, "ambience", code);
    if (!ambience.ok) return err(ambience.error);
    room.ambience = ambience.value;
  }

  return ok(room);
}

function parsePalette(value: unknown): Result<ThemePalette> {
  const code = "THEME_SCHEMA_INVALID";
  if (!isRecord(value)) {
    return err(`${code}: palette must be an object`);
  }

  const palette = {} as ThemePalette;
  for (const key of PALETTE_KEYS) {
    const color = value[key];
    if (!isHexColor(color)) {
      return err(`${code}: palette.${key} must be a 6-digit hex colour`);
    }
    palette[key] = color;
  }

  for (const key of PALETTE_RAMP_KEYS) {
    const color = value[key];
    if (color === undefined) {
      continue;
    }
    if (!isHexColor(color)) {
      return err(`${code}: palette.${key} must be a 6-digit hex colour`);
    }
    palette[key] = color;
  }

  return ok(palette);
}

function parseFonts(value: unknown): Result<ThemeFonts> {
  const code = "THEME_SCHEMA_INVALID";
  if (!isRecord(value)) {
    return err(`${code}: fonts must be an object`);
  }
  const ui = readNonEmptyString(value, "ui", code, "fonts.ui");
  if (!ui.ok) return err(ui.error);
  const display = readNonEmptyString(value, "display", code, "fonts.display");
  if (!display.ok) return err(display.error);
  return ok({ ui: ui.value, display: display.value });
}

function parseUiAssets(value: unknown): Result<Record<string, AssetId>> {
  const code = "THEME_SCHEMA_INVALID";
  if (value === undefined) {
    return ok({});
  }
  if (!isRecord(value)) {
    return err(`${code}: ui.assets must be an object`);
  }

  const assets: Record<string, AssetId> = {};
  for (const [key, assetId] of Object.entries(value)) {
    if (!isAssetId(assetId)) {
      return err(`${code}: ui.assets.${key} must be a logical asset ID`);
    }
    assets[key] = assetId;
  }
  return ok(assets);
}

function parseUiMaterials(value: unknown): Result<Record<string, MaterialId>> {
  const code = "THEME_SCHEMA_INVALID";
  if (value === undefined) {
    return ok({});
  }
  if (!isRecord(value)) {
    return err(`${code}: ui.materials must be an object`);
  }
  const materials: Record<string, MaterialId> = {};
  for (const [slot, materialId] of Object.entries(value)) {
    if (typeof materialId !== "string" || materialId.trim() === "") {
      return err(`${code}: ui.materials.${slot} must be a non-empty material ID`);
    }
    materials[slot] = materialId;
  }
  return ok(materials);
}

function parseUiPatterns(value: unknown): Result<Record<string, PatternBinding>> {
  const code = "THEME_SCHEMA_INVALID";
  if (value === undefined) {
    return ok({});
  }
  if (!isRecord(value)) {
    return err(`${code}: ui.patterns must be an object`);
  }
  const patterns: Record<string, PatternBinding> = {};
  for (const [slot, raw] of Object.entries(value)) {
    const parsed = parsePatternBinding(raw, `ui.patterns.${slot}`);
    if (!parsed.ok) return err(`${code}: ${parsed.error}`);
    patterns[slot] = parsed.value;
  }
  return ok(patterns);
}

function parseAudio(value: unknown): Result<ThemeDocument["audio"]> {
  const code = "THEME_SCHEMA_INVALID";
  if (value === undefined) {
    return ok(undefined);
  }
  if (!isRecord(value)) {
    return err(`${code}: audio must be an object`);
  }

  const audio: NonNullable<ThemeDocument["audio"]> = {};

  if (value.music !== undefined) {
    if (!isAssetId(value.music)) {
      return err(`${code}: audio.music must be a logical asset ID`);
    }
    audio.music = value.music;
  }

  if (value.cues !== undefined) {
    if (!isRecord(value.cues)) {
      return err(`${code}: audio.cues must be an object`);
    }
    const cues: Record<string, AssetId> = {};
    for (const [key, assetId] of Object.entries(value.cues)) {
      if (!isAssetId(assetId)) {
        return err(`${code}: audio.cues.${key} must be a logical asset ID`);
      }
      cues[key] = assetId;
    }
    audio.cues = cues;
  }

  return ok(audio);
}

export function parseTheme(value: unknown): Result<ThemeDocument> {
  const code = "THEME_SCHEMA_INVALID";

  if (!isRecord(value)) {
    return err(`${code}: theme must be an object`);
  }
  if (!isSchemaVersionSupported(value.schemaVersion)) {
    return err(`${code}: unsupported schemaVersion ${String(value.schemaVersion)}`);
  }

  const id = readNonEmptyString(value, "id", code);
  if (!id.ok) return err(id.error);

  const palette = parsePalette(value.palette);
  if (!palette.ok) return err(palette.error);

  const fonts = parseFonts(value.fonts);
  if (!fonts.ok) return err(fonts.error);

  if (!isRecord(value.ui)) {
    return err(`${code}: ui must be an object`);
  }
  if (!isFiniteNumber(value.ui.radius) || !isFiniteNumber(value.ui.border)) {
    return err(`${code}: ui.radius and ui.border must be numeric`);
  }
  if (!isFiniteNumber(value.ui.fontScale) || value.ui.fontScale <= 0) {
    return err(`${code}: ui.fontScale must be positive`);
  }
  if (typeof value.ui.reducedMotion !== "boolean") {
    return err(`${code}: ui.reducedMotion must be boolean`);
  }

  const uiAssets = parseUiAssets(value.ui.assets);
  if (!uiAssets.ok) return err(uiAssets.error);
  const uiMaterials = parseUiMaterials(value.ui.materials);
  if (!uiMaterials.ok) return err(uiMaterials.error);
  const uiPatterns = parseUiPatterns(value.ui.patterns);
  if (!uiPatterns.ok) return err(uiPatterns.error);

  const audio = parseAudio(value.audio);
  if (!audio.ok) return err(audio.error);

  return ok({
    schemaVersion: value.schemaVersion,
    id: id.value,
    palette: palette.value,
    fonts: fonts.value,
    ui: {
      radius: value.ui.radius,
      border: value.ui.border,
      fontScale: value.ui.fontScale,
      reducedMotion: value.ui.reducedMotion,
      assets: uiAssets.value,
      ...(Object.keys(uiMaterials.value).length > 0
        ? { materials: uiMaterials.value }
        : {}),
      ...(Object.keys(uiPatterns.value).length > 0
        ? { patterns: uiPatterns.value }
        : {}),
    },
    ...(audio.value ? { audio: audio.value } : {}),
  });
}

export async function loadRoom(
  url: string,
  fetchImpl: typeof fetch = fetch,
): Promise<Result<RoomDocument>> {
  const data = await parseJsonUrl(url, fetchImpl);
  if (!data.ok) return err(data.error);
  return parseRoom(data.value);
}

export async function loadTheme(
  url: string,
  fetchImpl: typeof fetch = fetch,
): Promise<Result<ThemeDocument>> {
  const data = await parseJsonUrl(url, fetchImpl);
  if (!data.ok) return err(data.error);
  return parseTheme(data.value);
}

export function collectRoomAssetIds(room: RoomDocument): AssetId[] {
  const ids = new Set<AssetId>();
  ids.add(room.tileset);
  for (const layer of room.background.layers) {
    ids.add(layer.assetId);
  }
  for (const entity of room.entities ?? []) {
    if (entity.sprite) {
      ids.add(entity.sprite);
    }
  }
  if (room.music) {
    ids.add(room.music);
  }
  if (room.ambience) {
    ids.add(room.ambience);
  }
  return [...ids];
}

export function collectThemeAssetIds(theme: ThemeDocument): AssetId[] {
  const ids = new Set<AssetId>();
  for (const assetId of Object.values(theme.ui.assets)) {
    ids.add(assetId);
  }
  if (theme.audio?.music) {
    ids.add(theme.audio.music);
  }
  for (const cue of Object.values(theme.audio?.cues ?? {})) {
    ids.add(cue);
  }
  return [...ids];
}

export function collectRoomMaterialAssetIds(room: RoomDocument): AssetId[] {
  const ids = new Set<AssetId>();
  for (const rule of Object.values(room.tileMaterialLegend ?? {})) {
    for (const variant of rule.variants ?? []) {
      ids.add(variant.assetId);
    }
  }
  return [...ids];
}

export function collectMaterialAssetIds(
  materials: MaterialsDocument | undefined,
): AssetId[] {
  const ids = new Set<AssetId>();
  if (!materials) return [];
  for (const pattern of Object.values(materials.patterns ?? {})) {
    if (pattern.source.kind === "image" || pattern.source.kind === "atlas") {
      ids.add(pattern.source.assetId);
    }
  }
  for (const set of Object.values(materials.variantSets ?? {})) {
    if (set.atlas) ids.add(set.atlas);
    for (const frame of Object.values(set.frames)) ids.add(frame.assetId);
    ids.add(set.fallback.assetId);
  }
  for (const material of Object.values(materials.materials)) {
    for (const variant of material.variants ?? []) ids.add(variant.assetId);
  }
  return [...ids];
}

/** Kept exported for validator and script callers that used the M0 helper. */
export function readRecordBoolean(
  record: UnknownRecord,
  key: string,
  code: string,
): Result<boolean> {
  return readBoolean(record, key, code);
}

/** Kept exported for validator and script callers that used the M0 helper. */
export function readRecordInteger(
  record: UnknownRecord,
  key: string,
  code: string,
): Result<number> {
  return readInteger(record, key, code);
}

/** Kept exported for validator and script callers that used the M0 helper. */
export function readRecordString(
  record: UnknownRecord,
  key: string,
  code: string,
): Result<string> {
  return readNonEmptyString(record, key, code);
}

/** Kept exported for validator and script callers that used the M0 helper. */
export function readRecordOptionalString(
  record: UnknownRecord,
  key: string,
  code: string,
): Result<string | undefined> {
  return readOptionalString(record, key, code);
}

/** Kept exported for validator and script callers that used the M0 helper. */
export function readRecordStrings(
  record: UnknownRecord,
  key: string,
  code: string,
): Result<string[]> {
  return readStringArray(record, key, code);
}

/** Kept exported for validator and script callers that used the M0 helper. */
export function readRecordAssetId(
  record: UnknownRecord,
  key: string,
  code: string,
): Result<AssetId> {
  return readAssetId(record, key, code);
}

/** Kept exported for validator and script callers that used the M0 helper. */
export function readRecordNumber(
  record: UnknownRecord,
  key: string,
  code: string,
): Result<number> {
  return readNumber(record, key, code);
}
