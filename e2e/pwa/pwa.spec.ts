import { existsSync } from "node:fs";
import { join } from "node:path";
import { expect, test, type Page } from "@playwright/test";

const PWA_BASE = "/shrinkonauts/";
const PRECACHE_THRESHOLD = 100;

async function waitForServiceWorker(page: Page): Promise<string> {
  await page.waitForFunction(() => "serviceWorker" in navigator);
  return page.evaluate(async () => {
    const registration = await navigator.serviceWorker.ready;
    return registration.scope;
  });
}

async function waitForPrecache(page: Page): Promise<number> {
  await page.waitForFunction(
    async (minimum) => {
      if (!("caches" in window)) return false;
      const names = await caches.keys();
      const name = names.find((key) => key.includes("workbox-precache"));
      if (!name) return false;
      const cache = await caches.open(name);
      const entries = await cache.keys();
      return entries.length >= minimum;
    },
    PRECACHE_THRESHOLD,
    { timeout: 60_000 },
  );
  return page.evaluate(async () => {
    const names = await caches.keys();
    const name = names.find((key) => key.includes("workbox-precache"));
    if (!name) return 0;
    return (await (await caches.open(name)).keys()).length;
  });
}

async function bootGame(page: Page): Promise<void> {
  await page.goto("./", { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => {
    const app = (window as { __shrinkonauts?: { phase?: string } })
      .__shrinkonauts;
    return app?.phase === "hub";
  });
}

test("registers a service worker scoped to the Pages subpath", async ({
  page,
}) => {
  await bootGame(page);
  const scope = await waitForServiceWorker(page);
  expect(new URL(scope).pathname).toBe(PWA_BASE);
  const cached = await waitForPrecache(page);
  expect(cached).toBeGreaterThanOrEqual(PRECACHE_THRESHOLD);

  await page.reload({ waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => {
    const app = (window as { __shrinkonauts?: { phase?: string } })
      .__shrinkonauts;
    return app?.phase === "hub";
  });
  expect(
    await page.evaluate(() => Boolean(navigator.serviceWorker.controller)),
  ).toBe(true);
});

test("passes Chrome installability checks for game and controller", async ({
  context,
  page,
}) => {
  await bootGame(page);
  await waitForServiceWorker(page);
  await waitForPrecache(page);

  const client = await context.newCDPSession(page);
  await client.send("Page.enable");
  const game = (await client.send(
    "Page.getInstallabilityErrors",
  )) as { installabilityErrors: Array<{ errorId: string }> };
  // Playwright contexts are incognito; Chrome reports that as an
  // installability error even though the manifest, icons, and SW are valid.
  expect(
    game.installabilityErrors.filter(
      (error) => error.errorId !== "in-incognito",
    ),
  ).toEqual([]);

  await page.goto("controller.html", { waitUntil: "domcontentloaded" });
  const controller = (await client.send(
    "Page.getInstallabilityErrors",
  )) as { installabilityErrors: Array<{ errorId: string }> };
  expect(
    controller.installabilityErrors.filter(
      (error) => error.errorId !== "in-incognito",
    ),
  ).toEqual([]);
  await expect(page.locator(".controller--join")).toBeVisible();
});

test("offers and accepts the Chromium install prompt", async ({ page }) => {
  await bootGame(page);
  await waitForServiceWorker(page);

  await page.evaluate(() => {
    const event = new Event("beforeinstallprompt", {
      cancelable: true,
    }) as Event & {
      prompt: () => Promise<void>;
      userChoice: Promise<{
        outcome: "accepted" | "dismissed";
        platform: string;
      }>;
    };
    event.prompt = async () => {};
    event.userChoice = Promise.resolve({
      outcome: "accepted",
      platform: "web",
    });
    window.dispatchEvent(event);
  });

  const install = page.getByRole("button", { name: "Install app" });
  await expect(install).toBeVisible();
  await install.click();
  await expect(install).toBeHidden();
});

test("boots the hub and starts solo offline", async ({ page }) => {
  await bootGame(page);
  await waitForServiceWorker(page);
  await waitForPrecache(page);

  await page.context().setOffline(true);
  await page.reload({ waitUntil: "domcontentloaded" });
  await expect(page.locator(".hub__title")).toHaveText("The bathroom");
  await expect(page.locator(".hub__pwa")).toHaveAttribute(
    "data-notice",
    "offline",
  );

  await page.locator(".hub__mode", { hasText: "Solo" }).click();
  await page.getByRole("button", { name: "Start cycle" }).click();
  await expect(
    page.getByRole("button", { name: "Skip launch" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Skip launch" }).click();
  await page.waitForFunction(() => {
    const app = (window as {
      __shrinkonauts?: {
        game?: { scene?: { isActive(key: string): boolean } };
      };
    }).__shrinkonauts;
    return app?.game?.scene?.isActive("room") === true;
  });
  await expect(page.locator(".hud__title")).toHaveText("Nerve Forest");
});

test("honours offline direct-boot query flags", async ({ page }) => {
  await bootGame(page);
  await waitForServiceWorker(page);
  await waitForPrecache(page);

  await page.context().setOffline(true);
  await page.goto("./?skipMenu=1&pack=anatomy-reflex", {
    waitUntil: "domcontentloaded",
  });
  await page.waitForFunction(() => {
    const app = (window as {
      __shrinkonauts?: {
        game?: { scene?: { isActive(key: string): boolean } };
      };
    }).__shrinkonauts;
    return app?.game?.scene?.isActive("room") === true;
  });
  await expect(page.locator(".hud__title")).toHaveText("Nerve Forest");
});

test("serves the controller shell offline", async ({ page }) => {
  await bootGame(page);
  await waitForServiceWorker(page);
  await waitForPrecache(page);

  await page.context().setOffline(true);
  await page.goto("controller.html", { waitUntil: "domcontentloaded" });
  await expect(page.locator(".controller--join")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Join" }),
  ).toBeVisible();
});

test("does not hijack the GDD gallery", async ({ page }) => {
  const gallery = join(process.cwd(), "dist/gdd/index.html");
  test.skip(!existsSync(gallery), "GDD gallery was not built");
  await bootGame(page);
  await waitForServiceWorker(page);
  await waitForPrecache(page);

  await page.goto("gdd/", { waitUntil: "domcontentloaded" });
  await expect(page).toHaveTitle(/GDD asset gallery/);
  await expect(page.locator(".hub")).toHaveCount(0);
});
