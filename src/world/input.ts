import Phaser from "phaser";
import type { Intents, PlayerId, PlayerIntent } from "./simulation";

interface PlayerKeys {
  left: Phaser.Input.Keyboard.Key;
  right: Phaser.Input.Keyboard.Key;
  jumps: Phaser.Input.Keyboard.Key[];
}

function axis(left: Phaser.Input.Keyboard.Key, right: Phaser.Input.Keyboard.Key): -1 | 0 | 1 {
  if (left.isDown === right.isDown) {
    return 0;
  }
  return left.isDown ? -1 : 1;
}

function jumpPressed(keys: PlayerKeys): boolean {
  let pressed = false;
  for (const jump of keys.jumps) {
    if (Phaser.Input.Keyboard.JustDown(jump)) {
      pressed = true;
    }
  }
  return pressed;
}

export class KeyboardIntentSource {
  private readonly keys: Record<PlayerId, PlayerKeys>;

  constructor(scene: Phaser.Scene) {
    const keyboard = scene.input.keyboard;
    if (!keyboard) {
      throw new Error("Keyboard input is unavailable");
    }

    const key = (code: number): Phaser.Input.Keyboard.Key =>
      keyboard.addKey(code, true, false);

    this.keys = {
      p1: {
        left: key(Phaser.Input.Keyboard.KeyCodes.A),
        right: key(Phaser.Input.Keyboard.KeyCodes.D),
        jumps: [
          key(Phaser.Input.Keyboard.KeyCodes.W),
          key(Phaser.Input.Keyboard.KeyCodes.SPACE),
        ],
      },
      p2: {
        left: key(Phaser.Input.Keyboard.KeyCodes.LEFT),
        right: key(Phaser.Input.Keyboard.KeyCodes.RIGHT),
        jumps: [key(Phaser.Input.Keyboard.KeyCodes.UP)],
      },
    };
  }

  sample(): Intents {
    return {
      p1: this.samplePlayer(this.keys.p1),
      p2: this.samplePlayer(this.keys.p2),
    };
  }

  private samplePlayer(keys: PlayerKeys): PlayerIntent {
    return {
      moveX: axis(keys.left, keys.right),
      jump: jumpPressed(keys),
    };
  }
}
