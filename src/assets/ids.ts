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

/**
 * POC player animation sheets. The static idle asset remains
 * `PLAYER_ASSET_IDS`; these IDs are loaded only when the pack's final manifest
 * declares them.
 */
export const PLAYER_ANIMATION_ASSET_IDS = {
  p1: {
    walk: "sprite.player.p1.walk",
    jump: "sprite.player.p1.jump",
    fall: "sprite.player.p1.fall",
    land: "sprite.player.p1.land",
  },
  p2: {
    walk: "sprite.player.p2.walk",
    jump: "sprite.player.p2.jump",
    fall: "sprite.player.p2.fall",
    land: "sprite.player.p2.land",
  },
} as const;

export type PlayerAnimationAssetKey =
  keyof typeof PLAYER_ANIMATION_ASSET_IDS;
export type PlayerAnimationClip = keyof (typeof PLAYER_ANIMATION_ASSET_IDS)["p1"];
