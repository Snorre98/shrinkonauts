import { defineComponent } from "../ecs";
import type {
  Conversation as ConversationData,
  CueState as CueStateData,
  EffectInstance as EffectInstanceData,
  EffectPlan as EffectPlanData,
  FeedbackAccessibility,
  FeedbackAnchor,
  FeedbackContent,
  FeedbackLifetime,
  FeedbackOwnership,
  FeedbackPresentation,
  FeedbackState,
  FeedbackVisual,
  PlayerId,
  RejectionReason,
  SourceRef as SourceRefValue,
} from "./types";

export const SourceRef = defineComponent<SourceRefValue>("feedback.source");
export const ActorRef = defineComponent<PlayerId | null>("feedback.actor");
export const Anchor = defineComponent<FeedbackAnchor>("feedback.anchor");
export const Presentation =
  defineComponent<FeedbackPresentation>("feedback.presentation");
export const Content = defineComponent<FeedbackContent>("feedback.content");
export const Ownership =
  defineComponent<FeedbackOwnership>("feedback.ownership");
export const Lifetime = defineComponent<FeedbackLifetime>("feedback.lifetime");
export const Priority = defineComponent<number>("feedback.priority");
export const Visual = defineComponent<FeedbackVisual>("feedback.visual");
export const Accessibility =
  defineComponent<FeedbackAccessibility>("feedback.accessibility");
export const State = defineComponent<FeedbackState>("feedback.state");
export const Reason =
  defineComponent<RejectionReason | null>("feedback.reason");

export const EffectPlan = defineComponent<EffectPlanData>("feedback.effectPlan");
export const EffectInstance =
  defineComponent<EffectInstanceData>("feedback.effectInstance");
export const Conversation =
  defineComponent<ConversationData>("feedback.conversation");

/** Internal list of effect plans carried by a surface or cue. */
export const Effects = defineComponent<readonly EffectPlanData[]>(
  "feedback.effects",
);

/** Internal transient-cue metadata. */
export const CueState = defineComponent<CueStateData>("feedback.cue");
