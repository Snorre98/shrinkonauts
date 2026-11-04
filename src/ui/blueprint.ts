import type { ResolvedAsset } from "../assets";
import type {
  BlueprintComponentView,
  BlueprintEdgeView,
  BlueprintView,
} from "./model";

export interface BlueprintUiOptions {
  onOpen: () => void;
  resolveSymbol?: (symbol: string) => ResolvedAsset | null;
}

export interface BlueprintUi {
  update(view: BlueprintView | null): void;
}

const GLYPH_CODES: Record<string, string> = {
  inputs: "IN",
  threshold: "TH",
  flow: "FL",
  terminal: "TE",
  gate: "GT",
  relay: "RL",
  timer: "TM",
  carry: "CR",
  receptor: "RC",
  pulse: "PL",
  clear: "CL",
  goal: "GO",
  check: "✓",
  lock: "LK",
  unknown: "?",
};

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

export function glyphCode(symbol: string): string {
  const tail = symbol.split(".").pop() ?? "";
  return GLYPH_CODES[tail] ?? (tail.slice(0, 2).toUpperCase() || "?");
}

function stateLabel(state: BlueprintComponentView["state"]): string {
  if (state === "done") return "Done";
  if (state === "active") return "Active";
  return "Pending";
}

function actorLabel(actor: BlueprintComponentView["actor"]): string | null {
  if (!actor) return null;
  if (actor === "both") return "P1 + P2";
  if (actor === "shared") return "Shared";
  return actor.toUpperCase();
}

function glyphNode(
  component: BlueprintComponentView,
  options: BlueprintUiOptions,
): HTMLElement {
  const resolved = options.resolveSymbol?.(component.symbol) ?? null;
  if (resolved?.src) {
    const glyph = el("span", "blueprint__glyph blueprint__glyph--image");
    glyph.style.backgroundImage = `url("${resolved.src}")`;
    glyph.setAttribute("aria-hidden", "true");
    return glyph;
  }

  const glyph = el("span", "blueprint__glyph", glyphCode(component.symbol));
  glyph.setAttribute("aria-hidden", "true");
  return glyph;
}

function actorMarker(component: BlueprintComponentView): HTMLElement | null {
  if (!component.actor) return null;
  const marker = el(
    "span",
    `blueprint__actor blueprint__actor--${component.actor}`,
  );
  marker.setAttribute("aria-hidden", "true");
  if (component.actor === "p1" || component.actor === "p2") {
    marker.textContent = component.actor.toUpperCase();
  } else if (component.actor === "both") {
    marker.append(
      el("span", "blueprint__actor-dot blueprint__actor-dot--p1"),
      el("span", "blueprint__actor-dot blueprint__actor-dot--p2"),
    );
  } else {
    marker.textContent = "◆";
  }
  return marker;
}

function tooltipText(component: BlueprintComponentView): string {
  const parts = [
    component.label ?? component.id,
    stateLabel(component.state),
  ];
  const actor = actorLabel(component.actor);
  if (actor) parts.push(actor);
  return parts.join(" · ");
}

function edgeBetween(
  view: BlueprintView,
  from: string,
  to: string,
): BlueprintEdgeView | undefined {
  return view.edges.find((edge) => edge.from === from && edge.to === to);
}

function connector(edge: BlueprintEdgeView | undefined): HTMLElement {
  const node = el("span", "blueprint__connector");
  node.dataset.state = edge?.state ?? "pending";
  node.dataset.type = edge?.type ?? "flow";
  node.setAttribute("aria-hidden", "true");
  return node;
}

function compactComponent(
  view: BlueprintView,
  component: BlueprintComponentView,
  index: number,
  options: BlueprintUiOptions,
): HTMLElement[] {
  const button = el("button", "blueprint__component");
  button.type = "button";
  button.dataset.state = component.state;
  button.dataset.actor = component.actor ?? "none";
  button.setAttribute(
    "aria-label",
    `${tooltipText(component)}. Open blueprint.`,
  );
  const tooltipId = `blueprint-tooltip-${component.id.replace(/[^a-zA-Z0-9_-]/g, "-")}`;
  button.setAttribute("aria-describedby", tooltipId);
  button.addEventListener("click", () => options.onOpen());

  const glyph = glyphNode(component, options);
  const actor = actorMarker(component);
  const tooltip = el("span", "blueprint__tooltip", tooltipText(component));
  tooltip.id = tooltipId;
  tooltip.setAttribute("role", "tooltip");
  button.append(glyph, ...(actor ? [actor] : []), tooltip);

  const next = view.components[index + 1];
  if (!next) return [button];
  return [button, connector(edgeBetween(view, component.id, next.id))];
}

/**
 * Compact header blueprint. Every component is a button so hover, keyboard
 * focus, tooltip discovery, and "open the Tab popup" share the same target.
 */
export function mountCompactBlueprint(
  root: HTMLElement,
  options: BlueprintUiOptions,
): BlueprintUi {
  let signature = "";
  const openButton = el("button", "blueprint__minimal-open", "Blueprint");
  openButton.type = "button";
  openButton.setAttribute("aria-label", "Open blueprint");
  openButton.addEventListener("click", () => options.onOpen());

  function update(view: BlueprintView | null): void {
    root.hidden = !view || view.components.length === 0;
    if (!view || view.components.length === 0) {
      signature = "";
      root.replaceChildren(openButton);
      return;
    }
    const nextSignature = JSON.stringify(view);
    if (nextSignature === signature) return;
    signature = nextSignature;

    const chain = el("div", "blueprint blueprint--compact");
    chain.setAttribute("role", "group");
    chain.setAttribute("aria-label", "Blueprint");
    const strip = el("div", "blueprint__chain");
    strip.append(
      ...view.components.flatMap((component, index) =>
        compactComponent(view, component, index, options),
      ),
    );
    chain.append(strip);
    root.replaceChildren(openButton, chain);
  }

  return { update };
}

function expandedComponent(
  view: BlueprintView,
  component: BlueprintComponentView,
  index: number,
  options: BlueprintUiOptions,
): HTMLElement {
  const item = el("li", "blueprint__expanded-component");
  item.dataset.state = component.state;
  item.dataset.actor = component.actor ?? "none";
  const next = view.components[index + 1];
  if (next) {
    const edge = edgeBetween(view, component.id, next.id);
    item.dataset.edgeState = edge?.state ?? "pending";
    item.dataset.edgeType = edge?.type ?? "flow";
  }

  const body = el("div", "blueprint__expanded-body");
  body.append(glyphNode(component, options));
  const copy = el("div", "blueprint__expanded-copy");
  copy.append(
    el("span", "blueprint__expanded-label", component.label ?? component.id),
    el("span", "blueprint__expanded-state", stateLabel(component.state)),
  );
  const actor = actorLabel(component.actor);
  if (actor) {
    copy.append(el("span", "blueprint__expanded-actor", actor));
  }
  body.append(copy);
  item.append(body);
  return item;
}

/** Expanded, labelled blueprint used by the Tab popup. */
export function renderExpandedBlueprint(
  view: BlueprintView | null,
  options: BlueprintUiOptions = { onOpen: () => undefined },
): HTMLElement {
  const root = el("div", "blueprint blueprint--expanded");
  if (!view) {
    root.append(
      el("p", "overlay__hint", "No active puzzle blueprint in this room."),
    );
    return root;
  }

  root.append(el("h3", "blueprint__title", view.title));
  const list = el("ol", "blueprint__expanded-list");
  list.append(
    ...view.components.map((component, index) =>
      expandedComponent(view, component, index, options),
    ),
  );
  root.append(list);
  return root;
}
