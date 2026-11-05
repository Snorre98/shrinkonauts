import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";

const rootDirectory = fileURLToPath(new URL(".", import.meta.url));

export default defineConfig({
  base: "./",
  plugins: [
    VitePWA({
      strategies: "generateSW",
      registerType: "prompt",
      injectRegister: false,
      manifest: false,
      includeAssets: [
        "manifest.webmanifest",
        "controller.webmanifest",
        "icons/*.png",
      ],
      workbox: {
        globPatterns: [
          "**/*.{js,css,html,json,png,webp,svg,mp3,woff2}",
        ],
        // The GDD gallery is a 76 MB design document, not runtime content.
        // The dev fixture is a test fixture the app never boots.
        globIgnores: ["gdd/**", "content/dev/**", "**/*.map"],
        // This is a two-entry static app with no client-side routes. A
        // navigation fallback would hijack /gdd/ pages and controller.html.
        navigateFallback: null,
        directoryIndex: "index.html",
        // Boot flags live in the query string (?skipMenu, ?pack, ?assets).
        // Precache matching must ignore them so offline deep links still boot.
        ignoreURLParametersMatching: [/.*/],
        cleanupOutdatedCaches: true,
        // Keep the worker self-contained so offline startup does not depend
        // on a second Workbox runtime request.
        inlineWorkboxRuntime: true,
        // The game bundle is currently 1.96 MB, just under Workbox's 2 MiB
        // default. Leave headroom for engine growth.
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
      },
      devOptions: {
        enabled: false,
      },
    }),
  ],
  server: {
    host: "127.0.0.1",
    port: 5173,
  },
  build: {
    target: "es2022",
    // Phaser alone is ~1.4 MB unminified-equivalent; M0.1 keeps a single game
    // chunk and does not split engine code yet.
    chunkSizeWarningLimit: 1600,
    rollupOptions: {
      input: {
        game: resolve(rootDirectory, "index.html"),
        controller: resolve(rootDirectory, "controller.html"),
      },
    },
  },
});
