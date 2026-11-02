import {
  autoZoomFor,
  derivePlayBand,
  mergeCameraSettings,
  zoomFitsPlayBand,
} from "../pack/presentation";
import type {
  CameraFollowX,
  CameraFollowY,
  PresentationConfig,
  PresentationRect,
  RoomDocument,
  RoomPresentationConfig,
} from "../pack/types";

export interface ViewportLike {
  width: number;
  height: number;
}

/** The resolved framing the renderer and camera math share. */
export interface ResolvedPresentation {
  stage: PresentationRect;
  playBand: PresentationRect;
  zoom: number;
  followX: CameraFollowX;
  followY: CameraFollowY;
  padding: number;
  maxZoom: number;
  snap: boolean;
}

export interface RoomPresentationInput {
  pack?: PresentationConfig;
  room?: RoomPresentationConfig;
  /** 0 or undefined means the room has no tether limit. */
  maxTetherLength?: number;
}

export interface ResolvePresentationInput {
  viewport: ViewportLike;
  room: RoomDocument;
  packPresentation?: PresentationConfig;
  roomPresentation?: RoomPresentationConfig;
  /** 0 or undefined means the room has no tether limit. */
  maxTetherLength?: number;
}

function assertStageInsideViewport(
  stage: PresentationRect,
  viewport: ViewportLike,
): void {
  if (
    stage.x < 0 ||
    stage.y < 0 ||
    stage.width <= 0 ||
    stage.height <= 0 ||
    stage.x + stage.width > viewport.width ||
    stage.y + stage.height > viewport.height
  ) {
    throw new Error(
      `PRESENTATION_STAGE_OUT_OF_BOUNDS: ${stage.x},${stage.y} ${stage.width}×${stage.height} is outside the ${viewport.width}×${viewport.height} canvas`,
    );
  }
}

/**
 * Resolves pack defaults + room overrides into the concrete stage, play band,
 * and integer camera zoom. Missing configuration reproduces the old behaviour:
 * full-viewport stage, zoom 1, follow players on both axes.
 */
export function resolvePresentation(
  input: ResolvePresentationInput,
): ResolvedPresentation {
  const { viewport, room } = input;
  const stage = input.packPresentation?.stage ?? {
    x: 0,
    y: 0,
    width: viewport.width,
    height: viewport.height,
  };
  assertStageInsideViewport(stage, viewport);

  const camera = mergeCameraSettings(
    input.packPresentation?.camera,
    input.roomPresentation?.camera,
  );

  if (!Number.isInteger(camera.maxZoom) || camera.maxZoom < 1) {
    throw new Error(
      "PRESENTATION_MAX_ZOOM_INVALID: maxZoom must be an integer >= 1",
    );
  }
  if (!Number.isFinite(camera.padding) || camera.padding < 0) {
    throw new Error("PRESENTATION_PADDING_INVALID: padding must be >= 0");
  }

  const explicitPlayBand = input.roomPresentation?.playBand;
  const derivedPlayBand = derivePlayBand(room);
  const needsPlayBand =
    camera.framing === "fit-play-band" || camera.zoom === "auto";

  if (needsPlayBand && !explicitPlayBand && !derivedPlayBand) {
    throw new Error(
      "PRESENTATION_PLAY_BAND_REQUIRED: fit-play-band needs a playBand or solid tiles",
    );
  }

  const playBand =
    explicitPlayBand ??
    derivedPlayBand ?? {
      x: 0,
      y: 0,
      width: room.width,
      height: room.height,
    };

  const autoZoom =
    camera.zoom === "auto" ||
    (camera.zoom === undefined && camera.framing === "fit-play-band");

  let zoom: number;
  if (autoZoom) {
    const result = autoZoomFor({
      stage,
      playBand,
      tileSize: room.tileSize,
      padding: camera.padding,
      maxZoom: camera.maxZoom,
      maxTetherLength: input.maxTetherLength ?? 0,
    });
    if (!result.ok) {
      throw new Error(
        result.error === "PLAY_BAND_TOO_TALL"
          ? "PRESENTATION_PLAY_BAND_TOO_TALL: the play band does not fit the stage at zoom 1"
          : "PRESENTATION_TETHER_UNSATISFIABLE: the stage is narrower than the tether span",
      );
    }
    zoom = result.zoom;
  } else {
    const explicitZoom = typeof camera.zoom === "number";
    zoom = typeof camera.zoom === "number" ? camera.zoom : 1;
    if (!Number.isInteger(zoom) || zoom < 1) {
      throw new Error(
        "PRESENTATION_ZOOM_INVALID: zoom must be an integer >= 1 or \"auto\"",
      );
    }
    if (
      explicitZoom &&
      !zoomFitsPlayBand(
        stage,
        playBand,
        room.tileSize,
        camera.padding,
        zoom,
      )
    ) {
      throw new Error(
        "PRESENTATION_PLAY_BAND_TOO_TALL: the play band does not fit the stage at the chosen zoom",
      );
    }
  }

  return {
    stage: { ...stage },
    playBand: { ...playBand },
    zoom,
    followX: camera.followX,
    followY: camera.followY,
    padding: camera.padding,
    maxZoom: camera.maxZoom,
    snap: camera.snap,
  };
}

export interface CameraViewLike {
  width: number;
  height: number;
  zoom: number;
  scrollX: number;
  scrollY: number;
}

export interface CameraWorldView {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * The visible world rect for a camera viewport. Phaser keeps the world view
 * centred inside the screen-space viewport when zoom > 1, so `scrollX/Y` is not
 * the world-view origin.
 */
export function cameraWorldView(camera: CameraViewLike): CameraWorldView {
  const zoom = camera.zoom > 0 ? camera.zoom : 1;
  const width = camera.width / zoom;
  const height = camera.height / zoom;
  return {
    x: camera.scrollX + (camera.width - width) / 2,
    y: camera.scrollY + (camera.height - height) / 2,
    width,
    height,
  };
}

/**
 * Converts the simulation's world-view origin into Phaser's scroll origin.
 * At zoom 1 the offset is zero, so existing rooms keep their exact camera.
 */
export function cameraScrollForView(
  presentation: Pick<ResolvedPresentation, "stage" | "zoom">,
  camera: { x: number; y: number },
): { x: number; y: number } {
  const viewWidth = presentation.stage.width / presentation.zoom;
  const viewHeight = presentation.stage.height / presentation.zoom;
  return {
    x: camera.x - (presentation.stage.width - viewWidth) / 2,
    y: camera.y - (presentation.stage.height - viewHeight) / 2,
  };
}
