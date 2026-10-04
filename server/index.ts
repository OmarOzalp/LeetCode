import path from "node:path";
import { fileURLToPath } from "node:url";
import { createApp } from "./app.ts";
import { getDataset } from "./problems/loader.ts";
import { detectPython } from "./runner/python.ts";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const production = process.env.NODE_ENV === "production";
const port = Number(process.env.PORT ?? process.env.API_PORT ?? 3001);
const host = process.env.HOST ?? "127.0.0.1";
const dataDir = path.resolve(process.env.BLIND75_DATA_DIR ?? path.join(root, ".data"));

const { app, store } = createApp({
  dataDir,
  staticDir: production ? path.join(root, "dist") : undefined,
});

const server = app.listen(port, host, () => {
  const py = detectPython();
  const ds = getDataset();
  console.log(`[api] listening on http://${host}:${port}${production ? "  (open this URL in your browser)" : ""}`);
  console.log(`[api] ${ds.order.length}/75 problems loaded · progress file: ${store.file}`);
  if (py) console.log(`[api] Python ${py.version} (${[py.command, ...py.args].join(" ")})`);
  else console.warn("[api] WARNING: Python 3.8+ not found. Install Python 3 or set PYTHON=/path/to/python3 to run tests.");
});

function shutdown() {
  store.flush();
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(0), 500).unref();
}
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
