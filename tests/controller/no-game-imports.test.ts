import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const CONTROLLER_DIR = fileURLToPath(
  new URL("../../src/controller/", import.meta.url),
);
const ROOT = fileURLToPath(new URL("../../", import.meta.url));

const MEDIA_PATTERN =
  /(["'])[^"'\n]+\.(?:avif|png|jpe?g|gif|webp|svg|mp3|wav|ogg|m4a|woff2?|ttf|otf)\1/i;

const FORBIDDEN_MODULES = new Set([
  "assets",
  "audio",
  "curriculum",
  "ecs",
  "feedback",
  "game",
  "hub",
  "materials",
  "narrative",
  "pack",
  "progression",
  "puzzle",
  "save",
  "syllabus",
  "ui",
  "world",
]);

function sourceFiles(directory: string): string[] {
  const files: string[] = [];
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...sourceFiles(path));
    } else if (entry.isFile() && entry.name.endsWith(".ts")) {
      files.push(path);
    }
  }
  return files;
}

function read(path: string): string {
  return readFileSync(path, "utf8");
}

describe("controller entry boundary", () => {
  it("imports only the controller module and the pure net seam", () => {
    for (const file of sourceFiles(CONTROLLER_DIR)) {
      const source = read(file);
      for (const match of source.matchAll(/from\s+["'](\.[^"']+)["']/g)) {
        const specifier = match[1] ?? "";
        if (specifier.startsWith("./")) continue;
        expect(
          specifier,
          `${file} must import the net modules directly, not the host barrel`,
        ).not.toBe("../net");
        const target = specifier.replace(/^(\.\.\/)+/, "").split("/")[0];
        expect(
          FORBIDDEN_MODULES.has(target ?? ""),
          `${file} must not import ${specifier}`,
        ).toBe(false);
      }
      expect(source).not.toMatch(/from\s+["']phaser["']/);
      expect(source).not.toMatch(/from\s+["']matter-js["']/);
      expect(source).not.toMatch(MEDIA_PATTERN);
    }
  });

  it("ships a standalone controller document with no game mount points", () => {
    const html = read(join(ROOT, "controller.html"));
    expect(html).toContain('src="/src/controller/main.ts"');
    expect(html).not.toContain("game-root");
    expect(html).not.toContain("ui-root");
    expect(html).not.toContain("<canvas");
  });

  it("keeps the controller stylesheet free of external asset URLs", () => {
    const css = read(join(CONTROLLER_DIR, "controller.css"));
    expect(css).not.toMatch(/url\(/i);
    expect(css).not.toMatch(MEDIA_PATTERN);
  });

  it("builds the controller as a separate Vite entry", () => {
    const vite = read(join(ROOT, "vite.config.ts"));
    expect(vite).toContain("controller.html");
    expect(vite).toContain("rollupOptions");
  });
});
