import { err, ok, type Result } from "../core/result";
import type {
  HostActionFeedback,
  HostActionReason,
  HostActionResult,
  HostControlDescriptor,
  HostControlMode,
  HostControlVerb,
} from "../game/host-run-port";

/** Wire mirror of the two player slots; the relay must not import the game. */
export type PlayerSlot = "p1" | "p2";

export type ControlMode = HostControlMode;
export type ControlVerb = HostControlVerb;
export type ActionResult = HostActionResult;
export type ActionReason = HostActionReason;
export type ControlDescriptor = HostControlDescriptor;
export type ActionFeedback = HostActionFeedback;

export interface NetUiActions {
  confirm: boolean;
  cancel: boolean;
  navigateUp: boolean;
  navigateDown: boolean;
  /** 1-based choice position, or null. */
  choose: number | null;
}

export const PROTOCOL_VERSION = 2;
export const MAX_CONTROLLER_MESSAGE_BYTES = 8 * 1024;
export const MAX_HOST_MESSAGE_BYTES = 128 * 1024;
export const MAX_INPUT_MESSAGES_PER_SECOND = 120;
export const HEARTBEAT_SECONDS = 25;
export const MAX_CONTROLLER_SLOTS = 2;
export const MAX_CONTROL_MESSAGE_BYTES = 2 * 1024;
export const MAX_CONTROL_MESSAGES_PER_SECOND = 10;
export const MAX_ACTION_MESSAGES_PER_SECOND = 20;

export type ErrorCode =
  | "BAD_MESSAGE"
  | "UNSUPPORTED_PROTOCOL"
  | "UNKNOWN_TYPE"
  | "VERSION_MISMATCH"
  | "ROOM_INVALID"
  | "ROOM_FULL"
  | "SLOT_UNAVAILABLE"
  | "SLOT_CLOSED"
  | "PEER_TIMEOUT"
  | "HOST_LEFT"
  | "CONTROLLER_LEFT"
  | "HOST_HIDDEN"
  | "SESSION_EXPIRED"
  | "DEVICE_REJECTED"
  | "SLOT_RESERVED"
  | "PROTOCOL_ERROR";

export interface ProtocolError {
  code: ErrorCode;
  message: string;
}

export type PauseReason =
  | "host-paused"
  | "host-hidden"
  | "controller-left"
  | "reconnecting";

export interface NetInputIntents {
  moveX: -1 | 0 | 1;
  jump: boolean;
  dash: boolean;
}

export interface NetInputActions {
  interact: boolean;
  scan: boolean;
  pulse: boolean;
  carry: boolean;
  throw: boolean;
  /** Presentation-only emote; optional on the wire for older controllers. */
  dance: boolean;
  ui: NetUiActions;
}

export interface NetInput {
  intents: NetInputIntents;
  actions: NetInputActions;
  clientTick: number;
}

interface Envelope {
  v: typeof PROTOCOL_VERSION;
}

export interface ControllerHelloMessage extends Envelope {
  t: "hello";
  role: "controller";
  slot: PlayerSlot;
  protocol: number;
  buildId: string;
}

export interface ControllerReadyMessage extends Envelope {
  t: "ready";
}

export interface ControllerInputMessage extends Envelope {
  t: "input";
  seq: number;
  input: NetInput;
}

export interface ControllerPingMessage extends Envelope {
  t: "ping";
  t0: number;
}

export interface ControllerWelcomeMessage extends Envelope {
  t: "welcome";
  sessionId: string;
  slot: PlayerSlot;
  heartbeatSeconds: number;
}

export interface ControllerPongMessage extends Envelope {
  t: "pong";
  t0: number;
}

export interface PauseMessage extends Envelope {
  t: "pause";
  reason: PauseReason;
}

export interface ResumeMessage extends Envelope {
  t: "resume";
  reason?: string;
}

export interface SessionEndMessage extends Envelope {
  t: "session-end";
  reason: string;
}

export interface ErrorMessage extends Envelope {
  t: "error";
  code: ErrorCode;
  message: string;
}

export interface HostHelloMessage extends Envelope {
  t: "host-hello";
  room: string;
  buildId: string;
  protocol: number;
  phoneSlots: PlayerSlot[];
}

export interface HostCloseSlotMessage extends Envelope {
  t: "close-slot";
  slot: PlayerSlot;
  reason?: string;
}

export interface HostPongMessage extends Envelope {
  t: "pong";
  slot: PlayerSlot;
  t0: number;
}

export interface HostControlMessage extends Envelope {
  t: "control";
  slot: PlayerSlot;
  control: ControlDescriptor;
}

export interface HostActionMessage extends Envelope {
  t: "action";
  slot: PlayerSlot;
  feedback: ActionFeedback;
}

export interface RoomSlotState {
  slot: PlayerSlot;
  connected: boolean;
  ready: boolean;
}

export interface RoomStateMessage extends Envelope {
  t: "room-state";
  slots: RoomSlotState[];
}

export interface RelayReadyMessage extends Envelope {
  t: "ready";
  slot: PlayerSlot;
}

export interface RelayInputMessage extends Envelope {
  t: "input";
  slot: PlayerSlot;
  seq: number;
  input: NetInput;
}

export interface RelayPingMessage extends Envelope {
  t: "ping";
  slot: PlayerSlot;
  t0: number;
}

export type ControllerClientMessage =
  | ControllerHelloMessage
  | ControllerReadyMessage
  | ControllerInputMessage
  | ControllerPingMessage;

export type ControllerServerMessage =
  | ControllerWelcomeMessage
  | ControllerPongMessage
  | HostControlMessage
  | HostActionMessage
  | PauseMessage
  | ResumeMessage
  | SessionEndMessage
  | ErrorMessage;

export type HostClientMessage =
  | HostHelloMessage
  | HostCloseSlotMessage
  | HostPongMessage
  | HostControlMessage
  | HostActionMessage
  | PauseMessage
  | ResumeMessage
  | SessionEndMessage;

export type HostServerMessage =
  | RoomStateMessage
  | RelayReadyMessage
  | RelayInputMessage
  | RelayPingMessage
  | SessionEndMessage
  | ErrorMessage;

export type ClientMessage = ControllerClientMessage | HostClientMessage;
export type ServerMessage = ControllerServerMessage | HostServerMessage;
export type ProtocolMessage = ClientMessage | ServerMessage;

const ERROR_CODES: ReadonlySet<string> = new Set<ErrorCode>([
  "BAD_MESSAGE",
  "UNSUPPORTED_PROTOCOL",
  "UNKNOWN_TYPE",
  "VERSION_MISMATCH",
  "ROOM_INVALID",
  "ROOM_FULL",
  "SLOT_UNAVAILABLE",
  "SLOT_CLOSED",
  "PEER_TIMEOUT",
  "HOST_LEFT",
  "CONTROLLER_LEFT",
  "HOST_HIDDEN",
  "SESSION_EXPIRED",
  "DEVICE_REJECTED",
  "SLOT_RESERVED",
  "PROTOCOL_ERROR",
]);

const PAUSE_REASONS: ReadonlySet<string> = new Set<PauseReason>([
  "host-paused",
  "host-hidden",
  "controller-left",
  "reconnecting",
]);

const CONTROL_MODES: ReadonlySet<string> = new Set<ControlMode>([
  "explore",
  "talk",
  "choice",
]);

const CONTROL_VERBS: ReadonlySet<string> = new Set<ControlVerb>([
  "jump",
  "dash",
  "interact",
  "scan",
  "pulse",
  "carry",
  "throw",
]);

const ACTION_RESULTS: ReadonlySet<string> = new Set<ActionResult>([
  "accepted",
  "rejected",
  "cooldown",
]);

const ACTION_REASONS: ReadonlySet<string> = new Set<ActionReason>([
  "out-of-range",
  "locked",
  "empty",
  "cooldown",
]);

const encoder = new TextEncoder();

function protocolError(
  code: ErrorCode,
  message: string,
): Result<never, ProtocolError> {
  return err({ code, message });
}

function bad(message: string): Result<never, ProtocolError> {
  return protocolError("BAD_MESSAGE", message);
}

function snapshotError(
  code: ErrorCode,
  message: string,
): ProtocolError {
  return { code, message };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function nonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function finiteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function nonNegativeInteger(value: unknown): value is number {
  return Number.isInteger(value) && (value as number) >= 0;
}

function booleanValue(value: unknown): value is boolean {
  return typeof value === "boolean";
}

export function isPlayerSlot(value: unknown): value is PlayerSlot {
  return value === "p1" || value === "p2";
}

function parseSlot(value: unknown): Result<PlayerSlot, ProtocolError> {
  return isPlayerSlot(value)
    ? ok(value)
    : bad("message slot must be p1 or p2");
}

export function parseNetInput(
  value: unknown,
): Result<NetInput, ProtocolError> {
  if (!isRecord(value)) return bad("input must be an object");

  const intents = value.intents;
  if (!isRecord(intents)) return bad("input.intents must be an object");
  if (
    intents.moveX !== -1 &&
    intents.moveX !== 0 &&
    intents.moveX !== 1
  ) {
    return bad("input.intents.moveX must be -1, 0, or 1");
  }
  if (
    !booleanValue(intents.jump) ||
    !booleanValue(intents.dash)
  ) {
    return bad("input.intents.jump and dash must be boolean");
  }

  const actions = value.actions;
  if (!isRecord(actions)) return bad("input.actions must be an object");
  for (const key of [
    "interact",
    "scan",
    "pulse",
    "carry",
    "throw",
  ] as const) {
    if (!booleanValue(actions[key])) {
      return bad(`input.actions.${key} must be boolean`);
    }
  }
  // `dance` was added after the initial controller release. Treat an absent
  // value as false so a host can still accept an older controller build.
  if (actions.dance !== undefined && !booleanValue(actions.dance)) {
    return bad("input.actions.dance must be boolean");
  }

  const ui = actions.ui;
  if (!isRecord(ui)) return bad("input.actions.ui must be an object");
  for (const key of [
    "confirm",
    "cancel",
    "navigateUp",
    "navigateDown",
  ] as const) {
    if (!booleanValue(ui[key])) {
      return bad(`input.actions.ui.${key} must be boolean`);
    }
  }
  if (
    ui.choose !== null &&
    (!Number.isInteger(ui.choose) ||
      (ui.choose as number) < 1 ||
      (ui.choose as number) > 5)
  ) {
    return bad("input.actions.ui.choose must be null or 1-5");
  }
  if (!nonNegativeInteger(value.clientTick)) {
    return bad("input.clientTick must be a non-negative integer");
  }

  return ok({
    intents: {
      moveX: intents.moveX,
      jump: intents.jump,
      dash: intents.dash,
    },
    actions: {
      interact: actions.interact === true,
      scan: actions.scan === true,
      pulse: actions.pulse === true,
      carry: actions.carry === true,
      throw: actions.throw === true,
      dance: actions.dance === true,
      ui: {
        confirm: ui.confirm === true,
        cancel: ui.cancel === true,
        navigateUp: ui.navigateUp === true,
        navigateDown: ui.navigateDown === true,
        choose: ui.choose as number | null,
      },
    },
    clientTick: value.clientTick,
  });
}

function parseSeq(value: unknown): Result<number, ProtocolError> {
  return nonNegativeInteger(value)
    ? ok(value)
    : bad("seq must be a non-negative integer");
}

function parseTime(value: unknown): Result<number, ProtocolError> {
  return finiteNumber(value) && value >= 0
    ? ok(value)
    : bad("time must be a non-negative finite number");
}

function parseControllerHello(
  value: Record<string, unknown>,
): Result<ControllerHelloMessage, ProtocolError> {
  if (value.role !== "controller") {
    return bad("hello.role must be controller");
  }
  const slot = parseSlot(value.slot);
  if (!slot.ok) return slot;
  if (!Number.isInteger(value.protocol) || (value.protocol as number) < 0) {
    return bad("hello.protocol must be a non-negative integer");
  }
  if (!nonEmptyString(value.buildId)) {
    return bad("hello.buildId must be a non-empty string");
  }
  return ok({
    v: PROTOCOL_VERSION,
    t: "hello",
    role: "controller",
    slot: slot.value,
    protocol: value.protocol as number,
    buildId: value.buildId,
  });
}

function parseWelcome(
  value: Record<string, unknown>,
): Result<ControllerWelcomeMessage, ProtocolError> {
  if (!nonEmptyString(value.sessionId)) {
    return bad("welcome.sessionId must be a non-empty string");
  }
  const slot = parseSlot(value.slot);
  if (!slot.ok) return slot;
  if (
    !Number.isInteger(value.heartbeatSeconds) ||
    (value.heartbeatSeconds as number) <= 0
  ) {
    return bad("welcome.heartbeatSeconds must be a positive integer");
  }
  return ok({
    v: PROTOCOL_VERSION,
    t: "welcome",
    sessionId: value.sessionId,
    slot: slot.value,
    heartbeatSeconds: value.heartbeatSeconds as number,
  });
}

function parsePause(
  value: Record<string, unknown>,
): Result<PauseMessage, ProtocolError> {
  if (typeof value.reason !== "string" || !PAUSE_REASONS.has(value.reason)) {
    return bad("pause.reason is not a known pause reason");
  }
  return ok({
    v: PROTOCOL_VERSION,
    t: "pause",
    reason: value.reason as PauseReason,
  });
}

function parseResume(
  value: Record<string, unknown>,
): Result<ResumeMessage, ProtocolError> {
  if (value.reason !== undefined && !nonEmptyString(value.reason)) {
    return bad("resume.reason must be a non-empty string when present");
  }
  return ok({
    v: PROTOCOL_VERSION,
    t: "resume",
    ...(value.reason !== undefined ? { reason: value.reason } : {}),
  });
}

function parseSessionEnd(
  value: Record<string, unknown>,
): Result<SessionEndMessage, ProtocolError> {
  if (!nonEmptyString(value.reason)) {
    return bad("session-end.reason must be a non-empty string");
  }
  return ok({
    v: PROTOCOL_VERSION,
    t: "session-end",
    reason: value.reason,
  });
}

function parseError(
  value: Record<string, unknown>,
): Result<ErrorMessage, ProtocolError> {
  if (typeof value.code !== "string" || !ERROR_CODES.has(value.code)) {
    return bad("error.code is not a known protocol error code");
  }
  if (!nonEmptyString(value.message)) {
    return bad("error.message must be a non-empty string");
  }
  return ok({
    v: PROTOCOL_VERSION,
    t: "error",
    code: value.code as ErrorCode,
    message: value.message,
  });
}

function parseHostHello(
  value: Record<string, unknown>,
): Result<HostHelloMessage, ProtocolError> {
  if (!nonEmptyString(value.room)) {
    return bad("host-hello.room must be a non-empty string");
  }
  if (!nonEmptyString(value.buildId)) {
    return bad("host-hello.buildId must be a non-empty string");
  }
  if (!Number.isInteger(value.protocol) || (value.protocol as number) < 0) {
    return bad("host-hello.protocol must be a non-negative integer");
  }
  if (!Array.isArray(value.phoneSlots)) {
    return bad("host-hello.phoneSlots must be an array");
  }
  if (value.phoneSlots.length === 0) {
    return bad("host-hello.phoneSlots must include at least one slot");
  }
  if (value.phoneSlots.length > MAX_CONTROLLER_SLOTS) {
    return bad("host-hello.phoneSlots exceeds the controller cap");
  }
  const phoneSlots: PlayerSlot[] = [];
  for (const rawSlot of value.phoneSlots) {
    const slot = parseSlot(rawSlot);
    if (!slot.ok) return slot;
    if (phoneSlots.includes(slot.value)) {
      return bad("host-hello.phoneSlots must be unique");
    }
    phoneSlots.push(slot.value);
  }
  return ok({
    v: PROTOCOL_VERSION,
    t: "host-hello",
    room: value.room,
    buildId: value.buildId,
    protocol: value.protocol as number,
    phoneSlots,
  });
}

function parseCloseSlot(
  value: Record<string, unknown>,
): Result<HostCloseSlotMessage, ProtocolError> {
  const slot = parseSlot(value.slot);
  if (!slot.ok) return slot;
  if (value.reason !== undefined && !nonEmptyString(value.reason)) {
    return bad("close-slot.reason must be a non-empty string when present");
  }
  return ok({
    v: PROTOCOL_VERSION,
    t: "close-slot",
    slot: slot.value,
    ...(value.reason !== undefined ? { reason: value.reason } : {}),
  });
}

function parseRoomState(
  value: Record<string, unknown>,
): Result<RoomStateMessage, ProtocolError> {
  if (!Array.isArray(value.slots)) {
    return bad("room-state.slots must be an array");
  }
  if (value.slots.length > MAX_CONTROLLER_SLOTS) {
    return bad("room-state.slots exceeds the controller cap");
  }
  const slots: RoomSlotState[] = [];
  for (const raw of value.slots) {
    if (!isRecord(raw)) return bad("room-state slot must be an object");
    const slot = parseSlot(raw.slot);
    if (!slot.ok) return slot;
    if (!booleanValue(raw.connected) || !booleanValue(raw.ready)) {
      return bad("room-state slot state must be boolean");
    }
    if (raw.ready && !raw.connected) {
      return bad("room-state slot cannot be ready while disconnected");
    }
    if (slots.some((entry) => entry.slot === slot.value)) {
      return bad("room-state slots must be unique");
    }
    slots.push({
      slot: slot.value,
      connected: raw.connected,
      ready: raw.ready,
    });
  }
  return ok({ v: PROTOCOL_VERSION, t: "room-state", slots });
}

function parseRelayReady(
  value: Record<string, unknown>,
): Result<RelayReadyMessage, ProtocolError> {
  const slot = parseSlot(value.slot);
  if (!slot.ok) return slot;
  return ok({ v: PROTOCOL_VERSION, t: "ready", slot: slot.value });
}

function parseInput(
  value: Record<string, unknown>,
): Result<ControllerInputMessage | RelayInputMessage, ProtocolError> {
  const seq = parseSeq(value.seq);
  if (!seq.ok) return seq;
  const input = parseNetInput(value.input);
  if (!input.ok) return input;
  if ("slot" in value) {
    const slot = parseSlot(value.slot);
    if (!slot.ok) return slot;
    return ok({
      v: PROTOCOL_VERSION,
      t: "input",
      slot: slot.value,
      seq: seq.value,
      input: input.value,
    });
  }
  return ok({
    v: PROTOCOL_VERSION,
    t: "input",
    seq: seq.value,
    input: input.value,
  });
}

function parsePing(
  value: Record<string, unknown>,
): Result<ControllerPingMessage | RelayPingMessage, ProtocolError> {
  const t0 = parseTime(value.t0);
  if (!t0.ok) return t0;
  if ("slot" in value) {
    const slot = parseSlot(value.slot);
    if (!slot.ok) return slot;
    return ok({
      v: PROTOCOL_VERSION,
      t: "ping",
      slot: slot.value,
      t0: t0.value,
    });
  }
  return ok({ v: PROTOCOL_VERSION, t: "ping", t0: t0.value });
}

function parsePong(
  value: Record<string, unknown>,
): Result<ControllerPongMessage | HostPongMessage, ProtocolError> {
  const t0 = parseTime(value.t0);
  if (!t0.ok) return t0;
  if ("slot" in value) {
    const slot = parseSlot(value.slot);
    if (!slot.ok) return slot;
    return ok({
      v: PROTOCOL_VERSION,
      t: "pong",
      slot: slot.value,
      t0: t0.value,
    });
  }
  return ok({ v: PROTOCOL_VERSION, t: "pong", t0: t0.value });
}

function parseControl(
  value: unknown,
): Result<ControlDescriptor, ProtocolError> {
  if (!isRecord(value)) return bad("control must be an object");
  if (typeof value.mode !== "string" || !CONTROL_MODES.has(value.mode)) {
    return bad("control.mode is not a known controller mode");
  }
  const mode = value.mode as ControlMode;

  let choices: number | undefined;
  if (mode === "choice") {
    if (
      !Number.isInteger(value.choices) ||
      (value.choices as number) < 1 ||
      (value.choices as number) > 5
    ) {
      return bad("control.choices must be 1-5 in choice mode");
    }
    choices = value.choices as number;
  } else if (value.choices !== undefined) {
    return bad("control.choices is only valid in choice mode");
  }

  let selected: number | undefined;
  if (value.selected !== undefined) {
    if (
      choices === undefined ||
      !Number.isInteger(value.selected) ||
      (value.selected as number) < 1 ||
      (value.selected as number) > choices
    ) {
      return bad("control.selected must be within the choice count");
    }
    selected = value.selected as number;
  }

  if (!Array.isArray(value.verbs)) {
    return bad("control.verbs must be an array");
  }
  const verbs: ControlVerb[] = [];
  for (const rawVerb of value.verbs) {
    if (typeof rawVerb !== "string" || !CONTROL_VERBS.has(rawVerb)) {
      return bad("control.verbs contains an unknown verb");
    }
    if (verbs.includes(rawVerb as ControlVerb)) {
      return bad("control.verbs must be unique");
    }
    verbs.push(rawVerb as ControlVerb);
  }
  for (const required of ["jump", "interact", "scan"] as const) {
    if (!verbs.includes(required)) {
      return bad(`control.verbs must include ${required}`);
    }
  }

  let activeVerb: ControlVerb | undefined;
  if (value.activeVerb !== undefined) {
    if (
      typeof value.activeVerb !== "string" ||
      !CONTROL_VERBS.has(value.activeVerb) ||
      !verbs.includes(value.activeVerb as ControlVerb)
    ) {
      return bad("control.activeVerb must be one of control.verbs");
    }
    activeVerb = value.activeVerb as ControlVerb;
  }

  if (!booleanValue(value.dashReady)) {
    return bad("control.dashReady must be boolean");
  }

  return ok({
    mode,
    ...(choices !== undefined ? { choices } : {}),
    ...(selected !== undefined ? { selected } : {}),
    verbs,
    ...(activeVerb !== undefined ? { activeVerb } : {}),
    dashReady: value.dashReady === true,
  });
}

function parseActionFeedback(
  value: unknown,
): Result<ActionFeedback, ProtocolError> {
  if (!isRecord(value)) return bad("feedback must be an object");
  if (
    typeof value.verb !== "string" ||
    !CONTROL_VERBS.has(value.verb)
  ) {
    return bad("feedback.verb is not a known controller verb");
  }
  if (
    typeof value.result !== "string" ||
    !ACTION_RESULTS.has(value.result)
  ) {
    return bad("feedback.result is not a known action result");
  }
  let reason: ActionReason | undefined;
  if (value.reason !== undefined) {
    if (
      typeof value.reason !== "string" ||
      !ACTION_REASONS.has(value.reason)
    ) {
      return bad("feedback.reason is not a known action reason");
    }
    reason = value.reason as ActionReason;
  }
  let retryAfterMs: number | undefined;
  if (value.retryAfterMs !== undefined) {
    if (!finiteNumber(value.retryAfterMs) || value.retryAfterMs < 0) {
      return bad("feedback.retryAfterMs must be a non-negative number");
    }
    retryAfterMs = value.retryAfterMs;
  }
  return ok({
    verb: value.verb as ControlVerb,
    result: value.result as ActionResult,
    ...(reason !== undefined ? { reason } : {}),
    ...(retryAfterMs !== undefined ? { retryAfterMs } : {}),
  });
}

function parseControlMessage(
  value: Record<string, unknown>,
): Result<HostControlMessage, ProtocolError> {
  const slot = parseSlot(value.slot);
  if (!slot.ok) return slot;
  const control = parseControl(value.control);
  if (!control.ok) return control;
  return ok({
    v: PROTOCOL_VERSION,
    t: "control",
    slot: slot.value,
    control: control.value,
  });
}

function parseActionMessage(
  value: Record<string, unknown>,
): Result<HostActionMessage, ProtocolError> {
  const slot = parseSlot(value.slot);
  if (!slot.ok) return slot;
  const feedback = parseActionFeedback(value.feedback);
  if (!feedback.ok) return feedback;
  return ok({
    v: PROTOCOL_VERSION,
    t: "action",
    slot: slot.value,
    feedback: feedback.value,
  });
}

function parseMessage(
  value: unknown,
): Result<ProtocolMessage, ProtocolError> {
  if (!isRecord(value)) return bad("message must be an object");
  if (!Number.isInteger(value.v)) return bad("message.v must be an integer");
  if (value.v !== PROTOCOL_VERSION) {
    return protocolError(
      "UNSUPPORTED_PROTOCOL",
      `Unsupported protocol version ${String(value.v)}`,
    );
  }
  if (typeof value.t !== "string") return bad("message.t must be a string");

  switch (value.t) {
    case "hello":
      return parseControllerHello(value);
    case "welcome":
      return parseWelcome(value);
    case "ready":
      return "slot" in value
        ? parseRelayReady(value)
        : ok({ v: PROTOCOL_VERSION, t: "ready" });
    case "input":
      return parseInput(value);
    case "ping":
      return parsePing(value);
    case "pong":
      return parsePong(value);
    case "pause":
      return parsePause(value);
    case "resume":
      return parseResume(value);
    case "session-end":
      return parseSessionEnd(value);
    case "error":
      return parseError(value);
    case "host-hello":
      return parseHostHello(value);
    case "close-slot":
      return parseCloseSlot(value);
    case "control":
      return parseControlMessage(value);
    case "action":
      return parseActionMessage(value);
    case "room-state":
      return parseRoomState(value);
    default:
      return protocolError(
        "UNKNOWN_TYPE",
        `Unknown message type "${value.t}"`,
      );
  }
}

export function messageBytes(raw: string): number {
  return encoder.encode(raw).byteLength;
}

export function decodeMessage(
  raw: string,
  maxBytes = MAX_CONTROLLER_MESSAGE_BYTES,
): Result<ProtocolMessage, ProtocolError> {
  if (messageBytes(raw) > maxBytes) {
    return bad(`Message exceeds the ${maxBytes}-byte limit`);
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return bad("Message is not valid JSON");
  }
  return parseMessage(parsed);
}

export function encodeMessage(message: ProtocolMessage): string {
  return JSON.stringify(message);
}

export function isControllerClientMessage(
  message: ProtocolMessage,
): message is ControllerClientMessage {
  switch (message.t) {
    case "hello":
      return true;
    case "ready":
    case "input":
    case "ping":
      return !("slot" in message);
    default:
      return false;
  }
}

export function isHostClientMessage(
  message: ProtocolMessage,
): message is HostClientMessage {
  switch (message.t) {
    case "host-hello":
    case "close-slot":
    case "control":
    case "action":
    case "pause":
    case "resume":
    case "session-end":
      return true;
    case "pong":
      return "slot" in message;
    default:
      return false;
  }
}

export function isControllerServerMessage(
  message: ProtocolMessage,
): message is ControllerServerMessage {
  switch (message.t) {
    case "welcome":
    case "control":
    case "action":
    case "pause":
    case "resume":
    case "session-end":
    case "error":
      return true;
    case "pong":
      return !("slot" in message);
    default:
      return false;
  }
}

export function isHostServerMessage(
  message: ProtocolMessage,
): message is HostServerMessage {
  switch (message.t) {
    case "room-state":
    case "session-end":
    case "error":
      return true;
    case "ready":
    case "input":
    case "ping":
      return "slot" in message;
    default:
      return false;
  }
}

export function decodeControllerClientMessage(
  raw: string,
): Result<ControllerClientMessage, ProtocolError> {
  const decoded = decodeMessage(raw, MAX_CONTROLLER_MESSAGE_BYTES);
  if (!decoded.ok) return decoded;
  return isControllerClientMessage(decoded.value)
    ? ok(decoded.value)
    : protocolError("BAD_MESSAGE", "Expected a controller client message");
}

export function decodeHostClientMessage(
  raw: string,
): Result<HostClientMessage, ProtocolError> {
  const decoded = decodeMessage(raw, MAX_CONTROLLER_MESSAGE_BYTES);
  if (!decoded.ok) return decoded;
  return isHostClientMessage(decoded.value)
    ? ok(decoded.value)
    : protocolError("BAD_MESSAGE", "Expected a host client message");
}

export function decodeControllerServerMessage(
  raw: string,
): Result<ControllerServerMessage, ProtocolError> {
  const decoded = decodeMessage(raw, MAX_HOST_MESSAGE_BYTES);
  if (!decoded.ok) return decoded;
  return isControllerServerMessage(decoded.value)
    ? ok(decoded.value)
    : protocolError("BAD_MESSAGE", "Expected a controller server message");
}

export function decodeHostServerMessage(
  raw: string,
): Result<HostServerMessage, ProtocolError> {
  const decoded = decodeMessage(raw, MAX_CONTROLLER_MESSAGE_BYTES);
  if (!decoded.ok) return decoded;
  return isHostServerMessage(decoded.value)
    ? ok(decoded.value)
    : protocolError("BAD_MESSAGE", "Expected a host server message");
}

export function protocolErrorFromUnknown(
  error: unknown,
): ProtocolError {
  if (
    isRecord(error) &&
    typeof error.code === "string" &&
    ERROR_CODES.has(error.code) &&
    typeof error.message === "string"
  ) {
    return snapshotError(error.code as ErrorCode, error.message);
  }
  return snapshotError(
    "PROTOCOL_ERROR",
    error instanceof Error ? error.message : String(error),
  );
}
