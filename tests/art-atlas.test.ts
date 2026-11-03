import { describe, expect, it } from "vitest";
import {
  BLOB47_KEYS,
  EDGE_KEYS,
  buildAtlas,
  type BuildAtlasResult,
} from "../scripts/art-atlas";
import type { RgbaImage } from "../scripts/art/ludo-sheet";

const BASE: readonly [number, number, number] = [180, 180, 180];
const EDGE: readonly [number, number, number] = [20, 20, 20];
const FILL: readonly [number, number, number] = [120, 120, 120];

function swatch(): RgbaImage {
  const image: RgbaImage = {
    width: 32,
    height: 32,
    data: Buffer.alloc(32 * 32 * 4),
  };
  for (let y = 0; y < 32; y += 1) {
    for (let x = 0; x < 32; x += 1) {
      const index = (y * 32 + x) * 4;
      const value =
        (Math.floor(x / 2) + Math.floor(y / 2)) % 3 === 0 ? 160 : BASE[0];
      image.data[index] = value;
      image.data[index + 1] = value;
      image.data[index + 2] = value;
      image.data[index + 3] = 255;
    }
  }
  return image;
}

function pixel(image: RgbaImage, x: number, y: number): number[] {
  const index = (y * image.width + x) * 4;
  return [
    image.data[index] ?? 0,
    image.data[index + 1] ?? 0,
    image.data[index + 2] ?? 0,
    image.data[index + 3] ?? 0,
  ];
}

function build(rule: "edge" | "blob47"): BuildAtlasResult {
  return buildAtlas({
    source: swatch(),
    rule,
    edgeColor: EDGE,
    fillColor: FILL,
    seed: 7,
  });
}

describe("atlas assembler", () => {
  it("writes a 4x4 edge atlas with 16 named regions", () => {
    const result = build("edge");
    expect(result.layout.width).toBe(128);
    expect(result.layout.height).toBe(128);
    expect(result.layout.columns).toBe(4);
    expect(result.layout.rows).toBe(4);
    expect(Object.keys(result.regions)).toEqual(
      EDGE_KEYS.map((key) => `mask-${key}`),
    );
    expect(result.warnings).toEqual([]);

    for (const region of Object.values(result.regions)) {
      expect(region.width).toBe(32);
      expect(region.height).toBe(32);
      expect(pixel(result.image, region.x, region.y)[3]).toBe(255);
    }
  });

  it("occludes the absent edges for an isolated edge frame", () => {
    const result = build("edge");
    const isolated = result.regions["mask-0"];
    expect(isolated).toBeDefined();
    if (!isolated) return;
    expect(pixel(result.image, isolated.x, isolated.y)).toEqual([
      ...EDGE,
      255,
    ]);
    expect(pixel(result.image, isolated.x + 31, isolated.y + 31)).toEqual([
      ...EDGE,
      255,
    ]);
  });

  it("leaves the fully connected edge frame open", () => {
    const result = build("edge");
    const connected = result.regions["mask-15"];
    expect(connected).toBeDefined();
    if (!connected) return;
    expect(pixel(result.image, connected.x, connected.y)).not.toEqual([
      ...EDGE,
      255,
    ]);
    expect(
      pixel(result.image, connected.x + 31, connected.y + 31),
    ).not.toEqual([...EDGE, 255]);
  });

  it("writes an 8x6 blob47 atlas with 47 named regions and one filled empty cell", () => {
    const result = build("blob47");
    expect(result.layout.width).toBe(256);
    expect(result.layout.height).toBe(192);
    expect(result.layout.columns).toBe(8);
    expect(result.layout.rows).toBe(6);
    expect(Object.keys(result.regions)).toEqual(
      BLOB47_KEYS.map((key) => `mask-${key}`),
    );
    expect(Object.keys(result.regions)).toHaveLength(47);
    expect(result.regions["mask-255"]).toEqual({
      x: 192,
      y: 160,
      width: 32,
      height: 32,
    });

    // The unused cell at row 5, column 7 is opaque fill, not transparent.
    for (let y = 160; y < 192; y += 1) {
      for (let x = 224; x < 256; x += 1) {
        expect(pixel(result.image, x, y)).toEqual([...FILL, 255]);
      }
    }
  });
});
