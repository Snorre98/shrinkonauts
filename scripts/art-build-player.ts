#!/usr/bin/env tsx
/**
 * Build POC player animation sheets from the Ludo source exports.
 *
 * Usage:
 *   npm run art:build-player -- [options]
 *
 * Options:
 *   --character <p1|p2|all>     default all
 *   --sampler <remaster|downscale|both>  default both
 *   --write-runtime             write the chosen sampler to public/ (default off)
 *   --out-dir <dir>             runtime output directory
 *   --preview-dir <dir>         preview output directory
 *
 * Without --write-runtime the command only writes review previews and reports.
 * That lets us compare the semantic remaster and the POC downscale path before
 * committing one to the runtime manifest.
 */

import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { PNG } from "pngjs";
import {
  flattenRgba,
  parseHexColor,
  parseLudoSheet,
  scaleNearest,
  sliceSheet,
  type RgbaImage,
} from "./art/ludo-sheet";
import {
  parsePaletteDocument,
  quantizeImage,
  validatePaletteImage,
  type PaletteDocument,
} from "./art/palette";
import {
  parseRemasterProfile,
  remasterImage,
} from "./art/remaster";
import { fitImageToCell } from "./art/entity-fit";
import {
  parsePlayerClips,
  type PlayerClipDefinition,
  type PlayerClipsDocument,
} from "./art/player-clips";

type CharacterId = "p1" | "p2" | "neuron-agent";
type Sampler = "remaster" | "downscale";

interface CharacterConfig {
  id: CharacterId;
  character: string;
  root: string;
  clips: string;
  palette: string;
  /** Optional: required only for the semantic remaster sampler. */
  profile?: string;
}

interface BuildOptions {
  characters: CharacterId[];
  samplers: Sampler[];
  writeRuntime: boolean;
  outDir: string;
  previewDir: string;
}

interface ClipOutput {
  name: string;
  output: string;
  source: string;
  sourceFrames: [number, number];
  frames: number;
  fps: number;
  loop: boolean;
  static: boolean;
  width: number;
  height: number;
  file: string;
  bytes: number;
  paletteValidation: {
    offPalettePixels: number;
    alphaViolations: number;
    opaquePixels: number;
  };
}

interface BuildReport {
  schemaVersion: 1;
  character: string;
  sampler: Sampler;
  cell: { width: number; height: number };
  origin: [number, number];
  margin: number;
  alphaThreshold: number;
  ramps?: string[];
  previewScale: number;
  runtime: boolean;
  clips: ClipOutput[];
  warnings: string[];
}

const CHARACTERS: Record<CharacterId, CharacterConfig> = {
  p1: {
    id: "p1",
    character: "player-p1",
    root: "art-source/characters/player-p1",
    clips: "art-source/characters/player-p1/working/clips.json",
    palette: "art-source/characters/player-p1/working/palette.json",
    profile: "art-source/characters/player-p1/working/remaster.json",
  },
  p2: {
    id: "p2",
    character: "player-p2",
    root: "art-source/characters/player-p2",
    clips: "art-source/characters/player-p2/working/clips.json",
    palette: "art-source/characters/player-p2/working/palette.json",
    profile: "art-source/characters/player-p2/working/remaster.json",
  },
  "neuron-agent": {
    id: "neuron-agent",
    character: "neuron-agent",
    root: "art-source/characters/neuron-agent",
    clips: "art-source/characters/neuron-agent/working/clips.json",
    palette: "art-source/nanobanan/palette.json",
  },
};

const DEFAULT_OUT_DIR = "public/packs/anatomy-reflex/shared/sprites";
const DEFAULT_PREVIEW_DIR = "art-source/previews/poc";
const PREVIEW_BACKGROUND = parseHexColor("#101a20");

function usage(): string {
  return [
    "Usage: npm run art:build-player -- [options]",
    "",
    "Options:",
    "  --character <p1|p2|neuron-agent|all> default all (players)",
    "  --sampler <remaster|downscale|both>  default both",
    "  --write-runtime                     write runtime PNGs to --out-dir",
    "  --out-dir <dir>                     runtime output directory",
    "  --preview-dir <dir>                 preview output directory",
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

function parseArgs(args: string[]): BuildOptions {
  const characterValue = readOption(args, "--character") ?? "all";
  if (!["p1", "p2", "neuron-agent", "all"].includes(characterValue)) {
    throw new Error("--character must be p1, p2, neuron-agent, or all");
  }
  const samplerValue = readOption(args, "--sampler") ?? "both";
  if (!["remaster", "downscale", "both"].includes(samplerValue)) {
    throw new Error("--sampler must be remaster, downscale, or both");
  }

  return {
    characters:
      characterValue === "all"
        ? ["p1", "p2"]
        : [characterValue as CharacterId],
    samplers:
      samplerValue === "both"
        ? ["remaster", "downscale"]
        : [samplerValue as Sampler],
    writeRuntime: args.includes("--write-runtime"),
    outDir: resolve(readOption(args, "--out-dir") ?? DEFAULT_OUT_DIR),
    previewDir: resolve(
      readOption(args, "--preview-dir") ?? DEFAULT_PREVIEW_DIR,
    ),
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

function downscaleFrame(
  frame: RgbaImage,
  palette: PaletteDocument,
  cell: { width: number; height: number },
  margin: number,
  alphaThreshold: number,
  ramps: readonly string[] | undefined,
): { image: RgbaImage; paletteValidation: ReturnType<typeof validatePaletteImage> } {
  const approvedRamps = ramps ?? [...new Set(Object.values(palette.roles))];
  const placed = fitImageToCell(frame, { cell, margin, alphaThreshold });
  const quantized = quantizeImage(placed.image, palette, approvedRamps);
  const validation = validatePaletteImage(
    quantized.image,
    palette,
    approvedRamps,
  );
  return { image: quantized.image, paletteValidation: validation };
}

function packStrip(
  frames: RgbaImage[],
  cell: { width: number; height: number },
): RgbaImage {
  const width = cell.width * frames.length;
  const height = cell.height;
  const data = Buffer.alloc(width * height * 4);
  frames.forEach((frame, index) => {
    if (frame.width !== cell.width || frame.height !== cell.height) {
      throw new Error(
        `Frame ${index} is ${frame.width}×${frame.height}; expected ${cell.width}×${cell.height}`,
      );
    }
    for (let y = 0; y < cell.height; y += 1) {
      const sourceStart = y * cell.width * 4;
      const targetStart = (y * width + index * cell.width) * 4;
      frame.data.copy(
        data,
        targetStart,
        sourceStart,
        sourceStart + cell.width * 4,
      );
    }
  });
  return { width, height, data };
}

function writeGif(
  frames: RgbaImage[],
  fps: number,
  path: string,
  scale: number,
): void {
  if (frames.length <= 1) return;
  const temp = mkdtempSync(join(tmpdir(), "shrinkonauts-player-"));
  try {
    frames.forEach((frame, index) => {
      encodePng(
        join(temp, `frame-${String(index).padStart(3, "0")}.png`),
        scaleNearest(flattenRgba(frame, PREVIEW_BACKGROUND), scale),
      );
    });
    mkdirSync(dirname(path), { recursive: true });
    const filter =
      "split[s0][s1];[s0]palettegen=stats_mode=full[p];[s1][p]paletteuse=dither=none";
    const result = spawnSync(
      "ffmpeg",
      [
        "-y",
        "-v",
        "error",
        "-framerate",
        String(fps),
        "-i",
        join(temp, "frame-%03d.png"),
        "-vf",
        filter,
        "-loop",
        "0",
        path,
      ],
      { stdio: "inherit" },
    );
    if (result.error) {
      throw new Error(`Could not run ffmpeg: ${result.error.message}`);
    }
    if (result.status !== 0) {
      throw new Error(`ffmpeg exited with status ${String(result.status)}`);
    }
  } finally {
    rmSync(temp, { recursive: true, force: true });
  }
}

function buildClip(
  clip: PlayerClipDefinition,
  sourceFrames: RgbaImage[],
  palette: PaletteDocument,
  profile: ReturnType<typeof parseRemasterProfile> | null,
  sampler: Sampler,
  clips: PlayerClipsDocument,
  outputDir: string,
  previewDir: string,
): ClipOutput {
  const cell = clips.cell;
  const [start, end] = clip.frames;
  if (start < 0 || end >= sourceFrames.length) {
    throw new Error(
      `${clip.output} frames ${start}-${end} exceed source (${sourceFrames.length} frames)`,
    );
  }

  const frames: RgbaImage[] = [];
  let offPalettePixels = 0;
  let alphaViolations = 0;
  let opaquePixels = 0;

  for (let index = start; index <= end; index += 1) {
    const source = sourceFrames[index];
    if (!source) {
      throw new Error(`Missing source frame ${index}`);
    }
    if (sampler === "remaster") {
      if (!profile) {
        throw new Error(`${clip.output} has no remaster profile`);
      }
      const result = remasterImage(source, palette, profile);
      frames.push(result.image);
      offPalettePixels += result.paletteValidation.offPalettePixels;
      alphaViolations += result.paletteValidation.alphaViolations;
      opaquePixels += result.paletteValidation.opaquePixels;
    } else {
      const result = downscaleFrame(
        source,
        palette,
        cell,
        clips.margin,
        clips.alphaThreshold,
        clips.ramps,
      );
      frames.push(result.image);
      offPalettePixels += result.paletteValidation.offPalettePixels;
      alphaViolations += result.paletteValidation.alphaViolations;
      opaquePixels += result.paletteValidation.opaquePixels;
    }
  }

  const packed = clip.static ? frames[0] : packStrip(frames, cell);
  if (!packed) {
    throw new Error(`${clip.output} produced no frames`);
  }

  const file = join(outputDir, `${clip.output}.png`);
  encodePng(file, packed);

  const previewStem = join(previewDir, sampler, clip.output);
  const previewScale = clips.previewScale;
  if (clip.static) {
    encodePng(
      `${previewStem}-${previewScale}x.png`,
      scaleNearest(flattenRgba(packed, PREVIEW_BACKGROUND), previewScale),
    );
  } else {
    encodePng(
      `${previewStem}-${previewScale}x.png`,
      scaleNearest(flattenRgba(packed, PREVIEW_BACKGROUND), previewScale),
    );
    writeGif(frames, clip.fps, `${previewStem}.gif`, previewScale);
  }

  return {
    name: clip.output,
    output: clip.output,
    source: clip.source,
    sourceFrames: clip.frames,
    frames: frames.length,
    fps: clip.fps,
    loop: clip.loop,
    static: clip.static === true,
    width: packed.width,
    height: packed.height,
    file,
    bytes: statSync(file).size,
    paletteValidation: {
      offPalettePixels,
      alphaViolations,
      opaquePixels,
    },
  };
}

function buildCharacter(
  config: CharacterConfig,
  samplers: Sampler[],
  options: BuildOptions,
): BuildReport[] {
  const clips = parsePlayerClips(
    JSON.parse(readFileSync(resolve(config.clips), "utf8")),
  );
  const palette = parsePaletteDocument(
    JSON.parse(readFileSync(resolve(config.palette), "utf8")),
  );
  const profile =
    config.profile && samplers.includes("remaster")
      ? parseRemasterProfile(
          JSON.parse(readFileSync(resolve(config.profile), "utf8")),
        )
      : null;
  if (
    clips.cell.width !== palette.cell.width ||
    clips.cell.height !== palette.cell.height
  ) {
    console.warn(
      `${config.character} clip cell ${clips.cell.width}×${clips.cell.height} ` +
        `does not match palette cell ${palette.cell.width}×${palette.cell.height}; ` +
        `the clip cell wins (ADR-0075)`,
    );
  }

  const activeSamplers = samplers.filter(
    (sampler) => sampler !== "remaster" || profile !== null,
  );
  if (activeSamplers.length === 0) {
    throw new Error(
      `${config.character} has no remaster profile; use --sampler downscale`,
    );
  }
  const skippedRemaster = samplers.includes("remaster") && profile === null;

  const reports: BuildReport[] = [];
  for (const sampler of activeSamplers) {
    const sourceCache = new Map<string, RgbaImage[]>();
    const runtimeDir = options.writeRuntime
      ? options.outDir
      : join(options.previewDir, sampler, "runtime");
    const previewDir = options.previewDir;

    const clipOutputs: ClipOutput[] = [];
    for (const [name, clip] of Object.entries(clips.animations)) {
      const source = clips.sources[clip.source];
      if (!source) {
        throw new Error(`${name} references unknown source ${clip.source}`);
      }
      let sourceFrames = sourceCache.get(clip.source);
      if (!sourceFrames) {
        const sheetPath = resolve(config.root, source.sheet);
        const atlasPath = resolve(
          config.root,
          source.atlas ??
            `${source.sheet.slice(0, source.sheet.lastIndexOf("."))}.json`,
        );
        const sheet = parseLudoSheet(
          JSON.parse(readFileSync(atlasPath, "utf8")),
        );
        const image = decodePng(sheetPath);
        sourceFrames = sliceSheet(image, sheet).map((frame) => frame.image);
        sourceCache.set(clip.source, sourceFrames);
      }
      clipOutputs.push(
        buildClip(
          clip,
          sourceFrames,
          palette,
          profile,
          sampler,
          clips,
          runtimeDir,
          previewDir,
        ),
      );
    }

    const report: BuildReport = {
      schemaVersion: 1,
      character: config.character,
      sampler,
      cell: clips.cell,
      origin: clips.origin,
      margin: clips.margin,
      alphaThreshold: clips.alphaThreshold,
      ...(clips.ramps ? { ramps: clips.ramps } : {}),
      previewScale: clips.previewScale,
      runtime: options.writeRuntime,
      clips: clipOutputs,
      warnings: [],
    };
    if (!options.writeRuntime) {
      report.warnings.push(
        "Preview-only run; runtime assets were not written to public/.",
      );
    }
    if (skippedRemaster) {
      report.warnings.push(
        "No remaster profile; skipped the remaster sampler.",
      );
    }
    const reportPath = resolve(
      config.root,
      "working/tmp",
      `build-${sampler}${options.writeRuntime ? "-runtime" : ""}.json`,
    );
    mkdirSync(dirname(reportPath), { recursive: true });
    writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);
    reports.push(report);
  }
  return reports;
}

function main(): void {
  const options = parseArgs(process.argv.slice(2));
  const reports: BuildReport[] = [];
  for (const id of options.characters) {
    reports.push(
      ...buildCharacter(CHARACTERS[id], options.samplers, options),
    );
  }

  for (const report of reports) {
    console.log(
      [
        `${report.character} / ${report.sampler}${report.runtime ? " (runtime)" : " (preview)"}`,
        ...report.clips.map(
          (clip) =>
            `  ${clip.output}: ${clip.frames} frames, ${clip.fps} fps, ` +
            `${clip.width}×${clip.height}, ${clip.bytes} bytes, ` +
            `off-palette ${clip.paletteValidation.offPalettePixels}, ` +
            `alpha ${clip.paletteValidation.alphaViolations}`,
        ),
        ...report.warnings.map((warning) => `  warning: ${warning}`),
      ].join("\n"),
    );
  }

  if (options.writeRuntime) {
    console.log(
      `\nRuntime assets written to ${options.outDir}`,
    );
  } else {
    console.log(
      `\nPreview-only run. Review ${options.previewDir} and rerun with ` +
        "--sampler <remaster|downscale> --write-runtime.",
    );
  }
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  console.error(`\n${usage()}`);
  process.exitCode = 1;
}
