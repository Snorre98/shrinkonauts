import type { MaterialCatalog, MaterialsDocument } from "./types";

export function createMaterialCatalog(
  document?: MaterialsDocument | null,
): MaterialCatalog {
  return {
    materials: { ...(document?.materials ?? {}) },
    patterns: { ...(document?.patterns ?? {}) },
    variantSets: { ...(document?.variantSets ?? {}) },
  };
}

export function emptyMaterialCatalog(): MaterialCatalog {
  return createMaterialCatalog();
}
