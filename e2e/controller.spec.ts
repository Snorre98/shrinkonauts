import { expect, test, type BrowserContext, type Page } from "@playwright/test";
import { collectConsoleErrors } from "./support";

interface HostBridge {
  phase: string;
  runtime: {
    simulation: {
      players: Record<"p1" | "p2", { x: number }>;
    };
  } | null;
  game: { scene: { isActive(key: string): boolean } } | null;
}

type ShrinkonautsWindow = Window & {
  __shrinkonauts?: HostBridge;
};

const GAME_RESOURCE =
  /\/(?:packs|hub|audio)\/|assets\.(?:final|placeholder)|\.(?:png|jpe?g|gif|webp|avif|svg|mp3|wav|ogg|m4a|woff2?|ttf|otf)(?:[?#]|$)/i;

async function selectPlan(
  page: Page,
  slot: "p1" | "p2",
  source: "Keyboard" | "Phone",
): Promise<void> {
  const row = page.locator(`.hub__input-slot[data-slot="${slot}"]`);
  await row.getByText(source, { exact: true }).click();
}

async function bootHostWithPhones(page: Page): Promise<{
  room: string;
  p1Url: string;
  p2Url: string;
}> {
  await page.goto("/");
  await page.waitForFunction(() => {
    const app = (window as ShrinkonautsWindow).__shrinkonauts;
    return app?.phase === "hub";
  });

  await selectPlan(page, "p1", "Phone");
  await selectPlan(page, "p2", "Phone");

  const setup = page.locator(".hub__controller");
  await expect(setup).toHaveAttribute("data-status", "waiting", {
    timeout: 30_000,
  });
  await expect(
    page.getByRole("button", { name: /Start cycle|Continue/ }),
  ).toBeDisabled();

  const room = (
    (await page.locator('[data-role="room-code"]').textContent()) ?? ""
  ).trim();
  expect(room).toMatch(/^[A-Z2-9]{6}$/);
  expect(
    await page.locator(".hub__controller-slot .hub__controller-qr").count(),
  ).toBe(2);

  const p1Url = await page
    .locator(
      '.hub__controller-slot[data-slot="p1"] [data-role="controller-url"]',
    )
    .getAttribute("href");
  const p2Url = await page
    .locator(
      '.hub__controller-slot[data-slot="p2"] [data-role="controller-url"]',
    )
    .getAttribute("href");
  if (!p1Url || !p2Url) throw new Error("controller URLs are missing");
  expect(p1Url).toContain(`#room=${room}&slot=p1`);
  expect(p2Url).toContain(`#room=${room}&slot=p2`);
  for (const slot of ["p1", "p2"] as const) {
    const qr = page.locator(
      `.hub__controller-slot[data-slot="${slot}"] .hub__controller-qr`,
    );
    await expect(qr).toBeVisible();
    expect(await qr.getAttribute("src")).toMatch(/^data:image\/svg\+xml/);
  }

  return { room, p1Url, p2Url };
}

async function openController(
  context: BrowserContext,
  url: string,
  slot: "p1" | "p2",
): Promise<{ page: Page; requests: string[]; errors: string[] }> {
  const page = await context.newPage();
  const requests: string[] = [];
  const errors: string[] = [];
  page.on("request", (request) => requests.push(request.url()));
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto(url);
  await expect(page.locator('[data-role="slot"]')).toHaveText(
    slot.toUpperCase(),
  );
  await expect(page.locator(".controller--board")).toHaveAttribute(
    "data-state",
    "ready",
  );
  return { page, requests, errors };
}

async function joinControllerWithCode(
  context: BrowserContext,
  room: string,
  slot: "p1" | "p2",
): Promise<{ page: Page; requests: string[]; errors: string[] }> {
  const page = await context.newPage();
  const requests: string[] = [];
  const errors: string[] = [];
  page.on("request", (request) => requests.push(request.url()));
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/controller.html");
  await page.locator('input[name="room"]').fill(room);
  await page
    .locator(".controller__slot-choice", { hasText: slot.toUpperCase() })
    .click();
  await page.getByRole("button", { name: "Join" }).click();
  await expect(page.locator(".controller--board")).toHaveAttribute(
    "data-state",
    "ready",
  );
  await expect(page).toHaveURL(new RegExp(`#room=${room}&slot=${slot}$`));
  return { page, requests, errors };
}

async function playerX(page: Page, slot: "p1" | "p2"): Promise<number> {
  const x = await page.evaluate(
    (id) => {
      const app = (window as ShrinkonautsWindow).__shrinkonauts;
      return app?.runtime?.simulation.players[id].x ?? null;
    },
    slot,
  );
  if (x === null) throw new Error(`player ${slot} is missing`);
  return x;
}

async function holdTouch(
  page: Page,
  control: string,
  milliseconds: number,
): Promise<void> {
  const button = page.locator(`[data-control="${control}"]`);
  await button.waitFor({ state: "visible" });
  const box = await button.boundingBox();
  if (!box) throw new Error(`control ${control} has no box`);

  const client = await page.context().newCDPSession(page);
  const point = {
    x: box.x + box.width / 2,
    y: box.y + box.height / 2,
    id: 1,
    radiusX: 2,
    radiusY: 2,
    force: 1,
  };
  try {
    await client.send("Input.dispatchTouchEvent", {
      type: "touchStart",
      touchPoints: [point],
    });
    await page.waitForTimeout(milliseconds);
    await client.send("Input.dispatchTouchEvent", {
      type: "touchEnd",
      touchPoints: [],
    });
  } finally {
    await client.detach();
  }
  await page.waitForTimeout(160);
}

test("two phones join through the hub, start explicitly, reconnect, fall back, and end", async ({
  browser,
  page,
}) => {
  const hostErrors = collectConsoleErrors(page);
  const { room, p1Url, p2Url } = await bootHostWithPhones(page);
  const startButton = page.getByRole("button", {
    name: /Start cycle|Continue/,
  });

  const phone = await browser.newContext({
    viewport: { width: 844, height: 390 },
    isMobile: true,
    hasTouch: true,
    deviceScaleFactor: 2,
  });

  const p1 = await openController(phone, p1Url, "p1");
  await expect(
    page.locator('.hub__controller-slot[data-slot="p1"]'),
  ).toHaveAttribute("data-status", "ready", { timeout: 20_000 });
  await expect(startButton).toBeDisabled();
  await expect(page.locator("#hub-start-reason")).toContainText("P2");

  const p2 = await joinControllerWithCode(phone, room, "p2");
  await expect(
    page.locator('.hub__controller-slot[data-slot="p2"]'),
  ).toHaveAttribute("data-status", "ready", { timeout: 20_000 });
  await expect(startButton).toBeEnabled();

  // Readiness only enables Start; it never starts the run.
  await page.waitForTimeout(600);
  await expect(page.locator(".hub__controller")).toBeVisible();
  await expect(page.getByRole("button", { name: "Skip launch" })).toHaveCount(0);
  expect(
    await page.evaluate(
      () => (window as ShrinkonautsWindow).__shrinkonauts?.runtime ?? null,
    ),
  ).toBeNull();

  await startButton.click();
  await expect(page.getByRole("button", { name: "Skip launch" })).toBeVisible();
  await page.getByRole("button", { name: "Skip launch" }).click();
  await page.waitForFunction(
    () => {
      const app = (window as ShrinkonautsWindow).__shrinkonauts;
      return Boolean(app?.runtime) && app?.game?.scene.isActive("room") === true;
    },
    undefined,
    { timeout: 30_000 },
  );
  await page.waitForTimeout(300);

  // The controller page is an input device, not a second game client.
  expect(await p1.page.locator("canvas").count()).toBe(0);
  expect(await p2.page.locator("canvas").count()).toBe(0);
  expect(await p1.page.locator('[data-role="rtt"]').count()).toBe(1);
  expect(
    await p1.page.evaluate(() => "__shrinkonauts" in window),
  ).toBe(false);
  const forbidden = [...p1.requests, ...p2.requests].filter(
    (url) => GAME_RESOURCE.test(url) || /phaser/i.test(url),
  );
  expect(forbidden).toEqual([]);

  await p1.page.locator(".controller__dialogue-toggle").click();
  await expect(p1.page.locator('[data-role="dialogue"]')).toBeVisible();
  await p1.page.locator(".controller__dialogue-close").click();
  await expect(p1.page.locator('[data-role="dialogue"]')).toBeHidden();

  await expect(p1.page.locator('[data-role="rtt"]')).toBeVisible({
    timeout: 12_000,
  });
  await expect(p1.page.locator('[data-role="rtt"]')).toContainText("RTT");

  const p1Start = await playerX(page, "p1");
  await holdTouch(p1.page, "move-right", 450);
  expect(await playerX(page, "p1")).toBeGreaterThan(p1Start + 2);

  const p2Start = await playerX(page, "p2");
  await holdTouch(p2.page, "move-right", 450);
  expect(await playerX(page, "p2")).toBeGreaterThan(p2Start + 2);

  const overlay = page.locator(".overlay--host-run");
  await p1.page.close();
  await expect(overlay).toBeVisible({ timeout: 20_000 });
  await expect(overlay.locator(".overlay__title")).toHaveText(
    "P1 disconnected",
  );
  await expect(overlay.getByRole("button", { name: "Wait for reconnect" }))
    .toBeDisabled();
  await expect(
    overlay.getByRole("button", { name: "Continue P1 with keyboard" }),
  ).toBeVisible();
  await expect(p2.page.locator(".controller--board")).toHaveAttribute(
    "data-state",
    "paused",
  );

  const p1Reconnect = await openController(phone, p1Url, "p1");
  await expect(
    overlay.getByRole("button", { name: "Resume" }),
  ).toBeEnabled({ timeout: 20_000 });
  await overlay.getByRole("button", { name: "Resume" }).click();
  await expect(overlay).toBeHidden();
  await page.waitForTimeout(200);

  const reconnectStart = await playerX(page, "p1");
  await holdTouch(p1Reconnect.page, "move-right", 450);
  expect(await playerX(page, "p1")).toBeGreaterThan(reconnectStart + 2);

  // Close the same slot again and take the keyboard fallback. The run must
  // resume without the missing-controller freeze.
  await p1Reconnect.page.close();
  await expect(overlay).toBeVisible({ timeout: 20_000 });
  await overlay
    .getByRole("button", { name: "Continue P1 with keyboard" })
    .click();
  await expect(overlay).toBeHidden();

  await page.locator("#game-root canvas").focus();
  const keyboardStart = await playerX(page, "p1");
  await page.keyboard.down("a");
  await page.waitForTimeout(400);
  await page.keyboard.up("a");
  await page.waitForTimeout(120);
  expect(await playerX(page, "p1")).toBeLessThan(keyboardStart - 2);

  // End the session from the overlay after a reconnect, then verify the hub
  // reset and the controller's clean session-end.
  await p2.page.close();
  await expect(overlay).toBeVisible({ timeout: 20_000 });
  await expect(overlay.locator(".overlay__title")).toHaveText(
    "P2 disconnected",
  );
  const p2Reconnect = await openController(phone, p2Url, "p2");
  await expect(
    overlay.getByRole("button", { name: "Resume" }),
  ).toBeEnabled({ timeout: 20_000 });
  await overlay.getByRole("button", { name: "End session" }).click();

  await page.waitForFunction(() => {
    const app = (window as ShrinkonautsWindow).__shrinkonauts;
    return app?.phase === "hub" && app?.game?.scene.isActive("hub") === true;
  });
  await expect(page.locator(".hub__title")).toHaveText("The bathroom");
  await expect(
    page.locator('.hub__input-slot[data-slot="p1"] input[value="keyboard"]'),
  ).toBeChecked();
  await expect(
    page.locator('.hub__input-slot[data-slot="p2"] input[value="keyboard"]'),
  ).toBeChecked();
  await expect(page.locator(".hub__controller")).toBeHidden();

  await expect(p2Reconnect.page.locator(".controller--join")).toBeVisible();
  await expect(
    p2Reconnect.page.locator('[data-role="join-message"]'),
  ).toContainText(/host ended/i);

  expect(p1.errors).toEqual([]);
  expect(p2.errors).toEqual([]);
  expect(p1Reconnect.errors).toEqual([]);
  expect(p2Reconnect.errors).toEqual([]);
  expect(hostErrors).toEqual([]);
  await phone.close();
});

test("Use keyboard instead closes only the chosen slot and keeps the room", async ({
  browser,
  page,
}) => {
  const hostErrors = collectConsoleErrors(page);
  const { room, p1Url } = await bootHostWithPhones(page);

  const phone = await browser.newContext({
    viewport: { width: 844, height: 390 },
    isMobile: true,
    hasTouch: true,
    deviceScaleFactor: 2,
  });
  const p1 = await openController(phone, p1Url, "p1");
  await expect(
    page.locator('.hub__controller-slot[data-slot="p1"]'),
  ).toHaveAttribute("data-status", "ready", { timeout: 20_000 });

  const p1Row = page.locator('.hub__input-slot[data-slot="p1"]');
  await p1Row.getByText("Keyboard", { exact: true }).click();

  await expect(
    page.locator('.hub__controller-slot[data-slot="p1"]'),
  ).toHaveCount(0);
  await expect(
    page.locator('.hub__controller-slot[data-slot="p2"]'),
  ).toBeVisible();
  await expect(page.locator(".hub__controller-code")).toHaveText(room);

  await expect(p1.page.locator(".controller--join")).toBeVisible();
  await expect(
    p1.page.locator('[data-role="join-message"]'),
  ).toContainText(/keyboard/i);

  // The remaining P2 phone still owns the original room and can start.
  const p2 = await joinControllerWithCode(phone, room, "p2");
  await expect(
    page.locator('.hub__controller-slot[data-slot="p2"]'),
  ).toHaveAttribute("data-status", "ready", { timeout: 20_000 });
  await expect(
    page.getByRole("button", { name: /Start cycle|Continue/ }),
  ).toBeEnabled();

  expect(p1.errors).toEqual([]);
  expect(p2.errors).toEqual([]);
  expect(hostErrors).toEqual([]);
  await phone.close();
});
