/**
 * Browser-side demo admission client.
 *
 * Device tokens are server-issued and cached per browser. The host and
 * controller pages share the same origin, so they share one device identity:
 * the host screen cannot also claim a controller slot.
 */

export interface DeviceToken {
  deviceId: string;
  token: string;
  expiresAt: number;
}

export interface RoomSession {
  room: string;
  ticket: string;
  expiresAt: number;
}

export interface DemoClientOptions {
  netUrl: string;
  fetchImpl?: typeof fetch;
  now?: () => number;
  storage?: Pick<Storage, "getItem" | "setItem" | "removeItem"> | null;
}

export class DemoClientError extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly status: number,
    readonly retryAfterSeconds: number | null = null,
  ) {
    super(message);
    this.name = "DemoClientError";
  }
}

const STORAGE_KEY = "shrinkonauts.device.v1";
const memory = new Map<string, DeviceToken>();
const pending = new Map<string, Promise<DeviceToken>>();

function safeStorage(
  options: DemoClientOptions,
): Pick<Storage, "getItem" | "setItem" | "removeItem"> | null {
  if (options.storage !== undefined) return options.storage;
  try {
    return typeof localStorage === "undefined" ? null : localStorage;
  } catch {
    return null;
  }
}

function baseUrl(netUrl: string): URL {
  const url = new URL(netUrl);
  url.protocol = url.protocol === "wss:" ? "https:" : "http:";
  url.pathname = url.pathname.replace(/\/ws$/, "");
  url.search = "";
  url.hash = "";
  if (!url.pathname.endsWith("/")) url.pathname += "/";
  return url;
}

function endpoint(netUrl: string, path: string): string {
  return new URL(path, baseUrl(netUrl)).toString();
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseError(
  status: number,
  payload: unknown,
): DemoClientError {
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
      : `The demo relay returned HTTP ${status}.`;
  const retryAfter =
    isRecord(payload) && Number.isInteger(payload.retryAfterSeconds)
      ? (payload.retryAfterSeconds as number)
      : null;
  return new DemoClientError(code, message, status, retryAfter);
}

async function readPayload(response: Response): Promise<unknown> {
  try {
    return (await response.json()) as unknown;
  } catch {
    return null;
  }
}

function readCached(
  options: DemoClientOptions,
): DeviceToken | null {
  const storage = safeStorage(options);
  if (!storage) return memory.get(options.netUrl) ?? null;
  try {
    const raw = storage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const value = JSON.parse(raw) as unknown;
    if (!isRecord(value)) return null;
    if (value.netUrl !== options.netUrl) return null;
    if (
      typeof value.deviceId !== "string" ||
      typeof value.token !== "string" ||
      !Number.isFinite(value.expiresAt)
    ) {
      return null;
    }
    return {
      deviceId: value.deviceId,
      token: value.token,
      expiresAt: value.expiresAt as number,
    };
  } catch {
    return null;
  }
}

function writeCached(
  options: DemoClientOptions,
  token: DeviceToken,
): void {
  memory.set(options.netUrl, token);
  const storage = safeStorage(options);
  if (!storage) return;
  try {
    storage.setItem(
      STORAGE_KEY,
      JSON.stringify({ netUrl: options.netUrl, ...token }),
    );
  } catch {
    // Private browsing and storage quotas are best-effort.
  }
}

export function clearDeviceToken(netUrl?: string): void {
  if (netUrl) {
    memory.delete(netUrl);
    pending.delete(netUrl);
  } else {
    memory.clear();
    pending.clear();
  }
  try {
    if (typeof localStorage !== "undefined") {
      localStorage.removeItem(STORAGE_KEY);
    }
  } catch {
    // Storage is best-effort.
  }
}

export async function ensureDeviceToken(
  options: DemoClientOptions,
): Promise<DeviceToken> {
  const now = options.now ?? Date.now;
  const cached = readCached(options);
  if (cached && cached.expiresAt > now() + 60_000) return cached;

  const existing = pending.get(options.netUrl);
  if (existing) return existing;

  const request = (async () => {
    const fetchImpl = options.fetchImpl ?? fetch;
    let response: Response;
    try {
      response = await fetchImpl(endpoint(options.netUrl, "device"), {
        method: "POST",
        headers: { accept: "application/json" },
      });
    } catch {
      throw new DemoClientError(
        "DEMO_UNAVAILABLE",
        "The demo relay could not be reached.",
        0,
      );
    }
    const payload = await readPayload(response);
    if (!response.ok) throw parseError(response.status, payload);
    if (
      !isRecord(payload) ||
      typeof payload.deviceId !== "string" ||
      typeof payload.token !== "string" ||
      !Number.isFinite(payload.expiresAt)
    ) {
      throw new DemoClientError(
        "DEMO_UNAVAILABLE",
        "The demo relay returned an invalid device token.",
        response.status,
      );
    }
    const token: DeviceToken = {
      deviceId: payload.deviceId,
      token: payload.token,
      expiresAt: payload.expiresAt as number,
    };
    writeCached(options, token);
    return token;
  })();

  pending.set(options.netUrl, request);
  try {
    return await request;
  } finally {
    pending.delete(options.netUrl);
  }
}

/**
 * Best-effort early release. The room Durable Object also releases the gate
 * lease when it ends; this call makes a hub plan change or an explicit "End
 * session" free the concurrent slot without waiting for that round trip.
 */
export async function releaseRoomSession(
  options: DemoClientOptions,
  room: string,
  ticket: string,
): Promise<void> {
  const fetchImpl = options.fetchImpl ?? fetch;
  try {
    await fetchImpl(endpoint(options.netUrl, "session/release"), {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ room, ticket }),
      keepalive: true,
    });
  } catch {
    // The gate lease expires on its own.
  }
}

export async function createRoomSession(
  options: DemoClientOptions,
  room: string,
  deviceToken: string,
): Promise<RoomSession> {
  const fetchImpl = options.fetchImpl ?? fetch;
  let response: Response;
  try {
    response = await fetchImpl(endpoint(options.netUrl, "session"), {
      method: "POST",
      headers: {
        accept: "application/json",
        "content-type": "application/json",
      },
      body: JSON.stringify({ room, deviceToken }),
    });
  } catch {
    throw new DemoClientError(
      "DEMO_UNAVAILABLE",
      "The demo relay could not be reached.",
      0,
    );
  }
  const payload = await readPayload(response);
  if (!response.ok) throw parseError(response.status, payload);
  if (
    !isRecord(payload) ||
    typeof payload.room !== "string" ||
    typeof payload.ticket !== "string" ||
    !Number.isFinite(payload.expiresAt)
  ) {
    throw new DemoClientError(
      "DEMO_UNAVAILABLE",
      "The demo relay returned an invalid session.",
      response.status,
    );
  }
  return {
    room: payload.room,
    ticket: payload.ticket,
    expiresAt: payload.expiresAt as number,
  };
}
