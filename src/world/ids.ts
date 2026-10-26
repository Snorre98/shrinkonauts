import type { PlayerId } from "./simulation";

/**
 * The only logical asset IDs the world needs to know. Renderers never touch
 * image paths: they ask the assets module for these IDs.
 */
export const PLAYER_ASSET_IDS: Record<PlayerId, string> = {
  p1: "sprite.player.p1",
  p2: "sprite.player.p2",
};
