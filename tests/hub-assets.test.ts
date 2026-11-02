import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { PNG } from "pngjs";
import { describe, expect, it } from "vitest";
import {
  parsePaletteDocument,
  validatePaletteImage,
} from "../scripts/art/palette";
import type { RgbaImage } from "../scripts/art/ludo-sheet";

const HUB_DIR = "public/hub/bathroom";
const SPRITE_CELLS: Record<string, [number, number]> = {
  "sprite.prop.washer": [180, 240],
  "sprite.prop.washer.door": [88, 88],
  "sprite.prop.washer.drum": [80, 80],
  "sprite.player.civilian": [32, 64],
  "sprite.player.p1": [14, 22],
  "sprite.prop.poster": [48, 64],
  "sprite.prop.cartridge.anatomy": [24, 32],
  "sprite.prop.cartridge.silicon": [24, 32],
  "sprite.prop.plush.neuron": [24, 24],
  "sprite.prop.detergent.bottles": [32, 32],
  "sprite.prop.laundry.basket": [32, 24],
  "sprite.prop.towel": [16, 32],
};

interface ManifestEntry {
  type: string;
  src?: string;
  width?: number;
  height?: number;
  license?: string;
  placeholder?: boolean;
}

const manifest = JSON.parse(
  readFileSync(join(HUB_DIR, "assets.final.json"), "utf8"),
) as { assets: Record<string, ManifestEntry> };

const palette = parsePaletteDocument(
  JSON.parse(readFileSync("art-source/nanobanan/palette.hub.json", "utf8")),
);

function decode(path: string): RgbaImage {
  const png = PNG.sync.read(readFileSync(path));
  return { width: png.width, height: png.height, data: Buffer.from(png.data) };
}

function webpSize(buffer: Buffer): { width: number; height: number; chunk: string } {
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

describe("bathroom hub final art", () => {
  it("ships the shifted 640x360 scene plate", () => {
    const entry = manifest.assets["bg.bathroom.wall"];
    expect(entry?.type).toBe("background");
    expect(entry?.src).toBe("shared/backgrounds/bathroom-wall.webp");
    expect(entry?.license).toContain("Nano Banana");
    const path = join(HUB_DIR, entry?.src as string);
    expect(existsSync(path)).toBe(true);
    expect(webpSize(readFileSync(path))).toEqual({
      chunk: "VP8L",
      width: 640,
      height: 360,
    });
  });

  for (const [id, cell] of Object.entries(SPRITE_CELLS)) {
    it(`${id} is ${cell[0]}x${cell[1]} with hard alpha and hub-palette colours`, () => {
      const entry = manifest.assets[id];
      expect(entry).toBeDefined();
      if (!entry) return;
      expect(entry.placeholder).toBeUndefined();
      expect(entry.src).toMatch(/^shared\/sprites\/[a-z0-9-]+\.png$/);
      expect(entry.license).toBeTruthy();
      expect(entry.width).toBe(cell[0]);
      expect(entry.height).toBe(cell[1]);

      const path = join(HUB_DIR, entry.src as string);
      expect(existsSync(path)).toBe(true);
      const image = decode(path);
      expect([image.width, image.height]).toEqual(cell);

      const validation = validatePaletteImage(image, palette);
      expect(validation.alphaViolations).toBe(0);
      expect(validation.offPalettePixels).toBe(0);

      for (let index = 0; index < image.data.length; index += 4) {
        const red = image.data[index] ?? 0;
        const green = image.data[index + 1] ?? 0;
        const blue = image.data[index + 2] ?? 0;
        expect(red > 240 && green < 20 && blue > 240).toBe(false);
      }
    });
  }

  it("ships the two decorative cycle icons as 16x16 images", () => {
    for (const id of ["ui.icon.cycle.anatomy", "ui.icon.cycle.silicon"]) {
      const entry = manifest.assets[id];
      expect(entry?.type).toBe("image");
      expect(entry?.src).toMatch(/^shared\/ui\/icon-cycle-[a-z]+\.png$/);
      const image = decode(join(HUB_DIR, entry?.src as string));
      expect([image.width, image.height]).toEqual([16, 16]);
    }
  });

  it("keeps the missing logo, toy astronaut, walk sheet, and audio as explicit placeholders", () => {
    expect(manifest.assets["ui.logo.shrinkonauts"]?.placeholder).toBe(true);
    expect(manifest.assets["sprite.prop.toy.astronaut"]?.placeholder).toBe(true);
    expect(manifest.assets["sprite.player.civilian.walk"]).toBeUndefined();
    for (const id of [
      "audio.cue.hub.click",
      "audio.cue.hub.door",
      "audio.cue.hub.spin",
      "audio.cue.hub.shrink",
      "audio.cue.hub.arrive",
      "audio.cue.hub.hum",
    ]) {
      expect(manifest.assets[id]?.placeholder).toBe(true);
    }
  });
});
