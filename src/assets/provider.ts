import type {
  AssetDescriptor,
  AssetId,
  AssetSource,
} from "./types";

export interface AssetProvider {
  readonly label: string;
  readonly source: AssetSource;
  sprite(id: AssetId): AssetDescriptor | null;
  image(id: AssetId): AssetDescriptor | null;
  audio(id: AssetId): AssetDescriptor | null;
  font(id: AssetId): AssetDescriptor | null;
  invalidate(id?: AssetId): void;
}
