import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { parseRoom } from "../src/pack";
import {
  PuzzleRuntime,
  replaySolution,
  validatePuzzleDocument,
  type PlateNode,
  type PuzzleDocument,
  type PuzzleNodeRunState,
  type PuzzlePropSnapshot,
  type PuzzleWorldSnapshot,
  type ZoneNode,
} from "../src/puzzle";

const LEVEL_DIR = new URL(
  "../public/packs/anatomy-reflex/levels/04-muscle-effector/",
  import.meta.url,
);

function readJson<T>(file: string): T {
  return JSON.parse(readFileSync(new URL(file, LEVEL_DIR), "utf8")) as T;
}

const puzzle = readJson<PuzzleDocument>("puzzle.json");
const room = (() => {
  const parsed = parseRoom(readJson<unknown>("room.json"));
  if (!parsed.ok) throw new Error(parsed.error);
  return parsed.value;
})();

const NICOTINIC = { x: 720, y: 620 };
const WRONG = { x: 848, y: 620 };

function player(
  x: number,
  y: number,
  id = "p1",
): PuzzleWorldSnapshot["players"][number] {
  return { id, x, y, width: 28, height: 44, active: true };
}

function prop(
  state: PuzzlePropSnapshot["state"],
  point = NICOTINIC,
  id = "ach-packet",
): PuzzlePropSnapshot {
  return {
    id,
    x: point.x,
    y: point.y,
    width: 20,
    height: 20,
    active: true,
    state,
    tags: ["ach"],
    shape: "triangle",
    carriedBy: null,
  };
}

function snapshot(
  players: PuzzleWorldSnapshot["players"] = [],
  props: PuzzleWorldSnapshot["props"] = [],
): PuzzleWorldSnapshot {
  return { tick: 1, players, props };
}

function rectCenter(nodeId: string): { x: number; y: number } {
  const node = puzzle.nodes.find(
    (entry): entry is PlateNode | ZoneNode =>
      entry.id === nodeId && (entry.type === "plate" || entry.type === "zone"),
  );
  if (!node) throw new Error(`missing sensor ${nodeId}`);
  return {
    x: node.rect.x + node.rect.width / 2,
    y: node.rect.y + node.rect.height / 2,
  };
}

function tickAt(
  runtime: PuzzleRuntime,
  nodeId: string,
  props: PuzzleWorldSnapshot["props"] = [],
) {
  const point = rectCenter(nodeId);
  return runtime.tickResult(snapshot([player(point.x, point.y)], props));
}

function tickProp(
  runtime: PuzzleRuntime,
  props: PuzzleWorldSnapshot["props"],
) {
  return runtime.tickResult(snapshot([], props));
}

function waitTicks(runtime: PuzzleRuntime, ticks: number, props: PuzzleWorldSnapshot["props"] = []) {
  let result = runtime.tickResult(snapshot([], props));
  for (let index = 1; index < ticks; index += 1) {
    result = runtime.tickResult(snapshot([], props));
  }
  return result;
}

function pulseAndSettle(runtime: PuzzleRuntime, props: PuzzleWorldSnapshot["props"]) {
  expect(runtime.usePulse("pulse-terminal", "p1")).toBe(true);
  return waitTicks(runtime, 8, props);
}

function nodeRunState(
  overrides: Partial<PuzzleNodeRunState> = {},
): PuzzleNodeRunState {
  return {
    state: "idle",
    active: false,
    count: 0,
    remaining: 0,
    fired: false,
    occupiedBy: null,
    ...overrides,
  };
}

describe("Endplate Ferry puzzle document", () => {
  it("validates, including the tether-off geometry guard", () => {
    const entityPoints = Object.fromEntries(
      (room.entities ?? []).map((entity) => [
        entity.id,
        {
          x: (entity.x + 0.5) * room.tileSize,
          y: entity.y * room.tileSize - room.tileSize / 2,
        },
      ]),
    );

    const result = validatePuzzleDocument(puzzle, {
      entityPoints,
      viewport: { width: 1280, height: 720 },
    });

    expect(result).toEqual({ ok: true, issues: [] });
  });

  it("replays the authored solution trace to the muscle gate", () => {
    const result = replaySolution(puzzle);

    expect(result.error).toBeUndefined();
    expect(result.ok).toBe(true);
    expect(result.state.solved).toBe(true);
    expect(
      result.events.some((event) => event.type === "timerElapsed"),
    ).toBe(true);
    expect(
      result.events.some((event) => event.type === "receptorBound"),
    ).toBe(true);
    expect(result.events.some((event) => event.type === "gateOpen")).toBe(true);
  });

  it("opens the Ca²⁺ gate only after the terminal plate window", () => {
    const runtime = new PuzzleRuntime(puzzle);

    const pressed = tickAt(runtime, "terminal-plate");
    expect(
      pressed.events.some(
        (event) => event.type === "platePress" && event.nodeId === "terminal-plate",
      ),
    ).toBe(true);
    expect(runtime.nodeState("ca-timer")?.state).toBe("running");
    expect(runtime.nodeState("ca-gate")?.state).toBe("closed");

    waitTicks(runtime, 40);
    expect(runtime.nodeState("ca-gate")?.state).toBe("closed");

    waitTicks(runtime, 40);
    expect(runtime.nodeState("ca-timer")?.state).toBe("elapsed");
    expect(runtime.nodeState("ca-gate")?.state).toBe("open");
    expect(runtime.nodeState("nicotinic-receptor")?.state).toBe("idle");
    expect(runtime.nodeState("muscle-gate")?.state).toBe("closed");
    expect(runtime.isSolved()).toBe(false);
  });

  it("does not open the muscle gate from receptor binding alone", () => {
    const runtime = new PuzzleRuntime(puzzle);
    const packet = prop("placed");
    tickProp(runtime, [packet]);

    pulseAndSettle(runtime, [packet]);
    expect(runtime.nodeState("nicotinic-receptor")?.state).toBe("bound");
    expect(runtime.nodeState("ca-gate")?.state).toBe("closed");
    expect(runtime.nodeState("response-relay")?.active).toBe(false);
    expect(runtime.nodeState("muscle-gate")?.state).toBe("closed");
    expect(runtime.isSolved()).toBe(false);

    tickAt(runtime, "terminal-plate", [packet]);
    waitTicks(runtime, 80, [packet]);
    expect(runtime.nodeState("ca-gate")?.state).toBe("open");
    expect(runtime.nodeState("response-relay")?.active).toBe(true);
    expect(runtime.nodeState("muscle-gate")?.state).toBe("open");
    expect(runtime.isSolved()).toBe(true);
  });

  it("rejects the packet on the wrong receptor and keeps it retrievable", () => {
    const runtime = new PuzzleRuntime(puzzle);
    let packet = prop("placed", WRONG);
    tickProp(runtime, [packet]);
    expect(runtime.nodeState("wrong-receptor")?.state).toBe("occupied");
    expect(runtime.nodeState("nicotinic-receptor")?.state).toBe("idle");

    pulseAndSettle(runtime, [packet]);
    expect(runtime.evidenceCounters().wrongReceptor).toBe(1);
    expect(runtime.nodeState("nicotinic-receptor")?.state).toBe("idle");
    expect(runtime.nodeState("ache-timer")?.state).toBe("idle");
    expect(runtime.nodeState("muscle-gate")?.state).toBe("closed");
    expect(runtime.isSolved()).toBe(false);
    expect(runtime.nodeState("ach-packet")?.state).toBe("placed");

    packet = prop("placed", NICOTINIC);
    tickProp(runtime, [packet]);
    expect(runtime.nodeState("wrong-receptor")?.state).toBe("idle");
    expect(runtime.nodeState("nicotinic-receptor")?.state).toBe("occupied");

    tickAt(runtime, "terminal-plate", [packet]);
    waitTicks(runtime, 80, [packet]);
    pulseAndSettle(runtime, [packet]);
    expect(runtime.nodeState("muscle-gate")?.state).toBe("open");
    expect(runtime.isSolved()).toBe(true);
  });

  it("does not count an empty-receptor pulse as a wrong receptor", () => {
    const runtime = new PuzzleRuntime(puzzle);

    pulseAndSettle(runtime, []);
    expect(runtime.evidenceCounters().wrongReceptor ?? 0).toBe(0);
    expect(runtime.nodeState("nicotinic-receptor")?.state).toBe("idle");
    expect(runtime.nodeState("ache-timer")?.state).toBe("idle");
    expect(runtime.isSolved()).toBe(false);
  });

  it("does not restart the Ca²⁺ timer when the plate is released", () => {
    const runtime = new PuzzleRuntime(puzzle);

    tickAt(runtime, "terminal-plate");
    waitTicks(runtime, 10);
    const remaining = runtime.nodeState("ca-timer")?.remaining ?? 0;
    expect(remaining).toBeLessThan(72);

    tickProp(runtime, []);
    expect(runtime.nodeState("terminal-plate")?.state).toBe("released");
    expect(runtime.nodeState("ca-timer")?.state).toBe("running");
    expect(runtime.nodeState("ca-timer")?.remaining).toBe(remaining - 1);
  });

  it("restarts the Ca²⁺ timer after the window has elapsed", () => {
    const runtime = new PuzzleRuntime(puzzle);

    tickAt(runtime, "terminal-plate");
    waitTicks(runtime, 80);
    expect(runtime.nodeState("ca-timer")?.state).toBe("elapsed");
    expect(runtime.nodeState("ca-gate")?.state).toBe("open");

    tickAt(runtime, "terminal-plate");
    expect(runtime.nodeState("ca-timer")?.state).toBe("running");
    expect(runtime.nodeState("ca-timer")?.remaining).toBe(72);
    // The gate is closed by the AChE close source, not by the timer being
    // re-armed, so it keeps its previous state until then.
  });

  it("reopens the Ca²⁺ gate after AChE has cleared an earlier response", () => {
    const runtime = new PuzzleRuntime(puzzle);
    const packet = prop("placed");

    tickProp(runtime, [packet]);
    pulseAndSettle(runtime, [packet]);
    expect(runtime.nodeState("nicotinic-receptor")?.state).toBe("bound");
    expect(runtime.nodeState("ca-gate")?.state).toBe("closed");

    waitTicks(runtime, 160, [packet]);
    expect(runtime.nodeState("ache-timer")?.state).toBe("elapsed");
    expect(runtime.nodeState("ca-timer")?.state).toBe("idle");
    expect(runtime.isSolved()).toBe(false);

    tickAt(runtime, "terminal-plate", [packet]);
    waitTicks(runtime, 80, [packet]);
    expect(runtime.nodeState("ca-timer")?.state).toBe("elapsed");
    expect(runtime.nodeState("ca-gate")?.state).toBe("open");
    expect(runtime.nodeState("muscle-gate")?.state).toBe("open");
    expect(runtime.isSolved()).toBe(true);
  });

  it("recovers from the reported dead state by re-arming the Ca²⁺ window", () => {
    const runtime = new PuzzleRuntime(puzzle);
    const packet = prop("docked");

    runtime.restore({
      puzzleId: puzzle.id,
      tick: 269,
      solved: false,
      counters: {},
      pulses: [],
      lastError: null,
      nodes: {
        "terminal-plate": nodeRunState({ state: "released" }),
        "ca-timer": nodeRunState({ state: "elapsed", active: true }),
        "ca-gate": nodeRunState({ state: "closed" }),
        "ach-packet": nodeRunState({ state: "docked", active: true }),
        "nicotinic-receptor": nodeRunState({
          state: "bound",
          active: true,
          occupiedBy: "ach-packet",
        }),
        "wrong-receptor": nodeRunState(),
        "pulse-terminal": nodeRunState(),
        "ache-timer": nodeRunState({ state: "elapsed", active: true }),
        "response-relay": nodeRunState({ state: "inactive" }),
        "muscle-gate": nodeRunState({ state: "closed" }),
      },
    });

    expect(runtime.isSolved()).toBe(false);

    tickAt(runtime, "terminal-plate", [packet]);
    expect(runtime.nodeState("ca-timer")?.state).toBe("running");

    waitTicks(runtime, 80, [packet]);
    expect(runtime.nodeState("ca-gate")?.state).toBe("open");
    expect(runtime.nodeState("muscle-gate")?.state).toBe("open");
    expect(runtime.isSolved()).toBe(true);
  });

  it("closes the Ca²⁺ gate after AChE elapses but keeps the muscle gate latched", () => {
    const runtime = new PuzzleRuntime(puzzle);
    const packet = prop("placed");
    tickAt(runtime, "terminal-plate", [packet]);
    waitTicks(runtime, 80, [packet]);
    tickProp(runtime, [packet]);
    pulseAndSettle(runtime, [packet]);
    expect(runtime.isSolved()).toBe(true);
    expect(runtime.nodeState("muscle-gate")?.state).toBe("open");

    waitTicks(runtime, 160, [packet]);
    expect(runtime.nodeState("ache-timer")?.state).toBe("elapsed");
    expect(runtime.nodeState("ca-gate")?.state).toBe("closed");
    expect(runtime.nodeState("muscle-gate")?.state).toBe("open");
    expect(runtime.isSolved()).toBe(true);
  });

  it("resets the packet, timers, receptors, and gates before the solve", () => {
    const runtime = new PuzzleRuntime(puzzle);
    const packet = prop("placed", WRONG);
    tickAt(runtime, "terminal-plate", [packet]);
    waitTicks(runtime, 80, [packet]);
    expect(runtime.nodeState("ca-gate")?.state).toBe("open");

    expect(runtime.reset()).toBe(true);
    expect(runtime.nodeState("ca-timer")?.state).toBe("idle");
    expect(runtime.nodeState("ca-gate")?.state).toBe("closed");
    expect(runtime.nodeState("wrong-receptor")?.state).toBe("idle");
    expect(runtime.nodeState("nicotinic-receptor")?.state).toBe("idle");
    expect(runtime.nodeState("muscle-gate")?.state).toBe("closed");
    expect(runtime.nodeState("ach-packet")?.state).toBe("free");
    expect(runtime.isSolved()).toBe(false);
  });
});
