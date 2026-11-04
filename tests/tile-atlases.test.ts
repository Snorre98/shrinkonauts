import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { PNG } from "pngjs";
import { describe, expect, it } from "vitest";
import { parseManifest } from "../src/assets";
import { createAssets } from "../src/assets/assets";
import { silentLogger } from "../src/core/logger";
import { parseMaterials } from "../src/pack";
import {
  parsePaletteDocument,
  validatePaletteImage,
} from "../scripts/art/palette";
import type { RgbaImage } from "../scripts/art/ludo-sheet";

const PACK_DIR = "public/packs/anatomy-reflex";
const LICENSE = "Nano Banana / Google Gemini (plan TBD)";

interface ManifestEntry {
  type: string;
  src?: string;
  placeholder?: boolean;
  license?: string;
  width?: number;
  height?: number;
  regions?: Record<string, { x: number; y: number; width: number; height: number }>;
}

const manifest = JSON.parse(
  readFileSync(join(PACK_DIR, "assets.final.json"), "utf8"),
) as { assets: Record<string, ManifestEntry> };

const licences = JSON.parse(
  readFileSync(join(PACK_DIR, "licenses.json"), "utf8"),
) as {
  assets: Array<{ file: string; license: string }>;
};

const materials = JSON.parse(
  readFileSync(join(PACK_DIR, "materials.json"), "utf8"),
) as {
  variantSets: Record<
    string,
    {
      atlas?: string;
      frames: Record<
        string,
        { kind: string; assetId: string; frame: string }
      >;
    }
  >;
};

const palette = parsePaletteDocument(
  JSON.parse(readFileSync("art-source/nanobanan/palette.json", "utf8")),
);

const atlasSpecs = [
  {
    id: "tile.bone.atlas",
    file: "shared/tiles/bone-atlas.png",
    width: 256,
    height: 192,
    regions: 47,
    variantSet: "bone-blob47",
  },
  {
    id: "tile.nerve.atlas",
    file: "shared/tiles/nerve-atlas.png",
    width: 128,
    height: 128,
    regions: 16,
    variantSet: "nerve-edge",
  },
  {
    id: "tile.muscle.atlas",
    file: "shared/tiles/muscle-atlas.png",
    width: 128,
    height: 128,
    regions: 16,
    variantSet: "muscle-edge",
  },
  {
    id: "tile.membrane.atlas",
    file: "shared/tiles/membrane-atlas.png",
    width: 128,
    height: 128,
    regions: 16,
    variantSet: "membrane-edge",
  },
] as const;

function decode(path: string): RgbaImage {
  const png = PNG.sync.read(readFileSync(path));
  return { width: png.width, height: png.height, data: Buffer.from(png.data) };
}

function pixel(image: RgbaImage, x: number, y: number): number[] {
  const index = (y * image.width + x) * 4;
  return [...image.data.subarray(index, index + 4)];
}

function cropFrame(
  atlas: RgbaImage,
  region: { x: number; y: number; width: number; height: number },
): RgbaImage {
  const data = Buffer.alloc(region.width * region.height * 4);
  for (let y = 0; y < region.height; y += 1) {
    const source = ((region.y + y) * atlas.width + region.x) * 4;
    atlas.data.copy(data, y * region.width * 4, source, source + region.width * 4);
  }
  return { width: region.width, height: region.height, data };
}

function non2x2Pixels(image: RgbaImage): number {
  let violations = 0;
  for (let y = 0; y < image.height; y += 1) {
    for (let x = 0; x < image.width; x += 1) {
      let matches = false;
      for (let oy = -1; oy <= 0 && !matches; oy += 1) {
        for (let ox = -1; ox <= 0 && !matches; ox += 1) {
          const bx = x + ox;
          const by = y + oy;
          if (bx < 0 || by < 0 || bx + 1 >= image.width || by + 1 >= image.height) {
            continue;
          }
          const first = pixel(image, bx, by);
          matches = [0, 1].every((dy) =>
            [0, 1].every((dx) => {
              const other = pixel(image, bx + dx, by + dy);
              return first.every((value, index) => value === other[index]);
            }),
          );
        }
      }
      if (!matches) violations += 1;
    }
  }
  return violations;
}

function connectedEdgeMismatch(
  frame: RgbaImage,
  mask: number,
  rule: "edge" | "blob47",
): { leftRight: number; topBottom: number } {
  const bits =
    rule === "blob47"
      ? { north: 1, east: 4, south: 16, west: 64 }
      : { north: 1, east: 2, south: 4, west: 8 };
  const north = (mask & bits.north) !== 0;
  const east = (mask & bits.east) !== 0;
  const south = (mask & bits.south) !== 0;
  const west = (mask & bits.west) !== 0;
  let leftRight = 0;
  let topBottom = 0;

  if (east && west) {
    for (let y = 0; y < frame.height; y += 1) {
      const left = pixel(frame, 0, y);
      const right = pixel(frame, frame.width - 1, y);
      if (left.some((value, index) => value !== right[index])) leftRight += 1;
    }
  }
  if (north && south) {
    for (let x = 0; x < frame.width; x += 1) {
      const top = pixel(frame, x, 0);
      const bottom = pixel(frame, x, frame.height - 1);
      if (top.some((value, index) => value !== bottom[index])) topBottom += 1;
    }
  }
  return { leftRight, topBottom };
}

describe("tile atlas wiring", () => {
  for (const spec of atlasSpecs) {
    it(`${spec.id} is a valid ${spec.width}x${spec.height} atlas`, () => {
      const entry = manifest.assets[spec.id];
      expect(entry).toBeDefined();
      if (!entry) return;
      expect(entry.type).toBe("atlas");
      expect(entry.src).toBe(spec.file);
      expect(entry.placeholder).toBeUndefined();
      expect(entry.license).toBe(LICENSE);
      expect(entry.width).toBe(spec.width);
      expect(entry.height).toBe(spec.height);
      expect(Object.keys(entry.regions ?? {})).toHaveLength(spec.regions);
      expect(
        licences.assets.some(
          (licence) =>
            licence.file === entry.src && licence.license === entry.license,
        ),
      ).toBe(true);

      const path = join(PACK_DIR, spec.file);
      expect(existsSync(path)).toBe(true);
      const atlas = decode(path);
      expect({ width: atlas.width, height: atlas.height }).toEqual({
        width: spec.width,
        height: spec.height,
      });

      const validation = validatePaletteImage(atlas, palette);
      expect(validation.offPalettePixels).toBe(0);
      expect(validation.alphaViolations).toBe(0);

      for (const [key, region] of Object.entries(entry.regions ?? {})) {
        expect(region.width).toBe(32);
        expect(region.height).toBe(32);
        const frame = cropFrame(atlas, region);
        expect(non2x2Pixels(frame), `${spec.id} ${key} 2x2`).toBe(0);
        const mask = Number(key.slice("mask-".length));
        const rule = spec.id === "tile.bone.atlas" ? "blob47" : "edge";
        expect(
          connectedEdgeMismatch(frame, mask, rule),
          `${spec.id} ${key} edges`,
        ).toEqual({
          leftRight: 0,
          topBottom: 0,
        });
      }
    });

    it(`${spec.variantSet} points at ${spec.id}`, () => {
      const parsed = parseMaterials(materials);
      expect(parsed.ok).toBe(true);
      if (!parsed.ok) return;
      const variantSet = parsed.value.variantSets?.[spec.variantSet];
      expect(variantSet).toBeDefined();
      expect(variantSet?.atlas).toBe(spec.id);
      expect(Object.keys(variantSet?.frames ?? {})).toHaveLength(spec.regions);
    });
  }

  it("resolves every authored variant frame through the final manifest", () => {
    const manifestUrl = new URL(
      "../public/packs/anatomy-reflex/assets.final.json",
      import.meta.url,
    );
    const parsedManifest = parseManifest(
      JSON.parse(readFileSync(manifestUrl, "utf8")),
      manifestUrl.toString(),
    );
    if (!parsedManifest.ok) throw new Error(parsedManifest.error);
    const assets = createAssets({
      finalManifest: parsedManifest.value.manifest,
      logger: silentLogger,
    });

    for (const variantSet of Object.values(materials.variantSets)) {
      for (const frame of Object.values(variantSet.frames)) {
        expect(
          assets.resolveFrame({
            kind: "atlas",
            assetId: frame.assetId,
            frame: frame.frame,
          }),
          `${frame.assetId}#${frame.frame}`,
        ).not.toBeNull();
      }
    }
  });
});
