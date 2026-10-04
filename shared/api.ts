/**
 * Types shared by the API server and the web client.
 */
import type { CategoryId, Difficulty } from "./categories";
import type { Alternative, Example, RunnerSpec } from "./problemSchema";

// ------------------------------------------------------------------ problems

export interface ProblemSummary {
  id: string;
  slug: string;
  title: string;
  category: CategoryId;
  difficulty: Difficulty;
  patterns: string[];
  order: number;
}

export interface ProblemDetail extends ProblemSummary {
  leetcode_url?: string;
  description: string;
  examples: Example[];
  constraints: string[];
  function_signature: string;
  starter_code: string;
  runner: RunnerSpec;
  hints: string[];
  approach: string;
  optimal_solution: string;
  explanation: string;
  key_insight: string;
  time_complexity: string;
  space_complexity: string;
  complexity_explanation: string;
  data_structures: string[];
  passes?: string;
  alternatives: Alternative[];
  /** Number of additional (hidden) edge-case tests. */
  hidden_test_count: number;
  /** Names of the input parameters, in order (for custom tests and display). */
  input_names: string[];
  /** Param name -> declared type, used to render inputs (trees, lists, grids). */
  input_types: Record<string, string>;
  benchmark?: { sizes: number[]; size_label: string };
  prev?: string;
  next?: string;
}

export interface CategoryInfo {
  id: CategoryId;
  name: string;
  problems: string[];
}

export interface ProblemsResponse {
  categories: CategoryInfo[];
  problems: ProblemSummary[];
}

// ------------------------------------------------------------------ test runs

export type TestStatus = "passed" | "failed" | "error" | "timeout" | "not_run" | "invalid_input" | "internal_error" | "ran";

export interface RuntimeErrorInfo {
  type: string;
  message: string;
  line: number | null;
  column?: number | null;
  text?: string;
  traceback?: string;
  hint?: string | null;
  kind?: "compile" | "runtime" | "structure";
}

export interface TestResult {
  index: number;
  name: string;
  kind: "example" | "hidden" | "custom";
  status: TestStatus;
  input: Record<string, unknown>;
  expected?: unknown;
  hasExpected: boolean;
  output?: unknown;
  runtimeMs?: number;
  stdout?: string;
  error?: RuntimeErrorInfo | null;
  /** Explanation of a failure (e.g. which design operation mismatched). */
  message?: string | null;
  note?: string | null;
}

export type RunMode = "all" | "examples" | "custom";

export interface CustomTestInput {
  /** Raw text per parameter name (Python or JSON literals). */
  values: Record<string, string>;
}

export interface RunRequest {
  slug: string;
  code: string;
  mode: RunMode;
  custom?: CustomTestInput[];
}

export interface RunResponse {
  mode: RunMode;
  status: "ok" | "compile_error" | "load_error" | "timeout" | "internal_error";
  loadError?: RuntimeErrorInfo;
  results: TestResult[];
  passed: number;
  total: number;
  allPassed: boolean;
  totalRuntimeMs: number;
  /** Output printed while loading the module (outside any test). */
  moduleStdout?: string;
  message?: string;
  progress?: ProblemProgress;
  durationMs: number;
}

// ------------------------------------------------------------------ benchmark

export interface BenchCell {
  status: "ok" | "timeout" | "error" | "skipped" | "unknown";
  ms?: number | null;
  reps?: number;
  error?: string;
  stopped_after?: boolean;
}

export interface BenchRow {
  n: number;
  user: BenchCell;
  reference: BenchCell;
  match?: boolean | null;
}

export interface BenchmarkResponse {
  status: "ok" | "load_error" | "unsupported" | "error";
  loadError?: RuntimeErrorInfo;
  message?: string;
  sizeLabel: string;
  rows: BenchRow[];
  notes: string[];
}

// ------------------------------------------------------------------ static analysis

export interface CodeFeatures {
  ok: boolean;
  error?: string;
  loop_depth: number;
  effective_depth: number;
  loop_count: number;
  passes: number | null;
  recursive: boolean;
  branching_recursion: boolean;
  memoized: boolean;
  tags: string[];
  costly: { line: number | null; message: string; kind: string }[];
  time_estimate: string;
  space_estimate: string;
  notes: string[];
  lines_of_code: number;
  is_empty: boolean;
}

export interface AnalyzeResponse {
  user: CodeFeatures;
  optimal: CodeFeatures;
  alternatives: CodeFeatures[];
}

// ------------------------------------------------------------------ progress

export const STATUSES = ["not_started", "attempted", "solved", "review"] as const;
export type ProblemStatus = (typeof STATUSES)[number];

export interface AttemptRecord {
  at: string;
  passed: number;
  total: number;
  allPassed: boolean;
}

export interface SavedCustomTest {
  id: string;
  values: Record<string, string>;
  createdAt: string;
}

export interface ProblemProgress {
  status: ProblemStatus;
  code?: string;
  codeUpdatedAt?: string;
  attempts: number;
  failedAttempts: number;
  lastAttemptAt?: string;
  lastResult?: { passed: number; total: number; allPassed: boolean };
  firstSolvedAt?: string;
  solvedAt?: string;
  everPassed: boolean;
  hintsRevealed: number;
  solutionRevealed: boolean;
  solutionRevealedAt?: string;
  confidence?: number | null;
  notes?: string;
  customTests?: SavedCustomTest[];
  history?: AttemptRecord[];
  timeSpentMs?: number;
  statusChangedAt?: string;
}

export interface AppState {
  version: 1;
  problems: Record<string, ProblemProgress>;
  settings: AppSettings;
}

export interface AppSettings {
  theme: "dark" | "light";
  editorFontSize: number;
  sidebarCollapsed: boolean;
  confirmBeforeSolution: boolean;
  autoMarkSolved: boolean;
}

export type ProgressPatch = Partial<
  Pick<
    ProblemProgress,
    "status" | "code" | "hintsRevealed" | "solutionRevealed" | "confidence" | "notes" | "customTests" | "timeSpentMs"
  >
>;

export interface HealthResponse {
  ok: boolean;
  python: { available: boolean; version?: string; command?: string };
  problemCount: number;
  dataFile: string;
}

export interface SnippetResponse {
  stdout: string;
  error?: RuntimeErrorInfo | null;
  elapsedMs?: number;
}

export interface DocEntry {
  /** Anchor id, unique across all docs: "<section>--<entry>". */
  id: string;
  title: string;
  markdown: string;
}

export interface DocSection {
  slug: string;
  title: string;
  group: string;
  summary: string;
  keywords: string[];
  intro: string;
  order: number;
  entries: DocEntry[];
}
