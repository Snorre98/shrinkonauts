/**
 * sfx-generate.ts — offline SFX generation for the M3/M3.5 audio pass.
 *
 * Consumer of the local Stable Audio 3 Small SFX fleet daemon
 * (`stable-audio-3-small-sfx`, delegate serve-sa3.sh, port 8100 — see
 * macos-dev-config SERVING-MANIFEST.md). This is an offline ASSET step: the
 * game runtime never talks to the model server; it plays the MP3 files this
 * script installs into the pack manifests.
 *
 * Flow (mirrors docs/audio/audio-requirements-and-prompts-v01.md §11):
 *   1. pilot   — generate `boot`, `scan`, `jump`, `land` × N seeds; the pilot
 *                is the audio style anchor and must be approved before batch.
 *   2. batch   — generate the remaining cues (or --cues a,b,c).
 *   3. takes   — list takes + technical checks; listen with
 *                `afplay var/sfx/<cue>/<seed>.mp3` at volume 0.7.
 *   4. adopt   — install the chosen take per cue: copy the MP3 into the pack,
 *                set `src`/`license` in assets.final.json (drop `placeholder`),
 *                copy to the Silicon pack (reuse rule §2.3), append licence
 *                records and the prompt-log rows.
 *
 * Prompts are the doc's Stable Audio 3 Small SFX cue cards verbatim (§7/§8/§9);
 * the card prompts already carry the production character ("dry, tactile, …
 * no music, no voice"), so the §4.1/§4.2 style blocks are NOT prepended and no
 * negative language is appended — on the post-trained checkpoint
 * negative_prompt/cfg_scale are documented no-ops (they are honored only on the
 * `-base` escalation checkpoint, requested with --model base).
 *
 * Post-processing (§12.1): head trim <20 ms, tail trim <100 ms, 35 Hz high-pass
 * (DC/rumble), clamp to the cue window, 10 ms fade-out, normalize to
 * −5 dBFS sample peak and verify ≤ −1 dBTP after MP3 encoding, 48 kHz mono
 * MP3 160 kbps, ≤120 KB. (MP3 is the decided format: this machine's ffmpeg has
 * no libvorbis, and MP3 decodes universally in the browser, Safari included.
 * One format, all packs, reason recorded in the doc §5.1/§16.)
 *
 * Usage:
 *   tsx scripts/sfx-generate.ts status
 *   tsx scripts/sfx-generate.ts pilot [--seeds 1,2,3,4]
 *   tsx scripts/sfx-generate.ts batch [--cues boot,hub.click] [--seeds 1,2,3]
 *   tsx scripts/sfx-generate.ts takes [cue]
 *   tsx scripts/sfx-generate.ts adopt --picks boot=3,scan=1,jump=2,land=5
 *   tsx scripts/sfx-generate.ts adopt --cue boot --seed 3 [--model base] [--force]
 *
 * Options:
 *   --model base  generate on the stable-audio-3-small-sfx-base escalation
 *                 checkpoint (cfg 7, 50 steps, real negative prompt = the
 *                 doc's global negative §4.4 + the cue's negative delta).
 *                 On `adopt`, records the base model in the prompt log.
 *   --force       install a take that fails the technical checks (recorded
 *                 exception; prefer regenerating).
 *   --base URL    bypass the fleet daemon and talk to the server directly
 *                 (default resolves via http://127.0.0.1:9300).
 *
 * Raw takes and previews land in var/sfx/ (git-ignored; never commit WAVs).
 */

import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { dirname, join } from "node:path";
import { PACKS_DIR, PUBLIC_DIR, REPO_ROOT } from "./content-loader";

const VAR_DIR = join(REPO_ROOT, "var", "sfx");
const HUB_DIR = join(PUBLIC_DIR, "hub", "bathroom");
const ANATOMY_DIR = join(PACKS_DIR, "anatomy-reflex");
const SILICON_DIR = join(PACKS_DIR, "silicon-reflex");
const PROMPT_LOG = join(REPO_ROOT, "docs", "audio", "sfx-prompt-log.csv");

const DAEMON = "http://127.0.0.1:9300";
const FLEET_KEY = "stable-audio-3-small-sfx";
const FLEET_KEY_BASE = "stable-audio-3-small-sfx-base";

const LICENSE_NAME = "Stability AI Community License";
const LICENSE_URL = "https://stability.ai/license";
const MODEL_LABEL = "Stability AI Stable Audio 3 Small SFX (local)";

/** The doc's global negative (§4.4) — used only on the -base escalation. */
const GLOBAL_NEGATIVE =
  "music, melody, song, musical bed, vocals, speech, singing, choir, " +
  "intelligible words, gore, blood, screams, pain, long reverb, echo, " +
  "clipping, distortion, low quality, muffled.";

type Cue = {
  id: string;
  file: string;
  dest: "anatomy" | "hub";
  window: [number, number];
  gen: number;
  prompt: string;
  negDelta: string;
};

/** Cue cards from docs/audio/audio-requirements-and-prompts-v01.md §7–§9. */
const CUES: Cue[] = [
  { id: "audio.cue.boot", file: "boot", dest: "anatomy", window: [0.6, 1.2], gen: 1.2,
    prompt: "TrackType: SFX, a very quiet delicate sci-fi suit power-up: a brief soft electric hum gliding upward and fading, a gentle helmet-seal air hiss, and two tiny clean beeps, small and intimate, close-miked, dry and tactile, fast decay, no music, no voice, no clipping, no distortion, no loud sustained tone.",
    negDelta: "music, melody, vocals, speech, long reverb, cinematic boom, clipping." },
  { id: "audio.cue.dialogue", file: "dialogue", dest: "anatomy", window: [0.2, 0.8], gen: 1.0,
    prompt: "TrackType: SFX, a short friendly alien cell-speech translator: a wet organic chirp, a soft radio-static blip, close and dry, fast decay, no voice, no intelligible speech.",
    negDelta: "voice, speech, words, robotic dialogue, long reverb." },
  { id: "audio.cue.scan", file: "scan", dest: "anatomy", window: [0.3, 1.0], gen: 1.0,
    prompt: "TrackType: SFX, a sci-fi scanner sweep: a clean high sonar ping with a tiny digital data tick and a faint shimmering tail, close and dry, short decay, no music, no voice.",
    negDelta: "alarm, siren, long reverb, melody." },
  { id: "audio.cue.dash", file: "dash", dest: "anatomy", window: [0.2, 0.7], gen: 1.0,
    prompt: "TrackType: SFX, a short suit-thruster dash: a compact air puff, a fabric snap, and a quick whoosh, close and dry, fast decay, no music, no voice.",
    negDelta: "jet engine roar, explosion, long reverb." },
  { id: "audio.cue.gate", file: "gate", dest: "anatomy", window: [0.4, 1.2], gen: 1.2,
    prompt: "TrackType: SFX, an organic sci-fi gate panel sliding open: a soft wet suction pop, a hollow wooden knock, and a short air slide, tactile and dry, not gory, fast decay, no music, no voice.",
    negDelta: "gore, blood, meat, scream, long reverb." },
  { id: "audio.cue.map", file: "map", dest: "anatomy", window: [0.3, 0.9], gen: 1.0,
    prompt: "TrackType: SFX, a holographic map unfolding: a soft digital shimmer, a tiny glass chime, and a light paper-like flap, close and dry, short decay, no music, no voice.",
    negDelta: "paper crumple, alarm, long reverb, melody." },
  { id: "audio.cue.debrief", file: "debrief", dest: "anatomy", window: [0.4, 1.2], gen: 1.2,
    prompt: "TrackType: SFX, a warm two-note synth chime resolution with a soft suit confirmation click, gentle and clean, dry, short decay, no music bed, no voice.",
    negDelta: "fanfare, applause, song, long reverb." },
  { id: "audio.cue.checkpoint", file: "checkpoint", dest: "anatomy", window: [0.3, 0.9], gen: 1.0,
    prompt: "TrackType: SFX, a checkpoint beacon: a clean single pulse with a small digital save confirmation, close and dry, short decay, no music, no voice.",
    negDelta: "alarm, siren, long reverb, melody." },
  { id: "audio.cue.unlock", file: "unlock", dest: "anatomy", window: [0.5, 1.2], gen: 1.2,
    prompt: "TrackType: SFX, a satisfying ability unlock: a rising synth tone, a short electric nerve zap, and a clean mechanical click, dry and tactile, fast decay, no music, no voice.",
    negDelta: "fanfare, explosion, long reverb." },
  { id: "audio.cue.jump", file: "jump", dest: "anatomy", window: [0.15, 0.5], gen: 1.0,
    prompt: "TrackType: SFX, a soft suit-servo jump: a compact pneumatic push and a tiny fabric rustle, close and dry, very fast decay, no music, no voice.",
    negDelta: "spring boing, cartoon bounce, long reverb." },
  { id: "audio.cue.land", file: "land", dest: "anatomy", window: [0.15, 0.5], gen: 1.0,
    prompt: "TrackType: SFX, a soft landing on wet organic tissue: a gentle squelch and a suit thud, tactile and dry, not gory, very fast decay, no music, no voice.",
    negDelta: "gore, blood, splatter, scream, long reverb." },
  { id: "audio.cue.wrong", file: "wrong", dest: "anatomy", window: [0.2, 0.6], gen: 1.0,
    prompt: "TrackType: SFX, a short wrong-answer feedback: a dry low buzz and a soft suit click, close and dry, fast decay, no voice, no music.",
    negDelta: "voice, speech, harsh alarm, long reverb." },
  { id: "audio.cue.hub.click", file: "hub-click", dest: "hub", window: [0.05, 0.15], gen: 1.0,
    prompt: "TrackType: SFX, a single chunky plastic control-panel button press: a dry tactile click with a tiny relay tick, close and dry, extremely short decay, no music, no voice.",
    negDelta: "mouse click, keyboard, click track, long reverb." },
  { id: "audio.cue.hub.door", file: "hub-door", dest: "hub", window: [0.4, 0.8], gen: 1.0,
    prompt: "TrackType: SFX, a heavy retro washing-machine porthole door unlatching and swinging open: a metal latch clunk, a soft pneumatic hiss, and a hollow enamel resonance, close and dry, short decay, no music, no voice.",
    negDelta: "door slam, glass break, long reverb, gore." },
  { id: "audio.cue.hub.spin", file: "hub-spin", dest: "hub", window: [1.0, 2.0], gen: 2.0,
    prompt: "TrackType: SFX, a retro washing-machine drum spinning up: a low electric motor hum rising in pitch, a small water slosh, and a faint metal rattle, mechanical and dry, one-shot with a clean stop, no music, no voice.",
    negDelta: "factory, jet engine, long reverb, music." },
  { id: "audio.cue.hub.shrink", file: "hub-shrink", dest: "hub", window: [0.5, 0.9], gen: 1.0,
    prompt: "TrackType: SFX, a sci-fi shrink-beam firing: a descending electric zap, a brief suit power surge, and a soft flash whoosh, playful and not painful, dry, fast decay, no music, no voice, no gore.",
    negDelta: "scream, pain, explosion, long reverb." },
  { id: "audio.cue.hub.arrive", file: "hub-arrive", dest: "hub", window: [0.3, 0.8], gen: 1.0,
    prompt: "TrackType: SFX, a tiny astronaut arriving on a wet bathroom floor: a soft high chime, a tiny boot squelch, and a very small damp room tone, close and dry, short decay, no music, no voice.",
    negDelta: "large hall, long reverb, gore, music." },
  { id: "audio.cue.hub.hum", file: "hub-hum", dest: "hub", window: [1.0, 2.0], gen: 2.0,
    prompt: "TrackType: SFX, a warm laundry-lab room tone: a steady low appliance hum, a faint pipe tick, and a distant water drip, close and dry, one-shot accent, no music, no voice.",
    negDelta: "melody, loud machinery, silence, long reverb." },
];

const PILOT = ["boot", "scan", "jump", "land"];

// ── small helpers ─────────────────────────────────────────────────────────────

function cueByFile(file: string): Cue {
  const cue = CUES.find((c) => c.file === file);
  if (!cue) throw new Error(`unknown cue '${file}' (known: ${CUES.map((c) => c.file).join(", ")})`);
  return cue;
}

function run(bin: string, args: string[]): string {
  const res = spawnSync(bin, args, { encoding: "utf8" });
  if (res.error) throw new Error(`${bin}: ${res.error.message}`);
  if (res.status !== 0) throw new Error(`${bin} ${args.join(" ")} failed:\n${res.stderr}`);
  // ffmpeg prints filters like volumedetect to stderr; ffprobe prints to
  // stdout — return both, parsers use regexes.
  return `${res.stdout}\n${res.stderr}`;
}

function sha256(path: string): string {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

function readJson(path: string): any {
  return JSON.parse(readFileSync(path, "utf8"));
}

/** Stringify 2-space like the repo's manifests, preserving each file's
 * trailing-newline convention. */
function writeJson(path: string, obj: unknown): void {
  const before = readFileSync(path, "utf8");
  const out = JSON.stringify(obj, null, 2) + (before.endsWith("\n") ? "\n" : "");
  writeFileSync(path, out);
}

function destDir(cue: Cue): string {
  return cue.dest === "hub"
    ? join(HUB_DIR, "shared", "audio")
    : join(ANATOMY_DIR, "shared", "audio");
}

function cueDir(cue: Cue): string {
  return join(VAR_DIR, cue.file);
}

// ── fleet client ──────────────────────────────────────────────────────────────

async function fleetBase(key: string, override?: string): Promise<string> {
  if (override) return override;
  const state = await (await fetch(`${DAEMON}/status/${key}`)).json();
  if (state.state !== "up") {
    console.log(`• fleet: starting ${key} (blocking; eager-loads ~2.4 GB) …`);
    const start = await fetch(`${DAEMON}/start/${key}`, { method: "POST" });
    if (!start.ok) throw new Error(`fleet start failed: ${await start.text()}`);
  }
  const reach = await (await fetch(`${DAEMON}/reach/${key}`)).json();
  return reach.baseURL as string;
}

type GenResult = { seed: number; model: string; wav: Buffer };

async function generate(
  base: string,
  cue: Cue,
  seed: number,
  model: string,
  useBase: boolean,
): Promise<GenResult> {
  const body: Record<string, unknown> = {
    model,
    prompt: cue.prompt,
    duration: cue.gen,
    seed,
    batch_size: 1,
  };
  if (useBase) {
    body.steps = 50;
    body.cfg_scale = 7;
    body.negative_prompt = `${GLOBAL_NEGATIVE} ${cue.negDelta}`;
  }
  const res = await fetch(`${base}/audio/sound-generations`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(900_000),
  });
  if (!res.ok) throw new Error(`generation failed (${res.status}): ${await res.text()}`);
  const wav = Buffer.from(await res.arrayBuffer());
  const echoSeed = res.headers.get("X-Seed");
  const echoModel = res.headers.get("X-Model") ?? model;
  return { seed: echoSeed ? Number(echoSeed) : seed, model: echoModel, wav };
}

// ── post-processing (§12.1) ───────────────────────────────────────────────────

type TakeReport = {
  cue: string;
  seed: number;
  trimmed: number;
  final: number;
  inWindow: boolean;
  overWindow: boolean;
  lowLevel: boolean;
  sizeKb: number;
  truePeak: number;
  truePeakOk: boolean;
  ok: boolean;
};

const HEAD_TRIM = "silenceremove=start_periods=1:start_threshold=-45dB:start_silence=0.015";
const TAIL_TRIM = `areverse,${HEAD_TRIM},areverse`;

/** EBU R128 true peak (dBTP); -99 for silence, NaN if the file is unreadable. */
function measureTruePeak(path: string): number {
  const out = run("ffmpeg", [
    "-hide_banner", "-nostats", "-i", path,
    "-filter_complex", "ebur128=peak=true",
    "-f", "null", "-",
  ]);
  const matches = [...out.matchAll(/TPK:\s*(-?[\d.]+|-inf)\s*dBFS/g)];
  if (matches.length === 0) return Number.NaN;
  const raw = matches[matches.length - 1][1];
  return raw === "-inf" ? -99 : Number(raw);
}

function encodeMp3(trim: string, mp3: string, winMax: number, gainDb: number): void {
  run("ffmpeg", [
    "-hide_banner", "-loglevel", "error", "-y", "-i", trim,
    "-t", String(winMax),
    "-af", `volume=${gainDb.toFixed(2)}dB,areverse,afade=t=in:st=0:d=0.01,areverse`,
    "-ar", "48000", "-ac", "1",
    "-c:a", "libmp3lame", "-b:a", "160k",
    mp3,
  ]);
}

function postProcess(cue: Cue, seed: number): TakeReport {
  const dir = cueDir(cue);
  const wav = join(dir, `${seed}.wav`);
  const trim = join(dir, `${seed}.trim.wav`);
  const mp3 = join(dir, `${seed}.mp3`);

  // 1–2: head/tail silence trim + 35 Hz high-pass (DC + rumble).
  run("ffmpeg", [
    "-hide_banner", "-loglevel", "error", "-y", "-i", wav,
    "-af", `${HEAD_TRIM},${TAIL_TRIM},highpass=f=35`,
    trim,
  ]);

  // 3: length + peak analysis on the trimmed take.
  const dur = Number(run("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", trim]).split("\n")[0]);
  const detect = run("ffmpeg", ["-hide_banner", "-i", trim, "-af", "volumedetect", "-f", "null", "-"]);
  const peakLine = detect.match(/max_volume:\s*(-?[\d.]+) dB/);
  const maxVolume = peakLine ? Number(peakLine[1]) : -99;

  const lowLevel = maxVolume < -25;
  // −5 dBFS sample peak leaves ~2 dB of headroom for MP3 true-peak overshoot;
  // the post-encode check below catches anything that still exceeds −1 dBTP.
  const gain = Math.max(-30, Math.min(12, -5 - maxVolume));
  const [winMin, winMax] = cue.window;
  const overWindow = dur > winMax + 0.05;

  // 4–8: clamp to the window, normalize, 10 ms fade-out, 48 kHz mono MP3
  // 160 kbps, then verify the decoded true peak.
  encodeMp3(trim, mp3, winMax, gain);
  let truePeak = measureTruePeak(mp3);
  if (Number.isFinite(truePeak) && truePeak > -1) {
    // Re-encode with enough extra reduction to land at about −1.5 dBTP.
    const extra = Math.min(24, truePeak + 1.5);
    encodeMp3(trim, mp3, winMax, gain - extra);
    truePeak = measureTruePeak(mp3);
  }

  const final = Number(run("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", mp3]).split("\n")[0]);
  const sizeKb = Math.round(Number(run("stat", ["-f", "%z", mp3])) / 102.4) / 10;
  const inWindow = final >= winMin - 0.02 && final <= winMax + 0.02;
  const truePeakOk = Number.isFinite(truePeak) && truePeak <= -1;
  const ok = !lowLevel && inWindow && sizeKb <= 120 && truePeakOk;
  return { cue: cue.file, seed, trimmed: dur, final, inWindow, overWindow, lowLevel, sizeKb, truePeak, truePeakOk, ok };
}

// ── prompt log (CSV — every take is a row; history is never overwritten) ─────

function csvField(value: string): string {
  return /[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

function appendPromptLog(row: string[]): void {
  if (!existsSync(PROMPT_LOG)) {
    mkdirSync(dirname(PROMPT_LOG), { recursive: true });
    writeFileSync(
      PROMPT_LOG,
      "asset_id,model,seed,requested_duration_s,variations,chosen_file,post_processing,verdict,licence\n",
    );
  }
  writeFileSync(PROMPT_LOG, `${row.map(csvField).join(",")}\n`, { flag: "a" });
}

// ── subcommands ───────────────────────────────────────────────────────────────

async function cmdGenerate(
  cueFiles: string[],
  seeds: number[],
  useBase: boolean,
  baseOverride: string | undefined,
): Promise<void> {
  const model = useBase ? FLEET_KEY_BASE : FLEET_KEY;
  const base = await fleetBase(model, baseOverride);
  console.log(`• server: ${base} (model ${model}${useBase ? ", cfg 7, 50 steps, real negative prompt" : ""})`);
  for (const file of cueFiles) {
    const cue = cueByFile(file);
    mkdirSync(cueDir(cue), { recursive: true });
    for (const seed of seeds) {
      const t0 = Date.now();
      const out = join(cueDir(cue), `${seed}.wav`);
      const done = join(cueDir(cue), `${seed}.mp3`);
      if (existsSync(out) && existsSync(done)) {
        console.log(`  ${cue.file} seed ${seed}: take exists — skipping (delete it to regenerate)`);
        continue;
      }
      process.stdout.write(`  ${cue.file} seed ${seed} … `);
      let echoSeed = seed;
      let generated = false;
      if (!existsSync(out)) {
        const res = await generate(base, cue, seed, model, useBase);
        writeFileSync(out, res.wav);
        echoSeed = res.seed;
        generated = true;
      }
      const report = postProcess(cue, seed);
      if (generated) {
        appendPromptLog([
          cue.id,
          useBase ? "stable-audio-3-small-sfx-base" : "stable-audio-3-small-sfx",
          String(echoSeed),
          `${cue.gen}`,
          String(seeds.length),
          "",
          "head/tail trim; 35 Hz HPF; window clamp; -5 dBFS / <= -1 dBTP; 10 ms fade; 48 kHz mono MP3 160k",
          "take",
          LICENSE_NAME,
        ]);
      }
      const tpk = Number.isFinite(report.truePeak) ? `${report.truePeak.toFixed(1)}` : "?";
      console.log(
        `${((Date.now() - t0) / 1000).toFixed(0)}s → trimmed ${report.trimmed.toFixed(2)}s, ` +
          `final ${report.final.toFixed(2)}s, ${report.sizeKb} KB, TPK ${tpk} dBTP` +
          `${report.inWindow ? "" : " [OUT OF WINDOW]"}${report.lowLevel ? " [LOW LEVEL]" : ""}` +
          `${report.truePeakOk ? "" : " [TRUE PEAK]"}` +
          `${report.ok ? " ✓" : " ✗"}`,
      );
    }
  }
}

function cmdTakes(cueFile?: string): void {
  const cues = cueFile ? [cueByFile(cueFile)] : CUES;
  console.log("Takes (listen: afplay var/sfx/<cue>/<seed>.mp3)\n");
  for (const cue of cues) {
    const dir = cueDir(cue);
    if (!existsSync(dir)) continue;
    const destMp3 = join(destDir(cue), `${cue.file}.mp3`);
    const installedHash = existsSync(destMp3) ? sha256(destMp3) : "";
    console.log(`  ${cue.file}  window ${cue.window[0]}–${cue.window[1]}s`);
    for (const seed of [1, 2, 3, 4, 5, 6, 7, 8].filter((s) => existsSync(join(dir, `${s}.mp3`)))) {
      const mp3 = join(dir, `${seed}.mp3`);
      const final = Number(run("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", mp3]).split("\n")[0]);
      const sizeKb = Math.round(Number(run("stat", ["-f", "%z", mp3])) / 102.4) / 10;
      const truePeak = measureTruePeak(mp3);
      const [min, max] = cue.window;
      const inWindow = final >= min - 0.02 && final <= max + 0.02;
      const truePeakOk = Number.isFinite(truePeak) && truePeak <= -1;
      const tpk = Number.isFinite(truePeak) ? `${truePeak.toFixed(1)}` : "?";
      const installed = installedHash !== "" && sha256(mp3) === installedHash;
      console.log(
        `    seed ${seed}: ${final.toFixed(2)}s, ${sizeKb} KB, TPK ${tpk} dBTP` +
          `${inWindow ? "" : " [OUT OF WINDOW]"}${truePeakOk ? "" : " [TRUE PEAK]"}` +
          `${installed ? " (installed)" : ""}`,
      );
    }
  }
}

type Pick = { cue: Cue; seed: number };

function parsePicks(args: string[]): Pick[] {
  const picks: Pick[] = [];
  for (const raw of args) {
    const [file, seedStr] = raw.split("=");
    if (!file || !seedStr) throw new Error(`bad pick '${raw}' — expected <cue>=<seed>`);
    picks.push({ cue: cueByFile(file), seed: Number(seedStr) });
  }
  return picks;
}

function cmdAdopt(picks: Pick[], force: boolean, useBase: boolean): void {
  for (const { cue, seed } of picks) {
    const srcMp3 = join(cueDir(cue), `${seed}.mp3`);
    if (!existsSync(srcMp3)) throw new Error(`no take for ${cue.file} seed ${seed}`);
    const report = postProcess(cue, seed); // re-run to validate before install
    if (!report.ok) {
      const tpk = Number.isFinite(report.truePeak) ? `${report.truePeak.toFixed(1)} dBTP` : "unmeasurable true peak";
      const reasons = [
        report.lowLevel ? "low level" : "",
        !report.inWindow ? "out of window" : "",
        report.sizeKb > 120 ? "over 120 KB" : "",
        !report.truePeakOk ? `true peak ${tpk}` : "",
      ].filter(Boolean).join(", ");
      if (!force) {
        throw new Error(`${cue.file} seed ${seed}: ${reasons}; pass --force to install anyway`);
      }
      console.warn(`  ⚠ ${cue.file} seed ${seed}: ${reasons} — installing anyway (--force)`);
    }

    // ── install the file (anatomy or hub) ───────────────────────────────────
    const dir = destDir(cue);
    mkdirSync(dir, { recursive: true });
    const dest = join(dir, `${cue.file}.mp3`);
    copyFileSync(srcMp3, dest);
    const manifestSrc = `shared/audio/${cue.file}.mp3`;

    // ── manifest: src + license, drop placeholder ───────────────────────────
    const manifestPath = cue.dest === "hub"
      ? join(HUB_DIR, "assets.final.json")
      : join(ANATOMY_DIR, "assets.final.json");
    const manifest = readJson(manifestPath);
    const entry = manifest.assets[cue.id];
    if (!entry) throw new Error(`${cue.id} missing from ${manifestPath}`);
    delete entry.placeholder;
    entry.src = manifestSrc;
    entry.license = LICENSE_NAME;
    writeJson(manifestPath, manifest);

    // ── Silicon reuse (§2.3 rule 2: same files, same entries) ───────────────
    const siliconManifestPath = join(SILICON_DIR, "assets.final.json");
    const siliconManifest = readJson(siliconManifestPath);
    if (siliconManifest.assets[cue.id]) {
      mkdirSync(join(SILICON_DIR, "shared", "audio"), { recursive: true });
      copyFileSync(dest, join(SILICON_DIR, "shared", "audio", `${cue.file}.mp3`));
      const sEntry = siliconManifest.assets[cue.id];
      delete sEntry.placeholder;
      sEntry.src = manifestSrc;
      sEntry.license = LICENSE_NAME;
      writeJson(siliconManifestPath, siliconManifest);
    }

    // ── licence records (pack licenses.json; the hub records in-manifest) ──
    const licenceRow = {
      file: manifestSrc,
      type: "audio",
      source: MODEL_LABEL,
      author: "AI-generated with Stable Audio 3 Small SFX; sound direction by Snorre",
      license: LICENSE_NAME,
      url: LICENSE_URL,
      modified:
        `Generated ${new Date().toISOString().slice(0, 10)}; seed ${seed}; ` +
        "trimmed to window; 35 Hz HPF; -5 dBFS sample peak / <= -1 dBTP; 10 ms fade; 48 kHz mono; MP3 160 kbps",
      aiGenerated: true,
    };
    for (const packDir of cue.dest === "hub" ? [] : [ANATOMY_DIR, SILICON_DIR]) {
      const lp = join(packDir, "licenses.json");
      const licences = readJson(lp);
      licences.assets = (licences.assets ?? []).filter(
        (a: { file: string }) => a.file !== manifestSrc,
      );
      licences.assets.push(licenceRow);
      writeJson(lp, licences);
    }

    // ── prompt log row for the chosen take ─────────────────────────────────
    appendPromptLog([
      cue.id,
      useBase ? FLEET_KEY_BASE : FLEET_KEY,
      String(seed),
      `${cue.gen}`,
      "1",
      manifestSrc,
      "head/tail trim; 35 Hz HPF; window clamp; -5 dBFS / <= -1 dBTP; 10 ms fade; 48 kHz mono MP3 160k",
      "accepted",
      LICENSE_NAME,
    ]);

    const tpk = Number.isFinite(report.truePeak) ? `${report.truePeak.toFixed(1)}` : "?";
    console.log(
      `  ✓ ${cue.file} ← seed ${seed}: ${dest} (${report.final.toFixed(2)}s, ${report.sizeKb} KB, TPK ${tpk} dBTP)`,
    );
  }
}

async function cmdStatus(): Promise<void> {
  for (const key of [FLEET_KEY, FLEET_KEY_BASE]) {
    try {
      const s = await (await fetch(`${DAEMON}/status/${key}`)).json();
      console.log(`fleet ${key}: ${s.state}`);
    } catch {
      console.log(`fleet ${key}: daemon unreachable`);
    }
  }
  console.log("\nInstalled cues:");
  for (const cue of CUES) {
    const installed = existsSync(join(destDir(cue), `${cue.file}.mp3`));
    console.log(`  ${installed ? "✓" : "·"} ${cue.file}`);
  }
}

// ── arg parsing ───────────────────────────────────────────────────────────────

function main(): void {
  const args = process.argv.slice(2);
  const cmd = args.shift() ?? "status";
  const flag = (name: string): string | undefined => {
    const i = args.indexOf(`--${name}`);
    if (i === -1) return undefined;
    const v = args[i + 1];
    args.splice(i, 2);
    return v;
  };
  const baseOverride = flag("base");
  const seedsArg = flag("seeds");
  const seeds = seedsArg ? seedsArg.split(",").map(Number) : [1, 2, 3];
  const useBase = args.includes("--model") && args[args.indexOf("--model") + 1] === "base";
  if (useBase) args.splice(args.indexOf("--model"), 2);
  const force = args.includes("--force");
  if (force) args.splice(args.indexOf("--force"), 1);

  switch (cmd) {
    case "status":
      void cmdStatus();
      break;
    case "pilot":
      void cmdGenerate(PILOT, seedsArg ? seeds : [1, 2, 3, 4], useBase, baseOverride);
      break;
    case "batch": {
      const cuesArg = flag("cues");
      const cues = cuesArg ? cuesArg.split(",") : CUES.map((c) => c.file);
      void cmdGenerate(cues, seeds, useBase, baseOverride);
      break;
    }
    case "takes": {
      const cue = args.find((a) => !a.startsWith("--"));
      cmdTakes(cue);
      break;
    }
    case "adopt": {
      const picksArg = flag("picks");
      const cueFlag = flag("cue");
      const seedFlag = flag("seed");
      const picks = picksArg
        ? parsePicks(picksArg.split(","))
        : cueFlag && seedFlag
          ? [{ cue: cueByFile(cueFlag), seed: Number(seedFlag) }]
          : [];
      if (picks.length === 0) throw new Error("adopt needs --picks a=1,b=2 or --cue a --seed 1");
      cmdAdopt(picks, force, useBase);
      break;
    }
    default:
      throw new Error(`unknown command '${cmd}' (status|pilot|batch|takes|adopt)`);
  }
}

main();
