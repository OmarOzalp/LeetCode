import type { BenchRow } from "@shared/api";

export interface GrowthEstimate {
  /** Fitted exponent k in time ≈ c · n^k (log-log slope), or null if not enough data. */
  exponent: number | null;
  label: string;
  points: number;
}

/**
 * Estimate empirical growth from (n, ms) measurements by a least-squares fit of
 * log(time) against log(n). Very fast timings are dominated by noise/overhead,
 * so points under `minMs` are ignored unless nothing else is available.
 */
export function estimateGrowth(points: Array<{ n: number; ms: number }>, minMs = 0.05): GrowthEstimate {
  let pts = points.filter((p) => p.ms > 0 && p.n > 0);
  const usable = pts.filter((p) => p.ms >= minMs);
  if (usable.length >= 2) pts = usable;
  if (pts.length < 2) return { exponent: null, label: "not enough data", points: pts.length };
  // Favor the larger sizes: they are the least affected by constant overhead.
  pts = pts.slice(-3);
  const xs = pts.map((p) => Math.log(p.n));
  const ys = pts.map((p) => Math.log(p.ms));
  const mx = xs.reduce((a, b) => a + b, 0) / xs.length;
  const my = ys.reduce((a, b) => a + b, 0) / ys.length;
  let num = 0;
  let den = 0;
  for (let i = 0; i < xs.length; i++) {
    num += (xs[i] - mx) * (ys[i] - my);
    den += (xs[i] - mx) ** 2;
  }
  if (den === 0) return { exponent: null, label: "not enough data", points: pts.length };
  const k = num / den;
  return { exponent: k, label: describeExponent(k), points: pts.length };
}

/** Adverbial description used as "scales <label>". */
export function describeExponent(k: number): string {
  if (k < 0.35) return "very slowly (roughly constant or logarithmic)";
  if (k < 1.25) return "approximately linearly";
  if (k < 1.6) return "slightly faster than linearly (e.g. n log n or n√n)";
  if (k < 2.5) return "approximately quadratically";
  if (k < 3.5) return "approximately cubically";
  return "very steeply — possibly exponentially";
}

export function seriesFor(rows: BenchRow[], who: "user" | "reference"): Array<{ n: number; ms: number }> {
  return rows
    .filter((r) => r[who].status === "ok" && typeof r[who].ms === "number")
    .map((r) => ({ n: r.n, ms: r[who].ms as number }));
}

export function summarizeBenchmark(rows: BenchRow[]): {
  user: GrowthEstimate;
  reference: GrowthEstimate;
  sentences: string[];
} {
  const user = estimateGrowth(seriesFor(rows, "user"));
  const reference = estimateGrowth(seriesFor(rows, "reference"));
  const sentences: string[] = [];
  const timeout = rows.find((r) => r.user.status === "timeout");
  const errored = rows.find((r) => r.user.status === "error");

  if (user.exponent !== null) {
    sentences.push(`Your implementation appears to scale ${user.label} (fitted exponent ≈ ${user.exponent.toFixed(2)}).`);
  }
  if (reference.exponent !== null) {
    sentences.push(`The optimal implementation scales ${reference.label} (≈ ${reference.exponent.toFixed(2)}).`);
  }
  if (timeout) sentences.push(`Your implementation exceeded the per-run time limit at n = ${timeout.n.toLocaleString()}, so larger sizes were skipped.`);
  if (errored) sentences.push(`Your implementation raised an error at n = ${errored.n.toLocaleString()}: ${errored.user.error ?? "unknown error"}.`);

  const both = rows.filter((r) => r.user.status === "ok" && r.reference.status === "ok" && r.user.ms && r.reference.ms);
  const last = both[both.length - 1];
  if (last && last.reference.ms! > 0) {
    const ratio = last.user.ms! / last.reference.ms!;
    if (ratio > 1.5) sentences.push(`At n = ${last.n.toLocaleString()} yours took ${ratio.toFixed(ratio > 10 ? 0 : 1)}× as long as the optimal solution.`);
    else if (ratio < 0.67) sentences.push(`At n = ${last.n.toLocaleString()} yours was ${(1 / ratio).toFixed(1)}× faster than the reference implementation.`);
    else sentences.push(`At n = ${last.n.toLocaleString()} both implementations ran in comparable time.`);
  }
  if (rows.some((r) => r.match === false)) {
    sentences.push("Warning: on some generated inputs your output differed from the optimal solution's output.");
  }
  return { user, reference, sentences };
}
