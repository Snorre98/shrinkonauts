export const SYLLABUS_SCHEMA_VERSION = "1.0";

export const OBJECTIVE_VERBS = [
  "identify",
  "trace",
  "explain",
  "predict",
  "transfer",
  "compare",
  "classify",
  "apply",
] as const;

export type ObjectiveVerb = (typeof OBJECTIVE_VERBS)[number];

export const ASSESSMENT_MODES = ["formative", "summative"] as const;
export type AssessmentMode = (typeof ASSESSMENT_MODES)[number];

export const OBJECTIVE_ASSESSMENTS = [
  "concept_log",
  "gate",
  "debrief",
  "challenge",
  "transfer",
] as const;
export type ObjectiveAssessment = (typeof OBJECTIVE_ASSESSMENTS)[number];

export const RELATIONSHIP_TYPES = [
  "part_of",
  "prerequisite_of",
  "enables",
  "contrasts_with",
  "example_of",
  "same_pattern_as",
  "requires",
] as const;
export type RelationshipType = (typeof RELATIONSHIP_TYPES)[number];

export interface SyllabusAudience {
  primary: string;
  secondary?: string;
  curriculum?: string;
  priorKnowledge: string[];
  context: string[];
  sessionMinutes: { slice: number; pack: number };
  device: string;
  players: string;
  accessibility?: string[];
  language?: string;
}

export interface SyllabusProblem {
  statement: string;
  gap: string;
  whyItMatters?: string;
  currentAlternatives?: string[];
}

export interface ConceptRelationship {
  type: string;
  target: string;
}

export interface SyllabusConcept {
  id: string;
  term: string;
  definition: string;
  relationships: ConceptRelationship[];
  misconceptions: string[];
  visual?: string;
  tags?: string[];
}

export interface SyllabusMisconception {
  id: string;
  statement: string;
  whyItPersists?: string;
  correction: string;
  conceptIds: string[];
  addressedBy?: string[];
}

export type EvidenceFilter = Readonly<
  Record<string, string | number | boolean | null>
>;

export interface SyllabusEvidence {
  id: string;
  description: string;
  event: string;
  filter: EvidenceFilter;
  required: boolean;
  weight: number;
  objectiveIds: string[];
  conceptIds: string[];
}

export interface SyllabusObjective {
  id: string;
  verb: ObjectiveVerb;
  statement: string;
  conceptIds: string[];
  prerequisiteIds: string[];
  evidence: string[];
  successCriterion: string;
  assessment: ObjectiveAssessment;
  levelHint?: string;
}

export interface Assessment {
  mode: AssessmentMode;
  stakes?: string;
  methods?: string[];
  teacherDashboard?: boolean;
  notes?: string;
}

export interface ProgressionStage {
  stage: number;
  objectiveIds: string[];
  experience: string;
  evidence?: string[];
}

export interface Transfer {
  target: string;
  statement: string;
  mapping: Array<{ from: string; to: string }>;
  evidence?: string[];
}

export interface SuccessCriterion {
  id: string;
  statement: string;
  method: string;
  threshold: string;
  objectiveIds?: string[];
}

export interface TheoryRow {
  source: string;
  element: string;
  design: string;
  effect: string;
  evidence?: string[];
}

export interface SyllabusScope {
  in?: string[];
  out?: string[];
}

export interface SyllabusMetadata {
  author?: string;
  created?: string;
  updated?: string;
  sourceDocs?: string[];
  license?: string;
  [key: string]: unknown;
}

export interface Syllabus {
  schemaVersion: string;
  id: string;
  title: string;
  version: string;
  status: string;
  audience: SyllabusAudience;
  problem: SyllabusProblem;
  objectives: SyllabusObjective[];
  concepts: SyllabusConcept[];
  misconceptions: SyllabusMisconception[];
  evidence: SyllabusEvidence[];
  assessment: Assessment;
  progression: ProgressionStage[];
  transfer?: Transfer;
  successCriteria: SuccessCriterion[];
  theory: TheoryRow[];
  scope: SyllabusScope;
  metadata: SyllabusMetadata;
}

export interface SyllabusLoadResult {
  syllabus: Syllabus;
  warnings: string[];
}
