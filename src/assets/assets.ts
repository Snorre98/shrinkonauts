import type { EventBus } from "../core/events";
import { consoleLogger, type Logger } from "../core/logger";
import { FallbackProvider } from "./fallback-provider";
import { ManifestProvider } from "./manifest-provider";
import { PlaceholderProvider } from "./placeholder-provider";
import type { AssetProvider } from "./provider";
import {
  ASSET_TYPES,
  inferCategory,
  type AssetCategory,
  type AssetDescriptor,
  type AssetId,
  type AssetManifest,
  type PreloadPlan,
  type ResolvedAsset,
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
      if (resolved.source === "placeholder") {
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
