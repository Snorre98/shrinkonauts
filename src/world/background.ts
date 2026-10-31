import Phaser from "phaser";
import type { AssetsModule, ResolvedAsset } from "../assets";
import {
  resolveMaterialBinding,
  type MaterialCatalog,
  type PatternProvider,
  type ResolvedMaterialBinding,
} from "../materials";
import type { RoomBackgroundLayer, ThemeDocument } from "../pack";
import {
  createPatternOverlay,
  patternTilePosition,
  type PatternOverlay,
} from "./pattern-layer";
import { resolveTexture } from "./textures";

interface ImageLayerView {
  kind: "image";
  layer: RoomBackgroundLayer;
  object: Phaser.GameObjects.Image;
}

interface TileLayerView {
  kind: "tile";
  layer: RoomBackgroundLayer;
  object: Phaser.GameObjects.TileSprite;
}

type LayerView = ImageLayerView | TileLayerView;

function blendMode(blend: RoomBackgroundLayer["blend"]): Phaser.BlendModes {
  switch (blend) {
    case "add":
      return Phaser.BlendModes.ADD;
    case "multiply":
      return Phaser.BlendModes.MULTIPLY;
    case "screen":
      return Phaser.BlendModes.SCREEN;
    default:
      return Phaser.BlendModes.NORMAL;
  }
}

function tintValue(tint: string | undefined): number | null {
  if (!tint) {
    return null;
  }
  const parsed = Number.parseInt(tint.replace("#", ""), 16);
  return Number.isFinite(parsed) ? parsed : null;
}

function textureSize(
  scene: Phaser.Scene,
  key: string,
): { width: number; height: number } {
  const texture = scene.textures.get(key);
  const source = texture.getSourceImage() as
    | HTMLImageElement
    | HTMLCanvasElement
    | ImageBitmap;

  return {
    width: source.width,
    height: source.height,
  };
}

export interface LayeredBackgroundOptions {
  materials?: MaterialCatalog;
  patterns?: PatternProvider;
}

function backgroundBinding(
  layer: RoomBackgroundLayer,
  catalog: MaterialCatalog | undefined,
): ResolvedMaterialBinding | undefined {
  if (!catalog || !layer.materialId) return undefined;
  const pattern = layer.pattern;
  const resolved = resolveMaterialBinding(catalog, {
    materialId: layer.materialId,
    ...(pattern ? { patternId: pattern.patternId } : {}),
    ...(pattern
      ? {
          pattern: {
            ...(pattern.space ? { space: pattern.space } : {}),
            ...(pattern.scale !== undefined ? { scale: pattern.scale } : {}),
            ...(pattern.rotation !== undefined
              ? { rotation: pattern.rotation }
              : {}),
            ...(pattern.offset ? { offset: pattern.offset } : {}),
            ...(pattern.seed !== undefined ? { seed: pattern.seed } : {}),
            ...(pattern.opacity !== undefined
              ? { opacity: pattern.opacity }
              : {}),
            ...(pattern.blend ? { blend: pattern.blend } : {}),
          },
        }
      : {}),
  });
  return resolved.ok ? resolved.value : undefined;
}

function tintFor(
  theme: ThemeDocument,
  binding: ResolvedMaterialBinding | undefined,
  fallback: string | undefined,
): string | undefined {
  const token =
    binding?.tint ??
    binding?.material.tint ??
    binding?.material.palette[0];
  if (token) {
    return theme.palette[token as keyof ThemeDocument["palette"]];
  }
  return fallback;
}

export class LayeredBackground {
  private readonly views: LayerView[] = [];
  private readonly patternOverlays: PatternOverlay[] = [];
  private readonly catalog?: MaterialCatalog;
  private readonly patterns?: PatternProvider;

  constructor(
    scene: Phaser.Scene,
    layers: readonly RoomBackgroundLayer[],
    roomWidth: number,
    roomHeight: number,
    theme: ThemeDocument,
    assets: AssetsModule,
    options: LayeredBackgroundOptions = {},
  ) {
    const camera = scene.cameras.main;
    this.catalog = options.materials;
    this.patterns = options.patterns;

    for (const layer of layers) {
      const asset: ResolvedAsset = assets.image(layer.assetId);
      const key = resolveTexture(scene, asset, theme.fonts.ui);
      if (!key) {
        continue;
      }

      if (layer.fit === "tile") {
        const object = scene.add
          .tileSprite(
            0,
            0,
            scene.scale.width,
            scene.scale.height,
            key,
          )
          .setOrigin(0, 0)
          .setScrollFactor(0)
          .setDepth(layer.depth)
          .setAlpha(layer.opacity ?? 1)
          .setBlendMode(blendMode(layer.blend));

        const tint = tintValue(layer.tint);
        if (tint !== null) {
          object.setTint(tint);
        }

        this.views.push({ kind: "tile", layer, object });

        const binding = backgroundBinding(layer, this.catalog);
        if (binding?.pattern && this.patterns) {
          const overlay = createPatternOverlay(
            scene,
            assets,
            this.patterns,
            theme,
            binding,
            {
              x: 0,
              y: 0,
              width: scene.scale.width,
              height: scene.scale.height,
              depth: layer.depth + 0.01,
              space: binding.pattern.space,
              scale: binding.pattern.scale,
              offset: binding.pattern.offset,
              opacity: binding.pattern.opacity,
              blend: binding.pattern.blend,
              ...(tintFor(theme, binding, layer.tint)
                ? { tint: tintFor(theme, binding, layer.tint) }
                : {}),
              parallaxX:
                binding.pattern.space === "world" ? layer.parallaxX : 0,
              parallaxY:
                binding.pattern.space === "world" ? layer.parallaxY : 0,
              scrollFactorX: 0,
              scrollFactorY: 0,
              cull: false,
            },
          );
          if (overlay) this.patternOverlays.push(overlay);
        }
        continue;
      }

      // Anchor each layer around the initial camera view instead of the room
      // centre. With a scroll factor below 1 the layer drifts as the camera
      // moves, so the framing stays centred when the room boots.
      const anchorX =
        camera.width / 2 + camera.scrollX * layer.parallaxX;
      const anchorY =
        camera.height / 2 + camera.scrollY * layer.parallaxY;

      const object = scene.add
        .image(anchorX, anchorY, key)
        .setOrigin(0.5, 0.5)
        .setScrollFactor(layer.parallaxX, layer.parallaxY)
        .setDepth(layer.depth)
        .setAlpha(layer.opacity ?? 1)
        .setBlendMode(blendMode(layer.blend));

      const size = textureSize(scene, key);
      if (size.width > 0 && size.height > 0) {
        const coverScale = Math.max(
          roomWidth / size.width,
          roomHeight / size.height,
        );
        const containScale = Math.min(
          roomWidth / size.width,
          roomHeight / size.height,
        );

        switch (layer.fit) {
          case "stretch":
            object.setScale(roomWidth / size.width, roomHeight / size.height);
            break;
          case "contain":
            object.setScale(containScale);
            break;
          case "cover":
          default:
            // Extra bleed keeps the layer covering the viewport while the
            // slower scroll factors drift across the room.
            object.setScale(coverScale * 1.4);
            break;
        }
      }

      const tint = tintValue(layer.tint);
      if (tint !== null) {
        object.setTint(tint);
      }

      this.views.push({ kind: "image", layer, object });

      const binding = backgroundBinding(layer, this.catalog);
      if (binding?.pattern && this.patterns) {
        const screenSpace = binding.pattern.space === "screen";
        const width = screenSpace ? scene.scale.width : object.displayWidth;
        const height = screenSpace ? scene.scale.height : object.displayHeight;
        const overlay = createPatternOverlay(
          scene,
          assets,
          this.patterns,
          theme,
          binding,
          {
            x: screenSpace ? 0 : object.x - width / 2,
            y: screenSpace ? 0 : object.y - height / 2,
            width,
            height,
            depth: layer.depth + 0.01,
            space: binding.pattern.space,
            scale: binding.pattern.scale,
            offset: binding.pattern.offset,
            opacity: binding.pattern.opacity,
            blend: binding.pattern.blend,
            ...(tintFor(theme, binding, layer.tint)
              ? { tint: tintFor(theme, binding, layer.tint) }
              : {}),
            parallaxX:
              binding.pattern.space === "world" ? layer.parallaxX : 0,
            parallaxY:
              binding.pattern.space === "world" ? layer.parallaxY : 0,
            scrollFactorX: screenSpace ? 0 : layer.parallaxX,
            scrollFactorY: screenSpace ? 0 : layer.parallaxY,
            cull: false,
          },
        );
        if (overlay) this.patternOverlays.push(overlay);
      }
    }
  }

  update(camera: Phaser.Cameras.Scene2D.Camera): void {
    for (const view of this.views) {
      if (view.kind !== "tile") {
        continue;
      }

      view.object.tilePositionX = camera.scrollX * view.layer.parallaxX;
      view.object.tilePositionY = camera.scrollY * view.layer.parallaxY;
    }

    for (const overlay of this.patternOverlays) {
      const position = patternTilePosition(
        overlay.options.space,
        overlay.baseX,
        overlay.baseY,
        overlay.options.scale,
        overlay.options.offset,
        camera.scrollX,
        camera.scrollY,
        overlay.options.parallaxX ?? 0,
        overlay.options.parallaxY ?? 0,
      );
      overlay.sprite.setTilePosition(position.x, position.y);
    }
  }

  destroy(): void {
    for (const overlay of this.patternOverlays) {
      overlay.sprite.destroy();
    }
    this.patternOverlays.length = 0;
    for (const view of this.views) {
      view.object.destroy();
    }
    this.views.length = 0;
  }
}
