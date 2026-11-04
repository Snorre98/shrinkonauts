import { expect, test } from "@playwright/test";
import { boot, teleport } from "./support";

test("header carries the checklist, hint strip, and player-coloured cards", async ({
  page,
}) => {
  const consoleErrors = await boot(page);

  const bar = page.locator(".hud__bar");
  await expect(bar.locator(".hud__progress")).toBeVisible();
  await expect(
    bar.locator(".feedback-beats__item", { hasText: "Press a dendrite input" }),
  ).toBeVisible();
  await expect(bar.locator(".hud__hint-count")).toHaveText("Hint 0/3");
  await expect(bar.locator(".hud__hint-text")).toContainText(
    "No hint requested yet.",
  );

  await page.getByRole("button", { name: "Hint", exact: true }).click();
  await expect(bar.locator(".hud__hint-count")).toHaveText("Hint 1/3");
  await expect(bar.locator(".hud__hint-text")).toContainText(
    "One input is below threshold",
  );

  await expect(page.locator(".hud__help")).toHaveCount(0);
  const p1Card = page.locator(".hud__controls-card--p1");
  const p2Card = page.locator(".hud__controls-card--p2");
  await expect(p1Card).toBeVisible();
  await expect(p2Card).toBeVisible();

  const colours = await page.evaluate(() => {
    const border = (selector: string): string => {
      const node = document.querySelector<HTMLElement>(selector);
      if (!node) return "";
      return getComputedStyle(node).borderTopColor;
    };
    return {
      p1: border(".hud__controls-card--p1"),
      p2: border(".hud__controls-card--p2"),
    };
  });
  expect(colours.p1).toBe("rgb(229, 155, 52)");
  expect(colours.p2).toBe("rgb(123, 223, 242)");

  await teleport(page, "agent-neuron");
  await expect(page.locator(".hud__prompt")).toContainText("Talk to Neuron Keeper");
  const geometry = await page.evaluate(() => {
    const rect = (selector: string) => {
      const node = document.querySelector<HTMLElement>(selector);
      if (!node) return null;
      const box = node.getBoundingClientRect();
      return { top: box.top, bottom: box.bottom };
    };
    return {
      bar: rect(".hud__bar"),
      prompt: rect(".hud__prompt"),
      card: rect(".hud__controls-card--p1"),
    };
  });
  expect(geometry.bar).not.toBeNull();
  expect(geometry.prompt).not.toBeNull();
  expect(geometry.card).not.toBeNull();
  expect(geometry.prompt!.top).toBeGreaterThanOrEqual(geometry.bar!.bottom);
  expect(geometry.prompt!.bottom).toBeLessThanOrEqual(geometry.card!.top);

  expect(consoleErrors).toEqual([]);
});

test("compact blueprint opens the expanded popup with chain, legend, and hint history", async ({
  page,
}) => {
  const consoleErrors = await boot(page);

  await page.locator(".blueprint__component").first().click();
  const dialog = page.getByRole("dialog", { name: "Blueprint" });
  await expect(dialog).toBeVisible();
  await expect(dialog.locator(".blueprint-system__item")).toHaveText([
    "03 NERVE FOREST",
    "04 MUSCLE EFFECTOR",
    "05 ?",
  ]);
  await expect(dialog.locator(".blueprint-legend__item")).toHaveText([
    "Done",
    "Active",
    "Pending",
    "P1",
    "P2",
    "Shared",
  ]);
  await expect(dialog.locator(".blueprint__expanded-component")).toHaveCount(4);

  await dialog.getByRole("button", { name: /Next hint/ }).click();
  await expect(dialog.locator(".blueprint-hints__item")).toContainText(
    "One input is below threshold",
  );
  await expect(dialog.getByRole("button", { name: /Next hint/ })).toContainText(
    "1/3",
  );

  await page.keyboard.press("Escape");
  await expect(page.locator(".overlay--map")).toHaveCount(0);

  expect(consoleErrors).toEqual([]);
});

test("solo hides the P2 card and pause keeps the shared controls only", async ({
  page,
}) => {
  const consoleErrors = await boot(page);

  await page.locator("#game-root canvas").click({ position: { x: 60, y: 60 } });
  await page.keyboard.press("p");
  await expect(page.locator(".hud__meta")).toContainText("solo");
  await expect(page.locator(".hud__controls-card--p2")).toBeHidden();

  await page.keyboard.press("p");
  await expect(page.locator(".hud__meta")).toContainText("co-op");
  await expect(page.locator(".hud__controls-card--p2")).toBeVisible();

  await page.keyboard.press("Escape");
  const pause = page.getByRole("dialog", { name: "Paused" });
  await expect(pause).toBeVisible();
  await expect(page.locator(".pause__hint")).toHaveCount(0);
  await expect(pause).toContainText("Shared");
  await expect(pause).toContainText("P join");

  expect(consoleErrors).toEqual([]);
});

test("density states switch with text scale and viewport width", async ({
  page,
}) => {
  const consoleErrors = await boot(page);
  const hud = page.locator(".hud");

  await expect(hud).toHaveAttribute("data-hud-density", "full");

  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "150%" }).click();
  await page.getByRole("button", { name: "Resume" }).click();
  await expect(hud).toHaveAttribute("data-hud-density", "compact");

  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "200%" }).click();
  await page.getByRole("button", { name: "Resume" }).click();
  await expect(hud).toHaveAttribute("data-hud-density", "minimal");
  await expect(page.locator(".hud__controls-card--p1")).toBeHidden();
  await expect(page.getByRole("button", { name: "Hint", exact: true })).toBeVisible();

  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "100%" }).click();
  await page.getByRole("button", { name: "Resume" }).click();
  await expect(hud).toHaveAttribute("data-hud-density", "full");

  await page.setViewportSize({ width: 1000, height: 720 });
  await expect(hud).toHaveAttribute("data-hud-density", "compact");
  await page.setViewportSize({ width: 700, height: 720 });
  await expect(hud).toHaveAttribute("data-hud-density", "minimal");

  expect(consoleErrors).toEqual([]);
});
