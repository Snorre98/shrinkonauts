import { describe, expect, it } from "vitest";
import { GameRuntime, type AudioPort, type RuntimeInput } from "../src/game/runtime";
import { createProgression } from "../src/progression";
import {
  createSave,
  MemorySaveStorage,
  RUN_SCHEMA_VERSION,
  RUN_STORAGE_KEY,
  runStorageKey,
} from "../src/save";
import { loadContent, packDirectory } from "../scripts/content-loader";

const content = loadContent(packDirectory("anatomy-reflex"));
const siliconContent = loadContent(packDirectory("silicon-reflex"));

class FakeAudio implements AudioPort {
  muted = false;
  readonly played: string[] = [];
  readonly themes: string[] = [];
  readonly stoppedThemes: Array<{ fadeOutMs?: number }> = [];
  pauses = 0;
  resumes = 0;

  play(assetId: string): void {
    this.played.push(assetId);
  }

  playTheme(assetId: string): void {
    this.themes.push(assetId);
  }

  stopTheme(options: { fadeOutMs?: number } = {}): void {
    this.stoppedThemes.push(options);
  }

  pauseTheme(): void {
    this.pauses += 1;
  }

  resumeTheme(): void {
    this.resumes += 1;
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
  levelChanges: string[];
} {
  const audio = new FakeAudio();
  const save = createSave({ storage });
  const levelChanges: string[] = [];
  const runtime = new GameRuntime({
    content,
    save,
    audio,
    now: () => new Date("2026-10-26T12:00:00.000Z"),
    sessionId: "session-runtime-test",
    onLevelChange: (levelId) => levelChanges.push(levelId),
  });
  runtime.start();
  return { runtime, audio, save, storage, levelChanges };
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
  const puzzle = copy.puzzles["puzzle-node-run"];
  if (!puzzle) throw new Error("node-run puzzle missing");
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
    puzzle.activation = { mode: "interact", entityId: "agent-neuron" };
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
      x: 10,
      y: 20,
      components: { body: { width: 32, height: 32 } },
    },
  ];
  return copy;
}

function contentWithAnchors() {
  const copy = structuredClone(content);
  const room = copy.rooms["room-nerve-forest"];
  if (!room) throw new Error("nerve room missing");
  const agent = room.entities?.find((entity) => entity.id === "agent-neuron");
  if (!agent) throw new Error("agent-neuron missing");
  agent.components = {
    ...(agent.components ?? {}),
    anchors: { muzzle: { x: 30, y: 8, direction: 0 } },
  };
  return copy;
}

function contentWithSecondAgent() {
  const copy = structuredClone(content);
  const room = copy.rooms["room-nerve-forest"];
  if (!room) throw new Error("nerve room missing");
  const agent = room.entities?.find((entity) => entity.id === "agent-neuron");
  if (!agent) throw new Error("agent-neuron missing");
  room.entities = [
    ...(room.entities ?? []),
    {
      ...structuredClone(agent),
      id: "agent-neuron-2",
      x: agent.x + 5,
      label: "Second Keeper",
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
    dance: false,
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

function sensorCenter(nodeId: string): { x: number; y: number } {
  const puzzle = content.puzzles["puzzle-node-run"];
  if (!puzzle) throw new Error("node-run puzzle missing");
  const node = puzzle.nodes.find((entry) => entry.id === nodeId);
  if (!node || (node.type !== "plate" && node.type !== "zone")) {
    throw new Error(`node-run sensor ${nodeId} missing`);
  }
  return {
    x: node.rect.x + node.rect.width / 2,
    y: node.rect.y + node.rect.height / 2,
  };
}

const SENSOR_PAD: Record<string, string> = {
  "input-a": "pad-input-a",
  "input-b": "pad-input-b",
  "terminal-zone": "pad-terminal",
};

function sensorFeetY(nodeId: string): number {
  const room = content.rooms["room-nerve-forest"];
  const entityId = SENSOR_PAD[nodeId];
  const entity = room?.entities?.find((entry) => entry.id === entityId);
  if (!room || !entity) {
    throw new Error(`missing sensor pad ${entityId ?? nodeId}`);
  }
  return entity.y * room.tileSize;
}

function placeAtSensor(
  runtime: GameRuntime,
  nodeId: string,
  actor: "p1" | "p2" = "p1",
): void {
  const point = sensorCenter(nodeId);
  runtime.placePlayer(actor, point.x, sensorFeetY(nodeId));
}

function pressSensor(runtime: GameRuntime, nodeId: string, actor: "p1" | "p2" = "p1"): void {
  placeAtSensor(runtime, nodeId, actor);
  stepWith(runtime);
}

function exitFeet(roomId: string, exitId: string): { x: number; y: number } {
  const room = content.rooms[roomId];
  const exit = room?.exits?.find((entry) => entry.id === exitId);
  if (!room || !exit) throw new Error(`missing exit ${exitId}`);
  return {
    x: (exit.x + 0.5) * room.tileSize,
    y: (exit.y + 1) * room.tileSize,
  };
}

function placeAtExit(
  runtime: GameRuntime,
  roomId: string,
  exitId: string,
  actor: "p1" | "p2" = "p1",
): void {
  const point = exitFeet(roomId, exitId);
  runtime.placePlayer(actor, point.x, point.y);
}

function solveNodeRun(runtime: GameRuntime): void {
  pressSensor(runtime, "input-a");
  pressSensor(runtime, "input-b");
  pressSensor(runtime, "terminal-zone");
  stepWith(runtime);
  expect(runtime.snapshot().puzzle?.solved).toBe(true);
}

function walkPlayerTo(
  runtime: GameRuntime,
  id: "p1" | "p2",
  entityId: string,
): void {
  const point = runtime.entityPixel(entityId);
  if (!point) throw new Error(`missing entity ${entityId}`);
  runtime.placePlayer(id, point.x, point.y);
}

function finishNodeRun(runtime: GameRuntime): void {
  solveNodeRun(runtime);
  placeAtExit(runtime, "room-nerve-forest", "exit-to-muscle");
  stepWith(runtime);
  expect(runtime.state).toBe("debrief");
  runtime.submitDebrief(
    "prompt-obj-2",
    "One input is below threshold, so no spike fires. Two inputs reach threshold and the spike is all-or-none; it travels one way along the axon to the terminal.",
  );
  runtime.finishDebrief();
  expect(runtime.state).toBe("level");
  expect(runtime.snapshot().level.id).toBe("04-muscle-effector");
}

function activateEndplate(runtime: GameRuntime): void {
  walkPlayerTo(runtime, "p1", "motor-terminal");
  stepWith(runtime, playerActions({ interact: true }));
  expect(runtime.snapshot().puzzle?.id).toBe("puzzle-endplate-ferry");
  expect(runtime.simulation.tetherPolicy).toBe("off");
}

function solveEndplate(runtime: GameRuntime): void {
  activateEndplate(runtime);
  walkPlayerTo(runtime, "p1", "pad-terminal");
  stepWith(runtime);
  waitRuntime(runtime, 80);
  walkPlayerTo(runtime, "p2", "ach-packet");
  stepWith(runtime, playerActions(), playerActions({ carry: true }));
  walkPlayerTo(runtime, "p2", "nicotinic-receptor");
  stepWith(runtime, playerActions(), playerActions({ carry: true }));
  walkPlayerTo(runtime, "p1", "motor-terminal");
  stepWith(runtime, playerActions({ pulse: true }));
  waitRuntime(runtime, 10);
  expect(runtime.snapshot().puzzle?.solved).toBe(true);
}

function waitRuntime(runtime: GameRuntime, ticks: number): void {
  for (let index = 0; index < ticks; index += 1) {
    stepWith(runtime);
  }
}

function solveEndplateCoop(runtime: GameRuntime): void {
  activateEndplate(runtime);

  walkPlayerTo(runtime, "p1", "pad-terminal");
  waitRuntime(runtime, 90);

  walkPlayerTo(runtime, "p2", "ach-packet");
  stepWith(runtime, playerActions(), playerActions({ carry: true }));

  walkPlayerTo(runtime, "p2", "nicotinic-receptor");
  stepWith(runtime, playerActions(), playerActions({ carry: true }));

  walkPlayerTo(runtime, "p1", "motor-terminal");
  stepWith(runtime, playerActions({ pulse: true }));
  waitRuntime(runtime, 10);

  expect(runtime.snapshot().puzzle?.solved).toBe(true);
}

function solveEndplateSolo(runtime: GameRuntime): void {
  activateEndplate(runtime);

  walkPlayerTo(runtime, "p1", "pad-terminal");
  waitRuntime(runtime, 90);

  walkPlayerTo(runtime, "p1", "ach-packet");
  stepWith(runtime, playerActions({ carry: true }));

  walkPlayerTo(runtime, "p1", "nicotinic-receptor");
  stepWith(runtime, playerActions({ carry: true }));

  walkPlayerTo(runtime, "p1", "motor-terminal");
  stepWith(runtime, playerActions({ pulse: true }));
  waitRuntime(runtime, 10);

  expect(runtime.snapshot().puzzle?.solved).toBe(true);
}

function exitEndplate(runtime: GameRuntime): void {
  placeAtExit(runtime, "room-muscle-effector", "exit-to-reflex-core");
  stepWith(runtime);
  expect(runtime.state).toBe("debrief");
}

function finishEndplateDebrief(runtime: GameRuntime, answer: string): void {
  expect(runtime.snapshot().debrief?.prompts[0]?.id).toBe("prompt-obj-2");
  runtime.submitDebrief("prompt-obj-2", answer);
  runtime.finishDebrief();
  expect(runtime.state).toBe("complete");
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
    expect(snapshot.puzzle?.id).toBe("puzzle-node-run");
    expect(snapshot.puzzle?.pulse).toBeNull();
    expect(snapshot.map.nodes.find((node) => node.current)?.visited).toBe(true);
    expect(snapshot.checkpointId).toBe("checkpoint-entry");
    expect(snapshot.world.stage).toEqual({
      x: 0,
      y: 0,
      width: 1280,
      height: 720,
    });
    expect(snapshot.world.zoom).toBe(1);
    expect(snapshot.world.camera.width).toBe(1280);
    expect(snapshot.world.camera.height).toBe(720);
    expect(storage.getItem(runStorageKey("anatomy-reflex"))).toContain(
      "03-nerve-forest",
    );
  });

  it("plays the room theme on boot and pauses/resumes it with the game", () => {
    const { runtime, audio } = makeRuntime();

    expect(audio.themes).toEqual(["audio.music.nerve_forest"]);

    runtime.togglePause();
    expect(runtime.state).toBe("pause");
    expect(audio.pauses).toBe(1);

    runtime.togglePause();
    expect(runtime.state).toBe("level");
    expect(audio.resumes).toBe(1);
  });

  it("falls back to the pack theme when a room has no music", () => {
    const copy = structuredClone(content);
    delete copy.rooms["room-nerve-forest"]?.music;
    copy.theme.audio = {
      ...copy.theme.audio,
      music: "audio.music.anatomy_fallback",
    };

    const { audio } = makeRuntimeWithContent(copy);
    expect(audio.themes).toEqual(["audio.music.anatomy_fallback"]);
  });

  it("stops the theme when neither the room nor the pack supplies music", () => {
    const copy = structuredClone(content);
    const room = copy.rooms["room-nerve-forest"];
    if (room) delete room.music;
    if (copy.theme.audio) delete copy.theme.audio.music;

    const { audio } = makeRuntimeWithContent(copy);
    expect(audio.themes).toEqual([]);
    expect(audio.stoppedThemes).toEqual([{ fadeOutMs: 600 }]);
  });

  it("starts solo runs with P2 inactive and can discard a saved run", () => {
    const storage = new MemorySaveStorage();
    const save = createSave({ storage });
    const runtime = new GameRuntime({
      content,
      save,
      audio: new FakeAudio(),
      now: () => new Date("2026-10-26T12:00:00.000Z"),
    });

    runtime.start({ resume: false, activeP2: false });
    expect(runtime.snapshot().activeP2).toBe(false);
    expect(runtime.snapshot().mode).toBe("solo");
    expect(save.hasRun("anatomy-reflex")).toBe(true);

    runtime.start({ resume: false, activeP2: false });
    expect(save.hasRun("anatomy-reflex")).toBe(true);

    const restored = new GameRuntime({
      content,
      save,
      audio: new FakeAudio(),
      now: () => new Date("2026-10-26T12:10:00.000Z"),
    });
    restored.start({ activeP2: true });
    expect(restored.snapshot().activeP2).toBe(true);
    expect(restored.snapshot().mode).toBe("co-op");
  });

  it("waits for a zoneEnter activation before ticking the puzzle", () => {
    const { runtime } = makeRuntimeWithContent(contentWithActivation("zoneEnter"));
    expect(runtime.snapshot().puzzle).toBeNull();
    expect(runtime.simulation.tetherPolicy).toBe("normal");

    stepWith(runtime);
    expect(runtime.snapshot().puzzle).toBeNull();

    runtime.placePlayer("p1", 350, 640);
    stepWith(runtime);
    expect(runtime.snapshot().puzzle?.id).toBe("puzzle-node-run");
    expect(runtime.simulation.tetherPolicy).toBe("off");
  });

  it("activates an interact puzzle from its authored entity", () => {
    const { runtime } = makeRuntimeWithContent(contentWithActivation("interact"));
    expect(runtime.snapshot().puzzle).toBeNull();

    const agent = runtime.entityPixel("agent-neuron");
    if (!agent) throw new Error("agent-neuron missing");
    runtime.placePlayer("p1", agent.x, agent.y);
    expect(runtime.snapshot().interaction).toMatchObject({
      kind: "puzzle",
      label: "Start Node Run",
    });

    stepWith(runtime, playerActions({ interact: true }));
    expect(runtime.snapshot().puzzle?.id).toBe("puzzle-node-run");
    expect(runtime.simulation.tetherPolicy).toBe("off");
  });

  it("shows and cycles authored hints without a pulse cooldown", () => {
    const { runtime } = makeRuntime();
    expect(runtime.snapshot().puzzle?.canHint).toBe(true);
    expect(runtime.snapshot().puzzle?.pulse).toBeNull();
    expect(runtime.snapshot().puzzle?.hintIndex).toBe(0);
    expect(runtime.snapshot().puzzle?.hintsTotal).toBe(3);
    expect(runtime.snapshot().puzzle?.revealedHints).toEqual([]);

    runtime.puzzleHint();
    expect(runtime.snapshot().puzzle?.hint).toBe(
      "One input is below threshold. The trigger gate needs a second dendrite input.",
    );
    expect(runtime.snapshot().puzzle?.hintIndex).toBe(1);
    expect(runtime.snapshot().puzzle?.revealedHints).toEqual([
      "One input is below threshold. The trigger gate needs a second dendrite input.",
    ]);
    stepWith(runtime);
    runtime.requestFeedback("p1");
    expect(
      runtime
        .snapshot()
        .feedback.cues.some((cue) => cue.content.text?.startsWith("Hint:")),
    ).toBe(true);
    expect(runtime.snapshot().puzzle?.canHint).toBe(true);

    runtime.puzzleHint();
    expect(runtime.snapshot().puzzle?.hint).toBe(
      "Once threshold is crossed, the spike is all-or-none. Extra presses do not increase it.",
    );
    expect(runtime.snapshot().puzzle?.canHint).toBe(true);

    runtime.puzzleHint();
    expect(runtime.snapshot().puzzle?.hint).toBe(
      "The axon is one-way: dendrite → trigger zone → axon → terminal.",
    );
    expect(runtime.snapshot().puzzle?.canHint).toBe(true);
    expect(runtime.snapshot().puzzle?.hintIndex).toBe(3);
    expect(runtime.snapshot().puzzle?.revealedHints).toHaveLength(3);

    runtime.puzzleHint();
    expect(runtime.snapshot().puzzle?.hint).toBe(
      "One input is below threshold. The trigger gate needs a second dendrite input.",
    );
    expect(runtime.snapshot().puzzle?.hintIndex).toBe(1);
    expect(runtime.snapshot().puzzle?.revealedHints).toHaveLength(3);
    expect(
      runtime
        .exportEvidence()
        .events.filter((event) => event.type === "hint_used"),
    ).toHaveLength(3);
  });

  it("allows the Blueprint popup to reveal the next hint", () => {
    const { runtime } = makeRuntime();
    runtime.step(1 / 60, input({ map: true }));
    expect(runtime.state).toBe("map");

    runtime.puzzleHint();
    expect(runtime.state).toBe("map");
    expect(runtime.snapshot().puzzle?.hintIndex).toBe(1);
    expect(runtime.snapshot().puzzle?.revealedHints).toHaveLength(1);
  });

  it("does not solve on one input and resets the counter", () => {
    const { runtime } = makeRuntime();
    pressSensor(runtime, "input-a");

    expect(runtime.snapshot().puzzle?.solved).toBe(false);
    expect(runtime.snapshot().puzzle?.counters.resets ?? 0).toBe(0);

    runtime.resetPuzzle();
    expect(runtime.snapshot().puzzle?.solved).toBe(false);
    expect(runtime.snapshot().puzzle?.counters.resets).toBe(1);
  });

  it("respawns a player at the checkpoint after a hazard", () => {
    const { runtime } = makeRuntimeWithContent(contentWithHazard());
    const spawn = {
      x: runtime.simulation.players.p1.spawnX,
      y: runtime.simulation.players.p1.spawnY,
    };
    runtime.placePlayer("p1", 10.5 * 32, 20 * 32);
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

  it("restores a solved Node Run with the exit latched", () => {
    const storage = new MemorySaveStorage();
    const first = new GameRuntime({
      content,
      save: createSave({ storage }),
      audio: new FakeAudio(),
      now: () => new Date("2026-10-26T12:00:00.000Z"),
    });
    first.start();
    solveNodeRun(first);

    const restored = new GameRuntime({
      content,
      save: createSave({ storage }),
      audio: new FakeAudio(),
      now: () => new Date("2026-10-26T12:10:00.000Z"),
    });
    restored.start();

    expect(restored.snapshot().puzzle?.solved).toBe(true);
    expect(restored.snapshot().abilities).toContain("signal-dash");
    expect(
      restored.snapshot().map.nodes.find((node) => node.id === "map-muscle-effector")
        ?.visited,
    ).toBe(true);
  });

  it("resets to checkpoint on a content-version change while keeping progression", () => {
    const { runtime, storage } = makeRuntime();
    solveNodeRun(runtime);

    const saved = JSON.parse(
      storage.getItem(runStorageKey("anatomy-reflex")) ?? "{}",
    );
    saved.contentVersion = "0.0.0";
    storage.setItem(
      runStorageKey("anatomy-reflex"),
      JSON.stringify(saved),
    );

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
    expect(restored.simulation.players.p1.x).toBeCloseTo(4.5 * 32, 0);
    expect(
      restored
        .exportEvidence()
        .events.some((event) => event.type === "puzzle_solved"),
    ).toBe(true);
    const resaved = JSON.parse(
      storage.getItem(runStorageKey("anatomy-reflex")) ?? "{}",
    );
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

  it("reveals one unique fact per scan target", () => {
    expect(content.facts?.map((fact) => fact.id)).toEqual([
      "NERV-01#1",
      "NERV-01#3",
      "NERV-01#5",
      "NERV-01#6",
    ]);
    const { runtime } = makeRuntime();

    walkTo(runtime, "scan-neuron");
    runtime.scan();
    expect(runtime.snapshot().knownFactIds).toContain("NERV-01#1");
    expect(runtime.snapshot().knownConceptIds).toContain("CON-3");
    expect(
      runtime
        .snapshot()
        .conceptLog.find((concept) => concept.id === "CON-3")
        ?.facts.find((fact) => fact.id === "NERV-01#1")?.discovered,
    ).toBe(true);

    runtime.scan();
    expect(runtime.snapshot().knownFactIds).toEqual(["NERV-01#1"]);

    walkTo(runtime, "scan-myelin");
    runtime.scan();
    expect(runtime.snapshot().knownFactIds).toContain("NERV-01#3");

    walkTo(runtime, "scan-pathway");
    runtime.scan();
    expect(runtime.snapshot().knownFactIds).toContain("NERV-01#6");

    walkTo(runtime, "pad-input-a");
    runtime.scan();
    expect(runtime.snapshot().knownFactIds).not.toContain("NERV-01#5");
  });

  it("runs conversation, scan, Node Run, exit, debrief, and transitions to Endplate Ferry", () => {
    const { runtime, audio, levelChanges } = makeRuntime();

    walkTo(runtime, "agent-neuron");
    runtime.interact();
    const neuronConversation = [...runtime.conversations.values()][0];
    expect(neuronConversation).toBeDefined();
    expect(runtime.state).toBe("level");
    const neuronSurface = runtime
      .snapshot()
      .feedback.surfaces.find(
        (surface) => surface.id === neuronConversation?.surfaceId,
      );
    expect(neuronSurface?.content.speaker).toBe("Neuron Keeper");
    expect(neuronSurface?.conversation).toMatchObject({
      owner: "p1",
      entityId: "agent-neuron",
      dialogueId: "dlg-neuron-01",
    });

    runtime.surfaceAction(neuronConversation!.surfaceId, { type: "confirm" });
    runtime.surfaceAction(neuronConversation!.surfaceId, { type: "confirm" });
    runtime.surfaceAction(neuronConversation!.surfaceId, { type: "confirm" });
    expect(
      runtime
        .snapshot()
        .feedback.surfaces.find(
          (surface) => surface.id === neuronConversation?.surfaceId,
        )?.content.choices,
    ).toHaveLength(2);

    runtime.surfaceAction(neuronConversation!.surfaceId, {
      type: "choose",
      choiceId: "right",
    });
    expect(runtime.snapshot().knownConceptIds).toEqual(
      expect.arrayContaining(["CON-3", "CON-5"]),
    );
    expect(runtime.snapshot().knownFactIds).toEqual(
      expect.arrayContaining(["NERV-01#5"]),
    );
    runtime.surfaceAction(neuronConversation!.surfaceId, { type: "confirm" });
    expect(runtime.conversations.size).toBe(0);

    walkTo(runtime, "scan-pathway");
    runtime.scan();
    expect(runtime.snapshot().knownConceptIds).toContain("CON-5");
    expect(runtime.snapshot().knownFactIds).toContain("NERV-01#6");
    expect(audio.played.length).toBeGreaterThan(0);

    solveNodeRun(runtime);
    expect(
      runtime.snapshot().map.nodes.find((node) => node.id === "map-muscle-effector")
        ?.visited,
    ).toBe(true);

    placeAtExit(runtime, "room-nerve-forest", "exit-to-muscle");
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
      "One input is below threshold, so no spike fires. Two inputs reach threshold and the spike is all-or-none. It travels one way along the axon to the terminal.",
    );
    runtime.finishDebrief();

    expect(runtime.state).toBe("level");
    const snapshot = runtime.snapshot();
    expect(snapshot.level.id).toBe("04-muscle-effector");
    expect(snapshot.roomId).toBe("room-muscle-effector");
    expect(snapshot.checkpointId).toBe("checkpoint-muscle-entry");
    expect(snapshot.puzzle).toBeNull();
    expect(snapshot.map.nodes.find((node) => node.current)?.id).toBe(
      "map-muscle-effector",
    );
    expect(snapshot.abilities).toContain("signal-dash");
    expect(levelChanges).toEqual(["03-nerve-forest", "04-muscle-effector"]);

    const exported = runtime.exportEvidence();
    expect(exported.mode).toBe("co-op");
    expect(exported.sessionId).toBe("session-runtime-test");
    const objective = exported.objectives.find((item) => item.id === "OBJ-2");
    expect(objective).toMatchObject({ requiredMet: false });
    expect(objective?.evidenceIds).toEqual(["EV-2", "EV-7"]);
    expect(
      exported.events.some(
        (event) =>
          event.type === "puzzle_solved" &&
          event.puzzleId === "puzzle-node-run",
      ),
    ).toBe(true);
    expect(
      exported.events.some((event) => event.type === "debrief_completed"),
    ).toBe(true);
    expect(
      exported.events.some((event) => event.type === "pack_completed"),
    ).toBe(false);
  });

  it("notifies the platform when a new run restarts level 03", () => {
    const { runtime, levelChanges } = makeRuntime();
    finishNodeRun(runtime);

    runtime.newRun();
    expect(runtime.snapshot().level.id).toBe("03-nerve-forest");
    expect(levelChanges).toEqual([
      "03-nerve-forest",
      "04-muscle-effector",
      "03-nerve-forest",
    ]);
  });

  it("reveals CON-4 and CON-6 in the Endplate Ferry conversation", () => {
    const { runtime } = makeRuntime();
    finishNodeRun(runtime);

    walkTo(runtime, "agent-muscle");
    runtime.interact();
    const conversation = [...runtime.conversations.values()][0];
    expect(conversation).toBeDefined();
    expect(runtime.state).toBe("level");
    expect(
      runtime
        .snapshot()
        .feedback.surfaces.find(
          (surface) => surface.id === conversation?.surfaceId,
        )?.content.speaker,
    ).toBe("Muscle Effector");

    runtime.surfaceAction(conversation!.surfaceId, { type: "confirm" });
    runtime.surfaceAction(conversation!.surfaceId, { type: "confirm" });
    runtime.surfaceAction(conversation!.surfaceId, { type: "confirm" });
    expect(
      runtime
        .snapshot()
        .feedback.surfaces.find(
          (surface) => surface.id === conversation?.surfaceId,
        )?.content.choices,
    ).toHaveLength(2);

    runtime.surfaceAction(conversation!.surfaceId, {
      type: "choose",
      choiceId: "right",
    });
    expect(runtime.snapshot().knownConceptIds).toEqual(
      expect.arrayContaining(["CON-4", "CON-6"]),
    );

    runtime.surfaceAction(conversation!.surfaceId, { type: "confirm" });
    runtime.surfaceAction(conversation!.surfaceId, { type: "confirm" });
    expect(runtime.conversations.size).toBe(0);
  });

  it("solves Endplate Ferry in co-op and exports both OBJ-2 puzzle solves", () => {
    const { runtime } = makeRuntime();
    finishNodeRun(runtime);

    solveEndplateCoop(runtime);
    const solved = runtime.snapshot();
    expect(solved.puzzle?.solved).toBe(true);
    expect(solved.puzzle?.pulse).not.toBeNull();
    expect(runtime.simulation.tetherPolicy).toBe("off");

    exitEndplate(runtime);
    expect(runtime.snapshot().debrief?.answers).toEqual({});
    expect(runtime.snapshot().debrief?.prompts[0]?.id).toBe("prompt-obj-2");

    finishEndplateDebrief(
      runtime,
      "The action potential opens Ca²⁺ channels; Ca²⁺ triggers vesicle release. ACh crosses the cleft and binds nicotinic receptors on the muscle, so the muscle responds. AChE breaks down ACh to end the signal.",
    );

    const exported = runtime.exportEvidence();
    const objective = exported.objectives.find((item) => item.id === "OBJ-2");
    expect(objective).toMatchObject({ requiredMet: true });
    expect(objective?.evidenceIds).toEqual(["EV-2", "EV-7", "EV-8"]);
    expect(
      exported.events.some(
        (event) =>
          event.type === "puzzle_solved" &&
          event.puzzleId === "puzzle-node-run",
      ),
    ).toBe(true);
    expect(
      exported.events.some(
        (event) =>
          event.type === "puzzle_solved" &&
          event.puzzleId === "puzzle-endplate-ferry",
      ),
    ).toBe(true);
    expect(
      exported.events.some(
        (event) =>
          event.type === "level_completed" &&
          event.levelId === "04-muscle-effector",
      ),
    ).toBe(true);
    expect(
      exported.events.some((event) => event.type === "pack_completed"),
    ).toBe(true);
  });

  it("solves Endplate Ferry in solo mode with the P1 union", () => {
    const { runtime } = makeRuntime();
    finishNodeRun(runtime);

    runtime.togglePlayer2();
    expect(runtime.snapshot().mode).toBe("solo");
    expect(runtime.snapshot().players.p1.abilities).toEqual(
      expect.arrayContaining(["pulse", "carry"]),
    );

    solveEndplateSolo(runtime);
    expect(runtime.snapshot().puzzle?.solved).toBe(true);
    expect(runtime.snapshot().activeP2).toBe(false);
  });

  it("keeps the 03 debrief answer out of the 04 debrief", () => {
    const { runtime } = makeRuntime();
    finishNodeRun(runtime);
    solveEndplateCoop(runtime);
    exitEndplate(runtime);

    expect(runtime.snapshot().debrief?.answers).toEqual({});
    runtime.finishDebrief();
    expect(runtime.state).toBe("debrief");
    expect(runtime.snapshot().toast).toBe(
      "Answer every teach-back prompt to finish",
    );

    runtime.submitDebrief(
      "prompt-obj-2",
      "Ca²⁺ enters the terminal and triggers ACh release; ACh binds the nicotinic receptor and the muscle responds.",
    );
    runtime.finishDebrief();
    expect(runtime.state).toBe("complete");
  });

  it("restores an Endplate Ferry run from the transition autosave", () => {
    const { runtime, storage } = makeRuntime();
    finishNodeRun(runtime);
    activateEndplate(runtime);

    const restored = new GameRuntime({
      content,
      save: createSave({ storage }),
      audio: new FakeAudio(),
      now: () => new Date("2026-10-26T12:10:00.000Z"),
      sessionId: "session-runtime-test-restore",
    });
    restored.start();

    const snapshot = restored.snapshot();
    expect(snapshot.state).toBe("level");
    expect(snapshot.level.id).toBe("04-muscle-effector");
    expect(snapshot.roomId).toBe("room-muscle-effector");
    expect(snapshot.checkpointId).toBe("checkpoint-muscle-entry");
    expect(snapshot.puzzle?.id).toBe("puzzle-endplate-ferry");
    expect(restored.simulation.tetherPolicy).toBe("off");
  });

  it("does not surface an empty-receptor rejection during a pulse", () => {
    const { runtime } = makeRuntime();
    finishNodeRun(runtime);
    activateEndplate(runtime);

    stepWith(runtime, playerActions({ pulse: true }));
    waitRuntime(runtime, 10);

    expect(runtime.snapshot().puzzle?.counters.wrongReceptor ?? 0).toBe(0);
    expect(runtime.snapshot().puzzle?.solved).toBe(false);
    expect(runtime.snapshot().toast).not.toContain("rejects");
  });


  it("restores progression and positions from the autosave", () => {
    const { runtime, storage } = makeRuntime();

    solveNodeRun(runtime);
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
    expect(
      snapshot.map.nodes.find((node) => node.id === "map-muscle-effector")
        ?.visited,
    ).toBe(true);
    expect(restored.snapshot().toast).toBe("Resumed from checkpoint");
  });

  it("solves Node Run in solo mode with the union of both abilities", () => {
    const { runtime } = makeRuntime();
    runtime.togglePlayer2();
    expect(runtime.snapshot().mode).toBe("solo");
    expect(runtime.snapshot().players.p1.abilities).toEqual(
      expect.arrayContaining(["pulse", "carry"]),
    );

    pressSensor(runtime, "input-a");
    pressSensor(runtime, "input-b");
    pressSensor(runtime, "terminal-zone");
    stepWith(runtime);

    expect(runtime.snapshot().abilities).toContain("signal-dash");
    expect(runtime.snapshot().puzzle?.solved).toBe(true);
  });

  it("splits the two dendrite inputs across co-op players", () => {
    const { runtime } = makeRuntime();
    placeAtSensor(runtime, "input-a", "p1");
    placeAtSensor(runtime, "input-b", "p2");
    stepWith(runtime);
    expect(runtime.snapshot().puzzle?.solved).toBe(false);

    placeAtSensor(runtime, "terminal-zone", "p1");
    stepWith(runtime);
    expect(runtime.snapshot().puzzle?.solved).toBe(true);
    expect(runtime.snapshot().abilities).toContain("signal-dash");
  });

  it("restores a partial threshold count from the autosave", () => {
    const storage = new MemorySaveStorage();
    const first = new GameRuntime({
      content,
      save: createSave({ storage }),
      audio: new FakeAudio(),
      now: () => new Date("2026-10-26T12:00:00.000Z"),
    });
    first.start();
    pressSensor(first, "input-a");
    expect(first.snapshot().puzzle?.solved).toBe(false);
    first.puzzleHint();

    const restored = new GameRuntime({
      content,
      save: createSave({ storage }),
      audio: new FakeAudio(),
      now: () => new Date("2026-10-26T12:10:00.000Z"),
    });
    restored.start();
    expect(restored.snapshot().puzzle?.solved).toBe(false);

    pressSensor(restored, "input-b");
    pressSensor(restored, "terminal-zone");
    stepWith(restored);
    expect(restored.snapshot().puzzle?.solved).toBe(true);
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

  it("defaults shared feedback on and persists the pause toggle", () => {
    const { runtime, storage } = makeRuntime();

    expect(runtime.snapshot().settings.feedback.showShared).toBe(true);
    runtime.toggleSharedFeedback();
    expect(runtime.snapshot().settings.feedback.showShared).toBe(false);

    const reloaded = createSave({ storage });
    expect(reloaded.settings.feedback.showShared).toBe(false);

    runtime.toggleSharedFeedback();
    expect(runtime.snapshot().settings.feedback.showShared).toBe(true);
  });

  it("applies a persisted shared feedback opt-out at boot", () => {
    const storage = new MemorySaveStorage();
    createSave({ storage }).updateFeedback({ showShared: false });

    const { runtime } = makeRuntime(storage);
    const snapshot = runtime.snapshot();
    expect(snapshot.settings.feedback.showShared).toBe(false);
    expect(
      snapshot.feedback.surfaces.some(
        (surface) => surface.owner === "shared",
      ),
    ).toBe(false);
    expect(snapshot.feedback.beats).toEqual([]);

    runtime.placePlayer("p1", 960, 640);
    stepWith(runtime, playerActions({ scan: true }));
    expect(
      runtime
        .snapshot()
        .feedback.surfaces.some((item) => item.id.startsWith("fb:help:")),
    ).toBe(false);
    expect(runtime.snapshot().puzzle?.counters.helpRequests ?? 0).toBe(0);
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

  it("dashes only after Node Run unlocks signal-dash", () => {
    const { runtime } = makeRuntime();
    const startX = runtime.simulation.players.p1.x;

    runtime.step(1 / 60, {
      ...input(),
      intents: { ...input().intents, p1: { moveX: 0, jump: false, dash: true } },
    });
    expect(runtime.simulation.players.p1.x).toBe(startX);

    solveNodeRun(runtime);
    expect(runtime.controlDescriptor("p1").verbs).toContain("dash");
    expect(runtime.controlDescriptor("p1").dashReady).toBe(true);

    const before = runtime.simulation.players.p1.x;
    runtime.step(1 / 60, {
      ...input(),
      intents: { ...input().intents, p1: { moveX: 0, jump: false, dash: true } },
    });
    expect(runtime.simulation.players.p1.x).toBeGreaterThan(before);

    runtime.simulation.players.p1.facing = 1;
    runtime.simulation.players.p1.dashTime = 0;
    runtime.simulation.players.p1.dashCooldown = 0;
    const facingRight = runtime.simulation.players.p1.x;
    runtime.step(1 / 60, {
      ...input(),
      intents: { ...input().intents, p1: { moveX: -1, jump: false, dash: true } },
    });
    expect(runtime.simulation.players.p1.x).toBeLessThan(facingRight);
  });

  it("projects persistent feedback and beat progress at boot", () => {
    const { runtime } = makeRuntime();
    const snapshot = runtime.snapshot();
    expect(snapshot.feedback.seq).toBeGreaterThan(0);
    expect(snapshot.feedback.surfaces.map((surface) => surface.id)).toEqual(
      expect.arrayContaining(["fb:binary:input-a", "fb:counter:stimulus-counter"]),
    );
    expect(snapshot.feedback.beats.length).toBeGreaterThan(0);
    expect(snapshot.feedback.beats.map((beat) => beat.label)).toEqual([
      "Press a dendrite input",
      "Reach threshold",
      "Run the axon",
      "Reach the terminal",
      "Open the exit",
    ]);
    expect(
      snapshot.feedback.surfaces.find(
        (surface) => surface.id === "fb:binary:input-a",
      )?.content.text,
    ).toBe("Dendrite input A is ready.");
    expect(
      snapshot.feedback.surfaces.find(
        (surface) => surface.id === "fb:counter:stimulus-counter",
      )?.content.text,
    ).toContain("Stimulus counter");
    expect(snapshot.world.entities["agent-neuron"]?.anchors.center).toEqual({
      x: 48,
      y: 48,
    });
    expect(snapshot.blueprint?.puzzleId).toBe("puzzle-node-run");
    expect(snapshot.blueprint?.components.map((component) => component.id)).toEqual([
      "inputs",
      "threshold",
      "axon",
      "exit",
    ]);
    expect(snapshot.blueprint?.components.map((component) => component.actor)).toEqual([
      "both",
      "both",
      "p1",
      "shared",
    ]);
    expect(snapshot.blueprint?.components.map((component) => component.state)).toEqual([
      "active",
      "pending",
      "pending",
      "pending",
    ]);
    expect(snapshot.blueprint?.edges).toHaveLength(3);
    expect(runtime.drainEffects()).toEqual([]);
  });

  it("projects authored 04 labels and beats after activation", () => {
    const { runtime } = makeRuntime();
    finishNodeRun(runtime);
    activateEndplate(runtime);
    const snapshot = runtime.snapshot();
    expect(snapshot.feedback.beats.map((beat) => beat.label)).toEqual([
      "Trigger the terminal",
      "Open the Ca²⁺ window",
      "Carry ACh across the cleft",
      "Bind the nicotinic receptor",
      "Muscle responds",
      "ACh is cleared",
    ]);
    expect(
      snapshot.feedback.surfaces.find(
        (surface) => surface.id === "fb:carrier:ach-packet",
      )?.content.text,
    ).toBe("ACh packet is free.");
    expect(
      snapshot.feedback.surfaces.find(
        (surface) => surface.id === "fb:binary:terminal-plate",
      )?.content.title,
    ).toBe("Terminal plate");
    // Idle meters are intentionally hidden; the ring appears when running.
    expect(
      snapshot.feedback.surfaces.some(
        (surface) => surface.id === "fb:meter:ca-timer",
      ),
    ).toBe(false);
    expect(snapshot.blueprint?.puzzleId).toBe("puzzle-endplate-ferry");
    expect(snapshot.blueprint?.components.map((component) => component.id)).toEqual([
      "trigger",
      "carry",
      "bind",
      "response",
    ]);
    expect(snapshot.blueprint?.components.map((component) => component.actor)).toEqual([
      "p1",
      "p2",
      "p2",
      "p1",
    ]);
    expect(snapshot.blueprint?.components[0]?.state).toBe("active");
  });

  it("projects the authored Silicon interrupt-loop blueprint after activation", () => {
    const { runtime } = makeRuntimeWithContent(siliconContent);
    const consolePoint = runtime.entityPixel("sensor-console");
    if (!consolePoint) throw new Error("sensor-console missing");
    runtime.placePlayer("p1", consolePoint.x, consolePoint.y);
    expect(runtime.snapshot().interaction).toMatchObject({
      kind: "puzzle",
      label: "Start Interrupt Loop",
    });

    stepWith(runtime, playerActions({ interact: true }));
    const blueprint = runtime.snapshot().blueprint;
    expect(blueprint?.puzzleId).toBe("puzzle-interrupt-loop");
    expect(blueprint?.title).toBe("Interrupt route");
    expect(blueprint?.components.map((component) => component.id)).toEqual([
      "detect",
      "route",
      "wake",
      "actuate",
    ]);
    expect(blueprint?.components.map((component) => component.actor)).toEqual([
      "p1",
      "p1",
      "p1",
      "p1",
    ]);
    expect(blueprint?.components[0]?.state).toBe("active");
  });

  it("delivers effect plans idempotently with attribution", () => {
    const { runtime } = makeRuntime();
    expect(runtime.drainEffects()).toEqual([]);

    pressSensor(runtime, "input-a", "p2");
    const first = runtime.drainEffects();
    const plate = first.find((effect) =>
      effect.planId.startsWith("fx.plate.press"),
    );
    expect(plate).toMatchObject({
      actor: "p2",
      owner: "p2",
      accent: "p2",
    });
    expect(plate?.stages.length).toBeGreaterThan(0);
    expect(runtime.drainEffects().map((effect) => effect.id)).toEqual(
      first.map((effect) => effect.id),
    );

    waitRuntime(runtime, 20);
    expect(
      runtime
        .drainEffects()
        .some((effect) => effect.planId.startsWith("fx.plate.press")),
    ).toBe(false);
  });

  it("does not let draining effects change puzzle or player state", () => {
    const { runtime } = makeRuntime();
    pressSensor(runtime, "input-a", "p1");
    const puzzle = runtime.snapshot().puzzle;
    const players = JSON.stringify(runtime.simulation.players);
    const props = JSON.stringify(runtime.simulation.props);

    runtime.drainEffects();

    expect(runtime.snapshot().puzzle).toEqual(puzzle);
    expect(JSON.stringify(runtime.simulation.players)).toBe(players);
    expect(JSON.stringify(runtime.simulation.props)).toBe(props);
  });

  it("maps a pulse launch to an A-to-B travel plan", () => {
    const { runtime } = makeRuntime();
    finishNodeRun(runtime);
    activateEndplate(runtime);
    walkPlayerTo(runtime, "p1", "motor-terminal");
    stepWith(runtime, playerActions({ pulse: true }));

    const travel = runtime
      .drainEffects()
      .filter((effect) => effect.planId.startsWith("fx.pulse.travel"));
    expect(travel.length).toBeGreaterThan(0);
    expect(travel[0]?.stages[0]?.path).toMatchObject({ kind: "segment" });
    expect(travel[0]?.accent).toBe("p1");
  });

  it("uses the terminal muzzle and receptor mouth for pulse travel", () => {
    const { runtime } = makeRuntime();
    finishNodeRun(runtime);
    activateEndplate(runtime);
    walkPlayerTo(runtime, "p1", "motor-terminal");
    stepWith(runtime, playerActions({ pulse: true }));

    const travel = runtime
      .drainEffects()
      .filter((effect) => effect.planId.startsWith("fx.pulse.travel"));
    const nicotinic = travel.find(
      (effect) =>
        effect.stages[0]?.path?.kind === "segment" &&
        effect.stages[0].path.to.kind === "entity" &&
        effect.stages[0].path.to.id === "nicotinic-receptor",
    );
    expect(nicotinic?.stages[0]?.path).toMatchObject({
      kind: "segment",
      from: {
        kind: "entity",
        id: "motor-terminal",
        socket: "muzzle",
      },
      to: {
        kind: "entity",
        id: "nicotinic-receptor",
        socket: "mouth",
      },
    });
  });

  it("restores the cleared ACh packet on runtime reset", () => {
    const { runtime } = makeRuntime();
    finishNodeRun(runtime);
    activateEndplate(runtime);
    walkPlayerTo(runtime, "p2", "ach-packet");
    stepWith(runtime, playerActions(), playerActions({ carry: true }));
    walkPlayerTo(runtime, "p2", "nicotinic-receptor");
    stepWith(runtime, playerActions(), playerActions({ carry: true }));
    walkPlayerTo(runtime, "p1", "motor-terminal");
    stepWith(runtime, playerActions({ pulse: true }));

    let ticks = 0;
    while (
      runtime.simulation.props["ach-packet"]?.state !== "cleared" &&
      ticks < 220
    ) {
      stepWith(runtime);
      ticks += 1;
    }
    expect(runtime.simulation.props["ach-packet"]?.state).toBe("cleared");
    expect(runtime.snapshot().puzzle?.solved).toBe(false);

    runtime.resetPuzzle();
    expect(runtime.simulation.props["ach-packet"]?.state).toBe("free");
    expect(
      runtime
        .snapshot()
        .feedback.surfaces.find(
          (surface) => surface.id === "fb:carrier:ach-packet",
        )?.content.text,
    ).toBe("ACh packet is free.");
  });

  it("drains the authored tile path after the axon relay activates", () => {
    const { runtime } = makeRuntime();
    solveNodeRun(runtime);

    const tile = runtime
      .drainEffects()
      .find((effect) => effect.planId.startsWith("fx.tile.path"));
    expect(tile).toBeDefined();
    expect(tile?.stages[0]?.visual).toMatchObject({
      kind: "tileTint",
      target: {
        kind: "tileRegion",
        layer: "tiles",
        x1: 19,
        y1: 16,
        x2: 38,
        y2: 16,
      },
    });
    expect(tile?.stages[0]?.timing.stagger).toEqual({
      kind: "byIndex",
      ticks: 1,
    });
  });

  it("clears the ACh packet after AChE without changing the solve", () => {
    const { runtime } = makeRuntime();
    finishNodeRun(runtime);
    solveEndplate(runtime);
    const puzzleState = runtime.snapshot().puzzle;

    let ticks = 0;
    while (
      runtime.simulation.props["ach-packet"]?.state !== "cleared" &&
      ticks < 220
    ) {
      stepWith(runtime);
      ticks += 1;
    }

    const snapshot = runtime.snapshot();
    expect(ticks).toBeLessThan(220);
    expect(runtime.simulation.props["ach-packet"]?.state).toBe("cleared");
    expect(snapshot.puzzle?.solved).toBe(true);
    expect(snapshot.puzzle?.solved).toBe(puzzleState?.solved);
    expect(
      snapshot.feedback.surfaces.find(
        (surface) => surface.id === "fb:carrier:ach-packet",
      ),
    ).toMatchObject({
      state: "expired",
      severity: "neutral",
      content: { text: "ACh packet cleared" },
    });
    const dissolve = runtime
      .drainEffects()
      .find((effect) => effect.planId.startsWith("fx.ach.dissolve"));
    expect(dissolve).toBeDefined();
    expect(dissolve?.stages.map((stage) => stage.visual.kind)).toEqual([
      "ring",
      "particleBurst",
    ]);
  });

  it("projects authored room sockets into the runtime world view", () => {
    const { runtime } = makeRuntimeWithContent(contentWithAnchors());
    const entity = runtime.snapshot().world.entities["agent-neuron"];
    expect(entity?.anchors.center).toEqual({ x: 48, y: 48 });
    expect(entity?.anchors.muzzle).toEqual({
      x: 30,
      y: 8,
      direction: 0,
    });
  });

  it("attributes a P2 plate press to P2 and keeps it out of the toast", () => {
    const { runtime } = makeRuntime();
    pressSensor(runtime, "input-a", "p2");
    runtime.requestFeedback("p2");
    const snapshot = runtime.snapshot();
    const p2Captions = snapshot.feedback.cues.filter(
      (item) =>
        item.actor === "p2" && item.presentation === "playerCaption",
    );
    expect(p2Captions).toHaveLength(1);
    expect(p2Captions[0]).toMatchObject({
      actor: "p2",
      owner: "p2",
      anchor: { kind: "player", playerId: "p2" },
      presentation: "playerCaption",
    });
    expect(snapshot.toast).toBeNull();
  });

  it("keeps solved feedback shared and on the screen anchor", () => {
    const { runtime } = makeRuntime();
    solveNodeRun(runtime);
    runtime.requestFeedback("p1");
    const cue = runtime
      .snapshot()
      .feedback.cues.find((item) => item.cause.startsWith("puzzle:solved"));
    expect(cue).toMatchObject({
      actor: null,
      owner: "shared",
      anchor: { kind: "screen" },
      presentation: "screenCaption",
      content: { text: "Signal restored" },
    });
  });

  it("attributes an empty receptor rejection to the pulsing player", () => {
    const { runtime } = makeRuntime();
    finishNodeRun(runtime);
    activateEndplate(runtime);
    stepWith(runtime, playerActions({ pulse: true }));
    waitRuntime(runtime, 10);
    runtime.requestFeedback("p1");
    const cue = runtime
      .snapshot()
      .feedback.cues.find((item) =>
        item.cause.startsWith("puzzle:receptorRejected:"),
      );
    expect(cue).toMatchObject({
      actor: "p1",
      owner: "p1",
      presentation: "speechBubble",
      reason: "empty",
    });
    expect(cue?.anchor).toMatchObject({ kind: "entity" });
  });

  it("lets P1 and P2 talk to different entities at once", () => {
    const { runtime } = makeRuntimeWithContent(contentWithSecondAgent());
    walkPlayerTo(runtime, "p1", "agent-neuron");
    stepWith(runtime, playerActions({ interact: true }));
    walkPlayerTo(runtime, "p2", "agent-neuron-2");
    stepWith(runtime, playerActions(), playerActions({ interact: true }));

    const conversations = [...runtime.conversations.values()];
    expect(conversations).toHaveLength(2);
    expect(new Set(conversations.map((item) => item.owner))).toEqual(
      new Set(["p1", "p2"]),
    );
    expect(new Set(conversations.map((item) => item.entityId))).toEqual(
      new Set(["agent-neuron", "agent-neuron-2"]),
    );
  });

  it("runs two owned conversations at once and freezes only the chooser", () => {
    const { runtime } = makeRuntime();

    walkPlayerTo(runtime, "p1", "agent-neuron");
    stepWith(runtime, playerActions({ interact: true }));
    const p1Conversation = [...runtime.conversations.values()].find(
      (item) => item.owner === "p1",
    );
    expect(p1Conversation).toBeDefined();

    walkPlayerTo(runtime, "p2", "agent-neuron");
    stepWith(runtime, playerActions(), playerActions({ interact: true }));
    const p2Conversation = [...runtime.conversations.values()].find(
      (item) => item.owner === "p2",
    );
    expect(p2Conversation).toBeDefined();
    expect(runtime.conversations.size).toBe(2);

    for (let index = 0; index < 3; index += 1) {
      runtime.surfaceAction(p1Conversation!.surfaceId, { type: "confirm" });
    }
    expect(p1Conversation!.session.nodeId).toBe("check");
    expect(p2Conversation!.session.nodeId).toBe("intro");

    const p1X = runtime.simulation.players.p1.x;
    const p2X = runtime.simulation.players.p2.x;
    runtime.step(1 / 60, {
      ...input(),
      intents: {
        p1: { moveX: 1, jump: false, dash: false },
        p2: { moveX: 1, jump: false, dash: false },
      },
    });
    expect(runtime.simulation.players.p1.x).toBeCloseTo(p1X, 0);
    expect(runtime.simulation.players.p2.x).toBeGreaterThan(p2X);

    runtime.surfaceAction(p2Conversation!.surfaceId, { type: "cancel" });
    expect(runtime.conversations.size).toBe(1);
  });

  it("shows the shared help affordance only after a scan request inside an info area", () => {
    const { runtime } = makeRuntime();
    runtime.placePlayer("p1", 960, 640);
    stepWith(runtime, playerActions({ scan: true }));

    const surface = runtime
      .snapshot()
      .feedback.surfaces.find((item) => item.id.startsWith("fb:help:"));
    expect(surface).toBeDefined();
    expect(surface).toMatchObject({
      owner: "shared",
      audience: "both",
      presentation: "hudStatus",
      lifetime: { sticky: false, ttlTicks: 300 },
    });
    expect(surface?.content.choices?.map((choice) => choice.id)).toEqual([
      "hint",
      "reset",
    ]);
    expect(runtime.snapshot().puzzle?.hint).toBeNull();
    expect(runtime.snapshot().puzzle?.counters.helpRequests).toBe(1);

    runtime.surfaceAction(surface!.id, {
      type: "choose",
      choiceId: "hint",
    });
    expect(runtime.snapshot().puzzle?.hint).not.toBeNull();
    expect(
      runtime
        .snapshot()
        .feedback.surfaces.some((item) => item.id.startsWith("fb:help:")),
    ).toBe(false);
  });

  it("does not show the help affordance outside an info area or when a scan target wins", () => {
    const { runtime } = makeRuntime();

    runtime.placePlayer("p1", 96, 640);
    stepWith(runtime, playerActions({ scan: true }));
    expect(
      runtime
        .snapshot()
        .feedback.surfaces.some((item) => item.id.startsWith("fb:help:")),
    ).toBe(false);

    const scan = runtime.entityPixel("scan-neuron");
    if (!scan) throw new Error("scan-neuron missing");
    runtime.placePlayer("p1", scan.x, scan.y);
    stepWith(runtime, playerActions({ scan: true }));
    expect(
      runtime
        .snapshot()
        .feedback.surfaces.some((item) => item.id.startsWith("fb:help:")),
    ).toBe(false);
    expect(
      runtime.snapshot().feedback.cues.some((cue) =>
        cue.cause.startsWith("action:p1:scan:completed"),
      ),
    ).toBe(true);
  });

  it("expires the requested help surface and allows P2 to refresh it", () => {
    const copy = structuredClone(content);
    const room = copy.rooms["room-nerve-forest"];
    if (!room?.infoAreas?.[0]) throw new Error("info area missing");
    room.infoAreas[0].ttlTicks = 3;
    const { runtime } = makeRuntimeWithContent(copy);

    runtime.placePlayer("p1", 960, 640);
    stepWith(runtime, playerActions({ scan: true }));
    const helpId = "fb:help:puzzle-node-run";
    expect(
      runtime.snapshot().feedback.surfaces.some((item) => item.id === helpId),
    ).toBe(true);

    stepWith(runtime);
    stepWith(runtime);
    stepWith(runtime);
    expect(
      runtime.snapshot().feedback.surfaces.some((item) => item.id === helpId),
    ).toBe(false);

    runtime.placePlayer("p2", 960, 640);
    stepWith(runtime, playerActions(), playerActions({ scan: true }));
    expect(
      runtime.snapshot().feedback.surfaces.some((item) => item.id === helpId),
    ).toBe(true);
  });

  it("hides shared cues, state surfaces, and beats when disabled", () => {
    const { runtime } = makeRuntime();
    solveNodeRun(runtime);
    expect(runtime.requestFeedback("p1")).toBe(true);
    expect(
      runtime
        .snapshot()
        .feedback.cues.some((cue) => cue.owner === "shared"),
    ).toBe(true);

    runtime.toggleSharedFeedback();
    const snapshot = runtime.snapshot();
    expect(snapshot.feedback.cues.some((cue) => cue.owner === "shared")).toBe(
      false,
    );
    expect(
      snapshot.feedback.surfaces.some(
        (surface) => surface.owner === "shared",
      ),
    ).toBe(false);
    expect(snapshot.feedback.beats).toEqual([]);
    expect(snapshot.settings.feedback.showShared).toBe(false);
    expect(runtime.drainEffects().length).toBeGreaterThan(0);
  });

  it("restores shared state surfaces and beats when re-enabled", () => {
    const { runtime } = makeRuntime();
    const before = runtime.snapshot().feedback;
    const surfaceIds = before.surfaces.map((surface) => surface.id);
    const beatLabels = before.beats.map((beat) => beat.label);
    expect(surfaceIds.length).toBeGreaterThan(0);
    expect(beatLabels.length).toBeGreaterThan(0);

    runtime.toggleSharedFeedback();
    expect(runtime.snapshot().feedback.surfaces).toEqual([]);
    expect(runtime.snapshot().feedback.beats).toEqual([]);

    runtime.toggleSharedFeedback();
    const after = runtime.snapshot().feedback;
    expect(after.surfaces.map((surface) => surface.id)).toEqual(surfaceIds);
    expect(after.beats.map((beat) => beat.label)).toEqual(beatLabels);
  });

  it("hides unanchored logical state but keeps physical markers", () => {
    const { runtime } = makeRuntime();
    const surfaces = runtime.snapshot().feedback.surfaces;
    expect(surfaces.some((surface) => surface.id === "fb:binary:input-a")).toBe(
      true,
    );
    expect(
      surfaces.some((surface) => surface.id === "fb:binary:input-a-trigger"),
    ).toBe(false);
    expect(
      surfaces.some((surface) => surface.id === "fb:conductor:spike-relay"),
    ).toBe(false);
    expect(surfaces.every((surface) => surface.placement !== "hidden")).toBe(
      true,
    );
  });

  it("keeps effects for hidden logical surfaces", () => {
    const { runtime } = makeRuntime();
    solveNodeRun(runtime);
    expect(
      runtime
        .drainEffects()
        .some((effect) => effect.id.includes("fb:conductor:spike-relay")),
    ).toBe(true);
  });

  it("opens one inspect panel and closes it with cancel", () => {
    const { runtime } = makeRuntime();
    const source = runtime
      .snapshot()
      .feedback.surfaces.find((surface) => surface.id === "fb:binary:input-a");
    expect(source?.content.title).toBe("Dendrite input A");

    runtime.surfaceAction("fb:binary:input-a", { type: "inspect" });
    const panel = runtime
      .snapshot()
      .feedback.surfaces.find(
        (surface) => surface.presentation === "anchoredPanel",
      );
    expect(panel).toMatchObject({
      placement: "hud",
      interaction: { mode: "none" },
      content: { title: "Dendrite input A" },
    });
    expect(panel?.content.text).toContain("Dendrite input A is ready.");

    runtime.surfaceAction(panel?.id ?? "", { type: "cancel" });
    expect(
      runtime
        .snapshot()
        .feedback.surfaces.some(
          (surface) => surface.presentation === "anchoredPanel",
        ),
    ).toBe(false);
  });

  it("toggles the nearest inspect panel with I", () => {
    const { runtime } = makeRuntime();
    runtime.step(1 / 60, input({ inspect: true }));
    expect(
      runtime
        .snapshot()
        .feedback.surfaces.some(
          (surface) => surface.presentation === "anchoredPanel",
        ),
    ).toBe(true);

    runtime.step(1 / 60, input({ inspect: true }));
    expect(
      runtime
        .snapshot()
        .feedback.surfaces.some(
          (surface) => surface.presentation === "anchoredPanel",
        ),
    ).toBe(false);
  });

  it("closes the inspect panel when shared feedback is disabled", () => {
    const { runtime } = makeRuntime();
    runtime.surfaceAction("fb:binary:input-a", { type: "inspect" });
    expect(
      runtime
        .snapshot()
        .feedback.surfaces.some(
          (surface) => surface.presentation === "anchoredPanel",
        ),
    ).toBe(true);

    runtime.toggleSharedFeedback();
    expect(
      runtime
        .snapshot()
        .feedback.surfaces.some(
          (surface) => surface.presentation === "anchoredPanel",
        ),
    ).toBe(false);
  });

  it("shows a running timer as a world ring", () => {
    const { runtime } = makeRuntime();
    finishNodeRun(runtime);
    activateEndplate(runtime);
    walkPlayerTo(runtime, "p1", "pad-terminal");
    stepWith(runtime);

    const timer = runtime
      .snapshot()
      .feedback.surfaces.find(
        (surface) => surface.id === "fb:meter:ca-timer",
      );
    expect(timer).toMatchObject({
      placement: "world",
      presentation: "hudMeter",
      state: "progress",
    });
    expect(timer?.content.title).toBe("Ca²⁺ window");
    expect(timer?.content.progress?.value).toBeGreaterThan(0);
  });

  it("keeps player feedback and skips shared help while disabled", () => {
    const { runtime } = makeRuntime();
    runtime.toggleSharedFeedback();

    runtime.placePlayer("p1", 960, 640);
    stepWith(runtime, playerActions({ scan: true }));
    let snapshot = runtime.snapshot();
    expect(
      snapshot.feedback.surfaces.some((item) => item.id.startsWith("fb:help:")),
    ).toBe(false);
    expect(
      snapshot.feedback.surfaces.some(
        (surface) => surface.owner === "shared",
      ),
    ).toBe(false);
    expect(snapshot.feedback.beats).toEqual([]);
    expect(snapshot.puzzle?.counters.helpRequests ?? 0).toBe(0);
    expect(
      snapshot.feedback.cues.find((cue) => cue.actor === "p1"),
    ).toMatchObject({
      owner: "p1",
      presentation: "playerCaption",
    });
    expect(
      snapshot.feedback.cues.some((cue) =>
        cue.content.text?.includes("Nothing to scan here"),
      ),
    ).toBe(true);

    runtime.toggleSharedFeedback();
    stepWith(runtime, playerActions({ scan: true }));
    snapshot = runtime.snapshot();
    expect(
      snapshot.feedback.surfaces.some((item) => item.id.startsWith("fb:help:")),
    ).toBe(true);

    runtime.toggleSharedFeedback();
    expect(
      runtime
        .snapshot()
        .feedback.surfaces.some((item) => item.id.startsWith("fb:help:")),
    ).toBe(false);
  });

  it("restores a saved conversation and migrates an old dialogue field", () => {
    const storage = new MemorySaveStorage();
    const first = new GameRuntime({
      content,
      save: createSave({ storage }),
      audio: new FakeAudio(),
      now: () => new Date("2026-10-26T12:00:00.000Z"),
    });
    first.start();
    walkTo(first, "agent-neuron");
    first.interact();
    const conversation = [...first.conversations.values()][0]!;
    first.surfaceAction(conversation.surfaceId, { type: "confirm" });

    const restored = new GameRuntime({
      content,
      save: createSave({ storage }),
      audio: new FakeAudio(),
      now: () => new Date("2026-10-26T12:10:00.000Z"),
    });
    restored.start();
    expect(restored.conversations.size).toBe(1);
    const state = [...restored.conversations.values()][0]!;
    expect(state.owner).toBe("p1");
    expect(state.entityId).toBe("agent-neuron");
    expect(state.session.nodeId).toBe("problem");
    expect(
      restored
        .snapshot()
        .feedback.surfaces.some((surface) => surface.id === state.surfaceId),
    ).toBe(true);

    const raw = JSON.parse(
      storage.getItem(runStorageKey("anatomy-reflex")) ?? "{}",
    );
    raw.conversations = undefined;
    raw.dialogue = { dialogueId: "dlg-neuron-01", nodeId: "problem" };
    delete raw.conversations;
    storage.setItem(
      runStorageKey("anatomy-reflex"),
      JSON.stringify(raw),
    );

    const migrated = new GameRuntime({
      content,
      save: createSave({ storage }),
      audio: new FakeAudio(),
      now: () => new Date("2026-10-26T12:20:00.000Z"),
    });
    migrated.start();
    const migratedState = [...migrated.conversations.values()][0]!;
    expect(migratedState.owner).toBe("p1");
    expect(migratedState.entityId).toBe("agent-neuron");
    expect(migratedState.session.nodeId).toBe("problem");
  });

  it("closes a restored conversation with a recovery cue when its entity is gone", () => {
    const storage = new MemorySaveStorage();
    const first = new GameRuntime({
      content,
      save: createSave({ storage }),
      audio: new FakeAudio(),
      now: () => new Date("2026-10-26T12:00:00.000Z"),
    });
    first.start();
    const raw = JSON.parse(
      storage.getItem(runStorageKey("anatomy-reflex")) ?? "{}",
    );
    raw.conversations = [
      {
        surfaceId: "conversation:p1:missing",
        dialogueId: "dlg-neuron-01",
        nodeId: "intro",
        owner: "p1",
        entityId: "missing",
      },
    ];
    storage.setItem(
      runStorageKey("anatomy-reflex"),
      JSON.stringify(raw),
    );

    const restored = new GameRuntime({
      content,
      save: createSave({ storage }),
      audio: new FakeAudio(),
      now: () => new Date("2026-10-26T12:10:00.000Z"),
    });
    restored.start();
    restored.requestFeedback("p1");
    expect(restored.conversations.size).toBe(0);
    expect(
      restored
        .snapshot()
        .feedback.cues.some((cue) => cue.content.text?.includes("no longer here")),
    ).toBe(true);
  });
});

describe("controller control descriptors", () => {
  it("exposes talk and choice modes, verbs, and action feedback without text", () => {
    const { runtime } = makeRuntime();
    walkTo(runtime, "agent-neuron");
    runtime.interact();

    const talk = runtime.controlDescriptor("p1");
    expect(talk.mode).toBe("talk");
    expect(talk.verbs).toEqual(
      expect.arrayContaining(["jump", "interact", "scan", "pulse"]),
    );
    expect(talk.verbs).not.toContain("carry");
    expect(talk).not.toHaveProperty("text");

    const conversation = [...runtime.conversations.values()][0]!;
    runtime.surfaceAction(conversation.surfaceId, { type: "confirm" });
    runtime.surfaceAction(conversation.surfaceId, { type: "confirm" });
    runtime.surfaceAction(conversation.surfaceId, { type: "confirm" });

    const choice = runtime.controlDescriptor("p1");
    expect(choice.mode).toBe("choice");
    expect(choice.choices).toBe(2);
    expect(choice.selected).toBe(1);
    expect(choice.activeVerb).toBe("interact");

    expect(JSON.stringify(runtime.controlDescriptor("p1"))).not.toContain(
      "Neuron Keeper",
    );
  });
});

describe("controller action feedback", () => {
  it("records a rejected interact with a closed reason code", () => {
    const { runtime } = makeRuntime();
    runtime.placePlayer("p1", 8, 8);
    runtime.interact();
    expect(runtime.drainControlActions()).toEqual(
      expect.arrayContaining([
        {
          slot: "p1",
          feedback: {
            verb: "interact",
            result: "rejected",
            reason: "out-of-range",
          },
        },
      ]),
    );
  });
});
