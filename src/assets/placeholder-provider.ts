import type { AssetProvider } from "./provider";
import type {
  AssetDescriptor,
  AssetId,
  AssetSource,
  GradientStop,
  PlaceholderSpec,
} from "./types";

export interface PlaceholderPalette {
  bg: string;
  bone: string;
  boneShadow: string;
  nerve: string;
  nerveGlow: string;
  joint: string;
  muscle: string;
  text: string;
  muted: string;
  accent: string;
  danger: string;
}

export interface PlaceholderFonts {
  ui: string;
  display: string;
}

export interface PlaceholderProviderOptions {
  palette: PlaceholderPalette;
  fonts: PlaceholderFonts;
  layerWidth?: number;
  layerHeight?: number;
}

const FALLBACK_PALETTE: PlaceholderPalette = {
  bg: "#1b1414",
  bone: "#f2e8d5",
  boneShadow: "#c9b79a",
  nerve: "#ffd166",
  nerveGlow: "#fff3b0",
  joint: "#7bdff2",
  muscle: "#ef476f",
  text: "#f7f3ea",
  muted: "#b8a99a",
  accent: "#ffd166",
  danger: "#ef476f",
};

const FALLBACK_FONTS: PlaceholderFonts = {
  ui: "Inter, system-ui, sans-serif",
  display: "Space Grotesk, Inter, sans-serif",
};

function hashString(value: string): number {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function parseHex(value: string): [number, number, number] {
  const normalized = value.trim().replace(/^#/, "");
  if (normalized.length === 3) {
    const red = Number.parseInt(normalized[0] + normalized[0], 16);
    const green = Number.parseInt(normalized[1] + normalized[1], 16);
    const blue = Number.parseInt(normalized[2] + normalized[2], 16);
    return [red, green, blue];
  }

  if (normalized.length === 6) {
    return [
      Number.parseInt(normalized.slice(0, 2), 16),
      Number.parseInt(normalized.slice(2, 4), 16),
      Number.parseInt(normalized.slice(4, 6), 16),
    ];
  }

  return [27, 20, 20];
}

export function withAlpha(color: string, alpha: number): string {
  const [red, green, blue] = parseHex(color);
  return `rgba(${red}, ${green}, ${blue}, ${Math.max(0, Math.min(1, alpha))})`;
}

function mixHex(left: string, right: string, amount: number): string {
  const [r1, g1, b1] = parseHex(left);
  const [r2, g2, b2] = parseHex(right);
  const t = Math.max(0, Math.min(1, amount));
  const channel = (a: number, b: number) =>
    Math.round(a + (b - a) * t)
      .toString(16)
      .padStart(2, "0");
  return `#${channel(r1, r2)}${channel(g1, g2)}${channel(b1, b2)}`;
}

function lastSegment(id: AssetId): string {
  const segments = id.split(".");
  return segments[segments.length - 1] ?? id;
}

function shortLabel(id: AssetId): string {
  if (id === "ui.icon.badge") {
    return "M0.2";
  }

  const segment = lastSegment(id);
  if (/^p[12]$/i.test(segment)) {
    return segment.toUpperCase();
  }

  return segment.slice(0, 4).toUpperCase();
}

export class PlaceholderProvider implements AssetProvider {
  readonly label = "placeholder";
  readonly source: AssetSource = "placeholder";

  private readonly palette: PlaceholderPalette;
  private readonly fonts: PlaceholderFonts;
  private readonly layerWidth: number;
  private readonly layerHeight: number;

  constructor(options: Partial<PlaceholderProviderOptions> = {}) {
    this.palette = { ...FALLBACK_PALETTE, ...options.palette };
    this.fonts = { ...FALLBACK_FONTS, ...options.fonts };
    this.layerWidth = options.layerWidth ?? 1024;
    this.layerHeight = options.layerHeight ?? 576;
  }

  sprite(id: AssetId): AssetDescriptor {
    return this.descriptor(id, "sprite", this.shapeSpec(id));
  }

  image(id: AssetId): AssetDescriptor {
    const spec = id.startsWith("bg.")
      ? this.gradientSpec(id)
      : id.startsWith("tileset.")
        ? this.tileSpec()
        : id.startsWith("ui.")
          ? this.cssSpec(id)
          : this.shapeSpec(id);

    return this.descriptor(id, id.startsWith("bg.") ? "background" : "image", spec);
  }

  audio(id: AssetId): AssetDescriptor {
    const isCue = id.startsWith("audio.cue.");
    const spec: PlaceholderSpec = isCue
      ? {
          kind: "synth",
          label: lastSegment(id),
          frequency: 280 + (hashString(id) % 440),
          duration: 0.08,
          waveform: "square",
        }
      : { kind: "silent", label: lastSegment(id) };

    return this.descriptor(id, "audio", spec);
  }

  font(id: AssetId): AssetDescriptor {
    return this.descriptor(id, "font", {
      kind: "font",
      family: this.fonts.ui,
      fallback: "system-ui, sans-serif",
    });
  }

  invalidate(): void {
    // Placeholder specs are deterministic and need no cache invalidation.
  }

  private descriptor(
    id: AssetId,
    type: AssetDescriptor["type"],
    placeholderSpec: PlaceholderSpec,
  ): AssetDescriptor {
    return {
      id,
      type,
      placeholder: true,
      source: "placeholder",
      placeholderSpec,
    };
  }

  private shapeSpec(id: AssetId): PlaceholderSpec {
    const segment = lastSegment(id);
    const isPlayer = id.startsWith("sprite.player.");
    const isSecondPlayer = /p2|two/i.test(segment);
    const fill = isPlayer
      ? isSecondPlayer
        ? this.palette.muscle
        : this.palette.joint
      : hashString(id) % 2 === 0
        ? this.palette.nerve
        : this.palette.accent;

    return {
      kind: "shape",
      width: isPlayer ? 32 : 48,
      height: isPlayer ? 48 : 48,
      fill,
      stroke: this.palette.bg,
      strokeWidth: 2,
      label: shortLabel(id),
      labelColor: this.palette.bg,
    };
  }

  private gradientSpec(id: AssetId): PlaceholderSpec {
    const segment = lastSegment(id);
    let stops: GradientStop[];

    switch (segment) {
      case "sky":
        stops = [
          { offset: 0, color: mixHex(this.palette.bg, "#000000", 0.5) },
          { offset: 0.45, color: mixHex(this.palette.bg, this.palette.boneShadow, 0.08) },
          { offset: 0.78, color: this.palette.bg },
          { offset: 1, color: mixHex(this.palette.bg, this.palette.joint, 0.35) },
        ];
        break;
      case "far":
        stops = [
          { offset: 0, color: withAlpha(this.palette.bg, 0) },
          { offset: 0.34, color: withAlpha(this.palette.joint, 0.22) },
          { offset: 0.52, color: withAlpha(this.palette.joint, 0.1) },
          { offset: 1, color: withAlpha(this.palette.boneShadow, 0.18) },
        ];
        break;
      case "mid":
        stops = [
          { offset: 0, color: withAlpha(this.palette.bg, 0) },
          { offset: 0.45, color: withAlpha(this.palette.muscle, 0.18) },
          { offset: 0.66, color: withAlpha(this.palette.muscle, 0.08) },
          { offset: 1, color: withAlpha(this.palette.bg, 0) },
        ];
        break;
      case "near":
        stops = [
          { offset: 0, color: withAlpha(this.palette.bg, 0) },
          { offset: 0.5, color: withAlpha(this.palette.nerve, 0.1) },
          { offset: 0.7, color: withAlpha(this.palette.bg, 0.5) },
          { offset: 1, color: withAlpha(this.palette.bg, 0.9) },
        ];
        break;
      default: {
        const mix = mixHex(
          this.palette.bg,
          hashString(id) % 2 === 0 ? this.palette.joint : this.palette.muscle,
          0.2,
        );
        stops = [
          { offset: 0, color: withAlpha(this.palette.bg, 0) },
          { offset: 1, color: withAlpha(mix, 0.45) },
        ];
      }
    }

    return {
      kind: "gradient",
      width: this.layerWidth,
      height: this.layerHeight,
      angle: "vertical",
      stops,
    };
  }

  private tileSpec(): PlaceholderSpec {
    return {
      kind: "tile",
      width: 32,
      height: 32,
      fill: mixHex(this.palette.boneShadow, this.palette.bg, 0.35),
      edge: this.palette.bone,
      edgeWidth: 1,
    };
  }

  private cssSpec(id: AssetId): PlaceholderSpec {
    return {
      kind: "css",
      label: shortLabel(id),
      // Pixel UI placeholders use hard square chrome; no pill radius or
      // translucent glass fill.
      background: this.palette.bg,
      color: this.palette.text,
      border: withAlpha(this.palette.accent, 0.65),
      radius: 0,
    };
  }
}
