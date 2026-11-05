/**
 * Pure player animation state selection.
 *
 * The Phaser adapter owns the actual Sprite/animation objects; this module only
 * decides which clip should be active. Keeping the decision here makes the
 * landing, jump/fall, and dance transitions testable without a browser.
 */

export type PlayerClip = "idle" | "walk" | "jump" | "fall" | "land" | "dance";

export interface PlayerAnimationInput {
  active: boolean;
  onGround: boolean;
  vx: number;
  vy: number;
  dashTime: number;
}

export interface PlayerAnimationMemory {
  clip: PlayerClip;
  previousOnGround: boolean;
  /** True while the current one-shot (jump/land) is still playing. */
  playing: boolean;
}

export const PLAYER_WALK_SPEED_THRESHOLD = 20;

export function choosePlayerClip(
  input: PlayerAnimationInput,
  memory: PlayerAnimationMemory,
): PlayerClip {
  if (!input.active) {
    return "idle";
  }

  if (!input.onGround) {
    if (input.vy < 0) {
      // A completed jump one-shot falls through to the fall loop instead of
      // restarting the takeoff frames.
      if (memory.clip === "jump" && !memory.playing) {
        return "fall";
      }
      return "jump";
    }
    return "fall";
  }

  if (!memory.previousOnGround) {
    return "land";
  }

  if (memory.clip === "land" && memory.playing) {
    return "land";
  }

  if (Math.abs(input.vx) > PLAYER_WALK_SPEED_THRESHOLD) {
    return "walk";
  }

  // Dance is a one-shot emote. Staying on the clip while it plays lets Phaser
  // finish the full cycle; walking or leaving the ground above interrupts it.
  if (memory.clip === "dance" && memory.playing) {
    return "dance";
  }

  return "idle";
}
