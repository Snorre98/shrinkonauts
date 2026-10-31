import type { FeedbackOwner, FeedbackPresentation } from "../feedback";
import type { CanvasRect, ScreenAnchor } from "./anchors";

export interface LayoutItem {
  id: string;
  presentation: FeedbackPresentation;
  owner: FeedbackOwner;
  priority: number;
  width: number;
  height: number;
  anchor: ScreenAnchor;
}

export interface LayoutBox {
  id: string;
  layer: "world" | "hud";
  x: number;
  y: number;
  docked: boolean;
}

export interface SafeArea {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export const DEFAULT_SAFE_AREA: SafeArea = {
  top: 96,
  right: 16,
  bottom: 84,
  left: 16,
};

function clamp(value: number, minimum: number, maximum: number): number {
  if (maximum < minimum) return minimum;
  return Math.max(minimum, Math.min(maximum, value));
}

function worldPresentation(presentation: FeedbackPresentation): boolean {
  return (
    presentation === "speechBubble" ||
    presentation === "playerCaption" ||
    presentation === "stateSwap" ||
    presentation === "socketFill" ||
    presentation === "outline" ||
    presentation === "pathGlow" ||
    presentation === "prompt"
  );
}

function boxFor(
  item: LayoutItem,
  viewport: { canvasRect: CanvasRect; width: number; height: number },
  safeArea: SafeArea,
): LayoutBox {
  const canvas = viewport.canvasRect;
  const fallback = item.anchor.layer === "hud" || item.anchor.fallback;

  if (fallback) {
    const slot = item.anchor.slot ?? "top";
    if (slot === "bottom") {
      return {
        id: item.id,
        layer: "hud",
        x: viewport.width / 2 - item.width / 2,
        y: viewport.height - safeArea.bottom - item.height,
        docked: true,
      };
    }
    if (slot === "left" || slot === "right") {
      return {
        id: item.id,
        layer: "hud",
        x:
          slot === "left"
            ? safeArea.left
            : viewport.width - safeArea.right - item.width,
        y: safeArea.top,
        docked: true,
      };
    }
    return {
      id: item.id,
      layer: "hud",
      x: viewport.width / 2 - item.width / 2,
      y: safeArea.top,
      docked: true,
    };
  }

  const isCaption = item.presentation === "playerCaption";
  const isBubble = item.presentation === "speechBubble";
  const desiredX = item.anchor.x - item.width / 2;
  const desiredY = isBubble
    ? item.anchor.y - item.height - 10
    : isCaption
      ? item.anchor.y + 10
      : item.anchor.y - item.height / 2;

  const minimumX = Math.max(canvas.x + safeArea.left, safeArea.left);
  const maximumX = Math.min(
    canvas.x + canvas.width - safeArea.right - item.width,
    viewport.width - safeArea.right - item.width,
  );
  const minimumY = Math.max(canvas.y + safeArea.top, safeArea.top);
  const maximumY = Math.min(
    canvas.y + canvas.height - safeArea.bottom - item.height,
    viewport.height - safeArea.bottom - item.height,
  );

  return {
    id: item.id,
    layer: "world",
    x: clamp(desiredX, minimumX, maximumX),
    y: clamp(desiredY, minimumY, maximumY),
    docked: !item.anchor.visible,
  };
}

function overlaps(a: LayoutBox, aw: number, ah: number, b: LayoutBox, bw: number, bh: number): boolean {
  return (
    a.x < b.x + bw &&
    a.x + aw > b.x &&
    a.y < b.y + bh &&
    a.y + ah > b.y
  );
}

/**
 * Deterministic layout for a frame's surfaces/cues. Stacking is grouped by
 * presentation + anchor key; overlapping P1/P2 captions get separate lanes.
 */
export function layoutSurfaces(
  items: readonly LayoutItem[],
  viewport: { canvasRect: CanvasRect; width: number; height: number },
  safeArea: SafeArea = DEFAULT_SAFE_AREA,
): LayoutBox[] {
  const ordered = [...items].sort(
    (left, right) =>
      right.priority - left.priority || left.id.localeCompare(right.id),
  );
  const boxes = new Map<string, LayoutBox>();
  const groups = new Map<string, LayoutItem[]>();

  for (const item of ordered) {
    const world = worldPresentation(item.presentation);
    const key = world
      ? `world:${item.presentation}:${item.anchor.key}`
      : `hud:${item.anchor.slot ?? "top"}`;
    const group = groups.get(key);
    if (group) group.push(item);
    else groups.set(key, [item]);
  }

  for (const group of groups.values()) {
    const caption = group[0]?.presentation === "playerCaption";
    const bubble = group[0]?.presentation === "speechBubble";
    const hud = group[0] ? !worldPresentation(group[0].presentation) : false;
    const placed = group
      .map((item) => ({
        item,
        box: boxFor(item, viewport, safeArea),
      }))
      .sort(
        (left, right) =>
          left.box.y - right.box.y ||
          left.box.x - right.box.x ||
          left.item.id.localeCompare(right.item.id),
      );

    for (const [index, entry] of placed.entries()) {
      const offset = index * (entry.item.height + 8);
      const desiredY = bubble
        ? entry.box.y - offset
        : caption || hud
          ? entry.box.y + offset
          : entry.box.y;
      boxes.set(entry.item.id, {
        ...entry.box,
        y: clamp(
          desiredY,
          safeArea.top,
          viewport.height - safeArea.bottom - entry.item.height,
        ),
      });
    }
  }

  // P1/P2 captions that overlap get left/right lanes.
  const captions = ordered.filter(
    (item) => item.presentation === "playerCaption",
  );
  for (let leftIndex = 0; leftIndex < captions.length; leftIndex += 1) {
    for (let rightIndex = leftIndex + 1; rightIndex < captions.length; rightIndex += 1) {
      const leftItem = captions[leftIndex];
      const rightItem = captions[rightIndex];
      const leftBox = leftItem ? boxes.get(leftItem.id) : undefined;
      const rightBox = rightItem ? boxes.get(rightItem.id) : undefined;
      if (!leftItem || !rightItem || !leftBox || !rightBox) continue;
      if (leftItem.owner === rightItem.owner) continue;
      if (
        !overlaps(
          leftBox,
          leftItem.width,
          leftItem.height,
          rightBox,
          rightItem.width,
          rightItem.height,
        )
      ) {
        continue;
      }
      const p1 = leftItem.owner === "p1" ? leftItem : rightItem;
      const p2 = leftItem.owner === "p2" ? leftItem : rightItem;
      const p1Box = boxes.get(p1.id);
      const p2Box = boxes.get(p2.id);
      if (p1Box) p1Box.x = Math.max(safeArea.left, p1Box.x - 14);
      if (p2Box) {
        p2Box.x = Math.min(
          viewport.width - safeArea.right - p2.width,
          p2Box.x + 14,
        );
      }
    }
  }

  return [...boxes.values()];
}
