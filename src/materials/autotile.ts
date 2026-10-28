import type { AtlasFrameRef } from "../assets";
import { fnv1a } from "./patterns";
import type {
  MaterialCatalog,
  MaterialDefinition,
  MaterialGrid,
  TileMaterialRule,
  TileVariantSet,
} from "./types";

export const N = 1;
export const NE = 2;
export const E = 4;
export const SE = 8;
export const S = 16;
export const SW = 32;
export const W = 64;
export const NW = 128;

export interface MaterialGridInput {
  width: number;
  height: number;
  tiles: readonly string[];
  tileMaterials?: readonly string[];
  legend?: Readonly<Record<string, { materialId: string }>>;
  defaultMaterialId?: string;
}

export function createMaterialGrid(input: MaterialGridInput): MaterialGrid {
  const rows = input.tileMaterials;
  return {
    width: input.width,
    height: input.height,
    solidAt(x, y) {
      return input.tiles[y]?.[x] === "#";
    },
    materialAt(x, y) {
      if (x < 0 || y < 0 || x >= input.width || y >= input.height) {
        return null;
      }
      const character = rows?.[y]?.[x];
      if (character !== undefined && character !== " ") {
        return input.legend?.[character]?.materialId ?? null;
      }
      return input.tiles[y]?.[x] === "#"
        ? (input.defaultMaterialId ?? null)
        : null;
    },
  };
}

export function autotileMask(
  grid: MaterialGrid,
  x: number,
  y: number,
  materialId: string,
): number {
  const connected = (nx: number, ny: number): boolean =>
    grid.materialAt(nx, ny) === materialId;
  let mask = 0;
  if (connected(x, y - 1)) mask |= N;
  if (connected(x + 1, y - 1)) mask |= NE;
  if (connected(x + 1, y)) mask |= E;
  if (connected(x + 1, y + 1)) mask |= SE;
  if (connected(x, y + 1)) mask |= S;
  if (connected(x - 1, y + 1)) mask |= SW;
  if (connected(x - 1, y)) mask |= W;
  if (connected(x - 1, y - 1)) mask |= NW;
  return mask;
}

export function edgeMask(mask: number): number {
  return (
    (mask & N ? 1 : 0) |
    (mask & E ? 2 : 0) |
    (mask & S ? 4 : 0) |
    (mask & W ? 8 : 0)
  );
}

/**
 * Standard 47-blob reduction: a diagonal only matters when both adjacent
 * cardinal neighbours are present. The 256 possible masks collapse to 47.
 */
export function canonicalBlob47Mask(mask: number): number {
  let reduced = mask;
  if (!(reduced & N) || !(reduced & E)) reduced &= ~NE;
  if (!(reduced & E) || !(reduced & S)) reduced &= ~SE;
  if (!(reduced & S) || !(reduced & W)) reduced &= ~SW;
  if (!(reduced & W) || !(reduced & N)) reduced &= ~NW;
  return reduced;
}

export function maskKey(
  rule: Pick<TileMaterialRule, "autotile">,
  mask: number,
): string {
  switch (rule.autotile) {
    case "edge":
      return String(edgeMask(mask));
    case "corner":
    case "wang":
      return String(mask);
    case "blob47":
      return String(canonicalBlob47Mask(mask));
    case "none":
    case "randomVariants":
    default:
      return "0";
  }
}

export function variantIndex(
  materialId: string,
  x: number,
  y: number,
  seed: number,
  length: number,
): number {
  if (length <= 0) return -1;
  return (
    fnv1a(`${materialId}:${x}:${y}:${seed}`) % length
  );
}

export function selectVariant(
  rule: Pick<TileMaterialRule, "materialId">,
  mask: number,
  x: number,
  y: number,
  seed: number,
  variants: readonly AtlasFrameRef[] | undefined,
): AtlasFrameRef | null {
  if (!variants || variants.length === 0) return null;
  void mask;
  return variants[variantIndex(rule.materialId, x, y, seed, variants.length)] ?? null;
}

export function resolveVariantFrame(
  catalog: MaterialCatalog,
  rule: TileMaterialRule,
  mask: number,
  x: number,
  y: number,
  seed: number,
  material?: MaterialDefinition,
): AtlasFrameRef | null {
  const variants = rule.variants ?? material?.variants;
  const set = catalog.variantSets[rule.variantSet ?? material?.variantSet ?? ""];
  if (set) {
    const key = maskKey(rule, mask);
    return set.frames[key] ?? set.fallback;
  }
  return selectVariant(rule, mask, x, y, seed, variants);
}

export function variantSetRule(
  set: TileVariantSet,
): Pick<TileMaterialRule, "autotile"> {
  return { autotile: set.rule };
}

export function roomMaterialSeed(roomId: string): number {
  return fnv1a(`room:${roomId}`) % 2147483647;
}
