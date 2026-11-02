#!/usr/bin/env tsx
/**
 * Fit a keyed concept plate into the fixed entity cell.
 *
 * Usage:
 *   npm run art:fit -- --config art-source/nanobanan/fit.config.json [options]
 *   npm run art:fit -- --in <keyed.png> --out <png> --palette <json>
 *
 * Options:
 *   --config <path>          JSON config with per-asset values
 *   --asset <id>             only run one configured asset (repeatable)
 *   --no-write               write previews/reports but not the output PNG
 *   --cell <WxH>             override the config cell
 *   --margin <px>            override the config margin
 *   --alpha-threshold <0..255>
 *   --max-bytes <bytes>
 *   --palette <path>
 *   --preview-dir <dir>
 *   --report-dir <dir>
 *
 * The canonical pipeline is `npm run art:key` (JPEG -> keyed PNG) followed by
 * `npm run art:fit`. The fit step expects an alpha PNG so keying stays in one
 * tool.
 */

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, dirname, join, relative, resolve } from "node:path";
import { PNG } from "pngjs";
import {
  flattenRgba,
  parseHexColor,
  scaleNearest,
  type RgbaImage,
} from "./art/ludo-sheet";
import {
  fitEntitySprite,
  parseCellSize,
  type CellSize,
} from "./art/entity-fit";
import {
  parsePaletteDocument,
  type PaletteDocument,
} from "./art/palette";
import { ENTITY_INTERACTION_TINT } from "../src/world/entity-style";

type AssetStatus =
  | "poc-integrated"
  | "placeholder"
  | "alternate"
  | "reserve"
  | "fit-preview"
  | "hand-cleaned";

type Treatment =
  | "hero-npc"
  | "hero-interactable"
  | "hero-prop"
  | "ui-1x"
  | "world-2x"
  | "legacy";

interface PreviewConfig {
  scales?: number[];
  background?: string;
}

interface FitClassConfig {
  cell: CellSize;
  display?: CellSize;
  margin?: number;
  minReadablePx?: number;
  minOpaquePixels?: number;
  maxPaletteDistance?: number;
  maxDownscale?: number;
  treatment?: Treatment;
}

interface FitAssetConfig {
  id: string;
  status: AssetStatus;
  source: string;
  output: string;
  runtime: boolean;
  class?: string;
  cell?: CellSize;
  display?: CellSize;
  margin?: number;
  minReadablePx?: number;
  minOpaquePixels?: number;
  maxPaletteDistance?: number;
  maxDownscale?: number;
  treatment?: Treatment;
  missingReason?: string;
  notes?: string;
  ramps: string[];
}

interface FitConfig {
  schemaVersion: number;
  palette: string;
  cell?: CellSize;
  classes?: Record<string, FitClassConfig>;
  margin: number;
  alphaThreshold: number;
  maxBytes: number;
  minReadablePx: number;
  minOpaquePixels: number;
  maxPaletteDistance: number;
  maxDownscale: number;
  preview?: PreviewConfig;
  reportDir: string;
  previewDir: string;
  assets: FitAssetConfig[];
}

interface CliOptions {
  config?: string;
  input?: string;
  output?: string;
  palette?: string;
  cell?: CellSize;
  margin?: number;
  alphaThreshold?: number;
  maxBytes?: number;
  previewDir?: string;
  reportDir?: string;
  assets: string[];
  noWrite: boolean;
}

const DEFAULT_PREVIEW_SCALES = [2, 8];
const DEFAULT_PREVIEW_BACKGROUND = "#101a20";
const DEFAULT_MIN_READABLE_PX = 8;
const DEFAULT_MAX_PALETTE_DISTANCE = 64;

function usage(): string {
  return [
    "Usage: npm run art:fit -- --config <fit.config.json> [options]",
    "       npm run art:fit -- --in <keyed.png> --out <png> --palette <palette.json>",
    "",
    "Options:",
    "  --config <path>          JSON config with per-asset values",
    "  --asset <id>             only run one configured asset (repeatable)",
    "  --no-write               write previews/reports but not the output PNG",
    "  --cell <WxH>             override the config cell",
    "  --margin <px>            override the config margin",
    "  --alpha-threshold <0..255>",
    "  --max-bytes <bytes>",
    "  --palette <path>",
    "  --preview-dir <dir>",
    "  --report-dir <dir>",
  ].join("\n");
}

function readOption(args: string[], name: string): string | undefined {
  const index = args.indexOf(name);
  if (index === -1) return undefined;
  const value = args[index + 1];
  if (value === undefined || value.startsWith("--")) {
    throw new Error(`${name} requires a value`);
  }
  return value;
}

function readOptionValues(args: string[], name: string): string[] {
  const values: string[] = [];
  for (let index = 0; index < args.length; index += 1) {
    if (args[index] !== name) continue;
    const value = args[index + 1];
    if (value === undefined || value.startsWith("--")) {
      throw new Error(`${name} requires a value`);
    }
    values.push(value);
  }
  return values;
}

function positiveInteger(value: string | number, label: string): number {
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isInteger(parsed) || parsed < 1) {
    throw new Error(`${label} must be a positive integer`);
  }
  return parsed;
}

function parseCellValue(value: unknown, label: string): CellSize {
  if (typeof value === "string") {
    return parseCellSize(value);
  }
  if (Array.isArray(value)) {
    if (value.length !== 2) {
      throw new Error(`${label} must be [width, height]`);
    }
    return {
      width: positiveInteger(value[0] as number, `${label}.width`),
      height: positiveInteger(value[1] as number, `${label}.height`),
    };
  }
  if (typeof value === "object" && value !== null) {
    const record = value as Record<string, unknown>;
    return {
      width: positiveInteger(record.width as number, `${label}.width`),
      height: positiveInteger(record.height as number, `${label}.height`),
    };
  }
  throw new Error(`${label} must be [width, height] or a size object`);
}

function integerInRange(
  value: string | number,
  label: string,
  minimum: number,
  maximum: number,
): number {
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isInteger(parsed) || parsed < minimum || parsed > maximum) {
    throw new Error(`${label} must be an integer within ${minimum}..${maximum}`);
  }
  return parsed;
}

function parseArgs(args: string[]): CliOptions {
  const cellValue = readOption(args, "--cell");
  const marginValue = readOption(args, "--margin");
  const thresholdValue = readOption(args, "--alpha-threshold");
  const maxBytesValue = readOption(args, "--max-bytes");

  return {
    ...(readOption(args, "--config")
      ? { config: resolve(readOption(args, "--config") as string) }
      : {}),
    ...(readOption(args, "--in")
      ? { input: resolve(readOption(args, "--in") as string) }
      : {}),
    ...(readOption(args, "--out")
      ? { output: resolve(readOption(args, "--out") as string) }
      : {}),
    ...(readOption(args, "--palette")
      ? { palette: resolve(readOption(args, "--palette") as string) }
      : {}),
    ...(cellValue ? { cell: parseCellSize(cellValue) } : {}),
    ...(marginValue !== undefined
      ? { margin: positiveInteger(marginValue, "--margin") }
      : {}),
    ...(thresholdValue !== undefined
      ? {
          alphaThreshold: integerInRange(
            thresholdValue,
            "--alpha-threshold",
            0,
            255,
          ),
        }
      : {}),
    ...(maxBytesValue !== undefined
      ? { maxBytes: positiveInteger(maxBytesValue, "--max-bytes") }
      : {}),
    ...(readOption(args, "--preview-dir")
      ? { previewDir: resolve(readOption(args, "--preview-dir") as string) }
      : {}),
    ...(readOption(args, "--report-dir")
      ? { reportDir: resolve(readOption(args, "--report-dir") as string) }
      : {}),
    assets: readOptionValues(args, "--asset"),
    noWrite: args.includes("--no-write"),
  };
}

const ASSET_STATUSES: readonly AssetStatus[] = [
  "poc-integrated",
  "placeholder",
  "alternate",
  "reserve",
  "fit-preview",
  "hand-cleaned",
];

const TREATMENTS: readonly Treatment[] = [
  "hero-npc",
  "hero-interactable",
  "hero-prop",
  "ui-1x",
  "world-2x",
  "legacy",
];

function optionalPositiveInteger(
  value: unknown,
  label: string,
): number | undefined {
  if (value === undefined) return undefined;
  return positiveInteger(value as number, label);
}

function parseTreatment(
  value: unknown,
  label: string,
): Treatment | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== "string" || !TREATMENTS.includes(value as Treatment)) {
    throw new Error(`${label} must be one of ${TREATMENTS.join(", ")}`);
  }
  return value as Treatment;
}

function parseConfig(value: unknown): FitConfig {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error("fit config must be an object");
  }
  const record = value as Record<string, unknown>;
  const schemaVersion = record.schemaVersion;
  if (schemaVersion !== 1 && schemaVersion !== 2) {
    throw new Error("fit config schemaVersion must be 1 or 2");
  }
  if (typeof record.palette !== "string" || record.palette.trim() === "") {
    throw new Error("fit config palette must be a path");
  }

  const legacyCell =
    record.cell !== undefined
      ? parseCellValue(record.cell, "config.cell")
      : undefined;
  if (schemaVersion === 1 && !legacyCell) {
    throw new Error("fit config schemaVersion 1 requires a cell");
  }

  const classes: Record<string, FitClassConfig> = {};
  if (record.classes !== undefined) {
    if (
      typeof record.classes !== "object" ||
      record.classes === null ||
      Array.isArray(record.classes)
    ) {
      throw new Error("fit config classes must be an object");
    }
    for (const [name, rawClass] of Object.entries(
      record.classes as Record<string, unknown>,
    )) {
      if (typeof rawClass !== "object" || rawClass === null || Array.isArray(rawClass)) {
        throw new Error(`fit config classes.${name} must be an object`);
      }
      const entry = rawClass as Record<string, unknown>;
      if (entry.cell === undefined) {
        throw new Error(`fit config classes.${name}.cell is required`);
      }
      const cell = parseCellValue(entry.cell, `config.classes.${name}.cell`);
      classes[name] = {
        cell,
        ...(entry.display !== undefined
          ? {
              display: parseCellValue(
                entry.display,
                `config.classes.${name}.display`,
              ),
            }
          : {}),
        ...(entry.margin !== undefined
          ? {
              margin: positiveInteger(
                entry.margin as number,
                `config.classes.${name}.margin`,
              ),
            }
          : {}),
        ...(entry.minReadablePx !== undefined
          ? {
              minReadablePx: positiveInteger(
                entry.minReadablePx as number,
                `config.classes.${name}.minReadablePx`,
              ),
            }
          : {}),
        ...(entry.minOpaquePixels !== undefined
          ? {
              minOpaquePixels: positiveInteger(
                entry.minOpaquePixels as number,
                `config.classes.${name}.minOpaquePixels`,
              ),
            }
          : {}),
        ...(entry.maxPaletteDistance !== undefined
          ? {
              maxPaletteDistance: positiveInteger(
                entry.maxPaletteDistance as number,
                `config.classes.${name}.maxPaletteDistance`,
              ),
            }
          : {}),
        ...(entry.maxDownscale !== undefined
          ? {
              maxDownscale: positiveInteger(
                entry.maxDownscale as number,
                `config.classes.${name}.maxDownscale`,
              ),
            }
          : {}),
        ...(parseTreatment(
          entry.treatment,
          `config.classes.${name}.treatment`,
        )
          ? {
              treatment: parseTreatment(
                entry.treatment,
                `config.classes.${name}.treatment`,
              ),
            }
          : {}),
      };
    }
  }

  if (schemaVersion === 2 && Object.keys(classes).length === 0) {
    throw new Error("fit config schemaVersion 2 requires a non-empty classes object");
  }

  const preview =
    typeof record.preview === "object" && record.preview !== null
      ? (record.preview as PreviewConfig)
      : {};
  if (preview.scales !== undefined) {
    if (!Array.isArray(preview.scales) || preview.scales.length === 0) {
      throw new Error("fit config preview.scales must be a non-empty array");
    }
    for (const scale of preview.scales) {
      positiveInteger(scale, "config.preview.scales[]");
    }
  }

  if (!Array.isArray(record.assets) || record.assets.length === 0) {
    throw new Error("fit config assets must be a non-empty array");
  }
  const assets = record.assets.map((raw, index): FitAssetConfig => {
    if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
      throw new Error(`fit config assets[${index}] must be an object`);
    }
    const asset = raw as Record<string, unknown>;
    const status = asset.status;
    if (!ASSET_STATUSES.includes(status as AssetStatus)) {
      throw new Error(
        `fit config assets[${index}].status is not a supported status`,
      );
    }
    if (typeof asset.id !== "string" || asset.id.trim() === "") {
      throw new Error(`fit config assets[${index}].id must be a string`);
    }
    if (typeof asset.source !== "string" || asset.source.trim() === "") {
      throw new Error(`fit config assets[${index}].source must be a path`);
    }
    if (typeof asset.output !== "string" || asset.output.trim() === "") {
      throw new Error(`fit config assets[${index}].output must be a path`);
    }
    if (typeof asset.runtime !== "boolean") {
      throw new Error(`fit config assets[${index}].runtime must be a boolean`);
    }
    if (!Array.isArray(asset.ramps) || asset.ramps.length === 0) {
      throw new Error(`fit config assets[${index}].ramps must be non-empty`);
    }
    const ramps = asset.ramps.map((ramp, rampIndex) => {
      if (typeof ramp !== "string" || ramp.trim() === "") {
        throw new Error(
          `fit config assets[${index}].ramps[${rampIndex}] must be a string`,
        );
      }
      return ramp;
    });
    if (asset.runtime && status === "placeholder") {
      throw new Error(
        `fit config assets[${index}] is a placeholder but runtime=true`,
      );
    }
    if (asset.class !== undefined && typeof asset.class !== "string") {
      throw new Error(`fit config assets[${index}].class must be a string`);
    }
    if (schemaVersion === 2 && typeof asset.class !== "string") {
      throw new Error(
        `fit config assets[${index}].class is required in schema 2`,
      );
    }
    if (typeof asset.class === "string" && !classes[asset.class]) {
      throw new Error(
        `fit config assets[${index}].class "${asset.class}" is not declared`,
      );
    }
    return {
      id: asset.id,
      status: status as AssetStatus,
      source: asset.source,
      output: asset.output,
      runtime: asset.runtime,
      ...(typeof asset.class === "string" ? { class: asset.class } : {}),
      ...(asset.cell !== undefined
        ? {
            cell: parseCellValue(
              asset.cell,
              `config.assets[${index}].cell`,
            ),
          }
        : {}),
      ...(asset.display !== undefined
        ? {
            display: parseCellValue(
              asset.display,
              `config.assets[${index}].display`,
            ),
          }
        : {}),
      ...(optionalPositiveInteger(
        asset.margin,
        `config.assets[${index}].margin`,
      ) !== undefined
        ? {
            margin: optionalPositiveInteger(
              asset.margin,
              `config.assets[${index}].margin`,
            ) as number,
          }
        : {}),
      ...(optionalPositiveInteger(
        asset.minReadablePx,
        `config.assets[${index}].minReadablePx`,
      ) !== undefined
        ? {
            minReadablePx: optionalPositiveInteger(
              asset.minReadablePx,
              `config.assets[${index}].minReadablePx`,
            ) as number,
          }
        : {}),
      ...(optionalPositiveInteger(
        asset.minOpaquePixels,
        `config.assets[${index}].minOpaquePixels`,
      ) !== undefined
        ? {
            minOpaquePixels: optionalPositiveInteger(
              asset.minOpaquePixels,
              `config.assets[${index}].minOpaquePixels`,
            ) as number,
          }
        : {}),
      ...(optionalPositiveInteger(
        asset.maxPaletteDistance,
        `config.assets[${index}].maxPaletteDistance`,
      ) !== undefined
        ? {
            maxPaletteDistance: optionalPositiveInteger(
              asset.maxPaletteDistance,
              `config.assets[${index}].maxPaletteDistance`,
            ) as number,
          }
        : {}),
      ...(optionalPositiveInteger(
        asset.maxDownscale,
        `config.assets[${index}].maxDownscale`,
      ) !== undefined
        ? {
            maxDownscale: optionalPositiveInteger(
              asset.maxDownscale,
              `config.assets[${index}].maxDownscale`,
            ) as number,
          }
        : {}),
      ...(parseTreatment(
        asset.treatment,
        `config.assets[${index}].treatment`,
      )
        ? {
            treatment: parseTreatment(
              asset.treatment,
              `config.assets[${index}].treatment`,
            ),
          }
        : {}),
      ...(typeof asset.missingReason === "string"
        ? { missingReason: asset.missingReason }
        : {}),
      ...(typeof asset.notes === "string" ? { notes: asset.notes } : {}),
      ramps,
    };
  });

  return {
    schemaVersion,
    palette: record.palette,
    ...(legacyCell ? { cell: legacyCell } : {}),
    ...(Object.keys(classes).length > 0 ? { classes } : {}),
    margin: record.margin !== undefined
      ? positiveInteger(record.margin as number, "config.margin")
      : 1,
    alphaThreshold: integerInRange(
      (record.alphaThreshold as number) ?? 128,
      "config.alphaThreshold",
      0,
      255,
    ),
    maxBytes: positiveInteger(
      (record.maxBytes as number) ?? 16384,
      "config.maxBytes",
    ),
    minReadablePx: positiveInteger(
      (record.minReadablePx as number) ?? 8,
      "config.minReadablePx",
    ),
    minOpaquePixels: positiveInteger(
      (record.minOpaquePixels as number) ?? 100,
      "config.minOpaquePixels",
    ),
    maxPaletteDistance: positiveInteger(
      (record.maxPaletteDistance as number) ?? 64,
      "config.maxPaletteDistance",
    ),
    maxDownscale: positiveInteger(
      (record.maxDownscale as number) ?? 16,
      "config.maxDownscale",
    ),
    preview,
    reportDir:
      typeof record.reportDir === "string" && record.reportDir.trim() !== ""
        ? record.reportDir
        : "art-source/nanobanan/reports",
    previewDir:
      typeof record.previewDir === "string" && record.previewDir.trim() !== ""
        ? record.previewDir
        : "art-source/previews/nanobanan/entities",
    assets,
  };
}

function decodePng(path: string): RgbaImage {
  let png: PNG;
  try {
    png = PNG.sync.read(readFileSync(path));
  } catch (error) {
    throw new Error(
      `Could not read ${path} as a PNG. Run npm run art:key first for JPEG sources. ` +
        `(${error instanceof Error ? error.message : String(error)})`,
    );
  }
  return {
    width: png.width,
    height: png.height,
    data: Buffer.from(png.data),
  };
}

function encodePng(image: RgbaImage): Buffer {
  const png = new PNG({ width: image.width, height: image.height });
  image.data.copy(png.data);
  return PNG.sync.write(png);
}

function writePng(path: string, buffer: Buffer): void {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, buffer);
}

function edgeContact(image: RgbaImage): {
  top: number;
  bottom: number;
  left: number;
  right: number;
} {
  let top = 0;
  let bottom = 0;
  let left = 0;
  let right = 0;
  for (let y = 0; y < image.height; y += 1) {
    for (let x = 0; x < image.width; x += 1) {
      if ((image.data[(y * image.width + x) * 4 + 3] ?? 0) === 0) continue;
      if (y === 0) top += 1;
      if (y === image.height - 1) bottom += 1;
      if (x === 0) left += 1;
      if (x === image.width - 1) right += 1;
    }
  }
  return { top, bottom, left, right };
}

function applyTint(image: RgbaImage, tint: number): RgbaImage {
  const red = (tint >> 16) & 0xff;
  const green = (tint >> 8) & 0xff;
  const blue = tint & 0xff;
  const data = Buffer.from(image.data);
  for (let index = 0; index < data.length; index += 4) {
    if ((data[index + 3] ?? 0) === 0) continue;
    data[index] = Math.round(((data[index] ?? 0) * red) / 255);
    data[index + 1] = Math.round(((data[index + 1] ?? 0) * green) / 255);
    data[index + 2] = Math.round(((data[index + 2] ?? 0) * blue) / 255);
  }
  return { width: image.width, height: image.height, data };
}

function previewStem(asset: FitAssetConfig, previewDir: string): string {
  return join(previewDir, basename(asset.output, ".png"));
}

function displayPath(path: string): string {
  const rel = relative(process.cwd(), path);
  return rel === "" || rel.startsWith("..") ? path : rel;
}

function runAsset(
  asset: FitAssetConfig,
  config: FitConfig,
  palette: PaletteDocument,
  options: CliOptions,
): void {
  const sourcePath = resolve(asset.source);
  const outputPath = resolve(asset.output);
  const image = decodePng(sourcePath);
  const classConfig = asset.class ? config.classes?.[asset.class] : undefined;
  const cell =
    options.cell ??
    asset.cell ??
    classConfig?.cell ??
    config.cell ?? { width: 18, height: 18 };
  const display =
    asset.display ??
    classConfig?.display ??
    cell;
  const margin =
    options.margin ??
    asset.margin ??
    classConfig?.margin ??
    config.margin;
  const alphaThreshold = options.alphaThreshold ?? config.alphaThreshold;
  const maxBytes = options.maxBytes ?? config.maxBytes;
  const minReadablePx =
    asset.minReadablePx ??
    classConfig?.minReadablePx ??
    config.minReadablePx;
  const minOpaquePixels =
    asset.minOpaquePixels ??
    classConfig?.minOpaquePixels ??
    config.minOpaquePixels;
  const maxPaletteDistance =
    asset.maxPaletteDistance ??
    classConfig?.maxPaletteDistance ??
    config.maxPaletteDistance;
  const maxDownscale =
    asset.maxDownscale ??
    classConfig?.maxDownscale ??
    config.maxDownscale;
  const treatment =
    asset.treatment ?? classConfig?.treatment ?? "legacy";
  const previewDir = options.previewDir ?? resolve(config.previewDir);
  const reportDir = options.reportDir ?? resolve(config.reportDir);
  const scales = config.preview?.scales ?? DEFAULT_PREVIEW_SCALES;
  const background = parseHexColor(
    config.preview?.background ?? DEFAULT_PREVIEW_BACKGROUND,
  );
  const missingRamps = asset.ramps.filter((ramp) => !palette.ramps[ramp]);
  if (missingRamps.length > 0) {
    throw new Error(
      `${asset.id} references unknown ramps: ${missingRamps.join(", ")}`,
    );
  }

  const result = fitEntitySprite(image, {
    cell,
    margin,
    alphaThreshold,
    palette,
    ramps: asset.ramps,
  });
  const output = encodePng(result.image);
  if (output.length > maxBytes) {
    throw new Error(
      `${asset.id} is ${output.length} bytes, over the ${maxBytes}-byte budget`,
    );
  }

  const written = !options.noWrite;
  if (written) {
    writePng(outputPath, output);
  }

  const stem = previewStem(asset, previewDir);
  const previews: Record<string, string> = {};
  for (const scale of scales) {
    const path = `${stem}-${scale}x.png`;
    writePng(
      path,
      encodePng(scaleNearest(flattenRgba(result.image, background), scale)),
    );
    previews[`scale${scale}x`] = displayPath(path);
  }
  const tintPreview = `${stem}-tint-2x.png`;
  writePng(
    tintPreview,
    encodePng(
      scaleNearest(
        flattenRgba(applyTint(result.image, ENTITY_INTERACTION_TINT), background),
        2,
      ),
    ),
  );
  previews.tint2x = displayPath(tintPreview);

  const contact = edgeContact(image);
  const warnings: string[] = [];
  if (
    contact.top > 0 ||
    contact.bottom > 0 ||
    contact.left > 0 ||
    contact.right > 0
  ) {
    warnings.push(
      `source content touches the image border (t ${contact.top}, b ${contact.bottom}, l ${contact.left}, r ${contact.right}); the concept plate may be clipped`,
    );
  }
  const minFit = Math.min(result.placed.fitWidth, result.placed.fitHeight);
  if (minFit < minReadablePx) {
    warnings.push(
      `fitted content is ${result.placed.fitWidth}x${result.placed.fitHeight}; minimum dimension ${minFit}px is below the ${minReadablePx}px readability policy`,
    );
  }
  if (result.paletteValidation.opaquePixels < minOpaquePixels) {
    warnings.push(
      `fitted content has ${result.paletteValidation.opaquePixels} opaque pixels; below the ${minOpaquePixels}px minimum`,
    );
  }
  const sourceScale = Math.max(
    result.placed.sourceBounds.width / result.placed.fitWidth,
    result.placed.sourceBounds.height / result.placed.fitHeight,
  );
  if (sourceScale > maxDownscale) {
    warnings.push(
      `source-to-fit scale ${sourceScale.toFixed(1)}:1 exceeds the ${maxDownscale}:1 treatment limit`,
    );
  }
  if (!result.rampHistogram.joint) {
    warnings.push(
      "no joint-ramp pixels survived; the cyan scan rim may be missing",
    );
  }
  if (result.quantization.maxDistance > maxPaletteDistance) {
    warnings.push(
      `max palette quantisation distance ${result.quantization.maxDistance.toFixed(1)} exceeds ${maxPaletteDistance}`,
    );
  }

  const report = {
    schemaVersion: 1,
    id: asset.id,
    class: asset.class ?? null,
    status: asset.status,
    treatment,
    display,
    ...(asset.missingReason ? { missingReason: asset.missingReason } : {}),
    ...(asset.notes ? { notes: asset.notes } : {}),
    config: options.config ? basename(options.config) : null,
    source: {
      path: asset.source,
      width: image.width,
      height: image.height,
      edgeContact: contact,
    },
    output: {
      path: asset.output,
      runtime: asset.runtime,
      written,
      width: result.image.width,
      height: result.image.height,
      bytes: output.length,
    },
    cell,
    margin,
    alphaThreshold,
    gates: {
      minReadablePx,
      minOpaquePixels,
      maxPaletteDistance,
      maxDownscale,
    },
    sourceScale: Number(sourceScale.toFixed(3)),
    ramps: asset.ramps,
    trim: result.placed.sourceBounds,
    fit: {
      width: result.placed.fitWidth,
      height: result.placed.fitHeight,
      offsetX: result.placed.offsetX,
      offsetY: result.placed.offsetY,
      scale: Number(result.placed.scale.toFixed(6)),
      upscaled: result.placed.upscaled,
    },
    finalBounds: result.finalBounds,
    margins: result.margins,
    quantization: {
      changedPixels: result.quantization.changedPixels,
      maxDistance: Number(result.quantization.maxDistance.toFixed(3)),
      offPalettePixels: result.quantization.offPalettePixels,
      alphaViolations: result.quantization.alphaViolations,
    },
    paletteValidation: result.paletteValidation,
    rampHistogram: result.rampHistogram,
    warnings,
    previews,
  };

  const reportPath = join(reportDir, `${basename(asset.output, ".png")}.fit.json`);
  mkdirSync(dirname(reportPath), { recursive: true });
  writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);

  console.log(
    [
      `${asset.id} — ${asset.status}${asset.runtime ? " (runtime)" : " (review only)"}`,
      `  source ${image.width}x${image.height} -> fit ${result.placed.fitWidth}x${result.placed.fitHeight} @ ${result.placed.offsetX},${result.placed.offsetY}`,
      `  output ${result.image.width}x${result.image.height}, ${output.length} bytes${written ? "" : " (not written)"}`,
      `  palette off ${result.paletteValidation.offPalettePixels}, alpha ${result.paletteValidation.alphaViolations}, ramps ${JSON.stringify(result.rampHistogram)}`,
      `  report ${reportPath}`,
      ...warnings.map((warning) => `  warning: ${warning}`),
    ].join("\n"),
  );
}

function configAssets(config: FitConfig, options: CliOptions): FitAssetConfig[] {
  if (options.assets.length === 0) return config.assets;
  const selected = new Set(options.assets);
  const assets = config.assets.filter((asset) => selected.has(asset.id));
  const missing = [...selected].filter(
    (id) => !config.assets.some((asset) => asset.id === id),
  );
  if (missing.length > 0) {
    throw new Error(`Unknown configured assets: ${missing.join(", ")}`);
  }
  return assets;
}

function main(): void {
  const options = parseArgs(process.argv.slice(2));

  if (options.config) {
    const config = parseConfig(
      JSON.parse(readFileSync(options.config, "utf8")),
    );
    const palettePath = options.palette ?? resolve(config.palette);
    const palette = parsePaletteDocument(
      JSON.parse(readFileSync(palettePath, "utf8")),
    );
    if (
      config.schemaVersion === 1 &&
      config.cell &&
      (palette.cell.width !== (options.cell ?? config.cell).width ||
        palette.cell.height !== (options.cell ?? config.cell).height)
    ) {
      console.warn(
        `Palette cell ${palette.cell.width}x${palette.cell.height} does not match ` +
          `fit cell ${(options.cell ?? config.cell).width}x${(options.cell ?? config.cell).height}; ` +
          `the fit cell wins (ADR-0075)`,
      );
    }
    const assets = configAssets(config, options);
    for (const asset of assets) {
      runAsset(asset, config, palette, options);
    }
    return;
  }

  if (!options.input || !options.output || !options.palette) {
    throw new Error(
      "Single-asset mode requires --in, --out and --palette; use --config for the batch",
    );
  }
  const palette = parsePaletteDocument(
    JSON.parse(readFileSync(options.palette, "utf8")),
  );
  const cell = options.cell ?? { width: 18, height: 18 };
  const asset: FitAssetConfig = {
    id: basename(options.output, ".png"),
    status: "poc-integrated",
    source: options.input,
    output: options.output,
    runtime: true,
    ramps: Object.keys(palette.ramps),
  };
  const config: FitConfig = {
    schemaVersion: 1,
    palette: options.palette,
    cell,
    margin: options.margin ?? 1,
    alphaThreshold: options.alphaThreshold ?? 128,
    maxBytes: options.maxBytes ?? 16384,
    minReadablePx: DEFAULT_MIN_READABLE_PX,
    minOpaquePixels: 100,
    maxPaletteDistance: DEFAULT_MAX_PALETTE_DISTANCE,
    maxDownscale: 16,
    preview: {
      scales: DEFAULT_PREVIEW_SCALES,
      background: DEFAULT_PREVIEW_BACKGROUND,
    },
    reportDir: options.reportDir ?? "art-source/nanobanan/reports",
    previewDir: options.previewDir ?? "art-source/previews/nanobanan/entities",
    assets: [asset],
  };
  runAsset(asset, config, palette, options);
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  console.error(`\n${usage()}`);
  process.exitCode = 1;
}
