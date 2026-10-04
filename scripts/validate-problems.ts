/**
 * Validates the problem dataset end to end:
 *   - every YAML file parses and matches the schema
 *   - the optimal solution and every alternative pass all tests
 *   - the starter code does NOT pass (so tests are meaningful)
 *   - the benchmark generator runs and the optimal solution finishes each size
 *   - basic content-quality checks
 *
 * Usage:
 *   npm run validate                      # all problems
 *   npm run validate -- two-sum 3sum      # selected problems
 *   npm run validate -- --no-bench        # skip benchmarks
 */
import path from "node:path";
import { existsSync } from "node:fs";
import { loadDataset, loadProblemFile, PROBLEMS_DIR } from "../server/problems/loader.ts";
import { runBenchmark, runTests } from "../server/runner/judge.ts";
import { detectPython } from "../server/runner/python.ts";
import type { Problem } from "../shared/problemSchema.ts";

const args = process.argv.slice(2);
const noBench = args.includes("--no-bench");
const selected = args.filter((a) => !a.startsWith("--"));

const py = detectPython();
if (!py) {
  console.error("Python 3.8+ not found");
  process.exit(1);
}

interface Report {
  slug: string;
  errors: string[];
  warnings: string[];
}

function qualityWarnings(p: Problem): string[] {
  const w: string[] = [];
  if (p.description.length < 120) w.push("description is very short");
  if (p.explanation.length < 250) w.push("explanation is short");
  if (p.complexity_explanation.length < 60) w.push("complexity_explanation is short");
  if (p.examples.length < 2) w.push("fewer than 2 examples");
  if (p.tests.length < 4) w.push(`only ${p.tests.length} hidden tests`);
  if (!/^O\(/.test(p.time_complexity) || !/^O\(/.test(p.space_complexity)) w.push("complexities should look like O(...)");
  if (p.patterns.length === 0) w.push("no pattern tags");
  if (p.data_structures.length === 0) w.push("no data_structures listed");
  if (!p.benchmark) w.push("no benchmark");
  for (const h of p.hints) if (/```|def |class /.test(h)) w.push("a hint appears to contain code");
  return w;
}

async function validateProblem(p: Problem): Promise<Report> {
  const r: Report = { slug: p.slug, errors: [], warnings: qualityWarnings(p) };
  const check = async (label: string, code: string) => {
    const res = await runTests(p, code, "all", undefined, { perTestLimitS: 6 });
    if (res.status !== "ok") {
      r.errors.push(`${label}: ${res.status} ${res.loadError?.message ?? res.message ?? ""}`.trim());
      return;
    }
    for (const t of res.results) {
      if (t.status !== "passed") {
        const detail =
          t.status === "error"
            ? `${t.error?.type}: ${t.error?.message}`
            : `expected ${JSON.stringify(t.expected)} got ${JSON.stringify(t.output)}${t.message ? ` (${t.message})` : ""}`;
        r.errors.push(`${label} ${t.name} [${t.status}] input=${JSON.stringify(t.input).slice(0, 160)} ${detail.slice(0, 300)}`);
      }
    }
  };
  await check("optimal", p.optimal_solution);
  for (const alt of p.alternatives) await check(`alternative "${alt.name}"`, alt.code);

  const starter = await runTests(p, p.starter_code, "all");
  if (starter.status === "compile_error") r.errors.push(`starter code does not compile: ${starter.loadError?.message}`);
  else if (starter.allPassed) r.errors.push("starter code passes all tests (tests are too weak)");

  if (p.benchmark && !noBench) {
    const b = await runBenchmark(p, p.optimal_solution);
    if (b.status !== "ok") r.errors.push(`benchmark: ${b.status} ${b.loadError?.message ?? b.message ?? ""}`);
    else {
      const sizes = p.benchmark.sizes;
      if (b.rows.length < sizes.length) r.warnings.push(`benchmark only completed ${b.rows.length}/${sizes.length} sizes`);
      for (const row of b.rows) {
        if (row.reference.status !== "ok") r.errors.push(`benchmark n=${row.n}: reference ${row.reference.status} ${row.reference.error ?? ""}`);
        if (row.match === false) r.errors.push(`benchmark n=${row.n}: optimal vs optimal mismatch (nondeterministic generator/compare?)`);
      }
      const last = b.rows[b.rows.length - 1];
      if (last?.reference.ms && last.reference.ms > 1500) r.warnings.push(`largest benchmark size is slow for the optimal solution (${last.reference.ms.toFixed(0)} ms)`);
    }
  }
  return r;
}

async function main() {
  const ds = loadDataset();
  let problems: Problem[];
  const loadErrors: string[] = [];
  if (selected.length) {
    problems = [];
    for (const slug of selected) {
      const file = path.join(PROBLEMS_DIR, `${slug}.yaml`);
      if (!existsSync(file)) {
        loadErrors.push(`${slug}: file not found`);
        continue;
      }
      const { problem, issue } = loadProblemFile(file);
      if (issue) loadErrors.push(`${issue.file}: ${issue.message}`);
      else problems.push(problem!);
    }
  } else {
    problems = ds.order.map((s) => ds.problems.get(s)!);
    for (const i of ds.issues) loadErrors.push(`${i.file}: ${i.message}`);
    const ids = new Map<string, string>();
    for (const p of problems) {
      if (ids.has(p.id)) loadErrors.push(`duplicate id ${p.id} (${ids.get(p.id)} and ${p.slug})`);
      ids.set(p.id, p.slug);
    }
  }

  console.log(`Python ${py!.version} · validating ${problems.length} problem(s)${noBench ? " (no benchmarks)" : ""}\n`);
  const reports: Report[] = [];
  const queue = [...problems];
  const concurrency = Math.max(1, Math.min(6, Number(process.env.VALIDATE_CONCURRENCY ?? 4)));
  await Promise.all(
    Array.from({ length: concurrency }, async () => {
      while (queue.length) {
        const p = queue.shift()!;
        const rep = await validateProblem(p);
        reports.push(rep);
        const mark = rep.errors.length ? "✗" : "✓";
        console.log(`${mark} ${p.slug}${rep.warnings.length ? `  (${rep.warnings.length} warning${rep.warnings.length > 1 ? "s" : ""})` : ""}`);
        for (const e of rep.errors) console.log(`    error: ${e}`);
        for (const w of rep.warnings) console.log(`    warn:  ${w}`);
      }
    }),
  );

  for (const e of loadErrors) console.log(`✗ ${e}`);
  const failed = reports.filter((r) => r.errors.length).length + loadErrors.length;
  console.log(`\n${reports.length - reports.filter((r) => r.errors.length).length}/${reports.length} problems valid; ${loadErrors.length} load error(s).`);
  process.exit(failed ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
