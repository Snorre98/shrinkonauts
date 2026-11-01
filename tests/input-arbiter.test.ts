import { describe, expect, it } from "vitest";
import { InputArbiter } from "../src/world/input-arbiter";
import type {
  HostActions,
  LocalIntentSource,
  PlayerFrameInput,
  PlayerIntentSource,
  PlayerSlot,
} from "../src/world/intent-source";
import {
  emptyPlayerUiActions,
  type PlayerActionInput,
  type PlayerUiActions,
} from "../src/world/runtime-port";
import type { PlayerIntent } from "../src/world/simulation";

type FrameActionOverrides = Omit<Partial<PlayerActionInput>, "ui"> & {
  ui?: Partial<PlayerUiActions>;
};

const HOST_ACTIONS: HostActions = {
  map: true,
  log: false,
  pause: true,
  mute: false,
  toggleP2: true,
};

function frame(
  intent: Partial<PlayerIntent> = {},
  actions: FrameActionOverrides = {},
): PlayerFrameInput {
  const { ui, ...actionFlags } = actions;
  return {
    intent: {
      moveX: 0,
      jump: false,
      dash: false,
      ...intent,
    },
    actions: {
      interact: false,
      scan: false,
      pulse: false,
      carry: false,
      throw: false,
      ...actionFlags,
      ui: {
        ...emptyPlayerUiActions(),
        ...ui,
      },
    },
  };
}

class FakeLocal implements LocalIntentSource {
  readonly playerCalls: PlayerSlot[] = [];
  hostCalls = 0;
  discards = 0;

  constructor(
    private readonly frames: Record<PlayerSlot, PlayerFrameInput>,
    private readonly host: HostActions = HOST_ACTIONS,
  ) {}

  samplePlayer(id: PlayerSlot): PlayerFrameInput {
    this.playerCalls.push(id);
    return this.frames[id];
  }

  sampleHost(): HostActions {
    this.hostCalls += 1;
    return this.host;
  }

  discard(): void {
    this.discards += 1;
  }
}

class FakeRemote implements PlayerIntentSource {
  sampleCalls = 0;
  discards = 0;
  destroys = 0;

  constructor(private readonly frameValue: PlayerFrameInput = frame()) {}

  sample(): PlayerFrameInput {
    this.sampleCalls += 1;
    return this.frameValue;
  }

  discard(): void {
    this.discards += 1;
  }

  destroy(): void {
    this.destroys += 1;
  }
}

describe("InputArbiter", () => {
  it("routes K/K to the local keyboard and samples host actions locally", () => {
    const localP1 = frame({ moveX: -1 }, { interact: true });
    const local = new FakeLocal({
      p1: localP1,
      p2: frame({ moveX: 1 }, { scan: true }),
    });
    const arbiter = new InputArbiter(local);

    expect(arbiter.hasRemote("p1")).toBe(false);
    expect(arbiter.hasRemote("p2")).toBe(false);
    expect(arbiter.activeSource("p1")).toBe("keyboard");
    expect(arbiter.activeSource("p2")).toBe("keyboard");

    const input = arbiter.sample();

    expect(local.playerCalls).toEqual(["p1", "p2"]);
    expect(local.hostCalls).toBe(1);
    expect(input.intents.p1.moveX).toBe(-1);
    expect(input.intents.p2.moveX).toBe(1);
    expect(input.actions.p1).toEqual(localP1.actions);
    expect(input.actions).toMatchObject(HOST_ACTIONS);
  });

  it("routes K/P locally for P1 and remotely for P2 without sampling local P2", () => {
    const localP1 = frame({ moveX: -1 }, { interact: true });
    const localP2 = frame({ moveX: 1 }, { pulse: true });
    const remoteP2Frame = frame({ moveX: 1 }, { scan: true });
    const remoteP2 = new FakeRemote(remoteP2Frame);
    const local = new FakeLocal({ p1: localP1, p2: localP2 });
    const arbiter = new InputArbiter(local);
    arbiter.setRemote("p2", remoteP2);

    const input = arbiter.sample();

    expect(local.playerCalls).toEqual(["p1"]);
    expect(local.hostCalls).toBe(1);
    expect(remoteP2.sampleCalls).toBe(1);
    expect(input.intents.p1).toEqual(localP1.intent);
    expect(input.intents.p2).toEqual(remoteP2Frame.intent);
    expect(input.actions.p1).toEqual(localP1.actions);
    expect(input.actions.p2).toEqual(remoteP2Frame.actions);
    expect(input.actions).toMatchObject(HOST_ACTIONS);
    expect(arbiter.activeSource("p1")).toBe("keyboard");
    expect(arbiter.activeSource("p2")).toBe("remote");
  });

  it("routes P/K remotely for P1 and locally for P2 without sampling local P1", () => {
    const localP1 = frame({ moveX: -1 }, { scan: true });
    const localP2 = frame({ moveX: 1 }, { interact: true });
    const remoteP1Frame = frame({ moveX: -1 }, { pulse: true });
    const remoteP1 = new FakeRemote(remoteP1Frame);
    const local = new FakeLocal({ p1: localP1, p2: localP2 });
    const arbiter = new InputArbiter(local);
    arbiter.setRemote("p1", remoteP1);

    const input = arbiter.sample();

    expect(local.playerCalls).toEqual(["p2"]);
    expect(local.hostCalls).toBe(1);
    expect(remoteP1.sampleCalls).toBe(1);
    expect(input.intents.p1).toEqual(remoteP1Frame.intent);
    expect(input.intents.p2).toEqual(localP2.intent);
    expect(input.actions.p1).toEqual(remoteP1Frame.actions);
    expect(input.actions.p2).toEqual(localP2.actions);
    expect(input.actions).toMatchObject(HOST_ACTIONS);
    expect(arbiter.activeSource("p1")).toBe("remote");
    expect(arbiter.activeSource("p2")).toBe("keyboard");
  });

  it("routes P/P to remotes while host actions still come from the local keyboard", () => {
    const localP1 = frame({ moveX: 1 }, { interact: true });
    const localP2 = frame({ moveX: -1 }, { scan: true });
    const remoteP1Frame = frame({ moveX: -1, jump: true });
    const remoteP2Frame = frame({ moveX: 1, dash: true });
    const remoteP1 = new FakeRemote(remoteP1Frame);
    const remoteP2 = new FakeRemote(remoteP2Frame);
    const local = new FakeLocal({ p1: localP1, p2: localP2 });
    const arbiter = new InputArbiter(local);
    arbiter.setRemote("p1", remoteP1);
    arbiter.setRemote("p2", remoteP2);

    const input = arbiter.sample();

    expect(local.playerCalls).toEqual([]);
    expect(local.hostCalls).toBe(1);
    expect(remoteP1.sampleCalls).toBe(1);
    expect(remoteP2.sampleCalls).toBe(1);
    expect(input.intents.p1).toEqual(remoteP1Frame.intent);
    expect(input.intents.p2).toEqual(remoteP2Frame.intent);
    expect(input.actions.p1).toEqual(remoteP1Frame.actions);
    expect(input.actions.p2).toEqual(remoteP2Frame.actions);
    expect(input.actions).toMatchObject(HOST_ACTIONS);
    expect(arbiter.activeSource("p1")).toBe("remote");
    expect(arbiter.activeSource("p2")).toBe("remote");
  });

  it("discards local latched input on attach and detach", () => {
    const local = new FakeLocal({ p1: frame(), p2: frame() });
    const remote = new FakeRemote();
    const arbiter = new InputArbiter(local);

    arbiter.setRemote("p2", remote);
    expect(local.discards).toBe(1);

    arbiter.clearRemote("p2");
    expect(local.discards).toBe(2);
    expect(remote.discards).toBe(1);
  });

  it("restores keyboard sampling when a remote source is cleared", () => {
    const localP2 = frame({ moveX: -1 }, { interact: true });
    const local = new FakeLocal({ p1: frame(), p2: localP2 });
    const remote = new FakeRemote(frame({ moveX: 1 }, { scan: true }));
    const arbiter = new InputArbiter(local);
    arbiter.setRemote("p2", remote);

    expect(arbiter.sample().intents.p2).toEqual({
      moveX: 1,
      jump: false,
      dash: false,
    });
    expect(remote.sampleCalls).toBe(1);

    arbiter.clearRemote("p2");
    local.playerCalls.length = 0;
    const input = arbiter.sample();

    expect(arbiter.hasRemote("p2")).toBe(false);
    expect(arbiter.activeSource("p2")).toBe("keyboard");
    expect(local.playerCalls).toEqual(["p1", "p2"]);
    expect(input.intents.p2).toEqual(localP2.intent);
    expect(input.actions.p2).toEqual(localP2.actions);
    expect(remote.sampleCalls).toBe(1);
  });

  it("discards every local and remote source", () => {
    const local = new FakeLocal({ p1: frame(), p2: frame() });
    const remoteP1 = new FakeRemote();
    const remoteP2 = new FakeRemote();
    const arbiter = new InputArbiter(local);
    arbiter.setRemote("p1", remoteP1);
    arbiter.setRemote("p2", remoteP2);
    local.discards = 0;

    arbiter.discard();

    expect(local.discards).toBe(1);
    expect(remoteP1.discards).toBe(1);
    expect(remoteP2.discards).toBe(1);
  });

  it("destroys and clears every remote source", () => {
    const local = new FakeLocal({ p1: frame(), p2: frame() });
    const remoteP1 = new FakeRemote();
    const remoteP2 = new FakeRemote();
    const arbiter = new InputArbiter(local);
    arbiter.setRemote("p1", remoteP1);
    arbiter.setRemote("p2", remoteP2);

    arbiter.destroy();

    expect(remoteP1.destroys).toBe(1);
    expect(remoteP2.destroys).toBe(1);
    expect(arbiter.hasRemote("p1")).toBe(false);
    expect(arbiter.hasRemote("p2")).toBe(false);
    expect(arbiter.activeSource("p1")).toBe("keyboard");
    expect(arbiter.activeSource("p2")).toBe("keyboard");

    arbiter.destroy();
    expect(remoteP1.destroys).toBe(1);
    expect(remoteP2.destroys).toBe(1);
  });

  it("does not fire stale remote input after a slot returns to the keyboard", () => {
    const localP1 = frame({ moveX: 1 });
    const local = new FakeLocal({ p1: localP1, p2: frame() });
    const remoteP1 = new FakeRemote(
      frame({ moveX: -1, jump: true }, { interact: true }),
    );
    const arbiter = new InputArbiter(local);
    arbiter.setRemote("p1", remoteP1);

    expect(arbiter.sample().intents.p1.jump).toBe(true);

    arbiter.clearRemote("p1");
    const input = arbiter.sample();

    expect(input.intents.p1).toEqual(localP1.intent);
    expect(input.actions.p1).toEqual(localP1.actions);
    expect(remoteP1.sampleCalls).toBe(1);
    expect(remoteP1.discards).toBe(1);
  });

  it("discards the previous remote when a slot owner is replaced", () => {
    const local = new FakeLocal({ p1: frame(), p2: frame() });
    const previous = new FakeRemote(frame({ moveX: -1 }));
    const replacementFrame = frame({ moveX: 1 });
    const replacement = new FakeRemote(replacementFrame);
    const arbiter = new InputArbiter(local);
    arbiter.setRemote("p1", previous);

    arbiter.setRemote("p1", replacement);

    expect(previous.discards).toBe(1);
    expect(replacement.discards).toBe(0);
    expect(arbiter.sample().intents.p1).toEqual(replacementFrame.intent);
    expect(previous.sampleCalls).toBe(0);
  });

  it("does not leak input between P1 and P2", () => {
    const remoteP1 = new FakeRemote(
      frame(
        { moveX: -1, jump: true },
        { interact: true, ui: { confirm: true } },
      ),
    );
    const remoteP2 = new FakeRemote(
      frame(
        { moveX: 1, dash: true },
        { pulse: true, ui: { choose: 2 } },
      ),
    );
    const local = new FakeLocal({ p1: frame(), p2: frame() });
    const arbiter = new InputArbiter(local);
    arbiter.setRemote("p1", remoteP1);
    arbiter.setRemote("p2", remoteP2);

    const input = arbiter.sample();

    expect(input.intents.p1).toEqual({ moveX: -1, jump: true, dash: false });
    expect(input.intents.p2).toEqual({ moveX: 1, jump: false, dash: true });
    expect(input.actions.p1.interact).toBe(true);
    expect(input.actions.p1.pulse).toBe(false);
    expect(input.actions.p1.ui?.confirm).toBe(true);
    expect(input.actions.p1.ui?.choose).toBeNull();
    expect(input.actions.p2.interact).toBe(false);
    expect(input.actions.p2.pulse).toBe(true);
    expect(input.actions.p2.ui?.confirm).toBe(false);
    expect(input.actions.p2.ui?.choose).toBe(2);
  });
});
