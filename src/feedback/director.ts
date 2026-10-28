import {
  createEcsWorld,
  createEntityId,
  type ComponentType,
  type EcsWorld,
  type EntityId,
  type TickContext,
} from "../ecs";
import type { PuzzleDocument } from "../puzzle";
import {
  Accessibility,
  ActorRef,
  Anchor,
  Content,
  Conversation as ConversationComponent,
  CueState as CueStateComponent,
  EffectInstance as EffectInstanceComponent,
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
import {
  effectEndTicks,
  isSourceActive,
  persistentCancel,
} from "./effects";
import { projectFact } from "./facts";
import type {
  AnchorRef,
  CueState,
  Direction,
  EffectInstance,
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

function compareEffects(left: EffectInstance, right: EffectInstance): number {
  return compareText(left.id, right.id);
}

function collectAnchors(instance: EffectInstance): AnchorRef[] {
  const anchors: AnchorRef[] = [];
  const add = (anchor: AnchorRef | undefined): void => {
    if (anchor) anchors.push(anchor);
  };
  for (const stage of instance.stages) {
    add(stage.source?.anchor);
    add(stage.binding.attachTo);
    for (const target of stage.targets ?? []) add(target);
    if (
      stage.visual.kind === "spriteSwap" ||
      stage.visual.kind === "tint" ||
      stage.visual.kind === "dissolve" ||
      stage.visual.kind === "decal"
    ) {
      add(stage.visual.target);
    }
    if (stage.path) {
      switch (stage.path.kind) {
        case "point":
          break;
        case "segment":
          add(stage.path.from);
          add(stage.path.to);
          break;
        case "polyline":
          for (const point of stage.path.points) add(point);
          break;
        case "arc":
          add(stage.path.center);
          break;
        case "ray":
          add(stage.path.from);
          addDirectionAnchor(stage.path.direction, add);
          break;
        case "radial":
          add(stage.path.from);
          break;
      }
    }
    if (stage.source?.direction) {
      addDirectionAnchor(stage.source.direction, add);
    }
  }
  return anchors;
}

function addDirectionAnchor(
  direction: Direction,
  add: (anchor: AnchorRef | undefined) => void,
): void {
  if (direction.kind === "toward") {
    add(direction.target);
  } else if (direction.kind === "facing") {
    add({ kind: "entity", id: direction.entityId });
  }
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

class FeedbackDirectorImpl implements FeedbackDirector {
  private readonly world: EcsWorld;
  private readonly defaultCueTtlTicks: number;
  private readonly isAnchorAlive?: (anchor: AnchorRef) => boolean;

  private pendingFacts: FeedbackFact[] = [];
  private readonly pendingProjections = new Map<string, FeedbackProjection>();

  private readonly stickyIds = new Set<string>();
  private readonly cueEntityByCause = new Map<string, EntityId>();
  private readonly effectSignatures = new Map<string, string>();
  private beats: FeedbackBeat[] = [];
  private readonly documents = new Map<string, PuzzleDocument>();
  private readonly labelsByNode = new Map<string, string>();

  private nextCueSeq = 1;
  private tickNumber = 0;
  private frameSeq = 0;
  private lastFrame: FeedbackFrame | null = null;
  private renderedEffects: EffectInstance[] = [];

  constructor(options: FeedbackDirectorOptions = {}) {
    this.defaultCueTtlTicks =
      options.defaultCueTtlTicks ?? DEFAULT_CUE_TTL_TICKS;
    this.isAnchorAlive = options.isAnchorAlive;
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
    // Make the document/labels available to facts ingested before the next
    // ProjectSticky system runs in this tick.
    this.documents.set(input.document.id, input.document);
    this.labelsFromOverrides(input.document.id, input.overrides);
    this.pendingProjections.set(input.document.id, input);
  }

  putSurface(spec: FeedbackSurfaceSpec & { id: string }): void {
    this.upsertSurface(spec.id, spec);
  }

  removeSurface(surfaceId: string): void {
    this.world.despawn(createEntityId(surfaceId));
    this.stickyIds.delete(surfaceId);
    this.effectSignatures.delete(surfaceId);
    this.cancelEffectsForOwner(surfaceId);
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
    this.pendingProjections.clear();
    this.stickyIds.clear();
    this.cueEntityByCause.clear();
    this.effectSignatures.clear();
    this.beats = [];
    this.documents.clear();
    this.labelsByNode.clear();
    this.nextCueSeq = 1;
    this.tickNumber = 0;
    this.frameSeq = 0;
    this.lastFrame = null;
    this.renderedEffects = [];
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
        if (this.pendingProjections.size === 0) return;
        const projections = [...this.pendingProjections.values()];
        this.pendingProjections.clear();
        this.rebuildSticky(projections);
      },
    });

    this.world.addSystem({
      name: "LifetimeTick",
      phase: "tick",
      run: () => this.lifetimeTick(),
    });

    this.world.addSystem({
      name: "EffectSpawn",
      phase: "tick",
      run: () => this.effectSpawn(),
    });

    this.world.addSystem({
      name: "EffectTick",
      phase: "tick",
      run: () => this.effectTick(),
    });

    this.world.addSystem({
      name: "EffectRender",
      phase: "frame",
      run: () => {
        this.renderedEffects = this.world
          .query(EffectInstanceComponent)
          .map((entity) => this.world.get(entity, EffectInstanceComponent))
          .filter((instance): instance is EffectInstance => Boolean(instance))
          .sort(compareEffects);
      },
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
      const document = this.documentForFact(fact);
      const labels = this.labelsForDocument(document);
      const spec = projectFact(fact, {
        ...(document ? { document } : {}),
        ...(labels ? { labels } : {}),
        defaultTtlTicks: this.defaultCueTtlTicks,
      });
      if (spec) {
        this.addCue(spec);
      }
    }
  }

  private documentForFact(fact: FeedbackFact): PuzzleDocument | undefined {
    if (fact.kind === "puzzle.event") {
      if (fact.puzzleId) {
        return this.documents.get(fact.puzzleId);
      }
      for (const document of this.documents.values()) {
        if (document.nodes.some((node) => node.id === fact.event.nodeId)) {
          return document;
        }
      }
    }

    if (fact.kind === "action.outcome" && fact.target) {
      for (const document of this.documents.values()) {
        if (
          document.nodes.some(
            (node) =>
              node.id === fact.target?.id ||
              node.entityId === fact.target?.id,
          )
        ) {
          return document;
        }
      }
    }

    return this.documents.values().next().value as PuzzleDocument | undefined;
  }

  private labelsForDocument(
    document: PuzzleDocument | undefined,
  ): Readonly<Record<string, string>> | undefined {
    if (!document) return undefined;
    const labels: Record<string, string> = {};
    for (const node of document.nodes) {
      const label = this.labelsByNode.get(`${document.id}:${node.id}`);
      if (label) labels[node.id] = label;
    }
    return Object.keys(labels).length > 0 ? labels : undefined;
  }

  private labelsFromOverrides(
    puzzleId: string,
    overrides: FeedbackProjection["overrides"],
  ): void {
    if (!overrides) return;
    for (const [nodeId, override] of Object.entries(overrides)) {
      if (override.label) {
        this.labelsByNode.set(`${puzzleId}:${nodeId}`, override.label);
      }
    }
  }

  private rebuildSticky(inputs: readonly FeedbackProjection[]): void {
    const seen = new Set<string>();
    const beats: FeedbackBeat[] = [];
    const multiple = inputs.length > 1;

    for (const input of inputs) {
      this.documents.set(input.document.id, input.document);
      this.labelsFromOverrides(input.document.id, input.overrides);

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
          const id =
            spec.id ??
            (multiple
              ? `fb:${input.document.id}:${spec.capability}:${node.id}`
              : `fb:${spec.capability}:${node.id}`);
          if (seen.has(id)) {
            throw new Error(`FEEDBACK_DUPLICATE_SURFACE_ID: ${id}`);
          }
          seen.add(id);
          this.upsertSurface(id, spec);
        }
      }

      const projected = deriveBeats({
        document: input.document,
        state: input.state,
        ...(input.beats ? { beats: input.beats } : {}),
        ...(this.labelsForDocument(input.document)
          ? { labels: this.labelsForDocument(input.document) }
          : {}),
      });
      beats.push(
        ...(multiple
          ? projected.map((beat) => ({
              ...beat,
              id: `${input.document.id}:${beat.id}`,
              label: `${input.document.title}: ${beat.label}`,
            }))
          : projected),
      );
    }

    for (const id of this.stickyIds) {
      if (!seen.has(id)) {
        this.world.despawn(createEntityId(id));
        this.effectSignatures.delete(id);
        this.cancelEffectsForOwner(id);
      }
    }
    this.stickyIds.clear();
    for (const id of seen) {
      this.stickyIds.add(id);
    }

    this.beats = beats;
  }

  private upsertSurface(id: string, spec: FeedbackSurfaceSpec): void {
    const surface = this.normalizeSurface(id, spec);
    const entity = createEntityId(id);
    const exists = this.world.get(entity, SourceRef) !== undefined;
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

    if (surface.conversation) {
      this.world.add(entity, ConversationComponent, surface.conversation);
    } else {
      this.world.remove(entity, ConversationComponent);
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
      ...(spec.conversation ? { conversation: spec.conversation } : {}),
    };
  }

  private addCue(spec: FeedbackCueSpec): void {
    const existing = this.cueEntityByCause.get(spec.cause);
    if (existing) {
      this.world.despawn(existing);
      this.cueEntityByCause.delete(spec.cause);
      this.effectSignatures.delete(existing);
      this.cancelEffectsForOwner(existing);
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
        this.effectSignatures.delete(entity);
        this.cancelEffectsForOwner(entity);
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

  private effectSpawn(): void {
    const desired = new Map<
      string,
      { signature: string; plans: readonly EffectPlan[] }
    >();
    for (const entity of this.world.query(Effects, State)) {
      const plans = this.world.get(entity, Effects) ?? [];
      desired.set(entity, {
        signature: JSON.stringify(plans),
        plans,
      });
    }

    const instancesByOwner = new Map<string, EntityId[]>();
    for (const entity of this.world.query(EffectInstanceComponent)) {
      const instance = this.world.get(entity, EffectInstanceComponent);
      if (!instance) continue;
      const list = instancesByOwner.get(instance.ownerSurfaceId) ?? [];
      list.push(entity);
      instancesByOwner.set(instance.ownerSurfaceId, list);
    }

    for (const [ownerId, entities] of instancesByOwner) {
      const next = desired.get(ownerId);
      const signature = this.effectSignatures.get(ownerId);
      if (!next || signature !== next.signature) {
        for (const entity of entities) this.world.despawn(entity);
        if (!next) this.effectSignatures.delete(ownerId);
      }
    }

    for (const [ownerId, entry] of desired) {
      if (this.effectSignatures.get(ownerId) === entry.signature) continue;
      this.effectSignatures.set(ownerId, entry.signature);

      const seen = new Set<string>();
      for (const plan of entry.plans) {
        if (plan.stages.length === 0 || seen.has(plan.id)) continue;
        seen.add(plan.id);

        const instanceId = `fx:inst:${ownerId}:${plan.id}`;
        const end = effectEndTicks(plan.stages);
        const cancel =
          plan.cancel ??
          (Number.isFinite(end) ? undefined : persistentCancel(plan.stages));
        const instance: EffectInstance = {
          id: instanceId,
          planId: plan.id,
          ownerSurfaceId: ownerId,
          actor: plan.actor,
          owner: plan.owner,
          ...(plan.accent ? { accent: plan.accent } : {}),
          startedTick: this.tickNumber,
          ageTicks: 0,
          ...(Number.isFinite(end)
            ? { remainingTicks: Math.max(0, end) }
            : {}),
          stages: plan.stages,
          ...(cancel ? { cancel } : {}),
        };

        const entity = createEntityId(instanceId);
        this.world.spawn(entity);
        this.world.add(entity, EffectInstanceComponent, instance);
      }
    }

    for (const ownerId of [...this.effectSignatures.keys()]) {
      if (!desired.has(ownerId)) this.effectSignatures.delete(ownerId);
    }
  }

  private effectTick(): void {
    for (const entity of this.world.query(EffectInstanceComponent)) {
      const instance = this.world.get(entity, EffectInstanceComponent);
      if (!instance) continue;

      if (this.shouldCancel(instance)) {
        this.world.despawn(entity);
        continue;
      }

      // A newly spawned instance is visible for at least one frame before its
      // age advances.
      if (instance.startedTick === this.tickNumber) continue;

      const ageTicks = instance.ageTicks + 1;
      const end = effectEndTicks(instance.stages);
      if (Number.isFinite(end) && ageTicks >= end) {
        this.world.despawn(entity);
        continue;
      }

      this.world.add(entity, EffectInstanceComponent, {
        ...instance,
        ageTicks,
        ...(Number.isFinite(end)
          ? { remainingTicks: Math.max(0, end - ageTicks) }
          : {}),
      });
    }
  }

  private shouldCancel(instance: EffectInstance): boolean {
    const owner = this.world.get(
      createEntityId(instance.ownerSurfaceId),
      State,
    );
    if (owner === undefined) return true;

    if (instance.cancel === "onSourceInactive") {
      return !isSourceActive(owner);
    }

    if (instance.cancel === "onTargetGone") {
      const predicate = this.isAnchorAlive;
      if (predicate) {
        return collectAnchors(instance).some((anchor) => !predicate(anchor));
      }
    }

    return false;
  }

  private cancelEffectsForOwner(ownerId: string): void {
    for (const entity of this.world.query(EffectInstanceComponent)) {
      const instance = this.world.get(entity, EffectInstanceComponent);
      if (instance?.ownerSurfaceId === ownerId) {
        this.world.despawn(entity);
      }
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
    const conversation = this.world.get(entity, ConversationComponent);

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
      ...(conversation ? { conversation } : {}),
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
      effects: [...this.renderedEffects].sort(compareEffects),
    };
  }
}

export function createFeedbackDirector(
  options: FeedbackDirectorOptions = {},
): FeedbackDirector {
  return new FeedbackDirectorImpl(options);
}
