#!/usr/bin/env tsx
/**
 * Generate the committed PWA icon set from the approved hub washer sprite.
 *
 *   npm run art:pwa-icons
 *
 * The output PNGs are committed so the build and CI never depend on this
 * script or on an ignored art-source batch. The compositions are drawn at
 * 1024×1024 and downsampled with nearest-neighbour scaling to preserve the
 * pixel-art character.
 */

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { PNG } from "pngjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const SOURCE = join(
  ROOT,
  "public/hub/bathroom/shared/sprites/washer.png",
);
const OUT = join(ROOT, "public/icons");

const BACKGROUND: readonly [number, number, number] = [0x10, 0x1a, 0x20];
const BORDER: readonly [number, number, number] = [0xff, 0xd1, 0x66];

const SOURCE_IMAGE = PNG.sync.read(readFileSync(SOURCE));

interface Rgba {
  r: number;
  g: number;
  b: number;
  a: number;
}

function pixelAt(
  image: PNG,
  x: number,
  y: number,
): Rgba {
  const index = (y * image.width + x) * 4;
  return {
    r: image.data[index] ?? 0,
    g: image.data[index + 1] ?? 0,
    b: image.data[index + 2] ?? 0,
    a: image.data[index + 3] ?? 0,
  };
}

function writePixel(
  image: PNG,
  x: number,
  y: number,
  colour: readonly [number, number, number],
): void {
  const index = (y * image.width + x) * 4;
  image.data[index] = colour[0];
  image.data[index + 1] = colour[1];
  image.data[index + 2] = colour[2];
  image.data[index + 3] = 255;
}

function fill(image: PNG, colour: readonly [number, number, number]): void {
  for (let y = 0; y < image.height; y += 1) {
    for (let x = 0; x < image.width; x += 1) {
      writePixel(image, x, y, colour);
    }
  }
}

function drawBorder(
  image: PNG,
  thickness: number,
  colour: readonly [number, number, number],
): void {
  for (let y = 0; y < image.height; y += 1) {
    for (let x = 0; x < image.width; x += 1) {
      if (
        x < thickness ||
        y < thickness ||
        x >= image.width - thickness ||
        y >= image.height - thickness
      ) {
        writePixel(image, x, y, colour);
      }
    }
  }
}

function blitNearest(
  target: PNG,
  source: PNG,
  offsetX: number,
  offsetY: number,
  scale: number,
): void {
  const width = Math.max(1, Math.round(source.width * scale));
  const height = Math.max(1, Math.round(source.height * scale));
  for (let y = 0; y < height; y += 1) {
    const sourceY = Math.min(
      source.height - 1,
      Math.floor(y / scale),
    );
    for (let x = 0; x < width; x += 1) {
      const sourceX = Math.min(
        source.width - 1,
        Math.floor(x / scale),
      );
      const sample = pixelAt(source, sourceX, sourceY);
      if (sample.a === 0) continue;
      const targetX = offsetX + x;
      const targetY = offsetY + y;
      if (
        targetX < 0 ||
        targetY < 0 ||
        targetX >= target.width ||
        targetY >= target.height
      ) {
        continue;
      }
      const index = (targetY * target.width + targetX) * 4;
      if (sample.a === 255) {
        target.data[index] = sample.r;
        target.data[index + 1] = sample.g;
        target.data[index + 2] = sample.b;
        target.data[index + 3] = 255;
      } else {
        // Simple alpha blend over the solid background.
        const alpha = sample.a / 255;
        target.data[index] = Math.round(
          sample.r * alpha + BACKGROUND[0] * (1 - alpha),
        );
        target.data[index + 1] = Math.round(
          sample.g * alpha + BACKGROUND[1] * (1 - alpha),
        );
        target.data[index + 2] = Math.round(
          sample.b * alpha + BACKGROUND[2] * (1 - alpha),
        );
        target.data[index + 3] = 255;
      }
    }
  }
}

function resizeNearest(image: PNG, size: number): PNG {
  const output = new PNG({ width: size, height: size });
  for (let y = 0; y < size; y += 1) {
    const sourceY = Math.min(
      image.height - 1,
      Math.floor((y / size) * image.height),
    );
    for (let x = 0; x < size; x += 1) {
      const sourceX = Math.min(
        image.width - 1,
        Math.floor((x / size) * image.width),
      );
      const sourceIndex = (sourceY * image.width + sourceX) * 4;
      const targetIndex = (y * size + x) * 4;
      output.data[targetIndex] = image.data[sourceIndex] ?? 0;
      output.data[targetIndex + 1] = image.data[sourceIndex + 1] ?? 0;
      output.data[targetIndex + 2] = image.data[sourceIndex + 2] ?? 0;
      output.data[targetIndex + 3] = image.data[sourceIndex + 3] ?? 255;
    }
  }
  return output;
}

function compose(
  size: number,
  contentSize: number,
  border: boolean,
): PNG {
  const canvas = new PNG({ width: size, height: size });
  fill(canvas, BACKGROUND);
  if (border) {
    drawBorder(canvas, Math.max(4, Math.round(size * 0.035)), BORDER);
  }

  const scale = contentSize / Math.max(SOURCE_IMAGE.width, SOURCE_IMAGE.height);
  const width = Math.round(SOURCE_IMAGE.width * scale);
  const height = Math.round(SOURCE_IMAGE.height * scale);
  blitNearest(
    canvas,
    SOURCE_IMAGE,
    Math.round((size - width) / 2),
    Math.round((size - height) / 2),
    scale,
  );
  return canvas;
}

mkdirSync(OUT, { recursive: true });

const master = compose(1024, 800, true);
const maskableMaster = compose(1024, 620, false);

const outputs: Array<{ name: string; image: PNG }> = [
  { name: "icon-512.png", image: resizeNearest(master, 512) },
  { name: "icon-192.png", image: resizeNearest(master, 192) },
  {
    name: "icon-maskable-512.png",
    image: resizeNearest(maskableMaster, 512),
  },
  {
    name: "apple-touch-icon-180.png",
    image: resizeNearest(master, 180),
  },
];

for (const output of outputs) {
  const path = join(OUT, output.name);
  writeFileSync(path, PNG.sync.write(output.image));
  console.log(`[pwa-icons] ${path}`);
}
