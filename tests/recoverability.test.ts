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

describe("puzzle recoverability", () => {
  for (const [name, url] of CASES) {
    it(
      `${name}: sampled reachable states are all recoverable`,
      () => {
        const result = findUnrecoverableStates(load(url), { maxStates: 1000 });

        // A zero solved-run count means the random walk is not exercising the
        // affordances at all, which would make this guard vacuous.
        expect(result.solvedRuns, "no random walk reached the win").toBeGreaterThan(0);
        expect(
          result.dead.length,
          `${result.dead.length} unrecoverable state(s) out of ${
            result.sampled
          } sampled:\n${result.dead.slice(0, 3).join("\n")}`,
        ).toBe(0);
      },
      60_000,
    );
  }
});
