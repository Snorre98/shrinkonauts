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
