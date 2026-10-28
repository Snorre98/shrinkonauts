import type {
  FeedbackCue,
  FeedbackFrame,
  FeedbackPresentation,
  FeedbackSurface,
} from "../feedback";
import type { SurfaceAction, WorldView } from "./model";
import { worldToScreen, type CanvasRect } from "./anchors";
import { layoutSurfaces, DEFAULT_SAFE_AREA, type LayoutItem } from "./layout";

export interface FeedbackSurfaceCallbacks {
  onSurfaceAction(surfaceId: string, action: SurfaceAction): void;
}

export interface FeedbackSurfaceRenderer {
  update(frame: FeedbackFrame, world: WorldView, canvasRect: CanvasRect): void;
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

function isCue(item: RenderableSurface): item is FeedbackCue {
  return "seq" in item;
}

function layerFor(presentation: FeedbackPresentation): "world" | "hud" {
  return WORLD_PRESENTATIONS.has(presentation) ? "world" : "hud";
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

function contentSignature(item: RenderableSurface): string {
  return JSON.stringify({
    presentation: item.presentation,
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

export function mountFeedbackSurfaces(
  worldLayer: HTMLElement,
  hudLayer: HTMLElement,
  callbacks: FeedbackSurfaceCallbacks,
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

  const beatTracker = el("section", "feedback-beats");
  beatTracker.id = "feedback-beats";
  beatTracker.setAttribute("aria-label", "Puzzle progress");
  hudLayer.append(beatTracker);

  function createNode(
    id: string,
    presentation: FeedbackPresentation,
    layer: "world" | "hud",
  ): HTMLElement {
    const existing = nodes.get(id);
    if (existing) {
      if (existing.dataset.presentation === presentation) {
        return existing;
      }
      existing.remove();
      nodes.delete(id);
    }
    const node = el("div", presentationClass(presentation));
    node.dataset.surfaceId = id;
    node.dataset.presentation = presentation;
    (layer === "world" ? worldLayer : hudLayer).append(node);
    nodes.set(id, node);
    signatures.delete(id);
    return node;
  }

  function renderBody(node: HTMLElement, item: RenderableSurface): void {
    const signature = contentSignature(item);
    node.dataset.owner = item.owner;
    node.dataset.actor = item.actor ?? "shared";
    node.dataset.state = item.state;
    node.dataset.severity = item.severity;
    node.dataset.cue = isCue(item) ? "true" : "false";
    if (item.a11y.textAlternative) {
      node.setAttribute("aria-label", item.a11y.textAlternative);
    } else if (item.content.text) {
      node.setAttribute("aria-label", item.content.text);
    }

    if (signatures.get(item.id) === signature) return;
    signatures.set(item.id, signature);
    node.replaceChildren();

    const header = el("div", "feedback-surface__header");
    const owner = el("span", "feedback-surface__owner", ownerLabel(item.owner));
    header.append(owner);
    if (item.content.speaker) {
      header.append(
        el("strong", "feedback-surface__speaker", item.content.speaker),
      );
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

    if (!isCue(item) && item.interaction.mode === "acknowledge") {
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

  function updateBeats(frame: FeedbackFrame): void {
    const items = frame.beats;
    beatTracker.replaceChildren();
    if (items.length === 0) {
      beatTracker.hidden = true;
      return;
    }
    beatTracker.hidden = false;
    const title = el("h3", "feedback-beats__title", "Progress");
    const list = el("ol", "feedback-beats__list");
    for (const beat of items) {
      const item = el("li", "feedback-beats__item", beat.label);
      item.dataset.state = beat.state;
      list.append(item);
    }
    beatTracker.append(title, list);
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
  ): void {
    if (frame.seq < lastFrameSeq) {
      lastCueSeq = 0;
      lastAnnounced.clear();
    }
    lastFrameSeq = frame.seq;
    updateBeats(frame);
    announce(frame);

    const activeIds = new Set<string>();
    const items: LayoutItem[] = [];
    const entries: Array<{ node: HTMLElement; item: RenderableSurface }> = [];

    for (const item of [...frame.surfaces, ...frame.cues] as RenderableSurface[]) {
      const layer = layerFor(item.presentation);
      const node = createNode(item.id, item.presentation, layer);
      renderBody(node, item);
      activeIds.add(item.id);
      entries.push({ node, item });
      items.push({
        id: item.id,
        presentation: item.presentation,
        owner: item.owner,
        priority: item.priority,
        width: node.offsetWidth || 240,
        height: node.offsetHeight || 72,
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
      DEFAULT_SAFE_AREA,
    );
    const byId = new Map(layout.map((box) => [box.id, box]));
    for (const entry of entries) {
      const box = byId.get(entry.item.id);
      if (!box) continue;
      const layerElement = box.layer === "world" ? worldLayer : hudLayer;
      if (entry.node.parentElement !== layerElement) {
        layerElement.append(entry.node);
      }
      entry.node.style.transform = `translate3d(${Math.round(box.x)}px, ${Math.round(
        box.y,
      )}px, 0)`;
      entry.node.dataset.docked = String(box.docked);
    }
  }

  function clear(): void {
    for (const node of nodes.values()) node.remove();
    nodes.clear();
    signatures.clear();
    lastAnnounced.clear();
    lastCueSeq = 0;
    beatTracker.replaceChildren();
    beatTracker.hidden = true;
    live.textContent = "";
  }

  return { update, clear };
}
