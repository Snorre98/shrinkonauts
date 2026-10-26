import type { AudioStorage } from "./types";

export const AUDIO_STORAGE_KEY = "shrinkonauts.audio";

/**
 * In-memory storage for tests and headless runs. It deliberately stores strings
 * so it behaves exactly like localStorage from the audio module's perspective.
 */
export class MemoryAudioStorage implements AudioStorage {
  private readonly values = new Map<string, string>();

  constructor(initial: Record<string, string> = {}) {
    for (const [key, value] of Object.entries(initial)) {
      this.values.set(key, value);
    }
  }

  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.values.set(key, value);
  }

  removeItem(key: string): void {
    this.values.delete(key);
  }
}

/**
 * Audio settings are browser-local adapter state, not save state. Access is
 * guarded because private browsing and disabled storage can throw.
 */
export function createBrowserAudioStorage(): AudioStorage | null {
  try {
    if (typeof localStorage === "undefined") {
      return null;
    }
    // Probe once so a throwing storage implementation fails here, not on the
    // first mute toggle.
    localStorage.getItem(AUDIO_STORAGE_KEY);
    return localStorage;
  } catch {
    return null;
  }
}
