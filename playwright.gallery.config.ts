import { defineConfig } from "@playwright/test";

/**
 * The gallery smoke serves the actual `public/gdd/` output from a tiny static
 * server inside the test. It intentionally does not use the app's Vite server:
 * GitHub Pages serves the generated directory, and Vite's SPA fallback can
 * return the app shell for a path that happens to be a directory.
 */
export default defineConfig({
  testDir: "./e2e/gallery",
  timeout: 60_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  workers: 1,
  reporter: [["list"]],
  use: {
    channel: "chrome",
    headless: true,
    viewport: { width: 1280, height: 720 },
    trace: "off",
    screenshot: "off",
    video: "off",
  },
});
