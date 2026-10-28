import type {
  BeatSpec,
  FeedbackBeat,
  FeedbackBeatState,
} from "./types";
import type {
  PuzzleDocument,
  PuzzleNode,
  PuzzleNodeRunState,
  PuzzlePredicate,
  PuzzleRunState,
} from "../puzzle";
import { nodeLabel } from "./descriptors";

function predicateNodeIds(predicate: PuzzlePredicate): string[] {
  switch (predicate.type) {
    case "gateOpen":
      return [predicate.gateId];
    case "receptorBound":
      return [predicate.receptorId];
    case "platePressed":
      return [predicate.plateId];
    case "relayActive":
      return [predicate.relayId];
    case "timerElapsed":
      return [predicate.timerId];
    case "counterReached":
      return [predicate.counterId];
    case "zoneOccupied":
      return [predicate.zoneId];
    case "propState":
      return [predicate.propId];
    case "flagSet":
      return [];
    case "allOf":
    case "anyOf":
      return predicate.of.flatMap(predicateNodeIds);
    case "not":
      return predicateNodeIds(predicate.of);
  }
}

function collectWinNodes(document: PuzzleDocument): PuzzleNode[] {
  const needed = new Set<string>();

  const addUpstream = (nodeId: string): void => {
    if (needed.has(nodeId)) return;
    needed.add(nodeId);
    for (const link of document.links) {
      if (link.to === nodeId) {
        addUpstream(link.from);
      }
    }
  };

  for (const nodeId of predicateNodeIds(document.win)) {
    addUpstream(nodeId);
  }

  return document.nodes.filter((node) => needed.has(node.id));
}

function isNodeDone(node: PuzzleNode, state: PuzzleNodeRunState): boolean {
  switch (node.type) {
    case "prop":
      return state.state === "placed" || state.state === "docked";
    case "receptor":
      return state.state === "bound";
    case "pulseSource":
      return state.state === "cooldown" || state.remaining > 0;
    case "plate":
      return state.state === "pressed";
    case "relay":
      return state.active;
    case "gate":
      return state.state === "open";
    case "timer":
      return state.state === "elapsed";
    case "counter":
      return state.state === "reached" || state.count >= node.target;
    case "zone":
      return state.state === "occupied";
    case "trigger":
      return state.state === "fired" || state.state === "stopped";
  }
}

/**
 * Fallback beats come from the win predicate and its upstream links. Authored
 * beats take precedence when supplied.
 */
export function deriveBeatsFromWinGraph(
  document: PuzzleDocument,
  labels?: Readonly<Record<string, string>>,
): BeatSpec[] {
  return collectWinNodes(document).map((node) => ({
    id: `beat:${node.id}`,
    label: labels?.[node.id] ?? nodeLabel(node.id),
    nodes: [node.id],
  }));
}

export function deriveBeats(input: {
  document: PuzzleDocument;
  state: PuzzleRunState;
  beats?: readonly BeatSpec[];
  labels?: Readonly<Record<string, string>>;
}): FeedbackBeat[] {
  const specs =
    input.beats && input.beats.length > 0
      ? input.beats
      : deriveBeatsFromWinGraph(input.document, input.labels);

  const done = specs.map((spec) => {
    if (input.state.solved) return true;
    if (spec.nodes.length === 0) return false;
    return spec.nodes.every((nodeId) => {
      const node = input.document.nodes.find((entry) => entry.id === nodeId);
      const state = input.state.nodes[nodeId];
      return Boolean(node && state && isNodeDone(node, state));
    });
  });

  const activeIndex = done.findIndex((value) => !value);

  return specs.map((spec, index) => {
    const state: FeedbackBeatState = done[index]
      ? "done"
      : index === activeIndex
        ? "active"
        : "pending";
    return {
      id: spec.id,
      label: spec.label,
      state,
      nodes: spec.nodes,
    };
  });
}
