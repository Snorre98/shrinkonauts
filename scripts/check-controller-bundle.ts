import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const dist = join(root, "dist");
const controllerHtml = join(dist, "controller.html");

function read(path: string): string {
  return readFileSync(path, "utf8");
}

function fail(messages: string[]): never {
  console.error("Controller bundle check failed:");
  for (const message of messages) console.error(`- ${message}`);
  process.exit(1);
}

let html: string;
try {
  html = read(controllerHtml);
} catch {
  fail([
    "dist/controller.html is missing; run this check after a production build",
  ]);
}

const errors: string[] = [];
if (/<canvas\b/i.test(html)) {
  errors.push("controller.html must not contain a canvas");
}
if (/\b(?:game-root|ui-root)\b/.test(html)) {
  errors.push("controller.html must not contain a game mount point");
}

const scripts = [...html.matchAll(/<script[^>]+src="([^"]+)"/g)].map(
  (match) => match[1] ?? "",
);
if (scripts.length === 0) {
  errors.push("controller.html has no module script");
}

const stylesheets = [...html.matchAll(/<link[^>]+href="([^"]+\.css)"/g)].map(
  (match) => match[1] ?? "",
);

interface PendingAsset {
  reference: string;
  path: string;
}

const visited = new Set<string>();
const pending: PendingAsset[] = [];

function resolveFrom(base: string, reference: string): string | null {
  if (!reference.startsWith("./") && !reference.startsWith("../")) {
    return null;
  }
  return join(base, reference);
}

for (const reference of scripts) {
  const path = resolveFrom(dist, reference);
  if (path) {
    pending.push({ reference, path });
  } else {
    errors.push(`controller asset must be relative: ${reference}`);
  }
}

function localImports(source: string): string[] {
  const imports = new Set<string>();
  for (const match of source.matchAll(
    /(?:from|import)\s*\(?\s*["']([^"']+)["']/g,
  )) {
    const specifier = match[1];
    if (specifier?.startsWith(".")) imports.add(specifier);
  }
  return [...imports];
}

const forbidden = [
  { pattern: /phaser/i, label: "Phaser" },
  { pattern: /matter-js/i, label: "Matter.js" },
  { pattern: /(?:^|["'/])packs\//i, label: "pack assets" },
  { pattern: /(?:^|["'/])hub\//i, label: "hub assets" },
  { pattern: /assets\.final/i, label: "final asset manifests" },
  { pattern: /(?:^|["'/])audio\//i, label: "audio assets" },
];

while (pending.length > 0) {
  const asset = pending.shift();
  if (!asset) continue;
  if (visited.has(asset.path)) continue;
  visited.add(asset.path);

  let source: string;
  try {
    source = read(asset.path);
  } catch {
    errors.push(`controller asset is missing: ${asset.reference}`);
    continue;
  }

  for (const rule of forbidden) {
    if (rule.pattern.test(source)) {
      errors.push(`${asset.reference} references ${rule.label}`);
    }
  }
  for (const specifier of localImports(source)) {
    const path = resolveFrom(dirname(asset.path), specifier);
    if (path) {
      pending.push({ reference: specifier, path });
    } else {
      errors.push(`controller import must be relative: ${specifier}`);
    }
  }
}

for (const sheet of stylesheets) {
  const path = resolveFrom(dist, sheet);
  if (!path) continue;
  let css: string;
  try {
    css = read(path);
  } catch {
    errors.push(`controller stylesheet is missing: ${sheet}`);
    continue;
  }
  if (/url\(/i.test(css)) {
    errors.push(`${sheet} contains an external asset URL`);
  }
}

if (errors.length > 0) fail(errors);
console.log(
  `Controller bundle is isolated (${visited.size} script files, ${stylesheets.length} stylesheet(s)).`,
);
