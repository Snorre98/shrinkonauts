#!/usr/bin/env tsx
/**
 * Process the approved M3.5 bathroom-hub plates into runtime assets.
 *
 * Keying stays in `npm run art:key`; this step crops the keyed plates, applies
 * the small documented cleanups (washer cable, door glass, towel ghost), fits
 * them into the hub cells, quantises sprites to `palette.hub.json`, and writes
 * previews/reports. The opaque scene plate is shifted, downscaled, and exported
 * losslessly, but is deliberately not palette-quantised (the warm lamp and wall
 * grime are the recorded scene-plate exception).
 *
 * Usage:
 *   npm run art:hub -- [--asset <id>] [--no-write]
 */

import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  copyFileSync,
  mkdirSync,
  readFileSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { dirname, join } from "node:path";
import { PNG } from "pngjs";
import { alphaBounds } from "./art/key";
import {
  flattenRgba,
  parseHexColor,
  scaleNearest,
  type RgbaImage,
} from "./art/ludo-sheet";
import {
  parsePaletteDocument,
  quantizeImage,
  validatePaletteImage,
  type PaletteDocument,
} from "./art/palette";
import { resizeBox } from "./art/resample";

interface Cell {
  width: number;
  height: number;
}

interface RectSpec {
  x: number;
  y: number;
  width: number;
  height: number;
}

type MaskSpec =
  | { kind: "clear-rect"; x: number; y: number; width: number; height: number }
  | {
      kind: "fill-rect";
      x: number;
      y: number;
      width: number;
      height: number;
      color: string;
    }
  | { kind: "clear-circle"; x: number; y: number; radius: number }
  | { kind: "remove-pink" };

type Align = "center" | "bottom-center" | "top-center";

interface AssetSpec {
  id: string;
  source: string;
  output: string;
  cell: Cell;
  crop?: RectSpec;
  masks?: MaskSpec[];
  margin?: number;
  align?: Align;
  /** Anchor in cropped-source coordinates; target in cell coordinates. */
  anchor?: { sourceX: number; sourceY: number; cellX: number; cellY: number };
  ramps?: string[];
  quantize?: boolean;
  maxBytes: number;
  previewScales?: number[];
  note?: string;
}

const KEYED = "art-source/nanobanan/keyed";
const SPRITES = "public/hub/bathroom/shared/sprites";
const UI = "public/hub/bathroom/shared/ui";
const BACKGROUNDS = "public/hub/bathroom/shared/backgrounds";
const PREVIEW_DIR = "art-source/previews/nanobanan/hub";
const REPORT_DIR = "art-source/nanobanan/reports/hub";
const PALETTE_PATH = "art-source/nanobanan/palette.hub.json";
const BACKGROUND_SOURCE =
  "art-source/nanobanan/new-main-menu/bg-bathroom-wall.jpeg";
const BACKGROUND_OUTPUT = `${BACKGROUNDS}/bathroom-wall.webp`;
const BACKGROUND_CROP_X = 296;
const BACKGROUND_PAD = "#1b2b2c";

const ALL_RAMPS = [
  "teal",
  "bone",
  "boneShadow",
  "nerve",
  "joint",
  "muscle",
  "sage",
  "ink",
  "appliance",
];

const ASSETS: AssetSpec[] = [
  {
    id: "sprite.prop.washer",
    source: `${KEYED}/hub-washer.png`,
    output: `${SPRITES}/washer.png`,
    // Remove the cable at the left edge and the coiled cord/plug that runs
    // below the body; the plinth is filled with the appliance shadow colour.
    crop: { x: 63, y: 108, width: 1038, height: 1275 },
    masks: [
      { kind: "fill-rect", x: 560, y: 1110, width: 478, height: 165, color: "#263236" },
    ],
    cell: { width: 180, height: 240 },
    margin: 0,
    align: "bottom-center",
    maxBytes: 32 * 1024,
  },
  {
    id: "sprite.prop.washer.door",
    source: `${KEYED}/hub-washer-door.png`,
    output: `${SPRITES}/washer-door.png`,
    cell: { width: 88, height: 88 },
    margin: 3,
    anchor: { sourceX: 587, sourceY: 606, cellX: 44, cellY: 44 },
    // The delivered door has opaque glass. Cut the glass out so the drum is
    // visible behind the frame and can rotate.
    masks: [{ kind: "clear-circle", x: 587, y: 606, radius: 380 }],
    maxBytes: 16 * 1024,
  },
  {
    id: "sprite.prop.washer.drum",
    source: `${KEYED}/hub-washer-drum.png`,
    output: `${SPRITES}/washer-drum.png`,
    cell: { width: 80, height: 80 },
    margin: 2,
    align: "center",
    maxBytes: 16 * 1024,
  },
  {
    id: "sprite.player.civilian",
    source: `${KEYED}/hub-civilian.png`,
    output: `${SPRITES}/civilian.png`,
    cell: { width: 32, height: 64 },
    margin: 0,
    align: "bottom-center",
    maxBytes: 16 * 1024,
  },
  {
    id: "sprite.prop.poster",
    source: `${KEYED}/hub-poster.png`,
    output: `${SPRITES}/poster.png`,
    cell: { width: 48, height: 64 },
    margin: 0,
    align: "center",
    maxBytes: 8 * 1024,
  },
  {
    id: "sprite.prop.cartridge.anatomy",
    source: `${KEYED}/hub-cartridge-anatomy.png`,
    output: `${SPRITES}/cartridge-anatomy.png`,
    cell: { width: 24, height: 32 },
    margin: 0,
    align: "center",
    maxBytes: 8 * 1024,
  },
  {
    id: "sprite.prop.cartridge.silicon",
    source: `${KEYED}/hub-cartridge-silicon.png`,
    output: `${SPRITES}/cartridge-silicon.png`,
    cell: { width: 24, height: 32 },
    margin: 0,
    align: "center",
    maxBytes: 8 * 1024,
  },
  {
    id: "ui.icon.cycle.anatomy",
    source: `${KEYED}/hub-cycle-icons.png`,
    output: `${UI}/icon-cycle-anatomy.png`,
    crop: { x: 0, y: 0, width: 1218, height: 1268 },
    cell: { width: 16, height: 16 },
    margin: 0,
    align: "center",
    maxBytes: 4 * 1024,
    previewScales: [2, 4, 8],
  },
  {
    id: "ui.icon.cycle.silicon",
    source: `${KEYED}/hub-cycle-icons.png`,
    output: `${UI}/icon-cycle-silicon.png`,
    crop: { x: 1330, y: 0, width: 1218, height: 1268 },
    cell: { width: 16, height: 16 },
    margin: 0,
    align: "center",
    maxBytes: 4 * 1024,
    previewScales: [2, 4, 8],
  },
  {
    id: "sprite.prop.plush.neuron",
    source: `${KEYED}/hub-plush-neuron.png`,
    output: `${SPRITES}/plush-neuron.png`,
    cell: { width: 24, height: 24 },
    margin: 0,
    align: "bottom-center",
    maxBytes: 8 * 1024,
  },
  {
    id: "sprite.prop.detergent.bottles",
    source: `${KEYED}/hub-detergent-bottles.png`,
    output: `${SPRITES}/detergent-bottles.png`,
    cell: { width: 32, height: 32 },
    margin: 0,
    align: "bottom-center",
    maxBytes: 8 * 1024,
  },
  {
    id: "sprite.prop.laundry.basket",
    source: `${KEYED}/hub-laundry-basket.png`,
    output: `${SPRITES}/laundry-basket.png`,
    cell: { width: 32, height: 24 },
    margin: 0,
    align: "bottom-center",
    maxBytes: 8 * 1024,
  },
  {
    id: "sprite.prop.towel",
    // Cleaned source: the ghosted basket behind the towel was removed with the
    // documented pink-removal + silhouette mask pass before this fit.
    source: `${KEYED}/hub-towel-final2.png`,
    output: `${SPRITES}/towel.png`,
    cell: { width: 16, height: 32 },
    margin: 0,
    align: "top-center",
    maxBytes: 8 * 1024,
  },
];

interface CliOptions {
  asset?: string;
  noWrite: boolean;
}

function usage(): string {
  return "Usage: npm run art:hub -- [--asset <id>] [--no-write]";
}

function parseArgs(args: string[]): CliOptions {
  let asset: string | undefined;
  const index = args.indexOf("--asset");
  if (index !== -1) {
    const value = args[index + 1];
    if (!value || value.startsWith("--")) {
      throw new Error("--asset requires an id");
    }
    asset = value;
  }
  return { ...(asset ? { asset } : {}), noWrite: args.includes("--no-write") };
}

function decodePng(path: string): RgbaImage {
  const png = PNG.sync.read(readFileSync(path));
  return { width: png.width, height: png.height, data: Buffer.from(png.data) };
}

function encodePng(image: RgbaImage): Buffer {
  const png = new PNG({ width: image.width, height: image.height });
  image.data.copy(png.data);
  return PNG.sync.write(png);
}

function writePng(path: string, image: RgbaImage): void {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, encodePng(image));
}

function cropImage(image: RgbaImage, rect: RectSpec): RgbaImage {
  if (
    rect.x < 0 ||
    rect.y < 0 ||
    rect.width <= 0 ||
    rect.height <= 0 ||
    rect.x + rect.width > image.width ||
    rect.y + rect.height > image.height
  ) {
    throw new Error(
      `crop ${JSON.stringify(rect)} does not fit ${image.width}x${image.height}`,
    );
  }
  const data = Buffer.alloc(rect.width * rect.height * 4);
  for (let y = 0; y < rect.height; y += 1) {
    const source = ((rect.y + y) * image.width + rect.x) * 4;
    image.data.copy(data, y * rect.width * 4, source, source + rect.width * 4);
  }
  return { width: rect.width, height: rect.height, data };
}

function thresholdAlpha(image: RgbaImage, threshold = 128): RgbaImage {
  const data = Buffer.from(image.data);
  for (let index = 3; index < data.length; index += 4) {
    data[index] = (data[index] ?? 0) >= threshold ? 255 : 0;
  }
  return { width: image.width, height: image.height, data };
}

function applyMasks(image: RgbaImage, masks: readonly MaskSpec[]): void {
  for (const mask of masks) {
    if (mask.kind === "fill-rect") {
      const [red, green, blue] = parseHexColor(mask.color);
      for (let y = Math.max(0, mask.y); y < Math.min(image.height, mask.y + mask.height); y += 1) {
        for (let x = Math.max(0, mask.x); x < Math.min(image.width, mask.x + mask.width); x += 1) {
          const index = (y * image.width + x) * 4;
          image.data[index] = red;
          image.data[index + 1] = green;
          image.data[index + 2] = blue;
          image.data[index + 3] = 255;
        }
      }
      continue;
    }
    if (mask.kind === "clear-rect") {
      for (let y = Math.max(0, mask.y); y < Math.min(image.height, mask.y + mask.height); y += 1) {
        for (let x = Math.max(0, mask.x); x < Math.min(image.width, mask.x + mask.width); x += 1) {
          image.data[(y * image.width + x) * 4 + 3] = 0;
        }
      }
      continue;
    }
    if (mask.kind === "clear-circle") {
      const radiusSquared = mask.radius * mask.radius;
      for (let y = 0; y < image.height; y += 1) {
        for (let x = 0; x < image.width; x += 1) {
          const dx = x - mask.x;
          const dy = y - mask.y;
          if (dx * dx + dy * dy <= radiusSquared) {
            image.data[(y * image.width + x) * 4 + 3] = 0;
          }
        }
      }
      continue;
    }
    // remove-pink: the ghosted wicker behind the towel is dusty pink. The
    // towel itself is sage/bone/vivid red, so this only removes the ghost.
    for (let index = 0; index < image.data.length; index += 4) {
      if (image.data[index + 3] === 0) continue;
      const red = image.data[index] ?? 0;
      const green = image.data[index + 1] ?? 0;
      const blue = image.data[index + 2] ?? 0;
      if (red > green + 25 && green > 110 && blue > 100) {
        image.data[index + 3] = 0;
      }
    }
  }
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.max(minimum, Math.min(maximum, value));
}

function composite(
  placed: RgbaImage,
  offsetX: number,
  offsetY: number,
  cell: Cell,
): RgbaImage {
  const data = Buffer.alloc(cell.width * cell.height * 4);
  for (let y = 0; y < placed.height; y += 1) {
    const targetY = offsetY + y;
    if (targetY < 0 || targetY >= cell.height) continue;
    for (let x = 0; x < placed.width; x += 1) {
      const targetX = offsetX + x;
      if (targetX < 0 || targetX >= cell.width) continue;
      const source = (y * placed.width + x) * 4;
      const target = (targetY * cell.width + targetX) * 4;
      placed.data.copy(data, target, source, source + 4);
    }
  }
  return { width: cell.width, height: cell.height, data };
}

interface FitReport {
  sourceBounds: { x: number; y: number; width: number; height: number };
  fit: { width: number; height: number; offsetX: number; offsetY: number };
  margins: { top: number; right: number; bottom: number; left: number };
}

function fitAsset(image: RgbaImage, spec: AssetSpec): { image: RgbaImage; report: FitReport } {
  const margin = spec.margin ?? 0;
  const availableWidth = spec.cell.width - margin * 2;
  const availableHeight = spec.cell.height - margin * 2;
  if (availableWidth <= 0 || availableHeight <= 0) {
    throw new Error(`${spec.id}: margin leaves no room`);
  }
  const bounds = alphaBounds(image);
  if (!bounds) throw new Error(`${spec.id}: no opaque pixels after masking`);
  const cropped = cropImage(image, bounds);

  const rawScale = Math.min(
    availableWidth / cropped.width,
    availableHeight / cropped.height,
    1,
  );
  const fitWidth = Math.max(1, Math.min(availableWidth, Math.round(cropped.width * rawScale)));
  const fitHeight = Math.max(1, Math.min(availableHeight, Math.round(cropped.height * rawScale)));
  const resized = thresholdAlpha(resizeBox(cropped, fitWidth, fitHeight));

  let offsetX: number;
  let offsetY: number;
  if (spec.anchor) {
    const scaleX = fitWidth / cropped.width;
    const scaleY = fitHeight / cropped.height;
    offsetX = Math.round(
      spec.anchor.cellX - (spec.anchor.sourceX - bounds.x) * scaleX,
    );
    offsetY = Math.round(
      spec.anchor.cellY - (spec.anchor.sourceY - bounds.y) * scaleY,
    );
    offsetX = clamp(offsetX, 0, spec.cell.width - fitWidth);
    offsetY = clamp(offsetY, 0, spec.cell.height - fitHeight);
  } else {
    const align = spec.align ?? "center";
    offsetX = Math.floor((spec.cell.width - fitWidth) / 2);
    offsetY =
      align === "bottom-center"
        ? spec.cell.height - margin - fitHeight
        : align === "top-center"
          ? margin
          : Math.floor((spec.cell.height - fitHeight) / 2);
  }

  const placed = composite(resized, offsetX, offsetY, spec.cell);
  const finalBounds = alphaBounds(placed);
  if (!finalBounds) throw new Error(`${spec.id}: fitted image is empty`);
  return {
    image: placed,
    report: {
      sourceBounds: bounds,
      fit: { width: fitWidth, height: fitHeight, offsetX, offsetY },
      margins: {
        top: finalBounds.y,
        right: spec.cell.width - (finalBounds.x + finalBounds.width),
        bottom: spec.cell.height - (finalBounds.y + finalBounds.height),
        left: finalBounds.x,
      },
    },
  };
}

function previewName(id: string, suffix: string): string {
  return join(PREVIEW_DIR, `${id.replace(/\./g, "-")}-${suffix}.png`);
}

function quantizedReport(
  image: RgbaImage,
  palette: PaletteDocument,
  spec: AssetSpec,
): {
  image: RgbaImage;
  bytes: Buffer;
  validation: ReturnType<typeof validatePaletteImage>;
} {
  const ramps = spec.ramps ?? ALL_RAMPS;
  const quantization = quantizeImage(image, palette, ramps);
  const validation = validatePaletteImage(quantization.image, palette, ramps);
  const bytes = encodePng(quantization.image);
  if (bytes.length > spec.maxBytes) {
    throw new Error(
      `${spec.id}: ${bytes.length} bytes exceeds the ${spec.maxBytes}-byte budget`,
    );
  }
  if (validation.alphaViolations > 0) {
    throw new Error(
      `${spec.id}: ${validation.alphaViolations} pixels have non-binary alpha`,
    );
  }
  if (validation.offPalettePixels > 0) {
    throw new Error(
      `${spec.id}: ${validation.offPalettePixels} pixels remain off-palette`,
    );
  }
  return { image: quantization.image, bytes, validation };
}

function processAsset(
  spec: AssetSpec,
  palette: PaletteDocument,
  options: CliOptions,
): void {
  const source = decodePng(spec.source);
  const cropped = spec.crop ? cropImage(source, spec.crop) : { ...source, data: Buffer.from(source.data) };
  applyMasks(cropped, spec.masks ?? []);
  const fitted = fitAsset(cropped, spec);
  const quantize = spec.quantize ?? true;
  const final = quantize
    ? quantizedReport(fitted.image, palette, spec)
    : { image: fitted.image, bytes: encodePng(fitted.image), validation: null };

  if (!options.noWrite) {
    mkdirSync(dirname(spec.output), { recursive: true });
    writeFileSync(spec.output, final.bytes);
  }

  for (const scale of spec.previewScales ?? [2, 4]) {
    const preview = scaleNearest(
      flattenRgba(final.image, parseHexColor("#101a20")),
      scale,
    );
    writePng(previewName(spec.id, `${scale}x`), preview);
  }

  const report = {
    schemaVersion: 1,
    id: spec.id,
    source: { path: spec.source, width: source.width, height: source.height },
    crop: spec.crop ?? null,
    masks: spec.masks ?? [],
    cell: spec.cell,
    margin: spec.margin ?? 0,
    align: spec.align ?? "center",
    anchor: spec.anchor ?? null,
    fit: fitted.report,
    quantized: quantize,
    ramps: quantize ? spec.ramps ?? ALL_RAMPS : [],
    palette: final.validation,
    bytes: final.bytes.length,
    maxBytes: spec.maxBytes,
    output: spec.output,
    note: spec.note ?? null,
  };
  mkdirSync(REPORT_DIR, { recursive: true });
  writeFileSync(
    join(REPORT_DIR, `${spec.id.replace(/\./g, "-")}.hub.json`),
    `${JSON.stringify(report, null, 2)}\n`,
  );

  console.log(
    `${spec.id}: ${source.width}x${source.height} -> ${spec.cell.width}x${spec.cell.height}, ` +
      `${final.bytes.length} bytes${options.noWrite ? " (not written)" : ""}`,
  );
}

function sha256(path: string): string {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

function processBackground(options: CliOptions): void {
  const working = "art-source/nanobanan/working/tmp/bathroom-wall-640.png";
  const preview = previewName("bg.bathroom.wall", "2x");
  mkdirSync(dirname(working), { recursive: true });
  mkdirSync(dirname(preview), { recursive: true });
  mkdirSync(dirname(BACKGROUND_OUTPUT), { recursive: true });

  const ffmpeg = spawnSync(
    "ffmpeg",
    [
      "-y",
      "-v",
      "error",
      "-i",
      BACKGROUND_SOURCE,
      "-vf",
      `crop=${2752 - BACKGROUND_CROP_X}:1536:${BACKGROUND_CROP_X}:0,` +
        `pad=2752:1536:0:0:color=${BACKGROUND_PAD},` +
        "scale=640:360:flags=lanczos",
      "-pix_fmt",
      "rgb24",
      working,
    ],
    { encoding: "utf8" },
  );
  if (ffmpeg.status !== 0) {
    throw new Error(ffmpeg.stderr.trim() || "ffmpeg background crop failed");
  }

  const webp = spawnSync(
    "cwebp",
    ["-quiet", "-lossless", "-q", "100", "-m", "6", working, "-o", BACKGROUND_OUTPUT],
    { encoding: "utf8" },
  );
  if (webp.status !== 0) {
    throw new Error(webp.stderr.trim() || "cwebp background export failed");
  }

  const source = decodePng(working);
  writePng(preview, scaleNearest(source, 2));
  const report = {
    schemaVersion: 1,
    id: "bg.bathroom.wall",
    source: {
      path: BACKGROUND_SOURCE,
      width: 2752,
      height: 1536,
      sha256: sha256(BACKGROUND_SOURCE),
    },
    crop: { x: BACKGROUND_CROP_X, y: 0, width: 2752 - BACKGROUND_CROP_X, height: 1536 },
    pad: { right: BACKGROUND_CROP_X, color: BACKGROUND_PAD },
    output: {
      path: BACKGROUND_OUTPUT,
      width: 640,
      height: 360,
      bytes: statSync(BACKGROUND_OUTPUT).size,
    },
    palette: null,
    exception:
      "Scene plate is not palette-quantised: the warm lamp, wall grime and grout survive better at 2x, matching the M3 sky exception.",
  };
  mkdirSync(REPORT_DIR, { recursive: true });
  writeFileSync(
    join(REPORT_DIR, "bg.bathroom.wall.hub.json"),
    `${JSON.stringify(report, null, 2)}\n`,
  );
  console.log(
    `bg.bathroom.wall: 2752x1536 -> 640x360, ${report.output.bytes} bytes` +
      `${options.noWrite ? " (not written)" : ""}`,
  );
}

function copyTinyAstronaut(options: CliOptions): void {
  const source = "public/packs/anatomy-reflex/shared/sprites/player-p1.png";
  const output = `${SPRITES}/tiny-astronaut.png`;
  const image = decodePng(source);
  if (image.width !== 14 || image.height !== 22) {
    throw new Error(`P1 sprite is ${image.width}x${image.height}, expected 14x22`);
  }
  if (!options.noWrite) {
    mkdirSync(dirname(output), { recursive: true });
    copyFileSync(source, output);
  }
  const report = {
    schemaVersion: 1,
    id: "sprite.player.p1",
    source,
    output,
    width: image.width,
    height: image.height,
    note: "Reused P1 tiny astronaut; hub.player.tinyScale is 1.",
  };
  mkdirSync(REPORT_DIR, { recursive: true });
  writeFileSync(
    join(REPORT_DIR, "sprite.player.p1.hub.json"),
    `${JSON.stringify(report, null, 2)}\n`,
  );
  console.log(`sprite.player.p1: copied 14x22 tiny astronaut`);
}

function main(): void {
  const options = parseArgs(process.argv.slice(2));
  const palette = parsePaletteDocument(
    JSON.parse(readFileSync(PALETTE_PATH, "utf8")),
  );

  if (!options.asset || options.asset === "bg.bathroom.wall") {
    processBackground(options);
  }
  if (!options.asset) {
    copyTinyAstronaut(options);
  }
  const selected = options.asset
    ? ASSETS.filter((asset) => asset.id === options.asset)
    : ASSETS;
  if (options.asset && selected.length === 0 && options.asset !== "bg.bathroom.wall") {
    throw new Error(`Unknown asset ${options.asset}`);
  }
  for (const spec of selected) {
    processAsset(spec, palette, options);
  }
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  console.error(`\n${usage()}`);
  process.exitCode = 1;
}
