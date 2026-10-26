import type { AssetId } from "../assets";
import { err, ok, type Result } from "../core/result";

export type UnknownRecord = Record<string, unknown>;

export function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

export function isSchemaVersionSupported(value: unknown): value is string {
  return typeof value === "string" && /^1\.\d+$/.test(value);
}

export function isAssetId(value: unknown): value is AssetId {
  return (
    typeof value === "string" &&
    /^[a-z][a-z0-9_-]*(\.[a-z0-9_-]+)+$/.test(value)
  );
}

export function isHexColor(value: unknown): value is string {
  return typeof value === "string" && /^#[0-9a-fA-F]{6}$/.test(value);
}

export function readNonEmptyString(
  record: UnknownRecord,
  key: string,
  code: string,
  label = key,
): Result<string> {
  const value = record[key];
  if (typeof value !== "string" || value.trim() === "") {
    return err(`${code}: ${label} must be a non-empty string`);
  }
  return ok(value);
}

export function readOptionalString(
  record: UnknownRecord,
  key: string,
  code: string,
  label = key,
): Result<string | undefined> {
  if (record[key] === undefined) {
    return ok(undefined);
  }
  return readNonEmptyString(record, key, code, label);
}

export function readAssetId(
  record: UnknownRecord,
  key: string,
  code: string,
  label = key,
): Result<AssetId> {
  const value = record[key];
  if (!isAssetId(value)) {
    return err(`${code}: ${label} must be a logical asset ID, not a path`);
  }
  return ok(value);
}

export function readOptionalAssetId(
  record: UnknownRecord,
  key: string,
  code: string,
  label = key,
): Result<AssetId | undefined> {
  if (record[key] === undefined) {
    return ok(undefined);
  }
  return readAssetId(record, key, code, label);
}

export function readNumber(
  record: UnknownRecord,
  key: string,
  code: string,
  label = key,
): Result<number> {
  const value = record[key];
  if (!isFiniteNumber(value)) {
    return err(`${code}: ${label} must be a finite number`);
  }
  return ok(value);
}

export function readInteger(
  record: UnknownRecord,
  key: string,
  code: string,
  label = key,
): Result<number> {
  const result = readNumber(record, key, code, label);
  if (!result.ok) return result;
  if (!Number.isInteger(result.value)) {
    return err(`${code}: ${label} must be an integer`);
  }
  return ok(result.value);
}

export function readBoolean(
  record: UnknownRecord,
  key: string,
  code: string,
  label = key,
): Result<boolean> {
  const value = record[key];
  if (typeof value !== "boolean") {
    return err(`${code}: ${label} must be boolean`);
  }
  return ok(value);
}

export function readStringArray(
  record: UnknownRecord,
  key: string,
  code: string,
  label = key,
  options: { allowEmpty?: boolean } = {},
): Result<string[]> {
  const value = record[key];
  if (!Array.isArray(value)) {
    return err(`${code}: ${label} must be an array of strings`);
  }
  if (!options.allowEmpty && value.length === 0) {
    return err(`${code}: ${label} must not be empty`);
  }
  const result: string[] = [];
  for (const [index, entry] of value.entries()) {
    if (typeof entry !== "string" || entry.trim() === "") {
      return err(`${code}: ${label}[${index}] must be a non-empty string`);
    }
    result.push(entry);
  }
  return ok(result);
}

export function readOptionalStringArray(
  record: UnknownRecord,
  key: string,
  code: string,
  label = key,
): Result<string[] | undefined> {
  if (record[key] === undefined) {
    return ok(undefined);
  }
  return readStringArray(record, key, code, label, { allowEmpty: true });
}

export function readScalarRecord(
  value: unknown,
  code: string,
  label: string,
): Result<Record<string, string | number | boolean | null>> {
  if (value === undefined) {
    return ok({});
  }
  if (!isRecord(value)) {
    return err(`${code}: ${label} must be an object`);
  }
  const result: Record<string, string | number | boolean | null> = {};
  for (const [key, entry] of Object.entries(value)) {
    if (
      entry !== null &&
      typeof entry !== "string" &&
      typeof entry !== "number" &&
      typeof entry !== "boolean"
    ) {
      return err(`${code}: ${label}.${key} must be a scalar value`);
    }
    result[key] = entry;
  }
  return ok(result);
}

export function parseJsonUrl(
  url: string,
  fetchImpl: typeof fetch,
): Promise<Result<unknown>> {
  return (async () => {
    let response: Response;
    try {
      response = await fetchImpl(url, { cache: "no-cache" });
    } catch (error) {
      return err(
        `CONTENT_FETCH_FAILED: ${url} (${error instanceof Error ? error.message : String(error)})`,
      );
    }
    if (!response.ok) {
      return err(`CONTENT_FETCH_FAILED: ${url} (${response.status})`);
    }
    try {
      return ok(await response.json());
    } catch {
      return err(`CONTENT_JSON_INVALID: ${url}`);
    }
  })();
}
