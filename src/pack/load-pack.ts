import { err, ok, type Result } from "../core/result";
import { parseSyllabus, type Syllabus } from "../syllabus";
import { parseRoom, parseTheme } from "./load";
import { parseJsonUrl } from "./parse-common";
import {
  parseDialogue,
  parseGate,
  parseLevel,
  parseLicences,
  parseMapping,
  parsePack,
} from "./parse-content";
import { parsePuzzle } from "./parse-puzzle";
import type {
  DialogueDocument,
  GateDocument,
  LevelDocument,
  PackContent,
  PackDocument,
  RoomDocument,
  ThemeDocument,
} from "./types";
import type { PuzzleDocument } from "../puzzle";

export interface LoadPackContentOptions {
  /** Directory URL of the pack, for example `/packs/anatomy-reflex/`. */
  packUrl: string;
  /** Directory URL of the syllabi, for example `/syllabi/`. */
  syllabusBaseUrl: string;
  fetchImpl?: typeof fetch;
}

export interface LoadedPackContent extends PackContent {
  warnings: string[];
}

async function json(
  url: URL,
  fetchImpl: typeof fetch,
): Promise<Result<unknown>> {
  return parseJsonUrl(url.toString(), fetchImpl);
}

async function firstJson(
  urls: URL[],
  fetchImpl: typeof fetch,
): Promise<Result<unknown>> {
  let last: Result<unknown> = err(
    `CONTENT_FETCH_FAILED: no candidate URL for ${urls[0]?.toString() ?? ""}`,
  );
  for (const url of urls) {
    const result = await json(url, fetchImpl);
    if (result.ok) return result;
    last = result;
  }
  return last;
}

function expect<T>(
  result: Result<T>,
  path: string,
): Result<T> {
  if (result.ok) return result;
  return err(`${path}: ${result.error}`);
}

/**
 * Browser pack loader. The Node smoke/validation scripts use `scripts/content-loader`,
 * which shares the same parsers but reads from disk.
 */
export async function loadPackContent(
  options: LoadPackContentOptions,
): Promise<Result<LoadedPackContent>> {
  const fetchImpl = options.fetchImpl ?? fetch;
  const packUrl = new URL(options.packUrl, globalThis.location?.href);
  const syllabusBase = new URL(
    options.syllabusBaseUrl,
    globalThis.location?.href,
  );
  const warnings: string[] = [];

  const packJson = await json(new URL("pack.json", packUrl), fetchImpl);
  if (!packJson.ok) return err(packJson.error);
  const packResult = parsePack(packJson.value);
  if (!packResult.ok) return err(`pack.json: ${packResult.error}`);
  const pack: PackDocument = packResult.value;

  const themeJson = await json(new URL(pack.theme, packUrl), fetchImpl);
  if (!themeJson.ok) return err(themeJson.error);
  const themeResult = parseTheme(themeJson.value);
  if (!themeResult.ok) return err(`${pack.theme}: ${themeResult.error}`);
  const theme: ThemeDocument = themeResult.value;

  const syllabusJson = await json(
    new URL(`${pack.syllabusId}.json`, syllabusBase),
    fetchImpl,
  );
  if (!syllabusJson.ok) return err(syllabusJson.error);
  const syllabusResult = parseSyllabus(syllabusJson.value);
  if (!syllabusResult.ok) return err(syllabusResult.error);
  warnings.push(...syllabusResult.value.warnings);
  const syllabus: Syllabus = syllabusResult.value.syllabus;

  const levels: LevelDocument[] = [];
  const rooms: Record<string, RoomDocument> = {};
  const dialogues: Record<string, DialogueDocument> = {};
  const gates: Record<string, GateDocument> = {};
  const puzzles: Record<string, PuzzleDocument> = {};

  for (const levelId of pack.levels) {
    const levelDir = new URL(`levels/${levelId}/`, packUrl);
    const levelJson = await json(new URL("level.json", levelDir), fetchImpl);
    if (!levelJson.ok) return err(levelJson.error);
    const level = expect(parseLevel(levelJson.value), `levels/${levelId}/level.json`);
    if (!level.ok) return err(level.error);
    levels.push(level.value);

    if (!rooms[level.value.roomId]) {
      const roomJson = await json(new URL("room.json", levelDir), fetchImpl);
      if (!roomJson.ok) return err(roomJson.error);
      const room = expect(
        parseRoom(roomJson.value),
        `levels/${levelId}/room.json`,
      );
      if (!room.ok) return err(room.error);
      rooms[level.value.roomId] = room.value;
    }

    for (const dialogueId of level.value.dialogueIds) {
      if (dialogues[dialogueId]) continue;
      const dialogueJson = await firstJson(
        [
          new URL(`${dialogueId}.json`, levelDir),
          new URL("dialogue.json", levelDir),
        ],
        fetchImpl,
      );
      if (!dialogueJson.ok) return err(dialogueJson.error);
      const dialogue = expect(
        parseDialogue(dialogueJson.value),
        `dialogue ${dialogueId}`,
      );
      if (!dialogue.ok) return err(dialogue.error);
      dialogues[dialogueId] = dialogue.value;
    }

    for (const gateId of level.value.gateIds) {
      if (gates[gateId]) continue;
      const gateJson = await firstJson(
        [
          new URL(`${gateId}.json`, levelDir),
          new URL("gate.json", levelDir),
        ],
        fetchImpl,
      );
      if (!gateJson.ok) return err(gateJson.error);
      const gate = expect(parseGate(gateJson.value), `gate ${gateId}`);
      if (!gate.ok) return err(gate.error);
      gates[gateId] = gate.value;
    }

    for (const puzzleId of level.value.puzzleIds ?? []) {
      if (puzzles[puzzleId]) continue;
      const puzzleJson = await firstJson(
        [
          new URL(`${puzzleId}.json`, levelDir),
          new URL("puzzle.json", levelDir),
        ],
        fetchImpl,
      );
      if (!puzzleJson.ok) return err(puzzleJson.error);
      const puzzle = expect(
        parsePuzzle(puzzleJson.value),
        `puzzle ${puzzleId}`,
      );
      if (!puzzle.ok) return err(puzzle.error);
      puzzles[puzzleId] = puzzle.value;
    }
  }

  const mappingJson = await json(new URL(pack.mapping, packUrl), fetchImpl);
  if (!mappingJson.ok) return err(mappingJson.error);
  const mapping = expect(parseMapping(mappingJson.value), pack.mapping);
  if (!mapping.ok) return err(mapping.error);

  const licencesJson = await json(new URL(pack.licenses, packUrl), fetchImpl);
  if (!licencesJson.ok) return err(licencesJson.error);
  const licences = expect(parseLicences(licencesJson.value), pack.licenses);
  if (!licences.ok) return err(licences.error);

  return ok({
    pack,
    syllabus,
    theme,
    mapping: mapping.value,
    licenses: licences.value,
    levels,
    rooms,
    dialogues,
    gates,
    puzzles,
    warnings,
  });
}
