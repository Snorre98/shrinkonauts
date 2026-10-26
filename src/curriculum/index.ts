import type { LearningEventType } from "../core/learning-events";
import type { PackDocument } from "../pack";
import type {
  Syllabus,
  SyllabusEvidence,
  SyllabusObjective,
} from "../syllabus";

export interface LearningEvent {
  type: LearningEventType;
  at: string;
  [key: string]: unknown;
}

export interface CurriculumSnapshot {
  events: LearningEvent[];
}

export interface EvidenceRuleResult {
  rule: SyllabusEvidence;
  satisfied: boolean;
  matchedEvents: LearningEvent[];
}

export interface ObjectiveProgress {
  objectiveId: string;
  requiredMet: boolean;
  rules: EvidenceRuleResult[];
  evidenceCount: number;
  score: number;
}

export interface DebriefPrompt {
  id: string;
  objectiveId: string;
  prompt: string;
  successCriterion: string;
}

export type PlayerMode = "solo" | "co-op";

export interface EvidenceExportContext {
  pack: PackDocument;
  syllabus: Syllabus;
  mode: PlayerMode;
  exportedAt: string;
  sessionId?: string;
  settings?: {
    textScale?: number;
    reducedMotion?: boolean;
    muted?: boolean;
  };
}

export interface EvidenceExport {
  schemaVersion: string;
  exportedAt: string;
  packId: string;
  packVersion: string;
  syllabusId: string;
  syllabusVersion: string;
  mode: PlayerMode;
  sessionId?: string;
  settings?: EvidenceExportContext["settings"];
  events: LearningEvent[];
  objectives: Array<{
    id: string;
    statement: string;
    requiredMet: boolean;
    evidenceIds: string[];
    score: number;
  }>;
}

export function createCurriculum(
  initial: Partial<CurriculumSnapshot> = {},
): CurriculumSnapshot {
  return { events: [...(initial.events ?? [])] };
}

export interface RecordEventOptions {
  at?: string;
}

/** Records a typed learning event. The caller owns wall-clock injection. */
export function recordEvent(
  state: CurriculumSnapshot,
  event: LearningEvent | ({ type: LearningEventType } & Record<string, unknown>),
  options: RecordEventOptions = {},
): LearningEvent {
  const recorded = {
    ...event,
    at: options.at ?? new Date().toISOString(),
  } as LearningEvent;
  state.events.push(recorded);
  return recorded;
}

function matchesFilter(
  event: LearningEvent,
  filter: Readonly<Record<string, string | number | boolean | null>>,
): boolean {
  return Object.entries(filter).every(([key, expected]) => {
    if (expected === null) return event[key] === null || event[key] === undefined;
    return event[key] === expected;
  });
}

export function eventMatches(
  event: LearningEvent,
  rule: SyllabusEvidence,
): boolean {
  return event.type === rule.event && matchesFilter(event, rule.filter);
}

export function evidenceForObjective(
  syllabus: Syllabus,
  state: CurriculumSnapshot,
  objectiveId: string,
): ObjectiveProgress {
  const rules = syllabus.evidence.filter((rule) =>
    rule.objectiveIds.includes(objectiveId),
  );
  const results: EvidenceRuleResult[] = rules.map((rule) => {
    const matchedEvents = state.events.filter((event) =>
      eventMatches(event, rule),
    );
    return {
      rule,
      satisfied: matchedEvents.length > 0,
      matchedEvents,
    };
  });

  const requiredResults = results.filter((result) => result.rule.required);
  return {
    objectiveId,
    requiredMet:
      requiredResults.length > 0 &&
      requiredResults.every((result) => result.satisfied),
    rules: results,
    evidenceCount: results.filter((result) => result.satisfied).length,
    score: results
      .filter((result) => result.satisfied)
      .reduce((total, result) => total + result.rule.weight, 0),
  };
}

export function evidenceSummary(
  syllabus: Syllabus,
  state: CurriculumSnapshot,
): ObjectiveProgress[] {
  return syllabus.objectives.map((objective) =>
    evidenceForObjective(syllabus, state, objective.id),
  );
}

/**
 * Builds teach-back prompts from the syllabus, so a level never hard-codes
 * learning objectives in UI copy.
 */
export function debriefPrompts(
  syllabus: Syllabus,
  objectiveIds: readonly string[],
): DebriefPrompt[] {
  const prompts: DebriefPrompt[] = [];
  for (const objectiveId of objectiveIds) {
    const objective = syllabus.objectives.find(
      (item) => item.id === objectiveId,
    );
    if (!objective) continue;
    prompts.push(promptForObjective(objective));
  }
  return prompts;
}

function promptForObjective(objective: SyllabusObjective): DebriefPrompt {
  return {
    id: `prompt-${objective.id.toLowerCase()}`,
    objectiveId: objective.id,
    prompt: `In your own words: ${objective.statement}`,
    successCriterion: objective.successCriterion,
  };
}

export function exportEvidence(
  state: CurriculumSnapshot,
  context: EvidenceExportContext,
): EvidenceExport {
  const objectives = context.syllabus.objectives.map((objective) => {
    const progress = evidenceForObjective(
      context.syllabus,
      state,
      objective.id,
    );
    return {
      id: objective.id,
      statement: objective.statement,
      requiredMet: progress.requiredMet,
      evidenceIds: progress.rules
        .filter((result) => result.satisfied)
        .map((result) => result.rule.id),
      score: progress.score,
    };
  });

  return {
    schemaVersion: "1.0",
    exportedAt: context.exportedAt,
    packId: context.pack.id,
    packVersion: context.pack.version,
    syllabusId: context.syllabus.id,
    syllabusVersion: context.syllabus.version,
    mode: context.mode,
    ...(context.sessionId ? { sessionId: context.sessionId } : {}),
    ...(context.settings ? { settings: context.settings } : {}),
    events: state.events.map((event) => ({ ...event })),
    objectives,
  };
}

export function resetProgress(state: CurriculumSnapshot): void {
  state.events.length = 0;
}
