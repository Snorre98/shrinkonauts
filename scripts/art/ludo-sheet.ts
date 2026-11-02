/**
 * Pure helpers for importing Ludo.ai sprite-sheet exports.
 *
 * Ludo writes a TexturePacker-style JSON next to the PNG. This module validates
 * that JSON and slices frames out of an RGBA buffer. It deliberately has no
 * PNG dependency so the parsing and pixel operations stay easy to test.
 */

export interface LudoFrameRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface LudoSheetMeta {
  app?: string;
  image?: string;
  format?: string;
  size: { w: number; h: number };
  scale?: string;
}

export interface LudoSheetFrame {
  key: string;
  rect: LudoFrameRect;
  sourceSize: { w: number; h: number };
  duration?: number;
}

export interface LudoSheet {
  meta: LudoSheetMeta;
  frames: LudoSheetFrame[];
}

export interface RgbaImage {
  width: number;
  height: number;
  data: Buffer;
}

export type Rgb = readonly [number, number, number];

type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
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

function optionalString(value: unknown, label: string): string | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`${label} must be a non-empty string`);
  }
  return value;
}

function parseRect(value: unknown, label: string): LudoFrameRect {
  if (!isRecord(value)) {
    throw new Error(`${label} must be an object`);
  }
  return {
    x: nonNegativeInteger(value.x, `${label}.x`),
    y: nonNegativeInteger(value.y, `${label}.y`),
    w: positiveInteger(value.w, `${label}.w`),
    h: positiveInteger(value.h, `${label}.h`),
  };
}

function parseSize(value: unknown, label: string): { w: number; h: number } {
  if (!isRecord(value)) {
    throw new Error(`${label} must be an object`);
  }
  return {
    w: positiveInteger(value.w, `${label}.w`),
    h: positiveInteger(value.h, `${label}.h`),
  };
}

export function parseLudoSheet(value: unknown): LudoSheet {
  if (!isRecord(value)) {
    throw new Error("Ludo sheet must be an object");
  }
  if (!isRecord(value.meta)) {
    throw new Error("Ludo sheet meta must be an object");
  }
  if (!isRecord(value.frames) || Object.keys(value.frames).length === 0) {
    throw new Error("Ludo sheet must contain at least one frame");
  }

  const app = optionalString(value.meta.app, "meta.app");
  const image = optionalString(value.meta.image, "meta.image");
  const format = optionalString(value.meta.format, "meta.format");
  const scale = optionalString(value.meta.scale, "meta.scale");
  const meta: LudoSheetMeta = {
    size: parseSize(value.meta.size, "meta.size"),
    ...(app !== undefined ? { app } : {}),
    ...(image !== undefined ? { image } : {}),
    ...(format !== undefined ? { format } : {}),
    ...(scale !== undefined ? { scale } : {}),
  };

  const frames: LudoSheetFrame[] = [];
  for (const [key, rawFrame] of Object.entries(value.frames)) {
    if (key.trim() === "") {
      throw new Error("Ludo frame keys must be non-empty");
    }
    if (!isRecord(rawFrame)) {
      throw new Error(`frames.${key} must be an object`);
    }
    if (rawFrame.rotated !== false) {
      throw new Error(`frames.${key}.rotated must be false`);
    }
    if (rawFrame.trimmed !== false) {
      throw new Error(`frames.${key}.trimmed must be false`);
    }

    const rect = parseRect(rawFrame.frame, `frames.${key}.frame`);
    const sourceSize = parseSize(
      rawFrame.sourceSize,
      `frames.${key}.sourceSize`,
    );
    if (
      rect.x + rect.w > meta.size.w ||
      rect.y + rect.h > meta.size.h
    ) {
      throw new Error(`frames.${key} lies outside meta.size`);
    }
    if (rect.w !== sourceSize.w || rect.h !== sourceSize.h) {
      throw new Error(
        `frames.${key} has a sourceSize that does not match its frame rect`,
      );
    }

    let duration: number | undefined;
    if (rawFrame.duration !== undefined) {
      duration = positiveInteger(
        rawFrame.duration,
        `frames.${key}.duration`,
      );
    }

    frames.push({ key, rect, sourceSize, ...(duration ? { duration } : {}) });
  }

  frames.sort((left, right) =>
    left.key.localeCompare(right.key, undefined, { numeric: true }),
  );

  return { meta, frames };
}

export function cropRgba(image: RgbaImage, rect: LudoFrameRect): RgbaImage {
  if (rect.x + rect.w > image.width || rect.y + rect.h > image.height) {
    throw new Error("Crop rectangle lies outside the image");
  }
  const data = Buffer.alloc(rect.w * rect.h * 4);
  for (let row = 0; row < rect.h; row += 1) {
    const sourceStart = ((rect.y + row) * image.width + rect.x) * 4;
    const targetStart = row * rect.w * 4;
    image.data.copy(
      data,
      targetStart,
      sourceStart,
      sourceStart + rect.w * 4,
    );
  }
  return { width: rect.w, height: rect.h, data };
}

export function sliceSheet(
  image: RgbaImage,
  sheet: LudoSheet,
): Array<{ key: string; image: RgbaImage; duration?: number }> {
  if (image.width !== sheet.meta.size.w || image.height !== sheet.meta.size.h) {
    throw new Error(
      `Sheet image is ${image.width}×${image.height}, expected ${sheet.meta.size.w}×${sheet.meta.size.h}`,
    );
  }
  return sheet.frames.map((frame) => ({
    key: frame.key,
    image: cropRgba(image, frame.rect),
    ...(frame.duration !== undefined ? { duration: frame.duration } : {}),
  }));
}

export function flattenRgba(image: RgbaImage, background: Rgb): RgbaImage {
  const data = Buffer.alloc(image.data.length);
  for (let index = 0; index < image.data.length; index += 4) {
    const alpha = image.data[index + 3] / 255;
    data[index] = Math.round(image.data[index] * alpha + background[0] * (1 - alpha));
    data[index + 1] = Math.round(
      image.data[index + 1] * alpha + background[1] * (1 - alpha),
    );
    data[index + 2] = Math.round(
      image.data[index + 2] * alpha + background[2] * (1 - alpha),
    );
    data[index + 3] = 255;
  }
  return { width: image.width, height: image.height, data };
}

export function scaleNearest(image: RgbaImage, scale: number): RgbaImage {
  if (!Number.isInteger(scale) || scale < 1) {
    throw new Error("scale must be a positive integer");
  }
  if (scale === 1) return image;

  const width = image.width * scale;
  const height = image.height * scale;
  const data = Buffer.alloc(width * height * 4);
  for (let y = 0; y < height; y += 1) {
    const sourceY = Math.floor(y / scale);
    for (let x = 0; x < width; x += 1) {
      const sourceX = Math.floor(x / scale);
      const sourceStart = (sourceY * image.width + sourceX) * 4;
      const targetStart = (y * width + x) * 4;
      image.data.copy(data, targetStart, sourceStart, sourceStart + 4);
    }
  }
  return { width, height, data };
}

export function commonFrameDuration(sheet: LudoSheet): number | undefined {
  const durations = new Set(
    sheet.frames
      .map((frame) => frame.duration)
      .filter((duration): duration is number => duration !== undefined),
  );
  if (durations.size !== 1) return undefined;
  return [...durations][0];
}

export function fpsFromDuration(durationMs: number): number {
  if (!Number.isFinite(durationMs) || durationMs <= 0) {
    throw new Error("durationMs must be positive");
  }
  return 1000 / durationMs;
}

export function parseHexColor(value: string): Rgb {
  const normalized = value.trim().replace(/^#/, "");
  if (!/^[0-9a-f]{6}$/i.test(normalized)) {
    throw new Error(`Expected a #rrggbb colour, got ${value}`);
  }
  return [
    Number.parseInt(normalized.slice(0, 2), 16),
    Number.parseInt(normalized.slice(2, 4), 16),
    Number.parseInt(normalized.slice(4, 6), 16),
  ];
}
