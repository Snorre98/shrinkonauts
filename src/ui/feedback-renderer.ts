import type {
  FeedbackCue,
  FeedbackFrame,
  FeedbackPresentation,
  FeedbackState,
  FeedbackSurface,
  FeedbackVisualKind,
} from "../feedback";
import { visualKind } from "../feedback";
import type { SurfaceAction, WorldView } from "./model";
import { worldToScreen, type CanvasRect } from "./anchors";
import {
  layoutSurfaces,
  DEFAULT_SAFE_AREA,
  type LayoutItem,
  type SafeArea,
} from "./layout";
import { glyphCode } from "./blueprint";

export interface FeedbackSurfaceCallbacks {
  onSurfaceAction(surfaceId: string, action: SurfaceAction): void;
}

export interface FeedbackSurfaceRenderer {
  update(
    frame: FeedbackFrame,
    world: WorldView,
    canvasRect: CanvasRect,
    safeArea?: SafeArea,
  ): void;
  clear(): void;
}

type RenderableSurface = FeedbackSurface | FeedbackCue;

const WORLD_PRESENTATIONS: ReadonlySet<FeedbackPresentation> = new Set([
  "speechBubble",
  "playerCaption",
  "stateSwap",
  "socketFill",
  "outline",
  "pathGlow",
  "prompt",
]);

const LEXICON_ICON_SYMBOLS: Readonly<Record<string, string>> = {
  interact: "ui.blueprint.symbol.input-pair",
  toggle: "ui.blueprint.symbol.input-pair",
  meter: "ui.blueprint.symbol.threshold-gauge",
  counter: "ui.blueprint.symbol.threshold-gauge",
  socket: "ui.blueprint.symbol.receptor-bind",
  carry: "ui.blueprint.symbol.ach-carry",
  gate: "ui.blueprint.symbol.exit-gate",
  path: "ui.blueprint.symbol.axon-flow",
  outcome: "ui.blueprint.symbol.response-clear",
};

const STATE_BADGES: Readonly<Record<FeedbackState, string>> = {
  idle: "○",
  available: "◇",
  active: "●",
  progress: "◐",
  complete: "✓",
  blocked: "!",
  expired: "×",
  reset: "↺",
};

function isCue(item: RenderableSurface): item is FeedbackCue {
  return "seq" in item;
}

function kindFor(item: RenderableSurface): FeedbackVisualKind {
  return isCue(item) ? "card" : visualKind(item);
}

function layerFor(item: RenderableSurface): "world" | "hud" {
  const kind = kindFor(item);
  if (kind === "marker" || kind === "ring") return "world";
  if (kind === "chip") return "hud";
  return WORLD_PRESENTATIONS.has(item.presentation) ? "world" : "hud";
}

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className?: string,
  text?: string,
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function ownerLabel(owner: RenderableSurface["owner"]): string {
  return owner === "shared" ? "Shared" : owner.toUpperCase();
}

function domId(surfaceId: string): string {
  return `feedback-surface-${surfaceId.replace(/[^a-zA-Z0-9_-]/g, "-")}`;
}

function contentSignature(item: RenderableSurface, kind: FeedbackVisualKind): string {
  return JSON.stringify({
    kind,
    presentation: item.presentation,
    placement: isCue(item) ? null : item.placement,
    icon: isCue(item) ? null : item.icon ?? null,
    owner: item.owner,
    actor: item.actor,
    state: item.state,
    severity: item.severity,
    content: item.content,
    interaction: isCue(item) ? null : item.interaction,
    conversation: isCue(item) ? null : item.conversation ?? null,
  });
}

function presentationClass(presentation: FeedbackPresentation): string {
  return `feedback-surface feedback-surface--${presentation}`;
}

function announceText(item: RenderableSurface): string {
  const text = item.a11y.textAlternative ?? item.content.text ?? "";
  if (item.actor && text && !/^P[12]:/.test(text)) {
    return `${item.actor.toUpperCase()}: ${text}`;
  }
  return text;
}

function compactLabel(item: RenderableSurface): string {
  const title =
    item.content.title ?? item.content.speaker ?? item.source.id;
  const text = item.content.text ?? title;
  const progress = item.content.progress;
  const progressText = progress
    ? ` ${progress.value} of ${progress.max}${progress.unit ? ` ${progress.unit}` : ""}.`
    : "";
  const prefix = item.owner === "shared" ? "" : `${item.owner.toUpperCase()}: `;
  return `${prefix}${title}. ${text}${progressText} Press I or click to inspect.`;
}

function stateBadge(state: FeedbackState): string {
  return STATE_BADGES[state] ?? "○";
}

function progressRatio(item: RenderableSurface): number {
  const progress = item.content.progress;
  if (!progress || progress.max <= 0) return 0;
  return Math.max(0, Math.min(1, progress.value / progress.max));
}

function iconSymbol(item: RenderableSurface): string | null {
  if (isCue(item) || !item.icon) return null;
  if (item.icon.startsWith("ui.")) return item.icon;
  const prefix = item.icon.split(".")[0] ?? "";
  return LEXICON_ICON_SYMBOLS[prefix] ?? null;
}

function applyIcon(
  node: HTMLElement,
  item: RenderableSurface,
  resolveIcon: ((symbol: string) => { src: string } | null) | undefined,
): void {
  node.classList.add("feedback-icon");
  const symbol = iconSymbol(item);
  const resolved = symbol && resolveIcon ? resolveIcon(symbol) : null;
  if (resolved?.src) {
    node.classList.add("feedback-icon--image");
    node.style.backgroundImage = `url("${resolved.src}")`;
  } else {
    node.textContent = symbol ? glyphCode(symbol) : "?";
  }
  node.setAttribute("aria-hidden", "true");
}

export function mountFeedbackSurfaces(
  worldLayer: HTMLElement,
  hudLayer: HTMLElement,
  callbacks: FeedbackSurfaceCallbacks,
  options: {
    resolveIcon?: (symbol: string) => { src: string } | null;
  } = {},
): FeedbackSurfaceRenderer {
  const nodes = new Map<string, HTMLElement>();
  const signatures = new Map<string, string>();
  const lastAnnounced = new Map<string, string>();
  let lastCueSeq = 0;
  let lastFrameSeq = 0;

  const live = el("div", "sr-only feedback-live");
  live.setAttribute("aria-live", "polite");
  live.setAttribute("aria-atomic", "true");
  hudLayer.append(live);

  function createNode(
    id: string,
    item: RenderableSurface,
    layer: "world" | "hud",
  ): HTMLElement {
    const kind = kindFor(item);
    const existing = nodes.get(id);
    if (
      existing &&
      existing.dataset.presentation === item.presentation &&
      existing.dataset.kind === kind
    ) {
      return existing;
    }
    existing?.remove();
    nodes.delete(id);

    const isButton = kind !== "card";
    const node = isButton ? el("button") : el("div");
    if (isButton) {
      (node as HTMLButtonElement).type = "button";
      node.addEventListener("click", () => {
        callbacks.onSurfaceAction(node.dataset.surfaceId ?? id, {
          type: "inspect",
        });
        // Return keyboard focus to the game so Space/Enter keep controlling
        // the player after a mouse click.
        node.blur();
      });
    }
    node.className =
      kind === "marker"
        ? "feedback-surface feedback-surface--stateMarker"
        : kind === "ring"
          ? "feedback-surface feedback-surface--stateRing"
          : kind === "chip"
            ? "feedback-surface feedback-surface--hudChip"
            : presentationClass(item.presentation);
    node.dataset.surfaceId = id;
    node.dataset.presentation = item.presentation;
    node.dataset.kind = kind;
    node.id = domId(id);
    (layer === "world" ? worldLayer : hudLayer).append(node);
    nodes.set(id, node);
    signatures.delete(id);
    return node;
  }

  function renderMarker(node: HTMLElement, item: RenderableSurface): void {
    node.replaceChildren();
    const glyph = el("span", "feedback-marker__glyph");
    applyIcon(glyph, item, options.resolveIcon);
    const badge = el("span", "feedback-marker__badge", stateBadge(item.state));
    badge.setAttribute("aria-hidden", "true");
    node.append(glyph, badge);
    if (item.content.progress) {
      const meter = el("span", "feedback-marker__meter");
      const fill = el("span", "feedback-marker__meter-fill");
      fill.style.width = `${Math.round(progressRatio(item) * 100)}%`;
      meter.append(fill);
      node.append(meter);
    }
    const tooltip = el(
      "span",
      "feedback-marker__tooltip",
      item.content.text ?? "",
    );
    tooltip.setAttribute("aria-hidden", "true");
    node.append(tooltip);
  }

  function renderRing(node: HTMLElement, item: RenderableSurface): void {
    node.replaceChildren();
    node.style.setProperty(
      "--feedback-ring-ratio",
      String(progressRatio(item)),
    );
    const inner = el("span", "feedback-ring__inner");
    const terminal =
      item.state === "complete" ||
      item.state === "blocked" ||
      item.state === "expired" ||
      item.state === "reset";
    const progress = item.content.progress;
    if (terminal) {
      inner.append(
        el("span", "feedback-ring__badge", stateBadge(item.state)),
      );
    } else if (item.presentation === "tracker" && progress) {
      inner.append(
        el(
          "span",
          "feedback-ring__value",
          `${progress.value}/${progress.max}`,
        ),
      );
    } else if (progress) {
      inner.append(
        el(
          "span",
          "feedback-ring__value",
          `${Math.round(progressRatio(item) * 100)}%`,
        ),
      );
    } else {
      inner.append(
        el("span", "feedback-ring__badge", stateBadge(item.state)),
      );
    }
    const tooltip = el(
      "span",
      "feedback-marker__tooltip",
      item.content.text ?? "",
    );
    tooltip.setAttribute("aria-hidden", "true");
    node.append(inner, tooltip);
  }

  function renderHudChip(node: HTMLElement, item: RenderableSurface): void {
    node.replaceChildren();
    const glyph = el("span", "feedback-chip__glyph");
    applyIcon(glyph, item, options.resolveIcon);
    const label = el(
      "span",
      "feedback-chip__label",
      item.content.title ?? item.content.speaker ?? item.source.id,
    );
    const progress = item.content.progress;
    const value =
      progress === undefined
        ? ""
        : item.presentation === "tracker"
          ? `${progress.value}/${progress.max}`
          : `${Math.round(progressRatio(item) * 100)}%`;
    const valueNode = el("span", "feedback-chip__value", value);
    valueNode.hidden = value === "";
    const meter = el("span", "feedback-chip__meter");
    const fill = el("span", "feedback-chip__meter-fill");
    fill.style.width = `${Math.round(progressRatio(item) * 100)}%`;
    meter.append(fill);
    meter.hidden = progress === undefined;
    node.append(glyph, label, valueNode, meter);
  }

  function renderCard(node: HTMLElement, item: RenderableSurface): void {
    node.replaceChildren();

    const header = el("div", "feedback-surface__header");
    const owner = el(
      "span",
      "feedback-surface__owner",
      ownerLabel(item.owner),
    );
    header.append(owner);
    if (!isCue(item) && item.icon) {
      const icon = el("span", "feedback-surface__icon");
      applyIcon(icon, item, options.resolveIcon);
      header.append(icon);
    }
    const heading = item.content.speaker ?? item.content.title;
    if (heading) {
      header.append(el("strong", "feedback-surface__speaker", heading));
    }
    node.append(header);

    if (item.content.text) {
      node.append(el("p", "feedback-surface__text", item.content.text));
    }

    if (item.content.progress) {
      const progress = item.content.progress;
      const ratio =
        progress.max > 0
          ? Math.max(0, Math.min(1, progress.value / progress.max))
          : 0;
      const meter = el("div", "feedback-surface__meter");
      meter.setAttribute("role", "progressbar");
      meter.setAttribute("aria-valuemin", "0");
      meter.setAttribute("aria-valuemax", String(progress.max));
      meter.setAttribute("aria-valuenow", String(progress.value));
      const fill = el("span", "feedback-surface__meter-fill");
      fill.style.width = `${Math.round(ratio * 100)}%`;
      meter.append(fill);
      node.append(meter);
    }

    if (!isCue(item) && item.content.choices && item.content.choices.length > 0) {
      const list = el("div", "feedback-surface__choices");
      list.setAttribute("role", "group");
      list.setAttribute("aria-label", "Choices");
      for (const choice of item.content.choices) {
        const selected = choice.id === item.content.selectedChoiceId;
        const button = el(
          "button",
          "button button--choice feedback-surface__choice",
          choice.label,
        );
        button.type = "button";
        button.dataset.choiceId = choice.id;
        button.dataset.selected = String(selected);
        button.setAttribute("aria-pressed", String(selected));
        button.addEventListener("click", () => {
          callbacks.onSurfaceAction(item.id, {
            type: "choose",
            choiceId: choice.id,
          });
        });
        list.append(button);
      }
      node.append(list);
    }

    if (!isCue(item) && item.presentation === "anchoredPanel") {
      const close = el(
        "button",
        "button button--small feedback-surface__close",
        "Close",
      );
      close.type = "button";
      close.setAttribute("aria-label", "Close information");
      close.addEventListener("click", () => {
        callbacks.onSurfaceAction(item.id, { type: "cancel" });
      });
      node.append(close);
    } else if (!isCue(item) && item.interaction.mode === "acknowledge") {
      const action = el(
        "button",
        "button button--primary feedback-surface__continue",
        "Continue",
      );
      action.type = "button";
      action.addEventListener("click", () => {
        callbacks.onSurfaceAction(item.id, { type: "confirm" });
      });
      node.append(action);
    }

    if (!isCue(item) && item.conversation) {
      const close = el(
        "button",
        "button button--small feedback-surface__close",
        "Close",
      );
      close.type = "button";
      close.setAttribute("aria-label", "Close conversation");
      close.addEventListener("click", () => {
        callbacks.onSurfaceAction(item.id, { type: "cancel" });
      });
      node.append(close);
    }
  }

  function renderBody(node: HTMLElement, item: RenderableSurface): void {
    const kind = kindFor(item);
    const signature = contentSignature(item, kind);
    node.dataset.owner = item.owner;
    node.dataset.actor = item.actor ?? "shared";
    node.dataset.state = item.state;
    node.dataset.severity = item.severity;
    node.dataset.cue = isCue(item) ? "true" : "false";
    if (!isCue(item) && item.presentation === "anchoredPanel") {
      node.setAttribute("role", "region");
    }
    if (kind === "marker" || kind === "ring" || kind === "chip") {
      node.setAttribute("aria-label", compactLabel(item));
    } else if (item.a11y.textAlternative) {
      node.setAttribute("aria-label", item.a11y.textAlternative);
    } else if (item.content.text) {
      node.setAttribute("aria-label", item.content.text);
    }

    if (signatures.get(item.id) === signature) return;
    signatures.set(item.id, signature);

    if (kind === "marker") renderMarker(node, item);
    else if (kind === "ring") renderRing(node, item);
    else if (kind === "chip") renderHudChip(node, item);
    else renderCard(node, item);
  }

  function announce(frame: FeedbackFrame): void {
    for (const cue of frame.cues) {
      if (cue.seq <= lastCueSeq || !cue.a11y.announce) continue;
      lastCueSeq = Math.max(lastCueSeq, cue.seq);
      live.textContent = announceText(cue);
    }
    for (const surface of frame.surfaces) {
      if (!surface.a11y.announce) continue;
      const text = announceText(surface);
      if (!text || lastAnnounced.get(surface.id) === text) continue;
      lastAnnounced.set(surface.id, text);
      live.textContent = text;
    }
  }

  function update(
    frame: FeedbackFrame,
    world: WorldView,
    canvasRect: CanvasRect,
    safeArea: SafeArea = DEFAULT_SAFE_AREA,
  ): void {
    if (frame.seq < lastFrameSeq) {
      lastCueSeq = 0;
      lastAnnounced.clear();
    }
    lastFrameSeq = frame.seq;
    announce(frame);

    const inspectedId =
      frame.surfaces
        .find(
          (surface) =>
            surface.presentation === "anchoredPanel" &&
            surface.id.startsWith("fb:inspect:"),
        )
        ?.id.slice("fb:inspect:".length) ?? null;
    const activeIds = new Set<string>();
    const items: LayoutItem[] = [];
    const entries: Array<{
      node: HTMLElement;
      item: RenderableSurface;
      kind: FeedbackVisualKind;
    }> = [];

    for (const item of [...frame.surfaces, ...frame.cues] as RenderableSurface[]) {
      const kind = kindFor(item);
      const layer = layerFor(item);
      const node = createNode(item.id, item, layer);
      renderBody(node, item);
      // Measure every active node, including ones that were hidden last
      // frame, so a marker that comes back on-screen keeps its real size.
      node.hidden = false;
      activeIds.add(item.id);
      entries.push({ node, item, kind });
      items.push({
        id: item.id,
        presentation: item.presentation,
        placement: isCue(item) ? "hud" : item.placement,
        kind,
        owner: item.owner,
        priority: item.priority,
        width: node.offsetWidth || (kind === "marker" ? 32 : kind === "ring" ? 40 : kind === "chip" ? 160 : 240),
        height: node.offsetHeight || (kind === "marker" ? 32 : kind === "ring" ? 40 : kind === "chip" ? 28 : 72),
        anchor: worldToScreen(item.anchor, world, canvasRect),
      });
    }

    for (const [id, node] of nodes) {
      if (activeIds.has(id)) continue;
      node.remove();
      nodes.delete(id);
      signatures.delete(id);
      lastAnnounced.delete(id);
    }

    const layout = layoutSurfaces(
      items,
      {
        canvasRect,
        width: document.documentElement.clientWidth,
        height: document.documentElement.clientHeight,
      },
      safeArea,
    );
    const byId = new Map(layout.map((box) => [box.id, box]));
    for (const entry of entries) {
      const box = byId.get(entry.item.id);
      if (!box) {
        entry.node.hidden = true;
        continue;
      }
      entry.node.hidden = !box.visible;
      const layerElement = box.layer === "world" ? worldLayer : hudLayer;
      if (entry.node.parentElement !== layerElement) {
        layerElement.append(entry.node);
      }
      if (!box.visible) continue;
      entry.node.style.transform = `translate3d(${Math.round(box.x)}px, ${Math.round(
        box.y,
      )}px, 0)`;
      entry.node.dataset.docked = String(box.docked);
      if (entry.kind !== "card") {
        const inspected = entry.item.id === inspectedId;
        entry.node.dataset.inspected = String(inspected);
        entry.node.dataset.tooltipPlacement =
          box.y < safeArea.top + 64 ? "below" : "above";
        entry.node.setAttribute("aria-expanded", String(inspected));
        entry.node.setAttribute(
          "aria-controls",
          domId(`fb:inspect:${entry.item.id}`),
        );
      }
    }
  }

  function clear(): void {
    for (const node of nodes.values()) node.remove();
    nodes.clear();
    signatures.clear();
    lastAnnounced.clear();
    lastCueSeq = 0;
    live.textContent = "";
  }

  return { update, clear };
}
