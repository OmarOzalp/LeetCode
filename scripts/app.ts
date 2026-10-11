/**
 * One command to use the app day to day:
 *
 *   npm run app
 *
 * Builds the web UI if it is missing or out of date, starts the server on
 * http://localhost:3001 and opens it in your browser. Press Ctrl+C to stop.
 */
import { spawn, spawnSync } from "node:child_process";
import { existsSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const port = Number(process.env.PORT ?? 3001);
const url = `http://localhost:${port}`;

function newestMtime(p: string): number {
  if (!existsSync(p)) return 0;
  const st = statSync(p);
  if (!st.isDirectory()) return st.mtimeMs;
  let max = st.mtimeMs;
  for (const name of readdirSync(p)) max = Math.max(max, newestMtime(path.join(p, name)));
  return max;
}

const built = path.join(root, "dist", "index.html");
const sourceTime = Math.max(...["src", "shared", "index.html", "vite.config.ts", "package.json"].map((p) => newestMtime(path.join(root, p))));
if (!existsSync(built) || statSync(built).mtimeMs < sourceTime) {
  console.log("Building the app (only needed after an update)…");
  const res = spawnSync("npm", ["run", "build"], { cwd: root, stdio: "inherit", shell: process.platform === "win32" });
  if (res.status !== 0) process.exit(res.status ?? 1);
}

function openBrowser(target: string) {
  const cmd = process.platform === "darwin" ? "open" : process.platform === "win32" ? "cmd" : "xdg-open";
  const args = process.platform === "win32" ? ["/c", "start", "", target] : [target];
  try {
    spawn(cmd, args, { stdio: "ignore", detached: true }).unref();
  } catch {
    // No browser launcher available; the URL is printed below.
  }
}

async function waitForServer(): Promise<boolean> {
  for (let i = 0; i < 60; i++) {
    try {
      const res = await fetch(`${url}/api/health`);
      if (res.ok) return true;
    } catch {
      // not up yet
    }
    await new Promise((r) => setTimeout(r, 250));
  }
  return false;
}

process.env.NODE_ENV = "production";
process.env.PORT = String(port);
await import("../server/index.ts");
if (await waitForServer()) {
  console.log(`\n  Blind 75 Studio is running at ${url}\n  (opening your browser — press Ctrl+C here to stop)\n`);
  if (!process.env.NO_OPEN) openBrowser(url);
}
