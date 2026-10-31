import type { AssetId, AtlasFrameRef } from "../assets";

export type MaterialId = string;
export type PatternId = string;
export type VariantSetId = string;

export const MATERIAL_FAMILIES = [
  "organic",
  "mineral",
  "synthetic",
  "energy",
] as const;
export type MaterialFamily = (typeof MATERIAL_FAMILIES)[number];

export const MATERIAL_EDGES = ["soft", "hard", "none"] as const;
export type MaterialEdge = (typeof MATERIAL_EDGES)[number];

export const AUTOTILE_RULES = [
  "none",
  "edge",
  "corner",
  "blob47",
  "wang",
  "randomVariants",
] as const;
export type AutotileRule = (typeof AUTOTILE_RULES)[number];

export const PATTERN_SPACES = ["world", "screen", "local"] as const;
export type PatternSpace = (typeof PATTERN_SPACES)[number];

export const PATTERN_GENERATORS = [
  "fbm",
  "fibers",
  "cellular",
  "circuit",
  "grain",
] as const;
export type PatternGenerator = (typeof PATTERN_GENERATORS)[number];

export const PATTERN_BLENDS = ["normal", "multiply", "overlay"] as const;
export type PatternBlend = (typeof PATTERN_BLENDS)[number];

export const PATTERN_ANIMATIONS = ["scroll", "pulse", "flicker"] as const;
export type PatternAnimationKind = (typeof PATTERN_ANIMATIONS)[number];

export const UI_MATERIAL_SLOTS = [
  "panel",
  "dialogue",
  "debrief",
  "gate",
  "map",
] as const;
export type UiMaterialSlot = (typeof UI_MATERIAL_SLOTS)[number];

export type PatternSource =
  | {
      kind: "procedural";
      generator: PatternGenerator;
      seed: number;
    }
  | { kind: "image"; assetId: AssetId }
  | { kind: "atlas"; assetId: AssetId; frame: string };

export interface PatternAnimation {
  kind: PatternAnimationKind;
  speed: number;
}

export interface PatternDefinition {
  id: PatternId;
  family: MaterialFamily;
  source: PatternSource;
  space: PatternSpace;
  scale: number;
  direction?: number;
  contrast?: number;
  blend?: PatternBlend;
  animation?: PatternAnimation;
}

export interface PatternBinding {
  patternId: PatternId;
  space?: PatternSpace;
  scale?: number;
  rotation?: number;
  offset?: { x: number; y: number };
  seed?: number;
  opacity?: number;
  blend?: PatternBlend;
}

export interface MaterialDefinition {
  id: MaterialId;
  family: MaterialFamily;
  palette: string[];
  edge: MaterialEdge;
  patternId?: PatternId;
  direction?: number;
  autotile?: AutotileRule;
  variants?: AtlasFrameRef[];
  variantSet?: VariantSetId;
  tint?: string;
}

export interface TileMaterialRule {
  materialId: MaterialId;
  autotile: AutotileRule;
  variantSet?: VariantSetId;
  variants?: AtlasFrameRef[];
  patternId?: PatternId;
  tint?: string;
}

export interface TileVariantSet {
  id: VariantSetId;
  materialId: MaterialId;
  rule: Extract<AutotileRule, "edge" | "corner" | "blob47" | "wang">;
  atlas?: AssetId;
  frames: Record<string, AtlasFrameRef>;
  fallback: AtlasFrameRef;
}

export interface MaterialsDocument {
  schemaVersion: string;
  id: string;
  materials: Record<MaterialId, MaterialDefinition>;
  patterns?: Record<PatternId, PatternDefinition>;
  variantSets?: Record<VariantSetId, TileVariantSet>;
}

export interface MaterialBinding {
  materialId: MaterialId;
  patternId?: PatternId;
  pattern?: Omit<PatternBinding, "patternId">;
  tint?: string;
}

export interface MaterialCatalog {
  readonly materials: Readonly<Record<MaterialId, MaterialDefinition>>;
  readonly patterns: Readonly<Record<PatternId, PatternDefinition>>;
  readonly variantSets: Readonly<Record<VariantSetId, TileVariantSet>>;
}

export interface ResolvedPatternPlacement {
  pattern: PatternDefinition;
  space: PatternSpace;
  scale: number;
  rotation: number;
  offset: { x: number; y: number };
  seed: number;
  opacity: number;
  blend: PatternBlend;
}

export interface ResolvedMaterialBinding {
  material: MaterialDefinition;
  pattern?: ResolvedPatternPlacement;
  tint?: string;
  warnings: string[];
}

export interface MaterialGrid {
  width: number;
  height: number;
  materialAt(x: number, y: number): MaterialId | null;
  solidAt(x: number, y: number): boolean;
}

export interface PatternBitmap {
  width: number;
  height: number;
  /** RGBA, row-major. */
  data: Uint8ClampedArray;
}

export interface PatternResource {
  /** Stable cache key. */
  key: string;
  kind: "procedural" | "image" | "atlas";
  /** Phaser texture key for generated patterns. */
  textureKey?: string;
  assetId?: AssetId;
  frame?: string;
  bitmap?: PatternBitmap;
  cssBackground?: string;
  cssSize?: string;
  cssPosition?: string;
  cssRepeat?: "repeat" | "no-repeat";
  tileSize: { width: number; height: number };
  animated: boolean;
  animation?: PatternAnimation;
  /** The reduced-motion frame is the generated still; animation is cosmetic. */
  static: boolean;
}
