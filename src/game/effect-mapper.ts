import type {
  AnchorRef,
  Direction,
  EffectInstance,
  EffectPath,
  EffectStage,
  EffectTiming,
  EffectVisual,
  TileTarget,
} from "../feedback";
import type {
  WorldAnchorRef,
  WorldDirection,
  WorldEffectBinding,
  WorldEffectLifetime,
  WorldEffectPath,
  WorldEffectPlan,
  WorldEffectStage,
  WorldEffectTiming,
  WorldEffectVisual,
  WorldTileTarget,
} from "../world/runtime-port";

function assertNever(value: never): never {
  throw new Error(`EFFECT_MAPPER_UNHANDLED: ${String(value)}`);
}

export function toWorldAnchor(anchor: AnchorRef): WorldAnchorRef {
  switch (anchor.kind) {
    case "entity":
      return {
        kind: "entity",
        id: anchor.id,
        ...(anchor.socket ? { socket: anchor.socket } : {}),
      };
    case "player":
      return {
        kind: "player",
        id: anchor.id,
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
      return { kind: "world", x: anchor.x, y: anchor.y };
    case "hud":
      return { kind: "hud", ...(anchor.slot ? { slot: anchor.slot } : {}) };
  }
}

export function toWorldDirection(direction: Direction): WorldDirection {
  switch (direction.kind) {
    case "angle":
      return { kind: "angle", radians: direction.radians };
    case "vector":
      return { kind: "vector", x: direction.x, y: direction.y };
    case "toward":
      return { kind: "toward", target: toWorldAnchor(direction.target) };
    case "facing":
      return { kind: "facing", entityId: direction.entityId };
  }
}

export function toWorldTileTarget(target: TileTarget): WorldTileTarget {
  return target.kind === "tile"
    ? { kind: "tile", layer: target.layer, x: target.x, y: target.y }
    : {
        kind: "tileRegion",
        layer: target.layer,
        x1: target.x1,
        y1: target.y1,
        x2: target.x2,
        y2: target.y2,
      };
}

function toWorldPath(path: EffectPath): WorldEffectPath {
  switch (path.kind) {
    case "point":
      return { kind: "point" };
    case "segment":
      return {
        kind: "segment",
        from: toWorldAnchor(path.from),
        to: toWorldAnchor(path.to),
        ...(path.curve !== undefined ? { curve: path.curve } : {}),
      };
    case "polyline":
      return {
        kind: "polyline",
        points: path.points.map(toWorldAnchor),
        ...(path.curve !== undefined ? { curve: path.curve } : {}),
      };
    case "arc":
      return {
        kind: "arc",
        center: toWorldAnchor(path.center),
        radius: path.radius,
        startAngle: path.startAngle,
        endAngle: path.endAngle,
      };
    case "ray":
      return {
        kind: "ray",
        from: toWorldAnchor(path.from),
        direction: toWorldDirection(path.direction),
        length: path.length,
        ...(path.spread !== undefined ? { spread: path.spread } : {}),
      };
    case "radial":
      return {
        kind: "radial",
        from: toWorldAnchor(path.from),
        radius: path.radius,
        ...(path.count !== undefined ? { count: path.count } : {}),
      };
  }
}

function toWorldVisual(visual: EffectVisual): WorldEffectVisual {
  switch (visual.kind) {
    case "orb":
      return {
        kind: "orb",
        ...(visual.assetId ? { assetId: visual.assetId } : {}),
        ...(visual.trail !== undefined ? { trail: visual.trail } : {}),
        ...(visual.size !== undefined ? { size: visual.size } : {}),
      };
    case "beam":
      return {
        kind: "beam",
        ...(visual.assetId ? { assetId: visual.assetId } : {}),
        ...(visual.width !== undefined ? { width: visual.width } : {}),
        ...(visual.pulse !== undefined ? { pulse: visual.pulse } : {}),
      };
    case "ring":
      return {
        kind: "ring",
        ...(visual.assetId ? { assetId: visual.assetId } : {}),
        ...(visual.radius !== undefined ? { radius: visual.radius } : {}),
      };
    case "particleBurst":
      return {
        kind: "particleBurst",
        ...(visual.assetId ? { assetId: visual.assetId } : {}),
        ...(visual.count !== undefined ? { count: visual.count } : {}),
        ...(visual.speed !== undefined ? { speed: visual.speed } : {}),
      };
    case "particleStream":
      return {
        kind: "particleStream",
        ...(visual.assetId ? { assetId: visual.assetId } : {}),
        ...(visual.rate !== undefined ? { rate: visual.rate } : {}),
        ...(visual.length !== undefined ? { length: visual.length } : {}),
      };
    case "spriteSwap":
      return {
        kind: "spriteSwap",
        target: toWorldAnchor(visual.target),
        assetId: visual.assetId,
      };
    case "tint":
      return {
        kind: "tint",
        target: toWorldAnchor(visual.target),
        color: visual.color,
        ...(visual.fadeTicks !== undefined
          ? { fadeTicks: visual.fadeTicks }
          : {}),
      };
    case "dissolve":
      return {
        kind: "dissolve",
        target: toWorldAnchor(visual.target),
        ...(visual.assetId ? { assetId: visual.assetId } : {}),
      };
    case "tileSwap":
      return {
        kind: "tileSwap",
        target: toWorldTileTarget(visual.target),
        tile: visual.tile,
        ...(visual.revert !== undefined ? { revert: visual.revert } : {}),
      };
    case "tileTint":
      return {
        kind: "tileTint",
        target: toWorldTileTarget(visual.target),
        color: visual.color,
        ...(visual.revert !== undefined ? { revert: visual.revert } : {}),
      };
    case "tileOverlay":
      return {
        kind: "tileOverlay",
        target: toWorldTileTarget(visual.target),
        assetId: visual.assetId,
        ...(visual.revert !== undefined ? { revert: visual.revert } : {}),
      };
    case "tileAlpha":
      return {
        kind: "tileAlpha",
        target: toWorldTileTarget(visual.target),
        alpha: visual.alpha,
        ...(visual.revert !== undefined ? { revert: visual.revert } : {}),
      };
    case "tileSequence":
      return {
        kind: "tileSequence",
        target: toWorldTileTarget(visual.target),
        frames: [...visual.frames],
        ...(visual.fps !== undefined ? { fps: visual.fps } : {}),
        ...(visual.revert !== undefined ? { revert: visual.revert } : {}),
      };
    case "decal":
      return {
        kind: "decal",
        target: toWorldAnchor(visual.target),
        assetId: visual.assetId,
      };
    default:
      return assertNever(visual);
  }
}

function toWorldTiming(timing: EffectTiming): WorldEffectTiming {
  return {
    ...(timing.delayTicks !== undefined
      ? { delayTicks: timing.delayTicks }
      : {}),
    ...(timing.durationTicks !== undefined
      ? { durationTicks: timing.durationTicks }
      : {}),
    ...(timing.repeat !== undefined ? { repeat: timing.repeat } : {}),
    ...(timing.easing ? { easing: timing.easing } : {}),
    ...(timing.stagger
      ? {
          stagger: {
            kind: timing.stagger.kind,
            ticks: timing.stagger.ticks,
          },
        }
      : {}),
  };
}

function toWorldLifetime(
  lifetime: EffectStage["lifetime"],
): WorldEffectLifetime | undefined {
  if (!lifetime) return undefined;
  return lifetime.kind === "oneShot"
    ? { kind: "oneShot" }
    : { kind: "persistent", until: lifetime.until };
}

function toWorldBinding(
  binding: EffectStage["binding"],
): WorldEffectBinding {
  return {
    ...(binding.follow !== undefined ? { follow: binding.follow } : {}),
    ...(binding.attachTo
      ? { attachTo: toWorldAnchor(binding.attachTo) }
      : {}),
    ...(binding.space ? { space: binding.space } : {}),
  };
}

export function toWorldStage(stage: EffectStage): WorldEffectStage {
  return {
    visual: toWorldVisual(stage.visual),
    ...(stage.source
      ? {
          source: {
            anchor: toWorldAnchor(stage.source.anchor),
            ...(stage.source.offset
              ? { offset: { ...stage.source.offset } }
              : {}),
            ...(stage.source.direction
              ? { direction: toWorldDirection(stage.source.direction) }
              : {}),
            ...(stage.source.spreadRadians !== undefined
              ? { spreadRadians: stage.source.spreadRadians }
              : {}),
            ...(stage.source.space ? { space: stage.source.space } : {}),
            ...(stage.source.followFacing !== undefined
              ? { followFacing: stage.source.followFacing }
              : {}),
          },
        }
      : {}),
    ...(stage.path ? { path: toWorldPath(stage.path) } : {}),
    ...(stage.targets
      ? { targets: stage.targets.map(toWorldAnchor) }
      : {}),
    timing: toWorldTiming(stage.timing),
    ...(stage.lifetime
      ? { lifetime: toWorldLifetime(stage.lifetime) }
      : {}),
    binding: toWorldBinding(stage.binding),
    layer: stage.layer,
  };
}

export function toWorldEffectPlan(instance: EffectInstance): WorldEffectPlan {
  return {
    id: instance.id,
    planId: instance.planId,
    actor: instance.actor,
    owner: instance.owner,
    ...(instance.accent ? { accent: instance.accent } : {}),
    startedTick: instance.startedTick,
    ageTicks: instance.ageTicks,
    ...(instance.remainingTicks !== undefined
      ? { remainingTicks: instance.remainingTicks }
      : {}),
    ...(instance.cancel ? { cancel: instance.cancel } : {}),
    stages: instance.stages.map(toWorldStage),
  };
}
