#!/usr/bin/env tsx
/**
 * Slice a Ludo.ai sprite sheet into individual PNG frames and optionally build
 * a GIF preview.
 *
 * Usage:
 *   npm run art:slice -- --sheet <sheet.png> [--atlas <sheet.json>]
 *     [--out <frames-dir>] [--gif <preview.gif>] [--scale 1]
 *     [--background "#101a20"] [--fps 23.26] [--limit 12]
 *
 * The source PNG and JSON are never modified.
 */

import { spawnSync } from "node:child_process";
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { basename, dirname, extname, join, resolve } from "node:path";
import { PNG } from "pngjs";
import {
  commonFrameDuration,
  flattenRgba,
  fpsFromDuration,
  parseHexColor,
  parseLudoSheet,
  scaleNearest,
  sliceSheet,
  type Rgb,
} from "./art/ludo-sheet";

interface Options {
  sheet: string;
  atlas: string;
  out?: string;
  gif?: string;
  scale: number;
  background: Rgb;
  fps?: number;
  limit?: number;
}

function usage(): string {
  return [
    "Usage: npm run art:slice -- --sheet <sheet.png> [options]",
    "",
    "Options:",
    "  --atlas <path>       Ludo JSON (defaults to the PNG basename with .json)",
    "  --out <dir>          write individual frame PNGs to this directory",
    "  --gif <path>         write a looping GIF preview",
    "  --scale <n>          integer preview scale (default 1)",
    "  --background <hex>   GIF background colour (default #101a20)",
    "  --fps <n>            override the GIF frame rate",
    "  --limit <n>          only use the first n frames",
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
  const sheet = readOption(args, "--sheet");
  if (!sheet) throw new Error("--sheet is required");

  const atlas =
    readOption(args, "--atlas") ??
    join(
      dirname(sheet),
      `${basename(sheet, extname(sheet))}.json`,
    );

  const scaleValue = readOption(args, "--scale");
  const scale = scaleValue === undefined ? 1 : positiveInteger(scaleValue, "--scale");

  const backgroundValue = readOption(args, "--background") ?? "#101a20";
  const background = parseHexColor(backgroundValue);

  const fpsValue = readOption(args, "--fps");
  const fps = fpsValue === undefined ? undefined : Number(fpsValue);
  if (fps !== undefined && (!Number.isFinite(fps) || fps <= 0)) {
    throw new Error("--fps must be a positive number");
  }

  const limitValue = readOption(args, "--limit");
  const limit =
    limitValue === undefined ? undefined : positiveInteger(limitValue, "--limit");

  return {
    sheet: resolve(sheet),
    atlas: resolve(atlas),
    ...(readOption(args, "--out")
      ? { out: resolve(readOption(args, "--out") as string) }
      : {}),
    ...(readOption(args, "--gif")
      ? { gif: resolve(readOption(args, "--gif") as string) }
      : {}),
    scale,
    background,
    ...(fps !== undefined ? { fps } : {}),
    ...(limit !== undefined ? { limit } : {}),
  };
}

function decodePng(path: string): { width: number; height: number; data: Buffer } {
  const png = PNG.sync.read(readFileSync(path));
  return { width: png.width, height: png.height, data: Buffer.from(png.data) };
}

function encodePng(
  path: string,
  image: { width: number; height: number; data: Buffer },
): void {
  const png = new PNG({ width: image.width, height: image.height });
  image.data.copy(png.data);
  writeFileSync(path, PNG.sync.write(png));
}

function writeFrames(
  directory: string,
  frames: Array<{ key: string; image: { width: number; height: number; data: Buffer } }>,
): void {
  mkdirSync(directory, { recursive: true });
  frames.forEach((frame, index) => {
    encodePng(join(directory, `frame-${String(index).padStart(3, "0")}.png`), frame.image);
  });
}

function buildGif(
  directory: string,
  frames: Array<{ image: { width: number; height: number; data: Buffer } }>,
  options: Options,
  fps: number,
): void {
  const flattened = frames.map((frame) =>
    scaleNearest(flattenRgba(frame.image, options.background), options.scale),
  );
  flattened.forEach((image, index) => {
    encodePng(join(directory, `preview-${String(index).padStart(3, "0")}.png`), image);
  });

  if (!options.gif) return;
  mkdirSync(dirname(options.gif), { recursive: true });

  const filter =
    "split[s0][s1];[s0]palettegen=stats_mode=full[p];[s1][p]paletteuse=dither=none";

  const result = spawnSync(
    "ffmpeg",
    [
      "-y",
      "-framerate",
      String(fps),
      "-i",
      join(directory, "preview-%03d.png"),
      "-vf",
      filter,
      "-loop",
      "0",
      options.gif,
    ],
    { stdio: "inherit" },
  );

  if (result.error) {
    throw new Error(`Could not run ffmpeg: ${result.error.message}`);
  }
  if (result.status !== 0) {
    throw new Error(`ffmpeg exited with status ${String(result.status)}`);
  }
}

function main(): void {
  const options = parseArgs(process.argv.slice(2));
  const sheet = parseLudoSheet(
    JSON.parse(readFileSync(options.atlas, "utf8")),
  );
  const image = decodePng(options.sheet);
  const allFrames = sliceSheet(image, sheet);
  const frames =
    options.limit === undefined ? allFrames : allFrames.slice(0, options.limit);

  if (frames.length === 0) {
    throw new Error("No frames selected");
  }

  if (options.out) {
    writeFrames(options.out, frames);
  }

  const duration = commonFrameDuration(sheet);
  const fps = options.fps ?? (duration ? fpsFromDuration(duration) : 12);

  if (options.gif) {
    const temp = mkdtempSync(join(tmpdir(), "shrinkonauts-art-"));
    try {
      buildGif(temp, frames, options, fps);
    } finally {
      rmSync(temp, { recursive: true, force: true });
    }
  }

  console.log(
    [
      `Sheet: ${options.sheet}`,
      `Atlas: ${options.atlas}`,
      `Frames: ${frames.length}/${allFrames.length}`,
      `Frame size: ${frames[0]?.image.width}×${frames[0]?.image.height}`,
      `GIF fps: ${fps.toFixed(2)}`,
      options.out ? `Frames: ${options.out}` : null,
      options.gif ? `GIF: ${options.gif}` : null,
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
