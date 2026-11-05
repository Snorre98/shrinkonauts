import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { demoConfig, utcDay } from "../../worker/src/demo-config";

const WRANGLER = fileURLToPath(
  new URL("../../worker/wrangler.jsonc", import.meta.url),
);

function wrangler(): Record<string, unknown> {
  return JSON.parse(readFileSync(WRANGLER, "utf8")) as Record<string, unknown>;
}

describe("demo configuration", () => {
  it("uses the ADR-0082 defaults", () => {
    const config = demoConfig({});
    expect(config.maxSessionsPerDay).toBe(50);
    expect(config.maxConcurrentRooms).toBe(2);
    expect(config.maxWsAttemptsPerDay).toBe(5_000);
    expect(config.maxDeviceIssuesPerDay).toBe(500);
    expect(config.maxSessionMs).toBe(5 * 60_000);
    expect(config.maxMessagesPerRoom).toBe(12_000);
    expect(config.maxControllerMessagesPerSecond).toBe(20);
    expect(config.maxHostMessagesPerSecond).toBe(60);
    expect(config.maxJoinsPerRoom).toBe(20);
    expect(config.allowHostDeviceAsController).toBe(false);
  });

  it("clamps unsafe env values and accepts overrides", () => {
    const config = demoConfig({
      DEMO_MAX_SESSIONS_PER_DAY: "9999",
      DEMO_MAX_CONCURRENT_ROOMS: "0",
      DEMO_MAX_SESSION_MINUTES: "999",
      DEMO_MAX_MESSAGES_PER_ROOM: "1",
      DEMO_MAX_CONTROLLER_MESSAGES_PER_SECOND: "1",
      DEMO_ALLOW_HOST_DEVICE_AS_CONTROLLER: "true",
      DEMO_SIGNING_SECRET: "configured-secret",
    });
    expect(config.maxSessionsPerDay).toBe(1_000);
    expect(config.maxConcurrentRooms).toBe(1);
    expect(config.maxSessionMs).toBe(30 * 60_000);
    expect(config.maxMessagesPerRoom).toBe(1_000);
    expect(config.maxControllerMessagesPerSecond).toBe(5);
    expect(config.allowHostDeviceAsController).toBe(true);
    expect(config.signingSecret).toBe("configured-secret");
  });

  it("resets the daily budget on the UTC day boundary", () => {
    expect(utcDay(Date.UTC(2026, 10, 4, 23, 59, 59))).toBe("2026-11-04");
    expect(utcDay(Date.UTC(2026, 10, 5, 0, 0, 0))).toBe("2026-11-05");
  });

  it("keeps Workers Logs disabled and the gate wired in wrangler.jsonc", () => {
    const config = wrangler();
    expect(config.observability).toEqual({ enabled: false });

    const bindings = config.durable_objects as {
      bindings: { name: string; class_name: string }[];
    };
    expect(bindings.bindings).toEqual(
      expect.arrayContaining([
        { name: "ROOMS", class_name: "GameRoom" },
        { name: "DEMO_GATE", class_name: "DemoGate" },
      ]),
    );

    const exports = config.exports as Record<string, unknown>;
    expect(exports.GameRoom).toMatchObject({ type: "durable-object" });
    expect(exports.DemoGate).toMatchObject({ type: "durable-object" });

    const vars = config.vars as Record<string, string>;
    expect(vars.DEMO_MAX_SESSIONS_PER_DAY).toBe("50");
    expect(vars.DEMO_MAX_SESSION_MINUTES).toBe("5");
    expect(vars).not.toHaveProperty("DEMO_SIGNING_SECRET");
  });

  it("allows the production Pages origin and local development only", () => {
    const config = wrangler();
    const vars = config.vars as Record<string, string>;
    const origins = vars.ALLOWED_ORIGINS.split(",");
    expect(origins).toEqual(
      expect.arrayContaining([
        "http://127.0.0.1:5173",
        "http://localhost:5173",
        "http://127.0.0.1:4173",
        "http://localhost:4173",
        "https://snorre98.github.io",
      ]),
    );
    expect(origins).not.toContain("https://shrinkonauts-m4-spike.pages.dev");
    expect(origins.some((origin) => origin.includes("pages.dev"))).toBe(false);
  });
});
