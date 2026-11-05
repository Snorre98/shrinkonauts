import { beforeEach, describe, expect, it } from "vitest";
import { handleRequest, resetRateLimits } from "../../worker/src/router";
import type { WorkerEnv } from "../../worker/src/env";
import { demoConfig } from "../../worker/src/demo-config";
import {
  signDeviceToken,
  signRoomTicket,
} from "../../worker/src/ticket";

const ORIGIN = "http://127.0.0.1:5173";
const SECRET = demoConfig({}).signingSecret;

function json(value: unknown, status = 200): Response {
  return new Response(JSON.stringify(value), {
    status,
    headers: { "content-type": "application/json" },
  });
}

class FakeRooms {
  readonly calls: { room: string; request: Request }[] = [];

  getByName(room: string) {
    return {
      fetch: async (request: Request): Promise<Response> => {
        this.calls.push({ room, request });
        return new Response("relay", { status: 200 });
      },
    };
  }
}

class FakeGate {
  readonly calls: string[] = [];
  readonly responses = new Map<string, () => Response>();

  getByName() {
    return {
      fetch: async (request: Request): Promise<Response> => {
        const path = new URL(request.url).pathname;
        this.calls.push(path);
        const handler = this.responses.get(path);
        if (handler) return handler();
        if (path === "/is-active") {
          return json({ ok: true, expiresAt: Date.now() + 300_000 });
        }
        return json({ ok: true });
      },
    };
  }
}

function env(origins = ORIGIN): WorkerEnv {
  return {
    ROOMS: new FakeRooms(),
    DEMO_GATE: new FakeGate(),
    ALLOWED_ORIGINS: origins,
  };
}

function wsRequest(
  path = "/ws?room=abc234&role=host",
  headers: Record<string, string> = {},
): Request {
  return new Request(`https://rooms.example.test${path}`, {
    headers: {
      Origin: ORIGIN,
      Upgrade: "websocket",
      ...headers,
    },
  });
}

function postRequest(
  path: string,
  body?: unknown,
  headers: Record<string, string> = {},
): Request {
  return new Request(`https://rooms.example.test${path}`, {
    method: "POST",
    headers: {
      Origin: ORIGIN,
      ...(body === undefined ? {} : { "content-type": "application/json" }),
      ...headers,
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
}

async function body(response: Response): Promise<Record<string, unknown>> {
  return (await response.json()) as Record<string, unknown>;
}

async function deviceToken(
  deviceId = "device-test",
  expiresAt = Date.now() + 3_600_000,
): Promise<string> {
  return signDeviceToken(SECRET, deviceId, expiresAt);
}

async function roomTicket(
  room = "ABC234",
  expiresAt = Date.now() + 300_000,
): Promise<string> {
  return signRoomTicket(SECRET, room, expiresAt);
}

beforeEach(() => {
  resetRateLimits();
});

describe("Worker device and session admission", () => {
  it("issues a signed device token and counts it in the gate", async () => {
    const workerEnv = env();
    const response = await handleRequest(
      postRequest("/device"),
      workerEnv,
    );

    expect(response.status).toBe(200);
    const payload = await body(response);
    expect(typeof payload.deviceId).toBe("string");
    expect(typeof payload.token).toBe("string");
    expect(typeof payload.expiresAt).toBe("number");
    expect((workerEnv.DEMO_GATE as FakeGate).calls).toEqual([
      "/issue-device",
    ]);
  });

  it("creates a room ticket for a valid device and admitted session", async () => {
    const workerEnv = env();
    (workerEnv.DEMO_GATE as FakeGate).responses.set(
      "/admit-session",
      () => json({ ok: true, expiresAt: Date.now() + 300_000 }),
    );
    const token = await deviceToken();

    const response = await handleRequest(
      postRequest("/session", { room: "abc234", deviceToken: token }),
      workerEnv,
    );

    expect(response.status).toBe(200);
    const payload = await body(response);
    expect(payload.room).toBe("ABC234");
    expect(typeof payload.ticket).toBe("string");
    expect((workerEnv.DEMO_GATE as FakeGate).calls).toEqual([
      "/admit-session",
    ]);
    expect((workerEnv.ROOMS as FakeRooms).calls).toHaveLength(0);
  });

  it("rejects a session when the gate is at its daily limit", async () => {
    const workerEnv = env();
    (workerEnv.DEMO_GATE as FakeGate).responses.set(
      "/admit-session",
      () =>
        json(
          {
            error: {
              code: "DEMO_SESSIONS",
              message: "The demo has reached its daily session limit.",
            },
            retryAfterSeconds: 60,
          },
          429,
        ),
    );
    const token = await deviceToken();

    const response = await handleRequest(
      postRequest("/session", { room: "ABC234", deviceToken: token }),
      workerEnv,
    );

    expect(response.status).toBe(429);
    expect(await body(response)).toMatchObject({
      error: { code: "DEMO_SESSIONS" },
    });
    expect((workerEnv.ROOMS as FakeRooms).calls).toHaveLength(0);
  });

  it("releases a session with a valid room ticket", async () => {
    const workerEnv = env();
    const ticket = await roomTicket();

    const response = await handleRequest(
      postRequest("/session/release", { room: "ABC234", ticket }),
      workerEnv,
    );

    expect(response.status).toBe(200);
    expect((workerEnv.DEMO_GATE as FakeGate).calls).toEqual(["/release"]);
  });

  it("rejects a release with an invalid ticket", async () => {
    const workerEnv = env();
    const response = await handleRequest(
      postRequest("/session/release", {
        room: "ABC234",
        ticket: "bad",
      }),
      workerEnv,
    );
    expect(response.status).toBe(403);
    expect((workerEnv.DEMO_GATE as FakeGate).calls).toHaveLength(0);
  });

  it("rejects an invalid device token or session body", async () => {
    const workerEnv = env();
    expect(
      (
        await handleRequest(
          postRequest("/session", { room: "ABC234", deviceToken: "nope" }),
          workerEnv,
        )
      ).status,
    ).toBe(401);
    expect(
      (
        await handleRequest(
          postRequest("/session", { room: "ABC234" }),
          workerEnv,
        )
      ).status,
    ).toBe(400);
  });
});

describe("Worker WebSocket admission", () => {
  it("routes a valid host upgrade with verified device and expiry headers", async () => {
    const workerEnv = env();
    const token = await deviceToken();
    const ticket = await roomTicket();

    const response = await handleRequest(
      wsRequest(
        `/ws?room=abc234&role=host&device=${encodeURIComponent(token)}&ticket=${encodeURIComponent(ticket)}`,
      ),
      workerEnv,
    );

    expect(response.status).toBe(200);
    const call = (workerEnv.ROOMS as FakeRooms).calls[0];
    expect(call?.room).toBe("ABC234");
    expect(call?.request.headers.get("x-demo-device")).toBe("device-test");
    expect(Number(call?.request.headers.get("x-demo-expires"))).toBeGreaterThan(
      Date.now(),
    );
    expect((workerEnv.DEMO_GATE as FakeGate).calls).toEqual([
      "/is-active",
    ]);
  });

  it("rejects a host without a ticket before creating a room", async () => {
    const workerEnv = env();
    const token = await deviceToken();

    const response = await handleRequest(
      wsRequest(
        `/ws?room=ABC234&role=host&device=${encodeURIComponent(token)}`,
      ),
      workerEnv,
    );

    expect(response.status).toBe(401);
    expect((workerEnv.ROOMS as FakeRooms).calls).toHaveLength(0);
  });

  it("routes a valid controller ticket and slot", async () => {
    const workerEnv = env();
    const token = await deviceToken("device-p1");
    const ticket = await roomTicket();

    const response = await handleRequest(
      wsRequest(
        `/ws?room=ABC234&role=controller&slot=p1&device=${encodeURIComponent(token)}&ticket=${encodeURIComponent(ticket)}`,
      ),
      workerEnv,
    );

    expect(response.status).toBe(200);
    const call = (workerEnv.ROOMS as FakeRooms).calls[0];
    expect(call?.request.headers.get("x-demo-device")).toBe("device-p1");
    expect(call?.request.headers.get("x-demo-slot")).toBe("p1");
    expect((workerEnv.DEMO_GATE as FakeGate).calls).toHaveLength(0);
  });

  it("checks the gate for a manual six-character join", async () => {
    const workerEnv = env();
    (workerEnv.DEMO_GATE as FakeGate).responses.set(
      "/is-active",
      () => json({ ok: true, expiresAt: Date.now() + 300_000 }),
    );
    const token = await deviceToken("device-p2");

    const response = await handleRequest(
      wsRequest(
        `/ws?room=ABC234&role=controller&slot=p2&device=${encodeURIComponent(token)}`,
      ),
      workerEnv,
    );

    expect(response.status).toBe(200);
    expect((workerEnv.DEMO_GATE as FakeGate).calls).toEqual(["/is-active"]);
    expect((workerEnv.ROOMS as FakeRooms).calls).toHaveLength(1);
  });

  it("rejects an inactive manual join without creating a room", async () => {
    const workerEnv = env();
    (workerEnv.DEMO_GATE as FakeGate).responses.set(
      "/is-active",
      () =>
        json(
          {
            error: {
              code: "ROOM_NOT_FOUND",
              message: "That room code is not active.",
            },
            retryAfterSeconds: 60,
          },
          404,
        ),
    );
    const token = await deviceToken("device-p2");

    const response = await handleRequest(
      wsRequest(
        `/ws?room=ABC234&role=controller&slot=p2&device=${encodeURIComponent(token)}`,
      ),
      workerEnv,
    );

    expect(response.status).toBe(404);
    expect(await body(response)).toMatchObject({
      error: { code: "ROOM_NOT_FOUND" },
    });
    expect((workerEnv.ROOMS as FakeRooms).calls).toHaveLength(0);
  });

  it("rejects invalid device tokens and room tickets before a room", async () => {
    const workerEnv = env();
    const token = await deviceToken();
    const ticket = await roomTicket();

    expect(
      (
        await handleRequest(
          wsRequest(
            `/ws?room=ABC234&role=controller&slot=p1&device=bad&ticket=${encodeURIComponent(ticket)}`,
          ),
          workerEnv,
        )
      ).status,
    ).toBe(401);

    expect(
      (
        await handleRequest(
          wsRequest(
            `/ws?room=ABC234&role=host&device=${encodeURIComponent(token)}&ticket=bad`,
          ),
          workerEnv,
        )
      ).status,
    ).toBe(403);

    const otherRoomTicket = await roomTicket("XYZ234");
    expect(
      (
        await handleRequest(
          wsRequest(
            `/ws?room=ABC234&role=host&device=${encodeURIComponent(token)}&ticket=${encodeURIComponent(otherRoomTicket)}`,
          ),
          workerEnv,
        )
      ).status,
    ).toBe(403);

    expect((workerEnv.ROOMS as FakeRooms).calls).toHaveLength(0);
  });

  it("rejects a controller without a slot", async () => {
    const workerEnv = env();
    const token = await deviceToken();
    const ticket = await roomTicket();

    const response = await handleRequest(
      wsRequest(
        `/ws?room=ABC234&role=controller&device=${encodeURIComponent(token)}&ticket=${encodeURIComponent(ticket)}`,
      ),
      workerEnv,
    );

    expect(response.status).toBe(400);
    expect((workerEnv.ROOMS as FakeRooms).calls).toHaveLength(0);
  });
});

describe("Worker edge validation", () => {
  it("rejects missing and disallowed Origins on every route", async () => {
    const missing = new Request("https://rooms.example.test/device", {
      method: "POST",
    });
    expect((await handleRequest(missing, env())).status).toBe(403);

    const disallowed = env("https://game.example.test");
    expect(
      (
        await handleRequest(
          postRequest("/device"),
          disallowed,
        )
      ).status,
    ).toBe(403);
  });

  it("accepts allowlisted origins with whitespace and a trailing slash", async () => {
    const response = await handleRequest(
      postRequest("/device"),
      env(" https://other.example.test , http://127.0.0.1:5173/ "),
    );
    expect(response.status).toBe(200);
  });

  it("answers CORS preflight for admission routes", async () => {
    const response = await handleRequest(
      new Request("https://rooms.example.test/session", {
        method: "OPTIONS",
        headers: {
          Origin: ORIGIN,
          "access-control-request-method": "POST",
        },
      }),
      env(),
    );

    expect(response.status).toBe(204);
    expect(response.headers.get("access-control-allow-origin")).toBe(ORIGIN);
    expect(response.headers.get("access-control-allow-methods")).toContain(
      "POST",
    );
  });

  it("rejects invalid rooms, roles, methods, paths, and non-upgrades", async () => {
    const token = await deviceToken();
    const ticket = await roomTicket();

    expect(
      (
        await handleRequest(
          wsRequest(
            `/ws?room=ABC&role=host&device=${encodeURIComponent(token)}&ticket=${encodeURIComponent(ticket)}`,
          ),
          env(),
        )
      ).status,
    ).toBe(400);
    expect(
      (
        await handleRequest(
          wsRequest(
            `/ws?room=ABC234&role=guest&device=${encodeURIComponent(token)}&ticket=${encodeURIComponent(ticket)}`,
          ),
          env(),
        )
      ).status,
    ).toBe(400);
    expect(
      (
        await handleRequest(
          new Request(
            "https://rooms.example.test/device",
            { method: "GET", headers: { Origin: ORIGIN } },
          ),
          env(),
        )
      ).status,
    ).toBe(405);
    expect(
      (
        await handleRequest(
          new Request(
            "https://rooms.example.test/not-ws",
            { headers: { Origin: ORIGIN } },
          ),
          env(),
        )
      ).status,
    ).toBe(404);

    const noUpgrade = new Request(
      "https://rooms.example.test/ws?room=ABC234&role=host",
      { headers: { Origin: ORIGIN } },
    );
    expect((await handleRequest(noUpgrade, env())).status).toBe(426);
  });
});
