/**
 * Pure helpers for fitting concept art into the fixed entity cell.
 *
 * The fit is intentionally simple and deterministic: crop to the alpha bounds,
 * area-resample with `resizeBox`, hard-threshold alpha, then place the result
 * bottom-centre inside the cell with a configurable transparent margin. Palette
 * quantisation and baseline snapping are applied by `fitEntitySprite`.
 */

import {
  alphaBounds,
  cropAlpha,
  type AlphaBBox,
} from "./key";
import type { RgbaImage } from "./ludo-sheet";
import {
  quantizeImage,
  validatePaletteImage,
  type PaletteDocument,
  type PaletteValidation,
  type QuantizeResult,
} from "./palette";
import { resizeBox } from "./resample";

export interface CellSize {
  width: number;
  height: number;
}

export interface FitGeometryOptions {
  cell: CellSize;
  /** Transparent border on every side, in source pixels. */
  margin: number;
  /** Alpha values below this become 0; the rest become 255. */
  alphaThreshold?: number;
}

export interface PlacedFit {
  image: RgbaImage;
  sourceBounds: AlphaBBox;
  fitWidth: number;
  fitHeight: number;
  offsetX: number;
  offsetY: number;
  scale: number;
  upscaled: boolean;
  bounds: AlphaBBox | null;
}

export interface EntityFitOptions extends FitGeometryOptions {
  palette: PaletteDocument;
  /** Approved ramp names used both to quantise and validate the sprite. */
  ramps: readonly string[];
}

export interface EntityFitResult {
  placed: PlacedFit;
  image: RgbaImage;
  quantization: QuantizeResult;
  paletteValidation: PaletteValidation;
  finalBounds: AlphaBBox;
  margins: { top: number; right: number; bottom: number; left: number };
  rampHistogram: Record<string, number>;
}

function positiveInteger(value: number, label: string): number {
  if (!Number.isInteger(value) || value < 1) {
    throw new Error(`${label} must be a positive integer`);
  }
  return value;
}

function nonNegativeInteger(value: number, label: string): number {
  if (!Number.isInteger(value) || value < 0) {
    throw new Error(`${label} must be a non-negative integer`);
  }
  return value;
}

export function parseCellSize(value: string): CellSize {
  const match = value.replace("×", "x").trim().match(/^(\d+)x(\d+)$/i);
  if (!match) {
    throw new Error(`Cell size "${value}" must look like 18x18`);
  }
  const width = Number(match[1]);
  const height = Number(match[2]);
  if (width < 1 || height < 1) {
    throw new Error(`Cell size "${value}" must use positive dimensions`);
  }
  return { width, height };
}

export function thresholdAlpha(image: RgbaImage, threshold = 128): RgbaImage {
  if (!Number.isInteger(threshold) || threshold < 0 || threshold > 255) {
    throw new Error("Alpha threshold must be an integer within 0..255");
  }
  const data = Buffer.from(image.data);
  for (let index = 0; index < data.length; index += 4) {
    data[index + 3] = (data[index + 3] ?? 0) >= threshold ? 255 : 0;
  }
  return { width: image.width, height: image.height, data };
}

/**
 * Crop to the alpha bounds, fit into the cell without stretching, and place the
 * result bottom-centre with a transparent margin. Small sources are not
 * upscaled.
 */
export function fitImageToCell(
  image: RgbaImage,
  options: FitGeometryOptions,
): PlacedFit {
  const cell = {
    width: positiveInteger(options.cell.width, "cell.width"),
    height: positiveInteger(options.cell.height, "cell.height"),
  };
  const margin = nonNegativeInteger(options.margin, "margin");
  const alphaThreshold = options.alphaThreshold ?? 128;
  if (margin * 2 >= cell.width || margin * 2 >= cell.height) {
    throw new Error("margin leaves no room inside the cell");
  }

  const sourceBounds = alphaBounds(image);
  if (!sourceBounds) {
    throw new Error("Source has no opaque pixels");
  }
  const cropped = cropAlpha(image, sourceBounds);

  const availableWidth = cell.width - margin * 2;
  const availableHeight = cell.height - margin * 2;
  const scale = Math.min(
    availableWidth / cropped.width,
    availableHeight / cropped.height,
    1,
  );
  const fitWidth = Math.max(
    1,
    Math.min(availableWidth, Math.round(cropped.width * scale)),
  );
  const fitHeight = Math.max(
    1,
    Math.min(availableHeight, Math.round(cropped.height * scale)),
  );
  const resized = resizeBox(cropped, fitWidth, fitHeight);
  const thresholded = thresholdAlpha(resized, alphaThreshold);

  const offsetX = Math.floor((cell.width - fitWidth) / 2);
  const offsetY = cell.height - margin - fitHeight;
  const data = Buffer.alloc(cell.width * cell.height * 4);
  for (let y = 0; y < fitHeight; y += 1) {
    for (let x = 0; x < fitWidth; x += 1) {
      const source = (y * fitWidth + x) * 4;
      const target = ((offsetY + y) * cell.width + offsetX + x) * 4;
      thresholded.data.copy(data, target, source, source + 4);
    }
  }
  const placed: RgbaImage = {
    width: cell.width,
    height: cell.height,
    data,
  };

  return {
    image: placed,
    sourceBounds,
    fitWidth,
    fitHeight,
    offsetX,
    offsetY,
    scale,
    upscaled: scale > 1,
    bounds: alphaBounds(placed),
  };
}

export function translateImage(
  image: RgbaImage,
  dx: number,
  dy: number,
): RgbaImage {
  if (!Number.isInteger(dx) || !Number.isInteger(dy)) {
    throw new Error("Translation must use integer pixels");
  }
  const data = Buffer.alloc(image.data.length);
  for (let y = 0; y < image.height; y += 1) {
    const targetY = y + dy;
    if (targetY < 0 || targetY >= image.height) continue;
    for (let x = 0; x < image.width; x += 1) {
      const targetX = x + dx;
      if (targetX < 0 || targetX >= image.width) continue;
      const source = (y * image.width + x) * 4;
      const target = (targetY * image.width + targetX) * 4;
      image.data.copy(data, target, source, source + 4);
    }
  }
  return { width: image.width, height: image.height, data };
}

export function alphaMargins(
  image: RgbaImage,
  bounds: AlphaBBox,
): { top: number; right: number; bottom: number; left: number } {
  return {
    top: bounds.y,
    right: image.width - (bounds.x + bounds.width),
    bottom: image.height - (bounds.y + bounds.height),
    left: bounds.x,
  };
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.max(minimum, Math.min(maximum, value));
}

function rampHistogram(
  image: RgbaImage,
  palette: PaletteDocument,
): Record<string, number> {
  const colors = new Map<string, string>();
  for (const [rampName, ramp] of Object.entries(palette.ramps)) {
    for (const step of ["shadow", "base", "highlight"] as const) {
      colors.set(ramp[step], rampName);
    }
  }

  const histogram: Record<string, number> = {};
  for (let index = 0; index < image.data.length; index += 4) {
    if ((image.data[index + 3] ?? 0) === 0) continue;
    const color = `#${[
      image.data[index] ?? 0,
      image.data[index + 1] ?? 0,
      image.data[index + 2] ?? 0,
    ]
      .map((channel) => channel.toString(16).padStart(2, "0"))
      .join("")}`;
    const ramp = colors.get(color) ?? "unmapped";
    histogram[ramp] = (histogram[ramp] ?? 0) + 1;
  }
  return histogram;
}

/**
 * Fit, palette-quantise, validate and baseline-snap an entity sprite.
 *
 * The lowest visible pixel ends on the bottom padding line; the silhouette is
 * re-centred horizontally after quantisation so transparent edge pixels cannot
 * drift the sprite off-centre.
 */
export function fitEntitySprite(
  image: RgbaImage,
  options: EntityFitOptions,
): EntityFitResult {
  const placed = fitImageToCell(image, options);
  const quantization = quantizeImage(placed.image, options.palette, options.ramps);
  const quantized = quantization.image;
  const beforeSnap = alphaBounds(quantized);
  if (!beforeSnap) {
    throw new Error("Quantised sprite has no opaque pixels");
  }

  const margin = options.margin;
  const targetBottom = options.cell.height - margin - 1;
  const currentBottom = beforeSnap.y + beforeSnap.height - 1;
  const dy = targetBottom - currentBottom;

  const targetX = Math.floor(
    (options.cell.width - beforeSnap.width) / 2,
  );
  const minDx = margin - beforeSnap.x;
  const maxDx =
    options.cell.width - margin - (beforeSnap.x + beforeSnap.width);
  const dx = clamp(targetX - beforeSnap.x, minDx, maxDx);

  const shifted = translateImage(quantized, dx, dy);
  const finalBounds = alphaBounds(shifted);
  if (!finalBounds) {
    throw new Error("Shifted sprite has no opaque pixels");
  }
  const margins = alphaMargins(shifted, finalBounds);
  if (
    margins.top < margin ||
    margins.right < margin ||
    margins.bottom < margin ||
    margins.left < margin
  ) {
    throw new Error(
      `Sprite violates the ${margin}px margin: ` +
        `top ${margins.top}, right ${margins.right}, ` +
        `bottom ${margins.bottom}, left ${margins.left}`,
    );
  }

  const paletteValidation = validatePaletteImage(
    shifted,
    options.palette,
    options.ramps,
  );

  return {
    placed,
    image: shifted,
    quantization,
    paletteValidation,
    finalBounds,
    margins,
    rampHistogram: rampHistogram(shifted, options.palette),
  };
}
