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

  it("keeps direct media imports out of gameplay, UI, audio, and platform code", () => {
    const guarded = [
      fileURLToPath(new URL("../src/world/", import.meta.url)),
      fileURLToPath(new URL("../src/ui/", import.meta.url)),
      fileURLToPath(new URL("../src/audio/", import.meta.url)),
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

  it("confines Matter.js imports to the world physics boundary", () => {
    const offenders = sourceFiles(SRC).filter((file) => {
      if (file.includes("/world/")) {
        return false;
      }
      return /from\s+["']matter-js["']/.test(read(file));
    });

    expect(offenders.map(relativeToSrc)).toEqual([]);
  });

  it("includes the ECS kernel in the dependency walk", () => {
    const files = sourceFiles(
      fileURLToPath(new URL("../src/ecs/", import.meta.url)),
    ).map(relativeToSrc);

    expect(files).toEqual(
      expect.arrayContaining([
        "ecs/index.ts",
        "ecs/types.ts",
        "ecs/world.ts",
      ]),
    );
  });

  it("includes the feedback domain in the dependency walk", () => {
    const files = sourceFiles(
      fileURLToPath(new URL("../src/feedback/", import.meta.url)),
    ).map(relativeToSrc);

    expect(files).toEqual(
      expect.arrayContaining([
        "feedback/beats.ts",
        "feedback/components.ts",
        "feedback/descriptors.ts",
        "feedback/director.ts",
        "feedback/effect-presets.ts",
        "feedback/effects.ts",
        "feedback/facts.ts",
        "feedback/index.ts",
        "feedback/lexicon.ts",
        "feedback/types.ts",
      ]),
    );
  });

  it("keeps the ECS kernel dependent only on core", () => {
    const ecsFiles = sourceFiles(
      fileURLToPath(new URL("../src/ecs/", import.meta.url)),
    );
    for (const file of ecsFiles) {
      for (const match of read(file).matchAll(/from\s+["'](\.[^"']+)["']/g)) {
        const specifier = match[1] ?? "";
        const target = specifier.startsWith("./")
          ? "ecs"
          : (specifier.replace(/^(\.\.\/)+/, "").split("/")[0] ?? "");
        expect(target, `${relativeToSrc(file)} -> ${specifier}`).toMatch(
          /^(ecs|core)$/,
        );
      }
    }
  });

  it("keeps feedback free of adapters, pack, and world state", () => {
    const feedbackFiles = sourceFiles(
      fileURLToPath(new URL("../src/feedback/", import.meta.url)),
    );
    for (const file of feedbackFiles) {
      const source = read(file);
      expect(
        source,
        `${relativeToSrc(file)} must not import Phaser`,
      ).not.toMatch(/from\s+["']phaser["']/);
      expect(
        source,
        `${relativeToSrc(file)} must not import Matter`,
      ).not.toMatch(/from\s+["']matter-js["']/);
      for (const target of ["world", "game", "ui", "pack"]) {
        expect(
          source,
          `${relativeToSrc(file)} must not import ${target}`,
        ).not.toMatch(new RegExp(`from\\s+["']\\.\\./${target}(?:/[^"']*)?["']`));
      }
      for (const match of source.matchAll(/from\s+["'](\.[^"']+)["']/g)) {
        const specifier = match[1] ?? "";
        const target = specifier.startsWith("./")
          ? "feedback"
          : (specifier.replace(/^(\.\.\/)+/, "").split("/")[0] ?? "");
        expect(target, `${relativeToSrc(file)} -> ${specifier}`).toMatch(
          /^(feedback|core|ecs|puzzle)$/,
        );
      }
    }
  });

  it("keeps feedback out of the world module", () => {
    const worldFiles = sourceFiles(
      fileURLToPath(new URL("../src/world/", import.meta.url)),
    );
    for (const file of worldFiles) {
      expect(
        read(file),
        `${relativeToSrc(file)} must not import feedback`,
      ).not.toMatch(/from\s+["']\.\.\/feedback(?:\/[^"']*)?["']/);
    }
  });

  it("keeps feedback out of the pack module", () => {
    const packFiles = sourceFiles(
      fileURLToPath(new URL("../src/pack/", import.meta.url)),
    );
    for (const file of packFiles) {
      expect(
        read(file),
        `${relativeToSrc(file)} must not import feedback`,
      ).not.toMatch(/from\s+["']\.\.\/feedback(?:\/[^"']*)?["']/);
    }
  });

  it("lets UI consume feedback but not puzzle internals", () => {
    const uiFiles = sourceFiles(
      fileURLToPath(new URL("../src/ui/", import.meta.url)),
    );
    let feedbackImports = 0;
    for (const file of uiFiles) {
      const source = read(file);
      expect(
        source,
        `${relativeToSrc(file)} must not import puzzle internals`,
      ).not.toMatch(/from\s+["']\.\.\/puzzle(?:\/[^"']*)?["']/);
      if (/from\s+["']\.\.\/feedback(?:\/[^"']*)?["']/.test(source)) {
        feedbackImports += 1;
      }
    }
    expect(feedbackImports).toBeGreaterThan(0);
  });

  it("keeps module dependencies acyclic and directionally ordered", () => {
    // ADR-0002: domain modules never depend on adapters, and adapters only
    // depend downwards. A module may always import from itself.
    const allowed: Record<string, readonly string[]> = {
      core: [],
      ecs: ["core"],
      feedback: ["core", "ecs", "puzzle"],
      syllabus: ["core"],
      assets: ["core"],
      puzzle: [],
      pack: ["assets", "core", "puzzle", "syllabus"],
      hub: ["assets", "core", "pack"],
      progression: ["pack"],
      narrative: ["pack"],
      curriculum: ["core", "pack", "syllabus"],
      save: ["curriculum", "progression", "puzzle"],
      audio: ["assets", "core"],
      ui: ["assets", "core", "curriculum", "feedback", "pack"],
      world: ["assets", "core", "hub", "pack", "puzzle"],
      game: [
        "assets",
        "audio",
        "core",
        "curriculum",
        "feedback",
        "hub",
        "narrative",
        "pack",
        "progression",
        "puzzle",
        "save",
        "syllabus",
        "ui",
        "world",
      ],
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
