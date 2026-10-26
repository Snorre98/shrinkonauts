import Phaser from "phaser";
import type { PlayerId, PlayerIntent } from "./simulation";
import type { RuntimeInput } from "./runtime-port";

export type FrameInput = RuntimeInput;

interface PlayerKeys {
  left: Phaser.Input.Keyboard.Key;
  right: Phaser.Input.Keyboard.Key;
  up: Phaser.Input.Keyboard.Key;
  jumps: Phaser.Input.Keyboard.Key[];
  dash: Phaser.Input.Keyboard.Key;
  interact: Phaser.Input.Keyboard.Key;
  scan: Phaser.Input.Keyboard.Key;
  pulse: Phaser.Input.Keyboard.Key | null;
  carry: Phaser.Input.Keyboard.Key | null;
  throw: Phaser.Input.Keyboard.Key | null;
}

function axis(left: Phaser.Input.Keyboard.Key, right: Phaser.Input.Keyboard.Key): -1 | 0 | 1 {
  if (left.isDown === right.isDown) {
    return 0;
  }
  return left.isDown ? -1 : 1;
}

function pressed(keys: readonly Phaser.Input.Keyboard.Key[]): boolean {
  let down = false;
  for (const key of keys) {
    if (Phaser.Input.Keyboard.JustDown(key)) {
      down = true;
    }
  }
  return down;
}

export class KeyboardIntentSource {
  private readonly keys: Record<PlayerId, PlayerKeys>;
  private readonly mapKey: Phaser.Input.Keyboard.Key;
  private readonly logKey: Phaser.Input.Keyboard.Key;
  private readonly pauseKey: Phaser.Input.Keyboard.Key;
  private readonly muteKey: Phaser.Input.Keyboard.Key;
  private readonly toggleP2Key: Phaser.Input.Keyboard.Key;
  private readonly confirmKeys: Phaser.Input.Keyboard.Key[];
  /**
   * Phaser clears `_justDown` on keyup, so a tap shorter than one frame would
   * disappear. Latching keydown events makes every press visible exactly once
   * to the next fixed step.
   */
  private readonly latched = new Set<Phaser.Input.Keyboard.Key>();

  constructor(scene: Phaser.Scene) {
    const keyboard = scene.input.keyboard;
    if (!keyboard) {
      throw new Error("Keyboard input is unavailable");
    }

    const captured = (code: number): Phaser.Input.Keyboard.Key =>
      keyboard.addKey(code, true, false);
    const plain = (code: number): Phaser.Input.Keyboard.Key =>
      keyboard.addKey(code, false, false);
    const latch = (key: Phaser.Input.Keyboard.Key): Phaser.Input.Keyboard.Key => {
      key.on(Phaser.Input.Keyboard.Events.DOWN, () => {
        this.latched.add(key);
      });
      return key;
    };

    this.keys = {
      p1: {
        left: captured(Phaser.Input.Keyboard.KeyCodes.A),
        right: captured(Phaser.Input.Keyboard.KeyCodes.D),
        up: captured(Phaser.Input.Keyboard.KeyCodes.W),
        jumps: [
          latch(captured(Phaser.Input.Keyboard.KeyCodes.W)),
          latch(captured(Phaser.Input.Keyboard.KeyCodes.SPACE)),
        ],
        dash: latch(captured(Phaser.Input.Keyboard.KeyCodes.SHIFT)),
        interact: latch(captured(Phaser.Input.Keyboard.KeyCodes.E)),
        scan: latch(captured(Phaser.Input.Keyboard.KeyCodes.Q)),
        pulse: latch(captured(Phaser.Input.Keyboard.KeyCodes.F)),
        carry: latch(captured(Phaser.Input.Keyboard.KeyCodes.G)),
        throw: latch(captured(Phaser.Input.Keyboard.KeyCodes.H)),
      },
      p2: {
        left: captured(Phaser.Input.Keyboard.KeyCodes.LEFT),
        right: captured(Phaser.Input.Keyboard.KeyCodes.RIGHT),
        up: captured(Phaser.Input.Keyboard.KeyCodes.UP),
        jumps: [latch(captured(Phaser.Input.Keyboard.KeyCodes.UP))],
        dash: latch(captured(Phaser.Input.Keyboard.KeyCodes.FORWARD_SLASH)),
        interact: latch(captured(Phaser.Input.Keyboard.KeyCodes.COMMA)),
        scan: latch(captured(Phaser.Input.Keyboard.KeyCodes.PERIOD)),
        pulse: null,
        carry: latch(captured(Phaser.Input.Keyboard.KeyCodes.QUOTES)),
        throw: latch(captured(Phaser.Input.Keyboard.KeyCodes.SEMICOLON)),
      },
    };

    // Tab must be captured; otherwise the browser moves focus out of the game
    // before the map overlay can take over focus management.
    this.mapKey = latch(captured(Phaser.Input.Keyboard.KeyCodes.TAB));
    this.logKey = latch(plain(Phaser.Input.Keyboard.KeyCodes.C));
    this.pauseKey = latch(plain(Phaser.Input.Keyboard.KeyCodes.ESC));
    this.muteKey = latch(plain(Phaser.Input.Keyboard.KeyCodes.M));
    this.toggleP2Key = latch(plain(Phaser.Input.Keyboard.KeyCodes.P));
    this.confirmKeys = [
      plain(Phaser.Input.Keyboard.KeyCodes.ENTER),
      plain(Phaser.Input.Keyboard.KeyCodes.SPACE),
    ];
  }

  /** Drops latched actions when a text field takes focus. */
  discard(): void {
    this.latched.clear();
  }

  private consume(key: Phaser.Input.Keyboard.Key): boolean {
    return this.latched.delete(key);
  }

  private consumeAny(keys: readonly Phaser.Input.Keyboard.Key[]): boolean {
    let fired = false;
    for (const key of keys) {
      if (this.latched.delete(key)) fired = true;
    }
    return fired;
  }

  sample(): FrameInput {
    return {
      intents: {
        p1: this.samplePlayer(this.keys.p1),
        p2: this.samplePlayer(this.keys.p2),
      },
      actions: {
        p1: {
          interact: this.consume(this.keys.p1.interact),
          scan: this.consume(this.keys.p1.scan),
          pulse: this.keys.p1.pulse
            ? this.consume(this.keys.p1.pulse)
            : false,
          carry: this.keys.p1.carry
            ? this.consume(this.keys.p1.carry)
            : false,
          throw: this.keys.p1.throw
            ? this.consume(this.keys.p1.throw)
            : false,
        },
        p2: {
          interact: this.consume(this.keys.p2.interact),
          scan: this.consume(this.keys.p2.scan),
          pulse: this.keys.p2.pulse
            ? this.consume(this.keys.p2.pulse)
            : false,
          carry: this.keys.p2.carry
            ? this.consume(this.keys.p2.carry)
            : false,
          throw: this.keys.p2.throw
            ? this.consume(this.keys.p2.throw)
            : false,
        },
        map: this.consume(this.mapKey),
        log: this.consume(this.logKey),
        pause: this.consume(this.pauseKey),
        mute: this.consume(this.muteKey),
        toggleP2: this.consume(this.toggleP2Key),
        confirm: pressed(this.confirmKeys),
      },
    };
  }

  private samplePlayer(keys: PlayerKeys): PlayerIntent {
    return {
      moveX: axis(keys.left, keys.right),
      jump: this.consumeAny(keys.jumps),
      dash: this.consume(keys.dash),
    };
  }
}
