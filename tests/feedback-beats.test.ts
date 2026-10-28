import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  PuzzleRuntime,
  replaySolution,
  type PuzzleDocument,
  type PuzzleNodeRunState,
  type PuzzleRunState,
} from "../src/puzzle";
import {
  deriveBeats,
  deriveBeatsFromWinGraph,
  type BeatSpec,
} from "../src/feedback";

const LEVEL_DIR = new URL(
  "../public/packs/anatomy-reflex/levels/",
  import.meta.url,
);

function readPuzzle(levelId: string): PuzzleDocument {
  return JSON.parse(
    readFileSync(new URL(`${levelId}/puzzle.json`, LEVEL_DIR), "utf8"),
  ) as PuzzleDocument;
}

function initialState(document: PuzzleDocument): PuzzleRunState {
  return new PuzzleRuntime(document).snapshot();
}

function setNode(
  state: PuzzleRunState,
  nodeId: string,
  patch: Partial<PuzzleNodeRunState>,
): void {
  const current = state.nodes[nodeId];
  if (!current) throw new Error(`missing node state: ${nodeId}`);
  state.nodes[nodeId] = { ...current, ...patch };
}

describe("feedback beats", () => {
  it("derives fallback beats from the 03 win graph in document order", () => {
    const document = readPuzzle("03-nerve-forest");
    const beats = deriveBeatsFromWinGraph(document);
    const state = initialState(document);
    const derived = deriveBeats({ document, state });

    expect(beats.map((beat) => beat.id)).toEqual([
      "beat:input-a",
      "beat:input-a-trigger",
      "beat:input-b",
      "beat:input-b-trigger",
      "beat:stimulus-counter",
      "beat:terminal-zone",
      "beat:spike-relay",
      "beat:gate-exit",
    ]);
    expect(derived[0]?.state).toBe("active");
    expect(derived.slice(1).every((beat) => beat.state === "pending")).toBe(
      true,
    );
  });

  it("derives fallback beats from the 04 win graph in document order", () => {
    const document = readPuzzle("04-muscle-effector");
    const derived = deriveBeats({
      document,
      state: initialState(document),
      labels: { "ca-timer": "Calcium window" },
    });

    expect(derived.map((beat) => beat.id)).toEqual([
      "beat:terminal-plate",
      "beat:ca-timer",
      "beat:ca-gate",
      "beat:nicotinic-receptor",
      "beat:pulse-terminal",
      "beat:ache-timer",
      "beat:response-relay",
      "beat:muscle-gate",
    ]);
    expect(derived[1]?.label).toBe("Calcium window");
    expect(derived[0]?.state).toBe("active");
  });

  it("marks every authored beat done when the puzzle is solved", () => {
    const document = readPuzzle("04-muscle-effector");
    const solved = replaySolution(document);
    expect(solved.ok).toBe(true);

    const beats: readonly BeatSpec[] = [
      { id: "trigger", label: "Trigger", nodes: ["terminal-plate"] },
      { id: "window", label: "Open window", nodes: ["ca-timer", "ca-gate"] },
      {
        id: "bind",
        label: "Bind receptor",
        nodes: ["nicotinic-receptor"],
      },
      { id: "respond", label: "Respond", nodes: ["muscle-gate"] },
    ];
    const derived = deriveBeats({
      document,
      state: solved.state,
      beats,
    });

    expect(derived.map((beat) => beat.state)).toEqual([
      "done",
      "done",
      "done",
      "done",
    ]);
  });

  it("advances authored beats from pending to active to done", () => {
    const document = readPuzzle("04-muscle-effector");
    const state = initialState(document);
    const beats: readonly BeatSpec[] = [
      { id: "trigger", label: "Trigger", nodes: ["terminal-plate"] },
      { id: "window", label: "Open window", nodes: ["ca-timer", "ca-gate"] },
      {
        id: "bind",
        label: "Bind receptor",
        nodes: ["nicotinic-receptor"],
      },
      { id: "respond", label: "Respond", nodes: ["muscle-gate"] },
    ];

    expect(deriveBeats({ document, state, beats }).map((beat) => beat.state)).toEqual([
      "active",
      "pending",
      "pending",
      "pending",
    ]);

    setNode(state, "terminal-plate", { state: "pressed", active: true });
    setNode(state, "ca-timer", { state: "running", remaining: 10 });
    setNode(state, "ca-gate", { state: "open", active: true });
    expect(deriveBeats({ document, state, beats }).map((beat) => beat.state)).toEqual([
      "done",
      "active",
      "pending",
      "pending",
    ]);

    setNode(state, "ca-timer", { state: "elapsed", remaining: 0 });
    setNode(state, "nicotinic-receptor", { state: "bound", active: true });
    expect(deriveBeats({ document, state, beats }).map((beat) => beat.state)).toEqual([
      "done",
      "done",
      "done",
      "active",
    ]);

    setNode(state, "muscle-gate", { state: "open", active: true });
    expect(deriveBeats({ document, state, beats }).map((beat) => beat.state)).toEqual([
      "done",
      "done",
      "done",
      "done",
    ]);
  });

  it("is deterministic across repeated derivations", () => {
    const document = readPuzzle("03-nerve-forest");
    const state = initialState(document);
    expect(deriveBeats({ document, state })).toEqual(
      deriveBeats({ document, state }),
    );
  });
});
