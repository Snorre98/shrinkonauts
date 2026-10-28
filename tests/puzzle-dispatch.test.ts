import { describe, expect, it } from "vitest";
import { EVENT_LINKS, PuzzleRuntime } from "../src/puzzle";
import type {
  PuzzleDocument,
  PuzzleEventType,
  PuzzleLinkType,
  PuzzleWorldSnapshot,
} from "../src/puzzle";

/**
 * The dispatch contract, written out independently of the runtime table.
 *
 * A link must only run for the event that matches its authored meaning. Link
 * types that are not event-driven (`pulse`, `activate`, `deactivate`, `open`,
 * `close`) are resolved by their dedicated evaluators and never dispatched.
 */
const EXPECTED: Record<PuzzleEventType, readonly PuzzleLinkType[]> = {
  pulse: [],
  pulseArrived: [],
  receptorBound: ["bind"],
  receptorRejected: [],
  platePress: ["press", "start"],
  plateRelease: ["release", "stop"],
  zoneEnter: ["enter", "start"],
  zoneExit: ["exit", "stop"],
  triggerFired: ["increment", "start"],
  timerElapsed: ["elapsed", "reset"],
  counterReached: ["reached"],
  gateOpen: [],
  gateClose: [],
  relayActive: [],
  relayInactive: [],
  solved: [],
};

const EVENT_TYPES = Object.keys(EXPECTED) as PuzzleEventType[];

describe("puzzle event dispatch", () => {
  it("decides dispatch for every event type", () => {
    expect(Object.keys(EVENT_LINKS).sort()).toEqual([...EVENT_TYPES].sort());
  });

  it("only runs the link types authored for each event", () => {
    for (const event of EVENT_TYPES) {
      expect(EVENT_LINKS[event], event).toEqual(EXPECTED[event]);
    }
  });

  it("never dispatches non-event-driven link types", () => {
    const dispatched = new Set<PuzzleLinkType>(
      Object.values(EVENT_LINKS).flat(),
    );
    for (const type of [
      "pulse",
      "activate",
      "deactivate",
      "open",
      "close",
    ] as const) {
      expect(dispatched.has(type), type).toBe(false);
    }
  });

  it("starts on press and stops on release", () => {
    const document: PuzzleDocument = {
      schemaVersion: "1.0",
      id: "fixture-dispatch",
      title: "Dispatch Fixture",
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
        { id: "timer", type: "timer", durationTicks: 10, repeat: false },
      ],
      links: [
        { from: "plate", to: "timer", type: "start" },
        { from: "plate", to: "timer", type: "stop" },
      ],
      win: { type: "timerElapsed", timerId: "timer" },
      reset: { props: [], nodes: ["plate", "timer"] },
      evidence: { onSolve: [], counters: [] },
      rewards: {},
      solution: [],
      hints: [],
    };
    const runtime = new PuzzleRuntime(document);

    const onPlate = (): PuzzleWorldSnapshot => ({
      tick: 1,
      players: [
        { id: "p1", x: 16, y: 16, width: 28, height: 44, active: true },
      ],
      props: [],
    });
    const away = (): PuzzleWorldSnapshot => ({
      tick: 1,
      players: [],
      props: [],
    });

    runtime.tickResult(onPlate());
    expect(runtime.nodeState("timer")?.state).toBe("running");

    runtime.tickResult(away());
    expect(runtime.nodeState("timer")?.state).toBe("stopped");
  });

  it("attributes sensor transitions only when one player causes them", () => {
    const document: PuzzleDocument = {
      schemaVersion: "1.0",
      id: "fixture-attribution",
      title: "Attribution Fixture",
      objectiveIds: [],
      conceptIds: [],
      activation: { mode: "roomStart" },
      tether: "off",
      nodes: [
        {
          id: "plate",
          type: "plate",
          rect: { x: 0, y: 0, width: 64, height: 64 },
          detects: ["player"],
          minimum: 1,
          countCarried: false,
        },
      ],
      links: [],
      win: { type: "platePressed", plateId: "plate" },
      reset: { props: [], nodes: ["plate"] },
      evidence: { onSolve: [], counters: [] },
      rewards: {},
      solution: [],
      hints: [],
    };
    const runtime = new PuzzleRuntime(document);
    const player = (id: string, x: number) => ({
      id,
      x,
      y: 20,
      width: 28,
      height: 44,
      active: true,
    });

    const p2Press = runtime.tickResult({
      tick: 1,
      players: [player("p2", 20)],
      props: [],
    });
    expect(
      p2Press.events.find((event) => event.type === "platePress")?.actorId,
    ).toBe("p2");

    const bothPress = runtime.tickResult({
      tick: 2,
      players: [player("p1", 12), player("p2", 28)],
      props: [],
    });
    expect(bothPress.events).toEqual([]);

    const release = runtime.tickResult({
      tick: 3,
      players: [player("p2", 200)],
      props: [],
    });
    expect(
      release.events.find((event) => event.type === "plateRelease")?.actorId,
    ).toBe("p2");
  });

  it("propagates one actor through timer and counter chains", () => {
    const document: PuzzleDocument = {
      schemaVersion: "1.0",
      id: "fixture-causal-attribution",
      title: "Causal Attribution Fixture",
      objectiveIds: [],
      conceptIds: [],
      activation: { mode: "roomStart" },
      tether: "off",
      nodes: [
        {
          id: "plate",
          type: "plate",
          rect: { x: 0, y: 0, width: 64, height: 64 },
          detects: ["player"],
          minimum: 1,
          countCarried: false,
        },
        { id: "trigger", type: "trigger", once: true },
        { id: "counter", type: "counter", target: 1, comparison: ">=" },
        { id: "timer", type: "timer", durationTicks: 3, repeat: false },
        {
          id: "gate",
          type: "gate",
          initial: "closed",
          latched: false,
        },
      ],
      links: [
        { from: "plate", to: "trigger", type: "press" },
        { from: "trigger", to: "counter", type: "increment" },
        { from: "counter", to: "timer", type: "reached" },
        { from: "timer", to: "gate", type: "open" },
      ],
      win: { type: "gateOpen", gateId: "gate" },
      reset: { props: [], nodes: ["plate", "trigger", "counter", "timer", "gate"] },
      evidence: { onSolve: [], counters: [] },
      rewards: {},
      solution: [],
      hints: [],
    };
    const runtime = new PuzzleRuntime(document);
    const onPlate: PuzzleWorldSnapshot = {
      tick: 1,
      players: [
        { id: "p2", x: 20, y: 20, width: 28, height: 44, active: true },
      ],
      props: [],
    };

    const press = runtime.tickResult(onPlate);
    expect(
      press.events.find((event) => event.type === "triggerFired")?.actorId,
    ).toBe("p2");
    expect(
      press.events.find((event) => event.type === "counterReached")?.actorId,
    ).toBe("p2");

    let elapsedEvents: ReturnType<PuzzleRuntime["tickResult"]>["events"] = [];
    for (let index = 0; index < 4; index += 1) {
      elapsedEvents = [
        ...elapsedEvents,
        ...runtime.tickResult({ ...onPlate, tick: index + 2 }).events,
      ];
    }
    expect(
      elapsedEvents.find((event) => event.type === "timerElapsed")?.actorId,
    ).toBe("p2");
    expect(
      elapsedEvents.find((event) => event.type === "gateOpen")?.actorId,
    ).toBe("p2");
  });
});
