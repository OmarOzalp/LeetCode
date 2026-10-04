import { describe, expect, it } from "vitest";
import { ProblemSchema, type Problem, type ProblemInput } from "../../shared/problemSchema.ts";
import { analyzeSolutions, runBenchmark, runSnippet, runTests } from "./judge.ts";

/** Builds a minimal valid problem around a runner spec for harness tests. */
function makeProblem(over: Partial<ProblemInput> & Pick<ProblemInput, "runner" | "examples" | "optimal_solution">): Problem {
  return ProblemSchema.parse({
    id: "0",
    title: "T",
    slug: "t",
    category: "arrays-hashing",
    difficulty: "Easy",
    description: "d",
    constraints: ["c"],
    function_signature: "f",
    starter_code: "class Solution: pass  # " + JSON.stringify(over.runner),
    hints: ["a", "b"],
    approach: "a",
    explanation: "e",
    key_insight: "k",
    time_complexity: "O(n)",
    space_complexity: "O(1)",
    complexity_explanation: "c",
    ...over,
  });
}

describe("python judge", () => {
  it("builds linked lists with cycles from a non-call param", async () => {
    const p = makeProblem({
      runner: {
        kind: "function",
        method: "hasCycle",
        params: [
          { name: "head", type: "Optional[ListNode]", cycle_from: "pos" },
          { name: "pos", type: "int", call: false },
        ],
        returns: "bool",
      },
      examples: [
        { input: { head: [3, 2, 0, -4], pos: 1 }, output: true },
        { input: { head: [1], pos: -1 }, output: false },
        { input: { head: [], pos: -1 }, output: false },
      ],
      optimal_solution: `class Solution:
    def hasCycle(self, head):
        slow = fast = head
        while fast and fast.next:
            slow, fast = slow.next, fast.next.next
            if slow is fast:
                return True
        return False`,
    });
    const res = await runTests(p, p.optimal_solution, "all");
    expect(res.results.map((r) => r.status)).toEqual(["passed", "passed", "passed"]);
  });

  it("resolves tree node references and returns node values", async () => {
    const p = makeProblem({
      runner: {
        kind: "function",
        method: "lowestCommonAncestor",
        params: [
          { name: "root", type: "TreeNode" },
          { name: "p", type: "TreeNode", ref: "root" },
          { name: "q", type: "TreeNode", ref: "root" },
        ],
        returns: "TreeNodeVal",
      },
      examples: [{ input: { root: [6, 2, 8, 0, 4, 7, 9, null, null, 3, 5], p: 2, q: 4 }, output: 2 }],
      optimal_solution: `class Solution:
    def lowestCommonAncestor(self, root, p, q):
        while root:
            if p.val < root.val and q.val < root.val: root = root.left
            elif p.val > root.val and q.val > root.val: root = root.right
            else: return root`,
    });
    const res = await runTests(p, p.optimal_solution, "all");
    expect(res.allPassed).toBe(true);
  });

  it("checks in-place mutation and tree round trips", async () => {
    const p = makeProblem({
      runner: {
        kind: "function",
        method: "rotate",
        params: [{ name: "matrix", type: "List[List[int]]" }],
        returns: "None",
        mutates: "matrix",
      },
      examples: [{ input: { matrix: [[1, 2], [3, 4]] }, output: [[3, 1], [4, 2]] }],
      optimal_solution: `class Solution:
    def rotate(self, matrix):
        matrix[:] = [list(r) for r in zip(*matrix[::-1])]`,
    });
    expect((await runTests(p, p.optimal_solution, "all")).allPassed).toBe(true);
    const wrong = await runTests(p, "class Solution:\n    def rotate(self, matrix):\n        return [[3,1],[4,2]]", "all");
    expect(wrong.results[0].status).toBe("failed");
  });

  it("rejects graph clones that reuse original nodes", async () => {
    const p = makeProblem({
      runner: { kind: "function", method: "cloneGraph", params: [{ name: "node", type: "Optional[Node]" }], returns: "Optional[Node]" },
      examples: [{ input: { node: [[2, 4], [1, 3], [2, 4], [1, 3]] }, output: [[2, 4], [1, 3], [2, 4], [1, 3]] }],
      optimal_solution: `class Solution:
    def cloneGraph(self, node):
        if not node: return None
        copies = {}
        def dfs(n):
            if n in copies: return copies[n]
            c = Node(n.val)
            copies[n] = c
            c.neighbors = [dfs(x) for x in n.neighbors]
            return c
        return dfs(node)`,
    });
    expect((await runTests(p, p.optimal_solution, "all")).allPassed).toBe(true);
    const cheat = await runTests(p, "class Solution:\n    def cloneGraph(self, node):\n        return node", "all");
    expect(cheat.results[0].status).toBe("failed");
    expect(cheat.results[0].message).toMatch(/brand-new/);
  });

  it("runs design problems as operation sequences and explains mismatches", async () => {
    const p = makeProblem({
      runner: { kind: "design", class_name: "Counter2" },
      examples: [{ input: { operations: ["Counter2", "inc", "get"], arguments: [[], [], []] }, output: [null, null, 1] }],
      starter_code: "class Counter2: pass",
      optimal_solution: `class Counter2:
    def __init__(self): self.n = 0
    def inc(self): self.n += 1
    def get(self): return self.n`,
    });
    expect((await runTests(p, p.optimal_solution, "all")).allPassed).toBe(true);
    const bad = await runTests(p, "class Counter2:\n    def __init__(self): self.n = 0\n    def inc(self): pass\n    def get(self): return self.n", "all");
    expect(bad.results[0].message).toMatch(/operation #3/);
  });

  it("round-trips codec problems", async () => {
    const p = makeProblem({
      runner: { kind: "codec", class_name: "Codec", encode: "serialize", decode: "deserialize", param: "root", type: "TreeNode" },
      examples: [{ input: { root: [1, 2, 3, null, null, 4, 5] }, output: [1, 2, 3, null, null, 4, 5] }],
      starter_code: "class Codec: pass",
      optimal_solution: `class Codec:
    def serialize(self, root):
        out = []
        def go(n):
            if not n: out.append("#"); return
            out.append(str(n.val)); go(n.left); go(n.right)
        go(root)
        return ",".join(out)
    def deserialize(self, data):
        it = iter(data.split(","))
        def go():
            v = next(it)
            if v == "#": return None
            n = TreeNode(int(v)); n.left = go(); n.right = go(); return n
        return go()`,
    });
    expect((await runTests(p, p.optimal_solution, "all")).allPassed).toBe(true);
  });

  it("supports custom checkers for problems with multiple valid answers", async () => {
    const p = makeProblem({
      runner: {
        kind: "function",
        method: "longestPalindrome",
        params: [{ name: "s", type: "str" }],
        returns: "str",
        compare: "custom",
        checker: `def check(inputs, output, expected):
    s = inputs["s"]
    if not isinstance(output, str) or output not in s or output != output[::-1]:
        return False, "Output must be a palindromic substring of s."
    return len(output) == len(expected), None`,
      },
      examples: [{ input: { s: "babad" }, output: "bab" }],
      optimal_solution: "class Solution:\n    def longestPalindrome(self, s):\n        return 'aba' if s == 'babad' else s",
    });
    expect((await runTests(p, p.optimal_solution, "all")).allPassed).toBe(true);
    const bad = await runTests(p, "class Solution:\n    def longestPalindrome(self, s):\n        return 'bad'", "all");
    expect(bad.results[0].message).toMatch(/palindromic substring/);
  });

  it("reports syntax errors with line numbers and stops infinite loops", async () => {
    const p = makeProblem({
      runner: { kind: "function", method: "f", params: [{ name: "x", type: "int" }], returns: "int" },
      examples: [
        { input: { x: 1 }, output: 1 },
        { input: { x: 2 }, output: 2 },
      ],
      optimal_solution: "class Solution:\n    def f(self, x):\n        return x",
    });
    const syntax = await runTests(p, "class Solution:\n    def f(self, x)\n        return x", "all");
    expect(syntax.status).toBe("compile_error");
    expect(syntax.loadError?.line).toBe(2);

    const loop = await runTests(p, "class Solution:\n    def f(self, x):\n        while True: pass", "all", undefined, { perTestLimitS: 0.5 });
    expect(loop.results[0].status).toBe("timeout");
  });

  it("benchmarks, analyzes and runs snippets", async () => {
    const p = makeProblem({
      runner: { kind: "function", method: "total", params: [{ name: "nums", type: "List[int]" }], returns: "int" },
      examples: [{ input: { nums: [1, 2] }, output: 3 }],
      optimal_solution: "class Solution:\n    def total(self, nums):\n        return sum(nums)",
      benchmark: { sizes: [10, 100], generator: "def generate(n, rng):\n    return {'nums': [rng.randint(1, 9) for _ in range(n)]}" },
    });
    const b = await runBenchmark(p, "class Solution:\n    def total(self, nums):\n        t = 0\n        for x in nums:\n            for _ in nums: pass\n            t += x\n        return t");
    expect(b.rows).toHaveLength(2);
    expect(b.rows.every((r) => r.match)).toBe(true);

    const a = await analyzeSolutions(p, "class Solution:\n    def total(self, nums):\n        seen = set()\n        for x in nums:\n            for y in nums:\n                seen.add(x + y)\n        return 0");
    expect(a.user.loop_depth).toBe(2);
    expect(a.user.tags).toContain("hash_set");
    expect(a.user.time_estimate).toBe("O(n²)");

    const s = await runSnippet("print(sorted([3, 1, 2]))");
    expect(s.stdout.trim()).toBe("[1, 2, 3]");
  });
});
