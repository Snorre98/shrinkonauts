import type { EventBus } from "../core/events";
import { consoleLogger, type Logger } from "../core/logger";
import { FallbackProvider } from "./fallback-provider";
import { ManifestProvider } from "./manifest-provider";
import { PlaceholderProvider } from "./placeholder-provider";
import type { AssetProvider } from "./provider";
import {
  ASSET_TYPES,
  inferCategory,
  textureKey,
  type AssetCategory,
  type AssetDescriptor,
  type AssetId,
  type AssetManifest,
  type AtlasFrameRef,
  type AtlasRegion,
  type PreloadPlan,
  type ResolvedAsset,
  type ResolvedFrame,
  type ValidationIssue,
  type ValidationResult,
} from "./types";

export interface CreateAssetsOptions {
  finalManifest?: AssetManifest | null;
  packManifest?: AssetManifest | null;
  placeholder?: PlaceholderProvider;
  logger?: Logger;
  bus?: EventBus;
}

export interface AssetsModule {
  sprite(id: AssetId): ResolvedAsset;
  image(id: AssetId): ResolvedAsset;
  audio(id: AssetId): ResolvedAsset;
  font(id: AssetId): ResolvedAsset;
  resolveById(id: AssetId): ResolvedAsset | null;
  resolveFrame(ref: AtlasFrameRef): ResolvedFrame | null;
  atlasRegion(assetId: AssetId, frame: string): AtlasRegion | null;
  preload(ids: AssetId[]): PreloadPlan;
  invalidate(id?: AssetId): void;
  validate(ids: AssetId[], manifest?: AssetManifest): ValidationResult;
}

type Resolver = (id: AssetId) => AssetDescriptor | null;

export class DefaultAssetsModule implements AssetsModule {
  private readonly providers: AssetProvider[];
  private readonly fallback: FallbackProvider;
  private readonly placeholder: PlaceholderProvider;
  private readonly cache = new Map<string, ResolvedAsset>();
  private readonly logger: Logger;
  private readonly bus?: EventBus;

  constructor(options: CreateAssetsOptions) {
    this.logger = options.logger ?? consoleLogger;
    this.bus = options.bus;
    this.placeholder = options.placeholder ?? new PlaceholderProvider();

    this.providers = [];
    if (options.finalManifest) {
      this.providers.push(new ManifestProvider(options.finalManifest, "final"));
    }
    if (options.packManifest) {
      this.providers.push(new ManifestProvider(options.packManifest, "pack"));
    }
    this.providers.push(this.placeholder);
    this.fallback = new FallbackProvider(this.providers);
  }

  sprite(id: AssetId): ResolvedAsset {
    return this.resolve("sprite", id);
  }

  image(id: AssetId): ResolvedAsset {
    return this.resolve("image", id);
  }

  audio(id: AssetId): ResolvedAsset {
    return this.resolve("audio", id);
  }

  font(id: AssetId): ResolvedAsset {
    return this.resolve("font", id);
  }

  resolveById(id: AssetId): ResolvedAsset | null {
    const category = inferCategory(id);
    if (!category) {
      return null;
    }
    return this.resolve(category, id);
  }

  atlasRegion(assetId: AssetId, frame: string): AtlasRegion | null {
    const asset = this.resolveById(assetId);
    if (!asset || asset.type !== "atlas") {
      return null;
    }
    return asset.regions?.[frame] ?? null;
  }

  resolveFrame(ref: AtlasFrameRef): ResolvedFrame | null {
    const asset = this.resolveById(ref.assetId);
    if (!asset || asset.type === "audio" || asset.type === "font") {
      return null;
    }

    if (ref.kind === "asset") {
      const width = asset.width ?? asset.frameWidth ?? 32;
      const height = asset.height ?? asset.frameHeight ?? 32;
      return {
        assetId: asset.id,
        textureKey: textureKey(asset.id),
        width,
        height,
        source: asset.source,
        ...(asset.src ? { src: asset.src } : {}),
      };
    }

    if (asset.type !== "atlas") {
      return null;
    }
    const region = asset.regions?.[ref.frame];
    if (!region) {
      return null;
    }
    return {
      assetId: asset.id,
      textureKey: textureKey(asset.id),
      frame: ref.frame,
      width: region.width,
      height: region.height,
      source: asset.source,
      ...(asset.src ? { src: asset.src } : {}),
      region,
    };
  }

  preload(ids: AssetId[]): PreloadPlan {
    const uniqueIds = [...new Set(ids)];
    const descriptors: ResolvedAsset[] = [];
    const placeholders: AssetId[] = [];
    const missing: AssetId[] = [];
    const warnings: string[] = [];

    for (const id of uniqueIds) {
      const resolved = this.resolveById(id);
      if (!resolved) {
        missing.push(id);
        warnings.push(`${id} does not use a recognised asset ID prefix`);
        continue;
      }

      descriptors.push(resolved);
      if (resolved.source === "placeholder" || resolved.placeholder === true) {
        placeholders.push(id);
      }
    }

    return {
      ids: uniqueIds,
      descriptors,
      placeholders,
      missing,
      warnings,
    };
  }

  invalidate(id?: AssetId): void {
    if (id) {
      for (const key of [...this.cache.keys()]) {
        if (key.endsWith(`:${id}`)) {
          this.cache.delete(key);
        }
      }
    } else {
      this.cache.clear();
    }

    this.fallback.invalidate(id);
    this.bus?.emit("assets:invalidated", { id: id ?? null });
  }

  validate(ids: AssetId[], manifest?: AssetManifest): ValidationResult {
    const issues: ValidationIssue[] = [];

    if (manifest) {
      for (const [id, entry] of Object.entries(manifest.assets)) {
        if (!ASSET_TYPES.includes(entry.type)) {
          issues.push({
            code: "ASSET_FORMAT_UNSUPPORTED",
            id,
            message: `${id} uses unsupported type ${String(entry.type)}`,
          });
        }

        if (!entry.src && entry.placeholder !== true) {
          issues.push({
            code: "ASSET_FILE_MISSING",
            id,
            message: `${id} has no src and is not a placeholder`,
          });
        }

        if (
          entry.type === "sheet" &&
          (entry.frameWidth === undefined ||
            entry.frameHeight === undefined ||
            entry.frames === undefined)
        ) {
          issues.push({
            code: "ASSET_MANIFEST_INVALID",
            id,
            message: `${id} is a sheet without frame metadata`,
          });
        }

        if (entry.type === "atlas") {
          if (!entry.regions || Object.keys(entry.regions).length === 0) {
            issues.push({
              code: "ASSET_MANIFEST_INVALID",
              id,
              message: `${id} is an atlas without regions`,
            });
          }
          if (
            entry.frameWidth !== undefined ||
            entry.frameHeight !== undefined ||
            entry.frames !== undefined ||
            entry.fps !== undefined ||
            entry.loop !== undefined
          ) {
            issues.push({
              code: "ASSET_MANIFEST_INVALID",
              id,
              message: `${id} atlas carries animation metadata`,
            });
          }
          if (entry.width !== undefined && entry.height !== undefined) {
            for (const [name, region] of Object.entries(entry.regions ?? {})) {
              if (
                region.x < 0 ||
                region.y < 0 ||
                region.width <= 0 ||
                region.height <= 0 ||
                region.x + region.width > entry.width ||
                region.y + region.height > entry.height
              ) {
                issues.push({
                  code: "ASSET_MANIFEST_INVALID",
                  id,
                  message: `${id} atlas region "${name}" is outside ${entry.width}×${entry.height}`,
                });
              }
            }
          }
        } else if (entry.regions !== undefined) {
          issues.push({
            code: "ASSET_MANIFEST_INVALID",
            id,
            message: `${id} declares atlas regions but is not an atlas`,
          });
        }
      }
    }

    for (const id of ids) {
      const category = inferCategory(id);
      if (!category) {
        issues.push({
          code: "ASSET_ID_INVALID",
          id,
          message: `${id} does not use a recognised asset ID prefix`,
        });
        continue;
      }

      const resolved = this.resolve(category, id);
      if (!resolved.src && resolved.source !== "placeholder") {
        issues.push({
          code: "ASSET_FILE_MISSING",
          id,
          message: `${id} resolved without a file or placeholder`,
        });
      }
    }

    return { ok: issues.length === 0, issues };
  }

  private resolve(category: AssetCategory, id: AssetId): ResolvedAsset {
    const cacheKey = `${category}:${id}`;
    const cached = this.cache.get(cacheKey);
    if (cached) {
      return cached;
    }

    const resolver: Resolver = (assetId) => {
      switch (category) {
        case "sprite":
          return this.fallback.sprite(assetId);
        case "image":
          return this.fallback.image(assetId);
        case "audio":
          return this.fallback.audio(assetId);
        case "font":
          return this.fallback.font(assetId);
      }
    };

    const found = resolver(id);
    const descriptor = found ?? this.placeholderFallback(category, id);
    const spec =
      descriptor.placeholderSpec ??
      this.placeholderFallback(category, id).placeholderSpec;

    if (!spec) {
      this.logger.error(`Placeholder provider failed for ${id}`);
      throw new Error(`ASSET_PLACEHOLDER_FAILED: ${id}`);
    }

    const resolved: ResolvedAsset = {
      ...descriptor,
      source: descriptor.source,
      placeholderSpec: spec,
    };

    this.cache.set(cacheKey, resolved);
    return resolved;
  }

  private placeholderFallback(
    category: AssetCategory,
    id: AssetId,
  ): AssetDescriptor {
    switch (category) {
      case "sprite":
        return this.placeholder.sprite(id);
      case "image":
        return this.placeholder.image(id);
      case "audio":
        return this.placeholder.audio(id);
      case "font":
        return this.placeholder.font(id);
    }
  }
}

export function createAssets(options: CreateAssetsOptions): AssetsModule {
  return new DefaultAssetsModule(options);
}
