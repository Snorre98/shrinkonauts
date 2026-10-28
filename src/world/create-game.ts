import Phaser from "phaser";

export const VIEWPORT = { width: 1280, height: 720 } as const;

export interface GameMountOptions {
  parent: string;
  backgroundColor: string;
  viewport?: { width: number; height: number };
}

/**
 * The only place a Phaser game instance is constructed. Keeping it here means
 * `game` and `ui` never depend on the engine API.
 */
export function createGame(
  scene: Phaser.Scene,
  options: GameMountOptions,
): Phaser.Game {
  const viewport = options.viewport ?? VIEWPORT;

  return new Phaser.Game({
    type: Phaser.AUTO,
    parent: options.parent,
    width: viewport.width,
    height: viewport.height,
    backgroundColor: options.backgroundColor,
    scene: [scene],
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
      width: viewport.width,
      height: viewport.height,
    },
    render: {
      antialias: true,
      pixelArt: false,
    },
  });
}
