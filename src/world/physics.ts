import Matter from "matter-js";
import type { RoomDocument, RoomEntity } from "../pack";
import type { PropRunState, TetherPolicy } from "../puzzle";
import type { GameplayCue, PlayerId, PlayerState } from "./simulation";

export const PLAYER_WIDTH = 28;
export const PLAYER_HEIGHT = 44;
export const TETHER_LENGTHS: Record<Exclude<TetherPolicy, "off">, number> = {
  normal: 560,
  stretch: 1150,
};

const MOVE_SPEED = 260;
const JUMP_SPEED = 620;
const GRAVITY = 1900;
const MAX_FALL_SPEED = 1200;
const DASH_SPEED = 620;
const DASH_DURATION = 0.16;
const DASH_COOLDOWN = 0.6;
const MOVE_ACCELERATION = 3250;
const DECELERATION = 4200;
const MAX_STEP_MS = 1000 / 60;

const CATEGORY = {
  SOLID: 0x0001,
  PLAYER: 0x0002,
  PROP: 0x0004,
  HAZARD: 0x0008,
} as const;

const SOLID_MASK = CATEGORY.PLAYER | CATEGORY.PROP;
const PLAYER_MASK = CATEGORY.SOLID | CATEGORY.PROP | CATEGORY.HAZARD;
const PROP_MASK = CATEGORY.SOLID | CATEGORY.PLAYER | CATEGORY.PROP;

export interface BodySnapshot {
  x: number;
  y: number;
  vx: number;
  vy: number;
  angle: number;
  angularVelocity: number;
  sleeping: boolean;
}

export interface PropState {
  id: string;
  bodyId: string;
  tags: string[];
  shape: string;
  state: PropRunState;
  carriedBy: PlayerId | null;
  placedOn: string | null;
  width: number;
  height: number;
  x: number;
  y: number;
  carryable: boolean;
  placeable: boolean;
  pushable: boolean;
  throwable: boolean;
}

export interface PropSnapshot {
  bodyId: string;
  state: PropRunState;
  carriedBy: PlayerId | null;
  placedOn: string | null;
}

interface PropBody {
  state: PropState;
  body: Matter.Body;
  spawnX: number;
  spawnY: number;
  originalMass: number;
  originalDensity: number;
}

interface CarryConstraint {
  constraint: Matter.Constraint;
  playerId: PlayerId;
  propId: string;
}

function bodyComponent(entity: RoomEntity) {
  return entity.components?.body;
}

function propComponent(entity: RoomEntity) {
  return entity.components?.prop;
}

function tileToWorld(room: RoomDocument, x: number, y: number) {
  return {
    x: (x + 0.5) * room.tileSize,
    y: y * room.tileSize,
  };
}

function dynamicGravityForce(body: Matter.Body): Matter.Vector {
  return { x: 0, y: body.mass * (GRAVITY / 1_000_000) };
}

type GravityBody = Matter.Body & { ignoreGravity?: boolean };

function setGravity(body: Matter.Body, enabled: boolean): void {
  (body as GravityBody).ignoreGravity = !enabled;
}

function gravityEnabled(body: Matter.Body): boolean {
  return (body as GravityBody).ignoreGravity !== true;
}

export class RoomPhysics {
  readonly room: RoomDocument;
  readonly engine: Matter.Engine;
  readonly solids: Matter.Body[] = [];
  readonly playerBodies: Record<PlayerId, Matter.Body>;
  readonly props = new Map<string, PropBody>();

  private tether: Matter.Constraint | null = null;
  private tetherPolicy: TetherPolicy = "normal";
  private carry: CarryConstraint | null = null;
  private carryFacing: -1 | 1 = 1;
  private readonly activePlayers: Record<PlayerId, boolean> = {
    p1: true,
    p2: true,
  };

  constructor(room: RoomDocument) {
    this.room = room;
    this.engine = Matter.Engine.create({
      gravity: { x: 0, y: 0, scale: 0 },
      enableSleeping: true,
    });
    Matter.Engine.update(this.engine, MAX_STEP_MS);
    this.buildSolids();
    this.playerBodies = {
      p1: this.createPlayerBody(room, room.spawns.player1),
      p2: this.createPlayerBody(room, room.spawns.player2),
    };
    this.buildProps();
  }

  get world(): Matter.World {
    return this.engine.world;
  }

  private buildSolids(): void {
    const { room } = this;
    for (const [row, line] of room.layers.tiles.entries()) {
      let start = -1;
      for (let column = 0; column <= line.length; column += 1) {
        const solid = line[column] === "#";
        if (solid && start < 0) start = column;
        if (solid) continue;
        if (start < 0) continue;

        const width = column - start;
        const body = Matter.Bodies.rectangle(
          (start + width / 2) * room.tileSize,
          (row + 0.5) * room.tileSize,
          width * room.tileSize,
          room.tileSize,
          {
            isStatic: true,
            friction: 0.5,
            frictionStatic: 0.7,
            restitution: 0,
            collisionFilter: {
              category: CATEGORY.SOLID,
              mask: SOLID_MASK,
            },
          },
        );
        this.solids.push(body);
        Matter.Composite.add(this.engine.world, body);
        start = -1;
      }
    }
  }

  private createPlayerBody(
    room: RoomDocument,
    spawn: { x: number; y: number },
  ): Matter.Body {
    const point = tileToWorld(room, spawn.x, spawn.y);
    const body = Matter.Bodies.rectangle(
      point.x,
      point.y - PLAYER_HEIGHT / 2,
      PLAYER_WIDTH,
      PLAYER_HEIGHT,
      {
        friction: 0,
        frictionStatic: 0,
        frictionAir: 0,
        restitution: 0,
        inertia: Infinity,
        inverseInertia: 0,
        collisionFilter: {
          category: CATEGORY.PLAYER,
          mask: PLAYER_MASK,
        },
      },
    );
    Matter.Composite.add(this.engine.world, body);
    return body;
  }

  private buildProps(): void {
    const byId = new Map(
      (this.room.entities ?? []).map((entity) => [entity.id, entity]),
    );

    for (const entity of this.room.entities ?? []) {
      if (entity.type !== "prop") continue;
      const prop = propComponent(entity);
      if (!prop) continue;
      const bodyEntity = byId.get(prop.bodyId);
      const bodyData = bodyEntity ? bodyComponent(bodyEntity) : undefined;
      if (!bodyEntity || !bodyData) continue;

      const point = tileToWorld(this.room, bodyEntity.x, bodyEntity.y);
      const width = bodyData.width;
      const height = bodyData.height;
      const body = Matter.Bodies.rectangle(
        point.x,
        point.y - height / 2,
        width,
        height,
        {
          isStatic: bodyData.dynamic === false,
          friction: bodyData.friction ?? 0.25,
          restitution: bodyData.restitution ?? 0,
          frictionAir: 0,
          collisionFilter: {
            category: CATEGORY.PROP,
            mask: PROP_MASK,
          },
        },
      );
      if (bodyData.fixedRotation === true) {
        Matter.Body.setInertia(body, Infinity);
      }
      if (bodyData.mass !== undefined) {
        Matter.Body.setMass(body, bodyData.mass);
      }
      if (bodyData.gravity === false) {
        setGravity(body, false);
      }
      Matter.Composite.add(this.engine.world, body);

      this.props.set(entity.id, {
        body,
        spawnX: point.x,
        spawnY: point.y - height / 2,
        originalMass: body.mass,
        originalDensity: body.density,
        state: {
          id: entity.id,
          bodyId: prop.bodyId,
          tags: [...prop.tags],
          shape: prop.shape,
          state: "free",
          carriedBy: null,
          placedOn: null,
          width,
          height,
          x: point.x,
          y: point.y - height / 2,
          carryable: prop.carryable,
          placeable: prop.placeable,
          pushable: prop.pushable === true,
          throwable: prop.throwable === true,
        },
      });
    }
  }

  setPlayerActive(id: PlayerId, active: boolean): void {
    if (this.activePlayers[id] === active) return;
    this.activePlayers[id] = active;
    const body = this.playerBodies[id];
    if (active) {
      Matter.Composite.add(this.engine.world, body);
    } else {
      Matter.Composite.remove(this.engine.world, body);
      if (this.carry?.playerId === id) {
        this.dropProp(this.carry.propId);
      }
    }
    this.syncTether();
  }

  isPlayerActive(id: PlayerId): boolean {
    return this.activePlayers[id];
  }

  setPlayerPosition(id: PlayerId, feetX: number, feetY: number): void {
    const body = this.playerBodies[id];
    Matter.Body.setPosition(body, { x: feetX, y: feetY - PLAYER_HEIGHT / 2 });
    Matter.Body.setVelocity(body, { x: 0, y: 0 });
  }

  setTetherPolicy(policy: TetherPolicy): void {
    this.tetherPolicy = policy;
    this.syncTether();
  }

  private syncTether(): void {
    if (this.tether) {
      Matter.Composite.remove(this.engine.world, this.tether);
      this.tether = null;
    }
    if (this.tetherPolicy === "off") return;
    if (!this.activePlayers.p1 || !this.activePlayers.p2) return;

    this.tether = Matter.Constraint.create({
      bodyA: this.playerBodies.p1,
      bodyB: this.playerBodies.p2,
      length: TETHER_LENGTHS[this.tetherPolicy],
      stiffness: 0.1,
      damping: 0.1,
    });
    Matter.Composite.add(this.engine.world, this.tether);
  }

  applyPlayerIntent(
    id: PlayerId,
    player: PlayerState,
    intent: { moveX: -1 | 0 | 1; jump: boolean; dash: boolean },
    dt: number,
    canDash: boolean,
  ): GameplayCue[] {
    const cues: GameplayCue[] = [];
    const body = this.playerBodies[id];
    if (!player.active || !this.activePlayers[id]) return cues;
    Matter.Sleeping.set(body, false);
    if (this.carry?.playerId === id) {
      this.carryFacing = player.facing;
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
      Matter.Body.setVelocity(body, {
        x: (player.facing * DASH_SPEED) / 60,
        y: body.velocity.y,
      });
      cues.push("dash");
    }

    if (player.dashTime > 0) {
      Matter.Body.setVelocity(body, {
        x: (player.facing * DASH_SPEED) / 60,
        y: body.velocity.y,
      });
    } else if (intent.moveX !== 0) {
      player.facing = intent.moveX;
      const target = (intent.moveX * MOVE_SPEED) / 60;
      const current = body.velocity.x;
      if (
        (intent.moveX === 1 && current < target) ||
        (intent.moveX === -1 && current > target)
      ) {
        Matter.Body.applyForce(body, body.position, {
          x: body.mass * (MOVE_ACCELERATION / 1_000_000) * intent.moveX,
          y: 0,
        });
      }
    } else if (Math.abs(body.velocity.x) > 0.02) {
      Matter.Body.applyForce(body, body.position, {
        x: -body.mass * (DECELERATION / 1_000_000) * Math.sign(body.velocity.x),
        y: 0,
      });
    }

    if (intent.jump && player.onGround) {
      Matter.Body.setVelocity(body, {
        x: body.velocity.x,
        y: -JUMP_SPEED / 60,
      });
      player.onGround = false;
      cues.push("jump");
    }

    return cues;
  }

  step(): void {
    for (const id of ["p1", "p2"] as const) {
      if (this.activePlayers[id]) {
        const body = this.playerBodies[id];
        Matter.Body.applyForce(body, body.position, dynamicGravityForce(body));
      }
    }
    for (const prop of this.props.values()) {
      if (!prop.body.isStatic && gravityEnabled(prop.body)) {
        Matter.Body.applyForce(prop.body, prop.body.position, dynamicGravityForce(prop.body));
      }
    }

    if (this.tether) {
      const distance = Matter.Vector.magnitude(
        Matter.Vector.sub(
          this.playerBodies.p1.position,
          this.playerBodies.p2.position,
        ),
      );
      this.tether.stiffness = distance > this.tether.length ? 0.1 : 0;
      this.tether.damping = distance > this.tether.length ? 0.1 : 0;
    }

    if (this.carry) {
      const body = this.playerBodies[this.carry.playerId];
      const carryProp = this.props.get(this.carry.propId);
      if (carryProp) {
        const side = this.carryFacing;
        carryProp.state.carriedBy = this.carry.playerId;
        this.carry.constraint.pointA = { x: side * 24, y: -8 };
        const hold = {
          x: body.position.x + side * 24,
          y: body.position.y - 8,
        };
        const distance = Matter.Vector.magnitude(
          Matter.Vector.sub(carryProp.body.position, hold),
        );
        if (distance > 48) {
          Matter.Body.setPosition(carryProp.body, hold);
          Matter.Body.setVelocity(carryProp.body, {
            x: body.velocity.x,
            y: body.velocity.y,
          });
        }
      }
    }

    Matter.Engine.update(this.engine, MAX_STEP_MS);
  }

  syncPlayer(id: PlayerId, player: PlayerState): void {
    const body = this.playerBodies[id];
    player.x = body.position.x;
    player.y = body.position.y + PLAYER_HEIGHT / 2;
    player.vx = body.velocity.x * 60;
    player.vy = body.velocity.y * 60;
    if (body.velocity.y > MAX_FALL_SPEED / 60) {
      Matter.Body.setVelocity(body, { x: body.velocity.x, y: MAX_FALL_SPEED / 60 });
    }
    if (player.y - PLAYER_HEIGHT > this.room.height * this.room.tileSize + 160) {
      this.respawn(id, player);
    }
  }

  groundCheck(id: PlayerId): boolean {
    const body = this.playerBodies[id];
    if (!this.activePlayers[id]) return false;
    if (body.velocity.y < -0.5) return false;
    const bodies = [...this.solids];
    for (const prop of this.props.values()) {
      if (prop.body !== body) bodies.push(prop.body);
    }
    const start = { x: body.position.x, y: body.bounds.max.y - 1 };
    const end = { x: body.position.x, y: body.bounds.max.y + 5 };
    return Matter.Query.ray(bodies, start, end, 2).length > 0;
  }

  respawn(id: PlayerId, player: PlayerState): void {
    this.setPlayerPosition(id, player.spawnX, player.spawnY);
    player.x = player.spawnX;
    player.y = player.spawnY;
    player.vx = 0;
    player.vy = 0;
    player.dashTime = 0;
    player.dashCooldown = 0;
    player.onGround = false;
  }

  /* ---------------------------------------------------------------- */
  /* Props                                                            */
  /* ---------------------------------------------------------------- */

  propState(id: string): PropState | null {
    return this.props.get(id)?.state ?? null;
  }

  propStates(): Record<string, PropState> {
    return Object.fromEntries(
      [...this.props.entries()].map(([id, prop]) => [
        id,
        {
          ...prop.state,
          x: prop.body.position.x,
          y: prop.body.position.y,
        },
      ]),
    );
  }

  pickUp(playerId: PlayerId, propId: string): boolean {
    const prop = this.props.get(propId);
    if (!prop || !prop.state.carryable) return false;
    if (prop.state.state === "docked") return false;
    if (this.carry) return false;

    if (prop.state.state === "placed") {
      this.unstatic(prop);
      prop.state.placedOn = null;
    }

    const body = this.playerBodies[playerId];
    const side = body.velocity.x < 0 ? -1 : 1;
    this.carryFacing = side;
    const constraint = Matter.Constraint.create({
      bodyA: body,
      bodyB: prop.body,
      pointA: { x: side * 24, y: -8 },
      pointB: { x: 0, y: 0 },
      length: 0,
      stiffness: 0.9,
      damping: 0.1,
    });
    Matter.Composite.add(this.engine.world, constraint);
    this.carry = { constraint, playerId, propId };
    prop.state.state = "carried";
    prop.state.carriedBy = playerId;
    setGravity(prop.body, false);
    prop.body.collisionFilter.mask = CATEGORY.SOLID | CATEGORY.PROP;
    return true;
  }

  dropProp(propId: string): boolean {
    const prop = this.props.get(propId);
    if (!prop) return false;
    this.removeCarry();
    prop.state.state = "free";
    prop.state.carriedBy = null;
    prop.state.placedOn = null;
    setGravity(prop.body, true);
    prop.body.collisionFilter.mask = PROP_MASK;
    return true;
  }

  placeProp(propId: string, receptorId: string, snap: { x: number; y: number }): boolean {
    const prop = this.props.get(propId);
    if (!prop || !prop.state.placeable) return false;
    this.removeCarry();
    Matter.Body.setStatic(prop.body, true);
    Matter.Body.setPosition(prop.body, snap);
    Matter.Body.setVelocity(prop.body, { x: 0, y: 0 });
    Matter.Body.setAngle(prop.body, 0);
    prop.body.collisionFilter.mask = PROP_MASK;
    prop.state.state = "placed";
    prop.state.carriedBy = null;
    prop.state.placedOn = receptorId;
    return true;
  }

  dockProp(propId: string, receptorId: string): boolean {
    const prop = this.props.get(propId);
    if (!prop) return false;
    if (!prop.body.isStatic) Matter.Body.setStatic(prop.body, true);
    prop.body.collisionFilter.mask = PROP_MASK;
    prop.state.state = "docked";
    prop.state.carriedBy = null;
    prop.state.placedOn = receptorId;
    return true;
  }

  throwProp(propId: string, facing: -1 | 1): boolean {
    const prop = this.props.get(propId);
    if (!prop || !prop.state.throwable) return false;
    this.removeCarry();
    prop.state.state = "free";
    prop.state.carriedBy = null;
    prop.state.placedOn = null;
    setGravity(prop.body, true);
    prop.body.collisionFilter.mask = PROP_MASK;
    Matter.Body.setVelocity(prop.body, {
      x: (facing * 260) / 60,
      y: -260 / 60,
    });
    return true;
  }

  resetProp(propId: string): boolean {
    const prop = this.props.get(propId);
    if (!prop) return false;
    this.removeCarry();
    if (prop.body.isStatic) this.unstatic(prop);
    Matter.Body.setPosition(prop.body, { x: prop.spawnX, y: prop.spawnY });
    Matter.Body.setVelocity(prop.body, { x: 0, y: 0 });
    Matter.Body.setAngle(prop.body, 0);
    setGravity(prop.body, true);
    prop.body.collisionFilter.mask = PROP_MASK;
    prop.state.state = "free";
    prop.state.carriedBy = null;
    prop.state.placedOn = null;
    return true;
  }

  propOutOfBounds(propId: string): boolean {
    const prop = this.props.get(propId);
    if (!prop) return false;
    const roomWidth = this.room.width * this.room.tileSize;
    const roomHeight = this.room.height * this.room.tileSize;
    const { x, y } = prop.body.position;
    return x < -120 || x > roomWidth + 120 || y > roomHeight + 200;
  }

  private removeCarry(): void {
    if (!this.carry) return;
    Matter.Composite.remove(this.engine.world, this.carry.constraint);
    const prop = this.props.get(this.carry.propId);
    if (prop) {
      setGravity(prop.body, true);
      prop.body.collisionFilter.mask = PROP_MASK;
    }
    this.carry = null;
  }

  private unstatic(prop: PropBody): void {
    Matter.Body.setStatic(prop.body, false);
    Matter.Body.setMass(prop.body, prop.originalMass);
    Matter.Body.setDensity(prop.body, prop.originalDensity);
  }

  /* ---------------------------------------------------------------- */
  /* Snapshots                                                        */
  /* ---------------------------------------------------------------- */

  snapshotBody(body: Matter.Body): BodySnapshot {
    return {
      x: body.position.x,
      y: body.position.y,
      vx: body.velocity.x * 60,
      vy: body.velocity.y * 60,
      angle: body.angle,
      angularVelocity: body.angularVelocity * 60,
      sleeping: body.isSleeping === true,
    };
  }

  playerSnapshots(): Record<PlayerId, BodySnapshot> {
    return {
      p1: this.snapshotBody(this.playerBodies.p1),
      p2: this.snapshotBody(this.playerBodies.p2),
    };
  }

  bodySnapshots(): Record<string, BodySnapshot> {
    const result: Record<string, BodySnapshot> = {};
    for (const prop of this.props.values()) {
      result[prop.state.bodyId] = this.snapshotBody(prop.body);
    }
    return result;
  }

  propSnapshots(): Record<string, PropSnapshot> {
    const result: Record<string, PropSnapshot> = {};
    for (const [id, prop] of this.props) {
      result[id] = {
        bodyId: prop.state.bodyId,
        state: prop.state.state,
        carriedBy: prop.state.carriedBy,
        placedOn: prop.state.placedOn,
      };
    }
    return result;
  }

  restorePlayer(id: PlayerId, snapshot: BodySnapshot): void {
    const body = this.playerBodies[id];
    Matter.Body.setPosition(body, { x: snapshot.x, y: snapshot.y });
    Matter.Body.setVelocity(body, { x: snapshot.vx / 60, y: snapshot.vy / 60 });
    Matter.Body.setAngle(body, snapshot.angle);
    Matter.Body.setAngularVelocity(body, snapshot.angularVelocity / 60);
    Matter.Sleeping.set(body, snapshot.sleeping);
  }

  restoreProps(
    bodies: Record<string, BodySnapshot>,
    props: Record<string, PropSnapshot>,
  ): void {
    for (const [id, prop] of this.props) {
      const snapshot = props[id];
      const bodySnapshot = snapshot ? bodies[snapshot.bodyId] : undefined;
      if (!snapshot || !bodySnapshot) continue;

      this.removeCarry();
      if (prop.body.isStatic) this.unstatic(prop);
      Matter.Body.setPosition(prop.body, {
        x: bodySnapshot.x,
        y: bodySnapshot.y,
      });
      Matter.Body.setVelocity(prop.body, {
        x: bodySnapshot.vx / 60,
        y: bodySnapshot.vy / 60,
      });
      Matter.Body.setAngle(prop.body, bodySnapshot.angle);
      Matter.Body.setAngularVelocity(
        prop.body,
        bodySnapshot.angularVelocity / 60,
      );
      Matter.Sleeping.set(prop.body, bodySnapshot.sleeping);
      prop.state.state = snapshot.state;
      prop.state.carriedBy = snapshot.carriedBy;
      prop.state.placedOn = snapshot.placedOn;
      setGravity(prop.body, true);
      prop.body.collisionFilter.mask = PROP_MASK;

      if (snapshot.state === "carried" && snapshot.carriedBy) {
        this.pickUp(snapshot.carriedBy, id);
      } else if (snapshot.state === "placed" || snapshot.state === "docked") {
        Matter.Body.setStatic(prop.body, true);
      } else if (snapshot.state === "free") {
        setGravity(prop.body, true);
      }
    }
  }
}
