#!/usr/bin/env tsx
/**
 * Serve the production build under the GitHub Pages subpath.
 *
 *   npm run preview:pwa
 *
 * The real deployment lives at /shrinkonauts/. `vite preview` serves at the
 * root, so this small server is used by the PWA Playwright suite to exercise
 * relative manifest, icon, and service-worker scopes.
 */

import { createReadStream, existsSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { dirname, extname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const DIST = join(ROOT, "dist");
const args = process.argv.slice(2);

function argument(name: string, fallback: string): string {
  const index = args.indexOf(name);
  if (index < 0) return fallback;
  return args[index + 1] ?? fallback;
}

function normaliseBase(value: string): string {
  const trimmed = value.trim();
  const withLeading = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
  return withLeading.endsWith("/") ? withLeading : `${withLeading}/`;
}

const port = Number(argument("--port", "4174"));
const base = normaliseBase(argument("--base", "/shrinkonauts/"));

const MIME_TYPES: Record<string, string> = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".md": "text/markdown; charset=utf-8",
  ".mp3": "audio/mpeg",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".txt": "text/plain; charset=utf-8",
  ".webmanifest": "application/manifest+json; charset=utf-8",
  ".webp": "image/webp",
  ".woff2": "font/woff2",
};

function send(
  response: import("node:http").ServerResponse,
  status: number,
  body: string,
): void {
  response.writeHead(status, {
    "Content-Type": "text/plain; charset=utf-8",
    "Content-Length": Buffer.byteLength(body),
    "Cache-Control": "no-store",
  });
  response.end(body);
}

function resolvePath(pathname: string): string | null {
  if (!pathname.startsWith(base)) return null;
  const relative = pathname.slice(base.length - 1);
  let decoded: string;
  try {
    decoded = decodeURIComponent(relative);
  } catch {
    return null;
  }
  const target = resolve(DIST, `.${decoded}`);
  if (target !== DIST && !target.startsWith(`${DIST}/`)) return null;
  if (!existsSync(target)) return null;
  const stats = statSync(target);
  if (!stats.isFile()) {
    const index = join(target, "index.html");
    return existsSync(index) ? index : null;
  }
  return target;
}

const server = createServer((request, response) => {
  const url = new URL(request.url ?? "/", "http://127.0.0.1");
  const pathname = url.pathname;

  if (request.method !== "GET" && request.method !== "HEAD") {
    send(response, 405, "Method Not Allowed");
    return;
  }

  const file = resolvePath(pathname);
  if (!file) {
    send(response, 404, "Not Found");
    return;
  }

  const type = MIME_TYPES[extname(file)] ?? "application/octet-stream";
  const stats = statSync(file);
  const cacheable = !/\/(sw|workbox-[^/]+)\.js$/.test(file) &&
    !file.endsWith(".webmanifest");
  response.writeHead(200, {
    "Content-Type": type,
    "Content-Length": stats.size,
    "Cache-Control": cacheable ? "public, max-age=60" : "no-cache",
    "Service-Worker-Allowed": base,
  });

  if (request.method === "HEAD") {
    response.end();
    return;
  }
  createReadStream(file).pipe(response);
});

server.listen(port, "127.0.0.1", () => {
  console.log(
    `[pwa-preview] serving dist at http://127.0.0.1:${port}${base}`,
  );
});

function shutdown(): void {
  server.close(() => process.exit(0));
}
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
