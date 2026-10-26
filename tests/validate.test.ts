import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  parseManifest,
  type AssetManifest,
  type ManifestAssetEntry,
} from "../src/assets";
import { parseRoom, parseTheme, validatePack } from "../src/pack";
import type { RoomDocument, ThemeDocument } from "../src/pack";

const CONTENT_DIR = new URL("../public/content/dev/", import.meta.url);

function readJson(file: string): unknown {
  return JSON.parse(readFileSync(new URL(file, CONTENT_DIR), "utf8"));
}

function readManifest(file: string): AssetManifest {
  const parsed = parseManifest(
    readJson(file),
    new URL(file, CONTENT_DIR).toString(),
  );
  if (!parsed.ok) {
    throw new Error(parsed.error);
  }
  return parsed.value.manifest;
}

function fileExists(src: string): boolean {
  try {
    const url = new URL(src);
    return url.protocol === "file:" && existsSync(fileURLToPath(url));
  } catch {
    return false;
  }
}

function manifest(
  assets: Record<string, ManifestAssetEntry>,
): AssetManifest {
  return { schemaVersion: "1.0", id: "assets.test", assets };
}

const room = (() => {
  const parsed = parseRoom(readJson("room.json"));
  if (!parsed.ok) {
    throw new Error(parsed.error);
  }
  return parsed.value;
})();

const theme = (() => {
  const parsed = parseTheme(readJson("theme.json"));
  if (!parsed.ok) {
    throw new Error(parsed.error);
  }
  return parsed.value;
})();

const finalManifest = readManifest("assets.final.json");
const fixtureManifest = readManifest("assets.fixture.json");

function clone<T>(value: T): T {
  return structuredClone(value);
}

describe("validatePack", () => {
  it("passes the real dev content in placeholder and fixture modes", () => {
    const placeholder = validatePack({
      room,
      theme,
      finalManifest,
      packManifest: null,
      fileExists,
    });
    expect(placeholder.issues).toEqual([]);
    expect(placeholder.ok).toBe(true);
    expect(placeholder.ids).toHaveLength(10);
    expect(placeholder.placeholders).toHaveLength(10);

    const fixture = validatePack({
      room,
      theme,
      finalManifest,
      packManifest: fixtureManifest,
      fileExists,
    });
    expect(fixture.issues).toEqual([]);
    expect(fixture.ok).toBe(true);
    expect(fixture.placeholders).toHaveLength(7);
  });

  it("reports referenced IDs with unknown prefixes", () => {
    const broken: RoomDocument = clone(room);
    broken.tileset = "not-an-asset-id";

    const result = validatePack({
      room: broken,
      theme,
      finalManifest,
      fileExists,
    });

    expect(result.ok).toBe(false);
    expect(result.issues.map((issue) => issue.code)).toContain(
      "ASSET_ID_INVALID",
    );
    expect(
      result.issues.some((issue) => issue.id === "not-an-asset-id"),
    ).toBe(true);
  });

  it("reports manifest files that do not exist", () => {
    const broken = manifest({
      "sprite.player.p1": {
        type: "sprite",
        src: "file:///content/missing-player.png",
        license: "test",
      },
    });

    const result = validatePack({
      room,
      theme,
      finalManifest: broken,
      fileExists: () => false,
    });

    expect(result.ok).toBe(false);
    expect(result.issues.map((issue) => issue.code)).toContain(
      "ASSET_FILE_MISSING",
    );
  });

  it("requires a licence for non-placeholder final entries", () => {
    const broken = manifest({
      "sprite.player.p1": {
        type: "sprite",
        src: "file:///content/player.png",
      },
    });

    const result = validatePack({
      room,
      theme,
      finalManifest: broken,
      fileExists: () => true,
    });

    expect(result.ok).toBe(false);
    expect(result.issues.map((issue) => issue.code)).toContain(
      "LICENSE_MISSING",
    );
  });

  it("reports invalid background layers", () => {
    const broken: RoomDocument = clone(room);
    const layer = broken.background.layers[0];
    if (!layer) {
      throw new Error("expected a background layer");
    }
    layer.assetId = "not-an-image";
    layer.parallaxX = Number.NaN;

    const result = validatePack({
      room: broken,
      theme,
      finalManifest,
      fileExists,
    });

    expect(result.ok).toBe(false);
    expect(result.issues.map((issue) => issue.code)).toContain(
      "BACKGROUND_LAYER_INVALID",
    );
  });

  it("reports audio cues and UI assets that resolve to the wrong category", () => {
    const brokenTheme: ThemeDocument = clone(theme);
    if (!brokenTheme.audio?.cues) {
      throw new Error("expected theme audio cues");
    }
    brokenTheme.audio.cues.jump = "not-an-audio-id";
    brokenTheme.ui.assets.badge = "audio.cue.jump";

    const result = validatePack({
      room,
      theme: brokenTheme,
      finalManifest,
      fileExists,
    });

    const codes = result.issues.map((issue) => issue.code);
    expect(codes).toContain("AUDIO_CUE_MISSING");
    expect(codes).toContain("UI_ASSET_MISSING");
  });

  it("reports malformed manifest entries", () => {
    const broken = manifest({
      "sprite.player.p1": {
        type: "audio",
        placeholder: false,
      },
    });

    const result = validatePack({
      room,
      theme,
      finalManifest: broken,
      fileExists: () => true,
    });

    const codes = result.issues.map((issue) => issue.code);
    expect(codes).toContain("ASSET_FORMAT_UNSUPPORTED");
    expect(codes).toContain("ASSET_FILE_MISSING");
  });

  it("rejects unknown entity component keys", () => {
    const raw = JSON.parse(
      readFileSync(
        new URL(
          "../public/packs/anatomy-reflex/levels/03-nerve-forest/room.json",
          import.meta.url,
        ),
        "utf8",
      ),
    );
    const entity = raw.entities?.[0];
    if (!entity) throw new Error("expected a room entity");
    entity.components = { ...(entity.components ?? {}), mystery: {} };

    const parsed = parseRoom(raw);
    expect(parsed.ok).toBe(false);
    if (!parsed.ok) {
      expect(parsed.error).toContain("components.mystery is not supported");
    }
  });
});
