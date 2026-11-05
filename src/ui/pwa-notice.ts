/**
 * Pure hub notice selection. Kept separate from `hub-ui.ts` so the display
 * priority can be unit tested without a DOM.
 */

export type PwaNotice = "update" | "offline" | "ready" | "install" | null;

export interface PwaNoticeInput {
  online: boolean;
  offlineReady: boolean;
  needRefresh: boolean;
  canInstall: boolean;
  installed: boolean;
  installHint: string | null;
}

export const OFFLINE_NOTICE =
  "Offline — solo and keyboard co-op are available.";

/**
 * One notice at a time. Updates take priority, then the offline state, then
 * the one-shot offline-ready confirmation, then installation.
 */
export function pwaNotice(input: PwaNoticeInput): PwaNotice {
  if (input.needRefresh) return "update";
  if (!input.online) return "offline";
  if (input.offlineReady) return "ready";
  if (!input.installed && (input.canInstall || input.installHint)) {
    return "install";
  }
  return null;
}

export function pwaNoticeText(input: PwaNoticeInput): string | null {
  switch (pwaNotice(input)) {
    case "update":
      return "A new version is ready.";
    case "offline":
      return OFFLINE_NOTICE;
    case "ready":
      return "Ready to play offline.";
    case "install":
      return (
        input.installHint ??
        "Install Shrinkonauts for a full-screen, offline-capable app."
      );
    default:
      return null;
  }
}
