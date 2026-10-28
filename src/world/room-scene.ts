import Phaser from "phaser";
import {
  inferCategory,
  textureKey,
  type AssetsModule,
  type PreloadPlan,
} from "../assets";
import type { RoomDocument, ThemeDocument } from "../pack";
import { LayeredBackground } from "./background";
import { PLAYER_ASSET_IDS } from "./ids";
import { KeyboardIntentSource } from "./input";
import { RoomEffectLayer } from "./effects";
import {
  emptyPlayerUiActions,
  emptyRuntimeInput,
  type RuntimeInput,
  type TileVisualOp,
  type TileVisualPort,
  type WorldEffectPlan,
  type WorldEffectPort,
  type WorldRuntime,
} from "./runtime-port";
import {
  PLAYER_HEIGHT,
  PLAYER_WIDTH,
  roomPixelHeight,
  roomPixelWidth,
  type GameplayCue,
  type PlayerId,
  type RoomSimulation,
} from "./simulation";
import {
  createTileVisualState,
  type TileKey,
  type TileVisualState,
} from "./tile-visuals";
import { resolveTexture } from "./textures";

export interface RoomSceneConfig {
  runtime: WorldRuntime;
  theme: ThemeDocument;
  assets: AssetsModule;
  plan: PreloadPlan;
  onReady?: () => void;
  onWarning?: (message: string) => void;
  onError?: (error: Error) => void;
  /** Semantic gameplay cues are still exposed for debug overlays/tests. */
  onCue?: (cue: GameplayCue | string) => void;
  /** Lets the platform suppress gameplay keys while a form field has focus. */
  shouldIgnoreInput?: () => boolean;
  /** Narrow accessibility seam; the scene never reads save/UI state itself. */
  isReducedMotion?: () => boolean;
}

const FIXED_STEP = 1 / 60;
const MAX_FRAME_DELTA = 0.25;
const PLAYER_IDS: readonly PlayerId[] = ["p1", "p2"];
const ENTITY_SIZE = 36;

function isSvgSource(src: string): boolean {
  return src.split("?")[0]?.toLowerCase().endsWith(".svg") ?? false;
}

function colorNumber(value: string): number {
  const parsed = Number.parseInt(value.replace(/^#/, ""), 16);
  return Number.isFinite(parsed) ? parsed : 0xffffff;
}

function emptyActions(input: RuntimeInput): RuntimeInput {
  return {
    intents: {
      p1: { ...input.intents.p1, jump: false, dash: false },
      p2: { ...input.intents.p2, jump: false, dash: false },
    },
    actions: {
      p1: {
        interact: false,
        scan: false,
        pulse: false,
        carry: false,
        throw: false,
        ui: emptyPlayerUiActions(),
      },
      p2: {
        interact: false,
        scan: false,
        pulse: false,
        carry: false,
        throw: false,
        ui: emptyPlayerUiActions(),
      },
      map: false,
      log: false,
      pause: false,
      mute: false,
      toggleP2: false,
    },
  };
}

export class RoomScene
  extends Phaser.Scene
  implements WorldEffectPort, TileVisualPort
{
  private intents!: KeyboardIntentSource;
  private background!: LayeredBackground;
  private readonly playerSprites: Partial<
    Record<PlayerId, Phaser.GameObjects.Image>
  > = {};
  private readonly playerShadows: Partial<
    Record<PlayerId, Phaser.GameObjects.Ellipse>
  > = {};
  private readonly entitySprites = new Map<string, Phaser.GameObjects.Image>();
  private readonly entityGlows = new Map<string, Phaser.GameObjects.Ellipse>();
  private readonly propSprites = new Map<string, Phaser.GameObjects.Image>();
  private readonly tileImages = new Map<string, Phaser.GameObjects.Image>();
  private readonly tileBase = new Map<
    string,
    { textureKey: string; tint: number; alpha: number }
  >();
  private readonly tileOverlays = new Map<string, Phaser.GameObjects.Image>();
  private tileVisuals: TileVisualState = createTileVisualState();
  private effectLayer: RoomEffectLayer | null = null;
  private lastReducedMotion = false;
  private accumulator = 0;
  private started = false;
  /**
   * A rendered frame can arrive without a fixed step (for example on a
   * 120 Hz display). Hold the sampled input until a step actually consumes it
   * so taps are never silently dropped.
   */
  private pendingInput: RuntimeInput | null = null;

  constructor(private readonly config: RoomSceneConfig) {
    super({ key: "room" });
  }

  private get simulation(): RoomSimulation {
    return this.config.runtime.simulation;
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
      this.started = false;
      this.accumulator = 0;
      this.pendingInput = null;
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

    if (this.config.shouldIgnoreInput?.() === true) {
      this.intents.discard();
      this.pendingInput = null;
    } else if (!this.pendingInput) {
      this.pendingInput = this.intents.sample();
    }

    const held = this.pendingInput;
    let stepped = false;

    while (this.accumulator >= FIXED_STEP) {
      const input = held
        ? stepped
          ? emptyActions(held)
          : held
        : emptyRuntimeInput();
      const cues = this.config.runtime.step(FIXED_STEP, input);
      for (const cue of cues) {
        this.config.onCue?.(cue);
      }
      this.accumulator -= FIXED_STEP;
      stepped = true;
    }

    if (held && stepped) {
      this.pendingInput = null;
    }

    this.applyInteractionHighlight(this.config.runtime.interactionId());
    this.syncPlayers();
    const camera = this.cameras.main;
    camera.setScroll(this.simulation.camera.x, this.simulation.camera.y);
    this.background.update(camera);

    const reduced = this.config.isReducedMotion?.() ?? false;
    if (reduced !== this.lastReducedMotion) {
      this.lastReducedMotion = reduced;
      this.effectLayer?.clear();
    }
    this.syncEffects();
  }

  private syncEffects(): void {
    this.effectLayer?.sync(this.config.runtime.drainEffects());
  }

  /** Structural `WorldEffectPort` method. */
  spawn(plan: WorldEffectPlan): string {
    return this.effectLayer?.spawn(plan) ?? plan.id;
  }

  /** Structural `WorldEffectPort` method. */
  cancel(effectId: string): void {
    this.effectLayer?.cancel(effectId);
  }

  /** Structural `TileVisualPort` method. */
  apply(op: TileVisualOp): string {
    const opId = this.tileVisuals.apply(op);
    this.renderTileOp(opId);
    return opId;
  }

  /** Structural `TileVisualPort` method. */
  revert(opId: string): void {
    const record = this.tileVisuals.record(opId);
    this.tileVisuals.revert(opId);
    for (const tile of record?.tiles ?? []) this.renderTile(tile);
  }

  private createWorld(): void {
    const { runtime, theme, assets } = this.config;
    const room = runtime.roomDocument;

    for (const id of PLAYER_IDS) {
      delete this.playerSprites[id];
      delete this.playerShadows[id];
    }
    this.effectLayer?.destroy();
    this.effectLayer = null;
    this.entitySprites.clear();
    this.entityGlows.clear();
    this.propSprites.clear();
    this.tileImages.clear();
    this.tileBase.clear();
    for (const overlay of this.tileOverlays.values()) overlay.destroy();
    this.tileOverlays.clear();
    this.tileVisuals = createTileVisualState();
    this.lastReducedMotion = this.config.isReducedMotion?.() ?? false;

    runtime.resize(this.scale.width, this.scale.height);
    this.intents = new KeyboardIntentSource(this);

    const camera = this.cameras.main;
    camera.setBackgroundColor(theme.palette.bg);
    camera.setBounds(0, 0, roomPixelWidth(room), roomPixelHeight(room));
    camera.setScroll(this.simulation.camera.x, this.simulation.camera.y);

    this.background = new LayeredBackground(this, room, theme, assets);
    this.createTiles();
    this.createEntities(room);

    for (const id of PLAYER_IDS) {
      this.createPlayer(id);
    }

    this.effectLayer = new RoomEffectLayer({
      scene: this,
      room,
      simulation: this.simulation,
      assets,
      theme,
      tilePort: this,
      entitySprites: this.entitySprites,
      propSprites: this.propSprites,
      playerSprites: this.playerSprites,
      isReducedMotion: () => this.config.isReducedMotion?.() ?? false,
    });
  }

  private createTiles(): void {
    const { theme, assets } = this.config;
    const room = this.config.runtime.roomDocument;
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

        const image = this.add
          .image(
            columnIndex * room.tileSize + room.tileSize / 2,
            rowIndex * room.tileSize + room.tileSize / 2,
            key,
          )
          .setDisplaySize(room.tileSize, room.tileSize)
          .setDepth(0);
        const tileKey = `tiles/${columnIndex}/${rowIndex}`;
        this.tileImages.set(tileKey, image);
        this.tileBase.set(tileKey, {
          textureKey: image.texture.key,
          tint: image.tintTopLeft,
          alpha: image.alpha,
        });
      }
    }
  }

  private renderTileOp(opId: string): void {
    const record = this.tileVisuals.record(opId);
    if (!record) return;
    for (const tile of record.tiles) this.renderTile(tile);
  }

  private renderTile(tile: TileKey): void {
    const key = `${tile.layer}/${tile.x}/${tile.y}`;
    const image = this.tileImages.get(key);
    const base = this.tileBase.get(key);
    if (!image || !base) return;

    const existingOverlay = this.tileOverlays.get(key);
    if (existingOverlay) {
      existingOverlay.destroy();
      this.tileOverlays.delete(key);
    }

    image.setTexture(base.textureKey);
    image.setTint(base.tint);
    image.setAlpha(base.alpha);

    const value = this.tileVisuals.valueAt(tile.layer, tile.x, tile.y);
    if (!value) return;

    switch (value.kind) {
      case "swap": {
        const texture = this.assetTexture(value.tile);
        if (texture) image.setTexture(texture);
        break;
      }
      case "tint":
        image.setTint(colorNumber(value.color));
        break;
      case "alpha":
        image.setAlpha(Math.max(0, Math.min(1, value.alpha)));
        break;
      case "overlay": {
        const texture = this.assetTexture(value.assetId);
        if (!texture) break;
        const overlay = this.add
          .image(image.x, image.y, texture)
          .setDisplaySize(
            this.config.runtime.roomDocument.tileSize,
            this.config.runtime.roomDocument.tileSize,
          )
          .setDepth(image.depth + 0.5);
        this.tileOverlays.set(key, overlay);
        break;
      }
      case "sequence": {
        const frame = value.frames[0];
        const texture = frame ? this.assetTexture(frame) : null;
        if (texture) image.setTexture(texture);
        break;
      }
    }
  }

  private assetTexture(assetId: string): string | null {
    const asset = this.config.assets.resolveById(assetId);
    if (!asset) return null;
    return resolveTexture(this, asset, this.config.theme.fonts.ui);
  }

  private createEntities(room: RoomDocument): void {
    const { theme, assets } = this.config;

    for (const entity of room.entities ?? []) {
      if (!entity.sprite) continue;
      const category = inferCategory(entity.sprite);
      if (category !== "sprite" && category !== "image") continue;

      const asset =
        category === "sprite"
          ? assets.sprite(entity.sprite)
          : assets.image(entity.sprite);
      const key = resolveTexture(this, asset, theme.fonts.ui);
      if (!key) {
        this.config.onWarning?.(
          `ENTITY_TEXTURE_UNRESOLVED: ${entity.id} (${entity.sprite})`,
        );
        continue;
      }

      const x = (entity.x + 0.5) * room.tileSize;
      const y = entity.y * room.tileSize;
      const depth = 4 + entity.y / 100;

      const glow = this.add
        .ellipse(x, y - 4, ENTITY_SIZE * 1.25, 10, 0xffd166, 0)
        .setDepth(depth - 0.5);
      const sprite = this.add
        .image(x, y, key)
        .setOrigin(0.5, 1)
        .setDisplaySize(ENTITY_SIZE, ENTITY_SIZE)
        .setDepth(depth);

      this.entityGlows.set(entity.id, glow);
      this.entitySprites.set(entity.id, sprite);
      if (entity.type === "prop") {
        this.propSprites.set(entity.id, sprite);
      }
    }
  }

  private applyInteractionHighlight(entityId: string | null): void {
    for (const [id, glow] of this.entityGlows) {
      glow.setFillStyle(0xffd166, id === entityId ? 0.45 : 0);
    }
    for (const [id, sprite] of this.entitySprites) {
      if (id === entityId) {
        sprite.setTint(0xffe08a);
      } else {
        sprite.clearTint();
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
        PLAYER_WIDTH * 0.9,
        7,
        0x000000,
        0.32,
      )
      .setOrigin(0.5, 0.5)
      .setDepth(9);

    const sprite = this.add
      .image(player.x, player.y, key)
      .setOrigin(0.5, 1)
      .setDisplaySize(PLAYER_WIDTH, PLAYER_HEIGHT)
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
        sprite.setVisible(player.active);
        sprite.setAlpha(player.dashTime > 0 ? 0.72 : 1);
      }

      if (shadow) {
        shadow.setPosition(player.x, player.y - 1);
        shadow.setVisible(player.active);
        shadow.setScale(
          player.onGround ? 1 : 0.75,
          player.onGround ? 1 : 0.6,
        );
        shadow.setAlpha(player.onGround ? 0.32 : 0.18);
      }
    }

    for (const [id, sprite] of this.propSprites) {
      const prop = this.simulation.props[id];
      if (!prop) continue;
      sprite.setPosition(prop.x, prop.y + prop.height / 2);
      sprite.setVisible(prop.state !== "cleared");
    }
  }
}
