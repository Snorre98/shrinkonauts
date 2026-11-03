import { createHash } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  applyAdoption,
  describePlan,
  planAdoption,
} from "../scripts/cueforge-adopt";

const roots: string[] = [];

function sha256(bytes: Buffer): string {
  return createHash("sha256").update(bytes).digest("hex");
}

function writeJson(path: string, value: unknown): void {
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`);
}

function metrics(): Record<string, number> {
  return {
    sample_peak_dbfs: -5,
    true_peak_dbtp: -1.2,
    dc_offset: 0,
    flat_factor: 0,
    head_silence_ms: 1,
    tail_silence_ms: 2,
  };
}

type Fixture = {
  root: string;
  resultPath: string;
  audioPath: string;
  receiptPath: string;
  cueId: string;
  destination: "anatomy" | "hub";
  audioHash: string;
};

function fixture(cueId = "audio.cue.boot", destination: "anatomy" | "hub" = "anatomy"): Fixture {
  const root = mkdtempSync(join(tmpdir(), "cueforge-adopt-"));
  roots.push(root);
  const anatomy = join(root, "public/packs/anatomy-reflex");
  const silicon = join(root, "public/packs/silicon-reflex");
  const hub = join(root, "public/hub/bathroom");
  for (const directory of [anatomy, silicon, hub, join(root, "docs/audio")]) {
    mkdirSync(directory, { recursive: true });
  }
  const assetEntry = { type: "audio", placeholder: true };
  const anatomyAssets: Record<string, unknown> = {
    [cueId]: assetEntry,
    "audio.cue.other": { type: "audio", placeholder: true },
  };
  writeJson(join(anatomy, "assets.final.json"), {
    schemaVersion: "1.1",
    id: "anatomy-reflex.final",
    assets: anatomyAssets,
  });
  writeJson(join(silicon, "assets.final.json"), {
    schemaVersion: "1.1",
    id: "silicon-reflex.final",
    assets: { [cueId]: assetEntry, "audio.cue.other": { type: "audio", placeholder: true } },
  });
  writeJson(join(hub, "assets.final.json"), {
    schemaVersion: "1.0",
    id: "bathroom.final",
    assets: { [cueId]: assetEntry },
  });
  writeJson(join(anatomy, "licenses.json"), { schemaVersion: "1.0", assets: [] });
  writeJson(join(silicon, "licenses.json"), { schemaVersion: "1.0", assets: [] });
  writeFileSync(
    join(root, "docs/audio/sfx-prompt-log.csv"),
    "asset_id,model,seed,requested_duration_s,variations,chosen_file,post_processing,verdict,licence\n",
  );

  const audioBytes = Buffer.from("fake but stable mp3 bytes");
  const audioPath = join(root, "out", "cue.mp3");
  mkdirSync(join(root, "out"), { recursive: true });
  writeFileSync(audioPath, audioBytes);
  const audioHash = sha256(audioBytes);
  const receiptPath = join(root, "out", "cue.receipt.json");
  const receipt = {
    schema_version: 1,
    cueforge_version: "0.1.0",
    recipe: { id: "fixture", path: "recipes/fixture.yaml", hash: "recipe-hash" },
    sources: [
      {
        layer_id: "hum",
        origin: "generate",
        provider: "stable-audio",
        model: "stable-audio-3-small-sfx",
        seed: 11,
        path: ".cueforge/cache/sources/hum.wav",
        sha256: "a".repeat(64),
        duration_s: 1,
        sample_rate: 48000,
        channels: 1,
        metadata: { requested_duration_s: 1.0 },
      },
      {
        layer_id: "hiss",
        origin: "generate",
        provider: "stable-audio",
        model: "stable-audio-3-small-sfx",
        seed: 3,
        path: ".cueforge/cache/sources/hiss.wav",
        sha256: "b".repeat(64),
        duration_s: 1,
        sample_rate: 48000,
        channels: 1,
        metadata: { requested_duration_s: 1.0 },
      },
    ],
    tools: [],
    commands: [],
    outputs: [
      {
        path: audioPath,
        sha256: audioHash,
        codec: "mp3",
        sample_rate: 48000,
        channels: 1,
        duration_s: 0.8,
        size_bytes: audioBytes.length,
        metrics: metrics(),
      },
    ],
    metrics: metrics(),
    qc: { status: "pass", gates: [], exceptions: [] },
    warnings: [],
    created_at: "2026-11-03T12:00:00Z",
  };
  writeJson(receiptPath, receipt);
  const receiptHash = sha256(readFileSync(receiptPath));
  const resultPath = join(root, "out", "cue.result.json");
  writeJson(resultPath, {
    schema_version: 1,
    recipe: { id: "fixture", path: "recipes/fixture.yaml", hash: "recipe-hash" },
    outputs: [
      {
        path: audioPath,
        sha256: audioHash,
        codec: "mp3",
        duration_s: 0.8,
        size_bytes: audioBytes.length,
      },
    ],
    receipt: { path: receiptPath, sha256: receiptHash },
    metrics: metrics(),
    export: { adapter: "shrinkonauts", options: { cue: cueId, destination } },
    warnings: [],
    forced: false,
  });
  return { root, resultPath, audioPath, receiptPath, cueId, destination, audioHash };
}

afterEach(() => {
  while (roots.length > 0) {
    const root = roots.pop();
    if (root) rmSync(root, { recursive: true, force: true });
  }
});

describe("cueforge-adopt", () => {
  it("installs an anatomy cue into both packs and is idempotent", () => {
    const value = fixture();
    const first = planAdoption({ repoRoot: value.root, resultPath: value.resultPath });
    const audioFiles = first.files.filter((file) => file.kind === "audio");
    expect(audioFiles).toHaveLength(2);
    expect(audioFiles.every((file) => file.action === "create")).toBe(true);
    expect(first.promptRows).toHaveLength(2);
    expect(describePlan(first).join("\n")).toContain("create");

    const report = applyAdoption(first);
    expect(report.applied.length).toBeGreaterThan(0);
    expect(existsSync(join(value.root, "public/packs/anatomy-reflex/shared/audio/boot.mp3"))).toBe(true);
    expect(existsSync(join(value.root, "public/packs/silicon-reflex/shared/audio/boot.mp3"))).toBe(true);
    const anatomyManifest = JSON.parse(
      readFileSync(join(value.root, "public/packs/anatomy-reflex/assets.final.json"), "utf8"),
    );
    expect(anatomyManifest.assets[value.cueId]).toEqual({
      type: "audio",
      src: "shared/audio/boot.mp3",
      license: "Stability AI Community License",
    });
    const anatomyLicences = JSON.parse(
      readFileSync(join(value.root, "public/packs/anatomy-reflex/licenses.json"), "utf8"),
    );
    expect(anatomyLicences.assets).toHaveLength(1);
    expect(anatomyLicences.assets[0].file).toBe("shared/audio/boot.mp3");
    expect(anatomyLicences.assets[0].modified).toContain("sha256");
    const log = readFileSync(join(value.root, "docs/audio/sfx-prompt-log.csv"), "utf8").trim().split("\n");
    expect(log).toHaveLength(3);
    expect(log[1]).toContain("hum");
    expect(log[2]).toContain("hiss");

    const second = planAdoption({ repoRoot: value.root, resultPath: value.resultPath });
    expect(second.files.every((file) => file.action === "unchanged")).toBe(true);
    const secondReport = applyAdoption(second);
    expect(secondReport.applied).toHaveLength(0);
    expect(readFileSync(join(value.root, "docs/audio/sfx-prompt-log.csv"), "utf8").trim().split("\n")).toHaveLength(3);
  });

  it("rejects a conflicting target without overwrite", () => {
    const value = fixture();
    const plan = planAdoption({ repoRoot: value.root, resultPath: value.resultPath });
    applyAdoption(plan);
    writeFileSync(
      join(value.root, "public/packs/anatomy-reflex/shared/audio/boot.mp3"),
      "different bytes",
    );
    expect(() => planAdoption({ repoRoot: value.root, resultPath: value.resultPath })).toThrow(
      /target conflict/,
    );
    const overwrite = planAdoption({
      repoRoot: value.root,
      resultPath: value.resultPath,
      overwrite: true,
    });
    expect(
      overwrite.files.some(
        (file) => file.kind === "audio" && file.action === "replace",
      ),
    ).toBe(true);
    applyAdoption(overwrite);
  });

  it("dry-run plans without writing", () => {
    const value = fixture();
    const plan = planAdoption({
      repoRoot: value.root,
      resultPath: value.resultPath,
      dryRun: true,
    });
    expect(describePlan(plan).length).toBeGreaterThan(0);
    expect(existsSync(join(value.root, "public/packs/anatomy-reflex/shared/audio/boot.mp3"))).toBe(false);
  });

  it("refuses an unknown cue ID", () => {
    const value = fixture();
    const result = JSON.parse(readFileSync(value.resultPath, "utf8"));
    result.export.options.cue = "audio.cue.unknown";
    writeFileSync(value.resultPath, `${JSON.stringify(result, null, 2)}\n`);
    expect(() => planAdoption({ repoRoot: value.root, resultPath: value.resultPath })).toThrow(
      /refusing to invent a cue ID/,
    );
  });

  it("rejects a receipt that does not match the render result", () => {
    const value = fixture();
    const result = JSON.parse(readFileSync(value.resultPath, "utf8"));
    result.receipt.sha256 = "0".repeat(64);
    writeFileSync(value.resultPath, `${JSON.stringify(result, null, 2)}\n`);
    expect(() => planAdoption({ repoRoot: value.root, resultPath: value.resultPath })).toThrow(
      /receipt hash/,
    );
  });

  it("installs a hub cue without a Silicon mirror or licences file", () => {
    const value = fixture("audio.cue.hub.click", "hub");
    const plan = planAdoption({ repoRoot: value.root, resultPath: value.resultPath });
    applyAdoption(plan);
    expect(existsSync(join(value.root, "public/hub/bathroom/shared/audio/hub-click.mp3"))).toBe(true);
    const manifest = JSON.parse(
      readFileSync(join(value.root, "public/hub/bathroom/assets.final.json"), "utf8"),
    );
    expect(manifest.assets[value.cueId]).toEqual({
      type: "audio",
      src: "shared/audio/hub-click.mp3",
      license: "Stability AI Community License",
    });
    expect(existsSync(join(value.root, "public/packs/anatomy-reflex/shared/audio/hub-click.mp3"))).toBe(false);
  });
});
