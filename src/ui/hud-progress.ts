import type { FeedbackBeat } from "../feedback";

export interface HudProgress {
  element: HTMLElement;
  update(beats: readonly FeedbackBeat[]): void;
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

/**
 * Compact header checklist. It keeps the `.feedback-beats__item` class and
 * `aria-current="step"` on the active beat so existing tests and assistive
 * technology keep the same contract after the beats move out of the feedback
 * renderer.
 */
export function mountHudProgress(): HudProgress {
  const section = el("section", "hud__progress");
  section.id = "feedback-beats";
  section.setAttribute("aria-label", "Puzzle progress");
  const header = el("div", "hud__progress-header");
  const title = el("h3", "feedback-beats__title", "Progress");
  const count = el("span", "hud__progress-count", "0/0");
  header.append(title, count);
  const list = el("ol", "feedback-beats__list");
  section.append(header, list);

  let signature = "";

  function update(beats: readonly FeedbackBeat[]): void {
    section.hidden = beats.length === 0;
    if (beats.length === 0) {
      count.textContent = "0/0";
      if (signature !== "") {
        signature = "";
        list.replaceChildren();
      }
      return;
    }

    const done = beats.filter((beat) => beat.state === "done").length;
    count.textContent = `${done}/${beats.length}`;
    const nextSignature = beats
      .map((beat) => `${beat.id}:${beat.state}:${beat.label}`)
      .join("|");
    if (nextSignature === signature) return;
    signature = nextSignature;

    list.replaceChildren(
      ...beats.map((beat) => {
        const item = el("li", "feedback-beats__item", beat.label);
        item.dataset.state = beat.state;
        if (beat.state === "active") {
          item.setAttribute("aria-current", "step");
        }
        return item;
      }),
    );
  }

  return { element: section, update };
}
