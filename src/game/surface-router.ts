import type { FeedbackOwner, FeedbackSurface, PlayerId } from "../feedback";
import type { PlayerUiActions } from "../world/runtime-port";

export type RoutedSurfaceAction =
  | { type: "confirm"; surfaceId: string }
  | { type: "cancel"; surfaceId: string }
  | { type: "choose"; surfaceId: string; choiceId: string }
  | { type: "navigate"; surfaceId: string; delta: -1 | 1 };

export interface SurfaceRoute {
  consumed: boolean;
  action?: RoutedSurfaceAction;
}

export interface SurfaceRouteContext {
  hard: boolean;
  surfaces: readonly FeedbackSurface[];
  mode: "solo" | "co-op";
}

function effectiveOwner(
  owner: FeedbackOwner,
  mode: "solo" | "co-op",
): FeedbackOwner {
  if (mode === "solo" && owner === "p2") return "p1";
  return owner;
}

function ownedBy(
  surface: FeedbackSurface,
  playerId: PlayerId,
  mode: "solo" | "co-op",
): boolean {
  const owner = effectiveOwner(surface.owner, mode);
  return owner === playerId || owner === "shared";
}

function interactive(surface: FeedbackSurface): boolean {
  return surface.interaction.mode !== "none";
}

/**
 * Per-player soft-surface routing. Hard surfaces consume all input; soft
 * surfaces only consume their owner's (or shared) UI actions.
 */
export function routeSurfaceInput(
  context: SurfaceRouteContext,
  playerId: PlayerId,
  actions: PlayerUiActions,
): SurfaceRoute {
  if (context.hard) {
    return { consumed: true };
  }

  const candidates = [...context.surfaces]
    .filter(
      (surface) =>
        interactive(surface) && ownedBy(surface, playerId, context.mode),
    )
    .sort(
      (left, right) =>
        right.priority - left.priority || left.id.localeCompare(right.id),
    );

  for (const surface of candidates) {
    const choices = surface.content.choices ?? [];
    if (actions.choose !== null && choices.length > 0) {
      const choice = choices[actions.choose - 1];
      if (choice) {
        return {
          consumed: true,
          action: {
            type: "choose",
            surfaceId: surface.id,
            choiceId: choice.id,
          },
        };
      }
    }
    if (actions.cancel) {
      return {
        consumed: true,
        action: { type: "cancel", surfaceId: surface.id },
      };
    }
    if (choices.length > 0 && actions.navigateUp) {
      return {
        consumed: true,
        action: { type: "navigate", surfaceId: surface.id, delta: -1 },
      };
    }
    if (choices.length > 0 && actions.navigateDown) {
      return {
        consumed: true,
        action: { type: "navigate", surfaceId: surface.id, delta: 1 },
      };
    }
    if (actions.confirm) {
      return {
        consumed: true,
        action: { type: "confirm", surfaceId: surface.id },
      };
    }
  }

  return { consumed: false };
}

/** Stateful facade kept for the game runtime and future UI adapters. */
export class SurfaceInputRouter {
  constructor(private readonly context: SurfaceRouteContext) {}

  route(playerId: PlayerId, actions: PlayerUiActions): SurfaceRoute {
    return routeSurfaceInput(this.context, playerId, actions);
  }
}
