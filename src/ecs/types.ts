/**
 * A stable, branded entity identifier.
 *
 * IDs are strings so entities can keep durable identities such as
 * `fb:meter:ca-timer` when higher layers use the kernel. The brand prevents
 * arbitrary strings from being passed to the world by accident.
 */
declare const entityBrand: unique symbol;

export type EntityId = string & { readonly [entityBrand]: never };

/** Brands a caller-owned stable string as an entity ID. */
export function createEntityId(value: string): EntityId {
  return value as EntityId;
}

/**
 * A typed component token.
 *
 * Tokens are opaque objects, not raw strings. Two calls to `defineComponent`
 * always produce different tokens, even when they share a diagnostic name.
 * The phantom brand is erased at runtime.
 */
declare const componentBrand: unique symbol;

export interface ComponentType<T> {
  /** Diagnostic name; the token itself is the storage identity. */
  readonly name: string;
  /** Phantom type marker; absent at runtime. */
  readonly [componentBrand]: T;
}

/** Creates a new component token for values of type `T`. */
export function defineComponent<T>(name: string): ComponentType<T> {
  return Object.freeze({ name }) as ComponentType<T>;
}

export type SystemPhase = "tick" | "frame";

/**
 * Context passed to fixed-step systems.
 *
 * `dt` is the step in seconds supplied to `EcsWorld.tick`. Any additional
 * fields are caller-owned payload; the kernel never reads them.
 */
export interface TickContext {
  readonly dt: number;
  readonly [key: string]: unknown;
}

/**
 * Context passed to frame systems.
 *
 * The kernel does not interpret this object. Callers carry camera, viewport,
 * or presentation data here without adding domain types to the kernel.
 */
export interface FrameContext {
  readonly [key: string]: unknown;
}

export interface TickSystem {
  readonly name: string;
  readonly phase: "tick";
  run(world: EcsWorld, context: TickContext): void;
}

export interface FrameSystem {
  readonly name: string;
  readonly phase: "frame";
  run(world: EcsWorld, context: FrameContext): void;
}

export type System = TickSystem | FrameSystem;

export interface EcsWorld {
  spawn(id?: EntityId): EntityId;
  despawn(entity: EntityId): void;

  add<T>(entity: EntityId, type: ComponentType<T>, value: T): void;
  get<T>(entity: EntityId, type: ComponentType<T>): T | undefined;
  remove<T>(entity: EntityId, type: ComponentType<T>): void;

  /**
   * Returns live entities that have every requested component, in entity
   * insertion order. The result is a snapshot: later world changes do not
   * mutate it. With no types, returns every live entity.
   */
  query(...types: ComponentType<unknown>[]): EntityId[];

  /**
   * Registers a system. Systems run in registration order within their phase.
   * System names must be unique.
   */
  addSystem(system: System): void;

  /**
   * Runs tick systems in registration order. Each receives `{ ...context, dt }`
   * where the `dt` argument wins over a payload field of the same name.
   */
  tick(dt: number, context?: Record<string, unknown>): void;

  /**
   * Runs frame systems in registration order with the supplied context.
   */
  frame(context?: FrameContext): void;
}
