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
import type {
  DialogueDocument,
  DialogueEffect,
  GateAnswer,
  GateDocument,
  GateEvaluation,
  LevelDocument,
  PackContent,
  RoomCheckpoint,
  RoomDocument,
  RoomEntity,
  RoomExit,
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
import type {
  ConceptView,
  DebriefView,
  DialogueView,
  GateView,
  InteractionView,
  MapView,
  PlayerView,
  RuntimeSnapshot,
} from "../ui/model";
import type { GameSettings, RunLoadResult, RunSnapshot } from "../save";
import {
  emptyRuntimeInput,
  type RuntimeInput,
  type WorldRuntime,
} from "../world/runtime-port";
import {
  createRoomSimulation,
  PLAYER_HEIGHT,
  PLAYER_WIDTH,
  roomPixelHeight,
  roomPixelWidth,
  setPlayerActive,
  setPlayerSpawn,
  stepRoomSimulationWithCues,
  type GameplayCue,
  type PlayerId,
  type PlayerState,
  type RoomSimulation,
} from "../world/simulation";
import {
  initialMachine,
  transition,
  type GameState,
  type GameEventType,
  type MachineState,
} from "./state-machine";

const INTERACT_RANGE = 70;
const SCAN_RANGE = 78;
const CHECKPOINT_RANGE = 64;
const TOAST_SECONDS = 3;
const PLACEHOLDER_ABILITY = "scan";

export interface AudioPort {
  play(assetId: string): void;
  setMuted(muted: boolean): void;
  readonly muted: boolean;
}

export interface RuntimeSavePort {
  readonly settings: GameSettings;
  saveRun(run: Omit<RunSnapshot, "savedAt"> & { savedAt?: string }): void;
  loadRun(packId?: string, packVersion?: string): RunLoadResult;
  clearRun(): void;
  updateAudio(patch: Partial<GameSettings["audio"]>): GameSettings;
  updateAccessibility(
    patch: Partial<GameSettings["accessibility"]>,
  ): GameSettings;
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
}

type Listener = (snapshot: RuntimeSnapshot) => void;

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

function playerOverlapsTrigger(
  player: PlayerState,
  trigger: { x: number; y: number; width: number; height: number },
  tileSize: number,
): boolean {
  const x = trigger.x * tileSize;
  const y = trigger.y * tileSize;
  return (
    player.x - PLAYER_WIDTH / 2 < x + trigger.width * tileSize &&
    player.x + PLAYER_WIDTH / 2 > x &&
    player.y - PLAYER_HEIGHT < y + trigger.height * tileSize &&
    player.y > y
  );
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
  private readonly listeners = new Set<Listener>();

  private machine: MachineState = initialMachine();
  private level: LevelDocument;
  private room: RoomDocument;
  private world: RoomSimulation;

  private progression: ProgressionSnapshot = createProgression();
  private curriculum = createCurriculum();
  private dialogueSession: DialogueSession | null = null;
  private dialogueDocument: DialogueDocument | null = null;
  private activeGate: GateDocument | null = null;
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

  constructor(options: RuntimeOptions) {
    this.content = options.content;
    this.save = options.save;
    this.audio = options.audio;
    this.now = options.now ?? (() => new Date());
    this.sessionId = options.sessionId ?? `session-${this.now().getTime()}`;
    this.onCue = options.onCue;
    this.onSettings = options.onSettings;

    const level = options.content.levels[0];
    if (!level) throw new Error("PACK_HAS_NO_LEVELS");
    const room = options.content.rooms[level.roomId];
    if (!room) throw new Error(`ROOM_MISSING: ${level.roomId}`);

    this.level = level;
    this.room = room;
    this.world = createRoomSimulation(room);
  }

  /* ---------------------------------------------------------------- */
  /* Lifecycle                                                        */
  /* ---------------------------------------------------------------- */

  start(): void {
    const loaded = this.save.loadRun(
      this.content.pack.id,
      this.content.pack.version,
    );
    if (loaded.ok) {
      this.restoreRun(loaded.run);
      return;
    }
    this.newRun();
  }

  newRun(): void {
    this.save.clearRun();
    this.progression = createProgression({
      abilities: [PLACEHOLDER_ABILITY],
    });
    this.curriculum = createCurriculum();
    this.debriefAnswers = {};
    this.activeP2 = true;
    this.checkpointId = null;
    this.firedTriggers.clear();
    this.enterLevel(
      this.content.pack.startLevelId,
      undefined,
      { fresh: true },
    );
  }

  private restoreRun(run: RunSnapshot): void {
    this.progression = createProgression(run.progression);
    this.curriculum = createCurriculum({ events: run.events });
    this.activeP2 = run.players.activeP2;
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

  private enterLevel(
    levelId: string,
    run: RunSnapshot | undefined,
    options: { fresh: boolean },
  ): void {
    const level =
      this.content.levels.find((item) => item.id === levelId) ??
      this.content.levels[0];
    if (!level) throw new Error("PACK_HAS_NO_LEVELS");
    const room = this.content.rooms[level.roomId];
    if (!room) throw new Error(`ROOM_MISSING: ${level.roomId}`);

    this.level = level;
    this.room = room;
    this.world = createRoomSimulation(room);
    this.dialogueSession = null;
    this.dialogueDocument = null;
    this.activeGate = null;
    this.gateFeedback = null;
    this.gateHintIndex = 0;
    this.firedTriggers.clear();
    this.machine = transition(this.machine, "start-level");

    if (run) {
      this.restorePositions(run);
    } else {
      this.checkpointId = this.room.checkpoints?.[0]?.id ?? null;
      const checkpoint = this.room.checkpoints?.[0];
      if (checkpoint) {
        const point = checkpointPoint(checkpoint, room.tileSize);
        for (const id of ["p1", "p2"] as const) {
          setPlayerSpawn(this.world.players[id], point.x, point.y);
        }
      }
    }

    setPlayerActive(this.world, "p2", this.activeP2);

    if (options.fresh) {
      this.record({ type: "pack_loaded", packVersion: this.content.pack.version, syllabusVersion: this.content.syllabus.version });
      this.record({
        type: "level_started",
        levelId: level.id,
      });
      this.record({ type: "room_entered", roomId: room.id });
    }

    if (revealNode(this.progression, level.map.nodeId)) {
      this.record({ type: "map_revealed", nodeId: level.map.nodeId });
    }
    this.record({
      type: "level_started",
      levelId: level.id,
    });

    this.playCue("boot");
    this.autosave();
  }

  private restorePositions(run: RunSnapshot): void {
    const tile = this.room.tileSize;
    const checkpoint = this.room.checkpoints?.find(
      (item) => item.id === run.checkpointId,
    );
    const fallback = checkpoint
      ? checkpointPoint(checkpoint, tile)
      : { x: run.players.p1.x, y: run.players.p1.y };

    if (checkpoint) {
      const point = checkpointPoint(checkpoint, tile);
      for (const id of ["p1", "p2"] as const) {
        setPlayerSpawn(this.world.players[id], point.x, point.y);
      }
    }

    this.world.players.p1.x = run.players.p1.x;
    this.world.players.p1.y = run.players.p1.y;
    this.world.players.p2.x = run.players.p2.x;
    this.world.players.p2.y = run.players.p2.y;
    if (run.players.p1.x === 0) {
      this.world.players.p1.x = fallback.x;
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

    if (this.machine.state === "dialogue") {
      if (actions.confirm) {
        this.advanceDialogue();
      }
      return [];
    }
    if (this.machine.state === "map" || this.machine.state === "conceptLog") {
      return [];
    }
    if (this.machine.state !== "level") {
      return [];
    }

    if (actions.p1.interact || actions.p2.interact) {
      this.interact();
      if (this.machine.state !== "level") {
        return [];
      }
    }
    if (actions.p1.scan || actions.p2.scan) {
      this.scan();
    }

    const cues = stepRoomSimulationWithCues(
      this.world,
      input.intents,
      dt,
      this.progression.abilities,
    );
    for (const cue of cues) {
      this.playCue(cue);
    }

    this.checkCheckpoints();
    this.checkTriggers();
    this.checkExit();
    this.emit();
    return cues;
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
    if (this.machine.state === "dialogue") {
      this.closeDialogue();
      return;
    }
    this.transition(this.machine.state === "pause" ? "resume" : "pause");
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
    if (this.activeP2) {
      const point = checkpointPoint(checkpoint, this.room.tileSize);
      const player = this.world.players.p2;
      player.x = Math.min(
        point.x + 40,
        roomPixelWidth(this.room) - 20,
      );
      player.y = point.y;
      player.vx = 0;
      player.vy = 0;
    }
    this.setToast(this.activeP2 ? "Player 2 joined" : "Player 2 resting");
    this.autosave();
    this.emit();
  }

  interact(): void {
    if (this.machine.state !== "level") return;
    const target = this.nearestEntity(["agent", "gate"], INTERACT_RANGE);
    if (!target) {
      this.setToast("Nothing to interact with");
      this.emit();
      return;
    }
    if (target.entity.type === "agent" && target.entity.dialogueId) {
      this.startDialogue(target.entity.dialogueId);
      return;
    }
    if (target.entity.type === "gate" && target.entity.gateId) {
      this.openGate(target.entity.gateId);
      return;
    }
    this.setToast("Nothing to interact with");
    this.emit();
  }

  scan(): void {
    if (this.machine.state !== "level") return;
    const target = this.nearestEntity(["scanTarget"], SCAN_RANGE);
    if (!target || !target.entity.conceptId) {
      this.setToast("Nothing to scan here");
      this.emit();
      return;
    }
    const conceptId = target.entity.conceptId;
    if (this.knownConceptIds().includes(conceptId)) {
      this.setToast("Already in your concept log");
      this.emit();
      return;
    }
    this.record({
      type: "concept_revealed",
      conceptId,
      source: "scan",
    });
    const concept = this.content.syllabus.concepts.find(
      (item) => item.id === conceptId,
    );
    this.setToast(concept ? `${concept.term}: ${concept.definition}` : conceptId);
    this.playCue("scan");
    this.emit();
  }

  /* ---------------------------------------------------------------- */
  /* Dialogue                                                         */
  /* ---------------------------------------------------------------- */

  startDialogue(dialogueId: string): void {
    if (this.machine.state !== "level") return;
    const dialogue = this.content.dialogues[dialogueId];
    if (!dialogue) {
      this.setToast(`Dialogue missing: ${dialogueId}`);
      this.emit();
      return;
    }
    this.dialogueDocument = dialogue;
    const step = startDialogue(dialogue);
    this.dialogueSession = step.session;
    this.applyEffects(step.effects);
    this.machine = { state: "dialogue", returnTo: null };
    this.record({
      type: "dialogue_started",
      dialogueId,
      agentId: dialogue.speaker,
    });
    this.playCue("dialogue");
    this.emit();
  }

  advanceDialogue(): void {
    if (this.machine.state !== "dialogue" || !this.dialogueDocument || !this.dialogueSession) {
      return;
    }
    const node = currentNode(this.dialogueDocument, this.dialogueSession);
    if (node?.choices && node.choices.length > 0) {
      return;
    }
    const step = advanceNarrative(this.dialogueDocument, this.dialogueSession);
    if (step.session === this.dialogueSession) {
      this.closeDialogue();
      return;
    }
    this.dialogueSession = step.session;
    this.applyEffects(step.effects);
    this.emit();
  }

  chooseDialogue(choiceId: string): void {
    if (this.machine.state !== "dialogue" || !this.dialogueDocument || !this.dialogueSession) {
      return;
    }
    const step = chooseDialogueOption(
      this.dialogueDocument,
      this.dialogueSession,
      choiceId,
    );
    this.dialogueSession = step.session;
    this.applyEffects(step.effects);
    if (step.atEnd) {
      this.closeDialogue();
      return;
    }
    this.emit();
  }

  closeDialogue(): void {
    if (this.machine.state !== "dialogue") return;
    if (this.dialogueSession) {
      this.record({
        type: "dialogue_completed",
        dialogueId: this.dialogueSession.dialogueId,
        choices: this.dialogueSession.choices.map((choice) => choice.choiceId),
      });
    }
    this.dialogueSession = null;
    this.dialogueDocument = null;
    this.machine = { state: "level", returnTo: null };
    this.autosave();
    this.emit();
  }

  /* ---------------------------------------------------------------- */
  /* Gates                                                            */
  /* ---------------------------------------------------------------- */

  openGate(gateId: string): void {
    if (this.machine.state !== "level" && this.machine.state !== "dialogue") {
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

    if (exit.gateId && !isGateSolved(this.progression, exit.gateId)) {
      const now = this.world.elapsed;
      if (now - this.lastExitWarning > 2) {
        this.lastExitWarning = now;
        this.setToast("The signal gate is still scrambled");
        this.playCue("wrong");
        this.emit();
      }
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
    if (this.level.id === this.content.pack.endLevelId) {
      this.record({
        type: "pack_completed",
        packId: this.content.pack.id,
      });
    }
    this.enterDebrief(true);
  }

  private enterDebrief(record: boolean): void {
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
    this.machine = { state: "complete", returnTo: null };
    this.record({
      type: "debrief_completed",
      objectiveIds: this.level.syllabusObjectiveIds,
    });
    this.playCue("debrief");
    this.autosave();
    this.emit();
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

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private emit(force = false): void {
    const snapshot = this.snapshot();
    // The scene reads positions from `simulation` every frame, so UI listeners
    // only need to hear about changes that affect the DOM. Deduplicating here
    // keeps overlays from being rebuilt 60 times a second.
    const signature = JSON.stringify({
      ...snapshot,
      players: null,
      camera: null,
    });
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
        case "unlockAbility":
          if (unlockAbility(this.progression, effect.id)) {
            this.record({
              type: "ability_unlocked",
              abilityId: effect.id,
              source: "gate",
            });
            this.setToast(`Ability unlocked: ${effect.id}`);
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

  private nearestEntity(
    types: readonly RoomEntity["type"][],
    range: number,
  ): { entity: RoomEntity; player: PlayerState } | null {
    const players = [this.world.players.p1, this.world.players.p2].filter(
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
          playerOverlapsTrigger(player, trigger, this.room.tileSize),
      );
      if (!entered) continue;
      this.firedTriggers.add(trigger.id);
      if (trigger.dialogueId) {
        this.startDialogue(trigger.dialogueId);
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
      schemaVersion: "1.0",
      packId: this.content.pack.id,
      packVersion: this.content.pack.version,
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
        p1: { x: this.world.players.p1.x, y: this.world.players.p1.y },
        p2: { x: this.world.players.p2.x, y: this.world.players.p2.y },
        activeP2: this.activeP2,
      },
      status,
      ...(this.dialogueSession
        ? {
            dialogue: {
              dialogueId: this.dialogueSession.dialogueId,
              nodeId: this.dialogueSession.nodeId,
            },
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

  private dialogueView(): DialogueView | null {
    if (
      this.machine.state !== "dialogue" ||
      !this.dialogueDocument ||
      !this.dialogueSession
    ) {
      return null;
    }
    const node = currentNode(this.dialogueDocument, this.dialogueSession);
    if (!node) return null;
    return {
      id: this.dialogueDocument.id,
      speaker: node.speaker ?? this.dialogueDocument.speaker,
      text: node.text,
      ...(node.portrait ?? this.dialogueDocument.portrait
        ? { portrait: node.portrait ?? this.dialogueDocument.portrait }
        : {}),
      nodeId: this.dialogueSession.nodeId,
      choices: (node.choices ?? []).map((choice) => ({
        id: choice.id,
        text: choice.text,
      })),
      atEnd: node.next === null && !node.choices,
    };
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
      discovered: known.has(concept.id),
    }));
  }

  private interactionView(): InteractionView | null {
    if (this.machine.state !== "level") return null;
    const target = this.nearestEntity(["agent", "gate"], INTERACT_RANGE);
    if (!target) return null;
    if (target.entity.type === "agent" && target.entity.dialogueId) {
      return {
        kind: "dialogue",
        id: target.entity.id,
        label:
          target.entity.label ??
          target.entity.dialogueId ??
          target.entity.id,
      };
    }
    if (target.entity.type === "gate" && target.entity.gateId) {
      return {
        kind: "gate",
        id: target.entity.id,
        label: target.entity.label ?? target.entity.gateId,
      };
    }
    return null;
  }

  snapshot(): RuntimeSnapshot {
    const known = this.knownConceptIds();
    const playerView = (id: PlayerId): PlayerView => {
      const player = this.world.players[id];
      return {
        id,
        x: player.x,
        y: player.y,
        facing: player.facing,
        active: player.active,
        dashing: player.dashTime > 0,
        dashReady:
          hasAbility(this.progression, "signal-dash") &&
          player.dashCooldown === 0,
      };
    };

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
      abilities: [...this.progression.abilities],
      knownConceptIds: known,
      interaction: this.interactionView(),
      checkpointId: this.checkpointId,
      activeP2: this.activeP2,
      dialogue: this.dialogueView(),
      gate: this.gateView(),
      debrief: this.debriefView(),
      map: this.mapView(),
      conceptLog: this.conceptLogView(),
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
    const player = this.world.players[id];
    player.x = x;
    player.y = y;
    player.vx = 0;
    player.vy = 0;
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
    this.world.viewport = { width, height };
    this.world.camera.width = width;
    this.world.camera.height = height;
    this.emit();
  }

  /** Structural `WorldRuntime` hook used by the renderer's highlight. */
  interactionId(): string | null {
    return this.interactionView()?.id ?? null;
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
