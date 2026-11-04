import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  PRESENTATION_CANVAS,
  TETHER_VIEW_MARGIN,
  autoZoomFor,
  derivePlayBand,
  parsePack,
  parseRoom,
} from "../src/pack";
import type {
  PackDocument,
  PresentationCameraConfig,
  PresentationRect,
  RoomDocument,
} from "../src/pack";
import { TETHER_LENGTHS } from "../src/world/physics";
import { cameraScrollForView, resolvePresentation } from "../src/world/presentation";
import {
  cameraTarget,
  createRoomSimulation,
  roomPixelHeight,
  roomPixelWidth,
} from "../src/world/simulation";

const VIEWPORT = { width: 1280, height: 720 };
const STAGE: PresentationRect = { x: 0, y: 96, width: 1280, height: 504 };
const PLAY_BAND: PresentationRect = { x: 0, y: 17, width: 40, height: 6 };

const FIXTURE_WIDTH = 40;
const FIXTURE_HEIGHT = 24;

function fixtureRoomJson(): Record<string, unknown> {
  const empty = ".".repeat(FIXTURE_WIDTH);
  const tiles = Array.from({ length: FIXTURE_HEIGHT }, () => empty);
  tiles[FIXTURE_HEIGHT - 1] = "#".repeat(FIXTURE_WIDTH);
  return {
    schemaVersion: "1.1",
    id: "room.presentation.fixture",
    title: "Presentation Fixture",
    width: FIXTURE_WIDTH,
    height: FIXTURE_HEIGHT,
    tileSize: 32,
    tileset: "tileset.anatomy",
    layers: { tiles },
    background: {
      id: "bg.presentation.fixture",
      layers: [
        {
          assetId: "bg.nerve_forest.sky",
          depth: 0,
          parallaxX: 0,
          parallaxY: 0,
          fit: "cover",
        },
      ],
    },
    spawns: {
      player1: { x: 3, y: 22 },
      player2: { x: 5, y: 22 },
    },
    presentation: {
      playBand: { ...PLAY_BAND },
      camera: {
        framing: "fit-play-band",
        zoom: "auto",
        maxZoom: 2,
        followX: "players",
        followY: "play-band",
        snap: true,
      },
    },
  };
}

function parseFixtureRoom(): RoomDocument {
  const parsed = parseRoom(fixtureRoomJson());
  if (!parsed.ok) throw new Error(parsed.error);
  return parsed.value;
}

function fixturePackJson(): Record<string, unknown> {
  return {
    schemaVersion: "1.1",
    id: "presentation-fixture",
    title: "Presentation Fixture",
    domain: "test",
    version: "0.1.0",
    syllabusId: "presentation",
    startLevelId: "01",
    endLevelId: "01",
    levels: ["01"],
    theme: "theme.json",
    mapping: "mapping.json",
    licenses: "licenses.json",
    assetManifests: {},
    presentation: {
      stage: { ...STAGE },
      camera: { maxZoom: 2, padding: 8 },
    },
  };
}

function parseFixturePack(): PackDocument {
  const parsed = parsePack(fixturePackJson());
  if (!parsed.ok) throw new Error(parsed.error);
  return parsed.value;
}

function fixtureSimulation(
  camera: PresentationCameraConfig,
  stage: PresentationRect = {
    x: 0,
    y: 0,
    width: 640,
    height: 360,
  },
) {
  const room = structuredClone(parseFixtureRoom());
  room.presentation = {
    ...room.presentation,
    camera: {
      ...room.presentation?.camera,
      ...camera,
    },
  };
  return createRoomSimulation(room, VIEWPORT, {
    pack: { stage },
    room: room.presentation,
    maxTetherLength: TETHER_LENGTHS.normal,
  });
}

describe("presentation parsing", () => {
  it("parses the pack stage and camera defaults", () => {
    const pack = parseFixturePack();
    expect(pack.presentation?.stage).toEqual(STAGE);
    expect(pack.presentation?.camera).toEqual({ maxZoom: 2, padding: 8 });
  });

  it("parses the room play band and camera override", () => {
    const room = parseFixtureRoom();
    expect(room.presentation?.playBand).toEqual(PLAY_BAND);
    expect(room.presentation?.camera?.framing).toBe("fit-play-band");
    expect(room.presentation?.camera?.zoom).toBe("auto");
    expect(room.presentation?.camera?.followY).toBe("play-band");
  });

  it("rejects a stage outside the logical canvas", () => {
    const raw = fixturePackJson();
    (raw.presentation as { stage: PresentationRect }).stage = {
      x: 0,
      y: 600,
      width: 1280,
      height: 200,
    };
    const parsed = parsePack(raw);
    expect(parsed.ok).toBe(false);
    if (!parsed.ok) {
      expect(parsed.error).toContain("presentation.stage");
      expect(PRESENTATION_CANVAS.height).toBe(720);
    }
  });

  it("rejects fractional, zero, and negative zoom values", () => {
    for (const zoom of [1.5, 0, -1]) {
      const raw = fixturePackJson();
      (raw.presentation as { camera: Record<string, unknown> }).camera = {
        zoom,
      };
      const parsed = parsePack(raw);
      expect(parsed.ok, `zoom ${zoom}`).toBe(false);
    }
  });

  it("rejects a play band outside the room", () => {
    for (const playBand of [
      { x: -1, y: 17, width: 40, height: 6 },
      { x: 0, y: 17, width: 0, height: 6 },
      { x: 39, y: 17, width: 2, height: 6 },
      { x: 0.5, y: 17, width: 40, height: 6 },
    ]) {
      const raw = fixtureRoomJson();
      (raw.presentation as { playBand: PresentationRect }).playBand = playBand;
      const parsed = parseRoom(raw);
      expect(parsed.ok, JSON.stringify(playBand)).toBe(false);
    }
  });
});

describe("auto zoom", () => {
  it("fits the six-tile play band at zoom 2", () => {
    const result = autoZoomFor({
      stage: STAGE,
      playBand: PLAY_BAND,
      tileSize: 32,
      padding: 8,
      maxZoom: 2,
      maxTetherLength: TETHER_LENGTHS.normal,
    });
    expect(result).toEqual({ ok: true, zoom: 2 });
  });

  it("caps normal tether at zoom 2 and stretch tether at zoom 1", () => {
    const normal = autoZoomFor({
      stage: STAGE,
      playBand: PLAY_BAND,
      tileSize: 32,
      padding: 8,
      maxZoom: 4,
      maxTetherLength: TETHER_LENGTHS.normal,
    });
    const stretch = autoZoomFor({
      stage: STAGE,
      playBand: PLAY_BAND,
      tileSize: 32,
      padding: 8,
      maxZoom: 4,
      maxTetherLength: TETHER_LENGTHS.stretch,
    });

    expect(normal).toEqual({ ok: true, zoom: 2 });
    expect(stretch).toEqual({ ok: true, zoom: 1 });
    expect(Math.floor(STAGE.width / (TETHER_LENGTHS.normal + TETHER_VIEW_MARGIN))).toBe(2);
    expect(Math.floor(STAGE.width / (TETHER_LENGTHS.stretch + TETHER_VIEW_MARGIN))).toBe(1);
  });

  it("reports a play band that cannot fit at zoom 1", () => {
    const result = autoZoomFor({
      stage: { x: 0, y: 0, width: 1280, height: 100 },
      playBand: PLAY_BAND,
      tileSize: 32,
      padding: 0,
      maxZoom: 2,
      maxTetherLength: 0,
    });
    expect(result).toEqual({ ok: false, error: "PLAY_BAND_TOO_TALL" });
  });

  it("derives the play band from solid tiles", () => {
    const room = parseFixtureRoom();
    expect(derivePlayBand(room)).toEqual({
      x: 0,
      y: FIXTURE_HEIGHT - 1,
      width: FIXTURE_WIDTH,
      height: 1,
    });
  });
});

describe("resolved presentation", () => {
  it("produces a 640x252 world view and centres the play band", () => {
    const room = parseFixtureRoom();
    const pack = parseFixturePack();
    const resolved = resolvePresentation({
      viewport: VIEWPORT,
      room,
      packPresentation: pack.presentation,
      roomPresentation: room.presentation,
      maxTetherLength: TETHER_LENGTHS.normal,
    });

    expect(resolved.stage).toEqual(STAGE);
    expect(resolved.playBand).toEqual(PLAY_BAND);
    expect(resolved.zoom).toBe(2);
    expect(resolved.stage.width / resolved.zoom).toBe(640);
    expect(resolved.stage.height / resolved.zoom).toBe(252);

    const simulation = createRoomSimulation(room, VIEWPORT, {
      pack: pack.presentation,
      room: room.presentation,
      maxTetherLength: TETHER_LENGTHS.normal,
    });
    expect(simulation.camera.width).toBe(640);
    expect(simulation.camera.height).toBe(252);
    const bandCenter =
      (PLAY_BAND.y + PLAY_BAND.height / 2) * room.tileSize;
    expect(simulation.camera.y + simulation.camera.height / 2).toBe(
      bandCenter,
    );
  });

  it("uses zoom 1 for stretch tether", () => {
    const room = parseFixtureRoom();
    const pack = parseFixturePack();
    const simulation = createRoomSimulation(room, VIEWPORT, {
      pack: pack.presentation,
      room: room.presentation,
      maxTetherLength: TETHER_LENGTHS.stretch,
    });
    expect(simulation.presentation.zoom).toBe(1);
    expect(simulation.camera.width).toBe(1280);
    expect(simulation.camera.height).toBe(504);
  });

  it("converts the world view into Phaser scroll at zoom 2", () => {
    const presentation = {
      stage: STAGE,
      zoom: 2,
    };
    const scroll = cameraScrollForView(presentation, { x: 0, y: 514 });
    expect(scroll).toEqual({ x: -320, y: 388 });
    const halfInset = (STAGE.width - STAGE.width / 2) / 2;
    expect(scroll.x + halfInset).toBe(0);
    expect(cameraScrollForView({ stage: STAGE, zoom: 1 }, { x: 0, y: 0 })).toEqual(
      { x: 0, y: 0 },
    );

    const right = cameraScrollForView(presentation, { x: 640, y: 514 });
    expect(right.x + halfInset + STAGE.width / 2).toBe(STAGE.width);
  });
});

describe("camera target", () => {
  it("follows the midpoint of active players and clamps to room bounds", () => {
    const simulation = fixtureSimulation({
      framing: undefined,
      zoom: 1,
      followX: "players",
      followY: "players",
      snap: false,
    });
    simulation.players.p1.x = 700;
    simulation.players.p2.x = 900;
    simulation.players.p1.y = 600;
    simulation.players.p2.y = 600;

    const target = cameraTarget(simulation);
    expect(target.x).toBe(480);
    expect(target.y).toBe(380);
  });

  it("follows p1 or p2 directly", () => {
    const p1 = fixtureSimulation({
      framing: undefined,
      zoom: 1,
      followX: "p1",
      followY: "players",
      snap: false,
    });
    p1.players.p1.x = 700;
    p1.players.p2.x = 900;
    expect(cameraTarget(p1).x).toBe(380);

    const p2 = fixtureSimulation({
      framing: undefined,
      zoom: 1,
      followX: "p2",
      followY: "players",
      snap: false,
    });
    p2.players.p1.x = 700;
    p2.players.p2.x = 900;
    expect(cameraTarget(p2).x).toBe(580);

    p2.players.p2.x = 2000;
    expect(cameraTarget(p2).x).toBe(640);
  });

  it("rounds the final scroll when snap is enabled", () => {
    const simulation = fixtureSimulation({
      framing: undefined,
      zoom: 1,
      followX: "p1",
      followY: "players",
      snap: true,
    });
    simulation.players.p1.x = 333.7;
    simulation.players.p2.x = 1000;

    const target = cameraTarget(simulation);
    expect(target.x).toBe(14);
    expect(Number.isInteger(target.x)).toBe(true);
    expect(Number.isInteger(target.y)).toBe(true);
  });
});

describe("default presentation", () => {
  it("keeps the old camera for a room with no presentation", () => {
    const CONTENT_DIR = new URL("../public/content/dev/", import.meta.url);
    const parsed = parseRoom(
      JSON.parse(readFileSync(new URL("room.json", CONTENT_DIR), "utf8")),
    );
    if (!parsed.ok) throw new Error(parsed.error);
    const room = structuredClone(parsed.value);

    const simulation = createRoomSimulation(room, VIEWPORT);
    expect(simulation.presentation.stage).toEqual({
      x: 0,
      y: 0,
      width: VIEWPORT.width,
      height: VIEWPORT.height,
    });
    expect(simulation.presentation.zoom).toBe(1);
    expect(simulation.presentation.followX).toBe("players");
    expect(simulation.presentation.followY).toBe("players");
    expect(simulation.presentation.snap).toBe(false);
    expect(simulation.camera.width).toBe(VIEWPORT.width);
    expect(simulation.camera.height).toBe(VIEWPORT.height);

    const players = [simulation.players.p1, simulation.players.p2].filter(
      (player) => player.active,
    );
    const averageX =
      players.reduce((total, player) => total + player.x, 0) / players.length;
    const averageY =
      players.reduce((total, player) => total + player.y, 0) / players.length -
      40;
    const maxX = Math.max(0, roomPixelWidth(room) - VIEWPORT.width);
    const maxY = Math.max(0, roomPixelHeight(room) - VIEWPORT.height);
    expect(simulation.camera.x).toBeCloseTo(
      Math.max(0, Math.min(maxX, averageX - VIEWPORT.width / 2)),
    );
    expect(simulation.camera.y).toBeCloseTo(
      Math.max(0, Math.min(maxY, averageY - VIEWPORT.height / 2)),
    );
  });
});
