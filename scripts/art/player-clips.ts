/**
 * Portable clip descriptor for the POC player animation build.
 *
 * A character has one or more source sheets and a named animation map. Frame
 * ranges are inclusive and refer to the sorted Ludo frame list. The build
 * script resolves `sheet`/`atlas` relative to the character directory.
 */

export interface PlayerClipSource {
  sheet: string;
  atlas?: string;
  sourceFps?: number;
}

export interface PlayerClipDefinition {
  source: string;
  frames: [number, number];
  fps: number;
  loop: boolean;
  output: string;
  static?: boolean;
}

export interface PlayerClipsDocument {
  schemaVersion: 2;
  character: string;
  cell: { width: number; height: number };
  origin: [number, number];
  /** Clip names this character must define. Defaults to the player clip set. */
  requiredClips: string[];
  /** Transparent border used when fitting each frame into the cell. */
  margin: number;
  /** Alpha values below this become transparent. */
  alphaThreshold: number;
  /** Optional ramp allowlist; defaults to the palette's role ramps. */
  ramps?: string[];
  /** Scale used for review previews and GIFs. */
  previewScale: number;
  sources: Record<string, PlayerClipSource>;
  animations: Record<string, PlayerClipDefinition>;
}

export const REQUIRED_PLAYER_CLIPS = [
  "idle",
  "walk",
  "jump",
  "fall",
  "land",
] as const;

type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function nonEmptyString(value: unknown, label: string): string {
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`${label} must be a non-empty string`);
  }
  return value;
}

function positiveInteger(value: unknown, label: string): number {
  if (
    typeof value !== "number" ||
    !Number.isFinite(value) ||
    !Number.isInteger(value) ||
    value <= 0
  ) {
    throw new Error(`${label} must be a positive integer`);
  }
  return value;
}

function nonNegativeInteger(value: unknown, label: string): number {
  if (
    typeof value !== "number" ||
    !Number.isFinite(value) ||
    !Number.isInteger(value) ||
    value < 0
  ) {
    throw new Error(`${label} must be a non-negative integer`);
  }
  return value;
}

function finiteNumber(value: unknown, label: string): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error(`${label} must be a finite number`);
  }
  return value;
}

function boundedInteger(
  value: unknown,
  label: string,
  minimum: number,
  maximum: number,
): number {
  const parsed = finiteNumber(value, label);
  if (!Number.isInteger(parsed) || parsed < minimum || parsed > maximum) {
    throw new Error(`${label} must be an integer within ${minimum}..${maximum}`);
  }
  return parsed;
}

function stringArray(value: unknown, label: string): string[] {
  if (!Array.isArray(value) || value.length === 0) {
    throw new Error(`${label} must be a non-empty array`);
  }
  const result = value.map((entry, index) => {
    if (typeof entry !== "string" || entry.trim() === "") {
      throw new Error(`${label}[${index}] must be a non-empty string`);
    }
    return entry;
  });
  if (new Set(result).size !== result.length) {
    throw new Error(`${label} must not contain duplicates`);
  }
  return result;
}

function boolean(value: unknown, label: string): boolean {
  if (typeof value !== "boolean") {
    throw new Error(`${label} must be a boolean`);
  }
  return value;
}

function parseSource(value: unknown, label: string): PlayerClipSource {
  if (!isRecord(value)) {
    throw new Error(`${label} must be an object`);
  }
  const source: PlayerClipSource = {
    sheet: nonEmptyString(value.sheet, `${label}.sheet`),
  };
  if (value.atlas !== undefined) {
    source.atlas = nonEmptyString(value.atlas, `${label}.atlas`);
  }
  if (value.sourceFps !== undefined) {
    const fps = finiteNumber(value.sourceFps, `${label}.sourceFps`);
    if (fps <= 0) {
      throw new Error(`${label}.sourceFps must be positive`);
    }
    source.sourceFps = fps;
  }
  return source;
}

function parseAnimation(
  value: unknown,
  label: string,
  sources: Record<string, PlayerClipSource>,
): PlayerClipDefinition {
  if (!isRecord(value)) {
    throw new Error(`${label} must be an object`);
  }
  const source = nonEmptyString(value.source, `${label}.source`);
  if (!sources[source]) {
    throw new Error(`${label}.source references unknown source "${source}"`);
  }
  if (!Array.isArray(value.frames) || value.frames.length !== 2) {
    throw new Error(`${label}.frames must be [start, end]`);
  }
  const start = nonNegativeInteger(value.frames[0], `${label}.frames[0]`);
  const end = nonNegativeInteger(value.frames[1], `${label}.frames[1]`);
  if (start > end) {
    throw new Error(`${label}.frames must satisfy start <= end`);
  }
  const fps = finiteNumber(value.fps, `${label}.fps`);
  if (fps <= 0) {
    throw new Error(`${label}.fps must be positive`);
  }
  const loop = boolean(value.loop, `${label}.loop`);
  const output = nonEmptyString(value.output, `${label}.output`);
  const result: PlayerClipDefinition = {
    source,
    frames: [start, end],
    fps,
    loop,
    output,
  };
  if (value.static !== undefined) {
    result.static = boolean(value.static, `${label}.static`);
  }
  return result;
}

export function parsePlayerClips(value: unknown): PlayerClipsDocument {
  if (!isRecord(value)) {
    throw new Error("player clips must be an object");
  }
  if (value.schemaVersion !== 2) {
    throw new Error("player clips schemaVersion must be 2");
  }
  const character = nonEmptyString(value.character, "character");
  if (!isRecord(value.cell)) {
    throw new Error("cell must be an object");
  }
  const cell = {
    width: positiveInteger(value.cell.width, "cell.width"),
    height: positiveInteger(value.cell.height, "cell.height"),
  };
  if (!Array.isArray(value.origin) || value.origin.length !== 2) {
    throw new Error("origin must be [x, y]");
  }
  const origin: [number, number] = [
    finiteNumber(value.origin[0], "origin[0]"),
    finiteNumber(value.origin[1], "origin[1]"),
  ];
  const requiredClips =
    value.requiredClips === undefined
      ? [...REQUIRED_PLAYER_CLIPS]
      : stringArray(value.requiredClips, "requiredClips");
  const margin =
    value.margin === undefined
      ? 0
      : nonNegativeInteger(value.margin, "margin");
  if (margin * 2 >= cell.width || margin * 2 >= cell.height) {
    throw new Error("margin leaves no room inside the cell");
  }
  const alphaThreshold =
    value.alphaThreshold === undefined
      ? 128
      : boundedInteger(value.alphaThreshold, "alphaThreshold", 0, 255);
  const previewScale =
    value.previewScale === undefined
      ? 8
      : positiveInteger(value.previewScale, "previewScale");
  const ramps =
    value.ramps === undefined
      ? undefined
      : stringArray(value.ramps, "ramps");
  if (!isRecord(value.sources) || Object.keys(value.sources).length === 0) {
    throw new Error("sources must contain at least one source");
  }
  const sources: Record<string, PlayerClipSource> = {};
  for (const [name, raw] of Object.entries(value.sources)) {
    sources[name] = parseSource(raw, `sources.${name}`);
  }
  if (!isRecord(value.animations) || Object.keys(value.animations).length === 0) {
    throw new Error("animations must contain at least one clip");
  }
  const animations: Record<string, PlayerClipDefinition> = {};
  for (const [name, raw] of Object.entries(value.animations)) {
    animations[name] = parseAnimation(raw, `animations.${name}`, sources);
  }
  for (const name of requiredClips) {
    if (!animations[name]) {
      throw new Error(`animations.${name} is required`);
    }
  }
  const outputs = new Set<string>();
  for (const [name, animation] of Object.entries(animations)) {
    if (outputs.has(animation.output)) {
      throw new Error(
        `animations.${name}.output "${animation.output}" is not unique`,
      );
    }
    outputs.add(animation.output);
  }
  return {
    schemaVersion: 2,
    character,
    cell,
    origin,
    requiredClips,
    margin,
    alphaThreshold,
    ...(ramps ? { ramps } : {}),
    previewScale,
    sources,
    animations,
  };
}
