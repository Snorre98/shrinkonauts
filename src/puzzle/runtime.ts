import type {
  CounterNode,
  GateNode,
  PlateNode,
  PropNode,
  PuzzleDocument,
  PuzzleEvent,
  PuzzleEventType,
  PuzzleLink,
  PuzzleLinkType,
  PuzzleNode,
  PuzzleNodeRunState,
  PuzzlePredicate,
  PuzzlePulseState,
  PuzzleRunState,
  PuzzleTickResult,
  PuzzleWorldSnapshot,
  ReceptorNode,
  RelayNode,
  TimerNode,
  TriggerNode,
  ZoneNode,
} from "./types";

/**
 * Event -> link dispatch table.
 *
 * A link may only run for the event that matches its authored meaning. Link
 * types that are not event-driven (`pulse`, `activate`, `deactivate`, `open`,
 * `close`) are resolved by their dedicated evaluators and never appear here.
 *
 * `satisfies` keeps this exhaustive: adding a new `PuzzleEventType` is a
 * compile error until its dispatch is decided.
 */
export const EVENT_LINKS = {
  pulse: [],
  pulseArrived: [],
  receptorBound: ["bind"],
  receptorRejected: [],
  platePress: ["press", "start"],
  plateRelease: ["release", "stop"],
  zoneEnter: ["enter", "start"],
  zoneExit: ["exit", "stop"],
  triggerFired: ["increment", "start"],
  timerElapsed: ["elapsed", "reset"],
  counterReached: ["reached"],
  gateOpen: [],
  gateClose: [],
  relayActive: [],
  relayInactive: [],
  solved: [],
} satisfies Record<PuzzleEventType, readonly PuzzleLinkType[]>;

function initialState(node: PuzzleNode): PuzzleNodeRunState {
  const base: PuzzleNodeRunState = {
    state: "idle",
    active: false,
    count: 0,
    remaining: 0,
    fired: false,
    occupiedBy: null,
  };

  switch (node.type) {
    case "prop":
      return { ...base, state: "free" };
    case "receptor":
      return { ...base, state: "idle" };
    case "pulseSource":
      return { ...base, state: "idle" };
    case "plate":
      return { ...base, state: "released" };
    case "relay":
      return { ...base, state: "inactive" };
    case "gate":
      return {
        ...base,
        state: node.initial,
        active: node.initial === "open",
      };
    case "timer":
      return { ...base, state: "idle", remaining: node.durationTicks };
    case "counter":
      return { ...base, state: "idle" };
    case "zone":
      return { ...base, state: "empty" };
    case "trigger":
      return { ...base, state: "idle" };
    default:
      return base;
  }
}

function intersects(
  actor: { x: number; y: number; width: number; height: number },
  rect: { x: number; y: number; width: number; height: number },
): boolean {
  const left = actor.x - actor.width / 2;
  const right = actor.x + actor.width / 2;
  const top = actor.y - actor.height / 2;
  const bottom = actor.y + actor.height / 2;
  return (
    left < rect.x + rect.width &&
    right > rect.x &&
    top < rect.y + rect.height &&
    bottom > rect.y
  );
}

/**
 * Pure puzzle graph evaluator.
 *
 * The runtime owns graph state, win conditions, reset, and evidence counters.
 * It never touches the physics world, rendering, pack loading, or the DOM.
 * A world snapshot is the only input beyond the authored document.
 */
export class PuzzleRuntime {
  readonly document: PuzzleDocument;

  private tickCount = 0;
  private solved = false;
  private nodes = new Map<string, PuzzleNodeRunState>();
  private counters = new Map<string, number>();
  private pulses: PuzzlePulseState[] = [];
  private lastError: string | null = null;

  constructor(document: PuzzleDocument) {
    this.document = document;
    this.resetToInitial();
  }

  /** Reset is unavailable after a solve; the puzzle stays latched. */
  canReset(): boolean {
    return !this.solved;
  }

  isSolved(): boolean {
    return this.solved;
  }

  get tick(): number {
    return this.tickCount;
  }

  note(counter: string, amount = 1): void {
    const current = this.counters.get(counter) ?? 0;
    this.counters.set(counter, current + amount);
  }

  evidenceCounters(): Record<string, number> {
    return Object.fromEntries(this.counters);
  }

  nodeState(nodeId: string): PuzzleNodeRunState | undefined {
    const state = this.nodes.get(nodeId);
    return state ? { ...state } : undefined;
  }

  hasNode(nodeId: string): boolean {
    return this.nodes.has(nodeId);
  }

  /**
   * Fires a pulse from a source. Proximity, input, and ability checks belong to
   * the game runtime; this method only enforces the source cooldown.
   */
  usePulse(sourceId: string, actorId?: string): boolean {
    const node = this.findNode(sourceId);
    if (!node || node.type !== "pulseSource") {
      return false;
    }
    const state = this.nodes.get(sourceId);
    if (!state || state.remaining > 0) {
      return false;
    }

    state.remaining = Math.max(0, node.cooldownTicks);
    state.state = state.remaining > 0 ? "cooldown" : "idle";
    this.pulses.push({
      sourceId,
      remainingTicks: Math.max(1, node.travelTicks),
      ...(actorId ? { actorId } : {}),
    });
    this.note("pulses");
    return true;
  }

  reset(): boolean {
    if (this.solved) {
      return false;
    }
    this.resetToInitial();
    return true;
  }

  snapshot(): PuzzleRunState {
    return {
      puzzleId: this.document.id,
      tick: this.tickCount,
      solved: this.solved,
      nodes: Object.fromEntries(
        [...this.nodes.entries()].map(([id, state]) => [id, { ...state }]),
      ),
      counters: Object.fromEntries(this.counters),
      pulses: this.pulses.map((pulse) => ({ ...pulse })),
      lastError: this.lastError,
    };
  }

  restore(state: PuzzleRunState): void {
    if (state.puzzleId !== this.document.id) {
      throw new Error(
        `PUZZLE_STATE_MISMATCH: expected ${this.document.id}, got ${state.puzzleId}`,
      );
    }

    this.tickCount = Math.max(0, state.tick);
    this.solved = state.solved === true;
    this.counters = new Map(Object.entries(state.counters ?? {}));
    this.pulses = (state.pulses ?? []).map((pulse) => ({ ...pulse }));
    this.lastError = state.lastError ?? null;

    this.nodes = new Map();
    for (const node of this.document.nodes) {
      const saved = state.nodes?.[node.id];
      const fallback = initialState(node);
      this.nodes.set(node.id, {
        state: typeof saved?.state === "string" ? saved.state : fallback.state,
        active:
          typeof saved?.active === "boolean" ? saved.active : fallback.active,
        count: Number.isFinite(saved?.count) ? Number(saved?.count) : 0,
        remaining: Number.isFinite(saved?.remaining)
          ? Number(saved?.remaining)
          : fallback.remaining,
        fired: saved?.fired === true,
        occupiedBy:
          typeof saved?.occupiedBy === "string" ? saved.occupiedBy : null,
      });
    }
  }

  /**
   * Advances the graph by one fixed tick.
   *
   * Order: cooldowns and timers -> sensors -> pulse arrivals -> event links ->
   * relays -> gates -> win. This is deliberately a single deterministic pass;
   * the relay order is topologically sorted so downstream relays see upstream
   * state in the same tick.
   */
  tickResult(snapshot: PuzzleWorldSnapshot): PuzzleTickResult {
    this.tickCount += 1;
    this.lastError = null;

    const queue: PuzzleEvent[] = [];
    const output: PuzzleEvent[] = [];
    const repeatTimers = new Set<string>();

    this.advanceCooldowns();
    this.advanceTimers(queue, repeatTimers);
    this.updateSensors(snapshot, queue);
    this.updateReceptors(snapshot);
    this.arrivePulses(queue);

    const emitted = new Set<string>();
    this.drainEvents(queue, emitted, output);
    this.evaluateRelays(queue);
    this.drainEvents(queue, emitted, output);
    this.evaluateGates(queue);
    this.drainEvents(queue, emitted, output);

    const solvedNow = !this.solved && this.evaluate(this.document.win, snapshot);
    if (solvedNow) {
      this.solved = true;
      output.push({ type: "solved", nodeId: this.document.id });
    }

    for (const timerId of repeatTimers) {
      const timer = this.nodes.get(timerId);
      const node = this.findNode(timerId);
      if (timer && node?.type === "timer") {
        timer.state = "running";
        timer.active = false;
        timer.remaining = node.durationTicks;
      }
    }

    return {
      events: output,
      solvedNow,
      rewards: solvedNow ? { ...this.document.rewards } : {},
    };
  }

  /* ---------------------------------------------------------------- */
  /* Internal                                                         */
  /* ---------------------------------------------------------------- */

  private resetToInitial(): void {
    this.tickCount = 0;
    this.solved = false;
    this.pulses = [];
    this.lastError = null;
    this.nodes = new Map(
      this.document.nodes.map((node) => [node.id, initialState(node)]),
    );
  }

  private findNode(nodeId: string): PuzzleNode | undefined {
    return this.document.nodes.find((node) => node.id === nodeId);
  }

  private advanceCooldowns(): void {
    for (const node of this.document.nodes) {
      if (node.type !== "pulseSource") continue;
      const state = this.nodes.get(node.id);
      if (!state) continue;
      if (state.remaining > 0) {
        state.remaining -= 1;
        if (state.remaining === 0) {
          state.state = "idle";
        }
      }
    }
  }

  private advanceTimers(
    events: PuzzleEvent[],
    repeatTimers: Set<string>,
  ): void {
    for (const node of this.document.nodes) {
      if (node.type !== "timer") continue;
      const state = this.nodes.get(node.id);
      if (!state || state.state !== "running") continue;

      state.remaining -= 1;
      if (state.remaining > 0) continue;

      state.state = "elapsed";
      state.active = true;
      state.remaining = 0;
      events.push({ type: "timerElapsed", nodeId: node.id });
      if (node.repeat) {
        repeatTimers.add(node.id);
      }
    }
  }

  private updateSensors(
    snapshot: PuzzleWorldSnapshot,
    events: PuzzleEvent[],
  ): void {
    for (const node of this.document.nodes) {
      if (node.type === "plate") {
        this.updatePlate(node, snapshot, events);
      } else if (node.type === "zone") {
        this.updateZone(node, snapshot, events);
      } else if (node.type === "prop") {
        this.updatePropNode(node, snapshot);
      }
    }
  }

  private countActors(
    node: PlateNode | ZoneNode,
    snapshot: PuzzleWorldSnapshot,
  ): number {
    let count = 0;
    if (node.detects.includes("player")) {
      for (const player of snapshot.players) {
        if (player.active && intersects(player, node.rect)) {
          count += 1;
        }
      }
    }
    if (node.detects.includes("prop")) {
      for (const prop of snapshot.props) {
        if (!prop.active) continue;
        if (prop.state === "carried" && !node.countCarried) continue;
        if (intersects(prop, node.rect)) {
          count += 1;
        }
      }
    }
    return count;
  }

  private updatePlate(
    node: PlateNode,
    snapshot: PuzzleWorldSnapshot,
    events: PuzzleEvent[],
  ): void {
    const state = this.nodes.get(node.id);
    if (!state) return;
    const pressed = this.countActors(node, snapshot) >= node.minimum;
    if (pressed === state.active) return;

    state.active = pressed;
    state.state = pressed ? "pressed" : "released";
    events.push({
      type: pressed ? "platePress" : "plateRelease",
      nodeId: node.id,
    });
  }

  private updateZone(
    node: ZoneNode,
    snapshot: PuzzleWorldSnapshot,
    events: PuzzleEvent[],
  ): void {
    const state = this.nodes.get(node.id);
    if (!state) return;
    const occupied = this.countActors(node, snapshot) >= node.minimum;
    if (occupied === state.active) return;

    state.active = occupied;
    state.state = occupied ? "occupied" : "empty";
    events.push({
      type: occupied ? "zoneEnter" : "zoneExit",
      nodeId: node.id,
    });
  }

  private updatePropNode(
    node: PropNode,
    snapshot: PuzzleWorldSnapshot,
  ): void {
    const state = this.nodes.get(node.id);
    if (!state) return;
    const prop = snapshot.props.find(
      (entry) => entry.id === node.entityId || entry.id === node.id,
    );
    if (!prop) return;
    state.state = prop.state;
    state.active = prop.state !== "free";
  }

  private updateReceptors(snapshot: PuzzleWorldSnapshot): void {
    for (const node of this.document.nodes) {
      if (node.type !== "receptor") continue;
      const state = this.nodes.get(node.id);
      if (!state || state.state === "bound") continue;

      const prop = snapshot.props.find(
        (entry) =>
          (entry.state === "placed" || entry.state === "docked") &&
          intersects(entry, node.rect),
      );
      if (!prop) {
        state.occupiedBy = null;
        state.state = "idle";
        state.active = false;
        continue;
      }

      const propNode = this.document.nodes.find(
        (entry): entry is PropNode =>
          entry.type === "prop" && entry.entityId === prop.id,
      );
      state.occupiedBy = propNode?.id ?? prop.id;
      state.state = "occupied";
      state.active = false;
    }
  }

  private arrivePulses(events: PuzzleEvent[]): void {
    const remaining: PuzzlePulseState[] = [];

    for (const pulse of this.pulses) {
      pulse.remainingTicks -= 1;
      if (pulse.remainingTicks > 0) {
        remaining.push(pulse);
        continue;
      }

      events.push({
        type: "pulseArrived",
        nodeId: pulse.sourceId,
        ...(pulse.actorId ? { actorId: pulse.actorId } : {}),
      });

      const links = this.document.links.filter(
        (link) => link.from === pulse.sourceId && link.type === "pulse",
      );
      for (const link of links) {
        const target = this.findNode(link.to);
        if (target?.type !== "receptor") continue;
        this.resolvePulse(target, events);
      }
    }

    this.pulses = remaining;
  }

  private resolvePulse(
    receptor: ReceptorNode,
    events: PuzzleEvent[],
  ): void {
    const receptorState = this.nodes.get(receptor.id);
    if (!receptorState || receptorState.state === "bound") return;

    const propId = receptorState.occupiedBy;
    if (!propId) {
      events.push({
        type: "receptorRejected",
        nodeId: receptor.id,
        message: "no prop on receptor",
      });
      return;
    }

    const prop = this.findNode(propId);
    if (!prop || prop.type !== "prop") return;

    const tagOk =
      receptor.accepts.tag === undefined ||
      prop.tags.includes(receptor.accepts.tag);
    const shapeOk =
      receptor.accepts.shape === undefined ||
      prop.shape === receptor.accepts.shape;

    if (!tagOk || !shapeOk) {
      events.push({
        type: "receptorRejected",
        nodeId: receptor.id,
        propId,
        message: "shape or tag does not fit",
      });
      this.note("wrongReceptor");
      return;
    }

    receptorState.state = "bound";
    receptorState.active = true;
    const propState = this.nodes.get(propId);
    if (propState) {
      propState.state = "docked";
      propState.active = true;
    }
    events.push({
      type: "receptorBound",
      nodeId: receptor.id,
      propId,
    });
  }

  private drainEvents(
    events: PuzzleEvent[],
    emitted: Set<string>,
    output: PuzzleEvent[],
  ): void {
    let guard = 0;
    while (events.length > 0 && guard < 128) {
      guard += 1;
      const event = events.shift();
      if (!event) break;
      const signature = `${event.type}:${event.nodeId}:${event.propId ?? ""}`;
      if (emitted.has(signature)) continue;
      emitted.add(signature);
      output.push(event);

      const allowed: readonly PuzzleLinkType[] = EVENT_LINKS[event.type];
      if (allowed.length === 0) continue;

      for (const link of this.document.links) {
        if (link.from !== event.nodeId) continue;
        if (!allowed.includes(link.type)) continue;
        this.applyLink(link, events);
      }
    }
  }

  private applyLink(link: PuzzleLink, events: PuzzleEvent[]): void {
    const target = this.findNode(link.to);
    if (!target) return;

    switch (target.type) {
      case "trigger":
        this.fireTrigger(target, events);
        break;
      case "timer":
        this.applyTimerAction(target, link.type);
        break;
      case "counter":
        this.applyCounterAction(target, link.type, events);
        break;
      case "gate":
        this.setGate(target, link.type === "close" ? "close" : "open", events);
        break;
      default:
        break;
    }
  }

  private fireTrigger(
    trigger: TriggerNode,
    events: PuzzleEvent[],
  ): void {
    const state = this.nodes.get(trigger.id);
    if (!state) return;
    if (trigger.once && state.fired) return;

    state.fired = true;
    state.active = true;
    state.state = "fired";
    events.push({ type: "triggerFired", nodeId: trigger.id });
  }

  private applyTimerAction(
    timer: TimerNode,
    linkType: PuzzleLinkType,
  ): void {
    const state = this.nodes.get(timer.id);
    if (!state) return;

    if (linkType === "stop") {
      state.state = "stopped";
      state.active = false;
      return;
    }
    if (linkType === "reset") {
      state.state = "idle";
      state.active = false;
      state.remaining = timer.durationTicks;
      return;
    }
    // Recovery invariant: only a running timer ignores a new start. An
    // elapsed or stopped one-shot timer must always be re-armable.
    if (state.state === "running") {
      return;
    }
    state.state = "running";
    state.active = false;
    state.remaining = timer.durationTicks;
  }

  private applyCounterAction(
    counter: CounterNode,
    linkType: string,
    events: PuzzleEvent[],
  ): void {
    const state = this.nodes.get(counter.id);
    if (!state) return;

    if (linkType === "reset") {
      state.count = 0;
      state.active = false;
      state.state = "idle";
      return;
    }
    if (linkType !== "increment") return;

    state.count += 1;
    const reached =
      counter.comparison === "=="
        ? state.count === counter.target
        : state.count >= counter.target;
    if (!reached || state.active) return;

    state.active = true;
    state.state = "reached";
    events.push({ type: "counterReached", nodeId: counter.id });
  }

  private setGate(
    gate: GateNode,
    action: "open" | "close",
    events: PuzzleEvent[],
  ): void {
    const state = this.nodes.get(gate.id);
    if (!state) return;

    if (action === "open") {
      if (state.state === "open") return;
      state.state = "open";
      state.active = true;
      events.push({ type: "gateOpen", nodeId: gate.id });
      return;
    }

    if (state.state !== "open") return;
    if (gate.latched) return;
    state.state = "closed";
    state.active = false;
    events.push({ type: "gateClose", nodeId: gate.id });
  }

  private evaluateRelays(events: PuzzleEvent[]): void {
    for (const relay of this.orderedRelays()) {
      const state = this.nodes.get(relay.id);
      if (!state) continue;

      const inputs = this.document.links
        .filter(
          (link) =>
            link.to === relay.id &&
            (link.type === "activate" || link.type === "deactivate"),
        )
        .map((link) => {
          const source = this.nodes.get(link.from);
          const active = source?.active === true;
          return link.type === "deactivate" ? !active : active;
        });

      let active: boolean;
      if (relay.mode === "allOf") {
        active = inputs.length > 0 && inputs.every(Boolean);
      } else if (relay.mode === "anyOf") {
        active = inputs.some(Boolean);
      } else {
        active = !inputs.some(Boolean);
      }

      if (active === state.active) continue;
      state.active = active;
      state.state = active ? "active" : "inactive";
      events.push({
        type: active ? "relayActive" : "relayInactive",
        nodeId: relay.id,
      });
    }
  }

  private orderedRelays(): RelayNode[] {
    const relays = this.document.nodes.filter(
      (node): node is RelayNode => node.type === "relay",
    );
    const byId = new Map(relays.map((relay) => [relay.id, relay]));
    const visited = new Set<string>();
    const visiting = new Set<string>();
    const ordered: RelayNode[] = [];

    const visit = (relay: RelayNode): void => {
      if (visited.has(relay.id) || visiting.has(relay.id)) return;
      visiting.add(relay.id);
      for (const link of this.document.links) {
        if (link.to !== relay.id) continue;
        if (link.type !== "activate" && link.type !== "deactivate") continue;
        const source = byId.get(link.from);
        if (source) visit(source);
      }
      visiting.delete(relay.id);
      visited.add(relay.id);
      ordered.push(relay);
    };

    for (const relay of relays) {
      visit(relay);
    }
    return ordered;
  }

  private evaluateGates(events: PuzzleEvent[]): void {
    for (const node of this.document.nodes) {
      if (node.type !== "gate") continue;
      const state = this.nodes.get(node.id);
      if (!state) continue;

      const open = this.document.links.some(
        (link) =>
          link.to === node.id &&
          link.type === "open" &&
          this.nodes.get(link.from)?.active === true,
      );
      const close = this.document.links.some(
        (link) =>
          link.to === node.id &&
          link.type === "close" &&
          this.nodes.get(link.from)?.active === true,
      );

      // Open-before-close is the recovery invariant: an elapsed Ca²⁺ timer
      // must be able to reopen the gate even while a close source such as the
      // AChE clearance timer is still active.
      if (open) {
        this.setGate(node, "open", events);
      } else if (close) {
        this.setGate(node, "close", events);
      }
    }
  }

  private evaluate(
    predicate: PuzzlePredicate,
    snapshot: PuzzleWorldSnapshot,
  ): boolean {
    switch (predicate.type) {
      case "gateOpen":
        return this.nodes.get(predicate.gateId)?.state === "open";
      case "receptorBound":
        return this.nodes.get(predicate.receptorId)?.state === "bound";
      case "platePressed":
        return this.nodes.get(predicate.plateId)?.active === true;
      case "relayActive":
        return this.nodes.get(predicate.relayId)?.active === true;
      case "timerElapsed":
        return this.nodes.get(predicate.timerId)?.state === "elapsed";
      case "counterReached":
        return this.nodes.get(predicate.counterId)?.active === true;
      case "zoneOccupied":
        return this.nodes.get(predicate.zoneId)?.active === true;
      case "propState":
        return this.nodes.get(predicate.propId)?.state === predicate.state;
      case "flagSet":
        return snapshot.flags?.[predicate.flagId] === true;
      case "allOf":
        return predicate.of.every((item) => this.evaluate(item, snapshot));
      case "anyOf":
        return predicate.of.some((item) => this.evaluate(item, snapshot));
      case "not":
        return !this.evaluate(predicate.of, snapshot);
      default:
        return false;
    }
  }
}

/** Convenience wrapper used by the headless solution harness and tests. */
export function createPuzzleRuntime(document: PuzzleDocument): PuzzleRuntime {
  return new PuzzleRuntime(document);
}
