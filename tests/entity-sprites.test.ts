import { existsSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { PNG } from "pngjs";
import { describe, expect, it } from "vitest";
import { alphaBounds } from "../scripts/art/key";
import type { RgbaImage } from "../scripts/art/ludo-sheet";
import {
  parsePaletteDocument,
  validatePaletteImage,
} from "../scripts/art/palette";

const PACK_DIR = "public/packs/anatomy-reflex";
const ENTITY_IDS = [
  "sprite.agent.neuron",
  "sprite.scan.neuron",
  "sprite.scan.synapse",
  "sprite.scan.pathway",
  "sprite.scan.muscle",
] as const;

interface ManifestEntry {
  type: string;
  src?: string;
  license?: string;
  placeholder?: boolean;
  frameWidth?: number;
  frameHeight?: number;
  frames?: number;
  fps?: number;
  loop?: boolean;
}

const manifest = JSON.parse(
  readFileSync(join(PACK_DIR, "assets.final.json"), "utf8"),
) as { assets: Record<string, ManifestEntry> };
const licences = JSON.parse(
  readFileSync(join(PACK_DIR, "licenses.json"), "utf8"),
) as {
  assets: Array<{ file: string; license: string }>;
};
const palette = parsePaletteDocument(
  JSON.parse(readFileSync("art-source/nanobanan/palette.json", "utf8")),
);

function decode(relative: string): RgbaImage {
  const png = PNG.sync.read(readFileSync(join(PACK_DIR, relative)));
  return { width: png.width, height: png.height, data: Buffer.from(png.data) };
}

function frame(image: RgbaImage, index: number, width: number): RgbaImage {
  const height = image.height;
  const data = Buffer.alloc(width * height * 4);
  for (let y = 0; y < height; y += 1) {
    const source = (y * image.width + index * width) * 4;
    image.data.copy(data, y * width * 4, source, source + width * 4);
  }
  return { width, height, data };
}

function expectPaletteAndMargins(image: RgbaImage): void {
  const validation = validatePaletteImage(image, palette);
  expect(validation.offPalettePixels).toBe(0);
  expect(validation.alphaViolations).toBe(0);
  const bounds = alphaBounds(image);
  expect(bounds).not.toBeNull();
  if (!bounds) return;
  expect(bounds.x).toBeGreaterThanOrEqual(1);
  expect(bounds.y).toBeGreaterThanOrEqual(1);
  expect(bounds.x + bounds.width).toBeLessThanOrEqual(image.width - 1);
  expect(bounds.y + bounds.height).toBeLessThanOrEqual(image.height - 1);
}

describe("integrated entity sprites", () => {
  for (const id of ENTITY_IDS) {
    const entry = manifest.assets[id];
    it(`${id} is either a declared placeholder or a valid runtime sprite`, () => {
      expect(entry).toBeDefined();
      if (!entry) return;
      if (entry.placeholder === true) {
        expect(entry.src).toBeUndefined();
        return;
      }

      expect(entry.type).toBe("sprite");
      expect(entry.src).toMatch(/^shared\/sprites\/[a-z0-9-]+\.png$/);
      expect(entry.license).toBe("Ludo.ai source (POC; plan TBD)");
      const path = join(PACK_DIR, entry.src as string);
      expect(existsSync(path)).toBe(true);
      expect(statSync(path).size).toBeLessThanOrEqual(16 * 1024);

      const image = decode(entry.src as string);
      expect(image.width).toBe(18);
      expect(image.height).toBe(18);
      expectPaletteAndMargins(image);

      expect(
        licences.assets.some(
          (licence) =>
            licence.file === entry.src && licence.license === entry.license,
        ),
      ).toBe(true);
    });
  }

  it("keeps the reserve and non-M3 entity placeholders", () => {
    for (const id of [
      "sprite.scan.reflex",
      "sprite.gate.nerve",
      "sprite.checkpoint",
    ]) {
      expect(manifest.assets[id]?.placeholder, id).toBe(true);
    }
  });
});

describe("Neuron Keeper idle sheet", () => {
  const entry = manifest.assets["sprite.agent.neuron.idle"];
  it("is a 36-frame 18x18 looping sheet with a matching licence", () => {
    expect(entry).toBeDefined();
    if (!entry) return;
    expect(entry.type).toBe("sheet");
    expect(entry.frameWidth).toBe(18);
    expect(entry.frameHeight).toBe(18);
    expect(entry.frames).toBe(36);
    expect(entry.fps).toBeGreaterThan(0);
    expect(entry.loop).toBe(true);
    expect(entry.src).toBe("shared/sprites/agent-neuron-idle.png");
    expect(entry.license).toBe("Ludo.ai source (POC; plan TBD)");
    expect(
      licences.assets.some(
        (licence) =>
          licence.file === entry.src && licence.license === entry.license,
      ),
    ).toBe(true);

    const path = join(PACK_DIR, entry.src as string);
    expect(existsSync(path)).toBe(true);
    expect(statSync(path).size).toBeLessThanOrEqual(64 * 1024);
    const sheet = decode(entry.src as string);
    expect(sheet.width).toBe(18 * 36);
    expect(sheet.height).toBe(18);
    for (let index = 0; index < 36; index += 1) {
      expectPaletteAndMargins(frame(sheet, index, 18));
    }
  });

  it("is referenced by both agent entities", () => {
    for (const level of ["03-nerve-forest", "04-muscle-effector"]) {
      const room = JSON.parse(
        readFileSync(
          join(PACK_DIR, "levels", level, "room.json"),
          "utf8",
        ),
      ) as { entities: Array<{ id: string; idleAnimation?: string }> };
      const agent = room.entities.find((entity) =>
        entity.id.startsWith("agent-"),
      );
      expect(agent?.idleAnimation, level).toBe("sprite.agent.neuron.idle");
    }
  });
});
