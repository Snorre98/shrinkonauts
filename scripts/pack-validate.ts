import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { parseManifest } from "../src/assets/manifest";
import type { AssetManifest } from "../src/assets/types";
import { parseRoom, parseTheme } from "../src/pack/load";
import type { RoomDocument, ThemeDocument } from "../src/pack/types";
import {
  validatePack,
  type PackValidationResult,
} from "../src/pack/validate";
import {
  loadContent,
  PACKS_DIR,
  PUBLIC_DIR,
  primaryRoom,
} from "./content-loader";

const CONTENT_DIR = join(PUBLIC_DIR, "content", "dev");
const PACK_DIR = join(PACKS_DIR, "anatomy-reflex");

function readDevJson(file: string): unknown {
  return JSON.parse(readFileSync(join(CONTENT_DIR, file), "utf8"));
}

function readPackJson(file: string): unknown {
  return JSON.parse(readFileSync(join(PACK_DIR, file), "utf8"));
}

function parseFileManifest(
  base: string,
  file: string,
  read: (file: string) => unknown,
): AssetManifest {
  const path = join(base, file);
  const parsed = parseManifest(read(file), pathToFileURL(path).href);
  if (!parsed.ok) {
    throw new Error(parsed.error);
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

function printReport(label: string, result: PackValidationResult): void {
  const placeholderLabel =
    result.placeholders.length === 1 ? "placeholder" : "placeholders";
  console.log(
    `  ${label}: ${result.ids.length} IDs · ${result.placeholders.length} ${placeholderLabel}`,
  );

  if (result.ok) {
    console.log("  PASS — no issues");
  } else {
    const issueLabel = result.issues.length === 1 ? "issue" : "issues";
    console.log(`  FAIL — ${result.issues.length} ${issueLabel}`);
    for (const issue of result.issues) {
      const id = issue.id ? ` [${issue.id}]` : "";
      console.log(`    - ${issue.code}${id}: ${issue.message}`);
    }
  }

  if (result.warnings.length > 0) {
    for (const warning of result.warnings) {
      console.log(`    · warning: ${warning}`);
    }
  }
}

function validateDev(): boolean {
  let room: RoomDocument;
  let theme: ThemeDocument;
  let finalManifest: AssetManifest;
  let fixtureManifest: AssetManifest;

  try {
    const parsedRoom = parseRoom(readDevJson("room.json"));
    if (!parsedRoom.ok) throw new Error(parsedRoom.error);
    room = parsedRoom.value;

    const parsedTheme = parseTheme(readDevJson("theme.json"));
    if (!parsedTheme.ok) throw new Error(parsedTheme.error);
    theme = parsedTheme.value;

    finalManifest = parseFileManifest(CONTENT_DIR, "assets.final.json", readDevJson);
    fixtureManifest = parseFileManifest(
      CONTENT_DIR,
      "assets.fixture.json",
      readDevJson,
    );
  } catch (error) {
    console.error(
      `FAIL — could not read dev content: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
    return false;
  }

  console.log("Dev fixture");
  console.log(`  room:  ${room.id} (${room.width} × ${room.height})`);
  console.log(`  theme: ${theme.id}`);
  console.log(`  mode:  placeholder (final manifest only)`);

  const placeholderResult = validatePack({
    room,
    theme,
    finalManifest,
    packManifest: null,
    fileExists,
  });
  printReport("placeholder", placeholderResult);

  console.log("\n  mode:  fixture (final + fixture manifest)");
  const fixtureResult = validatePack({
    room,
    theme,
    finalManifest,
    packManifest: fixtureManifest,
    fileExists,
  });
  printReport("fixture", fixtureResult);

  return placeholderResult.ok && fixtureResult.ok;
}

function validateAnatomy(): boolean {
  let content;
  let placeholderManifest: AssetManifest;
  let finalManifest: AssetManifest;
  let room: RoomDocument;

  try {
    content = loadContent(PACK_DIR);
    room = primaryRoom(content);
    placeholderManifest = parseFileManifest(
      PACK_DIR,
      content.pack.assetManifests.placeholder ?? "assets.placeholder.json",
      readPackJson,
    );
    finalManifest = parseFileManifest(
      PACK_DIR,
      content.pack.assetManifests.final ?? "assets.final.json",
      readPackJson,
    );
  } catch (error) {
    console.error(
      `FAIL — could not read anatomy-reflex pack: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
    return false;
  }

  console.log("\nAnatomy reflex pack");
  console.log(`  pack:   ${content.pack.id} v${content.pack.version}`);
  console.log(
    `  levels: ${content.pack.levels.join(", ")} (start ${content.pack.startLevelId}, end ${content.pack.endLevelId})`,
  );
  console.log(
    `  syllabus: ${content.syllabus.id} v${content.syllabus.version}`,
  );

  const result = validatePack({
    room,
    theme: content.theme,
    finalManifest,
    packManifest: placeholderManifest,
    fileExists,
    content,
  });
  printReport("placeholder", result);

  const mappedObjectives = Object.values(content.mapping.objectives).filter(
    (entry) => entry.levels.length > 0,
  ).length;
  const mappedConcepts = Object.values(content.mapping.concepts).filter(
    (entry) =>
      entry.levels.length > 0 ||
      entry.dialogues.length > 0 ||
      entry.scanTargets.length > 0,
  ).length;
  console.log(
    `\n  coverage: ${mappedObjectives}/${content.syllabus.objectives.length} objectives · ${mappedConcepts}/${content.syllabus.concepts.length} concepts`,
  );

  return result.ok;
}

function main(): void {
  console.log("Shrinkonauts pack validation\n");
  const devOk = validateDev();
  const anatomyOk = validateAnatomy();
  const ok = devOk && anatomyOk;
  console.log(ok ? "\nPASS — pack validation" : "\nFAIL — pack validation");
  if (!ok) {
    process.exitCode = 1;
  }
}

main();
