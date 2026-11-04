/** Client-side double-tap dash recognizer. Pure; no DOM or timers. */

export type DashDirection = "left" | "right";

export const TAP_MAX_MS = 220;
export const TAP_MAX_MOVE_PX = 12;
export const DOUBLE_TAP_MAX_MS = 300;

interface CompletedTap {
  direction: DashDirection;
  endedAt: number;
}

/**
 * Recognizes two quick taps on the same movement direction button.
 *
 * The UI feeds a pointer-down and, when it is not a recognized dash, the
 * matching pointer-up. Recognition happens on the second pointer-down so the
 * dash edge is sent immediately; the second tap does not need to finish.
 */
export class DashGestureDetector {
  private lastTap: CompletedTap | null = null;
  private suppressPointerId: number | null = null;

  /** Returns true exactly once for a recognized double-tap. */
  down(
    direction: DashDirection,
    pointerId: number,
    at: number,
  ): boolean {
    if (!Number.isFinite(pointerId) || !Number.isFinite(at)) return false;
    if (this.suppressPointerId === pointerId) return false;

    const last = this.lastTap;
    if (
      last &&
      last.direction === direction &&
      at >= last.endedAt &&
      at - last.endedAt <= DOUBLE_TAP_MAX_MS
    ) {
      this.lastTap = null;
      this.suppressPointerId = pointerId;
      return true;
    }
    return false;
  }

  /**
   * Records a completed tap as a candidate. Long presses and moved pointers
   * clear the candidate instead of counting as a tap.
   */
  up(
    direction: DashDirection,
    pointerId: number,
    durationMs: number,
    movedPx: number,
    endedAt: number,
  ): boolean {
    if (this.suppressPointerId === pointerId) {
      this.suppressPointerId = null;
      return false;
    }
    if (
      !Number.isFinite(durationMs) ||
      !Number.isFinite(movedPx) ||
      !Number.isFinite(endedAt) ||
      durationMs < 0 ||
      durationMs > TAP_MAX_MS ||
      movedPx > TAP_MAX_MOVE_PX
    ) {
      this.lastTap = null;
      return false;
    }
    this.lastTap = { direction, endedAt };
    return true;
  }

  get pending(): boolean {
    return this.lastTap !== null;
  }

  reset(): void {
    this.lastTap = null;
    this.suppressPointerId = null;
  }
}
