import { expect, test, type Page } from "@playwright/test";

interface RuntimeBridge {
  placePlayer(id: "p1" | "p2", x: number, y: number): void;
}

type ShrinkonautsWindow = Window & {
  __shrinkonauts?: {
    runtime?: RuntimeBridge | null;
  };
};

async function waitForGame(page: Page): Promise<void> {
  await page.waitForFunction(() => {
    const runtime = (window as ShrinkonautsWindow).__shrinkonauts?.runtime;
    const canvas = document.querySelector<HTMLCanvasElement>(
      "#game-root canvas",
    );
    return (
      Boolean(runtime) &&
      canvas?.getAttribute("data-room-id") === "room-nerve-forest"
    );
  });
  await expect(page.locator(".hud__title")).toHaveText("Nerve Forest");
}

async function boot(page: Page): Promise<void> {
  await page.goto("/?skipMenu=1&pack=anatomy-reflex");
  await waitForGame(page);
}

function sharedFeedbackToggle(page: Page) {
  return page.getByRole("button", { name: "Shared feedback" });
}

async function teleportToInfoArea(page: Page): Promise<void> {
  await page.evaluate(() => {
    const runtime = (window as ShrinkonautsWindow).__shrinkonauts?.runtime;
    if (!runtime) throw new Error("runtime bridge is missing");
    runtime.placePlayer("p1", 960, 640);
    runtime.placePlayer("p2", 996, 640);
  });
  await page.waitForTimeout(150);
}

test("pause settings toggle shared feedback and persist it", async ({ page }) => {
  await boot(page);

  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog", { name: "Paused" })).toBeVisible();
  const toggle = sharedFeedbackToggle(page);
  await expect(toggle).toHaveAttribute("aria-pressed", "true");

  await toggle.click();
  await expect(toggle).toHaveAttribute("aria-pressed", "false");
  await page.getByRole("button", { name: "Resume" }).click();

  await page.reload();
  await waitForGame(page);
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog", { name: "Paused" })).toBeVisible();
  await expect(sharedFeedbackToggle(page)).toHaveAttribute(
    "aria-pressed",
    "false",
  );
});

test("shared feedback suppresses help while player feedback still works", async ({
  page,
}) => {
  await boot(page);

  await page.keyboard.press("Escape");
  await sharedFeedbackToggle(page).click();
  await page.getByRole("button", { name: "Resume" }).click();

  await teleportToInfoArea(page);
  await page.keyboard.press("q");
  await expect(
    page.locator(".feedback-surface", { hasText: "Need a nudge?" }),
  ).toHaveCount(0);
  await expect(
    page.locator('.feedback-surface--playerCaption[data-owner="p1"]'),
  ).toContainText("Nothing to scan here");

  await page.keyboard.press("Escape");
  await sharedFeedbackToggle(page).click();
  await page.getByRole("button", { name: "Resume" }).click();
  await page.keyboard.press("q");
  const help = page.locator(".feedback-surface", { hasText: "Need a nudge?" });
  await expect(help).toBeVisible();

  await page.keyboard.press("Escape");
  await sharedFeedbackToggle(page).click();
  await expect(help).toHaveCount(0);
});
