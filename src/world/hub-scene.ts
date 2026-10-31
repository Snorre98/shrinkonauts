import Phaser from "phaser";
import {
  textureKey,
  type AssetsModule,
  type PreloadPlan,
  type ResolvedAsset,
} from "../assets";
import type { ThemeDocument } from "../pack";
import type { HubDocument, HubRect } from "../hub";
import { LayeredBackground } from "./background";

export interface HubSceneConfig {
  hub: HubDocument;
  theme: ThemeDocument;
  assets: AssetsModule;
  plan: PreloadPlan;
  onReady?: () => void;
  onWarning?: (message: string) => void;
  onError?: (error: Error) => void;
  onCue?: (cue: string) => void;
  isReducedMotion?: () => boolean;
}

export interface HubLaunchOptions {
  mode: "solo" | "local";
  reducedMotion: boolean;
}

export interface HubSelectionView {
  packId: string | null;
  mode: "solo" | "local" | "online";
}

function colorNumber(value: string): number {
  const parsed = Number.parseInt(value.replace(/^#/, ""), 16);
  return Number.isFinite(parsed) ? parsed : 0xffffff;
}

function mixColor(left: string, right: string, amount: number): number {
  const a = colorNumber(left);
  const b = colorNumber(right);
  const t = Math.max(0, Math.min(1, amount));
  const ar = (a >> 16) & 0xff;
  const ag = (a >> 8) & 0xff;
  const ab = a & 0xff;
  const br = (b >> 16) & 0xff;
  const bg = (b >> 8) & 0xff;
  const bb = b & 0xff;
  const r = Math.round(ar + (br - ar) * t);
  const g = Math.round(ag + (bg - ag) * t);
  const bl = Math.round(ab + (bb - ab) * t);
  return (r << 16) | (g << 8) | bl;
}

function isFinalAsset(asset: ResolvedAsset): boolean {
  return asset.source !== "placeholder" && typeof asset.src === "string" && asset.src.length > 0;
}

export class HubScene extends Phaser.Scene {
  private player: Phaser.GameObjects.Container | Phaser.GameObjects.Image | null = null;
  private tinyAstronaut: Phaser.GameObjects.Container | Phaser.GameObjects.Image | null = null;
  private door: Phaser.GameObjects.Arc | Phaser.GameObjects.Image | null = null;
  private drum: Phaser.GameObjects.Container | Phaser.GameObjects.Image | null = null;
  private screenGlow: Phaser.GameObjects.Rectangle | null = null;
  private screenLabel: Phaser.GameObjects.Text | null = null;
  private launchSkip: (() => void) | null = null;
  private launchSkipped = false;

  constructor(private readonly config: HubSceneConfig) {
    super({ key: "hub" });
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
      if (!asset.src || asset.type === "audio" || asset.type === "font") {
        continue;
      }
      this.load.image(textureKey(asset.id), asset.src);
    }
  }

  create(): void {
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.shutdown, this);
    try {
      const { theme, hub } = this.config;
      this.cameras.main.setBackgroundColor(colorNumber(theme.palette.bg));
      this.cameras.main.setBounds(0, 0, hub.width, hub.height);

      const hasFinalBackground = hub.background.layers.some((layer) =>
        isFinalAsset(this.config.assets.image(layer.assetId)),
      );
      if (hasFinalBackground) {
        new LayeredBackground(
          this,
          hub.background.layers,
          hub.width,
          hub.height,
          theme,
          this.config.assets,
        );
      } else {
        this.drawBathroomPlaceholder();
      }

      this.drawMachine();
      this.createPlayer();
      this.createTinyAstronaut();
      this.createAmbientMotion();
      this.config.onReady?.();
    } catch (error) {
      this.config.onError?.(
        error instanceof Error ? error : new Error(String(error)),
      );
    }
  }

  getScreenRect(): HubRect {
    return { ...this.config.hub.machine.screen };
  }

  /**
   * Pause/resume hub-only ambient tweens. The gameplay reduced-motion path is
   * separate; this keeps the bathroom consistent when the setting changes
   * before a cycle starts.
   */
  setReducedMotion(reduced: boolean): void {
    if (reduced) {
      this.tweens.pauseAll();
    } else {
      this.tweens.resumeAll();
    }
  }

  setSelection(selection: HubSelectionView): void {
    const anatomy = selection.packId !== "silicon-reflex";
    const accent = anatomy
      ? this.config.theme.palette.joint
      : this.config.theme.palette.nerve;
    this.screenGlow?.setFillStyle(colorNumber(accent), 0.16);
    if (this.screenLabel) {
      this.screenLabel.setText(
        selection.packId === null
          ? "LOAD A CYCLE"
          : selection.packId === "silicon-reflex"
            ? "SILICON CYCLE"
            : "ANATOMY CYCLE",
      );
      this.screenLabel.setColor(accent);
    }
  }

  skipLaunch(): void {
    if (!this.launchSkip) return;
    this.launchSkipped = true;
    this.tweens.killAll();
    const skip = this.launchSkip;
    this.launchSkip = null;
    skip();
  }

  async playLaunch(options: HubLaunchOptions): Promise<void> {
    const { hub } = this.config;
    const cue = (name: keyof typeof hub.audio): void => {
      const cueId = hub.audio[name];
      if (cueId) this.config.onCue?.(cueId);
    };

    const skipPromise = new Promise<void>((resolve) => {
      this.launchSkip = () => resolve();
    });
    this.launchSkipped = false;

    const wait = async (ms: number): Promise<void> => {
      await Promise.race([
        new Promise<void>((resolve) => {
          this.time.delayedCall(ms, resolve);
        }),
        skipPromise,
      ]);
    };

    const tween = async (
      config: Phaser.Types.Tweens.TweenBuilderConfig,
    ): Promise<void> => {
      await Promise.race([
        new Promise<void>((resolve) => {
          this.tweens.add({ ...config, onComplete: () => resolve() });
        }),
        skipPromise,
      ]);
    };

    try {
      const startedAt = performance.now();
      if (options.reducedMotion) {
        cue("shrink");
        await wait(hub.intro.reducedMotionMs);
        this.finishLaunchVisual();
        cue("arrive");
        return;
      }

      cue("door");
      if (this.door) {
        await tween({
          targets: this.door,
          alpha: 0.15,
          scaleX: 1.08,
          scaleY: 1.08,
          duration: 420,
          ease: "Sine.easeOut",
        });
      }
      if (this.launchSkipped) return;

      if (this.player) {
        await tween({
          targets: this.player,
          x: hub.player.entry.x,
          y: hub.player.entry.y,
          duration: 900,
          ease: "Sine.easeInOut",
        });
      }
      if (this.launchSkipped) return;

      if (this.player) {
        await tween({
          targets: this.player,
          alpha: 0,
          scaleX: 0.65,
          scaleY: 0.65,
          duration: 360,
          ease: "Sine.easeIn",
        });
        this.player.setVisible(false);
      }
      if (this.launchSkipped) return;

      cue("spin");
      this.cameras.main.shake(420, 0.0025);
      if (this.drum) {
        await tween({
          targets: this.drum,
          angle: 1080,
          duration: 1500,
          ease: "Cubic.easeInOut",
        });
      } else {
        await wait(1500);
      }
      if (this.launchSkipped) return;

      cue("shrink");
      this.cameras.main.flash(260, 122, 223, 242, false);
      await wait(280);
      if (this.launchSkipped) return;

      this.finishLaunchVisual();
      cue("arrive");
      if (this.tinyAstronaut) {
        this.tinyAstronaut.setVisible(true).setAlpha(1);
        await tween({
          targets: this.tinyAstronaut,
          x: hub.player.exit.x,
          y: hub.player.exit.y,
          duration: 900,
          ease: "Sine.easeOut",
        });
      } else {
        await wait(900);
      }
      const remaining = hub.intro.minDurationMs - (performance.now() - startedAt);
      if (remaining > 0) await wait(remaining);
    } finally {
      this.launchSkip = null;
    }
  }

  private finishLaunchVisual(): void {
    this.player?.setVisible(false);
    if (this.tinyAstronaut) {
      this.tinyAstronaut
        .setVisible(true)
        .setAlpha(1)
        .setPosition(
          this.config.hub.player.exit.x,
          this.config.hub.player.exit.y,
        )
        .setScale(this.tinyScale());
    }
    this.door?.setAlpha(0.15);
    this.screenGlow?.setFillStyle(
      colorNumber(this.config.theme.palette.nerve),
      0.24,
    );
  }

  private tinyScale(): number {
    const tiny = this.config.hub.player.tinyScale;
    return this.tinyAstronaut instanceof Phaser.GameObjects.Image
      ? tiny
      : 1;
  }

  private drawBathroomPlaceholder(): void {
    const { theme, hub } = this.config;
    const wall = mixColor(theme.palette.bg, theme.palette.boneShadow, 0.34);
    const wallDark = mixColor(theme.palette.bg, theme.palette.boneShadow, 0.18);
    const floor = mixColor(theme.palette.bg, theme.palette.bone, 0.16);
    const ink = mixColor(theme.palette.bg, "#000000", 0.35);

    this.add.rectangle(0, 0, hub.width, 520, wall).setOrigin(0, 0).setDepth(-5);
    this.add.rectangle(0, 520, hub.width, 200, floor).setOrigin(0, 0).setDepth(-4);

    const tiles = this.add.graphics().setDepth(-3);
    tiles.lineStyle(2, wallDark, 0.7);
    for (let x = 0; x <= hub.width; x += 64) {
      tiles.lineBetween(x, 0, x, 520);
    }
    for (let y = 0; y <= 520; y += 64) {
      tiles.lineBetween(0, y, hub.width, y);
    }
    tiles.lineStyle(2, ink, 0.28);
    tiles.lineBetween(0, 520, hub.width, 520);
    tiles.lineStyle(1, ink, 0.2);
    for (let y = 552; y < hub.height; y += 42) {
      tiles.lineBetween(0, y, hub.width, y);
    }
    for (let x = 0; x < hub.width; x += 96) {
      tiles.lineBetween(x, 520, x, hub.height);
    }

    // Mirror and sink on the left.
    this.add
      .rectangle(170, 250, 230, 300, mixColor(theme.palette.bone, theme.palette.bg, 0.42))
      .setStrokeStyle(8, colorNumber(theme.palette.boneShadow))
      .setDepth(-2);
    this.add
      .rectangle(170, 250, 190, 255, mixColor(theme.palette.joint, theme.palette.bg, 0.65))
      .setDepth(-2);
    this.add
      .rectangle(170, 250, 190, 255, colorNumber(theme.palette.bone), 0.08)
      .setDepth(-2);
    this.add
      .rectangle(80, 470, 260, 46, mixColor(theme.palette.bone, theme.palette.bg, 0.25))
      .setStrokeStyle(4, colorNumber(theme.palette.boneShadow))
      .setDepth(-2);
    this.add
      .ellipse(80, 465, 260, 56, mixColor(theme.palette.bg, theme.palette.bone, 0.12))
      .setStrokeStyle(3, colorNumber(theme.palette.boneShadow))
      .setDepth(-1);
    this.add
      .rectangle(80, 440, 18, 50, colorNumber(theme.palette.boneShadow))
      .setDepth(-1);
    this.add
      .circle(80, 424, 12, colorNumber(theme.palette.boneShadow))
      .setDepth(-1);

    // Shelf and bottles.
    this.add
      .rectangle(440, 170, 180, 14, colorNumber(theme.palette.boneShadow))
      .setDepth(-1);
    for (const [x, color, width, height] of [
      [400, theme.palette.nerve, 22, 56],
      [432, theme.palette.joint, 28, 74],
      [468, theme.palette.muscle, 20, 48],
    ] as const) {
      this.add
        .rectangle(x, 170 - height / 2, width, height, colorNumber(color))
        .setStrokeStyle(3, ink)
        .setDepth(-1);
      this.add
        .rectangle(x, 170 - height - 6, width * 0.45, 10, colorNumber(theme.palette.bone))
        .setDepth(-1);
    }

    // Laundry basket and bath mat.
    this.add
      .rectangle(350, 635, 150, 100, mixColor(theme.palette.boneShadow, theme.palette.bg, 0.35))
      .setStrokeStyle(4, ink)
      .setDepth(1);
    this.add
      .rectangle(350, 590, 160, 16, mixColor(theme.palette.bone, theme.palette.bg, 0.4))
      .setStrokeStyle(3, ink)
      .setDepth(1);
    this.add
      .ellipse(620, 690, 300, 42, mixColor(theme.palette.joint, theme.palette.bg, 0.58), 0.9)
      .setDepth(0);
    this.add
      .ellipse(620, 690, 260, 30, mixColor(theme.palette.bone, theme.palette.bg, 0.4), 0.6)
      .setDepth(0);

    // A small poster nods at the body-horror cartoon tone without relying on art.
    this.add
      .rectangle(760, 210, 120, 170, mixColor(theme.palette.nerve, theme.palette.bg, 0.72))
      .setStrokeStyle(5, ink)
      .setDepth(-1)
      .setAngle(-3);
    this.add
      .text(760, 210, "STAY\nSMALL", {
        fontFamily: this.config.theme.fonts.display,
        fontSize: "18px",
        color: this.config.theme.palette.bg,
        align: "center",
        fontStyle: "bold",
      })
      .setOrigin(0.5)
      .setDepth(-1)
      .setAngle(-3);
  }

  private drawMachine(): void {
    const { hub, theme, assets } = this.config;
    const x = hub.machine.x;
    const y = hub.machine.y;
    const scale = hub.machine.scale;
    const bodyAsset = assets.sprite(hub.machine.body);
    const doorAsset = assets.sprite(hub.machine.door);
    const drumAsset = assets.sprite(hub.machine.drum);
    const ink = colorNumber(theme.palette.bg);
    const metal = mixColor(theme.palette.bone, theme.palette.bg, 0.3);

    if (isFinalAsset(bodyAsset)) {
      this.add
        .image(x, y, textureKey(bodyAsset.id))
        .setOrigin(0.5, 1)
        .setScale(scale)
        .setDepth(2);
    } else {
      const body = this.add.graphics().setDepth(2);
      body.fillStyle(metal, 1);
      body.lineStyle(6, ink, 1);
      body.fillRoundedRect(x - 175, y - 400, 350, 400, 30);
      body.strokeRoundedRect(x - 175, y - 400, 350, 400, 30);
      body.fillStyle(mixColor(theme.palette.bone, theme.palette.bg, 0.55), 1);
      body.fillRoundedRect(x - 158, y - 382, 316, 90, 18);
      body.lineStyle(4, ink, 0.7);
      body.strokeRoundedRect(x - 158, y - 382, 316, 90, 18);
      body.fillStyle(mixColor(theme.palette.bg, theme.palette.bone, 0.12), 1);
      body.fillRoundedRect(x - 158, y - 280, 316, 255, 22);
      body.lineStyle(4, ink, 0.7);
      body.strokeRoundedRect(x - 158, y - 280, 316, 255, 22);
      body.fillStyle(mixColor(theme.palette.boneShadow, theme.palette.bg, 0.2), 1);
      body.fillRoundedRect(x - 120, y - 110, 240, 45, 16);
      body.lineStyle(3, ink, 0.6);
      body.strokeRoundedRect(x - 120, y - 110, 240, 45, 16);
    }

    const doorRadius = 108 * scale;
    if (isFinalAsset(doorAsset)) {
      this.door = this.add
        .image(hub.machine.doorAnchor.x, hub.machine.doorAnchor.y, textureKey(doorAsset.id))
        .setDepth(4)
        .setScale(scale);
    } else {
      this.door = this.add
        .circle(
          hub.machine.doorAnchor.x,
          hub.machine.doorAnchor.y,
          doorRadius,
          mixColor(theme.palette.joint, theme.palette.bg, 0.55),
          0.9,
        )
        .setStrokeStyle(10, ink)
        .setDepth(4);
    }

    if (isFinalAsset(drumAsset)) {
      this.drum = this.add
        .image(hub.machine.drumAnchor.x, hub.machine.drumAnchor.y, textureKey(drumAsset.id))
        .setDepth(3)
        .setScale(scale);
    } else {
      const drum = this.add
        .container(hub.machine.drumAnchor.x, hub.machine.drumAnchor.y)
        .setDepth(3);
      const outer = this.add
        .circle(
          0,
          0,
          doorRadius * 0.78,
          mixColor(theme.palette.bg, theme.palette.bone, 0.06),
          1,
        )
        .setStrokeStyle(5, ink);
      const inner = this.add
        .circle(
          0,
          0,
          doorRadius * 0.62,
          mixColor(theme.palette.joint, theme.palette.bg, 0.8),
          0.3,
        );
      const spokes: Phaser.GameObjects.Rectangle[] = [];
      for (const angle of [0, 120, 240]) {
        const spoke = this.add
          .rectangle(
            0,
            0,
            doorRadius * 0.55,
            4,
            mixColor(theme.palette.joint, theme.palette.bg, 0.45),
            0.7,
          )
          .setOrigin(0, 0.5)
          .setRotation((angle * Math.PI) / 180);
        spokes.push(spoke);
      }
      drum.add([outer, inner, ...spokes]);
      this.drum = drum;
    }

    this.screenGlow = this.add
      .rectangle(
        hub.machine.screen.x + hub.machine.screen.width / 2,
        hub.machine.screen.y + hub.machine.screen.height / 2,
        hub.machine.screen.width,
        hub.machine.screen.height,
        colorNumber(theme.palette.joint),
        0.16,
      )
      .setStrokeStyle(3, colorNumber(theme.palette.joint), 0.5)
      .setDepth(3);

    this.screenLabel = this.add
      .text(
        hub.machine.screen.x + 14,
        hub.machine.screen.y + hub.machine.screen.height / 2,
        "LOAD A CYCLE",
        {
          fontFamily: theme.fonts.ui,
          fontSize: "12px",
          color: theme.palette.joint,
          fontStyle: "bold",
          letterSpacing: 1,
        },
      )
      .setOrigin(0, 0.5)
      .setDepth(6);

    this.add
      .text(x, y - 430, "SHRINK-O-MATIC", {
        fontFamily: theme.fonts.display,
        fontSize: "22px",
        color: theme.palette.bone,
        fontStyle: "bold",
        letterSpacing: 2,
      })
      .setOrigin(0.5)
      .setDepth(6);

    // Start button beside the cycle display, plus a small vent.
    this.add
      .circle(x + 115, y - 350, 22, colorNumber(theme.palette.muscle))
      .setStrokeStyle(5, ink)
      .setDepth(5);
    this.add
      .circle(x + 115, y - 350, 12, colorNumber(theme.palette.nerve))
      .setDepth(5);
    this.add
      .rectangle(x + 85, y - 300, 60, 18, colorNumber(theme.palette.boneShadow))
      .setStrokeStyle(3, ink)
      .setDepth(5);

    // Pipework gives the machine a silhouette even when the panel covers it.
    const pipes = this.add.graphics().setDepth(1);
    pipes.lineStyle(12, mixColor(theme.palette.boneShadow, theme.palette.bg, 0.4), 1);
    pipes.lineBetween(x + 175, y - 350, x + 230, y - 350);
    pipes.lineBetween(x + 230, y - 350, x + 230, y - 70);
  }

  private createPlayer(): void {
    const { hub, theme, assets } = this.config;
    const asset = assets.sprite(hub.player.civilian);
    const idle = hub.player.idle;
    if (isFinalAsset(asset)) {
      const image = this.add
        .image(idle.x, idle.y, textureKey(asset.id))
        .setOrigin(0.5, 1)
        .setScale(hub.player.scale)
        .setDepth(8);
      this.player = image;
    } else {
      const container = this.add.container(idle.x, idle.y).setDepth(8);
      const ink = colorNumber(theme.palette.bg);
      const skin = mixColor(theme.palette.bone, theme.palette.muscle, 0.16);
      const shirt = mixColor(theme.palette.joint, theme.palette.bg, 0.2);
      const trousers = mixColor(theme.palette.bg, theme.palette.boneShadow, 0.34);
      const head = this.add.circle(0, -120, 34, skin).setStrokeStyle(5, ink);
      const hair = this.add
        .arc(0, -128, 34, 180, 360, false, mixColor(theme.palette.bg, "#000000", 0.2))
        .setStrokeStyle(4, ink);
      const torso = this.add
        .rectangle(0, -64, 58, 86, shirt)
        .setStrokeStyle(5, ink);
      const leftLeg = this.add
        .rectangle(-15, -10, 20, 58, trousers)
        .setStrokeStyle(4, ink);
      const rightLeg = this.add
        .rectangle(16, -10, 20, 58, trousers)
        .setStrokeStyle(4, ink);
      const leftArm = this.add
        .rectangle(-38, -70, 16, 64, shirt)
        .setStrokeStyle(4, ink);
      const rightArm = this.add
        .rectangle(38, -70, 16, 64, shirt)
        .setStrokeStyle(4, ink);
      const shoeLeft = this.add
        .ellipse(-17, 22, 28, 14, ink)
        .setStrokeStyle(3, ink);
      const shoeRight = this.add
        .ellipse(18, 22, 28, 14, ink)
        .setStrokeStyle(3, ink);
      container.add([
        leftArm,
        rightArm,
        leftLeg,
        rightLeg,
        shoeLeft,
        shoeRight,
        torso,
        head,
        hair,
      ]);
      this.player = container;
      this.tweens.add({
        targets: container,
        y: idle.y - 3,
        duration: 1800,
        yoyo: true,
        repeat: -1,
        ease: "Sine.easeInOut",
      });
    }
  }

  private createTinyAstronaut(): void {
    const { hub, theme, assets } = this.config;
    const asset = assets.sprite(hub.player.astronaut);
    const exit = hub.player.exit;
    if (isFinalAsset(asset)) {
      this.tinyAstronaut = this.add
        .image(exit.x, exit.y, textureKey(asset.id))
        .setOrigin(0.5, 1)
        .setScale(hub.player.tinyScale)
        .setAlpha(0)
        .setVisible(false)
        .setDepth(9);
      return;
    }

    const container = this.add
      .container(exit.x, exit.y)
      .setScale(hub.player.tinyScale)
      .setAlpha(0)
      .setVisible(false)
      .setDepth(9);
    const ink = colorNumber(theme.palette.bg);
    const suit = mixColor(theme.palette.bone, theme.palette.joint, 0.12);
    const helmet = this.add.circle(0, -110, 28, suit).setStrokeStyle(5, ink);
    const visor = this.add
      .circle(0, -110, 18, mixColor(theme.palette.nerve, theme.palette.bg, 0.2))
      .setStrokeStyle(3, ink);
    const torso = this.add
      .rectangle(0, -62, 52, 74, suit)
      .setStrokeStyle(5, ink);
    const pack = this.add
      .rectangle(0, -62, 22, 50, colorNumber(theme.palette.nerve))
      .setStrokeStyle(3, ink);
    const chest = this.add
      .circle(0, -70, 8, colorNumber(theme.palette.joint))
      .setStrokeStyle(2, ink);
    const leftLeg = this.add
      .rectangle(-14, -8, 18, 46, suit)
      .setStrokeStyle(4, ink);
    const rightLeg = this.add
      .rectangle(15, -8, 18, 46, suit)
      .setStrokeStyle(4, ink);
    container.add([
      pack,
      leftLeg,
      rightLeg,
      torso,
      chest,
      helmet,
      visor,
    ]);
    this.tinyAstronaut = container;
  }

  private createAmbientMotion(): void {
    const { theme } = this.config;
    const reduced = this.config.isReducedMotion?.() ?? false;
    if (reduced) return;

    for (let index = 0; index < 9; index += 1) {
      const bubble = this.add
        .circle(
          Phaser.Math.Between(760, 1180),
          Phaser.Math.Between(500, 680),
          Phaser.Math.Between(3, 8),
          colorNumber(theme.palette.joint),
          0.18,
        )
        .setDepth(6);
      this.tweens.add({
        targets: bubble,
        y: bubble.y - Phaser.Math.Between(40, 110),
        alpha: 0,
        duration: Phaser.Math.Between(1800, 3600),
        delay: Phaser.Math.Between(0, 1600),
        repeat: -1,
        ease: "Sine.easeOut",
      });
    }
  }

  shutdown(): void {
    this.player = null;
    this.tinyAstronaut = null;
    this.door = null;
    this.drum = null;
    this.screenGlow = null;
    this.screenLabel = null;
  }
}

