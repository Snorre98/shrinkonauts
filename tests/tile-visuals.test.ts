import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { parseRoom } from "../src/pack";
import {
  simplifyForReducedMotion,
  type WorldEffectPlan,
} from "../src/world/effect-types";
import { createRoomSimulation } from "../src/world/simulation";
import { createTileVisualState, composeTileVisual } from "../src/world/tile-visuals";

const ROOM_URL = new URL("../public/content/dev/room.json", import.meta.url);

function devRoom() {
  const parsed = parseRoom(JSON.parse(readFileSync(ROOM_URL, "utf8")));
  if (!parsed.ok) throw new Error(parsed.error);
  return parsed.value;
}

describe("tile visual state", () => {
  it("composes material base frames with cosmetic overrides", () => {
    const base = {
      textureKey: "asset:tile.anatomy.atlas",
      frame: "mask-5",
      tint: 0xffffff,
      alpha: 1,
    };
    expect(composeTileVisual(base, undefined)).toEqual(base);
    expect(
      composeTileVisual(base, { kind: "tint", color: "#ffd166" }),
    ).toMatchObject({ frame: "mask-5", tintColor: "#ffd166" });
    expect(
      composeTileVisual(base, {
        kind: "swap",
        tile: "sprite.player.p1",
      }),
    ).toMatchObject({ frame: "mask-5", swapAssetId: "sprite.player.p1" });
    expect(
      composeTileVisual(base, { kind: "alpha", alpha: 0.4 }),
    ).toMatchObject({ frame: "mask-5", alpha: 0.4 });
    expect(
      composeTileVisual(base, {
        kind: "overlay",
        assetId: "ui.icon.badge",
      }),
    ).toMatchObject({ overlayAssetId: "ui.icon.badge" });
    expect(
      composeTileVisual(base, {
        kind: "sequence",
        frames: ["asset-a", "asset-b"],
      }),
    ).toMatchObject({ sequenceAssetId: "asset-a" });
  });

  it("applies and reverts a region tint", () => {
    const store = createTileVisualState();
    const opId = store.apply({
      target: {
        kind: "tileRegion",
        layer: "tiles",
        x1: 2,
        y1: 3,
        x2: 4,
        y2: 5,
      },
      op: "tint",
      value: "#ffd166",
      revert: true,
    });

    expect(store.size).toBe(1);
    expect(store.record(opId)?.tiles).toHaveLength(9);
    expect(store.valueAt("tiles", 2, 3)).toEqual({
      kind: "tint",
      color: "#ffd166",
    });
    expect(store.valueAt("tiles", 4, 5)).toEqual({
      kind: "tint",
      color: "#ffd166",
    });
    expect(store.valueAt("tiles", 6, 5)).toBeUndefined();

    store.revert(opId);
    expect(store.size).toBe(0);
    expect(store.valueAt("tiles", 2, 3)).toBeUndefined();
  });

  it("restores the previous override when a stacked op is reverted", () => {
    const store = createTileVisualState();
    const tint = store.apply({
      target: { kind: "tile", layer: "tiles", x: 1, y: 1 },
      op: "tint",
      value: "#ffd166",
      revert: true,
    });
    const alpha = store.apply({
      target: { kind: "tile", layer: "tiles", x: 1, y: 1 },
      op: "alpha",
      value: 0.4,
      revert: true,
    });

    expect(store.valueAt("tiles", 1, 1)).toEqual({
      kind: "alpha",
      alpha: 0.4,
    });

    store.revert(alpha);
    expect(store.valueAt("tiles", 1, 1)).toEqual({
      kind: "tint",
      color: "#ffd166",
    });

    store.revert(tint);
    expect(store.valueAt("tiles", 1, 1)).toBeUndefined();
  });

  it("supports swap, overlay, alpha, and sequence values", () => {
    const store = createTileVisualState();
    const cases = [
      { op: "swap" as const, value: "tileset.placeholder" },
      { op: "overlay" as const, value: "ui.icon.badge" },
      { op: "alpha" as const, value: 0.25 },
      { op: "sequence" as const, value: "frame-a|frame-b" },
    ];

    for (const [index, entry] of cases.entries()) {
      const opId = store.apply({
        target: { kind: "tile", layer: "tiles", x: index, y: 0 },
        op: entry.op,
        value: entry.value,
        revert: true,
      });
      expect(store.valueAt("tiles", index, 0), entry.op).toEqual(
        entry.op === "swap"
          ? { kind: "swap", tile: "tileset.placeholder" }
          : entry.op === "overlay"
            ? { kind: "overlay", assetId: "ui.icon.badge" }
            : entry.op === "alpha"
              ? { kind: "alpha", alpha: 0.25 }
              : { kind: "sequence", frames: ["frame-a", "frame-b"] },
      );
      store.revert(opId);
    }
  });

  it("does not change collision solids or bodies", () => {
    const room = devRoom();
    const simulation = createRoomSimulation(room);
    const solids = JSON.stringify(simulation.solids);
    const bodies = JSON.stringify(simulation.physics.bodySnapshots());

    const store = createTileVisualState();
    const opId = store.apply({
      target: {
        kind: "tileRegion",
        layer: "tiles",
        x1: 0,
        y1: 0,
        x2: room.width - 1,
        y2: room.height - 1,
      },
      op: "tint",
      value: "#ef476f",
      revert: true,
    });

    expect(JSON.stringify(simulation.solids)).toBe(solids);
    expect(JSON.stringify(simulation.physics.bodySnapshots())).toBe(bodies);

    store.revert(opId);
    expect(JSON.stringify(simulation.solids)).toBe(solids);
  });
});

describe("reduced motion effects", () => {
  it("turns travel and bursts into static markers", () => {
    const plan: WorldEffectPlan = {
      id: "fx:test",
      planId: "fx.test",
      actor: "p1",
      owner: "p1",
      accent: "p1",
      startedTick: 0,
      ageTicks: 2,
      stages: [
        {
          visual: { kind: "orb", trail: true },
          source: { anchor: { kind: "world", x: 10, y: 10 } },
          path: {
            kind: "segment",
            from: { kind: "world", x: 10, y: 10 },
            to: { kind: "world", x: 100, y: 10 },
          },
          timing: { durationTicks: 6 },
          lifetime: { kind: "oneShot" },
          binding: { follow: true },
          layer: "entities",
        },
        {
          visual: { kind: "beam", pulse: true },
          path: {
            kind: "segment",
            from: { kind: "world", x: 10, y: 10 },
            to: { kind: "world", x: 100, y: 10 },
          },
          timing: { durationTicks: 20 },
          lifetime: { kind: "persistent", until: "sourceInactive" },
          binding: { follow: true },
          layer: "entities",
        },
      ],
    };

    const reduced = simplifyForReducedMotion(plan);
    expect(reduced.stages.map((stage) => stage.visual.kind)).toEqual([
      "ring",
      "beam",
    ]);
    expect(reduced.stages[1]?.visual).toMatchObject({
      kind: "beam",
      pulse: false,
    });
  });
});
