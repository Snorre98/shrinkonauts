import type { PlayerId } from "./simulation";

export type EffectCancelPolicy =
  | "onSourceInactive"
  | "onTargetGone"
  | "manual";

export type WorldEffectLayer =
  | "background"
  | "tiles"
  | "entities"
  | "foreground"
  | "hud";

export type EffectEasing = "linear" | "easeIn" | "easeOut" | "easeInOut";

export interface WorldVec2 {
  x: number;
  y: number;
}

export type WorldAnchorRef =
  | { kind: "entity"; id: string; socket?: string }
  | { kind: "player"; id: PlayerId; socket?: string }
  | { kind: "tile"; layer: string; x: number; y: number }
  | {
      kind: "tileRegion";
      layer: string;
      x1: number;
      y1: number;
      x2: number;
      y2: number;
    }
  | { kind: "world"; x: number; y: number }
  | { kind: "hud"; slot?: "top" | "bottom" | "left" | "right" };

export type WorldTileTarget =
  | { kind: "tile"; layer: string; x: number; y: number }
  | {
      kind: "tileRegion";
      layer: string;
      x1: number;
      y1: number;
      x2: number;
      y2: number;
    };

export type WorldDirection =
  | { kind: "angle"; radians: number }
  | { kind: "vector"; x: number; y: number }
  | { kind: "toward"; target: WorldAnchorRef }
  | { kind: "facing"; entityId: string };

export interface WorldEffectSource {
  anchor: WorldAnchorRef;
  offset?: WorldVec2;
  direction?: WorldDirection;
  spreadRadians?: number;
  space?: "world" | "local";
  followFacing?: boolean;
}

export type WorldEffectPath =
  | { kind: "point" }
  | {
      kind: "segment";
      from: WorldAnchorRef;
      to: WorldAnchorRef;
      curve?: number;
    }
  | {
      kind: "polyline";
      points: WorldAnchorRef[];
      curve?: number;
    }
  | {
      kind: "arc";
      center: WorldAnchorRef;
      radius: number;
      startAngle: number;
      endAngle: number;
    }
  | {
      kind: "ray";
      from: WorldAnchorRef;
      direction: WorldDirection;
      length: number;
      spread?: number;
    }
  | {
      kind: "radial";
      from: WorldAnchorRef;
      radius: number;
      count?: number;
    };

export type WorldEffectVisual =
  | { kind: "orb"; assetId?: string; trail?: boolean; size?: number }
  | { kind: "beam"; assetId?: string; width?: number; pulse?: boolean }
  | { kind: "ring"; assetId?: string; radius?: number }
  | {
      kind: "particleBurst";
      assetId?: string;
      count?: number;
      speed?: number;
    }
  | {
      kind: "particleStream";
      assetId?: string;
      rate?: number;
      length?: number;
    }
  | { kind: "spriteSwap"; target: WorldAnchorRef; assetId: string }
  | {
      kind: "tint";
      target: WorldAnchorRef;
      color: string;
      fadeTicks?: number;
    }
  | { kind: "dissolve"; target: WorldAnchorRef; assetId?: string }
  | {
      kind: "tileSwap";
      target: WorldTileTarget;
      tile: string;
      revert?: boolean;
    }
  | {
      kind: "tileTint";
      target: WorldTileTarget;
      color: string;
      revert?: boolean;
    }
  | {
      kind: "tileOverlay";
      target: WorldTileTarget;
      assetId: string;
      revert?: boolean;
    }
  | {
      kind: "tileAlpha";
      target: WorldTileTarget;
      alpha: number;
      revert?: boolean;
    }
  | {
      kind: "tileSequence";
      target: WorldTileTarget;
      frames: string[];
      fps?: number;
      revert?: boolean;
    }
  | { kind: "decal"; target: WorldAnchorRef; assetId: string };

export type WorldEffectOperator = WorldEffectVisual["kind"];

export type WorldEffectPathKind = WorldEffectPath["kind"];

export interface WorldEffectTiming {
  delayTicks?: number;
  durationTicks?: number;
  repeat?: number;
  easing?: EffectEasing;
  stagger?: { kind: "none" | "fromSource" | "byIndex"; ticks: number };
}

export type WorldEffectLifetime =
  | { kind: "oneShot" }
  | {
      kind: "persistent";
      until: "sourceInactive" | "targetGone" | "manual";
    };

export interface WorldEffectBinding {
  follow?: boolean;
  attachTo?: WorldAnchorRef;
  space?: "world" | "local";
}

export interface WorldEffectStage {
  visual: WorldEffectVisual;
  source?: WorldEffectSource;
  path?: WorldEffectPath;
  targets?: readonly WorldAnchorRef[];
  timing: WorldEffectTiming;
  lifetime?: WorldEffectLifetime;
  binding: WorldEffectBinding;
  layer: WorldEffectLayer;
}

/** Resolved world-facing projection of a feedback `EffectInstance`. */
export interface WorldEffectPlan {
  id: string;
  planId: string;
  actor: PlayerId | null;
  owner: PlayerId | "shared";
  accent?: "p1" | "p2" | "neutral";
  startedTick: number;
  ageTicks: number;
  remainingTicks?: number;
  cancel?: EffectCancelPolicy;
  stages: readonly WorldEffectStage[];
}

/**
 * Tile appearance override. `RoomScene` applies these through the tile visual
 * store; the op carries no collision authority.
 */
export interface TileVisualOp {
  target: WorldTileTarget;
  op: "swap" | "tint" | "alpha" | "overlay" | "sequence";
  value: string | number;
  revert: boolean;
  ttlTicks?: number;
}

export type TileVisualValue =
  | { kind: "swap"; tile: string }
  | { kind: "tint"; color: string }
  | { kind: "alpha"; alpha: number }
  | { kind: "overlay"; assetId: string }
  | { kind: "sequence"; frames: readonly string[]; fps?: number };

export interface WorldEffectPort {
  spawn(plan: WorldEffectPlan): string;
  cancel(effectId: string): void;
}

export interface TileVisualPort {
  apply(op: TileVisualOp): string;
  revert(opId: string): void;
}

export function isMovementVisual(visual: WorldEffectVisual): boolean {
  switch (visual.kind) {
    case "orb":
    case "particleBurst":
    case "particleStream":
    case "dissolve":
      return true;
    default:
      return false;
  }
}

function pathEndAnchor(stage: WorldEffectStage): WorldAnchorRef | undefined {
  if (!stage.path) {
    return stage.targets?.[0] ?? stage.source?.anchor;
  }
  switch (stage.path.kind) {
    case "point":
      return stage.source?.anchor ?? stage.targets?.[0];
    case "segment":
      return stage.path.to;
    case "polyline":
      return (
        stage.path.points[stage.path.points.length - 1] ??
        stage.source?.anchor
      );
    case "arc":
      return stage.path.center;
    case "ray":
      return stage.path.from;
    case "radial":
      return stage.path.from;
  }
}

function staticStage(stage: WorldEffectStage): WorldEffectStage | null {
  if (!isMovementVisual(stage.visual)) {
    if (stage.visual.kind === "beam" && stage.visual.pulse) {
      return {
        ...stage,
        visual: { ...stage.visual, pulse: false },
      };
    }
    return stage;
  }

  if (stage.visual.kind === "dissolve") {
    return null;
  }

  const anchor = pathEndAnchor(stage) ?? stage.source?.anchor;
  if (!anchor) return null;
  const persistent = stage.lifetime?.kind === "persistent";
  return {
    visual: { kind: "ring", radius: 18 },
    targets: [anchor],
    timing: {
      ...(stage.timing.delayTicks !== undefined
        ? { delayTicks: stage.timing.delayTicks }
        : {}),
      durationTicks: persistent ? (stage.timing.durationTicks ?? 30) : 6,
    },
    lifetime: persistent
      ? { kind: "persistent", until: "sourceInactive" }
      : { kind: "oneShot" },
    binding: { follow: true },
    layer: stage.layer,
  };
}

/**
 * Reduced motion keeps state and text information while removing travel,
 * bursts, streams and dissolves. Ring/beam/tile visuals remain static.
 */
export function simplifyForReducedMotion(
  plan: WorldEffectPlan,
): WorldEffectPlan {
  const stages = plan.stages
    .map(staticStage)
    .filter((stage): stage is WorldEffectStage => stage !== null);
  return { ...plan, stages };
}

export function effectStageProgress(
  plan: WorldEffectPlan,
  stageIndex: number,
): { active: boolean; t: number; done: boolean } {
  const stage = plan.stages[stageIndex];
  if (!stage) return { active: false, t: 0, done: true };

  const delay = Math.max(0, stage.timing.delayTicks ?? 0);
  const duration = Math.max(1, stage.timing.durationTicks ?? 1);
  const repeat = Math.max(1, stage.timing.repeat ?? 1);
  const total = delay + duration * repeat;
  const persistent = stage.lifetime?.kind === "persistent";
  const age = plan.ageTicks;
  const local = age - delay;

  if (local < 0) {
    return { active: false, t: 0, done: false };
  }
  if (!persistent && age >= total) {
    return { active: false, t: 1, done: true };
  }

  const localCycle = persistent || repeat > 1 ? local % duration : local;
  return {
    active: true,
    t: Math.max(0, Math.min(1, localCycle / duration)),
    done: false,
  };
}
