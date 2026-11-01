import { normalizeRoomCode } from "../../src/net/room-code";
import type { WorkerEnv } from "./env";

const JSON_HEADERS = {
  "content-type": "application/json; charset=utf-8",
  "cache-control": "no-store",
};

function errorResponse(
  status: number,
  code: string,
  message: string,
): Response {
  return new Response(JSON.stringify({ error: { code, message } }), {
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

/**
 * Worker edge validation. Durable Object membership and slot validation happen
 * after the upgrade.
 */
export async function handleRequest(
  request: Request,
  env: WorkerEnv,
): Promise<Response> {
  const url = new URL(request.url);
  if (url.pathname !== "/ws") {
    return errorResponse(404, "ROOM_INVALID", "Unknown route");
  }
  if (request.method !== "GET") {
    return errorResponse(405, "ROOM_INVALID", "WebSocket route requires GET");
  }
  if (
    request.headers.get("Upgrade")?.toLowerCase() !== "websocket"
  ) {
    return errorResponse(
      426,
      "PROTOCOL_ERROR",
      "Expected a WebSocket upgrade",
    );
  }

  const origin = request.headers.get("Origin");
  if (!origin || !allowedOrigins(env.ALLOWED_ORIGINS).has(origin)) {
    return errorResponse(403, "ORIGIN_REJECTED", "Origin is not allowed");
  }

  const room = normalizeRoomCode(url.searchParams.get("room") ?? "");
  if (!room.ok) {
    return errorResponse(400, room.error.code, room.error.message);
  }

  const role = url.searchParams.get("role");
  if (role !== "host" && role !== "controller") {
    return errorResponse(
      400,
      "PROTOCOL_ERROR",
      "Role must be host or controller",
    );
  }

  return env.ROOMS.getByName(room.value).fetch(request);
}
