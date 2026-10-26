/**
 * The event vocabulary is shared by the syllabus (which declares evidence
 * rules) and by the curriculum runtime (which records events). It lives in
 * `core` so neither domain module has to depend on the other.
 */
export const LEARNING_EVENT_TYPES = [
  "pack_loaded",
  "level_started",
  "room_entered",
  "dialogue_started",
  "dialogue_completed",
  "concept_revealed",
  "gate_attempted",
  "gate_solved",
  "gate_failed",
  "hint_used",
  "ability_unlocked",
  "map_revealed",
  "debrief_answered",
  "debrief_completed",
  "level_completed",
  "pack_completed",
  "playtest_observation",
  "teacher_note",
] as const;

export type LearningEventType = (typeof LEARNING_EVENT_TYPES)[number];

export const MANUAL_EVIDENCE_EVENT_TYPES = [
  "playtest_observation",
  "teacher_note",
] as const;

export function isLearningEventType(value: unknown): value is LearningEventType {
  return (
    typeof value === "string" &&
    LEARNING_EVENT_TYPES.includes(value as LearningEventType)
  );
}
