import { spawn, spawnSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
export const RUNNER_ENTRY = path.join(here, "py", "main.py");
const RECORD_PREFIX = "\x1e";

export interface PythonInfo {
  command: string;
  args: string[];
  version: string;
}

let cached: PythonInfo | null | undefined;

/** Find a usable Python 3.8+ interpreter (PYTHON env var, python3, python, py -3). */
export function detectPython(): PythonInfo | null {
  if (cached !== undefined) return cached;
  const candidates: Array<[string, string[]]> = [];
  if (process.env.PYTHON) candidates.push([process.env.PYTHON, []]);
  candidates.push(["python3", []], ["python", []]);
  if (process.platform === "win32") candidates.push(["py", ["-3"]]);
  for (const [command, args] of candidates) {
    try {
      const res = spawnSync(command, [...args, "-c", "import sys; print('%d.%d.%d' % sys.version_info[:3])"], {
        encoding: "utf8",
        timeout: 5000,
      });
      if (res.status === 0) {
        const version = res.stdout.trim();
        const [major, minor] = version.split(".").map(Number);
        if (major === 3 && minor >= 8) {
          cached = { command, args, version };
          return cached;
        }
      }
    } catch {
      // try next candidate
    }
  }
  cached = null;
  return cached;
}

export type PyRecord = { type: string; [key: string]: unknown };

export interface PythonRunResult {
  records: PyRecord[];
  /** Output that was not a protocol record (stray prints, interpreter crashes). */
  strayStdout: string;
  stderr: string;
  /** The process was killed by the Node-side watchdog. */
  killed: boolean;
  exitCode: number | null;
}

export class PythonUnavailableError extends Error {
  constructor() {
    super(
      "Python 3.8+ was not found. Install Python 3 and make sure `python3` (or `python`) is on your PATH, or set the PYTHON environment variable.",
    );
  }
}

/**
 * Run the Python runner with a JSON payload. Records are streamed to `onRecord`
 * as they arrive and also collected. The process is killed after `timeoutMs`.
 */
export function runPython(
  payload: Record<string, unknown>,
  opts: { timeoutMs: number; onRecord?: (r: PyRecord) => void },
): Promise<PythonRunResult> {
  const py = detectPython();
  if (!py) return Promise.reject(new PythonUnavailableError());

  const workdir = mkdtempSync(path.join(tmpdir(), "blind75-run-"));
  return new Promise((resolve, reject) => {
    const child = spawn(py.command, [...py.args, "-I", "-X", "utf8", RUNNER_ENTRY], {
      cwd: workdir,
      env: {
        PATH: process.env.PATH ?? "",
        SYSTEMROOT: process.env.SYSTEMROOT ?? "",
        PYTHONIOENCODING: "utf-8",
        PYTHONDONTWRITEBYTECODE: "1",
        PYTHONHASHSEED: "0",
      },
      stdio: ["pipe", "pipe", "pipe"],
      windowsHide: true,
    });

    const records: PyRecord[] = [];
    let stray = "";
    let stderr = "";
    let buffer = "";
    let killed = false;
    const MAX_STRAY = 20_000;

    const handleLine = (line: string) => {
      if (line.startsWith(RECORD_PREFIX)) {
        try {
          const rec = JSON.parse(line.slice(1)) as PyRecord;
          records.push(rec);
          opts.onRecord?.(rec);
          return;
        } catch {
          // fall through and treat as stray output
        }
      }
      if (stray.length < MAX_STRAY) stray += line + "\n";
    };

    child.stdout.setEncoding("utf8");
    child.stdout.on("data", (chunk: string) => {
      buffer += chunk;
      let idx: number;
      while ((idx = buffer.indexOf("\n")) >= 0) {
        handleLine(buffer.slice(0, idx));
        buffer = buffer.slice(idx + 1);
      }
    });
    child.stderr.setEncoding("utf8");
    child.stderr.on("data", (chunk: string) => {
      if (stderr.length < MAX_STRAY) stderr += chunk;
    });

    const timer = setTimeout(() => {
      killed = true;
      child.kill("SIGKILL");
    }, opts.timeoutMs);

    child.on("error", (err) => {
      clearTimeout(timer);
      rmSync(workdir, { recursive: true, force: true });
      reject(err);
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      if (buffer) handleLine(buffer);
      rmSync(workdir, { recursive: true, force: true });
      resolve({ records, strayStdout: stray, stderr, killed, exitCode: code });
    });

    child.stdin.on("error", () => {
      // The process may exit before reading all input; the close handler reports it.
    });
    child.stdin.end(JSON.stringify(payload));
  });
}
