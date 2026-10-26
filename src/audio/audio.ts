import {
  inferCategory,
  type AssetsModule,
  type ResolvedAsset,
} from "../assets";
import { consoleLogger, type Logger } from "../core/logger";
import {
  ManifestAudioProvider,
  NullAudioProvider,
  SynthAudioProvider,
} from "./providers";
import { AUDIO_STORAGE_KEY, createBrowserAudioStorage } from "./storage";
import type {
  AudioModule,
  AudioProvider,
  AudioSettings,
  AudioStorage,
  CreateAudioOptions,
} from "./types";

const DEFAULT_VOLUME = 0.7;

function clampVolume(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function browserContextFactory(): AudioContext {
  const constructor =
    (globalThis as { AudioContext?: typeof AudioContext }).AudioContext ??
    (globalThis as { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext;

  if (!constructor) {
    throw new Error("AUDIO_CONTEXT_UNAVAILABLE: Web Audio is not supported");
  }

  return new constructor();
}

/**
 * Owns the Web Audio context, mute/volume state, and provider selection.
 * Gameplay only sees semantic cues; this module never throws into the loop.
 */
export class DefaultAudioModule implements AudioModule {
  private readonly assets: AssetsModule;
  private readonly logger: Logger;
  private readonly storage: AudioStorage | null;
  private readonly onWarning?: (message: string) => void;
  private readonly contextFactory: () => AudioContext;
  private readonly providerOverride?: AudioProvider;
  private readonly nullProvider = new NullAudioProvider();
  private readonly synthProvider = new SynthAudioProvider();
  private readonly manifestProvider: ManifestAudioProvider;
  private readonly warned = new Set<string>();

  private context: AudioContext | null = null;
  private mutedState = false;
  private volumeState = DEFAULT_VOLUME;
  private unlockedState = false;
  private disposed = false;

  constructor(options: CreateAudioOptions) {
    this.assets = options.assets;
    this.logger = options.logger ?? consoleLogger;
    this.storage =
      options.storage === undefined
        ? createBrowserAudioStorage()
        : options.storage;
    this.onWarning = options.onWarning;
    this.contextFactory = options.contextFactory ?? browserContextFactory;
    this.providerOverride = options.provider;

    this.manifestProvider = new ManifestAudioProvider({
      logger: this.logger,
      onWarning: this.onWarning,
      fallback: this.synthProvider,
    });

    const settings = this.readSettings();
    this.mutedState = settings.muted;
    this.volumeState = settings.volume;
  }

  get volume(): number {
    return this.volumeState;
  }

  get muted(): boolean {
    return this.mutedState;
  }

  get unlocked(): boolean {
    return this.unlockedState;
  }

  async unlock(): Promise<boolean> {
    if (this.disposed) {
      return false;
    }
    if (this.unlockedState) {
      return true;
    }

    // A null provider is already "unlocked": there is nothing to resume.
    if (this.providerOverride && !this.providerOverride.needsContext) {
      this.unlockedState = true;
      return true;
    }

    const context = this.ensureContext();
    if (!context) {
      return false;
    }

    try {
      if (context.state === "suspended") {
        await context.resume();
      }

      if (context.state !== "running") {
        this.warnOnce(
          "AUDIO_UNLOCK_BLOCKED: the browser did not resume the audio context. Waiting for the next input.",
        );
        return false;
      }

      this.unlockedState = true;
      return true;
    } catch (error) {
      this.warnOnce(
        `AUDIO_UNLOCK_BLOCKED: ${error instanceof Error ? error.message : String(error)}. Waiting for the next input.`,
      );
      return false;
    }
  }

  play(cueId: string): void {
    if (this.disposed || this.mutedState) {
      return;
    }

    if (inferCategory(cueId) !== "audio") {
      this.warnOnce(
        `AUDIO_CUE_MISSING: ${cueId} is not an audio asset ID. Playing nothing.`,
      );
      return;
    }

    let asset: ResolvedAsset;
    try {
      asset = this.assets.audio(cueId);
    } catch (error) {
      this.warnOnce(
        `AUDIO_CUE_MISSING: ${cueId} could not be resolved (${error instanceof Error ? error.message : String(error)}). Playing nothing.`,
      );
      return;
    }

    if (!asset || asset.type !== "audio") {
      this.warnOnce(
        `AUDIO_CUE_MISSING: ${cueId} did not resolve to an audio asset. Playing nothing.`,
      );
      return;
    }

    const provider = this.providerFor(asset);

    if (provider.needsContext && !this.unlockedState) {
      // Before the first gesture there is no context; stay silent rather than
      // creating one outside a user gesture.
      return;
    }

    try {
      if (provider.needsContext) {
        const context = this.ensureContext();
        if (!context) {
          return;
        }
        provider.play(context, asset, this.volumeState);
      } else {
        provider.play(null, asset, this.volumeState);
      }
    } catch (error) {
      this.warnOnce(
        `AUDIO_PLAYBACK_FAILED: ${cueId} could not play (${error instanceof Error ? error.message : String(error)}). Playing nothing.`,
      );
    }
  }

  setMuted(muted: boolean): void {
    if (this.mutedState === muted) {
      return;
    }
    this.mutedState = muted;
    this.persist();
  }

  toggleMuted(): boolean {
    this.setMuted(!this.mutedState);
    return this.mutedState;
  }

  setVolume(volume: number): void {
    if (!Number.isFinite(volume)) {
      return;
    }
    const next = clampVolume(volume);
    if (this.volumeState === next) {
      return;
    }
    this.volumeState = next;
    this.persist();
  }

  dispose(): void {
    if (this.disposed) {
      return;
    }

    this.disposed = true;
    this.unlockedState = false;

    const context = this.context;
    this.context = null;
    if (!context || context.state === "closed") {
      return;
    }

    try {
      void context.close().catch(() => undefined);
    } catch {
      // Closing is best-effort; disposal must never throw.
    }
  }

  private providerFor(asset: ResolvedAsset): AudioProvider {
    if (this.providerOverride) {
      return this.providerOverride;
    }
    if (asset.src) {
      return this.manifestProvider;
    }
    if (asset.placeholderSpec.kind === "synth") {
      return this.synthProvider;
    }

    this.warnOnce(
      `AUDIO_CUE_MISSING: ${asset.id} resolves to a silent placeholder. Playing nothing.`,
    );
    return this.nullProvider;
  }

  private ensureContext(): AudioContext | null {
    if (this.context && this.context.state !== "closed") {
      return this.context;
    }

    try {
      this.context = this.contextFactory();
      return this.context;
    } catch (error) {
      this.context = null;
      this.warnOnce(
        `AUDIO_CONTEXT_UNAVAILABLE: ${error instanceof Error ? error.message : String(error)}. Audio stays silent.`,
      );
      return null;
    }
  }

  private readSettings(): AudioSettings {
    const fallback: AudioSettings = {
      muted: false,
      volume: DEFAULT_VOLUME,
    };

    if (!this.storage) {
      return fallback;
    }

    let raw: string | null;
    try {
      raw = this.storage.getItem(AUDIO_STORAGE_KEY);
    } catch (error) {
      this.warnOnce(
        `AUDIO_STORAGE_READ_FAILED: ${error instanceof Error ? error.message : String(error)}. Using default audio settings.`,
      );
      return fallback;
    }

    if (!raw) {
      return fallback;
    }

    try {
      const parsed: unknown = JSON.parse(raw);
      if (
        !isRecord(parsed) ||
        typeof parsed.muted !== "boolean" ||
        typeof parsed.volume !== "number" ||
        !Number.isFinite(parsed.volume)
      ) {
        throw new Error("expected { muted: boolean, volume: number }");
      }

      return {
        muted: parsed.muted,
        volume: clampVolume(parsed.volume),
      };
    } catch (error) {
      this.warnOnce(
        `AUDIO_STORAGE_INVALID: ${error instanceof Error ? error.message : String(error)}. Using default audio settings.`,
      );
      return fallback;
    }
  }

  private persist(): void {
    if (!this.storage) {
      return;
    }

    try {
      this.storage.setItem(
        AUDIO_STORAGE_KEY,
        JSON.stringify({ muted: this.mutedState, volume: this.volumeState }),
      );
    } catch (error) {
      this.warnOnce(
        `AUDIO_STORAGE_WRITE_FAILED: ${error instanceof Error ? error.message : String(error)}. Changes apply for this session only.`,
      );
    }
  }

  private warnOnce(message: string): void {
    if (this.warned.has(message)) {
      return;
    }
    this.warned.add(message);
    this.logger.warn(message);
    this.onWarning?.(message);
  }
}

export function createAudio(options: CreateAudioOptions): AudioModule {
  return new DefaultAudioModule(options);
}
