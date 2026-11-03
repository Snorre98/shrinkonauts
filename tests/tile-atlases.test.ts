import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { PNG } from "pngjs";
import { describe, expect, it } from "vitest";
import { parseManifest } from "../src/assets";
import { createAssets } from "../src/assets/assets";
import { silentLogger } from "../src/core/logger";
import { parseMaterials } from "../src/pack";

const PACK_DIR = "public/packs/anatomy-reflex";

interface ManifestEntry {
  type: string;
  src?: string;
  placeholder?: boolean;
  width?: number;
  height?: number;
  regions?: Record<string, unknown>;
}

const manifest = JSON.parse(
  readFileSync(join(PACK_DIR, "assets.final.json"), "utf8"),
) as { assets: Record<string, ManifestEntry> };

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

describe("tile atlas wiring", () => {
  for (const spec of atlasSpecs) {
    it(`${spec.id} is a valid ${spec.width}x${spec.height} atlas`, () => {
      const entry = manifest.assets[spec.id];
      expect(entry).toBeDefined();
      if (!entry) return;
      expect(entry.type).toBe("atlas");
      expect(entry.src).toBe(spec.file);
      expect(entry.placeholder).toBe(true);
      expect(entry.width).toBe(spec.width);
      expect(entry.height).toBe(spec.height);
      expect(Object.keys(entry.regions ?? {})).toHaveLength(spec.regions);

      const path = join(PACK_DIR, spec.file);
      expect(existsSync(path)).toBe(true);
      const png = PNG.sync.read(readFileSync(path));
      expect({ width: png.width, height: png.height }).toEqual({
        width: spec.width,
        height: spec.height,
      });

      for (let index = 3; index < png.data.length; index += 4) {
        if (png.data[index] !== 255) {
          throw new Error(`${spec.id} has a non-opaque atlas cell`);
        }
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
