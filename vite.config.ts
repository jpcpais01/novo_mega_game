import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";
export default defineConfig({
  server: { host: "0.0.0.0", proxy: { "/api": "http://127.0.0.1:3001" } },
  plugins: [
    VitePWA({
      registerType: "prompt",
      injectRegister: null,
      includeAssets: [],
      includeManifestIcons: false,
      manifest: {
        name: "Aetherkin — The Hatchery",
        short_name: "Aetherkin",
        description: "A little essence. A new companion.",
        theme_color: "#171826",
        background_color: "#171826",
        display: "standalone",
        orientation: "portrait",
        start_url: "/",
        scope: "/",
        icons: [
          { src: "/assets/icon-192.png", sizes: "192x192", type: "image/png" },
          {
            src: "/assets/icon-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any maskable",
          },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,png,svg,woff2,webmanifest}"],
        dontCacheBustURLsMatching:
          /assets\/.*-[A-Za-z0-9_-]{8}\.(js|css|woff2)$/,
        navigateFallbackDenylist: [/^\/api\//],
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
      },
    }),
  ],
  build: {
    target: "es2022",
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("pixi.js") || id.includes("@pixi")) return "pixi";
        },
      },
    },
  },
});
