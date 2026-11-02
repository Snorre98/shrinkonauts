import { describe, expect, it } from "vitest";
import {
  parsePlayerClips,
  REQUIRED_PLAYER_CLIPS,
} from "../scripts/art/player-clips";

function value(): Record<string, unknown> {
  return {
    schemaVersion: 2,
    character: "player-p1",
    cell: { width: 14, height: 22 },
    origin: [0.5, 1],
    sources: {
      walk: {
        sheet: "walk/sheet.png",
        atlas: "walk/sheet.json",
        sourceFps: 23.26,
      },
    },
    animations: {
      idle: { source: "walk", frames: [0, 0], fps: 1, loop: false, output: "player-p1", static: true },
      walk: { source: "walk", frames: [0, 48], fps: 38, loop: true, output: "player-p1-walk" },
      jump: { source: "walk", frames: [6, 17], fps: 30, loop: false, output: "player-p1-jump" },
      fall: { source: "walk", frames: [18, 27], fps: 15, loop: true, output: "player-p1-fall" },
      land: { source: "walk", frames: [28, 35], fps: 30, loop: false, output: "player-p1-land" },
    },
  };
}

describe("parsePlayerClips", () => {
  it("parses the required clip set", () => {
    const document = parsePlayerClips(value());
    expect(document.character).toBe("player-p1");
    expect(document.cell).toEqual({ width: 14, height: 22 });
    expect(Object.keys(document.animations).sort()).toEqual(
      [...REQUIRED_PLAYER_CLIPS].sort(),
    );
    expect(document.animations.walk?.frames).toEqual([0, 48]);
    expect(document.sources.walk?.sourceFps).toBe(23.26);
    expect(document.requiredClips).toEqual([...REQUIRED_PLAYER_CLIPS]);
    expect(document.margin).toBe(0);
    expect(document.alphaThreshold).toBe(128);
    expect(document.previewScale).toBe(8);
    expect(document.ramps).toBeUndefined();
  });

  it("parses an entity clip set with explicit fit settings", () => {
    const raw = value();
    raw.requiredClips = ["idle", "walk"];
    raw.margin = 1;
    raw.alphaThreshold = 100;
    raw.ramps = ["bone", "ink"];
    raw.previewScale = 4;

    const document = parsePlayerClips(raw);
    expect(document.requiredClips).toEqual(["idle", "walk"]);
    expect(document.margin).toBe(1);
    expect(document.alphaThreshold).toBe(100);
    expect(document.ramps).toEqual(["bone", "ink"]);
    expect(document.previewScale).toBe(4);
  });

  it("rejects an invalid margin, alpha threshold, or ramp list", () => {
    const margin = value();
    margin.margin = 8;
    expect(() => parsePlayerClips(margin)).toThrow(/no room/);

    const threshold = value();
    threshold.alphaThreshold = 256;
    expect(() => parsePlayerClips(threshold)).toThrow(/0\.\.255/);

    const ramps = value();
    ramps.ramps = ["bone", "bone"];
    expect(() => parsePlayerClips(ramps)).toThrow(/duplicates/);
  });

  it("rejects a missing required clip", () => {
    const raw = value();
    delete (raw.animations as Record<string, unknown>).land;
    expect(() => parsePlayerClips(raw)).toThrow(/land is required/);
  });

  it("rejects an unknown source and an inverted range", () => {
    const unknown = value();
    (unknown.animations as Record<string, unknown>).walk = {
      source: "missing",
      frames: [0, 1],
      fps: 1,
      loop: true,
      output: "walk",
    };
    expect(() => parsePlayerClips(unknown)).toThrow(/unknown source/);

    const inverted = value();
    (inverted.animations as Record<string, unknown>).walk = {
      source: "walk",
      frames: [4, 2],
      fps: 1,
      loop: true,
      output: "walk",
    };
    expect(() => parsePlayerClips(inverted)).toThrow(/start <= end/);
  });

  it("rejects duplicate outputs", () => {
    const raw = value();
    (raw.animations as Record<string, unknown>).land = {
      source: "walk",
      frames: [28, 35],
      fps: 30,
      loop: false,
      output: "player-p1-walk",
    };
    expect(() => parsePlayerClips(raw)).toThrow(/not unique/);
  });
});
