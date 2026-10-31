export type AssetId = string;

export type AssetType =
  | "sprite"
  | "sheet"
  | "gif"
  | "webp"
  | "image"
  | "background"
  | "atlas"
  | "audio"
  | "font";

export type AssetCategory = "sprite" | "image" | "audio" | "font";

export type AssetSource = "final" | "pack" | "placeholder";

export interface GradientStop {
  offset: number;
  color: string;
}

export interface AtlasRegion {
  x: number;
  y: number;
  width: number;
  height: number;
}

export type AtlasFrameRef =
  | { kind: "asset"; assetId: AssetId }
  | { kind: "atlas"; assetId: AssetId; frame: string };

export interface ResolvedFrame {
  assetId: AssetId;
  textureKey: string;
  frame?: string;
  width: number;
  height: number;
  source: AssetSource;
  src?: string;
  region?: AtlasRegion;
}

export type PlaceholderSpec =
  | {
      kind: "shape";
      width: number;
      height: number;
      fill: string;
      stroke: string;
      strokeWidth: number;
      label: string;
      labelColor: string;
    }
  | {
      kind: "gradient";
      width: number;
      height: number;
      angle: "vertical" | "horizontal" | "diagonal";
      stops: GradientStop[];
    }
  | {
      kind: "tile";
      width: number;
      height: number;
      fill: string;
      edge: string;
      edgeWidth: number;
    }
  | {
      kind: "css";
      label: string;
      background: string;
      color: string;
      border: string;
      radius: number;
    }
  | {
      kind: "font";
      family: string;
      fallback: string;
    }
  | {
      kind: "silent";
      label: string;
    }
  | {
      kind: "synth";
      label: string;
      frequency: number;
      duration: number;
      waveform: "sine" | "square" | "triangle";
    };

export interface AssetDescriptor {
  id: AssetId;
  type: AssetType;
  src?: string;
  frameWidth?: number;
  frameHeight?: number;
  frames?: number;
  fps?: number;
  loop?: boolean;
  anchor?: [number, number];
  placeholder?: boolean;
  license?: string;
  regions?: Record<string, AtlasRegion>;
  width?: number;
  height?: number;
  source: AssetSource;
  placeholderSpec?: PlaceholderSpec;
}

export interface ResolvedAsset extends AssetDescriptor {
  placeholderSpec: PlaceholderSpec;
}

export interface ManifestAssetEntry {
  type: AssetType;
  src?: string;
  frameWidth?: number;
  frameHeight?: number;
  frames?: number;
  fps?: number;
  loop?: boolean;
  anchor?: [number, number];
  placeholder?: boolean;
  license?: string;
  regions?: Record<string, AtlasRegion>;
  width?: number;
  height?: number;
}

export interface AssetManifest {
  schemaVersion: string;
  id: string;
  assets: Record<AssetId, ManifestAssetEntry>;
}

export interface ManifestLoadResult {
  manifest: AssetManifest;
  warnings: string[];
}

export interface PreloadPlan {
  ids: AssetId[];
  descriptors: ResolvedAsset[];
  placeholders: AssetId[];
  missing: AssetId[];
  warnings: string[];
}

export interface ValidationIssue {
  code:
    | "ASSET_SCHEMA_VERSION"
    | "ASSET_MANIFEST_INVALID"
    | "ASSET_FORMAT_UNSUPPORTED"
    | "ASSET_FILE_MISSING"
    | "ASSET_ID_MISSING"
    | "ASSET_ID_INVALID";
  id?: AssetId;
  message: string;
}

export interface ValidationResult {
  ok: boolean;
  issues: ValidationIssue[];
}

export const ASSET_SCHEMA_VERSION = "1.1";

export const VISUAL_TYPES: readonly AssetType[] = [
  "sprite",
  "sheet",
  "gif",
  "webp",
  "image",
  "background",
  "atlas",
];

export const ASSET_TYPES: readonly AssetType[] = [
  ...VISUAL_TYPES,
  "audio",
  "font",
];

export function isVisualType(type: AssetType): boolean {
  return VISUAL_TYPES.includes(type);
}

export function supportsVisualCategory(
  category: AssetCategory,
  type: AssetType,
): boolean {
  if (category === "audio") {
    return type === "audio";
  }
  if (category === "font") {
    return type === "font";
  }
  return isVisualType(type);
}

export function inferCategory(id: AssetId): AssetCategory | null {
  if (id.startsWith("sprite.")) {
    return "sprite";
  }
  if (
    id.startsWith("bg.") ||
    id.startsWith("ui.") ||
    id.startsWith("tileset.") ||
    id.startsWith("tile.")
  ) {
    return "image";
  }
  if (id.startsWith("audio.")) {
    return "audio";
  }
  if (id.startsWith("font.")) {
    return "font";
  }
  return null;
}

export function textureKey(id: AssetId): string {
  return `asset:${id}`;
}
