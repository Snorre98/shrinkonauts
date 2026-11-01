import { expect, test, type BrowserContext, type Page } from "@playwright/test";

interface ControllerView {
  state: string;
  missingSlots: string[];
  slots: Record<"p1" | "p2", { status: string }>;
}

interface HostBridge {
  phase: string;
  controllerRoomCode: string | null;
  controllerView: ControllerView | null;
  runtime: {
    simulation: {
      players: Record<"p1" | "p2", { x: number }>;
    };
  } | null;
  game: { scene: { isActive(key: string): boolean } } | null;
  setInputPlan(plan: Record<"p1" | "p2", "keyboard" | "controller">): void;
  resumeHostRun(): boolean;
  endHostRun(): void;
}

type ShrinkonautsWindow = Window & {
  __shrinkonauts?: HostBridge;
};

const GAME_RESOURCE =
  /\/(?:packs|hub|audio)\/|assets\.(?:final|placeholder)|\.(?:png|jpe?g|gif|webp|avif|svg|mp3|wav|ogg|m4a|woff2?|ttf|otf)(?:[?#]|$)/i;

async function bootHost(page: Page): Promise<string> {
  await page.goto("/");
  await page.waitForFunction(() => {
    const app = (window as ShrinkonautsWindow).__shrinkonauts;
    return app?.phase === "hub";
  });

  await page.evaluate(() => {
    const app = (window as ShrinkonautsWindow).__shrinkonauts;
    if (!app) throw new Error("host bridge is missing");
    app.setInputPlan({ p1: "controller", p2: "controller" });
  });

  await page.getByRole("button", { name: /Start cycle|Continue/ }).click();
  await expect(page.getByRole("button", { name: "Skip launch" })).toBeVisible();
  await page.getByRole("button", { name: "Skip launch" }).click();

  await page.waitForFunction(
    () => {
      const app = (window as ShrinkonautsWindow).__shrinkonauts;
      return (
        Boolean(app?.controllerRoomCode) &&
        app?.controllerView?.state === "waiting"
      );
    },
    undefined,
    { timeout: 30_000 },
  );

  const room = await page.evaluate(
    () => (window as ShrinkonautsWindow).__shrinkonauts?.controllerRoomCode ?? "",
  );
  expect(room).toMatch(/^[A-Z2-9]{6}$/);
  return room;
}

async function openController(
  context: BrowserContext,
  room: string,
  slot: "p1" | "p2",
): Promise<{ page: Page; requests: string[]; errors: string[] }> {
  const page = await context.newPage();
  const requests: string[] = [];
  const errors: string[] = [];
  page.on("request", (request) => requests.push(request.url()));
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto(`/controller.html#room=${room}&slot=${slot}`);
  await expect(page.locator('[data-role="slot"]')).toHaveText(
    slot.toUpperCase(),
  );
  await expect(page.locator(".controller--board")).toHaveAttribute(
    "data-state",
    "ready",
  );
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

test("two phones join, control their slots, reconnect, and end cleanly", async ({
  browser,
  page,
}) => {
  const room = await bootHost(page);

  const phone = await browser.newContext({
    viewport: { width: 844, height: 390 },
    isMobile: true,
    hasTouch: true,
    deviceScaleFactor: 2,
  });

  const p1 = await openController(phone, room, "p1");

  // P2 joins through the manual six-character fallback instead of the hash URL.
  const p2Page = await phone.newPage();
  const p2Requests: string[] = [];
  const p2Errors: string[] = [];
  p2Page.on("request", (request) => p2Requests.push(request.url()));
  p2Page.on("pageerror", (error) => p2Errors.push(error.message));
  await p2Page.goto("/controller.html");
  await p2Page.locator('input[name="room"]').fill(room);
  await p2Page.locator(".controller__slot-choice", { hasText: "P2" }).click();
  await p2Page.getByRole("button", { name: "Join" }).click();
  await expect(p2Page.locator(".controller--board")).toHaveAttribute(
    "data-state",
    "ready",
  );
  await expect(p2Page).toHaveURL(
    new RegExp(`#room=${room}&slot=p2$`),
  );
  const p2 = { page: p2Page, requests: p2Requests, errors: p2Errors };

  await page.waitForFunction(
    () =>
      (window as ShrinkonautsWindow).__shrinkonauts?.controllerView?.state ===
      "active",
    undefined,
    { timeout: 30_000 },
  );
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

  // Ping/pong reaches the controller and updates the visible RTT readout.
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

  // Closing one phone pauses the host and tells the other controller.
  await p1.page.close();
  await page.waitForFunction(
    () => {
      const app = (window as ShrinkonautsWindow).__shrinkonauts;
      return (
        app?.controllerView?.state === "paused" &&
        app.controllerView.missingSlots.includes("p1")
      );
    },
    undefined,
    { timeout: 20_000 },
  );
  await expect(p2.page.locator(".controller--board")).toHaveAttribute(
    "data-state",
    "paused",
  );

  const p1Reconnect = await openController(phone, room, "p1");
  await page.waitForFunction(
    () => {
      const app = (window as ShrinkonautsWindow).__shrinkonauts;
      return app?.controllerView?.slots.p1.status === "ready";
    },
    undefined,
    { timeout: 20_000 },
  );
  const resumed = await page.evaluate(
    () => (window as ShrinkonautsWindow).__shrinkonauts?.resumeHostRun(),
  );
  expect(resumed).toBe(true);
  await page.waitForFunction(
    () =>
      (window as ShrinkonautsWindow).__shrinkonauts?.controllerView?.state ===
      "active",
    undefined,
    { timeout: 20_000 },
  );

  const reconnectStart = await playerX(page, "p1");
  await holdTouch(p1Reconnect.page, "move-right", 450);
  expect(await playerX(page, "p1")).toBeGreaterThan(reconnectStart + 2);

  await page.evaluate(() => {
    (window as ShrinkonautsWindow).__shrinkonauts?.endHostRun();
  });

  for (const controller of [p1Reconnect.page, p2.page]) {
    await expect(controller.locator(".controller--join")).toBeVisible();
    await expect(
      controller.locator('[data-role="join-message"]'),
    ).toContainText(/host ended/i);
  }

  expect(p1.errors).toEqual([]);
  expect(p2.errors).toEqual([]);
  expect(p1Reconnect.errors).toEqual([]);
  await phone.close();
});
