import { existsSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const PACK_DIR = "public/packs/anatomy-reflex";
const DEFERRED_LAYERS = ["bg.nerve_forest.near"] as const;

interface ManifestEntry {
  type: string;
  src?: string;
  license?: string;
  placeholder?: boolean;
}

interface BackgroundLayer {
  assetId: string;
  fit?: string;
  depth?: number;
  parallaxX?: number;
  parallaxY?: number;
  materialId?: string;
  pattern?: { patternId?: string; opacity?: number };
}

interface RoomDocument {
  background: { layers: BackgroundLayer[] };
}

const manifest = JSON.parse(
  readFileSync(join(PACK_DIR, "assets.final.json"), "utf8"),
) as { assets: Record<string, ManifestEntry> };

const licences = JSON.parse(
  readFileSync(join(PACK_DIR, "licenses.json"), "utf8"),
) as {
  assets: Array<{ file: string; license: string }>;
};

const room = JSON.parse(
  readFileSync(
    join(PACK_DIR, "levels/03-nerve-forest/room.json"),
    "utf8",
  ),
) as RoomDocument;

function webpInfo(buffer: Buffer): {
  chunk: string;
  width: number;
  height: number;
} {
  expect(buffer.toString("ascii", 0, 4)).toBe("RIFF");
  expect(buffer.toString("ascii", 8, 12)).toBe("WEBP");
  const chunk = buffer.toString("ascii", 12, 16);

  if (chunk === "VP8L") {
    expect(buffer[20]).toBe(0x2f);
    const bits = buffer.readUInt32LE(21);
    return {
      chunk,
      width: (bits & 0x3fff) + 1,
      height: ((bits >> 14) & 0x3fff) + 1,
    };
  }

  if (chunk === "VP8X") {
    return {
      chunk,
      width: buffer.readUIntLE(24, 3) + 1,
      height: buffer.readUIntLE(27, 3) + 1,
    };
  }

  throw new Error(`Unsupported WebP chunk ${chunk}`);
}

describe("03 layered background", () => {
  it("wires the sky, far and mid layers and keeps near deferred", () => {
    expect(room.background.layers.map((layer) => layer.assetId)).toEqual([
      "bg.nerve_forest.sky",
      "bg.nerve_forest.far",
      "bg.nerve_forest.mid",
    ]);

    const [sky, far, mid] = room.background.layers;
    expect(sky?.fit).toBe("cover");
    expect(sky?.depth).toBe(-40);
    expect(far?.fit).toBe("tile");
    expect(far?.depth).toBe(-30);
    expect(far?.parallaxX).toBe(0.2);
    expect(far?.parallaxY).toBe(0.1);
    expect(mid?.fit).toBe("tile");
    expect(mid?.depth).toBe(-20);
    expect(mid?.parallaxX).toBe(0.45);
    expect(mid?.parallaxY).toBe(0.2);
    expect(mid?.materialId).toBe("bone");
    expect(mid?.pattern?.patternId).toBe("bone-cortex");
    expect(mid?.pattern?.opacity).toBe(0.12);

    for (const id of DEFERRED_LAYERS) {
      const entry = manifest.assets[id];
      expect(entry?.type).toBe("background");
      expect(entry?.placeholder).toBe(true);
      expect(entry?.src).toBeUndefined();
      expect(
        room.background.layers.some((layer) => layer.assetId === id),
      ).toBe(false);
    }
  });

  it("ships the sky, far and mid as lossless WebPs with matching licences", () => {
    const expected = [
      {
        id: "bg.nerve_forest.sky",
        src: "shared/backgrounds/nerve-forest-sky.webp",
        width: 640,
        height: 368,
      },
      {
        id: "bg.nerve_forest.far",
        src: "shared/backgrounds/nerve-forest-far.webp",
        width: 1024,
        height: 512,
      },
      {
        id: "bg.nerve_forest.mid",
        src: "shared/backgrounds/nerve-forest-mid.webp",
        width: 1024,
        height: 512,
      },
    ] as const;

    for (const { id, src, width, height } of expected) {
      const entry = manifest.assets[id];
      expect(entry).toBeDefined();
      if (!entry) continue;
      expect(entry.type).toBe("background");
      expect(entry.src).toBe(src);
      expect(entry.license).toBe("Ludo.ai source (POC; plan TBD)");
      expect(entry.placeholder).toBeUndefined();

      const path = join(PACK_DIR, entry.src as string);
      expect(existsSync(path)).toBe(true);
      expect(statSync(path).size).toBeLessThanOrEqual(300 * 1024);
      const info = webpInfo(readFileSync(path));
      expect(info.chunk).toBe("VP8L");
      expect({ width: info.width, height: info.height }).toEqual({
        width,
        height,
      });

      expect(
        licences.assets.some(
          (licence) =>
            licence.file === entry.src && licence.license === entry.license,
        ),
      ).toBe(true);
    }
  });

  it("does not reference raw source JPEGs", () => {
    const runtime = JSON.stringify({ manifest, room });
    expect(runtime).not.toContain(".jpeg");
    expect(runtime).not.toContain("art-source/");
  });
});
