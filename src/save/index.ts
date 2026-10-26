import type { LearningEvent } from "../curriculum";
import type { ProgressionSnapshot } from "../progression";
import type { PuzzleRunState } from "../puzzle";

export const RUN_SCHEMA_VERSION = "2.0";
export const SAVE_SCHEMA_VERSION = "2.0";
export const RUN_STORAGE_KEY = "shrinkonauts.run";
export const SETTINGS_STORAGE_KEY = "shrinkonauts.settings";

/** Structural copy of the audio module's storage seam, owned by save. */
export interface SaveAudioStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export type SaveStatus = "playing" | "debrief" | "complete";

export interface BodySnapshot {
  x: number;
  y: number;
  vx: number;
  vy: number;
  angle: number;
  angularVelocity: number;
  sleeping: boolean;
  /** Player-only controller timers; absent on prop body snapshots. */
  dashTime?: number;
  dashCooldown?: number;
}

export interface PropSnapshot {
  bodyId: string;
  state: "free" | "carried" | "placed" | "docked";
  carriedBy: "p1" | "p2" | null;
  placedOn: string | null;
}

export interface RunSnapshot {
  schemaVersion: string;
  packId: string;
  packVersion: string;
  contentVersion: string;
  levelId: string;
  roomId: string;
  checkpointId: string | null;
  progression: ProgressionSnapshot;
  events: LearningEvent[];
  elapsed: number;
  savedAt: string;
  status: SaveStatus;
  players: {
    activeP2: boolean;
    bodies: Record<"p1" | "p2", BodySnapshot>;
  };
  world: {
    bodies: Record<string, BodySnapshot>;
    props: Record<string, PropSnapshot>;
    puzzles: Record<string, PuzzleRunState>;
  };
  audio: { muted: boolean };
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

function isBodySnapshot(value: unknown): value is BodySnapshot {
  return (
    isRecord(value) &&
    isFiniteNumber(value.x) &&
    isFiniteNumber(value.y) &&
    isFiniteNumber(value.vx) &&
    isFiniteNumber(value.vy) &&
    isFiniteNumber(value.angle) &&
    isFiniteNumber(value.angularVelocity) &&
    typeof value.sleeping === "boolean"
  );
}

function isPropSnapshot(value: unknown): value is PropSnapshot {
  return (
    isRecord(value) &&
    typeof value.bodyId === "string" &&
    (value.state === "free" ||
      value.state === "carried" ||
      value.state === "placed" ||
      value.state === "docked") &&
    (value.carriedBy === null ||
      value.carriedBy === "p1" ||
      value.carriedBy === "p2") &&
    (value.placedOn === null || typeof value.placedOn === "string")
  );
}

function isPuzzleState(value: unknown): value is PuzzleRunState {
  return (
    isRecord(value) &&
    typeof value.puzzleId === "string" &&
    isFiniteNumber(value.tick) &&
    typeof value.solved === "boolean" &&
    isRecord(value.nodes) &&
    isRecord(value.counters) &&
    Array.isArray(value.pulses) &&
    (value.lastError === null || typeof value.lastError === "string")
  );
}

function isRunSnapshot(value: unknown): value is RunSnapshot {
  if (!isRecord(value)) return false;
  if (
    typeof value.schemaVersion !== "string" ||
    !/^2\.\d+$/.test(value.schemaVersion)
  ) {
    return false;
  }
  if (
    typeof value.packId !== "string" ||
    typeof value.packVersion !== "string" ||
    typeof value.contentVersion !== "string" ||
    typeof value.levelId !== "string" ||
    typeof value.roomId !== "string"
  ) {
    return false;
  }
  if (!isValidProgression(value.progression)) return false;
  if (!Array.isArray(value.events)) return false;
  if (value.status !== "playing" && value.status !== "debrief" && value.status !== "complete") {
    return false;
  }
  if (value.checkpointId !== null && typeof value.checkpointId !== "string") {
    return false;
  }

  if (!isRecord(value.players) || typeof value.players.activeP2 !== "boolean") {
    return false;
  }
  if (!isRecord(value.players.bodies)) return false;
  if (
    !isBodySnapshot(value.players.bodies.p1) ||
    !isBodySnapshot(value.players.bodies.p2)
  ) {
    return false;
  }

  if (!isRecord(value.world)) return false;
  if (!isRecord(value.world.bodies)) return false;
  for (const snapshot of Object.values(value.world.bodies)) {
    if (!isBodySnapshot(snapshot)) return false;
  }
  if (!isRecord(value.world.props)) return false;
  for (const snapshot of Object.values(value.world.props)) {
    if (!isPropSnapshot(snapshot)) return false;
  }
  if (!isRecord(value.world.puzzles)) return false;
  for (const snapshot of Object.values(value.world.puzzles)) {
    if (!isPuzzleState(snapshot)) return false;
  }

  if (!isRecord(value.audio) || typeof value.audio.muted !== "boolean") {
    return false;
  }
  return true;
}

export type RunLoadResult =
  | { ok: true; run: RunSnapshot }
  | {
      ok: false;
      reason: "NO_SAVE" | "INVALID_SAVE" | "PACK_MISMATCH";
      message: string;
    }
  | {
      ok: false;
      reason: "VERSION_MISMATCH";
      message: string;
      /** Present for a structurally valid v2 save that can reset to checkpoint. */
      run?: RunSnapshot;
    };

export interface SaveModule {
  readonly settings: GameSettings;
  /** Adapter injected into the audio module so save owns persisted settings. */
  readonly audioStorage: SaveAudioStorage;
  saveSettings(settings: GameSettings): void;
  updateAudio(patch: Partial<AudioSettingsSnapshot>): GameSettings;
  updateAccessibility(patch: Partial<AccessibilitySettings>): GameSettings;
  saveRun(run: Omit<RunSnapshot, "savedAt"> & { savedAt?: string }): void;
  loadRun(
    packId?: string,
    packVersion?: string,
    contentVersion?: string,
  ): RunLoadResult;
  hasRun(
    packId?: string,
    packVersion?: string,
    contentVersion?: string,
  ): boolean;
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
    contentVersion?: string,
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

    if (isRunSnapshot(parsed)) {
      if (packId !== undefined && parsed.packId !== packId) {
        return {
          ok: false,
          reason: "PACK_MISMATCH",
          message: `save belongs to pack "${parsed.packId}"`,
        };
      }
      const packChanged =
        packVersion !== undefined && parsed.packVersion !== packVersion;
      const contentChanged =
        contentVersion !== undefined &&
        parsed.contentVersion !== contentVersion;
      if (packChanged || contentChanged) {
        return {
          ok: false,
          reason: "VERSION_MISMATCH",
          message: "Content updated — resumed from checkpoint",
          run: parsed,
        };
      }
      return { ok: true, run: parsed };
    }

    if (
      isRecord(parsed) &&
      typeof parsed.schemaVersion === "string" &&
      /^1\.\d+$/.test(parsed.schemaVersion)
    ) {
      return {
        ok: false,
        reason: "VERSION_MISMATCH",
        message: "Save format updated — level restarted",
      };
    }

    if (
      isRecord(parsed) &&
      typeof parsed.schemaVersion === "string" &&
      /^2\.\d+$/.test(parsed.schemaVersion)
    ) {
      return {
        ok: false,
        reason: "INVALID_SAVE",
        message: "saved run does not match the save schema",
      };
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
    hasRun(packId, packVersion, contentVersion) {
      return loadRun(packId, packVersion, contentVersion).ok;
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
