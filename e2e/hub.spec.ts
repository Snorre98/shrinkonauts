import { expect, test, type Page } from "@playwright/test";

interface AppBridge {
  readonly phase: string;
  readonly runtime: {
    snapshot(): { activeP2: boolean; level: { id: string } };
  } | null;
  readonly game: {
    scene: { isActive(key: string): boolean };
  } | null;
}

type ShrinkonautsWindow = Window & {
  __shrinkonauts?: AppBridge;
};

function collectConsoleErrors(page: Page): string[] {
  const consoleErrors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  page.on("pageerror", (error) => consoleErrors.push(error.message));
  return consoleErrors;
}

async function bootHub(page: Page): Promise<string[]> {
  const consoleErrors = collectConsoleErrors(page);

  await page.goto("/");
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
  return consoleErrors;
}

test("selects and starts the Silicon cycle from a deep link", async ({ page }) => {
  const consoleErrors = collectConsoleErrors(page);

  await page.goto("/?pack=silicon-reflex");
  await page.waitForFunction(() => {
    const app = (window as ShrinkonautsWindow).__shrinkonauts;
    return app?.phase === "hub";
  });
  const silicon = page.locator(".hub-card", { hasText: "Silicon" });
  await expect(silicon).toHaveAttribute("data-selected", "true");
  await expect(silicon).toHaveAttribute("data-status", "available");
  await expect(silicon.locator("input")).toBeEnabled();
  await expect(page.getByRole("button", { name: "Start cycle" })).toBeEnabled();
  await expect(page.locator(".hub__status")).toBeHidden();

  await page.getByRole("button", { name: "Start cycle" }).click();
  await expect(page.getByRole("button", { name: "Skip launch" })).toBeVisible();
  await page.getByRole("button", { name: "Skip launch" }).click();
  await page.waitForFunction(() => {
    const app = (window as ShrinkonautsWindow).__shrinkonauts;
    return Boolean(app?.runtime) && app?.game?.scene.isActive("room") === true;
  });
  await expect(page.locator(".hud__title")).toHaveText("Interrupt Loop");
  expect(consoleErrors).toEqual([]);
});

test("boots final art by default and keeps the procedural placeholder path", async ({
  page,
}) => {
  const consoleErrors = await bootHub(page);
  await expect(page.locator(".hub__asset-mode")).toHaveText("Final assets");

  await page.goto("/?assets=placeholder");
  await page.waitForFunction(() => {
    const app = (window as ShrinkonautsWindow).__shrinkonauts;
    return app?.phase === "hub";
  });
  await expect(page.locator(".hub__title")).toHaveText("The bathroom");
  await expect(page.locator(".hub__asset-mode")).toHaveText("Placeholder assets");
  expect(consoleErrors).toEqual([]);
});

test("starts with reduced motion enabled without the spin animation", async ({
  page,
}) => {
  await bootHub(page);
  await page.locator(".hub__summary", { hasText: "Settings" }).click();
  const settings = page.locator(".hub__details", { hasText: "Settings" });
  await settings.getByRole("button", { name: "Off" }).click();
  await expect(settings.getByRole("button", { name: "On" })).toBeVisible();
  await expect
    .poll(() =>
      page.evaluate(() => document.documentElement.dataset.reducedMotion),
    )
    .toBe("true");

  await page.locator(".hub__mode", { hasText: "Solo" }).click();
  await page.getByRole("button", { name: "Start cycle" }).click();
  await page.waitForFunction(() => {
    const app = (window as ShrinkonautsWindow).__shrinkonauts;
    return Boolean(app?.runtime) && app?.game?.scene.isActive("room") === true;
  }, undefined, { timeout: 20_000 });
  await expect(page.locator(".hud__title")).toHaveText("Nerve Forest");
});

test("boots into the bathroom, starts a solo anatomy cycle, and returns to the hub", async ({
  page,
}) => {
  const consoleErrors = await bootHub(page);

  await expect(page.locator(".hub-card", { hasText: "Anatomy" })).toHaveAttribute(
    "data-selected",
    "true",
  );

  // Online is a visible M4 placeholder, not a working mode.
  await expect(
    page.locator(".hub__mode", { hasText: "Online co-op" }).locator("input"),
  ).toBeDisabled();
  await page.locator(".hub__mode", { hasText: "Solo" }).click();
  await expect(
    page.locator(".hub__mode", { hasText: "Solo" }).locator("input"),
  ).toBeChecked();

  await page.getByRole("button", { name: "Start cycle" }).click();
  await expect(page.getByRole("button", { name: "Skip launch" })).toBeVisible();
  await page.getByRole("button", { name: "Skip launch" }).click();
  await page.waitForFunction(() => {
    const app = (window as ShrinkonautsWindow).__shrinkonauts;
    return Boolean(app?.runtime) && app?.game?.scene.isActive("room") === true;
  });
  await expect(page.locator(".hud__title")).toHaveText("Nerve Forest");
  await expect(page.locator(".hud__meta")).toContainText("solo");

  await expect
    .poll(() =>
      page.evaluate(
        () =>
          (window as ShrinkonautsWindow).__shrinkonauts?.runtime?.snapshot()
            .activeP2 ?? null,
      ),
    )
    .toBe(false);

  // Pause and leave the level; the bathroom shell is rebuilt.
  await expect(page.locator(".hub-skip")).toHaveCount(0);
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Leave to bathroom" }).click();
  await page.waitForFunction(() => {
    const app = (window as ShrinkonautsWindow).__shrinkonauts;
    return app?.phase === "hub" && app?.game?.scene.isActive("hub") === true;
  });
  await expect(page.locator(".hub__title")).toHaveText("The bathroom");
  await expect(page.getByRole("button", { name: "Continue" })).toBeVisible();

  expect(consoleErrors).toEqual([]);
});
