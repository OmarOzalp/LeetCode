import type { DrillDay, DrillsResponse, PatternCard } from "@shared/api";
import type { DrillItem, DrillQuiz, DrillTopic } from "@shared/drillSchema";
import { dayKey, isDue, stageOf, weakness, type CardState } from "@shared/srs";

export type DrillCard =
  | { kind: "drill"; id: string; topicId: string; topicTitle: string; methodId?: string; item: DrillItem }
  | { kind: "quiz"; id: string; topicId: string; topicTitle: string; methodId?: string; quiz: DrillQuiz }
  | { kind: "pattern"; id: string; topicId: "patterns"; topicTitle: string; methodId?: undefined; card: PatternCard };

export type SessionMode = "review" | "topic" | "method" | "weak" | "patterns" | "sprint" | "missed";

export const PATTERNS_TOPIC = { id: "patterns", title: "Pattern Recognition" } as const;

export function allCards(content: DrillsResponse): DrillCard[] {
  const out: DrillCard[] = [];
  for (const t of content.topics) {
    for (const d of t.drills) out.push({ kind: "drill", id: d.id, topicId: t.id, topicTitle: t.title, methodId: d.method, item: d });
    for (const q of t.quiz) out.push({ kind: "quiz", id: q.id, topicId: t.id, topicTitle: t.title, methodId: q.method, quiz: q });
  }
  for (const p of content.patterns) out.push({ kind: "pattern", id: p.id, topicId: "patterns", topicTitle: PATTERNS_TOPIC.title, card: p });
  return out;
}

/** Deterministic-per-call shuffle (pass Math.random in the app, a seeded fn in tests). */
export function shuffle<T>(items: T[], rand: () => number = Math.random): T[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export interface SessionOptions {
  topicId?: string;
  methodId?: string;
  /** New cards introduced per review session. */
  newLimit?: number;
  limit?: number;
  today?: string;
  rand?: () => number;
  /** Card ids for "missed" mode. */
  ids?: string[];
}

/** Order: overdue first (lowest box, oldest due), then new cards, then the rest. */
function prioritized(cards: DrillCard[], states: Record<string, CardState>, today: string): DrillCard[] {
  const due = cards.filter((c) => isDue(states[c.id], today)).sort((a, b) => states[a.id].box - states[b.id].box || (states[a.id].due < states[b.id].due ? -1 : 1));
  const fresh = cards.filter((c) => !states[c.id]);
  const rest = cards
    .filter((c) => states[c.id] && !isDue(states[c.id], today))
    .sort((a, b) => states[a.id].box - states[b.id].box || (states[a.id].due < states[b.id].due ? -1 : 1));
  return [...due, ...fresh, ...rest];
}

export function buildSession(mode: SessionMode, cards: DrillCard[], states: Record<string, CardState>, opts: SessionOptions = {}): DrillCard[] {
  const today = opts.today ?? dayKey(new Date());
  const rand = opts.rand ?? Math.random;
  switch (mode) {
    case "review": {
      const due = cards
        .filter((c) => isDue(states[c.id], today))
        .sort((a, b) => states[a.id].box - states[b.id].box || (states[a.id].due < states[b.id].due ? -1 : 1))
        .slice(0, opts.limit ?? 30);
      // Introduce new cards gradually, topic by topic, skipping pattern cards (they have their own mode).
      const fresh = cards.filter((c) => !states[c.id] && c.kind !== "pattern").slice(0, opts.newLimit ?? 8);
      return shuffle(due, rand).concat(fresh);
    }
    case "topic":
      return prioritized(
        cards.filter((c) => c.topicId === opts.topicId),
        states,
        today,
      ).slice(0, opts.limit ?? 20);
    case "method":
      return prioritized(
        cards.filter((c) => c.methodId === opts.methodId),
        states,
        today,
      );
    case "patterns":
      return prioritized(
        shuffle(
          cards.filter((c) => c.kind === "pattern"),
          rand,
        ),
        states,
        today,
      ).slice(0, opts.limit ?? 12);
    case "weak":
      return cards
        .filter((c) => weakness(states[c.id]) > 0.3)
        .sort((a, b) => weakness(states[b.id]) - weakness(states[a.id]))
        .slice(0, opts.limit ?? 15);
    case "missed": {
      const ids = new Set(opts.ids ?? []);
      return cards.filter((c) => ids.has(c.id));
    }
    case "sprint": {
      // Short cards you have seen before, shuffled; fall back to quiz cards for variety.
      const quick = cards.filter((c) => c.kind !== "pattern");
      const known = shuffle(
        quick.filter((c) => states[c.id]),
        rand,
      );
      const others = shuffle(
        quick.filter((c) => !states[c.id] && c.kind === "quiz"),
        rand,
      );
      return [...known, ...others].slice(0, opts.limit ?? 80);
    }
  }
}

export interface DeckStats {
  total: number;
  fresh: number;
  learning: number;
  mastered: number;
  due: number;
}

export function deckStats(cards: DrillCard[], states: Record<string, CardState>, today = dayKey(new Date())): DeckStats {
  const s: DeckStats = { total: cards.length, fresh: 0, learning: 0, mastered: 0, due: 0 };
  for (const c of cards) {
    const st = states[c.id];
    const stage = stageOf(st);
    if (stage === "new") s.fresh++;
    else if (stage === "learning") s.learning++;
    else s.mastered++;
    if (isDue(st, today)) s.due++;
  }
  return s;
}

/** Consecutive days with at least one drill answer, ending today (or yesterday). */
export function drillStreak(days: Record<string, DrillDay>, now = new Date()): number {
  let streak = 0;
  for (let i = 0; i < 400; i++) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
    if (days[dayKey(d)]?.reviewed) streak++;
    else if (i > 0) break;
  }
  return streak;
}

export function recentAccuracy(days: Record<string, DrillDay>, n = 7, now = new Date()): { reviewed: number; correct: number; avgMs: number } {
  let reviewed = 0;
  let correct = 0;
  let ms = 0;
  for (let i = 0; i < n; i++) {
    const d = days[dayKey(new Date(now.getFullYear(), now.getMonth(), now.getDate() - i))];
    if (!d) continue;
    reviewed += d.reviewed;
    correct += d.correct;
    ms += d.ms;
  }
  return { reviewed, correct, avgMs: reviewed ? ms / reviewed : 0 };
}

export function bestSprint(days: Record<string, DrillDay>): number {
  return Object.values(days).reduce((m, d) => Math.max(m, d.bestSprint ?? 0), 0);
}

// ------------------------------------------------------------------ answers

/** Curly quotes and long dashes from OS keyboards become plain ASCII. */
export function sanitizeCode(s: string): string {
  return s
    .replace(/[‘’‚′]/g, "'")
    .replace(/[“”„″]/g, '"')
    .replace(/—/g, "--")
    .replace(/–/g, "-")
    .replace(/ /g, " ");
}

/**
 * Canonical form for comparing fills without running Python: drops whitespace
 * outside string literals and writes every literal with double quotes.
 * (Same rules as the CodeToGo app.)
 */
export function normalizeCode(s: string): string {
  const src = sanitizeCode(s).trim();
  let out = "";
  let quote: string | null = null;
  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (quote) {
      if (ch === "\\" && i + 1 < src.length) {
        const next = src[++i];
        out += next === quote ? next : ch + next;
      } else if (ch === quote) {
        out += '"';
        quote = null;
      } else out += ch === '"' ? '\\"' : ch;
    } else if (ch === '"' || ch === "'") {
      quote = ch;
      out += '"';
    } else if (/\s/.test(ch)) {
      const next = src.slice(i + 1).trimStart()[0] ?? "";
      if (/\w$/.test(out) && /\w/.test(next) && !out.endsWith(" ")) out += " ";
    } else out += ch;
  }
  return out;
}

export function matchesKnownAnswer(d: DrillItem, fill: string): boolean {
  const n = normalizeCode(fill);
  return [d.answer, ...(d.accept ?? [])].some((a) => normalizeCode(a) === n);
}

export function choicesFor(d: DrillItem, rand: () => number = Math.random): string[] {
  return shuffle([d.answer, ...d.decoys], rand);
}

/** Split the drill line around the blank: [before, after]. */
export function splitLine(line: string): [string, string] {
  const i = line.indexOf("___");
  return [line.slice(0, i), line.slice(i + 3)];
}

export function topicOf(content: DrillsResponse, id: string): DrillTopic | undefined {
  return content.topics.find((t) => t.id === id);
}
