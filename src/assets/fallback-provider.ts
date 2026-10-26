import type { AssetProvider } from "./provider";
import type { AssetDescriptor, AssetId, AssetSource } from "./types";

export class FallbackProvider implements AssetProvider {
  readonly label = "fallback";
  readonly source: AssetSource;

  constructor(private readonly providers: AssetProvider[]) {
    const last = providers[providers.length - 1];
    if (!last) {
      throw new Error("FallbackProvider requires at least one provider");
    }
    this.source = last.source;
  }

  sprite(id: AssetId): AssetDescriptor | null {
    return this.first((provider) => provider.sprite(id));
  }

  image(id: AssetId): AssetDescriptor | null {
    return this.first((provider) => provider.image(id));
  }

  audio(id: AssetId): AssetDescriptor | null {
    return this.first((provider) => provider.audio(id));
  }

  font(id: AssetId): AssetDescriptor | null {
    return this.first((provider) => provider.font(id));
  }

  invalidate(id?: AssetId): void {
    for (const provider of this.providers) {
      provider.invalidate(id);
    }
  }

  private first(
    resolve: (provider: AssetProvider) => AssetDescriptor | null,
  ): AssetDescriptor | null {
    for (const provider of this.providers) {
      const descriptor = resolve(provider);
      if (descriptor) {
        return descriptor;
      }
    }
    return null;
  }
}
