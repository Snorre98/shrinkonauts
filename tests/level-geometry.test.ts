import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { parseRoom, type RoomDocument } from "../src/pack";
import type { PuzzleDocument, PuzzleNode } from "../src/puzzle";

interface LevelFixture {
  label: string;
  dir: URL;
  mainFloorRow: number;
}

const LEVELS: LevelFixture[] = [
  {
    label: "03-nerve-forest",
    dir: new URL(
      "../public/packs/anatomy-reflex/levels/03-nerve-forest/",
      import.meta.url,
    ),
    mainFloorRow: 20,
  },
  {
    label: "04-muscle-effector",
    dir: new URL(
      "../public/packs/anatomy-reflex/levels/04-muscle-effector/",
      import.meta.url,
    ),
    mainFloorRow: 20,
  },
  {
    label: "01-interrupt-loop",
    dir: new URL(
      "../public/packs/silicon-reflex/levels/01-interrupt-loop/",
      import.meta.url,
    ),
    mainFloorRow: 20,
  },
];

function readJson<T>(dir: URL, file: string): T {
  return JSON.parse(readFileSync(new URL(file, dir), "utf8")) as T;
}

function stationPoint(
  node: PuzzleNode,
  room: RoomDocument,
  entities: Map<string, { x: number; y: number }>,
): { x: number; feetY: number } | null {
  const tile = room.tileSize;

  switch (node.type) {
    case "plate":
    case "zone": {
      const centerX = node.rect.x + node.rect.width / 2;
      const pad = [...entities.entries()].find(([, entity]) => {
        const x = (entity.x + 0.5) * tile;
        const feetY = entity.y * tile;
        return (
          x >= node.rect.x &&
          x <= node.rect.x + node.rect.width &&
          feetY >= node.rect.y &&
          feetY <= node.rect.y + node.rect.height
        );
      });
      if (pad) return { x: centerX, feetY: pad[1].y * tile };
      return { x: centerX, feetY: node.rect.y + node.rect.height - 8 };
    }
    case "receptor": {
      const entity = node.entityId ? entities.get(node.entityId) : undefined;
      if (!entity) return null;
      return {
        x: (entity.x + 0.5) * tile,
        feetY: entity.y * tile,
      };
    }
    case "prop": {
      const entity = node.entityId ? entities.get(node.entityId) : undefined;
      if (!entity) return null;
      return {
        x: (entity.x + 0.5) * tile,
        feetY: entity.y * tile,
      };
    }
    case "pulseSource": {
      const entity = node.entityId ? entities.get(node.entityId) : undefined;
      if (!entity) return null;
      return {
        x: (entity.x + 0.5) * tile,
        feetY: entity.y * tile,
      };
    }
    default:
      return null;
  }
}

describe("level geometry audit", () => {
  it("04 keeps the ground corridor below the presynaptic tower walkable", () => {
    const fixture = LEVELS.find(
      (entry) => entry.label === "04-muscle-effector",
    );
    if (!fixture) throw new Error("04-muscle-effector fixture missing");
    const parsed = parseRoom(readJson(fixture.dir, "room.json"));
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;

    // The route from the spawn to the muscle-chamber doorway must clear the
    // 44 px player. A solid at row 18 leaves only a 32 px gap; row 17 or higher
    // leaves the required 64 px walk-under gap.
    for (let column = 3; column <= 29; column += 1) {
      let nearestAbove: number | null = null;
      for (let row = 19; row >= 0; row -= 1) {
        if (parsed.value.layers.tiles[row]?.[column] === "#") {
          nearestAbove = row;
          break;
        }
      }
      if (nearestAbove === null) continue;
      const clearance = (20 - nearestAbove - 1) * parsed.value.tileSize;
      expect(
        clearance,
        `column ${column} has only ${clearance}px below row ${nearestAbove}`,
      ).toBeGreaterThanOrEqual(64);
    }
  });

  for (const fixture of LEVELS) {
    it(`${fixture.label} keeps required stations off the main floor and on solid platforms`, () => {
      const parsed = parseRoom(readJson(fixture.dir, "room.json"));
      expect(parsed.ok).toBe(true);
      if (!parsed.ok) return;
      const room = parsed.value;
      const puzzle = readJson<PuzzleDocument>(fixture.dir, "puzzle.json");
      const entities = new Map(
        (room.entities ?? []).map((entity) => [
          entity.id,
          { x: entity.x, y: entity.y },
        ]),
      );
      const floorY = fixture.mainFloorRow * room.tileSize;

      const checked: string[] = [];
      for (const node of puzzle.nodes) {
        const point = stationPoint(node, room, entities);
        if (!point) continue;
        checked.push(node.id);

        expect(point.feetY, `${node.id} stands on the main floor`).toBeLessThan(
          floorY - room.tileSize,
        );

        const column = Math.floor(point.x / room.tileSize);
        const row = Math.floor(point.feetY / room.tileSize);
        expect(
          room.layers.tiles[row]?.[column],
          `${node.id} has no solid tile under its standing point`,
        ).toBe("#");
      }

      expect(checked.length, `${fixture.label} has no audited stations`).toBeGreaterThan(
        0,
      );

      for (const exit of room.exits ?? []) {
        expect(
          exit.y + 1,
          `exit ${exit.id} is not above the main floor`,
        ).toBeLessThan(fixture.mainFloorRow);
        expect(
          room.layers.tiles[exit.y + 1]?.[exit.x],
          `exit ${exit.id} has no platform under it`,
        ).toBe("#");
      }
    });
  }
});
