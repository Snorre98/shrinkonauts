import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  parseManifest,
  type AssetManifest,
  type ManifestAssetEntry,
} from "../src/assets";
import { NODE_EFFECT_SOCKETS, effectPresetIds } from "../src/feedback";
import { parseRoom, parseTheme, validatePack } from "../src/pack";
import type {
  FeedbackValidationVocabulary,
  PackContent,
  RoomDocument,
  ThemeDocument,
} from "../src/pack";
import type { PuzzleDocument } from "../src/puzzle";
import { loadContent, packDirectory, primaryRoom } from "../scripts/content-loader";

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
const feedbackVocabulary: FeedbackValidationVocabulary = {
  effectPresetIds: effectPresetIds(),
  tilePathPreset: "fx.tile.path",
  nodeEffectSockets: NODE_EFFECT_SOCKETS,
};

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

const PACK_DIR = new URL("../public/packs/anatomy-reflex/", import.meta.url);

function readPackJson(file: string): unknown {
  return JSON.parse(readFileSync(new URL(file, PACK_DIR), "utf8"));
}

function packManifest(file: string): AssetManifest {
  const path = new URL(file, PACK_DIR);
  const parsed = parseManifest(readPackJson(file), path.toString());
  if (!parsed.ok) {
    throw new Error(parsed.error);
  }
  return parsed.value.manifest;
}

describe("puzzle gate recovery warnings", () => {
  const content = loadContent(packDirectory("anatomy-reflex"));
  const final = packManifest(
    content.pack.assetManifests.final ?? "assets.final.json",
  );
  const placeholder = packManifest(
    content.pack.assetManifests.placeholder ?? "assets.placeholder.json",
  );

  function validateAnatomy(
    mutate: (copy: PackContent) => void = () => {},
    vocabulary: FeedbackValidationVocabulary | null = feedbackVocabulary,
  ) {
    const copy = structuredClone(content);
    mutate(copy);
    return validatePack({
      room: primaryRoom(copy),
      theme: copy.theme,
      finalManifest: final,
      packManifest: placeholder,
      fileExists,
      content: copy,
      ...(vocabulary ? { feedbackVocabulary: vocabulary } : {}),
    });
  }

  function validateWithEndplate(mutate: (puzzle: PuzzleDocument) => void) {
    return validateAnatomy((copy) => {
      const puzzle = copy.puzzles["puzzle-endplate-ferry"];
      if (!puzzle) throw new Error("endplate puzzle missing");
      mutate(puzzle);
    });
  }

  function nodesFor(
    copy: PackContent,
    levelId: string,
    puzzleId: string,
  ): NonNullable<
    NonNullable<
      NonNullable<PackContent["levels"][number]["feedback"]>["puzzles"]
    >[string]["nodes"]
  > {
    const level = copy.levels.find((item) => item.id === levelId);
    const nodes = level?.feedback?.puzzles?.[puzzleId]?.nodes;
    if (!nodes) throw new Error(`${levelId}/${puzzleId} feedback nodes missing`);
    return nodes;
  }

  it("accepts the authored feedback with the injected vocabulary", () => {
    const result = validateAnatomy();
    expect(result.issues).toEqual([]);
    expect(
      result.warnings.filter(
        (warning) =>
          warning.includes("authored label") ||
          warning.includes("conventionally emits") ||
          warning.includes("tileTarget"),
      ),
    ).toEqual([]);
  });

  it("requires a feedback vocabulary when content authors feedback", () => {
    const result = validateAnatomy(undefined, null);
    expect(result.ok).toBe(false);
    expect(result.issues.map((issue) => issue.code)).toContain(
      "FEEDBACK_VOCABULARY_MISSING",
    );
  });

  it("rejects feedback for a puzzle the level does not author", () => {
    const result = validateAnatomy((copy) => {
      const level = copy.levels.find((item) => item.id === "03-nerve-forest");
      const puzzles = level?.feedback?.puzzles;
      if (!puzzles) throw new Error("03 feedback missing");
      puzzles["puzzle-missing"] = {};
    });

    expect(result.issues.map((issue) => issue.code)).toContain(
      "FEEDBACK_REFERENCE_MISSING",
    );
  });

  it("rejects beats and node overrides that reference missing nodes", () => {
    const beats = validateAnatomy((copy) => {
      const level = copy.levels.find((item) => item.id === "03-nerve-forest");
      const beat = level?.feedback?.puzzles?.["puzzle-node-run"]?.beats?.[0];
      if (!beat) throw new Error("03 beat missing");
      beat.nodes.push("missing-node");
    });
    const nodes = validateAnatomy((copy) => {
      nodesFor(copy, "03-nerve-forest", "puzzle-node-run")["missing-node"] = {
        label: "Missing",
      };
    });

    expect(beats.issues.map((issue) => issue.code)).toContain(
      "FEEDBACK_REFERENCE_MISSING",
    );
    expect(nodes.issues.map((issue) => issue.code)).toContain(
      "FEEDBACK_REFERENCE_MISSING",
    );
  });

  it("rejects an unknown effect preset", () => {
    const result = validateAnatomy((copy) => {
      const nodes = nodesFor(copy, "04-muscle-effector", "puzzle-endplate-ferry");
      const gate = nodes["muscle-gate"];
      if (!gate) throw new Error("muscle-gate override missing");
      gate.effectPreset = "fx.missing";
    });

    expect(result.issues.map((issue) => issue.code)).toContain(
      "FEEDBACK_EFFECT_UNKNOWN",
    );
  });

  it("rejects invalid tile layers and out-of-bounds regions", () => {
    const result = validateAnatomy((copy) => {
      const nodes = nodesFor(copy, "03-nerve-forest", "puzzle-node-run");
      const relay = nodes["spike-relay"];
      if (!relay?.tileTarget || relay.tileTarget.kind !== "tileRegion") {
        throw new Error("spike-relay tile target missing");
      }
      relay.tileTarget.layer = "missing-layer";
      relay.tileTarget.x2 = 999;
    });

    expect(result.issues.map((issue) => issue.code)).toContain(
      "FEEDBACK_TILE_INVALID",
    );
  });

  it("requires a tile target for the tile-path preset", () => {
    const result = validateAnatomy((copy) => {
      const nodes = nodesFor(copy, "03-nerve-forest", "puzzle-node-run");
      const relay = nodes["spike-relay"];
      if (!relay) throw new Error("spike-relay override missing");
      delete relay.tileTarget;
    });

    expect(result.issues.map((issue) => issue.code)).toContain(
      "FEEDBACK_LAYOUT_INVALID",
    );
  });

  it("warns when a tile target has no tile-path effect", () => {
    const result = validateAnatomy((copy) => {
      const nodes = nodesFor(copy, "04-muscle-effector", "puzzle-endplate-ferry");
      const gate = nodes["muscle-gate"];
      if (!gate) throw new Error("muscle-gate override missing");
      gate.tileTarget = {
        kind: "tile",
        layer: "tiles",
        x: 4,
        y: 5,
      };
    });

    expect(result.warnings.some((warning) => warning.includes("tileTarget"))).toBe(
      true,
    );
  });

  it("warns about empty hints, missing labels, and missing conventional sockets", () => {
    const emptyHints = validateAnatomy((copy) => {
      const puzzle = copy.puzzles["puzzle-node-run"];
      if (!puzzle) throw new Error("node-run puzzle missing");
      puzzle.hints = [];
    });
    const missingLabel = validateAnatomy((copy) => {
      const nodes = nodesFor(copy, "03-nerve-forest", "puzzle-node-run");
      const input = nodes["input-a"];
      if (!input) throw new Error("input-a override missing");
      delete input.label;
    });
    const missingSocket = validateAnatomy((copy) => {
      const room = copy.rooms["room-muscle-effector"];
      const terminal = room?.entities?.find(
        (entity) => entity.id === "motor-terminal",
      );
      if (!terminal?.components?.anchors) {
        throw new Error("motor-terminal anchors missing");
      }
      delete terminal.components.anchors.muzzle;
    });

    expect(emptyHints.warnings.some((warning) => warning.includes("no hints"))).toBe(
      true,
    );
    expect(
      missingLabel.warnings.some((warning) => warning.includes("authored label")),
    ).toBe(true);
    expect(
      missingSocket.warnings.some((warning) =>
        warning.includes('socket "muzzle"'),
      ),
    ).toBe(true);
  });

  it("reports unknown theme cue names as errors", () => {
    const result = validateAnatomy((copy) => {
      if (!copy.theme.audio?.cues) throw new Error("theme cues missing");
      copy.theme.audio.cues.mystery = "audio.cue.jump";
    });

    expect(result.ok).toBe(false);
    expect(result.issues.map((issue) => issue.code)).toContain(
      "AUDIO_CUE_UNKNOWN",
    );
  });

  it("does not warn about the fixed Endplate Ferry gate", () => {
    const result = validateWithEndplate(() => {});
    expect(
      result.warnings.filter((warning) => warning.includes("permanently")),
    ).toEqual([]);
  });

  it("warns when a non-latched gate can close permanently", () => {
    const result = validateWithEndplate((puzzle) => {
      const link = puzzle.links.find(
        (entry) => entry.from === "ca-timer" && entry.to === "ca-gate",
      );
      if (!link) throw new Error("ca-timer -> ca-gate link missing");
      link.type = "elapsed";
    });

    expect(
      result.warnings.some(
        (warning) =>
          warning.includes('gate "ca-gate"') &&
          warning.includes("permanently"),
      ),
    ).toBe(true);
  });

  it("validates material references, palettes, variants, and UI slots", () => {
    const missingMaterial = validateAnatomy((copy) => {
      const room = copy.rooms["room-nerve-forest"];
      if (!room?.tileMaterialLegend) throw new Error("room legend missing");
      room.tileMaterialLegend.b = {
        materialId: "missing",
        autotile: "blob47",
      };
    });
    expect(
      missingMaterial.issues.map((issue) => issue.code),
    ).toContain("MATERIAL_REFERENCE_MISSING");

    const badPalette = validateAnatomy((copy) => {
      const material = copy.materials?.materials.bone;
      if (!material) throw new Error("bone missing");
      material.palette = ["missing-token"];
    });
    expect(
      badPalette.issues.map((issue) => issue.code),
    ).toContain("MATERIAL_PALETTE_INVALID");

    const badUi = validateAnatomy((copy) => {
      if (!copy.theme.ui.materials) throw new Error("ui materials missing");
      copy.theme.ui.materials.panel = "missing";
    });
    expect(badUi.issues.map((issue) => issue.code)).toContain(
      "UI_MATERIAL_INVALID",
    );

    const badBackground = validateAnatomy((copy) => {
      const layer = copy.rooms["room-nerve-forest"]?.background.layers[0];
      if (!layer) throw new Error("background layer missing");
      layer.materialId = "missing";
    });
    expect(
      badBackground.issues.map((issue) => issue.code),
    ).toContain("BACKGROUND_MATERIAL_INVALID");

    const wang = validateAnatomy((copy) => {
      const room = copy.rooms["room-muscle-effector"];
      if (!room?.tileMaterialLegend) throw new Error("room legend missing");
      room.tileMaterialLegend.m.autotile = "wang";
    });
    expect(wang.issues.map((issue) => issue.code)).toContain(
      "MATERIAL_DEFERRED",
    );
  });

  it("keeps old content without a materials document valid", () => {
    const legacy = validatePack({
      room,
      theme,
      finalManifest,
      packManifest: fixtureManifest,
      fileExists,
    });
    expect(legacy.ok).toBe(true);
    expect(legacy.issues).toEqual([]);
  });
});
