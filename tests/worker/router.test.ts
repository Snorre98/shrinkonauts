import { describe, expect, it } from "vitest";
import { handleRequest } from "../../worker/src/router";
import type { WorkerEnv } from "../../worker/src/env";

const ORIGIN = "http://127.0.0.1:5173";

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

function env(origins = ORIGIN): WorkerEnv {
  return {
    ROOMS: new FakeRooms(),
    ALLOWED_ORIGINS: origins,
  };
}

function request(path = "/ws?room=abc234&role=host"): Request {
  return new Request(`https://rooms.example.test${path}`, {
    headers: {
      Origin: ORIGIN,
      Upgrade: "websocket",
    },
  });
}

async function body(response: Response): Promise<Record<string, unknown>> {
  return (await response.json()) as Record<string, unknown>;
}

describe("Worker router", () => {
  it("routes a valid host upgrade to the normalized room", async () => {
    const workerEnv = env();
    const response = await handleRequest(request(), workerEnv);

    expect(response.status).toBe(200);
    expect((workerEnv.ROOMS as FakeRooms).calls).toHaveLength(1);
    expect((workerEnv.ROOMS as FakeRooms).calls[0]?.room).toBe("ABC234");
    expect(
      new URL((workerEnv.ROOMS as FakeRooms).calls[0]?.request.url ?? "").searchParams.get(
        "role",
      ),
    ).toBe("host");
  });

  it("routes a valid controller upgrade", async () => {
    const workerEnv = env();
    const response = await handleRequest(
      request("/ws?room=ABC234&role=controller"),
      workerEnv,
    );

    expect(response.status).toBe(200);
    expect((workerEnv.ROOMS as FakeRooms).calls[0]?.room).toBe("ABC234");
  });

  it("rejects missing and disallowed Origins", async () => {
    const missing = new Request("https://rooms.example.test/ws?room=ABC234&role=host", {
      headers: { Upgrade: "websocket" },
    });
    const missingResponse = await handleRequest(missing, env());
    expect(missingResponse.status).toBe(403);
    expect(await body(missingResponse)).toMatchObject({
      error: { code: "ORIGIN_REJECTED" },
    });

    const allowed = env("https://game.example.test");
    const disallowedResponse = await handleRequest(request(), allowed);
    expect(disallowedResponse.status).toBe(403);
    expect(await body(disallowedResponse)).toMatchObject({
      error: { code: "ORIGIN_REJECTED" },
    });
  });

  it("accepts allowlisted origins with whitespace and a trailing slash", async () => {
    const response = await handleRequest(
      request(),
      env(" https://other.example.test , http://127.0.0.1:5173/ "),
    );
    expect(response.status).toBe(200);
  });

  it("rejects invalid rooms, roles, methods, paths, and non-upgrades", async () => {
    expect(
      (await handleRequest(request("/ws?room=ABC&role=host"), env())).status,
    ).toBe(400);
    expect(
      (await handleRequest(request("/ws?room=ABC234&role=guest"), env()))
        .status,
    ).toBe(400);
    expect(
      (
        await handleRequest(
          new Request("https://rooms.example.test/ws?room=ABC234&role=host", {
            method: "POST",
            headers: { Origin: ORIGIN, Upgrade: "websocket" },
          }),
          env(),
        )
      ).status,
    ).toBe(405);
    expect(
      (await handleRequest(request("/not-ws?room=ABC234&role=host"), env()))
        .status,
    ).toBe(404);

    const noUpgrade = new Request(
      "https://rooms.example.test/ws?room=ABC234&role=host",
      { headers: { Origin: ORIGIN } },
    );
    expect((await handleRequest(noUpgrade, env())).status).toBe(426);
  });
});
