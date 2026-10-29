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
import { collectHubAssetIds, loadHubContent, type LoadedHubContent } from "../hub";
import {
  createMaterialCatalog,
  createPatternProvider,
  type MaterialCatalog,
  type PatternProvider,
} from "../materials";
import {
  catalogEntry,
  collectMaterialAssetIds,
  collectRoomAssetIds,
  collectRoomMaterialAssetIds,
  collectThemeAssetIds,
  loadPackCatalog,
  loadPackContent,
  type PackCatalog,
  type PackContent,
} from "../pack";
import { createSave, type SaveModule } from "../save";
import {
  applyTheme,
  applyUiMaterialStyles,
  clearUiMaterialStyles,
  mountGameUi,
  mountHubUi,
  resolveUiMaterialStyles,
  snapTextScale,
  type GameUi,
  type GameUiDiagnostics,
  type HubMode,
  type HubUi,
  type HubView,
} from "../ui";
import {
  createGame,
  HubScene,
  RoomScene,
  type GameplayCue,
} from "../world";
import {
  beginStart,
  canStart,
  createAppState,
  markError,
  markHub,
  markLaunching,
  markPlaying,
  selectMode,
  selectPack,
  selectedPack,
  type AppState,
} from "./app-state";
import { parseAssetMode, modeLabel, type AssetMode } from "./asset-mode";
import { GameRuntime, type AudioPort } from "./runtime";

export interface BootOptions {
  parent?: string;
  uiRoot?: HTMLElement | null;
  search?: string;
  fetchImpl?: typeof fetch;
}

export interface PackBundle {
  entryId: string;
  content: PackContent;
  assets: AssetsModule;
  plan: PreloadPlan;
  audio: AudioModule;
  runtime: GameRuntime;
  materials: MaterialCatalog;
  patterns: PatternProvider;
  warnings: string[];
}

function assetBase(): URL {
  return new URL(import.meta.env.BASE_URL, document.baseURI);
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

async function loadOptionalManifest(
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
    "Check the pack catalog, the bathroom hub content, the syllabus, and the asset manifests.";
  panel.append(heading, message, hint);
  root.replaceChildren(panel);
}

function sceneReady(
  create: (resolve: () => void, reject: (error: Error) => void) => void,
): Promise<void> {
  return new Promise((resolve, reject) => {
    create(resolve, reject);
  });
}

/**
 * M1.9 application shell.
 *
 * `GameRuntime` remains a pack/level runtime. This controller owns the
 * pre-game bathroom, pack selection, launch transition, and the swap between
 * the hub Phaser game and the gameplay Phaser game.
 */
export class AppController {
  private readonly parentId: string;
  private readonly uiRoot: HTMLElement;
  private readonly search: string;
  private readonly fetchImpl: typeof fetch;
  private readonly transition: HTMLElement;

  private saveData!: SaveModule;
  private catalogData!: PackCatalog;
  private hubContent!: LoadedHubContent;
  private hubAssets!: AssetsModule;
  private hubPlan!: PreloadPlan;
  private hubAudio: AudioModule | null = null;
  private activeAudio: AudioModule | null = null;
  private state: AppState | null = null;
  private mode: AssetMode = "placeholder";
  private warnings: string[] = [];

  private hubContainer: HTMLElement | null = null;
  private hubUi: HubUi | null = null;
  private hubScene: HubScene | null = null;
  private hubGame: ReturnType<typeof createGame> | null = null;

  private gameUiContainer: HTMLElement | null = null;
  private gameUi: GameUi | null = null;
  private gameInstance: ReturnType<typeof createGame> | null = null;
  private roomScene: RoomScene | null = null;
  private runtimeInstance: GameRuntime | null = null;
  private unsubscribe: (() => void) | null = null;
  private packContent: PackContent | null = null;
  private packAssets: AssetsModule | null = null;
  private packPlan: PreloadPlan | null = null;
  private packAudio: AudioModule | null = null;

  constructor(options: BootOptions = {}) {
    this.parentId = options.parent ?? "game-root";
    const uiRoot = options.uiRoot ?? document.getElementById("ui-root");
    if (!uiRoot) {
      throw new Error("BOOT_FAILED: #ui-root is missing from index.html");
    }
    this.uiRoot = uiRoot;
    this.search = options.search ?? window.location.search;
    this.fetchImpl = options.fetchImpl ?? fetch;

    this.transition = document.createElement("div");
    this.transition.className = "hub-transition";
    this.transition.dataset.visible = "false";
    document.body.append(this.transition);
  }

  get save(): SaveModule {
    return this.saveData;
  }

  get catalog(): PackCatalog {
    return this.catalogData;
  }

  get phase(): AppState["phase"] {
    return this.state?.phase ?? "boot";
  }

  get runtime(): GameRuntime | null {
    return this.runtimeInstance;
  }

  get game(): ReturnType<typeof createGame> | null {
    return this.gameInstance ?? this.hubGame;
  }

  get assets(): AssetsModule | null {
    return this.packAssets;
  }

  get audio(): AudioModule | null {
    return this.activeAudio;
  }

  get plan(): PreloadPlan | null {
    return this.packPlan;
  }

  get content(): PackContent | null {
    return this.packContent;
  }

  async boot(): Promise<void> {
    this.mode = parseAssetMode(this.search);
    this.saveData = createSave();

    const catalog = await loadPackCatalog(
      new URL("packs/index.json", assetBase()).toString(),
      this.fetchImpl,
    );
    if (!catalog.ok) throw new Error(catalog.error);
    this.catalogData = catalog.value;
    this.state = createAppState(this.catalogData);

    const hubUrl = new URL("hub/bathroom/", assetBase()).toString();
    const loaded = await loadHubContent({ hubUrl, fetchImpl: this.fetchImpl });
    if (!loaded.ok) throw new Error(loaded.error);
    this.hubContent = loaded.value;
    this.warnings = [...loaded.value.warnings];

    applyTheme(this.hubContent.theme);
    clearUiMaterialStyles();
    document.title = "Shrinkonauts — The Bathroom";

    this.hubAssets = createAssets({
      finalManifest: this.hubContent.finalManifest,
      packManifest: this.hubContent.placeholderManifest,
      placeholder: new PlaceholderProvider({
        palette: this.hubContent.theme.palette,
        fonts: this.hubContent.theme.fonts,
      }),
      logger: consoleLogger,
    });

    const hubIds = [
      ...collectHubAssetIds(this.hubContent.hub),
      ...collectThemeAssetIds(this.hubContent.theme),
      PLAYER_ASSET_IDS.p1,
    ];
    this.hubPlan = this.hubAssets.preload(hubIds);
    this.warnings.push(...this.hubPlan.warnings);
    if (this.hubPlan.missing.length > 0) {
      throw new Error(
        `HUB_ASSET_IDS_UNRESOLVED: ${this.hubPlan.missing.join(", ")}`,
      );
    }
    for (const issue of this.hubAssets.validate(
      hubIds,
      this.hubContent.finalManifest ?? undefined,
    ).issues) {
      this.warnings.push(`${issue.code}: ${issue.message}`);
    }

    this.ensureHubAudio();
    this.activeAudio = this.hubAudio;
    this.installAudioUnlock();
    this.installHubShortcuts();
    this.applySettings();

    await this.mountHub();
    this.state = markHub(this.state);
    this.refreshHub();

    const params = new URLSearchParams(this.search);
    const packParam = params.get("pack");
    const skipMenu =
      params.get("skipMenu") === "1" || params.get("menu") === "0";

    if (packParam) {
      const entry = catalogEntry(this.catalogData, packParam);
      if (!entry) {
        throw new Error(`PACK_NOT_FOUND: "${packParam}" is not in the catalog`);
      }
      if (entry.status === "available") {
        this.selectPack(packParam);
      } else {
        this.state = {
          ...this.state,
          selectedPackId: packParam,
          notice: `${entry.title} arrives with the M2 content pass.`,
        };
        this.refreshHub();
      }
    }

    if (skipMenu) {
      await this.startSelected({ resume: true, skipIntro: true });
    }
  }

  private ensureHubAudio(): void {
    if (this.hubAudio) return;
    this.hubAudio = createAudio({
      assets: this.hubAssets,
      storage: this.saveData.audioStorage,
      logger: consoleLogger,
      onWarning: (message) => this.warn(message),
    });
    this.hubAudio.setMuted(this.saveData.settings.audio.muted);
    this.hubAudio.setVolume(this.saveData.settings.audio.volume);
  }

  private installAudioUnlock(): void {
    const unlock = (): void => {
      void this.activeAudio?.unlock();
    };
    window.addEventListener("keydown", unlock);
    window.addEventListener("pointerdown", unlock);
  }

  private installHubShortcuts(): void {
    window.addEventListener("keydown", (event) => {
      if (this.phase !== "hub") return;
      const target = event.target;
      if (
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target instanceof HTMLSelectElement
      ) {
        return;
      }
      if (event.key.toLowerCase() === "m") {
        event.preventDefault();
        this.toggleMute();
      }
    });
  }

  private applySettings(): void {
    const settings = this.saveData.settings;
    const scale = snapTextScale(settings.accessibility.textScale);
    document.documentElement.style.setProperty(
      "--ui-font-scale",
      String(scale),
    );
    document.documentElement.dataset.textScale = String(scale);
    document.documentElement.dataset.reducedMotion = String(
      settings.accessibility.reducedMotion,
    );
    for (const audio of [this.hubAudio, this.packAudio]) {
      audio?.setMuted(settings.audio.muted);
      audio?.setVolume(settings.audio.volume);
    }
  }

  private refreshHub(): void {
    if (!this.state || !this.hubUi) return;
    const entry = selectedPack(this.state);
    const hasSave = entry ? this.saveData.hasRun(entry.id) : false;
    const start = canStart(this.state, hasSave);
    const packs = this.catalogData.packs.map((pack) => ({
      id: pack.id,
      title: pack.title,
      subtitle: pack.subtitle ?? null,
      description: pack.description ?? null,
      status: pack.status,
      online: pack.online,
      selected: pack.id === this.state?.selectedPackId,
      hasSave: this.saveData.hasRun(pack.id),
    }));
    const view: HubView = {
      phase:
        this.state.phase === "boot"
          ? "loading"
          : this.state.phase === "launching"
            ? "starting"
            : this.state.phase,
      title: this.hubContent.hub.title,
      subtitle:
        "The washing machine is a door. Choose a cycle, set the players, and start the spin.",
      packs,
      selectedPackId: this.state.selectedPackId,
      mode: this.state.mode,
      online: {
        available: false,
        reason:
          "Local co-op is ready. Online co-op arrives with the Cloudflare milestone (M4).",
      },
      startLabel: start.label,
      startDisabled: !start.allowed,
      startReason: start.reason,
      canStartNew: Boolean(
        hasSave && entry?.status === "available" && !this.state.busy,
      ),
      busy: this.state.busy,
      notice: this.state.notice,
      error: this.state.error,
      settings: this.saveData.settings,
      assetMode: modeLabel(this.mode),
    };
    this.hubUi.update(view);
    this.hubScene?.setSelection({
      packId: this.state.selectedPackId,
      mode: this.state.mode,
    });
  }

  selectPack(id: string): void {
    if (!this.state) return;
    const next = selectPack(this.state, id);
    if (next === this.state) return;
    this.state = next;
    this.hubAudio?.play(this.hubContent.hub.audio.click);
    this.refreshHub();
  }

  selectMode(mode: HubMode): void {
    if (!this.state) return;
    const next = selectMode(this.state, mode, false);
    if (next === this.state) {
      if (mode === "online") {
        this.state = {
          ...this.state,
          notice: "Online co-op arrives with the Cloudflare milestone (M4).",
        };
        this.refreshHub();
      }
      return;
    }
    this.state = next;
    this.hubAudio?.play(this.hubContent.hub.audio.click);
    this.refreshHub();
  }

  toggleMute(): void {
    const muted = !this.saveData.settings.audio.muted;
    this.saveData.updateAudio({ muted });
    this.activeAudio?.setMuted(muted);
    this.refreshHub();
  }

  setTextScale(scale: number): void {
    this.saveData.updateAccessibility({ textScale: scale });
    this.applySettings();
    this.refreshHub();
  }

  toggleReducedMotion(): void {
    this.saveData.updateAccessibility({
      reducedMotion: !this.saveData.settings.accessibility.reducedMotion,
    });
    this.applySettings();
    this.hubScene?.setReducedMotion(
      this.saveData.settings.accessibility.reducedMotion,
    );
    this.refreshHub();
  }

  private async mountHub(): Promise<void> {
    if (!this.state) return;
    this.ensureHubAudio();
    this.activeAudio = this.hubAudio;

    this.hubContainer?.remove();
    this.hubContainer = document.createElement("div");
    this.hubContainer.className = "hub-root";
    this.uiRoot.replaceChildren(this.hubContainer);
    this.hubUi = mountHubUi(this.hubContainer, {
      callbacks: {
        onSelectPack: (id) => this.selectPack(id),
        onModeChange: (mode) => this.selectMode(mode),
        onStart: () => {
          void this.startSelected({ resume: true });
        },
        onNewCycle: () => {
          void this.startSelected({ resume: false });
        },
        onMute: () => this.toggleMute(),
        onTextScale: (scale) => this.setTextScale(scale),
        onToggleReducedMotion: () => this.toggleReducedMotion(),
      },
    });
    this.refreshHub();

    await this.mountHubScene();
    this.hubScene?.setReducedMotion(
      this.saveData.settings.accessibility.reducedMotion,
    );
    this.refreshHub();
    this.hubUi.setVisible(true);
    this.hubUi.focus();
  }

  private mountHubScene(): Promise<void> {
    this.hubGame?.destroy(true);
    this.hubGame = null;
    this.hubScene = null;

    return sceneReady((resolve, reject) => {
      const scene = new HubScene({
        hub: this.hubContent.hub,
        theme: this.hubContent.theme,
        assets: this.hubAssets,
        plan: this.hubPlan,
        onReady: resolve,
        onWarning: (message) => this.warn(message),
        onError: reject,
        onCue: (cue) => {
          this.hubAudio?.play(cue);
        },
        isReducedMotion: () =>
          this.saveData.settings.accessibility.reducedMotion,
      });
      this.hubScene = scene;
      this.hubGame = createGame(scene, {
        parent: this.parentId,
        backgroundColor: this.hubContent.theme.palette.bg,
      });
      const canvas = document.querySelector<HTMLCanvasElement>(
        `#${this.parentId} canvas`,
      );
      if (canvas) {
        canvas.dataset.hubId = this.hubContent.hub.id;
        canvas.tabIndex = 0;
        canvas.setAttribute(
          "aria-label",
          "Shrinkonauts bathroom. Use the washing machine menu to start a cycle.",
        );
      }
    });
  }

  private async startSelected(options: {
    resume: boolean;
    skipIntro?: boolean;
  }): Promise<void> {
    if (!this.state || this.state.busy) return;
    const entry = selectedPack(this.state);
    if (!entry || entry.status !== "available") return;
    if (this.state.mode === "online") {
      this.state = {
        ...this.state,
        notice: "Online co-op arrives with the Cloudflare milestone (M4).",
      };
      this.refreshHub();
      return;
    }

    const skipIntro = options.skipIntro === true;
    this.state = beginStart(this.state);
    this.refreshHub();
    this.hubUi?.setVisible(false);
    this.hubAudio?.play(this.hubContent.hub.audio.click);

    let skipButton: HTMLButtonElement | null = null;
    let skipKey: ((event: KeyboardEvent) => void) | null = null;
    let bundle: PackBundle | null = null;

    if (!skipIntro) {
      skipButton = document.createElement("button");
      skipButton.type = "button";
      skipButton.className = "hub-skip";
      skipButton.textContent = "Skip launch";
      skipButton.addEventListener("click", () => this.hubScene?.skipLaunch());
      document.body.append(skipButton);
      window.setTimeout(() => {
        if (skipButton?.isConnected) skipButton.focus();
      }, 120);
      skipKey = (event: KeyboardEvent) => {
        if (
          event.key === "Escape" ||
          event.key === " " ||
          event.key === "Enter"
        ) {
          event.preventDefault();
          this.hubScene?.skipLaunch();
        }
      };
      window.addEventListener("keydown", skipKey);
    }

    try {
      const launch = skipIntro
        ? Promise.resolve()
        : this.hubScene?.playLaunch({
            mode: this.state.mode === "solo" ? "solo" : "local",
            reducedMotion: this.saveData.settings.accessibility.reducedMotion,
          }) ?? Promise.resolve();

      const bundlePromise = this.preparePack(entry.id, options.resume);
      [bundle] = await Promise.all([bundlePromise, launch]);
      this.state = markLaunching(this.state);
      this.refreshHub();
      await this.transitionToRoom(bundle, skipIntro);
    } catch (error) {
      bundle?.audio.dispose();
      this.hubScene?.skipLaunch();
      this.recoverToHub(toError(error));
    } finally {
      skipButton?.remove();
      if (skipKey) window.removeEventListener("keydown", skipKey);
      // The launch button was focused and then removed. Re-focus the live
      // room canvas so the shared keyboard controls keep working.
      document
        .querySelector<HTMLCanvasElement>(`#${this.parentId} canvas[data-room-id]`)
        ?.focus({ preventScroll: true });
    }
  }

  private async preparePack(
    packId: string,
    resume: boolean,
  ): Promise<PackBundle> {
    const entry = catalogEntry(this.catalogData, packId);
    if (!entry) throw new Error(`PACK_NOT_FOUND: ${packId}`);
    const packUrl = new URL(`packs/${entry.path}`, assetBase()).toString();
    const loaded = await loadPackContent({
      packUrl,
      syllabusBaseUrl: syllabusBaseUrl().toString(),
      fetchImpl: this.fetchImpl,
    });
    if (!loaded.ok) throw new Error(loaded.error);
    const content = loaded.value;
    const warnings = [...content.warnings];

    const finalManifest = await loadOptionalManifest(
      new URL(
        content.pack.assetManifests.final ?? "assets.final.json",
        packUrl,
      ).toString(),
      this.fetchImpl,
      warnings,
      "Final manifest",
    );
    const placeholderManifest = await loadOptionalManifest(
      new URL(
        content.pack.assetManifests.placeholder ?? "assets.placeholder.json",
        packUrl,
      ).toString(),
      this.fetchImpl,
      warnings,
      "Placeholder manifest",
    );
    let fixtureManifest: AssetManifest | null = null;
    if (this.mode === "fixture") {
      fixtureManifest = await loadOptionalManifest(
        new URL("assets.fixture.json", packUrl).toString(),
        this.fetchImpl,
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

    const materials = createMaterialCatalog(content.materials);
    const patterns = createPatternProvider({ assets });

    const ids = [
      ...Object.values(content.rooms).flatMap(collectRoomAssetIds),
      ...Object.values(content.rooms).flatMap(collectRoomMaterialAssetIds),
      ...collectMaterialAssetIds(content.materials),
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
    for (const issue of assets.validate(ids, finalManifest ?? undefined).issues) {
      warnings.push(`${issue.code}: ${issue.message}`);
    }

    const audio = createAudio({
      assets,
      storage: this.saveData.audioStorage,
      logger: consoleLogger,
      onWarning: (message) => this.warn(message),
    });
    audio.setMuted(this.saveData.settings.audio.muted);
    audio.setVolume(this.saveData.settings.audio.volume);

    try {
      const audioPort: AudioPort = {
        play: (assetId) => audio.play(assetId),
        setMuted: (muted) => audio.setMuted(muted),
        get muted() {
          return audio.muted;
        },
      };
      const runtime = new GameRuntime({
        content,
        save: this.saveData,
        audio: audioPort,
        sessionId:
          globalThis.crypto?.randomUUID?.() ??
          `session-${Date.now().toString(36)}`,
        onCue: (cue) => {
          consoleLogger.debug(`[cue] ${cue}`);
        },
        onLevelChange: (levelId) => {
          consoleLogger.debug(`[level change] ${levelId} restart`);
          this.roomScene?.scene.restart();
        },
      });
      runtime.start({
        resume,
        activeP2: this.state?.mode === "local",
      });
      return {
        entryId: entry.id,
        content,
        assets,
        plan,
        audio,
        runtime,
        materials,
        patterns,
        warnings,
      };
    } catch (error) {
      audio.dispose();
      throw error;
    }
  }

  private async transitionToRoom(
    bundle: PackBundle,
    skipIntro: boolean,
  ): Promise<void> {
    await this.setTransition(true, skipIntro);
    this.destroyHub();
    this.hubAudio?.dispose();
    this.hubAudio = null;

    applyTheme(bundle.content.theme);
    document.title = `${bundle.content.pack.title} — Shrinkonauts`;
    this.applySettings();

    const uiMaterials = resolveUiMaterialStyles({
      theme: bundle.content.theme,
      catalog: bundle.materials,
      patterns: bundle.patterns,
      reducedMotion: this.saveData.settings.accessibility.reducedMotion,
    });
    applyUiMaterialStyles(uiMaterials.styles);
    for (const warning of uiMaterials.warnings) this.warn(warning);

    this.packContent = bundle.content;
    this.packAssets = bundle.assets;
    this.packPlan = bundle.plan;
    this.packAudio = bundle.audio;
    this.activeAudio = bundle.audio;

    this.gameUiContainer?.remove();
    this.gameUiContainer = document.createElement("div");
    this.gameUiContainer.className = "game-ui-root";
    this.uiRoot.replaceChildren(this.gameUiContainer);

    const diagnostics = this.diagnosticsFor(bundle);
    this.gameUi = mountGameUi(this.gameUiContainer, {
      badge: bundle.content.theme.ui.assets.badge
        ? bundle.assets.image(bundle.content.theme.ui.assets.badge)
        : undefined,
      diagnostics,
      callbacks: {
        onSurfaceAction: (surfaceId, action) =>
          bundle.runtime.surfaceAction(surfaceId, action),
        onGateSubmit: (answer) => bundle.runtime.submitGateAnswer(answer),
        onGateHint: () => bundle.runtime.gateHint(),
        onCloseGate: () => bundle.runtime.closeGate(),
        onToggleMap: () => bundle.runtime.toggleMap(),
        onToggleLog: () => bundle.runtime.toggleConceptLog(),
        onResume: () => bundle.runtime.togglePause(),
        onEscape: () => bundle.runtime.togglePause(),
        onResetPuzzle: () => bundle.runtime.resetPuzzle(),
        onPuzzleHint: () => bundle.runtime.puzzleHint(),
        onMute: () => bundle.runtime.toggleMute(),
        onTextScale: (scale) => bundle.runtime.setTextScale(scale),
        onToggleReducedMotion: () => bundle.runtime.toggleReducedMotion(),
        onDebriefAnswer: (promptId, answer) =>
          bundle.runtime.submitDebrief(promptId, answer),
        onDebriefFinish: () => bundle.runtime.finishDebrief(),
        onExport: () => downloadEvidence(bundle.runtime.exportEvidence()),
        onNewRun: () =>
          bundle.runtime.newRun({
            activeP2: this.state?.mode === "local",
          }),
        onExitToHub: () => {
          void this.returnToHub();
        },
      },
    });
    this.gameUi.applySettings(this.saveData.settings);
    this.gameUi.update(bundle.runtime.snapshot());
    this.unsubscribe = bundle.runtime.subscribe((snapshot) => {
      this.gameUi?.update(snapshot);
    });

    this.runtimeInstance = bundle.runtime;
    await this.mountRoomScene(bundle);
    this.state = markPlaying(this.state!);
    this.refreshHub();
    await this.setTransition(false, skipIntro);
    const canvas = document.querySelector<HTMLCanvasElement>(
      `#${this.parentId} canvas`,
    );
    canvas?.focus();
  }

  private diagnosticsFor(bundle: PackBundle): GameUiDiagnostics {
    const overrides = bundle.plan.descriptors
      .filter((descriptor) => descriptor.source !== "placeholder")
      .map((descriptor) => ({
        id: descriptor.id,
        source: descriptor.source,
        label: overrideLabel(descriptor.source, this.mode),
      }));
    return {
      modeLabel: modeLabel(this.mode),
      total: bundle.plan.ids.length,
      placeholders: bundle.plan.placeholders.length,
      overrides,
      warnings: [...this.warnings, ...bundle.warnings],
    };
  }

  private mountRoomScene(bundle: PackBundle): Promise<void> {
    return sceneReady((resolve, reject) => {
      const warnedCues = new Set<GameplayCue>();
      const scene = new RoomScene({
        runtime: bundle.runtime,
        theme: bundle.content.theme,
        assets: bundle.assets,
        plan: bundle.plan,
        materials: bundle.materials,
        patterns: bundle.patterns,
        isReducedMotion: () =>
          this.saveData.settings.accessibility.reducedMotion,
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
        onWarning: (message) => this.warn(message),
        onError: (error) => {
          consoleLogger.error(`[room error] ${error.message}`, error.stack);
          reject(error);
        },
        onReady: () => {
          const canvas = document.querySelector<HTMLCanvasElement>(
            `#${this.parentId} canvas`,
          );
          consoleLogger.debug(
            `[room ready] ${bundle.runtime.roomDocument.id}`,
          );
          if (canvas) {
            canvas.dataset.roomId = bundle.runtime.roomDocument.id;
            canvas.tabIndex = 0;
            canvas.setAttribute(
              "aria-label",
              "Shrinkonauts game canvas. Use the listed keyboard controls.",
            );
            // Starting from the hub leaves focus on a removed button. Focus
            // the game surface so shared keyboard controls work immediately.
            canvas.focus({ preventScroll: true });
          }
          resolve();
        },
      });
      this.roomScene = scene;
      this.gameInstance = createGame(scene, {
        parent: this.parentId,
        backgroundColor: bundle.content.theme.palette.bg,
      });
    });
  }

  private destroyRoom(): void {
    this.unsubscribe?.();
    this.unsubscribe = null;
    this.gameUiContainer?.remove();
    this.gameUiContainer = null;
    this.gameUi = null;
    this.gameInstance?.destroy(true);
    this.gameInstance = null;
    this.roomScene = null;
    this.runtimeInstance = null;
    this.packContent = null;
    this.packAssets = null;
    this.packPlan = null;
    const wasActivePack = this.activeAudio === this.packAudio;
    this.packAudio?.dispose();
    this.packAudio = null;
    if (wasActivePack) this.activeAudio = null;
  }

  private destroyHub(): void {
    this.hubUi?.destroy();
    this.hubUi = null;
    this.hubContainer?.remove();
    this.hubContainer = null;
    this.hubGame?.destroy(true);
    this.hubGame = null;
    this.hubScene = null;
  }

  async returnToHub(): Promise<void> {
    if (!this.state || this.state.phase === "hub" || this.state.busy) return;
    await this.setTransition(true, false);
    this.destroyRoom();
    applyTheme(this.hubContent.theme);
    clearUiMaterialStyles();
    document.title = "Shrinkonauts — The Bathroom";
    this.applySettings();
    this.state = markHub(this.state, "Back in the bathroom.");
    await this.mountHub();
    this.refreshHub();
    await this.setTransition(false, false);
  }

  private recoverToHub(error: Error): void {
    this.warn(error.message);
    void this.setTransition(false, true);
    this.destroyRoom();
    applyTheme(this.hubContent.theme);
    clearUiMaterialStyles();
    document.title = "Shrinkonauts — The Bathroom";
    this.ensureHubAudio();
    this.activeAudio = this.hubAudio;
    this.applySettings();
    this.state = markError(this.state ?? createAppState(this.catalogData), error.message);
    if (!this.hubUi || !this.hubGame) {
      void this.mountHub().then(() => {
        this.refreshHub();
        this.setTransition(false, true);
      });
      return;
    }
    this.hubUi.setVisible(true);
    this.refreshHub();
    this.hubUi.focus();
  }

  private async setTransition(
    visible: boolean,
    skipAnimation: boolean,
  ): Promise<void> {
    this.transition.dataset.visible = String(visible);
    if (skipAnimation || this.saveData.settings.accessibility.reducedMotion) {
      return;
    }
    await new Promise<void>((resolve) => {
      window.setTimeout(resolve, 230);
    });
  }

  private warn(message: string): void {
    this.warnings.push(message);
    consoleLogger.warn(message);
  }
}

export type BootResult = AppController;

export async function bootApp(options: BootOptions = {}): Promise<AppController> {
  const uiRoot = options.uiRoot ?? document.getElementById("ui-root");
  try {
    const app = new AppController(options);
    await app.boot();
    return app;
  } catch (error) {
    const fatal = toError(error);
    if (uiRoot) showFatal(uiRoot, fatal);
    throw fatal;
  }
}

/** Backwards-compatible alias for callers and tests that used the M1 entry point. */
export const bootGame = bootApp;
