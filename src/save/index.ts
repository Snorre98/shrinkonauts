import type { LearningEvent } from "../curriculum";
import type { ProgressionSnapshot } from "../progression";

export const SAVE_SCHEMA_VERSION = "1.0";
export const RUN_STORAGE_KEY = "shrinkonauts.run";
export const SETTINGS_STORAGE_KEY = "shrinkonauts.settings";

/** Structural copy of the audio module's storage seam, owned by save. */
export interface SaveAudioStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export type SaveStatus = "playing" | "debrief" | "complete";

export interface PlayerPositionSnapshot {
  x: number;
  y: number;
}

export interface RunSnapshot {
  schemaVersion: string;
  packId: string;
  packVersion: string;
  levelId: string;
  roomId: string;
  checkpointId: string | null;
  progression: ProgressionSnapshot;
  events: LearningEvent[];
  elapsed: number;
  savedAt: string;
  players: {
    p1: PlayerPositionSnapshot;
    p2: PlayerPositionSnapshot;
    activeP2: boolean;
  };
  status: SaveStatus;
  dialogue?: { dialogueId: string; nodeId: string };
}

export interface AudioSettingsSnapshot {
  muted: boolean;
  volume: number;
}

export interface AccessibilitySettings {
  textScale: number;
  reducedMotion: boolean;
}

export interface GameSettings {
  schemaVersion: string;
  audio: AudioSettingsSnapshot;
  accessibility: AccessibilitySettings;
}

export interface SaveStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem?(key: string): void;
}

export class MemorySaveStorage implements SaveStorage {
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

export function createBrowserSaveStorage(): SaveStorage | null {
  try {
    const storage = globalThis.localStorage;
    if (!storage) return null;
    return {
      getItem: (key) => storage.getItem(key),
      setItem: (key, value) => storage.setItem(key, value),
      removeItem: (key) => storage.removeItem(key),
    };
  } catch {
    return null;
  }
}

export function defaultSettings(): GameSettings {
  return {
    schemaVersion: SAVE_SCHEMA_VERSION,
    audio: { muted: false, volume: 0.7 },
    accessibility: { textScale: 1, reducedMotion: false },
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.max(minimum, Math.min(maximum, value));
}

function parseSettings(raw: string | null): GameSettings {
  const fallback = defaultSettings();
  if (!raw) return fallback;

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return fallback;
  }
  if (!isRecord(parsed)) return fallback;

  const audio = isRecord(parsed.audio) ? parsed.audio : {};
  const accessibility = isRecord(parsed.accessibility)
    ? parsed.accessibility
    : {};

  return {
    schemaVersion:
      typeof parsed.schemaVersion === "string"
        ? parsed.schemaVersion
        : SAVE_SCHEMA_VERSION,
    audio: {
      muted: audio.muted === true,
      volume: isFiniteNumber(audio.volume)
        ? clamp(audio.volume, 0, 1)
        : fallback.audio.volume,
    },
    accessibility: {
      textScale: isFiniteNumber(accessibility.textScale)
        ? clamp(accessibility.textScale, 0.8, 1.6)
        : fallback.accessibility.textScale,
      reducedMotion: accessibility.reducedMotion === true,
    },
  };
}

function isValidProgression(value: unknown): value is ProgressionSnapshot {
  return (
    isRecord(value) &&
    Array.isArray(value.abilities) &&
    isRecord(value.flags) &&
    Array.isArray(value.solvedGates) &&
    Array.isArray(value.revealedNodes) &&
    Array.isArray(value.revealedEdges)
  );
}

function validRun(
  value: unknown,
  packId?: string,
  packVersion?: string,
): value is RunSnapshot {
  if (!isRecord(value)) return false;
  if (
    typeof value.schemaVersion !== "string" ||
    !/^1\.\d+$/.test(value.schemaVersion)
  ) {
    return false;
  }
  if (typeof value.packId !== "string" || typeof value.levelId !== "string") {
    return false;
  }
  if (packId !== undefined && value.packId !== packId) return false;
  if (
    packVersion !== undefined &&
    typeof value.packVersion === "string" &&
    value.packVersion !== packVersion
  ) {
    return false;
  }
  if (!isValidProgression(value.progression)) return false;
  if (!Array.isArray(value.events)) return false;
  if (!isRecord(value.players)) return false;
  const p1 = value.players.p1;
  const p2 = value.players.p2;
  if (
    !isRecord(p1) ||
    !isRecord(p2) ||
    !isFiniteNumber(p1.x) ||
    !isFiniteNumber(p1.y) ||
    !isFiniteNumber(p2.x) ||
    !isFiniteNumber(p2.y)
  ) {
    return false;
  }
  return true;
}

export type RunLoadResult =
  | { ok: true; run: RunSnapshot }
  | {
      ok: false;
      reason:
        | "NO_SAVE"
        | "INVALID_SAVE"
        | "PACK_MISMATCH"
        | "VERSION_MISMATCH";
      message: string;
    };

export interface SaveModule {
  readonly settings: GameSettings;
  /** Adapter injected into the audio module so save owns persisted settings. */
  readonly audioStorage: SaveAudioStorage;
  saveSettings(settings: GameSettings): void;
  updateAudio(patch: Partial<AudioSettingsSnapshot>): GameSettings;
  updateAccessibility(patch: Partial<AccessibilitySettings>): GameSettings;
  saveRun(run: Omit<RunSnapshot, "savedAt"> & { savedAt?: string }): void;
  loadRun(packId?: string, packVersion?: string): RunLoadResult;
  hasRun(packId?: string, packVersion?: string): boolean;
  clearRun(): void;
  loadSettings(): GameSettings;
}

export interface CreateSaveOptions {
  storage?: SaveStorage | null;
  now?: () => Date;
}

export function createSave(options: CreateSaveOptions = {}): SaveModule {
  const storage =
    options.storage === undefined ? createBrowserSaveStorage() : options.storage;
  const now = options.now ?? (() => new Date());
  let settings = parseSettings(storage?.getItem(SETTINGS_STORAGE_KEY) ?? null);

  function persistSettings(): void {
    try {
      storage?.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
    } catch {
      // Storage may be disabled; the in-memory settings still work.
    }
  }

  const audioStorage: SaveAudioStorage = {
    getItem: () => JSON.stringify(settings.audio),
    setItem: (_key, value) => {
      try {
        const parsed: unknown = JSON.parse(value);
        if (
          isRecord(parsed) &&
          typeof parsed.muted === "boolean" &&
          isFiniteNumber(parsed.volume)
        ) {
          settings = {
            ...settings,
            audio: {
              muted: parsed.muted,
              volume: clamp(parsed.volume, 0, 1),
            },
          };
          persistSettings();
        }
      } catch {
        // Keep the previous settings on malformed audio writes.
      }
    },
  };

  function applySettings(next: GameSettings): GameSettings {
    settings = {
      schemaVersion: SAVE_SCHEMA_VERSION,
      audio: {
        muted: next.audio.muted === true,
        volume: clamp(next.audio.volume, 0, 1),
      },
      accessibility: {
        textScale: clamp(next.accessibility.textScale, 0.8, 1.6),
        reducedMotion: next.accessibility.reducedMotion === true,
      },
    };
    persistSettings();
    return settings;
  }

  function loadRun(
    packId?: string,
    packVersion?: string,
  ): RunLoadResult {
    let raw: string | null;
    try {
      raw = storage?.getItem(RUN_STORAGE_KEY) ?? null;
    } catch {
      return {
        ok: false,
        reason: "INVALID_SAVE",
        message: "save storage is unavailable",
      };
    }
    if (!raw) {
      return { ok: false, reason: "NO_SAVE", message: "no saved run" };
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return {
        ok: false,
        reason: "INVALID_SAVE",
        message: "saved run is not valid JSON",
      };
    }

    if (validRun(parsed, packId, packVersion)) {
      return { ok: true, run: parsed };
    }

    if (isRecord(parsed) && typeof parsed.packId === "string") {
      if (packId !== undefined && parsed.packId !== packId) {
        return {
          ok: false,
          reason: "PACK_MISMATCH",
          message: `save belongs to pack "${parsed.packId}"`,
        };
      }
      if (
        packVersion !== undefined &&
        typeof parsed.packVersion === "string" &&
        parsed.packVersion !== packVersion
      ) {
        return {
          ok: false,
          reason: "VERSION_MISMATCH",
          message: `save was made with pack version "${parsed.packVersion}"`,
        };
      }
    }

    return {
      ok: false,
      reason: "INVALID_SAVE",
      message: "saved run does not match the save schema",
    };
  }

  return {
    get settings() {
      return settings;
    },
    audioStorage,
    loadSettings() {
      settings = parseSettings(
        storage?.getItem(SETTINGS_STORAGE_KEY) ?? null,
      );
      return settings;
    },
    saveSettings(next) {
      applySettings(next);
    },
    updateAudio(patch) {
      return applySettings({
        ...settings,
        audio: { ...settings.audio, ...patch },
      });
    },
    updateAccessibility(patch) {
      return applySettings({
        ...settings,
        accessibility: { ...settings.accessibility, ...patch },
      });
    },
    saveRun(run) {
      try {
        storage?.setItem(
          RUN_STORAGE_KEY,
          JSON.stringify({ ...run, savedAt: now().toISOString() }),
        );
      } catch {
        // Autosave is best-effort; a failed write must not stop play.
      }
    },
    loadRun,
    hasRun(packId, packVersion) {
      return loadRun(packId, packVersion).ok;
    },
    clearRun() {
      try {
        storage?.removeItem?.(RUN_STORAGE_KEY);
      } catch {
        // Ignore.
      }
    },
  };
}

export function createAudioStorageAdapter(save: SaveModule): SaveAudioStorage {
  return save.audioStorage;
}
