import { normalizeRoomCode } from "../../src/net/room-code";
import type { PlayerSlot } from "../../src/net/protocol";
import { demoConfig, type DemoConfig } from "./demo-config";
import type { WorkerEnv } from "./env";
import {
  newDeviceId,
  signDeviceToken,
  signRoomTicket,
  verifyDeviceToken,
  verifyRoomTicket,
} from "./ticket";

const JSON_HEADERS = {
  "content-type": "application/json; charset=utf-8",
  "cache-control": "no-store",
};

const rateBuckets = new Map<string, { count: number; resetAt: number }>();

function errorResponse(
  status: number,
  code: string,
  message: string,
  retryAfterSeconds?: number,
): Response {
  const headers = new Headers(JSON_HEADERS);
  if (retryAfterSeconds !== undefined) {
    headers.set("retry-after", String(retryAfterSeconds));
  }
  return new Response(JSON.stringify({ error: { code, message } }), {
    status,
    headers,
  });
}

function jsonResponse(value: unknown, status = 200): Response {
  return new Response(JSON.stringify(value), {
    status,
    headers: JSON_HEADERS,
  });
}

function allowedOrigins(value: string): Set<string> {
  return new Set(
    value
      .split(",")
      .map((origin) => origin.trim().replace(/\/$/, ""))
      .filter((origin) => origin.length > 0),
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

async function readJson(request: Request): Promise<Record<string, unknown> | null> {
  try {
    const value = (await request.json()) as unknown;
    return isRecord(value) ? value : null;
  } catch {
    return null;
  }
}

/**
 * Best-effort per-IP limit. Cloudflare always supplies CF-Connecting-IP in
 * production; local development and unit tests skip the in-memory bucket.
 */
function allowIp(
  request: Request,
  bucket: string,
  limit: number,
): boolean {
  const ip = request.headers.get("cf-connecting-ip");
  if (!ip || limit <= 0) return true;
  const now = Date.now();
  const key = `${bucket}:${ip}`;
  const entry = rateBuckets.get(key);
  if (!entry || entry.resetAt <= now) {
    rateBuckets.set(key, { count: 1, resetAt: now + 60_000 });
    return true;
  }
  if (entry.count >= limit) return false;
  entry.count += 1;
  return true;
}

export function resetRateLimits(): void {
  rateBuckets.clear();
}

async function gateRequest(
  env: WorkerEnv,
  path: string,
  body: Record<string, unknown> = {},
): Promise<Response> {
  try {
    return await env.DEMO_GATE.getByName("global").fetch(
      new Request(`https://demo-gate.internal${path}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      }),
    );
  } catch {
    return errorResponse(
      503,
      "DEMO_UNAVAILABLE",
      "The demo relay is unavailable.",
    );
  }
}

async function forwardGateError(response: Response): Promise<Response> {
  const payload = (await response.json().catch(() => null)) as unknown;
  const error = isRecord(payload) && isRecord(payload.error)
    ? payload.error
    : null;
  const code =
    error && typeof error.code === "string"
      ? error.code
      : "DEMO_UNAVAILABLE";
  const message =
    error && typeof error.message === "string"
      ? error.message
      : "The demo relay rejected the request.";
  const retryAfter =
    isRecord(payload) && Number.isInteger(payload.retryAfterSeconds)
      ? (payload.retryAfterSeconds as number)
      : undefined;
  return errorResponse(response.status, code, message, retryAfter);
}

async function handleDevice(
  request: Request,
  env: WorkerEnv,
  config: DemoConfig,
): Promise<Response> {
  if (request.method !== "POST") {
    return errorResponse(405, "PROTOCOL_ERROR", "Device route requires POST");
  }
  if (!allowIp(request, "device", config.ipDeviceIssuesPerMinute)) {
    return errorResponse(
      429,
      "DEMO_DEVICE_LIMIT",
      "Too many device requests from this address.",
      60,
    );
  }

  const gate = await gateRequest(env, "/issue-device");
  if (!gate.ok) return forwardGateError(gate);

  const deviceId = newDeviceId();
  const expiresAt = Date.now() + config.deviceTokenTtlMs;
  const token = await signDeviceToken(
    config.signingSecret,
    deviceId,
    expiresAt,
  );
  return jsonResponse({ deviceId, token, expiresAt });
}

async function handleSession(
  request: Request,
  env: WorkerEnv,
  config: DemoConfig,
): Promise<Response> {
  if (request.method !== "POST") {
    return errorResponse(405, "PROTOCOL_ERROR", "Session route requires POST");
  }
  if (!allowIp(request, "session", config.ipSessionAttemptsPerMinute)) {
    return errorResponse(
      429,
      "DEMO_BUSY",
      "Too many session requests from this address.",
      60,
    );
  }

  const body = await readJson(request);
  if (!body || typeof body.room !== "string" || typeof body.deviceToken !== "string") {
    return errorResponse(
      400,
      "BAD_MESSAGE",
      "room and deviceToken are required",
    );
  }
  const room = normalizeRoomCode(body.room);
  if (!room.ok) {
    return errorResponse(400, room.error.code, room.error.message);
  }
  const device = await verifyDeviceToken(
    config.signingSecret,
    body.deviceToken,
    Date.now(),
  );
  if (!device) {
    return errorResponse(
      401,
      "DEVICE_REJECTED",
      "The device token is invalid or expired.",
    );
  }

  const gate = await gateRequest(env, "/admit-session", {
    room: room.value,
    deviceId: device.deviceId,
  });
  if (!gate.ok) return forwardGateError(gate);

  const decision = (await gate.json()) as {
    expiresAt?: number;
  };
  if (!Number.isInteger(decision.expiresAt)) {
    return errorResponse(
      503,
      "DEMO_UNAVAILABLE",
      "The demo relay did not return a session expiry.",
    );
  }

  const ticket = await signRoomTicket(
    config.signingSecret,
    room.value,
    decision.expiresAt as number,
  );
  return jsonResponse({
    room: room.value,
    ticket,
    expiresAt: decision.expiresAt,
  });
}

async function handleRelease(
  request: Request,
  env: WorkerEnv,
  config: DemoConfig,
): Promise<Response> {
  if (request.method !== "POST") {
    return errorResponse(405, "PROTOCOL_ERROR", "Release route requires POST");
  }
  if (!allowIp(request, "session", config.ipSessionAttemptsPerMinute)) {
    return errorResponse(
      429,
      "DEMO_BUSY",
      "Too many session requests from this address.",
      60,
    );
  }

  const body = await readJson(request);
  if (!body || typeof body.room !== "string" || typeof body.ticket !== "string") {
    return errorResponse(
      400,
      "BAD_MESSAGE",
      "room and ticket are required",
    );
  }
  const room = normalizeRoomCode(body.room);
  if (!room.ok) {
    return errorResponse(400, room.error.code, room.error.message);
  }
  const ticket = await verifyRoomTicket(
    config.signingSecret,
    body.ticket,
    Date.now(),
  );
  if (!ticket || ticket.room !== room.value) {
    return errorResponse(
      403,
      "TICKET_INVALID",
      "The room ticket is invalid or expired.",
    );
  }

  const gate = await gateRequest(env, "/release", {
    room: room.value,
    expiresAt: ticket.expiresAt,
  });
  if (!gate.ok) return forwardGateError(gate);
  return jsonResponse({ ok: true });
}

function parseSlot(value: string | null): PlayerSlot | null {
  return value === "p1" || value === "p2" ? value : null;
}

async function handleSocket(
  request: Request,
  env: WorkerEnv,
  config: DemoConfig,
  url: URL,
): Promise<Response> {
  if (request.method !== "GET") {
    return errorResponse(405, "PROTOCOL_ERROR", "WebSocket route requires GET");
  }
  if (request.headers.get("Upgrade")?.toLowerCase() !== "websocket") {
    return errorResponse(
      426,
      "PROTOCOL_ERROR",
      "Expected a WebSocket upgrade",
    );
  }
  if (!allowIp(request, "ws", config.ipWsAttemptsPerMinute)) {
    return errorResponse(
      429,
      "DEMO_ATTEMPTS",
      "Too many connection attempts from this address.",
      60,
    );
  }

  const role = url.searchParams.get("role");
  if (role !== "host" && role !== "controller") {
    return errorResponse(
      400,
      "PROTOCOL_ERROR",
      "Role must be host or controller",
    );
  }

  const room = normalizeRoomCode(url.searchParams.get("room") ?? "");
  if (!room.ok) {
    return errorResponse(400, room.error.code, room.error.message);
  }

  const deviceToken = url.searchParams.get("device");
  if (!deviceToken) {
    return errorResponse(
      401,
      "DEVICE_REJECTED",
      "A device token is required.",
    );
  }
  const device = await verifyDeviceToken(
    config.signingSecret,
    deviceToken,
    Date.now(),
  );
  if (!device) {
    return errorResponse(
      401,
      "DEVICE_REJECTED",
      "The device token is invalid or expired.",
    );
  }

  const ticket = url.searchParams.get("ticket");
  const slot = parseSlot(url.searchParams.get("slot"));
  let expiresAt: number | null = null;

  if (role === "host") {
    if (!ticket) {
      return errorResponse(
        401,
        "TICKET_INVALID",
        "A room ticket is required for the host.",
      );
    }
    const verified = await verifyRoomTicket(
      config.signingSecret,
      ticket,
      Date.now(),
    );
    if (!verified || verified.room !== room.value) {
      return errorResponse(
        403,
        "TICKET_INVALID",
        "The room ticket is invalid or expired.",
      );
    }
    const gate = await gateRequest(env, "/is-active", {
      room: room.value,
    });
    if (!gate.ok) return forwardGateError(gate);
    const decision = (await gate.json()) as { expiresAt?: number };
    if (!Number.isInteger(decision.expiresAt)) {
      return errorResponse(
        404,
        "ROOM_NOT_FOUND",
        "That room code is not active.",
      );
    }
    expiresAt = decision.expiresAt as number;
  } else {
    if (!slot) {
      return errorResponse(
        400,
        "PROTOCOL_ERROR",
        "A controller slot is required.",
      );
    }
    if (ticket) {
      const verified = await verifyRoomTicket(
        config.signingSecret,
        ticket,
        Date.now(),
      );
      if (!verified || verified.room !== room.value) {
        return errorResponse(
          403,
          "TICKET_INVALID",
          "The room ticket is invalid or expired.",
        );
      }
      expiresAt = verified.expiresAt;
    } else {
      const gate = await gateRequest(env, "/is-active", {
        room: room.value,
      });
      if (!gate.ok) return forwardGateError(gate);
      const decision = (await gate.json()) as { expiresAt?: number };
      if (!Number.isInteger(decision.expiresAt)) {
        return errorResponse(
          404,
          "ROOM_NOT_FOUND",
          "That room code is not active.",
        );
      }
      expiresAt = decision.expiresAt as number;
    }
  }

  if (expiresAt === null || expiresAt <= Date.now()) {
    return errorResponse(
      410,
      "SESSION_EXPIRED",
      "This demo session has expired.",
    );
  }

  const headers = new Headers(request.headers);
  headers.set("x-demo-device", device.deviceId);
  headers.set("x-demo-expires", String(expiresAt));
  headers.set("x-demo-slot", slot ?? "");

  return env.ROOMS.getByName(room.value).fetch(
    new Request(request, { headers }),
  );
}

/**
 * Worker edge validation. The Durable Object repeats membership, device, and
 * slot checks; the edge exists so an invalid or unwanted join never creates or
 * wakes a room object.
 */
function corsHeaders(origin: string): Headers {
  return new Headers({
    "access-control-allow-origin": origin,
    "access-control-allow-methods": "POST, OPTIONS",
    "access-control-allow-headers": "content-type, accept",
    "access-control-max-age": "600",
    vary: "origin",
  });
}

export async function handleRequest(
  request: Request,
  env: WorkerEnv,
): Promise<Response> {
  const url = new URL(request.url);
  const config = demoConfig(env);
  const origin = request.headers.get("Origin");
  if (!origin || !allowedOrigins(env.ALLOWED_ORIGINS).has(origin)) {
    return errorResponse(403, "ORIGIN_REJECTED", "Origin is not allowed");
  }

  const cors =
    url.pathname === "/device" ||
    url.pathname === "/session" ||
    url.pathname === "/session/release";
  if (cors && request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: corsHeaders(origin),
    });
  }

  let response: Response;
  switch (url.pathname) {
    case "/device":
      response = await handleDevice(request, env, config);
      break;
    case "/session":
      response = await handleSession(request, env, config);
      break;
    case "/session/release":
      response = await handleRelease(request, env, config);
      break;
    case "/ws":
      response = await handleSocket(request, env, config, url);
      break;
    default:
      response = errorResponse(404, "ROOM_INVALID", "Unknown route");
  }

  if (cors) {
    const headers = new Headers(response.headers);
    headers.set("access-control-allow-origin", origin);
    headers.set("vary", "origin");
    response = new Response(response.body, {
      status: response.status,
      headers,
    });
  }
  return response;
}
