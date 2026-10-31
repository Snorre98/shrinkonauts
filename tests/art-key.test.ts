import { describe, expect, it } from "vitest";
import {
  alphaBounds,
  chromaDistance,
  keyChroma,
  parseChromaKeyOptions,
  resizeNearest,
  trimAlpha,
} from "../scripts/art/key";
import type { RgbaImage } from "../scripts/art/ludo-sheet";

function image(
  width: number,
  height: number,
  pixels: number[][],
): RgbaImage {
  return { width, height, data: Buffer.from(pixels.flat()) };
}

function pixel(value: RgbaImage, x: number, y: number): number[] {
  const index = (y * value.width + x) * 4;
  return [...value.data.subarray(index, index + 4)];
}

describe("parseChromaKeyOptions", () => {
  it("uses the magenta defaults and validates ranges", () => {
    const options = parseChromaKeyOptions();
    expect(options.key).toEqual([255, 0, 255]);
    expect(options.tolerance).toBe(0.18);
    expect(options.despill).toBe(true);
    expect(() => parseChromaKeyOptions({ tolerance: 2 })).toThrow(/0\.\.1/);
    expect(() => parseChromaKeyOptions({ softness: -1 })).toThrow(/0\.\.1/);
  });
});

describe("chromaDistance", () => {
  it("returns zero for the key colour and one for the far corner", () => {
    expect(chromaDistance(255, 0, 255, [255, 0, 255])).toBe(0);
    expect(chromaDistance(0, 255, 0, [255, 0, 255])).toBeCloseTo(
      Math.sqrt(3 * 255 * 255) / Math.sqrt(3 * 255 * 255),
    );
  });
});

describe("keyChroma", () => {
  it("removes magenta, keeps cyan, and reports counts", () => {
    const source = image(3, 1, [
      [255, 0, 255, 255],
      [0, 255, 255, 255],
      [255, 0, 255, 128],
    ]);
    const result = keyChroma(source, parseChromaKeyOptions());
    expect(pixel(result.image, 0, 0)).toEqual([0, 0, 0, 0]);
    expect(pixel(result.image, 1, 0)).toEqual([0, 255, 255, 255]);
    expect(pixel(result.image, 2, 0)).toEqual([0, 0, 0, 0]);
    expect(result.stats.keyedPixels).toBe(2);
    expect(result.stats.keptPixels).toBe(1);
  });

  it("despills a magenta-tinted edge pixel", () => {
    const source = image(1, 1, [[200, 100, 180, 255]]);
    const result = keyChroma(
      source,
      parseChromaKeyOptions({ tolerance: 0.1, softness: 0, despill: true }),
    );
    expect(pixel(result.image, 0, 0)).toEqual([120, 100, 100, 255]);
    expect(result.stats.despilledPixels).toBe(1);
  });

  it("keeps the edge colour when despill is disabled", () => {
    const source = image(1, 1, [[200, 100, 180, 255]]);
    const result = keyChroma(
      source,
      parseChromaKeyOptions({ tolerance: 0.1, softness: 0, despill: false }),
    );
    expect(pixel(result.image, 0, 0)).toEqual([200, 100, 180, 255]);
    expect(result.stats.despilledPixels).toBe(0);
  });

  it("uses the softness band to place the hard alpha threshold", () => {
    // 0.5 distance from magenta; tolerance 0.1 + softness 0.8 puts it in the band.
    const source = image(1, 1, [[128, 128, 255, 255]]);
    const kept = keyChroma(
      source,
      parseChromaKeyOptions({
        tolerance: 0.1,
        softness: 0.8,
        alphaThreshold: 0.25,
      }),
    );
    const keyed = keyChroma(
      source,
      parseChromaKeyOptions({
        tolerance: 0.1,
        softness: 0.8,
        alphaThreshold: 0.75,
      }),
    );
    expect(pixel(kept.image, 0, 0)[3]).toBe(255);
    expect(pixel(keyed.image, 0, 0)[3]).toBe(0);
  });
});

describe("trimAlpha", () => {
  it("crops to the alpha bounding box", () => {
    const source = image(3, 3, [
      [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0],
      [0, 0, 0, 0], [10, 20, 30, 255], [0, 0, 0, 0],
      [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0],
    ]);
    expect(alphaBounds(source)).toEqual({ x: 1, y: 1, width: 1, height: 1 });
    const trimmed = trimAlpha(source);
    expect(trimmed?.image.width).toBe(1);
    expect(trimmed?.image.height).toBe(1);
    expect(pixel(trimmed!.image, 0, 0)).toEqual([10, 20, 30, 255]);
  });

  it("returns null for a fully transparent image", () => {
    const source = image(1, 1, [[0, 0, 0, 0]]);
    expect(trimAlpha(source)).toBeNull();
  });
});

describe("resizeNearest", () => {
  it("uses nearest-neighbour sampling", () => {
    const source = image(2, 2, [
      [1, 1, 1, 255], [2, 2, 2, 255],
      [3, 3, 3, 255], [4, 4, 4, 255],
    ]);
    const resized = resizeNearest(source, 4, 4);
    expect(pixel(resized, 0, 0)).toEqual([1, 1, 1, 255]);
    expect(pixel(resized, 3, 0)).toEqual([2, 2, 2, 255]);
    expect(pixel(resized, 0, 3)).toEqual([3, 3, 3, 255]);
    expect(pixel(resized, 3, 3)).toEqual([4, 4, 4, 255]);
  });
});
