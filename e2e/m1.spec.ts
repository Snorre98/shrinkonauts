import { expect, test } from "@playwright/test";
import {
  boot,
  closeOverlay,
  teleport,
  waitForRoom,
  type ShrinkonautsWindow,
} from "./support";

test("boots into the vertical slice and finishes conversation, scans, Node Run, Endplate Ferry, debrief", async ({
  page,
}) => {
  const consoleErrors = await boot(page);

  // Boot state: direct into level 03, co-op, two players.
  await expect(page.locator(".hud__eyebrow")).toContainText("03-nerve-forest");
  await expect(page.locator(".hud__meta")).toContainText("co-op");
  await expect(page.locator(".hud__meta")).toContainText("Node Run");
  await expect(
    page.locator(".feedback-beats__item", { hasText: "Press a dendrite input" }),
  ).toBeVisible();
  await expect(
    page.locator(".feedback-surface--stateSwap", {
      hasText: "Dendrite input A is ready.",
    }),
  ).toBeVisible();

  // Conversation.
  await teleport(page, "agent-neuron");
  await expect(page.locator(".hud__prompt")).toContainText("Talk to Neuron Keeper");
  await page.keyboard.press("e");
  await expect(page.locator(".feedback-surface--speechBubble")).toContainText(
    "You are inside a neuron",
  );
  await expect(page.getByRole("dialog", { name: "Dialogue" })).toHaveCount(0);

  await page.keyboard.press("e");
  await expect(page.locator(".feedback-surface--speechBubble")).toContainText(
    "A neuron does not fire for every nudge",
  );
  await page.keyboard.press("e");
  await expect(page.locator(".feedback-surface--speechBubble")).toContainText(
    "Two inputs are enough here",
  );
  await page.keyboard.press("e");
  await expect(page.locator(".feedback-surface--speechBubble")).toContainText(
    "Quick check",
  );
  await page
    .getByRole("button", { name: "A full-size spike fires and travels one way" })
    .click();
  await expect(page.locator(".feedback-surface--speechBubble")).toContainText(
    "Exactly.",
  );
  await page.keyboard.press("e");
  await expect(page.locator(".feedback-surface--speechBubble")).toHaveCount(0);

  // Scan one structure and read it in the concept log.
  await teleport(page, "scan-pathway");
  await page.keyboard.press("q");
  // Wait for the scan cue before opening the log; otherwise both actions land
  // in the same frame and the log transition consumes the scan.
  await expect(
    page.locator(".feedback-surface", {
      hasText: "All-or-none and one-way conduction",
    }),
  ).toBeVisible();
  await page.keyboard.press("c");
  await expect(page.getByRole("dialog", { name: "Concept log" })).toBeVisible();
  await expect(
    page.locator(".concept__term", { hasText: "Sensory and motor pathways" }),
  ).toBeVisible();
  await closeOverlay(page, "overlay--concept-log");

  // Node Run: P1 and P2 press one dendrite input each, then P1 reaches the
  // terminal. The threshold counter and terminal relay open the exit gate.
  await teleport(page, "pad-input-a", "pad-input-b");
  await teleport(page, "pad-terminal", "pad-input-b");
  await page.keyboard.press("q");
  await expect(page.locator(".feedback-surface--screenCaption")).toContainText(
    "Signal restored",
  );
  await expect
    .poll(() =>
      page.evaluate(
        () => (window as ShrinkonautsWindow).__shrinkonauts?.runtime?.snapshot().abilities ?? [],
      ),
    )
    .toContain("signal-dash");

  // Exit together so the co-op tether cannot split the pair.
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

  // ADR-0046 transition: the 03 debrief loads 04 and the room scene restarts.
  await expect(page.locator(".overlay--debrief")).toHaveCount(0);
  await expect(page.locator(".hud__title")).toHaveText("Muscle Effector");
  await expect(page.locator(".hud__eyebrow")).toContainText("04-muscle-effector");
  await waitForRoom(page, "room-muscle-effector");

  // Activate the ferry at the motor terminal.
  await teleport(page, "motor-terminal");
  await expect(page.locator(".hud__prompt")).toContainText("Start Endplate Ferry");
  await page.keyboard.press("e");
  await expect(page.locator(".hud__meta")).toContainText("Endplate Ferry");
  await expect(
    page.locator(".feedback-beats__item", { hasText: "Trigger the terminal" }),
  ).toBeVisible();

  // P1 opens the Ca2+ window.
  await teleport(page, "pad-terminal");
  await page.waitForTimeout(1500);

  // P2 picks up and places the ACh packet.
  await teleport(page, "ach-packet");
  await page.keyboard.press("'");
  await expect(page.locator(".hud__abilities")).toContainText("(carrying)");
  await teleport(page, "nicotinic-receptor");
  await page.keyboard.press("'");
  await expect(page.locator(".hud__abilities")).not.toContainText("(carrying)");

  // P1 pulses the terminal; the Ca gate + receptor relay opens the muscle gate.
  await teleport(page, "motor-terminal");
  await page.keyboard.press("f");
  await expect(page.locator(".hud__meta")).toContainText("Endplate Ferry ✓");
  await page.keyboard.press("q");
  await expect(page.locator(".feedback-surface--screenCaption")).toContainText(
    "Signal restored",
  );
  await expect(
    page.locator('.feedback-surface[data-surface-id="fb:carrier:ach-packet"]'),
  ).toContainText("ACh packet cleared", { timeout: 6_000 });

  await page.evaluate(() => {
    const runtime = (window as ShrinkonautsWindow).__shrinkonauts?.runtime;
    if (!runtime) throw new Error("runtime bridge is missing");
    const exit = runtime.entityPixel("exit-muscle");
    if (!exit) throw new Error("exit-muscle is missing");
    runtime.placePlayer("p1", exit.x, exit.y + 48);
  });
  await expect(page.getByRole("dialog", { name: "Debrief" })).toBeVisible();
  await expect(page.getByRole("dialog", { name: "Level complete" })).toHaveCount(0);

  await page
    .getByRole("textbox")
    .fill(
      "The action potential opens Ca2+ channels; Ca2+ triggers vesicle release. ACh crosses the cleft and binds nicotinic receptors on the muscle, so the muscle responds. AChE breaks down ACh to end the signal.",
    );
  await page.getByRole("button", { name: "Record answer" }).click();
  await page.getByRole("button", { name: "Finish level" }).click();
  await expect(page.getByRole("dialog", { name: "Level complete" })).toBeVisible();
  await expect(page.locator(".overlay__title")).toHaveText("Signal restored");

  const evidence = await page.evaluate(
    () => (window as ShrinkonautsWindow).__shrinkonauts!.runtime!.exportEvidence(),
  );
  expect(evidence.objectives.find((item) => item.id === "OBJ-2")?.requiredMet).toBe(
    true,
  );
  for (const puzzleId of ["puzzle-node-run", "puzzle-endplate-ferry"]) {
    expect(
      evidence.events.some(
        (event) => event.type === "puzzle_solved" && event.puzzleId === puzzleId,
      ),
    ).toBe(true);
  }
  expect(evidence.events.some((event) => event.type === "debrief_completed")).toBe(
    true,
  );

  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export evidence" }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(
    /^shrinkonauts-evidence-.*\.json$/,
  );

  expect(consoleErrors).toEqual([]);
});

test("two players can hold conversations while the other keeps moving", async ({
  page,
}) => {
  const consoleErrors = await boot(page);

  await teleport(page, "agent-neuron");
  await page.keyboard.press("e");
  await expect(page.locator(".feedback-surface--speechBubble")).toHaveCount(1);
  await expect(page.locator('.feedback-surface--speechBubble[data-owner="p1"]')).toBeVisible();

  const before = await page.evaluate(
    () => (window as ShrinkonautsWindow).__shrinkonauts!.runtime!.simulation.players.p2.x,
  );
  await page.keyboard.down("ArrowRight");
  await page.waitForTimeout(250);
  await page.keyboard.up("ArrowRight");
  const after = await page.evaluate(
    () => (window as ShrinkonautsWindow).__shrinkonauts!.runtime!.simulation.players.p2.x,
  );
  expect(after).toBeGreaterThan(before);
  await expect(page.locator(".feedback-surface--speechBubble")).toHaveCount(1);

  await teleport(page, "agent-neuron");
  await page.keyboard.press(",");
  await expect(page.locator(".feedback-surface--speechBubble")).toHaveCount(2);
  await expect(page.locator('.feedback-surface--speechBubble[data-owner="p2"]')).toBeVisible();

  await page.keyboard.press("e");
  await expect(page.locator('.feedback-surface--speechBubble[data-owner="p2"]')).toBeVisible();
  expect(consoleErrors).toEqual([]);
});

test("reduced motion keeps feedback surfaces and text", async ({ page }) => {
  const consoleErrors = await boot(page);

  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog", { name: "Paused" })).toBeVisible();
  await page.getByRole("button", { name: "Off", exact: true }).click();
  await expect
    .poll(() => page.evaluate(() => document.documentElement.dataset.reducedMotion))
    .toBe("true");
  await page.getByRole("button", { name: "Resume" }).click();
  await expect(page.locator(".overlay--pause")).toHaveCount(0);

  await teleport(page, "pad-input-a", { x: 120, y: 640 });
  await page.keyboard.press("q");
  const caption = page.locator('.feedback-surface--playerCaption[data-owner="p1"]');
  await expect(caption).toHaveCount(1);
  await expect(caption).toBeVisible();
  await expect(caption).toContainText("P1:");
  await expect(page.locator(".feedback-live")).toContainText("P1:");
  await expect(
    page.locator(".feedback-beats__item", { hasText: "Press a dendrite input" }),
  ).toBeVisible();

  expect(consoleErrors).toEqual([]);
});

test("shared help is request-only and dismisses after choosing a hint", async ({
  page,
}) => {
  const consoleErrors = await boot(page);

  await expect(
    page.locator(".feedback-surface", { hasText: "Need a nudge?" }),
  ).toHaveCount(0);

  await teleport(page, { x: 960, y: 640 });
  await page.keyboard.press("q");

  const help = page.locator(".feedback-surface--hudStatus", {
    hasText: "Need a nudge?",
  });
  await expect(help).toBeVisible();
  await expect(
    help.getByRole("button", { name: "Show hint" }),
  ).toBeVisible();

  await help.getByRole("button", { name: "Show hint" }).click();
  await expect(help).toHaveCount(0);
  await expect(page.locator(".hud__hint")).toContainText("Hint:");
  expect(consoleErrors).toEqual([]);
});

test("pause settings, checkpoint player toggle, map and mute work from the keyboard", async ({
  page,
}) => {
  const consoleErrors = await boot(page);

  // The default spawn is the entry checkpoint, so P can change players.
  await page.locator("#game-root canvas").click({ position: { x: 60, y: 60 } });
  await page.keyboard.press("p");
  await expect(page.locator(".hud__meta")).toContainText("solo");
  await page.keyboard.press("p");
  await expect(page.locator(".hud__meta")).toContainText("co-op");

  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog", { name: "Paused" })).toBeVisible();

  await page.getByRole("button", { name: "Show puzzle hint" }).click();
  await expect(page.locator(".pause__hint")).toContainText(
    "One input is below threshold. The trigger gate needs a second dendrite input.",
  );

  await page.getByRole("button", { name: "Reset puzzle" }).click();
  await expect(page.locator(".hud__save")).toContainText("Puzzle reset");

  await page.getByRole("button", { name: "125%" }).click();
  await expect
    .poll(() =>
      page.evaluate(() =>
        getComputedStyle(document.documentElement).getPropertyValue("--ui-font-scale").trim(),
      ),
    )
    .toBe("1.25");

  await page.getByRole("button", { name: "Off", exact: true }).click();
  await expect
    .poll(() => page.evaluate(() => document.documentElement.dataset.reducedMotion))
    .toBe("true");

  await page.getByRole("button", { name: "Mute (M)" }).click();
  await expect(page.locator(".hud__audio")).toHaveText("Muted");
  // M is shared, so it must also work while an overlay owns focus.
  await page.keyboard.press("m");
  await expect(page.locator(".hud__audio")).toHaveText("Audio on");

  await page.getByRole("button", { name: "Resume" }).click();
  await expect(page.locator(".overlay--pause")).toHaveCount(0);

  await page.keyboard.press("Tab");
  await expect(page.getByRole("dialog", { name: "System map" })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.locator(".overlay--map")).toHaveCount(0);

  expect(consoleErrors).toEqual([]);
});
