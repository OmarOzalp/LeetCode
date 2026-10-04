/// <reference types="vitest/config" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { fileURLToPath, URL } from "node:url";

const API_PORT = Number(process.env.API_PORT ?? 3001);

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      "@shared": fileURLToPath(new URL("./shared", import.meta.url)),
    },
  },
  optimizeDeps: {
    // Pre-bundle deps used only by lazily loaded routes so the first visit
    // doesn't trigger a dependency re-optimization and a failed chunk load.
    include: [
      "monaco-editor/esm/vs/editor/edcore.main",
      "monaco-editor/esm/vs/basic-languages/python/python.contribution",
      "@monaco-editor/react",
      "react-markdown",
      "remark-gfm",
      "prism-react-renderer",
      "react-resizable-panels",
    ],
  },
  server: {
    port: Number(process.env.WEB_PORT ?? 5173),
    proxy: {
      "/api": `http://127.0.0.1:${API_PORT}`,
    },
  },
  build: {
    chunkSizeWarningLimit: 4000,
  },
  test: {
    include: ["src/**/*.test.ts", "shared/**/*.test.ts", "server/**/*.test.ts"],
    testTimeout: 30000,
  },
});
