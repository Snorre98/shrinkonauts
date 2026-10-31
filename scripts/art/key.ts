/**
 * Pure helpers for removing a flat chroma-key background from concept art.
 *
 * The source plates are JPEGs, so a plain ffmpeg colorkey leaves magenta
 * fringing on the compressed edges. This module keys by RGB distance and
 * optionally suppresses the key colour's spill before the alpha threshold is
 * applied. Output alpha is hard 0/255, matching the pixel-art alpha contract.
 */

import {
  parseHexColor,
  type Rgb,
  type RgbaImage,
} from "./ludo-sheet";

export interface ChromaKeyOptions {
  key: Rgb;
  /** Normalised RGB distance (0..1) treated as fully background. */
  tolerance: number;
  /** Additional distance band used to place the hard alpha threshold. */
  softness: number;
  /** Alpha threshold within the softness band; 0.5 is the midpoint. */
  alphaThreshold: number;
  despill: boolean;
}

export interface ChromaKeyStats {
  keyedPixels: number;
  keptPixels: number;
  despilledPixels: number;
  edgePixels: number;
}

export interface ChromaKeyResult {
  image: RgbaImage;
  stats: ChromaKeyStats;
}

export interface AlphaBBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export const DEFAULT_CHROMA_KEY = "#ff00ff";

export function parseChromaKeyOptions(
  value: Partial<{
    key: string;
    tolerance: number;
    softness: number;
    alphaThreshold: number;
    despill: boolean;
  }> = {},
): ChromaKeyOptions {
  const tolerance = value.tolerance ?? 0.18;
  const softness = value.softness ?? 0.08;
  const alphaThreshold = value.alphaThreshold ?? 0.5;

  if (!Number.isFinite(tolerance) || tolerance < 0 || tolerance > 1) {
    throw new Error("key tolerance must be within 0..1");
  }
  if (!Number.isFinite(softness) || softness < 0 || softness > 1) {
    throw new Error("key softness must be within 0..1");
  }
  if (
    !Number.isFinite(alphaThreshold) ||
    alphaThreshold < 0 ||
    alphaThreshold > 1
  ) {
    throw new Error("key alpha threshold must be within 0..1");
  }

  return {
    key: parseHexColor(value.key ?? DEFAULT_CHROMA_KEY),
    tolerance,
    softness,
    alphaThreshold,
    despill: value.despill ?? true,
  };
}

const MAX_RGB_DISTANCE = Math.sqrt(3 * 255 * 255);

export function chromaDistance(
  red: number,
  green: number,
  blue: number,
  key: Rgb,
): number {
  const dr = red - key[0];
  const dg = green - key[1];
  const db = blue - key[2];
  return Math.sqrt(dr * dr + dg * dg + db * db) / MAX_RGB_DISTANCE;
}

function despillPixel(
  red: number,
  green: number,
  blue: number,
  key: Rgb,
): [number, number, number] {
  const channels = [red, green, blue];
  const high = [0, 1, 2].filter((index) => (key[index] ?? 0) > 128);
  const low = [0, 1, 2].filter((index) => (key[index] ?? 0) <= 128);
  if (high.length === 0 || low.length === 0) {
    return [red, green, blue];
  }

  const highMin = Math.min(...high.map((index) => channels[index] ?? 0));
  const lowMax = Math.max(...low.map((index) => channels[index] ?? 0));
  const spill = highMin - lowMax;
  if (spill <= 0) {
    return [red, green, blue];
  }

  for (const index of high) {
    channels[index] = Math.max(0, (channels[index] ?? 0) - spill);
  }
  return [channels[0] ?? 0, channels[1] ?? 0, channels[2] ?? 0];
}

export function keyChroma(
  image: RgbaImage,
  options: ChromaKeyOptions,
): ChromaKeyResult {
  const data = Buffer.from(image.data);
  const stats: ChromaKeyStats = {
    keyedPixels: 0,
    keptPixels: 0,
    despilledPixels: 0,
    edgePixels: 0,
  };

  const threshold = options.tolerance;
  const softEnd = options.tolerance + options.softness;

  for (let index = 0; index < data.length; index += 4) {
    const alpha = data[index + 3] ?? 0;
    if (alpha === 0) {
      continue;
    }

    const red = data[index] ?? 0;
    const green = data[index + 1] ?? 0;
    const blue = data[index + 2] ?? 0;
    const distance = chromaDistance(red, green, blue, options.key);

    if (distance <= threshold) {
      data[index] = 0;
      data[index + 1] = 0;
      data[index + 2] = 0;
      data[index + 3] = 0;
      stats.keyedPixels += 1;
      continue;
    }

    if (distance < softEnd) {
      const softAlpha =
        options.softness === 0
          ? 1
          : (distance - threshold) / options.softness;
      stats.edgePixels += 1;
      if (softAlpha < options.alphaThreshold) {
        data[index] = 0;
        data[index + 1] = 0;
        data[index + 2] = 0;
        data[index + 3] = 0;
        stats.keyedPixels += 1;
        continue;
      }
    }

    if (options.despill) {
      const [nextRed, nextGreen, nextBlue] = despillPixel(
        red,
        green,
        blue,
        options.key,
      );
      if (
        nextRed !== red ||
        nextGreen !== green ||
        nextBlue !== blue
      ) {
        data[index] = nextRed;
        data[index + 1] = nextGreen;
        data[index + 2] = nextBlue;
        stats.despilledPixels += 1;
      }
    }

    data[index + 3] = 255;
    stats.keptPixels += 1;
  }

  return {
    image: { width: image.width, height: image.height, data },
    stats,
  };
}

export function alphaBounds(image: RgbaImage): AlphaBBox | null {
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

  if (maxX < 0 || maxY < 0) {
    return null;
  }
  return {
    x: minX,
    y: minY,
    width: maxX - minX + 1,
    height: maxY - minY + 1,
  };
}

export function cropAlpha(image: RgbaImage, bbox: AlphaBBox): RgbaImage {
  if (
    bbox.x < 0 ||
    bbox.y < 0 ||
    bbox.x + bbox.width > image.width ||
    bbox.y + bbox.height > image.height
  ) {
    throw new Error("Alpha crop lies outside the image");
  }
  const data = Buffer.alloc(bbox.width * bbox.height * 4);
  for (let row = 0; row < bbox.height; row += 1) {
    const sourceStart = ((bbox.y + row) * image.width + bbox.x) * 4;
    const targetStart = row * bbox.width * 4;
    image.data.copy(
      data,
      targetStart,
      sourceStart,
      sourceStart + bbox.width * 4,
    );
  }
  return { width: bbox.width, height: bbox.height, data };
}

export function trimAlpha(image: RgbaImage): {
  image: RgbaImage;
  bbox: AlphaBBox;
} | null {
  const bbox = alphaBounds(image);
  if (!bbox) return null;
  return { image: cropAlpha(image, bbox), bbox };
}

export function resizeNearest(
  image: RgbaImage,
  width: number,
  height: number,
): RgbaImage {
  if (
    !Number.isInteger(width) ||
    !Number.isInteger(height) ||
    width < 1 ||
    height < 1
  ) {
    throw new Error("resize dimensions must be positive integers");
  }
  if (width === image.width && height === image.height) {
    return image;
  }

  const data = Buffer.alloc(width * height * 4);
  for (let y = 0; y < height; y += 1) {
    const sourceY = Math.min(
      image.height - 1,
      Math.floor((y * image.height) / height),
    );
    for (let x = 0; x < width; x += 1) {
      const sourceX = Math.min(
        image.width - 1,
        Math.floor((x * image.width) / width),
      );
      const sourceStart = (sourceY * image.width + sourceX) * 4;
      const targetStart = (y * width + x) * 4;
      image.data.copy(data, targetStart, sourceStart, sourceStart + 4);
    }
  }
  return { width, height, data };
}
