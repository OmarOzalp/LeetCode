/**
 * One command to use the app day to day:
 *
 *   npm run app                  (or: npm start)
 *   npm run app -- --port 3002   (use another port)
 *
 * Builds the web UI if it is missing or out of date, starts the server on
 * http://localhost:3001 and opens it in your browser. Press Ctrl+C to stop.
 *
 * If the port is already taken it says by what, instead of opening whatever
 * is running there (usually an older copy of the app that is still running).
 */
import { spawn, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { HealthResponse } from "../shared/api.ts";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function portFromArgs(): number {
  const args = process.argv.slice(2);
  const i = args.findIndex((a) => a === "--port" || a.startsWith("--port="));
  const raw = i < 0 ? process.env.PORT : args[i].includes("=") ? args[i].split("=")[1] : args[i + 1];
  const port = Number(raw ?? 3001);
  if (!Number.isInteger(port) || port <= 0 || port > 65535) {
    console.error(`Invalid port: ${raw}`);
    process.exit(1);
  }
  return port;
}

const port = portFromArgs();
const url = `http://localhost:${port}`;
const dataFile = path.join(path.resolve(process.env.BLIND75_DATA_DIR ?? path.join(root, ".data")), "state.json");

/** Content hash of files and folders (relative paths + bytes), so it only changes when the code does. */
function fingerprint(entries: string[]): string {
  const h = createHash("sha1");
  const walk = (rel: string) => {
    const abs = path.join(root, rel);
    if (!existsSync(abs)) return;
    if (statSync(abs).isDirectory()) {
      for (const name of readdirSync(abs).sort()) {
        if (name === "node_modules" || name === "__pycache__" || name.endsWith(".pyc") || name === ".DS_Store") continue;
        walk(path.posix.join(rel, name));
      }
      return;
    }
    h.update(rel).update("\0").update(readFileSync(abs)).update("\0");
  };
  entries.forEach(walk);
  return h.digest("hex");
}

const webId = fingerprint(["src", "shared", "index.html", "vite.config.ts", "package.json", "package-lock.json", "tsconfig.json", "tsconfig.app.json"]);
const appId = createHash("sha1").update(webId).update(fingerprint(["server"])).digest("hex");

// ------------------------------------------------------------ already running?
async function probe(): Promise<HealthResponse | "other" | "free"> {
  try {
    const res = await fetch(`${url}/api/health`, { signal: AbortSignal.timeout(2000) });
    const body = (await res.json().catch(() => null)) as HealthResponse | null;
    return body && typeof body.problemCount === "number" ? body : "other";
  } catch {
    return "free"; // nothing answered; if the port is still taken, the server explains when it tries to listen
  }
}

function openBrowser(target: string) {
  if (process.env.NO_OPEN) return;
  const cmd = process.platform === "darwin" ? "open" : process.platform === "win32" ? "cmd" : "xdg-open";
  const args = process.platform === "win32" ? ["/c", "start", "", target] : [target];
  try {
    const child = spawn(cmd, args, { stdio: "ignore", detached: true });
    child.on("error", () => {}); // no browser launcher (e.g. a bare Linux box): the URL is printed instead
    child.unref();
  } catch {
    // same as above
  }
}

const anotherPort = `npm run app -- --port ${port + 1}`;
const running = await probe();
if (running === "other") {
  console.error(`
  Port ${port} is already being used by another program, so the app can't start there.
  Run it on another port instead:

    ${anotherPort}
`);
  process.exit(1);
}
if (running !== "free") {
  if (running.appId === appId && running.dataFile === dataFile) {
    console.log(`\n  Blind 75 Studio is already running at ${url} (from this folder). Opening it.\n`);
    openBrowser(url);
    process.exit(0);
  }
  const folder = path.basename(path.dirname(running.dataFile)) === ".data" ? path.dirname(path.dirname(running.dataFile)) : running.dataFile;
  const older = running.appId !== appId ? "It's running different code, most likely the older version you started before.\n  " : "";
  console.error(`
  Another copy of Blind 75 Studio is already running at ${url}
  (started from ${folder}).
  ${older}Opening ${url} would show that copy, not this one.

  Stop it, then run npm run app again:
    - Find the Terminal / PowerShell window where it's running and press Ctrl+C,
      or close that window.
    - Can't find it? Restarting your computer stops it too.

  Or run this copy on another port:  ${anotherPort}
`);
  process.exit(1);
}

// ------------------------------------------------------------------ build
const built = path.join(root, "dist", "index.html");
const stamp = path.join(root, "dist", ".build-id");
const builtId = existsSync(built) && existsSync(stamp) ? readFileSync(stamp, "utf8").trim() : "";
if (builtId !== webId) {
  console.log("Building the app (only needed the first time and after an update)…");
  const res = spawnSync("npm", ["run", "build"], { cwd: root, stdio: "inherit", shell: process.platform === "win32" });
  if (res.status !== 0) process.exit(res.status ?? 1);
  writeFileSync(stamp, webId + "\n");
}

// ------------------------------------------------------------------ start
async function waitForServer(): Promise<boolean> {
  for (let i = 0; i < 60; i++) {
    const h = await probe();
    if (h !== "free" && h !== "other" && h.appId === appId) return true;
    await new Promise((r) => setTimeout(r, 250));
  }
  return false;
}

process.env.NODE_ENV = "production";
process.env.PORT = String(port);
process.env.BLIND75_APP_ID = appId;
await import("../server/index.ts");
if (await waitForServer()) {
  console.log(`\n  Blind 75 Studio is running at ${url}\n  (opening your browser — press Ctrl+C here to stop)\n`);
  openBrowser(url);
} else {
  console.error(`\n  The server didn't come up at ${url}. See the messages above.\n`);
  process.exit(1);
}
