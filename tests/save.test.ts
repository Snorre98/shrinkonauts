import { describe, expect, it } from "vitest";
import {
  createSave,
  defaultSettings,
  MemorySaveStorage,
  RUN_SCHEMA_VERSION,
  RUN_STORAGE_KEY,
  runStorageKey,
  SAVE_SCHEMA_VERSION,
  SETTINGS_STORAGE_KEY,
} from "../src/save";
import { createProgression } from "../src/progression";

function body(x: number, y: number) {
  return { x, y, vx: 0, vy: 0, angle: 0, angularVelocity: 0, sleeping: false };
}

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
      schemaVersion: RUN_SCHEMA_VERSION,
      packId: "anatomy-reflex",
      packVersion: "0.1.0",
      contentVersion: "0.1.0",
      levelId: "03-nerve-forest",
      roomId: "room-nerve-forest",
      checkpointId: "checkpoint-entry",
      progression: createProgression({ abilities: ["scan"] }),
      events: [],
      elapsed: 42,
      players: {
        activeP2: true,
        bodies: { p1: body(112, 618), p2: body(176, 618) },
      },
      world: { bodies: {}, props: {}, puzzles: {} },
      audio: { muted: false },
      status: "playing",
    });

    const loaded = save.loadRun("anatomy-reflex", "0.1.0");
    expect(loaded.ok).toBe(true);
    if (loaded.ok) {
      expect(loaded.run.checkpointId).toBe("checkpoint-entry");
      expect(loaded.run.savedAt).toBe("2026-10-26T12:00:00.000Z");
    }
    expect(storage.getItem(runStorageKey("anatomy-reflex"))).toContain(
      "anatomy-reflex",
    );
  });

  it("round-trips a cleared prop and keeps old prop snapshots valid", () => {
    const storage = new MemorySaveStorage();
    const save = createSave({ storage });

    save.saveRun({
      schemaVersion: RUN_SCHEMA_VERSION,
      packId: "anatomy-reflex",
      packVersion: "0.3.0",
      contentVersion: "0.3.0",
      levelId: "04-muscle-effector",
      roomId: "room-muscle-effector",
      checkpointId: null,
      progression: createProgression(),
      events: [],
      elapsed: 10,
      players: {
        activeP2: true,
        bodies: { p1: body(0, 0), p2: body(0, 0) },
      },
      world: {
        bodies: { "body-ach-packet": body(720, 610) },
        props: {
          "ach-packet": {
            bodyId: "body-ach-packet",
            state: "cleared",
            carriedBy: null,
            placedOn: null,
          },
        },
        puzzles: {},
      },
      audio: { muted: false },
      status: "playing",
    });

    const loaded = save.loadRun("anatomy-reflex", "0.3.0");
    expect(loaded.ok).toBe(true);
    if (loaded.ok) {
      expect(loaded.run.world.props["ach-packet"]?.state).toBe("cleared");
    }

    const raw = JSON.parse(
      storage.getItem(runStorageKey("anatomy-reflex")) ?? "{}",
    );
    raw.world.props["ach-packet"] = {
      bodyId: "body-ach-packet",
      state: "docked",
      carriedBy: null,
      placedOn: "nicotinic-receptor",
    };
    storage.setItem(runStorageKey("anatomy-reflex"), JSON.stringify(raw));
    expect(save.loadRun("anatomy-reflex")).toMatchObject({ ok: true });
  });

  it("returns the parsed run for a content-version mismatch", () => {
    const storage = new MemorySaveStorage();
    const save = createSave({ storage });

    save.saveRun({
      schemaVersion: RUN_SCHEMA_VERSION,
      packId: "anatomy-reflex",
      packVersion: "0.1.0",
      contentVersion: "0.1.0",
      levelId: "03-nerve-forest",
      roomId: "room-nerve-forest",
      checkpointId: "checkpoint-entry",
      progression: createProgression({ abilities: ["scan", "signal-dash"] }),
      events: [],
      elapsed: 20,
      players: {
        activeP2: true,
        bodies: { p1: body(112, 618), p2: body(176, 618) },
      },
      world: { bodies: {}, props: {}, puzzles: {} },
      audio: { muted: false },
      status: "playing",
    });

    const loaded = save.loadRun("anatomy-reflex", "0.1.0", "9.9.9");
    expect(loaded).toMatchObject({ ok: false, reason: "VERSION_MISMATCH" });
    if (!loaded.ok && loaded.reason === "VERSION_MISMATCH") {
      expect(loaded.run?.contentVersion).toBe("0.1.0");
      expect(loaded.run?.progression.abilities).toContain("signal-dash");
    }
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
        schemaVersion: RUN_SCHEMA_VERSION,
        packId: "other-pack",
        packVersion: "0.1.0",
        contentVersion: "0.1.0",
        levelId: "03-nerve-forest",
        roomId: "room-nerve-forest",
        checkpointId: null,
        progression: createProgression(),
        events: [],
        elapsed: 0,
        players: {
          activeP2: true,
          bodies: { p1: body(0, 0), p2: body(0, 0) },
        },
        world: { bodies: {}, props: {}, puzzles: {} },
        audio: { muted: false },
        status: "playing",
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

  it("keeps pack run slots isolated and migrates the legacy slot once", () => {
    const storage = new MemorySaveStorage();
    const save = createSave({ storage });

    const run = {
      schemaVersion: RUN_SCHEMA_VERSION,
      packId: "anatomy-reflex",
      packVersion: "0.1.0",
      contentVersion: "0.1.0",
      levelId: "03-nerve-forest",
      roomId: "room-nerve-forest",
      checkpointId: null,
      progression: createProgression(),
      events: [],
      elapsed: 0,
      players: {
        activeP2: true,
        bodies: { p1: body(0, 0), p2: body(0, 0) },
      },
      world: { bodies: {}, props: {}, puzzles: {} },
      audio: { muted: false },
      status: "playing" as const,
    };

    save.saveRun(run);
    save.saveRun({
      ...run,
      packId: "silicon-reflex",
      levelId: "01-interrupt-loop",
      roomId: "room-interrupt-loop",
    });

    expect(save.hasRun("anatomy-reflex")).toBe(true);
    expect(save.hasRun("silicon-reflex")).toBe(true);
    expect(storage.getItem(runStorageKey("anatomy-reflex"))).toContain(
      "03-nerve-forest",
    );
    expect(storage.getItem(runStorageKey("silicon-reflex"))).toContain(
      "01-interrupt-loop",
    );

    // A save written by the pre-M1.9 single-slot build migrates into the pack
    // slot named by the save itself.
    storage.removeItem?.(runStorageKey("anatomy-reflex"));
    storage.setItem(RUN_STORAGE_KEY, JSON.stringify(run));
    expect(save.loadRun("anatomy-reflex")).toMatchObject({ ok: true });
    expect(storage.getItem(RUN_STORAGE_KEY)).toBeNull();
    expect(storage.getItem(runStorageKey("anatomy-reflex"))).toContain(
      "anatomy-reflex",
    );
    expect(save.loadRun("silicon-reflex")).toMatchObject({ ok: true });

    save.clearRun("anatomy-reflex");
    expect(save.hasRun("anatomy-reflex")).toBe(false);
    expect(save.hasRun("silicon-reflex")).toBe(true);
  });

  it("round-trips optional conversation sessions and accepts legacy dialogue", () => {
    const storage = new MemorySaveStorage();
    const save = createSave({ storage });
    const base = {
      schemaVersion: RUN_SCHEMA_VERSION,
      packId: "anatomy-reflex",
      packVersion: "0.1.0",
      contentVersion: "0.1.0",
      levelId: "03-nerve-forest",
      roomId: "room-nerve-forest",
      checkpointId: "checkpoint-entry",
      progression: createProgression({ abilities: ["scan"] }),
      events: [],
      elapsed: 12,
      players: {
        activeP2: true,
        bodies: { p1: body(112, 618), p2: body(176, 618) },
      },
      world: { bodies: {}, props: {}, puzzles: {} },
      audio: { muted: false },
      status: "playing" as const,
    };
    save.saveRun({
      ...base,
      conversations: [
        {
          surfaceId: "conversation:p1:agent-neuron",
          dialogueId: "dlg-neuron-01",
          nodeId: "problem",
          owner: "p1",
          entityId: "agent-neuron",
        },
      ],
    });
    const loaded = save.loadRun("anatomy-reflex", "0.1.0");
    expect(loaded.ok).toBe(true);
    if (loaded.ok) {
      expect(loaded.run.conversations).toEqual([
        {
          surfaceId: "conversation:p1:agent-neuron",
          dialogueId: "dlg-neuron-01",
          nodeId: "problem",
          owner: "p1",
          entityId: "agent-neuron",
        },
      ]);
    }

    save.saveRun({
      ...base,
      schemaVersion: "2.0",
      dialogue: { dialogueId: "dlg-neuron-01", nodeId: "problem" },
    });
    const legacy = save.loadRun("anatomy-reflex", "0.1.0");
    expect(legacy.ok).toBe(true);
    if (legacy.ok) {
      expect(legacy.run.dialogue).toEqual({
        dialogueId: "dlg-neuron-01",
        nodeId: "problem",
      });
    }
  });

  it("rejects malformed conversation snapshots", () => {
    const storage = new MemorySaveStorage();
    const save = createSave({ storage });
    save.saveRun({
      schemaVersion: RUN_SCHEMA_VERSION,
      packId: "anatomy-reflex",
      packVersion: "0.1.0",
      contentVersion: "0.1.0",
      levelId: "03-nerve-forest",
      roomId: "room-nerve-forest",
      checkpointId: null,
      progression: createProgression(),
      events: [],
      elapsed: 0,
      players: {
        activeP2: true,
        bodies: { p1: body(0, 0), p2: body(0, 0) },
      },
      world: { bodies: {}, props: {}, puzzles: {} },
      audio: { muted: false },
      status: "playing",
    });
    const raw = JSON.parse(
      storage.getItem(runStorageKey("anatomy-reflex")) ?? "{}",
    );
    raw.conversations = [{ surfaceId: "x", owner: "p3" }];
    storage.setItem(runStorageKey("anatomy-reflex"), JSON.stringify(raw));
    expect(save.loadRun("anatomy-reflex")).toMatchObject({
      ok: false,
      reason: "INVALID_SAVE",
    });
  });

  it("clears the run without touching settings", () => {
    const storage = new MemorySaveStorage();
    const save = createSave({ storage });
    save.updateAudio({ muted: true });
    save.saveRun({
      schemaVersion: RUN_SCHEMA_VERSION,
      packId: "anatomy-reflex",
      packVersion: "0.1.0",
      contentVersion: "0.1.0",
      levelId: "03-nerve-forest",
      roomId: "room-nerve-forest",
      checkpointId: null,
      progression: createProgression(),
      events: [],
      elapsed: 0,
      players: {
        activeP2: true,
        bodies: { p1: body(0, 0), p2: body(0, 0) },
      },
      world: { bodies: {}, props: {}, puzzles: {} },
      audio: { muted: false },
      status: "playing",
    });

    save.clearRun("anatomy-reflex");
    expect(save.loadRun("anatomy-reflex")).toMatchObject({
      ok: false,
      reason: "NO_SAVE",
    });
    expect(save.settings.audio.muted).toBe(true);
  });
});
