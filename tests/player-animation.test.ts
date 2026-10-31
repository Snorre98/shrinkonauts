import { describe, expect, it } from "vitest";
import {
  choosePlayerClip,
  type PlayerAnimationInput,
  type PlayerAnimationMemory,
} from "../src/world/player-animation";

function input(
  overrides: Partial<PlayerAnimationInput> = {},
): PlayerAnimationInput {
  return {
    active: true,
    onGround: true,
    vx: 0,
    vy: 0,
    dashTime: 0,
    ...overrides,
  };
}

function memory(
  overrides: Partial<PlayerAnimationMemory> = {},
): PlayerAnimationMemory {
  return {
    clip: "idle",
    previousOnGround: true,
    playing: false,
    ...overrides,
  };
}

describe("choosePlayerClip", () => {
  it("uses idle when grounded and still", () => {
    expect(choosePlayerClip(input(), memory())).toBe("idle");
  });

  it("uses walk above the speed threshold", () => {
    expect(choosePlayerClip(input({ vx: 120 }), memory())).toBe("walk");
    expect(choosePlayerClip(input({ vx: -120 }), memory())).toBe("walk");
    expect(choosePlayerClip(input({ vx: 10 }), memory())).toBe("idle");
  });

  it("uses jump while rising and fall while descending", () => {
    expect(
      choosePlayerClip(
        input({ onGround: false, vy: -200 }),
        memory({ clip: "idle", previousOnGround: true }),
      ),
    ).toBe("jump");
    expect(
      choosePlayerClip(
        input({ onGround: false, vy: 200 }),
        memory({ clip: "jump", previousOnGround: false, playing: true }),
      ),
    ).toBe("fall");
  });

  it("does not restart a completed jump one-shot", () => {
    expect(
      choosePlayerClip(
        input({ onGround: false, vy: -10 }),
        memory({ clip: "jump", previousOnGround: false, playing: false }),
      ),
    ).toBe("fall");
  });

  it("plays land on the touchdown frame and holds it while playing", () => {
    expect(
      choosePlayerClip(
        input({ onGround: true }),
        memory({ clip: "fall", previousOnGround: false, playing: false }),
      ),
    ).toBe("land");
    expect(
      choosePlayerClip(
        input({ onGround: true, vx: 200 }),
        memory({ clip: "land", previousOnGround: true, playing: true }),
      ),
    ).toBe("land");
  });

  it("returns to locomotion after the land one-shot finishes", () => {
    expect(
      choosePlayerClip(
        input({ onGround: true, vx: 200 }),
        memory({ clip: "land", previousOnGround: true, playing: false }),
      ),
    ).toBe("walk");
  });

  it("uses idle for an inactive player", () => {
    expect(
      choosePlayerClip(
        input({ active: false, onGround: false, vy: -100 }),
        memory({ clip: "jump", previousOnGround: false, playing: true }),
      ),
    ).toBe("idle");
  });
});
