import type { Problem } from "../../shared/problemSchema.ts";
import type {
  AnalyzeResponse,
  BenchCell,
  BenchmarkResponse,
  BenchRow,
  CodeFeatures,
  CustomTestInput,
  RunMode,
  RunResponse,
  RuntimeErrorInfo,
  SnippetResponse,
  TestResult,
  TestStatus,
} from "../../shared/api.ts";
import { runPython, type PyRecord } from "./python.ts";

const PER_TEST_LIMIT_S = 2;

interface PlannedTest {
  index: number;
  name: string;
  kind: TestResult["kind"];
  input: Record<string, unknown>;
  expected?: unknown;
  raw?: Record<string, string>;
}

function planTests(problem: Problem, mode: RunMode, custom: CustomTestInput[] = []): PlannedTest[] {
  if (mode === "custom") {
    return custom.map((c, i) => ({
      index: i,
      name: `Custom ${i + 1}`,
      kind: "custom",
      input: {},
      raw: c.values,
    }));
  }
  const tests: PlannedTest[] = problem.examples.map((e, i) => ({
    index: i,
    name: `Example ${i + 1}`,
    kind: "example",
    input: e.input,
    expected: e.output,
  }));
  if (mode === "all") {
    problem.tests.forEach((t, i) => {
      const index = tests.length;
      tests.push({
        index,
        name: t.name ? `Test ${index + 1} · ${t.name}` : `Test ${index + 1}`,
        kind: "hidden",
        input: t.input,
        expected: t.expected,
      });
      void i;
    });
  }
  return tests;
}

function crashMessage(stderr: string, exitCode: number | null): string {
  const tail = stderr.trim().split("\n").slice(-6).join("\n");
  if (exitCode !== null && exitCode < 0) {
    return "The Python process crashed. This usually means extremely deep recursion; try an iterative approach.";
  }
  if (exitCode === 139 || /Segmentation fault|Fatal Python error/i.test(stderr)) {
    return "The Python process crashed (likely from extremely deep recursion). Try an iterative approach.";
  }
  return tail ? `The Python runner stopped unexpectedly:\n${tail}` : "The Python runner stopped unexpectedly.";
}

/** Run a solution against a problem's tests (or custom inputs). */
export async function runTests(
  problem: Problem,
  code: string,
  mode: RunMode,
  custom?: CustomTestInput[],
  opts: { perTestLimitS?: number } = {},
): Promise<RunResponse> {
  const started = Date.now();
  const planned = planTests(problem, mode, custom);
  const perTest = opts.perTestLimitS ?? PER_TEST_LIMIT_S;
  const payload = {
    mode: "test",
    code,
    runner: problem.runner,
    time_limit_s: perTest,
    custom: mode === "custom",
    reference_code: mode === "custom" ? problem.optimal_solution : undefined,
    tests: planned.map((t) => (mode === "custom" ? { index: t.index, raw: t.raw } : { index: t.index, input: t.input, expected: t.expected })),
  };

  const run = await runPython(payload, { timeoutMs: Math.min(60_000, 8_000 + planned.length * (perTest * 1000 + 500)) });
  const byIndex = new Map<number, PyRecord>();
  let loadError: RuntimeErrorInfo | undefined;
  let moduleStdout = "";
  let fatal: string | undefined;
  let done = false;
  for (const rec of run.records) {
    if (rec.type === "result") byIndex.set(rec.index as number, rec);
    else if (rec.type === "load_error") loadError = rec.error as RuntimeErrorInfo;
    else if (rec.type === "loaded") moduleStdout = (rec.stdout as string) ?? "";
    else if (rec.type === "fatal") fatal = String(rec.message);
    else if (rec.type === "done") done = true;
  }

  let firstMissing = true;
  const results: TestResult[] = planned.map((t) => {
    const rec = byIndex.get(t.index);
    if (!rec) {
      const status: TestStatus = run.killed && firstMissing && !loadError ? "timeout" : "not_run";
      firstMissing = false;
      return { index: t.index, name: t.name, kind: t.kind, status, input: t.input, expected: t.expected, hasExpected: t.kind !== "custom" };
    }
    const input = (rec.input as Record<string, unknown>) ?? t.input;
    return {
      index: t.index,
      name: t.name,
      kind: t.kind,
      status: rec.status as TestStatus,
      input,
      expected: rec.has_expected === false ? undefined : (rec.expected ?? t.expected),
      hasExpected: rec.has_expected !== false && (t.kind !== "custom" || rec.has_expected === true),
      output: rec.output,
      runtimeMs: rec.elapsed_ms as number | undefined,
      stdout: (rec.stdout as string) || undefined,
      error: (rec.error as RuntimeErrorInfo | null) ?? null,
      message: (rec.message as string | null) ?? null,
      note: (rec.note as string | null) ?? null,
    };
  });

  const passed = results.filter((r) => r.status === "passed").length;
  let status: RunResponse["status"] = "ok";
  let message: string | undefined;
  if (loadError) status = loadError.kind === "compile" ? "compile_error" : "load_error";
  else if (fatal) {
    status = "internal_error";
    message = fatal;
  } else if (run.killed) {
    status = "timeout";
    message = "Execution stopped: time limit exceeded.";
  } else if (!done) {
    status = "internal_error";
    message = crashMessage(run.stderr, run.exitCode);
  }

  const totalRuntimeMs = results.reduce((s, r) => s + (r.runtimeMs ?? 0), 0);
  return {
    mode,
    status,
    loadError,
    results,
    passed,
    total: results.length,
    allPassed: status === "ok" && results.length > 0 && passed === results.length,
    totalRuntimeMs: Math.round(totalRuntimeMs * 1000) / 1000,
    moduleStdout: moduleStdout || run.strayStdout || undefined,
    message,
    durationMs: Date.now() - started,
  };
}

/** Run user code and the optimal solution on generated inputs of increasing size. */
export async function runBenchmark(problem: Problem, code: string): Promise<BenchmarkResponse> {
  if (!problem.benchmark) {
    return { status: "unsupported", sizeLabel: "n", rows: [], notes: [], message: "No benchmark is defined for this problem." };
  }
  const payload = {
    mode: "benchmark",
    code,
    reference_code: problem.optimal_solution,
    runner: problem.runner,
    generator: problem.benchmark.generator,
    sizes: problem.benchmark.sizes,
    per_run_limit_s: 2.5,
    total_budget_s: 25,
  };
  const run = await runPython(payload, { timeoutMs: 45_000 });
  const rows: BenchRow[] = [];
  const notes: string[] = [];
  let loadError: RuntimeErrorInfo | undefined;
  let fatal: string | undefined;
  for (const rec of run.records) {
    if (rec.type === "bench") {
      rows.push({
        n: rec.n as number,
        user: rec.user as BenchCell,
        reference: rec.reference as BenchCell,
        match: rec.match as boolean | null | undefined,
      });
    } else if (rec.type === "note") notes.push(String(rec.message));
    else if (rec.type === "load_error") loadError = rec.error as RuntimeErrorInfo;
    else if (rec.type === "fatal") fatal = String(rec.message);
  }
  if (run.killed) notes.push("The benchmark was stopped because it exceeded the overall time budget.");
  if (loadError) return { status: "load_error", loadError, sizeLabel: problem.benchmark.size_label, rows, notes };
  if (fatal) return { status: "error", message: fatal, sizeLabel: problem.benchmark.size_label, rows, notes };
  return { status: "ok", sizeLabel: problem.benchmark.size_label, rows, notes };
}

/** Static features for the user's code, the optimal solution and each alternative. */
export async function analyzeSolutions(problem: Problem, code: string): Promise<AnalyzeResponse> {
  const method = problem.runner.kind === "function" ? problem.runner.method : problem.runner.kind === "codec" ? problem.runner.encode : "";
  const codes: Record<string, string> = { user: code, optimal: problem.optimal_solution };
  problem.alternatives.forEach((a, i) => (codes[`alt${i}`] = a.code));
  const run = await runPython({ mode: "analyze", method, codes }, { timeoutMs: 15_000 });
  const rec = run.records.find((r) => r.type === "analysis");
  const results = (rec?.results ?? {}) as Record<string, CodeFeatures>;
  const empty: CodeFeatures = {
    ok: false,
    error: "Analysis failed",
    loop_depth: 0,
    effective_depth: 0,
    loop_count: 0,
    passes: null,
    recursive: false,
    branching_recursion: false,
    memoized: false,
    tags: [],
    costly: [],
    time_estimate: "?",
    space_estimate: "?",
    notes: [],
    lines_of_code: 0,
    is_empty: false,
  };
  return {
    user: results.user ?? empty,
    optimal: results.optimal ?? empty,
    alternatives: problem.alternatives.map((_, i) => results[`alt${i}`] ?? empty),
  };
}

/** Execute a free-form snippet (Docs page examples). */
export async function runSnippet(code: string): Promise<SnippetResponse> {
  const run = await runPython({ mode: "snippet", code, time_limit_s: 5 }, { timeoutMs: 12_000 });
  const rec = run.records.find((r) => r.type === "snippet");
  if (!rec) {
    return {
      stdout: run.strayStdout,
      error: { type: "RunnerError", message: run.killed ? "Execution stopped: time limit exceeded." : crashMessage(run.stderr, run.exitCode), line: null },
    };
  }
  return {
    stdout: (rec.stdout as string) ?? "",
    error: (rec.error as RuntimeErrorInfo | null) ?? null,
    elapsedMs: rec.elapsed_ms as number | undefined,
  };
}
