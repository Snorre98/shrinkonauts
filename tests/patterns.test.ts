import { describe, expect, it } from "vitest";
import {
  bitmapToSvgDataUrl,
  createPatternProvider,
  generatePatternBitmap,
  sampleBitmap,
  type PatternDefinition,
} from "../src/materials";

const GENERATORS = ["fbm", "fibers", "cellular", "circuit", "grain"] as const;

function definition(
  generator: (typeof GENERATORS)[number],
  seed = 7,
): PatternDefinition {
  return {
    id: `pattern-${generator}`,
    family: "organic",
    source: { kind: "procedural", generator, seed },
    space: "world",
    scale: 1,
    contrast: 0.4,
  };
}

describe("procedural patterns", () => {
  it("generates deterministic RGBA bitmaps for every closed generator", () => {
    for (const generator of GENERATORS) {
      const first = generatePatternBitmap({
        kind: "procedural",
        generator,
        seed: 11,
      });
      const second = generatePatternBitmap({
        kind: "procedural",
        generator,
        seed: 11,
      });
      expect(first.width).toBe(32);
      expect(first.height).toBe(32);
      expect(first.data.length).toBe(32 * 32 * 4);
      expect(Array.from(first.data)).toEqual(Array.from(second.data));
      expect(first.data.some((value) => value > 0)).toBe(true);
    }
  });

  it("changes output when the seed changes", () => {
    const first = generatePatternBitmap({
      kind: "procedural",
      generator: "fibers",
      seed: 1,
    });
    const second = generatePatternBitmap({
      kind: "procedural",
      generator: "fibers",
      seed: 2,
    });
    expect(Array.from(first.data)).not.toEqual(Array.from(second.data));
  });

  it("wraps sampling coordinates for tileable output", () => {
    const bitmap = generatePatternBitmap({
      kind: "procedural",
      generator: "cellular",
      seed: 4,
    });
    expect(sampleBitmap(bitmap, 0, 0)).toBe(sampleBitmap(bitmap, 32, 32));
    expect(sampleBitmap(bitmap, -1, 5)).toBe(sampleBitmap(bitmap, 31, 5));
  });

  it("serializes to a compact CSS data URL", () => {
    const bitmap = generatePatternBitmap({
      kind: "procedural",
      generator: "grain",
      seed: 2,
    });
    const url = bitmapToSvgDataUrl(bitmap);
    expect(url.startsWith("data:image/svg+xml,")).toBe(true);
    expect(url.length).toBeGreaterThan(100);
  });
});

describe("pattern provider", () => {
  const assets = {
    resolveById(id: string) {
      if (id === "tile.atlas") {
        return {
          id,
          type: "atlas",
          width: 64,
          height: 32,
          regions: {
            cell: { x: 32, y: 0, width: 32, height: 32 },
          },
        };
      }
      if (id === "bg.pattern") {
        return { id, type: "image", width: 128, height: 64, src: "bg.svg" };
      }
      return null;
    },
  };

  it("caches procedural resources by the placement key", () => {
    const provider = createPatternProvider({ assets });
    const def = definition("cellular");
    const first = provider.resolve(def);
    const second = provider.resolve(def);
    expect(first.ok).toBe(true);
    expect(second.ok).toBe(true);
    if (!first.ok || !second.ok) return;
    expect(first.value).toBe(second.value);
    expect(first.value.kind).toBe("procedural");
    expect(first.value.textureKey).toContain("pattern:");
    expect(first.value.cssBackground).toContain("data:image/svg+xml");
  });

  it("resolves image and atlas sources", () => {
    const provider = createPatternProvider({ assets });
    const image = provider.resolve({
      id: "image",
      family: "organic",
      source: { kind: "image", assetId: "bg.pattern" },
      space: "world",
      scale: 0.5,
    });
    expect(image.ok).toBe(true);
    if (image.ok) {
      expect(image.value.kind).toBe("image");
      expect(image.value.cssBackground).toContain("bg.svg");
      expect(image.value.tileSize).toEqual({ width: 64, height: 32 });
    }

    const atlas = provider.resolve({
      id: "atlas",
      family: "mineral",
      source: { kind: "atlas", assetId: "tile.atlas", frame: "cell" },
      space: "world",
      scale: 1,
    });
    expect(atlas.ok).toBe(true);
    if (atlas.ok) {
      expect(atlas.value.kind).toBe("atlas");
      expect(atlas.value.cssPosition).toBe("-32px -0px");
      expect(atlas.value.tileSize).toEqual({ width: 32, height: 32 });
    }
  });

  it("reports missing assets and invalid scales", () => {
    const provider = createPatternProvider({ assets });
    const missing = provider.resolve({
      id: "missing",
      family: "organic",
      source: { kind: "image", assetId: "bg.missing" },
      space: "world",
      scale: 1,
    });
    expect(missing.ok).toBe(false);
    expect(provider.resolve(definition("grain"), { scale: 0 }).ok).toBe(false);
  });
});
