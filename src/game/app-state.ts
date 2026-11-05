import type { PackCatalog, PackCatalogEntry } from "../pack";
import type { HubMode } from "../ui";
import {
  defaultInputPlan,
  phoneSlotsForPlan,
  type InputPlan,
  type PlayerSlot,
} from "../world/intent-source";
import type { HostRunState } from "./host-run-port";

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
  if (
    state.inputPlan.p1 === plan.p1 &&
    state.inputPlan.p2 === plan.p2
  ) {
    return state;
  }
  return { ...state, inputPlan: { ...plan }, error: null, notice: null };
}

export function resetInputPlan(state: AppState): AppState {
  return { ...state, inputPlan: defaultInputPlan() };
}

export interface ControllerGateInput {
  state: HostRunState | null;
  missingSlots: readonly PlayerSlot[];
  error: string | null;
}

export interface StartGate {
  allowed: boolean;
  reason: string | null;
}

function slotNames(slots: readonly PlayerSlot[]): string {
  if (slots.length === 0) return "the phones";
  return slots.map((slot) => slot.toUpperCase()).join(" and ");
}

/**
 * The phone part of the hub Start gate. Returns null when the plan is K/K and
 * the run has no network dependency.
 */
export function phoneStartGate(
  plan: InputPlan,
  controller: ControllerGateInput | null,
): StartGate | null {
  if (phoneSlotsForPlan(plan).length === 0) return null;
  if (controller?.error) {
    return {
      allowed: false,
      reason: `Phone controllers are unavailable: ${controller.error}`,
    };
  }
  if (!controller || controller.state === null) {
    return { allowed: false, reason: "Preparing the phone room…" };
  }
  if (controller.state === "ended") {
    return {
      allowed: false,
      reason:
        "The phone room ended. Choose Keyboard for the phone slot or select Phone again.",
    };
  }
  if (controller.state === "controllers-ready") {
    return controller.missingSlots.length === 0
      ? { allowed: true, reason: null }
      : {
          allowed: false,
          reason: `Waiting for ${slotNames(controller.missingSlots)} to become ready.`,
        };
  }
  if (controller.state === "active") {
    return {
      allowed: false,
      reason: "The phone session is already active.",
    };
  }
  if (controller.missingSlots.length > 0) {
    return {
      allowed: false,
      reason: `Waiting for ${slotNames(controller.missingSlots)} to connect and become ready.`,
    };
  }
  return {
    allowed: false,
    reason: "Waiting for the phone controllers to become ready.",
  };
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
  gate: StartGate | null = null,
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
  if (gate && !gate.allowed) {
    return {
      allowed: false,
      label: "Start cycle",
      reason: gate.reason,
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
