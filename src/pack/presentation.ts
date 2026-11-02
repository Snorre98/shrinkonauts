import type {
  CameraFollowX,
  CameraFollowY,
  PresentationCameraConfig,
  PresentationRect,
  RoomDocument,
} from "./types";

/** The logical canvas space ADR-0070 authors the stage in. */
export const PRESENTATION_CANVAS = { width: 1280, height: 720 } as const;

export const DEFAULT_MAX_ZOOM = 2;
export const DEFAULT_CAMERA_PADDING = 0;

/**
 * Extra world pixels the camera view must keep beyond the tether span so a
 * player at either end is not flush against the stage edge.
 */
export const TETHER_VIEW_MARGIN = 64;

export interface MergedCameraSettings {
  framing?: PresentationCameraConfig["framing"];
  zoom?: PresentationCameraConfig["zoom"];
  maxZoom: number;
  followX: CameraFollowX;
  followY: CameraFollowY;
  padding: number;
  snap: boolean;
}

/** Pack-level camera values are defaults; room-level values win per field. */
export function mergeCameraSettings(
  packCamera: PresentationCameraConfig | undefined,
  roomCamera: PresentationCameraConfig | undefined,
): MergedCameraSettings {
  return {
    ...(roomCamera?.framing ?? packCamera?.framing
      ? { framing: roomCamera?.framing ?? packCamera?.framing }
      : {}),
    ...(roomCamera?.zoom ?? packCamera?.zoom
      ? { zoom: roomCamera?.zoom ?? packCamera?.zoom }
      : {}),
    maxZoom: roomCamera?.maxZoom ?? packCamera?.maxZoom ?? DEFAULT_MAX_ZOOM,
    followX: roomCamera?.followX ?? packCamera?.followX ?? "players",
    followY: roomCamera?.followY ?? packCamera?.followY ?? "players",
    padding:
      roomCamera?.padding ?? packCamera?.padding ?? DEFAULT_CAMERA_PADDING,
    snap: roomCamera?.snap ?? packCamera?.snap ?? false,
  };
}

/**
 * The solid-tile bounds are the default play band. A room whose collision grid
 * is only a border derives the whole room, which is the authored default from
 * ADR-0070. Returns null when the room has no solid tiles at all.
 */
export function derivePlayBand(room: RoomDocument): PresentationRect | null {
  let minX = Number.POSITIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;

  for (const [rowIndex, row] of room.layers.tiles.entries()) {
    for (const [columnIndex, tile] of [...row].entries()) {
      if (tile !== "#") continue;
      minX = Math.min(minX, columnIndex);
      minY = Math.min(minY, rowIndex);
      maxX = Math.max(maxX, columnIndex);
      maxY = Math.max(maxY, rowIndex);
    }
  }

  if (!Number.isFinite(minX) || !Number.isFinite(minY)) {
    return null;
  }
  return {
    x: minX,
    y: minY,
    width: maxX - minX + 1,
    height: maxY - minY + 1,
  };
}

export interface AutoZoomInput {
  stage: PresentationRect;
  playBand: PresentationRect;
  tileSize: number;
  padding: number;
  maxZoom: number;
  /** 0 or undefined means the room has no tether limit. */
  maxTetherLength?: number;
}

export type AutoZoomFailure = "PLAY_BAND_TOO_TALL" | "TETHER_UNSATISFIABLE";

export type AutoZoomResult =
  | { ok: true; zoom: number }
  | { ok: false; error: AutoZoomFailure };

export function zoomFitsPlayBand(
  stage: PresentationRect,
  playBand: PresentationRect,
  tileSize: number,
  padding: number,
  zoom: number,
): boolean {
  const available = stage.height - padding * 2;
  return playBand.height * tileSize * zoom <= available;
}

/**
 * Largest integer zoom that fits the play band vertically, respects the
 * configured cap, and keeps the whole tether span inside the stage width.
 */
export function autoZoomFor(input: AutoZoomInput): AutoZoomResult {
  const { stage, playBand, tileSize, padding, maxZoom } = input;
  const maxTetherLength = input.maxTetherLength ?? 0;

  if (!zoomFitsPlayBand(stage, playBand, tileSize, padding, 1)) {
    return { ok: false, error: "PLAY_BAND_TOO_TALL" };
  }

  const availableHeight = stage.height - padding * 2;
  const bandHeight = playBand.height * tileSize;
  const fitByHeight = Math.floor(availableHeight / bandHeight);
  const fitByTether =
    maxTetherLength > 0
      ? Math.floor(stage.width / (maxTetherLength + TETHER_VIEW_MARGIN))
      : Number.POSITIVE_INFINITY;

  if (fitByTether < 1) {
    return { ok: false, error: "TETHER_UNSATISFIABLE" };
  }

  return {
    ok: true,
    zoom: Math.max(1, Math.min(fitByHeight, fitByTether, maxZoom)),
  };
}
