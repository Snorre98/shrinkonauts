import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  EVENT_LINKS,
  PuzzleRuntime,
  replaySolution,
  type PuzzleDocument,
  type PuzzleEventType,
  type PuzzleLinkType,
  type PuzzleNode,
  type PuzzleNodeRunState,
  type PuzzleNodeType,
} from "../src/puzzle";
import {
  CAPABILITY_DEFAULTS,
  EVENT_COVERAGE,
  FEEDBACK_CAPABILITIES,
  FEEDBACK_STATES,
  LINK_FEEDBACK,
  NODE_FEEDBACK,
  REJECTION_REASONS,
  eventCueCoverage,
  feedbackLexicon,
  nodeAnchor,
  nodeLabel,
  nodeSurface,
  type FeedbackCapability,
  type NodeFeedbackDescriptor,
} from "../src/feedback";

const LEVEL_DIR = new URL(
  "../public/packs/anatomy-reflex/levels/",
  import.meta.url,
);

const NODE_TYPES: readonly PuzzleNodeType[] = [
  "prop",
  "receptor",
  "pulseSource",
  "plate",
  "relay",
  "gate",
  "timer",
  "counter",
  "zone",
  "trigger",
];

const LINK_TYPES: readonly PuzzleLinkType[] = [
  "pulse",
  "bind",
  "press",
  "release",
  "enter",
  "exit",
  "increment",
  "start",
  "stop",
  "reset",
  "elapsed",
  "reached",
  "activate",
  "deactivate",
  "open",
  "close",
  "clear",
];

const EVENT_TYPES = Object.keys(EVENT_LINKS) as PuzzleEventType[];

function readPuzzle(levelId: string): PuzzleDocument {
  return JSON.parse(
    readFileSync(new URL(`${levelId}/puzzle.json`, LEVEL_DIR), "utf8"),
  ) as PuzzleDocument;
}

function sampleNodes(): Map<
  PuzzleNodeType,
  { node: PuzzleNode; state: PuzzleNodeRunState; document: PuzzleDocument }
> {
  const samples = new Map<
    PuzzleNodeType,
    { node: PuzzleNode; state: PuzzleNodeRunState; document: PuzzleDocument }
  >();

  for (const levelId of ["03-nerve-forest", "04-muscle-effector"]) {
    const document = readPuzzle(levelId);
    const state = new PuzzleRuntime(document).snapshot();
    for (const node of document.nodes) {
      if (!samples.has(node.type)) {
        const nodeState = state.nodes[node.id];
        if (nodeState) {
          samples.set(node.type, { node, state: nodeState, document });
        }
      }
    }
  }

  return samples;
}

describe("feedback descriptor coverage", () => {
  it("has an exhaustive node descriptor table", () => {
    expect(Object.keys(NODE_FEEDBACK).sort()).toEqual([...NODE_TYPES].sort());

    for (const type of NODE_TYPES) {
      const descriptor = NODE_FEEDBACK[type];
      expect(descriptor.capabilities.length, type).toBeGreaterThan(0);
      for (const capability of descriptor.capabilities) {
        expect(FEEDBACK_CAPABILITIES, type).toContain(capability);
      }
    }
  });

  it("has an exhaustive link descriptor table", () => {
    expect(Object.keys(LINK_FEEDBACK).sort()).toEqual([...LINK_TYPES].sort());

    for (const type of LINK_TYPES) {
      const descriptor = LINK_FEEDBACK[type];
      expect(descriptor.capabilities.length, type).toBeGreaterThan(0);
      for (const capability of descriptor.capabilities) {
        expect(FEEDBACK_CAPABILITIES, type).toContain(capability);
      }
    }
  });

  it("has defaults for every capability", () => {
    for (const capability of FEEDBACK_CAPABILITIES) {
      const defaults = CAPABILITY_DEFAULTS[capability];
      expect(defaults.presentation, capability).toBeTruthy();
      expect(defaults.anchor, capability).toBeTruthy();
      expect(defaults.effectPreset, capability).toMatch(/^fx\./);
    }
  });

  it("has a cue or explicit silent reason for every event type", () => {
    expect(Object.keys(EVENT_COVERAGE).sort()).toEqual([...EVENT_TYPES].sort());

    for (const eventType of EVENT_TYPES) {
      const coverage = EVENT_COVERAGE[eventType];
      if (coverage.kind === "cue") {
        expect(
          FEEDBACK_CAPABILITIES,
          eventType,
        ).toContain(coverage.recipe.capability);
      } else {
        expect(coverage.reason.trim().length, eventType).toBeGreaterThan(0);
      }
    }

    expect(EVENT_COVERAGE.pulse.kind).toBe("silent");
  });

  it("resolves every event emitted by the 03 and 04 solution replays", () => {
    for (const levelId of ["03-nerve-forest", "04-muscle-effector"]) {
      const document = readPuzzle(levelId);
      const solved = replaySolution(document);
      expect(solved.ok, levelId).toBe(true);
      expect(solved.events.length, levelId).toBeGreaterThan(0);

      for (const event of solved.events) {
        const coverage = eventCueCoverage(document, event);
        expect(
          coverage.kind,
          `${levelId}:${event.type}:${event.nodeId}`,
        ).toBe("cue");
      }
    }
  });

  it("maps prop clearance to an ACh dissolve cue", () => {
    expect(EVENT_COVERAGE.propCleared).toMatchObject({
      kind: "cue",
      recipe: {
        capability: "carrier",
        state: "expired",
        reason: "cleared",
        severity: "neutral",
        effectPreset: "fx.ach.dissolve",
      },
    });
    expect(LINK_FEEDBACK.clear.capabilities).toContain("carrier");
    expect(LINK_FEEDBACK.clear.cues?.clear?.reason).toBe("cleared");

    const document = readPuzzle("04-muscle-effector");
    const coverage = eventCueCoverage(document, {
      type: "propCleared",
      nodeId: "ach-packet",
      propId: "ach-packet",
    });
    expect(coverage.kind).toBe("cue");
    if (coverage.kind === "cue") {
      expect(coverage.recipe.effectPreset).toBe("fx.ach.dissolve");
    }
  });

  it("uses node cues and keeps pulse explicitly silent", () => {    const document = readPuzzle("04-muscle-effector");
    const rejected = eventCueCoverage(document, {
      type: "receptorRejected",
      nodeId: "nicotinic-receptor",
      message: "no prop on receptor",
    });
    expect(rejected.kind).toBe("cue");
    if (rejected.kind === "cue") {
      expect(rejected.recipe.presentation).toBe("speechBubble");
    }

    expect(
      eventCueCoverage(document, {
        type: "pulse",
        nodeId: "pulse-terminal",
      }).kind,
    ).toBe("silent");
  });

  it("projects a persistent surface for every sample node type", () => {
    const samples = sampleNodes();
    expect([...samples.keys()].sort()).toEqual([...NODE_TYPES].sort());

    for (const type of NODE_TYPES) {
      const sample = samples.get(type);
      if (!sample) throw new Error(`missing sample node for ${type}`);
      const descriptor = NODE_FEEDBACK[type] as NodeFeedbackDescriptor;
      const context = {
        anchor: nodeAnchor(sample.node),
        label: nodeLabel(sample.node.id),
      };
      const specs = descriptor.project(sample.node, sample.state, context);

      expect(specs.length, type).toBeGreaterThan(0);
      expect(
        specs.every((spec) => spec.lifetime?.sticky === true),
        type,
      ).toBe(true);
      expect(
        specs.every((spec) => (spec.content.text ?? "").length > 0),
        type,
      ).toBe(true);
    }
  });

  it("produces text, icon, and audio for every state and reason", () => {
    for (const capability of FEEDBACK_CAPABILITIES) {
      for (const state of FEEDBACK_STATES) {
        const entry = feedbackLexicon({ capability, state });
        expect(entry.text.trim().length, `${capability}:${state}`).toBeGreaterThan(
          0,
        );
        expect(entry.icon.trim().length, `${capability}:${state}`).toBeGreaterThan(
          0,
        );
        expect(
          entry.audioCue.trim().length,
          `${capability}:${state}`,
        ).toBeGreaterThan(0);
      }

      for (const reason of REJECTION_REASONS) {
        const entry = feedbackLexicon({
          capability,
          state: "blocked",
          reason,
          labels: { subject: "Gate", actor: "P1" },
        });
        expect(entry.text.startsWith("P1: "), `${capability}:${reason}`).toBe(
          true,
        );
        expect(entry.text).not.toContain("{subject}");
        expect(entry.audioCue).toBe(`feedback.reject.${reason}`);
      }
    }
  });

  it("gives a dummy new type all capability surfaces without UI, world, or audio", () => {
    const sample = sampleNodes().get("plate");
    if (!sample) throw new Error("missing plate sample");
    const label = "Dummy Terminal";

    const dummy: NodeFeedbackDescriptor = {
      capabilities: ["affordance", "binary", "counter", "outcome"],
      project(node, _state, context) {
        const subject = context?.label ?? label;
        return [
          nodeSurface({
            node,
            capability: "affordance",
            state: "available",
            label: subject,
          }),
          nodeSurface({
            node,
            capability: "binary",
            state: "active",
            label: subject,
          }),
          nodeSurface({
            node,
            capability: "counter",
            state: "progress",
            label: subject,
            progress: { value: 1, max: 2 },
          }),
          nodeSurface({
            node,
            capability: "outcome",
            state: "complete",
            label: subject,
          }),
        ];
      },
    };

    const specs = dummy.project(sample.node, sample.state, {
      anchor: nodeAnchor(sample.node),
      label,
    });

    expect(specs.map((spec) => spec.capability)).toEqual([
      "affordance",
      "binary",
      "counter",
      "outcome",
    ]);
    expect(specs.every((spec) => spec.lifetime?.sticky === true)).toBe(true);
    expect(
      specs.every((spec) =>
        spec.content.text?.startsWith(label),
      ),
    ).toBe(true);
    expect(specs[2]?.content.progress).toEqual({ value: 1, max: 2 });

    for (const spec of specs) {
      const capability = spec.capability as FeedbackCapability;
      expect(CAPABILITY_DEFAULTS[capability].presentation).toBe(
        spec.presentation,
      );
      expect(CAPABILITY_DEFAULTS[capability].effectPreset).toMatch(/^fx\./);
    }
  });
});
