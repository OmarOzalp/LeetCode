import type { CategoryInfo, ProblemProgress, ProblemSummary } from "@shared/api";
import { daysSince } from "./format";

/**
 * A simple, transparent review model (not full spaced repetition): each
 * problem gets a priority score from signals that suggest it isn't mastered.
 */

export interface ReviewItem {
  problem: ProblemSummary;
  progress: ProblemProgress;
  score: number;
  reasons: string[];
}

export function reviewScore(p: ProblemProgress, now = Date.now()): { score: number; reasons: string[] } {
  let score = 0;
  const reasons: string[] = [];
  if (p.status === "not_started" && !p.attempts) return { score: 0, reasons };
  if (p.status === "review") {
    score += 3;
    reasons.push("Marked for review");
  }
  if (p.confidence != null) {
    if (p.confidence <= 2) {
      score += 2.5 - (p.confidence - 1) * 0.5;
      reasons.push(`Low confidence (${p.confidence}/5)`);
    } else if (p.confidence === 3) {
      score += 1;
      reasons.push("Needed hints");
    }
  }
  if (p.solutionRevealed) {
    score += 1.5;
    reasons.push("Solution was revealed");
  }
  if (p.lastResult && !p.lastResult.allPassed) {
    score += 1.5;
    reasons.push(`Last run failed (${p.lastResult.passed}/${p.lastResult.total})`);
  }
  if (p.failedAttempts > 0) score += Math.min(1.5, p.failedAttempts * 0.3);
  const since = daysSince(p.solvedAt, now);
  if (p.status === "solved" && since !== null && since >= 7) {
    score += Math.min(2, since / 14);
    reasons.push(`Solved ${since} days ago`);
  }
  return { score, reasons };
}

export function reviewQueue(problems: ProblemSummary[], progress: Record<string, ProblemProgress>, now = Date.now()): ReviewItem[] {
  const items: ReviewItem[] = [];
  for (const problem of problems) {
    const p = progress[problem.slug];
    if (!p) continue;
    const { score, reasons } = reviewScore(p, now);
    if (score > 0) items.push({ problem, progress: p, score, reasons });
  }
  return items.sort((a, b) => b.score - a.score || a.problem.order - b.problem.order);
}

/** Deterministic pseudo-random generator seeded by the date (so "today's" list is stable). */
function seeded(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 2 ** 32;
  };
}

export function dateSeed(d = new Date()): number {
  return d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
}

/** Pick today's practice set: mostly review candidates, topped up with new problems. */
export function dailyPractice(
  problems: ProblemSummary[],
  progress: Record<string, ProblemProgress>,
  count = 3,
  date = new Date(),
): Array<{ problem: ProblemSummary; reason: string }> {
  const rand = seeded(dateSeed(date));
  const queue = reviewQueue(problems, progress, date.getTime()).slice(0, 8);
  const picks: Array<{ problem: ProblemSummary; reason: string }> = [];
  const pool = [...queue];
  while (picks.length < Math.min(count - 1, pool.length) && pool.length) {
    const idx = Math.floor(rand() * Math.min(pool.length, 4));
    const [item] = pool.splice(idx, 1);
    picks.push({ problem: item.problem, reason: item.reasons[0] ?? "Review" });
  }
  // Always include something new if possible, in canonical order.
  const fresh = problems.filter((p) => !progress[p.slug] || progress[p.slug].status === "not_started");
  for (const p of fresh) {
    if (picks.length >= count) break;
    if (!picks.some((x) => x.problem.slug === p.slug)) picks.push({ problem: p, reason: "Next new problem" });
  }
  while (picks.length < count && pool.length) {
    const [item] = pool.splice(0, 1);
    picks.push({ problem: item.problem, reason: item.reasons[0] ?? "Review" });
  }
  return picks;
}

export interface CategoryStrength {
  category: CategoryInfo;
  solved: number;
  total: number;
  attempted: number;
  avgConfidence: number | null;
  failRate: number;
  revealRate: number;
  weakness: number;
}

export function categoryStrengths(categories: CategoryInfo[], progress: Record<string, ProblemProgress>): CategoryStrength[] {
  return categories
    .filter((c) => c.problems.length > 0)
    .map((category) => {
      const ps = category.problems.map((s) => progress[s]).filter((p): p is ProblemProgress => !!p && (p.attempts > 0 || p.status !== "not_started"));
      const total = category.problems.length;
      const solved = category.problems.filter((s) => progress[s]?.status === "solved").length;
      const confs = ps.map((p) => p.confidence).filter((c): c is number => typeof c === "number");
      const avgConfidence = confs.length ? confs.reduce((a, b) => a + b, 0) / confs.length : null;
      const attempts = ps.reduce((s, p) => s + p.attempts, 0);
      const fails = ps.reduce((s, p) => s + p.failedAttempts, 0);
      const failRate = attempts ? fails / attempts : 0;
      const revealRate = ps.length ? ps.filter((p) => p.solutionRevealed).length / ps.length : 0;
      const coverage = total ? solved / total : 0;
      const confPenalty = avgConfidence === null ? 0.5 : 1 - (avgConfidence - 1) / 4;
      const weakness = 0.4 * (1 - coverage) + 0.3 * confPenalty + 0.15 * failRate + 0.15 * revealRate;
      return { category, solved, total, attempted: ps.length, avgConfidence, failRate, revealRate, weakness };
    });
}

/** Categories with activity, weakest first. */
export function weakestAreas(categories: CategoryInfo[], progress: Record<string, ProblemProgress>): CategoryStrength[] {
  return categoryStrengths(categories, progress)
    .filter((c) => c.attempted > 0)
    .sort((a, b) => b.weakness - a.weakness);
}

export interface ReviewSections {
  needsReview: ReviewItem[];
  longestSinceSolved: ReviewItem[];
  mostFailed: ReviewItem[];
  lowestConfidence: ReviewItem[];
  solutionRevealed: ReviewItem[];
  recentlyFailed: ReviewItem[];
}

export function reviewSections(problems: ProblemSummary[], progress: Record<string, ProblemProgress>, now = Date.now()): ReviewSections {
  const all: ReviewItem[] = problems
    .filter((p) => progress[p.slug])
    .map((problem) => ({ problem, progress: progress[problem.slug], ...reviewScore(progress[problem.slug], now) }));
  const take = (xs: ReviewItem[]) => xs.slice(0, 6);
  return {
    needsReview: take(all.filter((x) => x.progress.status === "review").sort((a, b) => b.score - a.score)),
    longestSinceSolved: take(
      all
        .filter((x) => x.progress.status === "solved" && x.progress.solvedAt)
        .sort((a, b) => (a.progress.solvedAt! < b.progress.solvedAt! ? -1 : 1)),
    ),
    mostFailed: take(all.filter((x) => x.progress.failedAttempts > 0).sort((a, b) => b.progress.failedAttempts - a.progress.failedAttempts)),
    lowestConfidence: take(
      all.filter((x) => x.progress.confidence != null && x.progress.confidence <= 3).sort((a, b) => a.progress.confidence! - b.progress.confidence!),
    ),
    solutionRevealed: take(
      all
        .filter((x) => x.progress.solutionRevealed)
        .sort((a, b) => ((a.progress.solutionRevealedAt ?? "") < (b.progress.solutionRevealedAt ?? "") ? 1 : -1)),
    ),
    recentlyFailed: take(
      all
        .filter((x) => x.progress.lastResult && !x.progress.lastResult.allPassed)
        .sort((a, b) => ((a.progress.lastAttemptAt ?? "") < (b.progress.lastAttemptAt ?? "") ? 1 : -1)),
    ),
  };
}
