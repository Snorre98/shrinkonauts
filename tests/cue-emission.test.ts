import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { parseRoom } from "../src/pack";
import {
  createRoomSimulation,
  emptyIntents,
  stepRoomSimulationWithCues,
  type GameplayCue,
  type RoomSimulation,
} from "../src/world/simulation";

const CONTENT_DIR = new URL("../public/content/dev/", import.meta.url);

function devRoom() {
  const parsed = parseRoom(
    JSON.parse(readFileSync(new URL("room.json", CONTENT_DIR), "utf8")),
  );
  if (!parsed.ok) {
    throw new Error(parsed.error);
  }
  return parsed.value;
}

const room = devRoom();

function settledSimulation(): RoomSimulation {
  const simulation = createRoomSimulation(room, { width: 1280, height: 720 });
  for (let frame = 0; frame < 30; frame += 1) {
    stepRoomSimulationWithCues(simulation, emptyIntents(), 1 / 60);
  }
  return simulation;
}

describe("gameplay cue emission", () => {
  it("does not emit a landing cue while settling at spawn", () => {
    const simulation = createRoomSimulation(room, {
      width: 1280,
      height: 720,
    });
    const cues: GameplayCue[] = [];

    for (let frame = 0; frame < 30; frame += 1) {
      cues.push(
        ...stepRoomSimulationWithCues(simulation, emptyIntents(), 1 / 60),
      );
    }

    expect(cues).toEqual([]);
    expect(simulation.players.p1.onGround).toBe(true);
  });

  it("emits exactly one jump cue on takeoff and one land cue on touchdown", () => {
    const simulation = settledSimulation();
    const jump = emptyIntents();
    jump.p1.jump = true;

    expect(stepRoomSimulationWithCues(simulation, jump, 1 / 60)).toEqual([
      "jump",
    ]);

    const cues: GameplayCue[] = [];
    for (let frame = 0; frame < 180; frame += 1) {
      cues.push(
        ...stepRoomSimulationWithCues(simulation, emptyIntents(), 1 / 60),
      );
    }

    expect(cues.filter((cue) => cue === "land")).toHaveLength(1);
    expect(cues.filter((cue) => cue === "jump")).toHaveLength(0);
    expect(simulation.players.p1.onGround).toBe(true);
  });

  it("does not emit cues for ordinary walking", () => {
    const simulation = settledSimulation();
    const walk = emptyIntents();
    walk.p1.moveX = 1;

    const cues: GameplayCue[] = [];
    for (let frame = 0; frame < 120; frame += 1) {
      cues.push(...stepRoomSimulationWithCues(simulation, walk, 1 / 60));
    }

    expect(cues).toEqual([]);
  });

  it("deduplicates the same semantic cue within one fixed step", () => {
    const simulation = settledSimulation();
    const jump = emptyIntents();
    jump.p1.jump = true;
    jump.p2.jump = true;

    expect(stepRoomSimulationWithCues(simulation, jump, 1 / 60)).toEqual([
      "jump",
    ]);
  });
});
