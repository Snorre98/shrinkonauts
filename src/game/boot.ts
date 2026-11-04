import {
  createAssets,
  loadManifest,
  PlaceholderProvider,
  PLAYER_ANIMATION_ASSET_IDS,
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
  collectLevelBlueprintAssetIds,
  collectMaterialAssetIds,
  collectRoomAssetIds,
  collectRoomMaterialAssetIds,
  collectThemeAssetIds,
  isAssetId,
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
  type HubControllerSlotView,
  type HubControllerView,
  type HubMode,
  type HubUi,
  type HubView,
  type HostRunOverlayView,
  type RuntimeSnapshot,
} from "../ui";
import {
  createGame,
  HubScene,
  InputArbiter,
  KeyboardIntentSource,
  RoomScene,
  phoneSlotsForPlan,
  type GameplayCue,
  type InputPlan,
  type PlayerSlot,
} from "../world";
import {
  beginStart,
  canStart,
  createAppState,
  markError,
  markHub,
  markLaunching,
  markPlaying,
  phoneStartGate,
  resetInputPlan,
  selectMode,
  selectPack,
  selectedPack,
  setInputPlan,
  type AppState,
  type ControllerGateInput,
} from "./app-state";
import {
  modeLabel,
  resolveAssetMode,
  type AssetMode,
} from "./asset-mode";
import type {
  HostRunError,
  HostRunFactory,
  HostRunPort,
  HostRunSlotStatus,
  HostRunView,
} from "./host-run-port";
import { GameRuntime, type AudioPort } from "./runtime";

export interface BootOptions {
  parent?: string;
  uiRoot?: HTMLElement | null;
  search?: string;
  fetchImpl?: typeof fetch;
  inputPlan?: InputPlan;
  roomCode?: string;
  buildId?: string;
  hostRunFactory?: HostRunFactory;
  controllerUrlFor?: (room: string, slot: PlayerSlot) => string;
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

function hubSlotStatus(
  status: HostRunSlotStatus | undefined,
  error: boolean,
): HubControllerSlotView["status"] {
  if (error) return "error";
  switch (status) {
    case "connected":
      return "connected";
    case "ready":
      return "ready";
    case "closed":
      return "closed";
    case "keyboard":
      return "waiting";
    default:
      return "waiting";
  }
}

function hubSlotStatusLabel(
  status: HubControllerSlotView["status"],
): string {
  switch (status) {
    case "connected":
      return "Connected";
    case "ready":
      return "Ready";
    case "closed":
      return "Keyboard";
    case "error":
      return "Error";
    default:
      return "Waiting";
  }
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
  private readonly inputPlanOption: InputPlan | null;
  private readonly roomCodeOption: string | null;
  private readonly buildId: string;
  private readonly hostRunFactory?: HostRunFactory;
  private readonly controllerUrlFor?: (
    room: string,
    slot: PlayerSlot,
  ) => string;

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
  private hostRun: HostRunPort | null = null;
  private hostRunView: HostRunView | null = null;
  private hostRoomCode: string | null = null;
  private hostPlan: InputPlan | null = null;
  private hostRunError: HostRunError | null = null;
  private hostRunStartAttempted = false;
  private hostGeneration = 0;

  constructor(options: BootOptions = {}) {
    this.parentId = options.parent ?? "game-root";
    const uiRoot = options.uiRoot ?? document.getElementById("ui-root");
    if (!uiRoot) {
      throw new Error("BOOT_FAILED: #ui-root is missing from index.html");
    }
    this.uiRoot = uiRoot;
    this.search = options.search ?? window.location.search;
    this.fetchImpl = options.fetchImpl ?? fetch;
    this.inputPlanOption = options.inputPlan ?? null;
    this.roomCodeOption = options.roomCode ?? null;
    this.buildId = options.buildId?.trim() || "dev";
    this.hostRunFactory = options.hostRunFactory;
    this.controllerUrlFor = options.controllerUrlFor;

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

  get controllerSession(): HostRunPort | null {
    return this.hostRun;
  }

  get controllerView(): HostRunView | null {
    return this.hostRunView;
  }

  get controllerRoomCode(): string | null {
    return this.hostRoomCode;
  }

  setInputPlan(plan: InputPlan): void {
    if (!this.state || this.state.phase !== "hub") return;
    this.applyInputPlan(plan);
  }

  fallbackHostSlot(slot: PlayerSlot): boolean {
    return this.hostRun?.fallbackToKeyboard(slot) ?? false;
  }

  resumeHostRun(): boolean {
    const run = this.hostRun;
    if (!run) return false;
    if (run.view.state === "controllers-ready") return run.start();
    return run.resume();
  }

  endHostRun(): void {
    this.hostRun?.end();
    this.syncHostRunUi();
  }

  async boot(): Promise<void> {
    this.mode = resolveAssetMode(this.search);
    this.saveData = createSave();

    const catalog = await loadPackCatalog(
      new URL("packs/index.json", assetBase()).toString(),
      this.fetchImpl,
    );
    if (!catalog.ok) throw new Error(catalog.error);
    this.catalogData = catalog.value;
    this.state = createAppState(this.catalogData);
    if (this.inputPlanOption) {
      this.state = setInputPlan(this.state, this.inputPlanOption);
    }

    const hubUrl = new URL("hub/bathroom/", assetBase()).toString();
    const loaded = await loadHubContent({ hubUrl, fetchImpl: this.fetchImpl });
    if (!loaded.ok) throw new Error(loaded.error);
    this.hubContent = loaded.value;
    this.warnings = [...loaded.value.warnings];

    applyTheme(this.hubContent.theme);
    clearUiMaterialStyles();
    document.title = "Shrinkonauts — The Bathroom";

    const hubFinalManifest =
      this.mode === "placeholder" ? null : this.hubContent.finalManifest;
    this.hubAssets = createAssets({
      finalManifest: hubFinalManifest,
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
      hubFinalManifest ?? undefined,
    ).issues) {
      this.warnings.push(`${issue.code}: ${issue.message}`);
    }

    this.ensureHubAudio();
    this.activeAudio = this.hubAudio;
    this.installAudioUnlock();
    this.installHubShortcuts();
    this.installHostVisibility();
    this.applySettings();

    await this.mountHub();
    this.state = markHub(this.state);
    this.refreshHub();
    if (phoneSlotsForPlan(this.state.inputPlan).length > 0) {
      void this.ensureHostRun(this.state.inputPlan);
    }

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
      fetchImpl: this.fetchImpl,
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

  private installHostVisibility(): void {
    document.addEventListener("visibilitychange", () => {
      const run = this.hostRun;
      if (!run || this.phase !== "playing") return;
      if (document.visibilityState === "hidden") {
        run.pause("host-hidden");
      } else if (
        run.view.state === "paused" &&
        run.view.pausedReason === "host-hidden"
      ) {
        run.resume();
      }
      this.syncHostRunUi();
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
    const gate = phoneStartGate(
      this.state.inputPlan,
      this.controllerGateInput(),
    );
    const start = canStart(this.state, hasSave, gate);
    const packs = this.catalogData.packs.map((pack) => {
      const iconId = this.hubContent.theme.ui.assets[pack.id];
      const icon = iconId ? this.hubAssets.image(iconId) : undefined;
      return {
        id: pack.id,
        title: pack.title,
        subtitle: pack.subtitle ?? null,
        description: pack.description ?? null,
        status: pack.status,
        selected: pack.id === this.state?.selectedPackId,
        hasSave: this.saveData.hasRun(pack.id),
        ...(icon && icon.source !== "placeholder" && icon.src
          ? { iconSrc: icon.src }
          : {}),
      };
    });
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
      inputPlan: {
        p1: this.state.inputPlan.p1,
        p2: this.state.inputPlan.p2,
      },
      controller: this.hubControllerView(),
      startLabel: start.label,
      startDisabled: !start.allowed,
      startReason: start.reason,
      canStartNew: Boolean(
        hasSave &&
          entry?.status === "available" &&
          !this.state.busy &&
          start.allowed,
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

  private controllerGateInput(): ControllerGateInput {
    return {
      state: this.hostRunView?.state ?? null,
      missingSlots:
        this.hostRunView?.missingSlots ??
        phoneSlotsForPlan(
          this.state?.inputPlan ?? { p1: "keyboard", p2: "keyboard" },
        ),
      error:
        this.hostRunError?.message ??
        this.hostRunView?.error?.message ??
        null,
    };
  }

  private hubControllerView(): HubControllerView | null {
    if (!this.state) return null;
    const phoneSlots = phoneSlotsForPlan(this.state.inputPlan);
    if (phoneSlots.length === 0) return null;

    const view = this.hostRunView;
    const error = this.hostRunError ?? view?.error ?? null;
    const roomCode = this.hostRoomCode ?? "";
    const slots: HubControllerSlotView[] = phoneSlots.map((slot) => {
      const status = hubSlotStatus(view?.slots[slot].status, Boolean(error));
      let url = "";
      if (roomCode && this.controllerUrlFor) {
        try {
          url = this.controllerUrlFor(roomCode, slot);
        } catch {
          url = "";
        }
      }
      return {
        slot,
        label: slot.toUpperCase(),
        roomCode,
        url,
        status,
        statusLabel: hubSlotStatusLabel(status),
        message:
          status === "waiting"
            ? "Waiting for the phone to join."
            : status === "connected"
              ? "Connected. Finishing setup…"
              : status === "ready"
                ? "Ready to play."
                : status === "closed"
                  ? "Using the keyboard for this slot."
                  : null,
      };
    });

    let status: HubControllerView["status"];
    if (error || view?.state === "ended") {
      status = "error";
    } else if (
      !view ||
      view.state === "idle" ||
      view.state === "connecting"
    ) {
      status = "preparing";
    } else if (
      view.state === "controllers-ready" ||
      view.state === "active"
    ) {
      status = "ready";
    } else {
      status = "waiting";
    }

    return {
      roomCode,
      status,
      message: error?.message ?? null,
      slots,
    };
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
    const next = selectMode(this.state, mode);
    if (next === this.state) return;
    this.state = next;
    if (next.mode !== "local") {
      this.disposeHostRun();
      this.state = resetInputPlan(this.state);
    }
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
    const menuTheme = this.hubContent.theme.audio?.music;
    if (menuTheme) {
      this.hubAudio?.playTheme(menuTheme, { fadeInMs: 800 });
    }
    await this.hubAudio?.preload(
      Object.values(this.hubContent.theme.audio?.cues ?? {}),
    );

    this.hubContainer?.remove();
    this.hubContainer = document.createElement("div");
    this.hubContainer.className = "hub-root";
    this.uiRoot.replaceChildren(this.hubContainer);
    this.hubUi = mountHubUi(this.hubContainer, {
      callbacks: {
        onSelectPack: (id) => this.selectPack(id),
        onModeChange: (mode) => this.selectMode(mode),
        onInputSourceChange: (slot, source) =>
          this.changeInputSource(slot, source),
        onStart: () => {
          void this.startSelected({ resume: true, fromGesture: true });
        },
        onNewCycle: () => {
          void this.startSelected({ resume: false, fromGesture: true });
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
    fromGesture?: boolean;
  }): Promise<void> {
    if (!this.state || this.state.busy) return;
    const entry = selectedPack(this.state);
    if (!entry || entry.status !== "available") return;

    const gate = phoneStartGate(
      this.state.inputPlan,
      this.controllerGateInput(),
    );
    if (gate && !gate.allowed) {
      this.state = {
        ...this.state,
        notice: gate.reason ?? "Waiting for the phone controllers.",
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

      const bundlePromise = this.preparePack(
        entry.id,
        options.resume,
        options.fromGesture === true,
      );
      [bundle] = await Promise.all([bundlePromise, launch]);
      this.state = markLaunching(this.state);
      this.refreshHub();
      await this.transitionToRoom(bundle, skipIntro);
      this.startHostRunAfterScene();
    } catch (error) {
      this.disposeHostRun();
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

  private applyInputPlan(plan: InputPlan): void {
    if (!this.state) return;
    const previous = this.state.inputPlan;
    const nextState = setInputPlan(this.state, plan);
    if (nextState === this.state) return;

    const previousPhones = phoneSlotsForPlan(previous);
    const added = (["p1", "p2"] as const).filter(
      (slot) => previous[slot] === "keyboard" && plan[slot] === "controller",
    );
    const removed = (["p1", "p2"] as const).filter(
      (slot) => previous[slot] === "controller" && plan[slot] === "keyboard",
    );

    this.state = nextState;

    // Keyboard fallback closes only the changed slot. The other phone keeps
    // its room, code, and connection.
    for (const slot of removed) {
      this.hostRun?.fallbackToKeyboard(slot);
    }

    if (added.length > 0) {
      this.disposeHostRun();
      if (previousPhones.length > 0) {
        this.state = {
          ...this.state,
          notice: "New phone room — scan the updated controller code.",
        };
      }
    }

    const remaining = phoneSlotsForPlan(this.state.inputPlan);
    if (remaining.length === 0) {
      this.disposeHostRun();
    } else if (added.length > 0 || !this.hostRun) {
      void this.ensureHostRun(this.state.inputPlan);
    }
    this.refreshHub();
  }

  private changeInputSource(
    slot: PlayerSlot,
    source: "keyboard" | "controller",
  ): void {
    if (!this.state) return;
    this.applyInputPlan({ ...this.state.inputPlan, [slot]: source });
  }

  private async ensureHostRun(plan: InputPlan): Promise<void> {
    const requested = phoneSlotsForPlan(plan);
    if (requested.length === 0) {
      this.disposeHostRun();
      return;
    }
    if (this.hostRun && this.hostPlan) {
      const cached = phoneSlotsForPlan(this.hostPlan);
      if (requested.join(",") === cached.join(",")) return;
    }

    this.disposeHostRun();
    const generation = ++this.hostGeneration;
    this.hostRunError = null;
    this.hostRunStartAttempted = false;

    if (!this.hostRunFactory) {
      this.hostRunError = {
        code: "HOST_RUN_UNAVAILABLE",
        message:
          "Phone controllers require a host session factory.",
      };
      this.refreshHub();
      return;
    }

    let run: HostRunPort | null = null;
    try {
      run = this.hostRunFactory({
        plan: { ...plan },
        ...(this.roomCodeOption ? { room: this.roomCodeOption } : {}),
        buildId: this.buildId,
        onStateChange: (view) => {
          if (this.hostRun !== run) return;
          this.hostRunView = view;
          this.syncHostRunUi();
        },
        onError: (error) => {
          if (this.hostRun !== run) return;
          this.hostRunError = error;
          this.warn(`[host session] ${error.code}: ${error.message}`);
          this.syncHostRunUi();
        },
      });
    } catch (error) {
      if (generation !== this.hostGeneration) return;
      this.hostRunError = {
        code: "HOST_RUN_CREATE",
        message: toError(error).message,
      };
      this.refreshHub();
      return;
    }

    this.hostRun = run;
    this.hostPlan = { ...plan };
    this.hostRoomCode = run.room;
    this.hostRunView = run.view;
    this.refreshHub();
    this.syncHostRunUi();

    try {
      await run.connect();
    } catch (error) {
      if (this.hostRun !== run || generation !== this.hostGeneration) return;
      this.hostRunError = {
        code: "HOST_RUN_CONNECT",
        message: toError(error).message,
      };
      this.refreshHub();
      this.syncHostRunUi();
      return;
    }

    if (this.hostRun !== run || generation !== this.hostGeneration) return;
    this.syncHostRunUi();
  }

  private disposeHostRun(): void {
    const run = this.hostRun;
    this.hostRun = null;
    this.hostRunView = null;
    this.hostRoomCode = null;
    this.hostPlan = null;
    this.hostRunError = null;
    this.hostRunStartAttempted = false;
    this.hostGeneration += 1;

    if (run) {
      run.end("host-left");
      run.destroy();
    }
    this.gameUi?.setHostRun(null);
  }

  private startHostRunAfterScene(): void {
    const run = this.hostRun;
    if (!run) return;
    this.hostRunStartAttempted = true;
    if (run.view.state !== "active" && !run.start()) {
      this.warn(
        "[host session] run start deferred because the controllers are not ready",
      );
    }
    this.syncHostRunUi();
  }

  private syncHostRunUi(): void {
    if (!this.state) return;
    if (this.state.phase === "hub") {
      this.refreshHub();
      return;
    }
    if (this.state.phase === "playing") {
      this.gameUi?.setHostRun(this.hostRunOverlay());
    }
  }

  private hostRunOverlay(): HostRunOverlayView | null {
    if (!this.hostRun || !this.hostRunView || !this.hostRunStartAttempted) {
      return null;
    }
    const view = this.hostRunView;
    if (view.state === "active") return null;
    const missingSlots = [...view.missingSlots];
    const error =
      this.hostRunError?.message ?? view.error?.message ?? null;
    return {
      state: view.state,
      pausedReason: view.pausedReason,
      missingSlots,
      canStart:
        view.state === "controllers-ready" &&
        missingSlots.length === 0 &&
        !error,
      canResume:
        view.state === "paused" &&
        missingSlots.length === 0 &&
        !error,
      ended: view.state === "ended",
      error,
    };
  }

  private advanceHostRun(): void {
    const run = this.hostRun;
    if (!run) {
      this.syncHostRunUi();
      return;
    }
    if (run.view.state === "controllers-ready") {
      run.start();
    } else if (run.view.state === "paused") {
      run.resume();
    }
    this.syncHostRunUi();
  }

  private continueWithKeyboard(slot?: PlayerSlot): void {
    const run = this.hostRun;
    if (!run) {
      this.syncHostRunUi();
      return;
    }
    if (!slot) {
      this.disposeHostRun();
      return;
    }

    run.fallbackToKeyboard(slot);
    const view = this.hostRunView;
    const allClosed = run.phoneSlots.every(
      (phoneSlot) => view?.slots[phoneSlot].status === "closed",
    );
    if (allClosed) {
      this.disposeHostRun();
      return;
    }
    if (
      view?.state === "controllers-ready" &&
      this.hostRunStartAttempted
    ) {
      run.start();
    }
    this.syncHostRunUi();
  }

  private endSessionToHub(): void {
    this.hostRun?.end("host-left");
    this.syncHostRunUi();
    void this.returnToHub();
  }

  private handleHostRuntimeSnapshot(snapshot: RuntimeSnapshot): void {
    const run = this.hostRun;
    if (!run) return;
    if (snapshot.state === "pause") {
      if (run.view.state === "active") run.pause("host-paused");
      return;
    }
    if (
      run.view.state === "paused" &&
      run.view.pausedReason === "host-paused"
    ) {
      run.resume();
    }
  }

  private isHostRunPaused(): boolean {
    if (!this.hostRun) return false;
    return this.hostRunView?.state !== "active";
  }

  private async preparePack(
    packId: string,
    resume: boolean,
    fromGesture = false,
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
      ...collectLevelBlueprintAssetIds(content.levels),
      ...Object.values(PLAYER_ASSET_IDS),
      ...Object.values(PLAYER_ANIMATION_ASSET_IDS)
        .flatMap((clips) => Object.values(clips))
        .filter((id) => finalManifest?.assets[id] !== undefined),
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
      fetchImpl: this.fetchImpl,
    });
    audio.setMuted(this.saveData.settings.audio.muted);
    audio.setVolume(this.saveData.settings.audio.volume);
    if (fromGesture) {
      await audio.unlock();
    }
    await audio.preload(Object.values(content.theme.audio?.cues ?? {}));

    try {
      const audioPort: AudioPort = {
        play: (assetId) => audio.play(assetId),
        playTheme: (assetId, options) => audio.playTheme(assetId, options),
        stopTheme: (options) => audio.stopTheme(options),
        pauseTheme: () => audio.pauseTheme(),
        resumeTheme: () => audio.resumeTheme(),
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
    const hubAudio = this.hubAudio;
    this.hubAudio = null;
    this.fadeOutAndDispose(hubAudio, 700);

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
      resolveBlueprintSymbol: (symbol) =>
        isAssetId(symbol)
          ? bundle.assets.resolveById(symbol)
          : null,
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
        onToggleSharedFeedback: () => bundle.runtime.toggleSharedFeedback(),
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
        onHostResume: () => this.advanceHostRun(),
        onHostFallback: (slot) => this.continueWithKeyboard(slot),
        onHostKeyboard: () => this.continueWithKeyboard(),
        onHostEnd: () => this.endSessionToHub(),
      },
    });
    this.gameUi.applySettings(this.saveData.settings);
    this.gameUi.update(bundle.runtime.snapshot());
    this.unsubscribe = bundle.runtime.subscribe((snapshot) => {
      this.gameUi?.update(snapshot);
      this.handleHostRuntimeSnapshot(snapshot);
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
        isPaused: () => this.isHostRunPaused(),
        input: (scene) => {
          const arbiter = new InputArbiter(new KeyboardIntentSource(scene));
          this.hostRun?.attachInput(arbiter);
          return arbiter;
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
    this.disposeHostRun();
    this.packContent = null;
    this.packAssets = null;
    this.packPlan = null;
    const wasActivePack = this.activeAudio === this.packAudio;
    const packAudio = this.packAudio;
    this.packAudio = null;
    if (wasActivePack) this.activeAudio = null;
    this.fadeOutAndDispose(packAudio, 600);
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
    this.state = resetInputPlan(
      markHub(this.state, "Back in the bathroom."),
    );
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
    this.state = resetInputPlan(
      markError(
        this.state ?? createAppState(this.catalogData),
        error.message,
      ),
    );
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

  /**
   * The hub and pack use separate AudioContexts, so a true shared crossfade is
   * not possible. Fade the outgoing theme and dispose after the ramp ends.
   */
  private fadeOutAndDispose(
    audio: AudioModule | null,
    fadeOutMs: number,
  ): void {
    if (!audio) return;
    audio.stopTheme({ fadeOutMs });
    window.setTimeout(() => audio.dispose(), fadeOutMs + 150);
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
