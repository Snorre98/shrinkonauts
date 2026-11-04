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
  selectMode,
  selectPack,
  selectedPack,
  setInputPlan,
} from "../src/game/app-state";
import { parsePackCatalog } from "../src/pack";

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
});
