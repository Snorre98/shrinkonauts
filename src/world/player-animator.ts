import Phaser from "phaser";
import type { PlayerId } from "./simulation";
import { PLAYER_HEIGHT, PLAYER_WIDTH } from "./simulation";
import {
  choosePlayerClip,
  type PlayerAnimationInput,
  type PlayerClip,
} from "./player-animation";

export interface PlayerAnimationAsset {
  textureKey: string;
  frames: number;
  fps: number;
  loop: boolean;
}

export interface PlayerAnimatorOptions {
  scene: Phaser.Scene;
  playerId: PlayerId;
  sprite: Phaser.GameObjects.Sprite;
  idleTexture: string;
  animations: Partial<Record<PlayerClip, PlayerAnimationAsset>>;
  isReducedMotion?: () => boolean;
}

/**
 * Phaser adapter for the pure `choosePlayerClip` state machine.
 *
 * The static idle texture remains `sprite.player.p1` / `sprite.player.p2`.
 * Walk/jump/fall/land are sheet textures whose frame count, fps, and loop flag
 * come from the asset manifest.
 */
export class PlayerAnimator {
  private readonly scene: Phaser.Scene;
  private readonly playerId: PlayerId;
  private readonly sprite: Phaser.GameObjects.Sprite;
  private readonly idleTexture: string;
  private readonly animationKeys: Partial<Record<PlayerClip, string>> = {};
  private readonly isReducedMotion?: () => boolean;

  private clip: PlayerClip = "idle";
  private previousOnGround = true;

  constructor(options: PlayerAnimatorOptions) {
    this.scene = options.scene;
    this.playerId = options.playerId;
    this.sprite = options.sprite;
    this.idleTexture = options.idleTexture;
    this.isReducedMotion = options.isReducedMotion;

    for (const [clip, asset] of Object.entries(options.animations) as Array<
      [PlayerClip, PlayerAnimationAsset]
    >) {
      const key = `${this.playerId}:${asset.textureKey}:${clip}`;
      if (!this.scene.anims.exists(key)) {
        this.scene.anims.create({
          key,
          frames: this.scene.anims.generateFrameNumbers(asset.textureKey, {
            start: 0,
            end: asset.frames - 1,
          }),
          frameRate: asset.fps,
          repeat: asset.loop ? -1 : 0,
        });
      }
      this.animationKeys[clip] = key;
    }

    this.showIdle();
  }

  update(player: PlayerAnimationInput): void {
    const playing = this.sprite.anims.isPlaying;
    const next = choosePlayerClip(player, {
      clip: this.clip,
      previousOnGround: this.previousOnGround,
      playing,
    });

    if (next !== this.clip) {
      this.clip = next;
      this.playClip(next);
    }

    this.applyTimeScale(player);
    this.previousOnGround = player.onGround;
  }

  private playClip(clip: PlayerClip): void {
    if (clip === "idle") {
      this.showIdle();
      return;
    }
    const key = this.animationKeys[clip];
    if (!key) {
      this.showIdle();
      return;
    }
    this.sprite.play(key, true);
    this.sprite.setDisplaySize(PLAYER_WIDTH, PLAYER_HEIGHT);
  }

  private showIdle(): void {
    this.sprite.anims.stop();
    this.sprite.setTexture(this.idleTexture);
    this.sprite.setDisplaySize(PLAYER_WIDTH, PLAYER_HEIGHT);
  }

  private applyTimeScale(player: PlayerAnimationInput): void {
    const reduced = this.isReducedMotion?.() ?? false;
    if (reduced) {
      this.sprite.anims.timeScale = 0.5;
      return;
    }
    if (this.clip !== "walk") {
      this.sprite.anims.timeScale = 1;
      return;
    }
    if (player.dashTime > 0) {
      this.sprite.anims.timeScale = 1.5;
      return;
    }
    const speed = Math.abs(player.vx) / 260;
    this.sprite.anims.timeScale = Math.max(0.7, Math.min(1.4, speed));
  }
}
