import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const PACK_DIR = "public/packs/anatomy-reflex";
const PLACEHOLDER_LAYERS = [
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

describe("03 background", () => {
  it("wires only the pretty sky and keeps the layered plates as placeholders", () => {
    expect(room.background.layers.map((layer) => layer.assetId)).toEqual([
      "bg.nerve_forest.sky",
    ]);

    const [sky] = room.background.layers;
    expect(sky?.fit).toBe("cover");
    expect(sky?.depth).toBe(-40);
    expect(sky?.parallaxX).toBe(0.05);
    expect(sky?.parallaxY).toBe(0.02);
    expect(sky?.materialId).toBeUndefined();
    expect(sky?.pattern).toBeUndefined();

    for (const id of PLACEHOLDER_LAYERS) {
      const entry = manifest.assets[id];
      expect(entry?.type).toBe("background");
      expect(entry?.placeholder).toBe(true);
      expect(entry?.src).toBeUndefined();
      expect(
        room.background.layers.some((layer) => layer.assetId === id),
      ).toBe(false);
    }
  });

  it("ships the pretty sky as a 1280x736 lossless WebP with a matching licence", () => {
    const entry = manifest.assets["bg.nerve_forest.sky"];
    expect(entry).toBeDefined();
    if (!entry) return;
    expect(entry.type).toBe("background");
    expect(entry.src).toBe("shared/backgrounds/nerve-forest-sky.webp");
    expect(entry.license).toBe("Ludo.ai source (POC; plan TBD)");
    expect(entry.placeholder).toBeUndefined();

    const path = join(PACK_DIR, entry.src as string);
    expect(existsSync(path)).toBe(true);

    // The pretty sky is a recorded exception to the 300 KB pixel-asset
    // budget; its actual size is reported in the background requirements doc.
    const info = webpInfo(readFileSync(path));
    expect(info.chunk).toBe("VP8L");
    expect({ width: info.width, height: info.height }).toEqual({
      width: 1280,
      height: 736,
    });

    expect(
      licences.assets.some(
        (licence) =>
          licence.file === entry.src && licence.license === entry.license,
      ),
    ).toBe(true);
  });

  it("does not reference raw source JPEGs", () => {
    const runtime = JSON.stringify({ manifest, room });
    expect(runtime).not.toContain(".jpeg");
    expect(runtime).not.toContain("art-source/");
  });
});
