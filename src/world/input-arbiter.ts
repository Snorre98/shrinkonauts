import type {
  IntentSource,
  LocalIntentSource,
  PlayerFrameInput,
  PlayerIntentSource,
  PlayerSlot,
} from "./intent-source";
import type { RuntimeInput } from "./runtime-port";

/**
 * Routes each player slot to exactly one input source.
 *
 * Remote sources own one slot each. Host-global actions always come from the
 * local keyboard, even when both player slots are remote.
 */
export class InputArbiter implements IntentSource {
  private readonly remotes = new Map<PlayerSlot, PlayerIntentSource>();

  constructor(private readonly local: LocalIntentSource) {}

  setRemote(id: PlayerSlot, source: PlayerIntentSource): void {
    const previous = this.remotes.get(id);
    if (previous && previous !== source) {
      previous.discard();
    }
    this.remotes.set(id, source);
    this.local.discard();
  }

  clearRemote(id: PlayerSlot): void {
    const source = this.remotes.get(id);
    if (source) {
      source.discard();
      this.remotes.delete(id);
    }
    this.local.discard();
  }

  hasRemote(id: PlayerSlot): boolean {
    return this.remotes.has(id);
  }

  activeSource(id: PlayerSlot): "keyboard" | "remote" {
    return this.remotes.has(id) ? "remote" : "keyboard";
  }

  sample(): RuntimeInput {
    const p1 = this.samplePlayer("p1");
    const p2 = this.samplePlayer("p2");
    const host = this.local.sampleHost();
    return {
      intents: {
        p1: p1.intent,
        p2: p2.intent,
      },
      actions: {
        p1: p1.actions,
        p2: p2.actions,
        map: host.map,
        log: host.log,
        pause: host.pause,
        mute: host.mute,
        toggleP2: host.toggleP2,
      },
    };
  }

  discard(): void {
    this.local.discard();
    for (const source of this.remotes.values()) {
      source.discard();
    }
  }

  destroy(): void {
    for (const source of this.remotes.values()) {
      source.destroy?.();
    }
    this.remotes.clear();
  }

  private samplePlayer(id: PlayerSlot): PlayerFrameInput {
    return this.remotes.get(id)?.sample() ?? this.local.samplePlayer(id);
  }
}
