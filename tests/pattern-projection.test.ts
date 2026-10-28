import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  createMaterialCatalog,
  createPatternProvider,
  resolveMaterialBinding,
} from "../src/materials";
import { parseMaterials, parseRoom, parseTheme } from "../src/pack";
import { resolveUiMaterialStyles } from "../src/ui/material-css";
import { buildTilePlan } from "../src/world/tile-material-renderer";
import { patternTilePosition } from "../src/world/pattern-space";

const PACK_DIR = new URL("../public/packs/anatomy-reflex/", import.meta.url);

function readJson(file: string): unknown {
  return JSON.parse(readFileSync(new URL(file, PACK_DIR), "utf8"));
}

const materials = (() => {
  const parsed = parseMaterials(readJson("materials.json"));
  if (!parsed.ok) throw new Error(parsed.error);
  return parsed.value;
})();
const catalog = createMaterialCatalog(materials);
const theme = (() => {
  const parsed = parseTheme(readJson("theme.json"));
  if (!parsed.ok) throw new Error(parsed.error);
  return parsed.value;
})();
const patterns = createPatternProvider();

describe("pattern placement", () => {
  it("keeps adjacent world-space tiles continuous", () => {
    const first = patternTilePosition("world", 0, 0, 0.5, { x: 0, y: 0 });
    const second = patternTilePosition("world", 32, 0, 0.5, { x: 0, y: 0 });
    expect(second.x - first.x).toBe(64);
    expect(second.y).toBe(first.y);
  });

  it("aligns an object at the same world origin as a tile", () => {
    const tile = patternTilePosition("world", 128, 64, 0.75, {
      x: 3,
      y: 5,
    });
    const object = patternTilePosition("world", 128, 64, 0.75, {
      x: 3,
      y: 5,
    });
    expect(object).toEqual(tile);
  });

  it("resets phase for local and screen spaces", () => {
    expect(
      patternTilePosition("local", 128, 64, 0.5, { x: 2, y: 3 }),
    ).toEqual({ x: 2, y: 3 });
    expect(
      patternTilePosition(
        "screen",
        128,
        64,
        0.5,
        { x: 2, y: 3 },
        500,
        400,
      ),
    ).toEqual({ x: 2, y: 3 });
  });

  it("tracks background parallax in world space", () => {
    expect(
      patternTilePosition(
        "world",
        0,
        0,
        0.5,
        { x: 0, y: 0 },
        100,
        50,
        0.45,
        0.2,
      ),
    ).toEqual({ x: 90, y: 20 });
  });
});

describe("UI and world parity", () => {
  it("uses the same procedural pattern resource for a UI slot", () => {
    const resolved = resolveUiMaterialStyles({
      theme,
      catalog,
      patterns,
      reducedMotion: true,
    });
    expect(resolved.warnings).toEqual([]);
    const panel = resolved.styles.panel;
    expect(panel).toBeDefined();
    if (!panel) return;
    expect(panel.pattern).toContain("data:image/svg+xml");
    expect(panel.patternSize).toContain("px");
    expect(panel.contrastRatio).toBeGreaterThanOrEqual(4.5);
    expect(panel.patternAnimation).toBe("none");
    expect(panel.animated).toBe(false);
  });

  it("falls back to a solid style when a pattern source is unsupported", () => {
    const brokenTheme = structuredClone(theme);
    brokenTheme.ui.patterns = {
      panel: { patternId: "missing", space: "screen", scale: 0.5 },
    };
    const resolved = resolveUiMaterialStyles({
      theme: brokenTheme,
      catalog,
      patterns,
    });
    expect(resolved.warnings.some((warning) => warning.includes("PATTERN"))).toBe(
      true,
    );
    expect(resolved.styles.panel?.pattern).toBe("none");
  });

  it("keeps the background palette dark enough for text", () => {
    const resolved = resolveUiMaterialStyles({ theme, catalog, patterns });
    for (const style of Object.values(resolved.styles)) {
      if (!style) continue;
      expect(style.contrastRatio).toBeGreaterThanOrEqual(4.5);
    }
  });
});

describe("material projection never mutates content", () => {
  it("builds a tile plan without changing the room", () => {
    const parsed = parseRoom(readJson("levels/03-nerve-forest/room.json"));
    if (!parsed.ok) throw new Error(parsed.error);
    const room = parsed.value;
    const before = JSON.stringify(room);
    const plan = buildTilePlan(room, catalog);
    expect(plan).not.toBeNull();
    expect(JSON.stringify(room)).toBe(before);
  });

  it("resolves an object binding in world space", () => {
    const resolved = resolveMaterialBinding(catalog, {
      materialId: "muscle",
      patternId: "muscle-fibers",
      pattern: { space: "world", scale: 0.75, opacity: 0.35 },
    });
    expect(resolved.ok).toBe(true);
    if (resolved.ok) {
      expect(resolved.value.pattern?.space).toBe("world");
      expect(resolved.value.pattern?.scale).toBe(0.75);
      expect(resolved.value.pattern?.opacity).toBe(0.35);
    }
  });
});
