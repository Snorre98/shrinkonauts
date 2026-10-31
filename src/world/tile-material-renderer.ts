import type { AtlasFrameRef } from "../assets";
import {
  autotileMask,
  createMaterialGrid,
  resolveMaterialBinding,
  resolveVariantFrame,
  roomMaterialSeed,
  type MaterialCatalog,
  type MaterialDefinition,
  type ResolvedMaterialBinding,
  type TileMaterialRule,
} from "../materials";
import type { RoomDocument } from "../pack";

export interface TileMaterialCell {
  x: number;
  y: number;
  legacy: boolean;
  decorative: boolean;
  material?: MaterialDefinition;
  rule?: TileMaterialRule;
  mask: number;
  variant?: AtlasFrameRef;
  binding?: ResolvedMaterialBinding;
}

export interface TileMaterialPlan {
  cells: TileMaterialCell[];
  usesLegacyTileset: boolean;
  seed: number;
  warnings: string[];
}

function defaultRule(material: MaterialDefinition): TileMaterialRule {
  return {
    materialId: material.id,
    autotile: material.autotile ?? "none",
    ...(material.variantSet ? { variantSet: material.variantSet } : {}),
    ...(material.variants ? { variants: material.variants } : {}),
    ...(material.patternId ? { patternId: material.patternId } : {}),
    ...(material.tint ? { tint: material.tint } : {}),
  };
}

/**
 * Headless tile plan. `layers.tiles` decides what is solid; `tileMaterials`
 * only decides appearance. The plan never mutates the room.
 */
export function buildTilePlan(
  room: RoomDocument,
  catalog: MaterialCatalog,
): TileMaterialPlan | null {
  const hasMaterialData =
    room.tileMaterials !== undefined ||
    room.tileMaterialLegend !== undefined ||
    room.defaultMaterialId !== undefined;
  if (!hasMaterialData) {
    return null;
  }

  const grid = createMaterialGrid({
    width: room.width,
    height: room.height,
    tiles: room.layers.tiles,
    ...(room.tileMaterials ? { tileMaterials: room.tileMaterials } : {}),
    ...(room.tileMaterialLegend ? { legend: room.tileMaterialLegend } : {}),
    ...(room.defaultMaterialId
      ? { defaultMaterialId: room.defaultMaterialId }
      : {}),
  });
  const seed = room.materialSeed ?? roomMaterialSeed(room.id);
  const cells: TileMaterialCell[] = [];
  const warnings: string[] = [];
  let usesLegacyTileset = false;

  for (let y = 0; y < room.height; y += 1) {
    for (let x = 0; x < room.width; x += 1) {
      const solid = room.layers.tiles[y]?.[x] === "#";
      const character = room.tileMaterials?.[y]?.[x];
      const hasCharacter = character !== undefined && character !== " ";
      if (!solid && !hasCharacter) continue;

      const materialId = grid.materialAt(x, y);
      if (!materialId) {
        if (solid) {
          usesLegacyTileset = true;
          cells.push({
            x,
            y,
            legacy: true,
            decorative: false,
            mask: 0,
          });
        }
        continue;
      }

      const material = catalog.materials[materialId];
      if (!material) {
        warnings.push(
          `MATERIAL_NOT_FOUND: ${materialId} at (${x}, ${y}); using the legacy tileset`,
        );
        if (solid) {
          usesLegacyTileset = true;
          cells.push({ x, y, legacy: true, decorative: false, mask: 0 });
        }
        continue;
      }

      let rule: TileMaterialRule;
      if (hasCharacter && character) {
        const legend = room.tileMaterialLegend?.[character];
        if (!legend) {
          warnings.push(
            `TILE_MATERIAL_LEGEND_MISSING: "${character}" at (${x}, ${y}); using the legacy tileset`,
          );
          if (solid) {
            usesLegacyTileset = true;
            cells.push({ x, y, legacy: true, decorative: false, mask: 0 });
          }
          continue;
        }
        rule = legend;
      } else {
        rule = defaultRule(material);
      }

      const mask = autotileMask(grid, x, y, materialId);
      const binding = resolveMaterialBinding(catalog, {
        materialId,
        ...(rule.patternId ? { patternId: rule.patternId } : {}),
        ...(rule.tint ? { tint: rule.tint } : {}),
      });
      if (!binding.ok) {
        warnings.push(`${binding.error} at (${x}, ${y})`);
      }
      for (const warning of binding.ok ? binding.value.warnings : []) {
        warnings.push(warning);
      }
      const variant = resolveVariantFrame(
        catalog,
        rule,
        mask,
        x,
        y,
        seed,
        material,
      );

      cells.push({
        x,
        y,
        legacy: false,
        decorative: !solid,
        material,
        rule,
        mask,
        ...(variant ? { variant } : {}),
        ...(binding.ok ? { binding: binding.value } : {}),
      });
    }
  }

  return { cells, usesLegacyTileset, seed, warnings };
}
