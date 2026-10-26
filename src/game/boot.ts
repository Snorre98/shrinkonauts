import {
  createAssets,
  loadManifest,
  PlaceholderProvider,
  type AssetManifest,
  type AssetsModule,
  type PreloadPlan,
} from "../assets";
import { consoleLogger } from "../core/logger";
import {
  collectRoomAssetIds,
  collectThemeAssetIds,
  loadRoom,
  loadTheme,
  type RoomDocument,
  type ThemeDocument,
} from "../pack";
import { applyTheme, mountHud } from "../ui";
import { createGame, PLAYER_ASSET_IDS, RoomScene } from "../world";
import { parseAssetMode, modeLabel, type AssetMode } from "./asset-mode";

export interface BootOptions {
  parent?: string;
  uiRoot?: HTMLElement | null;
  search?: string;
}

export interface BootResult {
  game: ReturnType<typeof createGame>;
  assets: AssetsModule;
  plan: PreloadPlan;
  mode: AssetMode;
  room: RoomDocument;
  theme: ThemeDocument;
}

function contentUrl(file: string): string {
  const base = new URL(import.meta.env.BASE_URL, document.baseURI);
  return new URL(`content/dev/${file}`, base).toString();
}

function toError(value: unknown): Error {
  return value instanceof Error ? value : new Error(String(value));
}

function overrideLabel(source: string, mode: AssetMode): string {
  if (source === "pack" && mode === "fixture") {
    return "fixture";
  }
  return source;
}

async function loadOptionalManifest(
  url: string,
  warnings: string[],
): Promise<AssetManifest | null> {
  const result = await loadManifest(url);
  if (!result.ok) {
    warnings.push(
      `Final manifest unavailable (${result.error}). Using the next provider.`,
    );
    return null;
  }

  warnings.push(...result.value.warnings);
  return result.value.manifest;
}

export async function bootGame(options: BootOptions = {}): Promise<BootResult> {
  const uiRoot =
    options.uiRoot ?? document.getElementById("ui-root");
  if (!uiRoot) {
    throw new Error("BOOT_FAILED: #ui-root is missing from index.html");
  }

  const hud = mountHud(uiRoot);
  const warnings: string[] = [];

  try {
    const mode = parseAssetMode(
      options.search ?? window.location.search,
    );

    const themeResult = await loadTheme(contentUrl("theme.json"));
    if (!themeResult.ok) {
      throw new Error(themeResult.error);
    }
    const theme = themeResult.value;
    applyTheme(theme);

    const roomResult = await loadRoom(contentUrl("room.json"));
    if (!roomResult.ok) {
      throw new Error(roomResult.error);
    }
    const room = roomResult.value;
    document.title = `${room.title} — Shrinkonauts M0.1`;

    const finalManifest = await loadOptionalManifest(
      contentUrl("assets.final.json"),
      warnings,
    );

    let packManifest: AssetManifest | null = null;
    if (mode === "fixture") {
      const fixtureResult = await loadManifest(contentUrl("assets.fixture.json"));
      if (!fixtureResult.ok) {
        throw new Error(fixtureResult.error);
      }
      packManifest = fixtureResult.value.manifest;
      warnings.push(...fixtureResult.value.warnings);
    }

    const assets = createAssets({
      finalManifest,
      packManifest,
      placeholder: new PlaceholderProvider({
        palette: theme.palette,
        fonts: theme.fonts,
      }),
      logger: consoleLogger,
    });

    const badgeId = theme.ui.assets.badge;
    if (badgeId) {
      hud.setBadge(assets.image(badgeId));
    }

    const ids = [
      ...collectRoomAssetIds(room),
      ...collectThemeAssetIds(theme),
      ...Object.values(PLAYER_ASSET_IDS),
    ];
    const plan = assets.preload(ids);
    warnings.push(...plan.warnings);

    if (plan.missing.length > 0) {
      throw new Error(
        `ASSET_IDS_UNRESOLVED: ${plan.missing.join(", ")} — expected a known asset ID prefix and a resolved provider`,
      );
    }

    const validation = assets.validate(ids, finalManifest ?? undefined);
    for (const issue of validation.issues) {
      warnings.push(`${issue.code}: ${issue.message}`);
    }

    const overrides = plan.descriptors
      .filter((descriptor) => descriptor.source !== "placeholder")
      .map((descriptor) => ({
        id: descriptor.id,
        source: descriptor.source,
        label: overrideLabel(descriptor.source, mode),
      }));

    hud.update({
      roomTitle: room.title,
      roomId: room.id,
      mode,
      modeLabel: modeLabel(mode),
      total: plan.ids.length,
      placeholders: plan.placeholders.length,
      overrides,
      warnings: [...warnings],
    });

    const parent = options.parent ?? "game-root";
    if (!document.getElementById(parent)) {
      throw new Error(`BOOT_FAILED: #${parent} is missing from index.html`);
    }

    const scene = new RoomScene({
      room,
      theme,
      assets,
      plan,
      onWarning: (message) => {
        hud.warn(message);
      },
      onError: (error) => {
        hud.fatal(error);
      },
      onReady: () => {
        consoleLogger.debug(`room ready: ${room.id}`);
      },
    });

    const game = createGame(scene, {
      parent,
      backgroundColor: theme.palette.bg,
    });

    return { game, assets, plan, mode, room, theme };
  } catch (error) {
    hud.fatal(toError(error));
    throw error;
  }
}
