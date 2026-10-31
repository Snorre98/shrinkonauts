/**
 * The only logical asset IDs the world needs to know. Renderers never touch
 * image paths: they ask the assets module for these IDs.
 *
 * The constant lives in `assets` so the content validator can reuse it without
 * importing the Phaser adapter.
 */
export { PLAYER_ANIMATION_ASSET_IDS, PLAYER_ASSET_IDS } from "../assets/ids";
export type {
  PlayerAnimationAssetKey,
  PlayerAnimationClip,
  PlayerAssetKey,
} from "../assets/ids";
