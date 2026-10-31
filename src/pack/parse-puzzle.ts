import { err, ok, type Result } from "../core/result";
import {
  validatePuzzleDocument,
  type PuzzleDocument,
  type PuzzleLink,
  type PuzzleLinkType,
  type PuzzleNode,
  type PuzzleNodeType,
  type PuzzlePoint,
  type PuzzlePredicate,
  type PuzzleRect,
  type PuzzleRewards,
  type PuzzleSolutionAction,
  type TetherPolicy,
} from "../puzzle";
import {
  isRecord,
  isSchemaVersionSupported,
  readBoolean,
  readInteger,
  readNonEmptyString,
  readNumber,
  readOptionalString,
  readStringArray,
  type UnknownRecord,
} from "./parse-common";

const CODE = "PUZZLE_SCHEMA_INVALID";

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
  "clear",
];

const PROP_STATES = ["free", "carried", "placed", "docked", "cleared"] as const;

function readOptionalBoolean(
  record: UnknownRecord,
  key: string,
  code: string,
  label: string,
  fallback: boolean,
): Result<boolean> {
  if (record[key] === undefined) return ok(fallback);
  return readBoolean(record, key, code, label);
}

function parseRect(
  value: unknown,
  label: string,
  code: string,
): Result<PuzzleRect> {
  if (!isRecord(value)) {
    return err(`${code}: ${label} must be an object`);
  }
  const x = readNumber(value, "x", code, `${label}.x`);
  if (!x.ok) return err(x.error);
  const y = readNumber(value, "y", code, `${label}.y`);
  if (!y.ok) return err(y.error);
  const width = readNumber(value, "width", code, `${label}.width`);
  if (!width.ok) return err(width.error);
  const height = readNumber(value, "height", code, `${label}.height`);
  if (!height.ok) return err(height.error);
  if (width.value <= 0 || height.value <= 0) {
    return err(`${code}: ${label} width/height must be positive`);
  }
  return ok({ x: x.value, y: y.value, width: width.value, height: height.value });
}

function parsePoint(
  value: unknown,
  label: string,
  code: string,
): Result<PuzzlePoint> {
  if (!isRecord(value)) {
    return err(`${code}: ${label} must be an object`);
  }
  const x = readNumber(value, "x", code, `${label}.x`);
  if (!x.ok) return err(x.error);
  const y = readNumber(value, "y", code, `${label}.y`);
  if (!y.ok) return err(y.error);
  return ok({ x: x.value, y: y.value });
}

function parsePredicate(
  value: unknown,
  label: string,
): Result<PuzzlePredicate> {
  const code = CODE;
  if (!isRecord(value)) {
    return err(`${code}: ${label} must be an object`);
  }
  const type = readNonEmptyString(value, "type", code, `${label}.type`);
  if (!type.ok) return err(type.error);

  const requiredId = (
    key: "gateId" | "receptorId" | "plateId" | "relayId" | "timerId" | "counterId" | "zoneId" | "propId" | "flagId",
  ): Result<string> =>
    readNonEmptyString(value, key, code, `${label}.${key}`);

  switch (type.value) {
    case "gateOpen":
    case "receptorBound":
    case "platePressed":
    case "relayActive":
    case "timerElapsed":
    case "counterReached":
    case "zoneOccupied": {
      const key = {
        gateOpen: "gateId",
        receptorBound: "receptorId",
        platePressed: "plateId",
        relayActive: "relayId",
        timerElapsed: "timerId",
        counterReached: "counterId",
        zoneOccupied: "zoneId",
      }[type.value] as
        | "gateId"
        | "receptorId"
        | "plateId"
        | "relayId"
        | "timerId"
        | "counterId"
        | "zoneId";
      const id = requiredId(key);
      if (!id.ok) return err(id.error);
      return ok({ type: type.value, [key]: id.value } as PuzzlePredicate);
    }
    case "propState": {
      const propId = requiredId("propId");
      if (!propId.ok) return err(propId.error);
      const state = readNonEmptyString(value, "state", code, `${label}.state`);
      if (!state.ok) return err(state.error);
      if (!PROP_STATES.includes(state.value as (typeof PROP_STATES)[number])) {
        return err(`${code}: ${label}.state is not a prop state`);
      }
      return ok({
        type: "propState",
        propId: propId.value,
        state: state.value as (typeof PROP_STATES)[number],
      });
    }
    case "flagSet": {
      const flagId = requiredId("flagId");
      if (!flagId.ok) return err(flagId.error);
      return ok({ type: "flagSet", flagId: flagId.value });
    }
    case "allOf":
    case "anyOf": {
      if (!Array.isArray(value.of) || value.of.length === 0) {
        return err(`${code}: ${label}.of must be a non-empty array`);
      }
      const of: PuzzlePredicate[] = [];
      for (const [index, child] of value.of.entries()) {
        const parsed = parsePredicate(child, `${label}.of[${index}]`);
        if (!parsed.ok) return err(parsed.error);
        of.push(parsed.value);
      }
      return ok({ type: type.value, of });
    }
    case "not": {
      const child = parsePredicate(value.of, `${label}.of`);
      if (!child.ok) return err(child.error);
      return ok({ type: "not", of: child.value });
    }
    default:
      return err(`${code}: ${label}.type "${type.value}" is not supported`);
  }
}

function parseNode(
  value: unknown,
  index: number,
): Result<PuzzleNode> {
  const code = CODE;
  if (!isRecord(value)) {
    return err(`${code}: nodes[${index}] must be an object`);
  }
  const id = readNonEmptyString(value, "id", code, `nodes[${index}].id`);
  if (!id.ok) return err(id.error);
  const type = readNonEmptyString(value, "type", code, `nodes[${index}].type`);
  if (!type.ok) return err(type.error);
  if (!NODE_TYPES.includes(type.value as PuzzleNodeType)) {
    return err(`${code}: nodes[${index}].type "${type.value}" is not supported`);
  }

  const base = { id: id.value };
  switch (type.value) {
    case "prop": {
      const entityId = readNonEmptyString(value, "entityId", code, `nodes[${index}].entityId`);
      if (!entityId.ok) return err(entityId.error);
      const tags = readStringArray(value, "tags", code, `nodes[${index}].tags`);
      if (!tags.ok) return err(tags.error);
      const shape = readNonEmptyString(value, "shape", code, `nodes[${index}].shape`);
      if (!shape.ok) return err(shape.error);
      let spawn: PuzzlePoint | undefined;
      if (value.spawn !== undefined) {
        const point = parsePoint(value.spawn, `nodes[${index}].spawn`, code);
        if (!point.ok) return err(point.error);
        spawn = point.value;
      }
      return ok({
        ...base,
        type: "prop",
        entityId: entityId.value,
        tags: tags.value,
        shape: shape.value,
        ...(spawn ? { spawn } : {}),
      });
    }
    case "receptor": {
      if (!isRecord(value.accepts)) {
        return err(`${code}: nodes[${index}].accepts must be an object`);
      }
      const tag = readOptionalString(value.accepts, "tag", code, `nodes[${index}].accepts.tag`);
      if (!tag.ok) return err(tag.error);
      const shape = readOptionalString(value.accepts, "shape", code, `nodes[${index}].accepts.shape`);
      if (!shape.ok) return err(shape.error);
      if (!tag.value && !shape.value) {
        return err(`${code}: nodes[${index}].accepts needs tag or shape`);
      }
      const rect = parseRect(value.rect, `nodes[${index}].rect`, code);
      if (!rect.ok) return err(rect.error);
      const snap = parsePoint(value.snap, `nodes[${index}].snap`, code);
      if (!snap.ok) return err(snap.error);
      const entityId = readOptionalString(value, "entityId", code, `nodes[${index}].entityId`);
      if (!entityId.ok) return err(entityId.error);
      return ok({
        ...base,
        type: "receptor",
        accepts: {
          ...(tag.value ? { tag: tag.value } : {}),
          ...(shape.value ? { shape: shape.value } : {}),
        },
        rect: rect.value,
        snap: snap.value,
        ...(entityId.value ? { entityId: entityId.value } : {}),
      });
    }
    case "pulseSource": {
      const entityId = readNonEmptyString(value, "entityId", code, `nodes[${index}].entityId`);
      if (!entityId.ok) return err(entityId.error);
      if (value.ability !== "pulse") {
        return err(`${code}: nodes[${index}].ability must be "pulse"`);
      }
      const cooldown = readInteger(value, "cooldownTicks", code, `nodes[${index}].cooldownTicks`);
      if (!cooldown.ok) return err(cooldown.error);
      const travel = readInteger(value, "travelTicks", code, `nodes[${index}].travelTicks`);
      if (!travel.ok) return err(travel.error);
      const range = readNumber(value, "range", code, `nodes[${index}].range`);
      if (!range.ok) return err(range.error);
      if (cooldown.value < 0 || travel.value < 0 || range.value <= 0) {
        return err(`${code}: nodes[${index}] pulse timing/range is invalid`);
      }
      return ok({
        ...base,
        type: "pulseSource",
        entityId: entityId.value,
        ability: "pulse",
        cooldownTicks: cooldown.value,
        travelTicks: travel.value,
        range: range.value,
      });
    }
    case "plate":
    case "zone": {
      const rect = parseRect(value.rect, `nodes[${index}].rect`, code);
      if (!rect.ok) return err(rect.error);
      const detects = value.detects === undefined
        ? ok(["player", "prop"] as Array<"player" | "prop">)
        : readStringArray(value, "detects", code, `nodes[${index}].detects`);
      if (!detects.ok) return err(detects.error);
      if (
        detects.value.length === 0 ||
        detects.value.some((entry) => entry !== "player" && entry !== "prop")
      ) {
        return err(`${code}: nodes[${index}].detects must contain player and/or prop`);
      }
      const minimum = readInteger(value, "minimum", code, `nodes[${index}].minimum`);
      if (!minimum.ok) return err(minimum.error);
      const countCarried = readOptionalBoolean(value, "countCarried", code, `nodes[${index}].countCarried`, false);
      if (!countCarried.ok) return err(countCarried.error);
      return ok({
        ...base,
        type: type.value as "plate" | "zone",
        rect: rect.value,
        detects: detects.value as Array<"player" | "prop">,
        minimum: minimum.value,
        countCarried: countCarried.value,
      });
    }
    case "relay": {
      const mode = readNonEmptyString(value, "mode", code, `nodes[${index}].mode`);
      if (!mode.ok) return err(mode.error);
      if (mode.value !== "allOf" && mode.value !== "anyOf" && mode.value !== "not") {
        return err(`${code}: nodes[${index}].mode is invalid`);
      }
      return ok({ ...base, type: "relay", mode: mode.value });
    }
    case "gate": {
      const entityId = readOptionalString(value, "entityId", code, `nodes[${index}].entityId`);
      if (!entityId.ok) return err(entityId.error);
      const initial = value.initial === undefined
        ? ok("closed" as const)
        : readNonEmptyString(value, "initial", code, `nodes[${index}].initial`);
      if (!initial.ok) return err(initial.error);
      if (initial.value !== "open" && initial.value !== "closed") {
        return err(`${code}: nodes[${index}].initial is invalid`);
      }
      const latched = readOptionalBoolean(value, "latched", code, `nodes[${index}].latched`, true);
      if (!latched.ok) return err(latched.error);
      return ok({
        ...base,
        type: "gate",
        initial: initial.value,
        latched: latched.value,
        ...(entityId.value ? { entityId: entityId.value } : {}),
      });
    }
    case "timer": {
      const duration = readInteger(value, "durationTicks", code, `nodes[${index}].durationTicks`);
      if (!duration.ok) return err(duration.error);
      if (duration.value <= 0) {
        return err(`${code}: nodes[${index}].durationTicks must be positive`);
      }
      const repeat = readOptionalBoolean(value, "repeat", code, `nodes[${index}].repeat`, false);
      if (!repeat.ok) return err(repeat.error);
      return ok({
        ...base,
        type: "timer",
        durationTicks: duration.value,
        repeat: repeat.value,
      });
    }
    case "counter": {
      const target = readInteger(value, "target", code, `nodes[${index}].target`);
      if (!target.ok) return err(target.error);
      const comparison = readOptionalString(value, "comparison", code, `nodes[${index}].comparison`);
      if (!comparison.ok) return err(comparison.error);
      const mode = comparison.value ?? "==";
      if (mode !== "==" && mode !== ">=") {
        return err(`${code}: nodes[${index}].comparison is invalid`);
      }
      return ok({
        ...base,
        type: "counter",
        target: target.value,
        comparison: mode,
      });
    }
    case "trigger": {
      const once = readOptionalBoolean(value, "once", code, `nodes[${index}].once`, true);
      if (!once.ok) return err(once.error);
      return ok({ ...base, type: "trigger", once: once.value });
    }
    default:
      return err(`${code}: nodes[${index}].type "${type.value}" is not supported`);
  }
}

function parseLink(value: unknown, index: number): Result<PuzzleLink> {
  const code = CODE;
  if (!isRecord(value)) {
    return err(`${code}: links[${index}] must be an object`);
  }
  const from = readNonEmptyString(value, "from", code, `links[${index}].from`);
  if (!from.ok) return err(from.error);
  const to = readNonEmptyString(value, "to", code, `links[${index}].to`);
  if (!to.ok) return err(to.error);
  const type = readNonEmptyString(value, "type", code, `links[${index}].type`);
  if (!type.ok) return err(type.error);
  if (!LINK_TYPES.includes(type.value as PuzzleLinkType)) {
    return err(`${code}: links[${index}].type "${type.value}" is not supported`);
  }
  return ok({ from: from.value, to: to.value, type: type.value as PuzzleLinkType });
}

function parseSolutionAction(
  value: unknown,
  index: number,
): Result<PuzzleSolutionAction> {
  const code = CODE;
  if (!isRecord(value)) {
    return err(`${code}: solution[${index}] must be an object`);
  }
  const action = readNonEmptyString(value, "action", code, `solution[${index}].action`);
  if (!action.ok) return err(action.error);

  switch (action.value) {
    case "move": {
      const actor = readNonEmptyString(value, "actor", code, `solution[${index}].actor`);
      if (!actor.ok) return err(actor.error);
      const x = readNumber(value, "x", code, `solution[${index}].x`);
      if (!x.ok) return err(x.error);
      const y = readNumber(value, "y", code, `solution[${index}].y`);
      if (!y.ok) return err(y.error);
      return ok({ action: "move", actor: actor.value, x: x.value, y: y.value });
    }
    case "wait": {
      const ticks = readInteger(value, "ticks", code, `solution[${index}].ticks`);
      if (!ticks.ok) return err(ticks.error);
      if (ticks.value < 0) {
        return err(`${code}: solution[${index}].ticks must be non-negative`);
      }
      return ok({ action: "wait", ticks: ticks.value });
    }
    case "reset":
      return ok({ action: "reset" });
    case "scan": {
      const actor = readNonEmptyString(value, "actor", code, `solution[${index}].actor`);
      if (!actor.ok) return err(actor.error);
      const target = readOptionalString(value, "target", code, `solution[${index}].target`);
      if (!target.ok) return err(target.error);
      return ok({
        action: "scan",
        actor: actor.value,
        ...(target.value ? { target: target.value } : {}),
      });
    }
    case "pickup":
    case "drop":
    case "place":
    case "throw":
    case "pulse": {
      const actor = readNonEmptyString(value, "actor", code, `solution[${index}].actor`);
      if (!actor.ok) return err(actor.error);
      const target = readNonEmptyString(value, "target", code, `solution[${index}].target`);
      if (!target.ok) return err(target.error);
      return ok({
        action: action.value as "pickup" | "drop" | "place" | "throw" | "pulse",
        actor: actor.value,
        target: target.value,
      });
    }
    default:
      return err(`${code}: solution[${index}].action "${action.value}" is not supported`);
  }
}

function parseRewards(value: unknown): Result<PuzzleRewards> {
  const code = CODE;
  if (value === undefined) return ok({});
  if (!isRecord(value)) return err(`${code}: rewards must be an object`);
  const rewards: PuzzleRewards = {};
  for (const key of ["abilities", "flags", "mapNodes"] as const) {
    if (value[key] === undefined) continue;
    const list = readStringArray(value, key, code, `rewards.${key}`, {
      allowEmpty: true,
    });
    if (!list.ok) return err(list.error);
    rewards[key] = list.value;
  }
  return ok(rewards);
}

export function parsePuzzle(value: unknown): Result<PuzzleDocument> {
  if (!isRecord(value)) {
    return err(`${CODE}: puzzle must be an object`);
  }
  if (!isSchemaVersionSupported(value.schemaVersion)) {
    return err(
      `${CODE}: unsupported schemaVersion ${String(value.schemaVersion)}`,
    );
  }
  const id = readNonEmptyString(value, "id", CODE);
  if (!id.ok) return err(id.error);
  const title = readNonEmptyString(value, "title", CODE);
  if (!title.ok) return err(title.error);
  const objectiveIds = readStringArray(value, "objectiveIds", CODE);
  if (!objectiveIds.ok) return err(objectiveIds.error);
  const conceptIds = readStringArray(value, "conceptIds", CODE, "conceptIds", {
    allowEmpty: true,
  });
  if (!conceptIds.ok) return err(conceptIds.error);

  if (!isRecord(value.activation)) {
    return err(`${CODE}: activation must be an object`);
  }
  const mode = readNonEmptyString(value.activation, "mode", CODE, "activation.mode");
  if (!mode.ok) return err(mode.error);
  if (mode.value !== "roomStart" && mode.value !== "zoneEnter" && mode.value !== "interact") {
    return err(`${CODE}: activation.mode is invalid`);
  }
  const zoneId = readOptionalString(value.activation, "zoneId", CODE, "activation.zoneId");
  if (!zoneId.ok) return err(zoneId.error);
  const activationEntityId = readOptionalString(value.activation, "entityId", CODE, "activation.entityId");
  if (!activationEntityId.ok) return err(activationEntityId.error);

  const tetherValue = value.tether === undefined
    ? ok("normal" as TetherPolicy)
    : readNonEmptyString(value, "tether", CODE, "tether");
  if (!tetherValue.ok) return err(tetherValue.error);
  if (!["normal", "stretch", "off"].includes(tetherValue.value)) {
    return err(`${CODE}: tether is invalid`);
  }

  if (!Array.isArray(value.nodes) || value.nodes.length === 0) {
    return err(`${CODE}: nodes must be a non-empty array`);
  }
  const nodes: PuzzleNode[] = [];
  for (const [index, raw] of value.nodes.entries()) {
    const node = parseNode(raw, index);
    if (!node.ok) return err(node.error);
    nodes.push(node.value);
  }

  if (!Array.isArray(value.links)) {
    return err(`${CODE}: links must be an array`);
  }
  const links: PuzzleLink[] = [];
  for (const [index, raw] of value.links.entries()) {
    const link = parseLink(raw, index);
    if (!link.ok) return err(link.error);
    links.push(link.value);
  }

  const win = parsePredicate(value.win, "win");
  if (!win.ok) return err(win.error);

  if (!isRecord(value.reset)) {
    return err(`${CODE}: reset must be an object`);
  }
  const resetProps = value.reset.props === undefined
    ? ok([])
    : readStringArray(value.reset, "props", CODE, "reset.props", { allowEmpty: true });
  if (!resetProps.ok) return err(resetProps.error);
  const resetNodes = value.reset.nodes === undefined
    ? ok([])
    : readStringArray(value.reset, "nodes", CODE, "reset.nodes", { allowEmpty: true });
  if (!resetNodes.ok) return err(resetNodes.error);

  if (!isRecord(value.evidence)) {
    return err(`${CODE}: evidence must be an object`);
  }
  const onSolve = value.evidence.onSolve === undefined
    ? ok(["puzzle_solved"])
    : readStringArray(value.evidence, "onSolve", CODE, "evidence.onSolve", { allowEmpty: true });
  if (!onSolve.ok) return err(onSolve.error);
  const counters = value.evidence.counters === undefined
    ? ok([])
    : readStringArray(value.evidence, "counters", CODE, "evidence.counters", { allowEmpty: true });
  if (!counters.ok) return err(counters.error);

  const rewards = parseRewards(value.rewards);
  if (!rewards.ok) return err(rewards.error);

  if (!Array.isArray(value.solution)) {
    return err(`${CODE}: solution must be an array`);
  }
  const solution: PuzzleSolutionAction[] = [];
  for (const [index, raw] of value.solution.entries()) {
    const action = parseSolutionAction(raw, index);
    if (!action.ok) return err(action.error);
    solution.push(action.value);
  }

  const hints = value.hints === undefined
    ? ok([])
    : readStringArray(value, "hints", CODE, "hints", { allowEmpty: true });
  if (!hints.ok) return err(hints.error);

  const document: PuzzleDocument = {
    schemaVersion: value.schemaVersion,
    id: id.value,
    title: title.value,
    objectiveIds: objectiveIds.value,
    conceptIds: conceptIds.value,
    activation: {
      mode: mode.value,
      ...(zoneId.value ? { zoneId: zoneId.value } : {}),
      ...(activationEntityId.value ? { entityId: activationEntityId.value } : {}),
    },
    tether: tetherValue.value as TetherPolicy,
    nodes,
    links,
    win: win.value,
    reset: { props: resetProps.value, nodes: resetNodes.value },
    evidence: { onSolve: onSolve.value, counters: counters.value },
    rewards: rewards.value,
    solution,
    hints: hints.value,
  };

  const validation = validatePuzzleDocument(document);
  if (!validation.ok) {
    return err(
      `${CODE}: ${validation.issues
        .slice(0, 3)
        .map((issue) => `${issue.code} ${issue.message}`)
        .join("; ")}`,
    );
  }
  return ok(document);
}
