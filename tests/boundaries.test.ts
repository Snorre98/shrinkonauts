import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const SRC = fileURLToPath(new URL("../src/", import.meta.url));

const MEDIA_PATTERN =
  /(["'])[^"'\n]+\.(?:avif|png|jpe?g|gif|webp|svg|mp3|wav|ogg|m4a|woff2?|ttf|otf)\1/i;

function sourceFiles(directory: string): string[] {
  const files: string[] = [];

  const walk = (current: string): void => {
    for (const entry of readdirSync(current, { withFileTypes: true })) {
      const path = join(current, entry.name);
      if (entry.isDirectory()) {
        walk(path);
      } else if (entry.isFile() && entry.name.endsWith(".ts")) {
        files.push(path);
      }
    }
  };

  walk(directory);
  return files;
}

function read(file: string): string {
  return readFileSync(file, "utf8");
}

function relativeToSrc(file: string): string {
  return relative(SRC, file);
}

describe("module boundaries", () => {
  it("keeps media paths and pack loading out of the assets module", () => {
    for (const file of sourceFiles(fileURLToPath(new URL("../src/assets/", import.meta.url)))) {
      const source = read(file);
      expect(source, `${relativeToSrc(file)} must not import Phaser`).not.toMatch(
        /from\s+["']phaser["']/,
      );
      expect(source, `${relativeToSrc(file)} must not embed media paths`).not.toMatch(
        MEDIA_PATTERN,
      );
    }
  });

  it("keeps direct media imports out of gameplay, UI, and platform code", () => {
    const guarded = [
      fileURLToPath(new URL("../src/world/", import.meta.url)),
      fileURLToPath(new URL("../src/ui/", import.meta.url)),
      fileURLToPath(new URL("../src/game/", import.meta.url)),
      fileURLToPath(new URL("../src/platform/", import.meta.url)),
    ];

    for (const directory of guarded) {
      for (const file of sourceFiles(directory)) {
        const source = read(file);
        expect(
          source,
          `${relativeToSrc(file)} must resolve visuals through asset IDs`,
        ).not.toMatch(MEDIA_PATTERN);
        expect(
          source,
          `${relativeToSrc(file)} must not reference public files directly`,
        ).not.toMatch(/public\/content/);
      }
    }
  });

  it("confines Phaser imports to the world renderer", () => {
    const offenders = sourceFiles(SRC).filter((file) => {
      if (file.includes("/world/")) {
        return false;
      }
      return /from\s+["']phaser["']/.test(read(file));
    });

    expect(offenders.map(relativeToSrc)).toEqual([]);
  });

  it("keeps module dependencies acyclic and directionally ordered", () => {
    // ADR-0002: domain modules never depend on adapters, and adapters only
    // depend downwards. A module may always import from itself.
    const allowed: Record<string, readonly string[]> = {
      core: [],
      assets: ["core"],
      pack: ["assets", "core"],
      ui: ["assets", "core", "pack"],
      world: ["assets", "core", "pack"],
      game: ["assets", "core", "pack", "ui", "world"],
      platform: ["core", "game", "ui"],
    };

    const violations: string[] = [];

    for (const file of sourceFiles(SRC)) {
      const from = relativeToSrc(file).split("/")[0] ?? "";
      if (!(from in allowed)) {
        continue;
      }

      for (const match of read(file).matchAll(/from\s+["'](\.[^"']+)["']/g)) {
        const specifier = match[1];
        if (!specifier) {
          continue;
        }

        const target = specifier.startsWith("./")
          ? from
          : (specifier.replace(/^(\.\.\/)+/, "").split("/")[0] ?? "");

        if (!target || target === from) {
          continue;
        }

        if (!allowed[from]?.includes(target)) {
          violations.push(`${relativeToSrc(file)} -> ${target}`);
        }
      }
    }

    expect(violations).toEqual([]);
  });
});
