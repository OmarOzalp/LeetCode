import { describe, expect, it } from "vitest";
import { addDays, dayKey, isDue, MAX_BOX, review, stageOf, weakness } from "./srs";

const now = new Date(2026, 9, 11, 10, 0, 0); // Oct 11 2026, local time
const today = dayKey(now);

describe("spaced repetition", () => {
  it("adds days across month boundaries", () => {
    expect(addDays("2026-10-30", 3)).toBe("2026-11-02");
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
  });

  it("promotes unaided correct answers through the boxes", () => {
    let s = review(undefined, { correct: true, ms: 20_000, assisted: false }, now);
    expect(s.box).toBe(1);
    expect(s.due).toBe(addDays(today, 1));
    s = review(s, { correct: true, ms: 20_000, assisted: false }, now);
    expect(s.box).toBe(2);
    expect(s.due).toBe(addDays(today, 3));
    s = review(s, { correct: true, ms: 20_000, assisted: false }, now);
    expect(s.box).toBe(3);
    expect(s.due).toBe(addDays(today, 7));
  });

  it("skips a box for fast answers once a card is known", () => {
    const known = { ...review(undefined, { correct: true, ms: 1000, assisted: false }, now), box: 2 };
    const fast = review(known, { correct: true, ms: 2000, assisted: false, fastSeconds: 8 }, now);
    expect(fast.box).toBe(4);
    expect(stageOf(fast)).toBe("mastered");
  });

  it("keeps the box (and shortens the interval) when help was used", () => {
    const s = { ...review(undefined, { correct: true, ms: 1000, assisted: false }, now), box: 3 };
    const helped = review(s, { correct: true, ms: 5000, assisted: true }, now);
    expect(helped.box).toBe(3);
    expect(helped.due).toBe(addDays(today, 3));
  });

  it("sends wrong answers back to box 0, due today, and counts lapses", () => {
    const s = { ...review(undefined, { correct: true, ms: 1000, assisted: false }, now), box: 4 };
    const wrong = review(s, { correct: false, ms: 9000, assisted: false }, now);
    expect(wrong.box).toBe(0);
    expect(wrong.due).toBe(today);
    expect(wrong.lapses).toBe(1);
    expect(isDue(wrong, today)).toBe(true);
    expect(weakness(wrong)).toBeGreaterThan(weakness(s));
  });

  it("never exceeds the top box and tracks the best unaided time", () => {
    let s = review(undefined, { correct: true, ms: 5000, assisted: false }, now);
    for (let i = 0; i < 10; i++) s = review(s, { correct: true, ms: 3000 + i, assisted: false }, now);
    expect(s.box).toBe(MAX_BOX);
    expect(s.bestMs).toBe(3000);
    expect(stageOf(undefined)).toBe("new");
  });
});
