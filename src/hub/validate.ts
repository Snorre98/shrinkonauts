import {
  createAssets,
  PlaceholderProvider,
  PLAYER_ASSET_IDS,
  type AssetManifest,
  type AssetsModule,
  type ValidationIssue,
} from "../assets";
import { collectThemeAssetIds } from "../pack";
import type { ThemeDocument } from "../pack";
import { collectHubAssetIds } from "./parse";
import type { HubDocument } from "./types";

export interface HubValidationInput {
  hub: HubDocument;
  theme: ThemeDocument;
  finalManifest: AssetManifest | null;
  packManifest: AssetManifest | null;
  fileExists: (src: string) => boolean;
}

export interface HubValidationResult {
  ok: boolean;
  ids: string[];
  placeholders: string[];
  issues: ValidationIssue[];
  warnings: string[];
}

function validateManifestFiles(
  assets: AssetsModule,
  ids: string[],
  fileExists: (src: string) => boolean,
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  for (const id of ids) {
    const asset = assets.resolveById(id);
    if (!asset?.src) continue;
    if (!fileExists(asset.src)) {
      issues.push({
        code: "ASSET_FILE_MISSING",
        id,
        message: `${id} points at a missing file (${asset.src})`,
      });
    }
  }
  return issues;
}

export function validateHub(input: HubValidationInput): HubValidationResult {
  const { hub, theme, finalManifest, packManifest, fileExists } = input;
  const ids = [
    ...collectHubAssetIds(hub),
    ...collectThemeAssetIds(theme),
    PLAYER_ASSET_IDS.p1,
  ];
  const assets = createAssets({
    finalManifest,
    packManifest,
    placeholder: new PlaceholderProvider({
      palette: theme.palette,
      fonts: theme.fonts,
    }),
  });
  const plan = assets.preload(ids);
  const issues: ValidationIssue[] = plan.missing.map((id) => ({
    code: "ASSET_ID_INVALID",
    id,
    message: `${id} does not use a recognised asset ID prefix`,
  }));
  issues.push(...assets.validate(ids, finalManifest ?? undefined).issues);
  issues.push(...validateManifestFiles(assets, plan.ids, fileExists));

  return {
    ok: issues.length === 0,
    ids: plan.ids,
    placeholders: plan.placeholders,
    issues,
    warnings: plan.warnings,
  };
}
