import type { Syllabus } from "../syllabus";
import type {
  ConceptMapping,
  DialogueDocument,
  GateDocument,
  LevelDocument,
  MappingDocument,
  ObjectiveMapping,
  PackDocument,
  RoomDocument,
} from "./types";

export interface MappingInput {
  pack: PackDocument;
  syllabus: Syllabus;
  levels: LevelDocument[];
  rooms: Record<string, RoomDocument>;
  dialogues: Record<string, DialogueDocument>;
  gates: Record<string, GateDocument>;
}

function uniqueSorted(values: Iterable<string>): string[] {
  return [...new Set(values)].sort();
}

function objectiveMapping(
  input: MappingInput,
  objectiveId: string,
): ObjectiveMapping {
  const { levels, gates, syllabus } = input;
  const mappedLevels = levels.filter((level) =>
    level.syllabusObjectiveIds.includes(objectiveId),
  );
  const dialogues = uniqueSorted(
    mappedLevels.flatMap((level) => level.dialogueIds),
  );
  const gateIds = uniqueSorted(
    Object.values(gates)
      .filter((gate) => gate.objectiveId === objectiveId)
      .map((gate) => gate.id),
  );
  const objective = syllabus.objectives.find((item) => item.id === objectiveId);

  return {
    levels: uniqueSorted(mappedLevels.map((level) => level.id)),
    dialogues,
    gates: gateIds,
    evidence: uniqueSorted(objective?.evidence ?? []),
    debrief: `debrief-${objectiveId.toLowerCase()}`,
  };
}

function conceptMapping(
  input: MappingInput,
  conceptId: string,
): ConceptMapping {
  const { levels, rooms } = input;
  const mappedLevels = levels.filter((level) =>
    level.conceptIds.includes(conceptId),
  );
  const scanTargets = uniqueSorted(
    mappedLevels.flatMap((level) => {
      const room = rooms[level.roomId];
      return (room?.entities ?? [])
        .filter(
          (entity) =>
            entity.type === "scanTarget" && entity.conceptId === conceptId,
        )
        .map((entity) => entity.id);
    }),
  );

  return {
    levels: uniqueSorted(mappedLevels.map((level) => level.id)),
    dialogues: uniqueSorted(
      mappedLevels.flatMap((level) => level.dialogueIds),
    ),
    scanTargets,
    mapLabels: uniqueSorted(mappedLevels.map((level) => level.map.label)),
  };
}

/**
 * Generates the explicit syllabus-to-content bridge. Dialogs/gates/concepts
 * are derived from level files, never hand-maintained, so `pack:map` can
 * detect drift.
 */
export function buildMapping(input: MappingInput): MappingDocument {
  const objectives: Record<string, ObjectiveMapping> = {};
  for (const objective of input.syllabus.objectives) {
    objectives[objective.id] = objectiveMapping(input, objective.id);
  }

  const concepts: Record<string, ConceptMapping> = {};
  for (const concept of input.syllabus.concepts) {
    concepts[concept.id] = conceptMapping(input, concept.id);
  }

  return {
    schemaVersion: "1.0",
    syllabusId: input.syllabus.id,
    packId: input.pack.id,
    objectives,
    concepts,
  };
}

/** Stable ordering so checked-in mapping files do not churn. */
export function normalizeMapping(mapping: MappingDocument): MappingDocument {
  const objectives: Record<string, ObjectiveMapping> = {};
  for (const objectiveId of Object.keys(mapping.objectives).sort()) {
    const entry = mapping.objectives[objectiveId];
    if (!entry) continue;
    objectives[objectiveId] = {
      levels: uniqueSorted(entry.levels),
      dialogues: uniqueSorted(entry.dialogues),
      gates: uniqueSorted(entry.gates),
      evidence: uniqueSorted(entry.evidence),
      ...(entry.debrief ? { debrief: entry.debrief } : {}),
    };
  }

  const concepts: Record<string, ConceptMapping> = {};
  for (const conceptId of Object.keys(mapping.concepts).sort()) {
    const entry = mapping.concepts[conceptId];
    if (!entry) continue;
    concepts[conceptId] = {
      levels: uniqueSorted(entry.levels),
      dialogues: uniqueSorted(entry.dialogues),
      scanTargets: uniqueSorted(entry.scanTargets),
      mapLabels: uniqueSorted(entry.mapLabels),
    };
  }

  return {
    schemaVersion: mapping.schemaVersion,
    syllabusId: mapping.syllabusId,
    packId: mapping.packId,
    objectives,
    concepts,
  };
}

function difference(
  expected: unknown,
  actual: unknown,
  path: string,
  output: string[],
): void {
  if (Array.isArray(expected) || Array.isArray(actual)) {
    const left = Array.isArray(expected) ? expected : [];
    const right = Array.isArray(actual) ? actual : [];
    if (JSON.stringify(left) !== JSON.stringify(right)) {
      output.push(`${path}: expected [${left.join(", ")}], got [${right.join(", ")}]`);
    }
    return;
  }

  if (
    expected !== null &&
    actual !== null &&
    typeof expected === "object" &&
    typeof actual === "object"
  ) {
    const left = expected as Record<string, unknown>;
    const right = actual as Record<string, unknown>;
    for (const key of new Set([...Object.keys(left), ...Object.keys(right)])) {
      difference(left[key], right[key], path ? `${path}.${key}` : key, output);
    }
    return;
  }

  if (expected !== actual) {
    output.push(`${path}: expected ${String(expected)}, got ${String(actual)}`);
  }
}

/** Human-readable drift lines, empty when the mapping matches. */
export function mappingDrift(
  expected: MappingDocument,
  actual: MappingDocument,
): string[] {
  const differences: string[] = [];
  difference(
    normalizeMapping(expected),
    normalizeMapping(actual),
    "mapping",
    differences,
  );
  return differences;
}
