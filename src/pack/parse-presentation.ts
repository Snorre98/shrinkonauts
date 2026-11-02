import { err, ok, type Result } from "../core/result";
import { isFiniteNumber, isRecord } from "./parse-common";
import { PRESENTATION_CANVAS } from "./presentation";
import type {
  CameraFollowX,
  CameraFollowY,
  PresentationCameraConfig,
  PresentationConfig,
  PresentationRect,
  RoomPresentationConfig,
} from "./types";

const FRAMINGS = ["fit-play-band"] as const;
const FOLLOW_X = ["players", "p1", "p2"] as const;
const FOLLOW_Y = ["play-band", "players"] as const;

interface RectOptions {
  integer?: boolean;
  bounds?: { width: number; height: number };
  boundsLabel?: string;
}

function parseRect(
  value: unknown,
  code: string,
  label: string,
  options: RectOptions = {},
): Result<PresentationRect> {
  if (!isRecord(value)) {
    return err(`${code}: ${label} must be an object`);
  }

  const x = value.x;
  const y = value.y;
  const width = value.width;
  const height = value.height;

  if (!isFiniteNumber(x)) {
    return err(`${code}: ${label}.x must be a finite number`);
  }
  if (!isFiniteNumber(y)) {
    return err(`${code}: ${label}.y must be a finite number`);
  }
  if (!isFiniteNumber(width)) {
    return err(`${code}: ${label}.width must be a finite number`);
  }
  if (!isFiniteNumber(height)) {
    return err(`${code}: ${label}.height must be a finite number`);
  }
  if (options.integer) {
    if (!Number.isInteger(x)) {
      return err(`${code}: ${label}.x must be an integer`);
    }
    if (!Number.isInteger(y)) {
      return err(`${code}: ${label}.y must be an integer`);
    }
    if (!Number.isInteger(width)) {
      return err(`${code}: ${label}.width must be an integer`);
    }
    if (!Number.isInteger(height)) {
      return err(`${code}: ${label}.height must be an integer`);
    }
  }

  const rect: PresentationRect = { x, y, width, height };

  if (rect.x < 0 || rect.y < 0) {
    return err(`${code}: ${label}.x and ${label}.y must be >= 0`);
  }
  if (rect.width <= 0 || rect.height <= 0) {
    return err(`${code}: ${label}.width and ${label}.height must be positive`);
  }

  if (options.bounds) {
    const maxWidth = options.bounds.width;
    const maxHeight = options.bounds.height;
    if (rect.x + rect.width > maxWidth || rect.y + rect.height > maxHeight) {
      return err(
        `${code}: ${label} must stay inside ${options.boundsLabel ?? `${maxWidth}×${maxHeight}`}`,
      );
    }
  }

  return ok(rect);
}

function parseCamera(
  value: unknown,
  code: string,
  label: string,
): Result<PresentationCameraConfig | undefined> {
  if (value === undefined) {
    return ok(undefined);
  }
  if (!isRecord(value)) {
    return err(`${code}: ${label} must be an object`);
  }

  const camera: PresentationCameraConfig = {};

  if (value.framing !== undefined) {
    if (!FRAMINGS.includes(value.framing as (typeof FRAMINGS)[number])) {
      return err(`${code}: ${label}.framing must be "fit-play-band"`);
    }
    camera.framing = value.framing as PresentationCameraConfig["framing"];
  }

  if (value.zoom !== undefined) {
    if (value.zoom !== "auto") {
      if (!Number.isInteger(value.zoom) || (value.zoom as number) < 1) {
        return err(`${code}: ${label}.zoom must be an integer >= 1 or "auto"`);
      }
      camera.zoom = value.zoom as number;
    } else {
      camera.zoom = "auto";
    }
  }

  if (value.maxZoom !== undefined) {
    if (!Number.isInteger(value.maxZoom) || (value.maxZoom as number) < 1) {
      return err(`${code}: ${label}.maxZoom must be an integer >= 1`);
    }
    camera.maxZoom = value.maxZoom as number;
  }

  if (value.followX !== undefined) {
    if (!FOLLOW_X.includes(value.followX as (typeof FOLLOW_X)[number])) {
      return err(
        `${code}: ${label}.followX must be "players", "p1", or "p2"`,
      );
    }
    camera.followX = value.followX as CameraFollowX;
  }

  if (value.followY !== undefined) {
    if (!FOLLOW_Y.includes(value.followY as (typeof FOLLOW_Y)[number])) {
      return err(
        `${code}: ${label}.followY must be "play-band" or "players"`,
      );
    }
    camera.followY = value.followY as CameraFollowY;
  }

  if (value.padding !== undefined) {
    if (!isFiniteNumber(value.padding) || value.padding < 0) {
      return err(`${code}: ${label}.padding must be a finite number >= 0`);
    }
    camera.padding = value.padding;
  }

  if (value.snap !== undefined) {
    if (typeof value.snap !== "boolean") {
      return err(`${code}: ${label}.snap must be boolean`);
    }
    camera.snap = value.snap;
  }

  return ok(camera);
}

export function parsePackPresentation(
  value: unknown,
  code: string,
): Result<PresentationConfig | undefined> {
  if (value === undefined) {
    return ok(undefined);
  }
  if (!isRecord(value)) {
    return err(`${code}: presentation must be an object`);
  }

  const presentation: PresentationConfig = {};

  if (value.stage !== undefined) {
    const stage = parseRect(value.stage, code, "presentation.stage", {
      bounds: PRESENTATION_CANVAS,
      boundsLabel: `${PRESENTATION_CANVAS.width}×${PRESENTATION_CANVAS.height}`,
    });
    if (!stage.ok) return err(stage.error);
    presentation.stage = stage.value;
  }

  const camera = parseCamera(value.camera, code, "presentation.camera");
  if (!camera.ok) return err(camera.error);
  if (camera.value) presentation.camera = camera.value;

  return ok(presentation);
}

export function parseRoomPresentation(
  value: unknown,
  code: string,
  room: { width: number; height: number },
): Result<RoomPresentationConfig | undefined> {
  if (value === undefined) {
    return ok(undefined);
  }
  if (!isRecord(value)) {
    return err(`${code}: presentation must be an object`);
  }

  const presentation: RoomPresentationConfig = {};

  if (value.playBand !== undefined) {
    const playBand = parseRect(value.playBand, code, "presentation.playBand", {
      integer: true,
      bounds: room,
      boundsLabel: `room bounds ${room.width}×${room.height}`,
    });
    if (!playBand.ok) return err(playBand.error);
    presentation.playBand = playBand.value;
  }

  const camera = parseCamera(value.camera, code, "presentation.camera");
  if (!camera.ok) return err(camera.error);
  if (camera.value) presentation.camera = camera.value;

  return ok(presentation);
}
