import { expect, test } from "@playwright/test";
import {
  boot,
  bootHub,
  bootSilicon,
  closeOverlay,
  collectFailedResponses,
  teleport,
  waitForRoom,
  type ShrinkonautsWindow,
} from "../support";
import {
  captureShot,
  missingCaptureIds,
  resetCaptures,
  waitForLaunchPhase,
  withCss,
  withHiddenHud,
} from "./capture";

test.describe.configure({ mode: "serial" });

test.beforeAll(() => {
  resetCaptures();
});

test.afterAll(() => {
  expect(missingCaptureIds()).toEqual([]);
});

test("hub: default, settings and Silicon selection", async ({ page }) => {
  const failed = collectFailedResponses(page);
  const errors = await bootHub(page);
  await captureShot(page, "hub-default");

  await page.locator(".hub__summary", { hasText: "Settings" }).click();
  const settings = page.locator(".hub__details", { hasText: "Settings" });
  await settings.getByRole("button", { name: "125%" }).click();
  await settings.getByRole("button", { name: "Off", exact: true }).click();
  await expect(settings.getByRole("button", { name: "On", exact: true })).toBeVisible();
  await captureShot(page, "hub-settings");

  // Reset the accessibility settings before the selection shot.
  await settings.getByRole("button", { name: "100%" }).click();
  await settings.getByRole("button", { name: "On", exact: true }).click();
  await expect(settings.getByRole("button", { name: "Off", exact: true })).toBeVisible();
  await page.locator(".hub__summary", { hasText: "Settings" }).click();

  await page.locator(".hub-card", { hasText: "Silicon" }).click();
  await expect(page.locator(".hub-card", { hasText: "Silicon" })).toHaveAttribute(
    "data-selected",
    "true",
  );
  await captureShot(page, "hub-silicon-selected");

  expect(errors).toEqual([]);
  expect(failed).toEqual([]);
});

test("hub: placeholder comparison", async ({ page }) => {
  const failed = collectFailedResponses(page);
  const errors = await bootHub(page, {
    search: "/?assets=placeholder",
    assetMode: "Placeholder assets",
  });
  await captureShot(page, "hub-placeholder");
  expect(errors).toEqual([]);
  expect(failed).toEqual([]);
});

test("launch: spin and shrink", async ({ page }) => {
  const failed = collectFailedResponses(page);
  const errors = await bootHub(page);
  await page.getByRole("button", { name: "Start cycle" }).click();
  await expect(page.getByRole("button", { name: "Skip launch" })).toBeVisible();

  await waitForLaunchPhase(page, "spin");
  await captureShot(page, "launch-spin");

  await waitForLaunchPhase(page, "shrink");
  await captureShot(page, "launch-shrink");

  const skip = page.getByRole("button", { name: "Skip launch" });
  if (await skip.isVisible()) await skip.click();
  await waitForRoom(page, "room-nerve-forest");
  expect(errors).toEqual([]);
  expect(failed).toEqual([]);
});

test("03 Nerve Forest and 04 Muscle Effector", async ({ page }) => {
  const failed = collectFailedResponses(page);
  const errors = await boot(page);
  await captureShot(page, "03-coop-wide");
  await withHiddenHud(page, () => captureShot(page, "key-art-03"));

  // Neuron Keeper conversation.
  await teleport(page, "agent-neuron");
  await expect(page.locator(".hud__prompt")).toContainText("Talk to Neuron Keeper");
  await page.keyboard.press("e");
  const bubble = page.locator(".feedback-surface--speechBubble");
  await expect(bubble).toContainText("You are inside a neuron");
  await captureShot(page, "03-dialogue-neuron");

  await page.keyboard.press("e");
  await expect(bubble).toContainText("A neuron does not fire for every nudge");
  await page.keyboard.press("e");
  await expect(bubble).toContainText("Two inputs are enough here");
  await page.keyboard.press("e");
  await expect(bubble).toContainText("Quick check");
  await page
    .getByRole("button", { name: "A full-size spike fires and travels one way" })
    .click();
  await expect(bubble).toContainText("Exactly.");
  await page.keyboard.press("e");
  await expect(bubble).toHaveCount(0);

  // Scan, concept log and map.
  await teleport(page, "scan-pathway");
  await page.keyboard.press("q");
  await expect(
    page.locator(".feedback-surface", {
      hasText: "All-or-none and one-way conduction",
    }),
  ).toBeVisible();
  await captureShot(page, "03-scan-feedback");

  await page.keyboard.press("c");
  await expect(page.getByRole("dialog", { name: "Concept log" })).toBeVisible();
  await expect(
    page.locator(".concept__term", { hasText: "Sensory and motor pathways" }),
  ).toBeVisible();
  await captureShot(page, "03-concept-log");
  await closeOverlay(page, "overlay--concept-log");

  await page.keyboard.press("Tab");
  await expect(page.getByRole("dialog", { name: "Blueprint" })).toBeVisible();
  await captureShot(page, "03-map");
  await closeOverlay(page, "overlay--map");

  // The scan cue is still on screen for a few seconds. Let it expire so the
  // Node Run shots show the puzzle feedback, not the previous scan.
  await expect(
    page.locator(".feedback-surface", {
      hasText: "All-or-none and one-way conduction",
    }),
  ).toHaveCount(0, { timeout: 6_000 });

  // Physical threshold gate, then the two Node Run threshold states.
  await teleport(page, { x: 15.5 * 32, y: 14 * 32 });
  await expect(
    page.locator('[data-surface-id="fb:barrier:threshold-gate"]'),
  ).toHaveAttribute("data-state", "idle");
  await captureShot(page, "03-threshold-gate");

  await teleport(page, "pad-input-a", { x: 120, y: 640 });
  await expect(
    page.locator('[data-surface-id="fb:binary:input-a"]'),
  ).toHaveAttribute("data-state", "active");
  await captureShot(page, "03-node-run-input");

  await teleport(page, "pad-input-a", "pad-input-b");
  await expect(
    page.locator('[data-surface-id="fb:barrier:threshold-gate"]'),
  ).toHaveAttribute("data-state", "active");
  await captureShot(page, "03-node-run-threshold");

  await teleport(page, "pad-terminal", "pad-input-b");
  await expect(
    page.locator('[data-surface-id="fb:barrier:gate-exit"]'),
  ).toHaveAttribute("data-state", "active");
  await captureShot(page, "03-node-run-exit-open");

  // The 03 debrief is reached by placing both players on the exit.
  await page.evaluate(() => {
    const runtime = (window as ShrinkonautsWindow).__shrinkonauts?.runtime;
    if (!runtime) throw new Error("runtime bridge is missing");
    const exit = runtime.entityPixel("exit-nerve");
    if (!exit) throw new Error("exit-nerve is missing");
    runtime.placePlayer("p1", exit.x, exit.y + 48);
    runtime.placePlayer("p2", exit.x - 32, exit.y + 48);
  });
  await expect(page.getByRole("dialog", { name: "Debrief" })).toBeVisible();
  await captureShot(page, "03-debrief-prompt");

  await page
    .getByRole("textbox")
    .fill(
      "One input is below threshold, so no spike fires. Two inputs reach threshold and the spike is all-or-none; it travels one way along the axon to the terminal.",
    );
  await page.getByRole("button", { name: "Record answer" }).click();
  await expect(page.locator(".debrief__answer").first()).toHaveValue(/threshold/);
  await captureShot(page, "03-debrief-filled");

  await page.getByRole("button", { name: "Finish level" }).click();
  await expect(page.locator(".hud__title")).toHaveText("Muscle Effector");
  await waitForRoom(page, "room-muscle-effector");

  await captureShot(page, "04-wide");
  await withHiddenHud(page, () => captureShot(page, "key-art-04"));

  await teleport(page, "motor-terminal");
  await expect(page.locator(".hud__prompt")).toContainText("Start Endplate Ferry");
  await page.keyboard.press("e");
  await expect(page.locator(".hud__meta")).toContainText("Endplate Ferry");
  await captureShot(page, "04-ferry-active");

  // P1 opens the Ca2+ window before P2 carries the packet.
  await teleport(page, "pad-terminal");
  await page.waitForTimeout(1500);

  await teleport(page, "ach-packet");
  await page.keyboard.press("'");
  await expect(page.locator(".hud__abilities")).toContainText("(carrying)");
  await captureShot(page, "04-ach-carry");

  await teleport(page, "nicotinic-receptor");
  await expect(page.locator(".hud__prompt")).toContainText("Place ACh packet");
  await captureShot(page, "04-nicotinic-receptor");
  await page.keyboard.press("'");
  await expect(page.locator(".hud__abilities")).not.toContainText("(carrying)");

  await teleport(page, "motor-terminal");
  await page.keyboard.press("f");
  // The pulse resolves on the next simulation tick. Request the feedback only
  // after the puzzle has solved, otherwise `q` reveals the earlier pulse cue.
  await expect(page.locator(".hud__meta")).toContainText("Endplate Ferry ✓");
  await page.keyboard.press("q");
  await expect(page.locator(".feedback-surface--screenCaption")).toContainText(
    "Signal restored",
  );
  await captureShot(page, "04-pulse-muscle-wave");
  await expect(
    page.locator('.feedback-surface[data-surface-id="fb:carrier:ach-packet"]'),
  ).toContainText("ACh packet cleared", { timeout: 6_000 });

  await page.evaluate(() => {
    const runtime = (window as ShrinkonautsWindow).__shrinkonauts?.runtime;
    if (!runtime) throw new Error("runtime bridge is missing");
    const exit = runtime.entityPixel("exit-muscle");
    if (!exit) throw new Error("exit-muscle is missing");
    // The exit lever stands on the chamber dais; place the player inside the
    // exit trigger cell directly above it.
    runtime.placePlayer("p1", exit.x, exit.y - 16);
  });
  await expect(page.getByRole("dialog", { name: "Debrief" })).toBeVisible();
  await captureShot(page, "04-debrief-prompt");

  await page
    .getByRole("textbox")
    .fill(
      "The action potential opens Ca2+ channels; Ca2+ triggers vesicle release. ACh crosses the cleft and binds nicotinic receptors on the muscle, so the muscle responds. AChE breaks down ACh to end the signal.",
    );
  await page.getByRole("button", { name: "Record answer" }).click();
  await page.getByRole("button", { name: "Finish level" }).click();
  await expect(page.getByRole("dialog", { name: "Level complete" })).toBeVisible();
  await captureShot(page, "04-level-complete");

  expect(errors).toEqual([]);
  expect(failed).toEqual([]);
});

test("Silicon Interrupt Loop", async ({ page }) => {
  const failed = collectFailedResponses(page);
  const errors = await bootSilicon(page);
  await captureShot(page, "silicon-wide");
  await withHiddenHud(page, () => captureShot(page, "key-art-silicon"));

  await teleport(page, "agent-cpu");
  await expect(page.locator(".hud__prompt")).toContainText("Talk to CPU Core");
  await page.keyboard.press("e");
  const bubble = page.locator(".feedback-surface--speechBubble");
  await expect(bubble).toContainText("You are on the interrupt board");
  await captureShot(page, "silicon-cpu-dialogue");

  await page.keyboard.press("e");
  await expect(bubble).toContainText("A sensor does not shout directly at the CPU");
  await page.keyboard.press("e");
  await expect(bubble).toContainText("Find the controller socket");
  await page.keyboard.press("e");
  await expect(bubble).toContainText("Which part is the integration point?");
  await page
    .getByRole("button", { name: "The interrupt controller" })
    .click();
  await expect(bubble).toContainText("Exactly.");
  await page.keyboard.press("e");
  await expect(bubble).toContainText("Start at the sensor console");
  await page.keyboard.press("e");
  await expect(bubble).toHaveCount(0);

  await teleport(page, "sensor-console");
  await expect(page.locator(".hud__prompt")).toContainText("Start Interrupt Loop");
  await page.keyboard.press("e");
  await expect(page.locator(".hud__meta")).toContainText("Interrupt Loop");

  await teleport(page, "pad-sensor");
  await teleport(page, "route-plug");
  await page.keyboard.press("'");
  await expect(page.locator(".hud__abilities")).toContainText("(carrying)");
  await captureShot(page, "silicon-interrupt-puzzle");

  await teleport(page, "transfer-console");
  await expect(page.locator(".hud__prompt")).toContainText("Open Transfer console");
  await page.keyboard.press("e");
  await expect(page.getByRole("dialog", { name: "Concept gate" })).toBeVisible();
  await captureShot(page, "silicon-concept-gate");

  expect(errors).toEqual([]);
  expect(failed).toEqual([]);
});

test("solo, text scale and reduced motion", async ({ page }) => {
  const failed = collectFailedResponses(page);
  const errors = await bootHub(page);
  await page.locator(".hub__mode", { hasText: "Solo" }).click();
  await page.getByRole("button", { name: "Start cycle" }).click();
  await expect(page.getByRole("button", { name: "Skip launch" })).toBeVisible();
  await page.getByRole("button", { name: "Skip launch" }).click();
  await page.waitForFunction(() => {
    const app = (window as ShrinkonautsWindow).__shrinkonauts;
    return Boolean(app?.runtime) && app?.game?.scene.isActive("room") === true;
  });
  await waitForRoom(page, "room-nerve-forest");
  await expect(page.locator(".hud__meta")).toContainText("solo");

  await teleport(page, "agent-neuron");
  await captureShot(page, "03-solo");

  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog", { name: "Paused" })).toBeVisible();
  await page.getByRole("button", { name: "125%" }).click();
  await withCss(
    page,
    ".pause__diagnostics { display: none !important; }",
    () => captureShot(page, "text-scale-125"),
  );

  await page.getByRole("button", { name: "Off", exact: true }).click();
  await expect(page.getByRole("button", { name: "On", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Resume" }).click();
  await expect(page.locator(".overlay--pause")).toHaveCount(0);

  await teleport(page, "pad-input-a", { x: 120, y: 640 });
  await page.keyboard.press("q");
  const caption = page.locator(
    '.feedback-surface--playerCaption[data-owner="p1"]',
  );
  await expect(caption).toHaveCount(1);
  await expect(caption).toBeVisible();
  await expect(caption).toContainText("P1:");
  await expect
    .poll(() =>
      page.evaluate(() => document.documentElement.dataset.reducedMotion),
    )
    .toBe("true");
  await captureShot(page, "reduced-motion");

  expect(errors).toEqual([]);
  expect(failed).toEqual([]);
});
