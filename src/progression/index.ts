import type {
  GateAnswer,
  GateDocument,
  GateEvaluation,
  LevelDocument,
} from "../pack";

/**
 * Everything the run has unlocked. The snapshot is plain JSON so it can be
 * saved, migrated, and asserted in tests without importing engine classes.
 */
export interface ProgressionSnapshot {
  abilities: string[];
  flags: Record<string, boolean>;
  solvedGates: string[];
  revealedNodes: string[];
  revealedEdges: string[];
}

export interface LevelGraphNode {
  id: string;
  order: number;
  next: string[];
}

export interface MapNodeView {
  id: string;
  label: string;
  x: number;
  y: number;
  levelId: string;
}

export interface MapEdgeView {
  id: string;
  from: string;
  to: string;
  type: string;
  gateId?: string;
}

export function createProgression(
  initial: Partial<ProgressionSnapshot> = {},
): ProgressionSnapshot {
  return {
    abilities: [...new Set(initial.abilities ?? [])],
    flags: { ...(initial.flags ?? {}) },
    solvedGates: [...new Set(initial.solvedGates ?? [])],
    revealedNodes: [...new Set(initial.revealedNodes ?? [])],
    revealedEdges: [...new Set(initial.revealedEdges ?? [])],
  };
}

export function hasAbility(
  state: ProgressionSnapshot,
  abilityId: string,
): boolean {
  return state.abilities.includes(abilityId);
}

/** Returns true when the ability was newly unlocked. */
export function unlockAbility(
  state: ProgressionSnapshot,
  abilityId: string,
): boolean {
  if (state.abilities.includes(abilityId)) return false;
  state.abilities.push(abilityId);
  return true;
}

export function setFlag(
  state: ProgressionSnapshot,
  flagId: string,
  value: boolean,
): void {
  state.flags[flagId] = value;
}

export function flagValue(
  state: ProgressionSnapshot,
  flagId: string,
): boolean {
  return state.flags[flagId] === true;
}

/** Returns true when the gate was newly solved. */
export function solveGate(
  state: ProgressionSnapshot,
  gateId: string,
): boolean {
  if (state.solvedGates.includes(gateId)) return false;
  state.solvedGates.push(gateId);
  return true;
}

export function isGateSolved(
  state: ProgressionSnapshot,
  gateId: string,
): boolean {
  return state.solvedGates.includes(gateId);
}

export function revealNode(
  state: ProgressionSnapshot,
  nodeId: string,
): boolean {
  if (state.revealedNodes.includes(nodeId)) return false;
  state.revealedNodes.push(nodeId);
  return true;
}

export function revealEdge(
  state: ProgressionSnapshot,
  edgeId: string,
): boolean {
  if (state.revealedEdges.includes(edgeId)) return false;
  state.revealedEdges.push(edgeId);
  return true;
}

export function edgeId(from: string, to: string): string {
  return `${from}->${to}`;
}

function arraysEqual(left: readonly string[], right: readonly string[]): boolean {
  return (
    left.length === right.length &&
    left.every((value, index) => value === right[index])
  );
}

/**
 * Compares a submitted answer with the gate's answer key. Wrong shape counts
 * as a wrong answer rather than throwing: gate UI data is user-facing input.
 */
export function evaluateGate(
  gate: GateDocument,
  answer: GateAnswer,
): GateEvaluation {
  const puzzle = gate.puzzle;
  if (!puzzle) {
    return { correct: false, reason: "GATE_HAS_NO_PUZZLE" };
  }

  switch (puzzle.type) {
    case "singleChoice": {
      const correct = typeof answer === "string" && answer === puzzle.answerId;
      return {
        correct,
        ...(correct ? {} : { reason: "GATE_ANSWER_INCORRECT", expected: puzzle.answerId }),
      };
    }
    case "sequence": {
      const submitted = Array.isArray(answer) ? answer : [];
      const correct = arraysEqual(submitted, puzzle.answer);
      return {
        correct,
        ...(correct ? {} : { reason: "GATE_ANSWER_INCORRECT", expected: puzzle.answer }),
      };
    }
    case "match": {
      const submitted =
        answer && !Array.isArray(answer) && typeof answer === "object"
          ? answer
          : {};
      const keys = Object.keys(puzzle.answer);
      const correct =
        Object.keys(submitted).length === keys.length &&
        keys.every((key) => submitted[key] === puzzle.answer[key]);
      return {
        correct,
        ...(correct ? {} : { reason: "GATE_ANSWER_INCORRECT", expected: puzzle.answer }),
      };
    }
    default:
      return { correct: false, reason: "GATE_PUZZLE_UNSUPPORTED" };
  }
}

/**
 * Gate types other than `concept` are state checks, not puzzles. The M1 level
 * uses a concept gate; the other branches keep the contract complete.
 */
export function gateIsOpen(
  gate: GateDocument,
  state: ProgressionSnapshot,
): boolean {
  switch (gate.type) {
    case "ability":
      return hasAbility(state, gate.id);
    case "flag":
      return flagValue(state, gate.id);
    case "concept":
      return isGateSolved(state, gate.id);
    default:
      return false;
  }
}

export function buildLevelGraph(
  levels: readonly LevelDocument[],
): Map<string, LevelGraphNode> {
  return new Map(
    levels.map((level) => [
      level.id,
      {
        id: level.id,
        order: level.order,
        next: [...level.nextLevelIds],
      },
    ]),
  );
}

/** Breadth-first reachability with deterministic ordering. */
export function reachableLevels(
  levels: readonly LevelDocument[],
  startLevelId: string,
): string[] {
  const graph = buildLevelGraph(levels);
  const reached: string[] = [];
  const queue = [startLevelId];

  while (queue.length > 0) {
    const id = queue.shift();
    if (id === undefined || reached.includes(id)) continue;
    if (!graph.has(id)) continue;
    reached.push(id);
    for (const next of graph.get(id)?.next ?? []) {
      if (!reached.includes(next)) queue.push(next);
    }
  }
  return reached;
}

export function mapNodes(levels: readonly LevelDocument[]): MapNodeView[] {
  return levels.map((level) => ({
    id: level.map.nodeId,
    label: level.map.label,
    x: level.map.x,
    y: level.map.y,
    levelId: level.id,
  }));
}

export function mapEdges(levels: readonly LevelDocument[]): MapEdgeView[] {
  return levels.flatMap((level) =>
    level.map.edges.map((edge) => ({
      id: `${level.map.nodeId}->${edge.to}`,
      from: level.map.nodeId,
      to: edge.to,
      type: edge.type,
      ...(edge.gateId ? { gateId: edge.gateId } : {}),
    })),
  );
}
