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
      x: 6,
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

function pressSensor(runtime: GameRuntime, nodeId: string, actor: "p1" | "p2" = "p1"): void {
  const point = sensorCenter(nodeId);
  runtime.placePlayer(actor, point.x, 20 * 32);
  stepWith(runtime);
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
  runtime.placePlayer("p1", 37.5 * 32, 20 * 32);
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
  runtime.placePlayer("p1", 36.5 * 32, 20 * 32);
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
    expect(runtime.snapshot().puzzle?.id).toBe("puzzle-node-run");
    expect(runtime.simulation.tetherPolicy).toBe("off");
  });

  it("activates an interact puzzle from its authored entity", () => {
    const { runtime } = makeRuntimeWithContent(contentWithActivation("interact"));
    expect(runtime.snapshot().puzzle).toBeNull();

    const agent = runtime.entityPixel("agent-neuron");
    if (!agent) throw new Error("agent-neuron missing");
    runtime.placePlayer("p1", agent.x, 20 * 32);
    expect(runtime.snapshot().interaction).toMatchObject({
      kind: "puzzle",
      label: "Start Node Run",
    });

    stepWith(runtime, playerActions({ interact: true }));
    expect(runtime.snapshot().puzzle?.id).toBe("puzzle-node-run");
    expect(runtime.simulation.tetherPolicy).toBe("off");
  });

  it("shows authored hints without a pulse cooldown", () => {
    const { runtime } = makeRuntime();
    expect(runtime.snapshot().puzzle?.canHint).toBe(true);
    expect(runtime.snapshot().puzzle?.pulse).toBeNull();

    runtime.puzzleHint();
    expect(runtime.snapshot().puzzle?.hint).toBe(
      "One input is below threshold. The trigger gate needs a second dendrite input.",
    );
    stepWith(runtime);
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
    expect(runtime.snapshot().puzzle?.canHint).toBe(false);
    expect(
      runtime
        .exportEvidence()
        .events.filter((event) => event.type === "hint_used"),
    ).toHaveLength(3);
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
      expect.arrayContaining(["CON-3"]),
    );
    runtime.surfaceAction(neuronConversation!.surfaceId, { type: "confirm" });
    expect(runtime.conversations.size).toBe(0);

    walkTo(runtime, "scan-pathway");
    runtime.scan();
    expect(runtime.snapshot().knownConceptIds).toContain("CON-5");
    expect(audio.played.length).toBeGreaterThan(0);

    solveNodeRun(runtime);
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
    const inputA = sensorCenter("input-a");
    const inputB = sensorCenter("input-b");
    const terminal = sensorCenter("terminal-zone");

    runtime.placePlayer("p1", inputA.x, 20 * 32);
    runtime.placePlayer("p2", inputB.x, 20 * 32);
    stepWith(runtime);
    expect(runtime.snapshot().puzzle?.solved).toBe(false);

    runtime.placePlayer("p1", terminal.x, 20 * 32);
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
    const before = runtime.simulation.players.p1.x;
    runtime.step(1 / 60, {
      ...input(),
      intents: { ...input().intents, p1: { moveX: 0, jump: false, dash: true } },
    });
    expect(runtime.simulation.players.p1.x).toBeGreaterThan(before);
  });

  it("projects persistent feedback and beat progress at boot", () => {
    const { runtime } = makeRuntime();
    const snapshot = runtime.snapshot();
    expect(snapshot.feedback.seq).toBeGreaterThan(0);
    expect(snapshot.feedback.surfaces.map((surface) => surface.id)).toEqual(
      expect.arrayContaining(["fb:binary:input-a", "fb:counter:stimulus-counter"]),
    );
    expect(snapshot.feedback.beats.length).toBeGreaterThan(0);
    expect(snapshot.world.entities["agent-neuron"]?.anchors.center).toEqual({
      x: 18,
      y: 18,
    });
    expect(runtime.drainEffects()).toEqual([]);
  });

  it("projects authored room sockets into the runtime world view", () => {
    const { runtime } = makeRuntimeWithContent(contentWithAnchors());
    const entity = runtime.snapshot().world.entities["agent-neuron"];
    expect(entity?.anchors.center).toEqual({ x: 18, y: 18 });
    expect(entity?.anchors.muzzle).toEqual({
      x: 30,
      y: 8,
      direction: 0,
    });
  });

  it("attributes a P2 plate press to P2 and keeps it out of the toast", () => {
    const { runtime } = makeRuntime();
    pressSensor(runtime, "input-a", "p2");
    const snapshot = runtime.snapshot();
    const cue = snapshot.feedback.cues.find((item) =>
      item.cause.startsWith("puzzle:platePress:input-a"),
    );
    expect(cue).toMatchObject({
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
    const cue = runtime
      .snapshot()
      .feedback.cues.find((item) =>
        item.cause.startsWith("puzzle:receptorRejected:nicotinic-receptor"),
      );
    expect(cue).toMatchObject({
      actor: "p1",
      owner: "p1",
      anchor: { kind: "entity", entityId: "nicotinic-receptor" },
      presentation: "speechBubble",
      reason: "empty",
    });
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

  it("shows the stuck affordance after a stable run and dismisses it on hint", () => {
    const audio = new FakeAudio();
    const save = createSave({ storage: new MemorySaveStorage() });
    const runtime = new GameRuntime({
      content,
      save,
      audio,
      now: () => new Date("2026-10-26T12:00:00.000Z"),
      stuckThresholdTicks: 3,
    });
    runtime.start();
    for (let index = 0; index < 3; index += 1) stepWith(runtime);
    const surface = runtime
      .snapshot()
      .feedback.surfaces.find((item) => item.id.startsWith("fb:stuck:"));
    expect(surface).toBeDefined();
    expect(surface?.content.choices?.map((choice) => choice.id)).toEqual([
      "hint",
      "reset",
    ]);
    expect(runtime.snapshot().puzzle?.hint).toBeNull();
    expect(runtime.snapshot().puzzle?.counters.stuckWarnings).toBe(1);

    runtime.surfaceAction(surface!.id, {
      type: "choose",
      choiceId: "hint",
    });
    expect(runtime.snapshot().puzzle?.hint).not.toBeNull();
    expect(
      runtime
        .snapshot()
        .feedback.surfaces.some((item) => item.id.startsWith("fb:stuck:")),
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

    const raw = JSON.parse(storage.getItem(RUN_STORAGE_KEY) ?? "{}");
    raw.conversations = undefined;
    raw.dialogue = { dialogueId: "dlg-neuron-01", nodeId: "problem" };
    delete raw.conversations;
    storage.setItem(RUN_STORAGE_KEY, JSON.stringify(raw));

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
    const raw = JSON.parse(storage.getItem(RUN_STORAGE_KEY) ?? "{}");
    raw.conversations = [
      {
        surfaceId: "conversation:p1:missing",
        dialogueId: "dlg-neuron-01",
        nodeId: "intro",
        owner: "p1",
        entityId: "missing",
      },
    ];
    storage.setItem(RUN_STORAGE_KEY, JSON.stringify(raw));

    const restored = new GameRuntime({
      content,
      save: createSave({ storage }),
      audio: new FakeAudio(),
      now: () => new Date("2026-10-26T12:10:00.000Z"),
    });
    restored.start();
    expect(restored.conversations.size).toBe(0);
    expect(
      restored
        .snapshot()
        .feedback.cues.some((cue) => cue.content.text?.includes("no longer here")),
    ).toBe(true);
  });
});
