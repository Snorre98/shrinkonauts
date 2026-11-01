import { describe, expect, it } from "vitest";
import {
  PROTOCOL_VERSION,
  type ControllerClientMessage,
  type HostClientMessage,
  type NetInput,
  type PlayerSlot,
  type ServerMessage,
} from "../../src/net/protocol";
import {
  RoomCore,
  type ConnectionAttachment,
  type RoomSocket,
} from "../../worker/src/room-core";

const ROOM = "ABC234";
const BUILD = "build-1";

class FakeSocket implements RoomSocket {
  attachment: unknown = null;
  readonly sent: ServerMessage[] = [];
  closeInfo: { code?: number; reason?: string } | null = null;

  getAttachment(): unknown {
    return this.attachment;
  }

  setAttachment(value: ConnectionAttachment): void {
    this.attachment = value;
  }

  send(message: ServerMessage): void {
    this.sent.push(message);
  }

  close(code?: number, reason?: string): void {
    this.closeInfo = { code, reason };
  }

  takeSent(): ServerMessage[] {
    return this.sent.splice(0);
  }

  lastSent(): ServerMessage | undefined {
    return this.sent.at(-1);
  }
}

function hostHello(
  phoneSlots: PlayerSlot[] = ["p1", "p2"],
): HostClientMessage {
  return {
    v: PROTOCOL_VERSION,
    t: "host-hello",
    room: ROOM,
    buildId: BUILD,
    protocol: PROTOCOL_VERSION,
    phoneSlots,
  };
}

function controllerHello(slot: PlayerSlot): ControllerClientMessage {
  return {
    v: PROTOCOL_VERSION,
    t: "hello",
    role: "controller",
    slot,
    protocol: PROTOCOL_VERSION,
    buildId: BUILD,
  };
}

function netInput(overrides: {
  moveX?: -1 | 0 | 1;
  interact?: boolean;
} = {}): NetInput {
  return {
    intents: {
      moveX: overrides.moveX ?? 0,
      jump: false,
      dash: false,
    },
    actions: {
      interact: overrides.interact ?? false,
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
    clientTick: 1,
  };
}

function setup(
  phoneSlots: PlayerSlot[] = ["p1", "p2"],
  now: () => number = () => 1_000,
) {
  const core = new RoomCore({
    room: ROOM,
    now,
    newSessionId: () => "session-1",
  });
  const host = new FakeSocket();
  expect(core.onConnect(host, "host")).toBe(true);
  core.onMessage(host, JSON.stringify(hostHello(phoneSlots)));
  return { core, host };
}

function join(
  core: RoomCore,
  slot: PlayerSlot,
): FakeSocket {
  const socket = new FakeSocket();
  expect(core.onConnect(socket, "controller")).toBe(true);
  core.onMessage(socket, JSON.stringify(controllerHello(slot)));
  return socket;
}

function ready(core: RoomCore, socket: FakeSocket): void {
  core.onMessage(
    socket,
    JSON.stringify({ v: PROTOCOL_VERSION, t: "ready" }),
  );
}

describe("RoomCore membership", () => {
  it("accepts a host hello and reports open slots", () => {
    const { host } = setup(["p2"]);

    expect(host.takeSent()).toEqual([
      {
        v: PROTOCOL_VERSION,
        t: "room-state",
        slots: [{ slot: "p2", connected: false, ready: false }],
      },
    ]);
    expect(
      (host.getAttachment() as { sessionId: string }).sessionId,
    ).toBe("session-1");
  });

  it("binds a controller, sends welcome, and publishes readiness", () => {
    const { core, host } = setup(["p2"]);
    host.takeSent();
    const controller = join(core, "p2");

    expect(controller.takeSent()).toEqual([
      {
        v: PROTOCOL_VERSION,
        t: "welcome",
        sessionId: "session-1",
        slot: "p2",
        heartbeatSeconds: 25,
      },
    ]);
    expect(host.lastSent()).toEqual({
      v: PROTOCOL_VERSION,
      t: "room-state",
      slots: [{ slot: "p2", connected: true, ready: false }],
    });

    ready(core, controller);
    expect(host.lastSent()).toEqual({
      v: PROTOCOL_VERSION,
      t: "room-state",
      slots: [{ slot: "p2", connected: true, ready: true }],
    });
  });

  it("rejects a duplicate controller for an already-bound slot", () => {
    const { core } = setup(["p1", "p2"]);
    const first = join(core, "p1");
    const duplicate = new FakeSocket();
    expect(core.onConnect(duplicate, "controller")).toBe(true);
    core.onMessage(
      duplicate,
      JSON.stringify(controllerHello("p1")),
    );

    expect(duplicate.lastSent()).toMatchObject({
      t: "error",
      code: "SLOT_UNAVAILABLE",
    });
    expect(duplicate.closeInfo?.code).toBe(1008);
    expect(core.controllerCount).toBe(1);
    expect(first.closeInfo).toBeNull();
  });

  it("rejects a version or build mismatch before input", () => {
    const { core } = setup(["p2"]);
    const controller = new FakeSocket();
    expect(core.onConnect(controller, "controller")).toBe(true);
    core.onMessage(
      controller,
      JSON.stringify({
        ...controllerHello("p2"),
        buildId: "different-build",
      }),
    );

    expect(controller.lastSent()).toMatchObject({
      t: "error",
      code: "VERSION_MISMATCH",
    });
    expect(controller.closeInfo?.code).toBe(1008);
  });

  it("rejects a controller for an unopened slot", () => {
    const { core } = setup(["p2"]);
    const controller = new FakeSocket();
    expect(core.onConnect(controller, "controller")).toBe(true);
    core.onMessage(
      controller,
      JSON.stringify(controllerHello("p1")),
    );

    expect(controller.lastSent()).toMatchObject({
      t: "error",
      code: "SLOT_UNAVAILABLE",
    });
  });

  it("rejects a third controller connection", () => {
    const { core } = setup(["p1", "p2"]);
    join(core, "p1");
    join(core, "p2");

    const third = new FakeSocket();
    expect(core.onConnect(third, "controller")).toBe(false);
    expect(third.lastSent()).toMatchObject({
      t: "error",
      code: "ROOM_FULL",
    });
  });

  it("rejects duplicate host connections", () => {
    const { core, host } = setup(["p2"]);
    const duplicate = new FakeSocket();

    expect(core.onConnect(duplicate, "host")).toBe(false);
    expect(duplicate.lastSent()).toMatchObject({
      t: "error",
      code: "ROOM_FULL",
    });
    expect(host.closeInfo).toBeNull();
  });
});

describe("RoomCore relay", () => {
  it("relays ready input and pings with the bound slot", () => {
    const { core, host } = setup(["p2"]);
    const controller = join(core, "p2");
    ready(core, controller);
    host.takeSent();

    core.onMessage(
      controller,
      JSON.stringify({
        v: PROTOCOL_VERSION,
        t: "input",
        seq: 4,
        input: netInput({ moveX: 1, interact: true }),
      }),
    );
    expect(host.lastSent()).toEqual({
      v: PROTOCOL_VERSION,
      t: "input",
      slot: "p2",
      seq: 4,
      input: netInput({ moveX: 1, interact: true }),
    });

    core.onMessage(
      controller,
      JSON.stringify({ v: PROTOCOL_VERSION, t: "ping", t0: 42 }),
    );
    expect(host.lastSent()).toEqual({
      v: PROTOCOL_VERSION,
      t: "ping",
      slot: "p2",
      t0: 42,
    });

    core.onMessage(
      host,
      JSON.stringify({
        v: PROTOCOL_VERSION,
        t: "pong",
        slot: "p2",
        t0: 42,
      }),
    );
    expect(controller.lastSent()).toEqual({
      v: PROTOCOL_VERSION,
      t: "pong",
      t0: 42,
    });
  });

  it("does not relay input before the controller is ready", () => {
    const { core, host } = setup(["p2"]);
    const controller = join(core, "p2");
    host.takeSent();

    core.onMessage(
      controller,
      JSON.stringify({
        v: PROTOCOL_VERSION,
        t: "input",
        seq: 1,
        input: netInput({ moveX: 1 }),
      }),
    );

    expect(host.sent.some((message) => message.t === "input")).toBe(false);
    expect(controller.lastSent()).toMatchObject({
      t: "error",
      code: "BAD_MESSAGE",
    });
  });

  it("rate-limits controller input at the Durable Object edge", () => {
    let now = 1_000;
    const { core, host } = setup(["p2"], () => now);
    const controller = join(core, "p2");
    ready(core, controller);
    host.takeSent();

    for (let seq = 0; seq < 120; seq += 1) {
      core.onMessage(
        controller,
        JSON.stringify({
          v: PROTOCOL_VERSION,
          t: "input",
          seq,
          input: netInput(),
        }),
      );
    }
    expect(controller.closeInfo).toBeNull();

    now = 1_001;
    core.onMessage(
      controller,
      JSON.stringify({
        v: PROTOCOL_VERSION,
        t: "input",
        seq: 120,
        input: netInput(),
      }),
    );
    expect(controller.lastSent()).toMatchObject({
      t: "error",
      code: "BAD_MESSAGE",
    });
    expect(controller.closeInfo?.code).toBe(1008);
  });

  it("broadcasts pause and resume to controllers", () => {
    const { core, host } = setup(["p2"]);
    const controller = join(core, "p2");
    ready(core, controller);
    controller.takeSent();

    core.onMessage(
      host,
      JSON.stringify({
        v: PROTOCOL_VERSION,
        t: "pause",
        reason: "host-paused",
      }),
    );
    expect(controller.lastSent()).toEqual({
      v: PROTOCOL_VERSION,
      t: "pause",
      reason: "host-paused",
    });

    core.onMessage(
      host,
      JSON.stringify({
        v: PROTOCOL_VERSION,
        t: "resume",
        reason: "host-resume",
      }),
    );
    expect(controller.lastSent()).toEqual({
      v: PROTOCOL_VERSION,
      t: "resume",
      reason: "host-resume",
    });
  });

  it("closes a controller slot and rejects the closed slot", () => {
    const { core, host } = setup(["p1", "p2"]);
    const controller = join(core, "p2");
    ready(core, controller);
    controller.takeSent();
    host.takeSent();

    core.onMessage(
      host,
      JSON.stringify({
        v: PROTOCOL_VERSION,
        t: "close-slot",
        slot: "p2",
        reason: "keyboard-fallback",
      }),
    );

    expect(controller.lastSent()).toEqual({
      v: PROTOCOL_VERSION,
      t: "session-end",
      reason: "slot-closed",
    });
    expect(controller.closeInfo?.code).toBe(1000);
    expect(host.lastSent()).toEqual({
      v: PROTOCOL_VERSION,
      t: "room-state",
      slots: [{ slot: "p1", connected: false, ready: false }],
    });

    const retry = new FakeSocket();
    expect(core.onConnect(retry, "controller")).toBe(true);
    core.onMessage(retry, JSON.stringify(controllerHello("p2")));
    expect(retry.lastSent()).toMatchObject({
      t: "error",
      code: "SLOT_UNAVAILABLE",
    });
  });

  it("pauses the host view when a controller disconnects", () => {
    const { core, host } = setup(["p2"]);
    const controller = join(core, "p2");
    ready(core, controller);
    host.takeSent();

    core.onClose(controller);

    expect(host.lastSent()).toEqual({
      v: PROTOCOL_VERSION,
      t: "room-state",
      slots: [{ slot: "p2", connected: false, ready: false }],
    });
  });

  it("ends controllers when the host disconnects", () => {
    const { core, host } = setup(["p2"]);
    const controller = join(core, "p2");
    ready(core, controller);
    controller.takeSent();

    core.onClose(host);

    expect(controller.lastSent()).toEqual({
      v: PROTOCOL_VERSION,
      t: "session-end",
      reason: "host-left",
    });
    expect(controller.closeInfo?.code).toBe(1000);
  });

  it("ends the room on host session-end", () => {
    const { core, host } = setup(["p2"]);
    const controller = join(core, "p2");
    ready(core, controller);
    controller.takeSent();

    core.onMessage(
      host,
      JSON.stringify({
        v: PROTOCOL_VERSION,
        t: "session-end",
        reason: "host-left",
      }),
    );

    expect(controller.lastSent()).toEqual({
      v: PROTOCOL_VERSION,
      t: "session-end",
      reason: "host-left",
    });
    expect(host.closeInfo?.code).toBe(1000);
  });

  it("reconstructs membership from attachments after hibernation", () => {
    const { core, host } = setup(["p2"]);
    const controller = join(core, "p2");
    ready(core, controller);
    host.takeSent();
    controller.takeSent();

    const restored = new RoomCore({
      room: ROOM,
      now: () => 1_000,
      newSessionId: () => "session-restored",
    });
    restored.restore(host);
    restored.restore(controller);

    restored.onMessage(
      controller,
      JSON.stringify({
        v: PROTOCOL_VERSION,
        t: "input",
        seq: 0,
        input: netInput({ moveX: -1 }),
      }),
    );

    expect(host.lastSent()).toEqual({
      v: PROTOCOL_VERSION,
      t: "input",
      slot: "p2",
      seq: 0,
      input: netInput({ moveX: -1 }),
    });
  });

  it("rejects malformed, oversized, and wrong-direction messages", () => {
    const { core, host } = setup(["p2"]);
    const controller = join(core, "p2");
    controller.takeSent();
    host.takeSent();

    core.onMessage(controller, "{");
    expect(controller.lastSent()).toMatchObject({
      t: "error",
      code: "BAD_MESSAGE",
    });

    const oversized = new FakeSocket();
    expect(core.onConnect(oversized, "controller")).toBe(true);
    core.onMessage(oversized, "x".repeat(9_000));
    expect(oversized.lastSent()).toMatchObject({
      t: "error",
      code: "BAD_MESSAGE",
    });

    core.onMessage(
      host,
      JSON.stringify({ v: PROTOCOL_VERSION, t: "ready" }),
    );
    expect(host.lastSent()).toMatchObject({
      t: "error",
      code: "BAD_MESSAGE",
    });
  });

  it("never emits game-state messages to controllers", () => {
    const { core, host } = setup(["p1", "p2"]);
    const p1 = join(core, "p1");
    const p2 = join(core, "p2");
    ready(core, p1);
    ready(core, p2);
    core.onMessage(
      host,
      JSON.stringify({
        v: PROTOCOL_VERSION,
        t: "pause",
        reason: "host-hidden",
      }),
    );
    core.onMessage(
      host,
      JSON.stringify({ v: PROTOCOL_VERSION, t: "resume" }),
    );

    const types = [...p1.sent, ...p2.sent].map((message) => message.t);
    expect(types).not.toContain("run");
    expect(types).not.toContain("world");
    expect(types).not.toContain("ui");
    expect(types).toContain("welcome");
    expect(types).toContain("pause");
    expect(types).toContain("resume");
  });
});
