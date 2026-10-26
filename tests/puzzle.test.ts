import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  PuzzleRuntime,
  replaySolution,
  validatePuzzleDocument,
  type PuzzleDocument,
  type PuzzleWorldSnapshot,
} from "../src/puzzle";

const FIXTURES = new URL("./fixtures/puzzles/", import.meta.url);

function load(name: string): PuzzleDocument {
  return JSON.parse(
    readFileSync(new URL(`${name}.json`, FIXTURES), "utf8"),
  ) as PuzzleDocument;
}

function emptySnapshot(): PuzzleWorldSnapshot {
  return { tick: 1, players: [], props: [] };
}

describe("puzzle runtime", () => {
  it("replays the relay/plate fixture to its win predicate", () => {
    const document = load("relay-gate");
    const result = replaySolution(document);
    expect(result.error).toBeUndefined();
    expect(result.ok).toBe(true);
    expect(result.state.solved).toBe(true);
  });

  it("replays the ferry solution and opens the gate", () => {
    const document = load("signal-ferry");
    const result = replaySolution(document);
    expect(result.error).toBeUndefined();
    expect(result.ok).toBe(true);
    expect(result.state.solved).toBe(true);
    expect(
      result.events.some((event) => event.type === "receptorBound"),
    ).toBe(true);
  });

  it("rejects a pulse on a shape-mismatched receptor without consuming the prop", () => {
    const document = load("signal-ferry");
    const runtime = new PuzzleRuntime(document);
    runtime.usePulse("pulse-terminal", "p1");

    const events: string[] = [];
    for (let index = 0; index < 20; index += 1) {
      const result = runtime.tickResult({
        tick: index + 1,
        players: [],
        props: [
          {
            id: "tracer-prop",
            x: 1040,
            y: 596,
            width: 20,
            height: 20,
            active: true,
            state: "placed",
            tags: ["tracer"],
            shape: "triangle",
            carriedBy: null,
          },
        ],
      });
      events.push(...result.events.map((event) => event.type));
    }

    expect(events).toContain("receptorRejected");
    expect(runtime.isSolved()).toBe(false);
    expect(runtime.evidenceCounters().wrongReceptor).toBe(1);
    expect(runtime.nodeState("gate-ferry")?.state).toBe("closed");
  });

  it("preserves evidence counters across a reset and refuses to reset a solved puzzle", () => {
    const document = load("signal-ferry");
    const runtime = new PuzzleRuntime(document);
    runtime.note("resets", 2);
    expect(runtime.reset()).toBe(true);
    expect(runtime.evidenceCounters().resets).toBe(2);

    runtime.restore({
      puzzleId: document.id,
      tick: 2,
      solved: true,
      nodes: {},
      counters: { resets: 2 },
      pulses: [],
      lastError: null,
    });
    expect(runtime.reset()).toBe(false);
  });

  it("does not emit a win event twice", () => {
    const document = load("relay-gate");
    const result = replaySolution(document);
    expect(result.ok).toBe(true);
    const runtime = new PuzzleRuntime(document);
    runtime.restore(result.state);
    const tick = runtime.tickResult(emptySnapshot());
    expect(tick.solvedNow).toBe(false);
  });
});

describe("puzzle validation", () => {
  it("accepts both authored fixtures", () => {
    expect(validatePuzzleDocument(load("relay-gate")).ok).toBe(true);
    expect(validatePuzzleDocument(load("signal-ferry")).ok).toBe(true);
  });

  it("rejects an illegal link pair", () => {
    const document = load("signal-ferry");
    document.links.push({
      from: "gate-ferry",
      to: "receptor-a",
      type: "pulse",
    });
    const result = validatePuzzleDocument(document);
    expect(result.ok).toBe(false);
    expect(result.issues.some((issue) => issue.code.startsWith("PUZZLE_LINK"))).toBe(
      true,
    );
  });

  it("rejects a relay cycle", () => {
    const document = load("relay-gate");
    document.nodes.push(
      { id: "relay-a", type: "relay", mode: "anyOf" },
      { id: "relay-b", type: "relay", mode: "anyOf" },
    );
    document.links.push(
      { from: "relay-a", to: "relay-b", type: "activate" },
      { from: "relay-b", to: "relay-a", type: "activate" },
    );
    const result = validatePuzzleDocument(document);
    expect(result.ok).toBe(false);
    expect(result.issues.some((issue) => issue.code === "PUZZLE_RELAY_CYCLE")).toBe(
      true,
    );
  });

  it("rejects a win predicate that names the wrong node type", () => {
    const document = load("relay-gate");
    document.win = { type: "gateOpen", gateId: "plate-stand" };
    const result = validatePuzzleDocument(document);
    expect(result.ok).toBe(false);
    expect(result.issues.some((issue) => issue.code === "PUZZLE_WIN_GATE")).toBe(
      true,
    );
  });
});
