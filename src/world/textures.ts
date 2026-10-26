import Phaser from "phaser";
import { textureKey, type PlaceholderSpec, type ResolvedAsset } from "../assets";

function roundedRect(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
): void {
  const r = Math.min(radius, width / 2, height / 2);
  context.beginPath();
  context.moveTo(x + r, y);
  context.lineTo(x + width - r, y);
  context.quadraticCurveTo(x + width, y, x + width, y + r);
  context.lineTo(x + width, y + height - r);
  context.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
  context.lineTo(x + r, y + height);
  context.quadraticCurveTo(x, y + height, x, y + height - r);
  context.lineTo(x, y + r);
  context.quadraticCurveTo(x, y, x + r, y);
  context.closePath();
}

function drawGradient(
  context: CanvasRenderingContext2D,
  spec: Extract<PlaceholderSpec, { kind: "gradient" }>,
): void {
  const gradient =
    spec.angle === "horizontal"
      ? context.createLinearGradient(0, 0, spec.width, 0)
      : spec.angle === "diagonal"
        ? context.createLinearGradient(0, 0, spec.width, spec.height)
        : context.createLinearGradient(0, 0, 0, spec.height);

  for (const stop of spec.stops) {
    gradient.addColorStop(stop.offset, stop.color);
  }

  context.fillStyle = gradient;
  context.fillRect(0, 0, spec.width, spec.height);
}

function drawShape(
  context: CanvasRenderingContext2D,
  spec: Extract<PlaceholderSpec, { kind: "shape" }>,
  fontFamily: string,
): void {
  context.clearRect(0, 0, spec.width, spec.height);
  roundedRect(
    context,
    spec.strokeWidth / 2,
    spec.strokeWidth / 2,
    spec.width - spec.strokeWidth,
    spec.height - spec.strokeWidth,
    8,
  );
  context.fillStyle = spec.fill;
  context.fill();
  context.strokeStyle = spec.stroke;
  context.lineWidth = spec.strokeWidth;
  context.stroke();

  context.fillStyle = spec.labelColor;
  context.font = `700 13px ${fontFamily}`;
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillText(spec.label, spec.width / 2, spec.height / 2 + 1);
}

function drawTile(
  context: CanvasRenderingContext2D,
  spec: Extract<PlaceholderSpec, { kind: "tile" }>,
): void {
  context.fillStyle = spec.fill;
  context.fillRect(0, 0, spec.width, spec.height);
  context.strokeStyle = spec.edge;
  context.lineWidth = spec.edgeWidth;
  context.strokeRect(
    spec.edgeWidth / 2,
    spec.edgeWidth / 2,
    spec.width - spec.edgeWidth,
    spec.height - spec.edgeWidth,
  );

  context.fillStyle = "rgba(255, 255, 255, 0.08)";
  context.fillRect(0, 0, spec.width, 3);
}

export function ensurePlaceholderTexture(
  scene: Phaser.Scene,
  asset: ResolvedAsset,
  fontFamily: string,
): string | null {
  const key = textureKey(asset.id);
  if (scene.textures.exists(key)) {
    return key;
  }

  const spec = asset.placeholderSpec;
  if (
    spec.kind !== "gradient" &&
    spec.kind !== "shape" &&
    spec.kind !== "tile"
  ) {
    return null;
  }

  const texture = scene.textures.createCanvas(key, spec.width, spec.height);
  if (!texture) {
    return null;
  }

  if (spec.kind === "gradient") {
    drawGradient(texture.context, spec);
  } else if (spec.kind === "shape") {
    drawShape(texture.context, spec, fontFamily);
  } else {
    drawTile(texture.context, spec);
  }

  texture.refresh();
  return key;
}

export function textureIfLoaded(
  scene: Phaser.Scene,
  asset: ResolvedAsset,
): string | null {
  if (!asset.src) {
    return null;
  }
  const key = textureKey(asset.id);
  return scene.textures.exists(key) ? key : null;
}

export function resolveTexture(
  scene: Phaser.Scene,
  asset: ResolvedAsset,
  fontFamily: string,
): string | null {
  return (
    textureIfLoaded(scene, asset) ??
    ensurePlaceholderTexture(scene, asset, fontFamily)
  );
}
