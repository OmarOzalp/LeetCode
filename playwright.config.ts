import { defineConfig } from "@playwright/test";
import os from "node:os";
import path from "node:path";

// The E2E run uses its own ports and a throwaway data directory, so it never
// touches your real progress or a dev server you already have running.
const DATA_DIR = path.join(os.tmpdir(), "blind75-e2e-data");
const WEB_PORT = 5199;
const API_PORT = 3199;

export default defineConfig({
  testDir: "e2e",
  timeout: 90_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  workers: 1,
  reporter: [["list"]],
  use: {
    baseURL: `http://localhost:${WEB_PORT}`,
    viewport: { width: 1440, height: 900 },
    trace: "retain-on-failure",
  },
  webServer: {
    command: `node -e "require('fs').rmSync(process.env.BLIND75_DATA_DIR, { recursive: true, force: true })" && npm run dev`,
    url: `http://localhost:${WEB_PORT}`,
    env: { BLIND75_DATA_DIR: DATA_DIR, WEB_PORT: String(WEB_PORT), API_PORT: String(API_PORT) },
    reuseExistingServer: false,
    timeout: 120_000,
    stdout: "ignore",
  },
});
