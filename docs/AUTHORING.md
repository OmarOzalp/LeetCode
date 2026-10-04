# Authoring problems

Every Blind 75 problem lives in one YAML file: `data/problems/<slug>.yaml`.
The canonical list and order is `data/blind75.yaml`. The schema is enforced by
`shared/problemSchema.ts` (zod) and checked end to end by:

```bash
npm run validate                     # every problem
npm run validate -- two-sum 3sum     # just these
npm run validate -- --no-bench       # skip benchmarks (faster)
```

The validator runs the optimal solution **and every alternative** against all
tests, checks that the starter code does *not* pass, runs the benchmark
generator, and prints content-quality warnings. A problem is done when it shows
`✓` with no warnings.

Good references: `data/problems/two-sum.yaml` (function runner, alternatives,
benchmark) and `data/problems/implement-trie-prefix-tree.yaml` (design runner).

## YAML tips

- Use block scalars (`|`) for anything multi-line: descriptions, explanations,
  code. No escaping is needed inside them.
- **Quote** single-line strings that start with `` ` ``, `[`, `{`, `*`, `&`,
  `!`, `%`, `@`, `'`, `"`, or contain `: ` (colon + space) or ` #`.
- **Quote strings that look like numbers or booleans** in test data:
  `s: "226"`, `grid: [["1", "0"]]`. Unquoted `226` is an integer.
- `null`, `true`, `false` are JSON null/bool. In Python they become
  `None`/`True`/`False`.

## Fields

| Field | Notes |
| --- | --- |
| `id` | LeetCode problem number as a string (`"1"`). |
| `title`, `slug` | `slug` must equal the file name. |
| `leetcode_url` | Optional link to the original problem. |
| `category` | One of the ids in `shared/categories.ts`. |
| `difficulty` | `Easy`, `Medium` or `Hard`. |
| `patterns` | Short tags such as `Hash Map`, `Sliding Window`, `DFS`, `Kadane's Algorithm`, `Topological Sort`. |
| `description` | Markdown. Rewrite the problem in your own words; inline code in backticks. |
| `examples` | 2–3 items: `input` (object keyed by param name), `output`, optional `explanation`. Examples are shown in the description **and** run as visible tests. |
| `constraints` | Markdown strings, e.g. ``"`1 <= nums.length <= 10^5`"``. |
| `function_signature` | One line, e.g. `def twoSum(self, nums: List[int], target: int) -> List[int]`. |
| `starter_code` | Python with the class + method signature and `pass`. `typing`, `collections`, `heapq`, `math`, `bisect`, `itertools`, `functools`, `ListNode`, `TreeNode`, `Node` are pre-imported. |
| `runner` | How tests call the code (see below). |
| `hints` | 2–4 strings, progressing from conceptual to "almost the approach". **No code.** |
| `approach` | Name of the preferred interview approach. |
| `optimal_solution` | Clean, commented, interview-standard Python. |
| `explanation` | Markdown: **Intuition**, **Algorithm** (steps), and any subtle point/edge case. Teach the idea, not just the code. |
| `key_insight` | One sentence used on the Compare page. |
| `time_complexity`, `space_complexity` | `O(...)` strings. Use `·` or `*` for products (`O(m · n)`), `²` or `^2` for powers. |
| `complexity_explanation` | Markdown: *why* those bounds hold. |
| `data_structures` | e.g. `[Hash map]`, `[Stack]`, `[Min-heap]`. |
| `passes` | Optional, e.g. `1 pass over nums`. |
| `alternatives` | 0–2 other approaches (brute force first), each with `name`, `code`, `time_complexity`, `space_complexity`, `explanation`, `tradeoff` (compared with the optimal). They must pass all tests. |
| `tests` | Hidden edge-case tests: `{ name, input, expected }`. Aim for 5–10 covering empty/minimal inputs, duplicates, negatives, boundaries and worst cases. |
| `benchmark` | Optional: `sizes` (increasing), `size_label`, `generator` (Python defining `generate(n, rng)` that returns one test input). The optimal solution should finish the largest size in well under a second. |

## Runner kinds

### `function` — call a method on a class (default `Solution`)

```yaml
runner:
  kind: function
  method: twoSum
  params:
    - { name: nums, type: "List[int]" }
    - { name: target, type: int }
  returns: "List[int]"
  compare: unordered        # exact (default) | unordered | unordered_nested | float | custom
```

Special parameter/return types (everything else is plain JSON data):

| Type | Test data format |
| --- | --- |
| `ListNode` / `Optional[ListNode]` | array of values, e.g. `[1, 2, 3]` (`[]` = None) |
| `List[ListNode]` | array of arrays |
| `TreeNode` / `Optional[TreeNode]` | LeetCode level order: `[3, 9, 20, null, null, 15, 7]` |
| `Node` | 1-indexed adjacency list (Clone Graph); clones must be new objects |
| `TreeNodeVal` (return only) | the returned node is compared by its `.val` |

Param options:

- `ref: root` — the test value is a node **value**; the harness passes the node
  with that value from the `root` tree (Lowest Common Ancestor).
- `cycle_from: pos` + a `pos` param with `call: false` — builds a linked list
  whose tail links to index `pos` (Linked List Cycle).
- `mutates: matrix` on the runner — the method modifies that param in place and
  returns `None`; the param is compared after the call (Rotate Image).

Compare modes:

- `unordered` — the result list may be in any order.
- `unordered_nested` — any order for the outer list *and* each inner list
  (3Sum, Group Anagrams).
- `float` — numbers compared with a tolerance.
- `custom` — supply `checker`, Python defining
  `check(inputs, output, expected) -> bool | (bool, message)` for problems
  with several valid answers.

### `design` — a sequence of operations on a class

```yaml
runner: { kind: design, class_name: Trie }          # compare: exact | float
tests:
  - input:
      operations: [Trie, insert, search]
      arguments: [[], [apple], [apple]]
    expected: [null, null, true]
```

### `codec` — encode/decode round trip

```yaml
runner:
  kind: codec
  class_name: Codec
  encode: serialize
  decode: deserialize
  param: root
  type: TreeNode
```

The test passes when `decode(encode(value))` equals `expected` (normally the
input itself) and `encode` returned a string.
