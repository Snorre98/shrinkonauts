import { describe, expect, it } from "vitest";
import { GateCore } from "../../worker/src/gate-core";

const DAY = Date.UTC(2026, 10, 4, 12, 0, 0);

function gate(overrides: Partial<ConstructorParameters<typeof GateCore>[0]> = {}) {
  let now = DAY;
  const core = new GateCore({
    maxSessionsPerDay: 2,
    maxConcurrentRooms: 2,
    maxWsAttemptsPerDay: 100,
    maxDeviceIssuesPerDay: 2,
    maxSessionMs: 300_000,
    now: () => now,
    ...overrides,
  });
  return {
    core,
    advance(ms: number) {
      now += ms;
    },
    setNow(value: number) {
      now = value;
    },
  };
}

describe("GateCore", () => {
  it("admits a session and reuses the same room for the same host device", () => {
    const { core } = gate();
    const first = core.admitSession("ABC234", "device-host");
    expect(first).toMatchObject({ ok: true, reused: false });

    const again = core.admitSession("ABC234", "device-host");
    expect(again).toMatchObject({ ok: true, reused: true });
    expect(core.snapshot().sessions).toBe(1);
  });

  it("rejects a different host device taking an active room code", () => {
    const { core } = gate();
    core.admitSession("ABC234", "device-host");

    expect(core.admitSession("ABC234", "device-other")).toMatchObject({
      ok: false,
      code: "ROOM_TAKEN",
      status: 409,
    });
  });

  it("enforces the daily session and concurrent-room caps", () => {
    const { core } = gate({
      maxSessionsPerDay: 10,
      maxConcurrentRooms: 2,
    });
    expect(core.admitSession("AAA111", "device-a")).toMatchObject({
      ok: true,
    });
    expect(core.admitSession("BBB222", "device-b")).toMatchObject({
      ok: true,
    });
    expect(core.admitSession("CCC333", "device-c")).toMatchObject({
      ok: false,
      code: "DEMO_BUSY",
      status: 429,
    });

    core.release("AAA111");
    expect(core.admitSession("CCC333", "device-c")).toMatchObject({
      ok: true,
    });
    expect(core.snapshot().sessions).toBe(3);
  });

  it("supersedes an earlier active room for the same host device", () => {
    const { core } = gate({
      maxConcurrentRooms: 1,
      maxSessionsPerDay: 10,
    });
    expect(core.admitSession("AAA111", "device-a")).toMatchObject({
      ok: true,
    });
    expect(core.admitSession("BBB222", "device-a")).toMatchObject({
      ok: true,
    });
    expect(core.snapshot().active.AAA111).toBeUndefined();
    expect(core.snapshot().active.BBB222).toBeDefined();
  });

  it("enforces the daily session cap after releases", () => {
    const { core } = gate({ maxSessionsPerDay: 1, maxConcurrentRooms: 2 });
    core.admitSession("AAA111", "device-a");
    core.release("AAA111");

    expect(core.admitSession("BBB222", "device-b")).toMatchObject({
      ok: false,
      code: "DEMO_SESSIONS",
      status: 429,
    });
  });

  it("counts connection attempts and enforces the daily attempt cap", () => {
    const { core } = gate({ maxWsAttemptsPerDay: 2 });
    expect(core.isActive("ABC234")).toMatchObject({
      ok: false,
      code: "ROOM_NOT_FOUND",
    });
    expect(core.isActive("ABC234")).toMatchObject({
      ok: false,
      code: "ROOM_NOT_FOUND",
    });
    expect(core.isActive("ABC234")).toMatchObject({
      ok: false,
      code: "DEMO_ATTEMPTS",
      status: 429,
    });
  });

  it("reports an active room until its lease expires", () => {
    const { core, advance } = gate();
    const admitted = core.admitSession("ABC234", "device-host");
    expect(admitted.ok).toBe(true);
    expect(core.isActive("ABC234")).toMatchObject({
      ok: true,
      expiresAt: DAY + 300_000,
    });

    advance(300_001);
    expect(core.isActive("ABC234")).toMatchObject({
      ok: false,
      code: "ROOM_NOT_FOUND",
    });
  });

  it("ignores a stale release for an older lease", () => {
    const { core } = gate();
    const admitted = core.admitSession("AAA111", "device-a");
    if (!admitted.ok || admitted.expiresAt === undefined) {
      throw new Error("expected an admitted session");
    }

    core.release("AAA111", admitted.expiresAt + 1);
    expect(core.isActive("AAA111")).toMatchObject({ ok: true });

    core.release("AAA111", admitted.expiresAt);
    expect(core.isActive("AAA111")).toMatchObject({
      ok: false,
      code: "ROOM_NOT_FOUND",
    });
  });

  it("limits device issuance per day", () => {
    const { core } = gate({ maxDeviceIssuesPerDay: 2 });
    expect(core.issueDevice()).toMatchObject({ ok: true });
    expect(core.issueDevice()).toMatchObject({ ok: true });
    expect(core.issueDevice()).toMatchObject({
      ok: false,
      code: "DEMO_DEVICE_LIMIT",
      status: 429,
    });
  });

  it("resets all daily counters at 00:00 UTC", () => {
    const { core, setNow } = gate({ maxSessionsPerDay: 1 });
    core.admitSession("AAA111", "device-a");
    expect(core.admitSession("BBB222", "device-b")).toMatchObject({
      ok: false,
      code: "DEMO_SESSIONS",
    });

    setNow(Date.UTC(2026, 10, 5, 0, 0, 1));
    expect(core.admitSession("BBB222", "device-b")).toMatchObject({
      ok: true,
    });
    expect(core.snapshot().sessions).toBe(1);
  });

  it("restores and snapshots state", () => {
    const first = gate();
    first.core.admitSession("ABC234", "device-host");
    first.core.issueDevice();

    const second = gate();
    second.core.restore(first.core.snapshot());
    expect(second.core.isActive("ABC234")).toMatchObject({ ok: true });
    expect(second.core.snapshot().deviceIssues).toBe(1);
  });
});
