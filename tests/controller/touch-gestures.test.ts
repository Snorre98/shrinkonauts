import { describe, expect, it } from "vitest";
import {
  DashGestureDetector,
  DOUBLE_TAP_MAX_MS,
  TAP_MAX_MS,
} from "../../src/controller/touch-gestures";
import { TouchInputModel } from "../../src/controller/touch-layout";

describe("DashGestureDetector", () => {
  it("recognizes two quick taps on the same direction", () => {
    const detector = new DashGestureDetector();
    expect(detector.up("left", 1, 80, 2, 100)).toBe(true);
    expect(detector.down("left", 2, 220)).toBe(true);
    expect(detector.up("left", 2, 60, 1, 280)).toBe(false);
    expect(detector.down("left", 3, 500)).toBe(false);
  });

  it("does not pair taps on different directions", () => {
    const detector = new DashGestureDetector();
    detector.up("left", 1, 80, 2, 100);
    expect(detector.down("right", 2, 200)).toBe(false);
    detector.up("right", 2, 60, 1, 260);
    expect(detector.down("right", 3, 400)).toBe(true);
  });

  it("ignores long presses and moved pointers", () => {
    const detector = new DashGestureDetector();
    expect(detector.up("left", 1, TAP_MAX_MS + 1, 2, 300)).toBe(false);
    expect(detector.down("left", 2, 320)).toBe(false);

    expect(detector.up("left", 3, 80, 13, 500)).toBe(false);
    expect(detector.down("left", 4, 520)).toBe(false);
  });

  it("requires the second tap inside the double-tap window", () => {
    const detector = new DashGestureDetector();
    detector.up("right", 1, 80, 2, 100);
    expect(detector.down("right", 2, 100 + DOUBLE_TAP_MAX_MS + 1)).toBe(
      false,
    );
  });

  it("resets pending candidates", () => {
    const detector = new DashGestureDetector();
    detector.up("left", 1, 80, 2, 100);
    expect(detector.pending).toBe(true);
    detector.reset();
    expect(detector.pending).toBe(false);
    expect(detector.down("left", 2, 150)).toBe(false);
  });
});

describe("TouchInputModel dash pulse", () => {
  it("emits the tapped direction with a one-shot dash", () => {
    const touch = new TouchInputModel();
    touch.press("move-left", 1);
    touch.triggerDash("left");

    const first = touch.snapshot();
    expect(first.intents).toEqual({ moveX: -1, jump: false, dash: true });

    const second = touch.snapshot();
    expect(second.intents.dash).toBe(false);
    expect(second.intents.moveX).toBe(-1);
  });

  it("clears the dash pulse on reset", () => {
    const touch = new TouchInputModel();
    touch.triggerDash("right");
    touch.clear();
    expect(touch.snapshot().intents.dash).toBe(false);
  });
});
