import { describe, expect, it } from "vitest";
import type { NetInput } from "../../src/net/protocol";
import {
  MAX_QUEUED_ACTION_FRAMES,
  RemotePlayerSource,
} from "../../src/net/remote-player-source";

interface InputOverrides {
  intents?: Partial<NetInput["intents"]>;
  actions?: Partial<Omit<NetInput["actions"], "ui">>;
  ui?: Partial<NetInput["actions"]["ui"]>;
  clientTick?: number;
}

function netInput(overrides: InputOverrides = {}): NetInput {
  return {
    intents: {
      moveX: 0,
      jump: false,
      dash: false,
      ...overrides.intents,
    },
    actions: {
      interact: false,
      scan: false,
      pulse: false,
      carry: false,
      throw: false,
      dance: false,
      ...overrides.actions,
      ui: {
        confirm: false,
        cancel: false,
        navigateUp: false,
        navigateDown: false,
        choose: null,
        ...overrides.ui,
      },
    },
    clientTick: overrides.clientTick ?? 0,
  };
}

function emptyActions() {
  return netInput().actions;
}

describe("RemotePlayerSource", () => {
  it("returns empty input until connected", () => {
    const source = new RemotePlayerSource("p2");

    expect(source.state).toBe("disconnected");
    expect(source.sample()).toEqual({
      intent: { moveX: 0, jump: false, dash: false },
      actions: emptyActions(),
    });
    expect(source.ingest(0, netInput({ intents: { moveX: 1 } }))).toBe(false);
    expect(source.droppedFrames).toBe(1);
  });

  it("holds the latest movement direction until it changes", () => {
    const source = new RemotePlayerSource("p2");
    source.connect();

    expect(source.ingest(0, netInput({ intents: { moveX: 1 } }))).toBe(true);
    expect(source.sample()).toEqual({
      intent: { moveX: 1, jump: false, dash: false },
      actions: emptyActions(),
    });
    expect(source.sample()).toEqual({
      intent: { moveX: 1, jump: false, dash: false },
      actions: emptyActions(),
    });

    source.ingest(1, netInput({ intents: { moveX: -1 } }));
    expect(source.sample().intent).toEqual({
      moveX: -1,
      jump: false,
      dash: false,
    });
  });

  it("latches jump and dash edges without repeating a held button", () => {
    const source = new RemotePlayerSource("p1");
    source.connect();

    source.ingest(0, netInput({ intents: { jump: true, dash: true } }));
    expect(source.sample().intent).toEqual({
      moveX: 0,
      jump: true,
      dash: true,
    });
    expect(source.sample().intent).toEqual({
      moveX: 0,
      jump: false,
      dash: false,
    });

    source.ingest(1, netInput({ intents: { jump: true, dash: true } }));
    expect(source.sample().intent).toEqual({
      moveX: 0,
      jump: false,
      dash: false,
    });

    source.ingest(2, netInput());
    source.ingest(3, netInput({ intents: { jump: true } }));
    expect(source.sample().intent.jump).toBe(true);
  });

  it("queues action edges in arrival order across fixed steps", () => {
    const source = new RemotePlayerSource("p2");
    source.connect();

    source.ingest(0, netInput({ actions: { interact: true } }));
    source.ingest(1, netInput({ actions: { scan: true } }));
    source.ingest(2, netInput({ actions: { pulse: true } }));

    expect(source.queuedActions).toBe(3);
    expect(source.sample().actions.interact).toBe(true);
    expect(source.sample().actions.scan).toBe(true);
    expect(source.sample().actions.pulse).toBe(true);
    expect(source.sample().actions).toEqual(emptyActions());
    expect(source.queuedActions).toBe(0);
  });

  it("latches carry, throw, dance, and UI edges", () => {
    const source = new RemotePlayerSource("p1");
    source.connect();

    source.ingest(
      0,
      netInput({
        actions: { carry: true, throw: true, dance: true },
        ui: {
          confirm: true,
          cancel: true,
          navigateUp: true,
          navigateDown: true,
          choose: 3,
        },
      }),
    );

    expect(source.sample().actions).toEqual({
      interact: false,
      scan: false,
      pulse: false,
      carry: true,
      throw: true,
      dance: true,
      ui: {
        confirm: true,
        cancel: true,
        navigateUp: true,
        navigateDown: true,
        choose: 3,
      },
    });

    source.ingest(1, netInput({ ui: { choose: 3 } }));
    expect(source.sample().actions.ui?.choose).toBeNull();

    source.ingest(2, netInput());
    source.ingest(3, netInput({ ui: { choose: 3 } }));
    expect(source.sample().actions.ui?.choose).toBe(3);
  });

  it("bounds the queued edge backlog", () => {
    const source = new RemotePlayerSource("p2");
    source.connect();

    for (let index = 0; index < MAX_QUEUED_ACTION_FRAMES * 2; index += 1) {
      source.ingest(
        index * 2,
        netInput({ actions: { interact: true } }),
      );
      source.ingest(index * 2 + 1, netInput());
    }

    expect(source.queuedActions).toBe(MAX_QUEUED_ACTION_FRAMES);
    expect(source.droppedFrames).toBe(MAX_QUEUED_ACTION_FRAMES);
  });

  it("drops duplicate and stale sequence numbers", () => {
    const source = new RemotePlayerSource("p2");
    source.connect();

    expect(source.ingest(2, netInput({ intents: { moveX: -1 } }))).toBe(true);
    expect(source.ingest(2, netInput({ intents: { moveX: 1 } }))).toBe(false);
    expect(source.ingest(1, netInput())).toBe(false);
    expect(source.ingest(0, netInput())).toBe(false);

    expect(source.lastSequence).toBe(2);
    expect(source.droppedFrames).toBe(3);
    expect(source.sample().intent.moveX).toBe(-1);
  });

  it("rejects invalid sequence numbers", () => {
    const source = new RemotePlayerSource("p2");
    source.connect();

    expect(source.ingest(-1, netInput())).toBe(false);
    expect(source.ingest(1.5, netInput())).toBe(false);
    expect(source.lastSequence).toBe(-1);
    expect(source.droppedFrames).toBe(2);
  });

  it("discards queued actions and movement without re-firing a held edge", () => {
    const source = new RemotePlayerSource("p2");
    source.connect();

    source.ingest(
      0,
      netInput({ intents: { moveX: 1, jump: true }, actions: { interact: true } }),
    );
    source.discard();

    expect(source.sample()).toEqual({
      intent: { moveX: 0, jump: false, dash: false },
      actions: emptyActions(),
    });

    source.ingest(1, netInput({ intents: { jump: true } }));
    expect(source.sample().intent.jump).toBe(false);

    source.ingest(2, netInput());
    source.ingest(3, netInput({ intents: { jump: true } }));
    expect(source.sample().intent.jump).toBe(true);
  });

  it("resets sequence tracking on reconnect", () => {
    const source = new RemotePlayerSource("p2");
    source.connect();
    source.ingest(5, netInput({ intents: { moveX: 1 } }));
    expect(source.sample().intent.moveX).toBe(1);

    source.disconnect();
    expect(source.sample().intent.moveX).toBe(0);
    expect(source.ingest(6, netInput())).toBe(false);

    source.connect();
    expect(source.lastSequence).toBe(-1);
    expect(source.ingest(0, netInput({ intents: { moveX: -1 } }))).toBe(true);
    expect(source.sample().intent.moveX).toBe(-1);
  });

  it("clears itself on destroy", () => {
    const source = new RemotePlayerSource("p1");
    source.connect();
    source.ingest(
      0,
      netInput({ intents: { moveX: 1, jump: true } }),
    );

    source.destroy();

    expect(source.state).toBe("disconnected");
    expect(source.sample()).toEqual({
      intent: { moveX: 0, jump: false, dash: false },
      actions: emptyActions(),
    });
    expect(source.queuedActions).toBe(0);
  });
});
