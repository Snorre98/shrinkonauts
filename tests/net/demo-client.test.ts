import { beforeEach, describe, expect, it } from "vitest";
import {
  DemoClientError,
  clearDeviceToken,
  createRoomSession,
  ensureDeviceToken,
  releaseRoomSession,
} from "../../src/net/demo-client";

const NET = "ws://127.0.0.1:8787";

class MemoryStorage {
  readonly values = new Map<string, string>();

  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.values.set(key, value);
  }

  removeItem(key: string): void {
    this.values.delete(key);
  }
}

function json(value: unknown, status = 200): Response {
  return new Response(JSON.stringify(value), {
    status,
    headers: { "content-type": "application/json" },
  });
}

beforeEach(() => {
  clearDeviceToken();
});

describe("demo admission client", () => {
  it("requests and caches a device token", async () => {
    const storage = new MemoryStorage();
    const calls: string[] = [];
    const fetchImpl = (async (input: RequestInfo | URL) => {
      calls.push(String(input));
      return json({
        deviceId: "device-1",
        token: "token-1",
        expiresAt: 2_000_000,
      });
    }) as typeof fetch;

    const first = await ensureDeviceToken({
      netUrl: NET,
      fetchImpl,
      storage,
      now: () => 1_000,
    });
    const second = await ensureDeviceToken({
      netUrl: NET,
      fetchImpl,
      storage,
      now: () => 1_000,
    });

    expect(first).toEqual({
      deviceId: "device-1",
      token: "token-1",
      expiresAt: 2_000_000,
    });
    expect(second).toEqual(first);
    expect(calls).toEqual(["http://127.0.0.1:8787/device"]);
  });

  it("refreshes a token that is close to expiry", async () => {
    const storage = new MemoryStorage();
    let issued = 0;
    const fetchImpl = (async () => {
      issued += 1;
      return json({
        deviceId: `device-${issued}`,
        token: `token-${issued}`,
        expiresAt: 2_000_000,
      });
    }) as typeof fetch;

    await ensureDeviceToken({
      netUrl: NET,
      fetchImpl,
      storage,
      now: () => 1_000,
    });
    const refreshed = await ensureDeviceToken({
      netUrl: NET,
      fetchImpl,
      storage,
      now: () => 1_999_500,
    });

    expect(issued).toBe(2);
    expect(refreshed.token).toBe("token-2");
  });

  it("uses the configured relay path for HTTP admission endpoints", async () => {
    const calls: string[] = [];
    const fetchImpl = (async (input: RequestInfo | URL) => {
      calls.push(String(input));
      return json({
        deviceId: "device-1",
        token: "token-1",
        expiresAt: 2_000_000,
      });
    }) as typeof fetch;

    await ensureDeviceToken({
      netUrl: "wss://relay.example.test/custom/ws",
      fetchImpl,
      storage: new MemoryStorage(),
      now: () => 1_000,
    });

    expect(calls).toEqual(["https://relay.example.test/custom/device"]);
  });

  it("creates a room session with the device token", async () => {
    const calls: { url: string; init?: RequestInit }[] = [];
    const fetchImpl = (async (
      input: RequestInfo | URL,
      init?: RequestInit,
    ) => {
      calls.push({ url: String(input), init });
      return json({
        room: "ABC234",
        ticket: "ticket-1",
        expiresAt: 2_000_000,
      });
    }) as typeof fetch;

    const session = await createRoomSession(
      { netUrl: NET, fetchImpl },
      "abc234",
      "token-1",
    );

    expect(session).toEqual({
      room: "ABC234",
      ticket: "ticket-1",
      expiresAt: 2_000_000,
    });
    expect(calls[0]?.url).toBe("http://127.0.0.1:8787/session");
    expect(calls[0]?.init?.method).toBe("POST");
    expect(JSON.parse(String(calls[0]?.init?.body))).toEqual({
      room: "abc234",
      deviceToken: "token-1",
    });
  });

  it("posts a best-effort session release", async () => {
    const calls: { url: string; init?: RequestInit }[] = [];
    const fetchImpl = (async (
      input: RequestInfo | URL,
      init?: RequestInit,
    ) => {
      calls.push({ url: String(input), init });
      return json({ ok: true });
    }) as typeof fetch;

    await releaseRoomSession(
      { netUrl: NET, fetchImpl },
      "ABC234",
      "ticket-1",
    );

    expect(calls[0]?.url).toBe("http://127.0.0.1:8787/session/release");
    expect(JSON.parse(String(calls[0]?.init?.body))).toEqual({
      room: "ABC234",
      ticket: "ticket-1",
    });
  });

  it("maps gate failures to a typed error", async () => {
    const fetchImpl = (async () =>
      json(
        {
          error: {
            code: "DEMO_SESSIONS",
            message: "The demo has reached its daily session limit.",
          },
          retryAfterSeconds: 120,
        },
        429,
      )) as typeof fetch;

    await expect(
      createRoomSession({ netUrl: NET, fetchImpl }, "ABC234", "token-1"),
    ).rejects.toMatchObject({
      code: "DEMO_SESSIONS",
      status: 429,
      retryAfterSeconds: 120,
    });
  });

  it("reports a network failure as DEMO_UNAVAILABLE", async () => {
    const fetchImpl = (async () => {
      throw new Error("offline");
    }) as typeof fetch;

    await expect(
      ensureDeviceToken({
        netUrl: NET,
        fetchImpl,
        storage: new MemoryStorage(),
      }),
    ).rejects.toBeInstanceOf(DemoClientError);
  });
});
