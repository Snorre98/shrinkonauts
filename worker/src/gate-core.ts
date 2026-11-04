import { utcDay } from "./demo-config";

/**
 * Pure daily budget for the demo relay.
 *
 * One instance is persisted by the `DemoGate` Durable Object. It is
 * deliberately independent of room membership: it only answers "may this
 * session start?", "is this room active?" and "may this device token be
 * issued?".
 */

export interface GateActiveRoom {
  hostDeviceId: string;
  expiresAt: number;
}

export interface GateState {
  day: string;
  attempts: number;
  sessions: number;
  deviceIssues: number;
  active: Record<string, GateActiveRoom>;
}

export type GateDenialCode =
  | "DEMO_ATTEMPTS"
  | "DEMO_SESSIONS"
  | "DEMO_BUSY"
  | "DEMO_DEVICE_LIMIT"
  | "ROOM_TAKEN"
  | "ROOM_NOT_FOUND";

export type GateDecision =
  | { ok: true; expiresAt?: number; reused?: boolean }
  | {
      ok: false;
      code: GateDenialCode;
      message: string;
      status: number;
      retryAfterSeconds: number;
    };

export interface GateCoreOptions {
  maxSessionsPerDay: number;
  maxConcurrentRooms: number;
  maxWsAttemptsPerDay: number;
  maxDeviceIssuesPerDay: number;
  maxSessionMs: number;
  now?: () => number;
}

function freshState(day: string): GateState {
  return {
    day,
    attempts: 0,
    sessions: 0,
    deviceIssues: 0,
    active: {},
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isActiveRoom(value: unknown): value is GateActiveRoom {
  return (
    isRecord(value) &&
    typeof value.hostDeviceId === "string" &&
    Number.isFinite(value.expiresAt)
  );
}

function isGateState(value: unknown): value is GateState {
  if (!isRecord(value)) return false;
  if (typeof value.day !== "string") return false;
  if (!Number.isInteger(value.attempts) || (value.attempts as number) < 0) {
    return false;
  }
  if (!Number.isInteger(value.sessions) || (value.sessions as number) < 0) {
    return false;
  }
  if (
    !Number.isInteger(value.deviceIssues) ||
    (value.deviceIssues as number) < 0
  ) {
    return false;
  }
  if (!isRecord(value.active)) return false;
  return Object.values(value.active).every(isActiveRoom);
}

function retryAfterSeconds(now: number): number {
  const midnight = new Date(now);
  midnight.setUTCHours(24, 0, 0, 0);
  return Math.max(1, Math.ceil((midnight.getTime() - now) / 1_000));
}

function deny(
  code: GateDenialCode,
  message: string,
  status: number,
  now: number,
): GateDecision {
  return {
    ok: false,
    code,
    message,
    status,
    retryAfterSeconds: retryAfterSeconds(now),
  };
}

export class GateCore {
  private readonly now: () => number;
  private state: GateState;

  constructor(private readonly options: GateCoreOptions) {
    this.now = options.now ?? Date.now;
    this.state = freshState(utcDay(this.now()));
  }

  restore(value: unknown): void {
    if (isGateState(value)) {
      this.state = {
        day: value.day,
        attempts: value.attempts,
        sessions: value.sessions,
        deviceIssues: value.deviceIssues,
        active: { ...value.active },
      };
    }
  }

  snapshot(): GateState {
    return {
      ...this.state,
      active: { ...this.state.active },
    };
  }

  admitSession(room: string, hostDeviceId: string): GateDecision {
    const now = this.now();
    this.reset(now);
    if (this.state.attempts >= this.options.maxWsAttemptsPerDay) {
      return deny(
        "DEMO_ATTEMPTS",
        "The demo relay has reached its daily connection limit.",
        429,
        now,
      );
    }
    this.state.attempts += 1;

    const existing = this.state.active[room];
    if (existing && existing.expiresAt > now) {
      if (existing.hostDeviceId === hostDeviceId) {
        return { ok: true, expiresAt: existing.expiresAt, reused: true };
      }
      return deny(
        "ROOM_TAKEN",
        "That room code is already in use by another host device.",
        409,
        now,
      );
    }

    // A host device owns at most one active session. A plan change or a host
    // refresh can create a new room before the old room's release request has
    // landed; superseding the old lease avoids a false concurrency denial.
    for (const [code, active] of Object.entries(this.state.active)) {
      if (code !== room && active.hostDeviceId === hostDeviceId) {
        delete this.state.active[code];
      }
    }

    if (this.state.sessions >= this.options.maxSessionsPerDay) {
      return deny(
        "DEMO_SESSIONS",
        "The demo has reached its daily session limit.",
        429,
        now,
      );
    }
    if (
      Object.keys(this.state.active).length >=
      this.options.maxConcurrentRooms
    ) {
      return deny(
        "DEMO_BUSY",
        "The demo is at its concurrent-session limit. Try again shortly.",
        429,
        now,
      );
    }

    const expiresAt = now + this.options.maxSessionMs;
    this.state.sessions += 1;
    this.state.active[room] = { hostDeviceId, expiresAt };
    return { ok: true, expiresAt, reused: false };
  }

  isActive(room: string): GateDecision {
    const now = this.now();
    this.reset(now);
    if (this.state.attempts >= this.options.maxWsAttemptsPerDay) {
      return deny(
        "DEMO_ATTEMPTS",
        "The demo relay has reached its daily connection limit.",
        429,
        now,
      );
    }
    this.state.attempts += 1;

    const active = this.state.active[room];
    if (!active || active.expiresAt <= now) {
      return deny(
        "ROOM_NOT_FOUND",
        "That room code is not active.",
        404,
        now,
      );
    }
    return { ok: true, expiresAt: active.expiresAt };
  }

  issueDevice(): GateDecision {
    const now = this.now();
    this.reset(now);
    if (this.state.deviceIssues >= this.options.maxDeviceIssuesPerDay) {
      return deny(
        "DEMO_DEVICE_LIMIT",
        "The demo has reached its daily device limit.",
        429,
        now,
      );
    }
    this.state.deviceIssues += 1;
    return { ok: true };
  }

  release(room: string, expiresAt?: number): void {
    this.reset(this.now());
    const active = this.state.active[room];
    if (
      expiresAt !== undefined &&
      active !== undefined &&
      active.expiresAt !== expiresAt
    ) {
      // A late release from an old session must not delete a newer lease for
      // the same room code.
      return;
    }
    delete this.state.active[room];
  }

  private reset(now: number): void {
    const day = utcDay(now);
    if (this.state.day !== day) {
      this.state = freshState(day);
    }
    for (const [room, active] of Object.entries(this.state.active)) {
      if (active.expiresAt <= now) delete this.state.active[room];
    }
  }
}
