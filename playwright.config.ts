import { defineConfig } from "@playwright/test";

const PORT = 4173;
const baseURL = `http://127.0.0.1:${PORT}`;

const processEnvironment = Object.fromEntries(
  Object.entries(process.env).filter(([, value]) => value !== undefined),
) as Record<string, string>;

/**
 * M1 browser smoke. Uses the system Chrome installation (`channel: "chrome"`)
 * so CI and local runs never download Playwright's bundled browsers.
 */
export default defineConfig({
  testDir: "./e2e",
  testIgnore: ["controller.spec.ts"],
  timeout: 90_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  workers: 1,
  reporter: [["list"]],
  projects: [
    {
      name: "smoke",
      testIgnore: ["**/capture/**", "**/gallery/**", "**/controller.spec.ts"],
    },
    {
      name: "capture",
      testDir: "./e2e/capture",
      timeout: 180_000,
      use: {
        trace: "off",
        screenshot: "off",
        video: "off",
      },
    },
  ],
  use: {
    baseURL,
    channel: "chrome",
    headless: true,
    viewport: { width: 1280, height: 720 },
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  webServer: {
    command: `npm run dev -- --port ${PORT} --strictPort`,
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: {
      ...processEnvironment,
      // The smoke suite exercises keyboard-only co-op and the missing-relay
      // setup state. The controller suite supplies a real local Worker.
      VITE_NET_URL: "",
    },
  },
});
