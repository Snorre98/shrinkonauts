#!/usr/bin/env tsx
/**
 * Validate and quantize a cleaned source master to the semantic palette.
 *
 * Usage:
 *   npm run art:normalize -- --in <master.png> --palette <palette.json>
 *     --out <normalized.png> [--preview <preview.png>] [--scale 2]
 *     [--background "#101a20"] [--report <report.json>]
 *
 * This tool does not trace or resize faux-pixel Ludo frames. The input must
 * already be the normalized cell size (14×22 for the player).
 */

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { PNG } from "pngjs";
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
} from "./art/palette";

interface Options {
  input: string;
  palette: string;
  out: string;
  preview?: string;
  scale: number;
  background: ReturnType<typeof parseHexColor>;
  report?: string;
}

function usage(): string {
  return [
    "Usage: npm run art:normalize -- --in <png> --palette <json> --out <png>",
    "",
    "Options:",
    "  --preview <path>     write a nearest-neighbour preview PNG",
    "  --scale <n>          preview scale, positive integer (default 2)",
    "  --background <hex>   preview background (default #101a20)",
    "  --report <path>      write a JSON validation report",
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
  if (!Number.isInteger(parsed) || parsed < 1) {
    throw new Error(`${label} must be a positive integer`);
  }
  return parsed;
}

function parseArgs(args: string[]): Options {
  const input = readOption(args, "--in");
  const palette = readOption(args, "--palette");
  const out = readOption(args, "--out");
  if (!input) throw new Error("--in is required");
  if (!palette) throw new Error("--palette is required");
  if (!out) throw new Error("--out is required");

  const scaleValue = readOption(args, "--scale");
  const scale =
    scaleValue === undefined ? 2 : positiveInteger(scaleValue, "--scale");

  return {
    input: resolve(input),
    palette: resolve(palette),
    out: resolve(out),
    ...(readOption(args, "--preview")
      ? { preview: resolve(readOption(args, "--preview") as string) }
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

function main(): void {
  const options = parseArgs(process.argv.slice(2));
  const document = parsePaletteDocument(
    JSON.parse(readFileSync(options.palette, "utf8")),
  );
  const input = decodePng(options.input);

  if (
    input.width !== document.cell.width ||
    input.height !== document.cell.height
  ) {
    throw new Error(
      `Master is ${input.width}×${input.height}; clean it to ` +
        `${document.cell.width}×${document.cell.height} before normalizing`,
    );
  }

  const baseRamps = [...new Set(Object.values(document.roles))];
  const result = quantizeImage(input, document, baseRamps);
  if (result.alphaViolations > 0) {
    throw new Error(
      `Master has ${result.alphaViolations} semi-transparent pixels; ` +
        "source art must use alpha 0 or 255",
    );
  }

  const validation = validatePaletteImage(result.image, document, baseRamps);
  if (validation.offPalettePixels > 0) {
    throw new Error(
      `Normalized master has ${validation.offPalettePixels} off-palette pixels`,
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

  const report = {
    character: document.character,
    cell: document.cell,
    sourceOffPalettePixels: result.offPalettePixels,
    quantizedPixels: result.changedPixels,
    maxDistance: Number(result.maxDistance.toFixed(2)),
    alphaViolations: result.alphaViolations,
    offPalettePixelsAfter: validation.offPalettePixels,
  };

  if (options.report) {
    mkdirSync(dirname(options.report), { recursive: true });
    writeFileSync(options.report, `${JSON.stringify(report, null, 2)}\n`);
  }

  console.log(
    [
      `Character: ${document.character}`,
      `Cell: ${document.cell.width}×${document.cell.height}`,
      `Source off-palette pixels: ${result.offPalettePixels}`,
      `Quantized pixels: ${result.changedPixels}`,
      `Max quantization distance: ${result.maxDistance.toFixed(2)}`,
      `Alpha violations: ${result.alphaViolations}`,
      `Output: ${options.out}`,
      options.preview ? `Preview: ${options.preview}` : null,
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
