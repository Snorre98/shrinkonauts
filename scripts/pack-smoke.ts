import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { createAssets } from "../src/assets/assets";
import { PLAYER_ASSET_IDS } from "../src/assets/ids";
import { parseManifest } from "../src/assets/manifest";
import type { AssetManifest } from "../src/assets/types";
import { silentLogger } from "../src/core/logger";
import { NODE_EFFECT_SOCKETS, effectPresetIds } from "../src/feedback";
import { GameRuntime, type AudioPort, type RuntimeInput } from "../src/game/runtime";
import {
  collectMaterialAssetIds,
  collectRoomAssetIds,
  collectRoomMaterialAssetIds,
  collectThemeAssetIds,
  parseRoom,
  parseTheme,
} from "../src/pack/load";
import type { RoomDocument, ThemeDocument } from "../src/pack/types";
import { validatePack } from "../src/pack/validate";
import { createSave, MemorySaveStorage, runStorageKey } from "../src/save";
import {
  createRoomSimulation,
  emptyIntents,
  roomPixelHeight,
  roomPixelWidth,
  stepRoomSimulationWithCues,
  TETHER_DISTANCE,
  type GameplayCue,
} from "../src/world/simulation";
import { loadContent, packDirectory } from "./content-loader";

const HERE = dirname(fileURLToPath(import.meta.url));
const CONTENT_DIR = join(HERE, "..", "public", "content", "dev");
const VIEWPORT = { width: 1280, height: 720 };
const FEEDBACK_VOCABULARY = {
  effectPresetIds: effectPresetIds(),
  tilePathPreset: "fx.tile.path",
  nodeEffectSockets: NODE_EFFECT_SOCKETS,
} as const;

function contentFile(file: string): string {
  return join(CONTENT_DIR, file);
}

function readJson(file: string): unknown {
  return JSON.parse(readFileSync(contentFile(file), "utf8"));
}

function readJsonAt(path: string): unknown {
  return JSON.parse(readFileSync(path, "utf8"));
}

function parseFileManifest(file: string): AssetManifest {
  const path = contentFile(file);
  const parsed = parseManifest(readJson(file), pathToFileURL(path).href);
  if (!parsed.ok) {
    throw new Error(parsed.error);
  }
  return parsed.value.manifest;
}

function parseManifestAt(path: string): AssetManifest {
  const parsed = parseManifest(readJsonAt(path), pathToFileURL(path).href);
  if (!parsed.ok) {
    throw new Error(`${path}: ${parsed.error}`);
  }
  return parsed.value.manifest;
}

function fileExists(src: string): boolean {
  try {
    const url = new URL(src);
    if (url.protocol !== "file:") {
      return false;
    }
    return existsSync(fileURLToPath(url));
  } catch {
    return false;
  }
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

interface ModeResult {
  label: string;
  ids: number;
  placeholders: number;
}

function runMode(
  label: string,
  room: RoomDocument,
  theme: ThemeDocument,
  finalManifest: AssetManifest,
  packManifest: AssetManifest | null,
): ModeResult {
  const assets = createAssets({
    finalManifest,
    packManifest,
    logger: silentLogger,
  });

  const ids = [
    ...new Set([
      ...collectRoomAssetIds(room),
      ...collectRoomMaterialAssetIds(room),
      ...collectThemeAssetIds(theme),
      ...Object.values(PLAYER_ASSET_IDS),
    ]),
  ];

  const plan = assets.preload(ids);
  assert(
    plan.missing.length === 0,
    `[${label}] unresolved IDs: ${plan.missing.join(", ")}`,
  );
  assert(
    plan.descriptors.length === plan.ids.length,
    `[${label}] preload plan did not resolve every ID`,
  );
  for (const descriptor of plan.descriptors) {
    assert(
      descriptor.placeholderSpec !== undefined,
      `[${label}] ${descriptor.id} has no placeholder fallback`,
    );
  }

  const validation = validatePack({
    room,
    theme,
    finalManifest,
    packManifest,
    fileExists,
    feedbackVocabulary: FEEDBACK_VOCABULARY,
  });
  if (!validation.ok) {
    const issues = validation.issues
      .map((issue) => `${issue.code}: ${issue.message}`)
      .join("\n    ");
    throw new Error(`[${label}] validation failed:\n    ${issues}`);
  }

  const simulation = createRoomSimulation(room, VIEWPORT);
  const idle = emptyIntents();

  let spawnCues: GameplayCue[] = [];
  for (let frame = 0; frame < 30; frame += 1) {
    spawnCues = spawnCues.concat(
      stepRoomSimulationWithCues(simulation, idle, 1 / 60),
    );
  }

  assert(
    spawnCues.length === 0,
    `[${label}] spawn settling emitted cues: ${spawnCues.join(", ")}`,
  );
  assert(
    simulation.players.p1.onGround && simulation.players.p2.onGround,
    `[${label}] a player did not settle on the ground`,
  );

  const p1 = simulation.players.p1;
  const p2 = simulation.players.p2;
  const startY = p1.y;
  const p2X = p2.x;

  assert(
    p1.y <= roomPixelHeight(room) &&
      p2.y <= roomPixelHeight(room) &&
      p1.x >= 0 &&
      p2.x >= 0,
    `[${label}] spawn is outside the room bounds`,
  );

  const walkRight = emptyIntents();
  walkRight.p1.moveX = 1;
  for (let frame = 0; frame < 600; frame += 1) {
    stepRoomSimulationWithCues(simulation, walkRight, 1 / 60);
  }

  assert(p1.x > 0, `[${label}] player 1 did not move right`);
  assert(p1.facing === 1, `[${label}] player 1 facing did not update`);
  // M1 co-op tether: idle P2 may be dragged toward P1 once they separate
  // further than the shared camera can show, but it must never move backwards
  // on its own and never trail beyond the tether distance.
  assert(
    p2.x >= p2X,
    `[${label}] player 2 moved backwards without input`,
  );
  assert(
    Math.abs(p1.x - p2.x) <= TETHER_DISTANCE + 8,
    `[${label}] tether did not keep the players together`,
  );

  const maxX = Math.max(0, roomPixelWidth(room) - VIEWPORT.width);
  const maxY = Math.max(0, roomPixelHeight(room) - VIEWPORT.height);
  assert(
    simulation.camera.x >= 0 && simulation.camera.x <= maxX,
    `[${label}] camera X left the room bounds`,
  );
  assert(
    simulation.camera.y >= 0 && simulation.camera.y <= maxY,
    `[${label}] camera Y left the room bounds`,
  );

  const jump = emptyIntents();
  jump.p1.jump = true;
  const takeoff = stepRoomSimulationWithCues(simulation, jump, 1 / 60);
  assert(takeoff.includes("jump"), `[${label}] jump cue did not fire`);
  assert(p1.y < startY, `[${label}] player 1 did not leave the ground`);
  assert(!p1.onGround, `[${label}] player 1 is still grounded after jumping`);

  let landed = false;
  for (let frame = 0; frame < 180 && !landed; frame += 1) {
    const cues = stepRoomSimulationWithCues(simulation, idle, 1 / 60);
    landed = cues.includes("land");
  }

  assert(landed, `[${label}] land cue did not fire`);
  assert(p1.onGround, `[${label}] player 1 did not land`);
  assert(
    Math.abs(p1.y - startY) < 64,
    `[${label}] player 1 did not return to the ground height`,
  );

  return {
    label,
    ids: plan.ids.length,
    placeholders: plan.placeholders.length,
  };
}

class FakeAudio implements AudioPort {
  muted = false;
  readonly played: string[] = [];

  play(assetId: string): void {
    this.played.push(assetId);
  }

  setMuted(muted: boolean): void {
    this.muted = muted;
  }
}

function frameInput(
  overrides: Partial<RuntimeInput["actions"]> = {},
): RuntimeInput {
  const base = GameRuntime.emptyInput();
  return { ...base, actions: { ...base.actions, ...overrides } };
}

function walkTo(runtime: GameRuntime, entityId: string): void {
  const point = runtime.entityPixel(entityId);
  assert(point, `room entity "${entityId}" is missing`);
  runtime.placePlayer("p1", point.x, point.y);
}

function sensorCenter(
  content: ReturnType<typeof loadContent>,
  puzzleId: string,
  nodeId: string,
): { x: number; y: number } {
  const puzzle = content.puzzles[puzzleId];
  assert(puzzle, `${puzzleId} puzzle is missing`);
  const node = puzzle.nodes.find((entry) => entry.id === nodeId);
  assert(
    node && (node.type === "plate" || node.type === "zone"),
    `${puzzleId} sensor "${nodeId}" is missing`,
  );
  return {
    x: node.rect.x + node.rect.width / 2,
    y: node.rect.y + node.rect.height / 2,
  };
}

function walkPlayerTo(
  runtime: GameRuntime,
  playerId: "p1" | "p2",
  entityId: string,
): void {
  const point = runtime.entityPixel(entityId);
  assert(point, `room entity "${entityId}" is missing`);
  runtime.placePlayer(playerId, point.x, point.y);
}

function solveNodeRun(
  runtime: GameRuntime,
  content: ReturnType<typeof loadContent>,
): void {
  for (const nodeId of ["input-a", "input-b", "terminal-zone"]) {
    const point = sensorCenter(content, "puzzle-node-run", nodeId);
    runtime.placePlayer("p1", point.x, 20 * 32);
    runtime.step(1 / 60, frameInput());
  }
  runtime.step(1 / 60, frameInput());
  assert(
    runtime.snapshot().puzzle?.solved === true,
    "[anatomy] Node Run did not latch as solved",
  );
  assert(
    runtime.snapshot().abilities.includes("signal-dash"),
    "[anatomy] solving Node Run did not unlock signal-dash",
  );
  assert(
    runtime.snapshot().map.nodes.find((node) => node.id === "map-muscle-effector")
      ?.visited === true,
    "[anatomy] Node Run did not reveal the muscle-effector map node",
  );
}

function finishNodeRunDebrief(runtime: GameRuntime): void {
  runtime.placePlayer("p1", 37.5 * 32, 20 * 32);
  runtime.placePlayer("p2", 36.5 * 32, 20 * 32);
  runtime.step(1 / 60, frameInput());
  assert(
    runtime.snapshot().state === "debrief",
    "[anatomy] Node Run exit did not open the debrief",
  );
  const prompt = runtime.snapshot().debrief?.prompts[0];
  assert(prompt, "[anatomy] no OBJ-2 debrief prompt");
  runtime.submitDebrief(
    prompt.id,
    "One input is below threshold, so no spike fires. Two inputs reach threshold and the spike is all-or-none; it travels one way along the axon to the terminal.",
  );
  runtime.finishDebrief();
  assert(
    runtime.snapshot().state === "level",
    "[anatomy] finishing the Node Run debrief did not enter the next level",
  );
  assert(
    runtime.snapshot().level.id === "04-muscle-effector",
    "[anatomy] the transition did not load Endplate Ferry",
  );
}

function solveEndplateFerry(
  runtime: GameRuntime,
  content: ReturnType<typeof loadContent>,
): void {
  walkPlayerTo(runtime, "p1", "motor-terminal");
  runtime.step(
    1 / 60,
    frameInput({
      p1: { interact: true, scan: false, pulse: false, carry: false, throw: false },
    }),
  );
  assert(
    runtime.snapshot().puzzle?.id === "puzzle-endplate-ferry",
    "[anatomy] Endplate Ferry did not activate at the motor terminal",
  );
  assert(
    runtime.simulation.tetherPolicy === "off",
    "[anatomy] Endplate Ferry tether policy was not applied",
  );

  const plate = sensorCenter(content, "puzzle-endplate-ferry", "terminal-plate");
  runtime.placePlayer("p1", plate.x, 20 * 32);
  for (let frame = 0; frame < 90; frame += 1) {
    runtime.step(1 / 60, frameInput());
  }

  walkPlayerTo(runtime, "p2", "ach-packet");
  runtime.step(
    1 / 60,
    frameInput({
      p2: { interact: false, scan: false, pulse: false, carry: true, throw: false },
    }),
  );
  walkPlayerTo(runtime, "p2", "nicotinic-receptor");
  runtime.step(
    1 / 60,
    frameInput({
      p2: { interact: false, scan: false, pulse: false, carry: true, throw: false },
    }),
  );

  walkPlayerTo(runtime, "p1", "motor-terminal");
  runtime.step(
    1 / 60,
    frameInput({
      p1: { interact: false, scan: false, pulse: true, carry: false, throw: false },
    }),
  );
  for (let frame = 0; frame < 12; frame += 1) {
    runtime.step(1 / 60, frameInput());
  }

  assert(
    runtime.snapshot().puzzle?.solved === true,
    "[anatomy] Endplate Ferry did not latch as solved",
  );
}

function finishEndplateDebrief(runtime: GameRuntime): void {
  runtime.placePlayer("p1", 36.5 * 32, 20 * 32);
  runtime.step(1 / 60, frameInput());
  assert(
    runtime.snapshot().state === "debrief",
    "[anatomy] Endplate Ferry exit did not open the debrief",
  );
  const prompt = runtime.snapshot().debrief?.prompts[0];
  assert(prompt, "[anatomy] no Endplate Ferry debrief prompt");
  assert(
    runtime.snapshot().debrief?.answers[prompt.id] === undefined,
    "[anatomy] the 03 debrief answer leaked into the 04 debrief",
  );
  runtime.submitDebrief(
    prompt.id,
    "Ca²⁺ enters the terminal and triggers ACh release; ACh crosses the cleft, binds the nicotinic receptor, and the muscle responds. AChE clears ACh to end the signal.",
  );
  runtime.finishDebrief();
  assert(
    runtime.snapshot().state === "complete",
    "[anatomy] the Endplate Ferry debrief did not complete the pack",
  );
}

interface RuntimeResult {
  assets: number;
  placeholders: number;
  events: number;
}

function assertAnatomyAssets(content: ReturnType<typeof loadContent>): {
  ids: number;
  placeholders: number;
} {
  const directory = content.directory;
  const finalManifest = parseManifestAt(join(directory, "assets.final.json"));
  const placeholderManifest = parseManifestAt(
    join(directory, "assets.placeholder.json"),
  );
  const assets = createAssets({
    finalManifest,
    packManifest: placeholderManifest,
    logger: silentLogger,
  });

  const ids = [
    ...new Set([
      ...Object.values(content.rooms).flatMap(collectRoomAssetIds),
      ...Object.values(content.rooms).flatMap(collectRoomMaterialAssetIds),
      ...collectMaterialAssetIds(content.materials),
      ...collectThemeAssetIds(content.theme),
      ...Object.values(PLAYER_ASSET_IDS),
    ]),
  ];

  const plan = assets.preload(ids);
  assert(
    plan.missing.length === 0,
    `[anatomy] unresolved IDs: ${plan.missing.join(", ")}`,
  );
  for (const descriptor of plan.descriptors) {
    assert(
      descriptor.placeholderSpec !== undefined,
      `[anatomy] ${descriptor.id} has no placeholder fallback`,
    );
  }

  for (const level of content.levels) {
    const room = content.rooms[level.roomId];
    assert(room, `[anatomy] room ${level.roomId} is missing`);
    const validation = validatePack({
      content,
      room,
      theme: content.theme,
      finalManifest,
      packManifest: placeholderManifest,
      fileExists,
      feedbackVocabulary: FEEDBACK_VOCABULARY,
    });
    if (!validation.ok) {
      const issues = validation.issues
        .map((issue) => `${issue.code}: ${issue.message}`)
        .join("\n    ");
      throw new Error(`[anatomy] validation failed:\n    ${issues}`);
    }
  }

  return { ids: plan.ids.length, placeholders: plan.placeholders.length };
}

function runAnatomyRuntime(): RuntimeResult {
  const content = loadContent(packDirectory("anatomy-reflex"));
  const assetCounts = assertAnatomyAssets(content);
  const storage = new MemorySaveStorage();
  const save = createSave({
    storage,
    now: () => new Date("2026-10-26T12:00:00.000Z"),
  });
  const audio = new FakeAudio();
  const runtime = new GameRuntime({
    content,
    save,
    audio,
    sessionId: "smoke-session",
    now: () => new Date("2026-10-26T12:00:00.000Z"),
  });

  runtime.resize(VIEWPORT.width, VIEWPORT.height);
  runtime.start();

  const booted = runtime.snapshot();
  assert(booted.state === "level", "[anatomy] runtime did not boot into a level");
  assert(booted.level.id === "03-nerve-forest", "[anatomy] wrong start level");
  assert(booted.roomId === "room-nerve-forest", "[anatomy] wrong room");
  assert(booted.activeP2, "[anatomy] player 2 should be active at boot");
  assert(booted.mode === "co-op", "[anatomy] expected co-op mode at boot");
  assert(booted.abilities.includes("scan"), "[anatomy] scan should be available");
  assert(
    booted.puzzle?.id === "puzzle-node-run",
    "[anatomy] room-start puzzle is not active",
  );
  assert(
    booted.puzzle?.pulse === null,
    "[anatomy] Node Run should not expose a pulse cooldown",
  );
  assert(
    runtime.simulation.tetherPolicy === "off",
    "[anatomy] puzzle tether policy was not applied",
  );
  assert(
    booted.checkpointId === "checkpoint-entry",
    "[anatomy] start checkpoint missing",
  );
  assert(
    storage.getItem(runStorageKey("anatomy-reflex"))?.includes("03-nerve-forest") ===
      true,
    "[anatomy] boot did not autosave the run",
  );

  // Shared overlays.
  runtime.step(1 / 60, frameInput({ map: true }));
  assert(runtime.snapshot().state === "map", "[anatomy] Tab did not open the map");
  runtime.step(1 / 60, frameInput({ pause: true }));
  assert(runtime.snapshot().state === "level", "[anatomy] Esc did not close the map");
  runtime.step(1 / 60, frameInput({ log: true }));
  assert(
    runtime.snapshot().state === "conceptLog",
    "[anatomy] C did not open the concept log",
  );
  runtime.step(1 / 60, frameInput({ log: true }));
  assert(
    runtime.snapshot().state === "level",
    "[anatomy] C did not close the concept log",
  );
  runtime.step(1 / 60, frameInput({ pause: true }));
  assert(runtime.snapshot().state === "pause", "[anatomy] Esc did not pause");
  runtime.step(1 / 60, frameInput({ pause: true }));
  assert(runtime.snapshot().state === "level", "[anatomy] Esc did not resume");

  // Conversation + choice.
  walkTo(runtime, "agent-neuron");
  assert(
    runtime.interactionId() === "agent-neuron",
    "[anatomy] interaction highlight did not find the Neuron Keeper",
  );
  runtime.step(
    1 / 60,
    frameInput({
      p1: { interact: true, scan: false, pulse: false, carry: false, throw: false },
    }),
  );
  const conversation = [...runtime.conversations.values()][0];
  assert(conversation, "[anatomy] E did not start a conversation");
  assert(
    runtime.snapshot().state === "level",
    "[anatomy] conversation must not enter a blocking state",
  );
  assert(
    conversation.session.dialogueId === "dlg-neuron-01",
    "[anatomy] wrong dialogue id",
  );

  runtime.surfaceAction(conversation.surfaceId, { type: "confirm" });
  runtime.surfaceAction(conversation.surfaceId, { type: "confirm" });
  runtime.surfaceAction(conversation.surfaceId, { type: "confirm" });
  const choices = runtime
    .snapshot()
    .feedback.surfaces.find((surface) => surface.id === conversation.surfaceId)
    ?.content.choices;
  assert(choices?.length === 2, "[anatomy] conversation choices missing");
  runtime.surfaceAction(conversation.surfaceId, {
    type: "choose",
    choiceId: "right",
  });
  assert(
    runtime.snapshot().knownConceptIds.includes("CON-3"),
    "[anatomy] conversation did not reveal the neuron concept",
  );
  runtime.surfaceAction(conversation.surfaceId, { type: "confirm" });
  assert(
    runtime.conversations.size === 0,
    "[anatomy] final conversation surface did not close",
  );

  // Scan.
  walkTo(runtime, "scan-pathway");
  runtime.step(
    1 / 60,
    frameInput({
      p1: { interact: false, scan: true, pulse: false, carry: false, throw: false },
    }),
  );
  assert(
    runtime.snapshot().knownConceptIds.includes("CON-5"),
    "[anatomy] Q did not reveal the pathway concept",
  );
  assert(audio.played.length > 0, "[anatomy] no audio cues fired");

  // Node Run puzzle.
  solveNodeRun(runtime, content);
  assert(
    runtime.snapshot().puzzle?.solved === true,
    "[anatomy] Node Run did not latch as solved",
  );

  // Dash only works after the unlock.
  runtime.placePlayer("p2", runtime.simulation.players.p1.x + 40, runtime.simulation.players.p1.y);
  const beforeDash = runtime.simulation.players.p1.x;
  runtime.step(1 / 60, {
    ...frameInput(),
    intents: {
      ...frameInput().intents,
      p1: { moveX: 0, jump: false, dash: true },
    },
  });
  assert(
    runtime.simulation.players.p1.x > beforeDash,
    "[anatomy] signal-dash did not move player 1",
  );

  // Exit -> 03 debrief -> 04 transition.
  finishNodeRunDebrief(runtime);

  const transitioned = runtime.snapshot();
  assert(
    transitioned.roomId === "room-muscle-effector",
    "[anatomy] the transition did not load the muscle-effector room",
  );
  assert(
    transitioned.checkpointId === "checkpoint-muscle-entry",
    "[anatomy] the transition did not use the 04 checkpoint",
  );
  assert(
    transitioned.puzzle === null,
    "[anatomy] Endplate Ferry should wait for interact activation",
  );
  assert(
    transitioned.map.nodes.find((node) => node.current)?.id ===
      "map-muscle-effector",
    "[anatomy] the map did not move to the muscle effector",
  );

  // 04 puzzle -> debrief -> complete -> evidence.
  solveEndplateFerry(runtime, content);
  finishEndplateDebrief(runtime);

  const evidence = runtime.exportEvidence();
  assert(evidence.mode === "co-op", "[anatomy] evidence mode is wrong");
  assert(evidence.sessionId === "smoke-session", "[anatomy] evidence session is wrong");
  assert(
    evidence.objectives.find((item) => item.id === "OBJ-2")?.requiredMet === true,
    "[anatomy] OBJ-2 evidence is incomplete",
  );
  for (const puzzleId of ["puzzle-node-run", "puzzle-endplate-ferry"]) {
    assert(
      evidence.events.some(
        (event) =>
          event.type === "puzzle_solved" && event.puzzleId === puzzleId,
      ),
      `[anatomy] ${puzzleId} puzzle_solved event is missing from evidence`,
    );
  }
  assert(
    evidence.events.some((event) => event.type === "debrief_completed"),
    "[anatomy] debrief_completed event is missing from evidence",
  );
  assert(
    evidence.events.some((event) => event.type === "pack_completed"),
    "[anatomy] pack_completed event is missing from evidence",
  );

  // Restore: solving the gate autosaves an ability the next boot must keep.
  const restoreStorage = new MemorySaveStorage();
  const restoreSave = createSave({
    storage: restoreStorage,
    now: () => new Date("2026-10-26T12:10:00.000Z"),
  });
  const first = new GameRuntime({
    content,
    save: restoreSave,
    audio: new FakeAudio(),
    sessionId: "smoke-restore-a",
  });
  first.start();
  solveNodeRun(first, content);
  first.step(1 / 60, frameInput());

  const restored = new GameRuntime({
    content,
    save: createSave({ storage: restoreStorage }),
    audio: new FakeAudio(),
    sessionId: "smoke-restore-b",
  });
  restored.start();
  const restoredSnapshot = restored.snapshot();
  assert(
    restoredSnapshot.abilities.includes("signal-dash"),
    "[anatomy] restore lost the signal-dash unlock",
  );
  assert(
    restoredSnapshot.map.nodes.find((node) => node.id === "map-muscle-effector")
      ?.visited === true,
    "[anatomy] restore lost the revealed map node",
  );
  assert(
    restoredSnapshot.toast === "Resumed from checkpoint",
    "[anatomy] restore did not announce the checkpoint",
  );

  // Settings live in their own slot and survive a fresh save module.
  restored.toggleMute();
  restored.setTextScale(1.3);
  restored.toggleReducedMotion();
  const reloaded = createSave({ storage: restoreStorage });
  assert(reloaded.settings.audio.muted === true, "[anatomy] mute did not persist");
  assert(
    reloaded.settings.accessibility.textScale === 1.3,
    "[anatomy] text scale did not persist",
  );
  assert(
    reloaded.settings.accessibility.reducedMotion === true,
    "[anatomy] reduced motion did not persist",
  );

  // Co-op checkpoint toggle.
  restored.placePlayer("p1", 4.5 * 32, 20 * 32);
  restored.togglePlayer2();
  assert(
    restored.snapshot().activeP2 === false &&
      restored.snapshot().mode === "solo",
    "[anatomy] P did not drop player 2",
  );
  restored.togglePlayer2();
  assert(
    restored.snapshot().activeP2 === true &&
      restored.snapshot().mode === "co-op",
    "[anatomy] P did not rejoin player 2",
  );

  return {
    assets: assetCounts.ids,
    placeholders: assetCounts.placeholders,
    events: evidence.events.length,
  };
}

function main(): void {
  try {
    const parsedRoom = parseRoom(readJson("room.json"));
    if (!parsedRoom.ok) {
      throw new Error(parsedRoom.error);
    }
    const parsedTheme = parseTheme(readJson("theme.json"));
    if (!parsedTheme.ok) {
      throw new Error(parsedTheme.error);
    }

    const room = parsedRoom.value;
    const theme = parsedTheme.value;
    const finalManifest = parseFileManifest("assets.final.json");
    const fixtureManifest = parseFileManifest("assets.fixture.json");

    console.log("Shrinkonauts pack smoke");
    console.log(`  dev room: ${room.id} (${room.width} × ${room.height})`);

    const results = [
      runMode("placeholder", room, theme, finalManifest, null),
      runMode("fixture", room, theme, finalManifest, fixtureManifest),
    ];

    for (const result of results) {
      console.log(
        `  [${result.label}] PASS — ${result.ids} IDs, ${result.placeholders} placeholder${result.placeholders === 1 ? "" : "s"}, spawn/ground/camera/movement/cues`,
      );
    }

    const runtime = runAnatomyRuntime();
    console.log(
      `  [anatomy runtime] PASS — ${runtime.assets} IDs, ${runtime.placeholders} placeholders, conversation/scan/Node Run/transition/Endplate Ferry/exit/debrief/save/dash/co-op`,
    );
    console.log(`  [anatomy runtime] evidence: ${runtime.events} events exported`);

    console.log("\nPASS — pack smoke");
  } catch (error) {
    console.error(
      `\nFAIL — ${error instanceof Error ? error.message : String(error)}`,
    );
    process.exitCode = 1;
  }
}

main();
