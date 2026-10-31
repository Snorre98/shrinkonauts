import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { parseManifest } from "../src/assets/manifest";
import type { AssetManifest } from "../src/assets/types";
import { NODE_EFFECT_SOCKETS, effectPresetIds } from "../src/feedback";
import { parseHubDocument } from "../src/hub/parse";
import { validateHub } from "../src/hub/validate";
import { parsePackCatalog } from "../src/pack/catalog";
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
const HUB_DIR = join(PUBLIC_DIR, "hub", "bathroom");

const FEEDBACK_VOCABULARY = {
  effectPresetIds: effectPresetIds(),
  tilePathPreset: "fx.tile.path",
  nodeEffectSockets: NODE_EFFECT_SOCKETS,
} as const;

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
    feedbackVocabulary: FEEDBACK_VOCABULARY,
  });
  printReport("placeholder", placeholderResult);

  console.log("\n  mode:  fixture (final + fixture manifest)");
  const fixtureResult = validatePack({
    room,
    theme,
    finalManifest,
    packManifest: fixtureManifest,
    fileExists,
    feedbackVocabulary: FEEDBACK_VOCABULARY,
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
    feedbackVocabulary: FEEDBACK_VOCABULARY,
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

function readHubJson(file: string): unknown {
  return JSON.parse(readFileSync(join(HUB_DIR, file), "utf8"));
}

function validateCatalogAndHub(): boolean {
  let catalog;
  try {
    catalog = parsePackCatalog(
      JSON.parse(readFileSync(join(PACKS_DIR, "index.json"), "utf8")),
    );
  } catch (error) {
    console.error(
      `FAIL — could not read pack catalog: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
    return false;
  }
  if (!catalog.ok) {
    console.error(`FAIL — ${catalog.error}`);
    return false;
  }

  console.log("\nPack catalog");
  for (const entry of catalog.value.packs) {
    console.log(
      `  ${entry.id}: ${entry.status}${entry.online ? " · online-ready" : ""}`,
    );
    if (entry.status === "available") {
      try {
        const pack = JSON.parse(
          readFileSync(join(PACKS_DIR, entry.path, "pack.json"), "utf8"),
        ) as { id?: unknown; title?: unknown };
        if (pack.id !== entry.id) {
          console.error(
            `  FAIL — catalog id "${entry.id}" does not match pack.json id "${String(pack.id)}"`,
          );
          return false;
        }
        if (pack.title !== entry.title) {
          console.error(
            `  FAIL — catalog title "${entry.title}" does not match pack.json title "${String(pack.title)}"`,
          );
          return false;
        }
      } catch (error) {
        console.error(
          `  FAIL — could not read ${entry.path}pack.json: ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
        return false;
      }
    } else if (entry.status === "coming-soon") {
      console.log(`  · warning: ${entry.id} is visible but not installed yet`);
    }
  }

  console.log("\nBathroom hub");
  try {
    const parsedHub = parseHubDocument(readHubJson("hub.json"));
    if (!parsedHub.ok) throw new Error(parsedHub.error);
    const parsedTheme = parseTheme(readHubJson("theme.json"));
    if (!parsedTheme.ok) throw new Error(parsedTheme.error);
    const finalManifest = parseFileManifest(
      HUB_DIR,
      parsedHub.value.assetManifests.final ?? "assets.final.json",
      readHubJson,
    );
    const placeholderManifest = parseFileManifest(
      HUB_DIR,
      parsedHub.value.assetManifests.placeholder ?? "assets.placeholder.json",
      readHubJson,
    );
    const result = validateHub({
      hub: parsedHub.value,
      theme: parsedTheme.value,
      finalManifest,
      packManifest: placeholderManifest,
      fileExists,
    });
    const placeholderLabel =
      result.placeholders.length === 1 ? "placeholder" : "placeholders";
    console.log(
      `  ${result.ids.length} IDs · ${result.placeholders.length} ${placeholderLabel}`,
    );
    if (result.ok) {
      console.log("  PASS — no issues");
    } else {
      console.log(`  FAIL — ${result.issues.length} issues`);
      for (const issue of result.issues) {
        const id = issue.id ? ` [${issue.id}]` : "";
        console.log(`    - ${issue.code}${id}: ${issue.message}`);
      }
    }
    for (const warning of result.warnings) {
      console.log(`    · warning: ${warning}`);
    }
    return result.ok;
  } catch (error) {
    console.error(
      `  FAIL — could not read bathroom hub: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
    return false;
  }
}

function main(): void {
  console.log("Shrinkonauts pack validation\n");
  const devOk = validateDev();
  const anatomyOk = validateAnatomy();
  const catalogOk = validateCatalogAndHub();
  const ok = devOk && anatomyOk && catalogOk;
  console.log(ok ? "\nPASS — pack validation" : "\nFAIL — pack validation");
  if (!ok) {
    process.exitCode = 1;
  }
}

main();
