import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  PuzzleRuntime,
  replaySolution,
  type PuzzleDocument,
  type PuzzleRunState,
} from "../src/puzzle";
import {
  createFeedbackDirector,
  effectPresetIds,
  resolveEffectPreset,
  type EffectInstance,
  type EffectPlan,
  type FeedbackFrame,
  type FeedbackSurfaceSpec,
} from "../src/feedback";
import { emptyPlayerUiActions } from "../src/world/runtime-port";
import { routeSurfaceInput } from "../src/game/surface-router";
import { toWorldEffectPlan } from "../src/game/effect-mapper";
import {
  isMovementVisual,
  simplifyForReducedMotion,
  type WorldEffectPlan,
} from "../src/world/effect-types";

const LEVEL_DIR = new URL(
  "../public/packs/anatomy-reflex/levels/",
  import.meta.url,
);

function readPuzzle(levelId: string): PuzzleDocument {
  return JSON.parse(
    readFileSync(new URL(`${levelId}/puzzle.json`, LEVEL_DIR), "utf8"),
  ) as PuzzleDocument;
}

function project(
  document: PuzzleDocument,
  state: PuzzleRunState,
): FeedbackFrame {
  const director = createFeedbackDirector();
  director.projectSticky({ document, state });
  director.ingestAll([
    {
      kind: "puzzle.event",
      event: {
        type: "receptorRejected",
        nodeId:
          document.nodes.find((node) => node.type === "receptor")?.id ??
          document.nodes[0]!.id,
        message: "no prop on receptor",
      },
      actor: "p2",
      source: { kind: "entity", id: "receptor" },
    },
    {
      kind: "action.outcome",
      actor: "p1",
      action: "pickup",
      result: "accepted",
    },
  ]);
  director.tick(1 / 60);
  return director.frame();
}

function textOf(
  item: FeedbackFrame["surfaces"][number] | FeedbackFrame["cues"][number],
): string {
  return (item.content.text ?? item.a11y.textAlternative ?? "").trim();
}

function worldPlan(plan: EffectPlan): WorldEffectPlan {
  const instance: EffectInstance = {
    id: `${plan.id}:instance`,
    planId: plan.id,
    ownerSurfaceId: "surface",
    actor: plan.actor,
    owner: plan.owner,
    ...(plan.accent ? { accent: plan.accent } : {}),
    startedTick: 0,
    ageTicks: 0,
    stages: plan.stages,
    ...(plan.cancel ? { cancel: plan.cancel } : {}),
  };
  return toWorldEffectPlan(instance);
}

function conversationSurface(
  id: string,
  owner: "p1" | "p2",
): FeedbackSurfaceSpec & { id: string } {
  return {
    id,
    capability: "affordance",
    source: { kind: "entity", id: "agent" },
    actor: owner,
    owner,
    anchor: { kind: "entity", entityId: "agent" },
    presentation: "speechBubble",
    content: {
      text: `${owner.toUpperCase()} conversation`,
      choices: [
        { id: "yes", label: "Yes" },
        { id: "no", label: "No" },
      ],
    },
    state: "active",
    interaction: {
      mode: "choice",
      focus: "soft",
      movement: "freeze-owner",
    },
    priority: 90,
  };
}

describe("feedback accessibility", () => {
  it("gives every surface and cue a text or accessibility alternative", () => {
    for (const levelId of ["03-nerve-forest", "04-muscle-effector"]) {
      const document = readPuzzle(levelId);
      const initial = project(document, new PuzzleRuntime(document).snapshot());
      const solved = replaySolution(document);
      expect(solved.ok, levelId).toBe(true);
      const solvedFrame = project(document, solved.state);

      for (const frame of [initial, solvedFrame]) {
        for (const item of [...frame.surfaces, ...frame.cues]) {
          expect(textOf(item), `${levelId}:${item.id}`).not.toBe("");
        }
      }

      for (const cue of [...initial.cues, ...solvedFrame.cues]) {
        if (!cue.actor || cue.owner === "shared") continue;
        expect(cue.content.text, `${levelId}:${cue.cause}`).toContain(
          `${cue.actor.toUpperCase()}:`,
        );
        expect(cue.a11y.textAlternative).toBe(cue.content.text);
      }
    }
  });

  it("keeps every effect owned by a surface or cue with text", () => {
    for (const levelId of ["03-nerve-forest", "04-muscle-effector"]) {
      const document = readPuzzle(levelId);
      const solved = replaySolution(document);
      expect(solved.ok, levelId).toBe(true);
      const frame = project(document, solved.state);
      const owners = new Map(
        [...frame.surfaces, ...frame.cues].map((item) => [item.id, item]),
      );

      for (const effect of frame.effects) {
        const owner = owners.get(effect.ownerSurfaceId);
        expect(owner, `${levelId}:${effect.planId}`).toBeDefined();
        expect(textOf(owner!), `${levelId}:${effect.planId}`).not.toBe("");
      }
    }
  });

  it("simplifies every movement effect without changing surfaces or text", () => {
    const document = readPuzzle("04-muscle-effector");
    const solved = replaySolution(document);
    expect(solved.ok).toBe(true);
    const frame = project(document, solved.state);
    const surfacesBefore = frame.surfaces.map((surface) => ({
      id: surface.id,
      text: textOf(surface),
      presentation: surface.presentation,
    }));

    for (const effect of frame.effects) {
      const reduced = simplifyForReducedMotion(toWorldEffectPlan(effect));
      expect(
        reduced.stages.every((stage) => !isMovementVisual(stage.visual)),
        effect.planId,
      ).toBe(true);
      expect(reduced.actor).toBe(effect.actor);
    }

    expect(
      frame.surfaces.map((surface) => ({
        id: surface.id,
        text: textOf(surface),
        presentation: surface.presentation,
      })),
    ).toEqual(surfacesBefore);
  });

  it("gives every named preset a static reduced-motion fallback", () => {
    for (const presetId of effectPresetIds()) {
      const plan = resolveEffectPreset(presetId, {
        actor: "p1",
        owner: "p1",
        source: { kind: "entity", id: "source" },
        target: { kind: "entity", id: "target" },
        tileTarget: { kind: "tile", layer: "tiles", x: 2, y: 3 },
      });
      if (!plan) continue;
      const reduced = simplifyForReducedMotion(worldPlan(plan));
      expect(
        reduced.stages.every((stage) => !isMovementVisual(stage.visual)),
        presetId,
      ).toBe(true);
      expect(reduced.actor, presetId).toBe("p1");
    }
  });

  it("routes soft surfaces only to their owner", () => {
    const director = createFeedbackDirector();
    director.putSurface(conversationSurface("conversation:p1:agent", "p1"));
    director.putSurface(conversationSurface("conversation:p2:agent", "p2"));
    const surfaces = director.frame().surfaces;

    const p1 = routeSurfaceInput(
      { hard: false, surfaces, mode: "co-op" },
      "p1",
      { ...emptyPlayerUiActions(), confirm: true },
    );
    const p2 = routeSurfaceInput(
      { hard: false, surfaces, mode: "co-op" },
      "p2",
      { ...emptyPlayerUiActions(), confirm: true },
    );

    expect(p1.action?.surfaceId).toBe("conversation:p1:agent");
    expect(p2.action?.surfaceId).toBe("conversation:p2:agent");
  });

  it("does not mutate puzzle state while producing effects", () => {
    const document = readPuzzle("04-muscle-effector");
    const puzzle = new PuzzleRuntime(document);
    const before = puzzle.snapshot();
    const director = createFeedbackDirector();
    director.projectSticky({ document, state: before });
    director.ingest({
      kind: "puzzle.event",
      event: { type: "gateOpen", nodeId: "ca-gate", actorId: "p1" },
      actor: "p1",
      source: { kind: "entity", id: "ca-gate" },
    });

    for (let tick = 0; tick < 12; tick += 1) {
      director.tick(1 / 60);
      director.frame();
    }

    expect(puzzle.snapshot()).toEqual(before);
  });
});
