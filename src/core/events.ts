export type Unsubscribe = () => void;

type AnyHandler = (payload: unknown) => void;

/**
 * Minimal typed-by-convention event bus. The domain doesn't need more than this
 * in M0.1, and keeping it tiny avoids coupling callers to an event framework.
 */
export class EventBus {
  private readonly listeners = new Map<string, Set<AnyHandler>>();

  on<T>(type: string, handler: (payload: T) => void): Unsubscribe {
    let handlers = this.listeners.get(type);
    if (!handlers) {
      handlers = new Set();
      this.listeners.set(type, handlers);
    }

    const wrapped = handler as AnyHandler;
    handlers.add(wrapped);

    return () => {
      handlers?.delete(wrapped);
    };
  }

  emit<T>(type: string, payload: T): void {
    const handlers = this.listeners.get(type);
    if (!handlers) {
      return;
    }

    for (const handler of [...handlers]) {
      handler(payload);
    }
  }

  clear(): void {
    this.listeners.clear();
  }
}
