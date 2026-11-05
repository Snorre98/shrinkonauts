import { registerSW } from "virtual:pwa-register";
import type { PwaPort, PwaSnapshot } from "../game/pwa-port";
import {
  installHintFor,
  isIosDevice,
  isStandaloneMode,
  type PwaEnvironment,
} from "./pwa-model";

interface BeforeInstallPromptEvent extends Event {
  readonly userChoice: Promise<{
    outcome: "accepted" | "dismissed";
    platform: string;
  }>;
  prompt(): Promise<void>;
}

export interface CreatePwaOptions {
  /** The controller page does not offer installation; the browser menu still does. */
  enableInstallPrompt?: boolean;
  /** Disable the periodic service-worker update check. */
  enableUpdateChecks?: boolean;
}

const UPDATE_CHECK_INTERVAL_MS = 60 * 60 * 1000;
const OFFLINE_READY_DISPLAY_MS = 12_000;

function emptySnapshot(): PwaSnapshot {
  return {
    supported: false,
    online: true,
    offlineReady: false,
    needRefresh: false,
    canInstall: false,
    installed: false,
    installHint: null,
  };
}

export function createNoopPwaController(): PwaPort {
  const state = emptySnapshot();
  return {
    snapshot: () => ({ ...state }),
    subscribe: () => () => {},
    promptInstall: async () => {},
    applyUpdate: async () => {},
  };
}

function environment(): PwaEnvironment {
  const standalone =
    (navigator as Navigator & { standalone?: boolean }).standalone === true;
  const displayModeStandalone =
    typeof window.matchMedia === "function" &&
    window.matchMedia("(display-mode: standalone)").matches;
  return {
    userAgent: navigator.userAgent,
    standalone,
    displayModeStandalone,
    maxTouchPoints: navigator.maxTouchPoints,
  };
}

/**
 * Browser PWA adapter: registration, install prompt, connectivity, and the
 * prompt-based update handshake from `vite-plugin-pwa`.
 */
export function createPwaController(
  options: CreatePwaOptions = {},
): PwaPort {
  if (
    !import.meta.env.PROD ||
    typeof window === "undefined" ||
    typeof navigator === "undefined" ||
    !("serviceWorker" in navigator)
  ) {
    return createNoopPwaController();
  }

  const enableInstallPrompt = options.enableInstallPrompt !== false;
  const enableUpdateChecks = options.enableUpdateChecks !== false;
  const initialEnvironment = environment();
  const standalone = isStandaloneMode(initialEnvironment);

  let state: PwaSnapshot = {
    ...emptySnapshot(),
    supported: true,
    online: navigator.onLine,
    installed: standalone,
    installHint: enableInstallPrompt
      ? installHintFor(initialEnvironment)
      : null,
  };
  const listeners = new Set<() => void>();
  let deferredPrompt: BeforeInstallPromptEvent | null = null;
  let registration: ServiceWorkerRegistration | null = null;
  let updateInterval: number | null = null;
  let offlineReadyTimer: number | null = null;

  function notify(): void {
    for (const listener of listeners) listener();
  }

  function set(patch: Partial<PwaSnapshot>): void {
    state = { ...state, ...patch };
    notify();
  }

  const updateServiceWorker = registerSW({
    immediate: false,
    onOfflineReady: () => {
      set({ offlineReady: true });
      if (offlineReadyTimer !== null) {
        window.clearTimeout(offlineReadyTimer);
      }
      offlineReadyTimer = window.setTimeout(() => {
        offlineReadyTimer = null;
        set({ offlineReady: false });
      }, OFFLINE_READY_DISPLAY_MS);
    },
    onNeedRefresh: () => {
      set({ needRefresh: true });
    },
    onRegisteredSW: (_swUrl, registered) => {
      registration = registered ?? null;
      if (!enableUpdateChecks || !registration) return;
      if (updateInterval !== null) {
        window.clearInterval(updateInterval);
      }
      updateInterval = window.setInterval(() => {
        if (navigator.onLine) {
          void registration?.update().catch(() => {
            // Update checks are best-effort; the current shell keeps working.
          });
        }
      }, UPDATE_CHECK_INTERVAL_MS);
    },
    onRegisterError: (error) => {
      console.warn("[shrinkonauts] service worker registration failed", error);
      set({ supported: false });
    },
  });

  function handleInstallPrompt(event: Event): void {
    const installEvent = event as BeforeInstallPromptEvent;
    installEvent.preventDefault();
    deferredPrompt = installEvent;
    set({ canInstall: true });
  }

  function handleInstalled(): void {
    deferredPrompt = null;
    set({ installed: true, canInstall: false, installHint: null });
  }

  function handleOnline(): void {
    set({ online: true });
  }

  function handleOffline(): void {
    set({ online: false });
  }

  function handleVisibility(): void {
    if (!enableUpdateChecks || document.visibilityState !== "visible") return;
    if (!navigator.onLine) return;
    void registration?.update().catch(() => {
      // The current shell is still usable; the next reload retries.
    });
  }

  if (enableInstallPrompt) {
    window.addEventListener("beforeinstallprompt", handleInstallPrompt);
    window.addEventListener("appinstalled", handleInstalled);
  }
  window.addEventListener("online", handleOnline);
  window.addEventListener("offline", handleOffline);
  document.addEventListener("visibilitychange", handleVisibility);

  // Installed apps are the safest home for local saves. Request persistence
  // only in standalone mode so Firefox does not show an unexpected prompt.
  const storage = navigator.storage;
  if (standalone && storage?.persist) {
    void storage.persist().catch(() => {
      // Persistence is best-effort; saves remain in localStorage.
    });
  }

  // Surface the iOS hint only in Safari, never in an installed window.
  if (enableInstallPrompt && !state.installed) {
    const hint = installHintFor(environment());
    if (hint !== state.installHint) set({ installHint: hint });
  }

  return {
    snapshot: () => ({ ...state }),
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    async promptInstall() {
      const prompt = deferredPrompt;
      if (!prompt) return;
      deferredPrompt = null;
      set({ canInstall: false });
      try {
        await prompt.prompt();
        await prompt.userChoice;
      } catch (error) {
        console.warn("[shrinkonauts] install prompt failed", error);
      }
    },
    async applyUpdate() {
      await updateServiceWorker();
    },
  };
}

/** Exposed for diagnostics and focused tests without touching the DOM. */
export { isIosDevice, isStandaloneMode };
