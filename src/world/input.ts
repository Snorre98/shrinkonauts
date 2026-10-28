import Phaser from "phaser";
import type { PlayerId, PlayerIntent } from "./simulation";
import type { PlayerUiActions, RuntimeInput } from "./runtime-port";

export type FrameInput = RuntimeInput;

interface PlayerKeys {
  left: Phaser.Input.Keyboard.Key;
  right: Phaser.Input.Keyboard.Key;
  up: Phaser.Input.Keyboard.Key;
  navDown: Phaser.Input.Keyboard.Key;
  jumps: Phaser.Input.Keyboard.Key[];
  dash: Phaser.Input.Keyboard.Key;
  interact: Phaser.Input.Keyboard.Key;
  scan: Phaser.Input.Keyboard.Key;
  pulse: Phaser.Input.Keyboard.Key | null;
  carry: Phaser.Input.Keyboard.Key | null;
  throw: Phaser.Input.Keyboard.Key | null;
  uiConfirm: Phaser.Input.Keyboard.Key | null;
  uiCancel: Phaser.Input.Keyboard.Key;
  choose: Phaser.Input.Keyboard.Key[];
}

function axis(left: Phaser.Input.Keyboard.Key, right: Phaser.Input.Keyboard.Key): -1 | 0 | 1 {
  if (left.isDown === right.isDown) {
    return 0;
  }
  return left.isDown ? -1 : 1;
}

export class KeyboardIntentSource {
  private readonly keys: Record<PlayerId, PlayerKeys>;
  private readonly mapKey: Phaser.Input.Keyboard.Key;
  private readonly logKey: Phaser.Input.Keyboard.Key;
  private readonly pauseKey: Phaser.Input.Keyboard.Key;
  private readonly muteKey: Phaser.Input.Keyboard.Key;
  private readonly toggleP2Key: Phaser.Input.Keyboard.Key;
  private readonly navState: Record<
    PlayerId,
    { up: boolean; down: boolean }
  > = {
    p1: { up: false, down: false },
    p2: { up: false, down: false },
  };
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
        navDown: captured(Phaser.Input.Keyboard.KeyCodes.S),
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
        uiConfirm: latch(plain(Phaser.Input.Keyboard.KeyCodes.ENTER)),
        uiCancel: latch(captured(Phaser.Input.Keyboard.KeyCodes.BACKSPACE)),
        choose: [
          latch(plain(Phaser.Input.Keyboard.KeyCodes.ONE)),
          latch(plain(Phaser.Input.Keyboard.KeyCodes.TWO)),
          latch(plain(Phaser.Input.Keyboard.KeyCodes.THREE)),
          latch(plain(Phaser.Input.Keyboard.KeyCodes.FOUR)),
          latch(plain(Phaser.Input.Keyboard.KeyCodes.FIVE)),
        ],
      },
      p2: {
        left: captured(Phaser.Input.Keyboard.KeyCodes.LEFT),
        right: captured(Phaser.Input.Keyboard.KeyCodes.RIGHT),
        up: captured(Phaser.Input.Keyboard.KeyCodes.UP),
        navDown: captured(Phaser.Input.Keyboard.KeyCodes.DOWN),
        jumps: [latch(captured(Phaser.Input.Keyboard.KeyCodes.UP))],
        dash: latch(captured(Phaser.Input.Keyboard.KeyCodes.FORWARD_SLASH)),
        interact: latch(captured(Phaser.Input.Keyboard.KeyCodes.COMMA)),
        scan: latch(captured(Phaser.Input.Keyboard.KeyCodes.PERIOD)),
        pulse: null,
        carry: latch(captured(Phaser.Input.Keyboard.KeyCodes.QUOTES)),
        throw: latch(captured(Phaser.Input.Keyboard.KeyCodes.SEMICOLON)),
        uiConfirm: null,
        uiCancel: latch(captured(Phaser.Input.Keyboard.KeyCodes.DELETE)),
        choose: [],
      },
    };

    // Tab must be captured; otherwise the browser moves focus out of the game
    // before the map overlay can take over focus management.
    this.mapKey = latch(captured(Phaser.Input.Keyboard.KeyCodes.TAB));
    this.logKey = latch(plain(Phaser.Input.Keyboard.KeyCodes.C));
    this.pauseKey = latch(plain(Phaser.Input.Keyboard.KeyCodes.ESC));
    this.muteKey = latch(plain(Phaser.Input.Keyboard.KeyCodes.M));
    this.toggleP2Key = latch(plain(Phaser.Input.Keyboard.KeyCodes.P));
  }

  /** Drops latched actions when a text field takes focus. */
  discard(): void {
    this.latched.clear();
    this.navState.p1 = { up: false, down: false };
    this.navState.p2 = { up: false, down: false };
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
    const p1Actions = this.samplePlayerActions("p1");
    const p2Actions = this.samplePlayerActions("p2");
    return {
      intents: {
        p1: this.samplePlayer(this.keys.p1),
        p2: this.samplePlayer(this.keys.p2),
      },
      actions: {
        p1: p1Actions,
        p2: p2Actions,
        map: this.consume(this.mapKey),
        log: this.consume(this.logKey),
        pause: this.consume(this.pauseKey),
        mute: this.consume(this.muteKey),
        toggleP2: this.consume(this.toggleP2Key),
      },
    };
  }

  private samplePlayerActions(id: PlayerId): RuntimeInput["actions"]["p1"] {
    const keys = this.keys[id];
    const interact = this.consume(keys.interact);
    const ui = this.sampleUi(id, keys, interact);
    return {
      interact,
      scan: this.consume(keys.scan),
      pulse: keys.pulse ? this.consume(keys.pulse) : false,
      carry: keys.carry ? this.consume(keys.carry) : false,
      throw: keys.throw ? this.consume(keys.throw) : false,
      ui,
    };
  }

  private sampleUi(
    id: PlayerId,
    keys: PlayerKeys,
    interact: boolean,
  ): PlayerUiActions {
    let choose: number | null = null;
    for (const [index, key] of keys.choose.entries()) {
      if (this.consume(key)) {
        choose = index + 1;
      }
    }

    const up = keys.up.isDown;
    const down = keys.navDown.isDown;
    const previous = this.navState[id];
    const navigateUp = up && !previous.up;
    const navigateDown = down && !previous.down;
    this.navState[id] = { up, down };

    return {
      confirm:
        (keys.uiConfirm ? this.consume(keys.uiConfirm) : false) || interact,
      cancel: this.consume(keys.uiCancel),
      navigateUp,
      navigateDown,
      choose,
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
