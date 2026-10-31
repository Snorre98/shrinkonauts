import { describe, expect, it } from "vitest";
import {
  createEcsWorld,
  createEntityId,
  defineComponent,
  type EcsWorld,
  type FrameContext,
  type FrameSystem,
  type TickContext,
  type TickSystem,
} from "../src/ecs";

const Position = defineComponent<{ x: number; y: number }>("position");
const Velocity = defineComponent<{ x: number; y: number }>("velocity");
const Name = defineComponent<string>("name");

function tickSystem(
  name: string,
  run: (world: EcsWorld, context: TickContext) => void,
): TickSystem {
  return { name, phase: "tick", run };
}

function frameSystem(
  name: string,
  run: (world: EcsWorld, context: FrameContext) => void,
): FrameSystem {
  return { name, phase: "frame", run };
}

describe("ecs kernel", () => {
  it("spawns generated and caller-supplied entities and despawns them", () => {
    const world = createEcsWorld();
    const generated = world.spawn();
    const supplied = world.spawn(createEntityId("player:1"));

    expect(typeof generated).toBe("string");
    expect(generated).toMatch(/^entity:\d+$/);
    expect(supplied).toBe("player:1");
    expect(world.query()).toEqual([generated, supplied]);

    world.despawn(generated);
    expect(world.query()).toEqual([supplied]);

    world.despawn(createEntityId("missing"));
    expect(world.query()).toEqual([supplied]);
  });

  it("generates deterministic IDs without reusing them", () => {
    const first = createEcsWorld();
    const a = first.spawn();
    const b = first.spawn();

    expect(a).toBe("entity:1");
    expect(b).toBe("entity:2");

    first.despawn(a);
    expect(first.spawn()).toBe("entity:3");

    const second = createEcsWorld();
    expect(second.spawn()).toBe("entity:1");
  });

  it("skips caller-supplied IDs that collide with generated IDs", () => {
    const world = createEcsWorld();
    world.spawn(createEntityId("entity:1"));

    expect(world.spawn()).toBe("entity:2");
  });

  it("rejects duplicate spawn IDs", () => {
    const world = createEcsWorld();
    const entity = createEntityId("player:1");
    world.spawn(entity);

    expect(() => world.spawn(entity)).toThrow(/already exists/);
  });

  it("upserts, reads, and removes components", () => {
    const world = createEcsWorld();
    const entity = world.spawn();

    expect(world.get(entity, Position)).toBeUndefined();

    world.add(entity, Position, { x: 1, y: 2 });
    expect(world.get(entity, Position)).toEqual({ x: 1, y: 2 });

    world.add(entity, Position, { x: 3, y: 4 });
    expect(world.get(entity, Position)).toEqual({ x: 3, y: 4 });

    world.remove(entity, Position);
    expect(world.get(entity, Position)).toBeUndefined();

    world.remove(entity, Position);
    expect(world.get(entity, Position)).toBeUndefined();
  });

  it("uses component token identity rather than names", () => {
    const world = createEcsWorld();
    const entity = world.spawn();
    const First = defineComponent<number>("value");
    const Second = defineComponent<number>("value");

    world.add(entity, First, 1);

    expect(world.get(entity, First)).toBe(1);
    expect(world.get(entity, Second)).toBeUndefined();
  });

  it("defines missing-entity and missing-component behavior", () => {
    const world = createEcsWorld();
    const entity = world.spawn();
    const missing = createEntityId("missing");

    expect(world.get(entity, Name)).toBeUndefined();
    expect(world.get(missing, Name)).toBeUndefined();
    expect(() => world.add(missing, Name, "orphan")).toThrow(/unknown ECS entity/);

    world.remove(missing, Name);
    world.despawn(missing);
    expect(world.query()).toEqual([entity]);

    const stable = createEntityId("stable");
    world.spawn(stable);
    world.add(stable, Name, "before despawn");
    world.despawn(stable);
    world.spawn(stable);

    expect(world.get(stable, Name)).toBeUndefined();
  });

  it("queries one or more component types in entity insertion order", () => {
    const world = createEcsWorld();
    const a = world.spawn(createEntityId("a"));
    const b = world.spawn(createEntityId("b"));
    const c = world.spawn(createEntityId("c"));
    const d = world.spawn(createEntityId("d"));

    world.add(c, Position, { x: 0, y: 0 });
    world.add(a, Position, { x: 0, y: 0 });
    world.add(a, Velocity, { x: 1, y: 1 });
    world.add(b, Position, { x: 0, y: 0 });
    world.add(b, Velocity, { x: 1, y: 1 });
    world.add(d, Name, "d");

    expect(world.query(Position)).toEqual([a, b, c]);
    expect(world.query(Position, Velocity)).toEqual([a, b]);
    expect(world.query(Name)).toEqual([d]);
    expect(world.query()).toEqual([a, b, c, d]);
    expect(world.query(Position, Position)).toEqual([a, b, c]);
  });

  it("excludes despawned entities from queries", () => {
    const world = createEcsWorld();
    const a = world.spawn(createEntityId("a"));
    const b = world.spawn(createEntityId("b"));

    world.add(a, Position, { x: 0, y: 0 });
    world.add(b, Position, { x: 0, y: 0 });
    world.despawn(a);

    expect(world.query(Position)).toEqual([b]);
    expect(world.get(a, Position)).toBeUndefined();
  });

  it("runs systems in registration order within each phase", () => {
    const world = createEcsWorld();
    const calls: string[] = [];

    world.addSystem(tickSystem("tick-first", () => calls.push("tick-first")));
    world.addSystem(frameSystem("frame-first", () => calls.push("frame-first")));
    world.addSystem(tickSystem("tick-second", () => calls.push("tick-second")));

    world.tick(1 / 60, {});
    expect(calls).toEqual(["tick-first", "tick-second"]);

    calls.length = 0;
    world.frame({});
    expect(calls).toEqual(["frame-first"]);
  });

  it("passes dt and each phase its own context", () => {
    const world = createEcsWorld();
    let receivedTick: TickContext | undefined;
    let receivedFrame: FrameContext | undefined;

    world.addSystem(
      tickSystem("tick", (_inner, context) => {
        receivedTick = context;
      }),
    );
    world.addSystem(
      frameSystem("frame", (_inner, context) => {
        receivedFrame = context;
      }),
    );

    world.tick(0.25, { source: "test" });
    expect(receivedTick).toEqual({ source: "test", dt: 0.25 });

    const frameContext = { camera: { x: 10, y: 20 } };
    world.frame(frameContext);
    expect(receivedFrame).toBe(frameContext);
  });

  it("rejects duplicate system names across phases", () => {
    const world = createEcsWorld();
    world.addSystem(tickSystem("same", () => {}));

    expect(() =>
      world.addSystem(frameSystem("same", () => {})),
    ).toThrow(/Duplicate ECS system name/);
  });

  it("applies systems registered during a run on the next run", () => {
    const world = createEcsWorld();
    const calls: string[] = [];
    let registered = false;

    world.addSystem(
      tickSystem("first", (inner) => {
        calls.push("first");
        if (!registered) {
          registered = true;
          inner.addSystem(tickSystem("late", () => calls.push("late")));
        }
      }),
    );

    world.tick(0, {});
    expect(calls).toEqual(["first"]);

    world.tick(0, {});
    expect(calls).toEqual(["first", "first", "late"]);
  });

  it("lets systems read and mutate the world through the passed instance", () => {
    const world = createEcsWorld();
    const entity = world.spawn();

    world.add(entity, Position, { x: 0, y: 0 });
    world.add(entity, Velocity, { x: 2, y: 3 });
    world.addSystem(
      tickSystem("move", (inner) => {
        for (const id of inner.query(Position, Velocity)) {
          const position = inner.get(id, Position);
          const velocity = inner.get(id, Velocity);
          if (!position || !velocity) continue;
          inner.add(id, Position, {
            x: position.x + velocity.x,
            y: position.y + velocity.y,
          });
        }
      }),
    );

    world.tick(1, {});
    world.tick(1, {});
    expect(world.get(entity, Position)).toEqual({ x: 4, y: 6 });
  });

  it("is deterministic across repeated runs", () => {
    const runSequence = (): {
      calls: string[];
      positions: Array<{ x: number; y: number }>;
    } => {
      const world = createEcsWorld();
      const calls: string[] = [];
      const a = world.spawn(createEntityId("a"));
      const b = world.spawn(createEntityId("b"));

      world.add(a, Position, { x: 0, y: 0 });
      world.add(b, Position, { x: 10, y: 0 });
      world.addSystem(
        tickSystem("move", (inner) => {
          calls.push("move");
          for (const id of inner.query(Position)) {
            const position = inner.get(id, Position);
            if (!position) continue;
            inner.add(id, Position, { x: position.x + 1, y: position.y });
          }
        }),
      );
      world.addSystem(
        tickSystem("observe", () => {
          calls.push("observe");
        }),
      );

      world.tick(0.1, {});
      world.tick(0.1, {});

      return {
        calls,
        positions: world
          .query(Position)
          .map((id) => world.get(id, Position))
          .filter((position): position is { x: number; y: number } =>
            Boolean(position),
          ),
      };
    };

    expect(runSequence()).toEqual(runSequence());
    expect(runSequence().calls).toEqual([
      "move",
      "observe",
      "move",
      "observe",
    ]);
  });

  it("keeps independent worlds isolated", () => {
    const first = createEcsWorld();
    const second = createEcsWorld();
    const shared = createEntityId("shared");
    const firstEntity = first.spawn(shared);
    const secondEntity = second.spawn(shared);

    first.add(firstEntity, Position, { x: 1, y: 2 });
    second.add(secondEntity, Position, { x: 3, y: 4 });

    expect(first.get(firstEntity, Position)).toEqual({ x: 1, y: 2 });
    expect(second.get(secondEntity, Position)).toEqual({ x: 3, y: 4 });
    expect(first.query()).toEqual([firstEntity]);
    expect(second.query()).toEqual([secondEntity]);

    const firstOnly = first.spawn(createEntityId("first-only"));
    expect(first.query()).toEqual([firstEntity, firstOnly]);
    expect(second.query()).toEqual([secondEntity]);
  });
});
