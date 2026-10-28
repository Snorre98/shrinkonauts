import {
  createAssets,
  loadManifest,
  PlaceholderProvider,
  PLAYER_ASSET_IDS,
  type AssetManifest,
  type AssetsModule,
  type PreloadPlan,
} from "../assets";
import { createAudio, type AudioModule } from "../audio";
import { consoleLogger } from "../core/logger";
import {
  collectRoomAssetIds,
  collectThemeAssetIds,
  loadPackContent,
  type PackContent,
} from "../pack";
import { createSave, type SaveModule } from "../save";
import {
  applyTheme,
  mountGameUi,
  type GameUi,
  type GameUiDiagnostics,
} from "../ui";
import { createGame, RoomScene, type GameplayCue } from "../world";
import { parseAssetMode, modeLabel, type AssetMode } from "./asset-mode";
import {
  GameRuntime,
  type AudioPort,
} from "./runtime";

export interface BootOptions {
  parent?: string;
  uiRoot?: HTMLElement | null;
  search?: string;
}

export interface BootResult {
  game: ReturnType<typeof createGame>;
  runtime: GameRuntime;
  assets: AssetsModule;
  audio: AudioModule;
  save: SaveModule;
  plan: PreloadPlan;
  mode: AssetMode;
  content: PackContent;
}

function assetBase(): URL {
  return new URL(import.meta.env.BASE_URL, document.baseURI);
}

function packUrl(): URL {
  return new URL("packs/anatomy-reflex/", assetBase());
}

function syllabusBaseUrl(): URL {
  return new URL("syllabi/", assetBase());
}

function toError(value: unknown): Error {
  return value instanceof Error ? value : new Error(String(value));
}

function overrideLabel(source: string, mode: AssetMode): string {
  if (source === "pack" && mode === "fixture") return "fixture";
  return source;
}

function installAudioUnlock(audio: AudioModule): void {
  const unlock = (): void => {
    void audio.unlock();
  };
  window.addEventListener("keydown", unlock);
  window.addEventListener("pointerdown", unlock);
}

async function loadOptionalManifest(
  url: string,
  warnings: string[],
  label: string,
): Promise<AssetManifest | null> {
  const result = await loadManifest(url);
  if (!result.ok) {
    warnings.push(`${label} unavailable (${result.error}). Using the next provider.`);
    return null;
  }
  warnings.push(...result.value.warnings);
  return result.value.manifest;
}

function downloadEvidence(evidence: unknown): void {
  const blob = new Blob([`${JSON.stringify(evidence, null, 2)}\n`], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `shrinkonauts-evidence-${new Date()
    .toISOString()
    .replace(/[:.]/g, "-")}.json`;
  link.click();
  URL.revokeObjectURL(url);
}

function showFatal(root: HTMLElement, error: Error): void {
  const panel = document.createElement("div");
  panel.className = "hud__fatal";
  const heading = document.createElement("h2");
  heading.className = "hud__fatal-title";
  heading.textContent = "Boot failed";
  const message = document.createElement("pre");
  message.className = "hud__fatal-message";
  message.textContent = error.message;
  const hint = document.createElement("p");
  hint.className = "hud__fatal-hint";
  hint.textContent =
    "Check the pack under public/packs, the syllabus, and the asset manifests.";
  panel.append(heading, message, hint);
  root.replaceChildren(panel);
}

export async function bootGame(options: BootOptions = {}): Promise<BootResult> {
  const uiRoot = options.uiRoot ?? document.getElementById("ui-root");
  if (!uiRoot) {
    throw new Error("BOOT_FAILED: #ui-root is missing from index.html");
  }

  let ui: GameUi | null = null;

  try {
    const mode = parseAssetMode(options.search ?? window.location.search);
    const warnings: string[] = [];

    const loaded = await loadPackContent({
      packUrl: packUrl().toString(),
      syllabusBaseUrl: syllabusBaseUrl().toString(),
    });
    if (!loaded.ok) {
      throw new Error(loaded.error);
    }
    const content = loaded.value;
    warnings.push(...content.warnings);

    applyTheme(content.theme);
    document.title = `${content.pack.title} — Shrinkonauts M1`;

    const finalManifest = await loadOptionalManifest(
      new URL(content.pack.assetManifests.final ?? "assets.final.json", packUrl()).toString(),
      warnings,
      "Final manifest",
    );
    const placeholderManifest = await loadOptionalManifest(
      new URL(
        content.pack.assetManifests.placeholder ?? "assets.placeholder.json",
        packUrl(),
      ).toString(),
      warnings,
      "Placeholder manifest",
    );

    let fixtureManifest: AssetManifest | null = null;
    if (mode === "fixture") {
      fixtureManifest = await loadOptionalManifest(
        new URL("assets.fixture.json", packUrl()).toString(),
        warnings,
        "Fixture manifest",
      );
    }

    const assets = createAssets({
      finalManifest,
      packManifest: fixtureManifest ?? placeholderManifest,
      placeholder: new PlaceholderProvider({
        palette: content.theme.palette,
        fonts: content.theme.fonts,
      }),
      logger: consoleLogger,
    });

    const save = createSave();
    const audio = createAudio({
      assets,
      storage: save.audioStorage,
      logger: consoleLogger,
      onWarning: (message) => ui?.warn(message),
    });
    installAudioUnlock(audio);

    const ids = [
      ...Object.values(content.rooms).flatMap(collectRoomAssetIds),
      ...collectThemeAssetIds(content.theme),
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

    const diagnostics: GameUiDiagnostics = {
      modeLabel: modeLabel(mode),
      total: plan.ids.length,
      placeholders: plan.placeholders.length,
      overrides,
      warnings: [...warnings],
    };

    let runtime: GameRuntime | undefined;
    let roomScene: RoomScene | null = null;

    ui = mountGameUi(uiRoot, {
      badge: content.theme.ui.assets.badge
        ? assets.image(content.theme.ui.assets.badge)
        : undefined,
      diagnostics,
      callbacks: {
        onSurfaceAction: (surfaceId, action) =>
          runtime?.surfaceAction(surfaceId, action),
        onGateSubmit: (answer) => runtime?.submitGateAnswer(answer),
        onGateHint: () => runtime?.gateHint(),
        onCloseGate: () => runtime?.closeGate(),
        onToggleMap: () => runtime?.toggleMap(),
        onToggleLog: () => runtime?.toggleConceptLog(),
        onResume: () => runtime?.togglePause(),
        onEscape: () => runtime?.togglePause(),
        onResetPuzzle: () => runtime?.resetPuzzle(),
        onPuzzleHint: () => runtime?.puzzleHint(),
        onMute: () => runtime?.toggleMute(),
        onTextScale: (scale) => runtime?.setTextScale(scale),
        onToggleReducedMotion: () => runtime?.toggleReducedMotion(),
        onDebriefAnswer: (promptId, answer) =>
          runtime?.submitDebrief(promptId, answer),
        onDebriefFinish: () => runtime?.finishDebrief(),
        onExport: () => {
          if (runtime) downloadEvidence(runtime.exportEvidence());
        },
        onNewRun: () => runtime?.newRun(),
      },
    });
    ui.applySettings(save.settings);

    const audioPort: AudioPort = {
      play: (assetId) => audio.play(assetId),
      setMuted: (muted) => audio.setMuted(muted),
      get muted() {
        return audio.muted;
      },
    };

    const created = new GameRuntime({
      content,
      save,
      audio: audioPort,
      sessionId:
        globalThis.crypto?.randomUUID?.() ??
        `session-${Date.now().toString(36)}`,
      onCue: (cue) => {
        consoleLogger.debug(`[cue] ${cue}`);
      },
      onLevelChange: () => {
        roomScene?.scene.restart();
      },
    });
    runtime = created;

    ui.update(created.snapshot());
    created.subscribe((snapshot) => {
      ui?.update(snapshot);
    });
    created.start();

    const parent = options.parent ?? "game-root";
    if (!document.getElementById(parent)) {
      throw new Error(`BOOT_FAILED: #${parent} is missing from index.html`);
    }

    const warnedCues = new Set<GameplayCue>();
    const scene = new RoomScene({
      runtime: created,
      theme: content.theme,
      assets,
      plan,
      shouldIgnoreInput: () => {
        const active = document.activeElement;
        return (
          active instanceof HTMLInputElement ||
          active instanceof HTMLTextAreaElement ||
          active instanceof HTMLSelectElement ||
          (active instanceof HTMLElement && active.isContentEditable)
        );
      },
      onCue: (cue) => {
        if (typeof cue !== "string" || !cue) return;
        const typed = cue as GameplayCue;
        if (!warnedCues.has(typed)) {
          warnedCues.add(typed);
        }
        consoleLogger.debug(`[scene cue] ${cue}`);
      },
      onWarning: (message) => ui?.warn(message),
      onError: (error) => ui?.fatal(error),
      onReady: () => {
        consoleLogger.debug(`room ready: ${created.snapshot().roomId}`);
        const canvas = document.querySelector<HTMLCanvasElement>(
          `#${parent} canvas`,
        );
        if (canvas) {
          canvas.dataset.roomId = created.roomDocument.id;
          canvas.tabIndex = 0;
          canvas.setAttribute(
            "aria-label",
            "Shrinkonauts game canvas. Use the listed keyboard controls.",
          );
        }
      },
    });
    roomScene = scene;

    const game = createGame(scene, {
      parent,
      backgroundColor: content.theme.palette.bg,
    });

    return {
      game,
      runtime: created,
      assets,
      audio,
      save,
      plan,
      mode,
      content,
    };
  } catch (error) {
    const fatal = toError(error);
    if (ui) {
      ui.fatal(fatal);
    } else {
      showFatal(uiRoot, fatal);
    }
    throw fatal;
  }
}
