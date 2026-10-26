import type { AssetId } from "../assets";
import { err, ok, type Result } from "../core/result";
import type {
  BackgroundBlend,
  BackgroundFit,
  RoomBackgroundLayer,
  RoomDocument,
  RoomSpawn,
  ThemeDocument,
  ThemeFonts,
  ThemePalette,
} from "./types";

type UnknownRecord = Record<string, unknown>;

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

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isSchemaVersionSupported(value: unknown): value is string {
  return typeof value === "string" && /^1\.\d+$/.test(value);
}

export function isAssetId(value: unknown): value is AssetId {
  return (
    typeof value === "string" &&
    /^[a-z][a-z0-9_-]*(\.[a-z0-9_-]+)+$/.test(value)
  );
}

function isHexColor(value: unknown): value is string {
  return typeof value === "string" && /^#[0-9a-fA-F]{6}$/.test(value);
}

function readNonEmptyString(
  record: UnknownRecord,
  key: string,
  code: string,
): Result<string> {
  const value = record[key];
  if (typeof value !== "string" || value.trim() === "") {
    return err(`${code}: ${key} must be a non-empty string`);
  }
  return ok(value);
}

function readAssetId(
  record: UnknownRecord,
  key: string,
  code: string,
): Result<AssetId> {
  const value = record[key];
  if (!isAssetId(value)) {
    return err(`${code}: ${key} must be a logical asset ID, not a path`);
  }
  return ok(value);
}

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

function parseBackgroundLayer(
  value: unknown,
  index: number,
  code: string,
): Result<RoomBackgroundLayer> {
  if (!isRecord(value)) {
    return err(`${code}: background.layers[${index}] must be an object`);
  }

  const assetId = readAssetId(value, "assetId", code);
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

  return ok(layer);
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
    background: { id: backgroundId.value, layers },
    spawns: { player1: player1.value, player2: player2.value },
  };

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

  return ok(palette);
}

function parseFonts(value: unknown): Result<ThemeFonts> {
  const code = "THEME_SCHEMA_INVALID";
  if (!isRecord(value)) {
    return err(`${code}: fonts must be an object`);
  }
  const ui = readNonEmptyString(value, "ui", code);
  if (!ui.ok) return err(ui.error);
  const display = readNonEmptyString(value, "display", code);
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
    },
    ...(audio.value ? { audio: audio.value } : {}),
  });
}

async function fetchJson(url: string, fetchImpl: typeof fetch): Promise<Result<unknown>> {
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
}

export async function loadRoom(
  url: string,
  fetchImpl: typeof fetch = fetch,
): Promise<Result<RoomDocument>> {
  const data = await fetchJson(url, fetchImpl);
  if (!data.ok) return err(data.error);
  return parseRoom(data.value);
}

export async function loadTheme(
  url: string,
  fetchImpl: typeof fetch = fetch,
): Promise<Result<ThemeDocument>> {
  const data = await fetchJson(url, fetchImpl);
  if (!data.ok) return err(data.error);
  return parseTheme(data.value);
}

export function collectRoomAssetIds(room: RoomDocument): AssetId[] {
  const ids = new Set<AssetId>();
  ids.add(room.tileset);
  for (const layer of room.background.layers) {
    ids.add(layer.assetId);
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
