import {
  RoomCore,
  type ConnectionAttachment,
  type RoomSocket,
  type RoomSocketRole,
} from "./room-core";

class CloudflareSocket implements RoomSocket {
  constructor(private readonly socket: WebSocket) {}

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

export class GameRoom implements DurableObject {
  private readonly core: RoomCore;
  private readonly sockets = new Map<WebSocket, CloudflareSocket>();

  constructor(private readonly ctx: DurableObjectState) {
    this.core = new RoomCore();
    for (const socket of this.ctx.getWebSockets()) {
      const adapter = new CloudflareSocket(socket);
      this.sockets.set(socket, adapter);
      this.core.restore(adapter);
    }
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
    if (role === "host" && this.core.hasHost) {
      return roomError(
        "ROOM_FULL",
        "Host slot is already occupied",
        409,
      );
    }
    if (role === "controller" && !this.core.hasHost) {
      return roomError(
        "SLOT_UNAVAILABLE",
        "Host is not connected",
        409,
      );
    }
    if (role === "controller" && this.core.controllerCount >= 2) {
      return roomError(
        "ROOM_FULL",
        "Both controller slots are occupied",
        409,
      );
    }

    const pair = new WebSocketPair();
    const client = pair[0];
    const server = pair[1];
    this.ctx.acceptWebSocket(server);
    const adapter = new CloudflareSocket(server);
    this.sockets.set(server, adapter);
    this.core.onConnect(adapter, role as RoomSocketRole);

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
  }

  webSocketError(ws: WebSocket, _error: unknown): void {
    const adapter = this.sockets.get(ws);
    this.sockets.delete(ws);
    if (adapter) this.core.onClose(adapter);
  }

  private adapter(ws: WebSocket): CloudflareSocket {
    const existing = this.sockets.get(ws);
    if (existing) return existing;
    const adapter = new CloudflareSocket(ws);
    this.sockets.set(ws, adapter);
    this.core.restore(adapter);
    return adapter;
  }
}
