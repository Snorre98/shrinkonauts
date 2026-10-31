import Phaser from "phaser";
import type { AssetsModule } from "../assets";
import type { RoomDocument, ThemeDocument } from "../pack";
import {
  defaultEntityAnchors,
  effectStageProgress,
  entityAnchorPoint,
  simplifyForReducedMotion,
  type TileVisualOp,
  type TileVisualPort,
  type WorldAnchorRef,
  type WorldDirection,
  type WorldEffectPlan,
  type WorldEffectStage,
  type WorldEffectVisual,
} from "./effect-types";
import type { PlayerId, RoomSimulation } from "./simulation";
import { PLAYER_HEIGHT, PLAYER_WIDTH } from "./simulation";
import { resolveTexture } from "./textures";

type EffectObject =
  | Phaser.GameObjects.Arc
  | Phaser.GameObjects.Rectangle
  | Phaser.GameObjects.Image;

interface PendingTileOp {
  op: TileVisualOp;
  applyAt: number;
  revertAt: number;
  opId?: string;
}

interface StageView {
  stage: WorldEffectStage;
  objects: EffectObject[];
  tiles: PendingTileOp[];
  targetSprite?: Phaser.GameObjects.Image;
  originalTexture?: string;
  originalAlpha?: number;
  originalTint?: number;
}

interface EffectView {
  id: string;
  signature: string;
  plan: WorldEffectPlan;
  stages: StageView[];
}

export interface RoomEffectLayerOptions {
  scene: Phaser.Scene;
  room: RoomDocument;
  simulation: RoomSimulation;
  assets: AssetsModule;
  theme: ThemeDocument;
  tilePort: TileVisualPort;
  entitySprites: ReadonlyMap<string, Phaser.GameObjects.Image>;
  propSprites: ReadonlyMap<string, Phaser.GameObjects.Image>;
  playerSprites: Partial<Record<PlayerId, Phaser.GameObjects.Image>>;
  isReducedMotion?: () => boolean;
}

const LAYER_DEPTH: Record<WorldEffectStage["layer"], number> = {
  background: 1,
  tiles: 2,
  entities: 12,
  foreground: 30,
  hud: 1000,
};

function parseColor(value: string): number {
  const parsed = Number.parseInt(value.replace(/^#/, ""), 16);
  return Number.isFinite(parsed) ? parsed : 0xffffff;
}

function directionVector(
  direction: WorldDirection,
  from: { x: number; y: number },
  resolve: (anchor: WorldAnchorRef) => { x: number; y: number } | null,
  facing: (entityId: string) => number,
): { x: number; y: number } {
  switch (direction.kind) {
    case "angle":
      return { x: Math.cos(direction.radians), y: Math.sin(direction.radians) };
    case "vector": {
      const length = Math.hypot(direction.x, direction.y) || 1;
      return { x: direction.x / length, y: direction.y / length };
    }
    case "toward": {
      const target = resolve(direction.target);
      if (!target) return { x: 1, y: 0 };
      const dx = target.x - from.x;
      const dy = target.y - from.y;
      const length = Math.hypot(dx, dy) || 1;
      return { x: dx / length, y: dy / length };
    }
    case "facing":
      return { x: facing(direction.entityId), y: 0 };
  }
}

function lerp(
  from: { x: number; y: number },
  to: { x: number; y: number },
  t: number,
): { x: number; y: number } {
  return {
    x: from.x + (to.x - from.x) * t,
    y: from.y + (to.y - from.y) * t,
  };
}

/**
 * Phaser adapter for `WorldEffectPort`. It is purely visual: it never calls
 * physics, puzzle, gate, or prop-state APIs.
 */
export class RoomEffectLayer {
  private readonly views = new Map<string, EffectView>();
  private lastReduced: boolean;

  constructor(private readonly options: RoomEffectLayerOptions) {
    this.lastReduced = options.isReducedMotion?.() ?? false;
  }

  spawn(plan: WorldEffectPlan): string {
    const reduced = this.options.isReducedMotion?.() ?? false;
    const effective = reduced ? simplifyForReducedMotion(plan) : plan;
    const signature = `${reduced ? "reduced" : "full"}:${JSON.stringify(
      effective.stages,
    )}`;
    const existing = this.views.get(plan.id);
    if (existing) this.cancel(plan.id);
    const view: EffectView = {
      id: plan.id,
      signature,
      plan: effective,
      stages: effective.stages.map((stage, index) =>
        this.createStage(stage, effective, index),
      ),
    };
    this.views.set(plan.id, view);
    return plan.id;
  }

  cancel(effectId: string): void {
    const view = this.views.get(effectId);
    if (!view) return;
    for (const stage of view.stages) {
      for (const pending of stage.tiles) {
        if (pending.opId) this.options.tilePort.revert(pending.opId);
      }
      for (const object of stage.objects) object.destroy();
      this.restoreSprite(stage);
    }
    this.views.delete(effectId);
  }

  clear(): void {
    for (const id of [...this.views.keys()]) this.cancel(id);
  }

  destroy(): void {
    this.clear();
  }

  sync(plans: readonly WorldEffectPlan[]): void {
    const reduced = this.options.isReducedMotion?.() ?? false;
    if (reduced !== this.lastReduced) {
      this.clear();
      this.lastReduced = reduced;
    }

    const desired = new Map(plans.map((plan) => [plan.id, plan]));
    for (const id of [...this.views.keys()]) {
      if (!desired.has(id)) this.cancel(id);
    }

    for (const plan of plans) {
      const effective = reduced ? simplifyForReducedMotion(plan) : plan;
      if (effective.stages.length === 0) {
        this.cancel(plan.id);
        continue;
      }
      const signature = `${reduced ? "reduced" : "full"}:${JSON.stringify(
        effective.stages,
      )}`;
      const existing = this.views.get(plan.id);
      if (existing && existing.signature !== signature) {
        this.cancel(plan.id);
      }
      if (!this.views.has(plan.id)) {
        this.spawn(effective);
      } else {
        const view = this.views.get(plan.id);
        if (view) this.update(view, effective);
      }
    }
  }

  private update(view: EffectView, plan: WorldEffectPlan): void {
    view.plan = plan;
    for (let index = 0; index < view.stages.length; index += 1) {
      const stageView = view.stages[index];
      const stage = plan.stages[index];
      if (!stageView || !stage) continue;
      this.updateStage(stageView, stage, plan, index);
    }
  }

  private createStage(
    stage: WorldEffectStage,
    plan: WorldEffectPlan,
    index: number,
  ): StageView {
    const depth = LAYER_DEPTH[stage.layer] + index * 0.01;
    const visual = stage.visual;
    const view: StageView = { stage, objects: [], tiles: [] };

    if (this.isTileVisual(visual)) {
      view.tiles = this.createTileOps(stage);
      return view;
    }

    const color = this.colorFor(plan, visual);
    switch (visual.kind) {
      case "orb": {
        const size = visual.size ?? 7;
        const orb = this.options.scene.add
          .circle(0, 0, size, color, 1)
          .setDepth(depth)
          .setVisible(false);
        view.objects.push(orb);
        if (visual.trail !== false) {
          for (let trail = 1; trail <= 3; trail += 1) {
            view.objects.push(
              this.options.scene.add
                .circle(0, 0, Math.max(2, size - trail * 1.5), color, 0.35)
                .setDepth(depth - 0.001 * trail)
                .setVisible(false),
            );
          }
        }
        break;
      }
      case "beam": {
        const beam = this.options.scene.add
          .rectangle(0, 0, 1, visual.width ?? 3, color, 0.8)
          .setOrigin(0, 0.5)
          .setDepth(depth)
          .setVisible(false);
        view.objects.push(beam);
        break;
      }
      case "ring": {
        const ring = this.options.scene.add
          .circle(0, 0, visual.radius ?? 20, color, 0.12)
          .setStrokeStyle(2, color, 1)
          .setDepth(depth)
          .setVisible(false);
        view.objects.push(ring);
        break;
      }
      case "particleBurst": {
        const count = Math.max(1, visual.count ?? 12);
        for (let particle = 0; particle < count; particle += 1) {
          view.objects.push(
            this.options.scene.add
              .circle(0, 0, 2.5, color, 1)
              .setDepth(depth)
              .setVisible(false),
          );
        }
        break;
      }
      case "particleStream": {
        const count = Math.max(4, visual.rate ?? 12);
        for (let particle = 0; particle < count; particle += 1) {
          view.objects.push(
            this.options.scene.add
              .circle(0, 0, 2.5, color, 1)
              .setDepth(depth)
              .setVisible(false),
          );
        }
        break;
      }
      case "decal": {
        const texture = this.texture(visual.assetId);
        if (texture) {
          view.objects.push(
            this.options.scene.add
              .image(0, 0, texture)
              .setDepth(depth)
              .setVisible(false),
          );
        }
        break;
      }
      case "spriteSwap":
      case "tint":
      case "dissolve": {
        const sprite = this.spriteForAnchor(visual.target);
        if (sprite) {
          view.targetSprite = sprite;
          view.originalTexture = sprite.texture.key;
          view.originalAlpha = sprite.alpha;
          view.originalTint = sprite.tintTopLeft;
        }
        break;
      }
    }

    return view;
  }

  private updateStage(
    view: StageView,
    stage: WorldEffectStage,
    plan: WorldEffectPlan,
    index: number,
  ): void {
    if (this.isTileVisual(stage.visual)) {
      this.updateTiles(view, plan);
      return;
    }

    const progress = effectStageProgress(plan, index);
    const visual = stage.visual;

    if (!progress.active) {
      for (const object of view.objects) object.setVisible(false);
      if (view.targetSprite) this.restoreSprite(view);
      return;
    }

    switch (visual.kind) {
      case "orb": {
        const point = this.pathPoint(stage, progress.t);
        if (!point) {
          for (const object of view.objects) object.setVisible(false);
          return;
        }
        const [main, ...trail] = view.objects;
        if (main) {
          main
            .setVisible(true)
            .setPosition(point.x, point.y)
            .setAlpha(plan.cancel ? 0.95 : 1 - progress.t * 0.15);
        }
        trail.forEach((object, trailIndex) => {
          const trailPoint = this.pathPoint(
            stage,
            Math.max(0, progress.t - (trailIndex + 1) * 0.035),
          );
          if (!trailPoint) {
            object.setVisible(false);
            return;
          }
          object
            .setVisible(true)
            .setPosition(trailPoint.x, trailPoint.y)
            .setAlpha((0.4 - trailIndex * 0.1) * (1 - progress.t));
        });
        break;
      }
      case "beam": {
        const from = this.sourcePoint(stage);
        const to = this.pathEndPoint(stage);
        if (!from || !to) {
          for (const object of view.objects) object.setVisible(false);
          return;
        }
        const dx = to.x - from.x;
        const dy = to.y - from.y;
        const length = Math.hypot(dx, dy);
        const beam = view.objects[0] as
          | Phaser.GameObjects.Rectangle
          | undefined;
        if (beam) {
          beam
            .setVisible(true)
            .setPosition(from.x, from.y)
            .setSize(length, visual.width ?? 3)
            .setRotation(Math.atan2(dy, dx));
          const pulse = visual.pulse ?? true;
          beam.setAlpha(
            pulse ? 0.55 + 0.25 * Math.sin(plan.ageTicks * 0.45) : 0.8,
          );
        }
        break;
      }
      case "ring": {
        const anchor = this.ringAnchor(stage);
        if (!anchor) {
          for (const object of view.objects) object.setVisible(false);
          return;
        }
        const ring = view.objects[0];
        if (ring) {
          const base = visual.radius ?? 20;
          const scale =
            stage.lifetime?.kind === "persistent"
              ? 1 + 0.08 * Math.sin(plan.ageTicks * 0.35)
              : 0.6 + progress.t * 0.9;
          ring
            .setVisible(true)
            .setPosition(anchor.x, anchor.y)
            .setScale(scale)
            .setAlpha(
              stage.lifetime?.kind === "persistent"
                ? 0.35 + 0.1 * Math.sin(plan.ageTicks * 0.35)
                : 0.9 * (1 - progress.t),
            );
          const arc = ring as Phaser.GameObjects.Arc;
          arc.setRadius(base);
        }
        break;
      }
      case "particleBurst": {
        const source = this.sourcePoint(stage);
        if (!source) {
          for (const object of view.objects) object.setVisible(false);
          return;
        }
        const direction =
          stage.source?.direction ??
          ({ kind: "angle", radians: -Math.PI / 2 } as WorldDirection);
        const baseDirection = directionVector(
          direction,
          source,
          (anchor) => this.resolveAnchor(anchor),
          (entityId) => this.facing(entityId),
        );
        const spread = stage.source?.spreadRadians ?? 1.2;
        const speed = visual.speed ?? 48;
        const elapsed = plan.ageTicks / 60;
        view.objects.forEach((object, particle) => {
          const offset =
            view.objects.length === 1
              ? 0
              : (particle / (view.objects.length - 1) - 0.5) * spread;
          const angle = Math.atan2(baseDirection.y, baseDirection.x) + offset;
          const distance = speed * elapsed * (0.6 + (particle % 5) * 0.12);
          object
            .setVisible(true)
            .setPosition(
              source.x + Math.cos(angle) * distance,
              source.y + Math.sin(angle) * distance,
            )
            .setAlpha(Math.max(0, 1 - progress.t));
        });
        break;
      }
      case "particleStream": {
        const source = this.sourcePoint(stage);
        if (!source) {
          for (const object of view.objects) object.setVisible(false);
          return;
        }
        const direction =
          stage.source?.direction ??
          ({ kind: "vector", x: 1, y: 0 } as WorldDirection);
        const vector = directionVector(
          direction,
          source,
          (anchor) => this.resolveAnchor(anchor),
          (entityId) => this.facing(entityId),
        );
        const length =
          stage.path?.kind === "ray"
            ? stage.path.length
            : (visual.length ?? 64);
        view.objects.forEach((object, particle) => {
          const offset =
            (progress.t + particle / view.objects.length) % 1;
          object
            .setVisible(true)
            .setPosition(
              source.x + vector.x * length * offset,
              source.y + vector.y * length * offset,
            )
            .setAlpha((1 - offset) * 0.8);
        });
        break;
      }
      case "decal": {
        const anchor = this.resolveAnchor(visual.target);
        const object = view.objects[0];
        if (!anchor || !object) {
          for (const item of view.objects) item.setVisible(false);
          return;
        }
        object
          .setVisible(true)
          .setPosition(anchor.x, anchor.y)
          .setAlpha(1 - progress.t);
        break;
      }
      case "spriteSwap": {
        const sprite = view.targetSprite;
        if (!sprite) return;
        const texture = this.texture(visual.assetId);
        if (texture) sprite.setTexture(texture);
        break;
      }
      case "tint": {
        const sprite = view.targetSprite;
        if (sprite) sprite.setTint(parseColor(visual.color));
        break;
      }
      case "dissolve": {
        const sprite = view.targetSprite;
        if (sprite) sprite.setAlpha(Math.max(0, 1 - progress.t));
        break;
      }
    }
  }

  private isTileVisual(visual: WorldEffectVisual): boolean {
    return (
      visual.kind === "tileSwap" ||
      visual.kind === "tileTint" ||
      visual.kind === "tileOverlay" ||
      visual.kind === "tileAlpha" ||
      visual.kind === "tileSequence"
    );
  }

  private createTileOps(stage: WorldEffectStage): PendingTileOp[] {
    const visual = stage.visual;
    if (!this.isTileVisual(visual)) return [];
    const base = this.tileOp(visual);
    if (!base) return [];

    const delay = Math.max(0, stage.timing.delayTicks ?? 0);
    const duration = Math.max(1, stage.timing.durationTicks ?? 1);
    const repeat = Math.max(1, stage.timing.repeat ?? 1);
    const total = delay + duration * repeat;
    const persistent = stage.lifetime?.kind === "persistent";
    const stagger = stage.timing.stagger;

    if (
      base.target.kind !== "tileRegion" ||
      !stagger ||
      stagger.kind === "none" ||
      stagger.ticks <= 0
    ) {
      return [
        {
          op: base,
          applyAt: delay,
          revertAt: persistent ? Number.POSITIVE_INFINITY : total,
        },
      ];
    }

    const target = base.target;
    const tiles: Array<{ x: number; y: number; distance: number }> = [];
    for (let y = Math.min(target.y1, target.y2); y <= Math.max(target.y1, target.y2); y += 1) {
      for (let x = Math.min(target.x1, target.x2); x <= Math.max(target.x1, target.x2); x += 1) {
        const point = { x: (x + 0.5) * this.options.room.tileSize, y: (y + 0.5) * this.options.room.tileSize };
        const source = this.sourcePoint(stage);
        tiles.push({
          x,
          y,
          distance: source
            ? Math.hypot(point.x - source.x, point.y - source.y)
            : 0,
        });
      }
    }
    if (stagger.kind === "fromSource") {
      tiles.sort((left, right) => left.distance - right.distance);
    }
    return tiles.map((tile, index) => {
      const applyAt = delay + index * stagger.ticks;
      return {
        op: {
          ...base,
          target: { kind: "tile", layer: target.layer, x: tile.x, y: tile.y },
        },
        applyAt,
        revertAt: persistent
          ? Number.POSITIVE_INFINITY
          : applyAt + duration,
      };
    });
  }

  private tileOp(visual: WorldEffectVisual): TileVisualOp | null {
    switch (visual.kind) {
      case "tileSwap":
        return {
          target: visual.target,
          op: "swap",
          value: visual.tile,
          revert: visual.revert ?? true,
        };
      case "tileTint":
        return {
          target: visual.target,
          op: "tint",
          value: visual.color,
          revert: visual.revert ?? true,
        };
      case "tileOverlay":
        return {
          target: visual.target,
          op: "overlay",
          value: visual.assetId,
          revert: visual.revert ?? true,
        };
      case "tileAlpha":
        return {
          target: visual.target,
          op: "alpha",
          value: visual.alpha,
          revert: visual.revert ?? true,
        };
      case "tileSequence":
        return {
          target: visual.target,
          op: "sequence",
          value: visual.frames.join("|"),
          revert: visual.revert ?? true,
        };
      default:
        return null;
    }
  }

  private updateTiles(view: StageView, plan: WorldEffectPlan): void {
    for (let index = view.tiles.length - 1; index >= 0; index -= 1) {
      const pending = view.tiles[index];
      if (!pending) continue;
      if (!pending.opId && plan.ageTicks >= pending.applyAt) {
        pending.opId = this.options.tilePort.apply(pending.op);
      }
      if (
        pending.opId &&
        Number.isFinite(pending.revertAt) &&
        plan.ageTicks >= pending.revertAt
      ) {
        this.options.tilePort.revert(pending.opId);
        view.tiles.splice(index, 1);
      }
    }
  }

  private sourcePoint(stage: WorldEffectStage): { x: number; y: number } | null {
    const anchor = stage.binding.attachTo ?? stage.source?.anchor;
    if (!anchor) return null;
    const point = this.resolveAnchor(anchor);
    if (!point) return null;
    const offset = stage.source?.offset;
    return {
      x: point.x + (offset?.x ?? 0),
      y: point.y + (offset?.y ?? 0),
    };
  }

  private ringAnchor(stage: WorldEffectStage): { x: number; y: number } | null {
    const anchor = stage.targets?.[0] ?? stage.source?.anchor;
    return anchor ? this.resolveAnchor(anchor) : null;
  }

  private pathEndPoint(stage: WorldEffectStage): { x: number; y: number } | null {
    if (!stage.path) return this.ringAnchor(stage);
    switch (stage.path.kind) {
      case "point":
        return this.sourcePoint(stage);
      case "segment":
        return this.resolveAnchor(stage.path.to);
      case "polyline": {
        const last = stage.path.points[stage.path.points.length - 1];
        return last ? this.resolveAnchor(last) : null;
      }
      case "arc":
        return this.resolveAnchor(stage.path.center);
      case "ray":
        return this.resolveAnchor(stage.path.from);
      case "radial":
        return this.resolveAnchor(stage.path.from);
    }
  }

  private pathPoint(
    stage: WorldEffectStage,
    t: number,
  ): { x: number; y: number } | null {
    if (!stage.path) return this.sourcePoint(stage);
    const path = stage.path;
    switch (path.kind) {
      case "point":
        return this.sourcePoint(stage);
      case "segment": {
        const from = this.resolveAnchor(path.from);
        const to = this.resolveAnchor(path.to);
        if (!from || !to) return null;
        const curve = path.curve ?? 0;
        if (curve === 0) return lerp(from, to, t);
        const dx = to.x - from.x;
        const dy = to.y - from.y;
        const length = Math.hypot(dx, dy) || 1;
        const control = {
          x: (from.x + to.x) / 2 - (dy / length) * curve * length,
          y: (from.y + to.y) / 2 + (dx / length) * curve * length,
        };
        const inverse = 1 - t;
        return {
          x:
            inverse * inverse * from.x +
            2 * inverse * t * control.x +
            t * t * to.x,
          y:
            inverse * inverse * from.y +
            2 * inverse * t * control.y +
            t * t * to.y,
        };
      }
      case "polyline": {
        const points = path.points
          .map((anchor) => this.resolveAnchor(anchor))
          .filter((point): point is { x: number; y: number } => Boolean(point));
        if (points.length === 0) return null;
        if (points.length === 1) return points[0] ?? null;
        const scaled = Math.max(0, Math.min(1, t)) * (points.length - 1);
        const index = Math.min(points.length - 2, Math.floor(scaled));
        const from = points[index];
        const to = points[index + 1];
        if (!from || !to) return null;
        return lerp(from, to, scaled - index);
      }
      case "arc": {
        const center = this.resolveAnchor(path.center);
        if (!center) return null;
        const angle =
          path.startAngle + (path.endAngle - path.startAngle) * t;
        return {
          x: center.x + Math.cos(angle) * path.radius,
          y: center.y + Math.sin(angle) * path.radius,
        };
      }
      case "ray": {
        const from = this.resolveAnchor(path.from);
        if (!from) return null;
        const direction = directionVector(
          path.direction,
          from,
          (anchor) => this.resolveAnchor(anchor),
          (entityId) => this.facing(entityId),
        );
        return {
          x: from.x + direction.x * path.length * t,
          y: from.y + direction.y * path.length * t,
        };
      }
      case "radial": {
        const from = this.resolveAnchor(path.from);
        return from ?? null;
      }
    }
  }

  private resolveAnchor(
    anchor: WorldAnchorRef,
  ): { x: number; y: number } | null {
    switch (anchor.kind) {
      case "entity": {
        const sprite =
          this.options.entitySprites.get(anchor.id) ??
          this.options.propSprites.get(anchor.id);
        if (!sprite) return null;
        const entity = this.options.room.entities?.find(
          (item) => item.id === anchor.id,
        );
        const width = sprite.displayWidth;
        const height = sprite.displayHeight;
        const point = entityAnchorPoint(
          width,
          height,
          entity?.components?.anchors,
          anchor.socket,
        );
        return {
          x: sprite.x - width / 2 + point.x,
          y: sprite.y - height + point.y,
        };
      }
      case "player": {
        const player = this.options.simulation.players[anchor.id];
        if (!player.active) return null;
        const point = entityAnchorPoint(
          PLAYER_WIDTH,
          PLAYER_HEIGHT,
          defaultEntityAnchors(PLAYER_WIDTH, PLAYER_HEIGHT),
          anchor.socket,
        );
        return {
          x: player.x - PLAYER_WIDTH / 2 + point.x,
          y: player.y - PLAYER_HEIGHT + point.y,
        };
      }
      case "tile":
        return {
          x: (anchor.x + 0.5) * this.options.room.tileSize,
          y: (anchor.y + 0.5) * this.options.room.tileSize,
        };
      case "tileRegion":
        return {
          x:
            ((anchor.x1 + anchor.x2 + 1) / 2) *
            this.options.room.tileSize,
          y:
            ((anchor.y1 + anchor.y2 + 1) / 2) *
            this.options.room.tileSize,
        };
      case "world":
        return { x: anchor.x, y: anchor.y };
      case "hud": {
        const camera = this.options.scene.cameras.main;
        return {
          x: camera.scrollX + camera.width / 2,
          y: camera.scrollY + 48,
        };
      }
    }
  }

  private spriteForAnchor(
    anchor: WorldAnchorRef,
  ): Phaser.GameObjects.Image | null {
    if (anchor.kind === "entity") {
      return (
        this.options.entitySprites.get(anchor.id) ??
        this.options.propSprites.get(anchor.id) ??
        null
      );
    }
    if (anchor.kind === "player") {
      return this.options.playerSprites[anchor.id] ?? null;
    }
    return null;
  }

  private restoreSprite(stage: StageView): void {
    const sprite = stage.targetSprite;
    if (!sprite) return;
    if (stage.originalTexture) sprite.setTexture(stage.originalTexture);
    if (stage.originalAlpha !== undefined) sprite.setAlpha(stage.originalAlpha);
    if (stage.originalTint !== undefined) sprite.setTint(stage.originalTint);
  }

  private facing(entityId: string): number {
    const sprite =
      this.options.entitySprites.get(entityId) ??
      this.options.propSprites.get(entityId);
    if (sprite) return sprite.flipX ? -1 : 1;
    const player = this.options.simulation.players.p1;
    if (player.id === entityId) return player.facing;
    return 1;
  }

  private texture(assetId: string): string | null {
    const asset = this.options.assets.resolveById(assetId);
    if (!asset) return null;
    return resolveTexture(
      this.options.scene,
      asset,
      this.options.theme.fonts.ui,
    );
  }

  private colorFor(plan: WorldEffectPlan, visual: WorldEffectVisual): number {
    if (visual.kind === "tint") return parseColor(visual.color);
    if (visual.kind === "tileTint") return parseColor(visual.color);
    switch (plan.accent) {
      case "p1":
        return parseColor(this.options.theme.palette.joint);
      case "p2":
        return parseColor(this.options.theme.palette.muscle);
      default:
        return parseColor(this.options.theme.palette.accent);
    }
  }
}
