import type {
  CounterNode,
  GateNode,
  PlateNode,
  PropNode,
  PulseSourceNode,
  ReceptorNode,
  RelayNode,
  TimerNode,
  TriggerNode,
  ZoneNode,
  PuzzleLinkType,
  PuzzleNode,
  PuzzleNodeRunState,
  PuzzleNodeType,
} from "../puzzle";
import { feedbackLexicon } from "./lexicon";
import type {
  CueRecipe,
  EffectPlan,
  FeedbackAnchor,
  FeedbackCapability,
  FeedbackPresentation,
  FeedbackProgress,
  FeedbackProjectionContext,
  FeedbackSeverity,
  FeedbackSignal,
  FeedbackState,
  FeedbackSurfaceSpec,
  LinkFeedbackDescriptor,
  NodeFeedbackDescriptor,
} from "./types";

export const FEEDBACK_CAPABILITIES: readonly FeedbackCapability[] = [
  "affordance",
  "binary",
  "meter",
  "counter",
  "container",
  "carrier",
  "barrier",
  "conductor",
  "outcome",
];

export interface CapabilityDefaults {
  presentation: FeedbackPresentation;
  anchor: "entity" | "player" | "hud" | "screen" | "node";
  effectPreset: string;
}

export const CAPABILITY_DEFAULTS = {
  affordance: {
    presentation: "prompt",
    anchor: "entity",
    effectPreset: "fx.affordance.ring",
  },
  binary: {
    presentation: "stateSwap",
    anchor: "entity",
    effectPreset: "fx.binary.swap",
  },
  meter: {
    presentation: "hudMeter",
    anchor: "entity",
    effectPreset: "fx.meter.sweep",
  },
  counter: {
    presentation: "tracker",
    anchor: "entity",
    effectPreset: "fx.counter.pip",
  },
  container: {
    presentation: "socketFill",
    anchor: "entity",
    effectPreset: "fx.container.fill",
  },
  carrier: {
    presentation: "outline",
    anchor: "entity",
    effectPreset: "fx.carrier.glow",
  },
  barrier: {
    presentation: "stateSwap",
    anchor: "entity",
    effectPreset: "fx.barrier.burst",
  },
  conductor: {
    presentation: "pathGlow",
    anchor: "entity",
    effectPreset: "fx.conductor.path",
  },
  outcome: {
    presentation: "screenCaption",
    anchor: "screen",
    effectPreset: "fx.outcome.flash",
  },
} satisfies Record<FeedbackCapability, CapabilityDefaults>;

export function nodeLabel(nodeId: string): string {
  return nodeId
    .replace(/[-_]+/g, " ")
    .replace(/\b[a-z]/g, (letter) => letter.toUpperCase());
}

export function nodeAnchor(node: PuzzleNode): FeedbackAnchor {
  return node.entityId
    ? { kind: "entity", entityId: node.entityId }
    : { kind: "node", nodeId: node.id, fallback: "hud" };
}

export function defaultSeverity(state: FeedbackState): FeedbackSeverity {
  switch (state) {
    case "active":
    case "complete":
      return "positive";
    case "blocked":
    case "expired":
      return "warning";
    default:
      return "neutral";
  }
}

export function defaultSurfacePriority(capability: FeedbackCapability): number {
  switch (capability) {
    case "outcome":
      return 100;
    case "barrier":
    case "meter":
    case "counter":
      return 30;
    case "container":
    case "carrier":
    case "conductor":
      return 20;
    case "affordance":
    case "binary":
      return 10;
  }
}

function capabilityAnchor(
  capability: FeedbackCapability,
  node: PuzzleNode,
): FeedbackAnchor {
  return capability === "outcome"
    ? { kind: "screen" }
    : nodeAnchor(node);
}

export function feedbackStateForNode(
  node: PuzzleNode,
  state: PuzzleNodeRunState,
): FeedbackState {
  switch (node.type) {
    case "prop":
      switch (state.state) {
        case "free":
          return "available";
        case "carried":
          return "active";
        case "placed":
          return "progress";
        case "docked":
          return "complete";
        default:
          return "idle";
      }
    case "receptor":
      switch (state.state) {
        case "idle":
          return "available";
        case "occupied":
          return "progress";
        case "bound":
          return "complete";
        default:
          return "idle";
      }
    case "pulseSource":
      return state.state === "cooldown" ? "progress" : "available";
    case "plate":
      return state.state === "pressed" ? "active" : "available";
    case "relay":
      return state.active ? "active" : "idle";
    case "gate":
      return state.state === "open" ? "active" : "idle";
    case "timer":
      switch (state.state) {
        case "running":
          return "progress";
        case "elapsed":
          return "complete";
        case "stopped":
          return "reset";
        default:
          return "idle";
      }
    case "counter":
      if (state.state === "reached") return "complete";
      return state.count > 0 ? "progress" : "idle";
    case "zone":
      return state.state === "occupied" ? "active" : "idle";
    case "trigger":
      return state.state === "fired" || state.state === "stopped"
        ? "complete"
        : "available";
    default:
      return "idle";
  }
}

export function nodeSurface(input: {
  node: PuzzleNode;
  capability: FeedbackCapability;
  state: FeedbackState;
  label: string;
  text?: string;
  progress?: FeedbackProgress;
  presentation?: FeedbackPresentation;
  severity?: FeedbackSeverity;
  effects?: readonly EffectPlan[];
}): FeedbackSurfaceSpec {
  const lexicon = feedbackLexicon({
    capability: input.capability,
    state: input.state,
    labels: { subject: input.label },
  });
  const text = input.text ?? lexicon.text;
  const presentation =
    input.presentation ?? CAPABILITY_DEFAULTS[input.capability].presentation;

  return {
    capability: input.capability,
    source: { kind: "node", id: input.node.id },
    actor: null,
    owner: "shared",
    audience: "both",
    anchor: capabilityAnchor(input.capability, input.node),
    presentation,
    content: {
      text,
      ...(input.progress ? { progress: input.progress } : {}),
    },
    state: input.state,
    severity: input.severity ?? defaultSeverity(input.state),
    lifetime: { sticky: true },
    interaction: { mode: "none", focus: "soft", movement: "free" },
    priority: defaultSurfacePriority(input.capability),
    a11y: { announce: false, textAlternative: text },
    ...(input.effects && input.effects.length > 0
      ? { effects: input.effects }
      : {}),
  };
}

export function projectSignal(signal: FeedbackSignal): FeedbackSurfaceSpec {
  const defaults = CAPABILITY_DEFAULTS[signal.capability];
  const text =
    signal.content.text ??
    feedbackLexicon({
      capability: signal.capability,
      state: signal.state,
      ...(signal.reason ? { reason: signal.reason } : {}),
    }).text;
  const actor = signal.actor ?? null;

  return {
    capability: signal.capability,
    source: signal.source,
    actor,
    owner: signal.owner ?? actor ?? "shared",
    audience: "both",
    anchor: signal.anchor,
    presentation: signal.presentation ?? defaults.presentation,
    content: { ...signal.content, text },
    state: signal.state,
    ...(signal.reason ? { reason: signal.reason } : {}),
    severity: signal.severity ?? defaultSeverity(signal.state),
    lifetime: signal.lifetime ?? { sticky: true },
    interaction: signal.interaction ?? {
      mode: "none",
      focus: "soft",
      movement: "free",
    },
    priority: signal.priority ?? defaultSurfacePriority(signal.capability),
    a11y: signal.a11y ?? { announce: false, textAlternative: text },
    ...(signal.effects && signal.effects.length > 0
      ? { effects: signal.effects }
      : {}),
  };
}

function projectNode(
  node: PuzzleNode,
  capability: FeedbackCapability,
  state: PuzzleNodeRunState,
  context?: FeedbackProjectionContext,
  progress?: FeedbackProgress,
): FeedbackSurfaceSpec[] {
  const feedbackState = feedbackStateForNode(node, state);
  const label = context?.label ?? nodeLabel(node.id);

  return [
    nodeSurface({
      node,
      capability,
      state: feedbackState,
      label,
      ...(context?.text ? { text: context.text } : {}),
      ...(progress ? { progress } : {}),
    }),
  ];
}

function cue(
  capability: FeedbackCapability,
  state: FeedbackState,
  severity?: FeedbackSeverity,
  presentation?: FeedbackPresentation,
): CueRecipe {
  return {
    capability,
    state,
    ...(severity ? { severity } : {}),
    ...(presentation ? { presentation } : {}),
  };
}

export const NODE_FEEDBACK = {
  prop: {
    capabilities: ["carrier"],
    project(node: PropNode, state, context) {
      return projectNode(node, "carrier", state, context);
    },
  } satisfies NodeFeedbackDescriptor<PropNode>,

  receptor: {
    capabilities: ["container"],
    project(node: ReceptorNode, state, context) {
      return projectNode(node, "container", state, context);
    },
    cues: {
      receptorBound: cue("container", "complete", "positive"),
      receptorRejected: cue("container", "blocked", "critical", "speechBubble"),
    },
  } satisfies NodeFeedbackDescriptor<ReceptorNode>,

  pulseSource: {
    capabilities: ["affordance", "meter"],
    project(node: PulseSourceNode, state, context) {
      return projectNode(node, "meter", state, context);
    },
    cues: {
      pulseArrived: cue("conductor", "active", "positive"),
    },
  } satisfies NodeFeedbackDescriptor<PulseSourceNode>,

  plate: {
    capabilities: ["binary"],
    project(node: PlateNode, state, context) {
      return projectNode(node, "binary", state, context);
    },
    cues: {
      platePress: cue("binary", "active"),
      plateRelease: cue("binary", "idle"),
    },
  } satisfies NodeFeedbackDescriptor<PlateNode>,

  relay: {
    capabilities: ["conductor"],
    project(node: RelayNode, state, context) {
      return projectNode(node, "conductor", state, context);
    },
    cues: {
      relayActive: cue("conductor", "active", "positive"),
      relayInactive: cue("conductor", "idle"),
    },
  } satisfies NodeFeedbackDescriptor<RelayNode>,

  gate: {
    capabilities: ["barrier"],
    project(node: GateNode, state, context) {
      return projectNode(node, "barrier", state, context);
    },
    cues: {
      gateOpen: cue("barrier", "active", "positive"),
      gateClose: cue("barrier", "idle"),
    },
  } satisfies NodeFeedbackDescriptor<GateNode>,

  timer: {
    capabilities: ["meter"],
    project(node: TimerNode, state, context) {
      return projectNode(node, "meter", state, context, {
        value: state.remaining,
        max: node.durationTicks,
        unit: "ticks",
      });
    },
    cues: {
      timerElapsed: cue("meter", "complete", "positive"),
    },
  } satisfies NodeFeedbackDescriptor<TimerNode>,

  counter: {
    capabilities: ["counter"],
    project(node: CounterNode, state, context) {
      return projectNode(node, "counter", state, context, {
        value: state.count,
        max: node.target,
      });
    },
    cues: {
      counterReached: cue("counter", "complete", "positive"),
    },
  } satisfies NodeFeedbackDescriptor<CounterNode>,

  zone: {
    capabilities: ["container"],
    project(node: ZoneNode, state, context) {
      return projectNode(node, "container", state, context);
    },
    cues: {
      zoneEnter: cue("container", "active"),
      zoneExit: cue("container", "idle"),
    },
  } satisfies NodeFeedbackDescriptor<ZoneNode>,

  trigger: {
    capabilities: ["affordance", "binary"],
    project(node: TriggerNode, state, context) {
      return projectNode(node, "binary", state, context);
    },
    cues: {
      triggerFired: cue("binary", "complete", "positive"),
    },
  } satisfies NodeFeedbackDescriptor<TriggerNode>,
} satisfies Record<PuzzleNodeType, NodeFeedbackDescriptor>;

const LINK_CUES: Record<PuzzleLinkType, CueRecipe> = {
  pulse: cue("conductor", "active"),
  bind: cue("container", "complete", "positive"),
  press: cue("binary", "active"),
  release: cue("binary", "idle"),
  enter: cue("container", "active"),
  exit: cue("container", "idle"),
  increment: cue("counter", "progress"),
  start: cue("meter", "progress"),
  stop: cue("meter", "reset"),
  reset: cue("meter", "reset"),
  elapsed: cue("meter", "complete", "positive"),
  reached: cue("counter", "complete", "positive"),
  activate: cue("conductor", "active"),
  deactivate: cue("conductor", "idle"),
  open: cue("barrier", "active", "positive"),
  close: cue("barrier", "idle"),
};

export const LINK_FEEDBACK = {
  pulse: { capabilities: ["conductor"], cues: { pulse: LINK_CUES.pulse } },
  bind: { capabilities: ["container"], cues: { bind: LINK_CUES.bind } },
  press: { capabilities: ["binary"], cues: { press: LINK_CUES.press } },
  release: { capabilities: ["binary"], cues: { release: LINK_CUES.release } },
  enter: { capabilities: ["container"], cues: { enter: LINK_CUES.enter } },
  exit: { capabilities: ["container"], cues: { exit: LINK_CUES.exit } },
  increment: {
    capabilities: ["counter"],
    cues: { increment: LINK_CUES.increment },
  },
  start: { capabilities: ["meter"], cues: { start: LINK_CUES.start } },
  stop: { capabilities: ["meter"], cues: { stop: LINK_CUES.stop } },
  reset: { capabilities: ["meter"], cues: { reset: LINK_CUES.reset } },
  elapsed: { capabilities: ["meter"], cues: { elapsed: LINK_CUES.elapsed } },
  reached: {
    capabilities: ["counter"],
    cues: { reached: LINK_CUES.reached },
  },
  activate: {
    capabilities: ["conductor"],
    cues: { activate: LINK_CUES.activate },
  },
  deactivate: {
    capabilities: ["conductor"],
    cues: { deactivate: LINK_CUES.deactivate },
  },
  open: { capabilities: ["barrier"], cues: { open: LINK_CUES.open } },
  close: { capabilities: ["barrier"], cues: { close: LINK_CUES.close } },
} satisfies Record<PuzzleLinkType, LinkFeedbackDescriptor>;
