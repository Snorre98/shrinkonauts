import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  alphaMargins,
  fitEntitySprite,
  fitImageToCell,
  parseCellSize,
  thresholdAlpha,
  translateImage,
} from "../scripts/art/entity-fit";
import type { RgbaImage } from "../scripts/art/ludo-sheet";
import {
  parsePaletteDocument,
  type PaletteDocument,
} from "../scripts/art/palette";

function image(width: number, height: number, pixels: number[][]): RgbaImage {
  return { width, height, data: Buffer.from(pixels.flat()) };
}

function pixel(value: RgbaImage, x: number, y: number): number[] {
  const index = (y * value.width + x) * 4;
  return [...value.data.subarray(index, index + 4)];
}

function solid(width: number, height: number, color: number[]): RgbaImage {
  return image(
    width,
    height,
    Array.from({ length: width * height }, () => [...color]),
  );
}

function paletteValue(): Record<string, unknown> {
  return {
    schemaVersion: 1,
    character: "entity-test",
    cell: { width: 6, height: 6 },
    ramps: {
      bone: { shadow: "#c9b79a", base: "#f2e8d5", highlight: "#fff8e8" },
      ink: { shadow: "#000000", base: "#05090b", highlight: "#2a3f47" },
      joint: { shadow: "#3f9fb5", base: "#7bdff2", highlight: "#c9f7ff" },
    },
    roles: {
      body: "bone",
      outline: "ink",
      rim: "joint",
    },
  };
}

function palette(): PaletteDocument {
  return parsePaletteDocument(paletteValue());
}

describe("parseCellSize", () => {
  it("parses WxH and rejects malformed sizes", () => {
    expect(parseCellSize("18x18")).toEqual({ width: 18, height: 18 });
    expect(parseCellSize("18×16")).toEqual({ width: 18, height: 16 });
    expect(() => parseCellSize("18")).toThrow(/18x18/);
    expect(() => parseCellSize("0x18")).toThrow(/positive/);
  });
});

describe("fitImageToCell", () => {
  it("preserves a wide aspect ratio and leaves a 1px margin", () => {
    const source = solid(4, 1, [255, 0, 0, 255]);
    const placed = fitImageToCell(source, {
      cell: { width: 6, height: 6 },
      margin: 1,
    });
    expect(placed.fitWidth).toBe(4);
    expect(placed.fitHeight).toBe(1);
    expect(placed.offsetX).toBe(1);
    expect(placed.offsetY).toBe(4);
    expect(pixel(placed.image, 1, 4)).toEqual([255, 0, 0, 255]);
    expect(pixel(placed.image, 4, 5)).toEqual([0, 0, 0, 0]);
    expect(placed.bounds).toEqual({ x: 1, y: 4, width: 4, height: 1 });
  });

  it("centres a square source and keeps it on the baseline", () => {
    const source = solid(2, 2, [0, 255, 0, 255]);
    const placed = fitImageToCell(source, {
      cell: { width: 6, height: 6 },
      margin: 1,
    });
    expect(placed.fitWidth).toBe(2);
    expect(placed.fitHeight).toBe(2);
    expect(placed.bounds).toEqual({ x: 2, y: 3, width: 2, height: 2 });
    expect(alphaMargins(placed.image, placed.bounds!)).toEqual({
      top: 3,
      right: 2,
      bottom: 1,
      left: 2,
    });
  });

  it("does not upscale a source smaller than the cell", () => {
    const source = solid(2, 2, [0, 0, 255, 255]);
    const placed = fitImageToCell(source, {
      cell: { width: 18, height: 18 },
      margin: 1,
    });
    expect(placed.fitWidth).toBe(2);
    expect(placed.fitHeight).toBe(2);
    expect(placed.scale).toBe(1);
    expect(placed.upscaled).toBe(false);
  });

  it("rejects an empty source and a margin that leaves no room", () => {
    const empty = image(2, 2, [
      [0, 0, 0, 0], [0, 0, 0, 0],
      [0, 0, 0, 0], [0, 0, 0, 0],
    ]);
    expect(() =>
      fitImageToCell(empty, { cell: { width: 6, height: 6 }, margin: 1 }),
    ).toThrow(/no opaque pixels/);
    expect(() =>
      fitImageToCell(solid(1, 1, [1, 1, 1, 255]), {
        cell: { width: 2, height: 2 },
        margin: 1,
      }),
    ).toThrow(/no room/);
  });
});

describe("thresholdAlpha", () => {
  it("hard-thresholds alpha to 0 or 255", () => {
    const source = image(3, 1, [
      [10, 20, 30, 0],
      [10, 20, 30, 127],
      [10, 20, 30, 128],
    ]);
    const result = thresholdAlpha(source, 128);
    expect(pixel(result, 0, 0)[3]).toBe(0);
    expect(pixel(result, 1, 0)[3]).toBe(0);
    expect(pixel(result, 2, 0)[3]).toBe(255);
  });
});

describe("translateImage", () => {
  it("moves pixels and trims anything outside the image", () => {
    const source = image(2, 2, [
      [1, 2, 3, 255], [0, 0, 0, 0],
      [0, 0, 0, 0], [0, 0, 0, 0],
    ]);
    const moved = translateImage(source, 1, 1);
    expect(pixel(moved, 0, 0)).toEqual([0, 0, 0, 0]);
    expect(pixel(moved, 1, 1)).toEqual([1, 2, 3, 255]);
    const clipped = translateImage(source, -1, -1);
    expect(pixel(clipped, 0, 0)).toEqual([0, 0, 0, 0]);
  });
});

describe("fitEntitySprite", () => {
  it("quantises, validates, and sits on the bottom padding line", () => {
    const source = solid(4, 2, [245, 230, 210, 255]);
    const result = fitEntitySprite(source, {
      cell: { width: 6, height: 6 },
      margin: 1,
      palette: palette(),
      ramps: ["bone", "ink", "joint"],
    });
    expect(result.image.width).toBe(6);
    expect(result.image.height).toBe(6);
    expect(result.finalBounds.y + result.finalBounds.height).toBe(5);
    expect(result.margins.bottom).toBe(1);
    expect(result.margins.left).toBeGreaterThanOrEqual(1);
    expect(result.margins.right).toBeGreaterThanOrEqual(1);
    expect(result.paletteValidation.offPalettePixels).toBe(0);
    expect(result.paletteValidation.alphaViolations).toBe(0);
    expect(result.rampHistogram.bone).toBeGreaterThan(0);
    expect(result.rampHistogram.orange).toBeUndefined();
  });

  it("rejects unknown ramps", () => {
    expect(() =>
      fitEntitySprite(solid(2, 2, [0, 0, 0, 255]), {
        cell: { width: 6, height: 6 },
        margin: 1,
        palette: palette(),
        ramps: ["orange"],
      }),
    ).toThrow(/Unknown ramp/);
  });
});

describe("entity palette document", () => {
  it("contains the eight approved non-orange ramps", () => {
    const document = parsePaletteDocument(
      JSON.parse(
        readFileSync("art-source/nanobanan/palette.json", "utf8"),
      ),
    );
    expect(document.cell).toEqual({ width: 18, height: 18 });
    expect(Object.keys(document.ramps).sort()).toEqual(
      [
        "bone",
        "boneShadow",
        "ink",
        "joint",
        "muscle",
        "nerve",
        "sage",
        "teal",
      ].sort(),
    );
    expect(document.ramps.orange).toBeUndefined();
    expect(document.ramps.bone.base).toBe("#f2e8d5");
    expect(document.ramps.joint.base).toBe("#7bdff2");
  });
});
