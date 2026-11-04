import Phaser from "phaser";
import { ENTITY_DISPLAY_SIZE } from "./entity-style";

export interface EntityIdleAnimationAsset {
  textureKey: string;
  frames: number;
  fps: number;
  loop: boolean;
}

export interface EntityIdleAnimatorOptions {
  scene: Phaser.Scene;
  entityId: string;
  sprite: Phaser.GameObjects.Sprite;
  staticTexture: string;
  asset: EntityIdleAnimationAsset;
  /** Resolved display size in world pixels; defaults to the legacy 36×36. */
  display?: { width: number; height: number };
  isReducedMotion?: () => boolean;
}

export function entityIdleAnimationKey(
  entityId: string,
  textureKey: string,
): string {
  return `entity:${entityId}:${textureKey}`;
}

/**
 * POC entity idle adapter.
 *
 * Mirrors the player animator's contract: the static sprite remains the
 * fallback, the sheet's frame count/fps/loop come from the asset manifest, and
 * reduced motion keeps the static frame.
 */
export class EntityIdleAnimator {
  private readonly scene: Phaser.Scene;
  private readonly sprite: Phaser.GameObjects.Sprite;
  private readonly staticTexture: string;
  private readonly animationKey: string;
  private readonly isReducedMotion?: () => boolean;
  private readonly displayWidth: number;
  private readonly displayHeight: number;
  private reduced: boolean;

  constructor(options: EntityIdleAnimatorOptions) {
    this.scene = options.scene;
    this.sprite = options.sprite;
    this.staticTexture = options.staticTexture;
    this.displayWidth = options.display?.width ?? ENTITY_DISPLAY_SIZE;
    this.displayHeight = options.display?.height ?? ENTITY_DISPLAY_SIZE;
    this.animationKey = entityIdleAnimationKey(
      options.entityId,
      options.asset.textureKey,
    );
    this.isReducedMotion = options.isReducedMotion;
    this.reduced = this.isReducedMotion?.() ?? false;

    if (!this.scene.anims.exists(this.animationKey)) {
      this.scene.anims.create({
        key: this.animationKey,
        frames: this.scene.anims.generateFrameNumbers(options.asset.textureKey, {
          start: 0,
          end: options.asset.frames - 1,
        }),
        frameRate: options.asset.fps,
        repeat: options.asset.loop ? -1 : 0,
      });
    }

    if (!this.reduced) {
      this.play();
    }
  }

  update(): void {
    const reduced = this.isReducedMotion?.() ?? false;
    if (reduced === this.reduced) return;
    this.reduced = reduced;
    if (reduced) {
      this.showStatic();
    } else {
      this.play();
    }
  }

  private play(): void {
    this.sprite.play(this.animationKey, true);
    this.sprite.setDisplaySize(this.displayWidth, this.displayHeight);
  }

  private showStatic(): void {
    this.sprite.anims.stop();
    this.sprite.setTexture(this.staticTexture);
    this.sprite.setDisplaySize(this.displayWidth, this.displayHeight);
  }
}
