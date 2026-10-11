import { describe, expect, it } from "vitest";
import type { DrillsResponse } from "@shared/api";
import type { CardState } from "@shared/srs";
import { allCards, buildSession, deckStats, drillStreak, matchesKnownAnswer, normalizeCode, recentAccuracy, splitLine } from "./drills";
import { detectPythonUsage } from "./pyUsage";

const drill = (id: string, method?: string) => ({
  id,
  method,
  title: id,
  task: "t",
  setup: "x = [1]",
  line: "y = ___",
  answer: "x[0]",
  accept: ["x[-1]"],
  decoys: ["x"],
  show: "y",
  expected: "1",
  explain: "e",
});

const content: DrillsResponse = {
  topics: [
    { id: "lists", title: "Lists", group: "Python", order: 1, blurb: "b", methods: [], quiz: [{ id: "q1", question: "?", options: ["a", "b"], answer: 0, explanation: "e" }], drills: [drill("d1", "m1"), drill("d2", "m1"), drill("d3")] },
    { id: "sets", title: "Sets", group: "Python", order: 2, blurb: "b", methods: [], quiz: [], drills: [drill("d4")] },
  ],
  patterns: [{ id: "pattern-two-sum", slug: "two-sum", title: "Two Sum", difficulty: "Easy", category: "Arrays", prompt: "p", options: ["Hash map / set", "Trie"], answer: 0, also: [], explanation: "e", approach: "a" }],
};

const st = (box: number, due: string, extra: Partial<CardState> = {}): CardState => ({ box, due, reps: 1, correct: 1, wrong: 0, lapses: 0, lastAt: "", lastMs: 3000, ...extra });
const seq = () => {
  let i = 0;
  return () => ((i++ * 0.37) % 1);
};

describe("drill sessions", () => {
  const cards = allCards(content);

  it("flattens drills, quiz and pattern cards", () => {
    expect(cards.map((c) => `${c.kind}:${c.id}`)).toEqual(["drill:d1", "drill:d2", "drill:d3", "quiz:q1", "drill:d4", "pattern:pattern-two-sum"]);
  });

  it("review = due cards plus a limited number of new cards (no pattern cards)", () => {
    const states = { d1: st(2, "2026-10-01"), d2: st(3, "2026-12-01") };
    const s = buildSession("review", cards, states, { today: "2026-10-11", newLimit: 2, rand: seq() });
    expect(s.map((c) => c.id)).toEqual(["d1", "d3", "q1"]);
  });

  it("topic and method sessions put due cards first, then new ones", () => {
    const states = { d2: st(1, "2026-10-10"), d3: st(4, "2026-12-01") };
    expect(buildSession("topic", cards, states, { topicId: "lists", today: "2026-10-11" }).map((c) => c.id)).toEqual(["d2", "d1", "q1", "d3"]);
    expect(buildSession("method", cards, states, { methodId: "m1", today: "2026-10-11" }).map((c) => c.id)).toEqual(["d2", "d1"]);
  });

  it("weak spots rank by error rate and lapses", () => {
    const states = { d1: st(0, "2026-10-11", { reps: 4, wrong: 3, lapses: 2 }), d4: st(1, "2026-10-12", { reps: 2, wrong: 1 }), d2: st(5, "2026-12-01") };
    expect(buildSession("weak", cards, states, { today: "2026-10-11" }).map((c) => c.id)).toEqual(["d1", "d4"]);
  });

  it("missed mode replays exactly the given ids; sprint skips pattern cards", () => {
    expect(buildSession("missed", cards, {}, { ids: ["d4", "q1"] }).map((c) => c.id)).toEqual(["q1", "d4"]);
    expect(buildSession("sprint", cards, { d1: st(1, "2026-10-12") }, { rand: seq() }).every((c) => c.kind !== "pattern")).toBe(true);
  });

  it("computes deck stats, streaks and accuracy", () => {
    const states = { d1: st(4, "2026-12-01"), d2: st(1, "2026-10-01") };
    expect(deckStats(cards, states, "2026-10-11")).toEqual({ total: 6, fresh: 4, learning: 1, mastered: 1, due: 1 });
    const days = { "2026-10-11": { reviewed: 5, correct: 4, ms: 10_000 }, "2026-10-10": { reviewed: 2, correct: 2, ms: 4_000 }, "2026-10-08": { reviewed: 1, correct: 0, ms: 1000 } };
    const now = new Date(2026, 9, 11, 12);
    expect(drillStreak(days, now)).toBe(2);
    expect(recentAccuracy(days, 7, now)).toEqual({ reviewed: 8, correct: 6, avgMs: 15_000 / 8 });
  });
});

describe("answers", () => {
  it("normalizes whitespace and quote style but not meaning", () => {
    expect(normalizeCode("' '.join( words )")).toBe(normalizeCode('" ".join(words)'));
    expect(normalizeCode('"a b"')).not.toBe(normalizeCode('"ab"'));
    expect(normalizeCode("not x")).not.toBe(normalizeCode("notx"));
    expect(normalizeCode("“ ”.join(w)")).toBe(normalizeCode('" ".join(w)'));
    expect(matchesKnownAnswer(drill("d"), " x[-1] ")).toBe(true);
    expect(matchesKnownAnswer(drill("d"), "x")).toBe(false);
    expect(splitLine("    total = ___ + 1")).toEqual(["    total = ", " + 1"]);
  });

  it("detects Python idioms in solutions", () => {
    const code = "heap = []\nfor i, x in enumerate(nums):\n    heappush(heap, (-x, i))\ncount = Counter(nums)\n";
    const labels = detectPythonUsage(code).map((u) => u.method);
    expect(labels).toEqual(expect.arrayContaining(["collections-counter", "heapq-push-pop", "heapq-max-heap", "builtins-enumerate"]));
    expect(detectPythonUsage(code, new Set(["collections-counter"])).map((u) => u.method)).toEqual(["collections-counter"]);
  });
});
