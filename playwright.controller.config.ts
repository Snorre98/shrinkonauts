import { defineConfig } from "@playwright/test";

const PORT = 4173;
const WORKER_PORT = 8787;
const baseURL = `http://127.0.0.1:${PORT}`;

const processEnvironment = Object.fromEntries(
  Object.entries(process.env).filter(([, value]) => value !== undefined),
) as Record<string, string>;

/**
 * Two-phone controller smoke. Runs the real local Worker and Vite so the
 * controller page, relay, and host session share one protocol path.
 */
export default defineConfig({
  testDir: "./e2e",
  testMatch: "controller.spec.ts",
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
  webServer: [
    {
      command: `npm run worker:dev -- --port ${WORKER_PORT} --ip 127.0.0.1`,
      port: WORKER_PORT,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
    {
      command: `npm run dev -- --port ${PORT} --strictPort`,
      url: baseURL,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
      env: {
        ...processEnvironment,
        VITE_NET_URL: `ws://127.0.0.1:${WORKER_PORT}`,
      },
    },
  ],
});
