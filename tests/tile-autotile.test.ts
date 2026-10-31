import { readFileSync } from "node:fs";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { parseManifest } from "../src/assets";
import { createAssets } from "../src/assets/assets";
import { silentLogger } from "../src/core/logger";
import {
  autotileMask,
  canonicalBlob47Mask,
  createMaterialCatalog,
  createMaterialGrid,
  edgeMask,
  variantIndex,
} from "../src/materials";
import { parseMaterials, parseRoom } from "../src/pack";
import { createRoomSimulation } from "../src/world/simulation";
import { buildTilePlan } from "../src/world/tile-material-renderer";

const PACK_DIR = new URL("../public/packs/anatomy-reflex/", import.meta.url);
const LEVELS = ["03-nerve-forest", "04-muscle-effector"] as const;

function readJson(url: URL): unknown {
  return JSON.parse(readFileSync(url, "utf8"));
}

function proofMaterials() {
  const parsed = parseMaterials(readJson(new URL("materials.json", PACK_DIR)));
  if (!parsed.ok) throw new Error(parsed.error);
  return createMaterialCatalog(parsed.value);
}

function proofRoom(levelId: string) {
  const parsed = parseRoom(
    readJson(new URL(`levels/${levelId}/room.json`, PACK_DIR)),
  );
  if (!parsed.ok) throw new Error(parsed.error);
  return parsed.value;
}

describe("material grid and autotile masks", () => {
  it("computes the eight-neighbour mask for the same material", () => {
    const grid = createMaterialGrid({
      width: 3,
      height: 3,
      tiles: ["###", "###", "###"],
      tileMaterials: [" a ", " aa", " a "],
      legend: { a: { materialId: "a" } },
    });
    expect(autotileMask(grid, 1, 1, "a")).toBe(1 | 4 | 16);
    expect(edgeMask(autotileMask(grid, 1, 1, "a"))).toBe(1 | 2 | 4);
  });

  it("reduces all masks to exactly 47 blob keys", () => {
    const keys = new Set<number>();
    for (let mask = 0; mask < 256; mask += 1) {
      keys.add(canonicalBlob47Mask(mask));
    }
    expect(keys.size).toBe(47);
  });

  it("selects variants deterministically and independently of load order", () => {
    expect(variantIndex("bone", 4, 7, 42, 9)).toBe(
      variantIndex("bone", 4, 7, 42, 9),
    );
    expect(variantIndex("bone", 4, 7, 42, 9)).not.toBe(
      variantIndex("bone", 4, 7, 43, 9),
    );
  });
});

describe("proof tile plans", () => {
  const catalog = proofMaterials();

  for (const levelId of LEVELS) {
    it(`materializes ${levelId} without changing collision`, () => {
      const room = proofRoom(levelId);
      const withoutMaterials = structuredClone(room);
      delete withoutMaterials.tileMaterials;
      delete withoutMaterials.tileMaterialLegend;
      delete withoutMaterials.defaultMaterialId;
      delete withoutMaterials.materialSeed;

      const before = createRoomSimulation(withoutMaterials, {
        width: 1280,
        height: 720,
      });
      const after = createRoomSimulation(room, {
        width: 1280,
        height: 720,
      });
      expect(JSON.stringify(after.solids)).toBe(JSON.stringify(before.solids));

      const plan = buildTilePlan(room, catalog);
      expect(plan).not.toBeNull();
      if (!plan) return;
      expect(plan.usesLegacyTileset).toBe(false);
      expect(plan.cells.length).toBeGreaterThan(100);
      expect(plan.cells.some((cell) => cell.decorative)).toBe(false);
      expect(plan.cells.some((cell) => cell.variant)).toBe(
        levelId === "03-nerve-forest",
      );
    });
  }

  it("returns null for a room without material data", () => {
    const room = proofRoom("03-nerve-forest");
    const legacy = structuredClone(room);
    delete legacy.tileMaterials;
    delete legacy.tileMaterialLegend;
    delete legacy.defaultMaterialId;
    delete legacy.materialSeed;
    expect(buildTilePlan(legacy, catalog)).toBeNull();
  });

  it("resolves atlas-backed variant frames", () => {
    const finalPath = new URL("assets.final.json", PACK_DIR);
    const parsedManifest = parseManifest(
      readJson(finalPath),
      finalPath.toString(),
    );
    if (!parsedManifest.ok) throw new Error(parsedManifest.error);
    const assets = createAssets({
      finalManifest: parsedManifest.value.manifest,
      logger: silentLogger,
    });
    const frame = assets.resolveFrame({
      kind: "atlas",
      assetId: "tile.anatomy.atlas",
      frame: "mask-5",
    });
    expect(frame?.frame).toBe("mask-5");
    expect(frame?.width).toBe(32);
    expect(
      assets.resolveFrame({
        kind: "atlas",
        assetId: "tile.anatomy.atlas",
        frame: "missing",
      }),
    ).toBeNull();
    expect(
      existsSync(
        fileURLToPath(
          new URL("shared/tiles/anatomy-atlas.svg", PACK_DIR),
        ),
      ),
    ).toBe(true);
  });
});
