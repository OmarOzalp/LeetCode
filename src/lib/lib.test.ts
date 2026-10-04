import { describe, expect, it } from "vitest";
import type { AnalyzeResponse, CategoryInfo, CodeFeatures, ProblemDetail, ProblemProgress, ProblemSummary } from "@shared/api";
import { DEFAULT_FILTERS, computeStats, filterProblems } from "./stats";
import { categoryStrengths, dailyPractice, reviewQueue, reviewScore, weakestAreas } from "./review";
import { buildComparison, describeFeatures, similarity } from "./compare";
import { estimateGrowth, summarizeBenchmark } from "./growth";
import { pyRepr, formatMs } from "./format";

const P = (slug: string, order: number, extra: Partial<ProblemSummary> = {}): ProblemSummary => ({
  id: String(order),
  slug,
  title: slug.replace(/-/g, " "),
  category: "arrays-hashing",
  difficulty: "Easy",
  patterns: [],
  order,
  ...extra,
});

const base: ProblemProgress = { status: "not_started", attempts: 0, failedAttempts: 0, everPassed: false, hintsRevealed: 0, solutionRevealed: false };
const prog = (p: Partial<ProblemProgress>): ProblemProgress => ({ ...base, ...p });

const problems = [
  P("two-sum", 0, { patterns: ["Hash Map"] }),
  P("valid-anagram", 1),
  P("same-tree", 2, { category: "trees", difficulty: "Medium", patterns: ["DFS"] }),
  P("word-search-ii", 3, { category: "tries", difficulty: "Hard" }),
];
const categories: CategoryInfo[] = [
  { id: "arrays-hashing", name: "Arrays & Hashing", problems: ["two-sum", "valid-anagram"] },
  { id: "trees", name: "Trees", problems: ["same-tree"] },
  { id: "tries", name: "Tries", problems: ["word-search-ii"] },
];

describe("filters and stats", () => {
  const progress = {
    "two-sum": prog({ status: "solved", attempts: 2, everPassed: true }),
    "same-tree": prog({ status: "attempted", attempts: 1, failedAttempts: 1 }),
    "word-search-ii": prog({ status: "review", attempts: 3, everPassed: true }),
  };

  it("filters by status, topic, difficulty, pattern and search", () => {
    const f = (patch: Partial<typeof DEFAULT_FILTERS>) => filterProblems(problems, progress, { ...DEFAULT_FILTERS, ...patch }).map((p) => p.slug);
    expect(f({})).toHaveLength(4);
    expect(f({ status: "solved" })).toEqual(["two-sum"]);
    expect(f({ status: "unsolved" })).toEqual(["valid-anagram", "same-tree", "word-search-ii"]);
    expect(f({ status: "attempted" })).toEqual(["same-tree"]);
    expect(f({ status: "review" })).toEqual(["word-search-ii"]);
    expect(f({ category: "trees" })).toEqual(["same-tree"]);
    expect(f({ difficulty: "Hard" })).toEqual(["word-search-ii"]);
    expect(f({ pattern: "Hash Map" })).toEqual(["two-sum"]);
    expect(f({ query: "TWO   sum" })).toEqual(["two-sum"]);
    expect(f({ query: "dfs" })).toEqual(["same-tree"]);
    expect(f({ query: "nothing-matches" })).toEqual([]);
  });

  it("computes overall, difficulty and category progress", () => {
    const s = computeStats(problems, categories, progress);
    expect(s.solved).toBe(1);
    expect(s.total).toBe(4);
    expect(s.remaining).toBe(3);
    expect(s.percent).toBe(25);
    expect(s.byDifficulty.Easy).toEqual({ solved: 1, total: 2 });
    expect(s.byCategory.find((c) => c.id === "arrays-hashing")).toMatchObject({ solved: 1, total: 2 });
    expect(s.attemptsTotal).toBe(6);
  });
});

describe("review scoring", () => {
  const now = new Date("2026-06-01T12:00:00Z").getTime();

  it("scores untouched problems as zero and weak signals higher", () => {
    expect(reviewScore(base, now).score).toBe(0);
    const strong = reviewScore(prog({ status: "solved", attempts: 1, everPassed: true, confidence: 5, solvedAt: "2026-05-31T00:00:00Z" }), now);
    const weak = reviewScore(
      prog({ status: "review", attempts: 4, failedAttempts: 3, confidence: 1, solutionRevealed: true, lastResult: { passed: 2, total: 9, allPassed: false } }),
      now,
    );
    expect(weak.score).toBeGreaterThan(strong.score);
    expect(weak.reasons).toContain("Marked for review");
    expect(weak.reasons).toContain("Solution was revealed");
  });

  it("resurfaces problems solved long ago", () => {
    const old = reviewScore(prog({ status: "solved", attempts: 1, everPassed: true, solvedAt: "2026-04-01T00:00:00Z" }), now);
    expect(old.score).toBeGreaterThan(0);
    expect(old.reasons[0]).toMatch(/Solved \d+ days ago/);
  });

  it("orders the queue and builds a stable daily set", () => {
    const progress = {
      "two-sum": prog({ status: "solved", attempts: 1, everPassed: true, confidence: 2 }),
      "same-tree": prog({ status: "review", attempts: 2 }),
    };
    const q = reviewQueue(problems, progress, now);
    expect(q.map((x) => x.problem.slug)).toEqual(["same-tree", "two-sum"]);
    const day = new Date("2026-06-01T09:00:00");
    const a = dailyPractice(problems, progress, 3, day);
    const b = dailyPractice(problems, progress, 3, day);
    expect(a.map((x) => x.problem.slug)).toEqual(b.map((x) => x.problem.slug));
    expect(a).toHaveLength(3);
    expect(new Set(a.map((x) => x.problem.slug)).size).toBe(3);
    expect(a.some((x) => x.reason === "Next new problem")).toBe(true);
  });

  it("ranks weak topics only among topics with activity", () => {
    const progress = {
      "two-sum": prog({ status: "solved", attempts: 1, everPassed: true, confidence: 5 }),
      "valid-anagram": prog({ status: "solved", attempts: 1, everPassed: true, confidence: 5 }),
      "same-tree": prog({ status: "attempted", attempts: 5, failedAttempts: 5, solutionRevealed: true, confidence: 1 }),
    };
    const weak = weakestAreas(categories, progress);
    expect(weak.map((w) => w.category.id)).toEqual(["trees", "arrays-hashing"]);
    expect(categoryStrengths(categories, progress).find((c) => c.category.id === "tries")?.attempted).toBe(0);
  });
});

const features = (over: Partial<CodeFeatures>): CodeFeatures => ({
  ok: true,
  loop_depth: 1,
  effective_depth: 1,
  loop_count: 1,
  passes: 1,
  recursive: false,
  branching_recursion: false,
  memoized: false,
  tags: [],
  costly: [],
  time_estimate: "O(n)",
  space_estimate: "O(1)",
  notes: [],
  lines_of_code: 8,
  is_empty: false,
  ...over,
});

const detail = {
  slug: "two-sum",
  approach: "One-pass hash map",
  time_complexity: "O(n)",
  space_complexity: "O(n)",
  key_insight: "Trade memory for O(1) lookups.",
  data_structures: ["Hash map"],
  passes: "1 pass",
  alternatives: [
    { name: "Brute force", time_complexity: "O(n²)", space_complexity: "O(1)", code: "", explanation: "", tradeoff: "Checks every pair." },
    { name: "Sort + two pointers", time_complexity: "O(n log n)", space_complexity: "O(n)", code: "", explanation: "", tradeoff: "Sorting dominates." },
  ],
} as unknown as ProblemDetail;

const analysis = (user: CodeFeatures): AnalyzeResponse => ({
  user,
  optimal: features({ tags: ["hash_map"], space_estimate: "O(n)" }),
  alternatives: [
    features({ loop_depth: 2, effective_depth: 2, loop_count: 2, time_estimate: "O(n²)" }),
    features({ tags: ["sorting", "two_pointers"], time_estimate: "O(n log n)", space_estimate: "O(n)" }),
  ],
});

describe("solution comparison", () => {
  it("recognises the brute-force alternative and explains the tradeoff", () => {
    const c = buildComparison(detail, analysis(features({ loop_depth: 2, effective_depth: 2, loop_count: 2, time_estimate: "O(n²)" })));
    expect(c.matched).toBe(0);
    expect(c.user.name).toBe("Brute force");
    expect(c.time).toBe("worse");
    expect(c.space).toBe("better");
    expect(c.tone).toBe("improve");
    expect(c.headline).toMatch(/Less memory/);
    expect(c.approachNote).toBe("Checks every pair.");
  });

  it("recognises the optimal approach", () => {
    const c = buildComparison(detail, analysis(features({ tags: ["hash_map"], space_estimate: "O(n)" })));
    expect(c.matched).toBe(-1);
    expect(c.tone).toBe("optimal");
    expect(c.time).toBe("same");
  });

  it("falls back to estimates for unrecognised code", () => {
    const c = buildComparison(detail, analysis(features({ loop_depth: 3, effective_depth: 3, loop_count: 3, time_estimate: "O(n³)", tags: ["heap"] })));
    expect(c.matched).toBeNull();
    expect(c.user.basis).toBe("estimated");
    expect(c.time).toBe("worse");
    expect(c.paragraphs.join(" ")).toMatch(/heuristic estimate/);
  });

  it("handles empty or unparsable code", () => {
    expect(buildComparison(detail, analysis(features({ is_empty: true }))).headline).toBe("Write a solution first");
    expect(buildComparison(detail, analysis(features({ ok: false, error: "SyntaxError" }))).headline).toMatch(/could not be analyzed/);
  });

  it("describes features and scores similarity", () => {
    expect(describeFeatures(features({ loop_depth: 2, effective_depth: 2 }))).toBe("Nested iteration / brute force");
    expect(describeFeatures(features({ recursive: true, memoized: true }))).toMatch(/Memoized/);
    const a = features({ tags: ["hash_map"] });
    expect(similarity(a, a)).toBeCloseTo(1);
    expect(similarity(a, features({ tags: ["heap"], effective_depth: 3 }))).toBeLessThan(0.5);
  });
});

describe("benchmark growth", () => {
  it("recovers linear and quadratic exponents", () => {
    const lin = estimateGrowth([10, 100, 1000, 10000].map((n) => ({ n, ms: n * 0.001 })));
    const quad = estimateGrowth([10, 100, 1000].map((n) => ({ n, ms: n * n * 0.0001 })));
    expect(lin.exponent).toBeCloseTo(1, 5);
    expect(lin.label).toBe("approximately linearly");
    expect(quad.exponent).toBeCloseTo(2, 5);
    expect(quad.label).toBe("approximately quadratically");
    expect(estimateGrowth([{ n: 10, ms: 1 }]).exponent).toBeNull();
  });

  it("summarizes timeouts and speed ratios", () => {
    const rows = [
      { n: 100, user: { status: "ok" as const, ms: 1 }, reference: { status: "ok" as const, ms: 0.1 }, match: true },
      { n: 1000, user: { status: "ok" as const, ms: 100 }, reference: { status: "ok" as const, ms: 1 }, match: true },
      { n: 10000, user: { status: "timeout" as const }, reference: { status: "ok" as const, ms: 10 } },
    ];
    const s = summarizeBenchmark(rows);
    expect(s.sentences.join(" ")).toMatch(/quadratically/);
    expect(s.sentences.join(" ")).toMatch(/time limit at n = 10,000/);
    expect(s.sentences.join(" ")).toMatch(/100× as long/);
  });
});

describe("formatting", () => {
  it("prints values like Python", () => {
    expect(pyRepr([1, "a", null, true, false, 2.5, [3]])).toBe('[1, "a", None, True, False, 2.5, [3]]');
    expect(pyRepr({ a: 1 })).toBe('{"a": 1}');
    expect(pyRepr("x".repeat(50), 10)).toMatch(/…$/);
    expect(formatMs(0.004)).toBe("<0.01 ms");
    expect(formatMs(1500)).toBe("1.50 s");
  });
});
