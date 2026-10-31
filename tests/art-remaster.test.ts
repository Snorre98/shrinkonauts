import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import type { RgbaImage } from "../scripts/art/ludo-sheet";
import type { PaletteDocument } from "../scripts/art/palette";
import {
  classifyColor,
  fillHoles,
  parseRemasterProfile,
  remasterImage,
  type RemasterProfile,
} from "../scripts/art/remaster";

function palette(cellWidth: number, cellHeight: number): PaletteDocument {
  return {
    schemaVersion: 1,
    character: "test",
    cell: { width: cellWidth, height: cellHeight },
    ramps: {
      bone: { shadow: "#c9b79a", base: "#f2e8d5", highlight: "#fff8e8" },
      boneShadow: { shadow: "#5f736e", base: "#7a8f8a", highlight: "#9db4ad" },
      nerve: { shadow: "#b8862b", base: "#ffd166", highlight: "#fff3b0" },
      joint: { shadow: "#3f9fb5", base: "#7bdff2", highlight: "#c9f7ff" },
      muscle: { shadow: "#a82a4a", base: "#ef476f", highlight: "#ff9fb2" },
      orange: { shadow: "#813115", base: "#e59b34", highlight: "#ffd28a" },
      teal: { shadow: "#05090b", base: "#101a20", highlight: "#1d2f38" },
      ink: { shadow: "#000000", base: "#05090b", highlight: "#2a3f47" },
    },
    roles: {
      suit: "bone",
      visor: "nerve",
      tanks: "nerve",
      joints: "teal",
      accent: "joint",
      outline: "ink",
      grime: "boneShadow",
    },
    variants: {
      p2: {
        suit: "orange",
        visor: "bone",
        tanks: "bone",
        accent: "muscle",
      },
    },
  };
}

function profile(
  cellWidth: number,
  cellHeight: number,
  overrides: RemasterProfile["overrides"] = [],
): RemasterProfile {
  return parseRemasterProfile({
    schemaVersion: 1,
    frame: 0,
    cell: { width: cellWidth, height: cellHeight },
    classes: [
      {
        name: "outline",
        role: "outline",
        match: { valueMax: 0.12 },
      },
      {
        name: "visor",
        role: "visor",
        match: {
          hueMin: 10,
          hueMax: 55,
          satMin: 0.35,
          valueMin: 0.25,
        },
        fillHoles: true,
      },
      {
        name: "accent",
        role: "accent",
        match: {
          hueMin: 150,
          hueMax: 210,
          satMin: 0.2,
          valueMin: 0.7,
        },
      },
      {
        name: "joint",
        role: "joints",
        match: {
          hueMin: 150,
          hueMax: 210,
          satMin: 0.2,
          valueMax: 0.7,
        },
      },
      {
        name: "grime",
        role: "grime",
        match: { satMax: 0.25, valueMin: 0.25, valueMax: 0.78 },
      },
      { name: "suit", role: "suit", default: true },
    ],
    outlineBoundary: true,
    outlineStep: "shadow",
    shadingQuantiles: [0.33, 0.66],
    lowConfidence: 0.55,
    overrides,
  });
}

function image(
  width: number,
  height: number,
  color: (x: number, y: number) => [number, number, number, number],
): RgbaImage {
  const data = Buffer.alloc(width * height * 4);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const [red, green, blue, alpha] = color(x, y);
      const index = (y * width + x) * 4;
      data[index] = red;
      data[index + 1] = green;
      data[index + 2] = blue;
      data[index + 3] = alpha;
    }
  }
  return { width, height, data };
}

function pixel(imageValue: RgbaImage, x: number, y: number): number[] {
  const index = (y * imageValue.width + x) * 4;
  return [...imageValue.data.subarray(index, index + 4)];
}

const CREAM: [number, number, number, number] = [238, 236, 225, 255];
const BLACK: [number, number, number, number] = [0, 0, 0, 255];
const ORANGE: [number, number, number, number] = [229, 155, 52, 255];

describe("parseRemasterProfile", () => {
  it("parses the default and shading quantiles", () => {
    const parsed = profile(7, 7);
    expect(parsed.classes).toHaveLength(6);
    expect(parsed.shadingQuantiles).toEqual([0.33, 0.66]);
  });

  it("parses the shipped remaster profile", () => {
    const parsed = parseRemasterProfile(
      JSON.parse(
        readFileSync(
          "art-source/characters/player-p1/working/remaster.json",
          "utf8",
        ),
      ),
    );
    expect(parsed.cell).toEqual({ width: 14, height: 22 });
    expect(parsed.classes.map((entry) => entry.name)).toEqual([
      "outline",
      "visor",
      "accent",
      "joint",
      "grime",
      "suit",
    ]);
    expect(parsed.outlineBoundary).toBe(true);
  });

  it("requires exactly one default class", () => {
    const value = {
      schemaVersion: 1,
      cell: { width: 7, height: 7 },
      classes: [{ name: "suit", role: "suit" }],
    };
    expect(() => parseRemasterProfile(value)).toThrow(/exactly one default/);
  });

  it("rejects an override for an unknown class", () => {
    expect(() => profile(7, 7, [{ class: "hat", rect: [0, 0, 1, 1] }])).toThrow(
      /unknown class/,
    );
  });

  it("rejects invalid shading quantiles", () => {
    const value = {
      schemaVersion: 1,
      cell: { width: 7, height: 7 },
      classes: [
        { name: "outline", role: "outline", match: { valueMax: 0.1 } },
        { name: "suit", role: "suit", default: true },
      ],
      shadingQuantiles: [0.6, 0.4],
    };
    expect(() => parseRemasterProfile(value)).toThrow(/shadingQuantiles/);
  });
});

describe("classifyColor", () => {
  const parsed = profile(7, 7);

  it("separates the six semantic classes", () => {
    expect(classifyColor(0, 0, 0, parsed)).toBe(0); // outline
    expect(classifyColor(229, 155, 52, parsed)).toBe(1); // visor
    expect(classifyColor(123, 223, 242, parsed)).toBe(2); // accent
    expect(classifyColor(50, 118, 120, parsed)).toBe(3); // joint
    expect(classifyColor(152, 186, 177, parsed)).toBe(4); // grime
    expect(classifyColor(238, 236, 225, parsed)).toBe(5); // suit
  });
});

describe("fillHoles", () => {
  it("fills an enclosed hole but not the exterior", () => {
    const width = 7;
    const height = 7;
    const mask = new Uint8Array(width * height);
    for (let y = 2; y <= 4; y += 1) {
      for (let x = 2; x <= 4; x += 1) {
        mask[y * width + x] = 1;
      }
    }
    mask[3 * width + 3] = 0;
    fillHoles(mask, width, height);
    expect(mask[3 * width + 3]).toBe(1);
    expect(mask[0]).toBe(0);
  });
});

describe("remasterImage", () => {
  it("samples, outlines, and quantises a simple frame", () => {
    const source = image(7, 7, (x, y) => {
      if (x === 0 || y === 0 || x === 6 || y === 6) return BLACK;
      if (x === 3 && y === 3) return ORANGE;
      return CREAM;
    });
    const result = remasterImage(source, palette(7, 7), profile(7, 7));

    expect(result.image.width).toBe(7);
    expect(result.image.height).toBe(7);
    expect(pixel(result.image, 0, 0)).toEqual([0, 0, 0, 255]);
    expect(pixel(result.image, 2, 2)).toEqual([242, 232, 213, 255]);
    expect(pixel(result.image, 3, 3)).toEqual([255, 209, 102, 255]);
    expect(result.paletteValidation.offPalettePixels).toBe(0);
    expect(result.paletteValidation.alphaViolations).toBe(0);
    expect(result.stats.forcedOutlineCells).toBeGreaterThan(0);
  });

  it("fills an enclosed visor highlight before sampling", () => {
    const source = image(7, 7, (x, y) => {
      if (x >= 2 && x <= 4 && y >= 2 && y <= 4) {
        return x === 3 && y === 3 ? CREAM : ORANGE;
      }
      return CREAM;
    });
    const result = remasterImage(
      source,
      palette(7, 7),
      { ...profile(7, 7), outlineBoundary: false },
    );
    expect(result.classNames[result.classMap[3 * 7 + 3] ?? 255]).toBe("visor");
    expect(pixel(result.image, 3, 3)).toEqual([255, 209, 102, 255]);
  });

  it("applies a cell override", () => {
    const source = image(7, 7, () => CREAM);
    const result = remasterImage(
      source,
      palette(7, 7),
      {
        ...profile(7, 7, [{ class: "visor", rect: [3, 3, 1, 1] }]),
        outlineBoundary: false,
      },
    );
    expect(result.classNames[result.classMap[3 * 7 + 3] ?? 255]).toBe("visor");
    expect(pixel(result.image, 3, 3)).toEqual([255, 209, 102, 255]);
    expect(result.stats.overriddenCells).toBe(1);
  });

  it("rejects a palette cell mismatch", () => {
    const source = image(7, 7, () => CREAM);
    expect(() => remasterImage(source, palette(14, 22), profile(7, 7))).toThrow(
      /does not match/,
    );
  });
});
