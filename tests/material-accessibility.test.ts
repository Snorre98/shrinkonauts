import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  createMaterialCatalog,
  createPatternProvider,
  type PatternDefinition,
} from "../src/materials";
import { parseMaterials, parseRoom, parseTheme } from "../src/pack";
import { contrastRatio, resolveUiMaterialStyles } from "../src/ui/material-css";
import { sampleBitmap } from "../src/materials";
import { buildTilePlan } from "../src/world/tile-material-renderer";

const PACK_DIR = new URL("../public/packs/anatomy-reflex/", import.meta.url);
const DEV_ROOM = new URL("../public/content/dev/room.json", import.meta.url);

function readPack(file: string): unknown {
  return JSON.parse(readFileSync(new URL(file, PACK_DIR), "utf8"));
}

const materials = (() => {
  const parsed = parseMaterials(readPack("materials.json"));
  if (!parsed.ok) throw new Error(parsed.error);
  return parsed.value;
})();
const catalog = createMaterialCatalog(materials);
const theme = (() => {
  const parsed = parseTheme(readPack("theme.json"));
  if (!parsed.ok) throw new Error(parsed.error);
  return parsed.value;
})();
const patterns = createPatternProvider();

describe("material accessibility", () => {
  it("keeps every UI slot above the text contrast baseline", () => {
    const resolved = resolveUiMaterialStyles({ theme, catalog, patterns });
    for (const [slot, style] of Object.entries(resolved.styles)) {
      if (!style) continue;
      expect(contrastRatio(theme.palette.text, style.backgroundColor), slot)
        .toBeGreaterThanOrEqual(4.5);
    }
  });

  it("keeps procedural overlay alpha low for text readability", () => {
    for (const definition of Object.values(materials.patterns ?? {})) {
      if (definition.source.kind !== "procedural") continue;
      const resource = patterns.resolve(definition);
      expect(resource.ok, definition.id).toBe(true);
      if (!resource.ok || !resource.value.bitmap) continue;
      let max = 0;
      for (let index = 3; index < resource.value.bitmap.data.length; index += 4) {
        max = Math.max(max, resource.value.bitmap.data[index] ?? 0);
      }
      expect(max / 255, definition.id).toBeLessThanOrEqual(0.45);
    }
  });

  it("keeps the static reduced-motion frame and material identity", () => {
    const normal = resolveUiMaterialStyles({ theme, catalog, patterns });
    const reduced = resolveUiMaterialStyles({
      theme,
      catalog,
      patterns,
      reducedMotion: true,
    });
    for (const slot of Object.keys(normal.styles)) {
      const first = normal.styles[slot as keyof typeof normal.styles];
      const second = reduced.styles[slot as keyof typeof reduced.styles];
      expect(second).toEqual(first);
      expect(second?.patternAnimation).toBe("none");
    }
  });

  it("preserves the old renderer path for a room without material data", () => {
    const parsed = parseRoom(JSON.parse(readFileSync(DEV_ROOM, "utf8")));
    if (!parsed.ok) throw new Error(parsed.error);
    expect(buildTilePlan(parsed.value, catalog)).toBeNull();
    expect(parsed.value.tileMaterials).toBeUndefined();
  });

  it("does not let pattern sampling affect collision or puzzle state", () => {
    const definition: PatternDefinition = {
      id: "test",
      family: "organic",
      source: { kind: "procedural", generator: "fibers", seed: 1 },
      space: "world",
      scale: 0.5,
    };
    const resource = patterns.resolve(definition);
    expect(resource.ok).toBe(true);
    if (resource.ok && resource.value.bitmap) {
      expect(sampleBitmap(resource.value.bitmap, 0, 0)).toBe(
        sampleBitmap(resource.value.bitmap, 32, 32),
      );
    }
  });
});
