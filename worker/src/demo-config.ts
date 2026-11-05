/**
 * Demo quota and admission configuration.
 *
 * All values are plain Worker vars so the deployed limits can be tuned without
 * a code change. The defaults match the deployed demo configuration; ADR-0082
 * records the original guard, amended on 2026-11-05 to 20 minutes and 30,000
 * messages. The clamps keep a bad env value from disabling the guard or making
 * a session unbounded.
 */

export interface DemoEnv {
  DEMO_MAX_SESSIONS_PER_DAY?: string;
  DEMO_MAX_CONCURRENT_ROOMS?: string;
  DEMO_MAX_WS_ATTEMPTS_PER_DAY?: string;
  DEMO_MAX_DEVICE_ISSUES_PER_DAY?: string;
  DEMO_MAX_SESSION_MINUTES?: string;
  DEMO_MAX_MESSAGES_PER_ROOM?: string;
  DEMO_MAX_CONTROLLER_MESSAGES_PER_SECOND?: string;
  DEMO_MAX_HOST_MESSAGES_PER_SECOND?: string;
  DEMO_MAX_JOINS_PER_ROOM?: string;
  DEMO_RECONNECT_GRACE_SECONDS?: string;
  DEMO_HANDSHAKE_TIMEOUT_SECONDS?: string;
  DEMO_READY_TIMEOUT_SECONDS?: string;
  DEMO_DEVICE_TOKEN_TTL_HOURS?: string;
  DEMO_IP_WS_ATTEMPTS_PER_MINUTE?: string;
  DEMO_IP_SESSION_ATTEMPTS_PER_MINUTE?: string;
  DEMO_IP_DEVICE_ISSUES_PER_MINUTE?: string;
  DEMO_ALLOW_HOST_DEVICE_AS_CONTROLLER?: string;
  DEMO_SIGNING_SECRET?: string;
}

export interface DemoConfig {
  maxSessionsPerDay: number;
  maxConcurrentRooms: number;
  maxWsAttemptsPerDay: number;
  maxDeviceIssuesPerDay: number;
  maxSessionMs: number;
  maxMessagesPerRoom: number;
  maxControllerMessagesPerSecond: number;
  maxHostMessagesPerSecond: number;
  maxJoinsPerRoom: number;
  reconnectGraceMs: number;
  handshakeTimeoutMs: number;
  readyTimeoutMs: number;
  deviceTokenTtlMs: number;
  ipWsAttemptsPerMinute: number;
  ipSessionAttemptsPerMinute: number;
  ipDeviceIssuesPerMinute: number;
  allowHostDeviceAsController: boolean;
  signingSecret: string;
}

const DEV_SIGNING_SECRET = "shrinkonauts-dev-only-signing-secret";

function integer(
  value: string | undefined,
  fallback: number,
  min: number,
  max: number,
): number {
  if (value === undefined || value.trim() === "") return fallback;
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, parsed));
}

function boolean(value: string | undefined, fallback: boolean): boolean {
  if (value === undefined || value.trim() === "") return fallback;
  const normalized = value.trim().toLowerCase();
  if (normalized === "1" || normalized === "true" || normalized === "yes") {
    return true;
  }
  if (normalized === "0" || normalized === "false" || normalized === "no") {
    return false;
  }
  return fallback;
}

export function demoConfig(env: DemoEnv): DemoConfig {
  return {
    maxSessionsPerDay: integer(env.DEMO_MAX_SESSIONS_PER_DAY, 50, 1, 1_000),
    maxConcurrentRooms: integer(env.DEMO_MAX_CONCURRENT_ROOMS, 2, 1, 10),
    maxWsAttemptsPerDay: integer(
      env.DEMO_MAX_WS_ATTEMPTS_PER_DAY,
      5_000,
      100,
      100_000,
    ),
    maxDeviceIssuesPerDay: integer(
      env.DEMO_MAX_DEVICE_ISSUES_PER_DAY,
      500,
      10,
      10_000,
    ),
    maxSessionMs:
      integer(env.DEMO_MAX_SESSION_MINUTES, 20, 1, 30) * 60_000,
    maxMessagesPerRoom: integer(
      env.DEMO_MAX_MESSAGES_PER_ROOM,
      30_000,
      1_000,
      200_000,
    ),
    maxControllerMessagesPerSecond: integer(
      env.DEMO_MAX_CONTROLLER_MESSAGES_PER_SECOND,
      20,
      5,
      120,
    ),
    maxHostMessagesPerSecond: integer(
      env.DEMO_MAX_HOST_MESSAGES_PER_SECOND,
      60,
      10,
      120,
    ),
    maxJoinsPerRoom: integer(env.DEMO_MAX_JOINS_PER_ROOM, 20, 4, 200),
    reconnectGraceMs:
      integer(env.DEMO_RECONNECT_GRACE_SECONDS, 60, 10, 300) * 1_000,
    handshakeTimeoutMs:
      integer(env.DEMO_HANDSHAKE_TIMEOUT_SECONDS, 10, 3, 60) * 1_000,
    readyTimeoutMs:
      integer(env.DEMO_READY_TIMEOUT_SECONDS, 15, 5, 120) * 1_000,
    deviceTokenTtlMs:
      integer(env.DEMO_DEVICE_TOKEN_TTL_HOURS, 24, 1, 168) * 3_600_000,
    ipWsAttemptsPerMinute: integer(
      env.DEMO_IP_WS_ATTEMPTS_PER_MINUTE,
      30,
      5,
      300,
    ),
    ipSessionAttemptsPerMinute: integer(
      env.DEMO_IP_SESSION_ATTEMPTS_PER_MINUTE,
      10,
      1,
      60,
    ),
    ipDeviceIssuesPerMinute: integer(
      env.DEMO_IP_DEVICE_ISSUES_PER_MINUTE,
      10,
      1,
      60,
    ),
    allowHostDeviceAsController: boolean(
      env.DEMO_ALLOW_HOST_DEVICE_AS_CONTROLLER,
      false,
    ),
    signingSecret: env.DEMO_SIGNING_SECRET?.trim() || DEV_SIGNING_SECRET,
  };
}

/** Cloudflare's free-tier counters reset at 00:00 UTC. */
export function utcDay(now: number): string {
  return new Date(now).toISOString().slice(0, 10);
}
