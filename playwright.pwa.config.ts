import { defineConfig } from "@playwright/test";

const PORT = 4174;
const BASE_PATH = "/shrinkonauts/";
const baseURL = `http://127.0.0.1:${PORT}${BASE_PATH}`;

/**
 * PWA smoke against the production build served under the GitHub Pages
 * subpath. The regular smoke config uses the Vite dev server, where the
 * service worker is intentionally disabled.
 */
export default defineConfig({
  testDir: "./e2e/pwa",
  testMatch: "pwa.spec.ts",
  timeout: 120_000,
  expect: { timeout: 20_000 },
  fullyParallel: false,
  workers: 1,
  reporter: [["list"]],
  use: {
    baseURL,
    channel: "chrome",
    headless: true,
    viewport: { width: 1280, height: 720 },
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  webServer: {
    command: `npx tsx scripts/pwa-preview-server.ts --port ${PORT} --base ${BASE_PATH}`,
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 30_000,
  },
});
