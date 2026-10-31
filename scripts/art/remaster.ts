/**
 * Profile-driven remastering for faux-pixel Ludo sheets.
 *
 * The sheet is a concept source. This module classifies each source pixel into
 * semantic roles (suit, visor/tanks, accent, joints, outline, grime), samples
 * the alpha-bounded frame into a small cell, and quantises each cell to the
 * role's approved three-step ramp. The result is a deterministic 14×22 master
 * that the palette LUT can turn into P2.
 */

import {
  parseHexColor,
  type Rgb,
  type RgbaImage,
} from "./ludo-sheet";
import {
  RAMP_STEPS,
  validatePaletteImage,
  type PaletteDocument,
  type PaletteRamp,
  type PaletteValidation,
} from "./palette";

export interface HsvRange {
  hueMin?: number;
  hueMax?: number;
  satMin?: number;
  satMax?: number;
  valueMin?: number;
  valueMax?: number;
}

export interface RemasterClass {
  name: string;
  role: string;
  match?: HsvRange;
  default?: boolean;
  fillHoles?: boolean;
}

export interface RemasterOverride {
  class: string;
  rect: [number, number, number, number];
}

export interface RemasterProfile {
  schemaVersion: number;
  frame: number;
  cell: { width: number; height: number };
  classes: RemasterClass[];
  outlineBoundary: boolean;
  outlineStep: "shadow" | "base" | "highlight";
  shadingQuantiles: [number, number];
  lowConfidence: number;
  overrides: RemasterOverride[];
}

export interface RemasterBBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface RemasterStats {
  sourceClassCounts: Record<string, number>;
  targetClassCounts: Record<string, number>;
  lowConfidenceCells: Array<{
    x: number;
    y: number;
    confidence: number;
    class: string;
  }>;
  forcedOutlineCells: number;
  overriddenCells: number;
  opaqueCells: number;
}

export interface RemasterResult {
  image: RgbaImage;
  classMap: Uint8Array;
  classNames: string[];
  confidence: Float32Array;
  bbox: RemasterBBox;
  stats: RemasterStats;
  paletteValidation: PaletteValidation;
}

interface UnknownRecord {
  [key: string]: unknown;
}

interface Hsv {
  h: number;
  s: number;
  v: number;
}

interface RampColor {
  rgb: Rgb;
  step: 0 | 1 | 2;
}

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readNonEmptyString(value: unknown, label: string): string {
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`${label} must be a non-empty string`);
  }
  return value;
}

function readPositiveInteger(value: unknown, label: string): number {
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

function readNumber(value: unknown, label: string): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error(`${label} must be a finite number`);
  }
  return value;
}

function optionalNumber(
  value: unknown,
  label: string,
): number | undefined {
  return value === undefined ? undefined : readNumber(value, label);
}

function readBool(value: unknown, label: string, fallback: boolean): boolean {
  if (value === undefined) return fallback;
  if (typeof value !== "boolean") {
    throw new Error(`${label} must be a boolean`);
  }
  return value;
}

function parseRange(value: unknown, label: string): HsvRange {
  if (!isRecord(value)) {
    throw new Error(`${label} must be an object`);
  }
  const hueMin = optionalNumber(value.hueMin, `${label}.hueMin`);
  const hueMax = optionalNumber(value.hueMax, `${label}.hueMax`);
  for (const [name, hue] of [
    ["hueMin", hueMin],
    ["hueMax", hueMax],
  ] as const) {
    if (hue !== undefined && (hue < 0 || hue > 360)) {
      throw new Error(`${label}.${name} must be within 0..360`);
    }
  }
  const satMin = optionalNumber(value.satMin, `${label}.satMin`);
  const satMax = optionalNumber(value.satMax, `${label}.satMax`);
  const valueMin = optionalNumber(value.valueMin, `${label}.valueMin`);
  const valueMax = optionalNumber(value.valueMax, `${label}.valueMax`);
  for (const [name, amount] of [
    ["satMin", satMin],
    ["satMax", satMax],
    ["valueMin", valueMin],
    ["valueMax", valueMax],
  ] as const) {
    if (amount !== undefined && (amount < 0 || amount > 1)) {
      throw new Error(`${label}.${name} must be within 0..1`);
    }
  }
  if (satMin !== undefined && satMax !== undefined && satMin > satMax) {
    throw new Error(`${label}.satMin must not exceed satMax`);
  }
  if (
    valueMin !== undefined &&
    valueMax !== undefined &&
    valueMin > valueMax
  ) {
    throw new Error(`${label}.valueMin must not exceed valueMax`);
  }
  return {
    ...(hueMin !== undefined ? { hueMin } : {}),
    ...(hueMax !== undefined ? { hueMax } : {}),
    ...(satMin !== undefined ? { satMin } : {}),
    ...(satMax !== undefined ? { satMax } : {}),
    ...(valueMin !== undefined ? { valueMin } : {}),
    ...(valueMax !== undefined ? { valueMax } : {}),
  };
}

export function parseRemasterProfile(value: unknown): RemasterProfile {
  if (!isRecord(value)) {
    throw new Error("remaster profile must be an object");
  }
  if (value.schemaVersion !== 1) {
    throw new Error("remaster.schemaVersion must be 1");
  }
  const frame =
    value.frame === undefined ? 0 : readNumber(value.frame, "remaster.frame");
  if (!Number.isInteger(frame) || frame < 0) {
    throw new Error("remaster.frame must be a non-negative integer");
  }

  if (!isRecord(value.cell)) {
    throw new Error("remaster.cell must be an object");
  }
  const cell = {
    width: readPositiveInteger(value.cell.width, "remaster.cell.width"),
    height: readPositiveInteger(value.cell.height, "remaster.cell.height"),
  };

  if (!Array.isArray(value.classes) || value.classes.length === 0) {
    throw new Error("remaster.classes must be a non-empty array");
  }
  const classes: RemasterClass[] = [];
  const names = new Set<string>();
  let defaults = 0;
  for (const [index, raw] of value.classes.entries()) {
    if (!isRecord(raw)) {
      throw new Error(`remaster.classes[${index}] must be an object`);
    }
    const name = readNonEmptyString(
      raw.name,
      `remaster.classes[${index}].name`,
    );
    if (names.has(name)) {
      throw new Error(`duplicate remaster class "${name}"`);
    }
    names.add(name);
    const role = readNonEmptyString(
      raw.role,
      `remaster.classes[${index}].role`,
    );
    const isDefault = readBool(
      raw.default,
      `remaster.classes[${index}].default`,
      false,
    );
    if (isDefault) defaults += 1;
    const match =
      raw.match === undefined
        ? undefined
        : parseRange(raw.match, `remaster.classes[${index}].match`);
    if (isDefault && match) {
      throw new Error(`default class "${name}" must not have a match`);
    }
    classes.push({
      name,
      role,
      ...(match ? { match } : {}),
      ...(isDefault ? { default: true } : {}),
      ...(readBool(
        raw.fillHoles,
        `remaster.classes[${index}].fillHoles`,
        false,
      )
        ? { fillHoles: true }
        : {}),
    });
  }
  if (defaults !== 1) {
    throw new Error("remaster.classes must define exactly one default class");
  }
  if (classes.length > 254) {
    throw new Error("remaster.classes must contain at most 254 entries");
  }

  const outlineStep = value.outlineStep ?? "shadow";
  if (
    outlineStep !== "shadow" &&
    outlineStep !== "base" &&
    outlineStep !== "highlight"
  ) {
    throw new Error(
      "remaster.outlineStep must be shadow, base, or highlight",
    );
  }

  let shadingQuantiles: [number, number] = [0.33, 0.66];
  if (value.shadingQuantiles !== undefined) {
    if (
      !Array.isArray(value.shadingQuantiles) ||
      value.shadingQuantiles.length !== 2
    ) {
      throw new Error(
        "remaster.shadingQuantiles must be [low, high]",
      );
    }
    const first = readNumber(
      value.shadingQuantiles[0],
      "remaster.shadingQuantiles[0]",
    );
    const second = readNumber(
      value.shadingQuantiles[1],
      "remaster.shadingQuantiles[1]",
    );
    if (
      first <= 0 ||
      second >= 1 ||
      first >= second
    ) {
      throw new Error(
        "remaster.shadingQuantiles must satisfy 0 < low < high < 1",
      );
    }
    shadingQuantiles = [first, second];
  }

  const lowConfidence =
    value.lowConfidence === undefined
      ? 0.55
      : readNumber(value.lowConfidence, "remaster.lowConfidence");
  if (lowConfidence < 0 || lowConfidence > 1) {
    throw new Error("remaster.lowConfidence must be within 0..1");
  }

  const overrides: RemasterOverride[] = [];
  if (value.overrides !== undefined) {
    if (!Array.isArray(value.overrides)) {
      throw new Error("remaster.overrides must be an array");
    }
    for (const [index, raw] of value.overrides.entries()) {
      if (!isRecord(raw)) {
        throw new Error(`remaster.overrides[${index}] must be an object`);
      }
      const className = readNonEmptyString(
        raw.class,
        `remaster.overrides[${index}].class`,
      );
      if (!names.has(className)) {
        throw new Error(
          `remaster.overrides[${index}] references unknown class "${className}"`,
        );
      }
      if (!Array.isArray(raw.rect) || raw.rect.length !== 4) {
        throw new Error(
          `remaster.overrides[${index}].rect must be [x,y,w,h]`,
        );
      }
      const rect = raw.rect.map((entry, part) =>
        readNumber(entry, `remaster.overrides[${index}].rect[${part}]`),
      ) as [number, number, number, number];
      if (
        rect.some((entry) => !Number.isInteger(entry)) ||
        rect[0] < 0 ||
        rect[1] < 0 ||
        rect[2] <= 0 ||
        rect[3] <= 0 ||
        rect[0] + rect[2] > cell.width ||
        rect[1] + rect[3] > cell.height
      ) {
        throw new Error(
          `remaster.overrides[${index}].rect must lie inside the ${cell.width}×${cell.height} cell`,
        );
      }
      overrides.push({ class: className, rect });
    }
  }

  return {
    schemaVersion: 1,
    frame,
    cell,
    classes,
    outlineBoundary: readBool(
      value.outlineBoundary,
      "remaster.outlineBoundary",
      false,
    ),
    outlineStep,
    shadingQuantiles,
    lowConfidence,
    overrides,
  };
}

export function rgbToHsv(red: number, green: number, blue: number): Hsv {
  const r = red / 255;
  const g = green / 255;
  const b = blue / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const delta = max - min;
  let hue = 0;
  if (delta > 0) {
    if (max === r) hue = ((g - b) / delta) % 6;
    else if (max === g) hue = (b - r) / delta + 2;
    else hue = (r - g) / delta + 4;
    hue *= 60;
    if (hue < 0) hue += 360;
  }
  return { h: hue, s: max === 0 ? 0 : delta / max, v: max };
}

function matchesRange(hsv: Hsv, range: HsvRange): boolean {
  if (range.hueMin !== undefined || range.hueMax !== undefined) {
    if (range.hueMin !== undefined && range.hueMax !== undefined) {
      const inRange =
        range.hueMin <= range.hueMax
          ? hsv.h >= range.hueMin && hsv.h <= range.hueMax
          : hsv.h >= range.hueMin || hsv.h <= range.hueMax;
      if (!inRange) return false;
    } else if (range.hueMin !== undefined && hsv.h < range.hueMin) {
      return false;
    } else if (range.hueMax !== undefined && hsv.h > range.hueMax) {
      return false;
    }
  }
  if (range.satMin !== undefined && hsv.s < range.satMin) return false;
  if (range.satMax !== undefined && hsv.s > range.satMax) return false;
  if (range.valueMin !== undefined && hsv.v < range.valueMin) return false;
  if (range.valueMax !== undefined && hsv.v > range.valueMax) return false;
  return true;
}

export function classifyColor(
  red: number,
  green: number,
  blue: number,
  profile: RemasterProfile,
): number {
  const hsv = rgbToHsv(red, green, blue);
  for (const [index, entry] of profile.classes.entries()) {
    if (entry.match && matchesRange(hsv, entry.match)) {
      return index;
    }
  }
  const fallback = profile.classes.findIndex((entry) => entry.default);
  if (fallback < 0) {
    throw new Error("No default remaster class");
  }
  return fallback;
}

export function findOpaqueBounds(image: RgbaImage): RemasterBBox | null {
  let minX = image.width;
  let minY = image.height;
  let maxX = -1;
  let maxY = -1;
  for (let y = 0; y < image.height; y += 1) {
    for (let x = 0; x < image.width; x += 1) {
      if ((image.data[(y * image.width + x) * 4 + 3] ?? 0) === 0) {
        continue;
      }
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
  }
  if (maxX < 0 || maxY < 0) return null;
  return {
    x: minX,
    y: minY,
    width: maxX - minX + 1,
    height: maxY - minY + 1,
  };
}

/** Fill enclosed holes in a binary mask (4-connected flood from the border). */
export function fillHoles(
  mask: Uint8Array,
  width: number,
  height: number,
): void {
  const outside = new Uint8Array(width * height);
  const queue: number[] = [];
  const seed = (x: number, y: number): void => {
    const index = y * width + x;
    if (mask[index] === 0 && outside[index] === 0) {
      outside[index] = 1;
      queue.push(index);
    }
  };
  for (let x = 0; x < width; x += 1) {
    seed(x, 0);
    seed(x, height - 1);
  }
  for (let y = 0; y < height; y += 1) {
    seed(0, y);
    seed(width - 1, y);
  }
  while (queue.length > 0) {
    const index = queue.pop();
    if (index === undefined) break;
    const x = index % width;
    const y = Math.floor(index / width);
    if (x > 0) seed(x - 1, y);
    if (x + 1 < width) seed(x + 1, y);
    if (y > 0) seed(x, y - 1);
    if (y + 1 < height) seed(x, y + 1);
  }
  for (let index = 0; index < mask.length; index += 1) {
    if (mask[index] === 0 && outside[index] === 0) {
      mask[index] = 1;
    }
  }
}

function rampColors(ramp: PaletteRamp): RampColor[] {
  return RAMP_STEPS.map((step, index) => ({
    rgb: parseHexColor(ramp[step]),
    step: index as 0 | 1 | 2,
  }));
}

function stepForValue(
  value: number,
  thresholds: readonly [number, number],
): 0 | 1 | 2 {
  if (thresholds[0] === thresholds[1]) return 1;
  if (value <= thresholds[0]) return 0;
  if (value <= thresholds[1]) return 1;
  return 2;
}

function shadingThresholds(
  values: number[],
  quantiles: readonly [number, number],
): [number, number] {
  if (values.length === 0) return [0, 0];
  const sorted = [...values].sort((left, right) => left - right);
  const low = sorted[
    Math.min(sorted.length - 1, Math.floor(sorted.length * quantiles[0]))
  ];
  const high = sorted[
    Math.min(sorted.length - 1, Math.floor(sorted.length * quantiles[1]))
  ];
  return [low ?? 0, high ?? 0];
}

function resolveClassRamps(
  profile: RemasterProfile,
  palette: PaletteDocument,
): RampColor[][] {
  return profile.classes.map((entry) => {
    const rampName = palette.roles[entry.role];
    if (!rampName) {
      throw new Error(
        `remaster class "${entry.name}" references unknown palette role "${entry.role}"`,
      );
    }
    const ramp = palette.ramps[rampName];
    if (!ramp) {
      throw new Error(
        `palette role "${entry.role}" references unknown ramp "${rampName}"`,
      );
    }
    return rampColors(ramp);
  });
}

function sourceRectForCell(
  bbox: RemasterBBox,
  cellWidth: number,
  cellHeight: number,
  x: number,
  y: number,
): { x0: number; x1: number; y0: number; y1: number } {
  const x0 = bbox.x + Math.floor((x * bbox.width) / cellWidth);
  const x1 =
    bbox.x + Math.floor(((x + 1) * bbox.width) / cellWidth);
  const y0 = bbox.y + Math.floor((y * bbox.height) / cellHeight);
  const y1 =
    bbox.y + Math.floor(((y + 1) * bbox.height) / cellHeight);
  return {
    x0,
    x1: Math.max(x0 + 1, x1),
    y0,
    y1: Math.max(y0 + 1, y1),
  };
}

function dominantStepForClass(
  image: RgbaImage,
  rect: ReturnType<typeof sourceRectForCell>,
  sourceClass: Uint8Array,
  classIndex: number,
  bbox: RemasterBBox,
  thresholds: readonly [number, number],
  requireClass: boolean,
): 0 | 1 | 2 | null {
  const counts = [0, 0, 0];
  let total = 0;
  let sumValue = 0;
  for (let y = rect.y0; y < rect.y1; y += 1) {
    for (let x = rect.x0; x < rect.x1; x += 1) {
      const local = (y - bbox.y) * bbox.width + (x - bbox.x);
      if (sourceClass[local] === 255) continue;
      if (requireClass && sourceClass[local] !== classIndex) continue;
      const index = (y * image.width + x) * 4;
      const value = rgbToHsv(
        image.data[index] ?? 0,
        image.data[index + 1] ?? 0,
        image.data[index + 2] ?? 0,
      ).v;
      const step = stepForValue(value, thresholds);
      counts[step] = (counts[step] ?? 0) + 1;
      total += 1;
      sumValue += value;
    }
  }
  if (total === 0) return null;
  const max = Math.max(...counts);
  const tied = counts
    .map((count, step) => (count === max ? step : -1))
    .filter((step) => step >= 0);
  if (tied.length === 1) {
    return tied[0] as 0 | 1 | 2;
  }
  return stepForValue(sumValue / total, thresholds);
}

export function remasterImage(
  image: RgbaImage,
  palette: PaletteDocument,
  profile: RemasterProfile,
): RemasterResult {
  if (
    profile.cell.width !== palette.cell.width ||
    profile.cell.height !== palette.cell.height
  ) {
    throw new Error(
      `Profile cell ${profile.cell.width}×${profile.cell.height} does not match palette cell ` +
        `${palette.cell.width}×${palette.cell.height}`,
    );
  }
  const bbox = findOpaqueBounds(image);
  if (!bbox) {
    throw new Error("Frame has no opaque pixels");
  }

  const classRamps = resolveClassRamps(profile, palette);
  const classByPixel = new Uint8Array(bbox.width * bbox.height);
  const sourceClassCounts: Record<string, number> = {};
  for (const entry of profile.classes) {
    sourceClassCounts[entry.name] = 0;
  }

  for (let y = 0; y < bbox.height; y += 1) {
    for (let x = 0; x < bbox.width; x += 1) {
      const index =
        ((bbox.y + y) * image.width + (bbox.x + x)) * 4;
      const alpha = image.data[index + 3] ?? 0;
      const local = y * bbox.width + x;
      if (alpha === 0) {
        classByPixel[local] = 255;
        continue;
      }
      const classIndex = classifyColor(
        image.data[index] ?? 0,
        image.data[index + 1] ?? 0,
        image.data[index + 2] ?? 0,
        profile,
      );
      classByPixel[local] = classIndex;
      sourceClassCounts[profile.classes[classIndex]?.name ?? ""] =
        (sourceClassCounts[profile.classes[classIndex]?.name ?? ""] ?? 0) + 1;
    }
  }

  for (const [classIndex, entry] of profile.classes.entries()) {
    if (!entry.fillHoles) continue;
    const mask = new Uint8Array(bbox.width * bbox.height);
    for (let index = 0; index < classByPixel.length; index += 1) {
      if (classByPixel[index] === classIndex) mask[index] = 1;
    }
    fillHoles(mask, bbox.width, bbox.height);
    for (let index = 0; index < mask.length; index += 1) {
      if (mask[index] === 1 && classByPixel[index] !== classIndex) {
        classByPixel[index] = classIndex;
        sourceClassCounts[entry.name] =
          (sourceClassCounts[entry.name] ?? 0) + 1;
      }
    }
  }

  const classValues: number[][] = profile.classes.map(() => []);
  for (let y = 0; y < bbox.height; y += 1) {
    for (let x = 0; x < bbox.width; x += 1) {
      const local = y * bbox.width + x;
      const classIndex = classByPixel[local] ?? 255;
      if (classIndex === 255) continue;
      const index =
        ((bbox.y + y) * image.width + (bbox.x + x)) * 4;
      const value = rgbToHsv(
        image.data[index] ?? 0,
        image.data[index + 1] ?? 0,
        image.data[index + 2] ?? 0,
      ).v;
      classValues[classIndex]?.push(value);
    }
  }
  const stepThresholds = classValues.map((values) =>
    shadingThresholds(values, profile.shadingQuantiles),
  );

  const cellWidth = profile.cell.width;
  const cellHeight = profile.cell.height;
  const classMap = new Uint8Array(cellWidth * cellHeight);
  const confidence = new Float32Array(cellWidth * cellHeight);
  const colors = new Uint8Array(cellWidth * cellHeight * 4);
  const outlineClass = profile.classes.findIndex(
    (entry) => entry.role === "outline",
  );
  if (profile.outlineBoundary && outlineClass < 0) {
    throw new Error(
      "outlineBoundary requires a class with role \"outline\"",
    );
  }

  for (let y = 0; y < cellHeight; y += 1) {
    for (let x = 0; x < cellWidth; x += 1) {
      const rect = sourceRectForCell(bbox, cellWidth, cellHeight, x, y);
      const classCounts = new Uint32Array(profile.classes.length);
      let total = 0;
      for (let sourceY = rect.y0; sourceY < rect.y1; sourceY += 1) {
        for (let sourceX = rect.x0; sourceX < rect.x1; sourceX += 1) {
          const local =
            (sourceY - bbox.y) * bbox.width + (sourceX - bbox.x);
          const classIndex = classByPixel[local] ?? 255;
          if (classIndex === 255) continue;
          classCounts[classIndex] = (classCounts[classIndex] ?? 0) + 1;
          total += 1;
        }
      }
      const target = y * cellWidth + x;
      if (total === 0) {
        classMap[target] = 255;
        confidence[target] = 0;
        continue;
      }
      let winner = -1;
      let winnerCount = 0;
      for (let classIndex = 0; classIndex < classCounts.length; classIndex += 1) {
        // The raw outline is thick. When a boundary outline is forced, the
        // interior vote ignores outline so it does not consume the sprite.
        if (profile.outlineBoundary && classIndex === outlineClass) continue;
        const count = classCounts[classIndex] ?? 0;
        if (count > 0 && count > winnerCount) {
          winner = classIndex;
          winnerCount = count;
        }
      }
      if (winner < 0 && outlineClass >= 0) {
        winner = outlineClass;
        winnerCount = classCounts[outlineClass] ?? 0;
      }
      if (winner < 0) {
        classMap[target] = 255;
        confidence[target] = 0;
        continue;
      }
      const ramp = classRamps[winner];
      if (!ramp) throw new Error("Missing ramp for class");
      const step = dominantStepForClass(
        image,
        rect,
        classByPixel,
        winner,
        bbox,
        stepThresholds[winner] ?? [0, 0],
        true,
      );
      if (step === null) {
        classMap[target] = 255;
        confidence[target] = 0;
        continue;
      }
      classMap[target] = winner;
      const nonOutlineTotal = profile.outlineBoundary
        ? total - (classCounts[outlineClass] ?? 0)
        : total;
      confidence[target] =
        nonOutlineTotal > 0 ? winnerCount / nonOutlineTotal : 1;
      const [red, green, blue] = ramp[step].rgb;
      const output = target * 4;
      colors[output] = red;
      colors[output + 1] = green;
      colors[output + 2] = blue;
      colors[output + 3] = 255;
    }
  }

  let overriddenCells = 0;
  for (const override of profile.overrides) {
    const classIndex = profile.classes.findIndex(
      (entry) => entry.name === override.class,
    );
    if (classIndex < 0) continue;
    const ramp = classRamps[classIndex];
    if (!ramp) continue;
    const [x0, y0, width, height] = override.rect;
    for (let y = y0; y < y0 + height; y += 1) {
      for (let x = x0; x < x0 + width; x += 1) {
        const target = y * cellWidth + x;
        if (classMap[target] === 255) continue;
        const rect = sourceRectForCell(bbox, cellWidth, cellHeight, x, y);
        const step = dominantStepForClass(
          image,
          rect,
          classByPixel,
          classIndex,
          bbox,
          stepThresholds[classIndex] ?? [0, 0],
          false,
        );
        if (step === null) continue;
        classMap[target] = classIndex;
        confidence[target] = 1;
        const [red, green, blue] = ramp[step].rgb;
        const output = target * 4;
        colors[output] = red;
        colors[output + 1] = green;
        colors[output + 2] = blue;
        colors[output + 3] = 255;
        overriddenCells += 1;
      }
    }
  }

  let forcedOutlineCells = 0;
  if (profile.outlineBoundary) {
    const outlineRamp = classRamps[outlineClass];
    if (!outlineRamp) throw new Error("Missing outline ramp");
    const outlineStep =
      profile.outlineStep === "shadow"
        ? 0
        : profile.outlineStep === "base"
          ? 1
          : 2;
    const [outlineRed, outlineGreen, outlineBlue] =
      outlineRamp[outlineStep].rgb;
    const next = Uint8Array.from(classMap);
    for (let y = 0; y < cellHeight; y += 1) {
      for (let x = 0; x < cellWidth; x += 1) {
        const target = y * cellWidth + x;
        if (classMap[target] === 255) continue;
        const boundary =
          x === 0 ||
          y === 0 ||
          x === cellWidth - 1 ||
          y === cellHeight - 1 ||
          classMap[target - 1] === 255 ||
          classMap[target + 1] === 255 ||
          classMap[target - cellWidth] === 255 ||
          classMap[target + cellWidth] === 255;
        if (!boundary) continue;
        next[target] = outlineClass;
        confidence[target] = 1;
        const output = target * 4;
        colors[output] = outlineRed;
        colors[output + 1] = outlineGreen;
        colors[output + 2] = outlineBlue;
        colors[output + 3] = 255;
        forcedOutlineCells += 1;
      }
    }
    classMap.set(next);
  }

  const targetClassCounts: Record<string, number> = {};
  for (const entry of profile.classes) {
    targetClassCounts[entry.name] = 0;
  }
  let opaqueCells = 0;
  const lowConfidenceCells: RemasterStats["lowConfidenceCells"] = [];
  for (let index = 0; index < classMap.length; index += 1) {
    const classIndex = classMap[index] ?? 255;
    if (classIndex === 255) continue;
    opaqueCells += 1;
    const entry = profile.classes[classIndex];
    if (!entry) continue;
    targetClassCounts[entry.name] =
      (targetClassCounts[entry.name] ?? 0) + 1;
    const cellConfidence = confidence[index] ?? 0;
    if (cellConfidence < profile.lowConfidence) {
      lowConfidenceCells.push({
        x: index % cellWidth,
        y: Math.floor(index / cellWidth),
        confidence: Number(cellConfidence.toFixed(3)),
        class: entry.name,
      });
    }
  }

  const outputImage: RgbaImage = {
    width: cellWidth,
    height: cellHeight,
    data: Buffer.from(colors),
  };
  const roleRamps = [
    ...new Set(
      profile.classes
        .map((entry) => palette.roles[entry.role])
        .filter((name): name is string => Boolean(name)),
    ),
  ];
  const paletteValidation = validatePaletteImage(
    outputImage,
    palette,
    roleRamps,
  );

  return {
    image: outputImage,
    classMap,
    classNames: profile.classes.map((entry) => entry.name),
    confidence,
    bbox,
    stats: {
      sourceClassCounts,
      targetClassCounts,
      lowConfidenceCells,
      forcedOutlineCells,
      overriddenCells,
      opaqueCells,
    },
    paletteValidation,
  };
}

/** A stable false-colour map for reviewing segmentation. */
export function classPreviewColor(
  className: string,
): Rgb {
  switch (className) {
    case "outline":
      return [0, 0, 0];
    case "visor":
      return [255, 159, 67];
    case "accent":
      return [243, 104, 224];
    case "joint":
      return [29, 209, 161];
    case "grime":
      return [131, 149, 167];
    case "suit":
      return [74, 144, 226];
    default:
      return [255, 255, 255];
  }
}
