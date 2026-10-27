import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { parseRoom } from "../src/pack";
import {
  PuzzleRuntime,
  replaySolution,
  validatePuzzleDocument,
  type PlateNode,
  type PuzzleDocument,
  type PuzzleWorldSnapshot,
  type ZoneNode,
} from "../src/puzzle";

const LEVEL_DIR = new URL(
  "../public/packs/anatomy-reflex/levels/03-nerve-forest/",
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

function player(x: number, y: number, id = "p1"): PuzzleWorldSnapshot["players"][number] {
  return { id, x, y, width: 28, height: 44, active: true };
}

function snapshot(players: PuzzleWorldSnapshot["players"]): PuzzleWorldSnapshot {
  return { tick: 1, players, props: [] };
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
  actorId = "p1",
) {
  const point = rectCenter(nodeId);
  return runtime.tickResult(snapshot([player(point.x, point.y, actorId)]));
}

describe("Node Run puzzle document", () => {
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

  it("replays the authored solution trace to the gate win", () => {
    const result = replaySolution(puzzle);

    expect(result.error).toBeUndefined();
    expect(result.ok).toBe(true);
    expect(result.state.solved).toBe(true);
    expect(
      result.events.some((event) => event.type === "counterReached"),
    ).toBe(true);
    expect(result.events.some((event) => event.type === "gateOpen")).toBe(true);
  });

  it("keeps the exit closed below threshold", () => {
    const runtime = new PuzzleRuntime(puzzle);
    const result = tickAt(runtime, "input-a");

    expect(result.solvedNow).toBe(false);
    expect(runtime.nodeState("stimulus-counter")?.count).toBe(1);
    expect(runtime.nodeState("threshold-gate")?.state).toBe("closed");
    expect(runtime.nodeState("gate-exit")?.state).toBe("closed");
  });

  it("latches the threshold on the second input but waits for the terminal", () => {
    const runtime = new PuzzleRuntime(puzzle);
    tickAt(runtime, "input-a");
    const result = tickAt(runtime, "input-b");

    expect(result.solvedNow).toBe(false);
    expect(runtime.nodeState("stimulus-counter")?.count).toBe(2);
    expect(runtime.nodeState("stimulus-counter")?.active).toBe(true);
    expect(runtime.nodeState("threshold-gate")?.state).toBe("open");
    expect(
      result.events.some((event) => event.type === "counterReached"),
    ).toBe(true);
    expect(runtime.nodeState("gate-exit")?.state).toBe("closed");
  });

  it("does not emit a second threshold event for extra input", () => {
    const runtime = new PuzzleRuntime(puzzle);
    tickAt(runtime, "input-a");
    tickAt(runtime, "input-b");
    const extra = tickAt(runtime, "input-a");

    expect(runtime.nodeState("stimulus-counter")?.count).toBe(2);
    expect(runtime.nodeState("threshold-gate")?.state).toBe("open");
    expect(
      extra.events.filter((event) => event.type === "counterReached"),
    ).toHaveLength(0);
    expect(runtime.nodeState("gate-exit")?.state).toBe("closed");
    expect(runtime.isSolved()).toBe(false);
  });

  it("does not solve from the terminal alone", () => {
    const runtime = new PuzzleRuntime(puzzle);
    const terminal = tickAt(runtime, "terminal-zone");

    expect(terminal.solvedNow).toBe(false);
    expect(runtime.nodeState("terminal-zone")?.active).toBe(true);
    expect(runtime.nodeState("spike-relay")?.active).toBe(false);
    expect(runtime.nodeState("gate-exit")?.state).toBe("closed");

    tickAt(runtime, "input-a");
    tickAt(runtime, "input-b");
    tickAt(runtime, "terminal-zone");
    expect(runtime.isSolved()).toBe(true);
    expect(runtime.nodeState("gate-exit")?.state).toBe("open");
  });

  it("closes the one-way gate when the player enters the axon", () => {
    const runtime = new PuzzleRuntime(puzzle);
    tickAt(runtime, "axon-entry");

    expect(runtime.nodeState("axon-entry")?.active).toBe(true);
    expect(runtime.nodeState("behind-gate")?.state).toBe("closed");

    tickAt(runtime, "terminal-zone");
    expect(runtime.nodeState("behind-gate")?.state).toBe("closed");
  });

  it("resets the counter and gates without latching the exit", () => {
    const runtime = new PuzzleRuntime(puzzle);
    tickAt(runtime, "input-a");
    tickAt(runtime, "input-b");
    expect(runtime.nodeState("threshold-gate")?.state).toBe("open");
    expect(runtime.isSolved()).toBe(false);

    expect(runtime.reset()).toBe(true);
    expect(runtime.nodeState("stimulus-counter")?.count).toBe(0);
    expect(runtime.nodeState("threshold-gate")?.state).toBe("closed");
    expect(runtime.nodeState("behind-gate")?.state).toBe("open");
    expect(runtime.nodeState("gate-exit")?.state).toBe("closed");
  });
});
