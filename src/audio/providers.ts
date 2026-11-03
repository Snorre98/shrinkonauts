import type { ResolvedAsset } from "../assets";
import { consoleLogger, type Logger } from "../core/logger";
import type { AudioProvider } from "./types";

/**
 * Silent provider for tests, headless runs, and intentionally silent cues.
 * It never creates or resumes an AudioContext.
 */
export class NullAudioProvider implements AudioProvider {
  readonly label = "null";
  readonly needsContext = false;

  play(
    _context: AudioContext | null,
    _asset: ResolvedAsset,
    _volume: number,
  ): void {
    // Silence is the whole behaviour.
  }
}

/**
 * Development provider: a short oscillator + gain envelope built from the
 * placeholder spec produced by `assets`. No media files are involved.
 */
export class SynthAudioProvider implements AudioProvider {
  readonly label = "synth";
  readonly needsContext = true;

  play(
    context: AudioContext | null,
    asset: ResolvedAsset,
    volume: number,
  ): void {
    if (!context) {
      return;
    }

    const spec = asset.placeholderSpec;
    if (spec.kind !== "synth") {
      return;
    }

    const now = context.currentTime;
    const duration = Math.max(0.02, spec.duration);
    const peak = Math.max(0.0001, Math.min(1, volume) * 0.35);

    const oscillator = context.createOscillator();
    const gain = context.createGain();

    oscillator.type = spec.waveform;
    oscillator.frequency.setValueAtTime(spec.frequency, now);

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(peak, now + Math.min(0.008, duration / 2));
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start(now);
    oscillator.stop(now + duration + 0.02);
  }
}

export interface ManifestAudioProviderOptions {
  logger?: Logger;
  onWarning?: (message: string) => void;
  /** Placeholder cue used until the file is decoded, or after a failure. */
  fallback?: AudioProvider;
  /** Injectable fetch for tests and non-global-fetch environments. */
  fetchImpl?: typeof fetch;
}

/**
 * File-backed cue provider.
 *
 * It fetches and decodes `asset.src` once, caches the AudioBuffer, and plays a
 * buffer source on later calls. The first uncached play uses the placeholder
 * cue immediately so gameplay feedback is not delayed; once decoding finishes,
 * subsequent plays use the file. Fetch/decode failures warn once and keep the
 * placeholder cue. It never throws into gameplay.
 */
export class ManifestAudioProvider implements AudioProvider {
  readonly label = "manifest";
  readonly needsContext = true;

  private readonly logger: Logger;
  private readonly onWarning?: (message: string) => void;
  private readonly fallback: AudioProvider;
  private readonly fetchImpl: typeof fetch;
  private readonly buffers = new Map<string, AudioBuffer>();
  private readonly loads = new Map<string, Promise<void>>();
  private readonly failed = new Set<string>();
  private readonly warned = new Set<string>();

  constructor(options: ManifestAudioProviderOptions = {}) {
    this.logger = options.logger ?? consoleLogger;
    this.onWarning = options.onWarning;
    this.fallback = options.fallback ?? new SynthAudioProvider();
    // Bind to the global receiver so Chrome's fetch does not throw
    // "Illegal invocation" when called as an instance method.
    this.fetchImpl = (options.fetchImpl ?? fetch).bind(globalThis);
  }

  play(
    context: AudioContext | null,
    asset: ResolvedAsset,
    volume: number,
  ): void {
    if (!context || !asset.src) {
      this.fallback.play(context, asset, volume);
      return;
    }

    const buffer = this.buffers.get(asset.id);
    if (buffer) {
      this.playBuffer(context, buffer, volume);
      return;
    }

    // Keep the cue responsive on its first occurrence while the file loads.
    this.fallback.play(context, asset, volume);
    void this.load(context, asset);
  }

  private async load(
    context: AudioContext,
    asset: ResolvedAsset,
  ): Promise<void> {
    if (this.failed.has(asset.id) || !asset.src) return;
    const existing = this.loads.get(asset.id);
    if (existing) {
      await existing;
      return;
    }

    const load = this.decode(context, asset);
    this.loads.set(asset.id, load);
    try {
      await load;
    } finally {
      this.loads.delete(asset.id);
    }
  }

  private async decode(
    context: AudioContext,
    asset: ResolvedAsset,
  ): Promise<void> {
    try {
      const response = await this.fetchImpl(asset.src as string);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const data = await response.arrayBuffer();
      const buffer = await context.decodeAudioData(data);
      this.buffers.set(asset.id, buffer);
    } catch (error) {
      this.failed.add(asset.id);
      this.warnOnce(
        `AUDIO_FILE_LOAD_FAILED: ${asset.id} could not load from file (${error instanceof Error ? error.message : String(error)}). Using the placeholder cue.`,
      );
    }
  }

  private playBuffer(
    context: AudioContext,
    buffer: AudioBuffer,
    volume: number,
  ): void {
    const now = context.currentTime;
    const source = context.createBufferSource();
    const gain = context.createGain();
    source.buffer = buffer;
    gain.gain.setValueAtTime(Math.max(0, Math.min(1, volume)), now);
    source.connect(gain);
    gain.connect(context.destination);
    source.start(now);
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
