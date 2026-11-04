import { normalizeRoomCode } from "../../src/net/room-code";

/**
 * Signed, stateless tokens used at the Worker edge.
 *
 * - A room ticket proves that a session was admitted by the demo gate and
 *   binds the room code to its session expiry. It is the QR join secret.
 * - A device token is a server-issued identity for one physical browser. It
 *   lets the Durable Object bind a slot to a device and reject a second slot
 *   from the same device.
 *
 * Both tokens are bearer values. They carry no PII and are only valid for the
 * configured lifetime.
 */

const ROOM_PREFIX = "v1";
const DEVICE_PREFIX = "d1";
const encoder = new TextEncoder();
const DEVICE_ID_PATTERN = /^[A-Za-z0-9_-]{8,64}$/;

export interface VerifiedRoomTicket {
  room: string;
  expiresAt: number;
}

export interface VerifiedDeviceToken {
  deviceId: string;
  expiresAt: number;
}

function base64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function fromBase64Url(value: string): Uint8Array<ArrayBuffer> | null {
  if (!/^[A-Za-z0-9_-]+$/.test(value)) return null;
  const padded = value.replace(/-/g, "+").replace(/_/g, "/");
  const padding = (4 - (padded.length % 4)) % 4;
  try {
    const binary = atob(padded + "=".repeat(padding));
    const bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index += 1) {
      bytes[index] = binary.charCodeAt(index);
    }
    return bytes;
  } catch {
    return null;
  }
}

async function hmacKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

async function sign(secret: string, payload: string): Promise<string> {
  const signature = await crypto.subtle.sign(
    "HMAC",
    await hmacKey(secret),
    encoder.encode(payload),
  );
  return base64Url(new Uint8Array(signature));
}

async function verify(
  secret: string,
  payload: string,
  signature: string,
): Promise<boolean> {
  const bytes = fromBase64Url(signature);
  if (!bytes) return false;
  try {
    return await crypto.subtle.verify(
      "HMAC",
      await hmacKey(secret),
      bytes,
      encoder.encode(payload),
    );
  } catch {
    return false;
  }
}

function roomPayload(room: string, expiresAt: number): string {
  return `room:${room}:${expiresAt}`;
}

function devicePayload(deviceId: string, expiresAt: number): string {
  return `device:${deviceId}:${expiresAt}`;
}

export function newDeviceId(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return base64Url(bytes);
}

export async function signRoomTicket(
  secret: string,
  room: string,
  expiresAt: number,
): Promise<string> {
  const normalized = normalizeRoomCode(room);
  if (!normalized.ok) throw new Error(normalized.error.message);
  if (!Number.isInteger(expiresAt) || expiresAt <= 0) {
    throw new Error("TICKET_EXPIRY: expiresAt must be a positive integer");
  }
  const signature = await sign(
    secret,
    roomPayload(normalized.value, expiresAt),
  );
  return `${ROOM_PREFIX}.${normalized.value}.${expiresAt}.${signature}`;
}

export async function verifyRoomTicket(
  secret: string,
  ticket: string,
  now: number,
): Promise<VerifiedRoomTicket | null> {
  const parts = ticket.split(".");
  if (parts.length !== 4 || parts[0] !== ROOM_PREFIX) return null;
  const [, roomValue, expiryValue, signature] = parts;
  if (!roomValue || !expiryValue || !signature) return null;
  const room = normalizeRoomCode(roomValue);
  if (!room.ok) return null;
  const expiresAt = Number.parseInt(expiryValue, 10);
  if (!Number.isInteger(expiresAt) || expiresAt <= now) return null;
  const valid = await verify(
    secret,
    roomPayload(room.value, expiresAt),
    signature,
  );
  return valid ? { room: room.value, expiresAt } : null;
}

export async function signDeviceToken(
  secret: string,
  deviceId: string,
  expiresAt: number,
): Promise<string> {
  if (!DEVICE_ID_PATTERN.test(deviceId)) {
    throw new Error("DEVICE_ID: deviceId is invalid");
  }
  if (!Number.isInteger(expiresAt) || expiresAt <= 0) {
    throw new Error("TICKET_EXPIRY: expiresAt must be a positive integer");
  }
  const signature = await sign(
    secret,
    devicePayload(deviceId, expiresAt),
  );
  return `${DEVICE_PREFIX}.${deviceId}.${expiresAt}.${signature}`;
}

export async function verifyDeviceToken(
  secret: string,
  token: string,
  now: number,
): Promise<VerifiedDeviceToken | null> {
  const parts = token.split(".");
  if (parts.length !== 4 || parts[0] !== DEVICE_PREFIX) return null;
  const [, deviceId, expiryValue, signature] = parts;
  if (!deviceId || !expiryValue || !signature) return null;
  if (!DEVICE_ID_PATTERN.test(deviceId)) return null;
  const expiresAt = Number.parseInt(expiryValue, 10);
  if (!Number.isInteger(expiresAt) || expiresAt <= now) return null;
  const valid = await verify(
    secret,
    devicePayload(deviceId, expiresAt),
    signature,
  );
  return valid ? { deviceId, expiresAt } : null;
}
