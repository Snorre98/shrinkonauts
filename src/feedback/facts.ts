import { EVENT_LINKS } from "../puzzle";
import type {
  PuzzleDocument,
  PuzzleEvent,
  PuzzleEventType,
  PuzzleLinkType,
  PuzzleNode,
  PulseSourceNode,
} from "../puzzle";
import {
  LINK_FEEDBACK,
  NODE_FEEDBACK,
  nodeAnchor,
  nodeLabel,
} from "./descriptors";
import { feedbackLexicon } from "./lexicon";
import {
  anchorRefFromFeedbackAnchor,
  nodeEffectAnchor,
} from "./effects";
import {
  resolveEffectPreset,
  type EffectPresetId,
} from "./effect-presets";
import type {
  CueRecipe,
  EffectPlan,
  EventCoverage,
  FeedbackAnchor,
  FeedbackCapability,
  FeedbackCueSpec,
  FeedbackFact,
  FeedbackOwner,
  FeedbackPresentation,
  FeedbackResult,
  FeedbackSeverity,
  FeedbackState,
  LinkFeedbackDescriptor,
  NodeFeedbackDescriptor,
  PlayerId,
  RejectionReason,
  SourceRef,
} from "./types";

function cue(
  capability: FeedbackCapability,
  state: FeedbackState,
  severity?: FeedbackSeverity,
  presentation?: FeedbackPresentation,
  priority?: number,
  effectPreset?: EffectPresetId,
): CueRecipe {
  return {
    capability,
    state,
    ...(severity ? { severity } : {}),
    ...(presentation ? { presentation } : {}),
    ...(priority !== undefined ? { priority } : {}),
    ...(effectPreset ? { effectPreset } : {}),
  };
}

const SOLVED_RECIPE: CueRecipe = {
  capability: "outcome",
  state: "complete",
  severity: "positive",
  presentation: "screenCaption",
  priority: 100,
  anchor: { kind: "screen" },
  owner: "shared",
  text: "Signal restored",
  effectPreset: "fx.outcome.exitPing",
};

/**
 * Exhaustive event coverage. `satisfies` makes a new `PuzzleEventType` a
 * compile error until it gets a cue or an explicit silent reason.
 */
export const EVENT_COVERAGE = {
  pulse: {
    kind: "silent",
    reason:
      "Pulse launch is represented by the pulse source meter and the Phase 6 travel effect.",
  },
  pulseArrived: { kind: "cue", recipe: cue("conductor", "active", "positive") },
  receptorBound: {
    kind: "cue",
    recipe: cue("container", "complete", "positive", undefined, undefined, "fx.container.accept"),
  },
  receptorRejected: {
    kind: "cue",
    recipe: cue(
      "container",
      "blocked",
      "critical",
      "speechBubble",
      undefined,
      "fx.rejection.bounce",
    ),
  },
  platePress: {
    kind: "cue",
    recipe: cue("binary", "active", undefined, undefined, undefined, "fx.plate.press"),
  },
  plateRelease: {
    kind: "cue",
    recipe: cue("binary", "idle", undefined, undefined, undefined, "fx.plate.release"),
  },
  zoneEnter: {
    kind: "cue",
    recipe: cue("container", "active", undefined, undefined, undefined, "fx.container.accept"),
  },
  zoneExit: { kind: "cue", recipe: cue("container", "idle") },
  triggerFired: {
    kind: "cue",
    recipe: cue("binary", "complete", "positive", undefined, undefined, "fx.plate.press"),
  },
  timerElapsed: {
    kind: "cue",
    recipe: cue("meter", "complete", "positive", undefined, undefined, "fx.meter.elapsed"),
  },
  counterReached: {
    kind: "cue",
    recipe: cue("counter", "complete", "positive", undefined, undefined, "fx.counter.burst"),
  },
  gateOpen: {
    kind: "cue",
    recipe: {
      ...cue(
        "barrier",
        "active",
        "positive",
        undefined,
        undefined,
        "fx.gate.burst",
      ),
      owner: "shared",
    },
  },
  gateClose: {
    kind: "cue",
    recipe: {
      ...cue(
        "barrier",
        "idle",
        undefined,
        undefined,
        undefined,
        "fx.gate.close",
      ),
      owner: "shared",
    },
  },
  relayActive: {
    kind: "cue",
    recipe: cue("conductor", "active", "positive"),
  },
  relayInactive: { kind: "cue", recipe: cue("conductor", "idle") },
  solved: { kind: "cue", recipe: SOLVED_RECIPE },
} satisfies Record<PuzzleEventType, EventCoverage>;

export interface FactProjectionContext {
  document?: PuzzleDocument;
  labels?: Readonly<Record<string, string>>;
  defaultTtlTicks: number;
}

function playerLabel(player: PlayerId): string {
  return player === "p1" ? "P1" : "P2";
}

function asPlayerId(value: string | undefined): PlayerId | null {
  return value === "p1" || value === "p2" ? value : null;
}

function sourceAnchor(source: SourceRef): FeedbackAnchor {
  switch (source.kind) {
    case "entity":
      return { kind: "entity", entityId: source.id };
    case "node":
      return { kind: "node", nodeId: source.id, fallback: "hud" };
    case "system":
      return { kind: "hud", slot: "top" };
  }
}

function reasonForEvent(event: PuzzleEvent): RejectionReason | undefined {
  if (event.type !== "receptorRejected") {
    return undefined;
  }
  const message = event.message?.toLowerCase() ?? "";
  if (message.includes("no prop") || message.includes("empty")) return "empty";
  if (message.includes("tag")) return "wrong-tag";
  if (message.includes("shape")) return "wrong-shape";
  if (message.includes("range")) return "out-of-range";
  if (message.includes("cooldown")) return "cooldown";
  return "condition-unmet";
}

/**
 * Resolves an event to a descriptor cue, an incoming link cue, or the global
 * coverage table. Node cues win because they can carry node-specific copy.
 */
function withGlobalCueDefaults(
  recipe: CueRecipe,
  eventType: PuzzleEventType,
): CueRecipe {
  const global = EVENT_COVERAGE[eventType];
  if (global.kind !== "cue") return recipe;
  return {
    ...recipe,
    ...(!recipe.effectPreset && global.recipe.effectPreset
      ? { effectPreset: global.recipe.effectPreset }
      : {}),
    ...(!recipe.owner && global.recipe.owner
      ? { owner: global.recipe.owner }
      : {}),
  };
}

export function eventCueCoverage(
  document: PuzzleDocument,
  event: PuzzleEvent,
): EventCoverage {
  const node = document.nodes.find((entry) => entry.id === event.nodeId);
  const descriptor = node
    ? (NODE_FEEDBACK[node.type] as NodeFeedbackDescriptor)
    : undefined;
  const nodeCue = descriptor?.cues?.[event.type];
  if (nodeCue) {
    return {
      kind: "cue",
      recipe: withGlobalCueDefaults(nodeCue, event.type),
    };
  }

  const allowedLinkTypes = EVENT_LINKS[event.type] as readonly PuzzleLinkType[];
  for (const link of document.links) {
    if (link.to !== event.nodeId) continue;
    if (!allowedLinkTypes.includes(link.type)) continue;
    const linkDescriptor = LINK_FEEDBACK[
      link.type
    ] as LinkFeedbackDescriptor;
    const linkCue = linkDescriptor.cues?.[link.type];
    if (linkCue) {
      return {
        kind: "cue",
        recipe: withGlobalCueDefaults(linkCue, event.type),
      };
    }
  }

  return EVENT_COVERAGE[event.type];
}

function nodeSubject(
  document: PuzzleDocument | undefined,
  node: PuzzleNode | undefined,
  labels: Readonly<Record<string, string>> | undefined,
): string {
  if (node) {
    return labels?.[node.id] ?? nodeLabel(node.id);
  }
  return document?.title ?? "Puzzle";
}

function presentationFor(
  recipe: CueRecipe,
  node: PuzzleNode | undefined,
  actor: PlayerId | null,
  targeted: boolean,
): FeedbackPresentation {
  if (recipe.presentation) return recipe.presentation;
  if (actor && targeted) return "speechBubble";
  if (actor) return "playerCaption";
  if (recipe.anchor?.kind === "screen") return "screenCaption";
  if (node) return "hudStatus";
  return "hudStatus";
}

const TARGETED_EVENTS: ReadonlySet<PuzzleEvent["type"]> = new Set([
  "receptorBound",
  "receptorRejected",
  "gateOpen",
  "gateClose",
]);

function priorityFor(
  recipe: CueRecipe,
  state: FeedbackState,
): number {
  if (recipe.priority !== undefined) return recipe.priority;
  if (state === "blocked" || state === "expired") return 80;
  if (state === "complete") return 60;
  if (state === "active" || state === "progress") return 50;
  return 40;
}

function effectsForRecipe(
  recipe: CueRecipe,
  fact: Extract<FeedbackFact, { kind: "puzzle.event" }>,
  actor: PlayerId | null,
  owner: FeedbackOwner,
  anchor: FeedbackAnchor,
  node: PuzzleNode | undefined,
): readonly EffectPlan[] | undefined {
  if (!recipe.effectPreset) return undefined;
  const effectAnchor = node
    ? nodeEffectAnchor(node)
    : anchorRefFromFeedbackAnchor(anchor);
  const effect = resolveEffectPreset(recipe.effectPreset, {
    actor,
    owner,
    source: effectAnchor,
    planId: `${recipe.effectPreset}:${fact.event.type}:${fact.event.nodeId}:${fact.event.propId ?? ""}`,
  });
  return effect ? [effect] : undefined;
}

function cueFromPuzzleEvent(
  fact: Extract<FeedbackFact, { kind: "puzzle.event" }>,
  context: FactProjectionContext,
): FeedbackCueSpec | null {
  const coverage = context.document
    ? eventCueCoverage(context.document, fact.event)
    : EVENT_COVERAGE[fact.event.type];
  if (coverage.kind === "silent") {
    return null;
  }

  const recipe = coverage.recipe;
  const node = context.document?.nodes.find(
    (entry) => entry.id === fact.event.nodeId,
  );
  const actor = fact.actor ?? asPlayerId(fact.event.actorId);
  const targeted = TARGETED_EVENTS.has(fact.event.type) && Boolean(node?.entityId);
  const state = recipe.state ?? "idle";
  const reason = recipe.reason ?? reasonForEvent(fact.event);
  const subject = nodeSubject(context.document, node, context.labels);
  const text =
    recipe.text ??
    feedbackLexicon({
      capability: recipe.capability,
      state,
      ...(reason ? { reason } : {}),
      labels: {
        subject,
        ...(actor ? { actor: playerLabel(actor) } : {}),
      },
    }).text;
  const anchor =
    recipe.anchor ??
    (actor && targeted && node?.entityId
      ? nodeAnchor(node)
      : actor
        ? { kind: "player", playerId: actor }
        : node
          ? nodeAnchor(node)
          : { kind: "hud", slot: "top" });
  const presentation = presentationFor(recipe, node, actor, targeted);
  const owner = recipe.owner ?? actor ?? "shared";
  const effects = effectsForRecipe(
    recipe,
    fact,
    actor,
    owner,
    anchor,
    node,
  );

  return {
    cause:
      recipe.cause ??
      `puzzle:${fact.event.type}:${fact.event.nodeId}:${fact.event.propId ?? ""}:${actor ?? "shared"}`,
    source: fact.source,
    actor,
    owner,
    audience: recipe.audience ?? "both",
    anchor,
    presentation,
    content: { text },
    state,
    ...(reason ? { reason } : {}),
    severity: recipe.severity ?? (state === "blocked" ? "warning" : "neutral"),
    priority: priorityFor(recipe, state),
    ttlTicks: recipe.ttlTicks ?? context.defaultTtlTicks,
    a11y: recipe.a11y ?? { announce: true, textAlternative: text },
    ...(effects ? { effects } : {}),
  };
}

const ACTION_CAPABILITIES: Record<string, FeedbackCapability> = {
  carry: "carrier",
  pickup: "carrier",
  place: "carrier",
  drop: "carrier",
  throw: "carrier",
  pulse: "conductor",
  interact: "affordance",
  use: "affordance",
  scan: "affordance",
  hint: "affordance",
  gate: "barrier",
  reset: "outcome",
};

function actionCapability(action: string): FeedbackCapability {
  return ACTION_CAPABILITIES[action] ?? "affordance";
}

function stateForResult(result: FeedbackResult): FeedbackState {
  switch (result) {
    case "accepted":
      return "active";
    case "rejected":
    case "blocked":
      return "blocked";
    case "completed":
      return "complete";
    case "started":
      return "progress";
  }
}

function severityForResult(result: FeedbackResult): FeedbackSeverity {
  switch (result) {
    case "accepted":
    case "completed":
      return "positive";
    case "blocked":
      return "warning";
    case "rejected":
      return "critical";
    case "started":
      return "neutral";
  }
}

const ACTION_EFFECT_PRESETS: Readonly<Record<string, EffectPresetId>> = {
  carry: "fx.carrier.pickup",
  pickup: "fx.carrier.pickup",
  place: "fx.container.accept",
  drop: "fx.carrier.drop",
  throw: "fx.carrier.drop",
  interact: "fx.affordance.ring",
  use: "fx.affordance.ring",
  scan: "fx.affordance.ring",
  hint: "fx.affordance.ring",
  gate: "fx.gate.burst",
  reset: "fx.outcome.flash",
};

function pulseTravelEffects(
  document: PuzzleDocument | undefined,
  target: SourceRef,
  actor: PlayerId,
): readonly EffectPlan[] | undefined {
  if (!document) return undefined;
  const sourceNode = document.nodes.find(
    (node): node is PulseSourceNode =>
      node.type === "pulseSource" &&
      (node.id === target.id || node.entityId === target.id),
  );
  if (!sourceNode) return undefined;

  const effects: EffectPlan[] = [];
  for (const link of document.links) {
    if (link.from !== sourceNode.id || link.type !== "pulse") continue;
    const receptor = document.nodes.find((node) => node.id === link.to);
    if (!receptor) continue;
    const effect = resolveEffectPreset("fx.pulse.travel", {
      actor,
      owner: actor,
      source: nodeEffectAnchor(sourceNode),
      target: nodeEffectAnchor(receptor),
      durationTicks: sourceNode.travelTicks,
      planId: `fx.pulse.travel:${sourceNode.id}:${receptor.id}`,
    });
    if (effect) effects.push(effect);
  }
  return effects.length > 0 ? effects : undefined;
}

function actionEffects(
  fact: Extract<FeedbackFact, { kind: "action.outcome" }>,
  context: FactProjectionContext,
  anchor: FeedbackAnchor,
): readonly EffectPlan[] | undefined {
  const source = anchorRefFromFeedbackAnchor(anchor);
  if (fact.result === "rejected" || fact.result === "blocked") {
    const effect = resolveEffectPreset("fx.rejection.bounce", {
      actor: fact.actor,
      owner: fact.actor,
      source,
      planId: `fx.rejection.bounce:${fact.action}:${fact.target?.id ?? fact.actor}`,
    });
    return effect ? [effect] : undefined;
  }

  if (fact.action === "pulse" && fact.target) {
    const travel = pulseTravelEffects(context.document, fact.target, fact.actor);
    if (travel) return travel;
  }

  const preset = ACTION_EFFECT_PRESETS[fact.action];
  if (!preset) return undefined;
  const target =
    fact.action === "pickup"
      ? ({ kind: "player", id: fact.actor } as const)
      : undefined;
  const effect = resolveEffectPreset(preset, {
    actor: fact.actor,
    owner: fact.actor,
    source,
    ...(target ? { target } : {}),
    planId: `${preset}:${fact.action}:${fact.target?.id ?? fact.actor}`,
  });
  return effect ? [effect] : undefined;
}

function cueFromActionOutcome(
  fact: Extract<FeedbackFact, { kind: "action.outcome" }>,
  context: FactProjectionContext,
): FeedbackCueSpec {
  const capability = actionCapability(fact.action);
  const state = stateForResult(fact.result);
  const actorLabel = playerLabel(fact.actor);
  const subject = fact.target?.id
    ? context.labels?.[fact.target.id] ?? nodeLabel(fact.target.id)
    : actorLabel;
  const text =
    fact.text ??
    feedbackLexicon({
      capability,
      state,
      ...(fact.reason ? { reason: fact.reason } : {}),
      labels: { subject, actor: actorLabel },
    }).text;
  const a11yText = fact.text
    ? `${actorLabel}: ${fact.text}`
    : text;
  const anchor: FeedbackAnchor = fact.target
    ? sourceAnchor(fact.target)
    : { kind: "player", playerId: fact.actor };
  const presentation = fact.target ? "speechBubble" : "playerCaption";
  const effects = actionEffects(fact, context, anchor);

  return {
    cause: `action:${fact.actor}:${fact.action}:${fact.result}:${
      fact.target?.kind ?? ""
    }:${fact.target?.id ?? ""}:${fact.reason ?? ""}`,
    source: fact.target ?? { kind: "system", id: `player:${fact.actor}` },
    actor: fact.actor,
    owner: fact.actor,
    audience: "both",
    anchor,
    presentation,
    content: { text },
    state,
    ...(fact.reason ? { reason: fact.reason } : {}),
    severity: severityForResult(fact.result),
    priority: fact.result === "rejected" ? 80 : 50,
    ttlTicks: context.defaultTtlTicks,
    a11y: { announce: true, textAlternative: a11yText },
    ...(effects ? { effects } : {}),
  };
}

function cueFromConversationStart(
  fact: Extract<FeedbackFact, { kind: "conversation.start" }>,
  context: FactProjectionContext,
): FeedbackCueSpec {
  const actorLabel = playerLabel(fact.actor);
  const subject =
    context.labels?.[fact.entityId] ?? nodeLabel(fact.entityId);
  const text = `${actorLabel}: conversation started with ${subject}.`;

  return {
    cause: `conversation:start:${fact.actor}:${fact.entityId}:${fact.dialogueId}`,
    source: { kind: "entity", id: fact.entityId },
    actor: fact.actor,
    owner: fact.actor,
    audience: "both",
    anchor: { kind: "entity", entityId: fact.entityId },
    presentation: "speechBubble",
    content: { text },
    state: "active",
    severity: "neutral",
    priority: 60,
    ttlTicks: context.defaultTtlTicks,
    a11y: { announce: true, textAlternative: text },
  };
}

function humanizeOutcome(outcome: string): string {
  return outcome
    .replace(/[._-]+/g, " ")
    .replace(/\b[a-z]/g, (letter) => letter.toUpperCase());
}

function cueFromSystemOutcome(
  fact: Extract<FeedbackFact, { kind: "system.outcome" }>,
  context: FactProjectionContext,
): FeedbackCueSpec {
  const text = fact.text ?? humanizeOutcome(fact.outcome);

  return {
    cause: `system:${fact.source.kind}:${fact.source.id}:${fact.outcome}`,
    source: fact.source,
    actor: null,
    owner: "shared",
    audience: "both",
    anchor: sourceAnchor(fact.source),
    presentation: "hudStatus",
    content: { text },
    state: "complete",
    severity: fact.severity ?? "positive",
    priority: 70,
    ttlTicks: context.defaultTtlTicks,
    a11y: { announce: true, textAlternative: text },
  };
}

/**
 * Converts a fact into a transient cue. `null` means the fact is explicitly
 * silent according to the coverage table.
 */
export function projectFact(
  fact: FeedbackFact,
  context: FactProjectionContext,
): FeedbackCueSpec | null {
  switch (fact.kind) {
    case "puzzle.event":
      return cueFromPuzzleEvent(fact, context);
    case "action.outcome":
      return cueFromActionOutcome(fact, context);
    case "conversation.start":
      return cueFromConversationStart(fact, context);
    case "system.outcome":
      return cueFromSystemOutcome(fact, context);
  }
}
