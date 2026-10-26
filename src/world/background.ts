import Phaser from "phaser";
import type { AssetsModule, ResolvedAsset } from "../assets";
import type { RoomBackgroundLayer, RoomDocument, ThemeDocument } from "../pack";
import { roomPixelHeight, roomPixelWidth } from "./simulation";
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

export class LayeredBackground {
  private readonly views: LayerView[] = [];

  constructor(
    scene: Phaser.Scene,
    room: RoomDocument,
    theme: ThemeDocument,
    assets: AssetsModule,
  ) {
    const camera = scene.cameras.main;

    for (const layer of room.background.layers) {
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
        const roomWidth = roomPixelWidth(room);
        const roomHeight = roomPixelHeight(room);
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
  }

  destroy(): void {
    for (const view of this.views) {
      view.object.destroy();
    }
    this.views.length = 0;
  }
}
