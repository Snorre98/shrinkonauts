/**
 * Integer-friendly text scales for the pixel UI. Values stay on simple
 * fractions so 100/125/150/200% render predictably with pixel fonts.
 */
export const TEXT_SCALES = [1, 1.25, 1.5, 2] as const;

export type TextScale = (typeof TEXT_SCALES)[number];

/** Snap a saved or externally supplied scale to the nearest UI option. */
export function snapTextScale(value: number): TextScale {
  if (!Number.isFinite(value)) {
    return 1;
  }

  return TEXT_SCALES.reduce<TextScale>(
    (best, scale) =>
      Math.abs(scale - value) < Math.abs(best - value) ? scale : best,
    TEXT_SCALES[0],
  );
}
