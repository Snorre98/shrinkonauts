import type { AssetManifest } from "../assets";
import { loadManifest } from "../assets";
import { err, ok, type Result } from "../core/result";
import { parseTheme } from "../pack";
import { parseJsonUrl } from "../pack/parse-common";
import { parseHubDocument } from "./parse";
import type { HubDocument, LoadedHubContent } from "./types";

export interface LoadHubOptions {
  /** Directory URL of the hub, for example `/hub/bathroom/`. */
  hubUrl: string;
  fetchImpl?: typeof fetch;
}

async function optionalManifest(
  url: string,
  fetchImpl: typeof fetch,
  warnings: string[],
  label: string,
): Promise<AssetManifest | null> {
  const result = await loadManifest(url, fetchImpl);
  if (!result.ok) {
    warnings.push(`${label} unavailable (${result.error}). Using the next provider.`);
    return null;
  }
  warnings.push(...result.value.warnings);
  return result.value.manifest;
}

export async function loadHubContent(
  options: LoadHubOptions,
): Promise<Result<LoadedHubContent>> {
  const fetchImpl = options.fetchImpl ?? fetch;
  const hubUrl = new URL(options.hubUrl, globalThis.location?.href);
  const warnings: string[] = [];

  const hubJson = await parseJsonUrl(
    new URL("hub.json", hubUrl).toString(),
    fetchImpl,
  );
  if (!hubJson.ok) return err(hubJson.error);
  const hubResult = parseHubDocument(hubJson.value);
  if (!hubResult.ok) return err(`hub.json: ${hubResult.error}`);
  const hub: HubDocument = hubResult.value;

  const themeJson = await parseJsonUrl(
    new URL(hub.theme, hubUrl).toString(),
    fetchImpl,
  );
  if (!themeJson.ok) return err(themeJson.error);
  const themeResult = parseTheme(themeJson.value);
  if (!themeResult.ok) return err(`${hub.theme}: ${themeResult.error}`);

  const finalManifest = hub.assetManifests.final
    ? await optionalManifest(
        new URL(hub.assetManifests.final, hubUrl).toString(),
        fetchImpl,
        warnings,
        "Hub final manifest",
      )
    : null;
  const placeholderManifest = hub.assetManifests.placeholder
    ? await optionalManifest(
        new URL(hub.assetManifests.placeholder, hubUrl).toString(),
        fetchImpl,
        warnings,
        "Hub placeholder manifest",
      )
    : null;

  return ok({
    hub,
    theme: themeResult.value,
    finalManifest,
    placeholderManifest,
    warnings,
  });
}
