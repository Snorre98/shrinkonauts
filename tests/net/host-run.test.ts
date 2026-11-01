import { describe, expect, it } from "vitest";
import {
  PROTOCOL_VERSION,
  type HostClientMessage,
  type HostServerMessage,
  type NetInput,
  type PlayerSlot,
} from "../../src/net/protocol";
import {
  HostRunAdapter,
  createHostRunFactory,
} from "../../src/net/host-run";
import type {
  HostRunView,
} from "../../src/game/host-run-port";
import { InputArbiter } from "../../src/world/input-arbiter";
import {
  phoneSlotsForPlan,
  type HostActions,
  type InputPlan,
  type InputSourceKind,
  type LocalIntentSource,
  type PlayerFrameInput,
} from "../../src/world/intent-source";
import {
  emptyPlayerUiActions,
  type PlayerActionInput,
} from "../../src/world/runtime-port";
import { FakeTransport } from "../helpers/fake-transport";

const HOST_ACTIONS: HostActions = {
  map: false,
  log: false,
  pause: false,
  mute: false,
  toggleP2: false,
};

function frame(
  intent: Partial<PlayerFrameInput["intent"]> = {},
  actions: Partial<PlayerActionInput> = {},
): PlayerFrameInput {
  return {
    intent: { moveX: 0, jump: false, dash: false, ...intent },
    actions: {
      interact: false,
      scan: false,
      pulse: false,
      carry: false,
      throw: false,
      ...actions,
      ui: {
        ...emptyPlayerUiActions(),
        ...actions.ui,
      },
    },
  };
}

function netInput(
  moveX: -1 | 0 | 1 = 0,
  actions: { interact?: boolean } = {},
): NetInput {
  return {
    intents: { moveX, jump: false, dash: false },
    actions: {
      interact: actions.interact ?? false,
      scan: false,
      pulse: false,
      carry: false,
      throw: false,
      ui: {
        confirm: false,
        cancel: false,
        navigateUp: false,
        navigateDown: false,
        choose: null,
      },
    },
    clientTick: 0,
  };
}

class FakeLocal implements LocalIntentSource {
  readonly playerCalls: PlayerSlot[] = [];
  discards = 0;

  constructor(
    private readonly p1: PlayerFrameInput,
    private readonly p2: PlayerFrameInput,
  ) {}

  samplePlayer(id: PlayerSlot): PlayerFrameInput {
    this.playerCalls.push(id);
    return id === "p1" ? this.p1 : this.p2;
  }

  sampleHost(): HostActions {
    return HOST_ACTIONS;
  }

  discard(): void {
    this.discards += 1;
  }
}

function plan(
  p1: InputSourceKind,
  p2: InputSourceKind,
): InputPlan {
  return { p1, p2 };
}

async function activate(
  inputPlan: InputPlan,
  localP1 = frame({ moveX: -1 }),
  localP2 = frame({ moveX: 1 }),
) {
  const transport = new FakeTransport<HostClientMessage, HostServerMessage>();
  const local = new FakeLocal(localP1, localP2);
  const arbiter = new InputArbiter(local);
  const views: HostRunView[] = [];
  const run = new HostRunAdapter({
    transport,
    plan: inputPlan,
    room: "ABC234",
    buildId: "build-test",
    autoStart: true,
    now: () => 1_000,
    onStateChange: (view) => views.push(view),
  });
  run.attachInput(arbiter);
  await run.connect();
  for (const slot of phoneSlotsForPlan(inputPlan)) {
    transport.emit({ v: PROTOCOL_VERSION, t: "ready", slot });
  }
  expect(run.view.state).toBe("active");
  return { transport, local, arbiter, run, views };
}

function relayInput(
  transport: FakeTransport<HostClientMessage, HostServerMessage>,
  slot: PlayerSlot,
  seq: number,
  input: NetInput,
): void {
  transport.emit({
    v: PROTOCOL_VERSION,
    t: "input",
    slot,
    seq,
    input,
  });
}

describe("HostRunAdapter", () => {
  it("routes K/P through the local P1 source and remote P2", async () => {
    const p1 = frame({ moveX: -1 }, { interact: true });
    const p2 = frame({ moveX: 1 });
    const { transport, local, arbiter, run, views } = await activate(
      plan("keyboard", "controller"),
      p1,
      p2,
    );

    relayInput(transport, "p2", 0, netInput(1, { interact: true }));
    const input = arbiter.sample();

    expect(local.playerCalls).toEqual(["p1"]);
    expect(input.intents.p1).toEqual(p1.intent);
    expect(input.actions.p1).toEqual(p1.actions);
    expect(input.intents.p2.moveX).toBe(1);
    expect(input.actions.p2.interact).toBe(true);
    expect(run.view.slots.p2).toMatchObject({
      status: "ready",
      source: "controller",
    });
    expect(views.map((view) => view.state)).toEqual(
      expect.arrayContaining(["waiting", "controllers-ready", "active"]),
    );
  });

  it("routes P/K through remote P1 and local P2", async () => {
    const p1 = frame({ moveX: -1 });
    const p2 = frame({ moveX: 1 }, { scan: true });
    const { transport, local, arbiter } = await activate(
      plan("controller", "keyboard"),
      p1,
      p2,
    );

    relayInput(transport, "p1", 0, netInput(-1, { interact: true }));
    const input = arbiter.sample();

    expect(local.playerCalls).toEqual(["p2"]);
    expect(input.intents.p1.moveX).toBe(-1);
    expect(input.actions.p1.interact).toBe(true);
    expect(input.intents.p2).toEqual(p2.intent);
    expect(input.actions.p2).toEqual(p2.actions);
  });

  it("routes P/P entirely through remotes without sampling local slots", async () => {
    const { transport, local, arbiter, run } = await activate(
      plan("controller", "controller"),
    );

    relayInput(transport, "p1", 0, netInput(-1, { interact: true }));
    relayInput(transport, "p2", 0, netInput(1, { interact: true }));
    const input = arbiter.sample();

    expect(local.playerCalls).toEqual([]);
    expect(input.intents.p1.moveX).toBe(-1);
    expect(input.intents.p2.moveX).toBe(1);
    expect(input.actions.p1.interact).toBe(true);
    expect(input.actions.p2.interact).toBe(true);
    expect(run.view.slots.p1.source).toBe("controller");
    expect(run.view.slots.p2.source).toBe("controller");
  });

  it("pauses on controller loss and resumes after reconnect", async () => {
    const { transport, arbiter, run } = await activate(
      plan("keyboard", "controller"),
    );
    transport.emit({
      v: PROTOCOL_VERSION,
      t: "room-state",
      slots: [{ slot: "p2", connected: false, ready: false }],
    });

    expect(run.view.state).toBe("paused");
    expect(run.view.pausedReason).toBe("controller-left");
    expect(run.view.missingSlots).toEqual(["p2"]);
    expect(arbiter.sample().intents.p2).toEqual({
      moveX: 0,
      jump: false,
      dash: false,
    });

    transport.emit({
      v: PROTOCOL_VERSION,
      t: "room-state",
      slots: [{ slot: "p2", connected: true, ready: true }],
    });
    expect(run.view.state).toBe("paused");
    expect(run.resume()).toBe(true);
    expect(run.view.state).toBe("active");

    relayInput(transport, "p2", 0, netInput(1));
    expect(arbiter.sample().intents.p2.moveX).toBe(1);
  });

  it("falls back to the keyboard for a missing controller", async () => {
    const localP2 = frame({ moveX: 1 });
    const { transport, local, arbiter, run } = await activate(
      plan("keyboard", "controller"),
      frame({ moveX: -1 }),
      localP2,
    );
    transport.emit({
      v: PROTOCOL_VERSION,
      t: "room-state",
      slots: [{ slot: "p2", connected: false, ready: false }],
    });
    expect(run.view.state).toBe("paused");

    expect(run.fallbackToKeyboard("p2")).toBe(true);

    expect(run.view.state).toBe("active");
    expect(run.view.missingSlots).toEqual([]);
    expect(run.view.slots.p2).toEqual({
      status: "closed",
      source: "keyboard",
    });
    expect(arbiter.activeSource("p2")).toBe("keyboard");
    local.playerCalls.length = 0;
    const input = arbiter.sample();
    expect(local.playerCalls).toContain("p2");
    expect(input.intents.p2).toEqual(localP2.intent);
  });

  it("survives scene input teardown and reattaches the same remote", async () => {
    const { transport, local, arbiter, run } = await activate(
      plan("keyboard", "controller"),
    );
    relayInput(transport, "p2", 0, netInput(1));
    expect(arbiter.sample().intents.p2.moveX).toBe(1);

    arbiter.destroy();
    const nextArbiter = new InputArbiter(local);
    run.attachInput(nextArbiter);
    relayInput(transport, "p2", 1, netInput(-1));

    expect(nextArbiter.sample().intents.p2.moveX).toBe(-1);
    expect(run.view.state).toBe("active");
  });

  it("detaches remote sources when the host run is destroyed", async () => {
    const { arbiter, run } = await activate(
      plan("keyboard", "controller"),
    );

    run.destroy();

    expect(run.view.state).toBe("ended");
    expect(arbiter.activeSource("p2")).toBe("keyboard");
  });

  it("requires at least one phone slot", () => {
    const transport = new FakeTransport<HostClientMessage, HostServerMessage>();
    expect(
      () =>
        new HostRunAdapter({
          transport,
          plan: plan("keyboard", "keyboard"),
          room: "ABC234",
          buildId: "build-test",
        }),
    ).toThrow("HOST_RUN_NO_CONTROLLERS");
  });

  it("builds a host URL and injects a custom transport", async () => {
    const transport = new FakeTransport<HostClientMessage, HostServerMessage>();
    let captured = "";
    const factory = createHostRunFactory({
      netUrl: "ws://relay.example.test",
      createTransport: (url) => {
        captured = url;
        return transport;
      },
    });
    const run = factory({
      plan: plan("keyboard", "controller"),
      room: "abc234",
      buildId: "build-test",
      autoStart: true,
    });

    expect(run.room).toBe("ABC234");
    expect(captured).toBe(
      "ws://relay.example.test/ws?room=ABC234&role=host",
    );
    await run.connect();
    run.destroy();
  });
});
