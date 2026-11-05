#!/usr/bin/env tsx
/**
 * Validate the production PWA artifacts after `vite build`.
 *
 * The service worker precache is the contract that makes offline play work.
 * This check keeps the GDD gallery and the dev fixture out of it and catches
 * a multi-entry navigation fallback before it can hijack controller.html.
 */

import {
  existsSync,
  readFileSync,
  statSync,
} from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { PNG } from "pngjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const DIST = join(ROOT, "dist");
const MIN_PRECACHE_BYTES = 5 * 1024 * 1024;
const MAX_PRECACHE_BYTES = 20 * 1024 * 1024;

const errors: string[] = [];

function fail(message: string): void {
  errors.push(message);
}

function read(path: string): string {
  try {
    return readFileSync(path, "utf8");
  } catch {
    fail(`missing ${path.replace(`${ROOT}/`, "")}`);
    return "";
  }
}

function requireFile(path: string): void {
  if (!existsSync(path)) fail(`missing ${path.replace(`${ROOT}/`, "")}`);
}

function parseJson<T>(path: string): T | null {
  const source = read(path);
  if (!source) return null;
  try {
    return JSON.parse(source) as T;
  } catch {
    fail(`${path.replace(`${ROOT}/`, "")} is not valid JSON`);
    return null;
  }
}

interface ManifestIcon {
  src?: unknown;
  sizes?: unknown;
  type?: unknown;
  purpose?: unknown;
}

interface WebManifest {
  id?: unknown;
  name?: unknown;
  short_name?: unknown;
  start_url?: unknown;
  scope?: unknown;
  display?: unknown;
  theme_color?: unknown;
  background_color?: unknown;
  prefer_related_applications?: unknown;
  icons?: unknown;
}

function validateManifest(
  path: string,
  expectedStart: string,
): void {
  const name = path.replace(`${ROOT}/`, "");
  const manifest = parseJson<WebManifest>(path);
  if (!manifest) return;

  for (const field of [
    "name",
    "short_name",
    "start_url",
    "scope",
    "display",
    "theme_color",
    "background_color",
  ] as const) {
    if (typeof manifest[field] !== "string" || !manifest[field]) {
      fail(`${name} is missing string field "${field}"`);
    }
  }
  if (manifest.start_url !== expectedStart) {
    fail(`${name} start_url must be "${expectedStart}"`);
  }
  if (manifest.scope !== "./") {
    fail(`${name} scope must be "./"`);
  }
  if (
    manifest.display !== "standalone" &&
    manifest.display !== "fullscreen" &&
    manifest.display !== "minimal-ui"
  ) {
    fail(`${name} display must be an installable display mode`);
  }
  if (manifest.prefer_related_applications !== false) {
    fail(`${name} prefer_related_applications must be false`);
  }

  const icons = Array.isArray(manifest.icons)
    ? (manifest.icons as ManifestIcon[])
    : [];
  if (icons.length === 0) {
    fail(`${name} has no icons`);
    return;
  }

  const anySizes = new Set<string>();
  let maskable512 = false;
  for (const icon of icons) {
    if (typeof icon.src !== "string") {
      fail(`${name} has an icon without src`);
      continue;
    }
    const purpose =
      typeof icon.purpose === "string" ? icon.purpose : "any";
    if (purpose.includes("any") && typeof icon.sizes === "string") {
      anySizes.add(icon.sizes);
    }
    if (
      purpose.includes("maskable") &&
      icon.sizes === "512x512" &&
      icon.type === "image/png"
    ) {
      maskable512 = true;
    }
    const iconPath = resolve(dirname(path), icon.src);
    requireFile(iconPath);
  }
  if (!anySizes.has("192x192")) {
    fail(`${name} needs a 192x192 purpose=any icon`);
  }
  if (!anySizes.has("512x512")) {
    fail(`${name} needs a 512x512 purpose=any icon`);
  }
  if (!maskable512) {
    fail(`${name} needs a 512x512 maskable PNG icon`);
  }
}

function validatePng(
  path: string,
  expectedSize: number,
  label: string,
): void {
  requireFile(path);
  if (!existsSync(path)) return;
  try {
    const image = PNG.sync.read(readFileSync(path));
    if (image.width !== expectedSize || image.height !== expectedSize) {
      fail(
        `${label} must be ${expectedSize}x${expectedSize}, got ${image.width}x${image.height}`,
      );
    }
  } catch {
    fail(`${label} is not a readable PNG`);
  }
}

function validateHtml(path: string, manifestLink: string): void {
  const name = path.replace(`${ROOT}/`, "");
  const source = read(path);
  if (!source) return;
  if (!source.includes(`rel="manifest" href="${manifestLink}"`)) {
    fail(`${name} does not link ${manifestLink}`);
  }
  if (!source.includes("apple-touch-icon")) {
    fail(`${name} does not link an apple-touch-icon`);
  }
  if (!source.includes("mobile-web-app-capable")) {
    fail(`${name} does not declare mobile-web-app-capable`);
  }
}

const swPath = join(DIST, "sw.js");
const sw = read(swPath);
const entries = [...sw.matchAll(/url:"([^"]+)"/g)].map(
  (match) => match[1] ?? "",
);
const urls = new Set(entries);

for (const required of [
  "index.html",
  "controller.html",
  "manifest.webmanifest",
  "controller.webmanifest",
  "icons/icon-192.png",
  "icons/icon-512.png",
  "icons/icon-maskable-512.png",
  "icons/apple-touch-icon-180.png",
  "packs/index.json",
  "packs/anatomy-reflex/pack.json",
  "packs/silicon-reflex/pack.json",
  "hub/bathroom/hub.json",
  "syllabi/anatomy-reflex.json",
]) {
  if (!urls.has(required)) {
    fail(`service worker precache is missing ${required}`);
  }
}

for (const url of entries) {
  if (url.startsWith("gdd/")) {
    fail(`service worker must not precache the GDD gallery: ${url}`);
  }
  if (url.startsWith("content/dev/")) {
    fail(`service worker must not precache the dev fixture: ${url}`);
  }
}

if (/NavigationRoute|navigateFallback/.test(sw)) {
  fail("service worker must not install a navigation fallback");
}
if (/workers\.dev|shrinkonauts-rooms/.test(sw)) {
  fail("service worker must not reference the relay");
}

let precacheBytes = 0;
for (const url of entries) {
  const path = join(DIST, url);
  if (!existsSync(path)) {
    fail(`precache entry does not exist in dist: ${url}`);
    continue;
  }
  precacheBytes += statSync(path).size;
}
if (precacheBytes < MIN_PRECACHE_BYTES) {
  fail(
    `precache is unexpectedly small (${precacheBytes} bytes); a pack may be missing`,
  );
}
if (precacheBytes > MAX_PRECACHE_BYTES) {
  fail(
    `precache is unexpectedly large (${precacheBytes} bytes); check globIgnores`,
  );
}

const gameManifest = join(DIST, "manifest.webmanifest");
const controllerManifest = join(DIST, "controller.webmanifest");
validateManifest(gameManifest, "./");
validateManifest(controllerManifest, "./controller.html");
validateHtml(join(DIST, "index.html"), "./manifest.webmanifest");
validateHtml(join(DIST, "controller.html"), "./controller.webmanifest");

validatePng(join(DIST, "icons/icon-192.png"), 192, "icon-192.png");
validatePng(join(DIST, "icons/icon-512.png"), 512, "icon-512.png");
validatePng(
  join(DIST, "icons/icon-maskable-512.png"),
  512,
  "icon-maskable-512.png",
);
validatePng(
  join(DIST, "icons/apple-touch-icon-180.png"),
  180,
  "apple-touch-icon-180.png",
);

if (errors.length > 0) {
  console.error("PWA bundle check failed:");
  for (const message of errors) console.error(`- ${message}`);
  process.exit(1);
}

console.log(
  `PWA bundle is valid (${entries.length} precache entries, ${(precacheBytes / 1024 / 1024).toFixed(1)} MiB).`,
);
