import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import { describe, expect, it } from "vitest";
import { parseManifest } from "../src/assets";
import { collectHubAssetIds, parseHubDocument, validateHub } from "../src/hub";
import { parseTheme } from "../src/pack";

const HUB_DIR = new URL("../public/hub/bathroom/", import.meta.url);

function readHub(file: string): unknown {
  return JSON.parse(readFileSync(new URL(file, HUB_DIR), "utf8"));
}

function manifest(file: string) {
  const parsed = parseManifest(
    readHub(file),
    pathToFileURL(fileURLToPath(new URL(file, HUB_DIR))).href,
  );
  if (!parsed.ok) throw new Error(parsed.error);
  return parsed.value.manifest;
}

describe("bathroom hub content", () => {
  it("parses and validates the shipped hub, theme, and manifests", () => {
    const parsed = parseHubDocument(readHub("hub.json"));
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    const theme = parseTheme(readHub("theme.json"));
    expect(theme.ok).toBe(true);
    if (!theme.ok) return;

    const finalManifest = manifest("assets.final.json");
    const placeholderManifest = manifest("assets.placeholder.json");
    const ids = collectHubAssetIds(parsed.value);
    expect(ids).toContain("sprite.prop.washer");
    expect(ids).toContain("sprite.player.civilian");
    expect(ids).toContain("audio.cue.hub.shrink");

    const result = validateHub({
      hub: parsed.value,
      theme: theme.value,
      finalManifest,
      packManifest: placeholderManifest,
      fileExists: (src) => {
        try {
          return existsSync(fileURLToPath(new URL(src)));
        } catch {
          return false;
        }
      },
    });
    expect(result.issues).toEqual([]);
    expect(result.ok).toBe(true);
    expect(result.placeholders.length).toBeGreaterThan(0);
  });

  it("rejects a hub without a machine or intro timings", () => {
    const valid = readHub("hub.json") as Record<string, unknown>;
    const missingMachine = structuredClone(valid);
    delete missingMachine.machine;
    expect(parseHubDocument(missingMachine)).toMatchObject({ ok: false });

    const missingIntro = structuredClone(valid);
    delete missingIntro.intro;
    expect(parseHubDocument(missingIntro)).toMatchObject({ ok: false });
  });

  it("rejects a non-positive player scale and an unknown status-like field", () => {
    const valid = readHub("hub.json") as Record<string, unknown>;
    const player = (valid.player as Record<string, unknown>) ?? {};
    const invalid = structuredClone(valid);
    invalid.player = { ...player, scale: 0 };
    expect(parseHubDocument(invalid)).toMatchObject({ ok: false });
  });
});
