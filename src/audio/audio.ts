import {
  inferCategory,
  type AssetId,
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
  AudioThemeOptions,
  AudioThemeStopOptions,
  CreateAudioOptions,
} from "./types";

const DEFAULT_VOLUME = 0.7;
const MUSIC_BUS_GAIN = 0.35;
const DEFAULT_THEME_FADE_IN_MS = 800;
const DEFAULT_THEME_FADE_OUT_MS = 1000;
const THEME_CACHE_LIMIT = 2;
const MUSIC_RAMP_SECONDS = 0.15;
const PENDING_CUE_LIMIT = 16;
const PRELOAD_SAMPLE_RATE = 48_000;

interface ActiveTheme {
  assetId: string;
  source: AudioBufferSourceNode;
  gain: GainNode;
  trim: number;
}

interface PendingTheme {
  assetId: string;
  options: AudioThemeOptions;
}

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
  private readonly fetchImpl: typeof fetch;
  private readonly providerOverride?: AudioProvider;
  private readonly nullProvider = new NullAudioProvider();
  private readonly synthProvider = new SynthAudioProvider();
  private readonly manifestProvider: ManifestAudioProvider;
  private readonly warned = new Set<string>();
  private readonly themeWarned = new Set<string>();
  private readonly themeBuffers = new Map<string, AudioBuffer>();
  private readonly themeLoads = new Map<string, Promise<AudioBuffer | null>>();
  private readonly themeFailed = new Set<string>();
  private readonly pendingCues: string[] = [];
  private readonly pendingCueSet = new Set<string>();
  private readonly preloaded = new Set<string>();
  private readonly preloading = new Map<string, Promise<void>>();

  private context: AudioContext | null = null;
  private preloadContext: BaseAudioContext | null = null;
  private musicBus: GainNode | null = null;
  private musicBusValue = 0;
  private activeTheme: ActiveTheme | null = null;
  private pendingTheme: PendingTheme | null = null;
  private themePaused = false;
  private themeRequest = 0;
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
    // Bind to the global receiver so Chrome's fetch does not throw
    // "Illegal invocation" when called as an instance method.
    this.fetchImpl = (options.fetchImpl ?? fetch).bind(globalThis);
    this.providerOverride = options.provider;

    this.manifestProvider = new ManifestAudioProvider({
      logger: this.logger,
      onWarning: this.onWarning,
      fallback: this.synthProvider,
      fetchImpl: this.fetchImpl,
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
      this.pendingTheme = null;
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
      this.flushPendingCues();
      this.startPendingTheme();
      return true;
    } catch (error) {
      this.warnOnce(
        `AUDIO_UNLOCK_BLOCKED: ${error instanceof Error ? error.message : String(error)}. Waiting for the next input.`,
      );
      return false;
    }
  }

  async preload(assetIds: readonly AssetId[]): Promise<void> {
    if (this.disposed || this.providerOverride) {
      return;
    }

    const ids = [...new Set(assetIds)];
    if (ids.length === 0) {
      return;
    }

    const context = this.preloadContextForDecode();
    if (!context) {
      return;
    }

    await Promise.all(
      ids.map(async (id) => {
        if (this.preloaded.has(id)) {
          return;
        }
        const existing = this.preloading.get(id);
        if (existing) {
          await existing;
          return;
        }

        let asset: ResolvedAsset;
        try {
          asset = this.assets.audio(id);
        } catch {
          return;
        }
        if (!asset || asset.type !== "audio" || !asset.src) {
          this.preloaded.add(id);
          return;
        }

        const load = this.manifestProvider
          .preload(context, asset)
          .finally(() => {
            this.preloading.delete(id);
            this.preloaded.add(id);
          });
        this.preloading.set(id, load);
        await load;
      }),
    );
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
      // Queue the cue until the first gesture can create/resume the context.
      this.queueCue(cueId);
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

  playTheme(assetId: string, options: AudioThemeOptions = {}): void {
    if (this.disposed) {
      return;
    }

    if (inferCategory(assetId) !== "audio") {
      this.warnThemeOnce(
        `AUDIO_THEME_MISSING: ${assetId} is not an audio asset ID. Playing silence.`,
      );
      return;
    }

    if (!this.unlockedState) {
      this.pendingTheme = { assetId, options };
      // Decode while the context is still suspended so the first gesture only
      // has to resume playback. The source still starts after unlock().
      if (this.providerOverride?.needsContext !== false) {
        if (this.ensureContext()) {
          void this.loadThemeBuffer(assetId);
        }
      }
      return;
    }

    this.pendingTheme = null;
    this.beginTheme(assetId, options);
  }

  stopTheme(options: AudioThemeStopOptions = {}): void {
    if (this.disposed) {
      return;
    }

    this.pendingTheme = null;
    this.themeRequest += 1;
    const theme = this.activeTheme;
    this.activeTheme = null;
    if (!theme) {
      return;
    }

    const context = this.context;
    if (!context) {
      return;
    }

    const now = context.currentTime;
    const fadeOut =
      Math.max(0, options.fadeOutMs ?? DEFAULT_THEME_FADE_OUT_MS) / 1000;
    this.fadeOutTheme(theme, fadeOut, now);
  }

  pauseTheme(): void {
    if (this.disposed) {
      return;
    }
    this.themePaused = true;
    this.rampMusicBus(0, MUSIC_RAMP_SECONDS);
  }

  resumeTheme(): void {
    if (this.disposed) {
      return;
    }
    this.themePaused = false;
    this.rampMusicBus(this.musicTargetGain(), MUSIC_RAMP_SECONDS);
  }

  setMuted(muted: boolean): void {
    if (this.mutedState === muted) {
      return;
    }
    this.mutedState = muted;
    this.persist();
    this.rampMusicBus(this.musicTargetGain(), MUSIC_RAMP_SECONDS);
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
    this.rampMusicBus(this.musicTargetGain(), MUSIC_RAMP_SECONDS);
  }

  dispose(): void {
    if (this.disposed) {
      return;
    }

    this.disposed = true;
    this.unlockedState = false;
    this.pendingTheme = null;
    this.themeRequest += 1;

    const theme = this.activeTheme;
    this.activeTheme = null;
    if (theme) {
      try {
        theme.source.stop();
      } catch {
        // The source may already have ended.
      }
      try {
        theme.source.disconnect();
        theme.gain.disconnect();
      } catch {
        // Disconnection is best-effort.
      }
    }

    this.themeBuffers.clear();
    this.themeLoads.clear();
    this.themeFailed.clear();
    this.themeWarned.clear();
    this.pendingCues.length = 0;
    this.pendingCueSet.clear();
    this.preloaded.clear();
    this.preloading.clear();

    this.musicBus?.disconnect();
    this.musicBus = null;
    this.musicBusValue = 0;

    const context = this.context;
    this.context = null;
    this.preloadContext = null;

    if (!context || context.state === "closed") {
      return;
    }

    try {
      void context.close().catch(() => undefined);
    } catch {
      // Closing is best-effort; disposal must never throw.
    }
  }

  private startPendingTheme(): void {
    const pending = this.pendingTheme;
    this.pendingTheme = null;
    if (!pending) {
      return;
    }
    this.beginTheme(pending.assetId, pending.options);
  }

  private beginTheme(assetId: string, options: AudioThemeOptions): void {
    if (this.providerOverride?.needsContext === false) {
      return;
    }
    if (!this.ensureContext()) {
      return;
    }

    const request = ++this.themeRequest;
    void this.startTheme(assetId, options, request);
  }

  private async startTheme(
    assetId: string,
    options: AudioThemeOptions,
    request: number,
  ): Promise<void> {
    const buffer = await this.loadThemeBuffer(assetId);
    if (
      !buffer ||
      this.disposed ||
      request !== this.themeRequest ||
      this.activeTheme?.assetId === assetId
    ) {
      return;
    }

    const context = this.context;
    const bus = this.musicBus;
    if (!context || !bus) {
      return;
    }

    const now = context.currentTime;
    const fadeIn =
      Math.max(0, options.fadeInMs ?? DEFAULT_THEME_FADE_IN_MS) / 1000;
    const trim = Math.max(0, Math.min(1, options.gain ?? 1));

    const source = context.createBufferSource();
    source.buffer = buffer;
    source.loop = options.loop ?? true;

    const gain = context.createGain();
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(trim, now + fadeIn);

    source.connect(gain);
    gain.connect(bus);

    try {
      source.start(now);
    } catch (error) {
      this.warnThemeOnce(
        `AUDIO_THEME_LOAD_FAILED: ${assetId} could not start (${error instanceof Error ? error.message : String(error)}). Playing silence.`,
      );
      return;
    }

    const previous = this.activeTheme;
    this.activeTheme = { assetId, source, gain, trim };
    if (previous) {
      this.fadeOutTheme(previous, fadeIn, now);
    }
  }

  private fadeOutTheme(
    theme: ActiveTheme,
    seconds: number,
    now: number,
  ): void {
    theme.gain.gain.cancelScheduledValues(now);
    theme.gain.gain.setValueAtTime(theme.trim, now);
    theme.gain.gain.linearRampToValueAtTime(0, now + seconds);
    try {
      theme.source.stop(now + seconds + 0.02);
    } catch {
      // The source may already have ended.
    }
  }

  private loadThemeBuffer(assetId: string): Promise<AudioBuffer | null> {
    const cached = this.themeBuffers.get(assetId);
    if (cached) {
      this.touchThemeBuffer(assetId);
      return Promise.resolve(cached);
    }
    if (this.themeFailed.has(assetId)) {
      return Promise.resolve(null);
    }

    const existing = this.themeLoads.get(assetId);
    if (existing) {
      return existing;
    }

    const load = this.fetchAndDecodeTheme(assetId);
    this.themeLoads.set(assetId, load);
    void load.then(() => {
      this.themeLoads.delete(assetId);
    });
    return load;
  }

  private async fetchAndDecodeTheme(
    assetId: string,
  ): Promise<AudioBuffer | null> {
    let asset: ResolvedAsset;
    try {
      asset = this.assets.audio(assetId);
    } catch (error) {
      this.themeFailed.add(assetId);
      this.warnThemeOnce(
        `AUDIO_THEME_MISSING: ${assetId} could not be resolved (${error instanceof Error ? error.message : String(error)}). Playing silence.`,
      );
      return null;
    }

    if (!asset || asset.type !== "audio") {
      this.themeFailed.add(assetId);
      this.warnThemeOnce(
        `AUDIO_THEME_MISSING: ${assetId} did not resolve to an audio asset. Playing silence.`,
      );
      return null;
    }

    if (!asset.src) {
      this.themeFailed.add(assetId);
      this.warnThemeOnce(
        `AUDIO_THEME_MISSING: ${assetId} has no file source. Playing silence.`,
      );
      return null;
    }

    const context = this.context;
    if (!context || context.state === "closed") {
      return null;
    }

    try {
      const response = await this.fetchImpl(asset.src);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const data = await response.arrayBuffer();
      const buffer = await context.decodeAudioData(data);
      if (this.disposed) {
        return null;
      }
      this.storeThemeBuffer(assetId, buffer);
      return buffer;
    } catch (error) {
      if (this.disposed) {
        return null;
      }
      this.themeFailed.add(assetId);
      this.warnThemeOnce(
        `AUDIO_THEME_LOAD_FAILED: ${assetId} could not load (${error instanceof Error ? error.message : String(error)}). Playing silence.`,
      );
      return null;
    }
  }

  private storeThemeBuffer(assetId: string, buffer: AudioBuffer): void {
    this.themeBuffers.delete(assetId);
    this.themeBuffers.set(assetId, buffer);

    for (const key of [...this.themeBuffers.keys()]) {
      if (this.themeBuffers.size <= THEME_CACHE_LIMIT) {
        break;
      }
      if (key === assetId || key === this.activeTheme?.assetId) {
        continue;
      }
      this.themeBuffers.delete(key);
    }
  }

  private touchThemeBuffer(assetId: string): void {
    const buffer = this.themeBuffers.get(assetId);
    if (!buffer) {
      return;
    }
    this.themeBuffers.delete(assetId);
    this.themeBuffers.set(assetId, buffer);
  }

  private musicTargetGain(): number {
    if (this.mutedState || this.themePaused) {
      return 0;
    }
    return this.volumeState * MUSIC_BUS_GAIN;
  }

  private rampMusicBus(target: number, seconds: number): void {
    const bus = this.musicBus;
    const context = this.context;
    if (!bus || !context) {
      return;
    }

    const now = context.currentTime;
    bus.gain.cancelScheduledValues(now);
    bus.gain.setValueAtTime(this.musicBusValue, now);
    bus.gain.linearRampToValueAtTime(target, now + Math.max(0, seconds));
    this.musicBusValue = target;
  }

  private warnThemeOnce(message: string): void {
    if (this.themeWarned.has(message)) {
      return;
    }
    this.themeWarned.add(message);
    this.logger.warn(message);
    this.onWarning?.(message);
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

    if (this.context) {
      this.context = null;
      this.musicBus = null;
      this.musicBusValue = 0;
    }

    try {
      const context = this.contextFactory();
      const bus = context.createGain();
      this.context = context;
      this.musicBus = bus;
      this.musicBusValue = this.musicTargetGain();
      bus.gain.setValueAtTime(this.musicBusValue, context.currentTime);
      bus.connect(context.destination);
      return context;
    } catch (error) {
      this.context = null;
      this.musicBus = null;
      this.warnOnce(
        `AUDIO_CONTEXT_UNAVAILABLE: ${error instanceof Error ? error.message : String(error)}. Audio stays silent.`,
      );
      return null;
    }
  }

  private preloadContextForDecode(): BaseAudioContext | null {
    if (
      this.preloadContext &&
      this.preloadContext.state !== "closed"
    ) {
      return this.preloadContext;
    }
    if (this.context && this.context.state !== "closed") {
      return this.context;
    }
    if (typeof OfflineAudioContext !== "undefined") {
      try {
        this.preloadContext = new OfflineAudioContext(
          1,
          1,
          PRELOAD_SAMPLE_RATE,
        );
        return this.preloadContext;
      } catch {
        // Fall through to the real context when the browser lacks offline decode.
      }
    }
    return this.ensureContext();
  }

  private queueCue(cueId: string): void {
    if (this.pendingCueSet.has(cueId)) {
      return;
    }
    if (this.pendingCues.length >= PENDING_CUE_LIMIT) {
      const dropped = this.pendingCues.shift();
      if (dropped) {
        this.pendingCueSet.delete(dropped);
      }
    }
    this.pendingCues.push(cueId);
    this.pendingCueSet.add(cueId);
  }

  private flushPendingCues(): void {
    if (this.pendingCues.length === 0) {
      return;
    }
    const cues = [...this.pendingCues];
    this.pendingCues.length = 0;
    this.pendingCueSet.clear();
    for (const cueId of cues) {
      this.play(cueId);
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
