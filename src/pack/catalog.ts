import { err, ok, type Result } from "../core/result";
import { isRecord, parseJsonUrl, type UnknownRecord } from "./parse-common";

const CATALOG_CODE = "PACK_CATALOG_INVALID";
const ID_PATTERN = /^[a-z0-9][a-z0-9-]*$/;
const PATH_PATTERN = /^[a-z0-9][a-z0-9-]*\/$/;

export type PackAvailability = "available" | "coming-soon" | "unavailable";

export interface PackCatalogEntry {
  id: string;
  /** Directory relative to `public/packs/`, for example `anatomy-reflex/`. */
  path: string;
  status: PackAvailability;
  /** Whether the online co-op milestone supports this cycle. */
  online: boolean;
  order: number;
  title: string;
  subtitle?: string;
  description?: string;
  /**
   * Set when a cycle points at a level inside another pack instead of its own
   * pack. M2 recommends a separate Silicon pack, but the catalog keeps this
   * field so the fallback stays representable.
   */
  startLevelId?: string;
}

export interface PackCatalog {
  schemaVersion: string;
  packs: PackCatalogEntry[];
}

function readOptionalText(
  record: UnknownRecord,
  key: string,
  label: string,
): Result<string | undefined> {
  const value = record[key];
  if (value === undefined) return ok(undefined);
  if (typeof value !== "string" || value.trim() === "") {
    return err(`${CATALOG_CODE}: ${label} must be a non-empty string`);
  }
  return ok(value);
}

function parseEntry(
  value: unknown,
  index: number,
): Result<PackCatalogEntry> {
  if (!isRecord(value)) {
    return err(`${CATALOG_CODE}: packs[${index}] must be an object`);
  }

  const id = value.id;
  if (typeof id !== "string" || !ID_PATTERN.test(id)) {
    return err(`${CATALOG_CODE}: packs[${index}].id must be a kebab-case id`);
  }
  const path = value.path;
  if (typeof path !== "string" || !PATH_PATTERN.test(path)) {
    return err(
      `${CATALOG_CODE}: packs[${index}].path must be a relative directory ending in /`,
    );
  }
  if (path.includes("..") || path.startsWith("/")) {
    return err(`${CATALOG_CODE}: packs[${index}].path must stay inside public/packs`);
  }

  const status = value.status;
  if (
    status !== "available" &&
    status !== "coming-soon" &&
    status !== "unavailable"
  ) {
    return err(
      `${CATALOG_CODE}: packs[${index}].status must be available, coming-soon, or unavailable`,
    );
  }

  if (typeof value.online !== "boolean") {
    return err(`${CATALOG_CODE}: packs[${index}].online must be boolean`);
  }

  if (
    typeof value.order !== "number" ||
    !Number.isFinite(value.order) ||
    !Number.isInteger(value.order)
  ) {
    return err(`${CATALOG_CODE}: packs[${index}].order must be an integer`);
  }

  const title = value.title;
  if (typeof title !== "string" || title.trim() === "") {
    return err(`${CATALOG_CODE}: packs[${index}].title must be a non-empty string`);
  }

  const subtitle = readOptionalText(value, "subtitle", `packs[${index}].subtitle`);
  if (!subtitle.ok) return err(subtitle.error);
  const description = readOptionalText(
    value,
    "description",
    `packs[${index}].description`,
  );
  if (!description.ok) return err(description.error);
  const startLevelId = readOptionalText(
    value,
    "startLevelId",
    `packs[${index}].startLevelId`,
  );
  if (!startLevelId.ok) return err(startLevelId.error);

  return ok({
    id,
    path,
    status,
    online: value.online,
    order: value.order,
    title,
    subtitle: subtitle.value,
    description: description.value,
    startLevelId: startLevelId.value,
  });
}

export function parsePackCatalog(value: unknown): Result<PackCatalog> {
  if (!isRecord(value)) {
    return err(`${CATALOG_CODE}: catalog must be an object`);
  }
  if (
    typeof value.schemaVersion !== "string" ||
    !/^1\.\d+$/.test(value.schemaVersion)
  ) {
    return err(
      `${CATALOG_CODE}: expected schemaVersion 1.x, got ${String(value.schemaVersion)}`,
    );
  }
  if (!Array.isArray(value.packs) || value.packs.length === 0) {
    return err(`${CATALOG_CODE}: packs must be a non-empty array`);
  }

  const packs: PackCatalogEntry[] = [];
  const seen = new Set<string>();
  for (const [index, entry] of value.packs.entries()) {
    const parsed = parseEntry(entry, index);
    if (!parsed.ok) return err(parsed.error);
    if (seen.has(parsed.value.id)) {
      return err(`${CATALOG_CODE}: duplicate pack id "${parsed.value.id}"`);
    }
    seen.add(parsed.value.id);
    packs.push(parsed.value);
  }

  packs.sort((left, right) => left.order - right.order || left.id.localeCompare(right.id));
  return ok({ schemaVersion: value.schemaVersion, packs });
}

export async function loadPackCatalog(
  url: string,
  fetchImpl: typeof fetch = fetch,
): Promise<Result<PackCatalog>> {
  const json = await parseJsonUrl(url, fetchImpl);
  if (!json.ok) return err(json.error);
  return parsePackCatalog(json.value);
}

export function catalogEntry(
  catalog: PackCatalog,
  id: string,
): PackCatalogEntry | null {
  return catalog.packs.find((entry) => entry.id === id) ?? null;
}
