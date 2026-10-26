import { isLearningEventType } from "../core/learning-events";
import { err, ok, type Result } from "../core/result";
import {
  ASSESSMENT_MODES,
  OBJECTIVE_ASSESSMENTS,
  OBJECTIVE_VERBS,
  SYLLABUS_SCHEMA_VERSION,
  type Assessment,
  type AssessmentMode,
  type ConceptRelationship,
  type EvidenceFilter,
  type ObjectiveAssessment,
  type ObjectiveVerb,
  type ProgressionStage,
  type SuccessCriterion,
  type Syllabus,
  type SyllabusAudience,
  type SyllabusConcept,
  type SyllabusEvidence,
  type SyllabusLoadResult,
  type SyllabusMetadata,
  type SyllabusMisconception,
  type SyllabusObjective,
  type SyllabusProblem,
  type SyllabusScope,
  type TheoryRow,
  type Transfer,
} from "./types";

type UnknownRecord = Record<string, unknown>;
type AddWarning = (message: string) => void;

const CODE = "SYLLABUS_SCHEMA_INVALID";
const OBJECTIVE_ID = /^OBJ-\d+$/;
const CONCEPT_ID = /^CON-\d+$/;
const EVIDENCE_ID = /^EV-\d+$/;
const MISCONCEPTION_ID = /^MIS-\d+$/;

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isSchemaVersionSupported(value: unknown): value is string {
  return typeof value === "string" && /^1\.\d+$/.test(value);
}

function text(
  record: UnknownRecord,
  key: string,
  label = key,
): Result<string> {
  const value = record[key];
  if (typeof value !== "string" || value.trim() === "") {
    return err(`${CODE}: ${label} must be a non-empty string`);
  }
  return ok(value);
}

function optionalText(
  record: UnknownRecord,
  key: string,
  label = key,
): Result<string | undefined> {
  if (record[key] === undefined) {
    return ok(undefined);
  }
  return text(record, key, label);
}

function numberValue(
  record: UnknownRecord,
  key: string,
  label = key,
): Result<number> {
  const value = record[key];
  if (!isFiniteNumber(value)) {
    return err(`${CODE}: ${label} must be a finite number`);
  }
  return ok(value);
}

function booleanValue(
  record: UnknownRecord,
  key: string,
  label = key,
): Result<boolean> {
  const value = record[key];
  if (typeof value !== "boolean") {
    return err(`${CODE}: ${label} must be boolean`);
  }
  return ok(value);
}

function stringArray(
  record: UnknownRecord,
  key: string,
  label = key,
  options: { allowEmpty?: boolean } = {},
): Result<string[]> {
  const value = record[key];
  if (!Array.isArray(value)) {
    return err(`${CODE}: ${label} must be an array of strings`);
  }
  if (!options.allowEmpty && value.length === 0) {
    return err(`${CODE}: ${label} must not be empty`);
  }
  const result: string[] = [];
  for (const [index, entry] of value.entries()) {
    if (typeof entry !== "string" || entry.trim() === "") {
      return err(`${CODE}: ${label}[${index}] must be a non-empty string`);
    }
    result.push(entry);
  }
  return ok(result);
}

function optionalStringArray(
  record: UnknownRecord,
  key: string,
  label = key,
): Result<string[] | undefined> {
  if (record[key] === undefined) {
    return ok(undefined);
  }
  return stringArray(record, key, label, { allowEmpty: true });
}

function parseAudience(value: unknown): Result<SyllabusAudience> {
  if (!isRecord(value)) {
    return err(`${CODE}: audience must be an object`);
  }
  const primary = text(value, "primary", "audience.primary");
  if (!primary.ok) return err(primary.error);
  const priorKnowledge = stringArray(value, "priorKnowledge", "audience.priorKnowledge");
  if (!priorKnowledge.ok) return err(priorKnowledge.error);
  const context = stringArray(value, "context", "audience.context");
  if (!context.ok) return err(context.error);
  const device = text(value, "device", "audience.device");
  if (!device.ok) return err(device.error);
  const players = text(value, "players", "audience.players");
  if (!players.ok) return err(players.error);

  if (!isRecord(value.sessionMinutes)) {
    return err(`${CODE}: audience.sessionMinutes must be an object`);
  }
  const slice = numberValue(value.sessionMinutes, "slice", "audience.sessionMinutes.slice");
  if (!slice.ok) return err(slice.error);
  const pack = numberValue(value.sessionMinutes, "pack", "audience.sessionMinutes.pack");
  if (!pack.ok) return err(pack.error);

  const secondary = optionalText(value, "secondary", "audience.secondary");
  if (!secondary.ok) return err(secondary.error);
  const curriculum = optionalText(value, "curriculum", "audience.curriculum");
  if (!curriculum.ok) return err(curriculum.error);
  const accessibility = optionalStringArray(value, "accessibility", "audience.accessibility");
  if (!accessibility.ok) return err(accessibility.error);
  const language = optionalText(value, "language", "audience.language");
  if (!language.ok) return err(language.error);

  return ok({
    primary: primary.value,
    priorKnowledge: priorKnowledge.value,
    context: context.value,
    sessionMinutes: { slice: slice.value, pack: pack.value },
    device: device.value,
    players: players.value,
    ...(secondary.value ? { secondary: secondary.value } : {}),
    ...(curriculum.value ? { curriculum: curriculum.value } : {}),
    ...(accessibility.value ? { accessibility: accessibility.value } : {}),
    ...(language.value ? { language: language.value } : {}),
  });
}

function parseProblem(value: unknown): Result<SyllabusProblem> {
  if (!isRecord(value)) {
    return err(`${CODE}: problem must be an object`);
  }
  const statement = text(value, "statement", "problem.statement");
  if (!statement.ok) return err(statement.error);
  const gap = text(value, "gap", "problem.gap");
  if (!gap.ok) return err(gap.error);
  const whyItMatters = optionalText(value, "whyItMatters", "problem.whyItMatters");
  if (!whyItMatters.ok) return err(whyItMatters.error);
  const alternatives = optionalStringArray(value, "currentAlternatives", "problem.currentAlternatives");
  if (!alternatives.ok) return err(alternatives.error);

  return ok({
    statement: statement.value,
    gap: gap.value,
    ...(whyItMatters.value ? { whyItMatters: whyItMatters.value } : {}),
    ...(alternatives.value ? { currentAlternatives: alternatives.value } : {}),
  });
}

function parseObjectives(value: unknown): Result<SyllabusObjective[]> {
  if (!Array.isArray(value) || value.length === 0) {
    return err(`${CODE}: objectives must be a non-empty array`);
  }

  const objectives: SyllabusObjective[] = [];
  for (const [index, raw] of value.entries()) {
    if (!isRecord(raw)) {
      return err(`${CODE}: objectives[${index}] must be an object`);
    }
    const id = text(raw, "id", `objectives[${index}].id`);
    if (!id.ok) return err(id.error);
    if (!OBJECTIVE_ID.test(id.value)) {
      return err(`${CODE}: objectives[${index}].id must match OBJ-n`);
    }
    const verb = text(raw, "verb", `objectives[${index}].verb`);
    if (!verb.ok) return err(verb.error);
    if (!OBJECTIVE_VERBS.includes(verb.value as ObjectiveVerb)) {
      return err(`${CODE}: objectives[${index}].verb "${verb.value}" is not allowed`);
    }
    const statement = text(raw, "statement", `objectives[${index}].statement`);
    if (!statement.ok) return err(statement.error);
    const conceptIds = stringArray(raw, "conceptIds", `objectives[${index}].conceptIds`);
    if (!conceptIds.ok) return err(conceptIds.error);
    const prerequisiteIds = stringArray(raw, "prerequisiteIds", `objectives[${index}].prerequisiteIds`, {
      allowEmpty: true,
    });
    if (!prerequisiteIds.ok) return err(prerequisiteIds.error);
    const evidence = stringArray(raw, "evidence", `objectives[${index}].evidence`);
    if (!evidence.ok) return err(evidence.error);
    const successCriterion = text(raw, "successCriterion", `objectives[${index}].successCriterion`);
    if (!successCriterion.ok) return err(successCriterion.error);
    const assessment = text(raw, "assessment", `objectives[${index}].assessment`);
    if (!assessment.ok) return err(assessment.error);
    if (!OBJECTIVE_ASSESSMENTS.includes(assessment.value as ObjectiveAssessment)) {
      return err(`${CODE}: objectives[${index}].assessment "${assessment.value}" is not allowed`);
    }
    const levelHint = optionalText(raw, "levelHint", `objectives[${index}].levelHint`);
    if (!levelHint.ok) return err(levelHint.error);

    objectives.push({
      id: id.value,
      verb: verb.value as ObjectiveVerb,
      statement: statement.value,
      conceptIds: conceptIds.value,
      prerequisiteIds: prerequisiteIds.value,
      evidence: evidence.value,
      successCriterion: successCriterion.value,
      assessment: assessment.value as ObjectiveAssessment,
      ...(levelHint.value ? { levelHint: levelHint.value } : {}),
    });
  }
  return ok(objectives);
}

function parseConcepts(value: unknown): Result<SyllabusConcept[]> {
  if (!Array.isArray(value) || value.length === 0) {
    return err(`${CODE}: concepts must be a non-empty array`);
  }

  const concepts: SyllabusConcept[] = [];
  for (const [index, raw] of value.entries()) {
    if (!isRecord(raw)) {
      return err(`${CODE}: concepts[${index}] must be an object`);
    }
    const id = text(raw, "id", `concepts[${index}].id`);
    if (!id.ok) return err(id.error);
    if (!CONCEPT_ID.test(id.value)) {
      return err(`${CODE}: concepts[${index}].id must match CON-n`);
    }
    const term = text(raw, "term", `concepts[${index}].term`);
    if (!term.ok) return err(term.error);
    const definition = text(raw, "definition", `concepts[${index}].definition`);
    if (!definition.ok) return err(definition.error);

    if (!Array.isArray(raw.relationships)) {
      return err(`${CODE}: concepts[${index}].relationships must be an array`);
    }
    const relationships: ConceptRelationship[] = [];
    for (const [relationshipIndex, relationship] of raw.relationships.entries()) {
      if (!isRecord(relationship)) {
        return err(`${CODE}: concepts[${index}].relationships[${relationshipIndex}] must be an object`);
      }
      const type = text(
        relationship,
        "type",
        `concepts[${index}].relationships[${relationshipIndex}].type`,
      );
      if (!type.ok) return err(type.error);
      const target = text(
        relationship,
        "target",
        `concepts[${index}].relationships[${relationshipIndex}].target`,
      );
      if (!target.ok) return err(target.error);
      relationships.push({ type: type.value, target: target.value });
    }

    const misconceptions = stringArray(raw, "misconceptions", `concepts[${index}].misconceptions`, {
      allowEmpty: true,
    });
    if (!misconceptions.ok) return err(misconceptions.error);
    const visual = optionalText(raw, "visual", `concepts[${index}].visual`);
    if (!visual.ok) return err(visual.error);
    const tags = optionalStringArray(raw, "tags", `concepts[${index}].tags`);
    if (!tags.ok) return err(tags.error);

    concepts.push({
      id: id.value,
      term: term.value,
      definition: definition.value,
      relationships,
      misconceptions: misconceptions.value,
      ...(visual.value ? { visual: visual.value } : {}),
      ...(tags.value ? { tags: tags.value } : {}),
    });
  }
  return ok(concepts);
}

function parseMisconceptions(value: unknown): Result<SyllabusMisconception[]> {
  if (value === undefined) {
    return ok([]);
  }
  if (!Array.isArray(value)) {
    return err(`${CODE}: misconceptions must be an array`);
  }
  const result: SyllabusMisconception[] = [];
  for (const [index, raw] of value.entries()) {
    if (!isRecord(raw)) {
      return err(`${CODE}: misconceptions[${index}] must be an object`);
    }
    const id = text(raw, "id", `misconceptions[${index}].id`);
    if (!id.ok) return err(id.error);
    if (!MISCONCEPTION_ID.test(id.value)) {
      return err(`${CODE}: misconceptions[${index}].id must match MIS-n`);
    }
    const statement = text(raw, "statement", `misconceptions[${index}].statement`);
    if (!statement.ok) return err(statement.error);
    const correction = text(raw, "correction", `misconceptions[${index}].correction`);
    if (!correction.ok) return err(correction.error);
    const conceptIds = stringArray(raw, "conceptIds", `misconceptions[${index}].conceptIds`);
    if (!conceptIds.ok) return err(conceptIds.error);
    const whyItPersists = optionalText(raw, "whyItPersists", `misconceptions[${index}].whyItPersists`);
    if (!whyItPersists.ok) return err(whyItPersists.error);
    const addressedBy = optionalStringArray(raw, "addressedBy", `misconceptions[${index}].addressedBy`);
    if (!addressedBy.ok) return err(addressedBy.error);

    result.push({
      id: id.value,
      statement: statement.value,
      correction: correction.value,
      conceptIds: conceptIds.value,
      ...(whyItPersists.value ? { whyItPersists: whyItPersists.value } : {}),
      ...(addressedBy.value ? { addressedBy: addressedBy.value } : {}),
    });
  }
  return ok(result);
}

function parseEvidence(value: unknown): Result<SyllabusEvidence[]> {
  if (!Array.isArray(value) || value.length === 0) {
    return err(`${CODE}: evidence must be a non-empty array`);
  }

  const evidence: SyllabusEvidence[] = [];
  for (const [index, raw] of value.entries()) {
    if (!isRecord(raw)) {
      return err(`${CODE}: evidence[${index}] must be an object`);
    }
    const id = text(raw, "id", `evidence[${index}].id`);
    if (!id.ok) return err(id.error);
    if (!EVIDENCE_ID.test(id.value)) {
      return err(`${CODE}: evidence[${index}].id must match EV-n`);
    }
    const description = text(raw, "description", `evidence[${index}].description`);
    if (!description.ok) return err(description.error);
    const event = text(raw, "event", `evidence[${index}].event`);
    if (!event.ok) return err(event.error);
    if (!isLearningEventType(event.value)) {
      return err(`${CODE}: evidence[${index}].event "${event.value}" is not a learning event`);
    }

    if (raw.filter !== undefined && !isRecord(raw.filter)) {
      return err(`${CODE}: evidence[${index}].filter must be an object`);
    }
    const filter: Record<string, string | number | boolean | null> = {};
    for (const [key, entry] of Object.entries(
      isRecord(raw.filter) ? raw.filter : {},
    )) {
      if (
        entry !== null &&
        typeof entry !== "string" &&
        typeof entry !== "number" &&
        typeof entry !== "boolean"
      ) {
        return err(`${CODE}: evidence[${index}].filter.${key} must be a scalar`);
      }
      filter[key] = entry;
    }

    let requiredValue = true;
    if (raw.required !== undefined) {
      const required = booleanValue(
        raw,
        "required",
        `evidence[${index}].required`,
      );
      if (!required.ok) return err(required.error);
      requiredValue = required.value;
    }
    let weightValue = 1;
    if (raw.weight !== undefined) {
      const weight = numberValue(raw, "weight", `evidence[${index}].weight`);
      if (!weight.ok) return err(weight.error);
      weightValue = weight.value;
    }
    if (weightValue <= 0) {
      return err(`${CODE}: evidence[${index}].weight must be positive`);
    }
    const objectiveIds = stringArray(raw, "objectiveIds", `evidence[${index}].objectiveIds`);
    if (!objectiveIds.ok) return err(objectiveIds.error);
    const conceptIds = stringArray(raw, "conceptIds", `evidence[${index}].conceptIds`, {
      allowEmpty: true,
    });
    if (!conceptIds.ok) return err(conceptIds.error);

    evidence.push({
      id: id.value,
      description: description.value,
      event: event.value,
      filter: filter as EvidenceFilter,
      required: requiredValue,
      weight: weightValue,
      objectiveIds: objectiveIds.value,
      conceptIds: conceptIds.value,
    });
  }
  return ok(evidence);
}

function parseAssessment(value: unknown): Result<Assessment> {
  if (!isRecord(value)) {
    return err(`${CODE}: assessment must be an object`);
  }
  const mode = text(value, "mode", "assessment.mode");
  if (!mode.ok) return err(mode.error);
  if (!ASSESSMENT_MODES.includes(mode.value as AssessmentMode)) {
    return err(`${CODE}: assessment.mode "${mode.value}" is not allowed`);
  }
  const stakes = optionalText(value, "stakes", "assessment.stakes");
  if (!stakes.ok) return err(stakes.error);
  const methods = optionalStringArray(value, "methods", "assessment.methods");
  if (!methods.ok) return err(methods.error);
  const teacherDashboard = value.teacherDashboard;
  if (teacherDashboard !== undefined && typeof teacherDashboard !== "boolean") {
    return err(`${CODE}: assessment.teacherDashboard must be boolean`);
  }
  const notes = optionalText(value, "notes", "assessment.notes");
  if (!notes.ok) return err(notes.error);

  return ok({
    mode: mode.value as AssessmentMode,
    ...(stakes.value ? { stakes: stakes.value } : {}),
    ...(methods.value ? { methods: methods.value } : {}),
    ...(teacherDashboard !== undefined ? { teacherDashboard } : {}),
    ...(notes.value ? { notes: notes.value } : {}),
  });
}

function parseProgression(value: unknown): Result<ProgressionStage[]> {
  if (value === undefined) {
    return ok([]);
  }
  if (!Array.isArray(value)) {
    return err(`${CODE}: progression must be an array`);
  }
  const stages: ProgressionStage[] = [];
  for (const [index, raw] of value.entries()) {
    if (!isRecord(raw)) {
      return err(`${CODE}: progression[${index}] must be an object`);
    }
    const stage = numberValue(raw, "stage", `progression[${index}].stage`);
    if (!stage.ok) return err(stage.error);
    const objectiveIds = stringArray(raw, "objectiveIds", `progression[${index}].objectiveIds`);
    if (!objectiveIds.ok) return err(objectiveIds.error);
    const experience = text(raw, "experience", `progression[${index}].experience`);
    if (!experience.ok) return err(experience.error);
    const evidence = optionalStringArray(raw, "evidence", `progression[${index}].evidence`);
    if (!evidence.ok) return err(evidence.error);
    stages.push({
      stage: stage.value,
      objectiveIds: objectiveIds.value,
      experience: experience.value,
      ...(evidence.value ? { evidence: evidence.value } : {}),
    });
  }
  return ok(stages);
}

function parseTransfer(value: unknown): Result<Transfer | undefined> {
  if (value === undefined) {
    return ok(undefined);
  }
  if (!isRecord(value)) {
    return err(`${CODE}: transfer must be an object`);
  }
  const target = text(value, "target", "transfer.target");
  if (!target.ok) return err(target.error);
  const statement = text(value, "statement", "transfer.statement");
  if (!statement.ok) return err(statement.error);
  if (!Array.isArray(value.mapping) || value.mapping.length === 0) {
    return err(`${CODE}: transfer.mapping must be a non-empty array`);
  }
  const mapping: Array<{ from: string; to: string }> = [];
  for (const [index, raw] of value.mapping.entries()) {
    if (!isRecord(raw)) {
      return err(`${CODE}: transfer.mapping[${index}] must be an object`);
    }
    const from = text(raw, "from", `transfer.mapping[${index}].from`);
    if (!from.ok) return err(from.error);
    const to = text(raw, "to", `transfer.mapping[${index}].to`);
    if (!to.ok) return err(to.error);
    mapping.push({ from: from.value, to: to.value });
  }
  const evidence = optionalStringArray(value, "evidence", "transfer.evidence");
  if (!evidence.ok) return err(evidence.error);
  return ok({
    target: target.value,
    statement: statement.value,
    mapping,
    ...(evidence.value ? { evidence: evidence.value } : {}),
  });
}

function parseSuccessCriteria(value: unknown): Result<SuccessCriterion[]> {
  if (value === undefined) {
    return ok([]);
  }
  if (!Array.isArray(value)) {
    return err(`${CODE}: successCriteria must be an array`);
  }
  const result: SuccessCriterion[] = [];
  for (const [index, raw] of value.entries()) {
    if (!isRecord(raw)) {
      return err(`${CODE}: successCriteria[${index}] must be an object`);
    }
    const id = text(raw, "id", `successCriteria[${index}].id`);
    if (!id.ok) return err(id.error);
    const statement = text(raw, "statement", `successCriteria[${index}].statement`);
    if (!statement.ok) return err(statement.error);
    const method = text(raw, "method", `successCriteria[${index}].method`);
    if (!method.ok) return err(method.error);
    const threshold = text(raw, "threshold", `successCriteria[${index}].threshold`);
    if (!threshold.ok) return err(threshold.error);
    const objectiveIds = optionalStringArray(raw, "objectiveIds", `successCriteria[${index}].objectiveIds`);
    if (!objectiveIds.ok) return err(objectiveIds.error);
    result.push({
      id: id.value,
      statement: statement.value,
      method: method.value,
      threshold: threshold.value,
      ...(objectiveIds.value ? { objectiveIds: objectiveIds.value } : {}),
    });
  }
  return ok(result);
}

function parseTheory(value: unknown): Result<TheoryRow[]> {
  if (value === undefined) {
    return ok([]);
  }
  if (!Array.isArray(value)) {
    return err(`${CODE}: theory must be an array`);
  }
  const rows: TheoryRow[] = [];
  for (const [index, raw] of value.entries()) {
    if (!isRecord(raw)) {
      return err(`${CODE}: theory[${index}] must be an object`);
    }
    const source = text(raw, "source", `theory[${index}].source`);
    if (!source.ok) return err(source.error);
    const element = text(raw, "element", `theory[${index}].element`);
    if (!element.ok) return err(element.error);
    const design = text(raw, "design", `theory[${index}].design`);
    if (!design.ok) return err(design.error);
    const effect = text(raw, "effect", `theory[${index}].effect`);
    if (!effect.ok) return err(effect.error);
    const evidence = optionalStringArray(raw, "evidence", `theory[${index}].evidence`);
    if (!evidence.ok) return err(evidence.error);
    rows.push({
      source: source.value,
      element: element.value,
      design: design.value,
      effect: effect.value,
      ...(evidence.value ? { evidence: evidence.value } : {}),
    });
  }
  return ok(rows);
}

function parseScope(value: unknown): Result<SyllabusScope> {
  if (value === undefined) {
    return ok({});
  }
  if (!isRecord(value)) {
    return err(`${CODE}: scope must be an object`);
  }
  const inScope = optionalStringArray(value, "in", "scope.in");
  if (!inScope.ok) return err(inScope.error);
  const outScope = optionalStringArray(value, "out", "scope.out");
  if (!outScope.ok) return err(outScope.error);
  return ok({
    ...(inScope.value ? { in: inScope.value } : {}),
    ...(outScope.value ? { out: outScope.value } : {}),
  });
}

function parseMetadata(value: unknown): Result<SyllabusMetadata> {
  if (value === undefined) {
    return ok({});
  }
  if (!isRecord(value)) {
    return err(`${CODE}: metadata must be an object`);
  }
  return ok({ ...value });
}

function duplicateIds(ids: readonly string[]): string[] {
  const seen = new Set<string>();
  const duplicates = new Set<string>();
  for (const id of ids) {
    if (seen.has(id)) {
      duplicates.add(id);
    }
    seen.add(id);
  }
  return [...duplicates];
}

function hasCycle(objectives: readonly SyllabusObjective[]): string | null {
  const byId = new Map(objectives.map((objective) => [objective.id, objective]));
  const visiting = new Set<string>();
  const visited = new Set<string>();

  const visit = (id: string): boolean => {
    if (visited.has(id)) return false;
    if (visiting.has(id)) return true;
    visiting.add(id);
    const objective = byId.get(id);
    if (objective) {
      for (const prerequisite of objective.prerequisiteIds) {
        if (visit(prerequisite)) return true;
      }
    }
    visiting.delete(id);
    visited.add(id);
    return false;
  };

  for (const objective of objectives) {
    if (visit(objective.id)) {
      return objective.id;
    }
  }
  return null;
}

/**
 * Parses and cross-validates a syllabus. Structural errors and reference
 * errors fail the load; advisory coverage gaps are returned as warnings.
 */
export function parseSyllabus(value: unknown): Result<SyllabusLoadResult> {
  if (!isRecord(value)) {
    return err(`${CODE}: syllabus must be an object`);
  }
  if (!isSchemaVersionSupported(value.schemaVersion)) {
    return err(
      `SYLLABUS_SCHEMA_VERSION: expected ${SYLLABUS_SCHEMA_VERSION.split(".")[0]}.x, got ${String(value.schemaVersion)}`,
    );
  }

  const id = text(value, "id");
  if (!id.ok) return err(id.error);
  const title = text(value, "title");
  if (!title.ok) return err(title.error);
  const version = text(value, "version");
  if (!version.ok) return err(version.error);
  const status = text(value, "status");
  if (!status.ok) return err(status.error);

  const audience = parseAudience(value.audience);
  if (!audience.ok) return err(audience.error);
  const problem = parseProblem(value.problem);
  if (!problem.ok) return err(problem.error);
  const objectives = parseObjectives(value.objectives);
  if (!objectives.ok) return err(objectives.error);
  const concepts = parseConcepts(value.concepts);
  if (!concepts.ok) return err(concepts.error);
  const misconceptions = parseMisconceptions(value.misconceptions);
  if (!misconceptions.ok) return err(misconceptions.error);
  const evidence = parseEvidence(value.evidence);
  if (!evidence.ok) return err(evidence.error);
  const assessment = parseAssessment(value.assessment);
  if (!assessment.ok) return err(assessment.error);
  const progression = parseProgression(value.progression);
  if (!progression.ok) return err(progression.error);
  const transfer = parseTransfer(value.transfer);
  if (!transfer.ok) return err(transfer.error);
  const successCriteria = parseSuccessCriteria(value.successCriteria);
  if (!successCriteria.ok) return err(successCriteria.error);
  const theory = parseTheory(value.theory);
  if (!theory.ok) return err(theory.error);
  const scope = parseScope(value.scope);
  if (!scope.ok) return err(scope.error);
  const metadata = parseMetadata(value.metadata);
  if (!metadata.ok) return err(metadata.error);

  const objectiveIds = objectives.value.map((objective) => objective.id);
  const conceptIds = concepts.value.map((concept) => concept.id);
  const evidenceIds = evidence.value.map((rule) => rule.id);
  const misconceptionIds = misconceptions.value.map((item) => item.id);

  const allDuplicates = [
    ...duplicateIds(objectiveIds).map((duplicate) => `objective ${duplicate}`),
    ...duplicateIds(conceptIds).map((duplicate) => `concept ${duplicate}`),
    ...duplicateIds(evidenceIds).map((duplicate) => `evidence ${duplicate}`),
    ...duplicateIds(misconceptionIds).map((duplicate) => `misconception ${duplicate}`),
  ];
  if (allDuplicates.length > 0) {
    return err(`SYLLABUS_DUPLICATE_ID: ${allDuplicates.join(", ")}`);
  }

  const objectiveSet = new Set(objectiveIds);
  const conceptSet = new Set(conceptIds);
  const evidenceSet = new Set(evidenceIds);

  for (const objective of objectives.value) {
    for (const conceptId of objective.conceptIds) {
      if (!conceptSet.has(conceptId)) {
        return err(
          `SYLLABUS_CONCEPT_MISSING: ${objective.id} references ${conceptId}`,
        );
      }
    }
    for (const prerequisite of objective.prerequisiteIds) {
      if (!objectiveSet.has(prerequisite)) {
        return err(
          `SYLLABUS_PREREQ_MISSING: ${objective.id} requires ${prerequisite}`,
        );
      }
    }
    for (const evidenceId of objective.evidence) {
      if (!evidenceSet.has(evidenceId)) {
        return err(
          `SYLLABUS_EVIDENCE_MISSING: ${objective.id} references ${evidenceId}`,
        );
      }
    }
  }

  for (const concept of concepts.value) {
    for (const relationship of concept.relationships) {
      if (!conceptSet.has(relationship.target)) {
        return err(
          `SYLLABUS_CONCEPT_MISSING: ${concept.id} relationship targets ${relationship.target}`,
        );
      }
    }
  }

  for (const item of misconceptions.value) {
    for (const conceptId of item.conceptIds) {
      if (!conceptSet.has(conceptId)) {
        return err(
          `SYLLABUS_CONCEPT_MISSING: ${item.id} references ${conceptId}`,
        );
      }
    }
  }

  for (const rule of evidence.value) {
    for (const objectiveId of rule.objectiveIds) {
      if (!objectiveSet.has(objectiveId)) {
        return err(
          `SYLLABUS_EVIDENCE_ORPHAN: ${rule.id} references ${objectiveId}`,
        );
      }
    }
    for (const conceptId of rule.conceptIds) {
      if (!conceptSet.has(conceptId)) {
        return err(
          `SYLLABUS_CONCEPT_MISSING: ${rule.id} references ${conceptId}`,
        );
      }
    }
  }

  const cycle = hasCycle(objectives.value);
  if (cycle) {
    return err(`SYLLABUS_PREREQ_CYCLE: ${cycle}`);
  }

  for (const objective of objectives.value) {
    const rules = evidence.value.filter((rule) =>
      rule.objectiveIds.includes(objective.id),
    );
    if (rules.length === 0) {
      return err(
        `SYLLABUS_EVIDENCE_MISSING: ${objective.id} has no evidence rule`,
      );
    }
  }

  const warnings: string[] = [];
  const addWarning: AddWarning = (message) => {
    if (!warnings.includes(message)) {
      warnings.push(message);
    }
  };

  for (const objective of objectives.value) {
    const required = evidence.value.some(
      (rule) => rule.required && rule.objectiveIds.includes(objective.id),
    );
    if (!required) {
      addWarning(
        `SYLLABUS_EVIDENCE_OPTIONAL_ONLY: ${objective.id} has only optional evidence rules`,
      );
    }
  }

  const progressionObjectiveIds = new Set(
    progression.value.flatMap((stage) => stage.objectiveIds),
  );
  for (const objective of objectives.value) {
    if (!progressionObjectiveIds.has(objective.id)) {
      addWarning(
        `SYLLABUS_PROGRESSION_MISSING: ${objective.id} is not in progression`,
      );
    }
  }
  for (const concept of concepts.value) {
    if (concept.misconceptions.length === 0) {
      addWarning(
        `SYLLABUS_MISCONCEPTION_MISSING: ${concept.id} has no misconception`,
      );
    }
  }
  for (const row of theory.value) {
    if (!row.evidence || row.evidence.length === 0) {
      addWarning(
        `SYLLABUS_THEORY_INCOMPLETE: ${row.source}/${row.element} has no evidence`,
      );
    }
  }

  const syllabus: Syllabus = {
    schemaVersion: value.schemaVersion,
    id: id.value,
    title: title.value,
    version: version.value,
    status: status.value,
    audience: audience.value,
    problem: problem.value,
    objectives: objectives.value,
    concepts: concepts.value,
    misconceptions: misconceptions.value,
    evidence: evidence.value,
    assessment: assessment.value,
    progression: progression.value,
    successCriteria: successCriteria.value,
    theory: theory.value,
    scope: scope.value,
    metadata: metadata.value,
    ...(transfer.value ? { transfer: transfer.value } : {}),
  };

  return ok({ syllabus, warnings });
}

async function fetchJson(
  url: string,
  fetchImpl: typeof fetch,
): Promise<Result<unknown>> {
  let response: Response;
  try {
    response = await fetchImpl(url, { cache: "no-cache" });
  } catch (error) {
    return err(
      `SYLLABUS_FETCH_FAILED: ${url} (${error instanceof Error ? error.message : String(error)})`,
    );
  }
  if (!response.ok) {
    return err(`SYLLABUS_FETCH_FAILED: ${url} (${response.status})`);
  }
  try {
    return ok(await response.json());
  } catch {
    return err(`SYLLABUS_JSON_INVALID: ${url}`);
  }
}

export async function loadSyllabus(
  url: string,
  fetchImpl: typeof fetch = fetch,
): Promise<Result<SyllabusLoadResult>> {
  const data = await fetchJson(url, fetchImpl);
  if (!data.ok) return err(data.error);
  return parseSyllabus(data.value);
}

export function objectiveById(
  syllabus: Syllabus,
  id: string,
): SyllabusObjective | undefined {
  return syllabus.objectives.find((objective) => objective.id === id);
}

export function conceptById(
  syllabus: Syllabus,
  id: string,
): SyllabusConcept | undefined {
  return syllabus.concepts.find((concept) => concept.id === id);
}

export function prerequisites(
  syllabus: Syllabus,
  objectiveId: string,
): string[] {
  return objectiveById(syllabus, objectiveId)?.prerequisiteIds ?? [];
}
