/**
 * Deterministic resampling helpers for the POC player-sheet path.
 *
 * `resizeBox` averages the source pixels covered by each target pixel using
 * premultiplied alpha, so transparent edges do not darken the subject. The
 * caller still applies the hard 0/255 alpha contract after resampling.
 */

import type { RgbaImage } from "./ludo-sheet";

export function resizeBox(
  image: RgbaImage,
  width: number,
  height: number,
): RgbaImage {
  if (
    !Number.isInteger(width) ||
    !Number.isInteger(height) ||
    width < 1 ||
    height < 1
  ) {
    throw new Error("resize dimensions must be positive integers");
  }
  if (width === image.width && height === image.height) {
    return {
      width: image.width,
      height: image.height,
      data: Buffer.from(image.data),
    };
  }

  const data = Buffer.alloc(width * height * 4);
  for (let y = 0; y < height; y += 1) {
    const y0 = Math.floor((y * image.height) / height);
    const y1 = Math.max(y0 + 1, Math.floor(((y + 1) * image.height) / height));
    for (let x = 0; x < width; x += 1) {
      const x0 = Math.floor((x * image.width) / width);
      const x1 = Math.max(x0 + 1, Math.floor(((x + 1) * image.width) / width));

      let red = 0;
      let green = 0;
      let blue = 0;
      let alpha = 0;
      let count = 0;

      for (let sourceY = y0; sourceY < y1; sourceY += 1) {
        for (let sourceX = x0; sourceX < x1; sourceX += 1) {
          const source = (sourceY * image.width + sourceX) * 4;
          const a = (image.data[source + 3] ?? 0) / 255;
          red += (image.data[source] ?? 0) * a;
          green += (image.data[source + 1] ?? 0) * a;
          blue += (image.data[source + 2] ?? 0) * a;
          alpha += a;
          count += 1;
        }
      }

      const target = (y * width + x) * 4;
      if (count === 0 || alpha === 0) {
        data[target] = 0;
        data[target + 1] = 0;
        data[target + 2] = 0;
        data[target + 3] = 0;
        continue;
      }

      data[target] = Math.round(red / alpha);
      data[target + 1] = Math.round(green / alpha);
      data[target + 2] = Math.round(blue / alpha);
      data[target + 3] = Math.round((alpha / count) * 255);
    }
  }

  return { width, height, data };
}
