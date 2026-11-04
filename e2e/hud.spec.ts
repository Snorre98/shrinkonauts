import { expect, test, type Page } from "@playwright/test";
import {
  boot,
  bootSilicon,
  teleport,
  waitForRoom,
  type ShrinkonautsWindow,
} from "./support";

interface GlyphProbe {
  text: string;
  url: string;
  width: number;
  height: number;
}

async function expectImageBackedGlyphs(
  page: Page,
  expectedSymbols: readonly string[],
): Promise<void> {
  const glyphs = page.locator(".hud__blueprint .blueprint__glyph--image");
  await expect(glyphs).toHaveCount(expectedSymbols.length);
  await expect(
    page.locator(
      ".hud__blueprint .blueprint__glyph:not(.blueprint__glyph--image)",
    ),
  ).toHaveCount(0);

  const probes = await glyphs.evaluateAll((nodes): GlyphProbe[] =>
    nodes.map((node) => {
      const background = getComputedStyle(node).backgroundImage;
      const url = background
        .replace(/^url\(["']?/, "")
        .replace(/["']?\)$/, "");
      const box = node.getBoundingClientRect();
      return {
        text: node.textContent ?? "",
        url,
        width: box.width,
        height: box.height,
      };
    }),
  );

  expect(probes.map((probe) => probe.text)).toEqual(
    expectedSymbols.map(() => ""),
  );
  expect(
    probes.map((probe) => new URL(probe.url).pathname.split("/").pop()),
  ).toEqual(expectedSymbols.map((symbol) => `${symbol}.png`));
  for (const probe of probes) {
    expect(probe.url).toContain("/shared/ui/blueprint-symbols/");
    expect(probe.width).toBe(32);
    expect(probe.height).toBe(32);
  }

  const loaded = await page.evaluate(
    async (urls: string[]) =>
      Promise.all(
        urls.map(async (url) => {
          const image = new Image();
          image.src = url;
          await image.decode();
          const canvas = document.createElement("canvas");
          canvas.width = image.naturalWidth;
          canvas.height = image.naturalHeight;
          const context = canvas.getContext("2d");
          if (!context) return null;
          context.drawImage(image, 0, 0);
          return {
            width: image.naturalWidth,
            height: image.naturalHeight,
            cornerAlpha: context.getImageData(0, 0, 1, 1).data[3],
          };
        }),
      ),
    probes.map((probe) => probe.url),
  );

  expect(loaded).toEqual(
    expectedSymbols.map(() => ({
      width: 32,
      height: 32,
      cornerAlpha: 0,
    })),
  );
}

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
  await expect(
    page.locator('.blueprint__component[data-state="active"]'),
  ).toHaveCount(1);

  await page.getByRole("button", { name: "Hint", exact: true }).click();
  await expect(bar.locator(".hud__hint-count")).toHaveText("Hint 1/3");
  await expect(bar.locator(".hud__hint-text")).toContainText(
    "One input is below threshold",
  );
  await expect(
    page.locator('.blueprint__component[data-state="active"]'),
  ).toHaveCount(1);

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

  await page.keyboard.press("p");
  await expect(page.locator(".hud__toast")).toBeVisible();
  const toastGeometry = await page.evaluate(() => {
    const rect = (selector: string) => {
      const node = document.querySelector<HTMLElement>(selector);
      if (!node) return null;
      const box = node.getBoundingClientRect();
      return { top: box.top, bottom: box.bottom };
    };
    return {
      bar: rect(".hud__bar"),
      toast: rect(".hud__toast"),
      card: rect(".hud__controls-card--p1"),
    };
  });
  expect(toastGeometry.toast).not.toBeNull();
  expect(toastGeometry.toast!.top).toBeGreaterThanOrEqual(
    toastGeometry.bar!.bottom,
  );
  expect(toastGeometry.toast!.bottom).toBeLessThanOrEqual(
    toastGeometry.card!.top,
  );

  expect(consoleErrors).toEqual([]);
});

test("player-coded feedback uses the orange and blue player tokens", async ({
  page,
}) => {
  const consoleErrors = await boot(page);

  await teleport(page, "scan-pathway", "scan-neuron");
  await page.keyboard.press("q");
  const p1 = page.locator('.feedback-surface[data-owner="p1"]').first();
  await expect(p1).toBeVisible();
  await expect
    .poll(() =>
      p1.evaluate((node) => {
        const canvas = document.createElement("canvas");
        const context = canvas.getContext("2d");
        if (!context) return null;
        context.fillStyle = getComputedStyle(node).borderTopColor;
        context.fillRect(0, 0, 1, 1);
        const [r, g, b] = context.getImageData(0, 0, 1, 1).data;
        return { r, g, b };
      }),
    )
    .toEqual({ r: 229, g: 155, b: 52 });

  await page.keyboard.press(".");
  const p2 = page.locator('.feedback-surface[data-owner="p2"]').first();
  await expect(p2).toBeVisible();
  await expect
    .poll(() =>
      p2.evaluate((node) => {
        const canvas = document.createElement("canvas");
        const context = canvas.getContext("2d");
        if (!context) return null;
        context.fillStyle = getComputedStyle(node).borderTopColor;
        context.fillRect(0, 0, 1, 1);
        const [r, g, b] = context.getImageData(0, 0, 1, 1).data;
        return { r, g, b };
      }),
    )
    .toEqual({ r: 123, g: 223, b: 242 });

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
  await expect(
    page.getByRole("button", { name: "Open blueprint" }),
  ).toBeVisible();

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

test("authored puzzles render final image-backed blueprint glyphs", async ({
  page,
}) => {
  const anatomyErrors = await boot(page);
  await expectImageBackedGlyphs(page, [
    "input-pair",
    "threshold-gauge",
    "axon-flow",
    "exit-gate",
  ]);

  // Finish Node Run so the 04 header is authoritative.
  await teleport(page, "pad-input-a", "pad-input-b");
  await teleport(page, "pad-terminal", "pad-input-b");
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          (window as ShrinkonautsWindow).__shrinkonauts?.runtime?.snapshot()
            .abilities ?? [],
      ),
    )
    .toContain("signal-dash");
  await page.evaluate(() => {
    const runtime = (window as ShrinkonautsWindow).__shrinkonauts?.runtime;
    if (!runtime) throw new Error("runtime bridge is missing");
    const exit = runtime.entityPixel("exit-nerve");
    if (!exit) throw new Error("exit-nerve is missing");
    runtime.placePlayer("p1", exit.x, exit.y + 48);
    runtime.placePlayer("p2", exit.x - 32, exit.y + 48);
  });
  await expect(page.getByRole("dialog", { name: "Debrief" })).toBeVisible();
  await page
    .getByRole("textbox")
    .fill(
      "One input is below threshold, so no spike fires. Two inputs reach threshold and the spike is all-or-none; it travels one way along the axon to the terminal.",
    );
  await page.getByRole("button", { name: "Record answer" }).click();
  await page.getByRole("button", { name: "Finish level" }).click();
  await expect(page.locator(".hud__title")).toHaveText("Muscle Effector");
  await waitForRoom(page, "room-muscle-effector");
  await teleport(page, "motor-terminal");
  await expect(page.locator(".hud__prompt")).toContainText(
    "Start Endplate Ferry",
  );
  await page.keyboard.press("e");
  await expect(page.locator(".hud__meta")).toContainText("Endplate Ferry");
  await expectImageBackedGlyphs(page, [
    "ca-window",
    "ach-carry",
    "receptor-bind",
    "response-clear",
  ]);

  const siliconErrors = await bootSilicon(page);
  await teleport(page, "sensor-console");
  await expect(page.locator(".hud__prompt")).toContainText(
    "Start Interrupt Loop",
  );
  await page.keyboard.press("e");
  await expect(page.locator(".hud__meta")).toContainText("Interrupt Loop");
  await expectImageBackedGlyphs(page, [
    "sensor-detect",
    "route-integrate",
    "cpu-wake",
    "actuator-gate",
  ]);

  expect(anatomyErrors).toEqual([]);
  expect(siliconErrors).toEqual([]);
});
