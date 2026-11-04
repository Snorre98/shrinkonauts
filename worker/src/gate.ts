import { demoConfig } from "./demo-config";
import type { WorkerEnv } from "./env";
import {
  GateCore,
  type GateDecision,
  type GateState,
} from "./gate-core";

const JSON_HEADERS = {
  "content-type": "application/json; charset=utf-8",
  "cache-control": "no-store",
};

function json(value: unknown, status = 200, retryAfter?: number): Response {
  const headers = new Headers(JSON_HEADERS);
  if (retryAfter !== undefined) {
    headers.set("retry-after", String(retryAfter));
  }
  return new Response(JSON.stringify(value), { status, headers });
}

function decisionResponse(decision: GateDecision): Response {
  if (decision.ok) return json(decision);
  return json(
    {
      error: { code: decision.code, message: decision.message },
      retryAfterSeconds: decision.retryAfterSeconds,
    },
    decision.status,
    decision.retryAfterSeconds,
  );
}

async function readBody(request: Request): Promise<Record<string, unknown>> {
  try {
    const value = (await request.json()) as unknown;
    return typeof value === "object" && value !== null && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : {};
  } catch {
    return {};
  }
}

/**
 * Singleton Durable Object that owns the demo's daily budget and active-room
 * registry. It is deliberately not a room: it never sees input or game state.
 */
export class DemoGate implements DurableObject {
  private readonly core: GateCore;
  private loaded: Promise<void> | null = null;

  constructor(
    private readonly ctx: DurableObjectState,
    env: WorkerEnv,
  ) {
    const config = demoConfig(env);
    this.core = new GateCore({
      maxSessionsPerDay: config.maxSessionsPerDay,
      maxConcurrentRooms: config.maxConcurrentRooms,
      maxWsAttemptsPerDay: config.maxWsAttemptsPerDay,
      maxDeviceIssuesPerDay: config.maxDeviceIssuesPerDay,
      maxSessionMs: config.maxSessionMs,
    });
  }

  async fetch(request: Request): Promise<Response> {
    await this.ensureLoaded();
    const url = new URL(request.url);
    const body = await readBody(request);

    switch (url.pathname) {
      case "/admit-session": {
        if (typeof body.room !== "string" || typeof body.deviceId !== "string") {
          return json(
            { error: { code: "BAD_MESSAGE", message: "room and deviceId are required" } },
            400,
          );
        }
        const decision = this.core.admitSession(body.room, body.deviceId);
        await this.save();
        return decisionResponse(decision);
      }

      case "/is-active": {
        if (typeof body.room !== "string") {
          return json(
            { error: { code: "BAD_MESSAGE", message: "room is required" } },
            400,
          );
        }
        const decision = this.core.isActive(body.room);
        await this.save();
        return decisionResponse(decision);
      }

      case "/issue-device": {
        const decision = this.core.issueDevice();
        await this.save();
        return decisionResponse(decision);
      }

      case "/release": {
        if (typeof body.room === "string") {
          this.core.release(
            body.room,
            Number.isInteger(body.expiresAt)
              ? (body.expiresAt as number)
              : undefined,
          );
          await this.save();
        }
        return json({ ok: true });
      }

      default:
        return json(
          { error: { code: "ROOM_INVALID", message: "Unknown gate route" } },
          404,
        );
    }
  }

  private ensureLoaded(): Promise<void> {
    this.loaded ??= this.load();
    return this.loaded;
  }

  private async load(): Promise<void> {
    const stored = await this.ctx.storage.get<GateState>("state");
    if (stored) this.core.restore(stored);
  }

  private async save(): Promise<void> {
    await this.ctx.storage.put("state", this.core.snapshot());
  }
}
