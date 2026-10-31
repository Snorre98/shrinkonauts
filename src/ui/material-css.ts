import {
  UI_MATERIAL_SLOTS,
  resolveMaterialBinding,
  type MaterialCatalog,
  type PatternBinding,
  type PatternProvider,
  type UiMaterialSlot,
} from "../materials";
import type { ThemeDocument } from "../pack";

export interface UiMaterialSlotStyle {
  backgroundColor: string;
  tint: string;
  pattern: string;
  patternSize: string;
  patternPosition: string;
  patternRepeat: string;
  patternBlend: string;
  patternAnimation: string;
  contrastRatio: number;
  animated: boolean;
}

export type UiMaterialStyles = Partial<
  Record<UiMaterialSlot, UiMaterialSlotStyle>
>;

export interface ResolveUiMaterialStylesInput {
  theme: ThemeDocument;
  catalog: MaterialCatalog;
  patterns: PatternProvider;
  reducedMotion?: boolean;
}

export interface ResolvedUiMaterialStyles {
  styles: UiMaterialStyles;
  warnings: string[];
}

function parseHex(value: string): [number, number, number] | null {
  const normalized = value.trim().replace(/^#/, "");
  if (!/^[0-9a-fA-F]{6}$/.test(normalized)) return null;
  return [
    Number.parseInt(normalized.slice(0, 2), 16),
    Number.parseInt(normalized.slice(2, 4), 16),
    Number.parseInt(normalized.slice(4, 6), 16),
  ];
}

function toHex(value: number): string {
  return Math.max(0, Math.min(255, Math.round(value)))
    .toString(16)
    .padStart(2, "0");
}

export function mixHex(left: string, right: string, amount: number): string {
  const a = parseHex(left);
  const b = parseHex(right);
  if (!a || !b) return left;
  const t = Math.max(0, Math.min(1, amount));
  return `#${toHex(a[0] + (b[0] - a[0]) * t)}${toHex(a[1] + (b[1] - a[1]) * t)}${toHex(a[2] + (b[2] - a[2]) * t)}`;
}

function luminance(color: string): number {
  const parsed = parseHex(color);
  if (!parsed) return 0;
  const channels = parsed.map((value) => {
    const channel = value / 255;
    return channel <= 0.03928
      ? channel / 12.92
      : ((channel + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}

export function contrastRatio(foreground: string, background: string): number {
  const first = luminance(foreground);
  const second = luminance(background);
  const light = Math.max(first, second);
  const dark = Math.min(first, second);
  return (light + 0.05) / (dark + 0.05);
}

function contrastSafeBackground(
  theme: ThemeDocument,
  base: string,
  minimum = 4.5,
): string {
  const bg = theme.palette.bg;
  const text = theme.palette.text;
  for (let amount = 0.16; amount >= 0; amount -= 0.02) {
    const candidate = mixHex(bg, base, amount);
    if (contrastRatio(text, candidate) >= minimum) return candidate;
  }
  return bg;
}

function overridesFor(
  binding: PatternBinding | undefined,
): Omit<PatternBinding, "patternId"> | undefined {
  if (!binding) return undefined;
  return {
    ...(binding.space ? { space: binding.space } : {}),
    ...(binding.scale !== undefined ? { scale: binding.scale } : {}),
    ...(binding.rotation !== undefined ? { rotation: binding.rotation } : {}),
    ...(binding.offset ? { offset: binding.offset } : {}),
    ...(binding.seed !== undefined ? { seed: binding.seed } : {}),
    ...(binding.opacity !== undefined ? { opacity: binding.opacity } : {}),
    ...(binding.blend ? { blend: binding.blend } : {}),
  };
}

export function resolveUiMaterialStyles(
  input: ResolveUiMaterialStylesInput,
): ResolvedUiMaterialStyles {
  const { theme, catalog, patterns, reducedMotion = false } = input;
  const styles: UiMaterialStyles = {};
  const warnings: string[] = [];
  const slots = theme.ui.materials ?? {};

  for (const [slot, materialId] of Object.entries(slots) as Array<
    [UiMaterialSlot, string]
  >) {
    if (!UI_MATERIAL_SLOTS.includes(slot)) {
      warnings.push(`UI material slot "${slot}" is not supported`);
      continue;
    }
    const material = catalog.materials[materialId];
    if (!material) {
      warnings.push(
        `UI material slot "${slot}" references unknown material "${materialId}"`,
      );
      continue;
    }

    const patternBinding = theme.ui.patterns?.[slot];
    const binding = resolveMaterialBinding(catalog, {
      materialId,
      ...(patternBinding ? { patternId: patternBinding.patternId } : {}),
      ...(patternBinding ? { pattern: overridesFor(patternBinding) } : {}),
    });
    if (!binding.ok) {
      warnings.push(binding.error);
      continue;
    }
    for (const warning of binding.value.warnings) warnings.push(warning);

    const token = binding.value.tint ?? material.palette[0] ?? "bone";
    const base =
      theme.palette[token as keyof ThemeDocument["palette"]] ??
      theme.palette.bone;
    const backgroundColor = contrastSafeBackground(theme, base);

    let pattern = "none";
    let patternSize = "auto";
    let patternPosition = "0 0";
    let patternRepeat = "repeat";
    let patternBlend = "normal";
    let animated = false;

    if (binding.value.pattern) {
      const placement = binding.value.pattern;
      if (placement.space === "world") {
        warnings.push(
          `UI pattern "${placement.pattern.id}" uses world space; UI patterns must be screen or local`,
        );
      } else {
      const resource = patterns.resolve(placement.pattern, {
        space: placement.space,
        scale: placement.scale,
        rotation: placement.rotation,
        offset: placement.offset,
        seed: placement.seed,
        opacity: placement.opacity,
        blend: placement.blend,
      });
      if (!resource.ok) {
        warnings.push(resource.error);
      } else if (resource.value.kind !== "procedural") {
        warnings.push(
          `UI pattern "${placement.pattern.id}" uses a ${resource.value.kind} source; M1.8 UI patterns are procedural`,
        );
      } else {
        pattern = resource.value.cssBackground ?? "none";
        patternSize = resource.value.cssSize ?? "auto";
        patternPosition = resource.value.cssPosition ?? "0 0";
        patternRepeat = resource.value.cssRepeat ?? "repeat";
        patternBlend = placement.blend;
      }
      }
    }

    styles[slot] = {
      backgroundColor,
      tint: base,
      pattern,
      patternSize,
      patternPosition,
      patternRepeat,
      patternBlend,
      patternAnimation: reducedMotion ? "none" : "none",
      contrastRatio: contrastRatio(theme.palette.text, backgroundColor),
      animated,
    };
  }

  return { styles, warnings };
}

const CSS_PROPERTIES = [
  "background",
  "tint",
  "pattern",
  "pattern-size",
  "pattern-position",
  "pattern-repeat",
  "pattern-blend",
  "pattern-animation",
] as const;

function styleValue(
  style: UiMaterialSlotStyle,
  property: (typeof CSS_PROPERTIES)[number],
): string {
  switch (property) {
    case "background":
      return style.backgroundColor;
    case "tint":
      return style.tint;
    case "pattern":
      return style.pattern;
    case "pattern-size":
      return style.patternSize;
    case "pattern-position":
      return style.patternPosition;
    case "pattern-repeat":
      return style.patternRepeat;
    case "pattern-blend":
      return style.patternBlend;
    case "pattern-animation":
      return style.patternAnimation;
  }
}

export function applyUiMaterialStyles(
  styles: UiMaterialStyles,
  root: HTMLElement = document.documentElement,
): void {
  for (const slot of UI_MATERIAL_SLOTS) {
    const style = styles[slot];
    for (const property of CSS_PROPERTIES) {
      const name = `--material-${slot}-${property}`;
      if (style) {
        root.style.setProperty(name, styleValue(style, property));
      } else {
        root.style.removeProperty(name);
      }
    }
  }
}

export function clearUiMaterialStyles(
  root: HTMLElement = document.documentElement,
): void {
  applyUiMaterialStyles({}, root);
}
