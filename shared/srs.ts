/**
 * Spaced repetition for drill cards: a Leitner system with automatic grading.
 *
 * Every answer is graded from what happened rather than by asking you:
 *   - wrong (or gave up)          -> back to box 0, due again today
 *   - right with a hint/choices   -> box stays (at least 1), shorter interval
 *   - right unaided               -> next box
 *   - right unaided and fast      -> skips a box once you know it (box >= 2)
 * Intervals grow 0 → 1 → 3 → 7 → 14 → 30 → 60 days. Box 4+ counts as mastered.
 */

export const INTERVAL_DAYS = [0, 1, 3, 7, 14, 30, 60] as const;
export const MAX_BOX = INTERVAL_DAYS.length - 1;
export const MASTERED_BOX = 4;

export interface CardState {
  box: number;
  /** Local calendar day (YYYY-MM-DD) the card is next due. */
  due: string;
  reps: number;
  correct: number;
  wrong: number;
  lapses: number;
  lastAt: string;
  lastMs: number;
  bestMs?: number;
}

export interface ReviewInput {
  correct: boolean;
  ms: number;
  /** A hint, the multiple-choice options, or the reveal was used. */
  assisted: boolean;
  /** Seconds under which an unaided answer counts as fast. */
  fastSeconds?: number;
}

export function dayKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function addDays(day: string, n: number): string {
  const [y, m, d] = day.split("-").map(Number);
  return dayKey(new Date(y, m - 1, d + n));
}

export function review(prev: CardState | undefined, input: ReviewInput, now = new Date()): CardState {
  const today = dayKey(now);
  const base: CardState = prev ?? { box: 0, due: today, reps: 0, correct: 0, wrong: 0, lapses: 0, lastAt: now.toISOString(), lastMs: 0 };
  let box = base.box;
  let interval: number;
  if (!input.correct) {
    box = 0;
    interval = 0;
  } else if (input.assisted) {
    box = Math.max(1, Math.min(box, MAX_BOX));
    interval = Math.max(1, Math.floor(INTERVAL_DAYS[box] / 2));
  } else {
    const fast = input.ms <= (input.fastSeconds ?? 8) * 1000;
    box = Math.min(MAX_BOX, box + (fast && box >= 2 ? 2 : 1));
    interval = INTERVAL_DAYS[box];
  }
  return {
    box,
    due: addDays(today, interval),
    reps: base.reps + 1,
    correct: base.correct + (input.correct ? 1 : 0),
    wrong: base.wrong + (input.correct ? 0 : 1),
    lapses: base.lapses + (!input.correct && base.box >= 2 ? 1 : 0),
    lastAt: now.toISOString(),
    lastMs: Math.round(input.ms),
    bestMs: input.correct && !input.assisted ? Math.min(base.bestMs ?? Infinity, Math.round(input.ms)) : base.bestMs,
  };
}

export function isDue(s: CardState | undefined, today: string): boolean {
  return !!s && s.due <= today;
}

export type CardStage = "new" | "learning" | "mastered";

export function stageOf(s: CardState | undefined): CardStage {
  if (!s) return "new";
  return s.box >= MASTERED_BOX ? "mastered" : "learning";
}

/** Higher = weaker. Cards never seen score 0 (they're "new", not weak). */
export function weakness(s: CardState | undefined): number {
  if (!s || s.reps === 0) return 0;
  const errorRate = s.wrong / s.reps;
  return errorRate * 2 + s.lapses * 0.5 + (MAX_BOX - s.box) * 0.15 + (s.lastMs > 20000 ? 0.3 : 0);
}
