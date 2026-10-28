import { describe, expect, it } from "vitest";
import { emptyPlayerUiActions } from "../src/world/runtime-port";
import type { FeedbackSurface } from "../src/feedback";
import { routeSurfaceInput } from "../src/game/surface-router";

function surface(
  id: string,
  owner: FeedbackSurface["owner"],
  options: Partial<FeedbackSurface> = {},
): FeedbackSurface {
  return {
    id,
    source: { kind: "entity", id },
    actor: owner === "shared" ? null : owner,
    owner,
    audience: "both",
    anchor: { kind: "entity", entityId: id },
    presentation: "speechBubble",
    content: {
      text: id,
      choices: [
        { id: "a", label: "A" },
        { id: "b", label: "B" },
      ],
    },
    state: "active",
    severity: "neutral",
    lifetime: { sticky: true },
    interaction: {
      mode: "choice",
      focus: "soft",
      movement: "freeze-owner",
    },
    priority: 90,
    a11y: { announce: false },
    ...options,
  };
}

const context = (surfaces: FeedbackSurface[], mode: "solo" | "co-op" = "co-op") => ({
  hard: false,
  surfaces,
  mode,
});

describe("surface input router", () => {
  it("hard surfaces consume all input", () => {
    const route = routeSurfaceInput(
      { hard: true, surfaces: [], mode: "co-op" },
      "p1",
      { ...emptyPlayerUiActions(), confirm: true },
    );
    expect(route).toEqual({ consumed: true });
  });

  it("soft surfaces consume only their owner's actions", () => {
    const p1Surface = surface("conversation:p1:agent", "p1");
    expect(
      routeSurfaceInput(context([p1Surface]), "p1", {
        ...emptyPlayerUiActions(),
        confirm: true,
      }),
    ).toMatchObject({
      consumed: true,
      action: { type: "confirm", surfaceId: "conversation:p1:agent" },
    });
    expect(
      routeSurfaceInput(context([p1Surface]), "p2", {
        ...emptyPlayerUiActions(),
        confirm: true,
      }),
    ).toEqual({ consumed: false });
  });

  it("lets either player drive a shared surface", () => {
    const shared = surface("fb:stuck", "shared");
    for (const player of ["p1", "p2"] as const) {
      expect(
        routeSurfaceInput(context([shared]), player, {
          ...emptyPlayerUiActions(),
          confirm: true,
        }),
      ).toMatchObject({ consumed: true });
    }
  });

  it("falls back to P1 ownership in solo mode", () => {
    const p2Surface = surface("conversation:p2:agent", "p2");
    expect(
      routeSurfaceInput(context([p2Surface], "solo"), "p1", {
        ...emptyPlayerUiActions(),
        confirm: true,
      }),
    ).toMatchObject({ consumed: true });
  });

  it("routes navigation and direct choice selection", () => {
    const p1Surface = surface("conversation:p1:agent", "p1");
    expect(
      routeSurfaceInput(context([p1Surface]), "p1", {
        ...emptyPlayerUiActions(),
        navigateDown: true,
      }),
    ).toMatchObject({
      consumed: true,
      action: { type: "navigate", delta: 1 },
    });
    expect(
      routeSurfaceInput(context([p1Surface]), "p1", {
        ...emptyPlayerUiActions(),
        choose: 2,
      }),
    ).toMatchObject({
      consumed: true,
      action: { type: "choose", choiceId: "b" },
    });
  });

  it("does not consume input for non-interactive state surfaces", () => {
    const state = surface("fb:barrier:gate", "shared", {
      presentation: "stateSwap",
      interaction: { mode: "none", focus: "soft", movement: "free" },
      content: { text: "Gate is open" },
    });
    expect(
      routeSurfaceInput(context([state]), "p1", {
        ...emptyPlayerUiActions(),
        confirm: true,
      }),
    ).toEqual({ consumed: false });
  });
});
