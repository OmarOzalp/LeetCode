import { z } from "zod";
import { CATEGORY_IDS, DIFFICULTIES } from "./categories";

/**
 * Schema for a single Blind 75 problem (data/problems/<slug>.yaml).
 *
 * Conventions:
 *  - Prose fields (description, explanation, ...) are Markdown.
 *  - Code fields are Python 3 source.
 *  - `examples` are shown in the description AND run as visible tests.
 *  - `tests` are additional edge-case tests (shown only once run).
 *  - Test inputs are objects keyed by parameter name; values are JSON-like.
 *    Trees use LeetCode level-order arrays (null for missing children),
 *    linked lists use plain arrays, graphs use adjacency lists.
 */

const json: z.ZodType<unknown> = z.lazy(() =>
  z.union([z.string(), z.number(), z.boolean(), z.null(), z.array(json), z.record(json)]),
);

/**
 * Parameter type names understood by the Python harness.
 * Anything not listed in SPECIAL_TYPES is passed through as plain JSON data
 * (e.g. "int", "str", "List[int]", "List[List[str]]").
 */
export const SPECIAL_TYPES = ["ListNode", "List[ListNode]", "TreeNode", "Node", "TreeNodeVal"] as const;

export const ParamSchema = z.object({
  name: z.string().min(1),
  type: z.string().min(1),
  /** For TreeNode params: resolve this value to the node with that value inside another TreeNode param. */
  ref: z.string().optional(),
  /** For ListNode params: name of an int param giving the index the tail links back to (-1 = no cycle). */
  cycle_from: z.string().optional(),
  /** When false the param is only used to build other inputs and is not passed to the method. */
  call: z.boolean().optional(),
});
export type Param = z.infer<typeof ParamSchema>;

export const CompareModeSchema = z.enum(["exact", "unordered", "unordered_nested", "float", "custom"]);
export type CompareMode = z.infer<typeof CompareModeSchema>;

const FunctionRunnerSchema = z.object({
  kind: z.literal("function"),
  class_name: z.string().default("Solution"),
  method: z.string().min(1),
  params: z.array(ParamSchema).min(1),
  returns: z.string().min(1),
  compare: CompareModeSchema.default("exact"),
  /** Python source defining `check(inputs, output, expected) -> bool | (bool, str)`; required when compare is "custom". */
  checker: z.string().optional(),
  /** The method mutates this param in place; it is compared instead of the return value. */
  mutates: z.string().optional(),
});

const DesignRunnerSchema = z.object({
  kind: z.literal("design"),
  class_name: z.string().min(1),
  compare: z.enum(["exact", "float"]).default("exact"),
});

const CodecRunnerSchema = z.object({
  kind: z.literal("codec"),
  class_name: z.string().default("Codec"),
  encode: z.string().min(1),
  decode: z.string().min(1),
  /** Name of the single input param, e.g. "root" or "strs". */
  param: z.string().min(1),
  type: z.string().min(1),
});

export const RunnerSchema = z.discriminatedUnion("kind", [FunctionRunnerSchema, DesignRunnerSchema, CodecRunnerSchema]);
export type RunnerSpec = z.infer<typeof RunnerSchema>;

export const ExampleSchema = z.object({
  input: z.record(json),
  output: json,
  explanation: z.string().optional(),
});
export type Example = z.infer<typeof ExampleSchema>;

export const TestCaseSchema = z.object({
  input: z.record(json),
  expected: json,
  /** Optional short label, e.g. "single element" or "all negatives". */
  name: z.string().optional(),
});
export type TestCase = z.infer<typeof TestCaseSchema>;

export const AlternativeSchema = z.object({
  name: z.string().min(1),
  code: z.string().min(1),
  time_complexity: z.string().min(1),
  space_complexity: z.string().min(1),
  explanation: z.string().min(1),
  /** How this approach compares with the preferred one (used on the Compare tab). */
  tradeoff: z.string().min(1),
});
export type Alternative = z.infer<typeof AlternativeSchema>;

export const BenchmarkSchema = z.object({
  /** Increasing input sizes passed to generate(n, rng). */
  sizes: z.array(z.number().int().positive()).min(2),
  /** Python source defining `generate(n, rng) -> dict` returning a test input (same shape as tests[].input). */
  generator: z.string().min(1),
  /** What n means for this problem, e.g. "length of nums". */
  size_label: z.string().default("n"),
});

export const ProblemSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  slug: z.string().regex(/^[a-z0-9-]+$/),
  leetcode_url: z.string().url().optional(),
  category: z.enum(CATEGORY_IDS),
  difficulty: z.enum(DIFFICULTIES),
  patterns: z.array(z.string()).default([]),
  description: z.string().min(1),
  examples: z.array(ExampleSchema).min(1),
  constraints: z.array(z.string()).min(1),
  function_signature: z.string().min(1),
  starter_code: z.string().min(1),
  runner: RunnerSchema,
  hints: z.array(z.string()).min(2).max(4),
  approach: z.string().min(1),
  optimal_solution: z.string().min(1),
  explanation: z.string().min(1),
  key_insight: z.string().min(1),
  time_complexity: z.string().min(1),
  space_complexity: z.string().min(1),
  complexity_explanation: z.string().min(1),
  data_structures: z.array(z.string()).default([]),
  passes: z.string().optional(),
  alternatives: z.array(AlternativeSchema).default([]),
  tests: z.array(TestCaseSchema).default([]),
  benchmark: BenchmarkSchema.optional(),
});

export type ProblemInput = z.input<typeof ProblemSchema>;
export type Problem = z.infer<typeof ProblemSchema>;

export const ManifestSchema = z.object({
  categories: z.array(
    z.object({
      id: z.enum(CATEGORY_IDS),
      problems: z.array(z.string()).min(1),
    }),
  ),
});
export type Manifest = z.infer<typeof ManifestSchema>;
