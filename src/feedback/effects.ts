import type { PuzzleNode } from "../puzzle";
import type {
  AnchorRef,
  Direction,
  EffectCancelPolicy,
  EffectLayer,
  EffectPathKind,
  EffectPlan,
  EffectStage,
  EffectTiming,
  EffectVisual,
  FeedbackAnchor,
  FeedbackOwner,
  FeedbackState,
  PlayerId,
} from "./types";

/** Closed operator vocabulary from ADR-0013. */
export const EFFECT_OPERATORS = [
  "orb",
  "beam",
  "ring",
  "particleBurst",
  "particleStream",
  "spriteSwap",
  "tint",
  "dissolve",
  "tileSwap",
  "tileTint",
  "tileOverlay",
  "tileAlpha",
  "tileSequence",
  "decal",
] as const satisfies readonly EffectVisual["kind"][];

/** Closed path vocabulary from ADR-0013. */
export const EFFECT_PATH_KINDS = [
  "point",
  "segment",
  "polyline",
  "arc",
  "ray",
  "radial",
] as const satisfies readonly EffectPathKind[];

export const DIRECTION_KINDS = [
  "angle",
  "vector",
  "toward",
  "facing",
] as const satisfies readonly Direction["kind"][];

export const EFFECT_LAYERS = [
  "background",
  "tiles",
  "entities",
  "foreground",
  "hud",
] as const satisfies readonly EffectLayer[];

export function accentFor(
  actor: PlayerId | null,
  owner: FeedbackOwner,
): "p1" | "p2" | "neutral" {
  if (owner === "shared") return "neutral";
  if (owner === "p1" || owner === "p2") return owner;
  return actor === "p1" || actor === "p2" ? actor : "neutral";
}

export function anchorKey(anchor: AnchorRef): string {
  switch (anchor.kind) {
    case "entity":
      return `entity:${anchor.id}:${anchor.socket ?? ""}`;
    case "player":
      return `player:${anchor.id}:${anchor.socket ?? ""}`;
    case "tile":
      return `tile:${anchor.layer}:${anchor.x}:${anchor.y}`;
    case "tileRegion":
      return `tileRegion:${anchor.layer}:${anchor.x1}:${anchor.y1}:${anchor.x2}:${anchor.y2}`;
    case "world":
      return `world:${anchor.x}:${anchor.y}`;
    case "hud":
      return `hud:${anchor.slot ?? "top"}`;
  }
}

/**
 * Converts the surface-side anchor into the effect-side anchor. Puzzle node
 * anchors resolve to an entity when possible, then to the node rect centre, and
 * finally to the HUD. This keeps effects usable before content authors sockets.
 */
export function anchorRefFromFeedbackAnchor(
  anchor: FeedbackAnchor,
  node?: PuzzleNode,
): AnchorRef {
  switch (anchor.kind) {
    case "entity":
      return {
        kind: "entity",
        id: anchor.entityId,
        ...(anchor.socket ? { socket: anchor.socket } : {}),
      };
    case "player":
      return {
        kind: "player",
        id: anchor.playerId,
        ...(anchor.socket ? { socket: anchor.socket } : {}),
      };
    case "tile":
      return {
        kind: "tile",
        layer: anchor.layer,
        x: anchor.x,
        y: anchor.y,
      };
    case "tileRegion":
      return {
        kind: "tileRegion",
        layer: anchor.layer,
        x1: anchor.x1,
        y1: anchor.y1,
        x2: anchor.x2,
        y2: anchor.y2,
      };
    case "world":
      return { kind: "world", x: anchor.point.x, y: anchor.point.y };
    case "hud":
      return { kind: "hud", ...(anchor.slot ? { slot: anchor.slot } : {}) };
    case "screen":
      return { kind: "hud", slot: "top" };
    case "node": {
      if (anchor.entityId) {
        return {
          kind: "entity",
          id: anchor.entityId,
          ...(anchor.socket ? { socket: anchor.socket } : {}),
        };
      }
      if (node && "rect" in node) {
        return {
          kind: "world",
          x: node.rect.x + node.rect.width / 2,
          y: node.rect.y + node.rect.height / 2,
        };
      }
      return { kind: "hud", slot: "top" };
    }
  }
}

/** Effect anchor for a puzzle node, without a surface anchor. */
export function nodeEffectAnchor(node: PuzzleNode): AnchorRef {
  if (node.entityId) {
    return { kind: "entity", id: node.entityId };
  }
  if ("rect" in node) {
    return {
      kind: "world",
      x: node.rect.x + node.rect.width / 2,
      y: node.rect.y + node.rect.height / 2,
    };
  }
  return { kind: "hud", slot: "top" };
}

export function isSourceActive(state: FeedbackState): boolean {
  return state === "active" || state === "progress" || state === "complete";
}

export function isPersistentStage(stage: EffectStage): boolean {
  return stage.lifetime?.kind === "persistent";
}

export function stageEndTicks(stage: EffectStage): number {
  const delay = Math.max(0, stage.timing.delayTicks ?? 0);
  const duration = Math.max(1, stage.timing.durationTicks ?? 1);
  const repeat = Math.max(1, stage.timing.repeat ?? 1);
  return delay + duration * repeat;
}

/** End tick for a set of stages; Infinity when any stage is persistent. */
export function effectEndTicks(stages: readonly EffectStage[]): number {
  let end = 0;
  for (const stage of stages) {
    if (isPersistentStage(stage)) return Number.POSITIVE_INFINITY;
    end = Math.max(end, stageEndTicks(stage));
  }
  return end;
}

export function persistentCancel(
  stages: readonly EffectStage[],
): EffectCancelPolicy | undefined {
  for (const stage of stages) {
    if (stage.lifetime?.kind === "persistent") {
      switch (stage.lifetime.until) {
        case "sourceInactive":
          return "onSourceInactive";
        case "targetGone":
          return "onTargetGone";
        case "manual":
          return "manual";
      }
    }
  }
  return undefined;
}

export function remainingTicksFor(
  stages: readonly EffectStage[],
  ageTicks: number,
): number | undefined {
  const end = effectEndTicks(stages);
  if (!Number.isFinite(end)) return undefined;
  return Math.max(0, end - ageTicks);
}

/** Position of an effect stage's path endpoint, when it has one. */
export function pathEndAnchor(stage: EffectStage): AnchorRef | undefined {
  if (!stage.path) {
    return stage.targets?.[0] ?? stage.source?.anchor;
  }
  switch (stage.path.kind) {
    case "point":
      return stage.source?.anchor ?? stage.targets?.[0];
    case "segment":
      return stage.path.to;
    case "polyline":
      return stage.path.points[stage.path.points.length - 1] ??
        stage.source?.anchor;
    case "arc": {
      const point = {
        x: Math.cos(stage.path.endAngle) * stage.path.radius,
        y: Math.sin(stage.path.endAngle) * stage.path.radius,
      };
      return { kind: "world", x: point.x, y: point.y };
    }
    case "ray":
      return stage.path.from;
    case "radial":
      return stage.path.from;
  }
}

/** Deterministic plan helper shared by presets and tests. */
export function createEffectPlan(input: {
  id: string;
  actor: PlayerId | null;
  owner: FeedbackOwner;
  stages: readonly EffectStage[];
  cancel?: EffectCancelPolicy;
}): EffectPlan {
  return {
    id: input.id,
    actor: input.actor,
    owner: input.owner,
    accent: accentFor(input.actor, input.owner),
    stages: input.stages,
    ...(input.cancel ? { cancel: input.cancel } : {}),
  };
}

export function timingWithDefaults(timing: EffectTiming): EffectTiming {
  return {
    delayTicks: Math.max(0, timing.delayTicks ?? 0),
    durationTicks: Math.max(1, timing.durationTicks ?? 1),
    repeat: Math.max(1, timing.repeat ?? 1),
    ...(timing.easing ? { easing: timing.easing } : {}),
    ...(timing.stagger ? { stagger: timing.stagger } : {}),
  };
}
