import type { AssetProvider } from "./provider";
import type {
  AssetCategory,
  AssetDescriptor,
  AssetId,
  AssetManifest,
  AssetSource,
  AssetType,
  ManifestAssetEntry,
} from "./types";
import { supportsVisualCategory } from "./types";

export class ManifestProvider implements AssetProvider {
  readonly label: string;
  readonly source: AssetSource;

  constructor(
    private readonly manifest: AssetManifest,
    source: Exclude<AssetSource, "placeholder">,
  ) {
    this.source = source;
    this.label = source;
  }

  sprite(id: AssetId): AssetDescriptor | null {
    return this.resolveVisual(id, "sprite");
  }

  image(id: AssetId): AssetDescriptor | null {
    return this.resolveVisual(id, "image");
  }

  audio(id: AssetId): AssetDescriptor | null {
    return this.resolve(id, "audio");
  }

  font(id: AssetId): AssetDescriptor | null {
    return this.resolve(id, "font");
  }

  invalidate(): void {
    // The provider is an immutable view over a loaded manifest. `assets`
    // replaces the provider when a different manifest is selected.
  }

  private resolveVisual(
    id: AssetId,
    category: Extract<AssetCategory, "sprite" | "image">,
  ): AssetDescriptor | null {
    return this.resolve(id, category);
  }

  private resolve(id: AssetId, category: AssetCategory): AssetDescriptor | null {
    const entry = this.manifest.assets[id];
    if (!entry || !supportsVisualCategory(category, entry.type)) {
      return null;
    }

    if (!entry.src) {
      // An explicit placeholder entry has no file to load. Returning null lets
      // the fallback chain continue to the procedural provider.
      return null;
    }

    const descriptor: AssetDescriptor = {
      id,
      type: entry.type as AssetType,
      src: entry.src,
      placeholder: false,
      source: this.source,
      ...this.optionalMetadata(entry),
    };

    return descriptor;
  }

  private optionalMetadata(
    entry: ManifestAssetEntry,
  ): Partial<AssetDescriptor> {
    const metadata: Partial<AssetDescriptor> = {};

    if (entry.frameWidth !== undefined) {
      metadata.frameWidth = entry.frameWidth;
    }
    if (entry.frameHeight !== undefined) {
      metadata.frameHeight = entry.frameHeight;
    }
    if (entry.frames !== undefined) {
      metadata.frames = entry.frames;
    }
    if (entry.fps !== undefined) {
      metadata.fps = entry.fps;
    }
    if (entry.loop !== undefined) {
      metadata.loop = entry.loop;
    }
    if (entry.anchor !== undefined) {
      metadata.anchor = entry.anchor;
    }
    if (entry.license !== undefined) {
      metadata.license = entry.license;
    }

    return metadata;
  }
}
