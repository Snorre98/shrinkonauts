import type { RoomDocument } from "../pack";

export type PlayerId = "p1" | "p2";

export interface PlayerIntent {
  moveX: -1 | 0 | 1;
  jump: boolean;
  dash: boolean;
}

export type Intents = Record<PlayerId, PlayerIntent>;

/** Semantic gameplay cues emitted by actual fixed-step transitions. */
export type GameplayCue = "jump" | "land" | "dash";

export interface PlayerState {
  id: PlayerId;
  x: number;
  y: number;
  vx: number;
  vy: number;
  onGround: boolean;
  facing: -1 | 1;
  spawnX: number;
  spawnY: number;
  active: boolean;
  dashTime: number;
  dashCooldown: number;
}

export interface Solid {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface CameraFrame {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Viewport {
  width: number;
  height: number;
}

export interface RoomSimulation {
  room: RoomDocument;
  solids: Solid[];
  players: Record<PlayerId, PlayerState>;
  camera: CameraFrame;
  viewport: Viewport;
  elapsed: number;
}

export const PLAYER_WIDTH = 28;
export const PLAYER_HEIGHT = 44;
export const TETHER_DISTANCE = 560;
const MOVE_SPEED = 260;
const JUMP_SPEED = 620;
const GRAVITY = 1900;
const MAX_FALL_SPEED = 1200;
const DASH_SPEED = 620;
const DASH_DURATION = 0.16;
const DASH_COOLDOWN = 0.6;
const DASH_ABILITY = "signal-dash";
const CAMERA_SMOOTHING = 8;
const EPSILON = 0.0001;

export function emptyIntents(): Intents {
  return {
    p1: { moveX: 0, jump: false, dash: false },
    p2: { moveX: 0, jump: false, dash: false },
  };
}

function tileSpawn(
  spawn: { x: number; y: number },
  tileSize: number,
): { x: number; y: number } {
  return {
    x: (spawn.x + 0.5) * tileSize,
    y: spawn.y * tileSize,
  };
}

function makePlayer(
  id: PlayerId,
  room: RoomDocument,
  spawn: { x: number; y: number },
): PlayerState {
  const position = tileSpawn(spawn, room.tileSize);
  return {
    id,
    x: position.x,
    y: position.y,
    vx: 0,
    vy: 0,
    onGround: false,
    facing: 1,
    spawnX: position.x,
    spawnY: position.y,
    active: true,
    dashTime: 0,
    dashCooldown: 0,
  };
}

function buildSolids(room: RoomDocument): Solid[] {
  const solids: Solid[] = [];
  for (const [rowIndex, row] of room.layers.tiles.entries()) {
    for (const [columnIndex, tile] of [...row].entries()) {
      if (tile !== "#") {
        continue;
      }
      solids.push({
        x: columnIndex * room.tileSize,
        y: rowIndex * room.tileSize,
        width: room.tileSize,
        height: room.tileSize,
      });
    }
  }
  return solids;
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.max(minimum, Math.min(maximum, value));
}

export function roomPixelWidth(room: RoomDocument): number {
  return room.width * room.tileSize;
}

export function roomPixelHeight(room: RoomDocument): number {
  return room.height * room.tileSize;
}

function activePlayers(simulation: RoomSimulation): PlayerState[] {
  const players = [simulation.players.p1, simulation.players.p2].filter(
    (player) => player.active,
  );
  return players.length > 0 ? players : [simulation.players.p1];
}

export function cameraTarget(simulation: RoomSimulation): {
  x: number;
  y: number;
} {
  const { room, viewport } = simulation;
  const players = activePlayers(simulation);
  const averageX =
    players.reduce((total, player) => total + player.x, 0) / players.length;
  const averageY =
    players.reduce((total, player) => total + player.y, 0) / players.length - 40;
  const maxX = Math.max(0, roomPixelWidth(room) - viewport.width);
  const maxY = Math.max(0, roomPixelHeight(room) - viewport.height);

  return {
    x: clamp(averageX - viewport.width / 2, 0, maxX),
    y: clamp(averageY - viewport.height / 2, 0, maxY),
  };
}

export function createRoomSimulation(
  room: RoomDocument,
  viewport: Viewport = { width: 1280, height: 720 },
): RoomSimulation {
  const simulation: RoomSimulation = {
    room,
    solids: buildSolids(room),
    players: {
      p1: makePlayer("p1", room, room.spawns.player1),
      p2: makePlayer("p2", room, room.spawns.player2),
    },
    camera: {
      x: 0,
      y: 0,
      width: viewport.width,
      height: viewport.height,
    },
    viewport,
    elapsed: 0,
  };

  const target = cameraTarget(simulation);
  simulation.camera.x = target.x;
  simulation.camera.y = target.y;
  return simulation;
}

interface Bounds {
  left: number;
  right: number;
  top: number;
  bottom: number;
}

function boundsOf(
  x: number,
  y: number,
  width: number,
  height: number,
): Bounds {
  return {
    left: x - width / 2,
    right: x + width / 2,
    top: y - height,
    bottom: y,
  };
}

function intersects(a: Bounds, solid: Solid): boolean {
  return (
    a.left < solid.x + solid.width - EPSILON &&
    a.right > solid.x + EPSILON &&
    a.top < solid.y + solid.height - EPSILON &&
    a.bottom > solid.y + EPSILON
  );
}

function resolveHorizontal(
  player: PlayerState,
  solids: Solid[],
  room: RoomDocument,
): void {
  for (const solid of solids) {
    const bounds = boundsOf(player.x, player.y, PLAYER_WIDTH, PLAYER_HEIGHT);
    if (!intersects(bounds, solid)) {
      continue;
    }

    if (player.vx > 0) {
      player.x = solid.x - PLAYER_WIDTH / 2;
      player.vx = 0;
    } else if (player.vx < 0) {
      player.x = solid.x + solid.width + PLAYER_WIDTH / 2;
      player.vx = 0;
    }
  }

  player.x = clamp(
    player.x,
    PLAYER_WIDTH / 2,
    roomPixelWidth(room) - PLAYER_WIDTH / 2,
  );
}

function resolveVertical(
  player: PlayerState,
  solids: Solid[],
): void {
  player.onGround = false;

  for (const solid of solids) {
    const bounds = boundsOf(player.x, player.y, PLAYER_WIDTH, PLAYER_HEIGHT);
    if (!intersects(bounds, solid)) {
      continue;
    }

    if (player.vy > 0) {
      player.y = solid.y;
      player.vy = 0;
      player.onGround = true;
    } else if (player.vy < 0) {
      player.y = solid.y + solid.height + PLAYER_HEIGHT;
      player.vy = 0;
    }
  }

  if (player.y - PLAYER_HEIGHT < 0) {
    player.y = PLAYER_HEIGHT;
    player.vy = 0;
  }
}

export function respawnPlayer(player: PlayerState): void {
  player.x = player.spawnX;
  player.y = player.spawnY;
  player.vx = 0;
  player.vy = 0;
  player.onGround = false;
  player.dashTime = 0;
  player.dashCooldown = 0;
}

export function setPlayerSpawn(
  player: PlayerState,
  x: number,
  y: number,
): void {
  player.spawnX = x;
  player.spawnY = y;
}

export function setPlayerActive(
  simulation: RoomSimulation,
  id: PlayerId,
  active: boolean,
): void {
  const player = simulation.players[id];
  player.active = active;
  if (!active) {
    player.vx = 0;
    player.vy = 0;
    player.dashTime = 0;
  }
}

function stepPlayer(
  player: PlayerState,
  intent: PlayerIntent,
  simulation: RoomSimulation,
  dt: number,
  canDash: boolean,
): void {
  if (!player.active) {
    return;
  }

  player.dashCooldown = Math.max(0, player.dashCooldown - dt);
  if (player.dashTime > 0) {
    player.dashTime = Math.max(0, player.dashTime - dt);
  }

  if (
    intent.dash &&
    canDash &&
    player.dashTime === 0 &&
    player.dashCooldown === 0
  ) {
    player.dashTime = DASH_DURATION;
    player.dashCooldown = DASH_COOLDOWN;
  }

  if (player.dashTime > 0) {
    player.vx = player.facing * DASH_SPEED;
  } else {
    player.vx = intent.moveX * MOVE_SPEED;
    if (intent.moveX !== 0) {
      player.facing = intent.moveX;
    }
  }

  if (intent.jump && player.onGround) {
    player.vy = -JUMP_SPEED;
    player.onGround = false;
  }

  player.vy = Math.min(player.vy + GRAVITY * dt, MAX_FALL_SPEED);

  player.x += player.vx * dt;
  resolveHorizontal(player, simulation.solids, simulation.room);

  player.y += player.vy * dt;
  resolveVertical(player, simulation.solids);

  if (player.y - PLAYER_HEIGHT > roomPixelHeight(simulation.room) + 160) {
    respawnPlayer(player);
  }
}

/**
 * Co-op tether: when the players drift further apart than the camera can
 * comfortably frame, the trailing player is pulled toward the midpoint. It is
 * intentionally soft (no teleport, no velocity change) so platforming stays
 * predictable.
 */
function applyTether(simulation: RoomSimulation): void {
  const { p1, p2 } = simulation.players;
  if (!p1.active || !p2.active) return;

  const distance = Math.abs(p1.x - p2.x);
  if (distance <= TETHER_DISTANCE) return;

  const midpoint = (p1.x + p2.x) / 2;
  const maxOffset = TETHER_DISTANCE / 2;
  const minimum = PLAYER_WIDTH / 2;
  const maximum = roomPixelWidth(simulation.room) - PLAYER_WIDTH / 2;

  p1.x = clamp(
    clamp(p1.x, midpoint - maxOffset, midpoint + maxOffset),
    minimum,
    maximum,
  );
  p2.x = clamp(
    clamp(p2.x, midpoint - maxOffset, midpoint + maxOffset),
    minimum,
    maximum,
  );
}

export function stepRoomSimulation(
  simulation: RoomSimulation,
  intents: Intents,
  dt: number,
  abilities: readonly string[] = [],
): void {
  const safeDt = Math.max(0, Math.min(dt, 0.05));
  const canDash = abilities.includes(DASH_ABILITY);

  stepPlayer(simulation.players.p1, intents.p1, simulation, safeDt, canDash);
  stepPlayer(simulation.players.p2, intents.p2, simulation, safeDt, canDash);

  applyTether(simulation);

  const target = cameraTarget(simulation);
  const factor = Math.min(1, safeDt * CAMERA_SMOOTHING);
  simulation.camera.x += (target.x - simulation.camera.x) * factor;
  simulation.camera.y += (target.y - simulation.camera.y) * factor;
  simulation.elapsed += safeDt;
}

interface CueSnapshot {
  onGround: boolean;
  y: number;
  vy: number;
  dashTime: number;
  active: boolean;
}

function cueSnapshot(player: PlayerState): CueSnapshot {
  return {
    onGround: player.onGround,
    y: player.y,
    vy: player.vy,
    dashTime: player.dashTime,
    active: player.active,
  };
}

/**
 * Advances one fixed step and returns the semantic cues that actually happened.
 *
 * Detection compares the state before and after the step, so walking off a
 * ledge is not a jump and landing is only reported on the touchdown step.
 * Cues are deduplicated per step to avoid doubled beeps when both players
 * transition together.
 */
export function stepRoomSimulationWithCues(
  simulation: RoomSimulation,
  intents: Intents,
  dt: number,
  abilities: readonly string[] = [],
): GameplayCue[] {
  const before: Record<PlayerId, CueSnapshot> = {
    p1: cueSnapshot(simulation.players.p1),
    p2: cueSnapshot(simulation.players.p2),
  };

  stepRoomSimulation(simulation, intents, dt, abilities);

  let jumped = false;
  let landed = false;
  let dashed = false;

  for (const id of ["p1", "p2"] as const) {
    const previous = before[id];
    const current = simulation.players[id];

    if (!previous.active || !current.active) continue;
    if (previous.onGround && !current.onGround && current.y < previous.y) {
      jumped = true;
    }
    if (previous.vy > 0 && !previous.onGround && current.onGround) {
      landed = true;
    }
    if (previous.dashTime === 0 && current.dashTime > 0) {
      dashed = true;
    }
  }

  const cues: GameplayCue[] = [];
  if (jumped) {
    cues.push("jump");
  }
  if (landed) {
    cues.push("land");
  }
  if (dashed) {
    cues.push("dash");
  }
  return cues;
}
