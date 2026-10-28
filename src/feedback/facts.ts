import { EVENT_LINKS } from "../puzzle";
import type {
  PuzzleDocument,
  PuzzleEvent,
  PuzzleEventType,
  PuzzleLinkType,
  PuzzleNode,
} from "../puzzle";
import {
  LINK_FEEDBACK,
  NODE_FEEDBACK,
  nodeAnchor,
  nodeLabel,
} from "./descriptors";
import { feedbackLexicon } from "./lexicon";
import type {
  CueRecipe,
  EventCoverage,
  FeedbackAnchor,
  FeedbackCapability,
  FeedbackCueSpec,
  FeedbackFact,
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
): CueRecipe {
  return {
    capability,
    state,
    ...(severity ? { severity } : {}),
    ...(presentation ? { presentation } : {}),
    ...(priority !== undefined ? { priority } : {}),
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
    recipe: cue("container", "complete", "positive"),
  },
  receptorRejected: {
    kind: "cue",
    recipe: cue("container", "blocked", "critical", "speechBubble"),
  },
  platePress: { kind: "cue", recipe: cue("binary", "active") },
  plateRelease: { kind: "cue", recipe: cue("binary", "idle") },
  zoneEnter: { kind: "cue", recipe: cue("container", "active") },
  zoneExit: { kind: "cue", recipe: cue("container", "idle") },
  triggerFired: { kind: "cue", recipe: cue("binary", "complete", "positive") },
  timerElapsed: { kind: "cue", recipe: cue("meter", "complete", "positive") },
  counterReached: {
    kind: "cue",
    recipe: cue("counter", "complete", "positive"),
  },
  gateOpen: { kind: "cue", recipe: cue("barrier", "active", "positive") },
  gateClose: { kind: "cue", recipe: cue("barrier", "idle") },
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
    return { kind: "cue", recipe: nodeCue };
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
      return { kind: "cue", recipe: linkCue };
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
): FeedbackPresentation {
  if (recipe.presentation) return recipe.presentation;
  if (node) return "hudStatus";
  return actor ? "playerCaption" : "hudStatus";
}

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
    (node
      ? nodeAnchor(node)
      : actor
        ? { kind: "player", playerId: actor }
        : { kind: "hud", slot: "top" });
  const presentation = presentationFor(recipe, node, actor);

  return {
    cause:
      recipe.cause ??
      `puzzle:${fact.event.type}:${fact.event.nodeId}:${fact.event.propId ?? ""}:${actor ?? "shared"}`,
    source: fact.source,
    actor,
    owner: recipe.owner ?? actor ?? "shared",
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
  const text = feedbackLexicon({
    capability,
    state,
    ...(fact.reason ? { reason: fact.reason } : {}),
    labels: { subject, actor: actorLabel },
  }).text;
  const anchor: FeedbackAnchor = fact.target
    ? sourceAnchor(fact.target)
    : { kind: "player", playerId: fact.actor };
  const presentation = fact.target ? "speechBubble" : "playerCaption";

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
    a11y: { announce: true, textAlternative: text },
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
  const text = humanizeOutcome(fact.outcome);

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
    severity: "positive",
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
