import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import type { PackDocument } from "../src/pack";
import { parseSyllabus, type Syllabus } from "../src/syllabus";
import {
  createCurriculum,
  debriefPrompts,
  evidenceForObjective,
  exportEvidence,
  recordEvent,
} from "../src/curriculum";

const SYLLABUS_URL = new URL(
  "../docs/shrinkonauts/base-game/syllabi/anatomy-reflex.json",
  import.meta.url,
);

function loadSyllabus(): Syllabus {
  const parsed = parseSyllabus(JSON.parse(readFileSync(SYLLABUS_URL, "utf8")));
  if (!parsed.ok) throw new Error(parsed.error);
  return parsed.value.syllabus;
}

const syllabus = loadSyllabus();

const pack: PackDocument = {
  schemaVersion: "1.0",
  id: "anatomy-reflex",
  title: "Anatomy: The Reflex Arc",
  domain: "anatomy",
  version: "0.1.0",
  syllabusId: "anatomy-reflex",
  startLevelId: "03-nerve-forest",
  endLevelId: "03-nerve-forest",
  levels: ["03-nerve-forest"],
  theme: "theme.json",
  mapping: "mapping.json",
  licenses: "licenses.json",
  assetManifests: {},
};

describe("curriculum", () => {
  it("matches evidence rules by event type and filter", () => {
    const state = createCurriculum();
    recordEvent(
      state,
      { type: "gate_solved", gateId: "gate-nerve-01" },
      { at: "2026-10-26T10:00:00.000Z" },
    );
    recordEvent(
      state,
      { type: "gate_solved", gateId: "gate-other" },
      { at: "2026-10-26T10:01:00.000Z" },
    );

    const progress = evidenceForObjective(syllabus, state, "OBJ-2");
    expect(progress.requiredMet).toBe(true);
    expect(progress.evidenceCount).toBe(1);
    expect(progress.rules[0]?.matchedEvents).toHaveLength(1);
    expect(progress.rules[0]?.matchedEvents[0]?.gateId).toBe("gate-nerve-01");
  });

  it("reports missing required evidence and builds debrief prompts", () => {
    const state = createCurriculum();
    const progress = evidenceForObjective(syllabus, state, "OBJ-2");
    expect(progress.requiredMet).toBe(false);

    const prompts = debriefPrompts(syllabus, ["OBJ-2"]);
    expect(prompts).toHaveLength(1);
    expect(prompts[0]?.id).toBe("prompt-obj-2");
    expect(prompts[0]?.prompt).toContain("Trace the signal");
  });

  it("exports evidence without personal data", () => {
    const state = createCurriculum();
    recordEvent(
      state,
      {
        type: "gate_solved",
        gateId: "gate-nerve-01",
        objectiveId: "OBJ-2",
      },
      { at: "2026-10-26T10:00:00.000Z" },
    );

    const exported = exportEvidence(state, {
      pack,
      syllabus,
      mode: "co-op",
      exportedAt: "2026-10-26T10:05:00.000Z",
      sessionId: "session-1",
      settings: { textScale: 1, reducedMotion: true },
    });

    expect(exported.schemaVersion).toBe("1.0");
    expect(exported.mode).toBe("co-op");
    expect(exported.events).toHaveLength(1);
    expect(exported.objectives.find((item) => item.id === "OBJ-2")).toMatchObject(
      { requiredMet: true, evidenceIds: ["EV-2"] },
    );
    expect(JSON.stringify(exported)).not.toMatch(/@|name|student/i);
  });
});
