/** Shown when a player selects a phone slot while the browser reports offline. */
export const OFFLINE_PHONE_MESSAGE =
  "Phone controllers need an internet connection. Switch this player to Keyboard, or reconnect and try again.";

/** Browser-independent PWA surface consumed by the game shell. */
export interface PwaSnapshot {
  /** True when service-worker registration is available in this build. */
  supported: boolean;
  online: boolean;
  offlineReady: boolean;
  needRefresh: boolean;
  canInstall: boolean;
  installed: boolean;
  installHint: string | null;
}

export interface PwaPort {
  snapshot(): PwaSnapshot;
  subscribe(listener: () => void): () => void;
  promptInstall(): Promise<void>;
  applyUpdate(): Promise<void>;
}
