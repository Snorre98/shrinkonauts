import type { PlayerSlot } from "../../src/net/protocol";
import { demoConfig } from "./demo-config";
import type { WorkerEnv } from "./env";
import {
  RoomCore,
  type ConnectionAttachment,
  type RoomSocket,
  type RoomSocketMetadata,
  type RoomSocketRole,
} from "./room-core";

class CloudflareSocket implements RoomSocket {
  constructor(
    private readonly socket: WebSocket,
    readonly metadata: RoomSocketMetadata,
  ) {}

  getAttachment(): unknown {
    return this.socket.deserializeAttachment();
  }

  setAttachment(value: ConnectionAttachment): void {
    this.socket.serializeAttachment(value);
  }

  send(message: Parameters<RoomSocket["send"]>[0]): void {
    try {
      this.socket.send(JSON.stringify(message));
    } catch {
      try {
        this.socket.close(1011, "send-failed");
      } catch {
        // The close event cleans up membership.
      }
    }
  }

  close(code = 1000, reason = "session-end"): void {
    try {
      this.socket.close(code, reason);
    } catch {
      // The socket is already closed.
    }
  }
}

const UNKNOWN_METADATA: RoomSocketMetadata = {
  deviceId: "",
  expiresAt: 0,
  slot: null,
};

function roomError(
  code: string,
  message: string,
  status = 400,
): Response {
  return new Response(JSON.stringify({ error: { code, message } }), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}

function parseSlot(value: string | null): PlayerSlot | null {
  return value === "p1" || value === "p2" ? value : null;
}

export class GameRoom implements DurableObject {
  private readonly core: RoomCore;
  private readonly sockets = new Map<WebSocket, CloudflareSocket>();
  private alarmAt: number | null = null;

  constructor(
    private readonly ctx: DurableObjectState,
    private readonly env: WorkerEnv,
  ) {
    const config = demoConfig(env);
    this.core = new RoomCore({
      maxMessagesPerRoom: config.maxMessagesPerRoom,
      maxControllerMessagesPerSecond:
        config.maxControllerMessagesPerSecond,
      maxHostMessagesPerSecond: config.maxHostMessagesPerSecond,
      maxJoinsPerRoom: config.maxJoinsPerRoom,
      handshakeTimeoutMs: config.handshakeTimeoutMs,
      readyTimeoutMs: config.readyTimeoutMs,
      allowHostDeviceAsController: config.allowHostDeviceAsController,
      onRoomEnd: (reason, expiresAt) => {
        this.ctx.waitUntil(this.handleRoomEnd(reason, expiresAt));
      },
    });
    const namedRoom = this.ctx.id.name;
    if (namedRoom) this.core.setRoom(namedRoom);
    for (const socket of this.ctx.getWebSockets()) {
      const adapter = new CloudflareSocket(socket, UNKNOWN_METADATA);
      this.sockets.set(socket, adapter);
      this.core.restore(adapter);
    }
    // A room can wake after its session expiry. End it before scheduling.
    this.core.onAlarm(Date.now());
    void this.scheduleAlarm();
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    if (request.headers.get("Upgrade")?.toLowerCase() !== "websocket") {
      return roomError(
        "PROTOCOL_ERROR",
        "Expected a WebSocket upgrade",
        426,
      );
    }

    const role = url.searchParams.get("role");
    if (role !== "host" && role !== "controller") {
      return roomError("PROTOCOL_ERROR", "Role must be host or controller");
    }
    if (!this.core.setRoom(url.searchParams.get("room") ?? "")) {
      return roomError("ROOM_INVALID", "Room code is invalid");
    }

    const deviceId =
      request.headers.get("x-demo-device")?.trim() ?? "";
    const expiresAt = Number.parseInt(
      request.headers.get("x-demo-expires") ?? "",
      10,
    );
    const slot = parseSlot(url.searchParams.get("slot"));
    const metadata: RoomSocketMetadata = {
      deviceId,
      expiresAt: Number.isFinite(expiresAt) ? expiresAt : 0,
      slot: role === "controller" ? slot : null,
    };

    if (role === "controller" && !slot) {
      return roomError(
        "PROTOCOL_ERROR",
        "A controller slot is required",
      );
    }

    const decision = this.core.canConnect(
      role as RoomSocketRole,
      metadata,
    );
    if (!decision.ok) {
      return roomError(decision.code, decision.message, decision.status);
    }

    const pair = new WebSocketPair();
    const client = pair[0];
    const server = pair[1];
    this.ctx.acceptWebSocket(server);
    const adapter = new CloudflareSocket(server, metadata);
    this.sockets.set(server, adapter);
    const connected = this.core.onConnect(
      adapter,
      role as RoomSocketRole,
    );
    if (!connected) {
      adapter.close(1008, "rejected");
      return roomError(
        "ROOM_FULL",
        "The room rejected the connection",
        409,
      );
    }
    await this.scheduleAlarm();

    return new Response(null, {
      status: 101,
      webSocket: client,
    });
  }

  webSocketMessage(ws: WebSocket, message: string | ArrayBuffer): void {
    const adapter = this.adapter(ws);
    if (typeof message !== "string") {
      adapter.close(1003, "binary-unsupported");
      return;
    }
    this.core.onMessage(adapter, message);
    void this.scheduleAlarm();
  }

  webSocketClose(
    ws: WebSocket,
    _code: number,
    _reason: string,
    _wasClean: boolean,
  ): void {
    const adapter = this.sockets.get(ws);
    this.sockets.delete(ws);
    if (adapter) this.core.onClose(adapter);
    void this.scheduleAlarm();
  }

  webSocketError(ws: WebSocket, _error: unknown): void {
    const adapter = this.sockets.get(ws);
    this.sockets.delete(ws);
    if (adapter) this.core.onClose(adapter);
    void this.scheduleAlarm();
  }

  async alarm(): Promise<void> {
    this.core.onAlarm(Date.now());
    await this.scheduleAlarm();
  }

  private adapter(ws: WebSocket): CloudflareSocket {
    const existing = this.sockets.get(ws);
    if (existing) return existing;
    const adapter = new CloudflareSocket(ws, UNKNOWN_METADATA);
    this.sockets.set(ws, adapter);
    this.core.restore(adapter);
    return adapter;
  }

  private async scheduleAlarm(): Promise<void> {
    const at = this.core.nextAlarmAt(Date.now());
    if (at === this.alarmAt) return;
    this.alarmAt = at;
    if (at === null) {
      await this.ctx.storage.deleteAlarm();
    } else {
      await this.ctx.storage.setAlarm(at);
    }
  }

  private async handleRoomEnd(
    _reason: string,
    expiresAt: number | null,
  ): Promise<void> {
    this.alarmAt = null;
    try {
      await this.ctx.storage.deleteAlarm();
    } catch {
      // The alarm is best-effort; the gate lease also expires.
    }
    if (!this.core.roomCode) return;
    try {
      await this.env.DEMO_GATE.getByName("global").fetch(
        new Request("https://demo-gate.internal/release", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            room: this.core.roomCode,
            ...(expiresAt !== null ? { expiresAt } : {}),
          }),
        }),
      );
    } catch {
      // The gate lease expires on its own.
    }
  }
}
