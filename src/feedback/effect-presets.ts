import {
  anchorKey,
  createEffectPlan,
  timingWithDefaults,
} from "./effects";
import type {
  AnchorRef,
  Direction,
  EffectCancelPolicy,
  EffectLayer,
  EffectLifetime,
  EffectPath,
  EffectPlan,
  EffectSource,
  EffectStage,
  EffectTiming,
  EffectVisual,
  FeedbackOwner,
  PlayerId,
  TileTarget,
} from "./types";

export interface EffectPresetContext {
  actor: PlayerId | null;
  owner: FeedbackOwner;
  source?: AnchorRef;
  target?: AnchorRef;
  targets?: readonly AnchorRef[];
  direction?: Direction;
  tileTarget?: TileTarget;
  color?: string;
  planId?: string;
  durationTicks?: number;
}

export type EffectPreset = (
  context: EffectPresetContext,
) => EffectPlan | null;

interface StageInput {
  visual: EffectVisual;
  source?: EffectSource;
  path?: EffectPath;
  targets?: readonly AnchorRef[];
  timing?: EffectTiming;
  lifetime?: EffectLifetime;
  binding?: EffectStage["binding"];
  layer?: EffectLayer;
}

function stage(input: StageInput): EffectStage {
  return {
    visual: input.visual,
    ...(input.source ? { source: input.source } : {}),
    ...(input.path ? { path: input.path } : {}),
    ...(input.targets ? { targets: input.targets } : {}),
    timing: timingWithDefaults(input.timing ?? {}),
    lifetime: input.lifetime ?? { kind: "oneShot" },
    binding: input.binding ?? { follow: true },
    layer: input.layer ?? "entities",
  };
}

function plan(
  context: EffectPresetContext,
  presetId: string,
  stages: readonly EffectStage[],
  cancel?: EffectCancelPolicy,
): EffectPlan {
  if (stages.length === 0) {
    throw new Error(`EFFECT_PRESET_NO_STAGES: ${presetId}`);
  }
  const id =
    context.planId ??
    `${presetId}:${context.source ? anchorKey(context.source) : "unbound"}`;
  return createEffectPlan({
    id,
    actor: context.actor,
    owner: context.owner,
    stages,
    ...(cancel ? { cancel } : {}),
  });
}

function sourceAnchor(context: EffectPresetContext): AnchorRef | null {
  return context.source ?? context.target ?? context.targets?.[0] ?? null;
}

function ringStage(
  anchor: AnchorRef,
  options: {
    radius?: number;
    durationTicks?: number;
    delayTicks?: number;
    lifetime?: EffectLifetime;
    layer?: EffectLayer;
  } = {},
): EffectStage {
  return stage({
    visual: { kind: "ring", radius: options.radius ?? 20 },
    targets: [anchor],
    timing: {
      ...(options.delayTicks !== undefined
        ? { delayTicks: options.delayTicks }
        : {}),
      durationTicks: options.durationTicks ?? 10,
    },
    lifetime: options.lifetime ?? { kind: "oneShot" },
    binding: { follow: true },
    layer: options.layer ?? "entities",
  });
}

function persistentRing(
  anchor: AnchorRef,
  options: { radius?: number; durationTicks?: number } = {},
): EffectStage {
  return ringStage(anchor, {
    radius: options.radius ?? 18,
    durationTicks: options.durationTicks ?? 30,
    lifetime: { kind: "persistent", until: "sourceInactive" },
  });
}

function burstStage(
  anchor: AnchorRef,
  options: {
    direction?: Direction;
    count?: number;
    speed?: number;
    length?: number;
    spread?: number;
    durationTicks?: number;
    layer?: EffectLayer;
  } = {},
): EffectStage {
  const direction = options.direction ?? { kind: "angle", radians: -Math.PI / 2 };
  const spread = options.spread ?? 1.2;
  return stage({
    visual: {
      kind: "particleBurst",
      count: options.count ?? 18,
      speed: options.speed ?? 48,
    },
    source: {
      anchor,
      direction,
      spreadRadians: spread,
      space: "world",
    },
    path: {
      kind: "ray",
      from: anchor,
      direction,
      length: options.length ?? 48,
      spread,
    },
    timing: { durationTicks: options.durationTicks ?? 10 },
    binding: { follow: true },
    layer: options.layer ?? "foreground",
  });
}

function orbStage(
  from: AnchorRef,
  to: AnchorRef,
  options: {
    durationTicks?: number;
    trail?: boolean;
    size?: number;
    curve?: number;
  } = {},
): EffectStage {
  return stage({
    visual: {
      kind: "orb",
      trail: options.trail ?? true,
      ...(options.size !== undefined ? { size: options.size } : {}),
    },
    source: { anchor: from },
    path: {
      kind: "segment",
      from,
      to,
      ...(options.curve !== undefined ? { curve: options.curve } : {}),
    },
    timing: { durationTicks: options.durationTicks ?? 6 },
    binding: { follow: true },
    layer: "entities",
  });
}

function beamStage(
  from: AnchorRef,
  to: AnchorRef,
  options: {
    width?: number;
    pulse?: boolean;
    lifetime?: EffectLifetime;
    durationTicks?: number;
  } = {},
): EffectStage {
  return stage({
    visual: {
      kind: "beam",
      width: options.width ?? 3,
      pulse: options.pulse ?? true,
    },
    path: { kind: "segment", from, to },
    timing: { durationTicks: options.durationTicks ?? 30 },
    lifetime: options.lifetime ?? { kind: "persistent", until: "sourceInactive" },
    binding: { follow: true },
    layer: "entities",
  });
}

function tileTintStage(
  target: TileTarget,
  color: string,
  options: {
    durationTicks?: number;
    stagger?: { kind: "none" | "fromSource" | "byIndex"; ticks: number };
  } = {},
): EffectStage {
  return stage({
    visual: { kind: "tileTint", target, color, revert: true },
    timing: {
      durationTicks: options.durationTicks ?? 30,
      ...(options.stagger ? { stagger: options.stagger } : {}),
    },
    binding: { follow: false },
    layer: "tiles",
  });
}

function dissolveStage(anchor: AnchorRef): EffectStage {
  return stage({
    visual: { kind: "dissolve", target: anchor },
    targets: [anchor],
    timing: { durationTicks: 16 },
    binding: { follow: true },
    layer: "entities",
  });
}

export const EFFECT_PRESETS = {
  "fx.affordance.ring": (context) => {
    const anchor = sourceAnchor(context);
    return anchor
      ? plan(context, "fx.affordance.ring", [ringStage(anchor, { radius: 16 })])
      : null;
  },

  "fx.binary.swap": (context) => {
    const anchor = sourceAnchor(context);
    return anchor
      ? plan(context, "fx.binary.swap", [ringStage(anchor, { radius: 14 })])
      : null;
  },

  "fx.meter.sweep": (context) => {
    const anchor = sourceAnchor(context);
    return anchor
      ? plan(
          context,
          "fx.meter.sweep",
          [persistentRing(anchor, { radius: 22, durationTicks: 30 })],
          "onSourceInactive",
        )
      : null;
  },

  "fx.meter.elapsed": (context) => {
    const anchor = sourceAnchor(context);
    return anchor
      ? plan(
          context,
          "fx.meter.elapsed",
          [
            ringStage(anchor, { radius: 26, durationTicks: 16 }),
            burstStage(anchor, {
              durationTicks: 8,
              count: 10,
              speed: 32,
            }),
          ],
        )
      : null;
  },

  "fx.counter.pip": (context) => {
    const anchor = sourceAnchor(context);
    return anchor
      ? plan(context, "fx.counter.pip", [ringStage(anchor, { radius: 10 })])
      : null;
  },

  "fx.counter.burst": (context) => {
    const anchor = sourceAnchor(context);
    return anchor
      ? plan(context, "fx.counter.burst", [
          burstStage(anchor, { count: 12, speed: 36, durationTicks: 8 }),
        ])
      : null;
  },

  "fx.container.fill": (context) => {
    const anchor = sourceAnchor(context);
    return anchor
      ? plan(
          context,
          "fx.container.fill",
          [persistentRing(anchor, { radius: 22, durationTicks: 24 })],
          "onSourceInactive",
        )
      : null;
  },

  "fx.container.accept": (context) => {
    const anchor = sourceAnchor(context);
    return anchor
      ? plan(context, "fx.container.accept", [
          ringStage(anchor, { radius: 18, durationTicks: 12 }),
        ])
      : null;
  },

  "fx.carrier.glow": (context) => {
    const anchor = sourceAnchor(context);
    return anchor
      ? plan(
          context,
          "fx.carrier.glow",
          [persistentRing(anchor, { radius: 20, durationTicks: 24 })],
          "onSourceInactive",
        )
      : null;
  },

  "fx.carrier.pickup": (context) => {
    const anchor = sourceAnchor(context);
    if (!anchor) return null;
    const stages = context.target
      ? [
          orbStage(anchor, context.target, {
            durationTicks: 5,
            trail: true,
          }),
        ]
      : [ringStage(anchor, { radius: 12, durationTicks: 10 })];
    return plan(context, "fx.carrier.pickup", stages);
  },

  "fx.carrier.drop": (context) => {
    const anchor = sourceAnchor(context);
    if (!anchor) return null;
    const stages = context.target
      ? [orbStage(anchor, context.target, { durationTicks: 5, trail: true })]
      : [ringStage(anchor, { radius: 16, durationTicks: 10 })];
    return plan(context, "fx.carrier.drop", stages);
  },

  "fx.barrier.burst": (context) => {
    const anchor = sourceAnchor(context);
    return anchor
      ? plan(context, "fx.barrier.burst", [
          burstStage(anchor),
          ringStage(anchor, { radius: 24, durationTicks: 12 }),
        ])
      : null;
  },

  "fx.gate.burst": (context) => {
    const anchor = sourceAnchor(context);
    return anchor
      ? plan(context, "fx.gate.burst", [
          burstStage(anchor),
          ringStage(anchor, { radius: 28, durationTicks: 12 }),
        ])
      : null;
  },

  "fx.gate.close": (context) => {
    const anchor = sourceAnchor(context);
    return anchor
      ? plan(context, "fx.gate.close", [
          ringStage(anchor, { radius: 22, durationTicks: 8 }),
        ])
      : null;
  },

  "fx.conductor.path": (context) => {
    const anchor = sourceAnchor(context);
    if (!anchor) return null;
    const target = context.target ?? context.targets?.[0];
    const stages = target
      ? [
          beamStage(anchor, target, {
            lifetime: { kind: "persistent", until: "sourceInactive" },
          }),
        ]
      : [persistentRing(anchor, { radius: 18, durationTicks: 24 })];
    return plan(context, "fx.conductor.path", stages, "onSourceInactive");
  },

  "fx.conductor.spark": (context) => {
    const anchor = sourceAnchor(context);
    return anchor
      ? plan(context, "fx.conductor.spark", [
          ringStage(anchor, { radius: 16, durationTicks: 8 }),
        ])
      : null;
  },

  "fx.outcome.flash": (context) => {
    const anchor = sourceAnchor(context);
    return anchor
      ? plan(context, "fx.outcome.flash", [
          ringStage(anchor, {
            radius: 32,
            durationTicks: 18,
            layer: "hud",
          }),
        ])
      : null;
  },

  "fx.outcome.exitPing": (context) => {
    const anchor = sourceAnchor(context);
    return anchor
      ? plan(context, "fx.outcome.exitPing", [
          ringStage(anchor, {
            radius: 36,
            durationTicks: 20,
            layer: "hud",
          }),
          ringStage(anchor, {
            radius: 22,
            durationTicks: 12,
            delayTicks: 4,
            layer: "hud",
          }),
        ])
      : null;
  },

  "fx.plate.press": (context) => {
    const anchor = sourceAnchor(context);
    return anchor
      ? plan(context, "fx.plate.press", [
          ringStage(anchor, { radius: 12, durationTicks: 8 }),
        ])
      : null;
  },

  "fx.plate.release": (context) => {
    const anchor = sourceAnchor(context);
    return anchor
      ? plan(context, "fx.plate.release", [
          ringStage(anchor, { radius: 18, durationTicks: 8 }),
        ])
      : null;
  },

  "fx.rejection.bounce": (context) => {
    const anchor = sourceAnchor(context);
    if (!anchor) return null;
    const direction: Direction = { kind: "angle", radians: Math.PI / 2 };
    return plan(context, "fx.rejection.bounce", [
      ringStage(anchor, { radius: 12, durationTicks: 8 }),
      burstStage(anchor, {
        direction,
        count: 8,
        speed: 24,
        length: 24,
        durationTicks: 8,
      }),
    ]);
  },

  "fx.pulse.travel": (context) => {
    if (!context.source || !context.target) return null;
    const durationTicks = context.durationTicks ?? 6;
    return plan(context, "fx.pulse.travel", [
      orbStage(context.source, context.target, {
        durationTicks,
        trail: true,
        curve: 0.15,
      }),
      ringStage(context.target, {
        radius: 18,
        delayTicks: durationTicks,
        durationTicks: 8,
      }),
    ]);
  },

  "fx.pulse.impact": (context) => {
    const anchor = sourceAnchor(context);
    return anchor
      ? plan(context, "fx.pulse.impact", [
          ringStage(anchor, { radius: 18, durationTicks: 8 }),
        ])
      : null;
  },

  "fx.tile.path": (context) => {
    if (!context.tileTarget) return null;
    return plan(context, "fx.tile.path", [
      tileTintStage(context.tileTarget, context.color ?? "#ffd166", {
        durationTicks: 30,
        stagger: { kind: "fromSource", ticks: 1 },
      }),
    ]);
  },

  "fx.ach.dissolve": (context) => {
    const anchor = sourceAnchor(context);
    return anchor
      ? plan(context, "fx.ach.dissolve", [dissolveStage(anchor)])
      : null;
  },

  "fx.muscle.wave": (context) => {
    const anchor = sourceAnchor(context);
    if (!anchor) return null;
    const direction: Direction = { kind: "vector", x: 1, y: 0 };
    return plan(context, "fx.muscle.wave", [
      stage({
        visual: {
          kind: "particleStream",
          rate: 12,
          length: 64,
        },
        source: {
          anchor,
          direction,
          spreadRadians: 0.25,
        },
        path: {
          kind: "ray",
          from: anchor,
          direction,
          length: 64,
        },
        timing: { durationTicks: 20 },
        binding: { follow: true },
        layer: "foreground",
      }),
    ]);
  },
} as const satisfies Record<string, EffectPreset>;

export type EffectPresetId = keyof typeof EFFECT_PRESETS;

export function effectPresetIds(): EffectPresetId[] {
  return Object.keys(EFFECT_PRESETS) as EffectPresetId[];
}

export function isEffectPresetId(value: string): value is EffectPresetId {
  return Object.prototype.hasOwnProperty.call(EFFECT_PRESETS, value);
}

export function resolveEffectPreset(
  id: string,
  context: EffectPresetContext,
): EffectPlan | null {
  if (!isEffectPresetId(id)) return null;
  return EFFECT_PRESETS[id](context);
}
