import { err, ok, type Result } from "../core/result";
import {
  bitmapToSvgDataUrl,
  generatePatternBitmap,
} from "./patterns";
import {
  resolvePatternPlacement,
  type PatternOverrides,
} from "./resolve";
import type {
  PatternBitmap,
  PatternDefinition,
  PatternResource,
} from "./types";

export interface PatternAssetView {
  id: string;
  type: string;
  src?: string;
  width?: number;
  height?: number;
  frameWidth?: number;
  frameHeight?: number;
  regions?: Record<
    string,
    { x: number; y: number; width: number; height: number }
  >;
}

export interface PatternAssetResolver {
  resolveById(id: string): PatternAssetView | null;
}

export interface PatternProvider {
  resolve(
    definition: PatternDefinition,
    overrides?: PatternOverrides,
  ): Result<PatternResource, string>;
  invalidate(patternId?: string): void;
}

export interface PatternProviderOptions {
  assets?: PatternAssetResolver;
  bitmapSize?: number;
}

export function createPatternProvider(
  options: PatternProviderOptions = {},
): PatternProvider {
  const resources = new Map<string, PatternResource>();
  const bitmaps = new Map<string, PatternBitmap>();
  const size = options.bitmapSize ?? 32;

  const provider: PatternProvider = {
    resolve(definition, overrides) {
      if (!(definition.scale > 0) || (overrides?.scale ?? 1) <= 0) {
        return err(`PATTERN_SCALE_INVALID: ${definition.id}`);
      }

      const placement = resolvePatternPlacement(definition, overrides);
      const key = [
        definition.id,
        placement.space,
        placement.scale,
        placement.rotation,
        placement.seed,
        placement.opacity,
        placement.blend,
        placement.offset.x,
        placement.offset.y,
      ].join(":");
      const cached = resources.get(key);
      if (cached) {
        return ok(cached);
      }

      const source = definition.source;
      if (source.kind === "procedural") {
        const bitmapKey = [
          source.generator,
          source.seed,
          placement.rotation,
          definition.contrast ?? 0.5,
          size,
        ].join(":");
        let bitmap = bitmaps.get(bitmapKey);
        if (!bitmap) {
          bitmap = generatePatternBitmap(source, {
            size,
            direction: placement.rotation,
            contrast: definition.contrast,
          });
          bitmaps.set(bitmapKey, bitmap);
        }
        const resource: PatternResource = {
          key,
          kind: "procedural",
          textureKey: `pattern:${key}`,
          bitmap,
          cssBackground: `url("${bitmapToSvgDataUrl(bitmap)}")`,
          cssSize: `${bitmap.width * placement.scale}px ${bitmap.height * placement.scale}px`,
          cssPosition: "0 0",
          cssRepeat: "repeat",
          tileSize: {
            width: bitmap.width * placement.scale,
            height: bitmap.height * placement.scale,
          },
          animated: false,
          static: true,
        };
        resources.set(key, resource);
        return ok(resource);
      }

      const asset = options.assets?.resolveById(source.assetId);
      if (!asset) {
        return err(`PATTERN_ASSET_MISSING: ${definition.id} (${source.assetId})`);
      }

      if (source.kind === "image") {
        if (asset.type === "audio" || asset.type === "font") {
          return err(`PATTERN_ASSET_INVALID: ${definition.id} (${source.assetId})`);
        }
        const width = asset.width ?? asset.frameWidth ?? 32;
        const height = asset.height ?? asset.frameHeight ?? 32;
        const resource: PatternResource = {
          key,
          kind: "image",
          assetId: asset.id,
          ...(asset.src
            ? { cssBackground: `url("${asset.src}")` }
            : {}),
          cssSize: `${width * placement.scale}px ${height * placement.scale}px`,
          cssPosition: "0 0",
          cssRepeat: "repeat",
          tileSize: {
            width: width * placement.scale,
            height: height * placement.scale,
          },
          animated: false,
          static: true,
        };
        resources.set(key, resource);
        return ok(resource);
      }

      const region = asset.regions?.[source.frame];
      if (asset.type !== "atlas" || !region) {
        return err(
          `PATTERN_FRAME_MISSING: ${definition.id} (${source.assetId}#${source.frame})`,
        );
      }
      const atlasWidth =
        asset.width ??
        Math.max(...Object.values(asset.regions ?? {}).map((item) => item.x + item.width));
      const atlasHeight =
        asset.height ??
        Math.max(...Object.values(asset.regions ?? {}).map((item) => item.y + item.height));
      const resource: PatternResource = {
        key,
        kind: "atlas",
        assetId: asset.id,
        frame: source.frame,
        ...(asset.src ? { cssBackground: `url("${asset.src}")` } : {}),
        cssSize: `${atlasWidth * placement.scale}px ${atlasHeight * placement.scale}px`,
        cssPosition: `-${region.x * placement.scale}px -${region.y * placement.scale}px`,
        cssRepeat: "no-repeat",
        tileSize: {
          width: region.width * placement.scale,
          height: region.height * placement.scale,
        },
        animated: false,
        static: true,
      };
      resources.set(key, resource);
      return ok(resource);
    },

    invalidate(patternId) {
      if (patternId === undefined) {
        resources.clear();
      } else {
        for (const key of [...resources.keys()]) {
          if (key.startsWith(`${patternId}:`)) resources.delete(key);
        }
      }
      bitmaps.clear();
    },
  };

  return provider;
}
