#!/usr/bin/env tsx
/**
 * Assemble a deterministic 32×32 material atlas from an approved seamless
 * swatch. This is a local art tool, not a runtime dependency.
 *
 * Usage:
 *   npm run art:atlas -- --in <swatch.png> --out <atlas.png> --rule edge
 *     [--edge-color "#05090b"] [--fill-color "#101a20"] [--seed 1]
 *     [--selection hash|tileable] [--weld-edges]
 *     [--asset-id tile.muscle.atlas] [--report <json>]
 *     [--preview <png>] [--preview-scale 4] [--background "#101a20"]
 *
 * Rules:
 *   edge   16 frames, 4×4 grid, 128×128
 *   blob47 47 frames, 8×6 grid, 256×192 (one empty cell)
 */

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { PNG } from "pngjs";
import {
  parseHexColor,
  type Rgb,
  type RgbaImage,
  scaleNearest,
} from "./art/ludo-sheet";

export type AtlasRule = "edge" | "blob47";
export type WindowSelection = "hash" | "tileable";

export const FRAME_SIZE = 32;

export const EDGE_KEYS = Array.from({ length: 16 }, (_, index) => index);

export const BLOB47_KEYS = [
  0, 1, 4, 5, 7, 16, 17, 20, 21, 23, 28, 29, 31, 64, 65, 68, 69, 71,
  80, 81, 84, 85, 87, 92, 93, 95, 112, 113, 116, 117, 119, 124, 125,
  127, 193, 197, 199, 209, 213, 215, 221, 223, 241, 245, 247, 253, 255,
] as const;

const N = 1;
const E = 4;
const S = 16;
const W = 64;

export interface AtlasLayout {
  rule: AtlasRule;
  columns: number;
  rows: number;
  width: number;
  height: number;
  keys: readonly number[];
}

export interface AtlasRegion {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface AtlasReport {
  schemaVersion: 1;
  rule: AtlasRule;
  frameWidth: number;
  columns: number;
  rows: number;
  seed: number;
  source: string;
  output: string;
  edgeColor: string;
  fillColor: string;
  assetId: string | null;
  weldEdges: boolean;
  selection: WindowSelection;
  regions: Record<string, AtlasRegion>;
  windows: Record<string, AtlasWindow>;
  frames?: Record<
    string,
    { kind: "atlas"; assetId: string; frame: string }
  >;
  warnings: string[];
}

export interface BuildAtlasInput {
  source: RgbaImage;
  rule: AtlasRule;
  edgeColor: readonly [number, number, number];
  fillColor: readonly [number, number, number];
  seed: number;
  /**
   * Make each frame's opposite edges pixel-identical before occlusion. This is
   * required for fully connected frames (mask-15 / mask-255) that repeat as
   * interior tiles; without it, every 32 px cell shows a texture seam.
   */
  weldEdges?: boolean;
  /**
   * `hash` picks deterministic windows from the seed (legacy). `tileable`
   * prefers windows whose opposite edges already match, reducing the amount of
   * correction the weld has to hide.
   */
  selection?: WindowSelection;
}

export interface AtlasWindow {
  x: number;
  y: number;
  score: number;
  colours: number;
}

export interface BuildAtlasResult {
  image: RgbaImage;
  layout: AtlasLayout;
  regions: Record<string, AtlasRegion>;
  weldEdges: boolean;
  selection: WindowSelection;
  windows: Record<string, AtlasWindow>;
  warnings: string[];
}

function fnv1a(value: string): number {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

function clampByte(value: number): number {
  return Math.max(0, Math.min(255, Math.round(value)));
}

function setPixel(
  image: RgbaImage,
  x: number,
  y: number,
  color: readonly [number, number, number],
): void {
  if (x < 0 || y < 0 || x >= image.width || y >= image.height) return;
  const index = (y * image.width + x) * 4;
  image.data[index] = clampByte(color[0]);
  image.data[index + 1] = clampByte(color[1]);
  image.data[index + 2] = clampByte(color[2]);
  image.data[index + 3] = 255;
}

function getPixel(
  image: RgbaImage,
  x: number,
  y: number,
): [number, number, number, number] {
  const index = (y * image.width + x) * 4;
  return [
    image.data[index] ?? 0,
    image.data[index + 1] ?? 0,
    image.data[index + 2] ?? 0,
    image.data[index + 3] ?? 0,
  ];
}

function compositeOpaque(
  color: readonly [number, number, number],
  alpha: number,
  background: readonly [number, number, number],
): [number, number, number] {
  const ratio = alpha / 255;
  return [
    clampByte(color[0] * ratio + background[0] * (1 - ratio)),
    clampByte(color[1] * ratio + background[1] * (1 - ratio)),
    clampByte(color[2] * ratio + background[2] * (1 - ratio)),
  ];
}

function swatchWindow(
  source: RgbaImage,
  originX: number,
  originY: number,
  fillColor: readonly [number, number, number],
): RgbaImage {
  const data = Buffer.alloc(FRAME_SIZE * FRAME_SIZE * 4);

  for (let y = 0; y < FRAME_SIZE; y += 1) {
    for (let x = 0; x < FRAME_SIZE; x += 1) {
      const [red, green, blue, alpha] = getPixel(
        source,
        originX + x,
        originY + y,
      );
      const [outRed, outGreen, outBlue] = compositeOpaque(
        [red, green, blue],
        alpha,
        fillColor,
      );
      const index = (y * FRAME_SIZE + x) * 4;
      data[index] = outRed;
      data[index + 1] = outGreen;
      data[index + 2] = outBlue;
      data[index + 3] = 255;
    }
  }

  return { width: FRAME_SIZE, height: FRAME_SIZE, data };
}

function colourDistance(
  left: readonly [number, number, number, number],
  right: readonly [number, number, number, number],
): number {
  return (
    (Math.abs(left[0] - right[0]) +
      Math.abs(left[1] - right[1]) +
      Math.abs(left[2] - right[2])) /
    3
  );
}

/** Score every aligned 32×32 window by how closely its opposite edges match. */
export function atlasWindows(source: RgbaImage): AtlasWindow[] {
  const maxX = Math.max(1, Math.floor(source.width / FRAME_SIZE));
  const maxY = Math.max(1, Math.floor(source.height / FRAME_SIZE));
  const windows: AtlasWindow[] = [];
  for (let row = 0; row < maxY; row += 1) {
    for (let column = 0; column < maxX; column += 1) {
      const originX = column * FRAME_SIZE;
      const originY = row * FRAME_SIZE;
      const colours = new Set<string>();
      let leftRight = 0;
      let topBottom = 0;
      for (let offset = 0; offset < FRAME_SIZE; offset += 1) {
        colours.add(
          getPixel(source, originX + offset, originY).join(","),
        );
        leftRight += colourDistance(
          getPixel(source, originX, originY + offset),
          getPixel(source, originX + FRAME_SIZE - 1, originY + offset),
        );
        topBottom += colourDistance(
          getPixel(source, originX + offset, originY),
          getPixel(source, originX + offset, originY + FRAME_SIZE - 1),
        );
      }
      for (let y = 0; y < FRAME_SIZE; y += 1) {
        for (let x = 0; x < FRAME_SIZE; x += 1) {
          colours.add(getPixel(source, originX + x, originY + y).join(","));
        }
      }
      windows.push({
        x: originX,
        y: originY,
        score: (leftRight + topBottom) / FRAME_SIZE,
        colours: colours.size,
      });
    }
  }
  return windows.sort((left, right) => left.score - right.score);
}

function chooseWindow(
  windows: readonly AtlasWindow[],
  mask: number,
  seed: number,
  selection: WindowSelection,
): AtlasWindow {
  if (selection === "hash" || windows.length <= 1) {
    const maxX = Math.max(
      1,
      Math.max(...windows.map((window) => window.x)) / FRAME_SIZE + 1,
    );
    const hash = fnv1a(`atlas:${mask}:${seed}`);
    const x = (hash % maxX) * FRAME_SIZE;
    const y =
      (Math.floor(hash / maxX) % Math.max(1, windows.length / maxX)) *
      FRAME_SIZE;
    return (
      windows.find((window) => window.x === x && window.y === y) ??
      windows[0]!
    );
  }

  const detailed = windows.filter((window) => window.colours >= 4);
  const pool = (detailed.length > 0 ? detailed : windows).slice(0, 8);
  const interior = mask === 15 || mask === 255;
  const index = interior
    ? 0
    : fnv1a(`atlas-window:${mask}:${seed}`) % pool.length;
  return pool[index] ?? windows[0]!;
}

function fillRect(
  image: RgbaImage,
  x: number,
  y: number,
  width: number,
  height: number,
  color: readonly [number, number, number],
): void {
  for (let row = y; row < y + height; row += 1) {
    for (let column = x; column < x + width; column += 1) {
      setPixel(image, column, row, color);
    }
  }
}

function internalMask(rule: AtlasRule, key: number): number {
  if (rule === "blob47") return key;
  let mask = 0;
  if (key & 1) mask |= N;
  if (key & 2) mask |= E;
  if (key & 4) mask |= S;
  if (key & 8) mask |= W;
  return mask;
}

function applyEdgeOcclusion(
  frame: RgbaImage,
  mask: number,
  edgeColor: readonly [number, number, number],
): void {
  const band = 2;
  const north = (mask & N) === 0;
  const east = (mask & E) === 0;
  const south = (mask & S) === 0;
  const west = (mask & W) === 0;

  if (north) fillRect(frame, 0, 0, FRAME_SIZE, band, edgeColor);
  if (south) {
    fillRect(frame, 0, FRAME_SIZE - band, FRAME_SIZE, band, edgeColor);
  }
  if (west) fillRect(frame, 0, 0, band, FRAME_SIZE, edgeColor);
  if (east) {
    fillRect(frame, FRAME_SIZE - band, 0, band, FRAME_SIZE, edgeColor);
  }

  const corner = 4;
  if (north && west) fillRect(frame, 0, 0, corner, corner, edgeColor);
  if (north && east) {
    fillRect(frame, FRAME_SIZE - corner, 0, corner, corner, edgeColor);
  }
  if (south && west) {
    fillRect(frame, 0, FRAME_SIZE - corner, corner, corner, edgeColor);
  }
  if (south && east) {
    fillRect(
      frame,
      FRAME_SIZE - corner,
      FRAME_SIZE - corner,
      corner,
      corner,
      edgeColor,
    );
  }
}

/**
 * Weld each frame's opposite edges in 2×2 blocks. The swatch is already on a
 * 2×2 grid, so copying the left/top block columns and rows preserves that grid
 * while making the frame repeat cleanly when the connected edges meet
 * themselves. Occlusion is applied afterwards, so open sides still get their
 * dark band.
 */
function weldFrameEdges(frame: RgbaImage): void {
  const block = 2;
  for (let y = 0; y < FRAME_SIZE; y += block) {
    for (let dy = 0; dy < block; dy += 1) {
      for (let dx = 0; dx < block; dx += 1) {
        const [red, green, blue] = getPixel(frame, dx, y + dy);
        setPixel(frame, FRAME_SIZE - block + dx, y + dy, [
          red,
          green,
          blue,
        ]);
      }
    }
  }
  for (let x = 0; x < FRAME_SIZE; x += block) {
    for (let dx = 0; dx < block; dx += 1) {
      for (let dy = 0; dy < block; dy += 1) {
        const [red, green, blue] = getPixel(frame, x + dx, dy);
        setPixel(frame, x + dx, FRAME_SIZE - block + dy, [
          red,
          green,
          blue,
        ]);
      }
    }
  }
}

function layoutFor(rule: AtlasRule): AtlasLayout {
  if (rule === "edge") {
    return {
      rule,
      columns: 4,
      rows: 4,
      width: 4 * FRAME_SIZE,
      height: 4 * FRAME_SIZE,
      keys: EDGE_KEYS,
    };
  }
  return {
    rule,
    columns: 8,
    rows: 6,
    width: 8 * FRAME_SIZE,
    height: 6 * FRAME_SIZE,
    keys: BLOB47_KEYS,
  };
}

function swatchWarnings(source: RgbaImage): string[] {
  const warnings: string[] = [];
  if (source.width < FRAME_SIZE || source.height < FRAME_SIZE) {
    warnings.push(
      `source is ${source.width}×${source.height}; needs at least ${FRAME_SIZE}×${FRAME_SIZE}`,
    );
  }
  if (source.width % FRAME_SIZE !== 0 || source.height % FRAME_SIZE !== 0) {
    warnings.push(
      `source is ${source.width}×${source.height}; not an exact ${FRAME_SIZE}px grid`,
    );
  }

  let clusterViolations = 0;
  for (let y = 0; y + 1 < source.height; y += 2) {
    for (let x = 0; x + 1 < source.width; x += 2) {
      const first = getPixel(source, x, y);
      for (let dy = 0; dy < 2; dy += 1) {
        for (let dx = 0; dx < 2; dx += 1) {
          const value = getPixel(source, x + dx, y + dy);
          if (
            value[0] !== first[0] ||
            value[1] !== first[1] ||
            value[2] !== first[2]
          ) {
            clusterViolations += 1;
          }
        }
      }
    }
  }
  if (clusterViolations > 0) {
    warnings.push(
      `${clusterViolations} pixels break the 2×2 colour-cluster grid; pixel-clean the swatch`,
    );
  }

  let alphaViolations = 0;
  for (let index = 3; index < source.data.length; index += 4) {
    const alpha = source.data[index] ?? 0;
    if (alpha !== 0 && alpha !== 255) alphaViolations += 1;
  }
  if (alphaViolations > 0) {
    warnings.push(
      `${alphaViolations} semi-transparent source pixels were composited opaque`,
    );
  }

  if (source.width >= FRAME_SIZE && source.height >= FRAME_SIZE) {
    const channelDistance = (
      left: readonly [number, number, number, number],
      right: readonly [number, number, number, number],
    ): number =>
      (Math.abs(left[0] - right[0]) +
        Math.abs(left[1] - right[1]) +
        Math.abs(left[2] - right[2])) /
      3;

    const averageColumnDistance = (): number => {
      let total = 0;
      let count = 0;
      for (let x = 0; x < source.width - 1; x += 1) {
        for (let y = 0; y < source.height; y += 1) {
          total += channelDistance(getPixel(source, x, y), getPixel(source, x + 1, y));
          count += 1;
        }
      }
      return count > 0 ? total / count : 0;
    };

    const averageRowDistance = (): number => {
      let total = 0;
      let count = 0;
      for (let y = 0; y < source.height - 1; y += 1) {
        for (let x = 0; x < source.width; x += 1) {
          total += channelDistance(getPixel(source, x, y), getPixel(source, x, y + 1));
          count += 1;
        }
      }
      return count > 0 ? total / count : 0;
    };

    let wrapColumnDistance = 0;
    let wrapRowDistance = 0;
    for (let offset = 0; offset < source.height; offset += 1) {
      wrapColumnDistance += channelDistance(
        getPixel(source, 0, offset),
        getPixel(source, source.width - 1, offset),
      );
    }
    for (let offset = 0; offset < source.width; offset += 1) {
      wrapRowDistance += channelDistance(
        getPixel(source, offset, 0),
        getPixel(source, offset, source.height - 1),
      );
    }
    wrapColumnDistance /= source.height;
    wrapRowDistance /= source.width;

    const columnLimit = Math.max(8, averageColumnDistance() * 3);
    const rowLimit = Math.max(8, averageRowDistance() * 3);
    if (wrapColumnDistance > columnLimit) {
      warnings.push(
        `source left/right edges differ by ${wrapColumnDistance.toFixed(1)} (limit ${columnLimit.toFixed(1)}); check horizontal tiling`,
      );
    }
    if (wrapRowDistance > rowLimit) {
      warnings.push(
        `source top/bottom edges differ by ${wrapRowDistance.toFixed(1)} (limit ${rowLimit.toFixed(1)}); check vertical tiling`,
      );
    }
  }

  return warnings;
}

export function buildAtlas(input: BuildAtlasInput): BuildAtlasResult {
  const layout = layoutFor(input.rule);
  const image: RgbaImage = {
    width: layout.width,
    height: layout.height,
    data: Buffer.alloc(layout.width * layout.height * 4),
  };
  const regions: Record<string, AtlasRegion> = {};
  const windows: Record<string, AtlasWindow> = {};
  const warnings = swatchWarnings(input.source);
  const selection = input.selection ?? "hash";
  const candidates = atlasWindows(input.source);

  for (let index = 0; index < layout.keys.length; index += 1) {
    const mask = layout.keys[index] as number;
    const column = index % layout.columns;
    const row = Math.floor(index / layout.columns);
    const x = column * FRAME_SIZE;
    const y = row * FRAME_SIZE;
    const window = chooseWindow(candidates, mask, input.seed, selection);
    windows[`mask-${mask}`] = window;
    const frame = swatchWindow(
      input.source,
      window.x,
      window.y,
      input.fillColor,
    );
    if (input.weldEdges) weldFrameEdges(frame);
    applyEdgeOcclusion(frame, internalMask(input.rule, mask), input.edgeColor);

    for (let frameY = 0; frameY < FRAME_SIZE; frameY += 1) {
      for (let frameX = 0; frameX < FRAME_SIZE; frameX += 1) {
        const color = getPixel(frame, frameX, frameY);
        setPixel(image, x + frameX, y + frameY, [
          color[0],
          color[1],
          color[2],
        ]);
      }
    }

    regions[`mask-${mask}`] = {
      x,
      y,
      width: FRAME_SIZE,
      height: FRAME_SIZE,
    };
  }

  // The blob47 atlas has one unused cell. Fill it so the image has no
  // transparent holes and no accidental empty region.
  if (layout.rule === "blob47") {
    const emptyX = 7 * FRAME_SIZE;
    const emptyY = 5 * FRAME_SIZE;
    fillRect(image, emptyX, emptyY, FRAME_SIZE, FRAME_SIZE, input.fillColor);
  }

  return {
    image,
    layout,
    regions,
    weldEdges: input.weldEdges === true,
    selection,
    windows,
    warnings,
  };
}

function arg(args: string[], name: string): string | undefined {
  const index = args.indexOf(`--${name}`);
  if (index === -1) return undefined;
  const value = args[index + 1];
  if (value === undefined || value.startsWith("--")) {
    throw new Error(`--${name} requires a value`);
  }
  return value;
}

function positiveInteger(value: string, label: string): number {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1) {
    throw new Error(`${label} must be a positive integer`);
  }
  return parsed;
}

function readPng(path: string): RgbaImage {
  const png = PNG.sync.read(readFileSync(path));
  return {
    width: png.width,
    height: png.height,
    data: Buffer.from(png.data),
  };
}

function writePng(image: RgbaImage, path: string): void {
  mkdirSync(dirname(path), { recursive: true });
  const png = new PNG({ width: image.width, height: image.height });
  image.data.copy(png.data);
  writeFileSync(path, PNG.sync.write(png));
}

function flattenPreview(
  image: RgbaImage,
  background: readonly [number, number, number],
  scale: number,
): RgbaImage {
  const scaled = scaleNearest(image, scale);
  for (let index = 0; index < scaled.data.length; index += 4) {
    const alpha = scaled.data[index + 3] ?? 0;
    if (alpha === 255) continue;
    const ratio = alpha / 255;
    scaled.data[index] = clampByte(
      (scaled.data[index] ?? 0) * ratio + background[0] * (1 - ratio),
    );
    scaled.data[index + 1] = clampByte(
      (scaled.data[index + 1] ?? 0) * ratio + background[1] * (1 - ratio),
    );
    scaled.data[index + 2] = clampByte(
      (scaled.data[index + 2] ?? 0) * ratio + background[2] * (1 - ratio),
    );
    scaled.data[index + 3] = 255;
  }
  return scaled;
}

function parseRgb(value: string, label: string): Rgb {
  try {
    return parseHexColor(value);
  } catch {
    throw new Error(`${label} must be a #rrggbb colour`);
  }
}

function main(): void {
  const args = process.argv.slice(2);
  const input = arg(args, "in");
  const output = arg(args, "out");
  if (!input) throw new Error("--in is required");
  if (!output) throw new Error("--out is required");

  const rule = (arg(args, "rule") ?? "edge") as AtlasRule;
  if (rule !== "edge" && rule !== "blob47") {
    throw new Error('--rule must be "edge" or "blob47"');
  }

  const sourcePath = resolve(input);
  const outputPath = resolve(output);
  const edgeColor = parseRgb(
    arg(args, "edge-color") ?? "#05090b",
    "--edge-color",
  );
  const fillColor = parseRgb(
    arg(args, "fill-color") ?? "#101a20",
    "--fill-color",
  );
  const seed = Number(arg(args, "seed") ?? "1");
  if (!Number.isFinite(seed)) throw new Error("--seed must be finite");
  const weldEdges = args.includes("--weld-edges");
  const selection = (arg(args, "selection") ?? "hash") as WindowSelection;
  if (selection !== "hash" && selection !== "tileable") {
    throw new Error('--selection must be "hash" or "tileable"');
  }

  const source = readPng(sourcePath);
  const result = buildAtlas({
    source,
    rule,
    edgeColor,
    fillColor,
    seed,
    weldEdges,
    selection,
  });
  writePng(result.image, outputPath);

  const assetId = arg(args, "asset-id") ?? null;
  const frames = assetId
    ? Object.fromEntries(
        Object.keys(result.regions).map((region) => {
          const key = region.slice("mask-".length);
          return [
            key,
            { kind: "atlas" as const, assetId, frame: region },
          ];
        }),
      )
    : undefined;

  const report: AtlasReport = {
    schemaVersion: 1,
    rule,
    frameWidth: FRAME_SIZE,
    columns: result.layout.columns,
    rows: result.layout.rows,
    seed,
    source: sourcePath,
    output: outputPath,
    edgeColor: arg(args, "edge-color") ?? "#05090b",
    fillColor: arg(args, "fill-color") ?? "#101a20",
    assetId,
    weldEdges,
    selection: result.selection,
    regions: result.regions,
    windows: result.windows,
    ...(frames ? { frames } : {}),
    warnings: result.warnings,
  };

  const reportPath = arg(args, "report");
  if (reportPath) {
    mkdirSync(dirname(resolve(reportPath)), { recursive: true });
    writeFileSync(resolve(reportPath), `${JSON.stringify(report, null, 2)}\n`);
  }

  const previewPath = arg(args, "preview");
  if (previewPath) {
    const scale = positiveInteger(arg(args, "preview-scale") ?? "4", "--preview-scale");
    const background = parseRgb(
      arg(args, "background") ?? "#101a20",
      "--background",
    );
    const preview = flattenPreview(result.image, background, scale);
    writePng(preview, resolve(previewPath));
  }

  process.stdout.write(
    `Wrote ${rule} atlas ${result.layout.width}×${result.layout.height} ` +
      `(${result.layout.keys.length} frames) to ${outputPath}\n`,
  );
  for (const warning of result.warnings) {
    process.stderr.write(`warning: ${warning}\n`);
  }
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  main();
}
