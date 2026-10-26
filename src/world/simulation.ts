import type { RoomDocument } from "../pack";
import type { TetherPolicy } from "../puzzle";
import {
  PLAYER_HEIGHT,
  PLAYER_WIDTH,
  RoomPhysics,
  type BodySnapshot,
  type PropSnapshot,
  type PropState,
} from "./physics";

export { PLAYER_HEIGHT, PLAYER_WIDTH };
export type { BodySnapshot, PropSnapshot, PropState };

export type PlayerId = "p1" | "p2";

export interface PlayerIntent {
  moveX: -1 | 0 | 1;
  jump: boolean;
  dash: boolean;
}

export type Intents = Record<PlayerId, PlayerIntent>;

/** Semantic gameplay cues emitted by actual fixed-step transitions. */
export type GameplayCue =
  | "jump"
  | "land"
  | "dash"
  | "propReturned";

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
  props: Record<string, PropState>;
  camera: CameraFrame;
  viewport: Viewport;
  elapsed: number;
  tick: number;
  physics: RoomPhysics;
  tetherPolicy: TetherPolicy;
  propReturnTimers: Record<string, number>;
}

const CAMERA_SMOOTHING = 8;
const PROP_RETURN_DELAY = 1;
export const TETHER_DISTANCE = 560;

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
  const physics = new RoomPhysics(room);
  const simulation: RoomSimulation = {
    room,
    solids: buildSolids(room),
    players: {
      p1: makePlayer("p1", room, room.spawns.player1),
      p2: makePlayer("p2", room, room.spawns.player2),
    },
    props: physics.propStates(),
    camera: {
      x: 0,
      y: 0,
      width: viewport.width,
      height: viewport.height,
    },
    viewport,
    elapsed: 0,
    tick: 0,
    physics,
    tetherPolicy: "normal",
    propReturnTimers: {},
  };

  for (const id of ["p1", "p2"] as const) {
    const player = simulation.players[id];
    physics.setPlayerPosition(id, player.x, player.y);
  }
  physics.setTetherPolicy("normal");

  const target = cameraTarget(simulation);
  simulation.camera.x = target.x;
  simulation.camera.y = target.y;
  return simulation;
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

export function placePlayer(
  simulation: RoomSimulation,
  id: PlayerId,
  x: number,
  y: number,
): void {
  const player = simulation.players[id];
  player.x = x;
  player.y = y;
  player.vx = 0;
  player.vy = 0;
  simulation.physics.setPlayerPosition(id, x, y);
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
  simulation.physics.setPlayerActive(id, active);
}

export function setTetherPolicy(
  simulation: RoomSimulation,
  policy: TetherPolicy,
): void {
  simulation.tetherPolicy = policy;
  simulation.physics.setTetherPolicy(policy);
}

export function stepRoomSimulation(
  simulation: RoomSimulation,
  intents: Intents,
  dt: number,
  abilities: readonly string[] = [],
): void {
  const safeDt = Math.max(0, Math.min(dt, 0.05));
  const canDash = abilities.includes("signal-dash");

  for (const id of ["p1", "p2"] as const) {
    const player = simulation.players[id];
    if (!player.active) continue;
    simulation.physics.applyPlayerIntent(
      id,
      player,
      intents[id],
      safeDt,
      canDash,
    );
  }

  simulation.physics.step();

  for (const id of ["p1", "p2"] as const) {
    const player = simulation.players[id];
    if (!player.active) continue;
    simulation.physics.syncPlayer(id, player);
    player.onGround = simulation.physics.groundCheck(id);
  }

  simulation.props = simulation.physics.propStates();
  for (const propId of Object.keys(simulation.props)) {
    if (!simulation.physics.propOutOfBounds(propId)) {
      delete simulation.propReturnTimers[propId];
      continue;
    }
    const remaining = (simulation.propReturnTimers[propId] ?? PROP_RETURN_DELAY) - safeDt;
    if (remaining > 0) {
      simulation.propReturnTimers[propId] = remaining;
      continue;
    }
    simulation.physics.resetProp(propId);
    delete simulation.propReturnTimers[propId];
  }

  const target = cameraTarget(simulation);
  const factor = Math.min(1, safeDt * CAMERA_SMOOTHING);
  simulation.camera.x += (target.x - simulation.camera.x) * factor;
  simulation.camera.y += (target.y - simulation.camera.y) * factor;
  simulation.elapsed += safeDt;
  simulation.tick += 1;
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
  const propsBefore = new Set(
    Object.keys(simulation.props).filter(
      (propId) => simulation.physics.propOutOfBounds(propId),
    ),
  );

  stepRoomSimulation(simulation, intents, dt, abilities);

  let jumped = false;
  let landed = false;
  let dashed = false;
  let propReturned = false;

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

  for (const propId of propsBefore) {
    if (!simulation.physics.propOutOfBounds(propId)) {
      propReturned = true;
    }
  }

  const cues: GameplayCue[] = [];
  if (jumped) cues.push("jump");
  if (landed) cues.push("land");
  if (dashed) cues.push("dash");
  if (propReturned) cues.push("propReturned");
  return cues;
}

export type { BodySnapshot as PhysicsBodySnapshot };
