import type { FeedbackAnchor } from "../feedback";
import type { WorldAnchorPoint, WorldEntityView, WorldView } from "./model";

export interface CanvasRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export type HudSlot = "top" | "bottom" | "left" | "right";

export interface ScreenAnchor {
  key: string;
  layer: "world" | "hud";
  x: number;
  y: number;
  visible: boolean;
  fallback: boolean;
  slot?: HudSlot;
}

export function defaultAnchors(
  width: number,
  height: number,
): Record<string, WorldAnchorPoint> {
  return {
    center: { x: width / 2, y: height / 2 },
    top: { x: width / 2, y: 0 },
    bottom: { x: width / 2, y: height },
    left: { x: 0, y: height / 2 },
    right: { x: width, y: height / 2 },
  };
}

function hudAnchor(
  key: string,
  slot: HudSlot = "top",
  fallback = true,
): ScreenAnchor {
  return {
    key,
    layer: "hud",
    x: 0,
    y: 0,
    visible: true,
    fallback,
    slot,
  };
}

function entityAnchorPoint(
  entity: WorldEntityView,
  socket: string | undefined,
): WorldAnchorPoint {
  const name = socket ?? "top";
  return (
    entity.anchors[name] ??
    entity.anchors.center ??
    defaultAnchors(entity.width, entity.height).center ?? { x: 0, y: 0 }
  );
}

function projectPoint(
  worldX: number,
  worldY: number,
  world: WorldView,
  canvasRect: CanvasRect,
): { x: number; y: number; visible: boolean } {
  const gameWidth = Math.max(1, world.viewport.width);
  const gameHeight = Math.max(1, world.viewport.height);
  const scale = Math.min(
    canvasRect.width / gameWidth,
    canvasRect.height / gameHeight,
  );
  const offsetX = canvasRect.x + (canvasRect.width - gameWidth * scale) / 2;
  const offsetY = canvasRect.y + (canvasRect.height - gameHeight * scale) / 2;
  const x = offsetX + (worldX - world.camera.x) * scale;
  const y = offsetY + (worldY - world.camera.y) * scale;
  const visible =
    x >= offsetX &&
    x <= offsetX + gameWidth * scale &&
    y >= offsetY &&
    y <= offsetY + gameHeight * scale;
  return { x, y, visible };
}

function worldAnchor(
  key: string,
  worldX: number,
  worldY: number,
  world: WorldView,
  canvasRect: CanvasRect,
  fallback: boolean,
): ScreenAnchor {
  const point = projectPoint(worldX, worldY, world, canvasRect);
  return {
    key,
    layer: "world",
    x: point.x,
    y: point.y,
    visible: point.visible,
    fallback,
  };
}

/**
 * Pure world -> CSS projection. Entity/prop coordinates are centre-bottom;
 * anchor points are local top-left offsets, matching the room renderer.
 */
export function worldToScreen(
  anchor: FeedbackAnchor,
  world: WorldView,
  canvasRect: CanvasRect,
): ScreenAnchor {
  switch (anchor.kind) {
    case "entity": {
      const entity =
        world.entities[anchor.entityId] ?? world.props[anchor.entityId];
      if (!entity) {
        return hudAnchor(`missing:${anchor.entityId}`, "top", true);
      }
      const point = entityAnchorPoint(entity, anchor.socket);
      const x = entity.x - entity.width / 2 + point.x + (anchor.offset?.x ?? 0);
      const y = entity.y - entity.height + point.y + (anchor.offset?.y ?? 0);
      return worldAnchor(
        `entity:${anchor.entityId}:${anchor.socket ?? "top"}`,
        x,
        y,
        world,
        canvasRect,
        false,
      );
    }
    case "player": {
      const player = world.players[anchor.playerId];
      if (!player || !player.active) {
        return hudAnchor(`player:${anchor.playerId}`, "bottom", true);
      }
      const entity: WorldEntityView = {
        id: player.id,
        x: player.x,
        y: player.y,
        width: player.width,
        height: player.height,
        anchors: defaultAnchors(player.width, player.height),
      };
      const point = entityAnchorPoint(entity, anchor.socket ?? "bottom");
      const x = entity.x - entity.width / 2 + point.x + (anchor.offset?.x ?? 0);
      const y = entity.y - entity.height + point.y + (anchor.offset?.y ?? 0);
      return worldAnchor(
        `player:${anchor.playerId}:${anchor.socket ?? "bottom"}`,
        x,
        y,
        world,
        canvasRect,
        false,
      );
    }
    case "node": {
      if (anchor.entityId) {
        return worldToScreen(
          {
            kind: "entity",
            entityId: anchor.entityId,
            ...(anchor.socket ? { socket: anchor.socket } : {}),
            fallback: "hud",
          },
          world,
          canvasRect,
        );
      }
      return hudAnchor(`node:${anchor.nodeId}`, "top", true);
    }
    case "tile": {
      const x = (anchor.x + 0.5) * world.tileSize;
      const y = (anchor.y + 0.5) * world.tileSize;
      return worldAnchor(
        `tile:${anchor.layer}:${anchor.x}:${anchor.y}`,
        x,
        y,
        world,
        canvasRect,
        false,
      );
    }
    case "tileRegion": {
      const x = ((anchor.x1 + anchor.x2 + 1) / 2) * world.tileSize;
      const y = ((anchor.y1 + anchor.y2 + 1) / 2) * world.tileSize;
      return worldAnchor(
        `tileRegion:${anchor.layer}:${anchor.x1}:${anchor.y1}`,
        x,
        y,
        world,
        canvasRect,
        false,
      );
    }
    case "world": {
      return worldAnchor(
        `world:${anchor.point.x}:${anchor.point.y}`,
        anchor.point.x + (anchor.offset?.x ?? 0),
        anchor.point.y + (anchor.offset?.y ?? 0),
        world,
        canvasRect,
        false,
      );
    }
    case "hud":
      return hudAnchor(`hud:${anchor.slot ?? "top"}`, anchor.slot ?? "top", false);
    case "screen":
      return hudAnchor("screen", "top", false);
  }
}
