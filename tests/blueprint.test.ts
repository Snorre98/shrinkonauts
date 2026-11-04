import { describe, expect, it } from "vitest";
import { buildBlueprint } from "../src/game/blueprint";
import type { FeedbackBeat, FeedbackBeatState } from "../src/feedback";
import type { LevelBlueprint, LevelDocument } from "../src/pack";
import { PuzzleRuntime, type PuzzleDocument } from "../src/puzzle";
import { loadContent, packDirectory } from "../scripts/content-loader";

const content = loadContent(packDirectory("anatomy-reflex"));

function level(id: string): LevelDocument {
  const found = content.levels.find((entry) => entry.id === id);
  if (!found) throw new Error(`missing level ${id}`);
  return found;
}

function puzzle(id: string): PuzzleDocument {
  const found = content.puzzles[id];
  if (!found) throw new Error(`missing puzzle ${id}`);
  return found;
}

const AUTHORED_03: LevelBlueprint = {
  title: "Signal route",
  components: [
    {
      id: "threshold",
      symbol: "ui.blueprint.symbol.threshold",
      label: "Threshold",
      beatIds: ["threshold"],
      x: 1,
    },
    {
      id: "inputs",
      symbol: "ui.blueprint.symbol.inputs",
      label: "Two inputs",
      beatIds: ["input"],
      x: 0,
    },
    {
      id: "exit",
      symbol: "ui.blueprint.symbol.gate",
      label: "Terminal / exit",
      beatIds: ["terminal", "exit"],
      x: 3,
    },
    {
      id: "axon",
      symbol: "ui.blueprint.symbol.flow",
      label: "One-way flow",
      beatIds: ["axon"],
      x: 2,
    },
  ],
  edges: [
    { from: "inputs", to: "threshold", type: "flow" },
    { from: "threshold", to: "axon", type: "oneWay" },
    { from: "axon", to: "exit", type: "oneWay" },
  ],
  steps: [
    { componentId: "inputs", actor: "both" },
    { componentId: "threshold", actor: "both" },
    { componentId: "axon", actor: "p1" },
    { componentId: "exit", actor: "shared" },
  ],
};

function withAuthoredBlueprint(
  source: LevelDocument,
  puzzleId: string,
  blueprint: LevelBlueprint,
  options: { dropBeats?: boolean } = {},
): LevelDocument {
  const copy = structuredClone(source);
  const existing = copy.feedback?.puzzles?.[puzzleId] ?? {};
  copy.feedback = {
    ...copy.feedback,
    puzzles: {
      ...copy.feedback?.puzzles,
      [puzzleId]: {
        ...existing,
        ...(options.dropBeats ? { beats: undefined } : {}),
        blueprint,
      },
    },
  };
  return copy;
}

function beats(
  entries: ReadonlyArray<[string, FeedbackBeatState]>,
): FeedbackBeat[] {
  return entries.map(([id, state]) => ({
    id,
    label: id,
    state,
    nodes: [],
  }));
}

describe("blueprint builder", () => {
  it("normalises authored components in x order and keeps authored edges", () => {
    const nodeRun = puzzle("puzzle-node-run");
    const authoredLevel = withAuthoredBlueprint(
      level("03-nerve-forest"),
      nodeRun.id,
      AUTHORED_03,
    );

    const blueprint = buildBlueprint({
      level: authoredLevel,
      puzzle: nodeRun,
      state: new PuzzleRuntime(nodeRun).snapshot(),
      beats: [],
    });

    expect(blueprint?.puzzleId).toBe("puzzle-node-run");
    expect(blueprint?.title).toBe("Signal route");
    expect(blueprint?.components.map((component) => component.id)).toEqual([
      "inputs",
      "threshold",
      "axon",
      "exit",
    ]);
    expect(blueprint?.components.map((component) => component.label)).toEqual([
      "Two inputs",
      "Threshold",
      "One-way flow",
      "Terminal / exit",
    ]);
    expect(blueprint?.components.map((component) => component.symbol)).toEqual([
      "ui.blueprint.symbol.inputs",
      "ui.blueprint.symbol.threshold",
      "ui.blueprint.symbol.flow",
      "ui.blueprint.symbol.gate",
    ]);
    expect(
      blueprint?.components.map((component) => component.state),
    ).toEqual(["active", "pending", "pending", "pending"]);
    expect(blueprint?.components.map((component) => component.actor)).toEqual([
      "both",
      "both",
      "p1",
      "shared",
    ]);
    expect(blueprint?.edges).toEqual([
      {
        id: "inputs->threshold",
        from: "inputs",
        to: "threshold",
        type: "flow",
        state: "pending",
      },
      {
        id: "threshold->axon",
        from: "threshold",
        to: "axon",
        type: "oneWay",
        state: "pending",
      },
      {
        id: "axon->exit",
        from: "axon",
        to: "exit",
        type: "oneWay",
        state: "pending",
      },
    ]);
  });

  it("advances component and edge states from feedback beats", () => {
    const nodeRun = puzzle("puzzle-node-run");
    const authoredLevel = withAuthoredBlueprint(
      level("03-nerve-forest"),
      nodeRun.id,
      AUTHORED_03,
    );
    const state = new PuzzleRuntime(nodeRun).snapshot();

    const inputActive = buildBlueprint({
      level: authoredLevel,
      puzzle: nodeRun,
      state,
      beats: beats([
        ["input", "active"],
        ["threshold", "pending"],
        ["axon", "pending"],
        ["terminal", "pending"],
        ["exit", "pending"],
      ]),
    });
    expect(
      inputActive?.components.map((component) => component.state),
    ).toEqual(["active", "pending", "pending", "pending"]);

    const thresholdActive = buildBlueprint({
      level: authoredLevel,
      puzzle: nodeRun,
      state,
      beats: beats([
        ["input", "done"],
        ["threshold", "active"],
        ["axon", "pending"],
        ["terminal", "pending"],
        ["exit", "pending"],
      ]),
    });
    expect(
      thresholdActive?.components.map((component) => component.state),
    ).toEqual(["done", "active", "pending", "pending"]);
    expect(thresholdActive?.edges.map((edge) => edge.state)).toEqual([
      "active",
      "pending",
      "pending",
    ]);

    const exitActive = buildBlueprint({
      level: authoredLevel,
      puzzle: nodeRun,
      state,
      beats: beats([
        ["input", "done"],
        ["threshold", "done"],
        ["axon", "done"],
        ["terminal", "done"],
        ["exit", "active"],
      ]),
    });
    expect(
      exitActive?.components.map((component) => component.state),
    ).toEqual(["done", "done", "done", "active"]);
    expect(exitActive?.edges.map((edge) => edge.state)).toEqual([
      "done",
      "done",
      "active",
    ]);

    const solved = buildBlueprint({
      level: authoredLevel,
      puzzle: nodeRun,
      state: { ...state, solved: true },
      beats: beats([
        ["input", "done"],
        ["threshold", "done"],
        ["axon", "done"],
        ["terminal", "done"],
        ["exit", "active"],
      ]),
    });
    expect(
      solved?.components.map((component) => component.state),
    ).toEqual(["done", "done", "done", "done"]);
    expect(solved?.edges.map((edge) => edge.state)).toEqual([
      "done",
      "done",
      "done",
    ]);
  });

  it("derives four adjacent fallback components from the 03 authored beats", () => {
    const nodeRun = puzzle("puzzle-node-run");
    const blueprint = buildBlueprint({
      level: level("03-nerve-forest"),
      puzzle: nodeRun,
      state: new PuzzleRuntime(nodeRun).snapshot(),
      beats: [],
    });

    expect(blueprint?.title).toBe("Node Run");
    expect(blueprint?.components.map((component) => component.id)).toEqual([
      "component-1",
      "component-2",
      "component-3",
      "component-4",
    ]);
    expect(blueprint?.components.map((component) => component.beatIds)).toEqual([
      ["input", "threshold"],
      ["axon"],
      ["terminal"],
      ["exit"],
    ]);
    expect(blueprint?.components.map((component) => component.symbol)).toEqual([
      "ui.blueprint.symbol.threshold",
      "ui.blueprint.symbol.flow",
      "ui.blueprint.symbol.flow",
      "ui.blueprint.symbol.gate",
    ]);
    expect(blueprint?.components[0]?.label).toBe(
      "Press a dendrite input + Reach threshold",
    );
    expect(blueprint?.components.map((component) => component.state)).toEqual([
      "active",
      "pending",
      "pending",
      "pending",
    ]);
    expect(blueprint?.edges.map((edge) => edge.type)).toEqual([
      "flow",
      "flow",
      "flow",
    ]);
  });

  it("groups more than four fallback beats into four components", () => {
    const nodeRun = puzzle("puzzle-node-run");
    const bareLevel = {
      ...structuredClone(level("03-nerve-forest")),
      feedback: undefined,
    };

    const blueprint = buildBlueprint({
      level: bareLevel,
      puzzle: nodeRun,
      state: new PuzzleRuntime(nodeRun).snapshot(),
      beats: [],
    });

    expect(blueprint?.components).toHaveLength(4);
    expect(blueprint?.components.map((component) => component.beatIds.length)).toEqual([
      2, 2, 2, 2,
    ]);
    expect(blueprint?.edges).toHaveLength(3);
  });

  it("derives fallback actors from solution targets and normalises solo", () => {
    const ferry = puzzle("puzzle-endplate-ferry");
    const ferryLevel = level("04-muscle-effector");
    const state = new PuzzleRuntime(ferry).snapshot();

    const coop = buildBlueprint({
      level: ferryLevel,
      puzzle: ferry,
      state,
      beats: [],
    });
    expect(coop?.components.map((component) => component.actor)).toEqual([
      null,
      "p2",
      "p2",
      "p2",
    ]);

    const solo = buildBlueprint({
      level: ferryLevel,
      puzzle: ferry,
      state,
      beats: [],
      mode: "solo",
    });
    expect(solo?.components.map((component) => component.actor)).toEqual([
      null,
      "p1",
      "p1",
      "p1",
    ]);
  });

  it("normalises authored both actors to P1 in solo mode", () => {
    const nodeRun = puzzle("puzzle-node-run");
    const authoredLevel = withAuthoredBlueprint(
      level("03-nerve-forest"),
      nodeRun.id,
      AUTHORED_03,
    );
    const blueprint = buildBlueprint({
      level: authoredLevel,
      puzzle: nodeRun,
      state: new PuzzleRuntime(nodeRun).snapshot(),
      beats: [],
      mode: "solo",
    });

    expect(blueprint?.components.map((component) => component.actor)).toEqual([
      "p1",
      "p1",
      "p1",
      "shared",
    ]);
  });

  it("keeps a component with an unknown beat reference pending", () => {
    const nodeRun = puzzle("puzzle-node-run");
    const authoredLevel = withAuthoredBlueprint(
      level("03-nerve-forest"),
      nodeRun.id,
      {
        components: [
          {
            id: "known",
            symbol: "ui.blueprint.symbol.inputs",
            beatIds: ["input"],
            x: 0,
          },
          {
            id: "unknown",
            symbol: "ui.blueprint.symbol.gate",
            beatIds: ["missing-beat"],
            x: 1,
          },
        ],
      },
    );

    const blueprint = buildBlueprint({
      level: authoredLevel,
      puzzle: nodeRun,
      state: new PuzzleRuntime(nodeRun).snapshot(),
      beats: beats([
        ["input", "done"],
        ["threshold", "done"],
      ]),
    });

    expect(
      blueprint?.components.map((component) => component.state),
    ).toEqual(["done", "active"]);
  });
});
