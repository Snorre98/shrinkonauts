import type {
  PlayerFrameInput,
  PlayerIntentSource,
  PlayerSlot,
} from "../world/intent-source";
import {
  emptyPlayerUiActions,
  type PlayerActionInput,
  type PlayerUiActions,
} from "../world/runtime-port";
import type { PlayerIntent } from "../world/simulation";
import type { NetInput } from "./protocol";

export type RemoteSourceState = "disconnected" | "connected";

/** Bounds edge backlog if the host cannot sample at the fixed-step rate. */
export const MAX_QUEUED_ACTION_FRAMES = 16;

interface ActionState {
  jump: boolean;
  dash: boolean;
  interact: boolean;
  scan: boolean;
  pulse: boolean;
  carry: boolean;
  throw: boolean;
  ui: PlayerUiActions;
}

function emptyIntent(): PlayerIntent {
  return { moveX: 0, jump: false, dash: false };
}

function emptyActions(): PlayerActionInput {
  return {
    interact: false,
    scan: false,
    pulse: false,
    carry: false,
    throw: false,
    ui: emptyPlayerUiActions(),
  };
}

function actionState(input?: NetInput): ActionState {
  return {
    jump: input?.intents.jump ?? false,
    dash: input?.intents.dash ?? false,
    interact: input?.actions.interact ?? false,
    scan: input?.actions.scan ?? false,
    pulse: input?.actions.pulse ?? false,
    carry: input?.actions.carry ?? false,
    throw: input?.actions.throw ?? false,
    ui: input ? { ...input.actions.ui } : emptyPlayerUiActions(),
  };
}

function hasUiEdge(
  previous: PlayerUiActions,
  next: PlayerUiActions,
): boolean {
  return (
    (next.confirm && !previous.confirm) ||
    (next.cancel && !previous.cancel) ||
    (next.navigateUp && !previous.navigateUp) ||
    (next.navigateDown && !previous.navigateDown) ||
    (next.choose !== null && next.choose !== previous.choose)
  );
}

function actionEdges(
  previous: ActionState,
  next: NetInput,
): {
  intent: PlayerIntent;
  actions: PlayerActionInput;
} | null {
  const intent: PlayerIntent = {
    moveX: 0,
    jump: next.intents.jump && !previous.jump,
    dash: next.intents.dash && !previous.dash,
  };
  const actions: PlayerActionInput = {
    interact: next.actions.interact && !previous.interact,
    scan: next.actions.scan && !previous.scan,
    pulse: next.actions.pulse && !previous.pulse,
    carry: next.actions.carry && !previous.carry,
    throw: next.actions.throw && !previous.throw,
    ui: {
      confirm: next.actions.ui.confirm && !previous.ui.confirm,
      cancel: next.actions.ui.cancel && !previous.ui.cancel,
      navigateUp: next.actions.ui.navigateUp && !previous.ui.navigateUp,
      navigateDown: next.actions.ui.navigateDown && !previous.ui.navigateDown,
      choose:
        next.actions.ui.choose !== null &&
        next.actions.ui.choose !== previous.ui.choose
          ? next.actions.ui.choose
          : null,
    },
  };

  const hasActionEdge =
    intent.jump ||
    intent.dash ||
    actions.interact ||
    actions.scan ||
    actions.pulse ||
    actions.carry ||
    actions.throw ||
    hasUiEdge(previous.ui, next.actions.ui);

  return hasActionEdge ? { intent, actions } : null;
}

/**
 * Host-side input for one controller slot.
 *
 * Movement is the latest held direction. Button and UI actions are queued on
 * their rising edge, so a tap between fixed steps is never lost and a held
 * button is not applied repeatedly.
 */
export class RemotePlayerSource implements PlayerIntentSource {
  readonly slot: PlayerSlot;
  private sourceState: RemoteSourceState = "disconnected";
  private previous: ActionState = actionState();
  private latestMoveX: -1 | 0 | 1 = 0;
  private readonly queued: PlayerFrameInput[] = [];
  private lastSeq = -1;
  private staleFrames = 0;

  constructor(slot: PlayerSlot) {
    this.slot = slot;
  }

  get state(): RemoteSourceState {
    return this.sourceState;
  }

  get lastSequence(): number {
    return this.lastSeq;
  }

  get droppedFrames(): number {
    return this.staleFrames;
  }

  get queuedActions(): number {
    return this.queued.length;
  }

  connect(): void {
    this.sourceState = "connected";
    this.lastSeq = -1;
    this.discard();
  }

  disconnect(): void {
    this.sourceState = "disconnected";
    this.discard();
  }

  ingest(seq: number, input: NetInput): boolean {
    if (this.sourceState !== "connected") {
      this.staleFrames += 1;
      return false;
    }
    if (!Number.isInteger(seq) || seq < 0) {
      this.staleFrames += 1;
      return false;
    }
    if (seq <= this.lastSeq) {
      this.staleFrames += 1;
      return false;
    }

    this.lastSeq = seq;
    this.latestMoveX = input.intents.moveX;
    const edge = actionEdges(this.previous, input);
    if (edge) {
      if (this.queued.length >= MAX_QUEUED_ACTION_FRAMES) {
        this.queued.shift();
        this.staleFrames += 1;
      }
      this.queued.push(edge);
    }
    this.previous = actionState(input);
    return true;
  }

  sample(): PlayerFrameInput {
    if (this.sourceState !== "connected") {
      return { intent: emptyIntent(), actions: emptyActions() };
    }
    const edge = this.queued.shift();
    return {
      intent: {
        moveX: this.latestMoveX,
        jump: edge?.intent.jump ?? false,
        dash: edge?.intent.dash ?? false,
      },
      actions: edge?.actions ?? emptyActions(),
    };
  }

  discard(): void {
    this.latestMoveX = 0;
    this.queued.length = 0;
  }

  destroy(): void {
    this.sourceState = "disconnected";
    this.discard();
    this.queued.length = 0;
    this.previous = actionState();
  }
}
