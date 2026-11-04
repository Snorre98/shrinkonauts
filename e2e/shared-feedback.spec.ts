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

test("state markers and HUD chips open one shared inspect panel", async ({
  page,
}) => {
  await boot(page);

  const marker = page.locator(
    '.feedback-surface--stateMarker[data-surface-id="fb:binary:input-a"]',
  );
  await expect(marker).toBeVisible();
  await expect(marker).toHaveAttribute(
    "aria-label",
    /Dendrite input A is ready/,
  );

  await marker.click();
  const panel = page.locator(".feedback-surface--anchoredPanel");
  await expect(panel).toBeVisible();
  await expect(panel).toContainText("Dendrite input A is ready.");

  await page.keyboard.press("i");
  await expect(panel).toHaveCount(0);

  const chip = page.locator(
    '.feedback-surface--hudChip[data-surface-id="fb:counter:stimulus-counter"]',
  );
  await expect(chip).toBeVisible();
  await chip.click();
  await expect(panel).toContainText("Stimulus counter");
  await panel.getByRole("button", { name: "Close information" }).click();
  await expect(panel).toHaveCount(0);
});

test("shared feedback hides state, beats, and help while player feedback works", async ({
  page,
}) => {
  await boot(page);

  const stateMarker = page.locator(
    '.feedback-surface--stateMarker[data-surface-id="fb:binary:input-a"]',
  );
  await expect(stateMarker).toBeVisible();
  await expect(page.locator(".feedback-beats__item").first()).toBeVisible();

  await page.keyboard.press("Escape");
  await sharedFeedbackToggle(page).click();
  await page.getByRole("button", { name: "Resume" }).click();

  await expect(stateMarker).toHaveCount(0);
  await expect(page.locator(".feedback-beats__item")).toHaveCount(0);

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
  await expect(stateMarker).toBeVisible();
  await expect(page.locator(".feedback-beats__item").first()).toBeVisible();

  await page.keyboard.press("q");
  const help = page.locator(".feedback-surface", { hasText: "Need a nudge?" });
  await expect(help).toBeVisible();

  await page.keyboard.press("Escape");
  await sharedFeedbackToggle(page).click();
  await expect(help).toHaveCount(0);
});
