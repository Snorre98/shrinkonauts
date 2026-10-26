import { describe, expect, it } from "vitest";
import { GameRuntime, type AudioPort, type RuntimeInput } from "../src/game/runtime";
import { createProgression } from "../src/progression";
import {
  createSave,
  MemorySaveStorage,
  RUN_SCHEMA_VERSION,
  RUN_STORAGE_KEY,
} from "../src/save";
import { loadContent, packDirectory } from "../scripts/content-loader";

const content = loadContent(packDirectory("anatomy-reflex"));

class FakeAudio implements AudioPort {
  muted = false;
  readonly played: string[] = [];

  play(assetId: string): void {
    this.played.push(assetId);
  }

  setMuted(muted: boolean): void {
    this.muted = muted;
  }
}

function input(overrides: Partial<RuntimeInput["actions"]> = {}): RuntimeInput {
  const base = GameRuntime.emptyInput();
  return { ...base, actions: { ...base.actions, ...overrides } };
}

function makeRuntime(storage = new MemorySaveStorage()): {
  runtime: GameRuntime;
  audio: FakeAudio;
  save: ReturnType<typeof createSave>;
  storage: MemorySaveStorage;
} {
  const audio = new FakeAudio();
  const save = createSave({ storage });
  const runtime = new GameRuntime({
    content,
    save,
    audio,
    now: () => new Date("2026-10-26T12:00:00.000Z"),
    sessionId: "session-runtime-test",
  });
  runtime.start();
  return { runtime, audio, save, storage };
}

function makeRuntimeWithContent(
  packContent: typeof content,
  storage = new MemorySaveStorage(),
): { runtime: GameRuntime; audio: FakeAudio; storage: MemorySaveStorage } {
  const audio = new FakeAudio();
  const save = createSave({ storage });
  const runtime = new GameRuntime({
    content: packContent,
    save,
    audio,
    now: () => new Date("2026-10-26T12:00:00.000Z"),
    sessionId: "session-runtime-test-custom",
  });
  runtime.start();
  return { runtime, audio, storage };
}

function contentWithActivation(mode: "zoneEnter" | "interact") {
  const copy = structuredClone(content);
  const puzzle = copy.puzzles["puzzle-ferry-01"];
  if (!puzzle) throw new Error("ferry puzzle missing");
  if (mode === "zoneEnter") {
    puzzle.activation = { mode: "zoneEnter", zoneId: "activation-zone" };
    puzzle.nodes.push({
      id: "activation-zone",
      type: "zone",
      rect: { x: 300, y: 600, width: 100, height: 80 },
      detects: ["player"],
      minimum: 1,
      countCarried: false,
    });
  } else {
    puzzle.activation = { mode: "interact", entityId: "pulse-terminal" };
  }
  return copy;
}

function contentWithHazard() {
  const copy = structuredClone(content);
  const room = copy.rooms["room-nerve-forest"];
  if (!room) throw new Error("nerve room missing");
  room.entities = [
    ...(room.entities ?? []),
    {
      id: "hazard-runtime-test",
      type: "hazard",
      x: 6,
      y: 20,
      components: { body: { width: 32, height: 32 } },
    },
  ];
  return copy;
}

function body(
  x: number,
  y: number,
  overrides: Partial<{
    vx: number;
    vy: number;
    angle: number;
    angularVelocity: number;
    sleeping: boolean;
    dashTime: number;
    dashCooldown: number;
  }> = {},
) {
  return {
    x,
    y,
    vx: 0,
    vy: 0,
    angle: 0,
    angularVelocity: 0,
    sleeping: false,
    ...overrides,
  };
}

function walkTo(runtime: GameRuntime, entityId: string): void {
  const point = runtime.entityPixel(entityId);
  if (!point) throw new Error(`missing entity ${entityId}`);
  runtime.placePlayer("p1", point.x, point.y);
}

function playerActions(
  overrides: Partial<{
    interact: boolean;
    scan: boolean;
    pulse: boolean;
    carry: boolean;
    throw: boolean;
  }> = {},
) {
  return {
    interact: false,
    scan: false,
    pulse: false,
    carry: false,
    throw: false,
    ...overrides,
  };
}

function stepWith(
  runtime: GameRuntime,
  p1 = playerActions(),
  p2 = playerActions(),
): void {
  runtime.step(1 / 60, {
    ...input(),
    actions: {
      ...input().actions,
      p1: playerActions(p1),
      p2: playerActions(p2),
    },
  });
}

function solveFerry(runtime: GameRuntime): void {
  const tracer = runtime.entityPixel("tracer-prop");
  const receptor = runtime.entityPixel("receptor-a");
  const terminal = runtime.entityPixel("pulse-terminal");
  if (!tracer || !receptor || !terminal) throw new Error("ferry entities missing");

  runtime.placePlayer("p2", tracer.x, 20 * 32);
  stepWith(runtime, playerActions(), playerActions({ carry: true }));
  expect(runtime.simulation.props["tracer-prop"]?.state).toBe("carried");

  runtime.placePlayer("p2", receptor.x, 20 * 32);
  stepWith(runtime, playerActions(), playerActions({ carry: true }));
  expect(runtime.simulation.props["tracer-prop"]?.state).toBe("placed");

  runtime.placePlayer("p1", terminal.x, 20 * 32);
  stepWith(runtime, playerActions({ pulse: true }), playerActions());
  for (let frame = 0; frame < 30; frame += 1) {
    stepWith(runtime);
  }
  expect(runtime.snapshot().abilities).toContain("signal-dash");
}

describe("game runtime", () => {
  it("boots directly into the nerve-forest vertical slice", () => {
    const { runtime, storage } = makeRuntime();
    const snapshot = runtime.snapshot();

    expect(snapshot.state).toBe("level");
    expect(snapshot.level.id).toBe("03-nerve-forest");
    expect(snapshot.roomId).toBe("room-nerve-forest");
    expect(snapshot.activeP2).toBe(true);
    expect(snapshot.mode).toBe("co-op");
    expect(snapshot.abilities).toContain("scan");
    expect(snapshot.map.nodes.find((node) => node.current)?.visited).toBe(true);
    expect(snapshot.checkpointId).toBe("checkpoint-entry");
    expect(storage.getItem(RUN_STORAGE_KEY)).toContain("03-nerve-forest");
  });

  it("waits for a zoneEnter activation before ticking the puzzle", () => {
    const { runtime } = makeRuntimeWithContent(contentWithActivation("zoneEnter"));
    expect(runtime.snapshot().puzzle).toBeNull();
    expect(runtime.simulation.tetherPolicy).toBe("normal");

    stepWith(runtime);
    expect(runtime.snapshot().puzzle).toBeNull();

    runtime.placePlayer("p1", 350, 640);
    stepWith(runtime);
    expect(runtime.snapshot().puzzle?.id).toBe("puzzle-ferry-01");
    expect(runtime.simulation.tetherPolicy).toBe("off");
  });

  it("activates an interact puzzle from its authored entity", () => {
    const { runtime } = makeRuntimeWithContent(contentWithActivation("interact"));
    expect(runtime.snapshot().puzzle).toBeNull();

    const terminal = runtime.entityPixel("pulse-terminal");
    if (!terminal) throw new Error("pulse-terminal missing");
    runtime.placePlayer("p1", terminal.x, 20 * 32);
    expect(runtime.snapshot().interaction).toMatchObject({
      kind: "puzzle",
      label: "Start Signal Ferry",
    });

    stepWith(runtime, playerActions({ interact: true }));
    expect(runtime.snapshot().puzzle?.id).toBe("puzzle-ferry-01");
    expect(runtime.simulation.tetherPolicy).toBe("off");
  });

  it("shows authored hints and pulse cooldown", () => {
    const { runtime } = makeRuntime();
    expect(runtime.snapshot().puzzle?.canHint).toBe(true);
    expect(runtime.snapshot().puzzle?.pulse).toMatchObject({
      nodeId: "pulse-terminal",
      remainingTicks: 0,
      cooldownTicks: 24,
    });

    runtime.puzzleHint();
    expect(runtime.snapshot().puzzle?.hint).toBe(
      "The tracer fits only one receptor shape.",
    );
    expect(runtime.snapshot().toast).toContain("Hint:");
    expect(runtime.snapshot().puzzle?.canHint).toBe(true);

    runtime.puzzleHint();
    expect(runtime.snapshot().puzzle?.hint).toBe(
      "One player can hold the terminal while the other carries the tracer.",
    );
    expect(runtime.snapshot().puzzle?.canHint).toBe(false);
    expect(
      runtime
        .exportEvidence()
        .events.filter((event) => event.type === "hint_used"),
    ).toHaveLength(2);

    const terminal = runtime.entityPixel("pulse-terminal");
    if (!terminal) throw new Error("pulse-terminal missing");
    runtime.placePlayer("p1", terminal.x, 20 * 32);
    stepWith(runtime, playerActions({ pulse: true }));
    expect(
      runtime.snapshot().puzzle?.pulse?.remainingTicks ?? 0,
    ).toBeGreaterThan(0);
    for (let frame = 0; frame < 30; frame += 1) stepWith(runtime);
    expect(runtime.snapshot().puzzle?.pulse?.remainingTicks).toBe(0);
  });

  it("records wrong-side feedback in the exported puzzle counters", () => {
    const { runtime } = makeRuntime();
    const tracer = runtime.entityPixel("tracer-prop");
    if (!tracer) throw new Error("tracer missing");
    runtime.placePlayer("p2", tracer.x, 20 * 32);
    stepWith(runtime, playerActions(), playerActions({ carry: true }));
    expect(runtime.simulation.props["tracer-prop"]?.state).toBe("carried");

    runtime.placePlayer("p2", 700, 20 * 32);
    stepWith(runtime, playerActions(), playerActions({ carry: true }));
    expect(runtime.simulation.props["tracer-prop"]?.state).toBe("free");
    expect(runtime.snapshot().puzzle?.counters.wrongSide).toBe(1);

    runtime.resetPuzzle();
    solveFerry(runtime);
    const solved = runtime
      .exportEvidence()
      .events.find((event) => event.type === "puzzle_solved");
    expect(
      (solved?.counters as Record<string, number> | undefined)?.wrongSide,
    ).toBeGreaterThanOrEqual(1);
  });

  it("respawns a player at the checkpoint after a hazard", () => {
    const { runtime } = makeRuntimeWithContent(contentWithHazard());
    const spawn = {
      x: runtime.simulation.players.p1.spawnX,
      y: runtime.simulation.players.p1.spawnY,
    };
    runtime.placePlayer("p1", 6.5 * 32, 20 * 32);
    stepWith(runtime);
    expect(runtime.snapshot().toast).toBe("Back to the checkpoint");
    expect(runtime.simulation.players.p1.x).toBeCloseTo(spawn.x, 0);
    expect(runtime.simulation.players.p1.y).toBeCloseTo(spawn.y, 0);
  });

  it("restores a mid-air body with velocity and dash timers", () => {
    const storage = new MemorySaveStorage();
    const save = createSave({ storage });
    save.saveRun({
      schemaVersion: RUN_SCHEMA_VERSION,
      packId: content.pack.id,
      packVersion: content.pack.version,
      contentVersion: content.pack.version,
      levelId: "03-nerve-forest",
      roomId: "room-nerve-forest",
      checkpointId: "checkpoint-entry",
      progression: createProgression({ abilities: ["scan", "signal-dash"] }),
      events: [],
      elapsed: 12,
      players: {
        activeP2: true,
        bodies: {
          p1: body(600, 400, {
            vx: 120,
            vy: -80,
            angle: 0.2,
            angularVelocity: 0.3,
            dashTime: 0.1,
            dashCooldown: 0.4,
          }),
          p2: body(176, 618),
        },
      },
      world: { bodies: {}, props: {}, puzzles: {} },
      audio: { muted: false },
      status: "playing",
    });

    const runtime = new GameRuntime({
      content,
      save: createSave({ storage }),
      audio: new FakeAudio(),
      now: () => new Date("2026-10-26T12:10:00.000Z"),
    });
    runtime.start();

    const p1 = runtime.simulation.players.p1;
    expect(p1.x).toBeCloseTo(600, 0);
    expect(p1.y).toBeCloseTo(400 + 22, 0);
    expect(p1.vx).toBeCloseTo(120, 0);
    expect(p1.vy).toBeCloseTo(-80, 0);
    expect(p1.dashTime).toBeCloseTo(0.1, 5);
    expect(p1.dashCooldown).toBeCloseTo(0.4, 5);
  });

  it("restores a docked prop with the solved gate latched", () => {
    const storage = new MemorySaveStorage();
    const first = new GameRuntime({
      content,
      save: createSave({ storage }),
      audio: new FakeAudio(),
      now: () => new Date("2026-10-26T12:00:00.000Z"),
    });
    first.start();
    solveFerry(first);

    const restored = new GameRuntime({
      content,
      save: createSave({ storage }),
      audio: new FakeAudio(),
      now: () => new Date("2026-10-26T12:10:00.000Z"),
    });
    restored.start();

    expect(restored.snapshot().puzzle?.solved).toBe(true);
    expect(restored.simulation.props["tracer-prop"]?.state).toBe("docked");
    expect(restored.simulation.props["tracer-prop"]?.placedOn).toBe(
      "receptor-a",
    );
  });

  it("resets to checkpoint on a content-version change while keeping progression", () => {
    const { runtime, storage } = makeRuntime();
    solveFerry(runtime);

    const saved = JSON.parse(storage.getItem(RUN_STORAGE_KEY) ?? "{}");
    saved.contentVersion = "0.0.0";
    storage.setItem(RUN_STORAGE_KEY, JSON.stringify(saved));

    const restored = new GameRuntime({
      content,
      save: createSave({ storage }),
      audio: new FakeAudio(),
      now: () => new Date("2026-10-26T12:10:00.000Z"),
    });
    restored.start();

    expect(restored.snapshot().toast).toContain("resumed from checkpoint");
    expect(restored.snapshot().abilities).toContain("signal-dash");
    expect(restored.snapshot().puzzle?.solved).toBe(false);
    expect(restored.simulation.props["tracer-prop"]?.state).toBe("free");
    expect(restored.simulation.players.p1.x).toBeCloseTo(4.5 * 32, 0);
    expect(
      restored
        .exportEvidence()
        .events.some((event) => event.type === "puzzle_solved"),
    ).toBe(true);
    const resaved = JSON.parse(storage.getItem(RUN_STORAGE_KEY) ?? "{}");
    expect(resaved.contentVersion).toBe(content.pack.version);
  });

  it("resets a v1 run with a format-updated notice", () => {
    const storage = new MemorySaveStorage({
      [RUN_STORAGE_KEY]: JSON.stringify({
        schemaVersion: "1.0",
        packId: "anatomy-reflex",
        packVersion: "0.1.0",
        levelId: "03-nerve-forest",
        players: { p1: { x: 0, y: 0 }, p2: { x: 0, y: 0 } },
      }),
    });
    const { runtime } = makeRuntime(storage);
    expect(runtime.snapshot().state).toBe("level");
    expect(runtime.snapshot().toast).toContain("Save format updated");
  });

  it("runs dialogue, scan, the Signal Ferry puzzle, exit, debrief, and evidence export", () => {
    const { runtime, audio } = makeRuntime();

    walkTo(runtime, "agent-neuron");
    runtime.interact();
    expect(runtime.state).toBe("dialogue");
    expect(runtime.snapshot().dialogue?.speaker).toBe("Neuron Keeper");

    runtime.advanceDialogue();
    runtime.advanceDialogue();
    runtime.advanceDialogue();
    expect(runtime.snapshot().dialogue?.choices).toHaveLength(2);

    runtime.chooseDialogue("right");
    expect(runtime.state).toBe("level");
    expect(runtime.snapshot().knownConceptIds).toEqual(
      expect.arrayContaining(["CON-3", "CON-4", "CON-5"]),
    );

    walkTo(runtime, "scan-synapse");
    runtime.scan();
    expect(runtime.snapshot().knownConceptIds).toContain("CON-4");
    expect(audio.played.length).toBeGreaterThan(0);

    solveFerry(runtime);
    expect(
      runtime.snapshot().map.nodes.find((node) => node.id === "map-muscle-effector")
        ?.visited,
    ).toBe(true);

    runtime.placePlayer("p1", 37.5 * 32, 20 * 32);
    stepWith(runtime);
    expect(runtime.state).toBe("debrief");

    const debrief = runtime.snapshot().debrief;
    expect(debrief?.prompts.map((prompt) => prompt.objectiveId)).toEqual([
      "OBJ-2",
    ]);

    runtime.submitDebrief("prompt-obj-2", "");
    expect(runtime.state).toBe("debrief");
    runtime.submitDebrief(
      "prompt-obj-2",
      "The receptor fires, the sensory neuron reaches the spinal cord, and the motor neuron drives the muscle.",
    );
    runtime.finishDebrief();
    expect(runtime.state).toBe("complete");

    const exported = runtime.exportEvidence();
    expect(exported.mode).toBe("co-op");
    expect(exported.sessionId).toBe("session-runtime-test");
    const objective = exported.objectives.find((item) => item.id === "OBJ-2");
    expect(objective).toMatchObject({ requiredMet: true });
    expect(objective?.evidenceIds).toEqual(["EV-2", "EV-7"]);
    expect(
      exported.events.some(
        (event) =>
          event.type === "puzzle_solved" &&
          event.puzzleId === "puzzle-ferry-01",
      ),
    ).toBe(true);
    expect(
      exported.events.some((event) => event.type === "debrief_completed"),
    ).toBe(true);
  });

  it("restores progression and positions from the autosave", () => {
    const { runtime, storage } = makeRuntime();

    solveFerry(runtime);
    runtime.placePlayer("p1", 700, 640);
    stepWith(runtime);
    runtime.placePlayer("p1", 4.5 * 32, 20 * 32);
    stepWith(runtime);

    const restoredAudio = new FakeAudio();
    const restoredSave = createSave({ storage });
    const restored = new GameRuntime({
      content,
      save: restoredSave,
      audio: restoredAudio,
      now: () => new Date("2026-10-26T12:10:00.000Z"),
    });
    restored.start();

    const snapshot = restored.snapshot();
    expect(snapshot.state).toBe("level");
    expect(snapshot.abilities).toContain("signal-dash");
    expect(snapshot.puzzle?.solved).toBe(true);
    expect(restored.simulation.props["tracer-prop"]?.state).toBe("docked");
    expect(
      snapshot.map.nodes.find((node) => node.id === "map-muscle-effector")
        ?.visited,
    ).toBe(true);
    expect(restored.snapshot().toast).toBe("Resumed from checkpoint");
  });

  it("solves the Signal Ferry in solo mode with the union of both abilities", () => {
    const { runtime } = makeRuntime();
    runtime.togglePlayer2();
    expect(runtime.snapshot().mode).toBe("solo");
    expect(runtime.snapshot().players.p1.abilities).toEqual(
      expect.arrayContaining(["pulse", "carry"]),
    );

    const tracer = runtime.entityPixel("tracer-prop");
    const receptor = runtime.entityPixel("receptor-a");
    const terminal = runtime.entityPixel("pulse-terminal");
    if (!tracer || !receptor || !terminal) throw new Error("ferry entities missing");

    runtime.placePlayer("p1", tracer.x, 20 * 32);
    stepWith(runtime, playerActions({ carry: true }));
    expect(runtime.simulation.props["tracer-prop"]?.state).toBe("carried");

    runtime.placePlayer("p1", receptor.x, 20 * 32);
    stepWith(runtime, playerActions({ carry: true }));
    expect(runtime.simulation.props["tracer-prop"]?.state).toBe("placed");

    runtime.placePlayer("p1", terminal.x, 20 * 32);
    stepWith(runtime, playerActions({ pulse: true }));
    for (let frame = 0; frame < 30; frame += 1) stepWith(runtime);

    expect(runtime.snapshot().abilities).toContain("signal-dash");
    expect(runtime.snapshot().puzzle?.solved).toBe(true);
  });

  it("restores a carried prop and then completes the puzzle after loading", () => {
    const storage = new MemorySaveStorage();
    const save = createSave({ storage });
    const first = new GameRuntime({
      content,
      save,
      audio: new FakeAudio(),
      now: () => new Date("2026-10-26T12:00:00.000Z"),
    });
    first.start();

    const tracer = first.entityPixel("tracer-prop");
    if (!tracer) throw new Error("tracer missing");
    first.placePlayer("p2", tracer.x, 20 * 32);
    stepWith(first, playerActions(), playerActions({ carry: true }));
    expect(first.simulation.props["tracer-prop"]?.state).toBe("carried");

    const restored = new GameRuntime({
      content,
      save: createSave({ storage }),
      audio: new FakeAudio(),
      now: () => new Date("2026-10-26T12:10:00.000Z"),
    });
    restored.start();
    expect(restored.simulation.props["tracer-prop"]?.state).toBe("carried");
    expect(restored.simulation.props["tracer-prop"]?.carriedBy).toBe("p2");

    const receptor = restored.entityPixel("receptor-a");
    const terminal = restored.entityPixel("pulse-terminal");
    if (!receptor || !terminal) throw new Error("ferry entities missing");
    restored.placePlayer("p2", receptor.x, 20 * 32);
    for (let frame = 0; frame < 5; frame += 1) stepWith(restored);
    stepWith(restored, playerActions(), playerActions({ carry: true }));
    expect(restored.simulation.props["tracer-prop"]?.state).toBe("placed");

    restored.placePlayer("p1", terminal.x, 20 * 32);
    stepWith(restored, playerActions({ pulse: true }));
    for (let frame = 0; frame < 30; frame += 1) stepWith(restored);
    expect(restored.snapshot().puzzle?.solved).toBe(true);
  });

  it("rejects a mismatched receptor and lets the player retry", () => {
    const { runtime } = makeRuntime();
    const tracer = runtime.entityPixel("tracer-prop");
    const wrong = runtime.entityPixel("receptor-b");
    const terminal = runtime.entityPixel("pulse-terminal");
    if (!tracer || !wrong || !terminal) throw new Error("ferry entities missing");

    runtime.placePlayer("p2", tracer.x, 20 * 32);
    stepWith(runtime, playerActions(), playerActions({ carry: true }));
    runtime.placePlayer("p2", wrong.x, 20 * 32);
    stepWith(runtime, playerActions(), playerActions({ carry: true }));
    expect(runtime.simulation.props["tracer-prop"]?.placedOn).toBe("receptor-b");

    runtime.placePlayer("p1", terminal.x, 20 * 32);
    stepWith(runtime, playerActions({ pulse: true }));
    for (let frame = 0; frame < 30; frame += 1) stepWith(runtime);

    expect(runtime.snapshot().puzzle?.solved).toBe(false);
    expect(runtime.simulation.props["tracer-prop"]?.state).toBe("placed");
    expect(
      runtime.snapshot().puzzle?.counters.wrongReceptor ?? 0,
    ).toBeGreaterThanOrEqual(1);

    // The tracer remains retrievable; move it to the matching receptor.
    runtime.placePlayer("p2", wrong.x, 20 * 32);
    stepWith(runtime, playerActions(), playerActions({ carry: true }));
    const right = runtime.entityPixel("receptor-a");
    if (!right) throw new Error("receptor-a missing");
    runtime.placePlayer("p2", right.x, 20 * 32);
    stepWith(runtime, playerActions(), playerActions({ carry: true }));
    expect(runtime.simulation.props["tracer-prop"]?.placedOn).toBe("receptor-a");
  });

  it("restores a placed tracer and continues the pulse", () => {
    const storage = new MemorySaveStorage();
    const first = new GameRuntime({
      content,
      save: createSave({ storage }),
      audio: new FakeAudio(),
      now: () => new Date("2026-10-26T12:00:00.000Z"),
    });
    first.start();
    const tracer = first.entityPixel("tracer-prop");
    const receptor = first.entityPixel("receptor-a");
    if (!tracer || !receptor) throw new Error("ferry entities missing");
    first.placePlayer("p2", tracer.x, 20 * 32);
    stepWith(first, playerActions(), playerActions({ carry: true }));
    first.placePlayer("p2", receptor.x, 20 * 32);
    stepWith(first, playerActions(), playerActions({ carry: true }));
    expect(first.simulation.props["tracer-prop"]?.state).toBe("placed");

    const restored = new GameRuntime({
      content,
      save: createSave({ storage }),
      audio: new FakeAudio(),
      now: () => new Date("2026-10-26T12:10:00.000Z"),
    });
    restored.start();
    expect(restored.simulation.props["tracer-prop"]?.state).toBe("placed");
    expect(restored.simulation.props["tracer-prop"]?.placedOn).toBe("receptor-a");

    const terminal = restored.entityPixel("pulse-terminal");
    if (!terminal) throw new Error("terminal missing");
    restored.placePlayer("p1", terminal.x, 20 * 32);
    stepWith(restored, playerActions({ pulse: true }));
    for (let frame = 0; frame < 30; frame += 1) stepWith(restored);
    expect(restored.snapshot().puzzle?.solved).toBe(true);
  });

  it("resets an unsolved puzzle and returns the tracer to its spawn", () => {
    const { runtime } = makeRuntime();
    const tracer = runtime.entityPixel("tracer-prop");
    if (!tracer) throw new Error("tracer missing");
    runtime.placePlayer("p2", tracer.x, 20 * 32);
    stepWith(runtime, playerActions(), playerActions({ carry: true }));
    expect(runtime.simulation.props["tracer-prop"]?.state).toBe("carried");

    runtime.resetPuzzle();
    expect(runtime.simulation.props["tracer-prop"]?.state).toBe("free");
    expect(runtime.snapshot().puzzle?.solved).toBe(false);
    expect(runtime.snapshot().puzzle?.counters.resets).toBe(1);
  });

  it("drops a carried prop when P2 leaves at a checkpoint", () => {
    const { runtime } = makeRuntime();
    const tracer = runtime.entityPixel("tracer-prop");
    if (!tracer) throw new Error("tracer missing");
    runtime.placePlayer("p2", tracer.x, 20 * 32);
    stepWith(runtime, playerActions(), playerActions({ carry: true }));
    expect(runtime.simulation.props["tracer-prop"]?.state).toBe("carried");

    runtime.placePlayer("p1", 4.5 * 32, 20 * 32);
    runtime.togglePlayer2();
    expect(runtime.snapshot().mode).toBe("solo");
    expect(runtime.simulation.props["tracer-prop"]?.state).toBe("free");
  });

  it("toggles P2 only at a checkpoint and persists settings", () => {
    const { runtime, storage } = makeRuntime();

    runtime.togglePlayer2();
    expect(runtime.snapshot().activeP2).toBe(false);
    expect(runtime.snapshot().mode).toBe("solo");
    expect(runtime.snapshot().players.p2.active).toBe(false);

    runtime.placePlayer("p1", 900, 640);
    runtime.togglePlayer2();
    expect(runtime.snapshot().activeP2).toBe(false);
    expect(runtime.snapshot().toast).toBe("Find a checkpoint to change players");

    runtime.placePlayer("p1", 4.5 * 32, 20 * 32);
    runtime.togglePlayer2();
    expect(runtime.snapshot().activeP2).toBe(true);

    runtime.toggleMute();
    expect(runtime.snapshot().muted).toBe(true);
    runtime.setTextScale(1.3);
    runtime.toggleReducedMotion();
    expect(runtime.snapshot().settings.accessibility).toEqual({
      textScale: 1.3,
      reducedMotion: true,
    });

    const reloaded = createSave({ storage });
    expect(reloaded.settings.audio.muted).toBe(true);
    expect(reloaded.settings.accessibility.textScale).toBe(1.3);
  });

  it("opens and closes map, concept log, and pause with shared keys", () => {
    const { runtime } = makeRuntime();

    runtime.step(1 / 60, input({ map: true }));
    expect(runtime.state).toBe("map");
    runtime.step(1 / 60, input({ pause: true }));
    expect(runtime.state).toBe("level");

    runtime.step(1 / 60, input({ log: true }));
    expect(runtime.state).toBe("conceptLog");
    runtime.step(1 / 60, input({ log: true }));
    expect(runtime.state).toBe("level");

    runtime.step(1 / 60, input({ pause: true }));
    expect(runtime.state).toBe("pause");
    runtime.step(1 / 60, input({ pause: true }));
    expect(runtime.state).toBe("level");
  });

  it("dashes only after the Signal Ferry unlocks signal-dash", () => {
    const { runtime } = makeRuntime();
    const startX = runtime.simulation.players.p1.x;

    runtime.step(1 / 60, {
      ...input(),
      intents: { ...input().intents, p1: { moveX: 0, jump: false, dash: true } },
    });
    expect(runtime.simulation.players.p1.x).toBe(startX);

    solveFerry(runtime);
    const before = runtime.simulation.players.p1.x;
    runtime.step(1 / 60, {
      ...input(),
      intents: { ...input().intents, p1: { moveX: 0, jump: false, dash: true } },
    });
    expect(runtime.simulation.players.p1.x).toBeGreaterThan(before);
  });
});
