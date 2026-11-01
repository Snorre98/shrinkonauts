import type { NetInput, NetUiActions } from "../net/protocol";

/** Every touch target the controller page can emit. */
export type TouchControl =
  | "move-left"
  | "move-right"
  | "jump"
  | "dash"
  | "interact"
  | "scan"
  | "pulse"
  | "carry"
  | "throw"
  | "ui-confirm"
  | "ui-cancel"
  | "ui-up"
  | "ui-down"
  | "choice-1"
  | "choice-2"
  | "choice-3"
  | "choice-4"
  | "choice-5";

const CHOICES: readonly (TouchControl | null)[] = [
  null,
  "choice-1",
  "choice-2",
  "choice-3",
  "choice-4",
  "choice-5",
];

function emptyUi(): NetUiActions {
  return {
    confirm: false,
    cancel: false,
    navigateUp: false,
    navigateDown: false,
    choose: null,
  };
}

/**
 * Pure multi-touch state for one controller.
 *
 * A pointer id belongs to one control at a time. Keeping the pointer map in
 * the model means a second finger pressing the same button cannot release it
 * until both fingers are lifted.
 */
export class TouchInputModel {
  private readonly pointers = new Map<number, TouchControl>();

  press(control: TouchControl, pointerId: number): boolean {
    if (!Number.isFinite(pointerId)) {
      throw new Error("TOUCH_POINTER: pointerId must be a number");
    }
    const previous = this.pointers.get(pointerId);
    if (previous === control) return false;
    if (previous !== undefined) {
      this.pointers.delete(pointerId);
    }
    this.pointers.set(pointerId, control);
    return true;
  }

  release(control: TouchControl, pointerId: number): boolean {
    if (this.pointers.get(pointerId) !== control) return false;
    this.pointers.delete(pointerId);
    return true;
  }

  releasePointer(pointerId: number): TouchControl | null {
    const control = this.pointers.get(pointerId);
    if (control === undefined) return null;
    this.pointers.delete(pointerId);
    return control;
  }

  isPressed(control: TouchControl): boolean {
    for (const pressed of this.pointers.values()) {
      if (pressed === control) return true;
    }
    return false;
  }

  get held(): boolean {
    return this.pointers.size > 0;
  }

  get moveX(): -1 | 0 | 1 {
    const left = this.isPressed("move-left");
    const right = this.isPressed("move-right");
    if (left === right) return 0;
    return left ? -1 : 1;
  }

  get choose(): number | null {
    for (let choice = 1; choice < CHOICES.length; choice += 1) {
      const control = CHOICES[choice];
      if (control && this.isPressed(control)) return choice;
    }
    return null;
  }

  snapshot(): NetInput {
    return {
      intents: {
        moveX: this.moveX,
        jump: this.isPressed("jump"),
        dash: this.isPressed("dash"),
      },
      actions: {
        interact: this.isPressed("interact"),
        scan: this.isPressed("scan"),
        pulse: this.isPressed("pulse"),
        carry: this.isPressed("carry"),
        throw: this.isPressed("throw"),
        ui: {
          ...emptyUi(),
          // Keyboard parity: interact confirms dialogue choices as well.
          confirm:
            this.isPressed("ui-confirm") || this.isPressed("interact"),
          cancel: this.isPressed("ui-cancel"),
          navigateUp: this.isPressed("ui-up"),
          navigateDown: this.isPressed("ui-down"),
          choose: this.choose,
        },
      },
      clientTick: 0,
    };
  }

  clear(): void {
    this.pointers.clear();
  }
}
