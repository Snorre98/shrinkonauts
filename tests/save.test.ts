import { describe, expect, it } from "vitest";
import {
  createSave,
  defaultSettings,
  MemorySaveStorage,
  RUN_STORAGE_KEY,
  SAVE_SCHEMA_VERSION,
  SETTINGS_STORAGE_KEY,
} from "../src/save";
import { createProgression } from "../src/progression";

describe("save", () => {
  it("persists versioned audio and accessibility settings", () => {
    const storage = new MemorySaveStorage();
    const save = createSave({ storage });

    expect(save.settings).toEqual(defaultSettings());
    save.updateAudio({ muted: true, volume: 0.4 });
    save.updateAccessibility({ textScale: 1.3, reducedMotion: true });

    const reloaded = createSave({ storage });
    expect(reloaded.settings.audio).toEqual({ muted: true, volume: 0.4 });
    expect(reloaded.settings.accessibility).toEqual({
      textScale: 1.3,
      reducedMotion: true,
    });
    expect(reloaded.settings.schemaVersion).toBe(SAVE_SCHEMA_VERSION);
  });

  it("exposes an audio adapter that writes through to settings", () => {
    const storage = new MemorySaveStorage();
    const save = createSave({ storage });

    save.audioStorage.setItem(
      "shrinkonauts.audio",
      JSON.stringify({ muted: true, volume: 0.25 }),
    );

    expect(save.settings.audio).toEqual({ muted: true, volume: 0.25 });
    expect(JSON.parse(storage.getItem(SETTINGS_STORAGE_KEY) ?? "{}").audio).toEqual(
      { muted: true, volume: 0.25 },
    );
    expect(
      JSON.parse(save.audioStorage.getItem("shrinkonauts.audio") ?? "{}"),
    ).toEqual({ muted: true, volume: 0.25 });
  });

  it("saves and restores one versioned run", () => {
    const storage = new MemorySaveStorage();
    const save = createSave({
      storage,
      now: () => new Date("2026-10-26T12:00:00.000Z"),
    });

    save.saveRun({
      schemaVersion: SAVE_SCHEMA_VERSION,
      packId: "anatomy-reflex",
      packVersion: "0.1.0",
      levelId: "03-nerve-forest",
      roomId: "room-nerve-forest",
      checkpointId: "checkpoint-entry",
      progression: createProgression({ abilities: ["scan"] }),
      events: [],
      elapsed: 42,
      players: {
        p1: { x: 112, y: 640 },
        p2: { x: 176, y: 640 },
        activeP2: true,
      },
      status: "playing",
    });

    const loaded = save.loadRun("anatomy-reflex", "0.1.0");
    expect(loaded.ok).toBe(true);
    if (loaded.ok) {
      expect(loaded.run.checkpointId).toBe("checkpoint-entry");
      expect(loaded.run.savedAt).toBe("2026-10-26T12:00:00.000Z");
    }
    expect(storage.getItem(RUN_STORAGE_KEY)).toContain("anatomy-reflex");
  });

  it("rejects saves from another pack or version and invalid JSON", () => {
    const storage = new MemorySaveStorage();
    const save = createSave({ storage });

    expect(save.loadRun("anatomy-reflex", "0.1.0")).toMatchObject({
      ok: false,
      reason: "NO_SAVE",
    });

    storage.setItem(RUN_STORAGE_KEY, "{broken");
    expect(save.loadRun()).toMatchObject({
      ok: false,
      reason: "INVALID_SAVE",
    });

    storage.setItem(
      RUN_STORAGE_KEY,
      JSON.stringify({
        schemaVersion: SAVE_SCHEMA_VERSION,
        packId: "other-pack",
        packVersion: "0.1.0",
        levelId: "03-nerve-forest",
        progression: createProgression(),
        events: [],
        players: {
          p1: { x: 0, y: 0 },
          p2: { x: 0, y: 0 },
          activeP2: true,
        },
      }),
    );
    expect(save.loadRun("anatomy-reflex", "0.1.0")).toMatchObject({
      ok: false,
      reason: "PACK_MISMATCH",
    });
    expect(save.loadRun("other-pack", "9.9.9")).toMatchObject({
      ok: false,
      reason: "VERSION_MISMATCH",
    });
  });

  it("clears the run without touching settings", () => {
    const storage = new MemorySaveStorage();
    const save = createSave({ storage });
    save.updateAudio({ muted: true });
    save.saveRun({
      schemaVersion: SAVE_SCHEMA_VERSION,
      packId: "anatomy-reflex",
      packVersion: "0.1.0",
      levelId: "03-nerve-forest",
      roomId: "room-nerve-forest",
      checkpointId: null,
      progression: createProgression(),
      events: [],
      elapsed: 0,
      players: {
        p1: { x: 0, y: 0 },
        p2: { x: 0, y: 0 },
        activeP2: true,
      },
      status: "playing",
    });

    save.clearRun();
    expect(save.loadRun()).toMatchObject({ ok: false, reason: "NO_SAVE" });
    expect(save.settings.audio.muted).toBe(true);
  });
});
