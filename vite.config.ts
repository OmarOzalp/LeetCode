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
