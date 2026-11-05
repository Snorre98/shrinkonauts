import { describe, expect, it } from "vitest";
import { TouchInputModel } from "../../src/controller/touch-layout";

describe("TouchInputModel", () => {
  it("starts with a neutral input frame", () => {
    const touch = new TouchInputModel();

    expect(touch.snapshot()).toEqual({
      intents: { moveX: 0, jump: false, dash: false },
      actions: {
        interact: false,
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
    });
    expect(touch.held).toBe(false);
  });

  it("derives movement from the pressed direction", () => {
    const touch = new TouchInputModel();

    touch.press("move-left", 1);
    expect(touch.snapshot().intents.moveX).toBe(-1);

    touch.press("move-right", 2);
    expect(touch.snapshot().intents.moveX).toBe(0);

    touch.release("move-left", 1);
    expect(touch.snapshot().intents.moveX).toBe(1);

    touch.release("move-right", 2);
    expect(touch.snapshot().intents.moveX).toBe(0);
  });

  it("keeps a button pressed until every pointer lifts", () => {
    const touch = new TouchInputModel();

    expect(touch.press("jump", 1)).toBe(true);
    expect(touch.press("jump", 2)).toBe(true);
    expect(touch.isPressed("jump")).toBe(true);

    expect(touch.release("jump", 1)).toBe(true);
    expect(touch.isPressed("jump")).toBe(true);
    expect(touch.snapshot().intents.jump).toBe(true);

    expect(touch.release("jump", 2)).toBe(true);
    expect(touch.isPressed("jump")).toBe(false);
    expect(touch.snapshot().intents.jump).toBe(false);
  });

  it("moves one pointer to a new control without leaking the old one", () => {
    const touch = new TouchInputModel();

    touch.press("move-left", 7);
    touch.press("jump", 7);

    expect(touch.isPressed("move-left")).toBe(false);
    expect(touch.snapshot().intents.moveX).toBe(0);
    expect(touch.snapshot().intents.jump).toBe(true);
  });

  it("emits every held action and mirrors interact as confirm", () => {
    const touch = new TouchInputModel();
    touch.press("scan", 1);
    touch.press("pulse", 2);
    touch.press("carry", 3);
    touch.press("throw", 4);
    touch.press("dash", 5);
    touch.press("interact", 6);
    touch.press("dance", 7);

    const frame = touch.snapshot();
    expect(frame.intents.dash).toBe(true);
    expect(frame.actions).toMatchObject({
      interact: true,
      scan: true,
      pulse: true,
      carry: true,
      throw: true,
      dance: true,
      ui: { confirm: true },
    });
  });

  it("supports dialogue navigation, confirm, cancel, and choices", () => {
    const touch = new TouchInputModel();
    touch.press("ui-up", 1);
    touch.press("ui-down", 2);
    touch.press("ui-cancel", 3);
    touch.press("choice-2", 4);
    touch.press("ui-confirm", 5);

    expect(touch.snapshot().actions.ui).toEqual({
      confirm: true,
      cancel: true,
      navigateUp: true,
      navigateDown: true,
      choose: 2,
    });

    touch.release("choice-2", 4);
    touch.press("choice-5", 4);
    expect(touch.snapshot().actions.ui.choose).toBe(5);
  });

  it("releases a pointer by id and clears all state", () => {
    const touch = new TouchInputModel();
    touch.press("move-right", 1);
    touch.press("interact", 2);

    expect(touch.releasePointer(2)).toBe("interact");
    expect(touch.snapshot().actions.interact).toBe(false);
    expect(touch.releasePointer(99)).toBeNull();

    touch.clear();
    expect(touch.held).toBe(false);
    expect(touch.snapshot().intents.moveX).toBe(0);
  });

  it("rejects invalid pointer ids", () => {
    const touch = new TouchInputModel();
    expect(() => touch.press("jump", Number.NaN)).toThrow("TOUCH_POINTER");
  });
});
