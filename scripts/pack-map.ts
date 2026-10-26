import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { buildMapping, normalizeMapping } from "../src/pack";
import { loadContent, packDirectory } from "./content-loader";

function argument(name: string): string | undefined {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

const target = packDirectory(argument("--pack") ?? "anatomy-reflex");

try {
  const content = loadContent(target);
  const mapping = normalizeMapping(
    buildMapping({
      pack: content.pack,
      syllabus: content.syllabus,
      levels: content.levels,
      rooms: content.rooms,
      dialogues: content.dialogues,
      gates: content.gates,
    }),
  );

  const output = join(target, content.pack.mapping);
  writeFileSync(output, `${JSON.stringify(mapping, null, 2)}\n`, "utf8");

  const objectiveCount = Object.keys(mapping.objectives).length;
  const conceptCount = Object.keys(mapping.concepts).length;
  console.log(
    `pack:map wrote ${output} (${objectiveCount} objectives, ${conceptCount} concepts)`,
  );
} catch (error) {
  console.error(
    `pack:map failed: ${error instanceof Error ? error.message : String(error)}`,
  );
  process.exit(1);
}
