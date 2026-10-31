import Phaser from "phaser";
import type { AssetsModule } from "../assets";
import type {
  MaterialDefinition,
  PatternBlend,
  PatternProvider,
  PatternResource,
  ResolvedMaterialBinding,
} from "../materials";
import type { ThemeDocument } from "../pack";
import {
  patternTilePosition,
  type PatternTilePosition,
} from "./pattern-space";
import { resolvePatternTexture } from "./textures";

export { patternTilePosition };
export type { PatternTilePosition };

function blendValue(blend: PatternBlend): Phaser.BlendModes {
  switch (blend) {
    case "multiply":
      return Phaser.BlendModes.MULTIPLY;
    case "overlay":
      return Phaser.BlendModes.OVERLAY;
    default:
      return Phaser.BlendModes.NORMAL;
  }
}

function tintValue(color: string | undefined): number | null {
  if (!color) return null;
  const parsed = Number.parseInt(color.replace(/^#/, ""), 16);
  return Number.isFinite(parsed) ? parsed : null;
}

export interface PatternOverlayOptions {
  x: number;
  y: number;
  width: number;
  height: number;
  depth: number;
  space: "world" | "screen" | "local";
  scale: number;
  offset: { x: number; y: number };
  opacity: number;
  blend: PatternBlend;
  tint?: string;
  parallaxX?: number;
  parallaxY?: number;
  scrollFactorX?: number;
  scrollFactorY?: number;
  follow?: Phaser.GameObjects.Image;
  cull?: boolean;
}

export interface PatternOverlay {
  sprite: Phaser.GameObjects.TileSprite;
  resource: PatternResource;
  options: PatternOverlayOptions;
  baseX: number;
  baseY: number;
}

export function createPatternOverlay(
  scene: Phaser.Scene,
  assets: AssetsModule,
  provider: PatternProvider,
  theme: ThemeDocument,
  binding: ResolvedMaterialBinding,
  options: PatternOverlayOptions,
): PatternOverlay | null {
  const placement = binding.pattern;
  if (!placement) return null;
  const result = provider.resolve(placement.pattern, {
    space: placement.space,
    scale: placement.scale,
    rotation: placement.rotation,
    offset: placement.offset,
    seed: placement.seed,
    opacity: placement.opacity,
    blend: placement.blend,
  });
  if (!result.ok) return null;
  const texture = resolvePatternTexture(
    scene,
    assets,
    result.value,
    theme.fonts.ui,
  );
  if (!texture) return null;

  const sprite = scene.add
    .tileSprite(
      options.x,
      options.y,
      options.width,
      options.height,
      texture.key,
      texture.frame,
    )
    .setOrigin(0, 0)
    .setDepth(options.depth)
    .setAlpha(Math.max(0, Math.min(1, options.opacity)))
    .setBlendMode(blendValue(options.blend))
    .setTileScale(options.scale);
  sprite.setScrollFactor(
    options.scrollFactorX ??
      (options.space === "screen" ? 0 : 1),
    options.scrollFactorY ??
      (options.space === "screen" ? 0 : 1),
  );

  const tint = tintValue(options.tint);
  if (tint !== null) sprite.setTint(tint);

  return {
    sprite,
    resource: result.value,
    options,
    baseX: options.x,
    baseY: options.y,
  };
}

export interface PatternLayerOptions {
  scene: Phaser.Scene;
  assets: AssetsModule;
  provider: PatternProvider;
  theme: ThemeDocument;
  isReducedMotion: () => boolean;
}

export class PatternLayer {
  private readonly overlays: PatternOverlay[] = [];

  constructor(private readonly config: PatternLayerOptions) {}

  addTile(
    x: number,
    y: number,
    tileSize: number,
    binding: ResolvedMaterialBinding | undefined,
  ): void {
    if (!binding) return;
    const material = binding.material;
    const overlay = createPatternOverlay(
      this.config.scene,
      this.config.assets,
      this.config.provider,
      this.config.theme,
      binding,
      {
        x,
        y,
        width: tileSize,
        height: tileSize,
        depth: 0.25,
        space: binding.pattern?.space ?? "world",
        scale: binding.pattern?.scale ?? 1,
        offset: binding.pattern?.offset ?? { x: 0, y: 0 },
        opacity: binding.pattern?.opacity ?? 0.35,
        blend: binding.pattern?.blend ?? "normal",
        tint: this.tintFor(material, binding.tint),
        cull: true,
      },
    );
    if (overlay) this.overlays.push(overlay);
  }

  addObject(
    sprite: Phaser.GameObjects.Image,
    binding: ResolvedMaterialBinding | undefined,
  ): void {
    if (!binding) return;
    const topLeftX = sprite.x - sprite.displayWidth * sprite.originX;
    const topLeftY = sprite.y - sprite.displayHeight * sprite.originY;
    const overlay = createPatternOverlay(
      this.config.scene,
      this.config.assets,
      this.config.provider,
      this.config.theme,
      binding,
      {
        x: topLeftX,
        y: topLeftY,
        width: sprite.displayWidth,
        height: sprite.displayHeight,
        depth: sprite.depth + 0.1,
        space: binding.pattern?.space ?? "world",
        scale: binding.pattern?.scale ?? 1,
        offset: binding.pattern?.offset ?? { x: 0, y: 0 },
        opacity: binding.pattern?.opacity ?? 0.35,
        blend: binding.pattern?.blend ?? "normal",
        tint: this.tintFor(binding.material, binding.tint),
        follow: sprite,
        cull: true,
      },
    );
    if (overlay) this.overlays.push(overlay);
  }

  update(
    deltaMs: number,
    camera: Phaser.Cameras.Scene2D.Camera,
    reducedMotion: boolean,
  ): void {
    void deltaMs;
    void reducedMotion;
    const view = camera.worldView;
    const viewX1 = view.x;
    const viewY1 = view.y;
    const viewX2 = view.x + view.width;
    const viewY2 = view.y + view.height;

    for (const overlay of this.overlays) {
      const { sprite, options } = overlay;
      let x = options.x;
      let y = options.y;

      if (options.follow) {
        x = options.follow.x - options.follow.displayWidth * options.follow.originX;
        y =
          options.follow.y -
          options.follow.displayHeight * options.follow.originY;
        sprite.setPosition(x, y);
        overlay.baseX = x;
        overlay.baseY = y;
      }

      const position = patternTilePosition(
        options.space,
        x,
        y,
        options.scale,
        options.offset,
        camera.scrollX,
        camera.scrollY,
        options.parallaxX ?? 0,
        options.parallaxY ?? 0,
      );
      sprite.setTilePosition(position.x, position.y);

      if (options.cull) {
        sprite.setVisible(
          x + sprite.width >= viewX1 &&
            x <= viewX2 &&
            y + sprite.height >= viewY1 &&
            y <= viewY2,
        );
      }
    }
  }

  destroy(): void {
    for (const overlay of this.overlays) {
      overlay.sprite.destroy();
    }
    this.overlays.length = 0;
  }

  private tintFor(
    material: MaterialDefinition,
    override: string | undefined,
  ): string | undefined {
    const token = override ?? material.tint ?? material.palette[0];
    if (!token) return undefined;
    return this.config.theme.palette[
      token as keyof ThemeDocument["palette"]
    ];
  }
}
