import {
  createEntityId,
  type ComponentType,
  type EcsWorld,
  type EntityId,
  type FrameContext,
  type FrameSystem,
  type System,
  type TickContext,
  type TickSystem,
} from "./types";

type ComponentStore = Map<EntityId, unknown>;

/**
 * Deterministic, domain-free ECS world.
 *
 * Registration order is the execution order within each phase. Entities and
 * component iteration use Set/Map insertion order. `tick` and `frame` snapshot
 * their system list before running, so a system registered during a run starts
 * on the next invocation.
 */
class EcsWorldImpl implements EcsWorld {
  private readonly entities = new Set<EntityId>();
  private readonly components = new Map<ComponentType<unknown>, ComponentStore>();
  private readonly tickSystems: TickSystem[] = [];
  private readonly frameSystems: FrameSystem[] = [];
  private readonly systemNames = new Set<string>();
  private nextEntityNumber = 1;

  spawn(id?: EntityId): EntityId {
    const entity = id ?? this.generateEntityId();
    if (this.entities.has(entity)) {
      throw new Error(`ECS entity already exists: ${entity}`);
    }
    this.entities.add(entity);
    return entity;
  }

  despawn(entity: EntityId): void {
    if (!this.entities.delete(entity)) {
      return;
    }

    for (const [type, store] of this.components) {
      store.delete(entity);
      if (store.size === 0) {
        this.components.delete(type);
      }
    }
  }

  add<T>(entity: EntityId, type: ComponentType<T>, value: T): void {
    if (!this.entities.has(entity)) {
      throw new Error(`Cannot add a component to unknown ECS entity: ${entity}`);
    }

    let store = this.components.get(type);
    if (!store) {
      store = new Map();
      this.components.set(type, store);
    }
    store.set(entity, value);
  }

  get<T>(entity: EntityId, type: ComponentType<T>): T | undefined {
    if (!this.entities.has(entity)) {
      return undefined;
    }
    return this.components.get(type)?.get(entity) as T | undefined;
  }

  remove<T>(entity: EntityId, type: ComponentType<T>): void {
    if (!this.entities.has(entity)) {
      return;
    }

    const store = this.components.get(type);
    if (!store) {
      return;
    }

    store.delete(entity);
    if (store.size === 0) {
      this.components.delete(type);
    }
  }

  query(...types: ComponentType<unknown>[]): EntityId[] {
    const stores = types.map((type) => this.components.get(type));
    const matches: EntityId[] = [];

    for (const entity of this.entities) {
      if (stores.every((store) => store?.has(entity))) {
        matches.push(entity);
      }
    }

    return matches;
  }

  addSystem(system: System): void {
    if (this.systemNames.has(system.name)) {
      throw new Error(`Duplicate ECS system name: ${system.name}`);
    }

    this.systemNames.add(system.name);
    if (system.phase === "tick") {
      this.tickSystems.push(system);
    } else {
      this.frameSystems.push(system);
    }
  }

  tick(dt: number, context: Record<string, unknown> = {}): void {
    const tickContext: TickContext = { ...context, dt };
    for (const system of [...this.tickSystems]) {
      system.run(this, tickContext);
    }
  }

  frame(context: FrameContext = {}): void {
    for (const system of [...this.frameSystems]) {
      system.run(this, context);
    }
  }

  private generateEntityId(): EntityId {
    let entity: EntityId;

    do {
      entity = createEntityId(`entity:${this.nextEntityNumber}`);
      this.nextEntityNumber += 1;
    } while (this.entities.has(entity));

    return entity;
  }
}

/**
 * Creates an independent ECS world.
 *
 * Entities, components, systems, and generated IDs are world-local. The kernel
 * has no module-level singleton.
 */
export function createEcsWorld(): EcsWorld {
  return new EcsWorldImpl();
}
