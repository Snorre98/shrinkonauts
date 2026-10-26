import Matter from "matter-js";
import { describe, expect, it } from "vitest";
import type { RoomDocument, RoomEntity } from "../src/pack";
import { COLLISION_LAYERS } from "../src/world/physics";
import {
  createRoomSimulation,
  emptyIntents,
  placePlayer,
  setTetherPolicy,
  stepRoomSimulation,
  stepRoomSimulationWithCues,
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

function bodyEntity(
  id: string,
  x: number,
  y: number,
  width: number,
  height: number,
  options: {
    fixedRotation?: boolean;
    mass?: number;
  } = {},
): RoomEntity {
  return {
    id,
    type: "body",
    x,
    y,
    components: {
      body: {
        width,
        height,
        dynamic: true,
        mass: options.mass ?? 0.2,
        fixedRotation: options.fixedRotation ?? true,
      },
    },
  };
}

function propEntity(id: string, bodyId: string, x: number, y: number): RoomEntity {
  return {
    id,
    type: "prop",
    x,
    y,
    components: {
      prop: {
        bodyId,
        tags: [id],
        shape: "box",
        carryable: true,
        placeable: true,
        pushable: true,
        throwable: true,
      },
    },
  };
}

function roomWith(extra: RoomEntity[]): RoomDocument {
  const copy = structuredClone(room);
  copy.entities = [...(copy.entities ?? []), ...extra];
  return copy;
}

function settledWith(extra: RoomEntity[]) {
  const simulation = createRoomSimulation(roomWith(extra), {
    width: 1280,
    height: 720,
  });
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

  it("lets stretch separate beyond normal and pulls back beyond its length", () => {
    const simulation = settled();
    setTetherPolicy(simulation, "stretch");

    placePlayer(simulation, "p1", 100, 640);
    placePlayer(simulation, "p2", 1150, 640);
    for (let frame = 0; frame < 60; frame += 1) {
      stepRoomSimulation(simulation, emptyIntents(), 1 / 60);
    }
    const relaxed = Math.abs(
      simulation.players.p1.x - simulation.players.p2.x,
    );
    expect(relaxed).toBeGreaterThan(560);
    expect(relaxed).toBeLessThan(1160);

    placePlayer(simulation, "p1", 50, 640);
    placePlayer(simulation, "p2", 1250, 640);
    for (let frame = 0; frame < 180; frame += 1) {
      stepRoomSimulation(simulation, emptyIntents(), 1 / 60);
    }
    const pulled = Math.abs(
      simulation.players.p1.x - simulation.players.p2.x,
    );
    expect(pulled).toBeLessThan(1190);
    expect(pulled).toBeGreaterThan(1000);
  });
});

describe("Matter physics coverage", () => {
  it("accelerates toward the movement target instead of snapping to it", () => {
    const simulation = settled();
    const p1 = simulation.players.p1;
    const move = emptyIntents();
    move.p1.moveX = 1;

    stepRoomSimulation(simulation, move, 1 / 60);
    expect(p1.vx).toBeGreaterThan(0);
    expect(p1.vx).toBeLessThan(200);

    for (let frame = 0; frame < 10; frame += 1) {
      stepRoomSimulation(simulation, move, 1 / 60);
    }
    expect(p1.vx).toBeGreaterThan(200);
    expect(p1.vx).toBeLessThan(300);

    for (let frame = 0; frame < 12; frame += 1) {
      stepRoomSimulation(simulation, emptyIntents(), 1 / 60);
    }
    expect(Math.abs(p1.vx)).toBeLessThan(30);
  });

  it("pushes a prop with the player body", () => {
    const simulation = settledWith([
      bodyEntity("body-push", 6, 19, 20, 20),
      propEntity("prop-push", "body-push", 6, 19),
    ]);
    const prop = simulation.physics.props.get("prop-push");
    expect(prop).toBeDefined();
    if (!prop) return;

    const before = prop.body.position.x;
    placePlayer(simulation, "p1", 4.5 * 32, 20 * 32);
    const move = emptyIntents();
    move.p1.moveX = 1;
    for (let frame = 0; frame < 120; frame += 1) {
      stepRoomSimulation(simulation, move, 1 / 60);
    }
    expect(prop.body.position.x).toBeGreaterThan(before + 20);
  });

  it("stacks two dynamic props", () => {
    const simulation = settledWith([
      bodyEntity("body-stack-bottom", 6, 18, 20, 20),
      propEntity("prop-stack-bottom", "body-stack-bottom", 6, 18),
      bodyEntity("body-stack-top", 6, 15, 20, 20),
      propEntity("prop-stack-top", "body-stack-top", 6, 15),
    ]);
    for (let frame = 0; frame < 180; frame += 1) {
      stepRoomSimulation(simulation, emptyIntents(), 1 / 60);
    }

    const bottom = simulation.physics.props.get("prop-stack-bottom");
    const top = simulation.physics.props.get("prop-stack-top");
    expect(bottom).toBeDefined();
    expect(top).toBeDefined();
    if (!bottom || !top) return;
    expect(top.body.position.y).toBeLessThan(
      bottom.body.position.y - 10,
    );
  });

  it("rotates a non-fixed-rotation prop", () => {
    const simulation = createRoomSimulation(
      roomWith([
        bodyEntity("body-spin", 7, 16, 40, 12, { fixedRotation: false }),
        propEntity("prop-spin", "body-spin", 7, 16),
      ]),
      { width: 1280, height: 720 },
    );
    const prop = simulation.physics.props.get("prop-spin");
    expect(prop).toBeDefined();
    if (!prop) return;

    Matter.Body.setAngle(prop.body, 0.4);
    Matter.Body.setAngularVelocity(prop.body, 0.2);
    Matter.Sleeping.set(prop.body, false);
    const before = prop.body.angle;
    for (let frame = 0; frame < 5; frame += 1) {
      stepRoomSimulation(simulation, emptyIntents(), 1 / 60);
    }
    expect(Math.abs(prop.body.angle - before)).toBeGreaterThan(0.001);
  });

  it("throws a carried prop with an impulse", () => {
    const simulation = settled();
    expect(simulation.physics.pickUp("p2", "tracer-prop")).toBe(true);
    expect(simulation.physics.throwProp("tracer-prop", 1)).toBe(true);
    const prop = simulation.physics.props.get("tracer-prop");
    expect(prop?.state.state).toBe("free");
    expect(prop?.body.velocity.x).toBeGreaterThan(0);
    expect(prop?.body.velocity.y).toBeLessThan(0);
  });

  it("keeps the L1 collision layers explicit", () => {
    const simulation = settledWith([
      {
        id: "hazard-layer",
        type: "hazard",
        x: 8,
        y: 20,
        components: { body: { width: 32, height: 32 } },
      },
    ]);

    expect(simulation.physics.playerBodies.p1.collisionFilter).toMatchObject(
      COLLISION_LAYERS.player,
    );
    const prop = simulation.physics.props.get("tracer-prop");
    expect(prop?.body.collisionFilter).toMatchObject(COLLISION_LAYERS.prop);
    expect(simulation.physics.solids[0]?.collisionFilter).toMatchObject(
      COLLISION_LAYERS.solid,
    );
    const hazard = simulation.physics.hazards[0];
    expect(hazard?.collisionFilter).toMatchObject(COLLISION_LAYERS.hazard);
    expect(hazard?.isSensor).toBe(true);
  });

  it("respawns a player at the checkpoint after touching a hazard", () => {
    const simulation = settledWith([
      {
        id: "hazard-test",
        type: "hazard",
        x: 6,
        y: 20,
        components: { body: { width: 32, height: 32 } },
      },
    ]);
    const p1 = simulation.players.p1;
    const spawn = { x: p1.spawnX, y: p1.spawnY };
    placePlayer(simulation, "p1", 6.5 * 32, 20 * 32);

    const cues = stepRoomSimulationWithCues(
      simulation,
      emptyIntents(),
      1 / 60,
    );
    expect(cues).toContain("hazard");
    expect(simulation.hazardRespawns).toContain("p1");
    expect(p1.x).toBeCloseTo(spawn.x, 0);
    expect(p1.y).toBeCloseTo(spawn.y, 0);
  });
});
