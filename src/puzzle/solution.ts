import { PuzzleRuntime } from "./runtime";
import type {
  PuzzleDocument,
  PuzzleEvent,
  PuzzleRunState,
  PuzzleSolutionAction,
  PuzzleWorldSnapshot,
  PropNode,
  PropRunState,
  ReceptorNode,
} from "./types";

const PLAYER_WIDTH = 28;
const PLAYER_HEIGHT = 44;
const PROP_WIDTH = 20;
const PROP_HEIGHT = 20;

interface MockPlayer {
  id: string;
  x: number;
  y: number;
  active: boolean;
}

interface MockProp {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  active: boolean;
  state: PropRunState;
  tags: string[];
  shape: string;
  carriedBy: string | null;
}

export interface SolutionReplayResult {
  ok: boolean;
  state: PuzzleRunState;
  events: PuzzleEvent[];
  error?: string;
}

function propNodes(document: PuzzleDocument): PropNode[] {
  return document.nodes.filter((node): node is PropNode => node.type === "prop");
}

function receptorNode(
  document: PuzzleDocument,
  id: string,
): ReceptorNode | undefined {
  return document.nodes.find(
    (node): node is ReceptorNode => node.type === "receptor" && node.id === id,
  );
}

function snapshot(
  players: MockPlayer[],
  props: MockProp[],
  tick: number,
  flags: Record<string, boolean>,
): PuzzleWorldSnapshot {
  return {
    tick,
    players: players.map((player) => ({
      id: player.id,
      x: player.x,
      y: player.y,
      width: PLAYER_WIDTH,
      height: PLAYER_HEIGHT,
      active: player.active,
    })),
    props: props.map((prop) => ({
      id: prop.id,
      x: prop.x,
      y: prop.y,
      width: prop.width,
      height: prop.height,
      active: prop.active,
      state: prop.state,
      tags: [...prop.tags],
      shape: prop.shape,
      carriedBy: prop.carriedBy,
    })),
    flags,
  };
}

function followCarriedProps(players: MockPlayer[], props: MockProp[]): void {
  for (const prop of props) {
    if (prop.state !== "carried" || !prop.carriedBy) continue;
    const carrier = players.find((player) => player.id === prop.carriedBy);
    if (!carrier) continue;
    prop.x = carrier.x;
    prop.y = carrier.y - 10;
  }
}

function applyAction(
  document: PuzzleDocument,
  runtime: PuzzleRuntime,
  players: MockPlayer[],
  props: MockProp[],
  action: PuzzleSolutionAction,
): void {
  switch (action.action) {
    case "move": {
      const player = players.find((entry) => entry.id === action.actor);
      if (!player) throw new Error(`unknown actor ${action.actor}`);
      player.x = action.x;
      player.y = action.y;
      break;
    }
    case "pickup": {
      const player = players.find((entry) => entry.id === action.actor);
      if (!player) throw new Error(`unknown actor ${action.actor}`);
      const prop = props.find((entry) => entry.id === action.target);
      if (!prop) throw new Error(`unknown prop ${action.target}`);
      prop.state = "carried";
      prop.carriedBy = player.id;
      prop.x = player.x;
      prop.y = player.y - 10;
      break;
    }
    case "drop": {
      const prop = props.find((entry) => entry.id === action.target);
      if (!prop) throw new Error(`unknown prop ${action.target}`);
      prop.state = "free";
      prop.carriedBy = null;
      break;
    }
    case "place": {
      const receptor = receptorNode(document, action.target);
      if (!receptor) throw new Error(`unknown receptor ${action.target}`);
      const prop = props.find((entry) => entry.carriedBy === action.actor);
      if (!prop) throw new Error(`actor ${action.actor} is not carrying a prop`);
      prop.state = "placed";
      prop.carriedBy = null;
      prop.x = receptor.snap.x;
      prop.y = receptor.snap.y;
      break;
    }
    case "throw": {
      const player = players.find((entry) => entry.id === action.actor);
      if (!player) throw new Error(`unknown actor ${action.actor}`);
      const prop = props.find((entry) => entry.id === action.target);
      if (!prop) throw new Error(`unknown prop ${action.target}`);
      prop.state = "free";
      prop.carriedBy = null;
      prop.x = player.x + 24;
      prop.y = player.y - 16;
      break;
    }
    case "pulse": {
      if (!runtime.usePulse(action.target, action.actor)) {
        throw new Error(`pulse ${action.target} is on cooldown or missing`);
      }
      break;
    }
    case "reset": {
      if (!runtime.reset()) {
        throw new Error("puzzle is solved and cannot reset");
      }
      break;
    }
    case "wait":
    case "scan":
      break;
    default:
      break;
  }
}

/**
 * Replays an authored solution trace against a mock world.
 *
 * This is not a proof of solvability. It is a deterministic reachability check:
 * the trace must reach the authored win predicate, which catches broken links,
 * impossible timings, and regressions in the graph evaluator.
 */
export function replaySolution(
  document: PuzzleDocument,
  options: { flags?: Record<string, boolean> } = {},
): SolutionReplayResult {
  const runtime = new PuzzleRuntime(document);
  const firstReceptor = document.nodes.find(
    (node): node is ReceptorNode => node.type === "receptor",
  );
  const props = propNodes(document).map((node): MockProp => {
    return {
      id: node.entityId,
      x: node.spawn?.x ?? firstReceptor?.snap.x ?? 0,
      y: node.spawn?.y ?? firstReceptor?.snap.y ?? 0,
      width: PROP_WIDTH,
      height: PROP_HEIGHT,
      active: true,
      state: "free",
      tags: [...node.tags],
      shape: node.shape,
      carriedBy: null,
    };
  });
  const players: MockPlayer[] = [
    { id: "p1", x: 0, y: 0, active: true },
    { id: "p2", x: 0, y: 0, active: true },
  ];
  const flags = options.flags ?? {};
  const events: PuzzleEvent[] = [];
  let solved = false;
  let error: string | undefined;

  const tickOnce = (): void => {
    followCarriedProps(players, props);
    const result = runtime.tickResult(
      snapshot(players, props, runtime.tick + 1, flags),
    );
    events.push(...result.events);
    for (const event of result.events) {
      if (event.type !== "propCleared" || !event.propId) continue;
      const node = document.nodes.find(
        (entry) => entry.type === "prop" && entry.id === event.propId,
      );
      const prop = props.find(
        (entry) => entry.id === (node?.entityId ?? event.propId),
      );
      if (prop) {
        prop.state = "cleared";
        prop.active = false;
        prop.carriedBy = null;
      }
    }
    if (result.solvedNow) solved = true;
  };

  try {
    for (const action of document.solution) {
      applyAction(document, runtime, players, props, action);
      if (action.action === "pulse") {
        const source = document.nodes.find(
          (node) => node.id === action.target && node.type === "pulseSource",
        );
        const travel = source?.type === "pulseSource" ? source.travelTicks : 1;
        for (let index = 0; index < travel + 2; index += 1) {
          tickOnce();
          if (solved) break;
        }
      } else if (action.action === "wait") {
        for (let index = 0; index < action.ticks; index += 1) {
          if (solved) break;
          tickOnce();
        }
      } else {
        tickOnce();
      }
      if (solved) break;
    }
  } catch (caught) {
    error = caught instanceof Error ? caught.message : String(caught);
  }

  if (!solved && !error) {
    error = "solution trace did not reach the win predicate";
  }

  return {
    ok: solved && !error,
    state: runtime.snapshot(),
    events,
    ...(error ? { error } : {}),
  };
}
