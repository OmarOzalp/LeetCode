import type { CategoryInfo, ProblemProgress, ProblemStatus, ProblemSummary } from "@shared/api";
import type { Difficulty } from "@shared/categories";

export type StatusFilter = "all" | "unsolved" | "attempted" | "solved" | "review";

export interface ProblemFilters {
  status: StatusFilter;
  category: string | "all";
  difficulty: Difficulty | "all";
  pattern: string | "all";
  query: string;
}

export const DEFAULT_FILTERS: ProblemFilters = { status: "all", category: "all", difficulty: "all", pattern: "all", query: "" };

export function statusOf(progress: Record<string, ProblemProgress>, slug: string): ProblemStatus {
  return progress[slug]?.status ?? "not_started";
}

export function isSolved(p: ProblemProgress | undefined): boolean {
  return p?.status === "solved" || (p?.status === "review" && !!p.everPassed);
}

export function matchesStatus(status: ProblemStatus, filter: StatusFilter): boolean {
  switch (filter) {
    case "all":
      return true;
    case "unsolved":
      return status !== "solved";
    case "attempted":
      return status === "attempted";
    case "solved":
      return status === "solved";
    case "review":
      return status === "review";
  }
}

function normalize(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

export function filterProblems(
  problems: ProblemSummary[],
  progress: Record<string, ProblemProgress>,
  f: ProblemFilters,
): ProblemSummary[] {
  const terms = normalize(f.query).split(" ").filter(Boolean);
  return problems.filter((p) => {
    if (!matchesStatus(statusOf(progress, p.slug), f.status)) return false;
    if (f.category !== "all" && p.category !== f.category) return false;
    if (f.difficulty !== "all" && p.difficulty !== f.difficulty) return false;
    if (f.pattern !== "all" && !p.patterns.includes(f.pattern)) return false;
    if (terms.length) {
      const hay = normalize(`${p.title} ${p.id} ${p.patterns.join(" ")} ${p.category}`);
      if (!terms.every((t) => hay.includes(t))) return false;
    }
    return true;
  });
}

export interface Tally {
  solved: number;
  total: number;
}

export interface OverallStats {
  solved: number;
  attempted: number;
  review: number;
  total: number;
  remaining: number;
  percent: number;
  byDifficulty: Record<Difficulty, Tally>;
  byCategory: Array<CategoryInfo & Tally>;
  attemptsTotal: number;
  hintsUsed: number;
  solutionsRevealed: number;
}

export function computeStats(
  problems: ProblemSummary[],
  categories: CategoryInfo[],
  progress: Record<string, ProblemProgress>,
): OverallStats {
  const byDifficulty: Record<Difficulty, Tally> = {
    Easy: { solved: 0, total: 0 },
    Medium: { solved: 0, total: 0 },
    Hard: { solved: 0, total: 0 },
  };
  let solved = 0;
  let attempted = 0;
  let review = 0;
  let attemptsTotal = 0;
  let hintsUsed = 0;
  let solutionsRevealed = 0;
  for (const p of problems) {
    const pr = progress[p.slug];
    const done = pr?.status === "solved";
    byDifficulty[p.difficulty].total++;
    if (done) {
      solved++;
      byDifficulty[p.difficulty].solved++;
    }
    if (pr?.status === "attempted") attempted++;
    if (pr?.status === "review") review++;
    attemptsTotal += pr?.attempts ?? 0;
    hintsUsed += pr?.hintsRevealed ?? 0;
    if (pr?.solutionRevealed) solutionsRevealed++;
  }
  const total = problems.length || 75;
  return {
    solved,
    attempted,
    review,
    total,
    remaining: total - solved,
    percent: total ? Math.round((solved / total) * 100) : 0,
    byDifficulty,
    byCategory: categories.map((c) => ({
      ...c,
      solved: c.problems.filter((s) => progress[s]?.status === "solved").length,
      total: c.problems.length,
    })),
    attemptsTotal,
    hintsUsed,
    solutionsRevealed,
  };
}

export function allPatterns(problems: ProblemSummary[]): string[] {
  const set = new Set<string>();
  for (const p of problems) for (const t of p.patterns) set.add(t);
  return [...set].sort((a, b) => a.localeCompare(b));
}

/** Most recently attempted problem that isn't solved yet (for "Continue"). */
export function continueTarget(problems: ProblemSummary[], progress: Record<string, ProblemProgress>): ProblemSummary | null {
  let best: ProblemSummary | null = null;
  let bestAt = "";
  for (const p of problems) {
    const pr = progress[p.slug];
    const at = pr?.lastAttemptAt ?? pr?.codeUpdatedAt;
    if (pr && pr.status !== "solved" && at && at > bestAt) {
      best = p;
      bestAt = at;
    }
  }
  return best;
}

export function randomUnsolved(problems: ProblemSummary[], progress: Record<string, ProblemProgress>, exclude?: string): ProblemSummary | null {
  const pool = problems.filter((p) => progress[p.slug]?.status !== "solved" && p.slug !== exclude);
  if (!pool.length) return null;
  return pool[Math.floor(Math.random() * pool.length)];
}
