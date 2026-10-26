import { describe, expect, it } from "vitest";
import { parseManifest } from "../src/assets/manifest";

const MANIFEST_URL = "http://localhost:5173/content/dev/assets.fixture.json";

function validManifest(): Record<string, unknown> {
  return {
    schemaVersion: "1.0",
    id: "assets.test",
    assets: {
      "sprite.player.p1": {
        type: "sprite",
        src: "fixtures/player-p1.svg",
        license: "test",
      },
      "bg.placeholder.near": {
        type: "background",
        src: "/content/dev/fixtures/bg-near.svg",
      },
      "audio.cue.jump": {
        type: "audio",
        placeholder: true,
      },
    },
  };
}

describe("parseManifest", () => {
  it("accepts a manifest and resolves sources relative to the manifest URL", () => {
    const result = parseManifest(validManifest(), MANIFEST_URL);

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    expect(result.value.manifest.assets["sprite.player.p1"]?.src).toBe(
      "http://localhost:5173/content/dev/fixtures/player-p1.svg",
    );
    expect(result.value.manifest.assets["bg.placeholder.near"]?.src).toBe(
      "http://localhost:5173/content/dev/fixtures/bg-near.svg",
    );
    expect(result.value.warnings).toEqual([]);
  });

  it("rejects unsupported schema versions", () => {
    const input = validManifest();
    input.schemaVersion = "2.0";

    const result = parseManifest(input, MANIFEST_URL);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain("ASSET_SCHEMA_VERSION");
    }
  });

  it("rejects unsupported asset types", () => {
    const input = validManifest();
    (input.assets as Record<string, unknown>)["sprite.player.p1"] = {
      type: "video",
      src: "fixtures/player-p1.svg",
    };

    const result = parseManifest(input, MANIFEST_URL);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain("ASSET_FORMAT_UNSUPPORTED");
    }
  });

  it("rejects cross-origin sources", () => {
    const input = validManifest();
    (input.assets as Record<string, unknown>)["sprite.player.p1"] = {
      type: "sprite",
      src: "https://cdn.example.com/player.png",
    };

    const result = parseManifest(input, MANIFEST_URL);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain("same-origin");
    }
  });

  it("requires frame metadata for sheets", () => {
    const input = validManifest();
    (input.assets as Record<string, unknown>)["sprite.player.p1"] = {
      type: "sheet",
      src: "fixtures/player-sheet.png",
      frameWidth: 32,
    };

    const result = parseManifest(input, MANIFEST_URL);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain("ASSET_MANIFEST_INVALID");
    }
  });

  it("allows explicit placeholder entries without a source", () => {
    const result = parseManifest(
      {
        schemaVersion: "1.1",
        id: "assets.placeholders",
        assets: {
          "sprite.player.p1": { type: "sprite", placeholder: true },
        },
      },
      MANIFEST_URL,
    );

    expect(result.ok).toBe(true);
  });
});
