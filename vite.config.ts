import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "prompt",
      manifest: {
        name: "Xinxin · 私人工作空间",
        short_name: "Xinxin",
        lang: "zh-CN",
        description: "通过手机与私人 Agent 一起完成工作",
        theme_color: "#376c62",
        background_color: "#f7f5ef",
        display: "standalone",
        start_url: "/",
        icons: [
          { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
          {
            src: "/icon-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any maskable",
          },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,svg,png,woff2}"],
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
        navigateFallbackDenylist: [/^\/api\//, /^\/health$/],
        cleanupOutdatedCaches: true,
      },
    }),
  ],
  server: {
    watch: {
      ignored: ["**/android/**", "**/.toolchains/**", "**/releases/**"],
    },
    port: 5188,
    strictPort: true,
    proxy: {
      "/api": "http://127.0.0.1:8000",
      "/health": "http://127.0.0.1:8000",
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          editor: ["@tiptap/react", "@tiptap/starter-kit"],
          markdown: ["react-markdown", "remark-gfm"],
        },
      },
    },
  },
});
