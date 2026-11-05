import { describe, expect, it } from "vitest";
import {
  PROTOCOL_VERSION,
  decodeHostServerMessage,
  type HostClientMessage,
  type HostServerMessage,
  type ProtocolError,
  type RoomStateMessage,
} from "../../src/net/protocol";
import { WebSocketRoomTransport } from "../../src/net/transport";

type Listener = (event: unknown) => void;

class FakeSocket {
  readonly sent: string[] = [];
  readonly listeners = new Map<string, Set<Listener>>();
  closeArgs: { code?: number; reason?: string } | null = null;

  addEventListener(type: string, listener: Listener): void {
    const listeners = this.listeners.get(type) ?? new Set<Listener>();
    listeners.add(listener);
    this.listeners.set(type, listeners);
  }

  emit(type: string, event: unknown = {}): void {
    for (const listener of [...(this.listeners.get(type) ?? [])]) {
      listener(event);
    }
  }

  send(data: string): void {
    this.sent.push(data);
  }

  close(code?: number, reason?: string): void {
    this.closeArgs = { code, reason };
  }
}

function makeTransport(socket: FakeSocket) {
  const errors: ProtocolError[] = [];
  const transport = new WebSocketRoomTransport<
    HostClientMessage,
    HostServerMessage
  >({
    url: "ws://example.test/ws",
    decode: decodeHostServerMessage,
    createSocket: () => socket as unknown as WebSocket,
    onProtocolError: (error) => errors.push(error),
  });
  return { transport, errors };
}

describe("WebSocketRoomTransport", () => {
  it("opens, sends encoded messages, and delivers decoded messages", async () => {
    const socket = new FakeSocket();
    const { transport } = makeTransport(socket);
    const received: HostServerMessage[] = [];
    transport.onMessage((message) => received.push(message));

    const connecting = transport.connect();
    socket.emit("open");
    await connecting;

    expect(transport.state).toBe("open");
    const hello: HostClientMessage = {
      v: PROTOCOL_VERSION,
      t: "host-hello",
      room: "ABC234",
      buildId: "build",
      protocol: PROTOCOL_VERSION,
      phoneSlots: ["p2"],
    };
    transport.send(hello);
    expect(JSON.parse(socket.sent[0] ?? "null")).toEqual(hello);

    const roomState: RoomStateMessage = {
      v: PROTOCOL_VERSION,
      t: "room-state",
      slots: [{ slot: "p2", connected: true, ready: true }],
    };
    socket.emit("message", { data: JSON.stringify(roomState) });
    expect(received).toEqual([roomState]);

    transport.close("done");
    expect(transport.state).toBe("closed");
    expect(socket.closeArgs).toEqual({ code: 1000, reason: "done" });
  });

  it("rejects when the socket closes before opening", async () => {
    const socket = new FakeSocket();
    const { transport } = makeTransport(socket);

    const connecting = transport.connect();
    socket.emit("close");

    await expect(connecting).rejects.toThrow("TRANSPORT_CLOSED");
    expect(transport.state).toBe("closed");
  });

  it("closes and reports malformed or invalid protocol messages", async () => {
    const socket = new FakeSocket();
    const { transport, errors } = makeTransport(socket);
    const connecting = transport.connect();
    socket.emit("open");
    await connecting;

    socket.emit("message", { data: "{" });

    expect(errors).toHaveLength(1);
    expect(errors[0]?.code).toBe("BAD_MESSAGE");
    expect(transport.state).toBe("closed");
    expect(socket.closeArgs?.code).toBe(1000);
  });

  it("requires an open socket before sending", () => {
    const socket = new FakeSocket();
    const { transport } = makeTransport(socket);

    expect(() =>
      transport.send({
        v: PROTOCOL_VERSION,
        t: "session-end",
        reason: "host-left",
      }),
    ).toThrow("TRANSPORT_CLOSED");
  });
});
