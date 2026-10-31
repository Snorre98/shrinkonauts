/**
 * Semantic palette-LUT helpers for the source-art pipeline.
 *
 * A cleaned master is indexed by named roles (suit, visor, tanks, accent,
 * joints, outline, grime). A variant maps those roles to different named ramps
 * and the LUT is applied in one pass, so a target colour can also be a source
 * colour without cascading.
 */

import {
  parseHexColor,
  type Rgb,
  type RgbaImage,
} from "./ludo-sheet";

export const RAMP_STEPS = ["shadow", "base", "highlight"] as const;

export type RampStep = (typeof RAMP_STEPS)[number];

export interface PaletteRamp {
  shadow: string;
  base: string;
  highlight: string;
}

export interface PaletteDocument {
  schemaVersion: number;
  character: string;
  cell: { width: number; height: number };
  ramps: Record<string, PaletteRamp>;
  roles: Record<string, string>;
  variants: Record<string, Record<string, string>>;
}

export interface PaletteLutEntry {
  source: string;
  target: string;
  roles: readonly string[];
}

export interface PaletteVariantResult {
  image: RgbaImage;
  changedPixels: number;
  changedByColor: Record<string, number>;
  alphaViolations: number;
  unmappedOpaquePixels: number;
}

export interface PaletteValidation {
  offPalettePixels: number;
  alphaViolations: number;
  opaquePixels: number;
}

export interface QuantizeResult {
  image: RgbaImage;
  changedPixels: number;
  maxDistance: number;
  offPalettePixels: number;
  alphaViolations: number;
}

interface UnknownRecord {
  [key: string]: unknown;
}

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readNonEmptyString(
  value: unknown,
  label: string,
): string {
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`${label} must be a non-empty string`);
  }
  return value;
}

function readPositiveInteger(value: unknown, label: string): number {
  if (
    typeof value !== "number" ||
    !Number.isFinite(value) ||
    !Number.isInteger(value) ||
    value <= 0
  ) {
    throw new Error(`${label} must be a positive integer`);
  }
  return value;
}

function readHex(value: unknown, label: string): string {
  if (typeof value !== "string") {
    throw new Error(`${label} must be a #rrggbb colour`);
  }
  return normalizeHex(value);
}

export function normalizeHex(value: string): string {
  const [red, green, blue] = parseHexColor(value);
  return `#${[red, green, blue]
    .map((channel) => channel.toString(16).padStart(2, "0"))
    .join("")}`;
}

function parseRamp(value: unknown, label: string): PaletteRamp {
  if (!isRecord(value)) {
    throw new Error(`${label} must be an object`);
  }
  return {
    shadow: readHex(value.shadow, `${label}.shadow`),
    base: readHex(value.base, `${label}.base`),
    highlight: readHex(value.highlight, `${label}.highlight`),
  };
}

export function parsePaletteDocument(value: unknown): PaletteDocument {
  if (!isRecord(value)) {
    throw new Error("palette must be an object");
  }
  if (value.schemaVersion !== 1) {
    throw new Error("palette.schemaVersion must be 1");
  }

  const character = readNonEmptyString(value.character, "palette.character");

  if (!isRecord(value.cell)) {
    throw new Error("palette.cell must be an object");
  }
  const cell = {
    width: readPositiveInteger(value.cell.width, "palette.cell.width"),
    height: readPositiveInteger(value.cell.height, "palette.cell.height"),
  };

  if (!isRecord(value.ramps) || Object.keys(value.ramps).length === 0) {
    throw new Error("palette.ramps must contain at least one ramp");
  }
  const ramps: Record<string, PaletteRamp> = {};
  for (const [name, ramp] of Object.entries(value.ramps)) {
    if (name.trim() === "") {
      throw new Error("palette ramp names must be non-empty");
    }
    ramps[name] = parseRamp(ramp, `palette.ramps.${name}`);
  }

  if (!isRecord(value.roles) || Object.keys(value.roles).length === 0) {
    throw new Error("palette.roles must contain at least one role");
  }
  const roles: Record<string, string> = {};
  for (const [role, rampName] of Object.entries(value.roles)) {
    if (role.trim() === "") {
      throw new Error("palette role names must be non-empty");
    }
    if (typeof rampName !== "string" || !ramps[rampName]) {
      throw new Error(`palette.roles.${role} references an unknown ramp`);
    }
    roles[role] = rampName;
  }

  const variants: Record<string, Record<string, string>> = {};
  if (value.variants !== undefined) {
    if (!isRecord(value.variants)) {
      throw new Error("palette.variants must be an object");
    }
    for (const [variant, mapping] of Object.entries(value.variants)) {
      if (variant.trim() === "") {
        throw new Error("palette variant names must be non-empty");
      }
      if (!isRecord(mapping)) {
        throw new Error(`palette.variants.${variant} must be an object`);
      }
      const resolved: Record<string, string> = {};
      for (const [role, rampName] of Object.entries(mapping)) {
        if (!roles[role]) {
          throw new Error(
            `palette.variants.${variant}.${role} references an unknown role`,
          );
        }
        if (typeof rampName !== "string" || !ramps[rampName]) {
          throw new Error(
            `palette.variants.${variant}.${role} references an unknown ramp`,
          );
        }
        resolved[role] = rampName;
      }
      variants[variant] = resolved;
    }
  }

  return { schemaVersion: 1, character, cell, ramps, roles, variants };
}

export function resolveVariant(
  document: PaletteDocument,
  variantName: string | undefined,
): Record<string, string> {
  if (!variantName) {
    return { ...document.roles };
  }
  const variant = document.variants[variantName];
  if (!variant) {
    throw new Error(`Unknown palette variant "${variantName}"`);
  }
  return { ...document.roles, ...variant };
}

/**
 * Build a single-pass source-colour → target-colour LUT. If one source colour
 * is used by two roles with different targets, the palette is ambiguous and
 * the variant is rejected.
 */
export function buildPaletteLut(
  document: PaletteDocument,
  variantName: string | undefined,
): PaletteLutEntry[] {
  const resolved = resolveVariant(document, variantName);
  const entries = new Map<
    string,
    { target: string; roles: Set<string> }
  >();

  for (const [role, sourceRampName] of Object.entries(document.roles)) {
    const sourceRamp = document.ramps[sourceRampName];
    const targetRampName = resolved[role] ?? sourceRampName;
    const targetRamp = document.ramps[targetRampName];
    if (!sourceRamp || !targetRamp) {
      throw new Error(`palette role "${role}" references an unknown ramp`);
    }

    for (const step of RAMP_STEPS) {
      const source = sourceRamp[step];
      const target = targetRamp[step];
      const existing = entries.get(source);
      if (existing && existing.target !== target) {
        throw new Error(
          `PALETTE_LUT_AMBIGUOUS: ${source} is used by ` +
            `${[...existing.roles, role].join(", ")} with different targets`,
        );
      }
      if (existing) {
        existing.roles.add(role);
      } else {
        entries.set(source, { target, roles: new Set([role]) });
      }
    }
  }

  return [...entries.entries()]
    .map(([source, entry]) => ({
      source,
      target: entry.target,
      roles: [...entry.roles].sort(),
    }))
    .sort((left, right) => left.source.localeCompare(right.source));
}

export function applyPaletteVariant(
  image: RgbaImage,
  document: PaletteDocument,
  variantName: string | undefined,
): PaletteVariantResult {
  if (
    image.width !== document.cell.width ||
    image.height !== document.cell.height
  ) {
    throw new Error(
      `Master is ${image.width}×${image.height}; expected ` +
        `${document.cell.width}×${document.cell.height}`,
    );
  }

  const lut = new Map(
    buildPaletteLut(document, variantName).map((entry) => [
      normalizeHex(entry.source),
      normalizeHex(entry.target),
    ]),
  );
  const data = Buffer.from(image.data);
  let changedPixels = 0;
  let alphaViolations = 0;
  let unmappedOpaquePixels = 0;
  const changedByColor: Record<string, number> = {};

  for (let index = 0; index < data.length; index += 4) {
    const alpha = data[index + 3] ?? 0;
    if (alpha === 0) {
      continue;
    }
    if (alpha !== 255) {
      alphaViolations += 1;
    }

    const red = data[index] ?? 0;
    const green = data[index + 1] ?? 0;
    const blue = data[index + 2] ?? 0;
    const source = normalizeHex(
      `#${[red, green, blue]
        .map((channel) => channel.toString(16).padStart(2, "0"))
        .join("")}`,
    );
    const target = lut.get(source);
    if (!target) {
      unmappedOpaquePixels += 1;
      continue;
    }
    if (target === source) {
      continue;
    }

    const [nextRed, nextGreen, nextBlue] = parseHexColor(target);
    data[index] = nextRed;
    data[index + 1] = nextGreen;
    data[index + 2] = nextBlue;
    changedPixels += 1;
    changedByColor[source] = (changedByColor[source] ?? 0) + 1;
  }

  return {
    image: { width: image.width, height: image.height, data },
    changedPixels,
    changedByColor,
    alphaViolations,
    unmappedOpaquePixels,
  };
}

export function validatePaletteImage(
  image: RgbaImage,
  document: PaletteDocument,
  rampNames?: readonly string[],
): PaletteValidation {
  const allowed = new Set<string>();
  const names = rampNames ?? Object.keys(document.ramps);
  for (const name of names) {
    const ramp = document.ramps[name];
    if (!ramp) {
      throw new Error(`Unknown ramp "${name}"`);
    }
    for (const step of RAMP_STEPS) {
      allowed.add(ramp[step]);
    }
  }

  let offPalettePixels = 0;
  let alphaViolations = 0;
  let opaquePixels = 0;
  for (let index = 0; index < image.data.length; index += 4) {
    const alpha = image.data[index + 3] ?? 0;
    if (alpha === 0) {
      continue;
    }
    opaquePixels += 1;
    if (alpha !== 255) {
      alphaViolations += 1;
    }
    const color = normalizeHex(
      `#${[
        image.data[index] ?? 0,
        image.data[index + 1] ?? 0,
        image.data[index + 2] ?? 0,
      ]
        .map((channel) => channel.toString(16).padStart(2, "0"))
        .join("")}`,
    );
    if (!allowed.has(color)) {
      offPalettePixels += 1;
    }
  }

  return { offPalettePixels, alphaViolations, opaquePixels };
}

function paletteColors(
  document: PaletteDocument,
  rampNames?: readonly string[],
): Array<{ hex: string; rgb: Rgb }> {
  const names = rampNames ?? Object.keys(document.ramps);
  const colors: Array<{ hex: string; rgb: Rgb }> = [];
  for (const name of names) {
    const ramp = document.ramps[name];
    if (!ramp) {
      throw new Error(`Unknown ramp "${name}"`);
    }
    for (const step of RAMP_STEPS) {
      colors.push({ hex: ramp[step], rgb: parseHexColor(ramp[step]) });
    }
  }
  return colors;
}

/** Quantize opaque pixels to the nearest approved ramp colour. */
export function quantizeImage(
  image: RgbaImage,
  document: PaletteDocument,
  rampNames?: readonly string[],
): QuantizeResult {
  const colors = paletteColors(document, rampNames);
  if (colors.length === 0) {
    throw new Error("No palette colours available");
  }
  const allowed = new Set(colors.map((entry) => entry.hex));
  const data = Buffer.from(image.data);
  let changedPixels = 0;
  let offPalettePixels = 0;
  let alphaViolations = 0;
  let maxDistance = 0;

  for (let index = 0; index < data.length; index += 4) {
    const alpha = data[index + 3] ?? 0;
    if (alpha === 0) {
      continue;
    }
    if (alpha !== 255) {
      alphaViolations += 1;
    }

    const red = data[index] ?? 0;
    const green = data[index + 1] ?? 0;
    const blue = data[index + 2] ?? 0;
    const source = normalizeHex(
      `#${[red, green, blue]
        .map((channel) => channel.toString(16).padStart(2, "0"))
        .join("")}`,
    );
    if (!allowed.has(source)) {
      offPalettePixels += 1;
    }

    let best = colors[0];
    let bestDistance = Number.POSITIVE_INFINITY;
    for (const entry of colors) {
      const [paletteRed, paletteGreen, paletteBlue] = entry.rgb;
      const distance =
        (red - paletteRed) ** 2 +
        (green - paletteGreen) ** 2 +
        (blue - paletteBlue) ** 2;
      if (distance < bestDistance) {
        bestDistance = distance;
        best = entry;
      }
    }

    if (!best) {
      continue;
    }
    const [nextRed, nextGreen, nextBlue] = best.rgb;
    maxDistance = Math.max(maxDistance, Math.sqrt(bestDistance));
    if (
      nextRed !== red ||
      nextGreen !== green ||
      nextBlue !== blue
    ) {
      data[index] = nextRed;
      data[index + 1] = nextGreen;
      data[index + 2] = nextBlue;
      changedPixels += 1;
    }
  }

  return {
    image: { width: image.width, height: image.height, data },
    changedPixels,
    maxDistance,
    offPalettePixels,
    alphaViolations,
  };
}
