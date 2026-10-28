import {
  createEcsWorld,
  createEntityId,
  type ComponentType,
  type EcsWorld,
  type EntityId,
  type TickContext,
} from "../ecs";
import {
  Accessibility,
  ActorRef,
  Anchor,
  Content,
  CueState as CueStateComponent,
  Effects,
  Lifetime,
  Ownership,
  Presentation,
  Priority,
  Reason,
  SourceRef,
  State,
  Visual,
} from "./components";
import { deriveBeats } from "./beats";
import {
  defaultSeverity,
  defaultSurfacePriority,
  nodeAnchor,
  nodeLabel,
  NODE_FEEDBACK,
} from "./descriptors";
import { projectFact } from "./facts";
import type {
  CueState,
  EffectPlan,
  FeedbackBeat,
  FeedbackCue,
  FeedbackCueSpec,
  FeedbackDirector,
  FeedbackDirectorOptions,
  FeedbackFact,
  FeedbackFrame,
  FeedbackProjection,
  FeedbackProjectionContext,
  FeedbackSurface,
  FeedbackSurfaceSpec,
  FeedbackView,
  NodeFeedbackDescriptor,
} from "./types";

interface FeedbackTickPayload {
  facts?: readonly FeedbackFact[];
}

const DEFAULT_CUE_TTL_TICKS = 180;
const DEFAULT_CUE_PRIORITY = 50;

function compareText(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

/**
 * Stable ordering for the render frame.
 *
 * Surfaces are deduped by ID and sorted by priority then ID. Cues are deduped
 * by cause (highest priority, newest sequence wins) and sorted by priority then
 * sequence. The function is pure so the order is directly testable.
 */
export function orderAndDedupe(
  surfaces: readonly FeedbackSurface[],
  cues: readonly FeedbackCue[],
): { surfaces: FeedbackSurface[]; cues: FeedbackCue[] } {
  const surfaceById = new Map<string, FeedbackSurface>();
  for (const surface of surfaces) {
    surfaceById.set(surface.id, surface);
  }

  const cueByCause = new Map<string, FeedbackCue>();
  for (const cue of cues) {
    const existing = cueByCause.get(cue.cause);
    if (
      !existing ||
      cue.priority > existing.priority ||
      (cue.priority === existing.priority && cue.seq > existing.seq)
    ) {
      cueByCause.set(cue.cause, cue);
    }
  }

  return {
    surfaces: [...surfaceById.values()].sort(
      (left, right) =>
        right.priority - left.priority || compareText(left.id, right.id),
    ),
    cues: [...cueByCause.values()].sort(
      (left, right) =>
        right.priority - left.priority || left.seq - right.seq,
    ),
  };
}

function collectEffects(
  surfaces: readonly FeedbackSurface[],
  cues: readonly FeedbackCue[],
): EffectPlan[] {
  const byId = new Map<string, EffectPlan>();
  for (const surface of surfaces) {
    for (const effect of surface.effects ?? []) {
      byId.set(effect.id, effect);
    }
  }
  for (const cue of cues) {
    for (const effect of cue.effects ?? []) {
      byId.set(effect.id, effect);
    }
  }
  return [...byId.values()].sort((left, right) =>
    compareText(left.id, right.id),
  );
}

class FeedbackDirectorImpl implements FeedbackDirector {
  private readonly world: EcsWorld;
  private readonly defaultCueTtlTicks: number;

  private pendingFacts: FeedbackFact[] = [];
  private pendingProjection: FeedbackProjection | null = null;

  private readonly stickyIds = new Set<string>();
  private readonly cueEntityByCause = new Map<string, EntityId>();
  private beats: FeedbackBeat[] = [];
  private document: FeedbackProjection["document"] | undefined;
  private labels: Readonly<Record<string, string>> | undefined;

  private nextCueSeq = 1;
  private tickNumber = 0;
  private frameSeq = 0;
  private lastFrame: FeedbackFrame | null = null;

  constructor(options: FeedbackDirectorOptions = {}) {
    this.defaultCueTtlTicks =
      options.defaultCueTtlTicks ?? DEFAULT_CUE_TTL_TICKS;
    this.world = createEcsWorld();
    this.registerSystems();
  }

  ingest(fact: FeedbackFact): void {
    this.pendingFacts.push(fact);
  }

  ingestAll(facts: readonly FeedbackFact[]): void {
    this.pendingFacts.push(...facts);
  }

  projectSticky(input: FeedbackProjection): void {
    if (input.state.puzzleId !== input.document.id) {
      throw new Error(
        `FEEDBACK_PROJECTION_MISMATCH: expected ${input.document.id}, got ${input.state.puzzleId}`,
      );
    }
    this.document = input.document;
    this.labels = this.labelsFromOverrides(input.overrides);
    this.pendingProjection = input;
  }

  tick(dt: number): void {
    const facts = this.pendingFacts;
    this.pendingFacts = [];
    this.world.tick(dt, { facts });
    this.tickNumber += 1;
    this.frameSeq += 1;
  }

  view(): FeedbackView {
    return this.buildView();
  }

  frame(): FeedbackFrame {
    this.world.frame({});
    return this.lastFrame ?? this.buildFrame();
  }

  reset(): void {
    for (const entity of this.world.query()) {
      this.world.despawn(entity);
    }
    this.pendingFacts = [];
    this.pendingProjection = null;
    this.stickyIds.clear();
    this.cueEntityByCause.clear();
    this.beats = [];
    this.document = undefined;
    this.labels = undefined;
    this.nextCueSeq = 1;
    this.tickNumber = 0;
    this.frameSeq = 0;
    this.lastFrame = null;
  }

  private registerSystems(): void {
    this.world.addSystem({
      name: "IngestFacts",
      phase: "tick",
      run: (_world, context) => {
        const payload = context as TickContext & FeedbackTickPayload;
        this.ingestFacts(payload.facts ?? []);
      },
    });

    this.world.addSystem({
      name: "ProjectSticky",
      phase: "tick",
      run: () => {
        const projection = this.pendingProjection;
        if (!projection) return;
        this.pendingProjection = null;
        this.rebuildSticky(projection);
      },
    });

    this.world.addSystem({
      name: "LifetimeTick",
      phase: "tick",
      run: () => this.lifetimeTick(),
    });

    this.world.addSystem({
      name: "OrderAndDedupe",
      phase: "frame",
      run: () => {
        this.lastFrame = this.buildFrame();
      },
    });
  }

  private ingestFacts(facts: readonly FeedbackFact[]): void {
    for (const fact of facts) {
      const spec = projectFact(fact, {
        ...(this.document ? { document: this.document } : {}),
        ...(this.labels ? { labels: this.labels } : {}),
        defaultTtlTicks: this.defaultCueTtlTicks,
      });
      if (spec) {
        this.addCue(spec);
      }
    }
  }

  private labelsFromOverrides(
    overrides: FeedbackProjection["overrides"],
  ): Readonly<Record<string, string>> | undefined {
    if (!overrides) return undefined;

    const labels: Record<string, string> = {};
    for (const [nodeId, override] of Object.entries(overrides)) {
      if (override.label) {
        labels[nodeId] = override.label;
      }
    }
    return Object.keys(labels).length > 0 ? labels : undefined;
  }

  private rebuildSticky(input: FeedbackProjection): void {
    const seen = new Set<string>();

    for (const node of input.document.nodes) {
      const nodeState = input.state.nodes[node.id];
      if (!nodeState) continue;

      const override = input.overrides?.[node.id];
      const context: FeedbackProjectionContext = {
        anchor: nodeAnchor(node),
        label: override?.label ?? nodeLabel(node.id),
        ...(override?.text ? { text: override.text } : {}),
        ...(override?.effectPreset
          ? { effectPreset: override.effectPreset }
          : {}),
      };
      const descriptor = NODE_FEEDBACK[node.type] as NodeFeedbackDescriptor;
      const specs = descriptor.project(node, nodeState, context);

      for (const spec of specs) {
        const id = spec.id ?? `fb:${spec.capability}:${node.id}`;
        if (seen.has(id)) {
          throw new Error(`FEEDBACK_DUPLICATE_SURFACE_ID: ${id}`);
        }
        seen.add(id);
        this.upsertSurface(id, spec);
      }
    }

    for (const id of this.stickyIds) {
      if (!seen.has(id)) {
        this.world.despawn(createEntityId(id));
      }
    }
    this.stickyIds.clear();
    for (const id of seen) {
      this.stickyIds.add(id);
    }

    this.beats = deriveBeats({
      document: input.document,
      state: input.state,
      ...(input.beats ? { beats: input.beats } : {}),
      ...(this.labels ? { labels: this.labels } : {}),
    });
  }

  private upsertSurface(id: string, spec: FeedbackSurfaceSpec): void {
    const surface = this.normalizeSurface(id, spec);
    const entity = createEntityId(id);
    const exists =
      this.stickyIds.has(id) &&
      this.world.get(entity, SourceRef) !== undefined;
    if (!exists) {
      this.world.spawn(entity);
    }

    this.world.add(entity, SourceRef, surface.source);
    this.world.add(entity, ActorRef, surface.actor);
    this.world.add(entity, Anchor, surface.anchor);
    this.world.add(entity, Presentation, surface.presentation);
    this.world.add(entity, Content, surface.content);
    this.world.add(entity, Ownership, {
      owner: surface.owner,
      audience: surface.audience,
      interaction: surface.interaction,
    });
    this.world.add(entity, Lifetime, surface.lifetime);
    this.world.add(entity, Priority, surface.priority);
    this.world.add(entity, Visual, { severity: surface.severity });
    this.world.add(entity, Accessibility, surface.a11y);
    this.world.add(entity, State, surface.state);

    if (surface.reason) {
      this.world.add(entity, Reason, surface.reason);
    } else {
      this.world.remove(entity, Reason);
    }

    if (surface.effects && surface.effects.length > 0) {
      this.world.add(entity, Effects, surface.effects);
    } else {
      this.world.remove(entity, Effects);
    }
  }

  private normalizeSurface(
    id: string,
    spec: FeedbackSurfaceSpec,
  ): FeedbackSurface {
    const actor = spec.actor ?? null;
    const owner = spec.owner ?? actor ?? "shared";
    const text = spec.content.text;

    return {
      id,
      source: spec.source,
      actor,
      owner,
      audience: spec.audience ?? "both",
      anchor: spec.anchor,
      presentation: spec.presentation,
      content: spec.content,
      state: spec.state,
      ...(spec.reason ? { reason: spec.reason } : {}),
      severity: spec.severity ?? defaultSeverity(spec.state),
      lifetime: spec.lifetime ?? { sticky: true },
      interaction: spec.interaction ?? {
        mode: "none",
        focus: "soft",
        movement: "free",
      },
      priority:
        spec.priority ?? defaultSurfacePriority(spec.capability),
      a11y: spec.a11y ?? {
        announce: false,
        ...(text ? { textAlternative: text } : {}),
      },
      ...(spec.effects && spec.effects.length > 0
        ? { effects: spec.effects }
        : {}),
    };
  }

  private addCue(spec: FeedbackCueSpec): void {
    const existing = this.cueEntityByCause.get(spec.cause);
    if (existing) {
      this.world.despawn(existing);
      this.cueEntityByCause.delete(spec.cause);
    }

    const seq = this.nextCueSeq;
    this.nextCueSeq += 1;
    const id = `fb:cue:${seq}`;
    const entity = createEntityId(id);
    const actor = spec.actor ?? null;
    const owner = spec.owner ?? actor ?? "shared";
    const ttlTicks = spec.ttlTicks ?? this.defaultCueTtlTicks;
    const text = spec.content.text;
    const cue: FeedbackCue = {
      id,
      seq,
      cause: spec.cause,
      source: spec.source,
      actor,
      owner,
      audience: spec.audience ?? "both",
      anchor: spec.anchor,
      presentation: spec.presentation,
      content: spec.content,
      state: spec.state,
      ...(spec.reason ? { reason: spec.reason } : {}),
      severity: spec.severity ?? defaultSeverity(spec.state),
      priority: spec.priority ?? DEFAULT_CUE_PRIORITY,
      ttlTicks,
      remainingTicks: ttlTicks,
      a11y: spec.a11y ?? {
        announce: true,
        ...(text ? { textAlternative: text } : {}),
      },
      ...(spec.effects && spec.effects.length > 0
        ? { effects: spec.effects }
        : {}),
    };

    this.world.spawn(entity);
    this.world.add(entity, SourceRef, cue.source);
    this.world.add(entity, ActorRef, cue.actor);
    this.world.add(entity, Anchor, cue.anchor);
    this.world.add(entity, Presentation, cue.presentation);
    this.world.add(entity, Content, cue.content);
    this.world.add(entity, Ownership, {
      owner: cue.owner,
      audience: cue.audience,
      interaction: { mode: "none", focus: "soft", movement: "free" },
    });
    this.world.add(entity, Lifetime, {
      sticky: false,
      ttlTicks: cue.ttlTicks,
    });
    this.world.add(entity, Priority, cue.priority);
    this.world.add(entity, Visual, { severity: cue.severity });
    this.world.add(entity, Accessibility, cue.a11y);
    this.world.add(entity, State, cue.state);
    if (cue.reason) {
      this.world.add(entity, Reason, cue.reason);
    }
    if (cue.effects) {
      this.world.add(entity, Effects, cue.effects);
    }
    this.world.add(entity, CueStateComponent, {
      seq: cue.seq,
      cause: cue.cause,
      ttlTicks: cue.ttlTicks,
      remainingTicks: cue.remainingTicks,
    });

    this.cueEntityByCause.set(cue.cause, entity);
  }

  private lifetimeTick(): void {
    for (const entity of this.world.query(CueStateComponent)) {
      const cueState = this.world.get(entity, CueStateComponent);
      if (!cueState) continue;

      const remainingTicks = cueState.remainingTicks - 1;
      if (remainingTicks <= 0) {
        this.world.despawn(entity);
        this.cueEntityByCause.delete(cueState.cause);
        continue;
      }

      this.world.add(entity, CueStateComponent, {
        ...cueState,
        remainingTicks,
      });
      this.world.add(entity, Lifetime, {
        sticky: false,
        ttlTicks: cueState.ttlTicks,
      });
    }
  }

  private buildView(): FeedbackView {
    const surfaces: FeedbackSurface[] = [];
    const cues: FeedbackCue[] = [];

    const entities = this.world.query(
      SourceRef,
      Anchor,
      Presentation,
      Content,
      Ownership,
      Lifetime,
      Priority,
      Visual,
      Accessibility,
      State,
    );

    for (const entity of entities) {
      const cueState = this.world.get(entity, CueStateComponent);
      if (cueState) {
        cues.push(this.readCue(entity, cueState));
      } else {
        surfaces.push(this.readSurface(entity));
      }
    }

    const ordered = orderAndDedupe(surfaces, cues);
    return {
      surfaces: ordered.surfaces,
      cues: ordered.cues,
      beats: [...this.beats],
    };
  }

  private readSurface(entity: EntityId): FeedbackSurface {
    const ownership = this.required(entity, Ownership, "ownership");
    const visual = this.required(entity, Visual, "visual");
    const content = this.required(entity, Content, "content");
    const reason = this.world.get(entity, Reason) ?? undefined;
    const effects = this.world.get(entity, Effects);

    return {
      id: entity,
      source: this.required(entity, SourceRef, "source"),
      actor: this.world.get(entity, ActorRef) ?? null,
      owner: ownership.owner,
      audience: ownership.audience,
      anchor: this.required(entity, Anchor, "anchor"),
      presentation: this.required(entity, Presentation, "presentation"),
      content,
      state: this.required(entity, State, "state"),
      ...(reason ? { reason } : {}),
      severity: visual.severity,
      lifetime: this.required(entity, Lifetime, "lifetime"),
      interaction: ownership.interaction,
      priority: this.required(entity, Priority, "priority"),
      a11y: this.required(entity, Accessibility, "accessibility"),
      ...(effects ? { effects } : {}),
    };
  }

  private readCue(entity: EntityId, cueState: CueState): FeedbackCue {
    const surface = this.readSurface(entity);
    return {
      id: entity,
      seq: cueState.seq,
      cause: cueState.cause,
      source: surface.source,
      actor: surface.actor,
      owner: surface.owner,
      audience: surface.audience,
      anchor: surface.anchor,
      presentation: surface.presentation,
      content: surface.content,
      state: surface.state,
      ...(surface.reason ? { reason: surface.reason } : {}),
      severity: surface.severity,
      priority: surface.priority,
      ttlTicks: cueState.ttlTicks,
      remainingTicks: cueState.remainingTicks,
      a11y: surface.a11y,
      ...(surface.effects ? { effects: surface.effects } : {}),
    };
  }

  private required<T>(
    entity: EntityId,
    type: ComponentType<T>,
    label: string,
  ): T {
    const value = this.world.get(entity, type);
    if (value === undefined) {
      throw new Error(
        `FEEDBACK_ENTITY_MISSING_COMPONENT: ${label} on ${entity}`,
      );
    }
    return value;
  }

  private buildFrame(): FeedbackFrame {
    const view = this.buildView();
    return {
      seq: this.frameSeq,
      tick: this.tickNumber,
      surfaces: view.surfaces,
      cues: view.cues,
      beats: view.beats,
      effects: collectEffects(view.surfaces, view.cues),
    };
  }
}

export function createFeedbackDirector(
  options: FeedbackDirectorOptions = {},
): FeedbackDirector {
  return new FeedbackDirectorImpl(options);
}
