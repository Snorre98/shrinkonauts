import { describe, expect, it } from "vitest";
import {
  BLOB47_KEYS,
  EDGE_KEYS,
  atlasWindows,
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

function build(
  rule: "edge" | "blob47",
  options: {
    weldEdges?: boolean;
    source?: RgbaImage;
    selection?: "hash" | "tileable" | "single";
  } = {},
): BuildAtlasResult {
  const { source, weldEdges, selection } = options;
  return buildAtlas({
    source: source ?? swatch(),
    rule,
    edgeColor: EDGE,
    fillColor: FILL,
    seed: 7,
    ...(weldEdges ? { weldEdges } : {}),
    ...(selection ? { selection } : {}),
  });
}

function weldSwatch(size = 32): RgbaImage {
  const image: RgbaImage = {
    width: size,
    height: size,
    data: Buffer.alloc(size * size * 4),
  };
  for (let y = 0; y < size; y += 2) {
    for (let x = 0; x < size; x += 2) {
      const value = 40 + ((x / 2) * 37 + (y / 2) * 11) % 200;
      for (let dy = 0; dy < 2; dy += 1) {
        for (let dx = 0; dx < 2; dx += 1) {
          const index = ((y + dy) * size + (x + dx)) * 4;
          image.data[index] = value;
          image.data[index + 1] = value;
          image.data[index + 2] = value;
          image.data[index + 3] = 255;
        }
      }
    }
  }
  return image;
}

function oppositeEdgeMismatch(
  result: BuildAtlasResult,
  key: string,
): { leftRight: number; topBottom: number } {
  const region = result.regions[key];
  if (!region) throw new Error(`Missing region ${key}`);
  let leftRight = 0;
  let topBottom = 0;
  for (let offset = 0; offset < region.height; offset += 1) {
    const left = pixel(result.image, region.x, region.y + offset);
    const right = pixel(
      result.image,
      region.x + region.width - 1,
      region.y + offset,
    );
    if (left.some((value, index) => value !== right[index])) leftRight += 1;
  }
  for (let offset = 0; offset < region.width; offset += 1) {
    const top = pixel(result.image, region.x + offset, region.y);
    const bottom = pixel(
      result.image,
      region.x + offset,
      region.y + region.height - 1,
    );
    if (top.some((value, index) => value !== bottom[index])) topBottom += 1;
  }
  return { leftRight, topBottom };
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

  it("welds the fully connected frame so it repeats without a seam", () => {
    const unwelded = build("edge", { source: weldSwatch() });
    const welded = build("edge", { source: weldSwatch(), weldEdges: true });
    expect(oppositeEdgeMismatch(unwelded, "mask-15")).not.toEqual({
      leftRight: 0,
      topBottom: 0,
    });
    expect(oppositeEdgeMismatch(welded, "mask-15")).toEqual({
      leftRight: 0,
      topBottom: 0,
    });
  });

  it("keeps the weld flag in the report contract", () => {
    const result = build("edge", { weldEdges: true });
    expect(result.weldEdges).toBe(true);
  });

  it("scores windows and reports the tileable selection", () => {
    const candidates = atlasWindows(weldSwatch(96));
    expect(candidates.length).toBeGreaterThan(1);
    expect(candidates[0]?.score).toBeLessThanOrEqual(
      candidates[candidates.length - 1]?.score ?? 0,
    );

    const result = build("edge", {
      source: weldSwatch(96),
      selection: "tileable",
      weldEdges: true,
    });
    expect(result.selection).toBe("tileable");
    expect(result.windows["mask-15"]).toBeDefined();
    expect(result.windows["mask-15"]?.colours).toBeGreaterThanOrEqual(4);
    expect(oppositeEdgeMismatch(result, "mask-15")).toEqual({
      leftRight: 0,
      topBottom: 0,
    });
  });

  it("reuses one window for every frame in single mode", () => {
    const result = build("edge", {
      source: weldSwatch(96),
      selection: "single",
      weldEdges: true,
    });
    expect(result.selection).toBe("single");
    const windows = Object.values(result.windows);
    expect(windows).toHaveLength(EDGE_KEYS.length);
    const [first] = windows;
    expect(first).toBeDefined();
    if (!first) return;
    for (const window of windows) {
      expect(window.x).toBe(first.x);
      expect(window.y).toBe(first.y);
    }
    expect(oppositeEdgeMismatch(result, "mask-15")).toEqual({
      leftRight: 0,
      topBottom: 0,
    });
    expect(
      result.warnings.some((warning) => warning.includes("single")),
    ).toBe(true);
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
