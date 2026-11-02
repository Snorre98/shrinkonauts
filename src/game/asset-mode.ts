export type AssetMode = "placeholder" | "fixture" | "final";

const MODES: readonly AssetMode[] = ["placeholder", "fixture", "final"];

/**
 * Reads `?assets=` from a location search string. Unknown values deliberately
 * fall back to the placeholder mode so a typo never leaves a blank screen.
 */
export function parseAssetMode(search: string): AssetMode {
  const value = new URLSearchParams(search).get("assets");
  if (value && MODES.includes(value as AssetMode)) {
    return value as AssetMode;
  }
  return "placeholder";
}

/**
 * The delivered hub uses final art for a plain `/` boot. An explicit
 * `?assets=placeholder` still wins so the procedural fallback stays
 * reviewable; unknown values keep the parser's safe placeholder behaviour.
 */
export function resolveAssetMode(search: string): AssetMode {
  return new URLSearchParams(search).has("assets")
    ? parseAssetMode(search)
    : "final";
}

export function isFixtureMode(mode: AssetMode): boolean {
  return mode === "fixture";
}

export function modeLabel(mode: AssetMode): string {
  switch (mode) {
    case "fixture":
      return "Fixture override";
    case "final":
      return "Final assets";
    default:
      return "Placeholder assets";
  }
}
