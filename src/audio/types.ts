import type { AssetId, AssetsModule, ResolvedAsset } from "../assets";
import type { Logger } from "../core/logger";

/** Minimal storage seam so audio settings can be tested without a browser. */
export interface AudioStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export interface AudioSettings {
  muted: boolean;
  volume: number;
}

/**
 * An audio provider turns a resolved asset descriptor into sound. Providers
 * never know file paths, manifests, or cues: `assets` has already resolved the
 * descriptor, and the audio module owns the context and mute/volume state.
 */
export interface AudioProvider {
  readonly label: string;
  /** Null/silent providers can unlock without constructing Web Audio. */
  readonly needsContext: boolean;
  play(
    context: AudioContext | null,
    asset: ResolvedAsset,
    volume: number,
  ): void;
}

export interface CreateAudioOptions {
  assets: AssetsModule;
  /** Defaults to browser localStorage; null disables persistence. */
  storage?: AudioStorage | null;
  logger?: Logger;
  onWarning?: (message: string) => void;
  /** Injectable for tests/headless environments. */
  contextFactory?: () => AudioContext;
  /**
   * Forces one provider for every cue. Useful for headless/test runs with
   * NullAudioProvider. Without it, cues use the manifest → synth → null chain.
   */
  provider?: AudioProvider;
}

export interface AudioModule {
  /** Must be called from a user gesture. Returns true once running. */
  unlock(): Promise<boolean>;
  play(cueId: AssetId): void;
  setMuted(muted: boolean): void;
  /** Returns the new muted state. */
  toggleMuted(): boolean;
  setVolume(volume: number): void;
  readonly volume: number;
  readonly muted: boolean;
  readonly unlocked: boolean;
  dispose(): void;
}
