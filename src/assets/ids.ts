/**
 * Logical IDs for the two local players. They live in `assets` because the
 * content validator needs them without depending on the Phaser-facing `world`
 * module. `world` re-exports them for existing callers.
 */
export const PLAYER_ASSET_IDS = {
  p1: "sprite.player.p1",
  p2: "sprite.player.p2",
} as const;

export type PlayerAssetKey = keyof typeof PLAYER_ASSET_IDS;
