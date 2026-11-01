import type {
  ClientMessage,
  ServerMessage,
} from "../../src/net/protocol";
import type {
  RoomTransport,
  TransportState,
} from "../../src/net/transport";

/** Deterministic in-memory transport with explicit outbound/inbound queues. */
export class FakeTransport<
  TClient extends ClientMessage = ClientMessage,
  TServer extends ServerMessage = ServerMessage,
> implements RoomTransport<TClient, TServer> {
  private currentState: TransportState = "idle";
  private readonly handlers = new Set<(message: TServer) => void>();
  private readonly sent: TClient[] = [];
  private readonly queued: TServer[] = [];
  closeReason: string | null = null;

  get state(): TransportState {
    return this.currentState;
  }

  async connect(): Promise<void> {
    if (this.currentState === "open") return;
    this.currentState = "open";
  }

  send(message: TClient): void {
    if (this.currentState !== "open") {
      throw new Error("FAKE_TRANSPORT_CLOSED: cannot send");
    }
    this.sent.push(message);
  }

  onMessage(handler: (message: TServer) => void): () => void {
    this.handlers.add(handler);
    return () => {
      this.handlers.delete(handler);
    };
  }

  close(reason?: string): void {
    this.currentState = "closed";
    this.closeReason = reason ?? null;
    this.handlers.clear();
  }

  emit(message: TServer): void {
    for (const handler of [...this.handlers]) handler(message);
  }

  enqueue(message: TServer): void {
    this.queued.push(message);
  }

  flush(): void {
    while (this.queued.length > 0) {
      const message = this.queued.shift();
      if (message) this.emit(message);
    }
  }

  takeSent(): TClient[] {
    return this.sent.splice(0);
  }
}
