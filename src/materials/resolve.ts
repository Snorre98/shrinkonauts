import { err, ok, type Result } from "../core/result";
import type {
  MaterialBinding,
  MaterialCatalog,
  MaterialDefinition,
  PatternBinding,
  PatternDefinition,
  ResolvedMaterialBinding,
  ResolvedPatternPlacement,
} from "./types";

export type PatternOverrides = Omit<PatternBinding, "patternId">;

export function resolvePatternPlacement(
  pattern: PatternDefinition,
  override: PatternOverrides | undefined,
  materialDirection?: number,
): ResolvedPatternPlacement {
  const sourceSeed =
    pattern.source.kind === "procedural" ? pattern.source.seed : 0;
  return {
    pattern,
    space: override?.space ?? pattern.space,
    scale: override?.scale ?? pattern.scale,
    rotation:
      override?.rotation ?? materialDirection ?? pattern.direction ?? 0,
    offset: override?.offset ?? { x: 0, y: 0 },
    seed: override?.seed ?? sourceSeed,
    opacity: override?.opacity ?? 0.35,
    blend: override?.blend ?? pattern.blend ?? "normal",
  };
}

export function materialById(
  catalog: MaterialCatalog,
  id: string,
): MaterialDefinition | undefined {
  return catalog.materials[id];
}

export function patternById(
  catalog: MaterialCatalog,
  id: string,
): PatternDefinition | undefined {
  return catalog.patterns[id];
}

export function variantSetById(
  catalog: MaterialCatalog,
  id: string,
): MaterialCatalog["variantSets"][string] | undefined {
  return catalog.variantSets[id];
}

export function resolveMaterialBinding(
  catalog: MaterialCatalog,
  binding: MaterialBinding,
): Result<ResolvedMaterialBinding, string> {
  const material = materialById(catalog, binding.materialId);
  if (!material) {
    return err(`MATERIAL_NOT_FOUND: ${binding.materialId}`);
  }

  const warnings: string[] = [];
  const patternId = binding.patternId ?? material.patternId;
  let pattern: ResolvedPatternPlacement | undefined;
  if (patternId) {
    const definition = patternById(catalog, patternId);
    if (!definition) {
      warnings.push(
        `PATTERN_NOT_FOUND: ${patternId} (material ${material.id}); using flat material`,
      );
    } else {
      pattern = resolvePatternPlacement(
        definition,
        binding.pattern,
        material.direction,
      );
    }
  }

  return ok({
    material,
    ...(pattern ? { pattern } : {}),
    ...((binding.tint ?? material.tint)
      ? { tint: binding.tint ?? material.tint }
      : {}),
    warnings,
  });
}
