import { describe, expect, it } from "vitest";
import {
  PROTOCOL_VERSION,
  type ControllerClientMessage,
  type ControllerServerMessage,
  type NetInput,
  type PlayerSlot,
} from "../../src/net/protocol";
import {
  ControllerSession,
  MAX_RECONNECT_ATTEMPTS,
  PING_TIMEOUT_MS,
  RECONNECT_BASE_DELAY_MS,
  RECONNECT_MAX_DELAY_MS,
  RECONNECT_WINDOW_MS,
  type ControllerSessionView,
} from "../../src/controller/controller-session";
import { FakeTransport } from "../helpers/fake-transport";

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
      dance: false,
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

function welcome(slot: PlayerSlot = "p2"): ControllerServerMessage {
  return {
    v: PROTOCOL_VERSION,
    t: "welcome",
    sessionId: "session-1",
    slot,
    heartbeatSeconds: 25,
  };
}

type Transport = FakeTransport<ControllerClientMessage, ControllerServerMessage>;

class TransportFactory {
  readonly transports: Transport[] = [];

  create = (): Transport => {
    const transport = new FakeTransport<
      ControllerClientMessage,
      ControllerServerMessage
    >();
    this.transports.push(transport);
    return transport;
  };

  get last(): Transport {
    const transport = this.transports.at(-1);
    if (!transport) throw new Error("no transport was created");
    return transport;
  }
}

function setup(slot: PlayerSlot = "p2") {
  const factory = new TransportFactory();
  const views: ControllerSessionView[] = [];
  const clock = { value: 1_000 };
  const session = new ControllerSession({
    room: "abc234",
    slot,
    buildId: "build-1",
    createTransport: factory.create,
    now: () => clock.value,
    onChange: (view) => views.push(view),
  });
  return { factory, views, clock, session };
}

async function connectReady(
  context: ReturnType<typeof setup>,
): Promise<Transport> {
  context.session.markUiReady();
  await context.session.connect();
  const transport = context.factory.last;
  transport.emit(welcome(context.session.slot));
  return transport;
}

describe("ControllerSession", () => {
  it("normalizes the room and sends a controller hello", async () => {
    const context = setup();
    await context.session.connect();

    expect(context.session.room).toBe("ABC234");
    expect(context.session.state).toBe("connecting");
    expect(context.factory.last.takeSent()).toEqual([
      {
        v: PROTOCOL_VERSION,
        t: "hello",
        role: "controller",
        slot: "p2",
        protocol: PROTOCOL_VERSION,
        buildId: "build-1",
      },
    ]);
  });

  it("sends ready only after welcome and the touch UI is ready", async () => {
    const context = setup();
    await context.session.connect();
    const transport = context.factory.last;
    transport.takeSent();

    transport.emit(welcome("p2"));
    expect(context.session.state).toBe("connected");
    expect(transport.takeSent()).toEqual([]);

    context.session.markUiReady();
    expect(context.session.state).toBe("ready");
    expect(transport.takeSent()).toEqual([
      { v: PROTOCOL_VERSION, t: "ready" },
    ]);
  });

  it("sends ready immediately when the UI was ready before welcome", async () => {
    const context = setup();
    context.session.markUiReady();
    await context.session.connect();
    const transport = context.factory.last;
    transport.takeSent();

    transport.emit(welcome("p2"));
    expect(context.session.state).toBe("ready");
    expect(transport.takeSent()).toEqual([
      { v: PROTOCOL_VERSION, t: "ready" },
    ]);
  });

  it("sequences input frames and measures client ticks", async () => {
    const context = setup();
    const transport = await connectReady(context);
    transport.takeSent();

    expect(context.session.sendInput(netInput(1, { interact: true }))).toBe(
      true,
    );
    expect(context.session.sendInput(netInput(-1))).toBe(true);

    const sent = transport.takeSent();
    expect(sent).toHaveLength(2);
    expect(sent[0]).toMatchObject({
      t: "input",
      seq: 0,
      input: { clientTick: 0, intents: { moveX: 1 } },
    });
    expect(sent[1]).toMatchObject({
      t: "input",
      seq: 1,
      input: { clientTick: 1, intents: { moveX: -1 } },
    });
  });

  it("blocks input while paused and resets in-flight state on resume", async () => {
    const context = setup();
    const transport = await connectReady(context);

    transport.emit({
      v: PROTOCOL_VERSION,
      t: "pause",
      reason: "host-paused",
    });
    expect(context.session.state).toBe("paused");
    expect(context.session.view.pausedReason).toBe("host-paused");
    expect(context.session.sendInput(netInput(1))).toBe(false);

    transport.emit({ v: PROTOCOL_VERSION, t: "resume" });
    expect(context.session.state).toBe("ready");
    expect(context.session.sendInput(netInput(1))).toBe(true);
  });

  it("ends cleanly on session-end and never reconnects", async () => {
    const context = setup();
    const transport = await connectReady(context);

    transport.emit({
      v: PROTOCOL_VERSION,
      t: "session-end",
      reason: "host-left",
    });

    expect(context.session.state).toBe("ended");
    expect(context.session.view.endReason).toBe("host-left");
    expect(transport.state).toBe("closed");

    await context.session.tick(100_000);
    expect(context.factory.transports).toHaveLength(1);
  });

  it("treats version mismatches as fatal and reload-recoverable", async () => {
    const context = setup();
    await context.session.connect();
    const transport = context.factory.last;

    transport.emit({
      v: PROTOCOL_VERSION,
      t: "error",
      code: "VERSION_MISMATCH",
      message: "Both players must use the same build",
    });

    expect(context.session.state).toBe("error");
    expect(context.session.view.error).toMatchObject({
      code: "VERSION_MISMATCH",
    });
    await context.session.tick(100_000);
    expect(context.factory.transports).toHaveLength(1);
  });

  it("returns slot and room errors to the join screen", async () => {
    const context = setup();
    const transport = await connectReady(context);

    transport.emit({
      v: PROTOCOL_VERSION,
      t: "error",
      code: "SLOT_UNAVAILABLE",
      message: "The requested controller slot is already bound",
    });

    expect(context.session.state).toBe("ended");
    expect(context.session.view.error).toMatchObject({
      code: "SLOT_UNAVAILABLE",
    });
  });

  it("reconnects with backoff and resumes the same slot", async () => {
    const context = setup();
    const first = await connectReady(context);
    expect(context.session.sendInput(netInput(1))).toBe(true);
    first.close("network-drop");

    await context.session.tick(1_100);
    expect(context.session.state).toBe("reconnecting");
    expect(context.session.view.reconnectAttempt).toBe(1);
    expect(context.factory.transports).toHaveLength(1);

    await context.session.tick(1_100 + RECONNECT_BASE_DELAY_MS);
    expect(context.factory.transports).toHaveLength(2);
    expect(context.factory.last.takeSent()).toEqual([
      {
        v: PROTOCOL_VERSION,
        t: "hello",
        role: "controller",
        slot: "p2",
        protocol: PROTOCOL_VERSION,
        buildId: "build-1",
      },
    ]);

    context.factory.last.emit(welcome("p2"));
    expect(context.session.state).toBe("ready");
    expect(context.session.view.reconnectAttempt).toBe(0);

    context.factory.last.takeSent();
    expect(context.session.sendInput(netInput(-1))).toBe(true);
    expect(context.factory.last.takeSent()[0]).toMatchObject({
      t: "input",
      seq: 1,
    });
  });

  it("gives up when the reconnect window expires", async () => {
    const context = setup();
    const transport = await connectReady(context);
    transport.close("network-drop");

    await context.session.tick(2_000);
    expect(context.session.state).toBe("reconnecting");

    await context.session.tick(2_000 + RECONNECT_WINDOW_MS);
    expect(context.session.state).toBe("ended");
    expect(context.session.view.endReason).toBe("reconnect-timeout");
  });

  it("gives up after the reconnect attempt cap", async () => {
    const context = setup();
    const transport = await connectReady(context);
    transport.close("network-drop");

    let now = 1_100;
    await context.session.tick(now);
    expect(context.session.state).toBe("reconnecting");

    for (let attempt = 0; attempt < MAX_RECONNECT_ATTEMPTS; attempt += 1) {
      now += RECONNECT_MAX_DELAY_MS + 1;
      await context.session.tick(now);
      const next = context.factory.last;
      next.close("network-drop");
      await context.session.tick(now);
      if (context.session.state === "ended") break;
    }

    expect(context.session.state).toBe("ended");
    expect(context.session.view.endReason).toBe("reconnect-exhausted");
  });

  it("records RTT from ping and pong", async () => {
    const context = setup();
    const transport = await connectReady(context);
    transport.takeSent();

    context.clock.value = 6_000;
    await context.session.tick(6_000);
    expect(transport.takeSent()).toEqual([
      { v: PROTOCOL_VERSION, t: "ping", t0: 6_000 },
    ]);

    context.clock.value = 6_042;
    transport.emit({
      v: PROTOCOL_VERSION,
      t: "pong",
      t0: 6_000,
    });
    expect(context.session.view.rttMs).toBe(42);
  });

  it("reconnects when a ping is not answered", async () => {
    const context = setup();
    const transport = await connectReady(context);
    transport.takeSent();

    context.clock.value = 6_000;
    await context.session.tick(6_000);
    expect(context.session.state).toBe("ready");

    context.clock.value = 6_000 + PING_TIMEOUT_MS;
    await context.session.tick(6_000 + PING_TIMEOUT_MS);
    expect(context.session.state).toBe("reconnecting");
    expect(context.session.view.reconnectAttempt).toBe(1);
  });

  it("reconnects when an input write finds a closed socket", async () => {
    const context = setup();
    const transport = await connectReady(context);
    transport.close("network-drop");

    expect(context.session.sendInput(netInput(1))).toBe(false);
    expect(context.session.state).toBe("reconnecting");
  });

  it("reports transport protocol errors as fatal", async () => {
    const context = setup();
    await connectReady(context);

    context.session.reportProtocolError({
      code: "BAD_MESSAGE",
      message: "Message is not valid JSON",
    });

    expect(context.session.state).toBe("error");
    expect(context.session.view.error).toMatchObject({
      code: "BAD_MESSAGE",
    });
  });

  it("closes its transport on destroy without notifying", async () => {
    const context = setup();
    const transport = await connectReady(context);
    const viewCount = context.views.length;

    context.session.destroy();

    expect(transport.state).toBe("closed");
    expect(context.views).toHaveLength(viewCount);
  });
});

describe("ControllerSession control state", () => {
  it("stores control descriptors and sequenced action feedback", async () => {
    const context = setup("p2");
    const transport = await connectReady(context);
    transport.takeSent();

    transport.emit({
      v: PROTOCOL_VERSION,
      t: "control",
      slot: "p2",
      control: {
        mode: "choice",
        choices: 2,
        selected: 1,
        verbs: ["jump", "interact", "scan", "carry"],
        activeVerb: "interact",
        dashReady: false,
      },
    });
    expect(context.session.view.control).toMatchObject({
      mode: "choice",
      choices: 2,
      selected: 1,
    });

    transport.emit({
      v: PROTOCOL_VERSION,
      t: "action",
      slot: "p2",
      feedback: { verb: "carry", result: "accepted" },
    });
    expect(context.session.view.action).toEqual({
      seq: 1,
      feedback: { verb: "carry", result: "accepted" },
    });

    transport.emit({
      v: PROTOCOL_VERSION,
      t: "action",
      slot: "p2",
      feedback: {
        verb: "pulse",
        result: "cooldown",
        reason: "cooldown",
      },
    });
    expect(context.session.view.action?.seq).toBe(2);
  });

  it("rejects control state for another slot", async () => {
    const context = setup("p2");
    const transport = await connectReady(context);

    transport.emit({
      v: PROTOCOL_VERSION,
      t: "control",
      slot: "p1",
      control: {
        mode: "explore",
        verbs: ["jump", "interact", "scan"],
        dashReady: false,
      },
    });
    expect(context.session.state).toBe("error");
    expect(context.session.view.error).toMatchObject({
      code: "PROTOCOL_ERROR",
    });
  });
});
