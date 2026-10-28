import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  PuzzleRuntime,
  type PuzzleDocument,
} from "../src/puzzle";
import {
  CAPABILITY_DEFAULTS,
  EFFECT_OPERATORS,
  EFFECT_PATH_KINDS,
  EFFECT_PRESETS,
  createFeedbackDirector,
  effectPresetIds,
  nodeEffectAnchor,
  nodeSurface,
  projectSignal,
  resolveEffectPreset,
  type AnchorRef,
  type EffectPlan,
  type FeedbackSurfaceSpec,
} from "../src/feedback";
import { entityAnchorPoint } from "../src/world/effect-types";

const LEVEL_DIR = new URL(
  "../public/packs/anatomy-reflex/levels/",
  import.meta.url,
);

function readPuzzle(levelId: string): PuzzleDocument {
  return JSON.parse(
    readFileSync(new URL(`${levelId}/puzzle.json`, LEVEL_DIR), "utf8"),
  ) as PuzzleDocument;
}

function ringPlan(
  id: string,
  options: {
    actor?: "p1" | "p2" | null;
    owner?: "p1" | "p2" | "shared";
    durationTicks?: number;
    persistent?: boolean;
    cancel?: "onSourceInactive" | "onTargetGone" | "manual";
    target?: AnchorRef;
  } = {},
): EffectPlan {
  const durationTicks = options.durationTicks ?? 2;
  return {
    id,
    actor: options.actor ?? null,
    owner: options.owner ?? "shared",
    accent:
      (options.owner ?? "shared") === "shared"
        ? "neutral"
        : (options.owner as "p1" | "p2"),
    stages: [
      {
        visual: { kind: "ring", radius: 18 },
        targets: [options.target ?? { kind: "entity", id: "source" }],
        timing: { durationTicks },
        lifetime:
          options.persistent === true
            ? { kind: "persistent", until: "sourceInactive" }
            : { kind: "oneShot" },
        binding: { follow: true },
        layer: "entities",
      },
    ],
    ...(options.cancel ? { cancel: options.cancel } : {}),
  };
}

function surface(
  id: string,
  effects: readonly EffectPlan[],
  overrides: Partial<FeedbackSurfaceSpec> = {},
): FeedbackSurfaceSpec & { id: string } {
  return {
    id,
    capability: "binary",
    source: { kind: "entity", id: "source" },
    actor: null,
    owner: "shared",
    audience: "both",
    anchor: { kind: "entity", entityId: "source" },
    presentation: "stateSwap",
    content: { text: "Signal" },
    state: "active",
    severity: "neutral",
    lifetime: { sticky: true },
    interaction: { mode: "none", focus: "soft", movement: "free" },
    priority: 50,
    a11y: { announce: false, textAlternative: "Signal" },
    effects,
    ...overrides,
  };
}

describe("feedback effect vocabulary", () => {
  it("keeps the operator and path sets closed", () => {
    expect([...EFFECT_OPERATORS].sort()).toEqual(
      [
        "beam",
        "decal",
        "dissolve",
        "orb",
        "particleBurst",
        "particleStream",
        "ring",
        "spriteSwap",
        "tileAlpha",
        "tileOverlay",
        "tileSequence",
        "tileSwap",
        "tileTint",
        "tint",
      ].sort(),
    );
    expect([...EFFECT_PATH_KINDS].sort()).toEqual(
      ["arc", "point", "polyline", "radial", "ray", "segment"].sort(),
    );
  });

  it("resolves every capability default and named preset", () => {
    for (const preset of Object.values(CAPABILITY_DEFAULTS)) {
      expect(Object.keys(EFFECT_PRESETS)).toContain(preset.effectPreset);
    }

    for (const presetId of effectPresetIds()) {
      const plan = resolveEffectPreset(presetId, {
        actor: "p1",
        owner: "p1",
        source: { kind: "entity", id: "source" },
        target: { kind: "entity", id: "target" },
        tileTarget: { kind: "tile", layer: "tiles", x: 2, y: 3 },
      });
      expect(plan, presetId).not.toBeNull();
      expect(plan?.stages.length, presetId).toBeGreaterThan(0);
      expect(plan?.actor, presetId).toBe("p1");
      expect(plan?.owner, presetId).toBe("p1");
      expect(plan?.accent, presetId).toBe("p1");
    }
  });

  it("builds an A-to-B pulse with follow binding", () => {
    const plan = resolveEffectPreset("fx.pulse.travel", {
      actor: "p2",
      owner: "p2",
      source: { kind: "entity", id: "terminal", socket: "muzzle" },
      target: { kind: "entity", id: "receptor", socket: "mouth" },
      durationTicks: 6,
    });

    expect(plan).not.toBeNull();
    expect(plan?.accent).toBe("p2");
    expect(plan?.stages[0]?.visual.kind).toBe("orb");
    expect(plan?.stages[0]?.binding.follow).toBe(true);
    expect(plan?.stages[0]?.path).toMatchObject({
      kind: "segment",
      from: { kind: "entity", id: "terminal", socket: "muzzle" },
      to: { kind: "entity", id: "receptor", socket: "mouth" },
    });
    expect(plan?.stages[1]?.targets).toEqual([
      { kind: "entity", id: "receptor", socket: "mouth" },
    ]);
  });

  it("attaches default sticky and signal effects without per-puzzle code", () => {
    const document = readPuzzle("04-muscle-effector");
    const prop = document.nodes.find((node) => node.type === "prop");
    if (!prop) throw new Error("prop missing");

    const active = nodeSurface({
      node: prop,
      capability: "carrier",
      state: "active",
      label: "ACh packet",
    });
    expect(active.effects?.[0]?.id).toBe("fx.carrier.glow:ach-packet");
    expect(active.effects?.[0]?.stages[0]?.lifetime?.kind).toBe("persistent");

    const available = nodeSurface({
      node: prop,
      capability: "carrier",
      state: "available",
      label: "ACh packet",
    });
    expect(available.effects).toBeUndefined();

    const overridden = nodeSurface({
      node: prop,
      capability: "carrier",
      state: "active",
      label: "ACh packet",
      effectPreset: "fx.ach.dissolve",
    });
    expect(overridden.effects?.[0]?.id).toBe("fx.ach.dissolve:ach-packet");

    const signal = projectSignal({
      source: { kind: "system", id: "solved" },
      actor: "p1",
      owner: "shared",
      anchor: { kind: "screen" },
      capability: "outcome",
      state: "complete",
      content: { text: "Solved" },
    });
    expect(signal.effects?.[0]?.id).toBe("fx.outcome.flash:system:solved");
    expect(signal.effects?.[0]?.accent).toBe("neutral");
  });
});

describe("feedback effect lifecycle", () => {
  it("spawns, ages, and expires a one-shot effect", () => {
    const director = createFeedbackDirector();
    director.putSurface(surface("s1", [ringPlan("fx.test", { durationTicks: 2 })]));

    director.tick(1 / 60);
    const first = director.frame();
    expect(first.effects.map((effect) => effect.planId)).toEqual(["fx.test"]);
    expect(first.effects[0]).toMatchObject({
      ownerSurfaceId: "s1",
      ageTicks: 0,
      remainingTicks: 2,
    });

    director.tick(1 / 60);
    expect(director.frame().effects[0]?.ageTicks).toBe(1);

    director.tick(1 / 60);
    expect(director.frame().effects).toEqual([]);
  });

  it("keeps P1 and P2 attribution separate", () => {
    const director = createFeedbackDirector();
    director.putSurface(
      surface("p1-surface", [ringPlan("fx.p1", { actor: "p1", owner: "p1" })], {
        actor: "p1",
        owner: "p1",
      }),
    );
    director.putSurface(
      surface("p2-surface", [ringPlan("fx.p2", { actor: "p2", owner: "p2" })], {
        actor: "p2",
        owner: "p2",
      }),
    );

    director.tick(1 / 60);
    const effects = director.frame().effects;
    expect(effects).toHaveLength(2);
    expect(effects.find((effect) => effect.planId === "fx.p1")).toMatchObject({
      actor: "p1",
      owner: "p1",
      accent: "p1",
    });
    expect(effects.find((effect) => effect.planId === "fx.p2")).toMatchObject({
      actor: "p2",
      owner: "p2",
      accent: "p2",
    });
  });

  it("keeps a shared gate burst neutral", () => {
    const document = readPuzzle("03-nerve-forest");
    const director = createFeedbackDirector();
    director.projectSticky({
      document,
      state: new PuzzleRuntime(document).snapshot(),
    });
    director.ingest({
      kind: "puzzle.event",
      event: { type: "gateOpen", nodeId: "threshold-gate", actorId: "p1" },
      actor: "p1",
      source: { kind: "entity", id: "gate-threshold" },
    });
    director.tick(1 / 60);

    const cue = director
      .frame()
      .cues.find((item) => item.cause.startsWith("puzzle:gateOpen"));
    expect(cue).toMatchObject({ actor: "p1", owner: "shared" });
    const burst = director
      .frame()
      .effects.find((effect) => effect.planId.startsWith("fx.gate.burst"));
    expect(burst).toMatchObject({
      actor: "p1",
      owner: "shared",
      accent: "neutral",
    });
  });

  it("cancels persistent effects when the source becomes inactive", () => {
    const director = createFeedbackDirector();
    director.putSurface(
      surface("persistent", [
        ringPlan("fx.persistent", { persistent: true, cancel: "onSourceInactive" }),
      ]),
    );
    director.tick(1 / 60);
    expect(director.frame().effects).toHaveLength(1);

    director.putSurface(
      surface("persistent", [], {
        state: "idle",
      }),
    );
    director.tick(1 / 60);
    expect(director.frame().effects).toEqual([]);
  });

  it("cancels on target loss through the injected predicate", () => {
    let alive = true;
    const director = createFeedbackDirector({
      isAnchorAlive: (anchor) =>
        anchor.kind !== "entity" || anchor.id !== "target" || alive,
    });
    director.putSurface(
      surface("target-surface", [
        ringPlan("fx.target", {
          persistent: true,
          cancel: "onTargetGone",
          target: { kind: "entity", id: "target" },
        }),
      ]),
    );
    director.tick(1 / 60);
    expect(director.frame().effects).toHaveLength(1);

    alive = false;
    director.tick(1 / 60);
    expect(director.frame().effects).toEqual([]);
  });

  it("does not mutate puzzle simulation state", () => {
    const document = readPuzzle("04-muscle-effector");
    const puzzle = new PuzzleRuntime(document);
    const before = puzzle.snapshot();

    const director = createFeedbackDirector();
    director.putSurface(surface("s1", [ringPlan("fx.test", { durationTicks: 4 })]));
    for (let tick = 0; tick < 8; tick += 1) {
      director.tick(1 / 60);
      director.frame();
    }

    expect(puzzle.snapshot()).toEqual(before);
  });

  it("uses node-type sockets for effect anchors and falls back to centre", () => {
    const document = readPuzzle("04-muscle-effector");
    const pulse = document.nodes.find((node) => node.id === "pulse-terminal");
    const receptor = document.nodes.find(
      (node) => node.id === "nicotinic-receptor",
    );
    const gate = document.nodes.find((node) => node.id === "ca-gate");
    if (!pulse || !receptor || !gate) throw new Error("fixture nodes missing");

    expect(nodeEffectAnchor(pulse)).toEqual({
      kind: "entity",
      id: "motor-terminal",
      socket: "muzzle",
    });
    expect(nodeEffectAnchor(receptor)).toEqual({
      kind: "entity",
      id: "nicotinic-receptor",
      socket: "mouth",
    });
    expect(nodeEffectAnchor(gate)).toEqual({
      kind: "entity",
      id: "ca-gate",
      socket: "center",
    });
    expect(
      entityAnchorPoint(36, 36, undefined, "muzzle"),
    ).toEqual({ x: 18, y: 18 });
    expect(
      entityAnchorPoint(
        36,
        36,
        { center: { x: 18, y: 18 }, muzzle: { x: 32, y: 16 } },
        "missing",
      ),
    ).toEqual({ x: 18, y: 18 });
  });

  it("routes sticky receptor effects through the mouth socket", () => {
    const document = readPuzzle("04-muscle-effector");
    const receptor = document.nodes.find(
      (node) => node.id === "nicotinic-receptor",
    );
    if (!receptor) throw new Error("receptor missing");

    const projected = nodeSurface({
      node: receptor,
      capability: "container",
      state: "complete",
      label: "Nicotinic receptor",
    });
    expect(projected.effects?.[0]?.stages[0]?.targets?.[0]).toEqual({
      kind: "entity",
      id: "nicotinic-receptor",
      socket: "mouth",
    });
  });

  it("uses the authored tile region with byIndex when there is no source", () => {
    const document = readPuzzle("03-nerve-forest");
    const relay = document.nodes.find((node) => node.id === "spike-relay");
    if (!relay) throw new Error("relay missing");
    const tileTarget = {
      kind: "tileRegion" as const,
      layer: "tiles",
      x1: 19,
      y1: 20,
      x2: 33,
      y2: 20,
    };

    const projected = nodeSurface({
      node: relay,
      capability: "conductor",
      state: "active",
      label: "Axon relay",
      effectPreset: "fx.tile.path",
      tileTarget,
    });
    expect(projected.effects?.[0]?.id).toBe("fx.tile.path:spike-relay");
    expect(projected.effects?.[0]?.stages[0]?.visual).toEqual({
      kind: "tileTint",
      target: tileTarget,
      color: "#ffd166",
      revert: true,
    });
    expect(projected.effects?.[0]?.stages[0]?.timing.stagger).toEqual({
      kind: "byIndex",
      ticks: 1,
    });
  });

  it("keeps ACh dissolve visible without the prop sprite", () => {
    const plan = resolveEffectPreset("fx.ach.dissolve", {
      actor: "p1",
      owner: "p1",
      source: { kind: "entity", id: "ach-packet" },
    });
    expect(plan).not.toBeNull();
    expect(plan?.actor).toBe("p1");
    expect(plan?.owner).toBe("p1");
    expect(plan?.accent).toBe("p1");
    expect(plan?.stages.map((stage) => stage.visual.kind)).toEqual([
      "ring",
      "particleBurst",
    ]);
    expect(
      plan?.stages.every(
        (stage) => stage.visual.kind !== "dissolve",
      ),
    ).toBe(true);
    expect(plan?.stages[0]?.targets).toEqual([
      { kind: "entity", id: "ach-packet" },
    ]);
  });

  it("emits the muscle wave from the gate centre", () => {
    const plan = resolveEffectPreset("fx.muscle.wave", {
      actor: null,
      owner: "shared",
      source: { kind: "entity", id: "muscle-gate", socket: "center" },
    });
    expect(plan?.stages[0]?.visual.kind).toBe("particleStream");
    expect(plan?.stages[0]?.source?.anchor).toEqual({
      kind: "entity",
      id: "muscle-gate",
      socket: "center",
    });
  });
});
