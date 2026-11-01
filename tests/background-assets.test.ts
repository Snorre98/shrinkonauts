import { existsSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const PACK_DIR = "public/packs/anatomy-reflex";
const DEFERRED_LAYERS = [
  "bg.nerve_forest.far",
  "bg.nerve_forest.mid",
  "bg.nerve_forest.near",
] as const;

interface ManifestEntry {
  type: string;
  src?: string;
  license?: string;
  placeholder?: boolean;
}

interface BackgroundLayer {
  assetId: string;
  fit?: string;
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

describe("03 sky-only background", () => {
  it("uses only the sky layer and keeps far/mid/near unreferenced", () => {
    expect(room.background.layers).toHaveLength(1);
    const layer = room.background.layers[0];
    expect(layer?.assetId).toBe("bg.nerve_forest.sky");
    expect(layer?.fit).toBe("cover");

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

  it("ships the sky as a 640x368 lossless WebP with a matching licence", () => {
    const entry = manifest.assets["bg.nerve_forest.sky"];
    expect(entry).toBeDefined();
    if (!entry) return;
    expect(entry.type).toBe("background");
    expect(entry.src).toBe("shared/backgrounds/nerve-forest-sky.webp");
    expect(entry.license).toBe("Ludo.ai source (POC; plan TBD)");
    expect(entry.placeholder).toBeUndefined();

    const path = join(PACK_DIR, entry.src as string);
    expect(existsSync(path)).toBe(true);
    expect(statSync(path).size).toBeLessThanOrEqual(300 * 1024);
    const info = webpInfo(readFileSync(path));
    expect(info.chunk).toBe("VP8L");
    expect({ width: info.width, height: info.height }).toEqual({
      width: 640,
      height: 368,
    });

    expect(
      licences.assets.some(
        (licence) =>
          licence.file === entry.src && licence.license === entry.license,
      ),
    ).toBe(true);
  });
});
