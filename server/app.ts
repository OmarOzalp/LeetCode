import express, { type NextFunction, type Request, type Response } from "express";
import { existsSync } from "node:fs";
import path from "node:path";
import type {
  AppSettings,
  AppState,
  HealthResponse,
  ProblemsResponse,
  ProgressPatch,
  RunRequest,
} from "../shared/api.ts";
import { STATUSES } from "../shared/api.ts";
import { loadDocs } from "./docs/loader.ts";
import { getDataset, toDetail, toSummary } from "./problems/loader.ts";
import { analyzeSolutions, runBenchmark, runSnippet, runTests } from "./runner/judge.ts";
import { detectPython, PythonUnavailableError } from "./runner/python.ts";
import { StateStore } from "./store/stateStore.ts";

const MAX_CODE_LENGTH = 100_000;

/** Limits how many Python processes run at once so a burst of clicks can't overload the machine. */
class Semaphore {
  private queue: Array<() => void> = [];
  private active = 0;
  constructor(private readonly max: number) {}
  async run<T>(fn: () => Promise<T>): Promise<T> {
    if (this.active >= this.max) await new Promise<void>((r) => this.queue.push(r));
    this.active++;
    try {
      return await fn();
    } finally {
      this.active--;
      this.queue.shift()?.();
    }
  }
}

class HttpError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

function requireCode(body: { code?: unknown }): string {
  if (typeof body.code !== "string") throw new HttpError(400, "`code` must be a string");
  if (body.code.length > MAX_CODE_LENGTH) throw new HttpError(413, "Code is too long");
  return body.code;
}

export function createApp(opts: { dataDir: string; staticDir?: string }) {
  const store = new StateStore(opts.dataDir);
  const pool = new Semaphore(3);
  const app = express();
  app.use(express.json({ limit: "5mb" }));

  const problemOr404 = (slug: string) => {
    const p = getDataset().problems.get(slug);
    if (!p) throw new HttpError(404, `Unknown problem: ${slug}`);
    return p;
  };

  app.get("/api/health", (_req, res) => {
    const py = detectPython();
    const body: HealthResponse = {
      ok: true,
      python: py ? { available: true, version: py.version, command: [py.command, ...py.args].join(" ") } : { available: false },
      problemCount: getDataset().order.length,
      dataFile: store.file,
    };
    res.json(body);
  });

  // ---------------------------------------------------------------- problems
  app.get("/api/problems", (_req, res) => {
    const ds = getDataset();
    const body: ProblemsResponse = {
      categories: ds.categories,
      problems: ds.order.map((slug, i) => toSummary(ds.problems.get(slug)!, i)),
    };
    res.json(body);
  });

  app.get("/api/problems/:slug", (req, res) => {
    const p = problemOr404(req.params.slug);
    res.json(toDetail(p, getDataset()));
  });

  // ---------------------------------------------------------------- progress
  app.get("/api/state", (_req, res) => {
    res.json(store.get());
  });

  app.patch("/api/progress/:slug", (req, res) => {
    problemOr404(req.params.slug);
    const patch = (req.body ?? {}) as ProgressPatch;
    if (patch.status !== undefined && !STATUSES.includes(patch.status)) throw new HttpError(400, "Invalid status");
    if (patch.confidence !== undefined && patch.confidence !== null && ![1, 2, 3, 4, 5].includes(patch.confidence)) {
      throw new HttpError(400, "Confidence must be 1-5");
    }
    if (patch.code !== undefined && (typeof patch.code !== "string" || patch.code.length > MAX_CODE_LENGTH)) {
      throw new HttpError(400, "Invalid code");
    }
    res.json(store.patchProblem(req.params.slug, patch));
  });

  app.post("/api/progress/:slug/reset", (req, res) => {
    problemOr404(req.params.slug);
    res.json(store.resetProblem(req.params.slug));
  });

  app.patch("/api/settings", (req, res) => {
    const patch = (req.body ?? {}) as Partial<AppSettings>;
    res.json(store.patchSettings(patch));
  });

  app.get("/api/state/export", (_req, res) => {
    const stamp = new Date().toISOString().slice(0, 10);
    res.setHeader("Content-Disposition", `attachment; filename="blind75-progress-${stamp}.json"`);
    res.json(store.get());
  });

  app.post("/api/state/import", (req, res) => {
    const next = req.body as AppState;
    if (!next || typeof next !== "object" || typeof next.problems !== "object") throw new HttpError(400, "Not a progress export file");
    store.replace(next);
    res.json(store.get());
  });

  // ---------------------------------------------------------------- execution
  app.post("/api/run", async (req, res) => {
    const body = req.body as RunRequest;
    const problem = problemOr404(body.slug);
    const code = requireCode(body);
    const mode = body.mode === "examples" || body.mode === "custom" ? body.mode : "all";
    if (mode === "custom" && (!Array.isArray(body.custom) || body.custom.length === 0)) throw new HttpError(400, "No custom tests given");
    const result = await pool.run(() => runTests(problem, code, mode, body.custom?.slice(0, 10)));
    if (mode === "all") result.progress = store.recordRun(problem.slug, code, result);
    else if (mode === "examples") result.progress = store.patchProblem(problem.slug, { code });
    res.json(result);
  });

  app.post("/api/benchmark", async (req, res) => {
    const problem = problemOr404(req.body?.slug);
    const code = requireCode(req.body);
    res.json(await pool.run(() => runBenchmark(problem, code)));
  });

  app.post("/api/analyze", async (req, res) => {
    const problem = problemOr404(req.body?.slug);
    const code = requireCode(req.body);
    res.json(await pool.run(() => analyzeSolutions(problem, code)));
  });

  app.post("/api/snippet", async (req, res) => {
    const code = requireCode(req.body);
    res.json(await pool.run(() => runSnippet(code)));
  });

  // ---------------------------------------------------------------- docs
  app.get("/api/docs", (_req, res) => {
    res.json(loadDocs());
  });

  app.use("/api", (_req, res) => {
    res.status(404).json({ error: "Not found" });
  });

  // ---------------------------------------------------------------- static (production)
  if (opts.staticDir && existsSync(opts.staticDir)) {
    app.use(express.static(opts.staticDir, { index: false, maxAge: "1h" }));
    app.get(/^(?!\/api\/).*/, (_req, res) => {
      res.sendFile(path.join(opts.staticDir!, "index.html"));
    });
  }

  app.use((err: unknown, _req: Request, res: Response, next: NextFunction) => {
    void next;
    if (err instanceof HttpError) {
      res.status(err.status).json({ error: err.message });
      return;
    }
    if (err instanceof PythonUnavailableError) {
      res.status(503).json({ error: err.message, code: "python_unavailable" });
      return;
    }
    console.error(err);
    res.status(500).json({ error: (err as Error)?.message ?? "Internal error" });
  });

  return { app, store };
}
