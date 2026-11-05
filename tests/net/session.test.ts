import { describe, expect, it } from "vitest";
import {
  MAX_INPUT_MESSAGES_PER_SECOND,
  PROTOCOL_VERSION,
  type HostClientMessage,
  type HostServerMessage,
  type NetInput,
} from "../../src/net/protocol";
import { HostSession } from "../../src/net/session";
import { InputArbiter } from "../../src/world/input-arbiter";
import type {
  HostActions,
  LocalIntentSource,
  PlayerFrameInput,
  PlayerSlot,
} from "../../src/world/intent-source";
import {
  emptyPlayerUiActions,
  type PlayerActionInput,
} from "../../src/world/runtime-port";
import { FakeTransport } from "../helpers/fake-transport";

interface InputOverrides {
  intents?: Partial<NetInput["intents"]>;
  actions?: Partial<Omit<NetInput["actions"], "ui">>;
  ui?: Partial<NetInput["actions"]["ui"]>;
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
    clientTick: 0,
  };
}

function makeSession(
  phoneSlots: readonly PlayerSlot[] = ["p2"],
  now: () => number = () => 1_000,
) {
  const transport = new FakeTransport<HostClientMessage, HostServerMessage>();
  const session = new HostSession({
    transport,
    room: "abc234",
    buildId: "build-test",
    phoneSlots,
    now,
  });
  return { transport, session };
}

function ready(transport: FakeTransport<HostClientMessage, HostServerMessage>, slot: PlayerSlot) {
  transport.emit({ v: PROTOCOL_VERSION, t: "ready", slot });
}

function relayInput(
  transport: FakeTransport<HostClientMessage, HostServerMessage>,
  slot: PlayerSlot,
  seq: number,
  input: NetInput,
) {
  transport.emit({
    v: PROTOCOL_VERSION,
    t: "input",
    slot,
    seq,
    input,
  });
}

const HOST_ACTIONS: HostActions = {
  map: false,
  log: false,
  pause: false,
  mute: false,
  toggleP2: false,
  inspect: false,
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
      dance: false,
      ...actions,
      ui: {
        ...emptyPlayerUiActions(),
        ...actions.ui,
      },
    },
  };
}

function localSource(
  p1: PlayerFrameInput,
  p2: PlayerFrameInput,
): LocalIntentSource {
  return {
    samplePlayer: (id) => (id === "p1" ? p1 : p2),
    sampleHost: () => HOST_ACTIONS,
    discard: () => {},
  };
}

describe("HostSession", () => {
  it("connects as host and sends the room plan", async () => {
    const { transport, session } = makeSession(["p2"]);

    await session.connect();

    expect(session.state).toBe("waiting");
    expect(session.slotStatus("p1")).toBe("keyboard");
    expect(session.slotStatus("p2")).toBe("open");
    expect(transport.takeSent()).toEqual([
      {
        v: PROTOCOL_VERSION,
        t: "host-hello",
        room: "ABC234",
        buildId: "build-test",
        protocol: PROTOCOL_VERSION,
        phoneSlots: ["p2"],
      },
    ]);
  });

  it("becomes ready, starts, and exposes the remote source", async () => {
    const { transport, session } = makeSession(["p2"]);
    await session.connect();
    transport.takeSent();

    ready(transport, "p2");

    expect(session.state).toBe("controllers-ready");
    expect(session.slotStatus("p2")).toBe("ready");
    const remote = session.remoteFor("p2");
    expect(remote?.state).toBe("connected");

    expect(session.start()).toBe(true);
    expect(session.state).toBe("active");
    expect(transport.takeSent().map((message) => message.t)).toEqual([
      "resume",
    ]);
  });

  it("routes active input into the slot's remote source", async () => {
    const { transport, session } = makeSession(["p2"]);
    await session.connect();
    ready(transport, "p2");
    session.start();
    transport.takeSent();

    relayInput(
      transport,
      "p2",
      0,
      netInput({
        intents: { moveX: 1 },
        actions: { interact: true },
      }),
    );

    const remote = session.remoteFor("p2");
    expect(remote?.lastSequence).toBe(0);
    expect(remote?.sample()).toMatchObject({
      intent: { moveX: 1, jump: false, dash: false },
      actions: { interact: true, scan: false },
    });
  });

  it("drops input before the run starts and for keyboard slots", async () => {
    const { transport, session } = makeSession(["p2"]);
    await session.connect();

    relayInput(transport, "p2", 0, netInput({ intents: { moveX: 1 } }));
    expect(session.droppedInputCount).toBe(1);

    ready(transport, "p2");
    session.start();
    relayInput(transport, "p1", 1, netInput({ intents: { moveX: -1 } }));

    expect(session.droppedInputCount).toBe(2);
    expect(session.remoteFor("p2")?.lastSequence).toBe(-1);
  });

  it("rate-limits controller input deterministically", async () => {
    const { transport, session } = makeSession(["p2"], () => 5_000);
    await session.connect();
    ready(transport, "p2");
    session.start();

    for (let seq = 0; seq <= MAX_INPUT_MESSAGES_PER_SECOND; seq += 1) {
      relayInput(transport, "p2", seq, netInput());
    }

    expect(session.rateLimitedInputCount).toBe(1);
    expect(session.remoteFor("p2")?.lastSequence).toBe(
      MAX_INPUT_MESSAGES_PER_SECOND - 1,
    );
  });

  it("answers controller pings with a slot-scoped pong", async () => {
    const { transport, session } = makeSession(["p2"], () => 7_000);
    await session.connect();
    ready(transport, "p2");
    transport.takeSent();

    transport.emit({
      v: PROTOCOL_VERSION,
      t: "ping",
      slot: "p2",
      t0: 42,
    });

    expect(session.lastPingAt("p2")).toBe(7_000);
    expect(transport.takeSent()).toEqual([
      {
        v: PROTOCOL_VERSION,
        t: "pong",
        slot: "p2",
        t0: 42,
      },
    ]);
  });

  it("pauses on controller loss and resumes after reconnect", async () => {
    const { transport, session } = makeSession(["p2"]);
    await session.connect();
    ready(transport, "p2");
    session.start();
    transport.takeSent();

    transport.emit({
      v: PROTOCOL_VERSION,
      t: "room-state",
      slots: [{ slot: "p2", connected: false, ready: false }],
    });

    expect(session.state).toBe("paused");
    expect(session.paused).toBe("controller-left");
    expect(session.remoteFor("p2")?.state).toBe("disconnected");
    expect(transport.takeSent().map((message) => message.t)).toEqual([
      "pause",
    ]);

    relayInput(transport, "p2", 0, netInput({ intents: { moveX: 1 } }));
    expect(session.droppedInputCount).toBe(1);

    transport.emit({
      v: PROTOCOL_VERSION,
      t: "room-state",
      slots: [{ slot: "p2", connected: true, ready: true }],
    });

    expect(session.state).toBe("paused");
    expect(session.remoteFor("p2")?.state).toBe("connected");
    expect(session.resume()).toBe(true);
    expect(session.state).toBe("active");
    expect(transport.takeSent().map((message) => message.t)).toEqual([
      "resume",
    ]);
  });

  it("closes a slot for keyboard fallback and resumes the session", async () => {
    const { transport, session } = makeSession(["p1", "p2"]);
    await session.connect();
    ready(transport, "p1");
    ready(transport, "p2");
    session.start();
    transport.takeSent();

    transport.emit({
      v: PROTOCOL_VERSION,
      t: "room-state",
      slots: [
        { slot: "p1", connected: false, ready: false },
        { slot: "p2", connected: true, ready: true },
      ],
    });
    expect(session.state).toBe("paused");
    transport.takeSent();

    expect(session.closeSlot("p1")).toBe(true);
    expect(session.slotStatus("p1")).toBe("closed");
    expect(session.remoteFor("p1")).toBeNull();
    expect(transport.takeSent().map((message) => message.t)).toEqual([
      "close-slot",
    ]);

    expect(session.resume()).toBe(true);
    expect(session.state).toBe("active");

    relayInput(transport, "p1", 0, netInput());
    expect(session.droppedInputCount).toBe(1);
  });

  it("ends cleanly when the relay ends the session", async () => {
    const { transport, session } = makeSession(["p2"]);
    await session.connect();
    ready(transport, "p2");
    session.start();
    const remote = session.remoteFor("p2");
    transport.takeSent();

    transport.emit({
      v: PROTOCOL_VERSION,
      t: "session-end",
      reason: "host-left",
    });

    expect(session.state).toBe("ended");
    expect(remote?.state).toBe("disconnected");
    expect(transport.state).toBe("closed");
    expect(transport.closeReason).toBe("host-left");
    expect(transport.takeSent()).toEqual([]);
  });

  it("sends session-end when the host ends the session", async () => {
    const { transport, session } = makeSession(["p2"]);
    await session.connect();
    transport.takeSent();

    session.end("host-left");

    expect(session.state).toBe("ended");
    expect(transport.takeSent()).toEqual([
      {
        v: PROTOCOL_VERSION,
        t: "session-end",
        reason: "host-left",
      },
    ]);
  });

  it("never sends game-state messages on the host control channel", async () => {
    const { transport, session } = makeSession(["p1", "p2"]);
    await session.connect();
    ready(transport, "p1");
    ready(transport, "p2");
    session.start();
    transport.emit({
      v: PROTOCOL_VERSION,
      t: "ping",
      slot: "p1",
      t0: 1,
    });
    session.pause();
    session.resume();
    session.end();

    const types = transport.takeSent().map((message) => message.t);
    expect(types).not.toContain("run");
    expect(types).not.toContain("world");
    expect(types).not.toContain("ui");
    expect(new Set(types)).toEqual(
      new Set([
        "host-hello",
        "resume",
        "pong",
        "pause",
        "session-end",
      ]),
    );
  });
});

describe("session input plans", () => {
  it("covers K/K, K/P, P/K, and P/P through the arbiter", async () => {
    const p1 = frame({ moveX: -1 }, { interact: true });
    const p2 = frame({ moveX: 1 }, { scan: true });

    const keyboardOnly = new InputArbiter(localSource(p1, p2));
    const kk = keyboardOnly.sample();
    expect(kk.intents.p1.moveX).toBe(-1);
    expect(kk.intents.p2.moveX).toBe(1);
    expect(keyboardOnly.activeSource("p1")).toBe("keyboard");
    expect(keyboardOnly.activeSource("p2")).toBe("keyboard");

    const kp = makeSession(["p2"]);
    await kp.session.connect();
    ready(kp.transport, "p2");
    kp.session.start();
    relayInput(
      kp.transport,
      "p2",
      0,
      netInput({ intents: { moveX: 1 }, actions: { scan: true } }),
    );
    const kpArbiter = new InputArbiter(localSource(p1, p2));
    const kpRemote = kp.session.remoteFor("p2");
    expect(kpRemote).not.toBeNull();
    if (kpRemote) kpArbiter.setRemote("p2", kpRemote);
    const kpInput = kpArbiter.sample();
    expect(kpInput.intents.p1).toEqual(p1.intent);
    expect(kpInput.intents.p2.moveX).toBe(1);
    expect(kpInput.actions.p2.scan).toBe(true);

    const pk = makeSession(["p1"]);
    await pk.session.connect();
    ready(pk.transport, "p1");
    pk.session.start();
    relayInput(
      pk.transport,
      "p1",
      0,
      netInput({ intents: { moveX: -1 }, actions: { interact: true } }),
    );
    const pkArbiter = new InputArbiter(localSource(p1, p2));
    const pkRemote = pk.session.remoteFor("p1");
    expect(pkRemote).not.toBeNull();
    if (pkRemote) pkArbiter.setRemote("p1", pkRemote);
    const pkInput = pkArbiter.sample();
    expect(pkInput.intents.p1.moveX).toBe(-1);
    expect(pkInput.actions.p1.interact).toBe(true);
    expect(pkInput.intents.p2).toEqual(p2.intent);

    const pp = makeSession(["p1", "p2"]);
    await pp.session.connect();
    ready(pp.transport, "p1");
    ready(pp.transport, "p2");
    pp.session.start();
    relayInput(
      pp.transport,
      "p1",
      0,
      netInput({ intents: { moveX: -1 }, actions: { interact: true } }),
    );
    relayInput(
      pp.transport,
      "p2",
      0,
      netInput({ intents: { moveX: 1 }, actions: { pulse: true } }),
    );
    const ppArbiter = new InputArbiter(localSource(p1, p2));
    const p1Remote = pp.session.remoteFor("p1");
    const p2Remote = pp.session.remoteFor("p2");
    expect(p1Remote).not.toBeNull();
    expect(p2Remote).not.toBeNull();
    if (p1Remote) ppArbiter.setRemote("p1", p1Remote);
    if (p2Remote) ppArbiter.setRemote("p2", p2Remote);
    const ppInput = ppArbiter.sample();
    expect(ppInput.intents.p1.moveX).toBe(-1);
    expect(ppInput.actions.p1.interact).toBe(true);
    expect(ppInput.intents.p2.moveX).toBe(1);
    expect(ppInput.actions.p2.pulse).toBe(true);
  });
});
