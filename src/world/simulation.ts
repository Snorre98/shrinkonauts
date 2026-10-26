import type { RoomDocument } from "../pack";

export type PlayerId = "p1" | "p2";

export interface PlayerIntent {
  moveX: -1 | 0 | 1;
  jump: boolean;
}

export type Intents = Record<PlayerId, PlayerIntent>;

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
const MOVE_SPEED = 260;
const JUMP_SPEED = 620;
const GRAVITY = 1900;
const MAX_FALL_SPEED = 1200;
const CAMERA_SMOOTHING = 8;
const EPSILON = 0.0001;

export function emptyIntents(): Intents {
  return {
    p1: { moveX: 0, jump: false },
    p2: { moveX: 0, jump: false },
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

export function cameraTarget(simulation: RoomSimulation): {
  x: number;
  y: number;
} {
  const { room, players, viewport } = simulation;
  const averageX = (players.p1.x + players.p2.x) / 2;
  const averageY = (players.p1.y + players.p2.y) / 2 - 40;
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

function respawn(player: PlayerState): void {
  player.x = player.spawnX;
  player.y = player.spawnY;
  player.vx = 0;
  player.vy = 0;
  player.onGround = false;
}

function stepPlayer(
  player: PlayerState,
  intent: PlayerIntent,
  simulation: RoomSimulation,
  dt: number,
): void {
  player.vx = intent.moveX * MOVE_SPEED;
  if (intent.moveX !== 0) {
    player.facing = intent.moveX;
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
    respawn(player);
  }
}

export function stepRoomSimulation(
  simulation: RoomSimulation,
  intents: Intents,
  dt: number,
): void {
  const safeDt = Math.max(0, Math.min(dt, 0.05));

  stepPlayer(simulation.players.p1, intents.p1, simulation, safeDt);
  stepPlayer(simulation.players.p2, intents.p2, simulation, safeDt);

  const target = cameraTarget(simulation);
  const factor = Math.min(1, safeDt * CAMERA_SMOOTHING);
  simulation.camera.x += (target.x - simulation.camera.x) * factor;
  simulation.camera.y += (target.y - simulation.camera.y) * factor;
  simulation.elapsed += safeDt;
}
