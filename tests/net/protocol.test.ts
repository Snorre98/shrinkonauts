import { describe, expect, it } from "vitest";
import {
  MAX_CONTROLLER_MESSAGE_BYTES,
  PROTOCOL_VERSION,
  decodeControllerClientMessage,
  decodeControllerServerMessage,
  decodeHostServerMessage,
  decodeMessage,
  encodeMessage,
  parseNetInput,
  type ControllerHelloMessage,
  type ControllerInputMessage,
  type ControllerServerMessage,
  type NetInput,
  type RelayInputMessage,
} from "../../src/net/protocol";

function netInput(): NetInput {
  return {
    intents: { moveX: 0, jump: false, dash: false },
    actions: {
      interact: false,
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

function decodeRaw(value: unknown) {
  return decodeMessage(JSON.stringify(value));
}

describe("controller protocol", () => {
  it("round-trips a controller hello", () => {
    const message: ControllerHelloMessage = {
      v: PROTOCOL_VERSION,
      t: "hello",
      role: "controller",
      slot: "p2",
      protocol: PROTOCOL_VERSION,
      buildId: "build-123",
    };

    expect(decodeControllerClientMessage(encodeMessage(message))).toEqual({
      ok: true,
      value: message,
    });
  });

  it("round-trips controller input and host relay input", () => {
    const input = netInput();
    input.intents.moveX = 1;
    input.actions.interact = true;
    input.actions.ui.choose = 2;

    const controller: ControllerInputMessage = {
      v: PROTOCOL_VERSION,
      t: "input",
      seq: 4,
      input,
    };
    expect(decodeControllerClientMessage(encodeMessage(controller))).toEqual({
      ok: true,
      value: controller,
    });

    const relayed: RelayInputMessage = {
      v: PROTOCOL_VERSION,
      t: "input",
      slot: "p2",
      seq: 4,
      input,
    };
    expect(decodeHostServerMessage(encodeMessage(relayed))).toEqual({
      ok: true,
      value: relayed,
    });
  });

  it("decodes a room-state snapshot", () => {
    const message = {
      v: PROTOCOL_VERSION,
      t: "room-state",
      slots: [
        { slot: "p1", connected: true, ready: false },
        { slot: "p2", connected: true, ready: true },
      ],
    };

    expect(decodeHostServerMessage(JSON.stringify(message))).toEqual({
      ok: true,
      value: message,
    });
  });

  it("rejects unsupported versions and unknown types", () => {
    expect(
      decodeRaw({ v: 99, t: "ready" }),
    ).toMatchObject({
      ok: false,
      error: { code: "UNSUPPORTED_PROTOCOL" },
    });
    expect(
      decodeRaw({ v: PROTOCOL_VERSION, t: "world" }),
    ).toMatchObject({
      ok: false,
      error: { code: "UNKNOWN_TYPE" },
    });
  });

  it("rejects malformed JSON and oversized messages", () => {
    expect(decodeMessage("{")).toMatchObject({
      ok: false,
      error: { code: "BAD_MESSAGE" },
    });
    expect(
      decodeMessage("x".repeat(MAX_CONTROLLER_MESSAGE_BYTES + 1)),
    ).toMatchObject({
      ok: false,
      error: { code: "BAD_MESSAGE" },
    });
  });

  it("validates NetInput shape, ranges, and action fields", () => {
    expect(parseNetInput(netInput()).ok).toBe(true);

    const invalid = [
      {
        ...netInput(),
        intents: { moveX: 2, jump: false, dash: false },
      },
      {
        ...netInput(),
        intents: { moveX: 0, jump: "true", dash: false },
      },
      {
        ...netInput(),
        actions: { ...netInput().actions, interact: 1 },
      },
      {
        ...netInput(),
        actions: {
          ...netInput().actions,
          ui: { ...netInput().actions.ui, choose: 6 },
        },
      },
      {
        ...netInput(),
        clientTick: -1,
      },
    ];

    for (const input of invalid) {
      expect(parseNetInput(input), JSON.stringify(input)).toMatchObject({
        ok: false,
        error: { code: "BAD_MESSAGE" },
      });
    }
  });

  it("rejects a disconnected slot marked ready", () => {
    expect(
      decodeRaw({
        v: PROTOCOL_VERSION,
        t: "room-state",
        slots: [{ slot: "p1", connected: false, ready: true }],
      }),
    ).toMatchObject({
      ok: false,
      error: { code: "BAD_MESSAGE" },
    });
  });

  it("rejects empty, duplicate, and oversized host phone-slot lists", () => {
    expect(
      decodeRaw({
        v: PROTOCOL_VERSION,
        t: "host-hello",
        room: "ABC234",
        buildId: "build",
        protocol: PROTOCOL_VERSION,
        phoneSlots: [],
      }),
    ).toMatchObject({
      ok: false,
      error: { code: "BAD_MESSAGE" },
    });

    expect(
      decodeRaw({
        v: PROTOCOL_VERSION,
        t: "host-hello",
        room: "ABC234",
        buildId: "build",
        protocol: PROTOCOL_VERSION,
        phoneSlots: ["p1", "p1"],
      }),
    ).toMatchObject({
      ok: false,
      error: { code: "BAD_MESSAGE" },
    });

    expect(
      decodeRaw({
        v: PROTOCOL_VERSION,
        t: "host-hello",
        room: "ABC234",
        buildId: "build",
        protocol: PROTOCOL_VERSION,
        phoneSlots: ["p1", "p2", "p1"],
      }),
    ).toMatchObject({
      ok: false,
      error: { code: "BAD_MESSAGE" },
    });
  });

  it("rejects unknown pause reasons and error codes", () => {
    expect(
      decodeRaw({
        v: PROTOCOL_VERSION,
        t: "pause",
        reason: "mystery",
      }),
    ).toMatchObject({
      ok: false,
      error: { code: "BAD_MESSAGE" },
    });

    expect(
      decodeRaw({
        v: PROTOCOL_VERSION,
        t: "error",
        code: "NOT_A_CODE",
        message: "bad",
      }),
    ).toMatchObject({
      ok: false,
      error: { code: "BAD_MESSAGE" },
    });
  });

  it("enforces host and controller message directions", () => {
    expect(
      decodeHostServerMessage(
        JSON.stringify({
          v: PROTOCOL_VERSION,
          t: "hello",
          role: "controller",
          slot: "p1",
          protocol: PROTOCOL_VERSION,
          buildId: "build",
        }),
      ),
    ).toMatchObject({
      ok: false,
      error: { code: "BAD_MESSAGE" },
    });

    expect(
      decodeControllerClientMessage(
        JSON.stringify({
          v: PROTOCOL_VERSION,
          t: "host-hello",
          room: "ABC234",
          buildId: "build",
          protocol: PROTOCOL_VERSION,
          phoneSlots: ["p1"],
        }),
      ),
    ).toMatchObject({
      ok: false,
      error: { code: "BAD_MESSAGE" },
    });
  });
});

describe("controller control-state messages", () => {
  it("round-trips a control descriptor", () => {
    const message: ControllerServerMessage = {
      v: PROTOCOL_VERSION,
      t: "control",
      slot: "p1",
      control: {
        mode: "choice",
        choices: 3,
        selected: 2,
        verbs: ["jump", "interact", "scan", "pulse"],
        activeVerb: "interact",
        dashReady: true,
      },
    };

    expect(
      decodeControllerClientMessage(encodeMessage(message)),
    ).toMatchObject({ ok: false, error: { code: "BAD_MESSAGE" } });
    expect(
      decodeControllerServerMessage(encodeMessage(message)),
    ).toEqual({ ok: true, value: message });
  });

  it("round-trips an action result", () => {
    const message: ControllerServerMessage = {
      v: PROTOCOL_VERSION,
      t: "action",
      slot: "p2",
      feedback: {
        verb: "dash",
        result: "cooldown",
        reason: "cooldown",
        retryAfterMs: 420,
      },
    };

    expect(
      decodeControllerServerMessage(encodeMessage(message)),
    ).toEqual({ ok: true, value: message });
  });

  it("rejects invalid control descriptors", () => {
    const base = {
      v: PROTOCOL_VERSION,
      t: "control",
      slot: "p1",
      control: {
        mode: "explore",
        verbs: ["jump", "interact", "scan"],
        dashReady: false,
      },
    };
    const invalid = [
      { ...base, control: { ...base.control, mode: "unknown" } },
      {
        ...base,
        control: { ...base.control, mode: "choice", choices: 6 },
      },
      {
        ...base,
        control: { ...base.control, verbs: ["jump", "interact"] },
      },
      {
        ...base,
        control: { ...base.control, activeVerb: "dash" },
      },
    ];
    for (const message of invalid) {
      expect(
        decodeControllerServerMessage(JSON.stringify(message)),
      ).toMatchObject({ ok: false, error: { code: "BAD_MESSAGE" } });
    }
  });

  it("rejects invalid action feedback", () => {
    const base = {
      v: PROTOCOL_VERSION,
      t: "action",
      slot: "p1",
      feedback: { verb: "scan", result: "accepted" },
    };
    const invalid = [
      { ...base, feedback: { ...base.feedback, verb: "unknown" } },
      { ...base, feedback: { ...base.feedback, result: "maybe" } },
      { ...base, feedback: { ...base.feedback, reason: "free-text" } },
      {
        ...base,
        feedback: { ...base.feedback, retryAfterMs: -1 },
      },
    ];
    for (const message of invalid) {
      expect(
        decodeControllerServerMessage(JSON.stringify(message)),
      ).toMatchObject({ ok: false, error: { code: "BAD_MESSAGE" } });
    }
  });
});
