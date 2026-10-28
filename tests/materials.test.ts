import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  createMaterialCatalog,
  materialById,
  resolveMaterialBinding,
  type MaterialsDocument,
} from "../src/materials";
import { parseMaterials } from "../src/pack";

const MATERIALS_PATH = new URL(
  "../public/packs/anatomy-reflex/materials.json",
  import.meta.url,
);

function document(): MaterialsDocument {
  const parsed = parseMaterials(
    JSON.parse(readFileSync(MATERIALS_PATH, "utf8")),
  );
  if (!parsed.ok) throw new Error(parsed.error);
  return parsed.value;
}

describe("materials catalog", () => {
  it("parses the proof materials, patterns, and variant set", () => {
    const parsed = document();
    expect(Object.keys(parsed.materials).sort()).toEqual([
      "bone",
      "membrane",
      "muscle",
      "nerve",
    ]);
    expect(parsed.patterns?.["nerve-fibers"]?.source.kind).toBe("procedural");
    expect(parsed.variantSets?.["nerve-edge"]?.rule).toBe("edge");
  });

  it("resolves material and pattern lookups", () => {
    const catalog = createMaterialCatalog(document());
    expect(materialById(catalog, "bone")?.family).toBe("mineral");
    expect(materialById(catalog, "missing")).toBeUndefined();
  });

  it("applies binding precedence over material and pattern defaults", () => {
    const catalog = createMaterialCatalog(document());
    const resolved = resolveMaterialBinding(catalog, {
      materialId: "nerve",
      patternId: "bone-cortex",
      pattern: {
        space: "local",
        scale: 1.25,
        rotation: 0.5,
        seed: 99,
        opacity: 0.25,
        blend: "multiply",
      },
    });

    expect(resolved.ok).toBe(true);
    if (!resolved.ok) return;
    expect(resolved.value.pattern?.pattern.id).toBe("bone-cortex");
    expect(resolved.value.pattern?.space).toBe("local");
    expect(resolved.value.pattern?.scale).toBe(1.25);
    expect(resolved.value.pattern?.rotation).toBe(0.5);
    expect(resolved.value.pattern?.seed).toBe(99);
    expect(resolved.value.pattern?.opacity).toBe(0.25);
    expect(resolved.value.pattern?.blend).toBe("multiply");
    expect(resolved.value.tint).toBe("nerve");
  });

  it("uses material direction when no binding rotation is given", () => {
    const catalog = createMaterialCatalog(document());
    const resolved = resolveMaterialBinding(catalog, { materialId: "nerve" });
    expect(resolved.ok).toBe(true);
    if (resolved.ok) {
      expect(resolved.value.pattern?.rotation).toBeCloseTo(0.35);
    }
  });

  it("rejects a missing material and falls back for a missing pattern", () => {
    const catalog = createMaterialCatalog(document());
    expect(resolveMaterialBinding(catalog, { materialId: "missing" }).ok).toBe(
      false,
    );

    const fallback = resolveMaterialBinding(catalog, {
      materialId: "bone",
      patternId: "missing-pattern",
    });
    expect(fallback.ok).toBe(true);
    if (fallback.ok) {
      expect(fallback.value.pattern).toBeUndefined();
      expect(fallback.value.warnings[0]).toContain("PATTERN_NOT_FOUND");
    }
  });

  it("rejects unknown fields in material documents", () => {
    const raw = JSON.parse(readFileSync(MATERIALS_PATH, "utf8")) as Record<
      string,
      unknown
    >;
    const materials = raw.materials as Record<string, Record<string, unknown>>;
    materials.bone.collision = true;
    expect(parseMaterials(raw).ok).toBe(false);
  });
});
