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
  orderAndDedupe,
  projectSignal,
  type FeedbackCue,
  type FeedbackDirector,
  type FeedbackFrame,
  type FeedbackSurface,
} from "../src/feedback";

const LEVEL_DIR = new URL(
  "../public/packs/anatomy-reflex/levels/",
  import.meta.url,
);

function readPuzzle(levelId: string): PuzzleDocument {
  return JSON.parse(
    readFileSync(new URL(`${levelId}/puzzle.json`, LEVEL_DIR), "utf8"),
  ) as PuzzleDocument;
}

function initialState(document: PuzzleDocument): PuzzleRunState {
  return new PuzzleRuntime(document).snapshot();
}

function project(
  director: FeedbackDirector,
  document: PuzzleDocument,
  state: PuzzleRunState,
): FeedbackFrame {
  director.projectSticky({ document, state });
  director.tick(1 / 60);
  return director.frame();
}

function surfaceStates(frame: FeedbackFrame): Record<string, string> {
  return Object.fromEntries(
    frame.surfaces.map((surface) => [
      surface.id,
      `${surface.state}/${surface.presentation}`,
    ]),
  );
}

function makeSurface(
  id: string,
  priority: number,
  overrides: Partial<FeedbackSurface> = {},
): FeedbackSurface {
  return {
    id,
    source: { kind: "system", id },
    actor: null,
    owner: "shared",
    audience: "both",
    anchor: { kind: "hud" },
    presentation: "hudStatus",
    content: { text: id },
    state: "idle",
    severity: "neutral",
    lifetime: { sticky: true },
    interaction: { mode: "none", focus: "soft", movement: "free" },
    priority,
    a11y: { announce: false },
    ...overrides,
  };
}

function makeCue(
  cause: string,
  seq: number,
  priority: number,
): FeedbackCue {
  return {
    id: `fb:cue:${seq}`,
    seq,
    cause,
    source: { kind: "system", id: cause },
    actor: null,
    owner: "shared",
    audience: "both",
    anchor: { kind: "hud" },
    presentation: "hudStatus",
    content: { text: cause },
    state: "idle",
    severity: "neutral",
    priority,
    ttlTicks: 10,
    remainingTicks: 10,
    a11y: { announce: true },
  };
}

describe("feedback projection", () => {
  it("projects the initial 03 surfaces as a stable golden", () => {
    const document = readPuzzle("03-nerve-forest");
    const director = createFeedbackDirector();
    const frame = project(director, document, initialState(document));

    expect(surfaceStates(frame)).toEqual({
      "fb:barrier:behind-gate": "active/stateSwap",
      "fb:barrier:gate-exit": "idle/stateSwap",
      "fb:barrier:threshold-gate": "idle/stateSwap",
      "fb:counter:stimulus-counter": "idle/tracker",
      "fb:conductor:spike-relay": "idle/pathGlow",
      "fb:container:axon-entry": "idle/socketFill",
      "fb:container:terminal-zone": "idle/socketFill",
      "fb:binary:input-a": "available/stateSwap",
      "fb:binary:input-a-trigger": "available/stateSwap",
      "fb:binary:input-b": "available/stateSwap",
      "fb:binary:input-b-trigger": "available/stateSwap",
    });
    expect(frame.surfaces.every((surface) => surface.lifetime.sticky)).toBe(
      true,
    );
    expect(
      frame.surfaces.every((surface) => (surface.content.text ?? "").length > 0),
    ).toBe(true);
  });

  it("projects the initial 04 surfaces as a stable golden", () => {
    const document = readPuzzle("04-muscle-effector");
    const director = createFeedbackDirector();
    const frame = project(director, document, initialState(document));

    expect(surfaceStates(frame)).toEqual({
      "fb:barrier:ca-gate": "idle/stateSwap",
      "fb:barrier:muscle-gate": "idle/stateSwap",
      "fb:meter:ache-timer": "idle/hudMeter",
      "fb:meter:ca-timer": "idle/hudMeter",
      "fb:meter:pulse-terminal": "available/hudMeter",
      "fb:carrier:ach-packet": "available/outline",
      "fb:conductor:response-relay": "idle/pathGlow",
      "fb:container:nicotinic-receptor": "available/socketFill",
      "fb:container:wrong-receptor": "available/socketFill",
      "fb:binary:terminal-plate": "available/stateSwap",
    });
  });

  it("projects solved 03 and 04 states as stable goldens", () => {
    const director = createFeedbackDirector();

    const nerve = readPuzzle("03-nerve-forest");
    const nerveSolved = replaySolution(nerve);
    expect(nerveSolved.ok).toBe(true);
    const nerveFrame = project(director, nerve, nerveSolved.state);
    expect(
      Object.fromEntries(
        nerveFrame.surfaces.map((surface) => [surface.id, surface.state]),
      ),
    ).toEqual({
      "fb:barrier:behind-gate": "idle",
      "fb:barrier:gate-exit": "active",
      "fb:barrier:threshold-gate": "active",
      "fb:counter:stimulus-counter": "complete",
      "fb:conductor:spike-relay": "active",
      "fb:container:axon-entry": "idle",
      "fb:container:terminal-zone": "active",
      "fb:binary:input-a": "available",
      "fb:binary:input-a-trigger": "complete",
      "fb:binary:input-b": "available",
      "fb:binary:input-b-trigger": "complete",
    });

    const muscle = readPuzzle("04-muscle-effector");
    const muscleSolved = replaySolution(muscle);
    expect(muscleSolved.ok).toBe(true);
    const muscleFrame = project(director, muscle, muscleSolved.state);
    expect(
      Object.fromEntries(
        muscleFrame.surfaces.map((surface) => [surface.id, surface.state]),
      ),
    ).toEqual({
      "fb:barrier:ca-gate": "active",
      "fb:barrier:muscle-gate": "active",
      "fb:meter:ache-timer": "progress",
      "fb:meter:ca-timer": "complete",
      "fb:meter:pulse-terminal": "progress",
      "fb:carrier:ach-packet": "complete",
      "fb:conductor:response-relay": "active",
      "fb:container:nicotinic-receptor": "complete",
      "fb:container:wrong-receptor": "available",
      "fb:binary:terminal-plate": "available",
    });
  });

  it("is idempotent and removes stale surfaces", () => {
    const nerve = readPuzzle("03-nerve-forest");
    const muscle = readPuzzle("04-muscle-effector");
    const director = createFeedbackDirector();

    const first = project(director, nerve, initialState(nerve));
    const second = project(director, nerve, initialState(nerve));
    expect(second.surfaces.map((surface) => surface.id)).toEqual(
      first.surfaces.map((surface) => surface.id),
    );
    expect(new Set(second.surfaces.map((surface) => surface.id)).size).toBe(
      second.surfaces.length,
    );

    const switched = project(director, muscle, initialState(muscle));
    expect(switched.surfaces.some((surface) => surface.id.includes("input-a"))).toBe(
      false,
    );
    expect(
      switched.surfaces.some(
        (surface) => surface.id === "fb:binary:terminal-plate",
      ),
    ).toBe(true);
    expect(switched.surfaces).toHaveLength(10);
  });

  it("applies label, copy, and beat overrides", () => {
    const document = readPuzzle("04-muscle-effector");
    const solved = replaySolution(document);
    expect(solved.ok).toBe(true);
    const director = createFeedbackDirector();

    director.projectSticky({
      document,
      state: solved.state,
      overrides: {
        "ca-timer": {
          label: "Calcium window",
          text: "Calcium window is open.",
        },
      },
    });
    director.tick(1 / 60);
    const frame = director.frame();
    const timer = frame.surfaces.find(
      (surface) => surface.id === "fb:meter:ca-timer",
    );

    expect(timer?.content.text).toBe("Calcium window is open.");
    expect(frame.beats.find((beat) => beat.id === "beat:ca-timer")?.label).toBe(
      "Calcium window",
    );
  });

  it("rejects a document/state mismatch", () => {
    const document = readPuzzle("04-muscle-effector");
    const director = createFeedbackDirector();
    const state = initialState(document);

    expect(() =>
      director.projectSticky({
        document,
        state: { ...state, puzzleId: "different-puzzle" },
      }),
    ).toThrow(/FEEDBACK_PROJECTION_MISMATCH/);
  });

  it("resets all feedback state", () => {
    const document = readPuzzle("04-muscle-effector");
    const director = createFeedbackDirector();
    project(director, document, initialState(document));
    director.ingest({
      kind: "system.outcome",
      outcome: "level.complete",
      source: { kind: "system", id: "level" },
    });
    director.tick(1 / 60);
    expect(director.frame().surfaces.length).toBeGreaterThan(0);
    expect(director.frame().cues.length).toBeGreaterThan(0);

    director.reset();
    expect(director.frame()).toEqual({
      seq: 0,
      tick: 0,
      surfaces: [],
      cues: [],
      beats: [],
      effects: [],
    });
  });

  it("increments the frame sequence and tick on every tick", () => {
    const document = readPuzzle("03-nerve-forest");
    const director = createFeedbackDirector();
    director.projectSticky({ document, state: initialState(document) });
    director.tick(1 / 60);
    expect(director.frame()).toMatchObject({ seq: 1, tick: 1 });
    director.tick(1 / 60);
    expect(director.frame()).toMatchObject({ seq: 2, tick: 2 });
  });
});

describe("feedback facts and cues", () => {
  it("creates an attributed cue from a puzzle event", () => {
    const document = readPuzzle("04-muscle-effector");
    const director = createFeedbackDirector();
    project(director, document, initialState(document));

    director.ingest({
      kind: "puzzle.event",
      event: {
        type: "receptorRejected",
        nodeId: "nicotinic-receptor",
        message: "no prop on receptor",
      },
      actor: "p1",
      source: { kind: "entity", id: "nicotinic-receptor" },
    });
    director.tick(1 / 60);
    const frame = director.frame();
    const cue = frame.cues[0];

    expect(cue).toMatchObject({
      seq: 1,
      cause: "puzzle:receptorRejected:nicotinic-receptor::p1",
      actor: "p1",
      owner: "p1",
      audience: "both",
      anchor: { kind: "entity", entityId: "nicotinic-receptor" },
      presentation: "speechBubble",
      state: "blocked",
      reason: "empty",
      priority: 80,
      remainingTicks: 179,
    });
    expect(cue?.content.text).toContain("empty");
    expect(frame.seq).toBe(2);
    expect(frame.tick).toBe(2);
  });

  it("creates player captions and target bubbles for action outcomes", () => {
    const document = readPuzzle("04-muscle-effector");
    const director = createFeedbackDirector();
    project(director, document, initialState(document));

    director.ingestAll([
      {
        kind: "action.outcome",
        actor: "p1",
        action: "pickup",
        result: "accepted",
      },
      {
        kind: "action.outcome",
        actor: "p2",
        action: "place",
        result: "rejected",
        reason: "wrong-shape",
        target: { kind: "entity", id: "wrong-receptor" },
      },
    ]);
    director.tick(1 / 60);
    const frame = director.frame();
    const accepted = frame.cues.find((cue) => cue.actor === "p1");
    const rejected = frame.cues.find((cue) => cue.actor === "p2");

    expect(accepted).toMatchObject({
      owner: "p1",
      anchor: { kind: "player", playerId: "p1" },
      presentation: "playerCaption",
      state: "active",
    });
    expect(rejected).toMatchObject({
      owner: "p2",
      anchor: { kind: "entity", entityId: "wrong-receptor" },
      presentation: "speechBubble",
      state: "blocked",
      reason: "wrong-shape",
    });
    expect(rejected?.content.text).toContain("does not fit");
  });

  it("upserts and removes runtime-owned persistent surfaces", () => {
    const director = createFeedbackDirector();
    const spec = {
      id: "conversation:p1:agent-muscle",
      capability: "affordance" as const,
      source: { kind: "entity" as const, id: "agent-muscle" },
      actor: "p1" as const,
      owner: "p1" as const,
      anchor: { kind: "entity" as const, entityId: "agent-muscle" },
      presentation: "speechBubble" as const,
      content: { speaker: "Muscle Effector", text: "Hello" },
      state: "active" as const,
      priority: 90,
    };
    director.putSurface(spec);
    director.tick(1 / 60);
    expect(director.frame().surfaces).toHaveLength(1);

    director.putSurface({ ...spec, content: { text: "Updated" } });
    director.tick(1 / 60);
    expect(director.frame().surfaces).toHaveLength(1);
    expect(director.frame().surfaces[0]?.content.text).toBe("Updated");

    director.removeSurface(spec.id);
    director.tick(1 / 60);
    expect(director.frame().surfaces).toEqual([]);
  });

  it("keeps sticky projections from multiple puzzles", () => {
    const director = createFeedbackDirector();
    const nodeRun = readPuzzle("03-nerve-forest");
    const endplate = readPuzzle("04-muscle-effector");
    director.projectSticky({
      document: nodeRun,
      state: initialState(nodeRun),
    });
    director.projectSticky({
      document: endplate,
      state: initialState(endplate),
    });
    director.tick(1 / 60);
    const ids = director.frame().surfaces.map((surface) => surface.id);
    expect(ids).toEqual(
      expect.arrayContaining([
        "fb:puzzle-node-run:binary:input-a",
        "fb:puzzle-endplate-ferry:meter:ca-timer",
      ]),
    );
  });

  it("creates an owned speech bubble for a conversation start", () => {
    const director = createFeedbackDirector();
    director.ingest({
      kind: "conversation.start",
      actor: "p1",
      entityId: "agent-muscle",
      dialogueId: "dialogue-muscle",
    });
    director.tick(1 / 60);
    const cue = director.frame().cues[0];

    expect(cue).toMatchObject({
      owner: "p1",
      actor: "p1",
      anchor: { kind: "entity", entityId: "agent-muscle" },
      presentation: "speechBubble",
      state: "active",
    });
    expect(cue?.content.text).toContain("conversation started");
  });

  it("creates a shared HUD cue for a system outcome", () => {
    const director = createFeedbackDirector();
    director.ingest({
      kind: "system.outcome",
      outcome: "level.complete",
      source: { kind: "system", id: "level" },
    });
    director.tick(1 / 60);
    const cue = director.frame().cues[0];

    expect(cue).toMatchObject({
      actor: null,
      owner: "shared",
      anchor: { kind: "hud", slot: "top" },
      presentation: "hudStatus",
      state: "complete",
      severity: "positive",
    });
    expect(cue?.content.text).toBe("Level Complete");
  });

  it("keeps solved feedback shared even when the last actor is known", () => {
    const document = readPuzzle("04-muscle-effector");
    const director = createFeedbackDirector();
    project(director, document, initialState(document));
    director.ingest({
      kind: "puzzle.event",
      event: { type: "solved", nodeId: document.id },
      actor: "p1",
      source: { kind: "system", id: document.id },
    });
    director.tick(1 / 60);
    const cue = director.frame().cues[0];

    expect(cue).toMatchObject({
      actor: "p1",
      owner: "shared",
      anchor: { kind: "screen" },
      presentation: "screenCaption",
      state: "complete",
      priority: 100,
    });
  });

  it("keeps cue sequences monotonic and coalesces equal causes", () => {
    const director = createFeedbackDirector({ defaultCueTtlTicks: 3 });
    const fact = {
      kind: "system.outcome" as const,
      outcome: "level.complete",
      source: { kind: "system" as const, id: "level" },
    };

    director.ingest(fact);
    director.ingest(fact);
    director.tick(1 / 60);
    expect(director.frame().cues).toHaveLength(1);
    expect(director.frame().cues[0]).toMatchObject({ seq: 2, remainingTicks: 2 });

    director.ingest({
      kind: "action.outcome",
      actor: "p2",
      action: "pickup",
      result: "accepted",
    });
    director.tick(1 / 60);
    expect(director.frame().cues.map((cue) => cue.seq)).toEqual([2, 3]);
  });

  it("expires cues by tick TTL", () => {
    const director = createFeedbackDirector({ defaultCueTtlTicks: 2 });
    director.ingest({
      kind: "system.outcome",
      outcome: "saved",
      source: { kind: "system", id: "save" },
    });

    director.tick(1 / 60);
    expect(director.frame().cues[0]?.remainingTicks).toBe(1);
    director.tick(1 / 60);
    expect(director.frame().cues).toEqual([]);
  });

  it("orders and dedupes surfaces and cues deterministically", () => {
    const ordered = orderAndDedupe(
      [
        makeSurface("b", 10),
        makeSurface("a", 20),
        makeSurface("b", 30),
      ],
      [
        makeCue("same", 1, 50),
        makeCue("same", 2, 50),
        makeCue("other", 3, 60),
      ],
    );

    expect(ordered.surfaces.map((surface) => [surface.id, surface.priority])).toEqual([
      ["b", 30],
      ["a", 20],
    ]);
    expect(ordered.cues.map((cue) => [cue.cause, cue.seq])).toEqual([
      ["other", 3],
      ["same", 2],
    ]);
  });

  it("carries a custom signal's effect plans", () => {
    const surface = projectSignal({
      source: { kind: "system", id: "signal" },
      anchor: { kind: "screen" },
      capability: "outcome",
      state: "complete",
      content: { text: "Done" },
      effects: [
        {
          id: "fx.signal.complete",
          actor: null,
          owner: "shared",
          accent: "neutral",
        },
      ],
    });

    expect(surface.effects?.map((effect) => effect.id)).toEqual([
      "fx.signal.complete",
    ]);
    expect(surface.presentation).toBe("screenCaption");
  });
});
