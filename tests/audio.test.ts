import { describe, expect, it, vi } from "vitest";
import {
  AUDIO_STORAGE_KEY,
  createAudio,
  ManifestAudioProvider,
  MemoryAudioStorage,
  NullAudioProvider,
  SynthAudioProvider,
} from "../src/audio";
import type { AssetsModule, ResolvedAsset } from "../src/assets";
import { silentLogger } from "../src/core/logger";

interface FakeParam {
  events: Array<{ method: string; value: number; time: number }>;
  setValueAtTime(value: number, time: number): void;
  linearRampToValueAtTime(value: number, time: number): void;
  exponentialRampToValueAtTime(value: number, time: number): void;
}

function fakeParam(): FakeParam {
  const events: FakeParam["events"] = [];
  return {
    events,
    setValueAtTime(value, time) {
      events.push({ method: "set", value, time });
    },
    linearRampToValueAtTime(value, time) {
      events.push({ method: "linear", value, time });
    },
    exponentialRampToValueAtTime(value, time) {
      events.push({ method: "exponential", value, time });
    },
  };
}

class FakeOscillator {
  type = "sine";
  frequency = fakeParam();
  connect = vi.fn();
  start = vi.fn();
  stop = vi.fn();
}

class FakeGain {
  gain = fakeParam();
  connect = vi.fn();
}

class FakeContext {
  state: AudioContextState = "running";
  currentTime = 0;
  destination = {};
  oscillators: FakeOscillator[] = [];
  gains: FakeGain[] = [];
  resume = vi.fn(async () => undefined);
  close = vi.fn(async () => undefined);

  createOscillator(): FakeOscillator {
    const oscillator = new FakeOscillator();
    this.oscillators.push(oscillator);
    return oscillator;
  }

  createGain(): FakeGain {
    const gain = new FakeGain();
    this.gains.push(gain);
    return gain;
  }
}

function context(fake: FakeContext): AudioContext {
  return fake as unknown as AudioContext;
}

function descriptor(
  overrides: Partial<ResolvedAsset> = {},
): ResolvedAsset {
  return {
    id: "audio.cue.jump",
    type: "audio",
    source: "placeholder",
    placeholderSpec: {
      kind: "synth",
      label: "jump",
      frequency: 440,
      duration: 0.08,
      waveform: "square",
    },
    ...overrides,
  };
}

function assetsFor(audio: (id: string) => ResolvedAsset): AssetsModule {
  return { audio } as unknown as AssetsModule;
}

function silentAssets(): AssetsModule {
  return assetsFor(() => descriptor());
}

describe("audio providers", () => {
  it("keeps the null provider silent without creating a context", async () => {
    let contexts = 0;
    const audio = createAudio({
      assets: silentAssets(),
      provider: new NullAudioProvider(),
      storage: new MemoryAudioStorage(),
      logger: silentLogger,
      contextFactory: () => {
        contexts += 1;
        throw new Error("must not create a context");
      },
    });

    await expect(audio.unlock()).resolves.toBe(true);
    expect(contexts).toBe(0);
    expect(() => audio.play("audio.cue.jump")).not.toThrow();
    expect(contexts).toBe(0);
  });

  it("schedules a synth envelope from the placeholder spec", () => {
    const fake = new FakeContext();
    new SynthAudioProvider().play(context(fake), descriptor(), 0.5);

    expect(fake.oscillators).toHaveLength(1);
    expect(fake.gains).toHaveLength(1);

    const oscillator = fake.oscillators[0];
    const gain = fake.gains[0];
    expect(oscillator?.type).toBe("square");
    expect(oscillator?.frequency.events[0]).toEqual({
      method: "set",
      value: 440,
      time: 0,
    });
    expect(oscillator?.stop).toHaveBeenCalled();
    expect(oscillator?.connect).toHaveBeenCalledWith(gain);
    expect(gain?.connect).toHaveBeenCalledWith(fake.destination);
    expect(gain?.gain.events.map((event) => event.method)).toEqual([
      "set",
      "linear",
      "exponential",
    ]);
    expect(gain?.gain.events[1]?.value).toBeCloseTo(0.175);
  });

  it("warns once and falls back for manifest audio files", () => {
    const fake = new FakeContext();
    const warnings: string[] = [];
    const provider = new ManifestAudioProvider({
      logger: silentLogger,
      onWarning: (message) => warnings.push(message),
      fallback: new SynthAudioProvider(),
    });
    const asset = descriptor({ src: "file:///content/audio/jump.ogg" });

    provider.play(context(fake), asset, 0.5);
    provider.play(context(fake), asset, 0.5);

    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toContain("AUDIO_FILE_PROVIDER_STUB");
    expect(fake.oscillators).toHaveLength(2);
  });
});

describe("audio state", () => {
  it("persists mute and volume through the injected storage", () => {
    const storage = new MemoryAudioStorage();
    const first = createAudio({
      assets: silentAssets(),
      provider: new NullAudioProvider(),
      storage,
      logger: silentLogger,
    });

    first.setMuted(true);
    first.setVolume(0.25);

    expect(JSON.parse(storage.getItem(AUDIO_STORAGE_KEY) ?? "{}")).toEqual({
      muted: true,
      volume: 0.25,
    });

    const second = createAudio({
      assets: silentAssets(),
      provider: new NullAudioProvider(),
      storage,
      logger: silentLogger,
    });
    expect(second.muted).toBe(true);
    expect(second.volume).toBe(0.25);
    expect(second.toggleMuted()).toBe(false);
    expect(
      JSON.parse(storage.getItem(AUDIO_STORAGE_KEY) ?? "{}").muted,
    ).toBe(false);
  });

  it("clamps volume and recovers from malformed settings", () => {
    const storage = new MemoryAudioStorage({
      [AUDIO_STORAGE_KEY]: "not json",
    });
    const warnings: string[] = [];
    const audio = createAudio({
      assets: silentAssets(),
      provider: new NullAudioProvider(),
      storage,
      logger: silentLogger,
      onWarning: (message) => warnings.push(message),
    });

    expect(audio.muted).toBe(false);
    expect(audio.volume).toBe(0.7);
    expect(warnings.join(" ")).toContain("AUDIO_STORAGE_INVALID");

    audio.setVolume(4);
    expect(audio.volume).toBe(1);
    audio.setVolume(-2);
    expect(audio.volume).toBe(0);
    audio.setVolume(Number.NaN);
    expect(audio.volume).toBe(0);
  });

  it("keeps mute working when storage writes fail", () => {
    const warnings: string[] = [];
    const audio = createAudio({
      assets: silentAssets(),
      provider: new NullAudioProvider(),
      storage: {
        getItem: () => null,
        setItem: () => {
          throw new Error("quota");
        },
      },
      logger: silentLogger,
      onWarning: (message) => warnings.push(message),
    });

    expect(audio.toggleMuted()).toBe(true);
    expect(audio.muted).toBe(true);
    expect(warnings.join(" ")).toContain("AUDIO_STORAGE_WRITE_FAILED");
  });
});

describe("audio failures", () => {
  it("waits for unlock, retries a blocked context, then plays", async () => {
    const fake = new FakeContext();
    fake.state = "suspended";
    const warnings: string[] = [];
    const audio = createAudio({
      assets: silentAssets(),
      storage: null,
      logger: silentLogger,
      onWarning: (message) => warnings.push(message),
      contextFactory: () => context(fake),
    });

    audio.play("audio.cue.jump");
    expect(fake.oscillators).toHaveLength(0);

    await expect(audio.unlock()).resolves.toBe(false);
    expect(audio.unlocked).toBe(false);
    expect(warnings.join(" ")).toContain("AUDIO_UNLOCK_BLOCKED");

    fake.state = "running";
    await expect(audio.unlock()).resolves.toBe(true);
    expect(audio.unlocked).toBe(true);

    audio.play("audio.cue.jump");
    expect(fake.oscillators).toHaveLength(1);
  });

  it("warns and stays silent for missing or silent cues", () => {
    const warnings: string[] = [];
    const audio = createAudio({
      assets: assetsFor(() =>
        descriptor({
          placeholderSpec: { kind: "silent", label: "ambient" },
        }),
      ),
      storage: null,
      logger: silentLogger,
      onWarning: (message) => warnings.push(message),
    });

    expect(() => audio.play("audio.music.ambient")).not.toThrow();
    expect(warnings.join(" ")).toContain("AUDIO_CUE_MISSING");
  });

  it("rejects cue IDs that are not audio assets", () => {
    const warnings: string[] = [];
    const audio = createAudio({
      assets: silentAssets(),
      provider: new NullAudioProvider(),
      storage: null,
      logger: silentLogger,
      onWarning: (message) => warnings.push(message),
    });

    expect(() => audio.play("sprite.player.p1")).not.toThrow();
    expect(warnings.join(" ")).toContain("AUDIO_CUE_MISSING");
    expect(warnings.join(" ")).toContain("is not an audio asset ID");
  });

  it("never throws when asset resolution or context creation fails", async () => {
    const warnings: string[] = [];
    const brokenAssets = {
      audio() {
        throw new Error("boom");
      },
    } as unknown as AssetsModule;

    const missing = createAudio({
      assets: brokenAssets,
      provider: new NullAudioProvider(),
      storage: null,
      logger: silentLogger,
      onWarning: (message) => warnings.push(message),
    });
    expect(() => missing.play("audio.cue.jump")).not.toThrow();
    expect(warnings.join(" ")).toContain("AUDIO_CUE_MISSING");

    const noContext = createAudio({
      assets: silentAssets(),
      storage: null,
      logger: silentLogger,
      onWarning: (message) => warnings.push(message),
      contextFactory: () => {
        throw new Error("no Web Audio");
      },
    });
    await expect(noContext.unlock()).resolves.toBe(false);
    expect(warnings.join(" ")).toContain("AUDIO_CONTEXT_UNAVAILABLE");
    expect(() => noContext.play("audio.cue.jump")).not.toThrow();
  });

  it("closes the context on dispose and stops playing", async () => {
    const fake = new FakeContext();
    const audio = createAudio({
      assets: silentAssets(),
      storage: null,
      logger: silentLogger,
      contextFactory: () => context(fake),
    });

    await expect(audio.unlock()).resolves.toBe(true);
    audio.play("audio.cue.jump");
    expect(fake.oscillators).toHaveLength(1);

    audio.dispose();
    expect(audio.unlocked).toBe(false);
    expect(fake.close).toHaveBeenCalledTimes(1);

    audio.play("audio.cue.jump");
    expect(fake.oscillators).toHaveLength(1);
  });
});
