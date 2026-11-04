import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  beginStart,
  canStart,
  createAppState,
  markError,
  markHub,
  markLaunching,
  markPlaying,
  phoneStartGate,
  resetInputPlan,
  selectMode,
  selectPack,
  selectedPack,
  setInputPlan,
  type ControllerGateInput,
} from "../src/game/app-state";
import { parsePackCatalog } from "../src/pack";
import type {
  InputPlan,
  InputSourceKind,
} from "../src/world/intent-source";

const raw = JSON.parse(
  readFileSync(new URL("../public/packs/index.json", import.meta.url), "utf8"),
);
const parsed = parsePackCatalog(raw);
if (!parsed.ok) throw new Error(parsed.error);
const catalog = parsed.value;

describe("app shell state", () => {
  it("starts on the first available cycle and selects Silicon once available", () => {
    const state = createAppState(catalog);
    expect(state.selectedPackId).toBe("anatomy-reflex");
    expect(selectedPack(state)?.status).toBe("available");

    const silicon = selectPack(state, "silicon-reflex");
    expect(silicon).not.toBe(state);
    expect(silicon.selectedPackId).toBe("silicon-reflex");
    expect(selectedPack(silicon)?.status).toBe("available");

    expect(selectPack(state, "missing")).toBe(state);
  });

  it("defaults to local co-op and supports solo", () => {
    const state = createAppState(catalog);
    expect(state.mode).toBe("local");
    expect(state.inputPlan).toEqual({ p1: "keyboard", p2: "keyboard" });
    expect(selectMode(state, "solo").mode).toBe("solo");
    expect(selectMode(state, "local").mode).toBe("local");
  });

  it("stores a per-slot input plan without changing the play default", () => {
    let state = createAppState(catalog);
    state = setInputPlan(state, { p1: "keyboard", p2: "controller" });
    expect(state.inputPlan).toEqual({
      p1: "keyboard",
      p2: "controller",
    });
    state = beginStart(state);
    expect(
      setInputPlan(state, { p1: "controller", p2: "controller" }),
    ).toBe(state);
  });

  it("builds start labels from availability and save state", () => {
    const state = createAppState(catalog);
    expect(canStart(state, false)).toMatchObject({
      allowed: true,
      label: "Start cycle",
    });
    expect(canStart(state, true)).toMatchObject({
      allowed: true,
      label: "Continue",
    });
  });

  it("moves through loading, launching, playing, and hub", () => {
    let state = createAppState(catalog);
    state = beginStart(state);
    expect(state.phase).toBe("loading");
    expect(state.busy).toBe(true);
    expect(canStart(state, false).allowed).toBe(false);
    state = markLaunching(state);
    expect(state.phase).toBe("launching");
    state = markPlaying(state);
    expect(state.phase).toBe("playing");
    expect(state.busy).toBe(false);
    state = markHub(state, "Back in the bathroom.");
    expect(state.phase).toBe("hub");
    expect(state.notice).toBe("Back in the bathroom.");
  });

  it("returns to the hub with an error instead of a stuck start", () => {
    const state = markError(beginStart(createAppState(catalog)), "load failed");
    expect(state.phase).toBe("hub");
    expect(state.busy).toBe(false);
    expect(state.error).toBe("load failed");
    expect(canStart(state, false).allowed).toBe(true);
  });

  it("resets the input plan on return to the hub", () => {
    let state = createAppState(catalog);
    state = setInputPlan(state, { p1: "controller", p2: "controller" });
    state = resetInputPlan(markHub(state, "Back in the bathroom."));
    expect(state.inputPlan).toEqual({ p1: "keyboard", p2: "keyboard" });
    expect(phoneStartGate(state.inputPlan, null)).toBeNull();
  });
});

function plan(
  p1: InputSourceKind,
  p2: InputSourceKind,
): InputPlan {
  return { p1, p2 };
}

function controller(
  state: ControllerGateInput["state"],
  missingSlots: ControllerGateInput["missingSlots"] = [],
  error: string | null = null,
): ControllerGateInput {
  return { state, missingSlots, error };
}

describe("phone start gate", () => {
  it("does not gate keyboard/keyboard", () => {
    const state = createAppState(catalog);
    expect(phoneStartGate(plan("keyboard", "keyboard"), null)).toBeNull();
    expect(canStart(state, false)).toMatchObject({ allowed: true });
  });

  it("waits for one phone slot and then allows Start", () => {
    const waiting = phoneStartGate(
      plan("keyboard", "controller"),
      controller("waiting", ["p2"]),
    );
    expect(waiting).toMatchObject({
      allowed: false,
      reason: expect.stringContaining("P2"),
    });
    const state = createAppState(catalog);
    expect(canStart(state, false, waiting).allowed).toBe(false);

    expect(
      phoneStartGate(
        plan("keyboard", "controller"),
        controller("controllers-ready"),
      ),
    ).toEqual({ allowed: true, reason: null });
  });

  it("waits until both phone slots are ready", () => {
    expect(
      phoneStartGate(
        plan("controller", "controller"),
        controller("waiting", ["p2"]),
      ),
    ).toMatchObject({
      allowed: false,
      reason: expect.stringContaining("P2"),
    });
    expect(
      phoneStartGate(
        plan("controller", "controller"),
        controller("controllers-ready"),
      ),
    ).toEqual({ allowed: true, reason: null });
  });

  it("allows Start after an explicit keyboard downgrade", () => {
    expect(
      phoneStartGate(
        plan("keyboard", "controller"),
        controller("controllers-ready"),
      ),
    ).toEqual({ allowed: true, reason: null });
  });

  it("blocks a disconnected slot and an ended or errored room", () => {
    expect(
      phoneStartGate(
        plan("controller", "controller"),
        controller("waiting", ["p1"]),
      ),
    ).toMatchObject({
      allowed: false,
      reason: expect.stringContaining("P1"),
    });
    expect(
      phoneStartGate(
        plan("keyboard", "controller"),
        controller("ended"),
      ),
    ).toMatchObject({ allowed: false });
    expect(
      phoneStartGate(
        plan("keyboard", "controller"),
        controller("waiting", ["p2"], "NET_URL_MISSING"),
      ),
    ).toMatchObject({
      allowed: false,
      reason: expect.stringContaining("NET_URL_MISSING"),
    });
  });

  it("waits while the room is preparing", () => {
    expect(
      phoneStartGate(plan("keyboard", "controller"), null),
    ).toMatchObject({ allowed: false });
    expect(
      phoneStartGate(
        plan("keyboard", "controller"),
        controller("connecting"),
      ),
    ).toMatchObject({ allowed: false });
  });
});
