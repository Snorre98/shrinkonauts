import type {
  DialogueCondition,
  DialogueDocument,
  DialogueEffect,
  DialogueNode,
} from "../pack";

export interface NarrativeContext {
  abilities: readonly string[];
  flags: Readonly<Record<string, boolean>>;
  concepts: readonly string[];
  playerCount: number;
}

export interface DialogueChoiceRecord {
  nodeId: string;
  choiceId: string;
}

export interface DialogueSession {
  dialogueId: string;
  nodeId: string;
  history: string[];
  choices: DialogueChoiceRecord[];
}

export interface DialogueStep {
  session: DialogueSession;
  node: DialogueNode | null;
  effects: DialogueEffect[];
  atEnd: boolean;
}

function enterNode(
  dialogue: DialogueDocument,
  nodeId: string,
  history: string[],
  choices: DialogueChoiceRecord[],
): DialogueStep {
  const node = dialogue.nodes[nodeId];
  if (!node) {
    return {
      session: {
        dialogueId: dialogue.id,
        nodeId,
        history,
        choices,
      },
      node: null,
      effects: [],
      atEnd: true,
    };
  }

  const session: DialogueSession = {
    dialogueId: dialogue.id,
    nodeId,
    history: [...history, nodeId],
    choices,
  };

  return {
    session,
    node,
    effects: node.effects ?? [],
    atEnd: node.next === null && !node.choices,
  };
}

export function startDialogue(dialogue: DialogueDocument): DialogueStep {
  return enterNode(dialogue, dialogue.start, [], []);
}

export function currentNode(
  dialogue: DialogueDocument,
  session: DialogueSession,
): DialogueNode | null {
  return dialogue.nodes[session.nodeId] ?? null;
}

/** Advancing a choice node is a no-op; the UI must call `choose`. */
export function advanceDialogue(
  dialogue: DialogueDocument,
  session: DialogueSession,
): DialogueStep {
  const node = currentNode(dialogue, session);
  if (!node || node.choices) {
    return {
      session,
      node,
      effects: [],
      atEnd: node ? node.next === null && !node.choices : true,
    };
  }
  if (node.next === null || node.next === undefined) {
    return { session, node, effects: [], atEnd: true };
  }
  return enterNode(dialogue, node.next, session.history, session.choices);
}

export function chooseDialogueOption(
  dialogue: DialogueDocument,
  session: DialogueSession,
  choiceId: string,
): DialogueStep {
  const node = currentNode(dialogue, session);
  if (!node?.choices) {
    return {
      session,
      node,
      effects: [],
      atEnd: node ? node.next === null && !node.choices : true,
    };
  }
  const choice = node.choices.find((item) => item.id === choiceId);
  if (!choice) {
    return { session, node, effects: [], atEnd: false };
  }

  const choices = [...session.choices, { nodeId: session.nodeId, choiceId }];
  if (choice.next === null) {
    return {
      session: {
        ...session,
        choices,
        history: [...session.history, `choice:${choiceId}`],
      },
      node,
      effects: [],
      atEnd: true,
    };
  }
  return enterNode(dialogue, choice.next, session.history, choices);
}

/**
 * Conditions are parsed and evaluated for authoring tests. Conditional node
 * skipping is deliberately deferred: it needs a schema/ADR decision, so the M1
 * runner shows every node and never silently skips one.
 */
export function conditionMet(
  condition: DialogueCondition,
  context: NarrativeContext,
): boolean {
  switch (condition.type) {
    case "hasAbility":
      return context.abilities.includes(condition.id);
    case "hasFlag":
      return context.flags[condition.id] === true;
    case "conceptKnown":
      return context.concepts.includes(condition.id);
    case "playerCount":
      return context.playerCount === condition.value;
    default:
      return false;
  }
}
