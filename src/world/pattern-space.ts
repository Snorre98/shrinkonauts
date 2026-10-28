export interface PatternTilePosition {
  x: number;
  y: number;
}

/**
 * Pure placement sampler shared by tile, object, background, and CSS adapters.
 * `world` samples the target's world origin plus the layer's parallax scroll;
 * `screen` and `local` reset the phase to the authored offset.
 */
export function patternTilePosition(
  space: "world" | "screen" | "local",
  originX: number,
  originY: number,
  scale: number,
  offset: { x: number; y: number },
  scrollX = 0,
  scrollY = 0,
  parallaxX = 0,
  parallaxY = 0,
): PatternTilePosition {
  switch (space) {
    case "world":
      return {
        x: originX / scale + (scrollX * parallaxX) / scale + offset.x,
        y: originY / scale + (scrollY * parallaxY) / scale + offset.y,
      };
    case "screen":
      return { x: offset.x, y: offset.y };
    case "local":
    default:
      return { x: offset.x, y: offset.y };
  }
}
