#!/usr/bin/env tsx
/**
 * Apply a semantic palette variant to a cleaned source master.
 *
 * Usage:
 *   npm run art:variant -- --master <p1.png> --palette <palette.json>
 *     --variant <name> --out <variant.png>
 *     [--preview <preview.png>] [--scale 2] [--background "#101a20"]
 *     [--report <report.json>]
 *
 * The master must already be the normalized cell size (14×22 for the player).
 * This tool never resizes or traces the master; it only applies a single-pass
 * palette LUT.
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
  applyPaletteVariant,
  parsePaletteDocument,
  resolveVariant,
  validatePaletteImage,
  type PaletteDocument,
} from "./art/palette";

interface Options {
  master: string;
  palette: string;
  variant: string;
  out: string;
  preview?: string;
  scale: number;
  background: ReturnType<typeof parseHexColor>;
  report?: string;
}

function usage(): string {
  return [
    "Usage: npm run art:variant -- --master <png> --palette <json>",
    "  --variant <name> --out <png> [options]",
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
  const master = readOption(args, "--master");
  const palette = readOption(args, "--palette");
  const variant = readOption(args, "--variant");
  const out = readOption(args, "--out");
  if (!master) throw new Error("--master is required");
  if (!palette) throw new Error("--palette is required");
  if (!variant) throw new Error("--variant is required");
  if (!out) throw new Error("--out is required");

  const scaleValue = readOption(args, "--scale");
  const scale =
    scaleValue === undefined ? 2 : positiveInteger(scaleValue, "--scale");

  return {
    master: resolve(master),
    palette: resolve(palette),
    variant,
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

function roleReport(
  document: PaletteDocument,
  variant: string,
): Record<string, { source: string; target: string }> {
  const resolved = resolveVariant(document, variant);
  const report: Record<string, { source: string; target: string }> = {};
  for (const [role, source] of Object.entries(document.roles)) {
    report[role] = { source, target: resolved[role] ?? source };
  }
  return report;
}

function main(): void {
  const options = parseArgs(process.argv.slice(2));
  const document = parsePaletteDocument(
    JSON.parse(readFileSync(options.palette, "utf8")),
  );
  const master = decodePng(options.master);
  const result = applyPaletteVariant(master, document, options.variant);

  if (result.alphaViolations > 0) {
    throw new Error(
      `Master has ${result.alphaViolations} semi-transparent pixels; ` +
        "source art must use alpha 0 or 255",
    );
  }
  if (result.unmappedOpaquePixels > 0) {
    throw new Error(
      `Master has ${result.unmappedOpaquePixels} opaque pixels outside the ` +
        "semantic palette roles; clean the master and assign every pixel to a role",
    );
  }

  const targetRamps = [
    ...new Set(Object.values(resolveVariant(document, options.variant))),
  ];
  const validation = validatePaletteImage(
    result.image,
    document,
    targetRamps,
  );
  if (validation.offPalettePixels > 0) {
    throw new Error(
      `Variant has ${validation.offPalettePixels} pixels outside the target ramps`,
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
    variant: options.variant,
    cell: document.cell,
    roles: roleReport(document, options.variant),
    changedPixels: result.changedPixels,
    changedByColor: result.changedByColor,
    alphaViolations: result.alphaViolations,
    unmappedOpaquePixels: result.unmappedOpaquePixels,
    offPalettePixels: validation.offPalettePixels,
  };

  if (options.report) {
    mkdirSync(dirname(options.report), { recursive: true });
    writeFileSync(options.report, `${JSON.stringify(report, null, 2)}\n`);
  }

  console.log(
    [
      `Character: ${document.character}`,
      `Variant: ${options.variant}`,
      `Cell: ${document.cell.width}×${document.cell.height}`,
      `Changed pixels: ${result.changedPixels}`,
      `Unmapped opaque pixels: ${result.unmappedOpaquePixels}`,
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
