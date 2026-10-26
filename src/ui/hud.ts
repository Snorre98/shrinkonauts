import type { AssetSource, ResolvedAsset } from "../assets";
import type { ThemeDocument } from "../pack";

export interface HudModel {
  roomTitle: string;
  roomId: string;
  mode: string;
  modeLabel: string;
  total: number;
  placeholders: number;
  overrides: ReadonlyArray<{
    id: string;
    source: AssetSource;
    label: string;
  }>;
  warnings: readonly string[];
}

export interface HudOptions {
  badge?: ResolvedAsset;
}

export interface Hud {
  update(model: HudModel): void;
  setBadge(asset: ResolvedAsset): void;
  setMuted(muted: boolean): void;
  warn(message: string): void;
  fatal(error: Error): void;
}

function element<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className?: string,
  text?: string,
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (className) {
    node.className = className;
  }
  if (text !== undefined) {
    node.textContent = text;
  }
  return node;
}

function kebabCase(value: string): string {
  return value.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);
}

/**
 * Maps the pack theme onto CSS custom properties. This is the only place the
 * DOM learns about theme values; components only read tokens.
 */
export function applyTheme(
  theme: ThemeDocument,
  root: HTMLElement = document.documentElement,
): void {
  for (const [key, value] of Object.entries(theme.palette)) {
    root.style.setProperty(`--color-${kebabCase(key)}`, value);
  }

  root.style.setProperty("--font-ui", theme.fonts.ui);
  root.style.setProperty("--font-display", theme.fonts.display);
  root.style.setProperty("--ui-radius", `${theme.ui.radius}px`);
  root.style.setProperty("--ui-border", `${theme.ui.border}px`);
  root.style.setProperty("--ui-font-scale", String(theme.ui.fontScale));
  root.dataset.reducedMotion = String(theme.ui.reducedMotion);

  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute("content", theme.palette.bg);
}

function styleBadge(node: HTMLElement, asset: ResolvedAsset | undefined): void {
  if (!asset) {
    return;
  }

  if (asset.src) {
    node.style.backgroundImage = `url("${asset.src}")`;
    node.style.backgroundSize = "cover";
    node.style.backgroundPosition = "center";
    node.classList.add("hud__stamp--image");
    return;
  }

  const spec = asset.placeholderSpec;
  if (spec.kind !== "css") {
    return;
  }

  node.style.background = spec.background;
  node.style.color = spec.color;
  node.style.borderColor = spec.border;
  node.style.borderRadius = `${spec.radius}px`;
}

function badgeLabel(asset: ResolvedAsset | undefined): string {
  if (asset && asset.placeholderSpec.kind === "css") {
    return asset.placeholderSpec.label;
  }
  return "M0.2";
}

export function mountHud(
  root: HTMLElement,
  options: HudOptions = {},
): Hud {
  const hud = element("div", "hud");
  hud.setAttribute("role", "status");
  hud.setAttribute("aria-live", "polite");

  const titlePanel = element("header", "hud__panel hud__panel--title");
  const eyebrowRow = element("div", "hud__eyebrow-row");
  const eyebrow = element("span", "hud__eyebrow", "M0.2 · Placeholder room");
  const stamp = element("span", "hud__stamp", badgeLabel(options.badge));
  const audioStatus = element("span", "hud__audio", "Audio on");
  audioStatus.dataset.muted = "false";
  styleBadge(stamp, options.badge);

  const title = element("h1", "hud__title");
  const badge = element("span", "hud__mode-badge");
  const meta = element("p", "hud__meta", "Two local players · one shared camera");
  const roomId = element("p", "hud__room-id");

  const controls = element("aside", "hud__panel hud__panel--controls");
  const controlsHeading = element("h2", "hud__heading", "Controls");
  const controlsList = element("dl", "hud__controls");
  const controlRows: ReadonlyArray<[string, string]> = [
    ["Player 1", "A / D · W or Space"],
    ["Player 2", "← / → · ↑"],
    ["Audio", "M · mute / unmute"],
    ["Camera", "Follows both players"],
  ];

  for (const [label, keys] of controlRows) {
    const term = element("dt", undefined, label);
    const detail = element("dd", undefined, keys);
    controlsList.append(term, detail);
  }

  const footer = element("footer", "hud__panel hud__panel--assets");
  const assetsHeading = element("h2", "hud__heading", "Asset resolution");
  const summary = element("p", "hud__summary");
  const overrideList = element("ul", "hud__overrides");
  const warningList = element("ul", "hud__warnings");

  const fatal = element("div", "hud__fatal");
  fatal.hidden = true;
  const fatalHeading = element("h2", "hud__fatal-title", "Boot failed");
  const fatalMessage = element("pre", "hud__fatal-message");
  const fatalHint = element(
    "p",
    "hud__fatal-hint",
    "Reload after fixing the room, theme, or manifest.",
  );
  fatal.append(fatalHeading, fatalMessage, fatalHint);

  eyebrowRow.append(eyebrow, stamp, audioStatus);
  titlePanel.append(eyebrowRow, title, badge, meta, roomId);
  controls.append(controlsHeading, controlsList);
  footer.append(assetsHeading, summary, overrideList, warningList);
  hud.append(titlePanel, controls, footer, fatal);
  root.append(hud);

  return {
    update(model) {
      title.textContent = model.roomTitle;
      roomId.textContent = `room: ${model.roomId}`;
      badge.textContent = model.modeLabel;
      badge.dataset.mode = model.mode;

      const fixtureCount = model.overrides.length;
      summary.textContent = `${model.total} logical IDs · ${model.placeholders} placeholder${
        model.placeholders === 1 ? "" : "s"
      }${fixtureCount > 0 ? ` · ${fixtureCount} override${fixtureCount === 1 ? "" : "s"}` : ""}`;

      overrideList.replaceChildren(
        ...model.overrides.map((override) => {
          const item = element("li", "hud__override");
          const id = element("code", undefined, override.id);
          const source = element(
            "span",
            `hud__source hud__source--${override.label}`,
            override.label,
          );
          item.append(id, source);
          return item;
        }),
      );

      warningList.replaceChildren(
        ...model.warnings.map((warning) => {
          const item = element("li", undefined, warning);
          return item;
        }),
      );
      warningList.hidden = model.warnings.length === 0;
    },

    warn(message) {
      const item = element("li", undefined, message);
      warningList.append(item);
      warningList.hidden = false;
    },

    setBadge(asset) {
      stamp.textContent = badgeLabel(asset);
      stamp.removeAttribute("style");
      stamp.classList.remove("hud__stamp--image");
      styleBadge(stamp, asset);
    },

    setMuted(muted) {
      audioStatus.textContent = muted ? "Muted" : "Audio on";
      audioStatus.dataset.muted = String(muted);
    },

    fatal(error) {
      fatalMessage.textContent = error.message;
      fatal.hidden = false;
    },
  };
}
