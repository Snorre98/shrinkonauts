import type { Result } from "../core/result";
import {
  encodeMessage,
  type ClientMessage,
  type ProtocolError,
  type ServerMessage,
} from "./protocol";

export type TransportState = "idle" | "connecting" | "open" | "closed";

export interface RoomTransport<
  TClient extends ClientMessage = ClientMessage,
  TServer extends ServerMessage = ServerMessage,
> {
  connect(): Promise<void>;
  send(message: TClient): void;
  onMessage(handler: (message: TServer) => void): () => void;
  close(reason?: string): void;
  readonly state: TransportState;
}

export interface WebSocketRoomTransportOptions<
  TServer extends ServerMessage,
> {
  url: string;
  decode: (raw: string) => Result<TServer, ProtocolError>;
  createSocket?: (url: string) => WebSocket;
  onProtocolError?: (error: ProtocolError) => void;
}

/**
 * Real browser transport. The decoder is injected so host and controller
 * sessions can enforce their own message direction and size limits.
 */
export class WebSocketRoomTransport<
  TClient extends ClientMessage,
  TServer extends ServerMessage,
> implements RoomTransport<TClient, TServer> {
  private currentState: TransportState = "idle";
  private socket: WebSocket | null = null;
  private readonly handlers = new Set<(message: TServer) => void>();

  constructor(
    private readonly options: WebSocketRoomTransportOptions<TServer>,
  ) {}

  get state(): TransportState {
    return this.currentState;
  }

  connect(): Promise<void> {
    if (this.currentState === "open") return Promise.resolve();
    if (this.currentState === "connecting") {
      return Promise.reject(
        new Error("TRANSPORT_CONNECTING: connection already in progress"),
      );
    }

    this.currentState = "connecting";
    const createSocket =
      this.options.createSocket ?? ((url: string) => new WebSocket(url));
    const socket = createSocket(this.options.url);
    this.socket = socket;

    return new Promise<void>((resolve, reject) => {
      let settled = false;

      socket.addEventListener(
        "open",
        () => {
          settled = true;
          this.currentState = "open";
          resolve();
        },
        { once: true },
      );

      socket.addEventListener(
        "error",
        () => {
          if (!settled) {
            settled = true;
            this.currentState = "closed";
            reject(new Error("TRANSPORT_ERROR: socket failed to open"));
          }
        },
        { once: true },
      );

      socket.addEventListener(
        "close",
        () => {
          this.currentState = "closed";
          if (!settled) {
            settled = true;
            reject(new Error("TRANSPORT_CLOSED: socket closed before open"));
          }
        },
        { once: true },
      );

      socket.addEventListener("message", (event) => {
        if (typeof event.data !== "string") {
          this.protocolFailure({
            code: "BAD_MESSAGE",
            message: "WebSocket message must be text",
          });
          return;
        }
        const decoded = this.options.decode(event.data);
        if (!decoded.ok) {
          this.protocolFailure(decoded.error);
          return;
        }
        for (const handler of this.handlers) handler(decoded.value);
      });
    });
  }

  send(message: TClient): void {
    if (this.currentState !== "open" || !this.socket) {
      throw new Error("TRANSPORT_CLOSED: cannot send before connect");
    }
    this.socket.send(encodeMessage(message));
  }

  onMessage(handler: (message: TServer) => void): () => void {
    this.handlers.add(handler);
    return () => {
      this.handlers.delete(handler);
    };
  }

  close(reason = "session-end"): void {
    this.currentState = "closed";
    this.socket?.close(1000, reason);
    this.socket = null;
    this.handlers.clear();
  }

  private protocolFailure(error: ProtocolError): void {
    this.options.onProtocolError?.(error);
    this.close(error.code);
  }
}
