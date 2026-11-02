#!/usr/bin/env tsx
/**
 * Remove a flat chroma-key background from a concept plate.
 *
 * Usage:
 *   npm run art:key -- --in <image> --out <png> [options]
 *
 * Options:
 *   --key <hex>              background colour (default #ff00ff)
 *   --tolerance <0..1>       fully-keyed distance (default 0.18)
 *   --softness <0..1>        edge band above tolerance (default 0.08)
 *   --alpha-threshold <0..1> hard-alpha threshold in the band (default 0.5)
 *   --no-despill             keep the source edge colours
 *   --trim                   crop to the alpha bounding box
 *   --preview <path>         flattened review PNG
 *   --preview-width <px>     preview width (default 512)
 *   --background <hex>       preview background (default #101a20)
 *   --report <path>          JSON report
 *
 * ffmpeg is used only to decode JPEG/PNG into an RGBA PNG buffer. The keying,
 * despill, trim, and preview resize are deterministic local pixel operations.
 */

import { spawnSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { PNG } from "pngjs";
import {
  flattenRgba,
  parseHexColor,
  type RgbaImage,
} from "./art/ludo-sheet";
import {
  alphaBounds,
  keyChroma,
  parseChromaKeyOptions,
  resizeNearest,
  trimAlpha,
} from "./art/key";

interface Options {
  input: string;
  output: string;
  key: string;
  tolerance: number;
  softness: number;
  alphaThreshold: number;
  despill: boolean;
  trim: boolean;
  preview?: string;
  previewWidth: number;
  background: ReturnType<typeof parseHexColor>;
  report?: string;
}

function usage(): string {
  return [
    "Usage: npm run art:key -- --in <image> --out <png> [options]",
    "",
    "Options:",
    "  --key <hex>              background colour (default #ff00ff)",
    "  --tolerance <0..1>       fully-keyed distance (default 0.18)",
    "  --softness <0..1>        edge band above tolerance (default 0.08)",
    "  --alpha-threshold <0..1> hard-alpha threshold in the band (default 0.5)",
    "  --no-despill             keep the source edge colours",
    "  --trim                   crop to the alpha bounding box",
    "  --preview <path>         flattened review PNG",
    "  --preview-width <px>     preview width (default 512)",
    '  --background <hex>       preview background (default #101a20)',
    "  --report <path>          JSON report",
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

function readNumberOption(
  args: string[],
  name: string,
  fallback: number,
): number {
  const value = readOption(args, name);
  if (value === undefined) return fallback;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    throw new Error(`${name} must be a finite number`);
  }
  return parsed;
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
  const output = readOption(args, "--out");
  if (!input) throw new Error("--in is required");
  if (!output) throw new Error("--out is required");

  const previewWidthValue = readOption(args, "--preview-width");
  return {
    input: resolve(input),
    output: resolve(output),
    key: readOption(args, "--key") ?? "#ff00ff",
    tolerance: readNumberOption(args, "--tolerance", 0.18),
    softness: readNumberOption(args, "--softness", 0.08),
    alphaThreshold: readNumberOption(args, "--alpha-threshold", 0.5),
    despill: !args.includes("--no-despill"),
    trim: args.includes("--trim"),
    ...(readOption(args, "--preview")
      ? { preview: resolve(readOption(args, "--preview") as string) }
      : {}),
    previewWidth:
      previewWidthValue === undefined
        ? 512
        : positiveInteger(previewWidthValue, "--preview-width"),
    background: parseHexColor(
      readOption(args, "--background") ?? "#101a20",
    ),
    ...(readOption(args, "--report")
      ? { report: resolve(readOption(args, "--report") as string) }
      : {}),
  };
}

function decodeImage(path: string): RgbaImage {
  const result = spawnSync(
    "ffmpeg",
    [
      "-v",
      "error",
      "-i",
      path,
      "-f",
      "image2pipe",
      "-vcodec",
      "png",
      "-",
    ],
    { maxBuffer: 128 * 1024 * 1024 },
  );
  if (result.error) {
    throw new Error(`Could not run ffmpeg: ${result.error.message}`);
  }
  if (result.status !== 0) {
    throw new Error(
      `ffmpeg could not decode ${path}: ${result.stderr.toString().trim()}`,
    );
  }
  const png = PNG.sync.read(result.stdout);
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
  const source = decodeImage(options.input);
  const keyOptions = parseChromaKeyOptions({
    key: options.key,
    tolerance: options.tolerance,
    softness: options.softness,
    alphaThreshold: options.alphaThreshold,
    despill: options.despill,
  });
  const result = keyChroma(source, keyOptions);
  const trimmed = options.trim ? trimAlpha(result.image) : null;
  if (options.trim && !trimmed) {
    throw new Error("Keying removed every pixel; check --key and --tolerance");
  }
  const output = trimmed?.image ?? result.image;
  encodePng(options.output, output);

  if (options.preview) {
    const flattened = flattenRgba(output, options.background);
    const previewHeight = Math.max(
      1,
      Math.round(
        (flattened.height * options.previewWidth) / flattened.width,
      ),
    );
    encodePng(
      options.preview,
      resizeNearest(flattened, options.previewWidth, previewHeight),
    );
  }

  const bounds = alphaBounds(output);
  const report = {
    schemaVersion: 1,
    input: options.input,
    output: options.output,
    key: options.key,
    tolerance: options.tolerance,
    softness: options.softness,
    alphaThreshold: options.alphaThreshold,
    despill: options.despill,
    trim: options.trim,
    source: { width: source.width, height: source.height },
    outputSize: { width: output.width, height: output.height },
    bbox: bounds,
    stats: result.stats,
  };
  if (options.report) {
    mkdirSync(dirname(options.report), { recursive: true });
    writeFileSync(options.report, `${JSON.stringify(report, null, 2)}\n`);
  }

  console.log(
    [
      `Input: ${options.input}`,
      `Key: ${options.key} (tolerance ${options.tolerance}, softness ${options.softness})`,
      `Keyed pixels: ${result.stats.keyedPixels}`,
      `Kept pixels: ${result.stats.keptPixels}`,
      `Despilled pixels: ${result.stats.despilledPixels}`,
      `Output: ${output.width}×${output.height} → ${options.output}`,
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
