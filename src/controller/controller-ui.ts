import type { PlayerSlot } from "../net/protocol";
import type { ControllerSessionView } from "./controller-session";
import type { TouchControl } from "./touch-layout";

export interface ControllerJoinView {
  room?: string;
  slot?: PlayerSlot;
  message?: string | null;
}

export interface ControllerUiCallbacks {
  onJoin: (room: string, slot: PlayerSlot) => void;
  onControl: (
    control: TouchControl,
    pressed: boolean,
    pointerId: number,
  ) => void;
  onReload: () => void;
}

export interface ControllerUi {
  showJoin(view?: ControllerJoinView): void;
  showBoard(room: string, slot: PlayerSlot): void;
  showFatal(message: string): void;
  update(view: ControllerSessionView): void;
  setTouchEnabled(enabled: boolean): void;
  destroy(): void;
}

function element<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className?: string,
  text?: string,
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function controlButton(
  control: TouchControl,
  visible: string,
  label: string,
  modifier?: string,
): HTMLButtonElement {
  const button = element(
    "button",
    `controller__key${modifier ? ` ${modifier}` : ""}`,
    visible,
  );
  button.type = "button";
  button.dataset.control = control;
  button.setAttribute("aria-label", label);
  button.setAttribute("aria-pressed", "false");
  return button;
}

function pauseText(view: ControllerSessionView): string {
  if (view.state === "reconnecting") {
    return `Reconnecting… attempt ${view.reconnectAttempt}`;
  }
  switch (view.pausedReason) {
    case "host-paused":
      return "The host paused the game.";
    case "host-hidden":
      return "The host tab is hidden.";
    case "controller-left":
      return "The other controller disconnected.";
    case "reconnecting":
      return "Reconnecting…";
    default:
      return "Paused.";
  }
}

function statusText(view: ControllerSessionView): string {
  switch (view.state) {
    case "idle":
      return "Ready to join";
    case "connecting":
      return "Connecting…";
    case "connected":
      return "Connected";
    case "ready":
      return "Connected";
    case "paused":
      return "Paused";
    case "reconnecting":
      return `Reconnecting ${view.reconnectAttempt}`;
    case "ended":
      return "Session ended";
    case "error":
      return "Connection error";
  }
}

function overlayText(view: ControllerSessionView): string {
  switch (view.state) {
    case "idle":
      return "Ready to join.";
    case "connecting":
      return "Connecting to the room…";
    case "connected":
      return "Connected. Preparing controls…";
    case "ready":
      return "";
    case "paused":
      return pauseText(view);
    case "reconnecting":
      return `Reconnecting… attempt ${view.reconnectAttempt}`;
    case "ended":
      return "The session ended.";
    case "error":
      return "The controller connection failed.";
  }
}

/**
 * DOM-only controller surface. It renders connection state and controls and
 * never receives game, puzzle, dialogue, or save state.
 */
export class ControllerUiImpl implements ControllerUi {
  private container: HTMLElement | null = null;
  private board: HTMLElement | null = null;
  private slotBadge: HTMLElement | null = null;
  private roomCode: HTMLElement | null = null;
  private status: HTMLElement | null = null;
  private rtt: HTMLElement | null = null;
  private overlay: HTMLElement | null = null;
  private overlayCopy: HTMLElement | null = null;
  private readonly pointers = new Map<number, TouchControl>();
  private enabled = false;

  private readonly onPointerDown = (event: PointerEvent): void => {
    if (!this.enabled || !this.board) return;
    const target = (event.target as Element | null)?.closest<HTMLElement>(
      "[data-control]",
    );
    if (!target || !this.board.contains(target)) return;
    const control = target.dataset.control as TouchControl | undefined;
    if (!control) return;

    event.preventDefault();
    const pointerId = event.pointerId;
    const previous = this.pointers.get(pointerId);
    if (previous && previous !== control) {
      this.pointers.delete(pointerId);
      this.callbacks.onControl(previous, false, pointerId);
      this.refreshPressed(previous);
    }
    this.pointers.set(pointerId, control);
    try {
      target.setPointerCapture(pointerId);
    } catch {
      // Synthetic pointers and older browsers may not support capture.
    }
    this.callbacks.onControl(control, true, pointerId);
    this.refreshPressed(control);
  };

  private readonly onPointerEnd = (event: PointerEvent): void => {
    this.releasePointer(event.pointerId);
  };

  private readonly onBlur = (): void => {
    this.releaseAll(true);
  };

  private readonly onVisibilityChange = (): void => {
    if (document.visibilityState === "hidden") {
      this.releaseAll(true);
    }
  };

  private readonly onContextMenu = (event: Event): void => {
    event.preventDefault();
  };

  constructor(
    private readonly root: HTMLElement,
    private readonly callbacks: ControllerUiCallbacks,
  ) {
    root.addEventListener("pointerdown", this.onPointerDown);
    window.addEventListener("pointerup", this.onPointerEnd);
    window.addEventListener("pointercancel", this.onPointerEnd);
    window.addEventListener("blur", this.onBlur);
    document.addEventListener(
      "visibilitychange",
      this.onVisibilityChange,
    );
    root.addEventListener("contextmenu", this.onContextMenu);
  }

  showJoin(view: ControllerJoinView = {}): void {
    this.releaseAll(true);
    this.enabled = false;
    this.board = null;
    this.slotBadge = null;
    this.roomCode = null;
    this.status = null;
    this.rtt = null;
    this.overlay = null;
    this.overlayCopy = null;

    const container = element("div", "controller controller--join");
    container.dataset.state = "idle";

    const heading = element("h1", "controller__title", "Shrinkonauts");
    const subtitle = element(
      "p",
      "controller__subtitle",
      "Phone controller",
    );
    const form = element("form", "controller__join-form");
    const codeLabel = element("label", "controller__field");
    codeLabel.append(element("span", "controller__label", "Room code"));
    const codeInput = element("input", "controller__code");
    codeInput.type = "text";
    codeInput.name = "room";
    codeInput.maxLength = 6;
    codeInput.autocomplete = "off";
    codeInput.spellcheck = false;
    codeInput.inputMode = "text";
    codeInput.autocapitalize = "characters";
    codeInput.placeholder = "ABC234";
    codeInput.value = view.room ?? "";
    codeInput.setAttribute("aria-label", "Six-character room code");
    codeInput.addEventListener("input", () => {
      codeInput.value = codeInput.value.toUpperCase();
    });
    codeLabel.append(codeInput);

    const fieldset = element("fieldset", "controller__slots");
    fieldset.append(
      element("legend", "controller__label", "Player slot"),
    );
    const slotChoices = element("div", "controller__slot-choices");
    for (const slot of ["p1", "p2"] as const) {
      const label = element("label", "controller__slot-choice");
      const radio = element("input");
      radio.type = "radio";
      radio.name = "slot";
      radio.value = slot;
      radio.checked = (view.slot ?? "p1") === slot;
      label.append(radio, element("span", undefined, slot.toUpperCase()));
      slotChoices.append(label);
    }
    fieldset.append(slotChoices);

    const submit = element("button", "controller__join", "Join");
    submit.type = "submit";

    const message = element(
      "p",
      "controller__message",
      view.message ?? "",
    );
    message.dataset.role = "join-message";
    message.setAttribute("aria-live", "polite");
    message.hidden = !view.message;

    form.append(codeLabel, fieldset, submit);
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      const selected =
        slotChoices.querySelector<HTMLInputElement>(
          'input[name="slot"]:checked',
        )?.value ?? "p1";
      this.callbacks.onJoin(
        codeInput.value,
        selected === "p2" ? "p2" : "p1",
      );
    });

    const hint = element(
      "p",
      "controller__hint",
      "Open the link from the shared screen, or type the six-character room code. Keep this page open; locking the phone pauses the game.",
    );

    container.append(heading, subtitle, form, message, hint);
    this.container = container;
    this.root.replaceChildren(container);
  }

  showBoard(room: string, slot: PlayerSlot): void {
    this.releaseAll(true);
    this.enabled = false;

    const container = element("div", "controller controller--board");
    container.dataset.state = "connecting";
    container.dataset.slot = slot;
    container.dataset.room = room;

    const bar = element("header", "controller__bar");
    const badge = element(
      "span",
      "controller__badge",
      slot.toUpperCase(),
    );
    badge.dataset.role = "slot";
    const roomNode = element("span", "controller__room", room);
    roomNode.dataset.role = "room";
    const status = element(
      "span",
      "controller__status",
      "Connecting…",
    );
    status.dataset.role = "status";
    status.setAttribute("role", "status");
    status.setAttribute("aria-live", "polite");
    const rtt = element("span", "controller__rtt", "");
    rtt.dataset.role = "rtt";
    rtt.hidden = true;
    bar.append(badge, roomNode, status, rtt);

    const board = element("main", "controller__board");
    board.dataset.role = "board";
    board.dataset.enabled = "false";

    const left = element("section", "controller__cluster controller__cluster--left");
    const moveRow = element("div", "controller__row");
    moveRow.append(
      controlButton("move-left", "◀", "Move left", "controller__key--move"),
      controlButton(
        "move-right",
        "▶",
        "Move right",
        "controller__key--move",
      ),
    );
    left.append(
      moveRow,
      controlButton("jump", "Jump", "Jump", "controller__key--jump"),
    );

    const right = element(
      "section",
      "controller__cluster controller__cluster--right",
    );
    const actions = element("div", "controller__actions");
    actions.append(
      controlButton("interact", "Interact", "Interact", "controller__key--accent"),
      controlButton("scan", "Scan", "Scan"),
      controlButton("pulse", "Pulse", "Pulse"),
      controlButton("carry", "Carry", "Carry"),
      controlButton("throw", "Throw", "Throw"),
      controlButton("dash", "Dash", "Dash"),
    );

    const dialogue = element("section", "controller__dialogue");
    dialogue.dataset.role = "dialogue";
    dialogue.hidden = true;
    const dialogueHead = element("div", "controller__dialogue-head");
    dialogueHead.append(
      element("span", "controller__dialogue-title", "Dialogue"),
    );
    const dialogueClose = element(
      "button",
      "controller__dialogue-close",
      "Close",
    );
    dialogueClose.type = "button";
    dialogueClose.setAttribute("aria-label", "Close dialogue controls");
    dialogueClose.addEventListener("click", () => setDialogueOpen(false));
    dialogueHead.append(dialogueClose);
    const dialogueRow = element("div", "controller__dialogue-row");
    dialogueRow.append(
      controlButton("ui-up", "Up", "Dialogue up"),
      controlButton("ui-down", "Down", "Dialogue down"),
      controlButton(
        "ui-confirm",
        "Confirm",
        "Confirm dialogue",
        "controller__key--accent",
      ),
      controlButton("ui-cancel", "Cancel", "Cancel dialogue"),
    );
    const choiceRow = element("div", "controller__choices");
    for (const choice of [1, 2, 3, 4, 5] as const) {
      choiceRow.append(
        controlButton(
          `choice-${choice}` as TouchControl,
          String(choice),
          `Choose ${choice}`,
          "controller__key--choice",
        ),
      );
    }
    dialogue.append(dialogueHead, dialogueRow, choiceRow);

    const toggle = element(
      "button",
      "controller__dialogue-toggle",
      "Dialogue",
    );
    toggle.type = "button";
    toggle.setAttribute("aria-expanded", "false");
    toggle.addEventListener("click", () => {
      setDialogueOpen(Boolean(dialogue.hidden));
    });

    function setDialogueOpen(open: boolean): void {
      dialogue.hidden = !open;
      toggle.setAttribute("aria-expanded", String(open));
    }

    right.append(actions, toggle);

    const hint = element(
      "p",
      "controller__board-hint",
      "Landscape • keep this screen awake",
    );

    const overlay = element("div", "controller__overlay");
    overlay.dataset.role = "overlay";
    overlay.dataset.visible = "true";
    overlay.setAttribute("aria-live", "polite");
    const overlayCopy = element(
      "p",
      "controller__overlay-copy",
      "Connecting to the room…",
    );
    overlayCopy.dataset.role = "overlay-text";
    overlay.append(overlayCopy);

    board.append(left, right, dialogue, hint, overlay);

    const rotate = element(
      "div",
      "controller__rotate",
      "Rotate your phone to landscape",
    );

    container.append(bar, board, rotate);
    this.container = container;
    this.board = board;
    this.slotBadge = badge;
    this.roomCode = roomNode;
    this.status = status;
    this.rtt = rtt;
    this.overlay = overlay;
    this.overlayCopy = overlayCopy;
    this.root.replaceChildren(container);
    this.setTouchEnabled(false);
  }

  showFatal(message: string): void {
    this.releaseAll(true);
    this.enabled = false;
    this.board = null;
    const container = element("div", "controller controller--fatal");
    const heading = element("h1", "controller__title", "Controller unavailable");
    const copy = element("p", "controller__subtitle", message);
    copy.dataset.role = "fatal-message";
    const reload = element("button", "controller__join", "Reload");
    reload.type = "button";
    reload.addEventListener("click", () => this.callbacks.onReload());
    const hint = element(
      "p",
      "controller__hint",
      "Reload to join the room again. If the problem repeats, ask the host to reopen the controller room.",
    );
    container.append(heading, copy, reload, hint);
    this.container = container;
    this.root.replaceChildren(container);
  }

  update(view: ControllerSessionView): void {
    if (!this.container || !this.board) return;
    this.container.dataset.state = view.state;
    this.container.dataset.slot = view.slot;
    this.container.dataset.room = view.room;

    if (this.slotBadge) this.slotBadge.textContent = view.slot.toUpperCase();
    if (this.roomCode) this.roomCode.textContent = view.room;
    if (this.status) this.status.textContent = statusText(view);
    if (this.rtt) {
      if (view.rttMs === null) {
        this.rtt.textContent = "";
        this.rtt.hidden = true;
      } else {
        this.rtt.textContent = `RTT ${view.rttMs} ms`;
        this.rtt.hidden = false;
      }
    }

    const shouldShowOverlay = view.state !== "ready";
    if (this.overlay) {
      this.overlay.dataset.visible = String(shouldShowOverlay);
    }
    if (this.overlayCopy) {
      this.overlayCopy.textContent = overlayText(view);
    }

    this.setTouchEnabled(view.state === "ready");
  }

  setTouchEnabled(enabled: boolean): void {
    this.enabled = enabled;
    if (this.board) this.board.dataset.enabled = String(enabled);
    for (const button of this.board?.querySelectorAll<HTMLButtonElement>(
      "[data-control]",
    ) ?? []) {
      button.disabled = !enabled;
    }
    if (!enabled) this.releaseAll(true);
  }

  destroy(): void {
    this.root.removeEventListener("pointerdown", this.onPointerDown);
    window.removeEventListener("pointerup", this.onPointerEnd);
    window.removeEventListener("pointercancel", this.onPointerEnd);
    window.removeEventListener("blur", this.onBlur);
    document.removeEventListener(
      "visibilitychange",
      this.onVisibilityChange,
    );
    this.root.removeEventListener("contextmenu", this.onContextMenu);
    this.releaseAll(true);
    this.root.replaceChildren();
    this.container = null;
    this.board = null;
  }

  private releasePointer(pointerId: number): void {
    const control = this.pointers.get(pointerId);
    if (control === undefined) return;
    this.pointers.delete(pointerId);
    this.callbacks.onControl(control, false, pointerId);
    this.refreshPressed(control);
  }

  private releaseAll(sendReleases: boolean): void {
    for (const [pointerId, control] of this.pointers) {
      if (sendReleases) {
        this.callbacks.onControl(control, false, pointerId);
      }
      this.refreshPressed(control);
    }
    this.pointers.clear();
    for (const button of this.board?.querySelectorAll<HTMLElement>(
      "[data-control]",
    ) ?? []) {
      button.setAttribute("aria-pressed", "false");
    }
  }

  private refreshPressed(control: TouchControl): void {
    const pressed = [...this.pointers.values()].includes(control);
    for (const button of this.board?.querySelectorAll<HTMLElement>(
      `[data-control="${control}"]`,
    ) ?? []) {
      button.setAttribute("aria-pressed", String(pressed));
    }
  }
}

export function mountControllerUi(
  root: HTMLElement,
  callbacks: ControllerUiCallbacks,
): ControllerUi {
  return new ControllerUiImpl(root, callbacks);
}
