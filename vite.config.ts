import { defineConfig } from "vite";

export default defineConfig({
  base: "./",
  server: {
    host: "127.0.0.1",
    port: 5173,
  },
  build: {
    target: "es2022",
    // Phaser alone is ~1.4 MB unminified-equivalent; M0.1 keeps a single game
    // chunk and does not split engine code yet.
    chunkSizeWarningLimit: 1600,
  },
});
