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

/** Options for a room/menu music theme. */
export interface AudioThemeOptions {
  /** Default true. Looping is sample-accurate through AudioBufferSourceNode. */
  loop?: boolean;
  /** Gain ramp-in time; defaults to 800 ms. */
  fadeInMs?: number;
  /** Optional per-theme trim, multiplied with the music bus. Defaults to 1. */
  gain?: number;
}

export interface AudioThemeStopOptions {
  /** Gain ramp-out time; defaults to 1000 ms. */
  fadeOutMs?: number;
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
  /** Injectable fetch used by file-backed cues and themes. */
  fetchImpl?: typeof fetch;
  /**
   * Forces one provider for every cue. Useful for headless/test runs with
   * NullAudioProvider. Without it, cues use the manifest → synth → null chain.
   */
  provider?: AudioProvider;
}

export interface AudioModule {
  /** Must be called from a user gesture. Returns true once running. */
  unlock(): Promise<boolean>;
  /**
   * Fetch and decode file-backed cues ahead of playback. Safe before unlock;
   * failures are warned once and leave the normal fallback path intact.
   */
  preload(assetIds: readonly AssetId[]): Promise<void>;
  play(cueId: AssetId): void;
  /** Plays a loopable room/menu theme through the music bus. */
  playTheme(assetId: AssetId, options?: AudioThemeOptions): void;
  stopTheme(options?: AudioThemeStopOptions): void;
  /** Ramps the music bus to silence without stopping the loop. */
  pauseTheme(): void;
  resumeTheme(): void;
  setMuted(muted: boolean): void;
  /** Returns the new muted state. */
  toggleMuted(): boolean;
  setVolume(volume: number): void;
  readonly volume: number;
  readonly muted: boolean;
  readonly unlocked: boolean;
  dispose(): void;
}
