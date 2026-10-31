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
 * Exhaustive stable-state reachability guard.
 *
 * The full tick-level state space includes every timer and cooldown phase and
 * grows without a useful bound. This guard instead explores **stable decision
 * states**: from each state it applies one authored affordance (sensor on/off,
 * prop placement, pulse), lets timers/pulses/cooldowns settle, and records the
 * resulting state. Solved transitions are terminal.
 *
 * The resulting graph is small for the current puzzles (03: 26 states, 04: 15)
 * and is exhaustive over the action alphabet at decision points. Waiting only
 * advances timers/pulses/cooldowns; the static gate-recovery validator separately
 * warns on non-latched gates that can close permanently. A future puzzle that
 * depends on a sub-timer window or a repeating timer needs an explicit timed
 * extension.
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

interface SettleResult {
  solved: boolean;
  capped: boolean;
}

export interface RecoverabilityOptions {
  /** Maximum explored stable states. Defaults to 10,000. */
  maxStates?: number;
  /** Maximum ticks spent settling one action. Defaults to the document bound. */
  maxSettleTicks?: number;
}

export interface RecoverabilityResult {
  /** Distinct reachable stable states, including the initial state. */
  states: number;
  /** States with at least one action that solves the puzzle. */
  solvedStates: number;
  /** True when a state or settle budget was exhausted. Never treat as a pass. */
  capped: boolean;
  /** Human-readable summaries of reachable unsolved states that cannot solve. */
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

function startingWorld(document: PuzzleDocument): World {
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
      `${state.state}${state.active ? "*" : ""}${state.remaining > 0 ? `(${state.remaining})` : ""}`,
    ]),
  );
  return JSON.stringify({
    world: { sensor: node.world.sensor, placements: node.world.placements },
    nodes,
  });
}

/**
 * Absolute tick and evidence counters are observations, not puzzle logic.
 * Keeping them in the key would create an unbounded state graph.
 */
function canonicalKey(run: PuzzleRunState, world: World): string {
  const nodes = Object.fromEntries(
    Object.entries(run.nodes).map(([id, state]) => [
      id,
      [
        state.state,
        state.active,
        state.count,
        state.remaining,
        state.fired,
        state.occupiedBy,
      ],
    ]),
  );
  return JSON.stringify({
    nodes,
    pulses: run.pulses,
    sensor: world.sensor,
    placements: world.placements,
  });
}

function settleBudget(document: PuzzleDocument): number {
  const timers = timersOf(document);
  const timerTicks = timers.reduce(
    (total, timer) => total + timer.durationTicks,
    0,
  );
  const pulseNodes = document.nodes.filter(
    (node) => node.type === "pulseSource",
  );
  const travelTicks = Math.max(
    0,
    ...pulseNodes.map((node) =>
      node.type === "pulseSource" ? node.travelTicks : 0,
    ),
  );
  const cooldownTicks = Math.max(
    0,
    ...pulseNodes.map((node) =>
      node.type === "pulseSource" ? node.cooldownTicks : 0,
    ),
  );
  return Math.max(8, timerTicks + travelTicks + cooldownTicks + 8);
}

function isQuiescent(document: PuzzleDocument, run: PuzzleRunState): boolean {
  if (run.pulses.length > 0) return false;

  for (const timer of timersOf(document)) {
    if (run.nodes[timer.id]?.state === "running") return false;
  }
  for (const sourceId of pulseSourcesOf(document)) {
    if ((run.nodes[sourceId]?.remaining ?? 0) > 0) return false;
  }
  return true;
}

function settle(
  document: PuzzleDocument,
  runtime: PuzzleRuntime,
  world: World,
  maxTicks: number,
): SettleResult {
  for (let tick = 0; tick <= maxTicks; tick += 1) {
    if (runtime.isSolved()) return { solved: true, capped: false };
    if (isQuiescent(document, runtime.snapshot())) {
      return { solved: false, capped: false };
    }
    runtime.tickResult(worldSnapshot(document, world));
  }
  return { solved: runtime.isSolved(), capped: !runtime.isSolved() };
}

/**
 * Build the reachable stable-state graph and mark every state that can reach a
 * solved transition. States that cannot are the recoverability failures.
 */
export function findUnrecoverableStates(
  document: PuzzleDocument,
  options: RecoverabilityOptions = {},
): RecoverabilityResult {
  const maxStates = options.maxStates ?? 10_000;
  const maxSettleTicks = options.maxSettleTicks ?? settleBudget(document);
  const actions = actionsFor(document);

  const initialRuntime = new PuzzleRuntime(document);
  const initialWorld = startingWorld(document);
  const states: SearchNode[] = [
    { run: initialRuntime.snapshot(), world: initialWorld },
  ];
  const index = new Map<string, number>([
    [canonicalKey(states[0].run, states[0].world), 0],
  ]);
  const edges: number[][] = [[]];
  const solves: boolean[] = [false];
  let capped = false;

  for (let head = 0; head < states.length; head += 1) {
    if (states.length >= maxStates) {
      capped = true;
      break;
    }
    const state = states[head];
    for (const action of actions) {
      if (isNoop(action, state.world)) continue;

      const runtime = new PuzzleRuntime(document);
      runtime.restore(state.run);
      if (action.pulseSource && !runtime.usePulse(action.pulseSource, "p1")) {
        continue;
      }

      const world = action.pulseSource
        ? state.world
        : applyAction(state.world, action);
      const first = runtime.tickResult(worldSnapshot(document, world));
      if (first.solvedNow || runtime.isSolved()) {
        solves[head] = true;
        continue;
      }

      const settled = settle(document, runtime, world, maxSettleTicks);
      if (settled.capped) {
        capped = true;
        continue;
      }
      if (settled.solved) {
        solves[head] = true;
        continue;
      }

      const nextRun = runtime.snapshot();
      const key = canonicalKey(nextRun, world);
      let next = index.get(key);
      if (next === undefined) {
        if (states.length >= maxStates) {
          capped = true;
          break;
        }
        next = states.length;
        index.set(key, next);
        states.push({ run: nextRun, world });
        edges.push([]);
        solves.push(false);
      }
      if (!edges[head].includes(next)) {
        edges[head].push(next);
      }
    }
    if (capped) break;
  }

  const reverse: number[][] = states.map(() => []);
  edges.forEach((outgoing, from) => {
    for (const to of outgoing) {
      reverse[to].push(from);
    }
  });

  const canReachSolved = solves.slice();
  const queue: number[] = [];
  for (let state = 0; state < canReachSolved.length; state += 1) {
    if (canReachSolved[state]) queue.push(state);
  }
  for (let cursor = 0; cursor < queue.length; cursor += 1) {
    const state = queue[cursor];
    for (const predecessor of reverse[state]) {
      if (canReachSolved[predecessor]) continue;
      canReachSolved[predecessor] = true;
      queue.push(predecessor);
    }
  }

  const dead = canReachSolved
    .map((reaches, state) => (reaches ? null : state))
    .filter((state): state is number => state !== null)
    .map((state) => describeState(states[state]));

  return {
    states: states.length,
    solvedStates: solves.filter(Boolean).length,
    capped,
    dead,
  };
}
