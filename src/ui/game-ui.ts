import type { ResolvedAsset } from "../assets";
import type { GateAnswer } from "../pack";
import type {
  ConceptView,
  DialogueView,
  GateView,
  RuntimeSnapshot,
  SettingsView,
} from "./model";

export interface GameUiDiagnostics {
  modeLabel: string;
  total: number;
  placeholders: number;
  overrides: ReadonlyArray<{ id: string; label: string }>;
  warnings: readonly string[];
}

export interface GameUiCallbacks {
  onAdvanceDialogue(): void;
  onChooseDialogue(choiceId: string): void;
  onGateSubmit(answer: GateAnswer): void;
  onGateHint(): void;
  onCloseGate(): void;
  onToggleMap(): void;
  onToggleLog(): void;
  onResume(): void;
  onEscape(): void;
  onResetPuzzle(): void;
  onPuzzleHint(): void;
  onMute(): void;
  onTextScale(scale: number): void;
  onToggleReducedMotion(): void;
  onDebriefAnswer(promptId: string, answer: string): void;
  onDebriefFinish(): void;
  onExport(): void;
  onNewRun(): void;
}

export interface GameUiOptions {
  badge?: ResolvedAsset;
  diagnostics: GameUiDiagnostics;
  callbacks: GameUiCallbacks;
}

export interface GameUi {
  update(snapshot: RuntimeSnapshot): void;
  applySettings(settings: SettingsView): void;
  setDiagnostics(diagnostics: GameUiDiagnostics): void;
  warn(message: string): void;
  fatal(error: Error): void;
}

type OverlayKey = string;
type OverlayUpdater = (snapshot: RuntimeSnapshot) => void;

interface Overlay {
  key: OverlayKey;
  element: HTMLElement;
  update?: OverlayUpdater;
}

const TEXT_SCALES = [0.9, 1, 1.1, 1.3, 1.5] as const;
const FOCUSABLE =
  'button:not([disabled]), [href], input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

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

function percent(value: number): string {
  return `${Math.max(4, Math.min(92, (value + 1) * 12))}%`;
}

function sentenceList(items: readonly string[]): string {
  if (items.length === 0) return "All required evidence recorded.";
  return items.join(" ");
}

export function mountGameUi(
  root: HTMLElement,
  options: GameUiOptions,
): GameUi {
  const callbacks = options.callbacks;
  let diagnostics = options.diagnostics;
  let snapshot: RuntimeSnapshot | null = null;
  let overlay: Overlay | null = null;
  let previousFocus: HTMLElement | null = null;
  let fatalError: Error | null = null;

  const hud = el("div", "hud hud--m1");
  const bar = el("header", "hud__bar hud__panel");
  const identity = el("div", "hud__identity");
  const eyebrow = el("p", "hud__eyebrow", "M1 · Anatomy: The Reflex Arc");
  const title = el("h1", "hud__title", "Nerve Forest");
  const objectiveRow = el("p", "hud__meta");
  const abilityRow = el("p", "hud__abilities");
  const hintRow = el("p", "hud__hint");
  hintRow.hidden = true;
  identity.append(eyebrow, title, objectiveRow, abilityRow, hintRow);

  const badgeRow = el("div", "hud__badges");
  const modeBadge = el("span", "hud__mode-badge", options.diagnostics.modeLabel);
  const audioStatus = el("span", "hud__audio", "Audio on");
  audioStatus.dataset.muted = "false";
  const saveStatus = el("span", "hud__save", "Autosave ready");
  badgeRow.append(modeBadge, audioStatus, saveStatus);
  bar.append(identity, badgeRow);

  const help = el("aside", "hud__help hud__panel");
  const helpHeading = el("h2", "hud__heading", "Controls");
  const helpList = el("dl", "hud__controls");
  const rows: ReadonlyArray<[string, string]> = [
    ["Player 1", "A / D · W / Space · Shift · E · Q · F"],
    ["Player 2", "← / → · ↑ · / · , · . · ' · ;"],
    ["Shared", "P join · Tab map · C log · Esc pause · M mute"],
  ];
  for (const [label, keys] of rows) {
    helpList.append(el("dt", undefined, label), el("dd", undefined, keys));
  }
  help.append(helpHeading, helpList);

  const prompt = el("div", "hud__prompt");
  prompt.hidden = true;
  const promptKey = el("kbd", "hud__prompt-key", "E");
  const promptText = el("span", "hud__prompt-text");
  prompt.append(promptKey, promptText);

  const toast = el("div", "hud__toast");
  toast.hidden = true;
  toast.setAttribute("role", "status");
  toast.setAttribute("aria-live", "polite");

  const overlayRoot = el("div", "overlay-root");
  overlayRoot.hidden = true;

  hud.append(bar, help, prompt, toast);
  root.append(hud, overlayRoot);

  /* ---------------------------------------------------------------- */
  /* Settings                                                         */
  /* ---------------------------------------------------------------- */

  function applySettings(settings: SettingsView): void {
    document.documentElement.style.setProperty(
      "--ui-font-scale",
      String(settings.accessibility.textScale),
    );
    document.documentElement.dataset.reducedMotion = String(
      settings.accessibility.reducedMotion,
    );
  }

  /* ---------------------------------------------------------------- */
  /* Overlay lifecycle                                                */
  /* ---------------------------------------------------------------- */

  function setOverlay(next: Overlay | null): void {
    if (overlay && next && overlay.key === next.key) {
      // Keep the mounted DOM (and its focus) and let the existing updater
      // refresh labels. Replacing it with the freshly built overlay would
      // update detached nodes, because each render creates its own closure.
      overlay.update?.(snapshot as RuntimeSnapshot);
      return;
    }

    if (overlay) {
      overlayRoot.replaceChildren();
      overlay = null;
      const restore = previousFocus;
      previousFocus = null;
      if (restore && document.contains(restore)) {
        restore.focus({ preventScroll: true });
      }
    }

    if (!next) {
      overlayRoot.hidden = true;
      return;
    }

    previousFocus =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    overlay = next;
    overlayRoot.hidden = false;
    overlayRoot.replaceChildren(next.element);

    const target =
      next.element.querySelector<HTMLElement>("[data-autofocus]") ??
      next.element.querySelector<HTMLElement>(FOCUSABLE) ??
      next.element;
    target.focus({ preventScroll: true });
    next.update?.(snapshot as RuntimeSnapshot);
  }

  function trapTab(event: KeyboardEvent): void {
    if (!overlay) return;
    const focusables = [
      ...overlay.element.querySelectorAll<HTMLElement>(FOCUSABLE),
    ].filter((node) => node.offsetParent !== null);
    if (focusables.length === 0) {
      event.preventDefault();
      overlay.element.focus();
      return;
    }
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    if (!first || !last) return;
    const active = document.activeElement;
    if (!event.shiftKey && active === last) {
      event.preventDefault();
      first.focus();
    } else if (event.shiftKey && active === first) {
      event.preventDefault();
      last.focus();
    }
  }

  overlayRoot.addEventListener("keydown", (event) => {
    if (overlayRoot.hidden) return;

    // Gameplay keys are Phaser window listeners. Stop them at the overlay so
    // typing an answer never moves a player or triggers a jump.
    event.stopPropagation();

    if (event.key === "Escape") {
      event.preventDefault();
      callbacks.onEscape();
      return;
    }
    if (event.key === "Tab") {
      trapTab(event);
      return;
    }
    if (event.key === "m" || event.key === "M") {
      // Mute is shared by every screen, including dialogs and the pause menu.
      event.preventDefault();
      callbacks.onMute();
      return;
    }

    const dialogueActive =
      overlay?.element.dataset.overlay === "dialogue" && snapshot?.dialogue;
    if (
      dialogueActive &&
      event.target === overlay?.element &&
      (event.key === "Enter" || event.key === " ")
    ) {
      if (snapshot?.dialogue && snapshot.dialogue.choices.length === 0) {
        event.preventDefault();
        callbacks.onAdvanceDialogue();
      }
    }
  });

  /* ---------------------------------------------------------------- */
  /* Small components                                                 */
  /* ---------------------------------------------------------------- */

  function panel(
    className: string,
    label: string,
    heading: string,
  ): { root: HTMLElement; body: HTMLElement; heading: HTMLElement } {
    const node = el("section", `overlay ${className}`);
    node.dataset.overlay = className.replace("overlay--", "");
    node.tabIndex = -1;
    node.setAttribute("role", "dialog");
    node.setAttribute("aria-modal", "true");
    node.setAttribute("aria-label", label);
    const header = el("header", "overlay__header");
    const titleNode = el("h2", "overlay__title", heading);
    header.append(titleNode);
    const body = el("div", "overlay__body");
    node.append(header, body);
    return { root: node, body, heading: titleNode };
  }

  function closeButton(label: string, action: () => void): HTMLButtonElement {
    const node = button(label, "overlay__close", action);
    node.setAttribute("aria-label", `${label} and return to the level`);
    return node;
  }

  function renderDialogue(dialogue: DialogueView): Overlay {
    const { root: node, body } = panel(
      "overlay--dialogue",
      "Dialogue",
      dialogue.speaker,
    );
    node.dataset.autofocus = "true";

    const text = el("p", "dialogue__text", dialogue.text);
    body.append(text);

    if (dialogue.choices.length > 0) {
      const list = el("div", "dialogue__choices");
      list.setAttribute("role", "group");
      list.setAttribute("aria-label", "Choose a reply");
      for (const choice of dialogue.choices) {
        const option = button(
          choice.text,
          "button button--choice",
          () => callbacks.onChooseDialogue(choice.id),
        );
        list.append(option);
      }
      body.append(list);
    } else {
      const advance = button(
        dialogue.atEnd ? "Close dialogue" : "Continue",
        "button button--primary",
        () => callbacks.onAdvanceDialogue(),
      );
      body.append(advance);
      body.append(
        el("p", "overlay__hint", "Enter or Space advances. Esc closes."),
      );
    }

    return { key: `dialogue:${dialogue.id}:${dialogue.nodeId}`, element: node };
  }

  function renderGate(gate: GateView): Overlay {
    const { root: node, body } = panel("overlay--gate", "Concept gate", "Signal gate");
    node.tabIndex = -1;

    const promptNode = el("p", "gate__prompt", gate.prompt);
    const status = el("p", "gate__status");
    status.setAttribute("role", "status");
    status.setAttribute("aria-live", "polite");
    const feedback = el("p", "gate__feedback");
    feedback.setAttribute("aria-live", "polite");
    const hintNode = el("p", "gate__hint");
    const interactive = el("div", "gate__interactive");
    body.append(promptNode, status, interactive, feedback, hintNode);

    let answer: GateAnswer = [];
    const puzzle = gate.puzzle;

    if (!puzzle) {
      interactive.append(
        el("p", "overlay__hint", "This gate has no puzzle data."),
      );
    } else if (puzzle.type === "singleChoice") {
      let selected = "";
      const group = el("div", "gate__options");
      group.setAttribute("role", "radiogroup");
      for (const option of puzzle.options) {
        const optionButton = button(
          option.text,
          "button gate__option",
          () => {
            selected = option.id;
            for (const item of group.querySelectorAll(".gate__option")) {
              item.setAttribute("aria-checked", "false");
            }
            optionButton.setAttribute("aria-checked", "true");
          },
        );
        optionButton.setAttribute("role", "radio");
        optionButton.setAttribute("aria-checked", "false");
        group.append(optionButton);
      }
      interactive.append(group);
      answer = selected;
      const submit = button("Submit answer", "button button--primary", () => {
        callbacks.onGateSubmit(selected);
      });
      submit.dataset.autofocus = "true";
      interactive.append(submit);
    } else if (puzzle.type === "sequence") {
      const order = [...puzzle.items];
      const list = el("ol", "gate__sequence");
      const draw = (): void => {
        list.replaceChildren(
          ...order.map((item, index) => {
            const row = el("li", "gate__sequence-row");
            const label = el("span", "gate__sequence-label", item);
            const up = button("↑", "button button--icon", () => {
              if (index === 0) return;
              const previous = order[index - 1];
              if (previous === undefined) return;
              order[index - 1] = item;
              order[index] = previous;
              draw();
            });
            up.setAttribute("aria-label", `Move ${item} earlier`);
            up.disabled = index === 0;
            const down = button("↓", "button button--icon", () => {
              if (index === order.length - 1) return;
              const next = order[index + 1];
              if (next === undefined) return;
              order[index + 1] = item;
              order[index] = next;
              draw();
            });
            down.setAttribute("aria-label", `Move ${item} later`);
            down.disabled = index === order.length - 1;
            row.append(label, up, down);
            return row;
          }),
        );
      };
      draw();
      interactive.append(list);
      answer = order;
      const submit = button("Submit order", "button button--primary", () => {
        callbacks.onGateSubmit([...order]);
      });
      submit.dataset.autofocus = "true";
      interactive.append(submit);
    } else {
      const selects = new Map<string, HTMLSelectElement>();
      const grid = el("div", "gate__match");
      for (const left of puzzle.left) {
        const row = el("label", "gate__match-row");
        row.append(el("span", undefined, left));
        const select = el("select", "gate__select");
        const empty = el("option", undefined, "Choose…");
        empty.value = "";
        select.append(empty);
        for (const right of puzzle.right) {
          const option = el("option", undefined, right);
          option.value = right;
          select.append(option);
        }
        selects.set(left, select);
        row.append(select);
        grid.append(row);
      }
      interactive.append(grid);
      answer = Object.fromEntries([...selects].map(([k, v]) => [k, v.value]));
      const submit = button("Submit matches", "button button--primary", () => {
        callbacks.onGateSubmit(
          Object.fromEntries([...selects].map(([k, v]) => [k, v.value])),
        );
      });
      submit.dataset.autofocus = "true";
      interactive.append(submit);
    }

    const actions = el("div", "overlay__actions");
    actions.append(
      button("Hint", "button", () => callbacks.onGateHint()),
      closeButton("Leave gate", () => callbacks.onCloseGate()),
    );
    body.append(actions);

    status.textContent = gate.solved
      ? "Solved — the gate is open."
      : "Order the pathway, then submit.";

    const update = (next: RuntimeSnapshot): void => {
      const current = next.gate;
      if (!current) return;
      if (current.feedback) {
        feedback.textContent = current.feedback.message;
        feedback.dataset.correct = String(current.feedback.correct);
      } else {
        feedback.textContent = "";
        feedback.removeAttribute("data-correct");
      }
      const used = current.hints.slice(0, current.hintIndex);
      hintNode.textContent =
        used.length > 0 ? `Hint: ${used[used.length - 1]}` : "";
      status.textContent = current.solved
        ? "Solved — the gate is open."
        : "Order the pathway, then submit.";
    };

    node.dataset.autofocus = "true";
    void answer;
    return { key: `gate:${gate.id}`, element: node, update };
  }

  function renderMap(snapshot: RuntimeSnapshot): Overlay {
    const { root: node, body } = panel("overlay--map", "System map", "System map");
    const map = el("div", "map");
    for (const mapNode of snapshot.map.nodes) {
      const card = el("article", "map__node");
      card.style.left = percent(mapNode.x);
      card.style.top = percent(mapNode.y);
      card.dataset.current = String(mapNode.current);
      card.dataset.visited = String(mapNode.visited);
      card.append(
        el("h3", "map__label", mapNode.label),
        el(
          "p",
          "map__state",
          mapNode.current
            ? "You are here"
            : mapNode.visited
              ? "Visited"
              : "Unknown path",
        ),
      );
      map.append(card);
    }
    body.append(map);

    const edges = el("ul", "map__edges");
    for (const edge of snapshot.map.edges) {
      const item = el(
        "li",
        undefined,
        edge.revealed
          ? `${edge.from} → ${edge.to} (${edge.type})`
          : "Connection not yet revealed",
      );
      item.dataset.revealed = String(edge.revealed);
      edges.append(item);
    }
    body.append(el("h3", "overlay__subheading", "Connections"), edges);

    const actions = el("div", "overlay__actions");
    actions.append(closeButton("Close map", () => callbacks.onToggleMap()));
    body.append(actions);
    node.dataset.autofocus = "true";
    return { key: "map", element: node };
  }

  function conceptCard(concept: ConceptView): HTMLElement {
    const card = el("article", "concept");
    card.dataset.discovered = String(concept.discovered);
    card.append(el("h3", "concept__term", concept.term));
    card.append(
      el(
        "p",
        "concept__definition",
        concept.discovered
          ? concept.definition
          : "Undiscovered — scan the matching structure in the world.",
      ),
    );
    if (concept.discovered && concept.relationships.length > 0) {
      const list = el("ul", "concept__relationships");
      for (const relationship of concept.relationships) {
        list.append(
          el(
            "li",
            undefined,
            `${relationship.type}: ${relationship.targetTerm}`,
          ),
        );
      }
      card.append(el("h4", "concept__label", "Connections"), list);
    }
    if (concept.discovered && concept.misconceptions.length > 0) {
      const list = el("ul", "concept__misconceptions");
      for (const misconception of concept.misconceptions) {
        list.append(el("li", undefined, `Watch out: ${misconception}`));
      }
      card.append(list);
    }
    return card;
  }

  function renderConceptLog(snapshot: RuntimeSnapshot): Overlay {
    const { root: node, body } = panel(
      "overlay--concept-log",
      "Concept log",
      "Concept log",
    );
    const discovered = snapshot.conceptLog.filter((item) => item.discovered);
    const locked = snapshot.conceptLog.filter((item) => !item.discovered);
    body.append(
      el(
        "p",
        "overlay__hint",
        `${discovered.length} of ${snapshot.conceptLog.length} concepts discovered.`,
      ),
    );
    const grid = el("div", "concept-grid");
    grid.append(...discovered.map(conceptCard));
    if (locked.length > 0) {
      const lockedWrap = el("section", "concept-locked");
      lockedWrap.append(el("h3", "overlay__subheading", "Still hidden"));
      const list = el("ul", "concept-locked__list");
      for (const concept of locked) {
        list.append(el("li", undefined, concept.term));
      }
      lockedWrap.append(list);
      grid.append(lockedWrap);
    }
    body.append(grid);

    const actions = el("div", "overlay__actions");
    actions.append(
      closeButton("Close concept log", () => callbacks.onToggleLog()),
    );
    body.append(actions);
    node.dataset.autofocus = "true";
    return { key: "conceptLog", element: node };
  }

  function renderDebrief(snapshot: RuntimeSnapshot): Overlay {
    const { root: node, body } = panel(
      "overlay--debrief",
      "Debrief",
      "Debrief",
    );
    const data = snapshot.debrief;
    if (!data) {
      body.append(el("p", undefined, "No debrief data."));
      return { key: "debrief", element: node };
    }

    const textareas = new Map<string, HTMLTextAreaElement>();
    for (const prompt of data.prompts) {
      const card = el("section", "debrief__prompt");
      card.append(el("h3", "debrief__question", prompt.prompt));
      card.append(
        el("p", "overlay__hint", `Success looks like: ${prompt.successCriterion}`),
      );
      const area = el("textarea", "debrief__answer");
      area.rows = 3;
      area.placeholder = "Write your answer…";
      area.setAttribute("aria-label", prompt.prompt);
      area.value = data.answers[prompt.id] ?? "";
      textareas.set(prompt.id, area);
      card.append(area);

      const status = el("span", "debrief__status");
      const record = button("Record answer", "button", () => {
        callbacks.onDebriefAnswer(prompt.id, area.value);
      });
      card.append(record, status);
      body.append(card);
    }

    const objectives = el("ul", "debrief__objectives");
    body.append(el("h3", "overlay__subheading", "Evidence"), objectives);

    const actions = el("div", "overlay__actions");
    actions.append(
      button("Finish level", "button button--primary", () =>
        callbacks.onDebriefFinish(),
      ),
      closeButton("Review the level", () => callbacks.onEscape()),
    );
    body.append(actions);
    node.dataset.autofocus = "true";

    const update = (next: RuntimeSnapshot): void => {
      const current = next.debrief;
      if (!current) return;
      for (const prompt of current.prompts) {
        const area = textareas.get(prompt.id);
        const answer = current.answers[prompt.id];
        if (area && answer !== undefined && document.activeElement !== area) {
          area.value = answer;
        }
      }
      objectives.replaceChildren(
        ...current.objectives.map((objective) => {
          const item = el("li");
          item.dataset.met = String(objective.requiredMet);
          item.textContent = `${objective.objectiveId}: ${
            objective.requiredMet ? "required evidence recorded" : "evidence missing"
          } · score ${objective.score}`;
          return item;
        }),
      );
    };
    update(snapshot);

    return { key: "debrief", element: node, update };
  }

  function renderComplete(snapshot: RuntimeSnapshot): Overlay {
    const { root: node, body } = panel(
      "overlay--complete",
      "Level complete",
      "Signal restored",
    );
    body.append(
      el(
        "p",
        "complete__lede",
        "The signal reached the muscle effector. Export the evidence file for your teacher, or replay the slice.",
      ),
    );
    const data = snapshot.debrief;
    const list = el("ul", "debrief__objectives");
    for (const objective of data?.objectives ?? []) {
      const item = el("li");
      item.dataset.met = String(objective.requiredMet);
      item.textContent = `${objective.objectiveId}: ${
        objective.requiredMet ? "required evidence recorded" : "evidence missing"
      }`;
      list.append(item);
    }
    body.append(list, el("p", "overlay__hint", sentenceList([])));

    const actions = el("div", "overlay__actions");
    actions.append(
      button("Export evidence", "button button--primary", () =>
        callbacks.onExport(),
      ),
      button("Play again", "button", () => callbacks.onNewRun()),
    );
    body.append(actions);
    node.dataset.autofocus = "true";
    return { key: "complete", element: node };
  }

  function renderPause(snapshot: RuntimeSnapshot): Overlay {
    const { root: node, body } = panel("overlay--pause", "Paused", "Paused");
    const settingsBlock = el("section", "settings");
    settingsBlock.append(el("h3", "overlay__subheading", "Accessibility"));

    const scaleRow = el("div", "settings__row");
    scaleRow.append(el("span", "settings__label", "Text size"));
    const scaleButtons = el("div", "settings__choices");
    const scaleControls: Array<{ node: HTMLButtonElement; scale: number }> = [];
    for (const scale of TEXT_SCALES) {
      const nodeButton = button(
        `${Math.round(scale * 100)}%`,
        "button button--small",
        () => callbacks.onTextScale(scale),
      );
      scaleControls.push({ node: nodeButton, scale });
      scaleButtons.append(nodeButton);
    }
    scaleRow.append(scaleButtons);

    const motionRow = el("div", "settings__row");
    motionRow.append(el("span", "settings__label", "Reduced motion"));
    const motion = button("", "button button--small", () =>
      callbacks.onToggleReducedMotion(),
    );
    motionRow.append(motion);

    const muteRow = el("div", "settings__row");
    muteRow.append(el("span", "settings__label", "Sound"));
    const muteToggle = button("", "button button--small", () =>
      callbacks.onMute(),
    );
    muteRow.append(muteToggle);
    settingsBlock.append(scaleRow, motionRow, muteRow);

    const controls = el("section", "pause__controls");
    controls.append(el("h3", "overlay__subheading", "Controls"));
    const list = el("dl", "hud__controls");
    for (const [label, keys] of rows) {
      list.append(el("dt", undefined, label), el("dd", undefined, keys));
    }
    controls.append(list);

    const hintSection = el("section", "pause__hint");
    hintSection.append(el("h3", "overlay__subheading", "Puzzle hint"));
    const hintText = el("p", "overlay__hint", "No hint requested yet.");
    const hintButton = button(
      "Show puzzle hint",
      "button button--small",
      () => callbacks.onPuzzleHint(),
    );
    hintButton.disabled = !snapshot?.puzzle?.canHint;
    hintSection.append(hintText, hintButton);

    const diag = el("section", "pause__diagnostics");
    diag.append(el("h3", "overlay__subheading", "Asset diagnostics"));
    diag.append(
      el(
        "p",
        "overlay__hint",
        `${diagnostics.total} logical IDs · ${diagnostics.placeholders} placeholder${
          diagnostics.placeholders === 1 ? "" : "s"
        } · ${diagnostics.modeLabel}`,
      ),
    );
    const warnings = el("ul", "hud__warnings");
    warnings.hidden = diagnostics.warnings.length === 0;
    warnings.append(
      ...diagnostics.warnings.map((warning) => el("li", undefined, warning)),
    );
    diag.append(warnings);

    body.append(settingsBlock, controls, hintSection, diag);

    const actions = el("div", "overlay__actions");
    actions.append(
      button("Resume", "button button--primary", () => callbacks.onResume()),
      ...(snapshot?.puzzle?.canReset
        ? [button("Reset puzzle", "button", () => callbacks.onResetPuzzle())]
        : []),
      button("Restart level", "button", () => callbacks.onNewRun()),
    );
    body.append(actions);
    node.dataset.autofocus = "true";

    const update = (next: RuntimeSnapshot): void => {
      for (const control of scaleControls) {
        const active =
          Math.abs(control.scale - next.settings.accessibility.textScale) < 0.01;
        control.node.dataset.active = String(active);
        control.node.setAttribute("aria-pressed", String(active));
      }
      const reduced = next.settings.accessibility.reducedMotion;
      motion.textContent = reduced ? "On" : "Off";
      motion.setAttribute("aria-pressed", String(reduced));
      muteToggle.textContent = next.muted ? "Unmute (M)" : "Mute (M)";
      hintText.textContent =
        next.puzzle?.hint ?? "No hint requested yet.";
      hintButton.disabled = !next.puzzle?.canHint;
    };
    update(snapshot);

    return { key: "pause", element: node, update };
  }

  function renderError(error: Error): Overlay {
    const { root: node, body } = panel("overlay--error", "Error", "Boot failed");
    body.append(el("pre", "hud__fatal-message", error.message));
    body.append(
      el(
        "p",
        "hud__fatal-hint",
        "Reload after fixing the pack, room, theme, or manifest.",
      ),
    );
    node.dataset.autofocus = "true";
    return { key: `error:${error.message}`, element: node };
  }

  function desiredOverlay(next: RuntimeSnapshot): Overlay | null {
    if (fatalError) return renderError(fatalError);
    if (next.state === "dialogue" && next.dialogue) {
      return renderDialogue(next.dialogue);
    }
    if (next.state === "gate" && next.gate) return renderGate(next.gate);
    if (next.state === "map") return renderMap(next);
    if (next.state === "conceptLog") return renderConceptLog(next);
    if (next.state === "debrief") return renderDebrief(next);
    if (next.state === "complete") return renderComplete(next);
    if (next.state === "pause") return renderPause(next);
    if (next.state === "error" && next.error) {
      return renderError(new Error(next.error));
    }
    return null;
  }

  /* ---------------------------------------------------------------- */
  /* HUD updates                                                      */
  /* ---------------------------------------------------------------- */

  function updateHud(next: RuntimeSnapshot): void {
    title.textContent = next.level.title;
    eyebrow.textContent = `M1 · ${next.level.id}`;
    objectiveRow.textContent = next.level.objectiveIds.length
      ? `Objectives: ${next.level.objectiveIds.join(", ")} · ${next.mode}${
          next.puzzle
            ? ` · ${next.puzzle.title}${next.puzzle.solved ? " ✓" : ""}`
            : ""
        }`
      : next.mode;
    const p1 = next.players.p1;
    const p2 = next.players.p2;
    const abilityLines = [
      `P1: ${p1.abilities.join(" · ")}${p1.carrying ? " (carrying)" : ""}`,
      p2.active
        ? `P2: ${p2.abilities.join(" · ")}${p2.carrying ? " (carrying)" : ""}`
        : "P2: resting · solo union",
    ];
    if (next.puzzle?.pulse) {
      const pulse = next.puzzle.pulse;
      abilityLines.push(
        pulse.remainingTicks > 0
          ? `Pulse: ${(Math.ceil(pulse.remainingTicks / 6) / 10).toFixed(1)}s`
          : "Pulse: ready",
      );
    }
    abilityRow.textContent = abilityLines.join("  |  ");
    if (next.puzzle?.hint) {
      hintRow.hidden = false;
      hintRow.textContent = `Hint: ${next.puzzle.hint}`;
    } else {
      hintRow.hidden = true;
      hintRow.textContent = "";
    }
    modeBadge.textContent = diagnostics.modeLabel;
    audioStatus.textContent = next.muted ? "Muted" : "Audio on";
    audioStatus.dataset.muted = String(next.muted);
    saveStatus.textContent = next.saveNotice ?? "Autosave ready";

    if (next.interaction) {
      prompt.hidden = false;
      promptKey.textContent = next.interaction.key ?? "E";
      promptText.textContent =
        next.interaction.kind === "gate"
          ? `Open ${next.interaction.label}`
          : next.interaction.kind === "dialogue"
            ? `Talk to ${next.interaction.label}`
            : next.interaction.label;
    } else {
      prompt.hidden = true;
    }

    if (next.toast) {
      toast.hidden = false;
      toast.textContent = next.toast;
    } else {
      toast.hidden = true;
      toast.textContent = "";
    }

    applySettings(next.settings);
  }

  return {
    update(next) {
      snapshot = next;
      updateHud(next);
      const wanted = desiredOverlay(next);
      if (wanted && overlay?.key === wanted.key) {
        overlay.update?.(next);
        return;
      }
      setOverlay(wanted);
    },

    applySettings,

    setDiagnostics(next) {
      diagnostics = next;
      modeBadge.textContent = next.modeLabel;
    },

    warn(message) {
      diagnostics = {
        ...diagnostics,
        warnings: [...diagnostics.warnings, message],
      };
      if (overlay?.key === "pause" && snapshot) {
        setOverlay(renderPause(snapshot));
      }
    },

    fatal(error) {
      fatalError = error;
      if (snapshot) {
        setOverlay(renderError(error));
      } else {
        overlayRoot.hidden = false;
        overlayRoot.replaceChildren(renderError(error).element);
      }
    },
  };
}
