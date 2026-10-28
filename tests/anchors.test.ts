import { describe, expect, it } from "vitest";
import type { FeedbackSurface } from "../src/feedback";
import { defaultAnchors, worldToScreen } from "../src/ui/anchors";
import { layoutSurfaces } from "../src/ui/layout";
import type { WorldView } from "../src/ui/model";

const world: WorldView = {
  camera: { x: 100, y: 50, width: 1280, height: 720 },
  viewport: { width: 1280, height: 720 },
  tileSize: 32,
  players: {
    p1: {
      id: "p1",
      x: 300,
      y: 500,
      width: 28,
      height: 44,
      facing: 1,
      active: true,
      dashing: false,
      dashReady: false,
      abilities: [],
      carrying: null,
    },
    p2: {
      id: "p2",
      x: 1500,
      y: 500,
      width: 28,
      height: 44,
      facing: -1,
      active: true,
      dashing: false,
      dashReady: false,
      abilities: [],
      carrying: null,
    },
  },
  entities: {
    "agent-neuron": {
      id: "agent-neuron",
      x: 320,
      y: 500,
      width: 36,
      height: 36,
      anchors: {
        ...defaultAnchors(36, 36),
        muzzle: { x: 30, y: 12, direction: 0 },
      },
    },
  },
  props: {},
};

const canvas = { x: 100, y: 200, width: 1000, height: 500 };

describe("anchors", () => {
  it("provides the default centre/top/bottom/left/right sockets", () => {
    expect(defaultAnchors(36, 36)).toEqual({
      center: { x: 18, y: 18 },
      top: { x: 18, y: 0 },
      bottom: { x: 18, y: 36 },
      left: { x: 0, y: 18 },
      right: { x: 36, y: 18 },
    });
  });

  it("projects a world point through camera, scale, and letterboxing", () => {
    const anchor = worldToScreen(
      { kind: "world", point: { x: 100, y: 50 } },
      world,
      canvas,
    );
    expect(anchor.layer).toBe("world");
    expect(anchor.x).toBeCloseTo(100 + (1000 - 1280 * (500 / 720)) / 2);
    expect(anchor.y).toBeCloseTo(200);
    expect(anchor.visible).toBe(true);
  });

  it("resolves an authored entity socket and honours offsets", () => {
    const center = worldToScreen(
      { kind: "entity", entityId: "agent-neuron", socket: "center" },
      world,
      canvas,
    );
    const muzzle = worldToScreen(
      { kind: "entity", entityId: "agent-neuron", socket: "muzzle" },
      world,
      canvas,
    );
    expect(muzzle.x - center.x).toBeCloseTo((30 - 18) * (500 / 720));
    expect(muzzle.y - center.y).toBeCloseTo((12 - 18) * (500 / 720));
  });

  it("projects two players independently and marks off-screen anchors", () => {
    const p1 = worldToScreen({ kind: "player", playerId: "p1" }, world, canvas);
    const p2 = worldToScreen({ kind: "player", playerId: "p2" }, world, canvas);
    expect(p1.x).toBeLessThan(p2.x);
    expect(p1.visible).toBe(true);
    expect(p2.visible).toBe(false);
    expect(p2.visible).toBe(false);
  });

  it("falls back to the HUD for missing entities and nodes without entities", () => {
    expect(
      worldToScreen({ kind: "entity", entityId: "missing" }, world, canvas),
    ).toMatchObject({ layer: "hud", fallback: true });
    expect(
      worldToScreen(
        { kind: "node", nodeId: "input-a", fallback: "hud" },
        world,
        canvas,
      ),
    ).toMatchObject({ layer: "hud", fallback: true });
  });

  it("rescales without changing world coordinates", () => {
    const small = worldToScreen(
      { kind: "entity", entityId: "agent-neuron" },
      world,
      canvas,
    );
    const large = worldToScreen(
      { kind: "entity", entityId: "agent-neuron" },
      world,
      { ...canvas, width: 2000, height: 1000 },
    );
    expect(large.x).toBeGreaterThan(small.x);
    expect(small.visible).toBe(true);
  });

  it("stacks bubbles on one anchor and gives overlapping captions lanes", () => {
    const surfaces: FeedbackSurface[] = [];
    const mk = (
      id: string,
      presentation: FeedbackSurface["presentation"],
      owner: FeedbackSurface["owner"],
      anchor: FeedbackSurface["anchor"],
    ): FeedbackSurface => ({
      id,
      source: { kind: "system", id },
      actor: owner === "shared" ? null : owner,
      owner,
      audience: "both",
      anchor,
      presentation,
      content: { text: id },
      state: "active",
      severity: "neutral",
      lifetime: { sticky: true },
      interaction: { mode: "none", focus: "soft", movement: "free" },
      priority: 10,
      a11y: { announce: false },
    });
    surfaces.push(
      mk("bubble-a", "speechBubble", "p1", {
        kind: "entity",
        entityId: "agent-neuron",
      }),
      mk("bubble-b", "speechBubble", "p2", {
        kind: "entity",
        entityId: "agent-neuron",
      }),
      mk("caption-a", "playerCaption", "p1", {
        kind: "player",
        playerId: "p1",
      }),
      mk("caption-b", "playerCaption", "p2", {
        kind: "player",
        playerId: "p2",
      }),
    );

    const items = surfaces.map((surface) => ({
      id: surface.id,
      presentation: surface.presentation,
      owner: surface.owner,
      priority: surface.priority,
      width: 160,
      height: 60,
      anchor: worldToScreen(surface.anchor, world, canvas),
    }));
    const boxes = layoutSurfaces(
      items,
      { canvasRect: canvas, width: 1280, height: 720 },
      { top: 96, right: 16, bottom: 84, left: 16 },
    );
    const byId = new Map(boxes.map((box) => [box.id, box]));
    expect(byId.get("bubble-a")?.y).not.toBe(byId.get("bubble-b")?.y);
    expect(byId.get("caption-a")?.x).not.toBe(byId.get("caption-b")?.x);
    expect(byId.get("caption-a")?.y).toBeGreaterThan(0);
  });

  it("docks off-screen surfaces inside the safe area", () => {
    const offscreen = worldToScreen(
      { kind: "world", point: { x: 5000, y: 5000 } },
      world,
      canvas,
    );
    const boxes = layoutSurfaces(
      [
        {
          id: "offscreen",
          presentation: "speechBubble",
          owner: "p1",
          priority: 10,
          width: 200,
          height: 80,
          anchor: offscreen,
        },
      ],
      { canvasRect: canvas, width: 1280, height: 720 },
      { top: 96, right: 16, bottom: 84, left: 16 },
    );
    expect(boxes[0]).toMatchObject({ docked: true });
    expect(boxes[0]?.x).toBeGreaterThanOrEqual(16);
    expect(boxes[0]?.y).toBeGreaterThanOrEqual(96);
  });
});
