#!/usr/bin/env tsx
/**
 * Remaster a Ludo faux-pixel frame into a clean, semantic 14×22 source cell.
 *
 * Usage:
 *   npm run art:remaster -- \
 *     --sheet <sheet.png> --atlas <sheet.json> \
 *     --profile <remaster.json> --palette <palette.json> \
 *     --out <master.png> [--frame 0] \
 *     [--preview <p1-preview.png>] [--class-preview <classes.png>] \
 *     [--scale 8] [--background "#101a20"] [--report <report.json>]
 *
 * The original Ludo export is never modified. The output is a 14×22 RGB(A)
 * master on the approved palette; run art:variant to derive P2.
 */

import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, dirname, extname, resolve } from "node:path";
import { PNG } from "pngjs";
import {
  cropRgba,
  flattenRgba,
  parseHexColor,
  parseLudoSheet,
  scaleNearest,
  type RgbaImage,
} from "./art/ludo-sheet";
import {
  parsePaletteDocument,
  type PaletteDocument,
} from "./art/palette";
import {
  classPreviewColor,
  parseRemasterProfile,
  remasterImage,
  type RemasterProfile,
  type RemasterResult,
} from "./art/remaster";

interface Options {
  sheet: string;
  atlas: string;
  profile: string;
  palette: string;
  out: string;
  frame?: number;
  preview?: string;
  classPreview?: string;
  scale: number;
  background: ReturnType<typeof parseHexColor>;
  report?: string;
}

function usage(): string {
  return [
    "Usage: npm run art:remaster -- --sheet <png> --profile <json>",
    "  --palette <json> --out <png> [options]",
    "",
    "Options:",
    "  --atlas <path>          Ludo JSON (defaults to the sheet basename .json)",
    "  --frame <n>             frame index in the sorted Ludo frame list",
    "  --preview <path>        nearest-neighbour master preview",
    "  --class-preview <path>  false-colour semantic class preview",
    "  --scale <n>             preview scale (default 8)",
    '  --background <hex>      preview background (default #101a20)',
    "  --report <path>         write a JSON validation report",
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

function positiveInteger(value: string, label: string): number {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 0) {
    throw new Error(`${label} must be a non-negative integer`);
  }
  return parsed;
}

function parseArgs(args: string[]): Options {
  const sheet = readOption(args, "--sheet");
  const profile = readOption(args, "--profile");
  const palette = readOption(args, "--palette");
  const out = readOption(args, "--out");
  if (!sheet) throw new Error("--sheet is required");
  if (!profile) throw new Error("--profile is required");
  if (!palette) throw new Error("--palette is required");
  if (!out) throw new Error("--out is required");

  const atlas =
    readOption(args, "--atlas") ??
    resolve(
      dirname(sheet),
      `${basename(sheet, extname(sheet))}.json`,
    );

  const frameValue = readOption(args, "--frame");
  const scaleValue = readOption(args, "--scale");
  const scale =
    scaleValue === undefined ? 8 : positiveInteger(scaleValue, "--scale");
  if (scale < 1) throw new Error("--scale must be at least 1");

  return {
    sheet: resolve(sheet),
    atlas: resolve(atlas),
    profile: resolve(profile),
    palette: resolve(palette),
    out: resolve(out),
    ...(frameValue !== undefined
      ? { frame: positiveInteger(frameValue, "--frame") }
      : {}),
    ...(readOption(args, "--preview")
      ? { preview: resolve(readOption(args, "--preview") as string) }
      : {}),
    ...(readOption(args, "--class-preview")
      ? { classPreview: resolve(readOption(args, "--class-preview") as string) }
      : {}),
    scale,
    background: parseHexColor(
      readOption(args, "--background") ?? "#101a20",
    ),
    ...(readOption(args, "--report")
      ? { report: resolve(readOption(args, "--report") as string) }
      : {}),
  };
}

function decodePng(path: string): RgbaImage {
  const png = PNG.sync.read(readFileSync(path));
  return {
    width: png.width,
    height: png.height,
    data: Buffer.from(png.data),
  };
}

function encodePng(path: string, image: RgbaImage): void {
  mkdirSync(dirname(path), { recursive: true });
  const png = new PNG({ width: image.width, height: image.height });
  image.data.copy(png.data);
  writeFileSync(path, PNG.sync.write(png));
}

function classPreview(
  result: RemasterResult,
  width: number,
  height: number,
  background: readonly [number, number, number],
): RgbaImage {
  const data = Buffer.alloc(width * height * 4);
  for (let index = 0; index < width * height; index += 1) {
    const classIndex = result.classMap[index] ?? 255;
    const color =
      classIndex === 255
        ? background
        : classPreviewColor(result.classNames[classIndex] ?? "");
    const output = index * 4;
    data[output] = color[0];
    data[output + 1] = color[1];
    data[output + 2] = color[2];
    data[output + 3] = 255;
  }
  return { width, height, data };
}

function hashInputs(parts: Buffer[]): string {
  const hash = createHash("sha256");
  for (const part of parts) hash.update(part);
  return hash.digest("hex");
}

function main(): void {
  const options = parseArgs(process.argv.slice(2));
  const palette: PaletteDocument = parsePaletteDocument(
    JSON.parse(readFileSync(options.palette, "utf8")),
  );
  const profile: RemasterProfile = parseRemasterProfile(
    JSON.parse(readFileSync(options.profile, "utf8")),
  );
  if (
    profile.cell.width !== palette.cell.width ||
    profile.cell.height !== palette.cell.height
  ) {
    throw new Error(
      `Profile cell ${profile.cell.width}×${profile.cell.height} does not match palette cell ` +
        `${palette.cell.width}×${palette.cell.height}`,
    );
  }

  const sheetJson = parseLudoSheet(
    JSON.parse(readFileSync(options.atlas, "utf8")),
  );
  const frameIndex = options.frame ?? profile.frame;
  const frame = sheetJson.frames[frameIndex];
  if (!frame) {
    throw new Error(
      `Frame index ${frameIndex} is outside the sheet (${sheetJson.frames.length} frames)`,
    );
  }

  const sheetImage = decodePng(options.sheet);
  const frameImage = cropRgba(sheetImage, frame.rect);
  const result = remasterImage(frameImage, palette, profile);

  if (result.paletteValidation.offPalettePixels > 0) {
    throw new Error(
      `Remaster output has ${result.paletteValidation.offPalettePixels} off-palette pixels`,
    );
  }
  if (result.paletteValidation.alphaViolations > 0) {
    throw new Error(
      `Remaster output has ${result.paletteValidation.alphaViolations} semi-transparent pixels`,
    );
  }

  encodePng(options.out, result.image);
  if (options.preview) {
    encodePng(
      options.preview,
      scaleNearest(
        flattenRgba(result.image, options.background),
        options.scale,
      ),
    );
  }
  if (options.classPreview) {
    encodePng(
      options.classPreview,
      scaleNearest(
        classPreview(
          result,
          palette.cell.width,
          palette.cell.height,
          options.background,
        ),
        options.scale,
      ),
    );
  }

  const report = {
    schemaVersion: 1,
    character: palette.character,
    frame: {
      index: frameIndex,
      key: frame.key,
      durationMs: frame.duration ?? null,
    },
    bbox: result.bbox,
    cell: palette.cell,
    inputHash: hashInputs([
      readFileSync(options.sheet),
      readFileSync(options.atlas),
      readFileSync(options.profile),
      readFileSync(options.palette),
      Buffer.from(frame.key),
    ]),
    stats: result.stats,
    paletteValidation: result.paletteValidation,
    output: options.out,
  };
  if (options.report) {
    mkdirSync(dirname(options.report), { recursive: true });
    writeFileSync(options.report, `${JSON.stringify(report, null, 2)}\n`);
  }

  console.log(
    [
      `Character: ${palette.character}`,
      `Frame: ${frame.key} (${frameIndex})`,
      `Source cell: ${result.bbox.width}×${result.bbox.height} → ${palette.cell.width}×${palette.cell.height}`,
      `Source classes: ${Object.entries(result.stats.sourceClassCounts)
        .map(([name, count]) => `${name}=${count}`)
        .join(" ")}`,
      `Target classes: ${Object.entries(result.stats.targetClassCounts)
        .map(([name, count]) => `${name}=${count}`)
        .join(" ")}`,
      `Low-confidence cells: ${result.stats.lowConfidenceCells.length}`,
      `Forced outline cells: ${result.stats.forcedOutlineCells}`,
      `Override cells: ${result.stats.overriddenCells}`,
      `Off-palette pixels: ${result.paletteValidation.offPalettePixels}`,
      `Alpha violations: ${result.paletteValidation.alphaViolations}`,
      `Output: ${options.out}`,
      options.preview ? `Preview: ${options.preview}` : null,
      options.classPreview ? `Class preview: ${options.classPreview}` : null,
      options.report ? `Report: ${options.report}` : null,
    ]
      .filter((line): line is string => line !== null)
      .join("\n"),
  );
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  console.error(`\n${usage()}`);
  process.exitCode = 1;
}
