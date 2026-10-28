import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { findUnrecoverableStates } from "./helpers/recoverability";
import type { PuzzleDocument } from "../src/puzzle";

function load(url: URL): PuzzleDocument {
  return JSON.parse(readFileSync(url, "utf8")) as PuzzleDocument;
}

const CASES: Array<[string, URL]> = [
  [
    "Endplate Ferry",
    new URL(
      "../public/packs/anatomy-reflex/levels/04-muscle-effector/puzzle.json",
      import.meta.url,
    ),
  ],
  [
    "Node Run",
    new URL(
      "../public/packs/anatomy-reflex/levels/03-nerve-forest/puzzle.json",
      import.meta.url,
    ),
  ],
  [
    "Signal Ferry fixture",
    new URL("./fixtures/puzzles/signal-ferry.json", import.meta.url),
  ],
  [
    "Relay Gate fixture",
    new URL("./fixtures/puzzles/relay-gate.json", import.meta.url),
  ],
];

/**
 * Negative control: a non-latched gate that can never open because it has no
 * open link and no transition out of the closed state. The reachability graph
 * must report the dead state rather than treating an empty result as a pass.
 */
const UNRECOVERABLE: PuzzleDocument = {
  schemaVersion: "1.0",
  id: "fixture-unrecoverable-gate",
  title: "Unrecoverable Gate Fixture",
  objectiveIds: [],
  conceptIds: [],
  activation: { mode: "roomStart" },
  tether: "off",
  nodes: [
    {
      id: "plate",
      type: "plate",
      rect: { x: 0, y: 0, width: 32, height: 32 },
      detects: ["player"],
      minimum: 1,
      countCarried: false,
    },
    { id: "close-timer", type: "timer", durationTicks: 3, repeat: false },
    {
      id: "gate",
      type: "gate",
      entityId: "gate",
      initial: "closed",
      latched: false,
    },
  ],
  links: [
    { from: "plate", to: "close-timer", type: "start" },
    { from: "close-timer", to: "gate", type: "close" },
  ],
  win: { type: "gateOpen", gateId: "gate" },
  reset: {
    props: [],
    nodes: ["plate", "close-timer", "gate"],
  },
  evidence: { onSolve: [], counters: [] },
  rewards: {},
  solution: [],
  hints: [],
};

describe("puzzle recoverability", () => {
  for (const [name, url] of CASES) {
    it(
      `${name}: every reachable stable state can reach solved`,
      () => {
        const result = findUnrecoverableStates(load(url), { maxStates: 10_000 });

        // A cap hit means the graph is incomplete, so the result is
        // inconclusive rather than a pass.
        expect(result.capped, "state/settle budget exhausted").toBe(false);
        // Guard against a vacuous search that never finds a win.
        expect(result.solvedStates, "no reachable solved state").toBeGreaterThan(
          0,
        );
        expect(
          result.dead,
          `${result.dead.length} unrecoverable state(s) out of ${
            result.states
          } reachable stable states:\n${result.dead.slice(0, 3).join("\n")}`,
        ).toEqual([]);
      },
      30_000,
    );
  }

  it("detects a permanently closed gate", () => {
    const result = findUnrecoverableStates(UNRECOVERABLE, { maxStates: 100 });

    expect(result.capped).toBe(false);
    expect(result.solvedStates).toBe(0);
    expect(result.dead.length).toBeGreaterThan(0);
  });
});
