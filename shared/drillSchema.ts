import { z } from "zod";

/**
 * Drill content (data/drills/<topic>.yaml). The format matches the CodeToGo app,
 * so Python topics can be imported from it (scripts/import-codetogo.ts).
 */

/** A reference card: one method, idiom or template with a runnable example. */
export const DrillMethodSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  summary: z.string().min(1),
  details: z.string().optional(),
  /** Runnable Python that prints its results. */
  example: z.string().min(1),
  /** Exactly what `example` prints. */
  output: z.string(),
  complexity: z.string().optional(),
  tip: z.string().optional(),
});
export type DrillMethod = z.infer<typeof DrillMethodSchema>;

/** Multiple-choice question (optionally about a code snippet). */
export const DrillQuizSchema = z.object({
  id: z.string().min(1),
  /** Method card this question practices (optional). */
  method: z.string().optional(),
  question: z.string().min(1),
  code: z.string().optional(),
  options: z.array(z.string()).min(2).max(6),
  answer: z.number().int().min(0),
  explanation: z.string().min(1),
});
export type DrillQuiz = z.infer<typeof DrillQuizSchema>;

/**
 * "Complete the line": fill the `___` in `line` so that `check` is true.
 * Answers are verified by running Python, so any correct fill counts.
 */
export const DrillItemSchema = z.object({
  id: z.string().min(1),
  method: z.string().optional(),
  title: z.string().min(1),
  task: z.string().min(1),
  setup: z.string(),
  line: z.string().refine((s) => s.split("___").length === 2, "line must contain ___ exactly once"),
  /** Optional code that runs after the line (lets the blank sit inside a function or loop). */
  after: z.string().optional(),
  answer: z.string().min(1),
  accept: z.array(z.string()).optional(),
  decoys: z.array(z.string()).min(1).max(4),
  /** Python expression shown as "you got" after running. */
  show: z.string().min(1),
  /** Python literal `show` must equal (shown as the target). */
  expected: z.string(),
  /** Optional custom boolean check; defaults to `(show) == (expected)`. */
  check: z.string().optional(),
  hint: z.string().optional(),
  explain: z.string().min(1),
});
export type DrillItem = z.infer<typeof DrillItemSchema>;

export const DrillTopicSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/),
  title: z.string().min(1),
  /** Section on the Drills page, e.g. "Python", "Interview templates", "Big-O". */
  group: z.string().min(1),
  order: z.number(),
  blurb: z.string().min(1),
  intro: z.string().optional(),
  methods: z.array(DrillMethodSchema).default([]),
  quiz: z.array(DrillQuizSchema).default([]),
  drills: z.array(DrillItemSchema).default([]),
});
export type DrillTopic = z.infer<typeof DrillTopicSchema>;

/** Pattern-recognition mapping: which technique each Blind 75 problem calls for. */
export const PatternMapSchema = z.object({
  labels: z.array(z.string()).min(4),
  problems: z.array(
    z.object({
      slug: z.string(),
      answer: z.string(),
      /** Other techniques that also work; never used as wrong options. */
      also: z.array(z.string()).default([]),
    }),
  ),
});
export type PatternMap = z.infer<typeof PatternMapSchema>;

export const BLANK = "___";

export function drillCheckExpr(d: Pick<DrillItem, "check" | "show" | "expected">): string {
  return d.check ?? `(${d.show}) == (${d.expected})`;
}

/** The full program for a fill: setup, the completed line, then `after`. */
export function drillProgram(d: Pick<DrillItem, "line" | "after">, fill: string): string {
  const line = d.line.replace(BLANK, fill);
  return d.after ? `${line}\n${d.after}` : line;
}
