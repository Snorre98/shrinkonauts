import type {
  ActionFeedback,
  ControlDescriptor,
  ControlVerb,
  PlayerSlot,
} from "../net/protocol";
import type { ControllerSessionView } from "./controller-session";
import { DashGestureDetector, type DashDirection } from "./touch-gestures";
import type { TouchControl } from "./touch-layout";

export const HAPTICS_STORAGE_KEY = "shrinkonauts.controller.haptics";

function hapticsEnabled(): boolean {
  try {
    return window.localStorage.getItem(HAPTICS_STORAGE_KEY) !== "off";
  } catch {
    return true;
  }
}

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
  onDash: (direction: DashDirection) => void;
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

interface TapRecord {
  direction: DashDirection;
  startedAt: number;
  startX: number;
  startY: number;
  control: TouchControl;
}

const DEFAULT_CONTROL: ControlDescriptor = {
  mode: "explore",
  verbs: ["jump", "interact", "scan"],
  dashReady: false,
};

const CONTROL_ACTIONS: readonly ControlVerb[] = [
  "scan",
  "pulse",
  "carry",
  "throw",
  "interact",
];

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

function isDialogueControl(control: TouchControl): boolean {
  return (
    control === "ui-confirm" ||
    control === "ui-cancel" ||
    control.startsWith("choice-")
  );
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

function controlsSheet(): HTMLElement {
  const sheet = element("section", "controller__sheet");
  sheet.dataset.role = "controls-sheet";
  sheet.hidden = true;
  sheet.setAttribute("role", "dialog");
  sheet.setAttribute("aria-modal", "true");
  sheet.setAttribute("aria-label", "Controller controls");

  const head = element("div", "controller__sheet-head");
  head.append(element("h2", "controller__sheet-title", "Controls"));
  const close = element("button", "controller__sheet-close", "Close");
  close.type = "button";
  close.dataset.role = "controls-close";
  head.append(close);

  const list = element("dl", "controller__sheet-list");
  const rows: ReadonlyArray<[string, string]> = [
    ["Move", "Hold ◀ / ▶"],
    ["Jump", "Tap Jump"],
    ["Dash", "Double-tap ◀ or ▶"],
    ["Interact", "Tap Interact"],
    ["Scan", "Tap Scan"],
    ["Pulse", "Tap Pulse (P1)"],
    ["Carry", "Tap Carry (P2)"],
    ["Throw", "Tap Throw while carrying"],
    ["Dance", "Tap Dance"],
    ["Dialogue", "Continue / Back / 1–N"],
  ];
  for (const [label, keys] of rows) {
    list.append(
      element("dt", "controller__sheet-label", label),
      element("dd", "controller__sheet-keys", keys),
    );
  }
  const toggle = element("label", "controller__sheet-toggle");
  const input = element("input");
  input.type = "checkbox";
  input.dataset.role = "haptics-toggle";
  input.checked = hapticsEnabled();
  toggle.append(
    input,
    element("span", "controller__sheet-toggle-label", "Haptics"),
  );
  sheet.append(head, list, toggle);
  return sheet;
}

/**
 * DOM-only controller surface. It renders connection state and controls and
 * never receives game, puzzle, dialogue text, or save state.
 */
export class ControllerUiImpl implements ControllerUi {
  private container: HTMLElement | null = null;
  private board: HTMLElement | null = null;
  private actions: HTMLElement | null = null;
  private dialogue: HTMLElement | null = null;
  private talkPanel: HTMLElement | null = null;
  private choicePanel: HTMLElement | null = null;
  private choiceButtons: HTMLButtonElement[] = [];
  private jumpButton: HTMLButtonElement | null = null;
  private dashIndicator: HTMLElement | null = null;
  private coach: HTMLElement | null = null;
  private sheet: HTMLElement | null = null;
  private slotBadge: HTMLElement | null = null;
  private roomCode: HTMLElement | null = null;
  private status: HTMLElement | null = null;
  private rtt: HTMLElement | null = null;
  private overlay: HTMLElement | null = null;
  private overlayCopy: HTMLElement | null = null;
  private controlsButton: HTMLButtonElement | null = null;

  private readonly verbButtons = new Map<ControlVerb, HTMLButtonElement>();
  private readonly pointers = new Map<number, TouchControl>();
  private readonly taps = new Map<number, TapRecord>();
  private readonly gestures = new DashGestureDetector();
  private connectionEnabled = false;
  private choiceMode = false;
  private dashUnlocked = false;
  private coachShown = false;
  private lastActionSeq = 0;
  private controlSignature = "";
  private coachTimer: number | null = null;
  private hintTimer: number | null = null;
  private feedbackTimer: number | null = null;

  private readonly onPointerDown = (event: PointerEvent): void => {
    if (!this.board) return;
    const target = (event.target as Element | null)?.closest<HTMLElement>(
      "[data-control]",
    );
    if (!target || !this.board.contains(target) || target.hidden) return;
    const control = target.dataset.control as TouchControl | undefined;
    if (!control || target.hasAttribute("disabled")) return;

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

    if (control === "move-left" || control === "move-right") {
      const direction: DashDirection =
        control === "move-left" ? "left" : "right";
      const now = performance.now();
      if (this.canDash()) {
        this.taps.set(pointerId, {
          direction,
          startedAt: now,
          startX: event.clientX,
          startY: event.clientY,
          control,
        });
      }
      this.callbacks.onControl(control, true, pointerId);
      if (this.canDash() && this.gestures.down(direction, pointerId, now)) {
        this.callbacks.onDash(direction);
        this.markDashRecognized();
      }
    } else {
      this.callbacks.onControl(control, true, pointerId);
    }
    this.refreshPressed(control);
  };

  private readonly onPointerEnd = (event: PointerEvent): void => {
    const tap = this.taps.get(event.pointerId);
    if (tap) {
      this.taps.delete(event.pointerId);
      const duration = performance.now() - tap.startedAt;
      const moved = Math.hypot(
        event.clientX - tap.startX,
        event.clientY - tap.startY,
      );
      if (
        this.canDash() &&
        this.gestures.up(
          tap.direction,
          event.pointerId,
          duration,
          moved,
          performance.now(),
        )
      ) {
        this.markDashPending();
      }
    }
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
    document.addEventListener("visibilitychange", this.onVisibilityChange);
    root.addEventListener("contextmenu", this.onContextMenu);
  }

  showJoin(view: ControllerJoinView = {}): void {
    this.releaseAll(true);
    this.clearTimers();
    this.resetBoardRefs();

    const container = element("div", "controller controller--join");
    container.dataset.state = "idle";

    const heading = element("h1", "controller__title", "Shrinkonauts");
    const subtitle = element("p", "controller__subtitle", "Phone controller");
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
    fieldset.append(element("legend", "controller__label", "Player slot"));
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
    this.controlSignature = "";
    this.dashUnlocked = false;
    this.coachShown = false;
    this.lastActionSeq = 0;

    const container = element("div", "controller controller--board");
    container.dataset.state = "connecting";
    container.dataset.slot = slot;
    container.dataset.room = room;
    container.dataset.mode = "explore";

    const bar = element("header", "controller__bar");
    const badge = element("span", "controller__badge", slot.toUpperCase());
    badge.dataset.role = "slot";
    const roomNode = element("span", "controller__room", room);
    roomNode.dataset.role = "room";
    const status = element("span", "controller__status", "Connecting…");
    status.dataset.role = "status";
    status.setAttribute("role", "status");
    status.setAttribute("aria-live", "polite");
    const rtt = element("span", "controller__rtt", "");
    rtt.dataset.role = "rtt";
    rtt.hidden = true;
    const controlsButton = element(
      "button",
      "controller__help",
      "?",
    ) as HTMLButtonElement;
    controlsButton.type = "button";
    controlsButton.dataset.role = "controls-open";
    controlsButton.setAttribute("aria-label", "Show controls");
    controlsButton.setAttribute("aria-expanded", "false");
    controlsButton.addEventListener("click", () => this.openSheet());
    bar.append(badge, roomNode, status, rtt, controlsButton);

    const board = element("main", "controller__board");
    board.dataset.role = "board";
    board.dataset.enabled = "false";

    const left = element(
      "section",
      "controller__cluster controller__cluster--left",
    );
    const dashIndicator = element("div", "controller__dash");
    dashIndicator.dataset.role = "dash-indicator";
    dashIndicator.dataset.ready = "false";
    dashIndicator.hidden = true;
    dashIndicator.setAttribute("aria-hidden", "true");
    const dashGlyph = element("span", "controller__dash-glyph", "»");
    const dashLabel = element("span", "controller__dash-label", "DASH");
    const dashHint = element("span", "controller__dash-hint", "2×");
    dashIndicator.append(dashGlyph, dashLabel, dashHint);

    const moveRow = element("div", "controller__move");
    const moveLeft = controlButton(
      "move-left",
      "◀",
      "Move left",
      "controller__key--move",
    );
    const moveRight = controlButton(
      "move-right",
      "▶",
      "Move right",
      "controller__key--move",
    );
    moveRow.append(moveLeft, moveRight);
    left.append(dashIndicator, moveRow);

    const right = element(
      "section",
      "controller__cluster controller__cluster--right animate-in",
    );
    const actionArea = element("div", "controller__action-area");
    const actions = element("div", "controller__actions");
    actions.dataset.role = "actions";
    const scan = controlButton("scan", "Scan", "Scan");
    const pulse = controlButton("pulse", "Pulse", "Pulse");
    const carry = controlButton("carry", "Carry", "Carry");
    const throwButton = controlButton("throw", "Throw", "Throw");
    const dance = controlButton("dance", "Dance", "Dance");
    const interact = controlButton(
      "interact",
      "Interact",
      "Interact",
      "controller__key--accent controller__key--wide",
    );
    actions.append(scan, pulse, carry, throwButton, dance, interact);

    const dialogue = element("section", "controller__dialogue");
    dialogue.dataset.role = "dialogue";
    dialogue.hidden = true;

    const talkPanel = element("div", "controller__talk");
    talkPanel.dataset.role = "talk-panel";
    talkPanel.hidden = true;
    const talkRow = element("div", "controller__dialogue-row");
    talkRow.append(
      controlButton(
        "ui-confirm",
        "Continue",
        "Continue dialogue",
        "controller__key--accent",
      ),
      controlButton("ui-cancel", "Back", "Back out of dialogue"),
    );
    talkPanel.append(talkRow);

    const choicePanel = element("div", "controller__choice-panel");
    choicePanel.dataset.role = "choice-panel";
    choicePanel.hidden = true;
    const choiceRow = element("div", "controller__choices");
    const choiceButtons: HTMLButtonElement[] = [];
    for (const choice of [1, 2, 3, 4, 5] as const) {
      const button = controlButton(
        `choice-${choice}` as TouchControl,
        String(choice),
        `Choose ${choice}`,
        "controller__key--choice",
      );
      button.hidden = true;
      choiceButtons.push(button);
      choiceRow.append(button);
    }
    const back = controlButton(
      "ui-cancel",
      "Back",
      "Back out of dialogue",
      "controller__key--choice-back",
    );
    choiceRow.append(back);
    choicePanel.append(choiceRow);

    dialogue.append(talkPanel, choicePanel);
    actionArea.append(actions, dialogue);
    const jump = controlButton(
      "jump",
      "Jump",
      "Jump",
      "controller__key--jump",
    );
    right.append(actionArea, jump);

    const hint = element(
      "p",
      "controller__board-hint",
      "Landscape • keep this screen awake",
    );
    hint.dataset.role = "board-hint";

    const coach = element("div", "controller__coach");
    coach.dataset.role = "dash-coach";
    coach.hidden = true;
    coach.setAttribute("aria-live", "polite");
    const coachGlyph = element("span", "controller__coach-glyph", "»");
    const coachCopy = element(
      "span",
      "controller__coach-copy",
      "Double-tap ◀ or ▶ to dash",
    );
    coach.append(coachGlyph, coachCopy);

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

    const sheet = controlsSheet();
    const sheetClose = sheet.querySelector<HTMLElement>(
      '[data-role="controls-close"]',
    );
    sheetClose?.addEventListener("click", () => this.closeSheet());
    const haptics = sheet.querySelector<HTMLInputElement>(
      '[data-role="haptics-toggle"]',
    );
    haptics?.addEventListener("change", () => {
      try {
        window.localStorage.setItem(
          HAPTICS_STORAGE_KEY,
          haptics.checked ? "on" : "off",
        );
      } catch {
        // Settings are best-effort on private browsing.
      }
    });
    sheet.addEventListener("click", (event) => {
      if (event.target === sheet) this.closeSheet();
    });

    board.append(left, right, hint, coach, overlay);
    const rotate = element(
      "div",
      "controller__rotate",
      "Rotate your phone to landscape",
    );
    container.append(bar, board, sheet, rotate);

    this.container = container;
    this.board = board;
    this.actions = actions;
    this.dialogue = dialogue;
    this.talkPanel = talkPanel;
    this.choicePanel = choicePanel;
    this.choiceButtons = choiceButtons;
    this.jumpButton = jump;
    this.dashIndicator = dashIndicator;
    this.coach = coach;
    this.sheet = sheet;
    this.slotBadge = badge;
    this.roomCode = roomNode;
    this.status = status;
    this.rtt = rtt;
    this.overlay = overlay;
    this.overlayCopy = overlayCopy;
    this.controlsButton = controlsButton;

    this.verbButtons.clear();
    this.verbButtons.set("jump", jump);
    this.verbButtons.set("interact", interact);
    this.verbButtons.set("scan", scan);
    this.verbButtons.set("pulse", pulse);
    this.verbButtons.set("carry", carry);
    this.verbButtons.set("throw", throwButton);

    this.root.replaceChildren(container);
    this.applyControl(DEFAULT_CONTROL);
    this.setTouchEnabled(false);
  }

  showFatal(message: string): void {
    this.releaseAll(true);
    this.clearTimers();
    this.resetBoardRefs();
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

    if (view.control) this.applyControl(view.control);
    if (view.action) this.applyAction(view.action);
    this.setTouchEnabled(view.state === "ready");
  }

  setTouchEnabled(enabled: boolean): void {
    this.connectionEnabled = enabled;
    if (this.board) this.board.dataset.enabled = String(enabled);
    this.applyEnabled();
    if (!enabled) this.releaseAll(true);
  }

  destroy(): void {
    this.root.removeEventListener("pointerdown", this.onPointerDown);
    window.removeEventListener("pointerup", this.onPointerEnd);
    window.removeEventListener("pointercancel", this.onPointerEnd);
    window.removeEventListener("blur", this.onBlur);
    document.removeEventListener("visibilitychange", this.onVisibilityChange);
    this.root.removeEventListener("contextmenu", this.onContextMenu);
    this.releaseAll(true);
    this.clearTimers();
    this.root.replaceChildren();
    this.container = null;
    this.resetBoardRefs();
  }

  private applyControl(control: ControlDescriptor): void {
    const signature = JSON.stringify(control);
    if (signature === this.controlSignature) return;
    this.controlSignature = signature;

    const verbs = new Set(control.verbs);
    const mode = control.mode;
    this.choiceMode = mode === "choice";
    this.dashUnlocked = verbs.has("dash");
    if (this.choiceMode || !this.dashUnlocked) {
      this.gestures.reset();
      this.taps.clear();
    }

    if (this.container) this.container.dataset.mode = mode;
    if (this.actions) this.actions.hidden = mode !== "explore";
    if (this.dialogue) this.dialogue.hidden = mode === "explore";
    if (this.talkPanel) this.talkPanel.hidden = mode !== "talk";
    if (this.choicePanel) this.choicePanel.hidden = mode !== "choice";
    if (this.jumpButton) this.jumpButton.hidden = mode === "choice";

    for (const verb of CONTROL_ACTIONS) {
      const button = this.verbButtons.get(verb);
      if (!button) continue;
      button.hidden = !verbs.has(verb);
    }
    const throwButton = this.verbButtons.get("throw");
    if (throwButton) throwButton.hidden = !verbs.has("throw");

    if (this.dashIndicator) {
      this.dashIndicator.hidden = !this.dashUnlocked;
      this.dashIndicator.dataset.ready = String(control.dashReady);
      this.dashIndicator.dataset.active = String(
        control.activeVerb === "dash",
      );
    }

    if (mode === "choice" && control.choices !== undefined) {
      for (const [index, button] of this.choiceButtons.entries()) {
        const visible = index < control.choices;
        button.hidden = !visible;
        button.dataset.selected = String(control.selected === index + 1);
        button.setAttribute("aria-pressed", String(control.selected === index + 1));
      }
    }

    for (const [verb, button] of this.verbButtons) {
      button.dataset.active = String(control.activeVerb === verb);
    }

    if (this.dashUnlocked && !this.coachShown && mode !== "choice") {
      this.showCoach();
    }
    if (!this.dashUnlocked && this.dashIndicator) {
      this.dashIndicator.dataset.ready = "false";
    }

    this.applyEnabled();
    if (this.board) this.updateHint();
  }

  private applyAction(action: {
    seq: number;
    feedback: ActionFeedback;
  }): void {
    if (action.seq <= this.lastActionSeq) return;
    this.lastActionSeq = action.seq;
    const { verb, result } = action.feedback;
    const target =
      verb === "dash"
        ? this.dashIndicator
        : this.verbButtons.get(verb) ?? null;
    if (!target) return;
    this.clearFeedbackTimer();
    target.dataset.result = result;
    if (result === "cooldown") {
      const retry = action.feedback.retryAfterMs ?? 450;
      target.style.setProperty("--cooldown-ms", `${retry}ms`);
      target.dataset.ready = "false";
    }
    this.feedbackTimer = window.setTimeout(() => {
      delete target.dataset.result;
      this.feedbackTimer = null;
    }, 320);
    this.vibrateFor(result);
  }

  private applyEnabled(): void {
    const enabled = this.connectionEnabled;
    for (const button of this.board?.querySelectorAll<HTMLButtonElement>(
      "[data-control]",
    ) ?? []) {
      const control = button.dataset.control as TouchControl | undefined;
      if (!control) continue;
      const dialogue = isDialogueControl(control);
      const movement =
        control === "move-left" ||
        control === "move-right" ||
        control === "jump";
      button.disabled =
        !enabled ||
        (!dialogue && this.choiceMode) ||
        (movement && this.choiceMode);
    }
  }

  private canDash(): boolean {
    return (
      this.connectionEnabled &&
      this.dashUnlocked &&
      !this.choiceMode
    );
  }

  private updateHint(): void {
    const hint = this.board?.querySelector<HTMLElement>(
      '[data-role="board-hint"]',
    );
    if (!hint) return;
    hint.textContent = this.dashUnlocked
      ? "Hold to move · Double-tap to dash"
      : "Landscape • keep this screen awake";
  }

  private showCoach(): void {
    if (!this.coach) return;
    this.coachShown = true;
    this.coach.hidden = false;
    this.coach.dataset.visible = "true";
    this.clearCoachTimer();
    this.coachTimer = window.setTimeout(() => {
      this.dismissCoach();
    }, 5_000);
  }

  private dismissCoach(): void {
    this.clearCoachTimer();
    if (this.coach) {
      this.coach.hidden = true;
      this.coach.dataset.visible = "false";
    }
  }

  private markDashRecognized(): void {
    this.dismissCoach();
    if (this.dashIndicator) {
      this.dashIndicator.dataset.pending = "false";
      this.dashIndicator.dataset.recognized = "true";
      window.setTimeout(() => {
        if (this.dashIndicator) {
          delete this.dashIndicator.dataset.recognized;
        }
      }, 260);
    }
  }

  private markDashPending(): void {
    if (!this.dashIndicator) return;
    this.dashIndicator.dataset.pending = "true";
    if (this.hintTimer !== null) window.clearTimeout(this.hintTimer);
    this.hintTimer = window.setTimeout(() => {
      if (this.dashIndicator) {
        this.dashIndicator.dataset.pending = "false";
      }
      this.hintTimer = null;
    }, 340);
  }

  private vibrateFor(result: string): void {
    if (!hapticsEnabled()) return;
    try {
      if (result === "accepted") navigator.vibrate?.([8, 24, 8]);
      else if (result === "rejected") navigator.vibrate?.(28);
      else if (result === "cooldown") navigator.vibrate?.(12);
    } catch {
      // Haptics are optional.
    }
  }

  private openSheet(): void {
    this.releaseAll(true);
    this.dismissCoach();
    if (this.sheet) this.sheet.hidden = false;
    this.controlsButton?.setAttribute("aria-expanded", "true");
  }

  private closeSheet(): void {
    if (this.sheet) this.sheet.hidden = true;
    this.controlsButton?.setAttribute("aria-expanded", "false");
  }

  private releasePointer(pointerId: number): void {
    const control = this.pointers.get(pointerId);
    if (control === undefined) return;
    this.pointers.delete(pointerId);
    this.callbacks.onControl(control, false, pointerId);
    this.refreshPressed(control);
  }

  private releaseAll(sendReleases: boolean): void {
    this.gestures.reset();
    this.taps.clear();
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

  private resetBoardRefs(): void {
    this.board = null;
    this.actions = null;
    this.dialogue = null;
    this.talkPanel = null;
    this.choicePanel = null;
    this.choiceButtons = [];
    this.jumpButton = null;
    this.dashIndicator = null;
    this.coach = null;
    this.sheet = null;
    this.slotBadge = null;
    this.roomCode = null;
    this.status = null;
    this.rtt = null;
    this.overlay = null;
    this.overlayCopy = null;
    this.controlsButton = null;
    this.verbButtons.clear();
  }

  private clearTimers(): void {
    this.clearCoachTimer();
    if (this.hintTimer !== null) {
      window.clearTimeout(this.hintTimer);
      this.hintTimer = null;
    }
    this.clearFeedbackTimer();
  }

  private clearCoachTimer(): void {
    if (this.coachTimer !== null) {
      window.clearTimeout(this.coachTimer);
      this.coachTimer = null;
    }
  }

  private clearFeedbackTimer(): void {
    if (this.feedbackTimer !== null) {
      window.clearTimeout(this.feedbackTimer);
      this.feedbackTimer = null;
    }
  }
}

export function mountControllerUi(
  root: HTMLElement,
  callbacks: ControllerUiCallbacks,
): ControllerUi {
  return new ControllerUiImpl(root, callbacks);
}
