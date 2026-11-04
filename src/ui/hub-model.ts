import type { PackAvailability } from "../pack";
import type { PlayerId, SettingsView } from "./model";

export type HubMode = "solo" | "local";
export type HubPhase = "loading" | "hub" | "starting" | "playing" | "error";
export type HubInputSource = "keyboard" | "controller";

export interface HubPackView {
  id: string;
  title: string;
  subtitle: string | null;
  description: string | null;
  status: PackAvailability;
  selected: boolean;
  hasSave: boolean;
  /** Optional decorative 16×16 cycle icon resolved from the theme. */
  iconSrc?: string;
}

export interface HubControllerSlotView {
  slot: PlayerId;
  label: string;
  roomCode: string;
  url: string;
  status: "waiting" | "connected" | "ready" | "closed" | "error";
  statusLabel: string;
  message: string | null;
}

export interface HubControllerView {
  roomCode: string;
  status: "preparing" | "waiting" | "ready" | "error";
  message: string | null;
  slots: HubControllerSlotView[];
}

export interface HubView {
  phase: HubPhase;
  title: string;
  subtitle: string;
  packs: HubPackView[];
  selectedPackId: string | null;
  mode: HubMode;
  inputPlan: Record<PlayerId, HubInputSource>;
  controller: HubControllerView | null;
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
  onInputSourceChange(slot: PlayerId, source: HubInputSource): void;
  onStart(): void;
  onNewCycle(): void;
  onMute(): void;
  onTextScale(scale: number): void;
  onToggleReducedMotion(): void;
}
