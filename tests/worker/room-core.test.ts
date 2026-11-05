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
  type RoomCoreOptions,
  type RoomSocket,
  type RoomSocketMetadata,
} from "../../worker/src/room-core";

const ROOM = "ABC234";
const BUILD = "build-1";
const HOST_DEVICE = "host-device";
const FAR_FUTURE = 1_000_000;

class FakeSocket implements RoomSocket {
  attachment: unknown = null;
  readonly sent: ServerMessage[] = [];
  closeInfo: { code?: number; reason?: string } | null = null;

  constructor(readonly metadata: RoomSocketMetadata) {}

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

function hostSocket(
  expiresAt = FAR_FUTURE,
  deviceId = HOST_DEVICE,
): FakeSocket {
  return new FakeSocket({ deviceId, expiresAt, slot: null });
}

function controllerSocket(
  slot: PlayerSlot,
  deviceId = `device-${slot}`,
  expiresAt = FAR_FUTURE,
): FakeSocket {
  return new FakeSocket({ deviceId, expiresAt, slot });
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
  options: Partial<RoomCoreOptions> = {},
) {
  const core = new RoomCore({
    room: ROOM,
    now,
    newSessionId: () => "session-1",
    ...options,
  });
  const host = hostSocket();
  expect(core.onConnect(host, "host")).toBe(true);
  core.onMessage(host, JSON.stringify(hostHello(phoneSlots)));
  return { core, host };
}

function join(
  core: RoomCore,
  slot: PlayerSlot,
  deviceId = `device-${slot}`,
): FakeSocket {
  const socket = controllerSocket(slot, deviceId);
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

  it("rejects a controller before the host hello", () => {
    const core = new RoomCore({ room: ROOM, now: () => 1_000 });
    const host = hostSocket();
    expect(core.onConnect(host, "host")).toBe(true);

    const controller = controllerSocket("p1");
    expect(core.onConnect(controller, "controller")).toBe(false);
    expect(controller.lastSent()).toMatchObject({
      t: "error",
      code: "SLOT_UNAVAILABLE",
    });
  });

  it("rejects a duplicate controller for an already-bound slot", () => {
    const { core } = setup(["p1", "p2"]);
    const first = join(core, "p1");
    const duplicate = controllerSocket("p1", "another-device");

    expect(core.onConnect(duplicate, "controller")).toBe(false);
    expect(duplicate.lastSent()).toMatchObject({
      t: "error",
      code: "SLOT_UNAVAILABLE",
    });
    expect(core.controllerCount).toBe(1);
    expect(first.closeInfo).toBeNull();
  });

  it("rejects a version or build mismatch before input", () => {
    const { core } = setup(["p2"]);
    const controller = controllerSocket("p2");
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
    const controller = controllerSocket("p1");

    expect(core.onConnect(controller, "controller")).toBe(false);
    expect(controller.lastSent()).toMatchObject({
      t: "error",
      code: "SLOT_UNAVAILABLE",
    });
  });

  it("rejects a third controller connection", () => {
    const { core } = setup(["p1", "p2"]);
    join(core, "p1");
    join(core, "p2");

    const third = controllerSocket("p1", "device-p3");
    expect(core.onConnect(third, "controller")).toBe(false);
    expect(third.lastSent()).toMatchObject({
      t: "error",
      code: "ROOM_FULL",
    });
  });

  it("rejects the host device as a controller", () => {
    const { core } = setup(["p1"]);
    const controller = controllerSocket("p1", HOST_DEVICE);

    expect(core.onConnect(controller, "controller")).toBe(false);
    expect(controller.lastSent()).toMatchObject({
      t: "error",
      code: "DEVICE_REJECTED",
    });
  });

  it("rejects the same device in both controller slots", () => {
    const { core } = setup(["p1", "p2"]);
    join(core, "p1", "shared-device");
    const second = controllerSocket("p2", "shared-device");

    expect(core.onConnect(second, "controller")).toBe(false);
    expect(second.lastSent()).toMatchObject({
      t: "error",
      code: "DEVICE_REJECTED",
    });
  });

  it("rejects duplicate host connections", () => {
    const { core, host } = setup(["p2"]);
    const duplicate = hostSocket();

    expect(core.onConnect(duplicate, "host")).toBe(false);
    expect(duplicate.lastSent()).toMatchObject({
      t: "error",
      code: "ROOM_FULL",
    });
    expect(host.closeInfo).toBeNull();
  });

  it("rejects an expired session before accepting a socket", () => {
    const core = new RoomCore({ room: ROOM, now: () => 2_000 });
    const host = hostSocket(1_500);

    expect(core.onConnect(host, "host")).toBe(false);
    expect(host.lastSent()).toMatchObject({
      t: "error",
      code: "SESSION_EXPIRED",
    });
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

  it("rate-limits all controller messages, including ping and ready", () => {
    let now = 1_000;
    const { core, host } = setup(["p2"], () => now, {
      maxControllerMessagesPerSecond: 2,
    });
    const controller = join(core, "p2");
    ready(core, controller);
    host.takeSent();
    // hello and ready already consumed the first second bucket.
    now = 2_000;
    core.onMessage(
      controller,
      JSON.stringify({ v: PROTOCOL_VERSION, t: "ping", t0: 1 }),
    );
    core.onMessage(
      controller,
      JSON.stringify({ v: PROTOCOL_VERSION, t: "ping", t0: 2 }),
    );
    expect(controller.closeInfo).toBeNull();

    core.onMessage(
      controller,
      JSON.stringify({ v: PROTOCOL_VERSION, t: "ping", t0: 3 }),
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

  it("closes a controller slot, blocks the device, and rejects the closed slot", () => {
    const { core, host } = setup(["p1", "p2"]);
    const controller = join(core, "p2", "device-p2");
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

    const retry = controllerSocket("p2", "device-p2");
    expect(core.onConnect(retry, "controller")).toBe(false);
    expect(retry.lastSent()).toMatchObject({
      t: "error",
      code: "SLOT_UNAVAILABLE",
    });

    const otherSlot = controllerSocket("p1", "device-p2");
    expect(core.onConnect(otherSlot, "controller")).toBe(false);
    expect(otherSlot.lastSent()).toMatchObject({
      t: "error",
      code: "DEVICE_REJECTED",
    });
  });

  it("reserves a disconnected slot for the same device", () => {
    const { core, host } = setup(["p1", "p2"]);
    const controller = join(core, "p2", "device-p2");
    ready(core, controller);
    host.takeSent();

    core.onClose(controller);
    expect(host.lastSent()).toEqual({
      v: PROTOCOL_VERSION,
      t: "room-state",
      slots: [
        { slot: "p1", connected: false, ready: false },
        { slot: "p2", connected: false, ready: false },
      ],
    });

    const otherDevice = controllerSocket("p2", "device-other");
    expect(core.onConnect(otherDevice, "controller")).toBe(false);
    expect(otherDevice.lastSent()).toMatchObject({
      t: "error",
      code: "SLOT_RESERVED",
    });

    const sameDevice = controllerSocket("p2", "device-p2");
    expect(core.onConnect(sameDevice, "controller")).toBe(true);
    core.onMessage(
      sameDevice,
      JSON.stringify(controllerHello("p2")),
    );
    expect(sameDevice.lastSent()).toMatchObject({ t: "welcome" });
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
    const { core, host } = setup(["p1", "p2"]);
    const controller = join(core, "p2");
    controller.takeSent();
    host.takeSent();

    core.onMessage(controller, "{");
    expect(controller.lastSent()).toMatchObject({
      t: "error",
      code: "BAD_MESSAGE",
    });

    const oversized = controllerSocket("p1", "device-oversized");
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

describe("RoomCore demo limits", () => {
  it("ends the room at the session expiry", () => {
    let now = 1_000;
    const ends: string[] = [];
    const core = new RoomCore({
      room: ROOM,
      now: () => now,
      onRoomEnd: (reason) => ends.push(reason),
    });
    const host = hostSocket(1_500);
    expect(core.onConnect(host, "host")).toBe(true);
    core.onMessage(host, JSON.stringify(hostHello(["p2"])));
    const controller = join(core, "p2");
    ready(core, controller);

    now = 1_500;
    core.onAlarm();
    expect(ends).toEqual(["demo-time-limit"]);
    expect(controller.lastSent()).toMatchObject({
      t: "session-end",
      reason: "demo-time-limit",
    });
  });

  it("closes a controller that never completes the handshake", () => {
    let now = 1_000;
    const core = new RoomCore({
      room: ROOM,
      now: () => now,
      handshakeTimeoutMs: 10_000,
    });
    const host = hostSocket();
    expect(core.onConnect(host, "host")).toBe(true);
    core.onMessage(host, JSON.stringify(hostHello(["p2"])));
    const controller = controllerSocket("p2");
    expect(core.onConnect(controller, "controller")).toBe(true);

    now = 11_000;
    core.onAlarm();
    expect(controller.lastSent()).toMatchObject({
      t: "session-end",
      reason: "join-timeout",
    });
  });

  it("ends the room when the message cap is reached", () => {
    const ends: string[] = [];
    const { core, host } = setup(["p2"], () => 1_000, {
      maxMessagesPerRoom: 5,
      onRoomEnd: (reason) => ends.push(reason),
    });
    const controller = join(core, "p2");
    ready(core, controller);

    for (let index = 0; index < 5; index += 1) {
      core.onMessage(
        controller,
        JSON.stringify({ v: PROTOCOL_VERSION, t: "ping", t0: index }),
      );
    }

    expect(ends).toContain("demo-message-limit");
    expect(controller.lastSent()).toMatchObject({
      t: "session-end",
      reason: "demo-message-limit",
    });
    expect(host.closeInfo?.code).toBe(1000);
  });

  it("computes the earliest alarm deadline", () => {
    const core = new RoomCore({
      room: ROOM,
      now: () => 1_000,
      handshakeTimeoutMs: 10_000,
      readyTimeoutMs: 15_000,
    });
    const host = hostSocket(20_000);
    expect(core.onConnect(host, "host")).toBe(true);
    expect(core.nextAlarmAt()).toBe(20_000);
    core.onMessage(host, JSON.stringify(hostHello(["p2"])));
    const controller = controllerSocket("p2");
    expect(core.onConnect(controller, "controller")).toBe(true);
    expect(core.nextAlarmAt()).toBe(11_000);
    core.onMessage(
      controller,
      JSON.stringify(controllerHello("p2")),
    );
    expect(core.nextAlarmAt()).toBe(16_000);
    ready(core, controller);
    expect(core.nextAlarmAt()).toBe(20_000);
  });
});

describe("RoomCore controller control state", () => {
  it("relays host control and action messages only to the target slot", () => {
    const { core, host } = setup(["p1", "p2"]);
    const p1 = join(core, "p1");
    const p2 = join(core, "p2");
    ready(core, p1);
    ready(core, p2);
    host.takeSent();
    p1.takeSent();
    p2.takeSent();

    const control: HostClientMessage = {
      v: PROTOCOL_VERSION,
      t: "control",
      slot: "p1",
      control: {
        mode: "choice",
        choices: 2,
        selected: 1,
        verbs: ["jump", "interact", "scan", "pulse"],
        activeVerb: "interact",
        dashReady: true,
      },
    };
    core.onMessage(host, JSON.stringify(control));
    expect(p1.takeSent()).toEqual([
      {
        v: PROTOCOL_VERSION,
        t: "control",
        slot: "p1",
        control: control.control,
      },
    ]);
    expect(p2.takeSent()).toEqual([]);

    const action: HostClientMessage = {
      v: PROTOCOL_VERSION,
      t: "action",
      slot: "p2",
      feedback: {
        verb: "dash",
        result: "cooldown",
        reason: "cooldown",
        retryAfterMs: 300,
      },
    };
    core.onMessage(host, JSON.stringify(action));
    expect(p2.takeSent()).toEqual([
      {
        v: PROTOCOL_VERSION,
        t: "action",
        slot: "p2",
        feedback: action.feedback,
      },
    ]);
    expect(p1.takeSent()).toEqual([]);
  });

  it("rejects controller-originated control state", () => {
    const { core } = setup(["p1"]);
    const p1 = join(core, "p1");
    ready(core, p1);
    p1.takeSent();

    core.onMessage(
      p1,
      JSON.stringify({
        v: PROTOCOL_VERSION,
        t: "control",
        slot: "p1",
        control: {
          mode: "explore",
          verbs: ["jump", "interact", "scan"],
          dashReady: false,
        },
      }),
    );

    expect(p1.lastSent()).toMatchObject({
      t: "error",
      code: "BAD_MESSAGE",
    });
  });
});
