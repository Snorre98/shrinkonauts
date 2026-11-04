import type {
  AudioThemeOptions,
  AudioThemeStopOptions,
} from "../audio";
import type { LearningEvent } from "../curriculum";
import {
  createCurriculum,
  debriefPrompts as buildDebriefPrompts,
  evidenceForObjective,
  exportEvidence as buildEvidenceExport,
  recordEvent,
  type DebriefPrompt,
  type EvidenceExport,
} from "../curriculum";
import {
  createFeedbackDirector,
  isInspectableKind,
  visualKind,
  type AnchorRef,
  type FeedbackAnchor,
  type FeedbackDirector,
  type FeedbackFrame,
  type FeedbackSurface,
  type FeedbackSurfaceSpec,
  type SourceRefValue,
  type SurfaceId,
} from "../feedback";
import { toWorldEffectPlan } from "./effect-mapper";
import { buildBlueprint } from "./blueprint";
import type {
  HostActionFeedback,
  HostControlDescriptor,
  HostControlVerb,
} from "./host-run-port";
import type {
  DialogueDocument,
  DialogueEffect,
  GateAnswer,
  GateDocument,
  GateEvaluation,
  LevelBlueprint,
  LevelDocument,
  PackContent,
  RoomCheckpoint,
  RoomDocument,
  RoomEntity,
  RoomExit,
  RoomInfoArea,
  ScanFact,
} from "../pack";
import {
  advanceDialogue as advanceNarrative,
  chooseDialogueOption,
  currentNode,
  startDialogue,
  type DialogueSession,
} from "../narrative";
import {
  createProgression,
  evaluateGate,
  gateIsOpen,
  hasAbility,
  isGateSolved,
  mapEdges,
  mapNodes,
  revealNode,
  setFlag,
  solveGate,
  unlockAbility,
  type ProgressionSnapshot,
} from "../progression";
import type { Syllabus } from "../syllabus";
import { resolveEntityDisplay } from "../world/entity-style";
import {
  PuzzleRuntime,
  type PuzzleDocument,
  type PuzzleEvent,
  type PuzzleRect,
  type PuzzleRewards,
  type PuzzleWorldSnapshot,
} from "../puzzle";
import type {
  ConceptView,
  DebriefView,
  GateView,
  InteractionView,
  MapView,
  PlayerView,
  PuzzleView,
  RuntimeSnapshot,
  SurfaceAction,
  WorldAnchorPoint,
  WorldEntityView,
  WorldView,
} from "../ui/model";
import type {
  ConversationSnapshot,
  GameSettings,
  RunLoadResult,
  RunSnapshot,
} from "../save";
import { RUN_SCHEMA_VERSION } from "../save";
import {
  emptyPlayerUiActions,
  emptyRuntimeInput,
  type RuntimeInput,
  type WorldEffectPlan,
  type WorldRuntime,
} from "../world/runtime-port";
import {
  createRoomSimulation,
  PLAYER_HEIGHT,
  PLAYER_WIDTH,
  placePlayer as placeWorldPlayer,
  resizeRoomSimulation,
  roomPixelHeight,
  roomPixelWidth,
  setPlayerActive,
  setPlayerSpawn,
  setTetherPolicy,
  stepRoomSimulationWithCues,
  type GameplayCue,
  type PlayerId,
  type PlayerState,
  type PropState,
  type RoomSimulation,
} from "../world/simulation";
import { TETHER_LENGTHS } from "../world/physics";
import {
  initialMachine,
  machineIsPaused,
  transition,
  type GameState,
  type GameEventType,
  type MachineState,
} from "./state-machine";
import {
  SurfaceInputRouter,
  type RoutedSurfaceAction,
} from "./surface-router";

const INTERACT_RANGE = 70;
const SCAN_RANGE = 78;
const CHECKPOINT_RANGE = 64;
const TOAST_SECONDS = 3;
const PLACEHOLDER_ABILITY = "scan";
const FEEDBACK_CUE_TTL_TICKS = 180;
const HELP_SURFACE_TTL_TICKS = 300;
const CONVERSATION_ACK_DISTANCE = 140;
const INSPECT_RANGE_TILES = 7;

/**
 * Links level blueprint components to their nodes so world markers use the
 * same pack symbol as the HUD blueprint. First component wins when a node is
 * referenced by more than one beat.
 */
function blueprintIcons(
  blueprint: LevelBlueprint | undefined,
  beats: readonly { id: string; nodes: readonly string[] }[] | undefined,
): Record<string, string> {
  if (!blueprint || !beats || beats.length === 0) return {};
  const beatsById = new Map(beats.map((beat) => [beat.id, beat]));
  const icons: Record<string, string> = {};
  for (const component of blueprint.components) {
    for (const beatId of component.beatIds) {
      const beat = beatsById.get(beatId);
      if (!beat) continue;
      for (const nodeId of beat.nodes) {
        if (!(nodeId in icons)) icons[nodeId] = component.symbol;
      }
    }
  }
  return icons;
}

/**
 * The camera must keep the widest tether span in the room visible. A room with
 * no tether (or only `off`) returns 0, which disables the tether cap.
 */
function maxTetherLengthForLevel(
  content: PackContent,
  level: LevelDocument,
): number {
  let max = 0;
  for (const puzzleId of level.puzzleIds ?? []) {
    const tether = content.puzzles[puzzleId]?.tether;
    if (tether === "normal" || tether === "stretch") {
      max = Math.max(max, TETHER_LENGTHS[tether]);
    }
  }
  return max;
}

export interface AudioPort {
  play(assetId: string): void;
  playTheme(assetId: string, options?: AudioThemeOptions): void;
  stopTheme(options?: AudioThemeStopOptions): void;
  pauseTheme(): void;
  resumeTheme(): void;
  setMuted(muted: boolean): void;
  readonly muted: boolean;
}

export interface RuntimeSavePort {
  readonly settings: GameSettings;
  saveRun(run: Omit<RunSnapshot, "savedAt"> & { savedAt?: string }): void;
  loadRun(
    packId?: string,
    packVersion?: string,
    contentVersion?: string,
  ): RunLoadResult;
  clearRun(packId?: string): void;
  updateAudio(patch: Partial<GameSettings["audio"]>): GameSettings;
  updateAccessibility(
    patch: Partial<GameSettings["accessibility"]>,
  ): GameSettings;
  updateFeedback(patch: Partial<GameSettings["feedback"]>): GameSettings;
}

export interface RuntimeActionInput {
  interact: boolean;
  scan: boolean;
}

export type { RuntimeInput };

export interface RuntimeOptions {
  content: PackContent;
  save: RuntimeSavePort;
  audio: AudioPort;
  now?: () => Date;
  sessionId?: string;
  onCue?: (cue: string) => void;
  onSettings?: (settings: GameSettings) => void;
  /** Notifies the platform after a runtime level entry that needs a scene rebuild. */
  onLevelChange?: (levelId: string) => void;
}

export interface StartOptions {
  /** `false` starts a fresh run even when a compatible save exists. */
  resume?: boolean;
  /** Solo starts with P2 inactive; local co-op starts with both players. */
  activeP2?: boolean;
}

type Listener = (snapshot: RuntimeSnapshot) => void;

export interface ConversationState {
  surfaceId: SurfaceId;
  owner: PlayerId;
  entityId: string;
  document: DialogueDocument;
  session: DialogueSession;
  maxDistance?: number;
  freezeOwner: boolean;
  selectedChoiceIndex: number;
}

interface Toast {
  message: string;
  remaining: number;
}

function unique<T>(values: Iterable<T>): T[] {
  return [...new Set(values)];
}

function distance(ax: number, ay: number, bx: number, by: number): number {
  return Math.hypot(ax - bx, ay - by);
}

function playerOverlapsRect(player: PlayerState, rect: PuzzleRect): boolean {
  return (
    player.x - PLAYER_WIDTH / 2 < rect.x + rect.width &&
    player.x + PLAYER_WIDTH / 2 > rect.x &&
    player.y - PLAYER_HEIGHT < rect.y + rect.height &&
    player.y > rect.y
  );
}

function entityPoint(entity: RoomEntity, tileSize: number): { x: number; y: number } {
  return {
    x: (entity.x + 0.5) * tileSize,
    y: entity.y * tileSize - tileSize / 2,
  };
}

function checkpointPoint(
  checkpoint: RoomCheckpoint,
  tileSize: number,
): { x: number; y: number } {
  return {
    x: (checkpoint.x + 0.5) * tileSize,
    y: checkpoint.y * tileSize,
  };
}

function playerOverlapsExit(
  player: PlayerState,
  exit: RoomExit,
  room: RoomDocument,
): boolean {
  const x = exit.x * room.tileSize;
  const y = exit.y * room.tileSize;
  const width = (exit.width ?? 1) * room.tileSize;
  const height = (exit.height ?? 1) * room.tileSize;
  return (
    player.x - PLAYER_WIDTH / 2 < x + width &&
    player.x + PLAYER_WIDTH / 2 > x &&
    player.y - PLAYER_HEIGHT < y + height &&
    player.y > y
  );
}

function playerOverlapsTileRect(
  player: PlayerState,
  rect: { x: number; y: number; width: number; height: number },
  tileSize: number,
): boolean {
  const x = rect.x * tileSize;
  const y = rect.y * tileSize;
  return (
    player.x - PLAYER_WIDTH / 2 < x + rect.width * tileSize &&
    player.x + PLAYER_WIDTH / 2 > x &&
    player.y - PLAYER_HEIGHT < y + rect.height * tileSize &&
    player.y > y
  );
}

function defaultEntityAnchors(
  width: number,
  height: number,
): Record<string, WorldAnchorPoint> {
  return {
    center: { x: width / 2, y: height / 2 },
    top: { x: width / 2, y: 0 },
    bottom: { x: width / 2, y: height },
    left: { x: 0, y: height / 2 },
    right: { x: width, y: height / 2 },
  };
}

function asPlayerId(value: string | undefined): PlayerId | null {
  return value === "p1" || value === "p2" ? value : null;
}

/**
 * Pure gameplay orchestrator. It owns run state, progression, curriculum,
 * dialogue, gates, save/load, and co-op session state, but never touches the
 * DOM, Phaser, Web Audio, localStorage, or asset files. `platform/boot` wires
 * the adapters; `scripts/pack-smoke` drives the same class headlessly.
 */
export class GameRuntime implements WorldRuntime {
  readonly content: PackContent;

  private readonly save: RuntimeSavePort;
  private readonly audio: AudioPort;
  private readonly now: () => Date;
  private readonly sessionId: string;
  private readonly onCue?: (cue: string) => void;
  private readonly onSettings?: (settings: GameSettings) => void;
  private readonly onLevelChange?: (levelId: string) => void;
  private readonly listeners = new Set<Listener>();
  private readonly feedback: FeedbackDirector;
  private readonly entityDisplayOverrides = new Map<
    string,
    { width: number; height: number }
  >();

  get packPresentation() {
    return this.content.pack.presentation;
  }

  registerEntityDisplay(
    entityId: string,
    size: { width: number; height: number },
  ): void {
    this.entityDisplayOverrides.set(entityId, size);
  }

  private machine: MachineState = initialMachine();
  private level: LevelDocument;
  private room: RoomDocument;
  private world: RoomSimulation;

  private progression: ProgressionSnapshot = createProgression();
  private curriculum = createCurriculum();
  readonly conversations = new Map<SurfaceId, ConversationState>();
  private activeGate: GateDocument | null = null;
  private puzzles = new Map<string, PuzzleRuntime>();
  private activatedPuzzles = new Set<string>();
  private puzzleHintIndex = 0;
  private revealedPuzzleHintCount = 0;
  private gateFeedback: { correct: boolean; message: string } | null = null;
  private gateHintIndex = 0;
  private debriefAnswers: Record<string, string> = {};
  private activeP2 = true;
  private checkpointId: string | null = null;
  private toast: Toast | null = null;
  private saveNotice: string | null = null;
  private error: string | null = null;
  private firedTriggers = new Set<string>();
  private lastExitWarning = 0;
  private lastEmitSignature: string | null = null;
  private helpSurfaceId: SurfaceId | null = null;
  private inspectSourceId: SurfaceId | null = null;
  private inspectSurfaceId: SurfaceId | null = null;
  private controlActions: Array<{
    slot: PlayerId;
    feedback: HostActionFeedback;
  }> = [];
  private effectFrameSeq = -1;
  private effectPlans: readonly WorldEffectPlan[] = [];

  constructor(options: RuntimeOptions) {
    this.content = options.content;
    this.save = options.save;
    this.audio = options.audio;
    this.now = options.now ?? (() => new Date());
    this.sessionId = options.sessionId ?? `session-${this.now().getTime()}`;
    this.onCue = options.onCue;
    this.onSettings = options.onSettings;
    this.onLevelChange = options.onLevelChange;
    this.feedback = createFeedbackDirector({
      defaultCueTtlTicks: FEEDBACK_CUE_TTL_TICKS,
      deferCues: true,
      isAnchorAlive: (anchor) => this.anchorIsAlive(anchor),
    });
    this.feedback.setSharedFeedbackEnabled(
      this.save.settings.feedback.showShared,
    );

    const level = options.content.levels[0];
    if (!level) throw new Error("PACK_HAS_NO_LEVELS");
    const room = options.content.rooms[level.roomId];
    if (!room) throw new Error(`ROOM_MISSING: ${level.roomId}`);

    this.level = level;
    this.room = room;
    this.world = createRoomSimulation(
      room,
      undefined,
      this.presentationInput(level),
    );
  }

  /* ---------------------------------------------------------------- */
  /* Lifecycle                                                        */
  /* ---------------------------------------------------------------- */

  start(options: StartOptions = {}): void {
    if (options.resume === false) {
      this.newRun({ activeP2: options.activeP2 });
      return;
    }

    const loaded = this.save.loadRun(
      this.content.pack.id,
      this.content.pack.version,
      this.content.pack.version,
    );
    if (loaded.ok) {
      this.restoreRun(loaded.run, options.activeP2);
      return;
    }
    if (loaded.reason === "VERSION_MISMATCH" && loaded.run) {
      this.restoreFromCheckpoint(loaded.run, options.activeP2);
      this.setToast(loaded.message);
      this.emit();
      return;
    }
    this.newRun({ activeP2: options.activeP2 });
    if (loaded.reason === "VERSION_MISMATCH") {
      this.setToast(loaded.message);
      this.emit();
    }
  }

  newRun(options: { activeP2?: boolean } = {}): void {
    this.save.clearRun(this.content.pack.id);
    this.progression = createProgression({
      abilities: [PLACEHOLDER_ABILITY],
    });
    this.curriculum = createCurriculum();
    this.debriefAnswers = {};
    this.activeP2 = options.activeP2 ?? true;
    this.checkpointId = null;
    this.firedTriggers.clear();
    this.enterLevel(
      this.content.pack.startLevelId,
      undefined,
      { fresh: true },
    );
  }

  private restoreRun(run: RunSnapshot, activeP2Override?: boolean): void {
    this.progression = createProgression(run.progression);
    this.curriculum = createCurriculum({ events: run.events });
    this.activeP2 = activeP2Override ?? run.players.activeP2;
    this.checkpointId = run.checkpointId;
    this.debriefAnswers = {};

    const level = this.content.levels.find((item) => item.id === run.levelId);
    if (!level) {
      this.newRun();
      return;
    }

    this.enterLevel(level.id, run, { fresh: false });
    this.machine = transition(this.machine, "start-level");

    if (run.status === "debrief") {
      this.enterDebrief(false);
    } else if (run.status === "complete") {
      this.enterDebrief(false);
      this.machine = transition(this.machine, "finish-debrief");
    }

    this.setToast("Resumed from checkpoint");
    this.emit();
  }

  /**
   * A content or pack version change keeps progression and learning evidence
   * but cannot trust serialised world state. Rebuild the level at the saved
   * checkpoint instead of starting a new run.
   */
  private restoreFromCheckpoint(
    run: RunSnapshot,
    activeP2Override?: boolean,
  ): void {
    this.progression = createProgression(run.progression);
    this.curriculum = createCurriculum({ events: run.events });
    this.activeP2 = activeP2Override ?? run.players.activeP2;
    this.debriefAnswers = {};

    const level =
      this.content.levels.find((item) => item.id === run.levelId) ??
      this.content.levels.find(
        (item) => item.id === this.content.pack.startLevelId,
      ) ??
      this.content.levels[0];
    if (!level) {
      this.newRun();
      return;
    }

    this.enterLevel(level.id, undefined, {
      fresh: false,
      checkpointId: run.checkpointId,
    });
    this.saveNotice = "Content updated";
  }

  private enterLevel(
    levelId: string,
    run: RunSnapshot | undefined,
    options: { fresh: boolean; checkpointId?: string | null },
  ): void {
    const level =
      this.content.levels.find((item) => item.id === levelId) ??
      this.content.levels[0];
    if (!level) throw new Error("PACK_HAS_NO_LEVELS");
    const room = this.content.rooms[level.roomId];
    if (!room) throw new Error(`ROOM_MISSING: ${level.roomId}`);

    this.level = level;
    this.room = room;
    this.playThemeForRoom();
    this.world = createRoomSimulation(
      room,
      undefined,
      this.presentationInput(level),
    );
    this.puzzles = new Map();
    this.activatedPuzzles = new Set();
    this.puzzleHintIndex = 0;
    this.revealedPuzzleHintCount = 0;
    for (const puzzleId of level.puzzleIds ?? []) {
      const document = this.content.puzzles[puzzleId];
      if (document) this.puzzles.set(puzzleId, new PuzzleRuntime(document));
    }
    for (const [puzzleId, puzzle] of this.puzzles) {
      if (puzzle.document.activation.mode === "roomStart") {
        this.activatedPuzzles.add(puzzleId);
      }
    }
    if (run) {
      for (const puzzleId of Object.keys(run.world.puzzles)) {
        if (this.puzzles.has(puzzleId)) {
          this.activatedPuzzles.add(puzzleId);
        }
      }
    }
    this.syncPuzzleTether();
    this.conversations.clear();
    this.feedback.reset();
    this.dismissHelpSurface();
    this.inspectSourceId = null;
    this.inspectSurfaceId = null;
    this.effectFrameSeq = -1;
    this.effectPlans = [];
    this.activeGate = null;
    this.gateFeedback = null;
    this.gateHintIndex = 0;
    this.firedTriggers.clear();
    this.lastExitWarning = 0;
    this.debriefAnswers = {};
    this.machine = transition(this.machine, "start-level");

    if (run) {
      this.restorePositions(run);
      this.restoreConversations(run);
    } else {
      const checkpoint =
        this.room.checkpoints?.find(
          (item) => item.id === options.checkpointId,
        ) ?? this.room.checkpoints?.[0];
      this.checkpointId = checkpoint?.id ?? null;
      if (checkpoint) {
        const point = checkpointPoint(checkpoint, room.tileSize);
        for (const id of ["p1", "p2"] as const) {
          setPlayerSpawn(this.world.players[id], point.x, point.y);
          placeWorldPlayer(this.world, id, point.x, point.y);
        }
      }
    }

    setPlayerActive(this.world, "p2", this.activeP2);
    this.world.props = this.world.physics.propStates();
    this.projectFeedback();
    this.feedback.tick(0);

    if (options.fresh) {
      this.record({ type: "pack_loaded", packVersion: this.content.pack.version, syllabusVersion: this.content.syllabus.version });
    }

    if (revealNode(this.progression, level.map.nodeId)) {
      this.record({ type: "map_revealed", nodeId: level.map.nodeId });
    }
    this.record({
      type: "level_started",
      levelId: level.id,
    });
    this.record({ type: "room_entered", roomId: room.id });

    this.playCue("boot");
    this.autosave();
    this.onLevelChange?.(level.id);
  }

  private restorePositions(run: RunSnapshot): void {
    const tile = this.room.tileSize;
    const checkpoint = this.room.checkpoints?.find(
      (item) => item.id === run.checkpointId,
    );

    if (checkpoint) {
      const point = checkpointPoint(checkpoint, tile);
      for (const id of ["p1", "p2"] as const) {
        setPlayerSpawn(this.world.players[id], point.x, point.y);
      }
    }

    this.world.physics.restorePlayer("p1", run.players.bodies.p1);
    this.world.physics.restorePlayer("p2", run.players.bodies.p2);
    this.world.physics.restoreProps(run.world.bodies, run.world.props);
    this.world.props = this.world.physics.propStates();

    for (const id of ["p1", "p2"] as const) {
      const player = this.world.players[id];
      const body = run.players.bodies[id];
      player.x = body.x;
      player.y = body.y + PLAYER_HEIGHT / 2;
      player.vx = body.vx;
      player.vy = body.vy;
      player.onGround = false;
      player.dashTime = body.dashTime ?? 0;
      player.dashCooldown = body.dashCooldown ?? 0;
    }

    for (const [puzzleId, puzzle] of this.puzzles) {
      const state = run.world.puzzles[puzzleId];
      if (state) puzzle.restore(state);
    }
  }

  /* ---------------------------------------------------------------- */
  /* Frame                                                            */
  /* ---------------------------------------------------------------- */

  step(dt: number, input: RuntimeInput): GameplayCue[] {
    this.advanceToast(dt);
    const { actions } = input;

    if (actions.mute) {
      this.toggleMute();
    }
    if (actions.pause) {
      this.togglePause();
    }
    if (actions.map) {
      this.toggleMap();
    }
    if (actions.log) {
      this.toggleConceptLog();
    }
    if (actions.toggleP2) {
      this.togglePlayer2();
    }

    if (this.machine.state === "pause") {
      return [];
    }
    if (this.machine.state === "map" || this.machine.state === "conceptLog") {
      return [];
    }
    if (this.machine.state !== "level") {
      return [];
    }

    if (actions.inspect && this.conversations.size === 0) {
      this.toggleInspect();
    }

    const routed = new Set<PlayerId>();
    const surfaces = this.presentedFeedbackSurfaces(
      this.feedback.view().surfaces,
    );
    const router = new SurfaceInputRouter({
      hard: false,
      surfaces,
      mode: this.activeP2 ? "co-op" : "solo",
    });
    for (const id of ["p1", "p2"] as const) {
      if (!this.world.players[id].active) continue;
      const ui = actions[id].ui ?? emptyPlayerUiActions();
      const route = router.route(id, ui);
      if (!route.consumed) continue;
      routed.add(id);
      if (route.action) this.applyRoutedSurfaceAction(route.action);
      if (this.machine.state !== "level") return [];
    }

    for (const id of ["p1", "p2"] as const) {
      if (!this.world.players[id].active) continue;
      const playerActions = actions[id];
      if (routed.has(id)) continue;
      if (playerActions.carry) this.carryAction(id);
      if (playerActions.throw) this.throwAction(id);
      if (playerActions.pulse) this.pulseAction(id);
      if (playerActions.interact) this.interactFor(id);
      if (this.machine.state !== "level") return [];
      if (playerActions.scan) this.scan(id);
    }

    const dashRequests = new Set<PlayerId>();
    if (hasAbility(this.progression, "signal-dash")) {
      for (const id of ["p1", "p2"] as const) {
        if (!this.world.players[id].active || !input.intents[id].dash) {
          continue;
        }
        const player = this.world.players[id];
        if (player.dashTime > 0 || player.dashCooldown > 0) {
          this.recordControlAction(id, "dash", "blocked", "cooldown");
        } else {
          dashRequests.add(id);
        }
      }
    }

    const cues = stepRoomSimulationWithCues(
      this.world,
      this.frozenIntents(input.intents),
      dt,
      this.progression.abilities,
    );
    for (const id of dashRequests) {
      if (this.world.players[id].dashTime > 0) {
        this.recordControlAction(id, "dash", "accepted");
      }
    }
    let hazardRespawned = false;
    for (const cue of cues) {
      if (cue === "hazard") {
        hazardRespawned = true;
        continue;
      }
      this.playCue(cue);
      if (cue === "propReturned") {
        this.feedback.ingest({
          kind: "system.outcome",
          outcome: "puzzle.object.returned",
          source: { kind: "system", id: "puzzle" },
          text: "The puzzle object returned to its start",
          severity: "neutral",
        });
      }
    }
    if (hazardRespawned) {
      this.playCue("checkpoint");
      this.setToast("Back to the checkpoint");
      this.autosave();
    }

    this.checkPuzzleActivations();
    this.tickPuzzles();
    this.updateConversations();
    this.checkCheckpoints();
    this.checkTriggers();
    this.checkExit();
    this.feedback.tick(dt);
    this.refreshInspectPanel();
    this.emit();
    return cues;
  }

  private frozenIntents(intents: RuntimeInput["intents"]): RuntimeInput["intents"] {
    const frozen = {
      p1: { ...intents.p1 },
      p2: { ...intents.p2 },
    };
    for (const conversation of this.conversations.values()) {
      if (!conversation.freezeOwner) continue;
      const owner = this.effectiveOwner(conversation.owner);
      frozen[owner] = { moveX: 0, jump: false, dash: false };
    }
    return frozen;
  }

  private applyRoutedSurfaceAction(action: RoutedSurfaceAction): void {
    if (action.type === "navigate") {
      this.navigateConversation(action.surfaceId, action.delta);
      return;
    }
    if (action.type === "choose") {
      this.surfaceAction(action.surfaceId, {
        type: "choose",
        choiceId: action.choiceId,
      });
      return;
    }
    this.surfaceAction(action.surfaceId, { type: action.type });
  }

  /* ---------------------------------------------------------------- */
  /* Actions                                                          */
  /* ---------------------------------------------------------------- */

  private transition(event: GameEventType): void {
    this.machine = transitionMachine(this.machine, event);
    this.emit();
  }

  togglePause(): void {
    if (this.machine.state === "map") {
      this.transition("close-map");
      return;
    }
    if (this.machine.state === "conceptLog") {
      this.transition("close-concept-log");
      return;
    }
    if (this.machine.state === "gate") {
      this.closeGate();
      return;
    }
    if (this.machine.state === "pause") {
      this.transition("resume");
      this.audio.resumeTheme();
      return;
    }
    this.transition("pause");
    if (machineIsPaused(this.machine)) {
      this.audio.pauseTheme();
    }
  }

  toggleMap(): void {
    if (this.machine.state === "map") {
      this.transition("close-map");
      return;
    }
    if (this.machine.state === "level") {
      this.playCue("map");
      this.transition("open-map");
    }
  }

  toggleConceptLog(): void {
    if (this.machine.state === "conceptLog") {
      this.transition("close-concept-log");
      return;
    }
    if (this.machine.state === "level") {
      this.transition("open-concept-log");
    }
  }

  toggleMute(): void {
    const muted = !this.audio.muted;
    this.audio.setMuted(muted);
    this.save.updateAudio({ muted });
    this.setToast(muted ? "Sound muted" : "Sound on");
    this.emit();
  }

  togglePlayer2(): void {
    if (this.machine.state !== "level") return;
    const checkpoint = this.nearCheckpoint(this.world.players.p1);
    if (!checkpoint) {
      this.setToast("Find a checkpoint to change players");
      this.emit();
      return;
    }

    this.activeP2 = !this.activeP2;
    setPlayerActive(this.world, "p2", this.activeP2);
    this.world.props = this.world.physics.propStates();
    if (this.activeP2) {
      const point = checkpointPoint(checkpoint, this.room.tileSize);
      placeWorldPlayer(
        this.world,
        "p2",
        Math.min(point.x + 40, roomPixelWidth(this.room) - 20),
        point.y,
      );
    }
    this.setToast(this.activeP2 ? "Player 2 joined" : "Player 2 resting");
    this.autosave();
    this.emit();
  }

  interact(): void {
    if (this.machine.state !== "level") return;
    const actor = this.world.players.p1.active ? "p1" : "p2";
    this.interactFor(actor);
  }

  private interactFor(id: PlayerId): void {
    if (this.tryActivatePuzzle(id)) return;
    const abilities = this.abilitiesFor(id);
    if (
      abilities.includes("carry") &&
      (this.carriedProp(id) || this.nearestProp(id))
    ) {
      this.carryAction(id);
      return;
    }
    if (this.tryEntityInteract(id)) return;
    this.emitAction(id, "interact", "blocked", {
      reason: "out-of-range",
      text: "Nothing to interact with",
    });
    this.emit();
  }

  private tryEntityInteract(id: PlayerId): boolean {
    const target = this.nearestEntity(["agent", "gate"], INTERACT_RANGE, id);
    if (!target) return false;
    if (target.entity.type === "agent" && target.entity.dialogueId) {
      this.startConversation(target.entity.dialogueId, id, target.entity.id);
      return true;
    }
    if (target.entity.type === "gate" && target.entity.gateId) {
      this.openGate(target.entity.gateId);
      return true;
    }
    return false;
  }

  abilitiesFor(id: PlayerId): string[] {
    const abilities = ["scan"];
    if (hasAbility(this.progression, "signal-dash")) {
      abilities.push("signal-dash");
    }
    if (!this.activeP2) {
      if (id === "p1") abilities.push("pulse", "carry");
      return abilities;
    }
    if (id === "p1") abilities.push("pulse");
    if (id === "p2") abilities.push("carry");
    return abilities;
  }

  private carryAction(id: PlayerId): void {
    if (this.machine.state !== "level") return;
    if (!this.abilitiesFor(id).includes("carry")) {
      this.emitAction(id, "carry", "blocked", {
        reason: "locked",
        text: "Only Player 2 can carry in co-op",
      });
      this.emit();
      return;
    }

    const carried = this.carriedProp(id);
    if (carried) {
      const carriedLabel = this.entityLabel(carried.id);
      const receptor = this.nearestReceptor(id);
      if (receptor) {
        if (
          this.world.physics.placeProp(
            carried.id,
            receptor.nodeId,
            receptor.snap,
          )
        ) {
          this.notePuzzle("placements");
          this.playCue("scan");
          const entityId = this.puzzleNodeEntityId(receptor.nodeId);
          this.emitAction(id, "place", "accepted", {
            target: entityId ? { kind: "entity", id: entityId } : undefined,
            text: `${carriedLabel} placed in the receptor`,
          });
          this.dismissHelpSurface();
        }
      } else {
        this.world.physics.dropProp(carried.id);
        this.notePuzzle("drops");
        this.notePuzzle("wrongSide");
        this.emitAction(id, "drop", "accepted", {
          reason: "out-of-range",
          target: { kind: "entity", id: carried.id },
          text: `No receptor in reach — ${carriedLabel} dropped`,
        });
        this.dismissHelpSurface();
      }
      this.autosave();
      this.emit();
      return;
    }

    const prop = this.nearestProp(id);
    if (!prop) {
      this.emitAction(id, "pickup", "rejected", {
        reason: "out-of-range",
        text: "No puzzle object in reach",
      });
      this.emit();
      return;
    }
    const label = this.entityLabel(prop.id);
    if (prop.state === "docked") {
      this.emitAction(id, "pickup", "rejected", {
        reason: "locked",
        target: { kind: "entity", id: prop.id },
        text: `${label} is locked in the receptor`,
      });
      this.emit();
      return;
    }
    if (!this.world.physics.pickUp(id, prop.id)) {
      this.emitAction(id, "pickup", "rejected", {
        reason: "locked",
        target: { kind: "entity", id: prop.id },
        text: `${label} cannot be picked up`,
      });
      this.emit();
      return;
    }
    this.notePuzzle("pickups");
    this.emitAction(id, "pickup", "accepted", {
      target: { kind: "entity", id: prop.id },
      text: `${label} picked up`,
    });
    this.dismissHelpSurface();
    this.autosave();
    this.emit();
  }

  private throwAction(id: PlayerId): void {
    if (!this.abilitiesFor(id).includes("carry")) return;
    const carried = this.carriedProp(id);
    if (!carried) {
      this.emitAction(id, "throw", "rejected", {
        reason: "empty",
        text: "Nothing to throw",
      });
      this.emit();
      return;
    }
    const player = this.world.players[id];
    this.world.physics.throwProp(carried.id, player.facing);
    this.notePuzzle("throws");
    this.emitAction(id, "throw", "accepted", {
      target: { kind: "entity", id: carried.id },
      text: `${this.entityLabel(carried.id)} thrown`,
    });
    this.dismissHelpSurface();
    this.autosave();
    this.emit();
  }

  private pulseAction(id: PlayerId): void {
    if (!this.abilitiesFor(id).includes("pulse")) return;
    const target = this.nearestPulseSource(id);
    if (!target) {
      this.emitAction(id, "pulse", "rejected", {
        reason: "out-of-range",
        text: "No signal terminal in reach",
      });
      this.emit();
      return;
    }
    if (!target.puzzle.usePulse(target.nodeId, id)) {
      const entityId = this.puzzleNodeEntityId(target.nodeId);
      this.emitAction(id, "pulse", "rejected", {
        reason: "cooldown",
        target: entityId ? { kind: "entity", id: entityId } : undefined,
        text: "The terminal is still recharging",
      });
      this.emit();
      return;
    }
    this.playCue("scan");
    const targetEntityId = this.puzzleNodeEntityId(target.nodeId);
    this.emitAction(id, "pulse", "started", {
      ...(targetEntityId
        ? { target: { kind: "entity" as const, id: targetEntityId } }
        : { target: { kind: "node" as const, id: target.nodeId } }),
      text: "Signal pulse sent",
    });
    this.dismissHelpSurface();
    this.autosave();
    this.emit();
  }

  private carriedProp(id: PlayerId) {
    return (
      Object.values(this.world.props).find(
        (prop) => prop.state === "carried" && prop.carriedBy === id,
      ) ?? null
    );
  }

  private nearestProp(id: PlayerId) {
    const player = this.world.players[id];
    let best: { prop: PropState; distance: number } | null =
      null;
    for (const prop of Object.values(this.world.props)) {
      if (prop.state === "carried" || prop.state === "cleared") continue;
      const distanceToProp = distance(player.x, player.y - 20, prop.x, prop.y);
      if (distanceToProp > 78) continue;
      if (!best || distanceToProp < best.distance) {
        best = { prop, distance: distanceToProp };
      }
    }
    return best?.prop ?? null;
  }

  private nearestReceptor(id: PlayerId): {
    nodeId: string;
    snap: { x: number; y: number };
  } | null {
    const player = this.world.players[id];
    let best: {
      nodeId: string;
      snap: { x: number; y: number };
      distance: number;
    } | null = null;

    for (const [puzzleId, puzzle] of this.puzzles) {
      if (!this.activatedPuzzles.has(puzzleId)) continue;
      for (const node of puzzle.document.nodes) {
        if (node.type !== "receptor" || !node.entityId) continue;
        const point = this.entityPixel(node.entityId);
        if (!point) continue;
        const distanceToReceptor = distance(player.x, player.y - 20, point.x, point.y);
        if (distanceToReceptor > 84) continue;
        if (!best || distanceToReceptor < best.distance) {
          best = {
            nodeId: node.id,
            snap: node.snap,
            distance: distanceToReceptor,
          };
        }
      }
    }
    return best ? { nodeId: best.nodeId, snap: best.snap } : null;
  }

  private nearestPulseSource(id: PlayerId): {
    puzzle: PuzzleRuntime;
    nodeId: string;
  } | null {
    const player = this.world.players[id];
    let best: {
      puzzle: PuzzleRuntime;
      nodeId: string;
      distance: number;
    } | null = null;

    for (const [puzzleId, puzzle] of this.puzzles) {
      if (!this.activatedPuzzles.has(puzzleId)) continue;
      for (const node of puzzle.document.nodes) {
        if (node.type !== "pulseSource" || !node.entityId) continue;
        const point = this.entityPixel(node.entityId);
        if (!point) continue;
        const distanceToSource = distance(player.x, player.y - 20, point.x, point.y);
        if (distanceToSource > node.range) continue;
        if (!best || distanceToSource < best.distance) {
          best = {
            puzzle,
            nodeId: node.id,
            distance: distanceToSource,
          };
        }
      }
    }
    return best ? { puzzle: best.puzzle, nodeId: best.nodeId } : null;
  }

  private notePuzzle(counter: string): void {
    for (const [id, puzzle] of this.puzzles) {
      if (this.activatedPuzzles.has(id)) puzzle.note(counter);
    }
  }

  private syncPuzzleTether(): void {
    const active = [...this.puzzles.entries()].find(([id]) =>
      this.activatedPuzzles.has(id),
    );
    setTetherPolicy(this.world, active?.[1].document.tether ?? "normal");
  }

  private activatePuzzle(id: string, actor: PlayerId | null = null): boolean {
    const puzzle = this.puzzles.get(id);
    if (!puzzle || this.activatedPuzzles.has(id)) return false;
    this.activatedPuzzles.add(id);
    this.syncPuzzleTether();
    const text = `${puzzle.document.title} started`;
    if (actor) {
      const activation = puzzle.document.activation;
      const target =
        activation.mode === "interact" && activation.entityId
          ? ({ kind: "entity", id: activation.entityId } as SourceRefValue)
          : undefined;
      this.emitAction(actor, "puzzle.activate", "started", {
        text,
        ...(target ? { target } : {}),
      });
    } else {
      this.feedback.ingest({
        kind: "system.outcome",
        outcome: "puzzle.activate",
        source: { kind: "system", id },
        text,
        severity: "neutral",
      });
    }
    this.autosave();
    return true;
  }

  private checkPuzzleActivations(): void {
    for (const [id, puzzle] of this.puzzles) {
      if (this.activatedPuzzles.has(id)) continue;
      const activation = puzzle.document.activation;
      if (activation.mode !== "zoneEnter" || !activation.zoneId) continue;
      const zone = puzzle.document.nodes.find(
        (node) => node.id === activation.zoneId && node.type === "zone",
      );
      if (!zone || zone.type !== "zone") continue;
      const actors = (["p1", "p2"] as const).filter(
        (playerId) =>
          this.world.players[playerId].active &&
          playerOverlapsRect(this.world.players[playerId], zone.rect),
      );
      if (actors.length === 1) {
        this.activatePuzzle(id, actors[0] ?? null);
      } else if (actors.length > 1) {
        this.activatePuzzle(id, null);
      }
    }
  }

  private nearestInactivePuzzle(actor?: PlayerId): {
    id: string;
    puzzle: PuzzleRuntime;
    entityId: string;
    distance: number;
  } | null {
    const players = actor
      ? [this.world.players[actor]].filter((player) => player.active)
      : [this.world.players.p1, this.world.players.p2].filter(
          (player) => player.active,
        );
    let best: {
      id: string;
      puzzle: PuzzleRuntime;
      entityId: string;
      distance: number;
    } | null = null;

    for (const [id, puzzle] of this.puzzles) {
      if (this.activatedPuzzles.has(id)) continue;
      const activation = puzzle.document.activation;
      if (activation.mode !== "interact" || !activation.entityId) continue;
      const point = this.entityPixel(activation.entityId);
      if (!point) continue;
      for (const player of players) {
        const distanceToTarget = distance(
          player.x,
          player.y - 20,
          point.x,
          point.y,
        );
        if (distanceToTarget > INTERACT_RANGE) continue;
        if (!best || distanceToTarget < best.distance) {
          best = {
            id,
            puzzle,
            entityId: activation.entityId,
            distance: distanceToTarget,
          };
        }
      }
    }
    return best;
  }

  private tryActivatePuzzle(actor: PlayerId): boolean {
    const nearest = this.nearestInactivePuzzle(actor);
    return nearest ? this.activatePuzzle(nearest.id, actor) : false;
  }

  private puzzleSnapshot(): PuzzleWorldSnapshot {
    return {
      tick: this.world.tick,
      players: (["p1", "p2"] as const).map((id) => {
        const player = this.world.players[id];
        return {
          id,
          x: player.x,
          y: player.y - PLAYER_HEIGHT / 2,
          width: PLAYER_WIDTH,
          height: PLAYER_HEIGHT,
          active: player.active,
        };
      }),
      props: Object.values(this.world.props).map((prop) => ({
        id: prop.id,
        x: prop.x,
        y: prop.y,
        width: prop.width,
        height: prop.height,
        active: prop.state !== "cleared",
        state: prop.state,
        tags: [...prop.tags],
        shape: prop.shape,
        carriedBy: prop.carriedBy,
      })),
      flags: { ...this.progression.flags },
    };
  }

  private tickPuzzles(): void {
    if (this.puzzles.size === 0) return;
    const snapshot = this.puzzleSnapshot();
    for (const [id, puzzle] of this.puzzles) {
      if (!this.activatedPuzzles.has(id)) continue;
      const result = puzzle.tickResult(snapshot);
      const solvedEvents = result.events.filter(
        (event) => event.type === "solved",
      );
      const otherEvents = result.events.filter(
        (event) => event.type !== "solved",
      );
      if (otherEvents.length > 0) {
        this.handlePuzzleEvents(puzzle.document, otherEvents);
        this.world.props = this.world.physics.propStates();
      }
      if (result.solvedNow) {
        this.onPuzzleSolved(id, result.rewards);
      }
      // Ingest the solved cue last so it remains the newest deferred message
      // after the reward notifications produced by onPuzzleSolved.
      if (solvedEvents.length > 0) {
        this.handlePuzzleEvents(puzzle.document, solvedEvents);
      }
    }
    this.projectFeedback();
  }

  private handlePuzzleEvents(
    document: PuzzleDocument,
    events: readonly PuzzleEvent[],
  ): void {
    for (const event of events) {
      const actor =
        event.type === "solved" ? null : asPlayerId(event.actorId);
      this.feedback.ingest({
        kind: "puzzle.event",
        puzzleId: document.id,
        event,
        actor,
        source: this.puzzleEventSource(document, event),
      });
      if (event.type === "receptorBound" && event.propId) {
        const propEntityId = this.puzzlePropEntityId(document, event.propId);
        this.world.physics.dockProp(propEntityId, event.nodeId);
        this.playCue("unlock");
      } else if (event.type === "receptorRejected" && event.propId) {
        this.playCue("wrong");
      } else if (event.type === "gateOpen") {
        this.playCue("unlock");
      } else if (event.type === "propCleared" && event.propId) {
        const propEntityId = this.puzzlePropEntityId(document, event.propId);
        this.world.physics.clearProp(propEntityId);
      }
    }
  }

  private puzzleEventSource(
    document: PuzzleDocument,
    event: PuzzleEvent,
  ): SourceRefValue {
    if (event.type === "solved") {
      return { kind: "system", id: document.id };
    }
    const node = document.nodes.find((entry) => entry.id === event.nodeId);
    if (node?.entityId) {
      return { kind: "entity", id: node.entityId };
    }
    if (event.propId) {
      return {
        kind: "entity",
        id: this.puzzlePropEntityId(document, event.propId),
      };
    }
    return { kind: "node", id: event.nodeId };
  }

  private puzzlePropEntityId(document: PuzzleDocument, propNodeId: string): string {
    const node = document.nodes.find(
      (entry) => entry.type === "prop" && entry.id === propNodeId,
    );
    return node?.entityId ?? propNodeId;
  }

  private puzzleNodeEntityId(nodeId: string): string | null {
    for (const puzzle of this.puzzles.values()) {
      const node = puzzle.document.nodes.find((entry) => entry.id === nodeId);
      if (node?.entityId) return node.entityId;
    }
    return null;
  }

  private onPuzzleSolved(id: string, rewards: PuzzleRewards): void {
    const puzzle = this.puzzles.get(id);
    if (!puzzle) return;
    const document = puzzle.document;

    this.record({
      type: "puzzle_solved",
      puzzleId: id,
      objectiveIds: [...document.objectiveIds],
      conceptIds: [...document.conceptIds],
      counters: puzzle.evidenceCounters(),
      mode: this.activeP2 ? "co-op" : "solo",
    });

    for (const ability of rewards.abilities ?? []) {
      if (unlockAbility(this.progression, ability)) {
        this.record({
          type: "ability_unlocked",
          abilityId: ability,
          source: "puzzle",
        });
        this.feedback.ingest({
          kind: "system.outcome",
          outcome: "ability.unlocked",
          source: { kind: "system", id },
          text: `Ability unlocked: ${ability}`,
          severity: "positive",
        });
      }
    }
    for (const flag of rewards.flags ?? []) {
      setFlag(this.progression, flag, true);
    }
    for (const nodeId of rewards.mapNodes ?? []) {
      if (revealNode(this.progression, nodeId)) {
        this.record({ type: "map_revealed", nodeId });
      }
    }

    this.dismissHelpSurface();
    this.playCue("unlock");
    this.autosave();
    this.emit();
  }

  /**
   * Reveals the newest deferred cue for a player. Shared cues are copied to
   * both players' inboxes when they are ingested.
   */
  requestFeedback(actor?: PlayerId): boolean {
    if (this.machine.state !== "level") return false;
    const id = actor ?? (this.world.players.p1.active ? "p1" : "p2");
    const shown = this.feedback.requestLatest(id);
    if (shown) this.emit();
    return shown;
  }

  /**
   * Toggles the shared inspect panel. Pressing I with a panel open closes it;
   * otherwise the nearest world marker/ring (or the first HUD chip) is shown.
   */
  toggleInspect(): boolean {
    if (this.machine.state !== "level") return false;
    if (this.inspectSurfaceId) {
      this.closeInspect();
      this.emit();
      return true;
    }
    const surface = this.nearestInspectableSurface();
    if (!surface) {
      this.setToast("Nothing to inspect here");
      this.emit();
      return false;
    }
    const opened = this.openInspect(surface.id);
    if (opened) this.emit();
    return opened;
  }

  private openInspect(sourceId: SurfaceId): boolean {
    if (this.machine.state !== "level") return false;
    if (this.conversations.size > 0) return false;
    const source = this.presentedFeedbackSurfaces(
      this.feedback.view().surfaces,
    ).find(
      (surface) =>
        surface.id === sourceId &&
        isInspectableKind(visualKind(surface)),
    );
    if (!source) return false;

    this.dismissHelpSurface();
    if (this.inspectSurfaceId) {
      this.feedback.removeSurface(this.inspectSurfaceId);
    }
    const panelId = `fb:inspect:${source.id}`;
    this.inspectSourceId = source.id;
    this.inspectSurfaceId = panelId;
    this.putInspectPanel(source, panelId);
    return true;
  }

  private putInspectPanel(source: FeedbackSurface, panelId: SurfaceId): void {
    const title =
      source.content.title ?? source.content.speaker ?? source.source.id;
    const text = source.content.text ?? title;
    this.feedback.putSurface({
      id: panelId,
      capability: "affordance",
      source: source.source,
      actor: null,
      owner: "shared",
      audience: "both",
      anchor: { kind: "hud", slot: "bottom" },
      presentation: "anchoredPanel",
      placement: "hud",
      ...(source.icon ? { icon: source.icon } : {}),
      content: {
        title,
        text,
        ...(source.content.progress
          ? { progress: source.content.progress }
          : {}),
      },
      state: source.state,
      severity: source.severity,
      lifetime: { sticky: true },
      interaction: { mode: "none", focus: "soft", movement: "free" },
      priority: 110,
      a11y: { announce: true, textAlternative: `${title}. ${text}` },
    });
  }

  private closeInspect(): void {
    if (this.inspectSurfaceId) {
      this.feedback.removeSurface(this.inspectSurfaceId);
    }
    this.inspectSurfaceId = null;
    this.inspectSourceId = null;
  }

  private refreshInspectPanel(): void {
    if (!this.inspectSourceId || !this.inspectSurfaceId) return;
    if (!this.save.settings.feedback.showShared) {
      this.closeInspect();
      return;
    }
    const source = this.presentedFeedbackSurfaces(
      this.feedback.view().surfaces,
    ).find(
      (surface) =>
        surface.id === this.inspectSourceId &&
        isInspectableKind(visualKind(surface)),
    );
    if (!source) {
      this.closeInspect();
      return;
    }
    this.putInspectPanel(source, this.inspectSurfaceId);
  }

  private nearestInspectableSurface(): FeedbackSurface | null {
    const surfaces = this.presentedFeedbackSurfaces(
      this.feedback.view().surfaces,
    ).filter((surface) => isInspectableKind(visualKind(surface)));
    if (surfaces.length === 0) return null;

    const playerId: PlayerId = this.world.players.p1.active ? "p1" : "p2";
    const player = this.world.players[playerId];
    const range = INSPECT_RANGE_TILES * this.room.tileSize;
    const playerY = player.y - PLAYER_HEIGHT / 2;
    let best: { surface: FeedbackSurface; distance: number } | null = null;
    let hudFallback: FeedbackSurface | null = null;

    for (const surface of surfaces) {
      const kind = visualKind(surface);
      if (kind === "chip") {
        hudFallback ??= surface;
        continue;
      }
      if (kind !== "marker" && kind !== "ring") continue;
      const point = this.anchorWorldPoint(surface.anchor);
      if (!point) continue;
      const distance = Math.hypot(point.x - player.x, point.y - playerY);
      if (distance > range) continue;
      if (!best || distance < best.distance) {
        best = { surface, distance };
      }
    }

    return best?.surface ?? hudFallback;
  }

  private anchorWorldPoint(
    anchor: FeedbackAnchor,
  ): { x: number; y: number } | null {
    const tile = this.room.tileSize;
    switch (anchor.kind) {
      case "entity": {
        const entity = this.room.entities?.find(
          (entry) => entry.id === anchor.entityId,
        );
        if (entity) {
          return {
            x: (entity.x + 0.5) * tile,
            y: entity.y * tile,
          };
        }
        const prop = this.world.props[anchor.entityId];
        return prop ? { x: prop.x, y: prop.y } : null;
      }
      case "player": {
        const player = this.world.players[anchor.playerId];
        return player.active ? { x: player.x, y: player.y } : null;
      }
      case "node": {
        return anchor.entityId
          ? this.anchorWorldPoint({
              kind: "entity",
              entityId: anchor.entityId,
            })
          : null;
      }
      case "world":
        return { x: anchor.point.x, y: anchor.point.y };
      case "tile":
        return {
          x: (anchor.x + 0.5) * tile,
          y: (anchor.y + 0.5) * tile,
        };
      case "tileRegion":
        return {
          x: ((anchor.x1 + anchor.x2 + 1) / 2) * tile,
          y: ((anchor.y1 + anchor.y2 + 1) / 2) * tile,
        };
      case "hud":
      case "screen":
        return null;
    }
  }

  scan(actor?: PlayerId): void {
    if (this.machine.state !== "level") return;
    const id = actor ?? (this.world.players.p1.active ? "p1" : "p2");

    // The scan button is also the feedback request button. Read the newest
    // pending message before performing a new scan or opening help.
    if (this.requestFeedback(id)) {
      this.playCue("scan");
      return;
    }

    const target = this.nearestEntity(["scanTarget"], SCAN_RANGE, id);
    if (!target || (!target.entity.conceptId && !target.entity.factId)) {
      if (this.requestSharedHelp(id)) {
        this.playCue("scan");
        this.emit();
        return;
      }
      this.emitAction(id, "scan", "rejected", {
        reason: "out-of-range",
        text: "Nothing to scan here",
      });
      this.requestFeedback(id);
      this.playCue("scan");
      this.emit();
      return;
    }

    const fact = target.entity.factId
      ? this.factById(target.entity.factId)
      : undefined;
    if (target.entity.factId && !fact) {
      this.setToast(`Fact missing: ${target.entity.factId}`);
      this.emit();
      return;
    }
    const conceptId = fact?.conceptId ?? target.entity.conceptId;
    if (!conceptId) {
      this.emitAction(id, "scan", "rejected", {
        reason: "out-of-range",
        text: "Nothing to scan here",
      });
      this.requestFeedback(id);
      this.playCue("scan");
      this.emit();
      return;
    }

    const alreadyKnown = fact
      ? this.knownFactIds().includes(fact.id)
      : this.knownConceptIds().includes(conceptId);
    if (alreadyKnown) {
      if (this.requestSharedHelp(id)) {
        this.playCue("scan");
        this.emit();
        return;
      }
      this.emitAction(id, "scan", "blocked", {
        reason: "condition-unmet",
        target: { kind: "entity", id: target.entity.id },
        text: fact
          ? "Already scanned"
          : "Already in your concept log",
      });
      this.requestFeedback(id);
      this.playCue("scan");
      this.emit();
      return;
    }

    if (fact) {
      this.record({
        type: "fact_revealed",
        factId: fact.id,
        conceptId: fact.conceptId,
        source: "scan",
      });
    }
    if (!this.knownConceptIds().includes(conceptId)) {
      this.record({
        type: "concept_revealed",
        conceptId,
        source: "scan",
      });
    }

    const concept = this.content.syllabus.concepts.find(
      (item) => item.id === conceptId,
    );
    const text = fact
      ? `${fact.title}: ${fact.claim}`
      : concept
        ? `${concept.term}: ${concept.definition}`
        : conceptId;
    this.emitAction(id, "scan", "completed", {
      target: { kind: "entity", id: target.entity.id },
      ...(fact ? { factId: fact.id } : {}),
      text,
    });
    this.dismissHelpSurface();
    this.requestFeedback(id);
    this.playCue("scan");
    this.emit();
  }

  /* ---------------------------------------------------------------- */
  /* Conversations                                                    */
  /* ---------------------------------------------------------------- */

  startConversation(
    dialogueId: string,
    owner: PlayerId,
    entityId: string,
  ): void {
    if (this.machine.state !== "level") return;
    const surfaceId = `conversation:${owner}:${entityId}`;
    if (this.conversations.has(surfaceId)) return;
    this.closeInspect();
    const dialogue = this.content.dialogues[dialogueId];
    if (!dialogue) {
      this.setToast(`Dialogue missing: ${dialogueId}`);
      this.emit();
      return;
    }
    const step = startDialogue(dialogue);
    const node = currentNode(dialogue, step.session);
    if (!node) {
      this.setToast(`Dialogue node missing: ${dialogueId}`);
      this.emit();
      return;
    }
    const hasEntity = this.room.entities?.some(
      (entity) => entity.id === entityId,
    );
    const state: ConversationState = {
      surfaceId,
      owner,
      entityId,
      document: dialogue,
      session: step.session,
      freezeOwner: Boolean(node.choices && node.choices.length > 0),
      ...(node.choices && node.choices.length > 0
        ? {}
        : hasEntity
          ? { maxDistance: CONVERSATION_ACK_DISTANCE }
          : {}),
      selectedChoiceIndex: 0,
    };
    this.conversations.set(surfaceId, state);
    this.updateConversationSurface(state);
    this.applyEffects(step.effects);
    this.record({
      type: "dialogue_started",
      dialogueId,
      agentId: dialogue.speaker,
    });
    this.playCue("dialogue");
    this.dismissHelpSurface();
    this.dismissHelpSurface();
    this.autosave();
    this.emit();
  }

  advanceConversation(surfaceId: SurfaceId): void {
    const state = this.conversations.get(surfaceId);
    if (!state) return;
    const node = currentNode(state.document, state.session);
    if (node?.choices && node.choices.length > 0) return;
    const step = advanceNarrative(state.document, state.session);
    if (step.session === state.session) {
      this.closeConversation(surfaceId, "completed");
      return;
    }
    state.session = step.session;
    this.applyEffects(step.effects);
    if (!currentNode(state.document, state.session)) {
      this.closeConversation(surfaceId, "missing-node");
      return;
    }
    this.updateConversationSurface(state);
    this.autosave();
    this.emit();
  }

  chooseConversation(surfaceId: SurfaceId, choiceId: string): void {
    const state = this.conversations.get(surfaceId);
    if (!state) return;
    const step = chooseDialogueOption(
      state.document,
      state.session,
      choiceId,
    );
    if (step.session === state.session) return;
    state.session = step.session;
    state.selectedChoiceIndex = 0;
    this.applyEffects(step.effects);
    if (!currentNode(state.document, state.session)) {
      this.closeConversation(surfaceId, "missing-node");
      return;
    }
    this.updateConversationSurface(state);
    this.autosave();
    this.emit();
  }

  navigateConversation(surfaceId: SurfaceId, delta: -1 | 1): void {
    const state = this.conversations.get(surfaceId);
    if (!state) return;
    const node = currentNode(state.document, state.session);
    const choices = node?.choices ?? [];
    if (choices.length === 0) return;
    state.selectedChoiceIndex = Math.max(
      0,
      Math.min(choices.length - 1, state.selectedChoiceIndex + delta),
    );
    this.updateConversationSurface(state);
    this.emit();
  }

  closeConversation(
    surfaceId: SurfaceId,
    reason:
      | "completed"
      | "cancelled"
      | "distance"
      | "missing-entity"
      | "missing-node"
      | "level-complete" = "cancelled",
  ): void {
    const state = this.conversations.get(surfaceId);
    if (!state) return;
    if (reason === "completed") {
      this.record({
        type: "dialogue_completed",
        dialogueId: state.session.dialogueId,
        choices: state.session.choices.map((choice) => choice.choiceId),
      });
    }
    this.conversations.delete(surfaceId);
    this.feedback.removeSurface(surfaceId);
    if (reason === "missing-entity" || reason === "missing-node") {
      this.feedback.ingest({
        kind: "system.outcome",
        outcome: `conversation.${reason}`,
        source: { kind: "system", id: "conversation" },
        text:
          reason === "missing-entity"
            ? "The conversation ended because the entity is no longer here."
            : "The conversation ended because its dialogue node is missing.",
        severity: "warning",
      });
    }
    if (reason !== "level-complete") {
      this.autosave();
      this.emit();
    }
  }

  private closeAllConversations(
    reason: "level-complete" | "missing-entity" | "missing-node",
  ): void {
    for (const surfaceId of [...this.conversations.keys()]) {
      this.closeConversation(surfaceId, reason);
    }
  }

  surfaceAction(surfaceId: SurfaceId, action: SurfaceAction): void {
    if (action.type === "inspect") {
      if (this.inspectSourceId === surfaceId) {
        this.closeInspect();
      } else {
        this.openInspect(surfaceId);
      }
      this.emit();
      return;
    }
    if (surfaceId === this.inspectSurfaceId) {
      if (action.type === "cancel") this.closeInspect();
      this.emit();
      return;
    }
    if (surfaceId === this.helpSurfaceId) {
      this.handleHelpAction(action);
      return;
    }
    const state = this.conversations.get(surfaceId);
    if (!state) return;
    if (this.machine.state !== "level") return;
    if (action.type === "cancel") {
      this.closeConversation(surfaceId, "cancelled");
      return;
    }
    if (action.type === "choose") {
      this.chooseConversation(surfaceId, action.choiceId);
      return;
    }
    const node = currentNode(state.document, state.session);
    const choices = node?.choices ?? [];
    if (choices.length > 0) {
      const choice =
        choices[state.selectedChoiceIndex] ?? choices[0];
      if (choice) this.chooseConversation(surfaceId, choice.id);
      return;
    }
    this.advanceConversation(surfaceId);
  }

  private updateConversationSurface(state: ConversationState): void {
    const node = currentNode(state.document, state.session);
    if (!node) return;
    const choices = node.choices ?? [];
    state.freezeOwner = choices.length > 0;
    if (state.freezeOwner) {
      delete state.maxDistance;
    } else if (
      this.room.entities?.some((entity) => entity.id === state.entityId)
    ) {
      state.maxDistance = CONVERSATION_ACK_DISTANCE;
    }
    const selected = choices[state.selectedChoiceIndex] ?? choices[0];
    const anchor = this.conversationAnchor(state);
    const text = node.text;
    const speaker = node.speaker ?? state.document.speaker;
    const spec: FeedbackSurfaceSpec & { id: string } = {
      id: state.surfaceId,
      capability: "affordance",
      source: { kind: "entity", id: state.entityId },
      actor: state.owner,
      owner: state.owner,
      audience: "both",
      anchor,
      presentation: "speechBubble",
      content: {
        speaker,
        text,
        ...(choices.length > 0
          ? {
              choices: choices.map((choice) => ({
                id: choice.id,
                label: choice.text,
              })),
              ...(selected ? { selectedChoiceId: selected.id } : {}),
            }
          : {}),
      },
      state: "active",
      severity: "neutral",
      lifetime: { sticky: true },
      interaction: {
        mode: choices.length > 0 ? "choice" : "acknowledge",
        focus: "soft",
        movement: choices.length > 0 ? "freeze-owner" : "free",
        ...(state.maxDistance ? { maxDistance: state.maxDistance } : {}),
      },
      priority: 90,
      a11y: {
        announce: true,
        textAlternative: `${speaker}: ${text}`,
      },
      conversation: {
        dialogueId: state.session.dialogueId,
        nodeId: state.session.nodeId,
        owner: state.owner,
        entityId: state.entityId,
        ...(state.maxDistance ? { maxDistance: state.maxDistance } : {}),
        freezeOwner: state.freezeOwner,
      },
    };
    this.feedback.putSurface(spec);
  }

  private conversationAnchor(state: ConversationState): FeedbackAnchor {
    if (this.room.entities?.some((entity) => entity.id === state.entityId)) {
      return { kind: "entity", entityId: state.entityId, fallback: "hud" };
    }
    return { kind: "player", playerId: this.effectiveOwner(state.owner) };
  }

  private updateConversations(): void {
    for (const state of [...this.conversations.values()]) {
      if (!currentNode(state.document, state.session)) {
        this.closeConversation(state.surfaceId, "missing-node");
        continue;
      }
      if (!state.maxDistance) continue;
      const entity = this.entityPixel(state.entityId);
      if (!entity) {
        this.closeConversation(state.surfaceId, "missing-entity");
        continue;
      }
      const player = this.world.players[this.effectiveOwner(state.owner)];
      if (
        !player.active ||
        distance(player.x, player.y - 20, entity.x, entity.y) >
          state.maxDistance
      ) {
        this.closeConversation(state.surfaceId, "distance");
      }
    }
  }

  private effectiveOwner(owner: PlayerId): PlayerId {
    return this.activeP2 ? owner : "p1";
  }

  private restoreConversations(run: RunSnapshot): void {
    if (run.status !== "playing") return;
    const legacyEntity =
      run.conversations === undefined && run.dialogue
        ? this.room.entities?.find(
            (item) => item.dialogueId === run.dialogue?.dialogueId,
          )
        : undefined;
    const snapshots: ConversationSnapshot[] =
      run.conversations !== undefined
        ? run.conversations
        : run.dialogue
          ? (() => {
              return legacyEntity
                ? [
                    {
                      surfaceId: `conversation:p1:${legacyEntity.id}`,
                      dialogueId: run.dialogue?.dialogueId ?? "",
                      nodeId: run.dialogue?.nodeId ?? "",
                      owner: "p1" as const,
                      entityId: legacyEntity.id,
                    },
                  ]
                : [];
            })()
          : [];

    if (run.conversations === undefined && run.dialogue && !legacyEntity) {
      this.feedback.ingest({
        kind: "system.outcome",
        outcome: "conversation.missing-target",
        source: { kind: "system", id: "conversation" },
        text: "A saved conversation closed because its entity is no longer here.",
        severity: "warning",
      });
    }

    for (const snapshot of snapshots) {
      const dialogue = this.content.dialogues[snapshot.dialogueId];
      if (!dialogue) {
        this.feedback.ingest({
          kind: "system.outcome",
          outcome: "conversation.missing-dialogue",
          source: { kind: "system", id: "conversation" },
          text: "A saved conversation could not be restored.",
          severity: "warning",
        });
        continue;
      }
      const entity = this.room.entities?.find(
        (item) => item.id === snapshot.entityId,
      );
      const node = dialogue.nodes[snapshot.nodeId];
      if (!entity || !node) {
        this.feedback.ingest({
          kind: "system.outcome",
          outcome: "conversation.missing-target",
          source: { kind: "system", id: "conversation" },
          text: "A saved conversation closed because its entity is no longer here.",
          severity: "warning",
        });
        continue;
      }
      const state: ConversationState = {
        surfaceId:
          snapshot.surfaceId ||
          `conversation:${snapshot.owner}:${snapshot.entityId}`,
        owner: snapshot.owner,
        entityId: snapshot.entityId,
        document: dialogue,
        session: {
          dialogueId: dialogue.id,
          nodeId: snapshot.nodeId,
          history: [snapshot.nodeId],
          choices: [],
        },
        freezeOwner: Boolean(node.choices && node.choices.length > 0),
        ...(node.choices && node.choices.length > 0
          ? {}
          : { maxDistance: CONVERSATION_ACK_DISTANCE }),
        selectedChoiceIndex: 0,
      };
      if (this.conversations.has(state.surfaceId)) continue;
      this.conversations.set(state.surfaceId, state);
      this.updateConversationSurface(state);
    }
  }

  /* ---------------------------------------------------------------- */
  /* Gates                                                            */
  /* ---------------------------------------------------------------- */

  openGate(gateId: string): void {
    if (this.machine.state !== "level") {
      return;
    }
    const gate = this.content.gates[gateId];
    if (!gate) {
      this.setToast(`Gate missing: ${gateId}`);
      this.emit();
      return;
    }
    if (gateIsOpen(gate, this.progression)) {
      this.setToast("This gate is already open");
      this.emit();
      return;
    }
    this.activeGate = gate;
    this.gateFeedback = null;
    this.gateHintIndex = 0;
    this.machine = { state: "gate", returnTo: null };
    this.playCue("gate");
    this.emit();
  }

  submitGateAnswer(answer: GateAnswer): GateEvaluation {
    const gate = this.activeGate;
    if (!gate || this.machine.state !== "gate") {
      return { correct: false, reason: "NO_ACTIVE_GATE" };
    }

    const evaluation = evaluateGate(gate, answer);
    this.record({
      type: "gate_attempted",
      gateId: gate.id,
      answer: JSON.stringify(answer),
      correct: evaluation.correct,
    });

    if (evaluation.correct) {
      this.record({
        type: "gate_solved",
        gateId: gate.id,
        objectiveId: gate.objectiveId,
      });
      solveGate(this.progression, gate.id);
      this.applyEffects(gate.onSolve);
      this.gateFeedback = {
        correct: true,
        message: "The signal snaps into place. The gate opens.",
      };
      this.playCue("unlock");
      this.autosave();
    } else {
      this.record({
        type: "gate_failed",
        gateId: gate.id,
        reason: evaluation.reason ?? "incorrect",
      });
      this.applyEffects(gate.onFail);
      this.gateFeedback = {
        correct: false,
        message:
          gate.type === "concept"
            ? "Not the right order yet. Follow the signal from the receptor outward."
            : "The gate stays shut.",
      };
      this.playCue("wrong");
    }

    this.emit();
    return evaluation;
  }

  gateHint(): string | null {
    const gate = this.activeGate;
    if (!gate || gate.hints.length === 0) return null;
    if (this.gateHintIndex >= gate.hints.length) {
      return gate.hints[gate.hints.length - 1] ?? null;
    }
    const hint = gate.hints[this.gateHintIndex] ?? null;
    if (hint) {
      this.record({
        type: "hint_used",
        gateId: gate.id,
        hintIndex: this.gateHintIndex,
      });
      this.gateHintIndex = Math.min(
        this.gateHintIndex + 1,
        gate.hints.length,
      );
    }
    this.emit();
    return hint;
  }

  closeGate(): void {
    if (this.machine.state !== "gate") return;
    this.activeGate = null;
    this.gateFeedback = null;
    this.machine = { state: "level", returnTo: null };
    this.emit();
  }

  /* ---------------------------------------------------------------- */
  /* Debrief and evidence                                             */
  /* ---------------------------------------------------------------- */

  private checkExit(): void {
    if (this.machine.state !== "level") return;
    const exit = (this.room.exits ?? []).find((item) =>
      [this.world.players.p1, this.world.players.p2].some(
        (player) => player.active && playerOverlapsExit(player, item, this.room),
      ),
    );
    if (!exit) return;
    const actors = (["p1", "p2"] as const).filter(
      (id) =>
        this.world.players[id].active &&
        playerOverlapsExit(this.world.players[id], exit, this.room),
    );
    const actor = actors.length === 1 ? actors[0] ?? null : null;
    const warn = (): void => {
      const now = this.world.elapsed;
      if (now - this.lastExitWarning <= 2) return;
      this.lastExitWarning = now;
      const text = "The signal gate is still scrambled";
      if (actor) {
        this.emitAction(actor, "exit", "blocked", {
          reason: "condition-unmet",
          text,
        });
      } else {
        this.feedback.ingest({
          kind: "system.outcome",
          outcome: "exit.blocked",
          source: { kind: "system", id: exit.id },
          text,
          severity: "warning",
        });
      }
      this.playCue("wrong");
      this.emit();
    };

    if (exit.puzzleId) {
      const puzzle = this.puzzles.get(exit.puzzleId);
      if (!puzzle?.isSolved()) {
        warn();
        return;
      }
    }

    if (exit.gateId && !isGateSolved(this.progression, exit.gateId)) {
      warn();
      return;
    }
    this.completeLevel();
  }

  private completeLevel(): void {
    if (this.machine.state !== "level") return;
    this.record({
      type: "level_completed",
      levelId: this.level.id,
      objectiveIds: this.level.syllabusObjectiveIds,
    });
    this.enterDebrief(true);
  }

  private enterDebrief(record: boolean): void {
    this.closeAllConversations("level-complete");
    this.dismissHelpSurface();
    this.machine = { state: "debrief", returnTo: null };
    if (record) {
      this.playCue("debrief");
      this.autosave();
    }
    this.emit();
  }

  debriefPromptList(): DebriefPrompt[] {
    return buildDebriefPrompts(
      this.content.syllabus,
      this.level.syllabusObjectiveIds,
    );
  }

  submitDebrief(promptId: string, answer: string): void {
    const trimmed = answer.trim();
    if (trimmed === "") {
      this.setToast("Write a short answer first");
      this.emit();
      return;
    }
    this.debriefAnswers[promptId] = trimmed;
    const prompt = this.debriefPromptList().find((item) => item.id === promptId);
    this.record({
      type: "debrief_answered",
      promptId,
      answer: trimmed,
      objectiveIds: prompt ? [prompt.objectiveId] : [],
    });
    this.setToast("Answer recorded");
    this.autosave();
    this.emit();
  }

  finishDebrief(): void {
    if (this.machine.state !== "debrief") return;
    const prompts = this.debriefPromptList();
    const missing = prompts.filter(
      (prompt) => (this.debriefAnswers[prompt.id] ?? "").trim() === "",
    );
    if (missing.length > 0) {
      this.setToast("Answer every teach-back prompt to finish");
      this.emit();
      return;
    }

    this.record({
      type: "debrief_completed",
      levelId: this.level.id,
      objectiveIds: this.level.syllabusObjectiveIds,
    });

    const nextLevelId = this.nextLevelId();
    if (nextLevelId) {
      const next = this.content.levels.find((item) => item.id === nextLevelId);
      this.enterLevel(nextLevelId, undefined, { fresh: false });
      this.setToast(`Next: ${next?.title ?? nextLevelId}`);
      this.emit();
      return;
    }

    if (this.level.id === this.content.pack.endLevelId) {
      this.record({
        type: "pack_completed",
        packId: this.content.pack.id,
      });
    } else {
      this.setToast("End of authored content");
    }
    this.machine = { state: "complete", returnTo: null };
    this.playCue("debrief");
    this.autosave();
    this.emit();
  }

  /**
   * The next authored level in the manifest. A pack's final level ends the run
   * even when it keeps a forward `nextLevelIds` entry for a future slice.
   */
  private nextLevelId(): string | null {
    if (this.level.id === this.content.pack.endLevelId) return null;
    for (const id of this.level.nextLevelIds) {
      if (id === this.level.id) continue;
      if (this.content.levels.some((level) => level.id === id)) return id;
    }
    return null;
  }

  exportEvidence(): EvidenceExport {
    return buildEvidenceExport(this.curriculum, {
      pack: this.content.pack,
      syllabus: this.content.syllabus,
      mode: this.activeP2 ? "co-op" : "solo",
      exportedAt: this.now().toISOString(),
      sessionId: this.sessionId,
      settings: {
        textScale: this.save.settings.accessibility.textScale,
        reducedMotion: this.save.settings.accessibility.reducedMotion,
        muted: this.audio.muted,
      },
    });
  }

  /* ---------------------------------------------------------------- */
  /* Settings                                                         */
  /* ---------------------------------------------------------------- */

  setTextScale(scale: number): GameSettings {
    const settings = this.save.updateAccessibility({ textScale: scale });
    this.onSettings?.(settings);
    this.emit();
    return settings;
  }

  toggleReducedMotion(): GameSettings {
    const settings = this.save.updateAccessibility({
      reducedMotion: !this.save.settings.accessibility.reducedMotion,
    });
    this.onSettings?.(settings);
    this.emit();
    return settings;
  }

  toggleSharedFeedback(): GameSettings {
    const enabled = !this.save.settings.feedback.showShared;
    const settings = this.save.updateFeedback({ showShared: enabled });
    this.feedback.setSharedFeedbackEnabled(enabled);
    if (!enabled) {
      this.closeInspect();
      this.dismissHelpSurface();
    }
    this.onSettings?.(settings);
    this.emit();
    return settings;
  }

  /* ---------------------------------------------------------------- */
  /* Helpers                                                          */
  /* ---------------------------------------------------------------- */

  get state(): GameState {
    return this.machine.state;
  }

  get roomDocument(): RoomDocument {
    return this.room;
  }

  get levelDocument(): LevelDocument {
    return this.level;
  }

  get simulation(): RoomSimulation {
    return this.world;
  }

  get syllabus(): Syllabus {
    return this.content.syllabus;
  }

  knownConceptIds(): string[] {
    return unique(
      this.curriculum.events
        .filter((event) => event.type === "concept_revealed")
        .map((event) => String(event.conceptId ?? ""))
        .filter((id) => id !== ""),
    );
  }

  knownFactIds(): string[] {
    return unique(
      this.curriculum.events
        .filter((event) => event.type === "fact_revealed")
        .map((event) => String(event.factId ?? ""))
        .filter((id) => id !== ""),
    );
  }

  factById(factId: string): ScanFact | undefined {
    return (this.content.facts ?? []).find((fact) => fact.id === factId);
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private emit(force = false): void {
    const snapshot = this.snapshot();
    // World-space captions follow players, so the signature must include the
    // world view and the feedback frame (including its sequence).
    const signature = JSON.stringify(snapshot);
    if (!force && signature === this.lastEmitSignature) {
      return;
    }
    this.lastEmitSignature = signature;
    for (const listener of this.listeners) {
      listener(snapshot);
    }
  }

  private record(
    event: { type: LearningEvent["type"] } & Record<string, unknown>,
  ): void {
    const comparable = JSON.stringify(event);
    const exists = this.curriculum.events.some((existing) => {
      const { at: _at, ...rest } = existing;
      return JSON.stringify(rest) === comparable;
    });
    if (exists) return;
    recordEvent(this.curriculum, event, { at: this.now().toISOString() });
  }

  private applyEffects(effects: readonly DialogueEffect[]): void {
    for (const effect of effects) {
      switch (effect.type) {
        case "setFlag":
          setFlag(this.progression, effect.flagId, effect.value);
          break;
        case "revealConcept":
          this.record({
            type: "concept_revealed",
            conceptId: effect.conceptId,
            source: "dialogue",
          });
          break;
        case "revealFact": {
          const fact = this.factById(effect.factId);
          if (!fact) {
            this.setToast(`Fact missing: ${effect.factId}`);
            break;
          }
          this.record({
            type: "fact_revealed",
            factId: fact.id,
            conceptId: fact.conceptId,
            source: "dialogue",
          });
          if (!this.knownConceptIds().includes(fact.conceptId)) {
            this.record({
              type: "concept_revealed",
              conceptId: fact.conceptId,
              source: "dialogue",
            });
          }
          break;
        }
        case "unlockAbility":
          if (unlockAbility(this.progression, effect.id)) {
            this.record({
              type: "ability_unlocked",
              abilityId: effect.id,
              source: "gate",
            });
            this.feedback.ingest({
              kind: "system.outcome",
              outcome: "ability.unlocked",
              source: { kind: "system", id: "dialogue" },
              text: `Ability unlocked: ${effect.id}`,
              severity: "positive",
            });
          }
          break;
        case "startGate":
          this.openGate(effect.gateId);
          break;
        case "revealMap":
          if (revealNode(this.progression, effect.nodeId)) {
            this.record({ type: "map_revealed", nodeId: effect.nodeId });
          }
          break;
        case "playCue":
          this.playCue(effect.cue);
          break;
        case "recordEvidence":
          this.record({
            type: effect.event as LearningEvent["type"],
            ...(effect.gateId ? { gateId: effect.gateId } : {}),
            ...(effect.conceptId ? { conceptId: effect.conceptId } : {}),
            ...(effect.promptId ? { promptId: effect.promptId } : {}),
            ...(effect.objectiveId ? { objectiveId: effect.objectiveId } : {}),
            ...(effect.answer !== undefined ? { answer: effect.answer } : {}),
            ...(effect.correct !== undefined ? { correct: effect.correct } : {}),
          });
          break;
      }
    }
  }

  private playCue(name: string): void {
    const assetId = this.content.theme.audio?.cues?.[name];
    if (assetId) {
      this.audio.play(assetId);
    }
    this.onCue?.(name);
  }

  /**
   * Theme resolution order from ADR-0076: room → pack theme → silence. The
   * audio module crossfades when the previous room theme is still playing.
   */
  private playThemeForRoom(): void {
    const themeId = this.room.music ?? this.content.theme.audio?.music;
    if (themeId) {
      this.audio.playTheme(themeId);
    } else {
      this.audio.stopTheme({ fadeOutMs: 600 });
    }
  }

  private entityLabel(id: string): string {
    for (const [puzzleId, config] of Object.entries(
      this.level.feedback?.puzzles ?? {},
    )) {
      const puzzle = this.puzzles.get(puzzleId);
      if (!puzzle) continue;
      for (const [nodeId, override] of Object.entries(config.nodes ?? {})) {
        if (!override.label) continue;
        const node = puzzle.document.nodes.find((item) => item.id === nodeId);
        if (nodeId === id || node?.entityId === id) {
          return override.label;
        }
      }
    }
    const entity = (this.room.entities ?? []).find((item) => item.id === id);
    return entity?.label ?? id;
  }

  private nearestEntity(
    types: readonly RoomEntity["type"][],
    range: number,
    actor?: PlayerId,
  ): { entity: RoomEntity; player: PlayerState } | null {
    const players = actor
      ? [this.world.players[actor]].filter((player) => player.active)
      : [this.world.players.p1, this.world.players.p2].filter(
          (player) => player.active,
        );
    let best: { entity: RoomEntity; player: PlayerState; distance: number } | null =
      null;

    for (const entity of this.room.entities ?? []) {
      if (!types.includes(entity.type)) continue;
      const point = entityPoint(entity, this.room.tileSize);
      for (const player of players) {
        const dx = player.x - point.x;
        const dy = player.y - 20 - point.y;
        const distanceToEntity = Math.hypot(dx, dy);
        if (distanceToEntity > range) continue;
        if (!best || distanceToEntity < best.distance) {
          best = { entity, player, distance: distanceToEntity };
        }
      }
    }
    return best ? { entity: best.entity, player: best.player } : null;
  }

  private nearCheckpoint(player: PlayerState): RoomCheckpoint | null {
    for (const checkpoint of this.room.checkpoints ?? []) {
      const point = checkpointPoint(checkpoint, this.room.tileSize);
      if (distance(player.x, player.y, point.x, point.y) <= CHECKPOINT_RANGE) {
        return checkpoint;
      }
    }
    return null;
  }

  private checkCheckpoints(): void {
    const checkpoint = this.nearCheckpoint(this.world.players.p1);
    if (!checkpoint || checkpoint.id === this.checkpointId) return;

    this.checkpointId = checkpoint.id;
    const point = checkpointPoint(checkpoint, this.room.tileSize);
    setPlayerSpawn(this.world.players.p1, point.x, point.y);
    setPlayerSpawn(this.world.players.p2, point.x, point.y);
    this.playCue("checkpoint");
    this.setToast("Checkpoint reached");
    this.autosave();
  }

  private checkTriggers(): void {
    for (const trigger of this.room.triggers ?? []) {
      if (this.firedTriggers.has(trigger.id)) continue;
      const entered = [
        this.world.players.p1,
        this.world.players.p2,
      ].some(
        (player) =>
          player.active &&
          playerOverlapsTileRect(player, trigger, this.room.tileSize),
      );
      if (!entered) continue;
      this.firedTriggers.add(trigger.id);
      if (trigger.dialogueId) {
        this.startConversation(trigger.dialogueId, "p1", trigger.id);
        return;
      }
      if (trigger.gateId) {
        this.openGate(trigger.gateId);
        return;
      }
    }
  }

  private autosave(): void {
    if (this.machine.state === "complete") {
      return;
    }
    this.save.saveRun(this.toRunSnapshot());
    this.saveNotice = "Autosaved";
    this.emit();
  }

  private toRunSnapshot(): Omit<RunSnapshot, "savedAt"> {
    const status: RunSnapshot["status"] =
      this.machine.state === "debrief"
        ? "debrief"
        : this.machine.state === "complete"
          ? "complete"
          : "playing";
    return {
      schemaVersion: RUN_SCHEMA_VERSION,
      packId: this.content.pack.id,
      packVersion: this.content.pack.version,
      contentVersion: this.content.pack.version,
      levelId: this.level.id,
      roomId: this.room.id,
      checkpointId: this.checkpointId,
      progression: {
        abilities: [...this.progression.abilities],
        flags: { ...this.progression.flags },
        solvedGates: [...this.progression.solvedGates],
        revealedNodes: [...this.progression.revealedNodes],
        revealedEdges: [...this.progression.revealedEdges],
      },
      events: this.curriculum.events.map((event) => ({ ...event })),
      elapsed: this.world.elapsed,
      players: {
        activeP2: this.activeP2,
        bodies: {
          p1: {
            ...this.world.physics.playerSnapshots().p1,
            dashTime: this.world.players.p1.dashTime,
            dashCooldown: this.world.players.p1.dashCooldown,
          },
          p2: {
            ...this.world.physics.playerSnapshots().p2,
            dashTime: this.world.players.p2.dashTime,
            dashCooldown: this.world.players.p2.dashCooldown,
          },
        },
      },
      world: {
        bodies: this.world.physics.bodySnapshots(),
        props: this.world.physics.propSnapshots(),
        puzzles: Object.fromEntries(
          [...this.puzzles.entries()]
            .filter(([puzzleId]) => this.activatedPuzzles.has(puzzleId))
            .map(([puzzleId, puzzle]) => [puzzleId, puzzle.snapshot()]),
        ),
      },
      audio: { muted: this.audio.muted },
      status,
      ...(this.conversations.size > 0
        ? {
            conversations: [...this.conversations.values()].map(
              (conversation) => ({
                surfaceId: conversation.surfaceId,
                dialogueId: conversation.session.dialogueId,
                nodeId: conversation.session.nodeId,
                owner: conversation.owner,
                entityId: conversation.entityId,
              }),
            ),
          }
        : {}),
    };
  }

  private setToast(message: string): void {
    this.toast = { message, remaining: TOAST_SECONDS };
  }

  private advanceToast(dt: number): void {
    if (!this.toast) return;
    this.toast.remaining -= dt;
    if (this.toast.remaining <= 0) {
      this.toast = null;
    }
  }

  private activePuzzleEntry(): [string, PuzzleRuntime] | null {
    return (
      [...this.puzzles.entries()].find(([puzzleId]) =>
        this.activatedPuzzles.has(puzzleId),
      ) ?? null
    );
  }

  private projectFeedback(): void {
    for (const [id, puzzle] of this.puzzles) {
      if (!this.activatedPuzzles.has(id)) continue;
      const config = this.level.feedback?.puzzles?.[id];
      const icons = blueprintIcons(config?.blueprint, config?.beats);
      this.feedback.projectSticky({
        document: puzzle.document,
        state: puzzle.snapshot(),
        ...(config?.beats ? { beats: config.beats } : {}),
        ...(config?.nodes ? { overrides: config.nodes } : {}),
        ...(Object.keys(icons).length > 0 ? { icons } : {}),
      });
    }
  }

  private infoAreaFor(id: PlayerId): RoomInfoArea | null {
    const player = this.world.players[id];
    if (!player.active) return null;
    const activePuzzleId = this.activePuzzleEntry()?.[0];
    if (!activePuzzleId) return null;

    for (const area of this.room.infoAreas ?? []) {
      if (area.puzzleId && area.puzzleId !== activePuzzleId) continue;
      if (playerOverlapsTileRect(player, area, this.room.tileSize)) {
        return area;
      }
    }
    return null;
  }

  /**
   * A deliberate scan request inside an authored info area reveals the shared
   * help affordance. It never appears from an idle or stuck timer.
   */
  private requestSharedHelp(id: PlayerId): boolean {
    if (this.machine.state !== "level") return false;
    if (!this.save.settings.feedback.showShared) return false;
    const area = this.infoAreaFor(id);
    if (!area) return false;

    const entry = this.activePuzzleEntry();
    if (!entry) return false;
    const [puzzleId, puzzle] = entry;
    if (puzzle.isSolved()) return false;

    const choices: Array<{ id: string; label: string }> = [];
    if (puzzle.document.hints.length > 0) {
      choices.push({ id: "hint", label: "Show hint" });
    }
    if (puzzle.canReset()) {
      choices.push({ id: "reset", label: "Reset puzzle" });
    }
    if (choices.length === 0) return false;

    puzzle.note("helpRequests");
    this.closeInspect();
    this.helpSurfaceId = `fb:help:${puzzleId}`;
    this.feedback.putSurface({
      id: this.helpSurfaceId,
      capability: "affordance",
      source: { kind: "node", id: puzzleId },
      actor: null,
      owner: "shared",
      audience: "both",
      anchor: { kind: "hud", slot: "bottom" },
      presentation: "hudStatus",
      content: {
        text: "Need a nudge?",
        choices,
        selectedChoiceId: choices[0]?.id,
      },
      state: "blocked",
      severity: "warning",
      lifetime: {
        sticky: false,
        ttlTicks: area.ttlTicks ?? HELP_SURFACE_TTL_TICKS,
      },
      interaction: {
        mode: "choice",
        focus: "soft",
        movement: "free",
      },
      priority: 95,
      a11y: {
        announce: true,
        textAlternative: "Need a nudge? Show hint or reset puzzle.",
      },
    });
    return true;
  }

  private dismissHelpSurface(): void {
    if (!this.helpSurfaceId) return;
    this.feedback.removeSurface(this.helpSurfaceId);
    this.helpSurfaceId = null;
  }

  private handleHelpAction(action: SurfaceAction): void {
    if (action.type === "cancel") {
      this.dismissHelpSurface();
      this.emit();
      return;
    }
    const choiceId =
      action.type === "choose"
        ? action.choiceId
        : this.feedback
            .view()
            .surfaces.find((surface) => surface.id === this.helpSurfaceId)
            ?.content.selectedChoiceId ?? "hint";
    this.dismissHelpSurface();
    if (choiceId === "reset") {
      this.resetPuzzle();
    } else {
      this.puzzleHint();
    }
    this.emit();
  }

  private emitAction(
    actor: PlayerId,
    action: string,
    result: "accepted" | "rejected" | "blocked" | "completed" | "started",
    options: {
      reason?:
        | "empty"
        | "wrong-shape"
        | "wrong-tag"
        | "condition-unmet"
        | "cooldown"
        | "out-of-range"
        | "locked"
        | "cleared";
      target?: SourceRefValue;
      text?: string;
    } = {},
  ): void {
    this.feedback.ingestNow({
      kind: "action.outcome",
      actor,
      action,
      result,
      ...(options.reason ? { reason: options.reason } : {}),
      ...(options.target ? { target: options.target } : {}),
      ...(options.text ? { text: options.text } : {}),
    });
    this.recordControlAction(actor, action, result, options.reason);
  }

  private recordControlAction(
    slot: PlayerId,
    action: string,
    result: "accepted" | "rejected" | "blocked" | "completed" | "started",
    reason?: string,
  ): void {
    const verb = controlVerbForAction(action);
    if (!verb) return;
    const feedback: HostActionFeedback = {
      verb,
      result:
        reason === "cooldown"
          ? "cooldown"
          : result === "accepted" ||
              result === "completed" ||
              result === "started"
            ? "accepted"
            : "rejected",
      ...(reason === "out-of-range" ||
      reason === "locked" ||
      reason === "empty" ||
      reason === "cooldown"
        ? { reason }
        : {}),
    };
    this.controlActions.push({ slot, feedback });
  }

  /**
   * Shared state surfaces and beats are presentation-only. Hiding them must not
   * remove their effects: `drainEffects` keeps consuming the unfiltered effect
   * list from the director frame.
   */
  private presentedFeedbackSurfaces(
    surfaces: readonly FeedbackSurface[],
  ): readonly FeedbackSurface[] {
    const visible = surfaces.filter(
      (surface) => surface.placement !== "hidden",
    );
    if (this.save.settings.feedback.showShared) return visible;
    return visible.filter((surface) => surface.owner !== "shared");
  }

  private feedbackFrame(): FeedbackFrame {
    const frame = this.feedback.frame();
    const showShared = this.save.settings.feedback.showShared;
    return {
      ...frame,
      surfaces: this.presentedFeedbackSurfaces(frame.surfaces),
      ...(showShared ? {} : { beats: [] }),
    };
  }

  private presentationInput(level: LevelDocument) {
    return {
      pack: this.content.pack.presentation,
      room: this.room.presentation,
      maxTetherLength: maxTetherLengthForLevel(this.content, level),
    };
  }

  private worldView(): WorldView {
    const playerView = (id: PlayerId): PlayerView => {
      const player = this.world.players[id];
      return {
        id,
        x: player.x,
        y: player.y,
        width: PLAYER_WIDTH,
        height: PLAYER_HEIGHT,
        facing: player.facing,
        active: player.active,
        dashing: player.dashTime > 0,
        dashReady:
          hasAbility(this.progression, "signal-dash") &&
          player.dashCooldown === 0,
        abilities: this.abilitiesFor(id),
        carrying: this.carriedProp(id)?.id ?? null,
      };
    };

    const entities: Record<string, WorldEntityView> = {};
    for (const entity of this.room.entities ?? []) {
      const override = this.entityDisplayOverrides.get(entity.id);
      const resolved =
        override ??
        resolveEntityDisplay({
          entity,
          presentation: this.packPresentation,
        });
      const width = resolved.width;
      const height = resolved.height;
      entities[entity.id] = {
        id: entity.id,
        x: (entity.x + 0.5) * this.room.tileSize,
        y: entity.y * this.room.tileSize,
        width,
        height,
        anchors: {
          ...defaultEntityAnchors(width, height),
          ...(entity.components?.anchors ?? {}),
        },
      };
    }

    const props: Record<string, WorldEntityView> = {};
    for (const prop of Object.values(this.world.props)) {
      props[prop.id] = {
        id: prop.id,
        x: prop.x,
        y: prop.y + prop.height / 2,
        width: prop.width,
        height: prop.height,
        anchors: defaultEntityAnchors(prop.width, prop.height),
      };
    }

    return {
      camera: { ...this.world.camera },
      viewport: {
        width: this.world.viewport.width,
        height: this.world.viewport.height,
      },
      stage: { ...this.world.presentation.stage },
      zoom: this.world.presentation.zoom,
      tileSize: this.room.tileSize,
      players: { p1: playerView("p1"), p2: playerView("p2") },
      entities,
      props,
    };
  }

  drainEffects(): readonly WorldEffectPlan[] {
    const frame = this.feedbackFrame();
    if (frame.seq === this.effectFrameSeq) return this.effectPlans;
    this.effectFrameSeq = frame.seq;
    this.effectPlans = frame.effects.map(toWorldEffectPlan);
    return this.effectPlans;
  }

  private anchorIsAlive(anchor: AnchorRef): boolean {
    switch (anchor.kind) {
      case "entity":
        return (
          this.room.entities?.some((entity) => entity.id === anchor.id) ===
            true || this.world.props[anchor.id] !== undefined
        );
      case "player":
        return this.world.players[anchor.id].active;
      case "tile":
      case "tileRegion":
      case "world":
      case "hud":
        return true;
    }
  }

  private gateView(): GateView | null {
    const gate = this.activeGate;
    if (this.machine.state !== "gate" || !gate) return null;
    return {
      id: gate.id,
      prompt: gate.prompt,
      puzzle: gate.puzzle,
      hints: gate.hints,
      hintIndex: this.gateHintIndex,
      feedback: this.gateFeedback,
      solved: isGateSolved(this.progression, gate.id),
    };
  }

  private puzzleView(): PuzzleView | null {
    const [id, puzzle] =
      [...this.puzzles.entries()].find(([puzzleId]) =>
        this.activatedPuzzles.has(puzzleId),
      ) ?? [];
    if (!id || !puzzle) return null;

    const pulseNode = puzzle.document.nodes.find(
      (node) => node.type === "pulseSource",
    );
    const pulseState = pulseNode ? puzzle.nodeState(pulseNode.id) : undefined;
    const hints = puzzle.document.hints;
    return {
      id,
      title: puzzle.document.title,
      solved: puzzle.isSolved(),
      canReset: puzzle.canReset(),
      tether: puzzle.document.tether,
      counters: puzzle.evidenceCounters(),
      hint:
        this.puzzleHintIndex > 0
          ? (hints[this.puzzleHintIndex - 1] ?? null)
          : null,
      canHint: !puzzle.isSolved() && hints.length > 0,
      hintIndex: this.puzzleHintIndex,
      hintsTotal: hints.length,
      revealedHints: hints.slice(0, this.revealedPuzzleHintCount),
      pulse:
        pulseNode && pulseState
          ? {
              nodeId: pulseNode.id,
              remainingTicks: pulseState.remaining,
              cooldownTicks: pulseNode.cooldownTicks,
            }
          : null,
    };
  }

  puzzleHint(): void {
    if (
      this.machine.state !== "level" &&
      this.machine.state !== "pause" &&
      this.machine.state !== "map"
    ) {
      return;
    }
    const entry = [...this.puzzles.entries()].find(
      ([id, puzzle]) =>
        this.activatedPuzzles.has(id) &&
        !puzzle.isSolved() &&
        puzzle.document.hints.length > 0,
    );
    if (!entry) return;

    const [id, puzzle] = entry;
    const hints = puzzle.document.hints;
    const hintIndex =
      this.puzzleHintIndex >= hints.length ? 0 : this.puzzleHintIndex;
    const hint = hints[hintIndex];
    if (!hint) return;
    this.puzzleHintIndex = hintIndex + 1;
    this.revealedPuzzleHintCount = Math.max(
      this.revealedPuzzleHintCount,
      this.puzzleHintIndex,
    );
    this.record({
      type: "hint_used",
      puzzleId: id,
      hintIndex,
      hint,
    });
    this.feedback.ingest({
      kind: "system.outcome",
      outcome: "puzzle.hint",
      source: { kind: "node", id },
      text: `Hint: ${hint}`,
      severity: "neutral",
    });
    this.dismissHelpSurface();
    this.autosave();
    this.emit();
  }

  resetPuzzle(): void {
    if (this.machine.state !== "level" && this.machine.state !== "pause") return;
    let reset = false;
    for (const [id, puzzle] of this.puzzles) {
      if (!this.activatedPuzzles.has(id) || !puzzle.canReset()) continue;
      puzzle.reset();
      puzzle.note("resets");
      for (const propId of puzzle.document.reset.props) {
        this.world.physics.resetProp(propId);
      }
      reset = true;
    }
    this.world.props = this.world.physics.propStates();
    if (reset) {
      const entry = this.activePuzzleEntry();
      this.feedback.ingest({
        kind: "system.outcome",
        outcome: "puzzle.reset",
        source: { kind: "node", id: entry?.[0] ?? "puzzle" },
        text: "Puzzle reset",
        severity: "neutral",
      });
      this.dismissHelpSurface();
      this.projectFeedback();
      this.feedback.tick(0);
      this.refreshInspectPanel();
      this.autosave();
      this.saveNotice = "Puzzle reset";
    }
    this.emit();
  }

  private debriefView(): DebriefView | null {
    if (this.machine.state !== "debrief" && this.machine.state !== "complete") {
      return null;
    }
    return {
      prompts: this.debriefPromptList(),
      answers: { ...this.debriefAnswers },
      objectives: this.level.syllabusObjectiveIds.map((objectiveId) =>
        evidenceForObjective(
          this.content.syllabus,
          this.curriculum,
          objectiveId,
        ),
      ),
    };
  }

  private mapView(): MapView {
    const revealed = new Set(this.progression.revealedNodes);
    const current = this.level.map.nodeId;
    const nodes = mapNodes(this.content.levels).map((node) => ({
      id: node.id,
      label: node.label,
      x: node.x,
      y: node.y,
      current: node.id === current,
      visited: revealed.has(node.id),
    }));

    // Forward references are legal in the one-level M1 slice: a gate can
    // reveal where the signal leads before that level is authored. Keep the
    // node visible so the map does not silently drop the reward.
    const known = new Set(nodes.map((node) => node.id));
    for (const nodeId of revealed) {
      if (known.has(nodeId)) continue;
      nodes.push({
        id: nodeId,
        label: nodeId
          .replace(/^map-/, "")
          .split("-")
          .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
          .join(" "),
        x: 0,
        y: 0,
        current: nodeId === current,
        visited: true,
      });
    }

    return {
      nodes,
      edges: mapEdges(this.content.levels).map((edge) => ({
        id: edge.id,
        from: edge.from,
        to: edge.to,
        type: edge.type,
        revealed: revealed.has(edge.from),
      })),
    };
  }

  private conceptLogView(): ConceptView[] {
    const known = new Set(this.knownConceptIds());
    const knownFacts = new Set(this.knownFactIds());
    const allFacts = this.content.facts ?? [];
    return this.content.syllabus.concepts.map((concept) => ({
      id: concept.id,
      term: concept.term,
      definition: concept.definition,
      relationships: concept.relationships.map((relationship) => ({
        type: relationship.type,
        target: relationship.target,
        targetTerm:
          this.content.syllabus.concepts.find(
            (item) => item.id === relationship.target,
          )?.term ?? relationship.target,
      })),
      misconceptions: concept.misconceptions,
      facts: allFacts
        .filter((fact) => fact.conceptId === concept.id)
        .map((fact) => ({
          id: fact.id,
          title: fact.title,
          claim: fact.claim,
          discovered: knownFacts.has(fact.id),
        })),
      discovered: known.has(concept.id),
    }));
  }

  private interactionView(): InteractionView | null {
    return this.interactionViewFor();
  }

  private interactionViewFor(actor?: PlayerId): InteractionView | null {
    if (this.machine.state !== "level") return null;
    const abilityActor = actor ?? (this.activeP2 ? "p2" : "p1");

    const activation = this.nearestInactivePuzzle(actor);
    if (activation) {
      return {
        kind: "puzzle",
        id: activation.id,
        label: `Start ${activation.puzzle.document.title}`,
        key: "E",
      };
    }

    const target = this.nearestEntity(
      ["agent", "gate"],
      INTERACT_RANGE,
      actor,
    );
    if (target?.entity.type === "agent" && target.entity.dialogueId) {
      return {
        kind: "dialogue",
        id: target.entity.id,
        label:
          target.entity.label ??
          target.entity.dialogueId ??
          target.entity.id,
        key: "E",
      };
    }
    if (target?.entity.type === "gate" && target.entity.gateId) {
      return {
        kind: "gate",
        id: target.entity.id,
        label: target.entity.label ?? target.entity.gateId,
        key: "E",
      };
    }

    const abilities = this.abilitiesFor(abilityActor);
    if (abilities.includes("carry")) {
      const carried = this.carriedProp(abilityActor);
      if (carried) {
        const receptor = this.nearestReceptor(abilityActor);
        const label = this.entityLabel(carried.id);
        return {
          kind: "prop",
          id: carried.id,
          label: receptor ? `Place ${label}` : `Drop ${label}`,
          key: abilityActor === "p2" ? "'" : "G",
        };
      }
      const prop = this.nearestProp(abilityActor);
      if (prop) {
        return {
          kind: "prop",
          id: prop.id,
          label: `Pick up ${this.entityLabel(prop.id)}`,
          key: abilityActor === "p2" ? "'" : "G",
        };
      }
    }
    if (abilities.includes("pulse")) {
      const pulse = this.nearestPulseSource(abilityActor);
      if (pulse) {
        return {
          kind: "pulse",
          id: pulse.nodeId,
          label: "Send a signal pulse",
          key: "F",
        };
      }
    }

    return null;
  }

  /** Ephemeral control affordance for one controller slot. */
  controlDescriptor(id: PlayerId): HostControlDescriptor {
    const abilities = this.abilitiesFor(id);
    const verbs: HostControlVerb[] = ["jump", "interact", "scan"];
    if (abilities.includes("signal-dash")) verbs.push("dash");
    if (abilities.includes("pulse")) verbs.push("pulse");
    if (abilities.includes("carry")) verbs.push("carry");
    if (abilities.includes("carry") && this.carriedProp(id)) {
      verbs.push("throw");
    }

    const conversation =
      [...this.conversations.values()].find(
        (candidate) => candidate.owner === id,
      ) ?? null;
    let mode: HostControlDescriptor["mode"] = "explore";
    let choices: number | undefined;
    let selected: number | undefined;
    if (conversation) {
      const node = currentNode(conversation.document, conversation.session);
      if (node?.choices && node.choices.length > 0) {
        mode = "choice";
        choices = node.choices.length;
        selected = conversation.selectedChoiceIndex + 1;
      } else if (node) {
        mode = "talk";
      }
    }

    let activeVerb: HostControlVerb | undefined;
    if (mode !== "explore") {
      activeVerb = "interact";
    } else {
      const interaction = this.interactionViewFor(id);
      if (interaction?.kind === "pulse") activeVerb = "pulse";
      else if (interaction) activeVerb = "interact";
      else if (this.nearestEntity(["scanTarget"], SCAN_RANGE, id)) {
        activeVerb = "scan";
      }
    }
    if (activeVerb && !verbs.includes(activeVerb)) activeVerb = undefined;

    return {
      mode,
      ...(choices !== undefined ? { choices } : {}),
      ...(selected !== undefined ? { selected } : {}),
      verbs,
      ...(activeVerb !== undefined ? { activeVerb } : {}),
      dashReady:
        abilities.includes("signal-dash") &&
        this.world.players[id].dashCooldown === 0,
    };
  }

  drainControlActions(): ReadonlyArray<{
    slot: PlayerId;
    feedback: HostActionFeedback;
  }> {
    const actions = this.controlActions;
    this.controlActions = [];
    return actions;
  }

  snapshot(): RuntimeSnapshot {
    const known = this.knownConceptIds();
    const knownFacts = this.knownFactIds();
    const playerView = (id: PlayerId): PlayerView => {
      const player = this.world.players[id];
      return {
        id,
        x: player.x,
        y: player.y,
        width: PLAYER_WIDTH,
        height: PLAYER_HEIGHT,
        facing: player.facing,
        active: player.active,
        dashing: player.dashTime > 0,
        dashReady:
          hasAbility(this.progression, "signal-dash") &&
          player.dashCooldown === 0,
        abilities: this.abilitiesFor(id),
        carrying: this.carriedProp(id)?.id ?? null,
      };
    };

    const feedback = this.feedbackFrame();
    const activePuzzle = this.activePuzzleEntry();
    const blueprint = activePuzzle
      ? buildBlueprint({
          level: this.level,
          puzzle: activePuzzle[1].document,
          state: activePuzzle[1].snapshot(),
          beats: feedback.beats,
          mode: this.activeP2 ? "co-op" : "solo",
        })
      : null;

    return {
      state: this.machine.state,
      paused: this.machine.state === "pause",
      level: {
        id: this.level.id,
        title: this.level.title,
        objectiveIds: [...this.level.syllabusObjectiveIds],
      },
      roomId: this.room.id,
      players: { p1: playerView("p1"), p2: playerView("p2") },
      camera: { ...this.world.camera },
      world: this.worldView(),
      feedback,
      blueprint,
      abilities: [...this.progression.abilities],
      knownConceptIds: known,
      knownFactIds: knownFacts,
      interaction: this.interactionView(),
      checkpointId: this.checkpointId,
      activeP2: this.activeP2,
      gate: this.gateView(),
      debrief: this.debriefView(),
      map: this.mapView(),
      conceptLog: this.conceptLogView(),
      puzzle: this.puzzleView(),
      toast: this.toast?.message ?? null,
      muted: this.audio.muted,
      settings: this.save.settings,
      saveNotice: this.saveNotice,
      error: this.error,
      mode: this.activeP2 ? "co-op" : "solo",
    };
  }

  /* ---------------------------------------------------------------- */
  /* Headless helpers (pack:smoke, tests)                             */
  /* ---------------------------------------------------------------- */

  /** Moves a player without physics. Used by save restores and smoke tests. */
  placePlayer(id: PlayerId, x: number, y: number): void {
    placeWorldPlayer(this.world, id, x, y);
    this.emit();
  }

  /**
   * Reads the tile-space position of a room entity as world pixels. Smoke
   * tests use it to walk to content instead of hard-coding coordinates.
   */
  entityPixel(entityId: string): { x: number; y: number } | null {
    const entity = (this.room.entities ?? []).find(
      (item) => item.id === entityId,
    );
    if (!entity) return null;
    return {
      x: (entity.x + 0.5) * this.room.tileSize,
      y: entity.y * this.room.tileSize,
    };
  }

  /** Fallback intents shared by smoke tests and the scene bootstrap. */
  static emptyInput(): RuntimeInput {
    return emptyRuntimeInput();
  }

  roomSize(): { width: number; height: number } {
    return {
      width: roomPixelWidth(this.room),
      height: roomPixelHeight(this.room),
    };
  }

  /** Matches the camera frame to the renderer's viewport on resize. */
  resize(width: number, height: number): void {
    resizeRoomSimulation(
      this.world,
      { width, height },
      this.presentationInput(this.level),
    );
    this.emit();
  }

  /** Structural `WorldRuntime` hook used by the renderer's highlight. */
  interactionId(): string | null {
    return this.interactionView()?.id ?? null;
  }
}

function controlVerbForAction(action: string): HostControlVerb | null {
  switch (action) {
    case "interact":
    case "puzzle.activate":
    case "exit":
      return "interact";
    case "pickup":
    case "place":
    case "drop":
    case "carry":
      return "carry";
    case "throw":
      return "throw";
    case "pulse":
      return "pulse";
    case "scan":
      return "scan";
    case "dash":
      return "dash";
    default:
      return null;
  }
}

/* Keep the imported state-machine `transition` name distinct from the event
 * method above; the runtime exposes intent-specific methods. */
function transitionMachine(
  machine: MachineState,
  event: GameEventType,
): MachineState {
  return transition(machine, event);
}
