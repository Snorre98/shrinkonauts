import Phaser from "phaser";
import {
  textureKey,
  type AssetsModule,
  type PreloadPlan,
} from "../assets";
import type { RoomDocument, ThemeDocument } from "../pack";
import { LayeredBackground } from "./background";
import { PLAYER_ASSET_IDS } from "./ids";
import { KeyboardIntentSource } from "./input";
import {
  createRoomSimulation,
  roomPixelHeight,
  roomPixelWidth,
  stepRoomSimulation,
  type PlayerId,
  type RoomSimulation,
} from "./simulation";
import { resolveTexture } from "./textures";

export interface RoomSceneConfig {
  room: RoomDocument;
  theme: ThemeDocument;
  assets: AssetsModule;
  plan: PreloadPlan;
  onReady?: () => void;
  onWarning?: (message: string) => void;
  onError?: (error: Error) => void;
}

const FIXED_STEP = 1 / 60;
const MAX_FRAME_DELTA = 0.25;
const PLAYER_TEXTURE_SIZE = { width: 28, height: 44 };
const PLAYER_IDS: readonly PlayerId[] = ["p1", "p2"];

function isSvgSource(src: string): boolean {
  return src.split("?")[0]?.toLowerCase().endsWith(".svg") ?? false;
}

export class RoomScene extends Phaser.Scene {
  private simulation!: RoomSimulation;
  private intents!: KeyboardIntentSource;
  private background!: LayeredBackground;
  private readonly playerSprites: Partial<
    Record<PlayerId, Phaser.GameObjects.Image>
  > = {};
  private readonly playerShadows: Partial<
    Record<PlayerId, Phaser.GameObjects.Ellipse>
  > = {};
  private accumulator = 0;
  private started = false;

  constructor(private readonly config: RoomSceneConfig) {
    super({ key: "room" });
  }

  preload(): void {
    this.load.on(
      Phaser.Loader.Events.FILE_LOAD_ERROR,
      (file: Phaser.Loader.File) => {
        const message = `Failed to load ${file.src}; falling back to placeholder`;
        console.warn(`[shrinkonauts] ${message}`);
        this.config.onWarning?.(message);
      },
    );

    for (const asset of this.config.plan.descriptors) {
      if (!asset.src) {
        continue;
      }

      const key = textureKey(asset.id);
      if (asset.type === "sheet") {
        this.load.spritesheet(key, asset.src, {
          frameWidth: asset.frameWidth ?? 32,
          frameHeight: asset.frameHeight ?? 32,
        });
      } else if (asset.type === "audio") {
        this.load.audio(key, asset.src);
      } else if (asset.type === "font") {
        this.load.font(key, asset.src);
      } else if (isSvgSource(asset.src)) {
        this.load.svg(key, asset.src);
      } else {
        this.load.image(key, asset.src);
      }
    }
  }

  create(): void {
    try {
      this.createWorld();
      this.started = true;
      this.config.onReady?.();
    } catch (error) {
      this.config.onError?.(
        error instanceof Error ? error : new Error(String(error)),
      );
    }
  }

  update(_time: number, delta: number): void {
    if (!this.started) {
      return;
    }

    this.accumulator += Math.min(delta / 1000, MAX_FRAME_DELTA);
    let firstStep = true;

    while (this.accumulator >= FIXED_STEP) {
      const intents = this.intents.sample();
      if (!firstStep) {
        intents.p1.jump = false;
        intents.p2.jump = false;
      }
      stepRoomSimulation(this.simulation, intents, FIXED_STEP);
      this.accumulator -= FIXED_STEP;
      firstStep = false;
    }

    this.syncPlayers();
    const camera = this.cameras.main;
    camera.setScroll(this.simulation.camera.x, this.simulation.camera.y);
    this.background.update(camera);
  }

  private createWorld(): void {
    const { room, theme, assets } = this.config;

    this.simulation = createRoomSimulation(room, {
      width: this.scale.width,
      height: this.scale.height,
    });
    this.intents = new KeyboardIntentSource(this);

    const camera = this.cameras.main;
    camera.setBackgroundColor(theme.palette.bg);
    camera.setBounds(0, 0, roomPixelWidth(room), roomPixelHeight(room));
    camera.setScroll(this.simulation.camera.x, this.simulation.camera.y);

    this.background = new LayeredBackground(this, room, theme, assets);
    this.createTiles();

    for (const id of PLAYER_IDS) {
      this.createPlayer(id);
    }
  }

  private createTiles(): void {
    const { room, theme, assets } = this.config;
    const tileset = assets.image(room.tileset);
    const key = resolveTexture(this, tileset, theme.fonts.ui);
    if (!key) {
      throw new Error(
        `ROOM_TILESET_UNRESOLVED: ${room.tileset} produced no texture`,
      );
    }

    for (const [rowIndex, row] of room.layers.tiles.entries()) {
      for (const [columnIndex, tile] of [...row].entries()) {
        if (tile !== "#") {
          continue;
        }

        this.add
          .image(
            columnIndex * room.tileSize + room.tileSize / 2,
            rowIndex * room.tileSize + room.tileSize / 2,
            key,
          )
          .setDisplaySize(room.tileSize, room.tileSize)
          .setDepth(0);
      }
    }
  }

  private createPlayer(id: PlayerId): void {
    const { theme, assets } = this.config;
    const asset = assets.sprite(PLAYER_ASSET_IDS[id]);
    const key = resolveTexture(this, asset, theme.fonts.ui);
    if (!key) {
      throw new Error(
        `PLAYER_SPRITE_UNRESOLVED: ${PLAYER_ASSET_IDS[id]} produced no texture`,
      );
    }

    const player = this.simulation.players[id];

    const shadow = this.add
      .ellipse(
        player.x,
        player.y,
        PLAYER_TEXTURE_SIZE.width * 0.9,
        7,
        0x000000,
        0.32,
      )
      .setOrigin(0.5, 0.5)
      .setDepth(9);

    const sprite = this.add
      .image(player.x, player.y, key)
      .setOrigin(0.5, 1)
      .setDisplaySize(PLAYER_TEXTURE_SIZE.width, PLAYER_TEXTURE_SIZE.height)
      .setDepth(10);

    this.playerShadows[id] = shadow;
    this.playerSprites[id] = sprite;
  }

  private syncPlayers(): void {
    for (const id of PLAYER_IDS) {
      const player = this.simulation.players[id];
      const sprite = this.playerSprites[id];
      const shadow = this.playerShadows[id];

      if (sprite) {
        sprite.setPosition(player.x, player.y);
        sprite.setFlipX(player.facing === -1);
      }

      if (shadow) {
        shadow.setPosition(player.x, player.y - 1);
        shadow.setScale(
          player.onGround ? 1 : 0.75,
          player.onGround ? 1 : 0.6,
        );
        shadow.setAlpha(player.onGround ? 0.32 : 0.18);
      }
    }
  }
}
