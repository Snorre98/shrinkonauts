/**
 * cueforge-adopt.ts — install a cueforge render into the Shrinkonauts packs.
 *
 * This is the external adapter from cueforge ADR-0009. It consumes a cueforge
 * render result and receipt; it does not generate audio and it does not read
 * cueforge internals.
 *
 * Usage:
 *   tsx scripts/cueforge-adopt.ts --result <path> [--audio <path>] [--receipt <path>]
 *   tsx scripts/cueforge-adopt.ts --result <path> --dry-run
 *   tsx scripts/cueforge-adopt.ts --result <path> --overwrite
 *
 * The adapter validates the cue ID against the existing manifests, updates only
 * that cue, mirrors anatomy cues into the Silicon pack, writes licence records,
 * and appends one prompt-log row per generated layer. Re-running with the same
 * output hash is a no-op.
 */

import { createHash } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { dirname, isAbsolute, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
export const DEFAULT_REPO_ROOT = join(HERE, "..");

const ANATOMY_DIR = "public/packs/anatomy-reflex";
const SILICON_DIR = "public/packs/silicon-reflex";
const HUB_DIR = "public/hub/bathroom";
const PROMPT_LOG = "docs/audio/sfx-prompt-log.csv";
const LICENSE_NAME = "Stability AI Community License";
const LICENSE_URL = "https://stability.ai/license";
const MODEL_LABEL = "Stability AI Stable Audio 3 Small SFX (local)";
const MAX_AUDIO_BYTES = 120 * 1024;

type JsonObject = Record<string, any>;

export interface AdoptOptions {
  repoRoot: string;
  resultPath: string;
  audioPath?: string;
  receiptPath?: string;
  dryRun?: boolean;
  overwrite?: boolean;
}

interface PlannedFile {
  kind: "audio" | "manifest" | "licence" | "prompt-log";
  path: string;
  source?: string;
  sha256?: string;
  bytes?: Buffer;
  action: "create" | "replace" | "unchanged";
  label: string;
}

export interface AdoptionPlan {
  cueId: string;
  destination: "anatomy" | "hub";
  audioPath: string;
  manifestSrc: string;
  files: PlannedFile[];
  promptRows: string[][];
  promptLogPath: string;
  warnings: string[];
}

export interface AdoptionReport {
  cueId: string;
  applied: string[];
  unchanged: string[];
  promptRowsAdded: number;
  warnings: string[];
}

export function planAdoption(options: AdoptOptions): AdoptionPlan {
  const repoRoot = resolve(options.repoRoot);
  const result = readJson(resolve(options.resultPath)) as JsonObject;
  validateRenderResult(result);

  const exportBlock = result.export as JsonObject;
  if (exportBlock?.adapter !== "shrinkonauts") {
    throw new Error(`render result export.adapter must be "shrinkonauts", got ${JSON.stringify(exportBlock?.adapter)}`);
  }
  const cueId = String(exportBlock.options?.cue ?? "");
  if (!cueId) throw new Error("render result has no export.options.cue");
  const destination = String(exportBlock.options?.destination ?? "");
  if (destination !== "anatomy" && destination !== "hub") {
    throw new Error(`unsupported export.options.destination ${JSON.stringify(destination)}`);
  }

  const output = result.outputs?.[0] as JsonObject | undefined;
  if (!output) throw new Error("render result has no outputs");
  if (output.codec !== "mp3") throw new Error(`cueforge output must be MP3, got ${JSON.stringify(output.codec)}`);
  const audioPath = resolveInputPath(options.audioPath ?? String(output.path));
  if (!existsSync(audioPath)) throw new Error(`audio file not found: ${audioPath}`);
  const audioBytes = readFileSync(audioPath);
  if (audioBytes.length > MAX_AUDIO_BYTES) {
    throw new Error(`audio is ${audioBytes.length} bytes; the profile limit is ${MAX_AUDIO_BYTES}`);
  }
  const audioHash = sha256(audioBytes);
  if (audioHash !== output.sha256) {
    throw new Error(`audio hash ${audioHash} does not match render result ${output.sha256}`);
  }

  const receiptPath = resolveInputPath(options.receiptPath ?? String(result.receipt?.path ?? ""));
  if (!receiptPath || !existsSync(receiptPath)) throw new Error(`receipt not found: ${receiptPath}`);
  const receiptBytes = readFileSync(receiptPath);
  const receiptHash = sha256(receiptBytes);
  if (receiptHash !== result.receipt?.sha256) {
    throw new Error(`receipt hash ${receiptHash} does not match render result ${result.receipt?.sha256}`);
  }
  const receipt = JSON.parse(receiptBytes.toString("utf8")) as JsonObject;
  validateReceipt(receipt, result, output, audioHash);

  const assetFile = fileNameForCue(cueId);
  const manifestSrc = `shared/audio/${assetFile}`;
  const manifestRel = destination === "anatomy" ? `${ANATOMY_DIR}/assets.final.json` : `${HUB_DIR}/assets.final.json`;
  const manifestPath = join(repoRoot, manifestRel);
  if (!existsSync(manifestPath)) throw new Error(`manifest not found: ${manifestPath}`);
  const manifest = readJson(manifestPath) as JsonObject;
  const entry = manifest.assets?.[cueId];
  if (!entry) throw new Error(`${cueId} is not declared in ${manifestRel}; refusing to invent a cue ID`);

  const destinationRoot = destination === "anatomy" ? join(repoRoot, ANATOMY_DIR) : join(repoRoot, HUB_DIR);
  const audioDest = join(destinationRoot, "shared", "audio", assetFile);
  const files: PlannedFile[] = [];
  files.push(planAudio(audioPath, audioDest, audioHash, options.overwrite ?? false, `${cueId} audio`));

  const updatedManifest = structuredClone(manifest);
  const updatedEntry = updatedManifest.assets[cueId];
  delete updatedEntry.placeholder;
  updatedEntry.src = manifestSrc;
  updatedEntry.license = LICENSE_NAME;
  files.push(planText(manifestPath, jsonBytes(updatedManifest), "manifest", `${cueId} manifest entry`));

  const generated = generatedSources(receipt);
  if (generated.length === 0) {
    throw new Error("receipt has no generated sources; refusing to export unknown provenance");
  }
  for (const source of generated) {
    const model = String(source.model ?? "");
    if (!model.startsWith("stable-audio-3-small-sfx")) {
      throw new Error(`unknown generated-source model ${JSON.stringify(model)}; refusing to export unknown provenance`);
    }
  }

  const licenseRecord = buildLicenceRecord(manifestSrc, generated, receiptPath, receiptHash, receipt);
  if (destination === "anatomy") {
    const siliconManifestPath = join(repoRoot, SILICON_DIR, "assets.final.json");
    if (!existsSync(siliconManifestPath)) throw new Error(`Silicon manifest not found: ${siliconManifestPath}`);
    const siliconManifest = readJson(siliconManifestPath) as JsonObject;
    const siliconEntry = siliconManifest.assets?.[cueId];
    if (!siliconEntry) {
      throw new Error(`${cueId} is not declared in the Silicon manifest; anatomy cues must have a Silicon mirror`);
    }
    const siliconAudioDest = join(repoRoot, SILICON_DIR, "shared", "audio", assetFile);
    files.push(planAudio(audioPath, siliconAudioDest, audioHash, options.overwrite ?? false, `${cueId} Silicon mirror`));
    const updatedSilicon = structuredClone(siliconManifest);
    const updatedSiliconEntry = updatedSilicon.assets[cueId];
    delete updatedSiliconEntry.placeholder;
    updatedSiliconEntry.src = manifestSrc;
    updatedSiliconEntry.license = LICENSE_NAME;
    files.push(
      planText(siliconManifestPath, jsonBytes(updatedSilicon), "manifest", `${cueId} Silicon manifest entry`),
    );
    files.push(
      planLicences(join(repoRoot, ANATOMY_DIR, "licenses.json"), licenseRecord, `${cueId} anatomy licence`),
    );
    files.push(
      planLicences(join(repoRoot, SILICON_DIR, "licenses.json"), licenseRecord, `${cueId} Silicon licence`),
    );
  }

  const promptLogPath = join(repoRoot, PROMPT_LOG);
  const promptRows = generated.map((source) =>
    promptRow(cueId, source, manifestSrc, receiptPath, receiptHash, receipt),
  );
  files.push(
    planPromptLog(
      promptLogPath,
      promptLogWithRows(promptLogPath, promptRows),
      `${cueId} prompt-log rows`,
    ),
  );

  const warnings: string[] = Array.isArray(result.warnings) ? result.warnings.map(String) : [];
  if (result.forced) warnings.push("cueforge marked this render as a forced QC exception");
  return {
    cueId,
    destination,
    audioPath,
    manifestSrc,
    files,
    promptRows,
    promptLogPath,
    warnings,
  };
}

export function applyAdoption(plan: AdoptionPlan): AdoptionReport {
  const undo: Array<{ path: string; previous: Buffer | null }> = [];
  const applied: string[] = [];
  const unchanged: string[] = [];
  try {
    for (const file of plan.files) {
      if (file.action === "unchanged") {
        unchanged.push(file.path);
        continue;
      }
      const previous = existsSync(file.path) ? readFileSync(file.path) : null;
      undo.push({ path: file.path, previous });
      const bytes =
        file.kind === "audio"
          ? readFileSync(file.source as string)
          : (file.bytes as Buffer);
      atomicWrite(file.path, bytes);
      applied.push(file.path);
    }
  } catch (error) {
    const rollbackErrors: string[] = [];
    for (const entry of undo.reverse()) {
      try {
        if (entry.previous === null) {
          if (existsSync(entry.path)) rmSync(entry.path);
        } else {
          atomicWrite(entry.path, entry.previous);
        }
      } catch (rollbackError) {
        rollbackErrors.push(`${entry.path}: ${String(rollbackError)}`);
      }
    }
    const suffix = rollbackErrors.length
      ? ` Rollback also failed for: ${rollbackErrors.join("; ")}`
      : " Rollback restored the previous files.";
    throw new Error(`adoption failed after ${applied.length} write(s): ${String(error)}.${suffix}`);
  }
  return {
    cueId: plan.cueId,
    applied,
    unchanged,
    promptRowsAdded: plan.promptRows.length,
    warnings: plan.warnings,
  };
}

export function describePlan(plan: AdoptionPlan): string[] {
  return plan.files.map((file) => {
    const source = file.kind === "audio" ? ` <- ${file.source}` : "";
    return `${file.action.padEnd(9)} ${file.path}${source} (${file.label})`;
  });
}

function validateRenderResult(result: JsonObject): void {
  if (result.schema_version !== 1) throw new Error(`unsupported render result schema_version ${result.schema_version}`);
  if (!result.recipe?.id) throw new Error("render result has no recipe.id");
  if (!result.receipt?.path || !result.receipt?.sha256) throw new Error("render result has no receipt link");
}

function validateReceipt(receipt: JsonObject, result: JsonObject, output: JsonObject, audioHash: string): void {
  if (receipt.schema_version !== 1) throw new Error(`unsupported receipt schema_version ${receipt.schema_version}`);
  if (receipt.recipe?.id !== result.recipe?.id || receipt.recipe?.hash !== result.recipe?.hash) {
    throw new Error("receipt recipe identity does not match the render result");
  }
  const receiptOutput = receipt.outputs?.find((entry: JsonObject) => entry.sha256 === audioHash);
  if (!receiptOutput) throw new Error("receipt does not contain the rendered output hash");
  if (receiptOutput.codec !== "mp3" || receiptOutput.sample_rate !== 48_000 || receiptOutput.channels !== 1) {
    throw new Error("receipt output is not 48 kHz mono MP3");
  }
  if (receipt.qc?.status !== "pass" && receipt.qc?.status !== "exception") {
    throw new Error(`receipt QC status is ${JSON.stringify(receipt.qc?.status)}`);
  }
  if (result.forced !== (receipt.qc?.status === "exception")) {
    throw new Error("render result forced flag does not match receipt QC status");
  }
  if (result.outputs?.[0]?.sha256 !== audioHash || output.sha256 !== audioHash) {
    throw new Error("render result output hash does not match the audio file");
  }
}

function generatedSources(receipt: JsonObject): JsonObject[] {
  return (receipt.sources ?? []).filter((source: JsonObject) => source.origin === "generate");
}

function fileNameForCue(cueId: string): string {
  const prefix = "audio.cue.";
  if (!cueId.startsWith(prefix)) throw new Error(`cue ID must start with ${prefix}`);
  const suffix = cueId.slice(prefix.length);
  if (!/^[a-z0-9.-]+$/.test(suffix)) throw new Error(`invalid cue ID ${cueId}`);
  return `${suffix.replaceAll(".", "-")}.mp3`;
}

function resolveInputPath(path: string): string {
  return isAbsolute(path) ? path : resolve(process.cwd(), path);
}

function planAudio(
  source: string,
  destination: string,
  sha256Value: string,
  overwrite: boolean,
  label: string,
): PlannedFile {
  const action = destinationAction(destination, sha256Value, overwrite);
  return { kind: "audio", path: destination, source, sha256: sha256Value, action, label };
}

function planText(path: string, bytes: Buffer, kind: "manifest" | "licence", label: string): PlannedFile {
  const action = existsSync(path) && readFileSync(path).equals(bytes) ? "unchanged" : "replace";
  return { kind, path, bytes, action, label };
}

function planLicences(path: string, record: JsonObject, label: string): PlannedFile {
  if (!existsSync(path)) throw new Error(`licence file not found: ${path}`);
  const document = readJson(path) as JsonObject;
  const assets = Array.isArray(document.assets) ? document.assets : [];
  document.assets = assets.filter((entry: JsonObject) => entry.file !== record.file);
  document.assets.push(record);
  return planText(path, jsonBytes(document), "licence", label);
}

function planPromptLog(path: string, bytes: Buffer, label: string): PlannedFile {
  const action = existsSync(path) && readFileSync(path).equals(bytes) ? "unchanged" : "replace";
  return { kind: "prompt-log", path, bytes, action, label };
}

function promptLogWithRows(path: string, rows: string[][]): Buffer {
  if (!existsSync(path)) throw new Error(`prompt log not found: ${path}`);
  const original = readFileSync(path, "utf8");
  const lines = original.split(/\r?\n/);
  const existing = new Set(lines);
  const added = rows.map(csvLine).filter((line) => !existing.has(line));
  if (added.length === 0) return Buffer.from(original);
  const separator = original.endsWith("\n") ? "" : "\n";
  return Buffer.from(`${original}${separator}${added.join("\n")}\n`);
}

function destinationAction(destination: string, sha256Value: string, overwrite: boolean): PlannedFile["action"] {
  if (!existsSync(destination)) return "create";
  const existing = sha256(readFileSync(destination));
  if (existing === sha256Value) return "unchanged";
  if (overwrite) return "replace";
  throw new Error(`target conflict at ${destination}: expected ${sha256Value}, found ${existing}; use --overwrite`);
}

function buildLicenceRecord(
  manifestSrc: string,
  generated: JsonObject[],
  receiptPath: string,
  receiptHash: string,
  receipt: JsonObject,
): JsonObject {
  const seeds = generated
    .map((source) => `${source.layer_id ?? "layer"}=${source.seed ?? "?"}`)
    .join(", ");
  const date = String(receipt.created_at ?? "").slice(0, 10) || new Date().toISOString().slice(0, 10);
  return {
    file: manifestSrc,
    type: "audio",
    source: MODEL_LABEL,
    author: "AI-generated with Stable Audio 3 Small SFX; sound direction by Snorre",
    license: LICENSE_NAME,
    url: LICENSE_URL,
    modified: `${date}; seeds ${seeds}; mastered by cueforge (48 kHz mono MP3 160 kbps); receipt ${relativePath(receiptPath)} sha256 ${receiptHash}`,
    aiGenerated: true,
  };
}

function promptRow(
  cueId: string,
  source: JsonObject,
  manifestSrc: string,
  receiptPath: string,
  receiptHash: string,
  receipt: JsonObject,
): string[] {
  const metadata = source.metadata ?? {};
  const requested =
    metadata.requested_duration_s ?? metadata.duration_s ?? "";
  const layer = source.layer_id ?? "layer";
  const date = String(receipt.created_at ?? "").slice(0, 10) || new Date().toISOString().slice(0, 10);
  return [
    cueId,
    String(source.model ?? ""),
    String(source.seed ?? ""),
    String(requested),
    "1",
    manifestSrc,
    `${date}; head/tail trim; 35 Hz HPF; cueforge QC; 48 kHz mono MP3 160 kbps; cueforge receipt ${relativePath(receiptPath)} sha256 ${receiptHash}; layer ${layer}`,
    "accepted",
    LICENSE_NAME,
  ];
}

function csvLine(row: string[]): string {
  return row
    .map((value) => (/[",\n]/.test(value) ? `"${value.replaceAll('"', '""')}"` : value))
    .join(",");
}

function relativePath(path: string): string {
  return relative(DEFAULT_REPO_ROOT, path).replaceAll("\\", "/");
}

function jsonBytes(value: unknown): Buffer {
  return Buffer.from(`${JSON.stringify(value, null, 2)}\n`);
}

function atomicWrite(path: string, bytes: Buffer): void {
  mkdirSync(dirname(path), { recursive: true });
  const temp = `${path}.tmp-${process.pid}-${Math.random().toString(16).slice(2)}`;
  writeFileSync(temp, bytes);
  renameSync(temp, path);
}

function readJson(path: string): unknown {
  return JSON.parse(readFileSync(path, "utf8"));
}

function sha256(bytes: Buffer): string {
  return createHash("sha256").update(bytes).digest("hex");
}

function flag(args: string[], name: string): string | undefined {
  const index = args.indexOf(`--${name}`);
  if (index === -1) return undefined;
  const value = args[index + 1];
  if (!value || value.startsWith("--")) throw new Error(`--${name} needs a value`);
  args.splice(index, 2);
  return value;
}

function hasFlag(args: string[], name: string): boolean {
  const index = args.indexOf(`--${name}`);
  if (index === -1) return false;
  args.splice(index, 1);
  return true;
}

function usage(): string {
  return [
    "Usage: tsx scripts/cueforge-adopt.ts --result <path> [options]",
    "",
    "Options:",
    "  --audio <path>     Override the rendered MP3 path",
    "  --receipt <path>   Override the receipt path",
    "  --repo-root <path> Repository root (defaults to this checkout)",
    "  --dry-run          Validate and print the plan without writing",
    "  --overwrite        Replace a target file with a different hash",
    "  --help             Show this help",
  ].join("\n");
}

function main(): void {
  const args = process.argv.slice(2);
  if (hasFlag(args, "help")) {
    console.log(usage());
    return;
  }
  if (hasFlag(args, "force")) {
    throw new Error("--force is not accepted by the adapter; --force is QC-only and --overwrite handles target conflicts");
  }
  const resultPath = flag(args, "result");
  if (!resultPath) throw new Error(`--result is required\n\n${usage()}`);
  const audioPath = flag(args, "audio");
  const receiptPath = flag(args, "receipt");
  const repoRoot = flag(args, "repo-root") ?? DEFAULT_REPO_ROOT;
  const dryRun = hasFlag(args, "dry-run");
  const overwrite = hasFlag(args, "overwrite");
  if (args.length > 0) throw new Error(`unknown arguments: ${args.join(" ")}`);

  const plan = planAdoption({
    repoRoot,
    resultPath,
    audioPath,
    receiptPath,
    dryRun,
    overwrite,
  });
  for (const line of describePlan(plan)) console.log(line);
  for (const warning of plan.warnings) console.warn(`warning: ${warning}`);
  if (dryRun) {
    console.log("dry-run: no files written");
    return;
  }
  const report = applyAdoption(plan);
  console.log(
    `cueforge-adopt: ${report.cueId}: ${report.applied.length} written, ${report.unchanged.length} unchanged, ${report.promptRowsAdded} prompt row(s)`,
  );
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    main();
  } catch (error) {
    console.error(`cueforge-adopt: ${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 1;
  }
}
