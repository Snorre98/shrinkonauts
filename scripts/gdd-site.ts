#!/usr/bin/env tsx
/**
 * Build the public GDD asset gallery for GitHub Pages.
 *
 *   npm run gdd:site
 *
 * Reads only tracked/non-ignored files and writes `public/gdd/`. Vite copies
 * that folder into `dist/gdd/`, so the existing Pages workflow publishes it at
 * `/shrinkonauts/gdd/`. No generated binary is committed.
 */

import { execFileSync } from "node:child_process";
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { basename, dirname, extname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { marked } from "marked";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, "public/gdd");
const TODAY = new Date().toISOString().slice(0, 10);

const ASSET_ID = /^(sprite|bg|tile|ui|audio|tileset)\./;

interface PackDefinition {
  id: "hub" | "anatomy" | "silicon";
  title: string;
  root: string;
  manifest: string;
  licenses: string | null;
  theme: string;
  document: string;
  levels: boolean;
}

interface LicenseEntry {
  file?: string;
  source?: string;
  author?: string;
  license?: string;
  modified?: string;
}

interface ManifestAsset {
  type?: string;
  src?: string;
  placeholder?: boolean;
  license?: string;
  display?: { width: number; height: number };
  fidelity?: string;
  idleAnimation?: string;
}

interface ManifestDocument {
  assets?: Record<string, ManifestAsset>;
}

interface GalleryItem {
  file: string;
  label: string;
  group: string;
  pack?: string;
  status: string;
  section?: string;
  intendedId?: string;
  dimensions?: string | null;
  usedBy?: string;
  licence?: string;
  source?: string;
  processing?: string;
  details?: string;
  pixel?: boolean;
  art?: "final" | "placeholder";
  captureId?: string;
  flow?: CaptureFlow;
  beat?: string;
  mode?: string;
  level?: string | null;
  room?: string | null;
  objectiveIds?: string[];
  conceptIds?: string[];
  relatedAssets?: string[];
  whatToNotice?: string;
  walkthrough?: string;
  order?: number;
}

type CaptureFlow =
  | "hub"
  | "launch"
  | "03-nerve-forest"
  | "04-muscle-effector"
  | "silicon"
  | "modes";

interface CaptureState {
  id: string;
  title: string;
  flow: CaptureFlow;
  pack: "hub" | "anatomy" | "silicon";
  level: string | null;
  room: string | null;
  beat: string;
  mode: "solo" | "co-op" | "n/a";
  objectiveIds: string[];
  conceptIds: string[];
  relatedAssets: string[];
  whatToNotice: string;
  art: "final" | "placeholder";
  order: number;
  alt: string;
  docs: string[];
  compareWith?: string;
  compareLabel?: string;
}

interface CaptureEntry extends CaptureState {
  file: string;
  width: number;
  height: number;
  capturedAt: string;
}

interface CaptureManifest {
  schemaVersion: number;
  generated: string;
  viewport: { width: number; height: number };
  captures: CaptureEntry[];
}

interface DocEntry {
  source: string;
  slug: string;
  title: string;
  section: string;
  file: string;
}

interface WebManifest {
  schemaVersion: number;
  generated: string;
  game: string;
  repo: string;
  counts: {
    runtime: number;
    previews: number;
    concepts: number;
    characters: number;
    screenshots: number;
    captures: number;
    docs: number;
  };
  runtime: GalleryItem[];
  previews: GalleryItem[];
  concepts: GalleryItem[];
  characters: GalleryItem[];
  screenshots: GalleryItem[];
  captures: CaptureEntry[];
  docs: DocEntry[];
}

const PACKS: PackDefinition[] = [
  {
    id: "hub",
    title: "Bathroom hub",
    root: "public/hub/bathroom",
    manifest: "public/hub/bathroom/assets.final.json",
    licenses: null,
    theme: "public/hub/bathroom/theme.json",
    document: "public/hub/bathroom/hub.json",
    levels: false,
  },
  {
    id: "anatomy",
    title: "Anatomy: The Reflex Arc",
    root: "public/packs/anatomy-reflex",
    manifest: "public/packs/anatomy-reflex/assets.final.json",
    licenses: "public/packs/anatomy-reflex/licenses.json",
    theme: "public/packs/anatomy-reflex/theme.json",
    document: "public/packs/anatomy-reflex/pack.json",
    levels: true,
  },
  {
    id: "silicon",
    title: "Silicon: Interrupt Loop",
    root: "public/packs/silicon-reflex",
    manifest: "public/packs/silicon-reflex/assets.final.json",
    licenses: "public/packs/silicon-reflex/licenses.json",
    theme: "public/packs/silicon-reflex/theme.json",
    document: "public/packs/silicon-reflex/pack.json",
    levels: true,
  },
];

const GAME_URL = "https://snorre98.github.io/shrinkonauts/";
const GALLERY_URL = "https://snorre98.github.io/shrinkonauts/gdd/";
const REPO_URL = "https://github.com/snorre98/shrinkonauts";
const CAPTURES_ROOT = join(ROOT, "gdd-captures");
const CAPTURES_MANIFEST = join(CAPTURES_ROOT, "captures.json");

const CAPTURE_FLOWS: ReadonlyArray<{
  id: CaptureFlow;
  title: string;
  short: string;
}> = [
  { id: "hub", title: "Hub", short: "Hub" },
  { id: "launch", title: "Launch", short: "Launch" },
  { id: "03-nerve-forest", title: "03 · Nerve Forest", short: "03" },
  { id: "04-muscle-effector", title: "04 · Muscle Effector", short: "04" },
  { id: "silicon", title: "Silicon", short: "Silicon" },
  { id: "modes", title: "Modes & accessibility", short: "Modes" },
];

const FLOW_SECTION: Record<CaptureFlow, string> = {
  hub: "Story",
  launch: "UI/Controls",
  "03-nerve-forest": "Gameplay",
  "04-muscle-effector": "Gameplay",
  silicon: "Gameplay",
  modes: "Accessibility",
};

/* ------------------------------------------------------------------ */
/* Small helpers                                                       */
/* ------------------------------------------------------------------ */

function readJson<T>(path: string): T {
  return JSON.parse(readFileSync(path, "utf8")) as T;
}

function ensure(path: string): void {
  mkdirSync(path, { recursive: true });
}

function copy(src: string, dest: string): void {
  ensure(dirname(dest));
  copyFileSync(src, dest);
}

function commandExists(command: string): boolean {
  try {
    execFileSync("sh", ["-c", `command -v ${command}`], { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

const IMAGEMAGICK = commandExists("magick")
  ? "magick"
  : commandExists("convert")
    ? "convert"
    : null;
const IDENTIFY = commandExists("identify");
const FFMPEG = commandExists("ffmpeg");

function imageSize(path: string): string | null {
  if (!IDENTIFY) return null;
  try {
    const [width, height] = execFileSync(
      "identify",
      ["-format", "%w %h", path],
      { encoding: "utf8" },
    )
      .trim()
      .split(/\s+/);
    return `${width}x${height}`;
  } catch {
    return null;
  }
}

function downscale(src: string, dest: string, maxEdge: number): void {
  ensure(dirname(dest));
  const isJpeg = /\.jpe?g$/i.test(dest);
  if (IMAGEMAGICK) {
    const args =
      IMAGEMAGICK === "magick"
        ? [src, "-auto-orient", "-resize", `${maxEdge}x${maxEdge}>`, "-strip"]
        : [src, "-auto-orient", "-resize", `${maxEdge}x${maxEdge}>`, "-strip"];
    if (isJpeg) args.push("-quality", "86");
    args.push(dest);
    execFileSync(IMAGEMAGICK, args, { stdio: "pipe" });
    return;
  }
  if (FFMPEG) {
    const filter = `scale=min(${maxEdge}\\,iw):-${isJpeg ? 2 : 1}:flags=lanczos`;
    execFileSync(
      "ffmpeg",
      [
        "-y",
        "-v",
        "error",
        "-i",
        src,
        "-vf",
        filter,
        ...(isJpeg ? ["-q:v", "3"] : ["-pix_fmt", "rgba"]),
        dest,
      ],
      { stdio: "pipe" },
    );
    return;
  }
  copy(src, dest);
}

function walkFiles(dir: string): string[] {
  if (!existsSync(dir)) return [];
  const found: string[] = [];
  for (const name of readdirSync(dir)) {
    if (name.startsWith(".")) continue;
    const path = join(dir, name);
    if (statSync(path).isDirectory()) found.push(...walkFiles(path));
    else found.push(path);
  }
  return found.sort();
}

function trackedFiles(): Set<string> {
  const output = execFileSync(
    "git",
    ["ls-files", "--cached", "--others", "--exclude-standard"],
    { cwd: ROOT, encoding: "utf8" },
  );
  return new Set(
    output
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean),
  );
}

const TRACKED = trackedFiles();

function isAvailable(relPath: string): boolean {
  return TRACKED.has(relPath) && existsSync(join(ROOT, relPath));
}

function reset(): void {
  rmSync(OUT, { recursive: true, force: true });
  ensure(OUT);
}

/* ------------------------------------------------------------------ */
/* Usage map                                                           */
/* ------------------------------------------------------------------ */

function collectAssetRefs(
  node: unknown,
  context: string,
  add: (id: string, context: string) => void,
): void {
  if (typeof node === "string") {
    if (ASSET_ID.test(node)) add(node, context);
    return;
  }
  if (Array.isArray(node)) {
    for (const item of node) collectAssetRefs(item, context, add);
    return;
  }
  if (node && typeof node === "object") {
    for (const [key, value] of Object.entries(node)) {
      collectAssetRefs(value, context ? `${context}.${key}` : key, add);
    }
  }
}

function buildUsageMap(): Map<string, string[]> {
  const map = new Map<string, Set<string>>();
  const add = (id: string, context: string): void => {
    if (!map.has(id)) map.set(id, new Set());
    map.get(id)?.add(context);
  };

  const hubPath = "public/hub/bathroom/hub.json";
  if (isAvailable(hubPath)) {
    const hub = readJson<Record<string, unknown>>(join(ROOT, hubPath));
    for (const key of ["background", "machine", "player", "dressing", "audio"]) {
      collectAssetRefs(hub[key], `hub/${key}`, add);
    }
    const themePath = "public/hub/bathroom/theme.json";
    if (isAvailable(themePath)) {
      const theme = readJson<{ ui?: { assets?: unknown } }>(join(ROOT, themePath));
      collectAssetRefs(theme.ui?.assets, "hub/theme.ui.assets", add);
    }
  }

  for (const pack of PACKS) {
    if (pack.id === "hub") continue;
    const levelsRoot = join(ROOT, pack.root, "levels");
    if (existsSync(levelsRoot)) {
      for (const level of readdirSync(levelsRoot)) {
        const roomPath = join(levelsRoot, level, "room.json");
        if (!existsSync(roomPath)) continue;
        const room = readJson<Record<string, unknown>>(roomPath);
        collectAssetRefs(room.background, `${level}/background`, add);
        const entities = Array.isArray(room.entities) ? room.entities : [];
        for (const entity of entities) {
          if (!entity || typeof entity !== "object") continue;
          const record = entity as Record<string, unknown>;
          const context = `${level}/entity ${String(record.id ?? "?")}`;
          collectAssetRefs(record.sprite, context, add);
          collectAssetRefs(record.idleAnimation, context, add);
        }
        collectAssetRefs(room.tileMaterials, `${level}/tileMaterials`, add);
      }
    }
    const materialsPath = join(ROOT, pack.root, "materials.json");
    if (existsSync(materialsPath)) {
      const materials = readJson<{ variantSets?: unknown }>(materialsPath);
      collectAssetRefs(materials.variantSets, `${pack.id}/materials`, add);
    }
    const themePath = join(ROOT, pack.root, "theme.json");
    if (existsSync(themePath)) {
      const theme = readJson<{ ui?: { assets?: unknown } }>(themePath);
      collectAssetRefs(theme.ui?.assets, `${pack.id}/theme.ui.assets`, add);
    }
  }

  add("sprite.player.p1", "all playable levels/player avatar");
  add("sprite.player.p2", "all playable levels/local co-op avatar");
  for (const id of [
    "sprite.player.p1.walk",
    "sprite.player.p1.jump",
    "sprite.player.p1.fall",
    "sprite.player.p1.land",
    "sprite.player.p2.walk",
    "sprite.player.p2.jump",
    "sprite.player.p2.fall",
    "sprite.player.p2.land",
  ]) {
    add(id, "player animator/runtime sheet");
  }

  for (const [id, contexts] of map) {
    const compressed = new Set<string>();
    for (const context of contexts) {
      const match = context.match(/^([^/]+)\/materials/);
      compressed.add(match ? `${match[1]}/materials` : context);
    }
    map.set(id, compressed);
  }

  return new Map([...map].map(([id, contexts]) => [id, [...contexts]]));
}

/* ------------------------------------------------------------------ */
/* Runtime art                                                         */
/* ------------------------------------------------------------------ */

function runtimeDir(src: string): string {
  if (src.includes("/sprites/")) return "sprites";
  if (src.includes("/backgrounds/")) return "backgrounds";
  if (src.includes("/tiles/")) return "tiles";
  if (src.includes("/ui/")) return "ui";
  return "misc";
}

function inferSource(pack: PackDefinition, id: string): string {
  if (id === "sprite.player.p1" || id === "sprite.player.p2") {
    return "Ludo.ai source sheet; local downscale + palette quantisation";
  }
  if (pack.id === "hub") {
    return "Nano Banana / Google Gemini concept plate; local key, fit and palette quantisation";
  }
  if (id.startsWith("sprite.player")) {
    return "Ludo.ai source sheet; local downscale + palette quantisation";
  }
  if (id.startsWith("bg.")) {
    return "Ludo.ai / Nanobanan concept plate; crop, downscale and lossless WebP";
  }
  if (id.startsWith("tile.")) return "Generated in-repo placeholder SVG";
  return "Ludo.ai / Nanobanan concept plate; local magenta key, fit and palette quantisation";
}

function inferProcessing(pack: PackDefinition, id: string, license: LicenseEntry | undefined): string {
  if (pack.id === "hub" && id === "bg.bathroom.wall") {
    return "Scene plate cropped 296 px left and padded 296 px right, then Lanczos downscaled to 640x360; not palette-quantised";
  }
  if (pack.id === "hub" && id === "sprite.player.p1") {
    return "Reused P1 idle frame at hub scale";
  }
  if (pack.id === "hub" && id === "sprite.player.civilian") {
    return "Single-frame civilian idle; magenta keyed; fitted; palette quantised";
  }
  if (license?.modified) return license.modified;
  if (id.startsWith("sprite.player")) {
    return "Ludo frame rectangles sliced; frames fitted; palette quantised; packed as runtime sheet";
  }
  if (pack.id === "hub") {
    return "Magenta keyed; cropped/masked; fitted to the hub cell; palette quantised";
  }
  if (id.startsWith("bg.")) return "Cropped to runtime aspect; Lanczos downscale; lossless WebP";
  if (id.startsWith("tile.")) {
    return "Placeholder SVG authored in-repo; replace with final 32x32 atlas";
  }
  return "Magenta keyed; trimmed; fitted to class cell; hard alpha; palette quantised";
}

function gddSections(pack: PackDefinition, id: string): string[] {
  const sections = new Set<string>();
  if (id.startsWith("sprite.player")) {
    for (const section of ["Gameplay", "Characters", "Art", "UI/Controls"]) {
      sections.add(section);
    }
  }
  if (id.startsWith("sprite.agent")) {
    for (const section of ["Learning", "Gameplay", "Characters"]) sections.add(section);
  }
  if (id.startsWith("sprite.scan")) {
    for (const section of ["Learning", "Gameplay", "UI/Controls"]) sections.add(section);
  }
  if (
    id.startsWith("sprite.pad") ||
    id.startsWith("sprite.gate") ||
    id.startsWith("sprite.prop") ||
    id.startsWith("sprite.pulse") ||
    id.startsWith("sprite.receptor")
  ) {
    for (const section of ["Gameplay", "Characters"]) sections.add(section);
  }
  if (id.startsWith("bg.")) for (const section of ["Level/Environment", "Art"]) sections.add(section);
  if (id.startsWith("tile.")) for (const section of ["Level/Environment", "Art"]) sections.add(section);
  if (id.startsWith("ui.icon")) for (const section of ["UI/Controls", "Art"]) sections.add(section);
  if (id.startsWith("audio.")) sections.add("Sound & Music");
  if (pack.id === "hub") {
    for (const section of ["Story", "Characters", "Level/Environment", "UI/Controls"]) {
      sections.add(section);
    }
  }
  return [...sections];
}

function buildRuntime(): GalleryItem[] {
  const usage = buildUsageMap();
  const items: GalleryItem[] = [];

  for (const pack of PACKS) {
    const manifestPath = join(ROOT, pack.manifest);
    if (!existsSync(manifestPath)) continue;
    const manifest = readJson<ManifestDocument>(manifestPath);
    const licenses = new Map<string, LicenseEntry>();
    if (pack.licenses && existsSync(join(ROOT, pack.licenses))) {
      const doc = readJson<{ assets?: LicenseEntry[] }>(join(ROOT, pack.licenses));
      for (const entry of doc.assets ?? []) {
        if (entry.file) licenses.set(entry.file, entry);
      }
    }

    for (const [id, asset] of Object.entries(manifest.assets ?? {})) {
      if (!asset.src) continue;
      const srcRel = `${pack.root}/${asset.src}`;
      if (!isAvailable(srcRel)) continue;
      const dir = runtimeDir(asset.src);
      const destRel = `final/${pack.id}/${dir}/${basename(asset.src)}`;
      const dest = join(OUT, destRel);
      copy(join(ROOT, srcRel), dest);
      const license = licenses.get(asset.src);
      const usedBy = usage.get(id) ?? [];
      const status = asset.placeholder
        ? "placeholder"
        : usedBy.length > 0
          ? "runtime"
          : "manifest-only";
      const sections = gddSections(pack, id);
      items.push({
        file: destRel,
        label: id,
        group: `runtime/${pack.id}`,
        pack: pack.id,
        status,
        section: sections[0],
        dimensions: imageSize(dest),
        usedBy: usedBy.join("; "),
        licence: asset.license ?? license?.license ?? "unknown",
        source: license?.source ?? inferSource(pack, id),
        processing: inferProcessing(pack, id, license),
        details: `${status} · ${sections.join(", ")}`,
        pixel: !id.startsWith("bg."),
      });
    }

    const metadataDir = join(OUT, "metadata", pack.id);
    ensure(metadataDir);
    for (const relPath of [
      pack.manifest,
      pack.licenses,
      pack.theme,
      pack.document,
      `${pack.root}/mapping.json`,
      `${pack.root}/materials.json`,
    ]) {
      if (!relPath || !isAvailable(relPath)) continue;
      copy(join(ROOT, relPath), join(metadataDir, basename(relPath)));
    }
    if (pack.levels) {
      const levelsRoot = join(ROOT, pack.root, "levels");
      if (existsSync(levelsRoot)) {
        for (const level of readdirSync(levelsRoot)) {
          for (const name of readdirSync(join(levelsRoot, level))) {
            if (!name.endsWith(".json")) continue;
            const relPath = `${pack.root}/levels/${level}/${name}`;
            if (!isAvailable(relPath)) continue;
            copy(join(ROOT, relPath), join(metadataDir, "levels", level, name));
          }
        }
      }
    }
  }

  return items;
}

/* ------------------------------------------------------------------ */
/* Previews                                                            */
/* ------------------------------------------------------------------ */

function buildPreviews(): GalleryItem[] {
  const items: GalleryItem[] = [];
  for (const file of walkFiles(join(ROOT, "art-source/previews"))) {
    const relPath = relative(ROOT, file).split("\\").join("/");
    if (!isAvailable(relPath)) continue;
    if (!/\.(png|gif|jpe?g|webp)$/i.test(relPath)) continue;
    const sub = relative(join(ROOT, "art-source/previews"), file).split("\\").join("/");
    const destRel = `previews/${sub}`;
    copy(file, join(OUT, destRel));
    items.push({
      file: destRel,
      label: basename(file),
      group: `previews/${dirname(sub) === "." ? "root" : dirname(sub)}`,
      status: "preview",
      section: "Art",
      dimensions: imageSize(join(OUT, destRel)),
      source: relPath,
      processing: "Review preview generated by the art pipeline; not a runtime asset.",
      pixel: !sub.startsWith("backgrounds/"),
    });
  }
  return items;
}

/* ------------------------------------------------------------------ */
/* Concepts                                                            */
/* ------------------------------------------------------------------ */

const CONCEPT_INFO: Record<string, [string, string, string]> = {
  "sprite-agent-neuron": ["sprite.agent.neuron", "alternate", "Review alternate; runtime uses the Neuron Keeper sheet."],
  "sprite-scan-neuron": ["sprite.scan.neuron", "placeholder", "Collapses to 16x9 at 36x36; kept for audit."],
  "sprite-scan-synapse": ["sprite.scan.synapse", "runtime", "POC integrated; final approval pending."],
  "sprite-scan-pathway": ["sprite.scan.pathway", "placeholder", "One-way reading and myelin gaps lost at 36x36."],
  "sprite-scan-muscle": ["sprite.scan.muscle", "runtime", "POC integrated; final approval pending."],
  "sprite-scan-ferry-v2": ["sprite.gate.ferry", "runtime", "Closed organic gate; used by 03 and 04."],
  "sprite-prop-tracer": ["sprite.prop.tracer", "runtime", "ACh packet; POC integrated."],
  "sprite-puls-terminal": ["sprite.pulse.terminal", "runtime", "Motor terminal; POC integrated."],
  "sprite-receptor-triangle": ["sprite.receptor.triangle", "runtime", "Nicotinic receptor; POC integrated."],
  "sprite-receptor-circle": ["sprite.receptor.circle", "runtime", "Wrong receptor; POC integrated."],
  "sprite-scan-reflex": ["sprite.scan.reflex", "placeholder", "Reserve only; not referenced by 03/04."],
  "ui-icon-badge": ["ui.icon.badge", "placeholder", "16x16 badge fit loses the helmet dome."],
  "bg.nerve_forest.sky": ["bg.nerve_forest.sky", "runtime", "Pretty sky; the only wired 03 background."],
  "bg-nerve_forest-sky-updated": ["—", "superseded", "Previous sky source; retained for comparison."],
  "bg-nerve_forest-far-updated": ["bg.nerve_forest.far", "placeholder", "Processed; layered stack not wired."],
  "bg-nerve_forest-mid-updated": ["bg.nerve_forest.mid", "placeholder", "Processed; layered stack not wired."],
  "bg-nerve_forest-near-updated": ["bg.nerve_forest.near", "placeholder", "Vertical repeat crosses the play band."],
  "bg-nerve_forest-far": ["—", "superseded", "Failed reference; do not use."],
  "bg-nerve_forest-mid": ["—", "superseded", "Failed reference; do not use."],
  "bg-nerve_forest-near": ["—", "superseded", "Failed reference; do not use."],
  "tile-bone-atlas": ["tile.bone.atlas", "source-only", "Material swatch, not a 47-frame atlas."],
  "tile-nerve-atlas": ["tile.nerve.atlas", "source-only", "Material swatch, not a 16-frame atlas."],
  "bg-silicon_board-sky": ["bg.silicon_board.sky", "runtime", "Silicon board sky; lossless WebP."],
  "sprite-agent-cpu": ["sprite.agent.cpu", "runtime", "CPU Core; POC integrated."],
  "sprite-console-sensor": ["sprite.console.sensor", "runtime", "Sensor console; POC integrated."],
  "sprite-console-transfer": ["sprite.console.transfer", "runtime", "Transfer console; POC integrated."],
  "sprite-gate-actuator": ["sprite.gate.actuator", "runtime", "Actuator gate; POC integrated."],
  "sprite-pad-sensor": ["sprite.pad.sensor", "runtime", "Sensor pad; POC integrated."],
  "sprite-prop-route_plug": ["sprite.prop.route_plug", "runtime", "Route plug; POC integrated."],
  "sprite-scan-actuator": ["sprite.scan.actuator", "runtime", "Actuator scan; POC integrated."],
  "sprite-scan-controller": ["sprite.scan.controller", "runtime", "Interrupt controller scan; POC integrated."],
  "sprite-scan-cpu": ["sprite.scan.cpu", "runtime", "CPU scan; POC integrated."],
  "sprite-scan-interrupt": ["sprite.scan.interrupt", "placeholder", "Declared placeholder."],
  "sprite-scan-sensor": ["sprite.scan.sensor", "runtime", "Sensor scan; POC integrated."],
  "sprite-socket-controller": ["sprite.socket.controller", "runtime", "Controller socket; POC integrated."],
  "sprite-socket-cpu": ["sprite.socket.cpu", "runtime", "CPU socket decoy; POC integrated."],
  "tile-circuit-atlas": ["tile.circuit.atlas", "placeholder", "Circuit atlas swatch; final atlas deferred."],
};

function conceptInfo(name: string): [string, string, string] {
  return (
    CONCEPT_INFO[name] ?? [
      "—",
      "source-only",
      "Source plate; see the art-source README for status.",
    ]
  );
}

function buildConcepts(): GalleryItem[] {
  const items: GalleryItem[] = [];
  for (const file of walkFiles(join(ROOT, "art-source/nanobanan"))) {
    const relPath = relative(ROOT, file).split("\\").join("/");
    if (!isAvailable(relPath)) continue;
    if (!/\.(jpe?g)$/i.test(relPath)) continue;
    const group = relPath.includes("/new-silicon/") ? "silicon" : "anatomy";
    const stem = basename(file, extname(file));
    const [intendedId, status, notes] = conceptInfo(stem);
    const destRel = `concepts/${group}/${stem}.jpg`;
    downscale(file, join(OUT, destRel), 1280);
    items.push({
      file: destRel,
      label: stem,
      group: `concepts/${group}`,
      status,
      section: "Art",
      intendedId,
      dimensions: imageSize(join(OUT, destRel)),
      source: relPath,
      processing: "Nanobanan source plate; resized to 1280 px for review.",
      details: notes,
    });
  }
  return items;
}

/* ------------------------------------------------------------------ */
/* Character sources                                                   */
/* ------------------------------------------------------------------ */

const CHARACTER_PREFIXES = [
  "player-p1/ludo/walk-49f-2026-10-29/",
  "player-p1/ludo/walk-36f-2026-10-29/",
  "player-p1/working/",
  "player-p2/walk/",
  "player-p2/jump/",
  "player-p2/working/",
  "neuron-agent/sprite-max-px-frames-36-rows-6-cols-6/",
  "neuron-agent/working/",
];

function buildCharacters(): GalleryItem[] {
  const items: GalleryItem[] = [];
  for (const file of walkFiles(join(ROOT, "art-source/characters"))) {
    const relPath = relative(ROOT, file).split("\\").join("/");
    if (!isAvailable(relPath)) continue;
    if (/\.zip$/i.test(relPath)) continue;
    const sub = relative(join(ROOT, "art-source/characters"), file).split("\\").join("/");
    if (!CHARACTER_PREFIXES.some((prefix) => sub.startsWith(prefix))) continue;
    if (sub.includes("/working/frames/") || sub.includes("/working/tmp/")) continue;
    const destRel = `characters/${sub}`;
    if (/\.png$/i.test(relPath)) {
      downscale(file, join(OUT, destRel), 1800);
    } else {
      copy(file, join(OUT, destRel));
    }
    if (!/\.(png|jpe?g|webp)$/i.test(relPath)) continue;
    const character = sub.split("/")[0];
    items.push({
      file: destRel,
      label: basename(file),
      group: `characters/${character}`,
      status: "source",
      section: "Characters",
      dimensions: imageSize(join(OUT, destRel)),
      source: relPath,
      processing: "Ludo source sheet or working master; resized for review.",
      pixel: true,
    });
  }
  return items;
}

/* ------------------------------------------------------------------ */
/* Screenshots                                                         */
/* ------------------------------------------------------------------ */

const SCREENSHOTS: Array<[string, string, string]> = [
  ["current", "m3.5-hub-final.png", "Current final hub art + DOM menu"],
  ["current", "m3.5-hub-final-720p.png", "Current final hub art (720p)"],
  ["current", "m3.5-hub-layout.png", "Hub layout review"],
  ["current", "m3.5-hub-layout-720p.png", "Hub layout review (720p)"],
  ["current", "m3-player-p1-p2-idle.png", "Player idle contact sheet"],
  ["current", "m3-player-p1-walk.png", "Player walk contact sheet"],
  ["current", "m3-nerve-forest-backgrounds.png", "Nerve Forest background review"],
  ["placeholder-era", "m1-nerve-forest.png", "Placeholder-era gameplay/HUD"],
  ["placeholder-era", "m1-dialogue.png", "Placeholder-era dialogue"],
  ["placeholder-era", "m1-gate.png", "Placeholder-era gate"],
  ["placeholder-era", "m3.5-hub-placeholder.png", "Placeholder hub"],
  ["historical", "m1.9-hub.png", "Older hub"],
  ["historical", "m1.9-launch.png", "Older launch"],
  ["historical", "m0.1-fixture.png", "M0.1 fixture"],
  ["historical", "m0.1-placeholder.png", "M0.1 placeholder"],
  ["historical", "m0.2-fixture.png", "M0.2 fixture"],
  ["historical", "m0.2-placeholder.png", "M0.2 placeholder"],
];

function buildScreenshots(): GalleryItem[] {
  const items: GalleryItem[] = [];
  for (const [era, name, note] of SCREENSHOTS) {
    const relPath = `screenshots/${name}`;
    if (!isAvailable(relPath)) continue;
    const destRel = `screenshots/${era}/${name}`;
    copy(join(ROOT, relPath), join(OUT, destRel));
    items.push({
      file: destRel,
      label: name,
      group: `screenshots/${era}`,
      status: era,
      section: "UI/Controls",
      dimensions: imageSize(join(OUT, destRel)),
      source: relPath,
      details: note,
    });
  }
  return items;
}

/* ------------------------------------------------------------------ */
/* Action-shot captures                                                */
/* ------------------------------------------------------------------ */

function manifestAssetIds(): Set<string> {
  const ids = new Set<string>();
  for (const pack of PACKS) {
    const manifestPath = join(ROOT, pack.manifest);
    if (!existsSync(manifestPath)) continue;
    const manifest = readJson<ManifestDocument>(manifestPath);
    for (const id of Object.keys(manifest.assets ?? {})) ids.add(id);
  }
  return ids;
}

function writeEmptyCaptureManifest(): void {
  const empty: CaptureManifest = {
    schemaVersion: 1,
    generated: new Date().toISOString(),
    viewport: { width: 1280, height: 720 },
    captures: [],
  };
  writeFileSync(
    join(OUT, "captures.json"),
    `${JSON.stringify(empty, null, 2)}\n`,
  );
}

function buildCaptures(
  docSlugs: Set<string>,
  knownAssetIds: Set<string>,
): CaptureEntry[] {
  if (!existsSync(CAPTURES_MANIFEST)) {
    writeEmptyCaptureManifest();
    return [];
  }

  const manifest = readJson<CaptureManifest>(CAPTURES_MANIFEST);
  if (manifest.schemaVersion !== 1 || !Array.isArray(manifest.captures)) {
    throw new Error(
      `GDD_CAPTURE_MANIFEST_INVALID: ${relative(ROOT, CAPTURES_MANIFEST)}`,
    );
  }

  const captures: CaptureEntry[] = [];
  const flowIds = new Set(CAPTURE_FLOWS.map((flow) => flow.id));
  for (const raw of manifest.captures) {
    if (!/^[a-z0-9][a-z0-9-]*$/.test(raw.id)) {
      throw new Error(`GDD_CAPTURE_ID_INVALID: ${raw.id}`);
    }
    if (!flowIds.has(raw.flow)) {
      throw new Error(`GDD_CAPTURE_FLOW_INVALID: ${raw.id} -> ${raw.flow}`);
    }
    if (raw.art !== "final" && raw.art !== "placeholder") {
      throw new Error(`GDD_CAPTURE_ART_INVALID: ${raw.id} -> ${raw.art}`);
    }
    const fileName = `${raw.id}.png`;
    const source = join(CAPTURES_ROOT, fileName);
    if (basename(raw.file) !== fileName) {
      throw new Error(
        `GDD_CAPTURE_FILE_INVALID: ${raw.id} expected ${fileName}, got ${raw.file}`,
      );
    }
    if (!existsSync(source)) {
      console.warn(`[gdd] capture missing, skipping: ${fileName}`);
      continue;
    }
    if (raw.width !== 1280 || raw.height !== 720) {
      throw new Error(
        `GDD_CAPTURE_SIZE_INVALID: ${raw.id} is ${raw.width}x${raw.height}`,
      );
    }
    const unknownDocs = raw.docs.filter((doc) => !docSlugs.has(doc));
    if (unknownDocs.length > 0) {
      throw new Error(
        `GDD_CAPTURE_DOC_INVALID: ${raw.id} -> ${unknownDocs.join(", ")}`,
      );
    }
    const unknownAssets = raw.relatedAssets.filter(
      (assetId) => !knownAssetIds.has(assetId),
    );
    if (unknownAssets.length > 0) {
      console.warn(
        `[gdd] capture ${raw.id} references unavailable assets: ${unknownAssets.join(", ")}`,
      );
    }
    const destRel = `captures/${fileName}`;
    copy(source, join(OUT, destRel));
    captures.push({
      ...raw,
      file: destRel,
      docs: [...raw.docs],
      relatedAssets: [...raw.relatedAssets],
      objectiveIds: [...raw.objectiveIds],
      conceptIds: [...raw.conceptIds],
    });
  }

  captures.sort((a, b) => a.order - b.order);
  const publicManifest: CaptureManifest = {
    schemaVersion: 1,
    generated: manifest.generated,
    viewport: manifest.viewport ?? { width: 1280, height: 720 },
    captures,
  };
  writeFileSync(
    join(OUT, "captures.json"),
    `${JSON.stringify(publicManifest, null, 2)}\n`,
  );
  return captures;
}

function captureToGalleryItem(capture: CaptureEntry): GalleryItem {
  return {
    file: capture.file,
    label: capture.title,
    group: `action/${capture.flow}`,
    pack: capture.pack,
    status: "action",
    section: FLOW_SECTION[capture.flow],
    dimensions: `${capture.width}x${capture.height}`,
    source: "Playwright capture from the live app",
    processing:
      "Viewport screenshot at 1280x720; no annotations burned into the image.",
    details: capture.whatToNotice,
    pixel: false,
    art: capture.art,
    captureId: capture.id,
    flow: capture.flow,
    beat: capture.beat,
    mode: capture.mode,
    level: capture.level,
    room: capture.room,
    objectiveIds: [...capture.objectiveIds],
    conceptIds: [...capture.conceptIds],
    relatedAssets: [...capture.relatedAssets],
    whatToNotice: capture.whatToNotice,
    walkthrough: `walkthrough.html#${capture.id}`,
    order: capture.order,
  };
}

function buildFonts(): void {
  for (const file of walkFiles(join(ROOT, "public/fonts"))) {
    const relPath = relative(ROOT, file).split("\\").join("/");
    if (!isAvailable(relPath)) continue;
    const sub = relative(join(ROOT, "public/fonts"), file).split("\\").join("/");
    copy(file, join(OUT, "fonts", sub));
  }
}

/* ------------------------------------------------------------------ */
/* Docs                                                                */
/* ------------------------------------------------------------------ */

interface DocSource {
  source: string;
  section: string;
  slug?: string;
  title?: string;
}

const DOC_SOURCES: DocSource[] = [
  { source: "docs/gdd/README.md", section: "GDD pack", slug: "README" },
  { source: "docs/gdd/GDD-MAP.md", section: "GDD pack", slug: "GDD-MAP" },
  { source: "docs/gdd/PIPELINE.md", section: "GDD pack", slug: "PIPELINE" },
  { source: "docs/gdd/CAPTURES.md", section: "GDD pack", slug: "CAPTURES" },
  { source: "docs/gdd/ASSET-LIST-GBL.md", section: "GDD pack", slug: "ASSET-LIST-GBL" },
  { source: "docs/gdd/LICENCE-NOTES.md", section: "GDD pack", slug: "LICENCE-NOTES" },
  { source: "docs/gdd/gbl/gbl-course-requirements.md", section: "GBL / learning design", slug: "gbl-course-requirements" },
  { source: "docs/gdd/gbl/learning-design-brief.md", section: "GBL / learning design", slug: "learning-design-brief" },
  { source: "docs/gdd/gbl/curriculum-alignment.md", section: "GBL / learning design", slug: "curriculum-alignment" },
  { source: "docs/gdd/gbl/theory-brief.md", section: "GBL / learning design", slug: "theory-brief" },
  { source: "docs/gdd/gbl/README.md", section: "GBL / learning design", slug: "gbl-README" },
  { source: "docs/m3/asset-requirements-v01.md", section: "Art pipeline / source notes", slug: "m3-asset-requirements-v01" },
  { source: "docs/m3/muscle-endplate-asset-requirements-v01.md", section: "Art pipeline / source notes", slug: "m3-muscle-endplate-asset-requirements-v01" },
  { source: "docs/assets/remaining-work.md", section: "Art pipeline / source notes", slug: "asset-remaining-work" },
  { source: "docs/assets/prompt-library-v01.md", section: "Art pipeline / source notes", slug: "asset-prompt-library-v01" },
  { source: "docs/m3.5/hub-asset-prompts-v01.md", section: "Art pipeline / source notes", slug: "m3.5-hub-asset-prompts-v01" },
  { source: "docs/adr-art-pipeline/adr-0060-source-work-runtime-asset-layers.md", section: "Art pipeline / source notes", slug: "adr-0060-source-work-runtime-asset-layers" },
  { source: "docs/adr-art-pipeline/adr-0061-palette-lut-sprite-variants.md", section: "Art pipeline / source notes", slug: "adr-0061-palette-lut-sprite-variants" },
  { source: "docs/adr-art-pipeline/adr-0062-data-driven-sprite-animation.md", section: "Art pipeline / source notes", slug: "adr-0062-data-driven-sprite-animation" },
  { source: "docs/adr-art-pipeline/adr-0063-build-time-animation-previews.md", section: "Art pipeline / source notes", slug: "adr-0063-build-time-animation-previews" },
  { source: "docs/adr-art-pipeline/adr-0075-hero-asset-treatment.md", section: "Art pipeline / source notes", slug: "adr-0075-hero-asset-treatment" },
  { source: "docs/monetization.md", section: "Art pipeline / source notes", slug: "monetization" },
  { source: "art-source/README.md", section: "Art pipeline / source notes", slug: "art-source-README" },
  { source: "art-source/nanobanan/README.md", section: "Art pipeline / source notes", slug: "nanobanan-README" },
];

function titleOf(markdown: string, fallback: string): string {
  const match = markdown.match(/^#\s+(.+)$/m);
  return match?.[1]?.trim() ?? fallback;
}

function renderDocs(): DocEntry[] {
  const entries: DocEntry[] = [];
  ensure(join(OUT, "docs"));
  const slugByBasename = new Map<string, string>();
  for (const doc of DOC_SOURCES) {
    if (!doc.slug) continue;
    slugByBasename.set(basename(doc.source, ".md"), doc.slug);
  }
  slugByBasename.set("ASSET-INDEX", "ASSET-INDEX");

  for (const doc of DOC_SOURCES) {
    if (!isAvailable(doc.source)) continue;
    const markdown = readFileSync(join(ROOT, doc.source), "utf8");
    const slug = doc.slug ?? basename(doc.source, ".md");
    const title = doc.title ?? titleOf(markdown, slug);
    let html = marked.parse(markdown, { async: false }) as string;
    // The page template owns the H1; drop the duplicate Markdown title.
    html = html.replace(/^\s*<h1[^>]*>[\s\S]*?<\/h1>\s*/i, "");
    html = html.replace(/href="([^"]+?)\.md(#[^"]*)?"/g, (whole, link: string, anchor = "") => {
      const target = basename(link);
      const mapped = slugByBasename.get(target);
      return mapped ? `href="docs/${mapped}.html${anchor}"` : whole;
    });
    html = html.replace(/href="gdd-assets\//g, 'href="');
    html = html.replace(/href="gdd-picks\/"/g, 'href="./"');
    html = html.replace(/href="contact-sheets\/"/g, 'href="./"');
    html = html.replace(/href="gallery\.html"/g, 'href="./"');
    html = html.replace(/href="source\/notes\/gbl\/"/g, 'href="docs/"');
    html = html.replace(/href="(https?:\/\/[^"]+)"/g, 'href="$1" target="_blank" rel="noreferrer"');
    const outRel = `docs/${slug}.html`;
    writeFileSync(
      join(OUT, outRel),
      docTemplate(title, html, doc.section),
    );
    entries.push({
      source: doc.source,
      slug,
      title,
      section: doc.section,
      file: outRel,
    });
  }

  entries.sort((a, b) => a.section.localeCompare(b.section) || a.title.localeCompare(b.title));
  return entries;
}

function docTemplate(title: string, body: string, section: string): string {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex,nofollow">
<link rel="icon" href="data:,">
<base href="../">
<title>${escapeHtml(title)} — Shrinkonauts GDD</title>
<link rel="stylesheet" href="site.css">
</head>
<body class="doc-page">
${siteHeader("docs")}
<main class="doc">
  <p class="doc-kicker">${escapeHtml(section)}</p>
  <h1>${escapeHtml(title)}</h1>
  <p class="doc-banner">Copied from the working docs. Some cross-links may still point to the original repository or Obsidian vault.</p>
  ${body}
</main>
<footer class="site-footer">
  <span>Generated ${TODAY} · <a href="${GALLERY_URL}">${GALLERY_URL}</a></span>
</footer>
</body>
</html>
`;
}

function docsIndex(entries: DocEntry[]): string {
  const sections = [...new Set(entries.map((entry) => entry.section))];
  const cards = sections
    .map((section) => {
      const links = entries
        .filter((entry) => entry.section === section)
        .map((entry) => `<li><a href="docs/${entry.slug}.html">${escapeHtml(entry.title)}</a></li>`)
        .join("\n");
      return `<section class="doc-group"><h2>${escapeHtml(section)}</h2><ul>${links}</ul></section>`;
    })
    .join("\n");
  const generated = `<section class="doc-group"><h2>Generated</h2><ul><li><a href="walkthrough.html">Action-shot walkthrough</a></li><li><a href="docs/ASSET-INDEX.html">Asset index</a></li><li><a href="captures.json">captures.json</a></li><li><a href="manifest.json">manifest.json</a></li></ul></section>`;
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex,nofollow">
<link rel="icon" href="data:,">
<base href="../">
<title>Docs — Shrinkonauts GDD</title>
<link rel="stylesheet" href="site.css">
</head>
<body class="doc-page">
${siteHeader("docs")}
<main class="doc">
  <p class="doc-kicker">Documentation</p>
  <h1>Docs</h1>
  <p class="doc-banner">Course, learning-design and art-pipeline notes. The asset gallery is at <a href="./">the gallery</a>.</p>
  ${cards}
  ${generated}
</main>
<footer class="site-footer"><span>Generated ${TODAY}</span></footer>
</body>
</html>
`;
}

/* ------------------------------------------------------------------ */
/* Asset index                                                         */
/* ------------------------------------------------------------------ */

function assetIndex(runtime: GalleryItem[]): string {
  const rows = runtime
    .map(
      (item) => `<tr>
<td><a href="${item.file}">${escapeHtml(item.label)}</a></td>
<td>${escapeHtml(item.pack ?? "")}</td>
<td>${escapeHtml(item.status)}</td>
<td>${escapeHtml(item.usedBy || "—")}</td>
<td>${escapeHtml(item.licence ?? "—")}</td>
</tr>`,
    )
    .join("\n");
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex,nofollow">
<link rel="icon" href="data:,">
<base href="../">
<title>Asset index — Shrinkonauts GDD</title>
<link rel="stylesheet" href="site.css">
</head>
<body class="doc-page">
${siteHeader("docs")}
<main class="doc">
  <p class="doc-kicker">Generated index</p>
  <h1>Asset index</h1>
  <p class="doc-banner">Runtime manifest entries. Use the <a href="./">gallery</a> for previews and source plates.</p>
  <table class="doc-table">
    <thead><tr><th>File / ID</th><th>Pack</th><th>Status</th><th>Used by</th><th>Licence</th></tr></thead>
    <tbody>${rows}</tbody>
  </table>
</main>
<footer class="site-footer"><span>Generated ${TODAY}</span></footer>
</body>
</html>
`;
}

/* ------------------------------------------------------------------ */
/* Gallery + about                                                     */
/* ------------------------------------------------------------------ */

function writeSiteCss(): void {
  writeFileSync(
    join(OUT, "site.css"),
    `:root {
  color-scheme: dark;
  --bg: #0b1318;
  --panel: #142126;
  --panel-2: #101a20;
  --text: #f2e8d5;
  --muted: #9db4ad;
  --accent: #7bdff2;
  --nerve: #ffd166;
  --muscle: #ef476f;
  --line: #2b3f46;
}
* { box-sizing: border-box; }
html { scroll-behavior: smooth; }
body { margin: 0; background: var(--bg); color: var(--text); font: 15px/1.5 ui-sans-serif, system-ui, sans-serif; }
a { color: var(--accent); text-decoration-thickness: 1px; text-underline-offset: 3px; }
a:hover { color: #fff; }
.site-header { position: sticky; top: 0; z-index: 5; display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 12px; padding: 14px 22px; border-bottom: 1px solid var(--line); background: rgba(11,19,24,.92); backdrop-filter: blur(8px); }
.brand { color: var(--text); font-weight: 800; letter-spacing: .04em; text-decoration: none; text-transform: uppercase; }
.brand span { color: var(--accent); font-weight: 500; letter-spacing: .02em; text-transform: none; }
.site-header nav { display: flex; flex-wrap: wrap; gap: 14px; font-size: 13px; }
.site-header nav a { color: var(--muted); text-decoration: none; }
.site-header nav a:hover { color: var(--accent); }
.wrap { padding: 24px 22px 40px; max-width: 1500px; margin: 0 auto; }
.hero { display: grid; gap: 8px; margin-bottom: 18px; }
.hero h1 { margin: 0; font-size: clamp(24px, 4vw, 38px); letter-spacing: -.02em; }
.hero p { margin: 0; max-width: 820px; color: var(--muted); }
.hero .count { color: var(--nerve); font-weight: 700; }
.filters { display: grid; grid-template-columns: minmax(220px, 1fr) repeat(4, minmax(120px, 190px)); gap: 8px; margin: 18px 0; position: sticky; top: 60px; z-index: 4; background: var(--bg); padding: 8px 0; }
.filters input, .filters select { width: 100%; background: var(--panel); color: var(--text); border: 1px solid var(--line); border-radius: 3px; padding: 9px 10px; font: inherit; }
.filters label { display: grid; gap: 4px; color: var(--muted); font-size: 11px; text-transform: uppercase; letter-spacing: .08em; }
.grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(190px, 1fr)); gap: 12px; }
.card { margin: 0; background: var(--panel); border: 1px solid var(--line); border-radius: 4px; overflow: hidden; display: flex; flex-direction: column; }
.card a.image { display: block; background: var(--panel-2); }
.card img { width: 100%; height: 165px; object-fit: contain; image-rendering: auto; display: block; }
.card .body { padding: 9px 10px 10px; display: grid; gap: 5px; }
.card .label { font-size: 12px; font-weight: 700; overflow-wrap: anywhere; line-height: 1.3; }
.card .meta { display: flex; flex-wrap: wrap; gap: 5px; align-items: center; font-size: 10px; color: var(--muted); }
.pill { border: 1px solid var(--line); border-radius: 999px; padding: 1px 7px; color: var(--muted); }
.pill.status-runtime { color: var(--accent); border-color: #2a6572; }
.pill.status-action { color: var(--nerve); border-color: #6a5a24; }
.pill.status-placeholder { color: var(--muscle); border-color: #6a2b3a; }
.pill.art-placeholder { color: var(--muscle); border-color: #6a2b3a; }
.pill.status-manifest-only { color: var(--nerve); border-color: #6a5a24; }
.card details { font-size: 11px; color: var(--muted); }
.card details summary { cursor: pointer; color: var(--accent); }
.card details p { margin: 5px 0 0; overflow-wrap: anywhere; }
.card .dim { font-size: 10px; color: var(--muted); }
.empty { color: var(--muted); padding: 30px 0; }
.site-footer { border-top: 1px solid var(--line); padding: 20px 22px; color: var(--muted); font-size: 12px; }
.doc-page .doc { max-width: 980px; margin: 0 auto; padding: 28px 22px 60px; }
.doc-kicker { margin: 0 0 6px; color: var(--accent); font-size: 11px; text-transform: uppercase; letter-spacing: .12em; }
.doc h1 { margin: 0 0 12px; font-size: clamp(26px, 4vw, 40px); }
.doc h2 { margin-top: 34px; border-bottom: 1px solid var(--line); padding-bottom: 6px; }
.doc h3 { margin-top: 24px; color: var(--nerve); }
.doc p, .doc li { color: #d8d4c8; }
.doc blockquote { margin: 18px 0; padding: 10px 14px; border-left: 3px solid var(--accent); background: var(--panel); color: var(--muted); }
.doc code { background: var(--panel-2); padding: 1px 4px; border-radius: 3px; color: var(--nerve); }
.doc pre { overflow: auto; padding: 14px; background: var(--panel-2); border: 1px solid var(--line); border-radius: 4px; }
.doc pre code { background: none; padding: 0; color: var(--text); }
.doc table, .doc-table { width: 100%; border-collapse: collapse; margin: 16px 0; font-size: 13px; }
.doc th, .doc td, .doc-table th, .doc-table td { border: 1px solid var(--line); padding: 7px 9px; text-align: left; vertical-align: top; }
.doc th, .doc-table th { background: var(--panel); color: var(--accent); }
.doc-banner { padding: 10px 14px; border: 1px dashed var(--line); color: var(--muted); background: var(--panel); font-size: 13px; }
.doc-group { margin: 24px 0; padding: 16px 18px; background: var(--panel); border: 1px solid var(--line); border-radius: 4px; }
.doc-group h2 { margin: 0 0 8px; border: 0; font-size: 18px; }
.doc-group ul { margin: 0; columns: 2; }
.site-header nav a[aria-current="page"] { color: var(--accent); }
.hero .quick { color: var(--muted); font-size: 13px; }
.hero .quick a { font-weight: 700; }
.walkthrough-nav { display: flex; flex-wrap: wrap; gap: 8px; margin: 14px 0 8px; }
.walkthrough-nav a { border: 1px solid var(--line); border-radius: 999px; padding: 4px 10px; color: var(--muted); font-size: 12px; text-decoration: none; }
.walkthrough-nav a:hover { color: var(--accent); border-color: #2a6572; }
.flow { margin: 30px 0 10px; }
.flow > h2 { margin: 0 0 14px; font-size: 24px; border-bottom: 1px solid var(--line); padding-bottom: 7px; }
.shots { list-style: none; margin: 0; padding: 0; display: grid; gap: 22px; }
.shot { display: grid; grid-template-columns: minmax(0, 1.45fr) minmax(260px, .8fr); gap: 18px; background: var(--panel); border: 1px solid var(--line); border-radius: 5px; padding: 14px; scroll-margin-top: 80px; }
.shot__media { background: #05090b; border: 1px solid var(--line); border-radius: 3px; overflow: hidden; align-self: start; }
.shot__media img { display: block; width: 100%; height: auto; }
.shot__body { display: grid; align-content: start; gap: 8px; }
.shot__step { margin: 0; color: var(--accent); font-size: 11px; letter-spacing: .1em; text-transform: uppercase; }
.shot h3 { margin: 0; font-size: 19px; }
.shot__meta { display: flex; flex-wrap: wrap; gap: 5px; margin: 0; }
.shot__meta .pill { font-size: 10px; }
.shot__caption { margin: 0; color: #d8d4c8; }
.shot__links { display: flex; flex-wrap: wrap; gap: 10px; font-size: 12px; }
.shot__links a { color: var(--accent); }
.shot__assets { font-size: 12px; color: var(--muted); overflow-wrap: anywhere; }
.copy-link { justify-self: start; }
.compare-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin: 14px 0 0; }
.compare-grid figure { margin: 0; background: var(--panel); border: 1px solid var(--line); border-radius: 4px; overflow: hidden; }
.compare-grid img { display: block; width: 100%; height: auto; }
.compare-grid figcaption { padding: 8px 10px; color: var(--muted); font-size: 12px; }
.empty-note { padding: 14px; border: 1px dashed var(--line); color: var(--muted); background: var(--panel); }
@media (max-width: 900px) {
  .shot { grid-template-columns: 1fr; }
  .compare-grid { grid-template-columns: 1fr; }
}
  .filters { grid-template-columns: 1fr 1fr; top: 96px; }
  .filters input { grid-column: 1 / -1; }
  .doc-group ul { columns: 1; }
}
@media (max-width: 560px) {
  .filters { grid-template-columns: 1fr; }
  .site-header { position: static; }
}
`,
  );
}

function writeWalkthrough(captures: CaptureEntry[]): void {
  const byId = new Map(captures.map((capture) => [capture.id, capture]));
  const knownDocs = new Set(
    DOC_SOURCES.map((doc) => doc.slug).filter((slug): slug is string => Boolean(slug)),
  );
  const flowTitle = new Map(CAPTURE_FLOWS.map((flow) => [flow.id, flow.title]));

  const shot = (capture: CaptureEntry, index: number): string => {
    const docs = capture.docs
      .filter((doc) => knownDocs.has(doc))
      .map(
        (doc) =>
          `<a href="docs/${escapeHtml(doc)}.html">${escapeHtml(doc)}</a>`,
      )
      .join(" · ");
    const assets = capture.relatedAssets
      .map(
        (asset) =>
          `<a href="./?q=${encodeURIComponent(asset)}">${escapeHtml(asset)}</a>`,
      )
      .join(" · ");
    const art =
      capture.art === "placeholder"
        ? '<span class="pill art-placeholder">placeholder</span>'
        : '<span class="pill status-runtime">final</span>';
    const compare = capture.compareWith
      ? `<a href="#compare">Compare: ${escapeHtml(capture.compareLabel ?? capture.compareWith)}</a> · `
      : "";
    return `<li class="shot" id="${escapeHtml(capture.id)}">
  <div class="shot__media">
    <a href="${escapeHtml(capture.file)}" target="_blank" rel="noreferrer">
      <img src="${escapeHtml(capture.file)}" alt="${escapeHtml(capture.alt)}" loading="lazy" decoding="async">
    </a>
  </div>
  <div class="shot__body">
    <p class="shot__step">${escapeHtml(flowTitle.get(capture.flow) ?? capture.flow)} · Step ${String(index + 1).padStart(2, "0")}</p>
    <h3>${escapeHtml(capture.title)}</h3>
    <p class="shot__meta">
      ${art}
      <span class="pill">${escapeHtml(capture.mode)}</span>
      ${capture.level ? `<span class="pill">${escapeHtml(capture.level)}</span>` : ""}
      ${capture.room ? `<span class="pill">${escapeHtml(capture.room)}</span>` : ""}
      <span class="pill">${escapeHtml(capture.beat)}</span>
    </p>
    <p class="shot__caption">${escapeHtml(capture.whatToNotice)}</p>
    <p class="shot__assets"><strong>Runtime assets:</strong> ${assets || "—"}</p>
    <p class="shot__assets"><strong>Docs:</strong> ${docs || "—"}</p>
    <p class="shot__links">
      <a href="${escapeHtml(capture.file)}" target="_blank" rel="noreferrer">Open full-size</a>
      ${compare}
      <button class="button copy-link" type="button" data-copy="${escapeHtml(capture.id)}">Copy link</button>
    </p>
  </div>
</li>`;
  };

  const flows = CAPTURE_FLOWS.map((flow) => {
    const entries = captures
      .filter((capture) => capture.flow === flow.id)
      .sort((a, b) => a.order - b.order);
    const body =
      entries.length > 0
        ? `<ol class="shots">${entries.map(shot).join("\n")}</ol>`
        : '<p class="empty-note">No captures in this flow yet. Run <code>npm run gdd:capture</code>.</p>';
    return `<section class="flow" id="flow-${flow.id}">
  <h2>${escapeHtml(flow.title)}</h2>
  ${body}
</section>`;
  }).join("\n");

  const comparisons = captures
    .filter((capture) => capture.compareWith && byId.has(capture.compareWith))
    .map((capture) => {
      const other = byId.get(capture.compareWith as string);
      if (!other) return "";
      return `<div class="flow" id="compare-${escapeHtml(capture.id)}">
  <h2>${escapeHtml(capture.compareLabel ?? "Comparison")}</h2>
  <div class="compare-grid">
    <figure>
      <a href="${escapeHtml(capture.file)}" target="_blank" rel="noreferrer"><img src="${escapeHtml(capture.file)}" alt="${escapeHtml(capture.alt)}" loading="lazy" decoding="async"></a>
      <figcaption><strong>${escapeHtml(capture.title)}</strong> — ${escapeHtml(capture.mode)}</figcaption>
    </figure>
    <figure>
      <a href="${escapeHtml(other.file)}" target="_blank" rel="noreferrer"><img src="${escapeHtml(other.file)}" alt="${escapeHtml(other.alt)}" loading="lazy" decoding="async"></a>
      <figcaption><strong>${escapeHtml(other.title)}</strong> — ${escapeHtml(other.mode)}</figcaption>
    </figure>
  </div>
</div>`;
    })
    .join("\n");

  const nav = CAPTURE_FLOWS.map(
    (flow) => `<a href="#flow-${flow.id}">${escapeHtml(flow.short)}</a>`,
  ).join("");
  const empty =
    captures.length === 0
      ? '<p class="empty-note">No action shots have been captured yet. Run <code>npm run gdd:capture</code>, then rebuild with <code>npm run gdd:site</code>.</p>'
      : "";

  writeFileSync(
    join(OUT, "walkthrough.html"),
    `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex,nofollow">
<link rel="icon" href="data:,">
<title>Gameplay walkthrough — Shrinkonauts GDD</title>
<link rel="stylesheet" href="site.css">
</head>
<body>
${siteHeader("walkthrough")}
<main class="wrap">
  <section class="hero">
    <p class="doc-kicker">Action shots</p>
    <h1>Gameplay walkthrough</h1>
    <p>${captures.length} screenshots captured from the live app at 1280×720, grouped by flow. Each step carries the level, room, beat, player mode and what to notice, and links to the runtime assets and docs behind it.</p>
    <p class="quick">Prefer the full library? <a href="./">Open the gallery</a> · <a href="captures.json">captures.json</a></p>
    <nav class="walkthrough-nav" aria-label="Walkthrough flows">${nav}<a href="#compare">Compare</a></nav>
  </section>
  ${empty}
  ${flows}
  ${comparisons ? `<section class="flow" id="compare"><h2>Comparisons</h2>${comparisons}</section>` : ""}
</main>
<footer class="site-footer">
  <span>Generated ${TODAY} · ${captures.length} action shots · <a href="${GALLERY_URL}">${GALLERY_URL}</a></span>
</footer>
<script>
document.querySelectorAll("[data-copy]").forEach((button) => {
  button.addEventListener("click", async () => {
    const url = new URL(window.location.href);
    url.hash = button.dataset.copy;
    try {
      await navigator.clipboard.writeText(url.toString());
      button.textContent = "Copied";
    } catch {
      window.prompt("Copy link", url.toString());
    }
    window.setTimeout(() => { button.textContent = "Copy link"; }, 1600);
  });
});
</script>
</body>
</html>
`,
  );
}

function writeGallery(items: GalleryItem[], counts: WebManifest["counts"]): void {
  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex,nofollow">
<link rel="icon" href="data:,">
<title>Shrinkonauts — GDD asset gallery</title>
<link rel="stylesheet" href="site.css">
</head>
<body>
${siteHeader("gallery")}
<main class="wrap">
  <section class="hero">
    <h1>GDD asset gallery</h1>
    <p><span class="count" id="count"></span> items from the Shrinkonauts art pipeline: runtime art, review previews, concept plates, character sources, screenshots and ${counts.captures} action shots. Search or filter, then open the full file. <a href="manifest.json">Download the manifest</a>.</p>
    <p class="quick"><a href="?status=action">Show only action shots</a> · <a href="walkthrough.html">Open the gameplay walkthrough</a></p>
  </section>
  <div class="filters">
    <label>Search<input id="search" type="search" placeholder="ID, file, note…"></label>
    <label>Group<select id="group"><option value="">All groups</option></select></label>
    <label>Pack<select id="pack"><option value="">All packs</option></select></label>
    <label>Status<select id="status"><option value="">All statuses</option></select></label>
    <label>GDD section<select id="section"><option value="">All sections</option></select></label>
  </div>
  <div id="grid" class="grid"></div>
  <p id="empty" class="empty" hidden>No assets match those filters.</p>
</main>
<footer class="site-footer">
  <span>Generated ${TODAY} · ${counts.runtime} runtime entries · ${counts.previews} previews · ${counts.concepts} concepts · ${counts.screenshots} screenshots · ${counts.captures} action shots · <a href="docs/">Docs</a></span>
</footer>
<script>
const items = ${JSON.stringify(items)};
const grid = document.getElementById("grid");
const empty = document.getElementById("empty");
const count = document.getElementById("count");
const search = document.getElementById("search");
const group = document.getElementById("group");
const pack = document.getElementById("pack");
const status = document.getElementById("status");
const section = document.getElementById("section");
const filters = { group, pack, status, section };
for (const [key, element] of Object.entries(filters)) {
  const values = [...new Set(items.map((item) => item[key]).filter(Boolean))].sort();
  for (const value of values) {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = value;
    element.append(option);
  }
}
function card(item) {
  const figure = document.createElement("figure");
  figure.className = "card";
  const link = document.createElement("a");
  link.className = "image";
  link.href = item.file;
  link.target = "_blank";
  link.rel = "noreferrer";
  const img = document.createElement("img");
  img.loading = "lazy";
  img.decoding = "async";
  img.src = item.file;
  img.alt = item.label;
  if (item.pixel) img.style.imageRendering = "pixelated";
  link.append(img);
  const body = document.createElement("div");
  body.className = "body";
  const label = document.createElement("div");
  label.className = "label";
  label.textContent = item.label;
  const meta = document.createElement("div");
  meta.className = "meta";
  const statusPill = document.createElement("span");
  statusPill.className = "pill status-" + item.status.replace(/[^a-z-]/gi, "-");
  statusPill.textContent = item.status;
  meta.append(statusPill);
  if (item.art === "placeholder") {
    const artPill = document.createElement("span");
    artPill.className = "pill art-placeholder";
    artPill.textContent = "placeholder art";
    meta.append(artPill);
  }
  if (item.captureId) {
    for (const value of [item.level, item.beat, item.mode]) {
      if (!value) continue;
      const pill = document.createElement("span");
      pill.className = "pill";
      pill.textContent = value;
      meta.append(pill);
    }
  }
  if (item.dimensions) {
    const dim = document.createElement("span");
    dim.className = "dim";
    dim.textContent = item.dimensions;
    meta.append(dim);
  }
  if (item.intendedId) {
    const intended = document.createElement("span");
    intended.className = "pill";
    intended.textContent = item.intendedId;
    meta.append(intended);
  }
  body.append(label, meta);
  if (item.captureId && item.walkthrough) {
    const walkthrough = document.createElement("a");
    walkthrough.href = item.walkthrough;
    walkthrough.textContent = "Open in walkthrough";
    walkthrough.style.fontSize = "11px";
    body.append(walkthrough);
  }
  if (item.details || item.usedBy || item.source || item.processing || item.licence || item.whatToNotice) {
    const details = document.createElement("details");
    const summary = document.createElement("summary");
    summary.textContent = "Details";
    details.append(summary);
    for (const [key, value] of [
      ["What to notice", item.whatToNotice],
      ["Level", item.level],
      ["Room", item.room],
      ["Beat", item.beat],
      ["Mode", item.mode],
      ["Objectives", item.objectiveIds?.join(", ")],
      ["Concepts", item.conceptIds?.join(", ")],
      ["Related assets", item.relatedAssets?.join(", ")],
      ["Used by", item.usedBy],
      ["Licence", item.licence],
      ["Source", item.source],
      ["Processing", item.processing],
      ["Notes", item.details],
    ]) {
      if (!value) continue;
      const p = document.createElement("p");
      const strong = document.createElement("strong");
      strong.textContent = key + ": ";
      p.append(strong, document.createTextNode(value));
      details.append(p);
    }
    body.append(details);
  }
  figure.append(link, body);
  return figure;
}
function render() {
  const q = search.value.trim().toLowerCase();
  const shown = items.filter((item) => {
    if (group.value && item.group !== group.value) return false;
    if (pack.value && item.pack !== pack.value) return false;
    if (status.value && item.status !== status.value) return false;
    if (section.value && item.section !== section.value) return false;
    if (!q) return true;
    return [item.file, item.label, item.details, item.usedBy, item.source, item.processing, item.licence, item.intendedId, item.captureId, item.flow, item.beat, item.mode, item.level, item.room, item.whatToNotice, item.relatedAssets?.join(" "), item.objectiveIds?.join(" "), item.conceptIds?.join(" ")]
      .filter(Boolean)
      .join(" ")
      .toLowerCase()
      .includes(q);
  });
  count.textContent = String(shown.length);
  empty.hidden = shown.length > 0;
  grid.replaceChildren(...shown.map(card));
}
const params = new URLSearchParams(location.search);
search.value = params.get("q") ?? "";
for (const [key, element] of Object.entries(filters)) {
  const value = params.get(key);
  if (value) element.value = value;
}
search.addEventListener("input", render);
for (const element of Object.values(filters)) element.addEventListener("change", render);
render();
</script>
</body>
</html>
`;
  writeFileSync(join(OUT, "index.html"), html);
}

function writeAbout(counts: WebManifest["counts"]): void {
  writeFileSync(
    join(OUT, "about.html"),
    `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex,nofollow">
<link rel="icon" href="data:,">
<title>About — Shrinkonauts GDD assets</title>
<link rel="stylesheet" href="site.css">
</head>
<body class="doc-page">
${siteHeader("about")}
<main class="doc">
  <p class="doc-kicker">About this pack</p>
  <h1>GDD asset gallery</h1>
  <p class="doc-banner">Public but unlisted: search engines are asked not to index this page. Anyone with the URL can view it.</p>
  <p>This gallery is generated from the tracked Shrinkonauts repository at deploy time. It contains ${counts.runtime} runtime manifest entries, ${counts.previews} review previews, ${counts.concepts} concept plates, ${counts.screenshots} historical screenshots, ${counts.characters} character-source images, ${counts.captures} action shots and ${counts.docs} documents.</p>
  <h2>Status key</h2>
  <ul>
    <li><strong>runtime</strong> — shipped runtime art; some entries are POC integrated with final approval pending.</li>
    <li><strong>action</strong> — a live-app gameplay screenshot from the walkthrough.</li>
    <li><strong>placeholder</strong> — declared, but no final art yet.</li>
    <li><strong>manifest-only</strong> — processed and declared, but not wired into the current scene.</li>
    <li><strong>preview / source</strong> — review previews or source plates, not runtime assets.</li>
    <li><strong>historical</strong> — old milestone screenshots.</li>
  </ul>
  <h2>What is not here</h2>
  <ul>
    <li>No generated capture binaries in git; action shots are rebuilt by <code>npm run gdd:capture</code> and merged by <code>npm run gdd:site</code>.</li>
    <li>No static contact sheets or <code>gdd-picks/</code> folders; the gallery replaces them.</li>
    <li>No audio files — every cue is a placeholder.</li>
    <li>No ignored local-only plates (full-size keyed files, raw hub batch).</li>
  </ul>
  <h2>Known visual gaps</h2>
  <ul>
    <li>The 04 Muscle Effector background layer is not wired yet; the walkthrough labels those shots as final sprite art over a procedural gradient.</li>
    <li>The 03 concept gate <code>gate-nerve-01</code> is authored but not loaded; the concept-gate overlay is captured on Silicon.</li>
  </ul>
  <h2>Licences</h2>
  <p>AI-generated art is logged as own work with the tool and the current POC licence label. The two fonts are Silkscreen and Pixelify Sans, both SIL OFL 1.1. In-repo placeholder atlases are CC0-1.0. The Ludo/Nano Banana plan, prompt, model and seed are still TBD; see <a href="docs/LICENCE-NOTES.html">Licence notes</a> and <a href="docs/ASSET-LIST-GBL.html">Asset list</a>.</p>
  <h2>Links</h2>
  <ul>
    <li><a href="./">Gallery</a></li>
    <li><a href="walkthrough.html">Gameplay walkthrough</a></li>
    <li><a href="docs/">Docs</a></li>
    <li><a href="manifest.json">manifest.json</a></li>
    <li><a href="captures.json">captures.json</a></li>
    <li><a href="${GAME_URL}">Play the game</a></li>
    <li><a href="${REPO_URL}">Repository</a></li>
  </ul>
</main>
<footer class="site-footer"><span>Generated ${TODAY} · ${GALLERY_URL}</span></footer>
</body>
</html>
`,
  );
}

/* ------------------------------------------------------------------ */
/* Utilities                                                           */
/* ------------------------------------------------------------------ */

type NavSection = "gallery" | "walkthrough" | "docs" | "about";

function siteHeader(active: NavSection): string {
  const link = (id: NavSection, href: string, label: string): string =>
    `<a href="${href}"${id === active ? ' aria-current="page"' : ""}>${label}</a>`;
  return `<header class="site-header">
  <a class="brand" href="./">Shrinkonauts <span>GDD assets</span></a>
  <nav>
    ${link("gallery", "./", "Gallery")}
    ${link("walkthrough", "walkthrough.html", "Walkthrough")}
    ${link("docs", "docs/", "Docs")}
    ${link("about", "about.html", "About")}
    <a href="${GAME_URL}" target="_blank" rel="noreferrer">Play</a>
    <a href="${REPO_URL}" target="_blank" rel="noreferrer">GitHub</a>
  </nav>
</header>`;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/* ------------------------------------------------------------------ */
/* Main                                                                */
/* ------------------------------------------------------------------ */

reset();
writeSiteCss();

const runtime = buildRuntime();
const previews = buildPreviews();
const concepts = buildConcepts();
const characters = buildCharacters();
const screenshots = buildScreenshots();
buildFonts();
const docs = renderDocs();
const captureDocSlugs = new Set(
  DOC_SOURCES.map((doc) => doc.slug).filter(
    (slug): slug is string => Boolean(slug),
  ),
);
const captures = buildCaptures(captureDocSlugs, manifestAssetIds());

const counts: WebManifest["counts"] = {
  runtime: runtime.length,
  previews: previews.length,
  concepts: concepts.length,
  characters: characters.length,
  screenshots: screenshots.length,
  captures: captures.length,
  docs: docs.length,
};

const items: GalleryItem[] = [
  ...runtime,
  ...previews,
  ...concepts,
  ...characters,
  ...screenshots,
  ...captures.map(captureToGalleryItem),
];

writeGallery(items, counts);
writeWalkthrough(captures);
writeAbout(counts);
writeFileSync(join(OUT, "docs/index.html"), docsIndex(docs));
writeFileSync(join(OUT, "docs/ASSET-INDEX.html"), assetIndex(runtime));

const manifest: WebManifest = {
  schemaVersion: 1,
  generated: new Date().toISOString(),
  game: GAME_URL,
  repo: REPO_URL,
  counts,
  runtime,
  previews,
  concepts,
  characters,
  screenshots,
  captures,
  docs,
};
writeFileSync(join(OUT, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);

const totalBytes = walkFiles(OUT).reduce((sum, file) => sum + statSync(file).size, 0);
console.log(`Built ${relative(ROOT, OUT)}`);
console.log(`  runtime: ${runtime.length}`);
console.log(`  previews: ${previews.length}`);
console.log(`  concepts: ${concepts.length}`);
console.log(`  characters: ${characters.length}`);
console.log(`  screenshots: ${screenshots.length}`);
console.log(`  action shots: ${captures.length}`);
console.log(`  docs: ${docs.length}`);
console.log(`  total: ${(totalBytes / 1024 / 1024).toFixed(1)} MB`);
console.log(`  gallery: ${GALLERY_URL}`);
