import { describe, expect, it } from "vitest";
import {
  commonFrameDuration,
  flattenRgba,
  fpsFromDuration,
  parseHexColor,
  parseLudoSheet,
  scaleNearest,
  sliceSheet,
  type RgbaImage,
} from "../scripts/art/ludo-sheet";

function frame(
  x: number,
  y: number,
  w = 2,
  h = 2,
  duration = 43,
): Record<string, unknown> {
  return {
    frame: { x, y, w, h },
    rotated: false,
    trimmed: false,
    spriteSourceSize: { x: 0, y: 0, w, h },
    sourceSize: { w, h },
    duration,
  };
}

function sheetValue(
  frames: Record<string, unknown> = {
    frame_000: frame(0, 0),
    frame_001: frame(2, 0),
  },
): Record<string, unknown> {
  return {
    frames,
    meta: {
      app: "https://ludo.ai",
      image: "sheet.png",
      format: "RGBA8888",
      size: { w: 4, h: 2 },
      scale: "1",
    },
  };
}

function image(width: number, height: number, pixels: number[][]): RgbaImage {
  return {
    width,
    height,
    data: Buffer.from(pixels.flat()),
  };
}

describe("parseLudoSheet", () => {
  it("parses and sorts frames by key", () => {
    const sheet = parseLudoSheet(sheetValue());
    expect(sheet.meta.size).toEqual({ w: 4, h: 2 });
    expect(sheet.frames.map((entry) => entry.key)).toEqual([
      "frame_000",
      "frame_001",
    ]);
    expect(sheet.frames[0]?.rect).toEqual({ x: 0, y: 0, w: 2, h: 2 });
    expect(sheet.frames[0]?.duration).toBe(43);
  });

  it("rejects rotated or trimmed frames", () => {
    const rotated = sheetValue({
      frame_000: { ...frame(0, 0), rotated: true },
    });
    expect(() => parseLudoSheet(rotated)).toThrow(/rotated/);

    const trimmed = sheetValue({
      frame_000: { ...frame(0, 0), trimmed: true },
    });
    expect(() => parseLudoSheet(trimmed)).toThrow(/trimmed/);
  });

  it("rejects frames outside meta.size", () => {
    const value = sheetValue({ frame_000: frame(3, 0) });
    expect(() => parseLudoSheet(value)).toThrow(/outside meta.size/);
  });

  it("rejects a sourceSize that does not match the frame rect", () => {
    const value = sheetValue({
      frame_000: { ...frame(0, 0), sourceSize: { w: 1, h: 2 } },
    });
    expect(() => parseLudoSheet(value)).toThrow(/sourceSize/);
  });
});

describe("sliceSheet", () => {
  it("crops frames from the sheet", () => {
    const sheet = parseLudoSheet(sheetValue());
    const source = image(4, 2, [
      [255, 0, 0, 255],
      [255, 0, 0, 255],
      [0, 0, 255, 255],
      [0, 0, 255, 255],
      [255, 0, 0, 255],
      [255, 0, 0, 255],
      [0, 0, 255, 255],
      [0, 0, 255, 255],
    ]);
    const frames = sliceSheet(source, sheet);
    expect(frames).toHaveLength(2);
    expect(frames[0]?.image.width).toBe(2);
    expect(frames[0]?.image.height).toBe(2);
    expect([...frames[0]!.image.data.subarray(0, 4)]).toEqual([
      255, 0, 0, 255,
    ]);
    expect([...frames[1]!.image.data.subarray(0, 4)]).toEqual([
      0, 0, 255, 255,
    ]);
  });

  it("rejects an image that does not match meta.size", () => {
    const sheet = parseLudoSheet(sheetValue());
    const source = image(2, 2, [
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ]);
    expect(() => sliceSheet(source, sheet)).toThrow(/expected 4×2/);
  });
});

describe("pixel helpers", () => {
  it("flattens transparent pixels onto the background", () => {
    const source = image(1, 2, [
      [10, 20, 30, 0],
      [10, 20, 30, 255],
    ]);
    const flattened = flattenRgba(source, [1, 2, 3]);
    expect([...flattened.data.subarray(0, 4)]).toEqual([1, 2, 3, 255]);
    expect([...flattened.data.subarray(4, 8)]).toEqual([10, 20, 30, 255]);
  });

  it("scales with nearest-neighbour sampling", () => {
    const source = image(1, 1, [[7, 8, 9, 255]]);
    const scaled = scaleNearest(source, 2);
    expect(scaled.width).toBe(2);
    expect(scaled.height).toBe(2);
    expect([...scaled.data]).toEqual([
      7, 8, 9, 255, 7, 8, 9, 255, 7, 8, 9, 255, 7, 8, 9, 255,
    ]);
  });

  it("rejects a fractional or zero scale", () => {
    const source = image(1, 1, [[0, 0, 0, 0]]);
    expect(() => scaleNearest(source, 1.5)).toThrow(/positive integer/);
    expect(() => scaleNearest(source, 0)).toThrow(/positive integer/);
  });
});

describe("timing helpers", () => {
  it("reads a common frame duration", () => {
    const sheet = parseLudoSheet(sheetValue());
    expect(commonFrameDuration(sheet)).toBe(43);
  });

  it("returns undefined for mixed durations", () => {
    const sheet = parseLudoSheet(
      sheetValue({
        frame_000: frame(0, 0, 2, 2, 43),
        frame_001: frame(2, 0, 2, 2, 64),
      }),
    );
    expect(commonFrameDuration(sheet)).toBeUndefined();
  });

  it("converts a duration to fps", () => {
    expect(fpsFromDuration(43)).toBeCloseTo(23.2558, 3);
    expect(() => fpsFromDuration(0)).toThrow(/positive/);
  });
});

describe("parseHexColor", () => {
  it("parses #rrggbb", () => {
    expect(parseHexColor("#101a20")).toEqual([0x10, 0x1a, 0x20]);
    expect(parseHexColor("101A20")).toEqual([0x10, 0x1a, 0x20]);
  });

  it("rejects invalid colours", () => {
    expect(() => parseHexColor("#fff")).toThrow(/rrggbb/);
    expect(() => parseHexColor("teal")).toThrow(/rrggbb/);
  });
});
