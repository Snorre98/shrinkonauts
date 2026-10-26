import type { AssetId } from "../assets";

export type BackgroundFit = "cover" | "tile" | "stretch" | "contain";

export type BackgroundBlend = "normal" | "add" | "multiply" | "screen";

export interface RoomBackgroundLayer {
  assetId: AssetId;
  depth: number;
  parallaxX: number;
  parallaxY: number;
  fit: BackgroundFit;
  tint?: string;
  opacity?: number;
  blend?: BackgroundBlend;
}

export interface RoomSpawn {
  x: number;
  y: number;
}

export interface RoomDocument {
  schemaVersion: string;
  id: string;
  title: string;
  width: number;
  height: number;
  tileSize: number;
  tileset: AssetId;
  layers: {
    tiles: string[];
  };
  background: {
    id: AssetId;
    layers: RoomBackgroundLayer[];
  };
  spawns: {
    player1: RoomSpawn;
    player2: RoomSpawn;
  };
  music?: AssetId;
  ambience?: AssetId;
}

export interface ThemePalette {
  bg: string;
  bone: string;
  boneShadow: string;
  nerve: string;
  nerveGlow: string;
  joint: string;
  muscle: string;
  text: string;
  muted: string;
  accent: string;
  danger: string;
}

export interface ThemeFonts {
  ui: string;
  display: string;
}

export interface ThemeDocument {
  schemaVersion: string;
  id: string;
  palette: ThemePalette;
  fonts: ThemeFonts;
  ui: {
    radius: number;
    border: number;
    fontScale: number;
    reducedMotion: boolean;
    assets: Record<string, AssetId>;
  };
  audio?: {
    music?: AssetId;
    cues?: Record<string, AssetId>;
  };
}
