import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parse as parseYaml } from "yaml";
import { categoryName } from "../../shared/categories.ts";
import { ManifestSchema, ProblemSchema, type Problem } from "../../shared/problemSchema.ts";
import type { CategoryInfo, ProblemDetail, ProblemSummary } from "../../shared/api.ts";

const here = path.dirname(fileURLToPath(import.meta.url));
export const DATA_DIR = path.resolve(here, "..", "..", "data");
export const PROBLEMS_DIR = path.join(DATA_DIR, "problems");

export interface LoadIssue {
  file: string;
  message: string;
}

export interface Dataset {
  problems: Map<string, Problem>;
  /** Slugs in canonical order (only those that loaded). */
  order: string[];
  categories: CategoryInfo[];
  issues: LoadIssue[];
  loadedAt: number;
}

function formatZodError(err: { issues: Array<{ path: (string | number)[]; message: string }> }): string {
  return err.issues
    .slice(0, 8)
    .map((i) => `${i.path.join(".") || "(root)"}: ${i.message}`)
    .join("; ");
}

export function loadProblemFile(file: string): { problem?: Problem; issue?: LoadIssue } {
  const rel = path.relative(DATA_DIR, file);
  let raw: unknown;
  try {
    raw = parseYaml(readFileSync(file, "utf8"), { prettyErrors: true, maxAliasCount: -1 });
  } catch (e) {
    return { issue: { file: rel, message: `YAML parse error: ${(e as Error).message}` } };
  }
  const parsed = ProblemSchema.safeParse(raw);
  if (!parsed.success) {
    return { issue: { file: rel, message: formatZodError(parsed.error) } };
  }
  const p = parsed.data;
  const expectedSlug = path.basename(file, ".yaml");
  if (p.slug !== expectedSlug) {
    return { issue: { file: rel, message: `slug "${p.slug}" does not match file name "${expectedSlug}"` } };
  }
  const semantic = checkSemantics(p);
  if (semantic) return { issue: { file: rel, message: semantic } };
  return { problem: p };
}

/** Checks that zod cannot express: test inputs match the declared params, etc. */
function checkSemantics(p: Problem): string | null {
  const r = p.runner;
  const inputsOf = (input: Record<string, unknown>) => Object.keys(input).sort().join(",");
  let expectedKeys: string;
  if (r.kind === "function") {
    expectedKeys = r.params.map((x) => x.name).sort().join(",");
    if (r.compare === "custom" && !r.checker) return "runner.compare is custom but no runner.checker is given";
    if (r.mutates && !r.params.some((x) => x.name === r.mutates)) return `runner.mutates "${r.mutates}" is not a param`;
  } else if (r.kind === "design") {
    expectedKeys = "arguments,operations";
  } else {
    expectedKeys = r.param;
  }
  const all = [
    ...p.examples.map((e, i) => ({ where: `examples[${i}]`, input: e.input })),
    ...p.tests.map((t, i) => ({ where: `tests[${i}]`, input: t.input })),
  ];
  for (const { where, input } of all) {
    if (inputsOf(input) !== expectedKeys) {
      return `${where}.input has keys [${inputsOf(input)}] but the runner expects [${expectedKeys}]`;
    }
  }
  if (!p.starter_code.includes(r.kind === "function" ? r.method : r.class_name)) {
    return "starter_code does not mention the runner method/class";
  }
  return null;
}

export function loadDataset(): Dataset {
  const issues: LoadIssue[] = [];
  const manifestRaw = parseYaml(readFileSync(path.join(DATA_DIR, "blind75.yaml"), "utf8"));
  const manifest = ManifestSchema.parse(manifestRaw);
  const problems = new Map<string, Problem>();
  const order: string[] = [];
  const categories: CategoryInfo[] = [];

  for (const cat of manifest.categories) {
    const loaded: string[] = [];
    for (const slug of cat.problems) {
      const file = path.join(PROBLEMS_DIR, `${slug}.yaml`);
      if (!existsSync(file)) {
        issues.push({ file: `problems/${slug}.yaml`, message: "missing" });
        continue;
      }
      const { problem, issue } = loadProblemFile(file);
      if (issue) {
        issues.push(issue);
        continue;
      }
      if (problem!.category !== cat.id) {
        issues.push({ file: `problems/${slug}.yaml`, message: `category "${problem!.category}" but listed under "${cat.id}"` });
      }
      problems.set(slug, problem!);
      order.push(slug);
      loaded.push(slug);
    }
    categories.push({ id: cat.id, name: categoryName(cat.id), problems: loaded });
  }
  return { problems, order, categories, issues, loadedAt: Date.now() };
}

// ------------------------------------------------------------------ cached access with hot reload

let current: Dataset | null = null;
let lastFingerprint = "";
let lastCheck = 0;

function fingerprint(): string {
  try {
    const files = readdirSync(PROBLEMS_DIR).filter((f) => f.endsWith(".yaml"));
    let acc = `${files.length}`;
    for (const f of files) acc += `|${f}:${statSync(path.join(PROBLEMS_DIR, f)).mtimeMs}`;
    acc += `|m:${statSync(path.join(DATA_DIR, "blind75.yaml")).mtimeMs}`;
    return acc;
  } catch {
    return String(Date.now());
  }
}

/** Returns the dataset, reloading it when any data file changed (checked at most once a second). */
export function getDataset(): Dataset {
  const now = Date.now();
  if (current && now - lastCheck < 1000) return current;
  lastCheck = now;
  const fp = fingerprint();
  if (!current || fp !== lastFingerprint) {
    current = loadDataset();
    lastFingerprint = fp;
    if (current.issues.length) {
      const missing = current.issues.filter((i) => i.message === "missing").length;
      const other = current.issues.filter((i) => i.message !== "missing");
      if (missing) console.warn(`[data] ${missing} problem file(s) missing`);
      for (const i of other) console.warn(`[data] ${i.file}: ${i.message}`);
    }
  }
  return current;
}

// ------------------------------------------------------------------ API projections

export function toSummary(p: Problem, order: number): ProblemSummary {
  return {
    id: p.id,
    slug: p.slug,
    title: p.title,
    category: p.category,
    difficulty: p.difficulty,
    patterns: p.patterns,
    order,
  };
}

export function inputNames(p: Problem): string[] {
  const r = p.runner;
  if (r.kind === "function") return r.params.map((x) => x.name);
  if (r.kind === "design") return ["operations", "arguments"];
  return [r.param];
}

export function inputTypes(p: Problem): Record<string, string> {
  const r = p.runner;
  if (r.kind === "function") {
    const out: Record<string, string> = {};
    for (const x of r.params) out[x.name] = x.ref ? `ref:${x.type}` : x.type;
    return out;
  }
  if (r.kind === "design") return { operations: "List[str]", arguments: "List[list]" };
  return { [r.param]: r.type };
}

export function toDetail(p: Problem, ds: Dataset): ProblemDetail {
  const idx = ds.order.indexOf(p.slug);
  return {
    ...toSummary(p, idx),
    leetcode_url: p.leetcode_url,
    description: p.description,
    examples: p.examples,
    constraints: p.constraints,
    function_signature: p.function_signature,
    starter_code: p.starter_code,
    runner: p.runner,
    hints: p.hints,
    approach: p.approach,
    optimal_solution: p.optimal_solution,
    explanation: p.explanation,
    key_insight: p.key_insight,
    time_complexity: p.time_complexity,
    space_complexity: p.space_complexity,
    complexity_explanation: p.complexity_explanation,
    data_structures: p.data_structures,
    passes: p.passes,
    alternatives: p.alternatives,
    hidden_test_count: p.tests.length,
    input_names: inputNames(p),
    input_types: inputTypes(p),
    benchmark: p.benchmark ? { sizes: p.benchmark.sizes, size_label: p.benchmark.size_label } : undefined,
    prev: idx > 0 ? ds.order[idx - 1] : undefined,
    next: idx >= 0 && idx < ds.order.length - 1 ? ds.order[idx + 1] : undefined,
  };
}
