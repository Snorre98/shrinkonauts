import {
  deriveBeats,
  type FeedbackBeat,
} from "../feedback";
import type {
  LevelBlueprint,
  LevelBlueprintActor,
  LevelBlueprintEdge,
  LevelBlueprintStep,
  LevelDocument,
} from "../pack";
import type {
  PuzzleDocument,
  PuzzleNode,
  PuzzleNodeType,
  PuzzleRunState,
} from "../puzzle";
import type {
  BlueprintComponentView,
  BlueprintEdgeView,
  BlueprintView,
} from "../ui/model";

export type BlueprintMode = "solo" | "co-op";

export interface BuildBlueprintInput {
  level: LevelDocument;
  puzzle: PuzzleDocument;
  state: PuzzleRunState;
  beats: readonly FeedbackBeat[];
  mode?: BlueprintMode;
}

const SYMBOL_BY_NODE_TYPE: Record<PuzzleNodeType, string> = {
  plate: "ui.blueprint.symbol.inputs",
  trigger: "ui.blueprint.symbol.inputs",
  counter: "ui.blueprint.symbol.threshold",
  timer: "ui.blueprint.symbol.timer",
  gate: "ui.blueprint.symbol.gate",
  receptor: "ui.blueprint.symbol.receptor",
  prop: "ui.blueprint.symbol.carry",
  pulseSource: "ui.blueprint.symbol.pulse",
  relay: "ui.blueprint.symbol.relay",
  zone: "ui.blueprint.symbol.flow",
};

const FALLBACK_SYMBOL = "ui.blueprint.symbol.flow";
const MAX_FALLBACK_COMPONENTS = 4;

function plainBeatId(id: string, puzzleId: string): string {
  const prefix = `${puzzleId}:`;
  return id.startsWith(prefix) ? id.slice(prefix.length) : id;
}

function beatMapFor(
  beats: readonly FeedbackBeat[],
  puzzleId: string,
): Map<string, FeedbackBeat> {
  const map = new Map<string, FeedbackBeat>();
  for (const beat of beats) {
    map.set(beat.id, beat);
    map.set(plainBeatId(beat.id, puzzleId), beat);
  }
  return map;
}

function nodeMapFor(puzzle: PuzzleDocument): Map<string, PuzzleNode> {
  return new Map(puzzle.nodes.map((node) => [node.id, node]));
}

function symbolForBeat(
  beat: FeedbackBeat,
  nodeMap: Map<string, PuzzleNode>,
): string {
  for (const nodeId of beat.nodes) {
    const node = nodeMap.get(nodeId);
    if (node) return SYMBOL_BY_NODE_TYPE[node.type];
  }
  return FALLBACK_SYMBOL;
}

function statesForBeats(
  beatIds: readonly string[],
  beats: ReadonlyMap<string, FeedbackBeat>,
  solved: boolean,
): { done: boolean; active: boolean } {
  if (solved) return { done: true, active: false };
  if (beatIds.length === 0) return { done: false, active: false };
  let done = true;
  let active = false;
  for (const beatId of beatIds) {
    const state = beats.get(beatId)?.state;
    if (state === "active") active = true;
    if (state !== "done") done = false;
  }
  return { done, active };
}

function componentViews(
  components: readonly BlueprintComponentView[],
): BlueprintComponentView[] {
  if (components.length === 0) return [];
  const done = components.map((component) => component.state === "done");
  const activeByBeat = components.findIndex(
    (component) => component.state === "active",
  );
  const firstNotDone = done.findIndex((value) => !value);
  const activeIndex = activeByBeat >= 0 ? activeByBeat : firstNotDone;

  return components.map((component, index) => ({
    ...component,
    state: done[index]
      ? "done"
      : index === activeIndex
        ? "active"
        : "pending",
  }));
}

function edgeState(
  from: BlueprintComponentView,
  to: BlueprintComponentView,
): BlueprintEdgeView["state"] {
  if (to.state === "done") return "done";
  if (from.state === "done" && to.state === "active") return "active";
  return "pending";
}

function buildEdges(
  components: readonly BlueprintComponentView[],
  authored: readonly LevelBlueprintEdge[] | undefined,
): BlueprintEdgeView[] {
  const byId = new Map(components.map((component) => [component.id, component]));
  if (authored && authored.length > 0) {
    const edges: BlueprintEdgeView[] = [];
    for (const edge of authored) {
      const from = byId.get(edge.from);
      const to = byId.get(edge.to);
      if (!from || !to) continue;
      edges.push({
        id: `${edge.from}->${edge.to}`,
        from: edge.from,
        to: edge.to,
        type: edge.type,
        state: edgeState(from, to),
      });
    }
    return edges;
  }

  const edges: BlueprintEdgeView[] = [];
  for (let index = 0; index < components.length - 1; index += 1) {
    const from = components[index];
    const to = components[index + 1];
    if (!from || !to) continue;
    edges.push({
      id: `${from.id}->${to.id}`,
      from: from.id,
      to: to.id,
      type: "flow",
      state: edgeState(from, to),
    });
  }
  return edges;
}

function normalizeActor(
  actor: LevelBlueprintActor | null,
  mode: BlueprintMode,
): BlueprintComponentView["actor"] {
  if (!actor) return null;
  if (mode === "solo") {
    if (actor === "p2" || actor === "both") return "p1";
  }
  return actor;
}

function actorsFromSolution(
  puzzle: PuzzleDocument,
  components: readonly BlueprintComponentView[],
  beats: ReadonlyMap<string, FeedbackBeat>,
): Map<string, BlueprintComponentView["actor"]> {
  const nodeActors = new Map<string, Set<"p1" | "p2">>();
  for (const action of puzzle.solution) {
    if (!("actor" in action)) continue;
    if (action.actor !== "p1" && action.actor !== "p2") continue;
    const target = "target" in action ? action.target : undefined;
    if (!target) continue;
    const actors = nodeActors.get(target) ?? new Set<"p1" | "p2">();
    actors.add(action.actor);
    nodeActors.set(target, actors);
  }

  const result = new Map<string, BlueprintComponentView["actor"]>();
  for (const component of components) {
    const actors = new Set<"p1" | "p2">();
    for (const beatId of component.beatIds) {
      const beat = beats.get(beatId);
      for (const nodeId of beat?.nodes ?? []) {
        const nodeActor = nodeActors.get(nodeId);
        if (!nodeActor) continue;
        for (const actor of nodeActor) actors.add(actor);
      }
    }
    if (actors.size === 2) {
      result.set(component.id, "both");
    } else if (actors.size === 1) {
      const [actor] = actors;
      result.set(component.id, actor ?? null);
    }
  }
  return result;
}

function resolvedActors(
  authored: LevelBlueprint | undefined,
  puzzle: PuzzleDocument,
  components: readonly BlueprintComponentView[],
  beats: ReadonlyMap<string, FeedbackBeat>,
  mode: BlueprintMode,
): Map<string, BlueprintComponentView["actor"]> {
  const authoredSteps = authored?.steps ?? [];
  if (authoredSteps.length > 0) {
    const steps = new Map<string, LevelBlueprintStep>(
      authoredSteps.map((step) => [step.componentId, step]),
    );
    return new Map(
      components.map((component) => [
        component.id,
        normalizeActor(steps.get(component.id)?.actor ?? null, mode),
      ]),
    );
  }

  const derived = actorsFromSolution(puzzle, components, beats);
  return new Map(
    components.map((component) => [
      component.id,
      normalizeActor(derived.get(component.id) ?? null, mode),
    ]),
  );
}

function authoredBlueprint(
  input: BuildBlueprintInput,
  authored: LevelBlueprint,
  beats: ReadonlyMap<string, FeedbackBeat>,
): BlueprintView {
  const ordered = authored.components
    .map((component, index) => ({ component, index }))
    .sort(
      (left, right) =>
        left.component.x - right.component.x || left.index - right.index,
    )
    .map((entry) => entry.component);

  const components: BlueprintComponentView[] = componentViews(
    ordered.map((component) => {
      const state = statesForBeats(
        component.beatIds,
        beats,
        input.state.solved,
      );
      return {
        id: component.id,
        symbol: component.symbol,
        ...(component.label ? { label: component.label } : {}),
        state: state.done ? "done" : state.active ? "active" : "pending",
        actor: null,
        beatIds: [...component.beatIds],
      };
    }),
  );

  const actors = resolvedActors(
    authored,
    input.puzzle,
    components,
    beats,
    input.mode ?? "co-op",
  );
  for (const component of components) {
    component.actor = actors.get(component.id) ?? null;
  }

  return {
    puzzleId: input.puzzle.id,
    title: authored.title ?? input.puzzle.title,
    components,
    edges: buildEdges(components, authored.edges),
  };
}

function groupFallbackBeats(
  beats: readonly FeedbackBeat[],
): FeedbackBeat[][] {
  if (beats.length === 0) return [];
  if (beats.length <= MAX_FALLBACK_COMPONENTS) {
    return beats.map((beat) => [beat]);
  }

  const groups: FeedbackBeat[][] = Array.from(
    { length: MAX_FALLBACK_COMPONENTS },
    () => [],
  );
  beats.forEach((beat, index) => {
    const groupIndex = Math.min(
      MAX_FALLBACK_COMPONENTS - 1,
      Math.floor((index * MAX_FALLBACK_COMPONENTS) / beats.length),
    );
    groups[groupIndex]?.push(beat);
  });
  return groups.filter((group) => group.length > 0);
}

function fallbackBlueprint(
  input: BuildBlueprintInput,
  beats: readonly FeedbackBeat[],
  nodeMap: Map<string, PuzzleNode>,
  beatMap: ReadonlyMap<string, FeedbackBeat>,
): BlueprintView {
  const components: BlueprintComponentView[] = componentViews(
    groupFallbackBeats(beats).map((group, index) => {
      const terminalBeat = group[group.length - 1];
      const component: BlueprintComponentView = {
        id: `component-${index + 1}`,
        symbol: terminalBeat
          ? symbolForBeat(terminalBeat, nodeMap)
          : FALLBACK_SYMBOL,
        label: group.map((beat) => beat.label).join(" + "),
        state: "pending",
        actor: null,
        beatIds: group.map((beat) => plainBeatId(beat.id, input.puzzle.id)),
      };
      const state = statesForBeats(
        component.beatIds,
        beatMap,
        input.state.solved,
      );
      component.state = state.done
        ? "done"
        : state.active
          ? "active"
          : "pending";
      return component;
    }),
  );

  const actors = resolvedActors(
    undefined,
    input.puzzle,
    components,
    beatMap,
    input.mode ?? "co-op",
  );
  for (const component of components) {
    component.actor = actors.get(component.id) ?? null;
  }

  return {
    puzzleId: input.puzzle.id,
    title: input.puzzle.title,
    components,
    edges: buildEdges(components, undefined),
  };
}

/**
 * Builds the compact in-room blueprint from authored presentation data, with a
 * deterministic beat/nodes/solution fallback. The pack-level `MapView` is
 * intentionally not consumed: room-to-room context belongs to the Tab popup.
 */
export function buildBlueprint(
  input: BuildBlueprintInput,
): BlueprintView | null {
  const authoredPuzzle = input.level.feedback?.puzzles?.[input.puzzle.id];
  const beats =
    input.beats.length > 0
      ? input.beats
      : deriveBeats({
          document: input.puzzle,
          state: input.state,
          ...(authoredPuzzle?.beats ? { beats: authoredPuzzle.beats } : {}),
        });
  if (beats.length === 0) return null;

  const beatMap = beatMapFor(beats, input.puzzle.id);
  const nodeMap = nodeMapFor(input.puzzle);

  return authoredPuzzle?.blueprint
    ? authoredBlueprint(input, authoredPuzzle.blueprint, beatMap)
    : fallbackBlueprint(input, beats, nodeMap, beatMap);
}
