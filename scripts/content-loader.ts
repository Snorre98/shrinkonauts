import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  parseDialogue,
  parseGate,
  parseLevel,
  parseLicences,
  parseMapping,
  parseMaterials,
  parsePack,
  parsePuzzle,
  parseRoom,
  parseTheme,
  type DialogueDocument,
  type GateDocument,
  type LevelDocument,
  type LicenceDocument,
  type MappingDocument,
  type PackContent,
  type PackDocument,
  type RoomDocument,
  type ThemeDocument,
} from "../src/pack";
import type { MaterialsDocument } from "../src/materials";
import type { PuzzleDocument } from "../src/puzzle";
import { parseSyllabus, type Syllabus } from "../src/syllabus";

const HERE = dirname(fileURLToPath(import.meta.url));
export const REPO_ROOT = join(HERE, "..");
export const PUBLIC_DIR = join(REPO_ROOT, "public");
export const PACKS_DIR = join(PUBLIC_DIR, "packs");
export const SYLLABI_DIR = join(PUBLIC_DIR, "syllabi");

function readJson(path: string): unknown {
  return JSON.parse(readFileSync(path, "utf8"));
}

function expectOk<T>(
  result: { ok: true; value: T } | { ok: false; error: string },
  path: string,
): T {
  if (!result.ok) {
    throw new Error(`${path}: ${result.error}`);
  }
  return result.value;
}

function firstExisting(candidates: string[], label: string): string {
  for (const candidate of candidates) {
    if (existsSync(candidate)) return candidate;
  }
  throw new Error(`${label} not found; tried ${candidates.join(", ")}`);
}

export function loadSyllabusFile(id: string, directory = SYLLABI_DIR): Syllabus {
  const path = join(directory, `${id}.json`);
  const parsed = expectOk(parseSyllabus(readJson(path)), path);
  return parsed.syllabus;
}

export interface LoadedContent extends PackContent {
  directory: string;
}

export interface LoadContentOptions {
  syllabusDirectory?: string;
}

export function loadContent(
  packDirectory: string,
  options: LoadContentOptions = {},
): LoadedContent {
  const directory = resolve(packDirectory);
  const packPath = join(directory, "pack.json");
  const pack: PackDocument = expectOk(parsePack(readJson(packPath)), packPath);

  const themePath = join(directory, pack.theme);
  const theme: ThemeDocument = expectOk(
    parseTheme(readJson(themePath)),
    themePath,
  );

  let materials: MaterialsDocument | undefined;
  if (pack.materials) {
    const materialsPath = join(directory, pack.materials);
    materials = expectOk(parseMaterials(readJson(materialsPath)), materialsPath);
  }

  const syllabus = loadSyllabusFile(
    pack.syllabusId,
    options.syllabusDirectory ?? SYLLABI_DIR,
  );

  const levels: LevelDocument[] = [];
  const rooms: Record<string, RoomDocument> = {};
  const dialogues: Record<string, DialogueDocument> = {};
  const gates: Record<string, GateDocument> = {};
  const puzzles: Record<string, PuzzleDocument> = {};

  for (const levelId of pack.levels) {
    const levelDir = join(directory, "levels", levelId);
    const levelPath = join(levelDir, "level.json");
    const level = expectOk(parseLevel(readJson(levelPath)), levelPath);
    levels.push(level);

    if (!rooms[level.roomId]) {
      const roomPath = join(levelDir, "room.json");
      rooms[level.roomId] = expectOk(parseRoom(readJson(roomPath)), roomPath);
    }

    for (const dialogueId of level.dialogueIds) {
      if (dialogues[dialogueId]) continue;
      const path = firstExisting(
        [
          join(levelDir, `${dialogueId}.json`),
          join(levelDir, "dialogue.json"),
          join(directory, "dialogues", `${dialogueId}.json`),
        ],
        `dialogue ${dialogueId}`,
      );
      dialogues[dialogueId] = expectOk(parseDialogue(readJson(path)), path);
    }

    for (const gateId of level.gateIds) {
      if (gates[gateId]) continue;
      const path = firstExisting(
        [
          join(levelDir, `${gateId}.json`),
          join(levelDir, "gate.json"),
          join(directory, "gates", `${gateId}.json`),
        ],
        `gate ${gateId}`,
      );
      gates[gateId] = expectOk(parseGate(readJson(path)), path);
    }

    for (const puzzleId of level.puzzleIds ?? []) {
      if (puzzles[puzzleId]) continue;
      const path = firstExisting(
        [
          join(levelDir, `${puzzleId}.json`),
          join(levelDir, "puzzle.json"),
          join(directory, "puzzles", `${puzzleId}.json`),
        ],
        `puzzle ${puzzleId}`,
      );
      puzzles[puzzleId] = expectOk(parsePuzzle(readJson(path)), path);
    }
  }

  const mappingPath = join(directory, pack.mapping);
  const mapping: MappingDocument = expectOk(
    parseMapping(readJson(mappingPath)),
    mappingPath,
  );

  const licencesPath = join(directory, pack.licenses);
  const licenses: LicenceDocument = expectOk(
    parseLicences(readJson(licencesPath)),
    licencesPath,
  );

  return {
    directory,
    pack,
    syllabus,
    theme,
    mapping,
    licenses,
    levels,
    rooms,
    dialogues,
    gates,
    puzzles,
    ...(materials ? { materials } : {}),
  };
}

export function packDirectory(idOrPath: string): string {
  if (idOrPath.includes("/") || idOrPath.endsWith(".json")) {
    return resolve(idOrPath);
  }
  return join(PACKS_DIR, idOrPath);
}

export function primaryRoom(content: PackContent): RoomDocument {
  const level = content.levels[0];
  if (!level) {
    throw new Error("pack has no levels");
  }
  const room = content.rooms[level.roomId];
  if (!room) {
    throw new Error(`level ${level.id} room is missing`);
  }
  return room;
}
