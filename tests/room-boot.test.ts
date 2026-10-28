import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { parseManifest } from "../src/assets/manifest";
import { createAssets } from "../src/assets/assets";
import type { AssetManifest } from "../src/assets";
import { silentLogger } from "../src/core/logger";
import { parseAssetMode } from "../src/game/asset-mode";
import {
  collectRoomAssetIds,
  collectThemeAssetIds,
  parseRoom,
  parseTheme,
} from "../src/pack";
import { PLAYER_ASSET_IDS } from "../src/world/ids";
import {
  createRoomSimulation,
  emptyIntents,
  roomPixelHeight,
  roomPixelWidth,
  stepRoomSimulation,
} from "../src/world/simulation";
import { entityAnchorPoint } from "../src/world/effect-types";

const CONTENT_DIR = new URL("../public/content/dev/", import.meta.url);
const VIEWPORT = { width: 1280, height: 720 };

function readJson(file: string): unknown {
  return JSON.parse(readFileSync(new URL(file, CONTENT_DIR), "utf8"));
}

function readManifest(file: string): AssetManifest {
  const url = new URL(file, CONTENT_DIR).toString();
  const parsed = parseManifest(readJson(file), url);
  if (!parsed.ok) {
    throw new Error(parsed.error);
  }
  return parsed.value.manifest;
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
const allIds = [
  ...collectRoomAssetIds(room),
  ...collectThemeAssetIds(theme),
  ...Object.values(PLAYER_ASSET_IDS),
];

describe("dev room content", () => {
  it("boots a tile room with both players and four parallax layers", () => {
    expect(room.tileSize).toBe(32);
    expect(room.layers.tiles).toHaveLength(room.height);
    expect(room.layers.tiles.every((row) => row.length === room.width)).toBe(
      true,
    );
    expect(room.background.layers).toHaveLength(4);
    expect(room.background.layers.map((layer) => layer.assetId)).toEqual([
      "bg.placeholder.sky",
      "bg.placeholder.far",
      "bg.placeholder.mid",
      "bg.placeholder.near",
    ]);
    expect(room.spawns.player1).toEqual({ x: 5, y: 30 });
    expect(room.spawns.player2).toEqual({ x: 8, y: 30 });
  });

  it("parses authored entity anchors with default fallbacks", () => {
    const raw = structuredClone(readJson("room.json")) as Record<string, unknown>;
    const entities = Array.isArray(raw.entities) ? raw.entities : [];
    entities.push({
      id: "anchor-test",
      type: "body",
      x: 1,
      y: 1,
      components: {
        body: { width: 36, height: 36 },
        anchors: { muzzle: { x: 18, y: 8, direction: 0 } },
      },
    });
    raw.entities = entities;
    const parsed = parseRoom(raw);
    expect(parsed.ok).toBe(true);
    if (parsed.ok) {
      expect(parsed.value.entities?.[0]?.components?.anchors).toEqual({
        muzzle: { x: 18, y: 8, direction: 0 },
      });
    }
  });

  it("declares every content and player asset ID in the final manifest", () => {
    const declared = new Set(Object.keys(finalManifest.assets));
    for (const id of allIds) {
      expect(declared.has(id), `${id} missing from assets.final.json`).toBe(
        true,
      );
    }
    expect(theme.ui.assets.badge).toBe("ui.icon.badge");
  });

  it("resolves every ID to a placeholder when no art is delivered", () => {
    const assets = createAssets({
      finalManifest,
      logger: silentLogger,
    });
    const plan = assets.preload(allIds);

    expect(plan.missing).toEqual([]);
    expect(plan.ids).toHaveLength(new Set(allIds).size);
    expect(plan.placeholders).toHaveLength(plan.ids.length);
    for (const descriptor of plan.descriptors) {
      expect(descriptor.source).toBe("placeholder");
      expect(descriptor.placeholderSpec.kind).toBeTruthy();
    }
    expect(assets.validate(allIds, finalManifest).issues).toEqual([]);
  });

  it("replaces only the fixture IDs when fixture mode is selected", () => {
    const assets = createAssets({
      finalManifest,
      packManifest: fixtureManifest,
      logger: silentLogger,
    });
    const plan = assets.preload(allIds);

    expect(plan.missing).toEqual([]);

    const fixtureIds = ["sprite.player.p1", "sprite.player.p2", "bg.placeholder.near"];
    for (const id of fixtureIds) {
      const resolved = assets.resolveById(id);
      expect(resolved?.source, `${id} should come from the fixture`).toBe(
        "pack",
      );
      expect(resolved?.src).toContain("fixtures/");
    }

    expect(assets.image("bg.placeholder.sky").source).toBe("placeholder");
    expect(assets.image("bg.placeholder.far").source).toBe("placeholder");
    expect(assets.image("bg.placeholder.mid").source).toBe("placeholder");
    expect(assets.image("tileset.placeholder").source).toBe("placeholder");
    expect(assets.image("ui.icon.badge").source).toBe("placeholder");
    expect(assets.audio("audio.cue.jump").source).toBe("placeholder");
  });

  it("parses ?assets= modes and falls back safely", () => {
    expect(parseAssetMode("?assets=fixture")).toBe("fixture");
    expect(parseAssetMode("?assets=final")).toBe("final");
    expect(parseAssetMode("?assets=placeholder")).toBe("placeholder");
    expect(parseAssetMode("?assets=unknown")).toBe("placeholder");
    expect(parseAssetMode("")).toBe("placeholder");
  });
});

describe("room simulation", () => {
  it("spawns both players on the ground and moves them independently", () => {
    const simulation = createRoomSimulation(room, VIEWPORT);
    const idle = emptyIntents();

    for (let frame = 0; frame < 10; frame += 1) {
      stepRoomSimulation(simulation, idle, 1 / 60);
    }

    expect(simulation.players.p1.onGround).toBe(true);
    expect(simulation.players.p2.onGround).toBe(true);
    expect(simulation.players.p1.y).toBeCloseTo(
      room.spawns.player1.y * room.tileSize,
      0,
    );
    expect(simulation.players.p2.y).toBeCloseTo(
      room.spawns.player2.y * room.tileSize,
      0,
    );

    const p2X = simulation.players.p2.x;
    const moveRight = emptyIntents();
    moveRight.p1.moveX = 1;
    for (let frame = 0; frame < 90; frame += 1) {
      stepRoomSimulation(simulation, moveRight, 1 / 60);
    }

    expect(simulation.players.p1.x).toBeGreaterThan(room.spawns.player1.x * room.tileSize);
    expect(simulation.players.p1.facing).toBe(1);
    expect(simulation.players.p2.x).toBeCloseTo(p2X);

    const moveLeft = emptyIntents();
    moveLeft.p2.moveX = -1;
    for (let frame = 0; frame < 120; frame += 1) {
      stepRoomSimulation(simulation, moveLeft, 1 / 60);
    }

    expect(simulation.players.p2.x).toBeLessThan(p2X);
    expect(simulation.players.p2.facing).toBe(-1);
  });

  it("jumps, lands, and keeps the shared camera inside the room bounds", () => {
    const simulation = createRoomSimulation(room, VIEWPORT);
    const idle = emptyIntents();

    for (let frame = 0; frame < 10; frame += 1) {
      stepRoomSimulation(simulation, idle, 1 / 60);
    }

    const groundY = simulation.players.p1.y;
    const jump = emptyIntents();
    jump.p1.jump = true;
    stepRoomSimulation(simulation, jump, 1 / 60);

    expect(simulation.players.p1.y).toBeLessThan(groundY);
    expect(simulation.players.p1.onGround).toBe(false);

    for (let frame = 0; frame < 120; frame += 1) {
      stepRoomSimulation(simulation, idle, 1 / 60);
    }

    expect(simulation.players.p1.y).toBeCloseTo(groundY);
    expect(simulation.players.p1.onGround).toBe(true);

    const walkRight = emptyIntents();
    walkRight.p1.moveX = 1;
    for (let frame = 0; frame < 600; frame += 1) {
      stepRoomSimulation(simulation, walkRight, 1 / 60);
    }

    expect(roomPixelWidth(room)).toBe(room.width * room.tileSize);
    expect(roomPixelHeight(room)).toBe(room.height * room.tileSize);
    expect(simulation.camera.x).toBeGreaterThan(0);
    expect(simulation.camera.x).toBeLessThanOrEqual(
      roomPixelWidth(room) - VIEWPORT.width,
    );
    expect(simulation.camera.y).toBeGreaterThanOrEqual(0);
    expect(simulation.camera.y).toBeLessThanOrEqual(
      roomPixelHeight(room) - VIEWPORT.height,
    );
    expect(simulation.players.p1.x).toBeLessThanOrEqual(
      roomPixelWidth(room) - 14,
    );
  });
});

describe("anatomy level anchors", () => {
  const ANATOMY_DIR = new URL(
    "../public/packs/anatomy-reflex/levels/",
    import.meta.url,
  );

  function anatomyRoom(levelId: string) {
    const parsed = parseRoom(
      JSON.parse(
        readFileSync(new URL(`${levelId}/room.json`, ANATOMY_DIR), "utf8"),
      ),
    );
    if (!parsed.ok) throw new Error(parsed.error);
    return parsed.value;
  }

  it("parses the authored gate, terminal, and receptor sockets", () => {
    const nerve = anatomyRoom("03-nerve-forest");
    for (const gateId of ["gate-threshold", "gate-behind", "gate-exit"]) {
      const gate = nerve.entities?.find((entity) => entity.id === gateId);
      expect(gate?.components?.anchors?.center, gateId).toEqual({
        x: 18,
        y: 18,
      });
    }

    const muscle = anatomyRoom("04-muscle-effector");
    const terminal = muscle.entities?.find(
      (entity) => entity.id === "motor-terminal",
    );
    expect(terminal?.components?.anchors?.muzzle).toEqual({
      x: 32,
      y: 16,
      direction: 0,
    });
    for (const receptorId of ["nicotinic-receptor", "wrong-receptor"]) {
      const receptor = muscle.entities?.find(
        (entity) => entity.id === receptorId,
      );
      expect(receptor?.components?.anchors?.mouth, receptorId).toEqual({
        x: 4,
        y: 16,
        direction: 3.14159,
      });
    }
    for (const gateId of ["ca-gate", "muscle-gate"]) {
      const gate = muscle.entities?.find((entity) => entity.id === gateId);
      expect(gate?.components?.anchors?.center, gateId).toEqual({
        x: 18,
        y: 18,
      });
    }
  });

  it("resolves authored sockets and falls back to centre", () => {
    const muscle = anatomyRoom("04-muscle-effector");
    const terminal = muscle.entities?.find(
      (entity) => entity.id === "motor-terminal",
    );
    expect(
      entityAnchorPoint(
        36,
        36,
        terminal?.components?.anchors,
        "muzzle",
      ),
    ).toEqual({ x: 32, y: 16, direction: 0 });
    expect(
      entityAnchorPoint(36, 36, terminal?.components?.anchors, "missing"),
    ).toEqual({ x: 18, y: 18 });
  });
});
