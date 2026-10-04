/** Data for the Complexity Cheat Sheet on the Docs page. */

export interface OpRow {
  op: string;
  code?: string;
  time: string;
  note?: string;
}

export interface OpGroup {
  title: string;
  rows: OpRow[];
}

export const OPERATION_GROUPS: OpGroup[] = [
  {
    title: "Hash map / set (dict, set)",
    rows: [
      { op: "Lookup / membership", code: "x in d, d[k]", time: "O(1) average", note: "O(n) worst case, rare" },
      { op: "Insert / update", code: "d[k] = v, s.add(x)", time: "O(1) average" },
      { op: "Delete", code: "del d[k], s.discard(x)", time: "O(1) average" },
      { op: "Iterate", code: "for k, v in d.items()", time: "O(n)" },
    ],
  },
  {
    title: "List (dynamic array)",
    rows: [
      { op: "Index / assign", code: "a[i], a[i] = x", time: "O(1)" },
      { op: "Append", code: "a.append(x)", time: "O(1) amortized" },
      { op: "Pop from end", code: "a.pop()", time: "O(1)" },
      { op: "Pop / insert at front", code: "a.pop(0), a.insert(0, x)", time: "O(n)", note: "use deque" },
      { op: "Search", code: "x in a, a.index(x)", time: "O(n)" },
      { op: "Slice / copy", code: "a[i:j], a[:]", time: "O(k)" },
    ],
  },
  {
    title: "Deque (collections.deque)",
    rows: [
      { op: "Append / pop either end", code: "append, appendleft, pop, popleft", time: "O(1)" },
      { op: "Index in the middle", code: "q[i]", time: "O(n)" },
    ],
  },
  {
    title: "Heap (heapq)",
    rows: [
      { op: "Push", code: "heappush(h, x)", time: "O(log n)" },
      { op: "Pop smallest", code: "heappop(h)", time: "O(log n)" },
      { op: "Peek smallest", code: "h[0]", time: "O(1)" },
      { op: "Build from list", code: "heapify(a)", time: "O(n)" },
    ],
  },
  {
    title: "Sorting & searching",
    rows: [
      { op: "Sort", code: "a.sort(), sorted(a)", time: "O(n log n)" },
      { op: "Binary search", code: "bisect_left(a, x)", time: "O(log n)" },
      { op: "Insert into sorted list", code: "insort(a, x)", time: "O(n)", note: "search is log n, shifting is n" },
    ],
  },
  {
    title: "Strings",
    rows: [
      { op: "Concatenate in a loop", code: "s += c", time: "O(n²) total", note: "build a list, then ''.join" },
      { op: "Join", code: "''.join(parts)", time: "O(n)" },
      { op: "Substring / slice", code: "s[i:j]", time: "O(k)" },
      { op: "Compare / hash", code: "s == t, hash(s)", time: "O(n)" },
    ],
  },
  {
    title: "Graphs & trees",
    rows: [
      { op: "BFS / DFS", time: "O(V + E)" },
      { op: "Tree traversal", time: "O(n)", note: "recursion stack O(h)" },
      { op: "Topological sort", time: "O(V + E)" },
      { op: "Union-find (path compression + rank)", time: "≈ O(1) per op", note: "inverse Ackermann" },
      { op: "Dijkstra with a heap", time: "O((V + E) log V)" },
    ],
  },
];

export interface GrowthClass {
  notation: string;
  name: string;
  /** Roughly the largest n that runs in about a second in an interview judge. */
  maxN: string;
  examples: string;
  /** Relative work at n = 1000, as a log10 for drawing bars. */
  log10At1000: number;
}

export const GROWTH: GrowthClass[] = [
  { notation: "O(1)", name: "constant", maxN: "any", examples: "hash lookup, array index", log10At1000: 0 },
  { notation: "O(log n)", name: "logarithmic", maxN: "any", examples: "binary search, heap push", log10At1000: Math.log10(10) },
  { notation: "O(n)", name: "linear", maxN: "≈ 10⁷–10⁸", examples: "one pass, sliding window", log10At1000: 3 },
  { notation: "O(n log n)", name: "linearithmic", maxN: "≈ 10⁶", examples: "sorting, heap of n items", log10At1000: Math.log10(1000 * 10) },
  { notation: "O(n²)", name: "quadratic", maxN: "≈ 10³–10⁴", examples: "all pairs, 2-D DP", log10At1000: 6 },
  { notation: "O(2ⁿ)", name: "exponential", maxN: "≈ 20–25", examples: "all subsets, naive recursion", log10At1000: 301 },
  { notation: "O(n!)", name: "factorial", maxN: "≈ 10–11", examples: "all permutations", log10At1000: 2567 },
];

export const INPUT_SIZE_GUIDE: Array<{ n: string; target: string }> = [
  { n: "n ≤ 10", target: "O(n!) or O(n · 2ⁿ) — try every permutation/subset" },
  { n: "n ≤ 20", target: "O(2ⁿ) — backtracking over subsets" },
  { n: "n ≤ 500", target: "O(n³)" },
  { n: "n ≤ 5,000", target: "O(n²) — pairs, 2-D DP" },
  { n: "n ≤ 10⁵ – 10⁶", target: "O(n log n) or O(n) — sorting, hashing, two pointers" },
  { n: "n > 10⁷ or values up to 10⁹", target: "O(log n) or O(1) — binary search, math" },
];
