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
  cancelScheduledValues(time: number): void;
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
    cancelScheduledValues(time) {
      events.push({ method: "cancel", value: 0, time });
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
  disconnect = vi.fn();
}

class FakeBufferSource {
  buffer: AudioBuffer | null = null;
  loop = false;
  connect = vi.fn();
  disconnect = vi.fn();
  start = vi.fn();
  stop = vi.fn();
}

class FakeContext {
  state: AudioContextState = "running";
  currentTime = 0;
  destination = {};
  oscillators: FakeOscillator[] = [];
  gains: FakeGain[] = [];
  bufferSources: FakeBufferSource[] = [];
  decoded = vi.fn(async () => ({ duration: 30 }) as AudioBuffer);
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

  createBufferSource(): FakeBufferSource {
    const source = new FakeBufferSource();
    this.bufferSources.push(source);
    return source;
  }

  decodeAudioData(_data: ArrayBuffer): Promise<AudioBuffer> {
    return this.decoded();
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

function themeDescriptor(
  overrides: Partial<ResolvedAsset> = {},
): ResolvedAsset {
  return descriptor({
    id: "audio.music.menu",
    src: "https://example.test/theme-menu.ogg",
    placeholderSpec: { kind: "silent", label: "menu" },
    ...overrides,
  });
}

function themeAssets(): AssetsModule {
  return assetsFor((id) =>
    id.startsWith("audio.music.")
      ? themeDescriptor({ id, src: `https://example.test/${id}.ogg` })
      : descriptor(),
  );
}

function fetchOk(): typeof fetch {
  return vi.fn(async () => ({
    ok: true,
    status: 200,
    arrayBuffer: async () => new ArrayBuffer(8),
  })) as unknown as typeof fetch;
}

function pendingLoad(
  provider: ManifestAudioProvider,
  assetId: string,
): Promise<void> | undefined {
  const loads = (
    provider as unknown as { loads: Map<string, Promise<void>> }
  ).loads;
  return loads.get(assetId);
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

  it("loads, caches, and plays manifest audio files", async () => {
    const fake = new FakeContext();
    const warnings: string[] = [];
    const fetchImpl = fetchOk();
    const provider = new ManifestAudioProvider({
      logger: silentLogger,
      onWarning: (message) => warnings.push(message),
      fallback: new SynthAudioProvider(),
      fetchImpl,
    });
    const asset = descriptor({ src: "https://example.test/jump.ogg" });

    provider.play(context(fake), asset, 0.5);
    expect(fake.oscillators).toHaveLength(1);

    await pendingLoad(provider, asset.id);

    provider.play(context(fake), asset, 0.5);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(warnings).toHaveLength(0);
    expect(fake.oscillators).toHaveLength(1);
    expect(fake.bufferSources).toHaveLength(1);

    const source = fake.bufferSources[0];
    expect(source?.buffer).toEqual({ duration: 30 });
    expect(source?.start).toHaveBeenCalled();
    expect(source?.connect).toHaveBeenCalledWith(fake.gains[1]);
  });

  it("binds the injected fetch to the global receiver", async () => {
    const fake = new FakeContext();
    const warnings: string[] = [];
    const receivers: unknown[] = [];
    const fetchImpl = vi.fn(function (this: unknown) {
      receivers.push(this);
      if (this !== globalThis) {
        throw new TypeError("Illegal invocation");
      }
      return Promise.resolve({
        ok: true,
        status: 200,
        arrayBuffer: async () => new ArrayBuffer(8),
      });
    }) as unknown as typeof fetch;
    const provider = new ManifestAudioProvider({
      logger: silentLogger,
      onWarning: (message) => warnings.push(message),
      fallback: new SynthAudioProvider(),
      fetchImpl,
    });
    const asset = descriptor({ src: "https://example.test/jump.mp3" });

    provider.play(context(fake), asset, 0.5);
    await pendingLoad(provider, asset.id);
    provider.play(context(fake), asset, 0.5);

    expect(receivers).toEqual([globalThis]);
    expect(warnings).toHaveLength(0);
    expect(fake.bufferSources).toHaveLength(1);
  });

  it("warns once and keeps the placeholder when a file fails", async () => {
    const fake = new FakeContext();
    const warnings: string[] = [];
    const fetchImpl = vi.fn(async () => ({
      ok: false,
      status: 404,
      arrayBuffer: async () => new ArrayBuffer(0),
    })) as unknown as typeof fetch;
    const provider = new ManifestAudioProvider({
      logger: silentLogger,
      onWarning: (message) => warnings.push(message),
      fallback: new SynthAudioProvider(),
      fetchImpl,
    });
    const asset = descriptor({ src: "https://example.test/missing.ogg" });

    provider.play(context(fake), asset, 0.5);
    await pendingLoad(provider, asset.id);

    provider.play(context(fake), asset, 0.5);

    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toContain("AUDIO_FILE_LOAD_FAILED");
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(fake.bufferSources).toHaveLength(0);
    expect(fake.oscillators).toHaveLength(2);
  });
});

describe("audio preloading", () => {
  it("loads decoded cues before the first play", async () => {
    const fake = new FakeContext();
    const fetchImpl = fetchOk();
    const audio = createAudio({
      assets: assetsFor((id) =>
        descriptor({ id, src: `https://example.test/${id}.mp3` }),
      ),
      storage: null,
      logger: silentLogger,
      fetchImpl,
      contextFactory: () => context(fake),
    });

    await audio.preload(["audio.cue.jump", "audio.cue.land"]);
    await expect(audio.unlock()).resolves.toBe(true);
    audio.play("audio.cue.jump");

    expect(fetchImpl).toHaveBeenCalledTimes(2);
    expect(fake.oscillators).toHaveLength(0);
    expect(fake.bufferSources).toHaveLength(1);
  });

  it("queues cues until unlock and flushes the decoded buffer", async () => {
    const fake = new FakeContext();
    const audio = createAudio({
      assets: assetsFor((id) =>
        descriptor({ id, src: `https://example.test/${id}.mp3` }),
      ),
      storage: null,
      logger: silentLogger,
      fetchImpl: fetchOk(),
      contextFactory: () => context(fake),
    });

    await audio.preload(["audio.cue.jump"]);
    audio.play("audio.cue.jump");
    expect(fake.bufferSources).toHaveLength(0);

    await expect(audio.unlock()).resolves.toBe(true);

    expect(fake.oscillators).toHaveLength(0);
    expect(fake.bufferSources).toHaveLength(1);
  });
});

describe("audio themes", () => {
  it("queues a theme until unlock, then plays a loop through the music bus", async () => {
    const fake = new FakeContext();
    const audio = createAudio({
      assets: themeAssets(),
      storage: null,
      logger: silentLogger,
      fetchImpl: fetchOk(),
      contextFactory: () => context(fake),
    });

    audio.playTheme("audio.music.menu");
    expect(fake.bufferSources).toHaveLength(0);

    await expect(audio.unlock()).resolves.toBe(true);
    await vi.waitFor(() => expect(fake.bufferSources).toHaveLength(1));

    const source = fake.bufferSources[0];
    const musicBus = fake.gains[0];
    const themeGain = fake.gains[1];
    expect(source?.loop).toBe(true);
    expect(source?.connect).toHaveBeenCalledWith(themeGain);
    expect(themeGain?.connect).toHaveBeenCalledWith(musicBus);
    expect(musicBus?.connect).toHaveBeenCalledWith(fake.destination);
    expect(musicBus?.gain.events[0]?.value).toBeCloseTo(0.245);
  });

  it("invokes theme fetch with the global receiver", async () => {
    const fake = new FakeContext();
    const warnings: string[] = [];
    const receivers: unknown[] = [];
    const fetchImpl = vi.fn(function (this: unknown) {
      receivers.push(this);
      if (this !== globalThis) {
        throw new TypeError("Illegal invocation");
      }
      return Promise.resolve({
        ok: true,
        status: 200,
        arrayBuffer: async () => new ArrayBuffer(8),
      });
    }) as unknown as typeof fetch;
    const audio = createAudio({
      assets: themeAssets(),
      storage: null,
      logger: silentLogger,
      onWarning: (message) => warnings.push(message),
      fetchImpl,
      contextFactory: () => context(fake),
    });

    audio.playTheme("audio.music.menu");
    await expect(audio.unlock()).resolves.toBe(true);
    await vi.waitFor(() => expect(fake.bufferSources).toHaveLength(1));

    expect(receivers).toEqual([globalThis]);
    expect(warnings).toHaveLength(0);
  });

  it("crossfades the old theme out and the new theme in", async () => {
    const fake = new FakeContext();
    const audio = createAudio({
      assets: themeAssets(),
      storage: null,
      logger: silentLogger,
      fetchImpl: fetchOk(),
      contextFactory: () => context(fake),
    });

    audio.playTheme("audio.music.nerve_forest");
    await audio.unlock();
    await vi.waitFor(() => expect(fake.bufferSources).toHaveLength(1));

    const firstSource = fake.bufferSources[0];
    const firstGain = fake.gains[1];

    audio.playTheme("audio.music.muscle_effector");
    await vi.waitFor(() => expect(fake.bufferSources).toHaveLength(2));

    const secondGain = fake.gains[2];
    expect(firstSource?.stop).toHaveBeenCalled();
    expect(
      firstGain?.gain.events.some(
        (event) => event.method === "linear" && event.value === 0,
      ),
    ).toBe(true);
    expect(
      secondGain?.gain.events.some(
        (event) => event.method === "linear" && event.value === 1,
      ),
    ).toBe(true);
  });

  it("ramps pause and resume without stopping the source", async () => {
    const fake = new FakeContext();
    const audio = createAudio({
      assets: themeAssets(),
      storage: null,
      logger: silentLogger,
      fetchImpl: fetchOk(),
      contextFactory: () => context(fake),
    });

    audio.playTheme("audio.music.menu");
    await audio.unlock();
    await vi.waitFor(() => expect(fake.bufferSources).toHaveLength(1));

    const source = fake.bufferSources[0];
    const musicBus = fake.gains[0];

    audio.pauseTheme();
    expect(musicBus?.gain.events.at(-1)).toMatchObject({
      method: "linear",
      value: 0,
    });
    expect(source?.stop).not.toHaveBeenCalled();

    audio.resumeTheme();
    expect(musicBus?.gain.events.at(-1)?.value).toBeCloseTo(0.245);
  });

  it("silences music and cues on mute and restores the configured level", async () => {
    const fake = new FakeContext();
    const audio = createAudio({
      assets: assetsFor((id) =>
        id.startsWith("audio.music.")
          ? themeDescriptor({ id, src: `https://example.test/${id}.ogg` })
          : descriptor(),
      ),
      storage: null,
      logger: silentLogger,
      fetchImpl: fetchOk(),
      contextFactory: () => context(fake),
    });

    audio.playTheme("audio.music.menu");
    await audio.unlock();
    await vi.waitFor(() => expect(fake.bufferSources).toHaveLength(1));

    const musicBus = fake.gains[0];
    audio.setMuted(true);
    expect(musicBus?.gain.events.at(-1)).toMatchObject({
      method: "linear",
      value: 0,
    });
    audio.play("audio.cue.jump");
    expect(fake.oscillators).toHaveLength(0);

    audio.setMuted(false);
    expect(musicBus?.gain.events.at(-1)?.value).toBeCloseTo(0.245);
    audio.play("audio.cue.jump");
    expect(fake.oscillators).toHaveLength(1);
  });

  it("warns once and stays silent when a theme has no file", async () => {
    const fake = new FakeContext();
    const warnings: string[] = [];
    const audio = createAudio({
      assets: assetsFor(() =>
        descriptor({
          id: "audio.music.menu",
          placeholderSpec: { kind: "silent", label: "menu" },
        }),
      ),
      storage: null,
      logger: silentLogger,
      onWarning: (message) => warnings.push(message),
      contextFactory: () => context(fake),
    });

    expect(() => audio.playTheme("audio.music.menu")).not.toThrow();
    await audio.unlock();

    await vi.waitFor(() =>
      expect(warnings.join(" ")).toContain("AUDIO_THEME_MISSING"),
    );
    expect(fake.bufferSources).toHaveLength(0);

    audio.playTheme("audio.music.menu");
    expect(
      warnings.filter((warning) =>
        warning.includes("AUDIO_THEME_MISSING"),
      ),
    ).toHaveLength(1);
  });

  it("warns once and stays silent when a theme file fails to load", async () => {
    const fake = new FakeContext();
    const warnings: string[] = [];
    const fetchImpl = vi.fn(async () => {
      throw new Error("network down");
    }) as unknown as typeof fetch;
    const audio = createAudio({
      assets: themeAssets(),
      storage: null,
      logger: silentLogger,
      onWarning: (message) => warnings.push(message),
      fetchImpl,
      contextFactory: () => context(fake),
    });

    audio.playTheme("audio.music.menu");
    await audio.unlock();

    await vi.waitFor(() =>
      expect(warnings.join(" ")).toContain("AUDIO_THEME_LOAD_FAILED"),
    );
    expect(fake.bufferSources).toHaveLength(0);

    expect(() => audio.playTheme("audio.music.menu")).not.toThrow();
    expect(
      warnings.filter((warning) =>
        warning.includes("AUDIO_THEME_LOAD_FAILED"),
      ),
    ).toHaveLength(1);
  });

  it("stops the source and ignores further themes after dispose", async () => {
    const fake = new FakeContext();
    const audio = createAudio({
      assets: themeAssets(),
      storage: null,
      logger: silentLogger,
      fetchImpl: fetchOk(),
      contextFactory: () => context(fake),
    });

    audio.playTheme("audio.music.menu");
    await audio.unlock();
    await vi.waitFor(() => expect(fake.bufferSources).toHaveLength(1));

    const source = fake.bufferSources[0];
    audio.dispose();
    expect(source?.stop).toHaveBeenCalled();
    expect(fake.close).toHaveBeenCalledTimes(1);

    audio.playTheme("audio.music.menu");
    await Promise.resolve();
    expect(fake.bufferSources).toHaveLength(1);
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
    // The first play was queued while blocked and flushed on successful unlock.
    expect(fake.oscillators).toHaveLength(1);

    audio.play("audio.cue.jump");
    expect(fake.oscillators).toHaveLength(2);
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
