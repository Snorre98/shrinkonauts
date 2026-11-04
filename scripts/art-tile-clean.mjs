#!/usr/bin/env node
/**
 * Deterministic pixel cleanup + tile edge weld for 1024x512 background layers.
 *
 * - Reports alpha, coverage, 2x2 colour-cluster violations and alpha islands.
 * - Optionally removes alpha components smaller than --min-component pixels.
 * - Welds the four tile edges so opposite edges are pixel-identical.
 *
 * This is a local review tool for the nanobanan background pass, not a runtime
 * dependency. It only reads/writes PNGs and keeps the existing palette colours.
 */

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { PNG } from "pngjs";

function arg(name, fallback) {
  const index = process.argv.indexOf(`--${name}`);
  if (index === -1) return fallback;
  const value = process.argv[index + 1];
  if (value === undefined) throw new Error(`--${name} requires a value`);
  return value;
}

const input = resolve(arg("in"));
const output = resolve(arg("out"));
const reportPath = arg("report") ? resolve(arg("report")) : undefined;
const band = Number(arg("band", "2"));
const minComponent = Number(arg("min-component", "4"));
const weldY = arg("weld-y", "union");
const weldX = arg("weld-x", "union");
const snap2x2 = process.argv.includes("--snap2x2");

if (!Number.isInteger(band) || band < 1) throw new Error("--band must be >= 1");
if (!Number.isInteger(minComponent) || minComponent < 0) {
  throw new Error("--min-component must be >= 0");
}

const png = PNG.sync.read(readFileSync(input));
const { width, height } = png;
const data = Buffer.from(png.data);

function at(x, y) {
  return (y * width + x) * 4;
}

function rgbaAt(x, y) {
  const i = at(x, y);
  return [data[i], data[i + 1], data[i + 2], data[i + 3]];
}

function setRgba(x, y, rgba) {
  const i = at(x, y);
  data[i] = rgba[0];
  data[i + 1] = rgba[1];
  data[i + 2] = rgba[2];
  data[i + 3] = rgba[3];
}

function colorKey(rgba) {
  return (
    (rgba[0] << 24) | (rgba[1] << 16) | (rgba[2] << 8) | rgba[3]
  ) >>> 0;
}

function scan() {
  let opaque = 0;
  let alphaViolations = 0;
  const colours = new Set();
  for (let i = 0; i < data.length; i += 4) {
    const alpha = data[i + 3];
    if (alpha === 0) continue;
    opaque += 1;
    if (alpha !== 255) alphaViolations += 1;
    colours.add(colorKey([data[i], data[i + 1], data[i + 2], alpha]));
  }
  return { opaque, alphaViolations, colours };
}

/** Opaque pixels that are not part of any uniform 2x2 colour block. */
function countNon2x2() {
  let bad = 0;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if ((data[at(x, y) + 3] ?? 0) !== 255) continue;
      let good = false;
      for (let oy = -1; oy <= 0 && !good; oy += 1) {
        for (let ox = -1; ox <= 0 && !good; ox += 1) {
          const bx = x + ox;
          const by = y + oy;
          if (bx < 0 || by < 0 || bx + 1 >= width || by + 1 >= height) {
            continue;
          }
          const first = rgbaAt(bx, by);
          if (first[3] !== 255) continue;
          let same = true;
          for (let dy = 0; dy < 2 && same; dy += 1) {
            for (let dx = 0; dx < 2 && same; dx += 1) {
              const other = rgbaAt(bx + dx, by + dy);
              if (
                other[0] !== first[0] ||
                other[1] !== first[1] ||
                other[2] !== first[2] ||
                other[3] !== 255
              ) {
                same = false;
              }
            }
          }
          if (same) good = true;
        }
      }
      if (!good) bad += 1;
    }
  }
  return bad;
}

function removeSmallComponents() {
  const visited = new Uint8Array(width * height);
  const stack = new Int32Array(width * height);
  const component = [];
  let removedComponents = 0;
  let removedPixels = 0;

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const start = y * width + x;
      if (visited[start]) continue;
      visited[start] = 1;
      if ((data[start * 4 + 3] ?? 0) === 0) continue;

      component.length = 0;
      let top = 0;
      stack[top++] = start;
      while (top > 0) {
        const index = stack[--top];
        component.push(index);
        const cx = index % width;
        const cy = Math.floor(index / width);
        const neighbours = [
          [cx - 1, cy],
          [cx + 1, cy],
          [cx, cy - 1],
          [cx, cy + 1],
        ];
        for (const [nx, ny] of neighbours) {
          if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
          const next = ny * width + nx;
          if (visited[next]) continue;
          visited[next] = 1;
          if ((data[next * 4 + 3] ?? 0) !== 0) stack[top++] = next;
        }
      }

      if (component.length < minComponent) {
        removedComponents += 1;
        removedPixels += component.length;
        for (const index of component) {
          data[index * 4] = 0;
          data[index * 4 + 1] = 0;
          data[index * 4 + 2] = 0;
          data[index * 4 + 3] = 0;
        }
      }
    }
  }
  return { removedComponents, removedPixels };
}

function edgeMismatch() {
  let leftRight = 0;
  let topBottom = 0;
  for (let y = 0; y < height; y += 1) {
    const left = rgbaAt(0, y);
    const right = rgbaAt(width - 1, y);
    if (left.some((value, index) => value !== right[index])) leftRight += 1;
  }
  for (let x = 0; x < width; x += 1) {
    const top = rgbaAt(x, 0);
    const bottom = rgbaAt(x, height - 1);
    if (top.some((value, index) => value !== bottom[index])) topBottom += 1;
  }
  return { leftRight, topBottom };
}

function choose(a, b, mode) {
  if (mode === "left" || mode === "top") return a;
  if (mode === "right" || mode === "bottom") return b;
  if (a[3] === 0 && b[3] === 0) return [0, 0, 0, 0];
  if (a[3] === 0) return b;
  if (b[3] === 0) return a;
  return a;
}

function weldHorizontal(mode) {
  for (let y = 0; y < height; y += 1) {
    for (let i = 0; i < band; i += 1) {
      const left = rgbaAt(i, y);
      const right = rgbaAt(width - 1 - i, y);
      const chosen = choose(left, right, mode);
      setRgba(i, y, chosen);
      setRgba(width - 1 - i, y, chosen);
    }
  }
}

function weldVertical(mode) {
  for (let x = 0; x < width; x += 1) {
    for (let i = 0; i < band; i += 1) {
      const top = rgbaAt(x, i);
      const bottom = rgbaAt(x, height - 1 - i);
      const chosen = choose(top, bottom, mode);
      setRgba(x, i, chosen);
      setRgba(x, height - 1 - i, chosen);
    }
  }
}

/**
 * Snap every aligned 2x2 cell to one RGBA value. The cell is opaque when at
 * least two of its four pixels are opaque; the colour is the most common
 * opaque colour in the cell. This guarantees the 2x2 minimum cluster rule.
 */
function snapTo2x2() {
  if (width % 2 !== 0 || height % 2 !== 0) {
    throw new Error("--snap2x2 requires even dimensions");
  }
  for (let y = 0; y < height; y += 2) {
    for (let x = 0; x < width; x += 2) {
      const counts = new Map();
      let opaque = 0;
      for (let dy = 0; dy < 2; dy += 1) {
        for (let dx = 0; dx < 2; dx += 1) {
          const rgba = rgbaAt(x + dx, y + dy);
          if (rgba[3] === 0) continue;
          opaque += 1;
          const key = colorKey(rgba);
          const entry = counts.get(key);
          if (entry) entry.count += 1;
          else counts.set(key, { count: 1, rgba });
        }
      }
      let chosen = [0, 0, 0, 0];
      if (opaque >= 2) {
        let bestKey = null;
        let best = null;
        for (const [key, entry] of counts.entries()) {
          if (
            !best ||
            entry.count > best.count ||
            (entry.count === best.count && key < bestKey)
          ) {
            best = entry;
            bestKey = key;
          }
        }
        chosen = best?.rgba ?? [0, 0, 0, 0];
      }
      for (let dy = 0; dy < 2; dy += 1) {
        for (let dx = 0; dx < 2; dx += 1) {
          setRgba(x + dx, y + dy, chosen);
        }
      }
    }
  }
}

const before = scan();
const beforeNon2x2 = countNon2x2();
const beforeEdges = edgeMismatch();

let removal = { removedComponents: 0, removedPixels: 0 };
if (minComponent > 0) removal = removeSmallComponents();

weldHorizontal(weldX);
weldVertical(weldY);

// Re-weld horizontally: the vertical pass writes full rows, and those rows were
// already horizontally matched, but this keeps the invariant explicit.
weldHorizontal(weldX);

if (snap2x2) snapTo2x2();

const after = scan();
const afterNon2x2 = countNon2x2();
const afterEdges = edgeMismatch();

mkdirSync(dirname(output), { recursive: true });
const out = new PNG({ width, height });
data.copy(out.data);
writeFileSync(output, PNG.sync.write(out));

if (reportPath) {
  const report = {
    schemaVersion: 1,
    input,
    output,
    cell: { width, height },
    band,
    minComponent,
    weldX,
    weldY,
    snap2x2,
    before: {
      opaquePixels: before.opaque,
      coverage: Number((before.opaque / (width * height)).toFixed(4)),
      alphaViolations: before.alphaViolations,
      uniqueColours: before.colours.size,
      non2x2Pixels: beforeNon2x2,
      edgeMismatch: beforeEdges,
    },
    removal,
    after: {
      opaquePixels: after.opaque,
      coverage: Number((after.opaque / (width * height)).toFixed(4)),
      alphaViolations: after.alphaViolations,
      uniqueColours: after.colours.size,
      non2x2Pixels: afterNon2x2,
      edgeMismatch: afterEdges,
    },
  };
  mkdirSync(dirname(reportPath), { recursive: true });
  writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);
}

console.log(
  [
    `Input: ${input}`,
    `Coverage: ${(before.opaque / (width * height) * 100).toFixed(2)}%`,
    `Alpha violations: ${before.alphaViolations}`,
    `Unique colours: ${before.colours.size}`,
    `Non-2x2 opaque pixels: ${beforeNon2x2}`,
    `Removed islands: ${removal.removedComponents} (${removal.removedPixels} px)`,
    `Edge mismatch before: LR ${beforeEdges.leftRight}, TB ${beforeEdges.topBottom}`,
    `Edge mismatch after: LR ${afterEdges.leftRight}, TB ${afterEdges.topBottom}`,
    `Non-2x2 opaque pixels after: ${afterNon2x2}`,
    `Output: ${output}`,
  ].join("\n"),
);
