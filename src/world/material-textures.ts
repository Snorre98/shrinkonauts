import Phaser from "phaser";
import {
  E,
  N,
  S,
  W,
  fnv1a,
  type MaterialDefinition,
  type TileMaterialRule,
} from "../materials";
import type { ThemeDocument } from "../pack";

function colorFor(
  theme: ThemeDocument,
  token: string | undefined,
  fallback: string,
): string {
  if (!token) return fallback;
  const value = theme.palette[token as keyof ThemeDocument["palette"]];
  return typeof value === "string" ? value : fallback;
}

function withAlpha(color: string, alpha: number): string {
  const parsed = Number.parseInt(color.replace(/^#/, ""), 16);
  if (!Number.isFinite(parsed)) return `rgba(255,255,255,${alpha})`;
  const red = (parsed >> 16) & 0xff;
  const green = (parsed >> 8) & 0xff;
  const blue = parsed & 0xff;
  return `rgba(${red},${green},${blue},${alpha})`;
}

export class MaterialTextureCache {
  private readonly cache = new Map<string, string>();

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly theme: ThemeDocument,
    private readonly tileSize: number,
  ) {}

  textureFor(
    material: MaterialDefinition,
    rule: TileMaterialRule,
    mask: number,
    variantSeed = 0,
  ): string | null {
    const baseToken =
      rule.tint ?? material.tint ?? material.palette[0] ?? "bone";
    const edgeToken = material.palette[1] ?? material.palette[0] ?? "boneShadow";
    const base = colorFor(this.theme, baseToken, this.theme.palette.bone);
    const edge = colorFor(this.theme, edgeToken, this.theme.palette.boneShadow);
    const paletteKey = fnv1a(`${base}:${edge}`).toString(36);
    const key = `material:${material.id}:${rule.autotile}:${mask}:${variantSeed}:${paletteKey}:${this.tileSize}`;
    const existing = this.cache.get(key);
    if (existing) return existing;

    const texture = this.scene.textures.createCanvas(
      key,
      this.tileSize,
      this.tileSize,
    );
    if (!texture) return null;
    const context = texture.context;
    const size = this.tileSize;

    context.clearRect(0, 0, size, size);
    context.fillStyle = base;
    context.fillRect(0, 0, size, size);
    context.fillStyle = withAlpha("#ffffff", 0.06);
    context.fillRect(0, 0, size, Math.max(1, Math.round(size * 0.12)));

    if (rule.autotile !== "none") {
      const width =
        material.edge === "hard" ? Math.max(2, Math.round(size * 0.09)) : Math.max(1, Math.round(size * 0.05));
      context.strokeStyle =
        material.edge === "soft" ? withAlpha(edge, 0.55) : edge;
      context.lineWidth = width;
      context.beginPath();
      if (!(mask & N)) {
        context.moveTo(0, width / 2);
        context.lineTo(size, width / 2);
      }
      if (!(mask & E)) {
        context.moveTo(size - width / 2, 0);
        context.lineTo(size - width / 2, size);
      }
      if (!(mask & S)) {
        context.moveTo(0, size - width / 2);
        context.lineTo(size, size - width / 2);
      }
      if (!(mask & W)) {
        context.moveTo(width / 2, 0);
        context.lineTo(width / 2, size);
      }
      context.stroke();
    }

    if (rule.autotile === "randomVariants" || rule.autotile === "none") {
      const count = 4 + (variantSeed % 4);
      for (let index = 0; index < count; index += 1) {
        const hash = fnv1a(`${material.id}:${mask}:${variantSeed}:${index}`);
        const x = hash % size;
        const y = (hash >>> 8) % size;
        context.fillStyle = withAlpha(edge, 0.22);
        context.fillRect(x, y, 2, 2);
      }
    }

    texture.refresh();
    this.cache.set(key, key);
    return key;
  }
}
