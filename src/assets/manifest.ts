import { err, ok, type Result } from "../core/result";
import {
  ASSET_SCHEMA_VERSION,
  ASSET_TYPES,
  type AssetManifest,
  type AssetType,
  type ManifestAssetEntry,
  type ManifestLoadResult,
} from "./types";

type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isAssetType(value: unknown): value is AssetType {
  return typeof value === "string" && ASSET_TYPES.includes(value as AssetType);
}

function isSchemaVersionSupported(value: unknown): value is string {
  return typeof value === "string" && /^1\.\d+$/.test(value);
}

function isPositiveInteger(value: unknown): value is number {
  return (
    typeof value === "number" &&
    Number.isFinite(value) &&
    Number.isInteger(value) &&
    value > 0
  );
}

function parseAtlasRegions(
  id: string,
  raw: unknown,
): Result<Record<string, { x: number; y: number; width: number; height: number }>> {
  if (!isRecord(raw)) {
    return err(`ASSET_MANIFEST_INVALID: ${id} atlas regions must be an object`);
  }

  const regions: Record<
    string,
    { x: number; y: number; width: number; height: number }
  > = {};
  for (const [name, value] of Object.entries(raw)) {
    if (name.trim() === "") {
      return err(`ASSET_MANIFEST_INVALID: ${id} atlas region names must be non-empty`);
    }
    if (!isRecord(value)) {
      return err(
        `ASSET_MANIFEST_INVALID: ${id} atlas region "${name}" must be an object`,
      );
    }
    if (
      !Number.isInteger(value.x) ||
      !Number.isInteger(value.y) ||
      (value.x as number) < 0 ||
      (value.y as number) < 0 ||
      !isPositiveInteger(value.width) ||
      !isPositiveInteger(value.height)
    ) {
      return err(
        `ASSET_MANIFEST_INVALID: ${id} atlas region "${name}" needs non-negative integer x/y and positive integer width/height`,
      );
    }
    regions[name] = {
      x: value.x as number,
      y: value.y as number,
      width: value.width,
      height: value.height,
    };
  }

  if (Object.keys(regions).length === 0) {
    return err(`ASSET_MANIFEST_INVALID: ${id} atlas requires at least one region`);
  }

  return ok(regions);
}

function parseEntry(
  id: string,
  raw: unknown,
  manifestUrl: URL,
): Result<ManifestAssetEntry, string> {
  if (!isRecord(raw)) {
    return err(`ASSET_MANIFEST_INVALID: ${id} must be an object`);
  }

  if (!isAssetType(raw.type)) {
    return err(
      `ASSET_FORMAT_UNSUPPORTED: ${id} has unsupported type ${String(raw.type)}`,
    );
  }

  const type = raw.type;
  const entry: ManifestAssetEntry = { type };

  for (const key of ["width", "height"] as const) {
    if (raw[key] === undefined) continue;
    if (!isPositiveInteger(raw[key])) {
      return err(`ASSET_MANIFEST_INVALID: ${id} has invalid ${key}`);
    }
    entry[key] = raw[key];
  }

  if (raw.src !== undefined) {
    if (typeof raw.src !== "string" || raw.src.trim() === "") {
      return err(`ASSET_FILE_MISSING: ${id} has an empty src`);
    }

    let resolved: URL;
    try {
      resolved = new URL(raw.src, manifestUrl);
    } catch {
      return err(`ASSET_FILE_MISSING: ${id} has an invalid src`);
    }

    if (resolved.origin !== manifestUrl.origin) {
      return err(
        `ASSET_FILE_MISSING: ${id} must resolve to a same-origin static file`,
      );
    }

    entry.src = resolved.toString();
  } else if (raw.placeholder !== true) {
    return err(`ASSET_FILE_MISSING: ${id} has no src and is not a placeholder`);
  }

  if (raw.frameWidth !== undefined) {
    if (!isFiniteNumber(raw.frameWidth) || raw.frameWidth <= 0) {
      return err(`ASSET_MANIFEST_INVALID: ${id} has invalid frameWidth`);
    }
    entry.frameWidth = raw.frameWidth;
  }

  if (raw.frameHeight !== undefined) {
    if (!isFiniteNumber(raw.frameHeight) || raw.frameHeight <= 0) {
      return err(`ASSET_MANIFEST_INVALID: ${id} has invalid frameHeight`);
    }
    entry.frameHeight = raw.frameHeight;
  }

  if (raw.frames !== undefined) {
    if (!isFiniteNumber(raw.frames) || raw.frames <= 0 || !Number.isInteger(raw.frames)) {
      return err(`ASSET_MANIFEST_INVALID: ${id} has invalid frame count`);
    }
    entry.frames = raw.frames;
  }

  if (raw.fps !== undefined) {
    if (!isFiniteNumber(raw.fps) || raw.fps <= 0) {
      return err(`ASSET_MANIFEST_INVALID: ${id} has invalid fps`);
    }
    entry.fps = raw.fps;
  }

  if (raw.loop !== undefined) {
    if (typeof raw.loop !== "boolean") {
      return err(`ASSET_MANIFEST_INVALID: ${id} has invalid loop flag`);
    }
    entry.loop = raw.loop;
  }

  if (raw.anchor !== undefined) {
    if (
      !Array.isArray(raw.anchor) ||
      raw.anchor.length !== 2 ||
      !isFiniteNumber(raw.anchor[0]) ||
      !isFiniteNumber(raw.anchor[1])
    ) {
      return err(`ASSET_MANIFEST_INVALID: ${id} has an invalid anchor`);
    }
    entry.anchor = [raw.anchor[0], raw.anchor[1]];
  }

  if (raw.placeholder !== undefined) {
    if (typeof raw.placeholder !== "boolean") {
      return err(`ASSET_MANIFEST_INVALID: ${id} has invalid placeholder flag`);
    }
    entry.placeholder = raw.placeholder;
  }

  if (raw.license !== undefined) {
    if (typeof raw.license !== "string") {
      return err(`ASSET_MANIFEST_INVALID: ${id} has invalid licence`);
    }
    entry.license = raw.license;
  }

  if (raw.regions !== undefined) {
    if (type !== "atlas") {
      return err(
        `ASSET_MANIFEST_INVALID: ${id} regions are only valid on atlas assets`,
      );
    }
    const regions = parseAtlasRegions(id, raw.regions);
    if (!regions.ok) return regions;
    entry.regions = regions.value;
  }

  if (type === "atlas") {
    if (
      entry.frameWidth !== undefined ||
      entry.frameHeight !== undefined ||
      entry.frames !== undefined ||
      entry.fps !== undefined ||
      entry.loop !== undefined
    ) {
      return err(
        `ASSET_MANIFEST_INVALID: ${id} atlas is not an animation format`,
      );
    }
    if (!entry.regions) {
      return err(`ASSET_MANIFEST_INVALID: ${id} atlas requires regions`);
    }
    if (entry.width !== undefined && entry.height !== undefined) {
      for (const [name, region] of Object.entries(entry.regions)) {
        if (
          region.x + region.width > entry.width ||
          region.y + region.height > entry.height
        ) {
          return err(
            `ASSET_MANIFEST_INVALID: ${id} atlas region "${name}" exceeds ${entry.width}×${entry.height}`,
          );
        }
      }
    }
  }

  if (type === "sheet") {
    if (
      entry.frameWidth === undefined ||
      entry.frameHeight === undefined ||
      entry.frames === undefined
    ) {
      return err(
        `ASSET_MANIFEST_INVALID: ${id} sheet requires frameWidth, frameHeight, and frames`,
      );
    }
  }

  return ok(entry);
}

export function parseManifest(
  value: unknown,
  manifestUrl: string,
): Result<ManifestLoadResult> {
  let baseUrl: URL;
  try {
    baseUrl = new URL(manifestUrl);
  } catch {
    return err(`ASSET_MANIFEST_INVALID: invalid manifest URL ${manifestUrl}`);
  }

  if (!isRecord(value)) {
    return err("ASSET_MANIFEST_INVALID: manifest must be an object");
  }

  if (!isSchemaVersionSupported(value.schemaVersion)) {
    return err(
      `ASSET_SCHEMA_VERSION: expected ${ASSET_SCHEMA_VERSION.split(".")[0]}.x, got ${String(value.schemaVersion)}`,
    );
  }

  if (typeof value.id !== "string" || value.id.trim() === "") {
    return err("ASSET_MANIFEST_INVALID: id must be a non-empty string");
  }

  if (!isRecord(value.assets)) {
    return err("ASSET_MANIFEST_INVALID: assets must be an object");
  }

  const warnings: string[] = [];
  const assets: AssetManifest["assets"] = {};

  for (const [id, rawEntry] of Object.entries(value.assets)) {
    if (id.trim() === "") {
      return err("ASSET_ID_INVALID: asset ID must be non-empty");
    }

    const parsed = parseEntry(id, rawEntry, baseUrl);
    if (!parsed.ok) {
      return err(parsed.error);
    }

    assets[id] = parsed.value;
  }

  return ok({
    manifest: {
      schemaVersion: value.schemaVersion,
      id: value.id,
      assets,
    },
    warnings,
  });
}

export async function loadManifest(
  url: string,
  fetchImpl: typeof fetch = fetch,
): Promise<Result<ManifestLoadResult>> {
  let response: Response;
  try {
    response = await fetchImpl(url, { cache: "no-cache" });
  } catch (error) {
    return err(
      `ASSET_MANIFEST_MISSING: ${url} (${error instanceof Error ? error.message : String(error)})`,
    );
  }

  if (!response.ok) {
    return err(`ASSET_MANIFEST_MISSING: ${url} (${response.status})`);
  }

  let data: unknown;
  try {
    data = await response.json();
  } catch {
    return err(`ASSET_MANIFEST_INVALID: ${url} is not valid JSON`);
  }

  return parseManifest(data, url);
}
