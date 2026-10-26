import { describe, expect, it } from "vitest";
import type { DialogueDocument } from "../src/pack";
import {
  advanceDialogue,
  chooseDialogueOption,
  conditionMet,
  startDialogue,
} from "../src/narrative";

const dialogue: DialogueDocument = {
  schemaVersion: "1.0",
  id: "dlg-test",
  speaker: "Tester",
  start: "intro",
  nodes: {
    intro: {
      text: "Intro",
      effects: [{ type: "revealConcept", conceptId: "CON-3" }],
      next: "check",
    },
    check: {
      text: "Choose",
      choices: [
        { id: "wrong", text: "Wrong", next: "retry" },
        { id: "right", text: "Right", next: "done" },
      ],
    },
    retry: {
      text: "Try again",
      next: "check",
    },
    done: {
      text: "Done",
      effects: [
        { type: "setFlag", flagId: "answered", value: true },
        { type: "recordEvidence", event: "dialogue_completed" },
      ],
      next: null,
    },
  },
};

describe("narrative", () => {
  it("walks a linear dialogue and reports node effects", () => {
    const started = startDialogue(dialogue);
    expect(started.session.nodeId).toBe("intro");
    expect(started.effects).toEqual([
      { type: "revealConcept", conceptId: "CON-3" },
    ]);
    expect(started.atEnd).toBe(false);

    const next = advanceDialogue(dialogue, started.session);
    expect(next.node?.text).toBe("Choose");
    expect(next.atEnd).toBe(false);
  });

  it("records choices and applies terminal effects", () => {
    const started = startDialogue(dialogue);
    const check = advanceDialogue(dialogue, started.session).session;
    const chosen = chooseDialogueOption(dialogue, check, "right");
    expect(chosen.session.nodeId).toBe("done");
    expect(chosen.session.choices).toEqual([
      { nodeId: "check", choiceId: "right" },
    ]);
    expect(chosen.effects).toHaveLength(2);
    expect(chosen.atEnd).toBe(true);

    const finished = advanceDialogue(dialogue, chosen.session);
    expect(finished.atEnd).toBe(true);
  });

  it("returns the same session for an unknown choice", () => {
    const started = startDialogue(dialogue);
    const check = advanceDialogue(dialogue, started.session).session;
    const chosen = chooseDialogueOption(dialogue, check, "missing");
    expect(chosen.session).toBe(check);
    expect(chosen.node?.text).toBe("Choose");
  });

  it("evaluates conditions without skipping nodes", () => {
    expect(
      conditionMet(
        { type: "hasAbility", id: "signal-dash" },
        { abilities: ["signal-dash"], flags: {}, concepts: [], playerCount: 2 },
      ),
    ).toBe(true);
    expect(
      conditionMet(
        { type: "playerCount", value: 2 },
        { abilities: [], flags: {}, concepts: [], playerCount: 1 },
      ),
    ).toBe(false);
    expect(
      conditionMet(
        { type: "conceptKnown", id: "CON-4" },
        { abilities: [], flags: {}, concepts: ["CON-4"], playerCount: 1 },
      ),
    ).toBe(true);
  });
});
