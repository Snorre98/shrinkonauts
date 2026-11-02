import type { AssetId, AssetManifest } from "../assets";
import type { RoomBackgroundLayer, ThemeDocument } from "../pack";

export interface HubPoint {
  x: number;
  y: number;
}

export interface HubRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface HubMachine {
  /** Final-art machine body; procedural fallback is used until art exists. */
  body: AssetId;
  door: AssetId;
  drum: AssetId;
  /** World position of the machine's feet/base. */
  x: number;
  y: number;
  scale: number;
  /** Control-panel/screen rectangle in world coordinates. */
  screen: HubRect;
  /** Blank nameplate rectangle on the final machine body. */
  nameplate?: HubRect;
  doorAnchor: HubPoint;
  drumAnchor: HubPoint;
}

export type HubOrigin =
  | "top-left"
  | "top-center"
  | "center"
  | "bottom-left"
  | "bottom-center";

export interface HubDressingEntry {
  assetId: AssetId;
  x: number;
  y: number;
  scale?: number;
  origin?: HubOrigin;
  depth?: number;
}

export interface HubCartridgeSlot {
  anatomy: AssetId;
  silicon: AssetId;
  x: number;
  y: number;
  scale?: number;
  origin?: HubOrigin;
  depth?: number;
}

export interface HubDressing {
  logo?: HubDressingEntry;
  poster?: HubDressingEntry;
  props?: HubDressingEntry[];
  cartridge?: HubCartridgeSlot;
}

export interface HubPlayer {
  civilian: AssetId;
  astronaut: AssetId;
  idle: HubPoint;
  entry: HubPoint;
  exit: HubPoint;
  scale: number;
  tinyScale: number;
}

export interface HubAudio {
  click: AssetId;
  door: AssetId;
  spin: AssetId;
  shrink: AssetId;
  arrive: AssetId;
  hum?: AssetId;
}

export interface HubIntro {
  minDurationMs: number;
  reducedMotionMs: number;
  skipAfterMs: number;
}

export interface HubDocument {
  schemaVersion: string;
  id: string;
  title: string;
  theme: string;
  assetManifests: {
    placeholder?: string;
    final?: string;
  };
  width: number;
  height: number;
  background: {
    layers: RoomBackgroundLayer[];
  };
  machine: HubMachine;
  player: HubPlayer;
  audio: HubAudio;
  intro: HubIntro;
  dressing?: HubDressing;
}

export interface LoadedHubContent {
  hub: HubDocument;
  theme: ThemeDocument;
  placeholderManifest: AssetManifest | null;
  finalManifest: AssetManifest | null;
  warnings: string[];
}
