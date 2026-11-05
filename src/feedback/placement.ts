import type {
  FeedbackAnchor,
  FeedbackPlacement,
  FeedbackPresentation,
  FeedbackState,
} from "./types";

/**
 * Persistent state presentations that belong on a physical object. These are
 * rendered as compact world markers instead of text cards.
 */
export const WORLD_STATE_PRESENTATIONS: ReadonlySet<FeedbackPresentation> =
  new Set(["prompt", "stateSwap", "socketFill", "outline", "pathGlow"]);

/**
 * Persistent readouts that can be rendered as a compact HUD chip or, when the
 * node has a world anchor, as a progress ring on the object.
 */
export const READOUT_PRESENTATIONS: ReadonlySet<FeedbackPresentation> = new Set(
  ["hudMeter", "tracker"],
);

export type FeedbackVisualKind = "marker" | "ring" | "chip" | "card";

export function isWorldAnchor(anchor: FeedbackAnchor): boolean {
  switch (anchor.kind) {
    case "entity":
    case "player":
    case "world":
    case "tile":
    case "tileRegion":
      return true;
    case "node":
      return Boolean(anchor.entityId);
    case "hud":
    case "screen":
      return false;
  }
}

/**
 * Where a persistent surface should live. The default is intentionally
 * conservative: a surface with no spatial anchor is hidden rather than docked
 * into the play area as a floating text box.
 */
export function defaultPlacement(input: {
  presentation: FeedbackPresentation;
  anchor: FeedbackAnchor;
  state?: FeedbackState;
}): FeedbackPlacement {
  const { presentation, anchor, state } = input;

  if (presentation === "hudMeter") {
    if (state === "idle" || state === "available") return "hidden";
    return isWorldAnchor(anchor) ? "world" : "hud";
  }

  if (presentation === "tracker") {
    return "hud";
  }

  if (WORLD_STATE_PRESENTATIONS.has(presentation)) {
    return isWorldAnchor(anchor) ? "world" : "hidden";
  }

  if (presentation === "speechBubble" || presentation === "playerCaption") {
    return "world";
  }

  return "hud";
}

/** Renderer-level presentation form for a persistent surface. */
export function visualKind(input: {
  presentation: FeedbackPresentation;
  placement: FeedbackPlacement;
}): FeedbackVisualKind {
  if (input.placement === "world") {
    if (WORLD_STATE_PRESENTATIONS.has(input.presentation)) return "marker";
    if (READOUT_PRESENTATIONS.has(input.presentation)) return "ring";
    return "card";
  }
  if (
    input.placement === "hud" &&
    READOUT_PRESENTATIONS.has(input.presentation)
  ) {
    return "chip";
  }
  return "card";
}

export function isInspectableKind(kind: FeedbackVisualKind): boolean {
  return kind === "marker" || kind === "ring" || kind === "chip";
}
