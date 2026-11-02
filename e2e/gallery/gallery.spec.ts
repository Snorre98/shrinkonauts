import { expect, test } from "@playwright/test";
import { collectConsoleErrors, collectFailedResponses } from "../support";
import { startGalleryServer, type GalleryServer } from "./static-server";

interface GalleryManifest {
  counts: { captures: number };
  captures: Array<{ file: string; id: string; compareWith?: string }>;
}

let gallery: GalleryServer;

test.beforeAll(async () => {
  gallery = await startGalleryServer();
});

test.afterAll(async () => {
  if (gallery) await gallery.close();
});

test("gallery and walkthrough load with capture assets", async ({
  page,
  request,
}) => {
  const consoleErrors = collectConsoleErrors(page);
  const failedResponses = collectFailedResponses(page);

  await page.goto(`${gallery.url}/index.html`);
  await expect(page.locator("h1")).toHaveText("GDD asset gallery");

  const manifestResponse = await request.get(`${gallery.url}/manifest.json`);
  expect(manifestResponse.ok()).toBeTruthy();
  const manifest = (await manifestResponse.json()) as GalleryManifest;
  expect(manifest.counts.captures).toBe(manifest.captures.length);
  expect(manifest.captures.length).toBeGreaterThan(0);

  for (const capture of manifest.captures) {
    const image = await request.get(`${gallery.url}/${capture.file}`);
    expect(image.ok(), capture.file).toBeTruthy();
  }

  await page.goto(`${gallery.url}/index.html?status=action`);
  await expect(page.locator(".card")).toHaveCount(manifest.captures.length);

  await page.goto(`${gallery.url}/walkthrough.html`);
  await expect(page.locator("h1")).toContainText("Gameplay walkthrough");
  await expect(page.locator(".shot")).toHaveCount(manifest.captures.length);
  await expect(page.getByRole("button", { name: "Copy link" }).first()).toBeVisible();
  await expect(page.locator(".shot img").first()).toBeVisible();
  await expect(page.locator(".compare-grid figure")).toHaveCount(4);

  await page.context().grantPermissions(["clipboard-read", "clipboard-write"], {
    origin: gallery.url,
  });
  await page.getByRole("button", { name: "Copy link" }).first().click();
  await expect(page.getByRole("button", { name: "Copied" })).toBeVisible();
  const copied = await page.evaluate(() => navigator.clipboard.readText());
  expect(copied).toContain("#hub-default");

  await page.getByRole("link", { name: "bg.bathroom.wall" }).first().click();
  await expect(page.locator("#search")).toHaveValue("bg.bathroom.wall");
  await expect(page.locator(".card").first()).toBeVisible();

  expect(consoleErrors).toEqual([]);
  expect(failedResponses).toEqual([]);
});
