import { err, ok, type Result } from "../core/result";
import {
  isPlayerSlot,
  type PlayerSlot,
  type ProtocolError,
} from "./protocol";

export const ROOM_CODE_LENGTH = 6;
export const ROOM_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export interface ControllerUrl {
  room: string;
  slot: PlayerSlot;
}

export type RoomSocketRole = "host" | "controller";

export function buildRoomSocketUrl(
  baseUrl: string,
  room: string,
  role: RoomSocketRole,
): string {
  const normalized = normalizeRoomCode(room);
  if (!normalized.ok) throw new Error(normalized.error.message);
  const url = new URL(baseUrl);
  if (!url.pathname.endsWith("/ws")) {
    url.pathname = `${url.pathname.replace(/\/$/, "")}/ws`;
  }
  const params = new URLSearchParams(url.search);
  params.set("room", normalized.value);
  params.set("role", role);
  url.search = params.toString();
  return url.toString();
}

function roomError(message: string): Result<never, ProtocolError> {
  return err({ code: "ROOM_INVALID", message });
}

export function normalizeRoomCode(
  value: string,
): Result<string, ProtocolError> {
  const normalized = value.trim().toUpperCase();
  if (normalized.length !== ROOM_CODE_LENGTH) {
    return roomError(`Room code must be ${ROOM_CODE_LENGTH} characters`);
  }
  for (const character of normalized) {
    if (!ROOM_CODE_ALPHABET.includes(character)) {
      return roomError("Room code contains an unsupported character");
    }
  }
  return ok(normalized);
}

function secureRandom(): number {
  const value = new Uint32Array(1);
  crypto.getRandomValues(value);
  return (value[0] ?? 0) / 2 ** 32;
}

export function generateRoomCode(
  random: () => number = secureRandom,
): string {
  let code = "";
  for (let index = 0; index < ROOM_CODE_LENGTH; index += 1) {
    const value = random();
    if (!Number.isFinite(value) || value < 0 || value >= 1) {
      throw new Error("ROOM_CODE_RANDOM: random values must be in [0, 1)");
    }
    const character = ROOM_CODE_ALPHABET[
      Math.floor(value * ROOM_CODE_ALPHABET.length)
    ];
    if (!character) {
      throw new Error("ROOM_CODE_RANDOM: failed to select a character");
    }
    code += character;
  }
  return code;
}

export function buildControllerUrl(
  baseUrl: string,
  room: string,
  slot: PlayerSlot,
): string {
  const normalized = normalizeRoomCode(room);
  if (!normalized.ok) throw new Error(normalized.error.message);
  if (!isPlayerSlot(slot)) {
    throw new Error(`CONTROLLER_URL_SLOT: invalid slot "${String(slot)}"`);
  }
  const url = new URL(baseUrl);
  const params = new URLSearchParams();
  params.set("room", normalized.value);
  params.set("slot", slot);
  url.hash = params.toString();
  return url.toString();
}

export function parseControllerUrl(
  value: string,
): Result<ControllerUrl, ProtocolError> {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return roomError("Controller URL is invalid");
  }

  const params = new URLSearchParams(url.hash.replace(/^#/, ""));
  const room = params.get("room");
  if (!room) return roomError("Controller URL is missing room");
  const normalized = normalizeRoomCode(room);
  if (!normalized.ok) return normalized;

  const slot = params.get("slot");
  if (!isPlayerSlot(slot)) {
    return roomError("Controller URL slot must be p1 or p2");
  }

  return ok({ room: normalized.value, slot });
}
