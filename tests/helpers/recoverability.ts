import { PuzzleRuntime } from "../../src/puzzle";
import type {
  PlateNode,
  PropNode,
  PuzzleDocument,
  PuzzlePropSnapshot,
  PuzzleRunState,
  PuzzleWorldSnapshot,
  ReceptorNode,
  TimerNode,
  ZoneNode,
} from "../../src/puzzle";

/**
 * Sampled recoverability guard for the puzzle engine.
 *
 * An exhaustive search over every tick-level interleaving is exponential in
 * the number of timer and cooldown phases, so this guard samples reachable
 * states with a seeded random walk and then asks a deterministic recovery
 * oracle to win from each sampled state. A state the oracle cannot recover
 * from is reported as dead.
 *
 * The oracle pokes every ordinary play affordance: place each prop on each
 * receptor, fire each pulse, then hold each sensor long enough for the longest
 * timer. That is enough to recover from any state that is not structurally
 * dead, so a failure points at an engine invariant rather than at the search.
 */

const PLAYER_WIDTH = 28;
const PLAYER_HEIGHT = 44;
const PROP_SIZE = 20;

type SensorNode = PlateNode | ZoneNode;

interface World {
  /** Sensor occupied by a single player, or null. */
  sensor: string | null;
  /** Prop node id -> "spawn" or receptor node id. */
  placements: Record<string, string>;
}

interface Action {
  sensor?: string | null;
  placement?: { propId: string; target: string };
  pulseSource?: string;
}

interface SearchNode {
  run: PuzzleRunState;
  world: World;
}

export interface RecoverabilityOptions {
  /** Seeded random walks. Defaults to 200. */
  runs?: number;
  /** Ticks per random walk. Defaults to 400. */
  ticksPerRun?: number;
  /** Seed for the deterministic walk. Defaults to 1. */
  seed?: number;
  /** Cap on distinct sampled states kept for the oracle. Defaults to 1000. */
  maxStates?: number;
}

export interface RecoverabilityResult {
  /** Distinct unsolved states collected from the random walks. */
  sampled: number;
  /** Random walks that reached the win on their own. */
  solvedRuns: number;
  /** Human-readable summaries of sampled states the oracle could not solve. */
  dead: string[];
}

function sensorsOf(document: PuzzleDocument): SensorNode[] {
  return document.nodes.filter(
    (node): node is SensorNode =>
      (node.type === "plate" || node.type === "zone") &&
      node.detects.includes("player") &&
      node.minimum <= 1,
  );
}

function propsOf(document: PuzzleDocument): PropNode[] {
  return document.nodes.filter(
    (node): node is PropNode => node.type === "prop",
  );
}

function receptorsOf(document: PuzzleDocument): ReceptorNode[] {
  return document.nodes.filter(
    (node): node is ReceptorNode => node.type === "receptor",
  );
}

function timersOf(document: PuzzleDocument): TimerNode[] {
  return document.nodes.filter(
    (node): node is TimerNode => node.type === "timer",
  );
}

function pulseSourcesOf(document: PuzzleDocument): string[] {
  return document.nodes
    .filter((node) => node.type === "pulseSource")
    .map((node) => node.id);
}

function actionsFor(document: PuzzleDocument): Action[] {
  const actions: Action[] = [{ sensor: null }];
  for (const sensor of sensorsOf(document)) {
    actions.push({ sensor: sensor.id });
  }
  for (const prop of propsOf(document)) {
    actions.push({ placement: { propId: prop.id, target: "spawn" } });
    for (const receptor of receptorsOf(document)) {
      actions.push({ placement: { propId: prop.id, target: receptor.id } });
    }
  }
  for (const source of pulseSourcesOf(document)) {
    actions.push({ pulseSource: source });
  }
  return actions;
}

function initialWorld(document: PuzzleDocument): World {
  return {
    sensor: null,
    placements: Object.fromEntries(
      propsOf(document).map((node) => [node.id, "spawn"]),
    ),
  };
}

function isNoop(action: Action, world: World): boolean {
  if (action.pulseSource) return false;
  if (action.sensor !== undefined) {
    return action.sensor === world.sensor;
  }
  if (action.placement) {
    const current = world.placements[action.placement.propId];
    return current === action.placement.target;
  }
  return true;
}

function applyAction(world: World, action: Action): World {
  if (action.sensor !== undefined) {
    return { ...world, sensor: action.sensor };
  }
  if (action.placement) {
    return {
      ...world,
      placements: {
        ...world.placements,
        [action.placement.propId]: action.placement.target,
      },
    };
  }
  return world;
}

function worldSnapshot(
  document: PuzzleDocument,
  world: World,
): PuzzleWorldSnapshot {
  const players: PuzzleWorldSnapshot["players"] = [];
  const sensor = sensorsOf(document).find((node) => node.id === world.sensor);
  if (sensor) {
    players.push({
      id: "p1",
      x: sensor.rect.x + sensor.rect.width / 2,
      y: sensor.rect.y + sensor.rect.height / 2,
      width: PLAYER_WIDTH,
      height: PLAYER_HEIGHT,
      active: true,
    });
  }

  const receptors = receptorsOf(document);
  const props = propsOf(document).map((node): PuzzlePropSnapshot => {
    const target = world.placements[node.id] ?? "spawn";
    const receptor = receptors.find((entry) => entry.id === target);
    return {
      id: node.entityId,
      x: receptor?.snap.x ?? node.spawn?.x ?? 0,
      y: receptor?.snap.y ?? node.spawn?.y ?? 0,
      width: PROP_SIZE,
      height: PROP_SIZE,
      active: true,
      state: receptor ? "placed" : "free",
      tags: [...node.tags],
      shape: node.shape,
      carriedBy: null,
    };
  });

  return { tick: 1, players, props };
}

function describeState(node: SearchNode): string {
  const nodes = Object.fromEntries(
    Object.entries(node.run.nodes).map(([id, state]) => [
      id,
      `${state.state}${state.active ? "*" : ""}${
        state.remaining > 0 ? `(${state.remaining})` : ""
      }`,
    ]),
  );
  return JSON.stringify({
    world: { sensor: node.world.sensor, placements: node.world.placements },
    nodes,
  });
}

function createRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 0x1_0000_0000;
  };
}

function sampledStates(
  document: PuzzleDocument,
  options: Required<RecoverabilityOptions>,
): { states: SearchNode[]; solvedRuns: number } {
  const actions = actionsFor(document);
  const random = createRandom(options.seed);
  // Reservoir sampling keeps the oracle budget bounded while still spreading
  // the sample across every run and tick, instead of only the early states.
  const reservoir: SearchNode[] = [];
  let samples = 0;
  let solvedRuns = 0;

  for (let run = 0; run < options.runs; run += 1) {
    const runtime = new PuzzleRuntime(document);
    let world = initialWorld(document);

    for (let tick = 0; tick < options.ticksPerRun; tick += 1) {
      const action = actions[Math.floor(random() * actions.length)];
      if (!isNoop(action, world)) {
        if (action.pulseSource) {
          runtime.usePulse(action.pulseSource, "p1");
        } else {
          world = applyAction(world, action);
        }
      }
      runtime.tickResult(worldSnapshot(document, world));

      if (runtime.isSolved()) {
        solvedRuns += 1;
        break;
      }

      samples += 1;
      const state: SearchNode = { run: runtime.snapshot(), world };
      if (reservoir.length < options.maxStates) {
        reservoir.push(state);
        continue;
      }
      const slot = Math.floor(random() * samples);
      if (slot < options.maxStates) {
        reservoir[slot] = state;
      }
    }
  }

  return { states: reservoir, solvedRuns };
}

/**
 * Deterministic recovery oracle.
 *
 * For every combination of prop placements: fire every pulse source, then
 * hold every sensor for the longest timer duration. Returns true as soon as
 * the win predicate is reached.
 */
function recovers(
  document: PuzzleDocument,
  state: SearchNode,
): boolean {
  const receptors = receptorsOf(document);
  const props = propsOf(document);
  const pulses = pulseSourcesOf(document);
  const sensors = sensorsOf(document);
  const maxCooldown = Math.max(0, ...pulses.map((id) => {
    const node = document.nodes.find((entry) => entry.id === id);
    return node?.type === "pulseSource" ? node.cooldownTicks : 0;
  }));
  const maxTravel = Math.max(0, ...pulses.map((id) => {
    const node = document.nodes.find((entry) => entry.id === id);
    return node?.type === "pulseSource" ? node.travelTicks : 0;
  }));
  const holdTicks =
    Math.max(0, ...timersOf(document).map((node) => node.durationTicks)) +
    maxTravel +
    2;
  const placements = props.map(() => [
    "spawn",
    ...receptors.map((receptor) => receptor.id),
  ]);

  const placementVariants: Record<string, string>[] = [{}];
  props.forEach((prop, index) => {
    const variants: Record<string, string>[] = [];
    for (const variant of placementVariants) {
      for (const placement of placements[index]) {
        variants.push({ ...variant, [prop.id]: placement });
      }
    }
    placementVariants.splice(0, placementVariants.length, ...variants);
  });

  const advance = (
    runtime: PuzzleRuntime,
    world: World,
    ticks: number,
  ): boolean => {
    for (let tick = 0; tick < ticks; tick += 1) {
      runtime.tickResult(worldSnapshot(document, world));
      if (runtime.isSolved()) return true;
    }
    return false;
  };

  for (const variant of placementVariants) {
    const baseWorld: World = { sensor: null, placements: variant };
    const runtime = new PuzzleRuntime(document);
    runtime.restore(state.run);

    let won = false;
    for (const source of pulses) {
      for (let wait = 0; wait <= maxCooldown; wait += 1) {
        if (runtime.usePulse(source, "p1")) break;
        if (advance(runtime, baseWorld, 1)) {
          won = true;
          break;
        }
      }
      if (won) break;
      if (advance(runtime, baseWorld, maxTravel + 2)) {
        won = true;
        break;
      }
    }
    if (won) return true;

    for (const sensor of sensors) {
      const world: World = { ...baseWorld, sensor: sensor.id };
      // A one-shot timer can be reset mid-hold (AChE clearance), so press the
      // sensor again on a fresh edge. Releasing for one tick re-arms the press.
      for (let cycle = 0; cycle < 3; cycle += 1) {
        if (advance(runtime, world, holdTicks)) return true;
        if (advance(runtime, { ...baseWorld, sensor: null }, 1)) return true;
      }
    }
  }

  return false;
}

export function findUnrecoverableStates(
  document: PuzzleDocument,
  options: RecoverabilityOptions = {},
): RecoverabilityResult {
  const resolved: Required<RecoverabilityOptions> = {
    runs: options.runs ?? 200,
    ticksPerRun: options.ticksPerRun ?? 400,
    seed: options.seed ?? 1,
    maxStates: options.maxStates ?? 1000,
  };
  const { states, solvedRuns } = sampledStates(document, resolved);
  const dead = states
    .filter((state) => !recovers(document, state))
    .map(describeState);

  return {
    sampled: states.length,
    solvedRuns,
    dead,
  };
}
