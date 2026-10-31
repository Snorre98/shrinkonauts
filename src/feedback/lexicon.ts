import type {
  FeedbackCapability,
  FeedbackLabels,
  FeedbackState,
  RejectionReason,
} from "./types";

export interface FeedbackLexiconEntry {
  text: string;
  icon: string;
  audioCue: string;
}

export const FEEDBACK_STATES: readonly FeedbackState[] = [
  "idle",
  "available",
  "active",
  "progress",
  "complete",
  "blocked",
  "expired",
  "reset",
];

export const REJECTION_REASONS: readonly RejectionReason[] = [
  "empty",
  "wrong-shape",
  "wrong-tag",
  "condition-unmet",
  "cooldown",
  "out-of-range",
  "locked",
  "cleared",
];

const CAPABILITY_ICON: Record<FeedbackCapability, string> = {
  affordance: "interact",
  binary: "toggle",
  meter: "meter",
  counter: "counter",
  container: "socket",
  carrier: "carry",
  barrier: "gate",
  conductor: "path",
  outcome: "outcome",
};

const FALLBACK_STATE_TEXT: Record<FeedbackState, string> = {
  idle: "{subject} is idle.",
  available: "{subject} is ready.",
  active: "{subject} is active.",
  progress: "{subject} is in progress.",
  complete: "{subject} is complete.",
  blocked: "{subject} is blocked.",
  expired: "{subject} has expired.",
  reset: "{subject} has reset.",
};

const CAPABILITY_STATE_TEXT: Record<
  FeedbackCapability,
  Partial<Record<FeedbackState, string>>
> = {
  affordance: {
    available: "{subject} is available.",
    active: "{subject} is in use.",
    complete: "{subject} is complete.",
  },
  binary: {
    idle: "{subject} is idle.",
    available: "{subject} is ready.",
    active: "{subject} is active.",
    complete: "{subject} is complete.",
    reset: "{subject} has reset.",
  },
  meter: {
    idle: "{subject} is idle.",
    progress: "{subject} is running.",
    complete: "{subject} has finished.",
    expired: "{subject} has expired.",
    reset: "{subject} has reset.",
  },
  counter: {
    idle: "{subject} is idle.",
    progress: "{subject} is counting.",
    complete: "{subject} has reached its target.",
  },
  container: {
    idle: "{subject} is empty.",
    available: "{subject} is ready.",
    progress: "{subject} is occupied.",
    active: "{subject} is occupied.",
    complete: "{subject} is bound.",
  },
  carrier: {
    idle: "{subject} is idle.",
    available: "{subject} is free.",
    active: "{subject} is being carried.",
    progress: "{subject} is placed.",
    complete: "{subject} is docked.",
  },
  barrier: {
    idle: "{subject} is closed.",
    available: "{subject} is ready.",
    active: "{subject} is open.",
    complete: "{subject} is open.",
    reset: "{subject} has reset.",
  },
  conductor: {
    idle: "{subject} is inactive.",
    active: "{subject} is active.",
    progress: "{subject} is conducting.",
    complete: "{subject} is complete.",
  },
  outcome: {
    idle: "{subject} is pending.",
    available: "{subject} is ready.",
    active: "{subject} is active.",
    progress: "{subject} is in progress.",
    complete: "{subject} is complete.",
    blocked: "{subject} is blocked.",
    expired: "{subject} is no longer available.",
    reset: "{subject} has reset.",
  },
};

const REASON_TEXT: Record<RejectionReason, string> = {
  empty: "{subject} is empty.",
  "wrong-shape": "{subject} does not fit that shape.",
  "wrong-tag": "{subject} does not accept that object.",
  "condition-unmet": "{subject} is not ready yet.",
  cooldown: "{subject} is cooling down.",
  "out-of-range": "{subject} is out of range.",
  locked: "{subject} is locked.",
  cleared: "{subject} has already been cleared.",
};

/**
 * Maps the closed semantic vocabulary to player-facing text, icon, and audio
 * cue IDs. Level content may replace the text; the icon and audio key remain
 * deterministic defaults.
 */
export function feedbackLexicon(input: {
  capability: FeedbackCapability;
  state: FeedbackState;
  reason?: RejectionReason;
  labels?: FeedbackLabels;
}): FeedbackLexiconEntry {
  const subject = input.labels?.subject ?? "It";
  const template = input.reason
    ? REASON_TEXT[input.reason]
    : (CAPABILITY_STATE_TEXT[input.capability][input.state] ??
      FALLBACK_STATE_TEXT[input.state]);
  const text = template.replaceAll("{subject}", subject);
  const prefix = input.labels?.actor ? `${input.labels.actor}: ` : "";
  const suffix = input.reason ?? input.state;

  return {
    text: `${prefix}${text}`,
    icon: `${CAPABILITY_ICON[input.capability]}.${suffix}`,
    audioCue: input.reason
      ? `feedback.reject.${input.reason}`
      : `feedback.${input.capability}.${input.state}`,
  };
}
