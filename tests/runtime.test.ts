import { describe, expect, it } from "vitest";
import { GameRuntime, type AudioPort, type RuntimeInput } from "../src/game/runtime";
import { createSave, MemorySaveStorage, RUN_STORAGE_KEY } from "../src/save";
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

function walkTo(runtime: GameRuntime, entityId: string): void {
  const point = runtime.entityPixel(entityId);
  if (!point) throw new Error(`missing entity ${entityId}`);
  runtime.placePlayer("p1", point.x, point.y);
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

  it("runs dialogue, scan, gate, exit, debrief, and evidence export", () => {
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

    walkTo(runtime, "gate-nerve");
    runtime.interact();
    expect(runtime.state).toBe("gate");
    const gate = runtime.snapshot().gate;
    expect(gate?.puzzle?.type).toBe("sequence");
    if (gate?.puzzle?.type !== "sequence") throw new Error("wrong puzzle");

    const wrong = runtime.submitGateAnswer([...gate.puzzle.answer].reverse());
    expect(wrong.correct).toBe(false);
    expect(runtime.snapshot().gate?.feedback?.correct).toBe(false);

    const right = runtime.submitGateAnswer(gate.puzzle.answer);
    expect(right.correct).toBe(true);
    expect(runtime.snapshot().abilities).toContain("signal-dash");
    expect(runtime.snapshot().gate?.solved).toBe(true);
    expect(
      runtime.snapshot().map.nodes.find((node) => node.id === "map-muscle-effector")
        ?.visited,
    ).toBe(true);

    runtime.closeGate();
    runtime.placePlayer("p1", 37.5 * 32, 20 * 32);
    runtime.placePlayer("p2", 36.5 * 32, 20 * 32);
    runtime.step(1 / 60, input());
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
    expect(exported.objectives.find((item) => item.id === "OBJ-2")).toMatchObject({
      requiredMet: true,
      evidenceIds: ["EV-2"],
    });
    expect(
      exported.events.some(
        (event) =>
          event.type === "gate_solved" && event.gateId === "gate-nerve-01",
      ),
    ).toBe(true);
    expect(
      exported.events.some((event) => event.type === "debrief_completed"),
    ).toBe(true);
  });

  it("restores progression and positions from the autosave", () => {
    const { runtime, storage } = makeRuntime();

    walkTo(runtime, "gate-nerve");
    runtime.interact();
    const gate = runtime.snapshot().gate;
    if (gate?.puzzle?.type !== "sequence") throw new Error("wrong puzzle");
    runtime.submitGateAnswer(gate.puzzle.answer);
    runtime.closeGate();
    runtime.placePlayer("p1", 700, 640);
    runtime.step(1 / 60, input());
    runtime.placePlayer("p1", 4.5 * 32, 20 * 32);
    runtime.step(1 / 60, input());

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
    expect(snapshot.map.nodes.find((node) => node.id === "map-muscle-effector")?.visited).toBe(
      true,
    );
    expect(restored.snapshot().toast).toBe("Resumed from checkpoint");
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

  it("dashes only after the gate unlocks signal-dash", () => {
    const { runtime } = makeRuntime();
    const startX = runtime.simulation.players.p1.x;

    runtime.step(1 / 60, {
      ...input(),
      intents: { ...input().intents, p1: { moveX: 0, jump: false, dash: true } },
    });
    expect(runtime.simulation.players.p1.x).toBe(startX);

    walkTo(runtime, "gate-nerve");
    runtime.interact();
    const gate = runtime.snapshot().gate;
    if (gate?.puzzle?.type !== "sequence") throw new Error("wrong puzzle");
    runtime.submitGateAnswer(gate.puzzle.answer);
    runtime.closeGate();
    runtime.placePlayer("p2", 1080, 640);
    const before = runtime.simulation.players.p1.x;
    runtime.step(1 / 60, {
      ...input(),
      intents: { ...input().intents, p1: { moveX: 0, jump: false, dash: true } },
    });
    expect(runtime.simulation.players.p1.x).toBeGreaterThan(before);
  });
});
