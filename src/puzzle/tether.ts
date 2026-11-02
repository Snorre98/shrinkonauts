import type { TetherPolicy } from "./types";

/**
 * World-pixel tether lengths shared by physics and presentation. Presentation
 * uses them to keep the whole tether span inside the camera view at auto zoom;
 * physics uses them as the Matter constraint length.
 */
export const TETHER_LENGTHS: Record<Exclude<TetherPolicy, "off">, number> = {
  normal: 560,
  stretch: 1150,
};
