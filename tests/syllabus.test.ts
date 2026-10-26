import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  conceptById,
  objectiveById,
  parseSyllabus,
  prerequisites,
} from "../src/syllabus";

const SYLLABUS_URL = new URL(
  "../docs/shrinkonauts/base-game/syllabi/anatomy-reflex.json",
  import.meta.url,
);

function readSyllabus(): unknown {
  return JSON.parse(readFileSync(SYLLABUS_URL, "utf8"));
}

function clone<T>(value: T): T {
  return structuredClone(value);
}

describe("syllabus parsing", () => {
  it("parses the real anatomy-reflex syllabus", () => {
    const parsed = parseSyllabus(readSyllabus());
    if (!parsed.ok) {
      throw new Error(parsed.error);
    }

    const { syllabus, warnings } = parsed.value;
    expect(syllabus.id).toBe("anatomy-reflex");
    expect(syllabus.objectives).toHaveLength(5);
    expect(syllabus.concepts).toHaveLength(8);
    expect(syllabus.evidence).toHaveLength(6);
    expect(warnings.filter((warning) => warning.includes("OPTIONAL_ONLY"))).toEqual([
      "SYLLABUS_EVIDENCE_OPTIONAL_ONLY: OBJ-4 has only optional evidence rules",
      "SYLLABUS_EVIDENCE_OPTIONAL_ONLY: OBJ-5 has only optional evidence rules",
    ]);
  });

  it("exposes objective, concept, and prerequisite lookups", () => {
    const parsed = parseSyllabus(readSyllabus());
    if (!parsed.ok) throw new Error(parsed.error);
    const { syllabus } = parsed.value;

    expect(objectiveById(syllabus, "OBJ-2")?.verb).toBe("trace");
    expect(conceptById(syllabus, "CON-4")?.term).toBe("Synapse");
    expect(prerequisites(syllabus, "OBJ-3")).toEqual(["OBJ-2"]);
  });

  it("rejects an unsupported schema version", () => {
    const data = readSyllabus() as Record<string, unknown>;
    data.schemaVersion = "2.0";
    const parsed = parseSyllabus(data);
    expect(parsed.ok).toBe(false);
    if (!parsed.ok) {
      expect(parsed.error).toContain("SYLLABUS_SCHEMA_VERSION");
    }
  });

  it("rejects duplicate IDs", () => {
    const data = clone(readSyllabus()) as {
      objectives: Array<{ id: string }>;
    };
    const first = data.objectives[0];
    if (!first) throw new Error("expected objective");
    data.objectives[1] = { ...data.objectives[1], id: first.id } as never;
    const parsed = parseSyllabus(data);
    expect(parsed.ok).toBe(false);
    if (!parsed.ok) {
      expect(parsed.error).toContain("SYLLABUS_DUPLICATE_ID");
    }
  });

  it("rejects unknown concepts and prerequisite cycles", () => {
    const conceptData = clone(readSyllabus()) as {
      objectives: Array<{ conceptIds: string[] }>;
    };
    const objective = conceptData.objectives[0];
    if (!objective) throw new Error("expected objective");
    objective.conceptIds = ["CON-999"];
    const conceptResult = parseSyllabus(conceptData);
    expect(conceptResult.ok).toBe(false);
    if (!conceptResult.ok) {
      expect(conceptResult.error).toContain("SYLLABUS_CONCEPT_MISSING");
    }

    const cycleData = clone(readSyllabus()) as {
      objectives: Array<{ id: string; prerequisiteIds: string[] }>;
    };
    const obj1 = cycleData.objectives[0];
    const obj2 = cycleData.objectives[1];
    if (!obj1 || !obj2) throw new Error("expected objectives");
    obj1.prerequisiteIds = [obj2.id];
    obj2.prerequisiteIds = [obj1.id];
    const cycleResult = parseSyllabus(cycleData);
    expect(cycleResult.ok).toBe(false);
    if (!cycleResult.ok) {
      expect(cycleResult.error).toContain("SYLLABUS_PREREQ_CYCLE");
    }
  });

  it("rejects evidence that points at an unknown objective", () => {
    const data = clone(readSyllabus()) as {
      evidence: Array<{ objectiveIds: string[] }>;
    };
    const rule = data.evidence[0];
    if (!rule) throw new Error("expected evidence");
    rule.objectiveIds = ["OBJ-999"];
    const parsed = parseSyllabus(data);
    expect(parsed.ok).toBe(false);
    if (!parsed.ok) {
      expect(parsed.error).toContain("SYLLABUS_EVIDENCE_ORPHAN");
    }
  });
});
