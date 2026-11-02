import { expect, type Page } from "@playwright/test";

export interface RuntimeSnapshotLite {
  state: string;
  abilities: string[];
  mode: string;
  activeP2: boolean;
  level: { id: string; title: string };
  roomId: string;
  puzzle: { id: string; title: string; solved: boolean } | null;
}

export interface RuntimeBridge {
  entityPixel(id: string): { x: number; y: number } | null;
  placePlayer(id: "p1" | "p2", x: number, y: number): void;
  exportEvidence(): {
    sessionId: string;
    objectives: Array<{ id: string; requiredMet: boolean }>;
    events: Array<{ type: string; gateId?: string; puzzleId?: string }>;
  };
  snapshot(): RuntimeSnapshotLite;
  simulation: {
    players: Record<"p1" | "p2", { x: number; y: number }>;
  };
}

export interface GameBridge {
  scene: {
    isActive(key: string): boolean;
    getScene?(key: string): unknown;
  };
  loop?: {
    sleep(): void;
    wake(): void;
  };
}

export type ShrinkonautsWindow = Window & {
  __shrinkonauts?: {
    readonly phase: string;
    readonly runtime: RuntimeBridge | null;
    readonly game: GameBridge | null;
  };
};

export function collectConsoleErrors(page: Page): string[] {
  const consoleErrors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  page.on("pageerror", (error) => consoleErrors.push(error.message));
  return consoleErrors;
}

/** Collects failed network responses, optionally only those under a path. */
export function collectFailedResponses(page: Page, prefix = ""): string[] {
  const failed: string[] = [];
  page.on("response", (response) => {
    if (response.status() < 400) return;
    const url = response.url();
    if (prefix && !new URL(url).pathname.startsWith(prefix)) return;
    failed.push(`${response.status()} ${url}`);
  });
  return failed;
}

interface BootPackOptions {
  pack?: string;
  title?: string;
  roomId?: string;
  search?: string;
}

/**
 * Boots directly into a pack room with the existing `skipMenu` shortcut.
 * The room scene must be active before keyboard input is sent.
 */
export async function bootPack(
  page: Page,
  options: BootPackOptions = {},
): Promise<string[]> {
  const consoleErrors = collectConsoleErrors(page);
  const pack = options.pack ?? "anatomy-reflex";
  const search = options.search ?? `/?skipMenu=1&pack=${pack}`;
  const title = options.title ?? "Nerve Forest";
  const roomId = options.roomId ?? "room-nerve-forest";

  await page.goto(search);
  await page.waitForFunction(() => {
    const app = (window as ShrinkonautsWindow).__shrinkonauts;
    return Boolean(app?.runtime) && app?.game?.scene.isActive("room") === true;
  });
  await expect(page.locator(".hud__title")).toHaveText(title);
  await expect(page.locator(".hud__mode-badge")).toHaveText("Final assets");
  const materialPanel = await page.evaluate(() => {
    const root = getComputedStyle(document.documentElement);
    const panel = document.querySelector<HTMLElement>(".hud__panel");
    return {
      pattern: root.getPropertyValue("--material-panel-pattern").trim(),
      background: panel ? getComputedStyle(panel).backgroundImage : "",
    };
  });
  expect(materialPanel.pattern).toContain("data:image/svg+xml");
  expect(materialPanel.background).not.toBe("none");
  await waitForRoom(page, roomId);
  await expect(page.locator(".overlay--error")).toHaveCount(0);
  return consoleErrors;
}

export async function boot(page: Page): Promise<string[]> {
  return bootPack(page);
}

export async function bootSilicon(page: Page): Promise<string[]> {
  return bootPack(page, {
    pack: "silicon-reflex",
    title: "Interrupt Loop",
    roomId: "room-interrupt-loop",
  });
}

interface BootHubOptions {
  search?: string;
  assetMode?: "Final assets" | "Placeholder assets";
}

export async function bootHub(
  page: Page,
  options: BootHubOptions = {},
): Promise<string[]> {
  const consoleErrors = collectConsoleErrors(page);

  await page.goto(options.search ?? "/");
  await page.waitForFunction(() => {
    const app = (window as ShrinkonautsWindow).__shrinkonauts;
    return Boolean(app) && app?.phase === "hub";
  });
  await expect(page.locator(".hub__title")).toHaveText("The bathroom");
  await expect(page.locator(".hub-card")).toHaveCount(2);
  await expect(page.locator(".hub-card", { hasText: "Anatomy" })).toHaveAttribute(
    "data-selected",
    "true",
  );
  const silicon = page.locator(".hub-card", { hasText: "Silicon" });
  await expect(silicon).toHaveAttribute("data-status", "available");
  await expect(silicon.locator("input")).toBeEnabled();
  await expect(page.locator(".hub__online-copy")).toContainText("M4");
  await expect(page.locator(".hub__asset-mode")).toHaveText(
    options.assetMode ?? "Final assets",
  );
  return consoleErrors;
}

export async function waitForRoom(page: Page, roomId: string): Promise<void> {
  await page.waitForFunction(
    (id) =>
      document
        .querySelector<HTMLCanvasElement>("#game-root canvas")
        ?.getAttribute("data-room-id") === id,
    roomId,
  );
}

export async function teleport(
  page: Page,
  p1: { x: number; y: number } | string,
  p2?: { x: number; y: number } | string,
): Promise<void> {
  await page.evaluate(
    ({ first, second }) => {
      const runtime = (window as ShrinkonautsWindow).__shrinkonauts?.runtime;
      if (!runtime) throw new Error("runtime bridge is missing");

      const resolve = (point: { x: number; y: number } | string) => {
        if (typeof point !== "string") return point;
        const resolved = runtime.entityPixel(point);
        if (!resolved) throw new Error(`missing entity ${point}`);
        return resolved;
      };

      const p1Point = resolve(first);
      runtime.placePlayer("p1", p1Point.x, p1Point.y);
      const p2Point = second ? resolve(second) : { x: p1Point.x + 36, y: p1Point.y };
      runtime.placePlayer("p2", p2Point.x, p2Point.y);
    },
    { first: p1, second: p2 ?? null },
  );
  // Let the fixed-step scene publish the new interaction target.
  await page.waitForTimeout(120);
}

export async function closeOverlay(page: Page, overlay: string): Promise<void> {
  await page.keyboard.press("Escape");
  await expect(page.locator(`.${overlay}`)).toHaveCount(0);
}
