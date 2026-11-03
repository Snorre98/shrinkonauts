import { chromium } from "@playwright/test";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const browser = await chromium.launch();
const page = await browser.newPage({
  viewport: { width: 1400, height: 1200 },
  deviceScaleFactor: 1,
});
await page.goto(`file://${join(here, "index.html")}`);
await page.screenshot({
  path: join(here, "scan-silhouette-review.png"),
  fullPage: true,
});
await browser.close();
console.log("wrote scan-silhouette-review.png");
