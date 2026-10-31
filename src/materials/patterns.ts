import type {
  PatternBitmap,
  PatternGenerator,
  PatternSource,
} from "./types";

const DEFAULT_SIZE = 32;
const TAU = Math.PI * 2;

export function fnv1a(value: string): number {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function hash2(x: number, y: number, seed: number): number {
  let hash = Math.imul(x | 0, 374761393) ^ Math.imul(y | 0, 668265263) ^ seed;
  hash = Math.imul(hash ^ (hash >>> 13), 1274126177);
  return ((hash ^ (hash >>> 16)) >>> 0) / 4294967296;
}

function wrap(value: number, period: number): number {
  return ((value % period) + period) % period;
}

function smooth(value: number): number {
  return value * value * (3 - 2 * value);
}

function lerp(left: number, right: number, amount: number): number {
  return left + (right - left) * amount;
}

function valueNoise(
  x: number,
  y: number,
  period: number,
  seed: number,
): number {
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const tx = smooth(x - x0);
  const ty = smooth(y - y0);
  const sample = (sx: number, sy: number) =>
    hash2(wrap(sx, period), wrap(sy, period), seed);
  const top = lerp(sample(x0, y0), sample(x0 + 1, y0), tx);
  const bottom = lerp(sample(x0, y0 + 1), sample(x0 + 1, y0 + 1), tx);
  return lerp(top, bottom, ty);
}

function fbm(
  x: number,
  y: number,
  period: number,
  seed: number,
  octaves = 4,
): number {
  let amplitude = 0.5;
  let frequency = 1;
  let total = 0;
  let weight = 0;
  for (let octave = 0; octave < octaves; octave += 1) {
    total +=
      valueNoise(x * frequency, y * frequency, period * frequency, seed + octave) *
      amplitude;
    weight += amplitude;
    amplitude *= 0.5;
    frequency *= 2;
  }
  return weight > 0 ? total / weight : 0;
}

function sampleGenerator(
  generator: PatternGenerator,
  x: number,
  y: number,
  size: number,
  seed: number,
  direction: number,
): number {
  switch (generator) {
    case "grain": {
      const cell = hash2(x, y, seed);
      const broad = fbm((x / size) * 3, (y / size) * 3, 3, seed, 2);
      return cell * 0.55 + broad * 0.45;
    }
    case "fbm": {
      return fbm((x / size) * 4, (y / size) * 4, 4, seed, 4);
    }
    case "fibers": {
      const wobble = fbm(
        (x / size) * 3,
        (y / size) * 3,
        3,
        seed,
        3,
      );
      const alongX = Math.sin((TAU * x) / size * 3 + wobble * 2.4);
      const alongY = Math.sin((TAU * y) / size * 3 + wobble * 2.4);
      const mixX = 0.5 + 0.5 * Math.cos(direction);
      const mixY = 0.5 + 0.5 * Math.sin(direction);
      return 0.5 + (alongX * mixX + alongY * mixY) * 0.42;
    }
    case "cellular": {
      const cells = 4;
      const cellSize = size / cells;
      const cx = Math.floor(x / cellSize);
      const cy = Math.floor(y / cellSize);
      let nearest = Number.POSITIVE_INFINITY;
      for (let oy = -1; oy <= 1; oy += 1) {
        for (let ox = -1; ox <= 1; ox += 1) {
          const gx = wrap(cx + ox, cells);
          const gy = wrap(cy + oy, cells);
          const px = (gx + hash2(gx, gy, seed)) * cellSize;
          const py = (gy + hash2(gx, gy, seed + 17)) * cellSize;
          const dx = px - x;
          const dy = py - y;
          nearest = Math.min(nearest, Math.sqrt(dx * dx + dy * dy));
        }
      }
      return 1 - Math.min(1, nearest / (cellSize * 0.9));
    }
    case "circuit": {
      const grid = 8;
      const gx = x % grid;
      const gy = y % grid;
      const lineX = gx < 1 ? 1 : 0;
      const lineY = gy < 1 ? 1 : 0;
      const node =
        hash2(Math.floor(x / grid), Math.floor(y / grid), seed) > 0.72 ? 0.8 : 0;
      const trace = Math.max(lineX, lineY) * 0.55;
      return Math.max(trace, node);
    }
  }
}

export interface PatternBitmapOptions {
  size?: number;
  direction?: number;
  contrast?: number;
}

export function generatePatternBitmap(
  source: Extract<PatternSource, { kind: "procedural" }>,
  options: PatternBitmapOptions = {},
): PatternBitmap {
  const size = options.size ?? DEFAULT_SIZE;
  const direction = options.direction ?? 0;
  const contrast = Math.max(0, Math.min(1, options.contrast ?? 0.5));
  const data = new Uint8ClampedArray(size * size * 4);

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const value = Math.max(
        0,
        Math.min(
          1,
          sampleGenerator(
            source.generator,
            x,
            y,
            size,
            source.seed,
            direction,
          ),
        ),
      );
      const alpha = value * contrast;
      const index = (y * size + x) * 4;
      data[index] = 255;
      data[index + 1] = 255;
      data[index + 2] = 255;
      data[index + 3] = Math.round(alpha * 255);
    }
  }

  return { width: size, height: size, data };
}

export function sampleBitmap(
  bitmap: PatternBitmap,
  x: number,
  y: number,
): number {
  const sx = ((Math.floor(x) % bitmap.width) + bitmap.width) % bitmap.width;
  const sy = ((Math.floor(y) % bitmap.height) + bitmap.height) % bitmap.height;
  return (bitmap.data[(sy * bitmap.width + sx) * 4 + 3] ?? 0) / 255;
}

/**
 * Serialize the bitmap as a compact SVG data URL. Consecutive equal alpha
 * pixels are merged into horizontal runs; this is small enough for UI custom
 * properties and keeps the CSS source identical to the Phaser texture.
 */
export function bitmapToSvgDataUrl(bitmap: PatternBitmap): string {
  const rows: string[] = [];
  for (let y = 0; y < bitmap.height; y += 1) {
    let runStart = 0;
    let runAlpha = bitmap.data[(y * bitmap.width) * 4 + 3] ?? 0;
    for (let x = 1; x <= bitmap.width; x += 1) {
      const alpha =
        x < bitmap.width
          ? (bitmap.data[(y * bitmap.width + x) * 4 + 3] ?? 0)
          : -1;
      if (alpha === runAlpha) continue;
      if (runAlpha > 0) {
        const opacity = (Math.round((runAlpha / 255) * 16) / 16).toFixed(2);
        rows.push(
          `<rect x="${runStart}" y="${y}" width="${x - runStart}" height="1" fill="#fff" fill-opacity="${opacity}"/>`,
        );
      }
      runStart = x;
      runAlpha = alpha;
    }
  }

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${bitmap.width}" height="${bitmap.height}" viewBox="0 0 ${bitmap.width} ${bitmap.height}" shape-rendering="crispEdges">${rows.join("")}</svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}
