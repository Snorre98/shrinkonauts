import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import type { RgbaImage } from "../scripts/art/ludo-sheet";
import {
  applyPaletteVariant,
  buildPaletteLut,
  parsePaletteDocument,
  quantizeImage,
  validatePaletteImage,
  type PaletteDocument,
} from "../scripts/art/palette";

function image(width: number, height: number, pixels: number[][]): RgbaImage {
  return {
    width,
    height,
    data: Buffer.from(pixels.flat()),
  };
}

function pixel(imageValue: RgbaImage, x: number, y: number): number[] {
  const index = (y * imageValue.width + x) * 4;
  return [...imageValue.data.subarray(index, index + 4)];
}

function paletteValue(cellWidth = 2): Record<string, unknown> {
  return {
    schemaVersion: 1,
    character: "player-p1",
    cell: { width: cellWidth, height: 1 },
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

function palette(cellWidth = 2): PaletteDocument {
  return parsePaletteDocument(paletteValue(cellWidth));
}

describe("parsePaletteDocument", () => {
  it("parses roles and variants", () => {
    const doc = palette();
    expect(doc.character).toBe("player-p1");
    expect(doc.cell).toEqual({ width: 2, height: 1 });
    expect(doc.roles.suit).toBe("bone");
    expect(doc.variants.p2?.visor).toBe("bone");
  });

  it("rejects unknown ramps and roles", () => {
    const unknownRamp = paletteValue();
    (unknownRamp.roles as Record<string, unknown>).suit = "missing";
    expect(() => parsePaletteDocument(unknownRamp)).toThrow(/unknown ramp/);

    const unknownRole = paletteValue();
    (unknownRole.variants as Record<string, Record<string, unknown>>).p2 =
      { hat: "bone" };
    expect(() => parsePaletteDocument(unknownRole)).toThrow(/unknown role/);
  });

  it("parses the shipped player palette and defines the P2 swap", () => {
    const document = parsePaletteDocument(
      JSON.parse(
        readFileSync(
          "art-source/characters/player-p1/working/palette.json",
          "utf8",
        ),
      ),
    );
    expect(document.cell).toEqual({ width: 14, height: 22 });
    expect(document.ramps.orange).toEqual({
      shadow: "#813115",
      base: "#e59b34",
      highlight: "#ffd28a",
    });
    expect(buildPaletteLut(document, "p2")).toEqual(
      expect.arrayContaining([
        { source: "#f2e8d5", target: "#e59b34", roles: ["suit"] },
        { source: "#ffd166", target: "#f2e8d5", roles: ["tanks", "visor"] },
        { source: "#7bdff2", target: "#ef476f", roles: ["accent"] },
      ]),
    );
  });
});

describe("buildPaletteLut", () => {
  it("maps the P2 role ramps in one pass", () => {
    const lut = buildPaletteLut(palette(), "p2");
    expect(lut).toEqual(
      expect.arrayContaining([
        { source: "#f2e8d5", target: "#e59b34", roles: ["suit"] },
        { source: "#ffd166", target: "#f2e8d5", roles: ["tanks", "visor"] },
        { source: "#7bdff2", target: "#ef476f", roles: ["accent"] },
        { source: "#101a20", target: "#101a20", roles: ["joints"] },
      ]),
    );
  });

  it("rejects a source colour with two different targets", () => {
    const value = paletteValue();
    (value.variants as Record<string, Record<string, string>>).p2 = {
      suit: "orange",
      visor: "bone",
      tanks: "muscle",
      accent: "muscle",
    };
    expect(() => buildPaletteLut(parsePaletteDocument(value), "p2")).toThrow(
      /AMBIGUOUS/,
    );
  });
});

describe("applyPaletteVariant", () => {
  it("changes only the mapped roles and does not cascade", () => {
    const source = image(5, 1, [
      [242, 232, 213, 255], // bone base -> orange base
      [255, 209, 102, 255], // nerve base -> bone base, not orange
      [123, 223, 242, 255], // joint base -> muscle base
      [16, 26, 32, 255], // teal base -> unchanged
      [0, 0, 0, 0], // transparent
    ]);
    const result = applyPaletteVariant(source, palette(5), "p2");

    expect(pixel(result.image, 0, 0)).toEqual([229, 155, 52, 255]);
    expect(pixel(result.image, 1, 0)).toEqual([242, 232, 213, 255]);
    expect(pixel(result.image, 2, 0)).toEqual([239, 71, 111, 255]);
    expect(pixel(result.image, 3, 0)).toEqual([16, 26, 32, 255]);
    expect(pixel(result.image, 4, 0)).toEqual([0, 0, 0, 0]);
    expect(result.changedPixels).toBe(3);
    expect(result.unmappedOpaquePixels).toBe(0);
    expect(result.alphaViolations).toBe(0);
  });

  it("reports alpha and unmapped pixels", () => {
    const source = image(2, 1, [
      [1, 2, 3, 128],
      [1, 2, 3, 255],
    ]);
    const result = applyPaletteVariant(source, palette(), undefined);
    expect(result.alphaViolations).toBe(1);
    expect(result.unmappedOpaquePixels).toBe(2);
    expect(result.changedPixels).toBe(0);
  });

  it("rejects a master with the wrong cell size", () => {
    const source = image(1, 1, [[242, 232, 213, 255]]);
    expect(() => applyPaletteVariant(source, palette(), "p2")).toThrow(/expected/);
  });
});

describe("validatePaletteImage", () => {
  it("counts off-palette and semi-transparent pixels", () => {
    const source = image(2, 1, [
      [242, 232, 213, 255],
      [1, 2, 3, 128],
    ]);
    const result = validatePaletteImage(source, palette());
    expect(result.offPalettePixels).toBe(1);
    expect(result.alphaViolations).toBe(1);
    expect(result.opaquePixels).toBe(2);
  });
});

describe("quantizeImage", () => {
  it("snaps near colours to the approved ramps", () => {
    const source = image(2, 1, [
      [240, 230, 212, 255],
      [1, 2, 3, 255],
    ]);
    const result = quantizeImage(
      source,
      palette(),
      ["bone", "ink"],
    );
    expect(pixel(result.image, 0, 0)).toEqual([242, 232, 213, 255]);
    expect(result.changedPixels).toBe(2);
    expect(result.offPalettePixels).toBe(2);
    expect(result.maxDistance).toBeGreaterThan(0);
    expect(result.alphaViolations).toBe(0);
  });
});
