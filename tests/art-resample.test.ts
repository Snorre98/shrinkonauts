import { describe, expect, it } from "vitest";
import { resizeBox } from "../scripts/art/resample";
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

describe("resizeBox", () => {
  it("averages opaque source pixels", () => {
    const source = image(2, 2, [
      [0, 0, 0, 255], [100, 100, 100, 255],
      [200, 200, 200, 255], [255, 255, 255, 255],
    ]);
    const result = resizeBox(source, 1, 1);
    expect(pixel(result, 0, 0)).toEqual([139, 139, 139, 255]);
  });

  it("uses premultiplied alpha at transparent edges", () => {
    const source = image(2, 1, [
      [255, 0, 0, 255],
      [0, 0, 0, 0],
    ]);
    const result = resizeBox(source, 1, 1);
    // Average alpha is 0.5; RGB stays red rather than fading to black.
    expect(pixel(result, 0, 0)).toEqual([255, 0, 0, 128]);
  });

  it("returns a copy for identical dimensions", () => {
    const source = image(1, 1, [[1, 2, 3, 255]]);
    const result = resizeBox(source, 1, 1);
    expect(result).not.toBe(source);
    expect(pixel(result, 0, 0)).toEqual([1, 2, 3, 255]);
  });
});
