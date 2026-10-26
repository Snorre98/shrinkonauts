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
  /** Used because final audio files do not exist yet. */
  fallback?: AudioProvider;
}

/**
 * M0.2 stub for the final manifest audio provider.
 *
 * The seam is intentionally the same `play(context, asset, volume)` call the
 * real implementation will use: at M3 this class will fetch `asset.src`,
 * decode it via `decodeAudioData`, and play a buffer source. Until final OGG/
 * MP3 files are delivered, a resolved file source warns once and falls back to
 * the cue's placeholder synth/silent spec. It never throws into gameplay.
 */
export class ManifestAudioProvider implements AudioProvider {
  readonly label = "manifest";
  readonly needsContext = true;

  private readonly logger: Logger;
  private readonly onWarning?: (message: string) => void;
  private readonly fallback: AudioProvider;
  private readonly warned = new Set<string>();

  constructor(options: ManifestAudioProviderOptions = {}) {
    this.logger = options.logger ?? consoleLogger;
    this.onWarning = options.onWarning;
    this.fallback = options.fallback ?? new SynthAudioProvider();
  }

  play(
    context: AudioContext | null,
    asset: ResolvedAsset,
    volume: number,
  ): void {
    if (!this.warned.has(asset.id)) {
      this.warned.add(asset.id);
      const message = `AUDIO_FILE_PROVIDER_STUB: ${asset.id} has a file source; final file playback is deferred to M3. Using the placeholder cue.`;
      this.logger.warn(message);
      this.onWarning?.(message);
    }

    this.fallback.play(context, asset, volume);
  }
}
