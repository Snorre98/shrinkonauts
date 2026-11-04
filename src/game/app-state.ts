import type { PackCatalog, PackCatalogEntry } from "../pack";
import type { HubMode } from "../ui";
import {
  defaultInputPlan,
  type InputPlan,
} from "../world/intent-source";

export type AppPhase =
  | "boot"
  | "hub"
  | "loading"
  | "launching"
  | "playing"
  | "error";

export interface AppState {
  phase: AppPhase;
  catalog: PackCatalog;
  selectedPackId: string | null;
  mode: HubMode;
  inputPlan: InputPlan;
  busy: boolean;
  error: string | null;
  notice: string | null;
}

function firstAvailable(catalog: PackCatalog): string | null {
  return (
    catalog.packs.find((entry) => entry.status === "available")?.id ?? null
  );
}

export function createAppState(catalog: PackCatalog): AppState {
  return {
    phase: "boot",
    catalog,
    selectedPackId: firstAvailable(catalog),
    mode: "local",
    inputPlan: defaultInputPlan(),
    busy: false,
    error: null,
    notice: null,
  };
}

export function selectedPack(
  state: AppState,
): PackCatalogEntry | null {
  if (!state.selectedPackId) return null;
  return (
    state.catalog.packs.find((entry) => entry.id === state.selectedPackId) ??
    null
  );
}

export function selectPack(
  state: AppState,
  packId: string,
): AppState {
  const entry = state.catalog.packs.find((item) => item.id === packId);
  if (!entry || entry.status !== "available" || state.busy) {
    return state;
  }
  return { ...state, selectedPackId: packId, error: null, notice: null };
}

export function selectMode(state: AppState, mode: HubMode): AppState {
  if (state.busy) return state;
  return { ...state, mode, error: null, notice: null };
}

export function setInputPlan(
  state: AppState,
  plan: InputPlan,
): AppState {
  if (state.busy) return state;
  return { ...state, inputPlan: { ...plan }, error: null, notice: null };
}

export function beginStart(state: AppState): AppState {
  if (!selectedPack(state) || state.busy) return state;
  return { ...state, phase: "loading", busy: true, error: null, notice: null };
}

export function markLaunching(state: AppState): AppState {
  if (state.phase !== "loading") return state;
  return { ...state, phase: "launching" };
}

export function markPlaying(state: AppState): AppState {
  return {
    ...state,
    phase: "playing",
    busy: false,
    error: null,
    notice: null,
  };
}

export function markHub(state: AppState, notice: string | null = null): AppState {
  return {
    ...state,
    phase: "hub",
    busy: false,
    error: null,
    notice,
  };
}

export function markError(state: AppState, error: string): AppState {
  return { ...state, phase: "hub", busy: false, error, notice: null };
}

export function canStart(
  state: AppState,
  hasSave: boolean,
): { allowed: boolean; label: string; reason: string | null } {
  const entry = selectedPack(state);
  if (!entry) {
    return {
      allowed: false,
      label: "Start cycle",
      reason: "Choose an available cycle.",
    };
  }
  if (entry.status !== "available") {
    return {
      allowed: false,
      label: "Start cycle",
      reason: "This cycle is not installed yet.",
    };
  }
  if (state.busy) {
    return {
      allowed: false,
      label: state.phase === "loading" ? "Loading cycle…" : "Starting cycle…",
      reason: null,
    };
  }
  return {
    allowed: true,
    label: hasSave ? "Continue" : "Start cycle",
    reason: hasSave
      ? "Resume from the last checkpoint, or choose New cycle."
      : null,
  };
}
