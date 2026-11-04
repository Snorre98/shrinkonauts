import type {
  HubCallbacks,
  HubControllerSlotView,
  HubControllerView,
  HubInputSource,
  HubMode,
  HubView,
} from "./hub-model";
import type { PlayerId } from "./model";
import { qrSvgDataUrl } from "./qr";
import { snapTextScale, TEXT_SCALES } from "./text-scale";

export interface HubUiOptions {
  callbacks: HubCallbacks;
}

export interface HubUi {
  update(view: HubView): void;
  focus(): void;
  setVisible(visible: boolean): void;
  destroy(): void;
  readonly element: HTMLElement;
}

const MODE_LABELS: Record<HubMode, string> = {
  solo: "Solo",
  local: "Local co-op",
};

const INPUT_SOURCE_LABELS: Record<HubInputSource, string> = {
  keyboard: "Keyboard",
  controller: "Phone",
};

interface ControllerCard {
  root: HTMLElement;
  badge: HTMLElement;
  qr: HTMLImageElement;
  link: HTMLAnchorElement;
  url: HTMLElement;
  message: HTMLElement;
  fallback: HTMLButtonElement;
}

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className?: string,
  text?: string,
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function button(
  label: string,
  className: string,
  onClick: () => void,
): HTMLButtonElement {
  const node = el("button", className, label);
  node.type = "button";
  node.addEventListener("click", onClick);
  return node;
}

function setText(node: HTMLElement, text: string): void {
  if (node.textContent !== text) node.textContent = text;
}

function statusLabel(status: HubView["packs"][number]["status"]): string {
  switch (status) {
    case "available":
      return "Ready";
    case "coming-soon":
      return "M2";
    default:
      return "Unavailable";
  }
}

function controllerStatusText(view: HubControllerView): string {
  if (view.status === "error") return "The phone room is unavailable.";
  if (view.status === "ready") {
    return "All phone slots are ready. Start when you are ready.";
  }
  if (view.status === "preparing") {
    return "Preparing the phone room…";
  }
  const waiting = view.slots
    .filter((slot) => slot.status !== "ready" && slot.status !== "closed")
    .map((slot) => slot.label);
  return waiting.length > 0
    ? `Waiting for ${waiting.join(" and ")} to join.`
    : "Waiting for the phone controllers.";
}

export function mountHubUi(
  root: HTMLElement,
  options: HubUiOptions,
): HubUi {
  const callbacks = options.callbacks;
  let view: HubView | null = null;
  let packsBuilt = false;
  let confirmingNewCycle = false;
  let focusSlotAfterRender: PlayerId | null = null;

  const element = el("main", "hub");
  element.setAttribute("aria-labelledby", "hub-title");

  const panel = el("section", "hub__panel");
  const header = el("header", "hub__header");
  const eyebrow = el("p", "hub__eyebrow", "Real world · laundry day");
  const title = el("h1", "hub__title", "The bathroom");
  const subtitle = el("p", "hub__lede", "");
  const status = el("p", "hub__status", "");
  status.id = "hub-status";
  status.setAttribute("role", "status");
  status.setAttribute("aria-live", "polite");
  header.append(eyebrow, title, subtitle, status);

  const packGroup = el("fieldset", "hub__group hub__group--packs");
  const packLegend = el("legend", "hub__legend", "Choose a cycle");
  const packGrid = el("div", "hub__packs");
  packGroup.append(packLegend, packGrid);
  const packInputs = new Map<string, HTMLInputElement>();
  const packCards = new Map<string, HTMLElement>();

  const modeGroup = el("fieldset", "hub__group");
  const modeLegend = el("legend", "hub__legend", "Players");
  const modeRow = el("div", "hub__modes");
  modeGroup.append(modeLegend, modeRow);
  const modeInputs = new Map<HubMode, HTMLInputElement>();
  for (const mode of ["solo", "local"] as const) {
    const label = el("label", "hub__mode");
    const input = el("input");
    input.type = "radio";
    input.name = "hub-mode";
    input.value = mode;
    input.addEventListener("change", () => {
      if (input.checked) callbacks.onModeChange(mode);
    });
    const text = el("span", "hub__mode-label", MODE_LABELS[mode]);
    label.append(input, text);
    modeInputs.set(mode, input);
    modeRow.append(label);
  }

  const inputGroup = el("fieldset", "hub__group hub__input-plan");
  const inputLegend = el("legend", "hub__legend", "Controller input");
  const inputSlots = el("div", "hub__input-slots");
  inputGroup.append(inputLegend, inputSlots);
  const inputInputs = new Map<
    PlayerId,
    Map<HubInputSource, HTMLInputElement>
  >();
  for (const slot of ["p1", "p2"] as const) {
    const slotGroup = el("fieldset", "hub__input-slot");
    slotGroup.dataset.slot = slot;
    const slotLegend = el("legend", "hub__input-slot-label", slot.toUpperCase());
    const options = el("div", "hub__input-options");
    const bySource = new Map<HubInputSource, HTMLInputElement>();
    for (const source of ["keyboard", "controller"] as const) {
      const label = el("label", "hub__input-option");
      const input = el("input");
      input.type = "radio";
      input.name = `hub-input-${slot}`;
      input.value = source;
      input.addEventListener("change", () => {
        if (input.checked) callbacks.onInputSourceChange(slot, source);
      });
      label.append(
        input,
        el("span", "hub__input-option-label", INPUT_SOURCE_LABELS[source]),
      );
      options.append(label);
      bySource.set(source, input);
    }
    inputInputs.set(slot, bySource);
    slotGroup.append(slotLegend, options);
    inputSlots.append(slotGroup);
  }

  const controller = el("section", "hub__controller");
  controller.hidden = true;
  const controllerHead = el("div", "hub__controller-head");
  const controllerInfo = el("div", "hub__controller-info");
  controllerInfo.append(
    el("h3", "hub__controller-title", "Phone controllers"),
    el(
      "p",
      "hub__controller-hint",
      "Scan with each phone. Keep this screen visible.",
    ),
  );
  const controllerRoom = el("div", "hub__controller-room");
  const controllerCodeLabel = el(
    "span",
    "hub__controller-room-label",
    "Room code",
  );
  const controllerCode = el("code", "hub__controller-code", "");
  controllerCode.dataset.role = "room-code";
  controllerRoom.append(controllerCodeLabel, controllerCode);
  controllerHead.append(controllerInfo, controllerRoom);
  const controllerStatus = el("p", "hub__controller-status", "");
  controllerStatus.setAttribute("role", "status");
  controllerStatus.setAttribute("aria-live", "polite");
  const controllerError = el("p", "hub__controller-error", "");
  controllerError.setAttribute("role", "alert");
  controllerError.hidden = true;
  const controllerSlots = el("div", "hub__controller-slots");
  controller.append(
    controllerHead,
    controllerStatus,
    controllerError,
    controllerSlots,
  );
  const controllerCards = new Map<PlayerId, ControllerCard>();
  let controllerSignature = "";

  const startSection = el("section", "hub__start");
  const startButton = button("Start cycle", "button button--primary hub__start-button", () =>
    callbacks.onStart(),
  );
  startButton.setAttribute("aria-describedby", "hub-start-reason");
  const newCycleButton = button(
    "New cycle",
    "button button--small hub__new-cycle",
    () => {
      confirmingNewCycle = true;
      renderConfirm();
    },
  );
  const reason = el("p", "hub__reason", "");
  reason.id = "hub-start-reason";
  const confirm = el("div", "hub__confirm");
  confirm.hidden = true;
  confirm.setAttribute("role", "alertdialog");
  confirm.setAttribute("aria-label", "Erase cycle progress");
  const confirmText = el("p", "hub__confirm-text", "");
  const confirmActions = el("div", "hub__confirm-actions");
  const confirmErase = button("Erase and start", "button button--primary", () => {
    confirmingNewCycle = false;
    confirm.hidden = true;
    callbacks.onNewCycle();
  });
  const confirmCancel = button("Cancel", "button button--small", () => {
    confirmingNewCycle = false;
    confirm.hidden = true;
    newCycleButton.focus();
  });
  confirmActions.append(confirmErase, confirmCancel);
  confirm.append(confirmText, confirmActions);
  confirm.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;
    event.preventDefault();
    confirmingNewCycle = false;
    confirm.hidden = true;
    newCycleButton.focus();
  });

  const error = el("p", "hub__error", "");
  error.id = "hub-error";
  error.setAttribute("role", "alert");
  error.hidden = true;

  const settings = el("details", "hub__details");
  const settingsSummary = el("summary", "hub__summary", "Settings");
  const settingsBody = el("div", "hub__details-body");
  const soundRow = el("div", "hub__setting");
  const soundLabel = el("span", "hub__setting-label", "Sound");
  const muteButton = button("Mute (M)", "button button--small", () =>
    callbacks.onMute(),
  );
  soundRow.append(soundLabel, muteButton);

  const scaleRow = el("div", "hub__setting");
  const scaleLabel = el("span", "hub__setting-label", "Text size");
  const scaleChoices = el("div", "hub__choices");
  const scaleButtons: Array<{ node: HTMLButtonElement; scale: number }> = [];
  for (const scale of TEXT_SCALES) {
    const node = button(
      `${Math.round(scale * 100)}%`,
      "button button--small",
      () => callbacks.onTextScale(scale),
    );
    scaleButtons.push({ node, scale });
    scaleChoices.append(node);
  }
  scaleRow.append(scaleLabel, scaleChoices);

  const motionRow = el("div", "hub__setting");
  const motionLabel = el("span", "hub__setting-label", "Reduced motion");
  const motionButton = button("Off", "button button--small", () =>
    callbacks.onToggleReducedMotion(),
  );
  motionRow.append(motionLabel, motionButton);
  settingsBody.append(soundRow, scaleRow, motionRow);
  settings.append(settingsSummary, settingsBody);

  const controls = el("details", "hub__details");
  const controlsSummary = el("summary", "hub__summary", "Controls");
  const controlsBody = el("div", "hub__details-body");
  const controlsList = el("dl", "hub__controls");
  const controlRows: ReadonlyArray<[string, string]> = [
    ["Menus", "Tab / Shift+Tab · Enter / Space · Esc back"],
    ["Player 1", "A / D · W / Space · Shift · E/Enter · Q · F · 1–5 choices"],
    ["Player 2", "← / → · ↑ · / · , confirm · . · ' · ; · Delete cancel"],
    ["Shared", "P join · Tab map · C log · Esc pause · M mute"],
  ];
  for (const [label, keys] of controlRows) {
    controlsList.append(el("dt", undefined, label), el("dd", undefined, keys));
  }
  controlsBody.append(controlsList);
  controls.append(controlsSummary, controlsBody);

  const footer = el("footer", "hub__footer");
  const assetMode = el("span", "hub__asset-mode", "Placeholder build");
  const version = el("span", "hub__version", "Shrinkonauts · M1.9");
  footer.append(assetMode, version);

  panel.append(
    header,
    packGroup,
    modeGroup,
    inputGroup,
    controller,
    startSection,
    confirm,
    error,
    settings,
    controls,
    footer,
  );
  startSection.append(startButton, newCycleButton, reason);
  element.append(panel);

  function renderPacks(next: HubView): void {
    if (packsBuilt) {
      for (const pack of next.packs) {
        const input = packInputs.get(pack.id);
        const card = packCards.get(pack.id);
        if (input) {
          input.checked = pack.selected;
          input.disabled = next.busy || pack.status !== "available";
        }
        if (card) {
          card.dataset.selected = String(pack.selected);
          card.dataset.status = pack.status;
          const save = card.querySelector<HTMLElement>(".hub-card__save");
          if (save) save.hidden = !pack.hasSave;
        }
      }
      return;
    }

    packGrid.replaceChildren();
    packInputs.clear();
    packCards.clear();
    for (const pack of next.packs) {
      const label = el("label", "hub-card");
      label.dataset.status = pack.status;
      label.dataset.selected = String(pack.selected);
      label.title = pack.description ?? pack.title;
      const input = el("input");
      input.type = "radio";
      input.name = "hub-pack";
      input.value = pack.id;
      input.checked = pack.selected;
      input.disabled = pack.status !== "available";
      input.addEventListener("change", () => {
        if (input.checked && !input.disabled) callbacks.onSelectPack(pack.id);
      });
      const body = el("span", "hub-card__body");
      const titleRow = el("span", "hub-card__title-row");
      if (pack.iconSrc) {
        const icon = el("img", "hub-card__icon");
        icon.src = pack.iconSrc;
        icon.alt = "";
        icon.width = 32;
        icon.height = 32;
        icon.decoding = "async";
        titleRow.append(icon);
      }
      const titleGroup = el("span", "hub-card__title-group");
      const cardTitle = el("span", "hub-card__title", pack.title);
      const badge = el("span", "hub-card__status", statusLabel(pack.status));
      titleGroup.append(cardTitle, badge);
      titleRow.append(titleGroup);
      const cardSubtitle = el(
        "span",
        "hub-card__subtitle",
        pack.subtitle ?? "",
      );
      const cardDescription = el(
        "span",
        "hub-card__description",
        pack.description ?? "",
      );
      const save = el("span", "hub-card__save", "Progress saved");
      save.hidden = !pack.hasSave;
      body.append(titleRow, cardSubtitle, cardDescription, save);
      label.append(input, body);
      packInputs.set(pack.id, input);
      packCards.set(pack.id, label);
      packGrid.append(label);
    }
    packsBuilt = true;
  }

  function buildControllerCard(slot: HubControllerSlotView): ControllerCard {
    const root = el("article", "hub__controller-slot");
    root.dataset.slot = slot.slot;
    const head = el("header", "hub__controller-slot-head");
    const name = el("h4", "hub__controller-slot-name", slot.label);
    const badge = el("span", "hub__controller-badge", slot.statusLabel);
    head.append(name, badge);

    const qr = el("img", "hub__controller-qr");
    qr.alt = `QR code for the ${slot.label} phone controller`;
    qr.width = 128;
    qr.height = 128;
    qr.decoding = "async";
    if (slot.url) {
      try {
        qr.src = qrSvgDataUrl(slot.url);
      } catch {
        qr.hidden = true;
      }
    } else {
      qr.hidden = true;
    }

    const code = el(
      "p",
      "hub__controller-code-line",
      slot.roomCode ? `Code ${slot.roomCode}` : "",
    );
    const link = el("a", "hub__controller-link", "Open controller link");
    link.href = slot.url || "#";
    link.target = "_blank";
    link.rel = "noreferrer";
    link.dataset.role = "controller-url";
    link.hidden = !slot.url;
    const url = el("code", "hub__controller-url", slot.url);
    url.title = slot.url;
    url.hidden = !slot.url;

    const message = el("p", "hub__controller-slot-message", "");
    message.hidden = !slot.message;
    const fallback = button(
      "Use keyboard instead",
      "button button--small hub__controller-fallback",
      () => {
        focusSlotAfterRender = slot.slot;
        callbacks.onInputSourceChange(slot.slot, "keyboard");
      },
    );
    fallback.dataset.role = "use-keyboard";

    root.append(head, qr, code, link, url, message, fallback);
    return { root, badge, qr, link, url, message, fallback };
  }

  function renderController(next: HubView): void {
    const data = next.mode === "local" ? next.controller : null;
    if (!data || data.slots.length === 0) {
      controller.hidden = true;
      controllerSlots.replaceChildren();
      controllerCards.clear();
      controllerSignature = "";
      return;
    }

    controller.hidden = false;
    controller.dataset.status = data.status;
    setText(controllerCode, data.roomCode || "—");
    setText(controllerStatus, controllerStatusText(data));
    const errorMessage = data.status === "error" ? data.message ?? "" : "";
    setText(controllerError, errorMessage);
    controllerError.hidden = !errorMessage;

    const signature = `${data.roomCode}|${data.slots
      .map((slot) => `${slot.slot}:${slot.url}`)
      .join("|")}`;
    if (signature !== controllerSignature) {
      controllerSignature = signature;
      controllerSlots.replaceChildren();
      controllerCards.clear();
      for (const slot of data.slots) {
        const card = buildControllerCard(slot);
        controllerCards.set(slot.slot, card);
        controllerSlots.append(card.root);
      }
    }

    const disabled = next.busy || next.phase === "starting";
    for (const slot of data.slots) {
      const card = controllerCards.get(slot.slot);
      if (!card) continue;
      card.root.dataset.status = slot.status;
      setText(card.badge, slot.statusLabel);
      card.message.textContent = slot.message ?? "";
      card.message.hidden = !slot.message;
      card.fallback.disabled = disabled || slot.status === "closed";
      card.fallback.hidden = slot.status === "closed";
    }

  }

  function renderConfirm(): void {
    if (!view) return;
    const pack = view.packs.find((entry) => entry.id === view?.selectedPackId);
    confirmText.textContent = pack
      ? `Erase the saved ${pack.title} cycle and start from the beginning?`
      : "Erase the saved cycle and start from the beginning?";
    confirm.hidden = !confirmingNewCycle;
    if (confirmingNewCycle) {
      confirmErase.focus();
    }
  }

  function update(next: HubView): void {
    view = next;
    element.dataset.phase = next.phase;
    element.dataset.mode = next.mode;
    subtitle.textContent = next.subtitle;
    setText(status, next.notice ?? "");
    status.hidden = !next.notice;
    assetMode.textContent = next.assetMode;

    renderPacks(next);
    const controlsDisabled = next.busy || next.phase === "starting";
    for (const [mode, input] of modeInputs) {
      input.checked = next.mode === mode;
      input.disabled = controlsDisabled;
    }

    inputGroup.hidden = next.mode !== "local";
    for (const slot of ["p1", "p2"] as const) {
      const bySource = inputInputs.get(slot);
      if (!bySource) continue;
      for (const [source, input] of bySource) {
        input.checked = next.inputPlan[slot] === source;
        input.disabled = controlsDisabled;
      }
    }
    renderController(next);
    if (focusSlotAfterRender) {
      const target = inputInputs
        .get(focusSlotAfterRender)
        ?.get("keyboard");
      focusSlotAfterRender = null;
      if (target && !target.disabled) target.focus();
    }

    startButton.textContent = next.startLabel;
    startButton.disabled = next.startDisabled || next.busy;
    startButton.setAttribute("aria-busy", String(next.phase === "starting"));
    setText(reason, next.startReason ?? "");
    reason.hidden = !next.startReason;
    newCycleButton.hidden = !next.canStartNew || next.busy;
    renderConfirm();

    error.textContent = next.error ?? "";
    error.hidden = !next.error;

    muteButton.textContent = next.settings.audio.muted ? "Unmute (M)" : "Mute (M)";
    muteButton.setAttribute("aria-pressed", String(next.settings.audio.muted));
    motionButton.textContent =
      next.settings.accessibility.reducedMotion ? "On" : "Off";
    motionButton.setAttribute(
      "aria-pressed",
      String(next.settings.accessibility.reducedMotion),
    );
    const activeScale = snapTextScale(next.settings.accessibility.textScale);
    for (const control of scaleButtons) {
      const active = Math.abs(control.scale - activeScale) < 0.01;
      control.node.dataset.active = String(active);
      control.node.setAttribute("aria-pressed", String(active));
    }

    if (next.phase === "starting") {
      startButton.textContent = "Starting cycle…";
      startButton.disabled = true;
      for (const input of packInputs.values()) input.disabled = true;
      for (const input of modeInputs.values()) input.disabled = true;
      for (const bySource of inputInputs.values()) {
        for (const input of bySource.values()) input.disabled = true;
      }
    }
  }

  root.append(element);

  return {
    element,
    update,
    focus() {
      const selected = view?.selectedPackId
        ? packInputs.get(view.selectedPackId)
        : undefined;
      if (selected && !selected.disabled) {
        selected.focus();
        return;
      }
      const firstEnabled = [...packInputs.values()].find((input) => !input.disabled);
      (firstEnabled ?? startButton).focus();
    },
    setVisible(visible) {
      element.hidden = !visible;
      if (visible) {
        element.removeAttribute("aria-hidden");
      } else {
        element.setAttribute("aria-hidden", "true");
      }
    },
    destroy() {
      element.remove();
      packInputs.clear();
      packCards.clear();
      modeInputs.clear();
      inputInputs.clear();
      controllerCards.clear();
    },
  };
}
