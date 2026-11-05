import { expect, test } from "@playwright/test";
import {
  bootHub,
  collectConsoleErrors,
  type ShrinkonautsWindow,
} from "./support";

test("selects and starts the Silicon cycle from a deep link", async ({ page }) => {
  const consoleErrors = collectConsoleErrors(page);
  const roomSockets: string[] = [];
  page.on("websocket", (socket) => roomSockets.push(socket.url()));

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
  expect(roomSockets.filter((url) => url.includes("room="))).toEqual([]);
  expect(consoleErrors).toEqual([]);
});

test("gates phone setup and returns to the keyboard default", async ({ page }) => {
  const consoleErrors = await bootHub(page);

  const p1 = page.locator('.hub__input-slot[data-slot="p1"]');
  await expect(p1.locator('input[value="keyboard"]')).toBeChecked();
  await expect(page.locator(".hub__controller")).toBeHidden();
  await expect(page.locator(".hub__mode")).toHaveCount(2);
  await expect(page.locator(".hub__online")).toHaveCount(0);

  await p1.getByText("Phone", { exact: true }).click();

  const setup = page.locator(".hub__controller");
  await expect(setup).toBeVisible();
  await expect(setup).toHaveAttribute("data-status", "error");
  await expect(
    page.getByRole("button", { name: /Start cycle|Continue/ }),
  ).toBeDisabled();
  await expect(page.locator("#hub-start-reason")).toContainText("VITE_NET_URL");
  await expect(page.locator(".hub__controller-slot")).toHaveCount(1);
  await expect(page.locator(".hub__controller-code")).toHaveText("—");

  await p1.getByText("Keyboard", { exact: true }).click();
  await expect(setup).toBeHidden();
  await expect(
    page.getByRole("button", { name: /Start cycle|Continue/ }),
  ).toBeEnabled();
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

test("offers the 75% text scale at a small viewport", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 640 });
  const consoleErrors = await bootHub(page);

  await page.locator(".hub__summary", { hasText: "Settings" }).click();
  const settings = page.locator(".hub__details", { hasText: "Settings" });
  const smallest = settings.getByRole("button", { name: "75%" });
  await expect(smallest).toBeVisible();
  await smallest.click();

  await expect
    .poll(() =>
      page.evaluate(() =>
        getComputedStyle(document.documentElement).getPropertyValue("--ui-font-scale").trim(),
      ),
    )
    .toBe("0.75");

  const bounds = await smallest.boundingBox();
  expect(bounds).not.toBeNull();
  expect(bounds!.x).toBeGreaterThanOrEqual(0);
  expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(360);
  expect(consoleErrors).toEqual([]);
});

test("boots into the bathroom, starts a solo anatomy cycle, and returns to the hub", async ({
  page,
}) => {
  const consoleErrors = await bootHub(page);

  await expect(page.locator(".hub-card", { hasText: "Anatomy" })).toHaveAttribute(
    "data-selected",
    "true",
  );

  // Multiplayer is same-room only: no online mode or host/join panel.
  await expect(page.locator(".hub__mode")).toHaveCount(2);
  await expect(page.locator(".hub__mode", { hasText: "Online co-op" })).toHaveCount(0);
  await expect(page.locator(".hub__online")).toHaveCount(0);
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
