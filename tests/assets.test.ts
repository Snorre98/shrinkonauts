import { describe, expect, it } from "vitest";
import { createAssets } from "../src/assets/assets";
import type { AssetManifest, ManifestAssetEntry } from "../src/assets";
import { silentLogger } from "../src/core/logger";

function manifest(
  id: string,
  assets: Record<string, ManifestAssetEntry>,
): AssetManifest {
  return { schemaVersion: "1.0", id, assets };
}

function finalManifest(): AssetManifest {
  return manifest("assets.final.test", {
    "sprite.player.p1": {
      type: "sprite",
      src: "http://localhost/final/p1.png",
    },
    "sprite.player.p2": {
      type: "sprite",
      src: "http://localhost/final/p2.png",
    },
    "bg.placeholder.near": {
      type: "background",
      placeholder: true,
    },
  });
}

function packManifest(): AssetManifest {
  return manifest("assets.fixture.test", {
    "sprite.player.p1": {
      type: "sprite",
      src: "http://localhost/fixture/p1.svg",
    },
    "bg.placeholder.near": {
      type: "background",
      src: "http://localhost/fixture/bg.svg",
    },
  });
}

describe("createAssets", () => {
  it("resolves every ID to a procedural placeholder without manifests", () => {
    const assets = createAssets({ logger: silentLogger });

    expect(assets.sprite("sprite.player.p1").source).toBe("placeholder");
    expect(assets.image("bg.placeholder.sky").source).toBe("placeholder");
    expect(assets.audio("audio.cue.jump").source).toBe("placeholder");
    expect(assets.font("font.ui").source).toBe("placeholder");
  });

  it("prefers the final manifest, then the pack manifest, then the placeholder", () => {
    const assets = createAssets({
      finalManifest: finalManifest(),
      packManifest: packManifest(),
      logger: silentLogger,
    });

    expect(assets.sprite("sprite.player.p1").source).toBe("final");
    expect(assets.sprite("sprite.player.p2").source).toBe("final");
    expect(assets.image("bg.placeholder.near").source).toBe("pack");
    expect(assets.image("bg.placeholder.far").source).toBe("placeholder");
  });

  it("falls through explicit placeholder entries to the next provider", () => {
    const assets = createAssets({
      finalManifest: finalManifest(),
      packManifest: packManifest(),
      logger: silentLogger,
    });

    const resolved = assets.image("bg.placeholder.near");
    expect(resolved.source).toBe("pack");
    expect(resolved.src).toBe("http://localhost/fixture/bg.svg");
  });

  it("caches resolutions until invalidated", () => {
    const final = finalManifest();
    const assets = createAssets({ finalManifest: final, logger: silentLogger });

    expect(assets.sprite("sprite.player.p1").source).toBe("final");
    delete final.assets["sprite.player.p1"];
    expect(assets.sprite("sprite.player.p1").source).toBe("final");

    assets.invalidate("sprite.player.p1");
    expect(assets.sprite("sprite.player.p1").source).toBe("placeholder");
  });

  it("builds a preload plan and reports unknown prefixes", () => {
    const assets = createAssets({
      finalManifest: finalManifest(),
      packManifest: packManifest(),
      logger: silentLogger,
    });

    const plan = assets.preload([
      "sprite.player.p1",
      "bg.placeholder.near",
      "bg.placeholder.far",
      "sprite.player.p1",
      "not-an-asset-id",
    ]);

    expect(plan.ids).toEqual([
      "sprite.player.p1",
      "bg.placeholder.near",
      "bg.placeholder.far",
      "not-an-asset-id",
    ]);
    expect(plan.missing).toEqual(["not-an-asset-id"]);
    expect(plan.placeholders.sort()).toEqual(["bg.placeholder.far"]);
    expect(plan.descriptors).toHaveLength(3);
    expect(plan.warnings[0]).toContain("not-an-asset-id");
  });

  it("resolves by prefix inference and returns null for unknown IDs", () => {
    const assets = createAssets({ logger: silentLogger });

    expect(assets.resolveById("tileset.placeholder")?.id).toBe(
      "tileset.placeholder",
    );
    expect(assets.resolveById("player.one")).toBeNull();
  });

  it("validates manifests and requested IDs", () => {
    const broken = manifest("assets.broken", {
      "sprite.player.p1": { type: "sheet", src: "http://localhost/p.png" },
    });
    const assets = createAssets({ logger: silentLogger });

    const result = assets.validate(["sprite.player.p1", "nonsense"], broken);

    expect(result.ok).toBe(false);
    expect(result.issues.map((issue) => issue.code)).toEqual(
      expect.arrayContaining(["ASSET_MANIFEST_INVALID", "ASSET_ID_INVALID"]),
    );
  });
});
