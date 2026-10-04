import type { AnalyzeResponse, CodeFeatures, ProblemDetail } from "@shared/api";
import { compareComplexity, type Relation } from "@shared/complexity";

/**
 * Deterministic comparison between the user's solution and the optimal one.
 * Big-O for known approaches comes from problem metadata; for unrecognised
 * code we fall back to the static-analysis heuristics (and say so).
 */

const SIGNIFICANT = [
  "hash_map",
  "hash_set",
  "heap",
  "deque",
  "queue",
  "stack",
  "sorting",
  "binary_search",
  "two_pointers",
  "recursion",
  "memoization",
  "2d_table",
  "array_table",
  "bit_manipulation",
] as const;

export const TAG_LABELS: Record<string, string> = {
  hash_map: "Hash map",
  hash_set: "Hash set",
  heap: "Heap",
  deque: "Deque",
  queue: "Queue",
  stack: "Stack",
  sorting: "Sorting",
  binary_search: "Binary search",
  two_pointers: "Two pointers",
  recursion: "Recursion",
  memoization: "Memoization",
  "2d_table": "2-D table",
  array_table: "Array table",
  bit_manipulation: "Bit operations",
  string_building: "String join",
};

export interface ApproachSide {
  name: string;
  /** How we know the complexity: from metadata of a recognised approach, or estimated. */
  basis: "metadata" | "estimated";
  time: string;
  space: string;
  dataStructures: string[];
  passes: string;
  linesOfCode: number | null;
}

export interface Comparison {
  user: ApproachSide;
  optimal: ApproachSide;
  /** -1 = matches the optimal approach, i >= 0 = matches alternatives[i], null = unrecognised. */
  matched: number | null;
  matchScore: number;
  time: Relation;
  space: Relation;
  tone: "optimal" | "good" | "improve" | "unknown";
  headline: string;
  paragraphs: string[];
  /** Authored note about the matched alternative, if any. */
  approachNote?: string;
  hiddenCosts: CodeFeatures["costly"];
  notes: string[];
}

function significantTags(f: CodeFeatures): Set<string> {
  return new Set(f.tags.filter((t) => (SIGNIFICANT as readonly string[]).includes(t)));
}

/** Similarity in [0, 1] between two feature sets. */
export function similarity(a: CodeFeatures, b: CodeFeatures): number {
  const ta = significantTags(a);
  const tb = significantTags(b);
  const union = new Set([...ta, ...tb]);
  let inter = 0;
  for (const t of ta) if (tb.has(t)) inter++;
  const jaccard = union.size === 0 ? 1 : inter / union.size;
  const depthDiff = Math.abs(a.effective_depth - b.effective_depth);
  const depthScore = depthDiff === 0 ? 1 : depthDiff === 1 ? 0.35 : 0;
  const recScore = a.recursive === b.recursive ? 1 : 0;
  const memoScore = a.memoized === b.memoized ? 1 : 0;
  return 0.5 * jaccard + 0.3 * depthScore + 0.12 * recScore + 0.08 * memoScore;
}

export function describeFeatures(f: CodeFeatures): string {
  const t = new Set(f.tags);
  if (f.is_empty) return "Not implemented yet";
  if (f.recursive && f.memoized) return "Memoized recursion (top-down DP)";
  if (t.has("2d_table")) return "2-D dynamic programming table";
  if (f.recursive && f.branching_recursion) return "Plain recursion (exhaustive search)";
  if (t.has("heap")) return "Heap / priority queue";
  if (t.has("binary_search")) return "Binary search";
  if (t.has("two_pointers") && t.has("sorting")) return "Sorting + two pointers";
  if (t.has("two_pointers")) return "Two pointers";
  if (f.recursive) return "Recursive traversal (DFS)";
  if (t.has("queue") || t.has("deque")) return "Queue-based traversal (BFS)";
  if (f.effective_depth >= 2 && !t.has("hash_map") && !t.has("hash_set")) return "Nested iteration / brute force";
  if (t.has("stack")) return "Stack-based scan";
  if (t.has("sorting")) return "Sorting-based";
  if (t.has("hash_map") || t.has("hash_set")) return "Hash-based lookup";
  if (t.has("bit_manipulation")) return "Bit manipulation";
  if (t.has("array_table")) return "Dynamic programming array";
  if (f.effective_depth === 1) return "Single linear scan";
  return "Direct computation";
}

export function describePasses(f: CodeFeatures): string {
  if (f.is_empty) return "—";
  if (f.loop_depth >= 2) return `Nested loops (depth ${f.loop_depth})`;
  if (f.recursive && f.loop_count === 0) return "Recursive";
  const p = f.passes ?? 0;
  if (p === 0) return f.loop_count > 0 ? "Loops in helpers" : "No loops";
  return p === 1 ? "1 pass" : `${p} passes`;
}

function structuresFromTags(f: CodeFeatures): string[] {
  const out = f.tags.filter((t) => TAG_LABELS[t] && t !== "two_pointers" && t !== "binary_search" && t !== "recursion").map((t) => TAG_LABELS[t]);
  if (f.recursive) out.push("Call stack (recursion)");
  return out.length ? out : ["No auxiliary structures"];
}

export function buildComparison(problem: ProblemDetail, analysis: AnalyzeResponse): Comparison {
  const uf = analysis.user;
  const candidates = [analysis.optimal, ...analysis.alternatives];
  let best = -2;
  let bestScore = 0;
  candidates.forEach((c, i) => {
    if (!c.ok || !uf.ok) return;
    const s = similarity(uf, c);
    if (s > bestScore + 1e-9) {
      bestScore = s;
      best = i - 1;
    }
  });
  const matched = uf.ok && !uf.is_empty && bestScore >= 0.72 ? best : null;

  const optimal: ApproachSide = {
    name: problem.approach,
    basis: "metadata",
    time: problem.time_complexity,
    space: problem.space_complexity,
    dataStructures: problem.data_structures.length ? problem.data_structures : structuresFromTags(analysis.optimal),
    passes: problem.passes ?? describePasses(analysis.optimal),
    linesOfCode: analysis.optimal.ok ? analysis.optimal.lines_of_code : null,
  };

  let user: ApproachSide;
  if (matched === -1) {
    user = { ...optimal, name: `${problem.approach} (same idea as optimal)`, dataStructures: structuresFromTags(uf), passes: describePasses(uf), linesOfCode: uf.lines_of_code };
  } else if (matched !== null && matched >= 0) {
    const alt = problem.alternatives[matched];
    user = {
      name: alt.name,
      basis: "metadata",
      time: alt.time_complexity,
      space: alt.space_complexity,
      dataStructures: structuresFromTags(uf),
      passes: describePasses(uf),
      linesOfCode: uf.lines_of_code,
    };
  } else {
    user = {
      name: uf.ok ? describeFeatures(uf) : "Could not analyze",
      basis: "estimated",
      time: uf.ok ? uf.time_estimate : "?",
      space: uf.ok ? uf.space_estimate : "?",
      dataStructures: uf.ok ? structuresFromTags(uf) : [],
      passes: uf.ok ? describePasses(uf) : "—",
      linesOfCode: uf.ok ? uf.lines_of_code : null,
    };
  }

  const time = matched === -1 ? "same" : compareComplexity(user.time, optimal.time);
  const space = matched === -1 ? "same" : compareComplexity(user.space, optimal.space);

  const paragraphs: string[] = [];
  let tone: Comparison["tone"] = "unknown";
  let headline = "";

  if (!uf.ok) {
    headline = "Your code could not be analyzed";
    paragraphs.push(uf.error ?? "Fix syntax errors first, then compare again.");
  } else if (uf.is_empty) {
    headline = "Write a solution first";
    paragraphs.push("Your method body is still empty. Implement a solution, run the tests, then come back to compare.");
  } else if (matched === -1 || (time === "same" && space === "same")) {
    tone = "optimal";
    headline = matched === -1 ? "Your solution uses the optimal approach" : "Your solution matches the optimal complexity";
    paragraphs.push(
      `Both run in ${optimal.time} time and ${optimal.space} space. ${problem.key_insight}`,
    );
    if (uf.lines_of_code && analysis.optimal.ok && uf.lines_of_code > analysis.optimal.lines_of_code * 1.8 && uf.lines_of_code - analysis.optimal.lines_of_code > 8) {
      paragraphs.push(
        `Your version is noticeably longer (${uf.lines_of_code} vs ${analysis.optimal.lines_of_code} lines). In an interview, compare the two side by side for simplifications.`,
      );
    }
  } else if (time === "worse" && space === "better") {
    tone = "improve";
    headline = "Less memory, but more work as the input grows";
    paragraphs.push(
      `Your implementation uses less extra memory (${user.space} vs ${optimal.space}) but performs substantially more work as the input grows (${user.time} vs ${optimal.time}).`,
    );
    paragraphs.push(`The optimal solution makes the opposite trade. ${problem.key_insight} That reduces the running time from ${user.time} to ${optimal.time}.`);
  } else if (time === "worse") {
    tone = "improve";
    headline = "The optimal approach scales better";
    paragraphs.push(
      `Your implementation runs in ${user.time} time versus ${optimal.time} for the optimal approach${space === "same" ? `, with the same ${optimal.space} space` : space === "worse" ? `, and also uses more memory (${user.space} vs ${optimal.space})` : ""}.`,
    );
    paragraphs.push(`Key idea of the optimal approach: ${problem.key_insight}`);
  } else if (time === "same" && space === "worse") {
    tone = "good";
    headline = "Optimal time, but more memory than needed";
    paragraphs.push(
      `Your time complexity matches the optimal ${optimal.time}, but you use ${user.space} extra space where ${optimal.space} is possible. ${problem.key_insight}`,
    );
  } else if (time === "same" && space === "better") {
    tone = "optimal";
    headline = "Optimal time with even less memory";
    paragraphs.push(`Your solution matches the optimal ${optimal.time} time and appears to use less extra space (${user.space} vs ${optimal.space}).`);
  } else if (time === "better") {
    tone = "good";
    headline = "Your solution looks at least as efficient";
    paragraphs.push(
      `The analysis estimates ${user.time} time for your code versus ${optimal.time} for the reference. Static estimates can miss hidden costs, so double-check with the benchmark below.`,
    );
  } else {
    headline = "Complexity could not be compared automatically";
    paragraphs.push(`The optimal approach runs in ${optimal.time} time and ${optimal.space} space. ${problem.key_insight}`);
  }

  if (user.basis === "estimated" && uf.ok && !uf.is_empty) {
    paragraphs.push(
      "Your complexity is a heuristic estimate from the structure of your code (loop nesting, data structures, recursion) — use it as a guide, not a proof.",
    );
  }

  const approachNote = matched !== null && matched >= 0 ? problem.alternatives[matched].tradeoff : undefined;

  return {
    user,
    optimal,
    matched,
    matchScore: bestScore,
    time,
    space,
    tone,
    headline,
    paragraphs,
    approachNote,
    hiddenCosts: uf.ok ? uf.costly : [],
    notes: uf.ok ? uf.notes : [],
  };
}
