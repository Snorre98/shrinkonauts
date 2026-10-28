import type { PackAvailability } from "../pack";
import type { SettingsView } from "./model";

export type HubMode = "solo" | "local" | "online";
export type HubPhase = "loading" | "hub" | "starting" | "playing" | "error";

export interface HubPackView {
  id: string;
  title: string;
  subtitle: string | null;
  description: string | null;
  status: PackAvailability;
  online: boolean;
  selected: boolean;
  hasSave: boolean;
}

export interface HubOnlineView {
  available: boolean;
  reason: string;
}

export interface HubView {
  phase: HubPhase;
  title: string;
  subtitle: string;
  packs: HubPackView[];
  selectedPackId: string | null;
  mode: HubMode;
  online: HubOnlineView;
  startLabel: string;
  startDisabled: boolean;
  startReason: string | null;
  /** True when the selected cycle has progress that "New cycle" would erase. */
  canStartNew: boolean;
  busy: boolean;
  notice: string | null;
  error: string | null;
  settings: SettingsView;
  assetMode: string;
}

export interface HubCallbacks {
  onSelectPack(packId: string): void;
  onModeChange(mode: HubMode): void;
  onStart(): void;
  onNewCycle(): void;
  onMute(): void;
  onTextScale(scale: number): void;
  onToggleReducedMotion(): void;
}
