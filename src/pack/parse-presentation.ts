import { err, ok, type Result } from "../core/result";
import { isFiniteNumber, isRecord } from "./parse-common";
import { PRESENTATION_CANVAS } from "./presentation";
import type {
  CameraFollowX,
  CameraFollowY,
  EntityPresentationConfig,
  PresentationCameraConfig,
  PresentationConfig,
  PresentationRect,
  PresentationRoleConfig,
  PresentationRoleName,
  PresentationSize,
  RoomEntityType,
  RoomPresentationConfig,
} from "./types";

const FRAMINGS = ["fit-play-band"] as const;
const FOLLOW_X = ["players", "p1", "p2"] as const;
const FOLLOW_Y = ["play-band", "players"] as const;

export const PRESENTATION_ROLES: readonly PresentationRoleName[] = [
  "player",
  "npc",
  "interactable",
  "prop",
  "scan",
  "decor",
];

const FIDELITY_CLASSES = [
  "world-2x",
  "hero-1x",
  "ui-1x",
  "atlas",
  "painted-screen",
] as const;

const ENTITY_TYPES: readonly RoomEntityType[] = [
  "agent",
  "movingPlatform",
  "hazard",
  "pickup",
  "trigger",
  "gate",
  "checkpoint",
  "scanTarget",
  "decor",
  "body",
  "prop",
  "receptor",
  "pulseSource",
  "puzzleGate",
];

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

function parseSize(
  value: unknown,
  code: string,
  label: string,
): Result<PresentationSize> {
  if (Array.isArray(value)) {
    if (
      value.length !== 2 ||
      !Number.isInteger(value[0]) ||
      !Number.isInteger(value[1]) ||
      value[0] <= 0 ||
      value[1] <= 0
    ) {
      return err(`${code}: ${label} must be [width, height] with positive integers`);
    }
    return ok([value[0], value[1]]);
  }
  if (isRecord(value)) {
    if (
      !Number.isInteger(value.width) ||
      !Number.isInteger(value.height) ||
      (value.width as number) <= 0 ||
      (value.height as number) <= 0
    ) {
      return err(
        `${code}: ${label} must have positive integer width and height`,
      );
    }
    return ok({
      width: value.width as number,
      height: value.height as number,
    });
  }
  return err(`${code}: ${label} must be [width, height] or a size object`);
}

function parseRoleName(
  value: unknown,
  code: string,
  label: string,
): Result<PresentationRoleName> {
  if (!PRESENTATION_ROLES.includes(value as PresentationRoleName)) {
    return err(
      `${code}: ${label} must be one of ${PRESENTATION_ROLES.join(", ")}`,
    );
  }
  return ok(value as PresentationRoleName);
}

function parseRoleConfig(
  value: unknown,
  code: string,
  label: string,
): Result<PresentationRoleConfig> {
  if (!isRecord(value)) {
    return err(`${code}: ${label} must be an object`);
  }
  if (value.display === undefined) {
    return err(`${code}: ${label}.display is required`);
  }
  const display = parseSize(value.display, code, `${label}.display`);
  if (!display.ok) return err(display.error);

  const role: PresentationRoleConfig = { display: display.value };

  if (value.fidelity !== undefined) {
    if (
      !FIDELITY_CLASSES.includes(
        value.fidelity as (typeof FIDELITY_CLASSES)[number],
      )
    ) {
      return err(
        `${code}: ${label}.fidelity must be one of ${FIDELITY_CLASSES.join(", ")}`,
      );
    }
    role.fidelity = value.fidelity as PresentationRoleConfig["fidelity"];
  }

  return ok(role);
}

function parseRoles(
  value: unknown,
  code: string,
  label: string,
): Result<PresentationConfig["roles"]> {
  if (value === undefined) return ok(undefined);
  if (!isRecord(value)) {
    return err(`${code}: ${label} must be an object`);
  }

  const roles: NonNullable<PresentationConfig["roles"]> = {};
  for (const [name, rawRole] of Object.entries(value)) {
    const roleName = parseRoleName(name, code, `${label}.${name}`);
    if (!roleName.ok) return err(roleName.error);
    const parsed = parseRoleConfig(rawRole, code, `${label}.${name}`);
    if (!parsed.ok) return err(parsed.error);
    roles[roleName.value] = parsed.value;
  }
  return ok(roles);
}

function parseDefaultRoles(
  value: unknown,
  code: string,
  label: string,
): Result<PresentationConfig["defaultRoles"]> {
  if (value === undefined) return ok(undefined);
  if (!isRecord(value)) {
    return err(`${code}: ${label} must be an object`);
  }

  const defaults: NonNullable<PresentationConfig["defaultRoles"]> = {};
  for (const [type, rawRole] of Object.entries(value)) {
    if (!ENTITY_TYPES.includes(type as RoomEntityType)) {
      return err(`${code}: ${label}.${type} is not a supported entity type`);
    }
    if (rawRole === "none") {
      defaults[type as RoomEntityType] = "none";
      continue;
    }
    const parsed = parseRoleName(rawRole, code, `${label}.${type}`);
    if (!parsed.ok) return err(parsed.error);
    defaults[type as RoomEntityType] = parsed.value;
  }
  return ok(defaults);
}

export function parseEntityPresentation(
  value: unknown,
  code: string,
  label: string,
): Result<EntityPresentationConfig | undefined> {
  if (value === undefined) return ok(undefined);
  if (!isRecord(value)) {
    return err(`${code}: ${label} must be an object`);
  }

  const presentation: EntityPresentationConfig = {};

  if (value.role !== undefined) {
    const role = parseRoleName(value.role, code, `${label}.role`);
    if (!role.ok) return err(role.error);
    presentation.role = role.value;
  }

  if (value.display !== undefined) {
    const display = parseSize(value.display, code, `${label}.display`);
    if (!display.ok) return err(display.error);
    presentation.display = display.value;
  }

  if (value.depthBias !== undefined) {
    if (!isFiniteNumber(value.depthBias)) {
      return err(`${code}: ${label}.depthBias must be a finite number`);
    }
    presentation.depthBias = value.depthBias;
  }

  return ok(presentation);
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

  const roles = parseRoles(value.roles, code, "presentation.roles");
  if (!roles.ok) return err(roles.error);
  if (roles.value) presentation.roles = roles.value;

  const defaultRoles = parseDefaultRoles(
    value.defaultRoles,
    code,
    "presentation.defaultRoles",
  );
  if (!defaultRoles.ok) return err(defaultRoles.error);
  if (defaultRoles.value) presentation.defaultRoles = defaultRoles.value;

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
