import type { AtlasFrameRef } from "../assets";
import { err, ok, type Result } from "../core/result";
import {
  isAssetId,
  isFiniteNumber,
  isRecord,
  isSchemaVersionSupported,
  readInteger,
  readNonEmptyString,
  readNumber,
  readOptionalString,
  readStringArray,
  type UnknownRecord,
} from "./parse-common";
import {
  AUTOTILE_RULES,
  MATERIAL_EDGES,
  MATERIAL_FAMILIES,
  PATTERN_ANIMATIONS,
  PATTERN_BLENDS,
  PATTERN_GENERATORS,
  PATTERN_SPACES,
  type MaterialBinding,
  type MaterialDefinition,
  type MaterialsDocument,
  type PatternBinding,
  type PatternDefinition,
  type PatternSource,
  type TileMaterialRule,
  type TileVariantSet,
} from "../materials";

const CODE = "MATERIALS_SCHEMA_INVALID";

function rejectUnknown(
  value: UnknownRecord,
  allowed: readonly string[],
  label: string,
): Result<void> {
  const known = new Set(allowed);
  for (const key of Object.keys(value)) {
    if (!known.has(key)) {
      return err(`${CODE}: ${label}.${key} is not supported`);
    }
  }
  return ok(undefined);
}

function readEnum<T extends string>(
  value: unknown,
  allowed: readonly T[],
  label: string,
): Result<T> {
  if (typeof value !== "string" || !allowed.includes(value as T)) {
    return err(`${CODE}: ${label} must be one of ${allowed.join(", ")}`);
  }
  return ok(value as T);
}

function readOptionalNumber(
  record: UnknownRecord,
  key: string,
  label: string,
): Result<number | undefined> {
  if (record[key] === undefined) return ok(undefined);
  return readNumber(record, key, CODE, label);
}

function readOptionalInteger(
  record: UnknownRecord,
  key: string,
  label: string,
): Result<number | undefined> {
  if (record[key] === undefined) return ok(undefined);
  return readInteger(record, key, CODE, label);
}

export function parseAtlasFrameRef(
  value: unknown,
  label: string,
): Result<AtlasFrameRef> {
  if (!isRecord(value)) {
    return err(`${CODE}: ${label} must be an atlas frame reference`);
  }
  if (value.kind === "asset") {
    if (!isAssetId(value.assetId)) {
      return err(`${CODE}: ${label}.assetId must be a logical asset ID`);
    }
    return ok({ kind: "asset", assetId: value.assetId });
  }
  if (value.kind === "atlas") {
    if (!isAssetId(value.assetId)) {
      return err(`${CODE}: ${label}.assetId must be a logical asset ID`);
    }
    if (typeof value.frame !== "string" || value.frame.trim() === "") {
      return err(`${CODE}: ${label}.frame must be a non-empty string`);
    }
    return ok({ kind: "atlas", assetId: value.assetId, frame: value.frame });
  }
  return err(`${CODE}: ${label}.kind must be "asset" or "atlas"`);
}

function parseFrameList(
  value: unknown,
  label: string,
): Result<AtlasFrameRef[] | undefined> {
  if (value === undefined) return ok(undefined);
  if (!Array.isArray(value) || value.length === 0) {
    return err(`${CODE}: ${label} must be a non-empty array`);
  }
  const refs: AtlasFrameRef[] = [];
  for (const [index, entry] of value.entries()) {
    const ref = parseAtlasFrameRef(entry, `${label}[${index}]`);
    if (!ref.ok) return ref;
    refs.push(ref.value);
  }
  return ok(refs);
}

function parseOffset(
  value: unknown,
  label: string,
): Result<{ x: number; y: number }> {
  if (!isRecord(value)) {
    return err(`${CODE}: ${label} must be an object`);
  }
  if (!isFiniteNumber(value.x) || !isFiniteNumber(value.y)) {
    return err(`${CODE}: ${label}.x/y must be finite numbers`);
  }
  return ok({ x: value.x, y: value.y });
}

export function parsePatternOverrides(
  value: unknown,
  label: string,
): Result<Omit<PatternBinding, "patternId">> {
  if (!isRecord(value)) {
    return err(`${CODE}: ${label} must be an object`);
  }
  const unknown = rejectUnknown(
    value,
    ["space", "scale", "rotation", "offset", "seed", "opacity", "blend"],
    label,
  );
  if (!unknown.ok) return unknown;

  const overrides: Omit<PatternBinding, "patternId"> = {};
  if (value.space !== undefined) {
    const space = readEnum(value.space, PATTERN_SPACES, `${label}.space`);
    if (!space.ok) return space;
    overrides.space = space.value;
  }
  if (value.scale !== undefined) {
    const scale = readNumber(value, "scale", CODE, `${label}.scale`);
    if (!scale.ok) return scale;
    if (scale.value <= 0) {
      return err(`${CODE}: ${label}.scale must be positive`);
    }
    overrides.scale = scale.value;
  }
  if (value.rotation !== undefined) {
    const rotation = readNumber(value, "rotation", CODE, `${label}.rotation`);
    if (!rotation.ok) return rotation;
    overrides.rotation = rotation.value;
  }
  if (value.offset !== undefined) {
    const offset = parseOffset(value.offset, `${label}.offset`);
    if (!offset.ok) return offset;
    overrides.offset = offset.value;
  }
  const seed = readOptionalInteger(value, "seed", `${label}.seed`);
  if (!seed.ok) return seed;
  if (seed.value !== undefined) overrides.seed = seed.value;
  if (value.opacity !== undefined) {
    const opacity = readNumber(value, "opacity", CODE, `${label}.opacity`);
    if (!opacity.ok) return opacity;
    if (opacity.value < 0 || opacity.value > 1) {
      return err(`${CODE}: ${label}.opacity must be 0..1`);
    }
    overrides.opacity = opacity.value;
  }
  if (value.blend !== undefined) {
    const blend = readEnum(value.blend, PATTERN_BLENDS, `${label}.blend`);
    if (!blend.ok) return blend;
    overrides.blend = blend.value;
  }
  return ok(overrides);
}

export function parsePatternBinding(
  value: unknown,
  label: string,
  requirePattern = true,
): Result<PatternBinding> {
  if (!isRecord(value)) {
    return err(`${CODE}: ${label} must be an object`);
  }
  const allowed = requirePattern
    ? ["patternId", "space", "scale", "rotation", "offset", "seed", "opacity", "blend"]
    : ["space", "scale", "rotation", "offset", "seed", "opacity", "blend"];
  const unknown = rejectUnknown(value, allowed, label);
  if (!unknown.ok) return unknown;

  let patternId = "";
  if (requirePattern) {
    const id = readNonEmptyString(value, "patternId", CODE, `${label}.patternId`);
    if (!id.ok) return id;
    patternId = id.value;
  }
  const overrides = parsePatternOverrides(
    Object.fromEntries(
      Object.entries(value).filter(([key]) => key !== "patternId"),
    ),
    label,
  );
  if (!overrides.ok) return overrides;
  return ok({ patternId, ...overrides.value });
}

export function parseMaterialBinding(
  value: unknown,
  label = "material",
): Result<MaterialBinding> {
  if (!isRecord(value)) {
    return err(`${CODE}: ${label} must be an object`);
  }
  const unknown = rejectUnknown(
    value,
    ["materialId", "patternId", "pattern", "tint"],
    label,
  );
  if (!unknown.ok) return unknown;

  const materialId = readNonEmptyString(
    value,
    "materialId",
    CODE,
    `${label}.materialId`,
  );
  if (!materialId.ok) return materialId;
  const patternId = readOptionalString(
    value,
    "patternId",
    CODE,
    `${label}.patternId`,
  );
  if (!patternId.ok) return patternId;
  const tint = readOptionalString(value, "tint", CODE, `${label}.tint`);
  if (!tint.ok) return tint;

  const binding: MaterialBinding = { materialId: materialId.value };
  if (patternId.value) binding.patternId = patternId.value;
  if (value.pattern !== undefined) {
    const pattern = parsePatternOverrides(value.pattern, `${label}.pattern`);
    if (!pattern.ok) return pattern;
    binding.pattern = pattern.value;
  }
  if (tint.value) binding.tint = tint.value;
  return ok(binding);
}

export function parseTileMaterialRule(
  value: unknown,
  label: string,
): Result<TileMaterialRule> {
  if (!isRecord(value)) {
    return err(`${CODE}: ${label} must be an object`);
  }
  const unknown = rejectUnknown(
    value,
    ["materialId", "autotile", "variantSet", "variants", "patternId", "tint"],
    label,
  );
  if (!unknown.ok) return unknown;

  const materialId = readNonEmptyString(
    value,
    "materialId",
    CODE,
    `${label}.materialId`,
  );
  if (!materialId.ok) return materialId;
  const autotile = readEnum(value.autotile, AUTOTILE_RULES, `${label}.autotile`);
  if (!autotile.ok) return autotile;
  const variantSet = readOptionalString(
    value,
    "variantSet",
    CODE,
    `${label}.variantSet`,
  );
  if (!variantSet.ok) return variantSet;
  const variants = parseFrameList(value.variants, `${label}.variants`);
  if (!variants.ok) return variants;
  const patternId = readOptionalString(
    value,
    "patternId",
    CODE,
    `${label}.patternId`,
  );
  if (!patternId.ok) return patternId;
  const tint = readOptionalString(value, "tint", CODE, `${label}.tint`);
  if (!tint.ok) return tint;

  return ok({
    materialId: materialId.value,
    autotile: autotile.value,
    ...(variantSet.value ? { variantSet: variantSet.value } : {}),
    ...(variants.value ? { variants: variants.value } : {}),
    ...(patternId.value ? { patternId: patternId.value } : {}),
    ...(tint.value ? { tint: tint.value } : {}),
  });
}

function parsePatternSource(value: unknown, label: string): Result<PatternSource> {
  if (!isRecord(value)) {
    return err(`${CODE}: ${label} must be an object`);
  }
  if (value.kind === "procedural") {
    const unknown = rejectUnknown(value, ["kind", "generator", "seed"], label);
    if (!unknown.ok) return unknown;
    const generator = readEnum(
      value.generator,
      PATTERN_GENERATORS,
      `${label}.generator`,
    );
    if (!generator.ok) return generator;
    const seed = readInteger(value, "seed", CODE, `${label}.seed`);
    if (!seed.ok) return seed;
    return ok({ kind: "procedural", generator: generator.value, seed: seed.value });
  }
  if (value.kind === "image") {
    const unknown = rejectUnknown(value, ["kind", "assetId"], label);
    if (!unknown.ok) return unknown;
    if (!isAssetId(value.assetId)) {
      return err(`${CODE}: ${label}.assetId must be a logical asset ID`);
    }
    return ok({ kind: "image", assetId: value.assetId });
  }
  if (value.kind === "atlas") {
    const unknown = rejectUnknown(value, ["kind", "assetId", "frame"], label);
    if (!unknown.ok) return unknown;
    if (!isAssetId(value.assetId)) {
      return err(`${CODE}: ${label}.assetId must be a logical asset ID`);
    }
    if (typeof value.frame !== "string" || value.frame.trim() === "") {
      return err(`${CODE}: ${label}.frame must be a non-empty string`);
    }
    return ok({ kind: "atlas", assetId: value.assetId, frame: value.frame });
  }
  return err(`${CODE}: ${label}.kind must be procedural, image, or atlas`);
}

function parsePatternDefinition(
  id: string,
  value: unknown,
): Result<PatternDefinition> {
  if (!isRecord(value)) {
    return err(`${CODE}: patterns.${id} must be an object`);
  }
  const unknown = rejectUnknown(
    value,
    ["id", "family", "source", "space", "scale", "direction", "contrast", "blend", "animation"],
    `patterns.${id}`,
  );
  if (!unknown.ok) return unknown;
  if (value.id !== undefined && value.id !== id) {
    return err(`${CODE}: patterns.${id}.id must match its key`);
  }
  const family = readEnum(value.family, MATERIAL_FAMILIES, `patterns.${id}.family`);
  if (!family.ok) return family;
  const source = parsePatternSource(value.source, `patterns.${id}.source`);
  if (!source.ok) return source;
  const space = readEnum(value.space, PATTERN_SPACES, `patterns.${id}.space`);
  if (!space.ok) return space;
  const scale = readNumber(value, "scale", CODE, `patterns.${id}.scale`);
  if (!scale.ok) return scale;
  if (scale.value <= 0) {
    return err(`${CODE}: patterns.${id}.scale must be positive`);
  }
  const direction = readOptionalNumber(value, "direction", `patterns.${id}.direction`);
  if (!direction.ok) return direction;
  const contrast = readOptionalNumber(value, "contrast", `patterns.${id}.contrast`);
  if (!contrast.ok) return contrast;
  if (contrast.value !== undefined && (contrast.value < 0 || contrast.value > 1)) {
    return err(`${CODE}: patterns.${id}.contrast must be 0..1`);
  }
  let blend: PatternDefinition["blend"];
  if (value.blend !== undefined) {
    const parsed = readEnum(value.blend, PATTERN_BLENDS, `patterns.${id}.blend`);
    if (!parsed.ok) return parsed;
    blend = parsed.value;
  }

  let animation: PatternDefinition["animation"];
  if (value.animation !== undefined) {
    if (!isRecord(value.animation)) {
      return err(`${CODE}: patterns.${id}.animation must be an object`);
    }
    const animationUnknown = rejectUnknown(
      value.animation,
      ["kind", "speed"],
      `patterns.${id}.animation`,
    );
    if (!animationUnknown.ok) return animationUnknown;
    const kind = readEnum(
      value.animation.kind,
      PATTERN_ANIMATIONS,
      `patterns.${id}.animation.kind`,
    );
    if (!kind.ok) return kind;
    const speed = readNumber(
      value.animation,
      "speed",
      CODE,
      `patterns.${id}.animation.speed`,
    );
    if (!speed.ok) return speed;
    if (speed.value <= 0) {
      return err(`${CODE}: patterns.${id}.animation.speed must be positive`);
    }
    animation = { kind: kind.value, speed: speed.value };
  }

  return ok({
    id,
    family: family.value,
    source: source.value,
    space: space.value,
    scale: scale.value,
    ...(direction.value !== undefined ? { direction: direction.value } : {}),
    ...(contrast.value !== undefined ? { contrast: contrast.value } : {}),
    ...(blend ? { blend } : {}),
    ...(animation ? { animation } : {}),
  });
}

function parseMaterialDefinition(
  id: string,
  value: unknown,
): Result<MaterialDefinition> {
  if (!isRecord(value)) {
    return err(`${CODE}: materials.${id} must be an object`);
  }
  const unknown = rejectUnknown(
    value,
    ["id", "family", "palette", "edge", "patternId", "direction", "autotile", "variants", "variantSet", "tint"],
    `materials.${id}`,
  );
  if (!unknown.ok) return unknown;
  if (value.id !== undefined && value.id !== id) {
    return err(`${CODE}: materials.${id}.id must match its key`);
  }
  const family = readEnum(value.family, MATERIAL_FAMILIES, `materials.${id}.family`);
  if (!family.ok) return family;
  const palette = readStringArray(
    value,
    "palette",
    CODE,
    `materials.${id}.palette`,
  );
  if (!palette.ok) return palette;
  const edge = readEnum(value.edge, MATERIAL_EDGES, `materials.${id}.edge`);
  if (!edge.ok) return edge;
  const patternId = readOptionalString(
    value,
    "patternId",
    CODE,
    `materials.${id}.patternId`,
  );
  if (!patternId.ok) return patternId;
  const direction = readOptionalNumber(value, "direction", `materials.${id}.direction`);
  if (!direction.ok) return direction;
  let autotile: MaterialDefinition["autotile"];
  if (value.autotile !== undefined) {
    const parsed = readEnum(
      value.autotile,
      AUTOTILE_RULES,
      `materials.${id}.autotile`,
    );
    if (!parsed.ok) return parsed;
    autotile = parsed.value;
  }
  const variants = parseFrameList(value.variants, `materials.${id}.variants`);
  if (!variants.ok) return variants;
  const variantSet = readOptionalString(
    value,
    "variantSet",
    CODE,
    `materials.${id}.variantSet`,
  );
  if (!variantSet.ok) return variantSet;
  const tint = readOptionalString(value, "tint", CODE, `materials.${id}.tint`);
  if (!tint.ok) return tint;

  return ok({
    id,
    family: family.value,
    palette: palette.value,
    edge: edge.value,
    ...(patternId.value ? { patternId: patternId.value } : {}),
    ...(direction.value !== undefined ? { direction: direction.value } : {}),
    ...(autotile ? { autotile } : {}),
    ...(variants.value ? { variants: variants.value } : {}),
    ...(variantSet.value ? { variantSet: variantSet.value } : {}),
    ...(tint.value ? { tint: tint.value } : {}),
  });
}

function parseVariantSet(id: string, value: unknown): Result<TileVariantSet> {
  if (!isRecord(value)) {
    return err(`${CODE}: variantSets.${id} must be an object`);
  }
  const unknown = rejectUnknown(
    value,
    ["id", "materialId", "rule", "atlas", "frames", "fallback"],
    `variantSets.${id}`,
  );
  if (!unknown.ok) return unknown;
  if (value.id !== undefined && value.id !== id) {
    return err(`${CODE}: variantSets.${id}.id must match its key`);
  }
  const materialId = readNonEmptyString(
    value,
    "materialId",
    CODE,
    `variantSets.${id}.materialId`,
  );
  if (!materialId.ok) return materialId;
  const rule = readEnum(
    value.rule,
    ["edge", "corner", "blob47", "wang"] as const,
    `variantSets.${id}.rule`,
  );
  if (!rule.ok) return rule;
  let atlas: string | undefined;
  if (value.atlas !== undefined) {
    if (!isAssetId(value.atlas)) {
      return err(`${CODE}: variantSets.${id}.atlas must be a logical asset ID`);
    }
    atlas = value.atlas;
  }
  if (!isRecord(value.frames)) {
    return err(`${CODE}: variantSets.${id}.frames must be an object`);
  }
  const frames: Record<string, AtlasFrameRef> = {};
  for (const [key, raw] of Object.entries(value.frames)) {
    if (key.trim() === "") {
      return err(`${CODE}: variantSets.${id}.frames keys must be non-empty`);
    }
    const frame = parseAtlasFrameRef(raw, `variantSets.${id}.frames.${key}`);
    if (!frame.ok) return frame;
    frames[key] = frame.value;
  }
  if (Object.keys(frames).length === 0) {
    return err(`${CODE}: variantSets.${id}.frames must not be empty`);
  }
  const fallback = parseAtlasFrameRef(
    value.fallback,
    `variantSets.${id}.fallback`,
  );
  if (!fallback.ok) return fallback;

  return ok({
    id,
    materialId: materialId.value,
    rule: rule.value,
    ...(atlas ? { atlas } : {}),
    frames,
    fallback: fallback.value,
  });
}

export function parseMaterials(value: unknown): Result<MaterialsDocument> {
  if (!isRecord(value)) {
    return err(`${CODE}: materials document must be an object`);
  }
  const unknown = rejectUnknown(
    value,
    ["schemaVersion", "id", "materials", "patterns", "variantSets"],
    "document",
  );
  if (!unknown.ok) return unknown;
  if (!isSchemaVersionSupported(value.schemaVersion)) {
    return err(
      `${CODE}: unsupported schemaVersion ${String(value.schemaVersion)}`,
    );
  }
  const id = readNonEmptyString(value, "id", CODE, "id");
  if (!id.ok) return id;
  if (!isRecord(value.materials) || Object.keys(value.materials).length === 0) {
    return err(`${CODE}: materials must be a non-empty object`);
  }

  const materials: Record<string, MaterialDefinition> = {};
  for (const [materialId, raw] of Object.entries(value.materials)) {
    if (materialId.trim() === "") {
      return err(`${CODE}: material IDs must be non-empty`);
    }
    const parsed = parseMaterialDefinition(materialId, raw);
    if (!parsed.ok) return parsed;
    materials[materialId] = parsed.value;
  }

  const patterns: Record<string, PatternDefinition> = {};
  if (value.patterns !== undefined) {
    if (!isRecord(value.patterns)) {
      return err(`${CODE}: patterns must be an object`);
    }
    for (const [patternId, raw] of Object.entries(value.patterns)) {
      if (patternId.trim() === "") {
        return err(`${CODE}: pattern IDs must be non-empty`);
      }
      const parsed = parsePatternDefinition(patternId, raw);
      if (!parsed.ok) return parsed;
      patterns[patternId] = parsed.value;
    }
  }

  const variantSets: Record<string, TileVariantSet> = {};
  if (value.variantSets !== undefined) {
    if (!isRecord(value.variantSets)) {
      return err(`${CODE}: variantSets must be an object`);
    }
    for (const [setId, raw] of Object.entries(value.variantSets)) {
      if (setId.trim() === "") {
        return err(`${CODE}: variant set IDs must be non-empty`);
      }
      const parsed = parseVariantSet(setId, raw);
      if (!parsed.ok) return parsed;
      variantSets[setId] = parsed.value;
    }
  }

  return ok({
    schemaVersion: value.schemaVersion,
    id: id.value,
    materials,
    patterns,
    variantSets,
  });
}

export function loadMaterials(
  url: string,
  fetchImpl: typeof fetch = fetch,
): Promise<Result<MaterialsDocument>> {
  return (async () => {
    let response: Response;
    try {
      response = await fetchImpl(url, { cache: "no-cache" });
    } catch (error) {
      return err(
        `MATERIALS_FETCH_FAILED: ${url} (${error instanceof Error ? error.message : String(error)})`,
      );
    }
    if (!response.ok) {
      return err(`MATERIALS_FETCH_FAILED: ${url} (${response.status})`);
    }
    try {
      return parseMaterials(await response.json());
    } catch {
      return err(`MATERIALS_JSON_INVALID: ${url}`);
    }
  })();
}
