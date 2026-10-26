import type {
  PuzzleDocument,
  PuzzleLink,
  PuzzleLinkType,
  PuzzleNode,
  PuzzleNodeType,
  PuzzlePoint,
  PuzzlePredicate,
  PuzzleRect,
  PuzzleValidationIssue,
  PuzzleValidationResult,
} from "./types";

/**
 * Extra geometry the pack validator can supply. The pure puzzle contract does
 * not own room entities, so the one-screen `off` guard is checked only when
 * this context is present.
 */
export interface PuzzleValidationContext {
  entityPoints?: Readonly<Record<string, PuzzlePoint>>;
  viewport?: { width: number; height: number };
}

const NODE_TYPES: readonly PuzzleNodeType[] = [
  "prop",
  "receptor",
  "pulseSource",
  "plate",
  "relay",
  "gate",
  "timer",
  "counter",
  "zone",
  "trigger",
];

const LINK_TYPES: readonly PuzzleLinkType[] = [
  "pulse",
  "bind",
  "press",
  "release",
  "enter",
  "exit",
  "increment",
  "start",
  "stop",
  "reset",
  "elapsed",
  "reached",
  "activate",
  "deactivate",
  "open",
  "close",
];

const SOURCE_TYPES: Record<PuzzleLinkType, readonly PuzzleNodeType[]> = {
  pulse: ["pulseSource"],
  bind: ["receptor"],
  press: ["plate"],
  release: ["plate"],
  enter: ["zone", "trigger"],
  exit: ["zone"],
  increment: ["plate", "zone", "trigger", "receptor", "timer", "counter", "relay"],
  start: ["plate", "zone", "trigger", "receptor", "timer", "counter", "relay"],
  stop: ["plate", "zone", "trigger", "receptor", "timer", "counter", "relay"],
  reset: ["plate", "zone", "trigger", "receptor", "timer", "counter", "relay"],
  elapsed: ["timer"],
  reached: ["counter"],
  activate: NODE_TYPES,
  deactivate: NODE_TYPES,
  open: NODE_TYPES,
  close: NODE_TYPES,
};

const TARGET_TYPES: Record<PuzzleLinkType, readonly PuzzleNodeType[]> = {
  pulse: ["receptor"],
  bind: ["gate", "relay", "timer", "counter", "trigger"],
  press: ["gate", "relay", "timer", "counter", "trigger"],
  release: ["gate", "relay", "timer", "counter", "trigger"],
  enter: ["gate", "relay", "timer", "counter", "trigger"],
  exit: ["gate", "relay", "timer", "counter", "trigger"],
  increment: ["counter"],
  start: ["timer"],
  stop: ["timer"],
  reset: ["timer", "counter"],
  elapsed: ["gate", "relay", "counter", "trigger"],
  reached: ["gate", "relay", "trigger"],
  activate: ["relay"],
  deactivate: ["relay"],
  open: ["gate"],
  close: ["gate"],
};

function issue(
  issues: PuzzleValidationIssue[],
  code: string,
  message: string,
): void {
  issues.push({ code, message });
}

function isRect(value: unknown): boolean {
  if (typeof value !== "object" || value === null) return false;
  const rect = value as Record<string, unknown>;
  return (
    typeof rect.x === "number" &&
    Number.isFinite(rect.x) &&
    typeof rect.y === "number" &&
    Number.isFinite(rect.y) &&
    typeof rect.width === "number" &&
    rect.width > 0 &&
    typeof rect.height === "number" &&
    rect.height > 0
  );
}

function validateNode(
  node: PuzzleNode,
  issues: PuzzleValidationIssue[],
): void {
  if (!NODE_TYPES.includes(node.type)) {
    issue(issues, "PUZZLE_NODE_TYPE", `${node.id}: unknown node type`);
    return;
  }

  switch (node.type) {
    case "prop":
      if (!node.entityId) {
        issue(issues, "PUZZLE_PROP_ENTITY", `${node.id}: prop needs entityId`);
      }
      if (!Array.isArray(node.tags) || node.tags.length === 0) {
        issue(issues, "PUZZLE_PROP_TAGS", `${node.id}: prop needs tags`);
      }
      if (typeof node.shape !== "string" || node.shape.trim() === "") {
        issue(issues, "PUZZLE_PROP_SHAPE", `${node.id}: prop needs shape`);
      }
      break;
    case "receptor":
      if (!isRect(node.rect)) {
        issue(issues, "PUZZLE_RECEPTOR_RECT", `${node.id}: invalid rect`);
      }
      if (
        typeof node.snap?.x !== "number" ||
        typeof node.snap?.y !== "number"
      ) {
        issue(issues, "PUZZLE_RECEPTOR_SNAP", `${node.id}: invalid snap point`);
      }
      break;
    case "pulseSource":
      if (!node.entityId) {
        issue(
          issues,
          "PUZZLE_PULSE_ENTITY",
          `${node.id}: pulseSource needs entityId`,
        );
      }
      if (node.ability !== "pulse") {
        issue(issues, "PUZZLE_PULSE_ABILITY", `${node.id}: ability must be pulse`);
      }
      if (
        !Number.isInteger(node.cooldownTicks) ||
        node.cooldownTicks < 0 ||
        !Number.isInteger(node.travelTicks) ||
        node.travelTicks < 0
      ) {
        issue(
          issues,
          "PUZZLE_PULSE_TIMING",
          `${node.id}: cooldownTicks and travelTicks must be non-negative integers`,
        );
      }
      if (!(node.range > 0)) {
        issue(issues, "PUZZLE_PULSE_RANGE", `${node.id}: range must be positive`);
      }
      break;
    case "plate":
    case "zone":
      if (!isRect(node.rect)) {
        issue(issues, "PUZZLE_SENSOR_RECT", `${node.id}: invalid rect`);
      }
      if (
        !Array.isArray(node.detects) ||
        node.detects.length === 0 ||
        node.detects.some((entry) => entry !== "player" && entry !== "prop")
      ) {
        issue(issues, "PUZZLE_SENSOR_DETECTS", `${node.id}: invalid detects`);
      }
      if (!Number.isInteger(node.minimum) || node.minimum < 0) {
        issue(
          issues,
          "PUZZLE_SENSOR_MINIMUM",
          `${node.id}: minimum must be a non-negative integer`,
        );
      }
      break;
    case "relay":
      if (!["allOf", "anyOf", "not"].includes(node.mode)) {
        issue(issues, "PUZZLE_RELAY_MODE", `${node.id}: invalid relay mode`);
      }
      break;
    case "gate":
      if (node.initial !== "open" && node.initial !== "closed") {
        issue(issues, "PUZZLE_GATE_INITIAL", `${node.id}: invalid initial state`);
      }
      break;
    case "timer":
      if (!Number.isInteger(node.durationTicks) || node.durationTicks <= 0) {
        issue(
          issues,
          "PUZZLE_TIMER_DURATION",
          `${node.id}: durationTicks must be positive`,
        );
      }
      break;
    case "counter":
      if (!Number.isInteger(node.target) || node.target < 0) {
        issue(
          issues,
          "PUZZLE_COUNTER_TARGET",
          `${node.id}: target must be a non-negative integer`,
        );
      }
      break;
    case "trigger":
      break;
    default:
      break;
  }
}

function validateLink(
  link: PuzzleLink,
  nodes: Map<string, PuzzleNode>,
  issues: PuzzleValidationIssue[],
): void {
  if (!LINK_TYPES.includes(link.type)) {
    issue(issues, "PUZZLE_LINK_TYPE", `${link.from}->${link.to}: unknown type`);
    return;
  }

  const source = nodes.get(link.from);
  const target = nodes.get(link.to);
  if (!source) {
    issue(issues, "PUZZLE_LINK_SOURCE", `${link.from}->${link.to}: missing source`);
    return;
  }
  if (!target) {
    issue(issues, "PUZZLE_LINK_TARGET", `${link.from}->${link.to}: missing target`);
    return;
  }

  if (!SOURCE_TYPES[link.type].includes(source.type)) {
    issue(
      issues,
      "PUZZLE_LINK_SOURCE_TYPE",
      `${link.from}->${link.to}: ${source.type} cannot emit ${link.type}`,
    );
  }
  if (!TARGET_TYPES[link.type].includes(target.type)) {
    issue(
      issues,
      "PUZZLE_LINK_TARGET_TYPE",
      `${link.from}->${link.to}: ${target.type} cannot receive ${link.type}`,
    );
  }
}

function validatePredicate(
  predicate: PuzzlePredicate,
  nodes: Map<string, PuzzleNode>,
  issues: PuzzleValidationIssue[],
): void {
  switch (predicate.type) {
    case "gateOpen":
      if (nodes.get(predicate.gateId)?.type !== "gate") {
        issue(issues, "PUZZLE_WIN_GATE", `unknown gate ${predicate.gateId}`);
      }
      break;
    case "receptorBound":
      if (nodes.get(predicate.receptorId)?.type !== "receptor") {
        issue(
          issues,
          "PUZZLE_WIN_RECEPTOR",
          `unknown receptor ${predicate.receptorId}`,
        );
      }
      break;
    case "platePressed":
      if (nodes.get(predicate.plateId)?.type !== "plate") {
        issue(issues, "PUZZLE_WIN_PLATE", `unknown plate ${predicate.plateId}`);
      }
      break;
    case "relayActive":
      if (nodes.get(predicate.relayId)?.type !== "relay") {
        issue(issues, "PUZZLE_WIN_RELAY", `unknown relay ${predicate.relayId}`);
      }
      break;
    case "timerElapsed":
      if (nodes.get(predicate.timerId)?.type !== "timer") {
        issue(issues, "PUZZLE_WIN_TIMER", `unknown timer ${predicate.timerId}`);
      }
      break;
    case "counterReached":
      if (nodes.get(predicate.counterId)?.type !== "counter") {
        issue(
          issues,
          "PUZZLE_WIN_COUNTER",
          `unknown counter ${predicate.counterId}`,
        );
      }
      break;
    case "zoneOccupied":
      if (nodes.get(predicate.zoneId)?.type !== "zone") {
        issue(issues, "PUZZLE_WIN_ZONE", `unknown zone ${predicate.zoneId}`);
      }
      break;
    case "propState":
      if (nodes.get(predicate.propId)?.type !== "prop") {
        issue(issues, "PUZZLE_WIN_PROP", `unknown prop ${predicate.propId}`);
      }
      break;
    case "flagSet":
      break;
    case "allOf":
    case "anyOf":
      if (predicate.of.length === 0) {
        issue(issues, "PUZZLE_WIN_EMPTY", `${predicate.type} cannot be empty`);
      }
      for (const child of predicate.of) {
        validatePredicate(child, nodes, issues);
      }
      break;
    case "not":
      validatePredicate(predicate.of, nodes, issues);
      break;
    default:
      issue(issues, "PUZZLE_WIN_TYPE", "unknown win predicate");
      break;
  }
}

function validateRelayCycles(
  links: readonly PuzzleLink[],
  nodes: Map<string, PuzzleNode>,
  issues: PuzzleValidationIssue[],
): void {
  const relayIds = new Set(
    [...nodes.values()]
      .filter((node) => node.type === "relay")
      .map((node) => node.id),
  );
  const edges = new Map<string, string[]>();
  for (const id of relayIds) edges.set(id, []);
  for (const link of links) {
    if (link.type !== "activate" && link.type !== "deactivate") continue;
    if (!relayIds.has(link.from) || !relayIds.has(link.to)) continue;
    edges.get(link.from)?.push(link.to);
  }

  const visiting = new Set<string>();
  const visited = new Set<string>();

  const visit = (id: string): boolean => {
    if (visiting.has(id)) return true;
    if (visited.has(id)) return false;
    visiting.add(id);
    for (const next of edges.get(id) ?? []) {
      if (visit(next)) return true;
    }
    visiting.delete(id);
    visited.add(id);
    return false;
  };

  for (const id of relayIds) {
    if (visit(id)) {
      issue(
        issues,
        "PUZZLE_RELAY_CYCLE",
        `relay cycle includes ${id}`,
      );
      return;
    }
  }
}

function validateSolution(
  document: PuzzleDocument,
  nodes: Map<string, PuzzleNode>,
  issues: PuzzleValidationIssue[],
): void {
  for (const [index, action] of document.solution.entries()) {
    if (action.action === "move") {
      if (!Number.isFinite(action.x) || !Number.isFinite(action.y)) {
        issue(
          issues,
          "PUZZLE_SOLUTION_MOVE",
          `solution[${index}]: move needs numeric x/y`,
        );
      }
      continue;
    }
    if (action.action === "wait") {
      if (!Number.isInteger(action.ticks) || action.ticks < 0) {
        issue(
          issues,
          "PUZZLE_SOLUTION_WAIT",
          `solution[${index}]: wait needs a non-negative integer`,
        );
      }
      continue;
    }
    if (action.action === "reset") continue;
    if (action.action === "scan") continue;

    const target = nodes.get(action.target);
    if (!target) {
      issue(
        issues,
        "PUZZLE_SOLUTION_TARGET",
        `solution[${index}]: unknown target ${action.target}`,
      );
      continue;
    }
    if (
      (action.action === "pickup" ||
        action.action === "drop" ||
        action.action === "throw") &&
      target.type !== "prop"
    ) {
      issue(
        issues,
        "PUZZLE_SOLUTION_PROP",
        `solution[${index}]: ${action.action} target must be a prop`,
      );
    }
    if (action.action === "place" && target.type !== "receptor") {
      issue(
        issues,
        "PUZZLE_SOLUTION_RECEPTOR",
        `solution[${index}]: place target must be a receptor`,
      );
    }
    if (action.action === "pulse" && target.type !== "pulseSource") {
      issue(
        issues,
        "PUZZLE_SOLUTION_PULSE",
        `solution[${index}]: pulse target must be a pulseSource`,
      );
    }
  }
}

function validateActivation(
  document: PuzzleDocument,
  nodes: Map<string, PuzzleNode>,
  issues: PuzzleValidationIssue[],
): void {
  const activation = document.activation;
  if (!activation) {
    issue(issues, "PUZZLE_ACTIVATION", "activation is required");
    return;
  }

  if (activation.mode === "zoneEnter") {
    if (!activation.zoneId) {
      issue(
        issues,
        "PUZZLE_ACTIVATION_ZONE",
        "zoneEnter activation needs a zoneId",
      );
      return;
    }
    if (nodes.get(activation.zoneId)?.type !== "zone") {
      issue(
        issues,
        "PUZZLE_ACTIVATION_ZONE",
        `zoneEnter activation references unknown zone ${activation.zoneId}`,
      );
    }
  }

  if (activation.mode === "interact" && !activation.entityId) {
    issue(
      issues,
      "PUZZLE_ACTIVATION_ENTITY",
      "interact activation needs an entityId",
    );
  }
}

function addRectPoints(points: PuzzlePoint[], rect: PuzzleRect): void {
  points.push(
    { x: rect.x, y: rect.y },
    { x: rect.x + rect.width, y: rect.y + rect.height },
  );
}

function validateTetherSpan(
  document: PuzzleDocument,
  context: PuzzleValidationContext | undefined,
  issues: PuzzleValidationIssue[],
): void {
  if (document.tether !== "off" || !context?.viewport) return;

  const points: PuzzlePoint[] = [];
  for (const node of document.nodes) {
    if (node.entityId) {
      const point = context.entityPoints?.[node.entityId];
      if (point) points.push(point);
    }
    switch (node.type) {
      case "prop":
        if (node.spawn) points.push(node.spawn);
        break;
      case "receptor":
        addRectPoints(points, node.rect);
        points.push(node.snap);
        break;
      case "plate":
      case "zone":
        addRectPoints(points, node.rect);
        break;
      default:
        break;
    }
  }

  if (points.length === 0) return;

  const xs = points.map((point) => point.x);
  const ys = points.map((point) => point.y);
  const width = Math.max(...xs) - Math.min(...xs);
  const height = Math.max(...ys) - Math.min(...ys);
  if (width > context.viewport.width || height > context.viewport.height) {
    issue(
      issues,
      "PUZZLE_TETHER_SPAN",
      `tether "off" spans ${Math.round(width)} × ${Math.round(height)} px, larger than the ${context.viewport.width} × ${context.viewport.height} viewport`,
    );
  }
}

export function validatePuzzleDocument(
  document: PuzzleDocument,
  context?: PuzzleValidationContext,
): PuzzleValidationResult {
  const issues: PuzzleValidationIssue[] = [];

  if (!document.schemaVersion || !/^1\.\d+$/.test(document.schemaVersion)) {
    issue(
      issues,
      "PUZZLE_SCHEMA_VERSION",
      `unsupported schemaVersion ${String(document.schemaVersion)}`,
    );
  }
  if (!document.id || document.id.trim() === "") {
    issue(issues, "PUZZLE_ID", "puzzle id is required");
  }
  if (!document.title || document.title.trim() === "") {
    issue(issues, "PUZZLE_TITLE", "puzzle title is required");
  }
  if (
    !document.activation ||
    !["roomStart", "zoneEnter", "interact"].includes(document.activation.mode)
  ) {
    issue(issues, "PUZZLE_ACTIVATION", "invalid activation mode");
  }
  if (!["normal", "stretch", "off"].includes(document.tether)) {
    issue(issues, "PUZZLE_TETHER", "invalid tether policy");
  }
  if (!Array.isArray(document.nodes) || document.nodes.length === 0) {
    issue(issues, "PUZZLE_NODES", "puzzle needs at least one node");
    return { ok: false, issues };
  }
  if (!Array.isArray(document.links)) {
    issue(issues, "PUZZLE_LINKS", "links must be an array");
    return { ok: false, issues };
  }

  const nodes = new Map<string, PuzzleNode>();
  for (const node of document.nodes) {
    if (!node.id || node.id.trim() === "") {
      issue(issues, "PUZZLE_NODE_ID", "node id is required");
      continue;
    }
    if (nodes.has(node.id)) {
      issue(issues, "PUZZLE_NODE_DUPLICATE", `duplicate node id ${node.id}`);
      continue;
    }
    nodes.set(node.id, node);
    validateNode(node, issues);
  }

  validateActivation(document, nodes, issues);
  validateTetherSpan(document, context, issues);

  const seenLinks = new Set<string>();
  for (const link of document.links) {
    validateLink(link, nodes, issues);
    const key = `${link.from}>${link.to}:${link.type}`;
    if (seenLinks.has(key)) {
      issue(issues, "PUZZLE_LINK_DUPLICATE", `duplicate link ${key}`);
    }
    seenLinks.add(key);
  }

  validatePredicate(document.win, nodes, issues);
  validateRelayCycles(document.links, nodes, issues);

  for (const propId of document.reset.props) {
    if (nodes.get(propId)?.type !== "prop") {
      issue(issues, "PUZZLE_RESET_PROP", `reset.prop ${propId} is not a prop`);
    }
  }
  for (const nodeId of document.reset.nodes) {
    if (!nodes.has(nodeId)) {
      issue(issues, "PUZZLE_RESET_NODE", `reset.node ${nodeId} is missing`);
    }
  }

  const counters = new Set<string>();
  for (const counter of document.evidence.counters) {
    if (counters.has(counter)) {
      issue(issues, "PUZZLE_EVIDENCE_DUPLICATE", `duplicate counter ${counter}`);
    }
    counters.add(counter);
  }

  validateSolution(document, nodes, issues);

  return { ok: issues.length === 0, issues };
}

export function assertValidPuzzle(document: PuzzleDocument): void {
  const result = validatePuzzleDocument(document);
  if (!result.ok) {
    throw new Error(
      `PUZZLE_INVALID: ${result.issues
        .map((entry) => `${entry.code}: ${entry.message}`)
        .join("; ")}`,
    );
  }
}
