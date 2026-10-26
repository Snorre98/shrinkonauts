import Matter from "matter-js";
import { describe, expect, it } from "vitest";
import {
  createRoomSimulation,
  emptyIntents,
  setTetherPolicy,
  stepRoomSimulation,
} from "../src/world/simulation";
import { loadContent, packDirectory } from "../scripts/content-loader";

const content = loadContent(packDirectory("anatomy-reflex"));
const room = content.rooms["room-nerve-forest"];

if (!room) throw new Error("room-nerve-forest is missing");

function settled() {
  const simulation = createRoomSimulation(room, { width: 1280, height: 720 });
  for (let frame = 0; frame < 20; frame += 1) {
    stepRoomSimulation(simulation, emptyIntents(), 1 / 60);
  }
  return simulation;
}

describe("Matter prop lifecycle", () => {
  it("carries, places, docks, and resets the tracer", () => {
    const simulation = settled();
    const prop = simulation.physics.props.get("tracer-prop");
    expect(prop).toBeDefined();
    if (!prop) return;

    expect(prop.state.state).toBe("free");
    expect(simulation.physics.pickUp("p2", "tracer-prop")).toBe(true);
    expect(simulation.physics.propState("tracer-prop")?.state).toBe("carried");

    for (let frame = 0; frame < 10; frame += 1) {
      stepRoomSimulation(simulation, emptyIntents(), 1 / 60);
    }
    expect(simulation.props["tracer-prop"]?.state).toBe("carried");
    expect(simulation.props["tracer-prop"]?.carriedBy).toBe("p2");

    expect(
      simulation.physics.placeProp("tracer-prop", "receptor-a", {
        x: 912,
        y: 596,
      }),
    ).toBe(true);
    expect(simulation.physics.propState("tracer-prop")?.state).toBe("placed");
    expect(simulation.physics.propState("tracer-prop")?.placedOn).toBe("receptor-a");

    expect(simulation.physics.dockProp("tracer-prop", "receptor-a")).toBe(true);
    expect(simulation.physics.propState("tracer-prop")?.state).toBe("docked");

    expect(simulation.physics.resetProp("tracer-prop")).toBe(true);
    expect(simulation.physics.propState("tracer-prop")?.state).toBe("free");
    expect(simulation.physics.propState("tracer-prop")?.placedOn).toBeNull();
  });

  it("returns an out-of-bounds prop to its spawn", () => {
    const simulation = settled();
    const prop = simulation.physics.props.get("tracer-prop");
    expect(prop).toBeDefined();
    if (!prop) return;

    Matter.Body.setPosition(prop.body, { x: -500, y: 900 });
    for (let frame = 0; frame < 90; frame += 1) {
      stepRoomSimulation(simulation, emptyIntents(), 1 / 60);
    }

    expect(simulation.props["tracer-prop"]?.state).toBe("free");
    expect(simulation.props["tracer-prop"]?.x).toBeGreaterThan(0);
    expect(simulation.props["tracer-prop"]?.y).toBeGreaterThan(0);
  });

  it("applies the puzzle-scoped tether policy", () => {
    const simulation = settled();
    setTetherPolicy(simulation, "off");
    expect(simulation.tetherPolicy).toBe("off");

    const p1 = simulation.players.p1;
    const p2 = simulation.players.p2;
    simulation.physics.setPlayerPosition("p1", 200, 640);
    simulation.physics.setPlayerPosition("p2", 1100, 640);
    for (let frame = 0; frame < 60; frame += 1) {
      stepRoomSimulation(simulation, emptyIntents(), 1 / 60);
    }
    expect(Math.abs(p1.x - p2.x)).toBeGreaterThan(560);

    setTetherPolicy(simulation, "normal");
    for (let frame = 0; frame < 120; frame += 1) {
      stepRoomSimulation(simulation, emptyIntents(), 1 / 60);
    }
    expect(Math.abs(p1.x - p2.x)).toBeLessThanOrEqual(568);
  });
});
