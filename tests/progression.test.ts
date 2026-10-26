import { describe, expect, it } from "vitest";
import type { GateDocument, LevelDocument } from "../src/pack";
import {
  createProgression,
  evaluateGate,
  gateIsOpen,
  hasAbility,
  mapEdges,
  mapNodes,
  reachableLevels,
  revealNode,
  setFlag,
  solveGate,
  unlockAbility,
} from "../src/progression";

function gate(overrides: Partial<GateDocument> = {}): GateDocument {
  return {
    schemaVersion: "1.0",
    id: "gate-test",
    type: "concept",
    objectiveId: "OBJ-2",
    conceptIds: ["CON-3"],
    prompt: "Test gate",
    hints: [],
    onSolve: [],
    onFail: [],
    ...overrides,
  };
}

function level(
  id: string,
  order: number,
  nextLevelIds: string[] = [],
): LevelDocument {
  return {
    schemaVersion: "1.0",
    id,
    title: id,
    order,
    status: "draft",
    syllabusObjectiveIds: ["OBJ-2"],
    conceptIds: ["CON-3"],
    roomId: `room-${id}`,
    dialogueIds: [],
    gateIds: [],
    map: {
      nodeId: `map-${id}`,
      label: id,
      x: order,
      y: 0,
      edges: nextLevelIds.map((to) => ({ to: `map-${to}`, type: "door" })),
    },
    evidence: [],
    unlocks: [],
    nextLevelIds,
    coop: { supported: true },
  };
}

describe("progression", () => {
  it("unlocks abilities, flags, nodes, and gates idempotently", () => {
    const state = createProgression();
    expect(hasAbility(state, "scan")).toBe(false);
    expect(unlockAbility(state, "scan")).toBe(true);
    expect(unlockAbility(state, "scan")).toBe(false);
    expect(hasAbility(state, "scan")).toBe(true);

    setFlag(state, "met-neuron", true);
    expect(state.flags["met-neuron"]).toBe(true);

    expect(revealNode(state, "map-nerve-forest")).toBe(true);
    expect(revealNode(state, "map-nerve-forest")).toBe(false);
    expect(state.revealedNodes).toEqual(["map-nerve-forest"]);

    expect(solveGate(state, "gate-nerve-01")).toBe(true);
    expect(solveGate(state, "gate-nerve-01")).toBe(false);
  });

  it("evaluates singleChoice, sequence, and match puzzles", () => {
    expect(
      evaluateGate(
        gate({
          puzzle: {
            type: "singleChoice",
            options: [
              { id: "a", text: "Wrong" },
              { id: "b", text: "Right" },
            ],
            answerId: "b",
          },
        }),
        "b",
      ).correct,
    ).toBe(true);
    expect(
      evaluateGate(
        gate({
          puzzle: { type: "sequence", items: ["a", "b"], answer: ["b", "a"] },
        }),
        ["a", "b"],
      ).correct,
    ).toBe(false);
    expect(
      evaluateGate(
        gate({
          puzzle: { type: "sequence", items: ["a", "b"], answer: ["b", "a"] },
        }),
        ["b", "a"],
      ).correct,
    ).toBe(true);
    expect(
      evaluateGate(
        gate({
          puzzle: {
            type: "match",
            left: ["a"],
            right: ["x"],
            answer: { a: "x" },
          },
        }),
        { a: "x" },
      ).correct,
    ).toBe(true);
  });

  it("opens ability, flag, and solved concept gates", () => {
    const state = createProgression();
    expect(gateIsOpen(gate({ id: "gate-ability", type: "ability" }), state)).toBe(
      false,
    );
    unlockAbility(state, "gate-ability");
    expect(gateIsOpen(gate({ id: "gate-ability", type: "ability" }), state)).toBe(
      true,
    );

    expect(gateIsOpen(gate({ id: "gate-flag", type: "flag" }), state)).toBe(false);
    setFlag(state, "gate-flag", true);
    expect(gateIsOpen(gate({ id: "gate-flag", type: "flag" }), state)).toBe(true);

    expect(gateIsOpen(gate({ id: "gate-concept" }), state)).toBe(false);
    solveGate(state, "gate-concept");
    expect(gateIsOpen(gate({ id: "gate-concept" }), state)).toBe(true);
  });

  it("walks the level graph and exposes map nodes/edges", () => {
    const levels = [level("03-nerve-forest", 3, ["04-muscle-effector"]), level("04-muscle-effector", 4, ["05-reflex-core"]), level("05-reflex-core", 5)];
    expect(reachableLevels(levels, "03-nerve-forest")).toEqual([
      "03-nerve-forest",
      "04-muscle-effector",
      "05-reflex-core",
    ]);
    expect(
      mapNodes(levels).map((node) => node.id),
    ).toEqual(["map-03-nerve-forest", "map-04-muscle-effector", "map-05-reflex-core"]);
    expect(mapEdges(levels)[0]).toMatchObject({
      from: "map-03-nerve-forest",
      to: "map-04-muscle-effector",
      type: "door",
    });
  });
});
